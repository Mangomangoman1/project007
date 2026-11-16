'use client';

import { useCallback, useSyncExternalStore } from 'react';
import { sanitizeProfile, type HouseProfile } from '@/lib/profile';
import { STORAGE_KEYS } from '@/lib/site';
import { readStore, writeStore } from '@/lib/storage';

/**
 * The visitor's house profile, from localStorage (shared by every year's report and checklist).
 * One in-memory snapshot is shared by all components on the page; writes notify them all, and the
 * `storage` event keeps other tabs in step. The server snapshot is an empty profile, so the static
 * HTML is always the full, unfiltered report.
 */
const EMPTY: HouseProfile = Object.freeze({}) as HouseProfile;
const EVENT = 'builtin:profile';
let snapshot: HouseProfile | null = null;

function read(): HouseProfile {
  if (snapshot === null) {
    const p = sanitizeProfile(readStore<unknown>(STORAGE_KEYS.profile, {}));
    snapshot = Object.keys(p).length ? p : EMPTY;
  }
  return snapshot;
}

function subscribe(notify: () => void) {
  const onStorage = (e: StorageEvent) => {
    if (e.key !== null && e.key !== STORAGE_KEYS.profile) return;
    snapshot = null;
    notify();
  };
  window.addEventListener('storage', onStorage);
  window.addEventListener(EVENT, notify);
  return () => {
    window.removeEventListener('storage', onStorage);
    window.removeEventListener(EVENT, notify);
  };
}

export function saveHouseProfile(next: HouseProfile) {
  const clean = sanitizeProfile(next);
  snapshot = Object.keys(clean).length ? clean : EMPTY;
  writeStore(STORAGE_KEYS.profile, Object.keys(clean).length ? clean : null);
  window.dispatchEvent(new Event(EVENT));
}

export function useHouseProfile(): [HouseProfile, (next: HouseProfile) => void] {
  const profile = useSyncExternalStore(subscribe, read, () => EMPTY);
  const save = useCallback((next: HouseProfile) => saveHouseProfile(next), []);
  return [profile, save];
}
