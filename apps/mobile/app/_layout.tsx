import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from '@/lib/auth';
import { WebShell } from '@/components/WebShell';
import { colors } from '@/constants/theme';

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <StatusBar style="dark" />
        <WebShell style={{ flex: 1 }}>
          <Stack
            screenOptions={{
              headerStyle: { backgroundColor: colors.surface },
              headerTintColor: colors.text,
              headerTitleStyle: { fontWeight: '600', fontSize: 15 },
              headerShadowVisible: false,
              contentStyle: { backgroundColor: colors.bg },
            }}
          >
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="post/[id]" options={{ title: '' }} />
            <Stack.Screen name="auth/callback" options={{ title: 'Signing in...', headerShown: false }} />
            <Stack.Screen name="p/[code]" options={{ title: '', headerShown: false }} />
            <Stack.Screen name="shop/setup" options={{ title: 'Shop', presentation: 'modal' }} />
          </Stack>
        </WebShell>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
