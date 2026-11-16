import Link from 'next/link';
import { getIssuesLite, getMeta } from '@/lib/data';
import { EVIDENCE } from '@/lib/labels';
import { MAX_YEAR, MIN_YEAR, SITE } from '@/lib/site';
import { pageMeta } from '@/lib/seo';
import { HomeExplorer } from '@/components/HomeExplorer';
import { EvidenceStamp, Prevalence } from '@/components/Stamps';
import type { Evidence } from '@/lib/types';
import styles from './home.module.css';

const homeTitle = `${SITE.name}: ${SITE.tagline}`;
export const metadata = {
  ...pageMeta({ title: homeTitle, description: SITE.description, path: '/', image: null }),
  title: { absolute: homeTitle },
};

export default function HomePage() {
  const issues = getIssuesLite();
  const meta = getMeta();
  const decades: number[] = [];
  for (let y = Math.ceil(MIN_YEAR / 10) * 10; y <= MAX_YEAR; y += 10) decades.push(y);

  return (
    <>
      <HomeExplorer issues={issues} />

      <section className={`wrap ${styles.how}`} aria-labelledby="how-title">
        <div className={styles.howIntro}>
          <h2 id="how-title" className={styles.h2}>
            How it works
          </h2>
          <p className="lede">
            Houses are built with whatever the building trade used that year. Some of those materials turned out to
            be hazardous, some were recalled, and some protections we now take for granted didn&rsquo;t exist yet.
            The year your house was built is a good first clue to which of these to look for.
          </p>
        </div>
        <ol className={styles.steps}>
          <li>
            <span className={styles.stepNo}>01</span>
            <h3>Enter the year</h3>
            <p>Any year from {MIN_YEAR} to today. Add your state in the report to filter regional issues.</p>
          </li>
          <li>
            <span className={styles.stepNo}>02</span>
            <h3>See what houses of that year often have</h3>
            <p>
              Materials likely installed then, protections built without, and parts that are reaching the end of their
              typical life.
            </p>
          </li>
          <li>
            <span className={styles.stepNo}>03</span>
            <h3>Check, don&rsquo;t worry</h3>
            <p>
              Each item says where to look and what you&rsquo;d see. Many houses have been updated since. It&rsquo;s
              a guide to what to look for, not an inspection.
            </p>
          </li>
        </ol>
      </section>

      <section className={`wrap ${styles.trust}`} aria-labelledby="trust-title">
        <div className={styles.trustHead}>
          <h2 id="trust-title" className={styles.h2}>
            Why trust it
          </h2>
          <p className={styles.trustStat}>
            <span className="numeral">{meta.issueCount}</span> issues, drawn from <span className="numeral">{meta.sourceCount}</span>{' '}
            sources we opened and checked, <span className="numeral">{meta.primarySourceCount}</span> of them primary: federal
            agencies, building codes, courts and recalls.
          </p>
        </div>
        <dl className={styles.stamps}>
          {(Object.keys(EVIDENCE) as Evidence[]).map((e) => (
            <div key={e} className={styles.stampRow}>
              <dt>
                <EvidenceStamp evidence={e} />
              </dt>
              <dd>{EVIDENCE[e].long}</dd>
            </div>
          ))}
          <div className={styles.stampRow}>
            <dt>
              <Prevalence label="unknown" />
            </dt>
            <dd>We say so plainly when nobody has counted how many houses have something.</dd>
          </div>
        </dl>
      </section>

      <nav className={`wrap ${styles.decades}`} aria-labelledby="dec-title">
        <h2 id="dec-title" className="label">
          Or start from a decade
        </h2>
        <ul>
          {decades.map((d) => (
            <li key={d}>
              <Link href={`/built/${d}`} prefetch={false}>
                <span className="numeral">{d}</span>
                <span className={styles.s}>s</span>
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </>
  );
}
