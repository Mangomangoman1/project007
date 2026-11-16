'use client';

import { useEffect, useMemo, useState } from 'react';
import type { Lifespan } from '@/lib/types';
import { groupLifespans, parseReplacedYear, type LifeStage, type LifeStanding } from '@/lib/select';
import { ZONE_LABEL } from '@/lib/labels';
import { MAX_YEAR, STORAGE_KEYS } from '@/lib/site';
import { readStore, writeStore } from '@/lib/storage';
import styles from './LifespanList.module.css';

export type LifespanListProps = {
  lifespans: Lifespan[];
  year: number;
  age: number;
};

type Entry = { item: Lifespan; standing: LifeStanding };

const range = (l: Lifespan) => (l.lifeLow === l.lifeHigh ? `~${l.lifeLow} yrs` : `${l.lifeLow}–${l.lifeHigh} yrs`);
const yrs = (n: number) => `${n} ${n === 1 ? 'yr' : 'yrs'}`;

function statusText({ stage, by }: LifeStanding) {
  if (stage === 'past') return `${yrs(by)} past`;
  if (stage === 'due') return 'In its window';
  return `In ${yrs(by)}`;
}

/** How many typical lives fit in the house's age, for the "replaced by now" rows. */
const lives = (l: Lifespan, age: number) => Math.max(1, Math.floor(age / ((l.lifeLow + l.lifeHigh) / 2)));

/**
 * "What's due at this age", honest at every age:
 *  - parts whose typical life is much shorter than the house's age have certainly been replaced
 *    at least once, so they sit in a collapsed "replaced by now" group asking when;
 *  - the visitor can say when any part was last replaced (a year or a decade, kept on this
 *    device); that part is then judged by its own age;
 *  - the open groups lead with what is genuinely informative for the age: first lives ending now,
 *    parts past their life but plausibly original, and what comes due in the next five years.
 * Ranges are drawn on one shared age axis with the house's age through every row.
 */
export function LifespanList({ lifespans, year, age }: LifespanListProps) {
  const [replaced, setReplaced] = useState<Record<string, string>>({});
  const [announce, setAnnounce] = useState('');
  const key = STORAGE_KEYS.lastReplaced(year);

  useEffect(() => {
    const stored = readStore<Record<string, string>>(key, {});
    // eslint-disable-next-line react-hooks/set-state-in-effect -- restoring client-only state after hydration
    setReplaced(stored && typeof stored === 'object' ? stored : {});
  }, [key]);

  const years = useMemo(() => {
    const out: Record<string, number> = {};
    for (const [id, raw] of Object.entries(replaced)) {
      const y = parseReplacedYear(String(raw), year, MAX_YEAR);
      if (y !== null) out[id] = y;
    }
    return out;
  }, [replaced, year]);

  const groups = useMemo(() => groupLifespans(lifespans, age, { replaced: years, currentYear: MAX_YEAR }), [lifespans, age, years]);

  const save = (l: Lifespan, raw: string | null) => {
    setReplaced((prev) => {
      const next = { ...prev };
      if (raw === null) delete next[l.id];
      else next[l.id] = raw;
      writeStore(key, Object.keys(next).length ? next : null);
      return next;
    });
    if (raw === null) setAnnounce(`${l.title}: replacement year cleared.`);
    else {
      const y = parseReplacedYear(raw, year, MAX_YEAR)!;
      const partAge = MAX_YEAR - y;
      const s = groupLifespans([l], age, { replaced: { [l.id]: y }, currentYear: MAX_YEAR });
      const st = (Object.keys(s) as LifeStage[]).find((k) => s[k].length)!;
      setAnnounce(`${l.title}: replaced ${raw}, about ${yrs(partAge)} old. ${statusText(s[st][0].standing)}.`);
    }
  };

  const axisMax = Math.min(160, Math.max(30, Math.ceil((age + 6) / 10) * 10));
  const pct = (v: number) => (Math.min(v, axisMax) / axisMax) * 100;
  const agePct = pct(age);
  const ticks: number[] = [];
  const tickStep = axisMax > 80 ? 20 : 10;
  for (let t = 0; t <= axisMax; t += tickStep) ticks.push(t);

  const publishers = useMemo(() => {
    const m = new Map<string, string>();
    for (const l of lifespans) for (const s of l.sources) if (!m.has(s.publisher)) m.set(s.publisher, s.url);
    return [...m.entries()];
  }, [lifespans]);

  const known = Object.keys(years).length;
  const lead = groups.due.length + groups.past.length + groups.soon.length;

  const replacedField = (l: Lifespan, s: LifeStanding) => (
    <ReplacedField
      key={`${l.id}-${replaced[l.id] ?? ''}`}
      lifespan={l}
      buildYear={year}
      value={replaced[l.id] ?? ''}
      known={s.known}
      onSave={(raw) => save(l, raw)}
    />
  );

  const chartRow = ({ item: l, standing: s }: Entry, withNote: boolean) => {
    const lo = pct(l.lifeLow);
    const hi = pct(l.lifeHigh);
    const clipped = l.lifeHigh > axisMax;
    return (
      <li key={l.id} className={`${styles.row} ${styles[`st_${s.stage}`]} ${s.known ? styles.known : ''}`}>
        <div className={styles.name}>
          <span className={styles.title}>{l.title}</span>
          <span className={styles.zone}>
            {ZONE_LABEL[l.zone]}
            <span className={styles.lifeInline}> · lasts {range(l)}</span>
          </span>
        </div>
        {withNote && l.note ? <p className={styles.note}>{l.note}</p> : null}
        <div className={styles.track} aria-hidden="true">
          <span className={styles.range} style={{ left: `${lo}%`, width: `max(3px, ${hi - lo}%)` }} data-clipped={clipped || undefined} />
          <span className={styles.ageLine} style={{ left: `${agePct}%` }} />
          {s.known ? <span className={styles.partMark} style={{ left: `${pct(s.age)}%` }} /> : null}
        </div>
        <span className={styles.life}>{range(l)}</span>
        <span className={styles.status}>
          {statusText(s)}
          {s.known ? <span className={styles.statusSub}>part is {yrs(s.age)}</span> : <span className={styles.statusSub}>if original</span>}
        </span>
        <div className={styles.field}>{replacedField(l, s)}</div>
      </li>
    );
  };

  const GROUPS: { id: 'due' | 'past' | 'soon'; title: string; blurb: string }[] = [
    {
      id: 'due',
      title: age >= 35 ? 'First life ending around now' : 'In the replacement window now',
      blurb:
        age >= 35
          ? `Long-lived parts installed in ${year} reach the end of their typical life about now. If they are original, these are the ones to look at and budget for.`
          : 'If these are still the originals, they are inside their typical service life range. Worth budgeting for.',
    },
    {
      id: 'past',
      title: 'Past typical life, if still original',
      blurb: 'Older than the usual range, but not so old that an original is unlikely. Worth finding out whether they have been replaced.',
    },
    { id: 'soon', title: 'Coming due in the next five years', blurb: 'Not yet, but close enough to plan for.' },
  ];

  return (
    <div className={styles.root}>
      <dl className={styles.summary}>
        <div className={groups.due.length ? styles.sumOn : undefined}>
          <dt>In their window</dt>
          <dd>{groups.due.length}</dd>
        </div>
        <div>
          <dt>Past life, if original</dt>
          <dd>{groups.past.length}</dd>
        </div>
        <div>
          <dt>Due within 5&nbsp;yrs</dt>
          <dd>{groups.soon.length}</dd>
        </div>
        <div>
          <dt>{age > 0 ? 'Replaced by now' : 'Further out'}</dt>
          <dd>{age > 0 ? groups.cycled.length : groups.later.length}</dd>
        </div>
      </dl>

      <p className={styles.howto}>
        {groups.cycled.length > 0
          ? `${groups.cycled.length} of the ${lifespans.length} parts we track wear out so much faster than a ${year} house has stood that they have been replaced at least once. `
          : ''}
        Know when something was last replaced? Enter the year (or a decade, like 2010s) and we&rsquo;ll show where that
        part stands. It stays on this device only.
      </p>

      <p className="visually-hidden" aria-live="polite">
        {announce}
      </p>

      {lead > 0 ? (
        <div className={styles.chart}>
          <div className={styles.chartHead} aria-hidden="true">
            <span className={styles.headName}>Part</span>
            <div className={styles.axis}>
              {ticks.map((t) => (
                <span key={t} className={styles.tick} style={{ left: `${pct(t)}%` }}>
                  {t}
                </span>
              ))}
              <span className={styles.ageTag} style={{ left: `${agePct}%` }} data-edge={agePct > 88 ? 'end' : undefined}>
                House {age}
              </span>
            </div>
            <span className={styles.headLife}>Typical life</span>
            <span className={styles.headStatus}>Status</span>
            <span className={styles.headField}>Last replaced</span>
          </div>

          {GROUPS.map((g) => {
            const items = groups[g.id];
            if (items.length === 0) return null;
            return (
              <section key={g.id} className={styles.group} aria-labelledby={`ls-${g.id}`}>
                <div className={styles.groupHead}>
                  <h3 id={`ls-${g.id}`}>{g.title}</h3>
                  <span className={styles.groupCount}>{items.length}</span>
                </div>
                <p className={styles.blurb}>{g.blurb}</p>
                <ul className={styles.rows}>{items.map((e) => chartRow(e, g.id === 'due' || (g.id === 'soon' && items.length <= 4)))}</ul>
              </section>
            );
          })}
        </div>
      ) : (
        <p className={styles.empty}>
          Nothing on our list is in its replacement window for a {age === 0 ? 'brand-new' : `${age}-year-old`} house
          {known ? ', including the parts you dated' : ''}.
          {groups.later[0] ? ` The first to come due is typically the ${groups.later[0].item.title.toLowerCase()}, in about ${yrs(groups.later[0].standing.by)}.` : ''}
        </p>
      )}

      {groups.cycled.length > 0 && (
        <details className={styles.fold}>
          <summary className={styles.foldHead}>
            <span className={styles.plus} aria-hidden="true" />
            <span className={styles.foldTitle}>
              Replaced at least once by now: <em>find out when</em>
            </span>
            <span className={styles.groupCount}>{groups.cycled.length}</span>
          </summary>
          <p className={styles.blurb}>
            A {year} house has outlasted these parts&rsquo; typical life {age >= 40 ? 'several times' : 'at least once'} over, so what matters is
            when each was last replaced. Ask the seller or check receipts and date labels; enter a year and the part moves up
            to where it stands.
          </p>
          <ul className={styles.compactRows}>
            {groups.cycled.map(({ item: l, standing: s }) => (
              <li key={l.id} className={styles.compactRow}>
                <span className={styles.name}>
                  <span className={styles.title}>{l.title}</span>
                  <span className={styles.zone}>{ZONE_LABEL[l.zone]}</span>
                </span>
                <span className={styles.life}>lasts {range(l)}</span>
                <span className={styles.lives}>≈{lives(l, age)} lifetimes</span>
                <div className={styles.field}>{replacedField(l, s)}</div>
              </li>
            ))}
          </ul>
        </details>
      )}

      {groups.later.length > 0 && (
        <details className={styles.fold}>
          <summary className={styles.foldHead}>
            <span className={styles.plus} aria-hidden="true" />
            <span className={styles.foldTitle}>Further out</span>
            <span className={styles.groupCount}>{groups.later.length}</span>
          </summary>
          <ul className={styles.compactRows}>
            {groups.later.map(({ item: l, standing: s }) => (
              <li key={l.id} className={styles.compactRow}>
                <span className={styles.name}>
                  <span className={styles.title}>{l.title}</span>
                  <span className={styles.zone}>{ZONE_LABEL[l.zone]}</span>
                </span>
                <span className={styles.life}>lasts {range(l)}</span>
                <span className={styles.lives}>
                  {s.known ? `part is ${yrs(s.age)} · ` : ''}in {yrs(s.by)}
                </span>
                <div className={styles.field}>{replacedField(l, s)}</div>
              </li>
            ))}
          </ul>
        </details>
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

/**
 * "Last replaced" input: a year or a decade. Saves on Enter or blur (not per keystroke, since a
 * saved part moves to another group); Escape reverts; a × clears a saved value.
 */
function ReplacedField({
  lifespan,
  buildYear,
  value,
  known,
  onSave,
}: {
  lifespan: Lifespan;
  buildYear: number;
  value: string;
  known: boolean;
  onSave: (raw: string | null) => void;
}) {
  const [draft, setDraft] = useState(value);
  const valid = draft.trim() === '' || parseReplacedYear(draft, buildYear, MAX_YEAR) !== null;
  const id = `lr-${lifespan.id}`;
  const commit = () => {
    const v = draft.trim();
    if (v === value) return;
    if (v === '') onSave(null);
    else if (parseReplacedYear(v, buildYear, MAX_YEAR) !== null) onSave(v);
  };
  return (
    <span className={`${styles.replaced} ${known ? styles.replacedSet : ''}`}>
      <label htmlFor={id} className={styles.replacedLabel}>
        <span className={styles.replacedWord}>Replaced</span>
        <span className="visually-hidden">: when was the {lifespan.title.toLowerCase()} last replaced? A year or a decade.</span>
      </label>
      <input
        id={id}
        className={`${styles.replacedInput} ${!valid ? styles.replacedBad : ''}`}
        type="text"
        inputMode="text"
        autoComplete="off"
        spellCheck={false}
        maxLength={6}
        placeholder="year"
        value={draft}
        aria-invalid={!valid || undefined}
        title={!valid ? `A year from ${buildYear} to ${MAX_YEAR}, or a decade like 2010s` : undefined}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            commit();
            // the saved part moves to another group: keep the keyboard where it was
            window.setTimeout(() => document.getElementById(id)?.focus(), 0);
          } else if (e.key === 'Escape') setDraft(value);
        }}
      />
      {known ? (
        <button type="button" className={styles.replacedClear} onClick={() => onSave(null)} aria-label={`Clear the replacement year for ${lifespan.title}`}>
          ×
        </button>
      ) : null}
    </span>
  );
}
