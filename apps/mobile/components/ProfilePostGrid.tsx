import { useMemo } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import type { Post } from '@inbidz/shared';
import { router } from 'expo-router';
import { setImmersiveFeedSession } from '@/lib/immersive-feed';
import { colors, fonts, fs, sp } from '@/constants/theme';

const GAP = sp(2);
const COLS = 3;

type Props = {
  posts: Post[];
  loading?: boolean;
  emptyMessage?: string;
  loadingMore?: boolean;
};

/** Thumbnail only — never use video URLs in the grid (avoids decoding many streams). */
function gridThumb(post: Post): { uri: string; isVideo: boolean } {
  const first = post.media[0];
  if (!first) return { uri: '', isVideo: false };
  if (first.type === 'video') {
    return { uri: first.thumbnailUrl ?? '', isVideo: true };
  }
  return { uri: first.url, isVideo: false };
}

export function ProfilePostGrid({
  posts,
  loading,
  emptyMessage = 'No posts yet',
  loadingMore,
}: Props) {
  const rows = useMemo(() => {
    const chunks: Post[][] = [];
    for (let i = 0; i < posts.length; i += COLS) {
      chunks.push(posts.slice(i, i + COLS));
    }
    return chunks;
  }, [posts]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  if (posts.length === 0) {
    return (
      <View style={styles.center}>
        <Text style={styles.empty}>{emptyMessage}</Text>
      </View>
    );
  }

  return (
    <View style={styles.wrap}>
      {rows.map((row, rowIndex) => (
        <View key={rowIndex} style={styles.row}>
          {row.map((item, colIndex) => {
            const index = rowIndex * COLS + colIndex;
            const { uri: thumbUri, isVideo } = gridThumb(item);
            const hasCommerce = item.commerceMode !== 'none';

            return (
              <Pressable
                key={item.id}
                style={styles.cell}
                onPress={() => {
                  setImmersiveFeedSession(posts, index);
                  router.push(`/post/view/${item.id}`);
                }}
              >
                {thumbUri ? (
                  <Image
                    source={{ uri: thumbUri }}
                    style={styles.thumb}
                    contentFit="cover"
                    recyclingKey={item.id}
                  />
                ) : (
                  <View style={[styles.thumb, styles.thumbPlaceholder]} />
                )}
                {isVideo && (
                  <View style={styles.playBadge} pointerEvents="none">
                    <Ionicons name="play" size={14} color="#fff" />
                  </View>
                )}
                {hasCommerce && (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>$</Text>
                  </View>
                )}
              </Pressable>
            );
          })}
          {row.length < COLS &&
            Array.from({ length: COLS - row.length }).map((_, i) => (
              <View key={`pad-${rowIndex}-${i}`} style={styles.cellSpacer} />
            ))}
        </View>
      ))}
      {loadingMore ? (
        <ActivityIndicator style={styles.footer} color={colors.accent} />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: '100%',
    alignSelf: 'stretch',
  },
  row: {
    flexDirection: 'row',
    width: '100%',
    gap: GAP,
    marginBottom: GAP,
  },
  cell: {
    flex: 1,
    aspectRatio: 1,
    backgroundColor: colors.bgMuted,
    overflow: 'hidden',
  },
  cellSpacer: {
    flex: 1,
    aspectRatio: 1,
  },
  thumb: { width: '100%', height: '100%' },
  thumbPlaceholder: { backgroundColor: colors.border },
  playBadge: {
    position: 'absolute',
    bottom: sp(4),
    left: sp(4),
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    top: sp(4),
    right: sp(4),
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: 4,
    paddingHorizontal: sp(4),
    paddingVertical: sp(2),
  },
  badgeText: {
    fontFamily: fonts.sans,
    color: '#fff',
    fontSize: fs(10),
    fontWeight: '700',
  },
  center: { paddingVertical: sp(32), alignItems: 'center' },
  empty: {
    fontFamily: fonts.sans,
    color: colors.textMuted,
    fontSize: fs(14),
  },
  footer: { paddingVertical: sp(16) },
});
