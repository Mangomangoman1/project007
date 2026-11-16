import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // Lets several builders run `next build` at once without sharing an output folder.
  distDir: process.env.NEXT_DIST_DIR || '.next',
};

export default nextConfig;
