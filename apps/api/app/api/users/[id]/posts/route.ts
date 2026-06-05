export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { optionalAuth } from '@/lib/auth-jwt';
import { fetchPostsByUserId } from '@/lib/post-service';
import { clampPagination } from '@/lib/database';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const auth = await optionalAuth(request);
  const { searchParams } = new URL(request.url);
  const { limit, offset } = clampPagination(
    searchParams.get('limit') ?? undefined,
    searchParams.get('offset') ?? undefined
  );

  const posts = await fetchPostsByUserId(id, auth?.userId, limit, offset);
  return NextResponse.json({ posts });
}
