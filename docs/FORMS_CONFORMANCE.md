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
production; no new batch of contracts is generated before the verified gap
report.

## 1. One contract, three sources

| Source | What is loaded | Where | Status |
|---|---|---|---|
| Specification, Parts 1–6 (`docs/INSTITUTIONAL_ARCHITECTURE_SPEC.md`) | The 16 JSON form contracts, word for word | `app/src/lib/forms/library/spec/*.json`, overlays in `library/definitions.ts` | Library drafts; 8 attach to reference procedures (drafts) |
| Field series Parts 1–4 (`docs/forms-catalogue/FIELD-SERIES-PARTS-01-02.md`, `-03-04.md`) | The 16 canonical field groups and the 10 complete `civicos.form-contract.v1` contracts of Parts 2 and 3 | `library/canonical/groups/*.json`, `library/canonical/forms/*.json`, loaded by `lib/forms/canonical.ts` | Library drafts |
| Supplement, contract envelope 1.0.0 (`docs/forms-catalogue/SUPPLEMENT-PARTS-14-22-AND-CONTRACTS-05-13.md` §1) | Every property of the envelope, mapped onto the same contract (`FormSpec.envelope`, `ContractField.ui`) | `lib/forms/envelope.ts` | The mapping is tested on the envelope example and on every domain block; the supplement's contracts are **not** loaded as a batch (owner's direction §4) |

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
- Part 3's other catalogue entries and Parts 5–7 forms beyond those above wait
  for their sector steps; Parts 5–7 add nothing that touches I1's forms except
  the binding exclusions in §5.
- Offline submission: a self-service draft is kept in the browser and resumed;
  there is no offline sync of field captures (acceptance P2-12, I6).
- Cryptographic signatures of declarations, contact verification, malware
  scanning of citizen uploads and citizen uploads themselves are integration
  points (integration register §20).
