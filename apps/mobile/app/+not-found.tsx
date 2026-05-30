import { Link, Stack } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { colors, fonts, fs, shared } from '@/constants/theme';

export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen options={{ title: 'Not found' }} />
      <View style={styles.container}>
        <Text style={styles.title}>Page not found</Text>
        <Link href="/" style={styles.link}>
          <Text style={styles.linkText}>Go home</Text>
        </Link>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: shared.screenCenter,
  title: {
    fontFamily: fonts.sans,
    fontSize: fs(18),
    fontWeight: '600',
    color: colors.text,
  },
  link: { marginTop: 16 },
  linkText: {
    fontFamily: fonts.sans,
    color: colors.textSecondary,
    fontSize: fs(14),
    textDecorationLine: 'underline',
  },
});
