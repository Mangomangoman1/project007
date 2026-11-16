/** Safe localStorage wrappers: every access is try/catch'd; the site must work without storage. */
import { STORAGE_KEYS } from './site';

export function readStore<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key);
    return raw === null ? fallback : (JSON.parse(raw) as T);
  } catch {
    return fallback;
  }
}

export function writeStore(key: string, value: unknown): void {
  try {
    if (value === null || value === undefined) window.localStorage.removeItem(key);
    else window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage unavailable: ignore */
  }
}

/**
 * Every localStorage key this site writes, derived from STORAGE_KEYS: the fixed keys, plus the
 * per-year ones (found by prefix). Used by the "Forget everything saved on this device" button.
 */
export function savedKeys(): string[] {
  const fixed: string[] = [];
  const prefixes: string[] = [];
  for (const v of Object.values(STORAGE_KEYS)) {
    if (typeof v === 'string') fixed.push(v);
    else prefixes.push(v(0).replace(/0$/, ''));
  }
  try {
    const ls = window.localStorage;
    const all = Array.from({ length: ls.length }, (_, i) => ls.key(i)).filter((k): k is string => k !== null);
    return all.filter((k) => fixed.includes(k) || prefixes.some((p) => k.startsWith(p)));
  } catch {
    return [];
  }
}

/** Remove every key from savedKeys(). Returns how many were removed. */
export function clearSaved(): number {
  const keys = savedKeys();
  for (const k of keys) writeStore(k, null);
  return keys.length;
}
