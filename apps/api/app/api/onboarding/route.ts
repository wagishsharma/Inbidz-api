export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-jwt';
import { trackOnboardingEvent } from '@/lib/auth-user-sync';
import { executeQuery } from '@/lib/database';

export async function POST(request: NextRequest) {
  const auth = await requireAuth(request);
  if (auth instanceof NextResponse) return auth;

  const body = await request.json();
  const eventType = body.eventType as string;
  const metadata = body.metadata as Record<string, unknown> | undefined;

  if (!eventType) {
    return NextResponse.json({ error: 'eventType required' }, { status: 400 });
  }

  await trackOnboardingEvent(auth.userId, eventType, metadata);

  if (eventType === 'share_step_skipped' && metadata?.postId) {
    const postId = String(metadata.postId);
    await executeQuery(
      'UPDATE share_moments SET share_prompt_shown = 1 WHERE post_id = ? AND user_id = ? AND moment_type = ?',
      [postId, auth.userId, 'post_live']
    );
  }

  return NextResponse.json({ success: true });
}

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  if (auth instanceof NextResponse) return auth;

  const postCount = await executeQuery<{ c: number }[]>(
    'SELECT COUNT(*) as c FROM posts WHERE user_id = ?',
    [auth.userId]
  );
  const orderCount = await executeQuery<{ c: number }[]>(
    'SELECT COUNT(*) as c FROM app_orders WHERE buyer_id = ?',
    [auth.userId]
  );
  const shop = await executeQuery<{ shop_setup_complete: number }[]>(
    'SELECT shop_setup_complete FROM app_profiles WHERE user_id = ? LIMIT 1',
    [auth.userId]
  );

  const commerceViews = await executeQuery<{ c: number }[]>(
    `SELECT COUNT(*) as c FROM onboarding_events WHERE user_id = ? AND event_type = 'commerce_post_viewed'`,
    [auth.userId]
  );

  return NextResponse.json({
    hasPublishedPost: (postCount[0]?.c ?? 0) > 0,
    hasPurchased: (orderCount[0]?.c ?? 0) > 0,
    shopSetupComplete: Boolean(shop[0]?.shop_setup_complete),
    commercePostViews: commerceViews[0]?.c ?? 0,
    suggestSellBanner: (commerceViews[0]?.c ?? 0) >= 5 && !shop[0]?.shop_setup_complete,
  });
}
