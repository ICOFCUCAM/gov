# CivicOS — Supplementary Government Form System (ChatGPT): parts 14–22 and JSON contracts for parts 5–13, kept verbatim

**Provenance.** ChatGPT's answer to the owner's follow-up of 21 October 2026,
which named the areas the 13 parts left out. Stage A, parts 14–22: labour and
employment; social protection and social services; foreign affairs, consular
and diaspora; tourism, culture, youth and sports; professional licensing
outside health; local and regional government; housing, planning and building
control; shared internal administration; the form design and governance
standard. Stage B: baseline JSON contracts for the core forms of parts 5–13.
It also sets a shared contract envelope (`contract_version` 1.0.0) and the
production activation gates for every form.

**Status.** Binding, like the 13 parts. Owner's instruction: never summarised;
every item measured against the work and its gap closed stage by stage; forms
built to a higher standard than this text, never lower. Each item is a row of
`docs/INSTITUTIONAL_REQUIREMENTS.md`. The text itself says it is not complete:
forms listed only in a catalogue table (for example LAB-EMP-002, 006, 007,
012–015, 017–019) and the remaining forms of parts 1–13 still need their own
contract; each is a register row marked "contract not yet given".

**Where this text meets a stricter platform rule.** Nothing below is dropped.
These items are kept as register rows marked *Platform rule stricter* or
*Legal review (I11)*, with the reason:

- Health (Stage B part 6): HLT-PAT-001 patient registration, HLT-ENC-002
  clinical encounter, HLT-REF-003 clinical referral, HLT-MED-004 dispensing to
  a patient, HLT-CARE-008 social care plan on a named person. "No patient or
  clinical field anywhere, no national patient record." HLT-PUB-005 is built
  as an aggregate count only; HLT-FAC-006 and HLT-INS-007 are built.
- Education (Stage B part 7): EDU-STD-001 student registration, EDU-ENR-003,
  EDU-ATT-004 and EDU-RES-005 on named students. "There is no student record
  system." EDU-CER-006 is built through qualification cases; EDU-FAC-007 and
  EDU-ACC-008 are built; attendance as aggregate returns only.
- Justice (Stage B part 5): JUS-PRO-006 (suspect references) and JUS-COR-008
  (custody admission) need a country's legal review; never a police field.
  Court forms are worked only by the judiciary.
- Defence and security (Stage B part 11): SEC-INT-006 intelligence products
  and SEC-OVS-007 need legal review; the platform is not an intelligence
  repository.
- Elections (Stage B part 12): ELE-REG-004 voter registration holds personal
  data under the electoral body alone; legal review before any build.
- Restricted personal data in the supplement (SOC-BEN-010 functional support
  needs, SOC-BEN-015/021 social-work records, LAB-EMP-010 medical evidence,
  FOR-CON-002/013 locations abroad): built only as restricted fields under the
  owning institution's read rule, every read in the access log; any medical
  content stays a sealed document reference, never a clinical field.

**How the text was kept.** Every word is here in the order delivered.

---

CivicOS — Supplementary Government Form System
You’re right: the original 13-part catalogue did not fully cover several major government functions, and it also needs consistent machine-readable contracts across all parts. The correct next step is to close those gaps without duplicating existing forms or treating a catalogue as proof that anything has already been implemented.

I’ll structure the work in two stages:

Stage A — Supplementary parts: nine additional parts covering the omitted sectors and the cross-government form design and governance standard. Each will include a form catalogue and JSON field contracts.

Stage B — JSON contracts for Parts 5–13: machine-readable contracts for the existing catalogues covering justice, health, education, natural resources, infrastructure, public safety, defence, constitutional institutions, and digital government.

The contracts will follow a shared standard: stable form IDs, typed fields, requiredness, validation rules, data classification, evidence requirements, legal basis, workflow and decision controls, and country-specific configuration. Where national law or a particular country’s agency structure determines a requirement, the contract will mark it for configuration rather than inventing a legal rule.
1. Shared JSON field contract standard
Every form in CivicOS should conform to one versioned contract. Sector forms may add fields, but must not bypass common validation, legal authority, privacy, workflow, audit or accessibility requirements.
{
  "contract_version": "1.0.0",
  "form_id": "LAB-EMP-001",
  "form_version": "1.0.0",
  "title": "Employment Registration",
  "domain": "labour_employment",
  "form_type": "application",
  "status": "draft",
  "country_profile": "${COUNTRY_PROFILE}",
  "owning_institution_id": "${AUTHORIZED_INSTITUTION_ID}",
  "competent_authority_rule_id": "${APPROVED_AUTHORITY_RULE_ID}",
  "legal_basis": [
    {
      "instrument_id": "${LAW_ID}",
      "version_id": "${LAW_VERSION_ID}",
      "provision": "${SECTION_OR_ARTICLE}",
      "verification_status": "requires_approval"
    }
  ],
  "applicability": {
    "citizen": true,
    "resident": true,
    "business": false,
    "government_official": false
  },
  "fields": [
    {
      "field_id": "employer_id",
      "key": "employer_id",
      "label": "Employer",
      "type": "entity_reference",
      "required": true,
      "classification": "confidential",
      "source": {
        "type": "authoritative_registry",
        "registry_id": "BUSINESS_REGISTER"
      },
      "validation_rule_ids": ["REF-EXISTS", "REF-ACTIVE"],
      "evidence_requirements": [],
      "help_text": "Select the registered employer.",
      "ui": {
        "widget": "entity_lookup",
        "order": 1
      }
    }
  ],
  "workflow": {
    "workflow_id": "LAB-EMP-REGISTRATION",
    "initial_state": "draft",
    "submission_state": "submitted",
    "decision_required": true,
    "separation_of_duties": true
  },
  "decision": {
    "decision_types": ["approved", "rejected", "returned_for_information"],
    "must_record_reason": true,
    "legal_basis_required": true,
    "appeal_route_rule_id": "${COUNTRY_APPEAL_RULE}"
  },
  "privacy": {
    "purpose_code": "EMPLOYMENT_ADMINISTRATION",
    "retention_rule_id": "${APPROVED_RETENTION_RULE}",
    "restricted_access_audit": true
  },
  "audit": {
    "record_creation": true,
    "field_change_history": true,
    "decision_history": true,
    "evidence_hashes": true
  },
  "accessibility": {
    "target": "WCAG_2_2_AA",
    "plain_language": true,
    "keyboard_operable": true
  }
}


Shared conventions
Property	Contract rule
form_id	Stable, globally unique identifier; never reused
field_id / key	Stable field identity; labels can change independently
type	Explicit type such as string, date, money, boolean, enum, entity_reference, address, document_reference, geo_reference
required	Boolean or a country-configured conditional requirement
classification	public, internal, confidential, restricted
source	User input, authoritative registry, verified external source, calculated value or approved rule
validation_rule_ids	References to versioned, testable validation rules
evidence_requirements	Evidence type, required status, accepted formats and verification method
legal_basis	Exact legal instrument, version and provision; never a guessed citation
workflow	State machine, authorized actors, handovers and separation-of-duties rules
decision	Decision types, reasons, lawful authority, review and appeal routes
privacy	Purpose limitation, retention, access restrictions and logging
audit	Append-only event history, corrections and evidence integrity
In the contracts below, ${...} means a value that must be resolved by an approved country profile or institutional configuration before production activation. It is not a literal value to store in production.

Stage A — Supplementary parts
Part 14. Labour and Employment
14.1 Full form catalogue
Form ID	Form name	Primary workflow
LAB-EMP-001	Employment registration	Register an employment relationship
LAB-EMP-002	Employment contract registration	Register or amend a contract where required
LAB-EMP-003	Employer registration	Register an employer with the labour authority
LAB-EMP-004	Vacancy notification	Submit and publish a job vacancy
LAB-EMP-005	Jobseeker registration	Register a jobseeker
LAB-EMP-006	Job placement referral	Refer a jobseeker to a vacancy or programme
LAB-EMP-007	Work permit or labour authorization referral	Route to the legally competent authority
LAB-EMP-008	Workplace inspection	Record an inspection and findings
LAB-EMP-009	Labour complaint	Report wage, contract or workplace violations
LAB-EMP-010	Occupational injury notification	Record a work-related injury or incident
LAB-EMP-011	Wage dispute claim	Submit a wage or remuneration claim
LAB-EMP-012	Collective labour dispute	Register a collective dispute
LAB-EMP-013	Mediation request	Request labour mediation
LAB-EMP-014	Work stoppage or strike notification	Record a legally required notification
LAB-EMP-015	Redundancy or collective dismissal notification	Notify the authority where required
LAB-EMP-016	Apprenticeship registration	Register an apprenticeship
LAB-EMP-017	Skills and vocational training enrolment	Apply to an approved employment training programme
LAB-EMP-018	Employment programme application	Apply for a public employment programme
LAB-EMP-019	Labour-market survey return	Submit employer labour-market statistics
LAB-EMP-020	Labour authority inspection response	Respond to findings or corrective actions
14.2 JSON field contracts
The following contracts specify the domain-specific fields. The shared standard above supplies the common metadata, legal basis, workflow, privacy and audit fields.
{
  "domain": "labour_employment",
  "contracts": [
    {
      "form_id": "LAB-EMP-001",
      "title": "Employment Registration",
      "fields": [
        {"key": "employer_id", "type": "entity_reference", "required": true, "source": "business_registry"},
        {"key": "worker_person_id", "type": "entity_reference", "required": true, "source": "identity_registry"},
        {"key": "employment_start_date", "type": "date", "required": true},
        {"key": "employment_type", "type": "enum", "required": true, "options_source": "approved_employment_types"},
        {"key": "occupation_code", "type": "code_reference", "required": true, "options_source": "approved_occupation_classification"},
        {"key": "contract_reference", "type": "document_reference", "required": false},
        {"key": "work_location", "type": "address_or_geo_reference", "required": true},
        {"key": "weekly_hours", "type": "decimal", "required": false, "validation_rule_ids": ["NONNEGATIVE"]},
        {"key": "remuneration", "type": "money", "required": false, "classification": "confidential"},
        {"key": "declaration_accuracy", "type": "boolean", "required": true}
      ]
    },
    {
      "form_id": "LAB-EMP-003",
      "title": "Employer Registration",
      "fields": [
        {"key": "business_id", "type": "entity_reference", "required": true},
        {"key": "legal_name", "type": "string", "required": true, "source": "business_registry"},
        {"key": "trading_name", "type": "string", "required": false},
        {"key": "employer_type", "type": "enum", "required": true},
        {"key": "industry_code", "type": "code_reference", "required": true},
        {"key": "registered_address", "type": "address", "required": true},
        {"key": "workplace_locations", "type": "array", "required": false, "items_type": "address_or_geo_reference"},
        {"key": "authorized_representative_id", "type": "entity_reference", "required": true},
        {"key": "payroll_registration_reference", "type": "string", "required": false}
      ]
    },
    {
      "form_id": "LAB-EMP-004",
      "title": "Vacancy Notification",
      "fields": [
        {"key": "employer_id", "type": "entity_reference", "required": true},
        {"key": "vacancy_title", "type": "string", "required": true},
        {"key": "occupation_code", "type": "code_reference", "required": true},
        {"key": "job_description", "type": "rich_text", "required": true},
        {"key": "work_location", "type": "address_or_geo_reference", "required": true},
        {"key": "employment_type", "type": "enum", "required": true},
        {"key": "minimum_qualifications", "type": "array", "required": false, "items_type": "string"},
        {"key": "salary_range", "type": "money_range", "required": false},
        {"key": "application_deadline", "type": "date", "required": false},
        {"key": "publication_consent", "type": "boolean", "required": true}
      ]
    },
    {
      "form_id": "LAB-EMP-005",
      "title": "Jobseeker Registration",
      "fields": [
        {"key": "person_id", "type": "entity_reference", "required": true},
        {"key": "contact_details", "type": "contact_object", "required": true},
        {"key": "work_authorization_status", "type": "verified_status_reference", "required": false},
        {"key": "occupations_sought", "type": "array", "required": true, "items_type": "code_reference"},
        {"key": "qualifications", "type": "array", "required": false, "items_type": "qualification_reference"},
        {"key": "skills", "type": "array", "required": false, "items_type": "code_reference"},
        {"key": "availability_date", "type": "date", "required": false},
        {"key": "preferred_locations", "type": "array", "required": false, "items_type": "geo_reference"},
        {"key": "accessibility_or_adjustment_request", "type": "restricted_text", "required": false}
      ]
    },
    {
      "form_id": "LAB-EMP-008",
      "title": "Workplace Inspection",
      "fields": [
        {"key": "inspection_id", "type": "string", "required": true},
        {"key": "employer_id", "type": "entity_reference", "required": true},
        {"key": "workplace_id", "type": "entity_reference", "required": true},
        {"key": "inspection_authority_id", "type": "entity_reference", "required": true},
        {"key": "inspection_date", "type": "date", "required": true},
        {"key": "inspection_basis", "type": "legal_rule_reference", "required": true},
        {"key": "findings", "type": "array", "required": true, "items_type": "inspection_finding"},
        {"key": "corrective_actions", "type": "array", "required": false, "items_type": "corrective_action"},
        {"key": "evidence", "type": "array", "required": false, "items_type": "document_or_media_reference"},
        {"key": "inspector_signature", "type": "signature_reference", "required": true}
      ]
    },
    {
      "form_id": "LAB-EMP-009",
      "title": "Labour Complaint",
      "fields": [
        {"key": "complainant_id", "type": "entity_reference", "required": true},
        {"key": "respondent_employer_id", "type": "entity_reference", "required": false},
        {"key": "complaint_category", "type": "enum", "required": true},
        {"key": "incident_period", "type": "date_range", "required": false},
        {"key": "description", "type": "long_text", "required": true},
        {"key": "requested_resolution", "type": "long_text", "required": false},
        {"key": "supporting_evidence", "type": "array", "required": false, "items_type": "document_reference"},
        {"key": "confidentiality_request", "type": "boolean", "required": false}
      ]
    },
    {
      "form_id": "LAB-EMP-010",
      "title": "Occupational Injury Notification",
      "fields": [
        {"key": "employer_id", "type": "entity_reference", "required": true},
        {"key": "worker_id", "type": "entity_reference", "required": true, "classification": "restricted"},
        {"key": "incident_datetime", "type": "datetime", "required": true},
        {"key": "workplace_id", "type": "entity_reference", "required": true},
        {"key": "incident_description", "type": "long_text", "required": true},
        {"key": "injury_classification", "type": "enum", "required": false},
        {"key": "immediate_control_measures", "type": "array", "required": false, "items_type": "string"},
        {"key": "medical_evidence_reference", "type": "document_reference", "required": false, "classification": "restricted"},
        {"key": "notifier_id", "type": "entity_reference", "required": true}
      ]
    },
    {
      "form_id": "LAB-EMP-011",
      "title": "Wage Dispute Claim",
      "fields": [
        {"key": "claimant_id", "type": "entity_reference", "required": true},
        {"key": "employer_id", "type": "entity_reference", "required": true},
        {"key": "claim_period", "type": "date_range", "required": true},
        {"key": "amount_claimed", "type": "money", "required": true},
        {"key": "currency", "type": "currency_code", "required": true},
        {"key": "calculation_breakdown", "type": "array", "required": true, "items_type": "money_claim_line"},
        {"key": "employment_evidence", "type": "array", "required": false, "items_type": "document_reference"},
        {"key": "prior_resolution_attempts", "type": "long_text", "required": false}
      ]
    },
    {
      "form_id": "LAB-EMP-016",
      "title": "Apprenticeship Registration",
      "fields": [
        {"key": "apprentice_id", "type": "entity_reference", "required": true},
        {"key": "employer_id", "type": "entity_reference", "required": true},
        {"key": "training_provider_id", "type": "entity_reference", "required": true},
        {"key": "occupation_code", "type": "code_reference", "required": true},
        {"key": "training_plan_reference", "type": "document_reference", "required": true},
        {"key": "start_date", "type": "date", "required": true},
        {"key": "planned_end_date", "type": "date", "required": true},
        {"key": "supervisor_id", "type": "entity_reference", "required": true},
        {"key": "funding_programme_id", "type": "entity_reference", "required": false}
      ]
    },
    {
      "form_id": "LAB-EMP-020",
      "title": "Inspection Response",
      "fields": [
        {"key": "inspection_case_id", "type": "entity_reference", "required": true},
        {"key": "respondent_id", "type": "entity_reference", "required": true},
        {"key": "finding_responses", "type": "array", "required": true, "items_type": "finding_response"},
        {"key": "remedial_evidence", "type": "array", "required": false, "items_type": "document_reference"},
        {"key": "completion_dates", "type": "array", "required": false, "items_type": "dated_action"},
        {"key": "authorized_signatory_id", "type": "entity_reference", "required": true}
      ]
    }
  ]
}


The remaining labour forms (LAB-EMP-002, 006, 007, 012–015, and 017–019) use the same contract envelope and are specified in the catalogue above. Their individual field contracts should be added to the form registry before that form is marked production-ready; they must not be treated as implemented merely because their IDs exist.

Part 15. Social Protection and Social Services
15.1 Full form catalogue
Form ID	Form name
SOC-BEN-001	Social protection registration
SOC-BEN-002	Benefit application
SOC-BEN-003	Household composition declaration
SOC-BEN-004	Income and means assessment
SOC-BEN-005	Benefit reassessment
SOC-BEN-006	Change-of-circumstances notification
SOC-BEN-007	Benefit suspension or termination review
SOC-BEN-008	Social assistance emergency request
SOC-BEN-009	Child and family support application
SOC-BEN-010	Disability support application
SOC-BEN-011	Older-person support application
SOC-BEN-012	Housing assistance application
SOC-BEN-013	Unemployment support referral
SOC-BEN-014	Caregiver support application
SOC-BEN-015	Social service case plan
SOC-BEN-016	Social worker assessment
SOC-BEN-017	Case review and reassessment
SOC-BEN-018	Benefit payment instruction
SOC-BEN-019	Benefit overpayment review
SOC-BEN-020	Benefit appeal or reconsideration
SOC-BEN-021	Safeguarding referral
SOC-BEN-022	Social service provider registration
SOC-BEN-023	Provider inspection and compliance return
SOC-BEN-024	Social protection programme reporting
15.2 JSON field contracts
{
  "domain": "social_protection",
  "contracts": [
    {
      "form_id": "SOC-BEN-001",
      "title": "Social Protection Registration",
      "fields": [
        {"key": "person_id", "type": "entity_reference", "required": true},
        {"key": "residence_status_reference", "type": "verified_status_reference", "required": false},
        {"key": "household_id", "type": "entity_reference", "required": false},
        {"key": "contact_details", "type": "contact_object", "required": true},
        {"key": "preferred_access_channel", "type": "enum", "required": false},
        {"key": "representative_id", "type": "entity_reference", "required": false},
        {"key": "representative_authorization", "type": "document_reference", "required": false}
      ]
    },
    {
      "form_id": "SOC-BEN-002",
      "title": "Benefit Application",
      "fields": [
        {"key": "applicant_id", "type": "entity_reference", "required": true},
        {"key": "benefit_program_id", "type": "entity_reference", "required": true},
        {"key": "household_id", "type": "entity_reference", "required": false},
        {"key": "application_reason", "type": "enum", "required": true},
        {"key": "requested_start_date", "type": "date", "required": false},
        {"key": "income_declaration_reference", "type": "document_reference", "required": false, "classification": "restricted"},
        {"key": "asset_declaration_reference", "type": "document_reference", "required": false, "classification": "restricted"},
        {"key": "supporting_evidence", "type": "array", "required": false, "items_type": "document_reference"},
        {"key": "declaration_accuracy", "type": "boolean", "required": true}
      ]
    },
    {
      "form_id": "SOC-BEN-003",
      "title": "Household Composition Declaration",
      "fields": [
        {"key": "declarant_id", "type": "entity_reference", "required": true},
        {"key": "household_id", "type": "entity_reference", "required": false},
        {"key": "household_members", "type": "array", "required": true, "items_type": "household_member_reference"},
        {"key": "effective_from", "type": "date", "required": true},
        {"key": "living_arrangement", "type": "enum", "required": false},
        {"key": "declaration_evidence", "type": "array", "required": false, "items_type": "document_reference"}
      ]
    },
    {
      "form_id": "SOC-BEN-004",
      "title": "Income and Means Assessment",
      "fields": [
        {"key": "case_id", "type": "entity_reference", "required": true},
        {"key": "assessment_period", "type": "date_range", "required": true},
        {"key": "income_items", "type": "array", "required": true, "items_type": "income_item"},
        {"key": "asset_items", "type": "array", "required": false, "items_type": "asset_item"},
        {"key": "deductions", "type": "array", "required": false, "items_type": "deduction_item"},
        {"key": "verified_data_sources", "type": "array", "required": true, "items_type": "source_reference"},
        {"key": "calculation_rule_version", "type": "rule_version_reference", "required": true},
        {"key": "assessor_id", "type": "entity_reference", "required": true}
      ]
    },
    {
      "form_id": "SOC-BEN-010",
      "title": "Disability Support Application",
      "fields": [
        {"key": "applicant_id", "type": "entity_reference", "required": true},
        {"key": "support_program_id", "type": "entity_reference", "required": true},
        {"key": "functional_support_needs", "type": "restricted_structured_data", "required": true},
        {"key": "assessment_document_references", "type": "array", "required": false, "items_type": "restricted_document_reference"},
        {"key": "requested_adjustments", "type": "array", "required": false, "items_type": "string"},
        {"key": "communication_adjustments", "type": "array", "required": false, "items_type": "string"},
        {"key": "representative_id", "type": "entity_reference", "required": false}
      ]
    },
    {
      "form_id": "SOC-BEN-015",
      "title": "Social Service Case Plan",
      "fields": [
        {"key": "case_id", "type": "entity_reference", "required": true},
        {"key": "case_owner_id", "type": "entity_reference", "required": true},
        {"key": "needs_assessment_reference", "type": "document_reference", "required": true},
        {"key": "agreed_goals", "type": "array", "required": true, "items_type": "measurable_goal"},
        {"key": "planned_interventions", "type": "array", "required": true, "items_type": "service_intervention"},
        {"key": "review_date", "type": "date", "required": true},
        {"key": "consent_or_lawful_basis_reference", "type": "legal_basis_reference", "required": true},
        {"key": "client_participation_status", "type": "enum", "required": true}
      ]
    },
    {
      "form_id": "SOC-BEN-018",
      "title": "Benefit Payment Instruction",
      "fields": [
        {"key": "benefit_case_id", "type": "entity_reference", "required": true},
        {"key": "approved_entitlement_reference", "type": "decision_reference", "required": true},
        {"key": "payee_id", "type": "entity_reference", "required": true},
        {"key": "amount", "type": "money", "required": true},
        {"key": "currency", "type": "currency_code", "required": true},
        {"key": "payment_period", "type": "date_range", "required": true},
        {"key": "payment_method_reference", "type": "protected_payment_reference", "required": true},
        {"key": "maker_id", "type": "entity_reference", "required": true},
        {"key": "approver_id", "type": "entity_reference", "required": true, "validation_rule_ids": ["APPROVER-DIFFERS-FROM-MAKER"]}
      ]
    },
    {
      "form_id": "SOC-BEN-019",
      "title": "Benefit Overpayment Review",
      "fields": [
        {"key": "case_id", "type": "entity_reference", "required": true},
        {"key": "overpayment_period", "type": "date_range", "required": true},
        {"key": "calculated_amount", "type": "money", "required": true},
        {"key": "calculation_version", "type": "rule_version_reference", "required": true},
        {"key": "notice_reference", "type": "document_reference", "required": false},
        {"key": "recipient_response", "type": "long_text", "required": false},
        {"key": "hardship_or_recovery_review", "type": "structured_assessment", "required": false},
        {"key": "review_decision_reference", "type": "decision_reference", "required": false}
      ]
    },
    {
      "form_id": "SOC-BEN-020",
      "title": "Benefit Appeal or Reconsideration",
      "fields": [
        {"key": "appellant_id", "type": "entity_reference", "required": true},
        {"key": "original_decision_id", "type": "decision_reference", "required": true},
        {"key": "appeal_grounds", "type": "array", "required": true, "items_type": "enum"},
        {"key": "statement_of_grounds", "type": "long_text", "required": true},
        {"key": "new_evidence", "type": "array", "required": false, "items_type": "document_reference"},
        {"key": "representative_id", "type": "entity_reference", "required": false},
        {"key": "submission_date", "type": "datetime", "required": true}
      ]
    }
  ]
}


Mandatory safeguards: sensitive social-service records must be purpose-limited and segregated by role. Benefit eligibility and payment decisions must be explainable, linked to the applicable rule version, reviewable by an authorized human, and appealable where the law provides. A risk score alone cannot determine loss of essential support.

Part 16. Foreign Affairs, Consular Services and Diaspora
16.1 Full form catalogue
Form ID	Form name
FOR-CON-001	Consular assistance request
FOR-CON-002	Emergency assistance abroad
FOR-CON-003	Passport or travel-document referral
FOR-CON-004	Emergency travel document application
FOR-CON-005	Notarial service request
FOR-CON-006	Civil-status document legalization request
FOR-CON-007	Document authentication verification
FOR-CON-008	Overseas birth registration referral
FOR-CON-009	Overseas death notification
FOR-CON-010	Overseas marriage registration referral
FOR-CON-011	Citizen detention or welfare visit request
FOR-CON-012	Missing citizen abroad report
FOR-CON-013	Evacuation assistance registration
FOR-CON-014	Diaspora registration
FOR-CON-015	Diaspora investment proposal
FOR-CON-016	Diaspora skills and expertise registration
FOR-CON-017	Overseas mission event or delegation request
FOR-DIP-018	Diplomatic note workflow
FOR-DIP-019	International agreement review
FOR-DIP-020	Treaty obligation reporting
FOR-DIP-021	Foreign visit and delegation planning
FOR-DIP-022	International development cooperation project
FOR-DIP-023	International incident reporting
FOR-DIP-024	Overseas mission operational return
16.2 JSON field contracts
{
  "domain": "foreign_affairs_consular_diaspora",
  "contracts": [
    {
      "form_id": "FOR-CON-001",
      "title": "Consular Assistance Request",
      "fields": [
        {"key": "requester_id", "type": "entity_reference", "required": true},
        {"key": "requester_contact", "type": "contact_object", "required": true, "classification": "confidential"},
        {"key": "country_of_location", "type": "country_code", "required": true},
        {"key": "city_or_region", "type": "string", "required": false},
        {"key": "assistance_category", "type": "enum", "required": true},
        {"key": "incident_datetime", "type": "datetime", "required": false},
        {"key": "description", "type": "long_text", "required": true, "classification": "confidential"},
        {"key": "urgency", "type": "enum", "required": true},
        {"key": "safe_contact_method", "type": "contact_method_reference", "required": false, "classification": "restricted"},
        {"key": "supporting_documents", "type": "array", "required": false, "items_type": "document_reference"}
      ]
    },
    {
      "form_id": "FOR-CON-002",
      "title": "Emergency Assistance Abroad",
      "fields": [
        {"key": "person_id", "type": "entity_reference", "required": true},
        {"key": "current_country", "type": "country_code", "required": true},
        {"key": "current_location", "type": "restricted_geo_reference", "required": false},
        {"key": "emergency_type", "type": "enum", "required": true},
        {"key": "immediate_risk_description", "type": "long_text", "required": true, "classification": "restricted"},
        {"key": "safe_contact_method", "type": "contact_method_reference", "required": true, "classification": "restricted"},
        {"key": "dependants_affected", "type": "array", "required": false, "items_type": "person_reference"},
        {"key": "assistance_actions", "type": "array", "required": false, "items_type": "assistance_action"}
      ]
    },
    {
      "form_id": "FOR-CON-004",
      "title": "Emergency Travel Document Application",
      "fields": [
        {"key": "applicant_id", "type": "entity_reference", "required": true},
        {"key": "identity_verification_result", "type": "verification_reference", "required": true},
        {"key": "citizenship_verification_reference", "type": "verification_reference", "required": true},
        {"key": "travel_reason", "type": "enum", "required": true},
        {"key": "destination_country", "type": "country_code", "required": true},
        {"key": "proposed_travel_date", "type": "date", "required": false},
        {"key": "lost_or_unavailable_document_report", "type": "document_reference", "required": false},
        {"key": "consular_officer_id", "type": "entity_reference", "required": true}
      ]
    },
    {
      "form_id": "FOR-CON-013",
      "title": "Evacuation Assistance Registration",
      "fields": [
        {"key": "person_id", "type": "entity_reference", "required": true},
        {"key": "current_country", "type": "country_code", "required": true},
        {"key": "current_location", "type": "restricted_geo_reference", "required": false},
        {"key": "contact_method", "type": "contact_method_reference", "required": true},
        {"key": "travel_document_status", "type": "verified_status_reference", "required": false},
        {"key": "dependants", "type": "array", "required": false, "items_type": "person_reference"},
        {"key": "mobility_or_accessibility_requirements", "type": "restricted_text", "required": false},
        {"key": "consent_to_operational_contact", "type": "boolean", "required": true}
      ]
    },
    {
      "form_id": "FOR-CON-014",
      "title": "Diaspora Registration",
      "fields": [
        {"key": "person_id", "type": "entity_reference", "required": true},
        {"key": "country_of_residence", "type": "country_code", "required": true},
        {"key": "residence_region", "type": "string", "required": false},
        {"key": "professional_sector", "type": "code_reference", "required": false},
        {"key": "engagement_interests", "type": "array", "required": false, "items_type": "enum"},
        {"key": "preferred_contact_channel", "type": "enum", "required": false},
        {"key": "communications_consent", "type": "boolean", "required": true}
      ]
    },
    {
      "form_id": "FOR-DIP-018",
      "title": "Diplomatic Note Workflow",
      "fields": [
        {"key": "originating_institution_id", "type": "entity_reference", "required": true},
        {"key": "recipient_state_or_organization_id", "type": "entity_reference", "required": true},
        {"key": "note_type", "type": "enum", "required": true},
        {"key": "subject", "type": "string", "required": true},
        {"key": "draft_document_reference", "type": "document_reference", "required": true},
        {"key": "classification", "type": "enum", "required": true},
        {"key": "legal_or_policy_review_reference", "type": "review_reference", "required": false},
        {"key": "authorized_signatory_id", "type": "entity_reference", "required": true},
        {"key": "dispatch_receipt_reference", "type": "document_reference", "required": false}
      ]
    },
    {
      "form_id": "FOR-DIP-019",
      "title": "International Agreement Review",
      "fields": [
        {"key": "agreement_title", "type": "string", "required": true},
        {"key": "counterparty_id", "type": "entity_reference", "required": true},
        {"key": "draft_agreement_reference", "type": "document_reference", "required": true},
        {"key": "policy_objectives", "type": "array", "required": true, "items_type": "string"},
        {"key": "legal_review_reference", "type": "review_reference", "required": true},
        {"key": "financial_implications_reference", "type": "document_reference", "required": false},
        {"key": "ratification_requirement_rule_id", "type": "rule_reference", "required": true},
        {"key": "approval_status", "type": "enum", "required": true}
      ]
    }
  ]
}


Consular assistance and evacuation records require tightly scoped access, safe-contact preferences, careful handling of location data and explicit controls against exposing protected information to unauthorized parties.

Part 17. Tourism, Culture, Youth and Sports
17.1 Full form catalogue
Form ID	Form name
TCS-TOU-001	Tourism operator registration
TCS-TOU-002	Tourist accommodation registration
TCS-TOU-003	Tourism operating licence application
TCS-TOU-004	Tourism quality inspection
TCS-TOU-005	Tourism statistics return
TCS-TOU-006	Destination development project application
TCS-CUL-007	Cultural organization registration
TCS-CUL-008	Cultural grant application
TCS-CUL-009	Cultural event permit or notification
TCS-CUL-010	Heritage asset registration
TCS-CUL-011	Heritage intervention approval
TCS-CUL-012	Museum or collection inventory submission
TCS-CUL-013	Creative-industry support application
TCS-YTH-014	Youth organization registration
TCS-YTH-015	Youth programme funding application
TCS-YTH-016	Youth participation consultation
TCS-YTH-017	Youth service provider registration
TCS-SPT-018	Sports organization registration
TCS-SPT-019	Sports facility registration
TCS-SPT-020	Sports grant application
TCS-SPT-021	National competition or event notification
TCS-SPT-022	Athlete development programme application
TCS-SPT-023	Sports integrity complaint
TCS-TCS-024	Sector programme monitoring return
17.2 JSON field contracts
{
  "domain": "tourism_culture_youth_sports",
  "contracts": [
    {
      "form_id": "TCS-TOU-001",
      "title": "Tourism Operator Registration",
      "fields": [
        {"key": "operator_business_id", "type": "entity_reference", "required": true},
        {"key": "operator_category", "type": "enum", "required": true},
        {"key": "operating_locations", "type": "array", "required": true, "items_type": "address_or_geo_reference"},
        {"key": "services_offered", "type": "array", "required": true, "items_type": "code_reference"},
        {"key": "safety_compliance_evidence", "type": "array", "required": false, "items_type": "document_reference"},
        {"key": "accessibility_information", "type": "structured_object", "required": false},
        {"key": "insurance_reference", "type": "document_reference", "required": false}
      ]
    },
    {
      "form_id": "TCS-CUL-008",
      "title": "Cultural Grant Application",
      "fields": [
        {"key": "applicant_entity_id", "type": "entity_reference", "required": true},
        {"key": "project_title", "type": "string", "required": true},
        {"key": "project_description", "type": "long_text", "required": true},
        {"key": "project_locations", "type": "array", "required": false, "items_type": "geo_reference"},
        {"key": "target_audiences", "type": "array", "required": true, "items_type": "enum"},
        {"key": "requested_amount", "type": "money", "required": true},
        {"key": "project_budget", "type": "document_reference", "required": true},
        {"key": "milestones", "type": "array", "required": true, "items_type": "dated_milestone"},
        {"key": "conflict_of_interest_declaration", "type": "boolean", "required": true}
      ]
    },
    {
      "form_id": "TCS-CUL-010",
      "title": "Heritage Asset Registration",
      "fields": [
        {"key": "asset_name", "type": "string", "required": true},
        {"key": "asset_type", "type": "enum", "required": true},
        {"key": "asset_location", "type": "geo_reference", "required": true},
        {"key": "land_or_custodian_reference", "type": "entity_reference", "required": false},
        {"key": "historical_significance", "type": "long_text", "required": true},
        {"key": "heritage_evidence", "type": "array", "required": false, "items_type": "document_or_media_reference"},
        {"key": "existing_protection_status", "type": "verified_status_reference", "required": false},
        {"key": "access_or_sensitivity_restrictions", "type": "structured_object", "required": false}
      ]
    },
    {
      "form_id": "TCS-YTH-015",
      "title": "Youth Programme Funding Application",
      "fields": [
        {"key": "organization_id", "type": "entity_reference", "required": true},
        {"key": "programme_title", "type": "string", "required": true},
        {"key": "programme_objectives", "type": "array", "required": true, "items_type": "string"},
        {"key": "participant_age_range", "type": "integer_range", "required": true},
        {"key": "safeguarding_plan_reference", "type": "document_reference", "required": true},
        {"key": "requested_amount", "type": "money", "required": true},
        {"key": "delivery_schedule", "type": "array", "required": true, "items_type": "dated_milestone"},
        {"key": "evaluation_plan_reference", "type": "document_reference", "required": true}
      ]
    },
    {
      "form_id": "TCS-SPT-018",
      "title": "Sports Organization Registration",
      "fields": [
        {"key": "organization_legal_name", "type": "string", "required": true},
        {"key": "organization_id", "type": "entity_reference", "required": false},
        {"key": "sport_codes", "type": "array", "required": true, "items_type": "code_reference"},
        {"key": "governing_body_reference", "type": "entity_reference", "required": false},
        {"key": "governance_documents", "type": "array", "required": true, "items_type": "document_reference"},
        {"key": "safeguarding_policy_reference", "type": "document_reference", "required": false},
        {"key": "authorized_representative_id", "type": "entity_reference", "required": true}
      ]
    },
    {
      "form_id": "TCS-SPT-023",
      "title": "Sports Integrity Complaint",
      "fields": [
        {"key": "reporter_id", "type": "entity_reference", "required": false},
        {"key": "confidential_contact_reference", "type": "restricted_contact_reference", "required": false},
        {"key": "complaint_category", "type": "enum", "required": true},
        {"key": "incident_date_or_period", "type": "date_range", "required": false},
        {"key": "involved_organization_ids", "type": "array", "required": false, "items_type": "entity_reference"},
        {"key": "description", "type": "long_text", "required": true, "classification": "restricted"},
        {"key": "evidence_references", "type": "array", "required": false, "items_type": "restricted_document_reference"},
        {"key": "retaliation_risk_flag", "type": "boolean", "required": false}
      ]
    }
  ]
}



Part 18. Professional Licensing Outside Health
This domain covers regulated occupations other than health professions. It must use a configurable register of occupations and legal powers, not one universal assumption that every profession needs a government licence.
18.1 Full form catalogue
Form ID	Form name
LIC-PRO-001	Professional licensing authority registration
LIC-PRO-002	Initial professional licence application
LIC-PRO-003	Qualification recognition application
LIC-PRO-004	Foreign qualification assessment
LIC-PRO-005	Professional examination registration
LIC-PRO-006	Examination result and certification record
LIC-PRO-007	Licence renewal
LIC-PRO-008	Continuing professional development return
LIC-PRO-009	Professional practice location registration
LIC-PRO-010	Licence scope or category amendment
LIC-PRO-011	Temporary or limited authorization application
LIC-PRO-012	Licence status verification request
LIC-PRO-013	Professional conduct complaint
LIC-PRO-014	Professional disciplinary case record
LIC-PRO-015	Licence suspension or restriction review
LIC-PRO-016	Licence surrender or cancellation
LIC-PRO-017	Professional register correction request
LIC-PRO-018	Training institution accreditation application
LIC-PRO-019	Training programme accreditation review
LIC-PRO-020	Licensing authority annual return
18.2 JSON field contracts
{
  "domain": "professional_licensing",
  "contracts": [
    {
      "form_id": "LIC-PRO-002",
      "title": "Initial Professional Licence Application",
      "fields": [
        {"key": "applicant_id", "type": "entity_reference", "required": true},
        {"key": "profession_code", "type": "code_reference", "required": true, "options_source": "regulated_occupation_registry"},
        {"key": "licence_category", "type": "code_reference", "required": true},
        {"key": "qualification_references", "type": "array", "required": true, "items_type": "qualification_reference"},
        {"key": "experience_declaration", "type": "structured_object", "required": false},
        {"key": "examination_result_reference", "type": "entity_reference", "required": false},
        {"key": "fitness_or_conduct_evidence", "type": "array", "required": false, "items_type": "document_reference"},
        {"key": "practice_location", "type": "address", "required": false},
        {"key": "declaration_accuracy", "type": "boolean", "required": true}
      ]
    },
    {
      "form_id": "LIC-PRO-003",
      "title": "Qualification Recognition Application",
      "fields": [
        {"key": "applicant_id", "type": "entity_reference", "required": true},
        {"key": "qualification_title", "type": "string", "required": true},
        {"key": "awarding_institution_id", "type": "entity_reference", "required": true},
        {"key": "awarding_country", "type": "country_code", "required": true},
        {"key": "qualification_date", "type": "date", "required": true},
        {"key": "transcript_reference", "type": "document_reference", "required": true},
        {"key": "authenticity_verification_reference", "type": "verification_reference", "required": false},
        {"key": "translation_reference", "type": "document_reference", "required": false},
        {"key": "target_profession_code", "type": "code_reference", "required": true}
      ]
    },
    {
      "form_id": "LIC-PRO-007",
      "title": "Licence Renewal",
      "fields": [
        {"key": "licence_id", "type": "entity_reference", "required": true},
        {"key": "applicant_id", "type": "entity_reference", "required": true},
        {"key": "current_licence_status", "type": "verified_status_reference", "required": true},
        {"key": "renewal_period", "type": "date_range", "required": true},
        {"key": "continuing_development_record", "type": "document_reference", "required": false},
        {"key": "required_declarations", "type": "array", "required": true, "items_type": "declaration_reference"},
        {"key": "fee_payment_reference", "type": "payment_reference", "required": false}
      ]
    },
    {
      "form_id": "LIC-PRO-013",
      "title": "Professional Conduct Complaint",
      "fields": [
        {"key": "respondent_licence_id", "type": "entity_reference", "required": false},
        {"key": "profession_code", "type": "code_reference", "required": true},
        {"key": "complainant_id", "type": "entity_reference", "required": false},
        {"key": "complaint_category", "type": "enum", "required": true},
        {"key": "incident_period", "type": "date_range", "required": false},
        {"key": "allegation_description", "type": "long_text", "required": true, "classification": "restricted"},
        {"key": "evidence_references", "type": "array", "required": false, "items_type": "restricted_document_reference"},
        {"key": "confidentiality_or_safety_concerns", "type": "restricted_text", "required": false}
      ]
    },
    {
      "form_id": "LIC-PRO-018",
      "title": "Training Institution Accreditation Application",
      "fields": [
        {"key": "institution_id", "type": "entity_reference", "required": true},
        {"key": "programme_codes", "type": "array", "required": true, "items_type": "code_reference"},
        {"key": "curriculum_reference", "type": "document_reference", "required": true},
        {"key": "staff_qualification_records", "type": "array", "required": true, "items_type": "qualification_reference"},
        {"key": "facilities_evidence", "type": "array", "required": false, "items_type": "document_reference"},
        {"key": "quality_assurance_policy", "type": "document_reference", "required": true},
        {"key": "requested_accreditation_period", "type": "date_range", "required": true}
      ]
    }
  ]
}


A licensing decision must use the competent regulator’s verified authority and the rules applicable to the specific profession. The platform must distinguish licence status, qualification recognition and professional disciplinary proceedings.

Part 19. Local and Regional Government
19.1 Full form catalogue
Form ID	Form name
LRG-ORG-001	Local government institution registration
LRG-ORG-002	Administrative boundary change proposal
LRG-ORG-003	Local government office-holder registration
LRG-ORG-004	Council meeting agenda and papers
LRG-ORG-005	Council resolution record
LRG-ORG-006	Local bylaw or ordinance proposal
LRG-ORG-007	Public consultation submission
LRG-FIN-008	Local budget submission
LRG-FIN-009	Local revenue and expenditure return
LRG-FIN-010	Intergovernmental transfer application
LRG-FIN-011	Local grant application
LRG-FIN-012	Local government audit response
LRG-SVC-013	Local public service request
LRG-SVC-014	Local complaint and grievance
LRG-PLN-015	Local development plan
LRG-PLN-016	Local infrastructure project proposal
LRG-PLN-017	Municipal service performance return
LRG-LND-018	Local land-use referral
LRG-EMR-019	Local emergency incident report
LRG-REP-020	Local government annual report
19.2 JSON field contracts
{
  "domain": "local_regional_government",
  "contracts": [
    {
      "form_id": "LRG-ORG-001",
      "title": "Local Government Institution Registration",
      "fields": [
        {"key": "institution_name", "type": "string", "required": true},
        {"key": "institution_type", "type": "enum", "required": true},
        {"key": "parent_or_peer_relationships", "type": "array", "required": false, "items_type": "institution_relationship_reference"},
        {"key": "establishing_law_reference", "type": "legal_instrument_reference", "required": true},
        {"key": "jurisdiction_geometry", "type": "geo_boundary_reference", "required": true},
        {"key": "administrative_code", "type": "string", "required": true},
        {"key": "competent_powers_reference", "type": "authority_profile_reference", "required": true}
      ]
    },
    {
      "form_id": "LRG-ORG-005",
      "title": "Council Resolution Record",
      "fields": [
        {"key": "council_id", "type": "entity_reference", "required": true},
        {"key": "meeting_id", "type": "entity_reference", "required": true},
        {"key": "agenda_item_id", "type": "entity_reference", "required": true},
        {"key": "resolution_text", "type": "long_text", "required": true},
        {"key": "vote_record", "type": "structured_object", "required": true},
        {"key": "quorum_verification_reference", "type": "verification_reference", "required": true},
        {"key": "conflict_of_interest_declarations", "type": "array", "required": false, "items_type": "declaration_reference"},
        {"key": "signed_minutes_reference", "type": "document_reference", "required": true}
      ]
    },
    {
      "form_id": "LRG-FIN-008",
      "title": "Local Budget Submission",
      "fields": [
        {"key": "local_government_id", "type": "entity_reference", "required": true},
        {"key": "fiscal_year", "type": "integer", "required": true},
        {"key": "budget_version", "type": "string", "required": true},
        {"key": "revenue_estimates", "type": "array", "required": true, "items_type": "budget_line"},
        {"key": "expenditure_estimates", "type": "array", "required": true, "items_type": "budget_line"},
        {"key": "capital_projects", "type": "array", "required": false, "items_type": "project_budget_line"},
        {"key": "approval_resolution_reference", "type": "document_reference", "required": false},
        {"key": "submission_signatory_id", "type": "entity_reference", "required": true}
      ]
    },
    {
      "form_id": "LRG-SVC-013",
      "title": "Local Public Service Request",
      "fields": [
        {"key": "requester_id", "type": "entity_reference", "required": false},
        {"key": "service_code", "type": "code_reference", "required": true},
        {"key": "service_location", "type": "address_or_geo_reference", "required": true},
        {"key": "description", "type": "long_text", "required": true},
        {"key": "supporting_evidence", "type": "array", "required": false, "items_type": "document_reference"},
        {"key": "preferred_contact_channel", "type": "enum", "required": false},
        {"key": "urgency", "type": "enum", "required": false}
      ]
    },
    {
      "form_id": "LRG-PLN-015",
      "title": "Local Development Plan",
      "fields": [
        {"key": "local_government_id", "type": "entity_reference", "required": true},
        {"key": "plan_period", "type": "date_range", "required": true},
        {"key": "planning_area_geometry", "type": "geo_boundary_reference", "required": true},
        {"key": "strategic_objectives", "type": "array", "required": true, "items_type": "string"},
        {"key": "consultation_record_reference", "type": "document_reference", "required": true},
        {"key": "budget_linkages", "type": "array", "required": false, "items_type": "budget_reference"},
        {"key": "environmental_assessment_reference", "type": "document_reference", "required": false},
        {"key": "approval_decision_reference", "type": "decision_reference", "required": false}
      ]
    },
    {
      "form_id": "LRG-REP-020",
      "title": "Local Government Annual Report",
      "fields": [
        {"key": "institution_id", "type": "entity_reference", "required": true},
        {"key": "reporting_year", "type": "integer", "required": true},
        {"key": "service_performance_indicators", "type": "array", "required": true, "items_type": "indicator_value_with_provenance"},
        {"key": "financial_report_reference", "type": "document_reference", "required": true},
        {"key": "audit_report_reference", "type": "document_reference", "required": false},
        {"key": "approved_plan_progress", "type": "array", "required": true, "items_type": "milestone_status"},
        {"key": "authorized_officer_id", "type": "entity_reference", "required": true}
      ]
    }
  ]
}


Local and regional authorities must have their own institutional scope, records and delegated powers. A central-government administrator must not be able to alter local resolutions, budgets or case records without an authorized legal relationship and an auditable action.

Part 20. Housing, Planning and Building Control
20.1 Full form catalogue
Form ID	Form name
HPC-HOU-001	Housing programme registration
HPC-HOU-002	Public or subsidized housing application
HPC-HOU-003	Housing eligibility assessment
HPC-HOU-004	Housing allocation decision record
HPC-HOU-005	Tenancy agreement registration
HPC-HOU-006	Housing repair or habitability complaint
HPC-HOU-007	Housing inspection
HPC-HOU-008	Homelessness prevention referral
HPC-PLN-009	Planning application
HPC-PLN-010	Zoning or land-use inquiry
HPC-PLN-011	Subdivision or land development application
HPC-PLN-012	Environmental or heritage planning referral
HPC-PLN-013	Public planning objection or representation
HPC-BLD-014	Building permit application
HPC-BLD-015	Building plan submission
HPC-BLD-016	Structural or technical review
HPC-BLD-017	Construction commencement notification
HPC-BLD-018	Building inspection
HPC-BLD-019	Stop-work or corrective action record
HPC-BLD-020	Occupancy or completion certificate application
HPC-BLD-021	Demolition permit application
HPC-BLD-022	Building control appeal
HPC-REG-023	Registered building professional verification
HPC-REG-024	Property and development compliance return
20.2 JSON field contracts
{
  "domain": "housing_planning_building_control",
  "contracts": [
    {
      "form_id": "HPC-HOU-002",
      "title": "Public or Subsidized Housing Application",
      "fields": [
        {"key": "applicant_id", "type": "entity_reference", "required": true},
        {"key": "household_id", "type": "entity_reference", "required": false},
        {"key": "housing_program_id", "type": "entity_reference", "required": true},
        {"key": "preferred_localities", "type": "array", "required": false, "items_type": "geo_reference"},
        {"key": "household_composition_reference", "type": "document_reference", "required": false},
        {"key": "income_assessment_reference", "type": "document_reference", "required": false, "classification": "restricted"},
        {"key": "accessibility_requirements", "type": "restricted_structured_data", "required": false},
        {"key": "current_housing_situation", "type": "enum", "required": true},
        {"key": "declaration_accuracy", "type": "boolean", "required": true}
      ]
    },
    {
      "form_id": "HPC-PLN-009",
      "title": "Planning Application",
      "fields": [
        {"key": "applicant_entity_id", "type": "entity_reference", "required": true},
        {"key": "site_parcel_reference", "type": "entity_reference", "required": true},
        {"key": "site_geometry", "type": "geo_geometry_reference", "required": true},
        {"key": "proposed_use_code", "type": "code_reference", "required": true},
        {"key": "development_description", "type": "long_text", "required": true},
        {"key": "site_plan_reference", "type": "document_reference", "required": true},
        {"key": "environmental_assessment_reference", "type": "document_reference", "required": false},
        {"key": "heritage_assessment_reference", "type": "document_reference", "required": false},
        {"key": "public_consultation_required_rule_id", "type": "rule_reference", "required": true}
      ]
    },
    {
      "form_id": "HPC-BLD-014",
      "title": "Building Permit Application",
      "fields": [
        {"key": "applicant_entity_id", "type": "entity_reference", "required": true},
        {"key": "site_parcel_reference", "type": "entity_reference", "required": true},
        {"key": "approved_planning_decision_reference", "type": "decision_reference", "required": false},
        {"key": "building_category", "type": "enum", "required": true},
        {"key": "building_use", "type": "enum", "required": true},
        {"key": "floor_area", "type": "measurement", "required": false},
        {"key": "design_documents", "type": "array", "required": true, "items_type": "document_reference"},
        {"key": "responsible_professional_ids", "type": "array", "required": false, "items_type": "entity_reference"},
        {"key": "technical_compliance_declarations", "type": "array", "required": true, "items_type": "declaration_reference"}
      ]
    },
    {
      "form_id": "HPC-BLD-018",
      "title": "Building Inspection",
      "fields": [
        {"key": "permit_case_id", "type": "entity_reference", "required": true},
        {"key": "inspection_stage", "type": "enum", "required": true},
        {"key": "inspection_date", "type": "date", "required": true},
        {"key": "inspector_id", "type": "entity_reference", "required": true},
        {"key": "inspection_checklist_version", "type": "rule_version_reference", "required": true},
        {"key": "findings", "type": "array", "required": true, "items_type": "inspection_finding"},
        {"key": "evidence_references", "type": "array", "required": false, "items_type": "document_or_media_reference"},
        {"key": "required_actions", "type": "array", "required": false, "items_type": "corrective_action"}
      ]
    },
    {
      "form_id": "HPC-BLD-020",
      "title": "Occupancy or Completion Certificate Application",
      "fields": [
        {"key": "permit_case_id", "type": "entity_reference", "required": true},
        {"key": "completion_date", "type": "date", "required": true},
        {"key": "final_inspection_reference", "type": "entity_reference", "required": false},
        {"key": "completion_documents", "type": "array", "required": true, "items_type": "document_reference"},
        {"key": "outstanding_conditions", "type": "array", "required": false, "items_type": "condition_reference"},
        {"key": "responsible_professional_declaration", "type": "document_reference", "required": false}
      ]
    }
  ]
}


Housing allocation must use transparent, approved eligibility and priority rules. Planning and building decisions must record the relevant parcel, applicable rule version, evidence, decision-maker and review or appeal route. A digital map or automated model must not silently override a legally authoritative property or planning record.

Part 21. Shared Internal Government Administration
This part provides common internal administration services for institutions. It does not make all internal records visible across government: each institution retains ownership and applies its own authorization rules.
21.1 Full form catalogue
Form ID	Form name
ADM-HR-001	Staff establishment and position request
ADM-HR-002	Recruitment requisition
ADM-HR-003	Recruitment evaluation
ADM-HR-004	Employee onboarding
ADM-HR-005	Personnel record update
ADM-HR-006	Leave request
ADM-HR-007	Performance review
ADM-HR-008	Training and development request
ADM-HR-009	Conflict-of-interest declaration
ADM-HR-010	Disciplinary process record
ADM-PAY-011	Payroll input submission
ADM-PAY-012	Payroll review and approval
ADM-PAY-013	Payroll correction request
ADM-FIN-014	Internal budget request
ADM-FIN-015	Budget reallocation request
ADM-FIN-016	Expense claim
ADM-FIN-017	Payment authorization
ADM-PRC-018	Internal procurement requisition
ADM-PRC-019	Procurement evaluation
ADM-PRC-020	Purchase order approval
ADM-PRC-021	Supplier onboarding
ADM-AST-022	Asset registration
ADM-AST-023	Asset transfer
ADM-AST-024	Asset disposal
ADM-REC-025	Records classification
ADM-REC-026	Records retention or disposal review
ADM-LEG-027	Internal legal advice request
ADM-LEG-028	Litigation or legal matter registration
ADM-ICT-029	ICT access request
ADM-ICT-030	Privileged access approval
ADM-ICT-031	ICT change request
ADM-ICT-032	Cybersecurity incident report
ADM-COM-033	Official communication approval
ADM-COM-034	Media inquiry response
ADM-AUD-035	Internal audit engagement
ADM-AUD-036	Audit finding and remediation
ADM-PLN-037	Institutional annual plan
ADM-PLN-038	Performance indicator return
ADM-GOV-039	Delegation of authority record
ADM-GOV-040	Internal policy approval
21.2 JSON field contracts
{
  "domain": "shared_internal_administration",
  "contracts": [
    {
      "form_id": "ADM-HR-002",
      "title": "Recruitment Requisition",
      "fields": [
        {"key": "institution_id", "type": "entity_reference", "required": true},
        {"key": "position_id", "type": "entity_reference", "required": true},
        {"key": "position_description_reference", "type": "document_reference", "required": true},
        {"key": "employment_type", "type": "enum", "required": true},
        {"key": "funded_position_reference", "type": "budget_reference", "required": true},
        {"key": "recruitment_justification", "type": "long_text", "required": true},
        {"key": "requester_id", "type": "entity_reference", "required": true},
        {"key": "budget_approval_reference", "type": "decision_reference", "required": true}
      ]
    },
    {
      "form_id": "ADM-PAY-012",
      "title": "Payroll Review and Approval",
      "fields": [
        {"key": "institution_id", "type": "entity_reference", "required": true},
        {"key": "pay_period", "type": "date_range", "required": true},
        {"key": "payroll_batch_reference", "type": "entity_reference", "required": true},
        {"key": "reconciliation_report_reference", "type": "document_reference", "required": true},
        {"key": "exception_items", "type": "array", "required": false, "items_type": "payroll_exception"},
        {"key": "prepared_by_id", "type": "entity_reference", "required": true},
        {"key": "reviewed_by_id", "type": "entity_reference", "required": true},
        {"key": "approved_by_id", "type": "entity_reference", "required": true, "validation_rule_ids": ["SEPARATION-OF-DUTIES"]},
        {"key": "approval_decision", "type": "enum", "required": true}
      ]
    },
    {
      "form_id": "ADM-PRC-018",
      "title": "Internal Procurement Requisition",
      "fields": [
        {"key": "requesting_unit_id", "type": "entity_reference", "required": true},
        {"key": "requester_id", "type": "entity_reference", "required": true},
        {"key": "items_or_services", "type": "array", "required": true, "items_type": "procurement_line"},
        {"key": "estimated_total", "type": "money", "required": true},
        {"key": "currency", "type": "currency_code", "required": true},
        {"key": "budget_line_reference", "type": "budget_reference", "required": true},
        {"key": "business_justification", "type": "long_text", "required": true},
        {"key": "procurement_method_rule_id", "type": "rule_reference", "required": true},
        {"key": "conflict_declaration_reference", "type": "document_reference", "required": true}
      ]
    },
    {
      "form_id": "ADM-ICT-029",
      "title": "ICT Access Request",
      "fields": [
        {"key": "requester_id", "type": "entity_reference", "required": true},
        {"key": "institution_id", "type": "entity_reference", "required": true},
        {"key": "target_system_id", "type": "entity_reference", "required": true},
        {"key": "requested_role_id", "type": "entity_reference", "required": true},
        {"key": "business_purpose", "type": "string", "required": true},
        {"key": "access_start_date", "type": "date", "required": true},
        {"key": "access_end_date", "type": "date", "required": false},
        {"key": "manager_approval_reference", "type": "decision_reference", "required": true},
        {"key": "system_owner_approval_reference", "type": "decision_reference", "required": true},
        {"key": "provisioning_record_reference", "type": "entity_reference", "required": false}
      ]
    },
    {
      "form_id": "ADM-ICT-030",
      "title": "Privileged Access Approval",
      "fields": [
        {"key": "requester_id", "type": "entity_reference", "required": true},
        {"key": "target_system_id", "type": "entity_reference", "required": true},
        {"key": "privileged_role_id", "type": "entity_reference", "required": true},
        {"key": "business_justification", "type": "long_text", "required": true},
        {"key": "requested_duration", "type": "duration", "required": true},
        {"key": "system_owner_approval_reference", "type": "decision_reference", "required": true},
        {"key": "security_approval_reference", "type": "decision_reference", "required": true},
        {"key": "session_logging_required", "type": "boolean", "required": true},
        {"key": "expiry_or_revocation_rule_id", "type": "rule_reference", "required": true}
      ]
    },
    {
      "form_id": "ADM-AUD-036",
      "title": "Audit Finding and Remediation",
      "fields": [
        {"key": "audit_engagement_id", "type": "entity_reference", "required": true},
        {"key": "finding_id", "type": "string", "required": true},
        {"key": "finding_description", "type": "long_text", "required": true},
        {"key": "severity_rule_id", "type": "rule_reference", "required": true},
        {"key": "evidence_references", "type": "array", "required": true, "items_type": "document_reference"},
        {"key": "management_response", "type": "long_text", "required": false},
        {"key": "remediation_owner_id", "type": "entity_reference", "required": true},
        {"key": "remediation_deadline", "type": "date", "required": true},
        {"key": "validation_result_reference", "type": "verification_reference", "required": false}
      ]
    },
    {
      "form_id": "ADM-GOV-039",
      "title": "Delegation of Authority Record",
      "fields": [
        {"key": "delegating_institution_id", "type": "entity_reference", "required": true},
        {"key": "delegator_office_id", "type": "entity_reference", "required": true},
        {"key": "delegate_office_or_person_id", "type": "entity_reference", "required": true},
        {"key": "delegated_action_codes", "type": "array", "required": true, "items_type": "permission_code"},
        {"key": "legal_basis_reference", "type": "legal_basis_reference", "required": true},
        {"key": "effective_period", "type": "date_range", "required": true},
        {"key": "restrictions", "type": "array", "required": false, "items_type": "string"},
        {"key": "approval_decision_reference", "type": "decision_reference", "required": true}
      ]
    }
  ]
}


Critical internal controls
- HR, payroll, procurement, payment and asset disposal workflows must have configurable separation-of-duties controls.
- ICT privileged access must be time-limited, approved, logged and revocable.
- Internal audit must be able to inspect evidence without having unrestricted power to change the records being audited.
- Legal advice and personnel files require restricted access and retention rules.
- The legislature, judiciary and independent institutions must retain independent ownership and control of their internal administration.

Part 22. Form Design and Governance Standard
This is the governance layer for every CivicOS form, not merely another sector catalogue. It controls how forms are proposed, designed, legally validated, tested, published, revised and retired.
22.1 Governance form catalogue
Form ID	Form name
FGS-STD-001	New form proposal
FGS-STD-002	Form requirements specification
FGS-STD-003	Legal basis and authority verification
FGS-STD-004	Data protection impact screening
FGS-STD-005	Data classification and retention assessment
FGS-STD-006	Form schema review
FGS-STD-007	Validation rule registration
FGS-STD-008	Evidence requirements approval
FGS-STD-009	Workflow and decision authority review
FGS-STD-010	Accessibility and plain-language assessment
FGS-STD-011	Translation and localization approval
FGS-STD-012	Integration and data-source registration
FGS-STD-013	Security threat assessment
FGS-STD-014	Form test and acceptance report
FGS-STD-015	Production release approval
FGS-STD-016	Form change request
FGS-STD-017	Version migration plan
FGS-STD-018	Form deprecation and retirement
FGS-STD-019	Form incident or defect report
FGS-STD-020	Periodic form compliance review
22.2 JSON field contracts
{
  "domain": "form_governance",
  "contracts": [
    {
      "form_id": "FGS-STD-001",
      "title": "New Form Proposal",
      "fields": [
        {"key": "proposing_institution_id", "type": "entity_reference", "required": true},
        {"key": "proposed_form_title", "type": "string", "required": true},
        {"key": "problem_statement", "type": "long_text", "required": true},
        {"key": "intended_users", "type": "array", "required": true, "items_type": "enum"},
        {"key": "proposed_service_or_workflow_id", "type": "entity_reference", "required": false},
        {"key": "legal_basis_status", "type": "enum", "required": true},
        {"key": "data_categories", "type": "array", "required": true, "items_type": "data_category_code"},
        {"key": "proposed_data_sources", "type": "array", "required": false, "items_type": "source_reference"},
        {"key": "form_owner_id", "type": "entity_reference", "required": true}
      ]
    },
    {
      "form_id": "FGS-STD-003",
      "title": "Legal Basis and Authority Verification",
      "fields": [
        {"key": "form_id_under_review", "type": "entity_reference", "required": true},
        {"key": "jurisdiction_id", "type": "entity_reference", "required": true},
        {"key": "legal_instrument_id", "type": "entity_reference", "required": true},
        {"key": "legal_instrument_version_id", "type": "entity_reference", "required": true},
        {"key": "relevant_provision", "type": "string", "required": true},
        {"key": "authorized_actions", "type": "array", "required": true, "items_type": "action_code"},
        {"key": "competent_authority_rule_id", "type": "entity_reference", "required": true},
        {"key": "reviewer_id", "type": "entity_reference", "required": true},
        {"key": "independent_confirmer_id", "type": "entity_reference", "required": true, "validation_rule_ids": ["PERSON-DIFFERS-FROM-REVIEWER"]},
        {"key": "verification_result", "type": "enum", "required": true}
      ]
    },
    {
      "form_id": "FGS-STD-004",
      "title": "Data Protection Impact Screening",
      "fields": [
        {"key": "form_id_under_review", "type": "entity_reference", "required": true},
        {"key": "data_subject_categories", "type": "array", "required": true, "items_type": "enum"},
        {"key": "personal_data_categories", "type": "array", "required": true, "items_type": "data_category_code"},
        {"key": "sensitive_data_involved", "type": "boolean", "required": true},
        {"key": "automated_decision_support_used", "type": "boolean", "required": true},
        {"key": "cross_institution_data_sharing", "type": "boolean", "required": true},
        {"key": "risk_assessment_reference", "type": "document_reference", "required": false},
        {"key": "mitigation_actions", "type": "array", "required": false, "items_type": "mitigation_action"},
        {"key": "privacy_officer_review_reference", "type": "review_reference", "required": false}
      ]
    },
    {
      "form_id": "FGS-STD-006",
      "title": "Form Schema Review",
      "fields": [
        {"key": "form_id_under_review", "type": "entity_reference", "required": true},
        {"key": "schema_version", "type": "string", "required": true},
        {"key": "schema_artifact_reference", "type": "document_reference", "required": true},
        {"key": "type_validation_result", "type": "enum", "required": true},
        {"key": "requiredness_review_result", "type": "enum", "required": true},
        {"key": "accessibility_review_result", "type": "enum", "required": true},
        {"key": "privacy_review_result", "type": "enum", "required": true},
        {"key": "backward_compatibility_result", "type": "enum", "required": true},
        {"key": "reviewer_id", "type": "entity_reference", "required": true},
        {"key": "review_findings", "type": "array", "required": false, "items_type": "review_finding"}
      ]
    },
    {
      "form_id": "FGS-STD-014",
      "title": "Form Test and Acceptance Report",
      "fields": [
        {"key": "form_id_under_test", "type": "entity_reference", "required": true},
        {"key": "schema_version", "type": "string", "required": true},
        {"key": "test_suite_version", "type": "string", "required": true},
        {"key": "validation_test_results", "type": "array", "required": true, "items_type": "test_result"},
        {"key": "authorization_test_results", "type": "array", "required": true, "items_type": "test_result"},
        {"key": "workflow_test_results", "type": "array", "required": true, "items_type": "test_result"},
        {"key": "accessibility_test_results", "type": "array", "required": true, "items_type": "test_result"},
        {"key": "security_test_results", "type": "array", "required": true, "items_type": "test_result"},
        {"key": "open_critical_defects", "type": "integer", "required": true},
        {"key": "acceptance_decision", "type": "enum", "required": true},
        {"key": "test_lead_id", "type": "entity_reference", "required": true}
      ]
    },
    {
      "form_id": "FGS-STD-015",
      "title": "Production Release Approval",
      "fields": [
        {"key": "form_id", "type": "entity_reference", "required": true},
        {"key": "approved_schema_version", "type": "string", "required": true},
        {"key": "legal_verification_reference", "type": "entity_reference", "required": true},
        {"key": "privacy_review_reference", "type": "entity_reference", "required": true},
        {"key": "acceptance_report_reference", "type": "entity_reference", "required": true},
        {"key": "deployment_environment", "type": "enum", "required": true},
        {"key": "release_notes_reference", "type": "document_reference", "required": true},
        {"key": "rollback_plan_reference", "type": "document_reference", "required": true},
        {"key": "release_proposer_id", "type": "entity_reference", "required": true},
        {"key": "release_approver_id", "type": "entity_reference", "required": true, "validation_rule_ids": ["PERSON-DIFFERS-FROM-PROPOSER"]}
      ]
    }
  ]
}


22.3 Production lifecycle
Every form must pass the following lifecycle:

proposed → requirements_review → legal_review → data_and_privacy_review → schema_review → implementation → testing → acceptance → production_approval → published

A form may be returned for changes or rejected at any review stage. A form must not enter published merely because its frontend exists.

A published form has an immutable version identifier. Changes to legal meaning, required data, validation, authority, retention or workflow must create a reviewed new version. Existing submitted cases retain their original form version and the applicable rule versions, except where a formally approved migration process lawfully requires otherwise.

Stage B — JSON field contracts for Parts 5–13
The earlier catalogues for Parts 5–13 contain multiple sector forms per domain. The following contracts establish the machine-readable baseline for their main workflows. They are domain-specific contract definitions, not a claim that every form in those parts has already been individually specified or implemented. Each remaining catalogue form must receive its own contract entry before release.
Part 5 — Justice, Courts, Prosecution, Corrections and Legal Aid
Core forms
- JUS-CASE-001 — Case registration
- JUS-FIL-002 — Filing or application
- JUS-EVD-003 — Evidence submission
- JUS-DEC-004 — Judicial decision record
- JUS-APP-005 — Appeal registration
- JUS-PRO-006 — Prosecution case referral
- JUS-LEG-007 — Legal aid application
- JUS-COR-008 — Corrections case and sentence record
{
  "domain": "justice",
  "contracts": [
    {
      "form_id": "JUS-CASE-001",
      "fields": [
        {"key": "case_type", "type": "enum", "required": true},
        {"key": "court_or_authority_id", "type": "entity_reference", "required": true},
        {"key": "parties", "type": "array", "required": true, "items_type": "party_reference"},
        {"key": "filing_date", "type": "date", "required": true},
        {"key": "jurisdiction_rule_id", "type": "rule_reference", "required": true},
        {"key": "originating_document_reference", "type": "document_reference", "required": true},
        {"key": "case_classification", "type": "enum", "required": true}
      ]
    },
    {
      "form_id": "JUS-FIL-002",
      "fields": [
        {"key": "case_id", "type": "entity_reference", "required": true},
        {"key": "filing_party_id", "type": "entity_reference", "required": true},
        {"key": "filing_type", "type": "enum", "required": true},
        {"key": "filing_document_reference", "type": "document_reference", "required": true},
        {"key": "filing_deadline_rule_id", "type": "rule_reference", "required": false},
        {"key": "fee_or_exemption_reference", "type": "entity_reference", "required": false}
      ]
    },
    {
      "form_id": "JUS-EVD-003",
      "fields": [
        {"key": "case_id", "type": "entity_reference", "required": true},
        {"key": "submitting_party_id", "type": "entity_reference", "required": true},
        {"key": "evidence_type", "type": "enum", "required": true},
        {"key": "evidence_reference", "type": "document_or_media_reference", "required": true},
        {"key": "chain_of_custody_reference", "type": "entity_reference", "required": false},
        {"key": "submitted_at", "type": "datetime", "required": true}
      ]
    },
    {
      "form_id": "JUS-DEC-004",
      "fields": [
        {"key": "case_id", "type": "entity_reference", "required": true},
        {"key": "decision_maker_office_id", "type": "entity_reference", "required": true},
        {"key": "decision_type", "type": "enum", "required": true},
        {"key": "decision_document_reference", "type": "document_reference", "required": true},
        {"key": "legal_basis_references", "type": "array", "required": true, "items_type": "legal_basis_reference"},
        {"key": "issued_at", "type": "datetime", "required": true},
        {"key": "review_or_appeal_route_rule_id", "type": "rule_reference", "required": false}
      ]
    },
    {
      "form_id": "JUS-APP-005",
      "fields": [
        {"key": "original_decision_id", "type": "decision_reference", "required": true},
        {"key": "appellant_id", "type": "entity_reference", "required": true},
        {"key": "appeal_grounds", "type": "long_text", "required": true},
        {"key": "appeal_document_reference", "type": "document_reference", "required": true},
        {"key": "deadline_rule_version", "type": "rule_version_reference", "required": true}
      ]
    },
    {
      "form_id": "JUS-PRO-006",
      "fields": [
        {"key": "referring_authority_id", "type": "entity_reference", "required": true},
        {"key": "referral_basis_reference", "type": "legal_basis_reference", "required": true},
        {"key": "suspect_or_party_references", "type": "array", "required": true, "items_type": "party_reference"},
        {"key": "evidence_manifest_reference", "type": "document_reference", "required": true},
        {"key": "referral_date", "type": "date", "required": true}
      ]
    },
    {
      "form_id": "JUS-LEG-007",
      "fields": [
        {"key": "applicant_id", "type": "entity_reference", "required": true},
        {"key": "case_id", "type": "entity_reference", "required": false},
        {"key": "legal_aid_program_id", "type": "entity_reference", "required": true},
        {"key": "means_assessment_reference", "type": "document_reference", "required": false, "classification": "restricted"},
        {"key": "eligibility_rule_version", "type": "rule_version_reference", "required": true}
      ]
    },
    {
      "form_id": "JUS-COR-008",
      "fields": [
        {"key": "person_id", "type": "entity_reference", "required": true},
        {"key": "sentence_or_order_reference", "type": "document_reference", "required": true},
        {"key": "receiving_facility_id", "type": "entity_reference", "required": true},
        {"key": "admission_date", "type": "date", "required": true},
        {"key": "sentence_calculation_rule_version", "type": "rule_version_reference", "required": true},
        {"key": "review_dates", "type": "array", "required": false, "items_type": "date"}
      ]
    }
  ]
}


Part 6 — Health, Public Health, Hospitals, Medicines and Social Care
Core forms
- HLT-PAT-001 — Patient registration
- HLT-ENC-002 — Clinical encounter
- HLT-REF-003 — Clinical referral
- HLT-MED-004 — Medicine authorization or dispensing record
- HLT-PUB-005 — Public health incident
- HLT-FAC-006 — Health facility registration
- HLT-INS-007 — Health inspection
- HLT-CARE-008 — Social care plan
{
  "domain": "health",
  "contracts": [
    {
      "form_id": "HLT-PAT-001",
      "fields": [
        {"key": "person_id", "type": "entity_reference", "required": true},
        {"key": "patient_identifier", "type": "string", "required": true},
        {"key": "identity_match_reference", "type": "verification_reference", "required": false},
        {"key": "emergency_contact_reference", "type": "entity_reference", "required": false},
        {"key": "communication_adjustments", "type": "array", "required": false, "items_type": "string"}
      ]
    },
    {
      "form_id": "HLT-ENC-002",
      "fields": [
        {"key": "patient_id", "type": "entity_reference", "required": true, "classification": "restricted"},
        {"key": "provider_id", "type": "entity_reference", "required": true},
        {"key": "encounter_datetime", "type": "datetime", "required": true},
        {"key": "clinical_observations", "type": "array", "required": false, "items_type": "coded_observation"},
        {"key": "clinical_assessment", "type": "restricted_structured_data", "required": true},
        {"key": "care_plan_reference", "type": "document_reference", "required": false}
      ]
    },
    {
      "form_id": "HLT-REF-003",
      "fields": [
        {"key": "patient_id", "type": "entity_reference", "required": true},
        {"key": "referring_provider_id", "type": "entity_reference", "required": true},
        {"key": "receiving_provider_or_facility_id", "type": "entity_reference", "required": true},
        {"key": "referral_reason_code", "type": "code_reference", "required": true},
        {"key": "clinical_summary_reference", "type": "document_reference", "required": true},
        {"key": "urgency", "type": "enum", "required": true}
      ]
    },
    {
      "form_id": "HLT-MED-004",
      "fields": [
        {"key": "patient_id", "type": "entity_reference", "required": true},
        {"key": "medicine_product_id", "type": "entity_reference", "required": true},
        {"key": "prescriber_id", "type": "entity_reference", "required": false},
        {"key": "authorization_or_order_reference", "type": "document_reference", "required": true},
        {"key": "quantity_and_unit", "type": "quantity_object", "required": true},
        {"key": "dispensing_facility_id", "type": "entity_reference", "required": true}
      ]
    },
    {
      "form_id": "HLT-PUB-005",
      "fields": [
        {"key": "incident_type", "type": "code_reference", "required": true},
        {"key": "reporting_facility_id", "type": "entity_reference", "required": true},
        {"key": "event_period", "type": "date_range", "required": true},
        {"key": "case_count", "type": "integer", "required": false},
        {"key": "geographic_area", "type": "geo_reference", "required": true},
        {"key": "source_and_verification_status", "type": "provenance_object", "required": true}
      ]
    },
    {
      "form_id": "HLT-FAC-006",
      "fields": [
        {"key": "facility_legal_name", "type": "string", "required": true},
        {"key": "facility_type", "type": "enum", "required": true},
        {"key": "owner_entity_id", "type": "entity_reference", "required": true},
        {"key": "facility_location", "type": "geo_reference", "required": true},
        {"key": "service_capabilities", "type": "array", "required": true, "items_type": "code_reference"},
        {"key": "licence_or_authorization_reference", "type": "document_reference", "required": false}
      ]
    },
    {
      "form_id": "HLT-INS-007",
      "fields": [
        {"key": "facility_id", "type": "entity_reference", "required": true},
        {"key": "inspector_id", "type": "entity_reference", "required": true},
        {"key": "inspection_rule_version", "type": "rule_version_reference", "required": true},
        {"key": "findings", "type": "array", "required": true, "items_type": "inspection_finding"},
        {"key": "corrective_actions", "type": "array", "required": false, "items_type": "corrective_action"}
      ]
    },
    {
      "form_id": "HLT-CARE-008",
      "fields": [
        {"key": "service_user_id", "type": "entity_reference", "required": true},
        {"key": "care_assessment_reference", "type": "document_reference", "required": true},
        {"key": "care_goals", "type": "array", "required": true, "items_type": "measurable_goal"},
        {"key": "interventions", "type": "array", "required": true, "items_type": "service_intervention"},
        {"key": "review_date", "type": "date", "required": true}
      ]
    }
  ]
}


Health records require strong patient confidentiality, authorized clinical access, provenance, and controls for emergency access. Clinical decision support must not be represented as a legally authorized clinician’s decision.
Part 7 — Education, Research, Universities, Skills and Workforce Development
Core forms
- EDU-STD-001 — Student registration
- EDU-ADM-002 — Admission application
- EDU-ENR-003 — Enrolment
- EDU-ATT-004 — Attendance and participation return
- EDU-RES-005 — Assessment result
- EDU-CER-006 — Qualification award
- EDU-FAC-007 — Education institution registration
- EDU-ACC-008 — Programme accreditation
{
  "domain": "education_research_skills",
  "contracts": [
    {
      "form_id": "EDU-STD-001",
      "fields": [
        {"key": "person_id", "type": "entity_reference", "required": true},
        {"key": "student_identifier", "type": "string", "required": true},
        {"key": "institution_id", "type": "entity_reference", "required": true},
        {"key": "education_level_code", "type": "code_reference", "required": true},
        {"key": "guardian_or_representative_reference", "type": "entity_reference", "required": false},
        {"key": "accessibility_adjustments", "type": "restricted_structured_data", "required": false}
      ]
    },
    {
      "form_id": "EDU-ADM-002",
      "fields": [
        {"key": "applicant_id", "type": "entity_reference", "required": true},
        {"key": "programme_id", "type": "entity_reference", "required": true},
        {"key": "prior_qualification_references", "type": "array", "required": false, "items_type": "qualification_reference"},
        {"key": "selection_evidence", "type": "array", "required": false, "items_type": "document_reference"},
        {"key": "admission_rule_version", "type": "rule_version_reference", "required": true}
      ]
    },
    {
      "form_id": "EDU-ENR-003",
      "fields": [
        {"key": "student_id", "type": "entity_reference", "required": true},
        {"key": "programme_id", "type": "entity_reference", "required": true},
        {"key": "academic_period_id", "type": "entity_reference", "required": true},
        {"key": "module_selections", "type": "array", "required": false, "items_type": "entity_reference"},
        {"key": "enrolment_status", "type": "enum", "required": true}
      ]
    },
    {
      "form_id": "EDU-RES-005",
      "fields": [
        {"key": "student_id", "type": "entity_reference", "required": true},
        {"key": "assessment_id", "type": "entity_reference", "required": true},
        {"key": "result_value", "type": "grade_or_score", "required": true},
        {"key": "grading_rule_version", "type": "rule_version_reference", "required": true},
        {"key": "assessor_id", "type": "entity_reference", "required": true},
        {"key": "moderation_reference", "type": "document_reference", "required": false}
      ]
    },
    {
      "form_id": "EDU-CER-006",
      "fields": [
        {"key": "student_id", "type": "entity_reference", "required": true},
        {"key": "qualification_id", "type": "entity_reference", "required": true},
        {"key": "awarding_institution_id", "type": "entity_reference", "required": true},
        {"key": "completion_verification_reference", "type": "verification_reference", "required": true},
        {"key": "award_date", "type": "date", "required": true},
        {"key": "credential_identifier", "type": "string", "required": true}
      ]
    },
    {
      "form_id": "EDU-FAC-007",
      "fields": [
        {"key": "institution_legal_name", "type": "string", "required": true},
        {"key": "institution_type", "type": "enum", "required": true},
        {"key": "governing_entity_id", "type": "entity_reference", "required": false},
        {"key": "location_references", "type": "array", "required": true, "items_type": "geo_reference"},
        {"key": "establishment_authorization_reference", "type": "document_reference", "required": true}
      ]
    },
    {
      "form_id": "EDU-ACC-008",
      "fields": [
        {"key": "institution_id", "type": "entity_reference", "required": true},
        {"key": "programme_id", "type": "entity_reference", "required": true},
        {"key": "curriculum_reference", "type": "document_reference", "required": true},
        {"key": "accreditation_standard_version", "type": "rule_version_reference", "required": true},
        {"key": "assessment_findings", "type": "array", "required": true, "items_type": "assessment_finding"},
        {"key": "review_decision_reference", "type": "decision_reference", "required": false}
      ]
    }
  ]
}


Part 8 — Agriculture, Land, Environment, Water, Energy and Natural Resources
Core forms
- AGR-LIC-001 — Agricultural operator registration
- AGR-SUB-002 — Agricultural support application
- LND-REG-003 — Land record registration or amendment
- ENV-PER-004 — Environmental permit application
- ENV-INS-005 — Environmental inspection
- WAT-USE-006 — Water abstraction or use application
- ENE-PRO-007 — Energy project application
- NAT-EXT-008 — Natural resource extraction authorization
{
  "domain": "agriculture_land_environment_water_energy",
  "contracts": [
    {
      "form_id": "AGR-LIC-001",
      "fields": [
        {"key": "operator_entity_id", "type": "entity_reference", "required": true},
        {"key": "farm_or_operation_locations", "type": "array", "required": true, "items_type": "geo_reference"},
        {"key": "production_categories", "type": "array", "required": true, "items_type": "code_reference"},
        {"key": "land_use_right_reference", "type": "document_reference", "required": false},
        {"key": "operation_start_date", "type": "date", "required": false}
      ]
    },
    {
      "form_id": "AGR-SUB-002",
      "fields": [
        {"key": "applicant_id", "type": "entity_reference", "required": true},
        {"key": "programme_id", "type": "entity_reference", "required": true},
        {"key": "eligible_activity_codes", "type": "array", "required": true, "items_type": "code_reference"},
        {"key": "requested_amount", "type": "money", "required": true},
        {"key": "land_or_operation_reference", "type": "entity_reference", "required": false},
        {"key": "eligibility_rule_version", "type": "rule_version_reference", "required": true}
      ]
    },
    {
      "form_id": "LND-REG-003",
      "fields": [
        {"key": "parcel_identifier", "type": "string", "required": true},
        {"key": "parcel_geometry_reference", "type": "geo_geometry_reference", "required": true},
        {"key": "claimant_or_owner_references", "type": "array", "required": true, "items_type": "entity_reference"},
        {"key": "interest_type", "type": "enum", "required": true},
        {"key": "source_instrument_references", "type": "array", "required": true, "items_type": "document_reference"},
        {"key": "survey_reference", "type": "document_reference", "required": false}
      ]
    },
    {
      "form_id": "ENV-PER-004",
      "fields": [
        {"key": "applicant_id", "type": "entity_reference", "required": true},
        {"key": "activity_code", "type": "code_reference", "required": true},
        {"key": "site_geometry", "type": "geo_geometry_reference", "required": true},
        {"key": "environmental_assessment_reference", "type": "document_reference", "required": false},
        {"key": "impact_categories", "type": "array", "required": true, "items_type": "enum"},
        {"key": "permit_rule_version", "type": "rule_version_reference", "required": true}
      ]
    },
    {
      "form_id": "ENV-INS-005",
      "fields": [
        {"key": "permit_or_operator_reference", "type": "entity_reference", "required": true},
        {"key": "inspector_id", "type": "entity_reference", "required": true},
        {"key": "inspection_location", "type": "geo_reference", "required": true},
        {"key": "findings", "type": "array", "required": true, "items_type": "inspection_finding"},
        {"key": "samples_or_measurements", "type": "array", "required": false, "items_type": "measurement_record"},
        {"key": "corrective_actions", "type": "array", "required": false, "items_type": "corrective_action"}
      ]
    },
    {
      "form_id": "WAT-USE-006",
      "fields": [
        {"key": "applicant_id", "type": "entity_reference", "required": true},
        {"key": "water_source_reference", "type": "entity_reference", "required": true},
        {"key": "abstraction_location", "type": "geo_reference", "required": true},
        {"key": "requested_volume_and_period", "type": "quantity_period_object", "required": true},
        {"key": "intended_use_code", "type": "code_reference", "required": true},
        {"key": "hydrological_assessment_reference", "type": "document_reference", "required": false}
      ]
    },
    {
      "form_id": "ENE-PRO-007",
      "fields": [
        {"key": "project_owner_id", "type": "entity_reference", "required": true},
        {"key": "technology_type", "type": "enum", "required": true},
        {"key": "project_geometry", "type": "geo_geometry_reference", "required": true},
        {"key": "planned_capacity", "type": "measurement", "required": false},
        {"key": "grid_or_network_connection_reference", "type": "entity_reference", "required": false},
        {"key": "environmental_review_reference", "type": "document_reference", "required": false}
      ]
    },
    {
      "form_id": "NAT-EXT-008",
      "fields": [
        {"key": "applicant_entity_id", "type": "entity_reference", "required": true},
        {"key": "resource_type", "type": "code_reference", "required": true},
        {"key": "extraction_area_geometry", "type": "geo_geometry_reference", "required": true},
        {"key": "requested_quantity_and_period", "type": "quantity_period_object", "required": true},
        {"key": "environmental_and_safety_plan_reference", "type": "document_reference", "required": true},
        {"key": "land_or_concession_right_reference", "type": "document_reference", "required": false}
      ]
    }
  ]
}


Land ownership, environmental permissions and extraction rights must remain distinct legal records. A permit in one register does not automatically establish a right in another.
Part 9 — Transport, Roads, Vehicles, Maritime, Aviation, Infrastructure and Urban Development
Core forms
- TRN-VEH-001 — Vehicle registration
- TRN-LIC-002 — Driver licence application
- TRN-ROAD-003 — Road works permit
- TRN-INC-004 — Transport incident report
- TRN-OPS-005 — Commercial transport operator registration
- TRN-MAR-006 — Maritime vessel registration
- TRN-AVI-007 — Aviation operator or facility application
- TRN-INF-008 — Public infrastructure project submission
{
  "domain": "transport_infrastructure",
  "contracts": [
    {
      "form_id": "TRN-VEH-001",
      "fields": [
        {"key": "vehicle_identifier", "type": "string", "required": true},
        {"key": "vehicle_type_code", "type": "code_reference", "required": true},
        {"key": "registered_keeper_id", "type": "entity_reference", "required": true},
        {"key": "ownership_evidence_reference", "type": "document_reference", "required": false},
        {"key": "technical_inspection_reference", "type": "document_reference", "required": false},
        {"key": "vehicle_status", "type": "enum", "required": true}
      ]
    },
    {
      "form_id": "TRN-LIC-002",
      "fields": [
        {"key": "applicant_id", "type": "entity_reference", "required": true},
        {"key": "licence_category", "type": "code_reference", "required": true},
        {"key": "identity_verification_reference", "type": "verification_reference", "required": true},
        {"key": "training_completion_reference", "type": "document_reference", "required": false},
        {"key": "examination_result_reference", "type": "document_reference", "required": false},
        {"key": "medical_or_fitness_rule_id", "type": "rule_reference", "required": false}
      ]
    },
    {
      "form_id": "TRN-ROAD-003",
      "fields": [
        {"key": "applicant_id", "type": "entity_reference", "required": true},
        {"key": "road_segment_reference", "type": "entity_reference", "required": true},
        {"key": "works_geometry", "type": "geo_geometry_reference", "required": true},
        {"key": "works_period", "type": "date_range", "required": true},
        {"key": "traffic_management_plan_reference", "type": "document_reference", "required": true},
        {"key": "safety_plan_reference", "type": "document_reference", "required": true}
      ]
    },
    {
      "form_id": "TRN-INC-004",
      "fields": [
        {"key": "incident_datetime", "type": "datetime", "required": true},
        {"key": "incident_location", "type": "geo_reference", "required": true},
        {"key": "transport_mode", "type": "enum", "required": true},
        {"key": "involved_asset_references", "type": "array", "required": false, "items_type": "entity_reference"},
        {"key": "injury_or_damage_summary", "type": "structured_object", "required": false},
        {"key": "reporter_id", "type": "entity_reference", "required": false},
        {"key": "evidence_references", "type": "array", "required": false, "items_type": "document_or_media_reference"}
      ]
    },
    {
      "form_id": "TRN-OPS-005",
      "fields": [
        {"key": "operator_entity_id", "type": "entity_reference", "required": true},
        {"key": "transport_modes", "type": "array", "required": true, "items_type": "enum"},
        {"key": "operating_area", "type": "geo_geometry_reference", "required": true},
        {"key": "fleet_references", "type": "array", "required": false, "items_type": "entity_reference"},
        {"key": "safety_management_system_reference", "type": "document_reference", "required": false},
        {"key": "operator_authorization_rule_id", "type": "rule_reference", "required": true}
      ]
    },
    {
      "form_id": "TRN-MAR-006",
      "fields": [
        {"key": "vessel_identifier", "type": "string", "required": true},
        {"key": "vessel_type", "type": "enum", "required": true},
        {"key": "registered_owner_id", "type": "entity_reference", "required": true},
        {"key": "tonnage_or_capacity", "type": "measurement", "required": false},
        {"key": "safety_certificate_references", "type": "array", "required": false, "items_type": "document_reference"}
      ]
    },
    {
      "form_id": "TRN-AVI-007",
      "fields": [
        {"key": "applicant_entity_id", "type": "entity_reference", "required": true},
        {"key": "authorization_type", "type": "enum", "required": true},
        {"key": "operating_area_or_facility", "type": "geo_reference", "required": true},
        {"key": "safety_management_document_reference", "type": "document_reference", "required": true},
        {"key": "technical_review_reference", "type": "document_reference", "required": false}
      ]
    },
    {
      "form_id": "TRN-INF-008",
      "fields": [
        {"key": "sponsoring_institution_id", "type": "entity_reference", "required": true},
        {"key": "project_title", "type": "string", "required": true},
        {"key": "project_geometry", "type": "geo_geometry_reference", "required": true},
        {"key": "capital_cost_estimate", "type": "money", "required": true},
        {"key": "funding_source_references", "type": "array", "required": true, "items_type": "budget_reference"},
        {"key": "environmental_review_reference", "type": "document_reference", "required": false},
        {"key": "procurement_strategy_reference", "type": "document_reference", "required": false}
      ]
    }
  ]
}


Part 10 — Public Safety, Police, Civil Protection, Emergency Management, Fire and Disaster Response
Core forms
- SAF-INC-001 — Public safety incident report
- SAF-CASE-002 — Incident case registration
- SAF-OPS-003 — Emergency response task
- SAF-DIS-004 — Disaster impact assessment
- SAF-RES-005 — Resource deployment request
- SAF-FIR-006 — Fire inspection
- SAF-INV-007 — Safety investigation
- SAF-REC-008 — Recovery and assistance registration
{
  "domain": "public_safety_emergency",
  "contracts": [
    {
      "form_id": "SAF-INC-001",
      "fields": [
        {"key": "incident_type", "type": "enum", "required": true},
        {"key": "incident_datetime", "type": "datetime", "required": true},
        {"key": "location", "type": "geo_reference", "required": true},
        {"key": "description", "type": "long_text", "required": true},
        {"key": "immediate_threat_level", "type": "enum", "required": true},
        {"key": "reporter_contact_reference", "type": "restricted_contact_reference", "required": false},
        {"key": "evidence_references", "type": "array", "required": false, "items_type": "document_or_media_reference"}
      ]
    },
    {
      "form_id": "SAF-OPS-003",
      "fields": [
        {"key": "incident_id", "type": "entity_reference", "required": true},
        {"key": "response_agency_id", "type": "entity_reference", "required": true},
        {"key": "task_type", "type": "enum", "required": true},
        {"key": "assigned_unit_id", "type": "entity_reference", "required": false},
        {"key": "operational_area", "type": "geo_geometry_reference", "required": true},
        {"key": "priority_rule_version", "type": "rule_version_reference", "required": true},
        {"key": "task_status", "type": "enum", "required": true}
      ]
    },
    {
      "form_id": "SAF-DIS-004",
      "fields": [
        {"key": "disaster_event_id", "type": "entity_reference", "required": true},
        {"key": "assessment_area", "type": "geo_geometry_reference", "required": true},
        {"key": "assessment_datetime", "type": "datetime", "required": true},
        {"key": "impact_categories", "type": "array", "required": true, "items_type": "enum"},
        {"key": "estimated_impact_values", "type": "array", "required": false, "items_type": "estimated_measure_with_provenance"},
        {"key": "verification_status", "type": "enum", "required": true},
        {"key": "assessor_id", "type": "entity_reference", "required": true}
      ]
    },
    {
      "form_id": "SAF-RES-005",
      "fields": [
        {"key": "incident_id", "type": "entity_reference", "required": true},
        {"key": "requesting_agency_id", "type": "entity_reference", "required": true},
        {"key": "resource_type", "type": "code_reference", "required": true},
        {"key": "quantity_requested", "type": "quantity_object", "required": true},
        {"key": "delivery_location", "type": "geo_reference", "required": true},
        {"key": "need_justification", "type": "long_text", "required": true},
        {"key": "approval_reference", "type": "decision_reference", "required": false}
      ]
    },
    {
      "form_id": "SAF-FIR-006",
      "fields": [
        {"key": "facility_id", "type": "entity_reference", "required": true},
        {"key": "inspector_id", "type": "entity_reference", "required": true},
        {"key": "inspection_standard_version", "type": "rule_version_reference", "required": true},
        {"key": "findings", "type": "array", "required": true, "items_type": "inspection_finding"},
        {"key": "remediation_deadline", "type": "date", "required": false},
        {"key": "enforcement_decision_reference", "type": "decision_reference", "required": false}
      ]
    },
    {
      "form_id": "SAF-INV-007",
      "fields": [
        {"key": "incident_id", "type": "entity_reference", "required": true},
        {"key": "investigating_authority_id", "type": "entity_reference", "required": true},
        {"key": "investigation_scope", "type": "long_text", "required": true},
        {"key": "evidence_manifest_reference", "type": "document_reference", "required": false},
        {"key": "findings_reference", "type": "document_reference", "required": false},
        {"key": "independent_review_reference", "type": "review_reference", "required": false}
      ]
    },
    {
      "form_id": "SAF-REC-008",
      "fields": [
        {"key": "affected_person_or_household_id", "type": "entity_reference", "required": false},
        {"key": "disaster_event_id", "type": "entity_reference", "required": true},
        {"key": "impact_assessment_reference", "type": "document_reference", "required": true},
        {"key": "assistance_program_id", "type": "entity_reference", "required": true},
        {"key": "assistance_request", "type": "structured_object", "required": true},
        {"key": "verification_status", "type": "enum", "required": true}
      ]
    }
  ]
}


Part 11 — Defence, National Security, Intelligence Governance, Cybersecurity and Critical Infrastructure Protection
Core forms
- DEF-AUT-001 — Defence authorization record
- DEF-OPS-002 — Operational task authorization
- DEF-LOG-003 — Logistics requisition
- DEF-PER-004 — Personnel assignment
- SEC-INC-005 — Classified security incident
- SEC-INT-006 — Intelligence product registration
- SEC-OVS-007 — Intelligence oversight review
- CIP-REG-008 — Critical infrastructure registration
- CIP-RSK-009 — Critical infrastructure risk assessment
- CIP-INC-010 — Critical infrastructure incident report
{
  "domain": "defence_security_critical_infrastructure",
  "contracts": [
    {
      "form_id": "DEF-AUT-001",
      "fields": [
        {"key": "authorizing_institution_id", "type": "entity_reference", "required": true},
        {"key": "authorization_type", "type": "enum", "required": true},
        {"key": "authority_rule_id", "type": "rule_reference", "required": true},
        {"key": "scope_reference", "type": "document_reference", "required": true},
        {"key": "effective_period", "type": "date_range", "required": true},
        {"key": "approval_record_reference", "type": "decision_reference", "required": true},
        {"key": "classification", "type": "enum", "required": true}
      ]
    },
    {
      "form_id": "DEF-LOG-003",
      "fields": [
        {"key": "requesting_unit_id", "type": "entity_reference", "required": true},
        {"key": "items", "type": "array", "required": true, "items_type": "logistics_line"},
        {"key": "operational_justification", "type": "long_text", "required": true},
        {"key": "delivery_location", "type": "restricted_geo_reference", "required": true},
        {"key": "funding_or_authorization_reference", "type": "document_reference", "required": true}
      ]
    },
    {
      "form_id": "SEC-INC-005",
      "fields": [
        {"key": "incident_id", "type": "string", "required": true},
        {"key": "reporting_unit_id", "type": "entity_reference", "required": true},
        {"key": "incident_datetime", "type": "datetime", "required": true},
        {"key": "classification", "type": "enum", "required": true},
        {"key": "incident_category", "type": "enum", "required": true},
        {"key": "affected_asset_references", "type": "array", "required": false, "items_type": "restricted_entity_reference"},
        {"key": "evidence_manifest_reference", "type": "document_reference", "required": false},
        {"key": "handling_caveats", "type": "array", "required": false, "items_type": "string"}
      ]
    },
    {
      "form_id": "SEC-INT-006",
      "fields": [
        {"key": "product_id", "type": "string", "required": true},
        {"key": "originating_authority_id", "type": "entity_reference", "required": true},
        {"key": "product_type", "type": "enum", "required": true},
        {"key": "source_provenance_reference", "type": "restricted_document_reference", "required": true},
        {"key": "confidence_and_limitations", "type": "structured_object", "required": true},
        {"key": "classification", "type": "enum", "required": true},
        {"key": "authorized_recipient_scope", "type": "array", "required": true, "items_type": "entity_reference"}
      ]
    },
    {
      "form_id": "SEC-OVS-007",
      "fields": [
        {"key": "reviewing_oversight_body_id", "type": "entity_reference", "required": true},
        {"key": "review_scope", "type": "long_text", "required": true},
        {"key": "authority_basis_reference", "type": "legal_basis_reference", "required": true},
        {"key": "evidence_access_log_reference", "type": "document_reference", "required": false},
        {"key": "findings", "type": "array", "required": true, "items_type": "oversight_finding"},
        {"key": "recommendations", "type": "array", "required": false, "items_type": "string"}
      ]
    },
    {
      "form_id": "CIP-REG-008",
      "fields": [
        {"key": "asset_operator_id", "type": "entity_reference", "required": true},
        {"key": "infrastructure_sector", "type": "code_reference", "required": true},
        {"key": "asset_location_reference", "type": "restricted_geo_reference", "required": true},
        {"key": "criticality_rule_version", "type": "rule_version_reference", "required": true},
        {"key": "asset_dependencies", "type": "array", "required": false, "items_type": "entity_reference"},
        {"key": "information_classification", "type": "enum", "required": true}
      ]
    },
    {
      "form_id": "CIP-RSK-009",
      "fields": [
        {"key": "asset_id", "type": "entity_reference", "required": true},
        {"key": "assessment_version", "type": "string", "required": true},
        {"key": "risk_methodology_version", "type": "rule_version_reference", "required": true},
        {"key": "threat_categories", "type": "array", "required": true, "items_type": "enum"},
        {"key": "mitigation_actions", "type": "array", "required": true, "items_type": "mitigation_action"},
        {"key": "assessor_id", "type": "entity_reference", "required": true},
        {"key": "reviewer_id", "type": "entity_reference", "required": true}
      ]
    },
    {
      "form_id": "CIP-INC-010",
      "fields": [
        {"key": "asset_id", "type": "entity_reference", "required": true},
        {"key": "incident_datetime", "type": "datetime", "required": true},
        {"key": "incident_type", "type": "enum", "required": true},
        {"key": "service_impact", "type": "structured_object", "required": true},
        {"key": "reporting_operator_id", "type": "entity_reference", "required": true},
        {"key": "containment_actions", "type": "array", "required": false, "items_type": "string"},
        {"key": "regulatory_notification_reference", "type": "document_reference", "required": false}
      ]
    }
  ]
}


Security and defence forms require sovereign classification policy, need-to-know authorization, compartmentalized access and audited oversight. A classification label alone is not an authorization decision. Oversight bodies must retain the legal independence and access powers granted to them by law.
Part 12 — Legislature, Elections, Political Parties, Constitutional Offices, Independent Institutions and Public Accountability
Core forms
- LEG-BIL-001 — Legislative proposal
- LEG-COM-002 — Committee inquiry or hearing
- LEG-VOT-003 — Parliamentary vote record
- ELE-REG-004 — Voter registration
- ELE-CAN-005 — Candidate nomination
- ELE-RES-006 — Polling-station result return
- ELE-OBS-007 — Election observation report
- POL-REG-008 — Political party registration
- IND-APP-009 — Independent office appointment record
- ACC-CMP-010 — Public accountability complaint
{
  "domain": "legislature_elections_constitutional_accountability",
  "contracts": [
    {
      "form_id": "LEG-BIL-001",
      "fields": [
        {"key": "sponsoring_member_or_body_id", "type": "entity_reference", "required": true},
        {"key": "bill_title", "type": "string", "required": true},
        {"key": "bill_text_reference", "type": "document_reference", "required": true},
        {"key": "explanatory_memo_reference", "type": "document_reference", "required": false},
        {"key": "committee_referral_rule_id", "type": "rule_reference", "required": false},
        {"key": "legislative_stage", "type": "enum", "required": true}
      ]
    },
    {
      "form_id": "LEG-VOT-003",
      "fields": [
        {"key": "legislative_body_id", "type": "entity_reference", "required": true},
        {"key": "motion_or_bill_reference", "type": "entity_reference", "required": true},
        {"key": "sitting_id", "type": "entity_reference", "required": true},
        {"key": "quorum_verification_reference", "type": "verification_reference", "required": true},
        {"key": "vote_method", "type": "enum", "required": true},
        {"key": "vote_result_record", "type": "structured_object", "required": true},
        {"key": "official_minutes_reference", "type": "document_reference", "required": true}
      ]
    },
    {
      "form_id": "ELE-REG-004",
      "fields": [
        {"key": "person_id", "type": "entity_reference", "required": true, "classification": "restricted"},
        {"key": "eligibility_rule_version", "type": "rule_version_reference", "required": true},
        {"key": "electoral_district_id", "type": "entity_reference", "required": true},
        {"key": "registration_status", "type": "enum", "required": true},
        {"key": "identity_verification_reference", "type": "verification_reference", "required": true}
      ]
    },
    {
      "form_id": "ELE-CAN-005",
      "fields": [
        {"key": "candidate_id", "type": "entity_reference", "required": true},
        {"key": "election_id", "type": "entity_reference", "required": true},
        {"key": "electoral_district_id", "type": "entity_reference", "required": true},
        {"key": "nomination_documents", "type": "array", "required": true, "items_type": "document_reference"},
        {"key": "eligibility_rule_version", "type": "rule_version_reference", "required": true},
        {"key": "nomination_decision_reference", "type": "decision_reference", "required": false}
      ]
    },
    {
      "form_id": "ELE-RES-006",
      "fields": [
        {"key": "election_id", "type": "entity_reference", "required": true},
        {"key": "polling_station_id", "type": "entity_reference", "required": true},
        {"key": "result_values", "type": "array", "required": true, "items_type": "candidate_or_option_count"},
        {"key": "invalid_or_blank_ballot_count", "type": "integer", "required": true},
        {"key": "official_result_document_reference", "type": "document_reference", "required": true},
        {"key": "verification_status", "type": "enum", "required": true}
      ]
    },
    {
      "form_id": "POL-REG-008",
      "fields": [
        {"key": "party_name", "type": "string", "required": true},
        {"key": "party_founders_or_officers", "type": "array", "required": true, "items_type": "person_reference"},
        {"key": "constitution_reference", "type": "document_reference", "required": true},
        {"key": "registered_address", "type": "address", "required": true},
        {"key": "registration_rule_version", "type": "rule_version_reference", "required": true},
        {"key": "registration_decision_reference", "type": "decision_reference", "required": false}
      ]
    },
    {
      "form_id": "IND-APP-009",
      "fields": [
        {"key": "constitutional_office_id", "type": "entity_reference", "required": true},
        {"key": "appointee_id", "type": "entity_reference", "required": true},
        {"key": "appointment_authority_reference", "type": "legal_basis_reference", "required": true},
        {"key": "appointment_instrument_reference", "type": "document_reference", "required": true},
        {"key": "term_start_date", "type": "date", "required": true},
        {"key": "term_end_date", "type": "date", "required": false}
      ]
    },
    {
      "form_id": "ACC-CMP-010",
      "fields": [
        {"key": "complainant_id", "type": "entity_reference", "required": false},
        {"key": "respondent_institution_id", "type": "entity_reference", "required": true},
        {"key": "complaint_category", "type": "enum", "required": true},
        {"key": "description", "type": "long_text", "required": true},
        {"key": "evidence_references", "type": "array", "required": false, "items_type": "document_reference"},
        {"key": "confidentiality_request", "type": "boolean", "required": false},
        {"key": "jurisdiction_rule_id", "type": "rule_reference", "required": true}
      ]
    }
  ]
}


Election records need strong integrity, restricted voter data, public-result verification and explicit correction procedures. A system must not expose secret ballots or allow administrators to alter certified results without a lawful, independently audited process.
Part 13 — Digital Government, Public Services, Statistics, Records and Interoperability
Core forms
- DGV-SVC-001 — Public service application
- DGV-IDN-002 — Identity verification request
- DGV-REP-003 — Representative authorization
- DGV-DOC-004 — Official document issuance
- DGV-REC-005 — Records access request
- DGV-STA-006 — Statistical data submission
- DGV-STA-007 — Statistical release approval
- DGV-INT-008 — Inter-institution data exchange registration
- DGV-INT-009 — Data-sharing authorization
- DGV-INT-010 — Integration incident report
{
  "domain": "digital_government_statistics_interoperability",
  "contracts": [
    {
      "form_id": "DGV-SVC-001",
      "fields": [
        {"key": "applicant_id", "type": "entity_reference", "required": true},
        {"key": "service_id", "type": "entity_reference", "required": true},
        {"key": "application_payload_reference", "type": "document_reference", "required": true},
        {"key": "representative_authorization_reference", "type": "document_reference", "required": false},
        {"key": "submission_channel", "type": "enum", "required": true},
        {"key": "declaration_accuracy", "type": "boolean", "required": true}
      ]
    },
    {
      "form_id": "DGV-IDN-002",
      "fields": [
        {"key": "subject_id", "type": "entity_reference", "required": true},
        {"key": "requesting_institution_id", "type": "entity_reference", "required": true},
        {"key": "purpose_code", "type": "code_reference", "required": true},
        {"key": "requested_attributes", "type": "array", "required": true, "items_type": "attribute_code"},
        {"key": "legal_basis_reference", "type": "legal_basis_reference", "required": true},
        {"key": "verification_result", "type": "enum", "required": true}
      ]
    },
    {
      "form_id": "DGV-REP-003",
      "fields": [
        {"key": "principal_id", "type": "entity_reference", "required": true},
        {"key": "representative_id", "type": "entity_reference", "required": true},
        {"key": "authorized_service_scopes", "type": "array", "required": true, "items_type": "entity_reference"},
        {"key": "effective_period", "type": "date_range", "required": true},
        {"key": "authorization_evidence_reference", "type": "document_reference", "required": false},
        {"key": "revocation_status", "type": "enum", "required": true}
      ]
    },
    {
      "form_id": "DGV-DOC-004",
      "fields": [
        {"key": "document_type", "type": "code_reference", "required": true},
        {"key": "subject_id", "type": "entity_reference", "required": true},
        {"key": "issuing_authority_id", "type": "entity_reference", "required": true},
        {"key": "source_record_reference", "type": "entity_reference", "required": true},
        {"key": "document_version", "type": "string", "required": true},
        {"key": "signature_reference", "type": "signature_reference", "required": true},
        {"key": "verification_identifier", "type": "string", "required": true}
      ]
    },
    {
      "form_id": "DGV-REC-005",
      "fields": [
        {"key": "requester_id", "type": "entity_reference", "required": true},
        {"key": "record_holding_institution_id", "type": "entity_reference", "required": true},
        {"key": "record_description", "type": "long_text", "required": true},
        {"key": "access_basis", "type": "enum", "required": true},
        {"key": "requested_format", "type": "enum", "required": false},
        {"key": "identity_or_authority_verification_reference", "type": "verification_reference", "required": false}
      ]
    },
    {
      "form_id": "DGV-STA-006",
      "fields": [
        {"key": "submitting_institution_id", "type": "entity_reference", "required": true},
        {"key": "dataset_id", "type": "entity_reference", "required": true},
        {"key": "reporting_period", "type": "date_range", "required": true},
        {"key": "dataset_reference", "type": "document_reference", "required": true},
        {"key": "methodology_version", "type": "string", "required": true},
        {"key": "provenance_and_quality_metadata", "type": "provenance_object", "required": true},
        {"key": "confidentiality_assessment_reference", "type": "document_reference", "required": false}
      ]
    },
    {
      "form_id": "DGV-STA-007",
      "fields": [
        {"key": "dataset_id", "type": "entity_reference", "required": true},
        {"key": "release_version", "type": "string", "required": true},
        {"key": "quality_review_reference", "type": "document_reference", "required": true},
        {"key": "disclosure_risk_assessment_reference", "type": "document_reference", "required": true},
        {"key": "release_classification", "type": "enum", "required": true},
        {"key": "approver_id", "type": "entity_reference", "required": true}
      ]
    },
    {
      "form_id": "DGV-INT-008",
      "fields": [
        {"key": "provider_institution_id", "type": "entity_reference", "required": true},
        {"key": "consumer_institution_id", "type": "entity_reference", "required": true},
        {"key": "data_product_id", "type": "entity_reference", "required": true},
        {"key": "exchange_purpose_code", "type": "code_reference", "required": true},
        {"key": "legal_basis_reference", "type": "legal_basis_reference", "required": true},
        {"key": "data_classification", "type": "enum", "required": true},
        {"key": "retention_rule_id", "type": "rule_reference", "required": true},
        {"key": "exchange_protocol_version", "type": "string", "required": true}
      ]
    },
    {
      "form_id": "DGV-INT-009",
      "fields": [
        {"key": "provider_institution_id", "type": "entity_reference", "required": true},
        {"key": "consumer_institution_id", "type": "entity_reference", "required": true},
        {"key": "requested_data_categories", "type": "array", "required": true, "items_type": "data_category_code"},
        {"key": "specific_purpose", "type": "long_text", "required": true},
        {"key": "legal_basis_reference", "type": "legal_basis_reference", "required": true},
        {"key": "approval_decision_reference", "type": "decision_reference", "required": false},
        {"key": "expiry_or_review_date", "type": "date", "required": true}
      ]
    },
    {
      "form_id": "DGV-INT-010",
      "fields": [
        {"key": "integration_id", "type": "entity_reference", "required": true},
        {"key": "incident_datetime", "type": "datetime", "required": true},
        {"key": "incident_category", "type": "enum", "required": true},
        {"key": "affected_data_products", "type": "array", "required": false, "items_type": "entity_reference"},
        {"key": "impact_assessment", "type": "structured_object", "required": true},
        {"key": "remediation_actions", "type": "array", "required": false, "items_type": "string"}
      ]
    }
  ]
}



Implementation rules for the complete form registry
1. Distinguish a catalogue entry from a complete contract
A form is not implementation-ready until it has:
- A complete, versioned field contract.
- Validation rules with executable tests.
- Evidence requirements and accepted formats.
- Verified legal basis and competent authority.
- Defined workflow states and permitted transitions.
- Institution-scoped permissions and separation-of-duties checks.
- Data classification, purpose limitation and retention rules.
- Audit events, correction handling and version migration.
- Accessibility, localization and security acceptance results.
2. Use a shared form registry, not hard-coded forms scattered across the application
Recommended core entities:
{
  "core_entities": [
    "form_definition",
    "form_version",
    "field_definition",
    "validation_rule",
    "evidence_requirement",
    "legal_basis_reference",
    "competent_authority_rule",
    "workflow_definition",
    "workflow_transition",
    "decision_record",
    "form_submission",
    "case_record",
    "document_record",
    "signature_record",
    "audit_event",
    "retention_rule",
    "data_exchange_agreement",
    "release_approval",
    "test_acceptance_record"
  ]
}


Form definitions and versions should be controlled centrally as platform metadata. Actual submissions and case records should remain owned by the authorized institution, with access granted through explicit permissions and lawful exchange rules.
3. Require production activation gates
A form cannot enter production until all of the following are true:
1. The form owner and competent authority are verified.
2. Legal references and their versions have been approved.
3. Required fields and validation rules pass automated tests.
4. Data sources are authoritative or explicitly labelled otherwise.
5. Access controls and restricted-record audit tests pass.
6. Workflow and decision permissions pass negative tests.
7. Accessibility and localization tests pass.
8. Retention and correction rules are approved.
9. Release and rollback plans are recorded.
10. The production approver is distinct from the proposer wherever separation of duties is required.
Important scope note: this response supplies the supplementary catalogues, detailed contracts for their core forms, and baseline contracts for the core workflows in Parts 5–13. It does not yet provide a separate, complete JSON object for every single form listed in every catalogue—particularly the remaining forms in Parts 1–13. Those entries must be generated and validated form by form rather than being silently represented as complete.
