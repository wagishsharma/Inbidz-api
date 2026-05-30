export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { resolveShortCode } from '@/lib/share-service';
import { fetchPostById } from '@/lib/post-service';

export async function GET(
  request: NextRequest,
  { params }: { params: { code: string } }
) {
  const postId = await resolveShortCode(params.code);
  if (!postId) {
    return NextResponse.json({ error: 'Link not found' }, { status: 404 });
  }

  const post = await fetchPostById(postId);
  return NextResponse.json({ postId, post });
}
