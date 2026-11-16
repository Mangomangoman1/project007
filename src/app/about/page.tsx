import Link from 'next/link';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { getIssue, getIssues, getMeta } from '@/lib/data';
import { EVIDENCE, PREVALENCE, plural } from '@/lib/labels';
import { MAX_YEAR, MIN_YEAR, SITE } from '@/lib/site';
import type { Evidence, PrevalenceLabel, Tier } from '@/lib/types';
import { EvidenceStamp, Prevalence, TierTag } from '@/components/Stamps';
import { TimelineLegend } from '@/components/TimelineLegend';
import { YearsDiagram } from '@/components/issue/YearsDiagram';
import { JsonLd, breadcrumbs } from '@/components/seo/JsonLd';
import { Contact } from '@/components/doc/Contact';
import { pageMeta } from '@/lib/seo';
import styles from './about.module.css';

export const metadata = pageMeta({
  title: 'Method, sources and limits',
  description:
    'Where the data comes from, what the evidence and prevalence labels mean, how years are decided, what is left out and why, who is behind the site, and its limits.',
  path: '/about',
});

const AREA: Record<string, string> = {
  electrical: 'electrical',
  plumbing: 'plumbing',
  hazmat: 'hazardous materials',
  envelope: 'roof, walls and windows',
  'hvac-safety-lifespans': 'heating, cooling and fire safety',
  'structure-regional': 'structure and regional hazards',
  'newer-homes': 'newer houses',
};

const PREV_MEANING: Record<PrevalenceLabel, string> = {
  likely: 'A source gives a count or share that makes it common in houses of those years.',
  possible: 'Sources point to a meaningful number of houses, but not most of them.',
  rare: 'It happened, but in a small share of houses.',
  unknown: 'Nobody has counted how many houses have it. We say so rather than guess.',
};

const TIER_MEANING: Record<Tier, string> = {
  primary: 'A federal agency, a building code, a court record or a recall notice.',
  trade: 'Industry and inspection bodies: home inspector associations, manufacturers and trade groups.',
  reference: 'General references such as encyclopedias, used for background.',
};

type Bucket = { id: string; title: string; text: string; n: number };

/**
 * Why candidates were left out, from the editorial file's `reason` field. Read at build time;
 * if the file is missing (sample builds) the page falls back to the total from meta.json.
 */
function exclusionBuckets(): Bucket[] | null {
  try {
    const raw = JSON.parse(readFileSync(path.join(process.cwd(), 'content/editorial.json'), 'utf8')) as Record<
      string,
      { include?: boolean; reason?: string }
    >;
    const count = { unverified: 0, weak: 0, address: 0, lifespan: 0, dup: 0 };
    for (const v of Object.values(raw)) {
      if (!v || v.include !== false) continue;
      const r = v.reason ?? '';
      if (/^lifespan/i.test(r)) count.lifespan++;
      else if (/^(duplicate|covered)/i.test(r)) count.dup++;
      else if (/(exact address|location and soil|local water|depends on location)/i.test(r)) count.address++;
      else if (/^(unconfirmed|no verified|no historical|no dated)/i.test(r)) count.unverified++;
      else count.weak++;
    }
    return [
      {
        id: 'unverified',
        title: 'Could not be verified',
        text: 'The dates or the claim rested on sources we could not open, or on general knowledge. If we could not quote it, it is not here.',
        n: count.unverified,
      },
      {
        id: 'weak',
        title: 'The year says too little',
        text: 'Real issues, but the build year predicts them poorly: things replaced every few years, added to houses of any age, or with no cut-off date.',
        n: count.weak,
      },
      {
        id: 'address',
        title: 'Depends on the address',
        text: 'Radon, flood zones, local water chemistry and old heating-oil tanks depend on where a house sits, not when it was built. Test or check those for any house.',
        n: count.address,
      },
      {
        id: 'lifespan',
        title: 'Moved to “what’s due”',
        text: 'Wear and tear, like roofs and water heaters reaching the end of their life, is about age, not era. It lives in each report’s lifespan list.',
        n: count.lifespan,
      },
      {
        id: 'dup',
        title: 'Merged into another issue',
        text: 'Duplicates were folded into the issue that covers them, and their sources carried across.',
        n: count.dup,
      },
    ].filter((b) => b.n > 0);
  } catch {
    return null;
  }
}

export default function AboutPage() {
  const meta = getMeta();
  const issues = getIssues();
  const candidates = meta.issueCount + meta.excludedCount;
  const areas = meta.researchFiles.map((f) => AREA[f] ?? f.replace(/-/g, ' '));
  const byEvidence = (e: Evidence) => issues.filter((i) => i.evidence === e).length;
  const byPrev = (p: PrevalenceLabel) => issues.filter((i) => i.prevalence.label === p).length;
  const buckets = exclusionBuckets();
  const example = getIssue('polybutylene-pipes') ?? issues.find((i) => i.applies.coreFrom !== null && i.applies.from !== null) ?? issues[0];
  const tierOf = new Map(issues.flatMap((i) => i.sources.map((s) => [s.url, s.tier] as const)));
  const byTier = (t: Tier) => [...tierOf.values()].filter((v) => v === t).length;
  const quoted = new Set(issues.flatMap((i) => i.sources.filter((s) => s.quote).map((s) => s.url))).size;

  return (
    <article className={styles.page}>
      <JsonLd
        data={breadcrumbs([
          [SITE.name, '/'],
          ['Method and sources', '/about'],
        ])}
      />
      <header className={`wrap ${styles.titleBlock}`}>
        <div className={styles.tbMain}>
          <p className="label">Method · sources · limits</p>
          <h1 className={styles.title}>How this works, and how far to trust it</h1>
          <p className={styles.lede}>
            {SITE.name} lists what US houses built in a given year often have, and what they were built without. Every claim
            comes from a source we opened and quoted. The build year is a good first clue. It is never the whole story.
          </p>
        </div>
        <dl className={styles.cells}>
          <div>
            <dt>Issues</dt>
            <dd>{meta.issueCount}</dd>
          </div>
          <div>
            <dt>Verified sources</dt>
            <dd>{meta.sourceCount}</dd>
          </div>
          <div>
            <dt>Primary</dt>
            <dd>{meta.primarySourceCount}</dd>
          </div>
          <div>
            <dt>Left out</dt>
            <dd>{meta.excludedCount}</dd>
          </div>
        </dl>
      </header>

      <div className={`wrap ${styles.body}`}>
        <nav className={styles.toc} aria-label="On this page">
          <p className="label">On this page</p>
          <ol>
            <li><a href="#data">Where the data comes from</a></li>
            <li><a href="#context-data">The year in context</a></li>
            <li><a href="#evidence">What the labels mean</a></li>
            <li><a href="#years">How years are decided</a></li>
            <li><a href="#left-out">What is left out</a></li>
            <li><a href="#limits">Limits</a></li>
            <li><a href="#who">Who is behind this</a></li>
          </ol>
        </nav>

        <div className={styles.sections}>
          {/* ---------- data ---------- */}
          <section id="data" className={styles.section} aria-labelledby="data-h">
            <div className="section-head">
              <h2 id="data-h">Where the data comes from</h2>
            </div>
            <ol className={styles.steps}>
              <li>
                <span className={styles.stepN}>01</span>
                <h3>Gather</h3>
                <p>
                  Research covered {areas.length} areas: {areas.slice(0, -1).join(', ')} and {areas[areas.length - 1]}. That turned
                  up {candidates} candidate issues.
                </p>
              </li>
              <li>
                <span className={styles.stepN}>02</span>
                <h3>Verify</h3>
                <p>
                  Each source was opened and its key sentence copied word for word. Only verified sources are shown:{' '}
                  {meta.sourceCount} in all, {meta.primarySourceCount} of them primary, and {quoted === meta.sourceCount ? 'every one' : quoted} with a quote you can check.
                </p>
              </li>
              <li>
                <span className={styles.stepN}>03</span>
                <h3>Write</h3>
                <p>
                  Each issue was rewritten in plain words, with a year range, the years it is most likely, steps to check and
                  what to do.
                </p>
              </li>
              <li>
                <span className={styles.stepN}>04</span>
                <h3>Cut</h3>
                <p>
                  {meta.excludedCount} of {candidates} candidates were left out because the year could not carry them.{' '}
                  <a href="#left-out">See why</a>.
                </p>
              </li>
            </ol>
          </section>

          {/* ---------- the year in context ---------- */}
          <section id="context-data" className={styles.section} aria-labelledby="context-data-h">
            <div className="section-head">
              <h2 id="context-data-h">The year in context: sources and their limits</h2>
              <p className={styles.sectionLede}>
                The second part of every year&rsquo;s report describes houses in general, never yours. Each figure there names its
                source; here is what each one can and cannot say.
              </p>
            </div>
            <ul className={styles.limits}>
              <li>
                <strong>Events around the year.</strong> A researched timeline of 150 dated changes to US homebuilding, each
                checked against a quoted source. Many early entries rest on Wikipedia or trade bodies, so every event shows its
                source&rsquo;s tier. The record is thin for 1910 to 1929 and for some mechanical systems, and a date marks when
                something began or became required, not when every builder followed.
              </li>
              <li>
                <strong>Homes started.</strong> From 1959, the Census Bureau&rsquo;s count of privately owned housing units
                started. Before that, Historical Statistics of the United States, which pieced the years 1889 to 1958 together
                from permits and other records in several series and leaves out farm housing; we transcribed those figures by
                hand from a scanned copy, checked them against the table&rsquo;s own totals and show them rounded. New-house prices
                start in 1963 and are in the dollars of the day.
              </li>
              <li>
                <strong>Houses of the era today: EIA RECS 2020.</strong> The Energy Information Administration&rsquo;s survey of
                about 18,500 occupied primary homes, which we tabulated for detached single-family houses: roof, outside walls,
                window glass, stories and size. It groups everything built before 1950 together, and it describes homes as they
                were in 2020, replacement roofs and siding included.
              </li>
              <li>
                <strong>Houses of the era today: AHS 2023.</strong> The Census Bureau and HUD&rsquo;s American Housing Survey,
                about 55,700 homes, tabulated the same way for foundation, heating, cooling, bathrooms, fireplaces, size and
                garages, by decade built (before 1920 grouped). Residents report the year and the features; the Census Bureau
                warns some features came later. Bands with fewer than 30 sampled homes are never shown.
              </li>
              <li>
                <strong>The country that decade.</strong> The Census Bureau&rsquo;s Historical Census of Housing Tables, 1940 to
                2000, US and every state: these describe all homes standing at each census, not houses built that year, and 1940
                is the earliest. Homes still standing by decade built come from the American Community Survey, 2020 to 2024, and
                the age of the 1950 housing stock from the 1950 Census of Housing (regions only).
              </li>
            </ul>
          </section>

          {/* ---------- labels ---------- */}
          <section id="evidence" className={styles.section} aria-labelledby="evidence-h">
            <div className="section-head">
              <h2 id="evidence-h">What the labels mean</h2>
              <p className={styles.sectionLede}>
                Every issue carries two labels: where its dates come from, and how common it is. Every source carries a tier.
              </p>
            </div>

            <div className={styles.table}>
              <h3 className={styles.tableHead}>Where the dates come from</h3>
              <ul>
                {(['record', 'rule', 'era'] as Evidence[]).map((e) => (
                  <li key={e}>
                    <span className={styles.tKey}>
                      <EvidenceStamp evidence={e} />
                    </span>
                    <span className={styles.tText}>
                      {EVIDENCE[e].long}
                    </span>
                    <span className={styles.tN}>{plural(byEvidence(e), 'issue')}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className={styles.table}>
              <h3 className={styles.tableHead}>How common it is</h3>
              <ul>
                {(['likely', 'possible', 'rare', 'unknown'] as PrevalenceLabel[]).map((p) => (
                  <li key={p}>
                    <span className={styles.tKey}>
                      <Prevalence label={p} />
                    </span>
                    <span className={styles.tText}>{PREV_MEANING[p]}</span>
                    <span className={styles.tN}>{plural(byPrev(p), 'issue')}</span>
                  </li>
                ))}
              </ul>
              <p className={styles.tableNote}>
                &ldquo;{PREVALENCE.unknown}&rdquo; is the most common label here, on {byPrev('unknown')} of {issues.length}{' '}
                issues. Few of these things were ever counted house by house.
              </p>
            </div>

            <div className={styles.table}>
              <h3 className={styles.tableHead}>Source tiers</h3>
              <ul>
                {(['primary', 'trade', 'reference'] as Tier[]).map((t) => (
                  <li key={t}>
                    <span className={styles.tKey}>
                      <TierTag tier={t} />
                    </span>
                    <span className={styles.tText}>{TIER_MEANING[t]}</span>
                    <span className={styles.tN}>{plural(byTier(t), 'source')}</span>
                  </li>
                ))}
              </ul>
            </div>
          </section>

          {/* ---------- years ---------- */}
          <section id="years" className={styles.section} aria-labelledby="years-h">
            <div className="section-head">
              <h2 id="years-h">How years and edges are decided</h2>
              <p className={styles.sectionLede}>
                Each issue gets a range of build years, and where the sources allow, a narrower stretch when it was most
                likely. Here is <Link href={`/issue/${example.slug}`}>{example.title.toLowerCase()}</Link> on the {MIN_YEAR}–{MAX_YEAR}{' '}
                axis.
              </p>
            </div>
            <div className={styles.example}>
              <YearsDiagram issue={example} idPrefix="about" />
              <TimelineLegend compact />
            </div>
            <dl className={styles.defs}>
              <div>
                <dt>Range</dt>
                <dd>The build years the issue applies to. The full band.</dd>
              </div>
              <div>
                <dt>Most likely</dt>
                <dd>The years sources point to as the peak. The solid part of the band. Some issues have none.</dd>
              </div>
              <div>
                <dt>Sharp edge</dt>
                <dd>The date is a fact: a federal rule, a model code edition, a recall or a court settlement.</dd>
              </div>
              <div>
                <dt>Faded edge</dt>
                <dd>
                  The date is approximate. Products phased in and out, builders used up stock, and places adopted codes at
                  different times.
                </dd>
              </div>
              <div>
                <dt>Open end</dt>
                <dd>
                  No start date (it reaches back before {MIN_YEAR}) or no end date (it is still being built today).
                </dd>
              </div>
              <div>
                <dt>Hatched band</dt>
                <dd>A protection houses were built without. The range is the years before it became standard.</dd>
              </div>
              <div>
                <dt>Regional</dt>
                <dd>Only some states. Reports hide these when you choose a different state.</dd>
              </div>
              <div>
                <dt>Year predicts poorly</dt>
                <dd>Often added to older houses later. Check for it whatever the build year.</dd>
              </div>
            </dl>
          </section>

          {/* ---------- left out ---------- */}
          <section id="left-out" className={styles.section} aria-labelledby="left-out-h">
            <div className="section-head">
              <h2 id="left-out-h">What is left out, and why</h2>
              <p className={styles.sectionLede}>
                {meta.excludedCount} of {candidates} candidates did not make it. Leaving something out does not mean it is
                safe. It means the build year is not a good way to find it.
              </p>
            </div>
            {buckets ? (
              <ul className={styles.buckets}>
                {buckets.map((b) => (
                  <li key={b.id}>
                    <span className={styles.bucketN}>{b.n}</span>
                    <div>
                      <h3>{b.title}</h3>
                      <p>{b.text}</p>
                    </div>
                  </li>
                ))}
              </ul>
            ) : null}
          </section>

          {/* ---------- limits ---------- */}
          <section id="limits" className={styles.section} aria-labelledby="limits-h">
            <div className="section-head">
              <h2 id="limits-h">Limits</h2>
            </div>
            <ul className={styles.limits}>
              <li>
                <strong>A build year is a clue, not a finding.</strong> Renovations, repairs and replacements change what a
                house has. Many houses have already had these things fixed.
              </li>
              <li>
                <strong>Code dates are not local dates.</strong> A model code or federal rule took effect on one date; states
                and towns often adopted it years later.
              </li>
              <li>
                <strong>Counts are rare.</strong> Most issues have no reliable figure for how many houses have them, and we say
                so.
              </li>
              <li>
                <strong>US houses only.</strong> Coverage runs from houses built in {MIN_YEAR} to {MAX_YEAR}. Apartments and
                commercial buildings follow different rules.
              </li>
              <li>
                <strong>Sources change.</strong> Links move and agencies revise guidance. Every quote is shown so you can check
                it against the page.
              </li>
              <li>
                <strong>Lifespans are typical ranges.</strong> &ldquo;What&rsquo;s due&rdquo; assumes the original part, and real
                life depends on climate, use and upkeep.
              </li>
              <li>
                <strong>&ldquo;Your place&rdquo; is about the area, not the house.</strong> An optional ZIP code brings in
                Census survey estimates of the homes there (2020&ndash;2024), plus county-level facts: EPA&rsquo;s 1993 radon
                zones, the 2015 DOE climate-zone table and FEMA&rsquo;s first flood-map dates. A ZIP can span counties (we show
                the main one), survey figures are estimates, and none of it says what this house has: test every home for
                radon. The ZIP stays on your device.
              </li>
            </ul>
          </section>

          {/* ---------- who ---------- */}
          <section id="who" className={styles.section} aria-labelledby="who-h">
            <div className="section-head">
              <h2 id="who-h">Who is behind this</h2>
            </div>
            <div className={styles.who}>
              <p>
                {SITE.name} is an independent project. It has no advertisers or sponsors, and no affiliation with any
                manufacturer, contractor, inspector or government agency. Nobody pays to be included or left out.
              </p>
              <p>
                The people behind it are not licensed home inspectors. {SITE.reviewStatus} That is why every claim links to
                its source and quotes it: you can check each one yourself.
              </p>
              <p>
                Spotted an error? See <Link href="/corrections">how corrections work</Link>. <Contact />
              </p>
            </div>
          </section>

          <aside className={styles.disclaimer} aria-label="Disclaimer">
            <p className={styles.disclaimerBig}>{SITE.disclaimer}</p>
            <p>
              Nothing here says what a particular house has. For anything involving gas, electrical, asbestos, lead or the
              structure, ask a licensed professional, and for a purchase, get a full inspection. The full{' '}
              <Link href="/terms">terms of use and disclaimer</Link> and the <Link href="/privacy">privacy page</Link> say
              more.
            </p>
          </aside>
        </div>
      </div>
    </article>
  );
}
