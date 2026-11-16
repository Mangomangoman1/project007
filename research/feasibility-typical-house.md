# Feasibility: "the typical house of your year and region" (Built In)

First pass 2026-11-16 (search summaries only). Verification pass 2026-11-16 (this version): the Census, EIA, NPS and Wikipedia sources were opened and the Census historical tables were downloaded and parsed. Nothing was built. No other repo file was touched.

## How to read this file

- **VERIFIED** means the page or file was opened this session and the quoted fact is in it. The URL is given.
- **VERIFIED-NPS / VERIFIED-WIKIPEDIA** (style table only) name the source that supports the date range.
- **VERIFIED-WIKIPEDIA†** means the Wikipedia page was opened in the first pass and the claim was recorded there, but it was not re-opened in this pass.
- **UNVERIFIED** means a search summary, background knowledge, or a claim I could not find in the source. Do not build on it.
- Downloaded files live outside the repo in `/tmp/claude-0/-home-user-project007/ee67fba6-1243-5204-8e39-de9f8945e204/scratchpad/soc-data/`. They were parsed with `python3 -I` scripts kept in `.../scratchpad/parse/`. Nothing from them was executed.

## Bottom line (corrected)

The feature is buildable from the Census Survey of Construction (SOC). Real downloadable spreadsheets exist, with US plus four Census regions, one row per year, for houses COMPLETED.

- Foundation, heating fuel and garage/parking start in **1971**. Primary exterior wall, air conditioning, heating system, bedrooms, bathrooms, fireplaces and median/average square feet start in **1973**. Stories start in **2009** in the current XLS, and **1973** in the 2008 PDF (different categories). Framing, outdoor features and lot size start in 2009 or 2010.
- Percent distributions are published directly, along with counts in thousands.
- **Roofing material is not collected by the SOC.** It is not in any table, the microdata variable list, or the 2008 and 2017 annual reports. The only roof-material source found for existing homes is EIA RECS (2020 and 2024), by year-of-construction band.
- Houses completed before 1971: only scanned PDFs, not in tables, and not reachable in full from here (see section 4).
- The earlier claim that the "first year is probably 1973 for everything" was wrong in two directions. Foundation and heating fuel go back to 1971. Stories and framing do not.

---

## 1. SOC "Characteristics of New Housing": what is published

### Pages opened (all VERIFIED)
- Main page: https://www.census.gov/construction/chars/ . It says: "This page provides national, annual data on the characteristics of new privately-owned residential structures, such as square footage, number of bedrooms and bathrooms, type of wall material, and sales prices. Many characteristics are available at the region level." Annual data for 2025 were published July 1, 2026.
- Current data (all XLS links): https://www.census.gov/construction/chars/current.html
- Historical tables page: https://www.census.gov/construction/chars/historical/tables.html . It offers annual report PDFs for 2003 to 2017 only (`https://www.census.gov/construction/chars/pdf/c25annYYYY.pdf`). It does not offer spreadsheets for older years.
- Summary of changes: https://www.census.gov/construction/chars/historical/changes.html
- Microdata page: https://www.census.gov/construction/chars/microdata.html
- Citation rule: https://www.census.gov/about/policies/citation.html says to cite the Census Bureau as the source of the original data, and that conclusions from your own analysis are your responsibility.

### Key finding: the "current data" XLS files are full time series
The current-data XLS files are not single-year tables. For example `foundation_cust.xls` has one row per year from 1971 to 2025 for the US and for each of the four regions. These are the historical tables the feature needs. All URLs are `https://www.census.gov/construction/chars/xls/<file>`.

### Characteristic matrix: single-family houses COMPLETED
Each workbook has four sheets: Total (includes houses built for rent), built for sale, contractor-built, owner-built. Use the Total sheet. Geography is US plus Northeast, Midwest, South and West in every row below, unless stated.
All values are VERIFIED by download and parse.

| Characteristic | File | US/regions: first - last year | Values | Categories |
|---|---|---|---|---|
| Foundation | `foundation_cust.xls` | 1971 - 2025 | counts (thousands) and percent | Full or partial basement; Slab or other types; Crawl space. Slab is merged with "other" (pilings, piers). It is not possible to separate slab from other in this table. |
| Primary exterior wall | `exwallmat_cust.xls` | 1973 - 2025 | counts and percent | Brick; Wood; Stucco; Vinyl siding (numbers from 1992); Fiber cement (from 2005); Other. |
| Secondary exterior wall | `exwallmat2_cust.xls` | 1999 - 2025 | counts and percent | Same plus "None". |
| Heating fuel | `heatingfuel_cust.xls` | 1971 - 2025 (small regional cells start later, see breaks) | counts and percent | Gas (natural and bottled/LPG together); Electricity; Oil (not published from 2014); Other or none. |
| Heating system | `heatsystem_cust.xls` | 1973 - 2025 | counts and percent | Forced-air furnace; Heat pump total (from 1978); Air-source and ground-source heat pump (from 2000); Hot water or steam; Other or none. |
| Air conditioning | `aircond_cust.xls` | 1973 - 2025 | counts and percent | With; Without. |
| Stories | `stories_cust.xls` | **2009** - 2025 | counts and percent | 1 story; 2 stories (includes 1.5 and split-level); 3 or more. |
| Stories (older) | `c25ann2008.pdf`, "Number of Stories in New One-Family Houses Completed" (printed pp. 451-457) | 1973 - 2008 | counts and percent, PDF only | 1 story; 2 stories or more; Split-level. Text layer present, so it can be parsed with `pdftotext -layout`. |
| Square feet, median and average | `squarefeet_cust.xls`, sheet `SFTotalMedAvgSqFt` | 1973 - 2025 | square feet, not counts | Median and average, US and four regions. |
| Square feet, size bands | `squarefeet_cust.xls`, sheet `SFTotalSqFt` | 1999 - 2025 | counts and percent | Under 1,400; 1,400-1,799; 1,800-2,399; 2,400-2,999; 3,000-3,999; 4,000+. |
| Bedrooms | `bedrooms_cust.xls` | 1973 - 2025 | counts and percent | 2 or fewer; 3; 4 or more. |
| Bathrooms | `bathrooms_cust.xls` | 1973 - 2025 | counts and percent | 1.5 or fewer; 2; 2.5; 3 or more. |
| Garage / carport | `parking_cust.xls` | 1971 - 2025 | counts and percent | 1 car; 2 cars; 3 or more cars (3+ is merged into "2 cars" before 1992); Carport; No garage or carport. |
| Fireplaces | `fireplace_cust.xls` | 1973 - 2025 | counts and percent | None; 1; 2 or more. |
| Framing | `framing_cust.xls` | 2009 - 2025 | counts and percent | Wood; Steel; Concrete (includes ICF). |
| Outdoor features | `outdoorfeatures_cust.xls` | 2010 - 2025 | counts and percent | Patio, porch and deck combinations; none. |
| Lot size | `lotsize_cust.xls` | 2009 - 2025 | counts and percent, plus median/average sheets | Five size bands in square feet. |

### Houses SOLD (separate files, `sold*_cust.xls`)
The sold files add attached, detached and Puerto Rico sheets. Their first years differ.

| Characteristic | US first year | Regions first year |
|---|---|---|
| Foundation (`soldfoundation_cust.xls`) | 1978 | 1999 |
| Primary wall (`soldexwallmat_cust.xls`) | 1994 | 1999 |
| Heating fuel (`soldheatingfuel_cust.xls`) | 1985 | 1999 |
| Air conditioning (`soldaircond_cust.xls`) | 1978 | 1999 |
| Stories (`soldstories_cust.xls`) | 2005 | 2005 |
| Square feet (`soldsquarefeet_cust.xls`) | not checked for US | 1999 |

The "completed" series is the better fit for "built in year X". Use sold only as a cross-check.

### Relative standard error
The completed tables carry one RSE/SE row per region block, and it is for the latest year only (2025). For example foundation, US: RSE 4 (total), 43 (basement count), 10 (slab count), 30 (crawl count), with percentage-point SEs of 7, 8 and 4 for the three shares. There are no per-year RSEs. The 2008 PDF also gives RSEs for 2008 only. Do not claim a per-year margin of error. State that sampling error is larger for older years, small regions and rare categories, and cite the latest-year RSE only as a rough guide.

### Roofing
- Not in the 2025 current-data list (https://www.census.gov/construction/chars/current.html).
- Not in the 2008 report index (`c25ann2008.pdf`) or text. Neither the 2008 nor the 2017 PDF contains the word "roof".
- Not in the 66-row microdata variable guide `https://www.census.gov/construction/chars/xls/socmicro_variables.xls` or `https://www.census.gov/construction/chars/pdf/socmicro_info.pdf`.
- **Conclusion (VERIFIED): the SOC has no roofing field.**

### Series breaks and definition changes (VERIFIED from XLS footnotes, the changes page, and the microdata guide)
- **Pre-1999 counts** include an upward adjustment of 3.3 percent for houses built in permit-issuing areas without permits. Percent shares are computed from the adjusted counts. Do not splice counts across 1998/1999 without saying so.
- **Foundation:** "Slab" is "Slab or other types". No category change found across 1971-2025.
- **Exterior wall:** Vinyl is not shown (NA) before 1992, so earlier vinyl is inside "Other". Fiber cement values appear from 2005 in the XLS, although the changes page says fiber cement was added "beginning with data for 2002". Aluminum is no longer separate (2008 change), so "Other" holds aluminum, concrete block, stone and others. Regional cells for Stucco are "S" (withheld) in the Northeast and Midwest for 1973 to 1998. Many such "S" cells.
- **Heating fuel:** From 2014, oil and kerosene are folded into "Other types or none" (the Oil column is "(NA)" from 2014). Gas includes bottled LPG. Small regional cells carry "(Z)" (under 500 units or 0.5 percent) and "(S)" (1994 to 1998 in all four regions).
- **Heating system:** Heat pump is "(NA)" before 1978, and the air-source/ground-source split is only from 2000 (released 2018). Before 1999 most columns for heat pump are NA.
- **Stories:** Two incompatible schemes. Through 2008 (PDF): 1 / 2+ / split-level. From 2009 (XLS): 1 / 2 (includes split-level and 1.5) / 3+. The changes page (2013 and 2016 entries) says split-level was folded into 2 stories. Do not draw one line across 2008/2009 without a note. Only "1 story" is roughly comparable (2008 US 44%, 2009 US 47%).
- **Bathrooms:** the "2.5 baths" column includes 2.5 or more through 1986.
- **Garage:** "2 cars" includes 3 or more cars before 1992.
- **2013:** Metro/non-metro and cross-tabs were dropped from regional tables.
- **Square feet bands** were redefined in 2008 and again later. Median and average are continuous 1973-2025.
- **Suppression marks:** `(NA)` not available, `(S)` withheld, `(Z)` under 500 units or 0.5 percent, `(A)` RSE of 100 percent or more. Every parser must treat these strings as non-numeric.

### What was NOT found
- No per-year RSE. No state level. No division level in tables. Division is only in microdata (section 5).
- `current.html` says nothing about licence. The citation page asks for citation of the Census Bureau as source (VERIFIED). A "public domain" statement from census.gov was not found. Licence is UNVERIFIED. Federal data are conventionally free to reuse, but check before launch.

---

## 2. Sanity check: values parsed from the downloaded files (VERIFIED)

Percent of single-family houses COMPLETED in the year. Counts are in thousands. Percentages may not sum to 100 because of rounding. "NA", "S", "Z" are the Census marks.

### Foundation: basement / slab or other / crawl space (`foundation_cust.xls`)
| Year | US (count) | Northeast | Midwest | South | West |
|---|---|---|---|---|---|
| 1975 | 45 / 35 / 20 (875k) | 75 / 16 / 9 | 79 / 8 / 13 | 20 / 54 / 26 | 33 / 45 / 23 |
| 1987 | 39 / 43 / 18 (1,123k) | 76 / 17 / 6 | 77 / 13 / 11 | **20 / 56 / 25** | 16 / 63 / 21 |
| 2000 | 37 / 46 / 17 (1,242k) | 86 / 10 / 4 | 79 / 13 / 8 | 15 / 64 / 21 | 21 / 56 / 23 |
| 2020 | 22 / 65 / 12 (912k) | 68 / 24 / 8 | 64 / 32 / 4 | 6 / 82 / 11 | 24 / 55 / 20 |

**1987 South: slab or other 56%, crawl space 25%, basement 20%** (467,000 houses; the three shares add to 101 because of rounding).

### Primary exterior wall: brick / wood / stucco / vinyl / fiber cement / other (`exwallmat_cust.xls`)
| Year | US | Northeast | Midwest | South | West |
|---|---|---|---|---|---|
| 1975 | 32 / 36 / 10 / NA / NA / 22 | 8 / 44 / S / NA / NA / 47 | 16 / 54 / S / NA / NA / 29 | 61 / 20 / 3 / NA / NA / 16 | 8 / 41 / 40 / NA / NA / 11 |
| 1987 | 18 / 41 / 15 / NA / NA / 26 | 5 / 47 / S / NA / NA / 48 | 14 / 51 / S / NA / NA / 34 | **34 / 35 / 6 / NA / NA / 24** | 2 / 40 / 52 / NA / NA / 6 |
| 2000 | 20 / 14 / 17 / 39 / NA / 8 | 4 / 19 / 2 / 73 / NA / 2 | 11 / 18 / 1 / 62 / NA / 8 | 38 / 6 / 8 / 34 / NA / 13 | 1 / 23 / 56 / 14 / NA / 6 |
| 2020 | 19 / 5 / 27 / 25 / 22 / 2 | 4 / 11 / 2 / 70 / 10 / 3 | 7 / 18 / 1 / 61 / 11 / 2 | 32 / 1 / 26 / 20 / 19 / 2 | 1 / 5 / 52 / 4 / 37 / 1 |

Note the 1975 and 1987 "Other" shares (22 to 48 percent) are large because vinyl and aluminum are inside Other before 1992.

### Heating fuel: gas / electricity / oil / other (`heatingfuel_cust.xls`)
| Year | US | Northeast | Midwest | South | West |
|---|---|---|---|---|---|
| 1975 | 40 / 49 / 9 / 2 | 24 / 33 / 41 / 3 | 49 / 38 / 9 / 4 | 29 / 66 / 4 / 1 | 59 / 39 / Z / 2 |
| 1987 | 52 / 40 / 5 / 3 | 44 / 27 / 27 / 2 | 83 / 13 / 1 / 3 | **33 / 65 / Z / 2** | 68 / 25 / Z / 7 |
| 2000 | 70 / 27 / 3 / 1 | 65 / 6 / 28 / Z | 92 / 7 / Z / 1 | 50 / 50 / Z / Z | 91 / 8 / Z / 2 |
| 2020 | 55 / 45 / NA / 1 | 86 / 11 / NA / 2 | 87 / 12 / NA / 1 | 32 / 68 / NA / Z | 80 / 19 / NA / 2 |

### Air conditioning: percent with (`aircond_cust.xls`)
| Year | US | Northeast | Midwest | South | West |
|---|---|---|---|---|---|
| 1975 | 46 | 13 | 35 | 71 | 29 |
| 1987 | 71 | 48 | 67 | **92** | 55 |
| 2000 | 85 | 73 | 89 | 99 | 60 |
| 2020 | 95 | 89 | 97 | 100 | 86 |

1973 US was 49 percent. The earlier "49% in 1973 and 46% in 1975" secondary figures do not disagree: they are two different years, and both match the Census table.

### Stories (two schemes, see breaks)
Through 2008, percent 1 story / 2 or more / split-level (`c25ann2008.pdf`):

| Year | US | Northeast | Midwest | South | West |
|---|---|---|---|---|---|
| 1975 | 65 / 23 / 12 | 48 / 42 / 10 | 57 / 22 / 21 | 78 / 16 / 6 | 62 / 24 / 14 |
| 1987 | 49 / 46 / 5 | 25 / 70 / 5 | 46 / 42 / 11 | **59 / 39 / 2** | 52 / 43 / 6 |
| 2000 | 47 / 52 / 1 | 19 / 81 / Z | 45 / 50 / 5 | 53 / 47 / Z | 48 / 50 / 2 |

From 2009, percent 1 story / 2 stories (includes split-level) / 3 or more (`stories_cust.xls`):

| Year | US | Northeast | Midwest | South | West |
|---|---|---|---|---|---|
| 2020 | 50 / 45 / 5 | 21 / 67 / 13 | 55 / 43 / 2 | 54 / 43 / 4 | 46 / 48 / 6 |

### Median square feet (`squarefeet_cust.xls`, sheet `SFTotalMedAvgSqFt`), US / NE / MW / S / W
- 1975: 1,535 / 1,405 / 1,460 / 1,605 / 1,510
- 1987: 1,755 / 1,840 / 1,740 / 1,755 / 1,730
- 2000: 2,057 / 2,266 / 1,971 / 2,075 / 2,014
- 2020: 2,261 / 2,259 / 2,123 / 2,293 / 2,242

### Cross-check against microdata
I weighted the 1999 microdata file (`soc99.zip`, 34,127 records) by completion date in 1999. US: basement 36.3 percent, crawl 17.0, slab 44.5 plus other 1.8 (46.3 combined). The table says 36 / 47 / 17. The two sources agree.

---

## 3. Which characteristics, from which year, at which geography

| Item | From | Geography | Notes |
|---|---|---|---|
| Foundation | 1971 | US + 4 regions | slab and other merged |
| Heating fuel | 1971 | US + 4 regions | oil merged into other from 2014 |
| Garage / carport | 1971 | US + 4 regions | 3+ merged into 2 cars before 1992 |
| Primary wall, AC, heating system, bedrooms, bathrooms, fireplaces, median/avg sq ft | 1973 | US + 4 regions | vinyl from 1992, fiber cement from 2005 |
| Stories | 1973 (PDF only, older categories), 2009 (XLS, new categories) | US + 4 regions | break at 2009 |
| Secondary wall, size bands | 1999 | US + 4 regions | |
| Framing, lot size | 2009 | US + 4 regions | |
| Outdoor features | 2010 | US + 4 regions | |
| Roofing | never | none | not collected |
| Divisions | 1999 (microdata only) | 9 divisions | no state or metro |

---

## 4. Houses completed before the first table year

- The XLS series already go back to **1971** for foundation, fuel and parking. Nothing in the XLS or the 2008 PDF goes earlier.
- The 1975 library page says "This is the thirteenth annual report of the C25 Series" (https://www.census.gov/library/publications/1975/econ/c25-7513.html). That implies the annual report began in 1963. VERIFIED statement; the 1963 start is my inference from "thirteenth".
- Census library pages that exist: 1975, 1977 (https://www.census.gov/library/publications/1977/econ/c25-7713.html), 1980, 1985 and 1990 (page pattern `.../library/publications/<year>/econ/c25-<yy>13.html`). The 1975 and 1977 pages carry an introduction only. No PDF link was found for them.
- Scanned PDFs on census.gov (VERIFIED to download):
  - https://www.census.gov/content/dam/Census/library/publications/1980/econ/c25-8013.pdf (71 pages, image only, no text layer)
  - https://www.census.gov/content/dam/Census/library/publications/1985/econ/c25-8513.pdf
  - https://www.census.gov/content/dam/Census/library/publications/1990/econ/c25-9013.pdf (reachable, 200)
  These cover the 1980, 1985 and 1990 report years. Whether they contain tables for years before 1971 was not checked. They are scans, so not machine-readable. I did not transcribe them.
- HUD-hosted copies of the 1968 (HUD-11674_v2), 1969 (HUD-11675_v2), 1971 (HUD-11676_v2), 1972 (HUD-789) and 1974 (HUD-791) reports are named by search results at `https://www.huduser.gov/Publications/pdf/<name>.pdf`. **huduser.gov refused automated requests** (HTTP 202 with an AWS WAF "challenge" header, empty body). I recorded this and moved on. Contents UNVERIFIED.
- www2.census.gov: the directories `/library/publications/1968/` to `/1980/` list no "econ" folder, so the C25 PDFs there are not mirrored.
- Verdict: pre-1971 data on how new houses were built is not available in machine-readable form. A v2 could transcribe the 1960s reports, but only after checking that the HUD PDFs can be fetched.

---

## 5. Microdata (VERIFIED, https://www.census.gov/construction/chars/microdata.html)

- Annual files for houses started, sold and/or completed. **First year 1999.** Latest 2025 (published July 1, 2026). 1999 to 2019 are zipped `.xls`; 2020 on are `.xlsx` (`soc99.zip` ... `soc19.zip`, `soc20.xlsx` ... `soc25.xlsx`, all at `https://www.census.gov/construction/chars/xls/`). SAS files on request by phone only.
- **Census divisions: yes, from the first year.** Variable `DIV` (1 New England ... 9 Pacific). I confirmed it in the 1999 file: all nine divisions are present (counts 1,612 to 9,299 records each). The guide (`socmicro_info.pdf`) says "Available geography: Census Division". There is no state or metro field after 2017 (METRO discontinued 2017).
- Variables used here: `BASE` (foundation: basement, crawl, slab, other), `WAL1` (primary wall: wood, brick, aluminum, stucco, vinyl, block, stone, fiber cement, other; aluminum merged into other from the 2008 file), `FUEL`, `HEAT`, `ACS`, `STOR`, `GAR`, `BEDR`, `FULB`, `HAFB`, `FPLS`, `SQFS`, `COMP` (completion YYYYMM), `WEIGHT`. `FRAME` from 2009. No roof variable exists.
- The weight must be used. SQFS and prices are top- and bottom-coded.

---

## 6. American Housing Survey (AHS)

- VERIFIED (https://www2.census.gov/programs-surveys/ahs/2023/2023%20AHS%20Historical%20Changes.pdf): the survey began in 1973 as the Annual Housing Survey. Since 1981 the Census Bureau has run the national survey every odd-numbered year. It was renamed the American Housing Survey in 1984. It was redesigned in 2015 with a new longitudinal sample. (This corrects the earlier "biennial since 1983" from Wikipedia.)
- VERIFIED (https://www2.census.gov/programs-surveys/ahs/2023/2023__AHS_Items_Booklet.pdf): the 2023 questionnaire asks year built (`BUILTQ`: a year or a decade), foundation (`CELAR1Q`: basement, crawl space, concrete slab, other) and number of floors in the unit. The only roof and wall items are condition questions (holes, missing shingles, sagging, missing siding, leaning) and "added or replaced roofing / siding" (`ROOF`, `SIDING`). I found no roof-material or wall-material question.
- VERIFIED (https://www.census.gov/content/dam/Census/programs-surveys/ahs/tech-documentation/AHS%20Codebook%201997%20and%20later.pdf): `CELLAR` ("Unit has a basement": basement all, basement part, crawl space, slab, other) is present in 1997, 1998 MSA, 1999, 2001, 2002 MSA, 2003, 2004 MSA, 2005, 2007, 2009, 2011 and 2013 files (national and metro). `BUILT` (year unit built) and `FLOORS` exist. The roof and wall variables in this codebook are the condition ones (`EHOLER`, `EMISSR`, `EMISSW`, `ESAGR`, `ESLOPW`), not material. **The earlier "UNVERIFIED (background)" claim that pre-2015 AHS asked wall and roof material is not supported by the 1997-and-later codebook.** I did not check 1973-1995 files.
- Files: https://www2.census.gov/programs-surveys/ahs/2023/ (national and metropolitan PUFs in CSV and SAS, v1.1; "2023 AHS Definitions.pdf"), and a 2026 folder with the 2026-2027 items booklet. The Table Creator page was not opened.
- Caveats: describes surviving stock, so renovations leak in. The 1997-2013 codebook was prepared under HUD contract. https://www.huduser.gov refused automated requests (WAF challenge), so the HUD copies of the files and the 1997-2013 re-release were not checked.
- Verdict: AHS can give "foundation by year built (band) by region" for the 1997-2013 files and for 2015 onward (via `CELAR1Q`). It cannot give wall or roof material. Use it only as an existing-stock cross-check for foundation and stories. Not needed for v1.

---

## 7. EIA RECS (existing stock, by year of construction)

- VERIFIED (https://www.eia.gov/consumption/residential/data/2024/ and https://www.eia.gov/consumption/residential/data/2020/): there is now a **2024** RECS. Preliminary housing characteristics tables were released March 2026. Microdata are listed as released May 2026. The 2020 edition is also available.
- VERIFIED by download (https://www.eia.gov/consumption/residential/data/2024/hc/xls/HC2.3_2024.xlsx): **Table HC2.3 "Structural and geographic characteristics by year of construction"** (number of housing units in millions) has columns Before 1950, 1950-59, 1960-69, 1970-79, 1980-89, 1990-99, 2000-09, 2010-19, 2020-24. Rows include Census region and nine divisions, housing unit type, **number of stories**, **major outside wall construction** (siding, brick, wood, stucco, concrete block, composition shingle, stone), **major roofing material** (composition/asphalt shingles, metal, wood shingles or shakes, ceramic or clay tiles, concrete tiles, slate or synthetic slate, other), basement (yes/no, finished/unfinished), attic, attached garage and size, insulation adequacy and window types. There is an RSE sheet. Cells marked "Q" are unreliable.
- Limit: each variable is crossed with year of construction for the US total only. The region rows give housing units by vintage but not wall or roof by vintage by region. A wall-by-vintage-by-region cut needs the microdata.
- VERIFIED (https://www.eia.gov/consumption/residential/data/2024/xls/2024%20RECS%20Codebook%20for%20Public%20File%20v1.xlsx): public microdata variables include `YEARMADERANGE` (9 bands as above), `REGIONC`, `DIVISION`, `state_postal`, `STORIES`, `CELLAR` (over basement), `CRAWL`, `CONCRETE` (over a slab), `BASEOTH`, `BASEFIN`, `WALLTYPE`, `ROOFTYPE`, plus imputation flags (`ZWALLTYPE`, `ZROOFTYPE`). The CSV is https://www.eia.gov/consumption/residential/data/2024/csv/recs2024_public_v1.csv (about 24.7 MB; header confirmed, file not downloaded).
- 2020 tables: the same HC2.3 table is listed on the 2020 page (https://www.eia.gov/consumption/residential/data/2020/). My download attempt at a guessed 2020 path returned an HTML error page. Not checked further. The 2020 codebook is `.../2020/xls/RECS 2020 Codebook for Public File - v7.xlsx` (link seen, not opened).
- Foundation by vintage: the microdata have it (basement, crawl, slab). The HC2.3 table shows basement only.
- Licence VERIFIED: https://www.eia.gov/about/copyrights_reuse.php says US government publications are in the public domain; acknowledge the source with a date.
- Caveats: existing stock, retrofitted; household-reported; the first band is the very coarse "Before 1950".
- Verdict: the only practical source of roof and wall material by era. Use for an optional "homes of your era that are still standing" panel. Label it "present day".

---

## 8. DOE / NREL ResStock (carried over)

- VERIFIED (first pass) https://www.energy.gov/eere/buildings/resstock and https://www.energy.gov/cmei/buildings/us-residential-building-stock-analysis : ResStock is a model combining RECS and other data. It outputs modelled dwelling units with foundation type, wall construction, insulation and so on. Datasets 2022.1, 2024.1 and 2024.2 are public.
- UNVERIFIED: the input-source list from resstock.readthedocs.io, the validation study, the licence, and the data-lake path.
- Verdict unchanged: not suitable for "X% of homes built in year Y had Z". Always call it "modeled".

## 9. Decennial census housing data (carried over)

- UNVERIFIED (search summaries only): 1940 Census of Housing asked exterior material, heating equipment and fuel, year built. 1950-1970 items. IPUMS terms. Not re-checked this pass.
- Verdict unchanged: a v2 at best. These describe existing housing at the census date, by period built.

---

## 10. Architectural styles: 27-row table checked against NPS and Wikipedia

### What NPS gives (VERIFIED)
- National Register Bulletin 16A, "How to Complete the National Register Registration Form" (https://www.nps.gov/subjects/nationalregister/upload/NRB16A-Complete.pdf), pages 25-26: a list of architectural style names grouped in period headings (Colonial, Early Republic, Mid-19th Century, Late Victorian, Late 19th and 20th Century Revivals, Late 19th and Early 20th Century American Movements, Modern Movement). It is adapted from Whiffen, Blumenson, Poppeliers and the McAlesters. **It gives no year ranges.** It confirms the style names exist as formal categories.
- National Register Bulletin 15 (https://www.nps.gov/subjects/nationalregister/upload/NRB-15_web508.pdf) and Bulletin 39 (https://www.nps.gov/subjects/nationalregister/upload/NRB39-Complete.pdf): no style date ranges found. Bulletin 39 points to Blumenson's *Identifying American Architecture* (1600 to 1945) as a reference.
- National Register Bulletin 46, "Historic Residential Suburbs" (https://www.nps.gov/subjects/nationalregister/upload/NRB46_Suburbs_part1_508.pdf): context dates, not style ranges. It uses 1830-1960 as its overall period. "The Practical Suburban House, 1890 to 1920": the American foursquare "made its appearance in the 1890s, and by the 1930s, was a fixture of American neighborhoods"; "By 1910, the bungalow had become the ideal suburban home"; the Open Plan Bungalow at its height in the 1920s (for catalog houses). "Small House Movement, 1919 to 1945"; FHA Minimum House 1931 to 1948. "The Postwar Suburban House and Yard, 1945 to 1960": the Cape Cod "provided most of the low-cost suburban housing immediately following the war" (Levittown, June 1947); "The suburban Ranch house of the 1950s", with California architects adapting it in the 1930s; "The Contemporary House". The terms "Minimal Traditional" and "split-level" do not appear in it.
- NPS article on Federal style (https://www.nps.gov/articles/000/federal-style-architecture.htm): "The Federal style was prominent in the United States and Britain between the 1780s and ca.1840s."
- NPS National Register nominations (many, in search results) give local dates only. They are not national definitions.

### Table
"Range" is the proposed "popular c." range. "Mark" is VERIFIED-NPS, VERIFIED-WIKIPEDIA, VERIFIED-WIKIPEDIA† (first pass, not re-opened) or UNVERIFIED. Wikipedia URL pattern: `https://en.wikipedia.org/wiki/<title>`.

| # | Style | Range (popular) | Mark and basis |
|---|---|---|---|
| 1 | Georgian | c.1700-1780 US window | VERIFIED-WIKIPEDIA† for the era (Georgian architecture, 1714-1830). US narrowing to 1700-1780 is UNVERIFIED. Style name in NRB16A. |
| 2 | Federal | **c.1780-1840** (peak 1785-1815) | **VERIFIED-NPS**: 1780s to ca.1840s. Peak 1785-1815 VERIFIED-WIKIPEDIA† (Federal architecture). Corrected from 1780-1830. |
| 3 | Greek Revival | **c.1820-1850** (continuing to the 1860s) | **VERIFIED-WIKIPEDIA**: "From 1820 to 1850, the Greek Revival style dominated the United States" (Greek Revival architecture). Corrected from 1825-1860. NRB46 refers to "the earlier Greek Revival house" before the 1860s. |
| 4 | Gothic Revival / Carpenter Gothic | c.1840-1880 | End VERIFIED-WIKIPEDIA ("fall out of fashion in the 1880s and early 1890s", Gothic Revival architecture). Start UNVERIFIED. |
| 5 | Italianate | c.1845-1890 | VERIFIED-WIKIPEDIA: US popularity "from the late 1840s to 1890" (Italianate architecture). |
| 6 | Second Empire | c.1860-1885 | UNVERIFIED. Wikipedia gives only the French reign (1852-1870). NRB16A and NRB46 name it without dates. |
| 7 | Stick | c.1860-1890 | UNVERIFIED for dates (qualitative only, VERIFIED-WIKIPEDIA† "between Carpenter Gothic and Queen Anne"). NRB16A lists "Stick/Eastlake". |
| 8 | Queen Anne | c.1880-1910 | VERIFIED-WIKIPEDIA† ("roughly 1880 to 1910"). Other sources give 1880-1900 or 1880-1920. NPS nominations (search summary, unopened) say 1880s-90s. |
| 9 | Folk Victorian | c.1870-1910 | VERIFIED-WIKIPEDIA† ("between 1870 and 1910"). |
| 10 | Shingle | c.1880-1900 | UNVERIFIED range. Wikipedia† only ties it to the 1876 Centennial. NRB16A lists it. |
| 11 | Richardsonian Romanesque | c.1870-1900 (houses rare) | Start VERIFIED-WIKIPEDIA (Richardson first used elements in 1870). End UNVERIFIED. NRB16A lists "Romanesque". |
| 12 | Colonial Revival | c.1880-1960 (peak 1910-1940) | VERIFIED-WIKIPEDIA for 1880-1910 small numbers and the 1876 Centennial origin (Colonial Revival architecture). End 1955-1960 is UNVERIFIED (state guides, unopened). The earlier "about 40% of US homes 1910-1930" claim is dropped as UNVERIFIED. NRB46 says Colonial Revival was the most popular style for foursquares. |
| 13 | Mission Revival | c.1890-1915 | VERIFIED-WIKIPEDIA: "most popular between 1890 and 1915" (Mission Revival Style). NRB46 mentions Mission Revival bungalows. |
| 14 | Craftsman / Bungalow | c.1900-1930 | VERIFIED-NPS (NRB46: ideal suburban home by 1910, catalog-house height in the 1920s). Wikipedia† gives Bungalow 1900-1918 and Craftsman 1890s-1930s. |
| 15 | American Foursquare | **c.1890-1930** | **VERIFIED-NPS** (NRB46: appeared in the 1890s, a fixture by the 1930s). Wikipedia† says 1870s-1930s. Use NPS. |
| 16 | Prairie | c.1900-1920 | UNVERIFIED range. Wikipedia† only gives the Robie House (1910). NRB46 says the Midwest Prairie School influenced the bungalow. |
| 17 | Dutch Colonial Revival | c.1900-1940 | Term date VERIFIED-WIKIPEDIA ("appeared sometime between 1920 and 1925"). The 1900-1940 range is UNVERIFIED. |
| 18 | Tudor Revival | c.1890-1940 | UNVERIFIED for US dates. Wikipedia covers the UK origin. NRB46 shows Tudor Revival homes in Shaker Village, Ohio (district 1919-1950). |
| 19 | Spanish Colonial Revival | c.1915-1940 | Start VERIFIED-WIKIPEDIA† (1915 San Diego exposition). End UNVERIFIED. NRB16A lists "Mission/Spanish Colonial Revival". |
| 20 | Pueblo Revival | c.1900-1940 | VERIFIED-WIKIPEDIA: "developed at the beginning of the 20th century and reached its greatest popularity in the 1920s and 1930s" (Pueblo Revival architecture). |
| 21 | Streamline Moderne (and Art Deco) | c.1930-1945 (rare for houses) | VERIFIED-WIKIPEDIA† for years. NRB46 mentions "Art Moderne" in FHA rental housing only. |
| 22 | Cape Cod (revival) | c.1930-1960 | VERIFIED-NPS for the postwar boom (NRB46: immediately after the war, Levittown 1947). The 1930s start is VERIFIED-WIKIPEDIA† ("1930s-1950s"). |
| 23 | Minimal Traditional | c.1935-1955 | VERIFIED-WIKIPEDIA† only. Term not used by NPS. The closest NPS context is the FHA Minimum House 1931-1948. |
| 24 | Ranch | c.1940-1975 | VERIFIED-NPS for 1930s California origin and the 1950s suburban Ranch (NRB46). The 1960s-70s end is VERIFIED-WIKIPEDIA†. The "nine of ten new houses in the 1950s" claim stays dropped (no data). |
| 25 | Split-level | c.1950-1975 | VERIFIED-WIKIPEDIA† only. Term not used by NPS. |
| 26 | Mid-century modern (incl. Eichler-type) | c.1945-1970s | VERIFIED-WIKIPEDIA† for years. NRB46 covers "The Contemporary House" in the 1945-1960 chapter (VERIFIED-NPS for the idea, not the label). |
| 27 | New traditional / "McMansion" | c.1980-2008 | Start VERIFIED-WIKIPEDIA (term "coined sometime in the early 1980s", McMansion). End and style definition UNVERIFIED; needs a better source. |

Tally: NPS supports a date or context for rows 2, 14, 15, 22 and 24 (and the idea in 26). Wikipedia was re-opened this pass for rows 3, 4 (end), 5, 11 (start), 12 (start), 13, 17 (term), 20 and 27 (start). The remaining dates are † or UNVERIFIED. Cut candidates are unchanged: rows 3, 4, 6, 10, 11 and 21 first.

Style rules stay: show "popular c. X-Y", never precise cut-offs, never a share. No dataset gives style prevalence. Illustrations must be original drawings.

---

## 11. Recommended v1: "the typical house of your year and region"

**Scope.** Single-family houses completed, US and four Census regions, years 1973 to 2025 (1971 for foundation, heating fuel and garage). Keep the wording tied to "new single-family houses completed in that year".

**Panels, with the exact first year**
1. Foundation (1971): basement / slab or other / crawl. Wording: say "slab or other (piers, pilings)". Never "slab" alone.
2. Primary exterior wall (1973): show brick, wood, stucco, and "other". Show vinyl only from 1992 and fiber cement only from 2005. For earlier years say "other siding (aluminum, vinyl, block, stone)". Do not claim "no vinyl before 1992".
3. Heating fuel (1971): gas, electricity, oil, other. From 2014 the oil bar is not published, so show "oil or other" as a single bar for 2014 on.
4. Heating system (1973) and air conditioning (1973).
5. Stories: two panels with a break label. 1973-2008: 1 story / 2+ / split-level. 2009-2025: 1 / 2 (includes split-level) / 3+. Do not join across the break.
6. Median and average size (1973), bedrooms (1973), bathrooms (1973), garage (1971), fireplaces (1973).
7. Optional from 2009 or 2010: framing, outdoor features, lot size.

**Honesty rules**
- State the universe every time: "new single-family houses completed in that year, not all houses built then".
- State: "Your house may have been altered since."
- Regional values only; no state or metro. Name the region the user's state belongs to.
- Pre-1999 counts include a 3.3 percent adjustment; show shares, not counts.
- Single-year regional cells (especially the Northeast and Midwest for stucco, steel framing, ground-source heat pumps) can be noisy or suppressed. Show a three-year pool for 1973 to 1998 stucco and heating cells marked S or Z, and say "about".
- Show "Source: US Census Bureau, Survey of Construction (Characteristics of New Housing)". Licence: UNVERIFIED, so confirm before launch.
- Roofing: not available for new houses. Do not show it. Optional later "homes of your era still standing" panel from RECS `ROOFTYPE` by `YEARMADERANGE`, labelled present day.

**Before 1971:** no table data. Show the style-era text from section 10, labelled "popular styles".

**Not in v1:** divisions (microdata), 1960s transcription, ResStock, any style share, state or metro detail.

---

## 12. Ready to build: files and fields

All are `.xls` (Excel 97-2003 format). Read with `xlrd` (the `openpyxl` library cannot read `.xls`). Download with plain `curl -sL -m 120 -o <file> <url>`. Base URL: `https://www.census.gov/construction/chars/xls/`. Use the first sheet in each workbook (named `SFTotal...`).

### Files
| Panel | Download file | Fields (columns after Year) |
|---|---|---|
| Foundation | `foundation_cust.xls` | counts: Total, Basement, Slab or other, Crawl; then the same four as percent |
| Primary wall | `exwallmat_cust.xls` | counts: Total, Brick, Wood, Stucco, Vinyl, Fiber cement, Other; then percent |
| Heating fuel | `heatingfuel_cust.xls` | counts: Total, Gas, Electricity, Oil, Other; then percent |
| Heating system | `heatsystem_cust.xls` | Total, Forced air, Heat pump total, Air-source, Ground-source, Hot water or steam, Other; then percent |
| Air conditioning | `aircond_cust.xls` | Total, With, Without; then percent |
| Stories (2009+) | `stories_cust.xls` | Total, 1 story, 2 stories, 3+; then percent |
| Stories (1973-2008) | `https://www.census.gov/construction/chars/pdf/c25ann2008.pdf`, printed pages 451-457 | Total, 1 story, 2+ stories, Split-level, then percent (parse `pdftotext -layout`; one block per region) |
| Size | `squarefeet_cust.xls`, sheet `SFTotalMedAvgSqFt` | Median: US, NE, MW, S, W; Average: US, NE, MW, S, W |
| Bedrooms | `bedrooms_cust.xls` | Total, 2 or fewer, 3, 4+; then percent |
| Bathrooms | `bathrooms_cust.xls` | Total, 1.5 or fewer, 2, 2.5, 3+; then percent |
| Garage | `parking_cust.xls` | Total, 1 car, 2 cars, 3+, Carport, None; then percent |
| Fireplaces | `fireplace_cust.xls` | Total, None, 1, 2+; then percent |
| Optional | `framing_cust.xls`, `outdoorfeatures_cust.xls`, `lotsize_cust.xls`, `exwallmat2_cust.xls` | see section 1 |

### Layout rules (confirmed by parsing the 13 completed-house files listed above plus 6 sold files)
- Rows are blocks per geography: a row with column A empty and column B equal to `United States`, `Northeast`, `Midwest`, `South` or `West` starts a block (`bedrooms_cust.xls` has a stray space in column A on the `United States` header row; trim it).
- Year rows have a float in column A (for example 1987.0). Count columns come first (thousands), then percent columns.
- Cells can be strings: `(NA)`, `(S)`, `(Z)`, `(A)`. Treat them as missing (or "under 0.5 percent" for Z).
- The row starting `RSE` or `RSE/SE` sits after the last year of each block and holds latest-year RSEs only.
- Footnotes at the bottom of each sheet hold the category definitions and the 1999 adjustment note.
- The median/average sheet has a different layout: columns are Year, Median (US, NE, MW, S, W), Average (US, NE, MW, S, W), and the RSE row is `RSE`.
- Unit check: the sum of regional counts should equal the US count to within rounding (thousands).

### Optional v2 (divisions)
Download `soc99.zip` through `soc19.zip` and `soc20.xlsx` through `soc25.xlsx`. Fields: `COMP` (completion YYYYMM), `DIV`, `BASE`, `WAL1`, `FUEL`, `HEAT`, `ACS`, `STOR`, `GAR`, `SQFS`, `WEIGHT`. Filter to houses with `COMP` in the target year. Weight every estimate. The 1999 file already reproduces the national foundation table (section 2).

---

## 13. What failed or could not be checked

- **www.huduser.gov** returns an AWS WAF challenge (HTTP 202, empty body, header `x-amzn-waf-action: challenge`) on both the pages and the PDFs. This blocked the HUD copies of the 1968-1974 C25 reports and any AHS file hosted there. I did not work around it.
- The 1975 and 1977 C25 library pages have no PDF link that I could find. The 1985 and 1990 PDFs and the 1980 PDF were reachable, but all are scanned images.
- The 2020 RECS HC2.3 table: my guessed path returned an HTML error page. The 2024 table worked.
- The 2024 RECS public CSV was confirmed to exist (HTTP 200, about 24.7 MB) but was not downloaded.
- The AHS Table Creator, the AHS 1973-1995 files and the 2025 AHS were not opened.
- Wikipedia style pages: the fetch helper's `--find` mode often landed on page furniture, so many rows are marked † (first pass).
- ResStock and decennial census claims were not re-checked.
- Licence for SOC data is UNVERIFIED.

## 14. Hostnames used (all reachable except where noted)
`www.census.gov`, `www2.census.gov`, `www.eia.gov`, `www.nps.gov`, `en.wikipedia.org`, `www.energy.gov`, `www.hud.gov`. `www.huduser.gov` refuses automated requests. Not needed: `api.census.gov`, `www.pnnl.gov`, `hazards.fema.gov`.
