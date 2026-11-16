import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { allYears, getIssuesForYear, getIssuesLite, getLifespans } from '@/lib/data';
import { MAX_YEAR, SITE, isValidYear } from '@/lib/site';
import { plural } from '@/lib/labels';
import { Report } from '@/components/report/Report';
import { toReportIssue } from '@/components/report/IssueRow';

export const dynamicParams = false;

export function generateStaticParams() {
  return allYears().map((y) => ({ year: String(y) }));
}

type Props = { params: Promise<{ year: string }> };

function parseYear(raw: string): number | null {
  const y = Number(raw);
  return /^\d{4}$/.test(raw) && isValidYear(y) ? y : null;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const year = parseYear((await params).year);
  if (year === null) return {};
  const issues = getIssuesForYear(year);
  const first = issues.filter((i) => i.priority === 1).length;
  return {
    title: `A house built in ${year}`,
    description: `${plural(issues.length, 'thing')} to know about a US house built in ${year}, ${first} to check first, and what is due at ${MAX_YEAR - year} years old. ${SITE.disclaimer}`,
    alternates: { canonical: `/built/${year}` },
  };
}

export default async function BuiltYearPage({ params }: Props) {
  const year = parseYear((await params).year);
  if (year === null) notFound();
  return (
    <Report
      year={year}
      issues={getIssuesForYear(year).map(toReportIssue)}
      lifespans={getLifespans()}
      timelineIssues={getIssuesLite()}
    />
  );
}
