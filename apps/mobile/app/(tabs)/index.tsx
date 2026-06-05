import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useFocusEffect, useIsFocused } from '@react-navigation/native';
import { router } from 'expo-router';
import type { FeedMode, Post } from '@inbidz/shared';
import { PostCard } from '@/components/PostCard';
import { GroupedSection } from '@/components/GroupedSection';
import { useAuth } from '@/lib/auth';
import { api } from '@/lib/api';
import { colors, fonts, fs, layout, shared, sp } from '@/constants/theme';
import { useScrollBottomPadding } from '@/lib/tab-bar-insets';
import { useWebLayout } from '@/lib/use-web-layout';
import { subscribeFollowGraphChanged } from '@/lib/follow-invalidation';

export default function FeedScreen() {
  const { feedColumnWidth, isDesktop, isWeb } = useWebLayout();
  const isMobileWeb = isWeb && !isDesktop;
  const scrollBottomPad = useScrollBottomPadding();
  const cardWidth = feedColumnWidth - layout.contentPadding * 2;
  const isFocused = useIsFocused();
  const { accessToken, login, user } = useAuth();
  const [feedMode, setFeedMode] = useState<FeedMode>('for_you');
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [sellBanner, setSellBanner] = useState(false);

  const load = useCallback(async (silent = false) => {
    if (feedMode === 'following' && !accessToken) {
      setPosts([]);
      setLoading(false);
      setRefreshing(false);
      return;
    }
    if (!silent) setLoading(true);
    try {
      const res = await api.getFeed(accessToken, 20, 0, feedMode);
      setPosts(res.posts);
      if (accessToken) {
        const onboarding = await api.getOnboarding(accessToken);
        setSellBanner(onboarding.suggestSellBanner);
      }
    } catch (e) {
      console.warn('Feed load failed', e);
      if (feedMode === 'following') setPosts([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [accessToken, feedMode]);

  const skipFocusReload = useRef(true);

  useEffect(() => {
    setLoading(true);
    void load(false);
  }, [load]);

  useFocusEffect(
    useCallback(() => {
      if (skipFocusReload.current) {
        skipFocusReload.current = false;
        return;
      }
      void load(true);
    }, [load])
  );

  useEffect(() => {
    return subscribeFollowGraphChanged(() => {
      void load(true);
    });
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

  const showFollowingSignIn = feedMode === 'following' && !accessToken;
  const showFollowingEmpty = feedMode === 'following' && accessToken && posts.length === 0;

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
      contentContainerStyle={[
        posts.length === 0 && !showFollowingSignIn ? styles.emptyList : styles.list,
        { paddingBottom: scrollBottomPad },
      ]}
      ListHeaderComponent={
        <>
          <View
            style={[
              styles.feedTabs,
              isDesktop && styles.feedTabsDesktop,
              isMobileWeb && styles.feedTabsMobileWeb,
            ]}
          >
            <Pressable
              style={[styles.feedTab, feedMode === 'for_you' && styles.feedTabActive]}
              onPress={() => setFeedMode('for_you')}
            >
              <Text
                style={[
                  styles.feedTabText,
                  feedMode === 'for_you' && styles.feedTabTextActive,
                ]}
              >
                For you
              </Text>
            </Pressable>
            <Pressable
              style={[styles.feedTab, feedMode === 'following' && styles.feedTabActive]}
              onPress={() => setFeedMode('following')}
            >
              <Text
                style={[
                  styles.feedTabText,
                  feedMode === 'following' && styles.feedTabTextActive,
                ]}
              >
                Following
              </Text>
            </Pressable>
          </View>

          {!user && feedMode === 'for_you' && (
            <GroupedSection title="Welcome" style={isMobileWeb ? styles.groupedTight : undefined}>
              <View style={styles.welcomeInner}>
                <Text style={styles.welcomeTitle}>Post it. Share it. Sell it.</Text>
                <Text style={styles.welcomeSub}>
                  Sign in to buy, sell, and follow creators on INBIDZ.
                </Text>
                <Pressable style={styles.loginBtn} onPress={login}>
                  <Text style={styles.loginText}>Sign in</Text>
                </Pressable>
              </View>
            </GroupedSection>
          )}

          {showFollowingSignIn && (
            <GroupedSection title="Following">
              <View style={styles.welcomeInner}>
                <Text style={styles.welcomeSub}>
                  Sign in to see posts from sellers you follow.
                </Text>
                <Pressable style={styles.loginBtn} onPress={login}>
                  <Text style={styles.loginText}>Sign in</Text>
                </Pressable>
              </View>
            </GroupedSection>
          )}

          {showFollowingEmpty && (
            <GroupedSection title="Following">
              <View style={styles.welcomeInner}>
                <Text style={styles.welcomeSub}>
                  Follow sellers from their profiles to fill this feed.
                </Text>
                <Pressable style={styles.loginBtn} onPress={() => router.push('/(tabs)/explore')}>
                  <Text style={styles.loginText}>Browse shop</Text>
                </Pressable>
              </View>
            </GroupedSection>
          )}

          {sellBanner && feedMode === 'for_you' && (
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
            <Text
              style={[styles.sectionLabel, isMobileWeb && styles.sectionLabelMobileWeb]}
            >
              {feedMode === 'following' ? 'From people you follow' : 'Feed'}
            </Text>
          )}
        </>
      }
      ListEmptyComponent={
        feedMode === 'for_you' ? (
          <GroupedSection title="Feed">
            <View style={styles.emptyInner}>
              <Text style={styles.emptyText}>No posts yet.</Text>
              <Pressable style={styles.createBtn} onPress={() => router.push('/(tabs)/create')}>
                <Text style={styles.createBtnText}>Create first post</Text>
              </Pressable>
            </View>
          </GroupedSection>
        ) : null
      }
      renderItem={({ item, index }) => (
        <View style={styles.cardWrap}>
          <PostCard
            post={item}
            width={cardWidth}
            autoPlay={isFocused && index === 0}
            immersiveFeed={{ posts, index, feedMode }}
            onLike={() => handleLike(item.id)}
            onComment={() => router.push(`/post/${item.id}`)}
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
  list: {},
  feedTabs: {
    flexDirection: 'row',
    marginHorizontal: layout.contentPadding,
    marginTop: sp(8),
    marginBottom: sp(12),
    gap: sp(8),
  },
  feedTabsMobileWeb: {
    marginTop: sp(4),
    marginBottom: sp(6),
  },
  feedTabsDesktop: {
    marginTop: sp(20),
  },
  groupedTight: {
    marginBottom: sp(10),
  },
  feedTab: {
    paddingHorizontal: sp(16),
    paddingVertical: sp(8),
    borderRadius: 20,
    backgroundColor: colors.bgMuted,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  feedTabActive: {
    backgroundColor: colors.accentSoft,
    borderColor: colors.accent,
  },
  feedTabText: {
    fontFamily: fonts.sans,
    fontSize: fs(14),
    fontWeight: '500',
    color: colors.textMuted,
  },
  feedTabTextActive: {
    color: colors.accent,
    fontWeight: '600',
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
  sectionLabelMobileWeb: {
    marginTop: 0,
    marginBottom: sp(6),
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
