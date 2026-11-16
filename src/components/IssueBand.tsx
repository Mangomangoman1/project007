import type { Issue } from '@/lib/types';
import { MAX_YEAR, MIN_YEAR } from '@/lib/site';
import { appliesTo } from '@/lib/select';
import { bandGeom, decades, pctMid, type Domain } from '@/lib/timeline';
import styles from './IssueBand.module.css';

export type IssueBandProps = {
  issue: Pick<Issue, 'id' | 'applies' | 'kind' | 'priority'>;
  /** Draws a year marker and lights the band if the issue applies to that year. */
  year?: number;
  /** Draw end labels (1880 / today) and decade ticks. */
  axis?: boolean;
  /** Use red-oxide when lit and priority 1 (default true). */
  accent?: boolean;
  /** Make SVG ids unique when the same issue is drawn twice on one page. */
  idPrefix?: string;
  min?: number;
  max?: number;
  className?: string;
};

/**
 * One issue's band on the full 1880–today axis, in the same visual language as <Timeline>.
 * Static (server-renderable). Height 22px, or 36px with `axis`.
 */
export function IssueBand({ issue, year, axis = false, accent = true, idPrefix = 'ib', min = MIN_YEAR, max = MAX_YEAR, className }: IssueBandProps) {
  const d: Domain = { min, max };
  const g = bandGeom(issue, d);
  const id = `${idPrefix}-${issue.id}`;
  const on = year === undefined || appliesTo(issue, year);
  const tone = !on ? 'dim' : accent && issue.priority === 1 && year !== undefined ? 'accent' : 'lit';
  const H = axis ? 36 : 22;
  const by = 7;
  const bh = 8;
  return (
    <svg
      className={`${styles.band} ${styles[`tone_${tone}`]} ${issue.kind === 'missing' ? styles.missing : ''} ${className ?? ''}`}
      width="100%"
      height={H}
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <linearGradient id={`${id}-g`}>
          {g.stops.map(([o, a], i) => (
            <stop key={i} offset={o} stopColor="#fff" stopOpacity={a} />
          ))}
        </linearGradient>
        <mask id={`${id}-m`} maskContentUnits="objectBoundingBox">
          <rect width="1" height="1" fill={`url(#${id}-g)`} />
        </mask>
        <pattern id={`${id}-h`} width="4" height="4" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <rect className={styles.hatch} width="1.6" height="4" />
        </pattern>
      </defs>
      <line className={styles.base} x1="0" x2="100%" y1={by + bh / 2} y2={by + bh / 2} />
      {axis &&
        decades(d).map((t) => (
          <line key={t} className={styles.tickLine} x1={`${pctMid(t - 0.5, d)}%`} x2={`${pctMid(t - 0.5, d)}%`} y1={by + bh / 2 - (t % 50 === 0 ? 4 : 2)} y2={by + bh / 2 + (t % 50 === 0 ? 4 : 2)} />
        ))}
      <g mask={`url(#${id}-m)`}>
        <rect className={styles.body} x={`${g.x}%`} width={`${g.w}%`} y={by} height={bh} fill={issue.kind === 'missing' ? `url(#${id}-h)` : undefined} />
        {g.coreX !== null && g.coreW !== null && <rect className={styles.core} x={`${g.coreX}%`} width={`${g.coreW}%`} y={by} height={bh} />}
      </g>
      {g.sharpStart && <line className={styles.cap} x1={`${g.x}%`} x2={`${g.x}%`} y1={by - 3} y2={by + bh + 3} />}
      {g.sharpEnd && <line className={styles.cap} x1={`${g.x + g.w}%`} x2={`${g.x + g.w}%`} y1={by - 3} y2={by + bh + 3} />}
      {year !== undefined && (
        <g className={styles.marker}>
          <line x1={`${pctMid(year, d)}%`} x2={`${pctMid(year, d)}%`} y1={1} y2={by + bh + 5} />
        </g>
      )}
      {axis && (
        <>
          <text className={styles.axisText} x="0" y={H - 2}>
            {min}
          </text>
          <text className={styles.axisText} x="100%" y={H - 2} textAnchor="end">
            {max}
          </text>
        </>
      )}
    </svg>
  );
}
