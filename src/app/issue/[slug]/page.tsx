/**
 * PLACEHOLDER issue page so report links resolve. The issue-page builder replaces this
 * (house cutaway, full layout). Data: getIssue(slug); components: IssueBand, EvidenceStamp,
 * Prevalence, TierTag.
 */
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getIssue, getIssues } from '@/lib/data';
import { CATEGORY_LABEL, ZONE_LABEL } from '@/lib/labels';
import { coreLabel, yearsLabel } from '@/lib/timeline';
import { IssueBand } from '@/components/IssueBand';
import { TimelineLegend } from '@/components/TimelineLegend';
import { EvidenceStamp, Prevalence, RegionTag, TierTag } from '@/components/Stamps';
import styles from './issue.module.css';

export const dynamicParams = false;

export function generateStaticParams() {
  return getIssues().map((i) => ({ slug: i.slug }));
}

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const issue = getIssue((await params).slug);
  if (!issue) return {};
  return { title: issue.title, description: issue.hook, alternates: { canonical: `/issue/${issue.slug}` } };
}

export default async function IssuePage({ params }: Props) {
  const issue = getIssue((await params).slug);
  if (!issue) notFound();
  const peak = coreLabel(issue);
  return (
    <article className={`wrap ${styles.page}`}>
      <header className={styles.head}>
        <p className="label">
          {CATEGORY_LABEL[issue.category]} · {issue.kind === 'missing' ? 'Protection built without' : 'Often present'}
        </p>
        <h1 className={styles.title}>{issue.title}</h1>
        <p className={styles.hook}>{issue.hook}</p>
        <div className={styles.stamps}>
          <EvidenceStamp evidence={issue.evidence} />
          <Prevalence label={issue.prevalence.label} />
          <RegionTag regions={issue.regions} />
        </div>
      </header>

      <section className={styles.band} aria-label="Years">
        <p className={styles.years}>
          <span className="numeral">{yearsLabel(issue)}</span>
          {peak ? <span className={styles.peak}>{peak}</span> : null}
        </p>
        <IssueBand issue={issue} axis accent={false} />
        <TimelineLegend compact />
      </section>

      <div className={styles.cols}>
        <section className={styles.block}>
          <h2 className="label">What it is</h2>
          <p>{issue.summary}</p>
          {issue.prevalence.note ? <p className={styles.muted}>{issue.prevalence.note}</p> : null}
        </section>
        <section className={styles.block}>
          <h2 className="label">How to check</h2>
          <p className={styles.muted}>Where: {issue.where.map((z) => ZONE_LABEL[z]).join(', ')}</p>
          <ol className={styles.steps}>
            {issue.check.map((c, i) => (
              <li key={i}>{c}</li>
            ))}
          </ol>
        </section>
        <section className={styles.block}>
          <h2 className="label">What to do</h2>
          <p>{issue.action}</p>
          {issue.caveat ? (
            <>
              <h2 className="label">Keep in mind</h2>
              <p className={styles.muted}>{issue.caveat}</p>
            </>
          ) : null}
        </section>
      </div>

      <section className={styles.sources} aria-labelledby="src-h">
        <h2 id="src-h" className="section-head">
          Sources
        </h2>
        <ol>
          {issue.sources.map((s, i) => (
            <li key={i}>
              <div className={styles.srcHead}>
                <TierTag tier={s.tier} />
                <a href={s.url} rel="noopener noreferrer" target="_blank">
                  {s.publisher}
                </a>
              </div>
              {s.quote ? <blockquote>&ldquo;{s.quote}&rdquo;</blockquote> : null}
            </li>
          ))}
        </ol>
      </section>

      <p className={styles.back}>
        <Link href="/">← Look up a year</Link>
      </p>
    </article>
  );
}
