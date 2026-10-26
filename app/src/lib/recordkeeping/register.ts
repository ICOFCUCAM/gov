// The records management register (plan step I13; forms catalogue Part 13 §7,
// GOV-REC-001, 007, 008, 010, 011, 012, 017, 018; the supplement's ADM-REC-025
// and ADM-REC-026). Each institution keeps its own:
//
//   record classes   a class's key is the retention class its records carry
//                    (a procedure's `retention`, so a case's documents belong
//                    to it), with every version of its retention schedule:
//                    the trigger event, the period and the disposition
//                    (destroy, transfer to the archive, keep permanently),
//                    the provision of law cited, the case that approved it.
//                    No class, period or schedule ships: the nation's law
//                    sets each, and nothing is disposed of without one.
//   legal holds      who placed it, why, under which provision, its scope (a
//                    class, a document or a case), when it was released and by
//                    whom. A hold blocks disposal and transfer, and the
//                    platform's retention sweep (lib/data/retention.ts).
//   incoming items   registered correspondence and documents (number, class,
//                    sender kind, channel, date), the registry's own record.
//   disposals        the exact list of documents a disposal covers (ids and
//                    SHA-256 hashes, frozen when listed), its authorisation by
//                    two officials, what was destroyed and what was skipped
//                    (held, no longer due), and a certificate digest. The
//                    document records and their hashes stay
//                    (lib/records/documents.ts disposeDocument()); nothing else
//                    is deleted, from any store.
//   transfers        records sent to the archive the nation names (slot
//                    `archives`), their manifest digest, and the archive's
//                    receipt (recorded by one of its own officials).
//   migrations       a migration's plan with the source count and manifest
//                    hash, the target's count and hash computed from the
//                    platform's own records where they are here, the
//                    reconciliation (matched or the discrepancies with their
//                    corrective actions) and its closure. Since plan I9 a plan
//                    may carry a per-record manifest (acceptance P5-06): each
//                    record's source id and hash, its transformations (step,
//                    rule, version) and where it landed; every reconciliation
//                    verifies each record against the platform's own records
//                    and keeps its status (provenanceOf()).
//
// Everything changes only in the effects of the records procedures
// (lib/recordkeeping/procedures.ts, decided cases), save the archive's
// receipt of a transfer (its own act, /api/records-management). Nothing is
// ever removed from this register. Held in platform state.

import { createHash } from 'node:crypto';
import { touch } from '@/lib/data/repo/track';
import { withDefaults } from '@/lib/data/defaults';
import { recordAudit } from '@/lib/data/store/audit';
import { uuid7 } from '@/lib/data/uuid7';
import type { Citation } from '@/lib/law/register';

export type Trigger = 'created' | 'closed';
export type Disposition = 'destroy' | 'archive' | 'permanent';
export const TRIGGER_LABEL: Record<Trigger, string> = { created: 'from when the record was created', closed: 'from when its case closed' };
export const DISPOSITION_LABEL: Record<Disposition, string> = { destroy: 'Destroy after the period', archive: 'Transfer to the archive after the period', permanent: 'Keep permanently' };

export interface Schedule {
  n: number;
  trigger: Trigger;
  /** Days the law sets; absent for a permanent class. Entered with the citation in the approving case, never shipped. */
  periodDays?: number;
  disposition: Disposition;
  citations: Citation[];
  case: string;
  approvedBy: { name: string; id?: string }[];
  at: string;
  sample?: true;
}
export interface RecordClass {
  institution: string;
  /** The retention class records carry (a procedure's `retention`). */
  key: string;
  title: string;
  description: string;
  /** How the records of this class are classified for access. */
  access: 'normal' | 'restricted' | 'secret';
  schedules: Schedule[];
}
export interface Hold {
  id: string;
  institution: string;
  scope: { kind: 'class' | 'document' | 'case'; ref: string };
  reason: string;
  citations: Citation[];
  case: string;
  placedBy: { name: string; id?: string }[];
  placedAt: string;
  /** The sealed decision that placed it. */
  decision?: string;
  released?: { by: { name: string; id?: string }[]; at: string; case: string; reason: string };
  sample?: true;
}
export interface IncomingItem {
  number: string;
  institution: string;
  class: string;
  subject: string;
  senderKind: string;
  channel: string;
  receivedOn: string;
  case: string;
  registeredBy: string;
  at: string;
  disposed?: { at: string; disposal: string };
  transferred?: { at: string; transfer: string };
  sample?: true;
}
export interface ListedItem { kind: 'document' | 'incoming'; id: string; sha256: string }
export interface Disposal {
  id: string;
  institution: string;
  class: string;
  schedule: number;
  case: string;
  listedAt: string;
  listedBy: string;
  items: ListedItem[];
  /** SHA-256 over the listed items (kind, id, hash), so the authorisation names exactly what it covers. */
  listDigest: string;
  authorised?: { by: { name: string; id?: string }[]; at: string };
  executed?: { at: string; destroyed: ListedItem[]; skipped: (ListedItem & { why: string })[]; certificate: string };
  sample?: true;
}
export interface Transfer {
  id: string;
  institution: string;
  archive: string;
  class: string;
  case: string;
  items: ListedItem[];
  manifest: string;
  authorised: { by: { name: string; id?: string }[]; at: string };
  received?: { by: { name: string; id?: string }; at: string; receipt: string };
  sample?: true;
}
/** One step a migrated record went through between the source and here (plan I9, acceptance P5-06). */
export interface Transformation { step: string; rule?: string; version?: string }
/** What a reconciliation found for one record: computed from the platform's own records, never entered. */
export type VerificationStatus = 'verified' | 'hash-mismatch' | 'missing' | 'not-verifiable-here';
export const VERIFICATION_LABEL: Record<VerificationStatus, string> = {
  verified: 'Verified: the record is here with the hash the manifest names',
  'hash-mismatch': 'Hash differs: the record is here but its content is not what the manifest names',
  missing: 'Missing: no such record of the institution under the target',
  'not-verifiable-here': 'Not verifiable here: the record landed in an external system',
};
/**
 * A record of a migration's per-record manifest (plan I9; acceptance P5-06 "A
 * migrated record retains its source, transformation history and
 * verification status"): where it came from (the source system's id and the
 * SHA-256 of the record as extracted), every transformation it went through
 * (named step, the mapping rule and its version), where it landed here, and
 * the status every reconciliation found for it, oldest first. Kept with the
 * migration; never changed after the plan, only verified again.
 */
export interface MigratedRecord {
  source: { id: string; sha256: string };
  transformations: Transformation[];
  target: { kind: 'document' | 'case' | 'external'; id: string; sha256?: string };
  verification: { status: VerificationStatus; at: string; reconciliation: number; detail?: string }[];
}
export interface ManifestCounts { verified: number; mismatched: number; missing: number; notVerifiable: number; unexpected: number }
export interface Migration {
  id: string;
  institution: string;
  case: string;
  source: { system: string; count: number; manifest: string };
  target: { system: string; kind: 'documents' | 'cases' | 'external'; ref?: string };
  /** The per-record manifest, when the plan carries one: its source digest is the plan's source manifest, its length the source count. */
  manifest?: { count: number; sourceDigest: string; targetDigest: string; digest: string };
  records?: MigratedRecord[];
  approved?: { by: { name: string; id?: string }[]; at: string };
  reconciliation?: { count: number; manifest: string; computed: boolean; matched: boolean; discrepancies: string; corrective: string; by: string; at: string; records?: ManifestCounts }[];
  closed?: { by: { name: string; id?: string }[]; at: string; outcome: 'reconciled' | 'accepted-with-corrections' };
  sample?: true;
}

type Db = { classes: RecordClass[]; holds: Hold[]; incoming: IncomingItem[]; disposals: Disposal[]; transfers: Transfer[]; migrations: Migration[]; seq: number };
const seed = (): Db => ({ classes: [], holds: [], incoming: [], disposals: [], transfers: [], migrations: [], seq: 0 });
const g = globalThis as unknown as { __civicosRecordkeeping?: Db };
const db = (): Db => touch('__civicosRecordkeeping', g.__civicosRecordkeeping = withDefaults(g.__civicosRecordkeeping ??= seed(), seed()));
export function resetRecordkeeping(): void { g.__civicosRecordkeeping = undefined; }
const clone = <T,>(x: T): T => structuredClone(x);
const sha = (s: string) => createHash('sha256').update(s, 'utf8').digest('hex');

/** The digest of a list of items: the same items in any order give the same digest. */
export const listDigest = (items: ListedItem[]): string => sha([...items].map(i => `${i.kind}:${i.id}:${i.sha256}`).sort().join('\n'));

// ── changes (only from lib/recordkeeping/procedures.ts, or the archive's own receipt) ──

export function approveSchedule(input: { institution: string; key: string; title: string; description: string; access: RecordClass['access']; trigger: Trigger; periodDays?: number; disposition: Disposition; citations: Citation[]; case: string; approvedBy: { name: string; id?: string }[]; at: string; sample?: true }, by: string): RecordClass | { error: string } {
  if (!/^[a-z0-9][a-z0-9-]{1,60}$/.test(input.key)) return { error: 'A record class key is the retention class its records carry: lowercase letters, digits and -' };
  if (!input.citations.length) return { error: 'Cite the provision of law that sets the schedule' };
  if (input.disposition !== 'permanent' && !(Number.isInteger(input.periodDays) && input.periodDays! > 0)) return { error: 'A schedule that ends in destruction or transfer states its period in days, as the law sets it' };
  const d = db();
  let c = d.classes.find(x => x.institution === input.institution && x.key === input.key);
  if (!c) { c = { institution: input.institution, key: input.key, title: input.title, description: input.description, access: input.access, schedules: [] }; d.classes.push(c); }
  else Object.assign(c, { title: input.title || c.title, description: input.description || c.description, access: input.access });
  const s: Schedule = { n: (c.schedules.at(-1)?.n ?? 0) + 1, trigger: input.trigger, ...(input.disposition !== 'permanent' ? { periodDays: input.periodDays } : {}), disposition: input.disposition, citations: input.citations, case: input.case, approvedBy: input.approvedBy, at: input.at, ...(input.sample ? { sample: true as const } : {}) };
  c.schedules.push(s);
  recordAudit(by, 'records.schedule.approve', `RecordClass:${input.institution}/${input.key}`, 'ok', `version ${s.n} · ${s.disposition}${s.periodDays ? ` after ${s.periodDays} days ${TRIGGER_LABEL[s.trigger]}` : ''} · case ${input.case}`);
  return clone(c);
}

export function placeHold(input: Omit<Hold, 'id' | 'released'>, by: string): Hold | { error: string } {
  if (!input.reason.trim()) return { error: 'Say why the records are held' };
  if (!input.scope.ref.trim()) return { error: 'Name what the hold covers' };
  const h: Hold = { ...clone(input), id: `HOLD-${uuid7().slice(-12)}` };
  db().holds.push(h);
  recordAudit(by, 'records.hold.place', `Hold:${h.id}`, 'ok', `${h.scope.kind} ${h.scope.ref} · case ${h.case}`);
  return clone(h);
}

/** The decision that placed a hold, and the provisions it cites (sealed with it). */
export function attachHoldDecision(id: string, decision: string, citations: Citation[]): void {
  const h = db().holds.find(x => x.id === id);
  if (h) { h.decision = decision; if (!h.citations.length) h.citations = clone(citations); }
}

export function releaseHold(caseRef: string, release: { by: { name: string; id?: string }[]; at: string; case: string; reason: string }, by: string): Hold | { error: string } {
  const h = db().holds.find(x => x.case === caseRef && !x.released);
  if (!h) return { error: 'This case placed no hold that is still in force' };
  h.released = clone(release);
  recordAudit(by, 'records.hold.release', `Hold:${h.id}`, 'ok', release.reason.slice(0, 200));
  return clone(h);
}

export function registerIncoming(input: Omit<IncomingItem, 'number'>, by: string): IncomingItem {
  const d = db();
  d.seq += 1;
  const item: IncomingItem = { ...clone(input), number: `INC-${input.at.slice(0, 4)}-${String(d.seq).padStart(6, '0')}` };
  d.incoming.push(item);
  recordAudit(by, 'records.incoming.register', `Incoming:${item.number}`, 'ok', `${item.class} · ${item.channel} · case ${item.case}`);
  return clone(item);
}

export function listForDisposal(input: Omit<Disposal, 'id' | 'listDigest' | 'authorised' | 'executed'>, by: string): Disposal | { error: string } {
  if (!input.items.length) return { error: 'No record of this class is due for disposal under its schedule' };
  const x: Disposal = { ...clone(input), id: `DSP-${uuid7().slice(-12)}`, listDigest: listDigest(input.items) };
  db().disposals.push(x);
  recordAudit(by, 'records.disposal.list', `Disposal:${x.id}`, 'ok', `${x.items.length} item(s) of ${x.class} · ${x.listDigest.slice(0, 12)} · case ${x.case}`);
  return clone(x);
}

export function recordDisposal(id: string, done: { authorisedBy: { name: string; id?: string }[]; at: string; destroyed: ListedItem[]; skipped: (ListedItem & { why: string })[] }, by: string): Disposal | { error: string } {
  const x = db().disposals.find(y => y.id === id);
  if (!x) return { error: 'No such disposal' };
  if (x.executed) return { error: 'This disposal was already carried out' };
  x.authorised = { by: clone(done.authorisedBy), at: done.at };
  const certificate = sha(`civicos.disposal.v1\n${x.id}\n${x.listDigest}\n${listDigest(done.destroyed)}\n${done.at}`);
  x.executed = { at: done.at, destroyed: clone(done.destroyed), skipped: clone(done.skipped), certificate };
  for (const i of done.destroyed.filter(y => y.kind === 'incoming')) { const it = db().incoming.find(y => y.number === i.id); if (it) it.disposed = { at: done.at, disposal: x.id }; }
  recordAudit(by, 'records.disposal.execute', `Disposal:${x.id}`, 'ok', `${done.destroyed.length} destroyed, ${done.skipped.length} skipped · certificate ${certificate.slice(0, 16)}`);
  return clone(x);
}

export function transferToArchive(input: Omit<Transfer, 'id' | 'manifest' | 'received'>, by: string): Transfer | { error: string } {
  if (!input.items.length) return { error: 'No record of this class is due for transfer under its schedule' };
  const t: Transfer = { ...clone(input), id: `TRF-${uuid7().slice(-12)}`, manifest: listDigest(input.items) };
  db().transfers.push(t);
  for (const i of t.items.filter(y => y.kind === 'incoming')) { const it = db().incoming.find(y => y.number === i.id); if (it) it.transferred = { at: t.authorised.at, transfer: t.id }; }
  recordAudit(by, 'records.transfer', `Transfer:${t.id}`, 'ok', `${t.items.length} item(s) of ${t.class} to ${t.archive} · manifest ${t.manifest.slice(0, 12)}`);
  return clone(t);
}

/** The archive's receipt: recorded by one of the archive's own officials (the route checks), naming the manifest it received. */
export function acknowledgeTransfer(id: string, input: { manifest: string; receipt: string; by: { name: string; id?: string }; at: string }): Transfer | { error: string } {
  const t = db().transfers.find(x => x.id === id);
  if (!t) return { error: 'No such transfer' };
  if (t.received) return { error: 'The archive already acknowledged this transfer' };
  if (input.manifest !== t.manifest) return { error: 'The manifest the archive received does not match the one sent: record a discrepancy instead of a receipt' };
  if (!input.receipt.trim()) return { error: 'Give the archive\'s receipt reference' };
  t.received = { by: clone(input.by), at: input.at, receipt: input.receipt.trim().slice(0, 120) };
  recordAudit(input.by.name, 'records.transfer.receive', `Transfer:${t.id}`, 'ok', `receipt ${t.received.receipt}`);
  return clone(t);
}

export function planMigration(input: Omit<Migration, 'id' | 'reconciliation' | 'closed' | 'manifest' | 'records'> & { records?: Omit<MigratedRecord, 'verification'>[] }, by: string): Migration | { error: string } {
  if (!Number.isInteger(input.source.count) || input.source.count < 0) return { error: 'The source count is a whole number' };
  if (!/^[0-9a-f]{64}$/.test(input.source.manifest)) return { error: 'The source manifest is a SHA-256 (64 hexadecimal characters)' };
  const { records, ...rest } = input;
  let manifest: Migration['manifest'];
  if (records) {
    // A per-record manifest is the plan's own evidence: its length is the source count, its source digest the source manifest.
    if (records.length !== input.source.count) return { error: `The per-record manifest lists ${records.length} record(s); the source count says ${input.source.count}` };
    const sourceDigest = sourceDigestOf(records);
    if (sourceDigest !== input.source.manifest) return { error: 'The source manifest is not the digest of the per-record manifest\'s sources (kind source, id and SHA-256 of each record, sorted)' };
    manifest = { count: records.length, sourceDigest, targetDigest: targetDigestOf(records), digest: manifestDigestOf(records) };
  }
  const m: Migration = { ...clone(rest), id: `MIG-${uuid7().slice(-12)}`, ...(manifest ? { manifest, records: records!.map(r => ({ ...clone(r), verification: [] })) } : {}) };
  db().migrations.push(m);
  recordAudit(by, 'records.migration.approve', `Migration:${m.id}`, 'ok', `${m.source.system} → ${m.target.system} · ${m.source.count} records · ${m.source.manifest.slice(0, 12)}${manifest ? ` · per-record manifest ${manifest.digest.slice(0, 12)}` : ''}`);
  return clone(m);
}

/**
 * Record a reconciliation. With a per-record manifest, `perRecord` is the
 * status the platform computed for each record (in the manifest's order) and
 * `unexpected` the records under the target the manifest does not list: the
 * migration matches only when every record is verified (or, for an external
 * target, the entered count and manifest are the manifest's target side) and
 * nothing unexpected is there.
 */
export function reconcileMigration(caseRef: string, r: { count: number; manifest: string; computed: boolean; discrepancies: string; corrective: string; by: string; at: string; perRecord?: { status: VerificationStatus; detail?: string }[]; unexpected?: number }): Migration | { error: string } {
  const m = db().migrations.find(x => x.case === caseRef);
  if (!m?.approved) return { error: 'This case has no approved migration' };
  if (m.closed) return { error: 'The migration is closed' };
  const { perRecord, unexpected, ...entry } = r;
  let matched: boolean, counts: ManifestCounts | undefined, problem: string;
  if (m.records && m.manifest) {
    if (!perRecord || perRecord.length !== m.records.length) return { error: 'Every record of the manifest is verified at each reconciliation' };
    const n = (s: VerificationStatus) => perRecord.filter(x => x.status === s).length;
    counts = { verified: n('verified'), mismatched: n('hash-mismatch'), missing: n('missing'), notVerifiable: n('not-verifiable-here'), unexpected: unexpected ?? 0 };
    matched = m.target.kind === 'external'
      ? r.count === m.manifest.count && r.manifest === m.manifest.targetDigest
      : counts.verified === m.records.length && counts.unexpected === 0;
    problem = m.target.kind === 'external'
      ? `${r.count} of ${m.manifest.count} records${r.manifest === m.manifest.targetDigest ? '' : ', the target manifest differs from the manifest\'s target side'}`
      : `${counts.verified} of ${m.records.length} records verified, ${counts.mismatched} with a different hash, ${counts.missing} missing, ${counts.unexpected} not in the manifest`;
  } else {
    matched = r.count === m.source.count && r.manifest === m.source.manifest;
    problem = `${r.count} of ${m.source.count} records${r.manifest === m.source.manifest ? '' : ', manifest differs'}`;
  }
  if (!matched && (!r.discrepancies.trim() || !r.corrective.trim())) return { error: `The target does not match the source (${problem}): record the discrepancies and the corrective actions` };
  const list = (m.reconciliation ??= []);
  list.push({ ...entry, matched, ...(counts ? { records: counts } : {}) });
  if (m.records && perRecord) m.records.forEach((rec, i) => rec.verification.push({ status: perRecord[i]!.status, at: r.at, reconciliation: list.length, ...(perRecord[i]!.detail ? { detail: perRecord[i]!.detail!.slice(0, 200) } : {}) }));
  recordAudit(r.by, 'records.migration.reconcile', `Migration:${m.id}`, 'ok', `${counts ? `${counts.verified} verified, ${counts.mismatched} hash differs, ${counts.missing} missing, ${counts.notVerifiable} external, ${counts.unexpected} unexpected` : `${r.count} of ${m.source.count}`} · ${matched ? 'matched' : 'discrepancies recorded'}`);
  return clone(m);
}

export function closeMigration(caseRef: string, by: { name: string; id?: string }[], at: string, actor: string): Migration | { error: string } {
  const m = db().migrations.find(x => x.case === caseRef);
  if (!m?.reconciliation?.length) return { error: 'Reconcile the migration before closing it' };
  if (m.closed) return { error: 'Already closed' };
  const last = m.reconciliation.at(-1)!;
  m.closed = { by: clone(by), at, outcome: last.matched ? 'reconciled' : 'accepted-with-corrections' };
  recordAudit(actor, 'records.migration.close', `Migration:${m.id}`, 'ok', m.closed.outcome);
  return clone(m);
}

export function approveMigration(caseRef: string, by: { name: string; id?: string }[], at: string, actor: string): Migration | { error: string } {
  const m = db().migrations.find(x => x.case === caseRef);
  if (!m) return { error: 'No migration plan was recorded by this case' };
  if (m.approved) return { error: 'Already approved' };
  m.approved = { by: clone(by), at };
  recordAudit(actor, 'records.migration.signoff', `Migration:${m.id}`, 'ok', 'plan approved');
  return clone(m);
}

// ── reads ──────────────────────────────────────────────────────────────────

export const classesOf = (institution: string): RecordClass[] => db().classes.filter(c => c.institution === institution).map(clone);
export const getClass = (institution: string, key: string): RecordClass | undefined => { const c = db().classes.find(x => x.institution === institution && x.key === key); return c ? clone(c) : undefined; };
/** The schedule in force for a class (its latest approved version), or undefined: then nothing of the class is disposed of. */
export const scheduleOf = (institution: string, key: string): Schedule | undefined => db().classes.find(x => x.institution === institution && x.key === key)?.schedules.at(-1);
export const holdsOf = (institution: string): Hold[] => db().holds.filter(h => h.institution === institution).map(clone);
export const holdOfCase = (caseRef: string): Hold | undefined => { const h = db().holds.find(x => x.case === caseRef); return h ? clone(h) : undefined; };
export const incomingOf = (institution: string): IncomingItem[] => db().incoming.filter(i => i.institution === institution).map(clone);
export const incomingOfCase = (caseRef: string): IncomingItem | undefined => { const i = db().incoming.find(x => x.case === caseRef); return i ? clone(i) : undefined; };
export const disposalsOf = (institution: string): Disposal[] => db().disposals.filter(x => x.institution === institution).map(clone);
export const disposalOfCase = (caseRef: string): Disposal | undefined => { const x = db().disposals.filter(y => y.case === caseRef).at(-1); return x ? clone(x) : undefined; };
export const transfersOf = (institution: string): Transfer[] => db().transfers.filter(x => x.institution === institution).map(clone);
export const transfersTo = (archive: string): Transfer[] => db().transfers.filter(x => x.archive === archive).map(clone);
export const getTransfer = (id: string): Transfer | undefined => { const t = db().transfers.find(x => x.id === id); return t ? clone(t) : undefined; };
export const migrationsOf = (institution: string): Migration[] => db().migrations.filter(x => x.institution === institution).map(clone);
export const migrationOfCase = (caseRef: string): Migration | undefined => { const m = db().migrations.find(x => x.case === caseRef); return m ? clone(m) : undefined; };

/**
 * Where a migrated record came from (acceptance P5-06): for a record of the
 * institution (by its id here, or its id in the source system), the migration
 * that brought it, the source system and the record's source id and hash,
 * every transformation it went through and the status of every
 * reconciliation, latest last. Undefined when no migration lists it.
 */
export function provenanceOf(institution: string, id: string): { migration: string; case: string; sourceSystem: string; targetSystem: string; record: MigratedRecord; status: VerificationStatus | 'not-yet-verified'; closed?: Migration['closed']; sample?: true } | undefined {
  for (const m of [...db().migrations].reverse()) {
    if (m.institution !== institution || !m.records) continue;
    const rec = m.records.find(r => r.target.id === id) ?? m.records.find(r => r.source.id === id);
    if (rec) return { migration: m.id, case: m.case, sourceSystem: m.source.system, targetSystem: m.target.system, record: clone(rec), status: rec.verification.at(-1)?.status ?? 'not-yet-verified', ...(m.closed ? { closed: clone(m.closed) } : {}), ...(m.sample ? { sample: true as const } : {}) };
  }
  return undefined;
}

// ── Per-record manifests (digests) ──────────────────────────────────────────
/** The source side of a per-record manifest: the digest a source system computes over kind `source`, id and SHA-256 of each record. */
export const sourceDigestOf = (records: Pick<MigratedRecord, 'source'>[]): string => sha(records.map(r => `source:${r.source.id}:${r.source.sha256}`).sort().join('\n'));
/** The target side: kind, id and expected SHA-256 of each record where it lands. */
export const targetDigestOf = (records: Pick<MigratedRecord, 'target'>[]): string => sha(records.map(r => `${r.target.kind}:${r.target.id}:${r.target.sha256 ?? ''}`).sort().join('\n'));
/** The whole manifest, transformations included, in its order. */
export const manifestDigestOf = (records: Omit<MigratedRecord, 'verification'>[]): string => sha(JSON.stringify(records.map(r => [r.source.id, r.source.sha256, r.transformations.map(t => [t.step, t.rule ?? '', t.version ?? '']), r.target.kind, r.target.id, r.target.sha256 ?? ''])));

/**
 * The hold in force that covers a record, if any: one on the record itself,
 * on its case, or on its class at its institution. Read by disposal, transfer
 * and the platform's retention sweep (lib/data/retention.ts).
 */
export function holdCovering(r: { institution: string; class?: string; document?: string; case?: string[] }): Hold | undefined {
  const h = db().holds.find(x => !x.released && x.institution === r.institution && (
    (x.scope.kind === 'class' && !!r.class && x.scope.ref === r.class)
    || (x.scope.kind === 'document' && !!r.document && x.scope.ref === r.document)
    || (x.scope.kind === 'case' && !!r.case?.includes(x.scope.ref))));
  return h ? clone(h) : undefined;
}

/** Everything of one institution's records management register, as its portable export carries it (lib/portability/export.ts). */
export function recordkeepingOf(institution: string): { classes: RecordClass[]; holds: Hold[]; incoming: IncomingItem[]; disposals: Disposal[]; transfers: Transfer[]; migrations: Migration[] } {
  const d = db();
  const mine = <T extends { institution: string }>(xs: T[]) => xs.filter(x => x.institution === institution).map(clone);
  return { classes: mine(d.classes), holds: mine(d.holds), incoming: mine(d.incoming), disposals: mine(d.disposals), transfers: mine(d.transfers), migrations: mine(d.migrations) };
}

/**
 * The confirmed import of an institution's own export (lib/portability/import.ts:
 * two officials, the export verified, none of its records already here):
 * every record as exported, identifiers unchanged, migrations with their
 * per-record manifests and verification history. Returns the count restored.
 */
export function restoreRecordkeeping(part: ReturnType<typeof recordkeepingOf>): number {
  const d = db();
  const add = <T,>(into: T[], xs: T[] | undefined, same: (a: T, b: T) => boolean): number => { let n = 0; for (const x of xs ?? []) if (!into.some(y => same(y, x))) { into.push(clone(x)); n++; } return n; };
  return add(d.classes, part.classes, (a, b) => a.institution === b.institution && a.key === b.key)
    + add(d.holds, part.holds, (a, b) => a.id === b.id) + add(d.incoming, part.incoming, (a, b) => a.number === b.number)
    + add(d.disposals, part.disposals, (a, b) => a.id === b.id) + add(d.transfers, part.transfers, (a, b) => a.id === b.id)
    + add(d.migrations, part.migrations, (a, b) => a.id === b.id);
}

/** Records of an export already here (an import never overwrites one). */
export function recordkeepingConflicts(part: Partial<ReturnType<typeof recordkeepingOf>>): string[] {
  const d = db();
  return [
    ...(part.holds ?? []).filter(x => d.holds.some(y => y.id === x.id)).map(x => `legal hold ${x.id}`),
    ...(part.incoming ?? []).filter(x => d.incoming.some(y => y.number === x.number)).map(x => `incoming item ${x.number}`),
    ...(part.disposals ?? []).filter(x => d.disposals.some(y => y.id === x.id)).map(x => `disposal ${x.id}`),
    ...(part.transfers ?? []).filter(x => d.transfers.some(y => y.id === x.id)).map(x => `transfer ${x.id}`),
    ...(part.migrations ?? []).filter(x => d.migrations.some(y => y.id === x.id)).map(x => `migration ${x.id}`),
  ];
}

/** Counts (no record content) for the console and the onboarding hub. */
export function recordkeepingCounts(institution?: string): { classes: number; scheduled: number; holds: number; holdsInForce: number; incoming: number; disposals: number; destroyed: number; transfers: number; received: number; migrations: number; reconciled: number; samples: number } {
  const d = db();
  const mine = <T extends { institution: string }>(xs: T[]) => xs.filter(x => !institution || x.institution === institution);
  const classes = mine(d.classes), holds = mine(d.holds), disposals = mine(d.disposals), transfers = mine(d.transfers), migrations = mine(d.migrations), incoming = mine(d.incoming);
  return {
    classes: classes.length, scheduled: classes.filter(c => c.schedules.length).length, holds: holds.length, holdsInForce: holds.filter(h => !h.released).length, incoming: incoming.length,
    disposals: disposals.length, destroyed: disposals.reduce((n, x) => n + (x.executed?.destroyed.length ?? 0), 0), transfers: transfers.length, received: transfers.filter(t => t.received).length,
    migrations: migrations.length, reconciled: migrations.filter(m => m.closed).length,
    samples: [...holds, ...disposals, ...transfers, ...migrations, ...incoming].filter(x => (x as { sample?: true }).sample).length,
  };
}
