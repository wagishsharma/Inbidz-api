export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-jwt';
import { executeQuery } from '@/lib/database';
import { trackOnboardingEvent } from '@/lib/auth-user-sync';

export async function POST(request: NextRequest) {
  const auth = await requireAuth(request);
  if (auth instanceof NextResponse) return auth;

  const body = await request.json();
  const userId = body.userId as string;
  if (!userId || userId === auth.userId) {
    return NextResponse.json({ error: 'Invalid userId' }, { status: 400 });
  }

  const existing = await executeQuery<{ follower_id: string }[]>(
    'SELECT follower_id FROM app_follows WHERE follower_id = ? AND following_id = ? LIMIT 1',
    [auth.userId, userId]
  );

  if (existing.length > 0) {
    await executeQuery(
      'DELETE FROM app_follows WHERE follower_id = ? AND following_id = ?',
      [auth.userId, userId]
    );
    return NextResponse.json({ following: false });
  }

  await executeQuery(
    'INSERT INTO app_follows (follower_id, following_id) VALUES (?, ?)',
    [auth.userId, userId]
  );

  await trackOnboardingEvent(auth.userId, 'follow_seller', { followingId: userId });

  return NextResponse.json({ following: true });
}
