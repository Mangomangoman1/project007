import { pct, type CharRecord, type Yours } from '@/lib/typical';
import styles from './TypicalHouse.module.css';

/** Below this share a segment carries no number inside it (the key below still lists it). */
const INSIDE_MIN = 11;
/** Percent geometry to two decimals (keeps the HTML small). */
const f2 = (x: number) => Math.round(x * 100) / 100;

/**
 * One characteristic as a thin stacked strip on a 0–100 ruler: segments in the table's own
 * category order, the most common one drawn solid, the rest in alternating tints; withheld points
 * are hatched. A key under it names every category with its share (so nothing depends on colour).
 * When the visitor's answer lines up with a category, a small "yours" bracket marks its segment.
 */
export function ShareStrip({ rec, yours }: { rec: CharRecord; yours?: Yours }) {
  const segs = rec.shares.filter((s) => s.value !== null && s.value > 0);
  const total = segs.reduce((t, s) => t + s.value!, 0) + rec.withheld;
  const scale = total > 100 ? 100 / total : 1; // rounding can add to 101
  const placed = segs.map((s, i) => ({
    s,
    left: segs.slice(0, i).reduce((t, x) => t + x.value! * scale, 0),
    w: s.value! * scale,
    tint: s.id === rec.lead?.id ? 'lead' : i % 2 ? 'b' : 'a',
  }));
  const withheldLeft = placed.reduce((t, p) => t + p.w, 0);
  const mine = yours ? placed.filter((p) => yours.catIds.includes(p.s.id)) : [];
  // One bracket per run of adjacent marked segments (an answer can map to categories that are not side by side).
  const runs: { from: number; to: number }[] = [];
  for (const p of mine) {
    const last = runs[runs.length - 1];
    if (last && Math.abs(last.to - p.left) < 0.01) last.to = p.left + p.w;
    else runs.push({ from: p.left, to: p.left + p.w });
  }
  const widest = runs.reduce((bi, r, i) => (r.to - r.from > runs[bi].to - runs[bi].from ? i : bi), 0);

  return (
    <div className={styles.stripWrap}>
      <div className={mine.length ? `${styles.strip} ${styles.stripMine}` : styles.strip} aria-hidden="true">
        {runs.map((r, i) => (
          <span key={r.from} className={styles.yoursMark} style={{ left: `${f2(r.from)}%`, width: `${f2(r.to - r.from)}%` }}>
            {i === widest ? <span>yours</span> : null}
          </span>
        ))}
        <div className={styles.bar}>
          {placed.map((p) => (
            <span
              key={p.s.id}
              className={`${styles.seg} ${styles[`seg_${p.tint}`]}`}
              style={{ left: `${f2(p.left)}%`, width: `${f2(p.w)}%` }}
            >
              {p.w >= INSIDE_MIN ? <span className={styles.segNum}>{p.s.value}</span> : null}
            </span>
          ))}
          {rec.withheld > 0 ? (
            <span className={`${styles.seg} ${styles.seg_withheld}`} style={{ left: `${f2(withheldLeft)}%`, width: `${f2(rec.withheld * scale)}%` }} />
          ) : null}
        </div>
        <span className={styles.ruler} />
      </div>
      <ul className={styles.key}>
        {rec.shares.map((s) => {
          const tint = s.value === null ? 'withheld' : (placed.find((p) => p.s.id === s.id)?.tint ?? 'none');
          const isMine = yours?.catIds.includes(s.id);
          return (
            <li key={s.id} className={[s.id === rec.lead?.id ? styles.keyLead : '', isMine ? styles.keyMine : ''].filter(Boolean).join(' ') || undefined}>
              <span className={`${styles.sw} ${styles[`sw_${tint}`] ?? ''}`} aria-hidden="true" />
              <span className={styles.keyLabel} title={s.long !== s.label ? s.long : undefined}>
                {s.label}
              </span>
              <span className={styles.keyVal}>{pct(s)}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
