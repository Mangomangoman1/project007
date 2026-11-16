'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import type { Lifespan } from '@/lib/types';
import type { IssueLite } from '@/lib/data';
import { groupByPart, inState, isCore, issuesForYear, lifeStatus } from '@/lib/select';
import { PARTS, STATES, STATE_NAME, plural } from '@/lib/labels';
import { MAX_YEAR, MIN_YEAR, STORAGE_KEYS } from '@/lib/site';
import { readStore, writeStore } from '@/lib/storage';
import { yearsLabel } from '@/lib/timeline';
import { Timeline } from '../Timeline';
import { TimelineLegend } from '../TimelineLegend';
import { EvidenceStamp } from '../Stamps';
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

/**
 * The full report for one build year. Server-rendered with no state filter (so the static HTML
 * contains everything); after hydration it restores the visitor's state and filters regional
 * issues client-side.
 */
export function Report({ year, issues, lifespans, timelineIssues }: ReportProps) {
  const router = useRouter();
  const age = MAX_YEAR - year;
  const [state, setState] = useState<string | null>(null);
  const [scrub, setScrub] = useState(year);

  useEffect(() => {
    const s = readStore<string | null>(STORAGE_KEYS.state, null);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- restoring client-only state after hydration
    if (s && STATE_NAME[s]) setState(s);
    writeStore(STORAGE_KEYS.year, year);
  }, [year]);

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

  const newHouse = isNewHouse(shown, age);
  const lead = shown[0] ?? null;
  const dueNow = lifespans.filter((l) => lifeStatus(l, age) === 'due').length;
  const dueOrSoon = lifespans.filter((l) => ['due', 'soon'].includes(lifeStatus(l, age))).length;
  const soon = lifespans
    .filter((l) => lifeStatus(l, age) === 'soon' || lifeStatus(l, age) === 'later')
    .sort((a, b) => a.lifeLow - b.lifeLow)[0];

  const prev = year > MIN_YEAR ? year - 1 : null;
  const next = year < MAX_YEAR ? year + 1 : null;
  const go = (y: number) => {
    if (y !== year) router.push(`/built/${y}`);
  };

  const toc = [
    ...(newHouse ? [{ id: 'whats-due', label: "What's due", n: dueOrSoon }] : []),
    { id: 'check-first', label: 'Check these first', n: first.length },
    { id: 'built-without', label: 'Built without', n: missing.length },
    { id: 'by-part', label: 'By part of the house', n: rest.length },
    ...(!newHouse ? [{ id: 'whats-due', label: "What's due", n: dueOrSoon }] : []),
  ].filter((t) => t.n > 0 || t.id === 'whats-due');

  const dueSection = (
    <section id="whats-due" className={styles.section} aria-labelledby="whats-due-h">
      <div className="section-head">
        <h2 id="whats-due-h">What&rsquo;s due at this age</h2>
        <p className={styles.sectionLede}>
          {age === 0
            ? `A house built in ${year} is brand new, so nothing is due yet. Here is when its parts typically reach the end of their life.`
            : `A ${year} house is ${plural(age, 'year')} old. If these parts are still the originals, here is where they stand against their typical life.`}
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
      <section className={`wrap ${styles.headline}`} aria-labelledby="headline-h">
        {newHouse || !lead ? (
          <>
            <p className="label" id="headline-h">
              Headline finding
            </p>
            <p className={styles.statement}>Little is known to be wrong with houses this new.</p>
            <p className={styles.sub}>
              Nothing in the record marks {year} as a problem year for materials or methods
              {shown.length ? `; ${plural(shown.length, 'item')} below still ${shown.length === 1 ? 'applies' : 'apply'}, mostly things any house can have` : ''}.
              What matters now is upkeep:{' '}
              {dueNow > 0
                ? `${plural(dueNow, 'part')} ${dueNow === 1 ? 'is' : 'are'} already in ${dueNow === 1 ? 'its' : 'their'} replacement window.`
                : soon
                  ? `the first thing to come due is typically the ${soon.title.toLowerCase()}, at about ${soon.lifeLow} years.`
                  : 'nothing is due yet.'}
            </p>
          </>
        ) : (
          <>
            <p className="label" id="headline-h">
              Headline finding · {lead.title}
            </p>
            <p className={`${styles.statement} ${lead.hook.length > 110 ? styles.statementLong : ''}`}>{lead.hook}</p>
            <p className={styles.sub}>
              <span className={styles.subMeta}>
                {yearsLabel(lead)}
                {isCore(lead, year) ? ` · ${year} is in the peak years` : ''}
              </span>
              <EvidenceStamp evidence={lead.evidence} size="sm" />
              <Link href={`/issue/${lead.slug}`} className={styles.subLink}>
                What to look for →
              </Link>
            </p>
            <p className={styles.summaryLine}>
              {plural(shown.length, 'thing')} on record {shown.length === 1 ? 'applies' : 'apply'} to a {year} house: <strong>{first.length} to check first</strong>,{' '}
              {plural(allMissing, 'protection')} it was built without, and {rest.length} more by part of the house.
            </p>
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
              <Link href={`/built/${scrub}`} className={styles.tlGo} prefetch={false}>
                Open the {scrub} report →
              </Link>
            ) : (
              <span className={styles.tlHint}>Drag to another year, or use the arrow keys and Enter</span>
            )}
          </div>
          <Timeline
            issues={timelineIssues}
            year={scrub}
            onYearChange={setScrub}
            onCommit={go}
            state={state}
            describe={(y) => `${plural(issuesForYear(timelineIssues, y, state).length, 'thing')} on record${y !== year ? '. Press Enter to open this report.' : ''}`}
            label="Compare another build year"
          />
          <div className={styles.legend}>
            <TimelineLegend compact />
          </div>
        </div>
      </section>

      {/* ---------- body ---------- */}
      <div className={`wrap ${styles.body}`}>
        <aside className={styles.toc} aria-label="On this page">
          <p className="label">On this page</p>
          <ol>
            {toc.map((t) => (
              <li key={t.id}>
                <a href={`#${t.id}`}>
                  <span>{t.label}</span>
                  <span className={styles.tocN}>{t.n}</span>
                </a>
              </li>
            ))}
          </ol>
          <Link href={`/checklist/${year}`} className={styles.tocPrint} prefetch={false}>
            Printable checklist →
          </Link>
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
              <div className="section-head">
                <h2 id="built-without-h">Protections a {year} house was built without</h2>
                <p className={styles.sectionLede}>
                  These became standard after {year}. A house keeps what it was built with unless someone added them,
                  and many have been.
                </p>
              </div>
              <ul className={styles.list}>
                {missing.map((i) => (
                  <IssueRow key={i.id} issue={i} year={year} />
                ))}
              </ul>
            </section>
          )}

          {rest.length > 0 && (
            <section id="by-part" className={styles.section} aria-labelledby="by-part-h">
              <div className="section-head">
                <h2 id="by-part-h">Everything else, by part of the house</h2>
                <p className={styles.sectionLede}>Materials and products often installed in {year}.</p>
              </div>
              {parts.map((p) => (
                <div key={p.id} className={styles.part}>
                  <h3 className={styles.partHead}>
                    <span>{p.label}</span>
                    <span className={styles.partN}>{p.issues.length}</span>
                  </h3>
                  <ul className={styles.list}>
                    {p.issues.map((i) => (
                      <IssueRow key={i.id} issue={i} year={year} />
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
