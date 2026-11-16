/**
 * "Report an error": validation, spam checks, rate limiting and the email body for
 * POST /api/corrections. Pure and import-free so `node --test` can run it (see contact.test.ts);
 * the request/response plumbing lives in contact-handler.ts.
 */

export const SITE_ORIGIN = 'https://yearbuilt.house';

export const LIMITS = {
  messageMin: 10,
  messageMax: 4000,
  sourceMax: 500,
  emailMax: 254,
  pageMax: 300,
  /** Largest request body accepted, in bytes (a full message is ~16 KB at most in UTF-8). */
  bodyMax: 32 * 1024,
  /** A form sent sooner than this after it was rendered is treated as a bot (silently). */
  minFillMs: 2500,
  /** Rate limit: at most `rateCount` sends per IP per `rateWindowMs`. */
  rateCount: 5,
  rateWindowMs: 10 * 60 * 1000,
} as const;

/** Codes the endpoint answers with (JSON `code`, or `?error=` on a plain form POST). */
export type ErrorCode =
  | 'message-short'
  | 'message-long'
  | 'email-invalid'
  | 'source-long'
  | 'too-large'
  | 'bad-request'
  | 'rate-limited'
  | 'not-configured'
  | 'send-failed';

export type Field = 'message' | 'email' | 'source';

export const FIELD_OF: Partial<Record<ErrorCode, Field>> = {
  'message-short': 'message',
  'message-long': 'message',
  'email-invalid': 'email',
  'source-long': 'source',
};

/** Reader-facing wording for each code (used by the form, with and without JavaScript). */
export const ERROR_TEXT: Record<ErrorCode, string> = {
  'message-short': `Say a little more: at least ${LIMITS.messageMin} characters.`,
  'message-long': `That is over ${LIMITS.messageMax.toLocaleString('en-US')} characters. Trim it a little, or send it in two parts.`,
  'email-invalid': 'That does not look like an email address. Check it, or leave it blank.',
  'source-long': `Keep the source under ${LIMITS.sourceMax} characters: one link or citation is enough.`,
  'too-large': 'That report is too long to send. Trim the message and try again.',
  'bad-request': 'Something went wrong reading the form. Please try again.',
  'rate-limited': 'You have sent several reports in a few minutes. Please wait ten minutes and try again.',
  'not-configured': 'The form is not available right now.',
  'send-failed': 'Your report could not be sent just now. Please try again in a few minutes.',
};

export const isErrorCode = (s: unknown): s is ErrorCode => typeof s === 'string' && Object.hasOwn(ERROR_TEXT, s);

/**
 * Removes control and invisible formatting characters. Keeps newlines and tabs only when
 * `multiline`; otherwise every run of whitespace becomes one space. Normalises line endings.
 */
export function cleanText(raw: unknown, multiline = false): string {
  if (typeof raw !== 'string') return '';
  let s = raw.normalize('NFC').replace(/\r\n?/g, '\n');
  // C0 (except \t \n), DEL, C1, zero-width and bidi controls, BOM.
  s = s.replace(/[\u0000-\u0008\u000B-\u001F\u007F-\u009F​-‏‪-‮⁠-⁩﻿]/g, '');
  if (multiline) {
    s = s
      .replace(/\t/g, '  ')
      .replace(/[  ]+$/gm, '')
      .replace(/\n{4,}/g, '\n\n\n');
  } else {
    s = s.replace(/\s+/g, ' ');
  }
  return s.trim();
}

/**
 * A same-site page reference: "/issue/x" or "https://yearbuilt.house/issue/x" → "/issue/x".
 * Anything else (other hosts, protocol-relative, javascript:, backslashes) → null.
 */
export function cleanPage(raw: unknown, origin = SITE_ORIGIN): string | null {
  const s = cleanText(raw);
  if (!s || s.length > LIMITS.pageMax || s.includes('\\')) return null;
  let url: URL;
  try {
    if (s.startsWith('/')) {
      if (s.startsWith('//')) return null;
      url = new URL(s, origin);
    } else {
      url = new URL(s);
      if (url.origin !== new URL(origin).origin) return null;
    }
  } catch {
    return null;
  }
  if (url.origin !== new URL(origin).origin) return null;
  const path = `${url.pathname}${url.search}${url.hash}`;
  return path.length <= LIMITS.pageMax ? path : null;
}

/** Pragmatic address check: one @, a dotted domain, no spaces or brackets, ≤ 254 characters. */
export function isValidEmail(s: string): boolean {
  if (s.length > LIMITS.emailMax) return false;
  const m = /^([^\s@<>()[\]",;:\\]+)@([^\s@<>()[\]",;:\\]+)$/.exec(s);
  if (!m) return false;
  const [, local, domain] = m;
  if (local.length > 64 || local.startsWith('.') || local.endsWith('.') || local.includes('..')) return false;
  const labels = domain.split('.');
  if (labels.length < 2) return false;
  if (!labels.every((l) => /^[a-z0-9¡-￿](?:[a-z0-9¡-￿-]*[a-z0-9¡-￿])?$/i.test(l))) return false;
  return /^[a-z¡-￿]{2,}$/i.test(labels[labels.length - 1]);
}

export type Submission = { message: string; page: string | null; source: string | null; email: string | null };

export type Checked =
  | { kind: 'ok'; data: Submission }
  | { kind: 'spam'; reason: 'honeypot' | 'too-fast' }
  | { kind: 'invalid'; code: ErrorCode; field?: Field };

/** Name of the hidden honeypot input. A person never sees it; a form-filling bot fills it. */
export const HONEYPOT = 'website';
/** Name of the hidden "rendered at" input (milliseconds since the epoch, set by the page's script). */
export const RENDERED_AT = 't';

/**
 * Checks one submission. `raw` is the parsed body (JSON object or form fields). Spam is checked
 * first so a bot never learns which rule it broke.
 *
 * Timing: the timestamp is set in the visitor's browser, so its clock may differ from the server's.
 * Only an elapsed time between 0 and `minFillMs` counts as too fast; a missing, odd or negative
 * value (no JavaScript, a skewed clock) is not held against anyone.
 */
export function checkSubmission(raw: Record<string, unknown>, now: number, origin = SITE_ORIGIN): Checked {
  if (cleanText(raw[HONEYPOT]) !== '') return { kind: 'spam', reason: 'honeypot' };
  const t = Number(raw[RENDERED_AT]);
  if (Number.isFinite(t) && t > 0) {
    const elapsed = now - t;
    if (elapsed >= 0 && elapsed < LIMITS.minFillMs) return { kind: 'spam', reason: 'too-fast' };
  }

  const message = cleanText(raw.message, true);
  if (message.length < LIMITS.messageMin) return { kind: 'invalid', code: 'message-short', field: 'message' };
  if (message.length > LIMITS.messageMax) return { kind: 'invalid', code: 'message-long', field: 'message' };

  const source = cleanText(raw.source);
  if (source.length > LIMITS.sourceMax) return { kind: 'invalid', code: 'source-long', field: 'source' };

  const email = cleanText(raw.email);
  if (email && !isValidEmail(email)) return { kind: 'invalid', code: 'email-invalid', field: 'email' };

  return {
    kind: 'ok',
    data: { message, page: cleanPage(raw.page, origin), source: source || null, email: email || null },
  };
}

/** The `page` a reader came from, read from a same-site Referer such as /corrections?page=/built/1972. */
export function pageFromReferer(referer: string | null, origin: string): string | null {
  if (!referer) return null;
  try {
    const u = new URL(referer);
    if (u.origin !== new URL(origin).origin) return null;
    return cleanPage(u.searchParams.get('page'), origin);
  } catch {
    return null;
  }
}

/** "/corrections?page=/built/1972": the link every "Report an error on this page" uses. */
export function reportErrorHref(path: string): string {
  return `/corrections?page=${encodeURIComponent(path).replace(/%2F/gi, '/')}`;
}

/** The JSON body for POST https://api.resend.com/emails. */
export type ResendEmail = { from: string; to: string[]; subject: string; text: string; reply_to?: string };

const utcStamp = (d: Date) => `${d.toISOString().slice(0, 16).replace('T', ' ')} UTC`;

/** One plain-text email: the fields and the time, nothing else (no IP, no browser details). */
export function buildEmail(
  data: Submission,
  opts: { from: string; to: string; sentAt: Date; origin?: string },
): ResendEmail {
  const origin = opts.origin ?? SITE_ORIGIN;
  const where = data.page ?? 'general';
  const subject = `Correction: ${where.length > 120 ? `${where.slice(0, 119)}…` : where}`;
  const lines = [
    'A reader reported a possible error.',
    '',
    `Page:    ${data.page ? `${origin}${data.page}` : 'not given'}`,
    `Source:  ${data.source ?? 'not given'}`,
    `Reply:   ${data.email ?? 'not given (no reply possible)'}`,
    `Sent:    ${utcStamp(opts.sentAt)}`,
    '',
    'Message',
    '-------',
    data.message,
    '',
  ];
  const email: ResendEmail = { from: opts.from, to: [opts.to], subject, text: lines.join('\n') };
  if (data.email) email.reply_to = data.email;
  return email;
}

/**
 * Sliding-window limiter keyed by IP. Best effort only: it lives in one server instance's memory,
 * so on serverless each warm instance counts separately and a cold start forgets everything.
 */
export function createRateLimiter(limit: number = LIMITS.rateCount, windowMs: number = LIMITS.rateWindowMs) {
  const hits = new Map<string, number[]>();
  return {
    /** Records a hit and returns true when `key` is still within the limit. */
    take(key: string, now: number): boolean {
      const recent = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
      if (recent.length >= limit) {
        hits.set(key, recent);
        return false;
      }
      recent.push(now);
      hits.set(key, recent);
      if (hits.size > 5000) {
        for (const [k, v] of hits) if (v.every((t) => now - t >= windowMs)) hits.delete(k);
      }
      return true;
    },
    reset() {
      hits.clear();
    },
  };
}
