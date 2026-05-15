# CivicOS — Platform Operations & Lifecycle (Companion 163)

Operational engineering reference. Concise. Pairs with running code:
`services/civic-api` (`PlatformOpsModule`: release/deployment/lifecycle/backup/
config services, migration 0005, RBAC) and `app` (`/platform` operator
console + mirrored `/api/platform/*`). No doctrine — Companion 158 binds:
humans approve releases and lifecycle changes; the platform records and gates.

---

## 1. Release governance

`Release(version, channel, status, schemaMigration, approvedBy)`.

```
DEV ──promote──▶ STAGING ──promote (named approval gate)──▶ STABLE
```

- Created in DEV; promotion is explicit. Reaching **STABLE requires a named approver** (`approvedBy`) — controlled evolution, never automatic.
- `schemaMigration` declared so a deployment can verify migration discipline before rollout.
- Verified: create→dev, bad semver→422, promote→stable with approver recorded.

## 2. Deployment orchestration (gated state machine)

```
PENDING → PRECHECK → ROLLOUT → VERIFY → COMPLETED
   └──────────── (failed gate / operator) ──────────▶ ROLLED_BACK
```

- Strategies: `ROLLING | CANARY | BLUE_GREEN`.
- Every `advance` records a verification **gate** result `{at,gate,result,by,note}`. A `fail` gate or an explicit rollback moves to `ROLLED_BACK` — reversible by construction.
- Terminal states reject further transitions (409).
- Verified: full pass path to COMPLETED, advance-past-terminal→409, gate-fail→ROLLED_BACK.

## 3. Tenant lifecycle

Guarded transitions with an append-only ledger (audit continuity spans the tenant's whole life):

```
PROVISIONING → ACTIVE → { SUSPENDED ↔ ACTIVE } → DECOMMISSIONED
DECOMMISSIONED → ACTIVE   (explicit, audited recovery)
```

Illegal jumps are rejected (e.g. SUSPENDED→PROVISIONING → 409). Every transition records `{from,to,reason,actor,at}`. Verified.

## 4. Backup & disaster recovery

`BackupRecord(kind, status, location, encrypted, contentHash)`.

- Bytes live in the **sovereign object store**; only the encrypted-snapshot reference + integrity hash are recorded.
- `FULL | INCREMENTAL`; `PENDING → COMPLETED` (storage callback) → `RESTORING` on restore.
- Restore only from `COMPLETED`. Tenant-aware, RLS-isolated. DR runbook: regional failover + degraded-mode continuity (Companion 27/160); the hash makes post-recovery integrity objective.

## 5. Configuration & policy propagation

`ConfigBundle(scope, version, contentHash, signature, status)`.

```
DRAFT → SIGNED (signer attests over contentHash) → APPLIED (supersedes prior)
```

- **Unsigned config never applies.** Apply supersedes the previous APPLIED bundle.
- **Drift** = newest SIGNED desired hash/version ≠ currently APPLIED. `GET …/config/drift` reports it. Verified: publish→no-drift, sign→drift, apply→in-sync.
- GLOBAL bundles + TENANT-scoped overrides.

## 6. API governance & security (inherited)

All `/api/platform/*` endpoints carry RBAC permissions (`platform:release`, `platform:deploy`, `tenant:lifecycle`, `backup:manage`, `config:manage`), Zod validation, `X-API-Version`, rate-limit headers, and hash-chained audit (Companions 160–162). Verified: 403 without permission; 39 OpenAPI paths.

## 7. Infrastructure operations

Deployment targets are the Helm chart + profiles (Companion 160 `infra/`): small-municipality / mid-city / ministry / national. Sovereign-portable (Kubernetes-native, vendor-neutral); no hyperscaler lock-in. Cluster/rollout visibility rolls up into the Operations Centre (Companion 161); platform-ops actions appear in the tamper-evident trail and Prometheus metrics.

## 8. Operational UX

`/platform` — one calm OperatorShell console, five tabs (Releases, Deployments, Lifecycle, Backups, Config). Explicit state chips, gate timelines behind `<details>`, drift banner, named approvals. No DevOps chaos board, no alert storm.

## 9. What this is not

Not autonomous infrastructure governance, not uncontrolled automation. Humans approve releases, govern environments, run lifecycle transitions, and own incidents. AI may summarise and recommend (Companion 161); it does not promote, deploy, or decommission.

---

Verified: backend `nest build` green, RBAC 403, 39 OpenAPI paths, state-machine + validation guards; app build green, full release→stable, deployment pass-path + gate-fail rollback, lifecycle legal/illegal transitions, backup restore, config publish→sign→apply→drift loop, audit chain intact (18 events). Phase gates (Companion 159) unchanged — lifecycle management for what already ships.
