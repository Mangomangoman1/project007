import Link from 'next/link';
import { reportErrorHref } from '@/lib/contact';
import styles from './ReportErrorLink.module.css';

/** The pencil-and-line glyph used by every "Report an error" link. */
export function ReportGlyph() {
  return (
    <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true" className={styles.glyph}>
      <path d="M10.6 2.4l3 3-7.4 7.4H3.2v-3z" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
      <path d="M9 4l3 3" fill="none" stroke="currentColor" strokeWidth="1.2" />
      <path d="M8.5 14.5h6" fill="none" stroke="currentColor" strokeWidth="1.2" />
    </svg>
  );
}

/**
 * A quiet "Report an error on this page" line linking to /corrections?page=<path>.
 * `lead` is an optional plain sentence before the link.
 */
export function ReportErrorLink({ path, lead, className }: { path: string; lead?: string; className?: string }) {
  return (
    <p className={`${styles.line} ${className ?? ''}`}>
      {lead ? <span className={styles.lead}>{lead}</span> : null}
      <Link href={reportErrorHref(path)} className={styles.link} prefetch={false}>
        <ReportGlyph />
        Report an error on this page
      </Link>
    </p>
  );
}
