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

function appOnlyBrief(snapshot: Awaited<ReturnType<typeof buildAppCreatorSnapshot>>) {
  const coach = appOnlyCoachPayload(snapshot);
  return {
    success: true,
    brief: {
      primaryAction: coach.primaryAction,
      portfolioImprovements: [],
      growthSuggestions: [
        {
          title: 'Post consistently',
          detail: 'Small, steady posts build momentum on the feed.',
          priority: 'medium' as const,
        },
      ],
      monetizationSuggestions:
        snapshot.shopSetupComplete && snapshot.commercePostCount === 0
          ? [
              {
                title: 'Add commerce to a post',
                detail: 'Attach buy-now or offers when you are ready.',
                ctaPath: '/(tabs)/create',
                priority: 'high' as const,
              },
            ]
          : [],
      visibilityRecommendations: [
        {
          title: 'Share outside the app',
          detail: 'When it feels right, invite someone you trust to view your shop.',
          priority: 'medium' as const,
        },
      ],
      learningTeachingRoadmap: [],
      opportunityMatches: [],
      needsIntentPrompt: true,
      creatorGoals: ['explore'],
      generatedAt: new Date().toISOString(),
      fromCache: false,
    },
  };
}

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  if (auth instanceof NextResponse) return auth;

  const appSnapshot = await buildAppCreatorSnapshot(auth.userId);
  const token =
    getTokenFromRequest(request.headers.get('authorization')) ||
    request.cookies.get('access_token')?.value;

  if (!token) {
    return NextResponse.json(appOnlyBrief(appSnapshot));
  }

  try {
    const res = await proxyToOrg('/api/creator-manager/brief', {
      accessToken: token,
      email: emailFromPayload(auth.payload),
      appSnapshot,
    });
    if (res.ok) {
      return NextResponse.json(await res.json());
    }
  } catch (e) {
    console.warn('[creator-manager/brief] org proxy failed', e);
  }

  return NextResponse.json(appOnlyBrief(appSnapshot));
}

export async function POST(request: NextRequest) {
  const auth = await requireAuth(request);
  if (auth instanceof NextResponse) return auth;

  const refresh = request.nextUrl.searchParams.get('refresh') === '1';
  const appSnapshot = await buildAppCreatorSnapshot(auth.userId);
  const token =
    getTokenFromRequest(request.headers.get('authorization')) ||
    request.cookies.get('access_token')?.value;

  if (!token) {
    return NextResponse.json(appOnlyBrief(appSnapshot));
  }

  try {
    const res = await proxyToOrg(
      `/api/creator-manager/brief${refresh ? '?refresh=1' : ''}`,
      {
        method: 'POST',
        accessToken: token,
        email: emailFromPayload(auth.payload),
        appSnapshot,
      }
    );
    if (res.ok) {
      return NextResponse.json(await res.json());
    }
  } catch (e) {
    console.warn('[creator-manager/brief POST] org proxy failed', e);
  }

  return NextResponse.json(appOnlyBrief(appSnapshot));
}
