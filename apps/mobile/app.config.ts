import type { ConfigContext, ExpoConfig } from 'expo/config';

/** Share / universal-link host (must match API SHORT_URL_BASE domain). */
const STAGING_LINK_HOST = 'staging-api.inbidz.com';

const envConfig = {
  development: {
    apiUrl: 'https://api.inbidz.com',
    authLoginUrl: 'https://id.inbidz.com/login',
    linkHost: null as string | null,
  },
  staging: {
    apiUrl: 'https://staging-api.inbidz.com',
    authLoginUrl: 'https://staging-login.inbidz.com/login',
    linkHost: STAGING_LINK_HOST,
  },
  production: {
    apiUrl: 'https://api.inbidz.com',
    authLoginUrl: 'https://login.inbidz.com/login',
    linkHost: 'api.inbidz.com',
  },
} as const;

type AppEnv = keyof typeof envConfig;

function resolveEnv(): AppEnv {
  const raw = process.env.APP_ENV ?? 'development';
  if (raw in envConfig) return raw as AppEnv;
  return 'development';
}

export default ({ config }: ConfigContext): ExpoConfig => {
  const appEnv = resolveEnv();
  const urls = envConfig[appEnv];

  const associatedDomains = urls.linkHost ? [`applinks:${urls.linkHost}`] : [];

  const intentFilters =
    urls.linkHost ?
      [
        {
          action: 'VIEW',
          autoVerify: true,
          data: [
            {
              scheme: 'https',
              host: urls.linkHost,
              pathPrefix: '/p',
            },
          ],
          category: ['BROWSABLE', 'DEFAULT'],
        },
      ]
    : undefined;

  return {
    ...config,
    name: appEnv === 'staging' ? 'INBIDZ Staging' : (config.name ?? 'INBIDZ'),
    ios: {
      ...config.ios,
      associatedDomains,
    },
    android: {
      ...config.android,
      intentFilters,
    },
    extra: {
      ...config.extra,
      appEnv,
      apiUrl: process.env.EXPO_PUBLIC_API_URL ?? urls.apiUrl,
      authLoginUrl: process.env.EXPO_PUBLIC_AUTH_LOGIN_URL ?? urls.authLoginUrl,
      linkHost: urls.linkHost,
    },
  };
};
