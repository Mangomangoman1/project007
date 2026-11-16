/**
 * Self-hosted fonts through next/font/local, read straight from the Fontsource packages (no
 * network at build time). next/font hashes and serves the files, sets `font-display: swap`,
 * generates a metric-matched fallback face (less layout shift when the real face arrives) and
 * preloads only what is marked `preload`: the faces that paint above the fold on every page
 * (the Fraunces numerals and headings, Plex Sans body text, Plex Mono labels).
 * The family names are kept as before, so CSS and the printed page footer can name them; the
 * fallback faces are named after these exports ('fraunces Fallback', 'plexSans Fallback',
 * 'plexMono Fallback') and listed second in the --font-* tokens in globals.css. Imported for its
 * side effect (the @font-face rules and preload links) by the root layout.
 * Latin subset only: every page is US English. (Options must be literals: the loader reads them at build time.)
 */
import localFont from 'next/font/local';

export const fraunces = localFont({
  src: '../../node_modules/@fontsource-variable/fraunces/files/fraunces-latin-full-normal.woff2',
  weight: '100 900',
  style: 'normal',
  display: 'swap',
  adjustFontFallback: 'Times New Roman',
  declarations: [{ prop: 'font-family', value: 'Fraunces Variable' }],
});

/** Only the footer note is set in Fraunces italic: wght + opsz is all it uses (not SOFT/WONK). */
export const frauncesItalic = localFont({
  src: '../../node_modules/@fontsource-variable/fraunces/files/fraunces-latin-standard-italic.woff2',
  weight: '100 900',
  style: 'italic',
  display: 'swap',
  preload: false,
  adjustFontFallback: 'Times New Roman',
  declarations: [{ prop: 'font-family', value: 'Fraunces Variable' }],
});

export const plexSans = localFont({
  src: [{ path: '../../node_modules/@fontsource/ibm-plex-sans/files/ibm-plex-sans-latin-400-normal.woff2', weight: '400', style: 'normal' }],
  display: 'swap',
  declarations: [{ prop: 'font-family', value: 'IBM Plex Sans' }],
});

export const plexSansMore = localFont({
  src: [
    { path: '../../node_modules/@fontsource/ibm-plex-sans/files/ibm-plex-sans-latin-400-italic.woff2', weight: '400', style: 'italic' },
    { path: '../../node_modules/@fontsource/ibm-plex-sans/files/ibm-plex-sans-latin-500-normal.woff2', weight: '500', style: 'normal' },
    { path: '../../node_modules/@fontsource/ibm-plex-sans/files/ibm-plex-sans-latin-600-normal.woff2', weight: '600', style: 'normal' },
  ],
  display: 'swap',
  preload: false,
  declarations: [{ prop: 'font-family', value: 'IBM Plex Sans' }],
});

export const plexMono = localFont({
  src: [{ path: '../../node_modules/@fontsource/ibm-plex-mono/files/ibm-plex-mono-latin-400-normal.woff2', weight: '400', style: 'normal' }],
  display: 'swap',
  declarations: [{ prop: 'font-family', value: 'IBM Plex Mono' }],
});

export const plexMonoMore = localFont({
  src: [{ path: '../../node_modules/@fontsource/ibm-plex-mono/files/ibm-plex-mono-latin-500-normal.woff2', weight: '500', style: 'normal' }],
  display: 'swap',
  preload: false,
  declarations: [{ prop: 'font-family', value: 'IBM Plex Mono' }],
});
