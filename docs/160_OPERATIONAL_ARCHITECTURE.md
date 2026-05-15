# CivicOS — Operational Architecture (Companion 160)

Engineering reference for the deployable backend. Concise and operational, not theoretical. Pairs with the running code in `/services/civic-api`, `/app`, and `/infra`, and the rollout in Companion 159. The doctrine (Companion 158) still binds: humans govern, institutions govern, constitutions govern, AI assists.

---

## 1. Service topology

```
        ┌──────────┐     HTTPS      ┌───────────────┐
 citizen│  app     │ ─────────────▶ │  civic-api     │
 officer│ (Next.js)│ ◀───────────── │  (NestJS)      │
        └──────────┘   JSON / OIDC  └──────┬────────┘
                                           │ Prisma (SQL)
                                ┌──────────▼──────────┐
                                │  Postgres (HA/PITR) │  sovereign-managed
                                └──────────┬──────────┘
                                           │ transactional outbox
                                ┌──────────▼──────────┐
                                │  NATS / Kafka       │  events
                                └─────────────────────┘
        Edge: USSD/IVR/agent gateways → sync API → SyncMutation queue
```

`app` and `civic-api` are stateless and horizontally scaled. State lives in Postgres (authoritative), the message bus (events), and object storage (documents — bytes never in the DB).

## 2. Data architecture

- **Multi-tenant by `Tenant`** (`MUNICIPALITY | MINISTRY | AGENCY | REGION | NATIONAL`), self-referencing for federation (a ministry parents municipalities).
- **Tenant isolation, two walls**: (1) application `TenantContext` scopes every query by `tenantId`; (2) Postgres **Row-Level Security** (`migration 0002`) enforces it even if the app forgets — defence in depth.
- **Append-only**: `Receipt` and `AuditEvent` are hash-chained per tenant (`seq`, `prevHash → hash`) and protected by `DO INSTEAD NOTHING` rules against UPDATE/DELETE. Tampering is *detectable*, not just discouraged — `GET /api/audit/verify` replays the chain and reports the first broken link.
- **Event sourcing where it earns its keep**: permit state lives as a `PermitTransition` log (the timeline citizens see is the event stream). Other entities are CRUD with audit.
- **Retention**: receipts/audit are permanent (constitutional record); `OutboxEvent` is pruned after dispatch + grace; `SyncMutation` after reconciliation + grace. Citizen-erasure requests are honored on PII columns while preserving non-PII audit integrity (tombstone, not chain-break).

## 3. Multi-tenant model

| Concern | Mechanism |
|---|---|
| Isolation | `tenantId` on every scoped row + Postgres RLS policy |
| Shared services | one API/app fleet; tenants are data-partitioned, not infra-partitioned |
| Role scopes | `Role` + `RoleBinding` are tenant-scoped; permissions are flat capability codes |
| Delegated admin | a parent tenant (ministry/region) can hold roles over child tenants |
| Federation | cross-tenant identity via verifiable credentials only — no shared global key |

## 4. Roles & permissions (zero-trust RBAC)

- Every protected handler declares `@RequirePermissions('permit:decide')`. No ambient authority, no implicit admin.
- The principal's permissions are flattened from tenant-scoped role bindings, delivered as OIDC claims.
- Verified behavior: no principal → **401**; principal without the permission → **403**; with it → handler runs.
- Auth seam: `AuthGuard.verifyToken()` is the single place to wire the sovereign IdP's JWKS. Dev mode (`CIVIC_DEV_AUTH=1`) accepts a base64url principal header so the stack runs without an IdP.

## 5. Event-driven architecture

- **Transactional outbox**: domain writes and their events commit in one DB transaction (`OutboxService.enqueue(tx, …)`). No dual-write, no 2PC.
- **Relay** polls `PENDING` and publishes to NATS/Kafka; at-least-once + idempotent consumers. If the broker is down, events stay `PENDING` and drain when it returns — **low-connectivity resilient by construction**.
- Topics are hierarchical (`civicos.permit.decided`) for subject routing.

## 6. Offline & edge

- Edge channels (USSD/IVR/agent/kiosk) submit through a sync API into `SyncMutation` with a client-generated idempotency key (`clientMutId`) and the `baseVersion` the client saw.
- Reconciliation: server-authority for rights-affecting writes; last-writer for benign edits; explicit `CONFLICT` state surfaced to an officer when they disagree. No silent overwrite.
- Receipts and decisions are queued and delivered when connectivity returns; the citizen is never blocked from *starting* an action offline.

## 7. Security

- Zero-trust: deny-by-default NetworkPolicy; explicit allows (api↔pg, api↔nats, ingress↔api).
- Pod security: non-root (uid 10001), `readOnlyRootFilesystem`, dropped capabilities, `RuntimeDefault` seccomp.
- Secrets: never in code/images; `DATABASE_URL` from a k8s secret sourced from the sovereign secret manager (Vault/KMS).
- Edge: `helmet`, strict CORS allowlist, uniform error envelope (no stack traces to clients).
- Observability seams: structured logs, `/api/health/{live,ready}` (ready returns *degraded*, not 500, to avoid LB flapping), audit chain verification endpoint. Metrics/tracing wire to the sovereign OTEL collector.

## 8. Scaling strategy

- Stateless API/app → HPA on CPU (profiles set min/max). Postgres scales via read replicas (audit/officer reads) + connection pooling (PgBouncer in front).
- Outbox relay is singleton-safe via row-level claim; multiple replicas coordinate through the DB, not a leader election dependency.
- Hot tenants are data-partitionable later (schema-per-tenant or shard-by-tenant) without API changes — the `tenantId` boundary is already the shard key.

## 9. Disaster recovery

- Postgres PITR (sovereign-managed); RPO target ≤ 5 min, RTO ≤ 1 h for a region.
- Multi-region (national profile): async replication; documented failover runbook; manual-fallback (paper/USSD) is the floor when all digital paths fail (Companion 27).
- The hash-chained audit + receipts make post-incident integrity verification objective: replay the chain, prove nothing was altered during recovery.

## 10. Deployment scenarios

| Scenario | Infra | Operator | Notes |
|---|---|---|---|
| Small municipality | shared regional Postgres, 2 api / 1 app pods, no PDB | 1 part-time admin | `helm -f profiles/small-municipality.yaml`; ~14 days |
| Mid city | dedicated HA Postgres, 4–16 api pods | small digital team | `profiles/mid-city.yaml`; ~30 days |
| Ministry | parent tenant over municipalities, read replicas, JetStream | ministry IT + Foundation | `profiles/ministry.yaml`; ~60 days |
| National | multi-region A/A, regional Postgres + async repl, NATS supercluster | sovereign cloud team | phased per Companion 159; manual-fallback drilled |

## 11. API governance

- OpenAPI is generated from code (`/api/docs`, `/api/docs-json`) — the contract is not hand-maintained drift. 13 endpoints at v0.1.0.
- Versioned under `/api`; breaking changes ship behind a new version, old version deprecated on a published window.
- Every endpoint: typed Zod input validation, RBAC permission, audit interceptor (mutations), uniform errors.

## 12. What's deliberately not built yet

Per Companion 159 phase gates: no Phase 2+ modules (city ops, ministry systems, national coordination, twins). The schema and topology leave room for them (tenant hierarchy, events, RBAC) without pre-building them. Discipline over speculation.

---

The system runs. `pnpm build` is green for both app and api; the API boots, serves OpenAPI, and enforces RBAC (401/403/allow verified). The database, broker, and secrets are sovereign-managed inputs — the platform consumes them, it does not own the sovereign's substrate.
