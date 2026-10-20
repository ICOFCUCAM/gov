# Cycle 3: assessment before work (tax, education, health, customs, permit authorities)

Written 2026-10-20 at commit `9119716`, before any cycle 3 change. The owner's
Cycle 3 directive (tax, education, health, customs on the existing foundation;
a permit authority registry; nothing legal or national invented; production
decisions off until a country approves its rules) is the brief.

## State of the deployment

- Branch `claude/festive-meitner-ivhxsn`, PR ICOFCUCAM/gov#4, clean and in
  sync. Every check on `9119716` passed (typecheck and tests, substrate SQL,
  public-sites and console accessibility audits, console smoke and OGC
  conformance, Helm, dependency audit, image scan); the Vercel preview is
  ready. Not merged.

## What exists that cycle 3 builds on

| Capability | Where | Reused for |
|---|---|---|
| Workflow engine: approved, tested, versioned procedures; four-eyes; idempotency; version checks; deadlines; assigned-only steps; sealed decisions citing the law; referrals as linked cases | `lib/casework/` | every sector procedure |
| Laws register (versions, provisions, ELI ids, Akoma Ntoso) | `lib/law/register.ts` | legal basis of every rule and decision |
| Deployment profile: who is legally responsible for what | `lib/nation/deployment.ts` | new authorities (tax, customs, education, health regulation, professional regulation) |
| Organisations register with register types per authority, standings, public check, CSV load, twin entities | `lib/organisations/` | schools, providers, health facilities, pharmacies, declarants and importers; no second institution identity |
| Facility register (published sites) | `lib/data/facilities.ts` | health facilities' and schools' premises |
| Twin with provenance (method, records lineage), sources and runs | `lib/twin/` | aggregate reporting (capacity, enrolment, revenue counts) |
| Exchange services with signed receipts | `lib/exchange/services.ts` | taxpayer, qualification, professional and declaration status checks |
| Access log, access watch, retention (anonymise only for procedure cases) | `lib/records/`, `lib/data/retention.ts` | restricted tax, customs and professional records |
| Payments: citizen bills and receipts on the nation's rail | `lib/data/store/payments.ts`, `/api/payments` | liabilities from assessments and duties, reconciled from receipts |
| Permits (building, business, market stall, event, vehicle, food handling) on their own decision workflow | `lib/data/store/permits.ts`, `/console` | kept as they are; the authority registry names who keeps each type |

## Gaps the directive asks to close

1. **No register of which authority keeps each permit or licence type.** Register types name an authority, but nothing records the legal basis, effective dates, lead and consulted authorities, or who may renew, suspend, revoke and hear appeals, and nothing requires that mapping to be approved before it governs decisions.
2. **No home for operational rules (rates, tariffs) separate from legal texts.** Without one, tax and customs would either hardcode figures (forbidden) or have no automatic calculation at all.
3. **Payments are not linked to liabilities.** A bill has no payer or reference, so nothing can be reconciled to a tax account or a declaration.
4. **Tax, customs, health and education hold no records.** Their apps show simulated data only.
5. **No register of licensed individuals** (health professionals and other regulated professions); the organisations register holds bodies only.

## Plan (each step one reviewed commit with its tests and register entries)

1. Authorities for tax, customs, education, health regulation and professional regulation in the deployment profile.
2. Permit authority registry (`lib/permits/authority.ts`): versioned mappings, drafts by default, approval by a second official, effective dates, handover on change, lead and consulted authorities; proposed defaults ship as **unapproved drafts**; register types and procedures consult the approved mapping.
3. Operational rules registry (`lib/law/rules.ts`): rate tables and tariff schedules as versioned data with citations and tests, approved by a second official, never shipped with figures; calculations use only an approved rule in force, otherwise an official enters the amount with reasons.
4. Payments linked to liabilities: bills carry a payer and a liability reference; reconciliation from receipts.
5. Tax: taxpayers, tax accounts and ledger, returns, assessments, payments, amendments, objections, status check service.
6. Education: school registration and inspection on the organisations register, qualifications register with verification, aggregate enrolment reporting.
7. Health: facility licensing on the organisations register linked to registered sites, professional register (`lib/professions/`), referrals, aggregate capacity reporting; no patient records anywhere.
8. Customs: declarations with goods lines and classification codes, duty assessment through the rules registry, payment, inspection referrals (an officer chooses the control channel; no automated risk score), release.
9. Tests for authorisation, cross-agency isolation, idempotency, audit evidence, corrections and recovery; docs, integration register, demo set, full checks.

## Progress

Steps 1–6 built (integration register 18.19–18.23). Steps 7–9 follow.

## Kept out of cycle 3 (unchanged decisions)

Asylum, border-crossing enforcement, police investigations and evidence,
judgment publication; tax and customs figures (rates, penalties, deadlines,
tariffs); real permit register migration before its authority, legal basis
and data owner are confirmed; national patient and student record systems.
