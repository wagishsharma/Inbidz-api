export const metadata = {
  title: 'InBidz — Post it. Share it. Sell it.',
  description: 'Social commerce for creators',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
