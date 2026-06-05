import { API_URL } from './config';
import type { FeedMode, Post, PostComment, ShareMomentType, UserProfile } from '@inbidz/shared';
import { uploadDevFile, uploadR2File } from './upload-media';

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

  getFeed: (
    token?: string | null,
    limit = 20,
    offset = 0,
    feed: FeedMode = 'for_you'
  ) =>
    request<{ posts: Post[] }>(
      `/api/posts?limit=${limit}&offset=${offset}&feed=${feed}`,
      { token }
    ),

  getUser: (userId: string, token?: string | null) =>
    request<{ user: UserProfile & { postCount: number } }>(`/api/users/${userId}`, { token }),

  getUserPosts: (userId: string, token?: string | null, limit = 30, offset = 0) =>
    request<{ posts: Post[] }>(
      `/api/users/${userId}/posts?limit=${limit}&offset=${offset}`,
      { token }
    ),

  getPost: (id: string, token?: string | null) =>
    request<{ post: Post }>(`/api/posts/${id}`, { token }),

  createPost: (token: string, body: unknown) =>
    request<{ post: Post; shareMoment?: { id: string; shortUrl: string; whatsappMessage: string } }>(
      '/api/posts',
      { method: 'POST', body, token }
    ),

  likePost: (token: string, id: string) =>
    request<{ liked: boolean }>(`/api/posts/${id}/like`, { method: 'POST', token }),

  getComments: (postId: string, limit = 50, offset = 0) =>
    request<{ comments: PostComment[] }>(
      `/api/posts/${postId}/comments?limit=${limit}&offset=${offset}`
    ),

  createComment: (token: string, postId: string, body: string) =>
    request<{ comment: PostComment }>(`/api/posts/${postId}/comments`, {
      method: 'POST',
      body: { body },
      token,
    }),

  deleteComment: (token: string, postId: string, commentId: string) =>
    request<{ success: boolean }>(
      `/api/posts/${postId}/comments?commentId=${encodeURIComponent(commentId)}`,
      { method: 'DELETE', token }
    ),

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
      checkoutSession?: string;
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

  uploadR2: (token: string, uri: string, filename: string, contentType: string) =>
    uploadR2File(token, uri, filename, contentType),

  uploadDev: (token: string, uri: string, filename: string) => {
    const contentType = filename.endsWith('.mp4') ? 'video/mp4' : 'image/jpeg';
    return uploadDevFile(token, uri, filename, contentType);
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

  getGrowthCoach: (token?: string | null) =>
    request<{
      success: boolean;
      primaryAction: {
        title: string;
        why: string;
        ctaPath: string;
        ctaKind: string;
        actionKey: string;
        completionMode: string;
      };
      hasUpdates: boolean;
    }>('/api/creator-manager/coach', { token }),

  getGrowthBrief: (token?: string | null, refresh = false) =>
    request<{ success: boolean; brief: Record<string, unknown> }>(
      refresh ? '/api/creator-manager/brief?refresh=1' : '/api/creator-manager/brief',
      { method: refresh ? 'POST' : 'GET', token }
    ),

  completeGrowthAction: (token: string, actionKey: string) =>
    request<{ success: boolean; primaryAction?: Record<string, unknown> }>(
      '/api/creator-manager/actions/complete',
      { method: 'POST', body: { actionKey }, token }
    ),

  saveGrowthPreferences: (
    token: string,
    body: { creatorGoals?: string[]; instagramUsername?: string; dismissedIntentPrompt?: boolean }
  ) =>
    request<{ success: boolean; brief?: Record<string, unknown> }>(
      '/api/creator-manager/preferences',
      { method: 'PATCH', body, token }
    ),
};
