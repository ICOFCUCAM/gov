# Institutional baseline audit — Part C: production/demo isolation, audit coverage, security and independence gap register

Step I0 (read-only), spec Part 6 audit items 4 and 5. Repository state as checked out on 2026-10-21
(`/home/user/gov`, Next.js app in `app/`). No file in the repository was changed. Paths below are
relative to `app/src/` unless they start with `app/` or `docs/`.

Method: `grep`/`rg` over `lib/` and `app/api/`, plus two small working scripts of the audit session (not kept in the repository)
(`cov4.mjs`: per-method call-graph walk from each route handler to `recordAudit()`/`appendAudit()`/
`auditRepo()`, following named imports and barrel re-exports; and a grep of every GET route in
personal-data domains for `recordAccess(`). Heuristic results were then checked by hand; anything
marked "verified" was read in the source.

---

## 1. Production / demo isolation

### 1.1 The one decision point

`lib/ops/mode.ts:33-42` — `modeDecision()`, `installationMode()`, `samplesAllowed()` (`!== 'production'`).
Unset in a production build fails closed to production (`mode.ts:36`) and warns at start
(`instrumentation.ts:29-32`). 43 non-test files read it.

### 1.2 Every path that creates sample, demo or simulated data

| # | Path | What it creates | Guard | Proving test |
|---|---|---|---|---|
| 1 | `lib/data/store/state.ts:38-120` `seed()` | sample permits, bills, receipts, notifications, incidents, integrations, grants, webhooks, releases, configs, tenant sync | `samplesAllowed()` at `state.ts:44`, `only()` wrapper | `lib/data/store/seed-mode.test.ts:10-23` (all ten arrays empty in production; institutions kept as structure) |
| 2 | `lib/data/store/seeds.ts:11-13` `seedQueue()`; `:60` `seedIncidents()` | example ministry queue items (`source: 'sample'`) and active incidents | `samplesAllowed()` | `seed-mode.test.ts:20-21` |
| 3 | `lib/data/store/national.ts:79-82` `countedQueue()`; `:242`, `:492` | posture computed from queues | production counts only `source` ≠ sample | none specific (covered indirectly by `lib/gov/executive-posture.test.ts` production case) |
| 4 | `lib/casework/demo-pack.ts:44-45` `loadDemoPack()` | demo cast + sample acts/procedures + one `source: 'sample'` case per procedure | `samplesAllowed()`; route `app/api/demo/pack/route.ts:18` 404 | `lib/casework/demo-pack.test.ts:45-47` |
| 5 | `lib/casework/demo.ts:109,115` `sampleDesignationAct()`, `loadDemonstration()` | sample laws (`source: { kind: 'sample' }`, `demo.ts:157`) and procedures | `samplesAllowed()` | `lib/casework/demo.test.ts:48-50` |
| 6 | `lib/auth/demo-cast.ts`, `lib/auth/officials.ts:161,827` | demo officials (`demo: true`) | creation refused in production (`officials.ts:827`); every sign-in path and `currentOfficial()` refuse a cast account (`officials.ts:340,710,740`; `lib/auth/official.ts:66`) even if persisted from a demo run | `lib/auth/demo-cast.test.ts:75`; `app/api/demo/routes.test.ts:50-51` |
| 7 | `app/api/demo/cast`, `act-as`, `pack` routes | switching to cast | `samplesAllowed()` 404 in each route + middleware `DEMO_API` 404 (`middleware.ts:242`) | `middleware.test.ts:439-440`, `app/api/demo/routes.test.ts:50` |
| 8 | `lib/auth/citizen.ts:13`, `lib/data/store/permits.ts:29` | demo citizen session | `samplesAllowed()`; middleware `CITIZEN_DEMO*` (`middleware.ts:356,361`) | `seed-mode.test.ts:22` (`getSession()` unauthenticated) |
| 9 | `lib/data/store/permits.ts:124,135` | `VC-`/`REV-` demo verification codes | `samplesAllowed()` | — (no production test found) |
| 10 | `lib/data/store/payments.ts:44-62` `payBill()` | simulated payment receipt (`simulated: true`), bill set `paid` | **store function unguarded**; route guard `app/api/payments/route.ts:33` (production 409) and `:34` (tax/customs bills never) | `app/api/payments/route.test.ts:51-58` (production assertion is conditional: `if (general)` at `:57`) |
| 11 | `lib/tax/register.ts:207`, `lib/customs/register.ts:228` | reconciliation of receipts | simulated receipt skipped when `!samplesAllowed()` | `lib/tax/register.test.ts:30-34`; `lib/customs/register.test.ts:39-45` |
| 12 | `lib/data/updates.ts:231-232` `seedUpdates()` | Update Center sample history (releases, sandbox nation, installs, requests) | `samplesAllowed()` → `productionUpdates()` (`:217-228`) | `lib/data/updates-mode.test.ts:16-33` |
| 13 | `lib/data/security-store.ts:152`, `support.ts:64`, `advisories.ts:27`, `comms.ts:40`, `supply-chain.ts:163` | security orders, tickets, advisories, comms officials, escrow reviews | `samplesAllowed()` | `updates-mode.test.ts:28-32` |
| 14 | `lib/data/updates.ts:1159-1160` `simulatedRestorePoints()`; `:1195-1197` | simulated restore point | not mode-guarded: allowed for any non-home nation, or for the home nation when `CIVICOS_RESTORE_POINTS=simulated` (env only); `:748-749` refuses a simulated point at install otherwise | `lib/data/resilience.test.ts`, `app/api/releases/*` (env stub) |
| 15 | `lib/data/updates.ts:109` `DEFAULT_SETTINGS.healthSource: 'simulated'`; `:225` production home nation takes `DEFAULT_SETTINGS`; `:1396-1402` watchdog | **simulated health reports drive probation of the installed nation in production** | none — see gap G-D1 | none; tests switch to `agent` first (`app/api/releases/agent.route.test.ts:30`) |
| 16 | `lib/data/store/ministries.ts:183-230,257-293` `ministryOperations()`, `regionsFor()`, `analyticsFor()` | generated KPIs, queue depths, alerts, regional figures from `seededInt()` | none; page labels it (`app/(ministry)/control/page.tsx`, two `SignalTag kind="sample"`), the JSON from `app/api/org/ministries/[id]/operations|regions|analytics` carries no `kind` marker | none |
| 17 | `lib/twin/register.ts:149,158` observation `method: 'simulation'` | simulated twin observations | accepted in any mode, labelled `simulated` by `kindOf()` | `lib/twin/signal.test.ts` (labelling) |
| 18 | `app/supabase/migrations/20260521870000_civicos_seed_institutions.sql:18,38` | 24 canonical institutions into the substrate | none (structure, not samples; same position as `seed-mode.test.ts:18-19`) | — |
| 19 | `lib/data/store/federation.ts:249,277` | integration approval owners | production requires approved owners | `lib/data/integration-approval.test.ts` |
| 20 | `lib/exchange/services.ts:160` | legacy integrations without purposes | refused in production | `lib/exchange/services.test.ts` |
| 21 | `lib/records/decisions.ts:86`, `lib/records/documents.ts:61` | decisions sealed with development key; unencrypted documents | refused in production | `lib/records/decisions.test.ts`, `lib/records/documents.test.ts` |

26 test files stub `CIVICOS_MODE=production` (`grep -rln "CIVICOS_MODE', 'production'"`).

### 1.3 The two questions asked

**Can a simulated payment settle a bill in production?** Not through any route: `POST /api/payments`
refuses before `payBill()` (`app/api/payments/route.ts:33`), and the only caller of `payBill()` outside
tests is that route (`grep payBill(`). Tax and customs reconciliation skip `simulated` receipts in
production (`lib/tax/register.ts:207`, `lib/customs/register.ts:228`, tests above). Residual weaknesses:
- `payBill()` itself (`payments.ts:44-62`) has no mode check: any future caller in production would mark
  a bill `paid` with a simulated receipt (defence in depth missing).
- Even in demo, `payBill()` marks a tax/customs bill `paid` while reconciliation does not post it
  (`route.test.ts:60-62` asserts this store behaviour), so the bill state and the ledger disagree.
- The production assertion in `route.test.ts:56-57` is conditional on a sample bill existing.
- Simulated receipts persisted from a demo run stay in `receipts` after a switch to production; general
  (non-tax) bill status is not re-derived.

**Can a sample record enter a production register?** Not by creation in a production run: every creator
of samples is guarded (table rows 1-8, 12-13), case `source` is never taken from a request body
(`app/api/cases/route.ts:27-32`, `app/api/citizen/applications/route.ts:38` forces `citizen`). But:
- `openCase()` accepts `source: 'sample'` in any mode (`lib/casework/engine.ts:185`), and `act()` and the
  procedure effects never check `source` (only `lib/casework/twin.ts:27` and retention `engine.ts:473`
  skip samples). A sample case decided in a demo run writes the civil / organisations / professions …
  register through its effect, and the register entry carries **no sample marker** (`grep sample` in
  `lib/civil/` returns nothing).
- State carried across a mode change is not inspected: nothing compares the mode a snapshot or backup
  was made in with the running mode. The backup manifest's `mode` is the storage mode
  (`lib/data/backups.ts:309`: snapshot vs postgres), not the installation mode, so a demo backup
  restores into a production installation without refusal.
- Spec Part 4 test 15 ("test election results cannot enter a production register") cannot be tested:
  there is no election register.

---

## 2. Audit coverage

### 2.1 Mutating routes and the audit chain

Measured: 220 route files export POST/PUT/PATCH/DELETE. The call-graph walk finds an audit write
reachable from every mutating method in **184**; **36** have none reachable. Breakdown of the 36:

- **19 cron jobs** (`app/api/cron/*`, exported as `cronRoute(...)`, which the walk cannot follow).
  Each has a run record (`lib/ops/cron-runs.ts`, no audit-chain write). Checking each route's imported
  modules by hand: `backup`, `case-deadlines`, `deliver-messages`, `promote-directives`, `retention`,
  `site-feeds`, `twin-ingest`, `update-watchdog` reach `recordAudit`; `audit-anchor`, `audit-self`,
  `deliver-cloudevents`, `deliver-events`, `expire-consents`, `posture-digest`, `sla`,
  `substrate-metrics`, `telemetry-stale`, `witness-divergence`, `witness-sweep` do not write the platform
  chain (several write the substrate's chain in SQL, e.g. consent expiry
  `app/supabase/migrations/20260521280000_civicos_service_context_helper.sql:137-141`).
- **No state change** (correctly unaudited): `audit/proof`, `auth/passkeys/options` (challenge),
  `documents/verify`, `facilities/check`, `health` (`POST = GET`, `health/route.ts:128`),
  `public-sites/[id]/translations/[locale]/xliff` (checks only; becomes a proposal elsewhere),
  `substrate/digest`, `twin/sta/v1.1` PATCH/PUT (405).
- **Recorded in another log**: `exchange/services/[service]` (exchange log with signed receipt,
  `lib/exchange/log.ts`), `audit/witnesses` and `audit/witnesses/keys` (substrate chain via
  `civicos_register_witness_key` → `append_audit`, migration `20261024100000_civicos_witness_signed_only.sql`),
  `oauth/token` and `federation/webhooks/test` (operator logger only), `releases/telemetry` (sovereignty
  egress log, `lib/data/sovereignty.ts:38-41`).
- **Unaudited changes or privileged operations — gaps:**
  - `app/api/admin/officers/bulk/route.ts:18` — bulk officer creation in the substrate with a shared
    `CIVICOS_PROVISIONING_SECRET` or platform session; the RPC
    (`migrations/20260521220000_civicos_admin_bulk_officers.sql:107`) writes no audit entry. A privileged
    account operation with no audit trail. **High.**
  - `app/api/substrate/export/route.ts:22-32` — full service-role dump of `institutions`, `officers`,
    `citizens`, `consents`, `service_requests`, `appeals`, audit and more, behind one shared bearer secret;
    no audit entry, no access-log entry, not institution-scoped. **High.**
  - `app/api/municipalities/route.ts` → `lib/data/store/permits.ts:158-197` `onboardMunicipality()` stores
    nothing but answers `status: 'provisioned'` with a 14-day go-live estimate. **Low** (honesty).

Audit entry shape (`lib/data/store/audit.ts:23-26,38-40`): actor, action, resource, outcome, detail,
seq, prevHash, hash. Against spec Part 5 H "Tamper-evident audit" it lacks a separate institution,
purpose/authority, correlation id and result code (they appear, if at all, inside `detail`). Integrity:
SHA-256 v2 chain, signed heads, external anchors and RFC 3161 time-stamps (`lib/audit/sign.ts`,
`anchor.ts`, `tsa.ts`; `docs/INTEGRATION_REGISTER.md` 1.30), substrate append-only triggers
(`migrations/20260521000000_civicos_v1_substrate.sql:323-327`) and third-party witnesses.

Reading the chain: `app/api/audit/route.ts` `GET` has no role or institution rule (any signed-in official,
or anyone when sign-in is open) and the read is not logged; entries from courts, the legislature and
independent bodies are included (metadata only, e.g. `lib/immigration/register.ts:106`). The substrate
chain is readable by every authenticated role (`migrations/20260521000000_civicos_v1_substrate.sql:591`
`using (true)`).

### 2.2 Personal-data reads and the access log

`recordAccess()` (`lib/records/access-log.ts:73`) is called from 11 route files: `access-log`,
`cases/[id]`, `cases/[id]/documents/[doc]`, `civil`, `customs`, `education`, `immigration`,
`organisations/[id]`, `professions`, `tax`, `org/ministries/[id]/queue`. Actions used: `view`, `search`,
`refused`; **`export` and `permission` are declared (`access-log.ts:24`) but never written** anywhere.

Reads of personal data that are **not** logged (verified):

| Route | Personal data returned | Note |
|---|---|---|
| `app/api/cases/[id]/route.ts:36` | full case incl. `personal` fields, subject, applicant | logged only when `sensitivity !== 'normal'`, refused, or under a relationship; a normal case's personal fields are read unlogged — contrary to CLAUDE.md "every read of personal data in a case" |
| `app/api/cases/route.ts:15-21` | subject/applicant names of normal cases (`lib/casework/view.ts:16-18`) | list/filter queries not logged as `search`; restricted cases appear with `(restricted)` names |
| `app/api/parcels/[pid]/route.ts:16-22` | rights and holders (`canSeeParcelRights`) | not logged |
| `app/api/permits/route.ts:10`, `permits/[id]/route.ts:8-16` | `applicantName`, form fields | read rule only, not logged |
| `app/api/payments/route.ts:17-21` | bills with `payer` for the issuing institution | not logged |
| `app/api/auth/officials/route.ts` | officials' emails, roles | administrators; not logged |
| `app/api/substrate/export/route.ts` | citizens, officers, consents | not logged, not audited (above) |
| `app/api/audit/route.ts` | actor names across institutions | not logged |

Failed authorisation: refusals are logged in the access log for case and register reads (above) and in
the audit chain for sign-in (`lib/auth/officials.ts:343` `auditRefusal`, `lib/auth/oidc.ts:314-427`,
two-step, passkeys, account changes). Not logged: the middleware's 403 for every API change
(`middleware.ts:189-191` `roleGate`), the routes' `refusal()` / `readRefusal()` 403
(`lib/auth/official.ts:111-115`), and the exchange's unauthenticated calls, which are only counted
(`docs/INTEGRATION_REGISTER.md` 1.33). Where refusals are logged they carry the record reference and the
rule, never the content (`access-log.ts:29-52`) — the shape the spec asks for.

---

## 3. Security and independence gap register

Severity: **High** = a spec acceptance test fails or a control can be bypassed by one person;
**Medium** = partly met, evidence or enforcement incomplete; **Low** = honesty, hygiene or reporting.
Step = build step in `docs/INSTITUTIONAL_ARCHITECTURE_PLAN.md` §5 (I1–I11), or "I0+" for a fix small
enough to land with the acceptance register before I1.

### 3.1 Part 4 G — mandatory acceptance tests (15)

| # | Requirement (short quote) | Current state (evidence) | Gap | Sev | Step |
|---|---|---|---|---|---|
| 4.1 | "executive-wide administrator cannot read a protected parliamentary, judicial or independent-investigation record" | `reaches()`/`caseReadRefusal()` in `lib/auth/roles.ts`; `lib/auth/negative-authorization.test.ts:92,129`; queue refusal logged | Platform audit chain readable by any official incl. independent bodies' entries (`app/api/audit/route.ts`); `substrate/export` dumps all institutions with one secret | Medium | I8 |
| 4.2 | "independent institution can manage its own users without … authority over another" | `accountChangeRule()` `roles.ts:440-446`; `lib/auth/account-changes.ts`; tests `negative-authorization.test.ts:151-195` | Substrate bulk officer route (`admin/officers/bulk`) bypasses `accountChangeRule()` and audit | High | I0+ / I8 |
| 4.3 | "election result cannot be silently overwritten" | no election register (`grep election` finds no workflow) | not built | Medium (scheduled) | I11 |
| 4.4 | "audit finding remains under the audit institution's control" | no audit-engagement workflow | not built | Medium | I8 |
| 4.5 | "privacy authority's investigation access is scoped and recorded" | access log readable by data-protection authority (`roles.ts:801-805`); relationship reads logged (`negative-authorization.test.ts:299`) | no investigation procedure; access-log reads by the authority are logged but no purpose-scoped investigation grant | Medium | I8 |
| 4.6 | "complainant's protected identity is not exposed through ordinary case search" | `listView()` masks names only for non-normal sensitivity (`lib/casework/view.ts:14-18`) | no protected-identity field class; a normal-sensitivity complaint lists the complainant's name; `FieldSpec.personal` hides fields, not parties | High | I1 (field class) + I8 |
| 4.7 | "whistleblower identity is not automatically included in an ordinary case export" | no case export exists; no whistleblower/protected-identity concept (`grep -ri whistleblow lib` = 0) | not built; must be designed into the export (3.3 E-1) | High | I1 + I8 + I9 |
| 4.8 | "statistical release preserves its methodology, version and revision history" | twin scenarios keep versions + SHA-256 (`lib/twin/scenarios.ts`) | no statistical release record | Medium | I3 / I8 |
| 4.9 | "regulator cannot impose a sanction or alter an approved tariff without … authority and workflow" | `powerRefusal()` (`lib/permits/authority.ts`), rules approved/cited (`lib/law/rules.ts`), `lib/permits/cycle3-production.test.ts` | no sanction workflow; tariffs covered | Low | I8 |
| 4.10 | "shared payroll or payment infrastructure cannot change the originating institution's approved decision" | payments only record receipts against a liability reference (`payments.ts:74-95`); decisions sealed (`lib/records/decisions.ts`) | no payroll; no explicit test | Low | I5 |
| 4.11 | "two-person approval … rejected when the same person attempts both steps" | `lib/casework/dual-control.test.ts`, `lib/law/policy-change.ts`, relationships `negative-authorization.test.ts:350` | `independence` is recorded (`lib/data/dual-control.ts:42-46`) but never enforced: a single administrator can create a second local account (`accountChangeRule` returns null inside an executive ministry, `roles.ts:443`) and pass every two-person control with `accounts-only` independence | High | I0+ (policy option "require identity-provider independence") |
| 4.12 | "technical operator cannot silently rewrite protected audit history" | hash chain, signed heads, anchors, TSA, witnesses (§2.1); `lib/audit/replay.test.ts`, `sign.test.ts`, `tsa.test.ts` | holds when `CIVICOS_AUDIT_KEY`/KMS, anchor file and TSA are configured; the default env key is generated per process (`production: false`), and nothing refuses production without a real audit key (unlike `decisions.ts:86`) | Medium | I9 |
| 4.13 | "institution can export its records, signed documents and provenance" | backups are whole-platform (`lib/data/backups.ts`); evidence packs are per release (`lib/data/evidence.ts`); `substrate/export` is whole-substrate | no institution-scoped export | High | I9 (I4 for Health first) |
| 4.14 | "failed authorisation attempts are logged without exposing the protected content" | case/register refusals and sign-in refusals logged (§2.2) | middleware and `refusal()` 403s unlogged; exchange unauthenticated calls only counted | Medium | I0+ |
| 4.15 | "demo records, simulated officials and test election results cannot enter a production register" | creators guarded (§1.2); demo accounts refused at runtime | sample cases' register effects unmarked; `openCase` accepts `source: 'sample'` in production; no installation-mode check on restore; no election register | Medium | I0+ / I4 |

### 3.2 Part 5 L — architecture acceptance tests (16)

| # | Requirement (short quote) | Current state (evidence) | Gap | Sev | Step |
|---|---|---|---|---|---|
| 5.1 | "install … operate an authorised service without another institution being online" | deployment profile `lib/nation/deployment.ts`; portability tests `lib/nation/portability.test.ts` | no declared Institutional Edition; not tested as a standalone install | Medium | I4 |
| 5.2 | "federation … without changing the original institution or record identifiers" | stable institution ids (`lib/institution/federation.ts`), case ids uuid7 (`engine.ts:204`) | no test of joining a federation | Low | I9 |
| 5.3 | "remote institution cannot query protected records without a valid, purpose-limited authorisation" | `callService()` purposes + two-official approval; `federationCheck()` default deny (`lib/data/store/federation.ts:383-392`); usage policies | covered for services; no field-level record retrieval yet ("no data service answers a scope yet", INTEGRATION_REGISTER 1.33) | Low | I9 |
| 5.4 | "event retry cannot duplicate a legally material action" | `idempotencyKey` + `expectedVersion` on `openCase`/`act` (`engine.ts:192-194,248-251`), `engine.test.ts:41-51`, `replay-isolation.test.ts:26-27`; outbox dedupe by `(restoreepoch, auditseq)` and id for consumers (`lib/events/outbox.ts:45-50`) | no inbound event processing at all, so no receiver-side duplicate detection or accept/reject/pending record; idempotency key optional on routes | Medium | I9 |
| 5.5 | "revoked institutional relationship stops new exchanges while preserving prior records" | relationship suspension stops its grant and keeps versions (`portability.test.ts:389-408`); integration suspension stops machine reads (`lib/twin/machine-read.test.ts:131`); revoked grant refused (`federation.ts:392`) | exchange services are tied to integrations, not to the relationship register: withdrawing a relationship does not stop `callService()`; no test for a revoked federation grant at `/api/federation/exchange` | Medium | I9 |
| 5.6 | "migrated record retains its source, transformation history and verification status" | case import keeps file SHA-256 and withdrawal (`lib/data/case-import.ts`); org import dual-confirmed | no migration manifest; per-record provenance not kept beyond `source: 'imported'` | Medium | I9 |
| 5.7 | "correction produces an auditable new state" | versions kept across registers, laws, policy, relationships, legislature | — | Low | — |
| 5.8 | "export structured records, documents, schemas and audit evidence" | see 4.13 | no institution export | High | I9 |
| 5.9 | "exported record can be validated without … the original production interface" | decision seals carry `publicKeyPem` (`lib/records/decisions.ts:101`); offline audit replay (`lib/audit/replay.ts`); certificates verify only online (`lib/records/certificates.ts:81`) | no package to validate; certificate check needs `/verify` | High | I9 |
| 5.10 | "backup can be restored into a clean environment using documented procedures" | verified dry-run restore into scratch store/schema (`lib/data/backups.ts`, `docs/DISASTER_RECOVERY.md`) | restore is whole-platform; no institution-specific restore | Medium | I9 |
| 5.11 | "restored environment preserves record relationships and audit-integrity verification" | restore checks chain and part hashes; outbox epochs | demo/production mode of a backup not recorded or checked (`backups.ts:309`) | Medium | I0+ |
| 5.12 | "privileged access and key-management operations are recorded and independently reviewable" | sign-in, account changes, backups, restores audited; `confirmByOversight()` for log shortening | key operations not audited (`lib/keys/custody.ts:200-212` `rotateDataKey()`, first-key creation `:246`); provider chosen by env only; bulk officer creation and substrate export unaudited; audit chain has no reviewer-only view and no record of who controls keys | High | I8 / I9 |
| 5.13 | "operate in a declared degraded state without claiming that unavailable checks succeeded" | fail-closed examples: sessions refused when the register is unreadable (`lib/auth/official.ts:56-57`), state writer refuses changes (`lib/data/persist.ts:518`, `middleware.ts:186`), decisions/documents refuse without keys | **production Update Center passes probation on simulated health checks** (`updates.ts:109,225,1340-1348,1396-1402`: error rate and latency always `ok: true`); generated KPIs in the operations JSON without a marker (`ministries.ts:197`); `onboardMunicipality()` reports `provisioned` | High | I0+ (default `agent` in production) / I3 |
| 5.14 | "upgrade detects incompatible schema or policy changes before they corrupt production records" | `compatibleWithPrevious` from declared migrations (`updates.ts:84-86`); preflight on customisations (`lib/data/readiness.ts`); `withDefaults()` for old snapshots; backup manifest lists record-schema version (`lib/backup/state.ts:142-161`) | compatibility is declared, not detected: no check of approved procedure packages, rules, field contracts or record schemas against the target release | Medium | I9 |
| 5.15 | "disconnected institution can receive a controlled software update and verify its authenticity" | mirror custody chain with seal numbers (`lib/data/mirror.ts:114-138`); SLSA provenance and escrow records | DSSE signature is a placeholder (`lib/data/supply-chain.ts:101-109`), digests are synthetic (`:59-63`), SLSA L3 "claimed; … placeholders" (`:75`); media check compares a typed seal number, not content hashes or signatures | High | I9 |
| 5.16 | "shared services cannot override institution-specific legal authority or decision ownership" | owners from `authorityFor()`, `powerRefusal()`, decisions classified (`lib/permits/decisions.ts`), administrators have no domain authority | — | Low | — |

### 3.3 Further requirements (kernel, federation, portability, keys, privileged administrators)

| ID | Requirement (short quote) | Current state (evidence) | Gap | Sev | Step |
|---|---|---|---|---|---|
| K-1 | Key management: "Who controls encryption keys … whether … institution-controlled or shared"; "shared platform operator should not automatically possess unrestricted access to every institution's decryption keys" | one platform KEK and four signing keys for the whole installation (`lib/keys/custody.ts:4-11,35`); vault/KMS supported | no per-institution key or key manager; independent institutions share the operator's keys; no recorded key-control decision | High | I9 |
| K-2 | "How keys are rotated … how access is approved and audited … revoked" | `rotateDataKey()` exists, not exposed by a route, not audited (`custody.ts:200-212`); env rotation via `_PREVIOUS` | no audited, two-person key ceremony; no revocation record | High | I9 |
| K-3 | Independent review of key-management and privileged operations (5.12) | audit chain + access log; access log hidden from administrators (`roles.ts:801-805`) | no reviewer role or view for privileged operations; `/api/audit` open to every official (§2.1) and unlogged | Medium | I8 |
| K-4 | Audit chain production key | env key generated per process when unset (`lib/audit/sign.ts:13-14`) | production start does not refuse a development audit or exchange key (only decisions do, `decisions.ts:86`); marked `production: false` only | Medium | I0+ |
| P-1 | Privileged admin: "No single administrator should be able to change a legal mandate, grant themselves unrestricted data access, alter a protected record and erase the audit evidence" | legal terms through `policy-change.ts` (two officials); audit shortening needs oversight; administrators have no domain authority | one administrator can create accounts and roles in any executive ministry alone (`roles.ts:440-443`), including a second identity that satisfies dual control (4.11) | High | I0+ |
| P-2 | "genuinely distinct" identities in two-person approval | `independenceOf()` recorded on decisions, policy changes, organisations, profile approvals | never enforced; no country policy to require `identity-provider` | High | I0+ |
| P-3 | Shared secrets for privileged machine routes | `CIVICOS_PROVISIONING_SECRET` (`admin/officers/bulk`), `CIVICOS_EXPORT_SECRET` (`substrate/export`, `substrate/digest`) | one secret grants whole-substrate export or officer creation, no named person, no audit | High | I0+ |
| F-1 | Event envelope: `event_id`, `schema_version`, `source_institution_id`, `legal_context`, `payload_reference`, `integrity.signature_reference` | CloudEvents 1.0 with `auditseq`, `restoreepoch` (`lib/events/outbox.ts:35-55`); `source` is the fixed `/civicos/platform` (`:15`); payload carries actor and free-text detail (`:84`); delivery signed HMAC-SHA256 per webhook (`lib/events/deliver.ts:73`) | no institution source, schema version, legal context or payload reference; HMAC is a shared secret, not a verifiable signature; actor names and details go to every subscriber | Medium | I9 |
| F-2 | Receiver: "authenticate … validate … signature … check authority … detect duplicate event IDs … record acceptance, rejection or pending" | case feed and site feed accept signed requests (RFC 9421, INTEGRATION_REGISTER 1.33); case import rejects duplicate references (`case-import.ts:89`) | no inbound event receiver; no accept/reject/pending ledger | Medium | I9 |
| F-3 | Revoked relationship stops exchanges | see 5.5 | services not bound to relationships | Medium | I9 |
| E-1 | Portable record package (records, versions, documents, signatures, relationships, workflow history, legal versions, audit evidence, schemas, manifest, checksums, validation report) | pieces exist: backups (encrypted, hashed parts), evidence packs (SHA-256 manifest), decision seals, audit replay | no institution-scoped package; no exclusion rules for protected identities; export action never written to the access log | High | I9 (I4 first for Health) |
| E-2 | Exports recorded ("Accesses, exports … recorded", Part 4 F) | `AccessAction` has `'export'` (`access-log.ts:24`) | never used; `substrate/export` unrecorded | High | I0+ |
| D-1 | Degraded honesty | see 5.13 | simulated probation health in production; unmarked generated KPIs over the API | High | I0+ / I3 |
| S-1 | Search and export of protected identities | public search indexes only published site content (`lib/public-sites/search.ts`) | no protected-identity class in `FieldSpec` or `Party`; case list shows names of normal cases | High | I1 + I8 |
| M-1 | Mode carried with data | `installationMode()` decided per process | snapshots and backups do not record the installation mode; samples from a demo run persist into production (cases, receipts, register entries from sample cases) | Medium | I0+ |
| M-2 | Restore points | `simulatedRestorePoints()` (`updates.ts:1159-1160`) allows simulation for the home nation by env alone | not tied to `samplesAllowed()`; CLAUDE.md says "only in tests" | Low | I0+ |
| U-1 | Upgrade incompatibility detection | 5.14 | declared not detected | Medium | I9 |
| U-2 | Offline update authenticity | 5.15 | placeholder signatures | High | I9 |
| A-1 | Audit entry fields (institution, purpose/authority, correlation id) | `AuditEntry` fields (`audit.ts:23-26`) | institution, purpose and correlation only inside `detail`; cannot scope review per institution | Medium | I8 |
| A-2 | Failed authorisation logging | §2.2 | middleware/route 403s unlogged | Medium | I0+ |

### 3.4 Summary counts

- Part 4 tests: met 0 fully with a named production-mode test for all clauses; partly met 9 (4.1, 4.2,
  4.5, 4.9, 4.10, 4.11, 4.12, 4.14, 4.15); not built 6 (4.3, 4.4, 4.6, 4.7, 4.8, 4.13).
- Part 5 tests: met 3 (5.7, 5.16, mostly 5.3); partly met 9; not met 4 (5.8, 5.9, 5.12, 5.15) plus 5.13
  failing on the Update Center.
- High-severity rows: 4.2 (bulk officers), 4.6, 4.7, 4.11/P-1/P-2, 4.13/5.8/E-1, 5.9, 5.12/K-1/K-2,
  5.13/D-1, 5.15/U-2, P-3, E-2, S-1.

## 4. Suggested immediate fixes (I0+, small, before I1)

1. Default `healthSource` to `agent` for the home nation in production (`updates.ts:225`), and refuse a
   probation pass from simulated reports there; add a production-mode test.
2. Refuse `source: 'sample'` in `openCase()` and decisions on sample cases when `!samplesAllowed()`;
   mark register entries created from sample cases; record `installationMode()` in the backup manifest
   and refuse a demo backup in production.
3. Guard `payBill()` itself with `samplesAllowed()`; make `route.test.ts:56-57` unconditional.
4. Audit and access-log `substrate/export` (action `export`) and `admin/officers/bulk`; replace the shared
   secrets with named officials or two-official approval.
5. Log middleware and `refusal()` 403s as `refused` access entries (reference and rule only).
6. Log every case read with personal fields, permit and parcel-rights reads; log `/api/audit` reads and
   give it a read rule (auditors, oversight, own institution).
7. Country policy option to require `identity-provider` independence for two-person controls; audit
   key creation and rotation; refuse a development audit/exchange key in production.
8. Mark the `ministries/[id]/operations|regions|analytics` JSON with `kind: 'sample'`.

Each of these needs its entry in `docs/INSTITUTIONAL_ACCEPTANCE.md` (step I0) with the test that proves it.
