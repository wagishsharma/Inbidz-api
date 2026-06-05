import { useEffect, useRef, useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import { Video, ResizeMode } from 'expo-av';
import { Ionicons } from '@expo/vector-icons';
import type { PostMedia } from '@inbidz/shared';
import { FeedWebVideo } from '@/components/FeedWebVideo';
import { colors, sp } from '@/constants/theme';
import { getContentWidth, getGridItemWidth } from '@/lib/dimensions';
import { normalizeMediaDimensions } from '@/lib/use-immersive-stage';

type Props = {
  media: PostMedia[];
  autoPlay?: boolean;
  /** When false, video posts show a placeholder and do not fetch bytes (feed scroll). */
  loadVideo?: boolean;
  compact?: boolean;
  width?: number;
  /** Fixed aspect frames for feed/explore cards: photo 4:3, video 5:3 */
  cardLayout?: boolean;
};

const PHOTO_ASPECT = 4 / 3; // portrait 3:4 — height = width × 4/3
const VIDEO_ASPECT = 5 / 3; // portrait 3:5 — height = width × 5/3

function getMediaHeight(
  width: number,
  item: PostMedia,
  cardLayout?: boolean,
  compact?: boolean
): number {
  if (cardLayout) {
    if (item.type === 'video' && item.width > 0 && item.height > 0) {
      const { width: mw, height: mh } = normalizeMediaDimensions(
        item.width,
        item.height,
        item.orientation
      );
      return width * (mh / mw);
    }
    return width * (item.type === 'video' ? VIDEO_ASPECT : PHOTO_ASPECT);
  }

  const isLandscape = item.orientation === 'landscape';
  const aspectRatio = item.width / item.height;
  const maxHeight = compact
    ? width * 1.1
    : isLandscape
      ? width * 0.56
      : width * 1.15;
  return Math.min(width / aspectRatio, maxHeight);
}

function MediaItem({
  item,
  autoPlay,
  loadVideo = true,
  compact,
  width,
  cardLayout,
}: {
  item: PostMedia;
  autoPlay?: boolean;
  loadVideo?: boolean;
  compact?: boolean;
  width: number;
  cardLayout?: boolean;
}) {
  const videoRef = useRef<Video>(null);
  const [muted, setMuted] = useState(true);
  const shouldPlay = Boolean(autoPlay);
  const height = getMediaHeight(width, item, cardLayout, compact);
  const useCover =
    cardLayout ?
      Platform.OS !== 'web' || item.orientation !== 'landscape'
    : item.orientation !== 'landscape';

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

  if (item.type === 'video') {
    const poster = item.thumbnailUrl;

    if (!loadVideo) {
      return (
        <View style={[styles.mediaWrap, { width, height }]}>
          {poster ? (
            <Image
              source={{ uri: poster }}
              style={styles.media}
              contentFit={useCover ? 'cover' : 'contain'}
            />
          ) : (
            <View style={[styles.media, styles.videoPlaceholder]} />
          )}
          <View style={styles.playOverlay} pointerEvents="none">
            <Ionicons name="play-circle" size={48} color="rgba(255,255,255,0.9)" />
          </View>
        </View>
      );
    }

    const uri = item.hlsUrl || item.url;

    if (Platform.OS === 'web') {
      return (
        <View style={[styles.mediaWrap, { width, height }]}>
          <FeedWebVideo
            uri={uri}
            poster={poster}
            width={width}
            height={height}
            playing={shouldPlay}
            muted={muted}
          />
          <Pressable
            style={styles.muteBtn}
            onPress={() => setMuted((m) => !m)}
            hitSlop={8}
          >
            <Ionicons
              name={muted ? 'volume-mute' : 'volume-high'}
              size={16}
              color="#fff"
            />
          </Pressable>
        </View>
      );
    }

    return (
      <View style={[styles.mediaWrap, { width, height }]}>
        <Video
          ref={videoRef}
          source={{ uri }}
          style={styles.media}
          resizeMode={useCover ? ResizeMode.COVER : ResizeMode.CONTAIN}
          shouldPlay={shouldPlay}
          isLooping
          isMuted={muted}
          usePoster={Boolean(poster)}
          posterSource={poster ? { uri: poster } : undefined}
          posterStyle={styles.media}
        />
        <Pressable
          style={styles.muteBtn}
          onPress={() => setMuted((m) => !m)}
          hitSlop={8}
        >
          <Ionicons
            name={muted ? 'volume-mute' : 'volume-high'}
            size={16}
            color="#fff"
          />
        </Pressable>
      </View>
    );
  }

  return (
    <View style={[styles.mediaWrap, { width, height }]}>
      <Image
        source={{ uri: item.url }}
        style={styles.media}
        contentFit={useCover ? 'cover' : 'contain'}
      />
    </View>
  );
}

export function AdaptiveMedia({
  media,
  autoPlay,
  loadVideo = true,
  compact,
  width: widthProp,
  cardLayout,
}: Props) {
  const width = widthProp ?? (compact ? getGridItemWidth(2, sp(12), sp(12)) : getContentWidth());

  if (media.length === 1) {
    return (
      <MediaItem
        item={media[0]}
        autoPlay={autoPlay}
        loadVideo={loadVideo}
        compact={compact}
        width={width}
        cardLayout={cardLayout}
      />
    );
  }

  return (
    <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false}>
      {media.map((item) => (
        <View key={item.id}>
          <MediaItem
            item={item}
            autoPlay={autoPlay}
            loadVideo={loadVideo}
            compact={compact}
            width={width}
            cardLayout={cardLayout}
          />
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  mediaWrap: {
    backgroundColor: colors.bgMuted,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  media: {
    width: '100%',
    height: '100%',
  },
  muteBtn: {
    position: 'absolute',
    bottom: sp(10),
    right: sp(10),
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  videoPlaceholder: {
    backgroundColor: '#1a1a1a',
  },
  playOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.12)',
  },
});
