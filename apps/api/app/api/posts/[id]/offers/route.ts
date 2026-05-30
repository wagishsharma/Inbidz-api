export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { createOfferSchema, counterOfferSchema } from '@inbidz/shared';
import { requireAuth } from '@/lib/auth-jwt';
import { executeQuery } from '@/lib/database';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await requireAuth(request);
  if (auth instanceof NextResponse) return auth;

  const body = await request.json();
  const parsed = createOfferSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const postId = params.id;
  const posts = await executeQuery<
    { user_id: string; commerce_mode: string }[]
  >('SELECT user_id, commerce_mode FROM posts WHERE id = ? AND status = ? LIMIT 1', [
    postId,
    'published',
  ]);

  if (posts.length === 0) {
    return NextResponse.json({ error: 'Post not found' }, { status: 404 });
  }

  const post = posts[0];
  if (!['offers', 'buy_now_and_offers'].includes(post.commerce_mode)) {
    return NextResponse.json({ error: 'This post does not accept offers' }, { status: 400 });
  }

  if (post.user_id === auth.userId) {
    return NextResponse.json({ error: 'Cannot offer on your own post' }, { status: 400 });
  }

  const offerId = randomUUID();
  const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000);

  await executeQuery(
    `INSERT INTO offers (id, post_id, buyer_id, seller_id, amount, message, expires_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      offerId,
      postId,
      auth.userId,
      post.user_id,
      parsed.data.amount,
      parsed.data.message ?? null,
      expiresAt.toISOString().slice(0, 19).replace('T', ' '),
    ]
  );

  let convId: string;
  const existingConv = await executeQuery<{ id: string }[]>(
    'SELECT id FROM conversations WHERE post_id = ? AND buyer_id = ? LIMIT 1',
    [postId, auth.userId]
  );

  if (existingConv.length > 0) {
    convId = existingConv[0].id;
  } else {
    convId = randomUUID();
    await executeQuery(
      'INSERT INTO conversations (id, post_id, buyer_id, seller_id) VALUES (?, ?, ?, ?)',
      [convId, postId, auth.userId, post.user_id]
    );
  }

  const msgId = randomUUID();
  await executeQuery(
    'INSERT INTO messages (id, conversation_id, sender_id, body, offer_id) VALUES (?, ?, ?, ?, ?)',
    [
      msgId,
      convId,
      auth.userId,
      parsed.data.message || `Offer: ₹${parsed.data.amount}`,
      offerId,
    ]
  );

  return NextResponse.json({ offerId, conversationId: convId }, { status: 201 });
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await requireAuth(request);
  if (auth instanceof NextResponse) return auth;

  const offers = await executeQuery<
    {
      id: string;
      buyer_id: string;
      amount: number;
      counter_amount: number | null;
      status: string;
      expires_at: string;
      created_at: string;
    }[]
  >(
    `SELECT id, buyer_id, amount, counter_amount, status, expires_at, created_at
     FROM offers WHERE post_id = ? AND (buyer_id = ? OR seller_id = ?)
     ORDER BY created_at DESC`,
    [params.id, auth.userId, auth.userId]
  );

  return NextResponse.json({
    offers: offers.map((o) => ({
      id: o.id,
      buyerId: o.buyer_id,
      amount: Number(o.amount),
      counterAmount: o.counter_amount ? Number(o.counter_amount) : undefined,
      status: o.status,
      expiresAt: o.expires_at,
      createdAt: o.created_at,
    })),
  });
}
