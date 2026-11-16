import type { Issue } from '@/lib/types';
import { MAX_YEAR, MIN_YEAR } from '@/lib/site';
import { bandRange } from '@/lib/select';
import { decades, pctOf, type Domain } from '@/lib/timeline';
import { IssueBand } from '../IssueBand';
import styles from './YearsDiagram.module.css';

/**
 * One issue on the full 1880–today axis, drawn like a dimensioned drawing: a dimension line with
 * end ticks (arrows for open ends) over the IssueBand, and decade labels on the axis.
 * Server-safe. Decorative: callers state the years in text next to it.
 */
export function YearsDiagram({ issue, idPrefix = 'yd' }: { issue: Pick<Issue, 'id' | 'applies' | 'kind' | 'priority'>; idPrefix?: string }) {
  const d: Domain = { min: MIN_YEAR, max: MAX_YEAR };
  const r = bandRange(issue, d.min, d.max);
  const a = issue.applies;
  const x = pctOf(r.from, d);
  const w = pctOf(r.to + 1, d) - x;
  const mid = x + w / 2;
  const soft = (e: 'sharp' | 'soft') => (e === 'soft' ? '≈' : '');
  const startTxt = r.openStart ? `before ${MIN_YEAR}` : `${soft(a.startEdge)}${r.from}`;
  const endTxt = r.openEnd ? 'today' : `${soft(a.endEdge)}${r.to}`;
  const label = r.from === r.to && !r.openStart && !r.openEnd ? String(r.from) : `${startTxt} – ${endTxt}`;
  // keep the label on the plot: pin it to an edge when the line sits near one
  const align = mid < 14 ? 'start' : mid > 86 ? 'end' : 'mid';
  const labelStyle =
    align === 'start' ? { left: `${Math.max(0, x)}%` } : align === 'end' ? { right: `${Math.max(0, 100 - (x + w))}%` } : { left: `${mid}%` };
  const ticks = decades(d);

  return (
    <div className={styles.diagram} aria-hidden="true">
      <div className={styles.dimRow}>
        <span
          className={`${styles.dim} ${r.openStart ? styles.openStart : ''} ${r.openEnd ? styles.openEnd : ''}`}
          style={{ left: `${x}%`, width: `${w}%` }}
        />
        <span className={`${styles.dimLabel} ${styles[`align_${align}`]}`} style={labelStyle}>
          {label}
        </span>
      </div>
      <div className={styles.plot}>
        <IssueBand issue={issue} axis accent={false} idPrefix={idPrefix} />
        <div className={styles.decades}>
          {ticks
            .filter((t) => t % 20 === 0 && t > d.min && t <= d.max - 8)
            .map((t) => (
              <span key={t} className={t % 40 === 0 ? styles.major : styles.minor} style={{ left: `${pctOf(t, d)}%` }}>
                {t}
              </span>
            ))}
        </div>
      </div>
    </div>
  );
}
