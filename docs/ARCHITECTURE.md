# Year Built: front-end architecture

Next.js 16 (App Router, TypeScript, `src/`), plain CSS (global tokens + CSS Modules), fonts from the
Fontsource packages loaded through `next/font/local` (`src/app/fonts.ts`). Everything is statically generated.

```
npm run dev | build     # both run scripts/build-data.mjs then scripts/build-era.mjs first (predev/prebuild)
npm run data            # rebuild src/data/*.json only (issues, lifespans, era files)
npm run data:era        # rebuild only the era files
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
Issues and lifespans may carry `when` (house profile, v1.1): validated by `validateWhen` imported
straight from `src/lib/profile.ts` (Node strips the types, so the vocabulary has one source), and
passed through in canonical attribute order; meta gains `conditionalIssueCount`/`conditionalLifespanCount`.
It exits 1 and lists every problem (no verified source, bad Zone, bad state code, duplicate slug,
bad years, unknown `when` attribute or value...). The generated JSON is committed so lint/typecheck work without a build.

## Era data: `scripts/build-era.mjs` ("The year in context")
Runs after build-data (it reads `src/data/issues.json` to check issue links). Reads `research/timeline.json` and
`research/era-data/*.json` and writes four compact files; the app never reads `research/` at runtime.
- `src/data/era-events.json` (~99 KB): the 150 timeline events with verified sources only (primary first, `tier`
  and `quote` kept). `EVENT_ISSUE` maps 35 events to the issue they are about (`issue`, `issueTitle`): the strip links
  there instead of repeating the text. Fails on an unknown slug, a bad year/precision/category/tier or an event with
  no verified source.
- `src/data/era-construction.json` (~5 KB): `starts[]` (thousands, 1889 on; Historical Statistics N 156 to 1958,
  Census NRC private starts from `nrcFrom` = 1959, checked), `medianPrice` (1963 on), `avgCost` (1889-1970),
  `oneFamily`, Historical Statistics decade totals (1890s-1940s), series-break and field notes, sources.
- `src/data/era-stock.json` (~38 KB): single-family detached shares by era band, US + 4 regions. `STOCK_VARS` maps
  survey categories to display categories (sums of weighted shares are exact): RECS 2020 for roof, walls, window
  glass and stories; AHS 2023 for foundation, heating fuel and equipment, cooling, bathrooms, fireplace, size,
  garage. Stories come from RECS because the AHS 2023 STORIES tabulation has no "4 or more" anywhere and puts 58% of
  pre-1920 houses at "3 stories" (likely counting basements), which RECS does not support. Bands with n < 30 are
  null. Every source category must be mapped and every row must add to 100 ± 1.5, or the script fails.
- `src/data/era-census.json` (~50 KB): decennial census rows 1940-2000 for the US, 50 states and DC (plumbing,
  no flush toilet, sewer, water, heating fuels), homeownership 1900-2000, ACS 2020-2024 B25034 counts/shares by
  decade built (oldest first) + median year built, the 1950 census year-built table (US + regions), notes, sources.

## Census data prep: `scripts/data-prep/typical_house.py` (typical new house)
`npm run data:typical` (= `python3 scripts/data-prep/typical_house.py [--refresh]`). Needs Python 3.9+,
`xlrd`, `curl`, `pdftotext`. Downloads the Census Survey of Construction "Characteristics of New Housing"
tables (houses COMPLETED, Total sheet: foundation, exterior wall, heating fuel, heating system, AC,
stories, parking, bedrooms, bathrooms, fireplaces, square feet) with plain `curl -sL` into the gitignored
`scripts/data-prep/.cache/`, plus the 2008 annual report PDF for stories 1973–2008 (pp. 451–457, old
scheme 1 / 2+ / split-level). Writes the committed `src/data/typical-house.json` (~52 KB): per
characteristic `cats` (with `from`/`to` for categories that start or stop, `relabel` when a category's
contents change, e.g. "Other, incl. vinyl" before 1992, "Oil or other" from 2014), `data[geo][year-from]`
= cells aligned to `cats`, with Census marks kept verbatim (`"NA"` not published, `"S"`/`"A"` withheld,
`"Z"` < 0.5%); `sources` (table title, file, URL, years); `completed` (thousands); `sqft` median/average;
`notes` (universe, pre-1999 3.3% adjustment, slab-or-other, vinyl 1992, fiber cement 2005, oil 2014,
heat pump 1978, stories break 2009, garage 3+ 1992, baths 2½+ through 1986, sampling); `corrections`
(six published percent cells that contradict their own row's counts are replaced by the count-derived
share and listed). The script checks every header, that `NA` appears only outside a category's years,
regional counts add to the US, rows add to ~100, the PDF totals match the XLS, and 36 figures from
`research/feasibility-typical-house.md` (e.g. 1987 South: slab or other 56, crawl 25, basement 20, AC 92,
median 1,755 sq ft); it exits 1 on any mismatch. The site build never touches the network.

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
| `profile.ts` (pure, import-free) | House profile, the single source of truth: `HouseProfile`, `When`, `PROFILE_KEYS`, `PROFILE_QUESTIONS` (question, name, chips: `label`, `fact` for "Hidden because: …", optional out-of-context `summary`), `PROFILE_GROUPS` (the building / its systems / its services), `matchesProfile` (spec rule: every listed attribute unset or allowed), `profileConflicts`, `hiddenReason` ("no gas", "furnace heat and no gas"), `splitByProfile`, `setAnswer`, `answeredCount`, `sanitizeProfile` (stored data), `validateWhen` (used by build-data). Tests: `profile.test.ts`. `types.ts` re-exports `HouseProfile`/`When`; `Issue.when?`, `Lifespan.when?`; `IssueLite` carries `when`. `STORAGE_KEYS.profile` = `builtin:profile` (shared by all years), `profileOpen`. |
| `regions.ts` (pure) | Census regions: `REGIONS` (states per region, DC in the South), `GeoId` (`US`/`NE`/`MW`/`S`/`W`), `GEO_LABEL`, `regionOfState(code)`, `geoPhrase` ("in the South" / "across the US"). |
| `era.ts` (pure; data passed in; tests `era.test.ts`) | Events: `eventsAround(data, year)` → `{exact, near, ongoing, window, widened}` (the year's own events; the nearest dated events and short ranges, window 3 years widening to 12 until there are 4 dated events, at most 6; ranges ≤ 20 years only as neighbors; up to 3 ongoing ranges, narrowest first; 4 to 8 events for every year), `eventDistance`, `eventYears` ("c. 1950–1969"), `aroundAxis`, `stackMarks` (keynote levels). Construction: `startsIn`, `isEstimate` (< 1959), `homesWords` (2 significant figures for estimates, 3 after: "about 2 million", "about 1.62 million"), `startsComparison` (record / fewest / "more than in any earlier year" / "the most since 1925" / vs the long-run median, plus the change on the year before; all computed), `startsSentence`, `startsLandmarks` (lows and peaks found in eras, not typed), `medianPriceIn`, `avgCostIn`, `oneFamilyIn`, `decadeTotals`. Stock: `recsBand`, `ahsBand`, `bandPhrase`/`builtPhrase`/`bandShort`, `stockSlice(data, year)` (one band per variable, every geo, the lead category across bands), `usable` (n ≥ 30), `SMALL_N` 100, `sharePct`, `shareWords` ("about 4 in 5"), `stockYours(profile)` (roof, walls, foundation, stories, heating, cooling, chimney↔fireplace). Census: `nearestCensus` (1940 for earlier years, nearest decade to 2000, null after 2005), `ownershipYear`, `acsBin`, `yb1950Band`, `mainFuels`, `countrySlice(data, year)` (that census year's rows for the US and every state, ACS bin and median year built, 1950 band), `countWords`. |
| `era-data.ts` (server only) | Imports the four era JSON files; `getEventsAround`, `getStockSlice`, `getCountrySlice`; `CONSTRUCTION`, `STOCK`, `CENSUS`. Never import it from a client component. |
| `typical.ts` (pure; data passed in) | Types for `typical-house.json`; `hasTypical`, `typicalFor(data, year, geo)` → `{completed, sqft, chars: CharRecord[] (shares present that year, withheld points, lead, close runner-up, sources, notes that apply, breaks), notes}`; `catSeries` / `sqftSeries` (over-time lines), `charBreaks`, `summarize` ("Most often: one story, on a slab or other foundation, wood or brick outside, electric heat and air-conditioning."; each part is that characteristic's own most common category, two when within 3 points), `yoursFor(record, profile)` (only answers whose categories line up: foundation, walls with caveats, heating system, cooling, floors, chimney↔fireplaces; withheld → `share: null`), `pct`. Tests: `typical.test.ts`. |

## Components (`src/components`)
| component | props | notes |
|---|---|---|
| `Timeline` (client) | `issues: TimelineIssue[]` (IssueLite works; `evidence` optional), `year`, `onYearChange?`, `onCommit?`, `commitOnRelease?=true`, `state?`, `density?: 'compact'\|'comfortable'`, `min?`, `max?`, `label?`, `describe?(y)`, `crossings?` (default = interactive), `itemHref?(issue, year)` (default `/issue/<slug>`; `#…` renders a plain anchor), `crossingsCollapsible?` | The signature SVG. Lanes by category (HTML lane heads with "lit/total" sit above the year line), rows packed by `packLane`, all x in %, so SSR is final. Omit `onYearChange` for a static `role=img`. Slider: arrows ±1 (Shift ±10), PageUp/Down ±10, Home/End, Enter commits. Reading bands: mouse hover → drafting-style annotation (title, years, evidence, applies?); touch tap on a band pins it (with a link; tap again/elsewhere/Escape closes); tap on empty plot jumps the year; horizontal drag scrubs; vertical swipes scroll the page. Under the plot, "What the YEAR line crosses": per-lane links to each crossed band (the keyboard route: focus/hover highlights its band and shows its note). `crossingsCollapsible` starts it closed at ≤720px (still in the HTML). |
| `IssueBand` | `issue`, `year?`, `axis?`, `accent?=true`, `idPrefix?`, `min?`, `max?` | One issue on the 1880–today axis (22px, 36px with `axis`). Server-safe. Use for /issues mini-bands; pass `idPrefix` if one issue is drawn twice on a page. |
| `TimelineLegend` | `compact?` | Key: solid core, faded = approximate, sharp cap = legal/recall date, hatched = protection missing, red-oxide = check first. |
| `Stamps`: `EvidenceStamp {evidence, size?}`, `Prevalence {label, note?, showNote?}`, `TierTag {tier}`, `CheckFirstTag`, `RegionTag {regions}` | | Evidence: double rule = record, solid = rule, dashed = era. Prevalence = words + 3-dot meter. |
| `YearInput` (client) | `year`, `onChange`, `onSubmit?`, `id?`, `label?` | The huge Fraunces numeral input with steppers and an age dimension line. |
| `HomeExplorer` (client) | `issues: IssueLite[]` | Home hero + timeline + preview; remembers last year. |
| `report/Report` (client) | `year`, `issues: ReportIssue[]`, `lifespans`, `timelineIssues`, `context?: YearContext` (`around`, `housing`, `today`, `country` slots rendered by the page + navigator labels) | Whole report; state filter client-side; new-house mode (age ≤ 15 and ≤ 2 priority-1/2 issues) leads with What's due. Headline = lead title + years in display type, hook as standfirst, lead band (or "first to come due" list for new houses) on the right, "Print the viewing checklist" link (also in the navigator). Timeline crossings link to `#i-<slug>`; opening a `#i-` hash (load or hashchange) opens that row. Section navigator: sticky sidebar on desktop, sticky strip at ≤1000px (sets `--report-sticky` for scroll margins) with the current section marked. "Expand all/Collapse all" per long section (JS only). By part of the house: `<HouseCutaway counts size="lg">` beside a part index (the figure column collapses via `:has(figure:empty)` if the drawing renders nothing). |
| `report/IssueRow` | `issue: ReportIssue`, `year`, `index?`, `open?`, `variant?: 'full'\|'compact'` | full (check first): always-visible title/hook/band, "How to check" disclosed. compact (built without, by part): one native `<details data-row>` row (title, years, one clamped line, mini band) expanding in place to hook, band + evidence, check steps with `<HouseCutaway zones size="sm">`, action, notes. Works without JS. `toReportIssue(issue)` strips sources to counts. Anchors: `#i-<slug>`. |
| `report/LifespanList` (client) | `lifespans`, `year`, `age` | Honest "What's due": open groups due → past (plausibly original) → soon on a shared age axis; parts whose life is < house age / 1.5 fold into "Replaced at least once by now: find out when". Every part takes a "last replaced" year or decade (saved on Enter/blur in `localStorage[builtin:last-replaced:<year>]` as `{id: "2015"}`); a dated part is judged by its own age (diamond marker). Counters: due now, past if original, due within 5 yrs, replaced by now. |
| `SiteHeader`, `SiteFooter`, `ThemeToggle`, `LogoMark` | | Footer is a title block with a policy strip (Privacy, Terms & disclaimer, Corrections); shows a note when built on sample content. `ThemeToggle`'s accessible name starts with its visible word. |
| `profile/useHouseProfile` (client) | | `[profile, save]` from `localStorage[builtin:profile]` via `useSyncExternalStore`: one shared snapshot for every component on the page, a custom event on save, the `storage` event across tabs. Server snapshot is `{}`, so static HTML is always unfiltered. `saveHouseProfile()` sanitizes. |
| `profile/ProfilePanel` (client) | `year`, `profile`, `onChange`, `hiddenCount`, `reveal`, `onReveal` | "About your house", a row joined under the report's title block (`id="about-your-house"`; that hash opens it). Collapsed: answers so far, an 11-tick progress scale ("4 of 11"), Answer/Edit toggle (`aria-expanded`), and "N items hidden by your answers · show them". Open: three groups (columns on desktop; at ≤720px an accordion, one group at a time, each header showing its answers). Each question is a native radio group (`fieldset`/`legend`) whose first chip is a dashed "Not sure" (= unset). Clear all, Done; a polite live region announces each change and the hidden count. Open state kept in `builtin:profile-open`. Hidden without JS and in print. Also exports `RevealButton` ("show them / hide them", `aria-pressed`, `data-reveal-hidden`). |
| `typical/TypicalHouse` (client) | `year`, `state`, `id?='typical-house'` | Report section "The typical new house of YEAR" (part two, between Housing that year and Houses of the era today; navigator entry "New houses, as built" with the characteristic count; not rendered before 1971). Region = the report's state's Census region (US when none; static HTML is US-wide); a US/Northeast/Midwest/South/West switch (radio group, JS only) overrides it until the state changes. Title block: one-sentence summary, median size, houses completed, median-size line. Then one row per characteristic: big lead share, `ShareStrip`, notes that apply to the year, and an over-time `Spark` of the lead category with the year marked and series breaks dashed (the line breaks there). House profile answers that line up get a dashed "yours" bracket and a line ("yours: slab, like 56% of new houses in the South that year (Census category: slab or other)"). Footer: general notes, source link and every table used. Before 1971 (and for years the Census has not published yet) only a short honest note. `typical/data.ts` imports the JSON (bundled once, ~12 KB gzipped) and exports `typicalNavCount(year)`. The printable checklist does not carry this section (the sheet is already one tight page for most years). |
| `timeline/AroundYear` (server) | `pick: EventPick`, `id?='around'` | "Around YEAR: what was changing in homebuilding". A drafted year axis (`aroundAxis`, ticks per year, labels centered in their year cell, the year tagged in `--yearline`) with each event as a numbered keynote (filled = dated to the year, dashed ring = circa, ranges as dimension lines, open arrow when they run past the axis; `stackMarks` keeps keynotes apart), long-running ranges as arrowed dashed lines under it. Then the keyed list in three groups: "In YEAR" (larger), "Nearby, A to B · within N years of YEAR", "Under way in YEAR". Each: years, circa tag, category, title, text (or a link to `/issue/<slug>` when the event is one of the issues), each publisher with its `TierTag`, quotes in a native `<details>`. Honest lede ("The record is thin around 1881, so this reaches further than usual"). No client code. |
| `era/HousingThatYear` (server) | `year`, `data: ConstructionData`, `id?='housing'` | "Housing that year": title block with the computed sentence, cells (started, average cost to build to 1970, median new house price from 1963, one-family share), and a stepped-area chart of every year on the 1880-to-today axis (one SVG path per series; pre-1959 historical estimates paler and dashed; the 1959 series change marked; landmarks lettered A-E with a key; the year as an ink bar plus tag). The 1890s-1940s get a decade line (started, converted, demolished, standing). Notes: estimates, farm housing, private-only from 1959, cost caveat, nominal prices. Years with no figure say so. |
| `era/EraToday` (client) | `slice: StockSlice`, `sources`, `pairedWithTypical`, `id?='era-today'` | "Houses of the 1950s, today" (kicker "As they stand today · houses built in the 1950s"): survivors as they are now. Region from the report's state via `ReportStateContext` (US in the static HTML) with the same US/region switch as the typical section. Roof gets the title block ("About 4 in 5 surviving houses from the 1950s across the US have asphalt shingle roofs today, and about 1 in 12 has a metal roof.", homes sampled, RECS average size, strip). Then three groups (the shell, heating and cooling, the rooms) of rows built from the typical section's grammar (`ShareStrip`, its CSS) plus "homes sampled · survey", a "small sample" stamp under 100, "too few sampled" under 30, and an "by era built" column chart (one SVG path; this band in ink). Profile answers marked "yours" (`stockYours`; non-adjacent categories get one bracket per run). Notes quote the Census caveat; sources link both surveys and the working paper. After 2023 it says the house is too new for either survey. |
| `era/CountryDecade` (client) | `slice: CountrySlice`, `links`, `id?='country'` | "The country in 1950": a ledger table (US column, plus the report's state when chosen; on phones each row stacks with column labels): lacking complete plumbing, main heating fuels, public sewer (1970-90) or no flush toilet (1940-60), public water (1970-90), homeownership (nearest census, labelled when it differs), homes built in that decade still standing (ACS) and median year built, and before 1950 the share of the 1950 stock built in the house's band (region beside the US). Each row names and links its table; meters for single shares. Before 1940 it says 1940 was the earliest housing census; after 2005 only today's count. |
| `era/ReportState` (client) | | `ReportStateContext` / `useReportState()`: the report's state for sections passed in as slots. |
| `typical/ShareStrip` | `rec`, `yours?` | 20px stacked strip on a 0–100 ruler, table order, lead solid `--line`, others alternating tints, withheld hatched, numbers inside segments ≥ 11%; key below lists every category with its share (no information by colour alone). |
| `typical/Spark` | `series`, `year`, `x0`, `x1`, `y0?`, `y1?`, `breaks?`, `valueText`, `label` | Stretchy SVG line (non-scaling strokes) with HTML dot/value so they stay round; `role=img` + label. |
| `checklist/Tailor` (client islands) | | `ChecklistTailor` (injects `[data-item]`/`[data-part]{display:none}` for ruled-out rows/parts and a "Tailored to your answers: 3 items left out (no gas; …)" line in the sheet's title-block foot), `TailoredCount`, `TailoredCutaway`. |

### Report order (two parts)
Title block, About your house, headline, timeline, then the body in two parts, mirrored by the navigator
(desktop sidebar: two numbered groups; phone strip: the groups as numbered dividers):
1. **This house**: Check first, Built without, By part of the house, What's due (first for new houses), Your place.
2. **The year in context** (a double-ruled part header: "describes houses in general, never this one"): Around YEAR
   (`#around`), Housing that year (`#housing`), The typical new house of YEAR (`#typical-house`, 1971 on, kicker "As
   built · new houses of YEAR"; navigator "New houses, as built"), Houses of the DECADE today (`#era-today`, its pair:
   "As they stand today"), The country in CENSUS (`#country`).
The page (`built/[year]/page.tsx`) builds the slots: server components get the data directly; the two client
sections get only that year's slices (`stockSlice`, `countrySlice`, ~10 KB and ~7 KB of props) and short source
links. Before 1971 the typical section is no longer rendered: the "today" section's lede says no survey of new
houses exists and the survivors are the closest view. Static HTML has every section, US-wide.

## House profile in the report (v1.1)
`Report` filters regional issues by state first, then `splitByProfile` → `shown` / `ruledOut` (and
the same for lifespans). Everything counts `shown`: title-block cells (with "of N" when answers hide
some), headline (first applicable issue; new-house logic too), summary line ("…a 1972 house like
yours"), section navigator, section ledes, the timeline (`Timeline profile` ghosts ruled-out bands
like other states' bands, drops them from lane counts and "What the YEAR line crosses", and its
annotation says "Not for your house: no gas"), the cutaway counts and What's due (`LifespanList`
gets only applicable parts). "Show them" (one report-wide state, toggled from the panel or any
section's "2 hidden by your answers · show them") renders ruled-out rows in place at the end of
their own section / part, marked with a hatched wash, struck title and a dashed "Not for your house ·
Hidden because: no gas" tag (`IssueRow hiddenBy`, `data-hidden-by`); the part index shows "+1"; What's
due lists them under "Not for your house". With no answers every list is identical to v1.
Home: one line under the primary action links to `/built/YEAR#about-your-house` (or says the
report is tailored, "4 of 11"); hidden without JS. Home counts stay year-level.

## Routes
- `/` (`src/app/page.tsx`), `/built/[year]` (1880..MAX_YEAR, `dynamicParams=false`).
- Tests: `src/lib/era.test.ts` (4-8 events for every year, window rules, 1952 vs 1953, axis/keynotes, rounding, comparisons, landmarks, bands, slices add up, never n < 30, profile mapping, census years and slices), `src/lib/select.test.ts` (selection + life stages + replaced-year parsing), `src/lib/profile.test.ts` (matching rule, reasons, split, sanitize, `validateWhen`), `src/lib/timeline.test.ts` (packing, tick labels, hit test, note placement). `src/lib/timeline.ts` imports `./select.ts` with the extension so Node can run it.
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

## House cutaway and the printable checklist

### `HouseCutaway` (`src/components/HouseCutaway/`)
Props unchanged from the stub: `zones?`, `counts?`, `size?: 'sm'|'md'|'lg'`, `label?`, `className?`
(named + default export, server-safe, no hooks, no ids). One hand-authored inline SVG (viewBox
840×528): a section through a two-storey house cut perpendicular to the ridge. Every `Zone` is a
`<g data-zone>`; draw order and geometry live in `drawing()`, callout positions in `CALLOUT`
(`at` = point on the drawing, `tag` = clear space for the keynote). `geometry.ts` holds pure
helpers: section hatching clipped to convex polygons, concrete stipple, batt insulation.
- Line weights are true pixels at every size (`vector-effect: non-scaling-stroke`): `.o` cut
  outline, `.m` objects, `.t` detail, `.h` hatching; dashed = hidden (pipes in walls), dash-dot =
  wiring. Colours are tokens only (`--ink*`, `--line*`, `--paper`), so both themes and print work.
- `zones`: wash (`--line` 17%) + heavier blue line; pipes, wiring and the whole-house outline also
  get a soft highlighter halo; everything else recedes (opacity 0.3, 0.2 in dark). Each highlighted
  zone gets a numbered keynote with a leader. Text labels sit beside keynotes when the drawing is
  ≥ 760px wide; narrower, an HTML key under the drawing lists them. `whole-house` = building
  silhouette.
- `counts`: a numbered ink dot at each zone's `at` point (keynotes are suppressed).
- Sizing: `sm` 160px thumbnail (fine detail, hatching, keynotes and key hidden; highlighted zones
  get a locator ring instead), `md` up to 440px, `lg` 100%. Keynote/dot scale (`--k`) and detail
  follow the rendered width through container queries on the figure, so `lg` on a phone still works.
- a11y: `role="img"` + `aria-label` naming the highlighted zones (or the counts); all drawing and
  the key are `aria-hidden`. Print block forces black on white.
- Every zone was checked at sm/md/lg in both themes; add new parts to `drawing()`, `ORDER` and
  `CALLOUT` together, keeping tags clear of each other so any combination can be shown.

### `/checklist/[year]` (`src/app/checklist/[year]/`)
Statically generated for MIN_YEAR..MAX_YEAR (`dynamicParams=false`), own metadata + canonical.
Paper first: `@page` US Letter, site header/footer and toolbar hidden in print (`body:has(.page)`),
tokens forced to black on white, running page footer via `@page` margin boxes. On screen it is a
drafted sheet with a Print button (`components/checklist/PrintButton`, client) and working tick boxes.
Content: title block (year, age, counts, Address/Date fill-ins, site name, URL, disclaimer); Check
these first (priority 1: title, `check[0]`, where to look); everything else by part (`groupByPart`;
title + first sentence of `check[0]`); Built without; Ask the seller; a counts `HouseCutaway`; ruled
notes that stretch to fill the band. House profile: rows carry `data-item`/`data-part`, and the
`checklist/Tailor` islands hide ruled-out rows after hydration, recount On record / Check first /
section counts and the cutaway, and add "Tailored to your answers" (printed too). Check-first numbers
are a CSS counter so they stay consecutive. "Ask the seller" is the `TailoredAsks` island:
`sellerQuestions(lifespans, age, limit, profile)` drops parts the answers rule out (no central air →
"How old is the furnace?"; slab → no sump pump; no chimney → no flue) and adds `alt` parts only when an
answer names them (boiler, well pump, septic, metal/tile/wood/flat roofs). The server-side column
balance is not tailored. No answers or no JS = the full sheet. Sparse years (< 10 issues) add "On any viewing" prompts and more
note lines; houses ≤ 10 years old get a warranty question.
`components/checklist/sheet.ts` (pure): `oneLine`, `regionNote`, `sellerQuestions(lifespans, age)`
(one question per part, backed by named lifespans and `lifeStatus`: due/past, or soon for houses
under 15), `zoneCounts`, `splitColumns`. The by-part list is split server-side into two balanced
grid columns on purpose: CSS multi-column that runs across a printed page makes Chromium spill
columns sideways and shrink the whole sheet.
Verified PDFs (Playwright `page.pdf`, Letter): one page for 1996, 2010, 2022, 2026; two clean pages
for busy years (1880–1985 and 2005), with the lower band kept whole on page 2.

## "Your place" (ZIP code facts)
Optional: the visitor types a 5-digit ZIP in the report's last section (`#your-place`, also in the
section navigator) and gets a short drafted sheet of sourced, area-level facts.

### Data: `scripts/data-prep/build-place.py` → `public/place/` (committed, ~2.9 MB raw, ~1 MB gzipped)
`python3 -I scripts/data-prep/build-place.py [--refresh]` (needs curl and `pdftotext` from
poppler-utils). It downloads ~135 MB with plain `curl -sL` into `scripts/data-prep/.cache/place/`
(gitignored), then writes `public/place/zip/<3-digit prefix>.json` (896 shards, 33,791 ZCTAs, largest
~8 KB), `public/place/counties.json` (3,230 counties) and `manifest.json` (sources, URLs, vintages,
generation date, counts). The record layouts are documented at the top of the script and decoded
only in `src/lib/place.ts`. The site build never runs it and never touches the network; Next serves
`public/` as static files. The script exits non-zero if a sanity check fails (known places: 10001 →
New York County 4A; Miami-Dade 1A, radon 2; 22301 → Alexandria city; 06105 → Hartford County; 99501
→ Anchorage zone 7; Aroostook zone 7; 100% radon/climate coverage of the 50 states and DC...).
- Census ACS 2020–2024 5-year B25034/B25035/B25040, table-based summary files, ZCTA and county
  rows. Year-built shares and heating-fuel shares are integer percents (largest remainder, sum 100);
  shares are dropped below 100 housing (or occupied) units, and the medians of those ZCTAs too.
  Negative/blank estimates = no data. Bins are stored oldest first.
- ZCTA → county: 2020 relationship file, dominant county by land area (+ its % and the county count).
- County ACS fallback (`a`) only for counties that some ZCTA needs, never Connecticut (the 2024 ACS
  uses planning regions; every other source uses the 8 old counties, as the relationship file does).
- EPA radon zones (2024-06 JSON) joined by state + county label, with the documented fix list
  (Alaska renames/splits, DC, La Salle, Doña Ana, Shannon; Virginia cities + " city"; Bedford,
  Clifton Forge and South Boston skipped so they never overwrite their county; Yellowstone NP
  dropped; Hoonah-Angoon copies Skagway).
- DOE/PNNL 2015 climate table parsed from the PDF text (`CLIMATE_FIX` covers the wrapped/renamed
  rows; Aroostook's blank moisture handled). Stored as a 3-char code, e.g. `4AM`.
- FEMA NFIP Community Status Book (OpenFEMA CSV): initial-FIRM year per community, county field
  split on `/` and `,`; years before 1968 or after the generation year are dropped (e.g. Alexandria
  VA's 2069, so it shows "no usable date"). Per county: earliest, median, latest, count.
- Not used: FEMA NRI and the HUD crosswalk (not reachable), 2021 climate table (not reachable).

### Code
| file | what |
|---|---|
| `lib/place.ts` (pure, import-free; tests `place.test.ts`, incl. checks on the committed data) | `cleanZip`, `isValidZip`, `shardPath`, `FIPS_STATE`, `decodePlace` → `Place`, `BINS`, `compareYear` (uniform within a decade; "older than about", "newer than about", "older than at least" for pre-1940, "newest" after 2024), `binIndex`, `mainFuels` (≥ 5%), `housingFor` (ZIP figures, else county fallback with the reason), `radonStatement`, `climateStatement`, `firmContext`, `placeStatements` |
| `components/place/usePlace.ts` (client) | `usePlacePref()` = `localStorage[builtin:place]` `{zip, setState?, keep?}` via `useSyncExternalStore` (server snapshot null). `usePlaceLookup(zip)` fetches only that ZIP's shard and `counties.json` from the same origin (memoised per page); 404 or absent ZIP = `missing`. |
| `components/place/PlaceSection` (client) | Props `year`, `state`, `onStateChange` (the report's `chooseState`). ZIP strip (numeric keypad, ZIP+4 trimmed, auto-lookup on the fifth digit, "Forget this ZIP", privacy line). Sheet: title block (ZIP numeral, county + state, multi-county / independent-city / Connecticut / Puerto Rico notes; `areaUnit(place)` in `lib/place.ts` says "municipio" instead of "county" for PR), Houses around you (comparison sentence, `HousingChart`, median, homes counted, heating-fuel rows), Radon (boxed: zone scale + EPA's own caveat quoted, prominent), Climate zone + First flood map side by side (FEMA Flood Map Service Center link). Every fact has a source line. Without JS: a one-line note (`html:not(.js)`). |
| `components/place/HousingChart` | Decade bars on the 1880–today axis (`pctOf`), oldest bin drawn over the 1930s with a faded tail, solid = built after the year, pale = before (the year's decade split at the line), year tag, hidden data table for screen readers. |

State selector: a ZIP the visitor enters sets the report's state when it is "All states" or a state
this section set earlier (note + Undo). If the visitor picked another state, it asks "Use Idaho /
Keep Ohio" instead; "Keep" is remembered. Restoring a remembered ZIP never changes the state.
Puerto Rico ZIPs show housing and FIRM facts only (no radon/climate data, not in the state list).
The section navigator shows no count beside "Your place" (it depends on a ZIP the visitor may not give).

## Launch: indexing, trust pages, icons, analytics, performance

### Indexing and metadata (`src/lib/seo.ts`)
- `pageMeta({title, shareTitle?, description, path, type?, image?, indexable?})` gives every page the
  same set: title, description, canonical, `robots`, Open Graph (type, title, description, url,
  site name, `en_US`, image) and a `summary_large_image` Twitter card. Next merges metadata shallowly,
  so a page that sets `openGraph` must pass its image: the default is the site image
  (`SITE_OG_IMAGE`, `/opengraph-image`); `image: null` on routes with their own `opengraph-image`
  file (`/`, `/built/[year]`, `/issue/[slug]`). Checklists reuse `/built/[year]/opengraph-image`.
- `robotsFor(indexable = true)`: index, follow; `false` = noindex, follow. `IS_NON_PRODUCTION_DEPLOY`
  (`VERCEL_ENV` set and not `production`) makes every page noindex, nofollow, so preview deployments
  are never indexed. The root layout sets `robots: robotsFor()`; any page that sets robots goes through
  `robotsFor` so the preview rule cannot be overridden. `robots.ts` allows crawling (so crawlers can read
  the noindex) and adds the sitemap line only in production. The 404 sets `robotsFor(false)` (Next adds
  its own noindex too).
- `/checklist/[year]`: noindex, follow, canonical to itself, not in `sitemap.ts`. The sitemap lists home,
  `/issues`, `/about`, `/corrections`, `/privacy`, `/terms`, every `/built/Y` and every `/issue/<slug>`.
- Year report descriptions (`yearDescription` in `built/[year]/page.tsx`) carry the report's own
  headline: "1972 house report. Headline: Aluminum branch wiring, at its peak in 1972. 36 things on
  record: 6 to check first, 12 protections it was built without and what is due at 54 years old."
  (shortened to fit ~165 characters); new houses use the report's new-house wording and the first parts
  to come due. Every one of the ~380 pages has a unique title and description (checked over the build).

### Trust pages
`/privacy`, `/terms`, `/corrections` share `components/doc/DocPage` (title block with cells and a
"Last updated" stamp, sticky numbered index, numbered sections, `FactList`, closing `DocNote`; styles in
`DocPage.module.css`). Linked from a policy strip at the foot of the footer title block.
- `SITE.contactEmail` (`string | null`, null: the owner stays anonymous) and `SITE.contactForm` (true) drive
  `components/doc/Contact`: a mailto link if an address is ever set, else "Use the form on the corrections page."
  (linking to `/corrections#report`). Used on /about, /privacy and /terms.
- `SITE.reviewStatus`: the one sentence on /about ("Who is behind this") about inspector review.
- `SITE.policiesUpdated`: the date on the three pages.
- `lib/corrections.ts`: `CORRECTIONS` (newest first; empty = "None yet."), rendered as a ledger.
- `components/doc/ForgetDevice` (client): "Forget everything saved on this device". `savedKeys()` /
  `clearSaved()` in `lib/storage.ts` derive every key from `STORAGE_KEYS` (per-year keys by prefix); it
  also resets the profile and ZIP stores (`saveHouseProfile({})`, `forgetPlace()`), removes the theme
  attribute and fires `THEME_RESET_EVENT` for `ThemeToggle`.

### Icons, manifest, theme colour, 404
- `scripts/build-icons.mjs` (dev only, Playwright: `NODE_PATH=$(npm root -g) node scripts/build-icons.mjs`)
  redraws the LogoMark on a pixel grid and writes `src/app/icon.svg` (blueprint tile; paper tile when the
  browser UI is dark), `src/app/favicon.ico` (16 with a pixel-snapped drawing, 32, 48), `src/app/apple-icon.png`
  (180) and `public/icons/icon-192|512|maskable-512.png`. `src/app/manifest.ts` (`/manifest.webmanifest`).
- `THEME_COLORS` in `site.ts` feeds the two `theme-color` metas (viewport), the manifest and the icons;
  `ThemeToggle` points both metas at the chosen theme while one is chosen.
- `src/app/not-found.tsx`: title-block sheet (outlined zero), links, `notfound/LookupYear` (the hero
  `YearInput`, sized to its column through `--t-hero`; `YearInput` takes a `hint`) and the decade grid.

### Analytics
`components/TelemetryScripts` (client): `@vercel/analytics/next` `<Analytics>` and
`@vercel/speed-insights/next` `<SpeedInsights>`, both with `beforeSend` that drops the query string and
hash. The root layout renders `components/Telemetry`, which loads it with `next/dynamic` only when
`process.env.BUILT_ON_VERCEL` is set; next.config.ts inlines that at build time (`'1'` when `VERCEL` is
set), so local builds and other hosts compile none of the analytics code and request nothing. On Vercel
both load from `/_vercel/insights/script.js` and `/_vercel/speed-insights/script.js` on the site's own
origin and set no cookies (checked with a `VERCEL=1` build). Speed Insights must also be enabled in the
Vercel dashboard.

### Performance notes
- Fonts: `next/font/local` over the same Fontsource woff2 files (latin only). Preloaded: Fraunces
  (full axes, normal), Plex Sans 400, Plex Mono 400; the rest load on use. Fraunces italic is the
  `standard` (wght + opsz) file, 82 KB instead of 150 KB: italics never use SOFT/WONK. Family names are
  kept (`'Fraunces Variable'`, `'IBM Plex Sans'`, `'IBM Plex Mono'`) and the metric-matched fallbacks
  (`'fraunces Fallback'`, `'plexSans Fallback'`, `'plexMono Fallback'`) sit second in the `--font-*`
  tokens; this removed the font-swap layout shift (CLS 0.52 on /issues and 0.30 on a checklist before).
- `HouseCutaway size="sm"` omits the detail that CSS hides at thumbnail size (`.fine`, `.h`, `.dots`,
  `.agg`, `.dash`, the earth hatch) instead of shipping it hidden: the 1972 report went from 1.83 MB
  (520 KB gzipped) to about 1.0 MB (116 KB gzipped) with identical rendering.
- Accessibility: `--ink-3` (light) is #5f6369 so tertiary labels pass on `--paper-2` too; the home
  hero question is the page's `h1` (styled as a label); footer index links are 24px targets.
- Year in context (Nov 2026): /built/1925 900 KB → 1,017 KB raw (95 → 119 KB gzipped), 1955 1,043 → 1,161 KB
  (105 → 128 KB), 1987 850 → 969 KB (95 → 119 KB); DOM 10.7k → 11.7k, 12.5k → 13.6k, 10.1k → 11.1k; Lighthouse
  mobile 98/98/99 → 98/98/95-98 (1987 varies run to run with TBT 70-190 ms), accessibility 100. Kept down by: server components for the events and the chart, one
  SVG path per series, whole-number slices, strip geometry to two decimals, no dataset shipped whole.
- Client props trimmed: the report's issues drop `summary`, the timeline gets `getIssuesTimeline()` (no
  copy), lifespans come from `getLifespansLite()` (no quotes). `content-visibility` on the report's lower
  sections was tried and removed: no measurable gain, and it gave Lighthouse stale rects.

## Report an error (`POST /api/corrections`)
The one server route; every page stays static. A reader's report is emailed to the maintainers through the Resend REST
API (plain `fetch`, no SDK) and stored nowhere.
- `src/app/api/corrections/route.ts`: `runtime = 'nodejs'`, `POST` only (shows as ƒ in the build output; everything
  else stays ○/●). Reads the env vars and hands off to `handleCorrection`.
- `src/lib/contact-handler.ts` (Request → Response, deps injected: env, fetch, clock, logger, limiter; tests
  `contact-handler.test.ts` with a mocked fetch). JSON body (the enhanced form) → JSON `{ok:true}` or `{ok:false, code,
  field?}`; `application/x-www-form-urlencoded` (JavaScript off) → 303 to `/corrections?sent=1#sent` or
  `/corrections?error=<code>#e-<code>`. Order: foreign `Origin` / other content types → 400 `bad-request`; body over
  32 KB (Content-Length or streamed) → 413 `too-large`; honeypot (`website`) filled or sent < 2.5 s after render (`t`,
  set by the page's script; missing/negative values are ignored) → fake success, nothing sent, one log line; field
  errors → 400; no key or no `CONTACT_TO` → 503 `not-configured` + one log line naming the missing variable; per-IP
  limit (5 per 10 min, `X-Forwarded-For`; in memory, so per warm instance on serverless) → 429 `rate-limited`;
  Resend non-2xx or unreachable (10 s timeout) → 502 `send-failed`, status logged, never the key. With JavaScript off
  the page field is recovered from the Referer (`/corrections?page=…`).
- `src/lib/contact.ts` (pure, tests `contact.test.ts`): `LIMITS` (message 10–4000, source ≤ 500, email ≤ 254),
  `ERROR_TEXT`, `cleanText` (strips C0/C1, zero-width and bidi controls), `cleanPage` (a site path or a
  https://yearbuilt.house URL → path; anything else dropped), `isValidEmail`, `checkSubmission`, `pageFromReferer`,
  `buildEmail` (from `CONTACT_FROM` or `Year Built <corrections@yearbuilt.house>`, to `CONTACT_TO`, `reply_to` the
  reader's address if given, subject `Correction: <page or general>`, plain text: page, source, reply address, time
  in UTC and the message; no IP), `createRateLimiter`, `reportErrorHref(path)`.
- `components/corrections/CorrectionForm` (client) in /corrections § "How to report an error": a drafted form sheet
  (message with counter and fill gauge, page, email, source; required/optional tags; hints; inline validation on blur
  and send; errors marked with heavier ink, a hatched margin and a "!" marker, not colour; one polite live region;
  focus to the first bad field, the notice, or the thank-you heading). The page stays static: `?page=`, `?sent=1` and
  `?error=` are read from `location` after hydration (no `useSearchParams`, so the full form is in the HTML). Without
  JavaScript the form POSTs natively and the redirect's fragment shows the matching note with `:target` (hidden under
  `html.js`). "not-configured" says plainly that the form is not available right now and offers to copy the text.
- Entry points, all `/corrections?page=<path>`: `corrections/ReportErrorLink` under the Sources list on issue pages and
  just above the year report's pager; `corrections/FooterReportLink` (client, `usePathname`) in the footer's policy
  strip on every page except /corrections, /privacy and /terms.

### Deploying
Set these on the Vercel project (Production, and Preview if previews should send). No values belong in the repository.
| variable | | what |
|---|---|---|
| `RESEND_API_KEY` | required | Resend API key with sending access for yearbuilt.house. The handler also accepts the lower-case name `resend` (`RESEND_API_KEY ?? resend`), which is how the current Vercel project has it saved. |
| `CONTACT_TO` | required | Where reports are delivered (the maintainers' private inbox). |
| `CONTACT_FROM` | optional | Sender; defaults to `Year Built <corrections@yearbuilt.house>` (the domain must stay verified in Resend). |
Missing key or `CONTACT_TO` → the form says it is not available and the function logs `[corrections] not configured`.
`RESEND_BASE_URL` is for local testing only (point it at a mock; default `https://api.resend.com`); never set it on Vercel.

