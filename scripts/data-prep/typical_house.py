#!/usr/bin/env python3
"""
Build src/data/typical-house.json: how new single-family houses were built, year by year, in the
US and the four Census regions, from the US Census Bureau's Survey of Construction
("Characteristics of New Housing", houses COMPLETED).

    python3 scripts/data-prep/typical_house.py            # use cached downloads when present
    python3 scripts/data-prep/typical_house.py --refresh  # re-download every source file

Needs: Python 3.9+, `xlrd` (pip install xlrd; reads the .xls format), `curl` and `pdftotext`
(poppler-utils). Downloads go to scripts/data-prep/.cache/ (gitignored). Only this script touches
the network; the site build reads the committed JSON.

Sources and parse rules: research/feasibility-typical-house.md (sections 1, 2 and 12).
- One workbook per characteristic; the first sheet ("SFTotal...") is all houses completed.
- A row with column A empty and column B naming a geography starts a block; year rows have a
  number in column A; count columns (thousands) come first, then the percent columns.
- Census marks are kept verbatim: (NA) not available, (S) withheld, (Z) under 500 units or 0.5
  percent, (A) RSE of 100 percent or more.
- Stories 1973-2008 come from the 2008 annual report PDF (1 story / 2 or more / split-level);
  2009 on from stories_cust.xls (1 / 2, incl. split-level and 1 1/2 / 3 or more). Different schemes.

The script asserts the researcher's verified figures and exits 1 if any differ.
"""

from __future__ import annotations

import datetime as _dt
import json
import os
import re
import subprocess
import sys

import xlrd

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, "..", ".."))
CACHE = os.path.join(HERE, ".cache")
OUT = os.path.join(ROOT, "src", "data", "typical-house.json")

XLS_BASE = "https://www.census.gov/construction/chars/xls/"
PDF_2008 = "https://www.census.gov/construction/chars/pdf/c25ann2008.pdf"
PAGE = "https://www.census.gov/construction/chars/"

GEOS = [("US", "United States"), ("NE", "Northeast"), ("MW", "Midwest"), ("S", "South"), ("W", "West")]
GEO_BY_NAME = {name: gid for gid, name in GEOS}
MARKS = {"(NA)": "NA", "(S)": "S", "(Z)": "Z", "(A)": "A"}

# ---------------------------------------------------------------------------------------------
# Characteristics. `cats` are in table column order; `head` is a word that must appear in that
# column's header (guards against a reordered table). `from`/`to` bound the years a category is
# published; outside them every cell must be (NA), and the JSON stores "NA".
# ---------------------------------------------------------------------------------------------
CHARS = [
    {
        "id": "foundation", "title": "Foundation", "file": "foundation_cust.xls", "key": "Foundation",
        "cats": [
            {"id": "basement", "label": "Basement", "long": "Full or partial basement", "head": "basement"},
            {"id": "slab", "label": "Slab or other", "long": "Slab or other (piers, pilings)", "head": "Slab"},
            {"id": "crawl", "label": "Crawl space", "head": "Crawl"},
        ],
    },
    {
        "id": "wall", "title": "Outside walls", "file": "exwallmat_cust.xls", "key": "Exterior Wall",
        "cats": [
            {"id": "brick", "label": "Brick", "head": "Brick"},
            {"id": "wood", "label": "Wood", "head": "Wood"},
            {"id": "stucco", "label": "Stucco", "head": "Stucco"},
            {"id": "vinyl", "label": "Vinyl siding", "head": "Vinyl", "from": 1992},
            {"id": "fiber", "label": "Fiber cement", "head": "Fiber", "from": 2005},
            {"id": "other", "label": "Other", "long": "Other (block, stone, aluminum…)", "head": "Other"},
        ],
    },
    {
        "id": "fuel", "title": "Heating fuel", "file": "heatingfuel_cust.xls", "key": "Heating Fuel",
        "cats": [
            {"id": "gas", "label": "Gas", "long": "Gas (natural or bottled)", "head": "Gas"},
            {"id": "electric", "label": "Electricity", "head": "Electricity"},
            {"id": "oil", "label": "Oil", "long": "Oil or kerosene", "head": "Oil", "to": 2013},
            {"id": "other", "label": "Other or none", "head": "Other"},
        ],
    },
    {
        "id": "system", "title": "Heating system", "file": "heatsystem_cust.xls", "key": "Heating System",
        # Air-source and ground-source sub-columns are skipped: they sit inside the heat pump total.
        "cats": [
            {"id": "furnace", "label": "Forced-air furnace", "head": "Forced-air"},
            {"id": "heatpump", "label": "Heat pump", "head": "Heat Pump", "from": 1978},
            {"id": "hotwater", "label": "Hot water or steam", "head": "Hot water"},
            {"id": "other", "label": "Other or none", "long": "Other or none (baseboard, panels, stoves…)", "head": "Other"},
        ],
        "skip": ["Air-source", "Ground-source"],
    },
    {
        "id": "ac", "title": "Air-conditioning", "file": "aircond_cust.xls", "key": "Air-Condition",
        "cats": [
            {"id": "with", "label": "With air-conditioning", "head": "With air"},
            {"id": "without", "label": "Without", "head": "Without"},
        ],
    },
    {
        "id": "stories", "title": "Floors", "file": "stories_cust.xls", "key": "Stories",
        "cats": [
            {"id": "one", "label": "1 story", "long": "1 story", "head": "1 story"},
            {"id": "two", "label": "2 stories", "long": "2 stories (incl. 1½ and split-level)", "head": "2 stories", "from": 2009},
            {"id": "three", "label": "3 or more", "long": "3 stories or more (incl. 2½)", "head": "3 stories", "from": 2009},
            # 1973-2008 scheme from the 2008 annual report (added below, not in the XLS).
            {"id": "twoplus", "label": "2 or more", "long": "2 stories or more (incl. 1½)", "to": 2008, "pdf": True},
            {"id": "split", "label": "Split-level", "to": 2008, "pdf": True},
        ],
    },
    {
        "id": "garage", "title": "Garage", "file": "parking_cust.xls", "key": "Parking",
        "cats": [
            {"id": "one", "label": "1-car garage", "head": "1 car"},
            {"id": "two", "label": "2-car garage", "head": "2 cars"},
            {"id": "three", "label": "3+ car garage", "head": "3 cars", "from": 1992},
            {"id": "carport", "label": "Carport", "head": "Carport"},
            {"id": "none", "label": "None", "long": "No garage or carport", "head": "garage or"},
        ],
    },
    {
        "id": "bedrooms", "title": "Bedrooms", "file": "bedrooms_cust.xls", "key": "Bedrooms",
        "cats": [
            {"id": "two", "label": "2 or fewer", "long": "2 bedrooms or fewer", "head": "2 bedrooms"},
            {"id": "three", "label": "3", "long": "3 bedrooms", "head": "3 bedrooms"},
            {"id": "four", "label": "4 or more", "long": "4 bedrooms or more", "head": "4 bedrooms"},
        ],
    },
    {
        "id": "bathrooms", "title": "Bathrooms", "file": "bathrooms_cust.xls", "key": "Bathrooms",
        "cats": [
            {"id": "one", "label": "1½ or fewer", "long": "1½ bathrooms or fewer", "head": "1 1/2"},
            {"id": "two", "label": "2", "long": "2 bathrooms", "head": "2 baths"},
            {"id": "twohalf", "label": "2½", "long": "2½ bathrooms", "head": "2 1/2"},
            {"id": "three", "label": "3 or more", "long": "3 bathrooms or more", "head": "3 baths", "from": 1987},
        ],
    },
    {
        "id": "fireplaces", "title": "Fireplaces", "file": "fireplace_cust.xls", "key": "Fireplaces",
        "cats": [
            {"id": "none", "label": "None", "long": "No fireplace", "head": "No"},
            {"id": "one", "label": "1", "long": "1 fireplace", "head": "1 fireplace"},
            {"id": "two", "label": "2 or more", "long": "2 fireplaces or more", "head": "2 or more"},
        ],
    },
]

# Year-specific labels for categories whose contents changed (the label must say what is inside).
RELABEL = {
    ("wall", "other"): [
        {"to": 1991, "label": "Other, incl. vinyl", "long": "Other (vinyl, aluminum, block, stone…)"},
        {"from": 1992, "to": 2004, "label": "Other", "long": "Other (fiber cement, aluminum, block, stone…)"},
    ],
    ("fuel", "other"): [{"from": 2014, "label": "Oil or other", "long": "Oil, kerosene, wood, other or none"}],
    ("garage", "two"): [{"to": 1991, "label": "2+ car garage", "long": "Garage for 2 or more cars"}],
    ("bathrooms", "twohalf"): [{"to": 1986, "label": "2½ or more", "long": "2½ bathrooms or more"}],
}

NOTES = [
    {"id": "universe", "chars": [], "text": "These are new single-family houses completed that year in that region, including houses built for rent. They describe how houses were being built, not any one house."},
    {"id": "adjust", "chars": [], "to": 1998, "text": "Counts before 1999 include a 3.3 percent upward adjustment for houses built without permits in areas that issue permits, so house counts before and after 1999 are not strictly comparable."},
    {"id": "slab", "chars": ["foundation"], "text": "The Census counts slabs together with other foundations such as piers and pilings, so this is “slab or other”, never slab alone."},
    {"id": "vinyl", "chars": ["wall"], "to": 1991, "text": "Vinyl siding was not counted separately until 1992. Before then it sits inside “other”, with aluminum, block and stone."},
    {"id": "fiber", "chars": ["wall"], "to": 2004, "text": "Fiber cement was not counted separately until 2005. Before then it sits inside “other”."},
    {"id": "aluminum", "chars": ["wall"], "from": 1992, "text": "Aluminum siding is counted inside “other”, with block and stone."},
    {"id": "oil", "chars": ["fuel"], "from": 2014, "text": "From 2014 the Census stopped publishing oil separately; oil and kerosene are counted with “other or none”."},
    {"id": "lpg", "chars": ["fuel"], "text": "Gas includes bottled gas and propane as well as natural gas."},
    {"id": "heatpump", "chars": ["system"], "to": 1977, "text": "Heat pumps were not counted separately until 1978."},
    {"id": "stories", "chars": ["stories"], "break": 2009, "text": "Floors are counted two ways: through 2008, 1 story, 2 or more, and split-level; from 2009, split-level and 1½-story houses count as 2 stories and 3 or more is separate. Only “1 story” is roughly comparable across the change."},
    {"id": "garage3", "chars": ["garage"], "to": 1991, "text": "Garages for 3 or more cars were counted with 2-car garages until 1992."},
    {"id": "bath3", "chars": ["bathrooms"], "to": 1986, "text": "Through 1986, “2½” includes 2½ bathrooms or more."},
    {"id": "sampling", "chars": [], "text": "These are survey estimates. Sampling error is larger for older years, for single regions and for small categories; “withheld” marks cells the Census did not publish."},
]

# Percent cells that contradict their own row's counts (Census typos), replaced by the count-derived
# share and listed in the JSON under "corrections".
CORRECTIONS: list[dict] = []

PDF_STORIES_TITLE = "Number of Stories in New One-Family Houses Completed"
PDF_STORIES_TABLE = "Number of Stories in New One-Family Houses Completed (Characteristics of New Housing: 2008, pp. 451-457)"


# ---------------------------------------------------------------------------------------------
def fail(msg: str) -> None:
    print(f"typical_house: {msg}", file=sys.stderr)
    sys.exit(1)


def fetch(url: str, refresh: bool) -> str:
    os.makedirs(CACHE, exist_ok=True)
    path = os.path.join(CACHE, url.rsplit("/", 1)[1])
    if refresh or not os.path.exists(path) or os.path.getsize(path) == 0:
        print(f"  download {url}")
        r = subprocess.run(["curl", "-sL", "-m", "180", "-o", path, url])
        if r.returncode != 0 or not os.path.exists(path):
            fail(f"download failed: {url}")
    with open(path, "rb") as f:
        magic = f.read(8)
    want = b"%PDF" if path.endswith(".pdf") else b"\xd0\xcf\x11\xe0"
    if not magic.startswith(want):
        fail(f"{path} is not the expected file type (got {magic!r}); delete it and retry")
    return path


def cell(v) -> int | str | None:
    """A table cell: an int, a Census mark, or None for blank."""
    if isinstance(v, float):
        if v != int(v):
            # A few cells hold the unrounded quotient (e.g. Northeast 1994 bathrooms); Excel shows
            # them rounded to whole percent, so do the same (half up, as published).
            print(f"  note: rounding unrounded cell {v!r}")
            return int(v + 0.5)
        return int(v)
    s = str(v).strip().replace(",", "")
    if not s:
        return None
    if s in MARKS:
        return MARKS[s]
    if s == "-":  # "Represents zero" (2008 report legend)
        return 0
    if re.fullmatch(r"\d+", s):
        return int(s)
    fail(f"unexpected cell {v!r}")
    return None


def header_text(sh, col: int) -> str:
    return " ".join(str(sh.cell_value(r, col)).strip() for r in range(3, 7)).strip()


def parse_blocks(sh) -> dict[str, dict[int, list]]:
    """{geo: {year: [cells after column A]}} for a geography-block sheet."""
    blocks: dict[str, dict[int, list]] = {}
    geo = None
    for r in range(sh.nrows):
        a, b = sh.cell_value(r, 0), str(sh.cell_value(r, 1)).strip()
        if str(a).strip() == "" and b in GEO_BY_NAME:
            geo = GEO_BY_NAME[b]
            if geo in blocks:
                fail(f"{sh.name}: geography {b} appears twice")
            blocks[geo] = {}
            continue
        if isinstance(a, float) and geo:
            blocks[geo][int(a)] = [cell(sh.cell_value(r, c)) for c in range(1, sh.ncols)]
    if set(blocks) != {g for g, _ in GEOS}:
        fail(f"{sh.name}: expected 5 geographies, found {sorted(blocks)}")
    return blocks


def in_range(cat: dict, year: int) -> bool:
    return cat.get("from", 0) <= year <= cat.get("to", 9999)


def parse_char(spec: dict, refresh: bool) -> tuple[dict, dict[str, dict[int, int]]]:
    url = XLS_BASE + spec["file"]
    wb = xlrd.open_workbook(fetch(url, refresh))
    sh = wb.sheet_by_index(0)
    if not sh.name.startswith("SFTotal"):
        fail(f"{spec['file']}: first sheet is {sh.name}, expected SFTotal…")
    # The table's own title (footnote digit dropped) is what the JSON cites.
    title = re.sub(r"\d+$", "", str(sh.cell_value(0, 0)).strip()).strip()
    if spec["key"].lower() not in title.lower() or "Completed" not in title:
        fail(f"{spec['file']}: title {title!r} does not mention {spec['key']!r} and Completed")

    xls_cats = [c for c in spec["cats"] if not c.get("pdf")]
    skip = spec.get("skip", [])
    # Count block = Total + one column per category (+ skipped sub-columns); same again for percent.
    width = 1 + len(xls_cats) + len(skip)
    if sh.ncols != 1 + 2 * width:
        fail(f"{spec['file']}: {sh.ncols} columns, expected {1 + 2 * width}")
    heads = [header_text(sh, 1 + width + i) for i in range(width)]
    if "Total" not in heads[0]:
        fail(f"{spec['file']}: percent block does not start with Total ({heads[0]!r})")
    # Map each category to its percent column by its header word, in order.
    cols: list[int] = []
    pos = 1
    for cat in xls_cats:
        while pos < width and any(s.lower() in heads[pos].lower() for s in skip):
            pos += 1
        if pos >= width or cat["head"].lower() not in heads[pos].lower():
            fail(f"{spec['file']}: column for {cat['id']} should mention {cat['head']!r}, got {heads[pos] if pos < width else None!r}")
        cols.append(width + pos)  # index into the row list (column A dropped)
        pos += 1

    blocks = parse_blocks(sh)
    years_all = sorted(blocks["US"])
    first, last = years_all[0], years_all[-1]
    data: dict[str, list[list]] = {}
    totals: dict[str, dict[int, int]] = {}
    for gid, _ in GEOS:
        rows = blocks[gid]
        if sorted(rows) != list(range(first, last + 1)):
            fail(f"{spec['file']} {gid}: years are not contiguous {first}-{last}")
        series = []
        totals[gid] = {}
        for y in range(first, last + 1):
            row = rows[y]
            if row[width] != 100:
                fail(f"{spec['file']} {gid} {y}: percent total is {row[width]!r}, expected 100")
            if not isinstance(row[0], int):
                fail(f"{spec['file']} {gid} {y}: count total is {row[0]!r}")
            totals[gid][y] = row[0]
            vals = []
            for cat, c in zip(xls_cats, cols):
                v = row[c]
                n = row[c - width]
                if isinstance(v, int) and isinstance(n, int) and row[0] > 0:
                    derived = 100 * n / row[0]
                    # Counts are rounded to thousands, so allow that rounding plus one point.
                    if abs(v - derived) > 100 * 0.5 / row[0] + 1:
                        fixed = int(derived + 0.5)
                        CORRECTIONS.append({"char": spec["id"], "geo": gid, "year": y, "cat": cat["id"],
                                            "published": v, "used": fixed,
                                            "why": f"published percent disagrees with the published counts ({n} of {row[0]} thousand)"})
                        v = fixed
                if v is None:
                    fail(f"{spec['file']} {gid} {y} {cat['id']}: blank cell")
                if not in_range(cat, y) and v != "NA":
                    fail(f"{spec['file']} {gid} {y} {cat['id']}: expected (NA) outside {cat.get('from')}-{cat.get('to')}, got {v!r}")
                if in_range(cat, y) and v == "NA":
                    fail(f"{spec['file']} {gid} {y} {cat['id']}: unexpected (NA) inside the published years")
                vals.append(v)
            series.append(vals)
        data[gid] = series
    # Unit check: regional counts add to the US count (thousands, rounding).
    for y in range(first, last + 1):
        s = sum(totals[g][y] for g, _ in GEOS[1:])
        if abs(s - totals["US"][y]) > 3:
            fail(f"{spec['file']} {y}: regions add to {s}, US is {totals['US'][y]}")

    out = {
        "id": spec["id"], "title": spec["title"], "from": first,
        "cats": [], "data": data,
        "sources": [{"table": title, "file": spec["file"], "url": url, "from": first, "to": last}],
    }
    for cat in spec["cats"]:
        c = {"id": cat["id"], "label": cat["label"]}
        for k in ("long", "from", "to"):
            if k in cat:
                c[k] = cat[k]
        if (spec["id"], cat["id"]) in RELABEL:
            c["relabel"] = RELABEL[(spec["id"], cat["id"])]
        out["cats"].append(c)
    return out, totals


def parse_stories_pdf(refresh: bool) -> dict[str, dict[int, list]]:
    """1973-2008 stories (1 / 2+ / split-level) per geography from the 2008 annual report."""
    path = fetch(PDF_2008, refresh)
    txt = subprocess.run(["pdftotext", "-layout", path, "-"], capture_output=True, text=True, check=True).stdout
    out: dict[str, dict[int, list]] = {}
    in_table = False
    geo = None
    for line in txt.splitlines():
        s = line.strip()
        if PDF_STORIES_TITLE in s:
            in_table = s == PDF_STORIES_TITLE  # not ": Built For Sale" etc.
            geo = None
            continue
        if not in_table:
            continue
        if s in GEO_BY_NAME:
            geo = GEO_BY_NAME[s]
            if geo in out:
                fail(f"stories PDF: {s} appears twice")
            out[geo] = {}
            continue
        if s and not re.match(r"^\d{4}\b", s):
            if geo and s.startswith("RSE"):
                geo = None
            elif re.search(r"Metropolitan", s):
                geo = None
            continue
        m = re.match(r"^(\d{4})\s+(.*)$", s)
        if m and geo:
            toks = m.group(2).split()
            if len(toks) != 8:
                fail(f"stories PDF {geo} {m.group(1)}: expected 8 values, got {toks}")
            vals = [cell(t) for t in toks]
            if vals[4] != 100:
                fail(f"stories PDF {geo} {m.group(1)}: percent total {vals[4]!r}")
            out[geo][int(m.group(1))] = vals
    for gid, _ in GEOS:
        if sorted(out.get(gid, {})) != list(range(1973, 2009)):
            fail(f"stories PDF: {gid} does not cover 1973-2008 ({sorted(out.get(gid, {}))[:3]}…)")
    return out


def main() -> None:
    refresh = "--refresh" in sys.argv[1:]
    print("typical_house: Census Survey of Construction → src/data/typical-house.json")
    chars = []
    completed = None
    for spec in CHARS:
        ch, totals = parse_char(spec, refresh)
        if spec["id"] == "foundation":
            completed = totals  # from 1971, the longest series
        chars.append(ch)

    # Stories: prepend the 1973-2008 PDF scheme to the 2009+ XLS series.
    stories = next(c for c in chars if c["id"] == "stories")
    pdf = parse_stories_pdf(refresh)
    ids = [c["id"] for c in stories["cats"]]
    for gid, _ in GEOS:
        old = []
        for y in range(1973, 2009):
            v = pdf[gid][y]
            row = ["NA"] * len(ids)
            row[ids.index("one")], row[ids.index("twoplus")], row[ids.index("split")] = v[5], v[6], v[7]
            old.append(row)
        new = [r + ["NA", "NA"] for r in stories["data"][gid]]
        stories["data"][gid] = old + new
        for y in range(1973, 2009):  # cross-check the PDF totals against foundation's counts
            if abs(pdf[gid][y][0] - completed[gid][y]) > 2:
                fail(f"stories PDF {gid} {y}: total {pdf[gid][y][0]} vs completed {completed[gid][y]}")
    stories["from"] = 1973
    stories["sources"].insert(0, {"table": PDF_STORIES_TABLE, "file": "c25ann2008.pdf", "url": PDF_2008, "from": 1973, "to": 2008})
    stories["break"] = 2009

    # Median / average square feet.
    sqpath = fetch(XLS_BASE + "squarefeet_cust.xls", refresh)
    sh = xlrd.open_workbook(sqpath).sheet_by_name("SFTotalMedAvgSqFt")
    sq_rows = {}
    for r in range(sh.nrows):
        a = sh.cell_value(r, 0)
        if isinstance(a, float):
            sq_rows[int(a)] = [cell(sh.cell_value(r, c)) for c in range(1, 11)]
    sq_years = sorted(sq_rows)
    if sq_years != list(range(sq_years[0], sq_years[-1] + 1)) or sq_years[0] != 1973:
        fail("square feet: years not contiguous from 1973")
    heads = [str(sh.cell_value(r, 1)) + str(sh.cell_value(r, 6)) for r in range(3, 5)]
    if "Median" not in heads[0] or "Average" not in heads[0]:
        fail(f"square feet: unexpected header {heads!r}")
    sqft = {
        "from": sq_years[0],
        "median": {g: [sq_rows[y][i] for y in sq_years] for i, (g, _) in enumerate(GEOS)},
        "average": {g: [sq_rows[y][5 + i] for y in sq_years] for i, (g, _) in enumerate(GEOS)},
        "sources": [{"table": "Median and Average Square Feet of Floor Area in New Single-Family Houses Completed",
                     "file": "squarefeet_cust.xls", "url": XLS_BASE + "squarefeet_cust.xls",
                     "from": sq_years[0], "to": sq_years[-1]}],
    }

    latest = min(max(len(c["data"]["US"]) + c["from"] - 1 for c in chars), sq_years[-1])
    for c in chars:
        if c["from"] + len(c["data"]["US"]) - 1 != latest:
            fail(f"{c['id']}: last year differs from {latest}")
    first = min(c["from"] for c in chars)

    data = {
        "generated": _dt.date.today().isoformat(),
        "firstYear": first,
        "latestYear": latest,
        "source": {
            "publisher": "US Census Bureau",
            "survey": "Survey of Construction",
            "series": "Characteristics of New Housing",
            "url": PAGE,
            "universe": "New single-family houses completed (includes houses built for rent)",
        },
        "geos": [{"id": g, "label": n} for g, n in GEOS],
        "completed": {
            "from": first,
            "data": {g: [completed[g][y] for y in range(first, latest + 1)] for g, _ in GEOS},
            "sources": [{"table": chars[0]["sources"][0]["table"], "file": CHARS[0]["file"], "url": XLS_BASE + CHARS[0]["file"], "from": first, "to": latest}],
        },
        "sqft": sqft,
        "chars": chars,
        "notes": NOTES,
        "corrections": CORRECTIONS,
    }
    check(data)

    with open(OUT, "w", encoding="utf-8") as f:
        f.write(compact_json(data))
        f.write("\n")
    print(f"  wrote {os.path.relpath(OUT, ROOT)} ({os.path.getsize(OUT) // 1024} KB): "
          f"{first}-{latest}, {len(chars)} characteristics + square feet, 5 geographies")


# ---------------------------------------------------------------------------------------------
def get(data: dict, char: str, geo: str, year: int) -> dict:
    c = next(x for x in data["chars"] if x["id"] == char)
    row = c["data"][geo][year - c["from"]]
    return {cat["id"]: v for cat, v in zip(c["cats"], row)}


def check(data: dict) -> None:
    """The researcher's verified figures (research/feasibility-typical-house.md, section 2)."""
    errors = []
    n = [0]

    def eq(label, got, want):
        n[0] += 1
        if got != want:
            errors.append(f"{label}: got {got!r}, want {want!r}")

    f = lambda g, y: [get(data, "foundation", g, y)[k] for k in ("basement", "slab", "crawl")]
    eq("1987 South foundation (basement/slab or other/crawl)", f("S", 1987), [20, 56, 25])
    eq("1975 US foundation", f("US", 1975), [45, 35, 20])
    eq("1975 Northeast foundation", f("NE", 1975), [75, 16, 9])
    eq("2000 Midwest foundation", f("MW", 2000), [79, 13, 8])
    eq("2020 US foundation", f("US", 2020), [22, 65, 12])
    eq("2020 West foundation", f("W", 2020), [24, 55, 20])
    w = lambda g, y: [get(data, "wall", g, y)[k] for k in ("brick", "wood", "stucco", "vinyl", "fiber", "other")]
    eq("1987 South walls", w("S", 1987), [34, 35, 6, "NA", "NA", 24])
    eq("1975 Northeast walls", w("NE", 1975), [8, 44, "S", "NA", "NA", 47])
    eq("2000 US walls", w("US", 2000), [20, 14, 17, 39, "NA", 8])
    eq("2020 US walls", w("US", 2020), [19, 5, 27, 25, 22, 2])
    fu = lambda g, y: [get(data, "fuel", g, y)[k] for k in ("gas", "electric", "oil", "other")]
    eq("1987 South heating fuel", fu("S", 1987), [33, 65, "Z", 2])
    eq("1975 Northeast heating fuel", fu("NE", 1975), [24, 33, 41, 3])
    eq("2020 US heating fuel", fu("US", 2020), [55, 45, "NA", 1])
    ac = lambda g, y: get(data, "ac", g, y)["with"]
    eq("1987 South air-conditioning", ac("S", 1987), 92)
    eq("1973 US air-conditioning", ac("US", 1973), 49)
    eq("1975 US air-conditioning", ac("US", 1975), 46)
    eq("2000 West air-conditioning", ac("W", 2000), 60)
    eq("2020 South air-conditioning", ac("S", 2020), 100)
    st = lambda g, y, ks: [get(data, "stories", g, y)[k] for k in ks]
    eq("1987 South stories (1/2+/split)", st("S", 1987, ("one", "twoplus", "split")), [59, 39, 2])
    eq("1975 US stories", st("US", 1975, ("one", "twoplus", "split")), [65, 23, 12])
    eq("2000 Northeast stories", st("NE", 2000, ("one", "twoplus", "split")), [19, 81, "Z"])
    eq("2008 US stories 1 story", st("US", 2008, ("one",)), [44])
    eq("2009 US stories 1 story", st("US", 2009, ("one",)), [47])
    eq("2020 US stories (1/2/3+)", st("US", 2020, ("one", "two", "three")), [50, 45, 5])
    eq("2020 Northeast stories", st("NE", 2020, ("one", "two", "three")), [21, 67, 13])
    med = lambda g, y: data["sqft"]["median"][g][y - data["sqft"]["from"]]
    eq("1987 South median sq ft", med("S", 1987), 1755)
    eq("1975 medians", [med(g, 1975) for g, _ in GEOS], [1535, 1405, 1460, 1605, 1510])
    eq("1987 medians", [med(g, 1987) for g, _ in GEOS], [1755, 1840, 1740, 1755, 1730])
    eq("2000 medians", [med(g, 2000) for g, _ in GEOS], [2057, 2266, 1971, 2075, 2014])
    eq("2020 medians", [med(g, 2020) for g, _ in GEOS], [2261, 2259, 2123, 2293, 2242])
    comp = lambda g, y: data["completed"]["data"][g][y - data["completed"]["from"]]
    eq("1987 South houses completed (thousands)", comp("S", 1987), 467)
    eq("1987 US houses completed", comp("US", 1987), 1123)
    eq("1975 US houses completed", comp("US", 1975), 875)
    eq("2020 US houses completed", comp("US", 2020), 912)
    eq("first year", data["firstYear"], 1971)
    eq("wall first year", next(c for c in data["chars"] if c["id"] == "wall")["from"], 1973)
    if data["latestYear"] < 2025:
        errors.append(f"latest year {data['latestYear']} is older than the verified 2025")

    # Every in-range percent row sums to about 100 when nothing is withheld.
    for c in data["chars"]:
        for g, _ in GEOS:
            for i, row in enumerate(c["data"][g]):
                y = c["from"] + i
                nums = [v for v in row if isinstance(v, int)]
                marks = [v for v in row if isinstance(v, str) and v != "NA"]
                if not marks and not (97 <= sum(nums) <= 103):
                    errors.append(f"{c['id']} {g} {y}: shares add to {sum(nums)}")
    if errors:
        print("typical_house: sanity checks FAILED", file=sys.stderr)
        for e in errors:
            print("  - " + e, file=sys.stderr)
        sys.exit(1)
    print(f"  sanity checks passed: {n[0]} verified figures, every row's shares, regional totals = US")


def compact_json(data: dict) -> str:
    """Pretty at the top, one line per year row, so the committed file diffs well and stays small."""
    def enc(o, depth):
        if isinstance(o, list) and o and all(not isinstance(x, (dict, list)) for x in o):
            return json.dumps(o, ensure_ascii=False, separators=(",", ":"))
        if isinstance(o, list) and o and all(isinstance(x, list) for x in o):
            return "[" + ",".join(json.dumps(x, separators=(",", ":")) for x in o) + "]"
        if isinstance(o, dict) and depth >= 3:
            return json.dumps(o, ensure_ascii=False, separators=(",", ":"))
        if isinstance(o, dict):
            pad = "  " * (depth + 1)
            items = [f"{pad}{json.dumps(k)}: {enc(v, depth + 1)}" for k, v in o.items()]
            return "{\n" + ",\n".join(items) + "\n" + "  " * depth + "}"
        if isinstance(o, list):
            pad = "  " * (depth + 1)
            return "[\n" + ",\n".join(pad + enc(x, depth + 1) for x in o) + "\n" + "  " * depth + "]"
        return json.dumps(o, ensure_ascii=False)
    return enc(data, 0)


if __name__ == "__main__":
    main()
