/**
 * Pure helpers for the printable viewing checklist (/checklist/[year]).
 */
import type { Issue, Lifespan, Zone } from '@/lib/types';
import { lifeStatus, type LifeStatus } from '@/lib/select';
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

/** One question per part of the house, backed by the lifespans that sit there. */
type Ask = { zone: Zone; q: string; parts: { id: string; short: string }[] };
const ASKS: Ask[] = [
  {
    zone: 'roof',
    q: 'When was the roof last replaced, and what is on it now?',
    parts: [
      { id: 'asphalt-shingle-roof-3-tab', short: '3-tab shingles' },
      { id: 'asphalt-shingle-roof-architectural', short: 'Architectural shingles' },
    ],
  },
  {
    zone: 'heating-cooling',
    q: 'How old are the furnace and the air conditioner?',
    parts: [
      { id: 'forced-air-furnace', short: 'Furnace' },
      { id: 'central-air-conditioner', short: 'Central AC' },
    ],
  },
  { zone: 'water-heater', q: 'How old is the water heater?', parts: [{ id: 'tank-water-heater', short: 'Tank heater' }] },
  {
    zone: 'electrical-panel',
    q: 'Has the electrical panel been replaced or upgraded?',
    parts: [{ id: 'service-panel', short: 'Service panel' }],
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
  q: string;
  status: LifeStatus;
  /** "Furnace 15–25 yrs · Central AC 7–15 yrs" */
  life: string;
};

const RANK: Record<LifeStatus, number> = { due: 0, past: 1, soon: 2, later: 3 };
const yrs = (l: Lifespan) => (l.lifeLow === l.lifeHigh ? `${l.lifeLow} yrs` : `${l.lifeLow}–${l.lifeHigh} yrs`);

/**
 * The handful of questions most worth asking at this age: parts whose original would be inside
 * (due) or past its typical life. For young houses, parts coming due soon.
 */
export function sellerQuestions(lifespans: Lifespan[], age: number, limit = 6): SellerQuestion[] {
  const byId = new Map(lifespans.map((l) => [l.id, l]));
  const wanted: LifeStatus[] = age < 15 ? ['due', 'past', 'soon'] : ['due', 'past'];
  const out: SellerQuestion[] = [];
  for (const a of ASKS) {
    const ls = a.parts.map((p) => ({ p, l: byId.get(p.id) })).filter((x): x is { p: Ask['parts'][number]; l: Lifespan } => !!x.l);
    if (!ls.length) continue;
    const statuses = ls.map(({ l }) => lifeStatus(l, age));
    const best = statuses.sort((x, y) => RANK[x] - RANK[y])[0];
    if (!wanted.includes(best)) continue;
    out.push({ zone: a.zone, q: a.q, status: best, life: ls.map(({ p, l }) => `${p.short} ${yrs(l)}`).join(' · ') });
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
