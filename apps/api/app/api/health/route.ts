import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    service: 'inbidz-app-api',
    status: 'ok',
    version: '1.0.0',
  });
}
