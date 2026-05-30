export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { placeBidSchema } from '@inbidz/shared';
import { requireAuth } from '@/lib/auth-jwt';
import { executeQuery, withConnection } from '@/lib/database';
import { createShareMoment } from '@/lib/share-service';
import { fetchPostById } from '@/lib/post-service';

const ANTI_SNIPE_SECONDS = 120;
const SNIPE_WINDOW_SECONDS = 60;

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await requireAuth(request);
  if (auth instanceof NextResponse) return auth;

  const body = await request.json();
  const parsed = placeBidSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const postId = params.id;
  const amount = parsed.data.amount;

  const result = await withConnection(async (conn) => {
    const [posts] = await conn.execute(
      `SELECT p.id, p.user_id, p.commerce_mode, pc.auction_start, pc.auction_end,
              pc.current_bid, pc.min_bid_increment, pc.bid_count, pc.reserve_price
       FROM posts p
       JOIN post_commerce pc ON pc.post_id = p.id
       WHERE p.id = ? AND p.status = 'published' FOR UPDATE`,
      [postId]
    );

    const rows = posts as {
      id: string;
      user_id: string;
      commerce_mode: string;
      auction_start: string | null;
      auction_end: string | null;
      current_bid: number | null;
      min_bid_increment: number | null;
      bid_count: number;
      reserve_price: number | null;
    }[];

    if (rows.length === 0) {
      return { error: 'Post not found', status: 404 };
    }

    const post = rows[0];
    if (!['auction', 'buy_now_and_offers'].includes(post.commerce_mode)) {
      return { error: 'This post is not an auction', status: 400 };
    }

    if (post.user_id === auth.userId) {
      return { error: 'Cannot bid on your own post', status: 400 };
    }

    const now = new Date();
    if (post.auction_start && new Date(post.auction_start) > now) {
      return { error: 'Auction has not started', status: 400 };
    }
    if (post.auction_end && new Date(post.auction_end) <= now) {
      return { error: 'Auction has ended', status: 400 };
    }

    const minIncrement = Number(post.min_bid_increment) || 100;
    const currentBid = post.current_bid ? Number(post.current_bid) : 0;
    const minRequired = currentBid > 0 ? currentBid + minIncrement : minIncrement;

    if (amount < minRequired) {
      return {
        error: `Minimum bid is ₹${minRequired}`,
        status: 400,
      };
    }

    const bidId = randomUUID();
    await conn.execute(
      'INSERT INTO bids (id, post_id, user_id, amount) VALUES (?, ?, ?, ?)',
      [bidId, postId, auth.userId, amount]
    );

    let newEnd = post.auction_end;
    if (post.auction_end) {
      const endDate = new Date(post.auction_end);
      const secondsLeft = (endDate.getTime() - now.getTime()) / 1000;
      if (secondsLeft <= SNIPE_WINDOW_SECONDS) {
        endDate.setSeconds(endDate.getSeconds() + ANTI_SNIPE_SECONDS);
        newEnd = endDate.toISOString().slice(0, 19).replace('T', ' ');
        await conn.execute('UPDATE post_commerce SET auction_end = ? WHERE post_id = ?', [
          newEnd,
          postId,
        ]);
      }
    }

    const prevBidCount = post.bid_count;
    await conn.execute(
      `UPDATE post_commerce SET current_bid = ?, current_bidder_id = ?, bid_count = bid_count + 1 WHERE post_id = ?`,
      [amount, auth.userId, postId]
    );

    return { bidId, prevBidCount, amount, newEnd };
  });

  if ('error' in result) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  if (result.prevBidCount === 0) {
    const postForShare = await fetchPostById(postId);
    if (postForShare) {
      await createShareMoment(postId, postForShare.userId, 'first_bid', {
        bidAmount: result.amount,
      });
    }
  } else {
    const post = await fetchPostById(postId);
    if (post) {
      await createShareMoment(postId, post.userId, 'highest_bid', { bidAmount: result.amount });
    }
  }

  const post = await fetchPostById(postId, auth.userId);
  return NextResponse.json({ success: true, bidId: result.bidId, post });
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const bids = await executeQuery<
    {
      id: string;
      post_id: string;
      user_id: string;
      amount: number;
      created_at: string;
      username: string;
      display_name: string;
      avatar_url: string | null;
    }[]
  >(
    `SELECT b.*, pr.username, pr.display_name, pr.avatar_url
     FROM bids b
     LEFT JOIN app_profiles pr ON pr.user_id = b.user_id
     WHERE b.post_id = ?
     ORDER BY b.amount DESC, b.created_at DESC
     LIMIT 50`,
    [params.id]
  );

  return NextResponse.json({
    bids: bids.map((b) => ({
      id: b.id,
      postId: b.post_id,
      userId: b.user_id,
      amount: Number(b.amount),
      createdAt: b.created_at,
      bidder: {
        id: b.user_id,
        username: b.username,
        displayName: b.display_name,
        avatarUrl: b.avatar_url ?? undefined,
      },
    })),
  });
}
