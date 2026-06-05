import { z } from 'zod';

export const commerceModeSchema = z.enum([
  'none',
  'buy_now',
  'auction',
  'offers',
  'buy_now_and_offers',
]);

export const createPostSchema = z.object({
  caption: z.string().max(2200).default(''),
  postType: z.enum(['photo', 'video', 'carousel']),
  commerceMode: commerceModeSchema.default('none'),
  media: z
    .array(
      z.object({
        type: z.enum(['photo', 'video']),
        r2Key: z.string(),
        publicUrl: z.string().optional(),
        thumbnailR2Key: z.string().optional(),
        thumbnailPublicUrl: z.string().optional(),
        width: z.number().int().positive(),
        height: z.number().int().positive(),
        duration: z.number().optional(),
        orderIndex: z.number().int().min(0),
      })
    )
    .min(1)
    .max(10),
  commerce: z
    .object({
      price: z.number().positive().optional(),
      currency: z.string().default('INR'),
      inventory: z.number().int().min(1).default(1),
      auctionStart: z.string().datetime().optional(),
      auctionEnd: z.string().datetime().optional(),
      reservePrice: z.number().positive().optional(),
      minBidIncrement: z.number().positive().optional(),
    })
    .optional(),
  tags: z.array(z.string()).max(10).optional(),
});

export const shopSetupSchema = z.object({
  shopName: z.string().min(2).max(80),
  shippingPolicy: z.string().max(1000).optional(),
});

export const placeBidSchema = z.object({
  amount: z.number().positive(),
});

export const createOfferSchema = z.object({
  amount: z.number().positive(),
  message: z.string().max(500).optional(),
});

export const counterOfferSchema = z.object({
  counterAmount: z.number().positive(),
});

export const buyNowSchema = z.object({
  shippingAddressId: z.string().optional(),
  shippingAddress: z
    .object({
      name: z.string(),
      phone: z.string(),
      line1: z.string(),
      line2: z.string().optional(),
      city: z.string(),
      state: z.string(),
      pincode: z.string(),
    })
    .optional(),
});

export const confirmPaymentSchema = z.object({
  razorpayOrderId: z.string().min(1),
  razorpayPaymentId: z.string().min(1),
  razorpaySignature: z.string().min(1),
});

export const sendMessageSchema = z.object({
  body: z.string().min(1).max(2000),
});

export const followSchema = z.object({
  userId: z.string(),
});

export const createCommentSchema = z.object({
  body: z.string().min(1).max(1000),
});

export type CreatePostInput = z.infer<typeof createPostSchema>;
export type ShopSetupInput = z.infer<typeof shopSetupSchema>;
export type PlaceBidInput = z.infer<typeof placeBidSchema>;
export type CreateOfferInput = z.infer<typeof createOfferSchema>;
export type CreateCommentInput = z.infer<typeof createCommentSchema>;
