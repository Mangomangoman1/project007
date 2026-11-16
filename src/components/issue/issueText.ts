/**
 * Plain-language wording for one issue's years, edges and priority, plus "related issues" and
 * "representative years". Pure (no data imports) so pages and OG images can share it.
 * Voice: a knowledgeable friend. Never "your house has"; always "houses built ... often".
 */
import type { Issue, Zone } from '@/lib/types';
import { MAX_YEAR, MIN_YEAR } from '@/lib/site';
import { PARTS, PART_OF_ZONE } from '@/lib/labels';
import { bandRange } from '@/lib/select';

type WithApplies = Pick<Issue, 'applies' | 'kind'>;

export const kindLabel = (i: Pick<Issue, 'kind'>) => (i.kind === 'missing' ? 'Built without' : 'Often present');

export const PRIORITY_LABEL: Record<1 | 2 | 3, string> = {
  1: 'Check first',
  2: 'Worth a look',
  3: 'Good to know',
};

/** The "part of the house" an issue is filed under (its first zone). */
export function partOf(i: Pick<Issue, 'where'>) {
  const id = PART_OF_ZONE[i.where[0]] ?? 'whole';
  return PARTS.find((p) => p.id === id) ?? PARTS[PARTS.length - 1];
}

/** "Houses built from 1978 to 1997 may have it." / "...were built without it." */
export function rangeSentence(i: WithApplies): string {
  const { from, to } = i.applies;
  const who =
    from === null && to === null
      ? 'Houses of any age'
      : from === null
        ? `Houses built in ${to} or earlier`
        : to === null
          ? `Houses built in ${from} or later`
          : from === to
            ? `Houses built in ${from}`
            : `Houses built from ${from} to ${to}`;
  return i.kind === 'missing' ? `${who} were built without it, unless it has been added since.` : `${who} may have it.`;
}

/** Core-years sentence, or null when no core is stated. */
export function coreSentence(i: WithApplies): string | null {
  const { coreFrom, coreTo } = i.applies;
  if (coreFrom === null && coreTo === null) return null;
  const span =
    coreFrom === null ? `${coreTo} or earlier` : coreTo === null ? `${coreFrom} or later` : coreFrom === coreTo ? `in ${coreFrom}` : `${coreFrom} to ${coreTo}`;
  return i.kind === 'missing'
    ? `The gap is most common in houses built ${span}.`
    : `It is most likely in houses built ${span}.`;
}

export type EdgeNote = { label: string; value: string; kind: 'sharp' | 'soft' | 'open' | 'core' | 'none'; text: string };

/** The three cells of the years strip: start, most likely, end. */
export function edgeNotes(i: WithApplies): [EdgeNote, EdgeNote, EdgeNote] {
  const a = i.applies;
  const missing = i.kind === 'missing';
  const start: EdgeNote =
    a.from === null
      ? { label: 'Earliest', value: `Before ${MIN_YEAR}`, kind: 'open', text: `No start date. It reaches back past ${MIN_YEAR}, where these records begin.` }
      : a.startEdge === 'sharp'
        ? { label: 'Earliest', value: String(a.from), kind: 'sharp', text: 'A fixed date, set by a rule, a recall or a court record.' }
        : { label: 'Earliest', value: `About ${a.from}`, kind: 'soft', text: 'An approximate date. It came in gradually, and sources differ by a few years.' };
  const core = coreSentence(i);
  const { coreFrom, coreTo } = a;
  const mid: EdgeNote = core
    ? {
        label: 'Most likely',
        value: coreFrom === null ? `To ${coreTo}` : coreTo === null ? `From ${coreFrom}` : coreFrom === coreTo ? String(coreFrom) : `${coreFrom}–${coreTo}`,
        kind: 'core',
        text: missing ? 'The years when houses most often went without it.' : 'The years it is most common: the solid part of the band.',
      }
    : { label: 'Most likely', value: 'Not narrowed', kind: 'none', text: 'Sources give no narrower window, so treat every year in the range alike.' };
  const end: EdgeNote =
    a.to === null
      ? {
          label: 'Latest',
          value: 'Still today',
          kind: 'open',
          text: missing ? 'No end date yet.' : 'No end date. It can still go into houses built today.',
        }
      : a.endEdge === 'sharp'
        ? {
            label: 'Latest',
            value: String(a.to),
            kind: 'sharp',
            text: missing
              ? 'A fixed date: after this, a rule or model code called for it.'
              : 'A fixed date, such as a ban, a recall or a code change.',
          }
        : {
            label: 'Latest',
            value: `About ${a.to}`,
            kind: 'soft',
            text: missing
              ? 'An approximate date. Places adopted the requirement at different times.'
              : 'An approximate date. The change came gradually, so a few later houses may have it.',
          };
  return [start, mid, end];
}

/** Years worth opening a report for: earliest, peak start, peak end, latest (deduped, sorted). */
export function representativeYears(i: Pick<Issue, 'applies'>): { year: number; label: string }[] {
  const r = bandRange(i, MIN_YEAR, MAX_YEAR);
  const a = i.applies;
  const out: { year: number; label: string }[] = [];
  const push = (year: number, label: string) => {
    if (year < MIN_YEAR || year > MAX_YEAR) return;
    if (out.some((o) => o.year === year)) return;
    out.push({ year, label });
  };
  // An open start would point at 1880; pick a year a lifetime before the peak/end instead.
  const startYear = a.from === null ? Math.max(MIN_YEAR, Math.floor(((r.coreFrom ?? r.to) - 30) / 10) * 10) : r.from;
  push(startYear, a.from === null ? 'Older' : 'Earliest');
  if (r.coreFrom !== null) push(r.coreFrom, 'Peak begins');
  if (r.coreFrom !== null && r.coreTo !== null && r.coreTo - r.coreFrom >= 8) push(Math.round((r.coreFrom + r.coreTo) / 2), 'Mid-peak');
  if (r.coreTo !== null) push(r.coreTo, 'Peak ends');
  push(r.to, a.to === null ? 'Built this year' : 'Latest');
  return out.sort((x, y) => x.year - y.year);
}

type Relatable = Pick<Issue, 'slug' | 'applies' | 'where' | 'category' | 'priority' | 'title'>;

/** Issues in the same part of the house or with overlapping years, best first. */
export function relatedIssues<T extends Relatable>(issue: Relatable, all: T[], limit = 4): T[] {
  const r = bandRange(issue, MIN_YEAR, MAX_YEAR);
  const part = PART_OF_ZONE[issue.where[0]];
  const zones = new Set<Zone>(issue.where);
  const scored = all
    .filter((o) => o.slug !== issue.slug)
    .map((o) => {
      const ro = bandRange(o, MIN_YEAR, MAX_YEAR);
      const overlap = Math.max(0, Math.min(r.to, ro.to) - Math.max(r.from, ro.from) + 1);
      const frac = overlap / Math.max(1, Math.min(r.to - r.from + 1, ro.to - ro.from + 1));
      const samePart = PART_OF_ZONE[o.where[0]] === part;
      const shared = o.where.filter((z) => zones.has(z) && z !== 'whole-house').length;
      const score = (samePart ? 3 : 0) + Math.min(shared, 2) + (o.category === issue.category ? 1 : 0) + (overlap > 0 ? 1 + frac : 0);
      return { o, score, samePart, overlap };
    })
    .filter((s) => (s.samePart || s.overlap > 0) && s.score >= 2.5)
    .sort((a, b) => b.score - a.score || a.o.priority - b.o.priority || a.o.title.localeCompare(b.o.title));
  return scored.slice(0, limit).map((s) => s.o);
}

/** "nachi.org/pb.htm" from a URL, for display next to a source. */
export function shortUrl(url: string): string {
  try {
    const u = new URL(url);
    const path = u.pathname === '/' ? '' : u.pathname.replace(/\/$/, '');
    const s = u.hostname.replace(/^www\./, '') + path;
    return s.length > 56 ? `${s.slice(0, 53)}…` : s;
  } catch {
    return url;
  }
}

/**
 * Prevalence note for display beside the prevalence label. When the label already says "No
 * reliable count exists", a note that merely repeats it is trimmed; a note where the phrase runs
 * on ("No reliable count exists. of popcorn ceilings...") is rejoined into one sentence.
 */
export function prevalenceNote(p: Issue['prevalence']): string {
  const note = (p.note ?? '').trim();
  const m = /^No reliable count exists\.\s+(.*)$/s.exec(note);
  if (!m) return note;
  if (/^[a-z]/.test(m[1])) return `No reliable count exists ${m[1]}`;
  return p.label === 'unknown' ? m[1] : note;
}
