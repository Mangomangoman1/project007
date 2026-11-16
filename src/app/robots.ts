import type { MetadataRoute } from 'next';
import { SITE } from '@/lib/site';
import { IS_NON_PRODUCTION_DEPLOY } from '@/lib/seo';

/**
 * Crawling is allowed everywhere, so crawlers can read each page's robots meta. In production the
 * file points at the sitemap. On Vercel preview builds every page carries noindex (robotsFor in
 * src/lib/seo.ts) and the sitemap line is left out, so nothing invites a crawler in.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: '*', allow: '/' },
    ...(IS_NON_PRODUCTION_DEPLOY ? {} : { sitemap: new URL('/sitemap.xml', SITE.url).toString() }),
  };
}
