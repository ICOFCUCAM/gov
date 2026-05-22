# CivicOS Substrate

The sovereign operational data plane. Postgres on Supabase, governed by
hand-written SECURITY DEFINER RPC contracts, scoped by RLS, surfaced
through PostgREST views, kept live by Realtime publications.

Project: **civicos** (eu-central-1, `gtgpbokcbngchvoijish`).

## Mental model

| Layer | Role |
|---|---|
| `civicos.*` tables | Source of truth. RLS is enabled on every table. No client ever writes to them directly. |
| `civicos.*` functions | SECURITY DEFINER RPC contracts. The **only** sanctioned write path. Validates inputs, enforces state machines, hashes audit chains, signs identity-bound transitions. |
| `public.civicos_*` views | `security_invoker = true`. Read surface for PostgREST; RLS on the underlying table determines visibility. |
| `public.civicos_*` wrappers | Thin SQL wrappers around each RPC so PostgREST can call them as RPCs. |
| `lib/db/repos/*.ts` | Typed TS surface for the views and wrappers. One call per contract. |
| `services/*.ts` | Application-level singletons (audit ledger, event bus, identity, runtime store) that dual-write via the repos. |
| Surfaces (`/gov/*`, `/wallet/*`) | React surfaces; read via repos, react to Realtime, write via repos. |

## Migrations

All migrations are idempotent on a fresh database. Applied in lexical
order — each new migration appends; nothing is mutated in place except
intentional `CREATE OR REPLACE FUNCTION` updates.

| File | Purpose |
|---|---|
| `20260521000000_civicos_v1_substrate.sql` | 19 tables, enums, FNV-1a, audit chain triggers, RLS enable, Realtime publish, six initial RPCs. |
| `20260521010000_civicos_workflow_runtime.sql` | `sync_workflow_definition`, `open_work_item`, `transition_work_item` (validates against stored definition). |
| `20260521020000_civicos_memory_telemetry.sql` | Directive lifecycle, dispatch lifecycle, escalation lifecycle, telemetry stream + sample contracts. |
| `20260521030000_civicos_citizen_runtime.sql` | `register_citizen`, service request lifecycle, consent grant/revoke (idempotent under unique partial index), appeal file/decide. |
| `20260521040000_civicos_identity.sql` | `civicos.actor_kind` enum, `current_actor`, `claim_citizen`, `link_officer_by_email` (verifies caller's auth email). |
| `20260521050000_civicos_rls_scoping.sql` | Identity helpers + tightened scoped policies on six sensitive tables. **Also fixes a latent bug**: GRANT SELECT on the underlying tables (the security-invoker views needed this). |
| `20260521060000_civicos_officer_admin.sql` | `admin_create_officer`, `admin_deactivate_officer` — gated on `is_platform_officer()`. |
| `20260521070000_civicos_hardening.sql` | Telemetry tables → Realtime; strict-identity overrides on transition/open/dispatch/directive (signed-in callers can no longer impersonate). |
| `20260521080000_civicos_signing_keys.sql` | `officers.signing_public_key jsonb` + `register_signing_key(jwk)` for WebCrypto ECDSA. |
| `20260521090000_civicos_officer_intake_rls.sql` | Officer-side read policies on service_requests / appeals / consents so the intake queue is populated. |
| `20260521100000_civicos_officers_view_signing_key.sql` | Surfaces the officer signing key through the public view. |
| `20260521110000_civicos_signed_steps_view.sql` | `civicos_signed_steps` projection for the SignatureAudit surface. |
| `20260521120000_civicos_transition_signed_at.sql` | Optional `p_signed_at` parameter on `transition_work_item` for ECDSA flows. |
| `20260521130000_civicos_actor_steps_view.sql` | `civicos_actor_steps` per-actor projection driving the ActivityLog. |
| `20260521140000_civicos_telemetry_alert_escalation.sql` | Trigger: telemetry samples crossing the alert threshold auto-record an escalation. |
| `20260521150000_civicos_stale_request_escalation.sql` | `escalate_stale_service_requests` — the SLA cron's underlying RPC. |
| `20260521160000_civicos_rls_initplan_fix.sql` | Wrap `auth.uid()` in `(select …)` for 5 RLS policies (clears `auth_rls_initplan` perf warnings). |
| `20260521170000_civicos_consolidated_select_policies.sql` | Merge citizen + officer SELECT policies on appeals/consents/service_requests into one; split modify per-command (clears `multiple_permissive_policies`). |
| `20260521180000_civicos_fk_indexes.sql` | Add 8 covering indexes for foreign keys flagged by `unindexed_foreign_keys`. |
| `20260521190000_civicos_revoke_anon_writes.sql` | Revoke EXECUTE from `anon` on 32 SECURITY DEFINER write/admin RPCs; keep `civicos_verify_audit_chain` and `civicos_current_actor` open for the Public Observatory. |
| `20260521200000_civicos_revoke_admin_authenticated.sql` | Revoke EXECUTE from `authenticated` on the four admin/cron RPCs (catalog now matches the contract — service_role only). |
| `20260521210000_civicos_audit_witnesses.sql` | `civicos.audit_witnesses` table + `record_witness_attestation` RPC + public view. External-party "I saw the chain at seq N with hash H" attestations; tamper-after-the-fact becomes detectable. Write RPC is intentionally anon-callable. |
| `20260521220000_civicos_admin_bulk_officers.sql` | `admin_bulk_create_officers(p_rows jsonb)` — server-side bulk onboarding wrapper around `admin_create_officer`. Per-row success/failure envelope; service_role bypass for the cron / admin route context. |
| `20260521230000_civicos_citizen_receipt_timeline.sql` | `my_receipt_timeline(p_limit)` — unified citizen-side timeline joining service_requests + consents + appeals + linked work_item_steps. Right-to-take-your-data baked into the substrate. Authenticated only. |
| `20260521240000_civicos_publish_citizen_realtime.sql` | Add service_requests / consents / appeals to `supabase_realtime` so /wallet/receipts updates without polling. RLS still gates each subscriber's stream. |
| `20260521250000_civicos_expire_consents.sql` | `expire_due_consents()` — auto-revokes time-bound consents past their `expires_at` with one audit entry per consent on the citizen's scope. Service-role only; paired with `/api/cron/expire-consents`. |
| `20260521260000_civicos_relock_definer_grants.sql` | Re-lock EXECUTE on bulk-officers / expire-consents (service_role) and receipt-timeline (authenticated). **Gotcha fixed:** `CREATE OR REPLACE FUNCTION` silently re-applies Supabase default privileges (anon+authenticated), undoing any earlier `REVOKE`. Always re-revoke after a replace, and revoke from `PUBLIC` too. |
| `20260521270000_civicos_event_webhooks.sql` | `civicos.event_webhooks` (service-role-only table holding webhook url + secret + cursor) and the register/list/mark-delivered/record-failure RPCs. Listing RPC is secret-free; paired with `/api/cron/deliver-events`. |
| `20260521280000_civicos_service_context_helper.sql` | `is_service_context()` — recognises the PostgREST service_role path (`auth.role()='service_role'`) since SECURITY DEFINER funcs see `session_user='authenticator'`. Retrofitted into webhook + expire-consents + admin-officer RPCs (their `session_user` guards would have rejected real service-role calls). |
| `20260521290000_civicos_webhook_set_active.sql` | `set_event_webhook_active(p_id, p_active)` — platform-tier (or service) pause/resume toggle for a registered federation webhook; paused hooks are skipped by the deliver-events cron without losing their cursor. |
| `20260521300000_civicos_webhook_circuit_breaker.sql` | Self-healing delivery: `record_webhook_failure` trips a circuit breaker after 10 consecutive failures (deactivates the hook + stamps `paused_reason`), so a dead endpoint stops being retried every run. `mark_webhook_delivered` clears the breaker on any 2xx; resume via `set_event_webhook_active` resets the failure state. Adds `paused_reason` column, surfaced through the secret-free listing RPC. |
| `20260521310000_civicos_webhook_delivery_log.sql` | `civicos.webhook_deliveries` (service-role-only) + `record_webhook_delivery_attempt` (cron writes one bounded run-summary row per webhook, auto-trimmed to the last 50) + `list_webhook_deliveries` (platform-tier read). Gives operators the run-by-run delivery history the aggregate counters couldn't. |
| `20260521320000_civicos_citizen_data_export.sql` | `my_data_export()` — a citizen's full self-describing data-portability document (profile + every owned service_request / consent / appeal row + receipt timeline + counts), scoped to `auth.uid()`. Authenticated only; the public wrapper coalesces an unmatched caller to a safe empty document. GDPR-style right-to-take-your-data, one step beyond the timeline. |
| `20260521330000_civicos_log_data_export.sql` | `log_my_data_export()` — appends one tamper-evident audit entry on the caller's own `citizen:<id>` scope recording that they exercised data portability. Keeps `my_data_export` a pure read; this volatile companion writes the access record. Authenticated only; no-ops for a caller with no linked citizen. |
| `20260521340000_civicos_my_audit_trail.sql` | `my_audit_trail(p_limit)` — citizen-scoped read of the tamper-evident audit entries on their own `citizen:<id>` scope (consent expiries, data exports, …), returning the hash chain so the citizen can verify continuity. Scoped to `auth.uid()`; authenticated only. Completes the transparency loop with `log_my_data_export`. |
| `20260521350000_civicos_verify_my_audit_trail.sql` | `verify_my_audit_trail()` — resolves the caller's `citizen:<id>` scope from `auth.uid()` and delegates to the proven `verify_audit_chain`, returning `{entries, intact, broken_at}`. Lets a citizen confirm their own trail's hash-chain integrity without knowing their scope or reimplementing FNV-1a. Authenticated only. |
| `20260521360000_civicos_webhook_rotate_secret.sql` | `rotate_event_webhook_secret(p_id, p_new_secret)` — in-place HMAC secret rotation for a federation webhook (leak response / routine rotation) that preserves the delivery cursor and history, instead of delete + re-register. Platform-tier (or service); secret stays write-only; validates >= 8 chars. |
| `20260521370000_civicos_webhooks_health.sql` | `event_webhooks_health()` — platform-tier fleet roll-up of the registered webhooks: total / active / (manually) paused / circuit-open counts plus cumulative delivered and failure totals, in one summary row. Powers the at-a-glance header on the Federation Webhooks surface. |
| `20260521380000_civicos_expiring_consents.sql` | `my_expiring_consents(p_within_days)` — a citizen's still-active consents whose `expires_at` falls within the window, with `days_remaining`, soonest first. Scoped to `auth.uid()`; authenticated. Powers a proactive "consents expiring soon" warning on the citizen home so a grant doesn't lapse unnoticed. |
| `20260521390000_civicos_extend_my_consent.sql` | `extend_my_consent(p_consent_id, p_new_expires_at)` — push out the expiry on the caller's own still-granted consent in place, instead of re-granting. Owner-scoped via `auth.uid()` (a citizen can never extend another's grant); new expiry must be in the future. Authenticated only; powers the "extend 90d" action on the expiring-soon warning. |
| `20260521400000_civicos_service_sla_stats.sql` | `service_sla_stats(p_charter_id, p_days)` — per-charter AGGREGATE service-delivery stats (volume, ack/resolve counts, median + p90 turnaround hours, oldest open age) over a window. Intentionally anon-callable (Public Observatory) but aggregate-only — no citizen id, ref, or row-level field — so there is nothing personal to leak. Serves the Phase 1 metric "permit median decision time published". |
| `20260521410000_civicos_appeals_stats.sql` | `appeals_stats(p_charter_id, p_days)` — sibling of `service_sla_stats` for the contestation path: per-charter aggregate appeals filed / admitted / decided / published / pending counts, median + p90 days-to-decision, oldest-pending age. Counts use timestamp presence (robust to status vocabulary). Anon-callable, aggregate-only. Publishes contestation-pipeline health. |
| `20260521420000_civicos_service_sla_trend.sql` | `service_sla_trend(p_charter_id, p_weeks)` — weekly buckets (by resolved-week) of resolved count + median/p90 turnaround hours over the last N weeks, so the trajectory of decision times is published, not just a snapshot. Anon-callable, aggregate-only. Powers the decision-time trend chart on the Observatory. |

### Advisor posture after hardening

- **`auth_rls_initplan`** — 0 (was 5).
- **`multiple_permissive_policies`** — 0 (was 3).
- **`unindexed_foreign_keys`** — 0 (was 8).
- **`anon_security_definer_function_executable`** — 6 (was 34); the remaining six are deliberate Public Observatory reads/attestations, each safe for an anonymous caller: `civicos_current_actor` (returns null for anon sessions), `civicos_verify_audit_chain` (public chain-integrity read), `civicos_record_witness_attestation` (external "I saw the chain at seq N" attestation), and the charter-level aggregate stats `civicos_service_sla_stats`, `civicos_appeals_stats`, `civicos_service_sla_trend` (no row-level data).
- **`authenticated_security_definer_function_executable`** — 30 (was 34); the remaining 30 are by design — they are the only way the substrate accepts writes, and each one performs its own identity check before mutating state. Revoking `authenticated` from these would break the application contract; revoking from `anon` is what closes the actual attack surface.

## Identity model

Three actor kinds:
- **anonymous** — no `auth.uid()`. Reads only what the broad anon
  policies allow (institutions, facilities, public directives, etc).
- **citizen** — `auth.uid()` linked to a `civicos.citizens` row.
  Sees only records where `citizen_id = my id`.
- **officer** — `auth.uid()` linked to a `civicos.officers` row.
  Sees their charter's records; "platform-tier" officers
  (`platform-admin`, `noc-officer`, `cabinet-officer`, `auditor`) see
  across charters.

The `current_actor()` helper resolves the calling session to one of
these. Officer takes precedence when both records exist for the same
auth user.

### Bootstrap chain
1. A DBA seeds one initial `platform-admin` officer (one row).
2. That officer signs in → `link_officer_by_email` stamps `auth_user_id`.
3. They provision the rest via `/gov/officers`.
4. Each new officer signs in; their record auto-links.
5. Officers can take signature-worthy actions; their WebCrypto public
   JWK is registered via `register_signing_key` on first sign-in.

## RLS scoping (read)

| Table | Anon | Citizen | Officer (own charter) | Officer (platform-tier) |
|---|:---:|:---:|:---:|:---:|
| institutions / facilities / workflow_definitions | all | all | all | all |
| officers | — | — | own charter + self | all |
| citizens | — | self | — | all |
| work_items | — | own | own charter + assignee + own as citizen | all |
| work_item_steps | — | parent visible | parent visible + own actions | all |
| audit_entries | — | — | scope = own charter / prefix | all |
| dispatches | — | — | issuer/target charter + own officer | all |
| escalations | — | — | source/target charter | all |
| directives | published | published | own charter (incl. drafts) | all |
| federation_events | — | all | all | all |
| posture_history | — | all | all | all |
| telemetry_streams / telemetry_samples | — | all | all | all |
| service_requests | — | own | target = own charter | all |
| consents | — | own | target = own charter | all |
| appeals | — | own | originating = own charter | all |

## Strict-identity overrides

`transition_work_item`, `open_work_item`, `record_dispatch`, and
`record_directive` resolve `auth.uid()` to an officer at the start of
the call. When an officer is signed in, the substrate replaces the
client-supplied actor_id / actor_name / charter / issuer fields with
the resolved officer's values. The caller cannot impersonate.

Anonymous sessions keep legacy behavior — the demo/sandbox paths
continue to operate.

## Signatures

Transitions in `{approve, reject, resolve}` taken by a signed-in
officer carry a signature_hash:

- **Preferred:** ECDSA P-256 over `<actor_id>|<scope>|<ref>|<action>|<at_ms>`,
  computed by WebCrypto with a non-extractable private key in IndexedDB
  on the officer's device. Hex-encoded; 128 hex chars. Verifiable
  offline against `officers.signing_public_key`.
- **Fallback:** FNV-1a digest of the same canonical material. 8 hex chars.
  Tamper-evident but not identity-proof.

Auditors detect the algorithm by hex length.

## Adding a new surface — checklist

1. Add a typed read helper to the appropriate `lib/db/repos/*.ts`
   (use `sb.from('civicos_<table>').select(...)`).
2. If writing: ensure the corresponding RPC exists; if not, write a
   migration that adds it as `SECURITY DEFINER`, validate inputs, and
   register a `public.civicos_<name>` wrapper.
3. Build the component under `src/components/features/`. Use
   `useIdentity()` for the actor, `useRealtimeRefresh()` for live
   updates (or a manual interval for tables not on the publication).
4. Create a page under the relevant route group
   (`app/(gov)/gov/*/page.tsx` or `app/(citizen)/wallet/*/page.tsx`).
5. Add a navigation entry to the appropriate group in
   `components/ui/CommandShell.tsx`.
6. Add an integration test in `lib/db/substrate.test.ts` covering
   the contract end-to-end (skips automatically under sandbox egress
   firewall; runs against the live cluster otherwise).
7. Verify with `pnpm tsc --noEmit` and `pnpm test --run`.

## CSV exports

Most surfaces expose a one-click CSV export of their filtered view:
ActivityLog, AuditCoverageSweep, CharterList, GlobalFeed,
NotificationsCenter, OfficerDirectory, PostureBoard, SubstrateStatus,
TelemetryWall, Watchlist, WorkflowSimulator. JSON exports cover the
full report (AuditCoverageSweep), per-scope chain (AuditExplorer),
single audit entry (AuditEntryDetail), citizen data + audit trail
(CitizenSubstrate), substrate digest (SubstrateStatus), and the full
workflow definition (WorkflowCatalogue).

## Sticky preferences

Most board filters persist per-device via `lib/prefs` (localStorage,
namespaced under `civicos.pref.*`). Filters survive navigation and
reload. Keys in use today:

- `directive.status` · DirectiveBoard status filter
- `dispatch.priority` · DispatchBoard priority filter
- `escalation.openOnly`, `escalation.severity` · EscalationFloor
- `intake.openOnly` · CitizenIntakeQueue
- `workbench.openOnly` · OfficerWorkbench
- `activity.kind`, `activity.signedOnly`, `activity.scope` · ActivityLog
- `alerts.kind` · NotificationsCenter
- `global.kind` · GlobalFeed
- `search.kind` · SubstrateSearch
- `workflow.kind` · WorkflowCatalogue
- `registry.kind`, `registry.activatedOnly` · InstitutionsCatalogue
- `charter.kind` · CharterList
- `posture.charter`, `posture.sort` · PostureBoard

`lib/seen.ts` (alert acknowledgement) and `lib/watchlist.ts` (per-record
stars) live alongside.

## Surfaces (as of the most recent batch)

Officer-side: `/sign-in`, `/gov/home`, `/gov/me`, `/gov/search`,
`/gov/watchlist`, `/gov/alerts`, `/gov/crons`, `/gov/live`,
`/gov/global`, `/gov/substrate`, `/gov/registry`, `/gov/charter`,
`/gov/charter/[id]`, `/gov/officers`, `/gov/officers/[id]`,
`/gov/directory`, `/gov/workbench`, `/gov/workflows`,
`/gov/workflows/simulator`, `/gov/workflows/diff`,
`/gov/items/[ref]`, `/gov/directives`, `/gov/directives/[ref]`,
`/gov/inbox`, `/gov/dispatches`, `/gov/dispatches/[ref]`,
`/gov/escalations`, `/gov/escalations/[id]`, `/gov/intake`,
`/gov/intake/request/[ref]`, `/gov/intake/appeal/[ref]`,
`/gov/posture`, `/gov/telemetry`, `/gov/telemetry/[id]`,
`/gov/federation`, `/gov/federation/[id]`, `/gov/audit`,
`/gov/audit/[scope]/[seq]`, `/gov/audit/sweep`, `/gov/signatures`,
`/gov/activity`, `/gov/constitutional`, `/gov/help`, `/gov/map`,
`/gov/playground`.

Citizen-side: `/wallet/home`, `/wallet/substrate`,
`/wallet/consent/[id]`.

Public: `/public`.

API: `/api/health`, `/api/cron/sla`, `/api/cron/substrate-metrics`,
`/api/cron/posture-digest`, `/api/cron/audit-self`,
`/api/substrate/digest`.

## Original surfaces table (for reference)

| Path | Component | Reads | Writes |
|---|---|---|---|
| `/sign-in` | SignInForm | — | Auth + claim_citizen / link_officer_by_email / register_signing_key |
| `/gov/live` | LiveWall | escalations, dispatches, work_items | — |
| `/gov/substrate` | SubstrateStatus | all 19 (counts) + verify_audit_chain | — |
| `/gov/registry` | InstitutionsCatalogue | institutions, facilities | — |
| `/gov/ledger` | OperationsLedger + SubstrateLedger | work_items | — |
| `/gov/directives` | DirectiveBoard | directives | record_directive, sign_directive, rescind_directive |
| `/gov/dispatches` | DispatchBoard | dispatches | record_dispatch, acknowledge_dispatch, close_dispatch |
| `/gov/escalations` | EscalationFloor | escalations | record_escalation, acknowledge_escalation, resolve_escalation |
| `/gov/audit` | AuditExplorer | audit_entries | (verify_audit_chain) |
| `/gov/telemetry` | TelemetryWall | telemetry_streams, telemetry_samples | define_telemetry_stream, record_telemetry_sample |
| `/gov/officers` | OfficerRegistry | officers | admin_create_officer, admin_deactivate_officer |
| `/gov/posture` | PostureBoard | posture_history | record_posture |
| `/gov/federation` | FederationStream | federation_events | — |
| `/gov/intake` | CitizenIntakeQueue | service_requests, appeals | update_service_request, decide_appeal |
| `/gov/workflows` | WorkflowCatalogue | workflow_definitions | — |
| `/wallet/substrate` | CitizenSubstrate | service_requests, consents, appeals (own) | submit_service_request, grant_consent, revoke_consent, file_appeal |

## API endpoints

All shared-secret-gated (`CIVICOS_CRON_SECRET` env var, presented as
`?token=…` or `Authorization: Bearer …`). They use the service-role
client server-side; the secret never reaches the browser bundle.

### `GET|POST /api/cron/sla?token=…[&hours=NN]`
Calls `civicos_escalate_stale_service_requests(hours)`. Default
threshold 48h. Records a `minor` escalation per stale request,
idempotent per request within 24h. Returns `{ ok, escalated, threshold_hours, at }`.

### `GET|POST /api/cron/substrate-metrics?token=…`
Defines (idempotent) six substrate-level telemetry streams and appends
a sample to each:
- `substrate.work_items.open` (warn 100, alert 250)
- `substrate.escalations.open` (warn 20, alert 60)
- `substrate.dispatches.open` (warn 50, alert 150)
- `substrate.requests.unacked` (warn 30, alert 100)
- `substrate.audit_entries.total`
- `substrate.federation.total`

Samples flow through `/gov/telemetry`; threshold breaches auto-escalate
via the existing telemetry trigger.

### `GET|POST /api/substrate/digest?token=…[&verify=1]`
Programmatic equivalent of the /gov/substrate download digest. Returns
per-view row counts (RLS-unfiltered via service-role) and optionally
the chain integrity sweep across recent scopes. Suitable for archival.

### `GET|POST /api/cron/posture-digest?token=…`
Per-charter posture aggregator. For every activated institution,
computes open / urgent / open-escalations counts and runs a simple
heuristic to produce a `steady` / `elevated` / `crisis` posture +
readiness/stress score, then appends a `posture_history` snapshot.
Produces a continuous timeline on /gov/posture without needing any
operator to manually snapshot. Recommended cadence: 30 min.

### `GET|POST /api/cron/audit-self?token=…`
Heartbeat append to the `substrate:self` audit scope on each run.
Detail carries open work-item count + total audit entries. Gives
the chain coverage sweep a guaranteed sample on every recent run
and gives external monitors a liveness signal in the audit table.
Recommended cadence: 1 h.

### `GET /api/health` (public)
Diagnostic ping with substrate reachability probe. Returns
`{ ok, at, substrate: { configured, reachable, latency_ms } }`.
Safe for unauthenticated monitoring systems.

## Cron recipes

Vercel Cron (`vercel.json`):
```json
{ "crons": [
    { "path": "/api/cron/sla?token=$CIVICOS_CRON_SECRET&hours=48",     "schedule": "0 * * * *" },
    { "path": "/api/cron/substrate-metrics?token=$CIVICOS_CRON_SECRET", "schedule": "*/5 * * * *" },
    { "path": "/api/cron/posture-digest?token=$CIVICOS_CRON_SECRET",    "schedule": "*/30 * * * *" },
    { "path": "/api/cron/audit-self?token=$CIVICOS_CRON_SECRET",        "schedule": "0 * * * *" },
    { "path": "/api/cron/witness-sweep?token=$CIVICOS_CRON_SECRET",     "schedule": "*/15 * * * *" },
    { "path": "/api/cron/witness-divergence?token=$CIVICOS_CRON_SECRET","schedule": "5,20,35,50 * * * *" },
    { "path": "/api/cron/audit-anchor?token=$CIVICOS_CRON_SECRET",      "schedule": "*/10 * * * *" },
    { "path": "/api/cron/expire-consents?token=$CIVICOS_CRON_SECRET",   "schedule": "30 * * * *" },
    { "path": "/api/cron/deliver-events?token=$CIVICOS_CRON_SECRET",    "schedule": "*/2 * * * *" }
] }
```

Supabase scheduled function (pg_cron):
```sql
select cron.schedule('civicos-sla', '0 * * * *',
  $$ select net.http_post(
       'https://<host>/api/cron/sla?token=<secret>&hours=48',
       '{}'::jsonb, '{"content-type":"application/json"}'::jsonb) $$);
```

## Testing

- **Unit tests** (`pnpm test --run`): 727 tests over the runtime logic.
  Substrate is mocked via the `_resetClients()` pathway when env vars
  are absent.
- **Substrate integration tests** (`lib/db/substrate.test.ts`): 17
  properties (REMEMBERS, CHAIN, INTEGRITY, FEDERATION, REGISTRY,
  WORKFLOW, MEMORY × 3, TELEMETRY, CITIZEN × 3, IDENTITY, POSTURE,
  CATALOGUE, CONTRACT). They `describe.skipIf` when the substrate
  isn't reachable (sandbox egress firewall) and pass against the live
  cluster.

## Verifying live

```bash
# In a development environment with public env vars set:
pnpm test --run lib/db/substrate.test.ts
```

Or via MCP, exercise any RPC directly — every contract was proven
end-to-end this way during development.
