import type { AccessTokenPayload } from '@/lib/auth-jwt';
import type { AppCreatorSnapshot } from '@/lib/creator-manager-context';

const ORG_URL = (
  process.env.CREATOR_MANAGER_ORG_URL ||
  process.env.NEXT_PUBLIC_ORG_URL ||
  'https://www.inbidz.org'
).replace(/\/$/, '');

export function appOnlyCoachPayload(snapshot: AppCreatorSnapshot) {
  if (!snapshot.shopSetupComplete) {
    return {
      primaryAction: {
        title: 'Set up your shop',
        why: 'When you are ready to sell, a quick shop setup unlocks commerce on posts.',
        category: 'monetize',
        ctaPath: '/shop/setup',
        ctaKind: 'internal' as const,
        actionKey: 'rule:shop_setup',
        completionMode: 'auto' as const,
      },
      hasUpdates: true,
    };
  }
  if (snapshot.postCount === 0) {
    return {
      primaryAction: {
        title: 'Share your first post',
        why: 'A first post helps people discover your work on the feed.',
        category: 'growth',
        ctaPath: '/(tabs)/create',
        ctaKind: 'internal' as const,
        actionKey: 'rule:first_post',
        completionMode: 'auto' as const,
      },
      hasUpdates: true,
    };
  }
  if (snapshot.commercePostCount === 0) {
    return {
      primaryAction: {
        title: 'Attach a product to a post',
        why: 'Turn a post into something people can buy.',
        category: 'monetize',
        ctaPath: '/(tabs)/create',
        ctaKind: 'internal' as const,
        actionKey: 'rule:commerce_post',
        completionMode: 'auto' as const,
      },
      hasUpdates: true,
    };
  }
  return {
    primaryAction: {
      title: 'Share your latest post',
      why: 'A gentle share helps the right people find your work.',
      category: 'visibility',
      ctaPath: '/(tabs)/create',
      ctaKind: 'internal' as const,
      actionKey: 'rule:share_post',
      completionMode: 'manual' as const,
    },
    hasUpdates: true,
  };
}

export async function proxyToOrg(
  path: string,
  options: {
    method?: string;
    accessToken: string;
    email?: string;
    appSnapshot: AppCreatorSnapshot;
    body?: Record<string, unknown>;
  }
): Promise<Response> {
  const url = `${ORG_URL}${path}`;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${options.accessToken}`,
  };
  const secret = process.env.CREATOR_MANAGER_APP_SECRET?.trim();
  if (secret) {
    headers['X-Creator-Manager-Secret'] = secret;
  }

  return fetch(url, {
    method: options.method ?? 'GET',
    headers,
    body: JSON.stringify({
      email: options.email,
      appSnapshot: options.appSnapshot,
      ...options.body,
    }),
  });
}

export function getTokenFromRequest(authHeader: string | null): string | null {
  if (!authHeader?.startsWith('Bearer ')) return null;
  return authHeader.slice(7).trim() || null;
}

export function emailFromPayload(payload: AccessTokenPayload): string | undefined {
  return payload.email;
}
