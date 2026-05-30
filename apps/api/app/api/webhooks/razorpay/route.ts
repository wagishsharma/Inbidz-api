export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { confirmOrderPayment } from '@/lib/razorpay';
import { createShareMoment } from '@/lib/share-service';
import { executeQuery } from '@/lib/database';

export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get('x-razorpay-signature');
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;

  if (secret && signature) {
    const expected = crypto.createHmac('sha256', secret).update(body).digest('hex');
    if (expected !== signature) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
    }
  }

  const event = JSON.parse(body);
  if (event.event === 'payment.captured') {
    const payment = event.payload.payment.entity;
    const orderId = payment.order_id as string;
    const paymentId = payment.id as string;

    const result = await confirmOrderPayment(orderId, paymentId);
    if (result) {
      const sellers = await executeQuery<{ seller_id: string }[]>(
        'SELECT seller_id FROM app_orders WHERE id = ? LIMIT 1',
        [result.orderId]
      );
      const sellerId = sellers[0]?.seller_id;
      if (sellerId) {
        await createShareMoment(result.postId, sellerId, 'first_sale');
      }
      await createShareMoment(result.postId, result.buyerId, 'buyer_purchase');
    }
  }

  return NextResponse.json({ received: true });
}
