import type { ReactNode } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { usePathname, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import { useAuth } from '@/lib/auth';
import { useWebLayout } from '@/lib/use-web-layout';
import { HeaderLogIn } from '@/components/HeaderLogIn';
import { colors, fonts, fs, layout, radii, sp } from '@/constants/theme';

type IconName = ComponentProps<typeof Ionicons>['name'];

type NavItem = {
  href: '/(tabs)' | '/(tabs)/explore' | '/(tabs)/create' | '/(tabs)/profile';
  label: string;
  icon: IconName;
  iconFocused: IconName;
};

const NAV: NavItem[] = [
  { href: '/(tabs)', label: 'Home', icon: 'home-outline', iconFocused: 'home' },
  { href: '/(tabs)/explore', label: 'Shop', icon: 'bag-outline', iconFocused: 'bag' },
  { href: '/(tabs)/create', label: 'Create', icon: 'add-circle-outline', iconFocused: 'add-circle' },
  { href: '/(tabs)/profile', label: 'Profile', icon: 'person-outline', iconFocused: 'person' },
];

function isActive(pathname: string, href: string): boolean {
  const path = pathname.replace(/\/$/, '') || '/';
  if (href === '/(tabs)') {
    return (
      path === '/' ||
      path === '/index' ||
      path.endsWith('/(tabs)') ||
      (!path.includes('explore') &&
        !path.includes('create') &&
        !path.includes('profile') &&
        (path === '' || path.split('/').filter(Boolean).length <= 1))
    );
  }
  const segment = href.replace('/(tabs)/', '');
  return path.includes(`/${segment}`);
}

type Props = {
  children: ReactNode;
};

export function WebDesktopLayout({ children }: Props) {
  const { isDesktop, feedColumnWidth, showAside } = useWebLayout();
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useAuth();

  if (Platform.OS !== 'web' || !isDesktop) {
    return <>{children}</>;
  }

  return (
    <View style={styles.page}>
      <View style={[styles.sideNav, { width: layout.webSideNavWidth }]}>
        <Text style={styles.logo}>INBIDZ</Text>
        <View style={styles.nav}>
          {NAV.map((item) => {
            const active = isActive(pathname, item.href);
            return (
              <Pressable
                key={item.href}
                style={[styles.navItem, active && styles.navItemActive]}
                onPress={() => router.push(item.href)}
              >
                <Ionicons
                  name={active ? item.iconFocused : item.icon}
                  size={26}
                  color={active ? colors.text : colors.textMuted}
                />
                <Text style={[styles.navLabel, active && styles.navLabelActive]}>
                  {item.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
        <View style={styles.sideFooter}>
          <HeaderLogIn />
        </View>
      </View>

      <View style={styles.main}>
        <View style={[styles.feedColumn, { width: feedColumnWidth, maxWidth: layout.feedMaxWidth }]}>
          {children}
        </View>
      </View>

      {showAside && (
        <View style={[styles.aside, { width: layout.webAsideWidth }]}>
          <View style={styles.asideCard}>
            <Text style={styles.asideTitle}>Post it. Share it. Sell it.</Text>
            <Text style={styles.asideBody}>
              Discover creators, follow sellers, and shop straight from the feed.
            </Text>
            {!user && (
              <Text style={styles.asideHint}>Sign in from Home to buy, bid, and sell.</Text>
            )}
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    backgroundColor: colors.bg,
    minHeight: '100vh' as unknown as number,
  },
  sideNav: {
    paddingTop: sp(24),
    paddingHorizontal: sp(12),
    paddingBottom: sp(24),
    borderRightWidth: StyleSheet.hairlineWidth,
    borderRightColor: colors.border,
    backgroundColor: colors.surface,
  },
  logo: {
    fontFamily: fonts.sans,
    fontSize: fs(22),
    fontWeight: '800',
    color: colors.text,
    letterSpacing: -0.5,
    paddingHorizontal: sp(12),
    marginBottom: sp(28),
  },
  nav: { gap: sp(4), flex: 1 },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: sp(16),
    paddingVertical: sp(12),
    paddingHorizontal: sp(12),
    borderRadius: radii.md,
  },
  navItemActive: {
    backgroundColor: colors.accentSoft,
  },
  navLabel: {
    fontFamily: fonts.sans,
    fontSize: fs(16),
    color: colors.textMuted,
    fontWeight: '400',
  },
  navLabelActive: {
    color: colors.text,
    fontWeight: '600',
  },
  sideFooter: {
    paddingHorizontal: sp(8),
    alignItems: 'flex-start',
  },
  main: {
    flex: 1,
    alignItems: 'center',
    minWidth: 0,
  },
  feedColumn: {
    flex: 1,
    width: '100%',
    maxWidth: layout.feedMaxWidth,
    backgroundColor: colors.bg,
    borderLeftWidth: StyleSheet.hairlineWidth,
    borderRightWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  aside: {
    paddingTop: sp(32),
    paddingLeft: sp(8),
    paddingRight: sp(24),
  },
  asideCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: sp(20),
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    gap: sp(10),
  },
  asideTitle: {
    fontFamily: fonts.sans,
    fontSize: fs(16),
    fontWeight: '700',
    color: colors.text,
  },
  asideBody: {
    fontFamily: fonts.sans,
    fontSize: fs(14),
    color: colors.textSecondary,
    lineHeight: fs(20),
  },
  asideHint: {
    fontFamily: fonts.sans,
    fontSize: fs(13),
    color: colors.textMuted,
    marginTop: sp(4),
  },
});
