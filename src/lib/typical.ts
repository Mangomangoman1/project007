/**
 * "The typical new house of YEAR": pure helpers over src/data/typical-house.json, which
 * scripts/data-prep/typical_house.py builds from the US Census Bureau's Survey of Construction
 * (new single-family houses COMPLETED, US + four Census regions, 1971 on).
 *
 * Census marks are kept verbatim in the data: "NA" (not published: the category did not exist
 * yet, or no longer exists), "S" (withheld), "A" (too unreliable to publish), "Z" (under 0.5%).
 * Here a share is `value: number | null` (null = withheld) and categories that are "NA" for the
 * year are simply absent. Every helper takes the data as an argument, so tests can load the JSON.
 */
import type { HouseProfile } from './profile';
import { GEO_LABEL, type GeoId } from './regions.ts';

export type Cell = number | 'Z' | 'S' | 'A' | 'NA';
export type SourceRef = { table: string; file: string; url: string; from: number; to: number };
export type Relabel = { from?: number; to?: number; label: string; long?: string };
export type CatSpec = { id: string; label: string; long?: string; from?: number; to?: number; relabel?: Relabel[] };
export type CharSpec = {
  id: string;
  title: string;
  from: number;
  cats: CatSpec[];
  /** data[geo][year - from][catIndex] */
  data: Record<GeoId, Cell[][]>;
  sources: SourceRef[];
  /** A year where the categories were redefined (stories: 2009). */
  break?: number;
};
export type TypicalNote = { id: string; chars: string[]; from?: number; to?: number; break?: number; text: string };
export type TypicalData = {
  generated: string;
  firstYear: number;
  latestYear: number;
  source: { publisher: string; survey: string; series: string; url: string; universe: string };
  geos: { id: GeoId; label: string }[];
  completed: { from: number; data: Record<GeoId, number[]>; sources: SourceRef[] };
  sqft: { from: number; median: Record<GeoId, Cell[]>; average: Record<GeoId, Cell[]>; sources: SourceRef[] };
  chars: CharSpec[];
  notes: TypicalNote[];
  corrections: { char: string; geo: GeoId; year: number; cat: string; published: number; used: number; why: string }[];
};

export type Share = {
  id: string;
  label: string;
  long: string;
  /** Percent of new houses; null = withheld by the Census. "Z" (under 0.5%) is 0 with `under`. */
  value: number | null;
  under: boolean;
};
export type CharRecord = {
  id: string;
  title: string;
  shares: Share[];
  /** Percentage points the Census withheld this year (0 when every share is published). */
  withheld: number;
  /** The largest published share. */
  lead: Share | null;
  /** The runner-up, when it is within CLOSE points of the lead (so "brick or wood"). */
  close: Share | null;
  sources: SourceRef[];
  /** Notes about this characteristic that apply to this year (or to its series, for breaks). */
  notes: TypicalNote[];
  /** Years where this characteristic's categories change; drawn on the "over time" line. */
  breaks: number[];
};
export type TypicalRecord = {
  year: number;
  geo: GeoId;
  geoLabel: string;
  /** New single-family houses completed, in thousands. */
  completed: number | null;
  sqft: { median: number | null; average: number | null };
  chars: CharRecord[];
  /** Notes about the whole table that apply to this year. */
  notes: TypicalNote[];
};

/** Two shares within this many points read as a tie ("brick or wood"). */
export const CLOSE = 3;

const inRange = (x: { from?: number; to?: number }, year: number) => (x.from ?? 0) <= year && year <= (x.to ?? 9999);

/** Is there any data for this year? */
export const hasTypical = (data: TypicalData, year: number) => year >= data.firstYear && year <= data.latestYear;

function catLabel(cat: CatSpec, year: number): { label: string; long: string } {
  const r = cat.relabel?.find((x) => inRange(x, year));
  const label = r?.label ?? cat.label;
  return { label, long: r?.long ?? (r ? label : (cat.long ?? cat.label)) };
}

function noteApplies(n: TypicalNote, year: number) {
  return n.break !== undefined || inRange(n, year);
}

/** Years where a characteristic's category set or labels change. */
export function charBreaks(c: CharSpec): number[] {
  const ys = new Set<number>();
  if (c.break) ys.add(c.break);
  for (const cat of c.cats) {
    if (cat.from && cat.from > c.from) ys.add(cat.from);
    if (cat.to) ys.add(cat.to + 1);
    for (const r of cat.relabel ?? []) {
      if (r.from && r.from > c.from) ys.add(r.from);
      if (r.to) ys.add(r.to + 1);
    }
  }
  return [...ys].sort((a, b) => a - b);
}

function shareOf(cell: Cell): { value: number | null; under: boolean } | 'absent' {
  if (cell === 'NA') return 'absent';
  if (cell === 'Z') return { value: 0, under: true };
  if (cell === 'S' || cell === 'A') return { value: null, under: false };
  return { value: cell, under: false };
}

export function charRecord(data: TypicalData, c: CharSpec, year: number, geo: GeoId): CharRecord | null {
  const row = c.data[geo]?.[year - c.from];
  if (!row || year < c.from) return null;
  const shares: Share[] = [];
  c.cats.forEach((cat, i) => {
    const s = shareOf(row[i]);
    if (s === 'absent') return;
    shares.push({ id: cat.id, ...catLabel(cat, year), ...s });
  });
  if (!shares.length) return null;
  const published = shares.reduce((t, s) => t + (s.value ?? 0), 0);
  const anyWithheld = shares.some((s) => s.value === null);
  const ranked = shares.filter((s) => s.value !== null).sort((a, b) => b.value! - a.value!);
  const lead = ranked[0] ?? null;
  const second = ranked[1] ?? null;
  return {
    id: c.id,
    title: c.title,
    shares,
    withheld: anyWithheld ? Math.max(0, 100 - published) : 0,
    lead,
    close: lead && second && lead.value! - second.value! <= CLOSE && second.value! >= 20 ? second : null,
    sources: c.sources.filter((s) => inRange(s, year)),
    notes: data.notes.filter((n) => n.chars.includes(c.id) && noteApplies(n, year)),
    breaks: charBreaks(c),
  };
}

const sqftAt = (series: Cell[] | undefined, from: number, year: number) => {
  const v = series?.[year - from];
  return typeof v === 'number' ? v : null;
};

/** Everything the Census published for one year and geography, or null outside the data's years. */
export function typicalFor(data: TypicalData, year: number, geo: GeoId): TypicalRecord | null {
  if (!hasTypical(data, year)) return null;
  const chars = data.chars.map((c) => charRecord(data, c, year, geo)).filter((c): c is CharRecord => c !== null);
  const comp = data.completed.data[geo]?.[year - data.completed.from];
  return {
    year,
    geo,
    geoLabel: GEO_LABEL[geo],
    completed: typeof comp === 'number' ? comp : null,
    sqft: {
      median: sqftAt(data.sqft.median[geo], data.sqft.from, year),
      average: sqftAt(data.sqft.average[geo], data.sqft.from, year),
    },
    chars,
    notes: data.notes.filter((n) => n.chars.length === 0 && noteApplies(n, year)),
  };
}

export type SeriesPoint = { year: number; value: number | null };

/** One category's share across every year it is published (null = withheld). */
export function catSeries(data: TypicalData, charId: string, catId: string, geo: GeoId): SeriesPoint[] {
  const c = data.chars.find((x) => x.id === charId);
  if (!c) return [];
  const i = c.cats.findIndex((x) => x.id === catId);
  if (i < 0) return [];
  const out: SeriesPoint[] = [];
  c.data[geo].forEach((row, k) => {
    const s = shareOf(row[i]);
    if (s !== 'absent') out.push({ year: c.from + k, value: s.value });
  });
  return out;
}

/** Median square feet across the years (for the size line). */
export function sqftSeries(data: TypicalData, geo: GeoId): SeriesPoint[] {
  return data.sqft.median[geo].map((v, k) => ({ year: data.sqft.from + k, value: typeof v === 'number' ? v : null }));
}

// ---------------------------------------------------------------------------------------------
// The one-sentence summary
// ---------------------------------------------------------------------------------------------

const PHRASE: Record<string, Record<string, string>> = {
  stories: {
    one: 'one story',
    two: 'two stories',
    three: 'three stories or more',
    twoplus: 'two stories or more',
    split: 'split-level',
  },
  foundation: { basement: 'a basement', slab: 'a slab or other foundation', crawl: 'a crawl space' },
  wall: {
    brick: 'brick',
    wood: 'wood',
    stucco: 'stucco',
    vinyl: 'vinyl siding',
    fiber: 'fiber cement',
    other: 'other cladding',
  },
  fuel: { gas: 'gas', electric: 'electric', oil: 'oil', other: 'other' },
};

const pick = (c: CharRecord | undefined, words: Record<string, string>) => {
  if (!c?.lead) return null;
  const a = words[c.lead.id];
  const b = c.close ? words[c.close.id] : null;
  return b ? `${a} or ${b}` : a;
};

/**
 * "Most often: one story, on a slab or other foundation, with brick or wood outside, electric heat
 * and air-conditioning." Each part is that characteristic's most common category (two when they are
 * within CLOSE points), so it never claims the parts came together in one house.
 */
export function summarize(r: TypicalRecord): string | null {
  const by = Object.fromEntries(r.chars.map((c) => [c.id, c]));
  const parts: string[] = [];
  const st = by.stories;
  const tie = st?.lead && st.close ? [st.lead.id, st.close.id].sort().join('+') : '';
  const stories = tie === 'one+twoplus' ? 'one story or two' : tie === 'one+two' ? 'one or two stories' : pick(st, PHRASE.stories);
  if (stories) parts.push(stories);
  const found = pick(by.foundation, PHRASE.foundation);
  if (found) parts.push(`${by.foundation.lead!.id === 'slab' && !by.foundation.close ? 'on' : 'with'} ${found}`);
  const wall = by.wall?.lead ? pick(by.wall, { ...PHRASE.wall, other: r.year < 1992 ? 'vinyl, aluminum or other cladding' : 'other cladding' }) : null;
  if (wall) parts.push(`${wall} outside`);
  const fuel = by.fuel?.lead && by.fuel.lead.id !== 'other' ? pick(by.fuel, PHRASE.fuel) : null;
  if (fuel) parts.push(`${fuel} heat`);
  const ac = by.ac?.lead;
  if (ac) parts.push(ac.id === 'with' ? 'air-conditioning' : 'no air-conditioning');
  if (!parts.length) return null;
  const list = parts.length < 2 ? parts[0] : `${parts.slice(0, -1).join(', ')} and ${parts[parts.length - 1]}`;
  return `Most often: ${list}.`;
}

// ---------------------------------------------------------------------------------------------
// The visitor's own answers, where the categories line up
// ---------------------------------------------------------------------------------------------

export type Yours = {
  charId: string;
  /** Categories the answer corresponds to (summed). */
  catIds: string[];
  /** The visitor's answer, in words ("slab"). */
  answer: string;
  /** What the Census category is called, when it is not the same thing ("slab or other"). */
  census: string;
  /** Combined share, or null if any part was withheld. */
  share: number | null;
  /** A short honest caveat when the categories only roughly line up. */
  caveat?: string;
};

type AnswerMap = { charId: string; cats: (year: number) => string[]; answer: string; census?: (year: number) => string; caveat?: (year: number) => string | undefined };

/** Answer → Census categories. Only pairs that genuinely line up are listed. */
const PROFILE_MAP: Partial<Record<keyof HouseProfile, Record<string, AnswerMap>>> = {
  foundation: {
    basement: { charId: 'foundation', cats: () => ['basement'], answer: 'basement' },
    crawlspace: { charId: 'foundation', cats: () => ['crawl'], answer: 'crawl space' },
    slab: { charId: 'foundation', cats: () => ['slab'], answer: 'slab', census: () => 'slab or other' },
  },
  exterior: {
    wood: { charId: 'wall', cats: () => ['wood'], answer: 'wood' },
    stucco: { charId: 'wall', cats: () => ['stucco'], answer: 'stucco' },
    'fiber-cement': {
      charId: 'wall',
      cats: (y) => (y >= 2005 ? ['fiber'] : ['other']),
      answer: 'fiber cement',
      census: (y) => (y >= 2005 ? 'fiber cement' : 'other'),
      caveat: (y) => (y >= 2005 ? undefined : 'fiber cement was counted under other until 2005'),
    },
    'brick-stone': {
      charId: 'wall',
      cats: () => ['brick'],
      answer: 'brick or stone',
      census: () => 'brick',
      caveat: () => 'stone is counted under other',
    },
    'vinyl-aluminum': {
      charId: 'wall',
      cats: (y) => (y >= 1992 ? ['vinyl'] : ['other']),
      answer: 'vinyl or aluminum',
      census: (y) => (y >= 1992 ? 'vinyl siding' : 'other'),
      caveat: (y) => (y >= 1992 ? 'aluminum is counted under other' : 'vinyl and aluminum were counted under other until 1992'),
    },
  },
  heating: {
    'forced-air': { charId: 'system', cats: () => ['furnace'], answer: 'furnace' },
    'heat-pump': { charId: 'system', cats: (y) => (y >= 1978 ? ['heatpump'] : []), answer: 'heat pump' },
    boiler: { charId: 'system', cats: () => ['hotwater'], answer: 'boiler', census: () => 'hot water or steam' },
    'electric-resistance': {
      charId: 'system',
      cats: () => ['other'],
      answer: 'electric baseboard',
      census: () => 'other or none',
      caveat: () => 'the Census counts baseboard heat under other',
    },
  },
  cooling: {
    central: { charId: 'ac', cats: () => ['with'], answer: 'central air', census: () => 'with air-conditioning' },
    none: { charId: 'ac', cats: () => ['without'], answer: 'no central air', census: () => 'without air-conditioning' },
  },
  stories: {
    one: { charId: 'stories', cats: () => ['one'], answer: 'one floor', census: () => '1 story' },
    'two-plus': {
      charId: 'stories',
      cats: (y) => (y >= 2009 ? ['two', 'three'] : ['twoplus']),
      answer: 'two or more floors',
      census: () => '2 stories or more',
    },
  },
  chimney: {
    yes: { charId: 'fireplaces', cats: () => ['one', 'two'], answer: 'a fireplace or chimney', census: () => 'at least one fireplace' },
    no: { charId: 'fireplaces', cats: () => ['none'], answer: 'no fireplace', census: () => 'no fireplace' },
  },
};

/** Where the visitor's answers sit in this year's shares, for the categories that line up. */
export function yoursFor(r: TypicalRecord, profile: HouseProfile): Yours[] {
  const out: Yours[] = [];
  for (const [key, maps] of Object.entries(PROFILE_MAP) as [keyof HouseProfile, Record<string, AnswerMap>][]) {
    const v = profile[key];
    const m = v ? maps[v] : undefined;
    if (!m) continue;
    const c = r.chars.find((x) => x.id === m.charId);
    const ids = m.cats(r.year);
    if (!c || !ids.length) continue;
    const parts = ids.map((id) => c.shares.find((s) => s.id === id));
    if (parts.some((p) => !p)) continue;
    const share = parts.some((p) => p!.value === null) ? null : parts.reduce((t, p) => t + p!.value!, 0);
    out.push({
      charId: m.charId,
      catIds: ids,
      answer: m.answer,
      census: m.census?.(r.year) ?? m.answer,
      share,
      caveat: m.caveat?.(r.year),
    });
  }
  return out;
}

/** "56%" / "under 1%" / "withheld". */
export function pct(s: Pick<Share, 'value' | 'under'>): string {
  if (s.value === null) return 'withheld';
  if (s.under) return '<0.5%';
  return `${s.value}%`;
}

/** "1,755". */
export const thousands = (n: number) => n.toLocaleString('en-US');
