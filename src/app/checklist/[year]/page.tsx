import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { allYears, getIssuesForYear, getLifespans } from '@/lib/data';
import { MAX_YEAR, SITE, isValidYear } from '@/lib/site';
import { groupByPart } from '@/lib/select';
import { PARTS, ZONE_LABEL, plural } from '@/lib/labels';
import { PrintButton } from '@/components/checklist/PrintButton';
import { ChecklistTailor, TailoredCount, TailoredCutaway, type TailorItem } from '@/components/checklist/Tailor';
import type { Issue } from '@/lib/types';
import { oneLine, regionNote, regionTitle, sellerQuestions, splitColumns } from '@/components/checklist/sheet';
import styles from './checklist.module.css';

export const dynamicParams = false;

export function generateStaticParams() {
  return allYears().map((y) => ({ year: String(y) }));
}

type Props = { params: Promise<{ year: string }> };

function parseYear(raw: string): number | null {
  const y = Number(raw);
  return /^\d{4}$/.test(raw) && isValidYear(y) ? y : null;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const year = parseYear((await params).year);
  if (year === null) return {};
  const n = getIssuesForYear(year).length;
  return {
    title: `Viewing checklist for a house built in ${year}`,
    description: `A printable one-page sheet for viewing a US house built in ${year}: ${plural(n, 'thing')} to look for, what to check first, and what to ask the seller. ${SITE.disclaimer}`,
    alternates: { canonical: `/checklist/${year}` },
  };
}

/** Prompts that suit any viewing; shown when the record has little to say about a year. */
const EVERY_VIEWING = [
  'Read the date labels on the water heater, furnace and AC unit',
  'Look for water stains on ceilings, under sinks and around windows',
  'Ask for permits for any additions or remodels',
  "Ask for the seller's disclosure and any past inspection reports",
];

const host = SITE.url.replace(/^https?:\/\//, '').replace(/\/$/, '');

/** What the client islands need to tailor a row: its slug, conditions, part and main zone. */
const tailorItem = (i: Issue, part?: string): TailorItem => ({ slug: i.slug, ...(i.when ? { when: i.when } : {}), ...(part ? { part } : {}), zone: i.where[0] });
const whens = (xs: Issue[]) => xs.map((i) => (i.when ? { when: i.when } : {}));

function Tick({ id }: { id: string }) {
  return <input type="checkbox" id={id} className={`check ${styles.tick}`} />;
}

export default async function ChecklistPage({ params }: Props) {
  const year = parseYear((await params).year);
  if (year === null) notFound();

  const age = MAX_YEAR - year;
  const issues = getIssuesForYear(year);
  const first = issues.filter((i) => i.priority === 1);
  const missing = issues.filter((i) => i.kind === 'missing' && i.priority !== 1);
  const rest = issues.filter((i) => i.kind === 'present' && i.priority !== 1);
  const parts = groupByPart(rest, PARTS);
  // rough printed height of a group: heading + per item a title line and wrapped text lines
  const columns = splitColumns(parts, (p) =>
    1.4 + p.issues.reduce((h, i) => h + 1.3 + Math.ceil(oneLine(i.check[0]).length / 62), 0),
  );
  const asks = sellerQuestions(getLifespans(), age, issues.length > 12 && issues.length <= 26 ? 5 : 6);
  const sparse = issues.length < 10;
  /** Busy years print on two pages, so the notes can take the room page two has. */
  const busy = issues.length > 26;
  const partOf = new Map(parts.flatMap((p) => p.issues.map((i) => [i.id, p.id] as const)));
  const tailor = issues.map((i) => tailorItem(i, partOf.get(i.id)));
  const conditional = issues.some((i) => i.when);

  return (
    <div className={styles.page}>
      {/* running footer on every printed page (Chromium margin boxes; ignored elsewhere) */}
      <style>{`@page{@bottom-left{content:${JSON.stringify(`${SITE.name} · Viewing checklist · built ${year}`)};font:7pt 'IBM Plex Mono',monospace;color:#555}@bottom-right{content:"Page " counter(page) " of " counter(pages);font:7pt 'IBM Plex Mono',monospace;color:#555}}`}</style>
      {/* ---------- screen-only toolbar ---------- */}
      <div className={`wrap ${styles.toolbar}`}>
        <div className={styles.toolbarText}>
          <Link href={`/built/${year}`} className={styles.back}>
            <span aria-hidden="true">←</span> The full {year} report
          </Link>
          <p className={styles.hint}>
            One sheet to take to a viewing. Prints on US Letter
            {busy ? ' (two pages for a year this busy)' : ''}; tick boxes work on a phone too.
          </p>
        </div>
        <PrintButton className={styles.print} />
      </div>

      {/* ---------- the sheet ---------- */}
      <article className={styles.sheet} aria-labelledby="sheet-title">
        <header className={styles.tb}>
          <div className={styles.tbMain}>
            <p className={styles.kicker}>Viewing checklist</p>
            <h1 id="sheet-title" className={styles.title}>
              <span className={styles.titleLead}>A house built in</span>
              <span className={styles.year}>{year}</span>
            </h1>
          </div>
          <dl className={styles.cells}>
            <div>
              <dt>Age</dt>
              <dd>
                {age === 0 ? 'New' : age}
                {age > 0 && <small>{age === 1 ? 'yr' : 'yrs'}</small>}
              </dd>
            </div>
            <div>
              <dt>On record</dt>
              <dd>{conditional ? <TailoredCount items={whens(issues)} /> : issues.length}</dd>
            </div>
            <div className={first.length ? styles.cellAccent : undefined}>
              <dt>Check first</dt>
              <dd>{conditional ? <TailoredCount items={whens(first)} /> : first.length}</dd>
            </div>
          </dl>
          <div className={styles.fill}>
            <label>
              <span>Address</span>
              <input type="text" autoComplete="off" />
            </label>
            <label>
              <span>Date viewed</span>
              <input type="text" autoComplete="off" />
            </label>
          </div>
          <p className={styles.tbFoot}>
            <span className={styles.brand}>{SITE.name}</span>
            <span>
              Sources and detail: {host}/built/{year}
            </span>
            <span className={styles.disclaimer}>{SITE.disclaimer}</span>
            {conditional ? <ChecklistTailor items={tailor} className={styles.tailored} /> : null}
          </p>
        </header>

        {/* ---------- check first ---------- */}
        <section className={`${styles.sec} ${styles.secFirst}`} aria-labelledby="cf-h">
          <h2 id="cf-h" className={styles.h}>
            <span>Check these first</span>
            <span className={styles.hn}>{conditional ? <TailoredCount items={whens(first)} /> : first.length}</span>
          </h2>
          {first.length > 0 ? (
            <ol className={styles.firstList}>
              {first.map((i) => (
                <li key={i.id} className={styles.firstItem} data-item={i.slug}>
                  <Tick id={`t-${i.slug}`} />
                  <div>
                    <label htmlFor={`t-${i.slug}`} className={styles.firstTitle}>
                      <span className={styles.num} aria-hidden="true" />
                      {i.title}
                      {regionNote(i.regions) && (
                        <span className={styles.region} title={regionTitle(i.regions)}>
                          {regionNote(i.regions)} only
                        </span>
                      )}
                    </label>
                    <p className={styles.firstCheck}>{i.check[0]}</p>
                    <p className={styles.where}>
                      <span className={styles.whereK}>Look</span> {i.where.map((z) => ZONE_LABEL[z]).join(' · ')}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          ) : (
            <p className={styles.none}>
              Nothing on record marks a {year} house for an urgent check. Use the questions and the notes below.
            </p>
          )}
        </section>

        {/* ---------- by part ---------- */}
        {parts.length > 0 && (
          <section className={styles.sec} aria-labelledby="bp-h">
            <h2 id="bp-h" className={styles.h}>
              <span>Also look for, by part of the house</span>
              <span className={styles.hn}>{conditional ? <TailoredCount items={whens(rest)} /> : rest.length}</span>
            </h2>
            <div className={styles.parts}>
              {columns.map((col, c) => (
                <div key={c} className={styles.partCol}>
                  {col.map((p) => (
                    <div key={p.id} className={styles.part} data-part={p.id}>
                      <h3 className={styles.partH}>{p.label}</h3>
                      <ul className={styles.lines}>
                        {p.issues.map((i) => (
                          <li key={i.id} className={styles.line} data-item={i.slug}>
                            <Tick id={`t-${i.slug}`} />
                            <label htmlFor={`t-${i.slug}`}>
                              <strong>{i.title}</strong>
                              {regionNote(i.regions) && (
                                <span className={styles.region} title={regionTitle(i.regions)}>
                                  {regionNote(i.regions)}
                                </span>
                              )}
                              <span className={styles.lineText}>{oneLine(i.check[0])}</span>
                            </label>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ---------- lower band ---------- */}
        <div className={styles.band}>
          <section className={styles.sec} aria-labelledby="bw-h">
            <h2 id="bw-h" className={styles.h}>
              <span>Built without</span>
              <span className={styles.hn}>{conditional ? <TailoredCount items={whens(missing)} /> : missing.length}</span>
            </h2>
            {missing.length > 0 ? (
              <>
                <p className={styles.note}>Standard after {year}. Many houses have had them added; see if this one has.</p>
                <ul className={styles.lines}>
                  {missing.map((i) => (
                    <li key={i.id} className={styles.line} data-item={i.slug}>
                      <Tick id={`t-${i.slug}`} />
                      <label htmlFor={`t-${i.slug}`}>
                        {i.title}
                        {regionNote(i.regions) && (
                          <span className={styles.region} title={regionTitle(i.regions)}>
                            {regionNote(i.regions)}
                          </span>
                        )}
                      </label>
                    </li>
                  ))}
                </ul>
              </>
            ) : (
              <p className={styles.note}>
                A {year} house was built after every protection we track became standard.
              </p>
            )}
            {sparse && (
              <>
                <h3 className={styles.partH}>On any viewing</h3>
                <ul className={styles.lines}>
                  {EVERY_VIEWING.map((t, n) => (
                    <li key={t} className={styles.line}>
                      <Tick id={`t-any-${n}`} />
                      <label htmlFor={`t-any-${n}`}>{t}</label>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </section>

          <section className={styles.sec} aria-labelledby="as-h">
            <h2 id="as-h" className={styles.h}>
              <span>Ask the seller</span>
            </h2>
            <p className={styles.note}>
              {age === 0
                ? 'Everything is new; ask about warranties.'
                : `If these are original they are ${age} years old. Typical life:`}
            </p>
            <ol className={styles.asks}>
              {age <= 10 && (
                <li>
                  <p className={styles.q}>Is the builder&rsquo;s warranty still in force, and does it transfer?</p>
                </li>
              )}
              {asks.map((a) => (
                <li key={a.zone}>
                  <p className={styles.q}>{a.q}</p>
                  <p className={styles.life}>
                    {a.life}
                    {a.status === 'past' && <span className={styles.past}> · past typical life</span>}
                    {a.status === 'soon' && <span> · due soon</span>}
                  </p>
                  <span className={styles.answer} aria-hidden="true" />
                </li>
              ))}
            </ol>
          </section>

          <section className={`${styles.sec} ${styles.where2}`} aria-labelledby="wh-h nt-h">
            <h2 id="wh-h" className={styles.h}>
              <span>Where to look</span>
            </h2>
            <TailoredCutaway
              items={tailor}
              size="md"
              className={styles.cutaway}
              label={`House cross-section showing how many items on this sheet are found in each part of the house.`}
            />
            <p className={styles.note}>
              {issues.length > 0
                ? 'Dots count the items above by where to look.'
                : 'Nothing on record for this year, so no dots.'}
            </p>
            <h3 id="nt-h" className={`${styles.partH} ${styles.notesH}`}>
              Notes
            </h3>
            <div
              className={styles.ruled}
              aria-hidden="true"
              style={sparse || busy ? ({ '--min-lines': sparse ? 9 : 12 } as React.CSSProperties) : undefined}
            >
              {[...Array(30)].map((_, n) => (
                <span key={n} />
              ))}
            </div>
          </section>
        </div>

        <footer className={styles.sheetFoot}>
          <span>
            {SITE.name} · {host}/checklist/{year}
          </span>
          <span>{SITE.disclaimer}</span>
        </footer>
      </article>
    </div>
  );
}
