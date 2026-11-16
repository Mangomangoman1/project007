/**
 * Timeline geometry, shared by <Timeline> (interactive, all issues in lanes) and <IssueBand>
 * (one issue). Everything is expressed in PERCENT of the plot width so the SVG can be fluid
 * without scaling strokes or text; SSR output is therefore final, no measuring needed.
 *
 * Year Y occupies the column [Y, Y+1). The year line sits at the centre of its column.
 */
import type { Issue } from './types';
import { bandRange } from './select';

export type Domain = { min: number; max: number };

/** Percent position of the START of year `y`. */
export const pctOf = (y: number, d: Domain) => ((y - d.min) / (d.max + 1 - d.min)) * 100;
/** Percent position of the CENTRE of year `y` (where the year line goes). */
export const pctMid = (y: number, d: Domain) => pctOf(y + 0.5, d);
/** Year under a fractional x (0..1) across the plot. */
export const yearAt = (fraction: number, d: Domain) =>
  Math.min(d.max, Math.max(d.min, Math.floor(d.min + fraction * (d.max + 1 - d.min))));

export type BandGeom = {
  x: number; // %
  w: number; // %
  coreX: number | null;
  coreW: number | null;
  /** gradient stops for the soft-edge mask: [offset 0..1, opacity 0..1] */
  stops: [number, number][];
  sharpStart: boolean;
  sharpEnd: boolean;
  openStart: boolean;
  openEnd: boolean;
  label: string; // "1965–1973", "Before 1978", "Since 2011", "All years"
};

const FADE_YEARS = 7;

export function bandGeom(issue: Pick<Issue, 'applies'>, d: Domain): BandGeom {
  const r = bandRange(issue, d.min, d.max);
  const a = issue.applies;
  const span = r.to + 1 - r.from;
  const fade = Math.min(FADE_YEARS, span * 0.32) / span;
  // Open ends run flush to the axis edge: they are "since records begin"/"still today", not approximate.
  const softStart = !r.openStart && a.startEdge === 'soft';
  const softEnd = !r.openEnd && a.endEdge === 'soft';
  const stops: [number, number][] = [];
  if (softStart) stops.push([0, 0], [fade, 1]);
  else stops.push([0, 1]);
  if (softEnd) stops.push([1 - fade, 1], [1, 0]);
  else stops.push([1, 1]);

  const x = pctOf(r.from, d);
  const w = pctOf(r.to + 1, d) - x;
  let coreX: number | null = null;
  let coreW: number | null = null;
  if (r.coreFrom !== null && r.coreTo !== null && r.coreTo >= r.coreFrom) {
    coreX = pctOf(Math.max(r.coreFrom, r.from), d);
    coreW = pctOf(Math.min(r.coreTo, r.to) + 1, d) - coreX;
  }
  return {
    x, w, coreX, coreW, stops,
    sharpStart: !r.openStart && a.startEdge === 'sharp',
    sharpEnd: !r.openEnd && a.endEdge === 'sharp',
    openStart: r.openStart,
    openEnd: r.openEnd,
    label: yearsLabel(issue),
  };
}

/** Human label for an issue's years: "1965–1973", "Built before 1979", "Built 2011 or later", "Any year". */
export function yearsLabel(issue: Pick<Issue, 'applies'>): string {
  const { from, to } = issue.applies;
  if (from === null && to === null) return 'Any year';
  if (from === null) return `Built ${to} or earlier`;
  if (to === null) return `Built ${from} or later`;
  if (from === to) return `Built in ${from}`;
  return `${from}–${to}`;
}

/** Peak/core label, or null when the issue states no core. */
export function coreLabel(issue: Pick<Issue, 'applies'>): string | null {
  const { coreFrom, coreTo } = issue.applies;
  if (coreFrom === null && coreTo === null) return null;
  if (coreFrom === null) return `most likely up to ${coreTo}`;
  if (coreTo === null) return `most likely from ${coreFrom}`;
  return `most likely ${coreFrom}–${coreTo}`;
}

/**
 * Greedy interval packing into rows: each band goes in the first row whose last band ends
 * at least `gap` years before it starts. Returns row index per item (same order as input).
 */
export function packRows<T extends Pick<Issue, 'applies'>>(items: T[], d: Domain, gap = 2): { rows: number; rowOf: Map<T, number> } {
  const sorted = [...items].sort((a, b) => {
    const ra = bandRange(a, d.min, d.max);
    const rb = bandRange(b, d.min, d.max);
    return ra.from - rb.from || rb.to - ra.to;
  });
  const ends: number[] = [];
  const rowOf = new Map<T, number>();
  for (const it of sorted) {
    const r = bandRange(it, d.min, d.max);
    let row = ends.findIndex((end) => r.from > end + gap);
    if (row === -1) {
      row = ends.length;
      ends.push(r.to);
    } else ends[row] = r.to;
    rowOf.set(it, row);
  }
  return { rows: ends.length, rowOf };
}

/** Decade ticks within the domain. */
export function decades(d: Domain): number[] {
  const out: number[] = [];
  for (let y = Math.ceil(d.min / 10) * 10; y <= d.max; y += 10) out.push(y);
  return out;
}
