'use client';

import Link from 'next/link';
import { useId, useState } from 'react';
import { STATE_NAME } from '@/lib/labels';
import { GEO_IDS, GEO_LABEL, geoPhrase, regionOfState, type GeoId } from '@/lib/regions';
import {
  catSeries,
  hasTypical,
  pct,
  sqftSeries,
  summarize,
  thousands,
  typicalFor,
  yoursFor,
  type CharRecord,
  type TypicalNote,
  type Yours,
} from '@/lib/typical';
import { useHouseProfile } from '@/components/profile/useHouseProfile';
import { TYPICAL } from './data';
import { ShareStrip } from './ShareStrip';
import { Spark } from './Spark';
import styles from './TypicalHouse.module.css';

/** Display order: the shell, then the systems, then the rooms. */
const ORDER = ['stories', 'foundation', 'wall', 'fuel', 'system', 'ac', 'bedrooms', 'bathrooms', 'garage', 'fireplaces'];
const SHORT_GEO: Record<GeoId, string> = { US: 'US', NE: 'Northeast', MW: 'Midwest', S: 'South', W: 'West' };

type Props = {
  year: number;
  /** The report's state selector (USPS code), or null for all states. */
  state: string | null;
  id?: string;
};

/**
 * "The typical new house of YEAR": how new single-family houses completed that year were built,
 * in the visitor's Census region (from the report's state) or the US, from the Census Survey of
 * Construction. Static HTML is the US-wide version; the region follows the state after hydration
 * and can be switched in place. Before 1971 it says plainly that no such survey exists.
 */
export function TypicalHouse({ year, state, id = 'typical-house' }: Props) {
  const fromState = regionOfState(state);
  // A region picked here holds until the state selector changes.
  const [picked, setPicked] = useState<{ state: string | null; geo: GeoId } | null>(null);
  const geo: GeoId = picked && picked.state === state ? picked.geo : (fromState ?? 'US');
  const [profile] = useHouseProfile();
  const radioName = useId();
  const headId = `${id}-h`;

  if (!hasTypical(TYPICAL, year)) {
    const later = year > TYPICAL.latestYear;
    return (
      <section id={id} className={styles.section} aria-labelledby={headId}>
        <div className="section-head">
          <h2 id={headId}>The typical new house of {year}</h2>
          {later ? (
            <p className={styles.lede}>
              The Census Bureau has not yet published how {year}&rsquo;s new houses were built. Its latest year is{' '}
              <Link href={`/built/${TYPICAL.latestYear}#${id}`} prefetch={false}>
                {TYPICAL.latestYear}
              </Link>
              .
            </p>
          ) : (
            <p className={styles.lede}>
              No national survey of how new houses were built exists for {year}. The US Census Bureau&rsquo;s count of
              new-house characteristics starts with houses completed in {TYPICAL.firstYear}, so there are no figures to show
              for this year.
            </p>
          )}
        </div>
      </section>
    );
  }

  const rec = typicalFor(TYPICAL, year, geo)!;
  const byId = Object.fromEntries(rec.chars.map((c) => [c.id, c]));
  const chars = ORDER.map((k) => byId[k]).filter((c): c is CharRecord => Boolean(c));
  const summary = summarize(rec);
  const yours = yoursFor(rec, profile);
  const yoursBy = Object.fromEntries(yours.map((y) => [y.charId, y]));
  const where = geoPhrase(geo);
  const median = rec.sqft.median;
  const sources = [...chars.flatMap((c) => c.sources), ...TYPICAL.sqft.sources].filter(
    (s, i, all) => all.findIndex((t) => t.url === s.url) === i,
  );
  const missing = year < 1973;

  return (
    <section id={id} className={styles.section} aria-labelledby={headId}>
      <div className="section-head">
        <p className="label">As built · new houses of {year}</p>
        <h2 id={headId}>The typical new house of {year}</h2>
        <p className={styles.lede}>
          How new single-family houses completed in {year} {where} were built, from the US Census Bureau&rsquo;s Survey of
          Construction. These describe that year&rsquo;s new houses, not this one, and a house may have been altered since.
        </p>
      </div>

      {/* ---- where: the region in use, and a switch ---- */}
      <div className={styles.where}>
        <p className={styles.whereNote} aria-live="polite">
          <span className="label">Showing</span>{' '}
          <strong>{geo === 'US' ? 'the whole US' : `the ${GEO_LABEL[geo]}`}</strong>
          {geo !== 'US' && fromState === geo && state ? (
            <span className={styles.whereWhy}> · the Census region for {STATE_NAME[state]}</span>
          ) : geo === 'US' && !state ? (
            <span className={`${styles.whereWhy} ${styles.jsOnly}`}> · choose your state above, or a region here</span>
          ) : null}
        </p>
        <fieldset className={styles.geoSwitch}>
          <legend className="visually-hidden">Region</legend>
          {GEO_IDS.map((g) => (
            <label key={g} className={styles.geoOpt}>
              <input
                type="radio"
                name={radioName}
                value={g}
                checked={geo === g}
                onChange={() => setPicked({ state, geo: g })}
              />
              <span>
                {SHORT_GEO[g]}
                {g === fromState ? <span className={styles.geoYours} aria-label=" (your state's region)">•</span> : null}
              </span>
            </label>
          ))}
        </fieldset>
      </div>

      {/* ---- the plain summary, as a title block ---- */}
      <div className={styles.block}>
        <div className={styles.blockMain}>
          <p className="label">
            New houses · {year} · {SHORT_GEO[geo]}
          </p>
          {summary ? <p className={styles.summary}>{summary}</p> : null}
          {missing ? (
            <p className={styles.blockFoot}>
              For {year} the Census published foundation, heating fuel and garage only; walls, cooling, rooms and size start
              in 1973.
            </p>
          ) : null}
        </div>
        <dl className={styles.blockCells}>
          <div>
            <dt>Median size</dt>
            <dd>
              {median !== null ? (
                <>
                  {thousands(median)}
                  <small>sq ft</small>
                </>
              ) : (
                <small className={styles.na}>from 1973</small>
              )}
            </dd>
          </div>
          <div>
            <dt>Completed</dt>
            <dd>
              {rec.completed !== null ? (
                <>
                  {thousands(rec.completed * 1000)}
                  <small>houses</small>
                </>
              ) : (
                '—'
              )}
            </dd>
          </div>
        </dl>
        {median !== null ? (
          <div className={styles.blockSpark}>
            <p className={styles.sparkTitle}>Median size, sq ft</p>
            <Spark
              series={sqftSeries(TYPICAL, geo)}
              year={year}
              x0={TYPICAL.firstYear}
              x1={TYPICAL.latestYear}
              y0={1200}
              y1={2700}
              valueText={thousands(median)}
              label={`Median size of new houses ${where}, ${TYPICAL.sqft.from} to ${TYPICAL.latestYear}: ${thousands(median)} square feet in ${year}.`}
            />
          </div>
        ) : null}
      </div>

      {yours.length ? (
        <p className={styles.yoursLede}>
          Marked <span className={styles.yoursTag}>yours</span> where your answers in About your house line up with the
          Census categories. It shows how common that was, not anything about your house.
        </p>
      ) : null}

      {/* ---- one row per characteristic ---- */}
      <ol className={styles.rows}>
        {chars.map((c) => (
          <CharRow key={c.id} c={c} year={year} geo={geo} where={where} yours={yoursBy[c.id]} />
        ))}
      </ol>

      {/* ---- notes and source ---- */}
      <div className={styles.foot}>
        <ul className={styles.notes}>
          {rec.notes.map((n) => (
            <li key={n.id}>{n.text}</li>
          ))}
          <li>
            Roofing is not recorded by this survey. Houses were not counted by state, so a region is the closest view.
          </li>
        </ul>
        <p className={styles.source}>
          <span className="label">Source</span>{' '}
          <a href={TYPICAL.source.url} rel="noopener">
            {TYPICAL.source.publisher}, {TYPICAL.source.survey}
          </a>{' '}
          ({TYPICAL.source.series}), houses completed. Tables:{' '}
          {sources.map((s, i) => (
            <span key={s.url}>
              {i ? ', ' : ''}
              <a href={s.url} rel="noopener">
                {shortTable(s.table)}
              </a>
            </span>
          ))}
          .
        </p>
      </div>
    </section>
  );
}

function shortTable(t: string) {
  return t
    .replace(/ (in|of) New (Single|One)-Family Houses Completed/, '')
    .replace(/ Used$/, '')
    .replace(/^(Type of|Primary Type of|Number of|Presence of)\s+/i, '')
    .replace(/^Median and Average Square Feet of Floor Area$/, 'Square feet')
    .replace(/\s*\(Characteristics of New Housing: 2008, pp\. 451-457\)/, ' (2008 report)')
    .replace(/^./, (c) => c.toUpperCase());
}

function CharRow({ c, year, geo, where, yours }: { c: CharRecord; year: number; geo: GeoId; where: string; yours?: Yours }) {
  const lead = c.lead;
  const series = lead ? catSeries(TYPICAL, c.id, lead.id, geo) : [];
  const notes: TypicalNote[] = c.notes;
  return (
    <li className={styles.row}>
      <div className={styles.rowHead}>
        <h3 className={styles.rowTitle}>{c.title}</h3>
        {lead ? (
          <p className={styles.rowLead}>
            <span className={styles.rowLeadVal}>{lead.value}%</span> {lead.long}
          </p>
        ) : null}
      </div>
      <div className={styles.rowChart}>
        <ShareStrip rec={c} yours={yours} />
        {yours ? (
          <p className={styles.yoursLine}>
            <span className={styles.yoursTag}>yours</span> {yours.answer}
            {yours.share !== null ? (
              <>
                , like {yours.share}% of new houses {where} that year
                {yours.census !== yours.answer ? ` (Census category: ${yours.census})` : ''}
              </>
            ) : (
              <>; the Census withheld that share for {year}</>
            )}
            {yours.caveat ? `; ${yours.caveat}` : ''}.
          </p>
        ) : null}
        {notes.length ? (
          <ul className={styles.rowNotes}>
            {notes.map((n) => (
              <li key={n.id}>{n.text}</li>
            ))}
          </ul>
        ) : null}
      </div>
      {lead && series.length > 1 ? (
        <div className={styles.rowSpark}>
          <p className={styles.sparkTitle}>{lead.long.length <= 26 ? lead.long : lead.label}, over time</p>
          <Spark
            series={series}
            year={year}
            x0={TYPICAL.firstYear}
            x1={TYPICAL.latestYear}
            breaks={c.breaks}
            valueText={pct(lead)}
            label={`${lead.label}: share of new houses ${where} from ${series[0].year} to ${series[series.length - 1].year}; ${pct(lead)} in ${year}.`}
          />
        </div>
      ) : null}
    </li>
  );
}
