export const dynamic = 'force-dynamic';

import { readFile, stat } from 'fs/promises';
import path from 'path';
import { NextRequest, NextResponse } from 'next/server';
import { isDevUploadAllowed } from '@/lib/env';

const UPLOAD_DIR = path.join(process.cwd(), '.uploads');

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

export async function GET(
  _request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  if (!isDevUploadAllowed()) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const rel = params.path.join('/');
  if (!rel.startsWith('dev/') || rel.includes('..')) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const filePath = path.join(UPLOAD_DIR, rel);
  try {
    await stat(filePath);
    const data = await readFile(filePath);
    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME[ext] || 'application/octet-stream';
    return new NextResponse(data, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=86400',
      },
    });
  } catch {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
}
