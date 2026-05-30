import { StyleSheet, Text, View, type ViewProps } from 'react-native';
import { colors, fonts, fs, layout, radii, sp } from '@/constants/theme';

type Props = ViewProps & {
  title?: string;
  action?: string;
  onAction?: () => void;
};

export function GroupedSection({ title, action, onAction, children, style, ...rest }: Props) {
  return (
    <View style={[styles.section, style]} {...rest}>
      {title ? (
        <View style={styles.labelRow}>
          <Text style={styles.label}>{title}</Text>
          {action ? (
            <Text style={styles.action} onPress={onAction}>
              {action}
            </Text>
          ) : null}
        </View>
      ) : null}
      <View style={styles.group}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginBottom: sp(20),
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: layout.contentPadding,
    marginBottom: sp(8),
  },
  label: {
    fontFamily: fonts.sans,
    fontSize: fs(13),
    fontWeight: '600',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  action: {
    fontFamily: fonts.sans,
    fontSize: fs(13),
    fontWeight: '500',
    color: colors.textMuted,
  },
  group: {
    marginHorizontal: layout.contentPadding,
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
});
