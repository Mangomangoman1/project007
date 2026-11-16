import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getIssue, getIssues, toLite } from '@/lib/data';
import { CATEGORY_LABEL, EVIDENCE, SEVERITY, STATE_NAME, ZONE_LABEL, plural } from '@/lib/labels';
import { SITE } from '@/lib/site';
import { yearsLabel } from '@/lib/timeline';
import type { Issue } from '@/lib/types';
import { TimelineLegend } from '@/components/TimelineLegend';
import { CheckFirstTag, EvidenceStamp, Prevalence, RegionTag, TierTag } from '@/components/Stamps';
import { HouseCutaway } from '@/components/HouseCutaway/HouseCutaway';
import { YearsDiagram } from '@/components/issue/YearsDiagram';
import { IssueLine } from '@/components/issue/IssueLine';
import {
  PRIORITY_LABEL,
  coreSentence,
  edgeNotes,
  kindLabel,
  partOf,
  prevalenceNote,
  rangeSentence,
  relatedIssues,
  representativeYears,
  shortUrl,
} from '@/components/issue/issueText';
import { JsonLd, absUrl, breadcrumbs } from '@/components/seo/JsonLd';
import { pageMeta } from '@/lib/seo';
import styles from './issue.module.css';

export const dynamicParams = false;

export function generateStaticParams() {
  return getIssues().map((i) => ({ slug: i.slug }));
}

type Props = { params: Promise<{ slug: string }> };

/** "1978–1997", "1995 or earlier", "2011 or later", "any year". */
function span(i: Pick<Issue, 'applies'>) {
  const { from, to } = i.applies;
  if (from === null && to === null) return 'any year';
  if (from === null) return `${to} or earlier`;
  if (to === null) return `${from} or later`;
  return from === to ? String(from) : `${from}–${to}`;
}

const clip = (s: string, n = 200) => (s.length <= n ? s : `${s.slice(0, s.lastIndexOf(' ', n - 1))}…`);

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const issue = getIssue((await params).slug);
  if (!issue) return {};
  const title = `${issue.title}: houses built ${span(issue)}`;
  const description = clip(issue.hook);
  // the share image is this route's own opengraph-image file
  return pageMeta({ title, description, path: `/issue/${issue.slug}`, type: 'article', image: null });
}

function regionText(regions: string[]) {
  const names = regions.map((r) => STATE_NAME[r] ?? r);
  if (names.length === 1) return names[0];
  return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
}

export default async function IssuePage({ params }: Props) {
  const issue = getIssue((await params).slug);
  if (!issue) notFound();

  const missing = issue.kind === 'missing';
  const part = partOf(issue);
  const [start, core, end] = edgeNotes(issue);
  const coreLine = coreSentence(issue);
  const years = representativeYears(issue);
  const related = relatedIssues(issue, getIssues(), 4).map(toLite);
  const zones = issue.where.map((z) => ZONE_LABEL[z]);
  const primaryCount = issue.sources.filter((s) => s.tier === 'primary').length;
  const url = `/issue/${issue.slug}`;

  const toc = [
    { id: 'what', label: 'What it is' },
    { id: 'years', label: 'The years' },
    { id: 'check', label: 'How to check' },
    { id: 'do', label: 'What to do' },
    { id: 'sources', label: 'Sources', n: issue.sources.length },
    { id: 'by-year', label: 'Reports by year' },
    ...(related.length ? [{ id: 'related', label: 'Related', n: related.length }] : []),
  ];

  const jsonLd = [
    breadcrumbs([
      [SITE.name, '/'],
      ['Issues', '/issues'],
      [issue.title, url],
    ]),
    {
      '@context': 'https://schema.org',
      '@type': 'Article',
      headline: issue.title,
      description: issue.hook,
      abstract: issue.summary,
      url: absUrl(url),
      mainEntityOfPage: absUrl(url),
      inLanguage: 'en-US',
      isAccessibleForFree: true,
      about: { '@type': 'Thing', name: issue.title },
      publisher: { '@type': 'Organization', name: SITE.name, url: absUrl('/') },
      citation: issue.sources.map((s) => ({ '@type': 'CreativeWork', name: s.publisher, url: s.url })),
    },
  ];

  return (
    <article className={styles.page}>
      <JsonLd data={jsonLd} />

      {/* ---------- title block ---------- */}
      <div className="wrap">
        <nav aria-label="Breadcrumb" className={styles.crumbs}>
          <ol>
            <li>
              <Link href="/issues">Issues</Link>
            </li>
            <li>
              <Link href={`/issues#part-${part.id}`}>{part.label}</Link>
            </li>
            <li aria-current="page">{issue.title}</li>
          </ol>
        </nav>
        <header className={styles.titleBlock}>
          <div className={styles.tbMain}>
            <p className={styles.kicker}>
              {issue.priority === 1 ? <CheckFirstTag /> : null}
              <span className="label">
                {kindLabel(issue)} · {CATEGORY_LABEL[issue.category]}
              </span>
              <RegionTag regions={issue.regions} />
            </p>
            <h1 className={styles.title}>{issue.title}</h1>
            <p className={styles.hook}>{issue.hook}</p>
          </div>
          <dl className={styles.cells}>
            <div className={styles.cellWide}>
              <dt>{missing ? 'Houses built without it' : 'Houses built'}</dt>
              <dd className={styles.cellYears}>{yearsLabel(issue).replace(/^Built /, '')}</dd>
            </div>
            <div>
              <dt>Dates from</dt>
              <dd>
                <EvidenceStamp evidence={issue.evidence} />
              </dd>
            </div>
            <div>
              <dt>How common</dt>
              <dd>
                <Prevalence label={issue.prevalence.label} />
              </dd>
            </div>
            <div className={issue.priority === 1 ? styles.cellAccent : undefined}>
              <dt>Priority</dt>
              <dd className={styles.cellText}>{PRIORITY_LABEL[issue.priority]}</dd>
            </div>
            <div>
              <dt>Mainly about</dt>
              <dd className={styles.cellText}>{SEVERITY[issue.severity]}</dd>
            </div>
            <div className={styles.cellWide}>
              <dt>Where to look</dt>
              <dd className={styles.cellZones}>{zones.join(' · ')}</dd>
            </div>
          </dl>
        </header>
      </div>

      <div className={`wrap ${styles.body}`}>
        <aside className={styles.toc} aria-label="On this page">
          <p className="label">On this page</p>
          <ol>
            {toc.map((t) => (
              <li key={t.id}>
                <a href={`#${t.id}`}>
                  <span>{t.label}</span>
                  {'n' in t ? <span className={styles.tocN}>{t.n}</span> : null}
                </a>
              </li>
            ))}
          </ol>
          <Link href="/issues" className={styles.tocBack}>
            ← All {getIssues().length} issues
          </Link>
        </aside>

        <div className={styles.sections}>
          {/* ---------- what it is ---------- */}
          <section id="what" className={styles.section} aria-labelledby="what-h">
            <div className="section-head">
              <h2 id="what-h">What it is</h2>
            </div>
            <p className={styles.summary}>{issue.summary}</p>
            <div className={styles.trust}>
              <div className={styles.trustCell}>
                <p className="label">How sure the dates are</p>
                <EvidenceStamp evidence={issue.evidence} />
                <p>
                  {EVIDENCE[issue.evidence].long}{' '}
                  <Link href="/about#evidence" className={styles.inlineMore}>
                    What the labels mean
                  </Link>
                </p>
              </div>
              <div className={styles.trustCell}>
                <p className="label">How common it is</p>
                <Prevalence label={issue.prevalence.label} />
                <p>{prevalenceNote(issue.prevalence) || (issue.prevalence.label === 'unknown' ? 'No one has counted how many houses have it.' : '')}</p>
              </div>
            </div>
          </section>

          {/* ---------- years ---------- */}
          <section id="years" className={styles.section} aria-labelledby="years-h">
            <div className="section-head">
              <h2 id="years-h">The years</h2>
            </div>
            <p className={styles.statement}>
              {rangeSentence(issue)} {coreLine}
            </p>
            <div className={styles.diagram}>
              <YearsDiagram issue={issue} />
            </div>
            <dl className={styles.edges}>
              {[start, core, end].map((e) => (
                <div key={e.label} className={styles[`edge_${e.kind}`]}>
                  <dt className="label">{e.label}</dt>
                  <dd>
                    <span className={styles.edgeValue}>{e.value}</span>
                    <span className={styles.edgeText}>{e.text}</span>
                  </dd>
                </div>
              ))}
            </dl>
            <div className={styles.legend}>
              <TimelineLegend compact />
            </div>
            {issue.regions !== 'national' || issue.retrofit ? (
              <div className={styles.notes}>
                {issue.regions !== 'national' ? (
                  <div className={styles.note}>
                    <p className="label">Regional</p>
                    <p>
                      This applies to houses in {regionText(issue.regions)}, not nationwide. Reports hide it when you choose
                      another state.
                    </p>
                  </div>
                ) : null}
                {issue.retrofit ? (
                  <div className={styles.note}>
                    <p className="label">Year predicts poorly</p>
                    <p>
                      {missing
                        ? 'Many older houses have had this added since, so the build year says little about whether yours has it now. Check either way.'
                        : 'This was often added to older houses later, so check for it whatever the build year.'}
                    </p>
                  </div>
                ) : null}
              </div>
            ) : null}
          </section>

          {/* ---------- how to check ---------- */}
          <section id="check" className={styles.section} aria-labelledby="check-h">
            <div className="section-head">
              <h2 id="check-h">How to check</h2>
            </div>
            <div className={styles.checkGrid}>
              <ol className={styles.steps}>
                {issue.check.map((c, n) => (
                  <li key={n}>
                    <span className={styles.stepN} aria-hidden="true">
                      {String(n + 1).padStart(2, '0')}
                    </span>
                    <p>{c}</p>
                  </li>
                ))}
              </ol>
              <figure className={styles.figure}>
                <HouseCutaway zones={issue.where} size="md" label={`Where to look: ${zones.join(', ')}`} className={styles.cutaway} />
                <figcaption className={styles.figcap}>
                  <span className="label">Where to look</span>
                  <ul>
                    {zones.map((z) => (
                      <li key={z}>{z}</li>
                    ))}
                  </ul>
                </figcaption>
              </figure>
            </div>
          </section>

          {/* ---------- what to do ---------- */}
          <section id="do" className={styles.section} aria-labelledby="do-h">
            <div className="section-head">
              <h2 id="do-h">What to do</h2>
            </div>
            <div className={styles.doGrid}>
              <p className={styles.action}>
                <span className="label">{missing ? 'If it was never added' : 'If you find it'}</span>
                {issue.action}
              </p>
              {issue.caveat ? (
                <aside className={styles.caveat} aria-label="Keep in mind">
                  <p className={styles.caveatHead}>
                    <span aria-hidden="true">≈</span> Keep in mind
                  </p>
                  <p>{issue.caveat}</p>
                </aside>
              ) : null}
            </div>
          </section>

          {/* ---------- sources ---------- */}
          <section id="sources" className={styles.section} aria-labelledby="sources-h">
            <div className="section-head">
              <h2 id="sources-h">Sources</h2>
              <p className={styles.sectionLede}>
                {plural(issue.sources.length, 'verified source')}
                {primaryCount ? `, ${primaryCount} primary` : ''}. Each quote is copied word for word from the page linked.
              </p>
            </div>
            <ol className={styles.sources}>
              {issue.sources.map((s, n) => (
                <li key={n} className={styles.source}>
                  <span className={styles.sourceN} aria-hidden="true">
                    {n + 1}
                  </span>
                  <div className={styles.sourceBody}>
                    <p className={styles.sourceHead}>
                      <span className={styles.publisher}>{s.publisher}</span>
                      <TierTag tier={s.tier} />
                    </p>
                    {s.quote ? (
                      <blockquote cite={s.url} className={styles.quote}>
                        <p>{s.quote}</p>
                      </blockquote>
                    ) : null}
                    <a href={s.url} rel="noopener noreferrer" target="_blank" className={styles.sourceLink}>
                      {shortUrl(s.url)}
                      <span aria-hidden="true"> ↗</span>
                      <span className="visually-hidden"> (opens in a new tab)</span>
                    </a>
                  </div>
                </li>
              ))}
            </ol>
          </section>

          {/* ---------- representative years ---------- */}
          <section id="by-year" className={styles.section} aria-labelledby="by-year-h">
            <div className="section-head">
              <h2 id="by-year-h">{missing ? 'Reports for houses built without it' : 'Applies to houses built'}</h2>
              <p className={styles.sectionLede}>Open the full report for a year to see everything else houses of that age have in common.</p>
            </div>
            <ul className={styles.yearLinks}>
              {years.map((y) => (
                <li key={y.year}>
                  <Link href={`/built/${y.year}`} prefetch={false}>
                    <span className="label">{y.label}</span>
                    <span className={styles.yearNum}>{y.year}</span>
                    <span className={styles.yearGo} aria-hidden="true">
                      Report →
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>

          {/* ---------- related ---------- */}
          {related.length > 0 && (
            <section id="related" className={styles.section} aria-labelledby="related-h">
              <div className="section-head">
                <h2 id="related-h">Related</h2>
                <p className={styles.sectionLede}>Same part of the house, or the same years.</p>
              </div>
              <ul className={styles.related}>
                {related.map((r) => (
                  <IssueLine key={r.id} issue={r} idPrefix="rel" />
                ))}
              </ul>
            </section>
          )}

          <p className={styles.disclaimer}>{SITE.disclaimer}</p>
        </div>
      </div>
    </article>
  );
}
