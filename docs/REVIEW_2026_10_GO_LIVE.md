# Go-live review, October 2026

Scope: the merged platform at `0678d74` (branch `claude/sovereign-systems-architecture-q4CcR`):
the Next.js app in `app/`, the Supabase migrations and cron schedule in
`app/supabase/`, `services/civic-api`, and the Helm chart in `infra/`. The review
covered four areas: security, accessibility of the console, performance, and data
protection. Every finding below was checked against the code, and the ones marked
**verified live** were reproduced against a production build (`next build`,
`next start`, memory state, `CIVICOS_AUTH=enforce` with a session secret).

This is a read-only review. No application code was changed.

How the review was done:

- Code reading of the middleware, `lib/auth/*`, every route that the
  permission rules point to, all 96 migrations, the cron schedule, the Helm
  chart, `services/civic-api/src/common` and `src/mirror`.
- A script over the migrations checked that every `SECURITY DEFINER` function
  sets `search_path`, and found which `public.civicos_*` functions are still
  executable by `anon`.
- `node scripts/audit-deps.mjs` (pnpm audit, production dependencies).
- axe-core 4 (`wcag2a`, `wcag2aa`, `wcag21a`, `wcag21aa`, `wcag22aa`) and a
  60-press Tab walk on 22 console and entry pages, run with Playwright and
  Chromium 1194 against `next start -p 3721`. The script was kept in the
  scratchpad and not committed.
- Route sizes taken from the `next build` output. Request timings were measured
  with curl against the running build, and the audit-chain hash cost was
  measured with Node 22.

Severity is used strictly. **Critical** and **High** mean the problem can be
reached in a realistic deployment and has a serious effect. **Medium** means a
real weakness that needs a second condition, or that has a limited effect.
**Low** means hardening.

## Summary

| ID | Area | Severity | Title | Where (file:line) | Fix proposal | Effort |
|----|------|----------|-------|-------------------|--------------|--------|
| C-1 | Security | **Critical** | Anyone can create the first administrator account. On substrate-connected nations this stays possible for good. | `app/src/app/api/auth/officials/route.ts:17-25`, `app/src/lib/auth/officials.ts:142-156`, `app/src/middleware.ts:52,244` | Require a one-time bootstrap token (env or printed at start) for the first account. Refuse local account creation while the substrate is the sign-in method. | S |
| H-1 | Security | **High** | Anyone (`anon`) can overwrite audit-witness attestations and raise "major" tamper escalations | `app/supabase/migrations/20260521210000_civicos_audit_witnesses.sql:63-110,128-151`; `app/src/app/api/cron/witness-divergence/route.ts:52-90` | Revoke `anon`. Make attestations insert-only (no `on conflict do update`). Verify `witness_signature` against `witness_jwk` / a registered witness key. | S |
| H-2 | Security | **High** | Until `civicos_base_url` is seeded, the pg_cron jobs send the nation's `CIVICOS_CRON_SECRET` to a fixed outside host | `app/supabase/cron/schedule.sql:30,36-56` | Remove the fallback host and do nothing when the URL is not seeded. Rotate the secret wherever the schedule ran unseeded. | S |
| H-3 | Security | **High** | Officials signed in through the substrate act for the whole government. The second-step policy and deactivation do not apply to them. | `app/src/app/api/auth/official/route.ts:46-56`; `app/src/lib/auth/official.ts:31` | Map `officers.institution_id`/`charter_id` to the ministry id. Re-check `active` in `currentOfficial()`. Apply the two-step policy (or require AAL2 in the Supabase JWT). | M |
| H-4 | Security | **High** | Every officer of any institution can take installation-level Update Center decisions (data export to the publisher, agent credential, break-glass, data restore, waivers, settings) | `app/src/lib/auth/roles.ts:163`; `app/src/app/api/releases/sovereignty/route.ts:19-25`; `…/settings/agent-credential/route.ts:10-16`; `…/break-glass/route.ts:9-16`; `…/[id]/restore-data/route.ts:11-17` | Classify `/api/releases/*` writes: settings, sovereignty, agent credential, contract and orders go to `ADMIN_ONLY`. Install, decide, break-glass and restore go to signatory+ (`refusal()` in the route). **Fixed in 18eaf66: `/api/releases/*` changes other than feature requests, support tickets and crash reports are rule `installation` (`installationAdmin()`: a government-wide administrator of this nation), checked in the middleware and again in `chamberBody()` / `pathRefusal()`.** | M |
| H-5 | Security | **High** | Dual control in break-glass and preflight waivers takes the second person as a typed name | `app/src/lib/data/updates.ts:1386-1391`; `app/src/lib/data/readiness.ts:109-112` | Make it two steps by two sessions (propose, then confirm by a different verified official), as in change control. **Fixed in 18eaf66: propose, then confirm by a different signed-in official in their own request (`lib/data/dual-control.ts`, compared by session identity); typed second names refused.** | S |
| M-1 | Security | Medium | A disabled, signed-out or password-changed official keeps every page and API read for up to 8 h | `app/src/middleware.ts:78-90` | Ask `liveOfficial()` (cached a few seconds) in `readGate` as `roleGate` does. Keep a server-side session id so sign-out revokes it. | M |
| M-2 | Security | Medium | Site editor and site settings are not tied to the institution: any officer can propose, publish, or re-point another ministry's website | `app/src/lib/auth/roles.ts:162`; `app/src/app/api/public-sites/[id]/proposals/route.ts:8-13`; `app/src/app/api/public-sites/[id]/route.ts:15-17`; `app/src/lib/data/site-editorial.ts:232-257` | Map site id to ministry id and check `ministryPermission()`. Publishing and settings changes need signatory+ for that ministry. **Fixed in 18eaf66: `siteOwner()` + `canActForSite()` on proposals, publishing, settings and feed sync (owning institution or whole government; publishing still by a different official).** | S |
| M-3 | Data protection | Medium | Reads are not scoped by institution: every official reads every ministry's cases and every permit's applicant | `app/src/app/api/permits/route.ts:7-9`; `app/src/app/api/org/ministries/[id]/queue/route.ts:11-15`; `app/src/middleware.ts:78-81` | Add a read rule in `roles.ts` (own ministry, whole government, auditors) and apply it to ministry-scoped GETs and personal-data lists. **Fixed in 18eaf66: `canReadInstitution()` / `canReadPermits()` through `readRefusal()` on the queue, its loads and connected systems, permits and `/api/work` (`INSTITUTION_READS`, coverage test).** | M |
| M-4 | Security | Medium | Feed endpoints log and sign every unauthenticated call with no rate limit. A flood evicts the 20,000-entry exchange evidence log. | `app/src/app/api/org/ministries/[id]/queue/feed/route.ts:41-45`; `…/facilities/feed/route.ts:37-41`; `app/src/lib/exchange/log.ts:24,126-129`; `app/src/middleware.ts:200` | Do not log or sign unknown-key calls (or log them in a separate bounded counter). Rate-limit by address before key lookup. Check Content-Length before `req.text()`. | S |
| M-5 | Security | Medium | Substrate event webhooks: no URL check, plain `fetch` that follows redirects, a test route that reports status and error. Auditors can register them. | `app/src/app/api/federation/webhooks/test/route.ts:68-90`; `app/src/app/api/cron/deliver-events/route.ts:45`; `app/supabase/migrations/20260521280000_civicos_service_context_helper.sql:72-90`; `…/20260521050000_civicos_rls_scoping.sql:63-74` | Deliver through `safeFetchText` (public addresses, no redirects). Validate the URL in `register_event_webhook`. Exclude `auditor`. Seal the secret. | S |
| M-6 | Security | Medium | The Helm chart cannot supply the data key or the signing keys from a Secret, so the default deployment signs with development keys and keeps second-step secrets in plaintext | `infra/helm/civicos/templates/app.yaml:59-130`; `infra/helm/civicos/values.yaml:73`; `app/src/lib/crypto/envelope.ts:63-67`; `app/src/lib/crypto/signing-key.ts:50-66` | Add `secretKeyRef` entries (optional) for `CIVICOS_DATA_KEK`, `CIVICOS_AUDIT_KEY`, `CIVICOS_EXCHANGE_KEY`, `CIVICOS_TOKEN_KEY`, `CIVICOS_METRICS_TOKEN`. Make `/api/health?ready` fail under `enforce` while any is missing (or `CIVICOS_KEY_PROVIDER` not ready). | S |
| M-7 | Security | Medium | One shared cron secret also unlocks the full citizen export, bulk officer creation and the publisher console, and it is accepted in the query string | `app/src/lib/platform-auth.ts:29-40`; `app/src/app/api/substrate/export/route.ts:22-31,38`; `app/src/app/api/admin/officers/bulk/route.ts:30` | Separate credentials: cron-only secret for `/api/cron/*`, distinct export secret (or signed-in administrator), no `?token=`. | M |
| M-8 | Performance | Medium | Public, unthrottled full audit-chain verification on the event loop (about 2.7 s per million entries), plus an unpaged full-chain `/api/audit` | `app/src/middleware.ts:29`; `app/src/app/api/audit/verify/route.ts:6-8`; `app/src/lib/data/store/audit.ts:69-84`; `app/src/app/api/audit/route.ts:6-8` | Verify incrementally (keep the last verified seq and hash; verify only new entries) and cache the public answer. Rate-limit public GETs. Page `/api/audit`. | M |
| M-9 | Security / Performance | Medium | Unauthenticated calls grow the audit chain and in-memory maps without bound (failed sign-ins, subscription requests) | `app/src/lib/auth/officials.ts:213-222`; `app/src/lib/data/site-subscriptions.ts:66-71,88-111` | Count failures in a bounded, expiring map (not persisted). Aggregate repeated denials into one audit entry per window. Prune `attempts`. | S |
| M-10 | Accessibility | Medium | No skip link and no `#main` target in `CommandShell`, the shell of 81 console pages (WCAG 2.4.1, Level A) | `app/src/components/ui/CommandShell.tsx:278` | Add the same skip link `AppShell`/`OperatorShell` already have. Give `<main>` `id="main"` and `tabIndex={-1}`. | S |
| M-11 | Accessibility | Medium | Text contrast below 4.5:1 across the Update Center, admin consoles and onboarding (axe: 269 nodes on `/admin/sites`, 55 on `/admin/releases`, 23 on `/updates`, 17 on `/welcome` and `/setup`) | `app/src/components/features/onboarding/Chrome.tsx:36`; 118 uses of `text-white/40` (and 21 of `/30`, `/25`, `/20`) in `app/src/components/features/updates/*` and `onboarding/*` | Replace raw opacity text with a token from `lib/theme/tokens.ts` (≥ 4.5:1 on `#04060a`). Extend `scan-colours` to flag `text-white/<60`. | M |
| M-12 | Performance | Medium | `/app/[domain]` ships 1.07 MB first-load JS (559 kB of its own) because `AppHost` statically imports about 25 institution apps | build output; `app/src/apps/AppHost.tsx:10-31` | `next/dynamic` per app (load only the one for the domain). | S |
| M-13 | Data protection | Medium | Retention and deletion: unsubscribed addresses stay in the outbox, unconfirmed addresses are kept for good, and failed sign-in emails are kept for good. No retention rule for permits or cases. | `app/src/lib/data/site-subscriptions.ts:76-80,97-99,136-146`; `app/src/lib/auth/officials.ts:213-221` | On unsubscribe, delete queued messages to the address. Purge pending subscriptions after `CONFIRM_DAYS`. Expire failure entries. Add a retention schedule (per store) with a sweep. | M |
| M-14 | Operations / Data protection | Medium | Platform backups are simulated ("completed", "encrypted", random size). Restore only flips a state. Neither is in the Integration Register. | `app/src/lib/data/store/platform-ops.ts:190-211` | Label as placeholder in UI and register (like 3.7). Do not show `encrypted: true` for nothing. | S |
| L-1 | Security | Low | Rate-limit identity is the first `X-Forwarded-For` hop (chosen by the client unless the proxy overwrites it) | `app/src/lib/ops/rate-limit-core.ts:46-49`; `app/src/app/api/public-sites/[id]/subscribe/route.ts:20` | Take the right-most untrusted hop with a configured number of trusted proxies (`CIVICOS_TRUSTED_PROXIES`). | S |
| L-2 | Security | Low | The app fails open without `CIVICOS_AUTH=enforce`, and `docker-compose` defaults to open | `app/src/middleware.ts:232`; `infra/docker/docker-compose.yml:79-81` | In `NODE_ENV=production`, refuse to start (or serve only `/` and `/setup`) unless `enforce` or an explicit `CIVICOS_ALLOW_OPEN=1`. | S |
| L-3 | Data protection | Low | Every official can list all accounts with email, last sign-in and whether the second step is on (shows which administrators lack it) | `app/src/app/api/auth/officials/route.ts:12-15` | Administrators see the full list. Others see name, office and institution only. | S |
| L-4 | Security | Low | Upload size pre-checks trust `Content-Length`, and `formData()` reads a chunked body in full (authenticated, rate-limited) | `app/src/app/api/boundaries/route.ts:38-48`; `app/src/app/api/parcels/import/route.ts:31-40` | Refuse when the length is absent, or stream with a byte cap. The ingress `proxy-body-size` covers Helm. | S |
| L-5 | Security | Low | No Origin / `Sec-Fetch-Site` check on mutating requests. SameSite=Lax alone does not stop same-site subdomains. | `app/src/lib/auth/official.ts:71-72` | Refuse cross-site `Sec-Fetch-Site` on mutating `/api/*` with a session cookie. | S |
| L-6 | Performance | Low | Postgres write-through issues one statement per audit entry, entity or parcel (sequential round trips inside the transaction) | `app/src/lib/data/repo/postgres.ts:198-212,252-261,711` | Batch per topic with `jsonb_to_recordset`, as observations already do. | M |
| L-7 | Performance | Low | Every page ships all five locales' messages (about 130 kB raw). The console baseline is about 460 kB first-load. | `app/src/lib/i18n/index.ts:6-10`; build output | Load the active locale only (dynamic import). | S |
| L-8 | Accessibility | Low | Scrollable lists in `InstitutionChain` cannot be reached by keyboard (axe `scrollable-region-focusable`, `/gov/coordination`) | `app/src/apps/_shared/InstitutionChain.tsx:294,329,365` | `tabIndex={0}` plus `role="region"` and `aria-label` on the scroll containers. | S |

## Critical

### C-1. Anyone can create the first administrator account

**Evidence.** The accounts route lets an unauthenticated caller create an account
whenever the store is empty:

```ts
// app/src/app/api/auth/officials/route.ts:17-22
export async function POST(req: NextRequest) {
  const o = await currentOfficial();
  if (hasAccounts() && !o) return NextResponse.json({ error: 'Only a signed-in official can create accounts' }, { status: 401 });
  ...
  const r = await createAccount(b, o ? actorLabel(o) : null);
```

```ts
// app/src/lib/auth/officials.ts:154-156
const first = d.accounts.length === 0;
const role: OfficialRole = first ? 'administrator' : ...
```

The middleware lets this path through without a session even under enforcement
(`SIGN_IN` includes `/api/auth/officials`, `app/src/middleware.ts:52`, and
`gate()` returns early for it at `:244`).

**Impact.** The caller gets a platform administrator: accounts, setup, sovereign
profile, federation, integrations, backups and restore. That is everything.

**Exploit path.**

1. On a fresh deployment that can be reached from a network, whoever posts first
   becomes the administrator. The window lasts until the nation creates its own
   account.
2. On a nation that signs officials in through the substrate (Supabase), the
   local store is "only the fallback" (`officials.ts:5-8`) and normally stays
   empty, so the window never closes. `GET /api/auth/official` even advertises
   `accounts: false`.

**Verified live** under `CIVICOS_AUTH=enforce`:

```
POST /api/auth/officials {email,name,office,password}
  → 201 role administrator, createdBy "installation"
POST /api/auth/official  {email,password}
  → 200 with a signed civicos_official cookie
```

**Fix.**

- Require a bootstrap token for the first account: `CIVICOS_BOOTSTRAP_TOKEN`, or
  a random code written to the server log at start and shown nowhere else.
  Compare it in constant time and discard it after use.
- Refuse local account creation while the substrate is configured, unless an
  administrator enables local accounts.
- Record the bootstrap in the audit chain.

## High

### H-1. Anonymous callers can overwrite witness attestations and raise tamper alarms

**Evidence.**

```sql
-- app/supabase/migrations/20260521210000_civicos_audit_witnesses.sql:89-97
  on conflict (scope, observed_seq, witness_label) do update set
    observed_hash     = excluded.observed_hash,
    witness_jwk       = excluded.witness_jwk,
    witness_signature = excluded.witness_signature, ...
-- :149-150
grant execute on function public.civicos_record_witness_attestation(text, bigint, text, text, jsonb, text)
  to anon, authenticated;
```

`witness_signature` and `witness_jwk` are stored but never verified. The relock
migration keeps the grant on purpose
(`20260521260000_civicos_relock_definer_grants.sql:17`). The divergence watchdog
treats any attestation whose hash differs from the live chain as tampering. It
records a `major` escalation and publishes `audit.divergence` on the
constitutional channel (`app/src/app/api/cron/witness-divergence/route.ts:55-90`).

**Impact.** With only the public publishable key, anyone can:

- **Forge alarms.** Submit a wrong hash for the latest seq of any scope, and every
  15 minutes a fresh scope or seq yields a new major escalation and event.
- **Erase evidence.** Overwrite an independent witness's real attestation (same
  scope, seq and label), which destroys exactly the evidence witnesses exist to
  keep.
- **Flood the audit chain.** Each call appends a `substrate:witnesses` audit
  entry, so the chain can be flooded.

**Fix.**

- Revoke `anon`. Let witnesses use their own credentials, or allow `anon` only
  with a verified signature.
- Make rows insert-only: a second statement for the same key is a new row, not an
  update.
- Verify `witness_signature` over `scope|seq|hash` with a registered witness key
  before the insert.
- Rate-limit through the gateway.

### H-2. The cron schedule sends the nation's secret to a fixed outside host until it is configured

**Evidence.**

```sql
-- app/supabase/cron/schedule.sql:30, 36 (same pattern on all 15 jobs, lines 36-56)
-- Until it is seeded, jobs fall back to the original reference deployment.
select cron.schedule('civicos-deliver-events', '*/5 * * * *', $$select net.http_get(url :=
  coalesce((select decrypted_secret from vault.decrypted_secrets where name = 'civicos_base_url'),
           'https://gov-pied-seven.vercel.app') || '/api/cron/deliver-events',
  headers := jsonb_build_object('Authorization', 'Bearer ' ||
           (select decrypted_secret from vault.decrypted_secrets where name = 'civicos_cron_secret')))$$);
```

**Impact.** The file's own instructions seed the cron secret first and the base
URL second. Any nation that applies the schedule with the secret seeded but the
URL not yet seeded (or mistyped) sends its `CIVICOS_CRON_SECRET` every minute to a
host it does not control. That secret authorises:

- `/api/substrate/export`: every citizen, officer, consent, appeal and service
  request (M-7)
- `/api/admin/officers/bulk`: creates officers through the service role
- the publisher console (`lib/updates/access.ts:18-21`)
- every cron job

It also contradicts the doctrine that operational data leaves only through
`transmit()`.

**Fix.**

- Drop the fallback. Use `case when base_url is null then null else net.http_get(...) end`,
  or make the job raise.
- Make the schedule refuse to install while `civicos_base_url` is unset.
- Tell nations that applied it unseeded to rotate the cron secret.

### H-3. Substrate sign-in grants whole-government scope and skips the second-step policy and deactivation

**Evidence.**

```ts
// app/src/app/api/auth/official/route.ts:46-55
// Substrate officers are scoped by the substrate's own row-level security; on the platform they act for the whole government ...
  return { sub: `officer:${o.id}`, name: o.name, office: o.title ?? o.role, role: roleFromSubstrate(o.role) };
```

There is no `institution` and no `twoStepRequired`. The officer register does
hold `institution_id` and `charter_id`
(`20260521000000_civicos_v1_substrate.sql:104-105`).
`currentOfficial()` re-reads only local accounts:

```ts
// app/src/lib/auth/official.ts:31
if (!c || c.method !== 'local') return c;
```

**Impact.** On a substrate-connected nation, every ministry clerk with an
`officer` role passes `ministryPermission()` for every ministry
(`roles.ts:208-211`). They can import or close cases in any queue, record
facilities for any institution, write incidents and run any ministry's
operations. Signatory-level officers (`minister`, `permanent-secretary` …) can
also connect case-system feeds and publish sites for any ministry
(`canManageFeeds`, `canSignForSite`).

The installation's second-step policy (`signers` / `all`) is never applied to
them. Setting `active = false` in the register does not end their platform
session for up to 8 h, for reads or writes, because the middleware's live check
calls `currentOfficial()`, which returns substrate claims unchanged.

**Fix.**

- Resolve the officer's institution to the platform ministry id (`charter_id`,
  or `institution_id` via the registry) and put it in the claims.
- In `currentOfficial()`, re-check substrate officers. Cache the `active` and
  role lookup for about 30 s.
- Apply `twoStepRequiredFor()`, or require `aal2` in the Supabase JWT, when the
  policy asks for it.

### H-4. Any officer can take installation-level Update Center decisions

**Fixed in 18eaf66.** The user's rule: each nation's deployment has its own
government-wide administrator, and installation-level decisions are theirs; no
central operator or other nation takes part. `lib/auth/roles.ts` has a rule
`installation` (`installationAdmin()`: role administrator and no institution)
for every `/api/releases` change except feature requests, support tickets and
the installation's crash reports (`UPDATE_CENTER_WORK`, any official who is not
an auditor). The publisher console and the agent's health reports keep their own
credentials. The middleware applies it, and `chamberBody()` (and the decision
and request routes, through `pathRefusal()`) check it again against the account
as it stands now. An officer, a signatory and an administrator of one
institution are refused (`installation.route.test.ts`,
`api-permission-coverage.test.ts`). Verified live under enforce: the three
requests below now answer 403.


**Evidence.** Every write under `/api/releases` falls into the `official` rule:

```ts
// app/src/lib/auth/roles.ts:163
/^\/api\/releases(\/|$)/,  // the nation's Update Center (four-eyes and named officials in lib/data/*)
```

No route under `app/src/app/api/releases` (outside `publisher/`) calls
`refusal()`, `adminOnly()` or `currentOfficial()`. A `grep` of the folder finds
none. The routes only resolve the nation (`chamberBody()`).

**Verified live** (an officer of `min-agriculture`, under enforce):

- `POST /api/releases/sovereignty {category:"crash-reports", enabled:true}` returned
  200 and turned on data export to the publisher.
- `POST /api/releases/settings/agent-credential` returned 201 with a new `cag_`
  credential. That also replaces the deployment agent's credential, which drives
  probation and fallback.
- `POST /api/releases/break-glass {secondBy:"Somebody Else", reason:…}` returned 200
  and switched the software back.

**Impact.** The lowest working role in any ministry can change data sovereignty,
which by doctrine needs an official enabling with reason. The same role can:

- re-key the deployment agent
- run break-glass and data restore (recorded as the authoritative decision)
- waive blocking preflight findings
- change probation and UAT settings
- accept contract renewals and place security-store orders that commit money

**Fix.**

- Split `/api/releases` in `roles.ts`. Put `settings`, `settings/agent-credential`,
  `sovereignty`, `contract`, `security/orders`, `hosting` and `staging` in
  `ADMIN_ONLY`.
- Make `[id]/decision`, `break-glass`, `[id]/restore-data`, `[id]/readiness`
  (waive) and `change-control` require administrator or signatory
  (`refusal()` in the route), and require them to serve the whole government.
- Add these cases to `roles.test.ts`.

### H-5. Dual control takes the second person as typed text

**Fixed in 18eaf66.** Break-glass and preflight waivers follow the four-eyes
pattern: the first official proposes (stored on the install record, or beside the
finding), a different official confirms in their own request, and only then does
the step run (`lib/data/dual-control.ts`). With sessions the two are compared by
the verified session identity; a proposal made signed in can only be confirmed
signed in; a `secondBy` in a body is refused (422); proposals lapse after 24 hours
and can be cancelled; proposal, cancellation and the step are audited. Both
officials must be government-wide administrators (H-4). The Update Center
screens show the pending proposal with Confirm and Cancel.


**Evidence.**

```ts
// app/src/lib/data/updates.ts:1389-1391
const by = (input.by ?? '').trim(), second = (input.secondBy ?? '').trim(), ...
if (!by || !second) return { error: 'Break-glass needs two named people', status: 422 };
if (by.toLowerCase() === second.toLowerCase()) return { error: 'The second person must be someone else (dual control)', ... };
```

`waiveFinding()` does the same (`readiness.ts:109-112`). `withOfficial()`
replaces only `by`, `actor` and `officerName` (`lib/auth/official.ts:44-52`),
so `secondBy` stays whatever the caller typed.

**Impact.** One official performs a "two-person" action alone. The audit chain
records `"<their name> + <typed name>"` as if a second official agreed. This was
**verified live** (H-4, third request).

**Fix.** Use the pattern change control already uses: the first official
proposes, a different signed-in official confirms in their own request, and the
step runs on confirmation. Never accept a second name from a body.

## Medium

### M-1. Session revocation does not reach reads

**Evidence.**

```ts
// app/src/middleware.ts:78-81
async function readGate(req, res) {
  ...
  if (await verifyToken(req.cookies.get(OFFICIAL_COOKIE)?.value, process.env.CIVICOS_SESSION_SECRET)) return res;
```

Only changes go through `liveOfficial()` (`:126-136`). Most GET routes rely on the
middleware alone. Sign-out only clears the cookie
(`app/api/auth/official/route.ts:79-84`), so a copied token stays valid until
`exp` (8 h).

**Verified live.** After an administrator disabled the officer's account, the
officer's old cookie still returned 200 for `/api/audit`,
`/api/releases/sovereignty`, `/api/org/ministries/min-health/queue`,
`/api/parcels` and the page `/gov/home`. Writes were correctly refused with 401.

**Impact.** A dismissed or compromised official keeps read access to every record
for the rest of the session.

**Fix.**

- Apply the same live check to reads, with a short in-memory cache keyed by
  token hash (5–10 s) so the internal request is not made per asset.
- Add a session id (`sid`) and a server-side revocation set written on sign-out,
  disable and password change.

### M-2. Site editor and site settings are not tied to the owning institution

**Fixed in 18eaf66.** `siteOwner()` (`lib/data/site-settings.ts`) maps a site
to the registry ministry with its slug (a merged one's successor), else its
standing branch or agency; `canActForSite()` in `roles.ts` lets that
institution's officials and the whole government propose, publish, change
settings and fetch the feed; a site no institution owns is the whole
government's. Publishing still needs a different official. Following the user's
rule, any official of the owning institution (not only signatories) may publish.


**Evidence.** `roles.ts:162` puts every `/api/public-sites/<id>/…` write in
`official`. `proposals/route.ts:8-13`, `proposals/[pid]/route.ts` and
`[id]/route.ts:15-17` (site settings: Link, Embed, Migrate, Host, and the
registered website) check nothing else. `decideProposal()` compares names only
(`site-editorial.ts:257`).

**Impact.** Two officials from any institutions can publish content (including
the `alert` notice) on the Police, Presidency or Health site. A single officer
can change a ministry's registered website. That address then becomes:

- the only origin allowed to frame `/embed/*`
- the `Access-Control-Allow-Origin` of `/api/public-sites/<id>/content`
  (`content/route.ts:32`)
- the host feeds are fetched from

**Fix.**

- Map each site id to its ministry, and require `ministryPermission()` for
  proposals.
- Require `canSignForSite()` for publishing and for site settings.
- Allow whole-government officials as now.

### M-3. Reads are not scoped by institution

**Fixed in 18eaf66.** `canReadInstitution()` and `canReadPermits()` in
`roles.ts` (own institution, whole government, auditors), checked in the routes
through `readRefusal()` (`lib/auth/official.ts`, live account, no second step for
reads): `/api/org/ministries/<id>/queue`, its `import`, `feeds` and feed signing
key, `/api/permits`, `/api/permits/<id>` (and deciding one), and `/api/work`, which
now lists only the queues and permits the official may read. Permits belong to
the institutions whose kind keeps the permit register (`permitHolders()`, from the
registry). `INSTITUTION_READS` lists these routes and the coverage test holds each
to the rule. The check is in the routes, not the middleware, so it reads the
account as it stands now. Not covered: the citizen demo page `/wallet/permits`
renders every permit server-side (citizen demo session, outside the official
rules).


**Evidence.** Both routes below return all records to any signed-in official:

```ts
// app/src/app/api/permits/route.ts:7-9
export function GET() { return NextResponse.json({ permits: listPermits() }); }
```

```ts
// app/src/app/api/org/ministries/[id]/queue/route.ts:11-15
export async function GET(_r, props) { ... const r = queueFor(params.id); ... return NextResponse.json(r); }
```

**Verified live.** An officer of `min-agriculture` read
`/api/org/ministries/min-health/queue` (case subjects, assignees, notes), and
`/api/permits` returned applicant names and premises.

**Impact.** Personal data in cases and permits is visible to every official of
every ministry. That breaks need-to-know and data-minimisation requirements most
data protection laws impose on public bodies. Writes are already scoped
(`MINISTRY` rule); reads are not.

**Fix.**

- Add a read rule next to `apiPermission()`: own ministry, whole government and
  auditors.
- Apply it in the middleware to `/api/org/ministries/<id>/…` GETs, and in routes
  that list personal data (permits by municipality or issuing institution).
- Keep the single decision point in `roles.ts`.

### M-4. Unauthenticated feed calls fill the exchange log

**Evidence.**

```ts
// app/src/app/api/org/ministries/[id]/queue/feed/route.ts:42-45
const feed = feedForKey(params.id, req.headers.get('authorization'));
const raw = await req.text();
if (!feed) return answer(req, params.id, null, raw, { state: 'absent' }, 401, ..., 'unknown key');
```

`answer()` calls `logExchange()`, which signs a receipt and pushes an entry
(`lib/exchange/log.ts:100-130`), capped at `MAX_ENTRIES = 20_000` by dropping the
oldest. These routes are `SELF_AUTHENTICATED`, so the middleware applies no rate
limit (`middleware.ts:200`). The body is read in full before any size check, and
the 413 check comes only after authentication.

**Impact.** About 20,000 junk requests evict all genuine exchange records. Those
records are the platform's non-repudiation evidence for feeds and federation.
Under a remote key provider, each junk call also makes a signing request to
Vault or KMS. `ministryId` is taken from the path, so junk entries can be
attributed to any ministry.

**Fix.**

- Do not record unknown-key calls in the exchange log. Count them in a metric,
  or keep a separate small ring.
- Apply `limit(req, 'public')` by address before key lookup.
- Check `content-length` against `MAX_BYTES` before `req.text()`.

### M-5. Substrate event webhooks reach internal addresses

**Evidence.**

- `register_event_webhook` accepts any `p_url` and stores `secret` in clear
  (`20260521280000_civicos_service_context_helper.sql:72-90`;
  `20260521270000_civicos_event_webhooks.sql:23-27`).
- Deliveries and the test use bare `fetch` (follows redirects, any address):
  `app/api/cron/deliver-events/route.ts:45` and
  `app/api/federation/webhooks/test/route.ts:68`.
- The test answers with `status` and the error message (`:78-90`).
- `is_platform_officer()` includes `auditor`
  (`20260521050000_civicos_rls_scoping.sql:70-72`).

**Impact.** A read-only auditor can register `http://169.254.169.254/…`,
`http://civicos-api:4000/…` or the MQTT or Postgres hosts, and then probe them
through the test route (status and error message act as an oracle). The same
auditor receives every federation event of the channel. The platform's own
CloudEvents path already does this safely (`lib/events/deliver.ts` via
`safeFetchText`).

**Fix.**

- Deliver both through `safeFetchText` with `redirects: 0` and the
  `CIVICOS_WEBHOOKS_PRIVATE` switch.
- Validate scheme and host in the RPC.
- Remove `auditor` from webhook registration.
- Keep the secret in Vault or sealed.

### M-6. The Helm chart cannot wire the data key or the signing keys

**Evidence.** The app container gets secrets only for the session, cron and
Supabase (`infra/helm/civicos/templates/app.yaml:85-99`). Everything else comes
from `app.env` as plain values (`:127-130`, `values.yaml:73: env: {}`).

Without `CIVICOS_DATA_KEK`, `seal()` returns plaintext
(`lib/crypto/envelope.ts:63-67`). That applies to TOTP secrets, webhook secrets
and MQTT passwords. Without `CIVICOS_AUDIT_KEY`, `CIVICOS_EXCHANGE_KEY` and
`CIVICOS_TOKEN_KEY`, each process generates a development key marked
`production: false` (`lib/crypto/signing-key.ts:50-66`).

**Impact.** A nation that deploys with the chart's defaults runs with:

- signed audit heads and exchange receipts that do not count as evidence
- OAuth access tokens that stop verifying after a restart (and on another
  replica in postgres mode)
- second-step secrets readable by anyone with a state snapshot

Putting the key in `app.env` instead would place it in the values file and the
Deployment spec in plain text.

**Fix.**

- Add optional `secretKeyRef` entries (or `envFrom: secretRef`) for the data key,
  the signing keys and `CIVICOS_METRICS_TOKEN`.
- Under `enforce`, make readiness fail while `encryptionAtRest().enabled` is
  false or any signing key is a development key, unless the operator explicitly
  accepts it.

### M-7. One cron secret opens far more than cron

**Evidence.** `cronAuthorized()` (`lib/platform-auth.ts:29-40`, which also
accepts `?token=`) authorises the 15 scheduled jobs. It also authorises
`/api/substrate/export`, a full dump of `civicos_citizens`, `civicos_officers`,
`civicos_consents`, `civicos_appeals` and `civicos_service_requests` up to 50,000
rows each (`substrate/export/route.ts:22-31,43`). It further authorises
`/api/admin/officers/bulk` (creates substrate officers, `:30`) and the publisher
console.

**Impact.** The secret is stored in pg_cron's Vault and sent on every job (see
H-2). Anyone who sees it can export all citizen records.

**Fix.**

- Use distinct credentials per purpose: cron jobs, data export, and officer
  provisioning (which should be a signed-in administrator).
- Stop accepting the secret in the query string for the export and bulk routes.

### M-8. Public full-chain verification runs on the event loop

**Evidence.**

- `/api/audit/verify` is a public read (`middleware.ts:29`) and recomputes every
  hash on each call (`app/api/audit/verify/route.ts:6-8`;
  `lib/data/store/audit.ts:69-84`).
- The cover page calls it on every open (`CLAUDE.md`, entry flow).
- `/api/audit` returns the whole chain, copied and reversed (`app/api/audit/route.ts:6-8`).

**Measured.** SHA-256 v2 over 1,000,000 entries of typical size took 2.66 s in
Node 22. The server answers nothing else during that time. GETs are not
rate-limited (`rateGate` covers only mutations, `middleware.ts:197-199`).

**Impact.** Every sign-in, change and public subscription adds an entry, so the
chain reaches a million within months at national scale. From then on each cover
open stalls the server for seconds, and a handful of unauthenticated requests per
second takes it down. `/api/audit` becomes a response of hundreds of megabytes.

**Fix.**

- Verify incrementally: remember the last verified seq and hash, verify new
  entries on append (or in a background job), and serve the cached result
  publicly.
- Add a public read limit at the middleware.
- Page `/api/audit` (`?before=seq&limit=`).

### M-9. Unauthenticated requests grow state without bound

**Evidence.**

- Every failed sign-in pushes into `failures[email]`, which is deleted only on a
  successful sign-in for that same email. It also writes an audit entry
  (`lib/auth/officials.ts:213-222`).
- Every subscription request writes an audit entry and an `attempts` key per
  sender and per address hash, never pruned (`site-subscriptions.ts:66-71,88-111`).
- Both stores are persisted.
- Each failed sign-in also costs a scrypt with N=2^17 (128 MiB) on the libuv
  pool. That pool is shared with DNS lookups and file I/O.

**Impact.** A slow, distributed flood (or one that rotates `X-Forwarded-For`
where that works, L-1) grows the audit chain, the snapshot or record documents,
and memory with no limit. That feeds M-8. Sign-in floods also starve the
thread pool.

**Fix.**

- Keep failure counters in a bounded, expiring, non-persisted map.
- Write one audit entry per address per window for repeated denials.
- Prune `attempts`.
- Put a concurrency cap (semaphore) on password hashing.

### M-10. The console has no skip link (WCAG 2.4.1, Level A)

**Evidence.** `CommandShell`, used by 81 pages under `app/src/app`, renders a
header and a menu of about 30 entries before
`<main className="min-w-0 flex-1 overflow-y-auto p-3">` (`CommandShell.tsx:278`).
It has no skip link and `main` has no `id`. `AppShell.tsx:224-229` and
`OperatorShell.tsx:74-79` have one, but `OperatorShell` is not used by any page
and `AppShell` by three.

The Playwright Tab walk confirms it. The first Tab stop on every console page is
"Coordinate →" and then the brand and the menu, and no page offered a
`#…` skip link.

**Impact.** Keyboard and screen-reader users tab through the whole menu on every
page.

**Fix.** Copy the `AppShell` skip link into `CommandShell`. Give `<main>`
`id="main"` and `tabIndex={-1}`. Add a test like `PublicSite.test.ts` for the
console shells.

### M-11. Text contrast failures outside the tokens

**Evidence.** axe `color-contrast` (serious) results:

| Page | Nodes failing |
|------|---------------|
| `/admin/sites` | 269 |
| `/admin/releases` | 55 |
| `/updates` | 23 |
| `/welcome` | 17 |
| `/setup` | 17 |
| `/ops` | 1 |

Typical nodes:

- `text-white/40` on `#04060a`: 3.73:1 (`onboarding/Chrome.tsx:36`, the shared
  header of these pages)
- `text-white/30`: 2.54:1 (`/updates` step numbers)
- the `/ops` rail badge `#f1707a` on `#3f2c3b`: 4.48:1

The code has 118 uses of `text-white/40`, mostly in
`components/features/updates/*` and `onboarding/*`. `tokens.test.ts` cannot catch
these because they are not tokens.

**Fix.**

- Add a muted-text token for the dark chrome (≥ 4.5:1 on `#04060a`; `white/60`
  gives about 7:1) and replace the opacity utilities.
- Teach `scan-colours` to count `text-white/<60`.
- Add these pages to an axe smoke test in CI, like the public sites.

### M-12. The federated app route ships 1 MB of JavaScript

**Evidence.** The build reports `ƒ /app/[domain]/[[...sub]] 559 kB 1.07 MB` (its
page chunk is 2.5 MB raw). `AppHost.tsx:10-31` statically imports about 25
complete apps (Treasury, Judiciary, Police, Health, NOC …), and only one renders
per domain.

**Fix.** Use `const Apps = { treasury: dynamic(() => import('@/apps/treasury/TreasuryApp')), … }`.
That loads one app per visit and should bring the route close to the console's
roughly 470 kB.

### M-13. Retention and deletion of personal data

**Evidence.**

- `unsubscribe()` empties `email` on the subscriber
  (`site-subscriptions.ts:136-146`), but the queued confirmation and update
  messages in `outbox` keep `to: <address>` (up to 5,000 kept,
  `site-subscriptions.ts:76-80`).
- Pending subscriptions are kept for good after their 7-day link expires (only
  `lookupToken` ignores them, `:120`), so third parties' addresses submitted by
  someone else stay stored.
- `failures` keys are the typed email addresses (and sometimes passwords typed
  into the email field) and are never purged (M-9).
- No store has a retention period or a deletion path for permits (applicant
  name, premises), case notes or support tickets. `grep` finds no retention
  logic in `lib/data`.

**Impact.** The emailed promise ("unsubscribing deletes the email address") is
not true while the outbox holds it. Stores keep personal data with no lawful
retention limit.

**Fix.**

- On unsubscribe, delete outbox messages to that address.
- Purge pending subscriptions after `CONFIRM_DAYS`.
- Expire failures.
- Define a retention schedule per store (permits, cases, tickets, sign-in
  failures, exchange log) with a scheduled sweep, record it in the DPIA template
  (`lib/data/evidence.ts`), and document deletion in the register.

### M-14. Platform backups are simulated and shown as real

**Evidence.**

```ts
// app/src/lib/data/store/platform-ops.ts:190-199
const b: BackupRecord = { id: uid('BK'), kind, state: 'completed',
  location: `sov://backups/home/${kind}-${Date.now()}.enc`, encrypted: true,
  sizeBytes: Math.floor(1_000_000 + Math.random() * 9_000_000), ... };
```

`restoreBackup()` sets `state = 'restoring'` and does nothing else (`:204-211`).
The Integration Register covers restore points (3.7) and disaster recovery
(9.1), but not `/api/platform/backups`.

**Impact.** Operators see completed, encrypted backups of plausible size that do
not exist.

**Fix.**

- Show "placeholder: nothing is copied" on the screen and in the API answer, and
  drop `encrypted: true` and the random size.
- Add a register entry in the same change.
- Connect it to the real backup system before go-live.

## Low

### L-1. The rate-limit address can be spoofed

`clientAddress()` uses the first `X-Forwarded-For` hop
(`lib/ops/rate-limit-core.ts:46-49`). The subscription route does the same
(`subscribe/route.ts:20`). Behind proxies that append to the header (HAProxy
`option forwardfor`, AWS ALB) or with no proxy at all (docker-compose), the
client chooses that value, which defeats per-address limits on sign-in and public
writes.

The Helm ingress adds its own per-address `limit-rps`, which mitigates this.

**Fix.** Use a configured number of trusted hops from the right.

### L-2. The app is open unless enforcement is set

`gate()` returns early when `CIVICOS_AUTH !== 'enforce'` (`middleware.ts:232`).
`docker-compose.yml:79-81` defaults it to empty. The Helm chart defaults to
`enforce` (`values.yaml:49`), and the Integration Register 1.4 says to set it.

**Fix.** Make production fail closed unless `CIVICOS_ALLOW_OPEN=1` is set
explicitly.

### L-3. The account directory shows two-step status to every official

`GET /api/auth/officials` returns every account (email, role, institution,
`lastSignIn`, `twoStepSince`) to any signed-in official
(`app/api/auth/officials/route.ts:12-15`). That list shows an attacker which
administrators have no second step.

**Fix.** Give the full list to administrators only.

### L-4. Upload pre-checks trust Content-Length

The boundary and parcel imports check `content-length` and then call `formData()`
(`boundaries/route.ts:38-48`, `parcels/import/route.ts:31-40`). A chunked body
without a length is read in full. These routes are authenticated and limited by
the `upload` scope, and the ingress `proxy-body-size` caps them in Helm.

### L-5. No cross-site check on changes

There is no Origin or `Sec-Fetch-Site` check on mutating requests, and the
session cookie is `SameSite=Lax` (`lib/auth/official.ts:71-72`). A hostile page
on a sibling subdomain of the platform's site (for example a ministry site in
"Host" mode under the same registrable domain) is same-site, so Lax does not stop
it.

**Fix.** Refuse `Sec-Fetch-Site: cross-site` / `same-site` on mutating `/api/*`
that carry a session cookie.

### L-6. Postgres writes row by row

Audit entries, twin entities, keys and parcels are written one statement at a
time inside the flush transaction (`lib/data/repo/postgres.ts:198-222,252-261`,
loop at `:711`). Observations are already batched (`:223-236`). A parcel load of
50,000 rows becomes 50,000 sequential round trips, plus their audit entries.

**Fix.** Use `jsonb_to_recordset` batches per topic.

### L-7. Every page ships every locale

`lib/i18n/index.ts:6-10` imports `en`, `sw`, `ar`, `fr` and `yo` (about 130 kB
raw) into the nation registry used by the root layout. Console pages start at
about 460 kB first-load JS.

**Fix.** Import the active locale only.

### L-8. Scrollable lists cannot be reached by keyboard

`InstitutionChain.tsx:294,329,365` has `overflow-y-auto` lists without
focusable content (axe `scrollable-region-focusable`, 4 nodes on
`/gov/coordination`).

**Fix.** Add `tabIndex={0}`, `role="region"` and `aria-label`.

## Accessibility run: all results

| Page | axe (WCAG A/AA) | Tab walk |
|------|-----------------|----------|
| `/`, `/command`, `/sign-in`, `/gov/home`, `/gov/twin`, `/gov/sites`, `/gov/sites/parcels`, `/gov/sites/boundaries`, `/gov/work/cases`, `/gov/intake`, `/audit`, `/gov/configuration`, `/gov/me`, `/wallet`, `/ministries/min-health/operations` | no violations | no trap, focus visible on every stop |
| `/welcome`, `/setup` | contrast 17 | no trap |
| `/updates` | contrast 23 | no trap |
| `/admin/releases` | contrast 55 | no trap |
| `/admin/sites` | contrast 269 | no trap |
| `/ops` | contrast 1 | no trap |
| `/gov/coordination` | scrollable-region-focusable 4 | no trap |

Smaller notes (not findings):

- `/gov/sites/boundaries` and `/ministries/[id]/operations` have two `h1`.
- `/wallet` has two `main` landmarks.

## Checked and fine

**Sessions and accounts**

- HMAC-SHA-256 sessions through Web Crypto (`crypto.subtle.verify`, constant time).
  Expiry is checked, the key must be ≥ 32 characters under enforce, and no key is
  generated into state under enforce (`session-token.ts`, `officials.ts:110-132`).
- Passwords use scrypt N=2^17, r=8, p=1, with rehash on sign-in. A dummy hash
  hides which emails exist. Lockout is per address. Reset codes are SHA-256,
  expire in 24 h and are single use. A password change ends write sessions.
- The second step follows RFC 6238 with ±1 step, never accepts a step twice
  (`lastStep`), seals the secret with AES-256-GCM bound to the account (AAD), and
  stores recovery codes as hashes.

**Middleware and permissions**

- The middleware refuses `x-middleware-subrequest` (CVE-2025-29927). The Helm
  ingress strips it.
- Every mutating route matches one rule, and anything else is refused
  (`api-permission-coverage.test.ts`).
- All 15 cron routes check `cronAuthorized()` on both GET and POST, with a
  constant-time comparison.
- Every `BEARER_ROUTES` / `BEARER_READS` route verifies its own credential: 21
  route files checked, `machineReadRefusal` refuses a bad bearer instead of
  falling back to public.
- The middleware's live check builds its URL from the server's own host, not
  the `Host` header (Next 15 `resolve-routes.js:103-105`; Helm also sets
  `CIVICOS_INTERNAL_URL`).
- The `Secure` cookie flag follows `x-forwarded-proto`.

**Browser and outbound requests**

- CSP uses a per-request nonce with `strict-dynamic` and no `unsafe-inline` for
  scripts. `frame-ancestors 'none'`, HSTS, `nosniff` and Permissions-Policy are
  set.
- All three `dangerouslySetInnerHTML` uses are a constant or JSON with `<`
  escaped.
- Logos are byte-checked and served with `sandbox` CSP.
- The platform sets CORS only for the registered website on the public content
  route. civic-api's CORS is off by default.
- `safeFetchText` / `pinnedFetch` resolve once and pin the address (no DNS
  rebinding), re-check every redirect, refuse private ranges including
  IPv4-mapped addresses, and cap size and time. They are used by site feeds,
  twin sources, the map pack, SDMX and CloudEvents.
- The MQTT broker binds to loopback by default, authenticates with an integration
  key or token, refuses PUBLISH, has connection, subscription and message limits,
  and re-checks credentials every minute.

**Database and logs**

- All SQL in `lib/data/repo/postgres.ts` and `documents.ts` is parameterised. The
  only interpolation is of constant column lists and JSON built with
  `JSON.stringify`.
- All 261 `SECURITY DEFINER` definitions (80 files) set `search_path`. Every
  `public.civicos_*` write RPC is revoked from `anon`, except the witness RPC
  (H-1). The `civicos` schema has no `USAGE` grant to `anon` or `authenticated`.
- Logs are redacted by field name (password, token, email, phone, address,
  national id) and long strings are cut. No log call passes names or addresses
  of citizens.

**civic-api, dependencies and personal data**

- civic-api's `AuthGuard` refuses every bearer until the identity provider is
  wired (fails closed). The development principal header works only with
  `CIVIC_DEV_AUTH=1` (Helm `0`). The mirror webhook is HMAC-checked over raw
  bytes with a 5-minute window. The forwarder passes only `Authorization` and
  `Cookie` and refuses redirects.
- Dependencies: `audit-deps.mjs` reports no unaccepted high or critical
  advisories in production dependencies.
- Unauthenticated public reads (`/api/org/ministries`, `/api/sovereign`,
  `/api/setup`, `/api/public/*`, `/api/boundaries/active`, `/api/exchange/key`)
  carry no personal data (checked live).
- Parcel holders are shown only through `canSeeParcelRights()`. Lists, tiles,
  OGC and audit details carry `publicParcel()` (with `parcels-privacy.test.ts`).
- Support attachments are refused while sharing is off (`sovereignty.ts`).

**Console accessibility and performance**

- Maps: `NationMap` units are keyboard-focusable with a roving `tabIndex`,
  Enter/Space selection and a Table view. The parcel map canvas has
  `tabIndex=0`, a role, a label and arrow, zoom and Enter keys.
- A global `prefers-reduced-motion` rule turns off animations.
- Server time per request on hot pages is small: `/gov/home` 25 ms, `/gov/twin`
  33 ms, `/ops` 47 ms, `/command` 140 ms, `/` 257 ms (434 kB HTML, about 170 kB
  of it inline SVG paths). The console poll (four endpoints every 15 s) costs
  6–17 ms per call.
- The exchange log (20,000) and rate-limit buckets (50,000) are bounded. Twin
  observations are batch-inserted.
