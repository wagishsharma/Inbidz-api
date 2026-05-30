import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useAuth } from '@/lib/auth';
import { Card } from '@/components/Card';
import { colors, fonts, fs, shared, sp } from '@/constants/theme';

export default function AuthCallbackScreen() {
  const params = useLocalSearchParams<{ code?: string | string[]; auth_error?: string }>();
  const code = Array.isArray(params.code) ? params.code[0] : params.code;
  const { handleAuthCallback, login } = useAuth();
  const [error, setError] = useState<string | null>(params.auth_error ?? null);
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    (async () => {
      if (!code) {
        if (!error) setError('missing_code');
        return;
      }

      if (
        Platform.OS === 'web' &&
        typeof sessionStorage !== 'undefined' &&
        sessionStorage.getItem(`inbidz_exchanged:${code}`) === '1'
      ) {
        router.replace('/(tabs)');
        return;
      }

      try {
        await handleAuthCallback(code);
        router.replace('/(tabs)');
      } catch (e) {
        setError(e instanceof Error ? e.message : 'invalid_code');
      }
    })();
  }, [code, error, handleAuthCallback]);

  if (error) {
    return (
      <View style={styles.center}>
        <Card style={styles.card}>
          <Text style={styles.title}>Sign-in failed</Text>
          <Text style={styles.message}>
            {error === 'invalid_code'
              ? 'This sign-in link was already used or expired. Please try again.'
              : error}
          </Text>
          <Pressable style={styles.btn} onPress={() => login()}>
            <Text style={styles.btnText}>Try again</Text>
          </Pressable>
        </Card>
      </View>
    );
  }

  return (
    <View style={styles.center}>
      <Card style={styles.card}>
        <ActivityIndicator color={colors.accent} />
        <Text style={styles.loading}>Signing you in…</Text>
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  center: shared.screenCenter,
  card: { width: '100%', maxWidth: 400, alignItems: 'center' },
  loading: {
    fontFamily: fonts.sans,
    color: colors.textSecondary,
    marginTop: sp(16),
    fontSize: fs(14),
  },
  title: shared.h1,
  message: {
    ...shared.subtitle,
    textAlign: 'center',
    marginBottom: sp(24),
  },
  btn: shared.btnPrimary,
  btnText: shared.btnPrimaryText,
});
