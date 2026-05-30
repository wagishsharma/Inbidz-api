import { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import { Video, ResizeMode } from 'expo-av';
import type { PostMedia } from '@inbidz/shared';
import { colors, sp } from '@/constants/theme';
import { getContentWidth, getGridItemWidth } from '@/lib/dimensions';

type Props = {
  media: PostMedia[];
  autoPlay?: boolean;
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
  compact,
  width,
  cardLayout,
}: {
  item: PostMedia;
  autoPlay?: boolean;
  compact?: boolean;
  width: number;
  cardLayout?: boolean;
}) {
  const videoRef = useRef<Video>(null);
  const [muted, setMuted] = useState(true);
  const shouldPlay = Boolean(autoPlay);
  const height = getMediaHeight(width, item, cardLayout, compact);
  const useCover = cardLayout || item.orientation !== 'landscape';

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
    return (
      <Pressable onPress={() => setMuted((m) => !m)} style={[styles.mediaWrap, { width, height }]}>
        <Video
          ref={videoRef}
          source={{ uri: item.hlsUrl || item.url }}
          style={styles.media}
          resizeMode={useCover ? ResizeMode.COVER : ResizeMode.CONTAIN}
          shouldPlay={shouldPlay}
          isLooping
          isMuted={muted}
        />
      </Pressable>
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

export function AdaptiveMedia({ media, autoPlay, compact, width: widthProp, cardLayout }: Props) {
  const width = widthProp ?? (compact ? getGridItemWidth(2, sp(12), sp(12)) : getContentWidth());

  if (media.length === 1) {
    return (
      <MediaItem
        item={media[0]}
        autoPlay={autoPlay}
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
  },
  media: {
    width: '100%',
    height: '100%',
  },
});
