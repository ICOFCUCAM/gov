# Running a whole government: review, decisions and plan

Status: working record, October 2026. The agreed directions built on it,
which govern where they differ, are in `docs/GOVERNMENT_OPERATING_DIRECTIONS.md`. Kept so later work (design document,
implementation, re-evaluation of outside advice) starts from what was found
and decided, not from memory. Update it when a decision is made or a finding
changes.

## 1. The question that started it

The owner asked whether, behind each ministry's public site, there is an
administrative back office where the ministry's affairs are recorded and
coordinated (example: a university must be registered and accredited by the
Ministry of Education before it counts as registered), or whether everything
beyond the public sites is only monitoring. Then: how do police, immigration
and the rest handle their affairs? The owner's position: the systems are
there but must be structured professionally, and **CivicOS is meant to run
the entire government of a country**. The twin holding numbers is not the
measure; the plan must put whole-government operation into perspective.

## 2. Findings (code read October 2026)

Persistence tiers used below:
**P** platform stores (`globalThis.__civicos*`, `lib/data/**`, audited,
durable); **S** Supabase substrate (`lib/db/repos/*`, `app/supabase/migrations`);
**L** browser localStorage (`lib/gov/*-store.ts`); **Sim** pure seeded engines
(`lib/gov/*-systems.ts` etc., numbers from `seed()`/`wave()` in
`lib/telemetry.ts`, nothing stored).

### 2.1 Overall verdict

The screens and vocabulary of every agency exist and are well designed; the
records underneath almost all of them do not. CivicOS has built the
oversight layer (dashboards, twin, command centres, maps) and parts of the
registers of places; the casework and exchange layers are almost empty and
the oversight layer is fed by simulation. That is why the system feels like
"only monitoring".

### 2.2 Shared core that is real and can be built on

- Institutions register (`/api/org/ministries`, `lib/data/store/ministries.ts`;
  `Ministry` in `lib/api/types.ts`: archetype, departments, modules), audited.
- Officials, roles and sign-in: `lib/auth/roles.ts` (Administrator, Can sign,
  Officer, Auditor; scoped to an institution or the whole government),
  `lib/auth/officials.ts`, OIDC, passkeys, two-step codes.
  (A second, unused permission model exists in `shared/permissions/rbac.ts`.)
- SHA-256 audit chain with witnesses and signed heads.
- Registers built properly: facility register (`lib/data/facilities.ts`; four
  eyes, versions, published sites become twin entities), land parcels
  (`lib/data/parcels.ts`), boundaries.
- Directives (`lib/data/directives.ts`): draft, signed, effective, rescinded
  (no legal-basis field, "sign" is a status change, not a cryptographic signature).
- Permits (`lib/data/store/permits.ts`, `/api/permits`, citizen form
  `/wallet/permits/new`, decided in `/console`): the only full
  apply, review, decide flow; generic types, not owned by a ministry, no
  inspection, no certificate.
- Ministry task lists (`/gov/ministry/[id]`, `QueueItem` in `lib/api/types.ts`):
  seeded samples, real cases via CSV or a connected case system
  (`lib/data/case-import.ts`); actions only assign, escalate, clear; no
  documents, applicant, decision or deadline on a case.
- CloudEvents outbox and signed webhooks (`lib/events/*`), federation grants,
  ODRL usage policy, signed exchange receipts (`/api/federation/exchange`);
  the exchange returns allow/deny only and carries no data.
- Messaging outbox, backups and restore, retention of personal data,
  dual control, Update Center, public sites, the twin.
- Payments: paying one of 3 hard-coded bills with a receipt (`/api/payments`);
  no way to create a bill.

### 2.3 Substrate (Supabase) workflow runtime

`civicos.workflow_definitions`, `work_items`, `work_item_steps` (signed
steps, actor, stage validation in SQL), `service_requests`, `appeals`,
`consents`, `receipts`, `citizens` (`national_id` is a column the citizen
supplies). Ten hard-coded generic workflow kinds (`lib/gov/runtime-workflow.ts`
`WORKFLOWS`), no forms, documents, role rules or legal basis per step. Used by
`/gov/workbench` and `/gov/intake`, which show "not configured" without
Supabase. Owned by the substrate (`lib/data/register-owners.ts`,
`citizen-runtime`). Step signatures use a key in the browser's IndexedDB,
falling back to a plain hash.

Result: **three separate casework mechanisms** (permits, ministry task lists,
substrate work items) plus a fourth, browser-only one (`runtime-store.ts`,
the `RuntimeQueue` at the bottom of every agency app). The substrate one
disappears in a self-hosted installation without Supabase.

### 2.4 Twin

`lib/twin/register.ts`: entities of kind nation, place, institution,
facility; observations are numbers with `validFrom`/`validTo` (when true) and
`recordedAt` (when known), sources, runs, withdrawal. It cannot hold a
standing ("accredited until 2029 under decision Y"), organisations outside
government, people, or relationships. Correct design for oversight: the twin
should derive its picture from registers and cases, not hold the
government's business.

### 2.5 Agencies, domain by domain

| Domain | Screens | Real records |
|---|---|---|
| Police (`apps/police-command`) | about 20 (dispatch, investigations, forensics, internal affairs) | none: no incident, crime report, arrest, custody or evidence record; counts like `2400 + seed*800` |
| Immigration (`apps/immigration`) | KPIs only | none: no visa, residence permit, crossing, asylum claim |
| Customs (`apps/customs`) | KPIs only | none: no declaration, consignment, seizure |
| Courts, justice, prisons (`apps/judiciary`, `judicial-branch`, `ministry-justice`, `justice`) | about 30 | types exist (`CourtCase`, `ChainOfCustodyTransaction`...) but regenerated every tick; nothing stored |
| Emergency (`apps/emergency-response`) | 7 | simulated; the real incident API `/api/ops/incidents` (P) exists but the app does not use it |
| Interior (`apps/ministry-interior`) | 68 | civil registry figures simulated, marriage count a literal; `PermitsLicensing` reads real permits (read only) |
| Foreign affairs | missions, consular, passports | simulated aggregates |
| Defence | none | none |
| Health (`apps/ministry-health`, 17 subsystems) | wards, labs, pharma | simulated; patient/encounter only as generic browser records |
| Education | schools, exams | simulated; enrolment only in the browser; no student or school register |
| Labour, trade, agriculture, transport, energy, environment, communications | registries, inspections, subsidies, permits | display only; no company, employer, benefit claim, farmer, vehicle, driver licence |
| Treasury | budget, tax, procurement, ledger | simulated; only the 3 sample bills are real |
| Civil registration | in interior | no birth, death, marriage or national ID record at all |
| Legislature, presidency | bills, decrees | bills generated from seeds; no register of laws; nothing cites a legal basis |

Other gaps: citizen sign-in is a demo (`/login` sets `civicos_session=demo`,
hard-coded citizen); no document store or attachments; `/api/documents/verify`
accepts any code starting `VC-`; `/api/signatures` returns a plain hash;
cross-ministry referrals exist only in the browser (`lib/gov/referral-store.ts`);
archetypes list `domainEntities` (Hospital, School, Business, Licence...) and
modules (`licensing`, `business-registry`) with nothing behind them.

### 2.6 Planned in the blueprints but not built

`CIVICOS_MASTER_BLUEPRINT.md`: M06 Permits and Licensing (applications,
inspections, renewals), M10 welfare case management, M12 courts case
management and e-filing, trade licences, higher-education accreditation,
driver licensing, asylum case management, occupational safety inspections,
end-to-end business registration, verifiable licence credentials.
`CIVICOS_VOL_II_CIVILIZATION_INFRASTRUCTURE.md`: self-executing permits,
inspections and registrations; licence renewal in under five minutes.
Existing reference documents to reconcile with the design:
`docs/01_REFERENCE_ARCHITECTURE.md`, `docs/04_MODULE_CATALOG.md`,
`docs/07_DATA_DICTIONARY_AND_INTEROP.md`, `docs/112_LAW_ENFORCEMENT_REQUEST_HANDLING.md`.

## 3. How a government runs (the frame for every decision)

1. **Registers**: who and what exists (people, organisations, places, land,
   vehicles, laws).
2. **Cases**: what is being done (crime report, visa, court case,
   accreditation, tax return): filed, checked, decided by a named official
   under a cited law, documented, appealable.
3. **Exchange**: agencies asking each other (immigration checks the civil
   registry, police check vehicles, education asks health for an inspection).
4. **Oversight**: dashboards, twin, command centres, computed from 1 to 3.

## 4. Target structure (proposed, measured against GovStack building blocks and X-Road)

**A. Shared core, built once**
- Base registers: people (civil registry), organisations, vehicles, laws and
  regulations (every decision cites its legal basis); places, land and sites
  already exist.
- One casework engine owned by the platform (substrate as mirror),
  configured per agency: case types, forms, required documents, who may
  decide, legal deadlines, four eyes, appeals, legal basis. Permits, ministry
  task lists and substrate work items become views of it; nothing removed.
- Documents and records: attachments, file plan, archival retention, real
  digital signatures on decisions.
- Real identity: citizen sign-in connected to a national eID (MOSIP or the
  country's own), acting on behalf of an organisation, mandates and delegation.
- Exchange between agencies that carries data (X-Road model) on the existing
  controls (integration keys, mTLS, usage policy, signed receipts).
- Payments connected to cases (fees, bills, receipts).

**B. Agency packs on the core** (configuration and screens, not new engines)
- Police: incident, crime report, investigation, arrest and custody, evidence
  chain, handover to prosecution.
- Courts: filing, hearing, judgment, sentence, prisons.
- Immigration: visa and residence applications, border crossings, asylum.
- Civil registry: birth, death, marriage, national ID.
- Education: school and university accreditation. Health: facility and
  professional licensing. Trade: business register. Treasury: tax, budget,
  procurement. Then the rest.
- Registered organisations and their standing feed the twin as status facts
  on the twin's two time axes; organisations link to the facility register
  (a university's campuses are registered sites).

**C. Keep every existing screen** (preservation doctrine). Each switches to
real records when its pack exists; until then it is clearly marked as
simulation or training mode.

**Sequence**
1. Core: casework engine, documents, laws register, people and organisations registers.
2. First four packs proving the whole cycle: civil registration, police
   incident to case, immigration visa, university accreditation.
3. Courts and prisons, business register, tax and budget.
4. Remaining ministries; dashboards and twin switched from simulation to records.

## 5. Decisions already made by the owner (still binding)

- Platform owns records, the substrate mirrors (D8); civic-api forwards
  writes to the platform and is kept fed.
- Each nation's deployment has its own national administrator;
  installation-level decisions (data export, agent credentials, break-glass,
  retention, waivers) are not available to ordinary institutional officers;
  no central CivicOS operator or other nation approves routine administration.
- Dual control means two different signed-in officials; reads are scoped to
  the official's institution; the first administrator needs the one-time
  setup code.
- Sign-in required on hosted deployments (Vercel); the software must also run
  self-hosted on one computer (`npm run self-host`, `docs/SELF_HOSTING.md`).
- Preservation doctrine in `CLAUDE.md`: nothing deleted, extend in place.

## 6. Open decisions (asked, not yet answered)

1. Approve the platform as the one owner of casework (substrate as copy).
2. Confirm the first four packs or name others.
3. Citizen identity: connect a national eID (MOSIP or the country's own) or
   build the platform's own registration first.
4. Write the design document `docs/GOVERNMENT_OPERATING_MODEL.md` (record
   types and steps per pack) before building phase 1 (recommended).

## 7. Outside advice

The owner is relaying twelve questions to ChatGPT (casework engine vs
dedicated systems, first packs, minimum record types for civil registration,
police, immigration and courts, laws register standards such as Akoma Ntoso
and ELI, identity with MOSIP/OIDC/verifiable credentials, standards per
layer, minimum exchange layer, safeguards for police and immigration data,
open-source systems to integrate (OpenCRVS, MOSIP, X-Road, OpenSPP, DHIS2,
OpenG2P), why programmes fail, labelling real vs simulated figures, and
criticism of the plan).

Rule for using it: the advice cannot see the code. Each point is checked
against this record, the code and the cited standards; what holds up is
adopted, disagreements are stated with reasons. It does not override the
owner's decisions in section 5 or the rules in `CLAUDE.md`.
