import { Pressable, StyleSheet, Text, View } from 'react-native';
import { GroupedSection } from './GroupedSection';
import { colors, fonts, fs, layout, shared, sp } from '@/constants/theme';

type Props = {
  title?: string;
  subtitle?: string;
  onSignIn: () => void;
  footerText?: string;
  footerAction?: string;
  onFooterAction?: () => void;
};

export function SignInCard({
  title = 'Sign in to InBidz',
  subtitle = 'Use your InBidz account to buy, sell, and follow creators.',
  onSignIn,
  footerText = "Don't have an account?",
  footerAction = 'Create account',
  onFooterAction,
}: Props) {
  return (
    <View style={styles.wrap}>
      <GroupedSection title="Account">
        <View style={styles.inner}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.subtitle}>{subtitle}</Text>

          <Pressable style={styles.btnOutline} onPress={onSignIn}>
            <Text style={styles.btnOutlineText}>Sign in</Text>
          </Pressable>

          {footerAction && (
            <View style={styles.footer}>
              <Text style={styles.footerText}>
                {footerText}{' '}
                <Text style={styles.footerLink} onPress={onFooterAction ?? onSignIn}>
                  {footerAction}
                </Text>
              </Text>
            </View>
          )}
        </View>
      </GroupedSection>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    backgroundColor: colors.bg,
    paddingTop: sp(8),
  },
  inner: {
    padding: layout.cardPadding,
    gap: sp(8),
  },
  title: {
    fontFamily: fonts.sans,
    fontSize: fs(17),
    fontWeight: '600',
    color: colors.text,
  },
  subtitle: {
    fontFamily: fonts.sans,
    fontSize: fs(14),
    color: colors.textMuted,
    lineHeight: fs(20),
    marginBottom: sp(12),
  },
  btnOutline: shared.btnOutline,
  btnOutlineText: shared.btnOutlineText,
  footer: {
    marginTop: sp(16),
    alignItems: 'center',
  },
  footerText: {
    fontFamily: fonts.sans,
    fontSize: fs(13),
    color: colors.textMuted,
  },
  footerLink: {
    color: colors.accent,
    fontWeight: '500',
  },
});
