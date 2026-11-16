/**
 * "Your place": pure helpers for the ZIP lookup (import-free, so `node --test` runs them).
 * Data comes from public/place/ (written by scripts/data-prep/build-place.py); the record layouts
 * are documented there and decoded here, in one place.
 */

/* ------------------------------------------------------------------ raw data */

/** One ZCTA: [county FIPS, % of land in that county, counties touched, housing units, median year,
 *  bins (10 integer %, oldest first) | null, occupied units, fuel (7 integer %) | null]. */
export type ZipRecord = [string, number, number, number, number | null, number[] | null, number, number[] | null];
export type AcsRecord = [number, number | null, number[] | null, number, number[] | null];
/** One county: [name, radon zone, climate code, FIRM years, ACS fallback]; trailing nulls dropped. */
export type CountyRecord = [string, (number | null)?, (string | null)?, (number[] | null)?, (AcsRecord | null)?];
export type ZipShard = Record<string, ZipRecord>;
export type CountyFile = Record<string, CountyRecord>;

export const PLACE_BASE = '/place';
export const COUNTIES_PATH = `${PLACE_BASE}/counties.json`;
export const MANIFEST_PATH = `${PLACE_BASE}/manifest.json`;
/** Below this many homes (or occupied homes for fuel) the prep script drops the shares. */
export const MIN_UNITS = 100;

/* ------------------------------------------------------------------ ZIP input */

/** Digits only, at most 5 ("83333-1234" → "83333", " 10 001" → "10001"). */
export function cleanZip(input: string): string {
  const head = input.split('-')[0] ?? '';
  return head.replace(/\D/g, '').slice(0, 5);
}

export function isValidZip(zip: string): boolean {
  return /^\d{5}$/.test(zip) && zip !== '00000';
}

/** The static shard holding this ZIP: one file per 3-digit prefix. */
export function shardPath(zip: string): string {
  if (!isValidZip(zip)) throw new Error(`not a ZIP: ${zip}`);
  return `${PLACE_BASE}/zip/${zip.slice(0, 3)}.json`;
}

/* ------------------------------------------------------------------ geography */

/** State FIPS → USPS code (50 states, DC, Puerto Rico). */
export const FIPS_STATE: Record<string, string> = {
  '01': 'AL', '02': 'AK', '04': 'AZ', '05': 'AR', '06': 'CA', '08': 'CO', '09': 'CT', '10': 'DE', '11': 'DC',
  '12': 'FL', '13': 'GA', '15': 'HI', '16': 'ID', '17': 'IL', '18': 'IN', '19': 'IA', '20': 'KS', '21': 'KY',
  '22': 'LA', '23': 'ME', '24': 'MD', '25': 'MA', '26': 'MI', '27': 'MN', '28': 'MS', '29': 'MO', '30': 'MT',
  '31': 'NE', '32': 'NV', '33': 'NH', '34': 'NJ', '35': 'NM', '36': 'NY', '37': 'NC', '38': 'ND', '39': 'OH',
  '40': 'OK', '41': 'OR', '42': 'PA', '44': 'RI', '45': 'SC', '46': 'SD', '47': 'TN', '48': 'TX', '49': 'UT',
  '50': 'VT', '51': 'VA', '53': 'WA', '54': 'WV', '55': 'WI', '56': 'WY', '72': 'PR',
};

/* ------------------------------------------------------------------ decoded place */

export const BINS: { from: number | null; to: number | null; label: string }[] = [
  { from: null, to: 1939, label: '1939 or earlier' },
  { from: 1940, to: 1949, label: '1940s' },
  { from: 1950, to: 1959, label: '1950s' },
  { from: 1960, to: 1969, label: '1960s' },
  { from: 1970, to: 1979, label: '1970s' },
  { from: 1980, to: 1989, label: '1980s' },
  { from: 1990, to: 1999, label: '1990s' },
  { from: 2000, to: 2009, label: '2000s' },
  { from: 2010, to: 2019, label: '2010s' },
  { from: 2020, to: null, label: '2020 or later' },
];
/** Last build year the ACS 2020-2024 survey can count. */
export const ACS_LAST_YEAR = 2024;

export const FUELS = [
  { id: 'gas', label: 'Utility gas', short: 'gas' },
  { id: 'propane', label: 'Propane (bottled or tank gas)', short: 'propane' },
  { id: 'electric', label: 'Electricity', short: 'electricity' },
  { id: 'oil', label: 'Fuel oil or kerosene', short: 'oil' },
  { id: 'wood', label: 'Wood', short: 'wood' },
  { id: 'other', label: 'Coal, solar or other', short: 'other fuels' },
  { id: 'none', label: 'No fuel used', short: 'no fuel' },
] as const;

export type Housing = {
  units: number;
  median: number | null;
  bins: number[] | null;
  occupied: number;
  fuel: number[] | null;
};

export type Climate = { zone: number; moisture: 'A' | 'B' | 'C' | null; region: string };
export type Firm = { earliest: number; median: number; latest: number; communities: number };

export type Place = {
  zip: string;
  fips: string;
  county: string;
  state: string | null; // USPS code
  /** % of the ZIP's land area in the county shown, and how many counties it touches. */
  share: number;
  counties: number;
  /** The ZIP's own housing figures (null when the Census counts no homes there). */
  housing: Housing | null;
  /** County figures to show instead when the ZIP's own shares are missing or too small. */
  countyHousing: Housing | null;
  radon: 1 | 2 | 3 | null;
  climate: Climate | null;
  firm: Firm | null;
};

const REGION: Record<string, string> = {
  H: 'Hot-Humid', D: 'Hot-Dry', M: 'Mixed-Humid', X: 'Mixed-Dry', N: 'Marine', C: 'Cold', V: 'Very Cold', S: 'Subarctic',
};

export function decodeClimate(code: string | null | undefined): Climate | null {
  if (!code || !/^[1-8][ABC-][HDMXNCVS]$/.test(code)) return null;
  const m = code[1];
  return { zone: Number(code[0]), moisture: m === '-' ? null : (m as 'A' | 'B' | 'C'), region: REGION[code[2]] };
}

function housingOf(a: AcsRecord | [number, number | null, number[] | null, number, number[] | null] | null | undefined): Housing | null {
  if (!a || !a[0]) return null;
  return { units: a[0], median: a[1], bins: a[2], occupied: a[3], fuel: a[4] };
}

export function decodePlace(zip: string, rec: ZipRecord, county: CountyRecord | undefined): Place {
  const [fips, share, counties, units, median, bins, occupied, fuel] = rec;
  const c = county ?? (['', null, null, null, null] as CountyRecord);
  const r = c[1];
  const f = c[3];
  return {
    zip,
    fips,
    county: c[0] || `County ${fips}`,
    state: FIPS_STATE[fips.slice(0, 2)] ?? null,
    share,
    counties,
    housing: housingOf([units, median, bins, occupied, fuel]),
    countyHousing: housingOf(c[4]),
    radon: r === 1 || r === 2 || r === 3 ? r : null,
    climate: decodeClimate(c[2]),
    firm: f && f.length === 4 ? { earliest: f[0], median: f[1], latest: f[2], communities: f[3] } : null,
  };
}

/* ------------------------------------------------------------------ comparisons */

export type Comparison =
  | { kind: 'older'; pct: number } // older than about pct% of homes
  | { kind: 'newer'; pct: number } // newer than about pct%
  | { kind: 'older-at-least'; pct: number } // built before 1940: at least pct% are newer
  | { kind: 'newest' }; // built after the survey's last year

/**
 * Where a build year sits among the homes counted in `bins` (oldest first). Assumes homes are
 * spread evenly within each decade, so the answer is "about". Picks the larger side, so it reads
 * "older than about 61%" or "newer than about 80%". For houses before 1940 the oldest bin has no
 * internal detail, so it says "older than at least N%" (everything from 1940 on).
 */
export function compareYear(bins: number[], year: number): Comparison | null {
  if (bins.length !== BINS.length) return null;
  const total = bins.reduce((s, b) => s + b, 0);
  if (!total) return null;
  if (year > ACS_LAST_YEAR) return { kind: 'newest' };
  if (year <= 1939) {
    const after = bins.slice(1).reduce((s, b) => s + b, 0);
    return { kind: 'older-at-least', pct: Math.round((100 * after) / total) };
  }
  let before = 0;
  let after = 0;
  BINS.forEach((b, i) => {
    const from = b.from ?? 0;
    const to = b.to ?? ACS_LAST_YEAR;
    if (to < year) before += bins[i];
    else if (from > year) after += bins[i];
    else {
      const width = to - from + 1;
      before += (bins[i] * (year - from)) / width;
      after += (bins[i] * (to - year)) / width;
    }
  });
  const older = Math.round((100 * after) / total);
  const newer = Math.round((100 * before) / total);
  return older >= newer ? { kind: 'older', pct: older } : { kind: 'newer', pct: newer };
}

/** Index of the bin a build year falls in (for marking the visitor's year on the histogram). */
export function binIndex(year: number): number {
  return BINS.findIndex((b) => (b.from === null || year >= b.from) && (b.to === null || year <= b.to));
}

/** Main heating fuels, largest first: those at 5% or more (always at least the top one). */
export function mainFuels(fuel: number[] | null, min = 5): { id: string; label: string; short: string; pct: number }[] {
  if (!fuel) return [];
  const all = FUELS.map((f, i) => ({ ...f, pct: fuel[i] ?? 0 })).sort((a, b) => b.pct - a.pct);
  const main = all.filter((f) => f.pct >= min);
  return (main.length ? main : all.slice(0, 1)).map((f) => ({ id: f.id, label: f.label, short: f.short, pct: f.pct }));
}

/* ------------------------------------------------------------------ plain statements */

export const RADON_TEXT: Record<1 | 2 | 3, { potential: string; level: string }> = {
  1: { potential: 'highest', level: 'a predicted county average above 4 pCi/L' },
  2: { potential: 'moderate', level: 'a predicted county average from 2 to 4 pCi/L' },
  3: { potential: 'low', level: 'a predicted county average below 2 pCi/L' },
};

export function radonStatement(zone: 1 | 2 | 3, county: string): string {
  const t = RADON_TEXT[zone];
  return `EPA puts ${county} in Zone ${zone}: ${t.potential} potential for indoor radon, ${t.level}.`;
}

export function climateStatement(c: Climate): string {
  const code = `${c.zone}${c.moisture ?? ''}`;
  const load: Record<string, string> = {
    'Hot-Humid': 'Cooling dominates energy use here',
    'Hot-Dry': 'Cooling dominates energy use here',
    'Mixed-Humid': 'Homes here need both heating and cooling',
    'Mixed-Dry': 'Homes here need both heating and cooling',
    Marine: 'Winters are mild and wet and summers cool, so heating matters more than cooling',
    Cold: 'Heating dominates energy use here',
    'Very Cold': 'Heating dominates energy use here, through long, very cold winters',
    Subarctic: 'Heating dominates energy use here, through long, subarctic winters',
  };
  const air =
    c.moisture === 'A' ? ', and the air is humid' : c.moisture === 'B' ? ', and the air is dry' : c.moisture === 'C' && c.region !== 'Marine' ? ', with a marine climate' : '';
  return `Climate zone ${code} (${c.region}). ${load[c.region] ?? 'Heating and cooling needs vary'}${air}.`;
}

export function firmRange(f: Firm): string {
  return f.earliest === f.latest ? `${f.earliest}` : `${f.earliest} to ${f.latest}`;
}

/** Where a build year sits against the county's first flood maps, as county context only. */
export function firmContext(f: Firm, year: number): string {
  if (year <= 1974) {
    return `A house built in ${year} falls before that 1974 cut-off wherever it stands.`;
  }
  if (year < f.earliest) return `A house built in ${year} predates every first map in this county.`;
  if (year > f.latest) return `A house built in ${year} came after every first map in this county.`;
  return `A house built in ${year} may predate its own community's first map or not: it depends on which community it is in.`;
}

export type PlaceSummary = {
  where: string;
  spans: string | null;
  housingFrom: 'zip' | 'county' | null;
  housingNote: string | null;
  comparison: string | null;
  median: string | null;
  fuels: string | null;
  radon: string | null;
  climate: string | null;
  firm: string | null;
};

const pctList = (xs: { short: string; pct: number }[]) => {
  const parts = xs.map((x) => `${x.short} about ${x.pct}%`);
  return parts.length < 2 ? parts.join('') : `${parts.slice(0, -1).join(', ')} and ${parts[parts.length - 1]}`;
};

/** Which housing figures to show: the ZIP's own when it has shares, else the county's. */
export function housingFor(p: Place): { from: 'zip' | 'county' | null; h: Housing | null; note: string | null } {
  if (p.housing?.bins) return { from: 'zip', h: p.housing, note: null };
  const tiny = p.housing && p.housing.units > 0;
  const why = tiny
    ? `The Census counts only about ${p.housing!.units} homes in this ZIP, too few for a reliable breakdown.`
    : 'The Census counts no homes in this ZIP (it may be a PO box or business ZIP).';
  if (p.countyHousing?.bins) return { from: 'county', h: p.countyHousing, note: `${why} These figures are for ${p.county} as a whole.` };
  return { from: null, h: null, note: why };
}

/** Everything the section says, as plain sentences. `stateName` is the state's full name. */
export function placeStatements(p: Place, year: number, stateName?: string | null): PlaceSummary {
  const where = `${p.zip} maps to ${p.county}${stateName ? `, ${stateName}` : ''}.`;
  const spans =
    p.counties > 1
      ? `A ZIP code can cross county lines. This one touches ${p.counties} counties; about ${p.share}% of its land is in ${p.county}, the one shown here.`
      : null;
  const { from, h, note } = housingFor(p);
  const area = from === 'county' ? p.county : 'this ZIP';
  let comparison: string | null = null;
  if (h?.bins) {
    const c = compareYear(h.bins, year);
    if (c?.kind === 'older') comparison = `Your ${year} house is older than about ${c.pct}% of homes in ${area}.`;
    else if (c?.kind === 'newer') comparison = `Your ${year} house is newer than about ${c.pct}% of homes in ${area}.`;
    else if (c?.kind === 'older-at-least')
      comparison = `Your ${year} house is older than at least ${c.pct}% of homes in ${area}: everything built since 1940.`;
    else if (c?.kind === 'newest')
      comparison = `Your ${year} house is newer than every home the survey counted in ${area} (it runs to ${ACS_LAST_YEAR}).`;
  }
  const median = h?.median ? `Half the homes in ${area} were built before about ${h.median}.` : null;
  const fuelsList = mainFuels(h?.fuel ?? null);
  const fuels = fuelsList.length ? `Main heating fuel in occupied homes: ${pctList(fuelsList)}.` : null;
  return {
    where,
    spans,
    housingFrom: from,
    housingNote: note,
    comparison,
    median,
    fuels,
    radon: p.radon ? radonStatement(p.radon, p.county) : null,
    climate: p.climate ? climateStatement(p.climate) : null,
    firm: p.firm?.communities === 1
      ? `The flood-insurance community covering ${p.county} got its first flood insurance rate map (FIRM) in ${p.firm.earliest}.`
      : p.firm
      ? `Communities in ${p.county} got their first flood insurance rate maps (FIRMs) ${p.firm.earliest === p.firm.latest ? `in ${p.firm.earliest}` : `between ${p.firm.earliest} and ${p.firm.latest}`}.`
      : null,
  };
}
