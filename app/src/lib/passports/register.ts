// The register of passports and travel documents (Institutional specification
// Part 2 §A.5 and §C.4; field series Part 4 §5 PAS-APP-001 … 018 and §5.2
// issuance controls; plan step I6). Kept for the institution the nation names
// for the `travelDocuments` slot (it may be the immigration authority; the
// platform never assumes it).
//
// Every issued document links (field series Part 4 §5.2) to:
//   - its application case and the sealed decision;
//   - the verified identity record it relies on (the identity register's
//     number, checked through the identity.verify exchange) and the basis;
//   - its configured document type, the document number production gave it
//     and its validity (the decision's dates);
//   - production, quality-control and custody events (each with who and when);
//   - collection or delivery, with the evidence document;
//   - any replacement, cancellation, revocation, surrender or superseding event.
//
// The data elements are those ICAO Doc 9303 names for a machine-readable
// travel document (document code, issuing state, primary and secondary
// identifiers, document number, nationality, date of birth, sex, dates of
// issue and expiry, optional personal number). The machine-readable zone is
// produced by the nation's personalisation system, not here. No biometric
// template, facial image template or fingerprint is stored: the photograph is
// a document of the application case (the field series' biometric controls,
// Part 4 §3.4, and CFG-IDN-004 need a law and a legal review first).
//
// The fee is the approved schedule's (lib/law/rules.ts, `passports.fees`, a
// schedule of fixed amounts by document type and application kind; shipped
// unset): never typed. An exemption is recorded with the ground the nation's
// law gives and the reasons. A lost or stolen report is not proof of fraud: it
// stops the document answering as valid until the authority decides.
//
// Records are personal and restricted; document numbers are not searchable by
// staff without a stated purpose (the route logs every read and search). Others
// learn status through the exchange (travel-document.status), never the file.
// Changes happen only through the effects of the passport procedures
// (lib/passports/procedures.ts). Held in platform state.

import { recordAudit } from '@/lib/data/store/audit';
import { touch } from '@/lib/data/repo/track';
import { uuid7 } from '@/lib/data/uuid7';

export type DocumentState = 'approved' | 'produced' | 'in-custody' | 'issued' | 'reported-lost' | 'reported-stolen' | 'damaged' | 'cancelled' | 'revoked' | 'expired' | 'surrendered' | 'superseded';
export const DOCUMENT_STATE_LABEL: Record<DocumentState, string> = {
  approved: 'Approved, awaiting production', produced: 'Produced, awaiting quality check', 'in-custody': 'Quality checked, in custody', issued: 'Issued (valid)',
  'reported-lost': 'Reported lost', 'reported-stolen': 'Reported stolen', damaged: 'Reported damaged', cancelled: 'Cancelled', revoked: 'Revoked', expired: 'Expired', surrendered: 'Surrendered', superseded: 'Superseded by a new document',
};
export const APPLICATION_KINDS = ['first', 'renewal', 'child', 'replacement-lost', 'replacement-stolen', 'replacement-damaged', 'emergency', 'limited-validity', 'amendment'] as const;
export type ApplicationKind = (typeof APPLICATION_KINDS)[number];
/** The schedule of fees (a rule of fixed amounts; lines by `<documentType>.<kind>` or `<documentType>`). */
export const FEE_RULE = 'passports.fees';
/** The ICAO Doc 9303 data elements this register keeps for each document (the nation's personalisation system makes the MRZ). */
export const ICAO_ELEMENTS = ['documentCode', 'issuingState', 'surname', 'givenNames', 'documentNumber', 'nationality', 'birthDate', 'sex', 'dateOfIssue', 'dateOfExpiry', 'personalNumber'] as const;

export interface Step { at: string; by: string; what: string; reason: string; case?: string; decision?: string }
export interface Production { at: string; by: string; documentNumber: string; batch: string; quality?: { at: string; by: string; passed: boolean; note: string } }
export interface CustodyEvent { at: string; by: string; event: 'received-in-custody' | 'transferred' | 'handed-over' | 'returned' | 'surrendered'; place?: string; note?: string }
export type Fee = { amountMinor: number; currency: string; rule: { key: string; version: number; digest: string }; code: string; bill?: string } | { exempt: true; ground: string; reasons: string };
export interface TravelDocument {
  id: string;
  /** The register number (the platform's); the document number is the one production gave it. */
  number: string;
  documentType: string;
  kind: ApplicationKind;
  holder: { identity: string; surname: string; givenNames: string; nationality: string; birthDate: string; sex?: string };
  /** The ICAO Doc 9303 data elements, as personalised (set at production). */
  icao?: Partial<Record<(typeof ICAO_ELEMENTS)[number], string>>;
  validFrom: string;
  validUntil: string;
  state: DocumentState;
  fee: Fee;
  productions: Production[];
  custody: CustodyEvent[];
  delivery?: { method: 'collected' | 'delivered'; at: string; by: string; recipient: 'holder' | 'representative'; evidence?: string };
  replaces?: string; replacedBy?: string;
  /** How the identity it relies on was established: the identity.verify receipt, or an official's record of other evidence. */
  identityBasis: { kind: 'exchange'; receipt: string; result: string } | { kind: 'other-evidence'; reasons: string };
  case: string;
  decision?: string;
  history: Step[];
  createdAt: string;
  sample?: true;
}
export interface Review { originalCase: string; reviewCase: string; outcome: 'upheld' | 'overturned'; at: string; by: string; decision?: string; sample?: true }

interface Db { documents: TravelDocument[]; reviews: Review[]; seq: Record<string, number> }
const g = globalThis as unknown as { __civicosPassports?: Db };
const db = (): Db => {
  const d = touch('__civicosPassports', g.__civicosPassports ??= { documents: [], reviews: [], seq: {} });
  d.documents ??= []; d.reviews ??= []; d.seq ??= {};
  return d;
};
export function resetPassports(): void { g.__civicosPassports = undefined; }
const clone = <T,>(x: T): T => structuredClone(x);
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const norm = (n: string) => n.replace(/[\s-]/g, '').toUpperCase();
const find = (n: string) => db().documents.find(d => d.number === n || d.id === n || d.productions.some(p => norm(p.documentNumber) === norm(n)));
const nextNumber = (now: Date) => { const d = db(); const y = String(now.getUTCFullYear()); d.seq[y] = (d.seq[y] ?? 0) + 1; return `TD-${y}-${String(d.seq[y]).padStart(6, '0')}`; };

/** The schedule line a document type and application kind use: the most specific line first. */
export const feeCodes = (documentType: string, kind: string): string[] => [`${documentType}.${kind}`, documentType].map(x => x.toLowerCase().replace(/[^a-z0-9.-]+/g, '-'));

export interface ApproveInput {
  documentType: string; kind: ApplicationKind;
  holder: TravelDocument['holder'];
  validFrom: string; validUntil: string;
  fee: Fee;
  identityBasis: TravelDocument['identityBasis'];
  replaces?: string;
}
export function checkApproval(i: Partial<ApproveInput>): string | null {
  if (!i.documentType?.trim()) return 'Name the document type (the nation\'s list)';
  if (!i.kind || !APPLICATION_KINDS.includes(i.kind)) return `The application is one of ${APPLICATION_KINDS.join(', ')}`;
  const h = i.holder;
  if (!h?.identity?.trim() || !h.surname?.trim() || !h.givenNames?.trim() || !h.birthDate || !DATE.test(h.birthDate)) return 'The holder\'s identity record, names and date of birth';
  if (!/^[A-Z]{3}$/.test(h.nationality ?? '')) return 'Nationality is a three-letter code (ISO 3166-1 alpha-3, as ICAO Doc 9303 uses)';
  if (!i.validFrom || !i.validUntil || !DATE.test(i.validFrom) || !DATE.test(i.validUntil) || i.validUntil <= i.validFrom) return 'The validity the decision sets: from and until, the end after the start';
  if (i.replaces) {
    const old = find(i.replaces);
    if (!old) return `No travel document ${i.replaces}`;
    if (old.holder.identity !== h.identity) return `Travel document ${old.number} is another person's`;
  }
  return null;
}

/** The approval of an application (its decision): the document waits for production. */
export function approveDocument(i: ApproveInput, caseId: string, by: { name: string }, now = new Date(), sample?: true): TravelDocument | { error: string } {
  const why = checkApproval(i);
  if (why) return { error: why };
  if (db().documents.some(d => d.case === caseId)) return { error: 'This case has already approved a document' };
  const at = now.toISOString();
  const d: TravelDocument = {
    id: uuid7(), number: nextNumber(now), documentType: i.documentType.trim().slice(0, 60), kind: i.kind,
    holder: { identity: i.holder.identity.trim(), surname: i.holder.surname.trim().slice(0, 100), givenNames: i.holder.givenNames.trim().slice(0, 100), nationality: i.holder.nationality, birthDate: i.holder.birthDate, ...(i.holder.sex ? { sex: i.holder.sex.slice(0, 20) } : {}) },
    validFrom: i.validFrom, validUntil: i.validUntil, state: 'approved', fee: i.fee, productions: [], custody: [], ...(i.replaces ? { replaces: find(i.replaces)!.number } : {}),
    identityBasis: i.identityBasis, case: caseId, history: [{ at, by: by.name, what: 'approved', reason: 'Issuance decided', case: caseId }], createdAt: at, ...(sample ? { sample } : {}),
  };
  db().documents.push(d);
  recordAudit(by.name, 'passport.approve', `TravelDocument:${d.number}`, 'ok', `${d.documentType} · ${d.kind} · case ${caseId}${sample ? ' · sample' : ''}`);
  return clone(d);
}

export function attachDocumentDecision(numberOrCase: string, decision: string): void {
  const d = find(numberOrCase) ?? db().documents.find(x => x.case === numberOrCase);
  if (!d) return;
  d.decision ??= decision;
  const s = d.history.at(-1);
  if (s && !s.decision) s.decision = decision;
}

/** Production: the document number production gave it and the batch (an attempt; a spoiled one stays on record). */
export function recordProduction(number: string, p: { documentNumber: string; batch: string }, caseId: string, by: { name: string }, now = new Date()): TravelDocument | { error: string } {
  const d = find(number);
  if (!d) return { error: `No travel document ${number}` };
  if (d.state !== 'approved') return { error: `Travel document ${d.number} is ${DOCUMENT_STATE_LABEL[d.state].toLowerCase()}: production follows approval` };
  if (!p.documentNumber.trim() || !p.batch.trim()) return { error: 'Record the document number production gave it and the batch' };
  if (db().documents.some(x => x.productions.some(q => norm(q.documentNumber) === norm(p.documentNumber)))) return { error: `Document number ${p.documentNumber} is already recorded: every number is used once, spoiled ones included` };
  const at = now.toISOString();
  d.productions.push({ at, by: by.name, documentNumber: p.documentNumber.trim().slice(0, 20), batch: p.batch.trim().slice(0, 40) });
  d.state = 'produced';
  d.history.push({ at, by: by.name, what: 'produced', reason: `Batch ${p.batch.trim().slice(0, 40)}`, case: caseId });
  recordAudit(by.name, 'passport.produce', `TravelDocument:${d.number}`, 'ok', `batch ${p.batch.trim().slice(0, 40)} · case ${caseId}`);
  return clone(d);
}

/** The quality check of the latest production: passed, it goes into custody; failed, the attempt is spoiled and production starts again. */
export function recordQuality(number: string, q: { passed: boolean; note: string; place?: string }, issuing: { state: string; documentCode: string }, caseId: string, by: { name: string }, now = new Date()): TravelDocument | { error: string } {
  const d = find(number);
  if (!d) return { error: `No travel document ${number}` };
  const p = d.productions.at(-1);
  if (d.state !== 'produced' || !p) return { error: `Travel document ${d.number} has no production waiting for its quality check` };
  if (!q.passed && !q.note.trim()) return { error: 'Say what failed the quality check' };
  const at = now.toISOString();
  p.quality = { at, by: by.name, passed: q.passed, note: q.note.trim().slice(0, 300) };
  if (!q.passed) {
    d.state = 'approved';
    d.history.push({ at, by: by.name, what: 'spoiled', reason: `Quality check failed: ${q.note.trim().slice(0, 200)}`, case: caseId });
  } else {
    d.state = 'in-custody';
    d.icao = { documentCode: issuing.documentCode, issuingState: issuing.state, surname: d.holder.surname, givenNames: d.holder.givenNames, documentNumber: p.documentNumber, nationality: d.holder.nationality, birthDate: d.holder.birthDate, ...(d.holder.sex ? { sex: d.holder.sex } : {}), dateOfIssue: at.slice(0, 10), dateOfExpiry: d.validUntil };
    d.custody.push({ at, by: by.name, event: 'received-in-custody', ...(q.place ? { place: q.place.slice(0, 100) } : {}) });
    d.history.push({ at, by: by.name, what: 'quality checked; in custody', reason: q.note.trim().slice(0, 200) || 'Passed', case: caseId });
  }
  recordAudit(by.name, `passport.quality.${q.passed ? 'pass' : 'fail'}`, `TravelDocument:${d.number}`, 'ok', `case ${caseId}`);
  return clone(d);
}

/** Collection or delivery from custody, with its evidence: the document is issued; one it replaces is superseded. */
export function recordCollection(number: string, x: { method: 'collected' | 'delivered'; recipient: 'holder' | 'representative'; evidence?: string }, caseId: string, by: { name: string }, now = new Date()): TravelDocument | { error: string } {
  const d = find(number);
  if (!d) return { error: `No travel document ${number}` };
  if (d.state !== 'in-custody') return { error: `Travel document ${d.number} is ${DOCUMENT_STATE_LABEL[d.state].toLowerCase()}: it leaves custody once quality checked` };
  if (!['collected', 'delivered'].includes(x.method) || !['holder', 'representative'].includes(x.recipient)) return { error: 'Say whether it was collected or delivered, and to the holder or a representative' };
  if (!x.evidence) return { error: 'Attach the evidence of collection or delivery' };
  const at = now.toISOString();
  d.delivery = { ...x, at, by: by.name };
  d.custody.push({ at, by: by.name, event: 'handed-over' });
  d.state = 'issued';
  d.history.push({ at, by: by.name, what: x.method, reason: `To the ${x.recipient}`, case: caseId });
  if (d.replaces) {
    const old = find(d.replaces);
    if (old && !['revoked', 'superseded', 'surrendered'].includes(old.state)) { old.state = 'superseded'; old.replacedBy = d.number; old.history.push({ at, by: by.name, what: 'superseded', reason: `Superseded by ${d.number}`, case: caseId }); }
  }
  recordAudit(by.name, 'passport.issue', `TravelDocument:${d.number}`, 'ok', `${x.method} · case ${caseId}`);
  return clone(d);
}

const MOVES: Record<string, { from: DocumentState[]; to: DocumentState }> = {
  'report-lost': { from: ['issued'], to: 'reported-lost' },
  'report-stolen': { from: ['issued', 'in-custody'], to: 'reported-stolen' },
  'report-damaged': { from: ['issued'], to: 'damaged' },
  reinstate: { from: ['reported-lost', 'reported-stolen'], to: 'issued' },
  cancel: { from: ['reported-lost', 'reported-stolen', 'damaged', 'approved', 'produced', 'in-custody'], to: 'cancelled' },
  revoke: { from: ['issued', 'reported-lost', 'reported-stolen', 'damaged'], to: 'revoked' },
  surrender: { from: ['issued', 'damaged', 'cancelled', 'revoked', 'expired', 'superseded', 'reported-lost'], to: 'surrendered' },
};
export const DOCUMENT_MOVES = Object.keys(MOVES);

/** Why a status change could not be made now (null when it can): checked before a decision is sealed. */
export function documentMoveRefusal(number: string, move: string): string | null {
  const d = find(number);
  if (!d) return `No travel document ${number || '(none named)'}`;
  const m = MOVES[move];
  if (!m) return `The change is one of ${DOCUMENT_MOVES.join(', ')}`;
  return m.from.includes(d.state) ? null : `A document that is ${DOCUMENT_STATE_LABEL[d.state].toLowerCase()} cannot take this change (${move})`;
}

/** A report recorded or a decision taken (with reasons); a surrender records the receipt into custody. */
export function changeDocument(number: string, move: string, reason: string, caseId: string, by: { name: string }, now = new Date(), place?: string): TravelDocument | { error: string } {
  const why = documentMoveRefusal(number, move);
  if (why) return { error: why };
  if (!reason.trim()) return { error: 'State the reasons' };
  const d = find(number)!;
  const at = now.toISOString();
  const was = d.state;
  d.state = MOVES[move]!.to;
  if (move === 'surrender') d.custody.push({ at, by: by.name, event: 'surrendered', ...(place ? { place: place.slice(0, 100) } : {}), note: reason.trim().slice(0, 200) });
  d.history.push({ at, by: by.name, what: `${was} → ${d.state}`, reason: reason.trim().slice(0, 500), case: caseId });
  recordAudit(by.name, `passport.${move}`, `TravelDocument:${d.number}`, 'ok', `${was} → ${d.state} · case ${caseId}`);
  return clone(d);
}

/** A review of a refused application (its outcome, kept beside the original decision, which is never changed). */
export function recordReview(r: Omit<Review, 'at' | 'by'>, by: { name: string }, now = new Date()): Review | { error: string } {
  if (db().reviews.some(x => x.reviewCase === r.reviewCase)) return { error: 'This review is already recorded' };
  const x: Review = { ...r, at: now.toISOString(), by: by.name };
  db().reviews.push(x);
  recordAudit(by.name, 'passport.review', `Case:${r.originalCase}`, 'ok', `${r.outcome} · review case ${r.reviewCase}`);
  return clone(x);
}
export function attachReviewDecision(reviewCase: string, decision: string): void { const r = db().reviews.find(x => x.reviewCase === reviewCase); if (r) r.decision ??= decision; }

/** Documents past their expiry become expired (the daily job). */
export function expireDocuments(now = new Date()): string[] {
  const today = now.toISOString().slice(0, 10), out: string[] = [];
  for (const d of db().documents) if (d.state === 'issued' && d.validUntil < today) {
    d.history.push({ at: now.toISOString(), by: 'System (validity)', what: 'issued → expired', reason: `Validity ended on ${d.validUntil}` });
    d.state = 'expired'; out.push(d.number);
  }
  if (out.length) recordAudit('System (validity)', 'passport.expire', 'TravelDocument:validity', 'ok', `${out.length} document(s) expired`);
  return out;
}

export const getTravelDocument = (n: string): TravelDocument | undefined => { const d = find(n); return d ? clone(d) : undefined; };
export const documentOfCase = (caseId: string): TravelDocument | undefined => { const d = db().documents.find(x => x.case === caseId); return d ? clone(d) : undefined; };
export const reviewsOf = (caseId: string): Review[] => db().reviews.filter(r => r.originalCase === caseId || r.reviewCase === caseId).map(clone);

/** Officials' search, by register or document number, or by the holder's identity record (the route logs it with its purpose). */
export function findTravelDocuments(q: { number?: string; identity?: string }): TravelDocument[] {
  if (q.number) { const d = find(q.number); return d ? [clone(d)] : []; }
  if (q.identity) return db().documents.filter(d => d.holder.identity === q.identity).map(clone);
  return [];
}

/**
 * Is this document valid? Its status class and, when valid, until when; never
 * the holder or the file (travel-document.status). A lost or stolen report
 * answers not valid with its class: the authority decides what follows.
 */
export function documentStatus(documentNumber: string, on?: string): { status: 'valid' | 'not-valid' | 'unknown'; reason?: string; validUntil?: string } {
  const d = find(documentNumber);
  if (!d || !d.productions.length) return { status: 'unknown' };
  const day = on && DATE.test(on) ? on : new Date().toISOString().slice(0, 10);
  if (d.state === 'issued' && d.validFrom <= day && d.validUntil >= day) return { status: 'valid', validUntil: d.validUntil };
  return { status: 'not-valid', reason: d.state === 'issued' ? (d.validUntil < day ? 'expired' : 'not-yet-valid') : d.state };
}

/**
 * Production reconciliation (PAS-APP-018): by batch, the document numbers
 * produced, spoiled (failed quality checks), in custody, issued and otherwise
 * accounted for. Numbers only; never a holder.
 */
export function productionReconciliation(): { batch: string; produced: number; spoiled: number; inCustody: number; issued: number; other: number }[] {
  const m = new Map<string, { batch: string; produced: number; spoiled: number; inCustody: number; issued: number; other: number }>();
  for (const d of db().documents) for (const [i, p] of d.productions.entries()) {
    const x = m.get(p.batch) ?? { batch: p.batch, produced: 0, spoiled: 0, inCustody: 0, issued: 0, other: 0 };
    x.produced++;
    const latest = i === d.productions.length - 1;
    if (p.quality && !p.quality.passed) x.spoiled++;
    else if (!latest) x.other++;
    else if (d.state === 'in-custody') x.inCustody++;
    else if (d.state === 'issued') x.issued++;
    else x.other++;
    m.set(p.batch, x);
  }
  return [...m.values()].sort((a, b) => a.batch.localeCompare(b.batch));
}

/** Counts (no holder): documents by state and type, reviews by outcome, samples. */
export function passportCounts(): { byState: Record<string, number>; byType: Record<string, number>; reviews: Record<string, number>; samples: number } {
  const byState: Record<string, number> = {}, byType: Record<string, number> = {}, reviews: Record<string, number> = {};
  let samples = 0;
  for (const d of db().documents) { byState[d.state] = (byState[d.state] ?? 0) + 1; byType[d.documentType] = (byType[d.documentType] ?? 0) + 1; if (d.sample) samples++; }
  for (const r of db().reviews) reviews[r.outcome] = (reviews[r.outcome] ?? 0) + 1;
  return { byState, byType, reviews, samples };
}
