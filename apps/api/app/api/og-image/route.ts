export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import sharp from 'sharp';
import { fetchPostById } from '@/lib/post-service';

const OG_MAX_EDGE = 1200;
const JPEG_QUALITY = 82;

function pickSourceUrl(post: NonNullable<Awaited<ReturnType<typeof fetchPostById>>>) {
  const photo = post.media.find((m) => m.type === 'photo');
  if (photo?.url) return photo.url;
  const video = post.media.find((m) => m.type === 'video' && m.thumbnailUrl);
  if (video?.thumbnailUrl) return video.thumbnailUrl;
  return null;
}

async function brandedPlaceholder(): Promise<Buffer> {
  return sharp({
    create: {
      width: 1200,
      height: 630,
      channels: 3,
      background: { r: 26, g: 26, b: 46 },
    },
  })
    .jpeg({ quality: 85 })
    .toBuffer();
}

export async function GET(request: NextRequest) {
  const postId = new URL(request.url).searchParams.get('post');
  if (!postId) {
    return NextResponse.json({ error: 'post required' }, { status: 400 });
  }

  const post = await fetchPostById(postId);
  if (!post) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const sourceUrl = pickSourceUrl(post);
  if (!sourceUrl) {
    const output = await brandedPlaceholder();
    return new NextResponse(new Uint8Array(output), {
      headers: {
        'Content-Type': 'image/jpeg',
        'Cache-Control': 'public, max-age=3600, s-maxage=86400',
      },
    });
  }

  try {
    const res = await fetch(sourceUrl, { signal: AbortSignal.timeout(20_000) });
    if (!res.ok) {
      throw new Error(`source fetch failed: ${res.status}`);
    }

    const input = Buffer.from(await res.arrayBuffer());
    const output = await sharp(input)
      .rotate()
      .resize({
        width: OG_MAX_EDGE,
        height: OG_MAX_EDGE,
        fit: 'inside',
        withoutEnlargement: true,
      })
      .jpeg({ quality: JPEG_QUALITY, mozjpeg: true })
      .toBuffer();

    return new NextResponse(new Uint8Array(output), {
      headers: {
        'Content-Type': 'image/jpeg',
        'Cache-Control': 'public, max-age=3600, s-maxage=86400',
      },
    });
  } catch (err) {
    console.error('og-image generation failed', postId, err);
    const output = await brandedPlaceholder();
    return new NextResponse(new Uint8Array(output), {
      headers: {
        'Content-Type': 'image/jpeg',
        'Cache-Control': 'public, max-age=300',
      },
    });
  }
}
