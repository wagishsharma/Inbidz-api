import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import * as SecureStore from 'expo-secure-store';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { router } from 'expo-router';
import { Platform } from 'react-native';
import { api } from './api';
import { getAuthCallbackUrl, getLoginPageUrl } from './config';

WebBrowser.maybeCompleteAuthSession();

const ACCESS_KEY = 'inbidz_access_token';
const REFRESH_KEY = 'inbidz_refresh_token';

/** One-time auth codes must only be exchanged once (React Strict Mode runs effects twice). */
const exchangingCodes = new Set<string>();

function markCodeExchanged(code: string): void {
  if (Platform.OS === 'web' && typeof sessionStorage !== 'undefined') {
    sessionStorage.setItem(`inbidz_exchanged:${code}`, '1');
  }
}

function wasCodeExchanged(code: string): boolean {
  if (Platform.OS === 'web' && typeof sessionStorage !== 'undefined') {
    return sessionStorage.getItem(`inbidz_exchanged:${code}`) === '1';
  }
  return false;
}

type AuthUser = {
  id: string;
  email?: string;
  name?: string;
  username?: string;
  displayName?: string;
  avatarUrl?: string;
  shopSetupComplete?: boolean;
  referralCode?: string;
};

type AuthContextValue = {
  user: AuthUser | null;
  accessToken: string | null;
  loading: boolean;
  login: () => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  handleAuthCallback: (code: string) => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

async function getStored(key: string): Promise<string | null> {
  if (Platform.OS === 'web') {
    return typeof localStorage !== 'undefined' ? localStorage.getItem(key) : null;
  }
  return SecureStore.getItemAsync(key);
}

async function setStored(key: string, value: string): Promise<void> {
  if (Platform.OS === 'web') {
    localStorage.setItem(key, value);
    return;
  }
  await SecureStore.setItemAsync(key, value);
}

async function deleteStored(key: string): Promise<void> {
  if (Platform.OS === 'web') {
    localStorage.removeItem(key);
    return;
  }
  await SecureStore.deleteItemAsync(key);
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = useCallback(async (token?: string | null) => {
    const t = token ?? accessToken;

    try {
      const res = await api.me(t ?? undefined);
      if (res.authenticated && res.user) {
        setUser(res.user as AuthUser);
        return;
      }
    } catch {
      // fall through to refresh / logout
    }

    // Access token invalid — try refresh
    const refresh = await getStored(REFRESH_KEY);
    if (refresh) {
      try {
        const tokens = await api.refreshAuth(refresh);
        await setStored(ACCESS_KEY, tokens.accessToken);
        await setStored(REFRESH_KEY, tokens.refreshToken);
        setAccessToken(tokens.accessToken);
        const res = await api.me(tokens.accessToken);
        if (res.authenticated && res.user) {
          setUser(res.user as AuthUser);
          return;
        }
      } catch {
        // refresh failed
      }
    }

    await deleteStored(ACCESS_KEY);
    await deleteStored(REFRESH_KEY);
    setAccessToken(null);
    setUser(null);
  }, [accessToken]);

  const handleAuthCallback = useCallback(async (code: string) => {
    const normalized = (Array.isArray(code) ? code[0] : code).trim();
    if (!normalized) return;

    if (exchangingCodes.has(normalized) || wasCodeExchanged(normalized)) {
      return;
    }
    exchangingCodes.add(normalized);

    try {
      const tokens = await api.exchangeAuthCode(normalized);
      markCodeExchanged(normalized);
      await setStored(ACCESS_KEY, tokens.accessToken);
      await setStored(REFRESH_KEY, tokens.refreshToken);
      setAccessToken(tokens.accessToken);
      setUser({
        id: tokens.user.id,
        email: tokens.user.email,
        name: tokens.user.name,
      });
      await refreshUser(tokens.accessToken);
    } finally {
      exchangingCodes.delete(normalized);
    }
  }, [refreshUser]);

  const login = useCallback(async () => {
    const callbackUrl = getAuthCallbackUrl();
    const loginUrl = `${getLoginPageUrl()}?return_url=${encodeURIComponent(callbackUrl)}`;

    if (Platform.OS === 'web') {
      window.location.href = loginUrl;
      return;
    }

    try {
      const result = await WebBrowser.openAuthSessionAsync(loginUrl, callbackUrl, {
        preferEphemeralSession: true,
        showInRecents: false,
      });

      if (result.type === 'success' && result.url) {
        const parsed = Linking.parse(result.url);
        const code = parsed.queryParams?.code;
        if (typeof code === 'string') {
          await handleAuthCallback(code);
          router.replace('/(tabs)');
        }
      }
    } finally {
      WebBrowser.coolDownAsync();
    }
  }, [handleAuthCallback]);

  const logout = useCallback(async () => {
    await deleteStored(ACCESS_KEY);
    await deleteStored(REFRESH_KEY);
    setAccessToken(null);
    setUser(null);
  }, []);

  useEffect(() => {
    (async () => {
      const token = await getStored(ACCESS_KEY);
      if (token) {
        setAccessToken(token);
        await refreshUser(token);
      }
      setLoading(false);
    })();
  }, [refreshUser]);

  useEffect(() => {
    const sub = Linking.addEventListener('url', async ({ url }) => {
      const parsed = Linking.parse(url);
      const isAuthCallback =
        parsed.path === 'auth/callback' ||
        parsed.path?.endsWith('/auth/callback') ||
        parsed.hostname === 'auth';

      if (!isAuthCallback) return;

      const code = parsed.queryParams?.code;
      if (typeof code === 'string') {
        await handleAuthCallback(code);
        router.replace('/(tabs)');
      }
    });
    return () => sub.remove();
  }, [handleAuthCallback]);

  const value = useMemo(
    () => ({ user, accessToken, loading, login, logout, refreshUser, handleAuthCallback }),
    [user, accessToken, loading, login, logout, refreshUser, handleAuthCallback]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
