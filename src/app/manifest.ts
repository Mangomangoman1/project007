import type { MetadataRoute } from 'next';
import { SITE, THEME_COLORS } from '@/lib/site';

/**
 * Web app manifest (/manifest.webmanifest). A manifest has one theme_color, so it carries the
 * paper (light) colour; the theme-color metas in the root layout set both schemes for the browser UI.
 * Icons come from scripts/build-icons.mjs.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: SITE.name,
    short_name: SITE.name,
    description: SITE.description,
    start_url: '/',
    scope: '/',
    display: 'browser',
    lang: 'en-US',
    background_color: THEME_COLORS.light,
    theme_color: THEME_COLORS.light,
    icons: [
      { src: '/icon.svg', type: 'image/svg+xml', sizes: 'any' },
      { src: '/icons/icon-192.png', type: 'image/png', sizes: '192x192' },
      { src: '/icons/icon-512.png', type: 'image/png', sizes: '512x512' },
      { src: '/icons/icon-maskable-512.png', type: 'image/png', sizes: '512x512', purpose: 'maskable' },
    ],
  };
}
