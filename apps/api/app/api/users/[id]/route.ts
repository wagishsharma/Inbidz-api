export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { optionalAuth } from '@/lib/auth-jwt';
import { fetchProfileByUserId } from '@/lib/post-service';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const auth = await optionalAuth(request);
  const profile = await fetchProfileByUserId(id, auth?.userId);

  if (!profile) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  return NextResponse.json({ user: profile });
}
