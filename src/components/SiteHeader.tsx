import Link from 'next/link';
import { SITE } from '@/lib/site';
import { LogoMark } from './Logo';
import { ThemeToggle } from './ThemeToggle';
import styles from './SiteHeader.module.css';

export function SiteHeader() {
  return (
    <header className={styles.header}>
      <div className={`wrap ${styles.inner}`}>
        <Link href="/" className={styles.brand} aria-label={`${SITE.name}, home`}>
          <LogoMark />
          <span className={styles.name}>{SITE.name}</span>
        </Link>
        <nav aria-label="Main" className={styles.nav}>
          <Link href="/issues">Issues</Link>
          <Link href="/about">About</Link>
          <ThemeToggle />
        </nav>
      </div>
    </header>
  );
}
