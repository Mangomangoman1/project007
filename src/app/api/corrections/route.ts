import { createRateLimiter } from '@/lib/contact';
import { handleCorrection } from '@/lib/contact-handler';
import { SITE } from '@/lib/site';

// The one server route on an otherwise static site: "Report an error" (src/lib/contact-handler.ts).
export const runtime = 'nodejs';

// Best effort: one limiter per server instance (on serverless, per warm instance).
const limiter = createRateLimiter();

export async function POST(request: Request) {
  return handleCorrection(request, {
    env: {
      // The key may be saved as RESEND_API_KEY or, on the current Vercel project, as `resend`.
      RESEND_API_KEY: process.env.RESEND_API_KEY,
      resend: process.env.resend,
      CONTACT_TO: process.env.CONTACT_TO,
      CONTACT_FROM: process.env.CONTACT_FROM,
      // Testing only: point at a local mock instead of https://api.resend.com.
      RESEND_BASE_URL: process.env.RESEND_BASE_URL,
    },
    fetch,
    now: Date.now,
    log: (line) => console.error(line),
    limiter,
    origin: SITE.url,
  });
}
