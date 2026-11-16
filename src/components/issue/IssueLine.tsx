import Link from 'next/link';
import type { IssueLite } from '@/lib/data';
import { yearsLabel } from '@/lib/timeline';
import { IssueBand } from '../IssueBand';
import { CheckFirstTag, EvidenceStamp, RegionTag } from '../Stamps';
import styles from './IssueLine.module.css';

/**
 * One issue as a single ruled line: title, years, a mini band on the 1880–today axis, evidence
 * stamp. Used by the /issues index and "related" lists. Server-safe (no hooks), so client lists
 * can render it too. The whole row is clickable through the title link.
 */
export function IssueLine({ issue, as: H = 'h3', idPrefix = 'il' }: { issue: IssueLite; as?: 'h2' | 'h3' | 'h4'; idPrefix?: string }) {
  return (
    <li className={styles.row}>
      <div className={styles.main}>
        <H className={styles.title}>
          <Link href={`/issue/${issue.slug}`} prefetch={false}>
            {issue.title}
          </Link>
        </H>
        <p className={styles.meta}>
          {issue.priority === 1 ? <CheckFirstTag /> : null}
          {issue.kind === 'missing' ? <span className={styles.kind}>Built without</span> : null}
          <RegionTag regions={issue.regions} />
        </p>
      </div>
      <div className={styles.years}>
        <span className={styles.yearsLabel}>{yearsLabel(issue)}</span>
        <IssueBand issue={issue} idPrefix={idPrefix} className={styles.band} />
      </div>
      <div className={styles.stamp}>
        <EvidenceStamp evidence={issue.evidence} size="sm" />
      </div>
    </li>
  );
}

/** Column scale for a list of IssueLines: decade labels aligned with the bands. */
export function IssueLineScale({ min, max }: { min: number; max: number }) {
  const span = max + 1 - min;
  const marks = [1920, 1960, 2000].filter((y) => y > min + 15 && y < max - 15);
  return (
    <div className={styles.scaleRow} aria-hidden="true">
      <span />
      <span className={styles.scale}>
        <span style={{ left: 0, transform: 'none' }}>{min}</span>
        {marks.map((y) => (
          <span key={y} style={{ left: `${((y - min) / span) * 100}%` }}>
            {y}
          </span>
        ))}
        <span style={{ left: 'auto', right: 0, transform: 'none' }}>{max}</span>
      </span>
      <span />
    </div>
  );
}
