// The form contract (docs/INSTITUTIONAL_ARCHITECTURE_PLAN.md §3.1, step I1;
// the common form and evidence contract of the specification, Part 1 §11,
// and its form designer, Part 6 §4): a procedure's fields are its form. They
// are versioned with the procedure package (lib/casework/packages.ts), so a
// form never drifts from the procedure that decides on it, and a case keeps
// the form version, declaration version and evidence-policy version it was
// submitted under. The sixteen form contracts the specification records are
// definitions in the form library (lib/forms/library), field for field;
// docs/FORMS_CONFORMANCE.md lists every deviation and its reason.
//
// This module is pure (no server state): the browser renders and checks a
// form with it, and the case engine checks the same answers with the same
// functions and the same messages before it opens or moves a case. The
// server decides; the browser only mirrors it. What only the server can know
// (whether a register record exists, where a point falls on the nation's map,
// what an exchange service answers, whether a reference is unique) is checked
// in lib/forms/server.ts and the engine, with messages written here.
//
// Nothing a law decides is typed into a form: values come from approved
// lists (a rule from lib/law/rules.ts, a register, the nation's regions, or
// a list approved with the procedure), amounts are entered by the applicant
// or calculated by an approved rule (never typed from a statute), and
// validation is by named rule only, never free code.

import type { Citation } from '@/lib/law/register';
import { translationProblem, type TranslationEntries } from '@/lib/public-sites/translation';
import { RULE_REGISTRY, isRegisteredRule, DIFFERS_FROM } from './rules';
import type { Envelope } from './envelope';

// ── Personal-data classes ─────────────────────────────────────────────────────
/**
 * How a field's value is handled (the specification's `personal_data_class`):
 *   public            may be published (a registered name of an organisation)
 *   administrative    about the procedure, not a person (a kind, a register)
 *   commercial        a business's information (a project, a consignment)
 *   personal          about a person
 *   financial         amounts, accounts, means
 *   tax-confidential  under tax secrecy
 *   restricted        identifiers, addresses, confidential commercial
 *                     information: shown only on the case itself
 *   special           special categories (health, beliefs, biometrics): only
 *                     in restricted or secret procedures
 * Every class but public and administrative stays out of lists, events and
 * exports. A secrecy the law attaches (commercial, tax, financial) is also
 * kept as `confidentiality`, so a restricted field can say which secrecy it is.
 */
export type PersonalDataClass = 'public' | 'administrative' | 'commercial' | 'personal' | 'financial' | 'tax-confidential' | 'restricted' | 'special';
export const DATA_CLASSES: { key: PersonalDataClass; label: string; meaning: string }[] = [
  { key: 'public', label: 'Public', meaning: 'May be published, for example a registered name.' },
  { key: 'administrative', label: 'Administrative', meaning: 'About the procedure, not about a person.' },
  { key: 'commercial', label: 'Commercial', meaning: 'A business\'s information. Never shown in lists, events or exports.' },
  { key: 'personal', label: 'Personal', meaning: 'About a person. Never shown in lists, events or exports.' },
  { key: 'financial', label: 'Financial', meaning: 'Amounts, accounts and means. Never shown in lists, events or exports.' },
  { key: 'tax-confidential', label: 'Tax-confidential', meaning: 'Under tax secrecy. Read only by the tax authority.' },
  { key: 'restricted', label: 'Restricted', meaning: 'Identifiers, addresses, confidential commercial information. Shown only on the case itself.' },
  { key: 'special', label: 'Special category', meaning: 'Health, beliefs, biometrics and similar. Only in restricted or secret procedures.' },
];
const CLASS_KEYS = DATA_CLASSES.map(c => c.key) as string[];
/** Classes that keep a value out of lists, events and exports. */
export const PERSONAL_CLASSES: PersonalDataClass[] = ['commercial', 'personal', 'financial', 'tax-confidential', 'restricted', 'special'];
/** How strictly a class is held (for the conformance check: never weaker than the specification). */
export const CLASS_RANK: Record<PersonalDataClass, number> = { public: 0, administrative: 1, commercial: 2, personal: 3, financial: 4, 'tax-confidential': 4, restricted: 5, special: 6 };
export type Confidentiality = 'commercial' | 'tax' | 'financial';
export const CONFIDENTIALITY: { key: Confidentiality; label: string }[] = [
  { key: 'commercial', label: 'Commercially confidential' }, { key: 'tax', label: 'Tax secrecy' }, { key: 'financial', label: 'Financial information' },
];

// ── Field types ───────────────────────────────────────────────────────────────
/** The types every package before the contract used; they keep their behaviour exactly. */
export const BASE_TYPES = ['text', 'longtext', 'date', 'number', 'choice', 'boolean', 'person', 'organisation', 'place'] as const;
/** Types the contract adds. */
export const CONTRACT_TYPES = [
  'enum', 'identifierReference', 'registryReference', 'localizedText', 'money', 'document', 'address', 'point',
  'attestation', 'dateRange', 'timestamp', 'quantity', 'contact', 'location', 'geometry', 'party', 'group',
] as const;
export type FormFieldType = (typeof BASE_TYPES)[number] | (typeof CONTRACT_TYPES)[number];
export const FIELD_TYPES: FormFieldType[] = [...BASE_TYPES, ...CONTRACT_TYPES];
export const TYPE_LABEL: Record<FormFieldType, string> = {
  text: 'Short text', longtext: 'Long text', date: 'Date', number: 'Number', choice: 'Choice (fixed options)', boolean: 'Yes or no',
  person: 'A person (named)', organisation: 'An organisation (named)', place: 'A place (described)',
  enum: 'Choice from an approved list', identifierReference: 'An identifier, checked with its register where the law allows', registryReference: 'A record in a register',
  localizedText: 'Text in the official languages', money: 'An amount of money', document: 'Evidence', address: 'An address', point: 'A position (longitude and latitude)',
  attestation: 'A declaration the applicant confirms', dateRange: 'A period (from and to)', timestamp: 'A date and time', quantity: 'A quantity with its unit',
  contact: 'How to reach the applicant', location: 'A location (region, registered site, position or address)', geometry: 'An area or line on the map',
  party: 'A person or organisation (with a register reference where they have one)', group: 'A set of questions (repeatable)',
};

/** Where an approved list of values comes from. */
export type ValuesSource =
  /** A list approved with this version of the procedure. */
  | { kind: 'list'; values: { value: string; label: string }[] }
  /** The nation's regions (lib/nation/registry.ts regionList()). */
  | { kind: 'regions' }
  /** A list the platform keeps in a register (lib/forms/server.ts). */
  | { kind: 'register'; register: string }
  /** The approved rules in force whose key starts with `prefix` (e.g. `tax.`). */
  | { kind: 'rules'; prefix: string }
  /** The lines of an approved tariff rule in force (e.g. `customs.tariff`). */
  | { kind: 'tariff'; rule: string }
  /**
   * A list the nation configures, named as the specification names it
   * (e.g. `approved_taxpayer_types`): approved with the procedure in its
   * form's `lists`, or read from the platform system that keeps it.
   */
  | { kind: 'configured'; list: string };

/** Register lists a values source may name (resolved on the server). */
export const VALUE_REGISTERS: { key: string; label: string }[] = [
  { key: 'organisation-kinds', label: 'Kinds of organisation' },
  { key: 'organisation-registers', label: 'Registers of organisations (licences, accreditation)' },
  { key: 'institutions', label: 'Institutions of the state (the institution register)' },
  { key: 'countries', label: 'Countries (ISO 3166-1, two letters)' },
  { key: 'countries-alpha3', label: 'Countries (ISO 3166-1, three letters)' },
  { key: 'currencies', label: 'Currencies (ISO 4217)' },
  { key: 'languages', label: 'The nation\'s official languages' },
];
/** Registers a registry reference may point into. `connected: false`: the register does not exist on the platform yet; a reference to it cannot be checked. */
export const REFERENCE_REGISTERS: { key: string; label: string; example: string; connected: boolean }[] = [
  { key: 'organisation', label: 'organisations register', example: 'ORG-2026-000123', connected: true },
  { key: 'person', label: 'civil register (birth registration)', example: 'BR-2026-000123', connected: true },
  { key: 'taxpayer', label: 'taxpayer register', example: 'TIN-2026-000123', connected: true },
  { key: 'parcel', label: 'land parcel register', example: 'the parcel number', connected: true },
  { key: 'site', label: 'national register of sites', example: 'the site\'s id', connected: true },
  { key: 'institution', label: 'institution register', example: 'the institution\'s id', connected: true },
  { key: 'professional', label: 'register of professionals', example: 'PR-2026-000123', connected: true },
  { key: 'law', label: 'laws register (instrument#provision)', example: '/eli/x/act/2020/7#sec_12', connected: true },
  // The register of medicines and medical devices (lib/health/products/register.ts): by register or authorisation number, decided records only.
  { key: 'product', label: 'register of medicines and medical devices', example: 'MA-2026-000123', connected: true },
  // The register of public-health programmes (lib/health/programmes/register.ts): an established programme by its number.
  { key: 'programme', label: 'register of public-health programmes', example: 'PHP-2026-000123', connected: true },
  { key: 'appropriation', label: 'register of budget appropriations', example: 'the appropriation reference', connected: false },
  { key: 'farm', label: 'register of farms', example: 'the farm record', connected: false },
  { key: 'water-source', label: 'register of water sources', example: 'the water source reference', connected: false },
  { key: 'land-interest', label: 'register of interests in land', example: 'the registered interest', connected: false },
  { key: 'payment-account', label: 'register of payment accounts', example: 'the account reference', connected: false },
];

// ── Named rules ───────────────────────────────────────────────────────────────
/** Patterns an official may choose (never a free regular expression). */
export const PATTERNS: Record<string, { label: string; re: string; flags?: string; message: string }> = {
  digits: { label: 'Digits only', re: '^[0-9]+$', message: 'must contain digits only' },
  'person-name': { label: 'A person\'s name', re: "^[\\p{L}\\p{M}][\\p{L}\\p{M}' .\\-]*$", flags: 'u', message: 'must contain only letters, spaces, hyphens and apostrophes' },
  email: { label: 'Email address', re: '^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$', message: 'must be an email address, like name@example.org' },
  phone: { label: 'Phone number (international)', re: '^\\+[1-9][0-9 ]{6,18}$', message: 'must be a phone number in international format, starting with +' },
  'country-code': { label: 'Country code (ISO 3166-1 alpha-3)', re: '^[A-Z]{3}$', message: 'must be a three-letter country code, like KEN' },
  'country-code-2': { label: 'Country code (ISO 3166-1 alpha-2)', re: '^[A-Z]{2}$', message: 'must be a two-letter country code, like KE' },
  'currency-code': { label: 'Currency code (ISO 4217)', re: '^[A-Z]{3}$', message: 'must be a three-letter currency code' },
  postcode: { label: 'Postcode', re: '^[A-Za-z0-9][A-Za-z0-9 \\-]{1,11}$', message: 'must be a postcode of letters and digits' },
  'register-reference': { label: 'Register reference', re: '^[A-Z]{2,6}-[A-Z0-9\\-]{1,40}$', message: 'must be a register reference, like ORG-2026-000123' },
  'document-reference': { label: 'Document reference (letters, digits, - / .)', re: '^[A-Za-z0-9][A-Za-z0-9/.\\- ]{1,59}$', message: 'must be a document reference of letters and digits' },
  year: { label: 'Year', re: '^[0-9]{4}$', message: 'must be a year, like 2026' },
  'tax-period': { label: 'Tax period', re: '^[0-9]{4}(-(0[1-9]|1[0-2])|-Q[1-4])?$', message: 'must be a period, like 2026, 2026-03 or 2026-Q1' },
  'plain-language': { label: 'Plain words (no markup)', re: '^[^<>{}]*$', message: 'must be plain words without < > { or }' },
  'partial-date': { label: 'A date, or only a month or year (YYYY, YYYY-MM or YYYY-MM-DD)', re: '^[0-9]{4}(-(0[1-9]|1[0-2])(-(0[1-9]|[12][0-9]|3[01]))?)?$', message: 'must be a year, a month (YYYY-MM) or a date (YYYY-MM-DD)' },
  'account-number': { label: 'Bank account number or IBAN', re: '^[A-Za-z0-9][A-Za-z0-9 \\-]{5,40}$', message: 'must be an account number of letters and digits' },
};

/**
 * Checks the country configures (the specification's "…_profile" and
 * "configured_…" validations). Until the nation configures one, the server
 * records that it was not performed (never a refusal, never an adverse finding).
 */
export const PROFILES: Record<string, string> = {
  'transport-document': 'The country\'s transport-document profile',
  'national-timetable': 'The national procurement timetable',
  'procuring-entity': 'The list of authorised procuring entities',
  'appropriation-authority': 'The appropriation\'s remaining authority',
  'authorised-representation': 'The organisation\'s authorised representatives',
  'approved-exception': 'An approved exception for an organisation not yet registered',
  'evidence-policy': 'The procedure\'s evidence policy',
  'separation-of-duties': 'The configured separation of duties',
};

/**
 * A validation rule, by name. Cross-field rules name the other field.
 * `verifyWith` checks an identifier with an exchange service only where a
 * provision of law in force allows it (the engine cites it first) and never
 * refuses on the answer: the case records whether it matched.
 */
export type NamedRule =
  | { rule: 'length'; min?: number; max?: number }
  | { rule: 'pattern'; pattern: string }
  | { rule: 'range'; min?: number; max?: number }
  | { rule: 'requiredWhen'; field: string; equals?: string; notEquals?: string }
  | { rule: 'notAfter'; than: string }
  | { rule: 'notBefore'; than: string }
  | { rule: 'mustBeTrue' }
  | { rule: 'minItems'; min: number }
  | { rule: 'maxItems'; max: number }
  | { rule: 'existingRecord'; pendingProcedure?: string; active?: boolean }
  | { rule: 'unique' }
  | { rule: 'signature' }
  | { rule: 'verifiedChannel' }
  /** A check the country configures, by name (PROFILES, or a name a loaded form contract uses). */
  | { rule: 'profile'; profile: string }
  /** `basis` is the provision that allows the check; until the nation cites one, the check is recorded as not performed. */
  | { rule: 'verifyWith'; service: string; input: Record<string, string>; purpose: string; basis?: { instrument: string; eId: string } }
  /**
   * A rule from the registry (lib/forms/rules.ts) by its name and parameters,
   * as a form contract in the canonical format names it
   * (`{"rule": "required_if", "params": {"field": "…", "in": […]}}`). An
   * unregistered name does not fit the contract (fail closed).
   */
  | { rule: 'registered'; name: string; params?: Record<string, unknown> };
export type RuleName = NamedRule['rule'] | 'required' | 'type' | 'values';
export const RULE_LABEL: Record<RuleName, string> = {
  required: 'Required', type: 'Right kind of answer', values: 'From the approved list',
  length: 'Length', pattern: 'Pattern', range: 'Range', requiredWhen: 'Required when another answer is', notAfter: 'Not after', notBefore: 'Not before',
  mustBeTrue: 'Must be confirmed', minItems: 'At least this many', maxItems: 'At most this many', existingRecord: 'Must point to an existing record', unique: 'Unique among open applications',
  signature: 'Signed by the applicant, who is identified', verifiedChannel: 'A verified contact channel', profile: 'Checked against the country\'s configuration',
  verifyWith: 'Checked with an exchange service, where the law allows', registered: 'A registered rule',
};

// ── The field and form shapes (the case engine's FieldSpec and the package's form) ──
export interface Condition { field: string; equals?: string; notEquals?: string }
export interface ContractField {
  key: string;
  label: string;
  type: FormFieldType | string;
  required?: boolean;
  options?: string[];
  /** Before the contract: personal data. Derived from personalDataClass when that is set. */
  personal?: boolean;
  max?: number;
  personalDataClass?: PersonalDataClass;
  /** A secrecy the law attaches beside the class (commercial, tax, financial). */
  confidentiality?: Confidentiality;
  hint?: string;
  /** Plain-language error text by rule name (English; translated through the review). Registered rules use their registry name. */
  errors?: Partial<Record<RuleName, string>> & Record<string, string | undefined>;
  valuesSource?: ValuesSource;
  /** Several answers (a list): enum, references, parties, evidence, groups. */
  multiple?: boolean;
  rules?: NamedRule[];
  /** registryReference: the register the reference points into. */
  register?: string;
  /** identifierReference: the identifier scheme in words (e.g. Birth registration number). */
  identifier?: { scheme: string };
  /** document: the evidence class (a document of the procedure). */
  evidence?: string;
  /** attestation: the statements confirmed, with the text's version. `signature`: signed by an identified applicant. */
  attestation?: { version: string; statements: { key: string; text: string }[]; signature?: boolean };
  /** party: who it may be. */
  parties?: ('person' | 'organisation' | 'institution')[];
  /** location: which ways of saying where are accepted. */
  locationKinds?: ('region' | 'site' | 'point' | 'address' | 'described')[];
  /** quantity: the units allowed. */
  units?: string[];
  /** contact: the methods allowed. */
  contactMethods?: ('email' | 'phone' | 'post' | 'in-person')[];
  /** dateRange: a single date is enough (date_or_date_range). */
  allowSingle?: boolean;
  /** group: the questions in each item. */
  items?: ContractField[];
  /** group: officials may give the items as lines of text, columns separated by | (the earlier form). */
  textLines?: boolean;
  /** Officials may give a plain-text answer at a step (the earlier form of this field); the applicant's form always asks the structured question. */
  acceptsText?: boolean;
  /** boolean: when yes, the case is held as restricted (a confidentiality request). */
  raisesSensitivity?: boolean;
  /** Asked only when another answer is (conditional section). */
  showWhen?: Condition;
  /** Who answers: the applicant (on the form), an official (at a step) or the platform itself (a time, a calculated amount). Default applicant. */
  audience?: 'applicant' | 'officer' | 'system';
  /** Where the value comes from (field series Part 4): the applicant, an authorised official, a verified source, or the system. */
  valueSource?: 'applicant' | 'authorized_officer' | 'verified_source' | 'system';
  /** The values source as the canonical contract names it (kept verbatim). */
  valuesSourceId?: string;
  /** Evidence this answer may need, and when (canonical `evidence`: kind and condition). */
  evidenceRules?: { kind: string; when: string }[];
  /** Accessibility requirements of the field (canonical `accessibility`, kept verbatim and applied by the renderer). */
  accessibility?: Record<string, unknown>;
  /** A decision the country must make about this field (canonical `country_decision`). */
  countryDecision?: string | null;
  /** The reusable field group (immutable id and version) this field comes from. */
  group?: { id: string; version: number };
  /**
   * The minimisation review (field series Part 1 §1.6): seven answers the
   * package gives for the field. A required field without them blocks
   * publication.
   */
  minimisation?: Minimisation;
  /** Fields with the same section are asked together, one section per page in self-service. */
  section?: string;
  /** The field of the specification's form contract this field carries (docs/FORMS_CONFORMANCE.md). */
  specField?: string | string[];
  /** The building block it was made from (lib/forms/blocks.ts). */
  block?: string;
  /** Presentation hints from the envelope standard (a widget name, an order); the renderer's own components decide how. */
  ui?: { widget?: string; order?: number };
}

/** The seven questions of the field-level minimisation review (field series Part 1 §1.6). */
export interface Minimisation {
  /** 1. What decision, action or statutory record requires this information? */
  decision: string;
  /** 2. Which legal provision or approved procedural requirement authorises its collection? */
  authority: string;
  /** 3. Is it already available through an authorised register or exchange? */
  availableFrom: string;
  /** 4. Can the purpose be achieved with less sensitive data? */
  lessSensitive: string;
  /** 5. Who can read it, for what purpose, and for how long? */
  access: string;
  /** 6. What happens if the applicant cannot supply it? */
  ifUnavailable: string;
  /** 7. Is it necessary in all cases, or only under a registered condition? */
  necessity: string;
}
export const MINIMISATION_QUESTIONS: { key: keyof Minimisation; question: string }[] = [
  { key: 'decision', question: 'What decision, action or statutory record requires this information?' },
  { key: 'authority', question: 'Which legal provision or approved procedural requirement authorises its collection?' },
  { key: 'availableFrom', question: 'Is it already available through an authorised register or exchange?' },
  { key: 'lessSensitive', question: 'Can the purpose be achieved with less sensitive data?' },
  { key: 'access', question: 'Who can read it, for what purpose, and for how long?' },
  { key: 'ifUnavailable', question: 'What happens if the applicant cannot supply it?' },
  { key: 'necessity', question: 'Is the field necessary in all cases, or only under a registered condition?' },
];
export const minimisationComplete = (m?: Minimisation): boolean => !!m && MINIMISATION_QUESTIONS.every(q => typeof m[q.key] === 'string' && m[q.key].trim().length > 0);

/** The evidence-requirement record (civicos.evidence-requirement.v1, field series Part 1 §1.4): every activated evidence requirement resolves to it. */
export interface EvidenceRequirement {
  schema_version: 'civicos.evidence-requirement.v1';
  evidence_requirement_id: string;
  procedure_package_id: string;
  procedure_package_version: number;
  evidence_type: string;
  required_when_rule_id: string;
  legal_basis: { law_record_id: string; law_version_id: string; provision_reference: string; authority_type: string };
  accepted_alternatives_source: string;
  verification_method_source: string;
  retention_rule_id: string;
  drafted_by: string;
  approved_by: string;
  status: string;
}
export const EVIDENCE_AUTHORITY_TYPES = ['statutory_requirement', 'approved_evidentiary_procedure', 'documented_non_statutory_authority'];

/** A notice type of the standard legal and privacy notices (core.legal_notices). */
export interface NoticeType { id: string; required: boolean; content_source: string; must_state: string[]; publication_blockers: string[] }

export interface ContractDocument {
  class: string; label: string; required: boolean;
  /** The provision of law (and its version) that requires this evidence. */
  citation?: Citation;
  /** Why it is needed, in plain words. */
  purpose?: string;
  /** Accepted formats, in words (PDF, JPEG, paper original). */
  formats?: string[];
  /** An authorised alternative, when the law allows one. */
  alternative?: string;
  /** Several documents of this class may be given. */
  multiple?: boolean;
  /** The evidence-requirement record that makes it activatable (resolves to an approved law record). */
  requirement?: EvidenceRequirement;
}

export interface FormSpec {
  /** The form's own version (kept on every submission). */
  version: string;
  /** The specification's form contract this form implements. */
  spec?: { id: string; version?: string; recordType?: string };
  /** A short plain-language introduction: who should use the form and what happens next. */
  intro?: string;
  /** The declaration the applicant makes, with its own version. */
  declaration?: { text: string; version: string };
  /** The evidence policy this form applies (a version name, kept on every submission). */
  evidencePolicy?: string;
  /** Identity evidence an official may record as seen at an office (assisted channel). */
  identityEvidence?: { key: string; label: string }[];
  /**
   * The lists the nation configures, by the specification's name, approved
   * with this version of the procedure. `proposed`: shipped by CivicOS as a
   * starting point, to be checked against the nation's law before approval.
   */
  lists?: Record<string, { values: { value: string; label: string }[]; proposed?: boolean }>;
  /** Rules the procedure follows, as the specification states them (legal basis, approval, controls); shown on the form. */
  policies?: Record<string, string | boolean>;
  /** Standard notices shown with the form (how the information is used, rights, what happens next). */
  notices?: { key: string; title: string; text: string }[];
  /** Notes for each channel: self-service, assisted, paper, low connectivity. */
  channels?: { selfService?: string; assisted?: string; paper?: string; lowConnectivity?: string };
  /** Translations by language, string by string, each with the English it was made from. */
  translations?: Record<string, TranslationEntries>;
  /** The canonical form contract this is (civicos.form-contract.v1), with its declared status and bindings. */
  schemaVersion?: string;
  status?: string;
  institutionId?: string;
  serviceId?: string;
  procedurePackage?: { id: string; version: number };
  legalBasis?: unknown[];
  countryDecisions?: string[];
  /** Reusable field groups the form uses, by immutable id and version. */
  groups?: { id: string; version: number }[];
  /** The standard notice types the form carries (core.legal_notices); their text is in `notices` under the same id. */
  noticeTypes?: NoticeType[];
  /** How the data is used, for the data-use notice: recipients and the retention rule. */
  dataUse?: { recipients: string[]; retentionRule: string; lawfulBasis: string };
  /** The catalogue identifiers this form answers (field series, e.g. CIV-BTH-002). */
  catalogueIds?: string[];
  /** The catalogue document those identifiers come from, where the catalogue reuses an ID for different forms (lib/forms/scope.ts reads the scope of that document's entry). */
  catalogueSource?: string;
  /**
   * The shared envelope's form-level properties (contract_version 1.0.0:
   * owning institution, competent-authority rule, legal basis with its
   * verification status, applicability, workflow, decision, privacy, audit,
   * accessibility), lib/forms/envelope.ts. Where the form does not state
   * them, envelopeOf() derives them from the procedure package.
   */
  envelope?: Envelope;
}

/** The channels one definition renders in. */
export type Channel = 'self-service' | 'assisted' | 'paper';
export const CHANNEL_LABEL: Record<Channel, string> = { 'self-service': 'Self-service', assisted: 'Assisted at an office', paper: 'Paper form' };

// ── Class and audience ────────────────────────────────────────────────────────
/** A field's personal-data class: its own, else derived from the earlier `personal` flag. */
export const fieldClass = (f: Pick<ContractField, 'personalDataClass' | 'personal'>): PersonalDataClass =>
  f.personalDataClass ?? (f.personal ? 'personal' : 'administrative');
/** Whether a field stays out of lists, events and exports. */
export const isPersonalField = (f: Pick<ContractField, 'personalDataClass' | 'personal'>): boolean => PERSONAL_CLASSES.includes(fieldClass(f));
export const forApplicant = (f: Pick<ContractField, 'audience'>): boolean => (f.audience ?? 'applicant') === 'applicant';
/** Rules a field names from the registry. */
export const registeredOf = (f: Pick<ContractField, 'rules'>, name: string) => (f.rules ?? []).filter((r): r is Extract<NamedRule, { rule: 'registered' }> => r.rule === 'registered' && r.name === name);
/** Whether a conditional field is asked, given the other answers. */
export function shown(f: Pick<ContractField, 'showWhen'>, all: Record<string, unknown>): boolean {
  return !f.showWhen || conditionHolds(f.showWhen, all);
}
function conditionHolds(c: Condition, all: Record<string, unknown>): boolean {
  const o = all[c.field];
  const s = Array.isArray(o) ? o.map(String) : isEmpty(o) ? [] : [String(o)];
  if (c.equals !== undefined) return s.includes(c.equals);
  if (c.notEquals !== undefined) return s.length > 0 && !s.includes(c.notEquals);
  return s.length > 0;
}

// ── Translations ──────────────────────────────────────────────────────────────
/** Every translatable string of a form, by path, with its English source. */
export function formStrings(fields: ContractField[], documents: ContractDocument[], form?: FormSpec): { path: string; text: string }[] {
  const out: { path: string; text: string }[] = [];
  const add = (path: string, text: string | undefined) => { if (text && /\p{L}/u.test(text)) out.push({ path, text }); };
  add('form.intro', form?.intro);
  add('form.declaration', form?.declaration?.text);
  for (const e of form?.identityEvidence ?? []) add(`form.identity.${e.key}`, e.label);
  for (const [k, t] of Object.entries(form?.channels ?? {})) add(`form.channel.${k}`, t);
  for (const n of form?.notices ?? []) { add(`form.notice.${n.key}.title`, n.title); add(`form.notice.${n.key}.text`, n.text); }
  for (const [name, l] of Object.entries(form?.lists ?? {})) for (const v of l.values) add(`list.${name}.${v.value}`, v.label);
  const walk = (prefix: string, fs: ContractField[]) => {
    for (const f of fs) {
      const p = `${prefix}${f.key}`;
      add(`${p}.label`, f.label);
      add(`${p}.hint`, f.hint);
      add(`${p}.section`, f.section);
      for (const [r, t] of Object.entries(f.errors ?? {})) add(`${p}.error.${r}`, t);
      if (f.valuesSource?.kind === 'list') for (const v of f.valuesSource.values) add(`${p}.value.${v.value}`, v.label);
      for (const s of f.attestation?.statements ?? []) add(`${p}.statement.${s.key}`, s.text);
      if (f.items) walk(`${p}.item.`, f.items);
    }
  };
  walk('field.', fields);
  for (const d of documents) { add(`document.${d.class}.label`, d.label); add(`document.${d.class}.purpose`, d.purpose); add(`document.${d.class}.alternative`, d.alternative); }
  return out;
}

/** A translator: the reviewed translation while its English source is unchanged, else the English. */
export function localiser(form: FormSpec | undefined, locale: string | undefined): (path: string, english: string) => string {
  const entries = locale ? form?.translations?.[locale] : undefined;
  return (path, english) => {
    const e = entries?.[path];
    return e && e.source === english && e.target.trim() ? e.target : english;
  };
}

/** How far a language's translation has got: up to date, out of date (its English changed) and missing. */
export function translationStatus(fields: ContractField[], documents: ContractDocument[], form: FormSpec | undefined, locale: string): { total: number; translated: number; stale: string[]; missing: string[] } {
  const entries = form?.translations?.[locale];
  const stale: string[] = [], missing: string[] = [];
  let translated = 0;
  const strings = formStrings(fields, documents, form);
  for (const { path, text } of strings) {
    const e = entries?.[path];
    if (!e || !e.target.trim()) missing.push(path);
    else if (e.source !== text) stale.push(path);
    else translated++;
  }
  return { total: strings.length, translated, stale, missing };
}

// ── Values ────────────────────────────────────────────────────────────────────
export interface Money { minor: number; currency: string }
export interface Address { line1: string; line2?: string; locality: string; region?: string; postcode?: string }
export interface Point { lng: number; lat: number; region?: string; regionCode?: string; district?: string; districtCode?: string }
export interface Location { kind: 'region' | 'site' | 'point' | 'address' | 'described'; region?: string; site?: string; point?: Point; address?: Address; text?: string }
export interface PartyRef { kind: 'person' | 'organisation' | 'institution'; ref?: string; name: string }
export interface DateRange { from: string; to?: string }
export interface Quantity { amount: number; unit: string }
export interface Contact { method: 'email' | 'phone' | 'post' | 'in-person'; value?: string }
export interface Geometry { type: 'Point' | 'LineString' | 'Polygon'; coordinates: unknown }
export const DOCUMENT_ANSWERS = [
  { value: 'provide', label: 'I am providing it with this application' },
  { value: 'later', label: 'I will bring or send it later' },
  { value: 'alternative', label: 'I will use the authorised alternative' },
] as const;
export const CONTACT_METHODS: { key: Contact['method']; label: string; needs?: string }[] = [
  { key: 'email', label: 'Email', needs: 'email' }, { key: 'phone', label: 'Phone or text message', needs: 'phone' },
  { key: 'post', label: 'Post', needs: 'postal address' }, { key: 'in-person', label: 'In person at an office' },
];
export const LOCATION_KINDS: { key: Location['kind']; label: string }[] = [
  { key: 'region', label: 'A region' }, { key: 'site', label: 'A registered site' }, { key: 'point', label: 'A position on the map' },
  { key: 'address', label: 'An address' }, { key: 'described', label: 'A description of the place' },
];

/** An address on one line (for registers that keep it as text). */
export function addressText(v: unknown): string {
  if (typeof v === 'string') return v.trim();
  if (!v || typeof v !== 'object') return '';
  const a = v as Partial<Address>;
  return [a.line1, a.line2, a.locality, a.region, a.postcode].map(x => (typeof x === 'string' ? x.trim() : '')).filter(Boolean).join(', ');
}
/** A location in words (registers that keep a place as text). */
export function locationText(v: unknown): string {
  if (typeof v === 'string') return v.trim();
  if (!v || typeof v !== 'object') return '';
  const l = v as Partial<Location>;
  if (l.kind === 'address') return addressText(l.address);
  if (l.kind === 'point' && l.point) return `${l.point.lat}, ${l.point.lng}${l.point.region ? ` (${l.point.region})` : ''}`;
  if (l.kind === 'site') return l.site ?? '';
  if (l.kind === 'region') return l.region ?? '';
  return l.text?.trim() ?? '';
}
/** The region a location names or falls in. */
export const locationRegion = (v: unknown): string => {
  if (!v || typeof v !== 'object') return '';
  const l = v as Partial<Location>;
  return l.region ?? l.point?.region ?? l.address?.region ?? '';
};
/** A party's name (registers that keep a name). */
export const partyName = (v: unknown): string => (typeof v === 'string' ? v.trim() : v && typeof v === 'object' ? String((v as PartyRef).name ?? '').trim() : '');
/** Text in the nation's main language (a localised text may hold several). */
export function textOf(v: unknown, locale?: string): string {
  if (typeof v === 'string') return v;
  if (v && typeof v === 'object') { const o = v as Record<string, unknown>; const s = (locale && o[locale]) ?? Object.values(o)[0]; return typeof s === 'string' ? s : ''; }
  return '';
}
/** Several values of a multiple choice (an array, or the earlier comma-separated text). */
export function listOf(v: unknown): string[] {
  if (Array.isArray(v)) return v.map(String).map(s => s.trim()).filter(Boolean);
  if (typeof v === 'string') return v.split(/[,\n]+/).map(s => s.trim()).filter(Boolean);
  return [];
}
/** A group's items as lines of text, columns separated by | (registers that keep the earlier form). */
export function groupLines(v: unknown, items: Pick<ContractField, 'key'>[]): string {
  if (typeof v === 'string') return v;
  if (!Array.isArray(v)) return '';
  return v.map(row => items.map(i => { const x = (row as Record<string, unknown>)[i.key]; return x && typeof x === 'object' && 'minor' in x ? String((x as Money).minor) : x && typeof x === 'object' && 'amount' in x ? `${(x as Quantity).amount} ${(x as Quantity).unit}` : String(x ?? ''); }).join(' | ')).join('\n');
}
const normalise = (s: string) => s.normalize('NFC').replace(/\s+/g, ' ').trim();

export function isEmpty(v: unknown): boolean {
  if (v === undefined || v === null || v === '') return true;
  if (Array.isArray(v)) return v.length === 0;
  if (typeof v === 'object') {
    const o = v as Record<string, unknown>;
    if ('minor' in o) return o.minor === undefined || o.minor === null || o.minor === '';
    if ('amount' in o) return o.amount === undefined || o.amount === null || o.amount === '';
    if ('kind' in o && ('name' in o)) return !String(o.name ?? '').trim() && !String(o.ref ?? '').trim();
    if ('kind' in o) return Object.entries(o).every(([k, x]) => k === 'kind' || isEmpty(x));
    if ('line1' in o || 'locality' in o) return !String(o.line1 ?? '').trim() && !String(o.locality ?? '').trim();
    if ('lng' in o || 'lat' in o) return (o.lng === undefined || o.lng === '') && (o.lat === undefined || o.lat === '');
    if ('from' in o) return !String(o.from ?? '').trim();
    if ('method' in o) return !String(o.method ?? '').trim();
    if ('confirmed' in o) return !(Array.isArray(o.confirmed) ? o.confirmed.length : o.confirmed);
    if ('type' in o && 'coordinates' in o) return !o.coordinates;
    return Object.values(o).every(x => isEmpty(x));
  }
  return false;
}

// ── Messages ──────────────────────────────────────────────────────────────────
const lcFirst = (s: string) => (s.length > 1 && s[1] === s[1]!.toLowerCase() ? s[0]!.toLowerCase() + s.slice(1) : s);
type MsgParams = { min?: number; max?: number; other?: string; currency?: string; register?: string; pattern?: string };
/** The default plain-language message for a rule, before any override or translation. */
export function defaultMessage(f: Pick<ContractField, 'label' | 'type'>, rule: RuleName, p: MsgParams = {}): string {
  const label = f.label;
  switch (rule) {
    case 'required':
      if (f.type === 'enum' || f.type === 'choice') return `Select ${lcFirst(label)}`;
      if (f.type === 'boolean') return `Answer: ${lcFirst(label)}`;
      if (f.type === 'document') return `Say how you will provide ${lcFirst(label)}`;
      if (f.type === 'attestation') return `Confirm ${lcFirst(label)}`;
      if (f.type === 'group') return `Add ${lcFirst(label)}`;
      return `Enter ${lcFirst(label)}`;
    case 'values': return `Select ${lcFirst(label)} from the list`;
    case 'length': return p.min !== undefined && p.max === undefined ? `${label} must be at least ${p.min} characters` : `${label} must be ${p.max} characters or fewer`;
    case 'range': return p.min !== undefined && p.max !== undefined ? `${label} must be between ${p.min} and ${p.max}` : p.min !== undefined ? `${label} must be ${p.min} or more` : `${label} must be ${p.max} or less`;
    case 'pattern': return `${label} ${PATTERNS[p.pattern ?? '']?.message ?? 'is not in the expected form'}`;
    case 'notAfter': return p.other ? `${label} must be on or before ${lcFirst(p.other)}` : `${label} must be today or in the past`;
    case 'notBefore': return p.other ? `${label} must be on or after ${lcFirst(p.other)}` : `${label} must be today or in the future`;
    case 'mustBeTrue': return `Confirm ${lcFirst(label)}`;
    case 'minItems': return `Add at least ${p.min} to ${lcFirst(label)}`;
    case 'maxItems': return `${label} can have at most ${p.max}`;
    case 'requiredWhen': return defaultMessage(f, 'required');
    case 'existingRecord': return `${label}: there is no record with that reference in the ${p.register ?? 'register'}`;
    case 'unique': return `${label}: an open application already uses this reference`;
    case 'signature': return `${label} must be confirmed by the applicant, signed in or identified at an office`;
    case 'verifiedChannel': return `${label} could not be verified`;
    case 'profile': return `${label} does not meet the country's configuration`;
    case 'verifyWith': return `${label} could not be checked`;
    default: return `${label} is not valid`;
  }
}

export interface FieldError { field: string; rule: RuleName | 'unknown'; message: string }
export interface CheckContext {
  /** submit: an applicant's form (required, required-when and the structured answers apply); partial: answers given at a step. */
  mode: 'submit' | 'partial';
  /** The allowed values of each enum field, resolved on the server. A field missing here is not checked against a list (the browser before it has loaded); the server always resolves them. */
  options?: Record<string, string[]>;
  /** The nation's currency (money must be in it). */
  currency?: string;
  /** The nation's regions (an address's or a location's region must be one). */
  regions?: string[];
  documents?: ContractDocument[];
  /** Today, YYYY-MM-DD (date rules against today). */
  today?: string;
  /** Answers already on the case (cross-field rules in partial mode). */
  existing?: Record<string, unknown>;
  /** Translated message text (localiser()). */
  text?: (path: string, english: string) => string;
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const ISO_TIME = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d{1,3})?)?(Z|[+-]\d{2}:\d{2})?$/;
/** The message for a rule: the field's own wording or the default, translated through the review. */
function message(f: ContractField, rule: RuleName, ctx: CheckContext, p?: MsgParams, prefix = 'field.'): string {
  const english = f.errors?.[rule] ?? defaultMessage(f, rule, p);
  return ctx.text ? ctx.text(`${prefix}${f.key}.error.${rule}`, english) : english;
}
const str = (x: unknown) => (typeof x === 'string' ? normalise(x).slice(0, 300) : '');

/**
 * Check one value's type (and normalise it). The messages for the types every
 * package used before the contract are exactly those the engine always gave.
 */
function checkType(f: ContractField, v: unknown, ctx: CheckContext): { value: unknown } | { error: string } {
  const text = typeof v === 'string' && f.acceptsText && ctx.mode === 'partial';
  switch (f.type) {
    case 'number': if (typeof v !== 'number' || !Number.isFinite(v)) return { error: `${f.label} must be a number` }; return { value: v };
    case 'boolean': if (typeof v !== 'boolean') return { error: `${f.label} must be yes or no` }; return { value: v };
    case 'date': if (typeof v !== 'string' || !ISO_DATE.test(v)) return { error: `${f.label} must be a date (YYYY-MM-DD)` }; return { value: v };
    case 'choice': if (!f.options?.includes(String(v))) return { error: `${f.label} must be one of ${f.options?.join(', ')}` }; return { value: v };
    case 'timestamp': if (typeof v !== 'string' || !ISO_TIME.test(v) || Number.isNaN(Date.parse(v))) return { error: `${f.label} must be a date and time` }; return { value: v };
    case 'enum': {
      const raw = f.multiple && typeof v === 'string' && f.acceptsText ? listOf(v) : v;
      const list = f.multiple ? (Array.isArray(raw) ? raw : null) : typeof raw === 'string' ? [raw] : null;
      if (!list || list.some(x => typeof x !== 'string')) return { error: f.multiple ? `${f.label} must be a list of choices` : `${f.label} must be one choice` };
      const allowed = ctx.options?.[f.key];
      if (allowed) {
        if (!allowed.length) return { error: `${f.label}: no approved list of values is in force yet` };
        if (list.some(x => !allowed.includes(x as string))) return { error: message(f, 'values', ctx) };
      }
      const uniq = [...new Set(list as string[])];
      return { value: f.multiple ? uniq : uniq[0] };
    }
    case 'localizedText': {
      if (typeof v === 'string') return { value: normalise(v) };
      if (v && typeof v === 'object' && !Array.isArray(v) && Object.values(v).every(x => typeof x === 'string')) {
        const o = Object.fromEntries(Object.entries(v as Record<string, string>).filter(([k]) => /^[a-z]{2,3}$/.test(k)).map(([k, x]) => [k, normalise(x)]).filter(([, x]) => x));
        if (!Object.keys(o).length) return { value: '' };
        return { value: o };
      }
      return { error: `${f.label} must be text` };
    }
    case 'money': {
      const o = v as Partial<Money> | null;
      if (!o || typeof o !== 'object' || !Number.isInteger(o.minor) || (o.minor as number) < 0) return { error: `${f.label} must be an amount of money, zero or more` };
      const cur = typeof o.currency === 'string' ? o.currency.toUpperCase() : ctx.currency;
      if (!cur || !/^[A-Z]{3}$/.test(cur)) return { error: `${f.label} must name its currency` };
      if (ctx.currency && cur !== ctx.currency && !f.valuesSource) return { error: `${f.label} must be in ${ctx.currency}` };
      return { value: { minor: o.minor, currency: cur } };
    }
    case 'document': {
      const answers = f.multiple && Array.isArray(v) ? v : [v];
      for (const a of answers) {
        if (typeof a !== 'string' || !DOCUMENT_ANSWERS.some(x => x.value === a)) return { error: `${f.label}: say how the evidence will be provided` };
        if (a === 'alternative' && !ctx.documents?.find(d => d.class === f.evidence)?.alternative) return { error: `${f.label}: there is no authorised alternative for this evidence` };
      }
      return { value: f.multiple && Array.isArray(v) ? [...new Set(answers)] : answers[0] };
    }
    case 'address': {
      if (text) return { value: normalise(v as string) };
      const a = v as Partial<Address> | null;
      if (!a || typeof a !== 'object' || Array.isArray(a)) return { error: `${f.label} must be an address` };
      const parts = { line1: str(a.line1), line2: str(a.line2), locality: str(a.locality), region: str(a.region), postcode: str(a.postcode) };
      if (!parts.line1) return { error: `${f.label}: enter the first line of the address` };
      if (!parts.locality) return { error: `${f.label}: enter the town or locality` };
      if (parts.region && ctx.regions?.length && !ctx.regions.includes(parts.region)) return { error: `${f.label}: choose the region from the list` };
      return { value: Object.fromEntries(Object.entries(parts).filter(([, x]) => x)) };
    }
    case 'point': {
      const p = checkPoint(f.label, v);
      return 'error' in p ? p : { value: p.point };
    }
    case 'location': {
      if (text) return { value: { kind: 'described', text: normalise(v as string) } };
      const l = v as Partial<Location> | null;
      const kinds = f.locationKinds ?? ['region', 'site', 'point', 'address', 'described'];
      if (!l || typeof l !== 'object' || !kinds.includes(l.kind as Location['kind'])) return { error: `${f.label}: say where, as ${kinds.map(k => LOCATION_KINDS.find(x => x.key === k)!.label.toLowerCase()).join(', or ')}` };
      if (l.kind === 'region') { const r = str(l.region); if (!r || (ctx.regions?.length && !ctx.regions.includes(r))) return { error: `${f.label}: choose the region from the list` }; return { value: { kind: 'region', region: r } }; }
      if (l.kind === 'site') { const s = str(l.site); if (!s) return { error: `${f.label}: give the registered site` }; return { value: { kind: 'site', site: s } }; }
      if (l.kind === 'point') { const p = checkPoint(f.label, l.point); return 'error' in p ? p : { value: { kind: 'point', point: p.point } }; }
      if (l.kind === 'address') { const a = checkType({ ...f, type: 'address', acceptsText: false }, l.address, ctx); return 'error' in a ? a : { value: { kind: 'address', address: a.value } }; }
      const t = str(l.text); if (!t) return { error: `${f.label}: describe the place` }; return { value: { kind: 'described', text: t } };
    }
    case 'geometry': {
      const gm = v as Partial<Geometry> | null;
      if (!gm || typeof gm !== 'object' || !['Point', 'LineString', 'Polygon'].includes(gm.type as string)) return { error: `${f.label}: draw or give the area, line or point` };
      const pts: unknown[] = gm.type === 'Point' ? [gm.coordinates] : gm.type === 'LineString' ? (gm.coordinates as unknown[]) ?? [] : ((gm.coordinates as unknown[][]) ?? [])[0] ?? [];
      if (!Array.isArray(pts) || !pts.length || pts.length > 2000) return { error: `${f.label}: give between 1 and 2000 positions` };
      for (const c of pts) { const p = checkPoint(f.label, Array.isArray(c) ? { lng: c[0], lat: c[1] } : null); if ('error' in p) return p; }
      if (gm.type === 'Polygon') {
        const ring = pts as number[][];
        if (ring.length < 4 || ring[0]![0] !== ring[ring.length - 1]![0] || ring[0]![1] !== ring[ring.length - 1]![1]) return { error: `${f.label}: an area needs at least three corners and must close on its first corner` };
      }
      return { value: { type: gm.type, coordinates: gm.coordinates } };
    }
    case 'party': {
      if (text) { const one = { kind: (f.parties ?? ['person'])[0], name: normalise(v as string) }; return { value: f.multiple ? [one] : one }; }
      const p = v as Partial<PartyRef> | null;
      const kinds = f.parties ?? ['person', 'organisation'];
      const one = (x: Partial<PartyRef> | null): { value: PartyRef } | { error: string } => {
        if (!x || typeof x !== 'object' || !kinds.includes(x.kind as PartyRef['kind'])) return { error: `${f.label}: say whether it is ${kinds.map(k => (k === 'person' ? 'a person' : k === 'organisation' ? 'an organisation' : 'an institution')).join(' or ')}` };
        const name = str(x.name), ref = str(x.ref).toUpperCase();
        if (!name && !ref) return { error: `${f.label}: give the name, or the register reference` };
        return { value: { kind: x.kind as PartyRef['kind'], name, ...(ref ? { ref } : {}) } };
      };
      if (f.multiple) {
        if (!Array.isArray(v)) return { error: `${f.label} must be a list` };
        const out: PartyRef[] = [];
        for (const x of v) { const r = one(x as Partial<PartyRef>); if ('error' in r) return r; out.push(r.value); }
        return { value: out };
      }
      return one(p);
    }
    case 'dateRange': {
      const r = (typeof v === 'string' && f.allowSingle ? { from: v } : v) as Partial<DateRange> | null;
      if (!r || typeof r !== 'object' || typeof r.from !== 'string' || !ISO_DATE.test(r.from)) return { error: `${f.label}: give the start date` };
      if (r.to !== undefined && r.to !== '' && (typeof r.to !== 'string' || !ISO_DATE.test(r.to))) return { error: `${f.label}: the end date must be a date` };
      if (!f.allowSingle && !r.to) return { error: `${f.label}: give the end date` };
      if (r.to && r.to < r.from) return { error: `${f.label}: the end date must be on or after the start date` };
      return { value: { from: r.from, ...(r.to ? { to: r.to } : {}) } };
    }
    case 'quantity': {
      const q = v as Partial<Quantity> | null;
      if (!q || typeof q !== 'object' || typeof q.amount !== 'number' || !Number.isFinite(q.amount) || q.amount < 0) return { error: `${f.label}: give the quantity as a number, zero or more` };
      if (typeof q.unit !== 'string' || (f.units?.length ? !f.units.includes(q.unit) : !q.unit.trim())) return { error: `${f.label}: choose the unit${f.units?.length ? ` (${f.units.join(', ')})` : ''}` };
      return { value: { amount: q.amount, unit: q.unit } };
    }
    case 'contact': {
      const c = v as Partial<Contact> | null;
      const methods = f.contactMethods ?? ['email', 'phone', 'post', 'in-person'];
      if (!c || typeof c !== 'object' || !methods.includes(c.method as Contact['method'])) return { error: `${f.label}: choose how to be contacted` };
      const val = str(c.value);
      if (c.method === 'email' && !new RegExp(PATTERNS.email!.re).test(val)) return { error: `${f.label}: enter an email address, like name@example.org` };
      if (c.method === 'phone' && !new RegExp(PATTERNS.phone!.re).test(val)) return { error: `${f.label}: enter a phone number in international format, starting with +` };
      if (c.method === 'post' && !val) return { error: `${f.label}: enter the postal address` };
      return { value: { method: c.method, ...(val && c.method !== 'in-person' ? { value: val } : {}) } };
    }
    case 'attestation': {
      const a = v as { version?: unknown; confirmed?: unknown } | null;
      const att = f.attestation;
      if (!a || typeof a !== 'object' || !att) return { error: message(f, 'required', ctx) };
      if (a.version !== att.version) return { error: `${f.label}: the wording has changed since you read it. Read it again and confirm` };
      const keys = att.statements.map(s => s.key);
      const confirmed = Array.isArray(a.confirmed) ? a.confirmed.filter((x): x is string => typeof x === 'string') : a.confirmed === true ? keys : [];
      if (keys.some(k => !confirmed.includes(k))) return { error: message(f, 'required', ctx) };
      return { value: { version: att.version, confirmed: keys } };
    }
    case 'group': {
      const items = f.items ?? [];
      const rows: unknown = typeof v === 'string' && f.textLines && ctx.mode === 'partial'
        ? v.split('\n').map(l => l.trim()).filter(Boolean).map(l => Object.fromEntries(l.split('|').map((x, i) => [items[i]?.key ?? `c${i}`, x.trim()])))
        : f.multiple ? v : [v];
      if (typeof v === 'string' && f.textLines && ctx.mode === 'partial') return { value: v }; // kept as the official wrote it; the register reads the lines
      if (!Array.isArray(rows) || rows.some(r => !r || typeof r !== 'object' || Array.isArray(r))) return { error: `${f.label} must be ${f.multiple ? 'a list of items' : 'a set of answers'}` };
      const out: Record<string, unknown>[] = [];
      for (const [i, row] of (rows as Record<string, unknown>[]).entries()) {
        const sub = checkAnswers(items, row, { ...ctx, mode: 'submit', existing: undefined, currency: undefined, options: Object.fromEntries(Object.entries(ctx.options ?? {}).filter(([k]) => k.startsWith(`${f.key}.`)).map(([k, x]) => [k.slice(f.key.length + 1), x])) }, `field.${f.key}.item.`);
        if (sub.errors.length) return { error: `${f.label}${f.multiple ? ` ${i + 1}` : ''}: ${sub.errors[0]!.message}` };
        out.push(sub.values);
      }
      return { value: f.multiple ? out : out[0] };
    }
    case 'identifierReference':
    case 'registryReference': {
      const one = (x: unknown): { value: string } | { error: string } => {
        if (typeof x !== 'string') return { error: `${f.label} must be a reference` };
        const s = x.trim();
        if (s.length > (f.max ?? 100)) return { error: `${f.label} must be ${f.max ?? 100} characters or fewer` };
        return { value: f.type === 'registryReference' ? s.toUpperCase() : s };
      };
      if (f.multiple) {
        const list = Array.isArray(v) ? v : typeof v === 'string' && f.acceptsText ? listOf(v) : null;
        if (!list) return { error: `${f.label} must be a list of references` };
        const out: string[] = [];
        for (const x of list) { const r = one(x); if ('error' in r) return r; if (r.value) out.push(r.value); }
        return { value: [...new Set(out)] };
      }
      return one(v);
    }
    default: {
      const max = f.max ?? (f.type === 'longtext' ? 20_000 : 500);
      if (typeof v !== 'string' || v.length > max) return { error: `${f.label} must be text (at most ${max} characters)` };
      return { value: v };
    }
  }
}

/** The same first checks as a registered site's position (lib/data/facilities.ts placePoint()); the map check is the server's. */
function checkPoint(label: string, v: unknown): { point: Point } | { error: string } {
  const p = v as Partial<Record<'lng' | 'lat', unknown>> | null;
  const lng = typeof p?.lng === 'string' ? Number(p.lng) : p?.lng, lat = typeof p?.lat === 'string' ? Number(p.lat) : p?.lat;
  if (typeof lng !== 'number' || typeof lat !== 'number' || !Number.isFinite(lng) || !Number.isFinite(lat)) return { error: `${label}: give the longitude and latitude as numbers` };
  if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return { error: `${label}: latitude must be between −90 and 90 and longitude between −180 and 180` };
  if (lng === 0 && lat === 0) return { error: `${label}: 0, 0 is in the ocean off West Africa: the position was probably not captured` };
  return { point: { lng, lat } };
}

/** Whether a registered rule's condition (`field` with `equals` or `in`) holds. */
function registeredConditionHolds(p: Record<string, unknown> | undefined, all: Record<string, unknown>): boolean {
  if (!p || typeof p.field !== 'string') return false;
  const o = all[p.field];
  const vals = Array.isArray(o) ? o : isEmpty(o) ? [] : [o];
  if (Array.isArray(p.in)) return vals.some(x => (p.in as unknown[]).some(y => String(y) === String(x)));
  if (p.equals !== undefined) return vals.some(x => String(x) === String(p.equals));
  return vals.length > 0;
}
/** The message of a registered rule: the field's own text for that rule, else the rule's name in words, translated through the review. */
function registeredMessage(f: ContractField, name: string, ctx: CheckContext, prefix = 'field.'): string {
  const english = f.errors?.[name] ?? `${f.label}: ${RULE_REGISTRY[name]?.label.toLowerCase() ?? name}`;
  return ctx.text ? ctx.text(`${prefix}${f.key}.error.${name}`, english) : english;
}
/**
 * Whether an answer fails a registered rule the browser and server both run
 * (scope `client`); server, system, officer, document and binding rules are
 * applied elsewhere and pass here.
 */
function registeredFails(name: string, p: Record<string, unknown>, v: unknown, all: Record<string, unknown>, ctx: CheckContext): boolean {
  if (RULE_REGISTRY[name]?.scope !== 'client') return false;
  const num = (x: unknown) => (typeof x === 'number' ? x : undefined);
  switch (name) {
    case 'length': { const s = textValue(v); if (s === null) return false; const n = [...s].length; return (num(p.min) !== undefined && n < num(p.min)!) || (num(p.max) !== undefined && n > num(p.max)!); }
    case 'date_not_in_future': { const d = typeof v === 'string' ? v.slice(0, 10) : ''; return !!ctx.today && !!d && d > ctx.today; }
    case 'date_not_before': { const d = typeof v === 'string' ? v.slice(0, 10) : ''; const ref = p.reference === 'submission_date' || !p.reference ? ctx.today : typeof all[String(p.reference)] === 'string' ? String(all[String(p.reference)]).slice(0, 10) : undefined; return !!ref && !!d && d < ref; }
    case 'integer_range': return typeof v !== 'number' || !Number.isInteger(v) || (num(p.min) !== undefined && v < num(p.min)!) || (num(p.max) !== undefined && v > num(p.max)!);
    case 'must_match': { const other = all[String(p.field)]; const expected = Array.isArray(p.true_when) ? (p.true_when as unknown[]).some(x => String(x) === String(other)) : false; return isEmpty(other) ? false : v !== expected; }
    case 'must_be_true': return v !== true;
    case 'coordinate_range': {
      const pt = (v ?? {}) as { lat?: unknown; lng?: unknown };
      const [la0, la1] = Array.isArray(p.latitude) ? (p.latitude as number[]) : [-90, 90];
      const [lo0, lo1] = Array.isArray(p.longitude) ? (p.longitude as number[]) : [-180, 180];
      return typeof pt.lat !== 'number' || typeof pt.lng !== 'number' || pt.lat < la0! || pt.lat > la1! || pt.lng < lo0! || pt.lng > lo1!;
    }
    case 'email_format': { const s = textValue(v); return s !== null && !new RegExp(PATTERNS.email!.re).test(s.trim()); }
    case 'phone_format': { const s = textValue(v); return s !== null && !/^\+?[0-9][0-9 ()-]{5,24}$/.test(s.trim()); }
    case 'iso3166_country_code_valid': { const s = typeof v === 'string' ? v : ''; return !/^[A-Z]{2}$/.test(s); }
    case 'at_least_one_permitted_contact_method': { const c = v as { method?: string } | null; return !c || !c.method; }
    case 'NONNEGATIVE': { const n = typeof v === 'number' ? v : v && typeof v === 'object' && typeof (v as { amount?: unknown }).amount === 'number' ? (v as { amount: number }).amount : undefined; return n !== undefined && n < 0; }
    case 'APPROVER-DIFFERS-FROM-MAKER': case 'SEPARATION-OF-DUTIES': case 'PERSON-DIFFERS-FROM-REVIEWER': case 'PERSON-DIFFERS-FROM-PROPOSER': {
      // The same person named twice: compared on the answers here; the platform's own dual control (personOf()) applies to the officials who act.
      const others = Array.isArray(p.fields) ? (p.fields as string[]) : DIFFERS_FROM[name] ?? [];
      const id = (x: unknown) => (typeof x === 'string' ? x.trim().toLowerCase() : x && typeof x === 'object' && 'ref' in x ? String((x as { ref: unknown }).ref).trim().toLowerCase() : '');
      return !isEmpty(v) && others.some(k => !isEmpty(all[k]) && id(all[k]) === id(v));
    }
    default: return false;
  }
}

/** The text a length or pattern rule reads. */
const textValue = (v: unknown): string | null => (typeof v === 'string' ? v : v && typeof v === 'object' && !Array.isArray(v) && Object.values(v).every(x => typeof x === 'string') && !('kind' in v) && !('line1' in v) ? textOf(v) : null);
/** How many items a list answer has. */
const countOf = (v: unknown): number => (Array.isArray(v) ? v.length : isEmpty(v) ? 0 : 1);

/**
 * Check answers against the fields: types, the approved lists, every named
 * rule (cross-field rules against the other answers and, for a step, the
 * answers already on the case), and in submit mode what is required (a
 * conditional field only when it is asked). Answers come back normalised.
 * Rules only the server can apply (existingRecord, unique, signature,
 * verifiedChannel, profile, verifyWith, the map check of a position) are
 * left to it.
 */
export function checkAnswers(fields: ContractField[], input: Record<string, unknown> | undefined, ctx: CheckContext, prefix = 'field.'): { values: Record<string, unknown>; errors: FieldError[] } {
  const values: Record<string, unknown> = {};
  const errors: FieldError[] = [];
  for (const [k, v] of Object.entries(input ?? {})) {
    const f = fields.find(x => x.key === k);
    if (!f) { errors.push({ field: k, rule: 'unknown', message: `This procedure has no field ${k}` }); continue; }
    if (v === null || v === '') { values[k] = ''; continue; }
    const t = checkType(f, v, ctx);
    if ('error' in t) { errors.push({ field: k, rule: 'type', message: t.error }); continue; }
    values[k] = t.value;
  }
  const all = { ...(ctx.existing ?? {}), ...values };
  for (const f of fields) {
    if (errors.some(e => e.field === f.key)) continue;
    const v = all[f.key];
    const given = f.key in values;
    const empty = isEmpty(v);
    // Required: the applicant's form only (officials complete their fields at the steps that need them), and only when asked.
    if (ctx.mode === 'submit' && forApplicant(f) && empty && shown(f, all)) {
      if (f.required) { errors.push({ field: f.key, rule: 'required', message: message(f, 'required', ctx, undefined, prefix) }); continue; }
      const when = (f.rules ?? []).find((r): r is Extract<NamedRule, { rule: 'requiredWhen' }> => r.rule === 'requiredWhen' && conditionHolds(r, all));
      if (when) { errors.push({ field: f.key, rule: 'requiredWhen', message: message(f, 'requiredWhen', ctx, undefined, prefix) }); continue; }
      const regWhen = registeredOf(f, 'required_if').find(r => registeredConditionHolds(r.params, all));
      if (regWhen) { errors.push({ field: f.key, rule: 'required_if' as RuleName, message: registeredMessage(f, 'required_if', ctx, prefix) }); continue; }
    }
    if (empty || (!given && ctx.mode === 'partial')) continue;
    for (const r of f.rules ?? []) {
      let bad: { rule: RuleName; p?: MsgParams } | null = null;
      switch (r.rule) {
        case 'length': { const s = textValue(v); const n = s === null ? 0 : [...s].length; if (s !== null && ((r.max !== undefined && n > r.max) || (r.min !== undefined && n < r.min))) bad = { rule: 'length', p: r.max !== undefined && n > r.max ? { max: r.max } : { min: r.min } }; break; }
        case 'pattern': {
          const p = PATTERNS[r.pattern];
          const vals = Array.isArray(v) ? v : [v];
          if (p && vals.some(x => { const s = textValue(x); return s !== null && !new RegExp(p.re, p.flags).test(s.trim()); })) bad = { rule: 'pattern', p: { pattern: r.pattern } };
          break;
        }
        case 'range': {
          const n = typeof v === 'number' ? v : (v as Money)?.minor ?? (v as Quantity)?.amount;
          if (typeof n === 'number' && ((r.min !== undefined && n < r.min) || (r.max !== undefined && n > r.max))) bad = { rule: 'range', p: { min: r.min, max: r.max } };
          break;
        }
        case 'notAfter':
        case 'notBefore': {
          const other = r.than === 'today' ? ctx.today : typeof all[r.than] === 'string' ? all[r.than] as string : undefined;
          const mine = typeof v === 'string' ? v.slice(0, 10) : (v as DateRange)?.from;
          const end = typeof v === 'string' ? v.slice(0, 10) : (v as DateRange)?.to ?? (v as DateRange)?.from;
          if (other && ISO_DATE.test(other) && (r.rule === 'notAfter' ? (end ?? '') > other : (mine ?? '') < other)) bad = { rule: r.rule, p: r.than === 'today' ? {} : { other: fields.find(x => x.key === r.than)?.label ?? r.than } };
          break;
        }
        case 'mustBeTrue': if (v !== true) bad = { rule: 'mustBeTrue' }; break;
        case 'minItems': if (countOf(v) < r.min) bad = { rule: 'minItems', p: { min: r.min } }; break;
        case 'maxItems': if (countOf(v) > r.max) bad = { rule: 'maxItems', p: { max: r.max } }; break;
        case 'registered': {
          const why = registeredFails(r.name, (r.params ?? {}) as Record<string, unknown>, v, all, ctx);
          if (why) { errors.push({ field: f.key, rule: r.name as RuleName, message: registeredMessage(f, r.name, ctx, prefix) }); bad = { rule: 'registered' }; }
          break;
        }
        default: break;
      }
      if (bad) { if (bad.rule !== 'registered') errors.push({ field: f.key, rule: bad.rule, message: message(f, bad.rule, ctx, bad.p, prefix) }); break; }
    }
  }
  return { values, errors };
}

// ── Checking a definition (the designer and checkPackage()) ────────────────────
/** A field key: camelCase, or a canonical dotted id (person.name_full). */
export const FIELD_KEY = /^(?:[a-z][A-Za-z0-9]{0,40}|[a-z][a-z0-9_]{0,40}(?:\.[a-z0-9_]{1,40}){1,3})$/;
const SERVICE_ID = /^[a-z][a-z0-9]*(?:[.-][a-z0-9]+)*$/;
const LIST_NAME = /^[a-z][a-z0-9_.-]{1,80}$/;
const TEXTISH = ['text', 'longtext', 'localizedText', 'identifierReference', 'registryReference', 'person', 'organisation', 'place'];

/** Why a field does not fit the contract, or null. `keys` are the procedure's field keys; `classes` its document classes; `lists` its configured lists. */
export function fieldProblem(f: ContractField, keys: string[], classes: string[], nested = false): string | null {
  const at = `Field ${f.key}`;
  if (nested && !FIELD_KEY.test(f.key)) return `${at}: keys are names in camelCase or canonical dotted ids`;
  if (!FIELD_TYPES.includes(f.type as FormFieldType)) return `${at}: unknown type ${f.type}`;
  if (typeof f.label !== 'string' || !f.label.trim() || f.label.length > 300) return `${at}: give it a plain-language label (at most 300 characters)`;
  if (f.hint !== undefined && (typeof f.hint !== 'string' || f.hint.length > 400)) return `${at}: the hint is at most 400 characters`;
  if (f.section !== undefined && (typeof f.section !== 'string' || f.section.length > 120)) return `${at}: the section title is at most 120 characters`;
  if (f.personalDataClass !== undefined && !CLASS_KEYS.includes(f.personalDataClass)) return `${at}: the personal-data class is one of ${CLASS_KEYS.join(', ')}`;
  if (f.personalDataClass !== undefined && f.personal !== undefined && f.personal !== PERSONAL_CLASSES.includes(f.personalDataClass)) return `${at}: personal and its personal-data class disagree`;
  if (f.confidentiality !== undefined && !CONFIDENTIALITY.some(c => c.key === f.confidentiality)) return `${at}: confidentiality is commercial, tax or financial`;
  if (f.audience !== undefined && !['applicant', 'officer', 'system'].includes(f.audience)) return `${at}: answered by the applicant, an official or the platform`;
  if (f.multiple && !['enum', 'registryReference', 'identifierReference', 'party', 'document', 'group'].includes(f.type)) return `${at}: this kind of question takes one answer`;
  if (f.showWhen && (!keys.includes(f.showWhen.field) || f.showWhen.field === f.key)) return `${at}: it is shown depending on another field of the procedure`;
  if (f.raisesSensitivity && f.type !== 'boolean') return `${at}: only a yes-or-no question can ask for confidentiality`;
  if (f.acceptsText && !['location', 'party', 'enum', 'address', 'registryReference'].includes(f.type)) return `${at}: only locations, parties, lists, addresses and references keep an earlier text form`;
  if (f.textLines && f.type !== 'group') return `${at}: only a group can be given as lines`;
  for (const [r, t] of Object.entries(f.errors ?? {})) if ((!(r in RULE_LABEL) && !isRegisteredRule(r)) || typeof t !== 'string' || !t.trim() || t.length > 200) return `${at}: error text for ${r} must be plain words (at most 200 characters)`;
  if (f.type === 'enum') {
    const s = f.valuesSource;
    if (!s) return `${at}: a choice from an approved list names where the list comes from`;
    if (s.kind === 'list') {
      if (!s.values?.length) return `${at}: the approved list needs its values`;
      if (new Set(s.values.map(v => v.value)).size !== s.values.length || s.values.some(v => !/^[a-z0-9][a-z0-9_-]{0,60}$/.test(v.value) || !v.label?.trim())) return `${at}: list values are distinct lowercase words with a label`;
    } else if (s.kind === 'register') { if (!VALUE_REGISTERS.some(r => r.key === s.register)) return `${at}: unknown register list ${s.register}`; }
    else if (s.kind === 'rules') { if (!/^[a-z][a-z0-9.-]{1,60}\.$/.test(s.prefix ?? '')) return `${at}: a rule prefix ends with a dot (e.g. tax.)`; }
    else if (s.kind === 'tariff') { if (!/^[a-z][a-z0-9.-]{2,80}$/.test(s.rule ?? '')) return `${at}: name the tariff rule (e.g. customs.tariff)`; }
    else if (s.kind === 'configured') { if (!LIST_NAME.test(s.list ?? '')) return `${at}: name the configured list`; }
    else if (s.kind !== 'regions') return `${at}: unknown kind of list`;
  } else if (f.valuesSource && f.type !== 'money') return `${at}: only a choice from an approved list has a list`;
  if (f.type === 'registryReference' && !REFERENCE_REGISTERS.some(r => r.key === f.register) && !/^[a-z][a-z0-9_.-]{1,80}$/.test(f.register ?? '')) return `${at}: name the register the reference points into (${REFERENCE_REGISTERS.map(r => r.key).join(', ')}, or a values source id)`;
  if (f.type === 'identifierReference' && !f.identifier?.scheme?.trim()) return `${at}: name the identifier (e.g. Birth registration number)`;
  if (f.type === 'document' && !classes.includes(f.evidence ?? '')) return `${at}: name the evidence it asks for (a document of the procedure)`;
  if (f.type === 'attestation') {
    const a = f.attestation;
    if (!a || !/^[0-9A-Za-z.-]{1,20}$/.test(a.version ?? '') || !a.statements?.length || a.statements.some(s => !/^[a-z][a-z0-9-]{0,40}$/.test(s.key) || !s.text?.trim() || s.text.length > 2000)) return `${at}: a declaration has its version and its statements (each with a key and text)`;
  }
  if (f.type === 'party' && (!f.parties?.length || f.parties.some(p => !['person', 'organisation', 'institution'].includes(p)))) return `${at}: say who it may be (person, organisation, institution)`;
  if (f.type === 'location' && f.locationKinds && (!f.locationKinds.length || f.locationKinds.some(k => !LOCATION_KINDS.some(x => x.key === k)))) return `${at}: unknown way of giving a location`;
  if (f.type === 'quantity' && f.units && (!f.units.length || f.units.some(u => typeof u !== 'string' || !u.trim() || u.length > 20))) return `${at}: list the units a quantity may be given in`;
  if (f.type === 'contact' && f.contactMethods && f.contactMethods.some(m => !CONTACT_METHODS.some(x => x.key === m))) return `${at}: unknown contact method`;
  if (f.type === 'group') {
    if (!f.items?.length || f.items.length > 30) return `${at}: a group has between 1 and 30 questions`;
    const sub = f.items.map(i => i.key);
    if (new Set(sub).size !== sub.length) return `${at}: the group's questions have distinct keys`;
    for (const i of f.items) {
      if (i.type === 'group' || i.type === 'document' || i.type === 'attestation') return `${at}: a group holds simple questions (no groups, evidence or declarations inside)`;
      const why = fieldProblem(i, sub, classes, true);
      if (why) return `${at}: ${why}`;
    }
  } else if (f.items) return `${at}: only a group has questions inside`;
  for (const r of f.rules ?? []) {
    const bad = (why: string) => `${at}: ${RULE_LABEL[r.rule as RuleName] ?? r.rule} ${why}`;
    switch (r.rule) {
      case 'length': if (!TEXTISH.includes(f.type)) return bad('applies to text'); if ((r.min ?? 0) < 0 || (r.max !== undefined && (!Number.isInteger(r.max) || r.max < 1)) || (r.min === undefined && r.max === undefined)) return bad('needs a minimum or maximum'); break;
      case 'pattern': if (!PATTERNS[r.pattern]) return bad(`must be one of the approved patterns (${Object.keys(PATTERNS).join(', ')})`); if (!TEXTISH.includes(f.type)) return bad('applies to text'); break;
      case 'range': if (!['number', 'money', 'quantity'].includes(f.type)) return bad('applies to numbers, amounts and quantities'); if (r.min === undefined && r.max === undefined) return bad('needs a minimum or maximum'); break;
      case 'requiredWhen': if (!keys.includes(r.field) || r.field === f.key) return bad('names another field of the procedure'); break;
      case 'notAfter': case 'notBefore': if (!['date', 'dateRange', 'timestamp'].includes(f.type)) return bad('applies to dates'); if (r.than !== 'today' && !keys.includes(r.than)) return bad('compares with today or another date field'); break;
      case 'mustBeTrue': if (f.type !== 'boolean') return bad('applies to a yes-or-no question'); break;
      case 'minItems': if (!f.multiple || !Number.isInteger(r.min) || r.min < 1) return bad('applies to a list, from 1'); break;
      case 'maxItems': if (!f.multiple || !Number.isInteger(r.max) || r.max < 1 || r.max > 1000) return bad('applies to a list, from 1 to 1000'); break;
      case 'registered': {
        if (!isRegisteredRule(r.name)) return `${at}: rule ${r.name} is not registered: only registered rules run`;
        const p = (r.params ?? {}) as Record<string, unknown>;
        if ((r.name === 'required_if' || r.name === 'must_match') && (typeof p.field !== 'string' || !keys.includes(p.field) || p.field === f.key)) return `${at}: ${r.name} names another field of the form`;
        if (r.name === 'length' && p.max !== undefined && (!Number.isInteger(p.max) || (p.max as number) < 1)) return `${at}: length needs a whole maximum`;
        break;
      }
      case 'existingRecord': if (f.type !== 'registryReference' && f.type !== 'party') return bad('applies to a register reference'); if (r.pendingProcedure !== undefined && !/^[a-z][a-z0-9]*(?:[.-][a-z0-9]+)*$/.test(r.pendingProcedure)) return bad('names a procedure key'); break;
      case 'unique': if (!['text', 'identifierReference', 'registryReference'].includes(f.type)) return bad('applies to a reference'); break;
      case 'signature': if (f.type !== 'attestation') return bad('applies to a declaration'); break;
      case 'verifiedChannel': if (f.type !== 'contact') return bad('applies to a contact'); break;
      case 'profile': if (!PROFILES[r.profile] && !LIST_NAME.test(r.profile ?? '')) return bad('names a configured check'); break;
      case 'verifyWith':
        if (f.type !== 'identifierReference') return bad('applies to an identifier');
        if (!SERVICE_ID.test(r.service ?? '')) return bad('names an exchange service');
        if (!r.purpose?.trim()) return bad('states its purpose');
        if (r.basis && (!r.basis.instrument?.trim() || !r.basis.eId?.trim())) return bad('cites the provision of law that allows it (instrument and provision)');
        if (!r.input || !Object.keys(r.input).length || Object.values(r.input).some(x => x !== '$value' && !keys.includes(x))) return bad('maps the service\'s inputs to this answer ($value) or other fields');
        break;
      default: return `${at}: unknown rule ${(r as { rule: string }).rule}`;
    }
  }
  return null;
}

/** Why a form definition does not fit the contract, or null. */
export function formProblem(form: FormSpec | undefined, fields: ContractField[], documents: ContractDocument[], sensitivity: string): string | null {
  for (const d of documents) {
    if (d.citation && (!d.citation.instrument || !d.citation.eId || !d.citation.version || !d.citation.digest)) return `Document ${d.class}: cite the provision and its version from the laws register`;
    if (d.purpose !== undefined && (typeof d.purpose !== 'string' || d.purpose.length > 300)) return `Document ${d.class}: the purpose is at most 300 characters`;
    if (d.alternative !== undefined && (typeof d.alternative !== 'string' || d.alternative.length > 300)) return `Document ${d.class}: the alternative is at most 300 characters`;
    if (d.formats !== undefined && (!Array.isArray(d.formats) || d.formats.length > 10 || d.formats.some(x => typeof x !== 'string' || x.length > 40))) return `Document ${d.class}: list up to 10 accepted formats`;
  }
  if (fields.some(f => fieldClass(f) === 'special') && sensitivity === 'normal') return 'A procedure that asks for special-category data must be restricted or secret';
  if (!form) return null;
  if (typeof form.version !== 'string' || !/^[0-9A-Za-z.-]{1,20}$/.test(form.version)) return 'The form version is a short name like 1.0';
  if (form.intro !== undefined && (typeof form.intro !== 'string' || form.intro.length > 1000)) return 'The introduction is at most 1000 characters';
  if (form.declaration && (!form.declaration.text?.trim() || form.declaration.text.length > 2000 || !/^[0-9A-Za-z.-]{1,20}$/.test(form.declaration.version ?? ''))) return 'The declaration needs its text (at most 2000 characters) and a version';
  if (form.evidencePolicy !== undefined && (typeof form.evidencePolicy !== 'string' || form.evidencePolicy.length > 80)) return 'Name the evidence policy in at most 80 characters';
  for (const e of form.identityEvidence ?? []) if (!/^[a-z][a-z0-9-]{0,40}$/.test(e.key) || !e.label?.trim()) return 'Each kind of identity evidence has a key and a label';
  for (const [name, l] of Object.entries(form.lists ?? {})) {
    if (!LIST_NAME.test(name)) return `List ${name}: a list name is lowercase words`;
    if (!Array.isArray(l.values) || new Set(l.values.map(v => v.value)).size !== l.values.length || l.values.some(v => !/^[a-z0-9][a-z0-9_.-]{0,60}$/.test(v.value) || !v.label?.trim())) return `List ${name}: values are distinct lowercase words with a label`;
  }
  for (const [k, v] of Object.entries(form.policies ?? {})) if (!/^[a-z][a-z0-9_.]{1,60}$/.test(k) || (typeof v !== 'boolean' && (typeof v !== 'string' || v.length > 200))) return `Policy ${k}: a name and a short value`;
  for (const n of form.notices ?? []) if (!/^[a-z][a-z0-9_.-]{0,60}$/.test(n.key) || !n.title?.trim() || !n.text?.trim() || n.text.length > 2000) return 'Each notice has a key, a title and its text (at most 2000 characters)';
  for (const [k, v] of Object.entries(form.channels ?? {})) if (!['selfService', 'assisted', 'paper', 'lowConnectivity'].includes(k) || typeof v !== 'string' || v.length > 600) return `Channel note ${k}: at most 600 characters`;
  const known = new Map(formStrings(fields, documents, form).map(s => [s.path, s.text]));
  for (const [locale, entries] of Object.entries(form.translations ?? {})) {
    if (!/^[a-z]{2,3}$/.test(locale)) return `Translations: ${locale} is not a language code`;
    for (const [path, e] of Object.entries(entries)) {
      if (!known.has(path)) continue; // a string since removed: kept, never shown
      const why = typeof e?.target === 'string' && typeof e?.source === 'string' ? translationProblem(e.source, e.target) : 'needs its source and translation';
      if (why) return `Translation ${locale} ${path} ${why}`;
    }
  }
  return null;
}

// ── A form as it renders (resolved on the server, or in the designer from the same sources) ──
export interface ValueSnapshot {
  regions: string[];
  registers: Record<string, { value: string; label: string }[]>;
  rules: { key: string; title: string }[];
  tariffs: Record<string, { value: string; label: string }[]>;
  /** Configured lists the platform keeps elsewhere (by the specification's name). */
  configured: Record<string, { value: string; label: string }[]>;
}
export interface FieldView extends Omit<ContractField, 'items'> {
  dataClass: PersonalDataClass;
  /** Resolved choices (enum, choice). Empty when the list's source has nothing approved yet. */
  choices?: { value: string; label: string }[];
  /** Where the choices come from, in words. */
  choicesFrom?: string;
  /** Proposed by CivicOS, not yet checked against the nation's law (a configured list shipped as a starting point). */
  choicesProposed?: boolean;
  /** The rules in words, for the print form and the designer. */
  ruleText: string[];
  items?: FieldView[];
}
export interface DocumentView extends ContractDocument { requiredBy?: string }
export interface FormView {
  procedure: { key: string; version: number; title: string; state: string; reference?: boolean; library?: boolean };
  form: FormSpec | null;
  fields: FieldView[];
  documents: DocumentView[];
  currency: string;
  locale: string;
  dir: 'ltr' | 'rtl';
  /** The nation's regions (an address's or a location's region is one of them). */
  regions: string[];
}

/** The choices of an enum or choice field from a snapshot of the approved sources and the form's own lists. */
export function choicesOf(f: ContractField, s: ValueSnapshot, form?: FormSpec): { choices: { value: string; label: string }[]; from: string; proposed?: boolean } | null {
  if (f.type === 'choice') return { choices: (f.options ?? []).map(o => ({ value: o, label: o })), from: 'the procedure' };
  if (f.type !== 'enum' || !f.valuesSource) return null;
  const v = f.valuesSource;
  switch (v.kind) {
    case 'list': return { choices: v.values.map(x => ({ ...x })), from: 'a list approved with the procedure' };
    case 'regions': return { choices: s.regions.map(r => ({ value: r, label: r })), from: 'the nation\'s regions' };
    case 'register': return { choices: s.registers[v.register] ?? [], from: VALUE_REGISTERS.find(r => r.key === v.register)?.label ?? v.register };
    case 'rules': return { choices: s.rules.filter(r => r.key.startsWith(v.prefix)).map(r => ({ value: r.key.slice(v.prefix.length), label: r.title })), from: `approved rules in force (${v.prefix}…)` };
    case 'tariff': return { choices: s.tariffs[v.rule] ?? [], from: `the approved tariff ${v.rule}` };
    case 'configured': {
      const own = form?.lists?.[v.list];
      if (own) return { choices: own.values.map(x => ({ ...x })), from: `${v.list}, approved with the procedure`, ...(own.proposed ? { proposed: true } : {}) };
      return { choices: s.configured[v.list] ?? [], from: v.list };
    }
  }
}

/** The rules of a field in plain words. */
export function ruleText(f: ContractField, fields: ContractField[]): string[] {
  const label = (k: string) => fields.find(x => x.key === k)?.label ?? k;
  const out: string[] = [];
  if (f.required) out.push('Required');
  if (f.showWhen) out.push(`Asked when ${label(f.showWhen.field)} ${f.showWhen.equals !== undefined ? `is ${f.showWhen.equals}` : f.showWhen.notEquals !== undefined ? `is not ${f.showWhen.notEquals}` : 'is answered'}`);
  for (const r of f.rules ?? []) {
    switch (r.rule) {
      case 'length': out.push(r.min !== undefined && r.max !== undefined ? `${r.min} to ${r.max} characters` : r.max !== undefined ? `At most ${r.max} characters` : `At least ${r.min} characters`); break;
      case 'pattern': out.push(PATTERNS[r.pattern]?.label ?? r.pattern); break;
      case 'range': out.push(r.min !== undefined && r.max !== undefined ? `Between ${r.min} and ${r.max}` : r.min !== undefined ? `At least ${r.min}` : `At most ${r.max}`); break;
      case 'requiredWhen': out.push(`Required when ${label(r.field)} ${r.equals !== undefined ? `is ${r.equals}` : r.notEquals !== undefined ? `is not ${r.notEquals}` : 'is answered'}`); break;
      case 'notAfter': out.push(r.than === 'today' ? 'Not in the future' : `On or before ${label(r.than)}`); break;
      case 'notBefore': out.push(r.than === 'today' ? 'Not in the past' : `On or after ${label(r.than)}`); break;
      case 'mustBeTrue': out.push('Must be confirmed'); break;
      case 'minItems': out.push(`At least ${r.min}`); break;
      case 'maxItems': out.push(`At most ${r.max}`); break;
      case 'existingRecord': out.push(`Must be ${r.active ? 'an active' : 'a'} record in the ${REFERENCE_REGISTERS.find(x => x.key === f.register)?.label ?? f.register ?? 'register'}${r.pendingProcedure ? `, or an application under ${r.pendingProcedure} still open` : ''}`); break;
      case 'unique': out.push('Not already used by an open application'); break;
      case 'signature': out.push('Confirmed by the applicant, signed in or identified at an office'); break;
      case 'verifiedChannel': out.push('A verified contact channel'); break;
      case 'profile': out.push(PROFILES[r.profile] ?? `Checked against the country's configuration (${r.profile.replace(/_/g, ' ')})`); break;
      case 'verifyWith': out.push(r.basis ? `Checked with ${r.service} where the law allows (${r.basis.eId})` : `Checked with ${r.service} once the nation cites the provision that allows it`); break;
    }
  }
  return out;
}

/** A form as it renders: fields with their resolved choices, wording in the language asked for (reviewed translations only). */
export function resolveForm(pkg: { key: string; version: number; title: string; state: string; reference?: boolean; library?: boolean; fields: ContractField[]; documents: ContractDocument[]; form?: FormSpec }, s: ValueSnapshot, opts: { locale: string; currency: string; dir?: 'ltr' | 'rtl' }): FormView {
  const tr = localiser(pkg.form, opts.locale);
  const view = (f: ContractField, prefix: string, siblings: ContractField[]): FieldView => {
    const c = choicesOf(f, s, pkg.form);
    const p = `${prefix}${f.key}`;
    const listName = f.valuesSource?.kind === 'configured' ? f.valuesSource.list : null;
    const { items: _items, ...own } = f;
    return {
      ...own,
      label: tr(`${p}.label`, f.label),
      ...(f.hint ? { hint: tr(`${p}.hint`, f.hint) } : {}),
      ...(f.section ? { section: tr(`${p}.section`, f.section) } : {}),
      ...(f.errors ? { errors: Object.fromEntries(Object.entries(f.errors).map(([r, t]) => [r, tr(`${p}.error.${r}`, t!)])) } : {}),
      ...(f.attestation ? { attestation: { ...f.attestation, statements: f.attestation.statements.map(x => ({ ...x, text: tr(`${p}.statement.${x.key}`, x.text) })) } } : {}),
      dataClass: fieldClass(f),
      ...(c ? {
        choices: c.choices.map(x => ({ ...x, label: f.valuesSource?.kind === 'list' ? tr(`${p}.value.${x.value}`, x.label) : listName && pkg.form?.lists?.[listName] ? tr(`list.${listName}.${x.value}`, x.label) : x.label })),
        choicesFrom: c.from, ...(c.proposed ? { choicesProposed: true } : {}),
      } : {}),
      ruleText: ruleText(f, siblings),
      ...(f.items ? { items: f.items.map(i => view(i, `${p}.item.`, f.items!)) } : {}),
    };
  };
  const fields = pkg.fields.map(f => view(f, 'field.', pkg.fields));
  const documents: DocumentView[] = pkg.documents.map(d => ({
    ...d, label: tr(`document.${d.class}.label`, d.label),
    ...(d.purpose ? { purpose: tr(`document.${d.class}.purpose`, d.purpose) } : {}),
    ...(d.alternative ? { alternative: tr(`document.${d.class}.alternative`, d.alternative) } : {}),
    ...(d.citation ? { requiredBy: citationText(d.citation) } : {}),
  }));
  let form: FormSpec | null = null;
  if (pkg.form) {
    const { translations: _t, ...rest } = pkg.form;
    form = {
      ...rest,
      ...(rest.intro ? { intro: tr('form.intro', rest.intro) } : {}),
      ...(rest.declaration ? { declaration: { ...rest.declaration, text: tr('form.declaration', rest.declaration.text) } } : {}),
      ...(rest.identityEvidence ? { identityEvidence: rest.identityEvidence.map(e => ({ ...e, label: tr(`form.identity.${e.key}`, e.label) })) } : {}),
      ...(rest.notices ? { notices: rest.notices.map(n => ({ ...n, title: tr(`form.notice.${n.key}.title`, n.title), text: tr(`form.notice.${n.key}.text`, n.text) })) } : {}),
      ...(rest.channels ? { channels: Object.fromEntries(Object.entries(rest.channels).map(([k, t]) => [k, tr(`form.channel.${k}`, t!)])) } : {}),
    };
  }
  return { procedure: { key: pkg.key, version: pkg.version, title: pkg.title, state: pkg.state, ...(pkg.reference ? { reference: true } : {}), ...(pkg.library ? { library: true } : {}) }, form, fields, documents, currency: opts.currency, locale: opts.locale, dir: opts.dir ?? 'ltr', regions: [...s.regions] };
}

/** A citation in words: "Civil Registration Act, provision 12 (version …)". */
export function citationText(c: Pick<Citation, 'title' | 'instrument' | 'num' | 'eId' | 'version'>): string {
  return `${c.title ?? c.instrument}, ${c.num ? `provision ${c.num}` : c.eId} (version ${c.version})`;
}

/** The options of each enum field in a resolved form (and of enum questions inside groups, as group.key), for checkAnswers(). */
export function optionsOf(view: Pick<FormView, 'fields'>): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  for (const f of view.fields) {
    if (f.type === 'enum' && f.choices) out[f.key] = f.choices.map(c => c.value);
    for (const i of f.items ?? []) if (i.type === 'enum' && i.choices) out[`${f.key}.${i.key}`] = i.choices.map(c => c.value);
  }
  return out;
}
