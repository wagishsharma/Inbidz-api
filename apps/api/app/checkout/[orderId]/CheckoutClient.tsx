'use client';

import { useEffect, useState } from 'react';

type CheckoutData = {
  orderId: string;
  razorpayKeyId: string;
  razorpayOrderId: string;
  amount: number;
  currency: string;
  description: string;
  prefill?: { email?: string; name?: string };
};

type RazorpayResponse = {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
};

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => { open: () => void };
  }
}

type Props = {
  orderId: string;
  session: string;
  returnUrl: string;
  cancelUrl: string;
};

function loadRazorpayScript(): Promise<void> {
  if (window.Razorpay) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Could not load Razorpay. Check your connection and try again.'));
    document.head.appendChild(script);
  });
}

async function loadRazorpayWithRetry(): Promise<void> {
  try {
    await loadRazorpayScript();
  } catch (first) {
    await new Promise((r) => setTimeout(r, 800));
    await loadRazorpayScript().catch(() => {
      throw first;
    });
  }
}

export function CheckoutClient({ orderId, session, returnUrl, cancelUrl }: Props) {
  const [message, setMessage] = useState('Opening secure checkout…');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let opened = false;

    async function startCheckout() {
      try {
        const res = await fetch(`/api/orders/${orderId}/checkout`, {
          headers: { Authorization: `Bearer ${session}` },
        });
        const data = (await res.json()) as CheckoutData & { error?: string; message?: string };
        if (!res.ok) {
          throw new Error(data.message ?? data.error ?? 'Could not load checkout');
        }

        await loadRazorpayWithRetry();
        if (!window.Razorpay || opened) return;
        opened = true;

        const checkout = new window.Razorpay({
          key: data.razorpayKeyId,
          amount: Math.round(data.amount * 100),
          currency: data.currency,
          name: 'INBIDZ',
          description: data.description,
          order_id: data.razorpayOrderId,
          prefill: data.prefill,
          theme: { color: '#4630EB' },
          handler: async (response: RazorpayResponse) => {
            setMessage('Confirming payment…');
            const confirmRes = await fetch(`/api/orders/${orderId}/confirm`, {
              method: 'POST',
              headers: {
                Authorization: `Bearer ${session}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                razorpayOrderId: response.razorpay_order_id,
                razorpayPaymentId: response.razorpay_payment_id,
                razorpaySignature: response.razorpay_signature,
              }),
            });
            const confirmData = await confirmRes.json().catch(() => ({}));
            if (!confirmRes.ok) {
              throw new Error(
                typeof confirmData.message === 'string'
                  ? confirmData.message
                  : 'Payment confirmation failed'
              );
            }
            const successUrl = new URL(returnUrl);
            successUrl.searchParams.set('orderId', orderId);
            window.location.href = successUrl.toString();
          },
          modal: {
            ondismiss: () => {
              window.location.href = cancelUrl;
            },
          },
        });

        setMessage('Complete payment in the Razorpay window.');
        checkout.open();
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Checkout failed');
      }
    }

    startCheckout();
  }, [cancelUrl, orderId, returnUrl, session]);

  return (
    <main
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
        fontFamily: 'system-ui, sans-serif',
        background: '#F2F2F7',
        color: '#000',
      }}
    >
      <h1 style={{ fontSize: 20, marginBottom: 8 }}>INBIDZ checkout</h1>
      {error ? (
        <>
          <p style={{ color: '#DC2626', textAlign: 'center', maxWidth: 320 }}>{error}</p>
          <button
            type="button"
            onClick={() => {
              window.location.href = cancelUrl;
            }}
            style={{
              marginTop: 16,
              padding: '12px 20px',
              borderRadius: 8,
              border: 'none',
              background: '#4630EB',
              color: '#fff',
              fontWeight: 600,
            }}
          >
            Go back
          </button>
        </>
      ) : (
        <p style={{ color: '#3C3C43', textAlign: 'center' }}>{message}</p>
      )}
    </main>
  );
}
