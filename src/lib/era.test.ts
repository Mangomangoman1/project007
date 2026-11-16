import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  MAX_EVENTS,
  MIN_POINTS,
  acsBin,
  ahsBand,
  aroundAxis,
  bandPhrase,
  bandShort,
  builtPhrase,
  countWords,
  countrySlice,
  decadeTotals,
  eventDistance,
  eventYears,
  eventsAround,
  homesWords,
  mainFuels,
  nearestCensus,
  ownershipYear,
  recsBand,
  sharePct,
  shareWords,
  stackMarks,
  startsComparison,
  startsIn,
  startsLandmarks,
  startsSentence,
  stockSlice,
  stockYours,
  usable,
  yb1950Band,
  type CensusData,
  type ConstructionData,
  type EventsData,
  type StockData,
} from './era.ts';

const load = <T,>(f: string) => JSON.parse(readFileSync(new URL(`../data/${f}`, import.meta.url), 'utf8')) as T;
const events = load<EventsData>('era-events.json');
const construction = load<ConstructionData>('era-construction.json');
const stock = load<StockData>('era-stock.json');
const census = load<CensusData>('era-census.json');
const MAX_YEAR = new Date().getFullYear();

// ---------------------------------------------------------------------------------- events

test('events: every year 1880 to today gets 4 to 8 events, none twice', () => {
  for (let y = 1880; y <= MAX_YEAR; y++) {
    const p = eventsAround(events, y);
    const all = [...p.exact, ...p.near, ...p.ongoing];
    assert.ok(all.length >= MIN_POINTS && all.length <= MAX_EVENTS, `${y}: ${all.length} events`);
    assert.equal(new Set(all.map((e) => e.id)).size, all.length, `${y}: duplicate`);
    for (const e of p.exact) assert.equal(e.year, y);
    for (const e of p.near) assert.ok(eventDistance(e, y) > 0 && eventDistance(e, y) <= p.window, `${y}: ${e.id} outside window`);
    for (const e of p.ongoing) assert.ok(e.year < y && y <= e.yearTo!, `${y}: ${e.id} not ongoing`);
    for (const e of all) assert.ok(e.sources.length > 0, `${e.id}: no source`);
  }
});

test('events: the year itself comes first, then neighbors, then ranges', () => {
  const p = eventsAround(events, 1947);
  assert.deepEqual(p.exact.map((e) => e.id), ['levittown-1947']);
  assert.ok(p.near.some((e) => e.id === 'veterans-emergency-housing'));
  assert.ok(p.ongoing.some((e) => e.id === 'fha-lending-disparity'));
  assert.equal(p.widened, false);
  // a thin decade widens the window and says so
  const thin = eventsAround(events, 1881);
  assert.ok(thin.widened && thin.window > 3);
  // a long range that merely ended nearby is not a "neighbor"
  assert.ok(!eventsAround(events, 1952).near.some((e) => e.id === 'gravity-furnaces'));
});

test('events: neighboring years differ (1952 vs 1953)', () => {
  const a = eventsAround(events, 1952);
  const b = eventsAround(events, 1953);
  assert.deepEqual(a.exact.map((e) => e.id), ['levittown-pennsylvania']);
  assert.equal(b.exact.length, 0);
  assert.ok(b.ongoing.some((e) => e.id === 'levittown-pennsylvania'));
});

test('events: years label and issue links', () => {
  assert.equal(eventYears({ year: 1947, precision: 'exact' }), '1947');
  assert.equal(eventYears({ year: 1950, precision: 'circa' }), 'c. 1950');
  assert.equal(eventYears({ year: 1908, yearTo: 1940, precision: 'range' }), '1908–1940');
  const al = events.events.find((e) => e.id === 'aluminum-branch-wiring')!;
  assert.equal(al.issue, 'aluminum-branch-wiring');
  // reference-tier events keep their tier for the tag
  const fha = events.events.find((e) => e.id === 'fha-lending-disparity')!;
  assert.equal(fha.sources[0].tier, 'reference');
});

test('events: axis stays inside 1880..today and keynotes never overlap', () => {
  assert.deepEqual(aroundAxis({ year: 1880, window: 3 }, 1880, 2026), { from: 1880, to: 1888 });
  assert.deepEqual(aroundAxis({ year: 2026, window: 6 }, 1880, 2026), { from: 2012, to: 2026 });
  assert.deepEqual(aroundAxis({ year: 1947, window: 2 }, 1880, 2026), { from: 1944, to: 1950 });
  assert.deepEqual(stackMarks([{ from: 10 }, { from: 12 }, { from: 30 }, { from: 11, to: 40 }], 6.5), [0, 1, 0, 2]);
});

// ---------------------------------------------------------------------------------- construction

test('construction: series, rounding and honest comparisons', () => {
  assert.equal(startsIn(construction, 1888), null);
  assert.equal(startsIn(construction, 1950), 1952);
  assert.equal(startsIn(construction, construction.to + 1), null);
  assert.equal(homesWords(1952, true), 'about 2 million');
  assert.equal(homesWords(937, true), 'about 940,000');
  assert.equal(homesWords(93, true), 'about 93,000');
  assert.equal(homesWords(1620.5, false), 'about 1.62 million');
  assert.equal(homesWords(554, false), 'about 554,000');
  assert.match(startsComparison(construction, 1950)!, /^more than in any earlier year on record/);
  assert.match(startsComparison(construction, 1972)!, /^the most of any year on record/);
  assert.match(startsComparison(construction, 1933)!, /^the fewest of any year on record/);
  assert.match(startsComparison(construction, 2009)!, /^the fewest since 1945/);
  assert.equal(startsSentence(construction, 1885), null);
  assert.match(startsSentence(construction, 1950)!, /^About 2 million new homes \(houses and apartments\) were started in 1950/);
});

test('construction: landmarks are found in the data', () => {
  const m = startsLandmarks(construction).map((x) => [x.year, x.label]);
  assert.deepEqual(m, [
    [1933, 'Depression low'],
    [1944, 'Wartime low'],
    [1950, 'Postwar peak'],
    [1972, 'Record'],
    [2009, 'Low'],
  ]);
  const d = decadeTotals(construction, 1925)!;
  assert.equal(d.started, 7004);
  assert.equal(d.standingStart, 17733);
  assert.equal(decadeTotals(construction, 1955), null);
});

// ---------------------------------------------------------------------------------- stock

test('stock: bands for build years', () => {
  assert.equal(recsBand(1880), 'Before 1950');
  assert.equal(recsBand(1955), '1950-1959');
  assert.equal(recsBand(2012), '2010-2015');
  assert.equal(recsBand(2021), null);
  assert.equal(ahsBand(1919), 'Before 1920');
  assert.equal(ahsBand(1925), '1920-1929');
  assert.equal(ahsBand(2023), '2010 or later');
  assert.equal(ahsBand(2024), null);
  assert.equal(bandPhrase('1920-1929'), 'the 1920s');
  assert.equal(bandPhrase('Before 1950'), 'before 1950');
  assert.equal(builtPhrase('1950-1959'), 'built in the 1950s');
  assert.equal(bandShort('2010-2015'), '2010–15');
  assert.equal(bandShort('Before 1920'), 'Pre-1920');
});

test('stock: slices carry the roof from RECS and finer AHS decades, rows add to ~100', () => {
  const s = stockSlice(stock, 1925);
  assert.equal(s.recsBand, 'Before 1950');
  assert.equal(s.ahsBand, '1920-1929');
  const roof = s.rows.find((r) => r.id === 'roof')!;
  assert.equal(roof.band, 'Before 1950');
  const us = roof.geo.US!;
  assert.ok(usable(us));
  assert.equal(us.v[roof.cats.findIndex((c) => c.id === 'asphalt')], 78);
  for (const r of s.rows) {
    const c = r.geo.US!;
    const sum = c.v.reduce((a, b) => a + b, 0);
    assert.ok(Math.abs(sum - 100) <= 3, `${r.id}: ${sum}`);
  }
  // nothing from fewer than 30 sampled homes is ever usable
  for (const v of stock.vars) for (const g of Object.values(v.data)) for (const c of Object.values(g)) if (c) assert.ok(c.n >= 30);
  assert.equal(usable({ n: 29, v: [100] }), false);
  // a year past both surveys has no rows
  assert.equal(stockSlice(stock, 2025).rows.length, 0);
});

test('stock: words, percents and the profile', () => {
  assert.equal(shareWords(78.3), 'about 4 in 5');
  assert.equal(shareWords(12.1), 'about 1 in 8');
  assert.equal(shareWords(50), 'about half');
  assert.equal(sharePct(0.3), '<1%');
  assert.equal(sharePct(48.6), '49%');
  assert.deepEqual(stockYours({}), []);
  const y = stockYours({ roof: 'tile', foundation: 'basement', roofX: 1 } as never);
  assert.deepEqual(
    y.map((x) => [x.rowId, x.catIds]),
    [
      ['roof', ['clay', 'concrete']],
      ['foundation', ['full', 'part']],
    ],
  );
  assert.equal(stockYours({ roof: 'flat' }).length, 0);
});

// ---------------------------------------------------------------------------------- census

test('census: nearest census, ownership year, ACS and 1950 bands', () => {
  assert.equal(nearestCensus(1880), 1940);
  assert.equal(nearestCensus(1944), 1940);
  assert.equal(nearestCensus(1952), 1950);
  assert.equal(nearestCensus(1955), 1960);
  assert.equal(nearestCensus(2004), 2000);
  assert.equal(nearestCensus(2015), null);
  assert.equal(ownershipYear(1892), 1900);
  assert.equal(ownershipYear(1925), 1930);
  assert.equal(acsBin(1925), 0);
  assert.equal(acsBin(1955), 2);
  assert.equal(acsBin(2026), 9);
  assert.equal(yb1950Band(1919), 0);
  assert.equal(yb1950Band(1947), 4);
  assert.equal(yb1950Band(1950), null);
  assert.equal(countWords(13623433), '13.6 million');
  assert.equal(countWords(940123), '940,000');
});

test('census: a slice has the US and states for the nearest census only', () => {
  const s = countrySlice(census, 1952);
  assert.equal(s.census, 1950);
  assert.equal(s.rows.US.plumb, 35.5);
  assert.ok(s.rows.OH.plumb! > 0);
  assert.deepEqual(
    mainFuels(s.fuels, s.rows.US).map((f) => f.id),
    ['coal', 'gas', 'oil', 'wood'],
  );
  assert.equal(s.stock.US.count, 13623433);
  assert.equal(s.yb1950, null);
  const early = countrySlice(census, 1925);
  assert.equal(early.census, 1940);
  assert.equal(early.yb1950!.US, 20.1);
  assert.equal(countrySlice(census, 1987).rows.US.sewer![0], 74.8);
  assert.deepEqual(countrySlice(census, 2015).rows, {});
});
