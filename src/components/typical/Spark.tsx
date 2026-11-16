import type { SeriesPoint } from '@/lib/typical';
import styles from './TypicalHouse.module.css';

type Props = {
  series: SeriesPoint[];
  year: number;
  /** x axis (the whole table's years, so every line shares one scale). */
  x0: number;
  x1: number;
  /** y domain; shares use 0–100. */
  y0?: number;
  y1?: number;
  /** Years where the categories were redefined: the line breaks there. */
  breaks?: number[];
  /** Text for the marked value, e.g. "56%". */
  valueText: string;
  /** Accessible description of the whole line. */
  label: string;
};

const H = 40;

/**
 * A small "over time" line: one category's share (or the median size) across the table's years,
 * with the visitor's year marked. The SVG stretches to its box (non-scaling strokes); the dot and
 * value are HTML so they stay round and legible at any width. Gaps = withheld years or a series break.
 */
export function Spark({ series, year, x0, x1, y0 = 0, y1 = 100, breaks = [], valueText, label }: Props) {
  const x = (y: number) => ((y - x0) / (x1 - x0)) * 100;
  const y = (v: number) => H - 2 - ((v - y0) / (y1 - y0)) * (H - 4);
  const runs: string[] = [];
  let cur: string[] = [];
  let prev: number | null = null;
  for (const p of series) {
    const broke = prev !== null && breaks.some((b) => prev! < b && p.year >= b);
    if (p.value === null || broke) {
      if (cur.length) runs.push(cur.join(' '));
      cur = [];
    }
    if (p.value !== null) cur.push(`${cur.length ? 'L' : 'M'}${x(p.year).toFixed(2)} ${y(p.value).toFixed(2)}`);
    prev = p.year;
  }
  if (cur.length) runs.push(cur.join(' '));
  const at = series.find((p) => p.year === year);
  const first = series[0]?.year;
  const last = series[series.length - 1]?.year;
  const shownBreaks = breaks.filter((b) => first !== undefined && b > first && b <= last!);

  return (
    <figure className={styles.spark} role="img" aria-label={label}>
      <div className={styles.sparkPlot} aria-hidden="true">
        <svg viewBox={`0 0 100 ${H}`} preserveAspectRatio="none">
          <line x1="0" x2="100" y1={y(y0)} y2={y(y0)} className={styles.sparkBase} />
          <line x1="0" x2="100" y1={y((y0 + y1) / 2)} y2={y((y0 + y1) / 2)} className={styles.sparkMid} />
          {shownBreaks.map((b) => (
            <line key={b} x1={x(b) - 0.4} x2={x(b) - 0.4} y1="0" y2={H} className={styles.sparkBreak} />
          ))}
          <line x1={x(year)} x2={x(year)} y1="0" y2={H} className={styles.sparkYear} />
          {runs.map((d, i) => (
            <path key={i} d={d} className={styles.sparkLine} />
          ))}
        </svg>
        {at && at.value !== null ? (
          <span className={styles.sparkDot} style={{ left: `${x(year)}%`, top: `${(y(at.value) / H) * 100}%` }} />
        ) : null}
        <span
          className={`${styles.sparkVal} ${x(year) > 62 ? styles.sparkValLeft : ''}`}
          style={{ left: `${x(year)}%` }}
        >
          {year} · {valueText}
        </span>
      </div>
      <div className={styles.sparkAxis} aria-hidden="true">
        <span className={styles.sparkFrom} style={{ left: `${x(first ?? x0)}%` }}>
          {first}
        </span>
        {shownBreaks.filter((b) => x(b) - x(first ?? x0) > 14 && x(last ?? x1) - x(b) > 14).map((b) => (
          <span key={b} className={styles.sparkBreakLabel} style={{ left: `${x(b)}%` }}>
            {b}
          </span>
        ))}
        <span className={styles.sparkTo} style={{ right: `${100 - x(last ?? x1)}%` }}>
          {last}
        </span>
      </div>
    </figure>
  );
}
