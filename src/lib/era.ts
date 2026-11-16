/**
 * "The year in context": pure helpers over the compiled era data (src/data/era-*.json, built by
 * scripts/build-era.mjs from research/). Every helper takes the data as an argument so tests can
 * load the JSON, and so server pages can cut each year's slice for the client.
 *
 *   events        dated homebuilding events (research/timeline.json)
 *   construction  new housing units started 1889 on, new-house prices 1963 on
 *   stock         homes standing today by era built: EIA RECS 2020 and Census/HUD AHS 2023
 *   census        decennial census housing tables 1940-2000, ACS homes by decade built, 1950 year built
 */
import type { HouseProfile } from './profile';
import { regionOfState, type GeoId } from './regions.ts';

// =============================================================================================
// Events
// =============================================================================================

export type EraTier = 'primary' | 'trade' | 'reference';
export type EraSource = { url: string; publisher: string; tier: EraTier; quote?: string };
export type EraEvent = {
  id: string;
  year: number;
  yearTo?: number;
  precision: 'exact' | 'circa' | 'range';
  category: string;
  title: string;
  text: string;
  /** Slug of the report issue this event is about: link there instead of repeating it. */
  issue?: string;
  issueTitle?: string;
  sources: EraSource[];
};
export type EventsData = { notes: string; events: EraEvent[] };

export const EVENT_CATEGORY: Record<string, string> = {
  materials: 'Materials',
  policy: 'Policy',
  electrical: 'Electrical',
  industry: 'Industry',
  codes: 'Codes',
  plumbing: 'Plumbing',
  hazmat: 'Hazardous materials',
  'heating-cooling': 'Heating & cooling',
  event: 'Event',
  'fire-safety': 'Fire safety',
};

/** Aim for at least this many dated events (the year's own plus its neighbors)... */
export const MIN_POINTS = 4;
/** ...and show at most this many of them, and at most MAX_EVENTS in all. */
export const MAX_POINTS = 6;
export const MAX_EVENTS = 8;
/** The window starts this many years either side and widens one year at a time. */
export const BASE_WINDOW = 3;
export const MAX_WINDOW = 12;
/** Long-running ranges shown at most. */
export const MAX_ONGOING = 3;
/** Ranges longer than this are only shown while the year falls inside them. */
export const LONG_RANGE = 20;

const TIER_RANK: Record<EraTier, number> = { primary: 0, trade: 1, reference: 2 };
const bestTier = (e: EraEvent) => Math.min(...e.sources.map((s) => TIER_RANK[s.tier]));

/** Years between an event and `year` (0 when the year falls inside its range). */
export function eventDistance(e: EraEvent, year: number): number {
  const to = e.yearTo ?? e.year;
  if (year < e.year) return e.year - year;
  if (year > to) return year - to;
  return 0;
}

export type EventPick = {
  year: number;
  /** Events dated to the year itself (ranges that start that year included). */
  exact: EraEvent[];
  /** The nearest dated events within `window` years either side, by year. */
  near: EraEvent[];
  /** Long-running ranges the year falls inside (started earlier), most specific first. */
  ongoing: EraEvent[];
  /** How far either side the nearby events reach (the furthest one shown). */
  window: number;
  /** The window had to grow past BASE_WINDOW because the record is thin around this year. */
  widened: boolean;
};

/**
 * The timeline events around a build year: that year's own events first, then the nearest ones
 * either side (the window grows from 3 years until there are about four dated events, up to 12),
 * then the long-running ranges the year sits inside. 4 to 8 events for every year 1880 to today.
 */
export function eventsAround(data: EventsData, year: number): EventPick {
  const all = data.events;
  const exact = all.filter((e) => e.year === year).sort((a, b) => bestTier(a) - bestTier(b) || a.title.localeCompare(b.title));
  const ongoing = all
    .filter((e) => e.yearTo !== undefined && e.year < year && year <= e.yearTo)
    .sort((a, b) => a.yearTo! - a.year - (b.yearTo! - b.year) || bestTier(a) - bestTier(b) || a.year - b.year);
  // Neighbors: dated events and short ranges (a decades-long range that merely ended nearby says little).
  const others = all.filter(
    (e) => e.year !== year && eventDistance(e, year) > 0 && (e.yearTo === undefined || e.yearTo - e.year <= LONG_RANGE),
  );
  let w = BASE_WINDOW;
  const within = (n: number) => others.filter((e) => eventDistance(e, year) <= n);
  while (exact.length + within(w).length < MIN_POINTS && w < MAX_WINDOW) w++;
  const room = Math.max(0, Math.min(MAX_POINTS, MAX_EVENTS) - exact.length);
  const near = within(w)
    .sort((a, b) => eventDistance(a, year) - eventDistance(b, year) || bestTier(a) - bestTier(b) || a.year - b.year)
    .slice(0, room)
    .sort((a, b) => a.year - b.year || a.title.localeCompare(b.title));
  const points = exact.length + near.length;
  const keep = Math.max(0, Math.min(MAX_ONGOING, MAX_EVENTS - points));
  const reach = near.length ? Math.max(...near.map((e) => eventDistance(e, year))) : w;
  return {
    year,
    exact,
    near,
    ongoing: ongoing.slice(0, keep),
    window: reach,
    widened: reach > BASE_WINDOW,
  };
}

/** "1947", "c. 1950", "1908–1940", "c. 1950–1969". */
export function eventYears(e: Pick<EraEvent, 'year' | 'yearTo' | 'precision'>): string {
  const c = e.precision === 'circa' ? 'c. ' : '';
  return e.yearTo && e.yearTo !== e.year ? `${c}${e.year}–${e.yearTo}` : `${c}${e.year}`;
}

/** Wikipedia-only (reference tier) events say so; they are never presented as government facts. */
export const eventTier = (e: EraEvent): EraTier => e.sources[0]?.tier ?? 'reference';

// =============================================================================================
// Annual construction
// =============================================================================================

type Series = { from: number; values: (number | null)[] };
export type ConstructionData = {
  from: number;
  to: number;
  /** First year of the Census permit-based private series; earlier years are historical estimates. */
  nrcFrom: number;
  /** Thousands of new housing units started, from `from` to `to`. */
  starts: (number | null)[];
  medianPrice: Series | null;
  avgCost: Series | null;
  oneFamily: Record<string, number>;
  decades: {
    standing: Record<string, number>;
    started: Record<string, number>;
    converted: Record<string, number>;
    demolished: Record<string, number>;
  };
  sources: Record<'hs' | 'starts' | 'price', { publisher: string; title: string; url: string }>;
  breaks: string[];
  fieldNotes: { total: string; avgCost: string; nrc: string };
};

const at = (s: Series | null, year: number) => {
  if (!s) return null;
  const v = s.values[year - s.from];
  return typeof v === 'number' ? v : null;
};

/** Thousands of homes started in `year`, or null outside the series. */
export function startsIn(c: ConstructionData, year: number): number | null {
  const v = c.starts[year - c.from];
  return typeof v === 'number' ? v : null;
}

export const isEstimate = (c: ConstructionData, year: number) => year < c.nrcFrom;

/** The whole series as points, for the chart. */
export const startsSeries = (c: ConstructionData) =>
  c.starts.map((v, i) => ({ year: c.from + i, value: typeof v === 'number' ? v : null }));

/** Median of every published year: "the long-run median". */
export function startsMedian(c: ConstructionData): number {
  const v = c.starts.filter((x): x is number => typeof x === 'number').sort((a, b) => a - b);
  const m = v.length >> 1;
  return v.length % 2 ? v[m] : (v[m - 1] + v[m]) / 2;
}

const sig = (x: number, digits: number) => (x === 0 ? 0 : Number(x.toPrecision(digits)));

/**
 * Homes in words from thousands: "about 2 million", "about 1.5 million", "about 940,000".
 * Historical estimates (before 1959) are rounded to two significant figures; the Census
 * permit-based series to three.
 */
export function homesWords(k: number, estimate: boolean): string {
  const n = sig(k * 1000, estimate ? 2 : 3);
  if (n >= 1_000_000) {
    const m = n / 1_000_000;
    return `about ${Number.isInteger(m) ? m : m.toFixed(estimate ? 1 : 2).replace(/0$/, '')} million`;
  }
  return `about ${n.toLocaleString('en-US')}`;
}

/** Short figure for the chart and cells: "2.0M", "940k". */
export function homesShort(k: number, estimate: boolean): string {
  const n = sig(k, estimate ? 2 : 3);
  return n >= 1000 ? `${(n / 1000).toFixed(n >= 10_000 ? 0 : estimate ? 1 : 2)}M` : `${n}k`;
}

/**
 * How the year compares, computed from the series only: "more than in any earlier year on
 * record", "the fewest since 1945", or against the long-run median, plus the change on the
 * year before when it is 3% or more. Null when the year has no value.
 */
export function startsComparison(c: ConstructionData, year: number): string | null {
  const v = startsIn(c, year);
  if (v === null) return null;
  const pts = startsSeries(c).filter((p): p is { year: number; value: number } => p.value !== null);
  const vals = pts.map((p) => p.value);
  const prior = pts.filter((p) => p.year < year);
  const prev = startsIn(c, year - 1);
  const median = startsMedian(c);
  const change =
    prev !== null && Math.abs(v / prev - 1) >= 0.03
      ? `${Math.round(Math.abs(v / prev - 1) * 100)}% ${v > prev ? 'more' : 'fewer'} than in ${year - 1}`
      : null;
  let rank: string;
  if (v === Math.max(...vals)) rank = `the most of any year on record (${c.from} to ${c.to})`;
  else if (v === Math.min(...vals)) rank = `the fewest of any year on record (${c.from} to ${c.to})`;
  else if (prior.length >= 5 && v > Math.max(...prior.map((p) => p.value))) rank = `more than in any earlier year on record`;
  else {
    const higher = [...prior].reverse().find((p) => p.value >= v);
    const lower = [...prior].reverse().find((p) => p.value <= v);
    if (higher && year - higher.year >= 5 && prev !== null && v > prev) rank = `the most since ${higher.year}`;
    else if (lower && year - lower.year >= 5 && prev !== null && v < prev) rank = `the fewest since ${lower.year}`;
    else {
      const r = v / median;
      const mid = homesWords(median, true).replace(/^about /, '');
      rank =
        r >= 1.15
          ? `well above the long-run median of about ${mid} a year`
          : r <= 0.85
            ? `well below the long-run median of about ${mid} a year`
            : `close to the long-run median of about ${mid} a year`;
    }
  }
  return change ? `${rank}, and ${change}` : rank;
}

/** "About 2 million new homes, houses and apartments together, were started in 1950, more than…" */
export function startsSentence(c: ConstructionData, year: number): string | null {
  const v = startsIn(c, year);
  if (v === null) return null;
  const words = homesWords(v, isEstimate(c, year));
  const cmp = startsComparison(c, year);
  const cap = words.charAt(0).toUpperCase() + words.slice(1);
  return `${cap} new homes (houses and apartments) were started in ${year}${cmp ? `, ${cmp}` : ''}.`;
}

/** Notable highs and lows, found in the series (never typed in): for chart annotations. */
export function startsLandmarks(c: ConstructionData): { year: number; value: number; label: string }[] {
  const pts = startsSeries(c).filter((p): p is { year: number; value: number } => p.value !== null);
  const pick = (from: number, to: number, kind: 'max' | 'min') => {
    const r = pts.filter((p) => p.year >= from && p.year <= to);
    if (!r.length) return null;
    return r.reduce((a, b) => ((kind === 'max' ? b.value > a.value : b.value < a.value) ? b : a));
  };
  const out: { year: number; value: number; label: string }[] = [];
  const add = (p: { year: number; value: number } | null, label: string) => {
    if (p && !out.some((o) => o.year === p.year)) out.push({ ...p, label });
  };
  add(pick(1929, 1939, 'min'), 'Depression low');
  add(pick(1940, 1945, 'min'), 'Wartime low');
  add(pick(1946, 1958, 'max'), 'Postwar peak');
  add(pick(c.from, c.to, 'max'), 'Record');
  add(pick(1960, c.to, 'min'), 'Low');
  return out.sort((a, b) => a.year - b.year);
}

export const medianPriceIn = (c: ConstructionData, year: number) => at(c.medianPrice, year);
export const avgCostIn = (c: ConstructionData, year: number) => at(c.avgCost, year);
export const oneFamilyIn = (c: ConstructionData, year: number): number | null => c.oneFamily[String(year)] ?? null;

/** The Historical Statistics decade totals (1890s to 1940s) for the year's decade, or null. */
export function decadeTotals(c: ConstructionData, year: number) {
  const d = Math.floor(year / 10) * 10;
  const key = `${d}-${d + 9}`;
  const started = c.decades.started[key];
  if (started === undefined) return null;
  return {
    decade: d,
    started,
    converted: c.decades.converted[key] ?? null,
    demolished: c.decades.demolished[key] ?? null,
    standingStart: c.decades.standing[String(d)] ?? null,
    standingEnd: c.decades.standing[String(d + 10)] ?? null,
  };
}

/** "$18,000". */
export const dollars = (n: number) => `$${Math.round(n).toLocaleString('en-US')}`;

// =============================================================================================
// Homes standing today (RECS 2020, AHS 2023)
// =============================================================================================

export type StockCell = { n: number; v: number[] } | null;
export type StockVar = {
  id: string;
  src: 'recs' | 'ahs';
  title: string;
  cats: { id: string; label: string; long?: string }[];
  data: Record<GeoId, Record<string, StockCell>>;
};
export type StockData = {
  bands: { recs: string[]; ahs: string[] };
  vars: StockVar[];
  recsSqft: Record<GeoId, Record<string, { mean: number; n: number } | null>>;
  sources: {
    recs: { publisher: string; title: string; url: string; universe: string; caveats: string[]; homes: number };
    ahs: { publisher: string; title: string; url: string; paper: string; universe: string; caveats: string[]; homes: number };
  };
};

/** Below this many sampled homes nothing is shown; below SMALL_N it is marked "small sample". */
export const MIN_N = 30;
export const SMALL_N = 100;

/** RECS 2020 band for a build year ("Before 1950" … "2016-2020"), or null after 2020. */
export function recsBand(year: number): string | null {
  if (year < 1950) return 'Before 1950';
  if (year <= 2009) {
    const d = Math.floor(year / 10) * 10;
    return `${d}-${d + 9}`;
  }
  if (year <= 2015) return '2010-2015';
  if (year <= 2020) return '2016-2020';
  return null;
}

/** AHS 2023 band ("Before 1920", "1920-1929" … "2010 or later"), or null after the survey year. */
export function ahsBand(year: number): string | null {
  if (year < 1920) return 'Before 1920';
  if (year <= 2009) {
    const d = Math.floor(year / 10) * 10;
    return `${d}-${d + 9}`;
  }
  if (year <= 2023) return '2010 or later';
  return null;
}

/** "the 1920s", "before 1920", "before 1950", "2010 to 2015", "2010 or later". */
export function bandPhrase(band: string): string {
  if (band.startsWith('Before')) return band.replace('Before', 'before');
  const m = /^(\d{4})-(\d{4})$/.exec(band);
  if (m && Number(m[2]) - Number(m[1]) === 9) return `the ${m[1]}s`;
  if (m) return `${m[1]} to ${m[2]}`;
  return band;
}

/** "built before 1950", "built in the 1950s", "built 2010 to 2015", "built 2010 or later". */
export function builtPhrase(band: string): string {
  const p = bandPhrase(band);
  return p.startsWith('the ') ? `built in ${p}` : `built ${p}`;
}

/** "1920s", "Pre-1920", "2010–15", "2010+": for headings and axis labels. */
export function bandShort(band: string): string {
  if (band.startsWith('Before')) return `Pre-${band.slice(7)}`;
  const m = /^(\d{4})-(\d{4})$/.exec(band);
  if (m && Number(m[2]) - Number(m[1]) === 9) return `${m[1]}s`;
  if (m) return `${m[1]}–${m[2].slice(2)}`;
  if (band === '2010 or later') return '2010+';
  return band;
}

/** Middle year of a band, for drawing bands on a year axis. */
export function bandMid(band: string): number {
  const m = /^(\d{4})-(\d{4})$/.exec(band);
  if (m) return (Number(m[1]) + Number(m[2])) / 2;
  if (band === 'Before 1920') return 1905;
  if (band === 'Before 1950') return 1925;
  if (band === '2010 or later') return 2016;
  return NaN;
}

/** One characteristic for one year's band, every geography (what a page passes to the client). */
export type StockRow = {
  id: string;
  src: 'recs' | 'ahs';
  title: string;
  band: string;
  cats: { id: string; label: string; long?: string }[];
  geo: Partial<Record<GeoId, StockCell>>;
  /** Per geography: the category leading in this band, and its share in every band (by era). */
  across: Partial<Record<GeoId, { cat: number; v: (number | null)[] }>>;
};
export type StockSlice = {
  year: number;
  recsBand: string | null;
  ahsBand: string | null;
  bands: { recs: string[]; ahs: string[] };
  rows: StockRow[];
  sqft: Partial<Record<GeoId, { mean: number; n: number } | null>>;
};

const lead = (v: number[]) => v.reduce((bi, x, i) => (x > v[bi] ? i : bi), 0);
/** Shares are shown as whole percents: the slice keeps whole numbers, and tenths only under 1. */
const trim = (x: number) => (x > 0 && x < 1 ? Math.round(x * 10) / 10 : Math.round(x));

/** Everything the "today" section needs for one build year, for every geography. */
export function stockSlice(data: StockData, year: number): StockSlice {
  const rb = recsBand(year);
  const ab = ahsBand(year);
  const rows: StockRow[] = [];
  for (const v of data.vars) {
    const band = v.src === 'recs' ? rb : ab;
    if (!band) continue;
    const bands = data.bands[v.src];
    const geo: StockRow['geo'] = {};
    const across: StockRow['across'] = {};
    for (const g of Object.keys(v.data) as GeoId[]) {
      const cell = v.data[g][band] ?? null;
      geo[g] = cell ? { n: cell.n, v: cell.v.map(trim) } : null;
      if (cell) {
        const cat = lead(cell.v);
        across[g] = { cat, v: bands.map((b) => { const c = v.data[g][b]; return c ? trim(c.v[cat]) : null; }) };
      }
    }
    rows.push({ id: v.id, src: v.src, title: v.title, band, cats: v.cats, geo, across });
  }
  const sqft: StockSlice['sqft'] = {};
  if (rb) for (const g of Object.keys(data.recsSqft) as GeoId[]) sqft[g] = data.recsSqft[g][rb] ?? null;
  return { year, recsBand: rb, ahsBand: ab, bands: data.bands, rows, sqft };
}

/** The share to show for a cell: null when the band was not sampled enough. */
export const usable = (cell: StockCell | undefined): cell is { n: number; v: number[] } => !!cell && cell.n >= MIN_N;

/** Whole-number percent for display: "78%", "<1%" for a share under half a point, "0%" for none. */
export function sharePct(v: number): string {
  if (v > 0 && v < 0.5) return '<1%';
  return `${Math.round(v)}%`;
}

/** "about 4 in 5", "about 1 in 8", "about half": plain words for a share. */
export function shareWords(pct: number): string {
  if (pct >= 47 && pct <= 53) return 'about half';
  if (pct >= 97) return 'nearly all';
  const options: [number, number][] = [[9, 10]];
  for (let d = 2; d <= 5; d++) for (let n = 1; n < d; n++) options.push([n, d]);
  for (const d of [6, 7, 8, 10, 12, 15, 20, 25, 50]) options.push([1, d]);
  let best = options[0];
  for (const o of options) {
    const err = Math.abs((o[0] / o[1]) * 100 - pct);
    const bestErr = Math.abs((best[0] / best[1]) * 100 - pct);
    if (err < bestErr - 0.5 || (Math.abs(err - bestErr) <= 0.5 && o[1] < best[1])) best = o;
  }
  return `about ${best[0]} in ${best[1]}`;
}

export type StockYours = { rowId: string; catIds: string[]; answer: string; caveat?: string };

type StockMap = { rowId: string; cats: string[]; answer: string; caveat?: string };
/** Profile answer → survey categories, only where they genuinely line up. */
const STOCK_PROFILE: Partial<Record<keyof HouseProfile, Record<string, StockMap>>> = {
  roof: {
    asphalt: { rowId: 'roof', cats: ['asphalt'], answer: 'asphalt shingles' },
    wood: { rowId: 'roof', cats: ['wood'], answer: 'wood shakes' },
    tile: { rowId: 'roof', cats: ['clay', 'concrete'], answer: 'tile', caveat: 'clay and concrete tile together' },
    metal: { rowId: 'roof', cats: ['metal'], answer: 'metal' },
  },
  exterior: {
    wood: { rowId: 'wall', cats: ['wood'], answer: 'wood' },
    stucco: { rowId: 'wall', cats: ['stucco'], answer: 'stucco' },
    'brick-stone': { rowId: 'wall', cats: ['brick', 'stone'], answer: 'brick or stone' },
    'vinyl-aluminum': { rowId: 'wall', cats: ['siding'], answer: 'vinyl or aluminum', caveat: 'the survey counts all siding together, fiber cement and steel too' },
    'fiber-cement': { rowId: 'wall', cats: ['siding'], answer: 'fiber cement', caveat: 'the survey counts all siding together, vinyl and aluminum too' },
  },
  foundation: {
    basement: { rowId: 'foundation', cats: ['full', 'part'], answer: 'basement', caveat: 'full and part basements together' },
    crawlspace: { rowId: 'foundation', cats: ['crawl'], answer: 'crawl space' },
    slab: { rowId: 'foundation', cats: ['slab'], answer: 'slab' },
  },
  stories: {
    one: { rowId: 'stories', cats: ['one'], answer: 'one floor' },
    'two-plus': { rowId: 'stories', cats: ['two', 'three'], answer: 'two or more floors' },
  },
  heating: {
    'forced-air': { rowId: 'heating', cats: ['furnace'], answer: 'furnace' },
    boiler: { rowId: 'heating', cats: ['boiler'], answer: 'boiler' },
    'heat-pump': { rowId: 'heating', cats: ['heatpump'], answer: 'heat pump' },
    'electric-resistance': { rowId: 'heating', cats: ['baseboard'], answer: 'electric baseboard' },
  },
  cooling: {
    central: { rowId: 'cooling', cats: ['central'], answer: 'central air' },
    none: { rowId: 'cooling', cats: ['room', 'none'], answer: 'no central air', caveat: 'room units and none together' },
  },
  chimney: {
    yes: { rowId: 'fireplace', cats: ['yes'], answer: 'a fireplace or chimney', caveat: 'the survey asks about a usable fireplace' },
    no: { rowId: 'fireplace', cats: ['no'], answer: 'no fireplace' },
  },
};

/** Where the visitor's answers sit among the surveyed categories (only pairs that line up). */
export function stockYours(profile: HouseProfile): StockYours[] {
  const out: StockYours[] = [];
  for (const [key, maps] of Object.entries(STOCK_PROFILE) as [keyof HouseProfile, Record<string, StockMap>][]) {
    const v = profile[key];
    const m = v ? maps[v] : undefined;
    if (m) out.push({ rowId: m.rowId, catIds: m.cats, answer: m.answer, ...(m.caveat ? { caveat: m.caveat } : {}) });
  }
  return out;
}

// =============================================================================================
// The country that decade
// =============================================================================================

export type CensusRow = {
  plumb?: number;
  noFlush?: number;
  /** [public sewer, septic or cesspool, other] percent */
  sewer?: [number, number, number];
  /** [public or private company, individual well, other] percent */
  water?: [number, number, number];
  /** heating fuel shares in `fuels` order (null = not tabulated that year) */
  fuel?: (number | null)[];
};
export type CensusData = {
  censusYears: number[];
  fuels: string[];
  years: Record<string, Record<string, CensusRow>>;
  notes: { plumbing: string[]; fuel: string[]; sewage: string[]; water: string[]; general: string[] };
  ownership: Record<string, Record<string, number | null>>;
  stock: {
    labels: string[];
    vintage: string;
    notes: string[];
    geos: Record<string, { total: number; counts: number[]; share: number[]; median: number }>;
  };
  yearBuilt1950: { bands: string[]; US: number[]; regions: Record<string, number[]>; note: string };
  sources: {
    census: { publisher: string; title: string; url: string; pages: Record<string, string> };
    acs: { publisher: string; title: string; url: string };
    yb1950: { publisher: string; title: string; url: string };
  };
};

export const FUEL_LABEL: Record<string, string> = {
  gas: 'utility gas',
  bottled: 'bottled gas',
  electric: 'electricity',
  oil: 'oil or kerosene',
  coal: 'coal or coke',
  wood: 'wood',
  other: 'other fuel',
  none: 'no fuel',
};

/** Last year the decennial census collected these details. */
export const LAST_CENSUS = 2000;

/**
 * The decennial census nearest a build year: 1940 (the earliest national housing census) for
 * anything earlier, the nearest decade through 2005, and null after (there is no later one).
 */
export function nearestCensus(year: number): number | null {
  if (year < 1940) return 1940;
  if (year > LAST_CENSUS + 5) return null;
  return Math.min(LAST_CENSUS, Math.round(year / 10) * 10);
}

/** Nearest homeownership census (1900-2000), or null after 2005. */
export function ownershipYear(year: number): number | null {
  if (year < 1900) return 1900;
  if (year > LAST_CENSUS + 5) return null;
  return Math.min(LAST_CENSUS, Math.round(year / 10) * 10);
}

/** Index into the ACS bins (oldest first: 1939 or earlier, 1940s … 2020 or later). */
export function acsBin(year: number): number {
  if (year < 1940) return 0;
  return Math.min(9, Math.floor((year - 1940) / 10) + 1);
}

/** "the 1950s", "1939 or earlier", "2020 or later". */
export function acsBinPhrase(i: number): string {
  if (i === 0) return '1939 or earlier';
  if (i === 9) return '2020 or later';
  return `the ${1930 + i * 10}s`;
}

/** Index into the 1950 census year-built bands (oldest first), or null for 1950 on. */
export function yb1950Band(year: number): number | null {
  if (year >= 1950) return null;
  if (year <= 1919) return 0;
  if (year <= 1929) return 1;
  if (year <= 1939) return 2;
  if (year <= 1944) return 3;
  return 4;
}

/** The main heating fuels of a census row: the largest first, those at 5% or more (at least one). */
export function mainFuels(fuels: string[], row: CensusRow | undefined): { id: string; pct: number }[] {
  if (!row?.fuel) return [];
  const all = row.fuel
    .map((v, i) => ({ id: fuels[i], pct: v }))
    .filter((f): f is { id: string; pct: number } => f.pct !== null && f.id !== 'none' && f.id !== 'other')
    .sort((a, b) => b.pct - a.pct);
  const big = all.filter((f) => f.pct >= 5);
  return (big.length ? big : all.slice(0, 1)).slice(0, 4);
}

/** One census year's facts for the US and every state (what a page passes to the client). */
export type CountrySlice = {
  year: number;
  census: number | null;
  rows: Record<string, CensusRow>;
  fuels: string[];
  ownYear: number | null;
  own: Record<string, number | null>;
  bin: number;
  stock: Record<string, { count: number; share: number }>;
  /** Median year built of every home standing today (ACS), US and states. */
  median: Record<string, number>;
  yb1950: { band: number; label: string; US: number; regions: Record<string, number> } | null;
};

export function countrySlice(data: CensusData, year: number): CountrySlice {
  const census = nearestCensus(year);
  const ownYear = ownershipYear(year);
  const bin = acsBin(year);
  const own: Record<string, number | null> = {};
  if (ownYear) for (const [g, r] of Object.entries(data.ownership)) own[g] = r[String(ownYear)] ?? null;
  const stock: CountrySlice['stock'] = {};
  const median: Record<string, number> = {};
  for (const [g, s] of Object.entries(data.stock.geos)) {
    stock[g] = { count: s.counts[bin], share: s.share[bin] };
    median[g] = s.median;
  }
  const yb = yb1950Band(year);
  return {
    year,
    census,
    rows: census ? data.years[String(census)] : {},
    fuels: data.fuels,
    ownYear,
    own,
    bin,
    stock,
    median,
    yb1950:
      yb === null
        ? null
        : {
            band: yb,
            label: data.yearBuilt1950.bands[yb],
            US: data.yearBuilt1950.US[yb],
            regions: Object.fromEntries(Object.entries(data.yearBuilt1950.regions).map(([k, v]) => [k, v[yb]])),
          },
  };
}

/** Region of a state for the 1950 table (which has regions, not states). */
export const regionFor = (state: string | null) => regionOfState(state);

/** "13.6 million", "940,000". */
export function countWords(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)} million`;
  if (n >= 10_000) return `${(Math.round(n / 1000) * 1000).toLocaleString('en-US')}`;
  return n.toLocaleString('en-US');
}

// =============================================================================================
// Drawing helpers
// =============================================================================================

/** The year axis of the "around" strip: the window plus a year of margin, inside 1880..maxYear. */
export function aroundAxis(pick: Pick<EventPick, 'year' | 'window'>, minYear: number, maxYear: number): { from: number; to: number } {
  const w = Math.max(pick.window, 2) + 1;
  let from = pick.year - w;
  let to = pick.year + w;
  if (from < minYear) {
    to += minYear - from;
    from = minYear;
  }
  if (to > maxYear) {
    from = Math.max(minYear, from - (to - maxYear));
    to = maxYear;
  }
  return { from, to };
}

/**
 * Stack keynote marks so none overlap: each mark (a point, or a short range from..to, in % of
 * the axis) takes the lowest level where it clears every mark already there by `gap` percent.
 */
export function stackMarks(marks: { from: number; to?: number }[], gap: number): number[] {
  const levels: { from: number; to: number }[][] = [];
  return marks.map((m) => {
    const to = m.to ?? m.from;
    let l = 0;
    while (levels[l]?.some((o) => m.from < o.to + gap && to + gap > o.from)) l++;
    (levels[l] ??= []).push({ from: m.from, to });
    return l;
  });
}
