import type { Metadata } from 'next';
import Link from 'next/link';
import { MAX_YEAR, MIN_YEAR } from '@/lib/site';
import { robotsFor } from '@/lib/seo';
import { LookupYear } from '@/components/notfound/LookupYear';
import styles from '@/components/notfound/NotFound.module.css';

// Next adds <meta name="robots" content="noindex"> itself; robots here replaces the layout's
// "index, follow" so the page does not carry two contradicting tags.
export const metadata: Metadata = { title: 'Page not found', robots: robotsFor(false) };

/** 404: a drafting sheet with a missing detail callout, the year input and the way back. */
export default function NotFound() {
  const decades: number[] = [];
  for (let y = Math.ceil(MIN_YEAR / 10) * 10; y <= MAX_YEAR; y += 10) decades.push(y);

  return (
    <div className={`wrap ${styles.page}`}>
      <section className={styles.sheet} aria-labelledby="nf-title">
        <div className={styles.main}>
          <p className="label">Error 404 · Detail not found</p>
          <p className={styles.code} aria-hidden="true">
            <span>4</span>
            <span className={styles.zero}>0</span>
            <span>4</span>
          </p>
          <h1 id="nf-title" className={styles.title}>
            This page isn&rsquo;t on the plans.
          </h1>
          <p className={styles.lede}>
            The link may be mistyped, or the page may have moved. Reports exist for every year from {MIN_YEAR} to {MAX_YEAR}{' '}
            at <code>/built/</code> and the year, for example <Link href="/built/1972">/built/1972</Link>.
          </p>
          <nav aria-label="Where to go" className={styles.links}>
            <Link href="/">Home</Link>
            <Link href="/issues">All issues</Link>
            <Link href="/about">Method &amp; sources</Link>
            <Link href="/corrections">Report a broken link</Link>
          </nav>
        </div>
        <LookupYear />
      </section>

      <nav className={styles.decades} aria-labelledby="nf-dec">
        <h2 id="nf-dec" className="label">
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
    </div>
  );
}
