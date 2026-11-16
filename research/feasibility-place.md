# Feasibility: a "your place" layer for Built In (ZIP / county facts)

First pass 2026-11-16 (search-based). Verification pass the same day (this version). Nothing was built. Only this file was written in the repo.

## Method and evidence labels

- **VERIFIED** means I opened the page, or downloaded and parsed the file, in this session. The exact URL is given.
- **UNVERIFIED** means it comes only from a WebSearch summary, or from a host that refused or was not reachable. Search summaries are leads, not sources.
- Downloaded data is untrusted: it was parsed with `python3 -I` scripts kept outside the data directory, and nothing in it was executed or treated as instructions. Working copies and the derived files are in `/tmp/claude-0/-home-user-project007/ee67fba6-1243-5204-8e39-de9f8945e204/scratchpad/place-data/` (not in the repo). Parsers are in `.../scratchpad/place-tools/`.
- Hosts that refused automated requests are recorded as refused. I made no attempt to get around them.

## Outcome at a glance

| # | Dataset | Granularity | Status after this pass |
|---|---|---|---|
| A | Census ACS 5-year B25034 / B25035 / B25040 (vintage 2024, i.e. 2020-2024) | ZCTA and county | **VERIFIED and downloaded** via the table-based summary-file bulk files on www2.census.gov. The `api.census.gov` data endpoint **needs a key** (metadata works without one) |
| B | Census ZCTA-to-county relationship file (2020) | ZCTA to county (area overlap) | **VERIFIED and downloaded** |
| C | EPA radon zones JSON | county (no FIPS) | **VERIFIED and downloaded**; FIPS join worked: 3,094 of 3,144 rows by exact name, 3,143 after a short fix list |
| D | Climate zones by county | county (no FIPS) | **2015 DOE/PNNL table VERIFIED**, parsed to FIPS. **2021 update NOT obtainable** from this environment (PNNL 403, OSTI and BASC blocked) |
| E | FEMA National Risk Index county table | county | **UNVERIFIED**: `hazards.fema.gov` and `www.fema.gov` pages return 403 "Access Denied". Nothing downloaded |
| F | NFIP Community Status Book (initial FIRM date) | NFIP community | **VERIFIED and downloaded** through the OpenFEMA API on www.fema.gov (no key). The fema.gov web pages themselves return 403 |
| G | HUD USPS ZIP crosswalk | ZIP to county/tract (address weighted) | **UNVERIFIED**: huduser.gov pages return an empty HTTP 202; the API returns 401 without a token |
| H | Everything else (code adoption years, seismic, wind, wildfire, termite, soils, lead lines, hardness) | various | **UNVERIFIED**, unchanged from the first pass (hosts still not reachable). Sections 5 to 10 and 12 below |

---

## The join problem

A ZIP code is a USPS delivery route, not a polygon. The Census "ZCTA" is an approximation of it.

- **Wikipedia on ZCTAs. VERIFIED** (https://en.wikipedia.org/wiki/ZIP_Code_Tabulation_Area): ZCTAs "are not the same as ZIP codes"; ZIPs cross county, tract and block boundaries; "Some addresses end up with a ZCTA code that is different from their ZIP code"; about 42,000 ZIPs but about 32,000 ZCTAs (so roughly 10,000 ZIPs have no ZCTA of their own); PO-box-only ZIPs have no ZCTA.
- **Measured, 2020 ZCTAs: 33,791** (relationship file) and 33,772 (ACS 2024 tables). 10,186 of the 33,791 touch more than one county (30%).
- **HUD USPS crosswalk (address-weighted) could not be verified.**
  - `https://www.huduser.gov/portal/datasets/usps_crosswalk.html` and `.../portal/dataset/uspszip-api.html` both returned HTTP 202 with an empty body on every attempt. I read that as a refusal and moved on.
  - `https://www.huduser.gov/hudapi/public/usps?type=2&query=01001` returned HTTP 401 `{"error":"Unauthenticated"}`: the API is reachable but needs a registered token. I have no token.
  - The earlier claims about quarterly releases, the ratio columns and the notice requirement stay UNVERIFIED.
- **Decision for v1: use the Census ZCTA file** (verified, no key, no registration). HUD stays an optional upgrade if the owner registers for a token.
- **ZIP to ZCTA:** treat a 5-digit ZIP as its ZCTA. If the ZIP has no ZCTA (PO-box-only or similar), say "we have no data for this ZIP" or fall back to the county via a separate ZIP-to-county source. Do not guess. The Census files give no ZIP list, so a builder needs a list of valid ZIPs from somewhere else (not verified here; USPS or HUD).
- **Wording rule:** never imply a ZIP-level fact is address-level. When a ZCTA touches several counties, say "part of this ZIP is in X County" and show the dominant county's fact, or the facts for each county covering a large share of the area.

---

## A. Census ACS 5-year housing tables: VERIFIED (bulk files); API needs a key

### A1. The API (api.census.gov), tested without a key

- **Metadata works without a key.**
  - `https://api.census.gov/data.json` returns the catalog (5.3 MB). The latest ACS 5-year vintage listed is **2024** (title "ACS 5-Year Detailed Tables", modified 2025-09-02). `https://api.census.gov/data/2025/acs/acs5/...` returns 404. So the latest 5-year vintage is 2020-2024.
  - `https://api.census.gov/data/2023/acs/acs5/variables/B25035_001E.json` returns `"label": "Estimate!!Median year structure built"`.
  - `https://api.census.gov/data/2024/acs/acs5/groups/B25034.json` returns HTTP 200.
  - `https://api.census.gov/data/2024/acs/acs5/geography.json` lists `zip code tabulation area` with no required parent geography, and `county` requiring `state`.
- **Data queries fail without a key.** A single-state county request, `https://api.census.gov/data/2023/acs/acs5?get=NAME,B25035_001E&for=county:*&in=state:56`, returned HTTP 200 with an HTML page titled "Missing Key": "A valid key must be included with each data API request." The 2024 request did the same. This **settles the earlier conflict**: a key is required. I did not request a key (it needs the owner's email), so the all-ZCTA and all-county API requests were not run. I saw no rate-limit figure, because no data request succeeded.
- A free key (https://api.census.gov/data/key_signup.html returns 200) would make the API usable. It is not needed, because the bulk files below cover everything.

### A2. The bulk route that works with no key (use this)

Census "table-based" ACS summary files, 2024 vintage, 5-year. Base: `https://www2.census.gov/programs-surveys/acs/summary_file/2024/table-based-SF/`. The page https://www.census.gov/programs-surveys/acs/data/summary-file.html ("ACS Summary File Table-Based Format") describes the format.

| File | URL (under the base) | Size (bytes) | Rows |
|---|---|---|---|
| B25034 year built | `data/5YRData/acsdt5y2024-b25034.dat` | 50,103,592 | all geographies |
| B25035 median year built | `data/5YRData/acsdt5y2024-b25035.dat` | 15,421,817 | 543,579 data rows (all geographies) |
| B25040 heating fuel | `data/5YRData/acsdt5y2024-b25040.dat` | 43,870,500 | all geographies |
| Table shells (variable labels) | `documentation/ACS20245YR_Table_Shells.txt` | 5,622,840 | |
| Geography key | `documentation/Geos20245YR.txt` | 90,707,242 | 616,691 lines; not needed |

- **Format:** pipe-delimited text with a header, one file per table, **all geographies in one file** (nation, state, county, tract, block group, ZCTA and others). Key: `GEO_ID`. Estimate columns are `B25034_E001`, `_E002` and so on, margins `B25034_M001`. (Variable names are `_E001` here, not the API's `_001E`.)
- **GEO_ID prefixes:** ZCTA `860Z200US` + 5 digits (e.g. `860Z200US00601`); county `0500000US` + 5-digit FIPS.
- **Counts measured:** B25034 has **33,772 ZCTA rows** and **3,222 county rows** (50 states and DC, 78 Puerto Rico municipios, and 9 Connecticut planning regions, see below). B25035 and B25040 have the same counts.
- **Variables (VERIFIED, from the table shells):**
  - B25034 (universe: housing units): `_E001` total; `_E002` built 2020 or later; `_E003` 2010-2019; `_E004` 2000-2009; `_E005` 1990-1999; `_E006` 1980-1989; `_E007` 1970-1979; `_E008` 1960-1969; `_E009` 1950-1959; `_E010` 1940-1949; `_E011` 1939 or earlier.
  - B25035: `_E001` median year structure built.
  - B25040 (universe: **occupied** housing units): `_E001` total; `_E002` utility gas; `_E003` bottled/tank gas (propane); `_E004` electricity; `_E005` fuel oil, kerosene; `_E006` coal or coke; `_E007` wood; `_E008` solar; `_E009` other fuel; `_E010` no fuel used.
- **Samples (raw, ZCTA):**
  - `00601`: B25034 total 7570 (M 322), 2020+ 0, 2010-19 209, 2000-09 782, 1990-99 1122, 1980-89 1557, 1970-79 1814, 1960-69 1145, 1950-59 515, 1940-49 221, pre-1940 205. B25035 median 1979. B25040 total 5768; gas 0, propane 44, electricity 185, oil 0, wood 0, other 434, none 5105 (Adjuntas, Puerto Rico).
  - `00602`: total 17610, median 1978; `00603`: total 26239, median 1982.
  - County `01001` (Autauga AL): B25034 total 25039; B25035 median 1994; B25040 total 22917, utility gas 7748, propane 1800.
- **Gotchas, measured:**
  - **Suppressed values:** 811 of the 33,772 ZCTAs have no housing units (B25034 total 0) and their median is the sentinel **-666666666**. Treat any negative value as "no data". 953 ZCTAs have zero occupied units in B25040.
  - **Small ZCTAs:** 2,883 ZCTAs have fewer than 100 housing units and 7,261 fewer than 300. Margins of error are large there. Show only coarse bands, or suppress below a threshold (suggest total below 100).
  - **Connecticut:** the 2024 county rows use the 9 new planning regions (`09110` to `09190`), with no `09001`-style old counties. The relationship file and the radon, climate and NFIP tables all use the 8 old counties. So the **county-level ACS fallback does not join for Connecticut**. Use ZCTA-level ACS only for Connecticut, or add a Census planning-region crosswalk (not verified).
  - ACS estimates are samples with margins of error, owner-reported year built, primary heating fuel only, 5-year smoothing.
- **Licence:** US Census Bureau tables are public domain (UNVERIFIED as a stated licence; no restriction seen on the pages opened). Cite "U.S. Census Bureau, 2020-2024 American Community Survey 5-Year Estimates".
- **Derived and measured:** reduced ZCTA record (total units, median year, 10 percent-share buckets, 5 heating shares, occupied units) for 32,961 ZCTAs = **2.13 MB raw JSON, 733 KB gzipped**. County version (3,222 counties) = 217 KB raw, 76 KB gzipped.

---

## B. Census ZCTA-to-county relationship file: VERIFIED

- **URL:** `https://www2.census.gov/geo/docs/maps-data/data/rel2020/zcta520/tab20_zcta520_county20_natl.txt` (HTTP 200, 6,821,287 bytes).
- **Format:** pipe-delimited, UTF-8 with a BOM (read with `utf-8-sig`). 47,863 data rows.
- **Columns:** `OID_ZCTA5_20|GEOID_ZCTA5_20|NAMELSAD_ZCTA5_20|AREALAND_ZCTA5_20|AREAWATER_ZCTA5_20|MTFCC_ZCTA5_20|CLASSFP_ZCTA5_20|FUNCSTAT_ZCTA5_20|OID_COUNTY_20|GEOID_COUNTY_20|NAMELSAD_COUNTY_20|AREALAND_COUNTY_20|AREAWATER_COUNTY_20|MTFCC_COUNTY_20|CLASSFP_COUNTY_20|FUNCSTAT_COUNTY_20|AREALAND_PART|AREAWATER_PART`.
- **Key columns:** `GEOID_ZCTA5_20` (ZCTA), `GEOID_COUNTY_20` (county FIPS), `AREALAND_PART` (land area of the ZCTA inside that county, square metres).
- **3-row sample:**
  - `01001|ZCTA5 01001|...|25013|Hampden County|...|AREALAND_PART 29247431`
  - `01002|...|25011|Franklin County|...|9322298`
  - `01002|...|25015|Hampshire County|...|128609599`
- **Gotchas:** 903 rows have an empty ZCTA (county pieces with no ZCTA): drop them. The BOM is on the header. Overlap is **land area, not people or addresses**.
- **Picking the dominant county per ZCTA (tested):** group by `GEOID_ZCTA5_20`, take the row with the largest `AREALAND_PART`. Measured over **33,791 ZCTAs**: no ZCTA has zero land; the dominant county covers 100% in the median case; for **6,432** ZCTAs it covers less than 90% of land, and for **352** less than 50%. Also keep the secondary counties where the share is large.
  - Examples: `10001` is entirely New York County (36061). `02138` is entirely Middlesex MA (25017). `42101` (a KY ZCTA): Warren 21227 (644 M m2), Edmonson 21061, Butler 21031. `59001`: Stillwater 30095 dominant, Carbon 30009.
- **Join check:** all 33,772 ACS ZCTAs are in this file; 19 ZCTAs in this file have no ACS row.
- **Connecticut:** this file uses the 8 old counties (`09001` to `09015`), which match radon, climate and NFIP.
- Derived: `zcta_dominant_county.json` = 33,791 entries, 541 KB raw, 95 KB gzipped.

---

## C. EPA radon zones JSON: VERIFIED, FIPS join done

- **URL (re-downloaded today):** `https://www.epa.gov/system/files/other-files/2024-06/radon-zones-202406.json`. HTTP 200, `application/json`, 620,064 bytes. Parse with `utf-8-sig` (BOM).
- **Structure:** `{"data":[{"County,State":"Baldwin, AL","COUNTY LABEL":"Baldwin County","STATE":"Alabama","Region":"4","Zone":"3"}, ...]}`.
- **Rows:** 3,196, of which **3,144 are real counties** (52 are header-like rows with `Zone "."`). Zone 1: 1,074; Zone 2: 1,034; Zone 3: 1,036.
- **No FIPS.** Join to the Census county list `https://www2.census.gov/geo/docs/reference/codes2020/national_county2020.txt` (HTTP 200, 126,639 bytes, pipe-delimited: `STATE|STATEFP|COUNTYFP|COUNTYNS|COUNTYNAME|CLASSFP|FUNCSTAT`, 3,235 rows including territories).
- **Join rule that worked:** state abbreviation (the part of `County,State` after the comma) plus the exact `COUNTY LABEL`, compared case-insensitively. **3,094 of 3,144 rows match.** **50 do not**, all fixable:
  - **Alaska (4), renamed or split county-equivalents:** Prince of Wales-Outer Ketchikan Census Area to 02198 (Prince of Wales-Hyder); Valdez-Cordova to 02063 and 02066 (Chugach, Copper River); Wade Hampton to 02158 (Kusilvak); Wrangell-Petersburg to 02195 and 02275 (Petersburg, Wrangell). Also "Skagway Municipality" (EPA label for the Skagway-Hoonah-Angoon row) matched 02230, and **Hoonah-Angoon (02105) has no EPA row**: copy the zone from the Skagway row.
  - **DC (1):** `District of Columbia` (EPA writes state "District of Columbia") to 11001.
  - **Name spelling (3):** La Salle Parish LA to 22059 (LaSalle); Dona Ana NM to 35013 (Doña Ana); Shannon SD to 46102 (Oglala Lakota).
  - **Montana (1):** "Yellowstone National Park, MT" is not a county in the 2020 list. Drop it.
  - **Virginia independent cities (41):** EPA lists them as `Alexandria, VA` without "city". Match by adding " city" to the Census name. 38 match this way (Alexandria, Buena Vista, Charlottesville, Chesapeake, Colonial Heights, Covington, Danville, Emporia, Fairfax, Falls Church, Franklin, Fredericksburg, Galax, Hampton, Harrisonburg, Hopewell, Lexington, Lynchburg, Manassas, Manassas Park, Martinsville, Newport News, Norfolk, Norton, Petersburg, Poquoson, Portsmouth, Radford, Richmond, Roanoke, Salem, Staunton, Suffolk, Virginia Beach, Waynesboro, Williamsburg, Winchester, Bristol). Three no longer exist as cities and need a manual target: **Bedford** (city, merged into Bedford County 51019 in 2013), **Clifton Forge** (merged into Alleghany 51005), **South Boston** (merged into Halifax 51083). Do not let these overwrite the county's own row; keep the county's own zone.
  - **No duplicates** in the EPA list. After these fixes, **3,143 of 3,144 rows resolve** and **3,142 FIPS codes** are covered; the only 2020 county-equivalent without a zone is Hoonah-Angoon (fixed as above). Connecticut: EPA has the 8 old counties and they match `09001` to `09015`.
- Derived `radon_by_fips_fixed.json` (FIPS to zone): 3,142 entries, 37,705 bytes raw, 8,169 bytes gzipped.
- **EPA caveats (VERIFIED earlier, pages https://www.epa.gov/radon/epa-map-radon-zones-0 and https://www.epa.gov/radon/epa-map-radon-zones):** the map "was developed in 1993"; "The Map of Radon Zones should not be used to determine if individual homes need to be tested"; "Homes with elevated levels of radon have been found in all three zones. All homes should be tested for radon." Action level 4 pCi/L. Never say "safe" for Zone 3. The zone is a county prediction, not a measurement.
- **Licence:** US government work; EPA states no restriction on these pages (no explicit licence line seen). Cite EPA.

---

## D. Climate zones by county

- **2021 update (PNNL-33270, Oct 2022): NOT obtained.**
  - The DOE page https://www.energy.gov/cmei/buildings/building-america-climate-specific-guidance (VERIFIED, 200, "last updated March 5, 2026") names "Guide to Determining Climate Zones by County: Building America and IECC 2021 Updates" and links `https://www.osti.gov/servlets/purl/1893981` and `https://basc.pnnl.gov/building-assemblies`. The page also says its 2021 assemblies tool has "Climate zone look-up by county or zip code". That is the lead to a current table.
  - `https://www.pnnl.gov/main/publications/external/technical_reports/PNNL-33270.pdf` returned **HTTP 403 "Request Rejected"** (bot refusal). `https://www.pnnl.gov/publications/guide-determining-climate-zone-county-building-america-and-iecc-2021-updates` returned 403.
  - `basc.pnnl.gov`, `www.osti.gov` and `www.energycodes.gov` were refused by the session proxy (not on the allowed list). I did not try to get round any of this.
  - Search results say the BASC data-files page offers GIS shapefiles for the 2021 IECC and Building America zones (UNVERIFIED). No CSV was found.
- **2015 table: VERIFIED and parsed.**
  - URL: `https://www.energy.gov/sites/prod/files/2015/10/f27/ba_climate_region_guide_7.3.pdf` (HTTP 200, `application/pdf`, 6,356,555 bytes). "Building America Best Practices Series Vol. 7.3", PNNL-17211 Rev. 3, Aug 2015, table "Counties of the United States by Building America and IECC Climate Zone, Version 6, August 20, 2015".
  - Format: a PDF table in two column-pairs per page: `State | County | BA Climate Zone | IECC Climate Zone (1-8) | Moisture Regime`. **No FIPS.** Text extracts with `pdftotext -layout`.
  - Parsed: **3,141 rows**, no duplicates; **3,113 matched to FIPS automatically** (state plus normalised county name, "(city)" mapped to " city"). 28 rows need hand fixes (a line-wrap truncated names or the name differs): AK Fairbanks North Star, Northwest Arctic, Prince of Wales-Hyder, Skagway-Hoonah-Angoon, Southeast Fairbanks, Valdez-Cordova, Wade Hampton, Wrangell-Petersburg; IL De Witt; LA La Salle, St. John the Baptist, St. Landry; NV Carson City; SD Shannon; VA Bedford, Clifton Forge and 12 independent cities (Buena Vista, Charlottesville, Chesapeake, Colonial Heights, Fredericksburg, Harrisonburg, Manassas Park, Martinsville, Newport News, Petersburg, Portsmouth, Virginia Beach).
  - Also Aroostook ME did not parse (its moisture field is blank). After the fixes there should be about 3,143 counties; the 2015 table predates the Alaska and South Dakota renames.
  - Alaska rows have moisture "N/A" (zones 7 and 8).
  - 3-row sample with FIPS: `01001` Autauga AL Hot-Humid 3A; `12086` Miami-Dade FL Hot-Humid 1A; `36061` New York NY Mixed-Humid 4A; `06037` Los Angeles CA Hot-Dry 3B.
  - Derived `climate2015_by_fips.json`: 3,113 entries, 82,898 bytes raw.
- **Caveat:** the 2021 IECC changed some counties (search says Dallas TX 3A to 2A, Milwaukee WI 6A to 5A; UNVERIFIED). So the 2015 values are **stale for a minority of counties**. Label the data "IECC/Building America zone, 2015 DOE/PNNL county table" and show the year. Replace when the 2021 table becomes reachable.

---

## E. FEMA National Risk Index: UNVERIFIED

- `https://hazards.fema.gov/nri/`, `.../data-resources`, `.../learn-more`, the direct file URL `https://hazards.fema.gov/nri/Content/StaticDocuments/DataDownload//NRI_Table_Counties/NRI_Table_Counties.zip`, `https://www.fema.gov/about/openfema/data-sets/national-risk-index-data`, `https://www.fema.gov/flood-maps/products-tools/national-risk-index` and the FAQ PDF `https://www.fema.gov/sites/default/files/documents/fema_national-risk-index_faq-page-documentation.pdf` all returned **HTTP 403 "Access Denied"** (an edge-server refusal of automated requests). Recorded; not worked around. **No NRI file was downloaded.**
- **Correction to the first pass:** the `nri-data-downloads.s3.amazonaws.com` mirror does not exist (`NoSuchBucket`, HTTP 404). Drop it.
- **OpenFEMA API does not carry NRI.** I retrieved the OpenFEMA dataset catalog (`https://www.fema.gov/api/open/v1/OpenFemaDataSets`, 44 entries returned); no risk-index dataset appeared (only Hazard Mitigation entries).
- **What search says (UNVERIFIED):** the latest release is v1.20 (December 2025); the county CSV is "All Counties - Table"; the technical documentation PDF is `https://www.fema.gov/sites/default/files/documents/fema_national-risk-index_technical-documentation.pdf`; the county layer on an ArcGIS service has `RISK_RATNG` (composite rating) and `RISK_SCORE`, and per-hazard fields following the pattern `HRCN_RISKS` (hurricane score) and `HRCN_RISKR` (rating). Per-hazard rating columns were therefore **not confirmed** for the downloadable CSV. FEMA's appropriate-use guidance could **not be quoted**: it must be read from the technical documentation before use.
- **Verdict:** keep out of v1. If the owner wants it, they must download "All Counties - Table" in a normal browser and the builder verifies columns then.

---

## F. NFIP Community Status Book (initial FIRM date): VERIFIED via the OpenFEMA API

- **fema.gov web pages return 403** ("Access Denied"), e.g. https://www.fema.gov/openfema-data-page/nfip-community-status-book-v1. **The OpenFEMA API on the same host works with no key.**
- **Working URLs:**
  - JSON page: `https://www.fema.gov/api/open/v1/NfipCommunityStatusBook?$top=3` (HTTP 200). With `&$inlinecount=allpages` the metadata reports `"count":25132`.
  - Whole file as CSV: `https://www.fema.gov/api/open/v1/NfipCommunityStatusBook.csv` (HTTP 200, `text/csv`, **3,772,519 bytes, 25,133 data rows**). `lastRefresh` on the rows is 2026-08-25.
- **Columns:** `communityIdNumber, communityName, county, state, initialFloodHazardBoundaryMap, initialFloodInsuranceRateMap, currentlyEffectiveMapDate, regularEmergencyProgramDate, tribal, participatingInNFIP, originalEntryDate, classRatingEffectiveDate, classRating, sfhaDiscount, nonSfhaDiscount, sanction, sanctionDate, lastRefresh`.
- **3-row sample:**
  - `010001`, AUTAUGAVILLE, TOWN OF; AUTAUGA COUNTY; AL; initial FHBM 1974-06-07; **initial FIRM 1985-12-18**; effective 09/03/14; participating.
  - `010002`, PRATTVILLE, CITY OF; ELMORE COUNTY/AUTAUGA COUNTY; AL; FHBM 1974-05-03; **FIRM 1978-08-15**; class rating 7.
  - `010004`, BAY MINETTE, CITY OF; BALDWIN COUNTY; AL; FHBM 1975-10-24; **FIRM 1981-12-01**; effective 04/19/19.
- **Measured:** 23,983 of 25,133 rows have an initial FIRM date; 22,792 participate; median FIRM year 1986; decades: 1970s 4,074; 1980s 11,915; 1990s 1,941; 2000s 2,484; 2010s 3,021; 2020s 545. **Data errors:** the maximum is 2069 and three rows have years in the 2060s (two-digit-year errors): discard any year above 2026.
- **Join to county:**
  - No FIPS and no ZIP. `communityIdNumber` starts with the 2-digit state FIPS. `county` is a county name, or several separated by `/` or `,` (e.g. `ELMORE COUNTY/AUTAUGA COUNTY`).
  - Split on `/` and `,`, match state abbreviation plus normalised name to `national_county2020.txt`. Of **25,957** community-county pairs, **25,877 match (99.7%)**. The 57 distinct leftovers are La Salle (IL and LA), renamed Alaska areas, three Virgin Islands names, and some strings joined with a comma instead of a slash (e.g. `WALKER COUNTY,JEFFERSON COUNTY`; my splitter used only `/`, so the builder should split on both `/` and `,` and will match more).
  - Result: 3,035 counties have at least one community with an initial FIRM date.
  - Per-county summary computed: earliest, median and latest initial-FIRM year and the number of communities. Example: `12086` (Miami-Dade) earliest/median/latest 1972, 35 communities; `36061` (New York) 1983, 1 community; `01001` (Autauga) 1978 / 1985 / 2009, 5 communities. Derived `nfip_by_county.json`: 82,667 bytes raw.
- **Caveat:** this is a community-level proxy. The ZIP-to-community link does not exist, so use only the county summary ("flood maps in this county began between 1978 and 2009"). It says nothing about whether a house is in a flood zone.

---


## Sections not re-verified in this pass (5 to 10 and 12)

These are unchanged from the first pass. Every UNVERIFIED (search only) label below now reads UNVERIFIED: it rests on search summaries only, the hosts were not retested, and nothing here was downloaded. Items marked VERIFIED in them were verified in the first pass (EPA and DOE pages).

## 5. State code adoption histories: not suitable as a dataset (hand-curate)

UNVERIFIED (search only). None of energycodes.gov, ncsl.org, nahb.org or iccsafe.org was reachable.

- **DOE Building Energy Codes Program, energycodes.gov:**
  - It has per-state status pages (e.g. `/status/states/florida`) showing the current residential code and effective dates.
  - The "State Code Adoption Tracking Analysis" is the likely downloadable.
  - The pages show current status, not a clean first-adoption history. The 2012 snapshot at webarchive.library.unt.edu shows older tables.
  - Hand-curation from the DOE state pages is feasible for the energy code (IECC/ASHRAE 90.1) only.
- **ICC:**
  - The Master I-Code Adoption Chart (PDFs for Jan 2020, Jan 2021) lists the editions each state adopted.
  - It is an edition-by-state snapshot with the disclaimer "Not all jurisdictions notify ICC of code adoptions".
  - It does not give a year of first adoption.
  - UpCodes has state pages per IRC edition. The earliest edition listed would be a proxy.
  - **There is no single dataset of the year each state first adopted the IRC.** Many states leave adoption to local jurisdictions (the search noted Alaska has no statewide code), so "state-specific year" is often "no statewide rule".
- **NEC:**
  - NAHB and NEMA publish NEC adoption maps (PDF) showing the edition in force by state. These links appeared in earlier cached research pages: `nahb.org/.../state-adoption-status-nec-june-2023.pdf` and `nema.org/Technical/FieldReps/Documents/NEC-Adoption-Map.pdf`. Not opened.
  - Per-state year of first 2008-NEC adoption (AFCI, tamper-resistant receptacles) would have to be built from state electrical board notices. Not available as a dataset.
- **Residential sprinklers:** the NAHB "fire sprinkler state adoption" PDF (2019) tracks code and effective date. Sprinklers are mostly local opt-ins.
- **CO alarms:**
  - NCSL's "Carbon Monoxide Detector Requirements, Laws and Regulations" table summarises state statutes. The search did not return enactment years.
  - Sources disagree on counts (40-plus states vs 48 per another article).
  - Coverage differs (new construction only, rentals only, only homes with fuel-fired appliances or attached garages).
  - It needs citation of each statute for a year.
- **Plain-language fact:** "[State] first required CO alarms in new homes in YYYY." Only if each year comes from the statute.
- **Pitfalls:**
  - Adoption date versus effective date versus local-opt-in.
  - Amendments that weaken or delay the model code.
  - Local jurisdictions in many states adopt earlier or later than the state.
  - Many houses were built under a code older than the one in force today.
- **Verdict:** not suitable as a downloadable dataset. Treat as a curated lookup table of about 50 states for 3 to 5 items, each year cited to a state statute or board page. It is a large manual effort that must be verified state by state. Keep "earliest possible" model-code years as the default and show state-specific years only where verified.

## 6. Seismic, wind and wildfire

### 6a. USGS seismic design (UNVERIFIED (search only))
- The USGS design-maps web service (`https://earthquake.usgs.gov/ws/designmaps/`, e.g. `asce7-22.html`) takes latitude and longitude plus risk category and site class, and returns SDS, SD1 and Seismic Design Category.
- No ZIP or county product. USGS says the services are mostly consumed through third-party tools such as the ASCE Hazard Tool.
- Pitfalls: SDC depends on site class, so a lat/lon with unknown soil is not a house answer. The docs say values are subject to revision.
- Possible: a pre-computed per-county or per-ZCTA-centroid "seismic design category (site class D default)" lookup. A build-time batch of about 33,000 calls would work, but it is a derived dataset and must be labelled as an estimate.
- **Verdict:** not suitable by ZIP unless we run our own build-time batch with labelled assumptions. Prefer the NRI earthquake rating for a simple county fact.

### 6b. Wind and hurricane design zones
- Basic design wind speeds come from ASCE 7 maps. They are tied to location and risk category, and public programmatic access is via ATC or ASCE tools, not via a free national county table (UNVERIFIED (search only), weak; I did not find a specific source).
- Wind-borne debris regions and the 2000-era Florida code changes are local.
- **Verdict:** not suitable. Use the NRI hurricane or tornado ratings as the proxy.

### 6c. USFS Wildfire Risk to Communities (UNVERIFIED (search only))
- Publisher: USDA Forest Service (Fire Lab). Site: wildfirerisk.org. Archive IDs RDS-2020-0016(-2) and RDS-2020-0060, with a 2024 entry RDS-2024-0030.
- Tabular summaries are provided by state, county and community ("Download Spreadsheet"), including Risk to Homes, Wildfire Likelihood and Risk Reduction Zones. The Research Data Archive hosts the files at `fs.usda.gov/rds/archive`.
- Built on LANDFIRE 2014 vegetation, so conditions are as of end-2014 (as the search summary states), and burn probability was modelled with FSim at 270 m.
- Risk to Homes is ranked by national percentile: Low below the 40th, Medium 40 to 70, High 70 to 90, Very High above the 90th.
- Granularity: county and "community" (Census place), plus raster. Not ZIP.
- Licence: USFS Research Data Archive data is typically public domain with a citation. Unconfirmed.
- Join: county FIPS; community rows match by name.
- Plain-language fact: "[County] is in the 'High' band nationally for wildfire risk to homes (2014 fuels)".
- Pitfalls: modelled, old vegetation, county averages hide the very local risk. It describes the wildland-urban setting, not the house's ignition resistance.
- **Verdict:** needs verification. Reasonable as county-level "wildfire exposure of the area", never "your house".

## 7. Termite zones and IRC regional tables: not suitable

UNVERIFIED (search only).

- The IRC Table R301.2(1) is filled in **by each adopting jurisdiction**: climate zone, frost depth, snow load, wind speed, seismic category, weathering, termite, decay, winter design temperature, flood hazards. Examples seen in search: Cheatham County TN lists "MOD TO HVY", Wiggins CO "Slight to Moderate", Island County WA "Slight to Moderate". Those are local and not a national table.
- The termite infestation probability map (very heavy, moderate to heavy, slight to moderate, none to slight) is a coarse regional map attributed to the Forest Service. Sources disagree on whether the code requires it (WoodWorks calls it a guide; Orkin says officials must use it). I found no county table.
- Pitfalls: the map's age and coarse resolution. Commercial pest-control sites present it with sales intent.
- **Verdict:** not suitable. If a region statement is wanted, use "termite pressure is typically heavy in the Gulf and Southeast, light in the north" at state or region level, with the map cited. Do not state it by ZIP.

## 8. Expansive soils: not suitable

UNVERIFIED (search only).

- USGS "Swelling clays map of the conterminous United States" is Map I-1940 (1989), 1:7,500,000, by Olive and others. Page: https://www.usgs.gov/maps/swelling-clays-map-conterminous-united-states. (The search found no "Hart 1974" source, so that attribution is unconfirmed.)
- It is a national overview built from bedrock geology, not county boundaries, and is too coarse for any parcel or ZIP.
- The practical county-or-finer source is the NRCS soil survey (SSURGO, Web Soil Survey, with shrink-swell ratings). It is large, complex and NRCS-hosted. It was not searched.
- **Verdict:** not suitable for v1. A region-level note ("expansive clay is widespread in parts of Texas, the Plains and the Front Range") would need a citation and a generous disclaimer. Do not bring back address-level expansive-soil advice.

## 9. Lead service lines: partly ready

- **VERIFIED:** EPA's fact sheet "2025 Update to the 7th Drinking Water Infrastructure Needs Survey and Assessment (DWINSA)", November 2025 (https://www.epa.gov/system/files/documents/2025-11/fact-sheet-2025-7th-dwinsa-update.pdf).
  - EPA estimates 4 million lead service lines nationally (3 million reported, plus 1 million of the "unknown" lines predicted to be lead).
  - Under the LCRR, water systems must inventory their lines. States reported to EPA by 31 March 2025 and could update to 30 June 2025.
  - The inventory is in the "service line inventory report" in EPA's SDWIS Federal Reporting Services.
  - **Caveat in EPA's own methodology:** "if a state did not report any data for a water system's inventory, EPA assumed that all its service connections were non-lead." So gaps count as zero lead.
- **VERIFIED:** EPA's LCRR page confirms the initial-inventory requirement (compliance date 16 Oct 2024) and EPA's inventory guidance (4 Aug 2022). URL: https://www.epa.gov/ground-water-and-drinking-water/revised-lead-and-copper-rule
- **UNVERIFIED (search only):**
  - EPA's inventory dashboard is at `sdwis.epa.gov/ords/sfdw_pub/r/sfdw/sdwis_fed_reports_public/service-line-inventory`, with about 56,982 systems in the dashboard versus about 3,520 in the survey.
  - Other analyses (Policy Innovation Lab, NRDC, Rockefeller Institute) restate it. Rockefeller reports about 494,007 in New York.
  - Systems publish their own inventories, often with address-level lookup maps. Those are state- or utility-specific and not a single national file.
- **Granularity:** public water system (PWSID). Not ZIP. A ZIP can have several systems, and private wells serve some homes.
- **Join to ZIP:** there is no official ZIP-to-water-system crosswalk. Water systems have service-area polygons (EPA SABS, or state maps). The Safe Drinking Water Information System lists system "city served" and "county served", not a ZIP. This is a big gap.
- **Plain-language fact (what can responsibly be said):** "Lead service lines were used in older homes. Ask your water utility for its public inventory and check whether your line is lead." State-level counts are possible ("about X lead lines in [state]"), but not "your house".
- **Pitfalls:** "unknown" material is a large share; data completeness varies hugely by state; the inventory describes the utility side and the customer side differently; a house built after 1986 is mostly lead-ban-protected but not guaranteed.
- **Verdict:** not suitable below state level without a service-area join. Ready for a state-level statement and a "check your utility's inventory" pointer, once the EPA dashboard is verified. Needs `sdwis.epa.gov` (a different host from www.epa.gov).

## 10. Water hardness: not suitable

UNVERIFIED (search only).

- The USGS pages give classes: soft 0 to 60 mg/L as CaCO3, moderately hard 61 to 120, hard 121 to 180, very hard above 180 (https://www.usgs.gov/faqs/do-you-have-information-about-water-hardness-united-states and the Water Science School page).
- The national map is old: it is based on a 1975 river survey and describes surface water. A newer NAWQA domestic-well study exists.
- I found no USGS county dataset. A third-party dataset (tapwaterdata.com, about 16,561 cities) mixes utility reports, computed values and county ambient estimates, so it is not authoritative.
- Actual hardness depends on the utility's source and treatment, which can change street to street.
- **Verdict:** not suitable. Use regional wording ("hard water is common across the Midwest, Plains and Southwest") and send the reader to the utility's annual Consumer Confidence Report. It is relevant to water-heater and pipe lifespan, so a regional note is nice-to-have only.

## 12. Other things worth considering

All UNVERIFIED (search only).

- **EPA EJScreen "lead paint" indicator:**
  - It is the share of housing built before 1960, from ACS block-group data, and it is nearly the same as what we can build from B25034.
  - EPA removed EJScreen in early 2025. The search says a Public Environmental Data Partners mirror exists and EPA's January 2025 snapshot pages are on epa.gov.
  - The 1960 cutoff is from Jacobs et al., 2002. Do not use; derive it from ACS.
- **FEMA NFHL (flood zones) by point:** `https://hazards.fema.gov/arcgis/rest/services/public/NFHL/MapServer` (point-intersect query, field `FLD_ZONE`). It needs a latitude and longitude, i.e. an address geocode (Census Geocoder is free), so it is address-level. FEMA says non-effective data must not be used to rate insurance. Runtime-only, would break static generation, and sends the visitor's location to a third party. Not for v1.
- **Census Geocoder** (geocoding.geo.census.gov, free) and **HUD ZIP-tract** crosswalk are plumbing, not facts.
- **EPA radon state pages and state radon programmes** often have finer maps (e.g. county-level test results). State-specific, not national.
- **EIA RECS** (Residential Energy Consumption Survey) gives heating fuel and equipment age by census division, not ZIP.
- **Local permit/assessor data** is where real "your address" facts live; it is the paid or fragmented territory (section d).
- **Census Building Permits Survey** gives county-level counts of new homes by year (1980 onward, plus earlier annual data). It could say "how fast your county was building in the 1970s". Not verified.
- **NOAA climate normals / state climatologist data** could be used for heating and cooling degree days by county. Not checked; the IECC zone already covers the purpose.

---

# Recommended v1 place layer (updated to what actually works)

Build these five, in this order. All are VERIFIED downloadable today from reachable hosts, with no key.

1. **ACS 2024 5-year B25034 + B25035, by ZCTA** (A). Facts: share of homes built before 1960 (and by decade), median year built, and how the visitor's house compares. The star of the layer.
2. **ACS 2024 5-year B25040 heating fuel, by ZCTA** (A). Facts: the common local heating fuel, with oil and propane shares (leads into oil-tank and gas-appliance sections).
3. **ZCTA to dominant county** (B). The join key to the county facts.
4. **EPA radon zone by county FIPS** (C), always with EPA's "test anyway" caveat.
5. **Climate zone by county FIPS** (D), from the verified 2015 DOE/PNNL table, labelled with its year. Swap in the 2021 table if it becomes reachable.

Optional sixth: **NFIP initial-FIRM-year range by county** (F). Verified, but only a county-level proxy. Include only as "flood maps in this county began between YYYY and YYYY".

Dropped from v1: FEMA NRI (E, not downloadable here) and the HUD address-weighted crosswalk (G, token and bot refusal). ACS county fallback is verified but does not work for Connecticut.

## Join strategy (concrete)

1. **ZIP to ZCTA:** identity. If the ZIP is not in the ACS ZCTA table, show no ZIP-level fact.
2. **ZCTA to county:** `tab20_zcta520_county20_natl.txt`. For each ZCTA keep the county with the largest `AREALAND_PART` (dominant), plus any other county with at least about 10% of the ZCTA's land area, if the UI wants to name them. Drop rows with an empty ZCTA.
3. **County key:** 5-digit FIPS from `GEOID_COUNTY_20`. These are the 2020 counties (Connecticut's 8 old counties).
4. **Radon:** match state abbreviation plus exact `COUNTY LABEL` to `national_county2020.txt`, then apply the fix list in section C (Alaska, DC, 3 spellings, 38 Virginia cities by adding " city", 3 merged Virginia cities to their counties; drop Yellowstone; copy Skagway's zone to Hoonah-Angoon `02105`). Never let a merged city overwrite the county's own zone.
5. **Climate:** parse the PDF table, match state plus normalised county name, hand-fix the 28 rows listed in section D, plus Aroostook ME. Commit the reviewed result as a FIPS-keyed file.
6. **NFIP:** split `county` on `/` and `,`, match to FIPS, then per county take min, median, max of valid initial-FIRM years (ignore years above 2026) and the community count.
7. **ACS:** key by ZCTA (`860Z200US` prefix removed). Treat any negative estimate as null. Skip or flag ZCTAs with fewer than 100 housing units. County ACS (`0500000US`) is a fallback for ZCTAs with null data, except Connecticut.
8. **Packaging:** shard by the first 3 digits of the ZIP (889 shards) so a static export serves one small file per lookup. Put the county facts in a single file. Every record carries source and vintage, and the report prints "as of" dates.

## Measured data size (derived from the real files)

| Piece | Rows | Raw JSON | Gzipped |
|---|---|---|---|
| ZCTA shards (dominant county FIPS, ACS reduced record) | 32,961 ZCTAs in 889 shards | 2.40 MB total (largest shard 7.1 KB) | 0.92 MB total; median shard 1.0 KB, largest 2.5 KB |
| County facts (radon, climate 2015, NFIP range) | 3,150 counties | 161 KB | 27 KB |
| County ACS fallback | 3,222 counties | 217 KB | 76 KB |
| **Total v1** | | **about 2.8 MB** | **about 1.0 MB** |

Single-file alternative (all of it in one JSON): 2.77 MB raw, 894 KB gzipped, but sharding is better for page weight.

Reduced ACS record per ZCTA (this is what was measured): `[total_units, median_year, [10 percent shares by build era], [gas%, propane%, electricity%, oil%, wood%], occupied_units]`.

---

# Ready to build: what to download and what to keep

All downloads are plain `curl -sL` with no headers or key.

| File | Exact URL | Size |
|---|---|---|
| Year built (B25034) | `https://www2.census.gov/programs-surveys/acs/summary_file/2024/table-based-SF/data/5YRData/acsdt5y2024-b25034.dat` | 50,103,592 B |
| Median year built (B25035) | `.../data/5YRData/acsdt5y2024-b25035.dat` (same folder) | 15,421,817 B |
| Heating fuel (B25040) | `.../data/5YRData/acsdt5y2024-b25040.dat` | 43,870,500 B |
| Table shells (labels) | `https://www2.census.gov/programs-surveys/acs/summary_file/2024/table-based-SF/documentation/ACS20245YR_Table_Shells.txt` | 5,622,840 B |
| ZCTA to county | `https://www2.census.gov/geo/docs/maps-data/data/rel2020/zcta520/tab20_zcta520_county20_natl.txt` | 6,821,287 B |
| County names and FIPS | `https://www2.census.gov/geo/docs/reference/codes2020/national_county2020.txt` | 126,639 B |
| Radon zones | `https://www.epa.gov/system/files/other-files/2024-06/radon-zones-202406.json` | 620,064 B |
| Climate zones (2015) | `https://www.energy.gov/sites/prod/files/2015/10/f27/ba_climate_region_guide_7.3.pdf` | 6,356,555 B |
| NFIP community status | `https://www.fema.gov/api/open/v1/NfipCommunityStatusBook.csv` | 3,772,519 B |

Total download is about 133 MB, built once. Nothing here goes into the repo except the derived JSON.

**Fields to keep**

- **Per ZCTA (key: 5-digit ZCTA):**
  - From B25034: `E001` total units; `E002` to `E011` each as a percent of `E001`.
  - From B25035: `E001` median year (null if negative).
  - From B25040: `E001` occupied units; `E002` utility gas, `E003` propane, `E004` electricity, `E005` oil, `E007` wood, each as a percent of `E001`.
  - Margins (`M001` of B25034) only if the UI shows uncertainty.
  - From the relationship file: dominant county FIPS (and optional secondary counties with their share).
- **Per county (key: 5-digit FIPS):**
  - Radon: `Zone` (1, 2 or 3).
  - Climate: IECC zone number, moisture letter (A, B, C or none), Building America zone name, and the table year (2015).
  - NFIP: earliest, median and latest initial-FIRM year, community count, and the data date (`lastRefresh`).
  - Optional: county name from `national_county2020.txt`.
- **Always:** source name, vintage and date for each field group.

---

# Hostnames: what is reachable now

| Host | Result |
|---|---|
| `www2.census.gov` | OK. ACS table-based files and the relationship and FIPS files |
| `api.census.gov` | Metadata OK; **data queries need a key** |
| `www.census.gov` | OK (documentation pages) |
| `www.epa.gov`, `www.energy.gov` | OK |
| `www.fema.gov` | **API paths OK** (`/api/open/v1/...`); web pages and PDFs 403 |
| `hazards.fema.gov` | 403 "Access Denied" for every path tried |
| `www.huduser.gov` | Empty HTTP 202 for pages; API 401 (token needed) |
| `www.pnnl.gov` | 403 "Request Rejected" for the PDF and the publication page |
| `basc.pnnl.gov`, `www.osti.gov`, `www.energycodes.gov` | Refused by the session proxy (not allowed) |
| `nri-data-downloads.s3.amazonaws.com` | Bucket does not exist |

If the owner wants the 2021 climate table, they would need to allow `www.osti.gov` (the OSTI copy of PNNL-33270) or `basc.pnnl.gov`, or download the PDF in a browser. For NRI they would download "All Counties - Table" in a browser. Hosts for sections 5 to 10 and 12 are unchanged from the first pass (energycodes.gov, ncsl.org, iccsafe.org, nahb.org, nema.org, fs.usda.gov, wildfirerisk.org, earthquake.usgs.gov, www.usgs.gov, sdwis.epa.gov); none was tested this time.

---

# Which excluded address-dependent issues each dataset lets us responsibly bring back

| Issue | Dataset | What can be said, at what granularity | Not allowed |
|---|---|---|---|
| Flood / pre-FIRM | NFIP Community Status Book (F), VERIFIED | "Flood maps in this county began between YYYY and YYYY." County range only. | Anything about this house's flood zone or insurance cost. That needs the parcel (NFHL plus elevation certificate). |
| Radon | EPA zones (C), VERIFIED | "EPA predicts county average radon potential: Zone N." Always with "test every home". | Skipping a test, or any "safe" claim for Zone 3. |
| Local housing stock and heating fuel | ACS (A), VERIFIED | ZCTA distributions with the margin-of-error rule; compare the visitor's year with the local median. | Claims about a specific neighbour or street. |
| Energy and insulation expectations | Climate zones (D), 2015 table VERIFIED | County level, with the table year. | What the house actually has. |
| Hazard setting (earthquake, hurricane, tornado, hail, winter weather) | NRI (E), UNVERIFIED | Not available yet. | Design categories, wind speeds or any code requirement. |
| Wildfire exposure | USFS WRC (6c), UNVERIFIED | Not available yet. | Wildfire-code compliance. |
| Expansive soil | none suitable (section 8) | Region-level note only. | Any county or ZIP claim. |
| Lead service lines | EPA inventory (section 9), UNVERIFIED | State-level counts and "ask your utility". | Saying a ZIP or house has lead lines. |

# What stays infeasible without paid property data

- Whether this specific house is in a flood zone, its elevation, or its flood insurance history. That needs a geocoded parcel against NFHL plus elevation certificates.
- The actual build year, renovation history, roof age, panel and wiring type, heating and water-heater age, and permit history. Those are assessor, MLS or permit records, available commercially or county by county.
- Whether a lead service line serves this house: only the utility's own record.
- Soil type under this lot, lot-level wildfire defensible space, termite history, and actual radon level. Each needs a site test or a parcel dataset.
- Which edition of the code applied to this house when it was built, where adoption was local. There is no national dataset.
- Anything keyed to the address, such as insurance claims, recall or class-action eligibility, or neighbourhood sales.

All of these stay "ask your inspector, utility or local building department".

---

# Risks and open items

1. **api.census.gov data needs a key.** The bulk files avoid it. If the owner prefers the API, a free key is needed. Rate limits were not seen.
2. **ZIP is not ZCTA.** About 10,000 ZIPs have no ZCTA, and 30% of ZCTAs touch more than one county. Area-based county overlap is not address-based. The HUD crosswalk could not be opened.
3. **Connecticut:** the ACS 2024 county table uses planning regions; the relationship file and the radon, climate and NFIP tables use old counties. County ACS fallback fails there.
4. **Climate zones are the 2015 table.** The 2021 revision is not reachable here and changed some counties. Label the year.
5. **FEMA NRI is unverified:** no file, no column list, and FEMA's appropriate-use wording could not be quoted. It is not in v1.
6. **NFIP data has errors** (initial FIRM years in the 2060s) and is community-level. Filter and use ranges only.
7. **The EPA radon map is 1993 science.** The caveat text is mandatory.
8. **State-specific code years** (section 5) have no ready dataset. Only hand-verified entries should replace "earliest possible" model-code years.
9. **The lead service line inventory** is incomplete and treats missing data as non-lead.
10. **ACS reliability:** small ZCTAs have large margins; 811 ZCTAs have no housing units and a sentinel median of -666666666.
11. Sections 5 to 10 and 12 below still rest on search summaries only.
