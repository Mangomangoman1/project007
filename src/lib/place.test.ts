// Run with `npm test` (node --test, TypeScript types stripped by Node).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import {
  BINS,
  binIndex,
  cleanZip,
  climateStatement,
  compareYear,
  decodeClimate,
  decodePlace,
  firmContext,
  housingFor,
  isValidZip,
  mainFuels,
  placeStatements,
  radonStatement,
  shardPath,
  type CountyFile,
  type CountyRecord,
  type ZipRecord,
  type ZipShard,
} from './place.ts';

test('ZIP input: digits only, five max, ZIP+4 trimmed', () => {
  assert.equal(cleanZip('83333'), '83333');
  assert.equal(cleanZip(' 10 001 '), '10001');
  assert.equal(cleanZip('06105-1234'), '06105');
  assert.equal(cleanZip('123456'), '12345');
  assert.equal(cleanZip('abc'), '');
  assert.equal(isValidZip('06105'), true);
  assert.equal(isValidZip('6105'), false);
  assert.equal(isValidZip('00000'), false);
  assert.equal(isValidZip('1000a'), false);
});

test('shard path is the 3-digit prefix and rejects bad ZIPs', () => {
  assert.equal(shardPath('06105'), '/place/zip/061.json');
  assert.equal(shardPath('99501'), '/place/zip/995.json');
  assert.throws(() => shardPath('123'));
});

test('climate codes decode, bad ones are null', () => {
  assert.deepEqual(decodeClimate('4AM'), { zone: 4, moisture: 'A', region: 'Mixed-Humid' });
  assert.deepEqual(decodeClimate('7-V'), { zone: 7, moisture: null, region: 'Very Cold' });
  assert.equal(decodeClimate('9AM'), null);
  assert.equal(decodeClimate(null), null);
  assert.match(climateStatement(decodeClimate('1AH')!), /Climate zone 1A \(Hot-Humid\)\. Cooling dominates.*humid/);
  assert.match(climateStatement(decodeClimate('6BC')!), /Heating dominates.*dry/);
  assert.match(climateStatement(decodeClimate('4CN')!), /Marine/);
  assert.match(climateStatement(decodeClimate('7-V')!), /^Climate zone 7 \(Very Cold\)/);
});

test('compareYear: uniform within a decade, larger side, honest edges', () => {
  // 10 equal bins of 10%
  const flat = Array(10).fill(10);
  // 1975: after = 1980s..2020+ (50) + 1970s * 4/10 (4) = 54
  assert.deepEqual(compareYear(flat, 1975), { kind: 'older', pct: 54 });
  // 2015: before = 80 + 10 * 5/10 = 85
  assert.deepEqual(compareYear(flat, 2015), { kind: 'newer', pct: 85 });
  assert.deepEqual(compareYear(flat, 1920), { kind: 'older-at-least', pct: 90 });
  assert.deepEqual(compareYear(flat, 2026), { kind: 'newest' });
  // the 2020+ bin runs 2020..2024 (5 years)
  assert.deepEqual(compareYear(flat, 2022), { kind: 'newer', pct: 94 });
  assert.equal(compareYear([], 1972), null);
  assert.equal(compareYear(Array(10).fill(0), 1972), null);
});

test('binIndex marks the right decade', () => {
  assert.equal(binIndex(1890), 0);
  assert.equal(binIndex(1939), 0);
  assert.equal(binIndex(1940), 1);
  assert.equal(binIndex(1972), 4);
  assert.equal(binIndex(2026), BINS.length - 1);
});

test('mainFuels keeps 5%+ shares, largest first', () => {
  assert.deepEqual(
    mainFuels([36, 2, 46, 6, 0, 5, 5]).map((f) => [f.id, f.pct]),
    [['electric', 46], ['gas', 36], ['oil', 6], ['other', 5], ['none', 5]],
  );
  assert.deepEqual(mainFuels([1, 1, 2, 0, 0, 0, 96]).map((f) => f.id), ['none']);
  assert.deepEqual(mainFuels(null), []);
});

const rec = (over: Partial<Record<number, unknown>> = {}): ZipRecord => {
  const r: ZipRecord = ['16013', 100, 1, 5549, 1994, [4, 1, 1, 1, 15, 17, 28, 24, 8, 1], 4943, [48, 2, 41, 1, 5, 3, 0]];
  for (const [k, v] of Object.entries(over)) (r as unknown[])[Number(k)] = v;
  return r;
};
const blaine: CountyRecord = ['Blaine County', 1, '6BC', [1978, 1978, 2000, 6], [15989, 1987, [4, 3, 2, 6, 23, 17, 20, 19, 5, 1], 10413, [46, 2, 42, 2, 6, 2, 0]]];

test('decodePlace and statements for a normal ZIP', () => {
  const p = decodePlace('83333', rec(), blaine);
  assert.equal(p.state, 'ID');
  assert.equal(p.radon, 1);
  assert.deepEqual(p.firm, { earliest: 1978, median: 1978, latest: 2000, communities: 6 });
  const s = placeStatements(p, 1972, 'Idaho');
  assert.equal(s.where, '83333 maps to Blaine County, Idaho.');
  assert.equal(s.spans, null);
  assert.equal(s.housingFrom, 'zip');
  assert.match(s.comparison!, /^Your 1972 house is older than about \d+% of homes in this ZIP\.$/);
  assert.equal(s.median, 'Half the homes in this ZIP were built before about 1994.');
  assert.match(s.fuels!, /gas about 48%, electricity about 41% and wood about 5%/);
  assert.match(s.radon!, /Zone 1: highest potential/);
  assert.equal(s.firm, 'Communities in Blaine County got their first flood insurance rate maps (FIRMs) between 1978 and 2000.');
});

test('multi-county ZIPs say so', () => {
  const p = decodePlace('59001', rec({ 0: '30095', 1: 94, 2: 2 }), ['Stillwater County', 1, '6BC']);
  assert.match(placeStatements(p, 1980).spans!, /touches 2 counties; about 94% of its land is in Stillwater County/);
});

test('tiny or empty ZIPs fall back to the county, or say nothing', () => {
  const tiny = decodePlace('83333', rec({ 3: 40, 4: null, 5: null, 6: 30, 7: null }), blaine);
  const t = housingFor(tiny);
  assert.equal(t.from, 'county');
  assert.match(t.note!, /only about 40 homes/);
  assert.match(placeStatements(tiny, 1972).comparison!, /homes in Blaine County/);
  const empty = decodePlace('33101', rec({ 3: 0, 4: null, 5: null, 6: 0, 7: null }), ['Hartford County', 3]);
  const e = housingFor(empty);
  assert.equal(e.from, null);
  assert.match(e.note!, /no homes/);
  assert.equal(placeStatements(empty, 1972).comparison, null);
});

test('radon and FIRM wording', () => {
  assert.equal(
    radonStatement(3, 'Hartford County'),
    'EPA puts Hartford County in Zone 3: low potential for indoor radon, a predicted county average below 2 pCi/L.',
  );
  const f = { earliest: 1978, median: 1985, latest: 2009, communities: 5 };
  assert.match(firmContext(f, 1960), /1974 cut-off/);
  assert.match(firmContext(f, 1976), /predates every first map/);
  assert.match(firmContext(f, 1990), /depends on which community/);
  assert.match(firmContext(f, 2015), /came after every first map/);
});

// Sanity checks against the committed data, when it is present.
const root = new URL('../../public/place/', import.meta.url);
const load = <T,>(p: string): T => JSON.parse(readFileSync(new URL(p, root), 'utf8')) as T;
test('committed data: known places', { skip: !existsSync(new URL('counties.json', root)) }, () => {
  const counties = load<CountyFile>('counties.json');
  const look = (zip: string) => {
    const shard = load<ZipShard>(shardPath(zip).replace('/place/', ''));
    return decodePlace(zip, shard[zip], counties[shard[zip][0]]);
  };
  const ny = look('10001');
  assert.equal(ny.county, 'New York County');
  assert.equal(ny.state, 'NY');
  assert.equal(ny.climate?.zone, 4);
  const ct = look('06105');
  assert.equal(ct.county, 'Hartford County');
  assert.ok(ct.radon);
  const va = look('22301');
  assert.equal(va.county, 'Alexandria city');
  assert.equal(va.state, 'VA');
  const ak = look('99501');
  assert.equal(ak.state, 'AK');
  assert.equal(ak.climate?.zone, 7);
  const id = look('83333');
  assert.equal(id.state, 'ID');
  assert.equal(id.county, 'Blaine County');
  for (const z of ['10001', '06105', '83333']) {
    const bins = look(z).housing!.bins!;
    assert.equal(bins.reduce((a, b) => a + b, 0), 100, `${z} bins sum to 100`);
  }
  // a ZIP with no ZCTA is not in its shard
  assert.equal(load<ZipShard>('zip/100.json')['10000'], undefined);
});
