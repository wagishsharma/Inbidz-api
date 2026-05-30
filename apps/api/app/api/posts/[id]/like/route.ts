export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-jwt';
import { executeQuery } from '@/lib/database';
import { createShareMoment } from '@/lib/share-service';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await requireAuth(request);
  if (auth instanceof NextResponse) return auth;

  const postId = params.id;
  const existing = await executeQuery<{ post_id: string }[]>(
    'SELECT post_id FROM post_likes WHERE post_id = ? AND user_id = ? LIMIT 1',
    [postId, auth.userId]
  );

  if (existing.length > 0) {
    await executeQuery('DELETE FROM post_likes WHERE post_id = ? AND user_id = ?', [
      postId,
      auth.userId,
    ]);
    await executeQuery('UPDATE posts SET like_count = GREATEST(like_count - 1, 0) WHERE id = ?', [
      postId,
    ]);
    return NextResponse.json({ liked: false });
  }

  await executeQuery('INSERT INTO post_likes (post_id, user_id) VALUES (?, ?)', [
    postId,
    auth.userId,
  ]);
  await executeQuery('UPDATE posts SET like_count = like_count + 1 WHERE id = ?', [postId]);

  const likeCount = await executeQuery<{ like_count: number; user_id: string }[]>(
    'SELECT like_count, user_id FROM posts WHERE id = ? LIMIT 1',
    [postId]
  );

  if (likeCount[0]?.like_count === 1 && likeCount[0].user_id === auth.userId) {
    await createShareMoment(postId, auth.userId, 'first_like');
  }

  return NextResponse.json({ liked: true });
}
