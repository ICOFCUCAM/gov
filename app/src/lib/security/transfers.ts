// Cross-domain transfer records (plan step I12; catalogue Part 11 §10.3,
// CFG-SEC-014 "Cross-domain transfer and information release rules").
//
// Metadata only: which class of information moved, from which security
// domain to which, under which approved transfer policy and its version, for
// what purpose, which fields and data classes were permitted, what was
// redacted or sanitised, the validation result, who authorised the release,
// the receipt, and a rejection or quarantine. The information itself never
// passes through or rests in CivicOS: "Do not treat ordinary API
// authentication as sufficient authorization for a classification-boundary
// crossing" (§10.3). The transfer is made by the approved cross-domain
// solution; this register records that it was made and who released it.
//
//   - Recorded by an official of the source institution; the release (or the
//     rejection or quarantine) is decided by a different person who can sign
//     there (dualControlRefusal(): two people, not two accounts).
//   - The class moved is a level of the nation's scheme (or the platform
//     default); the record's own marking is checked against the
//     installation's accreditation (markingRefusal()).
//   - Read by the source institution's officials only; every record is kept,
//     none deleted.

import { touch } from '@/lib/data/repo/track';
import { recordAudit } from '@/lib/data/store/audit';
import { dualControlRefusal, independenceOf } from '@/lib/data/dual-control';
import { roleOf, type CaseScope } from '@/lib/auth/roles';
import { markingRefusal, rankOf, markingLabel, securityClassification } from './classification';

type Who = { id?: string; name: string; institution?: string };
export type TransferOutcome = 'released' | 'rejected' | 'quarantined';
export interface CrossDomainTransfer {
  ref: string;
  institution: string;
  fromDomain: string; toDomain: string;
  /** The class of information moved: a level of the nation's scheme, or empty (not classified). */
  dataClass: string;
  purpose: string;
  /** The approved transfer policy and its version. */
  policy: string;
  /** Permitted fields and data classes. */
  permitted: string[];
  redaction: string;
  validation: { result: 'passed' | 'failed'; note: string };
  /** The marking of this metadata record itself (checked against the accreditation). */
  marking: string;
  recordedBy: Who; at: string;
  decision?: { outcome: TransferOutcome; by: Who; at: string; reason: string; independence: string };
  receipt?: { at: string; reference: string; by: Who };
  sample?: true;
}

interface Db { rows: CrossDomainTransfer[]; seq: number }
const g = globalThis as unknown as { __civicosCrossDomainTransfers?: Db };
const db = (): Db => { const d = touch('__civicosCrossDomainTransfers', g.__civicosCrossDomainTransfers ??= { rows: [], seq: 0 }); d.rows ??= []; d.seq ??= 0; return d; };
export function resetTransfers(): void { g.__civicosCrossDomainTransfers = undefined; }

const clone = <T,>(x: T): T => structuredClone(x);
const str = (v: unknown, max = 1000) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
type Viewer = (CaseScope & { label?: string }) | null;
const who = (s: CaseScope & { label?: string }): Who => ({ ...(s.id ? { id: s.id } : {}), name: s.label ?? s.id ?? 'Official', ...(s.institution ? { institution: s.institution } : {}) });
export const TRANSFER_OUTCOMES: TransferOutcome[] = ['released', 'rejected', 'quarantined'];

function ownRefusal(s: Viewer, sign: boolean): string | null {
  if (!s?.institution) return 'Sign in as an official of the source institution';
  const role = roleOf(s);
  if (role === 'auditor' || role === 'administrator') return 'Auditors and administrators do not record or release transfers';
  if (sign && role !== 'signatory') return 'A release is decided by an official who can sign at the source institution';
  return null;
}

/** Record a transfer waiting for its release decision. */
export function recordTransfer(input: Record<string, unknown>, s: Viewer, now = new Date()): CrossDomainTransfer | { error: string } {
  const why = ownRefusal(s, false);
  if (why) return { error: why };
  const fromDomain = str(input.fromDomain, 200), toDomain = str(input.toDomain, 200);
  if (!fromDomain || !toDomain) return { error: 'Name the source and the destination security domains' };
  if (fromDomain === toDomain) return { error: 'A cross-domain transfer moves between two different domains' };
  const dataClass = str(input.dataClass, 40).toLowerCase();
  if (dataClass && !securityClassification().scheme) return { error: 'No classification scheme is adopted: the class moved is recorded only once the nation adopts one' };
  if (dataClass && rankOf(dataClass) < 0) return { error: `${dataClass} is not a level of the nation's adopted scheme` };
  const purpose = str(input.purpose), policy = str(input.policy, 300);
  if (!purpose) return { error: 'State the approved purpose of the transfer' };
  if (!policy) return { error: 'Name the approved transfer policy and its version' };
  const permitted = (Array.isArray(input.permitted) ? input.permitted : str(input.permitted).split(/[\n;,]/)).map(x => str(x, 120)).filter(Boolean).slice(0, 100);
  if (!permitted.length) return { error: 'List the permitted fields and data classes' };
  const v = (input.validation ?? {}) as { result?: unknown; note?: unknown };
  const result = str(v.result, 10);
  if (result !== 'passed' && result !== 'failed') return { error: 'Record the validation result of the transfer gateway (passed or failed)' };
  const marking = str(input.marking, 40).toLowerCase();
  const marked = markingRefusal(marking);
  if (marked) return { error: marked };
  const d = db();
  d.seq += 1;
  const row: CrossDomainTransfer = {
    ref: `CDT-${now.getUTCFullYear()}-${String(d.seq).padStart(6, '0')}`, institution: s!.institution!, fromDomain, toDomain, dataClass, purpose, policy, permitted,
    redaction: str(input.redaction, 2000), validation: { result, note: str(v.note, 1000) }, marking, recordedBy: who(s!), at: now.toISOString(),
  };
  d.rows.push(row);
  recordAudit(row.recordedBy.name, 'security.transfer.record', `Transfer:${row.ref}`, 'ok', `${fromDomain} → ${toDomain} · class ${markingLabel(dataClass)} · validation ${result} · awaiting the release decision`);
  return clone(row);
}

/** The release authority's decision: a different person who can sign at the source institution. A failed validation is never released. */
export function decideTransfer(ref: string, input: { outcome?: unknown; reason?: unknown }, s: Viewer, now = new Date()): CrossDomainTransfer | { error: string } {
  const why = ownRefusal(s, true);
  if (why) return { error: why };
  const row = db().rows.find(x => x.ref === ref && x.institution === s!.institution);
  if (!row) return { error: 'No such transfer of your institution' };
  if (row.decision) return { error: 'It has been decided; a further transfer is a new record' };
  const outcome = str(input.outcome, 20) as TransferOutcome;
  if (!TRANSFER_OUTCOMES.includes(outcome)) return { error: `The outcome is one of ${TRANSFER_OUTCOMES.join(', ')}` };
  if (outcome === 'released' && row.validation.result !== 'passed') return { error: 'A transfer whose validation failed is never released: reject or quarantine it' };
  const reason = str(input.reason);
  if (!reason) return { error: 'Give the reasons' };
  const same = dualControlRefusal({ by: row.recordedBy.name, ...(row.recordedBy.id ? { byId: row.recordedBy.id } : {}) }, { by: who(s!).name, ...(s!.id ? { byId: s!.id } : {}) });
  if (same) return { error: same };
  row.decision = { outcome, by: who(s!), at: now.toISOString(), reason, independence: independenceOf(row.recordedBy.id, s!.id) };
  recordAudit(who(s!).name, `security.transfer.${outcome}`, `Transfer:${ref}`, 'ok', `recorded by ${row.recordedBy.name}, decided by ${who(s!).name}`);
  return clone(row);
}

/** The receipt of a released transfer (the destination's reference). */
export function recordReceipt(ref: string, input: { reference?: unknown }, s: Viewer, now = new Date()): CrossDomainTransfer | { error: string } {
  const why = ownRefusal(s, false);
  if (why) return { error: why };
  const row = db().rows.find(x => x.ref === ref && x.institution === s!.institution);
  if (!row) return { error: 'No such transfer of your institution' };
  if (row.decision?.outcome !== 'released') return { error: 'Only a released transfer has a receipt' };
  if (row.receipt) return { error: 'The receipt is recorded' };
  const reference = str(input.reference, 200);
  if (!reference) return { error: 'Give the destination\'s receipt reference' };
  row.receipt = { at: now.toISOString(), reference, by: who(s!) };
  recordAudit(who(s!).name, 'security.transfer.receipt', `Transfer:${ref}`, 'ok', reference);
  return clone(row);
}

/** The source institution's transfers (its officials only). */
export function listTransfers(s: Viewer): CrossDomainTransfer[] {
  if (!s?.institution || roleOf(s) === 'administrator') return [];
  return db().rows.filter(r => r.institution === s.institution).map(clone);
}
export const transferCounts = (): { total: number; released: number; awaiting: number } => ({ total: db().rows.length, released: db().rows.filter(r => r.decision?.outcome === 'released').length, awaiting: db().rows.filter(r => !r.decision).length });
