import type { MetadataRoute } from 'next';
import { allYears, getIssues } from '@/lib/data';
import { SITE } from '@/lib/site';

const abs = (path: string) => new URL(path, SITE.url).toString();

/**
 * Every indexable route: home, the issue index, about and the trust pages, each year report and
 * each issue. The printable /checklist/[year] pages are deliberately absent: they repeat their
 * year's report and are noindex, follow.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();
  const years = allYears();
  return [
    { url: abs('/'), lastModified, changeFrequency: 'monthly', priority: 1 },
    { url: abs('/issues'), lastModified, changeFrequency: 'monthly', priority: 0.8 },
    { url: abs('/about'), lastModified, changeFrequency: 'yearly', priority: 0.5 },
    { url: abs('/corrections'), lastModified, changeFrequency: 'monthly', priority: 0.3 },
    { url: abs('/privacy'), lastModified, changeFrequency: 'yearly', priority: 0.2 },
    { url: abs('/terms'), lastModified, changeFrequency: 'yearly', priority: 0.2 },
    ...years.map((y) => ({ url: abs(`/built/${y}`), lastModified, changeFrequency: 'yearly' as const, priority: 0.7 })),
    ...getIssues().map((i) => ({ url: abs(`/issue/${i.slug}`), lastModified, changeFrequency: 'yearly' as const, priority: 0.6 })),
  ];
}
