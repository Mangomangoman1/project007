'use client';

import { useId, useState } from 'react';
import { STATE_NAME } from '@/lib/labels';
import { GEO_IDS, GEO_LABEL, regionOfState, type GeoId } from '@/lib/regions';
import {
  SMALL_N,
  bandPhrase,
  bandShort,
  builtPhrase,
  sharePct,
  shareWords,
  stockYours,
  usable,
  type StockRow,
  type StockSlice,
  type StockYours,
} from '@/lib/era';
import type { CharRecord, Yours } from '@/lib/typical';
import { useHouseProfile } from '@/components/profile/useHouseProfile';
import { ShareStrip } from '@/components/typical/ShareStrip';
import { useReportState } from './ReportState';
import tstyles from '@/components/typical/TypicalHouse.module.css';
import styles from './Era.module.css';

export type StockSourceLinks = {
  recs: { publisher: string; title: string; url: string };
  ahs: { publisher: string; title: string; url: string; paper: string };
};

type Props = {
  slice: StockSlice;
  sources: StockSourceLinks;
  /** The report also has "The typical new house of YEAR" (1971 on): this section is its pair. */
  pairedWithTypical: boolean;
  id?: string;
};

const SHORT_GEO: Record<GeoId, string> = { US: 'US', NE: 'Northeast', MW: 'Midwest', S: 'South', W: 'West' };
const GROUPS: { title: string; rows: string[] }[] = [
  { title: 'The shell', rows: ['wall', 'glass', 'foundation', 'stories'] },
  { title: 'Heating and cooling', rows: ['fuel', 'heating', 'cooling'] },
  { title: 'The rooms', rows: ['baths', 'fireplace', 'size', 'garage'] },
];
const ROOF_MANY: Record<string, string> = {
  asphalt: 'asphalt shingle roofs',
  metal: 'metal roofs',
  wood: 'wood shake roofs',
  slate: 'slate roofs',
  clay: 'clay tile roofs',
  concrete: 'concrete tile roofs',
  other: 'some other roofing',
};
const ROOF_ONE: Record<string, string> = {
  asphalt: 'asphalt shingles',
  metal: 'a metal roof',
  wood: 'wood shakes',
  slate: 'slate',
  clay: 'clay tile',
  concrete: 'concrete tile',
  other: 'some other roofing',
};
const SURVEY = { recs: 'EIA RECS 2020', ahs: 'AHS 2023' } as const;

/** A survey row as the CharRecord the typical section's ShareStrip draws. */
function asRecord(row: StockRow, v: number[]): CharRecord {
  const li = v.reduce((bi, x, i) => (x > v[bi] ? i : bi), 0);
  const all = row.cats.map((c, i) => ({
    id: c.id,
    label: c.label,
    long: c.long ?? c.label,
    value: Math.round(v[i]),
    under: v[i] > 0 && v[i] < 0.5,
  }));
  const lead = all[li];
  // categories nobody sampled in this band are left out of the strip and its key
  const shares = all.filter((_, i) => v[i] > 0);
  return { id: row.id, title: row.title, shares, withheld: 0, lead, close: null, sources: [], notes: [], breaks: [] };
}

/**
 * "Houses of this era today": how surviving single-family houses from the build year's era stand
 * NOW (EIA RECS 2020: roof, walls, window glass; Census/HUD AHS 2023: foundation, heating, rooms,
 * in finer decade bands). Same visual grammar as the typical new house (stacked share strips with a
 * key), but about homes still standing after decades of re-roofing and renovation. Region follows
 * the report's state (US in the static HTML) and can be switched; bands under 30 sampled homes are
 * never shown and those under 100 are marked. The visitor's "About your house" answers are marked
 * where the survey categories line up.
 */
export function EraToday({ slice, sources, pairedWithTypical, id = 'era-today' }: Props) {
  const state = useReportState();
  const fromState = regionOfState(state);
  const [picked, setPicked] = useState<{ state: string | null; geo: GeoId } | null>(null);
  const geo: GeoId = picked && picked.state === state ? picked.geo : (fromState ?? 'US');
  const [profile] = useHouseProfile();
  const radioName = useId();
  const headId = `${id}-h`;
  const { year } = slice;
  const era = slice.ahsBand ?? slice.recsBand;

  if (!era) {
    return (
      <section id={id} className={styles.section} aria-labelledby={headId}>
        <div className="section-head">
          <p className="label">As they stand today</p>
          <h2 id={headId}>Houses of this era today</h2>
          <p className={styles.lede}>
            Houses built in {year} are too new for either national survey of the homes people live in: the latest Census and
            HUD American Housing Survey was taken in 2023 and the latest EIA energy survey in 2020.
          </p>
        </div>
      </section>
    );
  }

  const byId = Object.fromEntries(slice.rows.map((r) => [r.id, r]));
  const roof = byId.roof;
  const roofCell = roof?.geo[geo];
  const yours = stockYours(profile);
  const yoursBy = Object.fromEntries(yours.map((y) => [y.rowId, y]));
  const where = geo === 'US' ? 'across the US' : `in the ${GEO_LABEL[geo]}`;
  const eraWords = bandPhrase(era);
  const heading = era.startsWith('Before') ? `Houses built ${eraWords}, today` : `Houses of ${eraWords}, today`;
  const roofEra = slice.recsBand ? bandPhrase(slice.recsBand) : null;
  const coarse = slice.recsBand && slice.ahsBand && slice.recsBand !== slice.ahsBand;

  let roofSentence: string | null = null;
  if (roof && usable(roofCell)) {
    const order = roof.cats.map((c, i) => ({ id: c.id, v: roofCell.v[i] })).sort((a, b) => b.v - a.v);
    const [a, b] = order;
    const built = slice.recsBand!.startsWith('Before') ? `built ${roofEra}` : roofEra!.startsWith('the ') ? `from ${roofEra}` : `built ${roofEra}`;
    roofSentence =
      `${cap(shareWords(a.v))} surviving houses ${built} ${where} have ${ROOF_MANY[a.id]} today` +
      (b && b.v >= 5 ? `, and ${shareWords(b.v)} has ${ROOF_ONE[b.id]}.` : '.');
  }

  return (
    <section id={id} className={styles.section} aria-labelledby={headId}>
      <div className="section-head">
        <p className="label">As they stand today · houses {builtPhrase(era)}</p>
        <h2 id={headId}>{heading}</h2>
        <p className={styles.lede}>
          {pairedWithTypical
            ? `The typical new house above is how houses were built in ${year}. This is the other view: houses ${builtPhrase(era)} that are still standing and lived in, as they are now, after decades of new roofs, new siding and renovation. Not as they were built.`
            : `No survey recorded how new houses were built in ${year}; the Census count starts in 1971. The closest view is the survivors: houses ${builtPhrase(era)} that are still standing and lived in, as they are now, after decades of new roofs, new siding and renovation. Not as they were built.`}
        </p>
      </div>

      {/* ---- where ---- */}
      <div className={tstyles.where}>
        <p className={tstyles.whereNote} aria-live="polite">
          <span className="label">Showing</span> <strong>{geo === 'US' ? 'the whole US' : `the ${GEO_LABEL[geo]}`}</strong>
          {geo !== 'US' && fromState === geo && state ? (
            <span className={tstyles.whereWhy}> · the Census region for {STATE_NAME[state]}</span>
          ) : null}
          <span className={tstyles.whereWhy}> · detached single-family houses</span>
        </p>
        <fieldset className={tstyles.geoSwitch}>
          <legend className="visually-hidden">Region</legend>
          {GEO_IDS.map((g) => (
            <label key={g} className={tstyles.geoOpt}>
              <input type="radio" name={radioName} value={g} checked={geo === g} onChange={() => setPicked({ state, geo: g })} />
              <span>
                {SHORT_GEO[g]}
                {g === fromState ? <span className={tstyles.geoYours} aria-label=" (your state's region)">•</span> : null}
              </span>
            </label>
          ))}
        </fieldset>
      </div>

      {yours.some((y) => slice.rows.some((r) => r.id === y.rowId)) ? (
        <p className={tstyles.yoursLede}>
          Marked <span className={tstyles.yoursTag}>yours</span> where your answers in About your house line up with the
          survey&rsquo;s categories. It shows how common that is among these houses today, not anything about yours.
        </p>
      ) : null}

      {/* ---- the roof, given pride of place ---- */}
      {roof ? (
        <div className={`${styles.block} ${styles.roofBlock}`}>
          <div className={styles.blockMain}>
            <p className="label">
              Roofs today · {builtPhrase(slice.recsBand!)} · {SHORT_GEO[geo]}
            </p>
            {roofSentence ? <p className={styles.statement}>{roofSentence}</p> : <p className={styles.statement}>{tooFew(roof, geo)}</p>}
            <p className={styles.blockFoot}>
              Roof material as reported in 2020. Most roofs have been replaced at least once since these houses were built, so
              this is what is on them now.
            </p>
          </div>
          <dl className={styles.cells}>
            <div>
              <dt>Homes sampled</dt>
              <dd>{usable(roofCell) ? roofCell.n.toLocaleString('en-US') : '—'}</dd>
            </div>
            <div>
              <dt>{slice.sqft[geo] ? 'Average size' : 'Surveyed'}</dt>
              <dd>
                {slice.sqft[geo] ? (
                  <>
                    {slice.sqft[geo]!.mean.toLocaleString('en-US')}
                    <small>sq ft</small>
                  </>
                ) : (
                  '2020'
                )}
              </dd>
            </div>
          </dl>
          {usable(roofCell) ? (
            <div className={styles.roofStrip}>
              <Row row={roof} geo={geo} where={where} yours={yoursBy.roof} bands={slice.bands} hideHead />
            </div>
          ) : null}
        </div>
      ) : null}

      {coarse ? (
        <p className={styles.bandNote}>
          Roof, walls, window glass and stories come from the EIA survey, which can only group houses{' '}
          {builtPhrase(slice.recsBand!)}. Everything else comes from the American Housing Survey&rsquo;s finer band: houses{' '}
          {builtPhrase(slice.ahsBand!)}.
        </p>
      ) : null}

      {GROUPS.map((g) => {
        const rows = g.rows.map((r) => byId[r]).filter((r): r is StockRow => Boolean(r));
        if (!rows.length) return null;
        return (
          <div key={g.title} className={styles.group}>
            <h3 className={styles.groupHead}>{g.title}</h3>
            <ol className={tstyles.rows}>
              {rows.map((r) => (
                <li key={r.id} className={tstyles.row}>
                  <Row row={r} geo={geo} where={where} yours={yoursBy[r.id]} bands={slice.bands} />
                </li>
              ))}
            </ol>
          </div>
        );
      })}

      <div className={tstyles.foot}>
        <ul className={tstyles.notes}>
          <li>
            Surviving detached single-family houses as they are today, by the decade their occupants say they were built.
            Roofs, siding, windows and heating include every replacement since. Houses that were torn down are not in it, so
            this is not how the era built.
          </li>
          <li>
            In the Census Bureau&rsquo;s words, &ldquo;some of the home characteristics &hellip; may have been more recent
            additions or installations and did not come with the home when it was originally built.&rdquo;
          </li>
          <li>
            Survey estimates from samples of homes: a band with fewer than 30 sampled homes is never shown, and one with
            fewer than {SMALL_N} is marked small sample. The EIA survey covers occupied primary homes only; the American
            Housing Survey also counts vacant ones.
          </li>
        </ul>
        <p className={tstyles.source}>
          <span className="label">Source</span>{' '}
          <a href={sources.recs.url} rel="noopener">
            {sources.recs.publisher}, {sources.recs.title}
          </a>{' '}
          (roof, walls, window glass, stories, size); {' '}
          <a href={sources.ahs.url} rel="noopener">
            {sources.ahs.publisher}, {sources.ahs.title}
          </a>{' '}
          (everything else); shares computed from the public microdata with the surveys&rsquo; weights. Caveat quoted from{' '}
          <a href={sources.ahs.paper} rel="noopener">
            Census working paper 2011-18
          </a>
          .
        </p>
      </div>
    </section>
  );
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

function tooFew(row: StockRow, geo: GeoId) {
  return `Too few ${row.title.toLowerCase()} answers were sampled ${geo === 'US' ? 'nationally' : `in the ${GEO_LABEL[geo]}`} for this band to show.`;
}

function Row({
  row,
  geo,
  where,
  yours,
  bands,
  hideHead = false,
}: {
  row: StockRow;
  geo: GeoId;
  where: string;
  yours?: StockYours;
  bands: StockSlice['bands'];
  hideHead?: boolean;
}) {
  const cell = row.geo[geo];
  if (!usable(cell)) {
    return (
      <>
        <div className={tstyles.rowHead}>
          <h4 className={tstyles.rowTitle}>{row.title}</h4>
        </div>
        <p className={styles.suppressed}>{tooFew(row, geo)}</p>
      </>
    );
  }
  const rec = asRecord(row, cell.v);
  const lead = rec.lead!;
  const mine = yours ? row.cats.map((c, i) => ({ c, v: cell.v[i] })).filter((x) => yours.catIds.includes(x.c.id)) : [];
  const mineShare = mine.reduce((s, x) => s + x.v, 0);
  const y: Yours | undefined = yours
    ? { charId: row.id, catIds: yours.catIds, answer: yours.answer, census: yours.answer, share: Math.round(mineShare) }
    : undefined;
  const across = row.across[geo];
  const small = cell.n < SMALL_N;
  return (
    <>
      {!hideHead ? (
        <div className={tstyles.rowHead}>
          <h4 className={tstyles.rowTitle}>{row.title}</h4>
          <p className={tstyles.rowLead}>
            <span className={tstyles.rowLeadVal}>{sharePct(cell.v[row.cats.findIndex((c) => c.id === lead.id)])}</span> {lead.long}
          </p>
        </div>
      ) : null}
      <div className={tstyles.rowChart}>
        <ShareStrip rec={rec} yours={y} />
        {y ? (
          <p className={tstyles.yoursLine}>
            <span className={tstyles.yoursTag}>yours</span> {yours!.answer}, like {sharePct(mineShare)} of these houses {where}{' '}
            today{yours!.caveat ? ` (${yours!.caveat})` : ''}.
          </p>
        ) : null}
        <p className={styles.sample}>
          {cell.n.toLocaleString('en-US')} homes sampled · {SURVEY[row.src]}
          {small ? <span className={styles.small}>small sample</span> : null}
        </p>
      </div>
      {across && !hideHead ? <EraBars across={across} row={row} bands={bands[row.src]} band={row.band} /> : null}
      {across && hideHead ? (
        <div className={styles.roofAcross}>
          <EraBars across={across} row={row} bands={bands[row.src]} band={row.band} />
        </div>
      ) : null}
    </>
  );
}

/** Columns for shares (null = no column), one unit wide with a gap, on a 0-100 scale. */
const bars = (vs: (number | null)[]) =>
  vs.map((v, i) => (v === null ? '' : `M${i + 0.12} 100V${(100 - Math.max(2, v)).toFixed(1)}h0.76V100z`)).join('');

/** The leading category's share in every era band: small columns, this house's band in ink. */
function EraBars({ across, row, bands, band }: { across: { cat: number; v: (number | null)[] }; row: StockRow; bands: string[]; band: string }) {
  const cat = row.cats[across.cat];
  const n = bands.length;
  const on = bands.indexOf(band);
  const label = `${cat.long ?? cat.label}: share of surviving houses by era built, ${bands
    .map((b, i) => `${bandShort(b)} ${across.v[i] === null ? 'too few sampled' : sharePct(across.v[i]!)}`)
    .join(', ')}.`;
  return (
    <div className={tstyles.rowSpark}>
      <p className={tstyles.sparkTitle}>{cat.long && cat.long.length <= 24 ? cat.long : cat.label}, by era built</p>
      <figure className={styles.eraBars} role="img" aria-label={label}>
        <div className={styles.eraPlot} aria-hidden="true">
          <svg viewBox={`0 0 ${n} 100`} preserveAspectRatio="none">
            <path className={styles.eraBars0} d={bars(across.v.map((v, i) => (i === on ? null : v)))} />
            <path className={styles.eraNone} d={bars(across.v.map((v) => (v === null ? 100 : null)))} />
            {on >= 0 && across.v[on] !== null ? <path className={styles.eraBarsOn} d={bars(across.v.map((v, i) => (i === on ? v : null)))} /> : null}
          </svg>
          {on >= 0 && across.v[on] !== null ? (
            <span className={styles.eraVal} style={{ left: `${((on + 0.5) / n) * 100}%`, bottom: `${across.v[on]}%` }}>
              {sharePct(across.v[on]!)}
            </span>
          ) : null}
        </div>
        <div className={styles.eraAxis} aria-hidden="true">
          <span>{bandShort(bands[0])}</span>
          <span>{bandShort(bands[bands.length - 1])}</span>
        </div>
      </figure>
    </div>
  );
}
