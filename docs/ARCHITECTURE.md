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
| `select.ts` (pure) | `appliesTo`, `isCore`, `inState`, `sortIssues` (priority → core → severity → title), `issuesForYear`, `groupByPart`, `bandRange`; lifespans: `lifeStanding(l, houseAge, {lastReplaced, currentYear})` → `{stage, age, known, by}` with stage `cycled/past/due/soon/later`, `groupLifespans(ls, age, {replaced, currentYear})`, `parseReplacedYear("2015" \| "2010s", buildYear, maxYear)`, `CYCLED_FACTOR` (1.5); legacy `lifeStatus` kept |
| `timeline.ts` (pure) | percent geometry: `pctOf`, `pctMid`, `yearAt`, `bandGeom`, `packRows`, `packLane` (open-start "missing" bands share one sub-lane), `tickLabels` (collision-free decade labels for a px/year), `pickBand` (hit test), `placeNote` (annotation clamped inside the plot), `decades`, `yearsLabel` ("1965–1973", "Built 1978 or earlier"), `coreLabel` |
| `labels.ts` | `CATEGORIES` (lane order), `EVIDENCE` (stamp text + long explanation), `PREVALENCE`, `SEVERITY`, `TIER`, `ZONE_LABEL`, `PARTS` (zone → "part of the house"), `STATES`, `plural()` |
| `storage.ts` | `readStore` / `writeStore` (localStorage, try/catch'd) |

## Components (`src/components`)
| component | props | notes |
|---|---|---|
| `Timeline` (client) | `issues: TimelineIssue[]` (IssueLite works; `evidence` optional), `year`, `onYearChange?`, `onCommit?`, `commitOnRelease?=true`, `state?`, `density?: 'compact'\|'comfortable'`, `min?`, `max?`, `label?`, `describe?(y)`, `crossings?` (default = interactive), `itemHref?(issue, year)` (default `/issue/<slug>`; `#…` renders a plain anchor), `crossingsCollapsible?` | The signature SVG. Lanes by category (HTML lane heads with "lit/total" sit above the year line), rows packed by `packLane`, all x in %, so SSR is final. Omit `onYearChange` for a static `role=img`. Slider: arrows ±1 (Shift ±10), PageUp/Down ±10, Home/End, Enter commits. Reading bands: mouse hover → drafting-style annotation (title, years, evidence, applies?); touch tap on a band pins it (with a link; tap again/elsewhere/Escape closes); tap on empty plot jumps the year; horizontal drag scrubs; vertical swipes scroll the page. Under the plot, "What the YEAR line crosses": per-lane links to each crossed band (the keyboard route: focus/hover highlights its band and shows its note). `crossingsCollapsible` starts it closed at ≤720px (still in the HTML). |
| `IssueBand` | `issue`, `year?`, `axis?`, `accent?=true`, `idPrefix?`, `min?`, `max?` | One issue on the 1880–today axis (22px, 36px with `axis`). Server-safe. Use for /issues mini-bands; pass `idPrefix` if one issue is drawn twice on a page. |
| `TimelineLegend` | `compact?` | Key: solid core, faded = approximate, sharp cap = legal/recall date, hatched = protection missing, red-oxide = check first. |
| `Stamps`: `EvidenceStamp {evidence, size?}`, `Prevalence {label, note?, showNote?}`, `TierTag {tier}`, `CheckFirstTag`, `RegionTag {regions}` | | Evidence: double rule = record, solid = rule, dashed = era. Prevalence = words + 3-dot meter. |
| `YearInput` (client) | `year`, `onChange`, `onSubmit?`, `id?`, `label?` | The huge Fraunces numeral input with steppers and an age dimension line. |
| `HomeExplorer` (client) | `issues: IssueLite[]` | Home hero + timeline + preview; remembers last year. |
| `report/Report` (client) | `year`, `issues: ReportIssue[]`, `lifespans`, `timelineIssues` | Whole report; state filter client-side; new-house mode (age ≤ 15 and ≤ 2 priority-1/2 issues) leads with What's due. Headline = lead title + years in display type, hook as standfirst, lead band (or "first to come due" list for new houses) on the right, "Print the viewing checklist" link (also in the navigator). Timeline crossings link to `#i-<slug>`; opening a `#i-` hash (load or hashchange) opens that row. Section navigator: sticky sidebar on desktop, sticky strip at ≤1000px (sets `--report-sticky` for scroll margins) with the current section marked. "Expand all/Collapse all" per long section (JS only). By part of the house: `<HouseCutaway counts size="lg">` beside a part index (the figure column collapses via `:has(figure:empty)` if the drawing renders nothing). |
| `report/IssueRow` | `issue: ReportIssue`, `year`, `index?`, `open?`, `variant?: 'full'\|'compact'` | full (check first): always-visible title/hook/band, "How to check" disclosed. compact (built without, by part): one native `<details data-row>` row (title, years, one clamped line, mini band) expanding in place to hook, band + evidence, check steps with `<HouseCutaway zones size="sm">`, action, notes. Works without JS. `toReportIssue(issue)` strips sources to counts. Anchors: `#i-<slug>`. |
| `report/LifespanList` (client) | `lifespans`, `year`, `age` | Honest "What's due": open groups due → past (plausibly original) → soon on a shared age axis; parts whose life is < house age / 1.5 fold into "Replaced at least once by now: find out when". Every part takes a "last replaced" year or decade (saved on Enter/blur in `localStorage[builtin:last-replaced:<year>]` as `{id: "2015"}`); a dated part is judged by its own age (diamond marker). Counters: due now, past if original, due within 5 yrs, replaced by now. |
| `SiteHeader`, `SiteFooter`, `ThemeToggle`, `LogoMark` | | Footer is a title block; shows a note when built on sample content. |

## Routes
- `/` (`src/app/page.tsx`), `/built/[year]` (1880..MAX_YEAR, `dynamicParams=false`).
- Tests: `src/lib/select.test.ts` (selection + life stages + replaced-year parsing), `src/lib/timeline.test.ts` (packing, tick labels, hit test, note placement). `src/lib/timeline.ts` imports `./select.ts` with the extension so Node can run it.
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

## Issue pages, index, about, SEO (builder 2)
Routes:
- `/issue/[slug]` (`src/app/issue/[slug]/page.tsx`): title block (kicker, title, hook; cells for years,
  evidence, prevalence, priority, severity, zones), sticky "On this page" toc, then What it is (+ "how
  sure / how common"), The years (`YearsDiagram` + start / most likely / end cells + legend; regional
  and "year predicts poorly" notes), How to check (numbered steps beside `<HouseCutaway size="md">`;
  a "where to look" list shows only while the cutaway renders empty), What to do + caveat box,
  Sources (publisher, `TierTag`, verbatim quote, link), "Applies to houses built" year tiles
  (→ `/built/[year]`), Related. JSON-LD: BreadcrumbList + Article (citations = sources).
- `/issues` (`src/app/issues/page.tsx`): title block with counts, legend, `IssueIndex`.
- `/about` (`src/app/about/page.tsx`): method steps, label tables (stamps + counts), how years/edges
  work (`YearsDiagram` example), what is left out (buckets computed at build time from the `reason`
  field of `content/editorial.json`; falls back to meta counts if the file is absent), limits,
  disclaimer. All numbers from `getMeta()` / data.
- `sitemap.ts` (home, issues, about, every `/built/Y`, every issue, every `/checklist/Y`), `robots.ts`.
- OG images (next/og, static): `src/app/opengraph-image.tsx`, `src/app/built/[year]/opengraph-image.tsx`,
  `src/app/issue/[slug]/opengraph-image.tsx`. ~230 images add ~25 s to the build.

Components:
| file | what |
|---|---|
| `issue/issueText.ts` (pure) | `kindLabel`, `PRIORITY_LABEL`, `partOf`, `rangeSentence`, `coreSentence`, `edgeNotes` (start/core/end wording, "missing" aware), `representativeYears`, `relatedIssues` (same part / shared zones / overlapping years), `shortUrl`, `prevalenceNote` (tidies notes that repeat "No reliable count exists.") |
| `issue/YearsDiagram` | `IssueBand` (axis) with an architectural dimension line above (ticks for dated ends, arrows for open ends, ≈ for approximate) and decade labels. Decorative (`aria-hidden`); state years in text beside it. |
| `issue/IssueLine` | One ruled row: title (link stretched over the row), check-first / built-without / region tags, years label + mini `IssueBand`, evidence stamp. `IssueLineScale` = decade labels aligned with the band column. Server-safe; also used inside the client index. |
| `issue/IssueIndex` (client) | Grouped list (by `PARTS`, `#part-<id>` anchors) with filters: part chips (with live counts), "Check first only", text search (title, hook, category, zones, years). Syncs to `?part=&first=1&q=`. Filter bar hidden without JS (`html:not(.js)`), so no-JS is the full grouped list. |
| `seo/JsonLd` | `<JsonLd data>` (escapes `<`), `absUrl`, `breadcrumbs([[name, path]...])`. |
| `seo/og.tsx` | OG fonts + shared drawing: `ogOptions()`, `OgFrame` (grid paper, title-block border, footer), `OgBand`, `OgScale`, `OgTimeline` (every band in packed rows, lit at a year). |
| `seo/woff2.ts` | WOFF2 → TTF decoder with gvar instancing. Satori cannot read WOFF2 and Fontsource ships Fraunces only as a WOFF2 variable font, so the OG routes decode it from node_modules at build time (wght 330 / opsz 144 for numerals, 380 / 96 for headings). Plex Sans/Mono are read from their `.woff` files. No network. |
