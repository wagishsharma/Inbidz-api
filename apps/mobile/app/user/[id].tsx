import { useCallback, useRef, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import type { Post, UserProfile } from '@inbidz/shared';
import { FollowButton } from '@/components/FollowButton';
import { ProfilePostGrid } from '@/components/ProfilePostGrid';
import { UserAvatar } from '@/components/UserAvatar';
import { useAuth } from '@/lib/auth';
import { api } from '@/lib/api';
import { buildCredibilitySignals, followerTierLabel } from '@/lib/credibility';
import { colors, fonts, fs, layout, shared, sp } from '@/constants/theme';

type ProfileUser = UserProfile & { postCount: number };

export default function UserProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user: currentUser, accessToken } = useAuth();
  const [profile, setProfile] = useState<ProfileUser | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const hasLoaded = useRef(false);

  const isSelf = Boolean(currentUser?.id && id && currentUser.id === id);

  const load = useCallback(
    async (silent = false) => {
      if (!id) return;
      if (!silent) setLoading(true);
      try {
        const [userRes, postsRes] = await Promise.all([
          api.getUser(id, accessToken),
          api.getUserPosts(id, accessToken),
        ]);
        setProfile(userRes.user);
        setPosts(postsRes.posts);
      } catch (e) {
        console.warn('Profile load failed', e);
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [id, accessToken]
  );

  useFocusEffect(
    useCallback(() => {
      if (isSelf) {
        router.replace('/(tabs)/profile');
        return;
      }
      void load(hasLoaded.current);
      hasLoaded.current = true;
    }, [load, isSelf])
  );

  if (loading || !profile) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  const credibilitySignals = buildCredibilitySignals({
    isSeller: profile.isSeller,
    followerCount: profile.followerCount,
    followingCount: profile.followingCount,
  });

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <UserAvatar
          uri={profile.avatarUrl}
          name={profile.displayName}
          username={profile.username}
          size={72}
          borderRadius={36}
        />
        <Text style={styles.name}>{profile.displayName}</Text>
        <Text style={styles.handle}>@{profile.username}</Text>
        {profile.bio ? <Text style={styles.bio}>{profile.bio}</Text> : null}
        {profile.shopName && profile.isSeller ? (
          <Text style={styles.shop}>{profile.shopName}</Text>
        ) : null}

        <View style={styles.stats}>
          <View style={styles.stat}>
            <Text style={styles.statNum}>{profile.postCount}</Text>
            <Text style={styles.statLabel}>Posts</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statNum}>{followerTierLabel(profile.followerCount)}</Text>
            <Text style={styles.statLabel}>Followers</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statNum}>{followerTierLabel(profile.followingCount)}</Text>
            <Text style={styles.statLabel}>Following</Text>
          </View>
        </View>
        {credibilitySignals.length > 0 ? (
          <View style={styles.signalWrap}>
            {credibilitySignals.map((signal) => (
              <View key={signal} style={styles.signalChip}>
                <Text style={styles.signalText}>{signal}</Text>
              </View>
            ))}
          </View>
        ) : null}

        <FollowButton
          userId={profile.id}
          isFollowing={profile.isFollowing ?? false}
          onToggle={(following) =>
            setProfile((p) =>
              p
                ? {
                    ...p,
                    isFollowing: following,
                    followerCount: Math.max(
                      0,
                      p.followerCount + (following ? 1 : -1)
                    ),
                  }
                : p
            )
          }
        />
      </View>

      <Text style={styles.gridTitle}>Posts</Text>
      <ProfilePostGrid posts={posts} emptyMessage="No posts yet" />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: shared.screen,
  content: { paddingBottom: sp(32) },
  center: shared.screenCenter,
  header: {
    alignItems: 'center',
    paddingHorizontal: layout.contentPadding,
    paddingTop: sp(16),
    paddingBottom: sp(20),
    gap: sp(6),
  },
  name: {
    fontFamily: fonts.sans,
    fontSize: fs(20),
    fontWeight: '700',
    color: colors.text,
  },
  handle: {
    fontFamily: fonts.sans,
    fontSize: fs(14),
    color: colors.textMuted,
  },
  bio: {
    fontFamily: fonts.sans,
    fontSize: fs(14),
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: sp(4),
    lineHeight: fs(20),
  },
  shop: {
    fontFamily: fonts.sans,
    fontSize: fs(13),
    color: colors.accent,
    fontWeight: '500',
  },
  stats: {
    flexDirection: 'row',
    gap: sp(28),
    marginTop: sp(16),
    marginBottom: sp(12),
  },
  stat: { alignItems: 'center' },
  statNum: {
    fontFamily: fonts.sans,
    fontSize: fs(18),
    fontWeight: '700',
    color: colors.text,
  },
  statLabel: {
    fontFamily: fonts.sans,
    fontSize: fs(12),
    color: colors.textMuted,
    marginTop: sp(2),
  },
  signalWrap: {
    marginBottom: sp(12),
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: sp(8),
  },
  signalChip: {
    backgroundColor: colors.accentSoft,
    borderRadius: 999,
    paddingHorizontal: sp(10),
    paddingVertical: sp(6),
  },
  signalText: {
    fontFamily: fonts.sans,
    fontSize: fs(12),
    color: colors.accent,
    fontWeight: '600',
  },
  gridTitle: {
    fontFamily: fonts.sans,
    fontSize: fs(13),
    fontWeight: '600',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    paddingHorizontal: layout.contentPadding,
    marginBottom: sp(8),
  },
});
