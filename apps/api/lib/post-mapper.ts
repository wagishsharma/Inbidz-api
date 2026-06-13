import { getOrientation } from '@inbidz/shared';
import type { CommerceMode, Post, PostCommerce, PostMedia, UserProfile } from '@inbidz/shared';
import { resolveAvatarUrl } from './avatar-migration';
import { getPublicUrl } from './r2';

type ProfileRow = {
  user_id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  bio: string | null;
  is_seller: number;
  shop_name: string | null;
};

type PostRow = {
  id: string;
  user_id: string;
  caption: string | null;
  post_type: 'photo' | 'video' | 'carousel';
  commerce_mode: CommerceMode;
  status: string;
  like_count: number;
  comment_count: number;
  share_count: number;
  created_at: string;
  updated_at: string;
};

type MediaRow = {
  id: string;
  post_id: string;
  media_type: 'photo' | 'video';
  r2_key: string;
  public_url: string | null;
  thumbnail_r2_key?: string | null;
  thumbnail_url?: string | null;
  hls_url: string | null;
  width: number;
  height: number;
  duration: number | null;
  order_index: number;
};

type CommerceRow = {
  post_id: string;
  price: number | null;
  currency: string;
  inventory: number;
  sold_count: number;
  auction_start: string | null;
  auction_end: string | null;
  reserve_price: number | null;
  min_bid_increment: number | null;
  current_bid: number | null;
  bid_count: number;
};

function apiMediaBase(): string {
  return (process.env.API_PUBLIC_URL || 'http://localhost:3001').replace(/\/$/, '');
}

/** Resolve stored URLs for clients (LAN IP for dev uploads, R2 public domain for cloud). */
export function resolveMediaUrl(url: string | null | undefined, r2Key: string): string {
  if (r2Key.startsWith('dev/')) {
    return `${apiMediaBase()}/api/media/${r2Key.split('/').map(encodeURIComponent).join('/')}`;
  }

  let resolved = url?.trim() || getPublicUrl(r2Key);

  // Posts saved before API_PUBLIC_URL was set may have localhost in DB
  if (resolved.includes('localhost') && resolved.includes('/api/media/')) {
    const path = resolved.split('/api/media/')[1];
    if (path) resolved = `${apiMediaBase()}/api/media/${path}`;
  }

  if (
    resolved.startsWith('blob:') ||
    resolved.startsWith('data:') ||
    resolved.startsWith('file:') ||
    resolved.length > 2000
  ) {
    return getPublicUrl(r2Key);
  }

  return resolved;
}

export function mapProfile(row: ProfileRow, followerCount = 0, followingCount = 0): UserProfile {
  return {
    id: row.user_id,
    username: row.username,
    displayName: row.display_name,
    avatarUrl: resolveAvatarUrl(row.avatar_url),
    bio: row.bio ?? undefined,
    isSeller: Boolean(row.is_seller),
    shopName: row.shop_name ?? undefined,
    followerCount,
    followingCount,
  };
}

export function mapMedia(row: MediaRow): PostMedia {
  const url = resolveMediaUrl(row.public_url, row.r2_key);
  const thumbKey = row.thumbnail_r2_key?.trim();
  const thumbnailUrl =
    row.media_type === 'video' && (thumbKey || row.thumbnail_url) ?
      thumbKey ?
        resolveMediaUrl(row.thumbnail_url, thumbKey)
      : (row.thumbnail_url?.trim() ?? undefined)
    : undefined;

  return {
    id: row.id,
    type: row.media_type,
    url,
    thumbnailUrl: row.media_type === 'video' ? thumbnailUrl : undefined,
    hlsUrl: row.hls_url ?? undefined,
    width: row.width,
    height: row.height,
    orientation: getOrientation(row.width, row.height),
    duration: row.duration ? Number(row.duration) : undefined,
    orderIndex: row.order_index,
  };
}

export function mapCommerce(row: CommerceRow): PostCommerce {
  return {
    price: row.price ? Number(row.price) : undefined,
    currency: row.currency,
    inventory: row.inventory,
    soldCount: row.sold_count,
    auctionStart: row.auction_start ?? undefined,
    auctionEnd: row.auction_end ?? undefined,
    reservePrice: row.reserve_price ? Number(row.reserve_price) : undefined,
    minBidIncrement: row.min_bid_increment ? Number(row.min_bid_increment) : undefined,
    currentBid: row.current_bid ? Number(row.current_bid) : undefined,
    bidCount: row.bid_count,
  };
}

export function mapPost(
  row: PostRow,
  author: UserProfile,
  media: PostMedia[],
  commerce?: PostCommerce,
  isLiked = false,
  shortUrl?: string
): Post {
  return {
    id: row.id,
    userId: row.user_id,
    author,
    caption: row.caption ?? '',
    postType: row.post_type,
    commerceMode: row.commerce_mode,
    status: row.status as Post['status'],
    media,
    commerce,
    likeCount: row.like_count,
    commentCount: row.comment_count,
    shareCount: row.share_count,
    isLiked,
    shortUrl,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export const PROFILE_SELECT = `
  p.user_id, p.username, p.display_name, p.avatar_url, p.bio, p.is_seller, p.shop_name
`;
