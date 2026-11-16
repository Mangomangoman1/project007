/** Site-wide constants. Rename the site here and nowhere else. */
export const SITE = {
  name: 'Year Built',
  tagline: 'What your house was built with',
  description:
    'Enter the year your house was built and see what US houses of that era typically contain, what to check first, and what is reaching the end of its life. Every claim is sourced.',
  disclaimer: 'A guide to what to look for. Not an inspection.',
  /**
   * Where readers report errors (shown on /corrections, /about and /privacy). null until the
   * address is decided: the pages then say one will be listed shortly. Set a string to show a mailto link.
   */
  contactEmail: null as string | null,
  /**
   * Review status, shown on /about under "Who is behind this". Update this one sentence when a
   * licensed inspector has reviewed the content.
   */
  reviewStatus:
    'The content has been compiled from the cited public sources and has not yet been reviewed by a licensed home inspector.',
  /** Date the privacy, terms and corrections pages were last changed (shown at the top of each). */
  policiesUpdated: 'November 16, 2026',
  /** Production origin, used for canonical URLs and OG images. */
  url: process.env.NEXT_PUBLIC_SITE_URL ?? 'https://yearbuilt.house',
} as const;

/** Page background per theme: theme-color meta, the web manifest and the app icons use these. */
export const THEME_COLORS = { light: '#f4efe4', dark: '#0f2b4b' } as const;

/** Earliest build year we generate a report for. */
export const MIN_YEAR = 1880;
/** Latest build year: the current year at build time (pages are static). */
export const MAX_YEAR = new Date().getFullYear();
/** Year the home page opens on before the visitor has picked one. */
export const DEFAULT_YEAR = 1972;

export const clampYear = (y: number) => Math.min(MAX_YEAR, Math.max(MIN_YEAR, Math.round(y)));
export const isValidYear = (y: number) => Number.isInteger(y) && y >= MIN_YEAR && y <= MAX_YEAR;

/** localStorage keys (all access goes through src/lib/storage.ts). */
export const STORAGE_KEYS = {
  theme: 'builtin:theme',
  year: 'builtin:year',
  state: 'builtin:state',
  replaced: (year: number) => `builtin:replaced:${year}`,
  /** { [lifespanId]: "2015" | "2010s" }: when the visitor says a part was last replaced. */
  lastReplaced: (year: number) => `builtin:last-replaced:${year}`,
  /** HouseProfile ("About your house"): shared by every year's report and checklist. */
  profile: 'builtin:profile',
  /** "1" while the About your house panel is open, so it stays open from year to year. */
  profileOpen: 'builtin:profile-open',
  /** "Your place": { zip: "83333", keep?: "OH" } (keep = state the visitor chose to keep over the ZIP's). */
  place: 'builtin:place',
} as const;
