// Building a library form: a form contract in the specification's shape,
// loaded with no code per form (lib/forms/spec-import.ts), then improved by an
// overlay that may only add (plain-language wording, hints, sections,
// building blocks, the proposed values of configured lists, stricter rules,
// translations) or rename a field onto the key its procedure already uses.
// An overlay never drops a field or weakens an attribute; the conformance
// test (spec-conformance.test.ts) holds every definition to its contract,
// save the deviations listed with their reasons (docs/FORMS_CONFORMANCE.md).
// Attaching a definition to a procedure package keeps every field and
// document the procedure had (attachForm()).

import { importSpecForm, type FormDefinition, type ImportNote, type SpecFormJson } from '../spec-import';
import { CLASS_RANK, fieldClass, type ContractDocument, type ContractField, type FormSpec, type NamedRule } from '../contract';
import type { FieldSpec } from '@/lib/casework/types';

/** A field of the specification the platform carries differently, and why (docs/FORMS_CONFORMANCE.md). */
export interface Deviation { field?: string; what: string; why: string }

export type FieldPatch = Partial<ContractField> & {
  /** Fields added beside the generated one, carrying the same specification field (a name in two parts). */
  also?: ContractField[];
  /** Replaces the rules a building block added (never the specification's own validations, which the conformance test holds). */
  replaceRules?: NamedRule[];
};

export interface Overlay {
  title: string;
  /** The authority responsible (lib/nation/deployment.ts), never a ministry by name. */
  owner: string;
  /** The procedure package the form belongs to, where one exists; otherwise the form waits in the library for its sector step. */
  attachesTo?: string;
  /** The plan step that builds the service a library form belongs to. */
  awaits?: string;
  version?: string;
  intro?: string;
  fields?: Record<string, FieldPatch>;
  /** Fields the platform adds (e.g. a date the form needs, objects mentioned beside people). */
  add?: ContractField[];
  documents?: ContractDocument[];
  lists?: FormSpec['lists'];
  notices?: FormSpec['notices'];
  channels?: FormSpec['channels'];
  identityEvidence?: FormSpec['identityEvidence'];
  evidencePolicy?: string;
  deviations?: Deviation[];
}

export interface LibraryForm extends FormDefinition {
  specId: string;
  owner: string;
  attachesTo?: string;
  awaits?: string;
  notes: ImportNote[];
  deviations: Deviation[];
}

const sameRule = (a: NamedRule, b: NamedRule) => JSON.stringify(a) === JSON.stringify(b);

/** Load a form contract and apply its overlay (additive only). */
export function buildForm(json: SpecFormJson, o: Overlay): LibraryForm {
  const { definition, notes } = importSpecForm(json);
  const fields: ContractField[] = [];
  for (const f of definition.fields) {
    const patch = typeof f.specField === 'string' ? o.fields?.[f.specField] : undefined;
    if (!patch) { fields.push(f); continue; }
    const { also, rules, items, replaceRules, ...rest } = patch;
    // Rules are added, never replaced (save a block's own, where replaceRules says so); items (a group's questions) may be set where the specification leaves them open.
    const start = replaceRules ?? f.rules ?? [];
    const merged: ContractField = { ...f, ...rest, rules: [...start, ...(rules ?? []).filter(r => !start.some(x => sameRule(x, r)))] };
    if (items) merged.items = items;
    if (!merged.rules?.length) delete merged.rules;
    // A rule naming another field follows that field's new key.
    fields.push(merged, ...(also ?? []));
  }
  const renamed = new Map<string, string>();
  for (const f of definition.fields) {
    const p = typeof f.specField === 'string' ? o.fields?.[f.specField] : undefined;
    if (p?.key && p.key !== f.key) renamed.set(f.key, p.key);
  }
  const follow = (k: string) => renamed.get(k) ?? k;
  for (const f of fields) {
    if (f.showWhen) f.showWhen = { ...f.showWhen, field: follow(f.showWhen.field) };
    if (f.rules) f.rules = f.rules.map(r => (r.rule === 'requiredWhen' ? { ...r, field: follow(r.field) } : r));
  }
  fields.push(...(o.add ?? []));
  const documents = [...definition.documents];
  for (const d of o.documents ?? []) {
    const i = documents.findIndex(x => x.class === d.class);
    if (i >= 0) documents[i] = { ...documents[i]!, ...d, required: documents[i]!.required || d.required };
    else documents.push(d);
  }
  // A document field names a class that must exist (renamed evidence follows its field).
  for (const f of fields) if (f.type === 'document' && f.evidence && !documents.some(d => d.class === f.evidence)) documents.push({ class: f.evidence, label: f.label, required: !!f.required, ...(f.multiple ? { multiple: true } : {}) });
  const used = new Set(fields.filter(f => f.type === 'document').map(f => f.evidence));
  const form: FormSpec = {
    ...definition.form,
    ...(o.version ? { version: o.version } : {}),
    ...(o.intro ? { intro: o.intro } : {}),
    ...(o.lists ? { lists: o.lists } : {}),
    ...(o.notices ? { notices: o.notices } : {}),
    ...(o.channels ? { channels: o.channels } : {}),
    ...(o.identityEvidence ? { identityEvidence: o.identityEvidence } : {}),
    ...(o.evidencePolicy ? { evidencePolicy: o.evidencePolicy } : {}),
  };
  return {
    key: definition.key, title: o.title, fields, documents: documents.filter(d => used.has(d.class) || (o.documents ?? []).some(x => x.class === d.class)), form,
    specId: json.form_id, owner: o.owner, ...(o.attachesTo ? { attachesTo: o.attachesTo } : {}), ...(o.awaits ? { awaits: o.awaits } : {}),
    notes, deviations: o.deviations ?? [],
  };
}

/**
 * Attach a form to a procedure's fields and documents: the form's fields come
 * first (a field with a key the procedure already uses replaces it, keeping
 * any attribute the form does not set), then every other field the procedure
 * had, unchanged; documents are merged by class (required if either says so).
 */
export function attachForm(fields: ContractField[], documents: ContractDocument[], def: Pick<LibraryForm, 'fields' | 'documents' | 'form'>): { fields: FieldSpec[]; documents: ContractDocument[]; form: FormSpec } {
  const out: ContractField[] = def.fields.map(f => {
    const old = fields.find(x => x.key === f.key);
    if (!old) return f;
    const { personal: _p, ...oldRest } = old;
    void _p;
    // Never weaker than the procedure had it: required stays required, the class only rises.
    const cls = CLASS_RANK[fieldClass(old)] > CLASS_RANK[fieldClass(f)] ? fieldClass(old) : fieldClass(f);
    return { ...oldRest, ...f, personalDataClass: cls, ...(old.required || f.required ? { required: true } : {}) };
  });
  for (const f of fields) if (!out.some(x => x.key === f.key)) out.push(f);
  const docs = documents.map(d => { const n = def.documents.find(x => x.class === d.class); return n ? { ...d, ...n, label: d.label, required: d.required || n.required } : d; });
  for (const d of def.documents) if (!docs.some(x => x.class === d.class)) docs.push(d);
  return { fields: out as FieldSpec[], documents: docs, form: def.form };
}
