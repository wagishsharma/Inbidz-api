export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { buyNowSchema } from '@inbidz/shared';
import { requireAuth } from '@/lib/auth-jwt';
import { executeQuery } from '@/lib/database';
import { createBuyNowOrder, createDevBuyNowOrder, isDevPaymentsEnabled, isRazorpayConfigured } from '@/lib/razorpay';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await requireAuth(request);
  if (auth instanceof NextResponse) return auth;

  if (!isRazorpayConfigured() && !isDevPaymentsEnabled()) {
    return NextResponse.json(
      {
        error: 'Payments not configured',
        message: 'Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in apps/api/.env.local (copy test keys from inbidz-com).',
      },
      { status: 503 }
    );
  }

  const body = await request.json().catch(() => ({}));
  const parsed = buyNowSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid request', message: 'Invalid checkout payload' },
      { status: 400 }
    );
  }

  const postId = params.id;
  const rows = await executeQuery<
    {
      user_id: string;
      commerce_mode: string;
      price: number | null;
      inventory: number;
    }[]
  >(
    `SELECT p.user_id, p.commerce_mode, pc.price, pc.inventory
     FROM posts p
     JOIN post_commerce pc ON pc.post_id = p.id
     WHERE p.id = ? AND p.status = 'published' LIMIT 1`,
    [postId]
  );

  if (rows.length === 0) {
    return NextResponse.json({ error: 'Post not found or not for sale' }, { status: 404 });
  }

  const post = rows[0];
  if (!['buy_now', 'buy_now_and_offers'].includes(post.commerce_mode)) {
    return NextResponse.json(
      {
        error: 'not_buy_now',
        message: 'This post is not available for Buy Now (auction or offers only).',
      },
      { status: 400 }
    );
  }

  if (post.user_id === auth.userId) {
    return NextResponse.json(
      {
        error: 'own_post',
        message: 'You cannot buy your own post. Sign in with a buyer account to test checkout.',
      },
      { status: 400 }
    );
  }

  if (post.inventory <= 0) {
    return NextResponse.json({ error: 'sold_out', message: 'This item is sold out.' }, { status: 400 });
  }

  const price = Number(post.price);
  if (!price || price <= 0) {
    return NextResponse.json({ error: 'invalid_price', message: 'This listing has no valid price.' }, { status: 400 });
  }

  let referrerUserId: string | undefined;
  const refCode = request.headers.get('x-referral-code');
  if (refCode) {
    const refs = await executeQuery<{ user_id: string }[]>(
      'SELECT user_id FROM app_profiles WHERE referral_code = ? LIMIT 1',
      [refCode]
    );
    referrerUserId = refs[0]?.user_id;
  }

  if (isDevPaymentsEnabled()) {
    const order = await createDevBuyNowOrder(
      postId,
      auth.userId,
      post.user_id,
      price,
      parsed.data.shippingAddress as Record<string, string> | undefined,
      undefined,
      referrerUserId
    );
    return NextResponse.json({
      orderId: order.orderId,
      devMode: true,
      amount: price,
      currency: 'INR',
    });
  }

  const order = await createBuyNowOrder(
    postId,
    auth.userId,
    post.user_id,
    price,
    parsed.data.shippingAddress as Record<string, string> | undefined,
    undefined,
    referrerUserId
  );

  return NextResponse.json({
    orderId: order.orderId,
    razorpayOrderId: order.razorpayOrderId,
    razorpayKeyId: order.razorpayKeyId,
    amount: price,
    currency: 'INR',
  });
}
