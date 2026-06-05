export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import {
  buildLoginRedirectUrl,
  isCentralAuthEnabled,
  optionalAuth,
  refreshTokens,
  verifyAccessToken,
} from '@/lib/auth-jwt';
import { executeQuery } from '@/lib/database';
import { mapProfile, PROFILE_SELECT } from '@/lib/post-mapper';
import { upsertProfileFromJwt } from '@/lib/auth-user-sync';

export async function GET(request: NextRequest) {
  const auth = await optionalAuth(request);
  if (!auth) {
    if (isCentralAuthEnabled()) {
      const appUrl = process.env.APP_PUBLIC_URL || 'http://localhost:8081';
      return NextResponse.json({
        authenticated: false,
        loginUrl: buildLoginRedirectUrl(`${appUrl}/auth/callback`),
      });
    }
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }

  try {
    await upsertProfileFromJwt(auth.payload);
  } catch (e) {
    console.warn('[auth/me] profile sync failed:', e);
  }

  const profiles = await executeQuery<
    {
      user_id: string;
      username: string;
      display_name: string;
      avatar_url: string | null;
      bio: string | null;
      is_seller: number;
      shop_name: string | null;
      shop_setup_complete: number;
      referral_code: string | null;
    }[]
  >(`SELECT ${PROFILE_SELECT.replace('p.', '')}, p.shop_setup_complete, p.referral_code FROM app_profiles p WHERE user_id = ?`, [
    auth.userId,
  ]);

  const profile = profiles[0];
  const followerRows = await executeQuery<{ c: number }[]>(
    'SELECT COUNT(*) as c FROM app_follows WHERE following_id = ?',
    [auth.userId]
  );
  const followingRows = await executeQuery<{ c: number }[]>(
    'SELECT COUNT(*) as c FROM app_follows WHERE follower_id = ?',
    [auth.userId]
  );

  return NextResponse.json({
    authenticated: true,
    user: {
      ...mapProfile(
        profile ?? {
          user_id: auth.userId,
          username: 'user',
          display_name: auth.payload.name ?? 'User',
          avatar_url: null,
          bio: null,
          is_seller: 0,
          shop_name: null,
        },
        followerRows[0]?.c ?? 0,
        followingRows[0]?.c ?? 0
      ),
      email: auth.payload.email,
      shopSetupComplete: Boolean(profile?.shop_setup_complete),
      referralCode: profile?.referral_code,
    },
  });
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const refreshToken = body.refreshToken as string | undefined;
  if (!refreshToken) {
    return NextResponse.json({ error: 'refreshToken required' }, { status: 400 });
  }

  const tokens = await refreshTokens(refreshToken);
  if (!tokens) {
    return NextResponse.json({ error: 'invalid refresh token' }, { status: 401 });
  }

  const payload = await verifyAccessToken(tokens.accessToken);
  return NextResponse.json({
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken,
    expiresIn: tokens.expiresIn,
    user: payload
      ? { id: payload.sub, email: payload.email, name: payload.name }
      : null,
  });
}
