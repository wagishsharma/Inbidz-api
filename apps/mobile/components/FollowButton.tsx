import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native';
import { useAuth } from '@/lib/auth';
import { api } from '@/lib/api';
import { notifyFollowGraphChanged } from '@/lib/follow-invalidation';
import { colors, fonts, fs, radii, sp } from '@/constants/theme';

type Props = {
  userId: string;
  isFollowing: boolean;
  onToggle?: (following: boolean) => void;
  compact?: boolean;
};

export function FollowButton({ userId, isFollowing: initial, onToggle, compact }: Props) {
  const { accessToken, login, refreshUser } = useAuth();
  const [following, setFollowing] = useState(initial);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setFollowing(initial);
  }, [initial, userId]);

  const handlePress = async () => {
    if (!accessToken) {
      await login();
      return;
    }
    setLoading(true);
    const prev = following;
    const next = !prev;
    setFollowing(next);
    try {
      const res = await api.follow(accessToken, userId);
      setFollowing(res.following);
      onToggle?.(res.following);
      notifyFollowGraphChanged();
      void refreshUser();
    } catch {
      setFollowing(prev);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Pressable
      style={[
        styles.btn,
        compact && styles.btnCompact,
        following ? styles.btnFollowing : styles.btnFollow,
      ]}
      onPress={handlePress}
      disabled={loading}
    >
      {loading ? (
        <ActivityIndicator size="small" color={following ? colors.text : colors.surface} />
      ) : (
        <Text style={[styles.text, following ? styles.textFollowing : styles.textFollow]}>
          {following ? 'Following' : 'Follow'}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    paddingHorizontal: sp(20),
    paddingVertical: sp(10),
    borderRadius: radii.sm,
    minWidth: sp(100),
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnCompact: {
    paddingHorizontal: sp(14),
    paddingVertical: sp(6),
    minWidth: sp(80),
  },
  btnFollow: {
    backgroundColor: colors.accent,
  },
  btnFollowing: {
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  text: {
    fontFamily: fonts.sans,
    fontSize: fs(14),
    fontWeight: '600',
  },
  textFollow: { color: colors.surface },
  textFollowing: { color: colors.text },
});
