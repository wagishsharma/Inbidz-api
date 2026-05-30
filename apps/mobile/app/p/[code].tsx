import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import type { Post } from '@inbidz/shared';
import { AdaptiveMedia } from '@/components/AdaptiveMedia';
import { CommerceBar } from '@/components/CommerceBar';
import { useAuth } from '@/lib/auth';
import { api } from '@/lib/api';
import { colors, fonts, fs, layout, shared, sp } from '@/constants/theme';

export default function ShortLinkScreen() {
  const { code } = useLocalSearchParams<{ code: string }>();
  const { login } = useAuth();
  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!code) return;
    api
      .resolveShortCode(code)
      .then((res) => setPost(res.post))
      .catch(() => setPost(null))
      .finally(() => setLoading(false));
  }, [code]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.text} />
      </View>
    );
  }

  if (!post) {
    return (
      <View style={styles.center}>
        <Text style={styles.error}>Link not found</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <AdaptiveMedia media={post.media} />
      <CommerceBar post={post} />
      <Text style={styles.caption}>{post.caption}</Text>
      <Pressable style={styles.cta} onPress={() => router.push(`/post/${post.id}`)}>
        <Text style={styles.ctaText}>View post</Text>
      </Pressable>
      <Pressable style={styles.secondary} onPress={login}>
        <Text style={styles.secondaryText}>Sign in</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: shared.screen,
  center: shared.screenCenter,
  error: {
    fontFamily: fonts.sans,
    color: colors.textMuted,
    fontSize: fs(14),
  },
  caption: {
    fontFamily: fonts.sans,
    color: colors.textSecondary,
    padding: layout.contentPadding,
    fontSize: fs(14),
    fontStyle: 'italic',
    lineHeight: fs(20),
  },
  cta: {
    marginHorizontal: layout.contentPadding,
    ...shared.btnPrimary,
  },
  ctaText: shared.btnPrimaryText,
  secondary: { alignItems: 'center', padding: sp(12) },
  secondaryText: {
    fontFamily: fonts.sans,
    color: colors.textSecondary,
    fontSize: fs(13),
  },
});
