// The register of authorised medicines and medical devices (field series
// Part 6 §5.2, the regulated product record; Health I4 dependency
// `product-register`, docs/HEALTH_I4_DEPENDENCIES.md). Kept for the
// institution the nation names in the `medicinesRegulation` slot of its
// deployment profile (lib/data/register-owners.ts), never a ministry by name.
//
// A product record holds: its number and kind (medicine or device), the
// holder (an organisation of the organisations register, by its register
// number: never a second identity), the product's identity and
// classification references (as the nation's configured standards give them),
// the authorisation number, status and its history, conditions, validity, the
// dossier versions and the assessment (commercially confidential and
// restricted), and its enforcement record (suspensions, withdrawals, recalls).
// Every attribute keeps its data class and the sealed decision that approved
// it (lib/health/products/public.ts).
//
// It changes only through the effects of the product procedures
// (lib/health/products/procedures.ts): an application registered, a dossier
// version recorded, an assessment recorded, a decision (authorise, refuse,
// vary, renew, suspend, reinstate, withdraw, recall) sealed by the case
// engine, a public notice published, a recall's completion verified. Every
// change is a new version or a history step, never an edit in place; a status
// comes only from a step a sealed decision made (Part 6 §5.2: "Each status
// must derive from the competent regulator's authoritative record"), never
// from an import, inventory or procurement record: there is no import path.
// lib/casework/register-writes.test.ts fails on any other file importing a
// changing function.
//
// Reading a full record is the medicines regulator's (canReadProduct() in
// lib/auth/roles.ts; every read in the access log, by the route). Everything
// else (lists, the public check, the product.status exchange service)
// carries publicProductView() only, under the nation's public information
// classification, which ships empty and changes only by two officials citing
// the law (lib/law/policy-change.ts). Nothing statutory is typed here: no
// outcome list, period or fee. Held in platform state.

import { recordAudit } from '@/lib/data/store/audit';
import { touch } from '@/lib/data/repo/track';
import { uuid7 } from '@/lib/data/uuid7';
import { nextNumber } from '@/lib/data/numbering';
import { withDefaults } from '@/lib/data/defaults';
import { proposePolicy, confirmPolicy, withdrawPolicy, type PolicyChanges } from '@/lib/law/policy-change';
import { getOrganisation, current as currentOrg } from '@/lib/organisations/register';
import {
  publicProductView, EMPTY_CLASSIFICATION, NEVER_PUBLIC,
  type ProductAttribute, type ProductAttributeKey, type ProductDataClass, type ProductEnforcement, type ProductRecord, type PublicClassification, type PublicProduct,
} from './public';

export type ProductKind = ProductRecord['kind'];
export type ProductState = 'applied' | 'authorised' | 'refused' | 'suspended' | 'withdrawn' | 'lapsed';
export const PRODUCT_STATES: ProductState[] = ['applied', 'authorised', 'refused', 'suspended', 'withdrawn', 'lapsed'];
export const STATE_LABEL: Record<ProductState, string> = { applied: 'Application registered', authorised: 'Authorised', refused: 'Refused', suspended: 'Suspended', withdrawn: 'Withdrawn', lapsed: 'Lapsed (validity ended)' };

/** The data class of each attribute: fixed, never chosen per record (lib/health/products/public.ts holds back the never-public kinds whatever is listed). */
export const ATTRIBUTE_CLASS: Record<ProductAttributeKey, ProductDataClass> = {
  name: 'public', strength: 'public', dosageForm: 'public', route: 'public', therapeuticClass: 'public', deviceClass: 'public', deviceNomenclature: 'public',
  holder: 'public', authorisationNumber: 'public', status: 'public', authorisedOn: 'public', validUntil: 'public', conditions: 'public', legalSupplyCategory: 'public', activeIngredients: 'public',
  composition: 'commercial_confidential', manufacturingSites: 'commercial_confidential', packagingAndLabelling: 'commercial_confidential', dossier: 'commercial_confidential',
  assessmentReport: 'restricted', inspectionFindings: 'restricted',
  qualifiedPerson: 'personal', contactPerson: 'personal',
  legalBasis: 'administrative',
};
/** What an application records (the procedure's fields), before any decision approves it. */
export const APPLICATION_KEYS = ['name', 'strength', 'dosageForm', 'route', 'therapeuticClass', 'deviceClass', 'deviceNomenclature', 'legalSupplyCategory', 'activeIngredients', 'composition', 'manufacturingSites', 'packagingAndLabelling'] as const;
export type ApplicationKey = (typeof APPLICATION_KEYS)[number];
/** What a variation may change: the product's own attributes, never its holder, number, status or history. */
export const VARIABLE_KEYS: ApplicationKey[] = [...APPLICATION_KEYS];

export interface ProductStep {
  state: ProductState;
  at: string; by: string; reason: string;
  /** The case that made the step (empty for the validity job). */
  case: string;
  /** The sealed decision of that case, attached once sealed. */
  decision?: string;
  /** The record version the step left. */
  version: number;
  /** Made by a sample case in a demo or training run. */
  sample?: true;
}

export interface ProductVersion {
  n: number;
  attributes: Partial<Record<ProductAttributeKey, ProductAttribute>>;
  at: string; by: string; reason: string;
  case: string;
}

/** An enforcement record as the register keeps it: the public shape plus the case it came from and a recall's completion. */
export interface ProductEnforcementRecord extends ProductEnforcement {
  case: string;
  by: string;
  /** A recall's completion, verified by the regulator (HLT-MED-018): restricted, never public. */
  completion?: { at: string; by: string; case: string; summary: string; documents: string[] };
  /** A recall's class, as the decision set it from the nation's recall classes (medicines.country.recall_classes, shipped empty). */
  recallClass?: string;
  sample?: true;
}

export interface ProductEntry {
  id: string;
  /** The register number: PRD-YYYY-NNNNNN. */
  number: string;
  kind: ProductKind;
  /** The holder: an organisation of the organisations register, by its register number (never a second identity). */
  holder: string;
  state: ProductState;
  versions: ProductVersion[];
  history: ProductStep[];
  enforcement: ProductEnforcementRecord[];
  /** The case that registered the application. */
  case: string;
  createdAt: string;
  /** Registered by a sample case in a demo or training run (lib/casework/engine.ts sampleMark). */
  sample?: true;
}

type Disclosure = { fields: ProductAttributeKey[] };
type Db = { products: ProductEntry[]; prdSeq: number; maSeq: number; mdrSeq: number; disclosure: PolicyChanges<Disclosure>; classification: PublicClassification };
const seed = (): Db => ({ products: [], prdSeq: 0, maSeq: 0, mdrSeq: 0, disclosure: {}, classification: { ...EMPTY_CLASSIFICATION, fields: [] } });
const g = globalThis as unknown as { __civicosProducts?: Db };
const db = (): Db => touch('__civicosProducts', g.__civicosProducts = withDefaults(g.__civicosProducts ??= seed(), seed()));
export function resetProducts(): void { g.__civicosProducts = undefined; }

const clone = <T,>(x: T): T => structuredClone(x);
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const str = (v: unknown, max = 300) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const list = (v: unknown, max = 30): string[] => (Array.isArray(v) ? v : typeof v === 'string' ? v.split(/[;\n]/) : []).map(x => str(x, 300)).filter(Boolean).slice(0, max);
const find = (numberOrId: string) => db().products.find(p => p.number === numberOrId || p.id === numberOrId);
const latest = (p: ProductEntry) => p.versions[p.versions.length - 1]!;
const attr = (key: ProductAttributeKey, value: unknown): ProductAttribute => ({ value, class: ATTRIBUTE_CLASS[key] });

/** A new version from the latest, with changed attributes (unapproved until the decision is attached). */
function nextVersion(p: ProductEntry, changes: Partial<Record<ProductAttributeKey, unknown>>, reason: string, caseId: string, by: string, now: Date): ProductVersion {
  const prev = latest(p);
  const attributes = clone(prev.attributes);
  for (const [k, v] of Object.entries(changes) as [ProductAttributeKey, unknown][]) {
    if (v === undefined || (Array.isArray(v) && !v.length && !attributes[k]) || v === '') continue;
    attributes[k] = attr(k, v);
  }
  const v: ProductVersion = { n: prev.n + 1, attributes, at: now.toISOString(), by, reason: reason.slice(0, 500), case: caseId };
  p.versions.push(v);
  return v;
}

function step(p: ProductEntry, state: ProductState, reason: string, caseId: string, by: string, now: Date, sample?: true): ProductStep {
  const s: ProductStep = { state, at: now.toISOString(), by, reason: reason.slice(0, 500), case: caseId, version: latest(p).n, ...(sample ? { sample } : {}) };
  p.state = state;
  p.history.push(s);
  return s;
}

// ── Changes: only through the product procedures' effects ───────────────────

export interface NewProduct {
  kind: unknown; holder: unknown;
  attributes: Partial<Record<ApplicationKey, unknown>>;
  /** From a sample case: the record carries the sample marker. */
  sample?: true;
}

/** Register an application: a new record, every attribute as the applicant gave it (approved by no decision yet). */
export function applyForProduct(input: NewProduct, caseId: string, by: string, now = new Date()): ProductEntry | { error: string } {
  const kind = input.kind === 'device' ? 'device' : input.kind === 'medicine' ? 'medicine' : null;
  if (!kind) return { error: 'A product is a medicine or a medical device' };
  const holderRef = str(input.holder, 80);
  const o = holderRef ? getOrganisation(holderRef) : undefined;
  if (!o) return { error: `The holder must be an organisation in the register of organisations (${holderRef || 'none given'})` };
  const name = str(input.attributes.name, 300);
  if (name.length < 2) return { error: `Give the ${kind === 'device' ? 'device' : 'medicine'}'s name` };
  const strength = str(input.attributes.strength, 120);
  const same = db().products.find(p => p.holder === o.number && p.kind === kind && !['refused', 'withdrawn'].includes(p.state)
    && String(latest(p).attributes.name?.value ?? '').toLowerCase() === name.toLowerCase() && String(latest(p).attributes.strength?.value ?? '') === strength);
  if (same) return { error: `${o.number} already holds ${name}${strength ? ` ${strength}` : ''} as ${same.number} (${STATE_LABEL[same.state].toLowerCase()})` };
  const at = now.toISOString();
  const attributes: ProductVersion['attributes'] = { holder: attr('holder', { organisation: o.number }) };
  for (const k of APPLICATION_KEYS) {
    const raw = input.attributes[k];
    const v = k === 'activeIngredients' || k === 'manufacturingSites' ? list(raw) : str(raw, k === 'composition' || k === 'packagingAndLabelling' ? 4000 : 300);
    if ((Array.isArray(v) && v.length) || (typeof v === 'string' && v)) attributes[k] = attr(k, v);
  }
  const p: ProductEntry = {
    id: uuid7(), number: nextNumber(db() as unknown as Record<string, unknown>, 'prdSeq', 'PRD', now), kind, holder: o.number, state: 'applied',
    versions: [{ n: 1, attributes, at, by, reason: 'Application registered', case: caseId }], history: [], enforcement: [], case: caseId, createdAt: at,
    ...(input.sample ? { sample: true as const } : {}),
  };
  step(p, 'applied', 'Application registered', caseId, by, now, input.sample);
  db().products.push(p);
  recordAudit(by, 'product.apply', `Product:${p.number}`, 'ok', `${kind} · holder ${o.number} · case ${caseId}${input.sample ? ' · sample' : ''}`);
  return clone(p);
}

/** A dossier version: the documents of the case (by id), a new record version; the documents themselves stay with the case. */
export function recordDossier(number: string, documents: string[], note: string, caseId: string, by: string, now = new Date()): ProductEntry | { error: string } {
  const p = find(number);
  if (!p) return { error: `No product ${number || '(none given)'} in the register` };
  if (['refused', 'withdrawn'].includes(p.state)) return { error: `${p.number} is ${p.state}: no dossier is recorded on it` };
  if (!documents.length) return { error: 'Attach the dossier documents to the case first' };
  const prev = (latest(p).attributes.dossier?.value as { n: number }[] | undefined) ?? [];
  const entry = { n: prev.length + 1, documents: [...new Set(documents)].slice(0, 200), at: now.toISOString(), case: caseId, ...(note.trim() ? { note: note.trim().slice(0, 500) } : {}) };
  nextVersion(p, { dossier: [...prev, entry] }, `Dossier version ${entry.n}`, caseId, by, now);
  recordAudit(by, 'product.dossier', `Product:${p.number}`, 'ok', `dossier version ${entry.n} · ${entry.documents.length} document(s) · case ${caseId}`);
  return clone(p);
}

/** The technical assessment: its report (documents of the case) and the assessor's summary, restricted to the regulator. */
export function recordAssessment(number: string, input: { documents: string[]; summary: string }, caseId: string, by: string, now = new Date()): ProductEntry | { error: string } {
  const p = find(number);
  if (!p) return { error: `No product ${number || '(none given)'} in the register` };
  if (!input.documents.length) return { error: 'Attach the assessment report to the case first' };
  nextVersion(p, { assessmentReport: { documents: input.documents.slice(0, 50), summary: input.summary.slice(0, 2000), by, at: now.toISOString(), case: caseId } }, 'Assessment recorded', caseId, by, now);
  recordAudit(by, 'product.assess', `Product:${p.number}`, 'ok', `case ${caseId}`);
  return clone(p);
}

const nextAuthorisation = (kind: ProductKind, now: Date) => nextNumber(db() as unknown as Record<string, unknown>, kind === 'device' ? 'mdrSeq' : 'maSeq', kind === 'device' ? 'MDR' : 'MA', now);
const futureDate = (v: string | undefined, now: Date): string | { error: string } | undefined => {
  if (!v) return undefined;
  if (!DATE.test(v) || v <= now.toISOString().slice(0, 10)) return { error: 'Valid until is a future date (YYYY-MM-DD), as the decision states it' };
  return v;
};

/** The decision on an application: authorised (with its number, conditions and the validity the decision states) or refused. */
export function decideProduct(number: string, input: { outcome: 'authorised' | 'refused'; reason: string; conditions?: string[]; validUntil?: string; sample?: true }, caseId: string, by: string, now = new Date()): ProductEntry | { error: string } {
  const p = find(number);
  if (!p) return { error: `No product ${number || '(none given)'} in the register` };
  if (p.state !== 'applied') return { error: `${p.number} is ${STATE_LABEL[p.state].toLowerCase()}: only an application is decided` };
  if (!input.reason.trim()) return { error: 'State the reasons' };
  if (input.outcome === 'authorised') {
    const until = futureDate(input.validUntil, now);
    if (until && typeof until === 'object') return until;
    nextVersion(p, { authorisationNumber: nextAuthorisation(p.kind, now), authorisedOn: now.toISOString().slice(0, 10), ...(until ? { validUntil: until } : {}), ...(input.conditions?.length ? { conditions: input.conditions.slice(0, 30) } : {}) }, input.reason, caseId, by, now);
  } else {
    nextVersion(p, {}, input.reason, caseId, by, now);
  }
  step(p, input.outcome, input.reason, caseId, by, now, input.sample);
  recordAudit(by, `product.${input.outcome === 'authorised' ? 'authorise' : 'refuse'}`, `Product:${p.number}`, 'ok', `version ${latest(p).n} · case ${caseId}`);
  return clone(p);
}

/** A variation: the changed attributes as a new version, approved by the variation decision. */
export function varyProduct(number: string, changes: Partial<Record<ApplicationKey, unknown>>, reason: string, caseId: string, by: string, now = new Date(), sample?: true): ProductEntry | { error: string } {
  const p = find(number);
  if (!p) return { error: `No product ${number || '(none given)'} in the register` };
  if (p.state !== 'authorised') return { error: `${p.number} is ${STATE_LABEL[p.state].toLowerCase()}: only an authorised product is varied` };
  const patch: Partial<Record<ProductAttributeKey, unknown>> = {};
  for (const k of VARIABLE_KEYS) {
    if (changes[k] === undefined) continue;
    const v = k === 'activeIngredients' || k === 'manufacturingSites' ? list(changes[k]) : str(changes[k], 4000);
    if ((Array.isArray(v) && v.length) || (typeof v === 'string' && v)) patch[k] = v;
  }
  if (!Object.keys(patch).length) return { error: 'Say what the variation changes' };
  nextVersion(p, patch, reason || 'Varied', caseId, by, now);
  step(p, 'authorised', `Varied: ${Object.keys(patch).join(', ')}`, caseId, by, now, sample);
  recordAudit(by, 'product.vary', `Product:${p.number}`, 'ok', `${Object.keys(patch).join(', ')} · version ${latest(p).n} · case ${caseId}`);
  return clone(p);
}

/** A renewal: authorised again, with the validity and conditions the decision states. */
export function renewProduct(number: string, input: { reason: string; validUntil?: string; conditions?: string[]; sample?: true }, caseId: string, by: string, now = new Date()): ProductEntry | { error: string } {
  const p = find(number);
  if (!p) return { error: `No product ${number || '(none given)'} in the register` };
  if (!['authorised', 'lapsed'].includes(p.state)) return { error: `${p.number} is ${STATE_LABEL[p.state].toLowerCase()}: only an authorised or lapsed authorisation is renewed` };
  const until = futureDate(input.validUntil, now);
  if (until && typeof until === 'object') return until;
  nextVersion(p, { ...(until ? { validUntil: until } : {}), ...(input.conditions?.length ? { conditions: input.conditions.slice(0, 30) } : {}) }, input.reason || 'Renewed', caseId, by, now);
  step(p, 'authorised', input.reason || 'Renewed', caseId, by, now, input.sample);
  recordAudit(by, 'product.renew', `Product:${p.number}`, 'ok', `${until ? `valid until ${until} · ` : ''}case ${caseId}`);
  return clone(p);
}

const MOVES: Partial<Record<ProductState, ProductState[]>> = { authorised: ['suspended', 'withdrawn'], suspended: ['authorised', 'withdrawn'], lapsed: ['withdrawn'] };

/** Suspension, reinstatement and withdrawal: a status step and, for a suspension or withdrawal, an enforcement record with its restricted grounds. */
export function changeProductState(number: string, input: { state: 'suspended' | 'authorised' | 'withdrawn'; reason: string; grounds?: string; sample?: true }, caseId: string, by: string, now = new Date()): ProductEntry | { error: string } {
  const p = find(number);
  if (!p) return { error: `No product ${number || '(none given)'} in the register` };
  if (!(MOVES[p.state] ?? []).includes(input.state)) return { error: `${p.number} is ${STATE_LABEL[p.state].toLowerCase()}: it cannot become ${STATE_LABEL[input.state].toLowerCase()}` };
  if (!input.reason.trim()) return { error: 'State the reasons' };
  nextVersion(p, {}, input.reason, caseId, by, now);
  step(p, input.state, input.reason, caseId, by, now, input.sample);
  if (input.state !== 'authorised') {
    p.enforcement.push({ id: uuid7(), kind: input.state === 'suspended' ? 'suspension' : 'withdrawal', at: now.toISOString(), case: caseId, by, ...(input.grounds?.trim() ? { grounds: input.grounds.trim().slice(0, 4000) } : {}), ...(input.sample ? { sample: true as const } : {}) });
  }
  recordAudit(by, `product.${input.state === 'authorised' ? 'reinstate' : input.state === 'suspended' ? 'suspend' : 'withdraw'}`, `Product:${p.number}`, 'ok', `case ${caseId}`);
  return clone(p);
}

/** A recall ordered by decision: an enforcement record (the product's status does not change by it). */
export function orderRecall(number: string, input: { grounds: string; recallClass?: string; sample?: true }, caseId: string, by: string, now = new Date()): ProductEntry | { error: string } {
  const p = find(number);
  if (!p) return { error: `No product ${number || '(none given)'} in the register` };
  if (['applied', 'refused'].includes(p.state)) return { error: `${p.number} was never authorised: there is nothing on the market to recall` };
  if (p.enforcement.some(e => e.kind === 'recall' && e.case === caseId)) return { error: 'This case has already ordered its recall' };
  const recallClass = input.recallClass?.trim().slice(0, 80);
  p.enforcement.push({ id: uuid7(), kind: 'recall', at: now.toISOString(), case: caseId, by, ...(input.grounds.trim() ? { grounds: input.grounds.trim().slice(0, 4000) } : {}), ...(recallClass ? { recallClass } : {}), ...(input.sample ? { sample: true as const } : {}) });
  recordAudit(by, 'product.recall', `Product:${p.number}`, 'ok', `case ${caseId}${recallClass ? ` · class ${recallClass}` : ''}`);
  return clone(p);
}

/**
 * A safety alert decided on a safety report or a device incident (HLT-MED-015,
 * 020): an enforcement record of kind safety_notice (the product's status does
 * not change by it). Its grounds are restricted; its public notice is
 * published as its own act once the decision is sealed. The report that raised
 * it, and whoever made it, are never on the product's record.
 */
export function issueSafetyAlert(number: string, input: { grounds: string; sample?: true }, caseId: string, by: string, now = new Date()): ProductEntry | { error: string } {
  const p = find(number);
  if (!p) return { error: `No product ${number || '(none given)'} in the register` };
  if (['applied', 'refused'].includes(p.state)) return { error: `${p.number} was never authorised: a safety alert is about a product on the market` };
  if (p.enforcement.some(e => e.kind === 'safety_notice' && e.case === caseId)) return { error: 'This case has already decided its safety alert' };
  p.enforcement.push({ id: uuid7(), kind: 'safety_notice', at: now.toISOString(), case: caseId, by, ...(input.grounds.trim() ? { grounds: input.grounds.trim().slice(0, 4000) } : {}), ...(input.sample ? { sample: true as const } : {}) });
  recordAudit(by, 'product.alert', `Product:${p.number}`, 'ok', `case ${caseId}`);
  return clone(p);
}

/** Publish the public notice of a decided enforcement record of this case (the wording only; the grounds stay restricted). */
export function publishProductNotice(number: string, caseId: string, wording: string, by: string, now = new Date()): ProductEntry | { error: string } {
  const p = find(number);
  if (!p) return { error: `No product ${number || '(none given)'} in the register` };
  const e = [...p.enforcement].reverse().find(x => x.case === caseId);
  if (!e) return { error: 'This case has no suspension, withdrawal or recall to publish' };
  if (!e.approvedBy) return { error: 'The notice is published only after its decision is sealed' };
  if (e.publishedAt) return { error: `Its notice was published on ${e.publishedAt.slice(0, 10)}` };
  const text = wording.trim();
  if (text.length < 10) return { error: 'Write the public notice (what the public needs to know; never the grounds or who reported)' };
  e.publicNotice = text.slice(0, 2000);
  e.publishedAt = now.toISOString();
  recordAudit(by, 'product.notice.publish', `Product:${p.number}`, 'ok', `${e.kind} · case ${caseId}`);
  return clone(p);
}

/** A recall's completion, verified by the regulator: kept on the recall record (restricted). */
export function completeRecall(number: string, caseId: string, input: { summary: string; documents: string[] }, by: string, now = new Date()): ProductEntry | { error: string } {
  const p = find(number);
  if (!p) return { error: `No product ${number || '(none given)'} in the register` };
  const e = [...p.enforcement].reverse().find(x => x.kind === 'recall' && x.case === caseId);
  if (!e || !e.approvedBy) return { error: 'This case has no decided recall to complete' };
  if (e.completion) return { error: 'This recall\'s completion is already recorded' };
  if (!input.documents.length) return { error: 'Attach the completion report to the case first' };
  e.completion = { at: now.toISOString(), by, case: caseId, summary: input.summary.slice(0, 2000), documents: input.documents.slice(0, 50) };
  recordAudit(by, 'product.recall.complete', `Product:${p.number}`, 'ok', `case ${caseId}`);
  return clone(p);
}

/**
 * Attach the sealed decision of a case: it approves the attributes its
 * version recorded or changed, its status step and its enforcement record.
 * Only then can any of them reach the public view.
 */
export function attachProductDecision(number: string, caseId: string, decision: string, now = new Date()): void {
  const p = find(number);
  if (!p) return;
  const by = { decision, at: now.toISOString() };
  // Each version carries the attributes before it forward: those the case's versions recorded or changed are approved by its decision.
  for (const v of p.versions) if (v.case === caseId) for (const a of Object.values(v.attributes)) if (a && !a.approvedBy) a.approvedBy = { ...by };
  // The status step the decision made: the case's latest (an application's registration is no decision).
  const made = [...p.history].reverse().find(s => s.case === caseId);
  if (made && !made.decision && made.state !== 'applied') made.decision = decision;
  for (const e of p.enforcement) if (e.case === caseId && !e.approvedBy) e.approvedBy = { ...by };
}

/** Authorisations past the validity their decision set lapse (the case-deadlines job). */
export function expireProducts(now = new Date()): string[] {
  const today = now.toISOString().slice(0, 10), out: string[] = [];
  for (const p of db().products) {
    const until = latest(p).attributes.validUntil?.value;
    if (p.state === 'authorised' && typeof until === 'string' && until < today) {
      step(p, 'lapsed', `Validity ended on ${until}`, '', 'System (validity)', now, p.sample);
      recordAudit('System (validity)', 'product.lapsed', `Product:${p.number}`, 'ok', `valid until ${until}`);
      out.push(p.number);
    }
  }
  return out;
}

/**
 * What a recall or safety alert notice of this case says (HX-005,
 * lib/health/products/notices.ts): the product's public view, the kind, the
 * recall class the decision set, and the dates it was decided and published.
 * Only for an enforcement record both decided and published; never its
 * grounds, its completion or who reported it.
 */
export function publishedNoticeOf(number: string, caseId: string): { product: PublicProductEntry; kind: 'recall' | 'safety_notice'; recallClass?: string; decidedOn: string; publishedOn: string } | undefined {
  const p = find(number);
  const e = p ? [...p.enforcement].reverse().find(x => x.case === caseId) : undefined;
  if (!p || !e || (e.kind !== 'recall' && e.kind !== 'safety_notice') || !e.approvedBy || !e.publishedAt || !e.publicNotice) return undefined;
  return { product: publicProduct(p), kind: e.kind, ...(e.recallClass ? { recallClass: e.recallClass } : {}), decidedOn: e.approvedBy.at.slice(0, 10), publishedOn: e.publishedAt.slice(0, 10) };
}

// ── The nation's public information classification: two officials, citing the law ──

const DISCLOSURE_AUDIT = 'product.disclosure';
const PUBLISHABLE = (Object.keys(ATTRIBUTE_CLASS) as ProductAttributeKey[]).filter(k => ATTRIBUTE_CLASS[k] === 'public' && !(NEVER_PUBLIC as readonly string[]).includes(k));
/** Attributes a classification may list: those of the public class (the rest never leave the regulator, whatever is listed). */
export const PUBLISHABLE_ATTRIBUTES: ProductAttributeKey[] = PUBLISHABLE;
const checkDisclosure = (v: Disclosure): string | null =>
  !Array.isArray(v.fields) || v.fields.some(f => !PUBLISHABLE.includes(f)) ? `The public check may show only ${PUBLISHABLE.join(', ')}` : null;
const describeDisclosure = (v: Disclosure) => `the public product check shows ${v.fields.length ? v.fields.join(', ') : 'no attribute'}`;

/** One administrator proposes what the public product check shows (HLT-MED-006 decision.public_disclosure), citing the law; a different official confirms. */
export function proposeProductDisclosure(fields: unknown, legalBasis: unknown, by: string, byId?: string, now = new Date(), pendingHours = 24) {
  const want = Array.isArray(fields) ? [...new Set(fields.map(String))] as ProductAttributeKey[] : [];
  return proposePolicy(db().disclosure, { fields: [...db().classification.fields] }, { fields: want }, legalBasis, {
    by, ...(byId ? { byId } : {}), now, pendingHours, audit: DISCLOSURE_AUDIT, context: 'What the public product check shows', check: checkDisclosure, describe: describeDisclosure,
  });
}
/** A different official confirms: the public check shows those attributes from now (each still only when a decision approved it). */
export function confirmProductDisclosure(by: string, byId?: string, now = new Date(), requireIdentityBinding = false) {
  const d = db();
  return confirmPolicy(d.disclosure, {
    by, ...(byId ? { byId } : {}), now, audit: DISCLOSURE_AUDIT, requireIdentityBinding, describe: describeDisclosure,
    adopt: v => { d.classification = { fields: [...v.values.fields], approved: true, version: (d.classification.version ?? 0) + 1 }; },
  });
}
export const withdrawProductDisclosure = (by: string, reason?: string) => withdrawPolicy(db().disclosure, { by, ...(reason ? { reason } : {}), audit: DISCLOSURE_AUDIT });

// ── Reads ────────────────────────────────────────────────────────────────────

/** The classification in force (empty and unapproved until two officials adopt one). */
export const publicClassification = (): PublicClassification => clone(db().classification);
/** The waiting proposal and earlier versions of the classification. */
export const productDisclosureChanges = (): PolicyChanges<Disclosure> => clone(db().disclosure);

/** The full record (the medicines regulator's: the caller checks canReadProduct() and writes the access log). */
export const getProduct = (numberOrId: string): ProductEntry | undefined => { const p = find(numberOrId); return p ? clone(p) : undefined; };
/** A decided record by its register number or authorisation number (what a form's reference names); never an application or a refusal. */
export function productByReference(ref: string): Pick<ProductEntry, 'number' | 'kind' | 'state'> | undefined {
  const r = ref.trim();
  const p = db().products.find(x => (x.number === r || latest(x).attributes.authorisationNumber?.value === r) && x.history.some(s => s.decision) && x.state !== 'refused');
  return p ? { number: p.number, kind: p.kind, state: p.state } : undefined;
}
/** The record a case registered or acted on. */
export const productOfCase = (caseId: string): ProductEntry | undefined => { const p = [...db().products].reverse().find(x => x.case === caseId || x.history.some(h => h.case === caseId)); return p ? clone(p) : undefined; };

/** The record as publicProductView() reads it: the latest version, the holder's registered name, the status a sealed decision set. */
export function productRecord(p: ProductEntry): ProductRecord {
  const v = latest(p);
  const attributes = clone(v.attributes);
  const o = getOrganisation(p.holder);
  if (attributes.holder) attributes.holder = { ...attributes.holder, value: { organisation: p.holder, ...(o ? { name: currentOrg(o).name } : {}) } };
  // The status is public only as a sealed decision set it: the last decided step (or the lapse of the validity a decision set).
  const decided = [...p.history].reverse().find(s => s.decision || s.case === '');
  const decidedWith = [...p.history].reverse().find(s => s.decision);
  if (decided && decidedWith) attributes.status = { value: decided.state, class: 'public', approvedBy: { decision: decidedWith.decision!, at: decidedWith.at } };
  else delete attributes.status;
  return { productId: p.number, kind: p.kind, version: v.n, attributes, enforcement: p.enforcement.map(({ case: _c, by: _b, completion: _x, sample: _s, recallClass: _k, ...e }) => clone(e)) };
}

export type PublicProductEntry = PublicProduct & { sample?: true };
/** The one shape a product leaves the regulator in: publicProductView() under the classification in force, with the sample marker. */
export const publicProduct = (p: ProductEntry): PublicProductEntry => ({ ...publicProductView(productRecord(p), publicClassification()), ...(p.sample ? { sample: true as const } : {}) });

/** Anyone's list: decided products only (an application under assessment is not listed), each as publicProduct(). By number, or by name where the classification publishes names. */
export function listPublicProducts(filter: { kind?: ProductKind; q?: string; limit?: number } = {}): PublicProductEntry[] {
  const q = filter.q?.trim().toLowerCase();
  const names = publicClassification().approved && publicClassification().fields.includes('name');
  return db().products
    .filter(p => p.history.some(s => s.decision) && p.state !== 'refused')
    .filter(p => !filter.kind || p.kind === filter.kind)
    .map(publicProduct)
    .filter(v => !q || v.productId.toLowerCase() === q || (names && String(v.fields.name ?? '').toLowerCase().includes(q)))
    .slice(0, Math.min(filter.limit ?? 200, 1000));
}

/** Counts by kind and status (no record content). */
export function productCounts(): { total: number; byState: Record<ProductState, number>; byKind: Record<ProductKind, number>; samples: number } {
  const byState = Object.fromEntries(PRODUCT_STATES.map(s => [s, 0])) as Record<ProductState, number>;
  const byKind: Record<ProductKind, number> = { medicine: 0, device: 0 };
  let samples = 0;
  for (const p of db().products) { byState[p.state] += 1; byKind[p.kind] += 1; if (p.sample) samples += 1; }
  return { total: db().products.length, byState, byKind, samples };
}

/** The regulator's own search: numbers and states only (the full record is read one at a time, logged). */
export function findProducts(filter: { holder?: string; state?: ProductState; kind?: ProductKind; limit?: number } = {}): { number: string; kind: ProductKind; state: ProductState; holder: string; name?: string; sample?: true }[] {
  return db().products
    .filter(p => (!filter.holder || p.holder === filter.holder) && (!filter.state || p.state === filter.state) && (!filter.kind || p.kind === filter.kind))
    .slice(-(filter.limit ?? 200))
    .map(p => ({ number: p.number, kind: p.kind, state: p.state, holder: p.holder, ...(typeof latest(p).attributes.name?.value === 'string' ? { name: latest(p).attributes.name!.value as string } : {}), ...(p.sample ? { sample: true as const } : {}) }));
}
