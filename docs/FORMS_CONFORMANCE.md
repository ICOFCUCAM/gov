# Forms: conformance, deviations and publication

Plan step I1 (`docs/INSTITUTIONAL_ARCHITECTURE_PLAN.md` §3.1, §5). This page
says how the platform's form contract answers the documents that specify
forms, where it is stricter, what it cannot yet do, and how a form is
published. The conformance test (`app/src/lib/forms/conformance.test.ts`)
reads the documents themselves and fails on a missing field or a weakened
attribute unless this page's deviations name it.

The owner's direction of 21 October 2026
(`docs/forms-catalogue/DIRECTION-2026-10-21-REGISTER-FIRST.md`) governs: a
listed form is not a complete contract, and a complete contract is not a form
safe to deploy. Every form below is a **draft**. None is approved or in
production. Contracts the catalogue does not give are written only in
controlled batches the owner approves, after the verified gap report
(`docs/forms-catalogue/GAP-REPORT.md`): batch 1, health regulation, is §8;
batch 2, medicines and medical devices regulation, is §9.

## 1. One contract, three sources

| Source | What is loaded | Where | Status |
|---|---|---|---|
| Specification, Parts 1–6 (`docs/INSTITUTIONAL_ARCHITECTURE_SPEC.md`) | The 16 JSON form contracts, word for word | `app/src/lib/forms/library/spec/*.json`, overlays in `library/definitions.ts` | Library drafts; 8 attach to reference procedures (drafts) |
| Field series Parts 1–4 (`docs/forms-catalogue/FIELD-SERIES-PARTS-01-02.md`, `-03-04.md`) | The 16 canonical field groups and the 10 complete `civicos.form-contract.v1` contracts of Parts 2 and 3 | `library/canonical/groups/*.json`, `library/canonical/forms/*.json`, loaded by `lib/forms/canonical.ts` | Library drafts |
| Supplement, contract envelope 1.0.0 (`docs/forms-catalogue/SUPPLEMENT-PARTS-14-22-AND-CONTRACTS-05-13.md` §1) | Every property of the envelope, mapped onto the same contract (`FormSpec.envelope`, `ContractField.ui`) | `lib/forms/envelope.ts` | The mapping is tested on the envelope example and on every domain block; the supplement's contracts are **not** loaded as a batch (owner's direction §4) |
| CivicOS's own catalogue contracts (forms the catalogue lists without a contract), controlled batches | Batch 1: 25 health regulation contracts in the canonical format, each naming its one register row | `library/catalogue-contracts/*.json`, loaded by `library/catalogue-contracts.ts` through `lib/forms/canonical.ts` | Library drafts; register status `contract_draft` (§8) |

There is one format. The canonical `civicos.form-contract.v1` and the
envelope map onto the form contract in `lib/forms/contract.ts`; nothing keeps a
second copy.

### Attached to reference procedures (drafts)

| Specification form | Procedure |
|---|---|
| `taxpayer-registration-v1` | `tax.registration` |
| `customs-declaration-v1` | `customs.declaration` |
| `crvs.birth-registration` | `civil.birth` (and late birth) |
| `health.facility-registration` | `health.facility` |
| `education.school-registration` | `edu.school` |
| `immigration.residence-permit` | `immigration.residence-permit` |
| `professional-licensing.initial-application` | `prof.registration` |
| `judiciary.case-filing` | `court.case` |
| `police.incident-report` | `police.incident` |

The others wait in the library for the plan step that builds their service:
investment facilitation and procurement planning (I5), labour complaints,
benefits, farm support and water permits (I6), land interest transfers (I7).

## 2. Deviations from the specification's sixteen forms

Each is either stricter than the specification or a check that needs
something not on the platform yet; none weakens a requirement silently.

| Form | Field | What | Why |
|---|---|---|---|
| taxpayer-registration-v1 | declaration | valid_signature_and_versioned_text | Signed once the applicant is identified (signed in, or identified by an official at an office). No cryptographic signature of the declaration yet (integration register 20.3). |
| taxpayer-registration-v1 | national_identifier | verify_with_authorized_identity_service_if_lawful | Checked with `person.verify` only once the procedure cites the provision that allows it; until then recorded on the case as not performed. |
| taxpayer-registration-v1 | contact_channel | verified_channel | No contact-verification service is connected: recorded as given, marked not verified (20.2). |
| customs-declaration-v1 | declarant_attestation | valid_signature_and_authorized_signer | As above; the signer's authority is checked by an official until authorised representatives are recorded. |
| customs-declaration-v1 | transport_document_reference | transport_document_profile | Pattern-checked; the country's profile recorded as not performed until configured. |
| customs-declaration-v1 | goods_lines | customs_goods_line elements | Code, description, origin, quantity with unit and value per line; mass, valuation method and duty are added by officials (duty only from the approved tariff). |
| investment-facilitation-v1 | applicant_organisation_id | verify_existing_organization_or_approved_exception | Stricter: refused when not in the register until an exception procedure is approved. |
| procurement-plan-item-v1 | budget_appropriation_id | active_appropriation_with_sufficient_authority | No appropriations register yet (I5): recorded as given, check not performed. |
| procurement-plan-item-v1 | conflict_declaration | valid_signature_and_policy_version | As the taxpayer declaration. |
| procurement-plan-item-v1 | approvals | approval_evidence_collection | Approvals are the procedure's two-official steps; officials complete it, never the requester. |
| health.facility-registration | operator_reference | organisation_reference | Stricter: the operator must be in the organisations register. |
| education.school-registration | operator | organisation_reference | Stricter, as above. |
| immigration.residence-permit | applicant_reference | person_reference | Carried as a named party: applicants are usually not in the civil register; the travel document number is its own field. No risk score anywhere. |
| social-protection.benefit-application | programme | configured_benefit_programme | Ships with no programmes; reads "not connected" until the nation approves them. |
| agriculture.support-application | farm_reference | farm_record_reference | No farm register yet (I6). |
| water.abstraction-permit | water_source | water_source_reference | No water-source register yet (I6). |
| professional-licensing.initial-application | applicant_reference | person_reference | A register reference, checked when the registration is decided. |
| judiciary.case-filing | court_jurisdiction | configured_court_reference | Ships with no courts; the judiciary configures them. |
| judiciary.case-filing | filing_documents | signed_document_collection | Documents attached with their hash; signatures on uploaded documents checked by the registry until verification is connected. |
| police.incident-report | persons_and_objects | purpose_limited_reference_collection | **Stricter (platform rule):** people mentioned, never suspects; no finding. Things involved are separate. |
| police.incident-report | evidence_items | evidence custody | Attached as documents with hashes; no custody chain for physical evidence (acceptance P3-04, I11). |
| police.incident-report | response_actions | event_collection | Intake and referral actions only (police is intake and referral). |
| land.register-interest-transfer | current_interest_reference | registered_interest_reference | Rights are on the parcel record; no separate register of interests yet (I7). |

Fees are never typed: a fee comes only from an approved rule
(`lib/law/rules.ts`). Health forms carry no clinical or patient field;
education forms no individual student record.

## 3. Field series: what the loader reports

- All 16 groups load 1:1 (ids, versions, rules, sources, classes,
  accessibility and assisted-channel flags, country decisions) with no
  problem reported. `core.legal_notices` carries the notice types and the
  publication blockers.
- Every rule the series names is in the registry (`lib/forms/rules.ts`, 113
  names with where each runs). An unregistered name fails closed.
- Rules needing a register or decision the country has not configured are
  `binding`: recorded on a case as not performed in a demonstration, and a
  publication blocker in production (gate "values").
- `taxpayer.registration.business`: its representative's condition reads
  `taxpayer.acting_through_representative`, which the contract does not
  define. The loader adds that yes-or-no question and says so.
- Part 4's value sources (applicant, authorised officer, verified source,
  system) map onto entered versus verified provenance on the case
  (`Case.fieldSources`).

## 4. The envelope (contract_version 1.0.0)

Every property is expressible: owning institution, competent-authority rule,
legal basis with verification status, applicability, workflow, decision,
privacy, audit, accessibility (`FormSpec.envelope`), and per field
`field_id`, label, type (about 55 envelope types mapped), required,
classification (held at least as strictly), source (entered or verified),
`validation_rule_ids` (registered; `REF-EXISTS`/`REF-ACTIVE` are the
contract's own register check), evidence requirements, help text and `ui`.
A verification status written in a contract is never taken: the legal basis
reads `requires_approval` until an authorised official records a legal review.

## 5. Scope (binding)

The scope lists by catalogue id are the requirements register's
`docs/requirements/form-scope.json` (128 excluded, 91 requiring legal review,
42 named as allowed), read as they stand by `app/src/lib/forms/scope.ts`;
the scope test holds the two equal. On top of them the platform checks the
fields' own keys, so a form no id names still falls in the same scope.

- **Excluded** (never drafted): among them patient registration, clinical encounters,
  patient-specific referrals and dispensing, personal care plans; named
  student registration, enrolment, attendance and individual results
  (`HLT-PAT-001`, `HLT-ENC-002`, `HLT-REF-003`, `HLT-MED-004`, `HLT-CARE-008`,
  `EDU-STD-001`, `EDU-ENR-003`, `EDU-ATT-004`, `EDU-RES-005`), and any form
  with a field whose key names a patient, clinical data, a diagnosis, a
  prescription, a student or an individual result.
- **Legal review first** (drafted, not published until an authorised official
  records a legal review citing the law): suspect-identifying prosecution
  referrals, prison admission, intelligence products and oversight records,
  voter registration (`JUS-PRO-006`, `JUS-COR-008`, `SEC-INT-006`,
  `SEC-OVS-007`, `ELE-REG-004`), and any form with a field naming a suspect, an
  accused person, a prisoner, intelligence or a voter.

## 6. Publication gates

A form's register status is derived from its gates and never stored or sent:
contract draft, blocked, under review, approved, production, excluded
(`lib/forms/publication.ts`). The API (`GET /api/case-packages?publication=`)
and the designer (`/gov/law/procedures/forms`) show the two kinds apart.

| Gate | Kind | What passes it | Test |
|---|---|---|---|
| Schema and validation tests | automatic | the contract fits, the procedure has tests and they pass | publication.test "cannot publish without validation tests that pass" |
| Legal basis | automatic | every law cited (and every document's citation) resolves to the confirmed version in force | "cannot publish without an approved law version" |
| Competent authority | automatic | Who is responsible names the institution; each decision rests on an approved permit mapping or the deployment profile | "cannot publish without a verified competent authority" |
| Permissions and privacy class | automatic | the institution is named, every field has a personal-data class | "keeps the checks … apart" |
| Evidence, retention, audit | automatic | each piece of evidence cites a law or states its purpose; a retention rule; audit not turned off | "goes draft → … production" (the reference's parent identity document without a purpose blocks) |
| Accessibility and localisation | automatic | labels and options present, labels short, every official language translated through review | "cannot publish without accessibility and localisation" |
| Scope | automatic | not excluded | scope.test |
| The nation's values | automatic | day counts set, no sample day counts in production, every rule able to run | contract.test "ships day counts unset…" |
| Procedure approval | human | a different official who can sign approved the version | packages tests; publication.test |
| Legal review | human | an official who can sign at the institution, not the drafter or an editor, after the legal-basis check passes | "accepts an approval only from a signed-in official…" |
| Authority confirmation | human | as above, records the institution confirmed | "goes draft → …" |
| Data and privacy review | human | as above, with what the review found | "voids an approval when the form changes after it" |
| Scope legal review | human (only where the scope asks) | as above, citing the law from the laws register | scope.test "blocks a form held for legal review…" |
| Release | human | proposed with a rollback plan once every other gate passes, approved by a different person | "goes draft → … production"; "asks for the rollback plan" |

A human approval is an act: a signed-in official (`routeActor()`), who can sign
at the institution responsible (`caseActRefusal()`), a different person from
whoever drafted or changed the form (`dualControlRefusal()`, persons not
accounts), written to the audit chain, and bound to the contract's SHA-256 so
any later change voids it. A status or approval written into a form or a
package is ignored ("ignores any status or approval written…", "refuses a
status sent to the API…"). In production, a form takes submissions only once
its status is production (`submissionRefusal()`, registered as the engine's
intake guard and failing closed when absent); demonstration and training
installations take them with a warning.

The supplement's Part 22 lifecycle (proposed → requirements review → legal
review → data and privacy review → schema review → implementation → testing →
acceptance → production approval → published) is met by these gates: the
procedure draft and its tests (requirements, schema, implementation, testing),
the legal, authority and privacy reviews, and the two-person release. A
published version is immutable: changes make a new procedure version, and a
case keeps the form, declaration and evidence-policy versions it was
submitted under.

## 7. Left for the next slice

- The supplement's 133 domain contracts (Parts 14–22 and baseline contracts
  for Parts 5–13) are mapped and tested, not loaded: the owner's direction
  asks for the verified gap report first.
- Part 3's other catalogue entries and Parts 5–7 forms beyond those above and
  batch 1 (§8) wait for their sector steps and later batches; Parts 5–7 add
  nothing that touches I1's forms except the binding exclusions in §5.
- Offline submission: a self-service draft is kept in the browser and resumed;
  there is no offline sync of field captures (acceptance P2-12, I6).
- Cryptographic signatures of declarations, contact verification, malware
  scanning of citizen uploads and citizen uploads themselves are integration
  points (integration register §20).
- Batch 1's eleven forms with no procedure yet (establishment approval,
  corrective-action plans, variations, closures, facility concerns, category
  and scope amendments, good-standing certificates, conduct complaints,
  interim-restriction reviews, the public-health aggregate return) wait for
  their procedures in plan step I4; the stage each is intended for is named
  in its contract.

## 8. Catalogue contracts, batch 1: health regulation (21 October 2026)

The owner approved one controlled batch: the health regulator's own forms,
from allowed scope only. 25 catalogue forms that were `contract_missing` in
the register now have a CivicOS contract (`contract: given (CivicOS
library)`, `form_status: contract_draft`):

| Catalogue form | Title | Fields (and questions in repeatable groups) | Belongs to | Deviations (besides the four every form shares) |
|---|---|---|---|---|
| HLT-FAC-001 | Apply to establish a health facility | 30 (+4) | library; intended: an establishment approval before `health.facility` (I4) | spec-operator, spec-decision-establishment |
| HLT-FAC-002 | Apply for a health facility licence | 29 (+4) | `health.facility` · submitted | spec-operator, procedure-form |
| HLT-FAC-003 | Record a health facility inspection | 13 (+7) | `health.facility` · inspection · `inspected` (document `inspection-report`) | inspector-from-sign-in, no-score |
| HLT-FAC-004 | Submit a corrective action plan | 17 (+5) | library; intended: corrective-action follow-up of an inspection (I4) | deadlines-assigned |
| HLT-FAC-005 | Renew a health facility licence | 27 (+4) | `health.facility-renewal` · submitted (document `renewal-evidence`) | — |
| HLT-FAC-006 | Vary services or capacity | 28 (+3) | library; intended: a variation of the standing (I4) | stage-b-id |
| HLT-FAC-007 | Facility closure notification | 21 | library; intended: closure or surrender of the standing (I4) | — |
| HLT-FAC-008 | Suspension or revocation review | 9 | `health.facility-suspension` (and `-revocation`) · opened · `notify` (document `grounds`) | no-new-power |
| HLT-FAC-009 | Facility complaint or safety concern | 18 | library; intended: a complaint intake that refers (`lib/casework/referral.ts`) or opens grounds (I4) | free-text-only, independent-oversight |
| HLT-FAC-010 | Facility licence verification | 6 | the public check and the `organisation.standing` exchange service; no case | no-case |
| HLT-LIC-001 | Initial professional registration | 26 (+6) | `prof.registration` · submitted | spec-person, no-health-declaration, procedure-form |
| HLT-LIC-002 | Qualification verification | 12 | `prof.registration` · verification · `verify`; `qualification.verify` | — |
| HLT-LIC-003 | Professional licence issuance | 13 | `prof.registration` · pending-approval · `register` | decision-in-engine |
| HLT-LIC-004 | Licence renewal | 24 | `prof.renewal` · submitted (document `renewal-evidence`) | — |
| HLT-LIC-005 | Scope or category amendment | 23 (+6) | library; intended: an amendment of the standing (I4) | — |
| HLT-LIC-006 | Continuing education record | 11 (+6) | `prof.renewal` · submitted (document `renewal-evidence`) | — |
| HLT-LIC-007 | Good-standing certificate request | 22 | library; intended: a certificate from the register (I4) | — |
| HLT-LIC-008 | Professional conduct complaint | 21 | library; intended: a complaint intake routing to an investigation or referral (I4) | free-text-only, independent-oversight |
| HLT-LIC-009 | Professional conduct investigation | 9 (+2) | `prof.fitness` · opened (document `grounds`) | — |
| HLT-LIC-010 | Interim restriction review | 9 | library; only where the nation's law provides interim restrictions (I4) | no-interim-power |
| HLT-LIC-011 | Disciplinary decision | 12 (+3) | `prof.fitness` · pending-approval · `suspend` | decision-in-engine, no-outcomes-shipped |
| HLT-LIC-012 | Suspension or revocation review | 8 | `prof.fitness` · opened · `notify` (document `grounds`) | — |
| HLT-LIC-013 | Restoration request | 25 | `prof.fitness` · suspended · `reinstate` | restoration-scope |
| HLT-LIC-014 | Professional register verification | 7 | the public check and the `professional.standing` exchange service; no case | no-case |
| HLT-PH-015 | Public-health aggregate data submission | 18 (+4) | library; intended: aggregate returns kept like the capacity returns (`lib/health/register.ts`) (I4) | aggregate-only, statistics-exchange, receiving-authority |

**Format.** Each is a JSON file in the canonical format
(`civicos.form-contract.v1`), loaded by `lib/forms/canonical.ts`, which this
batch extended in place: a form uses a field group by id and version
(`{"use_group": "core.contact", "version": 1, "only": [...]}`, Part 1 §1.1),
and a field may be repeatable (`multiple`), a date range, a timestamp, a
quantity or a group of simple questions (`items`). Two blocks sit beside the
fields: `catalogue` (the source file, catalogue ID and line: the one register
row the contract answers, so the reused ID HLT-FAC-006 matches the field
series' row only) and `library` (title, introduction, owner from the
deployment profile, who completes it, the linked procedure or the intended
stage, proposed lists, the nation's values, deviations and the catalogue
passages answered; the passages every contract answers the same way are in
`library/catalogue-contracts/shared/common-items.json`). No contract carries
a status: its register status comes from `lib/forms/publication.ts`
(`libraryPublication()`: a library form is read as the draft procedure it
would be, so it is a contract draft until a procedure version carrying it is
drafted, tested, approved by a second official and passes every gate).
Approvals are recorded only on that procedure; the form page shows a library
form's gates read-only.

**Linked procedures.** Where a reference procedure exists, the contract names
it, the stage, the step and the document it supplies, and the test checks each
exists. It is linked, not attached: the reference procedures keep the
specification's forms they carry today, and a nation adopts a batch contract
in a new procedure version that a different official approves. Where none
exists the contract waits in the library with the stage it is intended for;
no procedure and no decision power was invented for it.

**Authority.** Facility forms belong to `healthRegulation`, professional forms
to `professionalRegulation` (each profession's register kept by the regulator
the professions register names, under the approved permit mapping), never a
ministry by name. HLT-PH-015 names the `publicHealth` slot; until the nation names it, the
health regulator stands in as a provisional owner (§11; integration register
20.8, 20.14).

**Values the nation's law decides.** Fees come only from the field group
`core.payment` (`derived_from_approved_rule`, set by the platform; no fee
rule ships). Day counts, licence and registration periods, renewal windows,
corrective-action periods, the continuing-education requirement, reporting
deadlines and the small-cell suppression threshold are named in each
contract's `nation_values` with the decision they need and no value; the
checks that need them are `binding` rules, recorded as not performed and a
publication blocker in production. Five binding rules were registered for
them (`lib/forms/rules.ts`): `corrective_action_period_from_rule`,
`renewal_window_from_rule`, `continuing_education_requirement_from_rule`,
`reporting_period_from_programme`, `small_cell_suppression_from_policy`.
Lists that describe (facility types, services, inspection types) ship as
proposed values to be checked against the law; lists that would be a power
(disciplinary outcomes, what the public register shows of them, reporting
programmes, indicators) ship empty.

**Personal data and scope.** Every field has a type and a class. A
complainant's identity and the detail of a complaint or concern are
restricted; conduct investigation, interim restriction and disciplinary
records, and the grounds of an enforcement review, are restricted to the
regulator. A professional's person reference is personal and never on the
public register; the public check shows the profession's `publicFields`
only. There is no patient, clinical, treatment, diagnosis or individual
health field: a concern about care is restricted free text, never structured;
no declaration about an applicant's health is asked; the public-health return
is counts by area (the nation's regions) and period, each count marked
counted, estimated, incomplete or not available, a correction kept as a new
version and small cells protected by the nation's threshold before any
publication or exchange.

**Deviations every batch-1 form shares.**

| Id | What | Why (binding rule) |
|---|---|---|
| no-patient-data | Patient consent, emergency clinical access and a shared patient reference (Part 6 §1, §9.1) do not arise | No patient or clinical field anywhere (CLAUDE.md Health; owner's direction §1) |
| minimisation | The seven minimisation answers per field (Part 1 §1.6) are given with the nation's procedure package and recorded in the data and privacy review | Question 2 is the nation's law; the human gate "privacy" holds publication |
| evidence-requirement | Evidence items name their kind and condition; the `civicos.evidence-requirement.v1` record tying each to a provision is made with the nation's package | Part 1 §1.4; the evidence gate does not pass until then |
| scanning | Scanning, OCR, USSD/SMS and offline field capture (Part 1 §1.5) are not on the platform: an official transcribes a paper form | Integration register 20.6, 20.7 |

Form-specific deviations are listed in each contract with the rule that
requires them (`library.deviations`) and shown on the form page.

**Tests.** `app/src/lib/forms/catalogue-contracts.test.ts` holds its own list
of the catalogue lines each form answers (its row; Part 6 §1, §4, §6, §9–§12
as they apply; Part 1 §1.3, §1.5, §1.6; the supplement's conventions,
activation gates and Stage B HLT-FAC-006 and HLT-INS-007 contracts; the
specification's health facility register, licence workflow and form, and its
professional licensing records, workflow, form and public verification) and
checks every cell, list item and sentence is quoted verbatim and met by a
field, a deviation, a country decision, a linked procedure step, an exchange
service, a form policy or a platform rule whose file exists. For each form it
also checks types, classes and registered rules, the scope, that nothing a
law decides is set (no number outside a rule's own bounds), the same
questions in all three channels, and a register status of contract draft.
`app/src/lib/requirements/requirements.test.ts` checks each library contract
matches exactly one registered form and none is in an excluded or
legal-review scope. The generated gap report shows the batch and the totals
before and after it (contract_missing 1723 → 1698, contract_draft 129 → 154).

## 9. Catalogue contracts, batch 2: medicines and medical devices regulation (21 October 2026)

The owner approved the second controlled batch: the medicines regulator's
forms of Part 6 §5, from allowed scope only. 21 catalogue forms that were
`contract_missing` now have a CivicOS contract (`contract: given (CivicOS
library)`, `form_status: contract_draft`). HLT-MED-016 (adverse drug reaction
report), HLT-MED-021 and HLT-MED-022 (clinical trials) are excluded by
`docs/requirements/form-scope.json` and have none. The format, loader, gates
and test are batch 1's (§8); what is new is the contracts, nine binding rules,
a `batch` number in each contract's `catalogue` block and the scope read by
source (below).

| Catalogue form | Title | Fields (and questions in repeatable groups) | Belongs to | Deviations (besides the six every batch-2 form shares) |
|---|---|---|---|---|
| HLT-MED-001 | Marketing authorisation application | 34 (+14) | library; intended: a marketing authorisation procedure on a product register (I4) | — |
| HLT-MED-002 | Authorisation dossier submission | 23 (+3) | library; intended: a dossier-version step of the authorisation, variation and renewal procedures (I4) | — |
| HLT-MED-003 | Technical assessment record | 13 (+4) | library; intended: their assessment stage (I4) | assessor-from-sign-in |
| HLT-MED-004 | Additional information request | 9 (+3) | library; intended: their request step (I4) | stage-b-id |
| HLT-MED-005 | Applicant response | 20 (+3) | library; intended: their response step, linked to the request (I4) | — |
| HLT-MED-006 | Marketing authorisation decision | 17 | library; intended: the decision step, sealed by the case engine (I4) | decision-in-engine, no-new-power |
| HLT-MED-007 | Product authorisation renewal | 26 | library; intended: a renewal procedure (I4) | aggregate-safety |
| HLT-MED-008 | Product variation application | 29 (+3) | library; intended: a variation procedure (I4) | — |
| HLT-MED-009 | Product suspension or withdrawal review | 13 | library; intended: a suspension and withdrawal procedure under an approved permit mapping (I4) | no-new-power, decision-in-engine |
| HLT-MED-010 | Manufacturing site registration | 31 (+4) | library; intended: a standing in an organisations register the nation adds for manufacturers (I4) | no-manufacturer-register |
| HLT-MED-011 | Good-practice inspection | 16 (+4) | library; intended: an inspection step for registered sites and applications (I4) | inspector-from-sign-in, no-score |
| HLT-MED-012 | Inspection corrective action plan | 17 (+7) | library; intended: corrective-action follow-up of HLT-MED-011 (I4) | deadlines-assigned |
| HLT-MED-013 | Medicine import authorisation | 30 (+6) | library; intended: an import authorisation procedure, customs told the decision by an exchange service (I4) | customs-apart |
| HLT-MED-014 | Controlled medicine authorisation | 29 (+4) | library; intended: the procedure of the authority the controlled-substances law names (I4) | no-named-person, controlled-authority |
| HLT-MED-015 | Medicine safety report | 25 | library; intended: a safety-report intake assigning each report for assessment (I4) | product-level-only, no-ai-finding |
| HLT-MED-017 | Product recall notification | 33 (+8) | library; intended: a recall procedure (signal, risk, decision, notices, completion) (I4) | no-ai-finding, no-new-power, no-recall-exchange |
| HLT-MED-018 | Recall completion report | 24 (+7) | library; intended: the completion step of the recall (I4) | — |
| HLT-MED-019 | Medical device registration | 33 (+7) | library; intended: a device registration procedure on the product register (I4) | — |
| HLT-MED-020 | Medical device safety incident | 26 | library; intended: a device incident intake opening an investigation (I4) | product-level-only, no-ai-finding |
| HLT-MED-023 | Regulatory appeal or reconsideration | 29 | library; intended: a reconsideration or appeal procedure of the body the law names (an appeal to a court is filed with the court) (I4) | no-new-power, court-appeal, reviewer-differs |
| HLT-MED-024 | Regulatory product-status verification | 6 | library; intended: a public product check and a product-status exchange service; no case (I4) | no-case, no-product-service |

**Sources answered.** Each contract quotes and meets, piece by piece: its row
of Part 6 §5.1; Part 6 §1 (the medicines regulator's boundary), §5's
introduction and the closing rule of §5.2 (status only from the regulator's
record), the regulatory-authority validation, CFG-MED-001 … 003, the
regulatory-integrity gate and deliverable 4; the lines of §5.2 (the regulated
product record), §5.3 (safety and recall), HX-005 and the exchange rule and
gate that concern it; and the passages every form of both batches shares
(§8). The specification has no medicines archetype: its health supply-item
register (product identifier, lot or batch, quantity, expiry) and its
sector-regulator archetype (controls, the enforcement workflow, appeals and
review outcomes) are applied where they fit. The supplement's Stage B
HLT-MED-004 (a medicine authorisation or dispensing record on a named patient)
is a different form, excluded; HLT-MED-004 here is the field series'
additional information request.

**Two forms, one ID.** The register already kept them apart (`HLT-MED-004`
is Part 6, allowed; `HLT-MED-004@P6` is Stage B, excluded). The binding scope
list is keyed by ID, so `lib/forms/scope.ts` now reads a form's entry against
the catalogue document it names (`FormSpec.catalogueSource`, set by the loader
for every catalogue contract; `formScope()`, used by the drafting refusal in
`lib/casework/packages.ts` and by the publication gates). A bare
`HLT-MED-004` stays excluded, as `scope.test.ts` holds, and a form naming the
supplement as its source is excluded under it.

**Product and organisation records only.** Applicants, holders,
manufacturers, importers and recall notifiers are organisations in the
register of organisations (a register reference, never a second identity).
The only persons are whoever acts for the organisation
(`core.representation`), the professional responsible for batch release or
for controlled medicines (a reference to the professional register,
personal) and, in the safety and incident reports, an optional reporter
(restricted). Commercially confidential content (dossier, composition,
assessment and inspection findings, site master file, technical
documentation, grounds, reconciliations) is restricted and read only at the
regulator. Only product and device names are public in an application; the
public product check (HLT-MED-024) answers only what the product's public
information classification allows (HLT-MED-006 `decision.public_disclosure`,
shipped empty).

**Safety and incident reports (HLT-MED-015, 020).** About the product, never
a person: name, strength and form, batch, expiry and manufacturer as on the
pack, the kind of problem (quality defect, suspected falsified, labelling,
storage or supply; for devices malfunction, deterioration, labelling, a
problem in use, suspected falsified) and the concern in restricted free text,
with the hint "Do not give anyone's name, identity or medical details". There
is no reaction, outcome, harm, age, sex or history field; an individual's
reaction to a medicine is HLT-MED-016, which the scope excludes (deviation
`product-level-only`). A report is a signal for assessment, never a finding;
possible duplicates are linked by an official, never merged
(`no-ai-finding`).

**Controlled medicines (HLT-MED-014).** An organisation, a schedule, products
and quantities, a period, the licensed premises and the responsible
professional; never a patient (`no-named-person`). The quantities are checked
by the binding rule `controlled_quantity_limit_from_rule` against the limits
the nation sets under its controlled-substances law (unset).

**Nothing a law decides is typed.** Fees only through `core.payment`
(`derived_from_approved_rule`; no fee rule ships). Assessment times, response
periods, validity periods, renewal windows, corrective-action periods, recall
timelines and completion deadlines, reporting deadlines, appeal periods and
the controlled quantity limits are named in each contract's `nation_values`
with no value. Nine binding rules were registered for them
(`lib/forms/rules.ts`): `classification_value_from_configured_standard`,
`information_response_period_from_rule`, `authorisation_validity_from_rule`,
`product_renewal_window_from_rule`,
`inspection_corrective_action_period_from_rule`, `recall_timeline_from_rule`,
`safety_report_deadline_from_rule`, `controlled_quantity_limit_from_rule`,
`review_request_period_from_rule`.

**Classifications are the nation's.** Each is a configured values source with
no values; its country decision names the standard expected: dosage forms and
routes (EDQM Standard Terms), therapeutic classification (WHO ATC), device
risk classes (IMDRF), device nomenclature (GMDN), controlled-substance
schedules (the Single Convention and the Convention on Psychotropic
Substances as national law adopts them), good-practice standards (WHO texts
or PIC/S), dossier format (the ICH Common Technical Document); product
categories and legal supply categories from the nation's law. Lists that
would be a power or a route ship empty as well: application kinds,
authorisation outcomes, variation categories, enforcement measures,
deficiency grades, recall classes, points of entry, review routes and what
the public check shows. Descriptive lists (manufacturing activities,
inspection types, finding results, report stages, variation kinds, review
triggers, concern and incident kinds, reporter kinds, recall levels,
recipient kinds, disposal methods, device kinds) ship as proposed values.

**Authority.** Every batch-2 form names the `medicinesRegulation` slot
(HLT-MED-014 `controlledSubstances`), shipped empty; until the nation names
it, the health regulator stands in as a provisional owner (§11) and the form
carries the deviation `medicines-authority-slot`; each power comes from the
permit authority mapping for the product type, of which none ships.
Integration register 20.9, 20.14.

**Deviations every batch-2 form shares.** The four of §8 (`no-patient-data`,
here citing product, organisation and decision records as the allowed scope;
`minimisation`; `evidence-requirement`; `scanning`) and:

| Id | What | Why (binding rule) |
|---|---|---|
| medicines-authority-slot | The medicines-regulator slot ships empty; until the nation names it the health regulator stands in as a provisional owner (§11) | Who is responsible comes only from the deployment profile and the permit authority registry (CLAUDE.md Government operating model) |
| no-product-register | The regulated product record (Part 6 §5.2) is not on the platform: product references are recorded as given, their check as not performed, and a status is never inferred from an import, inventory or procurement record | Status comes only from the competent regulator's record; integration register 20.5, 20.9 |

**Procedures.** No reference procedure of the medicines regulator exists, so
every batch-2 contract waits in the library with the stage it is intended for
(plan step I4: "medicines and devices regulation as administrative records");
none was invented, and no decision power ships.

**Tests.** `app/src/lib/forms/catalogue-contracts.test.ts` now holds both
batches: for batch 2 its own list of the lines each form answers, the same
checks per form as batch 1, and six more: no contract for HLT-MED-016, 021 and
022, and the two HLT-MED-004s apart; the safety and incident reports
product-level only (no person or party question; no reaction, outcome, harm,
age, sex or history word in any key; the concern restricted, with its hint);
controlled medicines for an organisation, a product and a quantity; no
classification, power or period shipped, each classification naming its
standard; the authority slot; dossier content restricted and the public check
limited to public fields. The generated gap report shows each batch and the
totals before the library, after each batch and now (contract_missing
1723 → 1698 → 1677, contract_draft 129 → 154 → 175).

## 11. Health integration: identity, procedure links, provisional owners, the public product view (21 October 2026)

The owner's direction of 21 October 2026
(`docs/forms-catalogue/DIRECTION-2026-10-21-HEALTH-INTEGRATION.md`) closes the
gaps batch 2 left open. Health is not called the first complete institution
before its I4 requirements and dependency register is finished
(`docs/HEALTH_I4_DEPENDENCIES.md`).

**Composite identity.** A form is identified by catalogue, form ID and
version: `formIdentity()` in `lib/forms/identity.ts` writes
`CATALOGUE:FORM-ID@VERSION` (the catalogue is the source document's file name
without `.md`; a catalogue entry with no contract in the library has no
version). A catalogue contract's library key is its identity. The form
library and its pages, the API (`?library=` lists each form's `identity` and
the reused IDs; `?form=` and `?publication=` take an identity), publication
approvals (each act stores the identity and the contract's SHA-256 and counts
only for both), drafting a procedure that names a catalogue ID, and the
register and gap report (`form_identity` on the row) all use it. A bare ID
that two catalogues use is refused (`409` in the API) with both candidates and
never resolved to one; a bare ID never makes a form eligible for scope: read
without its catalogue, it is held to the strictest entry. Approvals recorded
before identities were kept take the identity of the version they were given
on.

**The fourteen reused IDs.** `lib/forms/catalogue-identity.test.ts` proves,
for each ID the gap report lists (EDU-ACC-008, EDU-RES-005, ENV-PER-004,
HLT-FAC-006, HLT-MED-004, JUS-COR-008, JUS-PRO-006, LND-REG-003, SEC-INT-006,
TRN-AVI-007, TRN-INF-008, TRN-MAR-006, TRN-OPS-005, TRN-ROAD-003), that both
entries coexist in the catalogue and the register, each is evaluated for
scope on its own entry, a bare ID is refused in the library, on the page and
in the API, each identity resolves to its own entry only, and a procedure
draft must name its catalogue (an excluded entry is never drafted). For
HLT-MED-004 it proves more: the supplement's dispensing record
(`SUPPLEMENT-PARTS-14-22-AND-CONTRACTS-05-13:HLT-MED-004`) is excluded, has no
contract, cannot be drafted and has nothing to publish; the field series'
information request (`FIELD-SERIES-PARTS-05-07:HLT-MED-004@1`) is allowed, a
contract draft with its procedure missing; it carries no patient-specific or
dispensing field (the scope's words and an explicit list, in keys and
labels); and neither can stand in for the other through an edit of the
draft or an approval record.

**Procedure-link states.** Each library contract's link to the procedure that
carries it is `missing`, `draft`, `under_review` or `approved`, computed from
the package register on every read (`lib/forms/procedure-link.ts`), never a
status field and never set through the API. A version carries a contract when
its form names the contract's identity. A required procedure that is missing
fails the automatic gate `procedure-link`; a form answered by an exchange
service and the public check (deviation `no-case`) needs that service instead
(HLT-FAC-010 and HLT-LIC-014 have theirs; HLT-MED-024 has none yet). The state
shows on the publication panel and the library details
(`procedure-link.test.ts`).

**Provisional owners.** The deployment profile has three more optional slots,
shipped empty: `medicinesRegulation`, `controlledSubstances` and
`publicHealth`. Batch 2 names `medicinesRegulation` (HLT-MED-014
`controlledSubstances`); HLT-PH-015 names `publicHealth`; batch 1's facility
and professional forms keep `healthRegulation` and `professionalRegulation`.
While a named slot is empty, `provisionalOwner()` stands the health regulator
in (the medicines regulator first for controlled substances): the panel, the
library details and the API say "provisional: the nation has not named the
medicines authority"; the competent-authority gate passes only in demo and
training and fails in production; nobody can record an authority
confirmation on a provisional owner. It is never proof of legal competence
(`lib/nation/health-slots.test.ts`). This replaces the stand-in described in
§8 and §9.

**The public product view.** There is no product register yet. The rule the
public product check, lists, exports, the twin and the product-status
exchange service must meet is built: `publicProductView()` in
`lib/health/products/public.ts` returns only attributes recorded by an
approved decision, listed in the nation's approved public information
classification and of the public class; never confidential regulatory
submissions, personal data or unpublished enforcement records, whatever a
classification lists; enforcement only as approved and published notices.
HLT-MED-024 names it (`answer.public_view`); `public.test.ts` scans every
output under every classification.

| Item | Test |
|---|---|
| Composite identity, ambiguous IDs refused | `catalogue-identity.test.ts` "writes and reads one format…", "a bare ID is refused with both candidates…" |
| The 14 reused IDs, table-driven | `catalogue-identity.test.ts` (`describe.each` over the gap report's list) |
| HLT-MED-004 exclusion boundary | `catalogue-identity.test.ts` "keeps the excluded entry blocked…", "carries no patient-specific or dispensing field…", "cannot be substituted through an approval record…" |
| Procedure-link states and gate | `procedure-link.test.ts` |
| Provisional owners | `lib/nation/health-slots.test.ts` |
| Public product view | `lib/health/products/public.test.ts` |
| I4 dependency register | `lib/requirements/health-i4.test.ts` |
