import * as jose from 'jose';
import { NextRequest, NextResponse } from 'next/server';

export type AccessTokenPayload = {
  sub: string;
  email?: string;
  name?: string;
  role?: string;
  /** Set by login.inbidz.com when the user has a profile photo */
  profile_photo_url?: string;
  iat: number;
  exp: number;
  [key: string]: unknown;
};

export function getAvatarUrlFromPayload(payload: AccessTokenPayload): string | null {
  const candidates = [
    payload.profile_photo_url,
    payload.avatar_url,
    payload.picture,
    payload.avatarUrl,
  ];
  for (const value of candidates) {
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return null;
}

function getSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error('JWT_SECRET must be set and at least 32 characters');
  }
  return new TextEncoder().encode(secret);
}

function isJwtFormat(token: string): boolean {
  const parts = token.split('.');
  return parts.length === 3 && parts.every((part) => part.length > 0);
}

export async function verifyAccessToken(token: string): Promise<AccessTokenPayload | null> {
  const trimmed = token.trim();
  if (!trimmed || !isJwtFormat(trimmed)) {
    return null;
  }

  try {
    const secret = getSecret();
    const result = await jose.jwtVerify(trimmed, secret);
    const p = result.payload;
    const profile_photo_url =
      typeof p.profile_photo_url === 'string' ? p.profile_photo_url : undefined;
    return {
      sub: p.sub as string,
      email: (p.email as string) ?? undefined,
      name: (p.name as string) ?? undefined,
      role: (p.role as string) ?? undefined,
      profile_photo_url,
      iat: (p.iat as number) ?? 0,
      exp: (p.exp as number) ?? 0,
      ...p,
    };
  } catch {
    return null;
  }
}

export function getLoginAppUrl(): string {
  const url = process.env.AUTH_LOGIN_APP_URL?.trim();
  if (!url) throw new Error('AUTH_LOGIN_APP_URL is not set');
  return url.replace(/\/$/, '').replace(/\/login$/, '');
}

/** Login form lives at /login — root URL redirects and drops query params. */
export function getLoginPageUrl(): string {
  return `${getLoginAppUrl()}/login`;
}

export function isCentralAuthEnabled(): boolean {
  return Boolean(process.env.AUTH_LOGIN_APP_URL?.trim() && process.env.JWT_SECRET?.trim());
}

export async function exchangeCodeForTokens(code: string): Promise<{
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  refreshExpiresAt: string;
} | null> {
  const base = getLoginAppUrl();
  const res = await fetch(`${base}/api/auth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code: code.trim() }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    console.error('[exchangeCodeForTokens] failed', res.status, err);
    return null;
  }
  const data = await res.json();
  if (!data.accessToken || !data.refreshToken) return null;
  return {
    accessToken: data.accessToken,
    refreshToken: data.refreshToken,
    expiresIn: data.expiresIn ?? 900,
    refreshExpiresAt: data.refreshExpiresAt ?? '',
  };
}

export async function refreshTokens(refreshToken: string): Promise<{
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
} | null> {
  const base = getLoginAppUrl();
  const res = await fetch(`${base}/api/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  });
  if (!res.ok) return null;
  const data = await res.json();
  if (!data.accessToken || !data.refreshToken) return null;
  return {
    accessToken: data.accessToken,
    refreshToken: data.refreshToken,
    expiresIn: data.expiresIn ?? 900,
  };
}

export function buildLoginRedirectUrl(returnUrl: string): string {
  return `${getLoginPageUrl()}?return_url=${encodeURIComponent(returnUrl)}`;
}

export type AuthResult = { userId: string; payload: AccessTokenPayload };

async function resolveAuth(request: NextRequest): Promise<AuthResult | null> {
  const authHeader = request.headers.get('authorization');
  const bearer = authHeader?.startsWith('Bearer ') ? authHeader.slice(7).trim() : null;
  const cookieToken = request.cookies.get('access_token')?.value ?? null;

  // Try Bearer first, then fall back to cookie (web login sets httpOnly cookie on API origin)
  for (const token of [bearer, cookieToken]) {
    if (!token) continue;
    const payload = await verifyAccessToken(token);
    if (payload?.sub) {
      return { userId: payload.sub, payload };
    }
  }
  return null;
}

export async function requireAuth(request: NextRequest): Promise<AuthResult | NextResponse> {
  const auth = await resolveAuth(request);
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  return auth;
}

export async function optionalAuth(request: NextRequest): Promise<AuthResult | null> {
  return resolveAuth(request);
}
