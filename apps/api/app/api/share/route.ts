export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, optionalAuth } from '@/lib/auth-jwt';
import { getOrCreateShortUrl, createShareMoment, markShareMomentShared } from '@/lib/share-service';
import { fetchPostById } from '@/lib/post-service';

export async function POST(request: NextRequest) {
  const auth = await requireAuth(request);
  if (auth instanceof NextResponse) return auth;

  const body = await request.json();
  const postId = body.postId as string;
  const momentType = body.momentType as import('@inbidz/shared').ShareMomentType;
  const platform = body.platform as string | undefined;
  const momentId = body.momentId as string | undefined;

  if (momentId && platform) {
    await markShareMomentShared(momentId, platform);
    return NextResponse.json({ success: true });
  }

  if (!postId || !momentType) {
    return NextResponse.json({ error: 'postId and momentType required' }, { status: 400 });
  }

  const moment = await createShareMoment(postId, auth.userId, momentType, body.metadata);
  const post = await fetchPostById(postId, auth.userId);

  return NextResponse.json({ moment, post });
}

export async function GET(request: NextRequest) {
  const auth = await optionalAuth(request);
  const { searchParams } = new URL(request.url);
  const postId = searchParams.get('postId');

  if (!postId) {
    return NextResponse.json({ error: 'postId required' }, { status: 400 });
  }

  const referrerId = auth?.userId;
  const { shortCode, shortUrl } = await getOrCreateShortUrl(postId, referrerId);

  return NextResponse.json({ shortCode, shortUrl });
}
