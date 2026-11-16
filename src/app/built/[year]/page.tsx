import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { allYears, getIssuesForYear, getIssuesTimeline, getLifespans, getLifespansLite } from '@/lib/data';
import { MAX_YEAR, isValidYear } from '@/lib/site';
import { plural } from '@/lib/labels';
import { groupLifespans, isCore } from '@/lib/select';
import { pageMeta } from '@/lib/seo';
import { Report } from '@/components/report/Report';
import { toReportIssue } from '@/components/report/IssueRow';
import { CENSUS, CONSTRUCTION, STOCK, getCountrySlice, getEventsAround, getStockSlice } from '@/lib/era-data';
import { bandShort } from '@/lib/era';
import { hasTypical } from '@/lib/typical';
import { TYPICAL } from '@/components/typical/data';
import { AroundYear } from '@/components/timeline/AroundYear';
import { HousingThatYear } from '@/components/era/HousingThatYear';
import { EraToday } from '@/components/era/EraToday';
import { CountryDecade } from '@/components/era/CountryDecade';

export const dynamicParams = false;

export function generateStaticParams() {
  return allYears().map((y) => ({ year: String(y) }));
}

type Props = { params: Promise<{ year: string }> };

function parseYear(raw: string): number | null {
  const y = Number(raw);
  return /^\d{4}$/.test(raw) && isValidYear(y) ? y : null;
}

const listText = (xs: string[]) => (xs.length < 2 ? xs.join('') : `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`);

/**
 * The search-result description: the report's own headline finding and counts (same rules as
 * Report: lead issue, or for new houses the first parts to come due), never boilerplate.
 */
function yearDescription(year: number): string {
  const issues = getIssuesForYear(year);
  const age = MAX_YEAR - year;
  const first = issues.filter((i) => i.priority === 1).length;
  const missing = issues.filter((i) => i.kind === 'missing').length;
  const isNew = age <= 15 && issues.filter((i) => i.priority <= 2).length <= 2;
  const lead = issues[0];
  if (isNew || !lead) {
    const life = groupLifespans(getLifespans(), age);
    const dueNow = life.due.length;
    const firstDue = [...life.soon, ...life.later].slice(0, 3).map((f) => f.item.title.toLowerCase());
    const upkeep =
      dueNow > 0
        ? `${plural(dueNow, 'part')} ${dueNow === 1 ? 'is' : 'are'} already in ${dueNow === 1 ? 'its' : 'their'} replacement window.`
        : firstDue.length
          ? `First to come due: ${listText(firstDue)}.`
          : 'Nothing is due yet.';
    const onRecord = issues.length ? ` ${plural(issues.length, 'item')} on record still ${issues.length === 1 ? 'applies' : 'apply'}.` : '';
    return `Little is known to be wrong with US houses built in ${year}.${onRecord} ${upkeep}`;
  }
  const counts = [
    first ? `${first} to check first` : null,
    missing ? `${plural(missing, 'protection')} it was built without` : null,
    `what is due at ${plural(age, 'year')} old`,
  ].filter((c): c is string => c !== null);
  const head = `${year} house report. Headline: ${lead.title}`;
  const peak = isCore(lead, year) ? `, at its peak in ${year}` : '';
  const n = `${plural(issues.length, 'thing')} on record`;
  const all = `${counts.slice(0, -1).join(', ')}${counts.length > 1 ? ' and ' : ''}${counts[counts.length - 1]}`;
  const some = counts.length > 1 ? counts.slice(0, -1).join(' and ') : counts[0];
  // the longest version that still fits a search snippet
  const options = [`${head}${peak}. ${n}: ${all}.`, `${head}. ${n}: ${all}.`, `${head}. ${n}: ${some}.`];
  return options.find((o) => o.length <= 165) ?? options[options.length - 1];
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const year = parseYear((await params).year);
  if (year === null) return {};
  // image: null keeps this route's own opengraph-image
  return pageMeta({ title: `A house built in ${year}`, description: yearDescription(year), path: `/built/${year}`, image: null });
}

export default async function BuiltYearPage({ params }: Props) {
  const year = parseYear((await params).year);
  if (year === null) notFound();
  const pick = getEventsAround(year);
  const stock = getStockSlice(year);
  const country = getCountrySlice(year);
  const era = stock.ahsBand ?? stock.recsBand;
  const { recs, ahs } = STOCK.sources;
  const { census, acs, yb1950 } = CENSUS.sources;
  return (
    <Report
      year={year}
      issues={getIssuesForYear(year).map(toReportIssue)}
      lifespans={getLifespansLite()}
      timelineIssues={getIssuesTimeline()}
      context={{
        around: <AroundYear pick={pick} />,
        housing: <HousingThatYear year={year} data={CONSTRUCTION} />,
        today: (
          <EraToday
            slice={stock}
            pairedWithTypical={hasTypical(TYPICAL, year)}
            sources={{
              recs: { publisher: recs.publisher, title: recs.title, url: recs.url },
              ahs: { publisher: ahs.publisher, title: ahs.title, url: ahs.url, paper: ahs.paper },
            }}
          />
        ),
        country: (
          <CountryDecade
            slice={country}
            links={{ census: { publisher: census.publisher, title: census.title, pages: census.pages }, acs, yb1950 }}
          />
        ),
        nav: {
          around: pick.exact.length + pick.near.length + pick.ongoing.length,
          today: era ? `${bandShort(era)} houses today` : 'Houses of the era today',
          country: country.census ? `The country in ${country.census}` : 'The country today',
        },
      }}
    />
  );
}
