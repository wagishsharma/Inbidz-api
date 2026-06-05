/** @type {import('next').NextConfig} */
const nextConfig = {
  // Allow atomic deploy builds (see deploy.sh) without touching the live .next folder
  distDir: process.env.NEXT_DIST_DIR || '.next',
  transpilePackages: ['@inbidz/shared'],
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**' },
    ],
  },
};

module.exports = nextConfig;
