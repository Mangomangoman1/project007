'use client';

import dynamic from 'next/dynamic';

/**
 * Vercel Web Analytics + Speed Insights, only in builds made on Vercel. `BUILT_ON_VERCEL` is inlined
 * at build time by next.config.ts (`env`), so elsewhere this branch is dead code: local builds and
 * other hosts ship none of the analytics code and request nothing.
 */
const Scripts = process.env.BUILT_ON_VERCEL
  ? dynamic(() => import('./TelemetryScripts').then((m) => m.TelemetryScripts), { ssr: false })
  : null;

export function Telemetry() {
  return Scripts ? <Scripts /> : null;
}
