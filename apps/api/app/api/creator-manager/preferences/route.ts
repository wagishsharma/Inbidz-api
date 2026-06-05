export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-jwt';
import { buildAppCreatorSnapshot } from '@/lib/creator-manager-context';
import { emailFromPayload, getTokenFromRequest, proxyToOrg } from '@/lib/creator-manager-proxy';

export async function PATCH(request: NextRequest) {
  const auth = await requireAuth(request);
  if (auth instanceof NextResponse) return auth;

  const body = await request.json().catch(() => ({}));
  const token =
    getTokenFromRequest(request.headers.get('authorization')) ||
    request.cookies.get('access_token')?.value;
  const appSnapshot = await buildAppCreatorSnapshot(auth.userId);

  if (token) {
    try {
      const res = await fetch(
        `${process.env.CREATOR_MANAGER_ORG_URL || 'https://www.inbidz.org'}/api/creator-manager/preferences`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(body),
        }
      );
      if (res.ok) {
        return NextResponse.json(await res.json());
      }
    } catch (e) {
      console.warn('[creator-manager/preferences] org proxy failed', e);
    }
  }

  return NextResponse.json({
    success: true,
    brief: {
      needsIntentPrompt: false,
      creatorGoals: body.creatorGoals ?? ['explore'],
      generatedAt: new Date().toISOString(),
    },
  });
}
