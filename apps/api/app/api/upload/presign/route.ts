export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-jwt';
import {
  createPresignedUploadUrl,
  getPostMediaKey,
  getPublicUrl,
  isR2Configured,
  verifyR2WriteAccess,
} from '@/lib/r2';

export async function POST(request: NextRequest) {
  const auth = await requireAuth(request);
  if (auth instanceof NextResponse) return auth;

  if (!isR2Configured()) {
    return NextResponse.json({
      devFallback: true,
      uploadUrl: null,
      key: null,
      publicUrl: null,
    });
  }

  const access = await verifyR2WriteAccess();
  if (!access.ok) {
    console.warn('[presign]', access.error);
    return NextResponse.json({
      devFallback: true,
      uploadUrl: null,
      key: null,
      publicUrl: null,
      r2Error: access.error,
    });
  }

  const body = await request.json();
  const filename = (body.filename as string) || 'upload.jpg';
  const contentType = (body.contentType as string) || 'image/jpeg';

  const key = getPostMediaKey(auth.userId, filename);
  const uploadUrl = await createPresignedUploadUrl(key, contentType);
  const publicUrl = getPublicUrl(key);

  return NextResponse.json({ uploadUrl, key, publicUrl });
}
