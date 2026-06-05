import * as jose from 'jose';
import { NextRequest, NextResponse } from 'next/server';

const CHECKOUT_PURPOSE = 'checkout';
const CHECKOUT_TTL = '15m';

type CheckoutClaims = {
  sub: string;
  orderId: string;
  purpose: string;
  email?: string;
  name?: string;
};

function getSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error('JWT_SECRET must be set and at least 32 characters');
  }
  return new TextEncoder().encode(secret);
}

export async function createCheckoutSession(
  orderId: string,
  buyerId: string,
  profile?: { email?: string; name?: string }
): Promise<string> {
  const jwt = new jose.SignJWT({
    orderId,
    purpose: CHECKOUT_PURPOSE,
    email: profile?.email,
    name: profile?.name,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(buyerId)
    .setExpirationTime(CHECKOUT_TTL)
    .setIssuedAt();

  return jwt.sign(getSecret());
}

async function verifyCheckoutToken(
  token: string,
  orderId: string
): Promise<CheckoutClaims | null> {
  const trimmed = token.trim();
  if (!trimmed || trimmed.split('.').length !== 3) return null;

  try {
    const { payload } = await jose.jwtVerify(trimmed, getSecret());
    if (payload.purpose !== CHECKOUT_PURPOSE) return null;
    if (payload.orderId !== orderId) return null;
    const sub = payload.sub;
    if (typeof sub !== 'string' || !sub) return null;
    return {
      sub,
      orderId: String(payload.orderId),
      purpose: CHECKOUT_PURPOSE,
      email: typeof payload.email === 'string' ? payload.email : undefined,
      name: typeof payload.name === 'string' ? payload.name : undefined,
    };
  } catch {
    return null;
  }
}

function getBearerToken(request: NextRequest): string | null {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;
  return authHeader.slice(7).trim() || null;
}

export type CheckoutAuth = {
  userId: string;
  orderId: string;
  email?: string;
  name?: string;
};

export async function requireCheckoutAuth(
  request: NextRequest,
  orderId: string
): Promise<CheckoutAuth | NextResponse> {
  const token = getBearerToken(request);
  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const claims = await verifyCheckoutToken(token, orderId);
  if (!claims) {
    return NextResponse.json({ error: 'Invalid or expired checkout session' }, { status: 401 });
  }

  return {
    userId: claims.sub,
    orderId: claims.orderId,
    email: claims.email,
    name: claims.name,
  };
}
