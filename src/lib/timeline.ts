/**
 * Timeline geometry, shared by <Timeline> (interactive, all issues in lanes) and <IssueBand>
 * (one issue). Everything is expressed in PERCENT of the plot width so the SVG can be fluid
 * without scaling strokes or text; SSR output is therefore final, no measuring needed.
 *
 * Year Y occupies the column [Y, Y+1). The year line sits at the centre of its column.
 */
import type { Issue } from './types.ts';
import { bandRange } from './select.ts';

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

/**
 * Lane packing for <Timeline>. "Missing"-kind bands whose start is open ("built before X") all
 * begin at the left edge, so instead of one row each they share a single sub-lane (row 0), drawn
 * longest first so every end cap stays visible; the rest are interval-packed below it.
 * `order` is the draw order (shared row longest-first, then the others).
 */
export function packLane<T extends Pick<Issue, 'applies' | 'kind'>>(items: T[], d: Domain, gap = 1) {
  const shared = items.filter((i) => i.kind === 'missing' && bandRange(i, d.min, d.max).openStart);
  const others = items.filter((i) => !shared.includes(i));
  const packed = packRows(others, d, gap);
  const offset = shared.length > 1 ? 1 : 0;
  const rowOf = new Map<T, number>();
  for (const s of shared) rowOf.set(s, offset ? 0 : packed.rows);
  for (const [o, r] of packed.rowOf) rowOf.set(o, r + offset);
  const sharedSorted = [...shared].sort((a, b) => bandRange(b, d.min, d.max).to - bandRange(a, d.min, d.max).to);
  const rows = packed.rows + (shared.length ? 1 : 0);
  return { rows, rowOf, order: [...sharedSorted, ...others], sharedCount: shared.length > 1 ? shared.length : 0 };
}

/**
 * Which decade ticks get a text label at `pxPerYear`, so labels never collide (labels are
 * ~30px wide and need ~14px air). Picks a step of 10, 20 or 40 years; the first tick is kept
 * only if it does not crowd the next labelled one.
 */
export function tickLabels(ticks: number[], pxPerYear: number, minGapPx = 46): Set<number> {
  const step = [10, 20, 40, 50].find((s) => s * pxPerYear >= minGapPx) ?? 50;
  const out = new Set<number>();
  const labelled = ticks.filter((t) => t % step === 0);
  const first = ticks[0];
  if (first !== undefined && !labelled.includes(first)) {
    const next = labelled[0];
    if (next === undefined || (next - first) * pxPerYear >= minGapPx) out.add(first);
  }
  for (const t of labelled) out.add(t);
  // The first label is start-anchored at the axis edge, so it is ~1.5 labels from the next centre.
  const sorted = [...out].sort((a, b) => a - b);
  if (sorted.length > 1 && sorted[0] === first) {
    for (const t of sorted.slice(1)) {
      if ((t - first) * pxPerYear < minGapPx * 1.3) out.delete(t);
      else break;
    }
  }
  return out;
}

export type HitCandidate<T> = { item: T; y: number; h: number; from: number; to: number };

/**
 * The band under a pointer at (`year`, `py` px from the plot top), or null. A band is a
 * candidate when the pointer is within `tol` px of it vertically and inside its years (±1). The
 * vertically nearest wins; ties (the shared "missing" row) go to the shortest band, which is the
 * one drawn on top at that x.
 */
export function pickBand<T>(cands: HitCandidate<T>[], year: number, py: number, tol = 5): T | null {
  let best: HitCandidate<T> | null = null;
  let bestD = Infinity;
  for (const c of cands) {
    if (year < c.from - 1 || year > c.to + 1) continue;
    const d = Math.max(0, Math.abs(py - (c.y + c.h / 2)) - c.h / 2);
    if (d > tol) continue;
    if (d < bestD || (d === bestD && best && c.to - c.from < best.to - best.from)) {
      best = c;
      bestD = d;
    }
  }
  return best ? best.item : null;
}

/**
 * Left edge (px) for an annotation of width `w` anchored at `x` within a container `width` wide,
 * keeping `margin` px clear of both edges. Also returns where the leader meets the note (px from
 * the note's left), clamped inside the note.
 */
export function placeNote(x: number, w: number, width: number, margin = 0) {
  const noteW = Math.min(w, width - 2 * margin);
  const left = Math.min(Math.max(margin, x - noteW / 2), width - margin - noteW);
  return { left, width: noteW, pointer: Math.min(Math.max(8, x - left), noteW - 8) };
}
