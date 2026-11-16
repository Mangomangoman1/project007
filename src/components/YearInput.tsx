'use client';

import { useState } from 'react';
import { MAX_YEAR, MIN_YEAR } from '@/lib/site';
import styles from './YearInput.module.css';

export type YearInputProps = {
  year: number;
  onChange: (year: number) => void;
  /** Called on Enter. */
  onSubmit?: (year: number) => void;
  id?: string;
  label?: string;
  /** Hint under the input; defaults to the home page's (which mentions the timeline). */
  hint?: string;
};

/**
 * The hero year: a huge Fraunces numeral that is itself the text input, with −/+ steppers and
 * a dimension line showing the house's age. Partial entries ("19") are held as a draft and only
 * committed when they form a valid year; blur reverts an invalid draft.
 */
export function YearInput({
  year,
  onChange,
  onSubmit,
  id = 'year-input',
  label = 'Year your house was built',
  hint = 'Type a year, use the arrow keys, or drag across the timeline',
}: YearInputProps) {
  const [draft, setDraft] = useState(String(year));
  const [focused, setFocused] = useState(false);

  // While editing show the draft; otherwise always show the committed year.
  const shown = focused ? draft : String(year);

  const valid = (s: string) => /^\d{4}$/.test(s) && Number(s) >= MIN_YEAR && Number(s) <= MAX_YEAR;
  const invalid = focused && draft.length === 4 && !valid(draft);
  const step = (n: number) => onChange(Math.min(MAX_YEAR, Math.max(MIN_YEAR, year + n)));
  const age = MAX_YEAR - year;

  return (
    <div className={styles.root}>
      <label htmlFor={id} className="visually-hidden">
        {label} ({MIN_YEAR} to {MAX_YEAR})
      </label>
      <div className={styles.row}>
        <input
          id={id}
          className={`${styles.input} numeral ${invalid ? styles.invalid : ''}`}
          type="text"
          inputMode="numeric"
          autoComplete="off"
          pattern="[0-9]{4}"
          maxLength={4}
          value={shown}
          aria-invalid={invalid || undefined}
          aria-describedby={`${id}-hint`}
          onFocus={(e) => {
            setFocused(true);
            setDraft(String(year));
            const el = e.currentTarget;
            requestAnimationFrame(() => el.select());
          }}
          onBlur={() => setFocused(false)}
          onChange={(e) => {
            const v = e.target.value.replace(/\D/g, '').slice(0, 4);
            setDraft(v);
            if (valid(v)) onChange(Number(v));
          }}
          onKeyDown={(e) => {
            if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
              e.preventDefault();
              const n = (e.key === 'ArrowUp' ? 1 : -1) * (e.shiftKey ? 10 : 1);
              const next = Math.min(MAX_YEAR, Math.max(MIN_YEAR, year + n));
              setDraft(String(next));
              onChange(next);
            } else if (e.key === 'Enter' && onSubmit && valid(draft)) {
              onSubmit(Number(draft));
            }
          }}
        />
        <div className={styles.steppers}>
          <button type="button" className={styles.step} onClick={() => step(1)} aria-label="Next year" disabled={year >= MAX_YEAR}>
            <svg viewBox="0 0 12 12" width="12" height="12" aria-hidden="true">
              <path d="M6 1v10M1 6h10" stroke="currentColor" strokeWidth="1.5" />
            </svg>
          </button>
          <button type="button" className={styles.step} onClick={() => step(-1)} aria-label="Previous year" disabled={year <= MIN_YEAR}>
            <svg viewBox="0 0 12 12" width="12" height="12" aria-hidden="true">
              <path d="M1 6h10" stroke="currentColor" strokeWidth="1.5" />
            </svg>
          </button>
        </div>
      </div>
      <div className={styles.dim} aria-hidden="true">
        <span className={styles.dimLine} />
        <span className={styles.dimText}>
          {age === 0 ? 'Built this year' : age === 1 ? '1 year old' : `${age} years old`}
        </span>
        <span className={styles.dimLine} />
      </div>
      <p id={`${id}-hint`} className={`${styles.hint} ${invalid ? styles.hintBad : ''}`} aria-live="polite">
        {invalid ? `Enter a year from ${MIN_YEAR} to ${MAX_YEAR}` : hint}
      </p>
    </div>
  );
}
