export const dynamic = 'force-dynamic';

import { mkdir, writeFile } from 'fs/promises';
import path from 'path';
import { randomUUID } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-jwt';

const UPLOAD_DIR = path.join(process.cwd(), '.uploads');

function getApiBase(): string {
  return (process.env.API_PUBLIC_URL || 'http://localhost:3001').replace(/\/$/, '');
}

export async function POST(request: NextRequest) {
  const auth = await requireAuth(request);
  if (auth instanceof NextResponse) return auth;

  const form = await request.formData();
  const file = form.get('file');
  if (!(file instanceof Blob)) {
    return NextResponse.json({ error: 'file required' }, { status: 400 });
  }

  const filename = (form.get('filename') as string) || 'upload.jpg';
  const ext = path.extname(filename) || '.jpg';
  const safeExt = ext.replace(/[^a-z0-9.]/gi, '').slice(0, 8);
  const key = `dev/${auth.userId}/${randomUUID()}${safeExt}`;

  await mkdir(path.join(UPLOAD_DIR, path.dirname(key)), { recursive: true });
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(path.join(UPLOAD_DIR, key), buffer);

  const publicUrl = `${getApiBase()}/api/media/${key.split('/').map(encodeURIComponent).join('/')}`;

  return NextResponse.json({ key, publicUrl });
}
