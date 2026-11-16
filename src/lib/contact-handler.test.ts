// Run with `npm test`. The handler with a mocked fetch: nothing is sent anywhere.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRateLimiter } from './contact.ts';
import { handleCorrection, type Deps, type Env } from './contact-handler.ts';

const NOW = Date.UTC(2026, 10, 16, 21, 5, 30);
const ENV: Env = { RESEND_API_KEY: 're_test_key', CONTACT_TO: 'owner@example.org' };
const valid = {
  message: 'The 1972 report says aluminum wiring ended in 1972; my source says 1973.',
  page: '/built/1972',
  source: 'https://www.cpsc.gov/x',
  email: 'reader@example.com',
  website: '',
  t: NOW - 60_000,
};

type Call = { url: string; init: RequestInit };

function setup(opts: { env?: Env; status?: number; throws?: boolean } = {}) {
  const calls: Call[] = [];
  const logs: string[] = [];
  const deps: Deps = {
    env: opts.env ?? ENV,
    fetch: (async (url: string | URL, init?: RequestInit) => {
      calls.push({ url: String(url), init: init ?? {} });
      if (opts.throws) throw new TypeError('fetch failed');
      const status = opts.status ?? 200;
      return new Response(JSON.stringify(status === 200 ? { id: 'mock-id' } : { message: 'nope' }), { status });
    }) as typeof fetch,
    now: () => NOW,
    log: (l) => logs.push(l),
    limiter: createRateLimiter(),
  };
  return { deps, calls, logs };
}

const jsonReq = (body: unknown, headers: Record<string, string> = {}) =>
  new Request('http://localhost:3310/api/corrections', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-forwarded-for': '203.0.113.9, 10.0.0.1', ...headers },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });

const formReq = (fields: Record<string, string | number>, headers: Record<string, string> = {}) =>
  new Request('http://localhost:3310/api/corrections', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded', ...headers },
    body: new URLSearchParams(Object.entries(fields).map(([k, v]) => [k, String(v)])).toString(),
  });

test('success: one Resend call with the exact payload', async () => {
  const { deps, calls, logs } = setup();
  const res = await handleCorrection(jsonReq(valid), deps);
  assert.equal(res.status, 200);
  assert.deepEqual(await res.json(), { ok: true });
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, 'https://api.resend.com/emails');
  assert.equal(calls[0].init.method, 'POST');
  const headers = calls[0].init.headers as Record<string, string>;
  assert.equal(headers.Authorization, 'Bearer re_test_key');
  const sent = JSON.parse(String(calls[0].init.body));
  assert.equal(sent.from, 'Year Built <corrections@yearbuilt.house>');
  assert.deepEqual(sent.to, ['owner@example.org']);
  assert.equal(sent.subject, 'Correction: /built/1972');
  assert.equal(sent.reply_to, 'reader@example.com');
  assert.match(sent.text, /Page: {4}https:\/\/yearbuilt\.house\/built\/1972/);
  assert.doesNotMatch(sent.text, /203\.0\.113\.9/, 'no IP address in the email');
  assert.deepEqual(logs, []);
});

test('success: CONTACT_FROM, the `resend` key name and a base URL override', async () => {
  const { deps, calls } = setup({
    env: { resend: 're_lower', CONTACT_TO: 'o@example.org', CONTACT_FROM: 'YB <x@yearbuilt.house>', RESEND_BASE_URL: 'http://127.0.0.1:4010/' },
  });
  const res = await handleCorrection(jsonReq({ ...valid, email: '' }), deps);
  assert.equal(res.status, 200);
  assert.equal(calls[0].url, 'http://127.0.0.1:4010/emails');
  assert.equal((calls[0].init.headers as Record<string, string>).Authorization, 'Bearer re_lower');
  const sent = JSON.parse(String(calls[0].init.body));
  assert.equal(sent.from, 'YB <x@yearbuilt.house>');
  assert.ok(!('reply_to' in sent));
});

test('plain form POST: 303 to ?sent=1, page recovered from the Referer', async () => {
  const { deps, calls } = setup();
  const res = await handleCorrection(
    formReq({ message: valid.message, page: '', website: '' }, { referer: 'http://localhost:3310/corrections?page=/issue/aluminum-wiring' }),
    deps,
  );
  assert.equal(res.status, 303);
  assert.equal(res.headers.get('location'), '/corrections?sent=1#sent');
  assert.equal(JSON.parse(String(calls[0].init.body)).subject, 'Correction: /issue/aluminum-wiring');
});

test('not configured: 503, one clear log line, nothing sent', async () => {
  for (const env of [{}, { RESEND_API_KEY: 'k' }, { CONTACT_TO: 'o@example.org' }] as Env[]) {
    const { deps, calls, logs } = setup({ env });
    const res = await handleCorrection(jsonReq(valid), deps);
    assert.equal(res.status, 503);
    assert.deepEqual(await res.json(), { ok: false, code: 'not-configured' });
    assert.equal(calls.length, 0);
    assert.equal(logs.length, 1);
    assert.match(logs[0], /not configured/);
  }
  const { deps } = setup({ env: {} });
  const res = await handleCorrection(formReq({ message: valid.message }), deps);
  assert.equal(res.status, 303);
  assert.equal(res.headers.get('location'), '/corrections?error=not-configured#e-not-configured');
});

test('Resend failure: 502, status logged, key never logged', async () => {
  const { deps, logs } = setup({ status: 422 });
  const res = await handleCorrection(jsonReq(valid), deps);
  assert.equal(res.status, 502);
  assert.deepEqual(await res.json(), { ok: false, code: 'send-failed' });
  assert.equal(logs.length, 1);
  assert.match(logs[0], /422/);
  assert.doesNotMatch(logs.join('\n'), /re_test_key/);

  const down = setup({ throws: true });
  const res2 = await handleCorrection(jsonReq(valid), down.deps);
  assert.equal(res2.status, 502);
  assert.doesNotMatch(down.logs.join('\n'), /re_test_key/);
});

test('honeypot: looks like success, nothing sent', async () => {
  const { deps, calls } = setup();
  const res = await handleCorrection(jsonReq({ ...valid, website: 'https://spam.example' }), deps);
  assert.equal(res.status, 200);
  assert.deepEqual(await res.json(), { ok: true });
  assert.equal(calls.length, 0);
  const form = await handleCorrection(formReq({ message: valid.message, website: 'x' }), deps);
  assert.equal(form.headers.get('location'), '/corrections?sent=1#sent');
  assert.equal(calls.length, 0);
});

test('too fast: looks like success, nothing sent', async () => {
  const { deps, calls } = setup();
  const res = await handleCorrection(jsonReq({ ...valid, t: NOW - 500 }), deps);
  assert.equal(res.status, 200);
  assert.equal(calls.length, 0);
});

test('invalid email: 400 with the field', async () => {
  const { deps, calls } = setup();
  const res = await handleCorrection(jsonReq({ ...valid, email: 'not an email' }), deps);
  assert.equal(res.status, 400);
  assert.deepEqual(await res.json(), { ok: false, code: 'email-invalid', field: 'email' });
  assert.equal(calls.length, 0);
  const form = await handleCorrection(formReq({ message: valid.message, email: 'x@' }), deps);
  assert.equal(form.headers.get('location'), '/corrections?error=email-invalid#e-email-invalid');
});

test('oversize: 413 by Content-Length and by streamed size', async () => {
  const { deps, calls } = setup();
  const big = JSON.stringify({ ...valid, message: 'x'.repeat(40_000) });
  const res = await handleCorrection(jsonReq(big), deps);
  assert.equal(res.status, 413);
  assert.deepEqual(await res.json(), { ok: false, code: 'too-large' });
  // no Content-Length: a stream
  const stream = new ReadableStream({
    start(c) {
      for (let i = 0; i < 10; i++) c.enqueue(new TextEncoder().encode('x'.repeat(8000)));
      c.close();
    },
  });
  const req = new Request('http://localhost:3310/api/corrections', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: stream,
    duplex: 'half',
  } as RequestInit);
  const res2 = await handleCorrection(req, deps);
  assert.equal(res2.status, 413);
  assert.equal(calls.length, 0);
});

test('rate limit: the sixth send in ten minutes from one IP gets 429', async () => {
  const { deps, calls } = setup();
  for (let i = 0; i < 5; i++) assert.equal((await handleCorrection(jsonReq(valid), deps)).status, 200);
  const res = await handleCorrection(jsonReq(valid), deps);
  assert.equal(res.status, 429);
  assert.deepEqual(await res.json(), { ok: false, code: 'rate-limited' });
  assert.equal(calls.length, 5);
  // another IP is unaffected
  assert.equal((await handleCorrection(jsonReq(valid, { 'x-forwarded-for': '198.51.100.4' }), deps)).status, 200);
});

test('bad requests: malformed JSON, wrong type, foreign Origin', async () => {
  const { deps, calls } = setup();
  assert.equal((await handleCorrection(jsonReq('{nope'), deps)).status, 400);
  assert.equal((await handleCorrection(jsonReq('[1,2]'), deps)).status, 400);
  const text = new Request('http://localhost:3310/api/corrections', { method: 'POST', headers: { 'content-type': 'text/plain' }, body: 'hi' });
  assert.equal((await handleCorrection(text, deps)).status, 303);
  const foreign = await handleCorrection(jsonReq(valid, { origin: 'https://evil.example', host: 'localhost:3310' }), deps);
  assert.equal(foreign.status, 400);
  const same = await handleCorrection(jsonReq(valid, { origin: 'http://localhost:3310', host: 'localhost:3310' }), deps);
  assert.equal(same.status, 200);
  assert.equal(calls.length, 1);
});
