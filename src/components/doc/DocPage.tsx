import type { ReactNode } from 'react';
import { JsonLd, breadcrumbs } from '@/components/seo/JsonLd';
import { SITE } from '@/lib/site';
import styles from './DocPage.module.css';

export type DocCell = {
  label: string;
  /** Short value: a numeral or one or two words, set in display type. */
  value: ReactNode;
  /** Optional small mono note under the value. */
  note?: ReactNode;
};

export type DocSection = { id: string; title: string; body: ReactNode };

type Props = {
  /** Mono kicker above the title, e.g. "Privacy · this site". */
  kicker: string;
  title: string;
  lede: ReactNode;
  /** Title-block cells (two to four). */
  cells: DocCell[];
  /** Footer line of the title block, e.g. "Last updated November 16, 2026". */
  stamp: string;
  path: string;
  /** Name for the breadcrumb trail. */
  crumb: string;
  sections: DocSection[];
  /** Extra content after the sections (a closing box). */
  after?: ReactNode;
};

/**
 * A plain-text sheet in the site's drafting style (title block, sticky "On this page" index,
 * numbered sections with dimension-line rules), for /privacy, /terms and /corrections.
 * Server component; interactive bits are passed in as children.
 */
export function DocPage({ kicker, title, lede, cells, stamp, path, crumb, sections, after }: Props) {
  return (
    <article className={styles.page}>
      <JsonLd
        data={breadcrumbs([
          [SITE.name, '/'],
          [crumb, path],
        ])}
      />
      <header className={`wrap ${styles.titleBlock}`}>
        <div className={styles.tbMain}>
          <p className="label">{kicker}</p>
          <h1 className={styles.title}>{title}</h1>
          <div className={styles.lede}>{lede}</div>
        </div>
        <div className={styles.tbSide}>
          <dl className={styles.cells} data-n={cells.length}>
            {cells.map((c) => (
              <div key={c.label}>
                <dt>{c.label}</dt>
                <dd>
                  <span className={styles.cellValue}>{c.value}</span>
                  {c.note ? <span className={styles.cellNote}>{c.note}</span> : null}
                </dd>
              </div>
            ))}
          </dl>
          <p className={styles.stamp}>{stamp}</p>
        </div>
      </header>

      <div className={`wrap ${styles.body}`}>
        <nav className={styles.toc} aria-label="On this page">
          <p className="label">On this page</p>
          <ol>
            {sections.map((s, i) => (
              <li key={s.id}>
                <a href={`#${s.id}`}>
                  <span className={styles.tocN} aria-hidden="true">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  {s.title}
                </a>
              </li>
            ))}
          </ol>
        </nav>

        <div className={styles.sections}>
          {sections.map((s, i) => (
            <section key={s.id} id={s.id} className={styles.section} aria-labelledby={`${s.id}-h`}>
              <div className={`section-head ${styles.head}`}>
                <span className={styles.secN} aria-hidden="true">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <h2 id={`${s.id}-h`}>{s.title}</h2>
              </div>
              <div className={styles.prose}>{s.body}</div>
            </section>
          ))}
          {after}
        </div>
      </div>
    </article>
  );
}

/** A ruled list of short facts: term in mono on the left, plain sentence on the right. */
export function FactList({ items }: { items: { term: ReactNode; text: ReactNode }[] }) {
  return (
    <dl className={styles.facts}>
      {items.map((it, i) => (
        <div key={i}>
          <dt>{it.term}</dt>
          <dd>{it.text}</dd>
        </div>
      ))}
    </dl>
  );
}

/** The boxed closing note (double rule), as on /about. */
export function DocNote({ big, children, label = 'Note' }: { big: ReactNode; children?: ReactNode; label?: string }) {
  return (
    <aside className={styles.note} aria-label={label}>
      <p className={styles.noteBig}>{big}</p>
      {children}
    </aside>
  );
}

export { styles as docStyles };
