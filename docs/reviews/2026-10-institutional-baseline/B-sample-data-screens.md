# Institutional baseline audit — Part B: screens still using generated sample data

Spec Part 6, audit item 3 ("a list of screens still using generated sample data").
Read-only audit of `/home/user/gov` at `16d2d5c`, 2026-10-21. All paths are relative to `app/src/`
unless they start with `docs/`. No file in the repository was changed.

## 0. Method and vocabulary

- **Generators.** All generated figures come from one deterministic core,
  `lib/telemetry.ts` (`seed()`, `wave()`, `waveSeries()`, `domainStress()`), and from
  `seededInt()` in `lib/data/store/shared.ts:38`. 85 engine modules under `lib/gov/*` and
  `lib/institution/*` call them. `rg -l` found 207 non-test files that use a generator, of
  which 26 UI files outside `apps/` import a generator engine directly
  (scratch lists: `gen.txt`, `genconsumers.txt`). `Math.random` has no data role (it appears
  only in ids, jitter and backup code).
- **Markers in use.**
  - `SignalTag` (`components/ui/SignalTag.tsx`), set directly or through the `signal=` prop of
    `Panel` (`components/features/SituationRoom.tsx:75-105`).
  - Local panel wrappers that always carry a marker: `NationalOverview` `Panel` (always
    Sample, line 139) and `NationalShell` `P` (Modelled by default, line 47).
  - `IndexTag` (engine indexes), the public `SampleChip`, `SimulationNotice` and `SimulatedView`.
- **Mode handling.** Mode comes from `lib/ops/mode.ts` (`installationMode()`, `samplesAllowed()`).
  Only three mechanisms change what a screen shows in production:
  1. `app/(app)/app/[domain]/[[...sub]]/page.tsx:19` (`SimulationNotice`) together with
     `apps/_shared/RegisterRecords.tsx:96-118` (`SimulatedView`). In demo and training this shows
     a Sample strip. In production it folds the app's screens under "Not connected" and renders
     them only when opened. This covers every app that `AppHost` mounts.
  2. `lib/gov/executive-posture.ts` (`generated.show`), used only by `app/(command)/command/page.tsx`
     and `components/ui/CommandShell.tsx`. In production it shows "Not connected" in place of a
     generated figure.
  3. Server-side seeds that check `samplesAllowed()`: ministry queues and incidents
     (`lib/data/store/seeds.ts:13,60`) and the national snapshot (`lib/data/store/national.ts:242,492`).
- **Not counted as generated.** Screens on the substrate repositories (`lib/db/repos/*`:
  `PublicObservatory`, `OfficerHome`, `PostureBoard`, `LiveWall`, `CharterDetail`,
  `DispatchBoard`, `TelemetryWall` …) and Update Center screens. They read real rows, or say
  the substrate is unavailable (`SubstrateEmpty`).
- **How counting worked.** Counts use `<Panel|<P|<Section|<WallPanel` tags. Unlabelled strips
  were found with two small scanners (`tools/outside.py`, `tools/maps.py`) that report
  generator calls and `.map(` renders outside a signalled panel. I then read each hit by hand.
  The counts are approximate (±10%). The defects listed with file:line were all confirmed by reading.

---

## 1. HIGHEST PRIORITY — unlabelled generated data (exact file:line)

"Unlabelled" here means no `SignalTag`, `SampleChip`, `IndexTag` or app-level
`SimulatedView`/`SimulationNotice` covers the figure. Items are sorted by reach: public first,
then pages shown in production with no fold.

### 1.1 Public pages (open without sign-in, every mode)

| # | file:line | What it shows | Source | Should read |
|---|---|---|---|---|
| P1 | `app/(public)/government/page.tsx:126-129` | "National Posture **STEADY**", "National readiness **86/100** · **0** major incidents" | hard-coded literals | The `/api/national` posture with its basis. In production show "Not connected", as `executivePosture()` does |
| P2 | `app/(public)/government/page.tsx:132-136` | "Cabinet sitting Wednesday — agenda public", "Public briefing every 6h · 5 languages", "✓ separation intact", "✓ audit chain intact" | hard-coded literals | Separation of powers from `/api/constitution/separation` (`lib/gov/separation.ts`), audit-chain verification from `api.audit.verify`. Sittings from the legislature or offices register, or remove until recorded |
| P3 | `app/(public)/health/page.tsx:49` → `lib/gov/health-operations.ts:353,371` → `lib/public-sites/content/health.ts:40` | Public **HEALTH ALERT** banner. When the simulation's `disasterState` is not normal it reads "Public health … declared — <region>". Content calls it "live" | simulation engine `nationalSituation('MOH', 100)` | A recorded emergency or transition (`lib/transitions/`, `/api/constitution/transitions`) or a recorded health advisory. Never an engine. This is the only public-site field without a `SampleChip` |

The other generated blocks on public pages carry a `SampleChip` and comply:
- treasury: `app/(public)/treasury/page.tsx:312,333,346`
- health surveillance and KPIs: `health/page.tsx:183,205`
- laboratory `STATS`: `health/laboratory/page.tsx:212`
- education: `education/page.tsx:47`

### 1.2 Console pages outside `/app/<domain>`: shown in production, no fold, no marker

| # | Route | file:line | What it shows | Source |
|---|---|---|---|---|
| C1 | `/health-ecosystem` | `apps/ministry-health/HealthEcosystemWall.tsx` (whole file, 772 lines; route `app/(app)/health-ecosystem/page.tsx:7`) | 9-tile health wall: command KPIs, hospital ICU map, **doctor workspace with a patient queue and patient risk score** (l.335-392), citizen portal health score and insurance (l.399-440), disease, finance and fraud exposure in `formatMoney` (l.648). One `SignalTag` only (l.258, propagation map) | `lib/gov/health-*`, `waveSeries`. Mounted **outside AppHost**, so it has no `SimulationNotice` and no `SimulatedView` |
| C2 | every page with `<RuntimeQueue>` | `components/features/RuntimeQueue.tsx:44` → `lib/gov/runtime-store.ts:138-145` (`seedWorkItems`) | "work items" with hard-coded assignees (`RuntimeQueue.tsx:14`: K. Adamu, L. Mensah …) and actions an operator can take | generated in the browser and kept in the session; no marker. Mounted at: `CabinetIntelligence.tsx:883` (/gov), `NationalCoordination.tsx:245`, `DomainCommand.tsx:469`, `NationalSimulation.tsx:281`, `BranchWorkspace.tsx:293,486`, `MinistryWorkspace.tsx:949,961`, `SubsystemConsole.tsx` ×39, `app/(ops)/ops/OpsCenter.tsx:450`. Apps mount it ×24 more, but inside the fold |
| C3 | `/gov/situation-room`, `/gov/coordination`, `/gov/configuration` | `apps/_shared/InstitutionChain.tsx:281-460` used at `SituationRoom.tsx:1488-1493`, `NationalCoordination.tsx:449-456`, `app/(gov)/gov/Cabinet.tsx:164` | National dispatch digest, records ledger, encounter digest, referral board, bureaucracy pulse | session stores with seeded baselines: `lib/gov/{dispatch,records,encounter,referral,enrollment}-store.ts`, `lib/gov/institution-chain.ts` |
| C4 | `/gov` | `components/features/CabinetIntelligence.tsx:885-905` | Executive posture strip: "Operational tempo N actions/min", "**Population impacted N.NM**", knock-on risk, regional readiness | `seed()` at l.894, l.898; `nationalRegions()` |
| C5 | `/gov/situation-room` | `components/features/SituationRoom.tsx:779-790` (rendered ~l.890) | Command spine: NAT RISK, SYNC %, READINESS, PROPAGATION /s, EMERG LOAD | derived from generated pressure; no tag |
| C6 | `/gov/situation-room` | `SituationRoom.tsx:1468-1478` | Status strip: "Operational tempo", "**Population impacted N.NM**" | `seed()` |
| C7 | `/gov/coordination` | `NationalCoordination.tsx:78-84` (rendered l.108-118) | National risk index, "Coordinating Institutions **+3 new today**", pinned incidents "3 sev1 · 2 sev2 · 1 sev3" | `waveSeries`, hard-coded strings |
| C8 | `/gov/coordination` | `NationalCoordination.tsx:298-322` | 16-tile micro-grid ("Response time between ministries", "Reserve buffer" …) | `waveSeries` |
| C9 | `/gov/coordination` | `NationalCoordination.tsx:431-445` | Operational command strip, "Operational tempo" | `seed()` l.434 |
| C10 | `/gov/treasury`, `/gov/geopolitical` | `components/features/DomainCommand.tsx:433-449` | 8–16 micro-grid tiles, e.g. Revenue run-rate, Expenditure, Debt-to-GDP (config l.57-66) | `wave()` |
| C11 | `/gov/branch/[key]` | `components/features/BranchWorkspace.tsx:62-72` (rendered l.114-121) | Chambers in session, bills in pipeline, blocked stages, committees sitting | `lib/gov/legislative-engine` |
| C12 | `/gov/branch/[key]` | `BranchWorkspace.tsx:164-178`, `:186-196` | Judicial: appeals, backlog, clearance. Legislature: "Bills tracked", "**Published YTD**", attendance, quorum | `judicial-engine`, `legislativeState()` |
| C13 | `/gov/branch/[key]` | `BranchWorkspace.tsx:380-386` | Branch readiness dimensions strip | generated readiness |
| C14 | `/gov/branches` | `components/features/BranchesView.tsx:31-38` (rendered ~l.52) | "Bills in progress", "Open cases" | generated pipeline and docket |
| C15 | `/gov/regional` | `components/features/RegionalOverview.tsx:46-53` (l.75-82), `:316-322` | Regions critical, infrastructure %, incident load, "Coordination tempo", "Provinces synced ALL" | `nationalRegions()` (`lib/gov/regions.ts`), `waveSeries`. Population correctly reads the twin, else "Not connected" |
| C16 | `/gov/fabric` | `components/features/NationalFabricView.tsx:57-64` (rendered l.~100) | Mean link health, strained links | `national-fabric` engine (generated health) |
| C17 | `/gov/simulation` | `components/features/NationalSimulation.tsx:40-47` (rendered l.137-141) | Scenario outputs: economic impact %, civil unrest %, constitutional stress | scenario engine. Should be tagged `simulated` |
| C18 | `/gov/briefing` | `components/features/ExecutiveBriefingChamber.tsx:468-470` | Telemetry tiles with `waveSeries` sparklines | engines |
| C19 | `/gov/ministry/[id]`, `/ministries/[id]/operations` | `components/features/MinistryWorkspace.tsx:542` Operational state, `:564` Institutional ecosystem, `:628` Command indicators (12 periods), `:643` Regional status, `:655` On time, `:666` Caseload concentration, `:854` Regional theatre (`TerritoryHeat`), `:864` National regional posture, `:879` Regional oversight table, `:1004` Field operations | Per-region open cases, SLA %, facilities operational %, field units, KPI series | **Server-seeded, with no production gate:** `lib/data/store/ministries.ts:183-300,431-480` (`seededInt`, served by `/api/org/ministries/[id]/{operations,regions,analytics,series,field}`). `ministries.ts` never calls `samplesAllowed()` |
| C20 | `/ministries/[id]/system/[group]` | `components/features/SubsystemConsole.tsx`: **44 KPI strips** (224 `<Stat>` tiles) outside the signalled panels. Ranges: 173-178, 298-303, 339-344, 367-372, 397-402, 486-491, 526-531, 574-579, 628-633, 667-672, 716-721, 765-770, 800-805, 862-867, 912-917, 961-966, 1017-1022, 1045-1049, 1062-1066, 1082-1087, 1119-1124, 1140-1145, 1190-1195, 1233-1238, 1277-1282, 1351-1356, 1391-1396, 1432-1437, 1511, 1525-1550, 1595, 1617-1622, 1692, 1705-1734, 1777, 1802-1807, 1876, 1889-1914, 1960, 1973-2000, 2016-2021, 2074-2077 | Clinicians on roster, burnout alerts, claims, and corrections "**Population**" (l.1673, prison population) … | `lib/gov/*-systems.ts`. Only the composite-index tile in some strips has `IndexTag`. The trade (1876) and labour (1960) strips have none at all |
| C21 | `/ops` | `app/(ops)/ops/OpsCenter.tsx:220` Operational theatre (`TerritoryHeat`), `:228` Regional operational status (`nationalRegions`), `:276-282` Incident escalation chronology (seeded age and owner names), `:249` "Municipality health … **of 47**" | generated. **"47" is a hard-coded subdivision count** (Kenya's counties), a nation-conversion breach |
| C22 | `/ops` | `OpsCenter.tsx:45-70,107-110` | When `/api/ops/overview` returns nothing: `SVC_FALLBACK`, `Q_FALLBACK`, `INC_FALLBACK`, and `MUNI` tenants with `seed()` open permits — all shown as real services, queues and incidents | hard-coded fallback arrays. Text "· sample" at l.124, l.456, l.458 has no `SignalTag` |
| C23 | `/audit` | `app/(auditor)/audit/AuditView.tsx:139-148` | "Anomaly signals N" (`seed()`, text-only "sample · no detector connected"), "Attestation CURRENT, last Ns" (made up from the clock), `waveSeries` sparklines drawn as trends of real counts | Should read `lib/records/access-watch.ts` findings. Attestation should come from `api.audit.verify` time |
| C24 | `/control` | `app/(ministry)/control/page.tsx:101-118` and module cards l.~140-165 | Active modules, "Queues past their time target", "Active alerts", "Service status NOMINAL" | `ministryOperations()` (seeded, ungated: `lib/data/store/ministries.ts:183-248`) |
| C25 | `/wall` | `app/(nccc)/wall/page.tsx:108` | "Tripwires: 1 amber (water pressure)" | hard-coded |
| C26 | `/wall` | `app/(nccc)/wall/page.tsx:183-187` | "Invariant watch (live)", every invariant ✓ | hard-coded |
| C27 | `/ministries` (admin) | `app/(admin)/ministries/MinistriesConsole.tsx:155-160`, `:298-313` | "N operational · M degraded · X% mean health" per ministry. The heading at l.305 says "Generated" but there is no marker | `lib/institution/blueprint.ts:826-827,932` (`wave`, `seed`) |

### 1.3 Inside apps (covered by the app-level fold, but mixed with real records on the same screen)

| # | file:line | Issue |
|---|---|---|
| A1 | `apps/ministry-interior/domains/PopulationAnalytics.tsx:250-270` | Hard-coded census and social figures: "Population Enumeration **82.11M**", "Total Housing Units 19.36M", "Latest Census Year **2020**", poverty 14.3%, Gini 0.38, migration rows "Country A 42,815". They sit on the same screen as the twin-observed population (`fetch('/api/twin/state?metric=population')`, l.170) with no per-panel marker. This breaks "no fixed years" and "never a generated number as the nation's" |
| A2 | `apps/legislature/LocalCouncils.tsx:133-146,267-275` | Hard-coded budgets: `formatMoney(24.58e6)` total, `formatMoney(2.45e6)` "Central Park Renovation" … |
| A3 | `apps/judiciary/JudiciaryApp.tsx:77` | Prison "Population" from `judicial-operations` |

### 1.4 Orphaned components with hard-coded national figures (not rendered today; a defect if mounted)

- `components/features/StrategicDashboard.tsx:157-171,282-286` — budget allocation
  `formatMoney(42.7e9)` and project budgets (`formatMoney(6.2e9)` …), "GDP Growth -1.2%" (l.162).
  It imports no marker.
- `components/features/ExecutiveOverview.tsx:127-148,251-258` — "Total Budget"
  `formatMoney(24.58e9)`, "Budget Utilization 68.4%", "1,248 projects".
- Neither file is imported anywhere (`rg -lw` returns no importer).

---

## 2. Nation-looking facts shown without a SignalTag (CLAUDE.md breach list)

| Figure | Where | Kind |
|---|---|---|
| Population impacted "N.NM" | `CabinetIntelligence.tsx:898`, `SituationRoom.tsx:1474` | generated `seed()` |
| National readiness 86/100, 0 major incidents, posture STEADY | `app/(public)/government/page.tsx:127-129` | hard-coded, public |
| Public health emergency "declared — <region>" | `app/(public)/health/page.tsx:49` | simulation, public |
| Municipality count "of 47" | `app/(ops)/ops/OpsCenter.tsx:249` | hard-coded (one nation) |
| Census population 82.11M, housing 19.36M, census year 2020, poverty and Gini | `apps/ministry-interior/domains/PopulationAnalytics.tsx:258-269` | hard-coded (inside the app fold) |
| Prison population | `SubsystemConsole.tsx:1673`; `apps/judiciary/JudiciaryApp.tsx:77` | generated |
| Bills published YTD, bills in progress, open court cases | `BranchWorkspace.tsx:186-196`; `BranchesView.tsx:35-36` | generated, while a real legislature register exists (`lib/legislature/register.ts`) |
| Revenue run-rate, expenditure, debt-to-GDP micro tiles | `DomainCommand.tsx:57-66` rendered at l.433-449 | generated |
| Per-region open cases, SLA %, facilities operational % | `MinistryWorkspace.tsx:643-670,879` | server-seeded, ungated |
| Anomaly-signal count | `AuditView.tsx:144` | generated (text says sample, no tag) |
| Coordinating institutions "+3 new today" | `NationalCoordination.tsx:80` | hard-coded |

Budgets and fiscal panels that **are** tagged:
- `CabinetIntelligence.tsx:185-192` (Fiscal overview `Panel signal="sample"` l.817)
- `command/page.tsx:599-604` (gated, and tagged)

---

## 3. Mislabelled (marker present but the wrong kind)

`lib/twin/signal.ts` reserves `modelled` for "computed by an engine from other signals" and
`sample` / `simulated` for generated values. The following panels are tagged **Modelled**, but
their inputs are `seed()` / `wave()` outputs, so they should be **Sample** or **Simulation**:

| File | Panels | Signalled | Generated input |
|---|---|---|---|
| `ExecutiveBriefingChamber.tsx` (`/gov/briefing`) | 19 | `signal="modelled"` | `seed()` at l.89-91, engines over `wave` |
| `NationalShell.tsx` (`/gov/shell`) | 24 `P` | modelled by default, l.47 | engines over `wave` |
| `NationalFabricView.tsx` (`/gov/fabric`) | 7 | modelled | — |
| `NationalSimulation.tsx` (`/gov/simulation`) | 9 | modelled | scenario outputs (should be `simulated`) |
| `OpsCenter.tsx:434` | 1 | modelled | `waveSeries` |

---

## 4. Inventory by institution / app

### 4.1 Agency apps under `/app/<domain>` (all mounted by `apps/AppHost.tsx`)

**What every app shows, by mode:**
- **Demo and training:** every screen sits under one Sample strip (`RegisterRecords.tsx:102`).
- **Production:**
  - `SimulationNotice` appears above the app.
  - Every screen is folded under "Simulation screens: not connected" (`RegisterRecords.tsx:110-116`).
  - The "Records in the platform" cards (`RegisterRecords`, `register-sources.ts:46-143`) are real.
    They are read through each register's route and its access rule.

The panel-level markers inside apps are almost absent: 6 of about 280 generated screen files
import `SignalTag` or `IndexTag`. Each app is therefore labelled only by the wrapper.

Columns:
- **Screens** — domain and screen `.tsx` files, excluding core, design-system, federation and workflows.
- **Real** — files that fetch a register.
- **Gen** — files that import a generator engine.
- **Tagged** — generated files that also carry a `SignalTag`.

| App (id) | Screens | Real | Gen | Tagged | Engine(s) read | Real register(s) it should read (exists today) |
|---|---|---|---|---|---|---|
| ministry-interior | 71 | 4 | 69 | 4 | `lib/gov/interior-systems`, telemetry | `/api/civil` (`CivilRegistryCommand.tsx:138`, real), `/api/permits` (`PermitsLicensing.tsx:134`, real), twin population (`PopulationAnalytics.tsx:170`), `/api/facilities` (`RegionMaps.tsx:111`). Also organisations, incidents, case engine |
| ministry-health | 25 (+ wall) | 0 (+ `GeoMap` facilities) | 23 | 1 | `health-systems`, `health-operations`, `health-geo` | `lib/health/` and `/api/health-regulation` (facility returns, aggregates), `lib/professions/` (`/api/professions`), facilities register. Patient and clinical screens (`PatientSystem`, `DoctorSystem`, the wall's doctor tile) **conflict with the "no patient or clinical field" rule** |
| ministry-justice | 27 | 0 | 26 | 0 | `justice-*`, `judicial-*` | case engine (`lib/casework/engine.ts`), courts (`lib/courts/`), laws register |
| treasury | 13 | 0 | 12 | 1 | `treasury-systems`, `fiscal-execution` | `/api/payments` (bills and receipts), `lib/tax/` (`/api/tax`, tax authority only), `lib/law/rules.ts` for rates |
| police-command | 22 | 0 | 18 | 1 | `interior-systems`, `field-operations` | case engine `procedure=police.incident` (`register-sources.ts:140`), `lib/police/` intake |
| ministry-transport | 13 | 0 | 11 | 0 | `transport-*` | permits (`lib/permits`), facilities, twin observations |
| ministry-energy | 12 | 0 | 10 | 0 | `energy-*` | facilities, twin observations (grid telemetry source), permits |
| ministry-environment | 11 | 0 | 10 | 0 | `environment-*`, `climate-resilience` | twin observations, facilities, permits |
| ministry-agriculture | 11 | 0 | 10 | 0 | `agriculture-*`, `food-security` | twin observations, organisations, permits |
| ministry-labour | 11 | 0 | 10 | 0 | `labor-systems`, `labour-extended` | organisations, case engine, twin |
| ministry-education | 10 | 0 | 9 | 0 | `education-systems` | `lib/education/` (`/api/education`: qualifications, inspections, aggregate returns), `schools` organisations register |
| foreign-affairs | 12 | 0 | 10 | 0 | `foreign-affairs*`, `geopolitical-continuity` | laws register (treaties), relationship register — no register for missions yet |
| emergency-response | 10 | 0 | 8 | 0 | `emergency-resilience` | incidents with recorded places (`lib/data/incident-places.ts`), transitions (emergencies) |
| communications | 9 | 0 | 7 | 0 | `communications-continuity` | twin observations — no register |
| ministry-trade | 8 | 0 | 7 | 0 | `trade-systems`, `industrial-continuity` | organisations, customs `customs.release` service |
| assembly / senate / presidency | 5 / 5 / 5 | 0 | 3 each | 0 | `assembly-engine`, `senate-engine`, `presidency-engine` | `lib/legislature/register.ts` (`/api/legislature`), offices register (`/api/offices`) |
| judicial-branch, judiciary | 5, 1 | 0 | 3, 1 | 0 | `judicial-branch-engine`, `judicial-engine` | `lib/courts/` (`/api/courts/cause-list`), judiciary-only |
| legislature | 2 | 0 | 2 | 0 | `legislative-engine`, `legislative-operations` | `/api/legislature` |
| immigration | 2 | 0 | 2 | 0 | `agency-systems.immigrationOps` | `lib/immigration/` (`/api/immigration`), cases `procedure=immigration.visa` |
| customs | 1 | 0 | 1 | 0 | `agency-systems.customsOps` | `lib/customs/` (`/api/customs`), cases `procedure=customs.declaration` |
| noc | 5 | 0 | 3 | 0 | `noc-engine` | ops overview (`/api/ops`), cron runs |
| citizen-wallet | 5 | 0 | 3 | 0 | `citizen-portal-engine` | `/wallet` (permits, payments) |
| officer-console | 1 | 0 | 1 | 0 | `citizen-systems` | `/console`, case engine |
| justice, sector | 1, 1 | 0 | 1, 1 | 0 | `justice-systems`, sector ops | as their ministry above |
| **Total** | **~285** | **5** | **~270** | **7** | | |

Defects specific to the apps:
- **Real records hidden as simulation (production).** The four real-record screens of the
  interior app, plus `apps/_shared/GeoMap.tsx` (facilities), render inside `SimulatedView`. In
  production they are folded under "not connected to this nation's records", although they
  read the nation's registers. They should move above the fold or into `RegisterRecords`.
- **AppHost chrome generates its own figures.** The chrome inside the fold is generated too:
  - `apps/AppHost.tsx:148` builds a stress value with `wave(...)`.
  - It derives an emergency-powers lifecycle from that stress (l.155-164). This is a made-up
    "Emergency powers · renewal-due" state; real emergencies live in `lib/transitions/`.
  - The Legislature quorum gate on Treasury comes from `legislativeState()` (l.172-179).
  - The "Advisory" panel (l.254) also comes from that stress.

### 4.2 Console (`/gov/*`, `/command`, `/ops`, `/audit`, `/control`, `/wall`, `/ministries/*`)

All of these pages show the same generated figures in production as in demo, except `/command`
and the CommandShell header.

| Route | Component | Panels | Real-record panels | Generated panels (tagged) | Unlabelled generated (see §1) | Production |
|---|---|---|---|---|---|---|
| `/command` | `app/(command)/command/page.tsx` | 11 | incidents (recorded), receipts (`/api/payments`), separation | 8 (tagged; hidden when `!gen.show`) | 0 | **Gated:** "Not connected" (`executive-posture.ts`) — the reference pattern |
| console header (all CommandShell pages) | `components/ui/CommandShell.tsx` | strip | posture with basis | tagged | 0 | Gated |
| `/gov` | `CabinetIntelligence.tsx` | 14 + 11 KPIs | ministry list | 14 Sample + 11 tagged KPIs | C2, C4 | shown, tagged Sample |
| `/gov/situation-room` | `SituationRoom.tsx` (+ `situation/Theatre.tsx` inside a Sample panel) | 16 + 10 KPIs | incident count | 16 + 10 | C3, C5, C6 | shown |
| `/gov/coordination` | `NationalCoordination.tsx` | 9 | — | 9 | C2, C3, C7, C8, C9 | shown |
| `/gov/security` | `NationalOverview.tsx` | 10 + KPIs | posture, incidents, population (twin) | 10 (always Sample) | 0 | shown, tagged |
| `/gov/regional` | `RegionalOverview.tsx` | 8 | population (twin) | 8 | C15 | shown |
| `/gov/fabric` | `NationalFabricView.tsx` | 7 | institution count | 7 (Modelled: §3) | C16 | shown |
| `/gov/simulation` | `NationalSimulation.tsx` | 9 | — | 9 (Modelled: §3) | C2, C17 | shown |
| `/gov/briefing` | `ExecutiveBriefingChamber.tsx` | 19 | — | 19 (Modelled: §3) | C18 | shown |
| `/gov/shell` | `NationalShell.tsx` | 24 | institution registry, deployability | 24 (Modelled default) | 0 | shown |
| `/gov/branch/[key]` | `BranchWorkspace.tsx` | 22 | separation checks | 21 | C2, C11, C12, C13 | shown |
| `/gov/branches` | `BranchesView.tsx` | 3 | 2 (authority chain, separation) | 1 | C14 | shown |
| `/gov/treasury`, `/gov/geopolitical` | `DomainCommand.tsx` | 8 + strip | — | 8 + strip tagged | C2, C10 | shown |
| `/gov/ministry/[id]`, `/ministries/[id]/operations` | `MinistryWorkspace.tsx` | 20 | `RegisterRecords` (l.523), queue (sample-marked l.269, 384), sites | ~3 (l.553, 599, 409) | C2, C19 (10 sections) | shown, seeded server data ungated |
| `/ministries/[id]/system/[group]` | `SubsystemConsole.tsx` | 81 + 44 KPI strips | audit chain | 81 Sample panels | C2 ×39, C20 ×44 | shown |
| `/ops` | `OpsCenter.tsx` | 10 | `/api/ops` services, queues, incidents | 1 (+ band) | C2, C21, C22 | shown; fallbacks shown as real |
| `/audit` | `AuditView.tsx` | 5 | 2 (chain, actions) | 3 | C23 | shown |
| `/control` | `app/(ministry)/control/page.tsx` | ~6 cards | `RegisterRecords` (l.91) | 2 (l.124, 136) | C24 | shown |
| `/wall` | `app/(nccc)/wall/page.tsx` | 7 | declared incidents | 3 (l.97, 129, 153) | C25, C26 | shown |
| `/health-ecosystem` | `HealthEcosystemWall.tsx` | 9 tiles | `GeoMap` facilities | 1 | C1 (whole page) | **shown, no notice** |
| `/ministries` | `MinistriesConsole.tsx` | list + card | ministry registry | 0 | C27 | shown |

**Console totals (approximate):**
- 290 panels or strips
- about 20 read real records
- about 205 generated and tagged (of which 59 are tagged Modelled although generated, §3)
- about 70 generated with no tag — 44 of them in `SubsystemConsole`. Add 52 `RuntimeQueue` mounts outside apps.

### 4.3 Public sites

| Route | Generated or hard-coded | Labelled | Production |
|---|---|---|---|
| `/treasury` | `publicTreasurySite(100)` (`lib/gov/treasury-systems.ts:231-261`) | `SampleChip` | shown, chipped |
| `/health` | `publicHealthSite(100)`, `SURVEILLANCE` literals l.40 | chip, **except the alert (P3)** | shown |
| `/health/laboratory` | `STATS` literals l.55-58 | chip l.212 | shown |
| `/education` | `educationPublicInstitutions` | chip l.47 | shown |
| `/government` | posture box l.126-136 | **none (P1, P2)** | shown |
| other sector sites | `siteProps()` records with `statisticsSource` / `newsSource` | compliant | — |

---

## 5. Counts by app (summary)

Counts are screen files for apps and panels for the console. Unlabelled-generated counts only
what no marker reaches, including the app-level wrapper.

| Group | Total | Real-record | Generated | Unlabelled generated |
|---|---|---|---|---|
| Agency apps (29 ids) | ~285 screens | 5 (4 interior + `GeoMap`) | ~270 | 0 by wrapper (only 7 have per-panel tags); A1–A3 mixed screens |
| Executive console (`/gov`, situation room, coordination, security, regional, fabric, simulation, briefing, shell) | 116 | ~8 | ~108 | ~16 strips + C3 digests (5) + 3 `RuntimeQueue` |
| Branch views (`/gov/branch`, `/gov/branches`) | 25 | 3 | 22 | 6 strips + 2 `RuntimeQueue` |
| Domain command (`/gov/treasury`, `/gov/geopolitical`) | 9 | 0 | 9 | 1 grid + 1 `RuntimeQueue` |
| Ministry workspace and control | 26 | 4 | 22 | 10 sections + 2 strips + 2 `RuntimeQueue` |
| Ministry subsystems (`/ministries/[id]/system/*`) | 125 | 1 | 124 | 44 KPI strips + 39 `RuntimeQueue` |
| Ops, audit, wall, ministries admin | 23 | 7 | 16 | 9 |
| `/health-ecosystem` | 9 tiles | 1 | 9 | 8 |
| `/command` + header | 12 | 4 | 8 | 0 (gated) |
| Public sites (generated blocks) | 12 | 0 | 12 | 3 (P1–P3) |

---

## 6. Observations for the baseline report

1. **Only `/app/<domain>`, `/command` and the console header change in production.** Every
   other console page above shows its generated figures in production (tagged Sample or
   Modelled, or untagged). The plan statement "labelled Sample in demo, 'Not connected' in
   production" (`docs/INSTITUTIONAL_ARCHITECTURE_PLAN.md:39-40`) holds for the agency apps only.
   - Extending the `executivePosture().generated` gate, or a `SimulatedView`-style fold keyed on
     `useInstallationMode()` (`lib/ops/mode-context`), to `Panel signal="sample"` would cover most of §1.2 in one place.
2. **The ministry operations store is seeded server-side without a production check.**
   - Affected functions in `lib/data/store/ministries.ts`: `ministryOperations`, `regionsFor`,
     `analyticsFor`, `fieldOpsFor`, `seriesFor`.
   - Queues and incidents, by contrast, check `samplesAllowed()`.
   - These APIs feed `/gov/ministry/[id]`, `/control` and `/ministries/[id]/operations` in production.
3. **`RuntimeQueue` presents generated work items as actionable work beside the real case engine.**
   - It runs on `lib/gov/runtime-store.ts` (browser session) with hard-coded assignee names.
   - It is the largest unmarked generated element: 52 mounts outside apps, 24 inside.
   - It should become a view over `/api/cases` (`lib/casework/engine.ts`), or carry a Simulation marker.
4. **Client-side "institution chain" stores carry citizen messages that go nowhere.**
   - The stores are `lib/gov/{encounter,dispatch,records,referral,enrollment}-store.ts`.
   - Citizen messages reach them from `app/(citizen)/wallet/receipt/[id]/SupportActions.tsx` and
     `components/ui/AgentRequest.tsx` (`encPost`).
   - Those messages stay in the browser.
5. **Health screens with patient and clinical data conflict with CLAUDE.md**
   ("no patient or clinical field anywhere"):
   - `apps/ministry-health/subsystems/PatientSystem.tsx`
   - `apps/ministry-health/subsystems/DoctorSystem.tsx`
   - the `/health-ecosystem` doctor tile
   - `SubsystemConsole` "Patient intake & triage" (l.238)

   They are simulated, but they show the fields.
6. **Engine-metric headline figures already read the twin when it answers** (`useTwinPrimed`,
   `lib/twin/engine-metrics.ts`, `AppHost.tsx:84`; `SubsystemConsole.tsx:61`). This is the
   intended migration path for engine figures into observations.

The scanners and intermediate lists used for the counts were working files of the audit session and are not kept in the repository.
