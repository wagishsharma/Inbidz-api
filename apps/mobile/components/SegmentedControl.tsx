import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, fonts, fs, radii, shadowSm, sp } from '@/constants/theme';

type Option<T extends string> = { value: T; label: string };

type Props<T extends string> = {
  options: Option<T>[];
  value: T;
  onChange: (value: T) => void;
};

export function SegmentedControl<T extends string>({ options, value, onChange }: Props<T>) {
  return (
    <View style={styles.track}>
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <Pressable
            key={opt.value}
            style={[styles.segment, active && styles.segmentActive]}
            onPress={() => onChange(opt.value)}
          >
            <Text style={[styles.label, active && styles.labelActive]}>{opt.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    flexDirection: 'row',
    backgroundColor: colors.segmentBg,
    borderRadius: radii.sm,
    padding: sp(3),
    marginBottom: sp(20),
  },
  segment: {
    flex: 1,
    paddingVertical: sp(9),
    alignItems: 'center',
    borderRadius: radii.sm - 2,
  },
  segmentActive: {
    backgroundColor: colors.segmentActive,
    ...shadowSm,
  },
  label: {
    fontFamily: fonts.sans,
    fontSize: fs(13),
    fontWeight: '500',
    color: colors.textSecondary,
  },
  labelActive: {
    color: colors.text,
    fontWeight: '600',
  },
});
