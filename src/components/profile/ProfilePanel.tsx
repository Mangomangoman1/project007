'use client';

import { useEffect, useId, useState, useSyncExternalStore } from 'react';
import {
  PROFILE_GROUPS,
  PROFILE_KEYS,
  answeredCount,
  questionFor,
  setAnswer,
  type HouseProfile,
  type ProfileKey,
} from '@/lib/profile';
import { STORAGE_KEYS } from '@/lib/site';
import { readStore, writeStore } from '@/lib/storage';
import { plural } from '@/lib/labels';
import styles from './ProfilePanel.module.css';

export type ProfilePanelProps = {
  year: number;
  profile: HouseProfile;
  onChange: (next: HouseProfile) => void;
  /** Items (issues + parts) the answers hide in this report. */
  hiddenCount: number;
  /** Hidden items are shown in place, marked as not applying. */
  reveal: boolean;
  onReveal: (reveal: boolean) => void;
  className?: string;
};

const NARROW = '(max-width: 720px)';
function useNarrow() {
  return useSyncExternalStore(
    (cb) => {
      if (typeof window.matchMedia !== 'function') return () => {};
      const m = window.matchMedia(NARROW);
      m.addEventListener('change', cb);
      return () => m.removeEventListener('change', cb);
    },
    () => typeof window.matchMedia === 'function' && window.matchMedia(NARROW).matches,
    () => false,
  );
}

/** "Basement · No gas · City sewer": the answers in the order of the questions. */
function answersLine(profile: HouseProfile) {
  return PROFILE_KEYS.filter((k) => profile[k] !== undefined).map((k) => {
    const q = questionFor(k);
    const v = q.values.find((x) => x.id === profile[k])!;
    // Yes/No chips need their subject to make sense out of context.
    if (v.label === 'Yes' || v.label === 'No') return v.fact.charAt(0).toUpperCase() + v.fact.slice(1);
    return v.label;
  });
}

/** The reveal switch, shared by the panel and the per-section notes. */
export function RevealButton({
  hiddenCount,
  reveal,
  onReveal,
  short = false,
  className,
}: {
  hiddenCount: number;
  reveal: boolean;
  onReveal: (r: boolean) => void;
  short?: boolean;
  className?: string;
}) {
  if (hiddenCount === 0) return null;
  const n = short ? `${hiddenCount} hidden` : plural(hiddenCount, 'item');
  return (
    <p className={`${styles.reveal} ${className ?? ''}`}>
      <span className={styles.revealMark} aria-hidden="true" />
      <span>
        {reveal ? (short ? `${hiddenCount} shown that don’t apply` : `Showing ${n} that don’t apply, marked`) : short ? `${n} by your answers` : `${n} hidden by your answers`}
      </span>
      <span aria-hidden="true" className={styles.revealSep}>
        ·
      </span>
      <button type="button" className={styles.revealBtn} aria-pressed={reveal} data-reveal-hidden="" onClick={() => onReveal(!reveal)}>
        {reveal ? 'hide them' : 'show them'}
      </button>
    </p>
  );
}

/**
 * "About your house": eleven optional questions in three short groups, answered with chips.
 * Every question is a native radio group (fieldset + legend) whose first chip is "Not sure"
 * (unset), so arrow keys, labels and screen readers work as they do for any radio group.
 * Collapsed, it is one quiet line in the title block: the answers so far, a tick-scale of
 * progress and how many items the answers hide. Hidden entirely without JS (it cannot filter).
 */
export function ProfilePanel({ year, profile, onChange, hiddenCount, reveal, onReveal, className }: ProfilePanelProps) {
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const narrow = useNarrow();
  const [open, setOpen] = useState(false);
  const [group, setGroup] = useState<string>(PROFILE_GROUPS[0].id);
  const [said, setSaid] = useState('');
  const answered = answeredCount(profile);
  const total = PROFILE_KEYS.length;
  const answers = answersLine(profile);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- restoring client-only state after hydration
    if (readStore<string | null>(STORAGE_KEYS.profileOpen, null) === '1') setOpen(true);
  }, []);

  const toggle = () => {
    const next = !open;
    setOpen(next);
    writeStore(STORAGE_KEYS.profileOpen, next ? '1' : null);
    if (next) {
      // On a phone, open the first group with something left to answer.
      const g = PROFILE_GROUPS.find((x) => x.keys.some((k) => profile[k] === undefined)) ?? PROFILE_GROUPS[0];
      setGroup(g.id);
    }
  };

  const choose = (key: ProfileKey, value: string | undefined) => {
    onChange(setAnswer(profile, key, value));
    const q = questionFor(key);
    setSaid(`${q.name}: ${value === undefined ? 'not sure' : q.values.find((v) => v.id === value)?.label}.`);
  };

  const clearAll = () => {
    onChange({});
    onReveal(false);
    setSaid('All answers cleared. The full report is shown.');
  };

  const bodyId = `${uid}-body`;

  return (
    <section className={`${styles.panel} ${open ? styles.isOpen : ''} ${className ?? ''}`} aria-labelledby={`${uid}-h`}>
      <div className={styles.bar}>
        <div className={styles.barMain}>
          <h2 id={`${uid}-h`} className={styles.title}>
            About your house
          </h2>
          <p className={styles.answers}>
            {answered === 0 ? (
              <>A few optional answers make this report specific to one house.</>
            ) : (
              answers.map((a, i) => (
                <span key={a + i} className={styles.answer}>
                  {a}
                </span>
              ))
            )}
          </p>
        </div>
        <div className={styles.progress} aria-hidden="true">
          <span className={styles.ticks}>
            {PROFILE_KEYS.map((k) => (
              <span key={k} className={profile[k] !== undefined ? styles.tickOn : styles.tick} />
            ))}
          </span>
          <span className={styles.count}>
            {answered} of {total}
          </span>
        </div>
        <span className="visually-hidden">
          {answered} of {total} questions answered.
        </span>
        <button
          type="button"
          className={styles.toggle}
          aria-expanded={open}
          aria-controls={bodyId}
          data-profile-toggle=""
          onClick={toggle}
        >
          <span>{open ? 'Done' : answered === 0 ? 'Answer a few' : 'Edit answers'}</span>
          <span className={styles.chev} aria-hidden="true" />
        </button>
        {hiddenCount > 0 ? <RevealButton hiddenCount={hiddenCount} reveal={reveal} onReveal={onReveal} className={styles.barReveal} /> : null}
      </div>

      <div id={bodyId} className={styles.body} hidden={!open}>
        {open ? (
          <>
            <p className={styles.intro}>
              Answer what you know; skip the rest. Anything left at <em>not sure</em> hides nothing. Answers stay on this
              device and apply to every year, not just {year}.
            </p>
            <div className={styles.groups}>
              {PROFILE_GROUPS.map((g) => {
                const done = g.keys.filter((k) => profile[k] !== undefined).length;
                const expanded = !narrow || group === g.id;
                const gid = `${uid}-g-${g.id}`;
                return (
                  <div key={g.id} className={`${styles.group} ${expanded ? styles.groupOpen : ''}`}>
                    {narrow ? (
                      <h3 className={styles.groupHead}>
                        <button
                          type="button"
                          className={styles.groupBtn}
                          aria-expanded={expanded}
                          aria-controls={gid}
                          onClick={() => setGroup(expanded ? '' : g.id)}
                        >
                          <span className={styles.groupLabel}>{g.label}</span>
                          <span className={styles.groupCount}>
                            {done}/{g.keys.length}
                          </span>
                          <span className={styles.chev} aria-hidden="true" />
                        </button>
                      </h3>
                    ) : (
                      <h3 className={styles.groupHead}>
                        <span className={styles.groupLabel}>{g.label}</span>
                        <span className={styles.groupCount}>
                          {done}/{g.keys.length}
                        </span>
                      </h3>
                    )}
                    {narrow && !expanded ? (
                      <p className={styles.groupSummary} id={gid}>
                        {done === 0
                          ? g.keys.map((k) => questionFor(k).name).join(' · ')
                          : g.keys
                              .filter((k) => profile[k] !== undefined)
                              .map((k) => answersLine({ [k]: profile[k] } as HouseProfile)[0])
                              .join(' · ')}
                      </p>
                    ) : (
                      <div id={gid} className={styles.questions}>
                        {g.keys.map((k) => (
                          <Question key={k} name={`${uid}-${k}`} k={k} value={profile[k]} onChoose={choose} />
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            <div className={styles.foot}>
              <button type="button" className={styles.clear} onClick={clearAll} disabled={answered === 0}>
                Clear all
              </button>
              <p className={styles.footNote}>Saved on this device only. Nothing is sent anywhere.</p>
              <button type="button" className={styles.done} onClick={toggle} aria-controls={bodyId}>
                Done
              </button>
            </div>
          </>
        ) : null}
      </div>

      <p className="visually-hidden" aria-live="polite">
        {said ? `${said} ${hiddenCount ? `${plural(hiddenCount, 'item')} hidden by your answers.` : 'Nothing hidden.'}` : ''}
      </p>
    </section>
  );
}

function Question({
  k,
  name,
  value,
  onChoose,
}: {
  k: ProfileKey;
  name: string;
  value: string | undefined;
  onChoose: (k: ProfileKey, v: string | undefined) => void;
}) {
  const q = questionFor(k);
  return (
    <fieldset className={styles.q}>
      <legend className={styles.qText}>
        {q.question}
        {q.hint ? <span className={styles.qHint}>{q.hint}</span> : null}
      </legend>
      <div className={styles.chips}>
        <label className={`${styles.chip} ${styles.unsure}`}>
          <input type="radio" name={name} value="" checked={value === undefined} onChange={() => onChoose(k, undefined)} />
          <span>Not sure</span>
        </label>
        {q.values.map((v) => (
          <label key={v.id} className={styles.chip}>
            <input type="radio" name={name} value={v.id} checked={value === v.id} onChange={() => onChoose(k, v.id)} />
            <span>{v.label}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
