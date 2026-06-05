import { NextRequest, NextResponse } from 'next/server';

const isProd = process.env.NODE_ENV === 'production';

const ALLOWED_ORIGINS = [
  process.env.APP_PUBLIC_URL,
  ...(isProd
    ? []
    : ['http://localhost:8081', 'http://localhost:19006', 'http://localhost:3001']),
].filter(Boolean) as string[];

function isAllowedOrigin(origin: string): boolean {
  if (!origin) return false;
  if (ALLOWED_ORIGINS.includes(origin)) return true;

  // LAN / localhost — development only
  if (!isProd) {
    if (origin.includes('localhost')) return true;
    if (/^https?:\/\/192\.168\.\d+\.\d+(:\d+)?$/.test(origin)) return true;
    if (/^https?:\/\/10\.\d+\.\d+\.\d+(:\d+)?$/.test(origin)) return true;
  }

  return false;
}

export function middleware(request: NextRequest) {
  if (!request.nextUrl.pathname.startsWith('/api') && !request.nextUrl.pathname.startsWith('/auth')) {
    return NextResponse.next();
  }

  const origin = request.headers.get('origin') ?? '';
  const allowed = isAllowedOrigin(origin);

  if (request.method === 'OPTIONS') {
    return new NextResponse(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': allowed ? origin : ALLOWED_ORIGINS[0] ?? '',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-referral-code',
        'Access-Control-Allow-Credentials': 'true',
      },
    });
  }

  const response = NextResponse.next();
  if (allowed) {
    response.headers.set('Access-Control-Allow-Origin', origin);
    response.headers.set('Access-Control-Allow-Credentials', 'true');
  }
  return response;
}

export const config = {
  matcher: ['/api/:path*', '/auth/:path*'],
};
