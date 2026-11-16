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
