# Built In

Enter the year a US house was built and see what houses of that era typically contain, what to
check first, and what is reaching the end of its life. Every claim is sourced. A guide to what to
look for, not an inspection.

"Built In" is a working title; the name is one constant in `src/lib/site.ts`.

## Run it
```bash
npm install
```
```bash
npm run dev
```
```bash
npm run build
```
`npm run lint`, `npm run typecheck` and `npm test` check the code.

## Where things are
- `research/` raw research with verification (each source marked verified, with a quote)
- `content/editorial.json` the homeowner-facing copy and normalised years for each issue
- `content/lifespans.json` typical service life of house components
- `scripts/build-data.mjs` merges the above into `src/data/` before every dev/build; it fails if
  an included issue has no verified source
- `src/` the Next.js app
- `docs/SPEC.md` the v1 spec, `docs/ARCHITECTURE.md` how the code is organised,
  `docs/FOR-YOU.md` open decisions for the owner
