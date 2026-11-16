# Things that need you

Kept up to date as the build goes. Nothing here blocks tonight's work unless marked **blocking**.

## Decisions
- [x] **Name and domain.** Year Built, at yearbuilt.house (purchased).
- [x] **Site address.** Set to https://yearbuilt.house in the sitemap, share links and checklist.
- [ ] **Go live.** I have not created a Vercel project or deployed anything; that publishes the
      site, so I'll wait for your say-so. Tell me "deploy a preview" and I'll set it up.
- [ ] **Affiliate / monetisation.** None is built into v1 (no ads, no tracking). Decide later
      whether to add test-kit and inspector referrals.

## Things only you can do
- [ ] **Contact email.** The corrections, privacy and about pages show "a contact address will be
      listed here shortly" until you give me one (ideally at yearbuilt.house). One setting to add.
- [ ] **Expert review.** Find a licensed home inspector to review at least the "check first"
      issues. The about page says plainly that no inspector has reviewed the content yet; I'll
      update that sentence and credit them when it's done. Launch is fine before this; promoting
      the site widely is better after.
- [ ] **Google Search Console.** After launch: verify yearbuilt.house and submit
      `https://yearbuilt.house/sitemap.xml`. Needs your Google account.
- The site stays anonymous for now, as you asked: no names anywhere.
- [ ] **Check your DataForSEO account.** One query earlier returned a notice that the account was
      "temporarily paused" for unusual activity. Later queries worked, but confirm it's in good
      standing.
- [ ] **Usage limit.** Several agents were cut off earlier by the 5-hour limit. If tonight's
      build stops mid-way, tell me to continue once it resets and I'll resume from the saved work.

## Added after v1 (all optional layers on the year report)
- **About your house** (built): eleven optional questions that tailor the report and checklist.
- **The typical new house of your year** (built): real Census figures by region, 1971 onward.
  No roofing data exists, and nothing before 1971.
- **Your place** (built): enter a ZIP for local housing age, heating fuel, radon zone, climate
  zone and first flood-map year. FEMA's hazard ratings could not be downloaded automatically.
- **Home styles** (not started): no dataset exists, only reference prose. Decide later.
- **State-specific code dates** (not feasible as a download): would need compiling by hand from
  state statutes.

## Worth a read when you have time
- [ ] **Fact-check results.** A line-by-line check of the homeowner copy against the quoted
      sources found 153 problems across 80 issues and 53 lifespans (mostly figures and brand
      names with no verified source; 9 wrong; 4 unsafe check steps). 146 fixes are applied. The
      full list, with the before text and the basis for each change, is in
      `content/factcheck/part-a.json` and `part-b.json`.
- [ ] **Claims removed for lack of a source, probably true, worth restoring once sourced:** the
      vermiculite (Zonolite) reimbursement trust; that polybutylene settlement money is no longer
      available; recall incident and injury counts (Kidde, Gree, Bosch, Coaire, Lochinvar); the
      1983-2015 window for crumbling Connecticut foundations.
- [ ] **Seven lifespan safety warnings have no citation** (wood shake roof, furnace, clothes
      dryer, plastic dryer vent, garage door, chimney flue tile, vinyl floor). They were kept
      because removing protective advice would make the pages less safe. An inspector's review
      would settle them.
- [ ] **Six corrected Census figures.** Six percentages in the Census tables contradict their own
      counts (apparent typos at the source). The site shows the share computed from the counts;
      each correction is listed in `src/data/typical-house.json` under `corrections`.
- [ ] **Try it.** Read the report for your own house's year and tell me what feels wrong,
      missing or confusing. You are the target reader.
- [ ] **The "check first" list.** These 12 issues are flagged as priority on the reports for the
      years they apply to. Read them as a non-expert: do they make sense, are any scary in the
      wrong way?
      1. Knob-and-tube wiring
      2. Aluminum branch wiring
      3. Federal Pacific Stab-Lok panels
      4. Square D QO Plug-On Neutral panel recall
      5. Lead water service line
      6. Lead paint
      7. Vermiculite attic insulation
      8. Polybutylene water pipes
      9. Problem drywall ("Chinese drywall")
      10. Consolidated (Premier) attic furnaces, California only
      11. Cadet and Encore wall heaters, CA/ID/MT/OR/WA
      12. Missing or outdated smoke alarms
- [ ] **Editor's judgement calls.** 61 of 114 older-home issues are included. Left out on purpose:
      radon and copper pinhole leaks (not tied to build year), and flood-map, wildfire-zone,
      soft-story and buried-oil-tank issues (they depend on the exact address). Four included
      entries rest on dates the research could not fully confirm and say so in their caveats:
      crumbling foundations in CT/MA, hardboard siding, unbolted foundations in California, and
      unreinforced brick houses (limited to Utah).
- [ ] **Sites that refuse automated checks.** FEMA, the SEC, the building-code publisher and the
      two federal-regulation sites block automated requests, so about 20 issues stay unconfirmed
      and are left out of v1. Opening those pages by hand would let us add them.
