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

function pickOgImage(post: NonNullable<Awaited<ReturnType<typeof loadPost>>>) {
  const photo = post.media.find((m) => m.type === 'photo');
  if (photo?.url) return photo.url;
  const first = post.media[0];
  if (first?.url && first.type === 'photo') return first.url;
  return `${apiBase()}/api/share-image?post=${post.id}&template=post_live`;
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

  const title = post.caption?.trim().slice(0, 80) || `@${post.author.username} on INBIDZ`;
  const price =
    post.commerce?.price != null
      ? formatINR(post.commerce.price)
      : post.commerce?.currentBid != null
        ? `High bid ${formatINR(post.commerce.currentBid)}`
        : null;
  const description = price
    ? `${price} · ${post.author.displayName} on INBIDZ`
    : `Post by ${post.author.displayName} on INBIDZ — Post it. Share it. Sell it.`;

  const ogImage = pickOgImage(post);
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
      images: [{ url: ogImage, alt: title }],
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
  const ogImage = pickOgImage(post);
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
        src={ogImage}
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
