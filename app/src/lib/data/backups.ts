// Backups and data restore (register 3.7 "Restore points", 9.1 "Disaster
// recovery"; docs/DISASTER_RECOVERY.md).
//
// A backup is the platform's whole state at one moment (lib/backup/state.ts:
// the stores in memory, file and supabase modes; the record tables in postgres
// mode), sealed into one encrypted archive with its manifest and the audit
// chain head (lib/backup/archive.ts) and written to the configured target, a
// directory or S3-compatible object storage (lib/backup/target.ts), which is
// also the catalogue. Taken on the schedule (/api/cron/backup, CIVICOS_CRON_SECRET),
// on demand by an administrator (/api/platform/backups), as the Update
// Center's restore point before an install, and before every restore.
//
// Verified means read back from the target, the archive's SHA-256 matched,
// decrypted, every part's SHA-256 checked against the manifest, and a dry run
// restore into a scratch store (and, in postgres mode, a scratch schema rolled
// back) succeeded. Only a verified backup protects an install.
//
// A data restore is never automatic: an administrator proposes it and sees
// what will be lost (everything recorded after the backup: the audit entries
// and the stores that changed); a second, different official confirms it.
// Before anything is replaced the current state is backed up (the replaced
// state is never lost: its hash and its backup are named in the record).
// After the restore the audit chain is the backup's chain plus one entry
// naming who proposed, who confirmed, what was restored and the hash of the
// state it replaced. Every step is audited.
//
// Retention keeps the newest backup of each of the last N days, weeks and
// months (policy, set by an administrator, audited), every backup an
// installed release's restore point still names, and pre-restore copies for
// a set number of days. The schedule's interval and the RPO and RTO targets
// are part of the same policy.

import { randomBytes } from 'node:crypto';
import { recordAudit } from './store/audit';
import { touch } from './repo/track';
import { packArchive, openArchive, peekArchive, sha256, type BackupReason, type Manifest } from '@/lib/backup/archive';
import { captureState, dryRun, applySnapshot, applyPostgres, liveDigest, serverMode, KEPT_ON_RESTORE, EXCLUDED_NOTES, type DryRun, type Applied } from '@/lib/backup/state';
import { targetFromEnv, type BackupTarget } from '@/lib/backup/target';
import { setRestoring, persistenceStatus } from './persist';
import { encryptionAtRest } from '@/lib/crypto/envelope';
import { providerKind } from '@/lib/keys/custody';
import { syncBackupCatalogue } from './store/platform-ops';
import type { BackupRecord } from '@/lib/api/types';

export const SCHEDULE_ACTOR = 'system (backup schedule)';

export interface BackupPolicy {
  /** Newest backup of each of the last N days / ISO weeks / months is kept. */
  daily: number; weekly: number; monthly: number;
  /** Pre-restore copies are kept this many days. */
  preRestoreDays: number;
  /** The schedule takes a backup when the newest is older than this. */
  intervalMinutes: number;
  /** Targets (docs/DISASTER_RECOVERY.md): at most this much data may be lost, and service is back within this. */
  rpoMinutes: number; rtoMinutes: number;
  updatedBy?: string; updatedAt?: string;
}
export const DEFAULT_POLICY: BackupPolicy = { daily: 7, weekly: 4, monthly: 12, preRestoreDays: 90, intervalMinutes: 1440, rpoMinutes: 1440, rtoMinutes: 240 };

export interface Verification { at: string; by: string; ok: boolean; scratch: DryRun['scratch']; checks: string[]; problem?: string }
/** One backup, as the target's catalogue describes it (no state in it). */
export interface BackupEntry {
  id: string; createdAt: string; createdBy: string; reason: BackupReason;
  mode: Manifest['mode']; adapter: string;
  archive: string; sizeBytes: number; sha256: string; keyProvider: string;
  audit: Manifest['audit']; release: string | null; parts: number; stateDigest: string;
  verification?: Verification;
}
export interface LossWarning {
  backupId: string; backupAt: string;
  /** Audit entries recorded after the backup (they are kept in the pre-restore copy, not in the restored chain). */
  auditEntriesLost: number; auditFrom?: number; auditTo?: number;
  /** The live chain does not contain the backup's head (another history). */
  divergent: boolean;
  /** Stores or tables whose content differs from the backup. */
  changed: string[]; added: string[];
  kept: string[];
  text: string;
}
export interface RestoreProposal {
  id: string; backupId: string; by: string; at: string; expiresAt: string; reason?: string; warning: LossWarning;
  origin?: { kind: 'update-center'; nationId: string; releaseId: string };
}
export interface RestoreRecord {
  id: string; backupId: string; backupAt: string; proposedBy: string; confirmedBy: string; at: string;
  safetyBackupId: string; replacedDigest: string; auditSeq: number; check: Applied['check']; removed: string[];
}
interface Run { at: string; kind: 'scheduled' | 'retention'; ok: boolean; backupId?: string; pruned?: string[]; skipped?: string; error?: string }
interface BackupsDb { policy: BackupPolicy; proposals: RestoreProposal[]; restores: RestoreRecord[]; runs: Run[] }

const g = globalThis as unknown as { __civicosBackups?: BackupsDb; __backupLock?: Promise<unknown> };
function db(): BackupsDb {
  const d = touch('__civicosBackups', g.__civicosBackups ??= { policy: { ...DEFAULT_POLICY }, proposals: [], restores: [], runs: [] });
  d.policy = { ...DEFAULT_POLICY, ...(d.policy ?? {}) };
  d.proposals ??= []; d.restores ??= []; d.runs ??= [];
  return d;
}
export function resetBackups(): void { g.__civicosBackups = undefined; g.__backupLock = undefined; }

/** One backup or restore at a time on this server. */
function serial<T>(fn: () => Promise<T>): Promise<T> {
  const prev = g.__backupLock ?? Promise.resolve();
  const next = prev.catch(() => undefined).then(fn);
  g.__backupLock = next.catch(() => undefined);
  return next;
}

export type Result<T> = T | { error: string; status: number };
const fail = (error: string, status = 409) => ({ error, status });
const name = (by: string | undefined) => (by ?? '').trim();

async function releaseNow(): Promise<string | null> {
  try { const { nationRecord, HOME_NATION } = await import('./updates'); return nationRecord(HOME_NATION)?.installedVersion ?? null; } catch { return null; }
}
const PACKAGE_VERSION = '0.1.0';

const newId = (at: Date) => `BK-${at.toISOString().replace(/[-:T]/g, '').slice(0, 14)}-${randomBytes(3).toString('hex')}`;
const archiveName = (id: string) => `${id}.cvb`;
const entryName = (id: string) => `${id}.json`;
const ID = /^BK-\d{14}-[0-9a-f]{6}$/;

function target(): BackupTarget { return targetFromEnv(); }

/** A backup in the shape the platform console and the mirror show (lib/data/store/platform-ops.ts). */
export function asRecord(e: BackupEntry, t: Pick<BackupTarget, 'kind' | 'where'> = target()): BackupRecord {
  return {
    id: e.id, kind: 'full', state: e.verification ? (e.verification.ok ? 'completed' : 'failed') : 'pending',
    location: t.kind === 'dir' ? `dir://${e.archive}` : `s3://${t.where.replace(/^[a-z]+:\/\/[^/]+\//, '')}${e.archive}`,
    encrypted: true, sizeBytes: e.sizeBytes, createdAt: e.createdAt, sha256: e.sha256, createdBy: e.createdBy, reason: e.reason, auditSeq: e.audit.seq,
    ...(e.verification ? { verifiedAt: e.verification.at } : {}),
  };
}

/** The catalogue: every backup at the target, newest first (and the platform's list of backups follows it). */
export async function listBackups(t: BackupTarget = target()): Promise<BackupEntry[]> {
  const out: BackupEntry[] = [];
  for (const n of await t.list()) {
    if (!n.endsWith('.json') || !ID.test(n.slice(0, -5))) continue;
    const raw = await t.get(n);
    if (!raw) continue;
    try { out.push(JSON.parse(raw.toString('utf8')) as BackupEntry); } catch { /* unreadable description: skipped */ }
  }
  out.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  syncBackupCatalogue(out.map(e => asRecord(e, t)));
  return out;
}

/** Bring the platform's list of backups in step with the target (after a change). */
const resync = (t: BackupTarget) => listBackups(t).catch(() => undefined);

export async function getBackup(id: string, t: BackupTarget = target()): Promise<BackupEntry | null> {
  if (!ID.test(id)) return null;
  const raw = await t.get(entryName(id));
  return raw ? JSON.parse(raw.toString('utf8')) as BackupEntry : null;
}

/** Take a backup of this server's state now. */
export function createBackup(input: { by?: string; reason?: BackupReason }): Promise<Result<BackupEntry>> {
  const by = name(input.by);
  if (!by || by.length > 120) return Promise.resolve(fail('Name the person taking the backup', 422));
  return serial(() => takeBackup(by, input.reason ?? 'manual'));
}

async function takeBackup(by: string, reason: BackupReason): Promise<Result<BackupEntry>> {
  const t = target();
  const at = new Date();
  const id = newId(at);
  try {
    const cap = await captureState({ pgDump: process.env.CIVICOS_BACKUP_PG_DUMP?.trim() || undefined, databaseUrl: process.env.DATABASE_URL });
    const { archive, manifest } = await packArchive({
      id, createdAt: at.toISOString(), createdBy: by, reason, mode: cap.mode, adapter: cap.adapter,
      app: { release: await releaseNow(), package: PACKAGE_VERSION, node: process.version },
      schema: cap.schema, audit: cap.audit, excluded: EXCLUDED_NOTES, keptOnRestore: KEPT_ON_RESTORE,
    }, cap.parts);
    const entry: BackupEntry = {
      id, createdAt: manifest.createdAt, createdBy: by, reason, mode: manifest.mode, adapter: manifest.adapter,
      archive: archiveName(id), sizeBytes: archive.length, sha256: sha256(archive), keyProvider: peekArchive(archive).provider,
      audit: manifest.audit, release: manifest.app.release, parts: manifest.parts.length, stateDigest: manifest.stateDigest,
    };
    await t.put(archiveName(id), archive);
    await t.put(entryName(id), Buffer.from(JSON.stringify(entry, null, 2), 'utf8'));
    recordAudit(by, 'backup.create', `Backup:${id}`, 'ok', `${reason} · ${manifest.mode} · ${manifest.parts.length} parts · ${archive.length} bytes · sha256 ${entry.sha256.slice(0, 16)}… · audit head ${manifest.audit.seq} · ${t.kind}`);
    await resync(t);
    return entry;
  } catch (e) {
    recordAudit(by, 'backup.create', `Backup:${id}`, 'failed', `${reason}: ${(e as Error).message}`.slice(0, 500));
    return fail(`The backup could not be taken: ${(e as Error).message}`, 503);
  }
}

/** Read a backup back from the target and open it (archive hash, decryption, every part's hash). */
async function readBack(t: BackupTarget, entry: BackupEntry) {
  const archive = await t.get(entry.archive);
  if (!archive) throw new Error(`The archive ${entry.archive} is not at the target`);
  if (sha256(archive) !== entry.sha256) throw new Error('The archive at the target does not match the SHA-256 recorded when it was taken (changed or damaged)');
  return openArchive(archive, entry.id);
}

/** Verify a backup: read back, decrypt, check every part, dry-run restore into a scratch store or schema. */
export function verifyBackup(id: string, input: { by?: string }): Promise<Result<BackupEntry>> {
  const by = name(input.by);
  if (!by || by.length > 120) return Promise.resolve(fail('Name the person verifying the backup', 422));
  return serial(() => verifyNow(id, by));
}

async function verifyNow(id: string, by: string): Promise<Result<BackupEntry>> {
  const t = target();
  const entry = await getBackup(id, t);
  if (!entry) return fail('Backup not found', 404);
  let v: Verification;
  try {
    const opened = await readBack(t, entry);
    const run = await dryRun(opened);
    v = { at: new Date().toISOString(), by, ok: run.ok, scratch: run.scratch, checks: [`Archive read back from ${t.kind}; SHA-256 matches`, 'Decrypted with the key it was sealed under', ...run.checks], ...(run.problem ? { problem: run.problem } : {}) };
  } catch (e) {
    v = { at: new Date().toISOString(), by, ok: false, scratch: entry.mode === 'postgres' ? 'schema' : 'store', checks: [], problem: (e as Error).message };
  }
  entry.verification = v;
  await t.put(entryName(id), Buffer.from(JSON.stringify(entry, null, 2), 'utf8'));
  recordAudit(by, 'backup.verify', `Backup:${id}`, v.ok ? 'ok' : 'failed', v.ok ? `dry run into a scratch ${v.scratch}; ${v.checks.length} checks` : (v.problem ?? 'failed').slice(0, 500));
  await resync(t);
  return entry;
}

/** What the Update Center's restore point keeps of a verified backup. */
export interface RestorePointBackup { backupId: string; createdAt: string; sizeBytes: number; verified: boolean; checks: string[]; contents: string[]; problem?: string }

/** The Update Center's restore point: a backup taken now and verified at once. */
export async function takeRestorePoint(by: string): Promise<Result<RestorePointBackup>> {
  const b = await createBackup({ by, reason: 'restore-point' });
  if ('error' in b) return b;
  const v = await verifyBackup(b.id, { by });
  if ('error' in v) return v;
  const ok = !!v.verification?.ok;
  return {
    backupId: b.id, createdAt: b.createdAt, sizeBytes: b.sizeBytes, verified: ok, checks: v.verification?.checks ?? [], ...(v.verification?.problem ? { problem: v.verification.problem } : {}),
    contents: [
      `Encrypted backup ${b.id} of the platform state (${b.mode === 'postgres' ? 'every record table, one consistent transaction' : 'every store'}, ${b.parts} parts, audit chain head ${b.audit.seq})`,
      `Kept at the backup target (${target().kind}), sealed under ${b.keyProvider === 'env' ? 'the nation\'s data key (CIVICOS_DATA_KEK)' : `a ${b.keyProvider} data key`}`,
      'Release artifacts: from the Update Center registry or mirror (not in the backup)',
    ],
  };
}

// ── Restore ───────────────────────────────────────────────────────────────
const PROPOSAL_MINUTES = 30;

async function lossWarning(entry: BackupEntry, manifest: Manifest): Promise<LossWarning> {
  const live = await liveDigest();
  const was = new Map(manifest.parts.map(p => [p.name, p.sha256]));
  const kept = new Set(KEPT_ON_RESTORE.flatMap(k => [`store/${k}`]));
  const changed: string[] = [], added: string[] = [];
  for (const p of live.parts) {
    if (kept.has(p.name) || p.name === 'table/record_counter') continue;
    if (!was.has(p.name)) added.push(p.name);
    else if (was.get(p.name) !== p.sha256) changed.push(p.name);
  }
  const lost = Math.max(0, live.audit.seq - manifest.audit.seq);
  const { listAudit } = await import('./store/audit');
  const atSeq = listAudit().find(e => e.seq === manifest.audit.seq);
  const divergent = manifest.audit.seq > 0 && (!atSeq || atSeq.hash !== manifest.audit.hash);
  const stores = [...changed, ...added].map(n => n.replace(/^(store|table)\//, ''));
  const text = [
    `Restoring backup ${entry.id} returns the platform's data to ${entry.createdAt}.`,
    `Everything recorded after that time is lost from the running platform: ${lost} audit entr${lost === 1 ? 'y' : 'ies'}${lost ? ` (${manifest.audit.seq + 1}–${live.audit.seq})` : ''}${stores.length ? ` and the changes in ${stores.length} store${stores.length === 1 ? '' : 's'} (${stores.slice(0, 12).join(', ')}${stores.length > 12 ? ', …' : ''})` : ''} — payments, applications, registrations, decisions and accounts made since.`,
    divergent ? 'The running audit chain does not contain this backup\'s head: it holds another history.' : '',
    `Kept as they are: ${KEPT_ON_RESTORE.join(', ')} (the backup records and the Update Center's record of the software running).`,
    'The current state is backed up first; its backup and hash are named in the audit entry that records the restore.',
  ].filter(Boolean).join(' ');
  return { backupId: entry.id, backupAt: entry.createdAt, auditEntriesLost: lost, ...(lost ? { auditFrom: manifest.audit.seq + 1, auditTo: live.audit.seq } : {}), divergent, changed, added, kept: KEPT_ON_RESTORE, text };
}

/** What a restore of this backup would lose (no change). */
export async function restorePreview(id: string): Promise<Result<{ backup: BackupEntry; warning: LossWarning }>> {
  const t = target();
  const entry = await getBackup(id, t);
  if (!entry) return fail('Backup not found', 404);
  try {
    const opened = await readBack(t, entry);
    return { backup: entry, warning: await lossWarning(entry, opened.manifest) };
  } catch (e) { return fail((e as Error).message, 409); }
}

export function pendingRestore(backupId: string): RestoreProposal | undefined {
  const d = db();
  const now = Date.now();
  d.proposals = d.proposals.filter(p => Date.parse(p.expiresAt) > now);
  return d.proposals.find(p => p.backupId === backupId);
}
export const listProposals = (): RestoreProposal[] => { const now = Date.now(); return db().proposals.filter(p => Date.parse(p.expiresAt) > now); };
export const listRestores = (): RestoreRecord[] => [...db().restores].reverse();

export type RestoreOutcome = { pending: true; proposal: RestoreProposal } | { pending: false; restore: RestoreRecord };

/**
 * Four-eyes data restore. The first call (an administrator; the route checks
 * the role) proposes it and returns the loss warning; a call by a second,
 * different official within 30 minutes carries it out. Both must acknowledge
 * the loss. Never automatic.
 */
export function requestRestore(id: string, input: { by?: string; acknowledgeLoss?: boolean; reason?: string; origin?: RestoreProposal['origin'] }): Promise<Result<RestoreOutcome>> {
  const by = name(input.by);
  if (!by || by.length > 120) return Promise.resolve(fail('Name the official', 422));
  return serial(async (): Promise<Result<RestoreOutcome>> => {
    const t = target();
    const entry = await getBackup(id, t);
    if (!entry) return fail('Backup not found', 404);
    if (entry.mode !== serverMode()) return fail(`This backup was taken in ${entry.mode} mode; this server runs in ${serverMode()} mode. Restore it into a server of the same mode (docs/DISASTER_RECOVERY.md)`);
    const proposal = pendingRestore(id);
    if (!proposal) {
      let opened;
      try { opened = await readBack(t, entry); } catch (e) { return fail(`The backup cannot be restored: ${(e as Error).message}`); }
      const warning = await lossWarning(entry, opened.manifest);
      if (input.acknowledgeLoss !== true) return fail(`${warning.text} Acknowledge the loss to propose the restore.`, 422);
      const at = new Date();
      const p: RestoreProposal = {
        id: `RST-${at.getTime().toString(36)}-${randomBytes(2).toString('hex')}`, backupId: id, by, at: at.toISOString(),
        expiresAt: new Date(at.getTime() + PROPOSAL_MINUTES * 60_000).toISOString(), ...(input.reason?.trim() ? { reason: input.reason.trim().slice(0, 500) } : {}), warning,
        ...(input.origin ? { origin: input.origin } : {}),
      };
      db().proposals.push(p);
      recordAudit(by, 'backup.restore.propose', `Backup:${id}`, 'ok', `awaiting a second official within ${PROPOSAL_MINUTES} min · ${warning.auditEntriesLost} audit entries and ${warning.changed.length + warning.added.length} stores would be lost${p.reason ? ` · ${p.reason}` : ''}`);
      return { pending: true, proposal: p };
    }
    if (proposal.by.toLowerCase() === by.toLowerCase()) return fail(`${proposal.by} proposed this restore; a second, different official must confirm it`);
    if (input.acknowledgeLoss !== true) return fail(`${proposal.warning.text} Acknowledge the loss to confirm the restore.`, 422);
    return executeRestore(t, entry, proposal, by);
  });
}

export function cancelRestore(id: string, input: { by?: string }): Result<{ cancelled: RestoreProposal }> {
  const by = name(input.by);
  if (!by) return fail('Name the official', 422);
  const p = pendingRestore(id);
  if (!p) return fail('There is no restore proposal for this backup', 404);
  db().proposals = db().proposals.filter(x => x !== p);
  recordAudit(by, 'backup.restore.cancel', `Backup:${id}`, 'ok', `cancelled ${p.by}'s proposal`);
  return { cancelled: p };
}

async function executeRestore(t: BackupTarget, entry: BackupEntry, proposal: RestoreProposal, confirmedBy: string): Promise<Result<RestoreOutcome>> {
  let opened;
  try { opened = await readBack(t, entry); } catch (e) { return fail(`The backup cannot be restored: ${(e as Error).message}`); }
  const run = await dryRun(opened);
  if (!run.ok) return fail(`The backup did not pass its dry run, so nothing was restored: ${run.problem}`);
  // The state about to be replaced is kept first: never restore without a copy of what it replaces.
  const safety = await takeBackup(confirmedBy, 'pre-restore');
  if ('error' in safety) return fail(`Nothing was restored: the current state could not be backed up first (${safety.error})`, 503);
  db().proposals = db().proposals.filter(x => x !== proposal);
  const instance = persistenceStatus().writer ?? 'this-server';
  let applied: Applied;
  setRestoring(true);
  try {
    applied = entry.mode === 'postgres' ? await applyPostgres(opened, instance, entry.id) : await applySnapshot(opened);
  } catch (e) {
    setRestoring(false);
    recordAudit(confirmedBy, 'backup.restore', `Backup:${entry.id}`, 'failed', `proposed by ${proposal.by}; ${(e as Error).message}; the state before is in backup ${safety.id}`.slice(0, 500));
    return fail(`The restore failed: ${(e as Error).message}. The state before it is kept in backup ${safety.id}`, 500);
  }
  setRestoring(false);
  const at = new Date().toISOString();
  // The restored chain, plus this entry: who, what, and the hash of the state it replaced.
  const a = recordAudit(confirmedBy, 'backup.restore', `Backup:${entry.id}`, applied.check.differing.length ? 'partial' : 'ok', [
    `proposed by ${proposal.by}; confirmed by ${confirmedBy}`,
    `state of ${entry.createdAt} restored (audit head ${entry.audit.seq} ${entry.audit.hash?.slice(0, 16) ?? '-'}…)`,
    `replaced state sha256 ${safety.stateDigest} kept as backup ${safety.id}`,
    `${proposal.warning.auditEntriesLost} later audit entries left the live chain (kept in ${safety.id})`,
    applied.check.differing.length ? `differs after restore: ${applied.check.differing.join(', ')}` : `${applied.check.compared} parts match the backup`,
  ].join(' · '));
  const record: RestoreRecord = {
    id: proposal.id, backupId: entry.id, backupAt: entry.createdAt, proposedBy: proposal.by, confirmedBy, at,
    safetyBackupId: safety.id, replacedDigest: safety.stateDigest, auditSeq: a.seq, check: applied.check, removed: applied.removed,
  };
  db().restores.push(record);
  await resync(t);
  // Derived data follows the restored records (the tile archive rebuilds from the published sites).
  void import('@/lib/twin/tiles-archive').then(m => m.scheduleRebuild(0)).catch(() => undefined);
  return { pending: false, restore: record };
}

// ── Policy, retention, schedule ───────────────────────────────────────────
export const getPolicy = (): BackupPolicy => ({ ...db().policy });

export function setPolicy(input: Partial<BackupPolicy> & { by?: string }): Result<BackupPolicy> {
  const by = name(input.by);
  if (!by) return fail('Name the official changing the policy', 422);
  const next = { ...db().policy };
  const ints: [keyof BackupPolicy, number, number][] = [['daily', 0, 366], ['weekly', 0, 520], ['monthly', 0, 1200], ['preRestoreDays', 1, 3650], ['intervalMinutes', 15, 10080], ['rpoMinutes', 1, 525600], ['rtoMinutes', 1, 525600]];
  const changes: string[] = [];
  for (const [k, min, max] of ints) {
    const v = input[k];
    if (v === undefined) continue;
    if (typeof v !== 'number' || !Number.isInteger(v) || v < min || v > max) return fail(`${k} must be a whole number from ${min} to ${max}`, 422);
    if (next[k] !== v) changes.push(`${k} ${String(next[k])}→${v}`);
    (next as Record<string, unknown>)[k] = v;
  }
  if (next.daily + next.weekly + next.monthly < 1) return fail('Keep at least one backup (daily, weekly or monthly)', 422);
  next.updatedBy = by; next.updatedAt = new Date().toISOString();
  db().policy = next;
  recordAudit(by, 'backup.policy', 'BackupPolicy', 'ok', changes.join(', ') || 'unchanged');
  return { ...next };
}

const isoWeek = (d: Date): string => {
  const t = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const day = t.getUTCDay() || 7;
  t.setUTCDate(t.getUTCDate() + 4 - day);
  const y = t.getUTCFullYear();
  return `${y}-W${Math.ceil(((t.getTime() - Date.UTC(y, 0, 1)) / 86400000 + 1) / 7)}`;
};

/** Which backups the policy keeps (pure; newest first in, the ids kept out). */
export function retained(entries: BackupEntry[], policy: BackupPolicy, held: Set<string>, now = Date.now()): Set<string> {
  const keep = new Set<string>();
  const sorted = [...entries].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  const regular = sorted.filter(e => e.reason !== 'pre-restore');
  if (regular[0]) keep.add(regular[0].id);
  const newestVerified = regular.find(e => e.verification?.ok);
  if (newestVerified) keep.add(newestVerified.id);
  for (const [n, key] of [[policy.daily, (d: Date) => d.toISOString().slice(0, 10)], [policy.weekly, isoWeek], [policy.monthly, (d: Date) => d.toISOString().slice(0, 7)]] as const) {
    const seen = new Set<string>();
    for (const e of regular) {
      const k = key(new Date(e.createdAt));
      if (seen.has(k)) continue;
      if (seen.size >= n) break;
      seen.add(k); keep.add(e.id);
    }
  }
  for (const e of sorted) {
    if (held.has(e.id)) keep.add(e.id);
    if (e.reason === 'pre-restore' && now - Date.parse(e.createdAt) < policy.preRestoreDays * 86400000) keep.add(e.id);
  }
  return keep;
}

/** Backups an installed release's restore point still names (never pruned). */
async function heldByUpdates(): Promise<Set<string>> {
  try { const { restorePointBackups } = await import('./updates'); return new Set(restorePointBackups()); } catch { return new Set(); }
}

/** Remove the backups the policy no longer keeps. */
export function applyRetention(input: { by?: string }): Promise<Result<{ kept: string[]; pruned: string[] }>> {
  const by = name(input.by);
  if (!by) return Promise.resolve(fail('Name the official', 422));
  return serial(async () => {
    const t = target();
    const entries = await listBackups(t);
    const keep = retained(entries, db().policy, await heldByUpdates());
    const pruned: string[] = [];
    for (const e of entries) {
      if (keep.has(e.id)) continue;
      await t.remove(e.archive);
      await t.remove(entryName(e.id));
      pruned.push(e.id);
    }
    if (pruned.length) recordAudit(by, 'backup.prune', 'BackupPolicy', 'ok', `${pruned.length} removed by the retention policy (${db().policy.daily} daily, ${db().policy.weekly} weekly, ${db().policy.monthly} monthly): ${pruned.join(', ')}`.slice(0, 1000));
    if (pruned.length) await resync(t);
    db().runs.push({ at: new Date().toISOString(), kind: 'retention', ok: true, pruned });
    db().runs = db().runs.slice(-50);
    return { kept: [...keep], pruned };
  });
}

/** The schedule (/api/cron/backup): a backup when the newest is older than the interval, verified, then retention. */
export async function runScheduled(now = new Date()): Promise<{ took?: string; verified?: boolean; skipped?: string; pruned: string[]; rpo: RpoStatus; error?: string }> {
  const t = target();
  const policy = db().policy;
  let entries: BackupEntry[];
  try { entries = await listBackups(t); } catch (e) { return { error: `The backup target cannot be read: ${(e as Error).message}`, pruned: [], rpo: rpoOf([], policy, now) }; }
  const newest = entries.find(e => e.reason !== 'pre-restore');
  if (newest && now.getTime() - Date.parse(newest.createdAt) < policy.intervalMinutes * 60_000) {
    const r = await applyRetention({ by: SCHEDULE_ACTOR });
    return { skipped: `the newest backup (${newest.id}) is younger than ${policy.intervalMinutes} min`, pruned: 'error' in r ? [] : r.pruned, rpo: rpoOf(entries, policy, now) };
  }
  const b = await createBackup({ by: SCHEDULE_ACTOR, reason: 'scheduled' });
  if ('error' in b) {
    db().runs.push({ at: now.toISOString(), kind: 'scheduled', ok: false, error: b.error });
    return { error: b.error, pruned: [], rpo: rpoOf(entries, policy, now) };
  }
  const v = await verifyBackup(b.id, { by: SCHEDULE_ACTOR });
  const verified = !('error' in v) && !!v.verification?.ok;
  db().runs.push({ at: now.toISOString(), kind: 'scheduled', ok: verified, backupId: b.id, ...(verified ? {} : { error: 'error' in v ? v.error : v.verification?.problem }) });
  const r = await applyRetention({ by: SCHEDULE_ACTOR });
  return { took: b.id, verified, pruned: 'error' in r ? [] : r.pruned, rpo: rpoOf(await listBackups(t).catch(() => entries), policy, new Date()) };
}

export interface RpoStatus { targetMinutes: number; newestVerifiedAt: string | null; ageMinutes: number | null; met: boolean }
function rpoOf(entries: BackupEntry[], policy: BackupPolicy, now: Date): RpoStatus {
  const v = entries.find(e => e.verification?.ok && e.reason !== 'pre-restore');
  const age = v ? Math.round((now.getTime() - Date.parse(v.createdAt)) / 60_000) : null;
  return { targetMinutes: policy.rpoMinutes, newestVerifiedAt: v?.createdAt ?? null, ageMinutes: age, met: age !== null && age <= policy.rpoMinutes };
}

export interface BackupStatus {
  target: { kind: string; where: string } | { error: string };
  key: { provider: string; ready: boolean };
  mode: Manifest['mode'];
  policy: BackupPolicy;
  rpo: RpoStatus;
  rtoMinutes: number;
  proposals: RestoreProposal[];
  restores: RestoreRecord[];
  runs: Run[];
}

export async function backupStatus(): Promise<BackupStatus> {
  const policy = db().policy;
  let t: BackupTarget | null = null, targetInfo: BackupStatus['target'];
  try { t = target(); targetInfo = { kind: t.kind, where: t.kind === 'dir' ? 'local directory' : t.where }; } catch (e) { targetInfo = { error: (e as Error).message }; }
  const entries = t ? await listBackups(t).catch(() => []) : [];
  const kind = providerKind();
  return {
    target: targetInfo, key: { provider: kind, ready: kind !== 'env' || encryptionAtRest().enabled }, mode: serverMode(),
    policy, rpo: rpoOf(entries, policy, new Date()), rtoMinutes: policy.rtoMinutes,
    proposals: listProposals(), restores: listRestores(), runs: [...db().runs].reverse().slice(0, 20),
  };
}

/** A fingerprint of the live state (the DR drill compares it with the backup's manifest). */
export async function stateFingerprint(): Promise<{ mode: Manifest['mode']; stateDigest: string; parts: { name: string; sha256: string }[]; audit: Manifest['audit'] }> {
  const d = await liveDigest();
  const { stateDigest } = await import('@/lib/backup/archive');
  return { mode: serverMode(), stateDigest: stateDigest(d.parts), parts: d.parts, audit: d.audit };
}
