'use client';

import { useEffect, useState } from 'react';
import { STORAGE_KEYS, THEME_COLORS } from '@/lib/site';
import { writeStore } from '@/lib/storage';
import styles from './ThemeToggle.module.css';

type Theme = 'light' | 'dark';

/** Fired by /privacy's "Forget everything" after it removes the stored theme. */
export const THEME_RESET_EVENT = 'builtin:theme-reset';

function effectiveTheme(): Theme {
  const set = document.documentElement.getAttribute('data-theme');
  if (set === 'light' || set === 'dark') return set;
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

/**
 * The browser chrome colour follows the theme: both theme-color metas (one per colour scheme) point
 * at the chosen theme while one is chosen, and back to their own scheme when it follows the system.
 */
function syncThemeColor() {
  const forced = document.documentElement.getAttribute('data-theme');
  document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]').forEach((m) => {
    const own = (m.media || '').includes('dark') ? THEME_COLORS.dark : THEME_COLORS.light;
    m.content = forced === 'light' || forced === 'dark' ? THEME_COLORS[forced] : own;
  });
}

/**
 * Two-state toggle between "Paper" (light) and "Blueprint" (dark). Until the visitor clicks,
 * the site follows prefers-color-scheme; the inline script in layout.tsx applies a stored choice
 * before paint. The accessible name starts with the visible word (WCAG 2.5.3).
 */
export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme | null>(null);

  useEffect(() => {
    const sync = () => {
      setTheme(effectiveTheme());
      syncThemeColor();
    };
    sync();
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    mq.addEventListener('change', sync);
    window.addEventListener(THEME_RESET_EVENT, sync);
    return () => {
      mq.removeEventListener('change', sync);
      window.removeEventListener(THEME_RESET_EVENT, sync);
    };
  }, []);

  const next: Theme = theme === 'dark' ? 'light' : 'dark';
  const toggle = () => {
    document.documentElement.setAttribute('data-theme', next);
    writeStore(STORAGE_KEYS.theme, next);
    setTheme(next);
    syncThemeColor();
  };

  return (
    <button type="button" className={styles.toggle} onClick={toggle} title="Switch theme">
      <span className={styles.swatch} aria-hidden="true">
        <span className={styles.half} />
      </span>
      <span className={styles.text}>{theme === 'dark' ? 'Blueprint' : theme === 'light' ? 'Paper' : 'Theme'}</span>
      <span className="visually-hidden">
        {theme ? ` theme: switch to ${next === 'dark' ? 'blueprint (dark)' : 'paper (light)'}` : ': switch'}
      </span>
    </button>
  );
}
