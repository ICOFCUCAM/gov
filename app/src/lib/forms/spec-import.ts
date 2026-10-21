// Loading form contracts written in the specification's shape
// (docs/INSTITUTIONAL_ARCHITECTURE_SPEC.md: `form_id`, `record_type`,
// `version`, `fields` with `id`, `type`, `required`, `required_when`,
// `validation`, `values`, `values_source`, `personal_data_class`, and the
// `rules`, `decision` or `controls` a form states) into the form contract
// (lib/forms/contract.ts), with no code per form. The specification's sixteen
// forms load this way (lib/forms/library), and so will the full catalogue of
// a government's forms, which arrives as JSON in the same shape.
//
// Every type, validation and class the loader knows maps to the contract and
// its building blocks (lib/forms/blocks.ts). What it cannot express it says,
// field by field, in the report, and never drops: an unknown type becomes a
// long-text answer marked not expressed; an unknown validation becomes a
// check the country configures (recorded as not performed until it is); an
// unknown class is held as restricted. A loaded form is a draft: it is
// approved only with the procedure it belongs to, by two officials.

import { fieldProblem, formProblem, type ContractDocument, type ContractField, type FormSpec, type NamedRule, type PersonalDataClass, type Confidentiality, CLASS_RANK } from './contract';
import * as B from './blocks';


/** A form contract in the specification's shape. */
export interface SpecFormJson {
  form_id: string;
  record_type?: string;
  version?: string;
  fields: SpecFieldJson[];
  rules?: Record<string, unknown>;
  decision?: Record<string, unknown>;
  controls?: Record<string, unknown>;
}
export interface SpecFieldJson {
  id: string;
  type: string;
  required?: boolean;
  required_when?: string;
  validation?: string;
  values?: string[];
  values_source?: string;
  personal_data_class?: string;
  evidence?: string;
}

/** What the loader did with a field, or could not do. */
export interface ImportNote { field?: string; kind: 'configured' | 'not-expressed' | 'stricter' | 'problem'; note: string }

/** A form definition: fields, evidence and form metadata, ready to attach to a procedure package or keep in the library. */
export interface FormDefinition { key: string; title: string; fields: ContractField[]; documents: ContractDocument[]; form: FormSpec }

export const camel = (id: string) => id.toLowerCase().replace(/[^a-z0-9]+([a-z0-9])/g, (_, c: string) => c.toUpperCase()).replace(/^[^a-z]+/, '');
export const kebab = (id: string) => id.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const human = (id: string) => { const s = id.replace(/_/g, ' ').trim(); return s ? s[0]!.toUpperCase() + s.slice(1) : id; };

// ── Personal-data classes ──────────────────────────────────────────────────────
/** The specification's classes, held at least as strictly. */
export const SPEC_CLASSES: Record<string, { cls: PersonalDataClass; confidentiality?: Confidentiality }> = {
  public: { cls: 'public' },
  administrative: { cls: 'administrative' },
  personal: { cls: 'personal' },
  restricted: { cls: 'restricted' },
  special: { cls: 'special' },
  sensitive: { cls: 'special' },
  commercial: { cls: 'administrative', confidentiality: 'commercial' },
  commercial_confidential: { cls: 'restricted', confidentiality: 'commercial' },
  business_confidential_or_personal: { cls: 'restricted', confidentiality: 'commercial' },
  tax_confidential: { cls: 'restricted', confidentiality: 'tax' },
  financial: { cls: 'restricted', confidentiality: 'financial' },
};

// ── Validations ────────────────────────────────────────────────────────────────
/** The specification's validation names and the named rules that carry them. */
export const SPEC_VALIDATIONS: Record<string, { rules: NamedRule[]; note?: string; byType?: string }> = {
  verify_with_authorized_identity_service_if_lawful: { rules: [{ rule: 'verifyWith', service: 'person.verify', input: { registration: '$value' }, purpose: 'Confirm the applicant\'s identity for this application' }], note: 'Checked with person.verify only once the nation cites the provision that allows it; until then recorded as not performed' },
  must_reference_existing_organisation_or_authorized_pending_registration: { rules: [{ rule: 'existingRecord', pendingProcedure: 'org.registration' }] },
  trim_unicode_normalize_length_limit: { rules: [{ rule: 'length', min: 1, max: 300 }], byType: 'localizedText normalises (NFC, trimmed, single spaces)' },
  country_address_profile: { rules: [{ rule: 'profile', profile: 'country_address_profile' }], byType: 'structured address' },
  verified_channel: { rules: [{ rule: 'verifiedChannel' }] },
  approved_evidence_policy: { rules: [{ rule: 'profile', profile: 'evidence-policy' }] },
  approved_document_policy: { rules: [{ rule: 'profile', profile: 'evidence-policy' }] },
  required_document_policy_for_procedure: { rules: [{ rule: 'profile', profile: 'evidence-policy' }] },
  valid_signature_and_versioned_text: { rules: [{ rule: 'signature' }], byType: 'versioned declaration text' },
  valid_signature_and_authorized_signer: { rules: [{ rule: 'signature' }, { rule: 'profile', profile: 'authorised-representation' }] },
  valid_signature_and_policy_version: { rules: [{ rule: 'signature' }], byType: 'versioned declaration text' },
  active_organization_and_authorized_representation: { rules: [{ rule: 'existingRecord', active: true }, { rule: 'profile', profile: 'authorised-representation' }] },
  country_configured_unique_reference: { rules: [{ rule: 'unique' }] },
  transport_document_profile: { rules: [{ rule: 'pattern', pattern: 'document-reference' }, { rule: 'profile', profile: 'transport-document' }] },
  approved_country_code_list: { rules: [], byType: 'choice from the approved country list' },
  minimum_one_line: { rules: [{ rule: 'minItems', min: 1 }] },
  approved_currency_code: { rules: [], byType: 'choice from the approved currency list' },
  verify_existing_organization_or_approved_exception: { rules: [{ rule: 'existingRecord' }, { rule: 'profile', profile: 'approved-exception' }], note: 'Stricter: an organisation not in the register is refused until an exception procedure exists' },
  length_limit: { rules: [{ rule: 'length', min: 1, max: 200 }] },
  valid_national_place_reference: { rules: [], byType: 'location: a region from the nation\'s list, a registered site, a position inside the nation, or an address' },
  active_institutions_only: { rules: [], byType: 'choice from the institution register' },
  authorized_procuring_entity: { rules: [{ rule: 'profile', profile: 'procuring-entity' }] },
  plain_language_and_length_limit: { rules: [{ rule: 'pattern', pattern: 'plain-language' }, { rule: 'length', min: 1, max: 2000 }] },
  active_appropriation_with_sufficient_authority: { rules: [{ rule: 'existingRecord', active: true }, { rule: 'profile', profile: 'appropriation-authority' }] },
  nonnegative_decimal_and_currency_required: { rules: [{ rule: 'range', min: 0 }], byType: 'money: whole minor units with the currency' },
  valid_under_national_timetable: { rules: [{ rule: 'profile', profile: 'national-timetable' }] },
  configured_separation_of_duties: { rules: [{ rule: 'profile', profile: 'separation-of-duties' }] },
};

// ── Types ──────────────────────────────────────────────────────────────────────
type Maker = (o: { key: string; id: string; label: string; field: SpecFieldJson; form: string }) => B.BlockResult;
const configured = (field: SpecFieldJson, fallback: string) => ({ kind: 'configured' as const, list: field.values_source ?? fallback });
const enumField = (o: Parameters<Maker>[0], multiple: boolean, fallback?: string): B.BlockResult => ({ fields: [{
  key: o.key, label: o.label, type: 'enum', ...(multiple ? { multiple: true } : {}),
  valuesSource: o.field.values?.length ? { kind: 'list', values: o.field.values.map(v => ({ value: v, label: human(v) })) } : configured(o.field, fallback ?? o.field.type),
}] });
const doc = (o: Parameters<Maker>[0], multiple: boolean, label?: string) => B.evidence({ key: o.key, label: label ?? o.label, evidenceClass: kebab(o.id), multiple, documentRequired: !!o.field.required });
const group = (o: Parameters<Maker>[0], items: ContractField[], multiple = false): B.BlockResult => ({ fields: [{ key: o.key, label: o.label, type: 'group', items, ...(multiple ? { multiple: true } : {}) }] });
const register = (o: Parameters<Maker>[0], reg: string, multiple = false): B.BlockResult => ({ fields: [{ key: o.key, label: o.label, type: 'registryReference', register: reg, ...(multiple ? { multiple: true } : {}), rules: [{ rule: 'existingRecord' }] }] });

/** The specification's types and the contract fields (or blocks) that carry them. */
export const SPEC_TYPES: Record<string, Maker> = {
  string: o => ({ fields: [{ key: o.key, label: o.label, type: 'text' }] }),
  text: o => ({ fields: [{ key: o.key, label: o.label, type: 'text' }] }),
  long_text: o => ({ fields: [{ key: o.key, label: o.label, type: 'longtext' }] }),
  localized_text: o => ({ fields: [{ key: o.key, label: o.label, type: 'localizedText' }] }),
  date: o => ({ fields: [{ key: o.key, label: o.label, type: 'date' }] }),
  timestamp: o => ({ fields: [{ key: o.key, label: o.label, type: 'timestamp', rules: [{ rule: 'notAfter', than: 'today' }] }] }),
  date_range: o => ({ fields: [{ key: o.key, label: o.label, type: 'dateRange' }] }),
  date_or_date_range: o => ({ fields: [{ key: o.key, label: o.label, type: 'dateRange', allowSingle: true }] }),
  money: o => ({ fields: [{ key: o.key, label: o.label, type: 'money' }] }),
  quantity_with_unit: o => ({ fields: [{ key: o.key, label: o.label, type: 'quantity' }] }),
  enum: o => enumField(o, false),
  'array<enum>': o => enumField(o, true),
  controlled_vocabulary: o => enumField(o, false, `${o.form}.${o.id}`),
  'array<controlled_vocabulary>': o => enumField(o, true, `${o.form}.${o.id}`),
  controlled_multiselect: o => enumField(o, true, `${o.form}.${o.id}`),
  structured_checklist: o => enumField(o, true, `${o.form}.${o.id}`),
  configured_classification: o => enumField(o, false), configured_permit_type: o => enumField(o, false), configured_benefit_programme: o => enumField(o, false),
  configured_programme: o => enumField(o, false), configured_profession: o => enumField(o, false), configured_scope_category: o => enumField(o, false),
  configured_court_reference: o => enumField(o, false), configured_case_type: o => enumField(o, false), configured_transaction_type: o => enumField(o, false),
  approved_payment_method: o => enumField(o, false),
  approved_tariff_reference: o => B.feeFromRule({ key: o.key, label: o.label, prefix: `${kebab(o.form.split(/[.-]/)[0]!)}.fee.` }),
  country_code: o => ({ fields: [{ key: o.key, label: o.label, type: 'enum', valuesSource: { kind: 'register', register: 'countries' } }] }),
  currency_code: o => ({ fields: [{ key: o.key, label: o.label, type: 'enum', valuesSource: { kind: 'register', register: 'currencies' } }] }),
  institution_reference: o => ({ fields: [{ key: o.key, label: o.label, type: 'enum', valuesSource: { kind: 'register', register: 'institutions' } }] }),
  'array<institution_reference>': o => ({ fields: [{ key: o.key, label: o.label, type: 'enum', multiple: true, valuesSource: { kind: 'register', register: 'institutions' } }] }),
  identifier_reference: o => ({ fields: [{ key: o.key, label: o.label, type: 'identifierReference', identifier: { scheme: o.label } }] }),
  registry_reference: o => register(o, /appropriation/.test(`${o.id} ${o.field.validation ?? ''}`) ? 'appropriation' : 'organisation'),
  farm_record_reference: o => register(o, 'farm'),
  water_source_reference: o => register(o, 'water-source'),
  authoritative_parcel_reference: o => register(o, 'parcel'),
  registered_interest_reference: o => register(o, 'land-interest'),
  approved_payment_reference: o => B.bankAccount({ key: o.key, label: o.label }),
  person_reference: o => B.person({ key: o.key, label: o.label }),
  organisation_reference: o => B.organisation({ key: o.key, label: o.label }),
  organisation_reference_list: o => B.organisation({ key: o.key, label: o.label, multiple: true }),
  person_or_organisation_reference: o => B.party({ key: o.key, label: o.label }),
  party_reference_collection: o => B.party({ key: o.key, label: o.label, multiple: true }),
  restricted_party_collection: o => B.party({ key: o.key, label: o.label, multiple: true }),
  restricted_source_reference: o => B.party({ key: o.key, label: o.label }),
  purpose_limited_reference_collection: o => ({ fields: [{ ...B.party({ key: o.key, label: o.label, multiple: true }).fields[0]!, rules: [{ rule: 'profile', profile: 'purpose-limited' }] }] }),
  location_reference: o => ({ fields: [{ key: o.key, label: o.label, type: 'location', locationKinds: ['region', 'site', 'point', 'address', 'described'] }] }),
  jurisdiction_or_site_reference: o => ({ fields: [{ key: o.key, label: o.label, type: 'location', locationKinds: ['region', 'site', 'point'] }] }),
  organisation_or_location_reference: o => ({ fields: [{ key: o.key, label: o.label, type: 'location', locationKinds: ['site', 'address', 'point', 'described'], hint: 'Give the registered site of the workplace, its address, or describe where it is.' }] }),
  address_reference_or_structured_address: o => B.address({ key: o.key, label: o.label, kinds: ['address', 'site', 'point', 'described'] }),
  geospatial_point: o => ({ fields: [{ key: o.key, label: o.label, type: 'point' }] }),
  geospatial_geometry: o => ({ fields: [{ key: o.key, label: o.label, type: 'geometry' }] }),
  verified_contact_reference: o => B.contact({ key: o.key, label: o.label, verified: true }),
  contact_method: o => B.contact({ key: o.key, label: o.label }),
  restricted_flag: o => ({ fields: [{ key: o.key, label: o.label, type: 'boolean', raisesSensitivity: true }] }),
  document_reference: o => doc(o, false),
  signed_document_reference: o => doc(o, false),
  'array<document_reference>': o => doc(o, true),
  evidence_collection: o => doc(o, true),
  signed_document_collection: o => doc(o, true),
  approval_evidence_collection: o => ({ ...doc(o, true), fields: doc(o, true).fields.map(f => ({ ...f, audience: 'officer' as const })) }),
  attestation: o => B.declaration({ key: o.key, label: o.label, version: '1', statements: [{ key: 'true', text: 'The information I have given is true and complete to the best of my knowledge.' }] }),
  signed_attestation: o => B.declaration({ key: o.key, label: o.label, version: '1', statements: [{ key: 'true', text: 'The information I have given is true and complete to the best of my knowledge.' }], signed: true }),
  attestation_collection: o => B.declaration({ key: o.key, label: o.label, version: '1', statements: [{ key: 'true', text: 'The information I have given is true and complete.' }, { key: 'notify', text: 'I will tell the authority of any change to it.' }] }),
  // Structured text: one long answer in the person's own words, with guidance on its order (the institution's own document holds any formal structure).
  structured_text: o => ({ fields: [{ key: o.key, label: o.label, type: 'longtext', rules: [{ rule: 'length', min: 1, max: 20000 }], hint: 'Set it out in order: first what happened or what you ask for, then the details.' }] }),
  structured_claim: o => group(o, [{ key: 'ground', label: 'The ground you rely on', type: 'text', required: true, rules: [{ rule: 'length', max: 300 }] }, { key: 'facts', label: 'The facts that support it', type: 'longtext', required: true }]),
  structured_summary: o => group(o, [{ key: 'summary', label: 'Summary', type: 'longtext', required: true, rules: [{ rule: 'length', max: 4000 }] }]),
  minimum_required_structure: o => group(o, [{ key: 'members', label: 'Number of people in the household', type: 'number', rules: [{ rule: 'range', min: 1, max: 99 }] }, { key: 'details', label: 'Only what the programme\'s rules ask for', type: 'longtext' }]),
  event_collection: o => group(o, [{ key: 'at', label: 'When', type: 'timestamp', required: true }, { key: 'action', label: 'What was done', type: 'text', required: true, rules: [{ rule: 'length', max: 300 }] }], true),
  'array<customs_goods_line>': o => group(o, [{ key: 'description', label: 'Goods description', type: 'text', required: true }], true),
};

/** Parse "a != b" / "a == b" (the specification's `required_when`). */
export function parseCondition(s: string): { field: string; equals?: string; notEquals?: string } | null {
  const m = /^\s*([a-z_][a-z0-9_]*)\s*(==|!=)\s*([A-Za-z0-9_-]+)\s*$/.exec(s);
  if (!m) return null;
  return m[2] === '==' ? { field: camel(m[1]!), equals: m[3]! } : { field: camel(m[1]!), notEquals: m[3]! };
}

/**
 * Load one form contract in the specification's shape. Returns the form
 * definition and a report of what was configured, held more strictly, or
 * could not be expressed.
 */
export function importSpecForm(json: SpecFormJson): { definition: FormDefinition; notes: ImportNote[] } {
  const notes: ImportNote[] = [];
  const fields: ContractField[] = [];
  const documents: ContractDocument[] = [];
  const form = json.form_id;
  for (const sf of json.fields ?? []) {
    const key = camel(sf.id);
    const label = human(sf.id);
    const make = SPEC_TYPES[sf.type];
    let made: B.BlockResult;
    if (make) made = make({ key, id: sf.id, label, field: sf, form });
    else {
      notes.push({ field: sf.id, kind: 'not-expressed', note: `Type ${sf.type} has no equivalent in the form contract: kept as a long-text answer for an official to review` });
      made = { fields: [{ key, label, type: 'longtext' }] };
    }
    const cls = sf.personal_data_class ? SPEC_CLASSES[sf.personal_data_class] : undefined;
    if (sf.personal_data_class && !cls) notes.push({ field: sf.id, kind: 'stricter', note: `Class ${sf.personal_data_class} is not a known class: held as restricted` });
    const target = cls ?? (sf.personal_data_class ? { cls: 'restricted' as PersonalDataClass } : undefined);
    const v = sf.validation ? SPEC_VALIDATIONS[sf.validation] : undefined;
    if (sf.validation && !v) notes.push({ field: sf.id, kind: 'configured', note: `Validation ${sf.validation} is a check the country configures: recorded as not performed until it is` });
    if (v?.note) notes.push({ field: sf.id, kind: 'configured', note: v.note });
    const cond = sf.required_when ? parseCondition(sf.required_when) : null;
    if (sf.required_when && !cond) notes.push({ field: sf.id, kind: 'not-expressed', note: `Condition "${sf.required_when}" could not be read: the field is asked, not required` });
    for (const [i, f] of made.fields.entries()) {
      if (i > 0) { fields.push(f); continue; }
      const blockClass = f.personalDataClass;
      // Never weaker than the specification, nor than the block's own protection.
      const chosen = target && (!blockClass || CLASS_RANK[target.cls] >= CLASS_RANK[blockClass]) ? target.cls : blockClass ?? 'administrative';
      const rules = [...(f.rules ?? [])];
      for (const r of v?.rules ?? (sf.validation && !v ? [{ rule: 'profile', profile: sf.validation } as NamedRule] : [])) if (!rules.some(x => JSON.stringify(x) === JSON.stringify(r))) rules.push(r);
      if (cond) rules.push({ rule: 'requiredWhen', ...cond });
      fields.push({
        ...f, specField: sf.id, personalDataClass: chosen,
        ...(target?.confidentiality ? { confidentiality: target.confidentiality } : {}),
        ...(sf.required ? { required: true } : {}),
        ...(cond ? { showWhen: cond } : {}),
        ...(rules.length ? { rules } : {}),
      });
    }
    for (const d of made.documents ?? []) if (!documents.some(x => x.class === d.class)) documents.push(d);
  }
  const policies: Record<string, string | boolean> = {};
  for (const section of ['rules', 'decision', 'controls'] as const) for (const [k, val] of Object.entries(json[section] ?? {})) policies[`${section}.${k}`] = typeof val === 'boolean' ? val : String(val);
  const definition: FormDefinition = {
    key: `library.${kebab(form)}`, title: human(form.replace(/[.-]/g, ' ').replace(/ v\d+$/, '')), fields, documents,
    form: { version: json.version ?? '1.0', spec: { id: form, ...(json.version ? { version: json.version } : {}), ...(json.record_type ? { recordType: json.record_type } : {}) }, ...(Object.keys(policies).length ? { policies } : {}) },
  };
  // A loaded form must fit the contract; anything that does not is reported, never hidden.
  const keys = fields.map(f => f.key), classes = documents.map(d => d.class);
  for (const f of fields) { const why = fieldProblem(f, keys, classes); if (why) notes.push({ field: f.key, kind: 'problem', note: why }); }
  const why = formProblem(definition.form, fields, documents, 'restricted');
  if (why) notes.push({ kind: 'problem', note: why });
  return { definition, notes };
}
