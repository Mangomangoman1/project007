/**
 * POST /api/corrections, minus the Next.js file: takes a Web Request and returns a Response, with
 * the environment, fetch, clock and logger passed in so contact-handler.test.ts can run it with a
 * mocked fetch. src/app/api/corrections/route.ts wires in the real ones.
 *
 * Two kinds of caller:
 * - the enhanced form sends JSON and gets JSON back: `{ ok: true }` or `{ ok: false, code, field? }`;
 * - a plain HTML form POST (JavaScript off) is answered with a 303 to /corrections?sent=1#sent or
 *   /corrections?error=<code>#e-<code>; the fragment lets the static page show the state with :target.
 *
 * Nothing is stored. The email carries the fields and the time only; the IP is used in memory for
 * the rate limit and never sent or logged.
 */
import {
  LIMITS,
  buildEmail,
  checkSubmission,
  createRateLimiter,
  pageFromReferer,
  type ErrorCode,
  type Field,
} from './contact.ts';

export type Env = Partial<Record<'RESEND_API_KEY' | 'resend' | 'CONTACT_TO' | 'CONTACT_FROM' | 'RESEND_BASE_URL', string>>;

export type Deps = {
  env: Env;
  fetch: typeof fetch;
  now: () => number;
  log: (line: string) => void;
  limiter: ReturnType<typeof createRateLimiter>;
  /** Canonical origin used for page links in the email and same-site checks. */
  origin?: string;
};

export const DEFAULT_FROM = 'Year Built <corrections@yearbuilt.house>';
export const DEFAULT_RESEND_BASE = 'https://api.resend.com';

const STATUS: Record<ErrorCode, number> = {
  'message-short': 400,
  'message-long': 400,
  'email-invalid': 400,
  'source-long': 400,
  'bad-request': 400,
  'too-large': 413,
  'rate-limited': 429,
  'not-configured': 503,
  'send-failed': 502,
};

const NO_STORE = { 'Cache-Control': 'no-store' };

class TooLarge extends Error {}

/** Reads the body as text, stopping as soon as it passes `max` bytes (Content-Length can be absent). */
async function readLimited(request: Request, max: number): Promise<string> {
  const declared = Number(request.headers.get('content-length'));
  if (Number.isFinite(declared) && declared > max) throw new TooLarge();
  if (!request.body) return '';
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > max) {
      await reader.cancel().catch(() => {});
      throw new TooLarge();
    }
    chunks.push(value);
  }
  const all = new Uint8Array(size);
  let at = 0;
  for (const c of chunks) {
    all.set(c, at);
    at += c.byteLength;
  }
  return new TextDecoder().decode(all);
}

/** First address in X-Forwarded-For (set by Vercel), else X-Real-IP, else a shared bucket. */
export function clientIp(headers: Headers): string {
  const xff = headers.get('x-forwarded-for');
  if (xff) return xff.split(',')[0].trim() || 'unknown';
  return headers.get('x-real-ip')?.trim() || 'unknown';
}

/** A browser's Origin header, when present, must match the host it posted to. */
function sameOrigin(headers: Headers): boolean {
  const origin = headers.get('origin');
  if (!origin || origin === 'null') return true;
  let host: string;
  try {
    host = new URL(origin).host;
  } catch {
    return false;
  }
  const hosts = [headers.get('host'), headers.get('x-forwarded-host')].filter(Boolean).map((h) => h!.split(',')[0].trim());
  return hosts.includes(host);
}

export async function handleCorrection(request: Request, deps: Deps): Promise<Response> {
  const ctype = (request.headers.get('content-type') ?? '').split(';')[0].trim().toLowerCase();
  const isJson = ctype === 'application/json';
  const origin = deps.origin ?? 'https://yearbuilt.house';

  const answer = (result: { ok: true } | { ok: false; code: ErrorCode; field?: Field }): Response => {
    if (isJson) {
      return Response.json(result, { status: result.ok ? 200 : STATUS[result.code], headers: NO_STORE });
    }
    const location = result.ok ? '/corrections?sent=1#sent' : `/corrections?error=${result.code}#e-${result.code}`;
    return new Response(null, { status: 303, headers: { Location: location, ...NO_STORE } });
  };

  if (!sameOrigin(request.headers)) return answer({ ok: false, code: 'bad-request' });
  if (!isJson && ctype !== 'application/x-www-form-urlencoded') return answer({ ok: false, code: 'bad-request' });

  let raw: Record<string, unknown>;
  try {
    const text = await readLimited(request, LIMITS.bodyMax);
    if (isJson) {
      const parsed: unknown = JSON.parse(text);
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new SyntaxError('not an object');
      raw = parsed as Record<string, unknown>;
    } else {
      raw = Object.fromEntries(new URLSearchParams(text));
    }
  } catch (e) {
    return answer({ ok: false, code: e instanceof TooLarge ? 'too-large' : 'bad-request' });
  }

  const now = deps.now();
  const checked = checkSubmission(raw, now, origin);
  if (checked.kind === 'spam') {
    // Looks like success to the sender; nothing is sent.
    deps.log(`[corrections] dropped a submission (${checked.reason})`);
    return answer({ ok: true });
  }
  if (checked.kind === 'invalid') return answer({ ok: false, code: checked.code, field: checked.field });

  const data = checked.data;
  // With JavaScript off the page field cannot be prefilled; recover it from /corrections?page=… in the Referer.
  if (!data.page && !isJson) {
    const page = pageFromReferer(request.headers.get('referer'), new URL(request.url).origin);
    // the referer is checked against this deployment's own origin; the page itself must still be a site path
    data.page = page && page.startsWith('/') ? page : null;
  }

  const key = deps.env.RESEND_API_KEY || deps.env.resend;
  const to = deps.env.CONTACT_TO;
  if (!key || !to) {
    const missing = [!key && 'RESEND_API_KEY (or resend)', !to && 'CONTACT_TO'].filter(Boolean).join(' and ');
    deps.log(`[corrections] not configured: set ${missing} to send reports by email`);
    return answer({ ok: false, code: 'not-configured' });
  }

  if (!deps.limiter.take(clientIp(request.headers), now)) return answer({ ok: false, code: 'rate-limited' });

  const email = buildEmail(data, { from: deps.env.CONTACT_FROM || DEFAULT_FROM, to, sentAt: new Date(now), origin });
  const base = (deps.env.RESEND_BASE_URL || DEFAULT_RESEND_BASE).replace(/\/+$/, '');
  try {
    const res = await deps.fetch(`${base}/emails`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(email),
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) {
      deps.log(`[corrections] Resend answered ${res.status} ${res.statusText}`.trim());
      return answer({ ok: false, code: 'send-failed' });
    }
  } catch (e) {
    deps.log(`[corrections] could not reach Resend: ${e instanceof Error ? e.name : 'error'}`);
    return answer({ ok: false, code: 'send-failed' });
  }
  return answer({ ok: true });
}
