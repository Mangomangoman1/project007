import Link from 'next/link';
import type { Issue } from '@/lib/types';
import { isCore } from '@/lib/select';
import { coreLabel, yearsLabel } from '@/lib/timeline';
import { ZONE_LABEL } from '@/lib/labels';
import { IssueBand } from '../IssueBand';
import { CheckFirstTag, EvidenceStamp, Prevalence, RegionTag } from '../Stamps';
import styles from './IssueRow.module.css';

/** An issue as the report needs it: full copy, sources reduced to counts. */
export type ReportIssue = Omit<Issue, 'sources'> & { sourceCount: number; primaryCount: number };

export const toReportIssue = (i: Issue): ReportIssue => {
  const { sources, ...rest } = i;
  return { ...rest, sourceCount: sources.length, primaryCount: sources.filter((s) => s.tier === 'primary').length };
};

export type IssueRowProps = {
  issue: ReportIssue;
  year: number;
  /** 1-based index shown as a red-oxide numeral (check-first list). */
  index?: number;
  /** Open the "How to check" disclosure by default. */
  open?: boolean;
};

/** One issue in a report list: title, hook, band against the year, evidence, and how to check. */
export function IssueRow({ issue, year, index, open = false }: IssueRowProps) {
  const core = isCore(issue, year);
  const peak = coreLabel(issue);
  return (
    <li className={`${styles.row} ${index ? styles.first : ''}`} id={`i-${issue.slug}`}>
      {index ? (
        <span className={styles.index} aria-hidden="true">
          {String(index).padStart(2, '0')}
        </span>
      ) : null}
      <div className={styles.main}>
        <div className={styles.meta}>
          {issue.priority === 1 ? <CheckFirstTag /> : null}
          <span className={styles.kind}>{issue.kind === 'missing' ? 'Built without' : 'Often present'}</span>
          <RegionTag regions={issue.regions} />
        </div>
        <h3 className={styles.title}>
          <Link href={`/issue/${issue.slug}`}>{issue.title}</Link>
        </h3>
        <p className={styles.hook}>{issue.hook}</p>
      </div>

      <details className={styles.details} open={open}>
          <summary className={styles.summary}>
            <span className={styles.plus} aria-hidden="true" />
            How to check
            <span className={styles.where}>{issue.where.map((z) => ZONE_LABEL[z]).join(' · ')}</span>
          </summary>
          <div className={styles.body}>
            <ol className={styles.steps}>
              {issue.check.map((c, n) => (
                <li key={n}>{c}</li>
              ))}
            </ol>
            <p className={styles.action}>
              <span className="label">If you find it</span>
              {issue.action}
            </p>
            {issue.prevalence.note ? (
              <p className={styles.note}>
                <span className="label">How common</span>
                {issue.prevalence.note}
              </p>
            ) : null}
            {issue.caveat ? (
              <p className={styles.note}>
                <span className="label">Keep in mind</span>
                {issue.caveat}
              </p>
            ) : null}
            {issue.retrofit ? (
              <p className={styles.note}>
                <span className="label">Year predicts poorly</span>
                This is often added to older houses later, so check whatever the build year.
              </p>
            ) : null}
            <Link href={`/issue/${issue.slug}`} className={styles.more}>
              Details and {issue.sourceCount} {issue.sourceCount === 1 ? 'source' : 'sources'} →
            </Link>
          </div>
      </details>

      <div className={styles.aside}>
        <IssueBand issue={issue} year={year} />
        <p className={styles.years}>
          <span>{yearsLabel(issue)}</span>
          {peak ? <span className={core ? styles.peakOn : styles.peak}>{core ? `${year} is in the peak years` : peak}</span> : null}
        </p>
        <div className={styles.evidence}>
          <EvidenceStamp evidence={issue.evidence} size="sm" />
          <Prevalence label={issue.prevalence.label} />
        </div>
      </div>
    </li>
  );
}
