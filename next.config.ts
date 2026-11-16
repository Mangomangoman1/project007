import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // Lets several builders run `next build` at once without sharing an output folder.
  distDir: process.env.NEXT_DIST_DIR || '.next',
  // Inlined at build time: '1' only for builds made on Vercel (see src/components/Telemetry.tsx).
  env: { BUILT_ON_VERCEL: process.env.VERCEL ? '1' : '' },
};

export default nextConfig;
