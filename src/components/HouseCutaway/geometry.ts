/**
 * Geometry helpers for the house cutaway: section hatching clipped to convex polygons, concrete
 * stipple and rounding. Pure functions, so the drawing stays server-safe (no ids, no clipPaths).
 */
export type Pt = readonly [number, number];

const r1 = (n: number) => Math.round(n * 10) / 10;

export const pts = (p: readonly Pt[]) => p.map(([x, y]) => `${r1(x)},${r1(y)}`).join(' ');

export const rectPoly = (x: number, y: number, w: number, h: number): Pt[] => [
  [x, y],
  [x + w, y],
  [x + w, y + h],
  [x, y + h],
];

/**
 * Parallel hatch lines at `angle` degrees, `gap` apart, clipped to a convex polygon.
 * Returns path data.
 */
export function hatch(poly: readonly Pt[], gap: number, angle = 45, phase = 0.5): string {
  const a = (angle * Math.PI) / 180;
  const d: Pt = [Math.cos(a), -Math.sin(a)]; // y grows downward: 45deg runs bottom-left to top-right
  const n: Pt = [-d[1], d[0]];
  const proj = poly.map(([x, y]) => x * n[0] + y * n[1]);
  const lo = Math.min(...proj);
  const hi = Math.max(...proj);
  const out: string[] = [];
  for (let t = Math.ceil(lo / gap - phase) * gap + phase * gap; t < hi; t += gap) {
    if (t <= lo) continue;
    // point on the line: t*n + s*d; intersect with each edge
    const ss: number[] = [];
    for (let i = 0; i < poly.length; i++) {
      const [x1, y1] = poly[i];
      const [x2, y2] = poly[(i + 1) % poly.length];
      const p1 = x1 * n[0] + y1 * n[1] - t;
      const p2 = x2 * n[0] + y2 * n[1] - t;
      if ((p1 < 0 && p2 < 0) || (p1 > 0 && p2 > 0) || p1 === p2) continue;
      const u = p1 / (p1 - p2);
      const x = x1 + (x2 - x1) * u;
      const y = y1 + (y2 - y1) * u;
      ss.push(x * d[0] + y * d[1]);
    }
    if (ss.length < 2) continue;
    const s0 = Math.min(...ss);
    const s1 = Math.max(...ss);
    if (s1 - s0 < 0.6) continue;
    const ax = t * n[0] + s0 * d[0];
    const ay = t * n[1] + s0 * d[1];
    const bx = t * n[0] + s1 * d[0];
    const by = t * n[1] + s1 * d[1];
    out.push(`M${r1(ax)} ${r1(ay)}L${r1(bx)} ${r1(by)}`);
  }
  return out.join('');
}

/** Deterministic stipple for concrete: zero-length round-capped subpaths (dots) in a rectangle. */
export function stipple(x: number, y: number, w: number, h: number, density = 0.05, seed = 7): string {
  let s = seed;
  const rnd = () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
  const n = Math.max(2, Math.round(w * h * density));
  const out: string[] = [];
  for (let i = 0; i < n; i++) {
    const px = x + 1.2 + rnd() * (w - 2.4);
    const py = y + 1.2 + rnd() * (h - 2.4);
    out.push(`M${r1(px)} ${r1(py)}h0`);
  }
  return out.join('');
}

/** Small triangles (aggregate) to go with the stipple. */
export function aggregate(x: number, y: number, w: number, h: number, count: number, seed = 3): string {
  let s = seed;
  const rnd = () => {
    s = (s * 48271) % 2147483647;
    return (s - 1) / 2147483646;
  };
  const out: string[] = [];
  for (let i = 0; i < count; i++) {
    const px = x + 3 + rnd() * (w - 6);
    const py = y + 3 + rnd() * (h - 6);
    const z = 1.6 + rnd() * 0.8;
    out.push(`M${r1(px)} ${r1(py - z)}L${r1(px + z)} ${r1(py + z * 0.8)}L${r1(px - z)} ${r1(py + z * 0.8)}Z`);
  }
  return out.join('');
}

/** Batt insulation symbol: a continuous looping line between y0 and y1, from x0 to x1. */
export function batt(x0: number, x1: number, y0: number, y1: number, pitch = 7): string {
  const ry = (y1 - y0) / 2;
  const mid = y0 + ry;
  const rx = pitch / 2;
  let d = `M${r1(x0)} ${r1(mid)}`;
  let sweep = 1;
  for (let x = x0; x + pitch <= x1 + 0.01; x += pitch) {
    d += `A${r1(rx)} ${r1(ry)} 0 0 ${sweep} ${r1(x + pitch)} ${r1(mid)}`;
    sweep = 1 - sweep;
  }
  return d;
}
