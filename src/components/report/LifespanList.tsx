'use client';

import { useEffect, useMemo, useState } from 'react';
import type { Lifespan } from '@/lib/types';
import { lifeStatus, type LifeStatus } from '@/lib/select';
import { ZONE_LABEL } from '@/lib/labels';
import { STORAGE_KEYS } from '@/lib/site';
import { readStore, writeStore } from '@/lib/storage';
import styles from './LifespanList.module.css';

export type LifespanListProps = {
  lifespans: Lifespan[];
  year: number;
  age: number;
  /** Rows of "past typical life" shown before "Show N more". */
  pastVisible?: number;
};

const GROUPS: { id: LifeStatus; title: (age: number) => string; blurb: string }[] = [
  { id: 'due', title: () => 'In the replacement window now', blurb: 'Original parts this old are inside their typical service life range. Worth budgeting for.' },
  { id: 'past', title: () => 'Past typical life, if still original', blurb: 'If any of these are original, they have outlived the usual range. Many will already have been replaced.' },
  { id: 'soon', title: () => 'Coming due in the next five years', blurb: 'Not yet, but close enough to plan for.' },
  { id: 'later', title: () => 'Further out', blurb: '' },
];

const range = (l: Lifespan) => (l.lifeLow === l.lifeHigh ? `~${l.lifeLow} yrs` : `${l.lifeLow}–${l.lifeHigh} yrs`);

function statusText(l: Lifespan, age: number, s: LifeStatus) {
  if (s === 'past') {
    const n = age - l.lifeHigh;
    return `${n} ${n === 1 ? 'yr' : 'yrs'} past`;
  }
  if (s === 'due') return 'Due now';
  const n = l.lifeLow - age;
  return `In ${n} ${n === 1 ? 'yr' : 'yrs'}`;
}

/**
 * "What's due at this age": each lifespan's typical range on a shared age axis with the
 * house's age drawn through every row. "Already replaced" ticks persist per year in localStorage
 * and move items out of the counts.
 */
export function LifespanList({ lifespans, year, age, pastVisible = 8 }: LifespanListProps) {
  const [replaced, setReplaced] = useState<string[]>([]);
  const key = STORAGE_KEYS.replaced(year);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- restoring client-only state after hydration
    setReplaced(readStore<string[]>(key, []));
  }, [key]);

  const toggle = (id: string) => {
    setReplaced((prev) => {
      const next = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id];
      writeStore(key, next.length ? next : null);
      return next;
    });
  };

  const axisMax = Math.min(160, Math.max(30, Math.ceil((age + 8) / 10) * 10));
  const pct = (v: number) => (Math.min(v, axisMax) / axisMax) * 100;
  const agePct = pct(age);

  const groups = useMemo(() => {
    const live = lifespans.filter((l) => !replaced.includes(l.id));
    const by: Record<LifeStatus, Lifespan[]> = { past: [], due: [], soon: [], later: [] };
    for (const l of live) by[lifeStatus(l, age)].push(l);
    by.past.sort((a, b) => b.lifeHigh - a.lifeHigh || a.title.localeCompare(b.title));
    by.due.sort((a, b) => a.lifeHigh - b.lifeHigh || a.title.localeCompare(b.title));
    by.soon.sort((a, b) => a.lifeLow - b.lifeLow || a.title.localeCompare(b.title));
    by.later.sort((a, b) => a.lifeLow - b.lifeLow || a.title.localeCompare(b.title));
    return by;
  }, [lifespans, replaced, age]);

  const replacedItems = lifespans.filter((l) => replaced.includes(l.id));
  const ticks: number[] = [];
  const tickStep = axisMax > 80 ? 20 : 10;
  for (let t = 0; t <= axisMax; t += tickStep) ticks.push(t);

  const publishers = useMemo(() => {
    const m = new Map<string, string>();
    for (const l of lifespans) for (const s of l.sources) if (!m.has(s.publisher)) m.set(s.publisher, s.url);
    return [...m.entries()];
  }, [lifespans]);

  const row = (l: Lifespan, s: LifeStatus, withNote: boolean) => {
    const lo = pct(l.lifeLow);
    const hi = pct(l.lifeHigh);
    const clipped = l.lifeHigh > axisMax;
    return (
      <li key={l.id} className={`${styles.row} ${styles[`st_${s}`]}`}>
        <label className={styles.name}>
          <input type="checkbox" className="check" checked={false} onChange={() => toggle(l.id)} aria-describedby={`ls-${l.id}-st`} />
          <span>
            <span className={styles.title}>{l.title}</span>
            <span className={styles.zone}>{ZONE_LABEL[l.zone]}</span>
            {withNote && l.note ? <span className={styles.note}>{l.note}</span> : null}
          </span>
        </label>
        <div className={styles.track} aria-hidden="true">
          <span className={styles.range} style={{ left: `${lo}%`, width: `max(3px, ${hi - lo}%)` }} data-clipped={clipped || undefined} />
          <span className={styles.ageLine} style={{ left: `${agePct}%` }} />
        </div>
        <span className={styles.life}>{range(l)}</span>
        <span className={styles.status} id={`ls-${l.id}-st`}>
          {statusText(l, age, s)}
        </span>
      </li>
    );
  };

  const counts = { due: groups.due.length, past: groups.past.length, soon: groups.soon.length };

  return (
    <div className={styles.root}>
      <dl className={styles.summary}>
        <div className={counts.due ? styles.sumOn : undefined}>
          <dt>In the window</dt>
          <dd>{counts.due}</dd>
        </div>
        <div>
          <dt>Past typical life</dt>
          <dd>{counts.past}</dd>
        </div>
        <div>
          <dt>Due within 5 yrs</dt>
          <dd>{counts.soon}</dd>
        </div>
        <div>
          <dt>Marked replaced</dt>
          <dd>{replacedItems.length}</dd>
        </div>
      </dl>

      <p className={styles.howto}>
        Tick anything that has already been replaced. It moves out of the list, and we remember it on this device only.
      </p>

      <div className={styles.chartHead} aria-hidden="true">
        <span className={styles.headName}>Part, if original</span>
        <div className={styles.axis}>
          {ticks.map((t) => (
            <span key={t} className={styles.tick} style={{ left: `${pct(t)}%` }}>
              {t}
            </span>
          ))}
          <span className={styles.ageTag} style={{ left: `${agePct}%` }}>
            Age {age}
          </span>
        </div>
        <span className={styles.headLife}>Typical life</span>
        <span className={styles.headStatus}>Status</span>
      </div>

      {GROUPS.map((g) => {
        const items = groups[g.id];
        if (items.length === 0) return null;
        const withNote = g.id === 'due' || g.id === 'soon';
        if (g.id === 'later') {
          return (
            <details key={g.id} className={styles.group}>
              <summary className={styles.groupHead}>
                <h3>{g.title(age)}</h3>
                <span className={styles.groupCount}>{items.length} · show</span>
              </summary>
              <ul className={styles.rows}>{items.map((l) => row(l, g.id, false))}</ul>
            </details>
          );
        }
        const shown = g.id === 'past' ? items.slice(0, pastVisible) : items;
        const rest = g.id === 'past' ? items.slice(pastVisible) : [];
        return (
          <section key={g.id} className={styles.group} aria-label={g.title(age)}>
            <div className={styles.groupHead}>
              <h3>{g.title(age)}</h3>
              <span className={styles.groupCount}>{items.length}</span>
            </div>
            {g.blurb ? <p className={styles.blurb}>{g.blurb}</p> : null}
            <ul className={styles.rows}>{shown.map((l) => row(l, g.id, withNote))}</ul>
            {rest.length > 0 && (
              <details className={styles.more}>
                <summary>Show {rest.length} more</summary>
                <ul className={styles.rows}>{rest.map((l) => row(l, g.id, false))}</ul>
              </details>
            )}
          </section>
        );
      })}

      {replacedItems.length > 0 && (
        <section className={`${styles.group} ${styles.replaced}`} aria-label="Marked as replaced">
          <div className={styles.groupHead}>
            <h3>Marked as replaced</h3>
            <span className={styles.groupCount}>{replacedItems.length}</span>
          </div>
          <ul className={styles.replacedList}>
            {replacedItems.map((l) => (
              <li key={l.id}>
                <label>
                  <input type="checkbox" className="check" checked onChange={() => toggle(l.id)} />
                  <span>{l.title}</span>
                </label>
              </li>
            ))}
          </ul>
        </section>
      )}

      {publishers.length > 0 && (
        <p className={styles.sources}>
          Typical lives from{' '}
          {publishers.map(([p, url], i) => (
            <span key={p}>
              <a href={url} rel="noopener noreferrer" target="_blank">
                {p}
              </a>
              {i < publishers.length - 2 ? ', ' : i === publishers.length - 2 ? ' and ' : '.'}
            </span>
          ))}{' '}
          Real lives vary with climate, quality and upkeep.
        </p>
      )}
    </div>
  );
}
