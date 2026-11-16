'use client';

import { useEffect, useId, useMemo, useState } from 'react';
import type { IssueLite } from '@/lib/data';
import type { Zone } from '@/lib/types';
import { CATEGORY_LABEL, PARTS, ZONE_LABEL, plural } from '@/lib/labels';
import { yearsLabel } from '@/lib/timeline';
import { IssueLine, IssueLineScale } from './IssueLine';
import styles from './IssueIndex.module.css';

export type IndexIssue = IssueLite & { where: Zone[] };

type Props = { issues: IndexIssue[]; min: number; max: number };

const norm = (s: string) => s.toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '');

const partIdOf = (i: IndexIssue) => PARTS.find((p) => p.zones.includes(i.where[0]))?.id ?? 'whole';

/**
 * The browsable index: every issue grouped by part of the house, with client-side filters
 * (part, check first only, text). Server-rendered unfiltered, so without JS it is a plain grouped
 * list; the filter bar is hidden until JS runs (html.js). Filters sync to the query string.
 */
export function IssueIndex({ issues, min, max }: Props) {
  const [part, setPart] = useState<string>('all');
  const [first, setFirst] = useState(false);
  const [q, setQ] = useState('');
  const qId = useId();

  // restore from ?part=&first=1&q= after hydration
  useEffect(() => {
    try {
      const p = new URLSearchParams(window.location.search);
      const pp = p.get('part');
      /* eslint-disable react-hooks/set-state-in-effect -- restoring client-only state after hydration */
      if (pp && PARTS.some((x) => x.id === pp)) setPart(pp);
      if (p.get('first') === '1') setFirst(true);
      if (p.get('q')) setQ(p.get('q') ?? '');
      /* eslint-enable react-hooks/set-state-in-effect */
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    try {
      const p = new URLSearchParams();
      if (part !== 'all') p.set('part', part);
      if (first) p.set('first', '1');
      if (q.trim()) p.set('q', q.trim());
      const s = p.toString();
      const next = `${window.location.pathname}${s ? `?${s}` : ''}${window.location.hash}`;
      if (next !== `${window.location.pathname}${window.location.search}${window.location.hash}`) window.history.replaceState(null, '', next);
    } catch {
      /* ignore */
    }
  }, [part, first, q]);

  const hay = useMemo(
    () =>
      new Map(
        issues.map((i) => [
          i.id,
          norm(
            [i.title, i.hook, CATEGORY_LABEL[i.category], yearsLabel(i), ...i.where.map((z) => ZONE_LABEL[z]), i.kind === 'missing' ? 'built without missing' : ''].join(' '),
          ),
        ]),
      ),
    [issues],
  );

  const words = norm(q).split(/\s+/).filter(Boolean);
  // everything except the part filter: drives the per-part counts on the chips
  const base = issues.filter((i) => (!first || i.priority === 1) && words.every((w) => hay.get(i.id)!.includes(w)));
  const shown = part === 'all' ? base : base.filter((i) => partIdOf(i) === part);
  const groups = PARTS.map((p) => ({ ...p, issues: shown.filter((i) => partIdOf(i) === p.id) })).filter((g) => g.issues.length > 0);
  const countIn = (id: string) => base.filter((i) => partIdOf(i) === id).length;
  const filtered = part !== 'all' || first || words.length > 0;

  const reset = () => {
    setPart('all');
    setFirst(false);
    setQ('');
  };

  return (
    <div className={styles.index}>
      <div className={styles.filters} role="search" aria-label="Filter issues">
        <div className={styles.filterTop}>
          <div className={styles.search}>
            <label htmlFor={qId} className="label">
              Find
            </label>
            <div className={styles.inputWrap}>
              <svg viewBox="0 0 16 16" width="15" height="15" aria-hidden="true">
                <circle cx="6.8" cy="6.8" r="4.8" fill="none" stroke="currentColor" strokeWidth="1.4" />
                <path d="M10.4 10.4 14.5 14.5" stroke="currentColor" strokeWidth="1.4" />
              </svg>
              <input
                id={qId}
                type="search"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="asbestos, panel, pipes, 1978…"
                autoComplete="off"
                spellCheck={false}
              />
            </div>
          </div>
          <label className={styles.firstToggle}>
            <input type="checkbox" className="check" checked={first} onChange={(e) => setFirst(e.target.checked)} />
            <span>
              <span className={styles.firstMark} aria-hidden="true" />
              Check first only
            </span>
          </label>
        </div>
        <div className={styles.chips} role="group" aria-label="Part of the house">
          <button type="button" aria-pressed={part === 'all'} onClick={() => setPart('all')}>
            All <span className={styles.chipN}>{base.length}</span>
          </button>
          {PARTS.map((p) => {
            const n = countIn(p.id);
            return (
              <button key={p.id} type="button" aria-pressed={part === p.id} onClick={() => setPart(part === p.id ? 'all' : p.id)} disabled={n === 0 && part !== p.id}>
                {p.label} <span className={styles.chipN}>{n}</span>
              </button>
            );
          })}
        </div>
        <p className={styles.status} aria-live="polite">
          {filtered ? (
            <>
              Showing {plural(shown.length, 'issue')} of {issues.length}.{' '}
              <button type="button" className={styles.reset} onClick={reset}>
                Clear filters
              </button>
            </>
          ) : (
            `${plural(issues.length, 'issue')}, grouped by part of the house.`
          )}
        </p>
      </div>

      {groups.length === 0 ? (
        <div className={styles.empty}>
          <p className={styles.emptyHead}>Nothing on record matches.</p>
          <p>
            Try a material (&ldquo;asbestos&rdquo;), a part of the house (&ldquo;attic&rdquo;) or a year range, or{' '}
            <button type="button" className={styles.reset} onClick={reset}>
              clear the filters
            </button>
            .
          </p>
        </div>
      ) : (
        groups.map((g) => (
          <section key={g.id} id={`part-${g.id}`} className={styles.group} aria-labelledby={`part-${g.id}-h`}>
            <h2 id={`part-${g.id}-h`} className={styles.groupHead}>
              <span>{g.label}</span>
              <span className={styles.groupN}>{g.issues.length}</span>
            </h2>
            <IssueLineScale min={min} max={max} />
            <ul className={styles.list}>
              {g.issues.map((i) => (
                <IssueLine key={i.id} issue={i} />
              ))}
            </ul>
          </section>
        ))
      )}
    </div>
  );
}
