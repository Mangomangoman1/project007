'use client';

import { useCallback, useEffect, useState, useSyncExternalStore } from 'react';
import {
  COUNTIES_PATH,
  decodePlace,
  isValidZip,
  shardPath,
  type CountyFile,
  type Place,
  type ZipShard,
} from '@/lib/place';
import { STORAGE_KEYS } from '@/lib/site';
import { readStore, writeStore } from '@/lib/storage';

/* ------------------------------------------------------------------ the remembered ZIP */

/**
 * `zip`: the visitor's ZIP. `setState`: the state this section put on the report's selector (so a
 * later ZIP may move it without asking). `keep`: a state the visitor chose to keep over the ZIP's.
 */
export type PlacePref = { zip: string; setState?: string; keep?: string };

const EVENT = 'builtin:place';
let snapshot: PlacePref | null | undefined;

function sanitize(v: unknown): PlacePref | null {
  if (!v || typeof v !== 'object') return null;
  const o = v as Record<string, unknown>;
  if (typeof o.zip !== 'string' || !isValidZip(o.zip)) return null;
  const code = (x: unknown) => (typeof x === 'string' && /^[A-Z]{2}$/.test(x) ? x : undefined);
  const out: PlacePref = { zip: o.zip };
  if (code(o.setState)) out.setState = code(o.setState);
  if (code(o.keep)) out.keep = code(o.keep);
  return out;
}

function read(): PlacePref | null {
  if (snapshot === undefined) snapshot = sanitize(readStore<unknown>(STORAGE_KEYS.place, null));
  return snapshot;
}

function subscribe(notify: () => void) {
  const onStorage = (e: StorageEvent) => {
    if (e.key !== null && e.key !== STORAGE_KEYS.place) return;
    snapshot = undefined;
    notify();
  };
  window.addEventListener('storage', onStorage);
  window.addEventListener(EVENT, notify);
  return () => {
    window.removeEventListener('storage', onStorage);
    window.removeEventListener(EVENT, notify);
  };
}

function save(next: PlacePref | null) {
  snapshot = next ? sanitize(next) : null;
  writeStore(STORAGE_KEYS.place, snapshot);
  window.dispatchEvent(new Event(EVENT));
}

/** The remembered ZIP (localStorage only; null on the server and when storage is unavailable). */
export function usePlacePref(): [PlacePref | null, (next: PlacePref | null) => void] {
  const pref = useSyncExternalStore(subscribe, read, () => null);
  return [pref, useCallback((next: PlacePref | null) => save(next), [])];
}

/* ------------------------------------------------------------------ static data, same origin */

const shards = new Map<string, Promise<ZipShard | null>>();
let counties: Promise<CountyFile> | null = null;

async function getJson<T>(path: string): Promise<T | null> {
  const res = await fetch(path, { credentials: 'omit' });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return (await res.json()) as T;
}

function getShard(zip: string) {
  const p = shardPath(zip);
  if (!shards.has(p)) {
    const req = getJson<ZipShard>(p);
    req.catch(() => shards.delete(p));
    shards.set(p, req);
  }
  return shards.get(p)!;
}

function getCounties() {
  if (!counties) {
    counties = getJson<CountyFile>(COUNTIES_PATH).then((c) => c ?? {});
    counties.catch(() => (counties = null));
  }
  return counties;
}

export type Lookup =
  | { status: 'idle' }
  | { status: 'loading'; zip: string }
  | { status: 'found'; zip: string; place: Place }
  | { status: 'missing'; zip: string }
  | { status: 'error'; zip: string };

/** Look a ZIP up in its shard (and the county file). Only these two static files are requested. */
export function usePlaceLookup(zip: string | null): Lookup {
  const [result, setResult] = useState<Lookup>({ status: 'idle' });
  useEffect(() => {
    if (!zip || !isValidZip(zip)) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- reset when the ZIP is cleared
      setResult({ status: 'idle' });
      return;
    }
    let live = true;
    setResult({ status: 'loading', zip });
    Promise.all([getShard(zip), getCounties()])
      .then(([shard, cs]) => {
        if (!live) return;
        const rec = shard?.[zip];
        setResult(rec ? { status: 'found', zip, place: decodePlace(zip, rec, cs[rec[0]]) } : { status: 'missing', zip });
      })
      .catch(() => live && setResult({ status: 'error', zip }));
    return () => {
      live = false;
    };
  }, [zip]);
  return result;
}
