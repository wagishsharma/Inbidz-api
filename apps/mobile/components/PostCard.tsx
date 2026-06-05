import { formatINR } from '@inbidz/shared';
import type { FeedMode, Post } from '@inbidz/shared';
import { Ionicons } from '@expo/vector-icons';
import { Platform, Pressable, Share, StyleSheet, Text, View } from 'react-native';
import { AdaptiveMedia } from './AdaptiveMedia';
import { UserAvatar } from './UserAvatar';
import { router } from 'expo-router';
import { colors, fonts, fs, radii, sp } from '@/constants/theme';
import { getContentWidth } from '@/lib/dimensions';
import { setImmersiveFeedSession } from '@/lib/immersive-feed';
import { sharePost } from '@/lib/share-post';

type Props = {
  post: Post;
  onLike?: () => void;
  onShare?: () => void;
  onComment?: () => void;
  autoPlay?: boolean;
  compact?: boolean;
  /** Width of the card interior (for correct media sizing in padded lists) */
  width?: number;
  /** Pass feed posts + index to enable swipe-up between posts in immersive mode */
  immersiveFeed?: { posts: Post[]; index: number; feedMode?: FeedMode };
};

export function PostCard({
  post,
  onLike,
  onShare,
  onComment,
  autoPlay,
  compact,
  width,
  immersiveFeed,
}: Props) {
  const cardWidth =
    width ??
    (compact
      ? getContentWidth()
      : getContentWidth() - sp(16) * 2);

  const handleShare = async () => {
    onShare?.();
    await sharePost(post);
  };

  const price =
    post.commerce?.price != null && post.commerceMode !== 'none'
      ? formatINR(post.commerce.price)
      : null;

  return (
    <View style={[styles.card, compact && styles.cardCompact]}>
      <Pressable
        style={styles.mediaFrame}
        onPress={() => {
          if (immersiveFeed) {
            setImmersiveFeedSession(
              immersiveFeed.posts,
              immersiveFeed.index,
              immersiveFeed.feedMode
            );
          }
          router.push(`/post/view/${post.id}`);
        }}
      >
        <AdaptiveMedia
          media={post.media}
          autoPlay={autoPlay}
          loadVideo={Boolean(autoPlay)}
          compact={compact}
          width={cardWidth}
          cardLayout
        />
      </Pressable>

      <View style={[styles.placard, compact && styles.placardCompact]}>
        <View style={styles.placardTop}>
          <Pressable
            style={styles.authorRow}
            onPress={() => router.push(`/user/${post.userId}`)}
          >
            <UserAvatar
              uri={post.author.avatarUrl}
              name={post.author.displayName}
              username={post.author.username}
              size={32}
            />
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
          </Pressable>
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
            <Pressable style={styles.actionBtn} onPress={onComment} hitSlop={8}>
              <Ionicons name="chatbubble-outline" size={18} color={colors.textMuted} />
              <Text style={styles.actionText}>
                {post.commentCount > 0 ? post.commentCount : 'Comment'}
              </Text>
            </Pressable>
            <Text style={styles.meta}>
              {post.likeCount} saved
            </Text>
          </View>
        )}
      </View>
    </View>
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
