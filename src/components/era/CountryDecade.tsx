'use client';

import { STATE_NAME } from '@/lib/labels';
import { GEO_LABEL, regionOfState } from '@/lib/regions';
import { FUEL_LABEL, acsBinPhrase, countWords, mainFuels, type CensusRow, type CountrySlice } from '@/lib/era';
import { useReportState } from './ReportState';
import styles from './Era.module.css';

export type CensusLinks = {
  census: { publisher: string; title: string; pages: Record<string, string> };
  acs: { publisher: string; title: string; url: string };
  yb1950: { publisher: string; title: string; url: string };
};

type Props = { slice: CountrySlice; links: CensusLinks; id?: string };

type Fact = {
  key: string;
  label: string;
  note?: string;
  us: React.ReactNode;
  here?: React.ReactNode;
  /** 0-100 meters for a single share */
  meter?: [number | null, number | null];
  src: { name: string; url: string };
};

const pct = (v: number | null | undefined) => (typeof v === 'number' ? `${v.toFixed(1)}%` : null);
const NA = <span className={styles.na}>not tabulated</span>;

/**
 * "The country that decade": a few plain facts from the decennial census nearest the build year
 * (1940 for anything earlier, the earliest national housing census), US beside the report's state
 * when one is chosen: plumbing, heating fuel, sewer and water, homeownership; then how many homes
 * built in that decade still stand (ACS 2020-2024) and, before 1950, how old the 1950 stock was.
 * Context, not the main event: one compact ledger.
 */
export function CountryDecade({ slice, links, id = 'country' }: Props) {
  const state = useReportState();
  const region = regionOfState(state);
  const headId = `${id}-h`;
  const { year, census } = slice;
  const us = slice.rows.US;
  const st: CensusRow | undefined = state ? slice.rows[state] : undefined;
  const P = links.census.pages;
  const facts: Fact[] = [];

  if (census) {
    if (us?.plumb !== undefined) {
      facts.push({
        key: 'plumb',
        label: 'Lacking complete plumbing',
        note: 'hot and cold piped water, a bathtub or shower, and a flush toilet',
        us: pct(us.plumb),
        here: state ? (pct(st?.plumb) ?? NA) : undefined,
        meter: [us.plumb, state ? (st?.plumb ?? null) : null],
        src: { name: 'Census, plumbing', url: P.plumbing },
      });
    }
    const fu = mainFuels(slice.fuels, us);
    if (fu.length) {
      const fs = mainFuels(slice.fuels, st);
      const list = (f: { id: string; pct: number }[]) =>
        f.length ? (
          <span className={styles.fuelList}>
            {f.map((x) => (
              <span key={x.id}>
                {FUEL_LABEL[x.id]} <b>{pct(x.pct)}</b>
              </span>
            ))}
          </span>
        ) : (
          NA
        );
      facts.push({
        key: 'fuel',
        label: 'Main house heating fuels',
        note: census === 1940 ? 'gas includes bottled gas; electricity was not tabulated' : census === 1950 ? 'electricity counted only for room heaters' : 'occupied homes',
        us: list(fu),
        here: state ? list(fs) : undefined,
        src: { name: 'Census, house heating fuel', url: P.fuel },
      });
    }
    if (us?.sewer) {
      facts.push({
        key: 'sewer',
        label: 'On a public sewer',
        note: `septic tank or cesspool: ${pct(us.sewer[1])} across the US`,
        us: pct(us.sewer[0]),
        here: state ? (pct(st?.sewer?.[0]) ?? NA) : undefined,
        meter: [us.sewer[0], state ? (st?.sewer?.[0] ?? null) : null],
        src: { name: 'Census, sewage disposal', url: P.sewage },
      });
    }
    if (us?.noFlush !== undefined && !us.sewer) {
      facts.push({
        key: 'flush',
        label: 'No flush toilet',
        us: pct(us.noFlush),
        here: state ? (pct(st?.noFlush) ?? NA) : undefined,
        meter: [us.noFlush, state ? (st?.noFlush ?? null) : null],
        src: { name: 'Census, sewage disposal', url: P.sewage },
      });
    }
    if (us?.water) {
      facts.push({
        key: 'water',
        label: 'Water from a public system or company',
        note: `own well: ${pct(us.water[1])} across the US`,
        us: pct(us.water[0]),
        here: state ? (pct(st?.water?.[0]) ?? NA) : undefined,
        meter: [us.water[0], state ? (st?.water?.[0] ?? null) : null],
        src: { name: 'Census, source of water', url: P.water },
      });
    }
  }
  if (slice.ownYear) {
    const o = slice.own.US;
    facts.push({
      key: 'own',
      label: `Homes owned by the people living in them${slice.ownYear !== census ? `, ${slice.ownYear}` : ''}`,
      us: pct(o),
      here: state ? (pct(slice.own[state]) ?? NA) : undefined,
      meter: [o ?? null, state ? (slice.own[state] ?? null) : null],
      src: { name: 'Census, homeownership', url: P.owner },
    });
  }
  const sUS = slice.stock.US;
  const sSt = state ? slice.stock[state] : undefined;
  const binWords = acsBinPhrase(slice.bin);
  facts.push({
    key: 'stock',
    label: slice.bin === 0 ? 'Homes built in 1939 or earlier still standing today' : `Homes built in ${binWords} still standing today`,
    note: slice.bin === 9 ? '2020 to early 2024 only' : slice.bin === 0 ? 'the survey groups everything before 1940' : undefined,
    us: (
      <>
        {countWords(sUS.count)} <small>{pct(sUS.share)} of homes</small>
      </>
    ),
    here: state ? (
      sSt ? (
        <>
          {countWords(sSt.count)} <small>{pct(sSt.share)} of homes</small>
        </>
      ) : (
        NA
      )
    ) : undefined,
    meter: [sUS.share, state ? (sSt?.share ?? null) : null],
    src: { name: 'ACS 2020-2024, B25034', url: links.acs.url },
  });

  facts.push({
    key: 'median',
    label: 'Half of all homes standing today were built before',
    note: 'the median year built',
    us: String(slice.median.US),
    here: state ? (slice.median[state] ? String(slice.median[state]) : NA) : undefined,
    src: { name: 'ACS 2020-2024, B25035', url: links.acs.url.replace('b25034', 'b25035') },
  });

  const yb = slice.yb1950;
  const ybLabel = yb ? ['in 1919 or earlier', 'in the 1920s', 'in the 1930s', 'from 1940 to 1944', 'from 1945 to early 1950'][yb.band] : '';

  return (
    <section id={id} className={styles.section} aria-labelledby={headId}>
      <div className="section-head">
        <p className="label">The year in context · the country</p>
        <h2 id={headId}>{census ? `The country in ${census}` : 'The country\u2019s homes today'}</h2>
        <p className={styles.lede}>
          {census === 1940 && year < 1940
            ? `The 1940 census was the earliest national count of housing, so it is the nearest look at the homes of ${year}\u2019s world, ${1940 - year} years on. `
            : census
              ? `From the ${census} census, the one nearest ${year}. `
              : `The decennial census stopped collecting these details after 2000, so for a house built in ${year} there is only today\u2019s count. `}
          {census ? 'These describe every home standing at the time, old and new, not houses built that year.' : ''}
        </p>
      </div>

      <table className={styles.ledger}>
        <caption className="visually-hidden">
          {census ? `Housing facts from the ${census} census` : 'Housing facts'}
          {state ? `, the US and ${STATE_NAME[state]}` : ', the US'}
        </caption>
        <thead>
          <tr>
            <th scope="col">
              <span className="visually-hidden">Fact</span>
            </th>
            <th scope="col">US</th>
            {state ? <th scope="col">{STATE_NAME[state]}</th> : null}
          </tr>
        </thead>
        <tbody>
          {facts.map((f) => (
            <tr key={f.key}>
              <th scope="row">
                <span className={styles.factLabel}>{f.label}</span>
                {f.note ? <span className={styles.factNote}>{f.note}</span> : null}
                <a className={styles.factSrc} href={f.src.url} rel="noopener">
                  {f.src.name}
                </a>
              </th>
              <td data-col="US">
                <span className={styles.factVal}>{f.us}</span>
                {f.meter && f.meter[0] !== null ? <Meter v={f.meter[0]} /> : null}
              </td>
              {state ? (
                <td data-col={STATE_NAME[state]}>
                  <span className={styles.factVal}>{f.here}</span>
                  {f.meter && f.meter[1] !== null ? <Meter v={f.meter[1]} /> : null}
                </td>
              ) : null}
            </tr>
          ))}
          {yb ? (
            <tr>
              <th scope="row">
                <span className={styles.factLabel}>Homes in 1950 that had been built {ybLabel}</span>
                <span className={styles.factNote}>how much of the 1950 stock came from this house&rsquo;s years{state && region ? `; by region, not state` : ''}</span>
                <a className={styles.factSrc} href={links.yb1950.url} rel="noopener">
                  1950 Census of Housing
                </a>
              </th>
              <td data-col="US">
                <span className={styles.factVal}>{pct(yb.US)}</span>
                <Meter v={yb.US} />
              </td>
              {state ? (
                <td data-col={region ? GEO_LABEL[region] : STATE_NAME[state]}>
                  {region ? (
                    <>
                      <span className={styles.factVal}>
                        {pct(yb.regions[region])} <small>{GEO_LABEL[region]}</small>
                      </span>
                      <Meter v={yb.regions[region]} />
                    </>
                  ) : (
                    NA
                  )}
                </td>
              ) : null}
            </tr>
          ) : null}
        </tbody>
      </table>
      <p className={styles.ledgerFoot}>
        {census
          ? `Census figures are shares of homes counted in ${census}${census >= 1970 && census <= 1980 ? ' (year-round homes for sewer and water)' : ''}.${us?.plumb !== undefined && census < 1990 ? ' Until 1990 plumbing counted as complete only when the household had it to itself.' : ''} `
          : ''}
        Today&rsquo;s count is the {links.acs.publisher}&rsquo;s American Community Survey, 2020 to 2024, which includes
        vacant homes and dates them by what residents report.
        {state ? '' : ' Choose your state above to see it beside the US.'}
      </p>
    </section>
  );
}

function Meter({ v }: { v: number }) {
  return (
    <span className={styles.meter} aria-hidden="true">
      <span style={{ width: `${Math.min(100, Math.max(0, v))}%` }} />
    </span>
  );
}
