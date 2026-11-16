// Run with `npm test` (node --test, TypeScript types stripped by Node).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { appliesTo, isCore, inState, sortIssues, lifeStatus, bandRange } from './select.ts';
import type { Issue } from './types.ts';

const base: Issue = {
  id: 'x', slug: 'x', title: 'X', category: 'electrical', hook: '', summary: '', kind: 'present',
  applies: { from: 1965, to: 1973, coreFrom: 1966, coreTo: 1972, startEdge: 'soft', endEdge: 'sharp' },
  regions: 'national', severity: 'money', priority: 2, evidence: 'era',
  prevalence: { label: 'possible', note: '' }, retrofit: false, where: ['wiring-outlets'],
  check: ['a'], action: '', sources: [],
};
const mk = (over: Partial<Issue>): Issue => ({ ...base, ...over });

test('appliesTo is inclusive and handles open ends', () => {
  assert.equal(appliesTo(base, 1965), true);
  assert.equal(appliesTo(base, 1973), true);
  assert.equal(appliesTo(base, 1964), false);
  assert.equal(appliesTo(base, 1974), false);
  const open = mk({ applies: { ...base.applies, from: null, to: null } });
  assert.equal(appliesTo(open, 1880), true);
  assert.equal(appliesTo(open, 2026), true);
});

test('isCore needs a stated core and the year inside it', () => {
  assert.equal(isCore(base, 1965), false);
  assert.equal(isCore(base, 1970), true);
  const noCore = mk({ applies: { ...base.applies, coreFrom: null, coreTo: null } });
  assert.equal(isCore(noCore, 1970), false);
  const openCore = mk({ applies: { ...base.applies, from: null, coreFrom: null, coreTo: 1950 } });
  assert.equal(isCore(openCore, 1900), true);
  assert.equal(isCore(openCore, 1960), false);
});

test('inState passes national issues and filters regional ones', () => {
  assert.equal(inState(base, 'CA'), true);
  const ca = mk({ regions: ['CA', 'OR'] });
  assert.equal(inState(ca, 'CA'), true);
  assert.equal(inState(ca, 'TX'), false);
  assert.equal(inState(ca, null), true);
});

test('sort: priority, then core, then severity', () => {
  const a = mk({ id: 'a', title: 'A', priority: 2, severity: 'money' });
  const b = mk({ id: 'b', title: 'B', priority: 1, severity: 'comfort' });
  const c = mk({ id: 'c', title: 'C', priority: 2, severity: 'safety', applies: { ...base.applies, coreFrom: null, coreTo: null } });
  const d = mk({ id: 'd', title: 'D', priority: 2, severity: 'safety' });
  assert.deepEqual(sortIssues([a, b, c, d], 1970).map((i) => i.id), ['b', 'd', 'a', 'c']);
});

test('lifeStatus buckets', () => {
  const l = { lifeLow: 10, lifeHigh: 15 };
  assert.equal(lifeStatus(l, 3), 'later');
  assert.equal(lifeStatus(l, 6), 'soon');
  assert.equal(lifeStatus(l, 10), 'due');
  assert.equal(lifeStatus(l, 15), 'due');
  assert.equal(lifeStatus(l, 16), 'past');
});

test('bandRange clamps open ends', () => {
  const r = bandRange(mk({ applies: { ...base.applies, from: null, to: null, coreFrom: null, coreTo: 1930 } }), 1880, 2026);
  assert.deepEqual(r, { from: 1880, to: 2026, coreFrom: 1880, coreTo: 1930, openStart: true, openEnd: true });
});
