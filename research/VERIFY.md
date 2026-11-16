# Verification pass

Read research/BRIEF.md first for context. The first pass produced your domain file with every
source "verified": false because pages could not be opened. The user has now allowed these hosts,
and ONLY these, for page fetching:

  www.cpsc.gov  www.epa.gov  www.hud.gov  www.fema.gov  www.energy.gov  www.ecfr.gov
  www.federalregister.gov  www.govinfo.gov  www.nist.gov  www.sec.gov  www.atsdr.cdc.gov
  www.nachi.org  codes.iccsafe.org  en.wikipedia.org

Use WebFetch (and WebSearch to find the right page on those hosts). If a host is refused, record
that and move on. Do not try other ways to reach a blocked page and do not disguise requests.

## Task
Edit your domain file in place. For each entry, most important first (entries with
date_confidence high or medium, then the rest as time allows):

1. Open the best page(s) on an allowed host that could confirm the entry's key claims: the
   installed_from / installed_to years (or the code/rule/recall date), and any prevalence figure.
   You may replace an unreachable source with a reachable authoritative one.
2. For each source you opened that supports the claim: set "verified": true and add
   "quote": a short verbatim excerpt (under 40 words) from the page that supports it.
   Wikipedia counts as a secondary reference only: mark it "tier": "reference"; government,
   code and court sources are "tier": "primary"; nachi.org is "tier": "trade".
3. If the page CONTRADICTS the entry, fix the entry's fields and explain in date_notes.
4. Add to every entry a "verification" object:
   { "status": "confirmed | corrected | partly-confirmed | unconfirmed",
     "primary_verified": true/false,     // at least one verified primary-tier source
     "what_is_confirmed": "...", "what_is_not": "..." }
5. Keep the file valid JSON at all times. Do not delete entries. Do not create other files.

Never mark verified without having opened the page in this session. Never invent a quote.

Final message back, 5-8 lines: entries confirmed / corrected / partly / unconfirmed, how many have
a verified primary source, which hosts failed, and any correction that changes a headline date.
