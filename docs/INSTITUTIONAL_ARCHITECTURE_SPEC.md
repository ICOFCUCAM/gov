# CivicOS — Global institutional architecture and design specification (external guidance, kept verbatim)

**Provenance.** Written by ChatGPT on 21 October 2026 in answer to the owner's
inquiry about complete, premium, standalone-deployable ministries and
institutions. Delivered in six parts; the owner pasted all six and asked for
them to be combined into one document without summarising.

**Status.** Binding guidance for institutional work, in the same way as
`docs/CONSTITUTIONAL_ARCHITECTURE.md`. How it applies to the code — what is
agreed, what Claude upgrades, what is lower priority or conflicts with rules
already in force, the mapping to existing systems and the build order — is in
`docs/INSTITUTIONAL_ARCHITECTURE_PLAN.md`. Where the two differ, the plan says
why; rules in `CLAUDE.md` still win (for example, colours only through
`lib/theme/tokens.ts`, typefaces self-hosted).

**Sequence.** Implementation starts only after the constitutional phases
(5, 6, 7 and any further ones in `docs/CONSTITUTIONAL_ARCHITECTURE_PLAN.md`)
are complete and integrated (owner's instruction, 21 October 2026).

**How the text was kept.** Every word of the six parts is here in the order
delivered (checked character for character, ignoring white space). Only the
layout was changed so it reads as Markdown: tab-separated tables became
Markdown tables, JSON field contracts became code blocks, part titles and
numbered section titles became headings, and blank lines were normalised. The
owner's one-word prompts between parts ("next") are not part of the text and
were left out. Nothing was summarised, reworded or removed.

---

CivicOS — Global institutional architecture and design specification

Architecture baseline · 21 October 2026 · Research-led implementation specification

The correct way to complete CivicOS is to define a product architecture for every institution, a reusable operational kernel, and a country-configurable legal and service layer. It would be a mistake to create a separate, disconnected application for every ministry—or to claim that a universal set of screens makes every institution complete.

Your existing institution register, case engine, constitutional relationships, legal-version records, registers, document services, payments, audit chain, exchange services, national twin and deployment boundaries are the foundation to preserve.

The principal gap is that sector applications still need to become genuine operational systems: their screens must invoke approved procedures, read authoritative records, persist decisions, manage evidence, enforce legal permissions and report measurable service performance.

Delivery plan: six parts

1

A1 — Executive, finance, revenue and economic institutions

Presidency and Cabinet, Treasury, tax, customs, central bank, trade, investment, procurement and related economic regulators.

2

A2 — Human services and population administration

Civil registration, identity, health, education, immigration, labour, social protection, agriculture, water and professional licensing.

3

A3 — Justice, security, territory and infrastructure

Judiciary, legislature, police, civilian defence administration, foreign affairs, lands, transport, energy, environment, disaster management and local government.

4

A4 — Independent bodies and cross-government regulators

Elections, audit, statistics, anti-corruption, ombudsman, human rights, data protection, public service commissions, central bank and sector regulators.

5

B and D — Standalone/federated architecture and completeness

Institution kernel, portable records and signatures, progressive onboarding, mixed hosting, service boundaries, measurable department readiness and first-institution launch criteria.

6

C, E and F — Premium design system, build order and risk controls

Concrete UI specifications, institutional visual identity, accessible interaction patterns, deployment priorities, standards and security/legal acceptance tests.

I will use this first part to establish the shared institutional specification, evidence-based design rules and the first catalogue group. The subsequent parts will cover the remaining sectors and implementation details. The aim is an implementable specification, not a claim that every country's legal forms, fees, deadlines and powers can be safely pre-approved in a universal package.

## Part 1 of 6 — A1: Executive, finance, revenue and economic institutions

1. The implementation contract for every institution

Before sector-specific requirements, establish one rule for engineering: an institution is complete only when its legal authority, records, procedures, users, service channels, internal administration, external interfaces and operational metrics work together.

A premium dashboard backed by simulated records does not qualify.

#### 1.1 Shared capability contract

Every deployable institution should expose these capabilities through the same underlying platform contracts.

| Capability | Required behaviour |
|---|---|
| Legal authority | Every material decision references the applicable law, version, provision, jurisdiction and effective date. |
| Institutional ownership | Each register and decision type has an explicitly approved responsible authority. |
| Casework | Procedures have approved stages, typed inputs, required evidence, deadlines, decision roles, approval rules and appeals. |
| Records | Records have stable identifiers, ownership, classification, provenance, correction history and retention rules. |
| Documents | Documents have a content hash, version, issuer, signature evidence, classification and verification method where applicable. |
| Approvals | Required approvals come from distinct authenticated people and bind to the exact proposal being approved. |
| Finance | Bills, payments, refunds, adjustments and reconciliations are separate, attributable transactions. |
| Exchange | Every service has an owner, purpose, permitted fields, legal basis, caller authorization and audit evidence. |
| Oversight | Metrics derive from persisted records, carry a source and observation time, and disclose coverage and limitations. |
| Continuity | Backup restoration, identifier continuity, event replay and signature verification are tested. |
| Public service | Online, assisted, accessible and low-connectivity channels use the same authoritative procedures. |
| Standalone deployment | The institution can operate using its own authorized services and can later federate without changing record identity. |

Universal: these capabilities should be present in the institution kernel.

Country-dependent: the exact decision powers, required evidence, fees, deadlines, public disclosure and appeal bodies must come from approved national configuration.

2. Research basis and standards

CivicOS should use international standards where they solve interoperability or governance problems, rather than treating standards as decoration.

Government as a platform

The OECD's Digital Government Policy Framework identifies digital-by-design government, data-driven public sectors and reusable platform capabilities as core dimensions. The World Bank's GovTech Maturity Index similarly examines core government systems, service delivery, citizen engagement and enabling institutions.

OECD

+2

CivicOS application: reusable institutional kernels, a sourced national twin and independently deployable service modules.

Reusable digital building blocks

GovStack defines independently deployable and composable building blocks, including identity, registries, workflow, payments, signatures, messaging and information exchange.

ITU

+1

CivicOS application: package sector applications around shared contracts, not duplicated infrastructure.

Public finance

IMF GFSM 2014 provides a recognized framework for fiscal statistics, including stocks, flows and public-sector reporting. Its update process is ongoing, so the supported version should be tracked explicitly.

International Monetary Fund

+1

CivicOS application: distinguish budgets, commitments, accruals, cash movements, liabilities and statistical reporting instead of merging them into one “finance” number.

Customs and trade

The WCO Data Model standardizes customs and cross-border regulatory data definitions and messages for interoperability and single-window systems.

World Customs Organization

+1

CivicOS application: map customs declarations and border-agency messages to WCO data structures instead of inventing a proprietary international trade schema.

Public procurement

The Open Contracting Data Standard (OCDS) structures disclosures across planning, tendering, award, contract and implementation. It is a disclosure standard, not a complete procurement application.

Open Contracting Partnership

+1

CivicOS application: use the internal procurement workflow as the system of record and publish approved public data through OCDS.

Tax administration

OECD work on Tax Administration 3.0 emphasizes digital identity, connecting tax administration with business systems and reducing unnecessary transfers of taxpayer data. Its 2025 inventory describes digital transformation initiatives across more than 100 jurisdictions.

OECD

+2

CivicOS application: secure taxpayer accounts, authorized representation, digital submissions and purpose-limited data exchange.

These standards should be implemented as versioned mappings and conformance tests. They do not replace national law, accounting policy, tax legislation or institutional procedures.

3. Presidency, head of government and Cabinet Office

#### 3.1 Mandate and standing

This institution family coordinates the constitutional executive, government business, national policy and implementation of authorized decisions.

Its standing is configurable:

- A presidential office may combine head-of-state and head-of-government functions.
- A parliamentary system may have separate head-of-state and prime-ministerial offices.
- A monarchy may distinguish the royal household from the executive government.
- A directorial system may have a collective executive rather than a single executive leader.

The Cabinet Office or equivalent secretariat must not automatically own every ministry's records or powers.

#### 3.2 Departments and directorates

| Department | Operational responsibilities |
|---|---|
| Cabinet Secretariat | Agenda, submissions, meeting records, decisions, action assignments and follow-up |
| Government Coordination | Cross-ministry dependencies, referrals, inter-agency blockers and coordination agreements |
| Policy and Strategy | Policy proposals, options, impact assessments, consultation and implementation plans |
| Legal and Constitutional Affairs | Legal advice workflows, authority verification, constitutional deadlines and formal instruments |
| Delivery and Performance | Approved service indicators, milestones, verified blockers and corrective-action tracking |
| Appointments Secretariat | Legally authorized appointments, nominations, terms, vacancies and confirmation workflows |
| Protocol and State Functions | Official ceremonies, state visits and formal acts within the office's mandate |
| Public Communications | Official announcements, speeches, publication approval and media responses |
| Executive Correspondence | Incoming petitions and correspondence, routing, response deadlines and protected records |
| Internal Administration | HR, finance, procurement, assets, records, IT, continuity and internal audit |

These are functional departments, not mandatory constitutional bodies. A small state may combine them; a large government may distribute them among several offices.

#### 3.3 Citizen and institutional services

| Service | Record and decision | Documents | Fee rule | Appeal or review |
|---|---|---|---|---|
| Petition to the executive office | Petition, routing and response | Receipt, referral and response letter | Normally no charge; country configurable | Administrative review or designated ombudsman where applicable |
| Government correspondence | Incoming item and approved response | Acknowledgment, referral and response | Usually none | Internal complaint route or statutory complaint process |
| Formal appointment | Nomination, eligibility checks and authorized appointment | Nomination, consent, approval and appointment instrument | No citizen fee unless law provides otherwise | As provided by appointment law |
| Cabinet decision | Submission, meeting decision and implementation action | Agenda, decision record, authorized minutes | Not applicable | Constitutional, administrative or political review as applicable |
| Inter-ministry referral | Referral, receiving authority, deadline and response | Referral instrument and response | Not applicable | Escalation under approved coordination rules |
| Official publication | Approved communication or formal instrument | Signed source document and publication record | Normally none | Correction procedure for publication errors |

Do not make Cabinet minutes universally public or universally secret. The disclosure status depends on law, constitutional convention and the classification of each record.

#### 3.4 Owned registers and records

| Register | Core fields | Classification |
|---|---|---|
| Cabinet submissions | Submission ID, sponsor, subject, decision requested, legal references, classification, status, timestamps | Restricted; may contain confidential policy material |
| Cabinet decisions | Decision ID, exact decision text, approvers, legal basis, effective date, implementation owner | Restricted until lawfully released; immutable history |
| Executive directives | Issuer, recipient, scope, legal basis, effective period, required response and status | Restricted or public according to law |
| Government action register | Action ID, responsible institution, deadline, status, evidence and closure | Internal; aggregate indicators may be public |
| Appointment register | Office, nominee, appointment authority, term, confirmation, effective date and status | Mixed; personal and security-sensitive fields restricted |
| Petition register | Receipt ID, topic, routing, response deadline and status | Personal data; access limited to the handling office |
| Official publications | Document ID, issuer, signed version, publication status, publication time and corrections | Public where authorized; source document integrity protected |

The office should read ministry indicators through approved exchange services. It should not copy every underlying ministry record into its own database.

#### 3.5 Example procedure: Cabinet decision

| Stage | Required action | Decision role | Control |
|---|---|---|---|
| 1. Submit | Register the submission, sponsor, requested decision and legal basis | Authorized sponsor | Required fields and conflict declarations |
| 2. Validate | Check completeness, jurisdiction, cost and legal review | Cabinet Secretariat / legal officer | Return incomplete submissions |
| 3. Circulate | Deliver the approved version to authorized participants | Secretariat | Classification-aware access |
| 4. Decide | Record the actual authorized outcome | Legally empowered decision-maker or collective body | Quorum, voting and approval rules from national configuration |
| 5. Confirm | Authenticate the final decision record | Required confirming official(s) | Two-person confirmation where required |
| 6. Publish or notify | Apply the lawful disclosure and notification rules | Authorized secretariat role | Verify publication permissions |
| 7. Implement | Assign follow-up actions to responsible institutions | Authorized executive coordinator | No transfer of the receiving institution's legal powers |
| 8. Close | Record completion evidence and unresolved exceptions | Action owner / authorized reviewer | Audit trail and overdue escalation |

Deadlines: no universal number of working days should be pre-filled. The nation must configure Cabinet submission cut-offs, response deadlines, meeting procedures, quorum, voting, publication and retention rules.

#### 3.6 KPI catalogue

Compute these from the Cabinet and action records:

- Submissions received, returned and decided by period.
- Median and 90th-percentile time from submission to decision.
- Percentage of decisions with a valid legal basis and approved signature evidence.
- Actions completed by deadline.
- Overdue actions by responsible institution.
- Percentage of published decisions released within the configured legal deadline.
- Number of blocked decisions caused by missing legal authority.
- Number of unresolved cross-ministry referrals.

Every indicator must disclose its denominator, reporting period, source records and coverage. An overdue action is not evidence of poor performance if its deadline was formally suspended under an approved rule.

#### 3.7 Roles and access

- Head of state: only formal powers and records allocated to the office.
- Head of government: authorized executive coordination and decisions.
- Cabinet secretary: Cabinet records, meeting procedure and action management.
- Policy director: submissions and policy analysis within assignment.
- Legal officer: legal review and authority verification, not automatic authority to decide policy.
- Communications officer: approved publication and correspondence.
- Auditor: read-only access to records within an approved audit mandate.
- Institutional administrator: users and settings for this office only.

The Cabinet Office must not acquire blanket read access to judicial, legislative, central-bank, electoral or data-protection records.

#### 3.8 Field and mobile work

This institution usually has limited field work. Its mobile capabilities should focus on secure approvals, official correspondence, meeting packs and controlled document review. Sensitive Cabinet documents must not be cached unencrypted on personal devices. Offline approval should be disabled unless the installation has an explicitly approved, auditable offline-signature protocol.

4. Finance, Treasury and Budget

#### 4.1 Mandate and architecture

The finance ministry or treasury coordinates fiscal policy, budget preparation, government accounting, cash management, debt management and fiscal reporting. Depending on the country, these functions may be distributed across a finance ministry, treasury, budget office, debt-management office, accountant-general and independent fiscal council.

The system must distinguish:

- Budget authority: permission to incur expenditure within an approved appropriation.
- Commitment: a legally or administratively recorded commitment of funds.
- Invoice and payable: an obligation claimed or recognized.
- Payment: a confirmed movement of money.
- Accounting entry: a recorded financial event.
- Fiscal statistic: a derived, classified measure for reporting.

These are separate records linked through a traceable transaction chain.

#### 4.2 Departments

| Department | Required functions |
|---|---|
| Budget Preparation | Budget circulars, submissions, ceilings, negotiations, revisions and budget documents |
| Budget Execution | Appropriation control, allotments, commitments, supplementary budgets and virement where authorized |
| Treasury and Cash Management | Cash plans, liquidity, bank accounts, transfers and reconciliation |
| Government Accounting | Chart of accounts, journals, ledgers, period close and financial statements |
| Debt Management | Borrowings, guarantees, debt service, creditor schedules and risk reporting |
| Fiscal Policy and Forecasting | Revenue forecasts, expenditure forecasts, macro-fiscal assumptions and scenarios |
| Intergovernmental Finance | Transfers, grants and settlements with subnational governments |
| Public Investment Management | Project appraisal, approval, milestones, costs and benefits |
| Fiscal Reporting | Budget execution, fiscal statements, statistical classifications and public reports |
| Financial Control | Expenditure controls, exceptions, financial compliance and internal-control findings |

#### 4.3 Services, decisions and forms

| Service | Core procedure | Output |
|---|---|---|
| Budget submission | Call circular → institutional submission → validation → review → consolidation → approval under law | Submission receipt, review record, approved budget proposal |
| Appropriation allocation | Enacted appropriation → allocation → authority validation → release | Allocation and release records |
| Budget revision | Request → source and destination checks → legal authority → approval → revised allocation | Versioned amendment |
| Government payment | Obligation → invoice validation → commitment check → payment instruction → bank confirmation → reconciliation | Payment order and reconciliation record |
| Government grant or transfer | Eligibility → allocation → conditions → agreement → disbursement → acquittal | Grant decision, agreement and acquittal |
| Public debt transaction | Authorized borrowing proposal → approvals → instrument execution → accounting and reporting | Debt instrument and repayment schedule |
| Period close | Reconcile ledgers → resolve exceptions → close period → prepare statements | Close certificate and financial statements |

Every monetary threshold, budget ceiling, approval tier and payment deadline must be a versioned national rule.

#### 4.4 Registers and key fields

| Register | Key fields | Classification |
|---|---|---|
| Appropriations | Appropriation ID, authority, fund, programme, economic code, amount, currency, effective period, balance | Mostly internal; aggregate disclosure depends on law |
| Commitments | Commitment ID, institution, supplier reference, procurement reference, amount, currency, appropriation and status | Internal, with public-contracting disclosures where required |
| Payables | Payable ID, creditor, invoice reference, due date, amount, dispute status and related commitment | Restricted commercial and financial data |
| Payments | Payment ID, payee reference, amount, currency, bank transaction reference, status, timestamps and reconciliation evidence | Restricted; selected disclosures may be public |
| General ledger | Account, period, journal ID, debit/credit, source transaction, posting and reversal references | Internal; audited financial reporting may be published |
| Debt instruments | Instrument ID, creditor, principal, interest terms, currency, maturity, guarantees and repayment schedule | Restricted or public according to law |
| Public projects | Project ID, sponsoring institution, location, budget, milestones, contracts, outputs and risks | Mixed; public project information should be disclosed where authorized |
| Intergovernmental transfers | Recipient jurisdiction, legal formula, allocation, payment, conditions and reconciliation | Mixed; allocation records often suitable for public reporting |

Personal-data minimization remains important. Supplier payment records should contain the data required for payment and audit, not unrelated identity documents copied into every transaction.

#### 4.5 Internal roles

The finance minister or equivalent sets policy within legal powers; the permanent secretary or treasury head manages administration; budget directors review submissions; budget officers maintain allocations; accountants post authorized entries; treasury officers execute payments; debt officers maintain instruments; and internal auditors inspect controls.

The same person should not originate, authorize and reconcile the same material payment when separation of duties is required.

The auditor-general should receive read access under its legal mandate, not the ability to edit the finance ministry's original entries.

#### 4.6 Twin indicators

Only derive indicators from the relevant financial records:

- Budget versus actual expenditure by appropriation and period.
- Commitment and payable balances.
- Payment execution time.
- Reconciliation exception count and age.
- Revenue and expenditure classifications.
- Debt principal and scheduled debt service.
- Capital-project expenditure and recorded milestone completion.
- Transfers approved, paid and reconciled.
- Financial statements submitted and closed on time.

Use IMF GFSM 2014-compatible classifications where appropriate, while retaining the national chart of accounts and a versioned mapping to the international classification. GFSM is a statistical framework, not a replacement for the country's accounting law.

International Monetary Fund

+1

5. Revenue and Tax Authority

#### 5.1 Mandate and institutional independence

The tax authority administers taxes established by law. It may be a department within a ministry, a semi-autonomous revenue authority or a statutory agency. Its legal powers may include registration, assessment, collection, audit, refund processing, objections and referrals to courts or other enforcement bodies.

CivicOS must separate the tax-policy authority from the tax-administration authority when they are different institutions.

A minister or treasury officer must not change an individual's liability by editing a tax record outside the legally authorized tax procedure.

#### 5.2 Departments

| Department | Required functions |
|---|---|
| Taxpayer Services | Registration, taxpayer accounts, guidance, notices and assisted filing |
| Registration and Accounts | Taxpayer identifiers, entity links, tax types and account status |
| Returns Processing | Return intake, validation, amendments and filing records |
| Assessment | Statutory calculations, manual assessments where authorized, review and decision issuance |
| Payments and Refunds | Payment matching, credits, overpayments, refund claims and reconciliation |
| Compliance and Audit | Lawful audit selection, requests for records, findings and reassessments |
| Objections and Appeals | Administrative objections, independent internal review where required and referrals |
| Debt Management | Overdue liabilities, payment arrangements and lawful collection procedures |
| Legal and International Tax | Legal interpretations, treaty-related workflows and authorized cross-border cooperation |
| Data and Risk Governance | Data quality, authorized risk analysis, controls and model governance |

Risk scores must not independently determine liability, deny a refund or impose a penalty. If a country authorizes risk-based selection, record the policy version, inputs, purpose and human review. Provide a lawful challenge mechanism where applicable.

#### 5.3 Taxpayer account and service catalogue

| Service | Key procedure | Decision/output |
|---|---|---|
| Taxpayer registration | Application → identity/entity validation → tax-type selection → authority checks → registration decision | Taxpayer number and registration certificate or refusal |
| Registration amendment | Change request → evidence → validation → approval | Updated account version |
| Return filing | Submission → receipt → schema validation → correction request or acceptance → assessment workflow | Filing receipt and versioned return |
| Return amendment | Original return reference → amended fields → reason → evidence → reassessment | Amendment record and new decision where required |
| Tax assessment | Applicable law/rate version → verified inputs → calculation or reasoned manual assessment → independent approval | Assessment notice |
| Payment reconciliation | Payment feed or verified bank transaction → matching → allocation → exception resolution | Updated liability balance and reconciliation record |
| Refund claim | Claim → eligibility checks → review → approval → payment confirmation | Refund decision and payment record |
| Objection | Objection → admissibility → review by authorized official → decision → appeal/referral | Objection decision |
| Audit | Legal basis → authorized scope → notification or lawful exception → evidence → findings → response → decision | Audit report and resulting decision |
| Payment arrangement | Application → statutory eligibility → affordability or prescribed assessment → approval | Approved schedule or reasoned refusal |

A tax bill must not be marked paid merely because an official clicked a button. A real settlement requires a verified payment event, approved adjustment or legally recognized non-cash settlement. Simulation must remain visibly separate.

#### 5.4 Taxpayer registration form: implementable field contract

```json
{
  "form_id": "taxpayer-registration-v1",
  "record_type": "taxpayer_registration_application",
  "fields": [
    {
      "id": "applicant_type",
      "type": "enum",
      "required": true,
      "values_source": "approved_taxpayer_types",
      "personal_data_class": "administrative"
    },
    {
      "id": "national_identifier",
      "type": "identifier_reference",
      "required": false,
      "validation": "verify_with_authorized_identity_service_if_lawful",
      "personal_data_class": "restricted"
    },
    {
      "id": "organisation_id",
      "type": "registry_reference",
      "required": false,
      "validation": "must_reference_existing_organisation_or_authorized_pending_registration",
      "personal_data_class": "restricted"
    },
    {
      "id": "legal_name",
      "type": "localized_text",
      "required": true,
      "validation": "trim_unicode_normalize_length_limit",
      "personal_data_class": "business_confidential_or_personal"
    },
    {
      "id": "tax_types_requested",
      "type": "array<enum>",
      "required": true,
      "values_source": "approved_tax_type_register",
      "personal_data_class": "tax_confidential"
    },
    {
      "id": "business_address",
      "type": "address_reference_or_structured_address",
      "required": true,
      "validation": "country_address_profile",
      "personal_data_class": "restricted"
    },
    {
      "id": "contact_channel",
      "type": "verified_contact_reference",
      "required": true,
      "validation": "verified_channel",
      "personal_data_class": "personal"
    },
    {
      "id": "acting_capacity",
      "type": "enum",
      "required": true,
      "values": [
        "self",
        "legal_representative",
        "authorized_agent"
      ],
      "personal_data_class": "administrative"
    },
    {
      "id": "representation_evidence",
      "type": "document_reference",
      "required_when": "acting_capacity != self",
      "validation": "approved_evidence_policy",
      "personal_data_class": "restricted"
    },
    {
      "id": "declaration",
      "type": "signed_attestation",
      "required": true,
      "validation": "valid_signature_and_versioned_text",
      "personal_data_class": "restricted"
    }
  ]
}
```

This form is a concrete starting contract, but the country must decide the tax types, mandatory identifiers, taxpayer categories, required evidence, representation law and any legal declaration text. Do not make a national ID mandatory where the law permits registration without it.

#### 5.5 Tax decision controls

- Every calculation references the approved tax-type, rate and period rules used.
- Every material assessment records inputs, formula/version, result and any manual adjustment.
- Where two officials are required, the confirming official must independently review the proposal.
- Objections must not be decided by a person disqualified under the country's independence or recusal rules.
- Amendments never overwrite the original return or assessment.
- Read access to tax records is restricted to authorized tax personnel and legally authorized disclosures.
- The national twin receives approved aggregate figures, not individual returns.

#### 5.6 Tax indicators

- Returns due, received, accepted and outstanding by tax type and period.
- Median filing-to-assessment time.
- Assessments issued, amended and appealed.
- Outstanding liabilities by age band.
- Payments matched and unmatched.
- Refunds awaiting decision and payment.
- Objection resolution time and outcomes.
- Registration applications accepted, returned and refused.
- Percentage of decisions with valid legal and rate-version references.

These are operational metrics, not proof of tax compliance or tax-gap estimates. Any tax-gap estimate needs a documented statistical methodology and must be labelled as an estimate.

6. Customs Authority

#### 6.1 Mandate and departments

Customs administers import/export declarations, tariff classification, customs valuation, duty assessment, border release and authorized trade-control procedures. Some functions belong to other border agencies, so CivicOS must represent the responsible authority for each permit, inspection and release condition.

| Department | Functions |
|---|---|
| Declaration Processing | Import/export declarations, amendments, goods lines and supporting documents |
| Classification and Valuation | Tariff classification, valuation basis, origin and adjustments |
| Revenue Assessment | Duties, taxes, exemptions and legally authorized relief |
| Cargo and Release | Arrival, goods presentation, inspection status and release controls |
| Trade Facilitation | Authorized trader services, advance rulings and single-window coordination |
| Post-Clearance Audit | Authorized record requests, findings and reassessments |
| Refunds and Drawbacks | Claims, eligibility, calculation, approval and payment reconciliation |
| Border Coordination | Lawful exchange with other regulators and border agencies |
| Legal and Appeals | Objections, review, litigation referrals and legal instruments |

#### 6.2 Customs declaration form

The WCO Data Model should inform the canonical customs exchange schema. The form below is an application-level model; exact data elements must be mapped to the chosen WCO Data Model version, national tariff system and national law.

World Customs Organization

+1

```json
{
  "form_id": "customs-declaration-v1",
  "record_type": "customs_declaration",
  "fields": [
    {
      "id": "declarant_organisation_id",
      "type": "registry_reference",
      "required": true,
      "validation": "active_organization_and_authorized_representation",
      "personal_data_class": "restricted"
    },
    {
      "id": "declaration_type",
      "type": "enum",
      "required": true,
      "values_source": "approved_customs_procedure_codes",
      "personal_data_class": "administrative"
    },
    {
      "id": "consignment_reference",
      "type": "string",
      "required": true,
      "validation": "country_configured_unique_reference",
      "personal_data_class": "commercial_confidential"
    },
    {
      "id": "transport_document_reference",
      "type": "string",
      "required": true,
      "validation": "transport_document_profile",
      "personal_data_class": "commercial_confidential"
    },
    {
      "id": "origin_country_code",
      "type": "country_code",
      "required": true,
      "validation": "approved_country_code_list",
      "personal_data_class": "commercial"
    },
    {
      "id": "goods_lines",
      "type": "array<customs_goods_line>",
      "required": true,
      "validation": "minimum_one_line"
    },
    {
      "id": "currency_code",
      "type": "currency_code",
      "required": true,
      "validation": "approved_currency_code"
    },
    {
      "id": "supporting_documents",
      "type": "array<document_reference>",
      "required": true,
      "validation": "required_document_policy_for_procedure"
    },
    {
      "id": "declarant_attestation",
      "type": "signed_attestation",
      "required": true,
      "validation": "valid_signature_and_authorized_signer"
    }
  ]
}
```

A customs_goods_line should include, where required by the applicable procedure: line number, goods description, tariff classification code and version, quantity and unit, gross/net mass where applicable, country of origin, customs procedure, declared value, currency, valuation method, supporting references and calculated duty components. Do not assume every field is mandatory for every customs procedure.

#### 6.3 Customs procedure

Declaration received → validation → classification/valuation → duty assessment → required inspection → payment/reconciliation → release decision → post-clearance review where authorized

The release engine must validate every legally required prerequisite. It must not infer that a shipment is cleared merely because its bill is paid.

- Inspection selection must be attributable to an authorized officer or an approved, legally authorized procedure.
- An inspection result must be linked to the declaration and goods concerned.
- A discrepancy must not be erased by choosing a lower inspection level later.
- Duty calculations must reference the tariff and valuation-rule versions.
- Release must be denied when any mandatory condition remains incomplete.
- Seizure, detention and penalties must remain disabled until their legal powers and procedures have been independently approved.

#### 6.4 Customs records and indicators

| Record | Key fields | Classification |
|---|---|---|
| Declaration | Declarant, goods lines, transport reference, origin, procedure and status | Commercial confidential |
| Goods line | Classification, quantity, value, origin and supporting documents | Commercial confidential |
| Duty assessment | Rule versions, valuation, calculation, adjustments, assessors and approval | Tax/confidential |
| Inspection | Authority, reason, selected level, findings, evidence and time | Restricted operational |
| Payment reconciliation | Bill, payment reference, amount, currency, matching result and exceptions | Financial confidential |
| Release decision | Declaration, prerequisite status, decision-maker, legal basis and effective time | Commercial/restricted |
| Post-clearance audit | Scope, evidence, findings, response and resulting decision | Restricted |

Operational KPIs include declaration processing time, assessment time, inspection completion time, release time after all prerequisites, outstanding payment mismatches, amendment rates and unresolved appeals. Do not use raw seizure counts or inspection counts as standalone success metrics.

7. Central bank and financial-sector monetary authority

#### 7.1 Mandate and independence

A central bank is commonly responsible for monetary policy, currency issuance, payment-system oversight and some combination of banking supervision, financial stability, reserves and government banking. Its exact mandate and independence depend on the country's law.

CivicOS must treat it as a separately governed institution where the national constitutional profile establishes that status. It must not be a child of the finance ministry simply because monetary and fiscal policy interact.

#### 7.2 Departments and operations

| Department | Operational functions |
|---|---|
| Monetary Policy | Policy meetings, forecasts, analysis, decisions, instruments and publication |
| Financial Stability | Systemic-risk analysis, stress scenarios and stability reporting |
| Banking Supervision | Licensing, regulatory returns, supervisory reviews, findings and corrective actions |
| Payment Systems | Oversight, operator authorization, incident reporting and settlement-system governance |
| Currency Operations | Issuance, circulation, inventory, withdrawal and destruction controls |
| Foreign Reserves | Reserve assets, custody, transactions, valuation and risk limits |
| Economic Research | Statistical analysis, forecasts and policy research |
| Prudential Regulation | Capital, liquidity and other legally defined regulatory requirements |
| Legal and Governance | Statutory compliance, policy instruments, board records and authorized legal proceedings |
| Internal Audit and Risk | Independent internal assurance, operational risk and controls |

Some countries place banking supervision in a separate regulator. CivicOS should allow the central bank and financial supervisor to be different institutions.

#### 7.3 Records and data boundaries

| Register | Key fields | Classification |
|---|---|---|
| Monetary policy decisions | Decision ID, meeting date, policy instrument, decision, legal basis, approval and publication status | Public after authorized release; restricted before release |
| Authorized financial institutions | Institution ID, licence, permitted activities, conditions and standing | Public summary plus restricted supervisory details |
| Supervisory returns | Institution, reporting period, metric, value, method and submission status | Confidential supervisory information |
| Payment-system operators | Operator, authorization, system, conditions, incidents and status | Mixed |
| Currency inventory | Denomination, batch, location, quantity and movement | Restricted operational |
| Reserve transactions | Instrument, currency, amount, counterparty, valuation and settlement | Highly restricted |
| Financial stability scenarios | Scenario version, assumptions, aggregated exposures and results | Restricted or public in approved form |

The central bank should not receive unrestricted taxpayer returns, personal bank transaction histories or police files. Any lawful access must be explicit, purpose-limited and logged.

#### 7.4 Decision workflow

For a monetary policy decision:

Research package → authorized meeting agenda → evidence and forecast review → deliberation → recorded vote or decision → required confirmation → publication hold/release → implementation record

CivicOS must preserve the actual legally authorized decision-making process. It must not require two signatures if the central bank's statute establishes a different valid collective decision mechanism; nor should it let a single administrator bypass a required board decision.

#### 7.5 Indicators

Use data the bank is authorized to publish or report:

- Policy decisions published on schedule.
- Financial institution returns received and validated.
- Supervisory cases and overdue corrective actions.
- Payment-system incidents and resolution times.
- Currency orders and reconciled inventory.
- Authorized payment-system availability.
- Financial stability indicators with documented methodology.

Do not expose confidential institution-level supervisory figures in the national twin merely because they are available to the central bank.

8. Trade, Industry and Investment

#### 8.1 Mandate and structure

This institution family develops trade policy, supports businesses and investment, administers selected licences and incentives, promotes exports, and coordinates industrial development. Its functions may be split between a ministry, investment promotion agency, competition authority, standards body and export agency.

#### 8.2 Departments

| Department | Functions |
|---|---|
| Business Services | Business onboarding, service navigation, status checks and inter-agency referrals |
| Investment Promotion | Investor enquiries, proposals, facilitation and aftercare |
| Export Development | Exporter support, market access information and export programmes |
| Trade Policy | Trade measures, agreements, consultations and implementation monitoring |
| Industrial Development | Industrial programmes, project monitoring and authorized incentives |
| Enterprise Support | Grants, advisory services and small-business programmes |
| Standards Coordination | Referrals to the legally designated standards and conformity-assessment bodies |
| Market Access | Export barriers, trade documentation and authorized regulatory coordination |
| Commercial Disputes and Complaints | Complaints within the institution's mandate and referrals to competent bodies |
| Legal and Compliance | Licence authority, programme eligibility, conflicts and appeal procedures |

Do not assume that the trade ministry owns the business register, competition enforcement, customs classification or every import/export permit.

#### 8.3 Services and forms

| Service | Procedure and output |
|---|---|
| Investment facilitation | Enquiry → investor/entity verification where lawful → proposal → competent-agency referrals → response and project status |
| Exporter support | Application → eligibility validation → programme assessment → decision → assistance delivery and acquittal |
| Business incentive | Application → legal eligibility → fiscal authority review → independent approval where required → grant or incentive decision |
| Trade complaint | Complaint → admissibility → evidence request → investigation or referral → reasoned response |
| Industrial project monitoring | Project registration → milestones → evidence → review → corrective action or closure |

A general investment enquiry should not become a permanent national dossier on the investor. Collect only what is needed for the service and its lawful follow-up.

#### 8.4 Business-support application fields

```json
{
  "form_id": "investment-facilitation-v1",
  "fields": [
    {
      "id": "applicant_organisation_id",
      "type": "registry_reference",
      "required": true,
      "validation": "verify_existing_organization_or_approved_exception",
      "personal_data_class": "restricted"
    },
    {
      "id": "project_name",
      "type": "localized_text",
      "required": true,
      "validation": "length_limit",
      "personal_data_class": "commercial"
    },
    {
      "id": "project_sector",
      "type": "controlled_vocabulary",
      "required": true,
      "values_source": "national_industry_classification_mapping",
      "personal_data_class": "commercial"
    },
    {
      "id": "project_location",
      "type": "jurisdiction_or_site_reference",
      "required": true,
      "validation": "valid_national_place_reference",
      "personal_data_class": "commercial"
    },
    {
      "id": "project_stage",
      "type": "enum",
      "required": true,
      "values": [
        "concept",
        "feasibility",
        "approved",
        "under_development",
        "operating"
      ],
      "personal_data_class": "commercial"
    },
    {
      "id": "support_requested",
      "type": "array<controlled_vocabulary>",
      "required": true,
      "values_source": "published_investor_services",
      "personal_data_class": "administrative"
    },
    {
      "id": "requested_agencies",
      "type": "array<institution_reference>",
      "required": false,
      "validation": "active_institutions_only",
      "personal_data_class": "administrative"
    },
    {
      "id": "supporting_documents",
      "type": "array<document_reference>",
      "required": false,
      "validation": "approved_document_policy",
      "personal_data_class": "commercial_confidential"
    }
  ]
}
```

The country must define the actual eligibility rules, any financial thresholds, authorized incentive types, required evidence and competent decision-making bodies.

#### 8.5 Owned registers and indicators

The institution may own:

- Investment facilitation cases.
- Authorized incentive programmes and decisions.
- Export-support applications.
- Trade complaints.
- Industrial development projects.
- Investor-service referrals.

It should read organization identity from the authoritative organization register, customs status from customs exchange services, and licences from the legally responsible regulator.

Indicators include investor enquiries resolved, referrals completed within deadline, incentive applications decided, projects meeting recorded milestones and export-support cases completed. Do not report a proposed investment value as realized investment without a verified basis and a clearly defined measurement method.

9. Public procurement authority and procurement services

Public procurement is often split between a procurement policy regulator, procuring entities, treasury, tender boards, auditors and review tribunals. CivicOS must model those as separate authorities when the law does.

#### 9.1 Departments and functions

| Department or body | Functions |
|---|---|
| Procurement Policy | Regulations, standard documents, methods and thresholds |
| Procurement Planning | Annual plans, requirements, budgets and market analysis |
| Tender Management | Invitations, tender documents, submissions, opening and evaluation |
| Evaluation Committee | Evaluation records, criteria application, conflicts and recommendations |
| Contract Management | Contract, milestones, variations, deliverables and acceptance |
| Supplier Management | Supplier registration, authorized eligibility checks and profile maintenance |
| Complaints and Review | Challenges, standstill rules where applicable, review decisions and appeals |
| Procurement Audit | Compliance review, evidence, findings and referrals |
| Public Disclosure | Publication of notices, awards, contracts and implementation information |
| Internal Administration | HR, budgets, records, assets, ICT, legal support and internal audit |

The evaluation committee must not be able to change published criteria after bid submission in a way that unlawfully disadvantages bidders. Any lawful clarification or amendment needs an attributable record and the applicable notice process.

#### 9.2 Core procurement records

| Record | Core fields |
|---|---|
| Procurement plan | Entity, requirement, category, estimated value, budget reference, method, timetable and approvals |
| Tender | Tender ID, method, scope, eligibility, criteria version, submission deadline and publication |
| Bid | Bidder, receipt time, document manifest, version, withdrawal status and confidentiality classification |
| Evaluation | Criteria, scoring evidence where legally permitted, conflicts, evaluator identities, clarifications and recommendation |
| Award | Winning bidder, legal basis, award rationale, approval, publication and challenge status |
| Contract | Contract ID, parties, scope, value, currency, milestones, dates, variations and disclosure status |
| Deliverable acceptance | Deliverable, inspection evidence, acceptance decision, defects and correction requirements |
| Payment certification | Accepted deliverable, invoice, budget reference, authorized certifier and payment linkage |
| Procurement complaint | Complainant, tender, grounds, deadlines, evidence, review decision and remedy |

#### 9.3 Procurement workflow

Plan → budget confirmation → procurement method authorization → notice → submissions → opening → evaluation → award recommendation → approval → publication → contract → deliverables → acceptance → payment → closure

Each transition must have a legally valid role and deadline. A procurement officer cannot approve a payment simply because a contract exists; payment must be linked to the applicable commitment, invoice and authorized acceptance.

Publish approved procurement information using OCDS mappings. Keep confidential bid contents, personal data and protected commercial information out of public releases unless disclosure is legally required. OCDS provides a structured disclosure model, not a substitute for the national procurement law or the underlying transaction system.

Open Contracting Partnership

+1

#### 9.4 Procurement form: planning record

```json
{
  "form_id": "procurement-plan-item-v1",
  "fields": [
    {
      "id": "procuring_entity_id",
      "type": "institution_reference",
      "required": true,
      "validation": "authorized_procuring_entity"
    },
    {
      "id": "requirement_description",
      "type": "localized_text",
      "required": true,
      "validation": "plain_language_and_length_limit"
    },
    {
      "id": "procurement_category",
      "type": "controlled_vocabulary",
      "required": true,
      "values_source": "national_procurement_classification"
    },
    {
      "id": "budget_appropriation_id",
      "type": "registry_reference",
      "required": true,
      "validation": "active_appropriation_with_sufficient_authority"
    },
    {
      "id": "estimated_value",
      "type": "money",
      "required": true,
      "validation": "nonnegative_decimal_and_currency_required",
      "personal_data_class": "financial"
    },
    {
      "id": "proposed_method",
      "type": "enum",
      "required": true,
      "values_source": "approved_procurement_methods"
    },
    {
      "id": "planned_publication_date",
      "type": "date",
      "required": true,
      "validation": "valid_under_national_timetable"
    },
    {
      "id": "conflict_declaration",
      "type": "signed_attestation",
      "required": true,
      "validation": "valid_signature_and_policy_version",
      "personal_data_class": "restricted"
    },
    {
      "id": "approvals",
      "type": "approval_evidence_collection",
      "required": true,
      "validation": "configured_separation_of_duties"
    }
  ]
}
```

The national configuration must specify procurement methods, thresholds, publication rules, permissible exceptions, evaluation methods, challenge periods, standstill requirements and the authorized review body.

#### 9.5 Procurement indicators

- Procurement plans approved by deadline.
- Tenders published and completed by method.
- Median time from publication to award.
- Awards with complete required public disclosure.
- Contract variations by count and value.
- Deliverables accepted on time.
- Payments linked to verified acceptance.
- Complaints and review outcomes.
- Percentage of procurement records with complete legal and approval provenance.

Do not use “number of tenders” or “lowest bid” as a standalone quality indicator. Procurement performance must consider lawful process, delivery, quality, competition and contract outcomes.

10. Shared internal administration across this institution group

All six institution types above need an internal administration workspace. It should be provisioned from the institution's enabled departments, not implemented as six separate HR and finance applications.

| Function | Required operational records |
|---|---|
| Human resources | Positions, authorized establishment, assignments, training, leave, performance processes and personnel actions |
| Finance | Budget allocations, commitments, invoices, payments, reconciliation and period close |
| Procurement | Plans, requisitions, tenders, contracts, acceptance and supplier records |
| Asset management | Asset identity, custodian, location, condition, maintenance and disposal |
| Records management | Classification, ownership, retention schedules, legal holds, transfer and authorized disposal |
| Legal services | Advice requests, legal opinions, contracts, statutory obligations and litigation referrals |
| Internal audit | Audit plans, engagements, findings, management responses and closure evidence |
| ICT and operations | Services, incidents, access requests, changes, service availability, backup and recovery evidence |
| Planning and performance | Approved plans, indicators, targets, source records, reporting periods and corrective actions |
| Communications | Publications, translations, approvals, mailing lists and corrections |

These are operational domains, not automatic grants of authority. For example, the finance department may prepare a payment, but the relevant payment authorization and separation-of-duties controls still apply.

11. The common form and evidence contract

The sample form structures above should become versioned machine-readable specifications within CivicOS. Every sector form must support the following behaviours.

- Use typed fields, explicit required conditions, controlled vocabularies and server-side validation.
- Distinguish a user-entered value from a verified value returned by an authoritative register.
- Explain errors beside the affected field, preserve safe draft input and provide a correction route.
- Identify each required document, its purpose, accepted formats and whether an authorized alternative is available.
- Use accessible labels, keyboard navigation, visible focus, meaningful error summaries and screen-reader announcements.
- Use the nation's approved language and terminology; support right-to-left layouts without reversing identifiers, amounts or legal citations incorrectly.
- Offer an assisted-service version that captures the same underlying record, records the assisting official and gives the applicant a receipt.
- Offer a low-connectivity path where appropriate, with secure resumable submissions and explicit confirmation of whether the request was received.
- Record the form schema version, declaration text version and evidence-policy version used for each submission.

The system should never silently change an old submitted form when the form definition changes. Historical submissions must remain interpretable under their original version.

12. National twin contract for economic institutions

The twin should consume approved aggregate observations from these institutions, not independently calculate authoritative financial or legal outcomes from incomplete copies of their records.

Each observation should include at least:

```json
{
  "indicator_id": "tax_returns_received",
  "value": 0,
  "unit": "count",
  "period_start": "YYYY-MM-DD",
  "period_end": "YYYY-MM-DD",
  "observed_at": "ISO-8601 timestamp",
  "source_institution_id": "tax_authority",
  "source_record_type": "tax_return",
  "source_query_or_method_version": "versioned-method-id",
  "coverage": {
    "expected_sources": 0,
    "reporting_sources": 0,
    "completeness": "not_calculated"
  },
  "provenance": "observed",
  "quality_status": "validated",
  "classification": "approved_aggregate",
  "legal_basis_ref": "approved-disclosure-rule"
}
```

This is a schema example. The actual value, source method and quality status must be computed from real records.

Use the provenance vocabulary consistently:

| Provenance | Meaning |
|---|---|
| observed | Directly measured or recorded by the authoritative source |
| reported | Submitted by an institution but not independently verified beyond the stated checks |
| modelled | Estimated using a documented methodology |
| sample | Demonstration data; never presented as national fact |
| not_connected | No live source is connected; no value should be fabricated |

An estimate should also include its methodology version, assumptions and uncertainty information where available. A zero must mean an observed or calculated zero, not missing data.

13. Acceptance criteria for Part 1

I would not accept these institutions as production-ready until the following tests pass.

1. Every consequential operation checks the correct institution, office, jurisdiction and approved legal basis.
2. Tax liabilities cannot be created or altered by users outside the tax authority's permitted powers.
3. Tax and customs payments cannot be settled using a simulated payment event in production.
4. Every budget commitment and payment is traceable to its authorized source records.
5. Customs release is blocked until every required assessment, inspection and settlement condition is satisfied.
6. The central bank's confidential records remain separate from finance-ministry access.
7. Procurement decisions preserve the criteria, evidence, approvals and versions used at the time.
8. Public disclosures use approved publication rules and do not leak restricted records.
9. Indicators are derived from persisted records and carry provenance, time period, source and coverage.
10. A standalone installation can perform its authorized services without silently assuming access to uninstalled national institutions.
14. Reference register for this part

The principal research sources are:

- OECD Digital Government Policy Framework — official framework. Reusable platform and digital-government principles.

OECD

+1

- GovStack — building-block specifications. Composable service capabilities and interfaces.

GovStack Specification

- International Monetary Fund — Government Finance Statistics Manual. Fiscal classification and reporting.

International Monetary Fund

+1

- World Customs Organization — WCO Data Model. Customs and border-agency interoperability.

World Customs Organization

- Open Contracting Partnership — Open Contracting Data Standard. Public procurement disclosure.

Open Contracting Partnership

+1

- OECD — Tax Administration Digitalisation and Digital Transformation Initiatives. International tax administration practice.

OECD

- Public Expenditure and Financial Accountability (PEFA) — PFM assessment framework. Public financial management assessment and controls.

pefa.org

+1

These references guide architecture and interoperability. They do not establish the laws, fees or legal powers of the nation that installs CivicOS.

Next: Part 2 of 6 — Civil registration and identity, health, education, immigration, labour, social protection, agriculture, water and professional licensing. That part will specify the next institution group, including record ownership, privacy boundaries, service procedures, structured forms and national-twin indicators.

## CivicOS — Part 2 of 6

Human services, population administration and livelihoods

This part defines how CivicOS should support institutions responsible for people’s legal identity, health, education, migration, labour, social protection, agriculture, water and professional licensing.

The governing principle is one sovereign platform, distinct lawful authorities, and separate institutional records. CivicOS can provide common infrastructure, but it must not turn every institution into a user of one unrestricted national database.

The design follows the UN’s lifecycle approach to civil registration and legal identity, WHO guidance for health information systems, UNESCO’s education-management guidance, and ICAO’s machine-readable travel-document specifications. These are interoperability and design references—not substitutes for a country’s laws.

UN Legal Identity Agenda

+3

A. The institutional catalogue

The catalogue below is the minimum national configuration starting point. A nation may divide, merge or rename institutions, but CivicOS must record the actual legal mandate and responsible authority for each function.

1. Civil Registration and Vital Statistics (CRVS)

Births, deaths, marriages and other legally recognised vital events.

Owns: vital-event records, registration decisions, certificates and amendments. Supplies only legally authorised identity-verification attributes to other institutions.

2. National Identity Authority

Identity credentials, verification and identity lifecycle.

Owns: credential issuance, status, revocation, verification events and identity-resolution cases. Does not automatically own the underlying birth or court records.

3. Health Ministry and Health Service Authority

Facilities, workforce, service capacity, public-health programmes and health administration.

Owns: facility directory, provider authorisations, programme records and health-system reporting. Clinical records remain within separately authorised clinical systems.

4. Education Ministry and Education Authorities

Schools, institutions, enrolment, qualifications, staffing and education statistics.

Owns: institution register, school-year records, authorised enrolment and attendance records, qualifications and education administration. Student records are not a general-purpose government search index.

5. Immigration and Passport Authority

Visas, residence, permits, passports and migration casework.

Owns: applications, evidence, lawful decisions, credential issuance and case history. Border inspection and immigration adjudication may require distinct roles or authorities.

6. Labour and Employment Authority

Employment services, workplace inspection, occupational safety and labour disputes within its mandate.

Owns: employer registrations where assigned, inspection cases, findings, corrective orders and employment-service referrals. It must not see private medical information without specific authority.

7. Social Protection and Benefits Authority

Pensions, family benefits, disability-related benefits, income support and other nationally authorised programmes.

Owns: claims, eligibility evidence, decisions, payment instructions, reassessments and appeals. Each benefit requires its own approved eligibility rules.

8. Agriculture, Livestock and Food Authority

Farmers, agricultural programmes, livestock, inspections, subsidies and food-safety functions as assigned.

Owns: programme registrations, farm and livestock records where authorised, inspection results and subsidy cases. Land ownership remains with the legally designated land authority.

9. Water and Sanitation Authority

Water permits, utilities, service coverage, sanitation and quality monitoring.

Owns: permits and utility records according to law, inspection findings, infrastructure assets and service interruptions. Laboratory results must retain their source and sampling context.

10. Professional Licensing and Accreditation Authorities

Authorisation to practise regulated professions and accreditation of institutions.

Owns: applications, qualifications verified, licence status, renewal and disciplinary decisions. Disciplinary records require stricter access than public licence status.

The government may assign these functions to ministries, statutory agencies, municipalities, professional councils or independent bodies. The catalogue is therefore a set of institution archetypes, not a fixed constitutional org chart.

B. Standard capability contract for each institution

Every archetype should use the same underlying workspace and workflow engine, with sector-specific records and procedures.

| Workspace | Minimum production capability |
|---|---|
| Overview | Live, source-backed workload, service performance and unresolved blockers |
| Casework | Intake, validation, assignment, evidence, review, decision, notice and appeal where authorised |
| Registers | Searchable records, ownership, version history, correction workflow and classification |
| Services | Published eligibility, required evidence, approved fees, service channels and status tracking |
| Approvals | Named decision authority, separation of duties, legal basis and recorded reasons |
| Documents | Templates, signed decisions, certificates, delivery receipts and revocation/correction history |
| Exchange | Purpose-limited, law-cited requests and responses to other institutions |
| Reporting | Aggregated indicators with source, timestamp, definition and quality status |
| Administration | Staff, roles, locations, delegated authority, queues and operational configuration |
| Audit | Record reads, exports, edits, decisions, failed access and privileged actions |

Critical implementation rule: a case workflow cannot itself confer legal power. The workflow may only execute an action if the configured authority, applicable legal provision, effective date and required approvals are valid.

C. Detailed institutional specifications

1. Civil Registration and National Identity

Departments

- Birth, death and marriage registration
- Corrections, late registration and disputed records
- Certificates and certified extracts
- Identity enrolment and credential issuance
- Identity verification and credential revocation
- Fraud referrals and duplicate-identity resolution
- Records preservation and authorised statistical reporting

Core records

| Record | Key fields | Ownership rule |
|---|---|---|
| Vital event | Event type, occurrence date, registration date, location, source evidence, registrar, status | CRVS authority |
| Person identity | Internal person reference, identity-resolution status, verified attributes, linked event references | Assigned identity authority |
| Credential | Credential type, issuer, issue date, expiry if applicable, status | Credential issuer |
| Correction case | Requested change, evidence, reason, reviewer, legal authority, outcome | Authority responsible for the source record |
| Verification request | Requesting institution, purpose, permitted attributes, legal basis, result, timestamp | Verification service; source register retains its own audit |

The UN Legal Identity Agenda describes legal identity as lifecycle-oriented and links civil registration, vital statistics and identity management. CivicOS should implement that as controlled references between independently governed records, not a single editable “citizen profile” shared by all government institutions.

UN Legal Identity Agenda

+1

Workflow: birth registration

1. Receive a registration application from an authorised channel.
2. Capture evidence and the source of each claimed attribute.
3. Validate completeness and any legally required attestations.
4. Route exceptions, conflicting claims or late registrations to an authorised reviewer.
5. Record the legal provision and version that empowers the registrar.
6. Require a second distinct authorised official to confirm the registration where the national rules or CivicOS’s configured high-impact policy require it.
7. Issue the approved record and certificate; record delivery.
8. Notify the identity authority only through an approved exchange.
9. Retain the original, amendments, approvals and audit events.

The same pattern should apply to deaths, marriages, corrections and revocations, with different evidence and legal rules. CivicOS must not invent universal evidence requirements or registration deadlines.

Example application schema

```json
{
  "form_id": "crvs.birth-registration",
  "version": "1.0",
  "fields": [
    {"id": "child_name", "type": "text", "required": true},
    {"id": "date_of_birth", "type": "date", "required": true},
    {"id": "place_of_birth", "type": "location_reference", "required": true},
    {"id": "informant", "type": "person_reference", "required": true},
    {"id": "evidence", "type": "evidence_collection", "required": true},
    {"id": "declaration", "type": "attestation", "required": true}
  ],
  "rules": {
    "legal_basis": "required_from_national_law_registry",
    "evidence_rules": "configured_by_authorised_jurisdiction",
    "approval_policy": "configured_by_law_and_risk_policy",
    "sample_data_in_production": false
  }
}
```

This is a proposed form contract, not a statement that every country legally requires precisely these fields.

Identity verification response

A consuming institution should request only the attributes it needs. For example, a service may need to know whether an identity credential is valid, rather than receiving the person’s complete registration history.

A verification response should contain:

- Request identifier and requesting institution
- Declared purpose and approved legal basis
- Attributes requested and attributes actually returned
- Verification result and its meaning
- Source register and source-record version
- Timestamp, expiry or freshness metadata
- Audit reference and any restrictions on reuse

Roles and access

- Registrar: create and process assigned registrations.
- Senior registrar: review designated exceptions and corrections.
- Credential officer: issue or revoke credentials under delegated authority.
- Records custodian: manage authorised archival functions.
- Auditor: review evidence and events without silently changing records.
- Identity verification service: return only approved attributes.
- Independent privacy oversight: inspect access and investigate misuse, without inheriting unrestricted operational access.

National-twin indicators

Birth and death registration completeness, median processing time, pending cases by age band, correction rates, unresolved identity conflicts and certificate delivery performance. Every indicator needs a defined denominator, reporting period, source, freshness and coverage limitations. Missing data must display as missing, not zero.

2. Health Ministry and Health Service Authority

CivicOS should first deliver a health administration and service-management workspace, not attempt to replace every hospital’s electronic medical record.

WHO guidance distinguishes routine health information systems, workforce information systems, logistics systems and authoritative facility lists. WHO’s facility-list guidance specifies a unique identifier, location, type and name as minimum facility-list elements.

WHO

+2

Departments and modules

- Health policy, planning and performance
- Facility licensing and accreditation
- Health workforce registry
- Public-health programme administration
- Medicine and medical-supply logistics
- Inspection and compliance
- Facility capacity and infrastructure
- Budget, procurement and grants
- Health statistics and reporting
- Complaints and service-quality investigations

Authoritative records

| Register | Minimum fields |
|---|---|
| Health facility | Unique facility ID, name, type, location, operator, authorised services, operational status, verification date |
| Health professional | Professional reference, verified qualifications, registration authority, licence status, scope of practice where authorised |
| Inspection | Facility, inspection type, findings, evidence, inspector, corrective action, due date defined by applicable rules |
| Supply item | Product identifier, unit, lot/batch where relevant, quantity, location, expiry where relevant, transaction reference |
| Programme | Programme identifier, approved eligibility, coverage definition, budget reference, reporting period |
| Facility report | Reporting facility, indicator definitions, period, submitted values, validation state, corrections and provenance |

Clinical data should be held in a dedicated clinical system or segregated clinical domain with its own access policies. A health ministry dashboard does not grant all ministry employees access to diagnoses, prescriptions or patient histories.

Workflow: facility licence

1. Application by the facility operator.
2. Validation of identity, premises and required evidence.
3. Inspection assignment to an authorised inspector.
4. Findings and evidence entered under the inspector’s account.
5. Review against the applicable licensing rules.
6. Approval, refusal or conditional outcome by the legally authorised decision-maker.
7. Notice issued with reasons, legal basis and appeal or review information where applicable.
8. Register updated and the public-facing licence status published only to the extent legally permitted.

Facility registration form

```json
{
  "form_id": "health.facility-registration",
  "version": "1.0",
  "fields": [
    {"id": "facility_name", "type": "text", "required": true},
    {"id": "facility_type", "type": "controlled_vocabulary", "required": true},
    {"id": "operator_reference", "type": "organisation_reference", "required": true},
    {"id": "location", "type": "geospatial_point", "required": true},
    {"id": "services_offered", "type": "controlled_multiselect", "required": true},
    {"id": "staffing_summary", "type": "structured_summary", "required": false},
    {"id": "premises_evidence", "type": "evidence_collection", "required": true}
  ],
  "decision": {
    "authority": "configured_health_licensing_authority",
    "legal_basis": "required",
    "inspection_requirement": "configured_by_national_rules",
    "second_approval": "configured_by_law_or_policy"
  }
}
```

Roles

Facility administrator, licensing officer, inspector, programme manager, supply-chain officer, authorised statistician, clinical-system operator, decision-maker and auditor. Each role must be scoped by facility, jurisdiction, task and data classification—not merely job title.

National-twin indicators

- Active licensed facilities by type and region
- Facility-list completeness and last verification
- Facility-reported service availability
- Workforce counts by approved professional category
- Essential-supply availability where reliable inventory feeds exist
- Inspection and corrective-action status
- Reporting completeness and lateness
- Programme coverage where the denominator and data source are documented

Never present a count of registered facilities as a count of operational facilities unless operational status has been verified to a defined standard.

3. Education Ministry and Education Authorities

UNESCO’s Education Management Information System (EMIS) guidance treats the system as the combined processes, people, rules and technology used to collect, maintain, analyse and disseminate education information. It also stresses data-quality definitions and processes.

Educational Management Information Systems

+1

Departments and modules

- School and education-provider registration
- School-year and calendar administration
- Student enrolment and transfers
- Teacher and workforce administration
- Curriculum and examination administration
- Qualifications and certification
- School inspections and accreditation
- Grants, budgets and school procurement
- Attendance and completion reporting
- Education statistics and planning

Register ownership

- Education authority: school register, approved programmes and official education-provider status.
- School: its operational enrolment, attendance and assessment records, subject to national rules.
- Examination or qualification authority: authoritative examination outcomes and issued credentials.
- Teacher-registration authority: professional status where legally assigned.
- National statistics authority: official statistical outputs where assigned, not automatic ownership of every underlying student record.

Workflow: school registration

1. School operator submits an application and ownership/operator evidence.
2. The system validates mandatory fields and identifies missing documents.
3. A designated inspector evaluates premises and required compliance.
4. An authorised officer reviews findings and the legal criteria.
5. The decision is recorded with the applicable law, version and reasons.
6. Approved school status, permitted education levels and effective dates are registered.
7. Renewal, suspension or closure follows a separately configured process.

School registration form

```json
{
  "form_id": "education.school-registration",
  "version": "1.0",
  "fields": [
    {"id": "school_name", "type": "text", "required": true},
    {"id": "operator", "type": "organisation_reference", "required": true},
    {"id": "school_levels", "type": "controlled_multiselect", "required": true},
    {"id": "location", "type": "location_reference", "required": true},
    {"id": "facilities", "type": "structured_checklist", "required": true},
    {"id": "staffing", "type": "structured_summary", "required": false},
    {"id": "supporting_documents", "type": "evidence_collection", "required": true}
  ],
  "decision": {
    "authority": "configured_education_authority",
    "legal_basis": "required",
    "inspection_rules": "country_configured",
    "appeal_rules": "country_configured"
  }
}
```

Student privacy boundary

The national twin may show school-level or appropriately aggregated indicators such as enrolment, attendance and completion. It must not expose named student lists, individual marks, disability details, disciplinary histories or household circumstances to general government dashboards.

KPIs

- Registered schools by type and location
- School-register verification coverage
- Enrolment and attendance rates, with denominators and methodology
- Teacher vacancies where the staffing data is complete
- Examination participation and completion
- School inspections completed against the approved plan
- Data-submission completeness, timeliness and correction rates

Do not infer learning quality solely from attendance or examination scores, and do not create an automated student risk score that becomes a basis for consequential decisions without lawful authority, safeguards and human review.

4. Immigration and Passport Authority

Departments

- Visa and entry-permission processing
- Residence and work-permit administration
- Passport and travel-document issuance
- Extension, renewal and status-change cases
- Border-service coordination
- Returns and removal proceedings where legally authorised
- Refugee or protection-related administration where assigned by law
- Fraud investigation and document verification
- Appeals and administrative review

Immigration and asylum/protection responsibilities vary significantly by country. CivicOS must let a country assign these functions to different institutions rather than assume one agency controls every migration-related decision.

Core records

- Application and applicant reference
- Travel document and issuing authority
- Permit type, conditions, validity and status
- Entry/exit event, source system and confidence
- Evidence bundle and verification results
- Decision, decision-maker, legal basis and reasons
- Notice and delivery record
- Review, appeal or court referral
- Audit and authorised inter-agency disclosure history

ICAO Doc 9303 provides international specifications for machine-readable travel documents. Use its applicable parts for document formats and validation, while keeping national issuance law, eligibility and decision-making rules separately configurable.

ICAO

+1

Workflow: residence permit

1. Intake and identity/document verification.
2. Select the permit category under the national rules.
3. Validate required evidence and applicable fees, if any.
4. Request additional evidence where permitted.
5. Route security, eligibility or exception checks only to authorised units.
6. Have an authorised official decide the case.
7. Require a second distinct approver for categories explicitly configured as dual-control.
8. Issue the decision, reasons and appeal information required by law.
9. Update permit status and issue or renew a credential where approved.
10. Record every disclosure to border, police or other authorities.

Example application fields

```json
{
  "form_id": "immigration.residence-permit",
  "version": "1.0",
  "fields": [
    {"id": "applicant_reference", "type": "person_reference", "required": true},
    {"id": "permit_category", "type": "configured_permit_type", "required": true},
    {"id": "travel_document", "type": "document_reference", "required": true},
    {"id": "requested_validity", "type": "date_range", "required": true},
    {"id": "purpose_and_basis", "type": "structured_claim", "required": true},
    {"id": "supporting_evidence", "type": "evidence_collection", "required": true},
    {"id": "fee_reference", "type": "approved_tariff_reference", "required": false}
  ],
  "decision": {
    "legal_basis": "required",
    "decision_authority": "configured_by_permit_category",
    "automated_final_decision": false
  }
}
```

Access boundaries

An officer should see only cases within their assigned remit. Border staff may need to validate document status or conditions, not read an applicant’s full case file. Police access must be grounded in a specific legal power and purpose. Seniority alone must not confer unrestricted access.

Indicators

Applications received and decided, pending-case age bands, processing time by permit category, renewal volumes, refusal and appeal outcomes, document-revocation events, and data-quality issues. Comparisons must account for case category and reporting period.

5. Labour and Employment Authority

Modules

- Employer and workplace registration where assigned
- Jobseeker and employment-service administration
- Employment programmes and training referrals
- Workplace inspections
- Occupational safety and health compliance
- Labour complaints and dispute referrals
- Work-permit verification through an approved exchange
- Employment statistics

Registers

Employer, workplace, inspection, complaint, corrective order, employment-service case, programme participation, referral and published occupational classifications.

Workflow: workplace complaint

1. Accept a complaint through an authorised channel, including assisted or paper intake.
2. Record the allegation separately from verified findings.
3. Apply confidentiality and any lawful anonymity protections.
4. Assess jurisdiction and assign an authorised officer.
5. Collect evidence and record inspection activities.
6. Notify affected parties where required.
7. Record findings and any legally authorised order.
8. Provide review or appeal routes where applicable.
9. Close only when the defined closure criteria are satisfied.

Complaint form

```json
{
  "form_id": "labour.workplace-complaint",
  "version": "1.0",
  "fields": [
    {"id": "workplace_reference", "type": "organisation_or_location_reference", "required": true},
    {"id": "issue_category", "type": "controlled_vocabulary", "required": true},
    {"id": "incident_period", "type": "date_or_date_range", "required": true},
    {"id": "description", "type": "long_text", "required": true},
    {"id": "evidence", "type": "evidence_collection", "required": false},
    {"id": "contact_preference", "type": "contact_method", "required": true},
    {"id": "confidentiality_request", "type": "restricted_flag", "required": false}
  ],
  "rules": {
    "allegation_is_not_a_finding": true,
    "case_visibility": "restricted_by_role_and_assignment",
    "retaliation_protections": "configured_by_law"
  }
}
```

Indicators: inspections completed, outstanding corrective actions, complaint age bands, resolution time, repeat findings and employment-service outcomes. Do not publish identifying complainant details or imply that an allegation is a proven violation.

6. Social Protection and Benefits Authority

This module is especially sensitive because a wrong decision can affect housing, food, income or access to essential services. Digital transformation should improve accessibility and administrative consistency without making it impossible to appeal or correct an error. The ILO’s comparative study of social-security administration describes both the opportunities and implementation challenges of digital service delivery.

International Labour Organization

Modules

- Programme and benefit-rule configuration
- Application intake and assisted applications
- Eligibility evidence and verification
- Benefit calculation under approved rules
- Human review and decision
- Payment instruction and reconciliation
- Reassessment and change reporting
- Appeals and complaints
- Fraud referrals with due process
- Programme reporting

Benefit case record

- Claimant reference and authorised household links
- Benefit programme and rule version
- Application and evidence dates
- Evidence source and verification status
- Relevant eligibility facts, with provenance
- Calculation inputs, outputs and rule version
- Human reviewer and final decision-maker
- Decision reasons and notice
- Payment instruction and reconciliation status
- Review or appeal status
- Access and disclosure events

Benefit application form

```json
{
  "form_id": "social-protection.benefit-application",
  "version": "1.0",
  "fields": [
    {"id": "applicant_reference", "type": "person_reference", "required": true},
    {"id": "programme", "type": "configured_benefit_programme", "required": true},
    {"id": "household_information", "type": "minimum_required_structure", "required": false},
    {"id": "income_or_resource_evidence", "type": "evidence_collection", "required": false},
    {"id": "other_eligibility_evidence", "type": "evidence_collection", "required": true},
    {"id": "payment_preference", "type": "approved_payment_method", "required": true},
    {"id": "declaration", "type": "attestation", "required": true}
  ],
  "decision": {
    "eligibility_rules": "approved_versioned_rule_set",
    "calculation": "reproducible_and_auditable",
    "final_decision": "authorised_human_decision_maker",
    "appeal_route": "configured_by_law"
  }
}
```

The schema deliberately makes some fields conditional. A universal form that collects all household, health, financial and identity information for every programme would be excessive. Each programme should request only the evidence its lawful eligibility rules require.

Controls

- Benefits cannot be denied solely because an external database is unavailable.
- A mismatch is a discrepancy to resolve, not proof of fraud.
- Automated calculations must show the rule version and inputs used.
- Affected people must receive an understandable explanation of the decision, subject to applicable law.
- Reassessment and correction must not erase the earlier decision or its evidence.
- Appeals must be assigned to a role with appropriate independence from the original decision.
- No universal government-wide “risk score” for a person or household.

Indicators: applications received, decisions by programme and period, processing time, payment success, unresolved reconciliation cases, appeals and overturn rates, correction rates, and accessible-channel usage. Interpret approval and refusal rates in context rather than treating one rate as a quality target.

7. Agriculture, Livestock and Food Authority

Modules

- Farmer and agricultural-business registration
- Farm and production-unit records
- Crop and livestock programmes
- Veterinary and plant-health inspection
- Agricultural inputs and subsidy administration
- Food-safety and traceability oversight
- Extension services and training
- Drought, flood and pest-response coordination
- Agricultural market and production statistics

Record ownership boundaries

The agriculture authority may maintain farm-operation and programme records. It should not become the owner of legal land title unless the nation explicitly assigns that responsibility. FAO’s SOLA land-administration work illustrates a dedicated approach to official land registration and cadastral processes.

FAO

Core records

- Farmer or operator registration
- Farm operation and geospatial boundary, where lawful
- Crop-season declaration
- Livestock holding and animal identifiers where applicable
- Inspection and laboratory results
- Subsidy application and payment reconciliation
- Agricultural input distribution
- Extension-service visit
- Food-safety incident and corrective action
- Production estimate, method and reporting period

Workflow: agricultural support grant

1. Publish the approved programme and eligibility rules.
2. Accept applications through digital, assisted and field channels.
3. Verify only the required eligibility facts.
4. Record field inspections or supporting evidence where required.
5. Apply the approved calculation method.
6. Have the authorised officer decide the claim.
7. Send approved payment instructions to the treasury/payment service.
8. Record payment confirmation or failure.
9. Provide an appeal or correction path.
10. Report programme outputs separately from estimated economic impact.

Farm support form

```json
{
  "form_id": "agriculture.support-application",
  "version": "1.0",
  "fields": [
    {"id": "applicant_reference", "type": "person_or_organisation_reference", "required": true},
    {"id": "farm_reference", "type": "farm_record_reference", "required": true},
    {"id": "programme", "type": "configured_programme", "required": true},
    {"id": "production_period", "type": "date_range", "required": true},
    {"id": "eligible_activity", "type": "controlled_vocabulary", "required": true},
    {"id": "supporting_evidence", "type": "evidence_collection", "required": true},
    {"id": "payment_destination", "type": "approved_payment_reference", "required": true}
  ],
  "decision": {
    "eligibility": "approved_programme_rules",
    "inspection": "configured_if_required",
    "payment": "treasury_reconciliation_required"
  }
}
```

Indicators: registered active operators, programme applications and payments, verified farm coverage, inspection completion, livestock or crop reports, input-distribution reconciliation and response times. Estimates of crop yield or food production must be marked as reported, measured or modelled; they must not be presented as verified production merely because they appear in the system.

8. Water and Sanitation Authority

Modules

- Water abstraction and use permits where assigned
- Water utility and service-provider registration
- Water infrastructure asset management
- Drinking-water and wastewater quality oversight
- Sanitation inspections
- Water-service interruption reporting
- Environmental or catchment coordination
- Capital-project monitoring
- Complaints and service requests

Registers

Permit, water source, utility, infrastructure asset, sampling event, laboratory result, inspection, non-compliance case, service interruption and remediation project.

Workflow: water permit

Application → source and location validation → technical assessment → any required environmental review → authorised decision → permit conditions and validity → compliance monitoring → renewal, amendment or revocation.

The workflow must not assume that a water authority controls land ownership, environmental approval or every abstraction right. Such responsibilities are assigned explicitly through the national authority and relationship registers.

Water permit form

```json
{
  "form_id": "water.abstraction-permit",
  "version": "1.0",
  "fields": [
    {"id": "applicant", "type": "person_or_organisation_reference", "required": true},
    {"id": "water_source", "type": "water_source_reference", "required": true},
    {"id": "location", "type": "geospatial_geometry", "required": true},
    {"id": "intended_use", "type": "controlled_vocabulary", "required": true},
    {"id": "requested_quantity", "type": "quantity_with_unit", "required": true},
    {"id": "requested_period", "type": "date_range", "required": true},
    {"id": "technical_evidence", "type": "evidence_collection", "required": true}
  ],
  "decision": {
    "legal_basis": "required",
    "environmental_review": "configured_by_jurisdiction",
    "permit_conditions": "structured_and_versioned"
  }
}
```

Indicators: permits by status, service-provider coverage, verified infrastructure assets, sampling compliance, unresolved quality incidents, interruption duration and remediation status. Water-quality figures must include sampling location, timestamp, method and source; an old result is not evidence of current quality.

9. Professional Licensing and Accreditation Authorities

This archetype applies to professions such as medicine, nursing, law, engineering, teaching, surveying or any other profession regulated under national law.

Modules

- Professional and institutional registration
- Qualification verification
- Initial licensing
- Renewal and continuing requirements
- Scope-of-practice or credential conditions
- Complaints and disciplinary proceedings
- Licence suspension and restoration
- Accreditation of education or training providers
- Public verification service
- Appeals and independent review where applicable

Records

Professional identity reference, qualifications, verification sources, registration category, licence number, validity and status, restrictions that are lawfully disclosable, continuing requirements, case history and decision record.

Workflow: initial licence

1. Applicant submits the application and required qualifications.
2. The authority verifies evidence with issuing institutions or authorised verification services.
3. A licensing officer records completeness and any discrepancies.
4. The authorised decision-maker applies the configured statutory criteria.
5. The decision, legal basis and reasons are recorded.
6. A credential is issued or the application refused.
7. A minimum-data public verification endpoint reports only permitted information.
8. Renewal, suspension, restoration and appeal follow separate procedures.

Application form

```json
{
  "form_id": "professional-licensing.initial-application",
  "version": "1.0",
  "fields": [
    {"id": "applicant_reference", "type": "person_reference", "required": true},
    {"id": "profession", "type": "configured_profession", "required": true},
    {"id": "qualification_records", "type": "evidence_collection", "required": true},
    {"id": "issuing_institutions", "type": "organisation_reference_list", "required": true},
    {"id": "practice_category", "type": "configured_scope_category", "required": true},
    {"id": "declarations", "type": "attestation_collection", "required": true}
  ],
  "decision": {
    "licensing_authority": "configured_by_profession",
    "qualification_verification": "recorded_with_source",
    "legal_basis": "required",
    "disciplinary_information": "separately_restricted"
  }
}
```

Public verification: show only the legally publishable minimum—typically a licence identifier, profession, current status and issuing authority where disclosure is authorised. Do not expose addresses, identity-document numbers, personal contact details or unsubstantiated complaints.

Indicators: applications, renewal workload, verification turnaround, licence status distribution, unresolved cases, decisions under review and accreditation status.

D. The cross-institution exchange contract

These nine institutional archetypes must work together without turning CivicOS into a universal-access database.

The exchange layer should support a request, a decision to authorise or refuse it, a minimum-data response, and a verifiable record of the transaction. The requesting institution does not gain permanent access simply because an earlier request was approved.

Example: benefit application needs identity verification

01 · REQUEST

Benefits Authority

Requests confirmation that an applicant's identity credential is valid, specifying the purpose and legal authority.

02 · AUTHORISE

Sovereign exchange service

Validates the requesting role, purpose, legal basis, permitted attributes and relevant relationship between institutions.

03 · RESPOND

Identity Authority

Returns the permitted verification result—or a refusal with a reason code. It does not disclose the entire identity record by default.

04 · AUDIT

Both institutions retain evidence

The request, decision, response attributes, source version, timestamps and audit references are recorded.

This pattern should be reusable for education credential verification, professional licensing, immigration document verification, authorised payment-status checks and other approved exchanges.

Exchange request schema

```json
{
  "request_id": "generated-unique-id",
  "requesting_institution": "configured-institution-id",
  "receiving_institution": "configured-institution-id",
  "purpose_code": "approved-purpose",
  "legal_basis": {
    "instrument_id": "national-law-record-id",
    "version_id": "effective-version-id",
    "provision": "specific-provision"
  },
  "requested_attributes": ["credential_status"],
  "subject_reference": "purpose-limited-reference",
  "requested_at": "timestamp",
  "decision": {
    "status": "pending",
    "authorised_attributes": [],
    "reason_code": null
  }
}
```

This is a structural example, not a production request with real data. Production implementations must use a defined timestamp format, validated identifiers, authenticated service identities and cryptographic integrity controls.

Mandatory exchange rules

- Deny by default if the requester, purpose, authority or applicable relationship is not valid.
- Do not treat a ministry-wide account as sufficient authority to access another institution.
- Use purpose-specific attributes and narrowly scoped service credentials.
- Log reads and exports, not only changes.
- Separate technical delivery from legal authorisation.
- Apply retention, correction and deletion rules according to applicable law.
- Provide a controlled emergency-access procedure only where legally permitted, with mandatory review.
- Never let an AI agent approve a disclosure or make a legally material decision.

E. Fieldwork, offline operations and legacy systems

CivicOS must work beyond central offices. Registrars, inspectors, health-facility assessors, education officers, agricultural extension workers and water inspectors may operate with unreliable connectivity.

Field/mobile requirements

| Capability | Required behaviour |
|---|---|
| Offline capture | Store permitted draft records locally with encryption and device controls |
| Evidence | Capture files, timestamps and location only when justified and permitted |
| Synchronisation | Queue changes, identify conflicts and preserve the original submission |
| Conflict resolution | Route material conflicts to an authorised human; never silently overwrite authoritative records |
| Device management | Register devices, enforce session expiry and revoke lost devices |
| Field assignment | Scope work by institution, geography, case and permitted actions |
| Accessibility | Support keyboard operation, screen readers, readable forms and low-bandwidth use |
| Paper continuity | Allow controlled paper intake and later reconciliation with the original evidence |
| Audit | Preserve who captured, amended, submitted and approved each record |

Offline mode must not grant new legal authority. For example, a field officer may collect evidence while offline, but the app must not represent a permit as issued until the legally required decision and confirmation have occurred.

Legacy integration

Each institution should have an integration inventory with:

- System owner and technical contact
- System of record for each data field
- Available API, file export, message queue or manual process
- Data dictionary and identifier mapping
- Legal authority and approved purpose for each data flow
- Frequency, latency and freshness expectations
- Reconciliation process and error queue
- Security classification and retention requirements
- Migration plan and exit strategy

For paper-based operations, CivicOS should provide controlled intake, scanning, indexing, verification and reconciliation. Digitising a document does not automatically make its contents verified or legally authoritative.

F. National twin: operational measures, not invented national facts

The CivicOS national twin should distinguish the operational performance of the government system from claims about the real world.

For example, “registered facilities” is a register-derived count. “Facilities currently providing a particular service” requires an explicit definition and sufficiently current evidence. A modelled estimate of agricultural production must not be presented as an observed quantity.

Use this common indicator contract:

```json
{
  "indicator_id": "health.active_facilities",
  "definition": "Facilities meeting the configured active-status criteria",
  "value": null,
  "unit": "facilities",
  "period": {
    "start": null,
    "end": null
  },
  "geography": null,
  "source": {
    "institution_id": "configured-source-owner",
    "register_id": "health-facility-register",
    "source_version": null
  },
  "provenance": "not_connected",
  "last_updated": null,
  "quality": {
    "coverage": "unknown",
    "validation_status": "not_assessed"
  }
}
```

The provenance vocabulary should include:

- observed — directly measured or recorded, with a defined method.
- reported — supplied by an identified reporting source.
- modelled — estimated by a documented model.
- sample — illustrative or test data.
- not_connected — no live source currently supplies the indicator.

A production dashboard should display “Not connected” or “Data unavailable” rather than inventing a plausible-looking figure.

G. How to measure completion for this group

An institution is not production-ready merely because its screen exists. CivicOS should evaluate readiness at the level of each department, service, register and workflow.

Readiness dimensions

Legal grounding

Approved mandate, effective legal provisions, authorised decision-makers and valid delegations.

Configuration

Services, forms, rules, records, classifications and approval routes are configured.

Staffing

Named authorised roles exist; required separation of duties is satisfied.

Operational data

Real records or a verified migration exist; no sample data is mixed into production.

Connectivity

Required exchanges, legacy integrations and payment or notification dependencies are tested.

Security and oversight

Access boundaries, audit, privacy review, recovery and incident procedures are tested.

Service acceptance

End-to-end workflows, notices, corrections and applicable appeals work in practice.

Each dimension should have an evidence reference, owner, verification date and status. Readiness must be derived from recorded evidence, not manually set to “100%” by an administrator without proof.

Acceptance tests for Part 2

1. A civil registrar can register and correct a vital event without granting other institutions unrestricted edit access.
2. An identity verification request returns only authorised attributes and records the requesting institution and purpose.
3. A health-facility licensing case cannot be approved by an account lacking the configured legal authority.
4. The health ministry cannot search unrestricted patient records simply because it administers health facilities.
5. A school officer cannot access unrelated schools’ identifiable student records without an approved purpose and scope.
6. An immigration decision retains its legal basis, evidence, reasons, notices and review history.
7. A social-benefit calculation can be reproduced from its recorded inputs and versioned rules.
8. An unavailable external source does not automatically convert missing evidence into an adverse decision.
9. An agriculture subsidy payment can be reconciled with the authoritative payment service.
10. A water inspection preserves the original finding when a later correction is made.
11. A public professional-licence verification endpoint excludes restricted personal and disciplinary information.
12. Offline field submissions synchronise without silently overwriting an authoritative record.
13. The national twin shows source provenance and does not turn missing values into zero.
14. Training and demo records remain clearly labelled and cannot contaminate production registers.
15. A legally required second approval cannot be satisfied by the same person using a second account.

Part 2 conclusion

These institutions should share CivicOS’s identity and access services, legal registry, workflow engine, document service, notifications, audit infrastructure and controlled exchange layer. Their sensitive records, decision powers and operational responsibilities remain separately governed.

The standards cited here provide useful foundations: UN legal identity guidance for CRVS, WHO health-system information guidance, UNESCO EMIS guidance, ICAO travel-document specifications and FAO land-administration work. They do not remove the need for national legal mapping, data-protection assessment, local service design or operational validation.

UN Legal Identity Agenda

+4

Next: Part 3 of 6 — Justice, security, territory and infrastructure. It will cover courts, prosecution, corrections, police, emergency management, defence, local government, land and cadastre, transport, energy, environment, housing, public works and spatial/national-twin services, including the separation-of-powers and sensitive-record boundaries that apply to them.

## CivicOS — Part 3 of 6

Justice, security, territory and national infrastructure

This part covers the institutions that exercise coercive powers, administer justice, manage national territory and operate essential infrastructure.

These are among the most sensitive parts of CivicOS. A mistake in a ministry dashboard may produce a misleading report; a mistake in a court, police, corrections or land registry workflow can affect liberty, legal rights, property and public safety.

The central design rule is that shared technology must never erase separate legal authority. Courts must not become subordinate to the executive merely because they use the same platform. Police access must not imply unrestricted access to court records. Land, utility and infrastructure records must retain their legally designated owners.

The institution catalogue below is configurable by country. It is not a recommendation that every country create every listed agency or assign all functions to a single ministry.

A. Justice institutions

1. Judiciary and Court Administration

Institutional standing: The judiciary must be represented as an independent constitutional or statutory institution, according to the country's legal order—not as a department under the presidency or justice ministry.

UNODC guidance on judicial independence highlights the importance of keeping decisions about judicial functions, including case assignment, under judicial control. Digital case management should improve the administration of justice without creating a route for outside authorities to influence adjudication.

UNODC

+1

Departments and modules

- Court registry and case filing
- Case allocation and scheduling
- Judicial chambers and authorised case files
- Hearings and courtroom administration
- Judgments, orders and warrants
- Court fees and approved fee waivers
- E-filing and service of process
- Appeals and transfers between court levels
- Court records and archives
- Judicial statistics and operational planning
- Judicial conduct or complaints, where assigned to the judiciary or an independent body

Core records

| Record | Required information |
|---|---|
| Court case | Case ID, jurisdiction, case type, parties or protected references, filing date, procedural status |
| Filing | Filing party, document type, submission time, validation status and receipt |
| Assignment | Court, assigned judicial officer, assignment method, timestamp and authorised override reason |
| Hearing | Scheduled time, participants, access restrictions, attendance and outcome |
| Order or judgment | Issuing court, authorised judge, signed document, issue date, legal status and linked case |
| Appeal | Original decision, appeal court, filing status, deadlines as defined by law and outcome |
| Court fee | Approved tariff version, amount assessed, exemption or waiver and payment reconciliation |
| Service record | Recipient or authorised representative, method, delivery evidence and failure status |

Workflow: filing to judgment

1. Register the filing and issue a receipt.
2. Validate jurisdiction and procedural completeness.
3. Route filing defects to an authorised registry officer.
4. Allocate the case using the court's approved assignment procedure.
5. Record hearings, submissions, orders and service events.
6. Allow only authorised judicial officers to create or sign judicial decisions.
7. Preserve the signed decision and its status.
8. Manage appeals, corrections and enforcement referrals as separate authorised events.
9. Publish a redacted or public version only when disclosure is permitted.

Case filing schema

```json
{
  "form_id": "judiciary.case-filing",
  "version": "1.0",
  "fields": [
    {"id": "court_jurisdiction", "type": "configured_court_reference", "required": true},
    {"id": "case_category", "type": "configured_case_type", "required": true},
    {"id": "filing_party", "type": "person_or_organisation_reference", "required": true},
    {"id": "other_parties", "type": "restricted_party_collection", "required": true},
    {"id": "relief_sought", "type": "structured_text", "required": true},
    {"id": "filing_documents", "type": "signed_document_collection", "required": true},
    {"id": "confidentiality_request", "type": "restricted_flag", "required": false}
  ],
  "controls": {
    "case_assignment": "judiciary_controlled",
    "judicial_decision": "authorised_human_judge",
    "external_executive_override": false,
    "legal_basis": "required_for_material_actions"
  }
}
```

Roles

Court registrar, registry clerk, judge, authorised judicial assistant, court administrator, authorised enforcement officer, records officer and auditor. Access must be restricted by court, case assignment, procedural role and confidentiality classification.

Important distinction: an administrator may correct a data-entry error under an audited process, but must not silently change a judicial ruling. A judicial correction, appeal or reversal must be recorded as a legally meaningful event with its own authority and history.

KPIs

- Filings received and processed
- Case age by category and procedural stage
- Hearings scheduled, postponed and completed
- Time between defined procedural events
- Backlog using an explicit definition
- Unserved notices and unresolved filing defects
- Appeal volumes and outcomes, with context
- Availability of accessible filing and hearing services

Do not rank judges using crude case-count targets alone. Case complexity, procedural fairness and jurisdiction matter; a dashboard must not encourage hurried or biased decisions.

2. Prosecution and Public Legal Service

Countries may separate public prosecution, government legal representation, legal aid and other public legal services. CivicOS should model them as distinct institution types and grant each only its own powers.

Modules

- Referral intake from authorised investigative bodies
- Evidential review and case preparation
- Prosecution decisions and review
- Court filings and hearing preparation
- Disclosure and evidence exchange
- Victim and witness support coordination where assigned
- Legal advice to government, where authorised
- Legal aid application and assignment, where assigned

UNODC describes investigative and prosecution case-management systems as supporting the collection, validation and organisation of diverse evidence while preserving the confidentiality of different actors.

gocase.unodc.org

+2

Workflow: prosecution referral

Referral received → jurisdiction and completeness review → evidence index created → authorised prosecutor assesses the file → decision and reasons recorded → required disclosures prepared → court filing or other lawful outcome → case outcome reconciled with the court system.

A prosecution referral is not proof of guilt. An investigative allegation, prosecutorial decision, court finding and final appeal outcome must remain separate data states.

Access controls

- Investigators see their authorised investigative materials.
- Prosecutors see files assigned to their office and role.
- Defence disclosure follows the applicable law and procedural stage.
- Government legal advisers do not automatically gain access to criminal prosecution files.
- Court outcomes return through a controlled interface; the prosecution system cannot alter a court judgment.
3. Corrections, Prisons and Community Supervision

Modules

- Lawful admission and identity verification
- Sentence and custody-order validation
- Custody status and location
- Court appearances and transfers
- Healthcare coordination under defined confidentiality rules
- Rehabilitation and education programmes
- Visitor and communication administration
- Release planning and discharge
- Community-supervision cases where assigned
- Complaints, incidents and independent inspection

Core records: admission authority, custody event, sentence or order reference, review dates, transfer history, authorised restrictions, programme participation, health-service referral, release decision and discharge confirmation.

Workflow: admission

1. Receive the authorised custody document.
2. Verify the issuing authority and document status.
3. Record identity uncertainty without inventing certainty.
4. Validate the lawful basis and any relevant time limits.
5. Record admission, location and responsible officer.
6. Notify required parties through approved channels.
7. Reconcile release, transfer or amended orders with the authoritative issuing body.

Non-negotiable safeguard: the prison system must not generate a detention authority merely because a police or immigration record exists. Custody must be grounded in the appropriate lawful order or power. Release and review events must be tracked as carefully as admission.

KPIs: occupancy against a verified capacity definition, custody-status reconciliation, missed scheduled reviews, court-appearance coordination, programme access, complaints and release-processing performance. Do not use a single aggregate figure to conceal unsafe or materially different conditions across facilities.

4. Police and Law Enforcement

Police operational systems should be isolated from ordinary ministry administration and from other institutions' confidential case files. The police command workspace can share approved operational information without exposing every investigative detail.

Modules

- Incident and complaint intake
- Dispatch and command
- Patrol and field assignments
- Investigative case management
- Evidence and property custody
- Warrant and court-order verification
- Traffic and road-safety enforcement
- Missing-person processes where legally assigned
- Custody and detention records
- Complaints against officers and professional standards
- Internal affairs and oversight referrals
- Public safety reporting

UNODC's goCASE is one reference for structured investigative case management. It is an example of a specialised tool, not a reason to merge all investigative, intelligence, prosecution and court records into one unrestricted workspace.

gocase.unodc.org

+1

Police records

- Incident report and source
- Complaint or allegation
- Dispatch event and assigned units
- Investigation case and authorised objectives
- Person or object reference linked for a defined purpose
- Evidence item, collection event, custodian and transfer history
- Warrant or order reference and verification result
- Use-of-force or custody event where applicable
- Referral to prosecution, court or independent oversight
- Complaint against an officer and investigation status

Workflow: incident to case referral

1. Register the incident and identify whether it is an allegation, observation or confirmed event.
2. Assign dispatch or response based on authorised operational procedures.
3. Record actions, evidence and custody of evidence.
4. Separate the investigative narrative from verified facts and third-party statements.
5. Review the case before disclosure or referral.
6. Send an authorised referral to the prosecution or other competent authority.
7. Reconcile the outcome without allowing police staff to alter prosecutorial or judicial decisions.

Police incident form

```json
{
  "form_id": "police.incident-report",
  "version": "1.0",
  "fields": [
    {"id": "incident_type", "type": "configured_classification", "required": true},
    {"id": "reported_at", "type": "timestamp", "required": true},
    {"id": "incident_location", "type": "location_reference", "required": true},
    {"id": "reporting_source", "type": "restricted_source_reference", "required": true},
    {"id": "narrative", "type": "structured_text", "required": true},
    {"id": "persons_and_objects", "type": "purpose_limited_reference_collection", "required": false},
    {"id": "evidence_items", "type": "evidence_collection", "required": false},
    {"id": "response_actions", "type": "event_collection", "required": false}
  ],
  "controls": {
    "allegation_is_not_a_finding": true,
    "evidence_custody_is_traceable": true,
    "access": "purpose_and_assignment_scoped",
    "retention": "configured_by_law"
  }
}
```

Security and rights controls

- Record every search of sensitive police data.
- Require a stated purpose and appropriate authority for protected queries.
- Prevent bulk searches of the population without a specific lawful basis.
- Preserve the source and reliability of intelligence, including uncertainty.
- Keep public complaints and allegations distinct from substantiated findings.
- Restrict intelligence sources and witness-protection details.
- Require independent oversight for authorised categories of sensitive access.
- Make no automated prediction of criminality, guilt or future offending a legally material decision.

KPIs: response times using defined clock rules, incident-processing backlog, evidence-custody exceptions, referral completeness, complaint-resolution status and system availability. Arrest counts are not a sufficient measure of police performance.

5. Defence and National Security

Defence and intelligence organisations may require separate security domains, national-security classifications, personnel vetting and deployment restrictions. CivicOS should support integration only where the country has explicitly authorised it.

Possible modules

- Defence administration and personnel
- Equipment and logistics
- Procurement and asset maintenance
- Readiness reporting
- Emergency or civil-support coordination
- Authorised clearances and access governance
- Restricted operational reporting

Architecture boundary: general government accounts must not inherit defence access. National security data should not be copied into the ordinary national twin. Only explicitly approved, appropriately aggregated indicators may be shared.

Records and controls: asset register, maintenance event, supply movement, authorised assignment, clearance decision, security incident and continuity plan. Highly sensitive operational plans, intelligence sources and real-time force dispositions may need to remain in a separately accredited system rather than CivicOS's general institutional environment.

B. Emergency management and civil protection

6. National Emergency Management Authority

Emergency management connects hazard monitoring, warning, response and recovery. UNDRR describes effective early-warning systems as an end-to-end process encompassing risk knowledge, monitoring and forecasting, communication of authoritative warnings, and preparedness and response.

UNDRR

+1

Modules

- Hazard and risk register
- Incident and emergency declaration
- Situation reports and common operating picture
- Warning authorisation and dissemination
- Emergency coordination and resource requests
- Evacuation and shelter coordination
- Damage and needs assessment
- Recovery and reconstruction projects
- After-action reviews and lessons learned

Workflow: emergency event

1. Receive a verified or clearly labelled preliminary alert.
2. Record the source, time, location, confidence and affected area.
3. Assign an incident coordinator.
4. Escalate to the official with the authority to declare or classify the emergency.
5. Record authorised warnings and the channels used to disseminate them.
6. Track resource requests, assignments and delivery.
7. Record status updates and affected-area revisions.
8. Transition to recovery through an authorised handover.
9. Preserve an after-action record and the provenance of the situation data.

Emergency record schema

```json
{
  "event_id": "generated-event-id",
  "hazard_type": "configured-hazard",
  "source": {
    "source_id": "authoritative-source-id",
    "observed_at": null,
    "received_at": null,
    "confidence": "unknown"
  },
  "affected_area": {
    "geometry_reference": null,
    "version": null
  },
  "status": "unverified",
  "warning": {
    "authorised_by": null,
    "legal_basis": null,
    "issued_at": null,
    "channels": []
  },
  "updates": [],
  "provenance": "reported"
}
```

Important: an AI-generated forecast or a citizen report may help trigger review, but it must not be displayed as an officially authorised public warning unless the appropriate authority has approved it. Where a connected source is unavailable, the dashboard should clearly indicate that limitation.

Indicators: warning-delivery confirmation, time to acknowledge a verified incident, resource request fulfilment, shelter capacity with verification date, unresolved needs assessments and recovery milestones.

C. Territory, land and local government

7. Land Registry and Cadastre

Land administration is a foundational sovereign capability. The UN-GGIM Framework for Effective Land Administration provides a reference for modernising land administration while adapting to national legal and institutional circumstances.

GGIM

+1

Modules

- Cadastral parcels and boundaries
- Legal interests, ownership and tenure
- Registration of transfers and encumbrances
- Survey submissions and boundary changes
- Land-use restrictions and planning references
- Disputes and corrections
- Public extracts and title verification
- Land valuation where legally assigned
- Records archive and historical chain of title

Ownership rule: the institution that legally maintains the title register remains authoritative for title. The cadastral authority may maintain spatial parcels, and a planning authority may maintain zoning. CivicOS should connect these records by stable references instead of assuming that one register controls every land-related fact.

Core records

| Record | Fields |
|---|---|
| Parcel | Stable parcel ID, geometry reference, jurisdiction, area and survey provenance |
| Legal interest | Interest type, holder reference, legal instrument, registration status and effective dates |
| Transaction | Transaction type, parties, evidence, approvals and registration event |
| Encumbrance | Type, source instrument, status, priority if applicable and discharge event |
| Survey | Surveyor, method, reference system, submitted geometry and validation |
| Dispute | Parties, disputed interest or boundary, authority, status and outcome |
| Planning restriction | Planning authority, zone or restriction, instrument and effective period |

Workflow: transfer of registered interest

1. Receive the transaction and its supporting instrument.
2. Verify the identity and authority of the submitting parties.
3. Check the parcel and current registered interests.
4. Apply the applicable registration rules and required consents.
5. Route disputes, restrictions or inconsistencies to the authorised reviewer.
6. Register the transfer only when the required conditions are met.
7. Preserve the prior state and record the new registration event.
8. Notify connected services through approved, purpose-limited exchanges.

A land dispute must not be resolved merely by allowing an administrator to edit the parcel record. Corrections to boundaries, title or registered interests require the process and authority defined by national law.

Land registration form

```json
{
  "form_id": "land.register-interest-transfer",
  "version": "1.0",
  "fields": [
    {"id": "parcel_reference", "type": "authoritative_parcel_reference", "required": true},
    {"id": "current_interest_reference", "type": "registered_interest_reference", "required": true},
    {"id": "transaction_type", "type": "configured_transaction_type", "required": true},
    {"id": "transferring_parties", "type": "party_reference_collection", "required": true},
    {"id": "receiving_parties", "type": "party_reference_collection", "required": true},
    {"id": "legal_instrument", "type": "signed_document_reference", "required": true},
    {"id": "required_consents", "type": "evidence_collection", "required": false}
  ],
  "controls": {
    "authoritative_register": "configured_land_registry",
    "legal_basis": "required",
    "conflicts": "route_to_authorised_review",
    "history": "append_only_registration_events"
  }
}
```

National-twin indicators: registered parcels, proportion with verified spatial references, pending transactions, registration time by transaction type, unresolved boundary discrepancies and age of the latest verified cadastral survey. A parcel count must not be presented as a count of legally settled land claims.

8. National Mapping, Geospatial and Survey Authority

This authority maintains the geospatial foundations used by other institutions.

Modules

- National coordinate reference systems
- Administrative boundaries
- Authoritative topographic mapping
- Address and place-name registers where assigned
- Geospatial metadata catalogue
- Surveyor registration where assigned
- Aerial or satellite imagery management
- Data licensing and controlled geospatial services
- Spatial quality assurance

Records: dataset, version, custodian, coordinate reference system, geographic coverage, resolution, source date, publication status, licence and known limitations.

Required design decision: all spatial records must declare their coordinate reference system. Map layers should never be silently mixed when their projections or geometries are incompatible.

National twin use: display roads, parcels, facilities, flood exposure and infrastructure only as separate, traceable layers. A visually polished map must not imply that every layer is equally current, precise or authoritative.

9. Municipalities, Provinces and Regional Government

Local government requires its own institutional workspace and authority configuration. CivicOS must support unitary, federal, devolved and mixed constitutional structures.

Modules

- Local administration and elected-body support
- Municipal service requests
- Local permits and inspections
- Waste and sanitation operations
- Roads and local infrastructure
- Planning applications
- Local property and service charges where authorised
- Social and community services where assigned
- Local budget, procurement and assets
- Citizen participation and complaints

Records: locality, service request, permit, inspection, infrastructure asset, project, local budget, approved fee, resolution, delegated authority and local-service performance.

Workflow: local permit

Intake → jurisdiction check → completeness review → any required inspection or consultation → authorised decision → notice and fee assessment under approved rules → delivery and appeal route where applicable.

Access model: a municipal officer may access records within the municipality and their assigned functions. A national ministry may receive authorised reports or inspect records under a lawful power, but must not automatically acquire full write access to municipal registers.

Indicators: service-request resolution, permit processing, asset condition where assessed, project delivery, local budget execution and complaint status. Each indicator should identify whether it is municipal-reported, centrally verified or modelled.

D. Infrastructure and essential services

10. Transport and Road Authority

Modules

- Road and bridge asset registry
- Public transport and transport-service permits
- Vehicle and driver licensing where legally assigned
- Road safety and collision reporting
- Traffic-management coordination
- Infrastructure projects and maintenance
- Rail, port and aviation coordination where assigned
- Freight and logistics regulation
- Public transport performance

UNECE's transport work provides harmonised transport statistics and terminology, while its transport programme covers vehicle regulation, road safety, intelligent transport systems and infrastructure.

UNECE

+1

Registers

- Transport asset and condition inspection
- Road closure and restriction
- Vehicle or operator record where assigned
- Driver credential and status where assigned
- Accident or collision report
- Transport service and permit
- Infrastructure project and maintenance event
- Traffic observation and sensor source

Workflow: road defect report

1. Accept the report and its location.
2. Mark the source as citizen-reported, sensor-detected or officer-verified.
3. Triage according to an approved operational procedure.
4. Assign an inspection or maintenance task.
5. Record the verified condition and safety assessment.
6. Issue any required closure or traffic instruction through the authorised command process.
7. Record work completion and evidence.
8. Close only after the applicable acceptance check.

Indicators: asset inspections due, verified road defects, response and repair times, collision trends, service disruptions and maintenance completion. Accident data must have clear reporting and severity definitions; under-reporting should be visible as a quality limitation.

11. Energy and Utilities Authority

CivicOS should manage regulatory administration, assets, permits, projects and service reporting. It should not directly operate a power grid or industrial control system merely because a control-room interface exists.

NIST's industrial-control security guidance addresses the distinct availability, safety, reliability and security requirements of systems such as supervisory control and data acquisition (SCADA) and distributed control systems.

CSRC

+1

Modules

- Energy operator and facility licensing
- Generation, transmission and distribution asset registry
- Renewable-energy permits and project approvals
- Energy-service performance reporting
- Outage and restoration reporting
- Fuel and critical-supply oversight where assigned
- Regulatory inspections and compliance
- Infrastructure project tracking
- Tariffs and approved rate publication

Core records: operator, facility, grid asset, capacity unit, permit, inspection, outage event, restoration event, project, tariff instrument and reported generation.

Workflow: generation-facility permit

Application → legal and technical completeness → required environmental or planning coordination → technical assessment → authorised decision → permit and conditions → compliance inspections → amendment, renewal or revocation.

Boundary: operational grid commands belong to the appropriately secured utility or control environment. CivicOS may consume approved telemetry or outage summaries, but must not expose control commands through ordinary institutional accounts.

Indicators: reported installed capacity, actual generation when supplied by an identified source, outages, restoration time, permit workload and project status. Nameplate capacity, actual output and forecast output must remain distinct measures.

12. Environment and Natural Resources Authority

Modules

- Environmental permits and assessments
- Pollution incidents
- Water, air and soil monitoring coordination
- Protected areas and biodiversity records
- Forestry and natural-resource permits where assigned
- Environmental inspections and enforcement
- Waste management oversight
- Climate and environmental reporting
- Restoration and remediation projects

Records: permit, environmental assessment, sampling event, laboratory result, incident, inspection, enforcement action, protected-area boundary, remediation plan and monitoring observation.

Workflow: environmental permit

Application → jurisdiction and completeness review → required assessment and public consultation where applicable → technical review → decision by the competent authority → permit conditions → monitoring and inspections → corrective action or lawful enforcement.

Indicators: permit processing, monitored sites, sampling coverage, verified environmental incidents, compliance actions, restoration projects and data completeness. Do not present a single sensor reading as a national environmental condition. Sampling method, location, timestamp, detection limit and source must be retained where applicable.

13. Housing, Planning and Building Control

Modules

- Spatial plans and zoning
- Planning applications
- Building permits
- Construction inspections
- Occupancy and completion certificates
- Housing programmes and public housing assets
- Land-use enforcement
- Developer and contractor records where authorised
- Building-safety remediation
- Urban development projects

Records: planning zone, parcel reference, development application, building design documents, permit, inspection, completion certificate, occupancy status and enforcement case.

Workflow: building permit

1. Receive the application and link the relevant parcel.
2. Validate required drawings and supporting documents.
3. Check applicable planning and building requirements.
4. Request required technical assessments or inspections.
5. Record review findings and any conditions.
6. Obtain approval from the legally authorised decision-maker.
7. Issue the permit and retain the approved document version.
8. Record inspections and completion or occupancy decisions as distinct events.

Controls: a permit must refer to the approved design version. An amended design requires a controlled change process. Planning permission, building approval, ownership and occupancy are separate legal states; CivicOS must not collapse them into one “approved” flag.

14. Public Works and Government Infrastructure

Modules

- Capital-project pipeline
- Project approval and funding
- Procurement coordination
- Contract and milestone tracking
- Site inspections and acceptance
- Asset handover
- Maintenance plans
- Contractor performance
- Variation and claims management
- Project risk and issue tracking

Records: project, business case, funding approval, procurement reference, contract, milestone, inspection, change order, payment certification, completion evidence and asset handover.

Workflow: infrastructure project

Proposal → feasibility and authorised business case → budget approval → procurement process → contract award → mobilisation → milestone verification → approved payment certification → completion and asset handover → operational maintenance.

Indicators: project status by approved milestone, committed and paid amounts from reconciled financial records, schedule variance against a versioned baseline, change orders, inspection defects and maintenance backlog. Do not present forecast cost or expected completion as actual performance.

E. Cross-institution boundaries and information exchange

The most important architectural decision is to connect justice, police, land and infrastructure through explicit relationships rather than broad, implicit permissions.

| From | To | Permitted exchange example | Must not imply |
|---|---|---|---|
| Police | Prosecution | Authorised case referral and evidence index | Prosecution agrees with the allegation |
| Prosecution | Judiciary | Court filing and authorised disclosure | Prosecutors can modify court records |
| Judiciary | Corrections | Valid custody, sentence, transfer or release order | Corrections can invent or alter a judicial order |
| Land Registry | Planning Authority | Parcel reference and authorised title verification | Planning authority owns the title register |
| Mapping Authority | Other institutions | Versioned spatial layers and metadata | Every map layer is legally authoritative |
| Emergency Authority | Police and utilities | Authorised incident assignments and situation updates | Emergency status grants unrestricted access to all records |
| Energy Regulator | Utility operator | Permit, compliance and reporting requests | Regulator can operate industrial control systems |
| Municipal Government | National Government | Authorised service reports and statutory submissions | National ministries automatically control local records |

Every exchange must specify the source, recipient, purpose, legal basis, data attributes, effective period, authorisation outcome and audit reference.

F. National twin: indicators for justice, territory and infrastructure

These institutional indicators can feed CivicOS's national digital twin, but they should remain separate from any broader claim about national performance.

| Domain | Candidate indicators | Essential qualification |
|---|---|---|
| Courts | Case backlog, filing-to-disposition time, hearing completion | Define case categories, procedural stages and exclusions |
| Prosecution | Referrals received, cases awaiting review, disclosure completeness | Do not treat a referral as a proven offence |
| Corrections | Custody reconciliation, capacity, release-processing status | Verify source, reporting time and facility-level coverage |
| Police | Response time, evidence-custody exceptions, incident backlog | Define start/end clocks and incident classifications |
| Emergencies | Warning delivery, resource fulfilment, recovery milestones | Identify official sources and distinguish preliminary from verified events |
| Land | Parcel coverage, transaction backlog, spatial verification | Distinguish mapped parcels from legally settled interests |
| Local government | Service resolution, permit processing, project delivery | Define service levels and municipal reporting coverage |
| Transport | Asset inspections, disruptions, repair times | Distinguish sensor data, reports and verified inspections |
| Energy | Installed capacity, generation, outage duration | Separate nameplate capacity, measured output and forecasts |
| Environment | Sampling coverage, incidents, compliance actions | Include method, location, timestamp and quality limitations |
| Housing | Permits, inspection status, project completion | Separate permission, construction progress and occupancy |
| Public works | Budget execution, milestones, defects and change orders | Reconcile amounts to approved financial records |

All figures must have a provenance label—observed, reported, modelled, sample or not_connected—alongside the source and last-updated timestamp. Production must not contain fabricated figures to make a dashboard appear complete.

G. Readiness and acceptance tests

A department is not ready for production simply because its interface renders. Each service needs evidence of legal grounding, configuration, staffing, records, security, integration and successful operational testing.

The following tests should be mandatory for this part:

1. A court can administer cases independently without an executive administrator altering case assignment or judicial decisions.
2. A judgment cannot be silently overwritten; corrections and appeals produce separate, traceable events.
3. A police allegation remains distinguishable from verified findings and judicial outcomes.
4. Evidence custody records every transfer and identifies the responsible custodian.
5. A custody admission requires the appropriate lawful authority; an existing police record alone is insufficient.
6. A land transfer cannot be completed by an unauthorised user or silently erase a previous registered state.
7. A spatial dataset records its source, version and coordinate reference system.
8. An emergency warning cannot be presented as officially authorised before the required authorisation occurs.
9. A utility dashboard cannot expose industrial control commands to ordinary CivicOS users.
10. Environmental observations preserve source, sampling context and data quality.
11. Building approval, construction completion and occupancy remain distinct statuses.
12. Public-works payments reference approved contracts, verified milestones and the authorised financial process.
13. Sensitive searches and exports are auditable, including unsuccessful access attempts.
14. A national-twin indicator without a connected source is visibly marked unavailable rather than populated with invented values.
15. Each institution can be deployed independently without assuming that every other institution is already connected.

H. Recommended implementation order for this group

Do not build all these domains simultaneously. Start with the common legal and records capabilities, then add institutions in an order that limits risk and creates reusable infrastructure.

1. Court and institutional authority model. Configure institutional standing, legal basis, role boundaries, signed documents, event history and independent institutional administration before implementing sensitive justice workflows.
2. Land and geospatial foundations. Establish stable record identifiers, geometry metadata, versioning and controlled exchanges. These capabilities support planning, infrastructure, emergency response and the national twin.
3. Public works and asset management. Deliver projects, inspections, milestones and asset handover with verifiable links to procurement and finance.
4. Emergency management. Implement incident intake, official-warning authorisation, resource coordination and recovery tracking. Test continuity and fallback communications.
5. Police, prosecution, courts and corrections. Integrate through narrow, auditable interfaces and validate legal transitions between institutions before enabling live use.
6. Transport, energy, environment and housing. Add sector-specific workflows, registers and indicators; keep operational technology and safety-critical control systems in their appropriately secured environments.

Principal risks to prevent

- Executive overreach: whole-government administration must not create access to judicial, independent or otherwise protected records.
- Unlawful data linkage: sharing a person or parcel identifier does not establish permission to retrieve every associated record.
- Evidence corruption: original documents, custody events and registration histories must remain verifiable.
- False certainty: reported, estimated and preliminary data must not be displayed as verified facts.
- Unsafe automation: AI can assist with classification, document summaries and workflow navigation, but must not independently decide guilt, detention, judicial outcomes, land rights or legally material permits.
- Critical-infrastructure exposure: administrative integrations must not create a route into utility control networks.
- Weak continuity: paper fallback, offline capture, backups, restoration tests and manual emergency procedures must be designed and exercised before go-live.

Part 3 conclusion: CivicOS should provide a common sovereign platform while preserving the legal and operational independence of courts, law enforcement, land registries, local governments, regulators and infrastructure operators. A connected national twin is useful only when every displayed fact retains its source, meaning, authority and limitations.

Next: Part 4 of 6 — Independent institutions, regulators and cross-government oversight. This will cover legislatures and parliamentary services, electoral commissions, audit institutions, ombuds offices, data-protection authorities, human-rights bodies, anti-corruption commissions, statistics offices and other independent regulators—with explicit rules preventing executive control from spreading through the platform.

## CivicOS — Part 4 of 6

Independent institutions, regulators and democratic oversight

This part defines how CivicOS should support the institutions that scrutinise government, regulate powerful actors, protect rights and preserve democratic accountability.

The key distinction is between shared digital infrastructure and institutional subordination. Two institutions may use the same identity provider, document service or hosting environment without one gaining authority over the other’s records, decisions or personnel.

The design draws on the principles of legislative oversight, judicial and institutional independence, independent public audit, data-protection supervision and professional official statistics. International standards provide useful benchmarks, but each country’s constitution and legislation determine the actual powers and boundaries.

A. The independent-institution catalogue

CivicOS should include configurable archetypes for the following institutions. A country may combine some functions or establish additional bodies, but their legal standing and authority must be explicitly recorded.

1. Legislature and Parliamentary Administration

Parliament, assembly, senate, committees, legislative drafting and parliamentary records.

Supports bills, amendments, committee hearings, voting records, budgets, questions to government and public legislative information.

2. Electoral Commission

Election administration, voter registration where assigned, polling, results and electoral complaints.

Operates under election law and its own authorised election procedures; executive ministries cannot alter electoral records through ordinary administrative privileges.

3. Supreme Audit Institution

Public expenditure, compliance, performance and financial audit.

Maintains independent audit plans, working papers, findings, management responses and published reports.

4. Ombudsman and Public Complaints Bodies

Complaints about public administration, maladministration and rights-related concerns within mandate.

Keeps complaint handling, evidence, findings and recommendations distinct from the institution being investigated.

5. Data-Protection and Privacy Authority

Independent oversight of personal-data processing, within statutory powers.

Investigates complaints, audits data practices and manages authorised enforcement actions without inheriting the operational control of every register.

6. National Human Rights Institution

Human-rights monitoring, recommendations, reports and authorised inquiries.

Maintains protected complaints and investigation records with safeguards for complainants, witnesses and vulnerable people.

7. Anti-Corruption and Integrity Commission

Corruption prevention, authorised investigations, disclosures and referrals.

Separates allegations, intelligence, verified evidence, findings and referrals; protects sources and restricts sensitive access.

8. National Statistics Office

Official statistics, census, statistical standards, releases and statistical confidentiality.

Maintains methodology, source records, revisions and publication calendars independently of political pressure.

9. Financial, Competition and Sector Regulators

Banking, insurance, securities, competition, communications, utilities and other regulated markets.

Supports licensing, supervision, returns, inspections, enforcement and appeals according to each regulator’s legal mandate.

10. Public Service Commission and Ethics Bodies

Merit-based appointments, civil-service standards, conflicts of interest and authorised ethics processes.

Maintains confidential declarations, appointments, reviews and decisions within its assigned powers.

Additional archetypes should be available where established by national law: boundary commissions, independent fiscal councils, information commissioners, inspector-generals, public procurement regulators, commissions on disability or equality, public broadcasting regulators, constitutional commissions and specialised licensing or appeals tribunals.

B. The independence contract: requirements CivicOS must enforce

Every independent institution needs more than a different logo or menu. Its independence must be represented in the platform's identity, authorisation, data and administrative models.

| Requirement | Platform enforcement |
|---|---|
| Separate institutional standing | Independent institution has its own legal identity, governing authority and deployment or administrative boundary |
| Separate accounts | Executive-wide administrators cannot automatically administer its users or inspect its cases |
| Separate decision authority | Only configured authorised roles can issue legally material decisions |
| Independent records | Executive users cannot modify or erase independent institution records through shared platform services |
| Controlled exchange | Cross-institution requests require a lawful purpose, approved authority and permitted fields |
| Protected audit | The institution can inspect its own audit history; privileged system operators cannot silently rewrite it |
| Independent oversight | Oversight roles receive only the access authorised for their mandate |
| Continuity | The institution can export its records, configurations and audit evidence without losing provenance |
| Independent publication | Public reports, findings and releases follow the institution's authorised publication process |
| Transparent delegation | Any lawful delegation or temporary appointment has a recorded scope, source and effective period |

These requirements should be tested technically, not merely stated in policy documentation.

Important: independence does not mean that an institution is exempt from all law, cybersecurity requirements or lawful oversight. It means that those controls must not silently transfer its decision-making authority to another institution.

C. Institution-by-institution operating specifications

1. Legislature and parliamentary administration

The parliamentary workspace must be separate from the executive workspace. In a bicameral system, each chamber may need separate procedures, memberships, voting records and administrative permissions.

Modules

- Bill and legislative-instrument management
- Amendment drafting and version comparison
- Committee scheduling and evidence
- Plenary agendas and proceedings
- Voting and division records
- Parliamentary questions and government responses
- Budget scrutiny and committee reports
- Member and committee administration
- Petitions and public submissions
- Legislative archive and public publication
- Parliamentary ethics or privileges processes where assigned

Core records

| Record | Essential fields |
|---|---|
| Bill | Bill ID, sponsor, chamber, version, text, status and legal basis for procedure |
| Amendment | Amendment ID, bill version, proposer, text, admissibility decision and vote |
| Committee proceeding | Committee, agenda, meeting time, participants, submissions and minutes |
| Division | Motion, voting members, recorded votes, result and authoritative record |
| Parliamentary question | Question, recipient, submission date, response deadline where legally defined, answer and publication status |
| Petition | Petition reference, submission, admissibility, support data where permitted and committee outcome |
| Legislative act | Adopted text, assent or promulgation status where applicable, official publication reference and effective date |

Workflow: bill to enacted instrument

1. Register the bill and the authoritative text.
2. Apply the configured chamber's procedural rules.
3. Track each version, amendment, committee stage and vote.
4. Record the authorised voting result and the source record.
5. Complete any constitutionally or legally required assent, promulgation or publication steps.
6. Publish the authoritative final text and its commencement provisions.
7. Notify the legal registry so the new instrument can be versioned and linked to any affected rules.

A draft bill must never be represented as current law merely because it has been uploaded or passed one chamber. The legal status and effective date must be explicit.

Role boundaries

Members, parliamentary clerks, committee staff, authorised drafters, chamber administrators, publication officers and auditors require distinct permissions. Executive ministries may submit responses and evidence through approved channels; they must not edit parliamentary proceedings or voting records.

KPIs: legislative processing by stage, committee workload, unanswered questions, publication timeliness, accessible-document availability and completeness of the official legislative archive. Avoid treating a high volume of laws passed as a sufficient measure of legislative quality.

2. Electoral Commission

Election workflows are time-bound and highly sensitive. CivicOS should support normal electoral administration and exceptional election periods without creating permanent broad access to identifiable voter information.

Modules

- Electoral district and polling-place administration
- Voter-register processes where assigned
- Registration, correction and objection workflows
- Candidate and party registration
- Polling-station staffing and logistics
- Ballot and election-material tracking
- Results capture and verification
- Complaints, recounts and electoral disputes
- Authorised results publication
- Election observation and reporting
- Post-election audit and archive

Core records

- Electoral event and applicable election rules
- Constituency and polling-place reference
- Voter registration and correction case
- Candidate nomination and verification
- Polling-station opening and closing records
- Ballot-material custody and reconciliation
- Results return, source, verification and status
- Complaint, objection, recount or appeal
- Official results declaration and publication record

Workflow: polling-station results

1. Identify the polling station and authorised reporting official.
2. Capture the source results return or official record.
3. Validate required fields and arithmetic consistency without changing the source.
4. Flag discrepancies for authorised review.
5. Record any recount or correction as a separate, traceable event.
6. Obtain the required verification or approval.
7. Publish only the results status permitted by the electoral rules.
8. Retain source images or signed returns and the full verification history.

Critical safeguards

- No executive user may alter election results through ordinary government administration.
- Voter identity data and public results must have different access and publication policies.
- A correction must preserve the original return and explain the authorised change.
- Provisional, verified and officially declared results must be distinct states.
- Automated anomaly detection may flag records for review but must not decide that fraud occurred.
- Election-specific roles should expire or be reviewed after the event; temporary access must not persist indefinitely.

KPIs: voter-register correction workload, polling-station readiness, reporting completeness, results verification time, complaint resolution and publication timeliness. Turnout and result figures must be traceable to the relevant election event and source.

3. Supreme Audit Institution

A supreme audit institution needs a dedicated workspace that allows auditors to examine records without becoming administrators of the institutions they audit. INTOSAI’s Lima Declaration and associated principles are key reference points for public-sector audit independence.

Modules

- Risk-based audit planning
- Financial and compliance audits
- Performance audits
- Evidence requests and submissions
- Working papers and audit tests
- Findings and recommendations
- Management responses
- Follow-up and remediation
- Publication and legislative reporting
- Audit quality assurance

Core records

| Record | Essential fields |
|---|---|
| Audit engagement | Scope, objectives, authority, period, team and approved plan |
| Evidence request | Audited entity, requested evidence, purpose, due date and status |
| Evidence item | Source, received time, integrity information, custodian and audit use |
| Audit test | Procedure, sample or population definition, result and reviewer |
| Finding | Criteria, condition, evidence, cause, effect and proposed recommendation |
| Management response | Respondent, response, supporting evidence and date |
| Recommendation | Owner, agreed or disputed action, due date if established and follow-up status |
| Audit report | Approved version, sign-off, publication status and distribution |

Workflow: audit engagement

1. Approve and record the audit mandate, scope and team.
2. Notify the audited institution through the approved process.
3. Request evidence with a clear authority and purpose.
4. Preserve submitted material and its provenance.
5. Record tests, working papers, findings and review notes.
6. Provide the audited entity its authorised response opportunity.
7. Approve the report through the audit institution's own governance.
8. Publish or submit it as authorised.
9. Track recommendations and subsequent verification.

Separation rule: the audited ministry may respond to a finding and submit evidence, but it must not edit the audit institution's finding or delete its working papers. A disagreement should be recorded as a response or review, not resolved by overwriting the auditor's record.

KPIs: audit-plan completion, evidence-request turnaround, report review time, recommendation follow-up and repeat findings. Avoid rewarding auditors simply for the number or monetary value of findings.

4. Ombudsman and Public Complaints Bodies

Modules

- Complaint intake and accessibility support
- Jurisdiction and admissibility review
- Early resolution and referral
- Investigation and evidence requests
- Confidential interviews
- Findings and recommendations
- Agency responses and follow-up
- Systemic-issue investigations
- Public reporting and case archive

Complaint record

- Complaint ID and preferred contact method
- Respondent institution and jurisdiction
- Issue category and alleged administrative action
- Dates, evidence and affected decision
- Confidentiality or safety concerns
- Admissibility decision and reasons
- Investigator and assigned authority
- Findings, recommendation and response
- Closure reason and review route

Workflow

Intake → jurisdiction review → admissibility decision → evidence collection → investigation → findings → authorised recommendation or other outcome → response monitoring → closure.

A complaint is not a finding of misconduct. The institution being complained about should receive only the information needed for a lawful response, with protections for confidential sources and sensitive complainant details.

KPIs: intake accessibility, admissibility time, case age, recommendations answered, overdue follow-up and recurring systemic issues.

5. Data-Protection and Privacy Authority

This institution is especially important because CivicOS itself will process personal data across multiple organisations. Its role must be distinct from the team that builds or operates the platform.

The OECD Privacy Guidelines and the Council of Europe’s data-protection framework provide useful reference principles, including accountability, purpose limitation and safeguards for personal information. National legislation determines the authority's precise investigatory and enforcement powers.

Modules

- Complaints about personal-data processing
- Investigations and evidence requests
- Controller and processor registers where required
- Data-breach notifications
- Data-protection impact assessments
- Inspection and audit programmes
- Corrective directions and enforcement
- Guidance and public decisions
- Cross-border cooperation where authorised
- CivicOS access-log review and misuse investigations

Core records

- Complaint and affected processing activity
- Responsible controller and processor references
- Data categories and purposes
- Alleged or observed breach
- Evidence request and response
- Investigation findings
- Legal provisions and version
- Corrective action or enforcement decision
- Review or appeal status
- Publication and redaction record

Workflow: suspected unauthorised data access

1. Receive the complaint, audit alert or referral.
2. Record the allegation and preserve relevant evidence.
3. Determine jurisdiction and the applicable investigation powers.
4. Request the relevant access logs or records through the authorised mechanism.
5. Review access purpose, role, scope and legal basis.
6. Record findings separately from the original allegation.
7. Issue any authorised recommendation, order or other outcome.
8. Track compliance and preserve the review history.

Critical boundary: privacy oversight staff must not receive blanket access to all raw personal data merely because they regulate data protection. Their access should be based on specific investigatory authority and limited to the evidence required. Where direct access to a record is necessary, the purpose, scope and access event must be recorded.

KPIs: complaint workload, breach-notification processing, investigation age, compliance with authorised corrective actions and repeat access-control failures.

6. National Human Rights Institution

The UN Paris Principles provide an internationally recognised reference for the independence, mandate and pluralism of national human rights institutions. They should inform the configuration, while national law determines the body's actual powers.

Modules

- Rights-related complaint intake
- Monitoring and authorised visits
- Investigations and evidence handling
- Recommendations and institutional responses
- Thematic inquiries
- Public reports and parliamentary submissions
- Civil-society and stakeholder consultations
- Follow-up on recommendations

Records: complaint, affected rights category, respondent, source, protected witness reference, investigation event, evidence, finding, recommendation, response and follow-up.

Safeguards

- Separate allegation, corroborated evidence, finding and recommendation.
- Apply heightened restrictions to vulnerable persons and protected sources.
- Keep confidential submissions separate from public report material.
- Do not disclose an identity merely because an executive institution requests it.
- Provide an independent publication workflow and preserve the final report's integrity.

KPIs: complaint accessibility, investigation workload, recommendation follow-up, systemic issues identified and report publication. These measures must not be interpreted as a complete measure of human-rights compliance.

7. Anti-Corruption and Integrity Commission

The archetype may cover prevention, declarations of interest, whistleblower handling, administrative investigations, referrals or criminal investigation, depending on the national legal arrangement. Where these functions are split across agencies, CivicOS should preserve those boundaries.

Modules

- Protected disclosures and whistleblower intake
- Conflict-of-interest declarations
- Asset or interest declarations where legally required
- Procurement-integrity referrals
- Investigative casework
- Evidence and source protection
- Risk assessment of institutional processes
- Prevention and guidance programmes
- Referrals to prosecution, audit or other competent bodies
- Findings, orders or reports within the commission's authority

Records: disclosure, source protection classification, allegation, evidence, investigation, declaration, verification event, finding, referral and authorised outcome.

Workflow: protected disclosure

1. Receive the report through an approved confidential channel.
2. Separate source identity from the general case record where practicable.
3. Assess jurisdiction and immediate protection needs.
4. Restrict access to specifically authorised staff.
5. Preserve evidence and record the chain of custody.
6. Conduct the authorised review or investigation.
7. Record the outcome, referral or closure and reasons.
8. Monitor authorised protection measures without exposing the source to unrelated users.

Safeguards: a flagged procurement transaction is not proof of corruption; an undisclosed interest is not automatically proof of criminal conduct. AI may identify patterns for human review, but it must not label a person corrupt, issue a legally material finding or automatically refer a person for punitive action without the prescribed process.

KPIs: disclosure processing, case age, protection incidents, evidence completeness, referral outcomes and implementation of prevention recommendations.

8. National Statistics Office

Official statistics require professional independence, documented methodology and protection against unauthorised disclosure. The UN Fundamental Principles of Official Statistics are the central international reference for these safeguards.

Modules

- Statistical programme and release calendar
- Census and survey operations
- Administrative-data integration
- Statistical classifications and standards
- Data-quality assessment
- Disclosure control and anonymisation
- Statistical analysis and production
- Revisions and correction notices
- Public datasets and metadata
- Statistical confidentiality governance

Core records

| Record | Required fields |
|---|---|
| Statistical product | Product ID, definition, owner, release schedule and status |
| Dataset | Source, coverage, period, variables, methodology, quality and classification |
| Indicator | Definition, unit, denominator, population, time period and calculation method |
| Release | Publication time, approved version, responsible authority and embargo controls |
| Revision | Prior value, revised value, reason, method and publication date |
| Quality assessment | Completeness, accuracy, comparability, timeliness and known limitations |
| Disclosure assessment | Risk assessment, aggregation or suppression method and approval |
| Administrative-data agreement | Source owner, purpose, legal authority, fields, frequency and restrictions |

Workflow: official statistical release

1. Register the statistical product and methodology.
2. Establish the lawful source and permitted use of each dataset.
3. Validate source data, definitions, coverage and quality.
4. Produce statistics using a documented, reproducible method.
5. Review disclosure risks, particularly for small populations or sensitive locations.
6. Approve the release under the statistical office's own procedures.
7. Publish the release and metadata.
8. Record revisions without erasing the earlier release.
9. Preserve the dataset version, transformation method and audit evidence.

National-twin boundary: CivicOS may display statistics published by the national statistics office, but it must not automatically expose underlying identifiable census, survey or administrative records to dashboard users. Statistical publication permission is not permission to retrieve source microdata.

KPIs: release timeliness, revisions, data-quality assessments completed, metadata completeness and access to published datasets. Do not reward statistical staff for producing politically convenient results or minimising revisions.

9. Financial, Competition and Sector Regulators

This archetype should be configurable for financial supervision, securities, insurance, competition, telecommunications, utilities and other regulated markets. Different regulators may require separate legal, operational and data-security domains.

Modules

- Regulated-entity registration
- Licensing and renewal
- Periodic returns and regulatory reporting
- Supervisory examination and inspection
- Consumer complaints
- Competition and market investigations
- Enforcement and corrective actions
- Approved tariffs or regulated rates where assigned
- Appeals and administrative review
- Public notices and licence verification

Core records

- Regulated entity and licence
- Regulatory return and reporting period
- Inspection and findings
- Consumer complaint
- Market study or investigation
- Enforcement case and decision
- Tariff instrument and effective period
- Compliance obligation and evidence
- Appeal and review outcome

Workflow: regulatory enforcement

1. Record the trigger—routine supervision, a return, complaint or referral.
2. Establish jurisdiction and the applicable legal authority.
3. Collect evidence under the authorised process.
4. Record preliminary concerns separately from final findings.
5. Give the regulated party any required notice and response opportunity.
6. Obtain the decision from the authorised decision-maker.
7. Record reasons, legal basis, effective date and applicable review route.
8. Track compliance and publish only the information legally disclosable.

Controls: a supervisory employee should not be able to change an approved tariff, impose a sanction or revoke a licence without the required authority and approvals. Confidential commercial information and protected supervisory returns must not become public simply because the regulator has a public website.

KPIs: licensing workload, examination coverage, overdue regulatory returns, corrective-action status, complaint processing and compliance outcomes. These should be interpreted in light of the regulator's mandate and market conditions.

10. Public Service Commission and Ethics Bodies

Modules

- Civil-service appointment and merit processes
- Recruitment and selection oversight
- Promotion and disciplinary review where assigned
- Conflict-of-interest declarations
- Ethics advice and casework
- Whistleblower referrals where authorised
- Appeals and grievances
- Senior appointment approval
- Public-service standards and reporting

Core records: position, vacancy, applicant reference, selection criteria, assessment, panel membership, decision, conflict declaration, ethics advice, disciplinary referral and review outcome.

Workflow: merit-based appointment

1. Register the position and authorised recruitment basis.
2. Publish the approved vacancy and criteria.
3. Record applications and the applicable eligibility rules.
4. Document assessments against the published criteria.
5. Record panel membership and conflicts of interest.
6. Route the recommendation to the authorised decision-maker.
7. Record the appointment or other outcome and reasons where required.
8. Preserve the recruitment audit and review path.

Safeguards: access to recruitment records should be limited to authorised roles. The platform should not use inferred political affiliation, personal relationships or other unauthorised attributes to rank candidates. AI-assisted screening, if allowed at all, must be governed by national law, transparent criteria, human review and an appeal or correction mechanism where applicable.

D. Shared administration without shared control

Independent institutions still need HR, finance, procurement, facilities, document management and IT support. The platform should distinguish the provision of a shared service from authority over the institution.

For example, a central payment service may execute an approved payment instruction from an independent audit institution. It must not thereby gain authority to change the audit institution's budget decision, staff assignments or report.

| Shared service | Safe model |
|---|---|
| Identity and authentication | Common authentication may be offered; each institution controls role assignment and access approval |
| Hosting and infrastructure | Shared infrastructure with tenant isolation, protected keys, audited privileged access and institution-specific recovery |
| HR and payroll | Separate personnel records, authorised workflows and purpose-limited payment data |
| Finance | Institution-owned budgets and approvals; shared transaction processing only under an approved service agreement |
| Procurement | Shared tooling is permitted; each institution retains its authorised procurement decisions and audit trail |
| Documents and signatures | Common signing infrastructure; signing authority and document ownership remain institution-specific |
| Notifications | Shared delivery service; message content and recipients follow each institution's access rules |
| Audit and security monitoring | Shared technical monitoring may detect system events; content access requires defined authority and logging |
| Legal registry | A common source of law may be provided; each institution's decisions still require their own applicable legal authority |
| Public website publishing | Shared publication tools may be offered; each institution controls the approval and release of its material |

E. Technical model for independence

The following is a proposed CivicOS authorisation contract. It should be implemented in the policy-enforcement layer, not left to front-end visibility or menu configuration.

```json
{
  "principal": {
    "user_id": "user-reference",
    "institution_id": "institution-A",
    "roles": ["configured-role"],
    "delegations": ["valid-delegation-reference"]
  },
  "action": {
    "operation": "read",
    "resource_type": "protected-record",
    "resource_id": "record-reference",
    "purpose": "approved-purpose"
  },
  "context": {
    "legal_basis": "applicable-law-version",
    "relationship_id": "approved-relationship-reference",
    "data_classification": "restricted"
  },
  "policy_result": {
    "decision": "deny",
    "reason": "authority_or_scope_not_satisfied"
  }
}
```

This example deliberately defaults to denial. A production implementation must validate the principal, action, resource, purpose, legal authority, relationship and applicable policy; a client-supplied field must never be treated as proof that authorisation exists.

Privileged administrators

CivicOS needs carefully separated roles for:

- Platform operator: maintains infrastructure and availability.
- Institution administrator: manages an institution's authorised configuration and staff.
- Legal authority administrator: maintains approved mandates, delegations and legal references within the permitted governance process.
- Security officer: manages technical security controls.
- Auditor or oversight officer: inspects records under a defined mandate.
- Data-protection officer or authority: exercises the applicable internal or independent privacy role.

No single administrator should be able to change a legal mandate, grant themselves unrestricted data access, alter a protected record and erase the audit evidence of those actions.

High-risk changes should require two distinct authorised people, with proposal and confirmation performed by different identities. The system should verify that the identities are genuinely distinct and preserve the full approval chain.

F. Completeness model for independent institutions

CivicOS should assess each independent institution against a readiness checklist. The aim is not to score institutional independence numerically, but to reveal whether its operational and technical protections are actually implemented.

Independent institution readiness

Legal mandate verified

Constitutional or statutory standing, powers, limits and applicable law versions are recorded.

Governance configured

Authorised appointments, roles, delegations and approval policies are defined.

Tenant isolation tested

Executive administrators and unrelated institutions cannot access protected records through ordinary roles.

Decision workflows tested

High-impact actions enforce authorised decision-makers, dual control where required, reasons and review paths.

Audit integrity tested

Accesses, exports, changes, approvals and privileged operations are recorded and protected from silent alteration.

Publication controls tested

Public releases require the institution's own authorised approval process.

Exchange controls tested

Cross-institution requests enforce purpose, legal basis, permitted fields and auditable refusals.

Portability tested

Records, documents, configuration and audit evidence can be exported with provenance intact.

Continuity tested

Recovery, backups, key management, incident response and manual fallback procedures are exercised.

Each item should be marked not_started, in_progress, verified, blocked or not_applicable, with evidence, an accountable owner, a verification date and the next corrective action. A high aggregate percentage must not conceal a failed critical safeguard.

G. Mandatory acceptance tests

Before production, CivicOS should demonstrate that:

1. An executive-wide administrator cannot read a protected parliamentary, judicial or independent-investigation record merely by virtue of their platform role.
2. An independent institution can manage its own users without giving its administrator authority over another independent institution.
3. An election result cannot be silently overwritten, and provisional results cannot be misrepresented as officially declared results.
4. An audit finding remains under the audit institution's control when the audited entity submits a disagreement.
5. A privacy authority's investigation access is scoped and recorded.
6. A human-rights complainant's protected identity is not exposed through ordinary case search.
7. A whistleblower identity is not automatically included in an ordinary case export.
8. An official statistical release preserves its methodology, version and revision history.
9. A regulator cannot impose a sanction or alter an approved tariff without the applicable authority and workflow.
10. Shared payroll or payment infrastructure cannot change the originating institution's approved decision.
11. A high-risk change requiring two-person approval is rejected when the same person attempts to perform both steps.
12. A technical operator cannot silently rewrite protected audit history.
13. An institution can export its records, signed documents and provenance without losing the relationship to the original evidence.
14. Failed authorisation attempts are logged without exposing the protected content to the requester.
15. Demo records, simulated officials and test election results cannot enter a production register.

H. Implementation order

Build the common independence controls once, then apply them across the institutional catalogue.

1. First: institutional standing and access boundaries. Implement institution identities, branch and independence attributes, delegations, policy enforcement, protected audit and two-person approval.
2. Second: shared legal and document foundations. Establish versioned legal instruments, signed records, publication approvals, document integrity and controlled evidence exchange.
3. Third: parliamentary and statistical services. Build legislative records, proceedings, official publication and statistical metadata with clear public/private boundaries.
4. Fourth: oversight workflows. Implement audit engagements, public complaints, privacy investigations, protected disclosures and recommendations.
5. Fifth: electoral and regulatory workflows. Add event-specific permissions, temporary access, protected registers, result verification, licensing and enforcement.
6. Sixth: independent recovery and exit. Test institution-specific backups, data export, configuration portability, key recovery and service continuity before declaring the deployment production-ready.

Part 4 conclusion

CivicOS should make independent institutions first-class sovereign tenants, not subordinate departments inside an executive-controlled application. Their independence must survive shared hosting, shared authentication, shared document services, shared payments and shared national dashboards.

The platform should enforce the distinction between who provides a service, who owns a record, who may access it, and who has the legal power to decide.

Next: Part 5 of 6 — Standalone and federated architecture, the minimum sovereign kernel, deployment topology, portability, integrations, security and the completeness model. This will translate the institutional requirements from Parts 1–4 into a concrete technical architecture that can be installed by one institution, expanded to a whole government and later federated without losing records or history.

go next

## CivicOS — Part 5 of 6

Sovereign architecture, standalone deployment and federation

Parts 1–4 defined what CivicOS must support across executive government, human services, justice, infrastructure and independent institutions. This part turns those requirements into a deployable technical architecture.

The goal is not to build one enormous application with every government function embedded inside it. The goal is to create a minimum sovereign kernel plus independently deployable institutional applications, connected through controlled, auditable interfaces.

A municipality, ministry or independent regulator must be able to install CivicOS and operate its own services before the rest of government is connected. Later, it must be possible to federate that deployment with other institutions without recreating records, losing history or transferring authority by accident.

A. The architecture in one view

CivicOS institutional workspaces

Executive · Justice · Health · Education · Local government · Regulators · Independent bodies

Institutional boundary and policy enforcement

Identity · Role and attribute policies · Legal authority · Delegation · Purpose limitation · Audit

Sovereign shared services

Legal registry, workflow, documents, signatures, notifications, payments, maps, search and reporting.

Institution-owned domain services

Cases, registers, permits, decisions, inspections, benefit claims, court filings and other sector records.

Federation and integration layer

Approved APIs · Event exchange · Legacy adapters · Data contracts · Provenance · Reconciliation

Sovereign infrastructure

Compute · Database · Encrypted object storage · Key management · Backup · Monitoring · Recovery

This diagram represents logical boundaries. A small standalone deployment may run several components on one server, while a national deployment may separate them into multiple security zones and infrastructure clusters.

B. The minimum sovereign kernel

The kernel is the smallest reusable platform that can support a legally governed institution. It should be built and tested before CivicOS expands its catalogue of sector-specific screens.

1. Institutional and legal authority registry

Stores institution identity, standing, mandate, establishing instrument, effective law versions, authorised powers, prohibitions, delegations, register ownership and approved institutional relationships.

2. Identity and policy enforcement

Authenticates people and services, evaluates role- and attribute-based policies, scopes access to records, and enforces purpose, institution, legal authority and delegation.

3. Workflow and decision engine

Executes versioned procedures, validates prerequisites, separates proposal from confirmation, records reasons and prevents unapproved transitions.

4. Records, documents and evidence

Maintains authoritative records, document versions, signatures, evidence references, retention rules, correction history and exportable records.

5. Audit and accountability

Captures access, reads, exports, changes, approvals, refusals, privileged operations and service-to-service disclosures. Protects audit integrity and supports independent verification.

6. Interoperability and federation

Provides versioned APIs, event contracts, legacy adapters, explicit exchange agreements, source references and reconciliation tools.

7. Configuration, deployment and recovery

Provides installation, environment configuration, migration, health checks, backup and restoration, software updates, schema versioning and verified export.

A payment gateway, national digital identity provider, GIS service or AI assistant may be essential to a particular deployment, but none should be a hard dependency for every institution's basic operation. CivicOS should support a disconnected or partially connected installation with explicitly degraded capabilities.

C. Separate the control plane from institutional data

A critical architecture decision is to distinguish platform configuration from institution-owned operational records.

Control plane

The control plane manages:

- Institution and deployment configuration
- Application versions and feature availability
- Service health and operational status
- Identity-provider configuration
- Schema migrations and compatibility
- Backup and recovery orchestration
- Approved integrations and trust relationships
- Platform security policies and technical administration

Institutional data plane

The data plane holds:

- Cases and applications
- Official registers
- Documents and evidence
- Decisions and signed notices
- Payments and reconciliation records
- Inspection and fieldwork records
- Institutional reports
- Access and disclosure evidence

The control plane must not silently acquire legal authority over the data plane. A hosting operator may be able to restart a service or restore a database from an authorised backup; that does not mean it may issue a permit, change a court order or approve a benefit.

Design recommendation: use distinct service identities, narrowly scoped administrative interfaces, protected keys and institution-specific policies. High-risk operational actions should be auditable and require additional approval where appropriate.

D. Standalone deployment: one institution first

Every CivicOS institution should be installable as an independent deployment root. It must not require a central national server, national identity provider or a live connection to another ministry merely to process its own authorised records.

Minimum standalone package

CivicOS Institutional Edition

A self-contained installation for a ministry, municipality, regulator or independent institution.

Institutional workspace

Department navigation, dashboards, case queues, registers, forms and reporting.

Local identity and access

Local identity provider or configured external identity integration, institution-managed roles and MFA.

Legal and workflow engine

Versioned rules, delegated powers, case states, approvals and decision records.

Records and document store

Institution-owned database, encrypted object storage, signatures and document history.

Audit service

Access events, changes, exports, approvals, security events and integrity verification.

Local integration gateway

Connectors for approved external services, file exchange, legacy applications and later federation.

Operations and recovery

Health checks, monitoring, backup, restore, migration and upgrade tooling.

The deployment should include everything needed for the institution's declared scope, but should not force it to install unused sector modules.

What must remain functional offline?

Where the institution's security model permits, the following should continue during a loss of external connectivity:

- Access to already synchronised local records by authorised staff
- Case preparation and local workflow steps that do not depend on an external legal verification
- Document creation, local signatures where legally valid, and audit recording
- Local reporting with clearly stated data freshness
- Queued integration requests and visible synchronisation status
- Backup, recovery and incident reporting

The system must not claim that an external check succeeded when it was not performed. If an action legally requires confirmation from another authority, CivicOS should pause that transition or follow a separately approved fallback procedure.

Deployment profiles

| Profile | Typical use | Architecture |
|---|---|---|
| Single-server pilot | One small institution or test deployment | UI, application services and database on a hardened host; encrypted backups off-host |
| Institutional production | Medium or sensitive institution | Separated application, database, object storage, key management and monitoring |
| Sovereign national platform | Multiple institutions and high availability | Multiple security zones, independently scaled services, replicated infrastructure and formal disaster recovery |
| Federated network | Multiple sovereign institutions or jurisdictions | Institution-local systems with authenticated, purpose-limited exchange between deployments |

These are architecture profiles, not guaranteed capacity specifications. Hardware requirements depend on concurrent users, document volume, case workload, availability targets, retention periods and the number of integrations. Production sizing should be based on measured load tests.

E. Federation: connect institutions without merging them

Federation should be an explicit capability that can be enabled after a standalone deployment is stable. It should not be a mandatory centralisation step.

GovStack's building-block approach is a useful reference: independently deployable, reusable components expose defined interfaces and exchange data through agreed contracts. Its interoperability guidance also stresses that technical connections must be supported by common meanings and organisational agreements.

GovStack Specification

+1

Federation lifecycle

STAGE 1

Standalone institution

Own database, staff, legal configuration, workflows and audit history.

STAGE 2

Trust and exchange configuration

Establish the institutional identity, service endpoints, certificates, approved relationships, data contracts and lawful purposes.

STAGE 3

Limited live exchange

Start with narrow use cases, such as credential verification or a case-status response. Log requests, denials, responses and reconciliation.

STAGE 4

Multi-institution federation

Add approved relationships incrementally while each institution retains its data ownership, decision powers and operational history.

Three federation models

1. Central service, distributed records

A national service may provide shared identity, legal references, messaging or exchange routing. Institutional records remain in the systems authorised to own them. A central directory is not a central copy of all personal data.

2. Institutional federation

Each institution runs its own CivicOS instance and exchanges specific requests or events with other instances. This is suitable where institutions need stronger administrative separation or operate different infrastructure.

3. Hybrid federation

Some services are national, while sensitive registers or independent institutions remain locally operated. This is likely to be the most practical pattern for many governments.

CivicOS should support all three without changing the legal meaning of a record when its physical hosting location changes.

Federation rules

- An institution is identified by a stable, unique institutional ID—not by a mutable display name.
- Every exchange has a requesting identity, recipient, purpose and authorisation decision.
- Every data contract has a version and defined compatibility rules.
- A receiver validates the sender and message integrity before processing.
- Duplicate or retried messages must not create duplicate legal decisions.
- Unavailable services must produce explicit pending, failed or unavailable states.
- Corrections and revocations propagate through authorised events while preserving the original history.
- Federation must not silently grant a remote administrator access to local records.
- Disconnection or termination of a relationship must revoke its credentials and stop future exchanges without erasing the prior audit history.

F. APIs, events and data contracts

CivicOS should expose versioned, documented APIs. OpenAPI is a suitable specification format for HTTP APIs; event contracts need their own schemas, versioning and compatibility tests.

GovStack Specification

+1

1. API contract

Every API endpoint should define:

- Owning institution and service
- Operation and resource type
- Authentication requirements
- Required permissions and lawful purpose
- Request and response schemas
- Validation and refusal codes
- Idempotency behaviour for retryable operations
- Rate limits and service availability expectations
- Audit requirements
- Data classification and retention
- Version and deprecation policy

Example endpoint families:

/institutions/{institutionId}

/legal-instruments/{instrumentId}

/cases/{caseId}

/registers/{registerId}/records/{recordId}

/documents/{documentId}

/exchanges/{exchangeId}

/audit-events/{eventId}

/indicators/{indicatorId}

These paths are illustrative. Actual endpoint naming and access rules should be standardised in the API specification. The existence of an endpoint must never imply public access.

2. Event contract

Events are useful when one institution needs to notify another that something happened without granting direct database access.

Examples include:

- credential.status.changed
- permit.issued
- permit.revoked
- case.status.changed
- court.order.issued
- payment.reconciled
- facility.status.changed
- legal.instrument.effective

A generic event envelope might look like this:

```json
{
  "event_id": "unique-event-id",
  "event_type": "permit.issued",
  "schema_version": "1.0",
  "source_institution_id": "issuing-institution",
  "aggregate_reference": "permit-reference",
  "occurred_at": "timestamp",
  "published_at": "timestamp",
  "legal_context": {
    "instrument_reference": "law-record-reference",
    "version_reference": "effective-version-reference"
  },
  "payload_reference": "authorised-resource-reference",
  "integrity": {
    "signature_reference": "signature-or-verification-reference"
  }
}
```

An event should contain only the information required by its recipients. Sensitive payloads should be retrieved through an authorised service rather than embedded in a broadly distributed event.

3. Reliable delivery

Use an outbox or equivalent transactional publication pattern so that a committed record change and the event describing it cannot easily drift apart.

The receiving service should:

1. Authenticate the sender.
2. Validate the schema and signature or message-integrity mechanism.
3. Check the receiving institution's authority and permitted use.
4. Detect duplicate event IDs and safely handle retries.
5. Record acceptance, rejection or pending status.
6. Apply the event to its own domain model only when authorised.
7. Preserve source and correlation references for reconciliation.

A message broker provides delivery infrastructure; it does not grant legal authority to process the message.

G. Data ownership, identity and record portability

CivicOS must distinguish a record's legal owner, technical custodian, data controller where applicable, source system and permitted recipients. These are related but not interchangeable concepts.

Record ownership contract

Each register and record type should declare:

```json
{
  "record_type": "permit",
  "owning_institution_id": "configured-institution-id",
  "authoritative_source": true,
  "technical_custodian": "configured-service-id",
  "data_classification": "restricted",
  "legal_basis": "required-law-reference",
  "retention_policy": "configured-policy-reference",
  "correction_authority": "configured-role-or-institution",
  "allowed_exchange_purposes": [],
  "export_policy": "configured-policy-reference"
}
```

This configuration must be validated when a register is created and whenever its ownership or authority changes. A display label such as “Ministry of Health” must never be sufficient to infer that the ministry owns every health-related record.

Stable identifiers

Use different identifier namespaces for different purposes:

- Institution IDs
- Person or organisation references
- Register and record IDs
- Case and transaction IDs
- Document and evidence IDs
- Legal instrument and version IDs
- Event and correlation IDs
- Indicator and dataset IDs

Avoid using national identity numbers as universal database keys. They may be unavailable, reused, legally restricted or inappropriate for some populations. Use opaque internal references and store links to external identifiers only where justified.

Portable record package

An institution leaving a shared environment or moving to another hosting provider should be able to export:

- Authoritative records and their versions
- Documents, evidence and signatures
- Relationships between records
- Workflow history and decision states
- Legal references and the versions used
- Audit events and integrity-verification material
- Register schemas and controlled vocabularies
- Forms, rules and workflow configuration
- Data dictionaries and API/event schemas
- Export manifest, checksums and validation report

A PDF-only export is not sufficient. It may preserve a readable view while losing the structured data, history and relationships needed for future operation.

Where cryptographic verification depends on external keys or certificates, the export should include the relevant public verification material and metadata, while private keys remain protected under the agreed key-management process.

H. Security and sovereignty architecture

Sovereignty is not achieved merely by placing a server within a country's borders. It also depends on who controls the infrastructure, encryption keys, software updates, administrator accounts, logs, backups, legal access and exit process.

NIST's Zero Trust Architecture recommends evaluating access to resources rather than trusting a user or device simply because it is inside a network boundary. NIST's Secure Software Development Framework provides a useful foundation for integrating security practices throughout software development and delivery.

NIST

+1

Security layers

Identity

MFA for privileged and sensitive access; managed service identities; prompt revocation; no shared staff accounts.

Authorisation

Deny-by-default policy enforcement; least privilege; purpose-limited reads; record-level and field-level access.

Application

Input validation, output encoding, CSRF protections where applicable, secure session handling, dependency controls and rate limiting.

Data

Encryption in transit and at rest, managed keys, data classification, secure backups and controlled exports.

Infrastructure

Network segmentation, hardened hosts, restricted management interfaces, patched systems and isolated workloads.

Audit

Append-only event capture, integrity verification, time synchronisation, protected log access and independent review.

Supply chain

Dependency inventory, signed releases, vulnerability management, reproducible build practices where feasible and rollback procedures.

Continuity

Documented recovery objectives, tested restoration, incident response, offline procedures and institution-specific exit plans.

Tamper-evident audit

Every important event should include:

- Event ID and event type
- Actor or service identity
- Institution and resource reference
- Action and result
- Purpose and applicable authority where required
- Timestamp and correlation ID
- Before/after references or a protected change record where appropriate
- Integrity metadata

CivicOS can use cryptographic hash chaining, signed checkpoints or equivalent controls to make unauthorised changes detectable. However, a hash chain alone is not a complete security solution: an attacker who controls the whole logging environment may be able to replace the chain and its verification material. Independent checkpoints, restricted administrative access, protected keys and separate audit storage strengthen the evidence.

Do not put unnecessary sensitive payloads into audit logs. A log that records that a restricted record was accessed may need a reference and action metadata, not a duplicate of the entire record.

Sovereign key management

A production deployment should define:

- Who controls encryption keys
- Which service identities can request cryptographic operations
- Whether the key manager is institution-controlled or shared
- How keys are rotated, backed up and recovered
- How access is approved and audited
- How keys are revoked during staff departure or compromise
- What happens if the key service becomes unavailable
- How the institution exits the platform without exposing private keys

A shared platform operator should not automatically possess unrestricted access to every institution's decryption keys.

I. Hosting, deployment and infrastructure choices

CivicOS should support several hosting arrangements without tying its application architecture to one vendor.

| Hosting model | Strengths | Risks and requirements |
|---|---|---|
| Institution-operated data centre | Direct operational control | Requires skilled staff, resilient power, physical security and tested disaster recovery |
| National sovereign cloud | Centralised infrastructure management with country-specific governance | Requires clear key control, administrative boundaries, contracts and independent assurance |
| Private cloud or managed sovereign hosting | Easier scaling and operations | Must validate provider access, subcontractors, location, recovery and exit capabilities |
| Hybrid hosting | Allows different sensitivity and availability requirements | Increases integration, identity, monitoring and data-movement complexity |
| Isolated or disconnected installation | Useful for high-security or remote institutions | Requires controlled update delivery, local operations and secure offline procedures |

Recommendation: define a supported deployment contract, not a mandatory cloud vendor. Package services in reproducible containers where appropriate, document configuration, automate health checks and test upgrades against supported versions.

A small deployment can begin with a simpler topology, but it should still have encrypted off-host backups, separate secrets management and a tested restoration procedure. A national deployment requires a formal high-availability and disaster-recovery design based on its actual service requirements.

Infrastructure controls to configure per deployment

- Availability and recovery-time objectives
- Recovery-point objectives
- Backup frequency and retention
- Encryption and key ownership
- Data residency and cross-border transfer restrictions
- Administrator and subcontractor access
- Network zones and ingress/egress policy
- Vulnerability and patch management
- Monitoring and incident escalation
- Disaster-recovery location and independence
- Capacity, latency and performance targets
- Contractual and technical exit requirements

No universal uptime percentage or recovery time should be invented before the deployment's service criticality, budget and risk assessment are established.

J. Legacy migration without losing history

Many institutions will have existing databases, spreadsheets, document archives, paper files and vendor-specific systems. CivicOS should not require every institution to abandon these systems simultaneously.

Migration lifecycle

1. Discover. Inventory systems, registers, record owners, data dictionaries, documents, interfaces, retention rules and known data-quality issues.
2. Assign authority. Determine the authoritative source for each record type and field. Resolve conflicting ownership before migration.
3. Map. Define source-to-target field mappings, identifier strategy, classification, transformation rules and rejected-record handling.
4. Test. Run a representative migration in a non-production environment. Measure completeness, duplicates, referential integrity, document readability and provenance preservation.
5. Reconcile. Compare source and target counts, totals, status distributions and selected record samples. Explain every material difference.
6. Cut over. Obtain authorised approval, define a freeze or change-capture strategy, verify backups and document the rollback process.
7. Operate in parallel where necessary. Establish which system is authoritative for each operation. Avoid two systems independently issuing conflicting legal decisions.
8. Retire deliberately. Preserve required archives, evidence and audit history; revoke old credentials and interfaces; record the retirement decision.

Example migration manifest

```json
{
  "migration_id": "generated-migration-id",
  "source_system": "legacy-system-reference",
  "target_deployment": "civicos-deployment-reference",
  "record_type": "institution-register",
  "mapping_version": "1.0",
  "source_snapshot": "snapshot-reference",
  "started_at": null,
  "completed_at": null,
  "reconciliation": {
    "source_count": null,
    "accepted_count": null,
    "rejected_count": null,
    "unresolved_count": null,
    "status": "not_started"
  },
  "approval": {
    "approved_by": null,
    "confirmed_by": null,
    "evidence_reference": null
  }
}
```

The null fields are intentional. Production migration reports must contain actual measured results, not example counts.

Hard rule: migration must not silently transform an unverified legacy value into an authoritative fact. Record whether a field was imported, verified, transformed, inferred or left unresolved.

K. Completeness model for CivicOS itself

CivicOS needs two distinct forms of completeness:

1. Institutional readiness: can this institution lawfully and reliably perform its defined functions?
2. Platform completeness: does the shared product provide the necessary capabilities, interfaces, security controls and deployment tooling?

These must not be conflated. A complete product feature can remain unused or unconfigured in a particular country.

Institutional readiness dimensions

| Dimension | Evidence required |
|---|---|
| Legal | Mandate, effective law versions, authority assignments and approval rules verified |
| Configuration | Departments, services, registers, forms, workflows and classifications configured |
| Staffing | Authorised users, role assignments and separation of duties validated |
| Data | Authoritative records, migration evidence, data quality and ownership established |
| Integrations | Required exchanges tested, errors handled and reconciliation operational |
| Security | Access controls, audit, encryption, backup and incident procedures tested |
| Service | End-to-end workflow, notices, correction and appeal paths tested where applicable |
| Continuity | Recovery, export, restoration and offline procedures exercised |
| Governance | Owners, support responsibilities, update policy and escalation routes assigned |

Use explicit states such as not_started, in_progress, blocked, verified and not_applicable. Every verified state must have evidence and a date.

Completeness dashboard example

Institution Readiness

Illustrative interface only. These are categories, not measured CivicOS production results.

Legal grounding

Not assessed

Evidence of mandate and decision authority

Service configuration

Not assessed

Forms, procedures and approved rules

Staffing and access

Not assessed

Authorised personnel and separation of duties

Authoritative data

Not assessed

Ownership, migration and data quality

Integrations

Not assessed

Required connections and reconciliation

Security and continuity

Not assessed

Audit, recovery and export

A gap should lead to a specific action: name an owner, explain what evidence is missing, state the dependency and define the acceptance test. A single overall percentage is not enough, especially if a critical legal or security requirement remains unverified.

L. Architecture acceptance tests

Before federation or national rollout, demonstrate the following:

1. An institution can install CivicOS, create its legal configuration and operate an authorised service without another institution being online.
2. A later federation can be enabled without changing the original institution or record identifiers.
3. A remote institution cannot query protected records without a valid, purpose-limited authorisation.
4. An event retry cannot duplicate a legally material action.
5. A revoked institutional relationship stops new exchanges while preserving prior records.
6. A migrated record retains its source, transformation history and verification status.
7. A correction produces an auditable new state rather than silently erasing history.
8. An institution can export structured records, documents, schemas and audit evidence.
9. An exported record can be validated without depending on access to the original production interface.
10. A backup can be restored into a clean environment using documented procedures.
11. The restored environment preserves record relationships and audit-integrity verification.
12. Privileged access and key-management operations are recorded and independently reviewable.
13. A service can operate in a declared degraded state without claiming that unavailable checks succeeded.
14. A software upgrade detects incompatible schema or policy changes before they corrupt production records.
15. A disconnected institution can receive a controlled software update and verify its authenticity.
16. Shared services cannot override institution-specific legal authority or decision ownership.

M. Final architecture recommendation

Build CivicOS as a modular sovereign platform with:

- A minimum kernel for legal authority, identity, policy enforcement, workflow, records, documents, audit and deployment management.
- Institution-owned domain services for each ministry, regulator, local government and independent body.
- A shared-services layer for reusable capabilities such as payments, signatures, notifications, maps and reporting.
- A federation layer based on versioned APIs, controlled events, explicit legal relationships and reliable reconciliation.
- A portability layer for export, migration, provenance, backup and recovery.
- A security model that treats every access to a resource as an explicit authorisation decision.

This is consistent with the reusable building-block approach described by GovStack and with NIST's resource-centred Zero Trust principles. These are architectural references, not certification that any implementation is automatically secure or legally compliant.

GovStack Specification

+3

Part 5 conclusion: a ministry should be able to start small, run independently, connect to other institutions when ready and leave or migrate without losing its records or history. Federation should expand cooperation, not centralise legal power.

Next: Part 6 of 6 — The premium institutional UI design system, concrete screen specifications, responsive layouts, design tokens, accessibility, production/demo modes, implementation priorities, risk controls and the final build roadmap.

## CivicOS — Part 6 of 6

Premium UI design system, implementation roadmap and production safeguards

The final part turns the institutional catalogue and architecture into a coherent product: what staff see, how they work, how legal authority appears in the interface, how the system behaves under failure, and how CivicOS can be built without replacing the existing foundation.

Design objective: CivicOS should feel like a world-class sovereign operating platform—not a collection of disconnected government websites, generic admin templates or decorative dashboards.

It should be calm, precise, accessible, information-dense where necessary and exceptionally clear about authority, evidence, responsibility and the next action.

The public-facing websites already have their own design systems. This specification concerns the authenticated institutional workspaces, administrative consoles, citizen/business service workflows and shared platform interfaces.

A. The design direction

Direction 1 — Sovereign editorial

Warm white surfaces, deep forest-green or teal accents, restrained burgundy for exceptional states, precise typography and fine borders. Best for institutional workspaces that must communicate trust, authority and calm.

Direction 2 — Modern institutional

Stone-neutral surfaces, disciplined spacing, understated copper accents and strong table typography. Best for casework, records, approvals, finance and complex operational screens.

Direction 3 — Operational command

High-clarity status indicators, compact data panels, strong map and queue layouts, and prominent escalation states. Best for emergency response, dispatch, infrastructure operations and service monitoring.

My recommendation is a single CivicOS design system combining Sovereign Editorial and Modern Institutional, with Operational Command reserved for genuinely time-sensitive operational workspaces.

Do not assign each ministry a completely different product design. Give institutions a consistent foundation and allow limited sector-specific accents, terminology, navigation and workflow components.

B. Design tokens

The values below are a proposed starting specification. They should be validated against real screens, accessibility tests and user research before becoming the permanent design system.

Colour palette

Warm canvas

#F7F7F2

Main application background

Surface

#FFFFFF

Cards, tables and forms

Sovereign green

#193B35

Primary actions and navigation accents

Copper

#A85D42

Limited emphasis and selected details

Primary text

#252B29

Headings and body copy

Secondary text

#6B7470

Supporting labels and metadata

Use colour semantically, not decoratively. Success, warning, failure and informational states should use a consistent palette with text labels and icons so meaning is never communicated by colour alone. Test actual foreground/background combinations for WCAG 2.2 AA contrast; the suggested palette is not itself proof of compliance.

Typography and spacing

| Token | Proposed value | Use |
|---|---|---|
| Body | 14–16 px | Default text and forms |
| Compact table text | 13–14 px | Dense operational tables, with adequate zoom support |
| Page title | 28–32 px | Primary workspace heading |
| Section heading | 18–22 px | Major content groups |
| Small label | 12–13 px | Metadata, timestamps and helper labels |
| Base spacing | 4 px | Consistent spacing scale |
| Common control height | 40–44 px | Inputs and actions; larger where needed |
| Standard card radius | 10–14 px | Subtle, consistent containers |
| Keyboard focus | Clearly visible, high-contrast outline | Every interactive element |

Use a system font stack rather than requiring an external font service. This improves reliability in restricted networks, reduces external dependencies and helps deployments operate in sovereign or disconnected environments.

C. Application shell and navigation

Every authenticated workspace should have the same fundamental structure.

CivicOS

Institutional workspace

WORKSPACE

Overview

My work

Cases

Registers

Services

Reports

Administration

CASEWORK / APPLICATIONS

Case workspace

Assigned to me

—

Live count unavailable in this mock-up

Pending review

Open the queue to review assigned records.

Recent activity

Events appear here when a connected source provides them.

Illustrative shell: layout and hierarchy only, not a live connected workspace.

Layout rules

- Top bar: institution identity, current workspace, global search within permitted scope, notifications, help, account and session controls.
- Primary navigation: Overview, My Work, Cases, Registers, Services, Reports, and Administration where authorised.
- Contextual navigation: department, programme or operational area.
- Main workspace: page title, breadcrumbs, status, primary action, filters and relevant content.
- Context panel: legal basis, ownership, activity history or supporting evidence where it materially helps the current task.
- Responsive navigation: collapsible sidebar on desktop and a compact drawer or bottom navigation for suitable mobile workflows.

Do not display navigation items merely because they exist in the code. Navigation should reflect the user's assigned permissions, while the backend independently enforces the same restrictions.

D. The essential screens

CivicOS should have a reusable set of high-quality screen patterns. Every ministry should not invent its own dashboard, form builder, case table or approval screen.

1. Institutional overview

The overview should answer four questions immediately:

- What needs my attention?
- Which services are delayed or blocked?
- What decisions am I authorised to make?
- What is the quality and freshness of the data shown?

INSTITUTION OVERVIEW

Operations at a glance

Source status must be visible for every live metric.

My assigned work

—

Not connected

Awaiting approval

—

Not connected

Service exceptions

—

Not connected

Integration health

—

Not connected

Work requiring attention

Incomplete application

Needs validation

Decision awaiting confirmation

Requires authorised reviewer

Integration reconciliation

External source unavailable

Sample screen structure with deliberately unpopulated metrics. No production figures are fabricated.

Do not overload this screen with decorative charts. Show only the metrics that help the current user perform their work, and provide a clear path from a metric to the underlying authorised records.

2. Case management

A case should have a consistent layout across sectors, with configurable fields and procedures.

CASE REFERENCE

CASE-REFERENCE

Example layout — no live case loaded

Draft

Applicant or subject

Restricted identity reference

Legal basis

Instrument, effective version and applicable provision

Evidence and documents

Versioned files, source and verification state

Workflow

Current state, prerequisites and next authorised action

History

Events, actors, approvals, notices and changes

Use tabs or a structured side panel for Overview, Evidence, Decisions, Correspondence, Related Records and History. Hide irrelevant tabs by case type, but never use a hidden tab as a security boundary.

A decision screen must show the proposed outcome, legal authority, evidence considered, unresolved issues, decision-maker and required confirmation. It should be impossible to mistake a draft, recommendation or AI-generated summary for an issued decision.

3. Register and record explorer

Registers need powerful filtering without becoming unrestricted surveillance tools.

Required capabilities:

- Search by authorised identifiers and fields
- Filter by status, date, location, category and assigned unit
- Save permitted personal views
- Sort, paginate and export under explicit policy
- Show record ownership and source
- Display record freshness and verification status
- Inspect the version and correction history
- Request a correction or controlled amendment
- Log reads, bulk exports and sensitive searches

Bulk exports should require an explicit purpose and appropriate permission. Where the export is particularly sensitive, require a second approval and create an export manifest with the requester, scope, fields, time and destination.

4. Form and service designer

CivicOS needs a form engine that can be configured without hardcoding every service.

A form definition should support:

- Field types and validation
- Conditional sections
- Repeatable evidence groups
- Controlled vocabularies
- Accessible labels and error messages
- Draft saving
- Save-and-resume
- Document attachments
- Plain-language help
- Versioning and publication approval
- Field classification and retention rules
- Legal basis and authorisation requirements
- Preview and validation before publication

Forms must be versioned. An application submitted under form version 1.0 should retain that version and its rules even after the institution publishes version 1.1.

5. Approvals and decisions

The approval workspace should clearly separate:

- Submitted proposal
- Evidence reviewed
- Legal basis and authority
- Validation results
- Unresolved issues
- Required approver roles
- Decision and reasons
- Confirmation status
- Notice and delivery
- Appeal or review route, where applicable

The interface must not permit an approver to confirm their own proposal when the applicable rule requires two distinct people. The backend must enforce this even if the client is modified.

6. Documents and signatures

The document viewer should support readable preview, metadata, version history, signature verification, source references and download controls.

Every official document should identify its type, issuer, status, issue date, applicable legal basis where relevant and verification method. A scanned signature image alone should not be treated as proof of a valid digital signature.

7. Audit and evidence viewer

This screen should be designed for investigation and accountability, not as a generic activity feed.

Show:

- Who or what performed the action
- Which institution and resource were involved
- What action was attempted and whether it succeeded
- The stated purpose and legal authority where required
- When the event occurred
- Whether the event is part of a verified integrity chain
- Related request, decision, document and correlation references

Provide chronological and grouped views, filters, export with manifest, and integrity-verification status. If log integrity cannot be verified, display an explicit warning rather than a reassuring green status.

8. National twin and analytics

A map or chart must include enough context for users to understand what the data actually means.

Each indicator view should show:

- Definition and unit
- Period and geographic scope
- Source institution and register
- Provenance label
- Last update and freshness
- Coverage and known quality issues
- Methodology or transformation reference
- Whether the value is measured, reported or modelled

Do not put personally identifiable case data into the national twin by default. Use aggregated or appropriately de-identified data under an approved purpose and disclosure-control policy.

E. Responsive, accessible and multilingual design

Accessibility is a product requirement, not a final polish pass. CivicOS should target WCAG 2.2 AA for the authenticated workspaces and service forms, with automated testing supplemented by keyboard, screen-reader and human usability testing.

Desktop, tablet and mobile

Desktop

Full navigation, wide tables, multi-column case views, comparison and review panels.

Tablet

Collapsible navigation, responsive tables, stacked details and practical fieldwork workflows.

Mobile

Single-column workflows, large touch targets, simplified record summaries and offline-aware field capture.

RTL and localisation

Mirrored navigation where appropriate, correct text direction, local formats and translated content.

Accessibility requirements

- Full keyboard access and visible focus indicators
- Semantic headings, landmarks, labels and table structures
- Screen-reader announcements for status changes and validation errors
- Error summaries linked to the affected fields
- No reliance on colour, position or icons alone
- Text resizing and zoom without loss of functionality
- Reduced-motion support
- Adequate touch targets and spacing
- Accessible document previews and signature verification
- Plain-language instructions and meaningful confirmation messages
- Accessible authentication and recovery paths
- Alternative methods for people who cannot use a digital-only process

RTL and multilingual support

Do not treat translation as replacing strings. The design system must support:

- Logical CSS properties such as margin-inline-start
- Right-to-left and left-to-right text in the same document
- Correct alignment and ordering for mixed-language names and identifiers
- Localised dates, numbers, currencies and measurement units
- Language-specific search and sorting
- Translated error messages and service guidance
- Localised legal terms with links to the authoritative original text
- Font fallback without loading external fonts
- Human review of legal translations

The language of the interface should not change the identity of the authoritative legal instrument or silently replace the official text with a machine translation.

F. Production, training and demo modes

CivicOS needs explicit environment modes. A demo system must never look like a real government production system.

Production

Live records

Only authorised users, real approved workflows and connected sources. No invented production metrics, simulated officials or sample legal decisions. Missing integrations must be visible.

Training

Controlled simulation

Exercises use clearly labelled fictional records, simulated staff and test workflows. No training action may trigger a real permit, legal decision, payment or external notification.

Demo

Illustrative data

Shows proposed workflows and sample dashboards for evaluation. Every sample figure, simulated decision and fictional identity is labelled as such.

Technical enforcement

Do not rely on a coloured banner alone. Environment mode should be enforced server-side and at integration boundaries.

- Separate production and non-production data stores and credentials.
- Prevent training or demo credentials from authenticating to production services.
- Block real payments, notifications, signatures and legal issuance in simulation modes.
- Label sample records at the data level and preserve that label through exports.
- Reject sample records when writing to production registers.
- Ensure background jobs and webhooks also enforce the environment boundary.
- Require an authorised deployment process to change an environment's mode.
- Keep demo identities and simulated officials separate from actual staff identities.

Critical rule: a production dashboard must never silently fall back to demo data when a real integration fails. It should display the missing data, the last successful update and the reason for the degraded state.

G. Institutional identity without fragmented design

CivicOS should have one design system, but its workspaces should reflect the responsibilities of their institutions.

For example:

- Treasury: budget execution, commitments, reconciliations, approvals and financial controls.
- Health: facility administration, programme delivery, inspections and workforce.
- Justice: case progression, legal documents, hearings, decisions and protected evidence.
- Police: incident queues, dispatch, assignments and evidence custody.
- Land: parcels, registered interests, surveys, transfers and disputes.
- Electoral Commission: election stages, polling logistics, results verification and complaints.
- National Statistics Office: release calendars, metadata, quality, methodology and revisions.

Each workspace should have:

1. An institution identity and mandate summary.
2. A navigation structure appropriate to its real functions.
3. A role-specific dashboard.
4. A consistent case and record engine.
5. Sector-specific forms and vocabulary.
6. The same legal-basis, audit and evidence patterns.
7. A shared interaction language for save, submit, approve, refuse, correct and appeal.

Sector accents can help recognition, but avoid assigning a completely different colour palette or interaction model to every ministry. Users who work across institutions should not have to relearn the application every time.

H. Design-system implementation contract

Use design tokens and reusable components rather than scattered one-off styles.

A practical component inventory includes:

| Component family | Required components |
|---|---|
| Application shell | Header, sidebar, breadcrumbs, command/search panel, notification centre |
| Data presentation | Data table, pagination, filters, empty states, data freshness indicator |
| Casework | Case header, timeline, evidence list, related records, assignment panel |
| Forms | Field types, validation, conditional sections, attachments, save/resume |
| Decisions | Legal basis panel, decision summary, approval queue, reason capture, confirmation |
| Documents | Document viewer, version history, signature status, verification result |
| Audit | Event timeline, integrity status, access event, export manifest |
| Maps | Layer selector, legend, source and freshness metadata, accessible list alternative |
| Feedback | Inline errors, warning banners, confirmations, retry actions, escalation states |
| Administration | Institution settings, role assignments, delegations, policy configuration, integration status |
| Accessibility | Focus management, screen-reader announcements, accessible dialogs and keyboard navigation |

States that must be designed explicitly

Every component should define its normal, loading, empty, unavailable, denied, failed and recovery states.

Examples:

- Empty: “No cases match these filters.” Offer a useful next action.
- Unavailable: “The source system is not responding. Last successful update: [actual timestamp].”
- Denied: “You do not have permission to perform this action.” Where safe, explain the appropriate request process without disclosing restricted data.
- Validation error: identify the exact field and how to correct it.
- Conflict: show the conflicting versions and route the record to authorised review.
- Stale data: identify the source and last update; do not present it as current.
- Partial success: identify which operations succeeded, which failed and whether retrying is safe.
- Integrity failure: clearly warn that verification failed and prevent the record from being presented as verified.
- Session expiry: preserve unsaved work where safe, explain what happened and provide secure re-authentication.

A premium product is not one with no error states. It is one in which errors are understandable, recoverable and safe.

I. Implementation roadmap

The most important implementation decision is to avoid building dozens of ministry dashboards before the shared legal, record, workflow and security foundations work.

The following roadmap assumes that CivicOS already has a baseline application, institution registry, shared services and some sector workspaces. The objective is to upgrade that foundation, not discard it.

01

Audit and baseline verification

Inventory the existing repository, routes, components, schemas, migrations, background jobs, integration points, role policies and sample-data generators. Establish what actually works before modifying it.

Exit gate: evidence-backed baseline and prioritised gap register.

02

Legal authority and institutional model

Complete institutional standing, branch and independence attributes, establishing-law references, record ownership, delegations and approved inter-institution relationships.

Exit gate: authority and ownership rules validated by the designated legal and institutional owners.

03

Security, audit and workflow kernel

Enforce access, purpose limitation, high-impact approval, versioned decisions, audit integrity, record correction and production/demo separation.

Exit gate: automated negative tests demonstrate that unauthorised actions are blocked.

04

Premium design system and shared workspace

Implement the shell, casework, registers, forms, approval screens, documents, audit, empty/error states and accessible responsive patterns.

Exit gate: a representative workflow works end to end on desktop and mobile.

05

One pilot institution

Select an institution with clear authority, manageable integrations and a meaningful operational service. Complete real workflow configuration, record ownership, migration and user acceptance testing.

Exit gate: authorised users complete the service with real records and verifiable audit evidence.

06

Federation and institutional expansion

Connect the pilot to one other authorised institution. Test requests, denials, events, reconciliation, revocation, export and failure recovery before expanding the network.

Exit gate: the institutions exchange approved data without losing their separate authority or records.

Choosing the first pilot

Choose the pilot based on:

- Clear statutory or administrative authority
- A well-defined service and measurable workflow
- An accountable institutional owner
- Accessible source data or a realistic migration path
- A manageable number of external dependencies
- Low enough risk to validate the platform safely
- Reusability of the capabilities developed

Do not automatically choose the largest or most politically visible ministry. A narrowly scoped service that exercises the complete legal, records, approval, audit and integration model is often a better first proof of the architecture.

J. Risk register and mitigation plan

| Risk | Why it matters | Required mitigation |
|---|---|---|
| Invented or misleading data | Creates false confidence in government performance | No fabricated production values; source, provenance, freshness and quality status required |
| Incorrect legal authority | Can produce invalid decisions or unlawful disclosures | Versioned law registry, explicit authority assignment and legal validation |
| Executive overreach | Exposes independent institutions to unauthorised control | Independent administration, tenant boundaries, separate roles and negative access tests |
| Excessive personal-data collection | Creates privacy, security and misuse risks | Purpose limitation, minimum necessary fields, retention policies and privacy review |
| Unrestricted senior access | Enables misuse through privileged accounts | Least privilege, scoped delegation, independent audit and controlled break-glass access |
| Sample-data contamination | Makes demos appear to be real government operations | Environment separation, data-level sample labels and blocked production writes |
| AI making legal decisions | Can deny rights or impose obligations without lawful authority | AI advisory only for legally material decisions; authorised human decision and recorded reasons |
| Weak audit integrity | Makes actions difficult to investigate or prove | Protected event storage, integrity verification, separate administrative control and tested recovery |
| Migration loss | Destroys relationships, history or provenance | Reconciliation, source manifests, staged migration and validated rollback |
| Integration failure | Creates stale records and misleading statuses | Explicit failure states, retries, idempotency and reconciliation queues |
| Unclear record ownership | Allows competing authoritative records | Ownership registry, source-of-truth assignments and documented correction authority |
| Overly ambitious rollout | Produces many attractive but incomplete screens | Build shared foundations, prove one complete workflow and expand incrementally |
| Vendor lock-in | Makes sovereignty and future migration difficult | Portable schemas, documented interfaces, export tests and infrastructure-independent deployment |
| Inaccessible digital services | Excludes people who cannot use standard digital channels | WCAG 2.2 AA target, assisted service channels, plain language and usability testing |
| Unverified operational readiness | A successful build is mistaken for a production-ready system | Acceptance evidence, load testing, recovery exercises, security review and operational ownership |

Additional rule for AI across CivicOS

AI can help users draft correspondence, summarise permitted documents, classify incoming requests, find relevant procedures and identify missing information.

However:

- It must not independently issue a permit, refuse a benefit, determine guilt, order detention, alter a title register or issue a legally material decision.
- It must not gain broader record access than the user invoking it.
- It must not invent legal citations or pretend a source was checked.
- Its outputs must be distinguishable from authoritative records and official decisions.
- AI-assisted changes must remain reviewable, attributable and reversible where appropriate.
- The AI service must be opt-in at the level specified by national policy and institution configuration.
- Sensitive data must not be sent to an external AI service unless the use, transfer and provider are specifically authorised.

K. Production launch checklist

Before CivicOS is declared ready for a real institution, require evidence for each of the following.

Readiness checklist

0 / 20 checked

Use this as a working checklist. Ticking an item tracks your review here; it does not verify the underlying system or certify production readiness.

Legal and governance

[ ] Institution mandate and record ownership approved

[ ] Legal instruments versioned and effective dates validated

[ ] Decision authorities and delegations verified

[ ] Required dual approvals tested

Security and privacy

[ ] Role and purpose policies tested

[ ] Sensitive reads and exports audited

[ ] Privileged access and key controls reviewed

[ ] Retention and privacy requirements configured

Product and data

[ ] Representative workflow passes end-to-end testing

[ ] Production contains no sample or fabricated metrics

[ ] Record migration reconciled

[ ] Correction and appeal paths tested where applicable

Operations

[ ] Backup restoration tested

[ ] Incident response and support owners assigned

[ ] Monitoring and integration failures tested

[ ] Export and exit process verified

User experience

[ ] Keyboard and screen-reader testing completed

[ ] WCAG 2.2 AA assessment performed

[ ] RTL and required languages reviewed

[ ] Assisted and offline procedures tested where applicable

Copy checklistReset

L. Final recommendation: what CivicOS should become

CivicOS should be positioned as a sovereign digital-government operating platform that any nation can deploy, configure and govern according to its own constitutional and legal arrangements.

Its competitive advantage should not be the number of screens or AI features. It should be the ability to combine six capabilities that government institutions need to operate together safely:

01

Legal authority by design

Every material action is grounded in an applicable legal instrument, version and authorised decision-maker.

02

Independent institutions

Institutions retain their own records, administration, authority and oversight boundaries.

03

Operational services

Forms, cases, registers, documents, approvals, payments and fieldwork are real workflows, not static mock-ups.

04

Controlled federation

Institutions can connect incrementally through lawful, traceable, purpose-limited exchanges.

05

Verifiable national twin

Indicators are traceable to sources, methodologies, reporting periods and data-quality limitations.

06

Sovereign portability

Deployments can operate independently, recover from failure and migrate without losing records or history.

The immediate next step

Before adding more ministry screens, run a read-only audit of the existing CivicOS repository. Determine which capabilities already exist, which are partially implemented, which are only UI placeholders, and which security or legal controls are missing.

The audit should produce:

1. An inventory of routes, components, APIs, database tables, migrations and background jobs.
2. A map of existing institution archetypes, legal configuration, workflows and register ownership.
3. A list of screens still using generated sample data.
4. An assessment of production/demo isolation and audit coverage.
5. A security and independence gap register.
6. A proposed implementation sequence that preserves working functionality.
7. Tests and evidence required before each production capability can be considered complete.

Do not rebuild CivicOS from scratch. Do not start by redesigning every dashboard. Establish the existing baseline, then close the most consequential gaps in legal authority, data ownership, access enforcement, auditability and workflow completeness.

That is the path from an attractive government interface to a trustworthy sovereign platform.
