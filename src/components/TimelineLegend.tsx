import styles from './TimelineLegend.module.css';

/** Key to the timeline's visual language. Static; pair it with <Timeline> or <IssueBand>. */
export function TimelineLegend({ compact = false }: { compact?: boolean }) {
  return (
    <ul className={`${styles.legend} ${compact ? styles.compact : ''}`} aria-label="How to read the timeline">
      <li>
        <svg width="34" height="10" aria-hidden="true">
          <rect x="0" y="1" width="34" height="8" className={styles.tint} />
          <rect x="9" y="1" width="16" height="8" className={styles.solid} />
        </svg>
        Solid: most likely years
      </li>
      <li>
        <svg width="34" height="10" aria-hidden="true">
          <defs>
            <linearGradient id="lg-fade">
              <stop offset="0" className={styles.stop0} />
              <stop offset="0.75" className={styles.stop1} />
            </linearGradient>
          </defs>
          <rect x="0" y="1" width="34" height="8" fill="url(#lg-fade)" />
        </svg>
        Faded edge: approximate date
      </li>
      <li>
        <svg width="34" height="12" aria-hidden="true">
          <rect x="0" y="2" width="30" height="8" className={styles.solid} />
          <line x1="30.75" x2="30.75" y1="0" y2="12" className={styles.cap} />
        </svg>
        Sharp edge: legal or recall date
      </li>
      <li>
        <svg width="34" height="10" aria-hidden="true">
          <defs>
            <pattern id="lg-hatch" width="4" height="4" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
              <rect width="1.6" height="4" className={styles.solid} />
            </pattern>
          </defs>
          <rect x="0" y="1" width="34" height="8" fill="url(#lg-hatch)" />
        </svg>
        Hatched: protection missing
      </li>
      <li>
        <svg width="34" height="10" aria-hidden="true">
          <rect x="0" y="1" width="34" height="8" className={styles.accent} />
        </svg>
        Check first
      </li>
    </ul>
  );
}
