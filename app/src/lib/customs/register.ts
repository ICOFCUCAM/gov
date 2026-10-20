// The customs register (owner's Cycle 3 directive, workstream 4): goods
// declarations with their shipment and goods lines, classification, duty
// assessment, the control channel an officer chose, inspections, payment
// and release. It holds what decided customs cases put there
// (lib/customs/procedures.ts).
//
// Nothing statutory is invented: classification codes are whatever the
// nation's tariff nomenclature uses (digits, checked only for form); duty
// comes from the approved tariff rule in force (lib/law/rules.ts,
// `customs.tariff`, citing the law) or is entered by an officer with
// reasons. The control channel is chosen by an officer with reasons; there
// is no automated risk score. Enforcement (seizure, penalties, detention of
// goods) is not built: those powers stay with the nation's law and a later,
// reviewed module. Declarations are commercially confidential: read by the
// customs authority and auditors with a purpose, every read logged by the
// routes; others learn whether goods were released through the exchange
// (customs.release). Held in platform state.

import { recordAudit } from '@/lib/data/store/audit';
import { touch } from '@/lib/data/repo/track';
import { uuid7 } from '@/lib/data/uuid7';
import { samplesAllowed } from '@/lib/ops/mode';
import type { Citation } from '@/lib/law/register';

export type Direction = 'import' | 'export' | 'transit';
export type Channel = 'release-on-documents' | 'documentary-check' | 'physical-inspection';
export const CHANNELS: Channel[] = ['release-on-documents', 'documentary-check', 'physical-inspection'];

export interface GoodsLine { n: number; code: string; description: string; origin: string; quantity: number; unit: string; valueMinor: number }

export interface LineDuty { n: number; code: string; valueMinor: number; dutyMinor: number; method: { kind: 'rule'; rule: string; version: number; digest: string; citations: Citation[]; steps: string[] } | { kind: 'entered'; reasons: string } }

export interface Declaration {
  id: string;
  /** The declaration number: CUS-YYYY-NNNNNN. */
  number: string;
  direction: Direction;
  declarant: { kind: 'organisation' | 'person'; ref: string; name: string };
  shipment: { mode: string; transportRef: string; from: string; to: string; arrival?: string };
  currency: string;
  /** Every version of the goods lines: amendments and reclassifications add one. */
  versions: { n: number; lines: GoodsLine[]; at: string; by: string; case: string; reason: string }[];
  /** The channel in force: the latest of `channels`. */
  channel?: { kind: Channel; reasons: string; by: string; at: string };
  /** Every channel chosen, in order (kept when a later choice raises it). */
  channels?: { kind: Channel; reasons: string; by: string; at: string }[];
  inspections: { at: string; by: string; outcome: 'no-discrepancy' | 'discrepancy'; findings: string; case: string }[];
  assessment?: { reference: string; totalMinor: number; lines: LineDuty[]; at: string; by: string; case: string; decision?: string; paidMinor: number };
  state: 'lodged' | 'assessed' | 'released' | 'release-refused' | 'withdrawn';
  release?: { at: string; by: string; case: string; decision?: string; reasons: string };
  case: string;
}

interface Db { declarations: Declaration[]; posted: string[]; seq: Record<string, number> }
const g = globalThis as unknown as { __civicosCustoms?: Db };
const db = (): Db => {
  const d = touch('__civicosCustoms', g.__civicosCustoms ??= { declarations: [], posted: [], seq: {} });
  d.declarations ??= []; d.posted ??= []; d.seq ??= {};
  return d;
};
export function resetCustoms(): void { g.__civicosCustoms = undefined; }
const clone = <T,>(x: T): T => structuredClone(x);
const next = (k: string, now: Date) => { const d = db(); const y = String(now.getUTCFullYear()); d.seq[`${k}${y}`] = (d.seq[`${k}${y}`] ?? 0) + 1; return `${k}-${y}-${String(d.seq[`${k}${y}`]).padStart(6, '0')}`; };
const CODE = /^\d{4,12}$/;
const COUNTRY = /^[A-Z]{2}$/;

/**
 * Read goods lines typed one per line: `code | description | origin | quantity unit | value`
 * (value in minor units). Each line is checked; nothing is guessed.
 */
export function parseGoods(text: string): GoodsLine[] | { error: string } {
  const rows = text.split('\n').map(r => r.trim()).filter(Boolean);
  if (!rows.length) return { error: 'List the goods, one line each: code | description | origin | quantity unit | value' };
  if (rows.length > 200) return { error: 'At most 200 goods lines per declaration' };
  const out: GoodsLine[] = [];
  for (const [i, r] of rows.entries()) {
    const [code, description, origin, qty, value] = r.split('|').map(x => x.trim());
    const n = i + 1;
    if (!code || !CODE.test(code)) return { error: `Line ${n}: the classification code is 4 to 12 digits` };
    if (!description) return { error: `Line ${n}: describe the goods` };
    if (!origin || !COUNTRY.test(origin.toUpperCase())) return { error: `Line ${n}: the origin is a two-letter country code` };
    const m = /^(\d+(?:\.\d+)?)\s*([A-Za-z]{1,12})$/.exec(qty ?? '');
    if (!m) return { error: `Line ${n}: the quantity is a number and a unit (e.g. 120 kg)` };
    const valueMinor = Number(value);
    if (!Number.isInteger(valueMinor) || valueMinor < 0) return { error: `Line ${n}: the customs value is a whole number of minor units` };
    out.push({ n, code, description: description.slice(0, 200), origin: origin.toUpperCase(), quantity: Number(m[1]), unit: m[2]!.toLowerCase(), valueMinor });
  }
  return out;
}

export interface NewDeclaration { direction: string; declarant: { kind: string; ref: string; name: string }; shipment: { mode: string; transportRef: string; from: string; to: string; arrival?: string }; currency: string; goods: string }

export function lodgeDeclaration(input: NewDeclaration, caseId: string, by: string, now = new Date()): Declaration | { error: string } {
  if (!['import', 'export', 'transit'].includes(input.direction)) return { error: 'The direction is import, export or transit' };
  if (!input.declarant?.ref?.trim() || !input.declarant.name?.trim()) return { error: 'Name the declarant and their register reference' };
  if (!input.shipment?.transportRef?.trim()) return { error: 'Give the transport document reference (bill of lading, air waybill, consignment note)' };
  if (!COUNTRY.test(input.shipment.from ?? '') || !COUNTRY.test(input.shipment.to ?? '')) return { error: 'Countries of dispatch and destination are two-letter codes' };
  if (!/^[A-Z]{3}$/.test(input.currency)) return { error: 'The currency is a three-letter code' };
  const lines = parseGoods(input.goods);
  if ('error' in lines) return lines;
  if (db().declarations.some(d => d.shipment.transportRef === input.shipment.transportRef.trim() && d.declarant.ref === input.declarant.ref.trim() && d.state !== 'withdrawn')) return { error: `A declaration for ${input.shipment.transportRef} by this declarant is already lodged` };
  const at = now.toISOString();
  const d: Declaration = {
    id: uuid7(), number: next('CUS', now), direction: input.direction as Direction,
    declarant: { kind: input.declarant.kind === 'person' ? 'person' : 'organisation', ref: input.declarant.ref.trim().slice(0, 80), name: input.declarant.name.trim().slice(0, 200) },
    shipment: { mode: (input.shipment.mode || 'unspecified').slice(0, 40), transportRef: input.shipment.transportRef.trim().slice(0, 80), from: input.shipment.from, to: input.shipment.to, ...(input.shipment.arrival ? { arrival: input.shipment.arrival } : {}) },
    currency: input.currency, versions: [{ n: 1, lines, at, by, case: caseId, reason: 'Lodged' }], inspections: [], state: 'lodged', case: caseId,
  };
  db().declarations.push(d);
  recordAudit(by, 'customs.declaration.lodge', `Declaration:${d.number}`, 'ok', `${d.direction} · ${lines.length} line(s) · case ${caseId}`);
  return clone(d);
}

const find = (number: string) => db().declarations.find(x => x.number === number || x.id === number);
export const linesOf = (d: Declaration): GoodsLine[] => d.versions.at(-1)!.lines;

/** Correct the goods lines or their classification before assessment (a new version with its reason). */
export function amendGoods(number: string, goods: string, reason: string, caseId: string, by: string, now = new Date()): Declaration | { error: string } {
  const d = find(number);
  if (!d) return { error: `No declaration ${number}` };
  if (d.state !== 'lodged') return { error: 'Goods can be amended only before the duty is assessed' };
  if (!reason.trim()) return { error: 'State why the goods or their classification change' };
  const lines = parseGoods(goods);
  if ('error' in lines) return lines;
  d.versions.push({ n: d.versions.length + 1, lines, at: now.toISOString(), by, case: caseId, reason: reason.slice(0, 500) });
  recordAudit(by, 'customs.declaration.amend', `Declaration:${d.number}`, 'ok', `version ${d.versions.length} · case ${caseId}`);
  return clone(d);
}

/**
 * The control channel, chosen by an officer with reasons; no score decides it.
 * Every choice is kept. Once an inspection has been recorded the channel can
 * only be raised, never lowered (a discrepancy cannot be followed by release
 * on documents).
 */
export function chooseChannel(number: string, channel: string, reasons: string, by: string, now = new Date()): Declaration | { error: string } {
  const d = find(number);
  if (!d) return { error: `No declaration ${number}` };
  if (!CHANNELS.includes(channel as Channel)) return { error: `The channel is one of ${CHANNELS.join(', ')}` };
  if (!reasons.trim()) return { error: 'State why this channel was chosen' };
  if (d.state === 'released' || d.state === 'withdrawn') return { error: `The declaration is ${d.state}` };
  if (d.channel && d.inspections.length && CHANNELS.indexOf(channel as Channel) < CHANNELS.indexOf(d.channel.kind)) return { error: `An inspection has been recorded under ${d.channel.kind}: the channel can be raised, not lowered` };
  const choice = { kind: channel as Channel, reasons: reasons.slice(0, 500), by, at: now.toISOString() };
  d.channels = [...(d.channels ?? (d.channel ? [d.channel] : [])), choice];
  d.channel = choice;
  recordAudit(by, 'customs.channel', `Declaration:${d.number}`, 'ok', d.channels.length > 1 ? `${channel} (choice ${d.channels.length})` : channel);
  return clone(d);
}

export function recordCustomsInspection(number: string, input: { outcome: string; findings: string }, caseId: string, by: string, now = new Date()): Declaration | { error: string } {
  const d = find(number);
  if (!d) return { error: `No declaration ${number}` };
  if (!d.channel || d.channel.kind === 'release-on-documents') return { error: 'No inspection was chosen for this declaration' };
  if (!['no-discrepancy', 'discrepancy'].includes(input.outcome)) return { error: 'The outcome is no-discrepancy or discrepancy' };
  if (!input.findings.trim()) return { error: 'Record the findings' };
  d.inspections.push({ at: now.toISOString(), by, outcome: input.outcome as 'no-discrepancy' | 'discrepancy', findings: input.findings.slice(0, 2000), case: caseId });
  recordAudit(by, 'customs.inspection', `Declaration:${d.number}`, 'ok', `${input.outcome} · case ${caseId}`);
  return clone(d);
}

/** Record the duty a decided case assessed (per line: an approved rule, or entered with reasons). */
export function recordDuty(number: string, lines: LineDuty[], caseId: string, by: string, now = new Date()): Declaration | { error: string } {
  const d = find(number);
  if (!d) return { error: `No declaration ${number}` };
  if (d.state !== 'lodged') return { error: `The duty on ${d.number} is already assessed` };
  if (lines.some(l => !Number.isInteger(l.dutyMinor) || l.dutyMinor < 0)) return { error: 'Duty is a whole, non-negative number of minor units per line' };
  if (lines.some(l => l.method.kind === 'entered' && !l.method.reasons.trim())) return { error: 'Duty entered without an approved tariff needs its reasons' };
  const total = lines.reduce((s, l) => s + l.dutyMinor, 0);
  d.assessment = { reference: `customs:${next('CDA', now)}`, totalMinor: total, lines: clone(lines), at: now.toISOString(), by, case: caseId, paidMinor: 0 };
  d.state = 'assessed';
  recordAudit(by, 'customs.assess', `Declaration:${d.number}`, 'ok', `${d.currency} ${total / 100} · ${lines.filter(l => l.method.kind === 'rule').length}/${lines.length} line(s) by an approved tariff · case ${caseId}`);
  return clone(d);
}

export function attachDutyDecision(number: string, decision: string): void {
  const d = find(number);
  if (d?.assessment) d.assessment.decision ??= decision;
}

/** Why the goods cannot be released yet, or null. */
export function releaseBlocker(d: Declaration): string | null {
  if (d.state !== 'assessed') return d.state === 'lodged' ? 'The duty is not assessed yet' : `The declaration is ${d.state}`;
  if (!d.channel) return 'No control channel has been chosen';
  const last = d.inspections.at(-1);
  if (d.channel.kind !== 'release-on-documents' && !last) return `The ${d.channel.kind.replace(/-/g, ' ')} has not been recorded`;
  // Whatever the channel, a discrepancy must be followed by a clean inspection.
  if (last?.outcome === 'discrepancy') return 'The last inspection found a discrepancy: inspect again after correcting, or refuse release';
  if (d.assessment && d.assessment.paidMinor < d.assessment.totalMinor) return `Duty of ${d.assessment.totalMinor - d.assessment.paidMinor} minor units is unpaid`;
  return null;
}

export function releaseGoods(number: string, reasons: string, caseId: string, by: string, now = new Date()): Declaration | { error: string } {
  const d = find(number);
  if (!d) return { error: `No declaration ${number}` };
  const why = releaseBlocker(d);
  if (why) return { error: why };
  d.state = 'released';
  d.release = { at: now.toISOString(), by, case: caseId, reasons: reasons.slice(0, 500) };
  recordAudit(by, 'customs.release', `Declaration:${d.number}`, 'ok', `case ${caseId}`);
  return clone(d);
}

export function refuseRelease(number: string, reasons: string, caseId: string, by: string, now = new Date()): Declaration | { error: string } {
  const d = find(number);
  if (!d) return { error: `No declaration ${number}` };
  if (d.state === 'released') return { error: 'Already released' };
  if (!reasons.trim()) return { error: 'State the reasons' };
  d.state = 'release-refused';
  d.release = { at: now.toISOString(), by, case: caseId, reasons: reasons.slice(0, 500) };
  recordAudit(by, 'customs.release.refuse', `Declaration:${d.number}`, 'ok', `case ${caseId}`);
  return clone(d);
}

export function attachReleaseDecision(number: string, decision: string): void {
  const d = find(number);
  if (d?.release) d.release.decision ??= decision;
}

/** Post the payments that arrived for customs duty (receipts with a `customs:` reference), each once. */
export function reconcileCustomsPayments(receipts: { id: string; reference?: string; amountMinor: number; currency: string; simulated?: boolean }[], by = 'System (reconciliation)'): { posted: number; unmatched: string[] } {
  const d = db();
  let posted = 0; const unmatched: string[] = [];
  for (const r of receipts) {
    if (!r.reference?.startsWith('customs:') || d.posted.includes(r.id)) continue;
    // A stand-in payment (no money moved) never counts in production.
    if (r.simulated && !samplesAllowed()) continue;
    const dec = d.declarations.find(x => x.assessment?.reference === r.reference);
    if (!dec?.assessment || r.currency !== dec.currency) { unmatched.push(r.id); continue; }
    dec.assessment.paidMinor += r.amountMinor;
    d.posted.push(r.id);
    posted += 1;
    recordAudit(by, 'customs.payment.post', `Declaration:${dec.number}`, 'ok', `receipt ${r.id}`);
  }
  return { posted, unmatched };
}

export const getDeclaration = (number: string): Declaration | undefined => { const d = find(number); return d ? clone(d) : undefined; };
export const declarationOfCase = (caseId: string): Declaration | undefined => { const d = [...db().declarations].reverse().find(x => x.case === caseId); return d ? clone(d) : undefined; };
export const declarationsOf = (declarantRef: string): Declaration[] => db().declarations.filter(d => d.declarant.ref === declarantRef).map(clone);
export function customsCounts(): Record<Declaration['state'], number> {
  const out = { lodged: 0, assessed: 0, released: 0, 'release-refused': 0, withdrawn: 0 };
  for (const d of db().declarations) out[d.state] += 1;
  return out;
}
