export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-jwt';
import { confirmDevOrder, isDevPaymentsEnabled } from '@/lib/razorpay';
import { createShareMoment } from '@/lib/share-service';
import { executeQuery } from '@/lib/database';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  if (!isDevPaymentsEnabled()) {
    return NextResponse.json({ error: 'Dev payments disabled' }, { status: 403 });
  }

  const auth = await requireAuth(request);
  if (auth instanceof NextResponse) return auth;

  const ok = await confirmDevOrder(params.id, auth.userId);
  if (!ok) {
    return NextResponse.json({ error: 'Order not found or already paid' }, { status: 404 });
  }

  const rows = await executeQuery<{ post_id: string; seller_id: string }[]>(
    'SELECT post_id, seller_id FROM app_orders WHERE id = ? LIMIT 1',
    [params.id]
  );
  if (rows[0]) {
    await createShareMoment(rows[0].post_id, rows[0].seller_id, 'first_sale');
    await createShareMoment(rows[0].post_id, auth.userId, 'buyer_purchase');
  }

  return NextResponse.json({ success: true, orderId: params.id, status: 'paid' });
}
