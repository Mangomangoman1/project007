// Run with `npm test` (node --test, TypeScript types stripped by Node).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { appliesTo, isCore, inState, sortIssues, lifeStatus, lifeStanding, groupLifespans, parseReplacedYear, bandRange } from './select.ts';
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

test('lifeStanding: stages by house age when nothing is known', () => {
  const heater = { lifeLow: 6, lifeHigh: 15 };
  assert.equal(lifeStanding(heater, 0).stage, 'later');
  assert.equal(lifeStanding(heater, 3).stage, 'soon');
  assert.equal(lifeStanding(heater, 6).stage, 'due');
  assert.equal(lifeStanding(heater, 15).stage, 'due');
  assert.deepEqual(lifeStanding(heater, 18), { stage: 'past', age: 18, known: false, by: 3 });
  // 1.5 × 15 = 22.5: beyond that an original heater is implausible
  assert.equal(lifeStanding(heater, 22).stage, 'past');
  assert.equal(lifeStanding(heater, 23).stage, 'cycled');
  // a 1972 house (54) and a fridge: replaced at least once, never "41 years past"
  assert.equal(lifeStanding({ lifeLow: 9, lifeHigh: 13 }, 54).stage, 'cycled');
  // long-lived parts whose first life ends around now stay informative
  assert.equal(lifeStanding({ lifeLow: 50, lifeHigh: 60 }, 54).stage, 'due');
  assert.equal(lifeStanding({ lifeLow: 40, lifeHigh: 50 }, 54).stage, 'past');
});

test('lifeStanding: a stated replacement year gives the part its own age', () => {
  const fridge = { lifeLow: 9, lifeHigh: 13 };
  const s = lifeStanding(fridge, 54, { lastReplaced: 2015, currentYear: 2026 });
  assert.deepEqual(s, { stage: 'due', age: 11, known: true, by: 0 });
  assert.equal(lifeStanding(fridge, 54, { lastReplaced: 2024, currentYear: 2026 }).stage, 'later');
  assert.equal(lifeStanding(fridge, 54, { lastReplaced: 2020, currentYear: 2026 }).stage, 'soon');
  // known but very old: "past", never "cycled"
  assert.equal(lifeStanding(fridge, 54, { lastReplaced: 1980, currentYear: 2026 }).stage, 'past');
  // a replacement year before the house was built is clamped to the house's age
  assert.equal(lifeStanding(fridge, 10, { lastReplaced: 1990, currentYear: 2026 }).age, 10);
});

test('groupLifespans orders each group usefully and counts nothing silly', () => {
  const ls = [
    { id: 'fridge', title: 'Fridge', lifeLow: 9, lifeHigh: 13 },
    { id: 'roof', title: 'Roof', lifeLow: 20, lifeHigh: 20 },
    { id: 'drain', title: 'Drain', lifeLow: 50, lifeHigh: 60 },
    { id: 'walk', title: 'Walk', lifeLow: 40, lifeHigh: 50 },
    { id: 'boiler', title: 'Boiler', lifeLow: 40, lifeHigh: 40 },
    { id: 'panel', title: 'Panel', lifeLow: 60, lifeHigh: 60 },
  ];
  const g = groupLifespans(ls, 54);
  assert.deepEqual(g.due.map((x) => x.item.id), ['drain']);
  assert.deepEqual(g.past.map((x) => x.item.id), ['walk', 'boiler']);
  assert.deepEqual(g.soon.map((x) => x.item.id), []);
  assert.deepEqual(g.later.map((x) => x.item.id), ['panel']);
  assert.deepEqual(g.cycled.map((x) => x.item.id), ['fridge', 'roof']);
  const g2 = groupLifespans(ls, 54, { replaced: { fridge: 2016 }, currentYear: 2026 });
  assert.deepEqual(g2.due.map((x) => x.item.id), ['fridge', 'drain']);
  assert.deepEqual(g2.cycled.map((x) => x.item.id), ['roof']);
  // a new house: nothing cycled, nothing past
  const g3 = groupLifespans(ls, 3);
  assert.equal(g3.cycled.length + g3.past.length + g3.due.length, 0);
});

test('parseReplacedYear accepts a year or a decade inside the house’s life', () => {
  assert.equal(parseReplacedYear('2015', 1972, 2026), 2015);
  assert.equal(parseReplacedYear(' 1972 ', 1972, 2026), 1972);
  assert.equal(parseReplacedYear('1960', 1972, 2026), null);
  assert.equal(parseReplacedYear('2030', 1972, 2026), null);
  assert.equal(parseReplacedYear('2010s', 1972, 2026), 2015);
  assert.equal(parseReplacedYear("1990's", 1972, 2026), 1995);
  assert.equal(parseReplacedYear('2020s', 1972, 2026), 2025);
  assert.equal(parseReplacedYear('2020s', 2024, 2026), 2025);
  assert.equal(parseReplacedYear('1970s', 1978, 2026), 1978);
  assert.equal(parseReplacedYear('1960s', 1972, 2026), null);
  assert.equal(parseReplacedYear('20', 1972, 2026), null);
  assert.equal(parseReplacedYear('', 1972, 2026), null);
});
