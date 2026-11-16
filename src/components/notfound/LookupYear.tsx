'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { DEFAULT_YEAR, STORAGE_KEYS, isValidYear } from '@/lib/site';
import { readStore } from '@/lib/storage';
import { YearInput } from '@/components/YearInput';
import styles from './NotFound.module.css';

/** The 404's way back in: the hero year input (last-used year restored) and its report link. */
export function LookupYear() {
  const router = useRouter();
  const [year, setYear] = useState(DEFAULT_YEAR);

  useEffect(() => {
    const stored = readStore<number | null>(STORAGE_KEYS.year, null);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- restoring client-only state after hydration
    if (stored !== null && isValidYear(stored)) setYear(stored);
  }, []);

  return (
    <div className={styles.lookup}>
      <p className="label" id="lookup-h">
        Look up a year instead
      </p>
      <YearInput
        year={year}
        onChange={setYear}
        onSubmit={(y) => router.push(`/built/${y}`)}
        id="nf-year"
        hint="Type a year or use the arrow keys, then press Enter"
      />
      <Link href={`/built/${year}`} className={`btn ${styles.cta}`} prefetch={false}>
        Open the {year} report <span className="arrow" aria-hidden="true">→</span>
      </Link>
    </div>
  );
}
