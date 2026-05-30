import type { ShareMomentType } from './types';

export function getOrientation(
  width: number,
  height: number
): 'portrait' | 'landscape' | 'square' {
  const ratio = width / height;
  if (ratio > 1.1) return 'landscape';
  if (ratio < 0.9) return 'portrait';
  return 'square';
}

export function formatINR(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
}

export function getPostWhatsAppMessage(
  momentType: ShareMomentType,
  postTitle: string,
  shortUrl: string,
  extra?: { bidAmount?: number }
): string {
  const bid = extra?.bidAmount ? formatINR(extra.bidAmount) : '';

  switch (momentType) {
    case 'post_live':
      return `🎨 My post "${postTitle}" just went LIVE on InBidz!\n\nShop here → ${shortUrl}`;
    case 'first_bid':
      return `🎉 First offer on "${postTitle}"! Someone wants it.\n\nOffer now → ${shortUrl}`;
    case 'highest_bid':
      return `🔥 New highest offer: ${bid} on "${postTitle}"!\n\nBid now → ${shortUrl}`;
    case 'ending_soon':
      return `⏳ 10 minutes left! "${postTitle}" auction ends soon.\n\nLast chance → ${shortUrl}`;
    case 'first_sale':
      return `✨ Just sold "${postTitle}" on InBidz!\n\nSee my shop → ${shortUrl}`;
    case 'buyer_purchase':
      return `🛍️ I just got "${postTitle}" on InBidz!\n\nCheck it out → ${shortUrl}`;
    case 'first_like':
    default:
      return `Check out "${postTitle}" on InBidz → ${shortUrl}`;
  }
}

export function generateShortCode(length = 6): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let code = '';
  for (let i = 0; i < length; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}
