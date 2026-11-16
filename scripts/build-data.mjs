#!/usr/bin/env node
/**
 * build-data.mjs — merges research + content into the app's compiled data.
 *
 *   research/<domain>.json   { entries: [ { id, sources: [ { url, publisher, verified, tier?, quote? } ] } ] }
 *   content/editorial.json   { [researchId]: Editorial | { include: false, reason } }
 *   content/lifespans.json   Lifespan[]  |  { lifespans: Lifespan[] }  |  { [id]: Lifespan }
 *
 * Writes src/data/issues.json, src/data/lifespans.json and src/data/meta.json.
 * Falls back to content/sample-*.json when the real content files do not exist yet.
 * Fails loudly (exit 1, every problem listed) on invalid data: an included issue
 * with no verified source, an unknown Zone, a bad category, etc.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const rel = (p) => path.relative(ROOT, p);

const RESEARCH_FILES = [
  'electrical', 'plumbing', 'hazmat', 'envelope',
  'hvac-safety-lifespans', 'structure-regional', 'newer-homes',
];

const ZONES = new Set([
  'roof', 'attic', 'exterior-walls', 'windows', 'electrical-panel', 'wiring-outlets',
  'kitchen', 'bathroom', 'plumbing-supply', 'drains-sewer', 'water-heater', 'heating-cooling',
  'basement-foundation', 'garage', 'deck-yard', 'interior-surfaces', 'chimney', 'whole-house',
]);
const CATEGORIES = new Set(['electrical', 'plumbing', 'hazmat', 'envelope', 'structure', 'hvac', 'fire-safety']);
const KINDS = new Set(['present', 'missing']);
const EDGES = new Set(['sharp', 'soft']);
const SEVERITIES = new Set(['safety', 'money', 'comfort']);
const EVIDENCE = new Set(['record', 'rule', 'era']);
const PREVALENCE = new Set(['likely', 'possible', 'rare', 'unknown']);
const TIERS = new Set(['primary', 'trade', 'reference']);
const STATES = new Set([
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'DC', 'FL', 'GA', 'HI', 'ID', 'IL', 'IN', 'IA',
  'KS', 'KY', 'LA', 'ME', 'MD', 'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ', 'NM',
  'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC', 'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA',
  'WV', 'WI', 'WY', 'PR', 'GU', 'VI', 'AS', 'MP',
]);

const errors = [];
const warnings = [];
const fail = (msg) => errors.push(msg);
const warn = (msg) => warnings.push(msg);

function readJson(file) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (e) {
    throw new Error(`Could not parse ${rel(file)}: ${e.message}`);
  }
}

/** Real content file if it exists and parses, else the sample. Returns { data, file, sample }. */
function loadContent(name) {
  const real = path.join(ROOT, 'content', `${name}.json`);
  const sample = path.join(ROOT, 'content', `sample-${name}.json`);
  if (fs.existsSync(real)) {
    return { data: readJson(real), file: real, sample: false };
  }
  if (!fs.existsSync(sample)) throw new Error(`Neither ${rel(real)} nor ${rel(sample)} exists`);
  warn(`${rel(real)} not found: using ${rel(sample)} (SAMPLE CONTENT)`);
  return { data: readJson(sample), file: sample, sample: true };
}

/* ---------- research ---------- */
const research = new Map();
const researchFilesUsed = [];
for (const name of RESEARCH_FILES) {
  const file = path.join(ROOT, 'research', `${name}.json`);
  if (!fs.existsSync(file)) continue;
  const doc = readJson(file);
  const entries = Array.isArray(doc) ? doc : doc.entries;
  if (!Array.isArray(entries)) { fail(`${rel(file)}: no "entries" array`); continue; }
  researchFilesUsed.push(name);
  for (const e of entries) {
    if (!e || typeof e.id !== 'string') continue;
    if (research.has(e.id)) {
      // Same id in two files: merge sources rather than silently dropping one.
      const prev = research.get(e.id);
      prev.sources = [...(prev.sources || []), ...(e.sources || [])];
      warn(`research id "${e.id}" appears in more than one file; sources merged`);
    } else {
      research.set(e.id, { ...e, _file: name });
    }
  }
}

function mapSources(list, ctx) {
  const out = [];
  const seen = new Set();
  for (const s of list || []) {
    if (!s || s.verified !== true || typeof s.url !== 'string') continue;
    let tier = s.tier ?? 'reference';
    if (!TIERS.has(tier)) { warn(`${ctx}: unknown tier "${tier}" on ${s.url}; using "reference"`); tier = 'reference'; }
    const key = `${s.url}|${s.quote ?? ''}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const src = { url: s.url, publisher: String(s.publisher ?? new URL(s.url).hostname), tier };
    if (typeof s.quote === 'string' && s.quote.trim()) src.quote = s.quote.trim();
    out.push(src);
  }
  // Primary first, then trade, then reference; stable within a tier.
  const rank = { primary: 0, trade: 1, reference: 2 };
  return out.sort((a, b) => rank[a.tier] - rank[b.tier]);
}

/** Sources for an editorial record: its research entry plus any extra ids it lists. */
function sourcesFor(id, ed, ctx) {
  const ids = [ed.researchId ?? id, ...(ed.researchIds ?? []), ...(ed.sourceIds ?? [])];
  const raw = [];
  for (const rid of [...new Set(ids)]) {
    const r = research.get(rid);
    if (!r) { if (rid === (ed.researchId ?? id)) fail(`${ctx}: no research entry with id "${rid}"`); else fail(`${ctx}: extra research id "${rid}" not found`); continue; }
    raw.push(...(r.sources || []));
  }
  if (Array.isArray(ed.sources)) raw.push(...ed.sources.map((s) => ({ verified: true, ...s })));
  return mapSources(raw, ctx);
}

/* ---------- helpers ---------- */
const yearOrNull = (v, ctx, field) => {
  if (v === null || v === undefined || v === '') return null;
  const n = Number(v);
  if (!Number.isInteger(n) || n < 1600 || n > 2100) { fail(`${ctx}: applies.${field} must be a year or null (got ${JSON.stringify(v)})`); return null; }
  return n;
};
const str = (v, ctx, field, { optional = false } = {}) => {
  if (typeof v === 'string' && v.trim()) return v.trim();
  if (!optional) fail(`${ctx}: missing "${field}"`);
  return undefined;
};
const oneOf = (v, set, ctx, field, fallback) => {
  if (set.has(v)) return v;
  if (fallback !== undefined && (v === undefined || v === null)) return fallback;
  fail(`${ctx}: "${field}" must be one of ${[...set].join('|')} (got ${JSON.stringify(v)})`);
  return fallback ?? [...set][0];
};

/* ---------- issues ---------- */
function unwrapEditorial(data) {
  if (Array.isArray(data)) return Object.fromEntries(data.filter((d) => d && d.id).map((d) => [d.id, d]));
  if (data && typeof data === 'object') {
    for (const k of ['issues', 'entries', 'editorial']) {
      if (data[k] && typeof data[k] === 'object' && !Array.isArray(data[k])) return data[k];
      if (Array.isArray(data[k])) return unwrapEditorial(data[k]);
    }
    return data;
  }
  throw new Error('editorial content is not an object');
}

const editorial = loadContent('editorial');
const edMap = unwrapEditorial(editorial.data);
const issues = [];
const slugs = new Map();
let excluded = 0;

for (const [id, ed] of Object.entries(edMap)) {
  if (id.startsWith('_') || !ed || typeof ed !== 'object' || Array.isArray(ed)) continue;
  if (ed.include !== true) { excluded++; continue; }
  const ctx = `issue "${id}"`;

  const a = ed.applies ?? {};
  const applies = {
    from: yearOrNull(a.from, ctx, 'from'),
    to: yearOrNull(a.to, ctx, 'to'),
    coreFrom: yearOrNull(a.coreFrom, ctx, 'coreFrom'),
    coreTo: yearOrNull(a.coreTo, ctx, 'coreTo'),
    startEdge: oneOf(a.startEdge, EDGES, ctx, 'applies.startEdge', 'soft'),
    endEdge: oneOf(a.endEdge, EDGES, ctx, 'applies.endEdge', 'soft'),
  };
  if (applies.from !== null && applies.to !== null && applies.from > applies.to) fail(`${ctx}: applies.from > applies.to`);
  if (applies.coreFrom !== null && applies.coreTo !== null && applies.coreFrom > applies.coreTo) fail(`${ctx}: applies.coreFrom > applies.coreTo`);
  if (applies.coreFrom !== null && applies.from !== null && applies.coreFrom < applies.from) warn(`${ctx}: coreFrom before from`);
  if (applies.coreTo !== null && applies.to !== null && applies.coreTo > applies.to) warn(`${ctx}: coreTo after to`);

  let regions = 'national';
  if (Array.isArray(ed.regions)) {
    regions = ed.regions.map((r) => String(r).trim().toUpperCase());
    for (const r of regions) if (!STATES.has(r)) fail(`${ctx}: invalid state code "${r}" in regions`);
    if (regions.length === 0) regions = 'national';
  } else if (ed.regions !== undefined && ed.regions !== 'national') {
    fail(`${ctx}: regions must be "national" or an array of USPS codes`);
  }

  const where = Array.isArray(ed.where) ? ed.where : [];
  if (where.length === 0) fail(`${ctx}: "where" must list at least one Zone`);
  for (const z of where) if (!ZONES.has(z)) fail(`${ctx}: invalid Zone "${z}"`);

  const check = Array.isArray(ed.check) ? ed.check.filter((c) => typeof c === 'string' && c.trim()).map((c) => c.trim()) : [];
  if (check.length === 0) fail(`${ctx}: "check" needs at least one step`);

  const priority = Number(ed.priority);
  if (![1, 2, 3].includes(priority)) fail(`${ctx}: priority must be 1, 2 or 3`);

  const prev = ed.prevalence ?? {};
  const slug = str(ed.slug, ctx, 'slug', { optional: true }) ?? id;
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) fail(`${ctx}: slug "${slug}" is not kebab-case`);
  if (slugs.has(slug)) fail(`${ctx}: slug "${slug}" already used by "${slugs.get(slug)}"`);
  slugs.set(slug, id);

  const sources = sourcesFor(id, ed, ctx);
  if (sources.length === 0) fail(`${ctx}: no verified sources (needs at least one research source with "verified": true)`);

  const issue = {
    id,
    slug,
    title: str(ed.title, ctx, 'title'),
    category: oneOf(ed.category, CATEGORIES, ctx, 'category'),
    hook: str(ed.hook, ctx, 'hook'),
    summary: str(ed.summary, ctx, 'summary'),
    kind: oneOf(ed.kind, KINDS, ctx, 'kind', 'present'),
    applies,
    regions,
    severity: oneOf(ed.severity, SEVERITIES, ctx, 'severity'),
    priority,
    evidence: oneOf(ed.evidence, EVIDENCE, ctx, 'evidence'),
    prevalence: {
      label: oneOf(prev.label, PREVALENCE, ctx, 'prevalence.label', 'unknown'),
      note: typeof prev.note === 'string' ? prev.note.trim() : '',
    },
    retrofit: ed.retrofit === true,
    where,
    check,
    action: str(ed.action, ctx, 'action'),
    sources,
  };
  const caveat = str(ed.caveat, ctx, 'caveat', { optional: true });
  if (caveat) issue.caveat = caveat;
  issues.push(issue);
}
issues.sort((a, b) => a.slug.localeCompare(b.slug));

/* ---------- lifespans ---------- */
function unwrapLifespans(data) {
  if (Array.isArray(data)) return data;
  for (const k of ['lifespans', 'entries', 'items']) if (Array.isArray(data?.[k])) return data[k];
  if (data && typeof data === 'object') {
    return Object.entries(data)
      .filter(([k, v]) => !k.startsWith('_') && v && typeof v === 'object' && !Array.isArray(v))
      .map(([k, v]) => ({ id: k, ...v }));
  }
  throw new Error('lifespans content is not an array or object');
}

const lifespanContent = loadContent('lifespans');
const lifespans = [];
for (const l of unwrapLifespans(lifespanContent.data)) {
  if (l.include === false) continue;
  const ctx = `lifespan "${l.id ?? '?'}"`;
  const id = str(l.id, ctx, 'id');
  const zone = l.zone;
  if (!ZONES.has(zone)) fail(`${ctx}: invalid Zone "${zone}"`);
  const lifeLow = Number(l.lifeLow);
  const lifeHigh = Number(l.lifeHigh);
  if (!Number.isFinite(lifeLow) || !Number.isFinite(lifeHigh) || lifeLow <= 0 || lifeHigh < lifeLow) fail(`${ctx}: lifeLow/lifeHigh must be positive numbers with lifeLow <= lifeHigh`);
  const rid = l.researchId ?? l.research ?? (research.has(l.id) ? l.id : null);
  const raw = [];
  if (rid) {
    for (const r of [rid, ...(l.researchIds ?? [])]) {
      if (research.has(r)) raw.push(...(research.get(r).sources || []));
      else fail(`${ctx}: research id "${r}" not found`);
    }
  }
  if (Array.isArray(l.sources)) raw.push(...l.sources.map((s) => ({ verified: true, ...s })));
  const sources = mapSources(raw, ctx);
  if (sources.length === 0) warn(`${ctx}: no verified sources`);
  lifespans.push({ id, title: str(l.title, ctx, 'title'), zone, lifeLow, lifeHigh, note: typeof l.note === 'string' ? l.note.trim() : '', ...(l.openEnded === true ? { openEnded: true } : {}), sources });
}
lifespans.sort((a, b) => a.lifeLow - b.lifeLow || a.lifeHigh - b.lifeHigh || a.title.localeCompare(b.title));

/* ---------- output ---------- */
for (const w of warnings) console.warn(`  [build-data] warn: ${w}`);
if (errors.length) {
  console.error(`\n[build-data] FAILED with ${errors.length} problem(s) in ${rel(editorial.file)} / ${rel(lifespanContent.file)}:`);
  for (const e of errors) console.error(`  - ${e}`);
  console.error('');
  process.exit(1);
}

const outDir = path.join(ROOT, 'src', 'data');
fs.mkdirSync(outDir, { recursive: true });
const write = (name, value) => fs.writeFileSync(path.join(outDir, name), JSON.stringify(value, null, 2) + '\n');
write('issues.json', issues);
write('lifespans.json', lifespans);
write('meta.json', {
  sample: editorial.sample || lifespanContent.sample,
  editorialFile: rel(editorial.file),
  lifespansFile: rel(lifespanContent.file),
  researchFiles: researchFilesUsed,
  issueCount: issues.length,
  excludedCount: excluded,
  lifespanCount: lifespans.length,
  sourceCount: new Set(issues.flatMap((i) => i.sources.map((s) => s.url))).size,
  primarySourceCount: new Set(issues.flatMap((i) => i.sources.filter((s) => s.tier === 'primary').map((s) => s.url))).size,
});

console.log(
  `[build-data] ${issues.length} issues (${excluded} excluded), ${lifespans.length} lifespans` +
  ` from ${rel(editorial.file)} + ${rel(lifespanContent.file)}` +
  `${editorial.sample || lifespanContent.sample ? '  << SAMPLE CONTENT' : ''}`,
);
