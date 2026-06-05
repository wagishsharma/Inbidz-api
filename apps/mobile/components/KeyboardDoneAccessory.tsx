import {
  InputAccessoryView,
  Keyboard,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { colors, fonts, fs, sp } from '@/constants/theme';

export const KEYBOARD_DONE_ACCESSORY_ID = 'keyboard-done-accessory';

const NUMERIC_KEYBOARD_TYPES = new Set([
  'numeric',
  'number-pad',
  'decimal-pad',
  'phone-pad',
]);

/** Render once near the app root (iOS only). */
export function KeyboardDoneAccessory() {
  if (Platform.OS !== 'ios') return null;

  return (
    <InputAccessoryView nativeID={KEYBOARD_DONE_ACCESSORY_ID}>
      <View style={styles.bar}>
        <Pressable onPress={() => Keyboard.dismiss()} hitSlop={12}>
          <Text style={styles.done}>Done</Text>
        </Pressable>
      </View>
    </InputAccessoryView>
  );
}

export function numericKeyboardAccessoryProps(keyboardType?: string) {
  if (Platform.OS !== 'ios') return {};
  if (!keyboardType || !NUMERIC_KEYBOARD_TYPES.has(keyboardType)) return {};
  return { inputAccessoryViewID: KEYBOARD_DONE_ACCESSORY_ID };
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    backgroundColor: colors.bgMuted,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    paddingHorizontal: sp(16),
    paddingVertical: sp(10),
  },
  done: {
    fontFamily: fonts.sans,
    fontSize: fs(16),
    fontWeight: '600',
    color: colors.accent,
  },
});
