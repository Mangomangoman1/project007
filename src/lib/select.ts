/**
 * Pure selection logic: which issues apply to a build year, how they sort, how they group,
 * and where each lifespan stands at a given house age. No imports of data here, so it can be
 * unit-tested with `npm test` and reused on server and client.
 */
import type { Issue, Lifespan, Severity, Zone } from './types';

/** An issue applies to build year Y when Y is within applies.from..applies.to (null = open). */
export function appliesTo(issue: Pick<Issue, 'applies'>, year: number): boolean {
  const { from, to } = issue.applies;
  return (from === null || year >= from) && (to === null || year <= to);
}

/**
 * Core = the years it is most likely. When neither coreFrom nor coreTo is set the issue has no
 * stated core, so it is NOT core (only "applies").
 */
export function isCore(issue: Pick<Issue, 'applies'>, year: number): boolean {
  const { coreFrom, coreTo } = issue.applies;
  if (coreFrom === null && coreTo === null) return false;
  if (!appliesTo(issue, year)) return false;
  return (coreFrom === null || year >= coreFrom) && (coreTo === null || year <= coreTo);
}

/** Regional filter: national issues always pass; with no state chosen everything passes. */
export function inState(issue: Pick<Issue, 'regions'>, state: string | null | undefined): boolean {
  if (!state || issue.regions === 'national') return true;
  return issue.regions.includes(state);
}

const SEVERITY_RANK: Record<Severity, number> = { safety: 0, money: 1, comfort: 2 };

type Sortable = Pick<Issue, 'applies' | 'priority' | 'severity' | 'title'>;

/** Sort by priority, then core-ness at `year`, then severity, then title. Returns a new array. */
export function sortIssues<T extends Sortable>(issues: T[], year: number): T[] {
  return [...issues].sort(
    (a, b) =>
      a.priority - b.priority ||
      Number(isCore(b, year)) - Number(isCore(a, year)) ||
      SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity] ||
      a.title.localeCompare(b.title),
  );
}

/** Issues that apply to `year` (and `state`, if given), sorted. */
export function issuesForYear<T extends Sortable & Pick<Issue, 'regions'>>(issues: T[], year: number, state?: string | null): T[] {
  return sortIssues(issues.filter((i) => appliesTo(i, year) && inState(i, state)), year);
}

/** Group issues by the first matching "part of the house", preserving the input order. */
export function groupByPart<T extends Pick<Issue, 'where'>>(
  issues: T[],
  parts: { id: string; label: string; zones: Zone[] }[],
): { id: string; label: string; issues: T[] }[] {
  const buckets = new Map(parts.map((p) => [p.id, { id: p.id, label: p.label, issues: [] as T[] }]));
  for (const issue of issues) {
    const part = parts.find((p) => p.zones.includes(issue.where[0])) ?? parts[parts.length - 1];
    buckets.get(part.id)!.issues.push(issue);
  }
  return [...buckets.values()].filter((b) => b.issues.length > 0);
}

export type LifeStatus = 'past' | 'due' | 'soon' | 'later';

/**
 * Where an ORIGINAL component stands at house age `age` (years):
 *  past  — older than the top of its typical life
 *  due   — inside its typical life range (replacement window)
 *  soon  — window opens within `soonYears`
 *  later — further out
 */
export function lifeStatus(l: Pick<Lifespan, 'lifeLow' | 'lifeHigh'>, age: number, soonYears = 5): LifeStatus {
  if (age > l.lifeHigh) return 'past';
  if (age >= l.lifeLow) return 'due';
  if (l.lifeLow - age <= soonYears) return 'soon';
  return 'later';
}

/**
 * Where a component stands, honestly, for a house of age `houseAge`.
 *
 *  cycled — the house is so much older than the part's typical life (more than
 *           CYCLED_FACTOR × lifeHigh) that the original has almost certainly been replaced at
 *           least once. "Past its life" would be meaningless; the useful question is "when was it
 *           last replaced?". Only used when that year is unknown.
 *  past   — older than its typical life, but not by so much that an original is implausible.
 *  due    — inside the typical life range: the first (or current) life ends around now.
 *  soon   — the window opens within `soonYears`.
 *  later  — further out.
 *
 * When the visitor tells us the year the part was last replaced, `lastReplaced` gives the part
 * its own age (never more than the house's), and the stage is computed from that: a known
 * replacement can never be "cycled".
 */
export type LifeStage = 'cycled' | 'past' | 'due' | 'soon' | 'later';
export const CYCLED_FACTOR = 1.5;

export type LifeStanding = {
  stage: LifeStage;
  /** Age of the part being judged: the house's age, or years since the stated replacement. */
  age: number;
  /** True when the age comes from a stated replacement year. */
  known: boolean;
  /** Years past lifeHigh (past), years until lifeLow (soon/later), 0 otherwise. */
  by: number;
};

export function lifeStanding(
  l: Pick<Lifespan, 'lifeLow' | 'lifeHigh'>,
  houseAge: number,
  opts: { lastReplaced?: number | null; currentYear?: number; soonYears?: number } = {},
): LifeStanding {
  const { lastReplaced = null, currentYear, soonYears = 5 } = opts;
  const known = lastReplaced !== null && currentYear !== undefined;
  const age = known ? Math.max(0, Math.min(houseAge, currentYear - lastReplaced)) : houseAge;
  if (age > l.lifeHigh) {
    if (!known && age > l.lifeHigh * CYCLED_FACTOR) return { stage: 'cycled', age, known, by: 0 };
    return { stage: 'past', age, known, by: age - l.lifeHigh };
  }
  if (age >= l.lifeLow) return { stage: 'due', age, known, by: 0 };
  const until = l.lifeLow - age;
  return { stage: until <= soonYears ? 'soon' : 'later', age, known, by: until };
}

/**
 * Lifespans grouped by honest stage, each group in its most useful order:
 * due (soonest-ending first), past (least overdue first: those most plausibly still original),
 * soon (soonest first), later, cycled (shortest-lived first).
 */
export function groupLifespans<T extends Pick<Lifespan, 'id' | 'title' | 'lifeLow' | 'lifeHigh' | 'openEnded'>>(
  lifespans: T[],
  houseAge: number,
  opts: { replaced?: Record<string, number>; currentYear?: number; soonYears?: number } = {},
): Record<LifeStage, { item: T; standing: LifeStanding }[]> {
  const out: Record<LifeStage, { item: T; standing: LifeStanding }[]> = { due: [], past: [], soon: [], later: [], cycled: [] };
  for (const item of lifespans) {
    // An open-ended life ("100+") says nothing about wear at any age: leave it out once reached.
    if (item.openEnded && houseAge >= item.lifeLow && opts.replaced?.[item.id] == null) continue;
    const standing = lifeStanding(item, houseAge, {
      lastReplaced: opts.replaced?.[item.id] ?? null,
      currentYear: opts.currentYear,
      soonYears: opts.soonYears,
    });
    out[standing.stage].push({ item, standing });
  }
  const t = (a: { item: T }, b: { item: T }) => a.item.title.localeCompare(b.item.title);
  out.due.sort((a, b) => a.item.lifeHigh - a.standing.age - (b.item.lifeHigh - b.standing.age) || t(a, b));
  out.past.sort((a, b) => a.standing.by - b.standing.by || b.item.lifeHigh - a.item.lifeHigh || t(a, b));
  out.soon.sort((a, b) => a.standing.by - b.standing.by || t(a, b));
  out.later.sort((a, b) => a.standing.by - b.standing.by || t(a, b));
  out.cycled.sort((a, b) => a.item.lifeHigh - b.item.lifeHigh || t(a, b));
  return out;
}

/** One-line headline for a report, from the sorted issue list. */
export function headlineFor<T extends Pick<Issue, 'applies'>>(sorted: T[], year: number): { lead: T | null; isCoreYear: boolean } {
  const lead = sorted[0] ?? null;
  return { lead, isCoreYear: lead ? isCore(lead, year) : false };
}

/** Clamp an open-ended range to drawable years. */
export function bandRange(issue: Pick<Issue, 'applies'>, min: number, max: number) {
  const a = issue.applies;
  const from = a.from ?? min;
  const to = a.to ?? max;
  const coreFrom = a.coreFrom === null && a.coreTo === null ? null : (a.coreFrom ?? from);
  const coreTo = a.coreFrom === null && a.coreTo === null ? null : (a.coreTo ?? to);
  return {
    from: Math.max(min, from),
    to: Math.min(max, to),
    coreFrom: coreFrom === null ? null : Math.max(min, coreFrom),
    coreTo: coreTo === null ? null : Math.min(max, coreTo),
    openStart: a.from === null || a.from < min,
    openEnd: a.to === null || a.to > max,
  };
}

/**
 * Parse what a visitor typed as "last replaced": a year ("2015") or a decade ("2010s", "2010's").
 * A decade resolves to its middle year. Returns null when it is not a year within min..max
 * (min = the build year, max = the current year), so nothing invalid is ever stored.
 */
export function parseReplacedYear(raw: string, min: number, max: number): number | null {
  const s = raw.trim().toLowerCase().replace(/[’']/g, '');
  const y4 = /^(\d{4})$/.exec(s);
  if (y4) {
    const y = Number(y4[1]);
    return y >= min && y <= max ? y : null;
  }
  const dec = /^(\d{3})0s$/.exec(s);
  if (dec) {
    const start = Number(dec[1]) * 10;
    if (start + 9 < min || start > max) return null;
    return Math.min(max, Math.max(min, start + 5));
  }
  return null;
}
