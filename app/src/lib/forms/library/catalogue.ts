// The field series' contracts (docs/forms-catalogue/FIELD-SERIES-PARTS-*.md),
// loaded natively: the sixteen reusable field groups of Part 1 (core.person …
// core.legal_notices), each immutable by id and version, and every complete
// form contract the series gives in the canonical format (Part 2: Cabinet
// paper, payment instruction, budget bid, business tax registration,
// periodic tax return, tax inspection checklist; Part 3: import declaration,
// procurement plan item, contract variation, customs permit verification).
// The JSON files are the documents' blocks, verbatim (spec-conformance.test.ts
// compares them). Forms here are library drafts: the sector step that builds
// each service attaches it to a procedure package two officials approve.
// The standard values sources of Part 1 §1.3 resolve here.

import { importCanonicalForm, importFieldGroup, type CanonicalForm, type CanonicalGroup, type FieldGroup, type CanonicalDefinition, type CanonicalNote } from '../canonical';
import gPerson from './canonical/groups/core.person.v1.json';
import gBirthDate from './canonical/groups/core.birth_date.v1.json';
import gAddress from './canonical/groups/core.address.v1.json';
import gContact from './canonical/groups/core.contact.v1.json';
import gOrganisation from './canonical/groups/core.organisation.v1.json';
import gRepresentation from './canonical/groups/core.representation.v1.json';
import gIdentity from './canonical/groups/core.identity_evidence_seen.v1.json';
import gDeclaration from './canonical/groups/core.declaration_signature.v1.json';
import gConsent from './canonical/groups/core.consent.v1.json';
import gPayment from './canonical/groups/core.payment.v1.json';
import gEvidence from './canonical/groups/core.evidence_upload.v1.json';
import gPayout from './canonical/groups/core.payout_account.v1.json';
import gNationality from './canonical/groups/core.nationality_residence.v1.json';
import gAccessibility from './canonical/groups/core.accessibility_needs.v1.json';
import gLanguage from './canonical/groups/core.language_preference.v1.json';
import gNotices from './canonical/groups/core.legal_notices.v1.json';
import fCabinet from './canonical/forms/exec.cabinet.paper.submit.json';
import fPayment from './canonical/forms/treasury.payment.instruction.json';
import fBudget from './canonical/forms/budget.bid.submit.json';
import fTaxpayer from './canonical/forms/taxpayer.registration.business.json';
import fReturn from './canonical/forms/tax.return.periodic.submit.json';
import fInspection from './canonical/forms/tax.compliance.inspection_checklist.json';
import fImport from './canonical/forms/customs.import.declaration.submit.json';
import fPlanItem from './canonical/forms/procurement.plan.item.add.json';
import fVariation from './canonical/forms/procurement.contract.variation.request.json';
import fPermit from './canonical/forms/exchange.customs_permit.verify.json';

/** The sixteen reusable field groups, by id. */
export const FIELD_GROUPS: FieldGroup[] = [gPerson, gBirthDate, gAddress, gContact, gOrganisation, gRepresentation, gIdentity, gDeclaration, gConsent, gPayment, gEvidence, gPayout, gNationality, gAccessibility, gLanguage, gNotices]
  .map(g => importFieldGroup(g as unknown as CanonicalGroup));
export const fieldGroup = (id: string, version = 1): FieldGroup | undefined => FIELD_GROUPS.find(g => g.id === id && g.version === version);

/** The standard notice types (core.legal_notices). */
export const NOTICE_TYPES = fieldGroup('core.legal_notices')!.noticeTypes!;

export interface CanonicalLibraryForm extends CanonicalDefinition {
  specId: string;
  source: string;
  owner: string;
  awaits: string;
  notes: CanonicalNote[];
}

const FORMS: [unknown, string, string, string, string][] = [
  [fCabinet, 'Submit a Cabinet paper', 'Part 2 §2.2', 'executive-office', 'I5 (Cabinet decisions and action register)'],
  [fPayment, 'Submit a payment instruction', 'Part 2 §2.4', 'treasury', 'I5 (Treasury budget and commitments)'],
  [fBudget, 'Submit an institutional budget request', 'Part 2 §2.5', 'budget', 'I5 (Treasury budget and commitments)'],
  [fTaxpayer, 'Register a business for tax', 'Part 2 §2.6', 'tax', 'I5; the taxpayer registration procedure exists (tax.registration) and carries the specification\'s form'],
  [fReturn, 'Submit a periodic tax return', 'Part 2 §2.6', 'tax', 'I5; the tax return procedure exists (tax.return), its schemas are the country\'s'],
  [fInspection, 'Complete the inspection checklist', 'Part 2 §2.6', 'tax', 'I5 (tax compliance)'],
  [fImport, 'Submit an import declaration', 'Part 3 §3.1', 'customs', 'I5; the declaration procedure exists (customs.declaration) and carries the specification\'s form'],
  [fPlanItem, 'Add an item to a procurement plan', 'Part 3 §3.5', 'procurement', 'I5 (procurement planning to award)'],
  [fVariation, 'Request a contract variation', 'Part 3 §3.5', 'procurement', 'I5 (procurement contract management)'],
  [fPermit, 'Request verification of an import/export permit', 'Part 3 §3.6', 'customs', 'I9 (exchange contracts)'],
];

/** The complete form contracts of the field series, as library drafts. */
export const CANONICAL_LIBRARY: CanonicalLibraryForm[] = FORMS.map(([json, title, source, owner, awaits]) => {
  const c = json as CanonicalForm;
  const { definition, notes } = importCanonicalForm(c, { title });
  return { ...definition, specId: c.form_id, source, owner, awaits, notes };
});

/**
 * The standard values sources of Part 1 §1.3 (stable starting definitions;
 * a country configures its own through its procedure's approved lists).
 */
export const STANDARD_SOURCES: Record<string, { value: string; label: string }[]> = {
  'civicos.person.name_order.v1': [['given_family', 'Given name then family name'], ['family_given', 'Family name then given name'], ['single_name', 'A single name'], ['unsegmented', 'Not divided into parts'], ['other_or_unknown', 'Other or not known']].map(([value, label]) => ({ value: value!, label: label! })),
  'civicos.date.precision.v1': [['exact', 'The full date is known'], ['month_year', 'Only the month and year'], ['year_only', 'Only the year'], ['estimated', 'The date is estimated'], ['unknown', 'Not known']].map(([value, label]) => ({ value: value!, label: label! })),
  'civicos.address.kind.v1': [['street', 'A street address'], ['rural', 'A rural address'], ['informal_settlement', 'An informal settlement'], ['landmark', 'Described by a landmark'], ['po_box', 'A PO box'], ['care_of', 'Care of someone else'], ['international_other', 'An address abroad or other']].map(([value, label]) => ({ value: value!, label: label! })),
  'civicos.address.purpose.v1': [['residence', 'Where I live'], ['business_premises', 'Business premises'], ['correspondence', 'For letters'], ['service_location', 'Where the service is needed'], ['registered_office', 'Registered office'], ['other_approved', 'Other approved use']].map(([value, label]) => ({ value: value!, label: label! })),
  'civicos.notification.channel.v1': [['portal', 'This service\'s website'], ['email', 'Email'], ['sms', 'Text message'], ['post', 'Post'], ['assisted_office', 'At an office'], ['other_approved', 'Another approved way']].map(([value, label]) => ({ value: value!, label: label! })),
  'civicos.representation.capacity.v1': [['self', 'For myself'], ['agent', 'As an agent'], ['power_of_attorney', 'Under a power of attorney'], ['legal_guardian', 'As a legal guardian'], ['court_appointed_representative', 'As a court-appointed representative'], ['organization_officer', 'As an officer of the organisation'], ['other_approved', 'Another approved capacity']].map(([value, label]) => ({ value: value!, label: label! })),
  'civicos.consent.choice.v1': [['grant', 'I agree'], ['decline', 'I do not agree'], ['withdraw', 'I withdraw my agreement'], ['not_applicable', 'Not applicable']].map(([value, label]) => ({ value: value!, label: label! })),
  'civicos.signature.method.v1': [['authenticated_portal_confirmation', 'Confirmation while signed in'], ['approved_digital_signature', 'An approved digital signature'], ['uploaded_signed_document', 'A signed document, uploaded'], ['paper_signature', 'A signature on paper'], ['authorized_witnessed_mark', 'A mark witnessed by an authorised official'], ['other_approved', 'Another approved method']].map(([value, label]) => ({ value: value!, label: label! })),
  'civicos.accessibility.accommodation_types.v1': [['screen_reader_compatible_output', 'Documents that work with a screen reader'], ['large_text', 'Large text'], ['sign_language_support', 'Sign language support'], ['interpreter', 'An interpreter'], ['alternative_format', 'Another format'], ['assisted_completion', 'Help to complete the form'], ['step_free_or_accessible_appointment', 'A step-free or accessible appointment'], ['other_requested_adjustment', 'Another adjustment']].map(([value, label]) => ({ value: value!, label: label! })),
};
