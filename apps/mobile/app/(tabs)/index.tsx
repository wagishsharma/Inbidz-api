import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import { router } from 'expo-router';
import type { Post } from '@inbidz/shared';
import { PostCard } from '@/components/PostCard';
import { GroupedSection } from '@/components/GroupedSection';
import { useAuth } from '@/lib/auth';
import { api } from '@/lib/api';
import { colors, fonts, fs, layout, shared, sp } from '@/constants/theme';
import { getContentWidth } from '@/lib/dimensions';

const CARD_WIDTH = getContentWidth() - layout.contentPadding * 2;

export default function FeedScreen() {
  const isFocused = useIsFocused();
  const { accessToken, login, user } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [sellBanner, setSellBanner] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await api.getFeed(accessToken);
      setPosts(res.posts);
      if (accessToken) {
        const onboarding = await api.getOnboarding(accessToken);
        setSellBanner(onboarding.suggestSellBanner);
      }
    } catch (e) {
      console.warn('Feed load failed', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [accessToken]);

  useEffect(() => {
    load();
  }, [load]);

  const handleLike = async (postId: string) => {
    if (!accessToken) {
      await login();
      return;
    }
    await api.likePost(accessToken, postId);
    setPosts((prev) =>
      prev.map((p) =>
        p.id === postId
          ? { ...p, isLiked: !p.isLiked, likeCount: p.likeCount + (p.isLiked ? -1 : 1) }
          : p
      )
    );
  };

  if (loading) {
    return (
      <View style={shared.screenCenter}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  return (
    <FlatList
      style={styles.container}
      data={posts}
      extraData={isFocused}
      keyExtractor={(item) => item.id}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => {
            setRefreshing(true);
            load();
          }}
          tintColor={colors.accent}
        />
      }
      contentContainerStyle={posts.length === 0 ? styles.emptyList : styles.list}
      ListHeaderComponent={
        <>
          {!user && (
            <GroupedSection title="Welcome">
              <View style={styles.welcomeInner}>
                <Text style={styles.welcomeTitle}>Post it. Share it. Sell it.</Text>
                <Text style={styles.welcomeSub}>
                  Sign in to buy, sell, and follow creators on InBidz.
                </Text>
                <Pressable style={styles.loginBtn} onPress={login}>
                  <Text style={styles.loginText}>Sign in</Text>
                </Pressable>
              </View>
            </GroupedSection>
          )}

          {sellBanner && (
            <GroupedSection title="For sellers">
              <Pressable style={styles.bannerRow} onPress={() => router.push('/shop/setup')}>
                <View style={styles.bannerIcon}>
                  <Text style={styles.bannerIconText}>$</Text>
                </View>
                <View style={styles.bannerText}>
                  <Text style={styles.bannerTitle}>Set up your shop</Text>
                  <Text style={styles.bannerSub}>Start selling in under a minute</Text>
                </View>
                <Text style={styles.chevron}>›</Text>
              </Pressable>
            </GroupedSection>
          )}

          {posts.length > 0 && (
            <Text style={styles.sectionLabel}>Feed</Text>
          )}
        </>
      }
      ListEmptyComponent={
        <GroupedSection title="Feed">
          <View style={styles.emptyInner}>
            <Text style={styles.emptyText}>No posts yet.</Text>
            <Pressable style={styles.createBtn} onPress={() => router.push('/(tabs)/create')}>
              <Text style={styles.createBtnText}>Create first post</Text>
            </Pressable>
          </View>
        </GroupedSection>
      }
      renderItem={({ item, index }) => (
        <View style={styles.cardWrap}>
          <PostCard
            post={item}
            width={CARD_WIDTH}
            autoPlay={isFocused && index === 0}
            onLike={() => handleLike(item.id)}
            onShare={() => {
              if (accessToken && item.commerceMode !== 'none') {
                api.trackOnboarding(accessToken, 'commerce_post_viewed', { postId: item.id });
              }
            }}
          />
        </View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  container: shared.screen,
  list: {
    paddingBottom: sp(24),
  },
  sectionLabel: {
    fontFamily: fonts.sans,
    fontSize: fs(13),
    fontWeight: '600',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    paddingHorizontal: layout.contentPadding,
    marginBottom: sp(8),
    marginTop: sp(4),
  },
  cardWrap: {
    paddingHorizontal: layout.contentPadding,
    marginBottom: sp(10),
  },
  welcomeInner: {
    padding: layout.cardPadding,
    gap: sp(8),
  },
  welcomeTitle: {
    fontFamily: fonts.sans,
    fontSize: fs(17),
    fontWeight: '600',
    color: colors.text,
  },
  welcomeSub: {
    fontFamily: fonts.sans,
    fontSize: fs(14),
    color: colors.textMuted,
    lineHeight: fs(20),
    marginBottom: sp(8),
  },
  loginBtn: shared.btnPrimary,
  loginText: shared.btnPrimaryText,
  bannerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: layout.cardPadding,
    gap: sp(12),
  },
  bannerIcon: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bannerIconText: {
    fontFamily: fonts.sans,
    fontSize: fs(16),
    fontWeight: '700',
    color: colors.accent,
  },
  bannerText: { flex: 1 },
  bannerTitle: {
    fontFamily: fonts.sans,
    color: colors.text,
    fontWeight: '600',
    fontSize: fs(15),
  },
  bannerSub: {
    fontFamily: fonts.sans,
    color: colors.textMuted,
    fontSize: fs(13),
    marginTop: sp(2),
  },
  chevron: {
    fontFamily: fonts.sans,
    fontSize: fs(22),
    color: colors.textMuted,
    fontWeight: '300',
  },
  emptyList: {
    flexGrow: 1,
    paddingTop: sp(8),
  },
  emptyInner: {
    padding: layout.cardPadding,
    alignItems: 'center',
    gap: sp(16),
  },
  emptyText: {
    fontFamily: fonts.sans,
    color: colors.textMuted,
    textAlign: 'center',
    fontSize: fs(14),
  },
  createBtn: shared.btnPrimary,
  createBtnText: shared.btnPrimaryText,
});
