import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { colors, fonts, fs, shared, sp } from '@/constants/theme';

/** User closed Razorpay without paying. */
export default function PaymentCancelScreen() {
  useEffect(() => {
    const t = setTimeout(() => {
      if (router.canGoBack()) {
        router.back();
      } else {
        router.replace('/(tabs)');
      }
    }, 300);
    return () => clearTimeout(t);
  }, []);

  return (
    <View style={styles.center}>
      <Text style={styles.title}>Checkout cancelled</Text>
      <Text style={styles.text}>No charge was made.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    ...shared.screenCenter,
    gap: sp(8),
    padding: sp(24),
  },
  title: {
    fontFamily: fonts.sans,
    fontSize: fs(17),
    fontWeight: '600',
    color: colors.text,
  },
  text: {
    fontFamily: fonts.sans,
    fontSize: fs(14),
    color: colors.textSecondary,
    textAlign: 'center',
  },
});
