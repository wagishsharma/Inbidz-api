import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import type { Post, PostComment } from '@inbidz/shared';
import { useAuth } from '@/lib/auth';
import { api } from '@/lib/api';
import { UserAvatar } from '@/components/UserAvatar';
import { colors, fonts, fs, layout, sp } from '@/constants/theme';

type Props = {
  post: Post;
  onCommentCountChange?: (count: number) => void;
};

function formatTime(iso: string): string {
  const d = new Date(iso);
  const diff = Date.now() - d.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d`;
  return d.toLocaleDateString();
}

export function PostCommentsSection({ post, onCommentCountChange }: Props) {
  const { accessToken, login, user } = useAuth();
  const [comments, setComments] = useState<PostComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await api.getComments(post.id);
      setComments(res.comments);
    } catch (e) {
      console.warn('Comments load failed', e);
    } finally {
      setLoading(false);
    }
  }, [post.id]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleSend = async () => {
    const text = body.trim();
    if (!text) return;
    if (!accessToken) {
      await login();
      return;
    }
    setSending(true);
    try {
      const res = await api.createComment(accessToken, post.id, text);
      setComments((prev) => [...prev, res.comment]);
      setBody('');
      const nextCount = post.commentCount + 1;
      onCommentCountChange?.(nextCount);
    } catch (e) {
      console.warn('Comment failed', e);
    } finally {
      setSending(false);
    }
  };

  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>
        Comments {post.commentCount > 0 ? `(${post.commentCount})` : ''}
      </Text>

      {loading ? (
        <ActivityIndicator color={colors.accent} style={styles.loader} />
      ) : comments.length === 0 ? (
        <Text style={styles.empty}>No comments yet. Be the first.</Text>
      ) : (
        <View style={styles.list}>
          {comments.map((c) => (
            <View key={c.id} style={styles.comment}>
              <UserAvatar
                uri={c.author.avatarUrl}
                name={c.author.displayName}
                username={c.author.username}
                size={28}
              />
              <View style={styles.commentBodyWrap}>
                <View style={styles.commentHead}>
                  <Text style={styles.commentAuthor}>@{c.author.username}</Text>
                  <Text style={styles.commentTime}>{formatTime(c.createdAt)}</Text>
                </View>
                <Text style={styles.commentBody}>{c.body}</Text>
              </View>
            </View>
          ))}
        </View>
      )}

      <View style={styles.composer}>
        <TextInput
          style={styles.input}
          placeholder={user ? 'Add a comment…' : 'Sign in to comment'}
          placeholderTextColor={colors.textMuted}
          value={body}
          onChangeText={setBody}
          multiline
          maxLength={1000}
          editable={!sending}
        />
        <Pressable
          style={[styles.sendBtn, (!body.trim() || sending) && styles.sendDisabled]}
          onPress={handleSend}
          disabled={!body.trim() || sending}
        >
          {sending ? (
            <ActivityIndicator size="small" color={colors.surface} />
          ) : (
            <Text style={styles.sendText}>Post</Text>
          )}
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: layout.contentPadding,
    paddingTop: sp(16),
    paddingBottom: sp(8),
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  title: {
    fontFamily: fonts.sans,
    fontSize: fs(15),
    fontWeight: '600',
    color: colors.text,
    marginBottom: sp(12),
  },
  loader: { marginVertical: sp(16) },
  empty: {
    fontFamily: fonts.sans,
    fontSize: fs(14),
    color: colors.textMuted,
    marginBottom: sp(12),
  },
  list: { gap: sp(14), marginBottom: sp(16) },
  comment: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: sp(10),
  },
  commentBodyWrap: { flex: 1, gap: sp(4) },
  commentHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: sp(8),
  },
  commentAuthor: {
    fontFamily: fonts.sans,
    fontSize: fs(13),
    fontWeight: '600',
    color: colors.text,
  },
  commentTime: {
    fontFamily: fonts.sans,
    fontSize: fs(12),
    color: colors.textMuted,
  },
  commentBody: {
    fontFamily: fonts.sans,
    fontSize: fs(14),
    color: colors.textSecondary,
    lineHeight: fs(20),
  },
  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: sp(8),
  },
  input: {
    flex: 1,
    fontFamily: fonts.sans,
    fontSize: fs(15),
    color: colors.text,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: sp(12),
    paddingVertical: sp(10),
    maxHeight: sp(100),
    backgroundColor: colors.surface,
  },
  sendBtn: {
    backgroundColor: colors.accent,
    paddingHorizontal: sp(16),
    paddingVertical: sp(10),
    borderRadius: 8,
    minWidth: sp(56),
    alignItems: 'center',
  },
  sendDisabled: { opacity: 0.5 },
  sendText: {
    fontFamily: fonts.sans,
    fontSize: fs(14),
    fontWeight: '600',
    color: colors.surface,
  },
});
