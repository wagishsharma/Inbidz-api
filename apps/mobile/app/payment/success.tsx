import { useEffect } from 'react';
import { ActivityIndicator, Platform, StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { colors, fonts, fs, shared, sp } from '@/constants/theme';
import { showAlert } from '@/lib/alert';

/** Landing after Razorpay checkout completes (web redirect or native auth session). */
export default function PaymentSuccessScreen() {
  const { orderId } = useLocalSearchParams<{ orderId?: string }>();

  useEffect(() => {
    if (Platform.OS === 'web') {
      showAlert('Paid!', 'Your order is confirmed.');
    }
    const t = setTimeout(() => {
      if (router.canGoBack()) {
        router.back();
      } else {
        router.replace('/(tabs)');
      }
    }, Platform.OS === 'web' ? 400 : 100);
    return () => clearTimeout(t);
  }, [orderId]);

  return (
    <View style={styles.center}>
      <ActivityIndicator color={colors.accent} />
      <Text style={styles.text}>Confirming your order…</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    ...shared.screenCenter,
    gap: sp(12),
  },
  text: {
    fontFamily: fonts.sans,
    fontSize: fs(14),
    color: colors.textSecondary,
  },
});
