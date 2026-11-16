import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { regionOfState, REGIONS, geoPhrase } from './regions.ts';
import { catSeries, charBreaks, hasTypical, pct, summarize, typicalFor, yoursFor, type TypicalData } from './typical.ts';

const data = JSON.parse(readFileSync(new URL('../data/typical-house.json', import.meta.url), 'utf8')) as TypicalData;
const share = (r: ReturnType<typeof typicalFor>, char: string, cat: string) =>
  r!.chars.find((c) => c.id === char)!.shares.find((s) => s.id === cat);

test('regions: every state and DC maps to exactly one Census region', () => {
  const all = REGIONS.flatMap((r) => r.states);
  assert.equal(all.length, 51);
  assert.equal(new Set(all).size, 51);
  assert.equal(regionOfState('TX'), 'S');
  assert.equal(regionOfState('dc'), 'S');
  assert.equal(regionOfState('PA'), 'NE');
  assert.equal(regionOfState('MO'), 'MW');
  assert.equal(regionOfState('HI'), 'W');
  assert.equal(regionOfState(null), null);
  assert.equal(regionOfState('PR'), null);
  assert.equal(geoPhrase('US'), 'across the US');
  assert.equal(geoPhrase('W'), 'in the West');
});

test('typicalFor: years outside the table give null', () => {
  assert.equal(typicalFor(data, 1970, 'US'), null);
  assert.equal(typicalFor(data, data.latestYear + 1, 'US'), null);
  assert.ok(hasTypical(data, 1971));
  assert.ok(!hasTypical(data, 1880));
});

test('typicalFor: the verified 1987 South figures', () => {
  const r = typicalFor(data, 1987, 'S')!;
  assert.equal(r.geoLabel, 'South');
  assert.equal(share(r, 'foundation', 'slab')!.value, 56);
  assert.equal(share(r, 'foundation', 'crawl')!.value, 25);
  assert.equal(share(r, 'foundation', 'basement')!.value, 20);
  assert.equal(share(r, 'ac', 'with')!.value, 92);
  assert.equal(r.sqft.median, 1755);
  assert.equal(r.completed, 467);
  assert.equal(r.chars.find((c) => c.id === 'foundation')!.lead!.id, 'slab');
});

test('categories that did not exist yet are absent, not zero', () => {
  const r = typicalFor(data, 1987, 'US')!;
  assert.equal(share(r, 'wall', 'vinyl'), undefined);
  assert.equal(share(r, 'wall', 'fiber'), undefined);
  assert.equal(share(r, 'stories', 'two'), undefined);
  assert.ok(share(r, 'stories', 'split'));
  assert.equal(share(r, 'wall', 'other')!.label, 'Other, incl. vinyl');
  const r2014 = typicalFor(data, 2014, 'US')!;
  assert.equal(share(r2014, 'fuel', 'oil'), undefined);
  assert.equal(share(r2014, 'fuel', 'other')!.label, 'Oil or other');
  // 1971: only foundation, fuel and garage were published.
  const r71 = typicalFor(data, 1971, 'US')!;
  assert.deepEqual(r71.chars.map((c) => c.id).sort(), ['foundation', 'fuel', 'garage']);
  assert.equal(r71.sqft.median, null);
});

test('withheld and under-0.5% cells', () => {
  const r = typicalFor(data, 1992, 'NE')!;
  const wall = r.chars.find((c) => c.id === 'wall')!;
  assert.equal(share(r, 'wall', 'stucco')!.value, null);
  assert.equal(wall.withheld, 8); // 5 + 39 + 48 published; stucco and other withheld
  const s = typicalFor(data, 1987, 'S')!;
  const oil = share(s, 'fuel', 'oil')!;
  assert.equal(oil.value, 0);
  assert.equal(oil.under, true);
  assert.equal(pct(oil), '<0.5%');
  assert.equal(pct({ value: null, under: false }), 'withheld');
});

test('notes follow the year; the stories break always shows', () => {
  const r = typicalFor(data, 1987, 'US')!;
  const wallNotes = r.chars.find((c) => c.id === 'wall')!.notes.map((n) => n.id);
  assert.ok(wallNotes.includes('vinyl'));
  const r2021 = typicalFor(data, 2021, 'US')!;
  assert.ok(!r2021.chars.find((c) => c.id === 'wall')!.notes.some((n) => n.id === 'vinyl'));
  assert.ok(r2021.chars.find((c) => c.id === 'fuel')!.notes.some((n) => n.id === 'oil'));
  assert.ok(r2021.chars.find((c) => c.id === 'stories')!.notes.some((n) => n.id === 'stories'));
  assert.ok(r.notes.some((n) => n.id === 'adjust'));
  assert.ok(!r2021.notes.some((n) => n.id === 'adjust'));
  const stories = data.chars.find((c) => c.id === 'stories')!;
  assert.ok(charBreaks(stories).includes(2009));
});

test('catSeries covers only the years a category exists', () => {
  const vinyl = catSeries(data, 'wall', 'vinyl', 'US');
  assert.equal(vinyl[0].year, 1992);
  assert.equal(vinyl[vinyl.length - 1].year, data.latestYear);
  const slab = catSeries(data, 'foundation', 'slab', 'S');
  assert.equal(slab.find((p) => p.year === 1987)!.value, 56);
  assert.equal(catSeries(data, 'nope', 'x', 'US').length, 0);
});

test('summarize: plain, one sentence, never claims more than the leads', () => {
  const s = summarize(typicalFor(data, 1987, 'S')!)!;
  assert.match(s, /^Most often: /);
  assert.match(s, /slab or other foundation/);
  assert.match(s, /electric heat/);
  assert.match(s, /air-conditioning\.$/);
  assert.match(s, /brick or wood|wood or brick/); // 34 vs 35: a tie
  const s75 = summarize(typicalFor(data, 1975, 'NE')!)!;
  assert.match(s75, /basement/);
  assert.match(s75, /no air-conditioning/);
});

test('yoursFor: only categories that line up, with the Census name', () => {
  const r = typicalFor(data, 1987, 'S')!;
  const y = yoursFor(r, { foundation: 'slab', cooling: 'central', gas: 'yes', roof: 'tile' });
  assert.equal(y.length, 2);
  const f = y.find((x) => x.charId === 'foundation')!;
  assert.equal(f.share, 56);
  assert.equal(f.census, 'slab or other');
  assert.equal(y.find((x) => x.charId === 'ac')!.share, 92);
  // Before 1992 vinyl sits inside "other".
  const v = yoursFor(r, { exterior: 'vinyl-aluminum' })[0];
  assert.deepEqual(v.catIds, ['other']);
  assert.match(v.caveat!, /until 1992/);
  // Two or more floors: one category before 2009, two summed after.
  assert.deepEqual(yoursFor(r, { stories: 'two-plus' })[0].catIds, ['twoplus']);
  const r21 = typicalFor(data, 2021, 'US')!;
  const two = yoursFor(r21, { stories: 'two-plus' })[0];
  assert.deepEqual(two.catIds, ['two', 'three']);
  assert.equal(two.share, share(r21, 'stories', 'two')!.value! + share(r21, 'stories', 'three')!.value!);
  // Heat pumps were not counted before 1978.
  assert.equal(yoursFor(typicalFor(data, 1975, 'US')!, { heating: 'heat-pump' }).length, 0);
  // Withheld share stays null rather than a guess.
  const ne = yoursFor(typicalFor(data, 1987, 'NE')!, { exterior: 'stucco' })[0];
  assert.equal(ne.share, null);
  assert.deepEqual(yoursFor(r, {}), []);
});
