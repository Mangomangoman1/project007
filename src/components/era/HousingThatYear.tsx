import {
  avgCostIn,
  decadeTotals,
  dollars,
  homesShort,
  homesWords,
  isEstimate,
  medianPriceIn,
  oneFamilyIn,
  startsIn,
  startsLandmarks,
  startsSentence,
  startsSeries,
  type ConstructionData,
} from '@/lib/era';
import { MAX_YEAR, MIN_YEAR } from '@/lib/site';
import styles from './Era.module.css';

type Props = { year: number; data: ConstructionData; id?: string };

const TOP = 2500; // thousands: the chart's ceiling (the record is about 2.36 million)
const GRID = [500, 1000, 1500, 2000];
const LETTERS = 'ABCDEFGH';

/**
 * "Housing that year": new homes started in the build year against every year since 1889, as a
 * stepped area on the site's 1880-to-today axis with the year marked, the booms and slumps
 * lettered (found in the series, not typed in) and the 1959 series change drawn. Figures before
 * 1959 are historical estimates transcribed from a scanned Census volume, so they are rounded and
 * drawn paler. Years without a figure say so. Server component.
 */
export function HousingThatYear({ year, data, id = 'housing' }: Props) {
  const headId = `${id}-h`;
  const v = startsIn(data, year);
  const est = isEstimate(data, year);
  const sentence = startsSentence(data, year);
  const price = medianPriceIn(data, year);
  const cost = avgCostIn(data, year);
  const one = oneFamilyIn(data, year);
  const decade = decadeTotals(data, year);
  const series = startsSeries(data);
  const marks = startsLandmarks(data);

  // geometry: x in years from MIN_YEAR, the axis runs to the end of MAX_YEAR
  const span = MAX_YEAR + 1 - MIN_YEAR;
  const px = (y: number) => ((y - MIN_YEAR) / span) * 100;
  const py = (k: number) => 100 - (k / TOP) * 100;
  const area = (from: number, to: number) => {
    const pts = series.filter((p) => p.year >= from && p.year <= to && p.value !== null);
    if (!pts.length) return '';
    let d = `M${pts[0].year - MIN_YEAR} 100`;
    for (const p of pts) d += `V${py(p.value!).toFixed(2)}H${p.year + 1 - MIN_YEAR}`;
    return `${d}V100Z`;
  };
  const line = (from: number, to: number) => {
    const pts = series.filter((p) => p.year >= from && p.year <= to && p.value !== null);
    if (!pts.length) return '';
    let d = `M${pts[0].year - MIN_YEAR} ${py(pts[0].value!).toFixed(2)}`;
    for (const p of pts) d += `V${py(p.value!).toFixed(2)}H${p.year + 1 - MIN_YEAR}`;
    return d;
  };
  const yearX = px(year + 0.5);
  const tagSide = yearX > 80 ? 'end' : yearX < 12 ? 'start' : undefined;
  const label = v !== null ? `${year} · ${homesShort(v, est)}` : `${year} · no count`;

  return (
    <section id={id} className={styles.section} aria-labelledby={headId}>
      <div className="section-head">
        <p className="label">The year in context · building</p>
        <h2 id={headId}>Housing that year</h2>
        <p className={styles.lede}>
          How many new homes were started across the US in {year}, against every year since {data.from}. It is the
          whole country&rsquo;s building, houses and apartments, not a count of houses like this one.
        </p>
      </div>

      <div className={styles.block}>
        <div className={styles.blockMain}>
          <p className="label">New homes started · {year} · US</p>
          {sentence ? (
            <p className={styles.statement}>{sentence}</p>
          ) : (
            <p className={styles.statement}>
              {year < data.from
                ? `The national count of new homes starts in ${data.from}, so there is no figure for ${year}.`
                : `The Census Bureau has not yet published a full-year count for ${year}; its latest is ${data.to}.`}
            </p>
          )}
          {v !== null && est ? (
            <p className={styles.blockFoot}>
              A historical estimate: figures before {data.nrcFrom} were reconstructed decades later and are rounded here.
            </p>
          ) : null}
        </div>
        <dl className={styles.cells}>
          <div>
            <dt>Started</dt>
            <dd>{v !== null ? homesWords(v, est).replace(/^about /, '') : <small className={styles.na}>no figure</small>}</dd>
          </div>
          {cost !== null ? (
            <div>
              <dt>Average cost to build</dt>
              <dd>
                {dollars(cost)}
                <small>per home</small>
              </dd>
            </div>
          ) : null}
          {price !== null ? (
            <div>
              <dt>Median new house price</dt>
              <dd>
                {dollars(price)}
                <small>{year} $</small>
              </dd>
            </div>
          ) : null}
          {one !== null ? (
            <div>
              <dt>In one-family buildings</dt>
              <dd>
                {Math.round(one)}
                <small>%</small>
              </dd>
            </div>
          ) : null}
        </dl>

        {/* ---------- the chart ---------- */}
        <figure
          className={styles.chart}
          role="img"
          aria-label={`New homes started in the US each year, ${data.from} to ${data.to}. ${marks
            .map((m) => `${m.label} ${m.year}: ${homesWords(m.value, isEstimate(data, m.year))}`)
            .join('; ')}.${v !== null ? ` ${year}: ${homesWords(v, est)}.` : ''}`}
        >
          <div className={styles.plot} aria-hidden="true">
            {GRID.map((g) => (
              <span key={g} className={styles.grid} style={{ top: `${py(g)}%` }}>
                <span>{g >= 1000 ? `${g / 1000}M` : `${g}k`}</span>
              </span>
            ))}
            <svg viewBox={`0 0 ${span} 100`} preserveAspectRatio="none" className={styles.svg}>
              <path d={area(data.from, data.nrcFrom - 1)} className={styles.areaEst} />
              <path d={area(data.nrcFrom, data.to)} className={styles.area} />
              <path d={line(data.from, data.nrcFrom - 1)} className={styles.lineEst} />
              <path d={line(data.nrcFrom, data.to)} className={styles.line} />
              {v !== null ? <rect x={year - MIN_YEAR} y={py(v)} width="1" height={100 - py(v)} className={styles.yearBar} /> : null}
            </svg>
            <span className={styles.break} style={{ left: `${px(data.nrcFrom)}%` }}>
              <span>{data.nrcFrom}: new series</span>
            </span>
            {marks.map((m, i) => (
              <span
                key={m.year}
                className={styles.landmark}
                style={{ left: `${px(m.year + 0.5)}%`, top: `${py(m.value)}%` }}
                data-low={m.value < 1000 ? '' : undefined}
              >
                {LETTERS[i]}
              </span>
            ))}
            <span className={styles.yearLine} style={{ left: `${yearX}%` }}>
              <span className={styles.yearTag} data-edge={tagSide}>
                {label}
              </span>
            </span>
          </div>
          <div className={styles.axis} aria-hidden="true">
            {[1880, 1900, 1920, 1940, 1960, 1980, 2000, 2020].map((y) => (
              <span key={y} style={{ left: `${px(y)}%` }} data-minor={y % 40 ? '' : undefined}>
                {y}
              </span>
            ))}
          </div>
          <figcaption className={styles.chartKey}>
            <span className={styles.keyItem}>
              <span className={`${styles.sw} ${styles.swEst}`} aria-hidden="true" /> {data.from}–{data.nrcFrom - 1}: historical
              estimates
            </span>
            <span className={styles.keyItem}>
              <span className={styles.sw} aria-hidden="true" /> {data.nrcFrom}–{data.to}: Census permit-based count (the dotted line marks the change)
            </span>
            {marks.map((m, i) => (
              <span key={m.year} className={styles.keyItem}>
                <span className={styles.letter} aria-hidden="true">
                  {LETTERS[i]}
                </span>
                {m.label}, {m.year}: {homesWords(m.value, isEstimate(data, m.year)).replace(/^about /, '')}
              </span>
            ))}
          </figcaption>
        </figure>
      </div>

      {decade ? (
        <p className={styles.decade}>
          <span className="label">The {decade.decade}s as a whole</span> About {homesWords(decade.started, true).replace(/^about /, '')}{' '}
          nonfarm homes were started
          {decade.converted !== null ? `, ${homesWords(decade.converted, true).replace(/^about /, '')} more made by converting existing buildings` : ''}
          {decade.demolished !== null ? ` and ${homesWords(decade.demolished, true).replace(/^about /, '')} demolished or destroyed` : ''}.
          {decade.standingStart !== null && decade.standingEnd !== null
            ? ` Nonfarm homes standing went from ${homesWords(decade.standingStart, true).replace(/^about /, 'about ')} in ${decade.decade} to ${homesWords(decade.standingEnd, true).replace(/^about /, 'about ')} in ${decade.decade + 10}.`
            : ''}
        </p>
      ) : null}

      <div className={styles.foot}>
        <ul className={styles.notes}>
          <li>
            Before {data.nrcFrom} the counts are historical estimates: Historical Statistics of the United States
            reconstructed them from building permits and other records, in series that change method in 1920, 1930 and 1945.
            They leave out farm housing. The figures here were transcribed by hand from a scanned copy and checked against
            the table&rsquo;s own totals.
          </li>
          <li>
            From {data.nrcFrom} the count is the Census Bureau&rsquo;s privately owned housing units started; public housing
            is not in it. Mobile homes, conversions and temporary units are never counted.
          </li>
          {cost !== null ? (
            <li>
              Average cost to build is the permit valuation per new home, adjusted by the source for understatement; the
              source notes that privately owned units before 1963 are estimates. It excludes the land.
            </li>
          ) : null}
          {price !== null ? <li>The median new house price is in the dollars of {year}, not adjusted for inflation.</li> : null}
        </ul>
        <p className={styles.source}>
          <span className="label">Source</span>{' '}
          <a href={data.sources.hs.url} rel="noopener">
            {data.sources.hs.publisher}, {data.sources.hs.title}
          </a>{' '}
          ({data.from}–{data.nrcFrom - 1}{cost !== null ? '; cost per home to 1970' : ''});{' '}
          <a href={data.sources.starts.url} rel="noopener">
            {data.sources.starts.title}
          </a>{' '}
          ({data.nrcFrom}–{data.to})
          {price !== null ? (
            <>
              ;{' '}
              <a href={data.sources.price.url} rel="noopener">
                {data.sources.price.title}
              </a>
            </>
          ) : null}
          .
        </p>
      </div>
    </section>
  );
}
