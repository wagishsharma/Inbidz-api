import crypto from 'crypto';
import Razorpay from 'razorpay';
import { randomUUID } from 'crypto';
import { executeQuery } from './database';

let razorpay: Razorpay | null = null;

function getRazorpay(): Razorpay {
  if (!razorpay) {
    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    if (!keyId || !keySecret) {
      throw new Error('Razorpay is not configured');
    }
    razorpay = new Razorpay({ key_id: keyId, key_secret: keySecret });
  }
  return razorpay;
}

export function isRazorpayConfigured(): boolean {
  return Boolean(process.env.RAZORPAY_KEY_ID?.trim() && process.env.RAZORPAY_KEY_SECRET?.trim());
}

export function isDevPaymentsEnabled(): boolean {
  return (
    process.env.NODE_ENV === 'development' &&
    process.env.DEV_PAYMENTS !== 'false' &&
    !isRazorpayConfigured()
  );
}

export function verifyPaymentSignature(
  razorpayOrderId: string,
  razorpayPaymentId: string,
  razorpaySignature: string
): boolean {
  const secret = process.env.RAZORPAY_KEY_SECRET?.trim();
  if (!secret) return false;
  const expected = crypto
    .createHmac('sha256', secret)
    .update(`${razorpayOrderId}|${razorpayPaymentId}`)
    .digest('hex');
  return expected === razorpaySignature;
}

export async function createDevBuyNowOrder(
  postId: string,
  buyerId: string,
  sellerId: string,
  amount: number,
  shipping?: Record<string, string>,
  offerId?: string,
  referrerUserId?: string
): Promise<{ orderId: string; devMode: true; amount: number }> {
  const orderId = randomUUID();
  await executeQuery(
    `INSERT INTO app_orders (id, post_id, buyer_id, seller_id, amount, currency, status, offer_id, referrer_user_id, shipping_json)
     VALUES (?, ?, ?, ?, ?, 'INR', 'pending', ?, ?, ?)`,
    [
      orderId,
      postId,
      buyerId,
      sellerId,
      amount,
      offerId ?? null,
      referrerUserId ?? null,
      shipping ? JSON.stringify(shipping) : null,
    ]
  );
  return { orderId, devMode: true, amount };
}

export async function confirmDevOrder(orderId: string, buyerId: string): Promise<boolean> {
  const rows = await executeQuery<
    { id: string; post_id: string; status: string; buyer_id: string }[]
  >('SELECT id, post_id, status, buyer_id FROM app_orders WHERE id = ? LIMIT 1', [orderId]);
  if (rows.length === 0 || rows[0].buyer_id !== buyerId || rows[0].status === 'paid') {
    return false;
  }
  await executeQuery(
    'UPDATE app_orders SET status = ?, razorpay_payment_id = ? WHERE id = ?',
    ['paid', `dev_${orderId}`, orderId]
  );
  await executeQuery(
    'UPDATE post_commerce SET sold_count = sold_count + 1, inventory = GREATEST(inventory - 1, 0) WHERE post_id = ?',
    [rows[0].post_id]
  );
  return true;
}

export async function createRazorpayOrder(
  amountInr: number,
  receipt: string,
  notes: Record<string, string>
): Promise<{ id: string; amount: number; currency: string }> {
  const rp = getRazorpay();
  const order = await rp.orders.create({
    amount: Math.round(amountInr * 100),
    currency: 'INR',
    receipt,
    notes,
  });
  return {
    id: order.id,
    amount: Number(order.amount),
    currency: order.currency,
  };
}

export async function createBuyNowOrder(
  postId: string,
  buyerId: string,
  sellerId: string,
  amount: number,
  shipping?: Record<string, string>,
  offerId?: string,
  referrerUserId?: string
): Promise<{ orderId: string; razorpayOrderId: string; razorpayKeyId: string }> {
  const orderId = randomUUID();
  const receipt = orderId.slice(0, 32);
  const rpOrder = await createRazorpayOrder(amount, receipt, {
    postId,
    buyerId,
    orderId,
  });

  await executeQuery(
    `INSERT INTO app_orders (id, post_id, buyer_id, seller_id, amount, currency, status, razorpay_order_id, offer_id, referrer_user_id, shipping_json)
     VALUES (?, ?, ?, ?, ?, 'INR', 'pending', ?, ?, ?, ?)`,
    [
      orderId,
      postId,
      buyerId,
      sellerId,
      amount,
      rpOrder.id,
      offerId ?? null,
      referrerUserId ?? null,
      shipping ? JSON.stringify(shipping) : null,
    ]
  );

  return {
    orderId,
    razorpayOrderId: rpOrder.id,
    razorpayKeyId: process.env.RAZORPAY_KEY_ID!,
  };
}

export async function confirmOrderPayment(
  razorpayOrderId: string,
  razorpayPaymentId: string
): Promise<{ orderId: string; postId: string; buyerId: string } | null> {
  const rows = await executeQuery<
    { id: string; post_id: string; buyer_id: string; status: string }[]
  >('SELECT id, post_id, buyer_id, status FROM app_orders WHERE razorpay_order_id = ? LIMIT 1', [
    razorpayOrderId,
  ]);
  if (rows.length === 0 || rows[0].status === 'paid') return null;

  const order = rows[0];
  await executeQuery(
    'UPDATE app_orders SET status = ?, razorpay_payment_id = ? WHERE id = ?',
    ['paid', razorpayPaymentId, order.id]
  );
  await executeQuery(
    'UPDATE post_commerce SET sold_count = sold_count + 1, inventory = GREATEST(inventory - 1, 0) WHERE post_id = ?',
    [order.post_id]
  );

  return { orderId: order.id, postId: order.post_id, buyerId: order.buyer_id };
}
