export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { createPostSchema } from '@inbidz/shared';
import { requireAuth, optionalAuth } from '@/lib/auth-jwt';
import { createPost, fetchPostById } from '@/lib/post-service';
import { createShareMoment } from '@/lib/share-service';
import { trackOnboardingEvent } from '@/lib/auth-user-sync';
import { clampPagination, executeQuery } from '@/lib/database';

export async function GET(request: NextRequest) {
  const auth = await optionalAuth(request);
  const viewer = auth?.userId;

  const { searchParams } = new URL(request.url);
  const { limit, offset } = clampPagination(
    searchParams.get('limit') ?? undefined,
    searchParams.get('offset') ?? undefined
  );

  const { fetchFeedPosts } = await import('@/lib/post-service');
  const posts = await fetchFeedPosts(viewer, limit, offset);
  return NextResponse.json({ posts });
}

export async function POST(request: NextRequest) {
  const auth = await requireAuth(request);
  if (auth instanceof NextResponse) return auth;

  const body = await request.json();
  const parsed = createPostSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const input = parsed.data;
  try {
    const postId = await createPost(auth.userId, {
      caption: input.caption,
      postType: input.postType,
      commerceMode: input.commerceMode,
      media: input.media,
      commerce: input.commerce,
    });

    const postCount = await executeQuery<{ c: number }[]>(
      'SELECT COUNT(*) as c FROM posts WHERE user_id = ?',
      [auth.userId]
    );

    if (postCount[0]?.c === 1) {
      await trackOnboardingEvent(auth.userId, 'first_post_published', { postId });
    }

    if (input.commerceMode !== 'none') {
      const moment = await createShareMoment(postId, auth.userId, 'post_live');
      const post = await fetchPostById(postId, auth.userId);
      return NextResponse.json({ post, shareMoment: moment }, { status: 201 });
    }

    const post = await fetchPostById(postId, auth.userId);
    return NextResponse.json({ post }, { status: 201 });
  } catch (e) {
    if (e instanceof Error && e.message === 'SHOP_NOT_SETUP') {
      return NextResponse.json(
        { error: 'Complete shop setup before enabling commerce on a post' },
        { status: 403 }
      );
    }
    throw e;
  }
}
