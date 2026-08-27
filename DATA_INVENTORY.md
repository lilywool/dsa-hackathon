# Data Inventory

Where Haven's data came from, who provided it, and what happened to it
before it became the 12 files in `public/data/`.

For row counts, column names, dtypes, and schema drift, see Brandon's
`Hackathon_Data_Profiling.ipynb`. He profiled all 27 hackathon-provided
files and that's the authoritative structural reference. This document
covers what that pass doesn't: attribution and processing history.

## Sources

| # | Source | Provided by |
|---|---|---|
| 1 | Block-level downtown homelessness dataset (8/20/2026) | Data Science Alliance |
| 2 | Get It Done (311), MTS transit, homeless services | Brandon Christenson |
| 3 | HUD CoC and PIT counts, general and veteran | Lillian Wool (me), sourced |
| 4 | Web-scraped org capacity and services | LaShea Conner-Gaten |

**Note on source 4:** LaShea's file was the initial capacity input, but it
predates my later research passes (organization websites, annual reports,
public filings). The live `org_capacity.json` numbers reflect that
reconciliation, not this file directly.

Sources 1 through 3 were in hand from the start. Source 4 arrived later,
once the pipeline was already running, which is why it sits outside the main
geographic-scoping pass.

## What each source contains

**Block-level downtown homelessness counts.** Street-count observations per
block (individuals, tents and structures, vehicles) across 12 observation
periods, 2018 to 2025, plus a balanced 261-block longitudinal panel, block
grid geometry, a monthly neighborhood rollup covering 2017 to 2025, an
area-name crosswalk, and the count methodology's tent and vehicle
multipliers. Distributed to teams at the event, not published publicly.

**Get It Done 311 service requests.** Ten years of closed requests, 2016 to
2025: roughly 2.77M citywide records, about 252K inside the downtown
boundary. Encampment reports made up 47 to 49% of downtown 311 volume from
2022 to 2024. Publicly available from the City of San Diego's
[open data portal](https://data.sandiego.gov/datasets/get-it-done-311/).
Aggregated to block level by filing month and shipped (see below); the raw
filtered CSVs are 73MB and stay in the working archive. Note that the source
files are grouped by closure year, so the shipped counts are re-keyed to
`date_requested` and differ slightly from the source files' own per-file
totals.

**MTS transit stops and routes.** GTFS stop locations and route geometry,
6,230 stops citywide and 130 downtown, carrying wheelchair-boarding
accessibility flags. Published by
[San Diego MTS](https://www.sdmts.com/business-center/app-developers).
Duplicate shapefile exports of the same data were in a different coordinate
system and went unused.

**Homeless services directory.** 1,719 citywide provider listings with
locations and service types, of which 51 fall inside the downtown boundary,
alongside an official field dictionary. Notable gap: no dedicated anger
management, landlord mediation, parenting or pregnancy support, hygiene, or
clothing-drive categories exist among the downtown listings.

**HUD CoC and PIT counts.** Point-in-Time counts by Continuum of Care and by
state, 2007 to 2024, plus veteran-specific equivalents, 2011 to 2024. CoC
and state level only, with no finer geography, so downtown-specific figures
aren't derivable from them; they ship as a regional benchmark only. Publicly
available from
[HUD Exchange](https://www.hudexchange.info/programs/hdx/pit-hic/). Two
caveats carried forward: 2021 counts dip sharply because unsheltered counts
were suspended in many CoCs during COVID (San Diego reported 0 unsheltered
that year), and the workbook schema grows from 25 columns in 2007 to 1,308
in 2024.

**Web-scraped org capacity and services.** Roughly 19 organizations, one row
per organization and service category, with published capacity, annual
service volume, and a confidence tier per row. See the note on source 4
above.

**Derived working files.** Every source also has boundary-filtered,
invalid-coordinate, and edge-case exports, a per-file insights write-up, a
machine-readable summary log, and a per-record decision trail. These stay in
the working archive rather than the repo.

**Brandon's EDA.** `Hackathon_Data_Profiling.ipynb` (structural profiling of
all 27 provided files), `01_StreetSignal_Analysis.ipynb` (the block priority
scoring model), and `StreetSignal_Project_Summary.md` (his written handoff).

## What ships in this repo

Everything above converges on twelve files in `public/data/`. I built these as
the handoff layer between the raw sources and the app: each one is shaped
for a specific piece of the UI, so the front end can fetch and render
without doing its own joins, filtering, or unit math. They were the
deliverable Prisha built against.

| File | Feeds | What it carries |
|---|---|---|
| `service_locations.geojson` | Both dashboards | One point per physical org site, deduped across sources, with service types and a downtown-boundary flag for styling |
| `org_capacity.json` | Org dashboard | One row per organization and service category, with capacity value, unit, confidence tier, method, and source |
| `org_capacity.geojson` | Org dashboard | Mappable counterpart to the above, joined to coordinates so capacity renders on the map without a client-side join |
| `block_need_heatmap.geojson` | Org dashboard | 288 downtown block polygons with latest and full-history counts, for the heatmap and time slider |
| `monthly_trend.json` | Org dashboard | Monthly downtown totals, 2017 to 2025, for the trend chart |
| `neighborhood_trend.geojson` | Org dashboard | Six dissolved neighborhood polygons with latest total and monthly history |
| `cooccurrence_probabilities.json` | Participant dashboard | The illustrative signal-to-need heuristic, with a caveat field per row |
| `transit_accessibility.geojson` | Participant dashboard | Downtown transit stops with wheelchair-boarding status |
| `get_it_done_encampment_blocks.geojson` | Org dashboard | Per-block 311 encampment and outreach request counts by month and year, 2018-08 to 2025-09, on the same 288 block polygons |
| `get_it_done_encampment_trend.json` | Org dashboard | Downtown-wide request totals by month and year |
| `hud_pit_benchmark.json` | Org dashboard | HUD Point-in-Time counts for the San Diego CoC and California, 2007 to 2024, plus veteran series 2011 to 2024, as a regional benchmark |
| `manifest.json` | Reference | Index of all twelve: purpose, target dashboard, and whether the modeled/estimated disclaimer applies |

Three structural decisions worth knowing: `org_wide_total_flag` rows must be
excluded from any per-category sum across an organization,
`inside_downtown_boundary` is a styling property and never an inclusion
filter, and the Get It Done counts are complaint volume that must never be
summed with or styled like the observed street-count numbers in
`block_need_heatmap.geojson`. All three are documented in `manifest.json`
alongside each file.
