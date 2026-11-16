import Link from 'next/link';
import { SITE, MIN_YEAR, MAX_YEAR } from '@/lib/site';
import { getMeta } from '@/lib/data';
import { LogoMark } from './Logo';
import styles from './SiteFooter.module.css';

/** Footer drawn as a drafting title block. */
export function SiteFooter() {
  const meta = getMeta();
  return (
    <footer className={styles.footer}>
      <div className="wrap">
        <div className={styles.block}>
          <div className={`${styles.cell} ${styles.brand}`}>
            <LogoMark size={36} />
            <div>
              <p className={styles.name}>{SITE.name}</p>
              <p className={styles.tag}>{SITE.tagline}</p>
            </div>
          </div>
          <div className={`${styles.cell} ${styles.disclaimer}`}>
            <span className="label">Note</span>
            <p>{SITE.disclaimer}</p>
          </div>
          <div className={styles.cell}>
            <span className="label">Drawn from</span>
            <p className={styles.data}>
              {meta.sourceCount} verified sources
              <br />
              {meta.primarySourceCount} primary
            </p>
          </div>
          <div className={styles.cell}>
            <span className="label">Covers</span>
            <p className={styles.data}>
              US houses built
              <br />
              {MIN_YEAR}–{MAX_YEAR}
            </p>
          </div>
          <nav aria-label="Footer" className={`${styles.cell} ${styles.links}`}>
            <span className="label">Sheet index</span>
            <Link href="/">Look up a year</Link>
            <Link href="/issues">All issues</Link>
            <Link href="/about">Method &amp; sources</Link>
          </nav>
          <div className={styles.strip}>
            <nav aria-label="Policies" className={styles.policies}>
              <Link href="/privacy">Privacy</Link>
              <Link href="/terms">Terms &amp; disclaimer</Link>
              <Link href="/corrections">Corrections</Link>
            </nav>
            <p className={styles.indie}>Independent · no ads · no cookies</p>
          </div>
        </div>
        {meta.sample && (
          <p className={styles.sample} role="note">
            Preview build: showing sample editorial content.
          </p>
        )}
      </div>
    </footer>
  );
}
