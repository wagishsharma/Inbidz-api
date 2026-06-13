import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import { Video, ResizeMode, type AVPlaybackStatus } from 'expo-av';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { formatINR } from '@inbidz/shared';
import type { Post, PostMedia } from '@inbidz/shared';
import { colors, fonts, fs, radii, sp } from '@/constants/theme';
import { api } from '@/lib/api';
import { showAlert } from '@/lib/alert';
import { closeImmersiveView } from '@/lib/close-immersive';
import { completePurchase } from '@/lib/complete-purchase';
import { sharePost } from '@/lib/share-post';
import { UserAvatar } from '@/components/UserAvatar';
import { useAuth } from '@/lib/auth';
import { ImmersiveWebVideo } from '@/components/ImmersiveWebVideo';
import { fitMediaInFrame, normalizeMediaDimensions, useImmersiveStageSize } from '@/lib/use-immersive-stage';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

type Props = {
  post: Post;
  active?: boolean;
  muted?: boolean;
  onToggleMute?: () => void;
  showClose?: boolean;
  accessToken?: string | null;
  onLogin: () => Promise<void>;
  onLike?: () => void;
  onPostUpdate?: (post: Post) => void;
};

function ImmersiveMediaItem({
  item,
  active,
  muted,
  frameWidth,
  frameHeight,
  naturalWidth,
  naturalHeight,
  onVideoNaturalSize,
}: {
  item: PostMedia;
  active: boolean;
  muted: boolean;
  frameWidth: number;
  frameHeight: number;
  naturalWidth?: number;
  naturalHeight?: number;
  onVideoNaturalSize?: (w: number, h: number) => void;
}) {
  const videoRef = useRef<Video>(null);
  const shouldPlay = active && item.type === 'video';
  const dims = normalizeMediaDimensions(
    naturalWidth ?? item.width,
    naturalHeight ?? item.height
  );
  const fitted = fitMediaInFrame(frameWidth, frameHeight, dims.width, dims.height);

  useEffect(() => {
    if (!shouldPlay) {
      videoRef.current?.pauseAsync().catch(() => {});
    }
  }, [shouldPlay]);

  useEffect(() => {
    return () => {
      videoRef.current?.pauseAsync().catch(() => {});
    };
  }, []);

  const handlePlaybackStatus = (status: AVPlaybackStatus) => {
    if (!status.isLoaded || !onVideoNaturalSize) return;
    const size = (
      status as AVPlaybackStatus & { naturalSize?: { width: number; height: number } }
    ).naturalSize;
    if (size?.width && size?.height) {
      onVideoNaturalSize(size.width, size.height);
    }
  };

  if (item.type === 'video') {
    const poster = item.thumbnailUrl;
    const uri = item.hlsUrl || item.url;

    if (!active) {
      return (
        <View style={[styles.mediaSlide, { width: frameWidth, height: frameHeight }]}>
          {poster ? (
            <Image
              source={{ uri: poster }}
              style={{ width: fitted.width, height: fitted.height }}
              contentFit="contain"
            />
          ) : (
            <View style={[styles.videoPosterFallback, { width: fitted.width, height: fitted.height }]} />
          )}
        </View>
      );
    }

    if (Platform.OS === 'web') {
      return (
        <View style={[styles.mediaSlide, { width: frameWidth, height: frameHeight }]}>
          <ImmersiveWebVideo
            uri={uri}
            poster={poster}
            width={fitted.width}
            height={fitted.height}
            active={shouldPlay}
            muted={muted}
            contain
            onNaturalSize={onVideoNaturalSize}
          />
        </View>
      );
    }

    return (
      <View style={[styles.mediaSlide, { width: frameWidth, height: frameHeight }]}>
        <Video
          ref={videoRef}
          source={{ uri }}
          style={{ width: fitted.width, height: fitted.height }}
          resizeMode={ResizeMode.CONTAIN}
          shouldPlay={shouldPlay}
          isLooping
          isMuted={muted}
          usePoster={Boolean(poster)}
          posterSource={poster ? { uri: poster } : undefined}
          posterStyle={{ width: fitted.width, height: fitted.height }}
          onPlaybackStatusUpdate={handlePlaybackStatus}
        />
      </View>
    );
  }

  return (
    <View style={[styles.mediaSlide, { width: frameWidth, height: frameHeight }]}>
      <Image
        source={{ uri: item.url }}
        style={{ width: fitted.width, height: fitted.height }}
        contentFit="contain"
      />
    </View>
  );
}

function formatCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1).replace(/\.0$/, '')}K`;
  return String(n);
}

export function ImmersivePostViewer({
  post,
  active = true,
  muted: mutedProp,
  onToggleMute,
  showClose = true,
  accessToken,
  onLogin,
  onLike,
  onPostUpdate,
}: Props) {
  const insets = useSafeAreaInsets();
  const { refreshUser } = useAuth();
  const [internalMuted, setInternalMuted] = useState(true);
  const muted = mutedProp ?? internalMuted;
  const toggleMute = onToggleMute ?? (() => setInternalMuted((m) => !m));
  const [liked, setLiked] = useState(post.isLiked);
  const [likeCount, setLikeCount] = useState(post.likeCount);
  const [activeIndex, setActiveIndex] = useState(0);
  const [buying, setBuying] = useState(false);
  const [videoNaturalSize, setVideoNaturalSize] = useState<{
    width: number;
    height: number;
  } | null>(null);

  const activeMedia = post.media[activeIndex] ?? post.media[0];
  const normalized = normalizeMediaDimensions(
    videoNaturalSize?.width ?? activeMedia?.width,
    videoNaturalSize?.height ?? activeMedia?.height
  );
  const stage = useImmersiveStageSize(normalized.width, normalized.height);

  useEffect(() => {
    setLiked(post.isLiked);
    setLikeCount(post.likeCount);
    setActiveIndex(0);
    setVideoNaturalSize(null);
  }, [post.id, post.isLiked, post.likeCount]);

  useEffect(() => {
    setVideoNaturalSize(null);
  }, [activeIndex]);

  const mediaW = stage.isWebDesktop ? stage.stageWidth : SCREEN_W;
  const mediaH = stage.isWebDesktop ? stage.stageHeight : SCREEN_H;

  const hasCommerce = post.commerceMode !== 'none' && post.commerce;
  const canBuy =
    hasCommerce &&
    (post.commerceMode === 'buy_now' || post.commerceMode === 'buy_now_and_offers') &&
    post.commerce!.price != null &&
    post.commerce!.inventory > post.commerce!.soldCount;

  const price =
    post.commerce?.price != null && hasCommerce ? formatINR(post.commerce.price) : null;

  const productLabel = post.caption?.trim() || `${post.author.username}'s listing`;

  const thumbUrl = post.media[0]?.thumbnailUrl || post.media[0]?.url;

  const ensureFreshToken = async (): Promise<string | null> => {
    const token = await refreshUser();
    if (token) return token;
    await onLogin();
    return refreshUser();
  };

  const requireAuth = async () => Boolean(await ensureFreshToken());

  const handleLike = async () => {
    if (!(await requireAuth())) return;
    onLike?.();
    setLiked((v) => !v);
    setLikeCount((c) => c + (liked ? -1 : 1));
  };

  const handleShare = async () => {
    await sharePost(post);
  };

  const handleBuy = async () => {
    if (buying) return;
    const token = await ensureFreshToken();
    if (!token) return;
    setBuying(true);
    try {
      const order = await api.buyNow(token, post.id);
      const result = await completePurchase(order, token);
      if (result === 'paid') {
        const res = await api.getPost(post.id, token);
        onPostUpdate?.(res.post);
      }
    } catch (e) {
      showAlert('Error', e instanceof Error ? e.message : 'Buy failed');
    } finally {
      setBuying(false);
    }
  };

  const openDetails = () => router.push(`/post/${post.id}`);

  const actionsRail = (
    <>
      {post.media.some((m) => m.type === 'video') && (
        <Pressable style={styles.actionCircle} onPress={toggleMute}>
          <Ionicons name={muted ? 'volume-mute' : 'volume-high'} size={26} color="#fff" />
        </Pressable>
      )}
      <Pressable style={styles.actionCircle} onPress={handleLike}>
        <Ionicons
          name={liked ? 'bookmark' : 'bookmark-outline'}
          size={26}
          color={liked ? colors.accent : '#fff'}
        />
        {likeCount > 0 && <Text style={styles.actionLabel}>{formatCount(likeCount)}</Text>}
      </Pressable>
      <Pressable style={styles.actionCircle} onPress={handleShare}>
        <Ionicons name="paper-plane-outline" size={26} color="#fff" />
        {post.shareCount > 0 && (
          <Text style={styles.actionLabel}>{formatCount(post.shareCount)}</Text>
        )}
      </Pressable>
      {hasCommerce && (
        <Pressable style={styles.actionCircle} onPress={openDetails}>
          <Ionicons name="bag-outline" size={26} color="#fff" />
        </Pressable>
      )}
      <Pressable style={styles.actionCircle} onPress={openDetails}>
        <Ionicons name="ellipsis-horizontal" size={26} color="#fff" />
      </Pressable>
    </>
  );

  const metaBlock = (
    <>
      <Pressable style={styles.authorRow} onPress={() => router.push(`/user/${post.userId}`)}>
        <UserAvatar
          uri={post.author.avatarUrl}
          name={post.author.displayName}
          username={post.author.username}
          size={36}
          borderRadius={18}
        />
        <Text style={stage.isWebDesktop ? styles.usernameWeb : styles.username}>
          {post.author.username}
        </Text>
      </Pressable>

      {post.caption ? (
        <Text
          style={stage.isWebDesktop ? styles.captionWeb : styles.caption}
          numberOfLines={stage.isWebDesktop ? 4 : 3}
        >
          {post.caption}
        </Text>
      ) : null}

      {likeCount > 0 && !stage.isWebDesktop && (
        <Text style={styles.socialProof}>
          Saved by {likeCount.toLocaleString()} {likeCount === 1 ? 'person' : 'people'}
        </Text>
      )}

      {hasCommerce && (
        <View style={styles.productCard}>
          {thumbUrl ? (
            <Image source={{ uri: thumbUrl }} style={styles.productThumb} contentFit="cover" />
          ) : (
            <View style={[styles.productThumb, styles.productThumbPlaceholder]} />
          )}
          <View style={styles.productInfo}>
            <Text style={styles.productTitle} numberOfLines={1}>
              {productLabel}
            </Text>
            {price ? <Text style={styles.productPrice}>{price}</Text> : null}
          </View>
          {canBuy ? (
            <Pressable
              style={[styles.shopBtn, buying && styles.shopBtnDisabled]}
              onPress={handleBuy}
              disabled={buying}
            >
              {buying ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.shopBtnText}>Shop Now</Text>
              )}
            </Pressable>
          ) : (
            <Pressable style={styles.shopBtn} onPress={openDetails}>
              <Text style={styles.shopBtnText}>View</Text>
            </Pressable>
          )}
        </View>
      )}
    </>
  );

  const mediaCarousel = (
    <FlatList
      data={post.media}
      keyExtractor={(item) => item.id}
      horizontal
      pagingEnabled
      showsHorizontalScrollIndicator={false}
      style={stage.isWebDesktop ? { width: mediaW, height: mediaH } : undefined}
      getItemLayout={
        stage.isWebDesktop
          ? (_, index) => ({ length: mediaW, offset: mediaW * index, index })
          : undefined
      }
      onMomentumScrollEnd={(e) => {
        const idx = Math.round(e.nativeEvent.contentOffset.x / mediaW);
        setActiveIndex(idx);
      }}
      renderItem={({ item, index }) => (
        <View style={stage.isWebDesktop ? { width: mediaW, height: mediaH } : undefined}>
          <ImmersiveMediaItem
            item={item}
            active={active && index === activeIndex}
            muted={muted}
            frameWidth={mediaW}
            frameHeight={mediaH}
            naturalWidth={
              index === activeIndex ? (videoNaturalSize?.width ?? item.width) : item.width
            }
            naturalHeight={
              index === activeIndex ? (videoNaturalSize?.height ?? item.height) : item.height
            }
            onVideoNaturalSize={
              index === activeIndex ? (w, h) => setVideoNaturalSize({ width: w, height: h }) : undefined
            }
          />
        </View>
      )}
    />
  );

  if (stage.isWebDesktop) {
    return (
      <View style={[styles.webSlide, { height: stage.slideHeight }]}>
        <View style={styles.webCenter}>
          <View style={styles.webStageColumn}>
            <View
              key={`${post.id}-${activeIndex}`}
              style={[styles.webMediaFrame, { width: mediaW, height: mediaH }]}
            >
              {mediaCarousel}
              {post.media.length > 1 && (
                <View style={styles.webPageDots}>
                  {post.media.map((m, i) => (
                    <View key={m.id} style={[styles.dot, i === activeIndex && styles.dotActive]} />
                  ))}
                </View>
              )}
            </View>
            <View style={[styles.webMeta, { width: mediaW }]}>{metaBlock}</View>
          </View>
          <View style={styles.webActionsRail}>{actionsRail}</View>
        </View>

        {showClose && (
          <Pressable
            style={[styles.webCloseBtn, { top: insets.top + sp(12) }]}
            onPress={closeImmersiveView}
            hitSlop={12}
          >
            <Ionicons name="close" size={24} color="#fff" />
          </Pressable>
        )}
      </View>
    );
  }

  return (
    <View style={styles.root}>
      {mediaCarousel}

      {showClose && (
        <View style={[styles.topBar, { paddingTop: insets.top + sp(8) }]}>
          <View style={styles.topSpacer} />
          {post.media.length > 1 && (
            <View style={styles.pageDots}>
              {post.media.map((m, i) => (
                <View key={m.id} style={[styles.dot, i === activeIndex && styles.dotActive]} />
              ))}
            </View>
          )}
          <Pressable style={styles.iconBtn} onPress={closeImmersiveView} hitSlop={12}>
            <Ionicons name="close" size={22} color="#fff" />
          </Pressable>
        </View>
      )}

      {!showClose && post.media.length > 1 && (
        <View style={[styles.pageDotsOnly, { top: insets.top + sp(16) }]}>
          {post.media.map((m, i) => (
            <View key={m.id} style={[styles.dot, i === activeIndex && styles.dotActive]} />
          ))}
        </View>
      )}

      <View style={[styles.actionsCol, { bottom: insets.bottom + sp(hasCommerce ? 120 : 80) }]}>
        {actionsRail}
      </View>

      <View style={[styles.bottomOverlay, { paddingBottom: insets.bottom + sp(12) }]}>
        {metaBlock}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#000',
  },
  webSlide: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  webCenter: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'center',
    gap: sp(20),
  },
  webStageColumn: {
    alignItems: 'center',
  },
  webMediaFrame: {
    backgroundColor: '#000',
    borderRadius: radii.md,
    overflow: 'hidden',
    position: 'relative',
    alignSelf: 'center',
  },
  webPageDots: {
    position: 'absolute',
    bottom: sp(12),
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: sp(6),
  },
  webMeta: {
    marginTop: sp(14),
    gap: sp(8),
    maxWidth: 400,
  },
  webActionsRail: {
    alignItems: 'center',
    gap: sp(22),
    paddingTop: sp(80),
  },
  webCloseBtn: {
    position: 'absolute',
    right: sp(24),
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 200,
    ...(Platform.OS === 'web' ? { cursor: 'pointer' as const } : null),
  },
  mediaSlide: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
    overflow: 'hidden',
  },
  videoPosterFallback: {
    backgroundColor: '#1a1a1a',
  },
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: sp(16),
    zIndex: 10,
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  topSpacer: { width: 36 },
  pageDots: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: sp(6),
  },
  pageDotsOnly: {
    position: 'absolute',
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: sp(6),
    zIndex: 10,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.35)',
  },
  dotActive: {
    backgroundColor: '#fff',
    width: 8,
  },
  actionsCol: {
    position: 'absolute',
    right: sp(12),
    alignItems: 'center',
    gap: sp(18),
    zIndex: 10,
  },
  actionCircle: {
    alignItems: 'center',
    gap: sp(6),
  },
  actionLabel: {
    fontFamily: fonts.sans,
    fontSize: fs(12),
    fontWeight: '600',
    color: '#fff',
  },
  bottomOverlay: {
    position: 'absolute',
    left: 0,
    right: sp(72),
    bottom: 0,
    paddingHorizontal: sp(16),
    paddingTop: sp(48),
    zIndex: 10,
  },
  authorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: sp(10),
    marginBottom: sp(4),
  },
  username: {
    fontFamily: fonts.sans,
    fontSize: fs(15),
    fontWeight: '700',
    color: '#fff',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  usernameWeb: {
    fontFamily: fonts.sans,
    fontSize: fs(15),
    fontWeight: '700',
    color: '#fff',
  },
  caption: {
    fontFamily: fonts.sans,
    fontSize: fs(14),
    color: 'rgba(255,255,255,0.95)',
    lineHeight: fs(20),
    marginBottom: sp(6),
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  captionWeb: {
    fontFamily: fonts.sans,
    fontSize: fs(14),
    color: 'rgba(255,255,255,0.9)',
    lineHeight: fs(20),
  },
  socialProof: {
    fontFamily: fonts.sans,
    fontSize: fs(12),
    color: 'rgba(255,255,255,0.75)',
    marginBottom: sp(12),
  },
  productCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderRadius: radii.md,
    padding: sp(10),
    gap: sp(10),
    marginTop: sp(4),
  },
  productThumb: {
    width: 44,
    height: 44,
    borderRadius: radii.sm,
    backgroundColor: colors.bgMuted,
  },
  productThumbPlaceholder: {
    backgroundColor: colors.bgMuted,
  },
  productInfo: {
    flex: 1,
    gap: sp(2),
  },
  productTitle: {
    fontFamily: fonts.sans,
    fontSize: fs(13),
    fontWeight: '600',
    color: colors.text,
  },
  productPrice: {
    fontFamily: fonts.sans,
    fontSize: fs(14),
    fontWeight: '700',
    color: colors.text,
  },
  shopBtn: {
    backgroundColor: '#000',
    paddingHorizontal: sp(14),
    paddingVertical: sp(10),
    borderRadius: radii.sm,
    minWidth: sp(88),
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: sp(36),
  },
  shopBtnDisabled: { opacity: 0.6 },
  shopBtnText: {
    fontFamily: fonts.sans,
    fontSize: fs(13),
    fontWeight: '700',
    color: '#fff',
  },
});
