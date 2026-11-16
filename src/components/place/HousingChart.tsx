import { ACS_LAST_YEAR, BINS } from '@/lib/place';
import { MAX_YEAR, MIN_YEAR } from '@/lib/site';
import { pctOf } from '@/lib/timeline';
import styles from './Place.module.css';

const D = { min: MIN_YEAR, max: MAX_YEAR };
const LABELS = [1880, 1900, 1920, 1940, 1960, 1980, 2000, 2020];
/** The oldest bin is "1939 or earlier": drawn over the 1930s with a soft tail back toward 1880. */
const TAIL_FROM = 1900;

/**
 * Share of homes by decade built, on the site's 1880-to-today axis, with the visitor's year marked.
 * Homes built after the year are solid, those before it pale (the decade the year falls in is split
 * at the line, assuming homes are spread evenly through it, as the "about" figure does).
 */
export function HousingChart({ bins, year, area }: { bins: number[]; year: number; area: string }) {
  const max = Math.max(...bins, 1);
  const top = Math.max(10, Math.ceil(max / 10) * 10);
  const x = (y: number) => pctOf(y, D);
  const yearX = pctOf(year + 0.5, D);
  const edge = yearX > 88 ? 'end' : yearX < 8 ? 'start' : undefined;

  return (
    <figure className={styles.chart}>
      <div className={styles.chartPlot} style={{ backgroundSize: `${x(1890) - x(1880)}% 100%` }} aria-hidden="true">
        {[top / 2, top].map((g) => (
          <span key={g} className={styles.gridLine} style={{ bottom: `${(g / top) * 100}%` }}>
            <span>{g}%</span>
          </span>
        ))}
        {BINS.map((b, i) => {
          const from = b.from ?? 1930;
          const to = (b.to ?? ACS_LAST_YEAR) + 1;
          const left = x(from);
          const width = x(to) - left;
          const h = (bins[i] / top) * 100;
          // fraction of this bar drawn solid (after the visitor's year)
          const split = year < from ? 0 : year >= to - 1 ? 1 : (year + 1 - from) / (to - from);
          const solidFrom = b.from === null && year <= 1939 ? 1 : split; // pre-1940 house: whole bin is "before or same era"
          return (
            <div key={b.label} className={styles.bar} style={{ left: `${left}%`, width: `${width}%`, height: `${h}%` }}>
              {b.from === null ? (
                <span className={styles.barTail} style={{ width: `${((from - TAIL_FROM) / (to - from)) * 100}%` }} />
              ) : null}
              <span className={styles.barPale} style={{ width: `${solidFrom * 100}%` }} />
              <span className={styles.barSolid} style={{ left: `${solidFrom * 100}%` }} />
              <span className={styles.barValue}>{bins[i]}</span>
            </div>
          );
        })}
        <span className={styles.yearLine} style={{ left: `${yearX}%` }}>
          <span className={styles.yearTag} data-edge={edge}>
            {year}
          </span>
        </span>
      </div>
      <div className={styles.chartAxis} aria-hidden="true">
        {LABELS.map((y) => (
          <span key={y} className={styles.axisLabel} data-minor={y % 40 !== 0 ? '' : undefined} style={{ left: `${x(y)}%` }}>
            {y}
          </span>
        ))}
      </div>
      <figcaption className={styles.chartCap}>
        <span className={styles.keySolid} aria-hidden="true" /> built after {year}
        <span className={styles.keyPale} aria-hidden="true" /> {year <= 1939 ? 'built 1939 or earlier (not split by year)' : 'built before'}
        <span className={styles.capNote}>Share of homes in {area} by decade built. Each bar is a decade; the first is 1939 or earlier.</span>
      </figcaption>
      <table className="visually-hidden">
        <caption>Share of homes in {area} by decade built</caption>
        <thead>
          <tr>
            <th scope="col">Built</th>
            <th scope="col">Share</th>
          </tr>
        </thead>
        <tbody>
          {BINS.map((b, i) => (
            <tr key={b.label}>
              <th scope="row">{b.label}</th>
              <td>about {bins[i]}%</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}
