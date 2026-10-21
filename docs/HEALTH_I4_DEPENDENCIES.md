# Health I4: requirements and dependency register

_Generated from `docs/requirements/health-i4.json` by `python3 -I app/scripts/requirements/health_i4.py .`; checked by `app/src/lib/requirements/health-i4.test.ts`. Do not edit by hand._

Owner's direction of 21 October 2026 (`docs/forms-catalogue/DIRECTION-2026-10-21-HEALTH-INTEGRATION.md`): track I4 as a dependency, not a completed capability, and finish this register before Health is called the first complete institution. **Health is not complete.** This register lists what it depends on; a dependency is "built and proven" only where a named test in an existing file proves it (the test fails otherwise).

**Summary:** 27 dependencies: 2 not built, 16 partial, 9 built and proven.

| Dependency | Status | Owner slot | Requirement rows | Release gate |
|---|---|---|---|---|
| `product-register`: The regulated product register (Part 6 §5.2) | built and proven | `medicinesRegulation` | 14 (FC6-5.2-01, FC6-5.2-02, FC6-5.2-03, FC6-5.2-04 …) | Joins lib/data/register-owners.ts with its owner and legal authority; the binding rule on medicines.registry.products stops failing; the batch-2 forms' gates pass in production |
| `public-product-view`: The public product check exposes only approved, publishable information | built and proven | `medicinesRegulation` | 3 (FC6-5.2-10, FC6-6.2-01, FC6-6.2-02) | Every output of the product register passes through publicProductView() (a scan test, as for parcels) |
| `procedure-marketing-authorisation`: Product procedure: marketing authorisation | partial | `medicinesRegulation` | 7 (HLT-MED-001, HLT-MED-002, HLT-MED-003, HLT-MED-004 …) | Procedure approved by a second official; each adopted form passes every publication gate in production (procedure link approved) |
| `procedure-variation`: Product procedure: variation | partial | `medicinesRegulation` | 1 (HLT-MED-008) | Procedure approved by a second official; each adopted form passes every publication gate in production (procedure link approved) |
| `procedure-renewal`: Product procedure: renewal | partial | `medicinesRegulation` | 1 (HLT-MED-007) | Procedure approved by a second official; each adopted form passes every publication gate in production (procedure link approved) |
| `procedure-suspension-withdrawal`: Product procedure: suspension and withdrawal | partial | `medicinesRegulation` | 1 (HLT-MED-009) | Procedure approved by a second official; each adopted form passes every publication gate in production (procedure link approved) |
| `procedure-recall`: Product procedure: recall | partial | `medicinesRegulation` | 4 (HLT-MED-017, HLT-MED-018, FC6-5.3-02, FC6-5.3-04) | Procedure approved by a second official; each adopted form passes every publication gate in production (procedure link approved) |
| `procedure-device-registration`: Product procedure: medical device registration | partial | `medicinesRegulation` | 2 (HLT-MED-019, CFG-MED-001) | Procedure approved by a second official; each adopted form passes every publication gate in production (procedure link approved) |
| `procedure-import-and-controlled`: Product procedure: import and controlled-medicine authorisation | partial | `medicinesRegulation` | 2 (HLT-MED-013, HLT-MED-014) | Procedure approved by a second official; each adopted form passes every publication gate in production (procedure link approved) |
| `procedure-safety-intake`: Product procedure: safety reports and device incidents (signals for assessment, never findings) | partial | `medicinesRegulation` | 3 (HLT-MED-015, HLT-MED-020, FC6-5.3-01) | Procedure approved by a second official; each adopted form passes every publication gate in production (procedure link approved) |
| `procedure-inspection`: Product procedure: good-practice inspection and corrective action | partial | `medicinesRegulation` | 3 (HLT-MED-011, HLT-MED-012, CFG-MED-003) | Procedure approved by a second official; each adopted form passes every publication gate in production (procedure link approved) |
| `procedure-reconsideration`: Product procedure: reconsideration or appeal | partial | `medicinesRegulation` | 1 (HLT-MED-023) | Procedure approved by a second official; each adopted form passes every publication gate in production (procedure link approved) |
| `register-types`: Organisations register types for manufacturers, importers and wholesalers | built and proven | `medicinesRegulation` | 2 (HLT-MED-010, FC6-5.2-04) | The register types exist with an approved permit mapping; HLT-MED-010 adopted in a procedure version |
| `exchange-product-status`: Exchange service: product status | built and proven | `medicinesRegulation` | 4 (HLT-MED-024, FC6-12-10, FC6-9.2-01, FC6-9.2-02) | Declared in the service directory and in returns-contract.test.ts; HLT-MED-024's procedure-link gate passes (its exchange service exists) |
| `exchange-hx-005`: Exchange service HX-005: recall notices and safety alerts | built and proven | `medicinesRegulation` | 3 (HX-005, FC6-5.3-02, FC6-9.2-01) | Service approved by two officials; deviation no-recall-exchange removed from HLT-MED-017 |
| `health-slots`: The medicines, controlled-substances and public-health responsibility slots | built and proven | `medicinesRegulation` | 6 (FC6-1-05, FC6-1-02, FC6-5-02, S2-A.10-08 …) | In production, no form passes the competent-authority gate on a provisional owner |
| `permit-mappings`: Permit authority mappings for product powers | built and proven | `medicinesRegulation` | 4 (CFG-MED-002, CFG-MED-003, FC6-11-02, FC6-5.2-09) | Every product decision step classified in lib/permits/decisions.ts |
| `forms-without-procedures`: The batch-1 and batch-2 forms with no procedure link | partial | `healthRegulation` | 30 (HLT-FAC-001, HLT-FAC-004, HLT-FAC-006, HLT-FAC-007 …) | Procedure link approved for each (the go-live gate) |
| `batch-1-adoption`: Adopting the linked batch-1 contracts into procedure versions (health.facility*, prof.*) | partial | `healthRegulation` | 28 (HLT-LIC-002, HLT-LIC-006, HLT-LIC-009, HLT-LIC-013 …) | Procedure link approved for each linked contract |
| `facility-register`: The facility register's role: standings in the organisations register, premises in the national facility register | partial | `healthRegulation` | 8 (S2-A.3-02, S2-C.2-12, S2-C.2-07, S2-C.2-08 …) | The facility directory rows met from records |
| `public-health-statistics`: The aggregate public-health return and its statistics exchange | partial | `publicHealth` | 13 (HLT-PH-015, HX-009, S2-A.3-05, S2-C.2-10 …) | HX-009 approved by two officials; the programme returns procedure approved |
| `public-health-programmes`: Public-health programme administration (administrative records and aggregates only) | not built | `publicHealth` | 29 (S2-A.3-04, S2-C.2-05, S2-C.2-16, S2-C.2-50 …) | Programme records built; contracts approved |
| `health-roles`: Roles scoped by facility, jurisdiction, task and data classification | partial | `healthRegulation` | 9 (S2-C.2-33, S2-C.2-34, S2-C.2-35, S2-C.2-36 …) | S2-C.2-42 met |
| `health-access-and-audit`: Health access control, exchange contracts, audit and recovery | partial | `healthRegulation` | 54 (FC6-intro-01, FC6-intro-04, FC6-1-07, FC6-1-10 …) | FC6-12-02 and FC6-12-13 met for the health records |
| `health-department-functions`: Department functions not yet represented (policy, logistics, budget, complaints, workforce counts) | not built | `healthRegulation` | 7 (S2-C.2-02, S2-C.2-06, S2-C.2-09, S2-C.2-11 …) | Each function has its record and procedure |
| `integration-controls`: Form identity, procedure-link states and the exclusion boundary | built and proven | `healthRegulation` | 2 (FC6-intro-05, FC6-10-01) | The identity and link checks run in every publication |
| `standalone-and-pilot`: Standalone Institutional Edition, portable export and the pilot exit gate | built and proven | `healthRegulation` | 21 (S0-intro-04, S1-1-01, S1-1.1-13, S1-13-10 …) | S6-I-11 exit gate |

## `product-register`: The regulated product register (Part 6 §5.2)

**Status: built and proven.** Owner slot `medicinesRegulation`.

**Requirement rows:** `FC6-5.2-01`, `FC6-5.2-02`, `FC6-5.2-03`, `FC6-5.2-04`, `FC6-5.2-05`, `FC6-5.2-06`, `FC6-5.2-07`, `FC6-5.2-08`, `FC6-5.2-09`, `FC6-5.2-11`, `FC6-5.2-12`, `FC6-5-02`, `FC6-12-07`, `FC6-13-04`

**What exists:**

- The register of medicines and medical devices: product records by version (every change a new version, status history, enforcement record), holder an organisation of the organisations register by its number, authorisation number, conditions and validity as the decision states, the attribute classes and the decision that approved each; written only by the product procedures' effects; full records read only by the medicines authority under canReadProduct(), every read in the access log; everyone else publicProductView(); in the register owners with owner slot medicinesRegulation; the forms' references to medicines.registry.products read it (decided records only) (`app/src/lib/health/products/register.ts`, `app/src/lib/health/products/procedures.ts`, `app/src/app/api/health-regulation/products/route.ts`, `app/src/lib/data/register-owners.ts`, `app/src/lib/auth/roles.ts`, `app/src/lib/forms/server.ts`)

**What is missing:**

- Nothing for this dependency.

**Contracts that depend on it:** `FIELD-SERIES-PARTS-05-07:HLT-MED-001@1`, `FIELD-SERIES-PARTS-05-07:HLT-MED-002@1`, `FIELD-SERIES-PARTS-05-07:HLT-MED-003@1`, `FIELD-SERIES-PARTS-05-07:HLT-MED-004@1`, `FIELD-SERIES-PARTS-05-07:HLT-MED-005@1`, `FIELD-SERIES-PARTS-05-07:HLT-MED-006@1`, `FIELD-SERIES-PARTS-05-07:HLT-MED-007@1`, `FIELD-SERIES-PARTS-05-07:HLT-MED-008@1`, `FIELD-SERIES-PARTS-05-07:HLT-MED-009@1`, `FIELD-SERIES-PARTS-05-07:HLT-MED-010@1`, `FIELD-SERIES-PARTS-05-07:HLT-MED-011@1`, `FIELD-SERIES-PARTS-05-07:HLT-MED-012@1`, `FIELD-SERIES-PARTS-05-07:HLT-MED-013@1`, `FIELD-SERIES-PARTS-05-07:HLT-MED-014@1`, `FIELD-SERIES-PARTS-05-07:HLT-MED-015@1`, `FIELD-SERIES-PARTS-05-07:HLT-MED-017@1`, `FIELD-SERIES-PARTS-05-07:HLT-MED-018@1`, `FIELD-SERIES-PARTS-05-07:HLT-MED-019@1`, `FIELD-SERIES-PARTS-05-07:HLT-MED-020@1`, `FIELD-SERIES-PARTS-05-07:HLT-MED-023@1`, `FIELD-SERIES-PARTS-05-07:HLT-MED-024@1`

**Access controls:**

- Read by the medicines authority under caseReadRefusal(); every read of a record holding personal data (a qualified person, a reporter) in the access log
- Commercially confidential content (dossier, composition, assessment, findings) restricted to the regulator
- Everyone else: publicProductView() only (public check, lists, exports, the twin, exchange services)

**Provenance:**

- A status derives only from the regulator's record (FC6-5.2-12), never from an import, inventory or procurement record (FC6-5.2-11)
- Every change is a new version written by a procedure effect, with the sealed decision, the law version and the mapping version; earlier versions kept

**Tests:**

- `app/src/lib/health/products/procedures.test.ts` "runs marketing authorisation to a sealed decision with four eyes and writes the product register only through its effect"
- `app/src/lib/health/products/procedures.test.ts` "keeps every version and takes a status only from a sealed decision: an application shows nothing, an import or inventory record cannot set one"
- `app/src/lib/health/products/procedures.test.ts` "answers the forms' product references from the register: a decided product by its number or authorisation number, never an application"
- `app/src/lib/casework/register-writes.test.ts` "lets only the procedure module (and the listed exceptions) import a changing function"
- `app/src/app/api/health-regulation/products/products-privacy.test.ts` "gives the full record to the medicines authority's officials only, and writes every read, allowed or refused, to the access log"

**Release gate:** Joins lib/data/register-owners.ts with its owner and legal authority; the binding rule on medicines.registry.products stops failing; the batch-2 forms' gates pass in production

## `public-product-view`: The public product check exposes only approved, publishable information

**Status: built and proven.** Owner slot `medicinesRegulation`.

**Requirement rows:** `FC6-5.2-10`, `FC6-6.2-01`, `FC6-6.2-02`

**What exists:**

- publicProductView(): only attributes recorded by an approved decision, listed in the nation's approved public information classification and of the public class; never the dossier, the assessment, findings or persons; enforcement only as approved and published notices; every output of the product register (lists, the one-product answer, the product.status service) passes through it; the classification ships empty and changes only by two officials citing the law (`app/src/lib/health/products/public.ts`, `app/src/lib/forms/library/catalogue-contracts/HLT-MED-024.json`, `app/src/lib/health/products/register.ts`)

**What is missing:**

- The nation's public information classification (ships empty): proposed citing the law and confirmed by a different official

**Contracts that depend on it:** `FIELD-SERIES-PARTS-05-07:HLT-MED-024@1`, `FIELD-SERIES-PARTS-05-07:HLT-MED-006@1`

**Access controls:**

- Public: the view only; the type has no field for anything never public

**Provenance:**

- The view names its source: the regulator's record and its version, and the classification version

**Tests:**

- `app/src/lib/health/products/public.test.ts` "never carries dossier content, personal data or unpublished enforcement records: %s"
- `app/src/lib/health/products/public.test.ts` "returns an attribute only when it is approved, public and listed"
- `app/src/lib/health/products/public.test.ts` "returns no attribute until the nation approves a classification that lists it"
- `app/src/lib/health/products/public.test.ts` "is the rule HLT-MED-024 names, and the I4 register and integration register point to it"
- `app/src/app/api/health-regulation/products/products-privacy.test.ts` "never carries confidential, restricted, personal or unpublished content in lists, the public answer, a refused full read, the exchange, the twin, the setup hub or the audit chain"

**Release gate:** Every output of the product register passes through publicProductView() (a scan test, as for parcels)

## `procedure-marketing-authorisation`: Product procedure: marketing authorisation

**Status: partial.** Owner slot `medicinesRegulation`.

**Requirement rows:** `HLT-MED-001`, `HLT-MED-002`, `HLT-MED-003`, `HLT-MED-004`, `HLT-MED-005`, `HLT-MED-006`, `CFG-MED-002`

**What exists:**

- The reference procedure medicines.authorisation (a draft the nation adapts and a second official approves): its stages, its two-official decision steps classified under the permit mapping, its effects on the product register; no period, fee or outcome list typed; its contracts linked by identity to their stages (procedure link: draft once installed) (`app/src/lib/health/products/procedures.ts`, `app/src/lib/casework/engine.ts`, `app/src/lib/permits/decisions.ts`)

**What is missing:**

- Adoption of the linked contracts in a version of the procedure the nation drafts, tested and approved by a second official (the link reads draft until then; nothing is approved by the platform)

**Contracts that depend on it:** `FIELD-SERIES-PARTS-05-07:HLT-MED-001@1`, `FIELD-SERIES-PARTS-05-07:HLT-MED-002@1`, `FIELD-SERIES-PARTS-05-07:HLT-MED-003@1`, `FIELD-SERIES-PARTS-05-07:HLT-MED-004@1`, `FIELD-SERIES-PARTS-05-07:HLT-MED-005@1`, `FIELD-SERIES-PARTS-05-07:HLT-MED-006@1`

**Access controls:**

- Cases of the medicines authority only (caseActRefusal(), caseReadRefusal()); decisions need "Can sign" there; administrators get no domain authority

**Provenance:**

- Each decision sealed with the law version, the mapping version and the rule versions it used; a status change is an act with evidence, time and reason

**Tests:**

- `app/src/lib/health/products/procedures.test.ts` "runs marketing authorisation to a sealed decision with four eyes and writes the product register only through its effect"
- `app/src/lib/forms/procedure-link.test.ts` "is draft for each batch-2 form the product procedures carry once they are in the register, never approved by it"

**Release gate:** Procedure approved by a second official; each adopted form passes every publication gate in production (procedure link approved)

## `procedure-variation`: Product procedure: variation

**Status: partial.** Owner slot `medicinesRegulation`.

**Requirement rows:** `HLT-MED-008`

**What exists:**

- The reference procedure medicines.variation (a draft the nation adapts and a second official approves): its stages, its two-official decision steps classified under the permit mapping, its effects on the product register; no period, fee or outcome list typed; its contracts linked by identity to their stages (procedure link: draft once installed) (`app/src/lib/health/products/procedures.ts`, `app/src/lib/casework/engine.ts`, `app/src/lib/permits/decisions.ts`)

**What is missing:**

- Adoption of the linked contracts in a version of the procedure the nation drafts, tested and approved by a second official (the link reads draft until then; nothing is approved by the platform)

**Contracts that depend on it:** `FIELD-SERIES-PARTS-05-07:HLT-MED-008@1`

**Access controls:**

- Cases of the medicines authority only (caseActRefusal(), caseReadRefusal()); decisions need "Can sign" there; administrators get no domain authority

**Provenance:**

- Each decision sealed with the law version, the mapping version and the rule versions it used; a status change is an act with evidence, time and reason

**Tests:**

- `app/src/lib/health/products/procedures.test.ts` "runs a variation, a renewal, a suspension with its published notice, reinstatement and withdrawal"
- `app/src/lib/forms/procedure-link.test.ts` "is draft for each batch-2 form the product procedures carry once they are in the register, never approved by it"

**Release gate:** Procedure approved by a second official; each adopted form passes every publication gate in production (procedure link approved)

## `procedure-renewal`: Product procedure: renewal

**Status: partial.** Owner slot `medicinesRegulation`.

**Requirement rows:** `HLT-MED-007`

**What exists:**

- The reference procedure medicines.renewal (a draft the nation adapts and a second official approves): its stages, its two-official decision steps classified under the permit mapping, its effects on the product register; no period, fee or outcome list typed; its contracts linked by identity to their stages (procedure link: draft once installed) (`app/src/lib/health/products/procedures.ts`, `app/src/lib/casework/engine.ts`, `app/src/lib/permits/decisions.ts`)

**What is missing:**

- Adoption of the linked contracts in a version of the procedure the nation drafts, tested and approved by a second official (the link reads draft until then; nothing is approved by the platform)

**Contracts that depend on it:** `FIELD-SERIES-PARTS-05-07:HLT-MED-007@1`

**Access controls:**

- Cases of the medicines authority only (caseActRefusal(), caseReadRefusal()); decisions need "Can sign" there; administrators get no domain authority

**Provenance:**

- Each decision sealed with the law version, the mapping version and the rule versions it used; a status change is an act with evidence, time and reason

**Tests:**

- `app/src/lib/health/products/procedures.test.ts` "runs a variation, a renewal, a suspension with its published notice, reinstatement and withdrawal"
- `app/src/lib/forms/procedure-link.test.ts` "is draft for each batch-2 form the product procedures carry once they are in the register, never approved by it"

**Release gate:** Procedure approved by a second official; each adopted form passes every publication gate in production (procedure link approved)

## `procedure-suspension-withdrawal`: Product procedure: suspension and withdrawal

**Status: partial.** Owner slot `medicinesRegulation`.

**Requirement rows:** `HLT-MED-009`

**What exists:**

- The reference procedure medicines.suspension (a draft the nation adapts and a second official approves): its stages, its two-official decision steps classified under the permit mapping, its effects on the product register; no period, fee or outcome list typed; its contracts linked by identity to their stages (procedure link: draft once installed) (`app/src/lib/health/products/procedures.ts`, `app/src/lib/casework/engine.ts`, `app/src/lib/permits/decisions.ts`)

**What is missing:**

- Adoption of the linked contracts in a version of the procedure the nation drafts, tested and approved by a second official (the link reads draft until then; nothing is approved by the platform)

**Contracts that depend on it:** `FIELD-SERIES-PARTS-05-07:HLT-MED-009@1`

**Access controls:**

- Cases of the medicines authority only (caseActRefusal(), caseReadRefusal()); decisions need "Can sign" there; administrators get no domain authority

**Provenance:**

- Each decision sealed with the law version, the mapping version and the rule versions it used; a status change is an act with evidence, time and reason

**Tests:**

- `app/src/lib/health/products/procedures.test.ts` "runs a variation, a renewal, a suspension with its published notice, reinstatement and withdrawal"
- `app/src/lib/forms/procedure-link.test.ts` "is draft for each batch-2 form the product procedures carry once they are in the register, never approved by it"

**Release gate:** Procedure approved by a second official; each adopted form passes every publication gate in production (procedure link approved)

## `procedure-recall`: Product procedure: recall

**Status: partial.** Owner slot `medicinesRegulation`.

**Requirement rows:** `HLT-MED-017`, `HLT-MED-018`, `FC6-5.3-02`, `FC6-5.3-04`

**What exists:**

- The reference procedure medicines.recall (a draft the nation adapts and a second official approves): notification, risk assessment, two-official decision with the recall class from the nation's classes (shipped empty), public notice, supply-chain notification (the holder's notice, a document of the case), completion verified; its effects on the product register; publishing the notice sends HX-005 to approved subscribers; no period, fee or outcome list typed; its contracts linked by identity (procedure link: draft once installed) (`app/src/lib/health/products/procedures.ts`, `app/src/lib/health/products/notices.ts`, `app/src/lib/casework/engine.ts`, `app/src/lib/permits/decisions.ts`)

**What is missing:**

- Adoption of the linked contracts in a version of the procedure the nation drafts, tested and approved by a second official (the link reads draft until then; nothing is approved by the platform)

**Contracts that depend on it:** `FIELD-SERIES-PARTS-05-07:HLT-MED-017@1`, `FIELD-SERIES-PARTS-05-07:HLT-MED-018@1`

**Access controls:**

- Cases of the medicines authority only (caseActRefusal(), caseReadRefusal()); decisions need "Can sign" there; administrators get no domain authority

**Provenance:**

- Each decision sealed with the law version, the mapping version and the rule versions it used; a status change is an act with evidence, time and reason

**Tests:**

- `app/src/lib/health/products/procedures.test.ts` "runs a recall from notification to verified completion, under the recall mapping"
- `app/src/lib/health/products/notices.test.ts` "reaches only subscribers two officials approved, only after the recall is decided and its notice published, each delivery recorded"
- `app/src/lib/forms/procedure-link.test.ts` "is draft for each batch-2 form the product procedures carry once they are in the register, never approved by it"

**Release gate:** Procedure approved by a second official; each adopted form passes every publication gate in production (procedure link approved)

## `procedure-device-registration`: Product procedure: medical device registration

**Status: partial.** Owner slot `medicinesRegulation`.

**Requirement rows:** `HLT-MED-019`, `CFG-MED-001`

**What exists:**

- The reference procedure medicines.device-registration (a draft the nation adapts and a second official approves): its stages, its two-official decision steps classified under the permit mapping, its effects on the product register; no period, fee or outcome list typed; its contracts linked by identity to their stages (procedure link: draft once installed) (`app/src/lib/health/products/procedures.ts`, `app/src/lib/casework/engine.ts`, `app/src/lib/permits/decisions.ts`)

**What is missing:**

- Adoption of the linked contracts in a version of the procedure the nation drafts, tested and approved by a second official (the link reads draft until then; nothing is approved by the platform)

**Contracts that depend on it:** `FIELD-SERIES-PARTS-05-07:HLT-MED-019@1`

**Access controls:**

- Cases of the medicines authority only (caseActRefusal(), caseReadRefusal()); decisions need "Can sign" there; administrators get no domain authority

**Provenance:**

- Each decision sealed with the law version, the mapping version and the rule versions it used; a status change is an act with evidence, time and reason

**Tests:**

- `app/src/lib/health/products/procedures.test.ts` "registers a medical device under the device registration mapping"
- `app/src/lib/forms/procedure-link.test.ts` "is draft for each batch-2 form the product procedures carry once they are in the register, never approved by it"

**Release gate:** Procedure approved by a second official; each adopted form passes every publication gate in production (procedure link approved)

## `procedure-import-and-controlled`: Product procedure: import and controlled-medicine authorisation

**Status: partial.** Owner slot `medicinesRegulation`.

**Requirement rows:** `HLT-MED-013`, `HLT-MED-014`

**What exists:**

- The reference procedures medicines.import-authorisation (an importer holding the medicine-importers standing, an authorised product, a quantity, a point of entry from the nation's list, shipped empty; the import authorisation register written only by its decision; customs learns only whether an authorisation is valid through the exchange service product.import-authorisation, which ships no approved caller and adds no customs power) and medicines.controlled (kept by the controlledSubstances slot: an organisation, a product and a quantity within the limits the nation's controlled-substances law sets, a country rule set changed by two officials citing the law and shipped unset; production refuses a schedule no adopted limit covers; never a named patient); two-official decisions classified under proposed, unapproved mappings; HLT-MED-013 and 014 linked by identity (procedure link: draft once installed) (`app/src/lib/health/products/procedures.ts`, `app/src/lib/health/products/imports.ts`, `app/src/lib/health/products/controlled.ts`, `app/src/lib/exchange/services.ts`, `app/src/lib/permits/decisions.ts`)

**What is missing:**

- The nation's points of entry, controlled schedules and activities (configured lists, shipped empty), its controlled-quantity limits (two officials citing the law), validity periods and fees
- The permit mappings medicine-import-authorisation and controlled-medicine-authorisation approved by the nation; the controlled-substances authority named
- The product.import-authorisation service approved for customs, per purpose, by two officials
- Adoption of the linked contracts in a version of the procedure the nation drafts, tested and approved by a second official (the link reads draft until then; nothing is approved by the platform)

**Contracts that depend on it:** `FIELD-SERIES-PARTS-05-07:HLT-MED-013@1`, `FIELD-SERIES-PARTS-05-07:HLT-MED-014@1`

**Access controls:**

- Cases of the medicines authority only (caseActRefusal(), caseReadRefusal()); decisions need "Can sign" there; administrators get no domain authority

**Provenance:**

- Each decision sealed with the law version, the mapping version and the rule versions it used; a status change is an act with evidence, time and reason

**Tests:**

- `app/src/lib/health/products/oversight.test.ts` "authorises an import for a licensed importer, an authorised product, a quantity and a point of entry; customs learns only whether it is valid"
- `app/src/lib/health/products/oversight.test.ts` "authorises controlled medicines for an organisation, a product and a quantity within the limits the nation adopts; never a named patient"
- `app/src/lib/health/products/oversight.test.ts` "classifies every decision step under its own proposed, unapproved mapping, and refuses each in production until the nation approves one"
- `app/src/lib/forms/procedure-link.test.ts` "is draft for each batch-2 form the product procedures carry once they are in the register, never approved by it"

**Release gate:** Procedure approved by a second official; each adopted form passes every publication gate in production (procedure link approved)

## `procedure-safety-intake`: Product procedure: safety reports and device incidents (signals for assessment, never findings)

**Status: partial.** Owner slot `medicinesRegulation`.

**Requirement rows:** `HLT-MED-015`, `HLT-MED-020`, `FC6-5.3-01`

**What exists:**

- The reference procedures medicines.safety-report and medicines.device-incident: product-level reports (no patient, clinical, reaction, outcome, age, sex or history field; the concern restricted with its hint; the reporter optional, restricted, never in a list, every case read in the access log), assessed by the assigned officer with reasons (never a score; no AI step), possible duplicates linked by an official and never merged; the assessment may refer the product to its own variation, suspension or recall case (the engine's referral, linked both ways) or lead to a safety alert decided by two officials and published as its own act, which HX-005 then sends; HLT-MED-015 and 020 linked by identity (`app/src/lib/health/products/procedures.ts`, `app/src/lib/health/products/register.ts`, `app/src/lib/casework/engine.ts`, `app/src/app/api/cases/[id]/route.ts`)

**What is missing:**

- The nation's concern, incident, setting and reporter kinds as approved lists, its reporting deadlines (unset)
- The product-safety-assessment mapping approved by the nation (CFG-MED-003)
- Adoption of the linked contracts in a version of the procedure the nation drafts, tested and approved by a second official (the link reads draft until then; nothing is approved by the platform)

**Contracts that depend on it:** `FIELD-SERIES-PARTS-05-07:HLT-MED-015@1`, `FIELD-SERIES-PARTS-05-07:HLT-MED-020@1`

**Access controls:**

- Cases of the medicines authority only (caseActRefusal(), caseReadRefusal()); decisions need "Can sign" there; administrators get no domain authority

**Provenance:**

- Each decision sealed with the law version, the mapping version and the rule versions it used; a status change is an act with evidence, time and reason

**Tests:**

- `app/src/lib/health/products/oversight.test.ts` "takes a %s about the product only, assessed by the assigned officer with reasons, and refers it to a recall case"
- `app/src/lib/health/products/oversight.test.ts` "links possible duplicates without merging them, and decides and publishes a safety alert with four eyes"
- `app/src/lib/health/products/oversight.test.ts` "classifies every decision step under its own proposed, unapproved mapping, and refuses each in production until the nation approves one"
- `app/src/lib/forms/procedure-link.test.ts` "is draft for each batch-2 form the product procedures carry once they are in the register, never approved by it"

**Release gate:** Procedure approved by a second official; each adopted form passes every publication gate in production (procedure link approved)

## `procedure-inspection`: Product procedure: good-practice inspection and corrective action

**Status: partial.** Owner slot `medicinesRegulation`.

**Requirement rows:** `HLT-MED-011`, `HLT-MED-012`, `CFG-MED-003`

**What exists:**

- HLT-MED-011 linked to the inspection step of the manufacturing licence (medicines.manufacturer); the reference procedure medicines.corrective-action (HLT-MED-012): a plan linked to a recorded inspection case of the medicines authority with its inspection report, revised and accepted by the regulator, whose acceptance starts the period the nation's rules set (a deadline shipped without its day count), progress recorded, completion verified and closed by two officials, or referred for enforcement (`app/src/lib/health/products/procedures.ts`, `app/src/lib/forms/library/catalogue-contracts/HLT-MED-011.json`, `app/src/lib/forms/library/catalogue-contracts/HLT-MED-012.json`)

**What is missing:**

- Inspections of authorisation applications (an inspection step in the authorisation procedures)
- Inspection and safety-reporting authority (CFG-MED-003) from the nation: the good-practice-corrective-action mapping approved, the corrective-action period set
- Adoption of the linked contracts in a version of the procedure the nation drafts, tested and approved by a second official (the link reads draft until then; nothing is approved by the platform)

**Contracts that depend on it:** `FIELD-SERIES-PARTS-05-07:HLT-MED-011@1`, `FIELD-SERIES-PARTS-05-07:HLT-MED-012@1`

**Access controls:**

- Cases of the medicines authority only (caseActRefusal(), caseReadRefusal()); decisions need "Can sign" there; administrators get no domain authority

**Provenance:**

- Each decision sealed with the law version, the mapping version and the rule versions it used; a status change is an act with evidence, time and reason

**Tests:**

- `app/src/lib/health/products/register-types.test.ts` "are changed only by the medicines authority, through the licence procedures' effects, after inspection of registered premises"
- `app/src/lib/health/products/oversight.test.ts` "tracks a corrective action plan to closure, linked to its inspection, against the period the nation sets"
- `app/src/lib/health/products/oversight.test.ts` "classifies every decision step under its own proposed, unapproved mapping, and refuses each in production until the nation approves one"
- `app/src/lib/forms/procedure-link.test.ts` "is draft for each batch-2 form the product procedures carry once they are in the register, never approved by it"

**Release gate:** Procedure approved by a second official; each adopted form passes every publication gate in production (procedure link approved)

## `procedure-reconsideration`: Product procedure: reconsideration or appeal

**Status: partial.** Owner slot `medicinesRegulation`.

**Requirement rows:** `HLT-MED-023`

**What exists:**

- The reference procedure medicines.reconsideration: internal reconsideration of a decision of the medicines procedures of the same authority, reviewed by an assigned official and decided by two officials, none of whom made or confirmed the decision reconsidered (compared by person through dual control; a declared interest recuses); uphold or set aside, the original procedure deciding again; the request period read from the appeal deadline of the nation's version of the original procedure (none ships); an appeal to a court recorded by reference only, worked by the judiciary; HLT-MED-023 linked by identity (`app/src/lib/health/products/procedures.ts`, `app/src/lib/data/dual-control.ts`, `app/src/lib/permits/decisions.ts`)

**What is missing:**

- The nation's review routes, request period and fee (unset); where its law names a separate review body, the mapping medicines-decision-reconsideration approved for it
- Adoption of the linked contracts in a version of the procedure the nation drafts, tested and approved by a second official (the link reads draft until then; nothing is approved by the platform)

**Contracts that depend on it:** `FIELD-SERIES-PARTS-05-07:HLT-MED-023@1`

**Access controls:**

- Cases of the medicines authority only (caseActRefusal(), caseReadRefusal()); decisions need "Can sign" there; administrators get no domain authority

**Provenance:**

- Each decision sealed with the law version, the mapping version and the rule versions it used; a status change is an act with evidence, time and reason

**Tests:**

- `app/src/lib/health/products/oversight.test.ts` "reconsiders a decision only by officials who neither made nor confirmed it; a court appeal stays with the judiciary, by reference"
- `app/src/lib/health/products/oversight.test.ts` "classifies every decision step under its own proposed, unapproved mapping, and refuses each in production until the nation approves one"
- `app/src/lib/forms/procedure-link.test.ts` "is draft for each batch-2 form the product procedures carry once they are in the register, never approved by it"

**Release gate:** Procedure approved by a second official; each adopted form passes every publication gate in production (procedure link approved)

## `register-types`: Organisations register types for manufacturers, importers and wholesalers

**Status: built and proven.** Owner slot `medicinesRegulation`.

**Requirement rows:** `HLT-MED-010`, `FC6-5.2-04`

**What exists:**

- Register types medicine-manufacturers, medicine-importers and medicine-wholesalers kept by the medicinesRegulation slot, each with a proposed (unapproved) permit type; their licence, renewal, suspension and revocation procedures (medicines.manufacturer, medicines.importer, medicines.wholesaler) change standings only through the organisation procedures' effects; HLT-MED-010 and HLT-MED-011 linked to the manufacturing licence (`app/src/lib/organisations/register.ts`, `app/src/lib/organisations/procedures.ts`, `app/src/lib/health/products/procedures.ts`)

**What is missing:**

- Nothing for this dependency.

**Contracts that depend on it:** `FIELD-SERIES-PARTS-05-07:HLT-MED-010@1`, `FIELD-SERIES-PARTS-05-07:HLT-MED-013@1`

**Access controls:**

- publicOrganisation() on lists and the public check; representatives only under canReadOrganisation()

**Provenance:**

- A standing changes only by the authority keeping that register type, through organisation procedure effects

**Tests:**

- `app/src/lib/health/products/register-types.test.ts` "are kept by the medicines authority slot, each with its own permit type, open to the public check"
- `app/src/lib/health/products/register-types.test.ts` "are changed only by the medicines authority, through the licence procedures' effects, after inspection of registered premises"

**Release gate:** The register types exist with an approved permit mapping; HLT-MED-010 adopted in a procedure version

## `exchange-product-status`: Exchange service: product status

**Status: built and proven.** Owner slot `medicinesRegulation`.

**Requirement rows:** `HLT-MED-024`, `FC6-12-10`, `FC6-9.2-01`, `FC6-9.2-02`

**What exists:**

- product.status in the service directory (owner medicinesRegulation, scope service:product.status): answers only publicProductView() of a decided record through callService(), for a purpose two officials approved for the caller (proposeIntegrationApproval / confirmIntegrationApproval); no caller ships approved; HLT-MED-024 names it (`app/src/lib/exchange/services.ts`, `app/src/lib/health/products/register.ts`, `app/src/lib/forms/library/catalogue-contracts/HLT-MED-024.json`)

**What is missing:**

- Its approval for each caller and purpose by two officials (the nation's act; none ships)

**Contracts that depend on it:** `FIELD-SERIES-PARTS-05-07:HLT-MED-024@1`

**Access controls:**

- Approved integrations only, per purpose; the answer is publicProductView() of the record

**Provenance:**

- Each answer from the regulator's record with a signed receipt (as the other services)

**Tests:**

- `app/src/lib/health/products/exchange.test.ts` "is declared in the directory, owned by the medicines authority, returning only the public view's fields"
- `app/src/lib/health/products/exchange.test.ts` "ships no approved caller, and answers an outside caller only for a purpose two officials approved for it"
- `app/src/lib/health/products/exchange.test.ts` "is the service HLT-MED-024 names, so its form needs no procedure and finds its service"
- `app/src/lib/forms/procedure-link.test.ts` "needs no procedure where an exchange service answers, but needs that service"

**Release gate:** Declared in the service directory and in returns-contract.test.ts; HLT-MED-024's procedure-link gate passes (its exchange service exists)

## `exchange-hx-005`: Exchange service HX-005: recall notices and safety alerts

**Status: built and proven.** Owner slot `medicinesRegulation`.

**Requirement rows:** `HX-005`, `FC6-5.3-02`, `FC6-9.2-01`

**What exists:**

- The exchange service product.safety-notice (HX-005): when a recall or safety alert is decided by a sealed decision and its public notice published, one notice carrying only publicProductView() of the product, the kind, the recall class, the case reference, the decided and published dates and whether the holder's supply-chain notice is recorded is queued for each integration two officials approved for the service and a purpose (none ships); collected through callService() for an approved purpose, each delivery recorded with its purpose and exchange receipt; the recall procedure's supply-chain-notice document stays the holder's notice; HLT-MED-017's deviation no-recall-exchange removed (`app/src/lib/health/products/notices.ts`, `app/src/lib/exchange/services.ts`, `app/src/lib/health/products/procedures.ts`, `app/src/lib/forms/library/catalogue-contracts/HLT-MED-017.json`)

**What is missing:**

- Each subscriber (institutions, facilities, pharmacies) approved with its purpose by two officials (the nation's act; none ships)
- Push delivery to a subscriber's endpoint (today each subscriber collects its queued notices)

**Contracts that depend on it:** `FIELD-SERIES-PARTS-05-07:HLT-MED-017@1`, `FIELD-SERIES-PARTS-05-07:HLT-MED-018@1`, `FIELD-SERIES-PARTS-05-07:HLT-MED-015@1`

**Access controls:**

- Only approved recipients; the notice carries the published wording, never grounds or reporters

**Provenance:**

- Sent only after the recall decision is sealed and the notice published; each delivery receipted

**Tests:**

- `app/src/lib/health/products/notices.test.ts` "is declared in the directory, owned by the medicines authority, ships with no approved subscriber, and HLT-MED-017 names it"
- `app/src/lib/health/products/notices.test.ts` "reaches only subscribers two officials approved, only after the recall is decided and its notice published, each delivery recorded"
- `app/src/lib/health/products/notices.test.ts` "never carries personal data, grounds, a completion, a report or an official in any payload: recalls and safety alerts"

**Release gate:** Service approved by two officials; deviation no-recall-exchange removed from HLT-MED-017

## `health-slots`: The medicines, controlled-substances and public-health responsibility slots

**Status: built and proven.** Owner slot `medicinesRegulation`.

**Requirement rows:** `FC6-1-05`, `FC6-1-02`, `FC6-5-02`, `S2-A.10-08`, `S2-A.10-09`, `FC6-11-01`

**What exists:**

- Three optional slots, shipped empty, set like every slot (setup, /api/sovereign/authorities, authorityFor()), shown in Who is responsible and the setup hub; provisionalOwner() stands the health regulator (or the next slot) in for an empty one, marked provisional, refused as competent in production and never confirmable as the competent authority (`app/src/lib/nation/deployment.ts`, `app/src/lib/forms/publication.ts`, `app/src/lib/onboarding/status.ts`, `app/src/components/features/ResponsibleAuthorities.tsx`)

**What is missing:**

- The nation names its bodies (a country decision, not the platform's)
- Permit types for product powers mapped to them (permit-mappings)

**Contracts that depend on it:** `FIELD-SERIES-PARTS-05-07:HLT-MED-001@1`, `FIELD-SERIES-PARTS-05-07:HLT-MED-002@1`, `FIELD-SERIES-PARTS-05-07:HLT-MED-003@1`, `FIELD-SERIES-PARTS-05-07:HLT-MED-004@1`, `FIELD-SERIES-PARTS-05-07:HLT-MED-005@1`, `FIELD-SERIES-PARTS-05-07:HLT-MED-006@1`, `FIELD-SERIES-PARTS-05-07:HLT-MED-007@1`, `FIELD-SERIES-PARTS-05-07:HLT-MED-008@1`, `FIELD-SERIES-PARTS-05-07:HLT-MED-009@1`, `FIELD-SERIES-PARTS-05-07:HLT-MED-010@1`, `FIELD-SERIES-PARTS-05-07:HLT-MED-011@1`, `FIELD-SERIES-PARTS-05-07:HLT-MED-012@1`, `FIELD-SERIES-PARTS-05-07:HLT-MED-013@1`, `FIELD-SERIES-PARTS-05-07:HLT-MED-014@1`, `FIELD-SERIES-PARTS-05-07:HLT-MED-015@1`, `FIELD-SERIES-PARTS-05-07:HLT-MED-017@1`, `FIELD-SERIES-PARTS-05-07:HLT-MED-018@1`, `FIELD-SERIES-PARTS-05-07:HLT-MED-019@1`, `FIELD-SERIES-PARTS-05-07:HLT-MED-020@1`, `FIELD-SERIES-PARTS-05-07:HLT-MED-023@1`, `FIELD-SERIES-PARTS-05-07:HLT-MED-024@1`, `FIELD-SERIES-PARTS-05-07:HLT-PH-015@1`

**Access controls:**

- An institution named here gets the domain authority of the slot; a stand-in acts only provisionally and never confirms its own competence

**Provenance:**

- Who is responsible changes after setup only through /api/sovereign/authorities (cited, a different official confirms); every version kept

**Tests:**

- `app/src/lib/nation/health-slots.test.ts` "are slots of the deployment profile, optional and shipped empty, set through the same profile check"
- `app/src/lib/nation/health-slots.test.ts` "stand in provisionally, down the chain, and say so"
- `app/src/lib/nation/health-slots.test.ts` "show the provisional owner on the publication and pass the competent-authority gate only outside production"
- `app/src/lib/nation/health-slots.test.ts` "never let anyone confirm a provisional owner as the competent authority"
- `app/src/lib/nation/health-slots.test.ts` "appear in the setup hub: provisional owners are not done in production"

**Release gate:** In production, no form passes the competent-authority gate on a provisional owner

## `permit-mappings`: Permit authority mappings for product powers

**Status: built and proven.** Owner slot `medicinesRegulation`.

**Requirement rows:** `CFG-MED-002`, `CFG-MED-003`, `FC6-11-02`, `FC6-5.2-09`

**What exists:**

- Proposed, unapproved mappings citing nothing: medicine-marketing-authorisation, medical-device-registration, product-recall, the manufacturing, import and wholesale licences, medicine-import-authorisation, good-practice-corrective-action, product-safety-assessment and medicines-decision-reconsideration (lead medicinesRegulation), controlled-medicine-authorisation (lead controlledSubstances); every product decision step classified in lib/permits/decisions.ts and refused in production until a mapping is approved; sealed decisions record the mapping version (`app/src/lib/permits/authority.ts`, `app/src/lib/permits/decisions.ts`)

**What is missing:**

- The nation approves each mapping (drafted by one administrator, approved by another, citing the law)

**Contracts that depend on it:** `FIELD-SERIES-PARTS-05-07:HLT-MED-006@1`, `FIELD-SERIES-PARTS-05-07:HLT-MED-007@1`, `FIELD-SERIES-PARTS-05-07:HLT-MED-008@1`, `FIELD-SERIES-PARTS-05-07:HLT-MED-009@1`, `FIELD-SERIES-PARTS-05-07:HLT-MED-013@1`, `FIELD-SERIES-PARTS-05-07:HLT-MED-014@1`, `FIELD-SERIES-PARTS-05-07:HLT-MED-017@1`, `FIELD-SERIES-PARTS-05-07:HLT-MED-019@1`

**Access controls:**

- Administrators draft and approve mappings; the power itself is exercised only by the mapped institution's signers

**Provenance:**

- Every mapping version kept, citing the law; sealed decisions record the mapping version

**Tests:**

- `app/src/lib/health/products/procedures.test.ts` "ships unapproved mappings citing nothing, and refuses every product decision in production until one is approved"
- `app/src/lib/health/products/procedures.test.ts` "runs a recall from notification to verified completion, under the recall mapping"
- `app/src/lib/health/products/procedures.test.ts` "registers a medical device under the device registration mapping"
- `app/src/lib/health/products/oversight.test.ts` "classifies every decision step under its own proposed, unapproved mapping, and refuses each in production until the nation approves one"

**Release gate:** Every product decision step classified in lib/permits/decisions.ts

## `forms-without-procedures`: The batch-1 and batch-2 forms with no procedure link

**Status: partial.** Owner slot `healthRegulation`.

**Requirement rows:** `HLT-FAC-001`, `HLT-FAC-004`, `HLT-FAC-006`, `HLT-FAC-007`, `HLT-FAC-009`, `HLT-LIC-007`, `HLT-LIC-008`, `HLT-LIC-010`, `HLT-PH-015`, `HLT-MED-001`, `HLT-MED-002`, `HLT-MED-003`, `HLT-MED-004`, `HLT-MED-005`, `HLT-MED-006`, `HLT-MED-007`, `HLT-MED-008`, `HLT-MED-009`, `HLT-MED-010`, `HLT-MED-011`, `HLT-MED-012`, `HLT-MED-013`, `HLT-MED-014`, `HLT-MED-015`, `HLT-MED-017`, `HLT-MED-018`, `HLT-MED-019`, `HLT-MED-020`, `HLT-MED-023`, `HLT-MED-024`

**What exists:**

- Each contract as a library draft naming the stage it is intended for; its procedure link computed from the package register (missing), failing the go-live gate; all 20 batch-2 contracts that need a procedure now name one (draft once installed); only HLT-MED-024 names none, answered by product.status (`app/src/lib/forms/procedure-link.ts`, `app/src/lib/forms/publication.ts`, `app/src/lib/health/products/procedures.ts`)

**What is missing:**

- The procedures named in the list below (forms_without_procedure in health-i4.json): batch 1's establishment approval, follow-up, variation, closure, complaints, good standing, amendment and interim restriction

**Access controls:**

- As each procedure's institution

**Provenance:**

- Contracts are adopted only in a procedure version a second official approves

**Tests:**

- `app/src/lib/forms/procedure-link.test.ts` "is missing for every form without a procedure (batch-2 forms no product procedure carries, batch-1 forms without one), and that fails the go-live gate"
- `app/src/lib/forms/procedure-link.test.ts` "needs no procedure where an exchange service answers, but needs that service"
- `app/src/lib/forms/procedure-link.test.ts` "is draft for each batch-2 form the product procedures carry once they are in the register, never approved by it"
- To write: Each batch-1 procedure's own test

**Release gate:** Procedure link approved for each (the go-live gate)

## `batch-1-adoption`: Adopting the linked batch-1 contracts into procedure versions (health.facility*, prof.*)

**Status: partial.** Owner slot `healthRegulation`.

**Requirement rows:** `HLT-LIC-002`, `HLT-LIC-006`, `HLT-LIC-009`, `HLT-LIC-013`, `S2-A.10-01`, `S2-A.10-02`, `S2-A.10-03`, `S2-A.10-04`, `S2-A.10-05`, `S2-A.10-06`, `S2-A.10-07`, `S2-A.3-03`, `S2-C.2-03`, `S2-C.2-04`, `S2-C.2-14`, `S2-C.2-22`, `S2-C.2-23`, `S2-C.2-24`, `S2-C.9-10`, `FC6-13-05`, `FC6-10-29`, `HLT-INS-007`, `FCS6-intro-43`, `FCS6-intro-44`, `FCS6-intro-45`, `FCS6-intro-46`, `FCS6-intro-47`, `FCS6-intro-48`

**What exists:**

- Reference procedures health.facility, health.facility-renewal, health.facility-suspension, health.facility-revocation, prof.registration, prof.renewal and prof.fitness (drafts), carrying the specification's forms; each linked batch-1 contract names its procedure, stage, step and document; once the procedure is in the register the link reads draft (`app/src/lib/health/procedures.ts`, `app/src/lib/professions/procedures.ts`, `app/src/lib/forms/procedure-link.ts`)

**What is missing:**

- A new version of each procedure carrying the batch contract, drafted by the regulator, tested and approved by a second official (link: approved)

**Access controls:**

- Facility cases by the health regulator; professional cases by the regulator the professions register names

**Provenance:**

- The case keeps the form, declaration and evidence-policy versions it was submitted under

**Tests:**

- `app/src/lib/forms/catalogue-contracts.test.ts` "belongs to its reference procedure where one exists, else names the stage it waits for"
- `app/src/lib/forms/procedure-link.test.ts` "is draft for a linked batch-1 form once its reference procedure is in the register, until a version carries the contract"
- `app/src/lib/health/procedures.test.ts` "licenses a clinic after inspection of its registered premises, then takes its aggregate capacity return; no patient field exists"
- To write: Adoption test per procedure: the new version carries the contract by identity and its link reads approved

**Release gate:** Procedure link approved for each linked contract

## `facility-register`: The facility register's role: standings in the organisations register, premises in the national facility register

**Status: partial.** Owner slot `healthRegulation`.

**Requirement rows:** `S2-A.3-02`, `S2-C.2-12`, `S2-C.2-07`, `S2-C.2-08`, `S2-C.2-43`, `S2-C.2-44`, `S2-C.2-45`, `S2-C.2-48`

**What exists:**

- A facility's licence is a standing in the health-facilities (or pharmacies) register of the organisations register; its premises are published registered sites of the national facility register (lib/data/facilities.ts), checked against the map; the licensing procedure refuses premises that are not (`app/src/lib/organisations/register.ts`, `app/src/lib/data/facilities.ts`, `app/src/lib/health/procedures.ts`)

**What is missing:**

- Authorised services and verification date on the standing (S2-C.2-12)
- Inspection and corrective-action status in the twin from records (S2-C.2-48)

**Contracts that depend on it:** `FIELD-SERIES-PARTS-05-07:HLT-FAC-001@1`, `FIELD-SERIES-PARTS-05-07:HLT-FAC-002@1`, `FIELD-SERIES-PARTS-05-07:HLT-FAC-005@1`, `FIELD-SERIES-PARTS-05-07:HLT-FAC-006@1`, `FIELD-SERIES-PARTS-05-07:HLT-FAC-007@1`, `FIELD-SERIES-PARTS-05-07:HLT-FAC-010@1`

**Access controls:**

- publicOrganisation() on the public check; restricted sites generalised by viewFacility()

**Provenance:**

- Sites recorded by the owning institution, published by a second official, versions kept; never seeded

**Tests:**

- `app/src/lib/health/procedures.test.ts` "refuses premises that are not published registered sites, and the education authority cannot license a clinic"
- `app/src/lib/data/facilities.test.ts` "places a site from its position: region and district worked out from the map"
- To write: Standing carries authorised services and the last verification date

**Release gate:** The facility directory rows met from records

## `public-health-statistics`: The aggregate public-health return and its statistics exchange

**Status: partial.** Owner slot `publicHealth`.

**Requirement rows:** `HLT-PH-015`, `HX-009`, `S2-A.3-05`, `S2-C.2-10`, `S2-C.2-17`, `S2-C.2-49`, `FC6-4.3-04`, `FC6-4.3-05`, `FC6-4.3-06`, `FC6-4.3-07`, `FC6-4.3-09`, `FC6-4.2-09`, `FC6-4.2-10`

**What exists:**

- Aggregate capacity returns of licensed facilities (versioned, marked reported, corrections as new versions, no patient field); HLT-PH-015's contract (counts by area and period, each count marked, small cells protected by the nation's threshold as a binding rule); owned by the publicHealth slot, provisionally the health regulator (`app/src/lib/health/register.ts`, `app/src/app/api/health-regulation/route.ts`, `app/src/lib/forms/library/catalogue-contracts/HLT-PH-015.json`)

**What is missing:**

- The programme returns store (indicators and programmes the nation approves; none ships)
- A statistics exchange (HX-009) to the authorised statistics service, approved by two officials
- Small-cell suppression applied before any publication or exchange

**Contracts that depend on it:** `FIELD-SERIES-PARTS-05-07:HLT-PH-015@1`

**Access controls:**

- Counts only; no person anywhere; exchange only for an approved purpose

**Provenance:**

- Each count marked counted, estimated, incomplete or not available; a missing report is never a zero; corrections kept as new versions

**Tests:**

- `app/src/app/api/health-regulation/route.test.ts` "takes returns only from the health regulator, refuses anything that is not an aggregate count"
- `app/src/lib/forms/catalogue-contracts.test.ts` "keeps the public-health return to counts: no person, by area and period, small cells protected by the nation's threshold"
- To write: Statistics exchange test: suppressed cells never leave; only an approved purpose

**Release gate:** HX-009 approved by two officials; the programme returns procedure approved

## `public-health-programmes`: Public-health programme administration (administrative records and aggregates only)

**Status: not built.** Owner slot `publicHealth`.

**Requirement rows:** `S2-A.3-04`, `S2-C.2-05`, `S2-C.2-16`, `S2-C.2-50`, `HLT-PH-011`, `HLT-PH-014`, `CFG-PH-001`, `CFG-PH-002`, `CFG-PH-003`, `FC6-4-02`, `FC6-4.2-01`, `FC6-4.2-02`, `FC6-4.2-03`, `FC6-4.2-04`, `FC6-4.2-05`, `FC6-4.2-07`, `FC6-4.2-08`, `FC6-4.2-11`, `FC6-4.3-02`, `FC6-4.3-03`, `FC6-4.3-08`, `HLT-PUB-005`, `FCS6-intro-29`, `FCS6-intro-30`, `FCS6-intro-31`, `FCS6-intro-32`, `FCS6-intro-33`, `FCS6-intro-34`, `FCS6-intro-35`

**What exists:**

- The binding scope: no individual case, contact, laboratory or vaccination record; the transitions register for a declared emergency (`docs/requirements/form-scope.json`, `app/src/lib/forms/scope.ts`)

**What is missing:**

- Programme records (identifier, approved eligibility, coverage definition, budget reference, reporting period)
- Contracts for HLT-PH-011 and HLT-PH-014 (a later batch the owner approves)
- Intervention authority rules (CFG-PH-003), from the nation

**Access controls:**

- Programme administrators of the public-health authority; identifiable outbreak data never held (scope)

**Provenance:**

- Reported, suspected, confirmed and modelled kept apart (FC6-4-02, gate FC6-12-06)

**Tests:**

- To write: Programme register test; scope test that no individual public-health record can be drafted

**Release gate:** Programme records built; contracts approved

## `health-roles`: Roles scoped by facility, jurisdiction, task and data classification

**Status: partial.** Owner slot `healthRegulation`.

**Requirement rows:** `S2-C.2-33`, `S2-C.2-34`, `S2-C.2-35`, `S2-C.2-36`, `S2-C.2-37`, `S2-C.2-38`, `S2-C.2-40`, `S2-C.2-41`, `S2-C.2-42`

**What exists:**

- One rule set: Administrator, Can sign, Officer, Auditor per institution; case permissions by institution, sensitivity and assignment (`app/src/lib/auth/roles.ts`)

**What is missing:**

- Scoping by facility, jurisdiction and task (S2-C.2-42)

**Access controls:**

- roles.ts is the only place that decides

**Provenance:**

- Every act names the official and the office acted under

**Tests:**

- To write: Role test: an inspector acts only on assigned facilities in their jurisdiction

**Release gate:** S2-C.2-42 met

## `health-access-and-audit`: Health access control, exchange contracts, audit and recovery

**Status: partial.** Owner slot `healthRegulation`.

**Requirement rows:** `FC6-intro-01`, `FC6-intro-04`, `FC6-1-07`, `FC6-1-10`, `FC6-9-02`, `FC6-9-03`, `FC6-9.1-01`, `FC6-9.1-02`, `FC6-9.1-03`, `FC6-9.1-04`, `FC6-9.1-05`, `FC6-9.1-07`, `FC6-9.1-08`, `FC6-9.1-09`, `FC6-9.1-10`, `FC6-10-01`, `FC6-10-03`, `FC6-10-04`, `FC6-10-05`, `FC6-10-06`, `FC6-10-07`, `FC6-10-08`, `FC6-10-09`, `FC6-10-10`, `FC6-10-11`, `FC6-10-12`, `FC6-10-13`, `FC6-10-14`, `FC6-10-15`, `FC6-10-16`, `FC6-10-17`, `FC6-10-18`, `FC6-10-19`, `FC6-10-21`, `FC6-10-22`, `FC6-10-23`, `FC6-10-24`, `FC6-10-25`, `FC6-10-28`, `FC6-10-30`, `FC6-10-31`, `FC6-10-32`, `FC6-10-33`, `FC6-12-02`, `FC6-12-09`, `FC6-12-13`, `FC6-13-06`, `FC6-13-08`, `FC6-13-09`, `FC6-13-10`, `FCS6-intro-01`, `FCS6-intro-55`, `FCS6-intro-56`, `S2-A.3-01`

**What exists:**

- The access log (every read of personal data), refusals logged, the audit chain, encrypted verified backups, exchange services approved per purpose (`app/src/lib/records/access-log.ts`, `app/src/lib/records/refusal-log.ts`, `app/src/lib/data/backups.ts`, `app/src/lib/exchange/services.ts`)

**What is missing:**

- Purpose codes on every restricted health read (FC6-12-02)
- Health record metadata on each health record type (FC6-10-03 … 14)

**Access controls:**

- Administrators do not read the access log; reading it is logged

**Provenance:**

- Audit chain and access log hashed; restore preserves them

**Tests:**

- To write: Health access test: each restricted read carries a purpose and an access-log entry

**Release gate:** FC6-12-02 and FC6-12-13 met for the health records

## `health-department-functions`: Department functions not yet represented (policy, logistics, budget, complaints, workforce counts)

**Status: not built.** Owner slot `healthRegulation`.

**Requirement rows:** `S2-C.2-02`, `S2-C.2-06`, `S2-C.2-09`, `S2-C.2-11`, `S2-C.2-15`, `S2-C.2-46`, `S2-C.2-47`

**What exists:**

- Complaint forms as library drafts (HLT-FAC-009, HLT-LIC-008) and the referral procedure template (`app/src/lib/casework/referral.ts`)

**What is missing:**

- Supply-item records and logistics; budget, procurement and grants (plan I5); complaint intake procedures; workforce counts from the professions register

**Contracts that depend on it:** `FIELD-SERIES-PARTS-05-07:HLT-FAC-009@1`, `FIELD-SERIES-PARTS-05-07:HLT-LIC-008@1`

**Access controls:**

- Administrative records only

**Provenance:**

- Counts derive from records, never typed

**Tests:**

- To write: Complaint intake test; workforce count from the register

**Release gate:** Each function has its record and procedure

## `integration-controls`: Form identity, procedure-link states and the exclusion boundary

**Status: built and proven.** Owner slot `healthRegulation`.

**Requirement rows:** `FC6-intro-05`, `FC6-10-01`

**What exists:**

- formIdentity() (catalogue + form ID + version) for every lookup, approval and publication; ambiguous bare IDs refused; procedure-link states computed from the package register; the HLT-MED-004 boundary and the thirteen other duplicate IDs held apart (`app/src/lib/forms/identity.ts`, `app/src/lib/forms/procedure-link.ts`, `app/src/lib/forms/publication.ts`, `app/src/lib/forms/page-data.ts`)

**What is missing:**

- Nothing for this dependency.

**Contracts that depend on it:** `FIELD-SERIES-PARTS-05-07:HLT-MED-004@1`

**Access controls:**

- Approvals are acts of signed-in officials bound to identity and contract hash

**Provenance:**

- Approvals saved before identities were kept take the identity of the version they were given on

**Tests:**

- `app/src/lib/forms/catalogue-identity.test.ts` "keeps the excluded entry blocked: no contract, never drafted, nothing to publish"
- `app/src/lib/forms/catalogue-identity.test.ts` "evaluates the allowed entry on its own: allowed, a contract draft, its procedure missing"
- `app/src/lib/forms/catalogue-identity.test.ts` "carries no patient-specific or dispensing field: the scope words and an explicit list"
- `app/src/lib/forms/catalogue-identity.test.ts` "cannot be substituted through an approval record: an act counts only for the identity it was given on"
- `app/src/lib/forms/catalogue-identity.test.ts` "a bare ID is refused with both candidates, never resolved to one: in the library, the page and the API"
- `app/src/lib/forms/procedure-link.test.ts` "moves draft → under review → approved only as the register changes"

**Release gate:** The identity and link checks run in every publication

## `standalone-and-pilot`: Standalone Institutional Edition, portable export and the pilot exit gate

**Status: built and proven.** Owner slot `healthRegulation`.

**Requirement rows:** `S0-intro-04`, `S1-1-01`, `S1-1.1-13`, `S1-13-10`, `S2-B-03`, `S3-G-18`, `S5-D-02`, `S5-D-03`, `S5-L-01`, `S6-I-10`, `S6-I-11`, `S6-I-14`, `S6-I-15`, `S6-I-16`, `S6-I-17`, `S6-I-18`, `S6-I-19`, `S6-I-20`, `S6-I-21`, `S6-K-15`, `S6-L-06`

**What exists:**

- Installation modes, the deployment profile, backups and the constitutional profile (`app/src/lib/ops/mode.ts`, `app/src/lib/nation/deployment.ts`)
- The Institutional Edition: recorded in the deployment profile (setup, afterwards proposed citing the law and confirmed by a different official through policy-change.ts; none ships); it names the institutions and modules it runs, and the registers and procedures follow from them; a procedure of an institution outside it opens no case, an exchange service another institution owns answers "not connected" (503, a receipt, no answer field), a step that needs another register (an education-register qualification) pauses with the reason (`app/src/lib/nation/edition.ts`, `app/src/lib/data/store/sovereign.ts`, `app/src/app/api/sovereign/edition/route.ts`, `app/src/lib/casework/engine.ts`, `app/src/lib/exchange/services.ts`, `app/src/lib/professions/register.ts`)
- The portable export: one institution's registers, procedures, cases, sealed decisions (never re-sealed), documents and its audit-chain and access-log segments (other institutions' entries only as links: sequence and hashes) with the trust list, sealed through key custody like a backup, proposed by its administrator and confirmed by a different official who can sign there (never set going from whole-government scope for an independent institution), in the audit chain and the access log; re-imported into an empty installation by two administrators with every record identifier unchanged; verified offline (scripts/verify-institution-export.mjs runs the platform's own audit, access-log, seal and trust-list checks with no server) (`app/src/lib/portability/export.ts`, `app/src/lib/portability/verify.ts`, `app/src/lib/portability/import.ts`, `app/src/lib/portability/evidence.ts`, `app/src/lib/backup/archive.ts`, `app/scripts/verify-institution-export.mjs`, `app/src/app/api/org/ministries/[id]/export/route.ts`, `app/src/app/api/platform/institution-import/route.ts`)
- The pilot exit gate (S6-I-11), computed from the records each time, never a status field: approved procedures in force, completed cases that are not samples per procedure, sealed decisions verifying against approved (never sample) seal keys, decisions under a mapping in force, the audit chain verifying, access-log reads of each case, the signed-in officials who acted; not met in a demonstration, with exactly what is missing; on the onboarding hub (track pilot) and the health regulation console (Pilot exit gate tab) (`app/src/lib/pilot/exit-gate.ts`, `app/src/app/api/pilot/exit-gate/route.ts`, `app/src/lib/onboarding/status.ts`, `app/src/components/features/PilotExitGate.tsx`)

**What is missing:**

- The gate met in a production installation with the nation's own records: a deployment act (authorised officials completing real cases), never shipped or set by the platform
- Certificates, recall-notice deliveries and capacity returns of organisations outside the institution's registers are not yet in the export (integration register 20.43)
- Export and import are tested in memory; the file, supabase and postgres state modes are not yet exercised by a test (integration register 20.42)
- Choosing the pilot (S6-I-14 to S6-I-21) and appeals run end to end (S2-B-03, S6-K-15) stay with their own rows

**Access controls:**

- Export: proposed by an administrator of the institution, confirmed by a different official who can sign there; download by its administrators and signatories, logged as an export
- Import: two administrators serving the whole government
- Exit gate: administrators, auditors, the pilot institutions' officials and the whole government (read only)

**Provenance:**

- Record identity unchanged when federating later: an import keeps every id, reference and number and the evidence the decisions verify against
- Decisions are never re-sealed; documents are sealed again under the new installation's key only after each version's SHA-256 is checked

**Tests:**

- `app/src/lib/nation/edition.test.ts` "runs facility licensing, professional registration and the medicines register end to end with no other institution present"
- `app/src/lib/nation/edition.test.ts` "degrades explicitly: a service another institution owns answers "not connected", and a step that needs another register pauses"
- `app/src/lib/nation/edition.test.ts` "is recorded in setup and names its institutions, modules, registers and procedures; nothing outside it runs"
- `app/src/lib/nation/edition.test.ts` "changes after setup only through the change process: cited, confirmed by a different official, every version kept"
- `app/src/lib/portability/export.test.ts` "carries the institution's own records and nothing of another's, sealed, and verifies with no running server"
- `app/src/lib/portability/export.test.ts` "is proposed by an administrator of the institution and confirmed by a different official who can sign there; never from whole-government scope for an independent institution"
- `app/src/lib/portability/export.test.ts` "goes back into an empty installation with every record identifier unchanged, and verifies there"
- `app/src/lib/pilot/exit-gate.test.ts` "is not met in a demonstration where every completed case is a sample, and lists exactly what is missing"
- `app/src/lib/pilot/exit-gate.test.ts` "is met in production only from records: an approved procedure, mapping and seal key, signed-in officials, a verifying chain and logged reads"

**Release gate:** S6-I-11 exit gate

## Forms with no procedure link

13 library contracts name no procedure: 12 of batch 1 and 1 of batch 2. 3 need none (an exchange service and the public check answer them); every other one is `missing` and fails its go-live gate until its procedure exists (`lib/forms/procedure-link.ts`). The stage each is intended for:

| Form | Batch | Owner slot | Procedure required | Intended stage |
|---|---|---|---|---|
| `FIELD-SERIES-PARTS-05-07:HLT-FAC-001@1` Apply to establish a health facility | 1 | `healthRegulation` | yes | An establishment-approval procedure of the health regulator on the health-facilities register, before the licence application (health.facility): not built; the form waits in the library (plan step I4). |
| `FIELD-SERIES-PARTS-05-07:HLT-FAC-004@1` Submit a corrective action plan for a health facility | 1 | `healthRegulation` | yes | Follow-up of an inspection (health.facility inspection stage, and inspections of licensed facilities): a corrective-action follow-up procedure is not built; the form waits in the library (plan step I4). |
| `FIELD-SERIES-PARTS-05-07:HLT-FAC-006@1` Apply to vary a health facility's services or capacity | 1 | `healthRegulation` | yes | A variation of a standing in the health-facilities register (assessment, then a decision under the approved permit mapping): not built; the form waits in the library (plan step I4). |
| `FIELD-SERIES-PARTS-05-07:HLT-FAC-007@1` Tell the regulator a health facility is closing | 1 | `healthRegulation` | yes | Closure or surrender of a standing in the health-facilities register (lib/organisations/procedures.ts effects): not built; the form waits in the library (plan step I4). |
| `FIELD-SERIES-PARTS-05-07:HLT-FAC-009@1` Report a concern about a health facility | 1 | `healthRegulation` | yes | A complaint intake of the health regulator that registers the concern and refers it (lib/casework/referral.ts) or opens grounds for a review (health.facility-suspension, document "grounds"): the intake is not built; the form waits in the library (plan step I4). |
| `FIELD-SERIES-PARTS-05-07:HLT-FAC-010@1` Check a health facility's licence | 1 | `healthRegulation` | no (organisation.standing) | Answered by the public check (/registers) and the organisation.standing exchange service; no case is opened. |
| `FIELD-SERIES-PARTS-05-07:HLT-LIC-005@1` Apply to change your registration category or scope | 1 | `professionalRegulation` | yes | An amendment of a professional's standing (category, scope, conditions) on the professions register: not built (prof.renewal can change conditions only at renewal); the form waits in the library (plan step I4). |
| `FIELD-SERIES-PARTS-05-07:HLT-LIC-007@1` Ask for a certificate of good standing | 1 | `professionalRegulation` | yes | A good-standing certificate procedure of the professions register (entitlement check, then a certificate issued from the register, lib/records/certificates.ts): not built (prof.registration issues only the registration certificate); the form waits in the library (plan step I4). |
| `FIELD-SERIES-PARTS-05-07:HLT-LIC-008@1` Complain about a health professional | 1 | `professionalRegulation` | yes | A conduct-complaint intake of the professions regulator that registers and routes the complaint: to a conduct investigation (HLT-LIC-009) and fitness-to-practise case (prof.fitness, document "grounds") or by referral to another institution (lib/casework/referral.ts); the intake is not built; the form waits in the library (plan step I4). |
| `FIELD-SERIES-PARTS-05-07:HLT-LIC-010@1` Review an interim restriction on a professional | 1 | `professionalRegulation` | yes | An interim-restriction review of the professions register, only once the nation's law provides interim restrictions and the permit authority registry maps the power: not built; the form waits in the library (plan step I4). |
| `FIELD-SERIES-PARTS-05-07:HLT-LIC-014@1` Check a health professional's registration | 1 | `professionalRegulation` | no (professional.standing) | Answered by the public check (/api/registers/professionals) and the professional.standing exchange service; no case is opened. |
| `FIELD-SERIES-PARTS-05-07:HLT-MED-024@1` Check a medicine's or device's authorisation | 2 | `medicinesRegulation` | no (product.status) | Answered by the public product check (/api/health-regulation/products, publicProductView()) and the product.status exchange service, called only by integrations two officials approve for a purpose; no case is opened. |
| `FIELD-SERIES-PARTS-05-07:HLT-PH-015@1` Submit an aggregate public-health return | 1 | `publicHealth` | yes | A public-health aggregate return of the receiving authority, kept like the capacity returns (lib/health/register.ts: versioned, always marked reported, corrections as new versions): the programme returns are not built; the form waits in the library (plan step I4). |

## Linked contracts waiting for adoption (batches 1 and 2)

33 contracts name a reference procedure. Each is linked, not adopted: the nation adopts it in a new procedure version a second official approves.

| Form | Procedure | Stage | Step or document |
|---|---|---|---|
| `FIELD-SERIES-PARTS-05-07:HLT-FAC-002@1` Apply for a health facility licence | `health.facility` | `submitted` |  |
| `FIELD-SERIES-PARTS-05-07:HLT-FAC-003@1` Record a health facility inspection | `health.facility` | `inspection` | inspected · inspection-report |
| `FIELD-SERIES-PARTS-05-07:HLT-FAC-005@1` Renew a health facility licence | `health.facility-renewal` | `submitted` | renewal-evidence |
| `FIELD-SERIES-PARTS-05-07:HLT-FAC-008@1` Open a review to suspend or revoke a facility licence | `health.facility-suspension` | `opened` | notify · grounds |
| `FIELD-SERIES-PARTS-05-07:HLT-LIC-001@1` Apply to register as a health professional | `prof.registration` | `submitted` | qualification-evidence |
| `FIELD-SERIES-PARTS-05-07:HLT-LIC-002@1` Record the verification of a qualification | `prof.registration` | `verification` | verify |
| `FIELD-SERIES-PARTS-05-07:HLT-LIC-003@1` Record a professional licence decision | `prof.registration` | `pending-approval` | register |
| `FIELD-SERIES-PARTS-05-07:HLT-LIC-004@1` Renew a professional registration | `prof.renewal` | `submitted` | renewal-evidence |
| `FIELD-SERIES-PARTS-05-07:HLT-LIC-006@1` Record continuing education | `prof.renewal` | `submitted` | renewal-evidence |
| `FIELD-SERIES-PARTS-05-07:HLT-LIC-009@1` Open a professional conduct investigation | `prof.fitness` | `opened` | grounds |
| `FIELD-SERIES-PARTS-05-07:HLT-LIC-011@1` Record a disciplinary decision | `prof.fitness` | `pending-approval` | suspend |
| `FIELD-SERIES-PARTS-05-07:HLT-LIC-012@1` Open a review to suspend or revoke a registration | `prof.fitness` | `opened` | notify · grounds |
| `FIELD-SERIES-PARTS-05-07:HLT-LIC-013@1` Ask for your registration to be restored | `prof.fitness` | `suspended` | reinstate |
| `FIELD-SERIES-PARTS-05-07:HLT-MED-001@1` Apply for a marketing authorisation for a medicine | `medicines.authorisation` | `submitted` | register · application-form |
| `FIELD-SERIES-PARTS-05-07:HLT-MED-002@1` Submit a version of an authorisation dossier | `medicines.authorisation` | `dossier` | record-dossier · dossier |
| `FIELD-SERIES-PARTS-05-07:HLT-MED-003@1` Record a technical assessment of a medicine | `medicines.authorisation` | `assessment` | assess · assessment-report |
| `FIELD-SERIES-PARTS-05-07:HLT-MED-004@1` Ask an applicant for more information | `medicines.authorisation` | `assessment` | request-information · information-request |
| `FIELD-SERIES-PARTS-05-07:HLT-MED-005@1` Answer a request for more information | `medicines.authorisation` | `information-requested` | record-response · applicant-response |
| `FIELD-SERIES-PARTS-05-07:HLT-MED-006@1` Record a marketing authorisation decision | `medicines.authorisation` | `pending-approval` | authorise |
| `FIELD-SERIES-PARTS-05-07:HLT-MED-007@1` Renew a marketing authorisation | `medicines.renewal` | `submitted` | register · application-form |
| `FIELD-SERIES-PARTS-05-07:HLT-MED-008@1` Apply to vary a marketing authorisation | `medicines.variation` | `submitted` | register · application-form |
| `FIELD-SERIES-PARTS-05-07:HLT-MED-009@1` Open a review to suspend or withdraw a product authorisation | `medicines.suspension` | `opened` | notify · grounds |
| `FIELD-SERIES-PARTS-05-07:HLT-MED-010@1` Register a medicines or medical device manufacturing site | `medicines.manufacturer` | `submitted` | check |
| `FIELD-SERIES-PARTS-05-07:HLT-MED-011@1` Record a good-practice inspection | `medicines.manufacturer` | `inspection` | inspected · inspection-report |
| `FIELD-SERIES-PARTS-05-07:HLT-MED-012@1` Submit a corrective action plan after a good-practice inspection | `medicines.corrective-action` | `submitted` | register · corrective-action-plan |
| `FIELD-SERIES-PARTS-05-07:HLT-MED-013@1` Apply for authorisation to import medicines or medical devices | `medicines.import-authorisation` | `submitted` | register · application-form |
| `FIELD-SERIES-PARTS-05-07:HLT-MED-014@1` Apply for a controlled medicine authorisation | `medicines.controlled` | `submitted` | register · application-form |
| `FIELD-SERIES-PARTS-05-07:HLT-MED-015@1` Report a safety concern about a medicine | `medicines.safety-report` | `received` | register · report |
| `FIELD-SERIES-PARTS-05-07:HLT-MED-017@1` Notify a product recall | `medicines.recall` | `notified` | assess-risk · recall-notification |
| `FIELD-SERIES-PARTS-05-07:HLT-MED-018@1` Report that a recall is complete | `medicines.recall` | `supply-chain-notified` | report-completion · completion-report |
| `FIELD-SERIES-PARTS-05-07:HLT-MED-019@1` Register a medical device | `medicines.device-registration` | `submitted` | register-application · application-form |
| `FIELD-SERIES-PARTS-05-07:HLT-MED-020@1` Report a medical device incident | `medicines.device-incident` | `received` | register · report |
| `FIELD-SERIES-PARTS-05-07:HLT-MED-023@1` Ask for a medicines regulatory decision to be reconsidered | `medicines.reconsideration` | `received` | register · request-form |

## Acceptance rows for Health (`docs/INSTITUTIONAL_ACCEPTANCE.md` part 2)

| Item | Row | Register status | Here | Proving tests |
|---|---|---|---|---|
| P2-03: A health-facility licensing case cannot be approved by an account lacking the configured legal authority. | `S2-G-14` | Proven | built and proven | `app/src/lib/health/procedures.test.ts` "refuses premises that are not published registered sites, and the education authority cannot license a clinic"; `app/src/lib/permits/cycle3-production.test.ts` "refuses a school registration, a facility licence and a professional registration until a mapping is approved" |
| P2-04: The health ministry cannot search unrestricted patient records simply because it administers health facilities. | `S2-G-15` | Partial | partial | `app/src/app/api/health-regulation/route.test.ts` "takes returns only from the health regulator, refuses anything that is not an aggregate count" |
| P2-11: A public professional-licence verification endpoint excludes restricted personal and disciplinary information. | `S2-G-22` | Proven | built and proven | `app/src/app/api/registers/professionals/route.test.ts` "answers one person by full name, narrowed by the number, never by the number alone, without the person reference, qualifications or (by default) conditions"; `app/src/app/api/registers/professionals/route.test.ts` "limits each caller and flags harvesting once" |
