export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { shopSetupSchema } from '@inbidz/shared';
import { requireAuth } from '@/lib/auth-jwt';
import { executeQuery } from '@/lib/database';
import { trackOnboardingEvent } from '@/lib/auth-user-sync';

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  if (auth instanceof NextResponse) return auth;

  const rows = await executeQuery<
    {
      shop_name: string | null;
      shipping_policy: string | null;
      payout_ready: number;
      shop_setup_complete: number;
    }[]
  >(
    'SELECT shop_name, shipping_policy, payout_ready, shop_setup_complete FROM app_profiles WHERE user_id = ? LIMIT 1',
    [auth.userId]
  );

  if (rows.length === 0) {
    return NextResponse.json({ setupComplete: false });
  }

  const row = rows[0];
  return NextResponse.json({
    userId: auth.userId,
    shopName: row.shop_name,
    shippingPolicy: row.shipping_policy,
    payoutReady: Boolean(row.payout_ready),
    setupComplete: Boolean(row.shop_setup_complete),
  });
}

export async function POST(request: NextRequest) {
  const auth = await requireAuth(request);
  if (auth instanceof NextResponse) return auth;

  const body = await request.json();
  const parsed = shopSetupSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  await executeQuery(
    `UPDATE app_profiles SET shop_name = ?, shipping_policy = ?, is_seller = 1, shop_setup_complete = 1 WHERE user_id = ?`,
    [parsed.data.shopName, parsed.data.shippingPolicy ?? null, auth.userId]
  );

  await trackOnboardingEvent(auth.userId, 'shop_setup_complete', {
    shopName: parsed.data.shopName,
  });

  return NextResponse.json({ success: true, setupComplete: true });
}
