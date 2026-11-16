'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import type { IssueLite } from '@/lib/data';
import { issuesForYear, isCore } from '@/lib/select';
import { DEFAULT_YEAR, STORAGE_KEYS, isValidYear } from '@/lib/site';
import { readStore, writeStore } from '@/lib/storage';
import { plural } from '@/lib/labels';
import { PROFILE_KEYS, answeredCount } from '@/lib/profile';
import { useHouseProfile } from './profile/useHouseProfile';
import { yearsLabel } from '@/lib/timeline';
import { Timeline } from './Timeline';
import { TimelineLegend } from './TimelineLegend';
import { YearInput } from './YearInput';
import { CheckFirstTag, EvidenceStamp, RegionTag } from './Stamps';
import styles from './HomeExplorer.module.css';

const PREVIEW = 6;

/**
 * Home hero: the year (input), live statement, primary action, the scrubbable timeline and a
 * preview of what applies. Server-renders for DEFAULT_YEAR; restores the last-used year after
 * hydration.
 */
export function HomeExplorer({ issues }: { issues: IssueLite[] }) {
  const router = useRouter();
  const [year, setYear] = useState(DEFAULT_YEAR);

  useEffect(() => {
    const stored = readStore<number | null>(STORAGE_KEYS.year, null);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- restoring client-only state after hydration
    if (stored !== null && isValidYear(stored)) setYear(stored);
  }, []);

  const change = (y: number) => {
    setYear(y);
    writeStore(STORAGE_KEYS.year, y);
  };
  const go = (y: number) => router.push(`/built/${y}`);

  const applying = useMemo(() => issuesForYear(issues, year), [issues, year]);
  const first = applying.filter((i) => i.priority === 1).length;
  const missing = applying.filter((i) => i.kind === 'missing').length;
  const preview = applying.slice(0, PREVIEW);
  const [profile] = useHouseProfile();
  const answered = answeredCount(profile);

  return (
    <div className={styles.root}>
      <section className={`${styles.hero} wrap`} aria-labelledby="hero-title">
        <div className={styles.yearCol}>
          {/* the page's h1: the question the year input answers (set as a label, as before) */}
          <h1 className="label" id="hero-title">
            When was your house built?
          </h1>
          <YearInput year={year} onChange={change} onSubmit={go} />
        </div>

        <div className={styles.statementCol}>
          <p className={styles.statement} aria-live="polite">
            <span className={styles.count}>{plural(applying.length, 'thing')}</span> to know about a{' '}
            <span className={styles.yr}>{year}</span> house.
          </p>
          <ul className={styles.facts}>
            <li>
              <span className={`${styles.factNum} ${first ? styles.factAccent : ''}`}>{first}</span> to check first
            </li>
            <li>
              <span className={styles.factNum}>{missing}</span> {missing === 1 ? 'protection' : 'protections'} it was built without
            </li>
          </ul>
          <Link href={`/built/${year}`} className={`btn ${styles.cta}`} prefetch={false}>
            Open the {year} report <span className="arrow" aria-hidden="true">→</span>
          </Link>
          <p className={styles.tailor}>
            {answered > 0 ? (
              <>
                Tailored to{' '}
                <Link href={`/built/${year}#about-your-house`} prefetch={false}>
                  your answers about your house
                </Link>{' '}
                ({answered} of {PROFILE_KEYS.length}).
              </>
            ) : (
              <>
                Then make it specific: in the report,{' '}
                <Link href={`/built/${year}#about-your-house`} prefetch={false}>
                  a few optional questions
                </Link>{' '}
                about your house hide what can&rsquo;t apply to it.
              </>
            )}
          </p>
        </div>
      </section>

      <section className={styles.timelineWrap} aria-labelledby="tl-title">
        <div className="wrap">
          <div className={styles.tlHead}>
            <h2 id="tl-title" className="label">
              Every issue on record, 1880 to today
            </h2>
            <p className={styles.tlHint}>Point at a band to read it · drag across to change the year</p>
          </div>
          <Timeline
            issues={issues}
            year={year}
            onYearChange={change}
            onCommit={go}
            commitOnRelease={false}
            describe={(y) => `${plural(issuesForYear(issues, y).length, 'thing')} to know. Press Enter to open the report.`}
            label="Build year timeline"
            density="compact"
            crossingsCollapsible
          />
          <div className={styles.legend}>
            <TimelineLegend compact />
          </div>
        </div>
      </section>

      <section className={`wrap ${styles.preview}`} aria-labelledby="pv-title">
        <div className={styles.pvHead}>
          <h2 id="pv-title" className={styles.pvTitle}>
            What a <span className="numeral">{year}</span> house often has
          </h2>
          <Link href={`/built/${year}`} className={styles.pvAll} prefetch={false}>
            {applying.length > PREVIEW ? `All ${applying.length} in the report` : 'Open the full report'} →
          </Link>
        </div>
        <ol className={styles.list}>
          {preview.map((i) => (
            <li key={i.id} className={`${styles.item} ${i.priority === 1 ? styles.itemFirst : ''}`}>
              <div className={styles.itemMeta}>
                {i.priority === 1 ? <CheckFirstTag /> : <span className={styles.kind}>{i.kind === 'missing' ? 'Built without' : 'Often present'}</span>}
                <span className={styles.years}>
                  {yearsLabel(i)}
                  {isCore(i, year) ? ' · peak years' : ''}
                </span>
              </div>
              <h3 className={styles.itemTitle}>
                <Link href={`/issue/${i.slug}`}>{i.title}</Link>
              </h3>
              <p className={styles.itemHook}>{i.hook}</p>
              <div className={styles.itemFoot}>
                <EvidenceStamp evidence={i.evidence} size="sm" />
                <RegionTag regions={i.regions} />
              </div>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
