/**
 * Per-page metadata in one shape, so every indexable page gets the same set: title, a description
 * written for a search result, a canonical URL, Open Graph and a large Twitter card.
 *
 * Next merges metadata shallowly: a page that sets `openGraph` replaces the layout's whole
 * `openGraph` (and loses an inherited file-based image), so pages pass their image here, and
 * `robots` set on a page replaces the layout's. That is why the preview rule lives in
 * `robotsFor()` and every page that sets robots goes through it.
 */
import type { Metadata } from 'next';
import { SITE } from './site';

/**
 * Vercel sets VERCEL_ENV to "production", "preview" or "development" (at build and run time). Any
 * Vercel build that is not production is noindex everywhere, so preview URLs never reach an index.
 * Off Vercel (local builds, other hosts) VERCEL_ENV is unset and the site is indexable as usual.
 */
const ON_VERCEL = Boolean(process.env.VERCEL_ENV);
/**
 * Vercel also sets VERCEL_PROJECT_PRODUCTION_URL to the project's production domain (no scheme).
 * Until the real domain is attached that is a *.vercel.app address: a production build served
 * there is kept out of search indexes too, and becomes indexable by itself once the project's
 * production domain is the site's own (SITE.url).
 */
const SITE_HOST = new URL(SITE.url).host;
const PRODUCTION_HOST = (process.env.VERCEL_PROJECT_PRODUCTION_URL ?? '').replace(/^www\./, '');
const ON_WRONG_DOMAIN = ON_VERCEL && PRODUCTION_HOST !== '' && PRODUCTION_HOST !== SITE_HOST;
export const IS_NON_PRODUCTION_DEPLOY = (ON_VERCEL && process.env.VERCEL_ENV !== 'production') || ON_WRONG_DOMAIN;

/** robots for a page: indexable pages index + follow; utility pages (the printable checklists) noindex, follow. */
export function robotsFor(indexable = true): NonNullable<Metadata['robots']> {
  if (IS_NON_PRODUCTION_DEPLOY) return { index: false, follow: false };
  return indexable ? { index: true, follow: true } : { index: false, follow: true };
}

/** The site-wide share image (src/app/opengraph-image.tsx). */
export const SITE_OG_IMAGE = { url: '/opengraph-image', width: 1200, height: 630, alt: `${SITE.name}: ${SITE.tagline}` };

type PageMetaInput = {
  /** Page title; the layout template appends " · Year Built". */
  title: string;
  /** Title for share cards (defaults to `title`). */
  shareTitle?: string;
  description: string;
  /** Path from the site root, e.g. "/privacy". Used for the canonical and og:url. */
  path: string;
  type?: 'website' | 'article';
  /**
   * Share image. Omit on routes that have their own opengraph-image file (Next adds it); pass
   * SITE_OG_IMAGE (the default here) for pages that would otherwise lose the site image.
   */
  image?: { url: string; width: number; height: number; alt: string } | null;
  /** false = noindex, follow (still canonical to itself). */
  indexable?: boolean;
};

export function pageMeta({ title, shareTitle, description, path, type = 'website', image = SITE_OG_IMAGE, indexable = true }: PageMetaInput): Metadata {
  const t = shareTitle ?? title;
  return {
    title,
    description,
    alternates: { canonical: path },
    robots: robotsFor(indexable),
    openGraph: {
      type,
      title: t,
      description,
      url: path,
      siteName: SITE.name,
      locale: 'en_US',
      ...(image ? { images: [image] } : {}),
    },
    twitter: {
      card: 'summary_large_image',
      title: t,
      description,
      ...(image ? { images: [image] } : {}),
    },
  };
}
