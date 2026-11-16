// Run with `npm test` (node --test, TypeScript types stripped by Node).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { packLane, pickBand, placeNote, tickLabels, decades, type Domain } from './timeline.ts';
import type { Issue } from './types.ts';

const d: Domain = { min: 1880, max: 2026 };
type Item = Pick<Issue, 'applies' | 'kind'> & { id: string };
const mk = (id: string, from: number | null, to: number | null, kind: Issue['kind'] = 'present'): Item => ({
  id, kind, applies: { from, to, coreFrom: null, coreTo: null, startEdge: 'soft', endEdge: 'soft' },
});

test('packLane puts open-start missing bands in one shared row, longest drawn first', () => {
  const items = [mk('a', null, 1992, 'missing'), mk('b', null, 2010, 'missing'), mk('c', null, 1995, 'missing'), mk('p', 1950, 1990), mk('q', 1960, 1970)];
  const { rows, rowOf, order, sharedCount } = packLane(items, d);
  assert.equal(sharedCount, 3);
  assert.equal(rows, 3);
  assert.equal(rowOf.get(items[0]), 0);
  assert.equal(rowOf.get(items[1]), 0);
  assert.equal(rowOf.get(items[3]), 1);
  assert.equal(rowOf.get(items[4]), 2);
  assert.deepEqual(order.slice(0, 3).map((i) => i.id), ['b', 'c', 'a']);
});

test('packLane with a single missing band does not reserve a shared row', () => {
  const items = [mk('a', null, 1992, 'missing'), mk('p', 1995, 2000)];
  const { rows, sharedCount } = packLane(items, d);
  assert.equal(sharedCount, 0);
  assert.equal(rows, 2);
});

test('tickLabels never crowds labels on a phone', () => {
  const ticks = decades(d);
  const phone = tickLabels(ticks, 358 / 147);
  assert.equal(phone.has(1890), false);
  assert.equal(phone.has(1900), false); // 1880 and 1900 would collide
  assert.equal(phone.has(1880), true);
  assert.equal(phone.has(1920), true);
  const desk = tickLabels(ticks, 1248 / 147);
  assert.equal(desk.size, ticks.length);
});

test('pickBand prefers the nearest row and, on the shared row, the shortest band', () => {
  const c = [
    { item: 'long', y: 10, h: 5, from: 1880, to: 2010 },
    { item: 'short', y: 10, h: 5, from: 1880, to: 1992 },
    { item: 'below', y: 17, h: 5, from: 1950, to: 1990 },
  ];
  assert.equal(pickBand(c, 1980, 12), 'short');
  assert.equal(pickBand(c, 2000, 12), 'long');
  assert.equal(pickBand(c, 1960, 19), 'below');
  assert.equal(pickBand(c, 2020, 12), null);
  assert.equal(pickBand(c, 1960, 60), null);
});

test('placeNote keeps the annotation inside the container', () => {
  assert.deepEqual(placeNote(10, 240, 358), { left: 0, width: 240, pointer: 10 });
  assert.equal(placeNote(350, 240, 358).left, 118);
  assert.equal(placeNote(180, 240, 358).left, 60);
  assert.equal(placeNote(100, 500, 358, 0).width, 358);
});
