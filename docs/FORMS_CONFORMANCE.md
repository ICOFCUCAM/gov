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
| HLT-MED-017 | Product recall notification | 33 (+8) | library; intended: a recall procedure (signal, risk, decision, notices, completion) (I4) | no-ai-finding, no-new-power (no-recall-exchange until HX-005 was built, below) |
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

**Procedures.** When batch 2 was written no reference procedure of the
medicines regulator existed, so every contract waited in the library with the
stage it is intended for (plan step I4: "medicines and devices regulation as
administrative records"); none was invented, and no decision power ships.

**Adopted into the product procedures (Health I4, 21 October 2026).** The
register of medicines and medical devices (`lib/health/products/register.ts`)
and its reference procedures (`lib/health/products/procedures.ts`, drafts the
nation adapts and a second official approves) now carry 14 of the contracts,
each linked by its identity to its stage, step and document, as the batch-1
contracts are linked to the facility and professions procedures; the link
reads `draft` once the procedures are installed and is never approved by the
platform:

| Contract | Procedure | Stage · step · document |
|---|---|---|
| HLT-MED-001 | `medicines.authorisation` | submitted · register · application-form |
| HLT-MED-002 | `medicines.authorisation` (also variation, renewal, device registration) | dossier · record-dossier · dossier |
| HLT-MED-003 | `medicines.authorisation` (also …) | assessment · assess · assessment-report |
| HLT-MED-004 | `medicines.authorisation` (also …) | assessment · request-information · information-request |
| HLT-MED-005 | `medicines.authorisation` (also …) | information-requested · record-response · applicant-response |
| HLT-MED-006 | `medicines.authorisation` | pending-approval · authorise |
| HLT-MED-007 | `medicines.renewal` | submitted · register · application-form |
| HLT-MED-008 | `medicines.variation` | submitted · register · application-form |
| HLT-MED-009 | `medicines.suspension` | opened · notify · grounds |
| HLT-MED-010 | `medicines.manufacturer` (organisations register type `medicine-manufacturers`) | submitted · check |
| HLT-MED-011 | `medicines.manufacturer` | inspection · inspected · inspection-report |
| HLT-MED-017 | `medicines.recall` | notified · assess-risk · recall-notification |
| HLT-MED-018 | `medicines.recall` | supply-chain-notified · report-completion · completion-report |
| HLT-MED-019 | `medicines.device-registration` | submitted · register-application · application-form |
| HLT-MED-012 | `medicines.corrective-action` | submitted · register · corrective-action-plan |
| HLT-MED-013 | `medicines.import-authorisation` | submitted · register · application-form |
| HLT-MED-014 | `medicines.controlled` (the `controlledSubstances` slot) | submitted · register · application-form |
| HLT-MED-015 | `medicines.safety-report` | received · register · report |
| HLT-MED-020 | `medicines.device-incident` | received · register · report |
| HLT-MED-023 | `medicines.reconsideration` | received · register · request-form |

HLT-MED-024 is answered by the public product check and the `product.status`
exchange service (`library.exchange`; deviation `no-product-service` removed,
its catalogue passages met by the service). The last six rows were added in
the second I4 step (below); when the product procedures were first built they
had no fitting procedure and stayed `missing`. The deviation `no-product-register` now says the
register exists and the forms' product references read it (decided records
only); `no-manufacturer-register` says the reference register types exist with
unapproved permit types. The procedures type no period, fee or outcome list;
every decision step is classified under a proposed, unapproved permit mapping
and refused in production until the nation approves one. Integration register
20.17–20.23; tests `lib/health/products/procedures.test.ts`,
`register-types.test.ts`, `exchange.test.ts`,
`app/api/health-regulation/products/products-privacy.test.ts` and
`lib/forms/procedure-link.test.ts` ("is draft for each batch-2 form the
product procedures carry …").

**The second I4 step: the six forms without a procedure, and HX-005 (21
October 2026).** Each of HLT-MED-012, 013, 014, 015, 020 and 023 now names its
own reference procedure (a draft, `procedure_package_id` and its stage, step
and document, the link computed `draft` once installed and never approved by
the platform; `intended` removed):

- HLT-MED-012, `medicines.corrective-action`: the plan is registered against a
  recorded inspection case of the medicines authority with its inspection
  report; the regulator accepts it (a decision), which starts the period the
  nation's rules set (a deadline shipped without its day count), tracks
  progress and closes it by two officials. Deviation `deadlines-assigned` now
  names that step.
- HLT-MED-013, `medicines.import-authorisation`: an importer holding the
  `medicine-importers` standing, an authorised product, a quantity and a point
  of entry from `medicines.country.entry_points` (shipped empty), decided by
  two officials into the import authorisation register
  (`lib/health/products/imports.ts`). Customs learns only whether it is valid
  through `product.import-authorisation` (no caller approved; no customs
  power); deviation `customs-apart` says so.
- HLT-MED-014, `medicines.controlled` (the `controlledSubstances` slot): an
  organisation, an authorised product, a schedule and activity from the
  nation's lists and a quantity within the limits the nation adopts (a country
  rule set, two officials citing the law, shipped unset; production refuses
  without one). Never a named patient.
- HLT-MED-015 and 020, `medicines.safety-report` and
  `medicines.device-incident`: the same product-level fields (the concern
  restricted with its hint, the reporter optional and restricted), assessed
  by the assigned officer with reasons (never a score, no AI step), duplicates
  linked by an official and never merged; the assessment may open the
  product's own variation, suspension or recall case, or lead to a safety
  alert two officials decide and publish.
- HLT-MED-023, `medicines.reconsideration`: decided by officials other than
  those who made or confirmed the decision (by person, as dual control
  compares); an appeal to a court by reference only; the request period from
  the nation's version of the original procedure (none ships). Deviation
  `reviewer-differs` names the procedure.

Every decision step is classified (`lib/permits/decisions.ts`) under a
proposed, unapproved mapping (`good-practice-corrective-action`,
`medicine-import-authorisation`, `controlled-medicine-authorisation`,
`product-safety-assessment`, `medicines-decision-reconsideration`) and refused
in production until the nation approves one. No period, fee or outcome is
typed.

HX-005 is the exchange service `product.safety-notice`
(`lib/health/products/notices.ts`): a published recall or safety alert goes to
the integrations two officials approved for it and a purpose (none ships),
carrying the product's `publicProductView()`, the recall class, the case
reference and its dates only; each delivery is recorded with its purpose and
receipt. HLT-MED-017's deviation `no-recall-exchange` is removed and its HX-005
passages are met by the service; the holder's supply-chain notice stays a
document of the recall case. Batch 2 now has no form without a procedure but
HLT-MED-024, which `product.status` answers. Integration register
20.24–20.30; tests `lib/health/products/oversight.test.ts`,
`lib/health/products/notices.test.ts`, `lib/forms/procedure-link.test.ts`.

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

## 10. Catalogue contracts, batch 3: taxpayer registration and account (21 October 2026)

The owner approved the third controlled batch: the 29 register rows whose ID
starts with `taxpayer.` and that were `contract_missing`, from the field
series Part 2 §2.6 Department A (`FIELD-SERIES-PARTS-01-02.md`): 21 of the 22
forms of its service table (the business registration has the catalogue's own
contract, `library/canonical/forms/taxpayer.registration.business.json`) and
its 8 internal forms. All 29 now read `contract: given (CivicOS library)`,
`form_status: contract_draft`. The format, loader, gates and test are batches
1 and 2's (§8, §9); what is new is below.

| Catalogue form | Title | Fields (and questions in repeatable groups) | Belongs to | Deviations (besides the six every batch-3 form shares) |
|---|---|---|---|---|
| taxpayer.registration.individual | Register as an individual taxpayer | 23 | `tax.registration` · submitted (document `identity-evidence`) | spec-form, business-fields, representation-own-fields, declaration-group, tin-assigned, procedure-form, spec-tax-lists |
| taxpayer.registration.public_entity | Register a public entity for tax administration | 15 | `tax.registration` · submitted | spec-form, business-fields, public-entity-register, declaration-group, tin-assigned, procedure-form, spec-tax-lists |
| taxpayer.registration.nonresident | Register a non-resident taxpayer | 26 | `tax.registration` · submitted (document `identity-evidence`) | spec-form, business-fields, representation-own-fields, declaration-group, tin-assigned, procedure-form, spec-tax-lists |
| taxpayer.registration.branch | Register a branch or permanent establishment | 23 | `tax.registration` · submitted | spec-form, representation-own-fields, declaration-group, tin-assigned, procedure-form, spec-tax-lists |
| taxpayer.registration.amend | Amend a taxpayer registration | 16 (+3) | `tax.registration-amendment` · submitted (document `change-request`; since batch 6, §14) | amendment-procedure, representation-own-fields, declaration-group |
| taxpayer.details.change | Change taxpayer contact or address details | 16 | `tax.registration-amendment` · submitted (document `change-request`; since batch 6, §14) | amendment-procedure, representation-own-fields, declaration-group |
| taxpayer.obligation.add | Register for an additional tax obligation | 16 | `tax.registration-amendment` · submitted (document `change-request`; since batch 6, §14) | amendment-procedure, representation-own-fields, declaration-group, spec-tax-lists |
| taxpayer.obligation.cancel | Request cancellation of a tax obligation | 17 | `tax.registration-amendment` · submitted (document `change-request`; since batch 6, §14) | amendment-procedure, representation-own-fields, declaration-group |
| taxpayer.registration.transfer | Request transfer to another responsible tax office | 17 | `tax.registration-amendment` · submitted (document `change-request`; since batch 6, §14) | amendment-procedure, representation-own-fields, declaration-group |
| taxpayer.certificate.request | Request a taxpayer registration certificate | 15 | library; intended: a certificate from the tax register; `taxpayer.status` (I5) | status-only, representation-own-fields, fee-group |
| taxpayer.account.statement | Request a tax account statement | 10 | library; intended: a statement drawn from `account()` (I5) | statement-from-ledger, representation-own-fields |
| taxpayer.registration.duplicate | Request a replacement registration certificate | 16 | library; intended: a replacement certificate; `taxpayer.status` (I5) | status-only, representation-own-fields, fee-group |
| taxpayer.registration.suspend_request | Request suspension where national law permits it | 16 | `tax.registration-amendment` · submitted (document `change-request`; since batch 6, §14) | amendment-procedure, representation-own-fields, declaration-group |
| taxpayer.registration.reactivate_request | Request reactivation of a suspended registration | 16 | `tax.registration-amendment` · submitted (document `change-request`; since batch 6, §14) | amendment-procedure, representation-own-fields, declaration-group |
| taxpayer.registration.objection | Object to a registration decision | 18 | library; intended: an objection procedure for registration decisions (`tax.objection` is for assessments) (I5) | registration-dispute-not-built, no-amount, representation-own-fields, declaration-group |
| taxpayer.registration.appeal | Appeal an eligible registration decision | 20 | library; intended: an appeal to the body the law names (I5) | registration-dispute-not-built, court-appeal, no-amount, representation-own-fields, declaration-group |
| taxpayer.registration.withdraw | Withdraw a pending registration application | 9 | library; intended: a withdrawal step of `tax.registration` (I5) | withdrawal-not-built, representation-own-fields |
| taxpayer.registration.decision | Record the registration decision | 12 | `tax.registration` · pending-approval · `register` | decision-in-engine, tin-assigned |
| taxpayer.registration.decision_record | Registration decision record | 10 | `tax.registration` · pending-approval · `register` | decision-in-engine |
| taxpayer.registration.inspection | Record a registration verification or inspection | 10 (+3) | `tax.registration` · verification · `verify` | no-score, observations-only, inspector-from-sign-in |
| taxpayer.registration.inspection_checklist | Registration inspection checklist | 11 (+3) | `tax.registration` · verification · `verify` | no-score, observations-only, inspector-from-sign-in |
| taxpayer.registration.further_information | Request further registration information | 9 (+4) | library; intended: a request step of `tax.registration` (I5) | two-rows, no-request-procedure |
| taxpayer.registration.further_information@P2 | Record a request for missing or inconsistent information | 9 (+3) | library; intended: its internal record (I5) | two-rows, no-request-procedure |
| taxpayer.registration.referral | Refer a registration matter to an authorized unit | 11 | library; intended: a referral case (`lib/casework/referral.ts`) (I5) | referral-case |
| taxpayer.registration.referral_record | Refer a registration case to a specialist unit | 11 | library; intended: a referral to a configured specialist unit (I5) | referral-case |
| taxpayer.registration.assessment | Assess a registration application | 10 | `tax.registration` · verification · `propose` | no-score, decision-in-engine |
| taxpayer.registration.verification_record | Record a register lookup | 9 | `tax.registration` · verification · `verify` | — |
| taxpayer.registration.appeal_assessment | Assess an objection or appeal | 14 | library; intended: the admissibility stage of a registration dispute (I5) | registration-dispute-not-built, no-amount |
| taxpayer.registration.closure_record | Close a registration case | 7 | library; intended: a closure step for withdrawn or disposed cases (I5) | closure-in-engine |

**Sources answered.** Each contract quotes and meets, piece by piece: its row
(service table or internal-form list); §2.6's opening rules (a configured
catalogue per tax type; nothing tax-related hard-coded); the business
contract's country decisions and the decision-record rule; the officer-only
fields and the §2.7 internal fields and universal control where they apply;
Department D's compliance rule and inspection safeguard for the inspection
forms; Department E's dispute fields, country decisions and appeal-deadline
rule for the objection, appeal and appeal assessment;
`country.tax.registration`, `country.tax.disputes`,
`country.tax.compliance_powers` and the retention record of §2.8 with its
versioning rule; the §2.9 gates (institutional authority, procedure lifecycle,
legal decision trail, separation of duties, access restrictions,
accessibility, no fabricated data; financial integrity for the statement, tax
configuration for an added obligation); the specification's tax authority
mandate, departments, service catalogue, decision controls and registration
form; and Part 1's shared rules and the supplement's envelope and gates (as in
§8). `shared/common-items.json` now marks the Part 6 items `"for": "health"`
and the tax ones `"for": "tax"`.

**Tax secrecy.** Every field a batch-3 form defines is `restricted` with
`confidentiality: "tax"` (the canonical loader now reads a field's
`confidentiality` in place), stricter than the business contract's
administrative and personal classes and never weaker than the specification's
form. Every form carries the policies `access.read_rule` (`canReadTax()`,
every read in the access log) and `access.others` (status only through
`taxpayer.status`). The only field groups used are `core.declaration_signature`
(the versioned declaration and signature, standing for the business contract's
`taxpayer.declaration`) and, for the two certificate forms, `core.payment`;
representation is asked as the business contract's own fields, not through
`core.representation`, whose classes a form cannot raise. Certificates state
only what `taxpayer.status` returns (`status-only`); the statement is drawn
from the account's recorded entries (`statement-from-ledger`).

**Identity from the registers.** A business is a reference to the
organisations register, a public entity to the institution register, an
individual to the civil register (optional where the law allows registration
without it); the taxpayer identification number is set by the register when
the registration is decided (`tin-assigned`, officer-only). Later forms point
to the taxpayer's account in the tax register.

**Nothing a law decides is typed.** Nine binding rules (`lib/forms/rules.ts`):
`registration_obligation_from_rule` (thresholds and obligation triggers),
`obligation_effective_date_from_rule`,
`obligation_cancellation_allowed_by_rule`, `suspension_allowed_by_rule`,
`withdrawal_allowed_by_rule`, `tax_office_assignment_from_rule`,
`tax_information_response_period_from_rule`, `dispute_period_from_rule`,
`certificate_validity_from_rule`, beside the existing
`obligations_available_for_taxpayer_type` and
`date_allowed_by_registration_rule`. Each value is named in `nation_values`
(`tax.registration.threshold`, `tax.registration.deadline`,
`tax.certificate.fee` …), none set. Taxpayer categories, obligations (IMF
GFSM 2014 classification expected for statistics), activity codes (ISIC
Rev. 4), establishment kinds (Article 5 of the OECD or UN Model Tax
Convention as adopted), registration bases, grounds, offices, remedies,
routes, specialist units and lookup purposes ship empty (`spec-tax-lists`).

**Two rows, one ID.** The catalogue names
`taxpayer.registration.further_information` twice in one document (line 2543,
the formal request the applicant receives; line 2714, the officer's internal
record). The first contract keeps the catalogue ID as its form ID; the second
takes its register row ID, `taxpayer.registration.further_information@P2`.
Both name their line, and `app/scripts/requirements/catalogue.py` and
`requirements.test.ts` match a contract by line where the catalogue repeats an
ID in one file (`two-rows`).

**Procedures.** Ten forms link to `tax.registration` and its stages and steps
(submitted; verification · `verify` / `propose`; pending-approval ·
`register`); since batch 6 (§14) the seven change forms link to
`tax.registration-amendment` (deviation `amendment-procedure` in place of
`amendment-not-built`). No amendment, deregistration, certificate, registration-dispute,
withdrawal, request, referral or closure procedure exists, so the other
nineteen wait in the library with the stage they are intended for; none was
invented, and `tax.objection` (assessments) is not stretched to registration
decisions. Inspection and assessment forms record an officer's findings with
reasons, never a score (`no-score`, `observations-only`).

**Deviations every batch-3 form shares.**

| Id | What | Why (binding rule) |
|---|---|---|
| tax-secrecy-class | Every field restricted, under tax secrecy, read only under `canReadTax()` | CLAUDE.md Tax |
| no-tax-values | No rate, threshold, trigger, deadline or fee typed; lists ship empty | CLAUDE.md: rates only from `lib/law/rules.ts` |
| config-impact | No impact assessment of a configuration change on forms and open packages (§2.8) | Integration register 20.11 |
| minimisation, evidence-requirement, scanning | As in §8 | As in §8 |

**Tests.** `catalogue-contracts.test.ts` holds batch 3's own line lists (the
Part 6 common lines now apply to batches 1 and 2 only), the same checks per
form, and eight more: the two further-information rows apart; every field
under tax secrecy with the read rule; no tax value or list shipped, each list
naming its decision and standard; identity only through the registers and the
TIN from the register; consistency with the business contract and the
specification's form; the procedure links; certificates and statements
limited to the exchange and the ledger; findings without scores and dispute
grounds of 20–10,000 characters. The gap report shows batch 3 beside 1 and 2
(contract_missing 1723 → 1698 → 1677 → 1648, contract_draft
129 → 154 → 175 → 204).

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
(HLT-FAC-010 and HLT-LIC-014 have theirs; HLT-MED-024 has `product.status` since the product register, §9). The state
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

**The public product view.** When this was written there was no product register (it exists since, §9). The rule the
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

## 12. Catalogue contracts, batch 4: public-health programme forms (21 October 2026)

The owner approved two more contracts as part of finishing the Health I4
dependency `public-health-programmes`: the programme forms of Part 6 §4.1
that hold no individual. HLT-PH-011 and HLT-PH-014, which were
`contract_missing`, now have a CivicOS contract (`contract: given (CivicOS
library)`, `form_status: contract_draft`), with `batch: 4` in their
`catalogue` block. Every individual public-health form (HLT-PH-001 … 010,
012, 013, 016 … 018) stays excluded by `docs/requirements/form-scope.json`;
HLT-PH-011 and 014 are now named there as allowed, beside HLT-PH-015. The
format, loader, gates and test are batch 1's (§8): the conformance test holds
the lines each form answers (Part 1's shared rules, the supplement's
conventions and gates, Part 6's common health rules, the public-health
family of §4, CFG-PH-001, the public-health integrity gate, deliverable 4 and
the specification's facility-report record) and its row of §4.1.

| Catalogue form | Title | Fields (and questions in repeatable groups) | Belongs to | Deviations (besides the six every health form shares) |
|---|---|---|---|---|
| HLT-PH-011 | Vaccination programme administration | 15 (+11) | `public-health.programme-return`, stage `submitted`, step `register`, document `return-form` | aggregate-only, no-vaccinee, supply-not-stock |
| HLT-PH-014 | Public-health risk communication approval | 12 | `public-health.risk-communication`, stage `drafted`, step `register`, document `draft-message` | aggregate-only, two-official-approval, not-a-report |

**Never a vaccinee.** HLT-PH-011's "eligible programme activity recorded" is
recorded for the programme: sessions planned and held, doses administered by
the breakdown the programme defines (none ship) and programme supply received
and used for the programme's own supply items, each count marked reported,
suspected, confirmed or modelled (`civicos.public_health.count_basis`) and
counted, estimated, incomplete or not available; a missing count is never a
zero. Eligibility is the programme's, cited from the nation's law when it is
established (`public-health.programme`), never a check of a person. Deviation
`no-vaccinee` names what the catalogue line could be read to ask for and why
it is not held (HLT-PH-012 excluded); `supply-not-stock` names the lot, expiry,
location and transactions that an inventory system would hold (integration
register 20.36). The scope check now also refuses a procedure whose fields
name a vaccinee, a vaccination record, a traced contact, a specimen or a
laboratory result (`lib/forms/scope.ts`), stricter than the catalogue.

**Approved by two officials.** HLT-PH-014's approval is the procedure's
four-eyes decision (`approve-message`), never a status field: the sealed
decision carries the digest of the message, its audience and channels, and the
release step refuses a message changed after approval
(`two-official-approval`). The approval-state field is the platform's, never
asked of whoever drafts. The evidence basis names the aggregate figures the
message rests on with their class; `not-a-report` answers the specification's
facility-report line, which belongs to the returns.

**HLT-PH-015 linked.** The aggregate return (batch 1) now belongs to
`public-health.programme-return` (stage `submitted`, step `register`): its
programme is a reference to the register of public-health programmes
(`health.registry.programmes`, checked: an established programme), and each
count carries its class beside its indicator and breakdown, so reported,
suspected, confirmed and modelled counts stay apart (FC6-4-02, gate FC6-12-06).
HLT-FAC-009 and HLT-LIC-008 (batch 1) are linked by identity to the complaint
intake procedures `health.complaint` and `prof.complaint` (stage `received`,
step `register`, document `complaint`). Each reads `draft` once its procedure
is installed and is adopted only in a version a second official approves.

| Check | Where |
|---|---|
| Both contracts quote and meet every piece of their lines; typed, classed, registered rules only; nothing a law decides set; three channels; contract draft | `catalogue-contracts.test.ts` (per form) |
| Programme activity as aggregates, the four classes, supply as programme counts | `catalogue-contracts.test.ts` "keeps the vaccination programme record to aggregates…" |
| Two-official approval and the links by identity | `catalogue-contracts.test.ts` "approves a risk communication by two officials, and links each public-health form…" |
| Procedure-link states of the linked forms | `procedure-link.test.ts` "is draft for the public-health forms and the complaint forms…" |
| Binding scope for public health | `lib/health/programmes/scope.test.ts` |

## 13. Catalogue contracts, batch 5: internal administration (21 October 2026)

The owner approved batch 5 with plan step I2: the 40 forms of the
supplement's Part 21 (shared internal administration, §21.1, lines 1088–1127
of `docs/forms-catalogue/SUPPLEMENT-PARTS-14-22-AND-CONTRACTS-05-13.md`). 33
were `contract_missing` and now carry a CivicOS contract (`contract: given
(CivicOS library)`); the seven whose own JSON contract §21.2 gives
(ADM-HR-002, ADM-PAY-012, ADM-PRC-018, ADM-ICT-029, ADM-ICT-030, ADM-AUD-036,
ADM-GOV-039) keep `contract: given` and name the library file that writes that
contract in the canonical format, field by field (`contract_file` on the row;
`app/scripts/requirements/catalogue.py`). All 40 read `contract_draft`, with
`batch: 5` in their `catalogue` block; none is in an excluded or legal-review
scope. The format, loader, gates and test are batch 1's (§8). The conformance
test holds the lines each form answers: Part 1's shared rules, the
supplement's conventions and gates, Part 21's opening line (1085) and its
critical internal controls (1241–1245), the specification's §10 lines 966 and
981 and its table row for the form's function (970–979), each form's row of
§21.1 and, for the seven, every line of its §21.2 contract (form_id, title and
each field).

**The institution's own.** The owner of every contract is `institution`, not
a slot of the deployment profile: each institution adopts the
internal-administration procedures as its own (`adm.<template>.<institution>`,
`installAdministrationProcedures()`, `lib/administration/procedures.ts`), drafted
by one official and approved by another, and its own officials decide
(`caseActRefusal()`); whole-government officials and administrators have no
domain authority, and an independent institution keeps its own (deviation
`institution-owned`). The library form names no institution (`ownerOf()`
returns none; the authority gate says each institution adopts it); a
template is in the register once any institution has adopted it
(`procedure-link.ts`).

**Linked by identity.** Nine forms belong to the internal-administration
procedures: the minimum the plan asks (payroll input, review and correction;
staff establishment; privileged access; internal policy; delegation) and the
disciplinary and legal-advice procedures. Each template lists its forms
(`ADMINISTRATION_PROCEDURES[].forms`); the other 31 name the procedure they
wait for (deviation `procedure-not-built`).

**Separation of duties.** Every approving step of a linked procedure needs a
second official (`fourEyes`) and names the earlier steps its official may not
have taken (`distinctFrom`), compared as persons by `dualControlRefusal()`;
the payroll effect checks the preparer and reviewer again. In the forms, the
payroll approver carries `SEPARATION-OF-DUTIES` against the preparer and the
reviewer (§21.2's own rule), and every other approval (reallocation, payment
authorisation, purchase order, disposal, records review, change, communication,
media response, annual plan, performance countersignature) carries
`APPROVER-DIFFERS-FROM-MAKER`; these fields are the officials', never asked.

**Restricted, every read logged.** Personnel, payroll, disciplinary,
legal-advice and legal-matter data are restricted (deviations
`personnel-restricted`, `legal-privilege`): the procedures' cases are
restricted to the assignee and supervisors, every read goes to the access log,
and the forms' policy `access.read_rule` says so. Pay, bank accounts and
payslips stay in the payroll system (`payroll-system`); the platform keeps the
batch, its totals, the reconciliation report and each official's act.

**Nothing typed.** Grades, employment types, leave types and entitlements,
personnel actions, performance and disciplinary outcomes (CFG-ADM-001), approval
limits (CFG-ADM-002), budget periods, rates, deductions, procurement methods,
asset categories and disposal methods (CFG-ADM-003), records classes and
retention schedules (CFG-ADM-004), systems, privileged roles and the longest
privileged access (CFG-ADM-005) are the nation's or the institution's: lists
named with "none ship", binding rules registered in `lib/forms/rules.ts`
(`leave_entitlement_from_rule`, `approval_limit_from_policy`,
`expense_rates_from_rule`, `retention_period_from_rule`,
`privileged_access_period_from_policy`, `audit_severity_from_policy` and the
rest), nation values named and unset (`adm.payroll.deductions` is a rule
`calculate()` refuses without; a production installation approves no payroll
without it). Amounts officials enter are whole numbers in the nation's
currency, never the money type (`estimate-not-money`); the budget register is
not on the platform (`finance-registers`).

**Delegation between accounts.** ADM-GOV-039 records the delegator and the
delegate as officials' accounts; the delegator's office is kept for
information only (`accounts-not-offices`, because holding an office grants no
permission). The procedure's effect records it (`lib/records/delegations.ts`);
authorisation reads it (`delegationCovering()`) within its institution,
procedures, steps and period, and a decision taken under it records both
people on the step and the sealed decision.

| Catalogue form | Title | Fields (and questions in repeatable groups) | Belongs to | Deviations (besides the five every ADM form shares) |
|---|---|---|---|---|
| ADM-HR-001 | Staff establishment and position request | 8 | `adm.establishment`, stage `requested`, step `submit`, document `establishment-request` | finance-registers |
| ADM-HR-002 (§21.2 contract) | Recruitment requisition | 7 | waits: a recruitment procedure of the institution (requisition, advertisement, evaluation, offer) | finance-registers, personnel-restricted |
| ADM-HR-003 | Recruitment evaluation | 7 (+3) | waits: the evaluation step of the institution's recruitment procedure | no-score, personnel-restricted |
| ADM-HR-004 | Employee onboarding | 8 | waits: an onboarding step of the institution's appointment procedure | personnel-restricted, payroll-system, own-accounts |
| ADM-HR-005 | Personnel record update | 6 | waits: a personnel-action procedure of the institution | personnel-restricted, payroll-system |
| ADM-HR-006 | Leave request | 6 | waits: a leave procedure of the institution (request, supervisor's decision) | personnel-restricted |
| ADM-HR-007 | Performance review | 10 | waits: a performance-review procedure of the institution | personnel-restricted, no-score |
| ADM-HR-008 | Training and development request | 6 | waits: a training-request procedure of the institution | estimate-not-money, finance-registers |
| ADM-HR-009 | Conflict-of-interest declaration | 5 | waits: an integrity register of the institution | personnel-restricted |
| ADM-HR-010 | Disciplinary process record | 9 | `adm.disciplinary`, stage `opened`, step `investigate`, document `investigation-report` | personnel-restricted |
| ADM-PAY-011 | Payroll input submission | 7 | `adm.payroll-input`, stage `prepared`, step `submit`, document `payroll-input` | payroll-system, estimate-not-money, personnel-restricted |
| ADM-PAY-012 (§21.2 contract) | Payroll review and approval | 9 (+4) | `adm.payroll-review`, stage `received`, step `review`, document `reconciliation-report` | payroll-system, personnel-restricted |
| ADM-PAY-013 | Payroll correction request | 6 (+2) | `adm.payroll-correction`, stage `requested`, step `correct`, document `correction-evidence` | payroll-system, estimate-not-money, personnel-restricted |
| ADM-FIN-014 | Internal budget request | 7 (+2) | waits: an internal budget procedure of the institution | finance-registers, estimate-not-money |
| ADM-FIN-015 | Budget reallocation request | 9 | waits: a reallocation procedure of the institution | finance-registers, estimate-not-money |
| ADM-FIN-016 | Expense claim | 5 (+5) | waits: an expense-claim procedure of the institution | estimate-not-money, treasury-executes |
| ADM-FIN-017 | Payment authorization | 9 | waits: a payment-authorisation procedure of the institution | finance-registers, estimate-not-money, treasury-executes |
| ADM-PRC-018 (§21.2 contract) | Internal procurement requisition | 8 (+4) | waits: a procurement requisition procedure of the institution | finance-registers, estimate-not-money |
| ADM-PRC-019 | Procurement evaluation | 7 (+3) | waits: a procurement evaluation procedure | no-score |
| ADM-PRC-020 | Purchase order approval | 9 (+3) | waits: a purchase-order procedure of the institution | finance-registers, estimate-not-money |
| ADM-PRC-021 | Supplier onboarding | 6 | waits: a supplier procedure of the institution | treasury-executes |
| ADM-AST-022 | Asset registration | 10 | waits: an asset register procedure of the institution | estimate-not-money |
| ADM-AST-023 | Asset transfer | 7 | waits: an asset transfer procedure of the institution | — |
| ADM-AST-024 | Asset disposal | 9 | waits: an asset disposal procedure of the institution | estimate-not-money |
| ADM-REC-025 | Records classification | 8 | waits: a records-management procedure of the institution | — |
| ADM-REC-026 | Records retention or disposal review | 8 | waits: a records retention review procedure of the institution | — |
| ADM-LEG-027 | Internal legal advice request | 7 | `adm.legal-advice`, stage `requested`, step `assign`, document `advice` | legal-privilege |
| ADM-LEG-028 | Litigation or legal matter registration | 9 | waits: a legal-matters register of the institution | legal-privilege, not-court-record |
| ADM-ICT-029 (§21.2 contract) | ICT access request | 9 | waits: an access-request procedure of the institution | own-accounts |
| ADM-ICT-030 (§21.2 contract) | Privileged access approval | 10 | `adm.privileged-access`, stage `requested`, step `review`, document `security-approval` | own-accounts |
| ADM-ICT-031 | ICT change request | 11 | waits: a change procedure of the institution | — |
| ADM-ICT-032 | Cybersecurity incident report | 7 | waits: a security incident procedure of the institution | — |
| ADM-COM-033 | Official communication approval | 10 | waits: a communications approval procedure of the institution | — |
| ADM-COM-034 | Media inquiry response | 9 | waits: a media-inquiry procedure of the institution | — |
| ADM-AUD-035 | Internal audit engagement | 8 (+2) | waits: an internal audit procedure of the institution | — |
| ADM-AUD-036 (§21.2 contract) | Audit finding and remediation | 10 | waits: the finding step of the institution's internal audit procedure | — |
| ADM-PLN-037 | Institutional annual plan | 8 (+3) | waits: a planning procedure of the institution | finance-registers |
| ADM-PLN-038 | Performance indicator return | 8 | waits: an indicator return procedure | aggregate-indicators |
| ADM-GOV-039 (§21.2 contract) | Delegation of authority record | 10 | `adm.delegation`, stage `requested`, step `approve`, document `delegation-instrument` | accounts-not-offices |
| ADM-GOV-040 | Internal policy approval | 9 | `adm.policy`, stage `drafted`, step `review`, document `policy-text` | — |

| Check | Where |
|---|---|
| All 40 quote and meet every piece of their lines; typed, classed, registered rules only; nothing a law decides set; three channels; contract draft | `catalogue-contracts.test.ts` (per form) |
| Linked forms and the templates that carry them; the rest wait | `catalogue-contracts.test.ts` "links payroll input, review and correction…" |
| Separation of duties in the forms and the procedures | `catalogue-contracts.test.ts` "keeps separation of duties…"; `lib/administration/administration.test.ts` |
| Personnel, disciplinary and legal-advice data restricted, reads logged | `catalogue-contracts.test.ts` "restricts personnel, disciplinary and legal-advice data…" |
| No value typed | `catalogue-contracts.test.ts` "types in no grade, entitlement, rate…" |
| Delegation between accounts, never offices | `catalogue-contracts.test.ts` "records delegation between accounts…"; `lib/auth/task-permissions.test.ts` |
| Procedure-link states once an institution adopts the templates | `procedure-link.test.ts` "is draft for each batch-5 form…" |
| Register rows: 40 contracts, nine Partial, contract files named | `lib/requirements/requirements.test.ts` "rows plan steps I0.2 and I2 deliver" |

Forms register: before batch 5, contract_missing 1646, contract_draft 206,
under_review 91, excluded 128, blocked 1; after, contract_missing 1613,
contract_draft 239, the others unchanged.

## 14. Catalogue contracts, batch 6: tax services (21 October 2026)

The owner assigned the tax part of plan step I5 with its forms batch: every
register row whose ID starts with `tax.` and that was `contract_missing`, 95
rows of the field series Part 2 §2.6 Departments B–H
(`FIELD-SERIES-PARTS-01-02.md`): periodic returns, payments, credits and
refunds, compliance, audit and inspection, assessments, objections, appeals
and disputes, withholding and third-party reporting, assistance, rulings and
incentives, debt, payment arrangements and recovery. All 95 now read
`contract: given (CivicOS library)`, `form_status: contract_draft`, with
`batch: 6` in their `catalogue` block; none was left for a later pass. The
periodic return (`tax.return.periodic.submit`) and the inspection checklist
(`tax.compliance.inspection_checklist`) keep the catalogue's own contracts;
the eight `tax.return_schema.*` rows are schemas, not forms (integration
register 20.75). The format, loader, identity, gates and three channels are
batch 3's (§10, §11); what is new is below.

**Sources answered.** Each contract quotes and meets, piece by piece: its
row; its department's specific fields, country decisions and safeguards
(Department B's return contract and engineering constraint, Department C's
payment and refund fields, Department D's compliance rule and inspection
safeguard, Department E's dispute fields and deadline rule, Department F's
withholding fields, Department G's assistance, ruling and incentive fields,
Department H's debt fields and its rule that no recovery power is inferred
from a balance); for officers' records, the §2.7 internal fields and their
universal control; the §2.8 configuration record of its department
(`country.tax.return_schemas`, `country.tax.payment_refund`,
`country.tax.compliance_powers`, `country.tax.disputes`,
`country.tax.debt_recovery`; Departments F and G have none, so their own
country-decision lines are named); and the specification's tax services and
decision controls (§5.2, §5.3, §5.5) where they apply. Every batch-6 form also
answers the shared items of group `tax6` in `shared/common-items.json`
(§2.6's opening rules, the retention and configuration records of §2.8, the
§2.9 gates, the specification's tax authority) and Part 1's and the
supplement's shared rules. The conformance test holds its own list of lines
per form (`TAX6`, `TAX6_FORM`).

**Tax secrecy.** As batch 3: every field the forms define is `restricted`
with `confidentiality: "tax"`; every form carries `access.read_rule`
(`canReadTax()`, every read in the access log) and `access.others` (status
only through `taxpayer.status`). Field groups: `core.declaration_signature`
(the act of declaring) and, for the refund application only,
`core.payout_account`, which the catalogue names for the payout (deviation
`payout-group`); representation is asked as the forms' own restricted fields.

**Money.** An amount a person states (the taxpayer's claim, declaration,
proposed schedule or remittance; the deciding officials' adjusted figure) is
typed money with its currency and named in the form's `amounts.stated`
policy (deviation `stated-amount`); it is never a charge. Every charge
(interest on a refund, interest under an arrangement, a penalty on a
disclosure, tax to be withheld) is a platform field calculated by an approved
rule (`derived_from_approved_rule`; deviation `charge-by-rule`), with the
nation's rule named and unset; the procedures refuse such a charge in
production without the approved rule (`lawAmount()` in
`lib/tax/procedures.ts`). No fee, rate, threshold, period or deadline is
typed: 25 new binding rules (`lib/forms/rules.ts`, from
`nil_return_required_by_rule` to `recovery_suspension_allowed_by_rule`) are
recorded as not performed and block publication until configured.

**Procedures.** 56 forms are linked by identity to the tax procedures (each
reads `draft` once installed; `procedure-link.test.ts`):

| Procedure | Forms |
|---|---|
| `tax.return` (nil and late returns added) | nil, late submission, response to a return query, officer assessment, decision, notice; the assessment notice; the withholding return |
| `tax.amendment` | return amendment, clerical correction, assessment amendment, review request, withholding return amendment |
| `tax.objection` (admissibility, information, withdrawal and not-admitted added) | objection to a return assessment, objection, supplement, extension request, completeness assessment, decision, withdrawal, closure |
| `tax.refund` | application, supporting evidence, assessment, decision, payment instruction, reconciliation |
| `tax.compliance` | case opening, scope approval, information request and response, inspection plan, evidence register, interview record, findings draft, taxpayer response, findings review, assessment decision, closure; withholding discrepancy response and decision |
| `tax.registration-amendment` | withholding-agent registration and amendment; batch 3's seven change forms (§10) |
| `tax.payment-plan`, `tax.payment-plan-review` | arrangement request, evidence, decision; change and cancellation requests, default review |
| `tax.disclosure` | voluntary disclosure, disclosure assessment |
| `tax.ruling` | ruling request, further information, withdrawal, decision, reconsideration |

The other 39 wait in the library with the reason no procedure fits, and no
power was invented: appeals (to the body the nation names), settlements,
allocation, transfer, adjustment and reversal of payments, payment disputes,
compliance extensions, conduct complaints and referrals, withholding
remittances, certificates and third-party statements, enquiries and
guidance, incentives, debt statements and every recovery form. Payments
(`tax.payment.initiate`, `external_reference`, `tax.withholding.payment`)
open no case: a payment is made against a bill carrying the liability's
reference and reconciled once (deviation `bill-payment`).

**Findings, never a score.** Officers' assessments, reviews and inspection
records keep findings as matter, what was found and reasons, a recommended
procedural next step "not a finding of liability", and the official from the
signed-in session; no field names a score, rating, probability or risk.
Inspection, evidence and interview records hold observations only. The
referral form names no suspect (`no-suspect`; a suspect-identifying
prosecution referral needs a legal review first). The objection's
completeness check is by an official who did not take the decision objected
to.

| Check | Where |
|---|---|
| Each contract quotes and meets its lines; typed, classed, registered rules only; nothing a law decides set; three channels; contract draft | `catalogue-contracts.test.ts` (per form) |
| Tax secrecy, groups, read rule | `catalogue-contracts.test.ts` "holds every tax-services field under tax secrecy…" |
| Lists empty, stated amounts named, charges by rule | "types in no rate, period, penalty, interest or fee…" |
| Dispute periods by rule, grounds 20–10,000 characters, appeals to the body named | "counts every dispute period by the approved rule…" |
| Findings without a score, observations only, no suspect | "records an officer's findings with reasons, never a score…" |
| Links by identity, payments open no case, periods unset | "links each form to the tax procedure that carries it…"; `procedure-link.test.ts` |
| The procedures end to end (bills and receipts once, refunds reconciled once, interest refused in production without a rule, two officials) | `lib/tax/services.test.ts` |

Register: contract_missing 1646 → 1551, contract_draft 206 → 301; the `tax.*`
rows' requirement status Not yet 97 / Partial 8 → Not yet 45 / Partial 60
(and batch 3's seven change forms Partial).

**Deviations every batch-6 form shares**: `tax-secrecy-class`,
`no-tax-values`, `config-impact`, `minimisation`, `evidence-requirement`,
`scanning` (as batch 3, §10).

| Catalogue form | Title | Fields (and questions in repeatable groups) | Belongs to | Deviations (besides the six every batch-6 form shares) |
|---|---|---|---|---|
| tax.appeal.response | Submit the authority's response to an appeal | 8 | library; waits for an appeal to the body the nation's law names, transmitted by a referral case | court-appeal, appeal-not-built, officer-from-sign-in |
| tax.appeal.submit | Submit an appeal to the designated authority | 15 + core.declaration_signature | library; waits for an appeal to the body the nation's law names | representation-own-fields, declaration-group, stated-amount, court-appeal, appeal-not-built |
| tax.appeal.transmit | Transmit an appeal to the appellate body | 8 | library; waits for an appeal to the body the nation's law names, transmitted by a referral case | referral-case, court-appeal, appeal-not-built, officer-from-sign-in |
| tax.assessment.amendment | Request amendment of an assessment | 11 + core.declaration_signature | `tax.amendment` · lodged (document `amendment-request`) | representation-own-fields, declaration-group, stated-amount |
| tax.assessment.notice | Issue an assessment notice | 9 | `tax.return` · assessed · `issue` | delivery-not-recorded, officer-from-sign-in |
| tax.assessment.review_request | Request administrative review of an assessment | 14 + core.declaration_signature | `tax.amendment` · lodged (document `amendment-request`) | representation-own-fields, declaration-group, stated-amount |
| tax.assistance.enquiry | Ask a question about a tax obligation | 10 | library; waits for an enquiry service of the tax authority | representation-own-fields, assistance-not-built |
| tax.assistance.guidance_request | Request guidance on a tax procedure | 10 | library; waits for an enquiry service of the tax authority | representation-own-fields, assistance-not-built |
| tax.compliance.assessment_decision | Record the authorised assessment decision | 10 | `tax.compliance` · pending-approval · `assess` | decision-in-engine, officer-from-sign-in, no-score |
| tax.compliance.case.open | Open an authorised compliance case | 9 | `tax.compliance` · opened · `propose-scope` (document `case-opening`) | no-score, officer-from-sign-in |
| tax.compliance.case_closure | Close a compliance case | 6 | `tax.compliance` · findings-review · `close` | officer-from-sign-in, no-score |
| tax.compliance.complaint | Complain about the conduct of a compliance officer | 11 + core.declaration_signature | library; waits for a conduct complaint reviewed by the independent or designated body the nation names | representation-own-fields, declaration-group, complaint-not-built, no-score |
| tax.compliance.evidence_register | Register evidence collected lawfully | 6 (+4) | `tax.compliance` · authorised (document `evidence`) | observations-only, officer-from-sign-in, custody-binding, no-score |
| tax.compliance.extension_decision | Record an extension decision | 7 | library; waits for an extension step of tax.compliance | officer-from-sign-in, extension-not-built, no-score |
| tax.compliance.extension_request | Ask for more time to answer an information request | 10 + core.declaration_signature | library; waits for an extension step of tax.compliance | representation-own-fields, declaration-group, extension-not-built, no-score |
| tax.compliance.findings_draft | Draft compliance findings for review | 7 (+4) | `tax.compliance` · authorised · `draft-findings` | no-score, observations-only, officer-from-sign-in |
| tax.compliance.findings_review | Review findings and the taxpayer's response | 8 (+3) | `tax.compliance` · findings-review · `propose-assessment` | no-score, officer-from-sign-in |
| tax.compliance.information_request | Request tax information under an approved power | 7 (+3) | `tax.compliance` · authorised · `request-information` (document `information-request`) | officer-from-sign-in, no-score |
| tax.compliance.information_response | Respond to a tax information request | 10 (+2) + core.declaration_signature | `tax.compliance` · awaiting-information · `information-received` (document `information-response`) | representation-own-fields, declaration-group, no-score |
| tax.compliance.inspection_plan | Record an authorised inspection plan | 10 | `tax.compliance` · authorised (document `inspection-record`) | officer-from-sign-in, no-score |
| tax.compliance.interview_record | Record an interview or meeting, where permitted | 10 | `tax.compliance` · authorised (document `evidence`) | observations-only, officer-from-sign-in, no-score |
| tax.compliance.referral | Refer a matter to another authority, where the law permits | 7 | library; waits for a referral case to the receiving institution | referral-case, no-suspect, officer-from-sign-in, no-score |
| tax.compliance.scope.approve | Approve the scope of a compliance review | 11 | `tax.compliance` · scope-review · `authorise` | no-score, decision-in-engine, officer-from-sign-in |
| tax.compliance.taxpayer_response | Respond to proposed findings | 9 (+3) + core.declaration_signature | `tax.compliance` · awaiting-response · `response-received` (document `taxpayer-response`) | representation-own-fields, declaration-group, no-score |
| tax.credit.adjustment | Request or record a credit adjustment | 13 + core.declaration_signature | library; waits for a credit adjustment decided by two officials | representation-own-fields, declaration-group, stated-amount, adjustment-not-built |
| tax.debt.disclosure.assessment | Assess a voluntary disclosure | 9 (+3) | `tax.disclosure` · assessment · `propose` | no-score, officer-from-sign-in, no-recovery-inferred |
| tax.debt.payment_plan.cancel_request | Request cancellation of a payment arrangement | 10 + core.declaration_signature | `tax.payment-plan-review` · received (document `review-request`) | representation-own-fields, declaration-group, no-recovery-inferred |
| tax.debt.payment_plan.change_request | Request a change to an approved arrangement | 11 (+3) + core.declaration_signature | `tax.payment-plan-review` · received (document `review-request`) | representation-own-fields, declaration-group, no-recovery-inferred, stated-amount |
| tax.debt.payment_plan.decision | Approve, refuse or vary a payment arrangement | 13 (+3) | `tax.payment-plan` · pending-approval · `approve` | decision-in-engine, officer-from-sign-in, no-recovery-inferred, stated-amount, charge-by-rule |
| tax.debt.payment_plan.default_review | Review an alleged payment-arrangement default | 11 (+3) | `tax.payment-plan-review` · review · `propose` | no-score, officer-from-sign-in, no-recovery-inferred |
| tax.debt.payment_plan.evidence | Send evidence for a payment arrangement | 11 + core.declaration_signature | `tax.payment-plan` · awaiting-evidence · `evidence-received` (document `arrangement-evidence`) | representation-own-fields, declaration-group, no-recovery-inferred |
| tax.debt.payment_plan.request | Request a payment arrangement | 13 (+3) + core.declaration_signature | `tax.payment-plan` · requested (document `arrangement-request`) | representation-own-fields, declaration-group, no-recovery-inferred, stated-amount |
| tax.debt.recovery.authorize | Record authorisation for a lawful recovery action | 15 | library; waits for a recovery procedure, only for the recovery actions the nation's law gives | recovery-not-built, no-recovery-inferred, decision-in-engine, officer-from-sign-in |
| tax.debt.recovery.close | Close a recovery case | 5 | library; waits for a recovery procedure, only for the recovery actions the nation's law gives | recovery-not-built, officer-from-sign-in, no-recovery-inferred |
| tax.debt.recovery.dispute | Dispute a recovery action | 14 + core.declaration_signature | library; waits for a recovery procedure, only for the recovery actions the nation's law gives | representation-own-fields, declaration-group, stated-amount, recovery-not-built, no-recovery-inferred |
| tax.debt.recovery.notice | Issue a recovery notice | 10 | library; waits for a recovery procedure, only for the recovery actions the nation's law gives | recovery-not-built, no-recovery-inferred, delivery-not-recorded |
| tax.debt.recovery.response | Respond to a recovery notice | 10 + core.declaration_signature | library; waits for a recovery procedure, only for the recovery actions the nation's law gives | representation-own-fields, declaration-group, recovery-not-built, no-recovery-inferred |
| tax.debt.recovery.suspend_request | Request suspension of a recovery action, where permitted | 10 + core.declaration_signature | library; waits for a recovery procedure, only for the recovery actions the nation's law gives | representation-own-fields, declaration-group, recovery-not-built, no-recovery-inferred |
| tax.debt.statement.request | Request a statement of tax debt | 10 | library; waits for a statement drawn from the tax account | representation-own-fields, no-recovery-inferred, statement-from-ledger |
| tax.debt.voluntary_disclosure | Disclose an omitted or corrected tax obligation voluntarily | 14 + core.declaration_signature | `tax.disclosure` · received (document `disclosure`) | representation-own-fields, declaration-group, stated-amount, charge-by-rule, no-recovery-inferred |
| tax.dispute.closure | Close a completed dispute | 6 | `tax.objection` · pending-approval | closure-in-engine, officer-from-sign-in |
| tax.dispute.settlement_proposal | Propose a settlement, where the law permits | 11 + core.declaration_signature | library; waits for a settlement procedure, only where the law gives the tax authority power to settle or … | representation-own-fields, declaration-group, stated-amount, settlement-not-built |
| tax.dispute.settlement_review | Review a proposed settlement | 8 (+3) | library; waits for a settlement procedure, only where the law gives the tax authority power to settle or … | no-score, officer-from-sign-in, settlement-not-built |
| tax.dispute.withdraw | Withdraw an objection or appeal | 11 + core.declaration_signature | `tax.objection` · review · `withdraw` | representation-own-fields, declaration-group |
| tax.incentive.amendment | Request an amendment to an incentive record | 11 + core.declaration_signature | library; waits for a statutory incentive procedure of the tax authority | incentive-not-built, representation-own-fields, declaration-group |
| tax.incentive.application | Apply for a statutory tax incentive | 13 + core.declaration_signature | library; waits for a statutory incentive procedure of the tax authority | incentive-not-built, representation-own-fields, declaration-group |
| tax.incentive.compliance_report | Submit a required incentive-compliance report | 12 (+2) + core.declaration_signature | library; waits for a statutory incentive procedure of the tax authority | incentive-not-built, representation-own-fields, declaration-group |
| tax.incentive.decision | Record an incentive decision | 11 | library; waits for a statutory incentive procedure of the tax authority | incentive-not-built, decision-in-engine, officer-from-sign-in |
| tax.incentive.renewal | Renew an incentive, where the law allows renewal | 11 + core.declaration_signature | library; waits for a statutory incentive procedure of the tax authority | incentive-not-built, representation-own-fields, declaration-group |
| tax.incentive.review_request | Request review of an incentive decision | 11 + core.declaration_signature | library; waits for a statutory incentive procedure of the tax authority | incentive-not-built, representation-own-fields, declaration-group |
| tax.incentive.surrender | Surrender an incentive | 11 + core.declaration_signature | library; waits for a statutory incentive procedure of the tax authority | incentive-not-built, representation-own-fields, declaration-group |
| tax.incentive.withdrawal | Withdraw a pending incentive application | 11 + core.declaration_signature | library; waits for a statutory incentive procedure of the tax authority | incentive-not-built, representation-own-fields, declaration-group |
| tax.objection.assessment | Assess the procedural completeness of an objection | 10 (+3) | `tax.objection` · review · `propose` | no-score, officer-from-sign-in |
| tax.objection.decision | Record the objection decision | 13 | `tax.objection` · pending-approval · `vary` | decision-in-engine, officer-from-sign-in |
| tax.objection.extension_request | Ask for more time to object, where the law permits | 10 + core.declaration_signature | `tax.objection` · lodged (document `extension-request`) | representation-own-fields, declaration-group, extension-at-admissibility |
| tax.objection.submit | Submit a formal tax objection | 14 + core.declaration_signature | `tax.objection` · lodged (document `objection`) | representation-own-fields, declaration-group, stated-amount |
| tax.objection.supplement | Add evidence to an objection | 10 + core.declaration_signature | `tax.objection` · awaiting-information · `information-received` (document `objection-evidence`) | representation-own-fields, declaration-group |
| tax.payment.allocation_request | Ask for an unmatched payment to be allocated | 11 + core.declaration_signature | library; waits for an allocation review | representation-own-fields, declaration-group, allocation-not-built, bill-payment |
| tax.payment.dispute | Dispute a payment allocation or balance | 14 + core.declaration_signature | library; waits for a dispute of a payment allocation or an account balance | representation-own-fields, declaration-group, stated-amount, payment-dispute-not-built |
| tax.payment.external_reference | Tell us about a payment made elsewhere | 12 | library; no case is opened (a payment against a bill, reconciled once) | representation-own-fields, bill-payment, stated-amount |
| tax.payment.initiate | Start a tax payment | 11 | library; no case is opened (a payment against a bill, reconciled once) | representation-own-fields, bill-payment, stated-amount |
| tax.payment.reversal_request | Ask for a payment to be reversed, where the law allows | 11 + core.declaration_signature | library; waits for a reversal review decided by two officials, posting the reversal against the receipt it … | representation-own-fields, declaration-group, bill-payment, reversal-not-built |
| tax.payment.transfer_request | Ask to move a credit between your tax accounts | 12 + core.declaration_signature | library; waits for an allocation review | representation-own-fields, declaration-group, stated-amount, allocation-not-built, bill-payment |
| tax.refund.application | Apply for a tax refund | 16 + core.payout_account, core.declaration_signature | `tax.refund` · claimed (document `refund-claim`) | representation-own-fields, declaration-group, stated-amount, payout-group |
| tax.refund.assessment | Assess a refund claim | 11 (+3) | `tax.refund` · assessment · `propose` | no-score, officer-from-sign-in, stated-amount |
| tax.refund.decision | Approve, refuse or adjust a refund claim | 13 | `tax.refund` · pending-approval · `approve` | decision-in-engine, officer-from-sign-in, stated-amount, charge-by-rule |
| tax.refund.payment_instruction | Authorise an approved refund payment | 7 | `tax.refund` · approved · `instruct` | officer-from-sign-in |
| tax.refund.reconciliation | Reconcile the refund payment | 8 | `tax.refund` · instructed · `reconcile` (document `payout-confirmation`) | officer-from-sign-in, stated-amount |
| tax.refund.supporting_evidence | Send evidence for a refund claim | 11 + core.declaration_signature | `tax.refund` · awaiting-evidence · `evidence-received` (document `refund-evidence`) | representation-own-fields, declaration-group |
| tax.return.periodic.amend | Amend a return | 13 + core.declaration_signature | `tax.amendment` · lodged (document `amendment-request`) | representation-own-fields, declaration-group, schema-typed-data |
| tax.return.periodic.appeal | Appeal a decision on a return | 15 + core.declaration_signature | library; waits for an appeal to the body the nation's law names | representation-own-fields, declaration-group, stated-amount, court-appeal, appeal-not-built |
| tax.return.periodic.correction | Correct an officer's clerical error | 8 | `tax.amendment` · lodged (document `amendment-request`) | officer-from-sign-in |
| tax.return.periodic.decision | Record the return's assessed outcome | 10 | `tax.return` · pending-approval · `assess` | decision-in-engine, officer-from-sign-in |
| tax.return.periodic.further_information | Answer a question about your return | 11 + core.declaration_signature | `tax.return` · returned · `resubmit` (document `return-form`) | representation-own-fields, declaration-group |
| tax.return.periodic.late_submission | Submit a late return | 14 + core.declaration_signature | `tax.return` · filed (document `return-form`) | representation-own-fields, declaration-group, schema-typed-data, charge-by-rule |
| tax.return.periodic.nil | Submit a nil return | 11 + core.declaration_signature | `tax.return` · filed (document `return-form`) | representation-own-fields, declaration-group, nil-no-data |
| tax.return.periodic.notice | Issue a return receipt or assessment notice | 9 | `tax.return` · assessed · `issue` | delivery-not-recorded, officer-from-sign-in |
| tax.return.periodic.objection | Object to an assessment | 14 + core.declaration_signature | `tax.objection` · lodged (document `objection`) | representation-own-fields, declaration-group, stated-amount |
| tax.return.periodic.officer_assessment | Record a return assessment | 8 (+3) | `tax.return` · checking · `propose` | no-score, officer-from-sign-in |
| tax.return.periodic.withdraw_request | Ask for a return to be withdrawn or treated as invalid | 11 + core.declaration_signature | library; waits for a withdrawal or invalidation review of a filed return | representation-own-fields, declaration-group, withdrawal-not-built |
| tax.ruling.decision | Record a formal ruling | 12 | `tax.ruling` · pending-approval · `issue` | decision-in-engine, officer-from-sign-in |
| tax.ruling.further_information | Answer a request for ruling information | 10 + core.declaration_signature | `tax.ruling` · awaiting-information · `information-received` (document `ruling-documents`) | representation-own-fields, declaration-group |
| tax.ruling.reconsideration | Request reconsideration of a ruling, where permitted | 15 + core.declaration_signature | `tax.ruling` · requested (document `ruling-request`) | representation-own-fields, declaration-group |
| tax.ruling.request | Request a formal tax ruling | 12 + core.declaration_signature | `tax.ruling` · requested (document `ruling-request`) | representation-own-fields, declaration-group |
| tax.ruling.withdraw | Withdraw a pending ruling request | 10 + core.declaration_signature | `tax.ruling` · review · `withdraw` | representation-own-fields, declaration-group |
| tax.withholding.certificate.issue | Issue a withholding certificate | 6 | library; waits for third-party reporting | reporting-not-built |
| tax.withholding.details.amend | Amend withholding-agent details | 12 + core.declaration_signature | `tax.registration-amendment` · submitted (document `change-request`) | representation-own-fields, declaration-group |
| tax.withholding.discrepancy.decision | Record the discrepancy outcome | 10 | `tax.compliance` · findings-review · `close` | no-score, decision-in-engine, officer-from-sign-in |
| tax.withholding.discrepancy.response | Respond to a reporting discrepancy | 10 + core.declaration_signature | `tax.compliance` · awaiting-information · `information-received` (document `information-response`) | representation-own-fields, declaration-group |
| tax.withholding.payment | Submit a withholding remittance | 10 | library; no case is opened (a payment against a bill, reconciled once) | representation-own-fields, bill-payment, stated-amount |
| tax.withholding.registration | Register as a withholding agent | 11 + core.declaration_signature | `tax.registration-amendment` · submitted (document `change-request`) | representation-own-fields, declaration-group, withholding-as-obligation |
| tax.withholding.return.amend | Amend a withholding return | 14 (+4) + core.declaration_signature | `tax.amendment` · lodged (document `amendment-request`) | representation-own-fields, declaration-group, stated-amount, charge-by-rule |
| tax.withholding.return.submit | Submit a withholding return | 13 (+4) + core.declaration_signature | `tax.return` · filed (document `return-form`) | representation-own-fields, declaration-group, stated-amount, charge-by-rule |
| tax.withholding.statement.correct | Correct a third-party statement | 12 (+4) + core.declaration_signature | library; waits for third-party reporting | representation-own-fields, declaration-group, stated-amount, reporting-not-built |
| tax.withholding.statement.submit | Submit a required third-party statement | 10 (+4) + core.declaration_signature | library; waits for third-party reporting | representation-own-fields, declaration-group, stated-amount, reporting-not-built |

## 15. Catalogue contracts, batch 7: independent oversight (21 October 2026)

The owner approved the part 12 accountability forms the independent oversight
procedures carry (plan step I8, `lib/oversight/procedures.ts`). Seven forms
of `docs/forms-catalogue/PARTS-12-13.md`, which were `contract_missing`, now
have a CivicOS contract (`contract: given (CivicOS library)`, `form_status:
contract_draft`), with `batch: 7` in their `catalogue` block. The format,
loader, gates and test are batch 1's (§8): the conformance test holds the
lines each form answers (Part 1's shared rules and the supplement's
conventions and gates, as for every batch; Part 12's rules for independent
institutions in the shared group `oversight`: lines 64, 66, 161, 193, 196,
197, 199, 401, 403, 405, 451, 478, 486, 488, 489, 500, 518 (CFG-DEM-012),
529, 590 and 591; each form's archetype line and the specification's
operating specification for its body, Part 4 §A and §C) and its own row of
§2.4 or §2.5.

| Catalogue form | Title | Fields | Belongs to | Deviations (besides the five every oversight form shares) |
|---|---|---|---|---|
| DEM-CON-012 | Ombudsman complaint | 20 and the declaration | `ombudsman.complaint`, stage `received`, step `register`, document `complaint` | identity-kept-apart, reference-only-referral, no-ai-finding, anonymity-country |
| DEM-CON-013 | Human rights complaint | 21 and the declaration | `human-rights.complaint`, stage `received`, step `register`, document `complaint` | identity-kept-apart, reference-only-referral, no-ai-finding, anonymity-country, witness-reference |
| DEM-CON-014 | Public audit finding | 13 | `audit.engagement`, stage `fieldwork`, step `record-finding`, document `working-paper` | response-beside, report-approval, no-ai-finding |
| DEM-CON-018 | Personal data rights request | 15 and the declaration | `data-protection.rights-request`, stage `received`, step `register`, document `request` | identity-kept-apart, no-direct-read, processor-register, no-ai-finding |
| DEM-CON-019 | Protected disclosure to an independent body | 19 and the declaration | `integrity.disclosure`, stage `received`, step `register`, document `disclosure` | identity-kept-apart, reference-only-referral, no-suspect, no-ai-finding, anonymity-country, declarations-elsewhere |
| DEM-CON-020 | Independent institution oversight response | 9 and the declaration | `audit.engagement`, stage `response` (also the other bodies' cases); not a step of the body's case | response-beside, not-a-step |
| DEM-PUB-009 | Public integrity complaint | 14 and the declaration | `integrity.disclosure`, stage `received`, step `register`, document `disclosure` | identity-kept-apart, reference-only-referral, no-suspect, no-ai-finding, anonymity-country, no-digital-identity |

The five deviations every oversight form shares are `minimisation`,
`evidence-requirement` and `scanning` (as every batch) and
`oversight-slot` (the body is the institution the nation names for its slot,
shipped empty, independent once named) and `recommendation-not-order` (a
finding is a recommendation with reasons, never an order or an automatic
decision).

**The person who raised it is kept apart.** The answers about the
complainant, the person making a disclosure or the data subject (whether
anonymous, name, contact, consent to share, protection needs) are restricted,
and the procedures carry none of them: intake (`receiveProtected()`) puts them
in the protected-identity record (`lib/oversight/protected-identity.ts`), read
only by the assigned or specifically authorised official with a purpose, every
read logged; never in a list, a search, a case read or an export (acceptance
P4-06, P4-07). Whether anonymous submissions are accepted is the nation's
(`configured_profile`, binding). A protected witness is recorded the same way
(role `witness`).

**A finding stays the body's.** DEM-CON-014 records criteria, condition,
cause, effect, evidence and the recommendation; the audited institution's
response is its own form (DEM-CON-020), recorded beside the finding and never
changing it; only the audit office corrects its finding, as a new version, and
never once issued (P4-04). The report's approval and publication are steps of
the engagement by two officials, never a status field.

**No suspect, no score, a reference only.** No field names a person as a
suspect or records guilt; what is alleged is restricted free text. A referral
carries the case reference only (prosecution referrals identifying a person:
legal review, plan I11). Voter registration (DEM-ELC-003 … 006) and every
other form the scope holds for legal review are not written.

**The data-protection authority never reads the records.** DEM-CON-018's
request goes to the controller under an approved request-information
relationship; the authority reads the access log only for the records its case
names (P4-05). Processor references, data categories, breach notifications and
DPIA records are not built (`processor-register`, integration register 20.88).

| Check | Where |
|---|---|
| Each contract quotes and meets every piece of its lines; typed, classed, registered rules only; nothing a law decides set; three channels; contract draft | `catalogue-contracts.test.ts` (per form) |
| Links by identity; each body a slot | `catalogue-contracts.test.ts` "links each oversight form to its body's procedure by identity…" |
| The person kept apart and restricted; no suspect; no voter registration form | `catalogue-contracts.test.ts` "keeps the person who raised a matter restricted and apart from the case…" |
| Audit finding and the response beside it | `catalogue-contracts.test.ts` "records an audit finding by criteria, condition, cause, effect, evidence and recommendation…" |
| The procedures behind them | `lib/oversight/oversight.test.ts`, `app/api/oversight/route.test.ts` |

## 16. Catalogue contracts, batch 8: executive office, Cabinet, treasury and budget (26 October 2026)

The owner's assignment for plan step I5 (the economic group) asked for the
catalogue forms the new procedures carry. Fifty-seven forms of the field
series Part 2 (`docs/forms-catalogue/FIELD-SERIES-PARTS-01-02.md`), which were
`contract_missing`, now have a CivicOS contract (`contract: given (CivicOS
library)`, `form_status: contract_draft`), with `batch: 8` in their
`catalogue` block: §2.1 Department A (official correspondence and petitions,
7), §2.2 Department A (Cabinet agenda and decisions, 11; the paper itself is
the catalogue's own contract), §2.4 Department A (payments, 10; the
instruction is the catalogue's own) and Department B (cash forecasting, 7),
§2.5 Department A (budget preparation, 11; the bid is the catalogue's own and
the two capital-project forms wait with public investment) and Department B
(budget execution, 11). The format, loader, gates and test are batch 1's
(§8). The conformance test holds the lines each form answers: Part 1's shared
rules and the supplement's conventions and gates, as for every batch; Part 2's
implementation rules (lines 1838–1843, the shared group `econ8`); and its own
row and department lines: the submission or specific fields (§2.1 lines
1857–1864, §2.4 B lines 2273–2282, §2.5 B lines 2475–2486), the evidence and
channel lines (1865, 1869), the controls (the Cabinet's 2027 and 1897, the
payment's universal control 2262, the budget's 2460) and the country
decisions (1867, the payment contract's 2254–2257, 2283, the bid contract's
2452–2455, 2487).

Forty-three are linked by identity to the I5 reference procedures
(`lib/finance/procedures.ts`, `lib/cabinet/procedures.ts`); fourteen name the
procedure they wait for (an agenda register, a payment refund, dispute or
correction, a cash position or liquidity case, a correspondence complaint,
variance, underspend, overrun, year-end and correction reports). Owners are
the slots `finance` and `cabinetOffice`, shipped empty; the spending
institution is named on each record, never a ministry by name.

| Catalogue form | Title | Owner | Fields | Belongs to | Deviations (besides the five every batch-8 form shares) |
|---|---|---|---|---|---|
| budget.allocation.approve | Approve a budget allocation | finance | 7 | `budget.bid`, stage `pending-approval`, step `allocate` | decision-in-engine, officer-from-sign-in |
| budget.allocation.notify | Notify an institution of its approved allocation | finance | 4 | `budget.bid`, stage `allocated` | delivery-not-recorded, officer-from-sign-in |
| budget.allocation.propose | Propose a budget allocation | finance | 5 | `budget.bid`, stage `negotiation`, step `propose` | officer-from-sign-in, stated-amount |
| budget.bid.justification | Supply missing budget justification | finance | 5 | `budget.bid`, stage `awaiting-justification`, step `justification-received`, document `justification` | officer-from-sign-in |
| budget.bid.revise | Revise a budget request | finance | 6 | `budget.bid`, stage `review`, step `revise` | officer-from-sign-in, stated-amount |
| budget.bid.withdraw | Withdraw a budget request | finance | 4 | `budget.bid`, stage `review`, step `withdraw` | officer-from-sign-in |
| budget.ceiling.approve | Approve an institutional budget ceiling | finance | 7 | `budget.ceiling`, stage `pending-approval`, step `approve` | decision-in-engine, officer-from-sign-in |
| budget.ceiling.propose | Propose an institutional budget ceiling | finance | 7 | `budget.ceiling`, stage `proposed`, step `propose` | officer-from-sign-in, stated-amount |
| budget.circular.issue | Prepare and issue a budget call circular | finance | 6 | `budget.circular`, stage `drafted`, step `propose`, document `circular` | officer-from-sign-in |
| budget.execution.commitment | Register a proposed financial commitment | finance | 13 | `finance.commitment`, stage `proposed`, step `check`, document `commitment-request` | officer-from-sign-in, stated-amount, balance-computed |
| budget.execution.commitment.approve | Approve or refuse a commitment | finance | 7 | `finance.commitment`, stage `pending-approval`, step `approve` | decision-in-engine, officer-from-sign-in |
| budget.execution.correction | Correct a submitted execution report | finance | 12 | waits: Execution report correction | correction-not-built, officer-from-sign-in, stated-amount, balance-computed |
| budget.execution.overrun.report | Report a forecast or actual overrun | finance | 12 | waits: Overrun case | report-not-built, officer-from-sign-in, stated-amount, balance-computed |
| budget.execution.reallocation.approve | Approve or refuse a reallocation | finance | 8 | `budget.revision`, stage `pending-approval`, step `approve` | decision-in-engine, officer-from-sign-in |
| budget.execution.reallocation.request | Request a budget reallocation | finance | 14 | `budget.revision`, stage `requested`, step `check`, document `revision-request` | officer-from-sign-in, stated-amount, balance-computed |
| budget.execution.supplementary.request | Request supplementary funding | finance | 13 | `budget.revision`, stage `requested`, step `check`, document `revision-request` | officer-from-sign-in, stated-amount, balance-computed |
| budget.execution.underspend.report | Report expected underspending | finance | 12 | waits: Underspend report | report-not-built, officer-from-sign-in, stated-amount, balance-computed |
| budget.execution.variance.report | Report a material budget variance | finance | 12 | waits: Variance report | report-not-built, officer-from-sign-in, stated-amount, balance-computed |
| budget.execution.virement | Request an authorized transfer between budget lines | finance | 14 | `budget.revision`, stage `requested`, step `check`, document `revision-request` | officer-from-sign-in, stated-amount, balance-computed |
| budget.execution.year_end | Submit year-end budget closure information | finance | 12 | waits: Year-end closure | year_end-not-built, officer-from-sign-in, stated-amount, balance-computed |
| budget.negotiation.record | Record a budget negotiation outcome | finance | 5 | `budget.bid`, stage `review`, step `record-negotiation` | officer-from-sign-in, stated-amount |
| budget.programme.costing | Submit programme costing | finance | 7 | `budget.bid`, stage `submitted`, document `costing` | officer-from-sign-in, stated-amount |
| exec.cabinet.action.close | Confirm completion of a Cabinet action | cabinetOffice | 7 | `cabinet.decision`, stage `implementation` | cabinet-rules, officer-from-sign-in |
| exec.cabinet.action.update | Report progress on a Cabinet action | cabinetOffice | 5 | `cabinet.decision`, stage `implementation` | cabinet-rules, officer-from-sign-in |
| exec.cabinet.agenda.approve | Approve the Cabinet agenda | cabinetOffice | 5 | waits: Agenda approval | cabinet-rules, agenda-not-built, officer-from-sign-in |
| exec.cabinet.agenda.propose | Propose an item for a Cabinet meeting | cabinetOffice | 5 | waits: Agenda item | cabinet-rules, agenda-not-built, officer-from-sign-in |
| exec.cabinet.decision.action_assign | Assign an approved decision action | cabinetOffice | 4 | `cabinet.decision`, stage `notified`, step `assign-actions` | cabinet-rules, officer-from-sign-in, request-not-instruction |
| exec.cabinet.decision.correct | Correct a Cabinet decision record | cabinetOffice | 7 | `cabinet.decision`, stage `decided`, step `correct` | cabinet-rules, decision-in-engine, officer-from-sign-in |
| exec.cabinet.decision.distribution | Record controlled distribution of a decision | cabinetOffice | 6 | `cabinet.decision`, stage `decided`, step `publish` | cabinet-rules, officer-from-sign-in |
| exec.cabinet.decision.record | Record a Cabinet decision | cabinetOffice | 15 | `cabinet.decision`, stage `circulated`, step `record-decision`, document `minutes` | cabinet-rules, decision-in-engine, officer-from-sign-in |
| exec.cabinet.paper.fiscal_review | Record fiscal implications review | cabinetOffice | 8 | `cabinet.decision`, stage `legal-reviewed`, step `fiscal-review` | cabinet-rules, officer-from-sign-in, distinct-reviewers |
| exec.cabinet.paper.legal_review | Record legal and authority review | cabinetOffice | 7 | `cabinet.decision`, stage `validation`, step `legal-review` | cabinet-rules, officer-from-sign-in |
| exec.cabinet.paper.revise | Revise a Cabinet paper | cabinetOffice | 13 | `cabinet.decision`, stage `returned`, step `resubmit`, document `paper` | cabinet-rules |
| exec.presidency.correspondence.complaint | Complain about the handling of a petition | cabinetOffice | 4 and contact | waits: Service complaint review of the executive office | no-identity-demand, restricted-case, complaint-not-built |
| exec.presidency.correspondence.decision | Record the official response or routing decision | cabinetOffice | 8 | `exec.correspondence`, stage `pending-approval`, step `respond`, document `response-letter` | no-identity-demand, restricted-case, decision-in-engine, officer-from-sign-in |
| exec.presidency.correspondence.notice | Notify the submitter of the outcome | cabinetOffice | 5 | `exec.correspondence`, stage `responded`, document `response-letter` | no-identity-demand, restricted-case, delivery-not-recorded, officer-from-sign-in |
| exec.presidency.correspondence.referral | Refer correspondence to the responsible authority | cabinetOffice | 6 | `exec.correspondence`, stage `routed`, step `refer`, document `referral` | no-identity-demand, restricted-case, officer-from-sign-in, referral-case |
| exec.presidency.correspondence.submit | Send an official petition or correspondence | cabinetOffice | 9 and contact, representation | `exec.correspondence`, stage `received`, step `acknowledge`, document `correspondence` | no-identity-demand, restricted-case |
| exec.presidency.correspondence.supplement | Add information to an existing petition | cabinetOffice | 4 and representation | `exec.correspondence`, stage `acknowledged`, document `correspondence` | no-identity-demand, restricted-case |
| exec.presidency.correspondence.withdraw | Withdraw a petition | cabinetOffice | 3 and representation | `exec.correspondence`, stage `received`, step `withdraw` | no-identity-demand, restricted-case |
| treasury.cash_forecast.close | Close a forecasting period | finance | 4 | `treasury.cash-forecast`, stage `reviewed`, step `close` | officer-from-sign-in |
| treasury.cash_forecast.review | Review forecast assumptions and variance | finance | 5 | `treasury.cash-forecast`, stage `recorded`, step `review` | officer-from-sign-in |
| treasury.cash_forecast.revise | Revise a cash forecast | finance | 12 | `treasury.cash-forecast`, stage `submitted`, step `record`, document `forecast` | officer-from-sign-in, stated-amount |
| treasury.cash_forecast.submit | Submit an institutional cash forecast | finance | 12 | `treasury.cash-forecast`, stage `submitted`, step `record`, document `forecast` | officer-from-sign-in, stated-amount |
| treasury.cash_position.report | Report an authorized cash position | finance | 6 | waits: Cash position report | report-not-built, officer-from-sign-in, stated-amount |
| treasury.liquidity.response | Propose a liquidity response | finance | 6 | waits: Liquidity response | response-not-built, officer-from-sign-in, stated-amount |
| treasury.liquidity.shortfall | Report an expected liquidity shortfall | finance | 6 | waits: Liquidity shortfall case | shortfall-not-built, officer-from-sign-in, stated-amount |
| treasury.payment.approve | Approve or refuse a payment | finance | 8 | `treasury.payment`, stage `pending-approval`, step `approve` | decision-in-engine, officer-from-sign-in, separation-by-person |
| treasury.payment.cancel_request | Request cancellation of a payment | finance | 4 | `treasury.payment`, stage `instructed`, step `cancel` | officer-from-sign-in, separation-by-person |
| treasury.payment.correction | Correct payment metadata | finance | 5 | waits: Correction of payment metadata | correction-not-built, officer-from-sign-in, separation-by-person |
| treasury.payment.dispute | Dispute a payment or reconciliation result | finance | 5 | waits: Payment dispute | dispute-not-built, officer-from-sign-in, separation-by-person |
| treasury.payment.execute | Record execution by the payment system | finance | 7 | `treasury.payment`, stage `approved`, step `execute`, document `bank-confirmation` | officer-from-sign-in, stated-amount, separation-by-person |
| treasury.payment.reconcile | Reconcile payment against the treasury ledger | finance | 6 | `treasury.payment`, stage `executed`, step `reconcile`, document `statement` | officer-from-sign-in, stated-amount, separation-by-person |
| treasury.payment.refund | Request or record a refund | finance | 6 | waits: Refund of a government payment | refund-not-built, officer-from-sign-in, stated-amount, separation-by-person |
| treasury.payment.reject | Record a rejected or failed payment | finance | 5 | `treasury.payment`, stage `approved`, step `fail` | officer-from-sign-in, separation-by-person |
| treasury.payment.supporting_evidence | Supply missing payment evidence | finance | 5 | `treasury.payment`, stage `returned`, step `resubmit`, document `payment-evidence` | officer-from-sign-in, separation-by-person |
| treasury.payment.verify | Record payment verification | finance | 5 | `treasury.payment`, stage `instructed`, step `verify` | officer-from-sign-in, separation-by-person |

The five deviations every batch-8 form shares are `no-amounts-typed` (no
threshold, approval tier or limit, calendar, period, quorum or deadline typed:
each is the nation's approved rule or country rule set, a binding rule until
then), `config-impact`, `minimisation`, `evidence-requirement` and `scanning`.

**Separation of duties by person.** The payment forms follow the procedure's
steps: the verifier is not the official who instructed, the two approvers are
neither, execution is recorded by none of them and reconciliation by none of
the three (`distinctFrom` through `dualControlRefusal()`, comparing persons);
the platform minimum of two officials applies to every payment approval and
every payee account change (`lib/casework/dual-control-policy.ts`). The
approval tier is read from the approved `treasury.payment.approval-tiers`
rule (a `tiers` rule kind) and never typed; production refuses an approval
without it.

**Amounts.** An amount a person states (a request, a forecast, a proposed
ceiling or allocation, a bank's confirmation) is money with its currency,
named in the form's `amounts.stated` policy; the amount that binds is the one
the sealed decision and the register record. The current amount and available
balance of an appropriation are never asked: they are computed from the
register on every read (`balance-computed`).

**Cabinet.** A decision records its legal category, the law cited and the
actions it authorises; quorum and the vote are checked against the Cabinet
rules the nation adopts (`cabinet-rules`); an action for an institution the
whole government may not instruct is a request (`request-not-instruction`).
Petitions are restricted (stricter than the catalogue's "personal where
applicable") and ask no identity proof merely because they are addressed to
the executive (`no-identity-demand`).

**Batch 5's procurement forms.** ADM-PRC-018 (requisition), ADM-PRC-019
(evaluation) and ADM-PRC-020 (order) are linked to the institution's own
procurement templates (`proc.plan`, step `record`; `proc.tender`, steps
`evaluate` and `sign-contract`), deviation `procurement-procedure` in place of
`procedure-not-built`. The Part 3 procurement forms (125 rows) are not written
in this batch.

| Check | Where |
|---|---|
| Each contract quotes and meets every piece of its lines; typed, classed, registered rules only; nothing a law decides set; three channels; contract draft | `catalogue-contracts.test.ts` (per form) |
| Links by identity; owners are slots | `catalogue-contracts.test.ts` "links batch 8 to the I5 procedures by identity…" |
| Payments separated by person, approved by two | `catalogue-contracts.test.ts` "separates every payment stage by person…"; `lib/finance/finance.test.ts` |
| No threshold, tier or calendar typed; balances computed | `catalogue-contracts.test.ts` "types in no threshold, tier, limit or calendar…" |
| Cabinet actions within powers; petitions restricted | `catalogue-contracts.test.ts` "keeps Cabinet actions within each institution's powers…"; `lib/cabinet/cabinet.test.ts` |
| Procurement links of batch 5 | `catalogue-contracts.test.ts` "links payroll input, review and correction…"; `lib/procurement/procurement.test.ts` |
