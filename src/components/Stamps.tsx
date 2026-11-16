import type { Evidence, PrevalenceLabel, Tier } from '@/lib/types';
import { EVIDENCE, PREVALENCE, TIER } from '@/lib/labels';
import styles from './Stamps.module.css';

const GLYPH: Record<Evidence, React.ReactNode> = {
  // a seal
  record: (
    <svg viewBox="0 0 12 12" width="12" height="12" aria-hidden="true">
      <circle cx="6" cy="6" r="4.9" fill="none" stroke="currentColor" strokeWidth="1.2" />
      <circle cx="6" cy="6" r="2" fill="currentColor" />
    </svg>
  ),
  // section mark
  rule: <span className={styles.glyphText} aria-hidden="true">§</span>,
  // approximately
  era: <span className={styles.glyphText} aria-hidden="true">≈</span>,
};

/**
 * Evidence stamp: "Court record" / "Federal rule" / "Approximate era".
 * Solid double rule for record, solid for rule, dashed ("approximate") for era.
 */
export function EvidenceStamp({ evidence, size = 'md' }: { evidence: Evidence; size?: 'sm' | 'md' }) {
  const e = EVIDENCE[evidence];
  return (
    <span className={`${styles.stamp} ${styles[evidence]} ${size === 'sm' ? styles.sm : ''}`} title={e.long}>
      {GLYPH[evidence]}
      <span>{e.short}</span>
      <span className="visually-hidden">: {e.long}</span>
    </span>
  );
}

const DOTS: Record<PrevalenceLabel, number> = { likely: 3, possible: 2, rare: 1, unknown: 0 };

/** Prevalence as words plus a 3-dot meter (never colour alone). */
export function Prevalence({ label, note, showNote = false }: { label: PrevalenceLabel; note?: string; showNote?: boolean }) {
  const n = DOTS[label];
  return (
    <span className={styles.prev}>
      <span className={`${styles.dots} ${label === 'unknown' ? styles.unknown : ''}`} aria-hidden="true">
        {[0, 1, 2].map((i) => (
          <span key={i} className={i < n ? styles.on : undefined} />
        ))}
      </span>
      <span className={styles.prevLabel}>{PREVALENCE[label]}</span>
      {showNote && note ? <span className={styles.prevNote}>{note}</span> : null}
    </span>
  );
}

/** Source tier tag: Primary source / Trade reference / Reference. */
export function TierTag({ tier }: { tier: Tier }) {
  return <span className={`${styles.tier} ${styles[`tier_${tier}`]}`}>{TIER[tier]}</span>;
}

/** Small red-oxide "Check first" marker. */
export function CheckFirstTag() {
  return <span className={styles.checkFirst}>Check first</span>;
}

/** "Regional: CA, OR, WA" tag. */
export function RegionTag({ regions }: { regions: 'national' | string[] }) {
  if (regions === 'national') return null;
  return (
    <span className={styles.region} title={`Applies in: ${regions.join(', ')}`}>
      <svg viewBox="0 0 10 12" width="9" height="11" aria-hidden="true">
        <path d="M5 11.3S1 6.9 1 4.4a4 4 0 0 1 8 0C9 6.9 5 11.3 5 11.3z" fill="none" stroke="currentColor" strokeWidth="1.2" />
        <circle cx="5" cy="4.4" r="1.3" fill="currentColor" />
      </svg>
      {regions.length > 4 ? `${regions.slice(0, 4).join(' ')} +${regions.length - 4}` : regions.join(' ')}
    </span>
  );
}
