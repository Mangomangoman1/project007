# Feasibility: "the typical house of your year and region" (Built In)

Researched 2026-11-16. Nothing was built; no other files were touched.

## How to read this file

- **VERIFIED** means I opened the page with the session fetch helper and the text supports the claim. The URL is given.
- **FROM SEARCH** means the claim comes only from a search-result summary. I could not open the page. Treat it as a lead, not a fact.
- **UNVERIFIED (background)** means my own prior knowledge, with no page seen this session. Do not build on these without checking.
- The reachable hosts were www.hud.gov, www.energy.gov and en.wikipedia.org. census.gov, www2.census.gov, eia.gov, huduser.gov, nps.gov and the NREL hosts were not reachable. That is the reason most of the primary-source claims below are FROM SEARCH.
- I did not try to get around the network policy.

## Bottom line

Real, citable statistics on how new US houses were built exist for the four Census regions, and in places for the nine divisions. The Census Bureau Survey of Construction (SOC) is the only source of this kind. Its start years differ by characteristic, but the series for the headline items probably runs from the early to mid 1970s through 2025.

Nothing I found covers roofing for new houses. Nothing covers state-level detail for new houses. No national dataset I could find describes new-house characteristics before about 1971-73. Architectural style is not measured by any survey. It exists only as reference prose, and the list in section 6 is assembled from that prose.

The v1 should be built on SOC downloads. The download hosts cannot be reached from this session, so exact table names, first years and file layouts must be confirmed once the hosts in section (b) are allowed.

---

## 1. Census Bureau Survey of Construction (SOC): "Characteristics of New Housing"

### What it is
- The SOC is a monthly housing-unit survey of new, privately owned residential construction. It follows each unit from permit (or discovery by canvass) through start, completion and, for single-family houses, sale. FROM SEARCH (census.gov/construction/soc/methodology.html and the "About the Surveys" page, neither opened).
- Characteristics are published annually as "Characteristics of New Housing". They are split into houses completed and houses sold. Some are also split into started. Tables are PDF and XLS.
- Estimates can be tabulated for the US, the four Census regions, the nine Census divisions, and (for some series) metro areas, states and counties. FROM SEARCH. This is the generic SOC statement. It does not mean characteristics are published at those levels. See the geography row below.

### Characteristics found

| Characteristic | Evidence | First year |
|---|---|---|
| Foundation type (basement, crawl space, slab, other) | FROM SEARCH. The current-data page lists foundation XLS tables. Annual reports include "Type of Foundation" (1996, 2007, 2008, 2011, 2013). | Not confirmed. The Census page that lists the series was not opened. |
| Principal exterior wall material | FROM SEARCH. Annual-report table of contents (2011, 2013). An archived index said "Primary Wall Material 1973-2007" and "Secondary Wall Material 1999-2007". | 1973 for primary (FROM SEARCH, archived index) |
| Heating fuel | FROM SEARCH. Current-data XLS list, annual reports. | Not confirmed |
| Heating system (heat pump, forced-air furnace, hot water or steam, other) | FROM SEARCH. Current-data XLS list. The microdata guide gives four categories plus "not reported" (FROM SEARCH, socmicro_info.pdf). | Not confirmed |
| Air conditioning (presence) | FROM SEARCH. Current-data list, annual reports. Secondary sources quote about 49% of new houses with AC in 1973 and 46% in 1975 (those two figures disagree). | About 1973 or earlier (FROM SEARCH, secondary) |
| Stories, square feet, bedrooms, bathrooms | FROM SEARCH. These are standard annual-report tables. NAHB and Census stories cite "median square feet" series. | Not confirmed |
| Garage / parking | FROM SEARCH. The microdata guide lists a GAR code (1, 2, 3+ car, other). | Not confirmed |
| Framing material (wood, steel, concrete/masonry, ICF/SIP) | FROM SEARCH. The microdata guide lists a FRAME code. NAHB cites 94% wood framing among 2023 sold houses. | Microdata era |
| Porches, patios, decks, fireplaces, lot size | FROM SEARCH only as NAHB posts ("over two-thirds of new homes in 2023 feature porches") and a general ">60 characteristics" claim. | Not confirmed |
| Secondary wall material | FROM SEARCH (archived index) | 1999 |
| **Roofing material** | **Not found anywhere in the SOC material.** Three searches and the annual-report contents lists turned up nothing. | n/a |

I treat roofing as NOT covered. This is a negative finding from search summaries, not from a full variable list. The first check after hosts are allowed is to search the SOC microdata layout (socmicro_info.pdf) for a roof field.

### Geography
- Annual tables are national and by region. FROM SEARCH: the 2025 highlights page cites regional figures ("in the South, 63% had a heat pump"; "91% in the Northeast were heated with gas").
- The microdata files "allow for tabulation of selected estimates by the nine Census Divisions" and not by state. FROM SEARCH (SOC microdata description).
- NAHB computes division-level shares from the microdata. Examples: 2024 slab share 97.9% in West South Central, 89.9% Pacific, 85.7% South Atlantic; basements 67.2% New England, 62.3% West North Central, 50.3% East North Central, 48.8% Middle Atlantic. FROM SEARCH (eyeonhousing.org, unopened). NAHB's figures are for houses **started** and not completed.
- No state-level characteristics were found. The SOC sample is too small for states.
- Metro areas: not confirmed for characteristics. Do not promise them.

### File formats and URLs
All FROM SEARCH. None was opened.
- Current-data page with XLS tables (air conditioning, foundation, heating fuel, heating system, heating fuel by system; completed and sold): `https://www.census.gov/construction/chars/current.html`
- Historical tables page: `https://www.census.gov/construction/chars/historical/tables.html`. The snippet shows annual PDFs "2003 through 2017". Spreadsheets for earlier years were not confirmed.
- Annual report PDFs follow the pattern `https://www.census.gov/construction/chars/pdf/c25annYYYY.pdf` (seen for 2006, 2007, 2008, 2011, 2012, 2013, 2015, 2017). The 1996 to 1999 editions are at `https://www.census.gov/content/dam/Census/library/publications/1996/econ/c25-96a.pdf` and similar. They include "Type of Foundation by Category of House and Location" and the equivalent for heating fuel.
- Older printed editions: the 1977 report page `census.gov/library/publications/1977/econ/c25-7713.html` exists. A HUD-hosted copy of the 1971 C25 report is `huduser.gov/Publications/pdf/HUD-11676_v2.pdf`. Its tables run back to 1963. The content was not checked, so do not assume it has characteristics.
- Microdata: `https://www.census.gov/construction/chars/microdata.html`, with documentation at `https://www2.census.gov/programs-surveys/soc/guidance/socmicro_info.pdf` and `https://www.census.gov/construction/chars/pdf/using_socmicro.pdf`. The files cover single-family houses started, completed or sold in each year. They start in 1999. 2025 files are due July 1, 2026, so they may already be out. They have more than 60 variables and are distributed in SAS or Excel-friendly form. No CSV confirmed. All FROM SEARCH.
- A 2017 report PDF contains a multi-decade table that starts in 1973 (FROM SEARCH).
- The 2025 highlights page exists at `census.gov/construction/chars/highlights.html`. That implies annual data through 2025 (FROM SEARCH).

### Licence
UNVERIFIED (background). Census data are US federal works with no copyright. Attribution is conventional. The Census terms page (`census.gov/about/policies`) was not opened. Verify before launch.

### Caveats the publisher attaches
- FROM SEARCH (SOC methodology pages): standard errors are published as coefficients of variation. A CV measures sampling variation only and does not capture nonsampling error.
- The survey is a sample of permit-issuing places plus non-permit areas. The sampling error for a cell with few observations (for example "steel framing" or a small division) can be large.
- It describes **new houses built in that year**. It says nothing about what survives, what was renovated or what a given house has. A house from 1987 may have had its siding, roof, windows and heating replaced.
- "Completed", "started" and "sold" are different universes. The same year gives different shares in each. Pick one (completed is the natural fit for "built in year X") and state it.

### Homeowner-facing sentences this can support
- "In 1987, 61% of new single-family houses in the South were built on a slab." This is plausible. The number is illustrative only. Use real table values once the files are opened.
- "In 2024, 73% of new single-family houses started in the US were built on a slab." FROM SEARCH (NAHB analysis of SOC).
- "In 2023, vinyl siding was the most common exterior material in 4 of the 9 divisions." FROM SEARCH (NAHB).

### Verdict
**Needs verification, then ready.** This is the right primary source, but every table name, first year and layout needs checking once census.gov and www2.census.gov are reachable.

---

## 2. American Housing Survey (AHS)

### What it covers
- VERIFIED (https://en.wikipedia.org/wiki/American_Housing_Survey): HUD sponsors the survey and the Census Bureau runs it. It began in 1973. It has been biennial since 1983. Topics include year built, number of stories, foundation type, external building conditions, heating and cooling types, plumbing, water source and fuels by use. Public use files exist, and Census offers the "MDAT" tool (now Table Creator). The metro surveys covered 21 areas at six-year intervals. That is the Wikipedia statement and may be dated.
- VERIFIED (https://www.hud.gov/sites/dfiles/CFO/documents/2027_CJ_Program_PDR.pdf): the AHS "supports national, regional, and metropolitan area estimates". PD&R and Census are moving it to continuous collection. The first annual-format release is expected September 2027. The 2027 request assumes reduced sample sizes. Nothing else about variables is in that PDF.
- VERIFIED: https://www.hud.gov/ (home page) has nothing on the AHS. HUD's AHS content lives at huduser.gov, which is not reachable.

### Variables by year: what I could and could not establish
- FROM SEARCH: the 2015 redesign changed the questionnaire. Many variables were renamed, merged (heating and cooling in particular) or dropped. The Census "Getting Started with the AHS PUF: 2015 to 2023" guide and the disclosure-avoidance guide list removed housing variables (an exhibit titled "Housing Unit and Housing Characteristic Variables Removed from the PUF"). I could not read that exhibit.
- FROM SEARCH: the 2015-2023 definitions appendix (https://www2.census.gov/programs-surveys/ahs/2015/2015-2023_AHS_Definitions.pdf) contains a foundation type entry that mentions slab. It excludes multiunit structures.
- I found no evidence that exterior wall material or roof material is asked in 2015 and later. Defects questions (missing siding, missing roofing) do exist. Treat wall and roof material as **not available after 2013 until proven otherwise**.
- UNVERIFIED (background): before 2015 the AHS asked main exterior wall material and roofing material in some years. If the pre-2015 files do carry these, they could be cross-tabulated by year built, but only as existing stock at survey time, in the 1997-2013 public use files (FROM SEARCH: HUD re-released them with a codebook, plus a "Getting Started with the AHS PUF 1997-2013" guide).
- Year-built is available as bands. Census Table Creator rows include recent bands such as 2022-2023. FROM SEARCH.

### Access
- Table Creator (https://www.census.gov/programs-surveys/ahs/data/interactive/ahstablecreator.html) offers pre-built tables with geography options (national, regions, selected metros). The 2023 table specifications workbook is at `www2.census.gov/programs-surveys/ahs/2023/AHS 2023 Table Specifications and PUF Estimates for User Verification.xlsx`. All FROM SEARCH.
- Public use files (2023 national and metropolitan PUFs are listed at census.gov/programs-surveys/ahs/data/2023/...). Variable names changed at 2015. The older codebook covers 1997-2013 (https://www2.census.gov/programs-surveys/ahs/guidance/user-guide/ahs_cdbk_reference.pdf). FROM SEARCH.
- Licence: UNVERIFIED (background), US federal data. Public use files protect privacy by suppressing geography. FROM SEARCH: the post-2015 PUFs do not include many geographic indicators for disclosure avoidance. A "region" cross-tab is possible but a state or metro cross-tab may not be.

### Caveats
- It describes **surviving stock at survey time**, so renovations (new roof, new siding, new furnace) leak in. A sentence like "40% of homes built in 1960-69 in the Midwest have a basement" is fine. "Homes built then had a basement" is not.
- Sample sizes by year-built band, region and metro are small. Metro surveys are sparse in time.

### Homeowner-facing sentence
"Of occupied single-family houses built 1970-79 in the Midwest, X% have a basement (American Housing Survey 2023)."

### Verdict
**Needs verification.** The data exist for foundation, stories, heating equipment and fuel. Wall and roof material are probably not available after 2013. This is a useful complement to SOC because it also describes houses built before 1973, but it is not a substitute for SOC.

---

## 3. EIA Residential Energy Consumption Survey (RECS)

All FROM SEARCH. eia.gov is not reachable.

- Latest edition: RECS 2020, released in 2022 to 2024, with state-level files. About 18,500 households. Earlier editions listed on the EIA page: 2015, 2009, 2005, 2001, 1997, 1993 and before.
- Microdata page: `https://www.eia.gov/consumption/residential/data/2020/index.php?view=microdata`. Files in SAS, CSV and XLSX, plus a "Variable and response codebook" and the survey forms (EIA-457 A-G). EIA asks users to read its guide on computing estimates and relative standard errors (RSEs). The 2020 file has had updates since first release.
- Variables seen in the raw 2020 file (via a third-party R package page, srvyrexploR): STORIES, WALLTYPE, ROOFTYPE, CELLAR, CRAWL, CONCRETE, BASEFIN, BASEOTH, ATTIC, ATTICFIN, TYPEHUQ, YEARMADERANGE. ROOFTYPE has at least a ceramic or clay tile level. I did not see window type, insulation adequacy or foundation names confirmed. The official codebook is the place to check.
- Published tables: "HC 2.3" crosses wall material, windows and glass by year of construction. State and structural-characteristics PDFs exist (`.../data/2020/state/pdf/State Structural Characteristics.pdf`). Roof and wall tables by year built are likely in the HC 2.x series. Not confirmed.
- Geography: national, four Census regions, nine divisions, and (new for 2020) all 50 states and DC (FROM SEARCH: "first time in program history that data have been released for all 50 states and DC"). Climate region (IECC/Building America) is a variable. State-level tables rest on smaller samples, so state x year-built cells will be noisy.
- Year built is a banded variable (YEARMADERANGE). The bands are decades before 2010, then coarser. In 2015 YEARMADERANGE was only asked when exact year was missing (FROM SEARCH).
- Licence: UNVERIFIED (background). EIA data are public domain with a citation request.

### Caveats
- Surviving stock plus retrofits, like the AHS. Roof "type" is what is on the house now.
- Household survey. Respondents may not know foundation or wall construction. Imputation is common.
- 2020 RECS regional detail is better than any other source for existing homes, and roof type is the one structural field no new-construction source offers.

### Homeowner-facing sentence
"Among houses built 1970-79 in the South, X% have asphalt shingle roofs today (EIA RECS 2020)." The "today" matters.

### Verdict
**Needs verification.** Probably the best source for roofing and wall type on existing stock by era and region. Gate it on reading the codebook first.

---

## 4. DOE / NREL ResStock and Building America

- VERIFIED (https://www.energy.gov/eere/buildings/resstock): ResStock is a "multi-resolution residential stock modeling framework" that combines data from several sources, including EIA RECS, into conditional probability tables for square footage, insulation, window type, HVAC type and efficiency. It then samples those tables to build statistically representative models and simulates them. The project website is given as https://resstock.nlr.gov/ and the performer as the National Laboratory of the Rockies (NLR, the renamed NREL). The page was updated May 14, 2026. Note the hostname change from nrel.gov to nlr.gov.
- VERIFIED (https://www.energy.gov/cmei/buildings/us-residential-building-stock-analysis): ResStock datasets 2022.1, 2024.1 and 2024.2 (March 2024) are public. Each modelled dwelling unit carries characteristics such as "insulation level, foundation type, wall construction". The page gives state and county use cases, such as "What percent of homes in my state are single-family detached with a natural gas fuel furnace?" and "homes in Michigan built before 1940". There are dashboards (Building Typology Segmentation) with vintage and climate-zone detail.
- VERIFIED (https://www.energy.gov/eere/buildings/building-america): Building America is a research and demonstration program. It describes building-science programs, not a published housing-characteristics dataset.
- FROM SEARCH (resstock.readthedocs.io, unopened): inputs come from several sources: RECS 2009 and 2015, American Housing Survey 2017 and 2019, and Home Innovation Research Labs data for 1982-2007 foundation wall insulation. For older releases some pre-1980 values rest on "engineering judgment". Vintage is "informational only" in recent documentation.
- FROM SEARCH (docs.nlr.gov/docs/fy25osti/91194.pdf): a validation study found field data showed more crawl spaces and ResStock more basements. It also flagged differences in exterior wall finish.
- Data sit on the OEDI data lake (`oedi-data-lake.s3.amazonaws.com/nrel-pds-building-stock/...`). Licence UNVERIFIED (background): CC BY 4.0 for NREL's open datasets. Check.

### Verdict
**Not suitable** for homeowner statements of the form "X% of homes built in year Y had Z". It is a model output, not a survey. It is built from RECS and AHS, so citing RECS and AHS directly is more defensible. Fine as an optional "modeled estimate" label, and good for insulation and window assumptions where no survey exists. Always say "modeled".

---

## 5. Decennial census housing data, older eras

- FROM SEARCH (census.gov 1940 questionnaire page and publications page): the 1940 Census of Housing asked exterior material (wood, brick, stucco, other), year built, heating equipment (steam or hot water, piped warm air, pipeless furnace, stove, other or none), principal heating fuel (coal or coke, wood, gas, electric, fuel oil) and need of major repair. Published volumes: "1940 Census of Housing: Volume 2. General Characteristics" (https://census.gov/library/publications/1943/dec/housing-vol02.html) and "Characteristics by Type of Structure" (1945). One Pew page says original housing schedules were not retained. This only matters for microdata, not published tables.
- UNVERIFIED (background): the 1950, 1960 and 1970 censuses of housing asked year built (banded), heating equipment and fuel, and some added air conditioning, basement and plumbing. Exterior wall material was not asked after 1940. Tabulations are by region and state in printed volumes. Microdata samples are on IPUMS (usa.ipums.org). IPUMS terms restrict redistribution, so it could be used to compute statistics but not to republish records.
- Important limitation: the censuses describe **all housing at the census date, grouped by year built**, not new construction in a year. For a house built in 1955, a 1960 census table of "built 1950-59" housing would tell you about houses of that era as they stood in 1960, before most retrofits. That is useful and arguably better than later data for the pre-1970 eras, but the tables are scanned print volumes with no clean machine-readable form.

### Verdict
**Needs verification, and probably a v2.** There is real material, but it is harder to extract and the published tables are by period of construction, not by single year. Do not include in v1.

---

## 6. Architectural styles by era

### What exists
There is **no dataset** of what share of houses were built in each style in each year or region. The sources are reference prose. The standard citable authority is McAlester's "A Field Guide to American Houses" (Knopf; cite as a book, do not reproduce its text or drawings). It cannot be opened here, so I cite it only as a reference that Wikipedia and several state guides themselves lean on. VERIFIED: the Wikipedia Italianate article cites McAlester & McAlester for style elements.

Free, authoritative prose exists in:
- National Register Bulletin 15 (NPS) and its companion materials. FROM SEARCH: `https://www.nps.gov/subjects/nationalregister/upload/NRB-15_web508.pdf`, `NRB16A-Complete.pdf`, `NRB39-Complete.pdf`. **nps.gov is not reachable here**, so I could not read the style lists or year ranges. NPS publications are US federal works and should be freely reusable (UNVERIFIED).
- State historic preservation offices. FROM SEARCH, none opened: Texas THC `thc.texas.gov/sites/default/files/2025-04/NR_Styles_Updated_2018.pdf` (Register style classifications, no dates); Alaska OHA `dnr.alaska.gov/parks/oha/StyleGuide.pdf` (Queen Anne 1880-1920; Colonial Revival 1880-1955); Pennsylvania PHMC `phmc.state.pa.us/Portal/Communities/Architecture/styles/categories.html` (Queen Anne 1880-1900; Colonial Revival 1880-1960); Virginia DHR style guides (`dhr.am.virginia.gov/pdf_files/Classic_Commonwealth_Style_Guide.pdf`).
- Wikipedia. Fetchable, with a clear sentence on dates for most styles, but it is a tertiary source. Its text is CC BY-SA, so use facts and write your own words. Illustrations must be drawn fresh or sourced from public-domain material (for example HABS/HAER at the Library of Congress, UNVERIFIED and the host is not reachable here).
- Style dates in sources differ by decades at the edges (Queen Anne 1880-1900 vs 1880-1920; Colonial Revival 1880-1955 vs 1880-1960). Present ranges as "popular c." and never as precise cut-offs.

### Proposed list (25 styles)
"Wikipedia" means I opened the page at `https://en.wikipedia.org/wiki/<title>` and the quoted claim is there. Year ranges in the "Proposed range" column are my synthesis. "Basis" shows what the source actually says.

| # | Style | Proposed range (popular) | Regions | Best citable source / basis | Status |
|---|---|---|---|---|---|
| 1 | Georgian | c.1700-1780 (Georgian era 1714-1830) | Eastern seaboard | Wikipedia "Georgian architecture": style current 1714-1830 in English-speaking world. | VERIFIED (range is for the whole period, US window is my narrowing) |
| 2 | Federal | 1780-1830 (peak 1785-1815) | Northeast, Mid-Atlantic, coastal South | Wikipedia "Federal architecture": "c. 1780 and 1830, and particularly from 1785 to 1815". | VERIFIED |
| 3 | Greek Revival | c.1825-1860 | Northeast, Midwest, South | Wikipedia "Greek Revival architecture": in the US lasted until the 1860s and the Civil War. Start date not stated in the passages I read. | Partly VERIFIED (end only) |
| 4 | Gothic Revival / Carpenter Gothic | c.1840-1880 | Northeast, Midwest, North America generally | Wikipedia "Gothic Revival architecture": fell out of fashion in the 1880s-90s. Carpenter Gothic: wood application, mid-19th century. | Partly VERIFIED |
| 5 | Italianate | c.1845-1890 | Northeast, Midwest, West Coast | Wikipedia "Italianate architecture": "from the late 1840s to 1890" in the US. | VERIFIED |
| 6 | Second Empire | c.1860-1885 | Northeast, Midwest | Wikipedia "Second Empire architecture": French reign 1852-1870; US dates not stated. McAlester (citation only). | FROM SEARCH / needs verification for US dates |
| 7 | Stick | c.1860-1890 | Northeast, Midwest | Wikipedia "Stick style": late-19th-century, between Carpenter Gothic and Queen Anne, which it evolved into by the 1890s. | VERIFIED (qualitative) |
| 8 | Queen Anne | c.1880-1910 | Nationwide, esp. Midwest and railroad towns | Wikipedia: "roughly 1880 to 1910". Alaska guide 1880-1920; Pennsylvania guide 1880-1900. | VERIFIED (Wikipedia); FROM SEARCH for others |
| 9 | Folk Victorian | c.1870-1910 (isolated later) | Nationwide | Wikipedia "Folk Victorian": "between 1870 and 1910", isolated examples into the 1930s. | VERIFIED |
| 10 | Shingle | c.1880-1900 | New England coast, Northeast | Wikipedia "Shingle Style": followed the 1876 Centennial; example 1883-85. | Partly VERIFIED |
| 11 | Richardsonian Romanesque | c.1870-1900 | Northeast, Midwest (mostly civic; houses rare) | Wikipedia: Richardson used it from 1870; "late 19th century". | Partly VERIFIED |
| 12 | Colonial Revival | c.1880-1960 (peak 1910-1940) | Nationwide | Wikipedia "Colonial Revival architecture": small numbers 1880-1910; 1910-1930 ascendant with about 40% of US homes; simplified in 1950s to early 1960s. Alaska 1880-1955, PA 1880-1960. | VERIFIED (Wikipedia); the 40% figure is Wikipedia's own cited claim and needs its source checked before use |
| 13 | Mission Revival | c.1890-1915 | California, Southwest | Wikipedia "Mission Revival Style": "most popular between 1890 and 1915". | VERIFIED |
| 14 | Craftsman / Bungalow | c.1900-1930 | West Coast and Midwest strongest | Wikipedia "American Craftsman": years active 1890s-1930s; Wikipedia "Bungalow": most popular 1900-1918. Rochester list 1905-1920s (FROM SEARCH). | VERIFIED |
| 15 | American Foursquare | c.1895-1930 | Midwest, Northeast | Wikipedia "American Foursquare": "popular from 1870s to 1930s". My start is narrower. | VERIFIED (wider range) |
| 16 | Prairie | c.1900-1920 | Midwest | Wikipedia "Prairie School": late 19th and early 20th century, mostly Midwest. Robie House 1910. Narrower years not stated. | Partly VERIFIED |
| 17 | Dutch Colonial Revival | c.1900-1940 | Northeast | Wikipedia: term appeared 1920-25; most popular in the Northeast through the 1930s. | Partly VERIFIED |
| 18 | Tudor Revival | c.1890-1940 | Nationwide, esp. suburbs | UK origin and spread described on Wikipedia "Tudor Revival architecture". I did not find the US date range in the passages I read. McAlester (citation only). | FROM SEARCH / needs verification |
| 19 | Spanish Colonial Revival | c.1915-1940 | California, Southwest, Florida, Texas | Wikipedia: earliest US use in Florida, Texas and California; 1915 San Diego exposition gave national exposure. | Partly VERIFIED |
| 20 | Pueblo Revival | c.1900-1940 | New Mexico, Arizona | Wikipedia "Pueblo Revival architecture": began early 20th century, peak 1920s-30s. | VERIFIED |
| 21 | Streamline Moderne (and Art Deco) | c.1930-1945 (rare for houses) | Urban, California, Florida | Wikipedia "Streamline Moderne": years active 1930s-1940s. Houses are a small share. | VERIFIED (range); note it is mostly non-residential |
| 22 | Cape Cod (revival) | c.1930-1960 | New England, spreading nationwide | Wikipedia "Cape Cod (house)": 17th-century origin; boom "in the 1930s-1950s", with Colonial Revival detail. | VERIFIED |
| 23 | Minimal Traditional | c.1935-1955 | Nationwide | Wikipedia "Minimal Traditional": evolved in the 1930s, dominant until the Ranch in the early 1950s. | VERIFIED |
| 24 | Ranch | c.1940-1975 | Nationwide, strongest in West, South and suburbs | Wikipedia "Ranch-style house": first appeared 1920s, "extremely popular" 1940s-1970s, declining from the late 1960s. Wikipedia also says by the 1950s it was "nine out of every ten new houses". **Treat that as unreliable**; no survey measures style. | VERIFIED (range); the 90% claim is not supported |
| 25 | Split-level | c.1950-1975 | Midwest, Northeast suburbs | Wikipedia "Split-level home": popular after WWII, from the 1950s onward. | VERIFIED |
| 26 | Mid-century modern (incl. Eichler-type tract houses) | c.1945-1970s | California, urban centres | Wikipedia "Mid-century modern": years active 1945-1970s. | VERIFIED |
| 27 | New traditional / "McMansion" | c.1980-2008 | Nationwide suburbs | Wikipedia "McMansion": term coined in the early 1980s; larger houses popular through the 1980s-90s. Style classification here is weak. | Partly VERIFIED; needs better source |

That is 27 entries, deliberately a few over 25. Cut entries 3, 4, 6, 10, 11 and 21 first, as they matter least for houses that survive in any number and have the weakest dates. Georgian is also optional because houses of the 1700s are rare in the target audience.

### Caveats for styles
- Style is a judgement, not a measurement. Two sources can label the same house differently.
- Regional claims here are mostly my reading of the examples in the articles. No source I opened gives a region-by-year table.
- "Popular" ranges describe when architects and builders used a style, not what share of houses carried it.

### Verdict
- Reference prose with year ranges: **ready as "popular c. X-Y" text** with Wikipedia plus one state guide for the dates, after the state guides are opened and cross-checked.
- Any claim of the form "X% of houses in year Y were style Z": **not suitable** (no data).
- Illustrations: must be original drawings. **Needs a plan**.

---

## Recommended minimal v1: "the typical house of your year and region"

**Scope.** Houses completed 1973 (or the earliest year the tables prove out) through the latest SOC year. Four Census regions. Single-family only.

**What to show**, per year x region, where the cell is available:
- Foundation (basement, crawl space, slab, other), exterior wall (primary material), heating fuel, heating system, air conditioning (yes or no), stories, median square feet, bedrooms, bathrooms, garage spaces.
- A standard line such as: "In 1987, 61% of new single-family houses completed in the South were built on a slab (US Census Bureau, Survey of Construction)." Use the actual published number.

**Smoothing and honesty.**
- Show the single year and also a three-year pool if single-year regional cells are noisy. Publish only cells with a stated sample basis and say "about".
- Always state the universe: "new single-family houses completed in that year". Add: "Your house may have been altered since."
- Exterior wall: the table series may stop at 2007 and microdata begins 1999 at division level. Reconstruct 2008-onward from annual PDFs or microdata only after confirming what exists.

**Years with no data.**
- Before about 1973: say there are no national statistics on how new houses were built. Show the style and era text from section 6, labelled "popular styles", and optionally a short era note drawn from the 1940-1970 censuses once verified.
- State: SOC offers no state data. Show the region and name it.
- Roofing: do not show it for new houses. If the product wants roofing, add an "existing stock" panel from RECS (once its codebook is read), labelled as the roof on surviving homes today.

**Second panel (optional, v1.1):** "Houses of your era that are still standing", from AHS and RECS crossed by year-built band and region. Use it for foundation, stories, heating equipment and fuel (AHS 2023) and wall and roof type (RECS 2020), clearly labelled as surviving and possibly renovated stock.

**Not in v1:** ResStock, pre-1970 census data, any style share claim, state or metro detail.

## (b) Hostnames to allow, for download and verification

Required to build v1:
- `www.census.gov` (CHARS current and historical pages, microdata page, annual PDFs)
- `www2.census.gov` (SOC guidance, AHS user guides, table specifications and, if used, microdata downloads)
- `cdn.www.census.gov` (alternate asset host that appeared in results)

Needed for the existing-stock panel:
- `www.eia.gov` (RECS data, codebook, HC tables; the older alias `www.eia.doe.gov` also appears in results)
- `www.huduser.gov` (AHS history, codebooks, re-released 1997-2013 files, the 1971 C25 copy)
- `data.census.gov` (only if ACS tables or the API are wanted; not needed for v1)

For verification and style sources:
- `www.nps.gov` and `www.npshistory.com` (National Register Bulletins 15, 16A, 39)
- `www.eyeonhousing.org` and `www.nahb.org` (NAHB's division-level analyses of SOC, a useful cross-check, not a primary source)
- `thc.texas.gov`, `dnr.alaska.gov`, `dhr.am.virginia.gov`, `www.phmc.state.pa.us` (state style guides)

Optional:
- `resstock.nlr.gov`, `resstock.nrel.gov`, `natlabrockies.github.io`, `nrel.github.io`, `resstock.readthedocs.io`, `docs.nlr.gov`, `oedi-data-lake.s3.amazonaws.com` (ResStock docs and data)
- `usa.ipums.org` (pre-1970 census microdata; account and terms required)
- `webarchive.library.unt.edu` (archived Census index pages that carry the year ranges of each series, e.g. the old `charindex.html`)

Already reachable and used: `www.energy.gov`, `www.hud.gov`, `en.wikipedia.org`. Wikipedia returned HTTP 429 when fetched quickly, so pace requests.

## (c) What is NOT available

- **State-level detail for new houses:** none found. SOC is regional, with divisions only in microdata. RECS 2020 and AHS have state or metro tables, but those describe existing stock with small cells.
- **Roofing:** no new-construction source found. RECS has ROOFTYPE for existing stock. AHS roof material was not found for 2015 onward. ResStock models it.
- **Before about 1971-73:** no national new-house characteristics. The 1940-1970 censuses describe existing housing by period built. The usable extraction work is a v2.
- **Style prevalence:** no data at all, only prose.
- **What a specific house has:** every source describes populations. None says what a given house contains, and renovation changes existing-stock figures.
- **Items I could not confirm and should be treated as unknown until the hosts open:** the first year of each SOC characteristic (other than primary wall 1973 and secondary wall 1999), whether regional tables exist for every characteristic, whether SOC records any roof field, the exact AHS variable list per year, the RECS foundation variable names, licence terms for Census, EIA and ResStock data.
