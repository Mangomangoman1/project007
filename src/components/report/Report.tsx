'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { Lifespan, Zone } from '@/lib/types';
import type { IssueLite } from '@/lib/data';
import { groupByPart, groupLifespans, inState, isCore, issuesForYear } from '@/lib/select';
import { PARTS, STATES, STATE_NAME, plural } from '@/lib/labels';
import { MAX_YEAR, MIN_YEAR, STORAGE_KEYS } from '@/lib/site';
import { readStore, writeStore } from '@/lib/storage';
import { yearsLabel } from '@/lib/timeline';
import { HouseCutaway } from '@/components/HouseCutaway/HouseCutaway';
import { Timeline } from '../Timeline';
import { TimelineLegend } from '../TimelineLegend';
import { CheckFirstTag, EvidenceStamp } from '../Stamps';
import { IssueBand } from '../IssueBand';
import { IssueRow, type ReportIssue } from './IssueRow';
import { LifespanList } from './LifespanList';
import styles from './Report.module.css';

export type ReportProps = {
  year: number;
  /** Issues that apply to `year` (any state), sorted. */
  issues: ReportIssue[];
  lifespans: Lifespan[];
  /** All issues, for the timeline. */
  timelineIssues: IssueLite[];
};

/**
 * A house is "new" when it is young (≤ 15 years) and at most two priority-1/2 issues apply.
 * New-house reports lead with what's due and say plainly that little is known to be wrong.
 */
function isNewHouse(issues: ReportIssue[], age: number) {
  return age <= 15 && issues.filter((i) => i.priority <= 2).length <= 2;
}

/** Open the report row a "#i-<slug>" hash points at (rows are collapsed <details>). */
function openHashTarget() {
  const id = decodeURIComponent(window.location.hash.slice(1));
  if (!id.startsWith('i-')) return;
  const el = document.getElementById(id);
  const d = el?.querySelector<HTMLDetailsElement>('details[data-row]');
  if (d && !d.open) {
    d.open = true;
    el!.scrollIntoView({ block: 'start' });
  }
}

/**
 * The full report for one build year. Server-rendered with no state filter (so the static HTML
 * contains everything); after hydration it restores the visitor's state and filters regional
 * issues client-side. "Check these first" is rich and open; the long tail ("Built without",
 * "by part of the house") is compact <details> rows that expand in place.
 */
export function Report({ year, issues, lifespans, timelineIssues }: ReportProps) {
  const router = useRouter();
  const age = MAX_YEAR - year;
  const [state, setState] = useState<string | null>(null);
  const [scrub, setScrub] = useState(year);
  const [active, setActive] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const tocRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const s = readStore<string | null>(STORAGE_KEYS.state, null);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- restoring client-only state after hydration
    if (s && STATE_NAME[s]) setState(s);
    writeStore(STORAGE_KEYS.year, year);
  }, [year]);

  useEffect(() => {
    openHashTarget();
    window.addEventListener('hashchange', openHashTarget);
    return () => window.removeEventListener('hashchange', openHashTarget);
  }, []);

  const chooseState = (s: string) => {
    const v = s || null;
    setState(v);
    writeStore(STORAGE_KEYS.state, v);
  };

  const shown = useMemo(() => issues.filter((i) => inState(i, state)), [issues, state]);
  const hidden = issues.length - shown.length;
  const first = shown.filter((i) => i.priority === 1);
  const missing = shown.filter((i) => i.kind === 'missing' && i.priority !== 1);
  const rest = shown.filter((i) => i.kind === 'present' && i.priority !== 1);
  const parts = groupByPart(rest, PARTS);
  const allMissing = shown.filter((i) => i.kind === 'missing').length;

  const zoneCounts = useMemo(() => {
    const c: Partial<Record<Zone, number>> = {};
    for (const i of shown) for (const z of new Set(i.where)) c[z] = (c[z] ?? 0) + 1;
    return c;
  }, [shown]);

  const newHouse = isNewHouse(shown, age);
  const lead = shown[0] ?? null;
  const life = useMemo(() => groupLifespans(lifespans, age), [lifespans, age]);
  const dueNow = life.due.length;
  const dueOrSoon = life.due.length + life.past.length + life.soon.length;
  // What comes due first: anything due/past, then the soonest of the rest.
  const upcoming = [...life.due, ...life.past, ...life.soon, ...life.later].slice(0, 5);
  const firstDue = [...life.soon, ...life.later].slice(0, 3);
  const listText = (xs: string[]) => (xs.length < 2 ? xs.join('') : `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`);

  const prev = year > MIN_YEAR ? year - 1 : null;
  const next = year < MAX_YEAR ? year + 1 : null;
  const go = (y: number) => {
    if (y !== year) router.push(`/built/${y}`);
  };

  const toc = [
    ...(newHouse ? [{ id: 'whats-due', label: "What's due", n: dueOrSoon }] : []),
    { id: 'check-first', label: 'Check first', n: first.length },
    { id: 'built-without', label: 'Built without', n: missing.length },
    { id: 'by-part', label: 'By part of the house', n: rest.length },
    ...(!newHouse ? [{ id: 'whats-due', label: "What's due", n: dueOrSoon }] : []),
  ].filter((t) => t.n > 0 || t.id === 'whats-due');
  const tocKey = toc.map((t) => t.id).join(',');

  // Which section is on screen, for the navigator.
  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') return;
    const ids = tocKey.split(',');
    const seen = new Map<string, boolean>();
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) seen.set(e.target.id, e.isIntersecting);
        const current = ids.find((id) => seen.get(id));
        if (current) setActive(current);
      },
      { rootMargin: '-35% 0px -60% 0px' },
    );
    for (const id of ids) {
      const el = document.getElementById(id);
      if (el) io.observe(el);
    }
    return () => io.disconnect();
  }, [tocKey]);

  // Keep the active item visible in the phone navigator strip (it scrolls sideways).
  useEffect(() => {
    const nav = tocRef.current;
    const a = nav?.querySelector<HTMLElement>('a[aria-current="true"]');
    if (!nav || !a || nav.scrollWidth <= nav.clientWidth) return;
    const left = a.offsetLeft - nav.clientWidth / 2 + a.offsetWidth / 2;
    nav.scrollTo({ left: Math.max(0, left), behavior: 'smooth' });
  }, [active]);

  const toggleAll = (sectionId: string) => {
    const open = !expanded[sectionId];
    document.querySelectorAll<HTMLDetailsElement>(`#${sectionId} details[data-row]`).forEach((d) => (d.open = open));
    setExpanded((e) => ({ ...e, [sectionId]: open }));
  };
  const expandAll = (sectionId: string, n: number) => (
    <button type="button" className={styles.expandAll} onClick={() => toggleAll(sectionId)} aria-controls={sectionId}>
      <span className={`${styles.expandIcon} ${expanded[sectionId] ? styles.expandIconOpen : ''}`} aria-hidden="true" />
      {expanded[sectionId] ? 'Collapse all' : `Expand all ${n}`}
    </button>
  );

  const printLink = (cls: string) => (
    <Link href={`/checklist/${year}`} className={cls} prefetch={false}>
      <svg viewBox="0 0 16 16" width="15" height="15" aria-hidden="true">
        <path d="M4 6V1.5h8V6M4 12H2V6.5h12V12h-2" fill="none" stroke="currentColor" strokeWidth="1.2" />
        <path d="M4.5 9.5h7v5h-7z" fill="none" stroke="currentColor" strokeWidth="1.2" />
      </svg>
      Print the viewing checklist
    </Link>
  );

  const dueSection = (
    <section id="whats-due" className={styles.section} aria-labelledby="whats-due-h">
      <div className="section-head">
        <h2 id="whats-due-h">What&rsquo;s due at this age</h2>
        <p className={styles.sectionLede}>
          {age === 0
            ? `A house built in ${year} is brand new, so nothing is due yet. Here is when its parts typically reach the end of their life.`
            : `A ${year} house is ${plural(age, 'year')} old. Here is where its parts stand against their typical life, and which ones have certainly been replaced by now.`}
        </p>
      </div>
      <LifespanList lifespans={lifespans} year={year} age={age} />
    </section>
  );

  return (
    <article className={styles.report}>
      {/* ---------- title block ---------- */}
      <header className={`wrap ${styles.titleBlock}`}>
        <div className={styles.tbMain}>
          <p className="label">Report · houses built in</p>
          <h1 className={styles.year}>
            <span className="visually-hidden">What a house built in </span>
            <span className="numeral">{year}</span>
            <span className="visually-hidden"> often has</span>
          </h1>
          <nav className={styles.stepper} aria-label="Neighboring years">
            {prev ? (
              <Link href={`/built/${prev}`} rel="prev" prefetch={false}>
                <span aria-hidden="true">←</span> {prev}
              </Link>
            ) : (
              <span />
            )}
            {next ? (
              <Link href={`/built/${next}`} rel="next" prefetch={false}>
                {next} <span aria-hidden="true">→</span>
              </Link>
            ) : null}
          </nav>
        </div>
        <div className={styles.tbSide}>
          <dl className={styles.cells}>
            <div>
              <dt>Age</dt>
              <dd>
                {age}
                <small>{age === 1 ? 'yr' : 'yrs'}</small>
              </dd>
            </div>
            <div>
              <dt>On record</dt>
              <dd>{shown.length}</dd>
            </div>
            <div className={first.length ? styles.cellAccent : undefined}>
              <dt>Check first</dt>
              <dd>{first.length}</dd>
            </div>
            <div>
              <dt>Built without</dt>
              <dd>{allMissing}</dd>
            </div>
          </dl>
          <div className={styles.stateCell}>
            <label htmlFor="state-select" className="label">
              Your state
            </label>
            <select id="state-select" className="select" value={state ?? ''} onChange={(e) => chooseState(e.target.value)}>
              <option value="">All states</option>
              {STATES.map((s) => (
                <option key={s.code} value={s.code}>
                  {s.name}
                </option>
              ))}
            </select>
            <p className={styles.stateNote} aria-live="polite">
              {state
                ? hidden > 0
                  ? `${plural(hidden, 'regional issue')} for other states hidden.`
                  : `No regional issues hidden for ${STATE_NAME[state]}.`
                : 'Choose one to hide issues that only apply elsewhere.'}
            </p>
          </div>
        </div>
      </header>

      {/* ---------- headline finding ---------- */}
      <section className={`wrap ${styles.headline} ${styles.headlineSplit}`} aria-labelledby="headline-h">
        {newHouse || !lead ? (
          <>
            <div className={styles.headMain}>
              <p className="label" id="headline-h">
                Headline finding
              </p>
              <p className={styles.statement}>Little is known to be wrong with houses this new.</p>
              <p className={styles.standfirst}>
                Nothing in the record marks {year} as a problem year for materials or methods
                {shown.length ? `; ${plural(shown.length, 'item')} below still ${shown.length === 1 ? 'applies' : 'apply'}, mostly things any house can have` : ''}.
                What matters now is upkeep:{' '}
                {dueNow > 0
                  ? `${plural(dueNow, 'part')} ${dueNow === 1 ? 'is' : 'are'} already in ${dueNow === 1 ? 'its' : 'their'} replacement window.`
                  : firstDue.length
                    ? `the first parts to come due are typically the ${listText(firstDue.map((f) => f.item.title.toLowerCase()))}.`
                    : 'nothing is due yet.'}
              </p>
              <div className={styles.actions}>
                <a href="#whats-due" className={styles.actionLink}>
                  See what&rsquo;s due →
                </a>
                {printLink(styles.printLink)}
              </div>
            </div>
            {upcoming.length > 0 && (
              <div className={styles.headAside}>
                <div className={styles.upcoming}>
                  <p className="label">First to come due</p>
                  <ol>
                    {upcoming.map(({ item, standing }) => (
                      <li key={item.id}>
                        <span>{item.title}</span>
                        <span className={styles.upcomingWhen}>
                          {standing.stage === 'due'
                            ? 'due now'
                            : standing.stage === 'past'
                              ? `${standing.by} yrs past`
                              : `in ${standing.by} ${standing.by === 1 ? 'yr' : 'yrs'}`}
                        </span>
                      </li>
                    ))}
                  </ol>
                </div>
              </div>
            )}
          </>
        ) : (
          <>
            <div className={styles.headMain}>
              <p className={`label ${styles.headLabel}`} id="headline-h">
                <span>Headline finding</span>
                {lead.priority === 1 ? <CheckFirstTag /> : null}
              </p>
              <h2 className={styles.leadTitle}>
                <a href={`#i-${lead.slug}`}>{lead.title}</a>
              </h2>
              <p className={styles.leadMeta}>
                <span className={styles.subMeta}>
                  {yearsLabel(lead)}
                  {isCore(lead, year) ? ` · ${year} is in the peak years` : ''}
                </span>
                <EvidenceStamp evidence={lead.evidence} size="sm" />
              </p>
              <p className={styles.standfirst}>{lead.hook}</p>
              <div className={styles.actions}>
                <Link href={`/issue/${lead.slug}`} className={styles.actionLink}>
                  What to look for →
                </Link>
                {printLink(styles.printLink)}
              </div>
            </div>
            <div className={styles.headAside}>
              <figure className={styles.leadBand}>
                <IssueBand issue={lead} year={year} axis idPrefix="hl" />
                <figcaption>
                  {lead.title}: {yearsLabel(lead).toLowerCase()}; the line is {year}.
                </figcaption>
              </figure>
              <p className={styles.summaryLine}>
                {plural(shown.length, 'thing')} on record {shown.length === 1 ? 'applies' : 'apply'} to a {year} house:{' '}
                <a href="#check-first">
                  <strong>{first.length} to check first</strong>
                </a>
                , <a href="#built-without">{plural(allMissing, 'protection')} it was built without</a>, and{' '}
                <a href="#by-part">{rest.length} more by part of the house</a>.
              </p>
            </div>
          </>
        )}
      </section>

      {/* ---------- timeline ---------- */}
      <section className={styles.tl} aria-labelledby="tl-h">
        <div className="wrap">
          <div className={styles.tlHead}>
            <h2 id="tl-h" className="label">
              Where {year} sits among every issue on record
            </h2>
            {scrub !== year ? (
              <span className={styles.tlGoRow}>
                <Link href={`/built/${scrub}`} className={styles.tlGo} prefetch={false}>
                  Open the {scrub} report →
                </Link>
                <button type="button" className={styles.tlBack} onClick={() => setScrub(year)}>
                  Back to {year}
                </button>
              </span>
            ) : (
              <span className={styles.tlHint}>Point at a band to read it · drag or use the arrow keys to compare years</span>
            )}
          </div>
          <Timeline
            issues={timelineIssues}
            year={scrub}
            onYearChange={setScrub}
            onCommit={go}
            commitOnRelease={false}
            state={state}
            describe={(y) => `${plural(issuesForYear(timelineIssues, y, state).length, 'thing')} on record${y !== year ? '. Press Enter to open this report.' : ''}`}
            label="Compare another build year"
            itemHref={(i, y) => (y === year ? `#i-${i.slug}` : `/issue/${i.slug}`)}
            crossingsCollapsible
          />
          <div className={styles.legend}>
            <TimelineLegend compact />
          </div>
        </div>
      </section>

      {/* ---------- body ---------- */}
      <div className={`wrap ${styles.body}`}>
        <aside ref={tocRef} className={styles.toc} aria-label="On this page">
          <p className={`label ${styles.tocLabel}`}>On this page</p>
          <ol>
            {toc.map((t) => (
              <li key={t.id}>
                <a href={`#${t.id}`} aria-current={active === t.id ? 'true' : undefined}>
                  <span>{t.label}</span>
                  <span className={styles.tocN}>{t.n}</span>
                </a>
              </li>
            ))}
          </ol>
          {printLink(styles.tocPrint)}
        </aside>

        <div className={styles.sections}>
          {newHouse && dueSection}

          {first.length > 0 && (
            <section id="check-first" className={styles.section} aria-labelledby="check-first-h">
              <div className={`section-head ${styles.headAccent}`}>
                <h2 id="check-first-h">Check these first</h2>
                <p className={styles.sectionLede}>
                  The {first.length === 1 ? 'item' : `${first.length} items`} most worth a look in a {year} house: safety
                  first, then cost.
                </p>
              </div>
              <ol className={styles.list}>
                {first.map((i, n) => (
                  <IssueRow key={i.id} issue={i} year={year} index={n + 1} open={n === 0} />
                ))}
              </ol>
            </section>
          )}

          {missing.length > 0 && (
            <section id="built-without" className={styles.section} aria-labelledby="built-without-h">
              <div className={`section-head ${styles.headRow}`}>
                <h2 id="built-without-h">Built without</h2>
                <p className={styles.sectionLede}>
                  Protections that became standard after {year}. A house keeps what it was built with unless someone added
                  them, and many have been.
                </p>
                {missing.length > 1 ? expandAll('built-without', missing.length) : null}
              </div>
              <ul className={styles.list}>
                {missing.map((i) => (
                  <IssueRow key={i.id} issue={i} year={year} variant="compact" />
                ))}
              </ul>
            </section>
          )}

          {rest.length > 0 && (
            <section id="by-part" className={styles.section} aria-labelledby="by-part-h">
              <div className={`section-head ${styles.headRow}`}>
                <h2 id="by-part-h">Everything else, by part of the house</h2>
                <p className={styles.sectionLede}>Materials and products often installed in {year}. Open any row for how to check.</p>
                {rest.length > 1 ? expandAll('by-part', rest.length) : null}
              </div>

              <div className={styles.overview}>
                <div className={styles.overviewFig}>
                  <HouseCutaway
                    counts={zoneCounts}
                    size="lg"
                    label={`Where to look in a ${year} house: ${plural(shown.length, 'item')} in this report, counted by part of the house.`}
                  />
                  <p className={styles.overviewCap}>
                    Where to look. Each number counts the items in this report for that part of the house.
                  </p>
                </div>
                <nav className={styles.partIndex} aria-label="Parts of the house">
                  <ol>
                    {parts.map((p) => (
                      <li key={p.id}>
                        <a href={`#part-${p.id}`}>
                          <span>{p.label}</span>
                          <span className={styles.partIndexN}>{p.issues.length}</span>
                        </a>
                      </li>
                    ))}
                  </ol>
                </nav>
              </div>

              {parts.map((p) => (
                <div key={p.id} id={`part-${p.id}`} className={styles.part}>
                  <h3 className={styles.partHead}>
                    <span>{p.label}</span>
                    <span className={styles.partN}>{p.issues.length}</span>
                  </h3>
                  <ul className={styles.list}>
                    {p.issues.map((i) => (
                      <IssueRow key={i.id} issue={i} year={year} variant="compact" />
                    ))}
                  </ul>
                </div>
              ))}
            </section>
          )}

          {shown.length === 0 && (
            <section className={styles.section}>
              <div className="section-head">
                <h2>Nothing on record</h2>
                <p className={styles.sectionLede}>
                  None of the issues we track apply to houses built in {year}
                  {state ? ` in ${STATE_NAME[state]}` : ''}.
                </p>
              </div>
            </section>
          )}

          {!newHouse && dueSection}
        </div>
      </div>

      {/* ---------- prev / next ---------- */}
      <nav className={`wrap ${styles.pager}`} aria-label="Other years">
        {prev ? (
          <Link href={`/built/${prev}`} className={styles.pagerLink} prefetch={false}>
            <span className="label">Previous year</span>
            <span className={styles.pagerYear}>
              <span aria-hidden="true">← </span>
              {prev}
            </span>
          </Link>
        ) : (
          <span />
        )}
        <Link href="/" className={styles.pagerHome}>
          Look up another year
        </Link>
        {next ? (
          <Link href={`/built/${next}`} className={`${styles.pagerLink} ${styles.pagerNext}`} prefetch={false}>
            <span className="label">Next year</span>
            <span className={styles.pagerYear}>
              {next}
              <span aria-hidden="true"> →</span>
            </span>
          </Link>
        ) : (
          <span />
        )}
      </nav>
    </article>
  );
}
