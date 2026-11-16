// Run with `npm test` (node --test, TypeScript types stripped by Node).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  LIMITS,
  buildEmail,
  checkSubmission,
  cleanPage,
  cleanText,
  createRateLimiter,
  isErrorCode,
  isValidEmail,
  pageFromReferer,
  reportErrorHref,
} from './contact.ts';

const NOW = Date.UTC(2026, 10, 16, 21, 5, 30);
const base = { message: 'The 1972 report says aluminum wiring ended in 1972; my source says 1973.', t: NOW - 60_000 };

test('cleanText strips control and invisible characters', () => {
  assert.equal(cleanText('a\u0000b\u0007c​d‮e﻿'), 'abcde');
  assert.equal(cleanText('  one\n two\tthree  '), 'one two three');
  assert.equal(cleanText('line 1\r\nline 2\r\n\n\n\n\nline 3\u0085', true), 'line 1\nline 2\n\n\nline 3');
  assert.equal(cleanText(42), '');
  assert.equal(cleanText(undefined, true), '');
});

test('cleanPage keeps same-site paths and yearbuilt.house URLs only', () => {
  assert.equal(cleanPage('/built/1972'), '/built/1972');
  assert.equal(cleanPage('/issue/polybutylene#sources'), '/issue/polybutylene#sources');
  assert.equal(cleanPage('https://yearbuilt.house/built/1972?x=1'), '/built/1972?x=1');
  assert.equal(cleanPage('http://yearbuilt.house/built/1972'), null);
  assert.equal(cleanPage('https://evil.example/built/1972'), null);
  assert.equal(cleanPage('//evil.example/x'), null);
  assert.equal(cleanPage('/\\evil.example'), null);
  assert.equal(cleanPage('javascript:alert(1)'), null);
  assert.equal(cleanPage('built/1972'), null);
  assert.equal(cleanPage(''), null);
  assert.equal(cleanPage(`/${'a'.repeat(400)}`), null);
  assert.equal(cleanPage('/built/1972', 'http://localhost:3310'), '/built/1972');
});

test('isValidEmail', () => {
  for (const ok of ['a@b.co', 'first.last+tag@sub.example.org', '名前@例え.jp']) assert.ok(isValidEmail(ok), ok);
  for (const bad of ['', 'a', 'a@b', 'a@b.c', 'a b@c.com', 'a@@b.com', '.a@b.com', 'a..b@c.com', 'a@-b.com', 'a@b.com\nBcc: x@y.z', '<a@b.com>', `${'a'.repeat(65)}@b.com`])
    assert.ok(!isValidEmail(bad), bad);
});

test('checkSubmission: valid input is cleaned', () => {
  const r = checkSubmission(
    { ...base, page: 'https://yearbuilt.house/built/1972', source: '  https://www.cpsc.gov/x \n', email: ' me@example.com ' },
    NOW,
  );
  assert.equal(r.kind, 'ok');
  if (r.kind !== 'ok') return;
  assert.deepEqual(r.data, { message: base.message, page: '/built/1972', source: 'https://www.cpsc.gov/x', email: 'me@example.com' });
});

test('checkSubmission: a bad page is dropped, not rejected', () => {
  const r = checkSubmission({ ...base, page: 'https://elsewhere.example/' }, NOW);
  assert.equal(r.kind, 'ok');
  if (r.kind === 'ok') assert.equal(r.data.page, null);
});

test('checkSubmission: honeypot and too-fast are spam', () => {
  assert.deepEqual(checkSubmission({ ...base, website: 'http://spam' }, NOW), { kind: 'spam', reason: 'honeypot' });
  assert.deepEqual(checkSubmission({ ...base, t: NOW - 800 }, NOW), { kind: 'spam', reason: 'too-fast' });
  assert.deepEqual(checkSubmission({ ...base, t: String(NOW - 800) }, NOW), { kind: 'spam', reason: 'too-fast' });
  // missing / odd / future (skewed clock) timestamps are not held against anyone
  assert.equal(checkSubmission({ message: base.message }, NOW).kind, 'ok');
  assert.equal(checkSubmission({ ...base, t: 'soon' }, NOW).kind, 'ok');
  assert.equal(checkSubmission({ ...base, t: NOW + 30_000 }, NOW).kind, 'ok');
  assert.equal(checkSubmission({ ...base, t: NOW - LIMITS.minFillMs }, NOW).kind, 'ok');
});

test('checkSubmission: field errors', () => {
  assert.deepEqual(checkSubmission({ ...base, message: ' too short ' }, NOW), { kind: 'invalid', code: 'message-short', field: 'message' });
  assert.deepEqual(checkSubmission({ ...base, message: '\u0000\u0001\u0002\u0003\u0004\u0005\u0006\u0007\u0008abc' }, NOW).kind, 'invalid');
  assert.deepEqual(checkSubmission({ ...base, message: 'x'.repeat(4001) }, NOW), { kind: 'invalid', code: 'message-long', field: 'message' });
  assert.equal(checkSubmission({ ...base, message: 'x'.repeat(4000) }, NOW).kind, 'ok');
  assert.deepEqual(checkSubmission({ ...base, email: 'nope' }, NOW), { kind: 'invalid', code: 'email-invalid', field: 'email' });
  assert.deepEqual(checkSubmission({ ...base, source: 's'.repeat(501) }, NOW), { kind: 'invalid', code: 'source-long', field: 'source' });
  assert.deepEqual(checkSubmission({ ...base, message: 123 }, NOW), { kind: 'invalid', code: 'message-short', field: 'message' });
});

test('buildEmail: plain text, fields and time only', () => {
  const e = buildEmail(
    { message: 'Line one.\nLine two.', page: '/built/1972', source: 'https://www.cpsc.gov/x', email: 'me@example.com' },
    { from: 'Year Built <corrections@yearbuilt.house>', to: 'owner@example.org', sentAt: new Date(NOW) },
  );
  assert.deepEqual(e, {
    from: 'Year Built <corrections@yearbuilt.house>',
    to: ['owner@example.org'],
    subject: 'Correction: /built/1972',
    reply_to: 'me@example.com',
    text: [
      'A reader reported a possible error.',
      '',
      'Page:    https://yearbuilt.house/built/1972',
      'Source:  https://www.cpsc.gov/x',
      'Reply:   me@example.com',
      'Sent:    2026-11-16 21:05 UTC',
      '',
      'Message',
      '-------',
      'Line one.',
      'Line two.',
      '',
    ].join('\n'),
  });
  const g = buildEmail({ message: 'General note here.', page: null, source: null, email: null }, { from: 'f', to: 't', sentAt: new Date(NOW) });
  assert.equal(g.subject, 'Correction: general');
  assert.ok(!('reply_to' in g));
  assert.match(g.text, /Reply: {3}not given/);
});

test('rate limiter: 5 per window per key, then frees up', () => {
  const rl = createRateLimiter(5, 1000);
  for (let i = 0; i < 5; i++) assert.ok(rl.take('1.1.1.1', i));
  assert.ok(!rl.take('1.1.1.1', 10));
  assert.ok(rl.take('2.2.2.2', 10));
  assert.ok(rl.take('1.1.1.1', 1001));
});

test('helpers', () => {
  assert.equal(reportErrorHref('/built/1972'), '/corrections?page=/built/1972');
  assert.equal(reportErrorHref('/issue/a b'), '/corrections?page=/issue/a%20b');
  assert.equal(pageFromReferer('http://localhost:3310/corrections?page=/built/1972', 'http://localhost:3310'), '/built/1972');
  assert.equal(pageFromReferer('https://other.example/corrections?page=/built/1972', 'http://localhost:3310'), null);
  assert.equal(pageFromReferer(null, 'http://localhost:3310'), null);
  assert.ok(isErrorCode('not-configured'));
  assert.ok(!isErrorCode('toString'));
});
