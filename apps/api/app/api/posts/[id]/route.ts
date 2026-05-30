export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { optionalAuth } from '@/lib/auth-jwt';
import { fetchPostById } from '@/lib/post-service';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await optionalAuth(request);
  const post = await fetchPostById(params.id, auth?.userId);
  if (!post) {
    return NextResponse.json({ error: 'Post not found' }, { status: 404 });
  }
  return NextResponse.json({ post });
}
