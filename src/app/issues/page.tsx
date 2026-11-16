import Link from 'next/link';
import { getIssues, toLite } from '@/lib/data';
import { PARTS, PART_OF_ZONE, plural } from '@/lib/labels';
import { MAX_YEAR, MIN_YEAR, SITE } from '@/lib/site';
import { TimelineLegend } from '@/components/TimelineLegend';
import { IssueIndex, type IndexIssue } from '@/components/issue/IssueIndex';
import { JsonLd, absUrl, breadcrumbs } from '@/components/seo/JsonLd';
import { pageMeta } from '@/lib/seo';
import styles from './issues.module.css';

export const metadata = pageMeta({
  title: 'Every issue on record, by part of the house',
  shareTitle: 'Every issue on record',
  description: `All ${getIssues().length} materials, products and missing protections tracked for US houses built ${MIN_YEAR}–${MAX_YEAR}, grouped by part of the house, with the years each applies and how sure the dates are.`,
  path: '/issues',
});

const PART_ORDER = new Map(PARTS.map((p, i) => [p.id, i]));

export default function IssuesPage() {
  const all = getIssues();
  const issues: IndexIssue[] = [...all]
    .sort(
      (a, b) =>
        (PART_ORDER.get(PART_OF_ZONE[a.where[0]]) ?? 99) - (PART_ORDER.get(PART_OF_ZONE[b.where[0]]) ?? 99) ||
        a.priority - b.priority ||
        (a.applies.from ?? MIN_YEAR - 1) - (b.applies.from ?? MIN_YEAR - 1) ||
        a.title.localeCompare(b.title),
    )
    .map((i) => ({ ...toLite(i), where: i.where }));
  const first = all.filter((i) => i.priority === 1).length;
  const missing = all.filter((i) => i.kind === 'missing').length;
  const regional = all.filter((i) => i.regions !== 'national').length;

  return (
    <div className={styles.page}>
      <JsonLd
        data={[
          breadcrumbs([
            [SITE.name, '/'],
            ['Issues', '/issues'],
          ]),
          {
            '@context': 'https://schema.org',
            '@type': 'ItemList',
            name: 'Every issue on record',
            numberOfItems: all.length,
            itemListElement: issues.map((i, n) => ({ '@type': 'ListItem', position: n + 1, name: i.title, url: absUrl(`/issue/${i.slug}`) })),
          },
        ]}
      />
      <header className={`wrap ${styles.titleBlock}`}>
        <div className={styles.tbMain}>
          <p className="label">Sheet index · {MIN_YEAR} to today</p>
          <h1 className={styles.title}>Every issue on record</h1>
          <p className={styles.lede}>
            {plural(all.length, 'material, product or missing protection', 'materials, products and missing protections')} that
            US houses were built with, grouped by part of the house. Each has its years, a way to check, and the sources
            behind it.
          </p>
        </div>
        {/* one <dl> per cell: the closing note is not a term/definition pair */}
        <div className={styles.cells}>
          <dl>
            <dt>On record</dt>
            <dd>{all.length}</dd>
          </dl>
          <dl className={styles.cellAccent}>
            <dt>Check first</dt>
            <dd>{first}</dd>
          </dl>
          <dl>
            <dt>Built without</dt>
            <dd>{missing}</dd>
          </dl>
          <dl>
            <dt>Regional</dt>
            <dd>{regional}</dd>
          </dl>
          <div className={styles.cellNote}>
            <p>
              Know the year? <Link href="/">Look it up</Link> to see only what applies to your house.
            </p>
          </div>
        </div>
      </header>

      <div className={`wrap ${styles.body}`}>
        <div className={styles.key}>
          <p className="label">Reading the bands</p>
          <TimelineLegend compact />
        </div>
        <IssueIndex issues={issues} min={MIN_YEAR} max={MAX_YEAR} />
      </div>
    </div>
  );
}
