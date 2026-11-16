'use client';

import { useEffect, useState } from 'react';
import { STORAGE_KEYS } from '@/lib/site';
import { clearSaved, savedKeys } from '@/lib/storage';
import { saveHouseProfile } from '@/components/profile/useHouseProfile';
import { forgetPlace } from '@/components/place/usePlace';
import { THEME_RESET_EVENT } from '@/components/ThemeToggle';
import styles from './ForgetDevice.module.css';

/**
 * "Forget everything saved on this device": removes every key in STORAGE_KEYS (the per-year ones
 * by prefix), resets the in-memory copies the report keeps, and returns the theme to the system
 * setting. Without JavaScript nothing is ever saved, so the panel says so instead.
 */
export function ForgetDevice() {
  const [count, setCount] = useState<number | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reading browser storage after hydration
    setCount(savedKeys().length);
  }, []);

  const forget = () => {
    saveHouseProfile({});
    forgetPlace();
    clearSaved();
    document.documentElement.removeAttribute('data-theme');
    window.dispatchEvent(new Event(THEME_RESET_EVENT));
    setCount(savedKeys().length);
    setDone(true);
  };

  return (
    <div className={styles.panel}>
      <div className={styles.readout}>
        <span className="label">Saved on this device now</span>
        <p className={styles.count} aria-live="polite">
          {count === null ? (
            <span className={styles.noJs}>Checking…</span>
          ) : count === 0 ? (
            done ? 'Nothing. All cleared.' : 'Nothing'
          ) : (
            <>
              <span className={styles.n}>{count}</span> {count === 1 ? 'item' : 'items'}
            </>
          )}
        </p>
      </div>
      <button type="button" className={`btn ${styles.btn}`} onClick={forget} disabled={count === 0}>
        Forget everything saved on this device
      </button>
      <p className={styles.small}>
        Clears your house answers, year, state, ZIP, &ldquo;last replaced&rdquo; dates and theme choice (
        {Object.keys(STORAGE_KEYS).length} kinds of entry, every one starting <code>builtin:</code>). It only affects this
        browser on this device.
      </p>
    </div>
  );
}
