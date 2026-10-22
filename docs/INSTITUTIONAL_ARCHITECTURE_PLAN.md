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
than the specification for its area. The same holds for the forms catalogue
(`docs/forms-catalogue/`: parts 1–13 and the supplement, parts 14–22; owner's
instruction 21 October 2026: never summarised, every item measured and closed
stage by stage, forms built above its standard, never below): every catalogue
item is a row of the register with the step that delivers it, every form has
one form status from the binding scope list (`docs/requirements/form-scope.json`)
and the verified gap report (`docs/forms-catalogue/GAP-REPORT.md`) is
regenerated with the register (owner's direction 2026-10-21: register first,
then contracts in controlled batches).

Each step is a working, end-to-end service under production rules, not
screens. Every step: unapproved drafts for anything a law decides, two
officials, access log, `build:openapi`, integration register, console menu tabs
and `route-lock.json`.

| Step | Content | Size |
|---|---|---|
| I0 | **Done 21 October 2026.** Read-only audit (Part 6 "immediate next step"): `docs/reviews/2026-10-institutional-baseline-audit.md` (inventory, generated screens, isolation and audit coverage, gap register) and the acceptance register `docs/INSTITUTIONAL_ACCEPTANCE.md` (91 items: 32 proven, 43 partial, 16 not yet) | M |
| I0.1 | **Done 21 October 2026.** Truth and safety in production (added by the audit, §5 there): no simulated update health in production; sample cases, backups and payments refused outside demo and training; every generated figure marked and folded to "Not connected" in production like the agency apps; no patient or clinical figures on the health wall; audit and access-log gaps closed; two-person independence as a country rule; small corrections and cheap acceptance tests. Removes nothing | M |
| I0.2 | Fixes to what is built (requirements register, findings): structural changes to institutions, departments, modules, integrations and webhooks record the verified official instead of `'operator'`; departments are ended with a reason and kept, never deleted; training and demo installations never send real notifications or webhooks (`lib/messaging`, `lib/events/deliver.ts` check the mode); municipal onboarding no longer reports "provisioned" while storing nothing; the composite readiness score stops gating activation (replaced in I2) | S |
| I1 | **First slice done 21 October 2026** (`docs/FORMS_CONFORMANCE.md`): the form contract with every type and class below, provenance and versions per submission, save and resume, the three channels and print, the designer, the 16 specification forms and the field series' groups and contracts as library drafts with a conformance test, the envelope mapped, day counts set by the nation, the binding scope read from `docs/requirements/form-scope.json`, and publication refused unless every gate passes (automatic checks kept apart from human approvals that are acts of different signed-in officials, never a status field). Still open in I1: the I1-catalogue registry of every catalogue form ID and contracts in controlled batches after the verified gap report. Batch 1: health regulation, 25 forms, contract_draft (21 October 2026; HLT-FAC-001 … 010, HLT-LIC-001 … 014, HLT-PH-015; `docs/FORMS_CONFORMANCE.md` §8, `app/src/lib/forms/library/catalogue-contracts/`). Batch 2: medicines and devices, 21 forms, contract_draft (21 October 2026; HLT-MED-001 … 015, 017 … 020, 023, 024; HLT-MED-016, 021, 022 excluded; `docs/FORMS_CONFORMANCE.md` §9). Batch 3: taxpayer registration and account, 29 forms, contract_draft (21 October 2026; the taxpayer.* rows of Part 2 §2.6 but the business registration, the two taxpayer.registration.further_information rows kept apart; `docs/FORMS_CONFORMANCE.md` §10). Batch 6: tax services, 95 forms, contract_draft (21 October 2026; every `tax.*` row of Part 2 §2.6 Departments B–H that had no contract, 56 linked by identity to the tax procedures, 39 waiting with the reason no procedure fits; batch 3's seven change forms linked to `tax.registration-amendment`; `docs/FORMS_CONFORMANCE.md` §14). Form contract (§3.1, raised to the specification): every field type and data class the 16 form contracts use (incl. attestation, date range, quantity with unit, timestamp, polygon, ISO country/currency codes, composite and repeatable fields, restricted flag, verified contact, approval evidence; classes incl. tax-confidential, commercial, financial); entered-versus-verified source on every value; evidence-policy and declaration-text versions per submission; save and resume; all 16 forms field for field with a conformance test against the specification; reusable field groups and a JSON form library loader for the full catalogue; renderer for self-service, assisted and print; form designer in package drafts; law-dependent deadlines and appeal periods moved out of code into package configuration set by the nation. Existing packages keep working. **I1-catalogue** (forms catalogue): a form registry (form definitions and versions, field definitions, validation rules, evidence requirements, legal-basis references, competent-authority rules, workflow definitions, release approvals and test acceptance records, as the supplement's registry lists them) holding every catalogue form ID of parts 1–22 with its form status; the reusable field groups of part 1 and the shared contract envelope of the supplement; field contracts designed at or above the catalogue's standard, first for the forms whose contract the text gives (contract_draft), then the missing ones in controlled batches validated automatically, never for an excluded form; distinct IDs where the catalogue reuses one for different forms; the form design and governance standard (part 22: proposal, requirements, legal basis, privacy screening, classification and retention, schema review, validation rules, evidence, workflow authority, accessibility and plain language, translation, integration, threat assessment, test and acceptance, release approval, change, migration, retirement, incidents, periodic review); publication refused unless every activation gate has passed, with the human approvals among them never settable by a status field | L |
| I2 | Departments as records with an accountable office, services and staff; the internal administration workspace every institution has (spec §10: HR, finance, procurement, assets, records, internal audit, legal, ICT, communications, planning, M&E; forms catalogue supplement part 21 adds payroll input, review and correction, staff establishment, privileged-access approval and internal policy approval); the catalogue's task-level permission identifiers expressed as package steps and roles.ts rules mapped to institutions and roles, never to offices; capability manifest from records; completeness per item (owner, date, next action) replacing the composite readiness score; attribute scoping of roles by facility, jurisdiction and task; navigation filtered by permission; delegations read in authorisation where the law allows (transparent delegation) | L |
| I3 | Indicator definitions and the twin contract (§3.2): numerator, denominator, period, coverage, method version, approved-aggregate disclosure rule (small-cell suppression), per-domain qualifications (spec Part 3 F); replace generated sector panels with record-computed indicators or "Not connected". **First slice done 21 October 2026** (`docs/INTEGRATION_REGISTER.md` 20.60–20.69): the indicator register (`lib/indicators/`: definitions by version with every field above and no target, drafted by an official of the owning institution and approved per institution by a different official who can sign there, every version kept; 18 reference definitions ship as unapproved drafts); values computed from cases and registers when read (ten versioned methods: case counts, median days, shares, referrals, civil events and organisations by region), each with its kind (Record, Sample, Not connected), method version, period, coverage and lineage, a national figure only when every region reports, sample records never counted in production; the small-cell rule generalised (`lib/data/small-cells.ts`, the indicator rule set through `policy-change.ts`, shipped unset); the twin contract (approved values as observations of one internal source with as-of and known-at; the source and `indicator.` metrics accept only computed runs, `lib/twin/computed.ts`; the value in the specification's contract fields); seven panels moved from generated to computed (the ministry workspace's Command indicators, Service figures, On time and Caseload concentration, `/control`'s service status, the Command Center's briefing, the branch screens' open court cases) with the earlier figures kept folded; National data › Indicators. Still open in I3: definitions for the registers no method reads yet (tax with the tax work, land, facilities, education, professions, legislature), deadline suspension under an approved rule, estimates with methodology and uncertainty, indicator exchange as a service, the statistics authority's release workflow, and the generated panels no record supports yet (20.65) | L |
| I4 | Health as the first complete institution: facility and pharmacy licensing (establishment approval, service and capacity variations, closure notices, corrective action plans) with inspections recorded as findings under an assigned inspector's account; professional registration for health professions (qualification checks, continuing education, good-standing certificates, conduct complaints and investigations, restoration); medicines and devices regulation as administrative records (marketing authorisations, variations, renewals, manufacturing sites and good-practice inspections, import and controlled-medicine authorisations, recalls, clinical trial authorisations without any patient field); public-health programme administration and aggregate notifications only (catalogue parts 6 and 8: no individual case, contact, laboratory or vaccination record); returns as aggregates; health programme, supply and complaint records (administrative); roles scoped by facility, jurisdiction and task; standalone Institutional Edition profile, portable export; its acceptance tests. Before Health is called complete, its requirements and dependency register (`docs/HEALTH_I4_DEPENDENCIES.md`, `docs/requirements/health-i4.json`; owner's direction 2026-10-21, health integration) is finished: every dependency built and proven by a named test. Progress (21 October 2026): the register of medicines and medical devices (`lib/health/products/register.ts`), its six reference procedures (drafts), the manufacturer, importer and wholesaler register types, the proposed product mappings and the `product.status` exchange service are built; the register then stood at 7 built and proven, 13 partial, 7 not built (was 3, 5, 19). Then the six remaining batch-2 procedures (corrective action, import authorisation with the customs check product.import-authorisation, controlled-medicine authorisation under the controlledSubstances slot with limits the nation adopts, safety reports, device incidents, reconsideration; drafts, every decision under a proposed, unapproved mapping) and HX-005 (product.safety-notice, no subscriber approved): 8 built and proven, 16 partial, 3 not built. Then the standalone Institutional Edition, the portable export and the pilot exit gate (`standalone-and-pilot`, built and proven): the edition in the deployment profile (setup, afterwards through `policy-change.ts`; none ships), outside which a procedure opens no case and an exchange service answers "not connected" (`lib/nation/edition.ts`); one institution's own records exported sealed through key custody, proposed by its administrator and confirmed by a different official who can sign there, verified offline (`app/scripts/verify-institution-export.mjs`) and re-imported into an empty installation with identifiers unchanged (`lib/portability/`); the exit gate of roadmap 05 computed from records only (`lib/pilot/exit-gate.ts`), never met in a demonstration. Then public-health programme administration (the register of public-health programmes, lib/health/programmes/, kept for the publicHealth slot: establishment, change, area-level interventions under the nation's intervention authority rules CFG-PH-003 shipped empty, aggregate returns with reported, suspected, confirmed and modelled kept apart, risk communications approved by two officials; small cells suppressed by a threshold the nation adopts; forms batch 4, HLT-PH-011 and 014) and the department functions not yet represented (complaint intake into the licence and fitness cases, workforce counts derived from the professions register, supply items as programme records; logistics, and budget, procurement and grants (I5), recorded as dependencies): both partial. Together: 9 built and proven, 18 partial, 0 not built. Health is not complete | L |
| I5 | Economic group (Part 1) in full: Presidency and Cabinet (collective decisions with vote and quorum steps, decisions and action register, directives citing the laws register with required responses, petitions, correspondence, appointments, official publications, a collective executive where the nation has one); Treasury (budget and commitments, general ledger, debt instruments and transactions, transfers and grants, public investment projects, period close, fiscal reporting, GFS mapping); Tax extensions (policy authority kept apart, compliance and audit, debt, legal, refunds, payment arrangements, return versions and amendments, objection admissibility, manual adjustments recorded, recusal on objections); Customs extensions (other agencies' release prerequisites, valuation, exemptions and relief, post-clearance audit, refunds and drawback, advance rulings, appeals, WCO mapping); Procurement planning to award and contract management after award (OCDS mapping); Trade and investment support; Central bank public registers; from the forms catalogue (parts 2–3): Presidency correspondence and official acts (proposal, legal review, approval, publication, correction, revocation), Cabinet papers and agenda with legal and fiscal review, decision actions, government programmes with milestone baselines and benefits, fiscal policy and transfers with recovery, cash forecasting, debt and guarantees, budget preparation, execution change control and public investment, tax compliance and inspection, withholding agents and third-party reporting, rulings and special treatment, tax debt and payment arrangements; customs transit, guarantees and permits; trade and industry support schemes, standards and market access; investment registration, facilitation and incentives; supplier registration, bank-detail changes with verification, independent procurement review; the central bank as an independent institution with its own records (its supervisory and operational systems stay its own unless separately authorised and legally reviewed) **Tax part (21 October 2026; forms batch 6):** reference procedures as drafts, none approved (`lib/tax/procedures.ts`): registration amendment (versioned; suspension and reactivation under the suspend power), return and assessment amendment (the original kept), objection admissibility, information and withdrawal, nil and late returns, refunds (decided by two officials, instructed, reconciled once against the payout's own reference), payment arrangements and their review (instalments billed with the assessment's reference, reconciled once; default found only by two officials), voluntary disclosure, formal rulings, compliance reviews (scope authorised by two officials, findings and the taxpayer's response before an assessment; never a score); every decision classified under proposed, unapproved mappings; interest and penalties only by an approved rule, refused in production without one; the Tax services tab and onboarding track (`lib/tax/services-view.ts`). Partial: no treasury payout rail, time-based interest, typed return schemas, evidence custody, appeal transmission, settlement, incentives or recovery (integration register 20.70–20.79) | XL |
| I6 | Human services (Part 2) in full: Identity authority (credential issuance, status and revocation, identity resolution, fraud and duplicate cases, certificate delivery records); Immigration passports and travel documents with fees from the approved tariff; Education extensions (school year records as aggregates, teacher workforce, examinations, grants); Labour (employer registration, complaints and inspection, employment services); Social protection claims with reproducible calculation; Agriculture in full (registers, programmes, subsidies reconciled with payments, extension services, livestock and fisheries administration); Water (abstraction and discharge permits, utilities regulation, interruptions, capital projects, inspections); Professional licensing beyond health (non-health professions, accreditation of training providers); fieldwork (assignment by geography and action, offline sync without overwrite, device management, controlled paper intake and reconciliation); from the forms catalogue and its supplement: identity credentials (issuance, collection, loss, renewal, suspension, verification disputes, misuse and recovery cases; no biometric field without legal review), passports and travel documents (issuance controls, production reconciliation, custody), citizenship procedures decided by the competent authority, death notifications, divorce, adoption and name changes; labour and employment (employment and employer registration, vacancies, jobseekers, placements, inspections, complaints, injuries with medical content only as a sealed document reference, wage and collective disputes, mediation, redundancy notices, employment programmes, labour-market returns); social protection and social services (registration, benefits with means assessment and reproducible calculation, change of circumstances, suspension, emergency assistance, disability, older-person, child and caregiver support, payment instructions, overpayments, appeals, provider registration and inspection, programme reporting; social-work and needs records as restricted fields); foreign affairs, consular and diaspora services (consular assistance, documents abroad, notarial and legalisation services, overseas civil events by referral, missing citizens, evacuation registration with locations restricted, diaspora registration, diplomatic notes, agreements and treaty reporting, missions' returns); tourism, culture, youth and sports (operators and accommodation, quality inspections, cultural and heritage registers and grants, youth and sports organisations, facilities, grants, integrity complaints); professional licensing outside health on the professions register; examinations (sessions, centres, results approval and publication, appeals, malpractice) with candidate-level records kept by the examination body and results entering as qualification records; vocational training providers, apprenticeships and skills certificates; scholarships, student finance and education grants; research grants, ethics approvals and research data agreements; health coverage registration and provider payments by aggregate (no claim carrying diagnoses or treatments); agriculture biosecurity, livestock movement, grants, insurance claims and extension services; fisheries licensing, vessels, catch declarations, quotas and aquaculture; water quality, wastewater discharge and drought restrictions | XL |
| I7 | Territory and infrastructure (Part 3) in full: land transfers, encumbrances and disputes on the parcel register; mapping extensions (address register, metadata catalogue, imagery, licensing, surveyors, layer authority); building permits and housing programmes; transport (roads, vehicles and drivers where the nation assigns them, aviation and maritime administration, road reports); energy and mining (licensing, regulator exchange, outages); environment (permits, impact assessments, monitoring, enforcement referrals); public works projects and payments; emergency incident lifecycle with authorised warnings; local and regional government services; from the forms catalogue and its supplement: community and customary land rights, compulsory acquisition, consultation, compensation and resettlement as separate linked workflows; forestry (harvesting permits, timber traceability, reforestation), biodiversity and protected areas with restricted geographic disclosure; mining rights, royalties from approved rules (with I5 revenue), closure and rehabilitation; renewable energy projects, grid connection and tariffs from approved rules; a field inspection service with evidence provenance and custody for regulatory inspections (never police evidence); driving licences, vehicle inspection and roadworthiness, transport operator licensing, road works, closures and road asset records; maritime and aviation administration that never replaces specialist certification; infrastructure projects, construction controls, occupancy and demolition; emergency calls, dispatch and incident command for fire, rescue and civil protection with a tested manual fallback; emergency alerts with approval, corrections and cancellation; an emergency powers register; evacuation orders, shelters, relief distribution, emergency procurement, damage assessment and recovery; fire safety inspections and certificates; local government (councils, resolutions, bylaws, local budgets and returns, transfers, local services and complaints, development plans); housing programmes and allocations, planning applications and objections, building control (plans, technical review, commencement, inspections, stop-work, completion, appeals) | XL |
| I8 | Independent oversight (Part 4) in full: legislature extensions (questions, petitions, committee proceedings, members, budget scrutiny, version comparison, chamber roles); audit engagements and findings; ombudsman and human-rights complaints with protected identity; human-rights monitoring visits and thematic inquiries; anti-corruption and whistleblower reports with protected identity kept out of search and export (an institution-scoped export exists since Health I4, `lib/portability/export.ts`, to test acceptance P4-07 against once the procedure does); data protection (registers, DPIA records, breach notifications, investigations); statistics releases with revisions; regulator supervision; public service recruitment; from the forms catalogue: committee inquiries, evidence and hearings, motions, debate records, roll-call votes, ethics disclosures and oversight recommendations; constitutional appointments on the office register (vacancy, nomination, eligibility, hearing, recommendation kept apart from the decision, commencement, term, removal); independent commission inquiries, annual reports and oversight responses; public consultations, citizen petitions with signature verification that never exposes signatories, public information (freedom of information) requests and appeals decided by the record-holding institution, personal data rights requests, open data releases; justice-sector complaints and inspections; audit entries with separate institution, purpose and correlation fields (a new hashed entry format); security officer and legal-authority administrator roles Progress (21 October 2026, first I8 step): the ombudsman, human rights institution, anti-corruption commission and public audit office join data protection as independent slots (shipped empty); their reference procedures (drafts: `ombudsman.complaint`, `human-rights.complaint`, `integrity.disclosure`, `audit.engagement`, `data-protection.rights-request`, `data-protection.investigation`, `lib/oversight/procedures.ts`) with every decision classified under proposed, unapproved mappings; the records of oversight (`lib/oversight/register.ts`: findings by version, responses beside them, follow-up, evidence and controller requests under an approved relationship, referrals by reference only); protected identities kept apart from the case (`lib/oversight/protected-identity.ts`), never in lists, search or exports, every read logged; the data-protection authority's access-log read scoped to its case's records; console tab Records & audit → Independent oversight, onboarding track `oversight`; forms batch 7 (DEM-CON-012, 013, 014, 018, 019, 020, DEM-PUB-009). Acceptance P4-04, P4-05, P4-06 and P4-07 proven. Not yet in this step (integration register 20.88, 20.89): the legislature extensions, human-rights monitoring visits and thematic inquiries, systemic investigations, report publication, controller and processor registers, breach notifications and DPIA records, statistics releases, regulator supervision, public service recruitment, constitutional appointments, consultations, petitions, information requests, and the audit entry format with institution, purpose and correlation fields. | XL |
| I9 | Federation and portability (Part 5) in full: per-endpoint API contract and endpoint families; event envelope with schema version, institution and legal context, signatures, inbound receiver with duplicate detection and accept/reject/pending records; event outbox carrying no actor names or free text to subscribers; exchange services bound to the relationship register (a revoked relationship stops exchanges); per-institution keys; signed releases and verified update media; declared degraded states; control plane separated from the data plane; deployment profiles with load tests; per-deployment infrastructure controls (RTO/RPO, residency, administrator access, network zones, exit); migration manifest; institution export verified offline (done in Health I4 for one institution's registers, cases, decisions, documents and audit evidence: `lib/portability/`, acceptance P4-13, P5-08, P5-09, P6-16; still open here: configuration such as mappings and rates, certificates, data dictionaries, postgres mode); a federation enabled later (identifiers are kept through export and import, P5-02); restore into a clean environment; from the forms catalogue: cross-institution workflow requests, consultations, handovers, inter-agency agreements, exceptions and dispute referrals that never become binding orders; the integration catalogue (identity, organisations, payments, signatures, notifications, documents, address, geospatial, records, statistics, gateway, events, monitoring, availability, backup) as versioned interfaces | XL |
| I10 | Workspace design system (§3.3) on every institutional screen: tokens for typography and spacing as well as colour, the component-state test, navigation by permission, screen-reader and human usability testing recorded | L |
| I11 | After legal review: prosecution, corrections, court-side extensions (fees and waivers, e-filing, service records, orders and warrants, recorded assignment method, judgment corrections and appeals as separate events, redacted publication, procedural roles), police extensions (complaints against officers, purpose on protected queries, bulk-search prevention, referral reconciliation), elections, defence civilian administration — drafts the nation approves. From the forms catalogue, each only after the judiciary's and the country's legal review and never as a police field: prosecution (referral intake, evidence review, charging and non-prosecution decisions, disclosure, handover); custody, detention, corrections, probation and parole with deadline monitoring and release never delayed by a system; police warrants, seizures, evidence custody, use-of-force and arrest records; legal aid (eligibility, assignment, grants, payments); elections in full (voter register kept apart from identity records and held by the electoral body alone, candidates, polling, ballot custody, results certification, recounts, complaints, observers), political parties as an organisations register type and campaign finance returns; defence civilian administration (policy and strategy, programmes, restricted readiness reports, capability gaps, expenditure, procurement oversight, contract performance, asset accountability, personnel administration, training and exercises, cooperation agreements, administrative incidents, audit referrals, oversight recommendations), never operational command | XL |
| I12 | National security governance and resilience (forms catalogue part 11 and its contracts; added 21 October 2026 so that no catalogue area is left without a step): a country-configured classification scheme with the installation's declared accreditation level and permitted data classes, refusing any class above it (no classified content where not accredited); clearance decisions as metadata kept apart from access to a specific record, with need-to-know, purpose and action checks; intelligence mandate and sensitive-authorisation registers, product and oversight records as metadata or references to accredited systems only, after legal review (never sources, collection methods or raw intelligence); protected disclosures; national cyber incident register, vulnerability coordination with restricted recipients, supplier security, security exceptions, cyber exercises; critical infrastructure designation, dependency records, risk assessments and resilience plans with restricted access and approved public indicators; national security directive register; cross-domain transfer records; AI never attributing an attack or accepting a risk. Intelligence parts lower priority (§4) | XL |
| I13 | Digital government front door and records (forms catalogue part 13 and supplement part 21's records forms; added 21 October 2026): a structured public service catalogue (owner, legal basis, forms, stages, fees, channels, status active, pilot or informational), the citizen and business journey (discover, authenticate or a lawful alternative, apply, route to the competent institution, track, decision, challenge) with accounts through the nation's identity provider, representation granted by the represented person, appointments, correspondence registration, complaints, reconsideration and refunds; records management (classification, retention schedules per record class, legal holds with who and why, archival transfer, disposal authorisation, migrations reconciled); a dashboard registry, service-level objectives and performance reports, disruption reports, service changes and retirement, architecture exceptions | XL |
| Throughout | Installation modes per spec Part 6: separate credentials per mode, mode changes only through an authorised process, background jobs and webhooks keep to the environment boundary; standards mappings with conformance tests in each domain's step | — |

The order follows the specification's own priorities (Part 3 implementation
order, Part 4 order, Part 6 roadmap and pilot choice) adjusted to what already
exists: forms, departments and indicators come first because every sector
needs them, then one institution completed to the launch checklist before
widening.
