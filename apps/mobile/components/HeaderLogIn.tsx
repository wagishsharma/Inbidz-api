import { Pressable, StyleSheet, Text } from 'react-native';
import { useAuth } from '@/lib/auth';
import { colors, fonts, fs, radii, sp } from '@/constants/theme';

export function HeaderLogIn() {
  const { user, login } = useAuth();
  if (user) return null;

  return (
    <Pressable style={styles.btn} onPress={login} hitSlop={8}>
      <Text style={styles.text}>Log in</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderStrong,
    borderRadius: radii.sm,
    paddingVertical: sp(6),
    paddingHorizontal: sp(14),
    backgroundColor: colors.surface,
    marginRight: sp(4),
  },
  text: {
    fontFamily: fonts.sans,
    fontSize: fs(14),
    fontWeight: '500',
    color: colors.text,
  },
});
