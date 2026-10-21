// The sixteen form contracts of the specification
// (docs/INSTITUTIONAL_ARCHITECTURE_SPEC.md), each loaded from its JSON as the
// specification records it (./spec/*.json, compared with the specification
// by spec-conformance.test.ts) and improved by an overlay that only adds:
// plain-language wording and hints, building blocks, the proposed values of
// the lists the nation configures (marked proposed: checked against the
// nation's law before the procedure is approved), stricter rules, and the
// keys the procedure already uses. Nine attach to the reference procedures
// that exist (still drafts the nation approves); seven wait in the library
// for the sector step that builds their service (plan §5, I5–I7). Every
// deviation is listed with its reason (docs/FORMS_CONFORMANCE.md).

import { buildForm, type LibraryForm, type Overlay } from './build';
import { IDENTITY_EVIDENCE, standardNotices } from '../blocks';
import type { ContractField, FormSpec } from '../contract';
import type { SpecFormJson } from '../spec-import';
import taxpayer from './spec/taxpayer-registration-v1.json';
import customs from './spec/customs-declaration-v1.json';
import investment from './spec/investment-facilitation-v1.json';
import procurement from './spec/procurement-plan-item-v1.json';
import birth from './spec/crvs.birth-registration.json';
import facility from './spec/health.facility-registration.json';
import school from './spec/education.school-registration.json';
import residence from './spec/immigration.residence-permit.json';
import labour from './spec/labour.workplace-complaint.json';
import benefit from './spec/social-protection.benefit-application.json';
import agriculture from './spec/agriculture.support-application.json';
import water from './spec/water.abstraction-permit.json';
import professional from './spec/professional-licensing.initial-application.json';
import court from './spec/judiciary.case-filing.json';
import police from './spec/police.incident-report.json';
import land from './spec/land.register-interest-transfer.json';

const list = (values: [string, string][], proposed = true): NonNullable<FormSpec['lists']>[string] => ({ values: values.map(([value, label]) => ({ value, label })), ...(proposed ? { proposed: true } : {}) });
const CHANNELS: FormSpec['channels'] = {
  selfService: 'Answer one question at a time. Your answers are saved on this device as you go, so you can come back later. You get a reference as soon as it is sent.',
  assisted: 'An official fills in the same form with you at an office, records which identity document they saw (never its number) and gives you a receipt with your reference.',
  paper: 'The printed form asks the same questions. An official types it in from the paper; the case records that it came on paper and who transcribed it.',
  lowConnectivity: 'If the connection drops, the answers stay on the device. Sending again never makes a second application: the platform recognises it and gives the same reference.',
};
const common = (institution: string, next?: string): Pick<Overlay, 'notices' | 'channels' | 'identityEvidence'> => ({ notices: standardNotices({ institution, ...(next ? { next } : {}) }), channels: CHANNELS, identityEvidence: IDENTITY_EVIDENCE });
const SIGNED = 'Signed: confirmed by the applicant once identified (signed in, or identified by an official at an office). A cryptographic signature of the declaration is not captured yet (docs/INTEGRATION_REGISTER.md).';

// ── Part 1: executive, finance, revenue and economic institutions ─────────────

const TAXPAYER: Overlay = {
  title: 'Taxpayer registration', owner: 'tax', attachesTo: 'tax.registration', version: '1.0',
  intro: 'Register a person or an organisation with the tax authority, for the taxes they must pay. You will need the applicant\'s identifier or registration number, an address and, if you act for someone else, evidence of your authority.',
  ...common('The tax authority', 'You get a reference straight away. The tax authority checks the identity and registration details; once registered you receive a taxpayer identification number (TIN) and a certificate, or a refusal with its reasons.'),
  evidencePolicy: 'tax-registration-evidence-1',
  lists: {
    approved_taxpayer_types: list([['individual', 'An individual'], ['sole-proprietor', 'A sole proprietor'], ['company', 'A company'], ['partnership', 'A partnership'], ['trust', 'A trust'], ['cooperative', 'A cooperative'], ['non-profit', 'A non-profit organisation'], ['public-body', 'A public body']]),
    approved_tax_type_register: list([['income', 'Income tax'], ['corporate', 'Corporate income tax'], ['vat', 'Value added tax'], ['paye', 'Employer withholding (pay as you earn)'], ['withholding', 'Other withholding tax'], ['excise', 'Excise duty'], ['property', 'Property tax']]),
  },
  fields: {
    applicant_type: { label: 'What kind of taxpayer are you registering?', section: 'The taxpayer' },
    national_identifier: { label: 'National identity or birth registration number', hint: 'If the law lets the taxpayer register without one, leave it empty.', identifier: { scheme: 'Birth registration number' }, section: 'The taxpayer', rules: [{ rule: 'length', max: 40 }] },
    organisation_id: { label: 'Organisation registration number', hint: 'For an organisation: its number in the organisations register, or the reference of its registration application still open.', section: 'The taxpayer', rules: [{ rule: 'pattern', pattern: 'register-reference' }] },
    legal_name: { key: 'partyName', label: 'Legal name', hint: 'The name exactly as it is registered, in each official language you use.', section: 'The taxpayer' },
    tax_types_requested: { key: 'taxTypes', label: 'Which taxes are you registering for?', hint: 'Select all that apply.', acceptsText: true, section: 'Taxes' },
    business_address: { key: 'businessAddress', label: 'Business address', section: 'Address and contact' },
    contact_channel: { label: 'How should the tax authority contact you?', section: 'Address and contact' },
    acting_capacity: { label: 'Are you applying for the taxpayer yourself, or for them?', section: 'Who is applying' },
    representation_evidence: { label: 'Evidence of your authority to act for the taxpayer', section: 'Who is applying' },
    declaration: { label: 'Declaration', attestation: { version: '1', signature: true, statements: [{ key: 'true', text: 'The information in this application is true and complete.' }, { key: 'changes', text: 'I will tell the tax authority of any change to it within the time the law sets.' }] } },
  },
  documents: [{ class: 'representation-evidence', label: 'Evidence of authority to act (power of attorney, appointment or mandate)', required: false, purpose: 'Shows that the person applying may act for the taxpayer.', formats: ['PDF', 'JPEG', 'paper original'] }],
  deviations: [
    { field: 'declaration', what: 'valid_signature_and_versioned_text', why: SIGNED },
    { field: 'national_identifier', what: 'verify_with_authorized_identity_service_if_lawful', why: 'Checked with person.verify only once the nation cites, in the procedure, the provision that allows it; until then the check is recorded on the case as not performed.' },
    { field: 'contact_channel', what: 'verified_channel', why: 'No contact-verification service is connected yet: the channel is recorded as given and marked not verified on the case (docs/INTEGRATION_REGISTER.md).' },
  ],
};

const GOODS_ITEMS: ContractField[] = [
  { key: 'code', label: 'Tariff classification code', type: 'text', required: true, rules: [{ rule: 'pattern', pattern: 'digits' }, { rule: 'length', min: 4, max: 10 }], hint: 'The code in the national tariff (and its version), digits only.' },
  { key: 'description', label: 'Goods description', type: 'text', required: true, rules: [{ rule: 'length', min: 2, max: 300 }] },
  { key: 'origin', label: 'Country of origin', type: 'enum', required: true, valuesSource: { kind: 'register', register: 'countries' } },
  { key: 'quantity', label: 'Quantity and unit', type: 'quantity', required: true, units: ['kg', 'tonne', 'litre', 'unit', 'pair', 'm', 'm2', 'm3'] },
  { key: 'value', label: 'Customs value', type: 'money', required: true, hint: 'In the currency of the declaration.' },
];
export { GOODS_ITEMS };

const CUSTOMS: Overlay = {
  title: 'Goods declaration', owner: 'customs', attachesTo: 'customs.declaration', version: '1.0',
  intro: 'Declare goods you import, export or move in transit. The declarant must be a registered organisation acting with authority. Duty is calculated only by the approved tariff; you never type an amount of duty.',
  ...common('The customs authority', 'You get a reference straight away. Customs checks the declaration, chooses the controls (an officer\'s choice, with reasons), assesses the duty with the approved tariff and tells you when the goods may be released.'),
  evidencePolicy: 'customs-declaration-evidence-1',
  lists: { approved_customs_procedure_codes: list([['import-home-use', 'Import for home use'], ['export', 'Export'], ['transit', 'Transit'], ['temporary-admission', 'Temporary admission'], ['customs-warehouse', 'Customs warehousing'], ['re-export', 'Re-export']]) },
  fields: {
    declarant_organisation_id: { label: 'Declarant\'s organisation registration number', hint: 'The organisation that makes the declaration, as in the organisations register.', rules: [{ rule: 'pattern', pattern: 'register-reference' }], section: 'The declarant' },
    declaration_type: { label: 'Customs procedure', section: 'The shipment' },
    consignment_reference: { label: 'Consignment reference', hint: 'Your own unique reference for this consignment.', rules: [{ rule: 'length', min: 2, max: 60 }], section: 'The shipment' },
    transport_document_reference: { key: 'transportRef', label: 'Transport document number', hint: 'Bill of lading, air waybill or consignment note number.', section: 'The shipment' },
    origin_country_code: { key: 'originCountry', label: 'Country the goods come from', section: 'The shipment' },
    goods_lines: { key: 'goods', label: 'Goods', items: GOODS_ITEMS, textLines: true, section: 'Goods' },
    currency_code: { key: 'currency', label: 'Currency of the values', section: 'Goods' },
    supporting_documents: { label: 'Supporting documents (invoice, transport document, licences)', evidence: 'commercial-invoice', section: 'Documents' },
    declarant_attestation: { label: 'Declaration by the declarant', attestation: { version: '1', signature: true, statements: [{ key: 'true', text: 'The particulars in this declaration are true and complete.' }, { key: 'authority', text: 'I am authorised to make this declaration for the declarant.' }] } },
  },
  documents: [{ class: 'commercial-invoice', label: 'Commercial invoice', required: true, purpose: 'The basis of the customs value.', formats: ['PDF', 'JPEG'] }],
  deviations: [
    { field: 'declarant_attestation', what: 'valid_signature_and_authorized_signer', why: `${SIGNED} The signer's authority is checked by an official until the organisation's authorised representatives are recorded (profile authorised-representation).` },
    { field: 'transport_document_reference', what: 'transport_document_profile', why: 'Checked against the document-reference pattern; the country\'s transport-document profile is recorded as not performed until configured.' },
    { field: 'goods_lines', what: 'customs_goods_line elements', why: 'Each line has the classification code, description, origin, quantity with unit and customs value. Gross and net mass, valuation method and calculated duty components are added by officials at the steps (duty only from the approved tariff); the WCO Data Model mapping is the country\'s step.' },
  ],
};

const INVESTMENT: Overlay = {
  title: 'Investment facilitation request', owner: 'investment', awaits: 'I5 (economic group: trade and investment support)', version: '1.0',
  intro: 'Ask for help with an investment project: permits, land, utilities or introductions to other agencies. We collect only what the service needs.',
  ...common('The investment authority'),
  lists: {
    national_industry_classification_mapping: list([['agriculture', 'Agriculture, forestry and fishing'], ['mining', 'Mining and quarrying'], ['manufacturing', 'Manufacturing'], ['energy', 'Electricity, gas and water'], ['construction', 'Construction'], ['trade', 'Wholesale and retail trade'], ['transport', 'Transport and storage'], ['ict', 'Information and communication'], ['finance', 'Financial services'], ['tourism', 'Accommodation and tourism'], ['health', 'Health'], ['education', 'Education'], ['other', 'Other']]),
    published_investor_services: list([['permits', 'Help with permits and licences'], ['land', 'Help finding land or premises'], ['utilities', 'Connections to power, water or telecoms'], ['incentives', 'Information on incentives'], ['introductions', 'Introductions to agencies'], ['aftercare', 'Aftercare for an operating investment']]),
  },
  fields: {
    applicant_organisation_id: { label: 'Your organisation\'s registration number', section: 'The investor' },
    project_name: { label: 'Project name', section: 'The project' },
    project_sector: { label: 'Sector', section: 'The project' },
    project_location: { label: 'Where is the project?', hint: 'A region, a registered site, or a position on the map.', section: 'The project' },
    project_stage: { label: 'Stage of the project', section: 'The project' },
    support_requested: { label: 'What help do you need?', hint: 'Select all that apply.', section: 'Support' },
    requested_agencies: { label: 'Agencies you need to deal with (if you know)', section: 'Support' },
    supporting_documents: { label: 'Supporting documents (project summary, plans)', section: 'Documents' },
  },
  deviations: [{ field: 'applicant_organisation_id', what: 'verify_existing_organization_or_approved_exception', why: 'Stricter: an organisation that is not in the register is refused until the investment authority has an approved exception procedure.' }],
};

const PROCUREMENT: Overlay = {
  title: 'Procurement plan item', owner: 'procurement', awaits: 'I5 (economic group: procurement planning to award)', version: '1.0',
  intro: 'Record a planned procurement in the procuring entity\'s plan. Methods, thresholds and timetables come from the national configuration; the value is an estimate in the nation\'s currency.',
  ...common('The procuring entity'),
  lists: {
    national_procurement_classification: list([['goods', 'Goods'], ['works', 'Works'], ['consulting', 'Consulting services'], ['non-consulting', 'Non-consulting services']]),
    approved_procurement_methods: list([['open', 'Open tender'], ['restricted', 'Restricted tender'], ['request-for-quotations', 'Request for quotations'], ['direct', 'Direct procurement (where the law allows)'], ['framework', 'Call-off under a framework agreement']]),
  },
  fields: {
    procuring_entity_id: { label: 'Procuring entity', section: 'The requirement' },
    requirement_description: { label: 'What is needed', hint: 'In plain words: what, how much and why.', section: 'The requirement' },
    procurement_category: { label: 'Category', section: 'The requirement' },
    budget_appropriation_id: { label: 'Budget appropriation reference', section: 'Funding' },
    estimated_value: { label: 'Estimated value', section: 'Funding' },
    proposed_method: { label: 'Proposed procurement method', section: 'Method and timing' },
    planned_publication_date: { label: 'Planned publication date', section: 'Method and timing', rules: [{ rule: 'notBefore', than: 'today' }] },
    conflict_declaration: { label: 'Declaration of conflicts of interest', attestation: { version: '1', signature: true, statements: [{ key: 'none', text: 'I have no conflict of interest in this procurement, or I have declared it to the procuring entity.' }] } },
    approvals: { label: 'Approvals (recorded by the officials who give them)' },
  },
  deviations: [
    { field: 'budget_appropriation_id', what: 'active_appropriation_with_sufficient_authority', why: 'There is no register of appropriations on the platform yet: the reference is recorded as given and the check is recorded as not performed (plan I5).' },
    { field: 'conflict_declaration', what: 'valid_signature_and_policy_version', why: SIGNED },
    { field: 'approvals', what: 'approval_evidence_collection', why: 'Approvals are the procedure\'s own two-official steps (lib/casework/dual-control-policy.ts); the field is completed by officials, never the requester.' },
  ],
};

// ── Part 2: civil registration, health, education, immigration, human services ─

const BIRTH: Overlay = {
  title: 'Birth registration', owner: 'civilRegistration', attachesTo: 'civil.birth', version: '1.0',
  intro: 'Register a birth. A parent or another informant can do it. You will need the birth notification from the health facility or a witness. No fee is shown here: any fee comes from the approved rule.',
  ...common('The civil registration authority', 'You get a reference straight away. The registrar checks the details and the birth notification; once the birth is registered you can receive a certificate of registration.'),
  evidencePolicy: 'birth-registration-evidence-1',
  fields: {
    child_name: { key: 'childGiven', label: 'Child\'s given names', hint: 'As the parents give them. If the child has no given name yet, write "not yet named".', section: 'The child', rules: [{ rule: 'length', min: 1, max: 120 }],
      also: [{ key: 'childFamily', label: 'Child\'s family name', type: 'text', required: true, specField: 'child_name', personalDataClass: 'personal', section: 'The child', hint: 'If your naming system has no family name, repeat the name the child will use.', rules: [{ rule: 'length', min: 1, max: 120 }] }] },
    date_of_birth: { key: 'birthDate', label: 'Date of birth', section: 'The child', personalDataClass: 'personal', rules: [{ rule: 'notAfter', than: 'today' }] },
    place_of_birth: { key: 'birthPlace', label: 'Where was the child born?', hint: 'The health facility (a registered site), the region, a position, or a description of the place.', acceptsText: true, personalDataClass: 'personal', section: 'The birth' },
    informant: { key: 'informantName', label: 'Who is telling us about the birth?', hint: 'The informant: a parent, or another person the law allows.', acceptsText: true, section: 'The informant' },
    evidence: { label: 'Birth notification', evidence: 'birth-notification', section: 'Evidence' },
    declaration: { label: 'Declaration by the informant', attestation: { version: '1', statements: [{ key: 'true', text: 'To the best of my knowledge the information I have given about this birth is true.' }] } },
  },
  documents: [{ class: 'birth-notification', label: 'Birth notification (from the health facility or a witness)', required: true, purpose: 'The evidence that the birth happened, where and when.', formats: ['PDF', 'JPEG', 'paper original'], alternative: 'A sworn statement by a witness to the birth, where the law allows it.' }],
  deviations: [],
};

const FACILITY: Overlay = {
  title: 'Health facility registration', owner: 'healthRegulation', attachesTo: 'health.facility', version: '1.0',
  intro: 'Apply to register and license a health facility. The operator must be a registered organisation. The form asks only about the facility: never about patients or treatment.',
  ...common('The health regulator', 'You get a reference straight away. The regulator checks the application, an inspector visits the premises, and a decision is made with its reasons, legal basis and how to ask for a review.'),
  evidencePolicy: 'health-facility-evidence-1',
  lists: {
    'health.facility-registration.facility_type': list([['hospital', 'Hospital'], ['health-centre', 'Health centre'], ['clinic', 'Clinic'], ['dispensary', 'Dispensary'], ['maternity', 'Maternity home'], ['laboratory', 'Medical laboratory'], ['imaging', 'Imaging centre'], ['dental', 'Dental practice'], ['other', 'Other']]),
    'health.facility-registration.services_offered': list([['outpatient', 'Outpatient care'], ['inpatient', 'Inpatient care'], ['maternity', 'Maternity and delivery'], ['emergency', 'Emergency care'], ['surgery', 'Surgery'], ['laboratory', 'Laboratory'], ['imaging', 'Imaging'], ['pharmacy', 'Pharmacy'], ['immunisation', 'Immunisation'], ['dental', 'Dental']]),
  },
  fields: {
    facility_name: { label: 'Facility name', section: 'The facility', rules: [{ rule: 'length', min: 2, max: 200 }] },
    facility_type: { label: 'Type of facility', section: 'The facility' },
    operator_reference: { key: 'organisation', type: 'registryReference', register: 'organisation', parties: undefined, label: 'Operator\'s organisation registration number', hint: 'The organisation that runs the facility, as in the organisations register.', section: 'The operator', rules: [{ rule: 'pattern', pattern: 'register-reference' }] },
    location: { label: 'Position of the facility', hint: 'Longitude and latitude, from a phone or the map. The region and district are worked out from the position.', section: 'The facility' },
    services_offered: { label: 'Services offered', hint: 'Select all that apply.', section: 'Services' },
    staffing_summary: { label: 'Staffing summary', hint: 'Numbers by profession (for example: 2 doctors, 6 nurses). No names, no patient information.', section: 'Services',
      items: [{ key: 'summary', label: 'Staff by profession', type: 'longtext', required: true, rules: [{ rule: 'length', max: 4000 }] }] },
    premises_evidence: { label: 'Evidence about the premises', evidence: 'premises-evidence', section: 'Evidence' },
  },
  documents: [{ class: 'premises-evidence', label: 'Evidence of the premises', required: true, purpose: 'Shows the premises are lawfully held and fit for the services offered.', formats: ['PDF', 'JPEG', 'paper original'] }],
  deviations: [{ field: 'operator_reference', what: 'organisation_reference carried as a register reference', why: 'The operator must be in the organisations register (stricter than a named party), so the licence\'s existing register effects keep working.' }],
};

const SCHOOL: Overlay = {
  title: 'School registration', owner: 'education', attachesTo: 'edu.school', version: '1.0',
  intro: 'Apply to register a school. The operator must be a registered organisation. No student records are asked for.',
  ...common('The education authority', 'You get a reference straight away. An inspector checks the premises; the decision states the levels the school may teach, the law it rests on and how to appeal.'),
  evidencePolicy: 'school-registration-evidence-1',
  lists: {
    'education.school-registration.school_levels': list([['pre-primary', 'Pre-primary'], ['primary', 'Primary'], ['lower-secondary', 'Lower secondary'], ['upper-secondary', 'Upper secondary'], ['technical', 'Technical and vocational'], ['special-needs', 'Special needs']]),
    'education.school-registration.facilities': list([['classrooms', 'Classrooms'], ['water', 'Safe drinking water'], ['sanitation', 'Separate toilets'], ['electricity', 'Electricity'], ['library', 'Library'], ['laboratory', 'Laboratory'], ['playground', 'Play area'], ['accessibility', 'Step-free access']]),
  },
  fields: {
    school_name: { label: 'School name', section: 'The school', rules: [{ rule: 'length', min: 2, max: 200 }] },
    operator: { key: 'organisation', type: 'registryReference', register: 'organisation', parties: undefined, label: 'Operator\'s organisation registration number', section: 'The operator', rules: [{ rule: 'pattern', pattern: 'register-reference' }] },
    school_levels: { label: 'Levels the school will teach', hint: 'Select all that apply.', section: 'The school' },
    location: { label: 'Where is the school?', section: 'The school' },
    facilities: { label: 'Facilities the school has', hint: 'Select all that apply.', section: 'Premises' },
    staffing: { label: 'Staffing', hint: 'Numbers of teachers by level. No names.', section: 'Premises', items: [{ key: 'summary', label: 'Teachers by level', type: 'longtext', required: true, rules: [{ rule: 'length', max: 4000 }] }] },
    supporting_documents: { label: 'Supporting documents (premises, ownership)', evidence: 'premises-evidence', section: 'Evidence' },
  },
  documents: [{ class: 'premises-evidence', label: 'Evidence of the premises and ownership', required: true, purpose: 'Shows who owns or holds the premises and that they are fit for teaching.', formats: ['PDF', 'JPEG', 'paper original'] }],
  deviations: [{ field: 'operator', what: 'organisation_reference carried as a register reference', why: 'The operator must be in the organisations register, so the licence\'s existing register effects keep working.' }],
};

const RESIDENCE: Overlay = {
  title: 'Residence permit application', owner: 'immigration', attachesTo: 'immigration.residence-permit', version: '1.0',
  intro: 'Apply for a residence permit. You will need your travel document and evidence for the category you apply under. No risk score is calculated; every decision is made by an authorised official.',
  ...common('The immigration authority', 'You get a reference straight away. An official checks your documents and eligibility; the decision states its legal basis and how to ask for a review.'),
  evidencePolicy: 'residence-permit-evidence-1',
  lists: { configured_permit_type: list([['work', 'Work'], ['study', 'Study'], ['family', 'Family'], ['investment', 'Investment'], ['retirement', 'Retirement'], ['long-term', 'Long-term residence'], ['other', 'Other']]) },
  fields: {
    applicant_reference: { key: 'holderName', label: 'Applicant (name as in the travel document)', acceptsText: true, section: 'The applicant' },
    permit_category: { key: 'category', label: 'Category of permit', section: 'The application' },
    travel_document: { label: 'Copy of the travel document', evidence: 'travel-document', section: 'Documents' },
    requested_validity: { label: 'Period you are asking for', section: 'The application', rules: [{ rule: 'notBefore', than: 'today' }] },
    purpose_and_basis: { label: 'Purpose and ground of the application', section: 'The application',
      items: [{ key: 'ground', label: 'The ground you apply under (as the law names it)', type: 'text', required: true, rules: [{ rule: 'length', max: 300 }] }, { key: 'facts', label: 'Why you meet it', type: 'longtext', required: true, rules: [{ rule: 'length', max: 8000 }] }] },
    supporting_evidence: { label: 'Evidence of eligibility (contract, enrolment, family relationship, means)', evidence: 'eligibility-evidence', section: 'Documents' },
    fee_reference: { label: 'Fee', section: 'Fee' },
  },
  documents: [
    { class: 'travel-document', label: 'Copy of the travel document', required: true, purpose: 'Shows who you are and your nationality.', formats: ['PDF', 'JPEG'] },
    { class: 'eligibility-evidence', label: 'Evidence of eligibility', required: true, purpose: 'Shows you meet the category you apply under.', formats: ['PDF', 'JPEG', 'paper original'] },
  ],
  deviations: [{ field: 'applicant_reference', what: 'person_reference carried as a named party', why: 'Applicants are usually not in the civil register; the name is as in the travel document and the document number is a separate field.' }],
};

const LABOUR: Overlay = {
  title: 'Workplace complaint', owner: 'labour', awaits: 'I6 (human services: labour complaints and inspection)', version: '1.0',
  intro: 'Tell the labour inspectorate about a problem at a workplace. What you say is an allegation, not a finding: the inspectorate looks into it. You can ask for your identity to be kept confidential.',
  ...common('The labour inspectorate', 'You get a reference straight away. An inspector reads the complaint; they may contact you, visit the workplace, or refer it. The employer is not told who complained if you asked for confidentiality.'),
  lists: { 'labour.workplace-complaint.issue_category': list([['wages', 'Wages not paid or underpaid'], ['hours', 'Working hours or rest'], ['safety', 'Health and safety'], ['contract', 'No contract or unfair terms'], ['discrimination', 'Discrimination or harassment'], ['child-labour', 'Child labour'], ['forced-labour', 'Forced labour'], ['dismissal', 'Unfair dismissal'], ['other', 'Something else']]) },
  fields: {
    workplace_reference: { label: 'Which workplace?', section: 'The workplace' },
    issue_category: { label: 'What is the problem about?', section: 'The problem' },
    incident_period: { label: 'When did it happen?', hint: 'A date, or the first and last dates if it went on for a while.', section: 'The problem', rules: [{ rule: 'notAfter', than: 'today' }] },
    description: { label: 'What happened', hint: 'In your own words. Do not include anyone\'s health information.', section: 'The problem', rules: [{ rule: 'length', min: 10, max: 20000 }] },
    evidence: { label: 'Evidence (payslips, messages, photos)', section: 'Evidence' },
    contact_preference: { label: 'How should the inspector contact you?', section: 'You' },
    confidentiality_request: { label: 'Keep my identity confidential from the employer', section: 'You' },
  },
  deviations: [],
};

const BENEFIT: Overlay = {
  title: 'Benefit application', owner: 'socialProtection', awaits: 'I6 (human services: social protection claims)', version: '1.0',
  intro: 'Apply for a benefit programme. Each programme asks only for the evidence its rules need. The amount is calculated by the programme\'s approved rules, never typed in, and a person makes the decision.',
  ...common('The social protection agency'),
  lists: {
    configured_benefit_programme: list([]),
    approved_payment_method: list([['bank', 'Bank account'], ['mobile-money', 'Mobile money'], ['collect', 'Collect in person']]),
  },
  fields: {
    applicant_reference: { label: 'Applicant', section: 'You' },
    programme: { label: 'Which programme are you applying for?', hint: 'Only programmes the nation has approved are listed.', section: 'The programme' },
    household_information: { label: 'Your household', hint: 'Only what the programme\'s rules ask for.', section: 'Household' },
    income_or_resource_evidence: { label: 'Evidence of income or resources (if the programme asks)', section: 'Evidence' },
    other_eligibility_evidence: { label: 'Evidence that you are eligible', section: 'Evidence' },
    payment_preference: { label: 'How would you like to be paid?', section: 'Payment' },
    declaration: { label: 'Declaration', attestation: { version: '1', statements: [{ key: 'true', text: 'The information I have given is true and complete.' }, { key: 'changes', text: 'I will report changes in my circumstances.' }] } },
  },
  deviations: [{ field: 'programme', what: 'configured_benefit_programme', why: 'Ships with no programmes: the nation approves its programmes with the procedure; until then the list reads "not connected".' }],
};

const AGRICULTURE: Overlay = {
  title: 'Farm support application', owner: 'agriculture', awaits: 'I6 (human services: agriculture subsidies)', version: '1.0',
  intro: 'Apply for support under an approved agricultural programme. Payments are made only after the treasury reconciles them.',
  ...common('The agriculture ministry'),
  lists: {
    configured_programme: list([]),
    'agriculture.support-application.eligible_activity': list([['crop', 'Crop production'], ['livestock', 'Livestock'], ['fisheries', 'Fisheries and aquaculture'], ['irrigation', 'Irrigation'], ['storage', 'Storage and processing'], ['inputs', 'Seed and fertiliser']]),
  },
  fields: {
    applicant_reference: { label: 'Applicant (farmer or farming organisation)', section: 'You' },
    farm_reference: { label: 'Farm record number', section: 'The farm' },
    programme: { label: 'Programme', section: 'The support' },
    production_period: { label: 'Production period', section: 'The support' },
    eligible_activity: { label: 'Activity', section: 'The support' },
    supporting_evidence: { label: 'Supporting evidence', section: 'Evidence' },
    payment_destination: { label: 'Account for payment', section: 'Payment' },
  },
  deviations: [{ field: 'farm_reference', what: 'farm_record_reference', why: 'There is no farm register on the platform yet: the reference is recorded as given and its check recorded as not performed (plan I6).' }],
};

const WATER: Overlay = {
  title: 'Water abstraction permit', owner: 'water', awaits: 'I6 (human services: water permits and inspection)', version: '1.0',
  intro: 'Apply for a permit to take water from a river, lake or borehole. The conditions of a permit are set by the authority and kept with each version.',
  ...common('The water resources authority'),
  lists: { 'water.abstraction-permit.intended_use': list([['domestic', 'Domestic'], ['irrigation', 'Irrigation'], ['livestock', 'Livestock'], ['industrial', 'Industrial'], ['municipal', 'Municipal supply'], ['energy', 'Power generation'], ['other', 'Other']]) },
  fields: {
    applicant: { label: 'Applicant', section: 'You' },
    water_source: { label: 'Water source reference', section: 'The source' },
    location: { label: 'Where the water is taken (a point, or the area or line on the map)', section: 'The source' },
    intended_use: { label: 'What the water is for', section: 'Use' },
    requested_quantity: { label: 'How much water', units: ['m3/day', 'm3/month', 'm3/year', 'litres/second'], section: 'Use' },
    requested_period: { label: 'For which period', section: 'Use' },
    technical_evidence: { label: 'Technical evidence (survey, yield test, drawings)', section: 'Evidence' },
  },
  deviations: [{ field: 'water_source', what: 'water_source_reference', why: 'There is no register of water sources on the platform yet: the reference is recorded as given and its check recorded as not performed (plan I6).' }],
};

const PROFESSIONAL: Overlay = {
  title: 'Registration in a regulated profession', owner: 'professionalRegulation', attachesTo: 'prof.registration', version: '1.0',
  intro: 'Apply to be registered in a regulated profession. Your qualifications are checked with the bodies that awarded them. Disciplinary information is kept separately and is never on this form.',
  ...common('The professional regulator'),
  evidencePolicy: 'professional-registration-evidence-1',
  lists: { configured_scope_category: list([['full', 'Full practice'], ['limited', 'Limited scope'], ['supervised', 'Supervised practice'], ['specialist', 'Specialist practice']]) },
  fields: {
    applicant_reference: { key: 'personRef', type: 'registryReference', register: 'person', parties: undefined, label: 'Your birth registration or national identity number', section: 'You', replaceRules: [{ rule: 'length', min: 2, max: 60 }] },
    profession: { label: 'Profession', section: 'Your profession' },
    qualification_records: { label: 'Qualifications', evidence: 'qualification-evidence', section: 'Qualifications' },
    issuing_institutions: { label: 'Institutions that awarded your qualifications', section: 'Qualifications' },
    practice_category: { label: 'Scope of practice', section: 'Your profession' },
    declarations: { label: 'Declarations', attestation: { version: '1', statements: [{ key: 'true', text: 'The information and documents I have given are true and complete.' }, { key: 'fitness', text: 'I have declared any matter that may affect my fitness to practise.' }, { key: 'notify', text: 'I will tell the regulator of any change.' }] } },
  },
  documents: [{ class: 'qualification-evidence', label: 'Evidence of qualifications', required: true, purpose: 'The regulator checks each qualification with the body that awarded it.', formats: ['PDF', 'JPEG', 'paper original'] }],
  deviations: [{ field: 'applicant_reference', what: 'person_reference carried as a register reference', why: 'The register of professionals keeps a person reference; it is checked when the registration is decided (prof.check).' }],
};

// ── Part 3: justice, police, land ─────────────────────────────────────────────

const COURT: Overlay = {
  title: 'Filing a case', owner: 'judiciary', attachesTo: 'court.case', version: '1.0',
  intro: 'File a case with the court. Cases are assigned by the judiciary and decided by a judge; no one outside the judiciary can change them. The public list of cases never shows the parties.',
  ...common('The court registry', 'You get a reference straight away. The registry reviews the filing; if it is accepted, the parties are served and a hearing is listed.'),
  lists: {
    configured_court_reference: list([]),
    configured_case_type: list([['civil', 'Civil'], ['commercial', 'Commercial'], ['family', 'Family'], ['administrative', 'Administrative'], ['labour', 'Labour'], ['criminal', 'Criminal'], ['other', 'Other']]),
  },
  fields: {
    court_jurisdiction: { label: 'Court', hint: 'The courts the judiciary has configured.', section: 'The court' },
    case_category: { key: 'caseType', label: 'Type of case', section: 'The court' },
    filing_party: { key: 'claimant', label: 'Who is filing (claimant or applicant)', acceptsText: true, section: 'The parties' },
    other_parties: { key: 'respondent', label: 'The other parties (respondent or accused)', acceptsText: true, section: 'The parties' },
    relief_sought: { key: 'summary', label: 'What you ask the court for, and why', section: 'The claim' },
    filing_documents: { label: 'Filing documents (the originating document and any annexes)', evidence: 'originating-document', section: 'Documents' },
    confidentiality_request: { label: 'Ask the court to keep this case confidential', section: 'The claim' },
  },
  documents: [{ class: 'originating-document', label: 'The originating document (claim, application or charge sheet)', required: true, purpose: 'Starts the case and states what is asked of the court.', formats: ['PDF'] }],
  deviations: [
    { field: 'court_jurisdiction', what: 'configured_court_reference', why: 'Ships with no courts: the judiciary configures them with the procedure; until then the list reads "not connected".' },
    { field: 'filing_documents', what: 'signed_document_collection', why: 'Documents are attached to the case with their hash; a signature on the documents themselves is checked by the registry until signature verification of uploaded documents is connected.' },
  ],
};

const POLICE: Overlay = {
  title: 'Incident report', owner: 'police', attachesTo: 'police.incident', version: '1.0',
  intro: 'Report something that has already happened. If someone is in danger now, call the emergency number. What you report is an account, not a finding about anyone.',
  ...common('The police service', 'You get a reference straight away. The police read the report, classify it under the law and decide what to do: record it, refer it to another institution, or investigate.'),
  lists: { configured_classification: list([['theft', 'Theft'], ['burglary', 'Burglary'], ['assault', 'Assault'], ['fraud', 'Fraud'], ['traffic', 'Traffic incident'], ['property-damage', 'Damage to property'], ['missing-person', 'Missing person'], ['domestic', 'Domestic incident'], ['public-order', 'Public order'], ['cybercrime', 'Online crime'], ['other', 'Something else']]) },
  fields: {
    incident_type: { key: 'category', label: 'What kind of incident was it?', hint: 'The police classify it formally under the law.', section: 'What happened' },
    reported_at: { label: 'When are you reporting it?', hint: 'Filled in for you: the date and time now.', section: 'What happened' },
    incident_location: { key: 'place', label: 'Where did it happen?', acceptsText: true, section: 'What happened' },
    reporting_source: { key: 'reportingParty', label: 'Who is reporting it?', acceptsText: true, section: 'You' },
    narrative: { key: 'account', label: 'What happened, in your own words', section: 'What happened' },
    persons_and_objects: { key: 'personsMentioned', label: 'People involved or who saw it', hint: 'Only what you know. This records only that you mentioned them; nothing is decided about anyone.', acceptsText: true, section: 'People and things' },
    evidence_items: { label: 'Photos, documents or other evidence', section: 'People and things' },
    response_actions: { label: 'Actions taken on receiving the report (intake and referral only)', audience: 'officer',
      items: [{ key: 'at', label: 'When', type: 'timestamp', required: true }, { key: 'action', label: 'What was done (recorded, referred, advice given)', type: 'text', required: true, rules: [{ rule: 'length', max: 300 }] }] },
  },
  add: [{ key: 'objectsMentioned', label: 'Things involved (vehicles, phones, property)', type: 'group', multiple: true, section: 'People and things', specField: 'persons_and_objects', personalDataClass: 'personal',
    items: [{ key: 'description', label: 'What it is', type: 'text', required: true, rules: [{ rule: 'length', max: 200 }] }, { key: 'identifier', label: 'Any number on it (plate, serial)', type: 'text', rules: [{ rule: 'length', max: 60 }] }] }],
  deviations: [
    { field: 'persons_and_objects', what: 'purpose_limited_reference_collection', why: 'Carried as people mentioned (never as suspects: the police module records no suspect and no finding, CLAUDE.md) and, separately, things involved. The purpose limit is the case\'s own access rules.' },
    { field: 'evidence_items', what: 'evidence custody (controls.evidence_custody_is_traceable)', why: 'Items are attached as documents of the case with their hash; a custody chain for physical evidence does not exist yet (acceptance P3-04, plan I11).' },
    { field: 'response_actions', what: 'event_collection', why: 'Limited to intake and referral actions, recorded by officers: the police module is intake and referral only (CLAUDE.md).' },
  ],
};

const LAND: Overlay = {
  title: 'Transfer of a registered interest in land', owner: 'landRegistry', awaits: 'I7 (territory: land transfers on the parcel register)', version: '1.0',
  intro: 'Apply to register a transfer of an interest in a registered parcel. The land registry keeps every registration as a new event; conflicts go to an authorised review.',
  ...common('The land registry'),
  lists: { configured_transaction_type: list([['sale', 'Sale'], ['gift', 'Gift'], ['inheritance', 'Inheritance'], ['lease', 'Lease'], ['mortgage', 'Mortgage or charge'], ['discharge', 'Discharge of a mortgage'], ['court-order', 'By court order']]) },
  fields: {
    parcel_reference: { label: 'Parcel number', section: 'The land' },
    current_interest_reference: { label: 'The registered interest being transferred', section: 'The land' },
    transaction_type: { label: 'Kind of transaction', section: 'The transaction' },
    transferring_parties: { label: 'Who is transferring', section: 'The parties' },
    receiving_parties: { label: 'Who is receiving', section: 'The parties' },
    legal_instrument: { label: 'The signed transfer instrument', section: 'Documents' },
    required_consents: { label: 'Consents the law requires (spouse, lender, authority)', section: 'Documents' },
  },
  deviations: [{ field: 'current_interest_reference', what: 'registered_interest_reference', why: 'Rights on a parcel are kept on the parcel record; a separate register of interests does not exist yet, so the reference is recorded as given and its check recorded as not performed (plan I7).' }],
};

const OVERLAYS: [SpecFormJson, Overlay][] = [
  [taxpayer as SpecFormJson, TAXPAYER], [customs as SpecFormJson, CUSTOMS], [investment as SpecFormJson, INVESTMENT], [procurement as SpecFormJson, PROCUREMENT],
  [birth as SpecFormJson, BIRTH], [facility as SpecFormJson, FACILITY], [school as SpecFormJson, SCHOOL], [residence as SpecFormJson, RESIDENCE],
  [labour as SpecFormJson, LABOUR], [benefit as SpecFormJson, BENEFIT], [agriculture as SpecFormJson, AGRICULTURE], [water as SpecFormJson, WATER],
  [professional as SpecFormJson, PROFESSIONAL], [court as SpecFormJson, COURT], [police as SpecFormJson, POLICE], [land as SpecFormJson, LAND],
];

/** The specification's sixteen forms, as library definitions. */
export const SPEC_LIBRARY: LibraryForm[] = OVERLAYS.map(([json, o]) => buildForm(json, o));

/** A library form by the specification's form id. */
export function libraryForm(specId: string): LibraryForm {
  const f = SPEC_LIBRARY.find(x => x.specId === specId);
  if (!f) throw new Error(`No library form ${specId}`);
  return structuredClone(f);
}
