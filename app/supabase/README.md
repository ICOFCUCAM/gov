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

## Surfaces

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
