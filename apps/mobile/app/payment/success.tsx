import { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { colors, shared } from '@/constants/theme';

/** Deep-link landing after Razorpay checkout (openAuthSessionAsync return URL). */
export default function PaymentSuccessScreen() {
  const { orderId } = useLocalSearchParams<{ orderId?: string }>();

  useEffect(() => {
    const t = setTimeout(() => router.back(), 300);
    return () => clearTimeout(t);
  }, []);

  return (
    <View style={styles.center}>
      <ActivityIndicator color={colors.accent} />
    </View>
  );
}

const styles = StyleSheet.create({
  center: shared.screenCenter,
});
