export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import {
  exchangeCodeForTokens,
  isCentralAuthEnabled,
  verifyAccessToken,
  buildLoginRedirectUrl,
} from '@/lib/auth-jwt';
import { upsertProfileFromJwt } from '@/lib/auth-user-sync';

export async function GET(request: NextRequest) {
  if (!isCentralAuthEnabled()) {
    return NextResponse.redirect(new URL('/', request.url), 302);
  }

  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const error = searchParams.get('auth_error');
  const nextParam = searchParams.get('next');

  if (error) {
    const url = new URL('/', request.url);
    url.searchParams.set('auth_error', error);
    return NextResponse.redirect(url, 302);
  }

  if (!code) {
    const url = new URL('/', request.url);
    url.searchParams.set('auth_error', 'missing_code');
    return NextResponse.redirect(url, 302);
  }

  const tokens = await exchangeCodeForTokens(code);
  if (!tokens) {
    const url = new URL('/', request.url);
    url.searchParams.set('auth_error', 'invalid_code');
    return NextResponse.redirect(url, 302);
  }

  const payload = await verifyAccessToken(tokens.accessToken);
  if (payload) {
    try {
      await upsertProfileFromJwt(payload);
    } catch (e) {
      console.error('[auth/callback] profile sync failed:', e);
      const url = new URL('/', request.url);
      url.searchParams.set('auth_error', 'sync_failed');
      return NextResponse.redirect(url, 302);
    }
  }

  const postLoginPath =
    nextParam &&
    nextParam.startsWith('/') &&
    !nextParam.startsWith('//') &&
    !nextParam.includes('\\')
      ? nextParam
      : '/feed';

  const redirect = NextResponse.redirect(new URL(postLoginPath, request.url), 302);
  const isProd = process.env.NODE_ENV === 'production';

  redirect.cookies.set('access_token', tokens.accessToken, {
    httpOnly: true,
    secure: isProd,
    sameSite: 'lax',
    maxAge: tokens.expiresIn,
    path: '/',
  });

  redirect.cookies.set('refresh_token', tokens.refreshToken, {
    httpOnly: true,
    secure: isProd,
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60,
    path: '/',
  });

  return redirect;
}

export async function POST(request: NextRequest) {
  if (!isCentralAuthEnabled()) {
    return NextResponse.json({ error: 'Central auth disabled' }, { status: 503 });
  }

  const body = await request.json().catch(() => ({}));
  const code = body.code as string | undefined;
  const returnUrl = (body.returnUrl as string) || `${process.env.APP_PUBLIC_URL}/auth/callback`;

  if (!code) {
    const loginUrl = buildLoginRedirectUrl(returnUrl);
    return NextResponse.json({ loginUrl });
  }

  const tokens = await exchangeCodeForTokens(code);
  if (!tokens) {
    return NextResponse.json(
      {
        error: 'invalid_code',
        message: 'Code expired or already used. Please sign in again.',
      },
      { status: 401 }
    );
  }

  const payload = await verifyAccessToken(tokens.accessToken);
  if (payload) {
    await upsertProfileFromJwt(payload);
  }

  return NextResponse.json({
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken,
    expiresIn: tokens.expiresIn,
    user: payload
      ? { id: payload.sub, email: payload.email, name: payload.name, role: payload.role }
      : null,
  });
}
