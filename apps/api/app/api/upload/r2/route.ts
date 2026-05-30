export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-jwt';
import {
  getPostMediaKey,
  getPublicUrl,
  isR2Configured,
  uploadObject,
  verifyR2WriteAccess,
} from '@/lib/r2';

const MAX_BYTES = 50 * 1024 * 1024; // 50 MB

const MIME: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.mp4': 'video/mp4',
  '.mov': 'video/quicktime',
  '.webm': 'video/webm',
};

function guessContentType(filename: string, fallback?: string | null): string {
  if (fallback?.includes('/')) return fallback;
  const ext = filename.toLowerCase().match(/\.[^.]+$/)?.[0] ?? '';
  return MIME[ext] || 'application/octet-stream';
}

export async function POST(request: NextRequest) {
  const auth = await requireAuth(request);
  if (auth instanceof NextResponse) return auth;

  if (!isR2Configured()) {
    return NextResponse.json({ error: 'R2 is not configured' }, { status: 503 });
  }

  const access = await verifyR2WriteAccess();
  if (!access.ok) {
    console.error('[upload/r2]', access.error);
    return NextResponse.json({ error: access.error }, { status: 503 });
  }

  const form = await request.formData();
  const file = form.get('file');
  if (!(file instanceof Blob)) {
    return NextResponse.json({ error: 'file required' }, { status: 400 });
  }

  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: 'File too large (max 50 MB)' }, { status: 413 });
  }

  const filename = (form.get('filename') as string) || 'upload.jpg';
  const contentType = guessContentType(filename, form.get('contentType') as string | null);
  const key = getPostMediaKey(auth.userId, filename);
  const buffer = Buffer.from(await file.arrayBuffer());

  try {
    await uploadObject(key, buffer, contentType);
  } catch (err) {
    console.error('[upload/r2] PutObject failed', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'R2 upload failed' },
      { status: 502 }
    );
  }

  return NextResponse.json({
    key,
    publicUrl: getPublicUrl(key),
  });
}

export async function GET() {
  if (!isR2Configured()) {
    return NextResponse.json({ configured: false, writable: false });
  }
  const access = await verifyR2WriteAccess();
  return NextResponse.json({
    configured: true,
    writable: access.ok,
    error: access.ok ? undefined : access.error,
    publicUrl: process.env.R2_PUBLIC_URL ?? null,
    bucket: process.env.R2_BUCKET_NAME ?? null,
  });
}
