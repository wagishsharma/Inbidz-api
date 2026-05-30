export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { fetchPostById } from '@/lib/post-service';
import { formatINR } from '@inbidz/shared';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const postId = searchParams.get('post');
  const template = searchParams.get('template') || 'post_live';
  const shortUrl = searchParams.get('url') || '';

  if (!postId) {
    return NextResponse.json({ error: 'post required' }, { status: 400 });
  }

  const post = await fetchPostById(postId);
  if (!post || post.media.length === 0) {
    return NextResponse.json({ error: 'Post not found' }, { status: 404 });
  }

  const isStory = searchParams.get('format') === 'story';
  const width = isStory ? 1080 : 1080;
  const height = isStory ? 1920 : 1080;

  const title = (post.caption || 'InBidz Post').slice(0, 60);
  const artist = post.author.displayName;
  const priceText =
    post.commerce?.currentBid != null
      ? formatINR(post.commerce.currentBid)
      : post.commerce?.price != null
        ? formatINR(post.commerce.price)
        : '';

  const headline =
    template === 'first_sale'
      ? 'Just Sold!'
      : template === 'buyer_purchase'
        ? 'Just Got It!'
        : template === 'highest_bid'
          ? 'New Highest Offer'
          : template === 'ending_soon'
            ? 'Ending Soon'
            : 'LIVE on InBidz';

  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#1a1a2e"/>
      <stop offset="100%" style="stop-color:#16213e"/>
    </linearGradient>
  </defs>
  <rect width="100%" height="100%" fill="url(#bg)"/>
  <text x="54" y="80" fill="#e94560" font-family="Arial,sans-serif" font-size="36" font-weight="bold">INBIDZ</text>
  <text x="54" y="130" fill="#ffffff" font-family="Arial,sans-serif" font-size="28">${escapeXml(headline)}</text>
  <rect x="54" y="180" width="${width - 108}" height="${isStory ? 900 : 520}" rx="16" fill="#0f3460"/>
  <text x="80" y="760" fill="#ffffff" font-family="Arial,sans-serif" font-size="32" font-weight="bold">${escapeXml(title)}</text>
  <text x="80" y="810" fill="#a0a0a0" font-family="Arial,sans-serif" font-size="24">@${escapeXml(artist)}</text>
  ${priceText ? `<text x="80" y="870" fill="#e94560" font-family="Arial,sans-serif" font-size="36" font-weight="bold">${escapeXml(priceText)}</text>` : ''}
  ${shortUrl ? `<text x="80" y="${height - 80}" fill="#53a8b6" font-family="Arial,sans-serif" font-size="22">${escapeXml(shortUrl)}</text>` : ''}
</svg>`;

  return new NextResponse(svg, {
    headers: {
      'Content-Type': 'image/svg+xml',
      'Cache-Control': 'public, max-age=300',
    },
  });
}

function escapeXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
