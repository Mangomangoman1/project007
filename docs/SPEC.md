# Built In — v1 spec

Working title "Built In" (the name lives in ONE config constant so it can be renamed). A site where
you enter the year your US house was built and see what houses of that era typically contain, what
to check first, and what is reaching end of life. Every claim is sourced. It is a guide to what to
look for, never a substitute for an inspection.

The owner's standing requirement: **everything must be beautiful, intuitive and feel fully
fledged. No generic template look.** Treat design as a first-class deliverable.

## Repo layout and ownership
```
research/            raw research + verification (research agents only)
content/editorial.json   homeowner-facing copy + normalised years per issue (content agent only)
content/lifespans.json   "what's due" components (content agent only)
scripts/build-data.mjs   merges research + content -> src/data/*.json (foundation builder)
src/                 the Next.js app (builders)
docs/SPEC.md         this file
```
Agents do NOT run git commands. The orchestrator commits.

## Stack
- Next.js (latest stable, App Router) + TypeScript, deployed on Vercel. Everything statically
  generated; no database, no server state, no API keys.
- Styling: plain CSS (global tokens + CSS Modules). No UI kit, no Tailwind.
- Fonts: self-hosted via Fontsource npm packages (do NOT use next/font/google or any CDN: the
  build sandbox cannot reach Google Fonts). Fraunces Variable (display), IBM Plex Sans (text),
  IBM Plex Mono (annotations, years, labels).
- No analytics, cookies or third-party scripts in v1. localStorage only for "already replaced" ticks
  and last-used year/state (wrapped in try/catch; page must work without it).

## Compiled data (src/data/issues.json, produced by scripts/build-data.mjs)
```ts
type Zone = 'roof'|'attic'|'exterior-walls'|'windows'|'electrical-panel'|'wiring-outlets'|
  'kitchen'|'bathroom'|'plumbing-supply'|'drains-sewer'|'water-heater'|'heating-cooling'|
  'basement-foundation'|'garage'|'deck-yard'|'interior-surfaces'|'chimney'|'whole-house';

type Issue = {
  id: string; slug: string;
  title: string;              // plain, e.g. "Polybutylene water pipes"
  category: 'electrical'|'plumbing'|'hazmat'|'envelope'|'structure'|'hvac'|'fire-safety';
  hook: string;               // one sentence a homeowner would repeat to a friend
  summary: string;            // 2-3 sentences
  kind: 'present'|'missing';  // present = material/product likely installed in these years;
                              // missing = protection that houses built BEFORE a date lack
  applies: { from: number|null; to: number|null;       // build years the issue applies to
             coreFrom: number|null; coreTo: number|null; // years it is most likely
             startEdge: 'sharp'|'soft'; endEdge: 'sharp'|'soft' }; // sharp = legal/recall date
  regions: 'national' | string[];   // USPS state codes when regional
  severity: 'safety'|'money'|'comfort';
  priority: 1|2|3;            // 1 = check first
  evidence: 'record'|'rule'|'era';  // court/recall record, federal rule or code, or approximate era
  prevalence: { label: 'likely'|'possible'|'rare'|'unknown'; note: string };
  retrofit: boolean;          // true if often added to OLDER homes later (year predicts poorly)
  where: Zone[];
  check: string[];            // 2-5 concrete steps: where to look, what you'd see
  action: string;             // what to do if you find it
  caveat?: string;            // honest limits of the claim
  sources: { url: string; publisher: string; tier: 'primary'|'trade'|'reference'; quote?: string }[];
};
type Lifespan = { id: string; title: string; zone: Zone; lifeLow: number; lifeHigh: number;
  note: string; sources: {url:string; publisher:string; tier:string; quote?:string}[] };
```
Only issues present in content/editorial.json with `"include": true` are compiled. Sources are taken
from the research files: verified ones only (those with `"verified": true`), carrying `tier` and
`quote`. The build script must fail loudly if an included issue has zero verified sources.

## Routes
- `/` — hero with the year input and the interactive timeline (below). Scrubbing the year updates
  live counts ("14 things to know about a 1972 house") and a preview; primary action opens the report.
- `/built/[year]` — the report, statically generated for 1880..current year. Sections: headline
  finding; "Check these first" (priority 1); everything else grouped by part of the house; "What's
  due at this age" (lifespans vs. age, with "already replaced" ticks that update the list);
  optional state selector that filters regional issues (client-side). Prev/next year links.
- `/issue/[slug]` — one issue: what it is, years (with the band), how to check (with the house
  diagram), what to do, honest caveat, and Sources with verbatim quotes and tier labels.
- `/issues` — browsable index by part of the house, with a mini-band per issue.
- `/checklist/[year]` — print-optimised one-page "viewing a house built in YEAR" sheet.
- `/about` — method: where data comes from, what the confidence labels mean, limits, disclaimer.
- sitemap.xml, robots.txt, per-page metadata + canonical, Open Graph images (next/og with the
  local fonts), JSON-LD where natural.

## Signature elements
1. **The timeline.** A horizontal ribbon from 1880 to today. Each issue is a band across the years
   it applies; bands are grouped in lanes by category. **Sharp edges where the date is a legal
   fact, faded (gradient) edges where it is an approximate era**, with the core years drawn solid.
   A vertical line marks your year and the bands it crosses light up. Must be usable by touch,
   mouse and keyboard (arrow keys move the year), and legible on a phone (horizontal scroll with
   the year line kept in view, or a rotated/compact layout). Build it as SVG.
2. **The house cutaway.** One drawn cross-section of a house (roof, attic, walls, windows, panel,
   kitchen, bath, basement, garage, deck, chimney) with addressable zones. On an issue it
   highlights where to look; on the report it shows a dot per issue zone. Line-drawing style.
3. **Honest evidence labels.** Small stamps: "Court record", "Federal rule", "Approximate era";
   and prevalence stated plainly, including "No reliable count exists".

## Design direction
An architect's field notebook. Light theme: warm drafting paper, graphite ink, blueprint-blue
linework, one red-oxide accent reserved for "check first". Dark theme: an actual blueprint (deep
blue ground, pale lines). Honour prefers-color-scheme and provide a toggle. Drafting details used
with restraint: fine rules, dimension-line ticks, small mono annotations, title-block style
headers. Fraunces for big numerals and headings (the year is the hero: set it huge), Plex Sans for
reading text, Plex Mono for labels. Generous whitespace, strong typographic hierarchy, real
attention to line length and rhythm. Motion: subtle and purposeful (bands drawing in, the year line
easing), respecting prefers-reduced-motion. Accessible: semantic HTML, visible focus, WCAG AA
contrast in both themes, no information by colour alone.
Avoid: card grids with drop shadows, gradient blobs, emoji, stock-illustration feel, generic
SaaS landing-page structure.

## Voice
A knowledgeable friend. Plain words, short sentences, no alarmism. Say "likely", "possible",
"rare" only with the basis; say "no reliable count exists" when true. Never tell someone their
house has a problem: say what houses of that year often have and how to check. US spelling.
Standard footer line: "A guide to what to look for. Not an inspection."

## Quality bar for builders
`npm run build` must pass with no type or lint errors. Take Playwright screenshots (Chromium is
pre-installed; `require('playwright')` works, do not install it) of every route at 390px and 1440px
in both themes, LOOK at them, and iterate until they are genuinely polished. No horizontal page
scroll at 390px. Report what you verified and what is unfinished.
