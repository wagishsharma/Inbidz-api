import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { peekShortCode, getShortUrlBase } from '@/lib/share-service';
import { fetchPostById } from '@/lib/post-service';
import { formatINR } from '@inbidz/shared';
import { OpenInApp } from '@/components/OpenInApp';

function appBase(): string {
  return (process.env.APP_PUBLIC_URL || 'http://localhost:8081').replace(/\/$/, '');
}

function appScheme(): string {
  return process.env.APP_SCHEME || 'inbidz';
}

function apiBase(): string {
  return (process.env.API_PUBLIC_URL || 'http://localhost:3001').replace(/\/$/, '');
}

async function loadPost(code: string) {
  const postId = await peekShortCode(code);
  if (!postId) return null;
  return fetchPostById(postId);
}

/** Crawlers (WhatsApp, iMessage, etc.) choke on multi-MB originals; serve a resized JPEG from our API. */
function pickOgImage(post: NonNullable<Awaited<ReturnType<typeof loadPost>>>) {
  return `${apiBase()}/api/og-image?post=${post.id}`;
}

function sanitizeMetaText(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

function pickDisplayImage(post: NonNullable<Awaited<ReturnType<typeof loadPost>>>) {
  const photo = post.media.find((m) => m.type === 'photo');
  if (photo?.url) return photo.url;
  const video = post.media.find((m) => m.type === 'video');
  if (video?.thumbnailUrl) return video.thumbnailUrl;
  return pickOgImage(post);
}

function ogImageDimensions(post: NonNullable<Awaited<ReturnType<typeof loadPost>>>) {
  const media =
    post.media.find((m) => m.type === 'photo') ??
    post.media.find((m) => m.type === 'video' && m.thumbnailUrl) ??
    post.media[0];
  if (!media?.width || !media?.height) {
    return { width: 1200, height: 630 };
  }
  const scale = Math.min(1, 1200 / Math.max(media.width, media.height));
  return {
    width: Math.max(1, Math.round(media.width * scale)),
    height: Math.max(1, Math.round(media.height * scale)),
  };
}

export async function generateMetadata({
  params,
}: {
  params: { code: string };
}): Promise<Metadata> {
  const post = await loadPost(params.code);
  if (!post) {
    return { title: 'INBIDZ — Link not found' };
  }

  const rawTitle =
    post.caption?.trim().slice(0, 80) || `@${post.author.username} on INBIDZ`;
  const title = sanitizeMetaText(rawTitle);
  const price =
    post.commerce?.price != null
      ? formatINR(post.commerce.price)
      : post.commerce?.currentBid != null
        ? `High bid ${formatINR(post.commerce.currentBid)}`
        : null;
  const description = sanitizeMetaText(
    price
      ? `${price} · ${post.author.displayName} on INBIDZ`
      : `Post by ${post.author.displayName} on INBIDZ — Post it. Share it. Sell it.`
  );

  const ogImage = pickOgImage(post);
  const { width, height } = ogImageDimensions(post);
  const pageUrl = `${getShortUrlBase()}/${params.code}`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: pageUrl,
      siteName: 'INBIDZ',
      type: 'website',
      images: [{ url: ogImage, width, height, alt: title }],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [ogImage],
    },
  };
}

export default async function ShortLinkPage({ params }: { params: { code: string } }) {
  const post = await loadPost(params.code);
  if (!post) notFound();

  const appUrl = `${appBase()}/p/${params.code}`;
  const displayImage = pickDisplayImage(post);
  const title = post.caption?.trim().slice(0, 80) || `@${post.author.username}`;

  return (
    <main
      style={{
        margin: 0,
        minHeight: '100vh',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        background: '#0a0a0a',
        color: '#fff',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
        textAlign: 'center',
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={displayImage}
        alt=""
        style={{
          maxWidth: '100%',
          maxHeight: '55vh',
          borderRadius: 12,
          objectFit: 'contain',
          marginBottom: 24,
        }}
      />
      <p style={{ margin: '0 0 8px', fontSize: 13, color: '#a3a3a3', letterSpacing: 1 }}>
        INBIDZ
      </p>
      <h1 style={{ margin: '0 0 12px', fontSize: 22, fontWeight: 600, maxWidth: 480 }}>
        {title}
      </h1>
      <p style={{ margin: '0 0 28px', color: '#a3a3a3', fontSize: 15 }}>
        @{post.author.username}
      </p>
      <OpenInApp
        code={params.code}
        scheme={appScheme()}
        webUrl={appUrl}
        title={title}
      />
    </main>
  );
}
