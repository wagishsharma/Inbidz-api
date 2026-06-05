import { CheckoutClient } from './CheckoutClient';

type Props = {
  params: { orderId: string };
  searchParams: { token?: string; returnUrl?: string; cancelUrl?: string };
};

export default function CheckoutPage({ params, searchParams }: Props) {
  const token = searchParams.token?.trim();
  const returnUrl = searchParams.returnUrl?.trim() || 'inbidz://payment/success';
  const cancelUrl = searchParams.cancelUrl?.trim() || 'inbidz://payment/cancel';

  if (!token) {
    return (
      <main style={{ padding: 24, fontFamily: 'system-ui, sans-serif' }}>
        <h1>Checkout</h1>
        <p>Missing session. Open checkout from the INBIDZ app.</p>
      </main>
    );
  }

  return (
    <CheckoutClient
      orderId={params.orderId}
      token={token}
      returnUrl={returnUrl}
      cancelUrl={cancelUrl}
    />
  );
}
