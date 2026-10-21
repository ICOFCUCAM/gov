# CivicOS — Complete Government Form System (ChatGPT), field-contract series, parts 3 and 4 of 13, kept verbatim

**Provenance.** ChatGPT's continuation of the field-contract series (parts 1–2
in `FIELD-SERIES-PARTS-01-02.md`), pasted by the owner. Part 3: customs,
central bank, trade and industry, investment, public procurement and
cross-institution exchanges. Part 4: civil registration, national identity,
immigration, passports and citizenship. Note: from part 4 on, ChatGPT's
announced grouping differs from the plan at the top of part 1 (part 4 here
covers immigration and passports; part 5 is announced as justice, courts,
prosecution, corrections and legal aid); the text is kept as delivered.

**Status.** Binding, like `docs/INSTITUTIONAL_ARCHITECTURE_SPEC.md`. Owner's
instruction: never summarised; every item measured against the work and its
gap closed stage by stage; forms may be built to a higher standard than this
text, never lower. Each item is a row of `docs/INSTITUTIONAL_REQUIREMENTS.md`.

**How the text was kept.** Every word is here in the order delivered. Removed
only the owner's one-word "next" prompt between parts.

---

CivicOS — Complete Government Form System
Part 3 of 13 — Customs, Central Bank, Trade, Industry, Investment and Public Procurement
This part specifies the form catalogue for six institutional areas:
1. Customs administration
2. Central Bank and monetary authority
3. Trade and industry
4. Investment facilitation and investment promotion
5. Public procurement
6. Cross-institution controls for trade, customs, finance and procurement
Each service is organised by department and lifecycle. The catalogue distinguishes forms submitted by the public from internal assessment, inspection, approval, reporting and review forms.
Rules that govern every form in this part
- Universal: stable form IDs, versioned procedure packages, named validation rules, evidence traceability, separation of duties, multilingual content, accessible channels and auditable decisions.
- Country-configurable: national customs procedures, tariff schedules, import/export restrictions, currency and settlement arrangements, business-registration systems, investment schemes, procurement methods and regulator responsibilities.
- Legal review required: customs duties, tax treatment, monetary powers, licensing requirements, financial-sector authorizations, procurement exclusions, sanctions, appeal rights and statutory deadlines.
The IDs and source names below are CivicOS catalogue identifiers. They become active only when their national configuration, approved rules, values sources and legal references exist.

3.1 Customs Administration
Customs procedures should align with the relevant national customs law and applicable international data models, including the World Customs Organization Data Model. CivicOS must not assume that every country uses the same tariff, customs procedure, border agency structure or declaration requirements.
Department A — Import, export and transit declarations
Service lifecycle
Form ID	Form title	Submitter	Procedure stage	Main outcome
customs.import.declaration.submit	Submit an import declaration	Importer or authorized customs representative	Declaration	Import declaration registered
customs.import.declaration.amend	Amend an import declaration	Importer or representative	Amendment	Amended declaration
customs.import.declaration.withdraw	Request withdrawal of an import declaration	Importer or representative	Withdrawal	Withdrawal decision
customs.import.declaration.supplement	Supply missing import declaration information	Importer or representative	Further information	Additional information recorded
customs.export.declaration.submit	Submit an export declaration	Exporter or representative	Declaration	Export declaration registered
customs.export.declaration.amend	Amend an export declaration	Exporter or representative	Amendment	Amended declaration
customs.export.declaration.withdraw	Request withdrawal of an export declaration	Exporter or representative	Withdrawal	Withdrawal decision
customs.transit.declaration.submit	Submit a transit declaration	Authorized carrier, declarant or representative	Declaration	Transit record
customs.transit.guarantee.register	Register a transit guarantee	Authorized principal or guarantor	Guarantee registration	Guarantee record
customs.transit.arrival	Notify customs of transit arrival	Authorized carrier or representative	Arrival	Arrival record
customs.transit.discharge	Submit evidence that transit obligations were completed	Authorized principal or carrier	Discharge	Discharge decision
customs.transit.exception	Report a transit discrepancy or incident	Authorized carrier or principal	Exception	Exception case
customs.declaration.receipt	Record receipt of a declaration	Customs service	Intake	Receipt and reference
customs.declaration.completeness	Assess declaration completeness	Authorized customs officer	Assessment	Complete, incomplete or returned
customs.declaration.inspection	Record a legally authorized customs inspection	Authorized inspector	Inspection	Inspection record
customs.declaration.release_decision	Record a release or non-release decision	Authorized customs officer	Decision	Release status
customs.declaration.release_notice	Notify the declarant of the customs outcome	Customs service	Notification	Notice and delivery record
Import declaration: machine-usable contract
This contract represents a common import declaration structure. The national customs schema controls the exact mandatory data elements, commodity-specific requirements and accepted procedure codes.
{
  "schema_version": "civicos.form-contract.v1",
  "form_id": "customs.import.declaration.submit",
  "record_type": "customs.import_declaration",
  "form_version": 1,
  "status": "draft",
  "fields": [
    {
      "id": "import.declarant_ref",
      "type": "registry_reference",
      "required": true,
      "validation": [
        {"rule": "actor_authorized_for_customs_declaration", "params": {}},
        {"rule": "declarant_identity_resolves", "params": {}}
      ],
      "values_source": "customs.registry.authorized_declarants",
      "personal_data_class": "administrative",
      "evidence": [],
      "label": {"en": "Declarant"},
      "hint": {"en": "Select the person or organization legally responsible for submitting this declaration."},
      "error_text": {"en": {"actor_authorized_for_customs_declaration": "You are not authorized to submit this declaration.", "declarant_identity_resolves": "Select a valid declarant record."}}
    },
    {
      "id": "import.importer_ref",
      "type": "registry_reference",
      "required": true,
      "validation": [{"rule": "party_record_valid_for_customs", "params": {}}],
      "values_source": "civicos.registry.organisations",
      "personal_data_class": "administrative",
      "evidence": [],
      "label": {"en": "Importer"},
      "hint": {"en": "Select the importer identified by the applicable customs procedure."},
      "error_text": {"en": {"party_record_valid_for_customs": "Select a valid importer record."}}
    },
    {
      "id": "import.exporter_ref",
      "type": "registry_reference",
      "required": true,
      "validation": [{"rule": "external_party_record_complete", "params": {}}],
      "values_source": "customs.registry.trade_parties",
      "personal_data_class": "administrative",
      "evidence": [],
      "label": {"en": "Exporter or consignor"},
      "hint": {"en": "Identify the party sending the goods."},
      "error_text": {"en": {"external_party_record_complete": "Provide the exporter or consignor details required by the customs schema."}}
    },
    {
      "id": "import.transport_ref",
      "type": "registry_reference",
      "required": true,
      "validation": [{"rule": "transport_document_matches_consignment", "params": {}}],
      "values_source": "customs.transport_documents",
      "personal_data_class": "administrative",
      "evidence": [{"kind": "transport_document", "when": "as_required_by_the_approved_customs_procedure"}],
      "label": {"en": "Transport document"},
      "hint": {"en": "Select or provide the transport reference for this consignment."},
      "error_text": {"en": {"transport_document_matches_consignment": "The transport record does not match this consignment."}}
    },
    {
      "id": "import.procedure_code",
      "type": "choice",
      "required": true,
      "validation": [{"rule": "customs_procedure_code_active", "params": {}}],
      "values_source": "customs.country.approved.procedure_codes",
      "personal_data_class": "administrative",
      "evidence": [],
      "label": {"en": "Requested customs procedure"},
      "hint": {"en": "Choose the procedure applicable to these goods."},
      "error_text": {"en": {"customs_procedure_code_active": "Select a procedure currently authorized for this declaration."}}
    },
    {
      "id": "import.country_of_origin",
      "type": "choice",
      "required": true,
      "validation": [{"rule": "iso3166_country_code_valid", "params": {}}, {"rule": "origin_evidence_rule_applied", "params": {}}],
      "values_source": "iso.3166-1.alpha2.current",
      "personal_data_class": "administrative",
      "evidence": [{"kind": "origin_evidence", "when": "when_required_by_the_applicable_origin_rule"}],
      "label": {"en": "Country of origin"},
      "hint": {"en": "Use the origin definition applicable to these goods, not automatically the dispatch country."},
      "error_text": {"en": {"iso3166_country_code_valid": "Choose a valid country code.", "origin_evidence_rule_applied": "The origin claim needs the evidence required by the applicable rule."}}
    },
    {
      "id": "import.goods_items",
      "type": "registry_reference",
      "required": true,
      "validation": [{"rule": "customs_goods_schema_complete", "params": {}}, {"rule": "commodity_classification_active", "params": {}}],
      "values_source": "customs.country.approved.goods_items",
      "personal_data_class": "administrative",
      "evidence": [],
      "label": {"en": "Goods and commodity classifications"},
      "hint": {"en": "Enter each goods item using the approved national customs data schema."},
      "error_text": {"en": {"customs_goods_schema_complete": "Complete the required information for each goods item.", "commodity_classification_active": "One or more commodity codes are not valid for this declaration."}}
    },
    {
      "id": "import.invoice_ref",
      "type": "registry_reference",
      "required": true,
      "validation": [{"rule": "invoice_matches_declared_goods", "params": {}}],
      "values_source": "customs.trade_documents",
      "personal_data_class": "administrative",
      "evidence": [{"kind": "commercial_invoice", "when": "when_required_by_the_approved_customs_procedure"}],
      "label": {"en": "Commercial invoice"},
      "hint": {"en": "Link the invoice or other accepted valuation evidence."},
      "error_text": {"en": {"invoice_matches_declared_goods": "The invoice does not match the declared goods or parties."}}
    },
    {
      "id": "import.declared_customs_value",
      "type": "money",
      "required": true,
      "validation": [{"rule": "value_basis_allowed_for_procedure", "params": {}}, {"rule": "currency_and_conversion_rule_resolved", "params": {}}],
      "values_source": "customs.country.approved.valuation_rules",
      "personal_data_class": "administrative",
      "evidence": [{"kind": "customs_valuation_evidence", "when": "as_required_by_the_applicable_valuation_rule"}],
      "label": {"en": "Declared customs value"},
      "hint": {"en": "Enter the value calculated under the applicable customs valuation rules."},
      "error_text": {"en": {"value_basis_allowed_for_procedure": "The declared value does not meet the applicable valuation requirements.", "currency_and_conversion_rule_resolved": "The currency or conversion rule is invalid for this declaration."}}
    },
    {
      "id": "import.supporting_documents",
      "type": "document",
      "required": false,
      "validation": [{"rule": "evidence_requirements_satisfied", "params": {}}, {"rule": "malware_scan_passed", "params": {}}],
      "values_source": "civicos.documents.secure_store",
      "personal_data_class": "restricted",
      "evidence": [{"kind": "customs_supporting_document", "when": "as_required_by_the_approved_customs_procedure"}],
      "label": {"en": "Supporting documents"},
      "hint": {"en": "Attach the permits, certificates and other evidence required for this declaration."},
      "error_text": {"en": {"evidence_requirements_satisfied": "Required evidence is missing.", "malware_scan_passed": "The file could not be accepted safely."}}
    },
    {
      "id": "import.declaration_attestation",
      "type": "boolean",
      "required": true,
      "validation": [{"rule": "must_be_true", "params": {}}],
      "values_source": null,
      "personal_data_class": "administrative",
      "evidence": [{"kind": "declarant_attestation", "when": "as_required_by_the_approved_customs_law_and_procedure"}],
      "label": {"en": "Confirm the declaration"},
      "hint": {"en": "Read the approved declaration and legal effect before submitting."},
      "error_text": {"en": {"must_be_true": "Confirm the declaration to submit."}}
    }
  ],
  "legal_basis": [],
  "country_decisions": [
    "National customs law and declaration procedure types.",
    "Required party, transport, goods, origin and valuation data elements.",
    "Commodity classification and tariff schedule versions.",
    "Customs valuation, exchange-rate and rounding rules.",
    "Required certificates, permits, declarations and inspection powers.",
    "Amendment, withdrawal, release, review and appeal rules."
  ]
}


Important implementation detail: import.goods_items is a reference to a typed collection, not a single free-text field. The approved collection schema must define each goods line's commodity code, description, quantity, unit, weight where required, origin, customs procedure, value components, package information and applicable supporting references. Every field must have its own validation and classification metadata.
Department B — Tariff classification, customs valuation and origin
Form ID	Form title	Submitter	Procedure stage	Main outcome
customs.classification.advice_request	Request advance tariff-classification advice	Importer, exporter or authorized representative	Application	Advice case
customs.classification.ruling_request	Request a binding classification ruling where available	Eligible trader or representative	Application	Ruling case
customs.classification.ruling_amend	Request amendment of a classification ruling	Ruling holder or representative	Amendment	Amendment decision
customs.classification.ruling.withdraw	Request withdrawal of a classification ruling	Ruling holder or representative	Withdrawal	Withdrawal decision
customs.classification.challenge	Challenge a commodity classification	Declarant or eligible representative	Objection	Classification review
customs.valuation.adjustment_request	Request review of customs valuation	Declarant or representative	Review	Valuation review
customs.valuation.disclosure	Disclose additional valuation information	Declarant or representative	Further information	Additional evidence recorded
customs.valuation.assessment	Record an authorized valuation assessment	Customs officer	Assessment	Valuation record
customs.origin.proof.submit	Submit evidence of goods' origin	Trader or representative	Evidence submission	Origin evidence record
customs.origin.preference_claim	Claim a preferential origin treatment	Importer or representative	Declaration assessment	Origin claim assessed
customs.origin.verification_request	Request origin verification through an authorized route	Customs authority or authorized body	Verification	Verification case
customs.origin.verification_response	Respond to an origin verification request	Exporter, issuing authority or authorized body	Response	Verification evidence
customs.origin.decision	Record the origin determination	Authorized customs officer	Decision	Origin outcome
customs.classification.objection	Object to an eligible classification decision	Eligible trader or representative	Objection	Objection case
customs.classification.appeal	Appeal an eligible classification or valuation decision	Eligible appellant	Appeal	Appeal record
Specific fields
- classification.goods_description: long_text, required; 20–10,000 characters; administrative.
- classification.goods_composition: long_text, conditional when composition affects classification; administrative.
- classification.intended_use: long_text, conditional when intended use is relevant under the approved classification rules; administrative.
- classification.proposed_code: identifier_reference, required for a ruling request; source customs.country.approved.commodity_codes.
- classification.existing_code: identifier_reference, conditional when challenging a current classification.
- classification.technical_documents: document, conditional under the evidence rules; restricted where commercially confidential.
- classification.ruling_ref: identifier_reference, required for an amendment or withdrawal request.
- valuation.declaration_ref: identifier_reference, required.
- valuation.method_ref: identifier_reference, required; source customs.country.approved.valuation_methods.
- valuation.adjustment_items: repeated entries with adjustment_type (choice), amount (money), currency (choice), basis_ref (registry_reference) and evidence_refs (registry_reference).
- origin.country_code: choice, required; ISO 3166 source.
- origin.preference_scheme_ref: registry_reference, conditional when preferential treatment is claimed.
- origin.certificate_ref: identifier_reference, conditional under the origin procedure.
- origin.supplier_declaration_ref: identifier_reference, conditional where accepted by the applicable rules.
- origin.decision_reason: long_text, required when the procedure requires a reasoned decision.
Country decisions: binding-ruling availability and duration; commodity nomenclature; accepted classification evidence; customs valuation methods; origin rules and preference schemes; verification powers; confidentiality and appeal rights.

Decision boundary: the system may validate a code against the approved nomenclature, calculate a value under approved rules and flag inconsistencies. It must not independently issue a binding ruling, establish deliberate misdeclaration or make another legally material finding without the authorized decision procedure.
Department C — Customs duties, exemptions, refunds and guarantees
Form ID	Form title	Submitter	Procedure stage	Main outcome
customs.duty.assessment	Record a customs duty assessment	Authorized customs officer or assessment service	Assessment	Duty assessment
customs.duty.notice	Issue a customs duty notice	Customs service	Notification	Notice issued
customs.duty.payment	Submit a customs duty payment instruction	Importer or authorized representative	Payment	Payment instruction
customs.duty.reconciliation	Reconcile customs duty payment	Authorized officer	Reconciliation	Reconciled or disputed payment
customs.duty.exemption.application	Apply for a statutory customs exemption	Eligible trader or representative	Application	Exemption case
customs.duty.exemption.renewal	Renew an exemption where permitted	Exemption holder	Renewal	Renewal decision
customs.duty.exemption.amend	Amend an exemption record	Exemption holder	Amendment	Amendment decision
customs.duty.exemption.compliance_report	Submit an exemption compliance report	Exemption holder	Reporting	Compliance record
customs.duty.exemption.surrender	Surrender an exemption	Exemption holder	Surrender	Surrender record
customs.duty.refund.application	Apply for a customs refund	Eligible trader or representative	Application	Refund claim
customs.duty.refund.assessment	Assess a customs refund claim	Authorized customs officer	Assessment	Assessment record
customs.duty.refund.decision	Record a refund decision	Authorized decision-maker	Decision	Refund decision
customs.guarantee.register	Register a customs guarantee	Eligible trader or guarantor	Registration	Guarantee record
customs.guarantee.amend	Amend a customs guarantee	Authorized guarantee holder	Amendment	Updated guarantee
customs.guarantee.release_request	Request release of a guarantee	Guarantee holder	Release request	Release decision
customs.guarantee.call	Record a claim against a guarantee	Authorized customs officer	Claim	Guarantee claim
customs.duty.objection	Object to an eligible customs assessment	Eligible trader or representative	Objection	Objection case
customs.duty.appeal	Appeal an eligible customs decision	Eligible appellant	Appeal	Appeal record
Specific fields
- duty.assessment_ref: identifier_reference, required for payment, objection or refund procedures.
- duty.declaration_ref: identifier_reference, required where the assessment arises from a declaration.
- duty.rule_version_ref: identifier_reference, required; the applicable approved tariff and calculation-rule versions.
- duty.amount: money, system-calculated or validated against the approved assessment.
- duty.payment_ref: identifier_reference, required after execution of a payment.
- exemption.scheme_ref: registry_reference, required.
- exemption.legal_basis_ref: registry_reference, required.
- exemption.requested_scope: choice, required; source customs.country.approved.exemption_scopes.
- exemption.goods_refs: registry_reference, required where the exemption is commodity-specific.
- exemption.validity_period_ref: registry_reference, required; approved validity rules.
- refund.reason: choice, required; source customs.country.approved.refund_reasons.
- refund.amount_claimed: money, required.
- refund.payment_evidence_ref: identifier_reference, conditional where prior payment must be established.
- guarantee.instrument_type: choice, required; source customs.country.approved.guarantee_types.
- guarantee.issuer_ref: registry_reference, required.
- guarantee.amount: money, required; validated against the approved guarantee rule.
- guarantee.expiry_date: date, conditional on the approved instrument terms.
- guarantee.claim_authority_ref: registry_reference, required before a guarantee call is approved.
Country decisions: duty rates and calculation rules; exemptions and relief; refund eligibility; guarantees and accepted issuers; offset and recovery rules; review and appeal procedures.
Department D — Import/export permits and controlled goods
This department handles only permissions legally assigned to customs. Where another ministry owns a permit—for example, health, agriculture, environment or defence—customs must verify or receive the authorized permit record rather than silently assume that it owns the licensing decision.
Form ID	Form title	Submitter	Procedure stage	Main outcome
customs.permit.application	Apply for a customs-administered import or export permit	Trader or authorized representative	Application	Permit case
customs.permit.renewal	Renew an eligible permit	Permit holder	Renewal	Renewal decision
customs.permit.amend	Amend a permit	Permit holder	Amendment	Amendment decision
customs.permit.transfer	Request transfer of a permit where lawful	Eligible holder	Transfer	Transfer decision
customs.permit.replacement	Request a replacement permit document	Permit holder	Replacement	Replacement document
customs.permit.suspension_request	Request suspension of a permit	Permit holder	Suspension request	Suspension decision
customs.permit.surrender	Surrender a permit	Permit holder	Surrender	Surrender record
customs.permit.cancellation_request	Request cancellation of a permit	Permit holder	Cancellation request	Cancellation decision
customs.permit.inspection	Record an authorized permit-compliance inspection	Authorized inspector	Inspection	Inspection record
customs.permit.compliance_report	Submit a required permit compliance report	Permit holder	Reporting	Compliance record
customs.permit.decision	Record the permit decision	Authorized decision-maker	Decision	Permit outcome
customs.permit.objection	Object to an eligible permit decision	Eligible applicant or holder	Objection	Objection case
customs.permit.appeal	Appeal an eligible permit decision	Eligible appellant	Appeal	Appeal record
Specific fields
- permit.applicant_ref: registry_reference, required.
- permit.goods_refs: registry_reference, required; approved goods or commodity records.
- permit.trade_direction: choice, required; source customs.country.approved.trade_directions.
- permit.destination_or_origin: choice, conditional according to trade direction; ISO 3166 source.
- permit.quantity: number, conditional where quantity limits apply.
- permit.unit: choice, required when quantity is recorded; source customs.country.approved.units.
- permit.underlying_authority_ref: registry_reference, required where another institution owns the permission.
- permit.consignments: registry_reference, conditional where permits are linked to specific consignments.
- permit.validity_rule_ref: identifier_reference, required; approved permit-validity rule.
- permit.inspection_evidence: registry_reference, conditional on the inspection procedure.
- permit.decision_outcome: choice, required at the decision stage.
- permit.decision_reason: long_text, required when a reasoned decision is required.
Country decisions: controlled-goods lists; permit ownership; goods categories; quantity and validity rules; exemptions; verification and enforcement powers; appeal routes.
Department E — Border inspection, detention and goods release
Form ID	Form title	Submitter	Procedure stage	Main outcome
customs.border.inspection_plan	Record an authorized border inspection plan	Authorized customs officer	Planning	Inspection plan
customs.border.inspection_checklist	Complete the border inspection checklist	Authorized inspector	Inspection	Observation record
customs.border.evidence_register	Register evidence collected during inspection	Authorized officer	Evidence handling	Evidence register
customs.border.discrepancy	Record a declaration or consignment discrepancy	Authorized officer	Exception	Discrepancy case
customs.border.notice	Notify the declarant of a discrepancy or hold	Authorized customs service	Notification	Notice record
customs.border.hold_decision	Record an authorized hold decision	Authorized decision-maker	Decision	Hold decision
customs.border.hold_review	Review an existing hold	Authorized reviewer	Review	Continue, vary or release decision
customs.border.release_request	Request release of held goods	Eligible declarant or representative	Request	Release review
customs.border.release_decision	Record the release decision	Authorized decision-maker	Decision	Release or continued hold
customs.border.detention_authorize	Record authorization for a lawful detention	Authorized decision-maker	Authorization	Detention authorization
customs.border.transfer	Record transfer of goods or evidence to an authorized custodian	Authorized officer	Custody transfer	Transfer record
customs.border.disposal_request	Request a legally permitted disposition of goods	Authorized officer	Request	Disposition review
customs.border.disposal_decision	Record an authorized goods-disposal decision	Authorized decision-maker	Decision	Disposition outcome
customs.border.complaint	Complain about border service or inspection conduct	Affected person or representative	Complaint	Complaint review
customs.border.case_closure	Close a border-control case	Authorized officer	Closure	Closure record
Specific fields
- border.case_ref: identifier_reference, required.
- border.authority_ref: registry_reference, required; legal power and scope.
- border.location: place, required.
- border.consignment_ref: identifier_reference, conditional when a consignment exists.
- border.observed_facts: long_text, required; restricted.
- border.evidence_refs: registry_reference, conditional; evidence register entries.
- border.hold_reason: choice, required for a hold; source customs.country.approved.hold_reasons.
- border.hold_authority_ref: registry_reference, required for a hold decision.
- border.review_due_rule_ref: identifier_reference, required where a review deadline applies.
- border.release_conditions: long_text, required where release is conditional.
- border.custody_transfer_ref: identifier_reference, required when goods or evidence change custody.
- border.disposition_authority_ref: registry_reference, required before disposition.
- border.closure_basis: choice, required at closure.
Country decisions: inspection powers; hold and detention grounds; notice requirements; maximum periods and review rules; evidence custody; goods disposal; complaint and appeal procedures.

Mandatory safeguard: an inspection observation is not a finding of criminal guilt. Customs may refer a matter to a legally authorized body, but the referral must not make the receiving body subordinate to customs or bypass its procedures.
3.2 Central Bank and Monetary Authority
The Central Bank must be represented as an institution with its own legal standing, governance, data ownership, access policies and deployment boundary. It must not be configured as a department of the Ministry of Finance if national law establishes it as independent.

CivicOS's role is to support the bank's lawful administrative, regulatory, reporting and public-service workflows. It must not attempt to replace the bank's monetary-policy systems, settlement infrastructure, payment rails, reserve-management platform or confidential supervisory systems unless those systems are explicitly in scope and separately authorized.
Department A — Institutional governance and official decisions
Form ID	Form title	Submitter	Procedure stage	Main outcome
centralbank.governance.paper.submit	Submit a governance paper	Authorized Central Bank officer	Proposal	Governance paper
centralbank.governance.paper.revise	Revise a governance paper	Submitting officer	Amendment	Versioned paper
centralbank.governance.legal_review	Record legal review of a proposed decision	Authorized legal reviewer	Review	Legal review
centralbank.governance.meeting.agenda	Propose an agenda item	Authorized officer	Agenda preparation	Agenda proposal
centralbank.governance.decision.record	Record an authorized governance decision	Authorized secretary	Decision recording	Decision record
centralbank.governance.decision.correct	Correct a clerical error in a decision record	Authorized records officer	Amendment	Versioned correction
centralbank.governance.action.assign	Assign an approved governance action	Authorized secretary	Implementation	Action assignment
centralbank.governance.action.update	Report progress on a governance action	Assigned owner	Monitoring	Progress record
centralbank.governance.conflict.declare	Declare a relevant conflict of interest	Board member or authorized officer	Declaration	Conflict record
centralbank.governance.conflict.review	Record a conflict-of-interest management decision	Authorized independent reviewer	Review	Management decision
centralbank.governance.publication.approve	Approve an authorized public notice or publication	Authorized decision-maker	Publication	Publication approval
centralbank.governance.record.access	Request access to a restricted institutional record	Authorized requester	Access request	Access decision
Specific fields
- governance.paper_title: localized_text, required.
- governance.paper_type: choice, required; source centralbank.country.approved.governance_paper_types.
- governance.legal_basis_refs: registry_reference, required for a legally material proposal.
- governance.decision_scope: long_text, required.
- governance.confidentiality_class: choice, required; source centralbank.country.approved.record_classifications.
- governance.conflict_type: choice, required for a conflict declaration; source centralbank.country.approved.conflict_categories.
- governance.conflict_details: long_text, conditional; restricted.
- governance.action_owner: registry_reference, required for an assigned action.
- governance.record_ref: identifier_reference, required for a record-access request.
- governance.access_purpose: choice, required; source centralbank.country.approved.access_purposes.
- governance.access_authority_ref: registry_reference, required before access is granted.
Country decisions: Central Bank governance powers; board and committee structures; conflict rules; publication and confidentiality rules; access-to-records obligations; legal-review responsibilities.
Department B — Monetary policy and economic statistics
These forms support administrative governance and policy preparation. They do not automatically create monetary-policy decisions or replace the bank's authorized policy process.
Form ID	Form title	Submitter	Procedure stage	Main outcome
centralbank.policy.research_proposal	Propose a monetary-policy research project	Authorized researcher	Proposal	Research proposal
centralbank.policy.analysis.submit	Submit an economic or monetary analysis	Authorized analyst	Submission	Analysis record
centralbank.policy.review	Record a technical review of an analysis	Authorized reviewer	Review	Review record
centralbank.policy.paper.submit	Submit a policy paper for authorized consideration	Authorized department	Submission	Policy paper
centralbank.policy.decision.record	Record the authorized policy decision	Authorized secretary	Decision recording	Decision record
centralbank.policy.publication	Submit an approved policy publication	Authorized department	Publication	Publication workflow
centralbank.statistics.dataset.register	Register an official statistical dataset	Authorized statistics officer	Registration	Dataset record
centralbank.statistics.dataset.amend	Amend dataset metadata	Dataset owner	Amendment	Versioned metadata
centralbank.statistics.release.approve	Approve a statistical release	Authorized release approver	Approval	Release decision
centralbank.statistics.correction	Correct a published statistical error	Dataset owner and authorized reviewer	Correction	Correction notice and versioned data
centralbank.statistics.quality_review	Record a statistical quality review	Authorized reviewer	Review	Quality assessment
centralbank.statistics.access_request	Request access to a controlled dataset	Eligible researcher or institution	Access request	Access decision
Specific fields
- policy.research_title: localized_text, required.
- policy.research_question: long_text, required.
- policy.dataset_refs: registry_reference, conditional when existing datasets are used.
- policy.methodology_ref: identifier_reference, required for formal analysis where methodology must be recorded.
- policy.assumptions: long_text, required for an analytical forecast or model.
- policy.analysis_version: number, system-generated.
- policy.review_outcome: choice, required at review; source centralbank.country.approved.technical_review_outcomes.
- statistics.dataset_title: localized_text, required.
- statistics.dataset_owner: registry_reference, required.
- statistics.definition_refs: registry_reference, required; approved statistical definitions.
- statistics.release_period: registry_reference, required for periodic statistics.
- statistics.provenance: long_text, required; source systems, transformation and limitations.
- statistics.confidentiality_class: choice, required.
- statistics.correction_reason: long_text, required for corrections.
Country decisions: monetary-policy process; statistical mandates; release calendars; methodology standards; pre-release access restrictions; publication and correction procedures.

Universal safeguard: an analytical model or AI assistant may help summarize evidence or draft a paper. It cannot issue the bank's legally material monetary-policy decision.
Department C — Currency, cash and payment-system oversight
Enable each service only where it falls within the Central Bank's statutory remit. Currency issuance, payment-system oversight and payment-system operation are distinct powers and must be configured separately.
Form ID	Form title	Submitter	Procedure stage	Main outcome
centralbank.currency.issue.proposal	Propose a currency issuance action	Authorized department	Proposal	Proposal record
centralbank.currency.issue.approval	Record approval of an authorized currency issuance action	Authorized decision-maker	Decision	Approval record
centralbank.currency.distribution.report	Submit a currency distribution report	Authorized institution	Reporting	Distribution record
centralbank.currency.recall.proposal	Propose a currency withdrawal or recall	Authorized department	Proposal	Proposal record
centralbank.currency.recall.decision	Record an authorized withdrawal or recall decision	Authorized decision-maker	Decision	Decision record
centralbank.cash.request	Request cash services available to an authorized institution	Authorized institution	Application	Request record
centralbank.cash.delivery.confirmation	Confirm an authorized cash delivery	Authorized recipient	Confirmation	Delivery record
centralbank.payment_system.operator.application	Apply to operate a regulated payment system	Eligible business or institution	Application	Authorization case
centralbank.payment_system.operator.amend	Amend payment-system operator details	Authorized operator	Amendment	Updated record
centralbank.payment_system.change_notification	Notify the regulator of a material system change	Authorized operator	Notification	Change review
centralbank.payment_system.incident	Report a payment-system incident	Authorized operator	Incident reporting	Incident case
centralbank.payment_system.compliance_report	Submit a required compliance report	Authorized operator	Reporting	Compliance record
centralbank.payment_system.inspection	Record an authorized supervisory inspection	Authorized supervisor	Inspection	Inspection record
centralbank.payment_system.corrective_action	Submit a corrective-action plan	Regulated operator	Corrective action	Plan review
centralbank.payment_system.corrective_action.close	Evidence completion of corrective action	Regulated operator	Closure review	Closure decision
Specific fields
- currency.action_type: choice, required; source centralbank.country.approved.currency_actions.
- currency.authority_ref: registry_reference, required.
- currency.quantity_or_value: money, conditional where the approved procedure uses a monetary value.
- currency.logistics_ref: identifier_reference, conditional when distribution or delivery is involved.
- payment_system.applicant_ref: registry_reference, required.
- payment_system.service_description: long_text, required.
- payment_system.legal_basis_refs: registry_reference, required.
- payment_system.operator_status: choice, system-resolved from the approved operator registry.
- payment_system.material_change_type: choice, required for change notifications; source centralbank.country.approved.material_change_types.
- payment_system.incident_time: system-recorded timestamp, required.
- payment_system.incident_summary: long_text, required.
- payment_system.impact: choice, required; source centralbank.country.approved.incident_impact_categories.
- payment_system.corrective_action_plan: document, required when the supervisory procedure requires a formal plan.
- payment_system.completion_evidence: registry_reference, required for corrective-action closure.
Country decisions: currency issuance powers; cash-service scope; payment-system authorization categories; notification requirements; incident-reporting duties; inspection and corrective-action powers; review and appeal rights.
Department D — Regulated financial institutions and supervisory administration
Where the Central Bank supervises banks, payment institutions, electronic-money institutions or other financial entities, CivicOS may manage the administrative application, reporting, evidence and supervisory case workflow. The bank's existing confidential supervisory platform may remain the system of record for sensitive supervisory data.
Form ID	Form title	Submitter	Procedure stage	Main outcome
centralbank.supervision.entity.register	Register a supervised entity	Eligible institution	Application	Supervised-entity record
centralbank.supervision.authorization.apply	Apply for financial-institution authorization	Eligible business	Application	Authorization case
centralbank.supervision.authorization.amend	Request an authorization amendment	Authorized entity	Amendment	Amendment decision
centralbank.supervision.authorization.renew	Renew an authorization where required	Authorized entity	Renewal	Renewal decision
centralbank.supervision.authorization.surrender	Surrender an authorization	Authorized entity	Surrender	Surrender case
centralbank.supervision.control_change.notify	Notify a change of ownership or control	Authorized entity	Notification	Change review
centralbank.supervision.key_person.notify	Notify a change involving a regulated key person	Authorized entity	Notification	Notification review
centralbank.supervision.periodic_return	Submit a required supervisory return	Supervised entity	Reporting	Return received
centralbank.supervision.return.correct	Correct a supervisory return	Supervised entity	Amendment	Corrected return
centralbank.supervision.inspection_plan	Record an authorized supervisory inspection plan	Authorized supervisor	Planning	Inspection plan
centralbank.supervision.inspection_record	Record supervisory inspection observations	Authorized supervisor	Inspection	Inspection record
centralbank.supervision.findings_response	Respond to supervisory findings	Supervised entity	Response	Response record
centralbank.supervision.remediation_plan	Submit a remediation plan	Supervised entity	Corrective action	Plan review
centralbank.supervision.remediation_update	Report remediation progress	Supervised entity	Monitoring	Progress record
centralbank.supervision.enforcement_decision	Record an authorized supervisory decision	Authorized decision-maker	Decision	Decision record
centralbank.supervision.complaint	Complain about supervisory administration	Eligible entity or person	Complaint	Complaint case
centralbank.supervision.review_request	Request review of an eligible supervisory decision	Eligible applicant	Review	Review case
Specific fields
- supervised_entity.legal_entity_ref: registry_reference, required.
- supervised_entity.authorization_category: choice, required; source centralbank.country.approved.authorization_categories.
- supervised_entity.ownership_structure_ref: registry_reference, conditional when legally required.
- supervised_entity.governance_document: document, conditional under the applicable authorization rule.
- supervised_entity.key_person_refs: registry_reference, conditional where key-person review applies.
- supervised_entity.reporting_period: registry_reference, required for periodic returns.
- supervised_entity.return_schema_ref: identifier_reference, required; approved schema.
- supervised_entity.inspection_authority_ref: registry_reference, required for an inspection.
- supervised_entity.finding_refs: registry_reference, required for a response to formal findings.
- supervised_entity.remediation_actions: repeated entries with action_id (text), description (long_text), owner_ref (registry_reference), target_date (date when required) and evidence_refs (registry_reference).
- supervised_entity.enforcement_authority_ref: registry_reference, required before an enforcement decision.
- supervised_entity.decision_reason: long_text, required where a reasoned decision is legally required.
Country decisions: supervised entity types; authorization and renewal rules; reporting schemas; key-person requirements; inspection powers; confidentiality; enforcement powers; review and appeal routes.

Independence rule: no ministry-wide executive account may automatically read confidential supervisory records. Cross-institution access requires a configured legal authority, permitted purpose, data minimisation and auditable approval where applicable.
3.3 Trade and Industry Ministry
The ministry's remit may include domestic trade, industrial development, standards policy, export promotion, consumer affairs, market access, business support and industrial zones. Services owned by a separate competition authority, standards regulator, consumer-protection authority or business registry must remain owned by that institution.
Department A — Business and industry services
Form ID	Form title	Submitter	Procedure stage	Main outcome
industry.support.application	Apply for an industry support programme	Eligible business	Application	Support case
industry.support.renewal	Renew support where the scheme allows it	Eligible business	Renewal	Renewal decision
industry.support.amendment	Request a change to an approved support award	Award holder	Amendment	Change decision
industry.support.progress_report	Report progress under an approved support award	Award holder	Reporting	Progress record
industry.support.claim	Submit a claim under an approved award	Award holder	Payment	Claim record
industry.support.surrender	Surrender an industry support award	Award holder	Surrender	Surrender record
industry.support.withdrawal	Withdraw a pending application	Applicant	Withdrawal	Withdrawal record
industry.support.complaint	Complain about industry support administration	Applicant or award holder	Complaint	Complaint case
industry.support.decision	Record an industry support decision	Authorized officer	Decision	Decision record
industry.facility.register	Register an industrial facility where required	Facility operator	Registration	Facility record
industry.facility.amend	Amend industrial facility details	Facility operator	Amendment	Updated record
industry.facility.transfer	Request transfer of a facility record where lawful	Eligible operator	Transfer	Transfer decision
industry.facility.close	Notify closure of an industrial facility	Facility operator	Notification	Closure record
industry.facility.inspection	Record an authorized facility inspection	Authorized inspector	Inspection	Inspection record
industry.facility.compliance_report	Submit a required industrial compliance report	Facility operator	Reporting	Compliance record
industry.industry_data.submit	Submit a required industry statistics return	Eligible business	Reporting	Industry data record
industry.industry_data.correct	Correct a submitted industry return	Reporting business	Amendment	Corrected return
Specific fields
- industry.applicant_ref: registry_reference, required.
- industry.scheme_ref: registry_reference, required for support applications.
- industry.business_activity: choice, required; source industry.country.approved.activity_codes.
- industry.facility_ref: identifier_reference, required for facility amendments or reports.
- industry.facility_location: place, required for new facility registration where location is relevant.
- industry.supported_activity: choice, required; source industry.country.approved.support_categories.
- industry.requested_amount: money, required only where the scheme offers financial support.
- industry.business_plan_ref: identifier_reference, conditional under the approved scheme.
- industry.performance_report: registry_reference, required for periodic reporting where defined by the scheme.
- industry.compliance_evidence: document, conditional under the applicable procedure.
- industry.closure_reason: choice, required for closure notification; source industry.country.approved.closure_reasons.
- industry.statistics_period: registry_reference, required for periodic returns.
- industry.statistics_dataset: registry_reference, required; approved schema-specific dataset.
Country decisions: support schemes, eligible activities, industrial facility registration requirements, grant amounts, reporting duties, inspection powers, and review or appeal rights.
Department B — Standards, quality infrastructure and product conformity coordination
CivicOS must not treat the ministry as a testing laboratory or a certification body unless national law assigns those functions to it. Where an independent standards or accreditation body owns the decision, the ministry should link to the authoritative decision.
Form ID	Form title	Submitter	Procedure stage	Main outcome
industry.standard.proposal	Propose a national industrial standard	Business, institution or authorized expert	Proposal	Standards proposal
industry.standard.comment	Submit a comment on a proposed standard	Citizen, business or institution	Consultation	Comment record
industry.standard.comment.withdraw	Withdraw a consultation comment where permitted	Original submitter	Withdrawal	Withdrawal record
industry.standard.consultation_summary	Prepare the consultation summary	Authorized standards officer	Review	Summary record
industry.standard.adoption.proposal	Propose adoption of a standard	Authorized standards body	Proposal	Adoption proposal
industry.standard.adoption.decision	Record the authorized adoption decision	Authorized decision-maker	Decision	Adoption record
industry.standard.revision.proposal	Propose revision of an adopted standard	Authorized body or eligible submitter	Proposal	Revision case
industry.standard.withdrawal.proposal	Propose withdrawal of a standard	Authorized standards body	Proposal	Withdrawal review
industry.conformity.referral	Refer a product-conformity matter to the responsible authority	Authorized officer	Referral	Referral record
industry.conformity.certificate.verify	Request verification of a conformity certificate	Authorized institution or eligible business	Verification	Verification result
industry.accreditation.referral	Refer an accreditation matter to the competent body	Authorized officer	Referral	Referral record
Specific fields
- standard.title: localized_text, required.
- standard.scope: long_text, required.
- standard.proposer_ref: registry_reference, required when the proposer is a registered entity.
- standard.technical_document: document, conditional under the proposal procedure.
- standard.related_standard_refs: registry_reference, optional; approved standards catalogue.
- standard.consultation_ref: identifier_reference, required for consultation comments.
- standard.comment: long_text, required.
- standard.adoption_authority_ref: registry_reference, required before adoption.
- standard.effective_date: date, conditional under the approved adoption rule.
- conformity.certificate_ref: identifier_reference, required for certificate verification.
- conformity.issuing_body_ref: registry_reference, required when known or required by the procedure.
- conformity.referral_authority_ref: registry_reference, required for an inter-institution referral.
Country decisions: national standards authority; adoption and publication powers; consultation obligations; conformity-assessment responsibilities; accreditation authority; relationship with regional and international standards.
Department C — Domestic trade, market access and consumer affairs
If a separate consumer-protection or competition regulator exists, CivicOS must route regulatory complaints to it rather than granting the ministry parallel enforcement powers.
Form ID	Form title	Submitter	Procedure stage	Main outcome
trade.market_access.enquiry	Ask about market access requirements	Business or representative	Enquiry	Guidance case
trade.market_access.barrier_report	Report a trade barrier	Business or institution	Report	Barrier record
trade.market_access.barrier_evidence	Supply evidence for a reported trade barrier	Reporting party	Further information	Evidence record
trade.market_access.assessment	Assess a reported trade barrier	Authorized officer	Assessment	Assessment record
trade.market_access.referral	Refer a barrier to the competent authority	Authorized officer	Referral	Referral record
trade.consumer.complaint	Submit a consumer complaint where the ministry owns intake	Consumer or representative	Complaint	Complaint case
trade.consumer.evidence	Add evidence to a consumer complaint	Complainant	Further information	Evidence record
trade.consumer.referral	Refer a complaint to the responsible regulator	Authorized officer	Referral	Referral record
trade.consumer.response	Record a response from the responsible trader	Trader or authorized representative	Response	Response record
trade.consumer.outcome	Record the administrative complaint outcome	Authorized officer	Decision	Outcome record
trade.market_information.request	Request public trade information	Citizen, business or institution	Information request	Response record
Specific fields
- trade.reporter_ref: registry_reference, optional if anonymous reports are lawfully accepted.
- trade.market_or_product: localized_text, required.
- trade.affected_market: choice, required; source trade.country.approved.market_categories.
- trade.barrier_type: choice, required; source trade.country.approved.trade_barrier_types.
- trade.description: long_text, required.
- trade.affected_country: choice, conditional for cross-border matters; ISO 3166 source.
- trade.evidence_refs: registry_reference, optional or conditional under the approved procedure.
- trade.complaint.trader_ref: registry_reference, conditional if the trader is known.
- trade.complaint.purchase_or_transaction_ref: identifier_reference, conditional if the complaint concerns a specific transaction and the reference is available.
- trade.complaint.requested_outcome: choice, required; source trade.country.approved.complaint_outcomes.
- trade.referral_authority_ref: registry_reference, required before referral.
Country decisions: ministry's complaint-handling role; consumer-protection ownership; market access programme scope; confidentiality; referral duties; remedies available through the ministry.

3.4 Investment Facilitation and Investment Promotion
Investment facilitation should reduce duplicated data entry without becoming a substitute for statutory licensing, environmental clearance, land rights, immigration authorization, tax registration or procurement approvals.

A single investment case may reference multiple independent approvals. Each approval remains owned by the institution empowered to make it.
Department A — Investor registration and facilitation
Form ID	Form title	Submitter	Procedure stage	Main outcome
investment.investor.registration	Register an investor for facilitation services	Investor or representative	Application	Investor service profile
investment.investor.amend	Amend investor details	Investor or representative	Amendment	Updated profile
investment.investor.representative.change	Change an investor's authorized representative	Investor or representative	Amendment	Representation updated
investment.project.register	Register an investment project for facilitation	Investor or representative	Application	Project record
investment.project.amend	Amend project details	Investor or representative	Amendment	Updated project record
investment.project.transfer_request	Request transfer of a project record where permitted	Eligible project owner	Transfer	Transfer decision
investment.project.withdraw	Withdraw a pending project registration	Applicant	Withdrawal	Withdrawal record
investment.project.close	Notify completion or closure of a project	Project owner	Closure	Closure record
investment.facilitation.request	Request assistance with an investment approval	Investor or representative	Facilitation	Facilitation case
investment.facilitation.issue	Report a delay or obstacle in an investment process	Investor or representative	Escalation	Issue record
investment.facilitation.evidence	Supply information for an investment issue	Investor or representative	Further information	Evidence record
investment.facilitation.referral	Refer a request to the competent institution	Authorized officer	Referral	Referral record
investment.facilitation.resolution	Record the resolution of a facilitation issue	Authorized officer and responsible institution	Resolution	Resolution record
investment.project.progress_report	Submit an investment-project progress report	Project owner	Reporting	Progress record
investment.project.inspection	Record a legally authorized project inspection	Authorized inspector from the competent institution	Inspection	Inspection record
investment.project.complaint	Complain about investment facilitation services	Investor or representative	Complaint	Complaint case
Specific fields
- investment.investor_type: choice, required; source investment.country.approved.investor_types.
- investment.investor_entity: organisation, required for an organizational investor.
- investment.investor_person: person, required only when an individual investor is the applicant.
- investment.representative: group core.representation, conditional.
- investment.project_title: localized_text, required.
- investment.project_sector: choice, required; source investment.country.approved.sectors.
- investment.project_location: place, required where the project has a known location.
- investment.project_description: long_text, required.
- investment.estimated_investment: money, required where the approved registration procedure asks for an estimate; marked as reported or modelled as appropriate.
- investment.funding_basis: choice, required when a financial estimate is supplied; source investment.country.approved.estimate_bases.
- investment.expected_milestones: repeated entries containing description (long_text), target_date (date if required) and evidence_rule_ref (identifier_reference).
- investment.permit_refs: registry_reference, optional at initial registration; required only when the relevant approval exists or the stage requires it.
- investment.facilitation_issue_type: choice, required; source investment.country.approved.issue_types.
- investment.responsible_authority_ref: registry_reference, required before referral.
- investment.resolution_evidence: registry_reference, conditional at closure.
Country decisions: investor-service eligibility; project-registration criteria; available facilitation services; accepted estimates and reporting duties; coordination powers; complaint and escalation procedures.
Department B — Investment incentives and approvals coordination
This service tracks incentive applications only where the investment agency or ministry has a lawful role. Tax incentives must also reference the tax authority's approved decision, and land, immigration or environmental approvals must remain with their respective owners.
Form ID	Form title	Submitter	Procedure stage	Main outcome
investment.incentive.application	Apply for an investment incentive	Eligible investor	Application	Incentive case
investment.incentive.supplement	Supply additional incentive application evidence	Applicant or representative	Further information	Evidence received
investment.incentive.assessment	Assess an incentive application	Authorized officer	Assessment	Assessment record
investment.incentive.legal_review	Record legal review of an incentive	Authorized legal reviewer	Review	Legal review
investment.incentive.fiscal_review	Record fiscal review of an incentive	Authorized fiscal reviewer	Review	Fiscal review
investment.incentive.decision	Record an authorized incentive decision	Authorized decision-maker	Decision	Incentive outcome
investment.incentive.agreement	Register an approved incentive agreement	Authorized officer and eligible party	Agreement	Agreement record
investment.incentive.amendment	Request amendment of an incentive agreement	Eligible party	Amendment	Amendment decision
investment.incentive.renewal	Request renewal where permitted	Eligible party	Renewal	Renewal decision
investment.incentive.compliance_report	Submit an incentive-compliance report	Incentive holder	Reporting	Compliance record
investment.incentive.inspection	Record an authorized compliance inspection	Authorized inspector	Inspection	Inspection record
investment.incentive.suspension_review	Review whether a lawful suspension ground applies	Authorized reviewer	Review	Review record
investment.incentive.suspension_decision	Record an authorized suspension decision	Authorized decision-maker	Decision	Suspension outcome
investment.incentive.surrender	Surrender an incentive	Incentive holder	Surrender	Surrender record
investment.incentive.revocation_review	Review a proposed revocation where permitted	Authorized reviewer	Review	Review record
investment.incentive.revocation_decision	Record an authorized revocation decision	Authorized decision-maker	Decision	Revocation outcome
investment.incentive.objection	Object to an eligible incentive decision	Eligible party	Objection	Objection case
investment.incentive.appeal	Appeal an eligible incentive decision	Eligible appellant	Appeal	Appeal record
Specific fields
- incentive.scheme_ref: registry_reference, required.
- incentive.applicant_ref: registry_reference, required.
- incentive.legal_basis_refs: registry_reference, required.
- incentive.requested_benefit: choice, required; source investment.country.approved.incentive_types.
- incentive.eligibility_evidence_refs: registry_reference, conditional on the approved scheme.
- incentive.estimated_fiscal_cost_ref: identifier_reference, required when fiscal assessment is required.
- incentive.other_authority_approval_refs: registry_reference, conditional where another institution's approval is a legal prerequisite.
- incentive.agreement_ref: identifier_reference, required for amendments and compliance reports.
- incentive.compliance_period: registry_reference, required for periodic reporting.
- incentive.compliance_evidence_refs: registry_reference, conditional under the approved scheme.
- incentive.suspension_basis_ref: registry_reference, required before a suspension decision.
- incentive.revocation_basis_ref: registry_reference, required before a revocation decision.
- incentive.decision_reason: long_text, required where legally required.
Country decisions: incentive schemes and legal authority; eligibility criteria; benefits and duration; tax and fiscal treatment; compliance requirements; suspension and revocation grounds; review and appeal routes.

Universal safeguard: the investment agency cannot represent a facilitation status as a permit, tax ruling or legal clearance unless the responsible authority has actually issued that approval.
Department C — Export promotion and market development
Form ID	Form title	Submitter	Procedure stage	Main outcome
investment.exporter.register	Register for export-promotion services	Business or representative	Application	Exporter service record
investment.exporter.amend	Amend exporter profile	Business or representative	Amendment	Updated profile
investment.export_support.application	Apply for an export-support programme	Eligible business	Application	Support case
investment.export_support.renewal	Renew export support where permitted	Eligible business	Renewal	Renewal decision
investment.export_support.claim	Submit a claim under an approved support award	Award holder	Payment	Claim record
investment.export_support.report	Report export-promotion results	Award holder	Reporting	Results record
investment.export_support.surrender	Surrender export support	Award holder	Surrender	Surrender record
investment.market_access.request	Request assistance entering a foreign market	Exporter or representative	Application	Assistance case
investment.trade_mission.application	Apply to participate in an approved trade mission	Eligible business	Application	Participation decision
investment.trade_mission.withdraw	Withdraw a trade-mission application	Applicant	Withdrawal	Withdrawal record
investment.trade_mission.report	Submit a trade-mission outcome report	Participant	Reporting	Outcome record
investment.export_enquiry	Ask for export-market guidance	Business or representative	Enquiry	Guidance case
investment.export_barrier.report	Report an export barrier	Exporter or representative	Report	Barrier case
investment.export_barrier.referral	Refer an export barrier to the competent authority	Authorized officer	Referral	Referral record
Specific fields
- exporter.business_ref: registry_reference, required.
- exporter.target_markets: choice, repeated; ISO 3166 source.
- exporter.product_categories: choice, repeated; source investment.country.approved.export_product_categories.
- export_support.scheme_ref: registry_reference, required.
- export_support.requested_activity: choice, required; approved scheme categories.
- export_support.requested_amount: money, conditional for a financial support scheme.
- export_support.delivery_evidence: registry_reference, conditional under the scheme.
- trade_mission.mission_ref: identifier_reference, required.
- trade_mission.participant_ref: registry_reference, required.
- trade_mission.accessibility_or_logistics_request: long_text, optional; personal classification if it contains personal details.
- export_barrier.market: choice, required.
- export_barrier.description: long_text, required.
- export_barrier.evidence_refs: registry_reference, optional or conditional under the approved procedure.
Country decisions: export-promotion programmes; eligible business categories; support schemes and payment rules; trade-mission selection criteria; reporting and evaluation requirements.

3.5 Public Procurement Authority and Government Procurement
Public procurement is a high-integrity domain. CivicOS must preserve the distinction between a procurement plan, an approved procurement method, a solicitation, bids, evaluation, award, contract, variation, payment and audit. A published tender must not be silently changed, and an evaluation score must not automatically determine a legally material award without the authorized approval process.

Where the Procurement Authority is independent, its investigations, reviews and enforcement records remain separate from the purchasing institution's records.
Department A — Procurement planning and procurement methods
Form ID	Form title	Submitter	Procedure stage	Main outcome
procurement.plan.create	Create a procurement plan	Procuring entity	Planning	Draft procurement plan
procurement.plan.item.add	Add an item to a procurement plan	Procuring entity	Planning	Plan item
procurement.plan.item.amend	Amend a plan item	Procuring entity	Amendment	Versioned plan item
procurement.plan.submit	Submit a procurement plan for approval	Procuring entity	Submission	Plan review
procurement.plan.review	Review a procurement plan	Authorized procurement reviewer	Review	Review record
procurement.plan.approve	Approve or return a procurement plan	Authorized approver	Decision	Plan decision
procurement.plan.publish	Publish an approved procurement plan	Authorized officer	Publication	Publication record
procurement.plan.revise	Submit a revised procurement plan	Procuring entity	Amendment	Revised plan
procurement.method.request	Request approval for a procurement method	Procuring entity	Method approval	Method decision
procurement.method.justification	Submit justification for a proposed method	Procuring entity	Further information	Justification record
procurement.method.approve	Approve or refuse a procurement method	Authorized decision-maker	Decision	Method decision
procurement.procurement.cancel_request	Request cancellation of a planned procurement	Procuring entity	Cancellation request	Cancellation decision
procurement.procurement.cancel_decision	Record a lawful procurement cancellation	Authorized decision-maker	Decision	Cancellation record
Procurement plan item: full field contract
{
  "schema_version": "civicos.form-contract.v1",
  "form_id": "procurement.plan.item.add",
  "record_type": "procurement.plan_item",
  "form_version": 1,
  "status": "draft",
  "fields": [
    {
      "id": "plan_item.procuring_entity",
      "type": "registry_reference",
      "required": true,
      "validation": [{"rule": "institution_active", "params": {}}, {"rule": "actor_authorized_for_procurement", "params": {}}],
      "values_source": "civicos.registry.institutions",
      "personal_data_class": "administrative",
      "evidence": [],
      "label": {"en": "Procuring entity"},
      "hint": {"en": "Select the institution that will conduct the procurement."},
      "error_text": {"en": {"institution_active": "Select an active institution.", "actor_authorized_for_procurement": "You are not authorized to submit this procurement plan item."}}
    },
    {
      "id": "plan_item.fiscal_period",
      "type": "registry_reference",
      "required": true,
      "validation": [{"rule": "procurement_period_open", "params": {}}],
      "values_source": "civicos.finance.budget_periods",
      "personal_data_class": "administrative",
      "evidence": [],
      "label": {"en": "Planned procurement period"},
      "hint": {"en": "Select the approved planning period."},
      "error_text": {"en": {"procurement_period_open": "Select an available procurement planning period."}}
    },
    {
      "id": "plan_item.description",
      "type": "localized_text",
      "required": true,
      "validation": [{"rule": "length", "params": {"min": 5, "max": 500}}],
      "values_source": null,
      "personal_data_class": "administrative",
      "evidence": [],
      "label": {"en": "What do you plan to buy?"},
      "hint": {"en": "Describe the goods, services or works without naming a preferred supplier unless the approved procedure permits it."},
      "error_text": {"en": {"length": "Enter a description between 5 and 500 characters."}}
    },
    {
      "id": "plan_item.category",
      "type": "choice",
      "required": true,
      "validation": [{"rule": "procurement_category_active", "params": {}}],
      "values_source": "procurement.country.approved.categories",
      "personal_data_class": "administrative",
      "evidence": [],
      "label": {"en": "Procurement category"},
      "hint": {"en": "Choose the approved category that matches the planned purchase."},
      "error_text": {"en": {"procurement_category_active": "Choose an available procurement category."}}
    },
    {
      "id": "plan_item.estimated_value",
      "type": "money",
      "required": true,
      "validation": [{"rule": "currency_matches_budget_period", "params": {}}, {"rule": "estimate_basis_recorded", "params": {}}],
      "values_source": "civicos.finance.approved_cost_estimates",
      "personal_data_class": "administrative",
      "evidence": [],
      "label": {"en": "Estimated procurement value"},
      "hint": {"en": "Use a supported estimate and record its basis. This is not a tender award or payment amount."},
      "error_text": {"en": {"currency_matches_budget_period": "Use the configured budget currency.", "estimate_basis_recorded": "Record the basis for the estimate."}}
    },
    {
      "id": "plan_item.budget_allocation_ref",
      "type": "registry_reference",
      "required": false,
      "validation": [{"rule": "allocation_valid_for_planned_period", "params": {}}],
      "values_source": "civicos.finance.approved_budget_allocations",
      "personal_data_class": "administrative",
      "evidence": [],
      "label": {"en": "Budget allocation"},
      "hint": {"en": "Link the allocation if one has been approved."},
      "error_text": {"en": {"allocation_valid_for_planned_period": "The allocation is not valid for this procurement period."}}
    },
    {
      "id": "plan_item.planned_method",
      "type": "choice",
      "required": true,
      "validation": [{"rule": "procurement_method_available", "params": {}}],
      "values_source": "procurement.country.approved.methods",
      "personal_data_class": "administrative",
      "evidence": [],
      "label": {"en": "Proposed procurement method"},
      "hint": {"en": "Select a method available under the country's approved procurement rules."},
      "error_text": {"en": {"procurement_method_available": "Choose an available procurement method."}}
    },
    {
      "id": "plan_item.method_justification",
      "type": "long_text",
      "required": false,
      "validation": [{"rule": "required_if_method_needs_justification", "params": {}}],
      "values_source": null,
      "personal_data_class": "administrative",
      "evidence": [],
      "label": {"en": "Reason for the proposed method"},
      "hint": {"en": "Explain the proposed method where the rules require justification."},
      "error_text": {"en": {"required_if_method_needs_justification": "Provide the justification required for this method."}}
    },
    {
      "id": "plan_item.planned_timeline",
      "type": "registry_reference",
      "required": true,
      "validation": [{"rule": "planned_dates_follow_procurement_calendar", "params": {}}],
      "values_source": "procurement.country.approved.planning_schedules",
      "personal_data_class": "administrative",
      "evidence": [],
      "label": {"en": "Planned procurement timeline"},
      "hint": {"en": "Select or provide the schedule required by the approved planning procedure."},
      "error_text": {"en": {"planned_dates_follow_procurement_calendar": "Check the proposed timeline."}}
    },
    {
      "id": "plan_item.legal_basis_refs",
      "type": "registry_reference",
      "required": true,
      "validation": [{"rule": "legal_references_resolve", "params": {}}],
      "values_source": "civicos.registry.law_provisions",
      "personal_data_class": "administrative",
      "evidence": [],
      "label": {"en": "Applicable procurement authority"},
      "hint": {"en": "Link the legal authority and approved rules governing the proposed method."},
      "error_text": {"en": {"legal_references_resolve": "Select approved legal references."}}
    }
  ],
  "legal_basis": [],
  "country_decisions": [
    "Procurement categories and classification codes.",
    "Procurement methods, thresholds and required method justifications.",
    "Planning calendars, budget requirements and approval authority.",
    "Publication requirements and records-retention rules."
  ]
}


The plan_item.planned_timeline reference resolves to a typed schedule record. That record must contain the required milestones, their dates where applicable, and the approved planning-calendar version. It must not be an unstructured substitute for required date fields.

Country decisions: procurement planning requirements; thresholds; allowed methods; approval levels; budget prerequisites; public disclosure; procurement-plan amendment rules.
Department B — Supplier registration and qualification
Supplier registration must not imply that the supplier is approved for every procurement. Qualification criteria and exclusion rules must be applied only as defined by the relevant national law and procurement procedure.
Form ID	Form title	Submitter	Procedure stage	Main outcome
procurement.supplier.register	Register as a government supplier	Business or authorized representative	Application	Supplier record
procurement.supplier.amend	Amend supplier details	Supplier or representative	Amendment	Updated record
procurement.supplier.representative.change	Change the authorized supplier representative	Supplier or representative	Amendment	Representation updated
procurement.supplier.bank_details.change	Request a change to supplier payment details	Supplier's authorized representative	Change request	Verified change
procurement.supplier.classification	Register supplier categories	Supplier or representative	Application	Category record
procurement.supplier.qualification.apply	Apply for qualification under a procurement scheme	Supplier or representative	Application	Qualification case
procurement.supplier.qualification.renew	Renew supplier qualification	Supplier or representative	Renewal	Renewal decision
procurement.supplier.qualification.amend	Amend qualification details	Supplier or representative	Amendment	Amendment decision
procurement.supplier.qualification.surrender	Surrender a qualification	Supplier or representative	Surrender	Surrender record
procurement.supplier.compliance.declaration	Submit a required supplier compliance declaration	Supplier or representative	Declaration	Declaration record
procurement.supplier.evidence	Supply missing supplier evidence	Supplier or representative	Further information	Evidence record
procurement.supplier.inspection	Record an authorized supplier inspection	Authorized inspector	Inspection	Inspection record
procurement.supplier.suspension_review	Review a proposed supplier suspension	Authorized reviewer	Review	Review record
procurement.supplier.suspension_decision	Record an authorized suspension decision	Authorized decision-maker	Decision	Suspension outcome
procurement.supplier.reinstatement	Request reinstatement where permitted	Supplier or representative	Application	Reinstatement decision
procurement.supplier.complaint	Complain about supplier-registration administration	Supplier or representative	Complaint	Complaint case
Specific fields
- supplier.organisation_ref: registry_reference, required.
- supplier.business_registration_ref: identifier_reference, conditional where a national business registry exists and the procedure requires registration.
- supplier.tax_registration_ref: identifier_reference, conditional where required by the applicable procedure.
- supplier.contact: group core.contact, required to the extent needed for service.
- supplier.categories: choice, repeated; source procurement.country.approved.supplier_categories.
- supplier.qualification_scheme_ref: registry_reference, required for qualification.
- supplier.qualification_evidence_refs: registry_reference, conditional under approved criteria.
- supplier.compliance_declaration: group core.declaration_signature, required where mandated.
- supplier.payment_account: group core.payout_account, required only where payment administration requires it; change requests must trigger the approved verification process.
- supplier.suspension_basis_ref: registry_reference, required before a suspension decision.
- supplier.reinstatement_basis: long_text, required for a reinstatement request.
- supplier.decision_reason: long_text, required when legally required.
Country decisions: supplier categories; registration and qualification criteria; accepted evidence; tax and business-register checks; exclusion grounds; suspension and reinstatement authority; review and appeal routes.

Universal safeguard: a supplier's registration data and bank details are restricted. A supplier's account-change request must not immediately overwrite the payment destination. The request, verification, approval and effective change must be separate auditable events.
Department C — Tender preparation, publication and clarification
Form ID	Form title	Submitter	Procedure stage	Main outcome
procurement.tender.create	Prepare a tender or solicitation	Procuring entity	Preparation	Draft solicitation
procurement.tender.specification	Submit technical specifications	Procuring entity	Preparation	Specification record
procurement.tender.criteria	Define evaluation criteria	Procuring entity	Preparation	Criteria record
procurement.tender.terms	Submit proposed contract terms	Procuring entity	Preparation	Contract terms
procurement.tender.legal_review	Record legal review of the solicitation	Authorized legal reviewer	Review	Legal review
procurement.tender.budget_review	Verify the approved funding reference	Authorized finance officer	Review	Budget verification
procurement.tender.method_approval	Approve the solicitation method	Authorized decision-maker	Approval	Method approval
procurement.tender.publication_approval	Approve tender publication	Authorized officer	Approval	Publication approval
procurement.tender.publish	Publish an approved tender	Authorized procurement service	Publication	Published tender
procurement.tender.correction	Publish a correction or addendum	Procuring entity and authorized approver	Amendment	Versioned addendum
procurement.tender.extension_request	Request an extension of the tender deadline	Procuring entity	Request	Extension decision
procurement.tender.extension_decision	Record a tender deadline extension	Authorized decision-maker	Decision	Updated deadline
procurement.tender.clarification_request	Ask a question about a tender	Prospective supplier	Clarification	Question record
procurement.tender.clarification_response	Respond to a tender question	Authorized procurement officer	Clarification	Published response where required
procurement.tender.site_visit	Register a tender site visit	Supplier or representative	Event registration	Attendance record
procurement.tender.attendance_record	Record attendance at a procurement event	Authorized officer	Event recording	Event record
procurement.tender.cancel_request	Request cancellation of a published tender	Procuring entity	Cancellation request	Cancellation review
procurement.tender.cancel_decision	Record an authorized tender cancellation	Authorized decision-maker	Decision	Cancellation outcome
Specific fields
- tender.plan_item_ref: identifier_reference, required; must reference an approved plan item where the national procedure requires it.
- tender.title: localized_text, required.
- tender.scope: long_text, required.
- tender.category: choice, required; approved procurement categories.
- tender.estimated_value_ref: identifier_reference, required; approved estimate.
- tender.budget_allocation_ref: registry_reference, required where funding approval is a prerequisite.
- tender.method_ref: identifier_reference, required; approved method decision.
- tender.specification_ref: identifier_reference, required; approved technical specification.
- tender.evaluation_criteria: repeated entries containing criterion_id (text), description (localized_text), criterion_type (choice), weight (number when weighting is applicable), minimum_requirement (boolean) and evidence_rule_ref (identifier_reference).
- tender.submission_deadline_rule_ref: identifier_reference, required; approved deadline rule.
- tender.publication_channels: choice, repeated; source procurement.country.approved.publication_channels.
- tender.addendum_reason: long_text, required for a correction or addendum.
- tender.clarification_question: long_text, required for a supplier question.
- tender.clarification_response: long_text, required for a response.
- tender.cancellation_basis_ref: registry_reference, required before a cancellation decision.
Country decisions: publication thresholds; tender methods; minimum publication requirements; submission deadlines; permitted clarifications; addenda and extensions; cancellation powers; disclosure and confidentiality rules.

Universal controls:
- Published tender versions are immutable; corrections create a new version linked to the original.
- The system preserves the exact specification and evaluation criteria in force when a bid was submitted.
- Supplier questions and responses follow the configured transparency rules.
- Evaluation criteria cannot be silently changed after the tender closes.
- Deadline calculations use approved country rules, calendars and the legally relevant publication event.
Department D — Bid submission and bid opening
Form ID	Form title	Submitter	Procedure stage	Main outcome
procurement.bid.submit	Submit a tender bid	Supplier or authorized representative	Submission	Sealed or controlled bid record
procurement.bid.withdraw_request	Request withdrawal of a submitted bid	Supplier or representative	Withdrawal	Withdrawal decision
procurement.bid.replace_request	Request replacement of a bid where permitted	Supplier or representative	Amendment	Replacement decision
procurement.bid.clarification_response	Respond to an authorized bid clarification	Supplier or representative	Clarification	Response record
procurement.bid.supplement	Submit additional bid evidence where permitted	Supplier or representative	Further information	Supplement record
procurement.bid.receipt	Record bid receipt	Procurement service	Intake	Receipt and timestamp
procurement.bid.opening_record	Record formal bid opening	Authorized opening officials	Opening	Opening record
procurement.bid.opening_exception	Record an opening exception	Authorized official	Exception	Exception case
procurement.bid.late_submission	Record a late bid without altering its original timestamp	Procurement service	Exception	Late-submission record
procurement.bid.access_log	Record authorized access to bid materials	System or authorized auditor	Audit	Access record
procurement.bid.completeness	Assess bid completeness	Authorized evaluator	Assessment	Completeness result
procurement.bid.disqualification_review	Review a proposed exclusion from evaluation	Authorized reviewer	Review	Review decision
Specific fields
- bid.tender_ref: identifier_reference, required.
- bid.supplier_ref: registry_reference, required.
- bid.submission_version: number, system-generated.
- bid.submission_package_ref: identifier_reference, required; immutable package reference.
- bid.submitted_at: system-generated timestamp, required.
- bid.receipt_ref: identifier_reference, system-generated.
- bid.withdrawal_reason: long_text, required for a withdrawal request.
- bid.replacement_authority_ref: registry_reference, required where replacement is legally permitted.
- bid.clarification_request_ref: identifier_reference, required for a clarification response.
- bid.response_content: document, long_text or typed fields according to the approved clarification schema.
- bid.opening_official_refs: identifier_reference, repeated; each official must be authorized for the opening role.
- bid.opening_event_ref: identifier_reference, system-generated.
- bid.completeness_outcome: choice, required; source procurement.country.approved.completeness_outcomes.
- bid.exclusion_basis_ref: registry_reference, required before an exclusion decision.
- bid.exclusion_reason: long_text, required where a reasoned decision is required.
Country decisions: sealed-bid rules; electronic signature and submission requirements; bid withdrawal and replacement rights; opening procedure; late-submission treatment; confidentiality; exclusion and review safeguards.

Universal safeguard: a late bid remains recorded with its actual receipt time. CivicOS must not rewrite its timestamp to make it appear timely. The legal outcome is decided under the approved procurement rule.
Department E — Evaluation, due diligence and award
Form ID	Form title	Submitter	Procedure stage	Main outcome
procurement.evaluation.committee.appoint	Record appointment of an evaluation committee	Authorized appointing authority	Appointment	Committee record
procurement.evaluation.conflict.declare	Declare a conflict of interest	Committee member or reviewer	Declaration	Conflict record
procurement.evaluation.conflict.review	Decide how a declared conflict will be managed	Authorized independent reviewer	Review	Conflict-management decision
procurement.evaluation.technical	Record the technical evaluation	Authorized evaluator	Evaluation	Technical evaluation record
procurement.evaluation.financial	Record the financial evaluation	Authorized evaluator	Evaluation	Financial evaluation record
procurement.evaluation.clarification_request	Request a permitted bid clarification	Authorized evaluator	Clarification	Clarification request
procurement.evaluation.clarification_review	Assess the supplier's clarification response	Authorized evaluator	Review	Response assessment
procurement.evaluation.due_diligence	Record due diligence required by the procedure	Authorized evaluator	Review	Due-diligence record
procurement.evaluation.consolidated_report	Submit the consolidated evaluation report	Evaluation committee	Submission	Consolidated report
procurement.evaluation.independent_review	Review the evaluation process	Authorized independent reviewer	Review	Review record
procurement.award.proposal	Propose a procurement award	Authorized procurement committee	Proposal	Award proposal
procurement.award.legal_review	Record legal review of the proposed award	Authorized legal reviewer	Review	Legal review
procurement.award.approval	Approve or refuse a proposed award	Authorized decision-maker	Decision	Award decision
procurement.award.notice	Issue the award notice	Authorized procurement service	Notification	Notice record
procurement.award.debrief.request	Request a debrief where available	Eligible supplier	Request	Debrief case
procurement.award.debrief.response	Record the authorized debrief response	Authorized procurement officer	Response	Debrief record
procurement.award.challenge	Challenge an eligible award decision	Eligible supplier or representative	Complaint/review	Challenge case
procurement.award.challenge_response	Submit the procuring entity's response	Authorized procuring entity	Response	Response record
procurement.award.challenge.decision	Record the authorized challenge decision	Authorized review body	Decision	Challenge outcome
Specific fields
- evaluation.tender_ref: identifier_reference, required.
- evaluation.committee_ref: identifier_reference, required.
- evaluation.member_refs: identifier_reference, repeated; each member must have a valid appointment record.
- evaluation.conflict_declaration: group core.declaration_signature, required for appointed evaluators where mandated.
- evaluation.conflict_details: long_text, conditional; restricted.
- evaluation.criteria_version_ref: identifier_reference, required; the exact published criteria version.
- evaluation.bid_ref: identifier_reference, required.
- evaluation.criterion_results: repeated entries containing criterion_ref (identifier_reference), result (choice), score (number when scoring is configured), evidence_ref (identifier_reference) and comment (long_text).
- evaluation.clarification_refs: identifier_reference, conditional where clarification occurred.
- evaluation.due_diligence_refs: registry_reference, conditional on the approved procedure.
- evaluation.recommendation: choice, required; source procurement.country.approved.award_recommendations.
- evaluation.report_ref: identifier_reference, system-created after submission.
- award.proposed_supplier_ref: registry_reference, required.
- award.authority_ref: registry_reference, required before approval.
- award.decision_reason: long_text, required where required by law or procedure.
- award.notice_ref: identifier_reference, system-generated.
- award.challenge_basis: choice, required for a challenge; source procurement.country.approved.challenge_grounds.
Country decisions: evaluation methods; permitted scoring and weighting; evaluator appointment and conflict rules; due diligence; award authority; debrief rights; standstill periods where applicable; challenge and appeal routes.

Universal safeguard: the evaluation engine may apply published criteria and calculate configured scores. It must preserve the underlying evidence and cannot itself issue the legally material award decision. A reviewer must be able to trace each result to the bid version, criterion version and recorded evidence.
Department F — Contract management, delivery, variations and payment
Form ID	Form title	Submitter	Procedure stage	Main outcome
procurement.contract.draft	Prepare the contract for an approved award	Authorized procuring entity	Contract preparation	Draft contract
procurement.contract.legal_review	Record legal review of the contract	Authorized legal reviewer	Review	Legal review
procurement.contract.approval	Approve the contract for signature	Authorized approver	Approval	Contract approval
procurement.contract.signature_record	Record authorized contract execution	Authorized signatories or contract officer	Execution	Executed contract record
procurement.contract.register	Register an executed contract	Authorized contract officer	Registration	Contract record
procurement.contract.kickoff	Record the contract kickoff	Contract manager	Implementation	Kickoff record
procurement.contract.deliverable.submit	Submit a contractual deliverable	Supplier	Delivery	Deliverable record
procurement.contract.deliverable.review	Assess a submitted deliverable	Authorized contract manager	Review	Acceptance, rejection or further-information request
procurement.contract.inspection	Record an authorized delivery or works inspection	Authorized inspector	Inspection	Inspection record
procurement.contract.acceptance	Record acceptance of a deliverable	Authorized accepting officer	Acceptance	Acceptance record
procurement.contract.nonconformance	Record a contractual non-conformance	Contract manager	Exception	Non-conformance case
procurement.contract.corrective_action	Submit a corrective-action plan	Supplier	Corrective action	Plan review
procurement.contract.variation.request	Request a contract variation	Supplier or procuring entity, as permitted	Variation request	Variation case
procurement.contract.variation.assessment	Assess a proposed variation	Authorized contract officer	Assessment	Assessment record
procurement.contract.variation.legal_review	Review the legal basis for a variation	Authorized legal reviewer	Review	Legal review
procurement.contract.variation.approval	Approve or refuse a variation	Authorized decision-maker	Decision	Variation decision
procurement.contract.extension.request	Request a contract extension	Eligible party	Extension request	Extension review
procurement.contract.extension.decision	Record the extension decision	Authorized decision-maker	Decision	Extension outcome
procurement.contract.payment.claim	Submit a contractual payment claim	Supplier	Payment claim	Claim record
procurement.contract.payment.certification	Certify an eligible payment claim	Authorized contract manager	Certification	Certification record
procurement.contract.payment.instruction	Authorize a payment instruction	Authorized finance officer	Payment	Payment instruction
procurement.contract.payment.reconciliation	Reconcile a contract payment	Authorized finance officer	Reconciliation	Reconciliation record
procurement.contract.dispute.notice	Submit a contract dispute notice	Eligible party	Dispute	Dispute record
procurement.contract.dispute.response	Respond to a contract dispute notice	Eligible party	Response	Response record
procurement.contract.termination.proposal	Propose termination under the contract	Eligible party or authorized officer	Proposal	Termination review
procurement.contract.termination.decision	Record an authorized termination decision	Authorized decision-maker	Decision	Termination record
procurement.contract.closeout	Submit the contract closeout record	Contract manager	Closure	Closeout record
procurement.contract.performance_review	Record a supplier performance review	Authorized contract manager	Evaluation	Performance record
Contract variation: machine-usable contract
{
  "schema_version": "civicos.form-contract.v1",
  "form_id": "procurement.contract.variation.request",
  "record_type": "procurement.contract_variation",
  "form_version": 1,
  "status": "draft",
  "fields": [
    {
      "id": "variation.contract_ref",
      "type": "identifier_reference",
      "required": true,
      "validation": [{"rule": "contract_active_or_variation_eligible", "params": {}}],
      "values_source": "procurement.contracts",
      "personal_data_class": "administrative",
      "evidence": [],
      "label": {"en": "Contract"},
      "hint": {"en": "Select the contract for which the change is requested."},
      "error_text": {"en": {"contract_active_or_variation_eligible": "The contract cannot be varied under its current status or rules."}}
    },
    {
      "id": "variation.requesting_party_ref",
      "type": "registry_reference",
      "required": true,
      "validation": [{"rule": "party_authorized_to_request_variation", "params": {}}],
      "values_source": "civicos.registry.contract_parties",
      "personal_data_class": "administrative",
      "evidence": [],
      "label": {"en": "Requesting party"},
      "hint": {"en": "Select the party authorized to request this change."},
      "error_text": {"en": {"party_authorized_to_request_variation": "The selected party is not authorized to request this variation."}}
    },
    {
      "id": "variation.change_type",
      "type": "choice",
      "required": true,
      "validation": [{"rule": "variation_type_allowed_for_contract", "params": {}}],
      "values_source": "procurement.country.approved.variation_types",
      "personal_data_class": "administrative",
      "evidence": [],
      "label": {"en": "Type of change"},
      "hint": {"en": "Choose the category that describes the requested change."},
      "error_text": {"en": {"variation_type_allowed_for_contract": "This change type is not available under the contract's approved rules."}}
    },
    {
      "id": "variation.reason",
      "type": "long_text",
      "required": true,
      "validation": [{"rule": "length", "params": {"min": 20, "max": 10000}}],
      "values_source": null,
      "personal_data_class": "administrative",
      "evidence": [],
      "label": {"en": "Why is the change needed?"},
      "hint": {"en": "Explain the circumstances and why the requested change is necessary."},
      "error_text": {"en": {"length": "Explain the reason using between 20 and 10,000 characters."}}
    },
    {
      "id": "variation.current_terms_ref",
      "type": "identifier_reference",
      "required": true,
      "validation": [{"rule": "contract_terms_version_is_current", "params": {}}],
      "values_source": "procurement.contract_terms",
      "personal_data_class": "administrative",
      "evidence": [],
      "label": {"en": "Current contract terms"},
      "hint": {"en": "Link the version of the contract currently in force."},
      "error_text": {"en": {"contract_terms_version_is_current": "Select the current approved contract version."}}
    },
    {
      "id": "variation.proposed_terms_ref",
      "type": "identifier_reference",
      "required": true,
      "validation": [{"rule": "proposed_change_diff_is_recorded", "params": {}}],
      "values_source": "procurement.proposed_contract_changes",
      "personal_data_class": "restricted",
      "evidence": [],
      "label": {"en": "Proposed contract changes"},
      "hint": {"en": "Link the exact proposed changes so the current terms remain preserved."},
      "error_text": {"en": {"proposed_change_diff_is_recorded": "Record the proposed changes against the current terms."}}
    },
    {
      "id": "variation.value_change",
      "type": "money",
      "required": false,
      "validation": [{"rule": "value_change_calculated_from_proposed_terms", "params": {}}],
      "values_source": "procurement.contract_change_calculations",
      "personal_data_class": "administrative",
      "evidence": [],
      "label": {"en": "Change in contract value"},
      "hint": {"en": "The system must calculate or validate this value from the proposed terms."},
      "error_text": {"en": {"value_change_calculated_from_proposed_terms": "The value change does not match the proposed terms."}}
    },
    {
      "id": "variation.legal_authority_ref",
      "type": "registry_reference",
      "required": true,
      "validation": [{"rule": "variation_has_approved_legal_authority", "params": {}}],
      "values_source": "civicos.registry.approved_legal_authorities",
      "personal_data_class": "administrative",
      "evidence": [],
      "label": {"en": "Authority to vary the contract"},
      "hint": {"en": "Link the approved legal and procedural authority for the proposed change."},
      "error_text": {"en": {"variation_has_approved_legal_authority": "No applicable approved authority was found."}}
    },
    {
      "id": "variation.supporting_evidence",
      "type": "document",
      "required": false,
      "validation": [{"rule": "evidence_requirements_satisfied", "params": {}}, {"rule": "malware_scan_passed", "params": {}}],
      "values_source": "civicos.documents.secure_store",
      "personal_data_class": "restricted",
      "evidence": [{"kind": "variation_support", "when": "as_required_by_the_approved_contract_change_procedure"}],
      "label": {"en": "Supporting evidence"},
      "hint": {"en": "Attach the evidence required by the variation procedure."},
      "error_text": {"en": {"evidence_requirements_satisfied": "Required evidence is missing.", "malware_scan_passed": "The file could not be accepted safely."}}
    }
  ],
  "legal_basis": [],
  "country_decisions": [
    "Permitted contract variation types and limits.",
    "Approval authority and separation of duties.",
    "When a variation requires procurement-method review or a new competition.",
    "Contract extension and termination powers.",
    "Publication, disclosure and audit requirements."
  ]
}


Universal safeguards:
- An executed contract is immutable. An approved variation creates a linked, versioned change record.
- The system must preserve the original contract, all variations, approval events and effective dates.
- The contract manager cannot certify their own payment if the approved control policy requires an independent certifier.
- Payment certification is not payment execution.
- A supplier-performance record is evidence for authorized contract management; it is not automatically a government-wide blacklist.
- Any exclusion or debarment process must be governed by the responsible authority, applicable law, notice, evidence, reasons and review rights.
Country decisions: contract form and legal effect; variation thresholds; extension rules; payment certification; dispute resolution; termination powers; supplier-performance publication; closeout and retention.
Department G — Procurement complaints, independent review and oversight
The Procurement Authority, where separate from purchasing institutions, needs a distinct case-management and decision workflow. It must not rely solely on the procuring entity's own review of its conduct.
Form ID	Form title	Submitter	Procedure stage	Main outcome
procurement.complaint.submit	Submit a procurement complaint	Eligible supplier or other eligible party	Complaint	Complaint case
procurement.complaint.completeness	Assess complaint completeness	Authorized intake officer	Assessment	Completeness record
procurement.complaint.further_information	Request missing complaint information	Authorized officer	Further information	Request record
procurement.complaint.response_request	Request a response from the procuring entity	Authorized review body	Response request	Response requested
procurement.complaint.response	Submit a response to a procurement complaint	Procuring entity or other eligible party	Response	Response record
procurement.complaint.evidence	Submit additional complaint evidence	Eligible party	Further information	Evidence record
procurement.complaint.review	Conduct an authorized complaint review	Authorized reviewer	Review	Review record
procurement.complaint.interim_measure	Request an interim measure where available	Eligible party	Request	Interim-measure decision
procurement.complaint.interim_decision	Record the interim-measure decision	Authorized decision-maker	Decision	Interim outcome
procurement.complaint.decision	Record the complaint decision	Authorized decision-maker	Decision	Complaint outcome
procurement.complaint.notification	Notify parties of the complaint outcome	Authorized review body	Notification	Notice and delivery record
procurement.complaint.appeal	Appeal an eligible review decision	Eligible appellant	Appeal	Appeal case
procurement.integrity.referral	Refer suspected procurement misconduct to the competent body	Authorized officer	Referral	Referral record
procurement.audit.request	Request a procurement audit or review	Authorized body	Request	Audit request
procurement.audit.plan	Approve a procurement audit plan	Authorized auditor or supervisor	Planning	Audit plan
procurement.audit.finding	Record a procurement audit finding	Authorized auditor	Audit	Finding record
procurement.audit.response	Submit a response to an audit finding	Audited entity	Response	Response record
procurement.audit.action_plan	Submit a corrective-action plan	Audited entity	Corrective action	Action-plan review
procurement.audit.follow_up	Record follow-up on an audit action	Authorized auditor	Monitoring	Follow-up record
procurement.audit.close	Close an audit finding	Authorized auditor or designated reviewer	Closure	Closure decision
Specific fields
- complaint.procurement_ref: identifier_reference, required.
- complaint.decision_challenged_ref: identifier_reference, required where a particular decision is challenged.
- complaint.complainant_ref: registry_reference, conditional if anonymous submissions are permitted.
- complaint.eligibility_basis_ref: registry_reference, required for an eligibility determination.
- complaint.grounds: long_text, required.
- complaint.requested_remedy: choice, required; source procurement.country.approved.review_remedies.
- complaint.evidence_refs: registry_reference, optional or conditional under the procedure.
- complaint.response_deadline_rule_ref: identifier_reference, required when a response deadline applies.
- complaint.interim_measure_type: choice, conditional; source procurement.country.approved.interim_measures.
- complaint.interim_authority_ref: registry_reference, required before an interim decision.
- complaint.decision_outcome: choice, required at decision; approved review outcomes.
- complaint.decision_reason: long_text, required where reasons are required.
- audit.scope: long_text, required.
- audit.authority_ref: registry_reference, required.
- audit.criteria_refs: registry_reference, required; approved audit criteria.
- audit.finding_refs: registry_reference, conditional on findings.
- audit.management_response: long_text, required when the audited entity is given an opportunity to respond.
- audit.corrective_action_refs: registry_reference, conditional where corrective action is required.
Country decisions: review-body independence; standing to complain; complaint and appeal deadlines; interim measures; review remedies; audit powers; publication of decisions; referral and confidentiality rules.

Universal independence rule: an executive-wide account must not inherit access to independent procurement review cases. The review body owns its case records and determines lawful access within its configured authority.
3.6 Cross-institution forms and controlled exchanges
These forms connect customs, the Central Bank, Trade and Industry, Investment Facilitation, Procurement, Tax, Treasury and independent regulators. They do not transfer ownership of the underlying record.
Department A — Inter-institutional requests
Form ID	Form title	Submitter	Procedure stage	Main outcome
exchange.trade_authority.request	Request information from another authorized trade authority	Authorized institution	Request	Exchange request
exchange.trade_authority.response	Respond to an authorized trade-information request	Receiving institution	Response	Exchange response
exchange.customs_permit.verify	Request verification of an import/export permit	Customs or authorized trader	Verification	Verification result
exchange.customs_permit.response	Return the permit verification result	Permit-owning institution	Response	Verification response
exchange.tax_status.verify	Request verification of a legally relevant tax-registration status	Authorized requesting institution	Verification	Verification result
exchange.tax_status.response	Return the permitted tax-status result	Revenue Authority	Response	Status response
exchange.business_status.verify	Verify a business-registration status	Authorized institution	Verification	Verification result
exchange.business_status.response	Return the business-status result	Business registry	Response	Status response
exchange.investment_approval.verify	Verify an investment approval	Authorized institution	Verification	Verification result
exchange.investment_approval.response	Return an investment-approval result	Approval-owning institution	Response	Approval response
exchange.procurement_status.verify	Verify a supplier or procurement record where lawful	Authorized institution	Verification	Verification result
exchange.procurement_status.response	Return the permitted procurement-status result	Record-owning authority	Response	Status response
exchange.financial_reference.verify	Verify a financial reference for an authorized administrative purpose	Authorized institution	Verification	Verification result
exchange.financial_reference.response	Return the permitted verification result	Record-owning institution	Response	Verification response
exchange.referral.create	Refer a case to another institution under an approved relationship	Authorized officer	Referral	Referral record
exchange.referral.accept	Accept or decline an incoming referral	Authorized receiving officer	Referral review	Referral outcome
exchange.referral.update	Return a permitted referral-status update	Authorized receiving officer	Monitoring	Status update
exchange.referral.close	Close an inter-institution referral	Authorized officer	Closure	Closure record
Exchange request contract
{
  "schema_version": "civicos.form-contract.v1",
  "form_id": "exchange.customs_permit.verify",
  "record_type": "civicos.authorized_exchange_request",
  "form_version": 1,
  "status": "draft",
  "fields": [
    {
      "id": "exchange.requesting_institution",
      "type": "registry_reference",
      "required": true,
      "validation": [{"rule": "institution_active", "params": {}}, {"rule": "actor_authorized_for_exchange", "params": {}}],
      "values_source": "civicos.registry.institutions",
      "personal_data_class": "administrative",
      "evidence": [],
      "label": {"en": "Requesting institution"},
      "hint": {"en": "Select the institution making the request."},
      "error_text": {"en": {"institution_active": "Select an active institution.", "actor_authorized_for_exchange": "This institution or actor is not authorized for the requested exchange."}}
    },
    {
      "id": "exchange.receiving_institution",
      "type": "registry_reference",
      "required": true,
      "validation": [{"rule": "approved_relationship_exists", "params": {}}, {"rule": "recipient_authorized_for_data", "params": {}}],
      "values_source": "civicos.registry.institution_relationships",
      "personal_data_class": "administrative",
      "evidence": [],
      "label": {"en": "Receiving institution"},
      "hint": {"en": "Select the institution that owns the requested record."},
      "error_text": {"en": {"approved_relationship_exists": "No approved relationship exists for this exchange.", "recipient_authorized_for_data": "The receiving institution is not authorized for this data."}}
    },
    {
      "id": "exchange.purpose",
      "type": "choice",
      "required": true,
      "validation": [{"rule": "purpose_authorized_for_relationship", "params": {}}],
      "values_source": "civicos.exchange.approved_purposes",
      "personal_data_class": "administrative",
      "evidence": [],
      "label": {"en": "Purpose of the request"},
      "hint": {"en": "Choose the specific approved purpose for this lookup."},
      "error_text": {"en": {"purpose_authorized_for_relationship": "The selected purpose is not authorized for this exchange."}}
    },
    {
      "id": "exchange.target_record_ref",
      "type": "identifier_reference",
      "required": true,
      "validation": [{"rule": "identifier_valid_for_target_registry", "params": {}}],
      "values_source": "civicos.exchange.approved_target_identifiers",
      "personal_data_class": "restricted",
      "evidence": [],
      "label": {"en": "Record to verify"},
      "hint": {"en": "Provide the identifier required by the receiving institution's approved verification service."},
      "error_text": {"en": {"identifier_valid_for_target_registry": "The identifier is invalid for the requested verification service."}}
    },
    {
      "id": "exchange.legal_authority_ref",
      "type": "registry_reference",
      "required": true,
      "validation": [{"rule": "lawful_basis_covers_data_and_purpose", "params": {}}],
      "values_source": "civicos.registry.approved_legal_authorities",
      "personal_data_class": "administrative",
      "evidence": [],
      "label": {"en": "Authority for the exchange"},
      "hint": {"en": "Select the approved authority covering the requested data and purpose."},
      "error_text": {"en": {"lawful_basis_covers_data_and_purpose": "The authority does not cover this data and purpose."}}
    },
    {
      "id": "exchange.requested_attributes",
      "type": "choice",
      "required": true,
      "validation": [{"rule": "attributes_minimized_and_allowed", "params": {}}],
      "values_source": "civicos.exchange.approved_attribute_sets",
      "personal_data_class": "restricted",
      "evidence": [],
      "label": {"en": "Information needed"},
      "hint": {"en": "Request only the minimum attributes needed for this decision."},
      "error_text": {"en": {"attributes_minimized_and_allowed": "One or more requested attributes are not authorized or are unnecessary for this purpose."}}
    },
    {
      "id": "exchange.case_ref",
      "type": "identifier_reference",
      "required": true,
      "validation": [{"rule": "case_open_and_purpose_matches", "params": {}}],
      "values_source": "civicos.authorized_case_registry",
      "personal_data_class": "restricted",
      "evidence": [],
      "label": {"en": "Related case"},
      "hint": {"en": "Link the case that requires the verification."},
      "error_text": {"en": {"case_open_and_purpose_matches": "The case is not open or does not match the stated purpose."}}
    }
  ],
  "legal_basis": [],
  "country_decisions": [
    "Approved institutional relationships and exchange purposes.",
    "Lawful basis for each data category and verification purpose.",
    "Permitted attributes, response types and retention periods.",
    "Whether the exchange requires case-by-case approval.",
    "Dispute, correction and unauthorized-access reporting procedures."
  ]
}


The response is a separate record owned by the receiving institution. It should return only the authorized result—such as valid, invalid, expired, not_found or unable_to_verify—unless the approved service explicitly permits additional attributes.

Universal controls:
- An exchange request must be rejected if the institutional relationship, legal authority, actor permission or purpose is missing.
- A successful authentication does not by itself authorize access.
- The request and response are separately audited by the respective institutions.
- The receiving institution controls the meaning, correction and retention of its source record.
- A failed lookup must not silently be converted into a negative legal finding.
- Bulk access requires a separate approved purpose, scope, security policy and legal authority.

3.7 Required catalogue controls and production acceptance
The engineering team should use the following gates to determine whether Part 3 is genuinely implemented.
Acceptance gate	Required evidence
Customs data contracts	Each activated declaration schema maps to the approved national customs data model, commodity nomenclature and procedure codes.
Customs legal controls	Release, detention, assessment, refund and permit decisions bind to an approved authority and rule version.
Central Bank independence	Separate institutional ownership, access policy, audit trail and deployment boundary are tested.
Financial supervision	Confidential supervisory records are not accessible through general executive accounts.
Investment facilitation	Each approval link resolves to the institution that legally owns the decision.
Procurement integrity	Published tender versions, submitted bids, evaluation criteria and award decisions remain traceable and immutable.
Supplier payment changes	Bank-detail amendments require the configured verification and approval workflow.
Contract management	Variations, acceptance, payment certification, payment execution and closeout are separate records and stages.
Independent procurement review	Review cases cannot be edited or approved by the procuring entity whose decision is being challenged.
Inter-institution exchanges	Unauthorized purpose, attributes, recipient or legal authority causes the exchange to fail closed.
Production data quality	All values are sourced from approved records or explicitly marked as reported, estimated, modelled or unavailable.
Form accessibility	All activated forms pass the platform's WCAG 2.2 AA, multilingual, right-to-left and assisted-channel tests.
3.8 Country configuration records required before activation
The country must explicitly approve the following configuration groups:
- country.customs.declaration_schemas
- country.customs.commodity_codes
- country.customs.tariffs_and_valuation
- country.customs.origin_rules
- country.customs.permits_and_controlled_goods
- country.customs.inspection_and_release
- country.centralbank.legal_standing
- country.centralbank.governance
- country.centralbank.payment_system_oversight
- country.centralbank.supervised_entities
- country.industry.support_schemes
- country.industry.standards_authority
- country.trade.market_access
- country.investment.registration_and_facilitation
- country.investment.incentive_schemes
- country.procurement.planning_and_methods
- country.procurement.supplier_qualification
- country.procurement.tendering_and_evaluation
- country.procurement.contract_management
- country.procurement.complaints_and_review
- country.interinstitutional.trade_exchanges
Every configuration must be versioned, law-cited where legally material, reviewed and approved under the country's separation-of-duties policy.
3.9 What comes next
Part 4 of 13 — Civil Registration, National Identity, Immigration and Passports.

That part will cover birth, death and other civil events; corrections to civil records; identity registration and replacement; identity verification; passports and travel documents; visas, residence permits, renewals, amendments, cancellations and appeals; and the administrative forms used by officers.

The design will preserve the boundaries established in your specification: no invented identity facts, no immigration risk scores, no automatic adverse decisions, and no collection of personal information without an approved purpose and lawful authority.


CivicOS — Complete Government Form System
Part 4 of 13 — Civil Registration, National Identity, Immigration and Passports
This part defines the forms, records, and administrative workflows for establishing civil events, maintaining national identity records, verifying identity, issuing travel documents, and administering immigration cases.

The key architectural rule is that a form submission is not itself a legal decision. CivicOS records the application, evidence, verification, authorized decision, notification, and review history as distinct events. Each workflow must be activated only after the country has configured the relevant law, competent authority, required evidence, deadlines, fees, and review process.
1. Civil registration authority
Civil registration covers legally recognized life events and civil-status changes. The system must distinguish an event occurring, an event being reported, and an event being legally registered.
1.1 Civil registration form catalogue
Form ID	Form or workflow	Submitted by	Main outcome
CIV-BTH-001	Birth notification	Authorized health facility or reporting person	Notification recorded
CIV-BTH-002	Birth registration application	Parent, guardian, or authorized applicant	Registration case opened
CIV-BTH-003	Delayed birth registration	Applicant or authorized representative	Additional evidence review
CIV-BTH-004	Birth registration decision	Authorized registrar	Register, refuse, or request further evidence
CIV-BTH-005	Birth certificate request	Entitled person or representative	Certificate issued or request referred
CIV-DEA-001	Death notification	Authorized facility, official, or reporting person	Death notification recorded
CIV-DEA-002	Death registration application	Authorized informant	Death registration case opened
CIV-DEA-003	Delayed or disputed death registration	Authorized applicant	Evidence review
CIV-DEA-004	Death registration decision	Authorized registrar	Decision recorded
CIV-DEA-005	Death certificate request	Entitled applicant	Certificate issued or request referred
CIV-MAR-001	Marriage registration	Authorized parties or officiant	Registration case opened
CIV-MAR-002	Marriage record amendment	Entitled applicant	Correction review
CIV-MAR-003	Divorce or dissolution registration	Authorized court or legally competent source	Civil-status event recorded
CIV-MAR-004	Civil-status certificate request	Entitled applicant	Certificate or certified extract
CIV-OTH-001	Adoption or parentage registration	Authorized authority or legally entitled applicant	Restricted registration case
CIV-OTH-002	Name change application	Entitled applicant	Name-change decision workflow
CIV-OTH-003	Civil-status change notification	Authorized source or applicant	Event recorded or referred
CIV-REC-001	Civil record correction request	Entitled applicant	Correction case opened
CIV-REC-002	Civil record dispute	Entitled applicant or authorized body	Dispute review
CIV-REC-003	Historical record reconstruction	Authorized registrar	Reconstruction case
CIV-REC-004	Certified record extract request	Entitled applicant	Extract issued or refused with reason where required
CIV-REC-005	Record access and disclosure request	Applicant or legally entitled institution	Disclosure decision recorded
These identifiers are CivicOS catalogue identifiers, not assertions that every country legally requires a separate form for every action. A country may combine steps in one interface while retaining separate auditable workflow events.
1.2 Birth registration data contract
The birth registration workflow should collect only fields required by the configured law and the purpose of the case.
Field group	Example fields	Rules
Case identity	Case ID, application date, registering office	System-generated identifiers; immutable case history
Birth event	Date, time if required, place of birth	Store source and precision; do not invent missing values
Child's particulars	Proposed registered name and legally required attributes	Collect only fields authorized by country rules
Parent or guardian	Relationship, identifying reference, contact details where necessary	Verify entitlement before exposing linked records
Informant	Identity reference, role, authority to report	Record source and verification status
Supporting evidence	Birth notification, medical record reference, affidavit, court order where applicable	Evidence type, issuer, issue date, integrity, and verification status
Registration basis	Applicable rule, rule version, competent registrar	Legal basis required for a material decision
Outcome	Registered, pending, referred, refused where legally permitted	Authorized decision-maker and reasons where required
Do not assume that a medical facility is always the reporting source, that every birth has a medical record, or that the same parentage evidence is valid in every jurisdiction. Country rules determine acceptable evidence and alternative procedures.
1.3 Death registration safeguards
A death record must distinguish:
- The report of a death.
- Verification of the event and the informant's authority.
- Registration by the competent authority.
- Medical certification or cause-of-death information, where legally authorized.
- Requests for certified copies or disclosures to other institutions.
Medical details must be separately classified and restricted. A general civil registration user must not automatically receive access to medical cause-of-death data.

The platform must not automatically change a person's identity status, cancel benefits, freeze accounts, or make inheritance decisions merely because a death notification has arrived. Other authorities may receive a lawful, purpose-limited notification, but any resulting legal or financial action belongs to its competent workflow.
2. Corrections, disputes, and historical civil records
Civil records can have consequences for citizenship, inheritance, family relationships, travel, and public services. CivicOS must therefore treat amendments as controlled legal events rather than ordinary database edits.
2.1 Record correction workflow
1. Receive correction request

Identify the record, requested change, applicant's entitlement, and reason.


2. Verify evidence and authority

Compare the original record, source documents, and applicable correction rules.


3. Authorized review

Refer contested, material, or court-dependent changes to the competent official.


4. Record a new versioned event

Preserve the prior record, decision, evidence references, and audit trail.


2.2 Required correction forms
Form ID	Form	Required control
CIV-REC-010	Correction request	Original value, requested value, reason, supporting evidence
CIV-REC-011	Record comparison report	Source-by-source comparison and discrepancies
CIV-REC-012	Evidence verification record	Verifier, method, date, result, and limitations
CIV-REC-013	Correction decision	Authorized decision, legal basis, reasons, and effective date
CIV-REC-014	Correction implementation record	Previous version, new version, operator, and confirmation
CIV-REC-015	Record dispute referral	Issue, parties entitled to participate, and competent destination
CIV-REC-016	Review or appeal request	Challenged decision, grounds, submission date, and deadline calculation
CIV-REC-017	Historical reconstruction record	Sources consulted, uncertainty, and approval
CIV-REC-018	Suspected duplicate record review	Candidate records, comparison evidence, and human determination
Non-negotiable rules
- Never silently overwrite a legally material value.
- A correction must link to the record version it changes.
- Preserve the original source and correction rationale according to the applicable retention schedule.
- A potential duplicate is a review flag, not permission to merge records.
- Uncertain evidence must remain marked as uncertain; the system must not convert uncertainty into a fact.
- If a court order or other external decision is required, route the case rather than simulating that authority within the registry.
3. National identity registration and identity services
National identity administration is separate from civil registration. A civil event may support an identity application, but it must not automatically create, merge, or invalidate a national identity unless an explicitly configured legal rule authorizes the specific transition.
3.1 Identity form catalogue
Form ID	Form or workflow	Main outcome
IDN-REG-001	Initial identity registration	Identity application opened
IDN-REG-002	Eligibility and entitlement review	Eligibility determination recorded
IDN-REG-003	Identity evidence submission	Evidence attached and classified
IDN-REG-004	Identity verification record	Verification outcome recorded
IDN-REG-005	Identity issuance decision	Authorized issue, refer, or refuse decision
IDN-CARD-001	Identity credential issuance	Credential production requested
IDN-CARD-002	Identity credential collection	Delivery or collection recorded
IDN-CARD-003	Lost or stolen credential report	Report recorded; replacement eligibility assessed
IDN-CARD-004	Damaged credential replacement	Replacement workflow opened
IDN-CARD-005	Credential renewal	Renewal decision and validity dates recorded
IDN-CARD-006	Credential suspension or revocation review	Competent authority review
IDN-CARD-007	Credential status correction	Status discrepancy reviewed
IDN-VER-001	Identity verification request	Purpose-bound verification
IDN-VER-002	Identity verification response	Minimum necessary result disclosed
IDN-VER-003	Verification dispute	Discrepancy sent for review
IDN-ACC-001	Personal identity data access request	Entitlement and access decision
IDN-ACC-002	Identity data correction request	Correction case
IDN-ACC-003	Identity data disclosure authorization	Approved recipient, purpose, fields, and duration
IDN-ACC-004	Identity access audit inquiry	Review of logged access
IDN-SEC-001	Suspected identity misuse report	Security case opened
IDN-SEC-002	Identity record compromise assessment	Authorized investigation and containment
IDN-SEC-003	Identity recovery request	Recovery verification and decision
3.2 Identity registration data contract
The identity service should use a typed schema rather than a loose collection of profile fields.
Schema object	Required content
identity_case	Case ID, applicant reference, procedure type, current state, assigned authority
identity_subject_ref	Stable internal subject reference; never inferred from a name alone
identity_claims	Proposed identity attributes, source, verification status, and effective dates
identity_evidence	Evidence type, issuer, reference, integrity information, and verification history
identity_eligibility	Configured eligibility rule ID and version, outcome, and reviewer
identity_decision	Decision type, authorized officer, legal basis, decision date, reasons where required
credential_record	Credential identifier, status, issuance date, expiry date, and delivery status
identity_link	Explicit relationship to a civil record or another authorized record, with linkage basis
access_policy_ref	Purpose, recipient authority, permitted fields, and policy version
audit_reference	Immutable audit event references for access and changes
Sensitive values such as full identity numbers should be masked by default in staff interfaces, search results, logs, exports, and notifications. Full values should appear only where the user's role, purpose, and case authorization permit them.
3.3 Identity verification is not identity disclosure
CivicOS should support narrowly scoped verification responses where authorized, such as:
- verified
- not_verified
- unable_to_verify
- additional_review_required
The permitted response vocabulary must be configured to match the jurisdiction's law and service contract. A failed lookup must not be treated as proof that a person does not exist, lacks citizenship, or is ineligible for a service.

A requesting institution should normally receive only the result needed for its lawful purpose, not the underlying civil or identity record.
3.4 Biometric controls
Biometric collection is not a default requirement for CivicOS. Where expressly authorized by law and supported by a reviewed security design, the relevant workflow must specify:
- Authorized biometric type and purpose.
- Collection authority and notice requirements.
- Approved equipment and capture procedure.
- Encryption, access restrictions, retention, and deletion rules.
- Human review of matching failures or disputed results.
- Alternative procedures where legally required or available.
- A prohibition on repurposing data for unrelated surveillance, profiling, or cross-domain scoring.
A biometric match must not itself make an adverse legal decision.
4. Immigration, visas, residence, and lawful stay
Immigration workflows differ significantly between countries. CivicOS must not assume that every state uses the same visa classes, residence categories, appeal rights, or decision deadlines. Each procedure is activated through a country-specific rule pack.
4.1 Visa form catalogue
Form ID	Form or workflow	Main outcome
IMM-VIS-001	Visa application	Application registered
IMM-VIS-002	Visa category selection	Category selected from configured rules
IMM-VIS-003	Supporting document submission	Evidence registered
IMM-VIS-004	Appointment and attendance record	Attendance status recorded
IMM-VIS-005	Additional information request	Formal request issued
IMM-VIS-006	Applicant response to information request	Response received and linked
IMM-VIS-007	Visa eligibility assessment	Assessment recorded for authorized decision-maker
IMM-VIS-008	Visa decision	Authorized grant, refusal, or other legally permitted outcome
IMM-VIS-009	Visa issuance record	Validity, conditions, and document reference recorded
IMM-VIS-010	Visa amendment request	Amendment review
IMM-VIS-011	Visa cancellation or revocation review	Lawful review initiated
IMM-VIS-012	Visa review or appeal request	Review workflow opened
IMM-VIS-013	Visa status verification request	Authorized status response
IMM-VIS-014	Application withdrawal request	Withdrawal assessed and recorded
IMM-VIS-015	Visa application fee or exemption record	Payment, waiver, or exemption recorded
4.2 Residence and work authorization catalogue
Form ID	Form or workflow	Main outcome
IMM-RES-001	Initial residence permit application	Case opened
IMM-RES-002	Residence permit renewal	Renewal case
IMM-RES-003	Residence permit extension	Extension request
IMM-RES-004	Change of residence category	Category-change review
IMM-RES-005	Change of employer or sponsor	Sponsor-related review, where applicable
IMM-RES-006	Family reunification application	Family application
IMM-RES-007	Dependent or family member application	Linked but separately controlled case
IMM-RES-008	Permanent residence application	Eligibility review
IMM-RES-009	Long-term residence status application	Configured status review
IMM-RES-010	Work authorization application	Authorization review
IMM-RES-011	Student residence application	Student category review
IMM-RES-012	Researcher or specialist residence application	Configured category review
IMM-RES-013	Residence permit amendment	Amendment decision
IMM-RES-014	Residence permit replacement	Replacement credential
IMM-RES-015	Residence status correction	Discrepancy review
IMM-RES-016	Residence permit cancellation review	Authorized status decision
IMM-RES-017	Residence decision review or appeal	Review or appeal case
IMM-RES-018	Residence status verification	Purpose-limited response
The platform should not treat an employer, school, sponsor, or family member as automatically entitled to view a person's entire immigration file. Each relationship has its own legal basis, scope, and expiration conditions.
4.3 Immigration case record
A standard immigration case should contain the following typed objects:
Object	Core fields
immigration_case	Case ID, procedure, applicant reference, responsible authority, current stage
application_submission	Submitted fields, timestamp, channel, version, and applicant declaration
document_evidence	Document type, issuing authority, reference, file integrity, verification result
request_for_information	Requested items, legal basis where required, issued date, response deadline
applicant_response	Submitted evidence, receipt date, links to the request
assessment_record	Applicable criteria, findings, evidence references, unresolved questions
decision_record	Outcome, legal provision and version, authorized decision-maker, decision timestamp
notification_record	Delivery channel, recipient, content version, delivery evidence
review_record	Review type, grounds, submission date, reviewer, current state
deadline_record	Trigger event, configured rule, calculated date, calendar convention, extensions
status_record	Status, effective date, source decision, superseding event if applicable
4.4 Decision workflow and safeguards

Application and evidence

Validate required fields and file integrity. Missing evidence leads to the configured request or referral path, not an invented fact.


Assessment

An authorized officer reviews the applicable legal criteria, evidence, contradictions, and any legally required procedural safeguards.


Human-authorized decision

The decision records the officer, authority, legal basis and version, outcome, and reasons where required. AI cannot approve or refuse an application.


Notification and review

Issue the appropriate notice, record delivery, and provide review or appeal pathways, deadlines, and suspensive-effect rules where applicable.


Immigration workflows must not introduce opaque risk scores, inferred nationality, automated credibility scores, or hidden adverse classifications. Automated validation may identify missing fields or inconsistent evidence, but the officer must see the underlying facts and retain authority over the legal outcome.

If the authority cannot verify a fact, CivicOS should record that limitation explicitly. It must not automatically convert a verification failure into a refusal ground.
5. Passports and travel documents
Passports and other travel documents require their own issuance, security, validity, and replacement workflows. The exact documents and eligibility rules must be configured by country.
5.1 Travel document form catalogue
Form ID	Form or workflow	Main outcome
PAS-APP-001	Passport application	Application registered
PAS-APP-002	First passport application	Initial issuance assessment
PAS-APP-003	Passport renewal	Renewal assessment
PAS-APP-004	Child or dependent passport application	Entitlement and consent review where applicable
PAS-APP-005	Passport replacement	Replacement assessment
PAS-APP-006	Lost or stolen passport report	Report and document-status review
PAS-APP-007	Damaged passport report	Condition and replacement review
PAS-APP-008	Emergency travel document application	Emergency eligibility review
PAS-APP-009	Temporary or limited-validity travel document	Configured document workflow
PAS-APP-010	Passport name or particulars amendment	Amendment assessment
PAS-APP-011	Passport collection or delivery record	Custody transfer recorded
PAS-APP-012	Passport application withdrawal	Withdrawal recorded where permitted
PAS-APP-013	Passport issuance decision	Authorized issue, refer, or refusal
PAS-APP-014	Passport cancellation or revocation review	Authorized status review
PAS-APP-015	Passport status verification	Purpose-limited status response
PAS-APP-016	Passport refusal review or appeal	Review workflow
PAS-APP-017	Travel document return or surrender	Receipt and custody recorded
PAS-APP-018	Passport production reconciliation	Production and inventory controls
5.2 Passport issuance controls
Every issued document must link to:
- The relevant application and decision.
- The verified identity record and the legal basis for relying on it.
- The configured document type, serial or document identifier, and validity period.
- Production, quality-control, and custody events.
- Collection or delivery evidence.
- Any replacement, cancellation, revocation, or superseding document event.
Passport numbers and security-sensitive production data must not be broadly searchable by staff without a specific authorized purpose.

Lost-document reporting must not be treated as conclusive proof of fraud. The authorized process determines the status of the old document and whether a replacement is permitted.

A refusal or revocation must follow the applicable legal procedure and authorized human decision. The platform should support reasons, notice, review, and appeal where required; it must not invent those rights or remove them through generic workflow defaults.
6. Citizenship and nationality interfaces
Citizenship determination can have constitutional and legal consequences. CivicOS should support the records and procedures of the competent authority without assuming that civil registration or possession of an identity document establishes citizenship.
6.1 Citizenship-related form catalogue
Form ID	Form or workflow	Main outcome
NAT-APP-001	Citizenship or nationality application	Application registered
NAT-APP-002	Citizenship by descent application	Evidence and eligibility review
NAT-APP-003	Citizenship by birth determination	Configured legal assessment
NAT-APP-004	Naturalization application	Naturalization review
NAT-APP-005	Citizenship registration application	Registration review
NAT-APP-006	Citizenship certificate request	Entitlement and issuance review
NAT-APP-007	Citizenship status determination request	Competent-authority determination
NAT-APP-008	Citizenship record correction	Correction workflow
NAT-APP-009	Citizenship decision review or appeal	Review workflow
NAT-APP-010	Citizenship renunciation or loss-related application	Legally configured review
NAT-APP-011	Citizenship status verification request	Authorized status response
NAT-APP-012	Citizenship certificate replacement	Replacement assessment
These are optional catalogue entries until the country confirms which citizenship procedures exist and which institution has jurisdiction.

Critical boundary: A national identity number, birthplace, passport, parent's record, or immigration status must not independently be treated as conclusive proof of citizenship unless the applicable law expressly gives it that effect.
7. Public portal and institutional workspaces
Citizens and authorized representatives need a clear application experience. Registry and immigration officers need a different operational interface. Both must use the same controlled workflow engine and authoritative records.
Public service portal

Apply, upload evidence, pay configured fees, book appointments, receive notices, track permitted status information, and request reviews.


Institution workspace

Manage assigned cases, verify evidence, request information, record assessments, prepare decisions, and process authorized registrations.


Supervisory workspace

Review delegated authority, overdue cases, conflicts of interest, quality checks, access exceptions, and required approvals.


Review workspace

Manage authorized reviews and appeals with protected access, procedural deadlines, prior decisions, and independent case assignment where required.


7.1 Shared application capabilities
Each relevant public-facing workflow should support:
- Save draft and resume later.
- Accessible field labels, hints, and validation errors.
- Evidence upload with permitted file types and size limits.
- Clear disclosure of required information and the purpose of collection.
- A submission receipt and stable case reference.
- Secure messages and formal requests for additional information.
- Appointment scheduling when required.
- Configured payments, waivers, or exemptions.
- Notifications through approved channels.
- Application withdrawal where legally permitted.
- Review or appeal instructions where applicable.
- Accessible alternatives for applicants unable to use the digital channel.
Do not require a user to re-enter information CivicOS already holds and is legally authorized to reuse when a safe, purpose-limited reference will suffice. Conversely, do not retrieve another institution's record merely because it is technically available.
8. Shared form schema and validation contract
Every form in this part should use a versioned schema with explicit field-level metadata.

A representative field definition:
type CivicFieldDefinition = {
  id: string;
  type:
    | "string"
    | "date"
    | "datetime"
    | "enum"
    | "boolean"
    | "document_reference"
    | "record_reference";
  required: boolean;
  labelKey: string;
  hintKey?: string;
  errorKey?: string;
  validationRuleIds: string[];
  valueSource:
    | "applicant"
    | "authorized_officer"
    | "verified_source"
    | "system";
  dataClassification:
    | "public"
    | "internal"
    | "confidential"
    | "restricted";
  legalBasisRuleId?: string;
  evidenceRequirementIds?: string[];
};


The schema is a starting contract, not a complete implementation. Production schemas also need country-specific legal constraints, field-level access policies, retention rules, localization, provenance, and version migration rules.
8.1 Validation categories
Category	Examples	Failure behavior
Format	Date format, identifier syntax, file type	Explain the correct format
Completeness	Required fields and mandatory evidence	Prevent submission only where required
Eligibility	Configured category and entitlement conditions	Route to authorized assessment
Evidence	Issuer, integrity, expiry, verification state	Mark unresolved and request review
Authority	Competent institution and delegated officer	Block unauthorized action
Legal deadline	Filing date, response period, appeal period	Calculate using configured legal rules
Data consistency	Conflicting names, dates, or linked records	Flag discrepancy for review
Security	Unauthorized access, unsafe upload, invalid signature	Block the unsafe operation and record the event
Validation must distinguish a technical error from a legal conclusion. A missing document, unresolved match, or failed external connection is not automatically grounds for an adverse decision.
9. Privacy, access, and institutional boundaries
Civil registration, national identity, citizenship, and immigration data are particularly sensitive. Access must be designed around legal authority and specific purpose—not around an institution's name or seniority.
9.1 Required access model
Each access policy should define:
- The entitled institution and authorized role.
- The legal provision and version, where required.
- The permitted purpose and case relationship.
- The specific records and fields accessible.
- Whether the operation permits viewing, creating, amending, exporting, or disclosing.
- Any approval requirement or time limit.
- Retention and audit requirements.
- The process for challenging or investigating inappropriate access.
A data-protection oversight body must retain the independence and access boundaries established by the country's constitutional and statutory framework. It must not become a general-purpose route around normal restrictions.
9.2 Cross-institution exchange
Exchange	Permitted design principle
Civil registry to identity authority	Minimum required event or record reference under configured authority
Identity authority to passport authority	Purpose-limited identity verification
Immigration authority to another agency	Only legally authorized fields for a documented purpose
Court or review body to registry	Authenticated decision or order within its jurisdiction
Health facility to civil registry	Authorized event notification and required evidence
Public service to identity service	Narrow verification response rather than a copy of the identity record
Independent oversight to a registry	Access determined by its lawful mandate and independent status
Each exchange must use a versioned contract, authenticate the sending institution, validate the recipient's entitlement, record the purpose, and produce an auditable receipt. Failed exchanges should be retried safely or referred for review without creating duplicate legal records.
10. Country configuration and legal rule registry
Before enabling any form, each country must complete the relevant configuration. CivicOS must not infer a competent authority from a label such as “Ministry of Interior” or “Civil Registry.”
Configuration ID	Required decision
CFG-CIV-001	Competent civil registration authorities and jurisdiction
CFG-CIV-002	Legally recognized civil events and record ownership
CFG-CIV-003	Acceptable evidence by event and application type
CFG-CIV-004	Correction, dispute, and reconstruction procedures
CFG-IDN-001	National identity eligibility and issuance authority
CFG-IDN-002	Identifier generation, uniqueness, and replacement rules
CFG-IDN-003	Identity verification responses and permitted recipients
CFG-IDN-004	Biometric authorization, if any, and security requirements
CFG-IMM-001	Visa and immigration categories and competent authorities
CFG-IMM-002	Application requirements, fees, waivers, and deadlines
CFG-IMM-003	Decision powers, delegation, and required approvals
CFG-IMM-004	Notification, review, appeal, and deadline rules
CFG-PAS-001	Passport and travel document types and eligibility
CFG-PAS-002	Validity, replacement, cancellation, and custody rules
CFG-NAT-001	Citizenship procedures and competent determination authority
CFG-DAT-001	Personal-data classifications, retention, and disclosure policies
CFG-INT-001	Authorized cross-institution exchanges and contract versions
Each rule should have a stable identifier, legal source, version, effective date, status, and approval history. Where a material rule change requires two distinct officials, the system must enforce the propose-and-confirm process and preserve the previous version.

No rule should be activated merely because a developer supplied a plausible default.
11. Implementation acceptance gates
Part 4 is ready for country-specific implementation only when the following tests pass.
- [ ] Legal authority: Every legally material decision is tied to an applicable law or authorized rule version.
- [ ] Record integrity: Civil record corrections create linked versions and preserve the authorized history.
- [ ] Identity integrity: Potential duplicate records are reviewed by authorized personnel; identities are never merged automatically.
- [ ] Privacy: Each restricted-data read is purpose-bound, authorized, and logged.
- [ ] Data minimization: Forms collect only configured, justified information.
- [ ] Human decisions: Immigration, citizenship, identity, and passport adverse decisions cannot be made solely by AI.
- [ ] Due process: Applicable reasons, notices, review routes, and deadlines are supported.
- [ ] Uncertainty handling: Missing or conflicting evidence remains explicitly unresolved until properly assessed.
- [ ] Interoperability: Every exchange uses an authenticated, versioned, purpose-limited contract.
- [ ] Security: Sensitive documents, credentials, and identifiers are protected in transit, at rest, and in staff interfaces.
- [ ] Accessibility: Forms support WCAG 2.2 AA, keyboard operation, mobile layouts, localization, and right-to-left languages.
- [ ] Operational integrity: Production has no fabricated citizen records or sample decisions; training and demo data are clearly labelled.
- [ ] Auditability: Important actions, decisions, disclosures, and configuration changes have tamper-evident audit references.
- [ ] Recovery: Backups and recovery procedures are tested without silently duplicating registrations or legal events.
12. What this part adds to CivicOS
This catalogue establishes a shared form and workflow foundation for civil registration, identity, citizenship interfaces, immigration, and travel documents while keeping their legal responsibilities separate.

The implementation should reuse the common case engine, forms renderer, evidence service, authorization engine, legal rule registry, notifications, payments, document generation, and audit infrastructure. Each responsible authority retains its configured powers and record ownership.

Next: Part 5 of 13 — Justice, Courts, Prosecution, Corrections and Legal Aid. This will cover court filings and case administration, judicial orders, prosecution workflows, custody and corrections, legal assistance, and the interfaces required to preserve judicial independence and separation of powers.
