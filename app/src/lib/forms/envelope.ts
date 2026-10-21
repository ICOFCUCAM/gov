// The shared JSON field contract envelope (contract_version 1.0.0,
// docs/forms-catalogue/SUPPLEMENT-PARTS-14-22-AND-CONTRACTS-05-13.md §1),
// mapped onto civicos.form-contract.v1 and the form contract
// (lib/forms/contract.ts) rather than kept as a second format: the envelope's
// form-level properties (owning institution, competent-authority rule, legal
// basis with its verification status, applicability, workflow, decision,
// privacy, audit, accessibility) are FormSpec.envelope; its fields (field_id
// or key, label, type, required, classification, source, validation_rule_ids,
// evidence_requirements, help_text, ui) map onto contract fields. The
// supplement's domain blocks (`{"domain", "contracts": [...]}`) load with the
// same mapping as library drafts. What a type cannot express is reported;
// forms the platform's binding rules forbid (patient and clinical records,
// individual student records, suspects, custody admission, intelligence,
// voter registration before legal review) are not loaded and are listed with
// their reason.

import { fieldProblem, formProblem, type ContractDocument, type ContractField, type FormSpec, type PersonalDataClass } from './contract';
import { isRegisteredRule } from './rules';
import { EXCLUDED_FORMS, LEGAL_REVIEW_FORMS } from './scope';

/** The envelope's form-level properties, kept on the form (FormSpec.envelope). */
export interface Envelope {
  contractVersion: '1.0.0';
  title?: string;
  domain?: string;
  formType?: string;
  countryProfile?: string;
  owningInstitutionId?: string;
  competentAuthorityRuleId?: string;
  legalBasis?: { instrumentId: string; versionId: string; provision: string; verificationStatus: 'requires_approval' | 'approved' | 'rejected' | string }[];
  applicability?: Record<string, boolean>;
  workflow?: { workflowId?: string; initialState?: string; submissionState?: string; decisionRequired?: boolean; separationOfDuties?: boolean };
  decision?: { decisionTypes?: string[]; mustRecordReason?: boolean; legalBasisRequired?: boolean; appealRouteRuleId?: string };
  privacy?: { purposeCode?: string; retentionRuleId?: string; restrictedAccessAudit?: boolean };
  audit?: { recordCreation?: boolean; fieldChangeHistory?: boolean; decisionHistory?: boolean; evidenceHashes?: boolean };
  accessibility?: { target?: string; plainLanguage?: boolean; keyboardOperable?: boolean };
}

export interface EnvelopeField {
  field_id?: string; key: string; label?: string; type: string; required?: boolean | string;
  classification?: string; source?: string | { type?: string; registry_id?: string };
  options_source?: string; items_type?: string; validation_rule_ids?: string[];
  evidence_requirements?: unknown[]; help_text?: string; ui?: { widget?: string; order?: number };
}
export interface EnvelopeContract { form_id: string; title?: string; fields: EnvelopeField[] }
export interface EnvelopeNote { field?: string; kind: 'problem' | 'not-expressed' | 'stricter'; note: string }

/** The envelope's classifications, held at least as strictly. */
export const ENVELOPE_CLASSES: Record<string, PersonalDataClass> = { public: 'public', internal: 'administrative', confidential: 'personal', restricted: 'restricted' };

/**
 * The envelope contracts the approved scope excludes or holds for a legal
 * review (lib/forms/scope.ts, the one place those lists live): never loaded
 * as forms.
 */
export const EXCLUDED_CONTRACTS: Record<string, string> = { ...EXCLUDED_FORMS, ...LEGAL_REVIEW_FORMS };

const human = (k: string) => { const s = k.replace(/_/g, ' '); return s[0]!.toUpperCase() + s.slice(1); };
type Mapped = Partial<ContractField> & { type: string };
const ref = (scheme: string): Mapped => ({ type: 'identifierReference', identifier: { scheme } });
const details = (label = 'Details'): ContractField[] => [{ key: 'details', label, type: 'longtext', required: true, rules: [{ rule: 'length', max: 20_000 }] }];

/** One envelope type (or an array's item type) onto the contract. */
function mapType(t: string, f: EnvelopeField, formId: string): { m: Mapped; note?: string } {
  const list = f.options_source ?? `${formId}.${f.key}`;
  switch (t) {
    case 'string': return { m: { type: 'text' } };
    case 'long_text': case 'rich_text': return { m: { type: 'longtext' } };
    case 'restricted_text': return { m: { type: 'longtext', personalDataClass: 'restricted' } };
    case 'date': return { m: { type: 'date' } };
    case 'datetime': return { m: { type: 'timestamp' } };
    case 'date_range': return { m: { type: 'dateRange' } };
    case 'duration': return { m: { type: 'quantity', units: ['days', 'weeks', 'months', 'years'] } };
    case 'boolean': return { m: { type: 'boolean' } };
    case 'enum': case 'code_reference': case 'attribute_code': case 'action_code': case 'data_category_code': case 'permission_code':
      return { m: { type: 'enum', valuesSource: { kind: 'configured', list } } };
    case 'decimal': return { m: { type: 'number' } };
    case 'integer': return { m: { type: 'number', rules: [{ rule: 'registered', name: 'integer_range', params: {} }] } };
    case 'integer_range': return { m: { type: 'group', items: [{ key: 'min', label: 'From', type: 'number', required: true }, { key: 'max', label: 'To', type: 'number', required: true }] } };
    case 'money': return { m: { type: 'money' } };
    case 'money_range': return { m: { type: 'group', items: [{ key: 'minimum', label: 'From', type: 'money', required: true }, { key: 'maximum', label: 'To', type: 'money', required: true }] } };
    case 'currency_code': return { m: { type: 'enum', valuesSource: { kind: 'register', register: 'currencies' } } };
    case 'country_code': return { m: { type: 'enum', valuesSource: { kind: 'register', register: 'countries' } } };
    case 'entity_reference': case 'restricted_entity_reference': case 'party_reference': case 'person_reference': case 'household_member_reference': {
      const src = typeof f.source === 'string' ? f.source : f.source?.registry_id;
      const s = (src ?? '').toLowerCase();
      const register = /identity|population|person/.test(s) || t === 'person_reference' || t === 'household_member_reference' ? 'person' : /business|compan|organisation/.test(s) ? 'organisation' : (s || 'entity').replace(/[^a-z0-9_.-]/g, '_');
      return { m: { type: 'registryReference', register, ...(t === 'restricted_entity_reference' ? { personalDataClass: 'restricted' as const } : {}) } };
    }
    case 'address': return { m: { type: 'address' } };
    case 'address_or_geo_reference': case 'geo_reference': return { m: { type: 'location', locationKinds: ['address', 'site', 'point', 'region', 'described'] } };
    case 'restricted_geo_reference': return { m: { type: 'location', locationKinds: ['address', 'point', 'described'], personalDataClass: 'restricted' } };
    case 'geo_boundary_reference': case 'geo_geometry_reference': return { m: { type: 'geometry' } };
    case 'contact_object': case 'contact_method_reference': return { m: { type: 'contact' } };
    case 'restricted_contact_reference': return { m: { type: 'contact', personalDataClass: 'restricted' } };
    case 'document_reference': case 'document_or_media_reference': return { m: { type: 'document', evidence: f.key.replace(/_/g, '-') } };
    case 'restricted_document_reference': return { m: { type: 'document', evidence: f.key.replace(/_/g, '-'), personalDataClass: 'restricted' } };
    case 'legal_basis_reference': case 'legal_rule_reference': case 'legal_instrument_reference': return { m: { type: 'registryReference', register: 'law' } };
    case 'signature_reference': return { m: ref('Signature record') };
    case 'verified_status_reference': return { m: ref('Verified status') };
    case 'verification_reference': return { m: ref('Verification record') };
    case 'review_reference': return { m: ref('Review record') };
    case 'decision_reference': return { m: ref('Decision record') };
    case 'rule_reference': case 'rule_version_reference': return { m: ref('Approved rule and version') };
    case 'authority_profile_reference': return { m: ref('Authority profile') };
    case 'budget_reference': return { m: ref('Budget record') };
    case 'payment_reference': return { m: ref('Payment record') };
    case 'protected_payment_reference': return { m: { ...ref('Payment record'), personalDataClass: 'financial' } };
    case 'source_reference': case 'qualification_reference': case 'condition_reference': case 'declaration_reference': case 'institution_relationship_reference':
      return { m: ref(human(t.replace(/_reference$/, ''))) };
    case 'measurement': case 'quantity_object': case 'quantity_period_object': return { m: { type: 'quantity' } };
    case 'grade_or_score': return { m: { type: 'text' } };
    case 'structured_assessment': case 'structured_object': case 'provenance_object':
      return { m: { type: 'group', items: details() }, note: `${t}: its inner structure is the country's; carried as a set of answers with its details` };
    case 'restricted_structured_data': return { m: { type: 'group', items: details(), personalDataClass: 'restricted' }, note: `${t}: inner structure is the country's` };
    default:
      // Array items naming a structured line (an inspection finding, a budget line…): a repeatable set of answers.
      return { m: { type: 'group', items: details(human(t)) }, note: `${t}: carried as a repeatable set of answers; its inner fields are the country's` };
  }
}

/** One envelope field onto the contract. */
export function envelopeField(f: EnvelopeField, formId: string): { field: ContractField; notes: EnvelopeNote[] } {
  const notes: EnvelopeNote[] = [];
  const key = f.field_id ?? f.key;
  let m: Mapped;
  if (f.type === 'array') {
    const it = mapType(f.items_type ?? 'string', f, formId);
    if (it.note) notes.push({ field: key, kind: 'not-expressed', note: it.note });
    m = ['enum', 'registryReference', 'identifierReference', 'party', 'document', 'group'].includes(it.m.type)
      ? { ...it.m, multiple: true }
      : { type: 'group', multiple: true, items: [{ ...(it.m as ContractField), key: 'item', label: human(f.items_type ?? 'item'), required: true }] as ContractField[] };
  } else {
    const t = mapType(f.type, f, formId);
    if (t.note) notes.push({ field: key, kind: 'not-expressed', note: t.note });
    m = t.m;
  }
  const cls = f.classification ? ENVELOPE_CLASSES[f.classification] : undefined;
  if (f.classification && !cls) notes.push({ field: key, kind: 'stricter', note: `Classification ${f.classification} is not known: held as restricted` });
  const rank = { public: 0, administrative: 1, commercial: 2, personal: 3, financial: 4, 'tax-confidential': 4, restricted: 5, special: 6 } as const;
  const own = m.personalDataClass;
  // An unclassified field is held as personal (out of lists) unless its type says more.
  const chosen: PersonalDataClass = [cls ?? (f.classification ? 'restricted' : 'personal'), own ?? 'administrative'].sort((a, b) => rank[b as PersonalDataClass] - rank[a as PersonalDataClass])[0] as PersonalDataClass;
  const src = typeof f.source === 'string' ? { type: 'authoritative_registry', registry_id: f.source } : f.source;
  const valueSource: ContractField['valueSource'] = !src ? 'applicant' : src.type === 'authoritative_registry' || src.type === 'verified_external_source' ? 'verified_source' : src.type === 'calculated_value' || src.type === 'approved_rule' ? 'system' : 'applicant';
  const rules = [...(m.rules ?? [])];
  for (const id of f.validation_rule_ids ?? []) {
    if (!isRegisteredRule(id)) notes.push({ field: key, kind: 'problem', note: `Rule ${id} is not registered: refused (only registered rules run)` });
    rules.push({ rule: 'registered', name: id });
    // The envelope's reference rules are the contract's own register check.
    if ((id === 'REF-EXISTS' || id === 'REF-ACTIVE') && m.type === 'registryReference') {
      const active = !!f.validation_rule_ids?.includes('REF-ACTIVE');
      if (!rules.some(x => x.rule === 'existingRecord')) rules.push({ rule: 'existingRecord', ...(active ? { active: true } : {}) });
    }
  }
  if (typeof f.required === 'string') notes.push({ field: key, kind: 'not-expressed', note: `Required "${f.required}": a country-configured condition; asked, not required, until the country configures it` });
  const field = {
    ...m, key, label: f.label ?? human(f.key),
    ...(f.required === true ? { required: true } : {}),
    personalDataClass: chosen,
    ...(rules.length ? { rules } : {}),
    ...(f.options_source ? { valuesSourceId: f.options_source } : typeof f.source === 'string' ? { valuesSourceId: f.source } : f.source?.registry_id ? { valuesSourceId: f.source.registry_id } : {}),
    valueSource,
    ...(f.help_text ? { hint: f.help_text } : {}),
    ...(f.ui ? { ui: { ...f.ui } } : {}),
    ...(valueSource === 'system' ? { audience: 'system' as const } : {}),
  } as ContractField;
  return { field, notes };
}

export interface EnvelopeDefinition { key: string; title: string; fields: ContractField[]; documents: ContractDocument[]; form: FormSpec }

/** Load one contract of the envelope standard (a full envelope, or one of a domain block's contracts). */
export function importEnvelopeContract(c: EnvelopeContract & Partial<Record<string, unknown>>, domain?: string): { definition: EnvelopeDefinition; notes: EnvelopeNote[] } {
  const notes: EnvelopeNote[] = [];
  const fields = c.fields.map(f => { const r = envelopeField(f, c.form_id); notes.push(...r.notes); return r.field; });
  const documents: ContractDocument[] = fields.filter(f => f.type === 'document' && f.evidence).map(f => ({ class: f.evidence!, label: f.label, required: !!f.required, ...(f.multiple ? { multiple: true } : {}) }));
  const e = c as Record<string, unknown>;
  const envelope: Envelope = {
    contractVersion: '1.0.0', ...(c.title ? { title: c.title } : {}), ...((e.domain as string) ?? domain ? { domain: (e.domain as string) ?? domain } : {}),
    ...(e.form_type ? { formType: String(e.form_type) } : {}), ...(e.country_profile ? { countryProfile: String(e.country_profile) } : {}),
    ...(e.owning_institution_id ? { owningInstitutionId: String(e.owning_institution_id) } : {}), ...(e.competent_authority_rule_id ? { competentAuthorityRuleId: String(e.competent_authority_rule_id) } : {}),
    ...(Array.isArray(e.legal_basis) ? { legalBasis: (e.legal_basis as Record<string, string>[]).map(l => ({ instrumentId: l.instrument_id!, versionId: l.version_id!, provision: l.provision!, verificationStatus: 'requires_approval' })) } : {}),
    ...(e.applicability ? { applicability: { ...(e.applicability as Record<string, boolean>) } } : {}),
    ...(e.workflow ? { workflow: camelObj(e.workflow) } : {}), ...(e.decision ? { decision: camelObj(e.decision) } : {}),
    ...(e.privacy ? { privacy: camelObj(e.privacy) } : {}), ...(e.audit ? { audit: camelObj(e.audit) } : {}), ...(e.accessibility ? { accessibility: camelObj(e.accessibility) } : {}),
  };
  const form: FormSpec = { version: String(e.form_version ?? '1.0.0'), status: String(e.status ?? 'draft'), spec: { id: c.form_id, version: String(e.form_version ?? '1.0.0') }, envelope };
  const keys = fields.map(f => f.key), classes = documents.map(d => d.class);
  for (const f of fields) { const why = fieldProblem(f, keys, classes); if (why) notes.push({ field: f.key, kind: 'problem', note: why }); }
  const why = formProblem(form, fields, documents, 'restricted');
  if (why) notes.push({ kind: 'problem', note: why });
  return { definition: { key: `library.${c.form_id}`, title: c.title ?? c.form_id, fields, documents, form }, notes };
}

const camel = (k: string) => k.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase());
function camelObj<T>(o: unknown): T { return Object.fromEntries(Object.entries(o as Record<string, unknown>).map(([k, v]) => [camel(k), v])) as T; }

/** The envelope a procedure's form carries, derived from the package where the form does not state it. */
export function envelopeOf(pkg: { key: string; title: string; owner: string; citations: { instrument: string; eId: string; version: string }[]; actions: { decision?: string; needs: { fourEyes?: boolean } }[]; retention: string; appeal?: { body: string }; form?: FormSpec; state: string }, ownerInstitution?: string, legalReviewed = false): Envelope {
  const own = pkg.form?.envelope;
  const decisions = [...new Set(pkg.actions.filter(a => a.decision).map(a => a.decision!))];
  return {
    contractVersion: '1.0.0', title: own?.title ?? pkg.title, ...(own?.domain ? { domain: own.domain } : {}), ...(own?.formType ? { formType: own.formType } : { formType: 'application' }),
    owningInstitutionId: own?.owningInstitutionId ?? ownerInstitution ?? pkg.owner,
    competentAuthorityRuleId: own?.competentAuthorityRuleId ?? `deployment:${pkg.owner}`,
    // The verification status is never read from the form: it is approved only when an authorised official's legal review is recorded (lib/forms/publication.ts).
    legalBasis: pkg.citations.map(c => ({ instrumentId: c.instrument, versionId: c.version, provision: c.eId, verificationStatus: legalReviewed ? 'approved' : 'requires_approval' })),
    ...(own?.applicability ? { applicability: own.applicability } : {}),
    workflow: { workflowId: pkg.key, initialState: 'draft', submissionState: 'submitted', decisionRequired: decisions.length > 0, separationOfDuties: pkg.actions.some(a => a.decision && a.needs.fourEyes), ...(own?.workflow ?? {}) },
    decision: { decisionTypes: own?.decision?.decisionTypes ?? decisions, mustRecordReason: true, legalBasisRequired: true, ...(pkg.appeal ? { appealRouteRuleId: own?.decision?.appealRouteRuleId ?? `${pkg.key}#appeal` } : {}) },
    privacy: { purposeCode: own?.privacy?.purposeCode ?? pkg.key, retentionRuleId: own?.privacy?.retentionRuleId ?? pkg.retention, restrictedAccessAudit: true },
    audit: { recordCreation: true, fieldChangeHistory: true, decisionHistory: true, evidenceHashes: true, ...(own?.audit ?? {}) },
    accessibility: { target: 'WCAG_2_2_AA', plainLanguage: true, keyboardOperable: true, ...(own?.accessibility ?? {}) },
  };
}
