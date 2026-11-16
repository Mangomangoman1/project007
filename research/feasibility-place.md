# Feasibility: a "your place" layer for Built In (ZIP / county facts)

Researched 2026-11-16. Nothing was built. Only one file was written.

## Method and evidence labels

- **VERIFIED** means I opened the page or file in this session and it says what is claimed. The URL is given. Where I downloaded and parsed a file, I say so.
- **FROM SEARCH** means it comes from a WebSearch result summary only, so it is unverified. Search summaries sometimes contradict each other, and I flag that where it happens.
- The fetch helper reaches only: www.cpsc.gov, www.epa.gov, www.hud.gov, www.energy.gov, www.nist.gov, www.govinfo.gov, www.atsdr.cdc.gov, www.nachi.org, en.wikipedia.org. Everything else, including census.gov, fema.gov, hazards.fema.gov, huduser.gov, usgs.gov, pnnl.gov, fs.usda.gov, energycodes.gov and ncsl.org, could not be opened. Section B lists the exact hostnames to allow.
- No page text was treated as instructions.

## Summary table

| # | Dataset | Granularity | Verdict | Evidence |
|---|---|---|---|---|
| 1 | EPA Map of Radon Zones | county | **ready** | VERIFIED, file downloaded and parsed |
| 2 | FEMA National Risk Index | county, tract | needs verification | FROM SEARCH |
| 3 | FEMA Community Status Book (initial FIRM date) | NFIP community (about county or city) | needs verification (high value) | FROM SEARCH |
| 4 | DOE/PNNL climate zones by county | county | **ready** (2015 table verified; 2021 update needs verification) | VERIFIED (2015) |
| 5 | State code and CO-alarm adoption years | state | not suitable as a dataset; must be hand-curated | FROM SEARCH |
| 6 | USGS seismic, wind, USFS wildfire | point / county | wildfire: needs verification; seismic and wind: not suitable by ZIP | FROM SEARCH |
| 7 | Termite zones, IRC tables | national map; local code tables | not suitable | FROM SEARCH |
| 8 | Expansive soils | national map | not suitable | FROM SEARCH |
| 9 | Lead service lines | water system | partly ready; needs verification | partly VERIFIED |
| 10 | Water hardness | national map | not suitable | FROM SEARCH |
| 11 | ACS housing tables | county, ZCTA, tract | needs verification, but technically straightforward and the best candidate | FROM SEARCH + VERIFIED ZCTA caveats |
| 12 | Other finds | various | see section 12 | FROM SEARCH |

---

## The join problem (applies to every item)

A ZIP code is a USPS delivery route, not a polygon. The Census "ZCTA" is an approximation of it.

- **Wikipedia on ZCTAs. VERIFIED** (https://en.wikipedia.org/wiki/ZIP_Code_Tabulation_Area):
  - ZCTAs "are not the same as ZIP codes".
  - ZIPs cross county, tract and block boundaries.
  - "Some addresses end up with a ZCTA code that is different from their ZIP code."
  - There are about 42,000 ZIPs but about 32,000 ZCTAs.
  - PO-box-only ZIPs have no ZCTA.
- **HUD USPS crosswalk** (huduser.gov, FROM SEARCH):
  - Quarterly. Built from USPS address counts, so each ZIP-to-county row carries residential, business and total address ratios.
  - Needs a free API token (`Authorization: Bearer`) at `https://www.huduser.gov/hudapi/public/usps`.
  - Bulk Excel downloads also exist.
  - Third-party docs say a "not endorsed or certified by HUD User" notice is expected.
  - 2020-census geographies appear from the 2023 Q1 release.
  - PO-box-only ZIPs are absent.
  - I could not open it, so unverified.
- **Census ZCTA relationship file** (FROM SEARCH):
  - `https://www2.census.gov/geo/docs/maps-data/data/rel2020/zcta520/tab20_zcta520_county20_natl.txt`
  - Pipe-delimited. Reported by a package as about 46,690 rows. Its layout is documented on a census.gov record-layout page.
  - Gives area overlap (land and water), not address counts.
- **Recommendation:**
  - Use the HUD crosswalk for ZIP to county, because it is address-weighted and so better reflects where homes are.
  - Use the Census ZCTA file only as a fallback.
  - ACS data is keyed by ZCTA, not ZIP. For a ZIP with no ZCTA, fall back to its dominant county's figures and say so.
  - Never imply a ZIP-level fact is address-level.
- **Wording rule:** where a ZIP touches several counties, state the county-level fact for each county covering at least about 10% of the ZIP's residential addresses. Or show the worst case with "part of this ZIP is in X County".

---

## 1. EPA Map of Radon Zones: **ready**

- **What and who:**
  - Published by US EPA, from 1993 work (EPA said the map "was developed in 1993").
  - Each county is Zone 1 (highest potential, average indoor radon may be above 4 pCi/L), Zone 2 (2 to 4) or Zone 3 (below 2).
  - VERIFIED: https://www.epa.gov/radon/epa-map-radon-zones-0 and https://www.epa.gov/radon/epa-map-radon-zones
- **Method, per EPA. VERIFIED:** built from indoor radon measurements, geology, aerial radioactivity, soil parameters and foundation types.
- **Granularity:** county. No ZIP, tract or address.
- **Currency:** the map itself is 1993 and static. The text table was re-published in 2024/2025: the page says "September 2025" for the XLS, and the files are dated 2024-05 and 2024-06 in their paths. Treat the zones as 1993 science with a recent file date.
- **Downloads. VERIFIED.** The URLs were taken from the page HTML, and both files returned HTTP 200:
  - JSON: `https://www.epa.gov/system/files/other-files/2024-06/radon-zones-202406.json` (620,064 bytes, application/json)
  - XLS: `https://www.epa.gov/system/files/documents/2024-05/radon_zones-spreadsheet.xls` (658,944 bytes)
  - PDF map: linked from https://www.epa.gov/radon/epa-map-radon-zones
- **Contents. VERIFIED, parsed locally:**
  - Fields are `"County,State"` (e.g. "Autauga, AL"), `"COUNTY LABEL"` ("Autauga County"), `"STATE"` ("Alabama"), `"Region"` and `"Zone"`.
  - 3,196 rows, of which 3,144 are real counties.
  - The rest are 52 header-like rows with `"Zone": "."`: the US, plus each state or DC.
  - Zone 1: 1,074 counties. Zone 2: 1,034. Zone 3: 1,036.
  - Alaska and Hawaii are included.
  - Gotcha: the JSON begins with a UTF-8 BOM, so parse with `utf-8-sig`.
  - Gotcha: **there is no FIPS code.** Join by state name plus county label, and expect hand-fixes. Louisiana parishes, Alaska boroughs and census areas, and Virginia independent cities need care. So does Connecticut, whose planning regions replaced counties in Census geography from 2022. EPA has 8 Connecticut rows, i.e. the old counties.
- **Licence:** US government work. EPA's site does not state a restriction. I did not find an explicit licence statement; this is the normal public-domain position for EPA data. Cite EPA anyway.
- **Static size:** about 3,144 rows of state, county and zone. About 35 KB as minified JSON, about 10 KB gzipped.
- **Plain-language fact:** "EPA classifies [County] as Radon Zone 1 (highest potential). Any house can have high radon. Test it."
- **EPA's own caveats. VERIFIED (same pages):**
  - "The Map of Radon Zones should not be used to determine if individual homes need to be tested."
  - "Homes with elevated levels of radon have been found in all three zones. All homes should be tested for radon."
  - EPA's action level is 4 pCi/L; "consider fixing" between 2 and 4.
  - The map's stated purpose is to help organisations target resources and implement radon-resistant building codes.
  - EPA recommends supplementing it with local data.
- **Pitfalls:**
  - Zones are predictions, not measurements.
  - The county average hides large within-county variation.
  - Never say "your home is safe" for Zone 3. The site must say "test anyway", and must not use the zone to skip a test.
  - Zone 3 does not mean low risk for an individual basement.
- **Verdict:** ready as a county line item with the mandatory EPA caveat text. It can power "radon-resistant construction was/was not likely required here" only if paired with local code adoption, which this data does not give.

## 2. FEMA National Risk Index: needs verification

All FROM SEARCH. hazards.fema.gov and fema.gov are not reachable.

- **What:**
  - FEMA's NRI gives each county and census tract a relative risk score for 18 natural hazards, built from Expected Annual Loss, Social Vulnerability (CDC/ATSDR SVI) and Community Resilience (the University of South Carolina's BRIC index).
  - It is modelled from historical frequency and loss data, not a forecast.
- **Downloads:**
  - https://hazards.fema.gov/nri/data-resources lists the geodatabase, shapefile and CSV downloads. CSVs are county-level (per state) and a tract-level table for all tracts.
  - An S3 mirror page was also in the results: `nri-data-downloads.s3.amazonaws.com`.
  - Search summaries disagree about the latest version. The archive page appears to show up to v1.18.1 (Nov 2021), and I could not confirm a v1.19 or v1.20. Verify the current version and date.
- **Licence:** data.gov listed the US Government Works notice, i.e. public domain. Unconfirmed.
- **Size:** tract CSV with about 85,000 tracts and 400+ columns is likely 100 to 300 MB raw. Keep only the few columns needed.
- **Join:**
  - By county FIPS directly.
  - ZIP to county via the crosswalk.
  - ZIP to tract is possible via the HUD ZIP-tract crosswalk, but the tract fact is still not address-level.
- **Plain-language fact:** "FEMA ranks [County] 'Relatively High' for tornado risk, among the top X% of US counties." Use ratings, not dollar losses.
- **Pitfalls:**
  - It is a relative community-level planning tool, not a property assessment.
  - It excludes flood-insurance zones and building-specific vulnerability.
  - Its disclaimer says the profiles rest on average past conditions, not future predictions.
  - I did not find the exact "not for individual property" wording in search results. Read the NRI technical documentation and disclaimer before using it.
  - The composite Risk Index score mixes in social vulnerability and resilience, which is not what a homeowner expects from "hazard". Show per-hazard Expected Annual Loss rating or hazard-type rating instead.
- **Verdict:** needs verification. Useful and likely high quality. Use only the per-hazard ratings, county-level.

## 3. FEMA Community Status Book / NFIP initial FIRM date: needs verification (important)

FROM SEARCH.

- **What:**
  - OpenFEMA dataset "NFIP Community Status Book v1" (entity `NfipCommunityStatusBook`, id FEMA-0137).
  - Page: https://fema.gov/openfema-data-page/nfip-community-status-book-v1
  - API: `https://www.fema.gov/api/open/v1/NfipCommunityStatusBook` (OpenFEMA REST, JSON, supports `$filter`, `$select`, `$top`, `$skip`; and a `$format=csv` option exists in OpenFEMA generally, unverified for this set).
  - It was updated daily as of a March 2025 refresh date.
- **Key fields, per the OpenFEMA field definitions seen in search:**
  - Initial FIRM identified date (the "first Flood Insurance Rate Map"). FEMA describes this as the dividing line between Pre-FIRM and Post-FIRM buildings.
  - Initial Flood Hazard Boundary Map date.
  - Current effective map date.
  - Regular/emergency program entry date.
  - Community ID (CID), community name and county.
  - If no initial-FIRM date is present, the community has no FIRM or has not adopted it.
  - FEMA's older per-state "Community Status Book Report" PDFs show the same columns, with dates as MM/DD/YY, some with an "(M)" marker.
- **Granularity:** NFIP community, which is a city, town, village or unincorporated county. About 22,000 communities. Not tied to ZIP.
- **Join:**
  - No ZIP field. Join county name or FIPS to a community, then choose a city or "unincorporated county" row.
  - Unreliable for a ZIP that spans several communities.
  - Fixing this properly needs a place or city layer (Census places, or HUD crosswalk to county and "city" name from USPS), plus manual matching.
- **Plain-language fact:** "Your community's first flood map took effect in [year]. Houses built before that were built without flood-map rules: 'pre-FIRM'."
- **Pitfalls:**
  - The initial FIRM date is a community-level proxy. It does not say whether a given house is in a flood zone, nor what it cost to insure.
  - Many sites were built long before or after their community's date, and the flood zone depends on the parcel (NFHL).
  - Dates change when maps are revised.
  - This does not bring back "flood risk for your house".
  - Initial FIRM dates for the pre-FIRM concept are mostly 1970s to 1980s.
- **Size:** about 22,000 rows; thin it to about 4 fields and county.
- **Verdict:** needs verification of the live API and field names. Valuable as "pre-FIRM / post-FIRM era in your community", at community level, with county as a fallback.

## 4. DOE Building America / IECC climate zones by county: **ready** (2015 table verified; 2021 update needs verification)

- **VERIFIED.** DOE publishes the county table at https://www.energy.gov/sites/prod/files/2015/10/f27/ba_climate_region_guide_7.3.pdf (HTTP 200, PDF, about 103,000 characters of text).
  - Title: "Building America Best Practices Series, Volume 7.3, Guide to Determining Climate Regions by County", PNNL-17211 Rev. 3, August 2015.
  - It contains "Counties of the United States by Building America and IECC Climate Zone, Version 6, August 20, 2015", with columns State, County, BA Climate Zone, IECC Climate Zone (1-8) and Moisture Regime (A/B/C).
  - Sample rows: Autauga AL = Hot-Humid / 3 / A. Miami-Dade FL = Hot-Humid / 1 / A. Hawaii County HI = Hot-Humid / 1 / A.
  - Alaska and Hawaii are covered. Climate-zone boundaries follow county lines.
  - A report disclaimer (no warranty, not an endorsement) is on the cover. A US DOE report is a federal work; cite it.
- **The 2015 table is superseded.** FROM SEARCH: PNNL's "Guide to Determining Climate Zone by County: Building America and IECC 2021 Updates" (PNNL-33270, October 2022; also OSTI 1893981) covers every county and links GIS shapefiles. The 2021 IECC changed some county assignments. I could not open it. For an era report, either is acceptable if the year is stated, but prefer the 2021 table. The OSTI and PNNL hosts are needed.
- **Format and size:** a PDF table of about 3,100 rows, two columns per page. Parsing needs care. The 2022 report may ship a spreadsheet at basc.pnnl.gov; unverified. Static size is about 30 KB minified JSON.
- **Join:** county name and state, so the FIPS join has the same naming problems as radon. Use the HUD crosswalk for ZIP to county.
- **Plain-language fact:** "[County] is in IECC Climate Zone 5A (cold, moist). Insulation, vapour-control and heating advice below is tuned to that."
- **Pitfalls:** it tells the climate, not what the house has. It does not show state energy-code adoption. Counties merge and split over time (e.g. Connecticut planning regions, Alaska boroughs).
- **Verdict:** ready for county-level climate zone. It drives insulation and ventilation guidance well.

## 5. State code adoption histories: not suitable as a dataset (hand-curate)

FROM SEARCH. None of energycodes.gov, ncsl.org, nahb.org or iccsafe.org was reachable.

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

### 6a. USGS seismic design (FROM SEARCH)
- The USGS design-maps web service (`https://earthquake.usgs.gov/ws/designmaps/`, e.g. `asce7-22.html`) takes latitude and longitude plus risk category and site class, and returns SDS, SD1 and Seismic Design Category.
- No ZIP or county product. USGS says the services are mostly consumed through third-party tools such as the ASCE Hazard Tool.
- Pitfalls: SDC depends on site class, so a lat/lon with unknown soil is not a house answer. The docs say values are subject to revision.
- Possible: a pre-computed per-county or per-ZCTA-centroid "seismic design category (site class D default)" lookup. A build-time batch of about 33,000 calls would work, but it is a derived dataset and must be labelled as an estimate.
- **Verdict:** not suitable by ZIP unless we run our own build-time batch with labelled assumptions. Prefer the NRI earthquake rating for a simple county fact.

### 6b. Wind and hurricane design zones
- Basic design wind speeds come from ASCE 7 maps. They are tied to location and risk category, and public programmatic access is via ATC or ASCE tools, not via a free national county table (FROM SEARCH, weak; I did not find a specific source).
- Wind-borne debris regions and the 2000-era Florida code changes are local.
- **Verdict:** not suitable. Use the NRI hurricane or tornado ratings as the proxy.

### 6c. USFS Wildfire Risk to Communities (FROM SEARCH)
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

FROM SEARCH.

- The IRC Table R301.2(1) is filled in **by each adopting jurisdiction**: climate zone, frost depth, snow load, wind speed, seismic category, weathering, termite, decay, winter design temperature, flood hazards. Examples seen in search: Cheatham County TN lists "MOD TO HVY", Wiggins CO "Slight to Moderate", Island County WA "Slight to Moderate". Those are local and not a national table.
- The termite infestation probability map (very heavy, moderate to heavy, slight to moderate, none to slight) is a coarse regional map attributed to the Forest Service. Sources disagree on whether the code requires it (WoodWorks calls it a guide; Orkin says officials must use it). I found no county table.
- Pitfalls: the map's age and coarse resolution. Commercial pest-control sites present it with sales intent.
- **Verdict:** not suitable. If a region statement is wanted, use "termite pressure is typically heavy in the Gulf and Southeast, light in the north" at state or region level, with the map cited. Do not state it by ZIP.

## 8. Expansive soils: not suitable

FROM SEARCH.

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
- **FROM SEARCH:**
  - EPA's inventory dashboard is at `sdwis.epa.gov/ords/sfdw_pub/r/sfdw/sdwis_fed_reports_public/service-line-inventory`, with about 56,982 systems in the dashboard versus about 3,520 in the survey.
  - Other analyses (Policy Innovation Lab, NRDC, Rockefeller Institute) restate it. Rockefeller reports about 494,007 in New York.
  - Systems publish their own inventories, often with address-level lookup maps. Those are state- or utility-specific and not a single national file.
- **Granularity:** public water system (PWSID). Not ZIP. A ZIP can have several systems, and private wells serve some homes.
- **Join to ZIP:** there is no official ZIP-to-water-system crosswalk. Water systems have service-area polygons (EPA SABS, or state maps). The Safe Drinking Water Information System lists system "city served" and "county served", not a ZIP. This is a big gap.
- **Plain-language fact (what can responsibly be said):** "Lead service lines were used in older homes. Ask your water utility for its public inventory and check whether your line is lead." State-level counts are possible ("about X lead lines in [state]"), but not "your house".
- **Pitfalls:** "unknown" material is a large share; data completeness varies hugely by state; the inventory describes the utility side and the customer side differently; a house built after 1986 is mostly lead-ban-protected but not guaranteed.
- **Verdict:** not suitable below state level without a service-area join. Ready for a state-level statement and a "check your utility's inventory" pointer, once the EPA dashboard is verified. Needs `sdwis.epa.gov` (a different host from www.epa.gov).

## 10. Water hardness: not suitable

FROM SEARCH.

- The USGS pages give classes: soft 0 to 60 mg/L as CaCO3, moderately hard 61 to 120, hard 121 to 180, very hard above 180 (https://www.usgs.gov/faqs/do-you-have-information-about-water-hardness-united-states and the Water Science School page).
- The national map is old: it is based on a 1975 river survey and describes surface water. A newer NAWQA domestic-well study exists.
- I found no USGS county dataset. A third-party dataset (tapwaterdata.com, about 16,561 cities) mixes utility reports, computed values and county ambient estimates, so it is not authoritative.
- Actual hardness depends on the utility's source and treatment, which can change street to street.
- **Verdict:** not suitable. Use regional wording ("hard water is common across the Midwest, Plains and Southwest") and send the reader to the utility's annual Consumer Confidence Report. It is relevant to water-heater and pipe lifespan, so a regional note is nice-to-have only.

## 11. Census ACS housing tables: needs verification, best candidate

FROM SEARCH, plus VERIFIED ZCTA caveats (see the join section).

- **Publisher:** US Census Bureau, American Community Survey, 5-year estimates (rolling; a new vintage each December).
- **Tables:**
  - **B25034** Year Structure Built (counts per bucket: 2020 or later, 2010-2019, 2000-2009, 1990-1999, 1980-1989, 1970-1979, 1960-1969, 1950-1959, 1940-1949, 1939 or earlier. Bucket edges are those used by recent ACS vintages; check the current vintage's variable list).
  - **B25035** Median Year Structure Built.
  - **B25040** House Heating Fuel (utility gas, bottled gas, electricity, fuel oil/kerosene, coal, wood, solar, other, none).
  - **B25024** Units in Structure.
  - **B25003** Tenure (owner/renter) could be added.
  - Variable codes follow the pattern `B25034_001E` (total) and `B25034_002E` onward, with `M` for margin of error.
- **Geography:** nation, state, county, place, tract, block group, and **ZCTA** (`zip code tabulation area`). Not all tables exist for every geography in every vintage; verify ZCTA availability for 5-year ACS.
- **API (FROM SEARCH):**
  - Pattern: `https://api.census.gov/data/2023/acs/acs5?get=NAME,B25034_001E,...&for=zip%20code%20tabulation%20area:*&key=KEY`
  - County: `for=county:*&in=state:*`.
  - Census's guide says up to 500 queries per IP per day work without a key, and more needs a free key. Another page says a key is now required for all data queries. **Conflicting; assume a free key is needed.**
  - The 2023 page warns that older geography syntax from 2020 or earlier will not work.
  - Bulk alternatives: the ACS summary-file FTP at `www2.census.gov/programs-surveys/acs/data/` and `data.census.gov`.
  - I could not open any of these.
- **Licence:** US Census Bureau data is public domain (Title 13 confidentiality applies to microdata only; tables are open). Attribution is customary.
- **Size:** about 33,000 ZCTAs. Raw ACS 5-year CSV for these 4 tables with margins is tens of MB. After reducing to about 15 derived numbers per ZCTA, plan for about 0.8 to 1.5 MB total, about 250 to 400 KB gzipped. County table: 3,200 rows, about 100 KB.
- **Plain-language facts:**
  - "About 38% of homes in your ZIP were built before 1960. The median home was built in 1974." (B25034 and B25035.)
  - "Most homes here heat with natural gas (62%); 21% use electricity; 9% fuel oil." (B25040.) Fuel oil share is a good lead-in to the oil-tank issue.
  - "Your house is older than most of its neighbours." (compare the visitor's year to the median or to the percentile in the ZCTA's distribution.) This is the most distinctive item.
  - "Pre-1978 share" can be built from B25034 buckets. The 1970-1979 bucket straddles 1978, so say "before 1980" or use "1970 and earlier" to avoid false precision. ACS has no 1978 break.
- **Pitfalls:**
  - These are **sample estimates with margins of error**, large for small ZCTAs. Suppress or flag ZCTAs with small totals, or show only coarse bands ("about a third").
  - ACS "year built" is the owner's or occupant's report, with a known tendency to round and to be wrong. B25034 covers all housing units, including apartments.
  - ZCTA is not ZIP (see the join section). Heating fuel is the **primary** fuel only.
  - 5-year vintages blur time.
  - Block groups would be finer, but have worse margins.
- **Verdict:** needs verification of the endpoint, variable names and ZCTA availability, but it is the best candidate: free, public domain, ZIP-level, and directly about the housing stock.

## 12. Other things worth considering

All FROM SEARCH.

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

# (a) Recommended v1 place layer (4 to 6 datasets)

Build these, in order of value and reliability:

1. **ACS B25034 / B25035 by ZCTA, with county fallback** (item 11).
   - Facts: share of homes built before 1960, median year built, where the visitor's house sits in the local range.
   - This is the star of the layer.
   - Needs verification of the API or bulk file first.
2. **ACS B25040 heating fuel, same geography.**
   - Fact: the common local heating fuel. Flags oil-tank and gas-appliance sections.
3. **EPA radon zone by county** (item 1).
   - The only dataset fully VERIFIED and downloaded.
   - Shown with EPA's required "test anyway" caveat.
4. **DOE/PNNL climate zone by county** (item 4).
   - Drives envelope, moisture and HVAC guidance.
   - Use the 2021 table once verified; fall back to the verified 2015 table.
5. **HUD USPS ZIP-to-county crosswalk** (join table).
   - Not a fact in itself; it feeds items 3, 4 and 6. Use the Census ZCTA relationship file as a fallback.
6. **FEMA NFIP initial FIRM date by community or county** (item 3).
   - Optional for v1 and conditional on a good join.
   - Fact: when flood maps began locally.
   - If the join to ZIP is not reliable, defer it.

Optional sixth: **FEMA NRI per-hazard ratings by county** (item 2), shown as "FEMA rates your county 'Relatively High' for [hazard]".

**Join strategy**

- Pipeline at build time, not in the browser:
  1. ZIP → ZCTA (identity for most; drop PO-box-only ZIPs).
  2. ZIP → county list via the HUD crosswalk, keeping rows with at least 10% of residential addresses, plus the dominant county.
  3. County FIPS as the single key for radon, climate, NRI, wildfire and NFIP. The radon and PNNL tables have no FIPS, so match by name once, hand-fix exceptions, and commit a reviewed mapping file.
  4. ACS tables joined by ZCTA, with the county row as a fallback.
- Ship data as sharded static JSON keyed by the first 3 digits of the ZIP (about 900 shards), fetched on demand. This fits a static export and avoids 33,000 pages.
- Include a vintage and source field in every record, and print "as of" dates in the report.

**Size estimate (static data)**

| Piece | Rows | Raw JSON | Gzipped |
|---|---|---|---|
| ZIP → county (dominant plus others) | about 33,000 | about 0.5 MB | about 0.15 MB |
| Radon + climate + (NRI, NFIP optional) by county | about 3,150 | about 0.1 to 0.4 MB | about 0.03 to 0.1 MB |
| ACS reduced (about 15 values) by ZCTA | about 33,000 | about 1.0 to 1.5 MB | about 0.25 to 0.4 MB |
| ACS reduced by county (fallback) | about 3,150 | about 0.1 MB | about 0.03 MB |
| **Total for v1** | | **about 2 to 3 MB** | **about 0.5 to 0.8 MB** |

Per ZIP shard (about 900 shards): roughly 3 to 5 KB gzipped each. These are my estimates, not measurements, except the radon files (measured: 620 KB JSON source with bulk, about 35 KB after trimming to three fields).

---

# (b) Hostnames that must be allowed to download and verify

Already reachable: `www.epa.gov` (radon verified), `www.energy.gov` (2015 climate table verified), `en.wikipedia.org`.

To be added:

| Host | Needed for |
|---|---|
| `www.census.gov` | Documentation: ACS, ZCTA relationship record layouts, API user guide |
| `api.census.gov` | ACS API (B25034, B25035, B25040, B25024) |
| `www2.census.gov` | ZCTA-county relationship files (`rel2020/zcta520/...`) and ACS bulk files |
| `data.census.gov` | Optional table browser |
| `geocoding.geo.census.gov` | Optional: address geocoder (not needed for v1) |
| `www.huduser.gov` | HUD USPS ZIP crosswalk page, bulk files and API (`/hudapi/public/usps`) |
| `www.fema.gov` | OpenFEMA API (`/api/open/v1/NfipCommunityStatusBook`), NRI documents, dataset pages |
| `hazards.fema.gov` | NRI data-resources and downloads, NFHL service (not for v1) |
| `nri-data-downloads.s3.amazonaws.com` | NRI download mirror, if used |
| `www.pnnl.gov` and `basc.pnnl.gov` | 2021/2022 climate-zone guide and data files |
| `www.osti.gov` | OSTI copy of PNNL-33270 |
| `www.energycodes.gov` | State energy-code status pages |
| `www.ncsl.org` | CO and smoke-alarm statute tables |
| `www.iccsafe.org` | ICC Master I-Code Adoption Chart PDFs |
| `www.nahb.org` | NEC, energy-code and sprinkler adoption PDFs |
| `www.nema.org` | NEC adoption map |
| `www.fs.usda.gov` and `research.fs.usda.gov` | Wildfire Risk to Communities archive pages |
| `wildfirerisk.org` | Wildfire spreadsheets |
| `earthquake.usgs.gov` and `www.usgs.gov` | Design-maps web service, hardness and swelling-clay pages |
| `sdwis.epa.gov` | Lead service line inventory dashboard and export (not `www.epa.gov`) |

Priority for v1 verification: `api.census.gov`, `www2.census.gov`, `www.huduser.gov`, `www.fema.gov` (OpenFEMA), `www.pnnl.gov` / `www.osti.gov`, `hazards.fema.gov`. Those cover items 11, 5/crosswalk, 3, 4 and 2.

---

# (c) Which excluded address-dependent issues each dataset lets us responsibly bring back

| Issue | Dataset | What can be said, at what granularity | Not allowed |
|---|---|---|---|
| Flood / pre-FIRM | NFIP Community Status Book initial FIRM date (item 3), needs verification | "Your community's first flood map was in YYYY; homes built earlier were not built to flood-map rules." Community or county level. | Anything about this house's flood zone or insurance cost. That needs the parcel (NFHL plus elevation certificate). |
| Radon | EPA zones (item 1), verified | "EPA predicts county average radon potential: Zone N." County level, always with "test every home". | Skipping a test or a "safe" claim for Zone 3. |
| Wildfire code / exposure | USFS WRC (item 6c), needs verification | County-level "wildfire risk to homes" band, noting 2014 fuel data. Pair with era facts such as wood shake roofs. | Wildfire-code compliance. There is no dataset of when wildfire codes (e.g. WUI codes) took effect; that remains local and hand-curated. |
| Expansive soil | none suitable (item 8) | Only a region-level note citing the 1989 USGS map. | Any county or ZIP claim. |
| Lead service lines | EPA inventory (item 9), needs `sdwis.epa.gov` | State-level counts, and "ask your utility for its inventory". Possibly water-system level if a ZIP-to-system join is found. | Saying a given ZIP or house has lead lines. Missing data is counted as non-lead by EPA. |
| Hazard setting (earthquake, hurricane, tornado, hail, winter weather) | NRI (item 2), needs verification | County or tract relative rating per hazard. | Design categories, wind speeds or any building-code requirement. |
| Local housing stock | ACS (item 11) | ZIP/ZCTA-level distributions and heating-fuel share, with margin-of-error rules. | Claims about a specific neighbour or street. |
| Energy and insulation expectations | PNNL climate zone (item 4) | County level. | What the house actually has. |

# (d) What stays infeasible without paid property data

- Whether this specific house is in a flood zone, its elevation, or its flood insurance history. That needs a geocoded parcel against NFHL (the free service exists, but it needs an address and a runtime call), plus elevation certificates.
- The actual build year, renovation history, roof age, panel and wiring type, heating and water-heater age, and permit history. Those are assessor, MLS or permit records, available commercially (CoreLogic, ATTOM and similar) or county by county.
- Whether a lead service line serves this house: only the utility's own record, or a customer-side check.
- Soil type under this lot, lot-level wildfire defensible space, termite history, and actual radon level. Each needs a site test or a parcel dataset.
- Which edition of the code applied to this house when it was built, where adoption was local (county or city). There is no national dataset. A paid code-adoption history service might exist but I did not find one.
- Anything keyed to the address, such as insurance claims, recall or class-action eligibility, or neighbourhood sales.

All of these should remain "ask your inspector, utility or local building department", worded as such.

---

# Risks and open verification items

1. ACS API details (key requirement, ZCTA availability for B25034/B25035/B25040 in the current vintage) are FROM SEARCH only. The search results conflicted on whether a key is required.
2. The ZIP to county step is approximate in every case. Wikipedia (verified) and HUD (search) both say so. Wording in the UI must reflect that.
3. The radon and PNNL tables lack FIPS, so a one-off name-matching and review step is needed (Connecticut, Louisiana, Alaska, Virginia).
4. The NRI version and licence are unconfirmed (search suggests v1.18.1 at Nov 2021 as the latest listed; the current version is unknown).
5. The EPA radon map is 1993 science. The caveat text is mandatory.
6. The state-specific code years (item 5) have no ready dataset. Only hand-verified entries should replace the "earliest possible" model-code years.
7. The lead service line inventory is incomplete and treats missing data as non-lead.
8. The search tool's summaries are not primary sources. Treat every FROM SEARCH line as a lead to check.
