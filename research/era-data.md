# Era data research: housing facts by year, decade or band (esp. before 1971)

Researched 2026-11-16. Everything marked VERIFIED was downloaded from the URL given and parsed or read; the JSON files in `research/era-data/` hold the extracted tables. Raw downloads and parse scripts are outside the repo (session scratchpad). Parsing used `python3 -I` scripts; nothing downloaded was executed.

## Summary

| Source | Coverage | Status | JSON file |
|---|---|---|---|
| AHS 2023 national microdata | 11 bands: before 1920, each decade 1920s..2000s, 2010+; US + 4 regions; all homes and single-family detached | VERIFIED, computed | `ahs-2023-by-era.json` |
| RECS 2020 microdata + HC2.3 | 9 bands: before 1950, 1950s ... 2016-20; US + 4 regions; all homes and SFD | VERIFIED, computed | `recs-2020-by-era.json` |
| Census Historical Census of Housing Tables | 1940-2000 (some 1900-2000), US + each state | VERIFIED, parsed | `census-housing-historical.json` |
| Annual construction | 1889-2025 starts; completions 1968+; price 1963+; avg cost per unit 1889-1970 | VERIFIED (1889-1970 transcribed from scanned PDF, checksummed) | `annual-construction.json` |
| ACS 2020-2024 B25034/B25035 | US, 4 regions, 51 states+PR, by decade built | VERIFIED | `acs-b25034-stock-by-decade.json` |
| 1950 Census year built | US + 4 regions, 5 bands | VERIFIED (text layer) | `year-built-1950-census.json` |
| C25 "Characteristics of New One-Family Homes" 1963-70 | not obtainable from allowed hosts | FAILED (see 5) | none |

Total JSON about 0.72 MB.

## 1. EIA RECS 2020 (VERIFIED)

URLs: tables index https://www.eia.gov/consumption/residential/data/2020/ ; HC2.3 (structure by year of construction) https://www.eia.gov/consumption/residential/data/2020/hc/xls/HC%202.3.xlsx (pattern HC%20N.N.xlsx for HC2.1-HC4.3, all downloaded); microdata https://www.eia.gov/consumption/residential/data/2020/csv/recs2020_public_v7.csv (18,496 homes, 799 columns, 56 MB); codebook `.../xls/RECS%202020%20Codebook%20for%20Public%20File%20-%20v7.xlsx`; guide `.../pdf/microdata-guide.pdf`. No 2024 table set is published yet at this URL; the 2020 edition is the latest found.

Year-built bands (YEARMADERANGE): before 1950, 1950-59, 1960-69, 1970-79, 1980-89, 1990-99, 2000-09, 2010-15, 2016-20. Nothing finer than before 1950 (use AHS for that).

Computed (`microdata_tabulation.shares[scope][geo][var].bands[band]`): `{n, wtd_homes_million, cells:[[share_pct, se_pp, unweighted_homes_in_category], ...]}` with `categories` listing the order. Scopes `all_homes`, `single_family_detached` (TYPEHUQ=2). Geos `US, Northeast, Midwest, South, West`. Variables: ROOFTYPE, WALLTYPE, FOUND (derived from CELLAR/CRAWL/CONCRETE: basement, crawlspace, slab, more than one, none), TYPEGLASS, WINFRAME, STORIES, FUELHEAT, EQUIPM, ADQINSUL, TYPEHUQ (all homes only), AIRCOND. `means` holds TOTSQFT_EN and BEDROOMS means. Shares are among homes with a valid answer; bands with fewer than 30 sampled homes are the string `suppressed(n<30)`. SE is from the 60 jackknife replicate weights, V = (R-1)/R * sum((rep-full)^2) (EIA microdata guide). Cross-check: composition shingles before 1950 all homes = 75.3%, matching HC2.3 (12.94 / (20.26-3.08)).

Caveats: EIA footnote "Total U.S. includes all primary occupied housing units in the 50 states and the District of Columbia. Vacant housing units, seasonal units, second homes, military houses, and group quarters are excluded." Year built is householder reported; roof, wall, windows and heating are as of 2020 and include replacements. Q in HC tables = RSE over 50% or under 10 sampled households.

Roof material by era IS available. Examples (single-family detached, US): before 1950 composition/asphalt 78.3%, metal 12.1%, wood shake 3.8%, slate 2.4% (n=1,946); 2000-09 composition 76.1%, clay tile 9.6%, concrete tile 4.4%. Regional: South before 1950 metal 22.3% (n=433); West 2000-09 clay plus concrete tile 46% (31.5% + 14.5%, n=537). Wall material is also in the file. Foundations: all homes before 1950 basement-only 43.8% versus 2016-20 18.1%; slab-only 6.2% versus 53.7%. Single-pane windows (SFD): 40.5% before 1950, 9.5% for 2016-20. Heating fuel (all homes): 65.8% natural gas, 8.4% fuel oil before 1950.

Example sentence: "Roughly 4 in 5 surviving detached houses built before 1950 have asphalt shingles today, and about 1 in 8 has a metal roof; many roofs have been replaced since." (state that roofs are as of 2020.)

## 2. Census Historical Census of Housing Tables (VERIFIED)

Pages (all 200 OK): https://www.census.gov/data/tables/time-series/dec/coh-{plumbing,fuels,units,sewage,water,crowding,values,owner}.html . Data are fixed-width text under https://www2.census.gov/programs-surveys/decennial/tables/time-series/coh-{name}/ : `plumbing-tab.txt` (1940-1990), `fuels{1940..2000}.txt`, `units{1940..2000}.txt`, `crowding{1940..2000}.txt`, `sewage{1940..1990}.txt`, `water{1970,1980,1990}.txt`, `values-unadj.txt`, `values-adj.txt` (1940-2000), `owner-tab.txt` (1900-2000). All downloaded; US plus 50 states and DC parsed. Pages for rooms, year-built, structure, tenure do not exist (404).

JSON: `census-housing-historical.json` keyed `plumbing`, `house_heating_fuel`, `units_in_structure`, `crowding`, `sewage_disposal`, `source_of_water`, `median_home_value` (unadjusted and 2000 dollars), `homeownership_rate`; `years[year][US|postal].field`. Field names in the file (e.g. `lacking_pct`, `coal_coke_pct`, `utility_gas_pct`, `crowded_pct`).

Key US figures (verified from the files): lacking complete plumbing 45.3% (1940), 35.5% (1950), 16.8% (1960), 6.9% (1970), 2.7% (1980), 1.1% (1990). Heating fuel, occupied units: 1940 coal/coke 54.7%, wood 22.8%, oil 10.0%, gas 11.3% (utility and bottled combined); 1950 coal 34.6%, utility gas 26.6%, oil 22.6%, wood 10.0%; 1960 utility gas 43.1%, oil 32.4%, coal 12.2%; 1970 gas 55.2%, oil 26.0%, electricity 7.7%; 2000 gas 51.2%, electricity 30.3%. No flush toilet 35.3% (1940), 24.5% (1950), 10.3% (1960). Crowded (over 1 person/room) 20.2% (1940), 15.7% (1950), 11.5% (1960). Median home value $2,938 (1940), $7,354 (1950), $11,900 (1960), $17,000 (1970). Homeownership 43.6% (1940), 55.0% (1950), 61.9% (1960), 62.9% (1970). Units in structure: detached 63.6% (1940), 63.3% (1950), 68.8% (1960), 66.2% (1970). Water (public/private company): 81.7% (1970).

Caveats in Census words: "Complete plumbing facilities are defined as hot and cold piped water, a bathtub or shower, and a flush toilet" and the 1990 page notes the exclusive-use rule was dropped in 1990. File notes: 1940 gas combined and electricity "collected separately, but not tabulated"; 1950 electricity tallied only for noncentral heating; 1950 state totals do not quite add to US; 1970/1980 sewage and water limited to year-round units. A few count tokens are truncated in the source and stored as null (percentages are fine).

Examples: "In 1950, 35.5% of US homes lacked complete plumbing and coal heated 34.6%." "In 1940, about 3 in 4 US homes were heated with coal or wood (77.5%)."

Important: these are decennial snapshots of all homes at the time, not characteristics by year built. For a house built in 1925 they describe the world it lived in, not what it was built with.

## 3. Annual housing production (VERIFIED)

`annual-construction.json` `rows[]` for 1889-2025. Sources: Historical Statistics of the US, Colonial Times to 1970, Chapter N PDF https://www2.census.gov/library/publications/1975/compendia/hist_stats_colonial-1970/hist_stats_colonial-1970p2-chN.pdf (42 pages, scanned images with NO text layer; I rendered pages and transcribed Series N 156-169 by eye; row sums by type, location, ownership and cost-per-unit were checked and three digit slips fixed). Census NRC: https://www.census.gov/construction/nrc/xls/starts_cust.xlsx (starts 1959-2025), `comps_cust.xlsx` (completions 1968-2025), and https://www.census.gov/construction/nrs/xls/price_cust.xlsx (new house median and average sales price 1963-2025).

Fields: `hs_total_k, hs_private_k, hs_public_k, hs_1unit_k, hs_2unit_k, hs_3plus_k, hs_location_a_k/b_k, hs_construction_cost_mil, hs_avg_cost_per_unit`, `nrc_starts_*`, `nrc_completions_*`, `nrc_new_house_median_price/avg_price`, `starts_best_k` (+source), `onefamily_share_pct`. Also `hs_decades_N192_195`: nonfarm dwelling units standing 1890 (8.3 million) to 1950 (39.6 million) and decade starts, conversions, demolitions.

Notes and breaks (HS text): 1889-1919 Blank (NBER); 1920-29 Wickens-Foster; 1930-44 BLS revision; 1945-58 Census revisions of BLS, no structure detail; 1959+ Census permit-based. 1889-1958 excludes farm housing. Permit universe 6,600 places before 1959, 10,000 from 1959, 12,000 in 1963-67, 13,000 from 1967. Units are permanent housekeeping units in new structures; mobile homes, conversions and temporary units excluded. Single-family share is available 1900-1944 and 1959+ (e.g. 1925: 61% in one-unit buildings). Average cost per new unit: $2,350 (1889), $4,775 (1925), $8,450 (1950), $12,400 (1959), $15,450 (1970). New house median price $18,000 (1963). Median/average new house SIZE before 1971 is not in these series (CHARS starts 1973; see 5).

Example: "About 937,000 new homes were started in 1925, the peak year of the 1920s boom; the average one cost about $4,775 to build."

## 4. ACS 2020-2024 B25034 (VERIFIED)

https://www2.census.gov/programs-surveys/acs/summary_file/2024/table-based-SF/data/5YRData/acsdt5y2024-b25034.dat (and b25035 median year built); geographies from `.../documentation/Geos20245YR.txt`. JSON has the US, 4 regions and 52 state-level rows (50 states, DC, Puerto Rico) with `counts`, `moe90`, `share_pct`, `median_year_built` in label order (2020+, 2010s, 2000s, 1990s, 1980s, 1970s, 1960s, 1950s, 1940s, 1939 or earlier). US: 143.8 million units; built 1950s 13.6 million (9.5%); 1960s 14.2 million; 1940s 6.4 million; 1939 or earlier 16.9 million (11.7%); median year built 1980. Includes vacant units. Sentence: "About 13.6 million US homes still standing were built in the 1950s."

## 5. C25 Characteristics of New One-Family Homes 1963-70 (FAILED on allowed hosts)

Census.gov hosts C25 annual PDFs only for 2003-2017 (https://www.census.gov/construction/chars/pdf/c25ann2003.pdf ... 2017; page https://www.census.gov/construction/chars/historical/tables.html) and current tables from 1973. The 1960s reports exist (e.g. C25-69-13 "Characteristics of New One-Family Homes: 1969", issued July 1970; C25-68-13) but search shows them only on huduser.gov (https://www.huduser.gov/Publications/pdf/HUD-11675_v2.pdf and HUD-11674_v2.pdf for 1969 and 1968; HUD-789 for 1972): www.huduser.gov returned an empty 202 to a plain request, so not usable. No census.gov or www2.census.gov copy found (no `econ` directory under www2 library publications 1960s). Their text layer and contents are UNVERIFIED. Stat Abstract 1971 (https://www2.census.gov/library/publications/1971/compendia/statab/92ed/1971-06.pdf and -07) is scanned with no text layer; full OCR was too slow here, so any one-family-home characteristics tables inside are UNVERIFIED. Statistical Abstract 2000 table "New Privately-Owned Housing Units Started - Selected Characteristics: 1970 to 1999" (https://www2.census.gov/library/publications/2001/compendia/statab/120ed/tables/sec25.pdf) is UNVERIFIED but would give 1970+ only.

## 6. Other sources

- AHS 2023 (VERIFIED, biggest win): national PUF v1.1 flat CSV 142 MB zip, https://www2.census.gov/programs-surveys/ahs/2023/ ; YRBUILT has decades before 1920, 1920s, 1930s, 1940s, so pre-1950 homes differ by decade. 55,669 units. Variables tabulated: BLD, FOUNDTYPE, STORIES, HEATFUEL, HEATTYPE, HOTWATER (incl. no hot running water), COOKFUEL, FIREPLACE, GARAGE, AC type, BATHROOMS, UNITSIZE, LOTSIZE, BEDROOMS, ADEQUACY, TENURE. SE from 160 Fay replicate weights, V = (4/160) sum (AHS Quick Guide). Examples (SFD, US): usable fireplace 26% before 1920, 33% in 1950s, 60% in 1990s; central air 45% before 1920, 71% in 1950s, 91% in 2000s; one full bath only 34% before 1920, 47% in 1940s, 4% in 2000s; forced-air furnace 61% before 1920, 70% in 1950s; steam/hot water 20% before 1920, 9% in 1950s; coal 0.3% of heating fuel before 1920; no running hot water 1.9% before 1920. Foundation: basement under all or part 73.6% before 1920 vs 44% for 1950s. Caveat (Census WP 2011-18): current residents report characteristics, so some "may have been more recent additions or installations". AHS has no roof or wall material variable.
- 1950 Census of Housing Vol. 1 Part 1 Ch. 1 (VERIFIED, text layer, 133 pages): Table 6 year built US: 45.8% built 1919 or earlier, 20.1% 1920s, 13.3% 1930s, 7.3% 1940-44, 13.4% 1945-50; Table 20 by region and state (plus Tables 7, 12, 13, 17-18 on plumbing, heating, fuel, sink, TV: only 12.0% of 1950 homes had television, 94.0% electric lights). https://www2.census.gov/library/publications/decennial/1950/housing-volume-1/36965082v1p1ch1.pdf . Year built is not cross-tabulated with equipment in this chapter (UNVERIFIED elsewhere).
- 1960 Census of Housing Vol. I (https://www2.census.gov/library/publications/decennial/1960/housing-volume-1/41962442v1p1ch01.pdf) downloaded, scanned, no text layer; contents UNVERIFIED. 1940 Housing: https://www2.census.gov/library/publications/decennial/1940/housing-characteristics/housing-characteristics-part-1.pdf (8 parts, 8 pages for part 1, little text).
- Historical Statistics Chapter N also has (seen, not extracted): N 170 mobile home shipments 1947-70, N 180-185 FHA/VA units, N 216-231 mean age of residential structures 1925-70, N 238-245 occupied units and tenure 1890-1970, N 302-307 mortgage status. OCR text at scratchpad only; all UNVERIFIED as tables.
- HUD Minimum Property Standards history, BLS/NBER series: not searched in depth; UNVERIFIED. (www.hud.gov and www.nist.gov are reachable; huduser.gov is not.)

## Ready to build

Files and fields (all in `research/era-data/`):
- `ahs-2023-by-era.json`: `shares.single_family_detached.US.FOUNDTYPE.bands["1920-1929"].cells[i]` = [share_pct, se_pp, n] aligned to `categories[i]`. Use for pre-1950 decade reports (heating type, fuel, baths, AC, fireplace, foundation, stories). Show only when `n>=30` and say "as reported by current occupants".
- `recs-2020-by-era.json`: `microdata_tabulation.shares...ROOFTYPE/WALLTYPE/TYPEGLASS/FOUND` for roof, wall and window glazing by band; map years to bands (before 1950 for any year 1880-1949 in this source). Prefer AHS for finer pre-1950 granularity, RECS only for roof, wall, glazing.
- `census-housing-historical.json`: era context sentences keyed to the nearest census year (plumbing, heating fuel, flush toilet, crowding, home values, homeownership), US and state.
- `annual-construction.json`: `rows[year]` for "X new homes were started that year" (1889+), one-family share, average build cost, price from 1963.
- `acs-b25034-stock-by-decade.json`: `geos["0100000US"]` and state GEO_IDs for "N million homes still standing from your decade".
- `year-built-1950-census.json`: 1950 snapshot of what share of homes was already older.

Hostnames that would unlock more: www.huduser.gov (C25 1968-1972 PDFs, HUD-11674/11675/789); archive/library hosts such as webarchive.library.unt.edu (old Census C25 index); data.census.gov or api.census.gov with a key (AHS tables). Library OCR of scanned Stat Abstract 1960s volumes is feasible if more time is available.
