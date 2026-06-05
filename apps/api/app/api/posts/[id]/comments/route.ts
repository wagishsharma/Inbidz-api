export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { createCommentSchema } from '@inbidz/shared';
import { requireAuth } from '@/lib/auth-jwt';
import { clampPagination } from '@/lib/database';
import { createComment, deleteComment, fetchComments } from '@/lib/comment-service';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { searchParams } = new URL(request.url);
  const { limit, offset } = clampPagination(
    searchParams.get('limit') ?? undefined,
    searchParams.get('offset') ?? undefined
  );

  const comments = await fetchComments(id, limit, offset);
  return NextResponse.json({ comments });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth(request);
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;
  const body = await request.json();
  const parsed = createCommentSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const comment = await createComment(id, auth.userId, parsed.data.body);
    return NextResponse.json({ comment }, { status: 201 });
  } catch (e) {
    if (e instanceof Error && e.message === 'POST_NOT_FOUND') {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }
    throw e;
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth(request);
  if (auth instanceof NextResponse) return auth;

  const { searchParams } = new URL(request.url);
  const commentId = searchParams.get('commentId');
  if (!commentId) {
    return NextResponse.json({ error: 'commentId required' }, { status: 400 });
  }

  try {
    const deleted = await deleteComment(commentId, auth.userId);
    if (!deleted) {
      return NextResponse.json({ error: 'Comment not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (e) {
    if (e instanceof Error && e.message === 'FORBIDDEN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    throw e;
  }
}
