import type { MetadataRoute } from 'next';
import { allYears, getIssues } from '@/lib/data';
import { SITE } from '@/lib/site';

const abs = (path: string) => new URL(path, SITE.url).toString();

/** Every static route: home, about, issues index, each year report and checklist, each issue. */
export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();
  const years = allYears();
  return [
    { url: abs('/'), lastModified, changeFrequency: 'monthly', priority: 1 },
    { url: abs('/issues'), lastModified, changeFrequency: 'monthly', priority: 0.8 },
    { url: abs('/about'), lastModified, changeFrequency: 'yearly', priority: 0.5 },
    ...years.map((y) => ({ url: abs(`/built/${y}`), lastModified, changeFrequency: 'yearly' as const, priority: 0.7 })),
    ...getIssues().map((i) => ({ url: abs(`/issue/${i.slug}`), lastModified, changeFrequency: 'yearly' as const, priority: 0.6 })),
    ...years.map((y) => ({ url: abs(`/checklist/${y}`), lastModified, changeFrequency: 'yearly' as const, priority: 0.3 })),
  ];
}
