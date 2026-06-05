export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { optionalAuth } from '@/lib/auth-jwt';
import { buildAppCreatorSnapshot } from '@/lib/creator-manager-context';
import {
  appOnlyCoachPayload,
  emailFromPayload,
  getTokenFromRequest,
  proxyToOrg,
} from '@/lib/creator-manager-proxy';

export async function GET(request: NextRequest) {
  const auth = await optionalAuth(request);
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const appSnapshot = await buildAppCreatorSnapshot(auth.userId);
  const token =
    getTokenFromRequest(request.headers.get('authorization')) ||
    request.cookies.get('access_token')?.value;

  if (!token) {
    return NextResponse.json({ success: true, ...appOnlyCoachPayload(appSnapshot) });
  }

  try {
    const res = await proxyToOrg('/api/creator-manager/coach', {
      accessToken: token,
      email: emailFromPayload(auth.payload),
      appSnapshot,
      method: 'POST',
    });
    if (res.ok) {
      const data = await res.json();
      return NextResponse.json(data);
    }
  } catch (e) {
    console.warn('[creator-manager/coach] org proxy failed', e);
  }

  return NextResponse.json({ success: true, ...appOnlyCoachPayload(appSnapshot) });
}

export async function POST(request: NextRequest) {
  return GET(request);
}
