# Institutional baseline audit (step I0)

Read-only audit of 21 October 2026, after constitutional phases 0–7 were merged
(commit 16d2d5c). This is step I0 of `docs/INSTITUTIONAL_ARCHITECTURE_PLAN.md`
and the "immediate next step" of the specification
(`docs/INSTITUTIONAL_ARCHITECTURE_SPEC.md`, Part 6). No code was changed.

The detailed findings, each with file and line evidence and the command
behind every count, are in four parts:

| Part | File | Covers (spec Part 6 audit items) |
|---|---|---|
| A | `2026-10-institutional-baseline/A-inventory.md` | 1 inventory; 2 institution model, legal configuration, procedures, register owners; sector-by-sector state |
| B | `2026-10-institutional-baseline/B-sample-data-screens.md` | 3 screens still on generated data |
| C | `2026-10-institutional-baseline/C-isolation-and-gaps.md` | 4 production/demo isolation and audit coverage; 5 security and independence gap register |
| D | `../INSTITUTIONAL_ACCEPTANCE.md` | 7 the 91 acceptance items with the tests that prove them |

Item 6 of the audit, the implementation sequence, is §5 below.

Claude checked the main claims against the code before writing this
summary: the cited test names exist, the public posture panel and census
tiles are typed in as the parts say, simulated update health reports are
the default, the two routes run under a shared secret without an audit
entry, and two-person independence is recorded but not enforced.

## 1. What the platform is today

- 201 pages (identical to `route-lock.json`), 344 API route files (479
  methods), 73 durable stores, 46 database tables over 104 migrations, 19
  scheduled jobs, 8 exchange services, 59 registers with a named owner.
- 43 reference procedures across 10 domain modules, all shipped as drafts;
  14 permit-authority mappings proposed, none approved; no law and no rule
  ships. This is as the rules require: a nation approves its own.
- The constitutional controls (independence, relationships, offices, the
  profile, transitions, the legislature's record) are built and tested.
- Of the 41 sectors in the specification, **9 operational** (tax, customs,
  civil registration, education, immigration, professional licensing for
  health professions, judiciary, mapping, legislature), **13 partial**,
  **9 screens only** (procurement, labour, social protection, agriculture,
  water, corrections, transport, energy, environment) and **10 absent**
  (central bank, prosecution, defence, housing and planning, public works,
  electoral, ombudsman, human rights, anti-corruption, public service
  commission).
- Departments are `{id, name}` on the ministry record: no accountable office,
  services or staff. The 11 seeded ministries have no modules switched on.
  12 archetypes are constants.

## 2. Acceptance: 32 proven, 43 partial, 16 not yet (of 91)

| Part | Items | Proven | Partial | Not yet |
|---|---|---|---|---|
| 1 Executive and economic | 10 | 3 | 5 | 2 |
| 2 Human services | 15 | 7 | 4 | 4 |
| 3 Justice, territory, infrastructure | 15 | 2 | 8 | 5 |
| 4 Independent institutions | 15 | 5 | 7 | 3 |
| 5 Architecture | 16 | 6 | 9 | 1 |
| 6 Launch checklist | 20 | 9 | 10 | 1 |
| **All** | **91** | **32** | **43** | **16** |

Proven means a test asserts the behaviour; code without a test is Partial.
Strongest: independence and negative authorisation, two people compared as
persons, the tamper-evident audit chain, purpose-bound exchange, no samples in
production, tax and customs refusing simulated payments, customs release
conditions, backup and restore keeping the chain verifiable.
`lib/proof/birth-registration.test.ts` is the one end-to-end proof of a whole
service. Not yet: twelve sector services (budget and commitments, procurement,
subsidies, water inspection, offline sync, evidence custody, custody admission,
emergency warnings, building statuses, public-works payments, elections, audit
findings), protected identities, enabling federation later, the assisted and
offline channel.

## 3. Findings that matter most

### 3.1 Production shows generated figures outside the agency apps (Part B)

Only the agency apps (`/app/<domain>`, folded to "Not connected" under the
Simulation notice), `/command` and the console header change what they show in
production. Every other console page shows the same generated figures in
production as in demo. About 270 of 285 agency-app screens and about 205 of
290 console panels are generated; about 70 console strips and the
`RuntimeQueue` work items (76 placements) carry no marker. Three public blocks
show typed-in facts with no marker:

- `/government`: "STEADY", "National readiness 86/100 · 0 major incidents",
  "separation intact", "audit chain intact" (`app/(public)/government/page.tsx:126-136`).
- The public health alert can announce a health emergency from the simulation
  engine (`app/(public)/health/page.tsx:49`).
- Nation-looking facts without a marker: "Population impacted", "of 47"
  municipalities, census tiles "82.11M" and "2020"
  (`apps/ministry-interior/domains/PopulationAnalytics.tsx:266-267`), prison
  population, revenue and debt-to-GDP tiles, legislature and court counts
  (while the legislature's real record exists).

Also: the health ecosystem wall shows patient queues and risk scores, which
contradicts the rule of no patient or clinical field; and the interior app's
real-record screens sit inside the simulation fold, so production hides real
records.

### 3.2 Production and demo isolation (Part C)

All 21 sample-creating paths are guarded by `samplesAllowed()` with tests.
Remaining holes:

- Update Center: the home nation defaults to simulated health reports
  (`lib/data/updates.ts:109`), which always pass, so a production probation
  can pass on checks that never ran.
- `openCase()` accepts `source: 'sample'` in any mode, and deciding such a
  case writes an unmarked register entry.
- Backups record the storage mode, not the installation mode: a demo backup
  restores into production without refusal.
- `payBill()` itself has no mode check (the payments route does).
- `ministries/[id]/operations|regions|analytics` return generated figures
  without a sample marker.

### 3.3 Audit and access log (Part C)

184 of 220 mutating routes reach the audit chain; most of the rest are cron
runs or make no change. Real gaps: `api/admin/officers/bulk` and
`api/substrate/export` run under a shared secret with no audit entry (the
export dumps citizens, officers and consents); `/api/audit` is readable by any
signed-in official and the read is not logged. Personal-data reads not in the
access log: normal-sensitivity case reads with personal fields, the case list,
parcel rights and holders, permits, bill payers, the officials list. Refused
requests (403) are not logged.

### 3.4 Security and independence (Part C)

High severity:

- Two-person controls compare persons only when accounts are linked to the
  identity provider; otherwise two accounts count as two people and the
  independence is recorded (`accounts-only`), not enforced. One administrator
  could create a second account and confirm alone.
- No institution-scoped export, so no export can be checked offline.
- No protected-identity concept (whistleblowers, human-rights complainants)
  for search and export.
- One installation-wide data key and signing keys; key creation and rotation
  not audited or independently reviewable.
- Release signatures are placeholders; physical update media are checked by a
  typed seal number only.
- The shared provisioning and export secrets each grant whole-substrate power.

Medium: the event envelope (fixed source, no schema version, institution or
legal context, HMAC not a signature; no inbound receiver, duplicate check or
accept/reject record); exchange services not tied to the relationship
register, so a withdrawn relationship does not stop them; upgrade
compatibility declared, never detected against stored records.

### 3.5 Model findings (Part A)

- The delegations register names the business-register authority as its legal
  owner (`lib/data/register-owners.ts:254`), though delegations cover every
  procedure.
- No event catalogue: 295 audit action names become event types, 39 built at
  runtime.
- 7 apps (presidency, senate, assembly, emergency response, communications,
  foreign affairs, network operations) read no register at all.

## 4. Assessment

The kernel and the constitutional controls are sound and tested. The
specification's diagnosis holds: sector applications are not yet operational
systems. Two things should come before new sector work, because they concern
truthfulness and safety in production rather than features:

1. Nothing generated may look like a nation's fact in production (§3.1, §3.2).
2. The control gaps in §3.3 and the high-severity rows of §3.4 that are small
   to close.

## 5. Implementation sequence (preserves everything that works)

A new step **I0.1 — truth and safety in production** goes before I1. It
removes no page, panel or link: generated figures are marked, or folded to
"Not connected" in production exactly as the agency apps already do.

1. Update Center: a production home nation reads agent health reports; a
   probation never passes on simulated reports in production (test).
2. Sample isolation: `openCase()` refuses `source: 'sample'` and decisions on
   sample cases outside `samplesAllowed()`; a register entry from a sample case
   is marked; the backup manifest records the installation mode and a demo
   backup is refused in production; `payBill()` checks the mode itself; the
   ministry operations, regions and analytics responses carry `kind: 'sample'`.
3. Honest screens: the three public blocks read their real sources or show
   "Not connected"; every unmarked generated console strip, the `RuntimeQueue`
   work items and the ministry workspace sections get a `SignalTag`, and in
   production fold like the agency apps; the interior app's real-record screens
   move outside the simulation fold; nation-looking typed facts (census, "of
   47", population impacted) are removed from code into marked samples.
4. Health: patient queues and clinical risk scores leave the health wall
   (administrative and aggregate only, as the rules require).
5. Audit and access log: audit entries for `substrate/export` and
   `admin/officers/bulk` (the shared secrets are to be replaced by named
   officials, recorded in the integration register until then); log the case
   reads, case list, parcel rights, permits, bill payers and officials list;
   give `/api/audit` a read rule and log its reads; log refused requests as
   reference and rule only.
6. Two-person independence: a country rule (through `policy-change.ts`) that
   can require identity-provider independence; audit key creation and
   rotation; refuse a development key in production.
7. Corrections: the delegations register's legal owner; the cheap acceptance
   tests already backed by code (P3-01 court assignment, P5-05 exchange
   refused after suspension, P3-03 police finding, P2-02 caller and purpose on
   the exchange log).

Then the plan's order continues unchanged: I1 forms, I2 departments as
records, I3 indicators (which replaces the generated sector panels with
record-computed indicators or "Not connected"), I4 Health as the first
complete institution, and onward. The high-severity architecture rows
(institution export, protected identities, per-institution keys, signed
releases and media, event envelope, relationship-bound exchange) belong to I8
and I9 and are tracked in the acceptance register.

## 6. Evidence before a capability counts as complete

A capability counts as complete only when its rows in
`docs/INSTITUTIONAL_ACCEPTANCE.md` are Proven by a test that runs in CI, in a
production-mode run where the item concerns production. Each change that
proves or breaks an item updates its row in the same change.
