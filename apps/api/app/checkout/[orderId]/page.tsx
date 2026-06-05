import { CheckoutClient } from './CheckoutClient';

type Props = {
  params: { orderId: string };
  searchParams: { session?: string; returnUrl?: string; cancelUrl?: string };
};

export default function CheckoutPage({ params, searchParams }: Props) {
  const session = searchParams.session?.trim();
  const returnUrl = searchParams.returnUrl?.trim() || 'inbidz://payment/success';
  const cancelUrl = searchParams.cancelUrl?.trim() || 'inbidz://payment/cancel';

  if (!session) {
    return (
      <main style={{ padding: 24, fontFamily: 'system-ui, sans-serif' }}>
        <h1>Checkout</h1>
        <p>Missing or expired checkout session. Start checkout again from the INBIDZ app.</p>
      </main>
    );
  }

  return (
    <CheckoutClient
      orderId={params.orderId}
      session={session}
      returnUrl={returnUrl}
      cancelUrl={cancelUrl}
    />
  );
}
