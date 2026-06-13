import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  AppState,
  Dimensions,
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  useWindowDimensions,
  View,
  type ViewToken,
} from 'react-native';

const IMMERSIVE_LIST_WINDOW = 3;
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { FeedMode, Post } from '@inbidz/shared';
import { ImmersivePostViewer } from '@/components/ImmersivePostViewer';
import { api } from '@/lib/api';
import { closeImmersiveView } from '@/lib/close-immersive';
import { useImmersiveStageSize } from '@/lib/use-immersive-stage';
import { sp } from '@/constants/theme';

const { height: SCREEN_H } = Dimensions.get('window');

type Props = {
  posts: Post[];
  initialIndex: number;
  accessToken?: string | null;
  feedMode?: FeedMode;
  onLogin: () => Promise<void>;
  onPostsChange?: (posts: Post[]) => void;
};

export function ImmersiveFeedViewer({
  posts: initialPosts,
  initialIndex,
  accessToken,
  feedMode = 'for_you',
  onLogin,
  onPostsChange,
}: Props) {
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
  const stage = useImmersiveStageSize();
  const listRef = useRef<FlatList<Post>>(null);
  const [posts, setPosts] = useState(initialPosts);
  const [activeIndex, setActiveIndex] = useState(initialIndex);
  const [muted, setMuted] = useState(true);
  const [showMuteHint, setShowMuteHint] = useState(() =>
    initialPosts.some((p) => p.media.some((m) => m.type === 'video'))
  );
  const [audioSyncEpoch, setAudioSyncEpoch] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);
  const loadingMoreRef = useRef(false);

  const slideHeight = stage.slideHeight;

  useEffect(() => {
    if (!showMuteHint) return;
    const t = setTimeout(() => setShowMuteHint(false), 6000);
    return () => clearTimeout(t);
  }, [showMuteHint]);

  const handleToggleMute = useCallback(() => {
    setMuted((m) => !m);
    setShowMuteHint(false);
    setAudioSyncEpoch((n) => n + 1);
  }, []);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        setAudioSyncEpoch((n) => n + 1);
      }
    });
    return () => sub.remove();
  }, []);

  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 80 }).current;

  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      const top = viewableItems.find((v) => v.isViewable);
      if (top?.index != null) {
        setActiveIndex(top.index);
      }
    }
  ).current;

  const syncActiveIndex = useCallback(
    (offsetY: number) => {
      const idx = Math.round(offsetY / slideHeight);
      if (idx >= 0 && idx < posts.length) {
        setActiveIndex(idx);
      }
    },
    [posts.length, slideHeight]
  );

  const updatePosts = useCallback(
    (updater: Post[] | ((prev: Post[]) => Post[])) => {
      setPosts((prev) => {
        const next = typeof updater === 'function' ? updater(prev) : updater;
        onPostsChange?.(next);
        return next;
      });
    },
    [onPostsChange]
  );

  const loadMore = useCallback(async () => {
    if (loadingMoreRef.current) return;
    loadingMoreRef.current = true;
    setLoadingMore(true);
    try {
      const res = await api.getFeed(accessToken, 20, posts.length, feedMode);
      const existing = new Set(posts.map((p) => p.id));
      const fresh = res.posts.filter((p) => !existing.has(p.id));
      if (fresh.length) updatePosts((prev) => [...prev, ...fresh]);
    } catch (e) {
      console.warn('Immersive feed load more failed', e);
    } finally {
      loadingMoreRef.current = false;
      setLoadingMore(false);
    }
  }, [accessToken, feedMode, posts, updatePosts]);

  const handleLike = async (postId: string) => {
    if (!accessToken) return;
    try {
      await api.likePost(accessToken, postId);
    } catch (e) {
      console.warn('Like failed', e);
    }
  };

  const handlePostUpdate = (updated: Post) => {
    updatePosts((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
  };

  const scrollToIndex = (index: number) => {
    if (index < 0 || index >= posts.length) return;
    listRef.current?.scrollToIndex({ index, animated: true });
    setActiveIndex(index);
  };

  return (
    <View style={styles.root}>
      <FlatList
        ref={listRef}
        data={posts}
        keyExtractor={(item) => item.id}
        initialNumToRender={1}
        maxToRenderPerBatch={2}
        windowSize={IMMERSIVE_LIST_WINDOW}
        removeClippedSubviews={false}
        renderItem={({ item, index }) => (
          <View style={[styles.slide, { height: slideHeight }]}>
            <ImmersivePostViewer
              post={item}
              active={index === activeIndex}
              muted={muted}
              onToggleMute={handleToggleMute}
              showMuteHint={
                showMuteHint &&
                index === activeIndex &&
                item.media.some((m) => m.type === 'video')
              }
              onDismissMuteHint={() => setShowMuteHint(false)}
              audioSyncEpoch={audioSyncEpoch}
              showClose={false}
              accessToken={accessToken}
              onLogin={onLogin}
              onLike={() => handleLike(item.id)}
              onPostUpdate={handlePostUpdate}
            />
          </View>
        )}
        pagingEnabled
        snapToInterval={slideHeight}
        snapToAlignment="start"
        decelerationRate="fast"
        showsVerticalScrollIndicator={false}
        initialScrollIndex={Math.min(initialIndex, Math.max(posts.length - 1, 0))}
        getItemLayout={(_, index) => ({
          length: slideHeight,
          offset: slideHeight * index,
          index,
        })}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        onMomentumScrollEnd={(e) => syncActiveIndex(e.nativeEvent.contentOffset.y)}
        onEndReached={loadMore}
        onEndReachedThreshold={2}
      />

      <View style={styles.overlayLayer} pointerEvents="box-none">
        <Pressable
          style={[
            styles.closeBtn,
            { top: insets.top + sp(12), right: stage.isWebDesktop ? sp(24) : sp(16) },
          ]}
          onPress={closeImmersiveView}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="Close"
        >
          <Ionicons name="close" size={stage.isWebDesktop ? 24 : 22} color="#fff" />
        </Pressable>

        {stage.isWebDesktop && posts.length > 1 && (
          <View style={[styles.webNav, { top: windowHeight / 2 - 52 }]} pointerEvents="box-none">
            <Pressable
              style={[styles.navBtn, activeIndex <= 0 && styles.navBtnDisabled]}
              onPress={() => scrollToIndex(activeIndex - 1)}
              disabled={activeIndex <= 0}
            >
              <Ionicons name="chevron-up" size={28} color="#fff" />
            </Pressable>
            <Pressable
              style={[styles.navBtn, activeIndex >= posts.length - 1 && styles.navBtnDisabled]}
              onPress={() => scrollToIndex(activeIndex + 1)}
              disabled={activeIndex >= posts.length - 1}
            >
              <Ionicons name="chevron-down" size={28} color="#fff" />
            </Pressable>
          </View>
        )}

        {loadingMore && (
          <View style={[styles.loadingMore, { bottom: insets.bottom + sp(16) }]} pointerEvents="none">
            <ActivityIndicator color="#fff" size="small" />
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#000',
  },
  slide: {
    width: '100%',
  },
  overlayLayer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 100,
    ...(Platform.OS === 'web' ? { position: 'fixed' as const } : null),
  },
  closeBtn: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 101,
    ...(Platform.OS === 'web' ? { cursor: 'pointer' as const } : null),
  },
  webNav: {
    position: 'absolute',
    right: sp(16),
    gap: sp(12),
    zIndex: 101,
  },
  navBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  navBtnDisabled: {
    opacity: 0.35,
  },
  loadingMore: {
    position: 'absolute',
    alignSelf: 'center',
    left: 0,
    right: 0,
    zIndex: 20,
  },
});
