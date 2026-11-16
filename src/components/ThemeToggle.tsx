'use client';

import { useEffect, useState } from 'react';
import { STORAGE_KEYS } from '@/lib/site';
import { writeStore } from '@/lib/storage';
import styles from './ThemeToggle.module.css';

type Theme = 'light' | 'dark';

function effectiveTheme(): Theme {
  const set = document.documentElement.getAttribute('data-theme');
  if (set === 'light' || set === 'dark') return set;
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

/**
 * Two-state toggle between "Paper" (light) and "Blueprint" (dark). Until the visitor clicks,
 * the site follows prefers-color-scheme; the inline script in layout.tsx applies a stored choice
 * before paint.
 */
export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme | null>(null);

  useEffect(() => {
    const sync = () => setTheme(effectiveTheme());
    sync();
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, []);

  const next: Theme = theme === 'dark' ? 'light' : 'dark';
  const toggle = () => {
    document.documentElement.setAttribute('data-theme', next);
    writeStore(STORAGE_KEYS.theme, next);
    setTheme(next);
  };

  return (
    <button
      type="button"
      className={styles.toggle}
      onClick={toggle}
      aria-label={theme ? `Switch to ${next === 'dark' ? 'blueprint (dark)' : 'paper (light)'} theme` : 'Switch theme'}
      title="Switch theme"
    >
      <span className={styles.swatch} aria-hidden="true">
        <span className={styles.half} />
      </span>
      <span className={styles.text}>{theme === 'dark' ? 'Blueprint' : theme === 'light' ? 'Paper' : 'Theme'}</span>
    </button>
  );
}
