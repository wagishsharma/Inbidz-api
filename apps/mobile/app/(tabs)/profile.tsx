import { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { router } from 'expo-router';
import type { Post } from '@inbidz/shared';
import { useAuth } from '@/lib/auth';
import { api } from '@/lib/api';
import { GroupedSection } from '@/components/GroupedSection';
import { ProfilePostGrid } from '@/components/ProfilePostGrid';
import { UserAvatar } from '@/components/UserAvatar';
import { SignInCard } from '@/components/SignInCard';
import { buildCredibilitySignals, followerTierLabel } from '@/lib/credibility';
import { colors, fonts, fs, layout, shared, sp } from '@/constants/theme';
import { useScrollBottomPadding } from '@/lib/tab-bar-insets';

export default function ProfileScreen() {
  const scrollBottomPad = useScrollBottomPadding(32);
  const { user, accessToken, login, logout, refreshUser } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [postCount, setPostCount] = useState(0);
  const [postsLoading, setPostsLoading] = useState(false);

  useEffect(() => {
    if (!user) {
      setPosts([]);
      setPostCount(0);
      setPostsLoading(false);
    }
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      let active = true;

      (async () => {
        if (!user?.id) return;

        setPostsLoading(true);
        try {
          const token = (await refreshUser()) ?? accessToken;
          if (!active || !token) return;

          const [profileRes, postsRes] = await Promise.all([
            api.getUser(user.id, token),
            api.getUserPosts(user.id, token, 50, 0),
          ]);

          if (!active) return;
          setPostCount(profileRes.user.postCount);
          setPosts(postsRes.posts);
        } catch (e) {
          console.warn('Profile posts load failed', e);
          if (active) {
            setPosts([]);
          }
        } finally {
          if (active) setPostsLoading(false);
        }
      })();

      return () => {
        active = false;
      };
    }, [user?.id, accessToken, refreshUser])
  );

  if (!user) {
    return (
      <View style={styles.container}>
        <SignInCard
          subtitle="Follow sellers, buy items, and start your shop."
          onSignIn={login}
        />
      </View>
    );
  }

  const credibilitySignals = buildCredibilitySignals({
    isSeller: user.shopSetupComplete,
    followerCount: user.followerCount,
    followingCount: user.followingCount,
  });

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingBottom: scrollBottomPad }]}
    >
      <GroupedSection title="Profile">
        <View style={styles.profileInner}>
          <UserAvatar
            uri={user.avatarUrl}
            name={user.displayName || user.name}
            username={user.username}
            size={64}
            borderRadius={16}
          />
          <Text style={styles.title}>{user.displayName || user.name || 'Creator'}</Text>
          <Text style={styles.handle}>@{user.username || user.id.slice(0, 8)}</Text>
          {user.referralCode && (
            <Text style={styles.ref}>Invite code · {user.referralCode}</Text>
          )}
          <View style={styles.stats}>
            <View style={styles.stat}>
              <Text style={styles.statNum}>{postCount}</Text>
              <Text style={styles.statLabel}>Posts</Text>
            </View>
            <View style={styles.stat}>
              <Text style={styles.statNum}>{followerTierLabel(user.followerCount ?? 0)}</Text>
              <Text style={styles.statLabel}>Followers</Text>
            </View>
            <View style={styles.stat}>
              <Text style={styles.statNum}>{followerTierLabel(user.followingCount ?? 0)}</Text>
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
        </View>
      </GroupedSection>

      <GroupedSection title="Your posts">
        <View style={styles.gridWrap}>
          <ProfilePostGrid
            posts={posts}
            loading={postsLoading}
            emptyMessage={
              postCount > 0 ? 'Could not load posts. Pull to refresh by leaving and reopening this tab.' : 'Create your first post'
            }
          />
        </View>
      </GroupedSection>

      {!user.shopSetupComplete && (
        <GroupedSection title="Selling">
          <Pressable style={styles.listRow} onPress={() => router.push('/shop/setup')}>
            <View style={styles.rowIcon}>
              <Text style={styles.rowIconText}>$</Text>
            </View>
            <View style={styles.rowText}>
              <Text style={styles.rowTitle}>Set up your shop</Text>
              <Text style={styles.rowSub}>Start selling in under a minute</Text>
            </View>
            <Text style={styles.chevron}>›</Text>
          </Pressable>
        </GroupedSection>
      )}

      <GroupedSection title="Actions">
        <Pressable style={styles.listRow} onPress={() => router.push('/growth-guide')}>
          <View style={styles.rowText}>
            <Text style={styles.rowTitle}>Growth Guide</Text>
            <Text style={styles.rowSub}>Your next best step</Text>
          </View>
          <Text style={styles.chevron}>›</Text>
        </Pressable>
        <View style={styles.separator} />
        <Pressable style={styles.listRow} onPress={() => router.push('/(tabs)/create')}>
          <Text style={styles.rowTitle}>Create post</Text>
          <Text style={styles.chevron}>›</Text>
        </Pressable>
        <View style={styles.separator} />
        <Pressable style={styles.listRow} onPress={logout}>
          <Text style={[styles.rowTitle, styles.dangerText]}>Sign out</Text>
        </Pressable>
      </GroupedSection>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: shared.screen,
  content: {
    paddingTop: sp(8),
    paddingBottom: sp(32),
  },
  profileInner: {
    padding: layout.cardPadding,
    alignItems: 'center',
    gap: sp(4),
  },
  title: {
    fontFamily: fonts.sans,
    color: colors.text,
    fontSize: fs(20),
    fontWeight: '600',
  },
  handle: {
    fontFamily: fonts.sans,
    color: colors.textMuted,
    fontSize: fs(14),
  },
  ref: {
    fontFamily: fonts.sans,
    color: colors.textMuted,
    marginTop: sp(8),
    fontSize: fs(13),
  },
  stats: {
    flexDirection: 'row',
    gap: sp(24),
    marginTop: sp(16),
  },
  stat: { alignItems: 'center' },
  statNum: {
    fontFamily: fonts.sans,
    fontSize: fs(17),
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
    marginTop: sp(8),
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
  gridWrap: {
    paddingHorizontal: layout.cardPadding,
    paddingBottom: layout.cardPadding,
  },
  listRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: layout.cardPadding,
    paddingVertical: sp(14),
    gap: sp(12),
  },
  rowIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowIconText: {
    fontFamily: fonts.sans,
    fontSize: fs(14),
    fontWeight: '700',
    color: colors.accent,
  },
  rowText: { flex: 1 },
  rowTitle: {
    flex: 1,
    fontFamily: fonts.sans,
    color: colors.text,
    fontWeight: '500',
    fontSize: fs(15),
  },
  rowSub: {
    fontFamily: fonts.sans,
    color: colors.textMuted,
    fontSize: fs(13),
    marginTop: sp(2),
  },
  chevron: {
    fontFamily: fonts.sans,
    fontSize: fs(20),
    color: colors.textMuted,
    fontWeight: '300',
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
    marginLeft: layout.cardPadding,
  },
  dangerText: {
    color: colors.danger,
  },
});
