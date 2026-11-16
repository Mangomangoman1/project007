/**
 * Shared pieces for the Open Graph images (next/og). Notebook style: drafting paper, graphite,
 * blueprint-blue linework, red-oxide only for "check first". Fonts are read from the Fontsource
 * packages in node_modules at build time (no network): Plex Sans/Mono from WOFF, Fraunces decoded
 * and instanced from its WOFF2 variable font (see ./woff2.ts).
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import type { Issue } from '@/lib/types';
import { MAX_YEAR, MIN_YEAR } from '@/lib/site';
import { appliesTo } from '@/lib/select';
import { bandGeom, decades, packRows, pctMid, pctOf, type Domain } from '@/lib/timeline';
import { woff2ToTtf } from './woff2';

export const OG_SIZE = { width: 1200, height: 630 };
export const OG_TYPE = 'image/png';

export const C = {
  paper: '#f4efe4',
  paper2: '#ece5d6',
  ink: '#1f2328',
  ink2: '#474c54',
  ink3: '#686c72',
  line: '#2b5d8c',
  accent: '#a83c22',
  grid: 'rgba(43,93,140,0.07)',
  gridMajor: 'rgba(43,93,140,0.13)',
  rule: 'rgba(31,35,40,0.62)',
};

type OgFont = { name: string; data: ArrayBuffer; weight: 400 | 500; style: 'normal' };
let fonts: OgFont[] | null = null;

const nm = (...p: string[]) => path.join(process.cwd(), 'node_modules', ...p);
const buf = (file: string) => {
  const b = readFileSync(file);
  return b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength) as ArrayBuffer;
};

/** Loaded once per worker and cached. */
export function ogFonts(): OgFont[] {
  if (fonts) return fonts;
  const fraunces = readFileSync(nm('@fontsource-variable/fraunces/files/fraunces-latin-full-normal.woff2'));
  fonts = [
    // the year and big numerals: thin, high-contrast display cut, as on the site
    { name: 'Fraunces', data: woff2ToTtf(fraunces, { wght: 330, opsz: 144, SOFT: 0, WONK: 0 }), weight: 400, style: 'normal' },
    // headings: a touch heavier and softer
    { name: 'Fraunces Head', data: woff2ToTtf(fraunces, { wght: 380, opsz: 96, SOFT: 30, WONK: 0 }), weight: 400, style: 'normal' },
    { name: 'Plex Sans', data: buf(nm('@fontsource/ibm-plex-sans/files/ibm-plex-sans-latin-400-normal.woff')), weight: 400, style: 'normal' },
    { name: 'Plex Mono', data: buf(nm('@fontsource/ibm-plex-mono/files/ibm-plex-mono-latin-400-normal.woff')), weight: 400, style: 'normal' },
    { name: 'Plex Mono', data: buf(nm('@fontsource/ibm-plex-mono/files/ibm-plex-mono-latin-500-normal.woff')), weight: 500, style: 'normal' },
  ];
  return fonts;
}

export const ogOptions = () => ({ ...OG_SIZE, fonts: ogFonts() });

const gridPaper = {
  backgroundColor: C.paper,
  backgroundImage: `linear-gradient(${C.gridMajor} 1px, transparent 1px), linear-gradient(90deg, ${C.gridMajor} 1px, transparent 1px), linear-gradient(${C.grid} 1px, transparent 1px), linear-gradient(90deg, ${C.grid} 1px, transparent 1px)`,
  backgroundSize: '120px 120px, 120px 120px, 24px 24px, 24px 24px',
};

export const mono = (size: number, color = C.ink3, weight: 400 | 500 = 500) => ({
  fontFamily: 'Plex Mono',
  fontSize: size,
  fontWeight: weight,
  color,
  letterSpacing: '0.09em',
  textTransform: 'uppercase' as const,
});

/** The house mark from the header, drawn in blueprint blue. */
export function OgLogo({ size = 30 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 28 28" fill="none">
      <path d="M4 13 L14 4.5 L24 13" stroke={C.line} strokeWidth="1.6" />
      <path d="M7 11 V21 H21 V11" stroke={C.line} strokeWidth="1.6" />
      <path d="M12 21 V16 H16 V21" stroke={C.line} strokeWidth="1.2" />
      <path d="M4 25 H24 M4 23.5 V26.5 M24 23.5 V26.5" stroke={C.line} strokeWidth="1" opacity="0.7" />
    </svg>
  );
}

/** Page frame: grid paper, a 2px title-block border, and a footer strip. */
export function OgFrame({ children, footRight }: { children: React.ReactNode; footRight: string }) {
  return (
    <div style={{ display: 'flex', width: '100%', height: '100%', padding: 36, ...gridPaper, color: C.ink, fontFamily: 'Plex Sans' }}>
      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, border: `2px solid ${C.ink}`, backgroundColor: 'rgba(244,239,228,0.55)' }}>
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, position: 'relative' }}>{children}</div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            height: 54,
            padding: '0 22px',
            borderTop: `1px solid ${C.rule}`,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <OgLogo size={26} />
            <span style={{ fontFamily: 'Fraunces Head', fontSize: 26, color: C.ink }}>Built In</span>
          </div>
          <span style={mono(14, C.ink2, 400)}>{footRight}</span>
        </div>
      </div>
    </div>
  );
}

type BandIssue = Pick<Issue, 'applies' | 'kind' | 'priority'>;

/** One issue's band, the IssueBand look at OG scale: faded soft edges, solid core, sharp caps. */
export function OgBand({ issue, width, height = 18, color = C.line }: { issue: BandIssue; width: number; height?: number; color?: string }) {
  const d: Domain = { min: MIN_YEAR, max: MAX_YEAR };
  const g = bandGeom(issue, d);
  const px = (p: number) => (p / 100) * width;
  const rgba = (a: number) => {
    const n = parseInt(color.slice(1), 16);
    return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
  };
  const hatch = issue.kind === 'missing';
  const bodyAlpha = g.coreX === null ? 0.85 : 0.42;
  const fill = (a: number) => `repeating-linear-gradient(45deg, ${rgba(a)} 0px, ${rgba(a)} 2.5px, transparent 2.5px, transparent 6px)`;
  const stops = g.stops.map(([o, a]) => `${rgba(a * bodyAlpha)} ${Math.round(o * 100)}%`).join(', ');
  return (
    <div style={{ display: 'flex', position: 'relative', width, height: height + 12 }}>
      <div style={{ position: 'absolute', left: 0, top: 6 + height / 2, width, height: 1, backgroundColor: 'rgba(31,35,40,0.28)' }} />
      <div
        style={{
          position: 'absolute',
          left: px(g.x),
          top: 6,
          width: Math.max(2, px(g.w)),
          height,
          backgroundImage: hatch ? fill(0.7) : `linear-gradient(90deg, ${stops})`,
          opacity: hatch ? 0.75 : 1,
        }}
      />
      {g.coreX !== null && g.coreW !== null ? (
        <div
          style={{
            position: 'absolute',
            left: px(g.coreX),
            top: 6,
            width: Math.max(2, px(g.coreW)),
            height,
            ...(hatch ? { backgroundImage: fill(1) } : { backgroundColor: color }),
          }}
        />
      ) : null}
      {g.sharpStart ? <div style={{ position: 'absolute', left: px(g.x) - 1, top: 0, width: 2.5, height: height + 12, backgroundColor: color }} /> : null}
      {g.sharpEnd ? <div style={{ position: 'absolute', left: px(g.x + g.w) - 1.5, top: 0, width: 2.5, height: height + 12, backgroundColor: color }} /> : null}
    </div>
  );
}

/** Decade scale under a band or timeline: ticks every decade, labels every 20 years. */
export function OgScale({ width, year }: { width: number; year?: number }) {
  const d: Domain = { min: MIN_YEAR, max: MAX_YEAR };
  const px = (p: number) => (p / 100) * width;
  const ticks = decades(d);
  return (
    <div style={{ display: 'flex', position: 'relative', width, height: 30 }}>
      <div style={{ position: 'absolute', left: 0, top: 0, width, height: 1, backgroundColor: C.rule }} />
      {ticks.map((t) => (
        <div key={t} style={{ position: 'absolute', left: px(pctOf(t, d)), top: 0, width: 1, height: t % 50 === 0 ? 9 : 5, backgroundColor: C.ink3 }} />
      ))}
      {[MIN_YEAR, ...ticks.filter((t) => t % 20 === 0 && t > MIN_YEAR && t < MAX_YEAR - 10), MAX_YEAR].map((t, i, arr) => {
        if (year !== undefined && Math.abs(t - year) < 9) return null;
        const left = i === 0 ? 0 : i === arr.length - 1 ? width - 44 : px(pctOf(t, d)) - 22;
        return (
          <span
            key={t}
            style={{
              position: 'absolute',
              left,
              top: 11,
              width: 44,
              display: 'flex',
              justifyContent: i === 0 ? 'flex-start' : i === arr.length - 1 ? 'flex-end' : 'center',
              ...mono(14, C.ink3, 400),
              letterSpacing: '0.02em',
            }}
          >
            {t}
          </span>
        );
      })}
    </div>
  );
}

/** Compact all-issues timeline: every band as a hairline in packed rows, lit where it crosses `year`. */
export function OgTimeline({ issues, width, height, year }: { issues: BandIssue[]; width: number; height: number; year?: number }) {
  const d: Domain = { min: MIN_YEAR, max: MAX_YEAR };
  const px = (p: number) => (p / 100) * width;
  const { rows, rowOf } = packRows(issues, d, 1);
  const pitch = Math.max(3, Math.min(9, Math.floor(height / Math.max(1, rows))));
  const bh = Math.max(2, pitch - 2);
  const top0 = Math.max(0, Math.floor((height - rows * pitch) / 2));
  return (
    <div style={{ display: 'flex', position: 'relative', width, height }}>
      {issues.map((it, n) => {
        const g = bandGeom(it, d);
        const on = year === undefined || appliesTo(it, year);
        const color = on && year !== undefined && it.priority === 1 ? C.accent : C.line;
        const a = year === undefined ? (g.coreX === null ? 0.7 : 0.45) : on ? 0.55 : 0.14;
        const rgb = color === C.accent ? '168,60,34' : '43,93,140';
        const stops = g.stops.map(([o, s]) => `rgba(${rgb},${s * a}) ${Math.round(o * 100)}%`).join(', ');
        const top = top0 + (rowOf.get(it) ?? 0) * pitch;
        return (
          <div key={n} style={{ display: 'flex', position: 'absolute', left: px(g.x), top, width: Math.max(2, px(g.w)), height: bh }}>
            <div style={{ display: 'flex', width: '100%', height: '100%', backgroundImage: `linear-gradient(90deg, ${stops})` }} />
            {g.coreX !== null && g.coreW !== null ? (
              <div
                style={{
                  position: 'absolute',
                  left: px(g.coreX) - px(g.x),
                  top: 0,
                  width: Math.max(2, px(g.coreW)),
                  height: bh,
                  backgroundColor: `rgba(${rgb},${year === undefined ? 0.9 : on ? 1 : 0.3})`,
                }}
              />
            ) : null}
          </div>
        );
      })}
      {year !== undefined ? (
        <div style={{ position: 'absolute', left: px(pctMid(year, d)) - 1, top: -8, width: 2, height: height + 16, backgroundColor: C.ink }} />
      ) : null}
    </div>
  );
}
