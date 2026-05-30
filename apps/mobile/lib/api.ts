import { API_URL } from './config';
import type { Post, ShareMomentType } from '@inbidz/shared';

type RequestOptions = {
  method?: string;
  body?: unknown;
  token?: string | null;
  headers?: Record<string, string>;
};

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...options.headers,
  };
  // Only send Bearer when we have a JWT-shaped token; otherwise rely on httpOnly cookie (web)
  if (options.token && options.token.split('.').length === 3) {
    headers.Authorization = `Bearer ${options.token}`;
  }

  const isWeb = typeof window !== 'undefined';

  const res = await fetch(`${API_URL}${path}`, {
    method: options.method ?? 'GET',
    headers,
    credentials: isWeb ? 'include' : 'omit',
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message =
      typeof data.message === 'string'
        ? data.message
        : typeof data.error === 'string'
          ? data.error
          : `Request failed: ${res.status}`;
    throw new Error(message);
  }
  return data as T;
}

export const api = {
  health: () => request<{ status: string }>('/api/health'),

  me: (token?: string | null) =>
    request<{ authenticated: boolean; user?: Record<string, unknown>; loginUrl?: string }>(
      '/api/auth/me',
      { token }
    ),

  exchangeAuthCode: (code: string) =>
    request<{
      accessToken: string;
      refreshToken: string;
      expiresIn: number;
      user: { id: string; email?: string; name?: string };
    }>('/auth/callback', { method: 'POST', body: { code } }),

  refreshAuth: (refreshToken: string) =>
    request<{ accessToken: string; refreshToken: string; expiresIn: number }>(
      '/api/auth/me',
      { method: 'POST', body: { refreshToken } }
    ),

  getFeed: (token?: string | null, limit = 20, offset = 0) =>
    request<{ posts: Post[] }>(`/api/posts?limit=${limit}&offset=${offset}`, { token }),

  getPost: (id: string, token?: string | null) =>
    request<{ post: Post }>(`/api/posts/${id}`, { token }),

  createPost: (token: string, body: unknown) =>
    request<{ post: Post; shareMoment?: { id: string; shortUrl: string; whatsappMessage: string } }>(
      '/api/posts',
      { method: 'POST', body, token }
    ),

  likePost: (token: string, id: string) =>
    request<{ liked: boolean }>(`/api/posts/${id}/like`, { method: 'POST', token }),

  placeBid: (token: string, id: string, amount: number) =>
    request<{ success: boolean; post: Post }>(`/api/posts/${id}/bid`, {
      method: 'POST',
      body: { amount },
      token,
    }),

  buyNow: (token: string, id: string, shippingAddress?: Record<string, string>) =>
    request<{
      orderId: string;
      razorpayOrderId?: string;
      razorpayKeyId?: string;
      devMode?: boolean;
      amount: number;
      currency: string;
    }>(`/api/posts/${id}/buy`, { method: 'POST', body: shippingAddress ? { shippingAddress } : {}, token }),

  confirmDevOrder: (token: string, orderId: string) =>
    request<{ success: boolean; status: string }>(`/api/orders/${orderId}/confirm-dev`, {
      method: 'POST',
      token,
    }),

  createOffer: (token: string, id: string, amount: number, message?: string) =>
    request<{ offerId: string; conversationId: string }>(`/api/posts/${id}/offers`, {
      method: 'POST',
      body: { amount, message },
      token,
    }),

  respondOffer: (
    token: string,
    offerId: string,
    action: 'accept' | 'decline' | 'counter',
    counterAmount?: number
  ) =>
    request<Record<string, unknown>>(`/api/offers/${offerId}`, {
      method: 'PATCH',
      body: { action, counterAmount },
      token,
    }),

  shopSetup: (token: string, shopName: string, shippingPolicy?: string) =>
    request<{ success: boolean }>('/api/shop/setup', {
      method: 'POST',
      body: { shopName, shippingPolicy },
      token,
    }),

  getShop: (token: string) =>
    request<{ setupComplete: boolean; shopName?: string }>('/api/shop/setup', { token }),

  follow: (token: string, userId: string) =>
    request<{ following: boolean }>('/api/follow', { method: 'POST', body: { userId }, token }),

  presignUpload: (token: string, filename: string, contentType: string) =>
    request<{
      uploadUrl: string | null;
      key: string | null;
      publicUrl: string | null;
      devFallback?: boolean;
      r2Error?: string;
    }>('/api/upload/presign', { method: 'POST', body: { filename, contentType }, token }),

  uploadR2: async (token: string, uri: string, filename: string, contentType: string) => {
    const blob = await fetch(uri).then((r) => r.blob());
    const form = new FormData();
    form.append('file', blob, filename);
    form.append('filename', filename);
    form.append('contentType', contentType);

    const headers: Record<string, string> = {};
    if (token && token.split('.').length === 3) {
      headers.Authorization = `Bearer ${token}`;
    }

    const res = await fetch(`${API_URL}/api/upload/r2`, {
      method: 'POST',
      headers,
      body: form,
      credentials: typeof window !== 'undefined' ? 'include' : 'omit',
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.error || 'R2 upload failed');
    }
    return data as { key: string; publicUrl: string };
  },

  uploadDev: async (token: string, uri: string, filename: string) => {
    const blob = await fetch(uri).then((r) => r.blob());
    const form = new FormData();
    form.append('file', blob, filename);
    form.append('filename', filename);

    const headers: Record<string, string> = {};
    if (token && token.split('.').length === 3) {
      headers.Authorization = `Bearer ${token}`;
    }

    const res = await fetch(`${API_URL}/api/upload/dev`, {
      method: 'POST',
      headers,
      body: form,
      credentials: typeof window !== 'undefined' ? 'include' : 'omit',
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.error || 'Upload failed');
    }
    return data as { key: string; publicUrl: string };
  },

  createShareMoment: (
    token: string,
    postId: string,
    momentType: ShareMomentType,
    metadata?: Record<string, unknown>
  ) =>
    request<{ moment: { id: string; shortUrl: string; whatsappMessage: string } }>(
      '/api/share',
      { method: 'POST', body: { postId, momentType, metadata }, token }
    ),

  markShared: (token: string, momentId: string, platform: string) =>
    request<{ success: boolean }>('/api/share', {
      method: 'POST',
      body: { momentId, platform },
      token,
    }),

  getShortLink: (postId: string, token?: string | null) =>
    request<{ shortUrl: string }>(`/api/share?postId=${postId}`, { token }),

  resolveShortCode: (code: string) =>
    request<{ postId: string; post: Post }>(`/api/p/${code}`),

  getOnboarding: (token: string) =>
    request<{
      hasPublishedPost: boolean;
      hasPurchased: boolean;
      shopSetupComplete: boolean;
      commercePostViews: number;
      suggestSellBanner: boolean;
    }>('/api/onboarding', { token }),

  trackOnboarding: (token: string, eventType: string, metadata?: Record<string, unknown>) =>
    request<{ success: boolean }>('/api/onboarding', {
      method: 'POST',
      body: { eventType, metadata },
      token,
    }),
};
