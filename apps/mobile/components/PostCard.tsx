import { formatINR } from '@inbidz/shared';
import type { Post } from '@inbidz/shared';
import { Ionicons } from '@expo/vector-icons';
import { Platform, Pressable, Share, StyleSheet, Text, View } from 'react-native';
import { AdaptiveMedia } from './AdaptiveMedia';
import { router } from 'expo-router';
import { colors, fonts, fs, radii, sp } from '@/constants/theme';
import { getContentWidth } from '@/lib/dimensions';

type Props = {
  post: Post;
  onLike?: () => void;
  onShare?: () => void;
  autoPlay?: boolean;
  compact?: boolean;
  /** Width of the card interior (for correct media sizing in padded lists) */
  width?: number;
};

export function PostCard({ post, onLike, onShare, autoPlay, compact, width }: Props) {
  const cardWidth =
    width ??
    (compact
      ? getContentWidth()
      : getContentWidth() - sp(16) * 2);

  const handleShare = async () => {
    onShare?.();
    if (post.shortUrl) {
      await Share.share({ message: post.shortUrl, url: post.shortUrl });
    }
  };

  const price =
    post.commerce?.price != null && post.commerceMode !== 'none'
      ? formatINR(post.commerce.price)
      : null;

  return (
    <Pressable
      style={[styles.card, compact && styles.cardCompact]}
      onPress={() => router.push(`/post/${post.id}`)}
    >
      <View style={styles.mediaFrame}>
        <AdaptiveMedia
          media={post.media}
          autoPlay={autoPlay}
          compact={compact}
          width={cardWidth}
          cardLayout
        />
      </View>

      <View style={[styles.placard, compact && styles.placardCompact]}>
        <View style={styles.placardTop}>
          <View style={styles.authorRow}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {(post.author.username?.[0] ?? '?').toUpperCase()}
              </Text>
            </View>
            <View style={styles.authorMeta}>
              <Text style={styles.author} numberOfLines={1}>
                {post.author.username}
              </Text>
              {post.caption && !compact ? (
                <Text style={styles.caption} numberOfLines={1}>
                  {post.caption}
                </Text>
              ) : null}
            </View>
          </View>
          {price ? <Text style={styles.price}>{price}</Text> : null}
        </View>

        {!compact && (
          <View style={styles.actions}>
            <Pressable style={styles.actionBtn} onPress={onLike} hitSlop={8}>
              <Ionicons
                name={post.isLiked ? 'bookmark' : 'bookmark-outline'}
                size={18}
                color={post.isLiked ? colors.accent : colors.textMuted}
              />
              <Text style={[styles.actionText, post.isLiked && styles.liked]}>
                {post.isLiked ? 'Saved' : 'Save'}
              </Text>
            </Pressable>
            <Pressable style={styles.actionBtn} onPress={handleShare} hitSlop={8}>
              <Ionicons name="share-outline" size={18} color={colors.textMuted} />
              <Text style={styles.actionText}>Share</Text>
            </Pressable>
            <Text style={styles.meta}>
              {post.likeCount} · {post.shareCount}
            </Text>
          </View>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  cardCompact: {
    ...(Platform.OS === 'web' ? { flex: 1 } : {}),
  },
  mediaFrame: {
    backgroundColor: colors.bgMuted,
  },
  placard: {
    paddingHorizontal: sp(14),
    paddingVertical: sp(12),
    gap: sp(8),
  },
  placardCompact: {
    paddingHorizontal: sp(10),
    paddingVertical: sp(8),
  },
  placardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: sp(12),
  },
  authorRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: sp(10),
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontFamily: fonts.sans,
    fontSize: fs(14),
    fontWeight: '600',
    color: colors.accent,
  },
  authorMeta: {
    flex: 1,
    gap: sp(2),
  },
  author: {
    fontFamily: fonts.sans,
    color: colors.text,
    fontSize: fs(15),
    fontWeight: '600',
  },
  price: {
    fontFamily: fonts.sans,
    color: colors.accent,
    fontSize: fs(14),
    fontWeight: '600',
  },
  caption: {
    fontFamily: fonts.sans,
    color: colors.textMuted,
    fontSize: fs(13),
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: sp(16),
    paddingTop: sp(4),
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: sp(4),
  },
  actionText: {
    fontFamily: fonts.sans,
    color: colors.textMuted,
    fontSize: fs(13),
    fontWeight: '500',
  },
  liked: { color: colors.accent },
  meta: {
    marginLeft: 'auto',
    fontFamily: fonts.sans,
    color: colors.textMuted,
    fontSize: fs(12),
  },
});
