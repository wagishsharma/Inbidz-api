export type PostType = 'photo' | 'video' | 'carousel';
export type PostStatus = 'draft' | 'published' | 'archived';
export type CommerceMode =
  | 'none'
  | 'buy_now'
  | 'auction'
  | 'offers'
  | 'buy_now_and_offers';

export type OfferStatus =
  | 'pending'
  | 'countered'
  | 'accepted'
  | 'declined'
  | 'expired';

export type FeedMode = 'for_you' | 'following';

export type ShareMomentType =
  | 'post_live'
  | 'first_like'
  | 'first_bid'
  | 'highest_bid'
  | 'ending_soon'
  | 'first_sale'
  | 'buyer_purchase';

export type MediaOrientation = 'portrait' | 'landscape' | 'square';

export interface UserProfile {
  id: string;
  username: string;
  displayName: string;
  avatarUrl?: string;
  bio?: string;
  isSeller: boolean;
  shopName?: string;
  followerCount: number;
  followingCount: number;
  /** Present when the viewer is authenticated and viewing another user's profile */
  isFollowing?: boolean;
}

export interface PostComment {
  id: string;
  postId: string;
  userId: string;
  body: string;
  createdAt: string;
  author: Pick<UserProfile, 'id' | 'username' | 'displayName' | 'avatarUrl'>;
}

export interface PostMedia {
  id: string;
  type: 'photo' | 'video';
  url: string;
  thumbnailUrl?: string;
  hlsUrl?: string;
  width: number;
  height: number;
  orientation: MediaOrientation;
  duration?: number;
  orderIndex: number;
}

export interface PostCommerce {
  price?: number;
  currency: string;
  inventory: number;
  auctionStart?: string;
  auctionEnd?: string;
  reservePrice?: number;
  minBidIncrement?: number;
  currentBid?: number;
  bidCount: number;
  soldCount: number;
}

export interface Post {
  id: string;
  userId: string;
  author: UserProfile;
  caption: string;
  postType: PostType;
  commerceMode: CommerceMode;
  status: PostStatus;
  media: PostMedia[];
  commerce?: PostCommerce;
  likeCount: number;
  commentCount: number;
  shareCount: number;
  isLiked: boolean;
  shortUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Bid {
  id: string;
  postId: string;
  userId: string;
  amount: number;
  createdAt: string;
  bidder?: Pick<UserProfile, 'id' | 'username' | 'displayName' | 'avatarUrl'>;
}

export interface Offer {
  id: string;
  postId: string;
  buyerId: string;
  sellerId: string;
  amount: number;
  counterAmount?: number;
  message?: string;
  status: OfferStatus;
  expiresAt: string;
  createdAt: string;
}

export interface Conversation {
  id: string;
  postId?: string;
  buyerId: string;
  sellerId: string;
  lastMessageAt: string;
  unreadCount: number;
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  body: string;
  offerId?: string;
  createdAt: string;
}

export interface ShopProfile {
  userId: string;
  shopName: string;
  shippingPolicy?: string;
  payoutReady: boolean;
  setupComplete: boolean;
}

export interface Order {
  id: string;
  postId: string;
  buyerId: string;
  sellerId: string;
  amount: number;
  currency: string;
  status: 'pending' | 'paid' | 'shipped' | 'delivered' | 'cancelled';
  razorpayOrderId?: string;
  createdAt: string;
}

export interface ShareMoment {
  id: string;
  postId: string;
  momentType: ShareMomentType;
  shareImageUrl?: string;
  shortUrl: string;
  whatsappMessage: string;
}

export interface AuthUser {
  id: string;
  email?: string;
  name?: string;
  role?: string;
}
