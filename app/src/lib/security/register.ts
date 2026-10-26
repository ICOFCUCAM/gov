// The security governance and resilience registers (plan step I12; catalogue
// Part 11 §2.3, §2.4, §4, §5, §6 and §9: REG-SEC-005 security clearance
// register, REG-SEC-007 security exception register, REG-SEC-008 national
// cyber incident register, REG-SEC-009 vulnerability coordination register,
// REG-SEC-010 supplier security register, REG-SEC-011 critical infrastructure
// register, REG-SEC-012 infrastructure dependency register, REG-SEC-013
// resilience plan register).
//
// Metadata only. The platform never holds classified content: a record's
// marking is checked against the installation's accreditation when it is made
// (lib/security/classification.ts markingRefusal()), and anything above it
// stays in an accredited system with only its reference recorded here. There
// is no intelligence register, no source, collection method, target,
// surveillance record or attribution of an attack, and no score about a
// person anywhere in this file (those parts of Part 11 need the nation's
// legal review: integration register 25).
//
// Each record is written only by the effects of its procedure
// (lib/security/procedures.ts), so every change is a step of a case under an
// approved procedure, by the institution the nation names for the slot
// (cyberAuthority, criticalInfrastructure, securityAccreditation). Every
// change is a new version, the earlier kept; nothing is deleted. Two things
// sit beside a record and never change its terms, both by one who can sign at
// the keeping institution and written to the access log as a change of who
// may see what: naming an official who needs to know it (needToKnowGrant())
// and withdrawing that.
//
// Who may read a record is lib/auth/roles.ts securityAccessRefusal(), applied
// by lib/security/access.ts (every read logged). Lists carry the listing view
// only (number, kind, status, marking, the keeping institution): never the
// terms.

import { touch } from '@/lib/data/repo/track';
import { recordAudit } from '@/lib/data/store/audit';
import { recordAccess } from '@/lib/records/access-log';
import { accessBy } from '@/lib/records/access-by';
import { roleOf, type CaseScope } from '@/lib/auth/roles';

export type SecurityKind = 'incident' | 'vulnerability' | 'supplier' | 'exception' | 'exercise' | 'designation' | 'dependency' | 'risk' | 'plan' | 'clearance';
export const KIND_LABEL: Record<SecurityKind, string> = {
  incident: 'National cyber incident', vulnerability: 'Vulnerability coordination', supplier: 'Supplier security assessment', exception: 'Security exception',
  exercise: 'Cyber exercise', designation: 'Critical infrastructure designation', dependency: 'Essential service dependency', risk: 'Critical infrastructure risk assessment',
  plan: 'Resilience plan', clearance: 'Security clearance (metadata)',
};
/** The register each kind is a record of (catalogue Part 11 §9). */
export const KIND_REGISTER: Record<SecurityKind, string> = {
  incident: 'REG-SEC-008', vulnerability: 'REG-SEC-009', supplier: 'REG-SEC-010', exception: 'REG-SEC-007', exercise: 'REG-SEC-013',
  designation: 'REG-SEC-011', dependency: 'REG-SEC-012', risk: 'REG-SEC-011', plan: 'REG-SEC-013', clearance: 'REG-SEC-005',
};
const PREFIX: Record<SecurityKind, string> = {
  incident: 'CYI', vulnerability: 'VUL', supplier: 'SUP', exception: 'SEX', exercise: 'CEX', designation: 'CID', dependency: 'DEP', risk: 'RSK', plan: 'RPL', clearance: 'CLR',
};
/** The access-log register name of the security records. */
export const SECURITY_REGISTER = 'security';

export interface Actor { id?: string; name: string; institution?: string }
export type TermValue = string | string[] | boolean;
export interface RecordVersion { n: number; at: string; by: Actor; step: string; reason: string; status: string; terms: Record<string, TermValue> }
export interface SecurityRecord {
  number: string;
  kind: SecurityKind;
  /** The keeping institution (the one named for the slot when the case opened). */
  owner: string;
  case: { id: string; ref: string };
  /** A summary that carries no exploitable detail: what a recipient and the listing see. */
  summary: string;
  /** The marking (empty: not classified) and handling caveats, checked against the accreditation when made. */
  marking: string;
  caveats: string[];
  status: string;
  /** The kind's own terms as of the latest version (restricted). */
  terms: Record<string, TermValue>;
  versions: RecordVersion[];
  /** Institutions it is shared with as restricted recipients, each with when, by whom and why. */
  recipients: { institution: string; at: string; by: Actor; reason: string }[];
  /** Officials who need to know it: the case's assignee and those one who can sign there named, with why; withdrawn ones kept. */
  needToKnow: { id: string; name: string; at: string; by: Actor; reason: string; withdrawn?: { at: string; by: Actor; reason: string } }[];
  /** Sealed decision ids of the case's decisions about it. */
  decisions: string[];
  /** Validity: an exception's expiry, a clearance's end, a designation's review date (each the deciding officials' choice). */
  validUntil?: string;
  /** The subject by register number: a supplier or operator (organisations register), a cleared official (account id). */
  subject?: string;
  /** Vulnerability coordination: the disclosure date the officials set and, once published, the public summary. */
  disclosure?: { date: string; publicSummary?: string; published?: string };
  at: string;
  updatedAt: string;
  sample?: true;
}

interface Db { records: SecurityRecord[]; seq: Record<string, number> }
const g = globalThis as unknown as { __civicosSecurityRecords?: Db };
const db = (): Db => {
  const d = touch('__civicosSecurityRecords', g.__civicosSecurityRecords ??= { records: [], seq: {} });
  d.records ??= []; d.seq ??= {};
  return d;
};
export function resetSecurityRecords(): void { g.__civicosSecurityRecords = undefined; }

const clone = <T,>(x: T): T => structuredClone(x);
const next = (kind: SecurityKind, now: Date) => { const d = db(); const p = PREFIX[kind]; d.seq[p] = (d.seq[p] ?? 0) + 1; return `${p}-${now.getUTCFullYear()}-${String(d.seq[p]).padStart(6, '0')}`; };
const today = (now: Date) => now.toISOString().slice(0, 10);

/** A record's effective status: an exception or a clearance past its date reads as expired, never as current. */
export function effectiveStatus(r: Pick<SecurityRecord, 'status' | 'validUntil' | 'kind'>, now = new Date()): string {
  if ((r.kind === 'exception' || r.kind === 'clearance') && r.validUntil && ['approved', 'renewed', 'granted', 'varied'].includes(r.status) && r.validUntil < today(now)) return 'expired';
  return r.status;
}

// ── Changes (only from lib/security/procedures.ts, and the need-to-know grants below) ──

export function openSecurityRecord(input: { kind: SecurityKind; owner: string; case: { id: string; ref: string }; summary: string; marking: string; caveats: string[]; status: string; terms: Record<string, TermValue>; subject?: string; assignee?: { id: string; name: string }; by: Actor; reason: string; sample?: boolean }, now = new Date()): SecurityRecord {
  const at = now.toISOString();
  const r: SecurityRecord = {
    number: next(input.kind, now), kind: input.kind, owner: input.owner, case: { ...input.case }, summary: input.summary.slice(0, 300), marking: input.marking, caveats: [...input.caveats],
    status: input.status, terms: clone(input.terms), versions: [{ n: 1, at, by: { ...input.by }, step: 'open', reason: input.reason, status: input.status, terms: clone(input.terms) }],
    recipients: [], needToKnow: [], decisions: [], ...(input.subject ? { subject: input.subject } : {}), at, updatedAt: at, ...(input.sample ? { sample: true as const } : {}),
  };
  // Whoever registers it, and the case's assignee, need to know it.
  for (const p of [input.by.id ? { id: input.by.id, name: input.by.name } : null, input.assignee ?? null]) if (p && !r.needToKnow.some(x => x.id === p.id)) r.needToKnow.push({ id: p.id, name: p.name, at, by: { ...input.by }, reason: 'Registered or assigned the case' });
  db().records.push(r);
  recordAudit(input.by.name, `security.${input.kind}.open`, `Security:${r.number}`, 'ok', `${input.case.ref} · ${KIND_REGISTER[input.kind]} · ${input.marking ? 'marked' : 'not classified'} · ${input.status}`);
  return clone(r);
}

/** A step of the case: a new version with the status and the terms as they now stand. Never the summary's exploitable detail. */
export function updateSecurityRecord(number: string, change: { step: string; status: string; terms?: Record<string, TermValue>; reason: string; validUntil?: string | null; decision?: string; disclosure?: SecurityRecord['disclosure'] }, by: Actor, now = new Date()): SecurityRecord | { error: string } {
  const r = db().records.find(x => x.number === number);
  if (!r) return { error: 'No such security record' };
  const at = now.toISOString();
  r.status = change.status;
  if (change.terms) r.terms = { ...r.terms, ...clone(change.terms) };
  if (change.validUntil !== undefined) { if (change.validUntil) r.validUntil = change.validUntil; else delete r.validUntil; }
  if (change.decision && !r.decisions.includes(change.decision)) r.decisions.push(change.decision);
  if (change.disclosure) r.disclosure = { ...(r.disclosure ?? {}), ...change.disclosure };
  r.versions.push({ n: r.versions.length + 1, at, by: { ...by }, step: change.step, reason: change.reason, status: change.status, terms: clone(r.terms) });
  r.updatedAt = at;
  recordAudit(by.name, `security.${r.kind}.${change.step}`, `Security:${r.number}`, 'ok', `${r.case.ref} · ${change.status}${change.decision ? ` · decision ${change.decision}` : ''}`);
  return clone(r);
}

/** Share with restricted recipients (registered institutions named in the case's step), each recorded with why. */
export function shareSecurityRecord(number: string, institutions: string[], reason: string, by: Actor, now = new Date()): SecurityRecord | { error: string } {
  const r = db().records.find(x => x.number === number);
  if (!r) return { error: 'No such security record' };
  const at = now.toISOString();
  for (const i of institutions) if (i !== r.owner && !r.recipients.some(x => x.institution === i)) r.recipients.push({ institution: i, at, by: { ...by }, reason });
  r.updatedAt = at;
  recordAudit(by.name, `security.${r.kind}.share`, `Security:${r.number}`, 'ok', `${r.case.ref} · recipients ${r.recipients.map(x => x.institution).join(', ')}`);
  return clone(r);
}

/**
 * One who can sign at the keeping institution names an official who needs to
 * know this record (or withdraws that), with the reason: a change of who may
 * see what, written to the access log. A clearance is not needed to be named
 * and naming gives no clearance: both are checked at each read.
 */
export function needToKnowGrant(number: string, input: { op: 'grant' | 'withdraw'; official?: { id?: unknown; name?: unknown }; reason?: unknown }, s: (CaseScope & { label?: string }) | null, now = new Date()): SecurityRecord | { error: string } {
  const r = db().records.find(x => x.number === number);
  if (!r) return { error: 'No such security record' };
  const reason = typeof input.reason === 'string' ? input.reason.trim().slice(0, 500) : '';
  const id = typeof input.official?.id === 'string' ? input.official.id.trim().slice(0, 120) : '';
  const name = typeof input.official?.name === 'string' ? input.official.name.trim().slice(0, 200) : '';
  const why = !s ? 'Sign in' : s.institution !== r.owner || roleOf(s) !== 'signatory' ? 'Need to know is named only by an official who can sign at the institution that keeps the record' : !id ? 'Name the official (their account id)' : !reason ? 'Give the reason the official needs to know this record' : null;
  if (s) recordAccess({ ...accessBy({ ...(s.id ? { id: s.id } : {}), label: s.label ?? s.id ?? 'Official', ...(s.institution ? { institution: s.institution } : {}) }, now), record: { register: SECURITY_REGISTER, id: r.number }, action: why ? 'refused' : 'permission', purpose: reason || undefined, result: why ? 'refused' : 'allowed', rule: why ?? `Need to know ${input.op === 'grant' ? 'given to' : 'withdrawn from'} ${id}` }, now);
  if (why) return { error: why };
  const by: Actor = { ...(s!.id ? { id: s!.id } : {}), name: s!.label ?? 'Official', ...(s!.institution ? { institution: s!.institution } : {}) };
  const at = now.toISOString();
  const cur = r.needToKnow.find(x => x.id === id && !x.withdrawn);
  if (input.op === 'grant') { if (!cur) r.needToKnow.push({ id, name: name || id, at, by, reason }); }
  else if (cur) cur.withdrawn = { at, by, reason };
  else return { error: 'That official is not named for this record' };
  r.updatedAt = at;
  recordAudit(by.name, `security.need-to-know.${input.op}`, `Security:${r.number}`, 'ok', `${id}: ${reason.slice(0, 160)}`);
  return clone(r);
}

// ── Reads (the full record only through lib/security/access.ts) ──────────────

/** The listing view: what a list may carry (never the terms, recipients or who needs to know). */
export interface SecurityListing { number: string; kind: SecurityKind; register: string; owner: string; case: string; status: string; marked: boolean; summary?: string; validUntil?: string; updatedAt: string; sample?: true }
export function listingOf(r: SecurityRecord, showSummary: boolean, now = new Date()): SecurityListing {
  return {
    number: r.number, kind: r.kind, register: KIND_REGISTER[r.kind], owner: r.owner, case: r.case.ref, status: effectiveStatus(r, now), marked: !!r.marking,
    // A marked record's summary is shown only to those who may read it; the listing of others names its number and kind.
    ...(showSummary ? { summary: r.summary } : {}), ...(r.validUntil ? { validUntil: r.validUntil } : {}), updatedAt: r.updatedAt, ...(r.sample ? { sample: true as const } : {}),
  };
}
/** The raw record, for lib/security/access.ts and the procedures (callers check access first). */
export const securityRecordRaw = (number: string): SecurityRecord | undefined => { const r = db().records.find(x => x.number === number); return r ? clone(r) : undefined; };
export const securityRecordOfCase = (caseId: string): SecurityRecord | undefined => { const r = db().records.find(x => x.case.id === caseId); return r ? clone(r) : undefined; };
export const securityRecordsRaw = (filter: { kind?: SecurityKind; owner?: string } = {}): SecurityRecord[] =>
  db().records.filter(r => (!filter.kind || r.kind === filter.kind) && (!filter.owner || r.owner === filter.owner)).map(clone);

/** The clearance in force for an official account (granted, renewed or varied, not past its date), as the access rule needs it. */
export function clearanceOf(officialId: string | undefined, now = new Date()): { number: string; level: string; validUntil: string } | null {
  if (!officialId) return null;
  const r = db().records.filter(x => x.kind === 'clearance' && x.subject === officialId && ['granted', 'renewed', 'varied'].includes(effectiveStatus(x, now)))
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0];
  const level = r && typeof r.terms.levelGranted === 'string' ? r.terms.levelGranted : '';
  return r && level && r.validUntil ? { number: r.number, level, validUntil: r.validUntil } : null;
}

/** Counts (no content). */
export function securityCounts(owner?: string, now = new Date()): Record<SecurityKind, number> & { marked: number; samples: number; expired: number } {
  const rs = db().records.filter(r => !owner || r.owner === owner);
  const out = Object.fromEntries((Object.keys(KIND_LABEL) as SecurityKind[]).map(k => [k, rs.filter(r => r.kind === k).length])) as Record<SecurityKind, number>;
  return { ...out, marked: rs.filter(r => r.marking).length, samples: rs.filter(r => r.sample).length, expired: rs.filter(r => effectiveStatus(r, now) === 'expired').length };
}
