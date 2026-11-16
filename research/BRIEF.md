# Research brief: "Built In" house-era issue dataset

## What this is for
A website where someone enters the year their US house was built (and state) and gets a report of
what houses of that era typically contain: materials, methods and products that were used during a
known span of years and that matter today because they are hazardous, failure-prone, recalled,
uninsurable, or simply at end of life. The site is only worth using if it is right, so every claim
must trace to a source a sceptical reader would accept.

This round is a FEASIBILITY TEST. We need to learn, per issue: can the years be pinned down, can
prevalence be stated honestly, and do authoritative sources exist? An honest "sources disagree" or
"no prevalence data exists" is a useful result. A confident guess is a harmful one.

## Rules
- Use web search and page fetching (WebSearch / WebFetch; load them with ToolSearch if they are not
  already in your tool list). Some hosts may be blocked; if so try another source.
- NEVER invent a URL, title, date or figure. If you could not open a page, do not cite it as verified.
- For each source set "verified": true ONLY if you opened the page in this session and it supports
  the claim. Sources you recall from memory but could not open get "verified": false.
- Prefer primary/authoritative sources: CPSC, EPA, HUD, FEMA, NIST, DOE, state agencies, model
  building/electrical/plumbing code histories (NEC, IRC, UPC), court/class-action settlement sites,
  manufacturer recall notices, InterNACHI / ASHI inspector references, university extension.
  Blogs from contractors selling the fix are weak sources; use only as a last resort and say so.
- US residential (single-family and small multi-family) only.
- Year ranges are for when it was INSTALLED IN NEW CONSTRUCTION, not when it was invented or banned
  in theory. Note separately if it was commonly retrofitted into older homes.

## Output
Write ONE file: /home/user/project007/research/<your-domain>.json  (valid JSON, UTF-8), shaped:

{
  "domain": "...",
  "web_access": "full | partial | none",   // what you could actually reach
  "entries": [ {
    "id": "kebab-case-id",
    "name": "Plain name a homeowner would recognise",
    "category": "electrical | plumbing | hazmat | envelope | structure | hvac | fire-safety | code-milestone | lifespan",
    "summary": "2-3 plain sentences: what it is and why it matters today",
    "installed_from": 1965,          // integer year, best supported
    "installed_to": 1973,            // integer year, or null if still in use
    "peak_from": 1965, "peak_to": 1972,   // or null
    "date_confidence": "high | medium | low",
    "date_notes": "where sources disagree, and by how much",
    "regions": "national, or the states/regions where it applies",
    "prevalence": "likely | possible | rare",   // chance a house built in the peak years has it
    "prevalence_basis": "the figure or reasoning and its source; say plainly if no data exists",
    "how_to_identify": "what a homeowner can see without tools, and where to look",
    "risk": { "safety": "...", "financial": "...", "insurance_or_sale": "..." },
    "fix": { "what": "...", "cost_low_usd": 0, "cost_high_usd": 0, "cost_year": 2025, "cost_source": "..." },
    "sources": [ { "url": "...", "publisher": "...", "supports": "which claim", "verified": true } ],
    "open_questions": "what you could not establish"
  } ],
  "feasibility_notes": "a frank paragraph: how hard was this domain, where is the evidence thin, what would a second pass need",
  "missed": ["issues in this domain you ran out of time for"]
}

Cost fields may be null if you found no credible figure; do not guess.
Aim for the entries listed in your assignment plus any important ones it missed. Depth and accuracy
on fewer entries beats a long shallow list.

Your final message back should be 5-10 lines: how many entries, how many have at least one verified
authoritative source, your web access level, and the main feasibility problems.
