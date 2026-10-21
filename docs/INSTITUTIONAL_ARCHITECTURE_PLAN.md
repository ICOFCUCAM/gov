# Institutional architecture — assessment and build plan

The external specification is kept verbatim in
`docs/INSTITUTIONAL_ARCHITECTURE_SPEC.md` (six parts, ChatGPT, 21 October
2026). This document is Claude's reading of it against the code: what is
agreed, where Claude upgrades it, what is lower priority or conflicts with a
rule already in force, where each part lands in the existing systems, and the
order of work. It does not replace a word of the specification.

**Start condition (owner, 21 October 2026).** No implementation of this plan
begins until the constitutional phases (5 lifecycle, 6 transitions and
emergencies, 7 legislature and portability, and any further phase in
`docs/CONSTITUTIONAL_ARCHITECTURE_PLAN.md`) are complete and integrated. Step
I0 below is read-only and may run earlier only if the owner asks.

Markers used below:

- **Agreed** — implement as written.
- **Upgrade** — Claude's addition or sharpening; marked so it is never mistaken
  for the specification's text.
- **Lower priority** — Claude's assessment that it matters less now, or must
  wait for a nation's legal review. Not removed; scheduled later.
- **Conflict** — the specification proposes something a binding rule in
  `CLAUDE.md` already decides differently; the rule wins and the reason is
  given.

## 1. Overall assessment

Agreed in substance, almost entirely. The specification's central claims match
what the platform already enforces and say plainly what is still missing:

1. Preserve the foundation (institution register, case engine, relationships,
   law versions, registers, documents, payments, audit chain, exchange, twin,
   deployment boundaries) — the preservation doctrine says the same.
2. The main gap is that sector applications are not yet operational systems:
   their screens must invoke approved procedures, read authoritative records,
   persist decisions, manage evidence, enforce permissions and report service
   performance. This is the honest description of today's ministry apps, where
   many sector panels still run on generated samples (labelled Sample in demo,
   "Not connected" in production).
3. Nothing a country's law decides (fees, deadlines, powers, forms' legal
   wording, disclosure) is pre-filled; it ships as configuration or
   unapproved drafts. Already a platform rule (`lib/law/rules.ts`,
   `lib/permits/authority.ts`, reference procedures are drafts).
4. Independence and separation are enforced, not displayed (Part 4) — the
   constitutional phases already build this (`institutionBounds()`,
   `reaches()`, relationships, `accountChangeRule()`).
5. A ministry can start alone, connect later and leave without loss (Part 5) —
   the deployment model already names the institution as the deployable root
   (`lib/nation/deployment.ts`, `lib/institution/federation.ts`); the gap is
   portability proven by tests.
6. Do not rebuild; begin with a read-only audit (Part 6, "the immediate next
   step") — adopted as step I0.

## 2. Where each part lands in the existing systems

| Specification | Existing system to extend | Gap to close |
|---|---|---|
| Implementation contract per institution (Part 1 §1) | Ministry registry (`lib/data/store/institutions.ts`), archetypes (`lib/archetype-profiles.ts`, `lib/institution/archetype-spec.ts`), charters (`lib/institution/charters/`) | A per-institution capability manifest read from records (procedures, registers, offices, exchange services, indicators), not from archetype constants |
| Departments and directorates (every part) | Departments/modules on the ministry record, workspace homes (`lib/workspace/`) | Departments as records with an accountable office, services and staff; the department completeness view (§6) |
| Services, decisions, fees (every part) | Case engine (`lib/casework/engine.ts`, `packages.ts`), rules (`lib/law/rules.ts`), bills (`issueBill()`) | Reference packages for the services catalogued that do not exist yet (Cabinet decision, budget/commitment, procurement, labour complaint, benefit claim, subsidy, water inspection, building permit, land transfer, audit engagement, complaint, privacy investigation, statistical release, regulatory supervision, recruitment) — all as unapproved drafts |
| Registers and key fields (every part) | `lib/data/register-owners.ts`, procedure effects per register (`register-writes.test.ts`) | New registers join the owner list with their one changing API and `legal` authority; personal-data class per field |
| Form field contract (Part 1 §5.4, §11, Part 2 forms) | `FieldSpec` in `lib/casework/types.ts` (`text`, `longtext`, `date`, `number`, `choice`, `boolean`, `person`, `organisation`, `place`; `personal` flag) | Upgrade below (§3.1): typed references, value sources, validation by named rule, personal-data class, evidence, assisted and self-service variants, locale |
| Exchange contract (Part 2, Part 5 API/event) | `callService()` (`lib/exchange/services.ts`), purposes, two-official integration approval, HTTP signatures, mTLS | Event envelope fields named by the specification; inbound authority check per event; revoked relationship stops new exchanges (test) |
| Outbox and reliable delivery (Part 5) | `lib/events/outbox.ts`, `deliver.ts`, restore epochs | Duplicate-ID test for legally material actions; recorded accept / reject / pending on the receiver |
| Twin contract (Parts 1–3) | `lib/twin/register.ts`, `signal.ts`, scenarios | Indicator definitions per institution (denominator, period, coverage, method); missing never becomes zero (test) |
| Independent institutions (Part 4) | Constitutional phases 0–7 | Oversight workflows (audit engagement, complaint, privacy investigation, statistics release, regulator supervision, recruitment) as procedures of those institutions |
| Privileged administrators (Part 4) | Roles (`roles.ts`), audit administration apart (`confirmByOversight()`), access log not readable by administrators | Key-management and privileged operations reviewable by an independent reviewer (test 5.12) |
| Minimum sovereign kernel (Part 5) | Identity/sign-in, roles, laws, procedures, registers, audit chain, documents and signatures, payments, notifications, public site, backups, updates — all exist | A declared "Institutional Edition" profile: which kernel parts run local and which switch to national shared services, read from the deployment profile |
| Portable record package (Part 5) | Backups (`lib/data/backups.ts`), evidence packs (`lib/data/evidence.ts`), certificates (`/verify`) | An institution-scoped export (records, documents, schemas, audit evidence) verifiable without the source system |
| Legacy migration lifecycle (Part 5) | Case import (`lib/data/case-import.ts`), organisations import, twin source runs | A migration manifest (discover → retire) with reconciliation counts and source provenance per migrated record |
| Completeness model (Part 5 D) | Onboarding hub (`lib/onboarding/status.ts`), readiness (`lib/data/readiness.ts`) | Per institution and per department, from records, "Not assessed" until a check exists (§6) |
| Design system (Part 6) | `lib/theme/tokens.ts`, `docs/CONSOLE_DESIGN.md`, `ConsoleMark`, `SignalTag`, console menu | A fourth ground (institutional workspace) and the component states listed (§3.3) |
| Production / training / demo (Parts 2, 4, 6) | `lib/ops/mode.ts`, `samplesAllowed()`, Simulation notice | Tests named in the specification that are not yet covered (simulated payment refused in production; test election result cannot enter a register) |

## 3. Claude's upgrades

### 3.1 Forms: one field contract, two channels

**Upgrade.** The specification's JSON field contract becomes the case engine's
own `FieldSpec`, versioned with the procedure package (a form is never a
separate thing that can drift from its procedure):

- Types added: `enum` with `valuesSource` (an approved list: a rule, a register
  type, the nation's regions), `identifierReference` (verified through an
  exchange service only where lawful), `registryReference` (must point to an
  existing record or an authorised pending one), `localizedText`, `money`
  (currency from the nation, amount never typed from a rule), `document`
  (evidence class), `address` and `point` (checked like `placePoint()`).
- Every field carries `personalDataClass` (`public`, `administrative`,
  `personal`, `restricted`, `special`) replacing the `personal` boolean, which
  stays as a derived value for old packages (`withDefaults()`).
- Validation by named rule, never free code: `required`, length, pattern from
  an approved list, cross-field rules, and "verify with service X if lawful".
- Plain-language label, hint and error text per field, in every official
  language, through the translation review the public sites use.
- The same form renders in self-service and assisted modes (an officer at an
  office records who assisted and which identity evidence was seen); a paper
  form prints from the same definition.
- The form shows the law and version that require each piece of evidence.

### 3.2 Indicators: a definition before a number

**Upgrade.** Every KPI in the catalogue becomes an indicator definition owned
by its institution (numerator, denominator, period, coverage, source records,
method version) computed only from persisted records, published to the twin as
an observation of that institution's source. A definition with no data shows
"Not connected", never zero.

### 3.3 Design system

**Upgrade and conflicts resolved:**

- The proposed palette becomes a fourth ground in `lib/theme/tokens.ts`
  (`WORKSPACE`), mirrored in `globals.css`, held by `tokens.test.ts`. No raw
  hex in components (Conflict: the specification lists hex values; the rule
  that colours come only from tokens wins, the values themselves are kept).
- Contrast check of the proposed values: primary text `#252B29` 13.4:1 on the
  canvas; secondary text `#6B7470` is **4.48:1 on the canvas `#F7F7F2` — below
  4.5:1**, so it is darkened slightly until the test passes (4.82:1 on white
  surfaces is fine). Sovereign green `#193B35` 11.4:1; copper `#A85D42` 4.53:1
  on the canvas, used for emphasis only, never for body text below 4.5:1.
- Sovereign green is the platform default for primary actions; once setup is
  complete the nation's own colour takes that role through the accessible
  theme (`accessibleTheme()`, 4.5:1), as the console already does with
  `sealTile()`. Status colours stay separate and never take the nation's
  accent or copper.
- Typefaces (Conflict): the specification recommends a system font stack to
  avoid outside font services. The binding rule is that typefaces are
  self-hosted under `public/fonts` and nothing loads from outside; that already
  meets the specification's reason. Kept: self-hosted fonts first, the system
  stack as fallback.
- The three directions map onto grounds that exist: Sovereign Editorial +
  Modern Institutional become the workspace ground; Operational Command is the
  existing `CONSOLE` ground (Situation Room, command pages). No new third
  system.
- Component inventory with required states (loading, empty, partial, error,
  refused with reason, waiting for a second official, sample, simulated, not
  connected, offline, stale) becomes a checked list in a component test, like
  `PublicSite.test.ts` does for public blocks.

### 3.4 Completeness without a second control plane

**Upgrade.** Institutional readiness and platform completeness (Part 5) are
read in `lib/onboarding/status.ts` and the institution's workspace from the
systems that hold the facts, never stored as a separate score: legal grounding
(approved procedures, cited law versions), service configuration, staffing
(named officials per office and department), authoritative data (registers
with an owner and records), connections (approved exchange services),
portability tested (last export verified), continuity tested (last restore
drill). Each reads "Not assessed" until its check exists. The onboarding page
stays a reader with links to where each fix is made; it never becomes an
alternate control plane (owner's safeguard).

### 3.5 Acceptance tests as the definition of done

**Upgrade.** The 91 acceptance items across the six parts (10 + 15 + 15 + 15 +
16 tests, and the launch checklist of 20) are copied into a test register
(`docs/INSTITUTIONAL_ACCEPTANCE.md`, step I0) with the test file that proves
each one, or "not yet". A sector is complete only when its tests pass in a
production-mode run.

## 4. Lower priority (Claude's assessment) — kept, scheduled later

- **Central bank operations** (monetary operations, reserves, payment-system
  oversight internals). The platform should hold the central bank's public
  registers (licensed institutions) and its independence; its operational
  systems are specialist and rarely replaced by a government platform.
- **Defence and national security** beyond civilian administration
  (procurement, personnel administration, estates). Sensitive, rarely in a
  first deployment; anything operational is out of scope.
- **Corrections, prosecution, anti-corruption investigation and electoral
  results.** High legal risk: built only as unapproved drafts after the
  independent institutions' foundations, and each needs a country's legal
  review before use (as the specification itself says). Asylum, border
  enforcement and risk scores stay excluded under directions §15.
- **Three alternative design directions.** Informative; one is chosen (§3.3).
- **Standards** (corrected 21 October 2026 by the requirements register): not
  informative. Where the specification names a standard for a domain (GFS/GFSM
  for finance, the WCO data model for customs, OCDS for procurement, the tax
  administration standards, ISO 3166/4217/19160, ICAO 9303, INSPIRE), the
  domain's step builds a versioned mapping and a conformance test. Only the
  bibliography itself is informative.
- **Hybrid federation models in full.** The institutional federation path is
  built first; mixed hosting already has the hosting paths and the mirror.
- **Field and mobile work channels such as USSD/SMS.** Valuable for
  agriculture and social protection, but they need a provider; they enter the
  integration register as stubs until a nation connects one.

## 5. Build order (after the constitutional phases)

**Traceability (owner's instruction, 21 October 2026).** Every requirement of
the specification is a row of `docs/INSTITUTIONAL_REQUIREMENTS.md` with its
status and the step that delivers it. A step's brief lists the requirement IDs
it must deliver, and a step is finished only when each is met or its deviation
is written down with the reason (a binding platform rule stricter than the
specification, or a decision the nation's law makes). No step may cover less
than the specification for its area.

Each step is a working, end-to-end service under production rules, not
screens. Every step: unapproved drafts for anything a law decides, two
officials, access log, `build:openapi`, integration register, console menu tabs
and `route-lock.json`.

| Step | Content | Size |
|---|---|---|
| I0 | **Done 21 October 2026.** Read-only audit (Part 6 "immediate next step"): `docs/reviews/2026-10-institutional-baseline-audit.md` (inventory, generated screens, isolation and audit coverage, gap register) and the acceptance register `docs/INSTITUTIONAL_ACCEPTANCE.md` (91 items: 32 proven, 43 partial, 16 not yet) | M |
| I0.1 | **Done 21 October 2026.** Truth and safety in production (added by the audit, §5 there): no simulated update health in production; sample cases, backups and payments refused outside demo and training; every generated figure marked and folded to "Not connected" in production like the agency apps; no patient or clinical figures on the health wall; audit and access-log gaps closed; two-person independence as a country rule; small corrections and cheap acceptance tests. Removes nothing | M |
| I0.2 | Fixes to what is built (requirements register, findings): structural changes to institutions, departments, modules, integrations and webhooks record the verified official instead of `'operator'`; departments are ended with a reason and kept, never deleted; training and demo installations never send real notifications or webhooks (`lib/messaging`, `lib/events/deliver.ts` check the mode); municipal onboarding no longer reports "provisioned" while storing nothing; the composite readiness score stops gating activation (replaced in I2) | S |
| I1 | Form contract (§3.1, raised to the specification): every field type and data class the 16 form contracts use (incl. attestation, date range, quantity with unit, timestamp, polygon, ISO country/currency codes, composite and repeatable fields, restricted flag, verified contact, approval evidence; classes incl. tax-confidential, commercial, financial); entered-versus-verified source on every value; evidence-policy and declaration-text versions per submission; save and resume; all 16 forms field for field with a conformance test against the specification; reusable field groups and a JSON form library loader for the full catalogue; renderer for self-service, assisted and print; form designer in package drafts; law-dependent deadlines and appeal periods moved out of code into package configuration set by the nation. Existing packages keep working | L |
| I2 | Departments as records with an accountable office, services and staff; the internal administration workspace every institution has (spec §10: HR, finance, procurement, assets, records, internal audit, legal, ICT, communications, planning, M&E); capability manifest from records; completeness per item (owner, date, next action) replacing the composite readiness score; attribute scoping of roles by facility, jurisdiction and task; navigation filtered by permission; delegations read in authorisation where the law allows (transparent delegation) | L |
| I3 | Indicator definitions and the twin contract (§3.2): numerator, denominator, period, coverage, method version, approved-aggregate disclosure rule (small-cell suppression), per-domain qualifications (spec Part 3 F); replace generated sector panels with record-computed indicators or "Not connected" | L |
| I4 | Health as the first complete institution: facility and pharmacy licensing with inspections recorded as findings under an assigned inspector's account; professional registration for health professions; returns as aggregates; health programme, supply and complaint records (administrative); roles scoped by facility, jurisdiction and task; standalone Institutional Edition profile, portable export; its acceptance tests | L |
| I5 | Economic group (Part 1) in full: Presidency and Cabinet (collective decisions with vote and quorum steps, decisions and action register, directives citing the laws register with required responses, petitions, correspondence, appointments, official publications, a collective executive where the nation has one); Treasury (budget and commitments, general ledger, debt instruments and transactions, transfers and grants, public investment projects, period close, fiscal reporting, GFS mapping); Tax extensions (policy authority kept apart, compliance and audit, debt, legal, refunds, payment arrangements, return versions and amendments, objection admissibility, manual adjustments recorded, recusal on objections); Customs extensions (other agencies' release prerequisites, valuation, exemptions and relief, post-clearance audit, refunds and drawback, advance rulings, appeals, WCO mapping); Procurement planning to award and contract management after award (OCDS mapping); Trade and investment support; Central bank public registers | XL |
| I6 | Human services (Part 2) in full: Identity authority (credential issuance, status and revocation, identity resolution, fraud and duplicate cases, certificate delivery records); Immigration passports and travel documents with fees from the approved tariff; Education extensions (school year records as aggregates, teacher workforce, examinations, grants); Labour (employer registration, complaints and inspection, employment services); Social protection claims with reproducible calculation; Agriculture in full (registers, programmes, subsidies reconciled with payments, extension services, livestock and fisheries administration); Water (abstraction and discharge permits, utilities regulation, interruptions, capital projects, inspections); Professional licensing beyond health (non-health professions, accreditation of training providers); fieldwork (assignment by geography and action, offline sync without overwrite, device management, controlled paper intake and reconciliation) | XL |
| I7 | Territory and infrastructure (Part 3) in full: land transfers, encumbrances and disputes on the parcel register; mapping extensions (address register, metadata catalogue, imagery, licensing, surveyors, layer authority); building permits and housing programmes; transport (roads, vehicles and drivers where the nation assigns them, aviation and maritime administration, road reports); energy and mining (licensing, regulator exchange, outages); environment (permits, impact assessments, monitoring, enforcement referrals); public works projects and payments; emergency incident lifecycle with authorised warnings; local and regional government services | XL |
| I8 | Independent oversight (Part 4) in full: legislature extensions (questions, petitions, committee proceedings, members, budget scrutiny, version comparison, chamber roles); audit engagements and findings; ombudsman and human-rights complaints with protected identity; human-rights monitoring visits and thematic inquiries; anti-corruption and whistleblower reports with protected identity kept out of search and export; data protection (registers, DPIA records, breach notifications, investigations); statistics releases with revisions; regulator supervision; public service recruitment; audit entries with separate institution, purpose and correlation fields (a new hashed entry format); security officer and legal-authority administrator roles | XL |
| I9 | Federation and portability (Part 5) in full: per-endpoint API contract and endpoint families; event envelope with schema version, institution and legal context, signatures, inbound receiver with duplicate detection and accept/reject/pending records; event outbox carrying no actor names or free text to subscribers; exchange services bound to the relationship register (a revoked relationship stops exchanges); per-institution keys; signed releases and verified update media; declared degraded states; control plane separated from the data plane; deployment profiles with load tests; per-deployment infrastructure controls (RTO/RPO, residency, administrator access, network zones, exit); migration manifest; institution export verified offline; restore into a clean environment | XL |
| I10 | Workspace design system (§3.3) on every institutional screen: tokens for typography and spacing as well as colour, the component-state test, navigation by permission, screen-reader and human usability testing recorded | L |
| I11 | After legal review: prosecution, corrections, court-side extensions (fees and waivers, e-filing, service records, orders and warrants, recorded assignment method, judgment corrections and appeals as separate events, redacted publication, procedural roles), police extensions (complaints against officers, purpose on protected queries, bulk-search prevention, referral reconciliation), elections, defence civilian administration — drafts the nation approves | XL |
| Throughout | Installation modes per spec Part 6: separate credentials per mode, mode changes only through an authorised process, background jobs and webhooks keep to the environment boundary; standards mappings with conformance tests in each domain's step | — |

The order follows the specification's own priorities (Part 3 implementation
order, Part 4 order, Part 6 roadmap and pilot choice) adjusted to what already
exists: forms, departments and indicators come first because every sector
needs them, then one institution completed to the launch checklist before
widening.
