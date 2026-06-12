import type { Metadata } from 'next';
import type { ReactNode } from 'react';

const apiBase = (process.env.API_PUBLIC_URL || 'http://localhost:3001').replace(/\/$/, '');

export const metadata: Metadata = {
  metadataBase: new URL(apiBase),
  title: 'INBIDZ — Post it. Share it. Sell it.',
  description: 'Social commerce for creators',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
