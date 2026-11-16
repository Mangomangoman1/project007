'use client';

import { Analytics, type BeforeSendEvent } from '@vercel/analytics/next';
import { SpeedInsights } from '@vercel/speed-insights/next';

/** Report the page path only: drop any ?query (the issue index keeps its search text there) and #hash. */
function pathOnly<E extends { url: string }>(event: E): E {
  const u = new URL(event.url);
  return { ...event, url: `${u.origin}${u.pathname}` };
}

/**
 * Vercel Web Analytics (page views) and Speed Insights (Core Web Vitals). Both are cookie-less and
 * load their script from this site's own origin (`/_vercel/...`) on Vercel. Loaded only through
 * `Telemetry` (builds made on Vercel). What it records is described on /privacy.
 */
export function TelemetryScripts() {
  return (
    <>
      <Analytics beforeSend={(e: BeforeSendEvent) => pathOnly(e)} />
      <SpeedInsights beforeSend={(e) => pathOnly(e)} />
    </>
  );
}
