export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-jwt';
import { executeQuery } from '@/lib/database';
import { trackOnboardingEvent } from '@/lib/auth-user-sync';

export async function POST(request: NextRequest) {
  const auth = await requireAuth(request);
  if (auth instanceof NextResponse) return auth;

  const body = await request.json();
  const referralCode = body.referralCode as string | undefined;
  if (!referralCode) {
    return NextResponse.json({ error: 'referralCode required' }, { status: 400 });
  }

  const referrers = await executeQuery<{ user_id: string }[]>(
    'SELECT user_id FROM app_profiles WHERE referral_code = ? LIMIT 1',
    [referralCode]
  );

  if (referrers.length === 0) {
    return NextResponse.json({ error: 'Invalid referral code' }, { status: 404 });
  }

  const referrerId = referrers[0].user_id;
  if (referrerId === auth.userId) {
    return NextResponse.json({ error: 'Cannot refer yourself' }, { status: 400 });
  }

  await executeQuery(
    'UPDATE app_profiles SET referred_by_user_id = ? WHERE user_id = ? AND referred_by_user_id IS NULL',
    [referrerId, auth.userId]
  );

  await trackOnboardingEvent(auth.userId, 'referral_applied', { referrerId, referralCode });

  return NextResponse.json({ success: true, referrerId });
}
