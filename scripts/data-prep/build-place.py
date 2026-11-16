#!/usr/bin/env python3
"""
Build the "Your place" data: public/place/*.json from public US government files.

    python3 -I scripts/data-prep/build-place.py            # download what is missing, then build
    python3 -I scripts/data-prep/build-place.py --refresh  # re-download everything first

Needs: Python 3.9+, curl, and pdftotext (poppler-utils) for the climate-zone PDF.
Downloads (~135 MB, once) go to scripts/data-prep/.cache/place/ (gitignored). The site build never runs
this and never touches the network: it only serves the files this script writes.

Output (all committed):
  public/place/manifest.json        sources, URLs, vintages, generation date, counts, record layout
  public/place/counties.json        county facts keyed by 5-digit FIPS
  public/place/zip/<3 digits>.json  ZCTA records keyed by 5-digit ZIP, one file per ZIP prefix

ZCTA record (positional, to keep ~33,000 records small):
  [county_fips, county_land_share_pct, n_counties, units, median_year|null, bins|null, occupied, fuel|null]
  bins = 10 integer percents of housing units by year built, OLDEST FIRST:
         1939-or-earlier, 1940s, 1950s, 1960s, 1970s, 1980s, 1990s, 2000s, 2010s, 2020-or-later
         (largest-remainder rounded so they sum to 100); null when units < MIN_UNITS.
  fuel = 7 integer percents of occupied units by main heating fuel:
         utility gas, bottled/tank gas (propane), electricity, fuel oil/kerosene, wood,
         other (coal, solar, other), no fuel used; null when occupied < MIN_UNITS.
  median_year is null when the ACS has no estimate or units < MIN_UNITS.
County record (positional): [name, radon zone 1-3 | null, climate | null, firm | null, acs | null]
  (trailing nulls dropped; the state comes from the first two FIPS digits).
  climate = "<IECC zone digit><moisture A/B/C or -><Building America region code: H hot-humid,
    D hot-dry, M mixed-humid, X mixed-dry, N marine, C cold, V very cold, S subarctic>", e.g. "4AM".
  firm = [earliest, median, latest initial-FIRM year, number of community-county pairs].
  acs = county fallback [units, median, bins, occupied, fuel], same layout as the ZCTA part; only
    for counties some ZCTA needs as a fallback, never Connecticut (ACS 2024 uses planning regions).
"""
import csv
import datetime
import io
import json
import os
import re
import shutil
import statistics
import subprocess
import sys
import unicodedata
from collections import defaultdict

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
CACHE = os.path.join(ROOT, 'scripts', 'data-prep', '.cache', 'place')
OUT = os.path.join(ROOT, 'public', 'place')

ACS_BASE = 'https://www2.census.gov/programs-surveys/acs/summary_file/2024/table-based-SF/data/5YRData/'
SOURCES = {
    'b25034': ACS_BASE + 'acsdt5y2024-b25034.dat',
    'b25035': ACS_BASE + 'acsdt5y2024-b25035.dat',
    'b25040': ACS_BASE + 'acsdt5y2024-b25040.dat',
    'rel': 'https://www2.census.gov/geo/docs/maps-data/data/rel2020/zcta520/tab20_zcta520_county20_natl.txt',
    'counties': 'https://www2.census.gov/geo/docs/reference/codes2020/national_county2020.txt',
    'radon': 'https://www.epa.gov/system/files/other-files/2024-06/radon-zones-202406.json',
    'climate': 'https://www.energy.gov/sites/prod/files/2015/10/f27/ba_climate_region_guide_7.3.pdf',
    'nfip': 'https://www.fema.gov/api/open/v1/NfipCommunityStatusBook.csv',
}
OPTIONAL = {'nfip'}  # the build carries on without these if the host refuses

# Below this many housing units (or occupied units, for fuel) shares are suppressed: ACS margins
# of error swamp the estimate.
MIN_UNITS = 100
THIS_YEAR = datetime.date.today().year


def log(*a):
    print(*a, file=sys.stderr)


# ---------------------------------------------------------------- download
def fetch(name, refresh):
    url = SOURCES[name]
    ext = os.path.splitext(url)[1] or '.dat'
    path = os.path.join(CACHE, name + ext)
    if os.path.exists(path) and os.path.getsize(path) > 0 and not refresh:
        return path
    os.makedirs(CACHE, exist_ok=True)
    tmp = path + '.part'
    log(f'downloading {name}: {url}')
    r = subprocess.run(['curl', '-sL', '--fail', '-o', tmp, url])
    if r.returncode != 0 or not os.path.exists(tmp) or os.path.getsize(tmp) < 1000:
        if os.path.exists(tmp):
            os.remove(tmp)
        msg = f'download failed for {name} ({url}), curl exit {r.returncode}'
        if name in OPTIONAL:
            log('WARNING: ' + msg + '; carrying on without it')
            return None
        sys.exit('ERROR: ' + msg)
    os.replace(tmp, path)
    return path


def read_text(path):
    with open(path, encoding='utf-8-sig') as f:
        return f.read()


# ---------------------------------------------------------------- counties (FIPS list)
def norm(s):
    s = unicodedata.normalize('NFKD', s)
    s = ''.join(ch for ch in s if not unicodedata.combining(ch))
    s = s.lower().replace('.', '').replace("'", '')
    return re.sub(r'\s+', ' ', s).strip()


SUFFIXES = (' city and borough', ' census area', ' municipality', ' borough', ' county', ' parish', ' municipio')


def bare(s):
    """'Autauga County' -> 'autauga'; 'Alexandria city' -> 'alexandria city' (cities keep 'city')."""
    s = norm(s)
    for suf in SUFFIXES:
        if s.endswith(suf):
            return s[: -len(suf)]
    return s


def load_counties(path):
    rows = list(csv.DictReader(io.StringIO(read_text(path)), delimiter='|'))
    counties = {}
    by_full = {}
    by_bare = defaultdict(list)
    for r in rows:
        fips = r['STATEFP'] + r['COUNTYFP']
        counties[fips] = {'n': r['COUNTYNAME'], 's': r['STATE']}
        by_full[(r['STATE'], norm(r['COUNTYNAME']))] = fips
        by_bare[(r['STATE'], bare(r['COUNTYNAME']))].append(fips)
    return counties, by_full, by_bare


# ---------------------------------------------------------------- ACS
def read_acs(path, cols):
    """{geo_key: [values]} for ZCTA ('z', zip) and county ('c', fips) rows. Negative or blank = None."""
    out = {}
    with open(path, encoding='utf-8-sig') as f:
        rd = csv.reader(f, delimiter='|')
        head = next(rd)
        idx = [head.index(c) for c in cols]
        for row in rd:
            g = row[0]
            if g.startswith('860Z200US'):
                key = ('z', g[9:])
            elif g.startswith('0500000US'):
                key = ('c', g[9:])
            else:
                continue
            vals = []
            for i in idx:
                v = row[i] if i < len(row) else ''
                try:
                    n = int(float(v))
                    vals.append(n if n >= 0 else None)
                except ValueError:
                    vals.append(None)
            out[key] = vals
    return out


def pct_round(parts, total):
    """Integer percents that sum to 100 (largest remainder)."""
    if not total:
        return None
    raw = [100 * (p or 0) / total for p in parts]
    fl = [int(x) for x in raw]
    left = 100 - sum(fl)
    order = sorted(range(len(raw)), key=lambda i: raw[i] - fl[i], reverse=True)
    for i in order[: max(0, left)]:
        fl[i] += 1
    return fl


def acs_record(b34, b35, b40):
    """[units, median|None, bins|None, occupied, fuel|None] or None if there is no usable estimate."""
    if b34 is None or not b34[0]:
        return None
    units = b34[0]
    small = units < MIN_UNITS
    bins = None if small else pct_round(list(reversed(b34[1:11])), units)  # oldest first
    median = None
    if b35 and b35[0] and not small:
        median = b35[0]
    occ, fuel = 0, None
    if b40 and b40[0]:
        occ = b40[0]
        e = b40
        # E002 gas, E003 propane, E004 elec, E005 oil, E006 coal, E007 wood, E008 solar, E009 other, E010 none
        parts = [e[1], e[2], e[3], e[4], e[6], (e[5] or 0) + (e[7] or 0) + (e[8] or 0), e[9]]
        if occ >= MIN_UNITS:
            fuel = pct_round(parts, occ)
    return [units, median, bins, occ, fuel]


# ---------------------------------------------------------------- ZCTA -> county
def load_rel(path):
    """{zcta: (dominant_fips, land_share_pct, n_counties)} by land area of each part."""
    parts = defaultdict(list)
    rd = csv.DictReader(io.StringIO(read_text(path)), delimiter='|')
    for r in rd:
        z = r['GEOID_ZCTA5_20'].strip()
        if not z:
            continue  # county pieces with no ZCTA
        parts[z].append((int(r['AREALAND_PART'] or 0), r['GEOID_COUNTY_20']))
    out = {}
    for z, ps in parts.items():
        total = sum(a for a, _ in ps)
        a, fips = max(ps)
        share = round(100 * a / total) if total else 100
        n = len([1 for x, _ in ps if x > 0]) or 1
        out[z] = (fips, share, n)
    return out


# ---------------------------------------------------------------- radon (EPA)
RADON_FIX = {
    # EPA label (state, COUNTY LABEL) -> FIPS list. Alaska renames/splits, spellings, DC.
    ('AK', 'Prince of Wales-Outer Ketchikan Census Area'): ['02198'],
    ('AK', 'Valdez-Cordova Census Area'): ['02063', '02066'],
    ('AK', 'Wade Hampton Census Area'): ['02158'],
    ('AK', 'Wrangell-Petersburg Census Area'): ['02195', '02275'],
    ('AK', 'Skagway Municipality'): ['02230', '02105'],  # Hoonah-Angoon has no EPA row: same area
    ('LA', 'La Salle Parish'): ['22059'],
    ('NM', 'Dona Ana County'): ['35013'],
    ('SD', 'Shannon County'): ['46102'],
}
RADON_DROP = {('MT', 'Yellowstone National Park')}
# Virginia cities merged into a county: never overwrite the county's own zone.
VA_MERGED = {'bedford', 'clifton forge', 'south boston'}


def load_radon(path, by_full, by_bare):
    data = json.loads(read_text(path))['data']
    zones, misses = {}, []
    pending = []
    for r in data:
        z = (r.get('Zone') or '').strip()
        if z not in ('1', '2', '3'):
            continue
        cs = r['County,State']
        st = cs.rsplit(',', 1)[1].strip() if ',' in cs else ''
        label = r['COUNTY LABEL'].strip()
        if r['STATE'].strip() == 'District of Columbia' or st in ('DC', 'District of Columbia'):
            pending.append((['11001'], int(z)))
            continue
        if (st, label) in RADON_DROP or 'National Park' in cs or 'National Park' in label:
            continue
        if (st, label) in RADON_FIX:
            pending.append((RADON_FIX[(st, label)], int(z)))
            continue
        f = by_full.get((st, norm(label)))
        if not f and st == 'VA':
            name = norm(cs.rsplit(',', 1)[0])
            if name in VA_MERGED:
                continue
            f = by_full.get((st, name + ' city'))
        if f:
            pending.append(([f], int(z)))
        else:
            misses.append(cs + ' / ' + label)
    for fl, z in pending:
        for f in fl:
            if f in zones and zones[f] != z:
                log(f'note: radon conflict for {f}: {zones[f]} vs {z}; keeping first')
                continue
            zones.setdefault(f, z)
    return zones, misses


# ---------------------------------------------------------------- climate (DOE/PNNL 2015 table)
REGIONS = 'Hot-Humid|Hot-Dry|Mixed-Humid|Mixed-Dry|Marine|Very Cold|Cold|Subarctic'
ROW = re.compile(r'\b([A-Z]{2})\s{2,}(\S.*?)\s{2,}(' + REGIONS + r')\s+([1-8])(?:\s+(A|B|C|N/A))?(?=\s{2,}|\s*$)')
# Building America region -> one-letter code in counties.json (decoded in src/lib/place.ts).
REGION_CODE = {'Hot-Humid': 'H', 'Hot-Dry': 'D', 'Mixed-Humid': 'M', 'Mixed-Dry': 'X', 'Marine': 'N',
               'Cold': 'C', 'Very Cold': 'V', 'Subarctic': 'S'}
CLIMATE_FIX = {
    # 2015 PDF names that wrap, abbreviate or predate a rename -> FIPS.
    ('AK', 'Fairbanks North'): ['02090'],
    ('AK', 'Northwest'): ['02188'],
    ('AK', 'Prince of Wales-'): ['02198'],
    ('AK', 'Skagway-Hoonah-'): ['02230', '02105'],
    ('AK', 'Southeast Fair-'): ['02240'],
    ('AK', 'Valdez-Cordova'): ['02063', '02066'],
    ('AK', 'Wade Hampton'): ['02158'],
    ('AK', 'Wrangell-Pe-'): ['02195', '02275'],
    ('IL', 'DeWitt'): ['17039'],
    ('LA', 'La Salle'): ['22059'],
    ('LA', 'St. John the'): ['22095'],
    ('LA', 'St. LanB'): ['22097'],
    ('NV', 'Carson City (city)'): ['32510'],
    ('SD', 'Shannon'): ['46102'],
}


def load_climate(path, by_full, by_bare):
    txt_path = path + '.txt'
    if not os.path.exists(txt_path) or os.path.getmtime(txt_path) < os.path.getmtime(path):
        if not shutil.which('pdftotext'):
            sys.exit('ERROR: pdftotext (poppler-utils) is needed to read the climate-zone PDF')
        subprocess.run(['pdftotext', '-q', '-layout', path, txt_path], check=True)
    rows = []
    for line in read_text(txt_path).splitlines():
        for m in ROW.finditer(line):
            rows.append(m.groups())
    out, misses = {}, []
    for st, name, region, zone, moist in rows:
        name = re.sub(r'\s+', ' ', name).strip()
        key = (st, name)
        if key in CLIMATE_FIX:
            fl = CLIMATE_FIX[key]
        else:
            is_city = name.endswith('(city)')
            base = re.sub(r'\s*\((city|CA\*?|CA)\)\s*$', '', name)
            if st == 'VA' and is_city and norm(base) in VA_MERGED:
                continue
            f = None
            if is_city:
                f = by_full.get((st, norm(base) + ' city'))
            else:
                c = by_bare.get((st, bare(base)), [])
                c = [x for x in c if not by_full_is_city(x, by_full)] or c
                f = c[0] if len(c) == 1 else None
                if not f and st == 'VA':
                    if norm(base) in VA_MERGED:
                        continue
                    f = by_full.get((st, norm(base) + ' city'))
            if not f:
                misses.append(f'{st} {name}')
                continue
            fl = [f]
        m = '-' if moist in (None, 'N/A') else moist
        for f in fl:
            out.setdefault(f, zone + m + REGION_CODE[region])
    return out, misses, len(rows)


_CITY_FIPS = set()


def by_full_is_city(fips, by_full):
    if not _CITY_FIPS:
        for (st, n), f in by_full.items():
            if n.endswith(' city'):
                _CITY_FIPS.add(f)
    return fips in _CITY_FIPS


# ---------------------------------------------------------------- NFIP (FEMA)
def nfip_name_candidates(s):
    s = norm(s)
    yield s
    for suf in SUFFIXES:
        if s.endswith(suf):
            yield s[: -len(suf)]


# Truncated or pre-rename Alaska names in the NFIP file (prefix of the normalised name -> FIPS).
# Split areas go to the larger successor; the summary is a county range, so this is context only.
NFIP_FIX = {'AK': {'skagway-hoonah-angoon': '02230', 'southeast fairbanks': '02240',
                   'valdez-cordova': '02063', 'wade hampton': '02158', 'wrangell-petersburg': '02275'}}


def load_nfip(path, by_full, by_bare):
    years = defaultdict(list)
    misses = set()
    refresh = ''
    dropped = 0
    with open(path, encoding='utf-8-sig') as f:
        for r in csv.DictReader(f):
            refresh = max(refresh, r.get('lastRefresh', '')[:10])
            d = (r.get('initialFloodInsuranceRateMap') or '')[:4]
            if not d.isdigit():
                continue
            y = int(d)
            if y < 1968 or y > THIS_YEAR:  # NFIP began in 1968; later years are typos or not yet in effect
                dropped += 1
                continue
            st = r['state'].strip()
            for part in re.split(r'[/,]', r['county'] or ''):
                part = part.strip()
                if not part:
                    continue
                fips = None
                for cand in nfip_name_candidates(part):
                    fips = by_full.get((st, cand))
                    if fips:
                        break
                    c = by_bare.get((st, cand), [])
                    if len(c) == 1:
                        fips = c[0]
                        break
                if not fips:
                    for prefix, f2 in NFIP_FIX.get(st, {}).items():
                        if norm(part).startswith(prefix):
                            fips = f2
                if not fips and st == 'LA' and 'la salle' in norm(part):
                    fips = '22059'
                if not fips and st == 'IL' and 'la salle' in norm(part):
                    fips = '17099'
                if fips:
                    years[fips].append(y)
                else:
                    misses.add(f'{st} {part}')
    out = {}
    for fips, ys in years.items():
        out[fips] = [min(ys), int(statistics.median_low(ys)), max(ys), len(ys)]
    return out, sorted(misses), refresh, dropped


# ---------------------------------------------------------------- main
def main():
    refresh = '--refresh' in sys.argv
    paths = {k: fetch(k, refresh) for k in SOURCES}

    counties, by_full, by_bare = load_counties(paths['counties'])
    log(f'counties: {len(counties)}')

    log('reading ACS tables...')
    b34 = read_acs(paths['b25034'], [f'B25034_E{i:03d}' for i in range(1, 12)])
    b35 = read_acs(paths['b25035'], ['B25035_E001'])
    b40 = read_acs(paths['b25040'], [f'B25040_E{i:03d}' for i in range(1, 11)])
    rel = load_rel(paths['rel'])
    log(f'ZCTAs in relationship file: {len(rel)}')

    radon, radon_miss = load_radon(paths['radon'], by_full, by_bare)
    log(f'radon: {len(radon)} counties; unmatched: {radon_miss}')
    climate, climate_miss, climate_rows = load_climate(paths['climate'], by_full, by_bare)
    log(f'climate: {climate_rows} rows parsed, {len(climate)} counties; unmatched: {climate_miss}')
    nfip, nfip_refresh, nfip_miss, nfip_dropped = {}, None, [], 0
    if paths.get('nfip'):
        nfip, nfip_miss, nfip_refresh, nfip_dropped = load_nfip(paths['nfip'], by_full, by_bare)
        log(f'nfip: {len(nfip)} counties; {nfip_dropped} impossible years dropped; unmatched names: {nfip_miss}')

    # ZCTA records
    zips = {}
    need_fallback = set()
    no_acs = 0
    for z, (fips, share, n) in rel.items():
        a = acs_record(b34.get(('z', z)), b35.get(('z', z)), b40.get(('z', z)))
        if a is None:
            no_acs += 1
            a = [0, None, None, 0, None]
        if a[2] is None or a[4] is None:
            need_fallback.add(fips)
        zips[z] = [fips, share, n] + a

    # County facts
    county_out = {}
    used = {v[0] for v in zips.values()}
    for fips in sorted(used | set(radon) | set(climate) | set(nfip)):
        c = counties.get(fips)
        if not c:
            continue
        rec = {'n': c['n'], 's': c['s']}
        if fips in radon:
            rec['r'] = radon[fips]
        if fips in climate:
            rec['cz'] = climate[fips]
        if fips in nfip:
            rec['f'] = nfip[fips]
        if fips in need_fallback and not fips.startswith('09'):
            a = acs_record(b34.get(('c', fips)), b35.get(('c', fips)), b40.get(('c', fips)))
            if a and a[2]:
                rec['a'] = a
        county_out[fips] = rec

    # ---- sanity assertions on known places (fail loudly)
    def check(cond, msg):
        if not cond:
            sys.exit('SANITY CHECK FAILED: ' + msg)

    check(zips['10001'][0] == '36061', '10001 is in New York County')
    check(county_out['36061']['cz'][:2] == '4A', 'New York County is climate zone 4A')
    check(zips['33101'][0] == '12086' if '33101' in zips else zips['33125'][0] == '12086', 'Miami ZIP is Miami-Dade')
    check(county_out['12086']['cz'][:2] == '1A', 'Miami-Dade is 1A')
    check(county_out['12086'].get('r') == 2, 'Miami-Dade radon zone 2')
    check(zips['22301'][0] == '51510', '22301 is Alexandria city VA')
    check('r' in county_out['51510'] and 'cz' in county_out['51510'], 'Alexandria city has radon + climate')
    check(zips['06105'][0] == '09003', '06105 is Hartford County CT (2020 county)')
    check(county_out['09003'].get('r') in (1, 2, 3), 'Hartford County has a radon zone')
    check(zips['99501'][0] == '02020', '99501 is Anchorage')
    check(county_out['02020']['cz'][0] == '7', 'Anchorage is zone 7')
    check(county_out['02105'].get('r') == county_out['02230'].get('r'), 'Hoonah-Angoon copies Skagway radon')
    check(county_out['01001'].get('cz', '')[:3] == '3AH', 'Autauga AL is 3A')
    check(county_out['06037'].get('cz', '')[:3] == '3BD', 'Los Angeles is 3B')
    check(county_out['23003'].get('cz', '')[:2] == '7-', 'Aroostook ME is zone 7')
    check(zips['00601'][3] > 7000 and zips['00601'][4] == 1979, '00601 units/median')
    check(sum(zips['10001'][5]) == 100, 'bins sum to 100')
    check(len(radon) >= 3140, f'radon coverage {len(radon)}')
    check(len(climate) >= 3140, f'climate coverage {len(climate)}')
    check(not radon_miss, f'radon unmatched {radon_miss}')
    check(not climate_miss, f'climate unmatched {climate_miss}')
    if nfip:
        check(county_out['01001']['f'][0] == 1978, 'Autauga earliest FIRM 1978')
        check(all(v[2] <= THIS_YEAR for v in nfip.values()), 'no future FIRM years')
    us_counties = [f for f in counties if f[:2] not in ('60', '66', '69', '72', '74', '78')]
    no_radon = [f for f in us_counties if f not in radon]
    no_climate = [f for f in us_counties if f not in climate]
    log(f'US counties without radon: {no_radon}; without climate: {no_climate}')
    check(len(no_radon) <= 2 and len(no_climate) <= 2, 'county coverage gaps')

    # ---- write
    zdir = os.path.join(OUT, 'zip')
    if os.path.isdir(zdir):
        shutil.rmtree(zdir)
    os.makedirs(zdir)
    shards = defaultdict(dict)
    for z in sorted(zips):
        shards[z[:3]][z] = zips[z]
    for p, recs in shards.items():
        with open(os.path.join(zdir, p + '.json'), 'w') as f:
            json.dump(recs, f, separators=(',', ':'))
    # Positional on disk: [name, radon|null, climate|null, firm|null, acs fallback|null], trailing nulls dropped.
    packed = {}
    for fips, rec in county_out.items():
        row = [rec['n'], rec.get('r'), rec.get('cz'), rec.get('f'), rec.get('a')]
        while row[-1] is None:
            row.pop()
        packed[fips] = row
    with open(os.path.join(OUT, 'counties.json'), 'w') as f:
        json.dump(packed, f, separators=(',', ':'), ensure_ascii=False)

    manifest = {
        'generated': datetime.date.today().isoformat(),
        'minUnits': MIN_UNITS,
        'counts': {'zips': len(zips), 'shards': len(shards), 'counties': len(county_out),
                   'zipsWithoutAcs': no_acs, 'radon': len(radon), 'climate': len(climate), 'nfip': len(nfip)},
        'sources': {
            'acs': {'name': 'U.S. Census Bureau, 2020-2024 American Community Survey 5-Year Estimates (tables B25034, B25035, B25040)',
                    'url': 'https://www.census.gov/programs-surveys/acs/data/summary-file.html',
                    'files': [SOURCES['b25034'], SOURCES['b25035'], SOURCES['b25040']], 'vintage': '2020-2024'},
            'zcta': {'name': 'U.S. Census Bureau, 2020 ZCTA to County Relationship File',
                     'url': SOURCES['rel'], 'vintage': '2020'},
            'radon': {'name': 'U.S. EPA, Map of Radon Zones', 'url': 'https://www.epa.gov/radon/epa-map-radon-zones',
                      'file': SOURCES['radon'], 'vintage': '1993 map; county list 2024-06'},
            'climate': {'name': 'U.S. DOE / PNNL, Guide to Determining Climate Regions by County (Building America Vol. 7.3)',
                        'url': SOURCES['climate'], 'vintage': '2015'},
            **({'nfip': {'name': 'FEMA, NFIP Community Status Book (OpenFEMA)',
                         'url': 'https://www.fema.gov/about/openfema/data-sets',
                         'file': SOURCES['nfip'], 'vintage': nfip_refresh}} if nfip else {}),
        },
    }
    with open(os.path.join(OUT, 'manifest.json'), 'w') as f:
        json.dump(manifest, f, indent=2)

    total = sum(os.path.getsize(os.path.join(zdir, x)) for x in os.listdir(zdir))
    cs = os.path.getsize(os.path.join(OUT, 'counties.json'))
    log(f'wrote {len(shards)} shards ({total/1e6:.2f} MB), counties.json ({cs/1e3:.0f} KB), {len(zips)} ZIPs')


if __name__ == '__main__':
    main()
