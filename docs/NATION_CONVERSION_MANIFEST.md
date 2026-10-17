# Nation Conversion Manifest

**What it takes to turn CivicOS from one nation's system into another's, and how an AI pipeline can do it on every new subscription.**

Measured 2026-10-17 on branch `claude/festive-meitner-ivhxsn`. All counts come from a scan of every tracked file (`app/scripts/nation-scan.mjs`) plus a module-by-module review of the maps, constitution engines, institution apps, public sites, seed data, database, backend and infrastructure. Re-run the scanner after any change; the numbers below will move with the code.

---

## 1. The answer in one table

| | Count |
|---|---|
| Files in the system | **2,130** (245,815 lines) |
| React components | **1,227** in 638 `.tsx` files |
| Exported modules (functions, constants, classes) | **2,756** |
| Pages · API routes · governance engines · institution apps | 134 · 90 · 96 · 36 |
| Database migrations · doctrine documents | 88 · 170 |
| Countries already mapped (outline + provinces, 8 languages) | **242** |
| **Files that carry nation-specific content** | **341 (16%)** — 256 code files + 85 documents |
| **Literal edit points found by the scanner** | **1,806** |
| Additional fixture values found by review (facilities, foreign partners, seat counts, ids) | ≈ **285** |

**It is not thousands of components.** Of 2,130 files, about **256 code files** must change to convert the system as it stands today, at roughly **2,100 edit points**. The other 1,874 files (88%), including all 494 map data files, all 90 API routes, the database schema and the infrastructure, are already nation-neutral.

Those edit points split by what triggers them:

| Kind | When it changes | Code edit points | Code files |
|---|---|---|---|
| **Replace** | For every new nation: places, regions, people, currency, payment rail, emergency numbers, time zone, map country, facilities | ≈ **1,150** (864 scanned + ≈285 reviewed) | ≈ 190 |
| **Shape** | Only when the new nation's form of state differs (kingdom, parliamentary, unicameral …): office titles, chambers, institution names | **347** | 112 |
| **Language** | Only when the official language differs: inline interface text | ≈ **560 files** of inline English to extract | 560 |
| Doctrine | Never edited per nation (see §6) | 0 | 0 |

**Recommended path (§7):** do a one-time refactor that moves all of the above into a single **Nation Pack** data file. After that, converting to a new nation is **one data file and zero code edits**, and an AI can produce that file reliably.

---

## 2. What is already nation-ready (no work per nation)

| Area | Why it is ready |
|---|---|
| **Maps** (494 files) | `lib/geo` holds real outlines for 242 countries and admin-1 provinces/districts for all of them, each named in 8 languages (en, fr, es, pt, ru, zh, ar, hi). `loadCountry(iso3)` loads any country. Uganda alone has 112 districts. |
| **Constitution topology** | `lib/gov/constitution.ts` derives branches, chambers, courts and the chain of authority from the **form of state** (republic, parliamentary, monarchy, federation, city-state, union). `branches.ts` derives quorum from it. `constitutional-governance.ts` (separation of powers, multi-key authorisation) is universal. |
| **Nation profile** | `SovereignProfile` (name, form, executive title, legislature, currency, region noun, locale, insignia, colour, motto, AI opt-in) is set in `/setup` and `/gov/configuration`, stored server-side and audited. |
| **Front door & branding** | Cover, seal, header, welcome and onboarding read the profile (`useNationBrand`); kingdom/emirate/government labels derive from the form of state. |
| **Institution registry** | 11 canonical ministries, 12 archetypes, activation/charter flows (`/api/org`) are generic. |
| **API routes** (90) | No national content. |
| **Database schema** (88 migrations) | 8 enums and 1 check constraint, all universal; `national_id` and `region` are free text. Seeded institutions are generic. |
| **Infrastructure** (15 files) | Terraform region, Helm host and registry are variables; four sizing profiles are universal. |
| **Doctrine** (170 documents) | Universal principles; country names appear only as comparisons and examples (§6). |

---

## 3. What is tied to one nation today, layer by layer

Scanner results (hits = literal occurrences; f = files):

| Layer | Files | With hits | Replace | Shape | Language |
|---|---|---|---|---|---|
| Map data (per-country geography) | 494 | 0 | 0 | 0 | 0 |
| Map logic & map components | 6 | 0 | 0 | 0 | 0 |
| Constitution & governance engines (`lib/gov`) | 96 | 53 | **340** (50f) | 60 (15f) | 0 |
| Sovereign identity, branding & onboarding | 18 | 3 | 8 (2f) | 9 (2f) | 0 |
| Institution registry & archetypes | 12 | 3 | 8 (1f) | 21 (3f) | 0 |
| Seed data & in-memory store (`store.ts`) | 1 | 1 | 29 | 20 | 0 |
| Institution applications (ministries, presidency, police …) | 394 | 91 | **297** (63f) | 64 (36f) | 1 |
| Pages & public websites | 152 | 39 | 54 (20f) | **100** (27f) | 1 |
| API routes | 90 | 7 | 7 (7f) | 0 | 0 |
| Shared UI & feature components | 122 | 18 | 73 (15f) | 20 (9f) | 0 |
| Platform libraries & services | 65 | 6 | 4 (3f) | 7 (2f) | 2 |
| Database (Supabase) | 90 | 1 | 0 | 10 (1f) | 0 |
| Backend service (civic-api) | 74 | 3 | 4 (3f) | 11 (1f) | 0 |
| Infrastructure | 15 | 0 | 0 | 0 | 0 |
| Static prototypes (`platform/`) | 13 | 9 | 20 (6f) | 7 (4f) | 1 |
| Tests & fixtures | 300 | 22 | 20 (10f) | 18 (11f) | 1 |
| Doctrine & documentation | 170 | 85 | 317 (31f) | 212 (66f) | 60 (12f) |

By signal (all files): place names 439 · institution names 275 · office titles 273 · country names 223 · province names 156 · money amounts & currency codes 143 · personal names 107 · language names 66 · payment rails 43 · region lists 39 · time zones 19 · legal references 11 · coordinates 6 · emergency numbers 5 · government domains 1.

### 3.1 The concrete findings

1. **A real nation is hardwired in two places.**
   - **Kenya** in the citizen wallet and demo data: Nairobi, "Kiambu County Hospital", "Plot 4423, Kiambu", KES amounts, M-Pesa, the citizen *Amina Hassan Mwangi*, officers *K. Otieno*, *L. Mwakio*, *W. Chebet*, *Dr. K. Mwangi*. The files are 8 wallet pages, `store.ts` (38 literals, incl. tenant `kiambu`, `lands.kiambu.go.ke`, Garissa, Tana Delta), `RuntimeQueue`, `MinistryWorkspace`, `OperatorShell`, `OpsCenter`, plus ≈41 tokens in the HTML prototypes.
   - **Uganda** as the map's home country: `apps/_shared/GeoMap.tsx:14` `SOVEREIGN_ISO = 'UGA'`. The nation profile has no `iso3` field, so the map country is not configurable.
2. **A fictional "reference nation" is copied into ≈40 engines.** Six synthetic regions (`'Capital District','Northern','Eastern','Western','Coastal','Highland'`) are declared locally in **37 `REGIONS` lists** (39 region-list declarations system-wide) with **323 quoted region tokens**, and "Capital District" alone appears **73 times**. Fixed populations, map positions and corridors (`gov/regions.ts`, `gov/health-geo.ts`) are never linked to the real admin-1 data. The heaviest files are industrial-continuity, justice-continuity, food-security, energy-grid, health-geo and knowledge-development.
3. **About 220 facility fixture lines.** Hospitals, courts, labs, universities, ports, corridors and industrial clusters, e.g. "Capital National Forensic Centre" and "National University of the Capital". The largest sources are sovereign-operating-model (52), health-operations (43), industrial-continuity (22), justice-continuity (20), foreign-affairs (20) and transport-network (18).
4. **Foreign affairs.** `gov/foreign-affairs.ts` has 10 partner nations and capitals, 10 treaties, 8 international bodies and 22 ambassador-name parts, all fictional.
5. **Money is hardcoded in dollars.** About 150 `$`/USD figures, led by `HealthFinanceSystem.tsx` (49), `StrategicDashboard`, `ExecutiveOverview`, `LocalCouncils` and `RegionalAdministration`. Bills in `store.ts` are KES while the profile says USD; they do not read `sovereign.currency`. The backend has `currency @default("KES")` in `civic-api/prisma/schema.prisma:213` and its init migration.
6. **The legislature's seat counts disagree.** `senate-engine.ts:73` fixes 84 seats and `assembly-engine.ts:69` fixes 420, while the constitution model says 68 / 350.
7. **The wording assumes a presidential, two-chamber republic.** "Office of the President", "Executive Mansion", "Senate", "National Assembly" and "Government of the Republic" appear 176 times in 42 files: the presidency app (53), the public websites (46), the senate (26) and assembly (16) apps. The institution seed rows `presidency/senate/assembly` and the charter registry make the same assumption. These do not read `executiveTitle` or `legislatureName`.
8. **Emergency numbers are inconsistent.** 112, 999 and 911 all appear (`(public)/emergency`, `(public)/police`, `police-workflows.ts`).
9. **Identifiers and time.**
   - The health record prefix "784" (`health-operations.ts`) matches UAE numbering.
   - "UTC+3"/EAT appears on the Command Center and in prototypes.
   - Cron jobs call a fixed deployment URL (8 jobs).
   - The language type is fixed to `en | sw | ar | fr | yo`.
10. **Language.** The shell has a language pack (`shellStrings`, en/fr/ar), but the public sites and ministry apps write English inline in about 560 files. A different official language therefore means extracting text, not changing a setting.

---

## 4. What a new nation must supply (the Nation Pack)

| Group | Fields | Source |
|---|---|---|
| **Identity** | official name, `iso3`, form of state, head-of-government title, head-of-state title, legislature name, region noun, motto, insignia, colour, platform label | Setup wizard (exists) + `iso3` (new) |
| **Constitution** | chambers (name, seats, role), court tiers and apex, chain of authority, branches and bodies, selection method, emergency doctrine, committees, bill stages; optionally articles, rights, amendment rule, term lengths | `ConstitutionModel` per nation instead of per form; articles need a new shape |
| **Geography** | admin-1 regions (names, codes) from `lib/geo/admin1/<ISO>.json`; per region population, capital flag, main sector, neighbours/corridors | Geo data exists; attributes are new |
| **Facilities** | national hospitals, courts, labs, universities, ports, corridors, industrial zones (≈220 entries) | National registries |
| **Economy** | currency (ISO 4217), money format, domestic payment rails (e.g. mobile money), reserve currencies | Central bank |
| **Contact & identity formats** | emergency numbers (police, fire, ambulance), phone country code and format, national ID format, health ID format, address format | Statute / regulators |
| **Locale** | official languages, default locale, time zone, date format, writing direction | Constitution / statute |
| **Foreign affairs** | partner nations, treaties, memberships (UN, AU, EU …), missions | Foreign ministry |
| **Deployment** | government domain, data-residency region, image registry, deployment URL for scheduled jobs | Operator |
| **Demo personas** (optional) | sample citizen and officers with local names, sample addresses | Generated |
| **AI assistant** | on/off (exists in setup) | Nation's choice |

---

## 5. Effort to convert, both ways

| | Path A — convert in place for each nation | Path B — Nation Pack (recommended) |
|---|---|---|
| One-time work | none | Refactor ≈190 code files so every finding reads from the pack (§7) |
| Per new nation | Rewrite ≈1,150 edit points in ≈190 files (+347 if the form of state differs, + text extraction if the language differs) | Produce **one Nation Pack** file + run setup |
| Code edits per nation | ≈1,150–1,500 | **0** |
| Risk | High: every deployment diverges into its own fork | Low: one codebase; nations differ only by data |
| Fit for AI automation | Possible but hard to verify | Natural: the AI fills a typed schema, a validator checks it |

The arithmetic: Path A costs the same ≈1,150+ edits **every time**; Path B costs that refactor **once**, then each nation is a data file.

---

## 6. Doctrine: universal, never converted

All 170 documents (the master blueprints, Volume II, docs 01–156) state principles that hold for any nation. The 589 matches in them are:
- comparisons (India Stack, Estonia's X-Road, GOV.UK in doc 60);
- regional examples (docs 08, 144, 145);
- illustrative journeys (docs 152, 155).

Per nation, **generate** a *National Deployment Profile* from the templates in docs 08 (Africa deployment profile), 144 (Africa-first playbook) and 145 (regional playbooks). Do not edit the doctrine.

---

## 7. The one-time refactor (Path B), in order

| Step | Change | Files |
|---|---|---|
| 1 | Add `iso3`, `headOfStateTitle`, `timeZone`, `emergency`, `phone`, `idFormats`, `paymentRails`, `languages` to `SovereignProfile`; make `GeoMap` read `iso3` | ≈5 |
| 2 | **Region registry**: build regions from `admin1/<ISO>.json` + a pack attribute table; replace the 39 local region lists | ≈45 |
| 3 | **Facility registry**: move ≈220 fixture lines into the pack; engines read by role (apex court, national lab …) | ≈15 |
| 4 | **Money**: one `formatMoney()` that reads the profile currency; replace ≈150 `$`/USD figures, the KES defaults and M-Pesa | ≈25 |
| 5 | **Constitution per nation**: `constitutionFor(profile)` reads the pack's constitution (falling back to the form template); senate and assembly seats come from it | ≈6 |
| 6 | **Offices & wording**: presidency, senate, assembly apps and public sites read executive, head-of-state and chamber names from the constitution | ≈42 |
| 7 | **Demo data**: move the Kenyan wallet, store seeds and prototypes into a replaceable demo persona set | ≈20 |
| 8 | **Foreign affairs** from the pack | 1 |
| 9 | **Deployment**: cron URL, domain and residency from environment | ≈4 |
| 10 | **Language**: extract inline text into locale files, starting with the citizen wallet and public sites | ≈560, can be phased |

Steps 1–9 cover ≈165 files and make every *replace* and *shape* finding data-driven. Step 10 is only needed for nations whose official language is not English and can follow progressively.

**Done when:** `node app/scripts/nation-scan.mjs` reports **0 replace hits outside the Nation Pack** and the demo persona set, and all tests pass.

---

### Progress

| Step | Status | Result |
|---|---|---|
| Foundation | **Done** | `app/src/lib/nation/registry.ts`: the nation registry (country code, regions, currency) filled from the sovereign profile on the server (store) and in the browser (`<NationRegistry>` in the root layout, which is now rendered per request). `regionList()` and `formatMoney()` helpers, with tests. |
| 1 · Map country | **Done** | `SovereignProfile.iso3` (validated) chosen in setup from the 242 mapped countries; `GeoMap` reads it (Uganda only as the fallback). |
| 2 · Regions | **Done for the 36 engine lists** | Every engine region list (35 in `lib/gov`, plus `store.ts`) follows `SovereignProfile.regions`, set in setup from the country's admin-1 units or the nation's own grouping. The Kenyan seed regions are gone. Region lists found by the scanner: 39 → 5 (the rest are world regions, not national). Inline placeholder regions inside some dashboards (e.g. Regional Administration's provinces) remain. |
| 4 · Money | **Done for 99 amounts in 8 files** | Health finance, local councils, strategic and executive dashboards, regional administration, legislature and health apps now render in the nation's currency (`UGX 12.48B` for Uganda). Reserve and gold figures stay in USD by design. Money hits: 143 → 45. |

| 5 · Constitution | **Done** | `SovereignProfile.constitution` (head of state, executive seat, one or two chambers with seats, apex court, emergency doctrine, source) laid over the form template by `constitutionFor(form, nation)`; setup has a Constitution panel. Senate/assembly engines size from it and their blocs now sum exactly (they did not before). |
| 6 · Offices & wording | **Done for the public sites and branch apps** | `lib/nation/offices.ts` derives head of state/government, executive office and seat, chambers and apex court. The Government directory, Presidency, Senate and Assembly public sites, branch app names and the Branches pages use them; a unicameral nation lists no upper chamber. Reference wording is unchanged until setup. Deeper in-app copy (e.g. presidency/senate domain screens) remains. |

| 7 · Demo data | **Done** | No Kenya-specific content remains in runtime code or prototypes. Sample records are seeded with reference places, USD and a neutral rail, and `localizeSeed()` rewrites them to the nation's first regions, currency and payment rail on every profile change. `SovereignProfile.paymentRail` (setup field) replaces M-Pesa everywhere (wallet, payments API default, ops health). A multicultural demo persona (`lib/nation/persona.ts`) replaces Kenyan names; wallet amounts use the nation's currency. The backend drops its `KES` bill-currency default (new migration `0007_nation_neutral_currency`). |

| 8 · Foreign affairs | **Done** | `SovereignProfile.foreignAffairs` (partners with capitals, international memberships; setup panel) replaces the fictional partners and organisations in the foreign-affairs engine; reference sets remain until declared. |
| Inline regions | **Done** | 103 inline placeholder region names in 28 dashboards/engines ("North Province", "Capital District" …) and the health-geo schematic follow the nation via `regionName(slot, reference)`; slots map by direction so capital/region comparisons stay consistent. |
| 3 · Facilities | **Assessed — no conversion needed now** | On inspection the ≈220 "fixture lines" are mostly generic programme and process names ("Hospital stabilization programme", "Birth → health identity") and generic institutions ("National Cardiac Center"); none names a real country. Region-bearing ones follow the nation via the inline-region step. A per-nation facility registry (real hospital/court names by role) remains an optional enhancement. |
| 9 · Deployment, time & emergency | **Done** | `SovereignProfile.timeZone` (IANA, validated) drives 11 dashboard clocks and labels (were "GMT+1"/"UTC+3"); `emergency` (general/police) drives the public Police and Emergency sites (were inconsistent 999/112/911) and the police workflow step is now "Emergency call received". The 11 scheduled jobs read the deployment URL from Vault (`civicos_base_url`), falling back to the reference deployment. |

After these steps: **replace** hits 1,181 → **881** in 212 → **186** files (317 of the remaining 881 are in the doctrine documents, which are not converted). The remaining place hits are mostly neutral reference names ("Capital District", "Eastern") that the nation's regions override, not another country's data.

## 8. Instructions for the AI converter (after Path B)

Run these as fixed, ordered commands on every new subscription. Each step has a checkable output.

1. **Research** — "Produce a Nation Pack for `<country>` that conforms to `NationPack` schema. Cite an official source for each constitutional and legal field. Leave a field empty and flag it if no source is found; never invent constitutional facts."
2. **Geography** — "Load `app/src/lib/geo/admin1/<ISO3>.json`. List the admin-1 units. Flag any that are out of date against the country's current official subdivisions (e.g. counties replacing provinces), and supply corrected names and codes."
3. **Constitution** — "From the constitution of `<country>`, fill `constitution`: chambers and seats, court hierarchy, chain of authority, branches and bodies, emergency provisions, amendment rule. Quote the article for each value."
4. **Validate** — `npm run nation:validate <pack>` (to be built with the refactor; it does not exist yet) checks the schema, ISO codes, region codes against the geo data and seat totals, and lists unsourced fields.
5. **Human review** — An authorised officer of the subscribing nation approves the constitutional and legal fields. The approval is written to the audit chain.
6. **Apply** — Load the pack through `/setup`, which already saves the profile and institutions and records the audit entry.
7. **Verify** — `node app/scripts/nation-scan.mjs` shows no foreign-nation literals; tests pass; the front door shows the nation's name, motto and platform label.

Until the refactor is done (Path A), use the scanner's JSON as the work list: `node app/scripts/nation-scan.mjs --json scan.json` lists every file, each hit with its kind (`replace`/`shape`/`language`) and sample literals. Then instruct: *"For every file in scan.json with kind=replace, replace the listed literals with values from the Nation Pack; do not change logic; re-run the scan until replace=0."*

---

## 9. Highest-impact files (code, by edit points)

| Replace | Shape | File |
|---|---|---|
| 49 | 0 | `app/src/apps/ministry-health/subsystems/HealthFinanceSystem.tsx` |
| 35 | 2 | `app/src/lib/gov/health-operations.ts` |
| 34 | 0 | `app/src/apps/ministry-interior/domains/RegionalAdministration.tsx` |
| 33 | 30 | `app/src/lib/gov/constitution.ts` |
| 29 | 20 | `app/src/lib/data/store.ts` |
| 18 | 5 | `app/src/components/features/StrategicDashboard.tsx` |
| 18 | 0 | `app/src/apps/police-command/InvestigationsCommand.tsx` |
| 17 | 0 | `app/src/lib/gov/justice-continuity.ts` |
| 17 | 0 | `app/src/lib/gov/health-systems.ts` |
| 16 | 0 | `app/src/lib/gov/industrial-continuity.ts` |
| 15 | 0 | `app/src/apps/legislature/LocalCouncils.tsx` |
| 12 | 0 | `app/src/apps/ministry-interior/domains/CivilRegistryCommand.tsx` |
| 12 | 0 | `app/src/apps/immigration/ImmigrationCommand.tsx` |
| 11 | 1 | `app/src/lib/gov/justice-records-forensics.ts` |
| 11 | 0 | `app/src/lib/gov/food-security.ts` |
| 10 | 1 | `app/src/lib/gov/procedural-execution.ts` |
| 10 | 1 | `app/src/lib/gov/judicial-branch-engine.ts` |
| 10 | 0 | `app/src/lib/gov/transport-extended.ts` |
| 10 | 0 | `app/src/lib/gov/simulation.ts` |
| 10 | 0 | `app/src/apps/police-command/IntelligenceCommand.tsx` |
| 9 | 6 | `app/src/components/features/ExecutiveOverview.tsx` |
| 9 | 2 | `app/src/components/features/NationalOverview.tsx` |
| 9 | 1 | `app/src/lib/gov/health-geo.ts` |
| 9 | 1 | `app/src/components/features/SituationRoom.tsx` |
| 9 | 1 | `app/src/app/(citizen)/wallet/records/page.tsx` |

The full per-file list (all 341 files, with sample literals) is produced by `node app/scripts/nation-scan.mjs --json scan.json`.

---

## 10. Method and limits

- **Scanner:** 16 detectors over every tracked file: country names (dictionary of the system's 242 countries), distinctive province names (from the admin-1 data), place-name phrases, region lists, personal names, currency codes and money amounts, payment rails, emergency numbers, phone formats, government domains, time zones, coordinates, office titles, institution names, legal references and language names. Font stacks and replacement tokens are excluded.
- **Review:** four module-by-module reviews of (a) maps and constitution engines, (b) institution apps, public sites and components, (c) seed data, database, backend and infrastructure, (d) doctrine. These added what a pattern scan cannot see: fictional facility fixtures, foreign-affairs data, seat constants, the Uganda map default and the KES schema default.
- **Limits:**
  - The scanner counts literal occurrences, not distinct facts; one region list counts once as a list and again for each region name it contains.
  - Generic phrases such as "Ministry of Health" are counted as *shape*, though for most nations they stay as they are.
  - Counts are a snapshot; re-run the scanner for current numbers.
