import { SITE } from '@/lib/site';

/** Inline JSON-LD. `<` is escaped so copy can never close the script element. */
export function JsonLd({ data }: { data: Record<string, unknown> | Record<string, unknown>[] }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, '\\u003c') }}
    />
  );
}

/** Absolute URL on the production origin. */
export const absUrl = (path: string) => new URL(path, SITE.url).toString();

/** schema.org BreadcrumbList from [name, path] pairs. */
export function breadcrumbs(items: [string, string][]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map(([name, path], i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name,
      item: absUrl(path),
    })),
  };
}
