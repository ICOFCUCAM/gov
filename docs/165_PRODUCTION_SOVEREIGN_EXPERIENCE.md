# CivicOS — Production Sovereign Experience: Module Operations (Companion 165)

Operational engineering reference. Concise. Incremental — preserves routing,
architecture, governance, and Vercel/Kubernetes portability. Pairs with
running code: `services/civic-api` (`OrgModule` + `OperationsService` +
`ops-catalog.ts`) and `app` (`ops-catalog.ts`, `ministryOperations`,
config-driven `/control`, low-bandwidth mode). Companion 158 binds: humans
operate; the platform surfaces — no autonomous action.

---

## 1. What this phase delivered (one increment)

The institutional framework (Companion 164) made ministries composable but
their modules were just names. This increment makes every activated module a
**real operational dashboard**: KPIs, SLA-aware queues, and alerts —
composed per institution from a code-defined catalog, rendered in the
operational command surface.

## 2. Operational module catalog

`ops-catalog.ts` maps each `moduleKey` → a `ModuleOpsSpec`:

- **KPIs** — label, unit, direction (higher/lower-better), target. Tone
  derived: `ok` if meets target, `warn` if within 10–15%, else `alert`.
- **Queues** — SLA hours; depth + oldest-age materialised; `breaching` when
  oldest age exceeds SLA.
- **Alerts** — severity + likelihood; surfaced for human action only
  (e.g. taxation/procurement anomalies are Class-D-style: "flagged for human
  investigator", never autonomous).

Covered: Health (facilities, licensing, outbreak, vaccination), Finance
(treasury, taxation, budget, procurement), Education (schools, enrolment,
examinations, scholarships), Energy (grid, electrification), Agriculture
(farmer-registry, subsidies), Justice (legal-aid, case-coordination),
Transport (vehicle-registry, driver-licensing, road-safety). A `GENERIC_SPEC`
fallback ensures **every enabled module renders** — no blank panels.

## 3. Materialisation (real where it exists, stable where synthetic)

`ministryOperations(id)` (app) / `OperationsService.forMinistry` (backend):

- **Real-data hooks**: e.g. the Health `licensing` queue depth = live count
  of open permits in the store. Verified: depth tracked actual permits.
- **Deterministic synthetic**: FNV-seeded by `ministry:module:kpi` so a
  ministry's operational picture is **stable across reads** (verified:
  identical KPI on repeat). Honest indicators, not random noise.

API: `GET /api/org/ministries/:id/operations` — RBAC `org:read` (verified
403 without it), 404 unknown ministry. Backend: 49 OpenAPI paths, `nest
build` green.

## 4. Command surface (operational realism)

`/control` is now a real operational command environment, fully
config-driven (no hardcoded "Ministry of X"):

- Summary band: active modules, queues breaching SLA, active alerts, departments.
- Operational alerts list (severity-badged, with human-action detail).
- Per-module dashboards: KPI tiles (value + tone + target), queue SLA bars.
- Institution switcher across all composed ministries.

Never shows individual citizen records, officer click data, or political
affiliations (Companions 156/158).

## 5. Sovereign design system increment

`AccessibilityMenu` gains **Low-bandwidth mode** (persisted, `data-bw`
attribute): strips shadows, background images, transitions — the operational
picture stays fully legible; only heavy visuals go. Joins existing text-scale,
high-contrast, reduced-motion, offline-banner. Accessibility-first, calm,
mobile/tablet-responsive (Tailwind), multilingual-ready (SLIL scaffold,
Companion 148) — all preserved.

## 6. Real data architecture (transition continues)

Backend reads ministry+module from Prisma (migration 0006) and materialises
operations; the app mirror keeps the swappable in-memory adapter for the
demoable single-deploy. Same typed contract both sides — the datastore swap
remains mechanical. No schema churn this increment; operations is a derived
read model, not new persisted state.

## 7. Human governance — absolute

No KPI, queue, or alert triggers an automated government action. Alerts route
to humans ("flagged for human investigator", "epidemiologist review
required"). AI is not involved in this layer. Humans govern; the platform
surfaces.

---

Verified: backend `nest build` green, operations endpoint RBAC 403 + 404 +
49 OpenAPI paths; app `pnpm typecheck` + `pnpm build` green; smoke — HEALTH
materialises 6 modules with realistic KPIs, licensing queue mirrors real
permits, deterministic-stable across reads, `/control` config-driven with no
hardcoded ministry, Finance switch works, 404 on unknown, audit chain intact.
Routing, monorepo, Vercel compatibility, infra separation, Kubernetes
portability unchanged. Phase gates (Companion 159) unchanged.
