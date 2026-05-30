import { StyleSheet, View, type ViewProps } from 'react-native';
import { colors, layout, radii } from '@/constants/theme';

type Props = ViewProps & {
  padded?: boolean;
  /** Flat grouped card (default) or standalone with border */
  grouped?: boolean;
};

export function Card({ children, style, padded = true, grouped = false, ...rest }: Props) {
  return (
    <View style={[styles.card, grouped && styles.grouped, padded && styles.padded, style]} {...rest}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  grouped: {
    marginHorizontal: layout.contentPadding,
  },
  padded: {
    padding: layout.cardPadding,
  },
});
