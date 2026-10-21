// The canonical form-contract format (civicos.form-contract.v1, field series
// Part 1 §1.1, docs/forms-catalogue/FIELD-SERIES-PARTS-01-02.md), loaded
// natively and 1:1 onto the form contract (lib/forms/contract.ts): a field
// keeps its id as its key, its type, requiredness, every validation rule by
// its registered name and parameters (lib/forms/rules.ts; an unregistered
// name fails closed), its values source verbatim, its personal-data class,
// its evidence kinds and conditions, its label, hint and error text in every
// language (English as the source; other languages as reviewed
// translations), its accessibility requirements and its country decision.
// Reusable field groups (`group_id`, `version`) load the same way and keep
// their accessibility, assisted-channel and country-decision blocks; the
// standard legal notices (core.legal_notices) keep their notice types and
// publication blockers. What the loader cannot express it reports, field by
// field; nothing is dropped. A loaded form is a draft until the procedure it
// belongs to is approved by two officials.

import {
  fieldProblem, formProblem,
  type ContractDocument, type ContractField, type FormSpec, type NamedRule, type NoticeType, type PersonalDataClass,
} from './contract';
import { isRegisteredRule, RULE_REGISTRY } from './rules';
import type { TranslationEntries } from '@/lib/public-sites/translation';

export interface CanonicalField {
  id: string;
  type: string;
  required: boolean;
  validation: { rule: string; params?: Record<string, unknown> }[];
  values_source: string | null;
  personal_data_class: string;
  evidence: { kind: string; when: string }[];
  label: Record<string, string>;
  hint?: Record<string, string>;
  error_text?: Record<string, Record<string, string>>;
  accessibility?: Record<string, unknown>;
  country_decision?: string | null;
}
export interface CanonicalForm {
  schema_version: 'civicos.form-contract.v1';
  form_id: string;
  record_type: string;
  form_version: number;
  status: string;
  institution_id?: string;
  service_id?: string;
  procedure_package_id?: string;
  procedure_package_version?: number;
  legal_basis: unknown[];
  fields: CanonicalField[];
  country_decisions?: string[];
}
export interface CanonicalGroup {
  group_id: string;
  version: number;
  scope: string;
  fields?: CanonicalField[];
  accessibility?: Record<string, unknown>;
  assisted_channel?: Record<string, unknown>;
  country_decisions?: string[];
  notice_types?: NoticeType[];
  universal_rules?: Record<string, unknown>;
}
export interface CanonicalNote { field?: string; kind: 'problem' | 'not-expressed' | 'binding'; note: string }

/** A loaded field group: immutable by id and version. */
export interface FieldGroup {
  id: string;
  version: number;
  scope: string;
  fields: ContractField[];
  accessibility: Record<string, unknown>;
  assistedChannel: Record<string, unknown>;
  countryDecisions: string[];
  noticeTypes?: NoticeType[];
  universalRules?: Record<string, unknown>;
  translations: Record<string, TranslationEntries>;
  notes: CanonicalNote[];
}

/** The registers a canonical values source points into (the rest are named by their source id and are not on the platform yet). */
const REGISTRY_SOURCES: Record<string, string> = {
  'civicos.registry.person': 'person',
  'civicos.registry.organisation': 'organisation',
  'civicos.registry.organisations': 'organisation',
  'civicos.registry.institutions': 'institution',
  'civicos.registry.person_or_organisation': 'person',
  'tax.registry.taxpayer_accounts': 'taxpayer',
  'civicos.registry.law_provisions': 'law',
  'civicos.registry.approved_legal_authorities': 'law',
};
/** Rules whose field is answered by an official, or set by the platform. */
const OFFICER_RULES = new Set(Object.entries(RULE_REGISTRY).filter(([, r]) => r.scope === 'officer').map(([k]) => k));
const SYSTEM_RULES = new Set(Object.entries(RULE_REGISTRY).filter(([, r]) => r.scope === 'system').map(([k]) => k));

/** One canonical field onto the contract, 1:1 (and the translations its other languages carry). */
export function canonicalField(f: CanonicalField, group?: { id: string; version: number }): { field: ContractField; translations: Record<string, TranslationEntries>; notes: CanonicalNote[] } {
  const notes: CanonicalNote[] = [];
  const src = f.values_source ?? undefined;
  const base: Partial<ContractField> = {};
  switch (f.type) {
    case 'text': base.type = 'text'; break;
    case 'long_text': base.type = 'longtext'; break;
    case 'date': base.type = 'date'; break;
    case 'number': base.type = 'number'; break;
    case 'boolean': base.type = 'boolean'; break;
    case 'localized_text': base.type = 'localizedText'; break;
    case 'money': base.type = 'money'; break;
    case 'address': base.type = 'address'; break;
    case 'point': base.type = 'point'; break;
    case 'contact': base.type = 'contact'; break;
    case 'place': base.type = 'location'; break;
    case 'person': base.type = 'party'; base.parties = ['person']; break;
    case 'organisation': base.type = 'party'; base.parties = ['organisation']; break;
    case 'choice': base.type = 'enum'; base.valuesSource = { kind: 'configured', list: src ?? `${f.id}.values` }; break;
    case 'identifier_reference': base.type = 'identifierReference'; base.identifier = { scheme: f.label.en ?? f.id }; break;
    case 'registry_reference': base.type = 'registryReference'; base.register = (src && REGISTRY_SOURCES[src]) ?? src ?? 'unspecified'; break;
    case 'document': base.type = 'document'; base.evidence = f.evidence[0]?.kind ?? f.id.replace(/[._]/g, '-'); break;
    default:
      notes.push({ field: f.id, kind: 'not-expressed', note: `Type ${f.type} has no equivalent in the form contract: kept as a long-text answer` });
      base.type = 'longtext';
  }
  const rules: NamedRule[] = [];
  for (const v of f.validation ?? []) {
    if (!isRegisteredRule(v.rule)) notes.push({ field: f.id, kind: 'problem', note: `Rule ${v.rule} is not registered: refused (only registered rules run)` });
    else if (RULE_REGISTRY[v.rule]!.scope === 'binding') notes.push({ field: f.id, kind: 'binding', note: `${v.rule} needs ${RULE_REGISTRY[v.rule]!.needs}: recorded as not performed until configured, and blocks publication in production` });
    rules.push({ rule: 'registered', name: v.rule, ...(v.params && Object.keys(v.params).length ? { params: v.params } : {}) });
  }
  const names = (f.validation ?? []).map(v => v.rule);
  const audience: ContractField['audience'] = names.some(n => SYSTEM_RULES.has(n)) ? 'system' : names.some(n => OFFICER_RULES.has(n)) ? 'officer' : undefined;
  // A field required only under a condition is asked only then (a conditional section).
  const cond = (f.validation ?? []).find(v => v.rule === 'required_if')?.params as { field?: string; equals?: unknown; in?: unknown[] } | undefined;
  const showWhen = cond?.field ? (cond.in && Array.isArray(cond.in) && cond.in.length === 1 ? { field: cond.field, equals: String(cond.in[0]) } : cond.equals !== undefined ? { field: cond.field, equals: String(cond.equals) } : undefined) : undefined;
  const en = (m?: Record<string, string>) => m?.en ?? (m ? Object.values(m)[0] : undefined);
  const cls = ['public', 'administrative', 'personal', 'restricted', 'special'].includes(f.personal_data_class) ? (f.personal_data_class as PersonalDataClass) : 'restricted';
  if (cls !== f.personal_data_class) notes.push({ field: f.id, kind: 'not-expressed', note: `Class ${f.personal_data_class} is not known: held as restricted` });
  const field: ContractField = {
    key: f.id, label: en(f.label) ?? f.id, ...(base as { type: string }),
    ...(f.required ? { required: true } : {}),
    ...(en(f.hint) ? { hint: en(f.hint) } : {}),
    ...(f.error_text?.en && Object.keys(f.error_text.en).length ? { errors: { ...f.error_text.en } } : {}),
    personalDataClass: cls,
    ...(rules.length ? { rules } : {}),
    ...(src ? { valuesSourceId: src } : {}),
    ...(f.evidence?.length ? { evidenceRules: f.evidence.map(e => ({ ...e })) } : {}),
    ...(f.accessibility ? { accessibility: { ...f.accessibility } } : {}),
    ...(f.country_decision !== undefined ? { countryDecision: f.country_decision } : {}),
    ...(audience ? { audience, valueSource: audience === 'system' ? 'system' : 'authorized_officer' } : { valueSource: 'applicant' }),
    ...(showWhen && showWhen.field !== f.id ? { showWhen } : {}),
    ...(group ? { group } : {}),
  };
  // Other languages: translations kept with the English they were made from.
  const translations: Record<string, TranslationEntries> = {};
  const put = (lang: string, path: string, source: string | undefined, target: string | undefined) => { if (lang === 'en' || !source || !target) return; (translations[lang] ??= {})[path] = { source, target }; };
  for (const [lang, t] of Object.entries(f.label ?? {})) put(lang, `field.${f.id}.label`, field.label, t);
  for (const [lang, t] of Object.entries(f.hint ?? {})) put(lang, `field.${f.id}.hint`, field.hint, t);
  for (const [lang, m] of Object.entries(f.error_text ?? {})) for (const [rule, t] of Object.entries(m)) put(lang, `field.${f.id}.error.${rule}`, f.error_text?.en?.[rule], t);
  return { field, translations, notes };
}

const mergeTranslations = (into: Record<string, TranslationEntries>, from: Record<string, TranslationEntries>) => { for (const [l, e] of Object.entries(from)) into[l] = { ...(into[l] ?? {}), ...e }; };
const documentsOf = (fields: ContractField[]): ContractDocument[] => fields.filter(f => f.type === 'document' && f.evidence).map(f => ({ class: f.evidence!, label: f.label, required: !!f.required, ...(f.hint ? { purpose: f.hint } : {}) }));

/** Load a reusable field group. */
export function importFieldGroup(g: CanonicalGroup): FieldGroup {
  const notes: CanonicalNote[] = [], translations: Record<string, TranslationEntries> = {};
  const ref = { id: g.group_id, version: g.version };
  const fields = (g.fields ?? []).map(f => { const r = canonicalField(f, ref); notes.push(...r.notes); mergeTranslations(translations, r.translations); return r.field; });
  const keys = fields.map(f => f.key), classes = documentsOf(fields).map(d => d.class);
  for (const f of fields) { const why = fieldProblem(f, keys, classes); if (why) notes.push({ field: f.key, kind: 'problem', note: why }); }
  return {
    id: g.group_id, version: g.version, scope: g.scope, fields, accessibility: { ...(g.accessibility ?? {}) }, assistedChannel: { ...(g.assisted_channel ?? {}) },
    countryDecisions: [...(g.country_decisions ?? [])], ...(g.notice_types ? { noticeTypes: g.notice_types.map(n => ({ ...n })) } : {}), ...(g.universal_rules ? { universalRules: { ...g.universal_rules } } : {}),
    translations, notes,
  };
}

export interface CanonicalDefinition { key: string; title: string; fields: ContractField[]; documents: ContractDocument[]; form: FormSpec }

/** Load a form contract in the canonical format. */
export function importCanonicalForm(c: CanonicalForm, opts: { title?: string } = {}): { definition: CanonicalDefinition; notes: CanonicalNote[] } {
  const notes: CanonicalNote[] = [];
  if (c.schema_version !== 'civicos.form-contract.v1') notes.push({ kind: 'problem', note: `Schema ${c.schema_version} is not civicos.form-contract.v1` });
  const translations: Record<string, TranslationEntries> = {};
  const fields = (c.fields ?? []).map(f => { const r = canonicalField(f); notes.push(...r.notes); mergeTranslations(translations, r.translations); return r.field; });
  // A condition naming a field the contract does not define: the question is added (a yes-or-no the condition reads), never left unevaluable.
  for (const f of [...fields]) {
    for (const r of f.rules ?? []) {
      const target = r.rule === 'registered' && typeof r.params?.field === 'string' ? r.params.field : undefined;
      if (!target || fields.some(x => x.key === target)) continue;
      const word = target.split('.').pop()!.replace(/_/g, ' ');
      fields.splice(fields.indexOf(f), 0, { key: target, label: `${word[0]!.toUpperCase()}${word.slice(1)}?`, type: 'boolean', personalDataClass: 'administrative', valueSource: 'applicant' });
      notes.push({ field: target, kind: 'not-expressed', note: `Added: ${f.key}'s condition reads ${target}, which the contract does not define; it is asked as a yes-or-no question` });
    }
  }
  const documents = documentsOf(fields);
  const form: FormSpec = {
    version: String(c.form_version), schemaVersion: c.schema_version, status: c.status,
    spec: { id: c.form_id, version: String(c.form_version), recordType: c.record_type },
    legalBasis: [...(c.legal_basis ?? [])], countryDecisions: [...(c.country_decisions ?? [])],
    ...(c.institution_id ? { institutionId: c.institution_id } : {}), ...(c.service_id ? { serviceId: c.service_id } : {}),
    ...(c.procedure_package_id ? { procedurePackage: { id: c.procedure_package_id, version: c.procedure_package_version ?? 1 } } : {}),
    ...(Object.keys(translations).length ? { translations } : {}),
  };
  const keys = fields.map(f => f.key), classes = documents.map(d => d.class);
  for (const f of fields) { const why = fieldProblem(f, keys, classes); if (why) notes.push({ field: f.key, kind: 'problem', note: why }); }
  const why = formProblem(form, fields, documents, 'restricted');
  if (why) notes.push({ kind: 'problem', note: why });
  return { definition: { key: `library.${c.form_id}`, title: opts.title ?? c.form_id, fields, documents, form }, notes };
}

/**
 * The fields of a group for a form: every field (or the ids listed: a form
 * includes only what its decision needs), each carrying the group's id and
 * version. With a prefix, keys become `prefix.id` (a group used twice).
 */
export function useGroup(g: FieldGroup, opts: { only?: string[]; prefix?: string } = {}): ContractField[] {
  const pick = g.fields.filter(f => !opts.only || opts.only.includes(f.key));
  if (!opts.prefix) return structuredClone(pick);
  const re = (k: string) => (g.fields.some(f => f.key === k) ? `${opts.prefix}.${k}` : k);
  return structuredClone(pick).map(f => ({
    ...f, key: re(f.key),
    ...(f.showWhen ? { showWhen: { ...f.showWhen, field: re(f.showWhen.field) } } : {}),
    ...(f.rules ? { rules: f.rules.map(r => (r.rule === 'registered' && r.params && typeof r.params.field === 'string' ? { ...r, params: { ...r.params, field: re(r.params.field) } } : r)) } : {}),
  }));
}

// ── Reading the documents ─────────────────────────────────────────────────────
/** Every JSON object written in a document (fenced or as a top-level block starting with a line "{"). */
export function jsonBlocks(text: string): unknown[] {
  const lines = text.split('\n');
  const out: unknown[] = [];
  for (let i = 0; i < lines.length; i++) {
    const fenced = lines[i]!.startsWith('```json');
    if (!fenced && lines[i]!.trimEnd() !== '{') continue;
    const buf: string[] = [];
    let depth = 0, j = fenced ? i + 1 : i;
    for (; j < lines.length; j++) {
      if (fenced && lines[j]!.startsWith('```')) break;
      buf.push(lines[j]!);
      for (const ch of lines[j]!) { if (ch === '{') depth++; else if (ch === '}') depth--; }
      if (!fenced && depth === 0) break;
    }
    try { out.push(JSON.parse(buf.join('\n'))); } catch { /* prose that only looks like JSON */ }
    i = j;
  }
  return out;
}
