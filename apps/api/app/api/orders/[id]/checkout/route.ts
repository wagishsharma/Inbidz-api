export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-jwt';
import { executeQuery } from '@/lib/database';
import { isRazorpayConfigured } from '@/lib/razorpay';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  if (!isRazorpayConfigured()) {
    return NextResponse.json({ error: 'Payments not configured' }, { status: 503 });
  }

  const auth = await requireAuth(request);
  if (auth instanceof NextResponse) return auth;

  const rows = await executeQuery<
    {
      id: string;
      buyer_id: string;
      amount: number;
      currency: string;
      status: string;
      razorpay_order_id: string | null;
    }[]
  >(
    `SELECT id, buyer_id, amount, currency, status, razorpay_order_id
     FROM app_orders WHERE id = ? LIMIT 1`,
    [params.id]
  );

  if (rows.length === 0) {
    return NextResponse.json({ error: 'Order not found' }, { status: 404 });
  }

  const order = rows[0];
  if (order.buyer_id !== auth.userId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  if (order.status === 'paid') {
    return NextResponse.json({ error: 'Order already paid' }, { status: 400 });
  }

  if (!order.razorpay_order_id) {
    return NextResponse.json({ error: 'Payment not initialized' }, { status: 400 });
  }

  return NextResponse.json({
    orderId: order.id,
    razorpayKeyId: process.env.RAZORPAY_KEY_ID!,
    razorpayOrderId: order.razorpay_order_id,
    amount: Number(order.amount),
    currency: order.currency,
    description: 'INBIDZ purchase',
    prefill: {
      email: auth.payload.email,
      name: auth.payload.name,
    },
  });
}
