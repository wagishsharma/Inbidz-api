export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { counterOfferSchema } from '@inbidz/shared';
import { requireAuth } from '@/lib/auth-jwt';
import { executeQuery } from '@/lib/database';
import { createBuyNowOrder, isRazorpayConfigured } from '@/lib/razorpay';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await requireAuth(request);
  if (auth instanceof NextResponse) return auth;

  const offerId = params.id;
  const body = await request.json();
  const action = body.action as 'accept' | 'decline' | 'counter';

  const offers = await executeQuery<
    {
      id: string;
      post_id: string;
      buyer_id: string;
      seller_id: string;
      amount: number;
      counter_amount: number | null;
      status: string;
    }[]
  >('SELECT * FROM offers WHERE id = ? LIMIT 1', [offerId]);

  if (offers.length === 0) {
    return NextResponse.json({ error: 'Offer not found' }, { status: 404 });
  }

  const offer = offers[0];
  const isSeller = offer.seller_id === auth.userId;
  const isBuyer = offer.buyer_id === auth.userId;

  if (action === 'decline') {
    if (!isSeller && !isBuyer) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    await executeQuery('UPDATE offers SET status = ? WHERE id = ?', ['declined', offerId]);
    return NextResponse.json({ success: true, status: 'declined' });
  }

  if (action === 'counter') {
    if (!isSeller) {
      return NextResponse.json({ error: 'Only seller can counter' }, { status: 403 });
    }
    const parsed = counterOfferSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }
    await executeQuery(
      'UPDATE offers SET status = ?, counter_amount = ? WHERE id = ?',
      ['countered', parsed.data.counterAmount, offerId]
    );
    return NextResponse.json({ success: true, status: 'countered', counterAmount: parsed.data.counterAmount });
  }

  if (action === 'accept') {
    if (!isSeller && !(isBuyer && offer.status === 'countered')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const finalAmount =
      isBuyer && offer.status === 'countered' && offer.counter_amount
        ? Number(offer.counter_amount)
        : Number(offer.amount);

    await executeQuery('UPDATE offers SET status = ? WHERE id = ?', ['accepted', offerId]);

    if (!isRazorpayConfigured()) {
      return NextResponse.json({
        success: true,
        status: 'accepted',
        amount: finalAmount,
        paymentRequired: false,
      });
    }

    const order = await createBuyNowOrder(
      offer.post_id,
      offer.buyer_id,
      offer.seller_id,
      finalAmount,
      undefined,
      offerId
    );

    return NextResponse.json({
      success: true,
      status: 'accepted',
      amount: finalAmount,
      orderId: order.orderId,
      razorpayOrderId: order.razorpayOrderId,
      razorpayKeyId: order.razorpayKeyId,
    });
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
}
