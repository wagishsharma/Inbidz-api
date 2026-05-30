import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '@/lib/auth';
import { GroupedSection } from '@/components/GroupedSection';
import { SignInCard } from '@/components/SignInCard';
import { colors, fonts, fs, layout, shared, sp } from '@/constants/theme';

export default function ProfileScreen() {
  const { user, login, logout } = useAuth();

  if (!user) {
    return (
      <View style={styles.container}>
        <SignInCard
          subtitle="Follow sellers, buy items, and start your shop."
          onSignIn={login}
        />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <GroupedSection title="Profile">
        <View style={styles.profileInner}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {(user.displayName || user.username || 'U')[0].toUpperCase()}
            </Text>
          </View>
          <Text style={styles.title}>{user.displayName || user.name || 'Creator'}</Text>
          <Text style={styles.handle}>@{user.username || user.id.slice(0, 8)}</Text>
          {user.referralCode && (
            <Text style={styles.ref}>Invite code · {user.referralCode}</Text>
          )}
        </View>
      </GroupedSection>

      {!user.shopSetupComplete && (
        <GroupedSection title="Selling">
          <Pressable style={styles.listRow} onPress={() => router.push('/shop/setup')}>
            <View style={styles.rowIcon}>
              <Text style={styles.rowIconText}>$</Text>
            </View>
            <View style={styles.rowText}>
              <Text style={styles.rowTitle}>Set up your shop</Text>
              <Text style={styles.rowSub}>Start selling in under a minute</Text>
            </View>
            <Text style={styles.chevron}>›</Text>
          </Pressable>
        </GroupedSection>
      )}

      <GroupedSection title="Actions">
        <Pressable style={styles.listRow} onPress={() => router.push('/(tabs)/create')}>
          <Text style={styles.rowTitle}>Create post</Text>
          <Text style={styles.chevron}>›</Text>
        </Pressable>
        <View style={styles.separator} />
        <Pressable style={styles.listRow} onPress={logout}>
          <Text style={[styles.rowTitle, styles.dangerText]}>Sign out</Text>
        </Pressable>
      </GroupedSection>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: shared.screen,
  content: {
    paddingTop: sp(8),
    paddingBottom: sp(32),
  },
  profileInner: {
    padding: layout.cardPadding,
    alignItems: 'center',
    gap: sp(4),
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 16,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: sp(8),
  },
  avatarText: {
    fontFamily: fonts.sans,
    fontSize: fs(24),
    fontWeight: '600',
    color: colors.accent,
  },
  title: {
    fontFamily: fonts.sans,
    color: colors.text,
    fontSize: fs(20),
    fontWeight: '600',
  },
  handle: {
    fontFamily: fonts.sans,
    color: colors.textMuted,
    fontSize: fs(14),
  },
  ref: {
    fontFamily: fonts.sans,
    color: colors.textMuted,
    marginTop: sp(8),
    fontSize: fs(13),
  },
  listRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: layout.cardPadding,
    paddingVertical: sp(14),
    gap: sp(12),
  },
  rowIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowIconText: {
    fontFamily: fonts.sans,
    fontSize: fs(14),
    fontWeight: '700',
    color: colors.accent,
  },
  rowText: { flex: 1 },
  rowTitle: {
    flex: 1,
    fontFamily: fonts.sans,
    color: colors.text,
    fontWeight: '500',
    fontSize: fs(15),
  },
  rowSub: {
    fontFamily: fonts.sans,
    color: colors.textMuted,
    fontSize: fs(13),
    marginTop: sp(2),
  },
  chevron: {
    fontFamily: fonts.sans,
    fontSize: fs(20),
    color: colors.textMuted,
    fontWeight: '300',
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
    marginLeft: layout.cardPadding,
  },
  dangerText: {
    color: colors.danger,
  },
});
