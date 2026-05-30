import Constants from 'expo-constants';
import * as Linking from 'expo-linking';
import { Platform } from 'react-native';

export const API_URL =
  Constants.expoConfig?.extra?.apiUrl ??
  process.env.EXPO_PUBLIC_API_URL ??
  'http://localhost:3001';

export const AUTH_LOGIN_URL =
  Constants.expoConfig?.extra?.authLoginUrl ??
  process.env.EXPO_PUBLIC_AUTH_LOGIN_URL ??
  'http://localhost:3002';

/** Login form is at /login — hitting the root drops return_url on redirect. */
export function getLoginPageUrl(): string {
  const base = AUTH_LOGIN_URL.replace(/\/$/, '').replace(/\/login$/, '');
  return `${base}/login`;
}

export const APP_SCHEME = 'inbidz';

/** Callback URL sent to login.inbidz — must match what the login server redirects to. */
export function getAuthCallbackUrl(): string {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    return `${window.location.origin}/auth/callback`;
  }
  return Linking.createURL('auth/callback');
}
