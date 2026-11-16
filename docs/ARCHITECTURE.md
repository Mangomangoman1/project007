# Built In: front-end architecture

Next.js 16 (App Router, TypeScript, `src/`), plain CSS (global tokens + CSS Modules), fonts from
Fontsource (imported in `src/app/layout.tsx`). Everything is statically generated.

```
npm run dev | build     # both run scripts/build-data.mjs first (predev/prebuild)
npm run data            # rebuild src/data/*.json only
npm run lint | typecheck | test   # test = node --test on src/lib/*.test.ts
```

## Data pipeline: `scripts/build-data.mjs`
Reads `research/*.json` (electrical, plumbing, hazmat, envelope, hvac-safety-lifespans,
structure-regional, newer-homes if present), `content/editorial.json` and `content/lifespans.json`
(falling back to `content/sample-*.json` if a real file is missing). Writes:
- `src/data/issues.json`: `Issue[]` (spec types), only `include: true` entries. Sources are the
  research entry's `verified: true` sources → `{url, publisher, tier (default "reference"), quote}`,
  primary first. Editorial may add `researchIds: []` to merge sources from more entries.
- `src/data/lifespans.json`: `Lifespan[]`, sorted by `lifeLow`. Inline `sources` or `researchId`.
- `src/data/meta.json`: counts plus `sample: true|false`.
It exits 1 and lists every problem (no verified source, bad Zone, bad state code, duplicate slug,
bad years...). The generated JSON is committed so lint/typecheck work without a build.

## Library (`src/lib`)
| file | what |
|---|---|
| `types.ts` | `Issue`, `Lifespan`, `Zone`, `Category`, `Source`, `DataMeta` |
| `site.ts` | `SITE` (name, tagline, disclaimer, url: **rename the site here**), `MIN_YEAR` 1880, `MAX_YEAR` (build year), `DEFAULT_YEAR`, `clampYear`, `isValidYear`, `STORAGE_KEYS` |
| `data.ts` (server) | `getIssues()`, `getIssue(slug)`, `getIssuesForYear(year, state?)`, `getLifespans()`, `getMeta()`, `allYears()`, `IssueLite` + `getIssuesLite()`/`toLite()` (small payload for client components) |
| `select.ts` (pure) | `appliesTo`, `isCore`, `inState`, `sortIssues` (priority → core → severity → title), `issuesForYear`, `groupByPart`, `lifeStatus(l, age)` → `past/due/soon/later`, `bandRange` |
| `timeline.ts` (pure) | percent geometry: `pctOf`, `pctMid`, `yearAt`, `bandGeom`, `packRows`, `decades`, `yearsLabel` ("1965–1973", "Built 1978 or earlier"), `coreLabel` |
| `labels.ts` | `CATEGORIES` (lane order), `EVIDENCE` (stamp text + long explanation), `PREVALENCE`, `SEVERITY`, `TIER`, `ZONE_LABEL`, `PARTS` (zone → "part of the house"), `STATES`, `plural()` |
| `storage.ts` | `readStore` / `writeStore` (localStorage, try/catch'd) |

## Components (`src/components`)
| component | props | notes |
|---|---|---|
| `Timeline` (client) | `issues: TimelineIssue[]` (IssueLite works), `year`, `onYearChange?`, `onCommit?`, `commitOnRelease?=true`, `state?`, `density?: 'compact'\|'comfortable'`, `min?`, `max?`, `label?`, `describe?(y)` | The signature SVG. Lanes by category, greedy-packed rows, all x in %, so SSR is final. Omit `onYearChange` for a static `role=img`. Slider: arrows ±1 (Shift ±10), PageUp/Down ±10, Home/End, Enter commits. Touch scrubs only on horizontal drag. |
| `IssueBand` | `issue`, `year?`, `axis?`, `accent?=true`, `idPrefix?`, `min?`, `max?` | One issue on the 1880–today axis (22px, 36px with `axis`). Server-safe. Use for /issues mini-bands; pass `idPrefix` if one issue is drawn twice on a page. |
| `TimelineLegend` | `compact?` | Key: solid core, faded = approximate, sharp cap = legal/recall date, hatched = protection missing, red-oxide = check first. |
| `Stamps`: `EvidenceStamp {evidence, size?}`, `Prevalence {label, note?, showNote?}`, `TierTag {tier}`, `CheckFirstTag`, `RegionTag {regions}` | | Evidence: double rule = record, solid = rule, dashed = era. Prevalence = words + 3-dot meter. |
| `YearInput` (client) | `year`, `onChange`, `onSubmit?`, `id?`, `label?` | The huge Fraunces numeral input with steppers and an age dimension line. |
| `HomeExplorer` (client) | `issues: IssueLite[]` | Home hero + timeline + preview; remembers last year. |
| `report/Report` (client) | `year`, `issues: ReportIssue[]`, `lifespans`, `timelineIssues` | Whole report; state filter client-side; new-house mode (age ≤ 15 and ≤ 2 priority-1/2 issues) leads with What's due. |
| `report/IssueRow` | `issue: ReportIssue`, `year`, `index?`, `open?` | `toReportIssue(issue)` strips sources to counts. Anchors: `#i-<slug>`. |
| `report/LifespanList` (client) | `lifespans`, `year`, `age`, `pastVisible?` | Ranges on a shared age axis; "replaced" ticks in `localStorage[builtin:replaced:<year>]`. |
| `SiteHeader`, `SiteFooter`, `ThemeToggle`, `LogoMark` | | Footer is a title block; shows a note when built on sample content. |

## Routes
- `/` (`src/app/page.tsx`), `/built/[year]` (1880..MAX_YEAR, `dynamicParams=false`).
- `/issue/[slug]`: **placeholder** (summary, band, check, sources with quotes). To be replaced,
  along with `/issues`, `/checklist/[year]` (the report links to it), `/about` (header/footer link
  to it), the house cutaway, OG images, sitemap/robots.

## Design tokens (`src/app/globals.css`)
- Colour (both themes): `--paper --paper-2 --paper-3 --ink --ink-2 --ink-3 --line --line-2 --rule
  --rule-strong --grid --grid-major --accent` (red-oxide: check first ONLY) `--accent-wash --focus
  --band --band-lit`. Light = drafting paper; dark = blueprint, via `prefers-color-scheme` or
  `html[data-theme]` (set before paint by the inline script in `layout.tsx`; toggle stores
  `builtin:theme`). `html.js` is present when JS runs.
- Type: `--font-display` (Fraunces Variable), `--font-sans` (Plex Sans), `--font-mono` (Plex Mono);
  sizes `--t-2xs … --t-2xl`, `--t-hero`. Spacing `--s-1 … --s-10` (4px base). Layout `--page-max`,
  `--measure`, `--gutter` (16px on phones). Motion `--ease --dur-fast --dur --dur-slow` (reduced
  motion honoured globally).
- Utility classes: `.wrap` (page container), `.measure`, `.label` (mono caps), `.numeral`
  (Fraunces lining figures), `.lede`, `.section-head` (heading with dimension-line rule),
  `.btn` / `.btn--ghost`, `.select`, `.check` (drafting checkbox), `.grid-paper`, `.visually-hidden`.
