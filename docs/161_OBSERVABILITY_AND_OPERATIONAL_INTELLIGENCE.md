# CivicOS — Observability & Operational Intelligence (Companion 161)

Operational engineering reference. Concise. Pairs with running code:
`services/civic-api` (Prometheus metrics, `/api/ops/*`, resilient overview),
`app` (`/ops` Operations Centre, incident workflow, queue/tenant health).
No doctrine — the binding doctrine is Companion 158 (humans govern; AI
summarises, prioritises, recommends — humans decide).

---

## 1. Observability topology

```
 civic-api ──/api/metrics (Prometheus text)──▶ Prometheus ──▶ Grafana
     │  structured logs (JSON, request-id) ───▶ Loki
     │  OTEL spans (seam: MetricsInterceptor) ─▶ Tempo/Jaeger
     │
     └─ derived ops state (Prisma counts) ────▶ /api/ops/overview ──▶ /ops UI
```

- **Metrics**: `prom-client` registry. `civicos_http_requests_total{method,route,status,tenant}` + `civicos_http_request_duration_seconds` histogram + default process metrics. Scrape target is cluster-internal only (NetworkPolicy), never public ingress.
- **Sovereign-safe cardinality/privacy**: labels are bounded — method, route *template*, status, tenant. **Never** citizen identifiers, names, or raw paths.
- **Logs**: structured JSON; uniform error envelope (no stack traces to clients); ship to Loki.
- **Traces**: the `MetricsInterceptor` is the propagation seam — wire the sovereign OTEL collector here; no vendor APM.

## 2. Operational intelligence (derived, not invented)

`/api/ops/overview` computes from real state:

| Signal | Source |
|---|---|
| Service health | DB reachability, audit-chain verify, API |
| Queue intelligence | open permits, needs-info, unpaid/overdue bills (counts) |
| Tenant/municipality health | per-muni open permits, SLA breaches, edge-sync lag |
| Audit integrity | hash-chain replay (`auditIntact`) |
| SLA compliance | decided permits on-time vs `decisionDue` |

**Resilient by design**: if the database is unreachable the overview returns `degradedMode: true` with services marked `down` and queues zeroed — operators still get a picture; the endpoint does not 500. Verified.

## 3. SLA framework

| Queue | SLA | Breach signal |
|---|---|---|
| Permit review | 12 days (288h) to decision | any open permit past `decisionDue` |
| Awaiting citizen info | 30 days (720h) | oldest item past threshold |
| Payments outstanding | n/a (no decision SLA) | any `overdue` bill |
| Edge sync (per municipality) | ≤120 min lag | `lastSyncMinutes > 120` → tenant degraded |
| Audit integrity | always intact | chain verify fails → sev1-class |

SLA compliance % = on-time decided / total decided. Surfaced as a single calm number on `/ops`, tone-coded (≥95 ok, ≥80 warn, else alert).

## 4. Incident management workflow

States: `OPEN → ACKNOWLEDGED → RESOLVED`. Severity escalates `SEV4→SEV1`.

```
 detect/raise ──▶ OPEN ──ack──▶ ACKNOWLEDGED ──resolve──▶ RESOLVED
                   │  └──escalate (sev↑, owner notified)──┘
 every transition: append-only event {at,by,action,note} + audit row
```

- App: `/api/ops/incidents` (+`/ack` `/resolve` `/escalate`), every action hash-chained into the audit trail; verified end-to-end (ack→escalate→resolve, 404 on unknown id, audit chain intact).
- Backend: `Incident` model (Prisma, migration 0003) with RLS parity; `ops:incident` permission required to create.
- UX: incident list on `/ops` with one-click acknowledge/escalate/resolve and an expandable timeline.

## 5. Degraded-mode operations

| Condition | Detection | Operator experience |
|---|---|---|
| DB unreachable | overview `degradedMode` | services show `down`, picture still renders |
| Municipality offline | `lastSyncMinutes > 120` | tenant row red, sev3 incident pattern |
| Audit chain broken | verify fails | sev1 banner on `/ops`, "investigate before trusting downstream" |
| Queue breaching SLA | threshold bar red | "intervene" label, escalation path |
| Connectivity lost (client) | `navigator.onLine` | OfflineBanner: "actions saved, sync on return" |

Failures stay **calm and legible** — one banner, one signal per tile, no alert storm.

## 6. RBAC for operational surfaces

- `ops:read` — view overview/incidents (ministry operator, auditor, platform).
- `ops:incident` — create/escalate/resolve.
- Auditor sees `/audit` + `/ops` read-only; no citizen records appear in any operational metric (verified: only counts, status, latency).

## 7. Operational UX principles (enforced in code)

Calm, focused, actionable. Four headline numbers, status tiles (one dot, one word, one line), quiet threshold bars, progressive disclosure (incident timeline behind `<details>`). No charts-for-charts, no cyberpunk, no autonomous action — AI may summarise/prioritise; humans acknowledge, escalate, resolve.

## 8. Deployment

- `/api/metrics` scraped by the sovereign Prometheus (Helm: add a `ServiceMonitor`/scrape annotation; NetworkPolicy already restricts ingress to the API).
- Grafana dashboards: request rate/latency by route, queue depth vs SLA, incident MTTR, SLA compliance trend, per-tenant health. Dashboards are JSON, sovereign-hosted — no vendor SaaS.
- Alertmanager routes: audit-chain-broken → sev1 page; SLA breach → ops queue; municipality offline → platform on-call.

---

Verified: backend `nest build` green, `/api/metrics` serves real Prometheus output with tenant label, `/api/ops/overview` resilient under DB-down, RBAC 403 enforced; app build green, `/ops` + incident ack/escalate/resolve + audit-chain smoke-tested. Phase gates (Companion 159) unchanged — this is operability for what already ships, not new scope.
