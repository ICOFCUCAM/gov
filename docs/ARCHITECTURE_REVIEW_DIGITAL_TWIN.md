# Architecture review: CivicOS as a sovereign national platform and digital twin

Reviewed: 19 Oct 2026, against the repository as it stands (Next.js 14 app in
`app/`, Supabase substrate in `app/supabase/`, NestJS service in
`services/civic-api/`, deployment in `infra/`). Read-only review: no
application code was changed.

Reference practice used throughout: Singapore (Virtual Singapore, GovTech
SGTS), Estonia (X-Road, once-only), UK National Digital Twin programme
(Gemini Principles, Information Management Framework), EU Destination Earth /
Digital Twin of the Ocean, Gaia-X / IDSA data spaces, OGC (API Features,
SensorThings, CityGML / CityJSON), ISO 19650, ISO 23247, ETSI NGSI-LD and
FIWARE Smart Data Models, W3C DCAT and PROV, SDMX, MOSIP, GovStack building
blocks, NIST SP 800-207 (zero trust), ISO 27001, SLSA.

All recommendations respect the preservation doctrine in `CLAUDE.md`: each
one upgrades an existing module in place, keeps every route, export, data
source and action, and names the register entry to update.

---

## 0. Summary

CivicOS gets the hardest *governance* ideas of a national twin right, and
earlier than most real programmes did: every figure says where it comes
from, facts are bitemporal, imports refuse rows with reasons, boundaries and
facilities are versioned and four-eyes, scenarios carry evidence hashes, and
nothing outside the platform is fetched except through a guarded path. The
domain modelling is careful and the test discipline is strong (367 test
files, route lock, OpenAPI drift test, accessibility gate).

The *engineering foundation* underneath is a prototype one. All platform
state lives in process memory (`globalThis.__civicos*`, 30 stores) and is
re-serialised whole every five seconds into JSON blobs. One process may own
it, yet the Helm chart runs 2 to 12 replicas. The twin's semantics stop at
"entity · metric · number · free-text unit". There is no catalogue,
provenance export, metric vocabulary, sensor API or signed exchange layer.
The access gate has three bypasses that matter in production: any
`Authorization` header skips the mutation gate, any `civicos_session` cookie
(set to `demo` by the cover page) opens every read, and the pinned Next.js
14.2.5 is exposed to the published middleware-bypass CVE-2025-29927.

**Scorecard** (against national-platform practice; 1 = absent, 5 = reference grade)

| Area | Score | One line |
|---|---|---|
| Provenance and honesty of figures | 4 | Signal kinds, run lineage and as-of queries are ahead of most programmes; no PROV/DCAT export yet |
| Twin entity model and semantics | 2 | Stable ids and a crosswalk, but free-text metrics and units, no aggregation rules, no URIs or ontology |
| Bitemporality | 3 | Valid time and record time kept and queried; no `validTo`, no corrections, and old history is silently evicted |
| Persistence and scale | 1.5 | In-memory with JSON snapshot; single writer; whole-store re-encode every 5 s; deployment runs several writers |
| Interoperability | 2.5 | OGC API Features Core for 3 collections, hashed feed keys, OpenAPI; no SensorThings, no signed exchange, no catalogue |
| Geospatial governance | 4 | Boundary versions, ISO 3166-2 matching, licence rules and facility certification are strong; WGS 84 only, SVG only |
| Security and zero trust | 2 | Good primitives (HMAC sessions, scrypt, TOTP with replay guard, SSRF guard); gate bypasses, fail-open defaults, keys kept in the data |
| Audit integrity | 3 | Canonical SHA-256 chain; the platform chain is unsigned and not anchored, and sits in the same writable blob as the data |
| Simulation and AI governance | 2 | Reproducible percentage scenarios; no model registry or uncertainty; the AI call is not audited and does not go through the egress policy |
| Operations | 2 | Health probe, cron watchdogs; no structured logs, metrics or tracing, and the deployment config drifts from the app |
| Code quality | 3 | Clear modules and naming, strict TS; `store.ts` (2,219 lines) and engines of 1.5–2.5k lines, no lint configuration, 84 `as never` casts |

---

## 1. What is done well (keep, and build on)

1. **Every figure carries its kind and source.** `lib/twin/signal.ts:14-43`
   (observed, reported, modelled, sample, unavailable) with `needsMarker()`
   and `SignalTag`. This is the UK Gemini Principles' "truth / quality /
   openness" made into a type. Few national twins enforce it in the UI.
2. **Bitemporal observations with as-of queries.** `lib/twin/register.ts:84-95`
   keeps `validFrom` and `recordedAt`, and `stateAsOf({asOf, knownAt})`
   (`:324-338`) answers both "as known now" and the strict "as known then".
   Most programmes add this late and at great cost.
3. **Ingestion that refuses rather than guesses.** `runSource()`
   (`register.ts:258-308`) resolves entities by crosswalk, then ISO code, then
   an unambiguous name. It refuses rows with reasons, records every run as
   lineage and audits it. The once-only and data-quality spirit of X-Road
   registries is here.
4. **A crosswalk of identifiers** (`keys`, `linkKey()` `:196-205`) with clash
   detection. It is the start of a master-data hub.
5. **National completeness rule.** `nationalTotal()` (`:353-366`) shows a
   national figure only when every region reports. This is correct
   statistical practice.
6. **Boundary governance at SDI grade** (`lib/data/boundaries.ts`): WGS 84
   check, ring closure and winding, ISO 3166-2 matching, coverage and overlap
   checks, a refusal of GADM-derived data on licence grounds, a SHA-256 of the
   file and of the units, four-eyes publication, and versions in force by
   date with a `knownBy` strict view (`:362-366`). This matches INSPIRE
   Administrative Units practice in spirit.
7. **The facility register** (`lib/data/facilities.ts`) records capture
   method, accuracy, certification stages, sensitivity with a legal basis and
   authority, generalisation for restricted sites, versions, duplicate
   detection and machine feeds with hashed keys compared in constant time
   (`:735-749`). This is stronger than many national master facility lists
   (MFL).
8. **OGC API – Features Core / GeoJSON** for subdivisions, boundaries and
   facilities (`lib/twin/ogc*.ts`), with paging links and CRS84 declared.
   Samples and scenarios are never published there.
9. **Scenarios are reproducible.** Inputs are kept with source and run, and
   a canonical SHA-256 evidence hash is verified on read
   (`lib/twin/scenarios.ts:93-104`). Directives cite version and hash.
10. **Security primitives are sound.** HMAC-SHA-256 session tokens that work
    on Edge and Node (`lib/auth/session-token.ts`). Accounts are re-checked
    live on every change (`middleware.ts:57-87`, `official.ts:20-31`).
    Passwords are hashed with scrypt and sign-in is rate-limited. TOTP has
    replay protection (`totp.ts:56-67`). One rule set decides permissions
    (`roles.ts`). SSRF-guarded outbound fetch (`lib/net/safe-fetch.ts`).
11. **Data sovereignty by default.** `transmit()` in `lib/data/sovereignty.ts`
    sends nothing unless an official enables it. The Update Center has SLSA
    provenance, escrow, CSAF/VEX advisories and an air-gapped mirror, and
    there is a file persistence adapter for air-gapped nations.
12. **Engineering guard-rails.** Route lock, generated OpenAPI with a drift
    test, `scan:nation`, `scan:colours`, the WCAG/budget gate, and the
    integration register as a living list of placeholders.

---

## 2. Findings by area

Severity: **Critical** (exploitable or data-losing in a real deployment),
**High** (blocks national scale or standards conformance), **Medium**,
**Low**.

### 2.1 Data architecture

| # | Finding | Evidence | Practice / reference | Sev. |
|---|---|---|---|---|
| D1 | **Single-writer in-memory state, deployed multi-writer.** `persist.ts:19-21` says one server owns the state. Helm runs `app.replicas: 2` (`infra/helm/civicos/values.yaml:27`), and the profiles run up to 6. Each replica seeds its own counters (`FAC-00001`, `SRC-1`, `RUN-1`) and overwrites the others' snapshot per key (`platform_state_put` is a blind upsert, migration `20261017000000_civicos_platform_state.sql`). | `persist.ts`, Helm values and profiles | Any national registry: a transactional store with a single source of truth (X-Road member registries, Singapore's SGTS data layer) | Critical |
| D2 | **Whole-store re-encode every 5 s.** `flush()` calls `encode(g[key])` for every live store on every tick to detect change (`persist.ts:126-138`). The twin allows 200k observations (`register.ts:111`), plus the audit chain and facilities. That is tens of MB of JSON serialised every 5 s on the request thread. A crash loses up to 5 s, and there is no cross-store atomicity: an audit entry and the change it records are saved under different keys at different moments. | `persist.ts:126-171` | Write-ahead log or DB transaction per change; outbox pattern | High |
| D3 | **History silently evicted.** When observations exceed 200k, the oldest are `splice`d away (`register.ts:298`), and runs are capped at 500 (`:305`). This breaks the bitemporal promise ("what was known then"), breaks lineage for older scenarios, and is not audited. A nation with 47 counties × 100 metrics × 10 years of monthly data (564k) passes the cap. | `register.ts:111, 297-305` | UK IMF / ISO 19650: information is retained under a retention policy, never dropped by a capacity limit | High |
| D4 | **No metric vocabulary or units.** A metric is any `[a-z0-9_.]` string. Units are free text of up to 24 characters (`:291`). `nationalTotal()` sums values across regions and labels the result with the first region's unit (`:362`) without checking that units match or that the metric is additive. Rates, CPI and percentages would be summed. | `register.ts:112, 291, 353-366` | SDMX data structure definitions (concepts, units, attributes); UCUM / QUDT units; Smart Data Models attributes | High |
| D5 | **No corrections or retractions.** A wrong import cannot be withdrawn. Case import can (`case-import.ts:191`); the twin cannot. There is no `validTo`, no period semantics (an annual figure versus a point reading) and no supersession marker. | `register.ts` (no withdraw path) | Bitemporal tables (SQL:2011 system- and application-time); statistical revision practice (vintages) | High |
| D6 | **Identifiers are local, not resolvable.** Ids are `place:KE-30`, `facility:FAC-00012` and `SRC-3`. They are not URIs, carry no nation namespace and are built from per-process counters. The data dictionary (`docs/07_DATA_DICTIONARY_AND_INTEROP.md` §1) specifies an opaque FacilityID and UUID v7 EventIDs that are not implemented. `uid()` uses `Math.random` with 6 characters (`store.ts:103-105`), which reaches a collision at around 47k ids. | `register.ts:130-147`, `facilities.ts:423`, `store.ts:103` | UK NDT / Linked Data persistent URIs; NGSI-LD `urn:ngsi-ld:<Type>:<id>`; GovStack registries | Medium |
| D7 | **No ontology, catalogue or provenance export.** No DCAT (catalogue of sources, boundary versions and collections), no PROV-O (runs, scenario derivations), no JSON-LD `@context`, no NGSI-LD or Smart Data Models mapping. A repository-wide search for `dcat`, `ngsi`, `@context`, `sensorthings` or `cityjson` finds nothing in code. | Repository search | DCAT-AP for data portals; W3C PROV for lineage; FIWARE / NGSI-LD for context; IMF's foundation data model | High |
| D8 | **Several sources of truth.** The same business objects exist in three places: (a) the `globalThis` stores, (b) the Supabase substrate (≈90 migrations with RLS, witnesses and webhooks), and (c) `services/civic-api` (NestJS + Prisma, 682-line schema). Nothing in the app calls (c). Directives already switch between (a) and (b) (`lib/db/repos/memory.ts`). | `services/civic-api`, `app/supabase/migrations`, `lib/data/*` | One authoritative store per register (Estonia's "one owner per data item") | High |
| D9 | **The audit chain shares the domain blob.** The chain is an unbounded array inside `__civicos` (`store.ts:280-296`), persisted with the data it attests. Anyone who can write the state file or row can rewrite both and recompute the hashes, because the chain is not signed and its head is not anchored outside the platform. The substrate chain does have witnesses and anchoring (`api/cron/audit-anchor`, migration `…_audit_witnesses`); the platform chain does not. | `store.ts:113-116, 280-310, 398-417` | Certificate Transparency / RFC 6962-style signed tree heads; RFC 3161 time-stamping; X-Road's signed message logs | High |

### 2.2 Interoperability

| # | Finding | Evidence | Practice / reference | Sev. |
|---|---|---|---|---|
| I1 | **OGC API Features is Core only, and partly inconsistent.** Subdivisions read the bundled admin-1 shapes through `loadCountry()` (`ogc.ts:221-224`), around `loadNationGeography()`, which `CLAUDE.md` requires for new map code. The boundaries collection filters `bbox` by each unit's centre, not its geometry (`ogc-boundaries.ts:55`). `datetime` is used as an as-of selector, not the OGC temporal filter; that is valid as an extension but undocumented. There is no `/queryables` or CQL2 (Part 3), no CRS Part 2 and no `prev` link on two collections. | `lib/twin/ogc*.ts` | OGC API – Features Parts 1–3; OGC CITE test suite | Medium |
| I2 | **GIS clients cannot authenticate.** OGC endpoints sit behind the cookie session. QGIS, ArcGIS and GDAL send API keys or OAuth2 bearer tokens, not cookies. | `middleware.ts:117-125` | OGC API Common security; OAuth2 client credentials | Medium |
| I3 | **No sensor API.** Telemetry streams live in the substrate (`…_telemetry_*` migrations) and are not a twin source (register 16.3). There is no SensorThings (Things, Datastreams, Observations), so infrastructure and IoT twins have no standard entry point. | register 16.3 | OGC SensorThings API (Virtual Singapore, DTO); NGSI-LD temporal API | High (for infrastructure twins) |
| I4 | **No signed, logged exchange between institutions.** Federation grants and integration clients are state machines in memory (`store.ts:713-840`). Integration API keys come from `Math.random` and are never stored, so they cannot be verified (`store.ts:732`). Case and facility feeds use bearer keys (hashed: good), but requests are not signed, there is no mutual TLS, and there is no exchange log on both sides. The blueprint's CivicBus ("X-Road-style, mTLS, non-repudiation", `CIVICOS_MASTER_BLUEPRINT.md` §8.2, §26) has no implementation. | `store.ts:722-750`, `case-import.ts:270`, `facilities.ts:735` | X-Road security servers (signed and timestamped message logs); IDSA connectors with usage policies; HTTP Message Signatures (RFC 9421) | High |
| I5 | **OpenAPI is paths only.** Request and response bodies are untyped (register 16.8), and there are no security schemes. Consumers cannot generate clients. | `scripts/openapi-lib.mjs`, `lib/api/openapi.json` | GovStack API specs, typed OpenAPI 3.1 | Medium |
| I6 | **Statistics ingestion is CSV only.** No SDMX-CSV or SDMX-JSON reader (register 16.2) and no DCAT harvesting of the statistics office's catalogue. | `register.ts:61` | SDMX 2.1/3.0 (NSOs, IMF, World Bank) | Medium |
| I7 | **Webhooks and events are not standard.** Substrate webhooks are HMAC-signed (good) but not CloudEvents. There is no event backbone, although the blueprint names Kafka, NATS and CloudEvents. | `…_event_webhooks.sql`, blueprint §§26, 63 | CloudEvents 1.0; AsyncAPI | Low |

### 2.3 Geospatial

| # | Finding | Evidence | Practice / reference | Sev. |
|---|---|---|---|---|
| G1 | **WGS 84 only.** Projected or national CRS files are refused (`boundaries.ts:7`), and the national grid is recorded only as text (`facilities.ts:156`, "converted by the mapping agency"). Mapping agencies publish in national grids (Arc 1960 / UTM, OSGB36, ETRS89-LAEA), and refusing them pushes the conversion onto ministries. | `boundaries.ts`, `projection.ts:7` | INSPIRE / national SDIs accept ETRS89 or a national CRS with declared transformations | Medium |
| G2 | **Topology checks are partial.** Overlap is tested by point-in-polygon of centres (`boundaries.ts:270-278`). There is no self-intersection, gap or sliver detection and no check of nesting between levels beyond the centre. | `boundaries.ts:270-278` | OGC Simple Features validity; INSPIRE topology rules | Medium |
| G3 | **No spatial index.** Every duplicate check scans every facility (`facilities.ts:373-379`), so bulk loads are O(n²) with `geoContains` per point. 20k schools or 100k water points will stall. | `facilities.ts:363-380, 625-670` | R-tree / geohash / H3 index; PostGIS GiST | High (at national scale) |
| G4 | **SVG rendering, no tiles.** d3-geo SVG; the plan targets canvas above ~2,000 features (`MAP_SYSTEM_PLAN.md:74-75`). There are no vector tiles, so a national facility layer (10⁵ points) or a parcel layer (10⁶–10⁷) cannot be drawn. Bundled geometry is 23 MB under `lib/geo`. | `components/map/*`, `lib/geo` | Self-hosted vector tiles (MVT / PMTiles), WebGL renderers | High (for scale) |
| G5 | **No 3D or footprints.** Facilities are points only. There is no footprint, height, level of detail or link to a building model. | `facilities.ts:91-139` | CityJSON / CityGML 3.0 LoD1–2 (Virtual Singapore), ISO 19650 asset information models | Low now, High for city twins |
| G6 | **Facility categories are home-grown.** There is a scheme per category (`FacilityCategory.scheme`), but no mapping to INSPIRE themes (US, PF), HXL or OSM tags, or Smart Data Models (`PointOfInterest`, `Building`). | `facilities.ts:52-60` | INSPIRE Annex III; HDX HXL | Low |

### 2.4 Sovereignty and security

| # | Finding | Evidence | Practice / reference | Sev. |
|---|---|---|---|---|
| S1 | **Any `Authorization` header bypasses the mutation gate.** `officialGate()` returns success when a header is present (`middleware.ts:42`), and `roleGate` is skipped the same way (`:91`). Routes that do not check the header themselves become open with `Authorization: x` even under `CIVICOS_AUTH=enforce`. Examples: `POST /api/twin/scenarios` (takes `by` from the body, no `withOfficial`), `POST /api/platform/backups/[id]/restore`, `/api/platform/config/[id]/apply`, `/api/federation/propose`, `/api/integrations`, `/api/webhooks`. Of 128 mutating route files, 29 show no official, refusal or key check. `middleware.test.ts` has no test for the header. | `middleware.ts:41-46, 89-96`; route list in §2.4 note | NIST 800-207: authenticate and authorise every request at the resource | **Critical** |
| S2 | **Reads open on an unsigned cookie.** Any `civicos_session` value passes for pages and GET APIs (`middleware.ts:117-119`), and the cover page sets `civicos_session=demo` in the browser (`components/features/cover/entry.ts:34`). Twin state, audit, scenarios, federation and ministries can then be read by anyone who clicks through the cover. | `middleware.ts:117-119`, `entry.ts:34`, `login/SignInButton.tsx:11` | Zero trust: verified identity for every read of non-public data | **Critical** |
| S3 | **Next.js 14.2.5 is affected by CVE-2025-29927** (middleware bypass via the `x-middleware-subrequest` header, fixed in 14.2.25), plus later 14.x advisories. All access control in this app is in middleware. CI has no dependency or SCA scan. | `app/package.json` (`"next": "14.2.5"`), `.github/workflows/ci.yml` | Patch SLAs (the platform's own `PATCH_COMMITMENTS`); OSV / `pnpm audit` in CI | **Critical** |
| S4 | **Fail-open defaults.** A session without a role is treated as administrator (`roles.ts:34`). `apiPermission()` allows every mutating path not listed (`roles.ts:54-65`), and `ADMIN_ONLY` (`:41-48`) omits `/api/platform/*` (backups, config, deployments, lifecycle), `/api/federation/*`, `/api/integrations` and `/api/webhooks`. `listFacilities()` defaults the viewer to `{signedIn: true}` (`facilities.ts:550`), so a caller that forgets the viewer sees exact restricted positions. | `roles.ts`, `facilities.ts:550` | Deny by default (ISO 27001 A.5.15 / A.8.3) | High |
| S5 | **Keys kept with the data.** Without the environment variable, the session HMAC key is generated and stored in the same state snapshot (`officials.ts:69-73`). TOTP secrets are stored in plaintext in that snapshot (`officials.ts:28-30`). Whoever reads the state file or row can mint sessions and codes. Each scrypt hash uses N=2¹⁴ synchronously on the request thread. | `lib/auth/officials.ts:49-73` | KMS/HSM-held keys, envelope encryption (KEK outside the data); OWASP scrypt N≥2¹⁷ | High |
| S6 | **Weak randomness and hashes in places.** Integration keys and `uid()` use `Math.random` (`store.ts:103, 732`). Config `contentHash` uses a 32-bit string hash (`store.ts:118-122, 1080`). The cron secret is compared with `===` and accepted in the query string, where it ends up in logs (`lib/platform-auth.ts:20-27`). | as cited | CSPRNG for secrets; SHA-256 for content addresses; constant-time compare; no secrets in URLs | Medium |
| S7 | **DNS rebinding window in `safeFetchText`.** The host is resolved and checked (`safe-fetch.ts:34`), then `fetch` resolves it again (`:36`). Also, twin CSVs are capped at the 5 MB default although `runSource` checks for 20 MB (`register.ts:271-273`). | `safe-fetch.ts:33-37` | Pin the checked address in the connection (custom lookup or dispatcher) | Medium |
| S8 | **Missing headers.** No CSP or HSTS anywhere. `vercel.json` and `next.config.mjs` define different header sets (the Permissions-Policy is only in the latter). | `next.config.mjs:10-40`, `vercel.json` | OWASP secure headers | Medium |
| S9 | **No API rate limiting** apart from sign-in and subscriptions. `rateLimitRpm: 120` on integrations is stored but not enforced. | search for `rateLimit` | GovStack API gateway building block | Medium |
| S10 | **The AI call leaves the nation outside the egress policy.** `/api/ai/advisory` sends institution data to an external API without `transmit()`, does not audit the call (no model, prompt or response hash), does not validate the body (free-text `label` goes into the prompt), and hard-codes the model (`route.ts:69`). It also cannot tell the model that the figures are samples. | `app/api/ai/advisory/route.ts` | EU AI Act logging (Art. 12); the nation's own doctrine (`docs/138_…`, `10_AI_MATURITY_AND_SAFETY.md`) | High |

### 2.5 Simulation and decision support

| # | Finding | Evidence | Practice / reference | Sev. |
|---|---|---|---|---|
| M1 | **Attribution can be forged.** Scenario routes do not use `withOfficial()`, so `by` comes from the body (`api/twin/scenarios/route.ts`, `[id]/route.ts`). This breaks the "Who acted" rule, and directives cite these versions. | as cited | `CLAUDE.md` "Who acted" | High |
| M2 | **One model only: a multiplicative percentage.** There is no model registry (id, version, code commit), no uncertainty or intervals, no calibration against later observations, no sensitivity analysis. The evidence hash covers inputs and assumptions but not the model version or code, nor the author and time (`scenarios.ts:93-99`). | `scenarios.ts` | Twin spec §§3.3, 7 (`docs/23_NATIONAL_DIGITAL_TWIN.md`); DestinE model registries; reproducible computational evidence (RO-Crate) | Medium |
| M3 | **Client engines still run on generated waves.** `lib/gov/*` (for example `sovereign-operating-model.ts`, 2,557 lines) has no twin read API (register 16.3). Signal kinds keep the UI honest, but decision panels still reason over samples. | register 16.3, `lib/gov/*` | — | Medium |

### 2.6 Operations

| # | Finding | Evidence | Practice / reference | Sev. |
|---|---|---|---|---|
| O1 | **Deployment config contradicts the app.** The Helm ingress sends `/api` to the NestJS `civicos-api` (`templates/app.yaml:61-64`), so every Next.js API route (twin, facilities, boundaries, auth, setup) is unreachable in a Helm install. The app container sets no `CIVICOS_STATE`, `CIVICOS_AUTH`, `CIVICOS_SESSION_SECRET` or `CIVICOS_CRON_SECRET` (`:23-27`). The readiness probe hits `/` (the cover). The Dockerfile says "standalone output" but `next.config.mjs` does not set `output: 'standalone'`, and it installs with `--frozen-lockfile=false`. | `infra/helm/civicos/templates/app.yaml`, `app/Dockerfile` | Twelve-factor; reproducible builds (SLSA L2+) | **Critical** for real deployments |
| O2 | **No structured logs, metrics or traces.** There are 41 `console.*` calls, no request ids and no OpenTelemetry. `/api/health` does not report persistence (`persistenceStatus()` lives only at `/api/platform/state`), audit chain status or twin source freshness. | `api/health/route.ts`, `persist.ts:140` | SRE golden signals; `docs/161_OBSERVABILITY…` | High |
| O3 | **Memory limits do not fit the state model.** The app limit is 384 Mi (`values.yaml:30`), against 23 MB of bundled geometry, up to 200k observations, an unbounded audit array, and the JSON re-encode in D2. | `values.yaml`, `persist.ts` | Capacity planning per profile | High |
| O4 | **Tests are unit-heavy.** There are no security regression tests for the gate (S1, S2), no OGC CITE run, no load or soak test of state growth, and no end-to-end test of console flows. `npm run lint` has no configuration (register 17.8). | `vitest.config.ts`, CI | Test pyramid with contract and security tests | Medium |

### 2.7 Code quality and architecture

| # | Finding | Evidence | Sev. |
|---|---|---|---|
| C1 | **`lib/data/store.ts` (2,219 lines) is many bounded contexts in one module:** permits, audit, payments, ops, incidents, federation, releases, backups, config, ministries, queues, sovereign profile, setup and generated national figures. Every store imports it for `recordAudit`, so it is the dependency hub. | `store.ts` outline (lines 315–2155) | Medium |
| C2 | **No persistence port.** Domain functions mutate `db()` directly, so moving to a database means touching every function. Preservation calls for keeping the exported functions and swapping the storage behind them. | `register.ts:107-108`, `facilities.ts:216-218`, … | High (enabler for D1, D2) |
| C3 | **Very large UI and engine files** (`SubsystemConsole.tsx` 2,121 lines, `SituationRoom.tsx` 1,478, `lib/gov/health-operations.ts` 1,869, `lib/api/types.ts` 1,812). | `wc -l` | Low |
| C4 | **Type escapes.** 84 `as never` casts (mostly around Supabase RPCs, for example `persist.ts:88, 95`). Generated database types would remove them. | search | Low |
| C5 | **The shallow snapshot merge gives nested fields no defaults.** `{ ...seed(), ...g.__civicos }` (`store.ts:311`) does not reach nested objects, against the "defaults for snapshots saved before the change" rule. | `store.ts:311` | Medium |

---

## 3. Recommendations, ranked

Impact: what it protects or unlocks. Effort: S ≤ 1 week, M 1–6 weeks,
L > 6 weeks. Ranked by impact over effort, with security-critical items
first.

| Rank | Recommendation | Impact | Effort | Addresses |
|---|---|---|---|---|
| 1 | Close the gate bypasses: header short-circuit, unsigned read cookie, scenario attribution, deny-by-default — **addressed** (see the status below the table) | Critical | S | S1, S2, S4, M1 |
| 2 | Upgrade Next.js to a patched 14.2.x, strip `x-middleware-subrequest` at the edge, add SCA to CI — **addressed** (see the status below the table) | Critical | S | S3 |
| 3 | Make the deployment match the app (ingress, env, single writer, probes, standalone build) — **addressed** (see the status below the table) | Critical | S | O1, D1 (stop-gap), O3 |
| 4 | Fence the single writer: versioned `platform_state_put`, a writer lease, persistence in `/api/health` — **addressed** (see the status below the table) | High | S | D1, O2 |
| 5 | Twin semantics: metric registry (unit, aggregation, SDMX concept), unit check, corrections, no silent eviction | High | M | D3, D4, D5 |
| 6 | Persistence port, then the twin, facilities, boundaries and audit in Postgres/PostGIS (bitemporal tables plus an outbox), with function signatures unchanged | High | L | D1, D2, D8, C2, G3 |
| 7 | Audit integrity: sign chain heads with a key held outside the data, anchor the platform chain with the substrate witnesses, keys and TOTP secrets under a KEK | High | M | D9, S5, S6 |
| 8 | Catalogue and provenance: DCAT-AP catalogue, PROV-O for runs and scenarios, resolvable URIs, NGSI-LD / Smart Data Models context | High | M | D6, D7, G6 |
| 9 | Interop upgrades: OGC Features via `loadNationGeography`, geometry bbox, queryables, API keys or OAuth2 for GIS clients, typed OpenAPI; SensorThings for telemetry | High | M | I1, I2, I3, I5 |
| 10 | Signed, logged exchange (CivicBus v0) for feeds and federation: RFC 9421 signatures, exchange log on both sides, CSPRNG keys stored as hashes | High | M | I4, S6 |
| 11 | AI governance: route through the egress policy, audit every call, schema-validate input, pass signal kinds, configurable (sovereign) endpoint, rate limit | High | S–M | S10 |
| 12 | Observability: structured JSON logs with request ids, OpenTelemetry to a self-hosted collector, SLO metrics, richer health | High | M | O2 |
| 13 | Geospatial scale: spatial index for facilities, server-built vector tiles (PMTiles) with a WebGL or canvas layer, national CRS via bundled EPSG definitions, topology validation | High (at scale) | M–L | G1–G4 |
| 14 | Scenarios: model registry, model and code version in the evidence hash, intervals, calibration log | Medium | M | M2 |
| 15 | Security hygiene: fix the DNS-rebinding window, CSP and HSTS, rate limits, async scrypt N≥2¹⁷, constant-time cron secret only in the header | Medium | S | S6–S9 |
| 16 | Split `store.ts` into context modules behind a re-exporting barrel; generated Supabase types; ESLint | Medium | M | C1, C4, C5 |
| 17 | Test upgrades: gate regression tests, OGC CITE in CI, state-growth soak test, e2e console smoke tests | Medium | M | O4 |
| 18 | Twin read API for client engines (signals with sample fallback) | Medium | M | M3 |
| 19 | One source of truth: record in `INTEGRATION_REGISTER.md` which of store, substrate and civic-api owns each register; deprecate duplicates by redirection, never deletion | Medium | S (decision), L (execution) | D8 |
| 20 | 3D readiness: optional footprint and height, a CityJSON export for facilities, INSPIRE / HXL category mapping | Low now | M | G5, G6 |

### Status of recommendations 1–4 (19 Oct 2026)

Addressed in commit `3f10206` ("Close the access-gate bypasses, patch
Next.js, fence the single state writer"); after a rebase or merge,
`git log --grep "fence the single state writer"` finds it.

- **R1 (S1, S2, S4, M1).** `middleware.ts`: an `Authorization` header skips
  the session gate only on routes that verify it (`SELF_AUTHENTICATED`,
  `BEARER_ROUTES`, now in `lib/auth/roles.ts`), and the role rules apply to
  a bearer sent anywhere else. Under `enforce`, pages and API reads outside
  the public lists need a verified `civicos_official` token (API reads 401,
  pages to `/sign-in`); `civicos_session=demo` opens only `/wallet` pages.
  `roles.ts`: `/api/platform/*`, `/api/federation/*`, `/api/integrations`,
  `/api/webhooks` and `/api/municipalities` are administrator-only, and every
  mutating route must match a rule (`mutationRule()`), otherwise it is
  refused; `api-permission-coverage.test.ts` enumerates the route files.
  Scenario routes and the tenant lifecycle transition record the verified
  official (`withOfficial()` / `currentOfficial()`), and scenario changes
  without one are refused under `enforce`. `listFacilities()` requires its
  viewer. Not done: the role-less-session cut-off in `roleOf()` (role-less
  sessions still count as administrator).
- **R2 (S3).** `next` and `eslint-config-next` 14.2.35; middleware refuses
  any request with `x-middleware-subrequest`, and the Helm ingress clears it.
  CI job *dependency audit* (`scripts/audit-deps.mjs`, `pnpm audit --prod`)
  fails on high or critical advisories not recorded with a reason and a
  review date in `scripts/audit-accepted.json`. Overrides lift PostCSS,
  nanoid and source-map-js under Next.js to patched versions. Ten Next.js
  advisories were fixed only in 15.5.x: accepted with mitigations (image
  optimizer off) until the Next.js 15 move, since done (register 17.9). Not done:
  container image scanning, feeding findings into `lib/data/advisories.ts`.
- **R3 (O1, D1 stop-gap, O3).** `infra/helm/civicos/templates/app.yaml`:
  every page and `/api` route goes to the app; civic-api moves to
  `/svc/api/*` (rewritten to its `/api/*`). `CIVICOS_AUTH`, `CIVICOS_STATE`,
  `CIVICOS_INTERNAL_URL` set; session, cron and substrate secrets from the
  `civicos-app` Secret; one replica with `Recreate` (the chart refuses more),
  PVC for file mode, readiness `/api/health?ready`, liveness and start-up
  `/api/health?live`, memory limit 1 Gi, an app network policy. Dockerfile:
  `--frozen-lockfile`, the workspace file copied, a `HEALTHCHECK`, a
  `.dockerignore`. `output: 'standalone'` is not used (the image runs
  `next start` on the full build), so it was left out.
- **R4 (D1, O2).** `lib/data/persist.ts`: writer lease (file: `O_EXCL` lock
  with pid, host and heartbeat; supabase: migration
  `20261019000000_civicos_platform_state_fencing.sql`), versioned saves that
  refuse to overwrite, standby and stopped roles that refuse changes, and
  `persistence` in `/api/health`.

### 3.1 Detail and sketches

**R1. Close the gate bypasses (S).** Files: `app/src/middleware.ts`,
`app/src/lib/auth/roles.ts`, `app/src/app/api/twin/scenarios/route.ts`,
`…/scenarios/[id]/route.ts`, `app/src/middleware.test.ts`,
`app/src/lib/data/facilities.ts`.
- Skip the official gate for an `Authorization` header only on
  `SELF_AUTHENTICATED` paths and on routes known to verify a bearer
  (`cronAuthorized` / `platformOrCronAuthorized` users). Add them to an
  explicit `BEARER_ROUTES` list next to `SELF_AUTHENTICATED`:
  ```ts
  const bearerOk = SELF_AUTHENTICATED.some(re => re.test(p)) || BEARER_ROUTES.some(re => re.test(p));
  if (req.headers.get('authorization') && bearerOk) return res;   // route verifies it
  ```
- Under `enforce`, require a *verified* `civicos_official` token for
  non-public pages and GET `/api`. Keep `civicos_session=demo` for the
  citizen demo pages only (`/wallet`, `/login` flow), or replace it with a
  signed citizen token. Pages keep their addresses (preservation).
- Scenarios: `const b = await withOfficial(await req.json()…)`, and refuse
  when there is no official under `enforce`.
- `roles.ts`: add `/api/platform/`, `/api/federation/`, `/api/integrations`,
  `/api/webhooks` to `ADMIN_ONLY`. Make `roleOf()` return `'officer'` for
  role-less sessions issued after a cut-off date (sessions last 8 h, so the
  legacy case ends quickly). Add an `ALLOWED_MUTATIONS` coverage test that
  fails when a new mutating route is neither listed nor guarded in-route,
  in the same spirit as `route-lock.test.ts`.
- `listFacilities(filter, viewer)`: make `viewer` required, so the
  type-checker finds every caller.
- Tests: `Authorization: x` on `POST /api/twin/sources` gives 401 under
  `enforce`; a cookie `civicos_session=demo` on `GET /api/twin/state` gives
  401.
- Register: 1.4, 15.4.

**R2. Patch Next.js (S).** `app/package.json`: `next` → latest 14.2.x
(≥ 14.2.25 for CVE-2025-29927, and later fixes). At ingress (Helm
`app.yaml` annotations or nginx `more_clear_input_headers`), drop the
`x-middleware-subrequest` header. CI: add a `pnpm audit --prod
--audit-level=high` (or osv-scanner) step and container image scanning,
and feed findings into the Update Center's own advisory flow
(`lib/data/advisories.ts`) so CivicOS follows its own patch commitments.

**R3. Deployment consistency (S).** `infra/helm/civicos/templates/app.yaml`,
`values.yaml`, `profiles/*.yaml`, `app/Dockerfile`, `app/next.config.mjs`.
- The ingress sends `/api/*` to `civicos-app`. If civic-api must be exposed,
  mount it under `/svc/api`; keep its old path working through an nginx
  rewrite (preservation).
- App env from a Secret: `CIVICOS_STATE=supabase` (or `file` with a PVC),
  `CIVICOS_AUTH=enforce`, `CIVICOS_SESSION_SECRET`, `CIVICOS_CRON_SECRET`,
  `CIVICOS_INTERNAL_URL=http://civicos-app:3000`.
- Until R6, set `app.replicas: 1` and `strategy: Recreate` (no two writers
  during a rollout), with a `PodDisruptionBudget` set accordingly. Note this
  in the profiles: horizontal scale waits on R6.
- Probes: readiness on `/api/health`; liveness on a cheap `/api/health?live`.
- `next.config.mjs`: `output: 'standalone'`. In the Dockerfile, copy
  `.next/standalone`, run `pnpm install --frozen-lockfile`, add a
  `HEALTHCHECK`. Raise the memory limit to at least 1 Gi until R6.
- Register: 1.1, 9.

**R4. Fence the single writer (S).** In a new migration (next to
`20261017000000_civicos_platform_state.sql`), add `version bigint` and
`writer uuid` to `platform_state`, plus
`platform_state_put(p_key, p_value, p_writer, p_expected_version)` that
raises on mismatch. Add `platform_state_lease(p_writer, p_ttl)` using a
lease row (or `pg_try_advisory_lock` held by a dedicated connection).
- `lib/data/persist.ts`: take the lease at start. A process without it
  serves read-only, or refuses mutations with 503 and a clear message.
  Renew the lease on each flush, and stop writing after a conflict instead
  of overwriting.
- File adapter: an exclusive lock file (`O_EXCL` plus a heartbeat).
- Surface `persistenceStatus()` in `/api/health` (adapter, lastSaved,
  error, lease holder).

**R5. Twin semantics (M).** Files: `lib/twin/register.ts`, a new
`lib/twin/metrics.ts` (a registry *inside* the existing twin store),
`/gov/twin` sources tab (a tab, not a menu entry), `api/twin/sources`, and a
new `api/twin/metrics` route (route-lock and OpenAPI updated).
- `MetricDef { id, label, unit (UCUM code), aggregation: 'sum'|'mean'|'weighted-mean'|'none', weightMetric?, sdmxConcept?, period: 'instant'|'year'|'quarter'|'month' }`.
  Source mappings name a registered metric (existing free metrics are
  migrated as `aggregation: 'none'` so nothing changes silently).
- `nationalTotal()`: refuse to aggregate when units differ or the metric is
  not additive; return the coverage and `vintage` (newest and oldest
  `validFrom`).
- Corrections: `withdrawRun(runId, by, reason)` marks its observations
  `supersededAt` (never deletes), audited and four-eyes where policy says
  so. `stateAsOf` ignores observations superseded by `knownAt`. Add an
  optional `validTo` for interval facts.
- Eviction: replace the `splice` with archiving to a per-metric history
  store (or R6 tables). Until then, refuse the import with a clear message
  and an audit entry, rather than dropping history.
- Add `quality?: { status?: 'provisional'|'final'|'revised'; stdErr?; ci95? }`
  to `Observation`, defaulted for old snapshots.

**R6. Persistence port and relational twin (L).** Introduce
`lib/data/repo/<store>.ts` interfaces with two implementations:
`memory` (today's `globalThis` code, unchanged) and `postgres`. Exported
functions (`runSource`, `stateAsOf`, `proposeFacility`, …) keep their
signatures; only `db()` access moves behind the port. Order: audit →
twin → facilities → boundaries → the rest.
- Twin tables (substrate, PostGIS enabled):
  `twin_entity(id text pk, uri text, kind, name, code, parent, geom geography null)`,
  `twin_observation(entity_id, metric, value numeric, unit, valid tstzrange, recorded_at, superseded_at, run_id, source_id)`
  with a `btree (metric, entity_id, lower(valid))` index and an
  append-only trigger. `stateAsOf` becomes one `DISTINCT ON` query.
- Facilities: `geography(Point)` with a GiST index for duplicates and bbox
  (closes G3). Boundaries: `geometry(MultiPolygon, 4326)` with
  `ST_IsValid` checks (closes G2).
- An outbox table written in the same transaction as each change and the
  audit entry. That gives atomicity (D2) and an event stream for CivicBus,
  webhooks and CloudEvents (I7).
- Multi-instance becomes safe; lift the R3 replica cap per store as it
  moves.
- Register: 1.1, 16.6; a new entry per moved store.

**R7. Audit integrity and key custody (M).** `lib/data/store.ts`
(`appendAudit`, `verifyAuditChain`), a new `lib/audit/sign.ts`,
`api/cron/audit-anchor`, `lib/auth/officials.ts`.
- Every N entries or T minutes, sign `{seq, hash, at}` of the head with an
  Ed25519 key from `CIVICOS_AUDIT_KEY` (KMS or HSM in production; a key
  file for air-gapped). Store the signed head in the existing substrate
  witnesses table, or for file mode in a separate append-only file.
  `/audit` re-verify shows "signed head N at T".
- Extend the `audit-anchor` cron to anchor the platform chain head as well
  as the substrate scopes. Optionally add an RFC 3161 time-stamp from the
  nation's own TSA.
- Keys: require `CIVICOS_SESSION_SECRET` in `enforce` mode (refuse to start
  otherwise). Encrypt TOTP secrets with AES-GCM under `CIVICOS_DATA_KEK`,
  keeping the old plaintext readable and re-encrypting on next use (snapshot
  defaults rule). Use async `scrypt` with N=2¹⁷ and rehash on sign-in.
- Register: 1.13, 1.14, 15.4.

**R8. Catalogue, provenance and identifiers (M).** New read-only routes
under the existing twin API: `GET /api/twin/catalog` (DCAT-AP JSON-LD:
`dcat:Catalog` → datasets for each registered source, each boundary version
and each OGC collection, with publisher, licence, temporal and spatial
coverage and `dcat:Distribution` links) and `GET /api/twin/runs/[id]/prov`
(PROV-O JSON-LD: `prov:Activity` run, `prov:used` the source distribution
with the file SHA-256, `prov:wasAssociatedWith` the official,
`prov:generated` the observations). Scenario versions get the same, with
`prov:wasDerivedFrom` inputs.
- URIs: add `uri` to `TwinEntity` as
  `https://<nation-domain>/id/<kind>/<code>`, from the nation profile
  (default for old snapshots). Serve a 303 to the entity page. Keep today's
  ids as the primary key (preservation).
- An NGSI-LD view (`Accept: application/ld+json` on `/api/twin/entities/[id]`)
  with a `@context` mapping place → Smart Data Models `AdministrativeArea`
  style, facility → `PointOfInterest`, and observations as temporal
  properties.
- Facility ids: keep `FAC-00012` as display or legacy ids. Mint the
  dictionary's opaque FacilityID (`ids.national`) at publication with
  `randomUUID` or UUID v7.

**R9. Interop upgrades (M).** `lib/twin/ogc.ts`: read shapes through
`loadNationGeography()` / `loadDistricts()`. `ogc-boundaries.ts:55`:
intersect the geometry bbox (`bboxOf`, already in `ogc.ts`) and add a
`prev` link. Add `/collections/{id}/queryables` and simple property filters
(`category=`, `regionCode=`) declared in conformance. Document
`datetime`-as-of in the collection description. Auth for machines: issue
read-scoped API keys through the existing integrations admin (stored as
hashes like the `ccf_` feeds), accepted on GET `/api/twin/ogc/*` only.
- OpenAPI: generate request and response schemas from `lib/api/types.ts`
  (ts-json-schema-generator in `scripts/openapi-lib.mjs`), with
  `securitySchemes` (cookie, bearer feed key, cron).
- SensorThings (16.3): a new `lib/twin/sta.ts` mapping substrate telemetry
  streams to Things, Datastreams and Observations under
  `/api/twin/sta/v1.1/*`, read-only first. Streams become a twin source
  kind `stream`, whose daily aggregates land as observations with
  `kind: 'observed'`.
- SDMX-CSV reader as a second parser in `runSource`.

**R10. Signed, logged exchange (CivicBus v0) (M).** Extend
`lib/data/case-import.ts` and `facilities.ts` feeds, and `store.ts`
federation and integrations, rather than adding a new backend.
- Integration keys: `randomBytes(32)`, stored as SHA-256 like the feed
  keys, verified on use, with `rateLimitRpm` enforced.
- Optional, per-feed: HTTP Message Signatures (RFC 9421, Ed25519) with the
  institution's registered public key. The platform verifies, records an
  exchange log entry (request digest, signature, key id, time, result) and
  returns a signed receipt. Both sides keep the log (X-Road's
  non-repudiation).
- Federation grants carry a usage policy (purpose, retention, onward
  sharing), the IDSA / ODRL idea, enforced at the exchange.

**R11. AI governance (S–M).** `app/api/ai/advisory/route.ts`:
- Validate the body (types, ranges, a `label` length cap, a control-char
  strip) and include each figure's `SignalKind`. The prompt then states
  "these figures are samples" when they are.
- Audit every call: `recordAudit(official, 'ai.advisory', 'Institution:<id>', outcome, 'model=…; in=sha256:…; out=sha256:…')`.
- Treat the call as operational data leaving the nation: gate it through
  `lib/data/sovereignty.ts` with an `ai-advisory` category (off unless
  enabled, with a sample payload). Make the endpoint and model configurable
  (`SovereignProfile.aiAssistant.endpoint`) so a nation can point it at a
  sovereign or on-prem model.
- Rate-limit per official.
- Register: 2.1.

**R12. Observability (M).** Add `lib/ops/log.ts` (JSON lines: time, level,
request id, official sub, route, outcome; never personal data). The
middleware sets an `x-request-id` header. OpenTelemetry SDK (Node) exports
to a self-hosted collector (no vendor endpoint). Golden-signal metrics per
route, plus twin source freshness and audit verification status.
`/api/health` reports persistence (R4), audit chain ok, and stale sources.

**R13. Geospatial scale (M–L).** In `facilities.ts`, add a grid index (for
example a cell of ~1 km keyed by `floor(lng/0.01),floor(lat/0.01)`) kept
beside `facilities[]` and rebuilt on restore, used by `checkLocation` and
bbox queries. Tiles: a server route
`/api/twin/tiles/{layer}/{z}/{x}/{y}.mvt` (or PMTiles built at publish
time, served from the platform), drawn by a canvas or WebGL layer in
`components/map/*` above the plan's ~2,000-feature threshold. CRS: bundle
proj4 definitions for the nation's EPSG codes in the Nation Pack, accept
projected files in `proposeBoundaries` and facility imports, transform to
WGS 84 server-side and record the source CRS and transformation in the
version. Topology: add self-intersection and gap checks (a turf-style
kinks test, area of union versus outline).

**R14. Scenarios (M).** `lib/twin/scenarios.ts`: add
`model: { id: 'pct-multiplier', version: '1' }` and the build's commit (from
the Update Center release) to `ScenarioVersion` and to `evidenceHash`
(version the hash prefix `civicos-scenario-v2`; v1 stays verifiable).
Add optional `range: {low, high}` on assumptions, propagated to results.
Add a calibration log: when an observation later arrives for a projected
date, record the error against the version.

**R15. Security hygiene (S).**
- `safe-fetch.ts`: pass the checked address into the connection (undici
  `Agent({ connect: { lookup } })` returning the pinned address), and set
  `maxBytes: 20_000_000` from `runSource`.
- Headers: CSP (`default-src 'self'`; nonce for inline scripts), HSTS, in
  one place (`next.config.mjs`), with `vercel.json` mirroring it.
- `platform-auth.ts`: compare with `timingSafeEqual`. Accept `?token=` only
  where pg_cron cannot send headers, and log that path.
- `store.ts`: `uid()` through `randomUUID`; config `contentHash` through
  SHA-256.

**R16. Code structure (M).** Split `lib/data/store.ts` into
`lib/data/store/{audit,permits,payments,ops,incidents,federation,platform-ops,ministries,sovereign,setup,national}.ts`
sharing one `__civicos` object (same key, so snapshots restore). Keep
`lib/data/store.ts` as a barrel that re-exports everything, so no import
changes. Move `recordAudit` to `lib/data/audit.ts` to break the hub
dependency. Generate Supabase types (`supabase gen types`) to remove the
`as never` casts. Add an ESLint flat config with `no-restricted-imports`
encoding the layering (UI must not import `lib/data/*` server stores
directly). Replace the shallow merge in `store.ts:311` with a per-field
defaults function.

**R17. Tests (M).** Gate regression suite (R1). OGC API Features ETS (OGC
CITE TEAM Engine, run in a container in CI against the built server, like
the public-sites audit job). Property tests for `stateAsOf` (random
observation sets: the result is always the latest valid ≤ asOf recorded ≤
knownAt). A soak test that loads 200k observations and 50k facilities and
measures flush time and heap. Playwright smoke tests of `/gov/twin`,
`/gov/sites` and `/audit`.

**R18–R20.** See the table. R19 is mostly a written decision: for each
register (directives, audit, telemetry, ministries) name the owner store in
`docs/INTEGRATION_REGISTER.md` §1, route the others to it, and keep
civic-api's paths working by redirect.

---

## 4. Phased roadmap

### Phase A: quick wins (≤ 1 week)

| Item | Files | Done when |
|---|---|---|
| R1 gate fixes and tests | `middleware.ts`, `roles.ts`, twin scenario routes, `facilities.ts`, `middleware.test.ts` | Header and cookie bypass tests pass under `enforce`; mutating-route coverage test green |
| R2 Next.js patch and SCA in CI | `package.json`, `.github/workflows/ci.yml`, Helm annotations | CI fails on high advisories; header stripped at ingress |
| R3 deployment fixes | `infra/helm/**`, `Dockerfile`, `next.config.mjs` | Helm install serves `/api/twin/ogc` from the app; one writer; secrets set |
| R4 writer fencing and health | new migration, `persist.ts`, `api/health` | A second instance cannot overwrite; health shows persistence |
| Twin guards from R5 | `register.ts` | Unit mismatch refuses `nationalTotal`; eviction refused and audited instead of silent |
| R15 hygiene | `safe-fetch.ts`, `platform-auth.ts`, `store.ts`, `next.config.mjs` | DNS pinned; CSP and HSTS present; CSPRNG ids |
| R11 audit of AI calls and input validation | `api/ai/advisory/route.ts` | Every call audited with hashes and model |

### Phase B: medium (1–3 months)

- R5 metric registry, corrections, quality fields.
- R7 signed and anchored audit heads; KEK for TOTP; required session secret.
- R8 DCAT catalogue, PROV export, entity URIs, NGSI-LD view.
- R9 OGC upgrades, typed OpenAPI, machine read keys; SensorThings read
  API; SDMX reader.
- R10 integration keys hashed and enforced; RFC 9421 signatures and an
  exchange log on feeds.
- R12 logging, OpenTelemetry, SLO metrics.
- R13 part 1: facility spatial index; national CRS through bundled EPSG
  definitions; topology checks.
- R14 scenario model registry and intervals.
- R16 `store.ts` split behind a barrel; generated types; ESLint.
- R17 CITE, property and soak tests.

### Phase C: structural (3–12 months)

- R6 persistence port, then Postgres/PostGIS bitemporal tables and an outbox:
  audit → twin → facilities → boundaries → the rest. Multi-instance scale per
  store as it moves; Helm replicas lifted accordingly.
- CivicBus v1: an outbox-driven event stream (CloudEvents), security-server
  style mutual TLS between installations, and federation usage policies
  (from R10).
- R13 part 2: vector tiles (PMTiles or MVT) and a WebGL/canvas map layer for
  national-scale layers.
- R18 twin read API for the `lib/gov/*` engines; telemetry as a twin
  source.
- R19 one owner per register across store, substrate and civic-api.
- R20 3D readiness (footprints, CityJSON export), INSPIRE / HXL category
  mapping; the sealed individual twin (`docs/23_NATIONAL_DIGITAL_TWIN.md`
  §3.2) on the substrate with per-citizen keys.

---

## 5. Preservation and register notes

- Nothing above removes a route, page, store or export. Moves (the ingress
  `/api` split, civic-api paths) keep old paths through redirects or
  rewrites. New routes (`/api/twin/catalog`, `/api/twin/metrics`,
  `/api/twin/runs/[id]/prov`, `/api/twin/sta/*`, tiles) join
  `route-lock.json` where they are pages, and OpenAPI is rebuilt
  (`npm run build:openapi`).
- New console screens (metric registry, exchange log, signed audit heads)
  join existing menu items as tabs (`lib/nav/console-nav.ts`).
- Each change updates `docs/INTEGRATION_REGISTER.md` in the same change:
  1.1 (persistence, fencing, Postgres), 1.4 (enforcement), 1.13–1.14
  (signed heads, anchoring), 2.1 (AI egress and audit), 15.4 (keys,
  scrypt), 16.2–16.9 (metrics, SDMX, SensorThings, OGC, catalogue),
  17.8 (lint), and new entries for the KEK, the audit signing key and
  machine read keys.

---

## Appendix: evidence index

| Topic | Location |
|---|---|
| Twin store, eviction, `stateAsOf`, `nationalTotal` | `app/src/lib/twin/register.ts:97-111, 258-308, 324-366` |
| Signal kinds | `app/src/lib/twin/signal.ts:14-43` |
| Scenarios and evidence hash | `app/src/lib/twin/scenarios.ts:93-170`; routes `app/src/app/api/twin/scenarios/route.ts`, `[id]/route.ts` (no `withOfficial`) |
| OGC collections | `app/src/lib/twin/ogc.ts:182-321`, `ogc-boundaries.ts:46-72`, `ogc-facilities.ts:128-153` |
| Persistence | `app/src/lib/data/persist.ts:19-21, 126-171`; `app/supabase/migrations/20261017000000_civicos_platform_state.sql` |
| Audit chain | `app/src/lib/data/store.ts:113-116, 280-310, 398-417` |
| Weak ids, keys and hashes | `store.ts:103-105, 118-122, 732, 1080` |
| Gate | `app/src/middleware.ts:41-46, 89-125`; `app/src/lib/auth/roles.ts:34, 41-65`; `app/src/components/features/cover/entry.ts:34` |
| Keys in state | `app/src/lib/auth/officials.ts:28-30, 49-73` |
| SSRF guard | `app/src/lib/net/safe-fetch.ts:24-40` |
| AI advisory | `app/src/app/api/ai/advisory/route.ts:26-80` |
| Facilities | `app/src/lib/data/facilities.ts:115-139, 363-380, 536-557, 735-749` |
| Boundaries | `app/src/lib/data/boundaries.ts:1-19, 198-310, 362-366` |
| Deployment | `infra/helm/civicos/templates/app.yaml`, `infra/helm/civicos/values.yaml:24-30`, `infra/helm/profiles/*.yaml`, `app/Dockerfile`, `app/next.config.mjs`, `app/vercel.json` |
| Versions and CI | `app/package.json` (`next` 14.2.5), `.github/workflows/ci.yml` |
| Size hot spots | `lib/data/store.ts` 2,219; `lib/gov/sovereign-operating-model.ts` 2,557; `components/features/SubsystemConsole.tsx` 2,121; `lib/data/updates.ts` 1,586 |

---

## 6. Status after the 60-commit programme (October 2026)

Every finding of section 2 has been worked on in place (nothing removed). What addresses each one, and what is still open:

| Finding | Addressed by | Still open |
|---|---|---|
| S1, S2, S4 gate bypasses, open reads, fail-open defaults | bearer and self-authenticated lists in `lib/auth/roles.ts`, verified official for every non-public read under enforce, deny-by-default for unlisted changes with a coverage test, role-less sessions newer than roles act as officer, `listFacilities` viewer required | — |
| S3 Next.js CVE | Next.js 15.5 with React 19 (register 17.9; the accepted Next.js 14 advisories closed, nothing accepted), `x-middleware-subrequest` refused, dependency audit in CI with reviewed exceptions, findings raised as Update Center advisories, container image scan and SBOM | — |
| S5, S6 keys with the data, weak randomness | TOTP secrets under AES-256-GCM (`CIVICOS_DATA_KEK`), async scrypt N=2¹⁷ with rehash, session secret required under enforce, CSPRNG ids and SHA-256 content hashes, integration keys hashed, key custody providers (`lib/keys/`: environment, Vault / OpenBao Transit, KMS over HTTP) for the audit, exchange and data keys | — |
| S7 DNS rebinding | pinned vetted address in `safeFetchText`; twin downloads up to 20 MB; through the nation's egress proxy as a CONNECT tunnel to the vetted address (`CIVICOS_EGRESS_PROXY`) | — |
| S8 headers | one CSP/HSTS source (`security-headers.mjs`) mirrored in `vercel.json`, checked by the console smoke tests; scripts run only with a per-request nonce (`script-src 'self' 'nonce-…' 'strict-dynamic'`, set by the middleware, no `'unsafe-inline'` for scripts) | — |
| S9 rate limits | `lib/ops/rate-limit.ts` on uploads and checks; integration keys enforce `rateLimitRpm`; the middleware limits every other change (`write`, `public`); ingress-level global limits per address and per path group (Helm `ingress.limits`, compose `edge` profile) | — |
| S10 AI egress | validation, sample marking, audit with hashes, data-sovereignty gate, nation's own model, per-official limit | — |
| D1, O1, O3 deployment and single writer | Helm (ingress, env, one writer, probes, memory), Compose with file state and Prometheus, writer lease and versioned saves; `CIVICOS_STATE=postgres` (R6): the audit chain, twin, facility records and boundary versions are per-record tables every instance writes through and follows through the outbox, standbys take their changes, Helm allows replicas > 1 in that mode, `/api/health` reports queue depth and outbox lag; every other store (nation profile, ministries, officials, Update Center, public sites, scenarios, metric definitions, event outbox, signed heads and the rest) as per-record documents (`civicos.record_doc`, `lib/data/repo/documents.ts`, migration `civicos_record_docs`), each change committed with its audit entry and an outbox row, merged three ways where two instances changed one record, followed by every instance in place, store counters numbered from reserved blocks; so every replica takes every change, the lease only names who makes CloudEvents and signed heads, and no snapshot is written in that mode | — |
| D2 whole-store re-encode | save loop skips encoding while nothing is audited, full sweep every 60 s; in postgres mode the large registers leave the snapshots and each change is committed with its audit entry and outbox row in one transaction (journalled until then); every remaining store is per-record documents, compared only when used (`lib/data/repo/track.ts`: `touch()` in each accessor, a sweep for the rest) and written record by record against its version | — |
| D3, D4, D5 twin semantics | metric registry (UCUM, aggregation, period), unit checks, `nationalTotal` refusals with coverage and vintage, run withdrawal, `validTo` and quality, durable archive instead of eviction, four-eyes withdrawal under a per-nation twin policy (`lib/twin/policy.ts`) | — |
| D6, D7 identifiers, catalogue, provenance | entity URIs with a 303 resolver, DCAT-AP catalogue, PROV-O for runs and scenarios, NGSI-LD view, UUID v7 national facility ids, the nation's domain in setup (`lib/nation/domain.ts`); public resolution of `/id/*` without signing in (open in `middleware.ts`) to a public schema.org description (`/id/{kind}/{code}/about`, `lib/twin/public-entity.ts`), restricted and confidential sites refused with 403 | — |
| D8 several sources of truth | ownership map with coverage test (`lib/data/register-owners.ts`, `/api/platform/owners`), each owner's durable storage named for every platform register (`storage`: per-record tables for the four typed registers, per-record documents for the rest; a test requires it) | retiring the substrate and civic-api duplicates behind their owners |
| D9 audit integrity | Ed25519-signed chain heads, anchored by the audit-anchor cron, shown on /audit; RFC 3161 time-stamps from the nation's TSA, checked and kept with each head | — |
| I1, I2 OGC | subdivisions through the nation's geography, geometry bbox, prev links, queryables and filters, conformance checker and TEAM Engine in CI, integration keys with scope `ogc:read` for GIS clients (`lib/twin/machine-read.ts`), CQL2-Text and CQL2-JSON filters (`lib/twin/cql2.ts`); OAuth2 client credentials (`POST /api/oauth/token`, short-lived EdDSA access tokens signed by the key custody provider, scopes limited to the key's, accepted by the OGC, SensorThings and tile routes; `lib/auth/client-credentials.ts`); Part 2 CRS by reference (`crs`, `bbox-crs`, `Content-Crs`; CRS84, EPSG:4326, EPSG:3857 and the nation's national grids from the site importer's `lib/geo/crs.ts`; `lib/twin/ogc-crs.ts`, checked by `ogc-check.mjs`) | — |
| I3 sensors | SensorThings API v1.1 over the twin and substrate telemetry, telemetry streams as a twin source kind with daily aggregates (`lib/twin/stream.ts`); STA create for a stream source's Datastream (`POST Observations`, `CreateObservations`) with the bound integration's own key, scope `sta:write` (`lib/twin/sta-write.ts`); a subscriber to the nation's own MQTT broker (TLS, QoS 1, sealed credentials, registered host only, private addresses only under the twin's rules; `lib/twin/mqtt.ts`); both through one ingestion path that checks, refuses with reasons, audits and keeps readings the daily run turns into observations (`lib/twin/stream-ingest.ts`, `lib/twin/readings.ts`) | STA update and delete (readings are withdrawn through their run instead), tasking, STA's MQTT extension |
| I4, I7 exchange | RFC 9421 signatures on feeds, exchange log with signed receipts, federation usage policies, CloudEvents outbox with signed webhooks, AsyncAPI, mutual TLS between installations (client certificate per grant, verified at the ingress and matched by fingerprint; outbound client certificate through an undici Agent) | — |
| I5 OpenAPI | regenerated per change; multipart described; typed request/response schemas from the routes' TypeScript types, security schemes per operation (`scripts/openapi-types.mjs`); examples on every typed or documented body, from the route's `@example` lines or generated from the schema (`exampleOf()`, `scripts/openapi-lib.mjs`), and the OAuth2 client credentials scheme | — |
| I6 SDMX | SDMX-CSV, SDMX-JSON (2.0/1.0) and SDMX-ML 2.1 structure-specific readers; DSD and code lists fetched per run from the office's SDMX registry (REST structure query through `safeFetchText`, the source's own host only), every code validated against its list and the codes seen labelled on the run (`lib/twin/sdmx-structure.ts`) | — |
| G1–G6 geospatial | Shapefile/GeoPackage with reprojection, national grids for site imports, topology checks, spatial index, canvas layer and vector tiles, footprints and CityJSON export, INSPIRE/HXL/OSM/Smart Data Models mapping; in postgres mode facilities and boundary units are tables with PostGIS points/multipolygons, GiST indexes and `ST_IsValid` (bounding-box columns without PostGIS) | G4 in the next row |
| G4 national-scale rendering | WebGL point and polygon layer in `NationMap` (raw WebGL 2 / 1, GPU picking, tone colours from tokens, size by zoom and spacing, theatre glyph tiles, reduced motion, lost-context fallback to the canvas; `lib/map/gl-*.ts`, `components/map/WebGLPoints.tsx`); vector tiles read on the client for the visible extent (`lib/map/tile-loader.ts`); PMTiles v3 writer and reader (`lib/geo/pmtiles.ts`) and the public archive of the facility register rebuilt after publication changes and served by range (`/api/twin/tiles/facilities.pmtiles`, `lib/twin/tiles-archive.ts`), read by the public locator; `/gov/sites` and the Situation Room theatre on the tile-backed layer for large registers; `npm run check:map` (100,000 points drawn, picked, context lost and restored) and before/after screenshots with a 50,000-site register (`docs/MAP_SYSTEM_PLAN.md`); clustering at low zoom (`cluster` on `NationMap`, `lib/map/cluster.ts`: a screen-space grid computed in the browser for page and tile points on the canvas and WebGL layers, numbered marks in token colours with an accessible name, click / Enter zooms to a cluster, "Whole map" back, reduced motion respected; on `/gov/sites`, covered by `check:map` on both layers); `/gov/sites` reads its register table a page at a time (`GET /api/facilities?limit=&offset=` with the total and the table's filters and search, each page through `viewFacility()`), its waiting list and an open record on their own | serving the archive from the file by ranges instead of memory at 10⁶ sites; parcel and boundary tile layers; a per-institution signed-in archive |
| M1–M3 scenarios and engines | verified authors, model registry and v2 evidence hash, intervals, calibration log, twin read API wired into every engine figure with a metric equivalent (`lib/twin/engine-metrics.ts`, register 16.3); every engine index is listed (`lib/twin/engine-indexes.ts`) and is either a derived metric, a formula over observed metrics computed on read and answered modelled with its inputs (`lib/twin/derived.ts`, `derived-server.ts`; aging and hospital mortality), or a modelled index marked on every screen that shows it (`IndexTag`); `engine-indexes.test.ts` finds the indexes in the engine sources and fails on one with neither, or a screen that shows one unmarked | — |
| O2 observability | structured JSON logs with redaction and request ids, Prometheus metrics, health with audit chain, freshness and problems, OpenTelemetry traces (route handlers, outbound fetches, saves, audit appends) to the nation's own collector, joined to log lines | — |
| O4 tests | architecture tests, gate coverage tests, property tests for as-of, soak test with a recorded baseline, console smoke tests on desktop and phone, OGC checks | — |
| C1, C2, C5 code structure | deep snapshot defaults (`withDefaults`), layering enforced by tests; `lib/data/store.ts` split into context modules (`lib/data/store/*`: audit, permits, payments, ops, federation, platform-ops, ministries, sovereign, national) behind a re-exporting barrel, one `__civicos` object, audit in its own module so stores no longer load the whole store; persistence port (`lib/data/repo`, memory and postgres) for the audit chain, twin, facilities and boundaries with signatures unchanged, and for every remaining store through its generic side (`touch()`/`tracked()` in the accessors, per-record documents in the postgres backend, signatures unchanged); Supabase types generated offline from the SQL migrations (`scripts/db-types-lib.mjs` → `lib/db/types.generated.ts`, `npm run build:db-types`; `types-generated.test.ts` fails while it is stale and checks the hand-written row shapes of `lib/db/types.ts` against it) | — |
