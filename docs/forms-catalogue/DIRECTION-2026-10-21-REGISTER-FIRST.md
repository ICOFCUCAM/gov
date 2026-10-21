# Owner's direction, 21 October 2026: register first, then contracts in batches

**Status.** Binding (owner). Kept word for word below. It governs the forms
catalogue (`docs/forms-catalogue/`), the requirements register
(`docs/INSTITUTIONAL_REQUIREMENTS.md`) and the form registry built in step I1.
In short, as the owner put it: a listed form is not a complete contract, and a
complete contract is not a form safe to deploy. No further batch of form
contracts is generated until the register is authoritative, the exclusions are
reconciled and the verified gap report exists.

---

This is a sensible way to bring CivicOS under control. The key decision is that a form being listed is not the same as its contract being complete, and a contract being complete is not the same as the form being safe to deploy.

There is one important inconsistency to resolve before the agents proceed.
1. Reconcile the healthcare and education exclusions
The earlier JSON contracts included fields such as patient_id, clinical_assessment, student_id and result_value. Your current requirements explicitly prohibit patient or clinical fields and a student record system.

The requirements register must therefore distinguish:
- Allowed: health facility registration, facility inspections and approved aggregate public-health statistics.
- Excluded from implementation: patient registration, individual clinical encounters, patient-specific referrals and dispensing records, personal care plans.
- Allowed: school and institution registration, qualification verification, programme accreditation and aggregate education returns.
- Excluded from implementation: named student registration, enrolment, attendance and individual assessment results.
- Legal review required: suspect-identifying prosecution referrals, prison admission records, intelligence products and oversight records, and voter registration.
These are binding scope restrictions, not merely warnings. Any earlier contract that contradicts them should be marked excluded_pending_scope_review or requires_legal_review, as appropriate, and must not pass production validation.
2. Require the agents to reconcile every form against the register
The requirements register should track at least these states:
Status	Meaning
catalogued	Form name and ID exist
contract_missing	Field-level contract has not been supplied
contract_draft	Contract exists but has not passed validation
under_review	Legal, privacy, authority or technical review is pending
blocked	A mandatory requirement or safeguard has failed
excluded	Implementation is prohibited by the approved scope
approved	Required reviews and tests have passed
production	Explicit production release has been approved
A missing contract must never be interpreted as an empty form, an approved form or a completed requirement.
3. Enforce publication gates in the platform
The form registry should reject publication unless all applicable checks have passed, including:
- Schema completeness and validation tests.
- Approved legal basis and competent authority.
- Required independent approval and separation of duties.
- Institution-scoped permissions and privacy controls.
- Evidence, retention and audit requirements.
- Accessibility and localization tests.
- Scope restrictions and required legal reviews.
- Release approval and rollback readiness.
The platform should distinguish checks it can verify automatically from approvals that require an authorized human. A developer must not be able to mark a legal review as approved merely by changing a status field.
4. The next deliverable should be a verified gap report
Before generating the remaining field contracts, reconcile the numbers across the catalogue, contracts and requirements register:
1. Count unique form IDs across all 22 parts.
2. Match every contract to exactly one registered form.
3. Identify forms with no contract, incomplete contracts and duplicate IDs.
4. Identify contracts violating the explicit scope restrictions.
5. Identify forms requiring legal review before implementation.
6. Confirm every production candidate has passed the applicable go-live gates.
The counts of 216 listed forms, 61 contracts in Parts 14–22 and 72 core contracts in Parts 5–13 should be treated as reported figures until verified against the actual register.

My recommendation: do not generate another large batch of form definitions yet. First make the register authoritative and reconcile these exclusions. Then generate the missing contracts in controlled batches, validate them automatically, and allow only approved contracts to proceed to implementation. This prevents CivicOS from accumulating a large catalogue that looks complete while its actual requirements remain inconsistent.
