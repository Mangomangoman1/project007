#!/usr/bin/env node
/**
 * build-era.mjs: compiles the era research into compact files the app imports at build time.
 *
 *   research/timeline.json                      dated homebuilding events (verified quotes)
 *   research/era-data/annual-construction.json  new housing units started, 1889 on; prices 1963 on
 *   research/era-data/recs-2020-by-era.json     EIA RECS 2020: roof, walls, windows by year-built band
 *   research/era-data/ahs-2023-by-era.json      Census/HUD AHS 2023: foundation, heating, rooms by decade built
 *   research/era-data/census-housing-historical.json   decennial census housing tables 1940-2000
 *   research/era-data/acs-b25034-stock-by-decade.json  ACS 2020-2024 homes by decade built
 *   research/era-data/year-built-1950-census.json      1950 census: homes by year built
 *
 * Writes src/data/era-events.json, era-construction.json, era-stock.json and era-census.json.
 * The app never reads research/ at runtime; pages pass each year only its own slice to the client.
 * Exits 1 listing every problem (event without a verified source, unknown issue slug, a share
 * table whose rows do not add up, a missing band...).
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const R = (...p) => path.join(ROOT, 'research', ...p);
const OUT = (f) => path.join(ROOT, 'src', 'data', f);
const read = (f) => JSON.parse(fs.readFileSync(f, 'utf8'));
const errors = [];
const fail = (m) => errors.push(m);
const r1 = (x) => Math.round(x * 10) / 10;

const GEO = { US: 'US', Northeast: 'NE', Midwest: 'MW', South: 'S', West: 'W' };

/* =============================================================================================
   1. Timeline events
   ============================================================================================= */

/**
 * Events that are the subject of one of the report's issues: the strip links to the issue page
 * instead of repeating its text. Only clear one-to-one matches.
 */
const EVENT_ISSUE = {
  'gravity-furnaces': 'gravity-octopus-furnace',
  'knob-and-tube-era': 'knob-and-tube-wiring',
  'edison-fuse-1890': 'fuse-box-60-amp-service',
  'vermiculite-libby-1919-1990': 'vermiculite-insulation',
  'asphalt-tile-floors': 'asbestos-floor-tile',
  'platform-framing-prevalent': 'balloon-framing',
  'rubber-insulated-cable-1922': 'cloth-covered-wiring',
  'pvc-wire-jackets-1950': 'cloth-covered-wiring',
  'stab-lok-breakers': 'federal-pacific-stab-lok-panels',
  'fpe-investigation-1980': 'federal-pacific-stab-lok-panels',
  'galvanized-to-copper': 'galvanized-water-pipes',
  'grounded-receptacles-1962': 'two-prong-outlets',
  'aluminum-branch-wiring': 'aluminum-branch-wiring',
  'aluminum-wiring-cpsc-1974': 'aluminum-branch-wiring',
  'smoke-detector-single-station-1971': 'missing-or-outdated-smoke-alarms',
  'nfpa-101-smoke-alarms-1976': 'missing-or-outdated-smoke-alarms',
  'gfci-outdoor-1973': 'missing-gfci-protection',
  'bathroom-gfci-1975': 'missing-gfci-protection',
  'gfci-kitchens-1987': 'missing-gfci-protection',
  'gfci-basements-1990': 'missing-gfci-protection',
  'model-energy-code-1970s': 'built-before-energy-codes',
  'hud-code-1976': 'pre-hud-code-mobile-homes',
  'safety-glazing-1977': 'non-tempered-glass',
  'lead-paint-ban-1978': 'lead-paint',
  'polybutylene-pipe': 'polybutylene-pipes',
  'uffi-ban-1982': 'uffi-foam-insulation',
  'lead-pipe-solder-ban-1986': 'lead-solder-copper-pipes',
  'garage-door-opener-rules-1991': 'garage-door-opener-auto-reverse',
  'epact-toilets-1992': 'high-flow-toilets',
  'hud-wind-standards-andrew': 'manufactured-homes-pre-1994-wind',
  'nec-1999-afci-fourwire': 'no-arc-fault-breakers',
  'afci-bedrooms-2002': 'no-arc-fault-breakers',
  'chinese-drywall': 'problem-chinese-drywall',
  'florida-building-code-2002': 'florida-pre-2002-wind-code',
  'cca-residential-2003': 'cca-arsenic-treated-wood',
};

const CATEGORY = new Set([
  'materials', 'policy', 'electrical', 'industry', 'codes', 'plumbing', 'hazmat', 'heating-cooling', 'event', 'fire-safety',
]);
const PRECISION = new Set(['exact', 'circa', 'range']);
const TIERS = new Set(['primary', 'trade', 'reference']);
const TIER_RANK = { primary: 0, trade: 1, reference: 2 };

function buildEvents() {
  const t = read(R('timeline.json'));
  const issues = read(OUT('issues.json'));
  const issueBySlug = new Map(issues.map((i) => [i.slug, i]));
  const ids = new Set();
  const out = [];
  for (const e of t.events) {
    const where = `timeline event ${e.id}`;
    if (ids.has(e.id)) fail(`${where}: duplicate id`);
    ids.add(e.id);
    if (!Number.isInteger(e.year) || e.year < 1800 || e.year > 2100) fail(`${where}: bad year ${e.year}`);
    if (e.yearTo !== null && e.yearTo !== undefined && !(Number.isInteger(e.yearTo) && e.yearTo >= e.year)) fail(`${where}: bad yearTo`);
    if (!PRECISION.has(e.precision)) fail(`${where}: bad precision ${e.precision}`);
    if (!CATEGORY.has(e.category)) fail(`${where}: unknown category ${e.category}`);
    if (!e.title || !e.text) fail(`${where}: missing title or text`);
    const sources = (e.sources ?? [])
      .filter((s) => s.verified === true)
      .map((s) => {
        if (!TIERS.has(s.tier)) fail(`${where}: bad tier ${s.tier}`);
        if (!/^https?:\/\//.test(s.url)) fail(`${where}: bad source url`);
        return { url: s.url, publisher: s.publisher, tier: s.tier, quote: s.quote };
      })
      .sort((a, b) => TIER_RANK[a.tier] - TIER_RANK[b.tier]);
    if (!sources.length) fail(`${where}: no verified source`);
    const issue = EVENT_ISSUE[e.id];
    if (issue && !issueBySlug.has(issue)) fail(`${where}: mapped to unknown issue ${issue}`);
    out.push({
      id: e.id,
      year: e.year,
      ...(e.yearTo ? { yearTo: e.yearTo } : {}),
      precision: e.precision,
      category: e.category,
      title: e.title,
      text: e.text,
      ...(issue ? { issue, issueTitle: issueBySlug.get(issue).title } : {}),
      sources,
    });
  }
  for (const id of Object.keys(EVENT_ISSUE)) if (!ids.has(id)) fail(`EVENT_ISSUE: no timeline event ${id}`);
  out.sort((a, b) => a.year - b.year || (a.yearTo ?? a.year) - (b.yearTo ?? b.year) || a.id.localeCompare(b.id));
  return { notes: t.notes, events: out };
}

/* =============================================================================================
   2. Annual construction
   ============================================================================================= */

function buildConstruction() {
  const a = read(R('era-data', 'annual-construction.json'));
  const rows = [...a.rows].sort((x, y) => x.year - y.year);
  const from = rows[0].year;
  const to = rows[rows.length - 1].year;
  rows.forEach((r, i) => {
    if (r.year !== from + i) fail(`annual-construction: year ${from + i} missing`);
  });
  const starts = rows.map((r) => (typeof r.starts_best_k === 'number' ? r1(r.starts_best_k) : null));
  // the year the best series switches from Historical Statistics to Census NRC
  const nrcFrom = rows.find((r) => /NRC/.test(r.starts_best_source ?? ''))?.year;
  if (nrcFrom !== 1959) fail(`annual-construction: expected the NRC series to start in 1959, got ${nrcFrom}`);
  for (const r of rows) {
    const src = r.starts_best_source ?? '';
    if (r.year < 1959 && !/Historical Statistics/.test(src)) fail(`annual-construction ${r.year}: unexpected source ${src}`);
  }
  const series = (key) => {
    const ys = rows.filter((r) => typeof r[key] === 'number');
    if (!ys.length) return null;
    const f = ys[0].year;
    const l = ys[ys.length - 1].year;
    return { from: f, values: rows.filter((r) => r.year >= f && r.year <= l).map((r) => (typeof r[key] === 'number' ? r[key] : null)) };
  };
  const oneFamily = {};
  for (const r of rows) if (typeof r.onefamily_share_pct === 'number') oneFamily[r.year] = r1(r.onefamily_share_pct);
  const dec = a.hs_decades_N192_195;
  return {
    from,
    to,
    nrcFrom,
    starts,
    medianPrice: series('nrc_new_house_median_price'),
    avgCost: series('hs_avg_cost_per_unit'),
    oneFamily,
    decades: {
      standing: dec.nonfarm_dwelling_units_standing_k,
      started: dec.decade_new_units_started_k,
      converted: dec.decade_units_added_by_conversion_k,
      demolished: dec.decade_units_demolished_or_destroyed_k,
    },
    sources: {
      hs: {
        publisher: 'US Census Bureau',
        title: 'Historical Statistics of the United States, Colonial Times to 1970, Series N 156',
        url: 'https://www2.census.gov/library/publications/1975/compendia/hist_stats_colonial-1970/hist_stats_colonial-1970p2-chN.pdf',
      },
      starts: { publisher: 'US Census Bureau', title: 'New Residential Construction, annual housing starts', url: a.source_urls.nrc_starts },
      price: { publisher: 'US Census Bureau', title: 'New Residential Sales, median sales price of new houses sold', url: a.source_urls.new_house_price },
    },
    breaks: a.series_breaks,
    fieldNotes: {
      total: a.field_notes.hs_total_k,
      avgCost: a.field_notes.hs_avg_cost_per_unit,
      nrc: a.field_notes['nrc_*'],
    },
  };
}

/* =============================================================================================
   3. Homes standing today (RECS 2020 + AHS 2023), single-family detached
   ============================================================================================= */

/**
 * Display categories: each lists the source categories it sums (exact: weighted shares add).
 * `src` = which survey; RECS for what only RECS asks (roof, walls, windows), AHS for the rest
 * (its decade bands are finer before 1950 and its sample is three times larger).
 */
const STOCK_VARS = [
  {
    id: 'roof', src: 'recs', var: 'ROOFTYPE', title: 'Roof',
    cats: [
      ['asphalt', 'Asphalt shingles', ['Composition/asphalt shingles']],
      ['metal', 'Metal', ['Metal']],
      ['wood', 'Wood shakes', ['Wood shingles/shakes']],
      ['slate', 'Slate', ['Slate or synthetic slate']],
      ['clay', 'Clay tile', ['Ceramic or clay tile']],
      ['concrete', 'Concrete tile', ['Concrete tile']],
      ['other', 'Other', ['Other']],
    ],
  },
  {
    id: 'wall', src: 'recs', var: 'WALLTYPE', title: 'Outside walls',
    cats: [
      ['siding', 'Siding', ['Siding (aluminum, fiber cement, vinyl, steel)'], 'Siding: vinyl, aluminum, fiber cement or steel'],
      ['brick', 'Brick', ['Brick']],
      ['wood', 'Wood', ['Wood']],
      ['stucco', 'Stucco', ['Stucco']],
      ['stone', 'Stone', ['Stone']],
      ['block', 'Concrete block', ['Concrete block']],
      ['other', 'Other', ['Shingle (composition)', 'Other'], 'Other, incl. composition shingle'],
    ],
  },
  {
    id: 'glass', src: 'recs', var: 'TYPEGLASS', title: 'Window glass',
    cats: [
      ['single', 'Single-pane', ['Single-pane']],
      ['double', 'Double-pane', ['Double-pane']],
      ['triple', 'Triple-pane', ['Triple-pane']],
    ],
  },
  {
    id: 'foundation', src: 'ahs', var: 'FOUNDTYPE', title: 'Foundation',
    cats: [
      ['full', 'Full basement', ['Basement under all of the house']],
      ['part', 'Part basement', ['Basement under part of the house']],
      ['crawl', 'Crawl space', ['Crawl space']],
      ['slab', 'Slab', ['Concrete slab']],
      ['other', 'Other', [
        'Mobile home set up on a masonry foundation', 'Mobile home resting on a concrete pad',
        'Mobile home up on blocks, but not on a concrete pad', 'Foundation set up in some other way',
        'Mobile home foundation not reported',
      ]],
    ],
  },
  {
    // RECS, not AHS: the AHS 2023 STORIES tabulation has no "4 or more" anywhere and puts 58% of
    // pre-1920 houses at "3 stories", which RECS (44% one, 53% two, 2% three) does not support.
    id: 'stories', src: 'recs', var: 'STORIES', title: 'Stories',
    cats: [
      ['one', '1 story', ['One story']],
      ['two', '2 stories', ['Two stories']],
      ['three', '3 or more', ['Three stories', 'Four or more stories'], '3 stories or more'],
      ['split', 'Split-level', ['Split-level']],
    ],
  },
  {
    id: 'fuel', src: 'ahs', var: 'HEATFUEL', title: 'Main heating fuel',
    cats: [
      ['gas', 'Gas', ['Piped gas'], 'Piped gas'],
      ['electric', 'Electricity', ['Electricity']],
      ['oil', 'Oil', ['Fuel oil', 'Kerosene or other liquid fuel'], 'Fuel oil or kerosene'],
      ['propane', 'Propane', ['Liquefied petroleum gas'], 'Propane (bottled gas)'],
      ['wood', 'Wood', ['Wood']],
      ['other', 'Other', ['Coal or coke', 'Solar energy', 'Other', 'None'], 'Coal, solar, other or none'],
    ],
  },
  {
    id: 'heating', src: 'ahs', var: 'HEATTYPE', title: 'Main heating equipment',
    cats: [
      ['furnace', 'Furnace', ['Forced warm-air furnace'], 'Forced warm-air furnace'],
      ['boiler', 'Boiler', ['Steam or hot water system'], 'Boiler (steam or hot water)'],
      ['heatpump', 'Heat pump', ['Electric heat pump']],
      ['baseboard', 'Electric baseboard', ['Built-in electric baseboard, electric coils']],
      ['room', 'Wall or room heater', ['Floor, wall, other pipeless furnace', 'Vented room heaters', 'Unvented room heater(s)'], 'Floor, wall or room heater'],
      ['stove', 'Stove or fireplace', ['Wood burning, pot belly, Franklin stove', 'Fireplace with inserts', 'Fireplace without inserts', 'Cooking stove used for heating'], 'Wood stove or fireplace'],
      ['other', 'Other or none', ['Portable electric heater(s)', 'Other', 'None'], 'Portable heaters, other or none'],
    ],
  },
  {
    id: 'cooling', src: 'ahs', var: 'AIRCON', title: 'Air-conditioning',
    cats: [
      ['central', 'Central air', ['Central air']],
      ['room', 'Room units only', ['Room unit(s) only']],
      ['none', 'None', ['No air conditioning'], 'No air-conditioning'],
    ],
  },
  {
    id: 'baths', src: 'ahs', var: 'BATHROOMS', title: 'Bathrooms',
    cats: [
      ['none', 'No full bath', ['No full bath: sink and toilet present', 'No full bath: tub and toilet present', 'No full bath: toilet only', 'No full bath: no sink, tub or toilet']],
      ['one', '1', ['One full bathroom'], 'One full bathroom'],
      ['oneHalf', '1½', ['1.5 bathrooms'], 'One and a half'],
      ['two', '2', ['2 full bathrooms'], 'Two full bathrooms'],
      ['twoHalf', '2½', ['2.5 bathrooms'], 'Two and a half'],
      ['three', '3+', ['3 full bathrooms', 'More than 3 full bathrooms'], 'Three or more'],
    ],
  },
  {
    id: 'fireplace', src: 'ahs', var: 'FIREPLACE', title: 'Fireplace',
    cats: [
      ['yes', 'Usable fireplace', ['Usable fireplace']],
      ['no', 'None', ['No usable fireplace'], 'No usable fireplace'],
    ],
  },
  {
    id: 'size', src: 'ahs', var: 'UNITSIZE', title: 'Size',
    cats: [
      ['lt1000', 'Under 1,000', ['Less than 500 square feet', '500 to 749 square feet', '750 to 999 square feet'], 'Under 1,000 sq ft'],
      ['s1000', '1,000–1,499', ['1,000 to 1,499 square feet'], '1,000 to 1,499 sq ft'],
      ['s1500', '1,500–1,999', ['1,500 to 1,999 square feet'], '1,500 to 1,999 sq ft'],
      ['s2000', '2,000–2,499', ['2,000 to 2,499 square feet'], '2,000 to 2,499 sq ft'],
      ['s2500', '2,500+', ['2,500 to 2,999 square feet', '3,000 to 3,999 square feet', '4,000 square feet or more'], '2,500 sq ft or more'],
    ],
  },
  {
    id: 'garage', src: 'ahs', var: 'GARAGE', title: 'Garage or carport',
    cats: [
      ['yes', 'Garage or carport', ['Has garage or carport']],
      ['no', 'Neither', ['No garage or carport'], 'No garage or carport'],
    ],
  },
];

/** Bands with fewer sampled homes than this are never shown (the research files suppress below 30 too). */
const MIN_N = 30;

function buildStock() {
  const recs = read(R('era-data', 'recs-2020-by-era.json'));
  const ahs = read(R('era-data', 'ahs-2023-by-era.json'));
  const tabs = {
    recs: recs.microdata_tabulation.shares.single_family_detached,
    ahs: ahs.shares.single_family_detached,
  };
  const bands = { recs: recs.microdata_tabulation.meta.bands, ahs: ahs.meta.bands };
  const vars = STOCK_VARS.map((spec) => {
    const out = {
      id: spec.id,
      src: spec.src,
      title: spec.title,
      cats: spec.cats.map(([id, label, , long]) => ({ id, label, ...(long ? { long } : {}) })),
      data: {},
    };
    for (const [geoName, geo] of Object.entries(GEO)) {
      const t = tabs[spec.src][geoName]?.[spec.var];
      if (!t) {
        fail(`${spec.src} ${geoName} ${spec.var}: missing`);
        continue;
      }
      const used = new Set();
      const idx = spec.cats.map(([id, , from]) =>
        from.map((c) => {
          const i = t.categories.indexOf(c);
          if (i < 0) fail(`${spec.src} ${spec.var}: no category "${c}" (for ${id})`);
          used.add(c);
          return i;
        }),
      );
      for (const c of t.categories) if (!used.has(c)) fail(`${spec.src} ${spec.var}: category "${c}" not mapped`);
      out.data[geo] = {};
      for (const band of bands[spec.src]) {
        const b = t.bands[band];
        if (b === undefined) {
          fail(`${spec.src} ${geoName} ${spec.var}: band ${band} missing`);
          continue;
        }
        if (typeof b === 'string' || b.n < MIN_N) {
          out.data[geo][band] = null; // suppressed
          continue;
        }
        const shares = idx.map((is) => r1(is.reduce((s, i) => s + b.cells[i][0], 0)));
        const sum = shares.reduce((s, x) => s + x, 0);
        if (Math.abs(sum - 100) > 1.5) fail(`${spec.src} ${geoName} ${spec.var} ${band}: shares add to ${sum}`);
        out.data[geo][band] = { n: b.n, v: shares };
      }
    }
    return out;
  });
  const recsMeans = recs.microdata_tabulation.means.single_family_detached;
  const sqft = {};
  for (const [geoName, geo] of Object.entries(GEO)) {
    sqft[geo] = {};
    for (const band of bands.recs) {
      const m = recsMeans[geoName]?.TOTSQFT_EN?.[band];
      sqft[geo][band] = m && m[2] >= MIN_N ? { mean: Math.round(m[0]), n: m[2] } : null;
    }
  }
  return {
    bands,
    vars,
    recsSqft: sqft,
    sources: {
      recs: {
        publisher: 'US Energy Information Administration',
        title: 'Residential Energy Consumption Survey 2020, public microdata',
        url: 'https://www.eia.gov/consumption/residential/data/2020/',
        universe: recs.microdata_tabulation.meta.universe,
        caveats: recs.caveats,
        homes: recs.microdata_tabulation.meta.total_homes_sampled,
      },
      ahs: {
        publisher: 'US Census Bureau and HUD',
        title: 'American Housing Survey 2023, national public use file',
        url: 'https://www2.census.gov/programs-surveys/ahs/2023/',
        paper: ahs.source_urls.sarkar_2011_paper,
        universe: ahs.meta.universe,
        caveats: ahs.caveats,
        homes: ahs.meta.rows,
      },
    },
  };
}

/* =============================================================================================
   4. The country that decade (decennial census, ACS stock, 1950 year built)
   ============================================================================================= */

const FUELS = [
  ['gas', 'utility_gas_pct'],
  ['bottled', 'bottled_tank_lp_gas_pct'],
  ['electric', 'electricity_pct'],
  ['oil', 'oil_kerosene_pct'],
  ['coal', 'coal_coke_pct'],
  ['wood', 'wood_pct'],
  ['other', 'other_fuel_pct'],
  ['none', 'no_fuel_pct'],
];

function buildCensus() {
  const c = read(R('era-data', 'census-housing-historical.json'));
  const acs = read(R('era-data', 'acs-b25034-stock-by-decade.json'));
  const yb = read(R('era-data', 'year-built-1950-census.json'));
  const years = {};
  const geos = Object.keys(c.plumbing.years['1940']);
  for (const y of ['1940', '1950', '1960', '1970', '1980', '1990', '2000']) {
    years[y] = {};
    for (const g of geos) {
      const p = c.plumbing.years[y]?.[g];
      const f = c.house_heating_fuel.years[y]?.[g];
      const s = c.sewage_disposal.years[y]?.[g];
      const w = c.source_of_water.years[y]?.[g];
      const row = {};
      if (p && typeof p.lacking_pct === 'number') row.plumb = p.lacking_pct;
      if (s && typeof s.no_flush_toilet_pct === 'number') row.noFlush = s.no_flush_toilet_pct;
      if (s && typeof s.public_sewer_pct === 'number') row.sewer = [s.public_sewer_pct, s.septic_cesspool_pct, s.other_means_pct];
      if (w && typeof w.public_or_private_company_pct === 'number') row.water = [w.public_or_private_company_pct, w.individual_well_pct, w.other_source_pct];
      if (f) {
        const fuels = FUELS.map(([, k]) => (typeof f[k] === 'number' ? f[k] : null));
        if (fuels.some((v) => v !== null)) row.fuel = fuels;
      }
      if (Object.keys(row).length) years[y][g] = row;
    }
    if (!years[y].US) fail(`census ${y}: no US row`);
  }
  if (years['1940'].US.plumb !== 45.3) fail('census: 1940 US lacking plumbing should be 45.3');
  if (years['1950'].US.fuel[4] !== 34.6) fail('census: 1950 US coal should be 34.6');
  const own = c.homeownership_rate.rates;

  const STATE_FIPS = {};
  const stock = {};
  for (const [id, g] of Object.entries(acs.geos)) {
    let key = null;
    if (g.sumlevel === '010') key = 'US';
    else if (g.sumlevel === '020') key = { 1: 'NE', 2: 'MW', 3: 'S', 4: 'W' }[id.slice(-1)];
    else if (g.sumlevel === '040') {
      key = FIPS[g.state_fips];
      STATE_FIPS[key] = g.state_fips;
    }
    if (!key) {
      fail(`acs: unknown geo ${id}`);
      continue;
    }
    const sum = g.counts.reduce((s, x) => s + x, 0);
    if (Math.abs(sum - g.total_housing_units) > 2) fail(`acs ${key}: counts add to ${sum}, total ${g.total_housing_units}`);
    // oldest first, like the place data
    stock[key] = { total: g.total_housing_units, counts: [...g.counts].reverse(), share: [...g.share_pct].reverse(), median: g.median_year_built };
  }
  if (stock.US?.counts[1] !== 6354040) fail('acs: US 1940s count should be 6,354,040');

  return {
    censusYears: Object.keys(years).map(Number),
    fuels: FUELS.map(([id]) => id),
    years,
    notes: {
      plumbing: c.plumbing.notes,
      fuel: c.house_heating_fuel.notes,
      sewage: c.sewage_disposal.notes,
      water: c.source_of_water.notes,
      general: c.notes,
    },
    ownership: own,
    stock: {
      labels: [...acs.labels].reverse(),
      vintage: acs.vintage,
      notes: acs.notes,
      geos: stock,
    },
    yearBuilt1950: {
      bands: [...yb.bands].reverse(),
      US: [...yb.US.pct].reverse(),
      regions: Object.fromEntries(
        Object.entries(yb.regions).map(([name, counts]) => {
          const rev = [...counts].reverse();
          const total = rev.reduce((s, x) => s + x, 0);
          return [{ Northeast: 'NE', 'North Central': 'MW', South: 'S', West: 'W' }[name], rev.map((x) => r1((x / total) * 100))];
        }),
      ),
      note: yb.note,
    },
    sources: {
      census: {
        publisher: 'US Census Bureau',
        title: 'Historical Census of Housing Tables',
        url: 'https://www.census.gov/data/tables/time-series/dec/coh-plumbing.html',
        pages: {
          plumbing: 'https://www.census.gov/data/tables/time-series/dec/coh-plumbing.html',
          fuel: 'https://www.census.gov/data/tables/time-series/dec/coh-fuels.html',
          sewage: 'https://www.census.gov/data/tables/time-series/dec/coh-sewage.html',
          water: 'https://www.census.gov/data/tables/time-series/dec/coh-water.html',
          owner: 'https://www.census.gov/data/tables/time-series/dec/coh-owner.html',
        },
      },
      acs: {
        publisher: 'US Census Bureau',
        title: 'American Community Survey 2020-2024 5-year estimates, table B25034',
        url: 'https://www2.census.gov/programs-surveys/acs/summary_file/2024/table-based-SF/data/5YRData/acsdt5y2024-b25034.dat',
      },
      yb1950: {
        publisher: 'US Census Bureau',
        title: '1950 Census of Housing, Vol. 1, Part 1, Tables 6 and 20',
        url: 'https://www2.census.gov/library/publications/decennial/1950/housing-volume-1/36965082v1p1ch1.pdf',
      },
    },
  };
}

const FIPS = {
  '01': 'AL', '02': 'AK', '04': 'AZ', '05': 'AR', '06': 'CA', '08': 'CO', '09': 'CT', '10': 'DE', '11': 'DC',
  '12': 'FL', '13': 'GA', '15': 'HI', '16': 'ID', '17': 'IL', '18': 'IN', '19': 'IA', '20': 'KS', '21': 'KY',
  '22': 'LA', '23': 'ME', '24': 'MD', '25': 'MA', '26': 'MI', '27': 'MN', '28': 'MS', '29': 'MO', '30': 'MT',
  '31': 'NE', '32': 'NV', '33': 'NH', '34': 'NJ', '35': 'NM', '36': 'NY', '37': 'NC', '38': 'ND', '39': 'OH',
  '40': 'OK', '41': 'OR', '42': 'PA', '44': 'RI', '45': 'SC', '46': 'SD', '47': 'TN', '48': 'TX', '49': 'UT',
  '50': 'VT', '51': 'VA', '53': 'WA', '54': 'WV', '55': 'WI', '56': 'WY', '72': 'PR',
};

/* ============================================================================================= */

const files = {
  'era-events.json': buildEvents(),
  'era-construction.json': buildConstruction(),
  'era-stock.json': buildStock(),
  'era-census.json': buildCensus(),
};

if (errors.length) {
  console.error(`build-era: ${errors.length} problem(s):\n  - ${errors.join('\n  - ')}`);
  process.exit(1);
}
for (const [name, data] of Object.entries(files)) {
  const text = JSON.stringify(data);
  const file = OUT(name);
  const prev = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : null;
  if (prev !== text) fs.writeFileSync(file, text);
  console.log(`build-era: ${name} ${(text.length / 1024).toFixed(1)} KB${prev === text ? ' (unchanged)' : ''}`);
}
