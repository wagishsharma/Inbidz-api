import { StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';
import { colors, fonts, fs, shared, sp } from '@/constants/theme';
import { numericKeyboardAccessoryProps } from '@/components/KeyboardDoneAccessory';

type Props = TextInputProps & {
  label: string;
};

export function Field({ label, style, keyboardType, ...rest }: Props) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={[styles.input, style]}
        placeholderTextColor={colors.textMuted}
        keyboardType={keyboardType}
        returnKeyType={keyboardType === 'default' || !keyboardType ? 'done' : undefined}
        blurOnSubmit
        {...numericKeyboardAccessoryProps(keyboardType)}
        {...rest}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginBottom: sp(16),
    width: '100%',
  },
  label: shared.fieldLabel,
  input: shared.input,
});
