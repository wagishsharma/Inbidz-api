export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-jwt';
import { buildAppCreatorSnapshot } from '@/lib/creator-manager-context';
import {
  appOnlyCoachPayload,
  emailFromPayload,
  getTokenFromRequest,
  proxyToOrg,
} from '@/lib/creator-manager-proxy';

export async function POST(request: NextRequest) {
  const auth = await requireAuth(request);
  if (auth instanceof NextResponse) return auth;

  const body = await request.json().catch(() => ({}));
  const token =
    getTokenFromRequest(request.headers.get('authorization')) ||
    request.cookies.get('access_token')?.value;
  const appSnapshot = await buildAppCreatorSnapshot(auth.userId);

  if (token && body.actionKey) {
    try {
      const res = await proxyToOrg('/api/creator-manager/actions/complete', {
        method: 'POST',
        accessToken: token,
        email: emailFromPayload(auth.payload),
        appSnapshot,
        body: { actionKey: body.actionKey },
      });
      if (res.ok) {
        return NextResponse.json(await res.json());
      }
    } catch (e) {
      console.warn('[creator-manager/complete] org proxy failed', e);
    }
  }

  return NextResponse.json({ success: true, ...appOnlyCoachPayload(appSnapshot) });
}
