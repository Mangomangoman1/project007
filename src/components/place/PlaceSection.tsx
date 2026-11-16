'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { STATE_NAME } from '@/lib/labels';
import {
  ACS_LAST_YEAR,
  cleanZip,
  firmContext,
  housingFor,
  isValidZip,
  mainFuels,
  placeStatements,
  RADON_TEXT,
  type Place,
} from '@/lib/place';
import { HousingChart } from './HousingChart';
import { usePlaceLookup, usePlacePref } from './usePlace';
import styles from './Place.module.css';

const SRC = {
  acs: {
    name: 'U.S. Census Bureau, American Community Survey 2020–2024 5-year estimates (B25034, B25035, B25040)',
    url: 'https://www.census.gov/programs-surveys/acs/data/summary-file.html',
  },
  zcta: {
    name: 'U.S. Census Bureau, 2020 ZCTA-to-county relationship file',
    url: 'https://www2.census.gov/geo/docs/maps-data/data/rel2020/zcta520/tab20_zcta520_county20_natl.txt',
  },
  radon: { name: 'U.S. EPA, Map of Radon Zones (1993)', url: 'https://www.epa.gov/radon/epa-map-radon-zones' },
  climate: {
    name: 'U.S. DOE / PNNL, Guide to Determining Climate Regions by County (2015)',
    url: 'https://www.energy.gov/sites/prod/files/2015/10/f27/ba_climate_region_guide_7.3.pdf',
  },
  nfip: {
    name: 'FEMA, NFIP Community Status Book (OpenFEMA)',
    url: 'https://www.fema.gov/openfema-data-page/nfip-community-status-book-v1',
  },
  msc: { name: 'FEMA Flood Map Service Center', url: 'https://msc.fema.gov/portal/search' },
};

function Source({ s, note }: { s: { name: string; url: string }; note?: string }) {
  return (
    <p className={styles.source}>
      <span className={styles.sourceLabel}>Source</span>{' '}
      <a href={s.url} rel="noopener noreferrer" target="_blank">
        {s.name}
      </a>
      {note ? <span>. {note}</span> : null}
    </p>
  );
}

const stateName = (code: string | null) => (code ? (STATE_NAME[code] ?? (code === 'PR' ? 'Puerto Rico' : code)) : null);
const fmt = (n: number) => (n >= 1000 ? `${Math.round(n / 100) * 100}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',') : `${n}`);

export type PlaceSectionProps = {
  year: number;
  /** The report's state selector (USPS code or null for all states). */
  state: string | null;
  onStateChange: (code: string) => void;
};

/**
 * "Your place": an optional ZIP code turns into a few sourced, county- or ZIP-level facts. The ZIP
 * stays on the device (localStorage); the only request is the static shard for its 3-digit prefix
 * plus the county file, both from this site. Without JavaScript the section is a short note.
 */
export function PlaceSection({ year, state, onStateChange }: PlaceSectionProps) {
  const [pref, setPref] = usePlacePref();
  const [draft, setDraft] = useState<string | null>(null);
  const [asked, setAsked] = useState<string | null>(null); // ZIP the visitor just looked up (not restored)
  const [moved, setMoved] = useState<{ from: string | null; to: string } | null>(null);
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);

  const zip = pref?.zip ?? null;
  const value = draft ?? zip ?? '';
  const lookup = usePlaceLookup(zip);
  const place = lookup.status === 'found' ? lookup.place : null;
  const placeState = place?.state && STATE_NAME[place.state] ? place.state : null;

  // A ZIP the visitor just entered sets the report's state, unless they chose a different one.
  useEffect(() => {
    if (!place || !placeState || asked !== place.zip || !pref) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- act once on the lookup the visitor asked for
    setAsked(null);
    if (state === placeState) return;
    if (state === null || state === pref.setState) {
      onStateChange(placeState);
      setPref({ zip: place.zip, setState: placeState });
      setMoved({ from: state, to: placeState });
    }
  }, [place, placeState, asked, pref, state, onStateChange, setPref]);

  const mismatch = placeState && state && state !== placeState && pref?.keep !== state ? state : null;

  const submit = (raw: string) => {
    const z = cleanZip(raw);
    if (!isValidZip(z)) {
      setDraft(z);
      return;
    }
    setDraft(null);
    if (z === zip) return; // already showing it (e.g. Enter after the fifth digit looked it up)
    setMoved(null);
    setAsked(z);
    setPref({ zip: z, setState: pref?.setState });
  };

  const forget = () => {
    setPref(null);
    setDraft('');
    setMoved(null);
    inputRef.current?.focus();
  };

  const typed = draft !== null ? cleanZip(draft) : null;
  const invalid = typed !== null && typed.length > 0 && typed.length < 5 ? 'A ZIP code has five digits.' : typed === '00000' ? 'That is not a ZIP code.' : null;

  return (
    <section id="your-place" className={`${styles.section}`} aria-labelledby="your-place-h">
      <div className="section-head">
        <h2 id="your-place-h">Your place</h2>
        <p className={styles.lede}>
          Add a ZIP code for a few sourced facts about where the house stands: the homes around it, radon, climate and
          flood maps. All optional.
        </p>
      </div>

      <p className={styles.noJs}>
        Looking up a ZIP code needs JavaScript. Everything else on this page works without it.
      </p>

      <form
        className={styles.form}
        role="search"
        aria-label="Look up a ZIP code"
        onSubmit={(e) => {
          e.preventDefault();
          submit(value);
        }}
      >
        <label htmlFor={inputId} className={styles.formLabel}>
          ZIP code
        </label>
        <div className={styles.field}>
          <input
            ref={inputRef}
            id={inputId}
            className={styles.zipInput}
            type="text"
            inputMode="numeric"
            autoComplete="postal-code"
            pattern="[0-9]{5}"
            maxLength={10}
            placeholder="00000"
            spellCheck={false}
            value={value}
            aria-invalid={invalid ? true : undefined}
            aria-describedby={`${inputId}-note`}
            onChange={(e) => {
              const z = cleanZip(e.target.value);
              setDraft(z);
              if (isValidZip(z) && z !== zip && e.target.value.length >= 5) submit(z);
            }}
          />
          <button type="submit" className={styles.go}>
            Look up <span aria-hidden="true">→</span>
          </button>
          {zip ? (
            <button type="button" className={styles.forget} onClick={forget}>
              Forget this ZIP
            </button>
          ) : null}
        </div>
        <p id={`${inputId}-note`} className={styles.privacy}>
          {invalid ?? (
            <>
              <svg viewBox="0 0 12 12" width="12" height="12" aria-hidden="true">
                <rect x="2" y="5.5" width="8" height="5.5" fill="none" stroke="currentColor" />
                <path d="M4 5.5V4a2 2 0 0 1 4 0v1.5" fill="none" stroke="currentColor" />
              </svg>
              Stays on this device. The lookup loads two small data files from this site; your ZIP goes nowhere else.
            </>
          )}
        </p>
      </form>

      <div aria-live="polite" className={styles.status}>
        {lookup.status === 'loading' ? <p className={styles.loading}>Looking up {lookup.zip}…</p> : null}
        {lookup.status === 'missing' ? (
          <p className={styles.miss}>
            <strong>We don&rsquo;t have data for that ZIP.</strong> The Census publishes figures for about 33,000 ZIP code
            areas; PO box and business-only ZIPs often have none of their own. Try the ZIP of the street address, or a
            neighboring one.
          </p>
        ) : null}
        {lookup.status === 'error' ? (
          <p className={styles.miss}>
            <strong>That lookup didn&rsquo;t load.</strong> Check the connection and try again.
          </p>
        ) : null}
      </div>

      {place ? (
        <PlaceSheet
          place={place}
          year={year}
          state={state}
          mismatch={mismatch}
          moved={moved}
          onUse={(code) => {
            onStateChange(code);
            setPref({ zip: place.zip, setState: code });
            setMoved(null);
          }}
          onKeep={(code) => setPref({ zip: place.zip, setState: pref?.setState, keep: code })}
          onUndo={() => {
            if (!moved) return;
            onStateChange(moved.from ?? '');
            setPref({ zip: place.zip });
            setMoved(null);
          }}
        />
      ) : null}
    </section>
  );
}

function PlaceSheet({
  place,
  year,
  mismatch,
  moved,
  onUse,
  onKeep,
  onUndo,
}: {
  place: Place;
  year: number;
  state: string | null;
  mismatch: string | null;
  moved: { from: string | null; to: string } | null;
  onUse: (code: string) => void;
  onKeep: (code: string) => void;
  onUndo: () => void;
}) {
  const sName = stateName(place.state);
  const s = placeStatements(place, year, sName);
  const { from, h } = housingFor(place);
  const area = from === 'county' ? place.county : 'this ZIP';
  const fuels = mainFuels(h?.fuel ?? null);
  const fuelMax = Math.max(...fuels.map((f) => f.pct), 1);

  return (
    <div className={styles.sheet}>
      {/* ---------- where this is ---------- */}
      <div className={styles.where}>
        <div className={styles.zipCell}>
          <span className={styles.cellLabel}>ZIP</span>
          <span className={styles.zipNumeral}>{place.zip}</span>
        </div>
        <div className={styles.whereMain}>
          <span className={styles.cellLabel}>Where this is</span>
          <p className={styles.county}>
            {place.county}
            {sName ? <span className={styles.stateName}>, {sName}</span> : null}
          </p>
          <p className={styles.small}>
            {/ city$/.test(place.county) ? 'An independent city, which Census and EPA data count as a county. ' : ''}
            {s.spans ??
              'A ZIP code can cross county lines; the county facts below are for the one that holds most of its land.'}
          </p>
          <Source s={SRC.zcta} note="Land area, not addresses" />
        </div>
        {mismatch && place.state ? (
          <div className={styles.ask} role="group" aria-label="Report state">
            <p>
              This ZIP is in {stateName(place.state)}, but the report is set to {stateName(mismatch)}.
            </p>
            <div className={styles.askActions}>
              <button type="button" className={styles.askBtn} onClick={() => onUse(place.state!)}>
                Use {stateName(place.state)}
              </button>
              <button type="button" className={styles.askBtnQuiet} onClick={() => onKeep(mismatch)}>
                Keep {stateName(mismatch)}
              </button>
            </div>
          </div>
        ) : moved ? (
          <div className={styles.ask}>
            <p>
              The report is now set to {stateName(moved.to)}, so regional issues for other states are hidden.
            </p>
            <div className={styles.askActions}>
              <button type="button" className={styles.askBtnQuiet} onClick={onUndo}>
                Undo
              </button>
            </div>
          </div>
        ) : null}
      </div>

      {/* ---------- houses around you ---------- */}
      <section className={styles.fact} aria-labelledby="place-houses-h">
        <div className={styles.factHead}>
          <h3 id="place-houses-h">Houses around you</h3>
          <span className={styles.factScope}>{from === 'county' ? 'County figures' : from === 'zip' ? 'ZIP figures' : null}</span>
        </div>
        {s.housingNote ? <p className={styles.small}>{s.housingNote}</p> : null}
        {h?.bins ? (
          <>
            {s.comparison ? <p className={styles.statement}>{s.comparison}</p> : null}
            <div className={styles.housing}>
              <HousingChart bins={h.bins} year={year} area={area} />
              <dl className={styles.cells}>
                <div>
                  <dt>Median year built</dt>
                  <dd>
                    {h.median ? (
                      <>
                        <span className="visually-hidden">about </span>
                        {h.median}
                      </>
                    ) : (
                      <small>no estimate</small>
                    )}
                  </dd>
                </div>
                <div>
                  <dt>Homes counted</dt>
                  <dd>
                    <small>about</small> {fmt(h.units)}
                  </dd>
                </div>
              </dl>
            </div>
            {fuels.length ? (
              <div className={styles.fuels}>
                <p className={styles.cellLabel}>Main heating fuel, occupied homes</p>
                <ul>
                  {fuels.map((f) => (
                    <li key={f.id}>
                      <span className={styles.fuelName}>{f.label}</span>
                      <span className={styles.fuelBar} aria-hidden="true">
                        <span style={{ width: `${(f.pct / fuelMax) * 100}%` }} />
                      </span>
                      <span className={styles.fuelPct}>
                        <span className="visually-hidden">about </span>
                        {f.pct}%
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
            <Source
              s={SRC.acs}
              note={`Estimates from a survey, so read every figure as “about”; year built is as owners report it, and the survey counts homes built through ${ACS_LAST_YEAR}`}
            />
          </>
        ) : null}
      </section>

      {/* ---------- radon ---------- */}
      {place.radon ? (
        <section className={`${styles.fact} ${styles.radon}`} aria-labelledby="place-radon-h">
          <div className={styles.factHead}>
            <h3 id="place-radon-h">Radon</h3>
            <span className={styles.factScope}>County prediction</span>
          </div>
          <div className={styles.radonBody}>
            <div className={styles.zone}>
              <span className={styles.cellLabel}>EPA zone</span>
              <span className={styles.zoneNumeral}>{place.radon}</span>
              <span className={styles.zoneScale} aria-hidden="true">
                {[1, 2, 3].map((z) => (
                  <span key={z} data-on={z === place.radon ? '' : undefined}>
                    {z}
                  </span>
                ))}
              </span>
              <span className={styles.zoneWord}>{RADON_TEXT[place.radon].potential} potential</span>
            </div>
            <div className={styles.radonText}>
              <p>{s.radon}</p>
              <p className={styles.testAll}>
                <strong>Test this house anyway.</strong> In EPA&rsquo;s words, the map &ldquo;should not be used to
                determine if individual homes need to be tested.&rdquo; &ldquo;Homes with elevated levels of radon have
                been found in all three zones. All homes should be tested for radon.&rdquo;
              </p>
              <p className={styles.small}>
                A home test kit or a certified tester gives the actual level. EPA recommends fixing a home at 4 pCi/L or
                more.
              </p>
            </div>
          </div>
          <Source s={SRC.radon} note="Developed in 1993; it predicts county averages, not any one home" />
        </section>
      ) : null}

      <div className={styles.pair}>
        {/* ---------- climate ---------- */}
        {place.climate ? (
          <section className={styles.fact} aria-labelledby="place-climate-h">
            <div className={styles.factHead}>
              <h3 id="place-climate-h">Climate zone</h3>
              <span className={styles.factScope}>County</span>
            </div>
            <p className={styles.bigFigure}>
              {place.climate.zone}
              {place.climate.moisture ?? ''}
              <span className={styles.bigFigureNote}>{place.climate.region}</span>
            </p>
            <p>{s.climate}</p>
            <p className={styles.small}>
              The zone sets the energy code&rsquo;s insulation and window rules for new homes. This is the 2015 county
              table; the 2021 update moved a few counties.
            </p>
            <Source s={SRC.climate} />
          </section>
        ) : null}

        {/* ---------- first flood map ---------- */}
        {place.firm ? (
          <section className={styles.fact} aria-labelledby="place-firm-h">
            <div className={styles.factHead}>
              <h3 id="place-firm-h">First flood map</h3>
              <span className={styles.factScope}>County context</span>
            </div>
            <p className={styles.bigFigure}>
              {place.firm.earliest === place.firm.latest ? (
                place.firm.earliest
              ) : (
                <>
                  {place.firm.earliest}
                  <span className={styles.dash}>–</span>
                  {place.firm.latest}
                </>
              )}
              <span className={styles.bigFigureNote}>
                {place.firm.communities === 1 ? 'one community' : `${place.firm.communities} community records`}
              </span>
            </p>
            <p>{s.firm}</p>
            <p className={styles.small}>
              FEMA calls a building &ldquo;pre-FIRM&rdquo; if it was built by the end of 1974 or before its
              community&rsquo;s first map. It was not built to the map&rsquo;s flood-elevation rules, and flood insurance
              can treat it differently. {firmContext(place.firm, year)} None of this says whether a particular address is
              in a flood zone.
            </p>
            <p className={styles.mapLink}>
              <a href={SRC.msc.url} rel="noopener noreferrer" target="_blank">
                Look up the address on FEMA&rsquo;s flood map service <span aria-hidden="true">↗</span>
              </a>
            </p>
            <Source s={SRC.nfip} note="Initial FIRM dates by community" />
          </section>
        ) : place.state && place.state !== 'PR' ? (
          <section className={styles.fact} aria-labelledby="place-firm-h">
            <div className={styles.factHead}>
              <h3 id="place-firm-h">First flood map</h3>
              <span className={styles.factScope}>County context</span>
            </div>
            <p className={styles.small}>
              FEMA&rsquo;s community records have no usable first-map date for {place.county}, so we leave it out rather
              than guess.
            </p>
            <p className={styles.mapLink}>
              <a href={SRC.msc.url} rel="noopener noreferrer" target="_blank">
                Look up the address on FEMA&rsquo;s flood map service <span aria-hidden="true">↗</span>
              </a>
            </p>
            <Source s={SRC.nfip} />
          </section>
        ) : null}
      </div>
      {!place.radon && !place.climate ? (
        <p className={styles.small}>EPA&rsquo;s radon map and the DOE climate table do not cover this area.</p>
      ) : null}
    </div>
  );
}
