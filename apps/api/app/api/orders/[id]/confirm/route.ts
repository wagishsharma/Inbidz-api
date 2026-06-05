export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { confirmPaymentSchema } from '@inbidz/shared';
import { requireCheckoutAuth } from '@/lib/checkout-session';
import { executeQuery } from '@/lib/database';
import {
  confirmOrderPayment,
  isRazorpayConfigured,
  verifyPaymentSignature,
} from '@/lib/razorpay';
import { createShareMoment } from '@/lib/share-service';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  if (!isRazorpayConfigured()) {
    return NextResponse.json({ error: 'Payments not configured' }, { status: 503 });
  }

  const auth = await requireCheckoutAuth(request, params.id);
  if (auth instanceof NextResponse) return auth;

  const body = await request.json().catch(() => ({}));
  const parsed = confirmPaymentSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid payment confirmation' }, { status: 400 });
  }

  const rows = await executeQuery<
    { id: string; buyer_id: string; status: string; razorpay_order_id: string | null }[]
  >('SELECT id, buyer_id, status, razorpay_order_id FROM app_orders WHERE id = ? LIMIT 1', [
    params.id,
  ]);

  if (rows.length === 0) {
    return NextResponse.json({ error: 'Order not found' }, { status: 404 });
  }

  const order = rows[0];
  if (order.buyer_id !== auth.userId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  if (order.status === 'paid') {
    return NextResponse.json({ success: true, orderId: order.id, status: 'paid' });
  }

  if (order.razorpay_order_id !== parsed.data.razorpayOrderId) {
    return NextResponse.json({ error: 'Order mismatch' }, { status: 400 });
  }

  const valid = verifyPaymentSignature(
    parsed.data.razorpayOrderId,
    parsed.data.razorpayPaymentId,
    parsed.data.razorpaySignature
  );
  if (!valid) {
    return NextResponse.json({ error: 'Invalid payment signature' }, { status: 400 });
  }

  const result = await confirmOrderPayment(
    parsed.data.razorpayOrderId,
    parsed.data.razorpayPaymentId
  );
  if (!result) {
    return NextResponse.json({ error: 'Could not confirm order' }, { status: 400 });
  }

  const sellers = await executeQuery<{ seller_id: string }[]>(
    'SELECT seller_id FROM app_orders WHERE id = ? LIMIT 1',
    [params.id]
  );
  const sellerId = sellers[0]?.seller_id;
  if (sellerId) {
    await createShareMoment(result.postId, sellerId, 'first_sale');
  }
  await createShareMoment(result.postId, auth.userId, 'buyer_purchase');

  return NextResponse.json({ success: true, orderId: params.id, status: 'paid' });
}
