import Link from 'next/link';
import type { Issue } from '@/lib/types';
import { isCore } from '@/lib/select';
import { coreLabel, yearsLabel } from '@/lib/timeline';
import { ZONE_LABEL } from '@/lib/labels';
import { HouseCutaway } from '@/components/HouseCutaway/HouseCutaway';
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
  /** Open the "How to check" disclosure (full) or the whole row (compact) by default. */
  open?: boolean;
  /**
   * full = title, hook, band and evidence always visible, "How to check" disclosed (check first).
   * compact = one native <details> row (title, years, one line) that expands in place to the full
   * detail; works without JS, keyboard accessible, and `data-row` lets "Expand all" find it.
   */
  variant?: 'full' | 'compact';
};

/** Check steps with the house diagram beside them (the diagram column collapses while empty). */
function CheckBody({ issue, label = false }: { issue: ReportIssue; label?: boolean }) {
  return (
    <div className={styles.body}>
      <div className={styles.checkGrid}>
        <div className={styles.checkText}>
          {label ? <p className="label">How to check</p> : null}
          <ol className={styles.steps}>
            {issue.check.map((c, n) => (
              <li key={n}>{c}</li>
            ))}
          </ol>
        </div>
        <div className={styles.diagram}>
          <HouseCutaway zones={issue.where} size="sm" label={`Where to look for ${issue.title.toLowerCase()}: ${issue.where.map((z) => ZONE_LABEL[z]).join(', ')}`} />
        </div>
      </div>
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
  );
}

function BandAside({ issue, year }: { issue: ReportIssue; year: number }) {
  const core = isCore(issue, year);
  const peak = coreLabel(issue);
  return (
    <div className={styles.aside}>
      <IssueBand issue={issue} year={year} axis />
      <p className={styles.years}>
        <span>{yearsLabel(issue)}</span>
        {peak ? <span className={core ? styles.peakOn : styles.peak}>{core ? `${year} is in the peak years` : peak}</span> : null}
      </p>
      <div className={styles.evidence}>
        <EvidenceStamp evidence={issue.evidence} size="sm" />
        <Prevalence label={issue.prevalence.label} />
      </div>
    </div>
  );
}

/** One issue in a report list. */
export function IssueRow({ issue, year, index, open = false, variant = 'full' }: IssueRowProps) {
  if (variant === 'compact') {
    const core = isCore(issue, year);
    return (
      <li className={styles.crow} id={`i-${issue.slug}`}>
        <details className={styles.cdetails} data-row="" open={open}>
          <summary className={styles.csummary}>
            <span className={styles.plus} aria-hidden="true" />
            <span className={styles.chead}>
              <h3 className={styles.ctitle}>{issue.title}</h3>
              <span className={styles.cmeta}>
                <span className={styles.cyears}>
                  {yearsLabel(issue)}
                  {core ? <span className={styles.cpeak}> · peak</span> : null}
                </span>
                {issue.regions !== 'national' ? <RegionTag regions={issue.regions} /> : null}
              </span>
              <span className={styles.chook}>{issue.hook}</span>
            </span>
            <span className={styles.cband} aria-hidden="true">
              <IssueBand issue={issue} year={year} idPrefix="cb" />
            </span>
          </summary>
          <div className={styles.cbody}>
            <div className={styles.cintro}>
              <p className={styles.hook}>{issue.hook}</p>
              <Link href={`/issue/${issue.slug}`} className={styles.ctitleLink}>
                Read the full entry →
              </Link>
            </div>
            <BandAside issue={issue} year={year} />
            <div className={styles.cdetail}>
              <CheckBody issue={issue} label />
            </div>
          </div>
        </details>
      </li>
    );
  }

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

      <details className={styles.details} data-row="" open={open}>
        <summary className={styles.summary}>
          <span className={styles.plus} aria-hidden="true" />
          How to check
          <span className={styles.where}>{issue.where.map((z) => ZONE_LABEL[z]).join(' · ')}</span>
        </summary>
        <CheckBody issue={issue} />
      </details>

      <BandAside issue={issue} year={year} />
    </li>
  );
}
