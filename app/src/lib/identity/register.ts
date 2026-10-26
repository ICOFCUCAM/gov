// The national identity register (Institutional specification Part 2 §A.2
// and §C.1; field series Part 4 §3; directions 16.1 "National ID"; plan step
// I6). Owned by the identity authority the nation names (deployment slot
// `identity`): identity records, the credentials issued on them with their
// status, production and delivery, and identity-resolution determinations.
//
// What it keeps apart, as the specification asks:
//   - National identity is separate from civil registration: a record links
//     to a civil register entry (birth registration number) only as an
//     explicit link with its basis; a civil event never creates, merges or
//     invalidates an identity here. Nothing in the civil register changes.
//   - Each claimed attribute keeps its source and verification status
//     (identity_claims); nothing is inferred from a name alone.
//   - A possible duplicate is a review flag, never a merge: candidates are
//     found (findCandidates()), and only an official's determination with
//     reasons, made in an identity case, records "same person", "different"
//     or "unresolved". A record found to duplicate another is superseded by
//     a link and kept; nothing is deleted.
//   - A credential's status changes only through a decided case
//     (suspension, revocation, reinstatement, cancellation, correction) or a
//     recorded report (lost, stolen, damaged): a lost or stolen report is not
//     proof of fraud; it stops the credential verifying as valid until the
//     authority decides.
//   - Production and delivery are recorded as events (who produced it, the
//     serial, who delivered it, how, with the evidence document); a
//     credential is active only once delivered.
//   - No biometric field, template or score exists here (field series Part 4
//     §3.4: biometrics only where a law expressly authorises them, after a
//     legal review: CFG-IDN-004, plan I11).
//
// Records are personal and restricted: read only by the identity authority's
// officials (and auditors with a purpose), every read and search written to
// the access log by the route (lib/auth/roles.ts canReadIdentity()); numbers
// are masked in lists. Other institutions learn only a verification result
// through the exchange (identity.verify), never the record. Changes happen
// only through the effects of the identity procedures
// (lib/identity/procedures.ts). Held in platform state.

import { recordAudit } from '@/lib/data/store/audit';
import { touch } from '@/lib/data/repo/track';
import { uuid7 } from '@/lib/data/uuid7';

export type ClaimSource = 'civil-register' | 'evidence' | 'applicant';
export type Verification = 'verified' | 'unverified' | 'disputed';
export interface IdentityClaim { attribute: 'givenNames' | 'familyName' | 'birthDate' | 'sex' | 'birthPlace' | 'nationality'; value: string; source: ClaimSource; verification: Verification; effectiveFrom: string }
export type RecordState = 'active' | 'superseded' | 'revoked';
export type CredentialState = 'requested' | 'produced' | 'active' | 'suspended' | 'revoked' | 'reported-lost' | 'reported-stolen' | 'damaged' | 'cancelled' | 'replaced' | 'expired';
export const CREDENTIAL_STATE_LABEL: Record<CredentialState, string> = {
  requested: 'Production requested', produced: 'Produced, awaiting delivery', active: 'Active', suspended: 'Suspended', revoked: 'Revoked',
  'reported-lost': 'Reported lost', 'reported-stolen': 'Reported stolen', damaged: 'Reported damaged', cancelled: 'Cancelled', replaced: 'Replaced', expired: 'Expired',
};
/** Outcomes an official records when two records may be the same person (never computed). */
export const DETERMINATIONS = ['same-person', 'different-persons', 'unresolved'] as const;
export type Determination = (typeof DETERMINATIONS)[number];

export interface Actor { id?: string; name: string }
export interface Step { at: string; by: string; what: string; reason: string; case?: string; decision?: string }
export interface Delivery { method: 'collected' | 'delivered'; at: string; by: string; recipient: 'holder' | 'representative'; evidence?: string; place?: string }
export interface Credential {
  number: string;
  /** The nation's credential type (its list; none ships). */
  type: string;
  state: CredentialState;
  validFrom?: string;
  validUntil?: string;
  production?: { at: string; by: string; serial: string; qualityChecked: boolean };
  delivery?: Delivery;
  /** The credential this one replaces, and the one that replaced it. */
  replaces?: string; replacedBy?: string;
  case: string;
  decision?: string;
  history: Step[];
}
export interface ResolutionEntry { other: string; outcome: Determination; reasons: string; case: string; decision?: string; at: string; by: string }
export interface IdentityRecord {
  id: string;
  /** The register number (the platform's; the nation's own identifier scheme is CFG-IDN-002). */
  number: string;
  /** The explicit link to a civil register entry, with its basis (identity_link); absent when there is none. */
  civilLink?: { registration: string; basis: string };
  claims: IdentityClaim[];
  eligibility: { rule: string; outcome: string; by: string; at: string };
  state: RecordState;
  /** Superseded by a determination that it duplicates this record. */
  supersededBy?: string;
  resolution: ResolutionEntry[];
  /** Under review in an open identity case (a duplicate, misuse, compromise or verification dispute). */
  underReview?: { case: string; kind: string; since: string };
  credentials: Credential[];
  case: string;
  decision?: string;
  history: Step[];
  createdAt: string;
  sample?: true;
}

interface Db { records: IdentityRecord[]; seq: Record<string, number> }
const g = globalThis as unknown as { __civicosIdentity?: Db };
const db = (): Db => {
  const d = touch('__civicosIdentity', g.__civicosIdentity ??= { records: [], seq: {} });
  d.records ??= []; d.seq ??= {};
  return d;
};
export function resetIdentity(): void { g.__civicosIdentity = undefined; }
const clone = <T,>(x: T): T => structuredClone(x);
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const fold = (s: string | undefined) => (s ?? '').normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
const next = (prefix: string, now: Date) => { const d = db(); const y = String(now.getUTCFullYear()); const k = `${prefix}:${y}`; d.seq[k] = (d.seq[k] ?? 0) + 1; return `${prefix}-${y}-${String(d.seq[k]).padStart(6, '0')}`; };
const claim = (r: IdentityRecord, a: IdentityClaim['attribute']) => r.claims.filter(c => c.attribute === a).at(-1)?.value;

/** A number as staff lists show it: the last three characters only (field series Part 4 §3.2: masked by default). */
export const maskNumber = (n: string): string => (n.length > 6 ? `${n.slice(0, n.indexOf('-') + 1)}•••${n.slice(-3)}` : '•••');

export interface EnrolInput {
  givenNames: string; familyName: string; birthDate: string; sex?: string; birthPlace?: string; nationality?: string;
  /** The civil register entry the identity relies on, and the provision that allows the link. */
  civilRegistration?: string; linkBasis?: string;
  /** Which claims were verified, and from where. */
  verifiedFrom?: ClaimSource;
  eligibility: { rule: string; outcome: string };
}

export function checkEnrolment(i: Partial<EnrolInput>): string | null {
  if (!i.givenNames?.trim() || !i.familyName?.trim()) return 'Give the given names and family name as the evidence shows them';
  if (!i.birthDate || !DATE.test(i.birthDate)) return 'The date of birth is a date (YYYY-MM-DD)';
  if (i.civilRegistration && !i.linkBasis?.trim()) return 'A link to the civil register states its basis (the provision or record that allows it)';
  if (!i.eligibility?.rule?.trim() || !i.eligibility.outcome?.trim()) return 'Record the eligibility rule applied and its outcome';
  return null;
}

/**
 * Records that may be the same person: the same civil register entry, or the
 * same folded names and date of birth. Never decides: an official records a
 * determination with reasons in an identity case.
 */
export function findCandidates(q: { civilRegistration?: string; givenNames?: string; familyName?: string; birthDate?: string }, exceptNumber?: string): { number: string; why: string }[] {
  const out: { number: string; why: string }[] = [];
  for (const r of db().records) {
    if (r.number === exceptNumber || r.state !== 'active') continue;
    if (q.civilRegistration && r.civilLink?.registration === q.civilRegistration) { out.push({ number: r.number, why: 'linked to the same civil register entry' }); continue; }
    if (q.familyName && q.birthDate && fold(claim(r, 'familyName')) === fold(q.familyName) && fold(claim(r, 'givenNames')) === fold(q.givenNames) && claim(r, 'birthDate') === q.birthDate) out.push({ number: r.number, why: 'same names and date of birth' });
  }
  return out;
}

/** Enrol an identity (the decision of an enrolment case). */
export function enrolIdentity(i: EnrolInput, caseId: string, by: Actor, now = new Date(), sample?: true): IdentityRecord | { error: string } {
  const why = checkEnrolment(i);
  if (why) return { error: why };
  if (db().records.some(r => r.case === caseId)) return { error: 'This case has already enrolled an identity' };
  const at = now.toISOString();
  const src: ClaimSource = i.verifiedFrom ?? (i.civilRegistration ? 'civil-register' : 'evidence');
  const ver: Verification = i.verifiedFrom === 'applicant' ? 'unverified' : 'verified';
  const claims: IdentityClaim[] = ([['givenNames', i.givenNames], ['familyName', i.familyName], ['birthDate', i.birthDate], ['sex', i.sex], ['birthPlace', i.birthPlace], ['nationality', i.nationality]] as const)
    .filter(([, v]) => !!v?.trim()).map(([attribute, value]) => ({ attribute, value: value!.trim().slice(0, 200), source: src, verification: ver, effectiveFrom: at.slice(0, 10) }));
  const r: IdentityRecord = {
    id: uuid7(), number: next('ID', now), ...(i.civilRegistration ? { civilLink: { registration: i.civilRegistration.trim(), basis: i.linkBasis!.trim().slice(0, 300) } } : {}),
    claims, eligibility: { rule: i.eligibility.rule.trim().slice(0, 300), outcome: i.eligibility.outcome.trim().slice(0, 200), by: by.name, at },
    state: 'active', resolution: [], credentials: [], case: caseId, history: [{ at, by: by.name, what: 'enrolled', reason: 'Identity enrolment decided', case: caseId }], createdAt: at, ...(sample ? { sample } : {}),
  };
  db().records.push(r);
  // The audit entry carries the register number only, never a name.
  recordAudit(by.name, 'identity.enrol', `Identity:${r.number}`, 'ok', `case ${caseId}${i.civilRegistration ? ' · linked to the civil register' : ''}${sample ? ' · sample' : ''}`);
  return clone(r);
}

const find = (n: string) => db().records.find(r => r.number === n || r.id === n);
const findCredential = (n: string): { r: IdentityRecord; c: Credential } | undefined => {
  for (const r of db().records) { const c = r.credentials.find(x => x.number === n); if (c) return { r, c }; }
  return undefined;
};

export function attachIdentityDecision(numberOrCase: string, decision: string, credential?: string): void {
  const r = find(numberOrCase) ?? db().records.find(x => x.case === numberOrCase);
  if (!r) return;
  if (credential) { const c = r.credentials.find(x => x.number === credential); if (c) { c.decision ??= decision; const s = c.history.at(-1); if (s && !s.decision) s.decision = decision; } return; }
  r.decision ??= decision;
  const s = r.history.at(-1);
  if (s && !s.decision) s.decision = decision;
}

/** Request production of a credential on an active record (the decision of a credential case). A replacement or renewal names the credential it replaces. */
export function requestCredential(input: { identity: string; type: string; validFrom: string; validUntil: string; replaces?: string }, caseId: string, by: Actor, now = new Date()): Credential | { error: string } {
  const r = find(input.identity);
  if (!r) return { error: `No identity record ${input.identity}` };
  if (r.state !== 'active') return { error: `Identity ${r.number} is ${r.state}: no credential is issued on it` };
  if (r.underReview) return { error: `Identity ${r.number} is under review (case ${r.underReview.case}): no credential is issued until it is decided` };
  if (!input.type.trim()) return { error: 'Name the credential type (the nation\'s list)' };
  if (!DATE.test(input.validFrom) || !DATE.test(input.validUntil) || input.validUntil <= input.validFrom) return { error: 'The validity dates the decision sets: from and until, the end after the start' };
  let old: Credential | undefined;
  if (input.replaces) {
    old = r.credentials.find(c => c.number === input.replaces);
    if (!old) return { error: `Credential ${input.replaces} is not on identity ${r.number}` };
    if (['replaced', 'revoked'].includes(old.state)) return { error: `Credential ${old.number} is ${old.state}` };
  } else if (r.credentials.some(c => ['requested', 'produced', 'active', 'suspended'].includes(c.state))) return { error: `Identity ${r.number} already holds a credential in force: a renewal or replacement names it` };
  const at = now.toISOString();
  const c: Credential = { number: next('IDC', now), type: input.type.trim().slice(0, 60), state: 'requested', validFrom: input.validFrom, validUntil: input.validUntil, ...(old ? { replaces: old.number } : {}), case: caseId, history: [{ at, by: by.name, what: 'production requested', reason: old ? `Replaces ${old.number}` : 'First credential', case: caseId }] };
  r.credentials.push(c);
  recordAudit(by.name, 'identity.credential.request', `Identity:${r.number}`, 'ok', `credential ${c.number} · ${c.type}${old ? ` · replaces ${old.number}` : ''} · case ${caseId}`);
  return clone(c);
}

/** Production of a requested credential: the serial and quality check (an official of the identity authority records it). */
export function recordProduction(credential: string, p: { serial: string; qualityChecked: boolean }, caseId: string, by: Actor, now = new Date()): Credential | { error: string } {
  const f = findCredential(credential);
  if (!f) return { error: `No credential ${credential}` };
  if (f.c.state !== 'requested') return { error: `Credential ${credential} is ${f.c.state}: production is recorded once, after the request` };
  if (!p.serial.trim()) return { error: 'Record the serial the production gave it' };
  if (!p.qualityChecked) return { error: 'A credential is delivered only after its quality check passes: record the failed item and request it again' };
  const at = now.toISOString();
  f.c.production = { at, by: by.name, serial: p.serial.trim().slice(0, 40), qualityChecked: true };
  f.c.state = 'produced';
  f.c.history.push({ at, by: by.name, what: 'produced', reason: 'Production and quality check recorded', case: caseId });
  recordAudit(by.name, 'identity.credential.produce', `Identity:${f.r.number}`, 'ok', `credential ${credential} · case ${caseId}`);
  return clone(f.c);
}

/** Delivery or collection, with its evidence: the credential becomes active; the one it replaces is replaced. */
export function recordDelivery(credential: string, d: Omit<Delivery, 'at' | 'by'>, caseId: string, by: Actor, now = new Date()): Credential | { error: string } {
  const f = findCredential(credential);
  if (!f) return { error: `No credential ${credential}` };
  if (f.c.state !== 'produced') return { error: `Credential ${credential} is ${f.c.state}: it is delivered once produced` };
  if (!['collected', 'delivered'].includes(d.method) || !['holder', 'representative'].includes(d.recipient)) return { error: 'Say whether it was collected or delivered, and to the holder or a representative' };
  if (!d.evidence) return { error: 'Attach the evidence of delivery or collection' };
  const at = now.toISOString();
  f.c.delivery = { ...d, at, by: by.name };
  f.c.state = 'active';
  f.c.history.push({ at, by: by.name, what: d.method, reason: `To the ${d.recipient}`, case: caseId });
  if (f.c.replaces) {
    const old = f.r.credentials.find(c => c.number === f.c.replaces);
    // A credential still in force becomes replaced; one already cancelled or revoked keeps that status and gains the link.
    if (old && !old.replacedBy) {
      old.replacedBy = f.c.number;
      if (!['revoked', 'cancelled', 'replaced', 'expired'].includes(old.state)) old.state = 'replaced';
      old.history.push({ at, by: by.name, what: old.state === 'replaced' ? 'replaced' : `${old.state}; replacement issued`, reason: `Replaced by ${f.c.number}`, case: caseId });
    }
  }
  recordAudit(by.name, 'identity.credential.deliver', `Identity:${f.r.number}`, 'ok', `credential ${credential} · ${d.method} · case ${caseId}`);
  return clone(f.c);
}

/** Moves of a credential's status and what may take each (a report, or a decision with reasons). */
const MOVES: Record<string, { from: CredentialState[]; to: CredentialState }> = {
  'report-lost': { from: ['active', 'produced', 'suspended'], to: 'reported-lost' },
  'report-stolen': { from: ['active', 'produced', 'suspended'], to: 'reported-stolen' },
  'report-damaged': { from: ['active'], to: 'damaged' },
  suspend: { from: ['active', 'reported-lost', 'reported-stolen', 'damaged'], to: 'suspended' },
  reinstate: { from: ['suspended', 'reported-lost', 'reported-stolen'], to: 'active' },
  revoke: { from: ['active', 'suspended', 'reported-lost', 'reported-stolen', 'damaged', 'produced', 'requested'], to: 'revoked' },
  cancel: { from: ['reported-lost', 'reported-stolen', 'damaged', 'requested', 'produced'], to: 'cancelled' },
};
export const CREDENTIAL_MOVES = Object.keys(MOVES);

/** Why a status change could not be made now (null when it can): checked before a decision is sealed. */
export function credentialMoveRefusal(credential: string, move: string, correctTo?: CredentialState): string | null {
  const f = findCredential(credential);
  if (!f) return `No credential ${credential || '(none named)'}`;
  if (move === 'correct-status') return !correctTo || !(correctTo in CREDENTIAL_STATE_LABEL) ? 'Name the status the record should show' : correctTo === f.c.state ? `Credential ${credential} already shows ${correctTo}` : null;
  const m = MOVES[move];
  if (!m) return `The change is one of ${[...CREDENTIAL_MOVES, 'correct-status'].join(', ')}`;
  return m.from.includes(f.c.state) ? null : `A credential that is ${CREDENTIAL_STATE_LABEL[f.c.state].toLowerCase()} cannot take this change (${move})`;
}

/** Change a credential's status: a report recorded, or a decision taken in a case (with reasons). A correction (correct-status) sets a stated status after a discrepancy review. */
export function changeCredential(credential: string, move: string, reason: string, caseId: string, by: Actor, now = new Date(), correctTo?: CredentialState): Credential | { error: string } {
  const f = findCredential(credential);
  if (!f) return { error: `No credential ${credential}` };
  if (!reason.trim()) return { error: 'State the reasons' };
  let to: CredentialState;
  if (move === 'correct-status') {
    if (!correctTo || !(correctTo in CREDENTIAL_STATE_LABEL)) return { error: 'Name the status the record should show' };
    if (correctTo === f.c.state) return { error: `Credential ${credential} already shows ${correctTo}` };
    to = correctTo;
  } else {
    const m = MOVES[move];
    if (!m) return { error: `The change is one of ${[...CREDENTIAL_MOVES, 'correct-status'].join(', ')}` };
    if (!m.from.includes(f.c.state)) return { error: `A credential that is ${CREDENTIAL_STATE_LABEL[f.c.state].toLowerCase()} cannot take this change (${move})` };
    to = m.to;
  }
  const at = now.toISOString();
  const was = f.c.state;
  f.c.state = to;
  f.c.history.push({ at, by: by.name, what: `${was} → ${to}`, reason: reason.trim().slice(0, 500), case: caseId });
  recordAudit(by.name, `identity.credential.${move}`, `Identity:${f.r.number}`, 'ok', `credential ${credential} · ${was} → ${to} · case ${caseId}`);
  return clone(f.c);
}

/** Open or close the review flag on records (an identity case about them): verification answers "additional review required" meanwhile. */
export function markReview(numbers: string[], review: { case: string; kind: string } | null, by: Actor, now = new Date()): { error: string } | { ok: true } {
  const rs = numbers.map(find);
  if (!numbers.length || rs.some(r => !r)) return { error: `Name identity records of the register (${numbers.join(', ') || 'none named'})` };
  for (const r of rs) {
    if (review) r!.underReview = { case: review.case, kind: review.kind, since: now.toISOString() };
    else delete r!.underReview;
  }
  recordAudit(by.name, review ? 'identity.review.open' : 'identity.review.close', `Identity:${rs.map(r => r!.number).join(',')}`, 'ok', review ? `${review.kind} · case ${review.case}` : 'review closed');
  return { ok: true };
}

/**
 * An official's determination about two records (decided in an identity case,
 * with reasons): recorded on both; when they are the same person the later
 * record is superseded by a link to the earlier, and its credentials stop
 * (cancelled), kept with their history. Never computed, never a merge.
 */
export function recordDetermination(a: string, b: string, outcome: Determination, reasons: string, caseId: string, by: Actor, now = new Date()): { error: string } | { kept: string; superseded?: string } {
  const ra = find(a), rb = find(b);
  if (!ra || !rb || ra.number === rb.number) return { error: 'Name two different identity records' };
  if (!DETERMINATIONS.includes(outcome)) return { error: `The determination is one of ${DETERMINATIONS.join(', ')}` };
  if (!reasons.trim()) return { error: 'A determination states its reasons' };
  const at = now.toISOString();
  for (const [r, o] of [[ra, rb], [rb, ra]] as const) r.resolution.push({ other: o.number, outcome, reasons: reasons.trim().slice(0, 1000), case: caseId, at, by: by.name });
  let superseded: string | undefined;
  const [earlier, later] = ra.createdAt <= rb.createdAt ? [ra, rb] : [rb, ra];
  if (outcome === 'same-person' && later.state === 'active') {
    later.state = 'superseded'; later.supersededBy = earlier.number; superseded = later.number;
    later.history.push({ at, by: by.name, what: 'superseded', reason: `Determined to be the same person as ${earlier.number}`, case: caseId });
    for (const c of later.credentials) if (['requested', 'produced', 'active', 'suspended', 'reported-lost', 'reported-stolen', 'damaged'].includes(c.state)) {
      c.history.push({ at, by: by.name, what: `${c.state} → cancelled`, reason: `Record superseded by ${earlier.number}`, case: caseId });
      c.state = 'cancelled';
    }
  }
  recordAudit(by.name, 'identity.determine', `Identity:${ra.number},${rb.number}`, 'ok', `${outcome}${superseded ? ` · ${superseded} superseded` : ''} · case ${caseId}`);
  return { kept: earlier.number, ...(superseded ? { superseded } : {}) };
}

/** Attach the sealed determination to the entries a case recorded. */
export function attachDeterminationDecision(caseId: string, decision: string): void {
  for (const r of db().records) for (const e of r.resolution) if (e.case === caseId) e.decision ??= decision;
}

/** Credentials past their end date become expired (the daily job). */
export function expireCredentials(now = new Date()): string[] {
  const today = now.toISOString().slice(0, 10), out: string[] = [];
  for (const r of db().records) for (const c of r.credentials) if (['active', 'suspended'].includes(c.state) && c.validUntil && c.validUntil < today) {
    c.history.push({ at: now.toISOString(), by: 'System (validity)', what: `${c.state} → expired`, reason: `Validity ended on ${c.validUntil}` });
    c.state = 'expired'; out.push(c.number);
  }
  if (out.length) recordAudit('System (validity)', 'identity.credential.expire', 'Identity:credentials', 'ok', `${out.length} credential(s) expired`);
  return out;
}

export const getIdentity = (n: string): IdentityRecord | undefined => { const r = find(n); return r ? clone(r) : undefined; };
export const identityOfCase = (caseId: string): IdentityRecord | undefined => { const r = db().records.find(x => x.case === caseId); return r ? clone(r) : undefined; };
export const credentialHolder = (credential: string): IdentityRecord | undefined => { const f = findCredential(credential); return f ? clone(f.r) : undefined; };
export const getCredential = (credential: string): Credential | undefined => { const f = findCredential(credential); return f ? clone(f.c) : undefined; };

/** Officials' search: by register or credential number, or by civil registration, or by names and date of birth (the route logs it). */
export function findIdentities(q: { number?: string; civilRegistration?: string; familyName?: string; givenNames?: string; birthDate?: string }): IdentityRecord[] {
  if (q.number) { const r = find(q.number) ?? findCredential(q.number)?.r; return r ? [clone(r)] : []; }
  if (q.civilRegistration) return db().records.filter(r => r.civilLink?.registration === q.civilRegistration).map(clone);
  if (q.familyName && q.birthDate) return db().records.filter(r => fold(claim(r, 'familyName')) === fold(q.familyName) && claim(r, 'birthDate') === q.birthDate && (!q.givenNames || fold(claim(r, 'givenNames')).startsWith(fold(q.givenNames)))).slice(0, 50).map(clone);
  return [];
}

/** A record as a staff list shows it: numbers masked, no claims (field series Part 4 §3.2). */
export function listedIdentity(r: IdentityRecord): { number: string; state: RecordState; credentials: { number: string; type: string; state: CredentialState; validUntil?: string }[]; underReview: boolean; sample?: true } {
  return { number: maskNumber(r.number), state: r.state, credentials: r.credentials.map(c => ({ number: maskNumber(c.number), type: c.type, state: c.state, ...(c.validUntil ? { validUntil: c.validUntil } : {}) })), underReview: !!r.underReview, ...(r.sample ? { sample: r.sample } : {}) };
}

/** The permitted verification vocabulary (field series Part 4 §3.3; the nation narrows it under CFG-IDN-003). */
export const VERIFY_RESULTS = ['verified', 'not_verified', 'unable_to_verify', 'additional_review_required'] as const;
export type VerifyResult = (typeof VERIFY_RESULTS)[number];
export const VERIFY_MEANING: Record<VerifyResult, string> = {
  verified: 'The credential is active and the facts given match the record',
  not_verified: 'No active credential matches the facts given. This is not proof that the person does not exist, lacks citizenship or is ineligible',
  unable_to_verify: 'Not enough was given to compare, or the identity service could not answer: no conclusion may be drawn',
  additional_review_required: 'The record or credential is under review, reported lost or stolen, or suspended: the identity authority reviews it',
};

/**
 * Verify a credential (or register number) against stated facts: the result
 * and what it means, the credential's status and end of validity. Never the
 * record, the claims or another credential (identity.verify).
 */
export function verifyIdentity(q: { number?: string; givenNames?: string; familyName?: string; birthDate?: string }): { result: VerifyResult; credentialState?: CredentialState; validUntil?: string } {
  const n = (q.number ?? '').trim();
  if (!n || (!q.familyName && !q.birthDate)) return { result: 'unable_to_verify' };
  const f = findCredential(n);
  const r = f?.r ?? find(n);
  const c = f?.c ?? r?.credentials.filter(x => !['replaced', 'cancelled', 'revoked', 'expired'].includes(x.state)).at(-1);
  if (!r || !c || r.state !== 'active') return { result: 'not_verified' };
  const same = (!q.familyName || fold(q.familyName) === fold(claim(r, 'familyName'))) && (!q.givenNames || fold(q.givenNames) === fold(claim(r, 'givenNames'))) && (!q.birthDate || q.birthDate === claim(r, 'birthDate'));
  if (!same) return { result: 'not_verified' };
  if (r.underReview || ['suspended', 'reported-lost', 'reported-stolen', 'damaged'].includes(c.state)) return { result: 'additional_review_required', credentialState: c.state };
  if (c.state !== 'active') return { result: 'not_verified', credentialState: c.state };
  return { result: 'verified', credentialState: c.state, ...(c.validUntil ? { validUntil: c.validUntil } : {}) };
}

/** Counts for the register's overview (no person, no number): records by state, credentials by state, open reviews, determinations by outcome, deliveries. */
export function identityCounts(): { records: Record<string, number>; credentials: Record<string, number>; underReview: number; determinations: Record<string, number>; delivered: number; samples: number } {
  const records: Record<string, number> = {}, credentials: Record<string, number> = {}, determinations: Record<string, number> = {};
  let underReview = 0, delivered = 0, samples = 0;
  for (const r of db().records) {
    records[r.state] = (records[r.state] ?? 0) + 1;
    if (r.underReview) underReview++;
    if (r.sample) samples++;
    for (const c of r.credentials) { credentials[c.state] = (credentials[c.state] ?? 0) + 1; if (c.delivery) delivered++; }
    for (const e of r.resolution) if (r.number < e.other) determinations[e.outcome] = (determinations[e.outcome] ?? 0) + 1;
  }
  return { records, credentials, underReview, determinations, delivered, samples };
}
