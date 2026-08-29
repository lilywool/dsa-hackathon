# Haven

A support-network platform for downtown San Diego's unsheltered community
and the organizations that serve them. Built at the Data Science Alliance's
**Building for Good** hackathon.

**Participants** get a map of nearby service providers and can place intake
requests directly with organizations without divulging their identity, plus
a computer-vision screen ([EyePop](https://www.eyepop.ai)) that flags visual
indicators like jaundice and open wounds to help signal urgency for care.

**Organizations** get incoming requests, the ability to network with peers
to close service gaps, historical need forecasting by block and
neighborhood, and day-to-day capacity (beds available, meals served)
tracked through aggregate counts.

This fork ([commits](https://github.com/lilywool/dsa-hackathon/commits/main/))
extends the original build's UI and data: location-aware resource discovery,
researched organization capacity data, and a fuller demo workflow.

## Team

Built at the [Data Science Alliance](https://www.linkedin.com/company/data-science-alliance/)
hackathon by:

- [**Prisha Maiti**](https://www.linkedin.com/in/prisha-maiti-39a80a1a4/):
  app engineering, covering auth, dashboards, and Supabase integration
  ([original repo](https://github.com/PrishaMaiti/dsa-hackathon))
- [**Brandon Christenson**](https://www.linkedin.com/in/brandonchristenson/):
  exploratory data analysis ("StreetSignal SD"); sourced the Get It Done,
  MTS transit, and homeless services datasets
- [**Mariya Alsaiari**](https://www.linkedin.com/in/mariya-alsaiari/):
  conceptualized, trained, and built the EyePop computer-vision models for jaundice classification and
  wound triage that were later integrated live into Haven's UI.
- [**LaShea Conner-Gaten, Ed.M.**](https://www.linkedin.com/in/lashea-conner-gaten-edm/):
  project management, stakeholder outreach, pitch deck, and the initial
  web-scraped org capacity research
- [**Me, Lillian Wool**](https://www.linkedin.com/in/lillian-wool-84336a354/):
  data pipeline (sourcing, geographic scoping, capacity reconciliation,
  export to the app); wired Mariya's EyePop models into the participant
  dashboard; UI work in both the upstream repo and this fork; capacity
  research

## Scope:

**Live today:** the analytics and targeting layer, meaning the block-level
need heatmap, neighborhood trends, and the org capacity dashboard, all built
on real aggregate historical data.

**Vision Roadmap:** per-person intake/triage records and live
cross-org capacity coordination. The EyePop upload demonstrates the
triage-assist *interaction*, but there's no case-record or org
self-reporting system behind it. Design intent for real deployment is that
only interactions are tracked (requests, image submissions, searches, map
clicks), never a name or identifying record.

Modeled and estimated figures are labeled as such in the UI. They
demonstrate what the analytics could support, not tonight's real numbers.

## Setup

```bash
npm install
npm run dev
```

Open http://localhost:3000. A demo mode lets you sign in without any
backend configured; see `src/lib/auth/demo.ts`.

Editing `public/data/*.json` and not seeing changes? Clear the Next.js
cache (`rm -rf .next`) and restart. `src/lib/data/load.ts` uses
`cache: "force-cache"`, which persists across restarts.

**Environment variables** (`.env.example`):

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
HAVEN_REVIEW_PASSWORD=          # gates the org-application review flow
EYEPOP_API_KEY=                 # optional; without it, demo/fallback mode
```

`EYEPOP_API_KEY` authenticates against two models Mariya trained:

```
ucsd-edu-malsaiari.image-classify.Jaundice-Classification---Face-and-Body---Aug-2026:latest
ucsd-edu-malsaiari.image-classify.wound-triage-classification:latest
```

[EyePop](https://www.eyepop.ai) founder Andy Ballester kindly reinstated
trial access so I could record a live demo of Haven's care-assessment
flow. Just in order to record the Demo for Haven, I recreated Mariya's original working eyepop abilities under my own account:

```
jaundice classification (Face and Body, Aug 2026): 06a92704813778ac80001c5f8f8e715e
wound triage classification:                       06a926a7eb28747080002b19e5ca3106
```

## Tech stack

Next.js 16 (App Router), React 19, TypeScript, Tailwind 4, shadcn/radix-ui ·
Leaflet maps · Recharts · Supabase (Postgres, Auth, RLS) ·
[EyePop.ai](https://www.eyepop.ai) · static JSON/GeoJSON in `public/data/`

## Data

Full source breakdown in [`DATA_INVENTORY.md`](./DATA_INVENTORY.md).
Column and dtype detail lives in Brandon's
`Hackathon_Data_Profiling.ipynb`.

Sources feeding the pipeline: the DSA hackathon block-level dataset
(8/20/2026), Get It Done 311 service requests (2016 to 2025), MTS transit
stops and routes (GTFS GeoJSON and CSV), homeless services files (1,719
citywide provider listings); plus HUD (Housing and Urban Development) CoC
(Continuum of Care) and PIT (Point-in-Time) counts I sourced.

I ran all of it through geographic scoping against the 6-neighborhood
downtown boundary (point-in-polygon; bad coordinates flagged and exported
separately, never silently dropped; out-of-boundary blocks paused the
pipeline for an explicit decision), then capacity geocoding and
reconciliation, then export into the 12 static files the app fetches.

Two findings that shaped the output:

- Only 2 of 13 point-resolvable orgs sit inside the strict 6-neighborhood
  polygon. Father Joe's, Alpha Project, and most major providers fall just
  outside it. So `inside_downtown_boundary` is a map-styling property, never
  an inclusion filter; filtering on it would gut the resource map.
- Org-wide totals (e.g. Alpha Project's 4,000/day `OTHER` row) and
  network-wide figures (Feeding San Diego, SD Food Bank) are flagged via
  `org_wide_total_flag` and `scope` so they're never summed against an org's
  per-category rows.

Capacity numbers carry a `capacity_confidence` tier: `HIGH`/`MEDIUM`/`LOW`
are researched figures with a cited source, while `MODELED_FALLBACK` is a
demand-proxy estimate where no published figure exists, flagged as simulated
in the UI. After several research passes, 36 of the 37 rows now carry real
researched figures; one modeled row remains.

### Brandon's EDA: StreetSignal SD

His analysis of the same block and monthly data produced three findings
that shaped how need is framed here:

- **The form changed, not just the amount.** Jan 2023 to Jan 2025: the
  published total fell 41.5%, but directly observed individuals *rose* 28%.
  The decline is almost entirely tents/structures (-74.6%) and vehicles
  (-84.8%).
- **Need is concentrated.** 16 of 261 blocks (6.1%) held half of Jan 2025's
  estimated burden; the top 10% held 62.6%.
- **Neighborhood averages hide block-level variance.** Highest-priority
  block rates run from 14.0% (City Center) to 0.0% (Marina), which is why
  this app surfaces a block heatmap rather than neighborhood stats alone.

His scoring model (40% persistence + 40% recent burden + 20% emerging need)
is documented in `StreetSignal_Project_Summary.md`. Note the deliberate
tradeoff: the highest-burden block (17th & K) never ranks top-20, because
flat-high blocks earn no "emerging" credit while rapidly-accelerating ones
do. My read is that acceleration may be the more actionable signal, since
persistently high-need areas likely already have resources allocated, while
accelerating ones may not see it coming. Worth a conscious decision before
launch, not something to silently inherit.

## Known limitations

- **No production EyePop key.** The live demo ran on trial access Andy
  Ballester reinstated for my recreated copies of Mariya's two trained
  abilities; long-term use needs a real key with access to them, or
  republishing under a project-owned account.
- **Identity-free tracking is a goal, not a built guarantee.** No
  data-retention or de-identification review has been done yet (for example,
  whether EyePop retains uploads with identifying metadata upstream). It's a
  requirement for real deployment, not something already audited.
- Distances and routes are straight-line approximations, not street routing.
- Capacity values carry a ±30% display jitter for a "live-feeling" demo, so
  they aren't real-time data.
- One `org_capacity.json` row is still `MODELED_FALLBACK` (San Diego
  American Indian Health Center, `OTHER`); the other 36 carry researched
  figures with a cited source.
- Get It Done encampment reports are complaint volume, not a headcount, and
  must never be summed with or styled like the observed street-count numbers.
- HUD PIT/CoC data is cleaned and boundary-scoped but not yet exposed as its
  own app layer.

## Fork changes

UI and data only; the live Supabase backend is untouched.

- Location-aware resource discovery, radius filtering, distance sorting
- More visible selected-resource map route
- Org insights (block heatmap, capacity table) as the post-login landing page
- Separate food-pantry vs. warm-meal capacity scales
- Daily capacity normalization across the dataset, with refreshable jitter
- Multiple capacity-research passes reconciling published figures against
  modeled placeholders; removed referral-only orgs (2-1-1 San Diego, SD
  Hunger Coalition) that don't directly provide services
- EyePop image upload and care-assessment flow
- Demo-request cleanup on participant sign-out, preserving org visibility

---

Grateful to DSA for putting this in front of people who could actually use
it. The hope is that Haven helps build a stronger support network between
homeless-serving organizations, so that no one is left behind.
