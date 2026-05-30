import { Platform, StyleSheet } from 'react-native';

/** Expo Go–inspired: iOS grouped background, flat white cards, purple accent */
export const colors = {
  bg: '#F2F2F7',
  bgMuted: '#E5E5EA',
  surface: '#FFFFFF',
  border: '#E5E5EA',
  borderStrong: '#C7C7CC',
  text: '#000000',
  textSecondary: '#3C3C43',
  textMuted: '#8E8E93',
  accent: '#4630EB',
  accentHover: '#3D28D4',
  accentSoft: '#EEEDFC',
  danger: '#DC2626',
  success: '#059669',
  overlay: 'rgba(15, 23, 42, 0.4)',
  tabBar: '#FFFFFF',
  tabBarBorder: '#E5E5EA',
  inputBg: '#FFFFFF',
  inputBorder: '#E2E8F0',
  segmentBg: '#F1F5F9',
  segmentActive: '#FFFFFF',
} as const;

export const fonts = {
  sans: Platform.select({
    web: 'Inter, system-ui, -apple-system, sans-serif',
    default: 'System',
  }),
} as const;

const WEB_FONT_SCALE = 0.875;
const WEB_SPACE_SCALE = 0.9;

export function fs(size: number): number {
  return Platform.OS === 'web' ? Math.round(size * WEB_FONT_SCALE) : size;
}

export function sp(size: number): number {
  return Platform.OS === 'web' ? Math.round(size * WEB_SPACE_SCALE) : size;
}

export const layout = {
  maxWidth: Platform.OS === 'web' ? 480 : undefined,
  maxWidthWide: Platform.OS === 'web' ? 720 : undefined,
  contentPadding: sp(16),
  sectionGap: sp(20),
  cardPadding: sp(16),
} as const;

export const radii = {
  sm: 8,
  md: 10,
  lg: 12,
  pill: 999,
} as const;

/** Flat grouped cards — no drop shadow (Expo Go style) */
export const shadow = {} as object;

export const shadowSm = {} as object;

/** Shared style fragments */
export const shared = {
  screen: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  screenCenter: {
    flex: 1,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    backgroundColor: colors.bg,
    padding: layout.contentPadding,
  },
  h1: {
    fontFamily: fonts.sans,
    fontSize: fs(22),
    fontWeight: '700' as const,
    color: colors.text,
    letterSpacing: -0.3,
  },
  subtitle: {
    fontFamily: fonts.sans,
    fontSize: fs(14),
    color: colors.textSecondary,
    lineHeight: fs(20),
    marginTop: sp(6),
  },
  fieldLabel: {
    fontFamily: fonts.sans,
    fontSize: fs(13),
    fontWeight: '500' as const,
    color: colors.text,
    marginBottom: sp(6),
  },
  link: {
    fontFamily: fonts.sans,
    fontSize: fs(13),
    fontWeight: '500' as const,
    color: colors.accent,
  },
  btnPrimary: {
    backgroundColor: colors.accent,
    paddingVertical: sp(12),
    paddingHorizontal: sp(20),
    borderRadius: radii.sm,
    alignItems: 'center' as const,
    width: '100%' as const,
  },
  btnPrimaryText: {
    fontFamily: fonts.sans,
    color: colors.surface,
    fontSize: fs(15),
    fontWeight: '600' as const,
  },
  btnOutline: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderStrong,
    paddingVertical: sp(12),
    paddingHorizontal: sp(20),
    borderRadius: radii.sm,
    alignItems: 'center' as const,
    backgroundColor: colors.surface,
    width: '100%' as const,
  },
  btnOutlineText: {
    fontFamily: fonts.sans,
    color: colors.text,
    fontSize: fs(15),
    fontWeight: '500' as const,
  },
  input: {
    fontFamily: fonts.sans,
    backgroundColor: colors.inputBg,
    borderWidth: 1,
    borderColor: colors.inputBorder,
    color: colors.text,
    borderRadius: radii.sm,
    paddingVertical: sp(11),
    paddingHorizontal: sp(14),
    fontSize: fs(15),
    width: '100%' as const,
  },
} as const;

export const theme = { colors, fonts, layout, radii, shadow, shadowSm, shared, fs, sp };

export default theme;
