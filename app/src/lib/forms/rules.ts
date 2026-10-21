// The registry of named validation rules (docs/forms-catalogue/FIELD-SERIES
// Part 1 §1.3: "Only registered validation rules can execute. No arbitrary
// form-authored code."). Every rule name a form contract uses must be here;
// a contract naming any other rule does not fit the contract and is refused
// (fail closed). Each rule says where it runs:
//
//   client   checked in the browser and again on the server with the same
//            function and message (lib/forms/contract.ts checkAnswers())
//   server   checked on the server against the platform's own records
//            (lib/forms/server.ts)
//   system   the value is set by the platform itself (a submission time, an
//            amount calculated by an approved rule): the applicant never
//            enters it
//   officer  answered only by an authorised official at a step
//   document applied when a document is attached (file type by its bytes,
//            size and scan policy: lib/records/documents.ts)
//   binding  needs a register or a decision the country has not configured
//            on the platform yet: recorded on the case as not performed in a
//            demonstration, and a publication blocker in production (a form
//            whose checks cannot run does not go live)
//
// The names are the specification's and the field series' (Parts 1–4).
// Pure: the browser loads it.

export type RuleScope = 'client' | 'server' | 'system' | 'officer' | 'document' | 'binding';
export interface RegisteredRule { label: string; scope: RuleScope; params?: string[]; needs?: string }

const r = (label: string, scope: RuleScope, extra: Partial<RegisteredRule> = {}): RegisteredRule => ({ label, scope, ...extra });
const binding = (label: string, needs: string) => r(label, 'binding', { needs });

export const RULE_REGISTRY: Record<string, RegisteredRule> = {
  // ── General (Part 1) ──
  required: r('Required', 'client'),
  length: r('Length within limits', 'client', { params: ['min', 'max'] }),
  value_in_source: r('A value from the approved source', 'client'),
  date_not_in_future: r('Not in the future', 'client'),
  date_not_before: r('Not before a reference date', 'client', { params: ['reference'] }),
  required_if: r('Required when another answer is', 'client', { params: ['field', 'equals', 'in'] }),
  integer_range: r('A whole number within a range', 'client', { params: ['min', 'max'] }),
  must_match: r('Consistent with another answer', 'client', { params: ['field', 'true_when'] }),
  must_be_true: r('Must be confirmed', 'client'),
  coordinate_range: r('Valid coordinates', 'client', { params: ['latitude', 'longitude'] }),
  email_format: r('An email address', 'client'),
  phone_format: r('A telephone number', 'client', { params: ['international_format'] }),
  iso3166_country_code_valid: r('An ISO 3166 country code', 'client'),
  at_least_one_permitted_contact_method: r('At least one permitted contact method', 'client'),
  reference_exists: r('Points to an existing record', 'server'),
  reference_type_allowed: r('A reference of an allowed type', 'server', { params: ['types'] }),
  identifier_format_from_source: binding('Identifier format from its scheme', 'identifier schemes and their formats configured by the country'),
  institution_active: r('An active institution', 'server'),
  actor_authorized_for_institution: r('The official acts for this institution', 'server'),
  actor_has_role: r('Recorded by an official with the role', 'officer', { params: ['role'] }),
  officer_or_service_only: r('Set by an authorised official or service only', 'officer'),
  actor_has_active_inspection_authority: r('Recorded by an official with inspection authority', 'officer'),
  approved_content_version: r('An approved text version', 'server'),
  must_match_server_submission_date: r('The submission date, recorded by the platform', 'system'),
  server_recorded_timestamp: r('Recorded by the platform', 'system'),
  server_timestamp_recorded: r('Recorded by the platform', 'system'),
  approved_rule_active_at_calculation: r('An approved rule in force when calculated', 'server'),
  derived_from_approved_rule: r('Calculated by the approved rule', 'system', { needs: 'a fee rule the platform can calculate (lib/law/rules.ts has rates, bands and tariffs, not fixed fees yet)' }),
  currency_matches_rule: r('In the rule\'s currency', 'server'),
  evidence_requirement_in_approved_package: r('Evidence the approved procedure asks for', 'server'),
  document_requirement_match: r('The document asked for', 'server'),
  file_type_allowlist: r('An accepted file type (checked by its bytes)', 'document'),
  file_size_limit_from_policy: r('Within the size the security policy allows', 'document'),
  malware_scan_passed: r('Passed the security scan', 'binding', { needs: 'a malware scanning service connected to document uploads' }),
  bank_identifier_format_from_country_policy: binding('Bank identifier format', 'the country\'s payout schemes and identifier formats'),
  all_references_resolve_to_approved_law: r('Every reference is an approved law and provision', 'server'),
  legal_references_resolve: r('Every legal reference resolves in the laws register', 'server'),
  evidence_requirements_satisfied: r('The evidence the procedure requires is there', 'server'),
  case_exists_and_is_open: r('An open case', 'server'),
  case_open_and_purpose_matches: r('An open case whose purpose matches', 'server'),
  // ── Executive, finance, treasury, budget, tax (Part 2) ──
  requires_approved_fiscal_estimate: binding('Linked to an approved fiscal estimate', 'a register of approved fiscal estimates'),
  payee_type_allowed: binding('An eligible payee', 'a register of approved payees'),
  obligation_open_and_payable: binding('An approved, payable obligation', 'a register of approved obligations'),
  available_budget_covers_payment: binding('The allocation covers the payment', 'a register of budget allocations'),
  amount_matches_approved_obligation: binding('The amount matches the obligation', 'a register of approved obligations'),
  currency_matches_obligation: binding('The currency matches the obligation', 'a register of approved obligations'),
  purpose_matches_obligation: binding('The purpose matches the obligation', 'a register of approved obligations'),
  date_allowed_by_treasury_calendar: binding('A date the treasury calendar allows', 'the treasury payment calendar'),
  authorized_budget_submitter: binding('An authorised budget submitter', 'the budget submitters configured by the country'),
  budget_period_open: binding('An open budget period', 'the budget calendar'),
  ceiling_active_for_institution_and_period: binding('An approved ceiling for the institution and period', 'a register of budget ceilings'),
  programme_belongs_to_institution: binding('A programme of the institution', 'a register of programmes'),
  currency_matches_budget_period: binding('The budget period\'s currency', 'the budget parameters'),
  within_authorized_submission_bounds: binding('Within the submission bounds', 'the budget parameters'),
  approved_costing_complete: binding('A complete costing', 'a register of cost estimates'),
  approved_indicators_resolve: binding('Approved indicators and targets', 'a register of approved indicators (plan step I3)'),
  organisation_identity_consistent: r('Consistent with the organisation\'s record', 'server'),
  date_allowed_by_registration_rule: binding('A date the registration rule allows', 'the tax registration rules'),
  address_satisfies_service_policy: binding('An address the service policy allows', 'the address policy of the service'),
  obligations_available_for_taxpayer_type: binding('Obligations open to the taxpayer type', 'tax obligations per taxpayer type'),
  taxpayer_active_for_period: r('A taxpayer account active for the period', 'server'),
  tax_type_registered_for_account: r('A tax type the account is registered for', 'server'),
  filing_period_valid_for_tax_type: binding('A filing period of the tax type', 'filing periods per tax type'),
  filing_window_status_resolved: binding('The filing window is resolved', 'filing windows from the approved rules'),
  approved_tax_return_schema_active: binding('An approved return schema in force', 'return schemas per tax type'),
  all_schema_fields_valid: binding('Every field of the return schema is valid', 'return schemas per tax type'),
  tax_calculation_rule_version_bound: r('Bound to the calculation rule version', 'server'),
  inspection_power_valid_for_scope: binding('The inspection power covers the scope', 'inspection powers and scopes'),
  location_within_authorized_scope: binding('Within the authorised scope', 'inspection scopes'),
  approved_checklist_version: binding('An approved checklist version', 'approved inspection checklists'),
  evidence_chain_complete: binding('The evidence chain of custody is complete', 'an evidence-custody register (acceptance P3-04, plan I11)'),
  // ── Customs, procurement, exchange (Part 3) ──
  actor_authorized_for_customs_declaration: binding('An authorised customs declarant', 'a register of authorised declarants'),
  declarant_identity_resolves: r('The declarant is in the organisations register', 'server'),
  party_record_valid_for_customs: binding('A trade party record valid for customs', 'a register of trade parties'),
  external_party_record_complete: binding('A complete external party record', 'a register of trade parties'),
  transport_document_matches_consignment: binding('The transport document matches the consignment', 'transport document records'),
  customs_procedure_code_active: binding('An active customs procedure code', 'the customs procedure codes'),
  origin_evidence_rule_applied: binding('The origin evidence rule applied', 'origin rules'),
  customs_goods_schema_complete: r('Every goods line complete', 'client'),
  commodity_classification_active: r('A classification in the approved tariff', 'server'),
  invoice_matches_declared_goods: binding('The invoice matches the declared goods', 'trade document records'),
  value_basis_allowed_for_procedure: binding('A value basis the procedure allows', 'valuation rules'),
  currency_and_conversion_rule_resolved: binding('The currency and conversion rule resolved', 'approved exchange-rate rules'),
  actor_authorized_for_procurement: binding('An authorised procurement official', 'procuring entities and their officials (plan I5)'),
  procurement_period_open: binding('An open procurement planning period', 'the procurement calendar (plan I5)'),
  procurement_category_active: binding('An active procurement category', 'procurement categories (plan I5)'),
  estimate_basis_recorded: r('The basis of the estimate is recorded', 'client'),
  allocation_valid_for_planned_period: binding('An allocation valid for the period', 'a register of budget allocations'),
  procurement_method_available: binding('A procurement method available for the value', 'procurement methods and thresholds (plan I5)'),
  required_if_method_needs_justification: binding('Justified when the method requires it', 'procurement methods needing justification'),
  planned_dates_follow_procurement_calendar: binding('Dates follow the procurement calendar', 'the procurement calendar'),
  contract_active_or_variation_eligible: binding('An active contract open to variation', 'a contracts register (plan I5)'),
  party_authorized_to_request_variation: binding('A party who may request a variation', 'contract parties'),
  variation_type_allowed_for_contract: binding('A variation type the contract allows', 'variation types'),
  contract_terms_version_is_current: binding('The current terms version', 'contract terms'),
  proposed_change_diff_is_recorded: r('The proposed change is recorded against the current terms', 'client'),
  value_change_calculated_from_proposed_terms: r('Calculated from the proposed terms', 'system'),
  variation_has_approved_legal_authority: r('Cites approved legal authority', 'server'),
  actor_authorized_for_exchange: r('An official allowed to request the exchange', 'server'),
  approved_relationship_exists: binding('An approved relationship between the institutions', 'the relationship register\'s exchange bindings (plan I9)'),
  recipient_authorized_for_data: binding('The recipient may receive the data', 'exchange permissions per recipient'),
  purpose_authorized_for_relationship: binding('A purpose the relationship allows', 'the relationship register\'s exchange purposes (plan I9)'),
  identifier_valid_for_target_registry: binding('An identifier valid for the target register', 'target register identifier formats'),
  lawful_basis_covers_data_and_purpose: binding('The lawful basis covers the data and purpose', 'exchange purposes with their legal basis (plan I9)'),
  attributes_minimized_and_allowed: binding('Only the allowed attributes', 'approved attribute sets per exchange (plan I9)'),
  // ── Health regulation (field series Part 6, catalogue contracts batch 1): values the nation's law decides, shipped unset ──
  corrective_action_period_from_rule: binding('Within the period the rules allow for the corrective action', 'the periods for corrective action set by the nation (CFG-LIC-002); shipped unset'),
  renewal_window_from_rule: binding('Within the renewal window', 'the licence or registration period and when renewal opens, set by the nation (CFG-LIC-001, CFG-LIC-002); shipped unset'),
  continuing_education_requirement_from_rule: binding('Meets the continuing-education requirement', 'the continuing-education requirement (hours or points per cycle) of each profession, set by the nation (CFG-LIC-001); shipped unset'),
  reporting_period_from_programme: binding('A reporting period of the programme', 'the reporting programmes with their periods and deadlines, set by the nation (CFG-PH-001); none ship'),
  small_cell_suppression_from_policy: binding('Small counts protected before publication or exchange', 'the small-cell suppression threshold, set by the nation (CFG-DAT-001); shipped unset'),
  // ── Medicines and medical devices regulation (field series Part 6 §5, catalogue contracts batch 2): classifications and values the nation's law decides, none shipped ──
  classification_value_from_configured_standard: binding('A value of the classification the nation adopted', 'the classification the nation configures from the standard it adopts (CFG-MED-001, CFG-MED-003: for example WHO ATC, EDQM Standard Terms, IMDRF risk classes, GMDN, the controlled-substance schedules, good-practice standards); none ships'),
  information_response_period_from_rule: binding('Within the period allowed to answer a request for information', 'the period an applicant has to answer a request for information, set by the nation (CFG-MED-002); shipped unset'),
  authorisation_validity_from_rule: binding('Within the validity the law allows', 'how long a marketing, import or controlled-medicine authorisation is valid, set by the nation (CFG-MED-002, CFG-MED-003); shipped unset'),
  product_renewal_window_from_rule: binding('Within the renewal window of the authorisation', 'whether marketing authorisations are renewed, their validity and when renewal opens, set by the nation (CFG-MED-002); shipped unset'),
  inspection_corrective_action_period_from_rule: binding('Within the period allowed to correct the deficiency', 'the periods within which each grade of good-practice deficiency must be corrected, set by the nation (CFG-MED-003); shipped unset'),
  recall_timeline_from_rule: binding('Within the time the recall class allows', 'the recall classes and how soon a recall of each class must reach each level and be reported complete, set by the nation (CFG-MED-003); none ship'),
  safety_report_deadline_from_rule: binding('Reported within the time the law sets', 'the time within which an authorisation holder, manufacturer or importer must report a safety concern or device incident, set by the nation (CFG-MED-003); shipped unset'),
  controlled_quantity_limit_from_rule: binding('Within the quantities the nation may authorise', 'the quantities of each controlled substance the nation may authorise in a period, under its controlled-substances law (CFG-MED-003); none ship'),
  review_request_period_from_rule: binding('Asked for within the period the law allows', 'the period within which a reconsideration or appeal of a regulatory decision may be asked for, set by the nation; shipped unset'),
  // ── Taxpayer registration and account (field series Part 2 §2.6, catalogue contracts batch 3): values the nation's tax law decides, none shipped ──
  registration_obligation_from_rule: binding('Registration required or allowed under the rule', 'who must or may register for each tax and from when: the registration thresholds and obligation triggers, set by the nation (country.tax.registration); none ship'),
  obligation_effective_date_from_rule: binding('From a date the rule allows', 'when an added, cancelled, suspended or reactivated tax obligation takes effect, set by the nation (country.tax.registration); none ship'),
  obligation_cancellation_allowed_by_rule: binding('A cancellation the rule allows', 'the grounds and conditions on which a tax obligation may be cancelled, set by the nation (country.tax.registration); none ship'),
  suspension_allowed_by_rule: binding('A suspension national law permits', 'whether national law permits a tax registration to be suspended, on which grounds and for how long (country.tax.registration); none ships'),
  withdrawal_allowed_by_rule: binding('A withdrawal the procedure permits', 'whether and until which stage a pending registration application may be withdrawn (country.tax.registration); none ships'),
  tax_office_assignment_from_rule: binding('A tax office the assignment rules allow', 'the responsible tax offices and the rules assigning taxpayers to them (country.tax.registration); none ship'),
  tax_information_response_period_from_rule: binding('Within the period allowed to answer', 'the period a registration applicant has to answer a request for further information, set by the nation (country.tax.registration); shipped unset'),
  dispute_period_from_rule: binding('Lodged within the period the law allows', 'the period to object to or appeal a tax decision, counted from the legally relevant event date, and the powers to extend it (country.tax.disputes); shipped unset'),
  certificate_validity_from_rule: binding('Within the validity the law gives a certificate', 'whether a taxpayer registration certificate has a validity period and how long (country.tax.registration); shipped unset'),
  // ── The specification's own validations (loaded from its form contracts) ──
  verify_with_service: r('Checked with an exchange service where the law allows', 'server'),
  configured_profile: binding('Checked against the country\'s configuration', 'the configuration the rule names'),
  // ── The shared envelope standard's rule ids (supplement §1, contracts 05–13) ──
  'REF-EXISTS': r('A record in the register the reference points into', 'server'),
  'REF-ACTIVE': r('An active record in that register', 'server'),
  NONNEGATIVE: r('Not below zero', 'client'),
  'APPROVER-DIFFERS-FROM-MAKER': r('The approver is not the maker', 'client', { params: ['fields'] }),
  'SEPARATION-OF-DUTIES': r('The approver is neither the preparer nor the reviewer', 'client', { params: ['fields'] }),
  'PERSON-DIFFERS-FROM-REVIEWER': r('The confirmer is not the reviewer', 'client', { params: ['fields'] }),
  'PERSON-DIFFERS-FROM-PROPOSER': r('The approver is not the proposer', 'client', { params: ['fields'] }),
};

/** The answers a "differs from" rule compares with, unless the rule names them (`fields`). */
export const DIFFERS_FROM: Record<string, string[]> = {
  'APPROVER-DIFFERS-FROM-MAKER': ['maker_id'],
  'SEPARATION-OF-DUTIES': ['prepared_by_id', 'reviewed_by_id'],
  'PERSON-DIFFERS-FROM-REVIEWER': ['reviewer_id'],
  'PERSON-DIFFERS-FROM-PROPOSER': ['release_proposer_id'],
};

export const isRegisteredRule = (name: string): boolean => Object.prototype.hasOwnProperty.call(RULE_REGISTRY, name);

/** The rules a contract names that are not registered (they fail closed). */
export function unregisteredRules(names: string[]): string[] {
  return [...new Set(names.filter(n => !isRegisteredRule(n)))];
}
