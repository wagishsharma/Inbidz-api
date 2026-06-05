import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { Platform } from 'react-native';
import { API_URL } from './config';
import { showAlert, showConfirm } from './alert';
import { formatINR } from '@inbidz/shared';
import { api } from './api';

export type BuyOrderResponse = {
  orderId: string;
  razorpayOrderId?: string;
  razorpayKeyId?: string;
  devMode?: boolean;
  amount: number;
  currency: string;
};

export async function openRazorpayCheckout(
  orderId: string,
  accessToken: string
): Promise<'success' | 'cancelled'> {
  const returnUrl = Linking.createURL('payment/success');
  const cancelUrl = Linking.createURL('payment/cancel');
  const checkoutUrl =
    `${API_URL}/checkout/${orderId}?` +
    new URLSearchParams({
      token: accessToken,
      returnUrl,
      cancelUrl,
    }).toString();

  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined') {
      window.location.href = checkoutUrl;
    }
    return 'success';
  }

  const result = await WebBrowser.openAuthSessionAsync(checkoutUrl, returnUrl);
  return result.type === 'success' ? 'success' : 'cancelled';
}

export async function completePurchase(
  order: BuyOrderResponse,
  accessToken: string
): Promise<'paid' | 'cancelled'> {
  if (order.devMode) {
    const confirmed = await showConfirm(
      'Test checkout',
      `Confirm test payment of ${formatINR(order.amount)}? (Razorpay not configured — dev mode)`
    );
    if (!confirmed) return 'cancelled';
    await api.confirmDevOrder(accessToken, order.orderId);
    showAlert('Paid!', 'Test order completed.');
    return 'paid';
  }

  if (!order.razorpayOrderId || !order.razorpayKeyId) {
    throw new Error('Payment details missing from server');
  }

  const result = await openRazorpayCheckout(order.orderId, accessToken);
  if (result === 'success') {
    showAlert('Paid!', 'Your order is confirmed.');
    return 'paid';
  }
  return 'cancelled';
}
