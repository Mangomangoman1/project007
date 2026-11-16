/**
 * Pure helpers for the printable viewing checklist (/checklist/[year]).
 */
import type { Issue, Lifespan, Zone } from '@/lib/types';
import { lifeStatus, type LifeStatus } from '@/lib/select';
import { matchesProfile, type HouseProfile, type When } from '@/lib/profile';
import { STATE_NAME } from '@/lib/labels';

/** First sentence of a check step, trimmed to one printed line where possible. */
export function oneLine(text: string, max = 150): string {
  const first = text.split(/(?<=[.!?])\s+(?=[A-Z'"(])/)[0].trim();
  if (first.length <= max) return first;
  const cut = first.slice(0, max);
  return `${cut.slice(0, cut.lastIndexOf(' ')).replace(/[,;:]$/, '')}…`;
}

/** "FL", "CA, OR, WA" or "7 states" for regional issues; null when national. */
export function regionNote(regions: Issue['regions']): string | null {
  if (regions === 'national') return null;
  if (regions.length <= 3) return regions.join(', ');
  return `${regions.length} states`;
}
export function regionTitle(regions: Issue['regions']): string | undefined {
  if (regions === 'national') return undefined;
  return `Only in ${regions.map((r) => STATE_NAME[r] ?? r).join(', ')}`;
}

/**
 * One question per part of the house, backed by the lifespans that sit there.
 * A part whose lifespan has a `when` (house profile) drops out when the visitor's answers rule it
 * out, like every other row on the sheet. `alt` parts (and asks made only of them) appear only when
 * the visitor's answers name them: a boiler, a well, a septic tank, a metal roof. With no answers
 * the list is exactly the untailored one. `noun` lets the question name only the parts left
 * ("How old is the furnace?"); without it the question is fixed.
 */
type AskPart = { id: string; short: string; noun?: string; alt?: boolean };
type Ask = { zone: Zone; q: string | ((nouns: string[]) => string); parts: AskPart[] };
const listText = (xs: string[]) => (xs.length < 2 ? xs.join('') : `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`);
const howOld = (nouns: string[]) => `How old ${nouns.length > 1 ? 'are' : 'is'} ${listText(nouns)}?`;
const ASKS: Ask[] = [
  {
    zone: 'roof',
    q: 'When was the roof last replaced, and what is on it now?',
    parts: [
      { id: 'asphalt-shingle-roof-3-tab', short: '3-tab shingles' },
      { id: 'asphalt-shingle-roof-architectural', short: 'Architectural shingles' },
      { id: 'wood-shake-roof', short: 'Wood shakes', alt: true },
      { id: 'metal-roof', short: 'Metal', alt: true },
      { id: 'clay-concrete-tile-roof', short: 'Tile', alt: true },
      { id: 'epdm-flat-roof', short: 'EPDM', alt: true },
      { id: 'modified-bitumen-roof', short: 'Modified bitumen', alt: true },
    ],
  },
  {
    zone: 'heating-cooling',
    q: howOld,
    parts: [
      { id: 'forced-air-furnace', short: 'Furnace', noun: 'the furnace' },
      { id: 'boiler', short: 'Boiler', noun: 'the boiler', alt: true },
      { id: 'central-air-conditioner', short: 'Central AC', noun: 'the air conditioner' },
    ],
  },
  { zone: 'water-heater', q: 'How old is the water heater?', parts: [{ id: 'tank-water-heater', short: 'Tank heater' }] },
  {
    zone: 'electrical-panel',
    q: 'Has the electrical panel been replaced or upgraded?',
    parts: [{ id: 'service-panel', short: 'Service panel' }],
  },
  {
    zone: 'drains-sewer',
    q: 'When was the septic tank last pumped and inspected?',
    parts: [{ id: 'septic-system', short: 'Septic system', alt: true }],
  },
  {
    zone: 'plumbing-supply',
    q: 'How old is the well pump, and when was the water last tested?',
    parts: [{ id: 'well-pump', short: 'Well pump', alt: true }],
  },
  {
    zone: 'plumbing-supply',
    q: 'Have the water supply pipes been replaced?',
    parts: [{ id: 'copper-water-lines', short: 'Copper supply' }],
  },
  {
    zone: 'drains-sewer',
    q: 'Has the sewer line been camera-inspected or replaced?',
    parts: [{ id: 'cast-iron-drain-pipe', short: 'Cast-iron drain' }],
  },
  {
    zone: 'windows',
    q: 'Are these the original windows?',
    parts: [
      { id: 'aluminum-windows', short: 'Aluminum' },
      { id: 'wood-windows', short: 'Wood' },
    ],
  },
  {
    zone: 'whole-house',
    q: 'When were the smoke and carbon monoxide alarms last replaced?',
    parts: [
      { id: 'smoke-alarm', short: 'Smoke alarm' },
      { id: 'carbon-monoxide-alarm', short: 'CO alarm' },
    ],
  },
  {
    zone: 'chimney',
    q: 'When was the chimney last inspected and swept?',
    parts: [{ id: 'chimney-flue-tile', short: 'Flue tile' }],
  },
  {
    zone: 'exterior-walls',
    q: 'When was the outside last painted or re-sided?',
    parts: [{ id: 'exterior-paint', short: 'Exterior paint' }],
  },
  {
    zone: 'deck-yard',
    q: 'When was the deck built, and has it been rebuilt?',
    parts: [{ id: 'deck-structure', short: 'Deck framing' }],
  },
  {
    zone: 'basement-foundation',
    q: 'Is there a sump pump, and how old is it?',
    parts: [{ id: 'sump-pump', short: 'Sump pump' }],
  },
  {
    zone: 'garage',
    q: 'How old are the garage door and its opener?',
    parts: [
      { id: 'garage-door-opener', short: 'Opener' },
      { id: 'garage-door', short: 'Door' },
    ],
  },
];

export type SellerQuestion = {
  zone: Zone;
  /** Stable key (the zone is not unique). */
  key: string;
  q: string;
  status: LifeStatus;
  /** "Furnace 15–25 yrs · Central AC 7–15 yrs" */
  life: string;
};

const RANK: Record<LifeStatus, number> = { due: 0, past: 1, soon: 2, later: 3 };
const yrs = (l: Lifespan) => (l.lifeLow === l.lifeHigh ? `${l.lifeLow} yrs` : `${l.lifeLow}–${l.lifeHigh} yrs`);

/** An `alt` part shows only when every attribute its `when` names is answered, and allowed. */
function named(when: When | undefined, profile: HouseProfile): boolean {
  if (!when) return false;
  return Object.entries(when).every(([k, allowed]) => {
    const v = profile[k as keyof HouseProfile];
    return v !== undefined && (allowed as string[]).includes(v);
  });
}

/** The lifespans sellerQuestions() can use (what the checklist's client island needs). */
export const ASK_LIFESPAN_IDS = new Set(ASKS.flatMap((a) => a.parts.map((p) => p.id)));

/**
 * The handful of questions most worth asking at this age: parts whose original would be inside
 * (due) or past its typical life. For young houses, parts coming due soon. `profile` (the house
 * answers) drops parts that do not apply and adds the `alt` parts it names.
 */
export function sellerQuestions(lifespans: Lifespan[], age: number, limit = 6, profile: HouseProfile = {}): SellerQuestion[] {
  const byId = new Map(lifespans.map((l) => [l.id, l]));
  const wanted: LifeStatus[] = age < 15 ? ['due', 'past', 'soon'] : ['due', 'past'];
  const out: SellerQuestion[] = [];
  for (const a of ASKS) {
    const ls = a.parts
      .map((p) => ({ p, l: byId.get(p.id) }))
      .filter((x): x is { p: AskPart; l: Lifespan } => !!x.l)
      .filter(({ p, l }) => (p.alt ? named(l.when, profile) : matchesProfile(l, profile)));
    if (!ls.length) continue;
    const statuses = ls.map(({ l }) => lifeStatus(l, age));
    const best = statuses.sort((x, y) => RANK[x] - RANK[y])[0];
    if (!wanted.includes(best)) continue;
    const q = typeof a.q === 'string' ? a.q : a.q(ls.map(({ p }) => p.noun ?? p.short.toLowerCase()));
    out.push({ zone: a.zone, key: `${a.zone}:${a.parts[0].id}`, q, status: best, life: ls.map(({ p, l }) => `${p.short} ${yrs(l)}`).join(' · ') });
  }
  // keep the ask order (most expensive first) but let "soon" items fall behind due/past ones
  return out.sort((x, y) => Number(x.status === 'soon') - Number(y.status === 'soon')).slice(0, limit);
}

/** Count of issues per zone, by the main place to look (where[0]). */
export function zoneCounts(issues: Pick<Issue, 'where'>[]): Partial<Record<Zone, number>> {
  const c: Partial<Record<Zone, number>> = {};
  for (const i of issues) {
    const z = i.where[0];
    if (z) c[z] = (c[z] ?? 0) + 1;
  }
  return c;
}

/**
 * Split groups into two reading-order columns of similar height. CSS multi-column is avoided on
 * purpose: when a column box runs across a printed page, Chromium spills extra columns sideways
 * and shrinks the whole sheet to fit.
 */
export function splitColumns<T>(groups: T[], weight: (g: T) => number): [T[], T[]] {
  const w = groups.map(weight);
  const total = w.reduce((a, b) => a + b, 0);
  let best = 0;
  let bestDiff = Infinity;
  for (let k = 0, acc = 0; k <= groups.length; acc += w[k] ?? 0, k++) {
    const diff = Math.abs(total - 2 * acc);
    if (diff < bestDiff) {
      bestDiff = diff;
      best = k;
    }
  }
  return [groups.slice(0, best), groups.slice(best)];
}
