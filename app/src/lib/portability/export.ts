// An institution's portable export (spec Part 5 D and L 8–9, Part 1 §1.1
// "Standalone deployment"; Health I4 standalone-and-pilot): its own records,
// sealed like a backup, so it can move to another host, run standing alone or
// federate later with every record identifier unchanged.
//
// What goes in, for one institution and nothing of any other:
//   institution.json        its registry record and terms, and the slots it is named (or stands in) for
//   registers/*.json        the registers it keeps: the standings in its own register types (with the
//                           organisation's identity only, never its representatives), the professions it
//                           keeps and their registrations, the medicines register, import and
//                           controlled-medicine authorisations, facilities' capacity returns
//   procedures.json         the procedure versions it owns (the schemas its cases and forms follow)
//   cases.json              its cases with their full history
//   decisions.json          its sealed decisions, exactly as sealed (never re-sealed)
//   documents.json          its documents, each version's content with its SHA-256
//   audit.json              the audit chain from its start to the head: the entries about its records in
//                           full, every other entry only as its sequence and hashes (a link), so the chain
//                           verifies without carrying another institution's actions
//   access-log.json         the access log the same way: reads by its officials or of its records in full
//   trust-list.json         the seal key register's public trust list when exported
//   evidence/imported.json  evidence it brought with it from an earlier export (lib/portability/evidence.ts)
//
// Sealed through key custody exactly as backups are (lib/backup/archive.ts,
// format civicos-institution-export/1; never plaintext), written to the backup
// target. Verified offline by lib/portability/verify.ts (and
// app/scripts/verify-institution-export.mjs): every part's SHA-256, the audit
// and access-log segments, every decision's seal against the trust list and
// its `decision.seal` entry, every reference between the parts.
//
// Proposed by an administrator whose scope reaches the institution (its own;
// the whole government's only when it is not independent) and confirmed by a
// different official who can sign there (exportProposeRefusal(),
// exportConfirmRefusal(), dualControlRefusal()); every step in the audit
// chain, the export itself in the access log. The catalogue of proposals and
// exports is the backup system's own kind of record: kept as it stands by a
// restore (lib/backup/state.ts KEPT_ON_RESTORE).

import { randomBytes } from 'node:crypto';
import { touch } from '@/lib/data/repo/track';
import { recordAudit, listAudit, type AuditLink } from '@/lib/data/store/audit';
import { getMinistry } from '@/lib/data/store/ministries';
import { authorityFor } from '@/lib/data/store/sovereign';
import { termsOf } from '@/lib/data/store/institutions';
import { AUTHORITIES, isAuthorityKey, provisionalOwner, type AuthorityKey } from '@/lib/nation/deployment';
import { dualControlRefusal, independenceOf, dualControlPendingHours } from '@/lib/data/dual-control';
import { exportProposeRefusal, exportConfirmRefusal, type Scope } from '@/lib/auth/roles';
import { installationMode, MODE_LABEL } from '@/lib/ops/mode';
import { packExport, sha256, peekArchive, EXPORT_FORMAT, type ExportManifestBase } from '@/lib/backup/archive';
import { targetFromEnv, type BackupTarget } from '@/lib/backup/target';
import { casesOf } from '@/lib/casework/engine';
import { listPackages, ownerInstitution } from '@/lib/casework/packages';
import { listDecisions } from '@/lib/records/decisions';
import { portableDocuments } from '@/lib/records/documents';
import { accessLogChain, recordAccess, type AccessLink } from '@/lib/records/access-log';
import { accessBy } from '@/lib/records/access-by';
import { trustList } from '@/lib/keys/seal-register';
import { registerTypes, organisationRecords } from '@/lib/organisations/register';
import { professionalRecords } from '@/lib/professions/register';
import { productRecords } from '@/lib/health/products/register';
import { importRecords } from '@/lib/health/products/imports';
import { controlledRecords } from '@/lib/health/products/controlled';
import { allCapacity } from '@/lib/health/register';
import { importedEvidence } from './evidence';

export const EXPORT_KIND = 'civicos.institution-export';

export interface ExportManifest extends ExportManifestBase {
  kind: typeof EXPORT_KIND;
  institution: { id: string; name: string };
  reason: string;
  proposedBy: string; confirmedBy: string; independence: 'identity-provider' | 'accounts-only' | 'unverified';
  /** The installation it was taken in (lib/ops/mode.ts): a demo or training export holds sample records. */
  installation: string;
  audit: { head: { seq: number; hash: string } | null; entries: number; full: number };
  accessLog: { head: { seq: number; hash: string } | null; entries: number; full: number };
  counts: Record<string, number>;
  /** What it does not carry, and why. */
  notIncluded: { what: string; why: string }[];
}

export const NOT_INCLUDED: ExportManifest['notIncluded'] = [
  { what: 'Other institutions\' records, cases, decisions and documents', why: 'An export is one institution\'s own records; the audit chain and access log carry other entries only as their sequence and hashes' },
  { what: 'An organisation\'s representatives and its standings in registers other institutions keep', why: 'They belong to the register that keeps them (the business register and others); the organisation\'s number and name identify it' },
  { what: 'Officials\' accounts, passwords and second-step secrets', why: 'Sign-in belongs to each installation; officials are named in the records they acted on' },
  { what: 'Keys (the data key, the seal key)', why: 'Held in key custody; the trust list carries the public seal keys a verifier needs' },
  { what: 'Authority mappings, rates and the country\'s rules', why: 'The nation\'s configuration, adopted in each installation through its own change process; each decision records the versions it used' },
  { what: 'Certificates, recall notice deliveries and capacity returns of organisations outside its registers', why: 'Not yet carried (integration register 20.43)' },
  { what: 'Protected identities (complainants, people making a protected disclosure, protected witnesses, data subjects)', why: 'Kept apart from the cases they belong to (lib/oversight/protected-identity.ts); an ordinary export never carries them (acceptance P4-07). Moving them to another installation would be its own act of the body\'s officials (integration register 20.86)' },
];

export interface ExportRecord {
  id: string; institution: string; createdAt: string; archive: string; sizeBytes: number; sha256: string; keyProvider: string;
  digest: string; parts: number; counts: Record<string, number>; installation: string; target: 'dir' | 's3';
}
export interface ExportProposal {
  id: string; institution: string; reason: string;
  by: string; byId?: string; at: string; expiresAt: string;
  state: 'proposed' | 'confirmed' | 'lapsed' | 'withdrawn' | 'failed';
  confirmed?: { by: string; byId?: string; at: string; independence: ExportManifest['independence'] };
  withdrawn?: { by: string; at: string; reason?: string };
  problem?: string;
  export?: ExportRecord;
}
/** An import of an institution's export into this installation (lib/portability/import.ts). */
export interface ImportProposal {
  id: string; exportId: string; institution: string; institutionName: string; digest: string; archive: string; sizeBytes: number;
  by: string; byId?: string; at: string; expiresAt: string;
  state: 'proposed' | 'confirmed' | 'lapsed' | 'withdrawn' | 'failed';
  confirmed?: { by: string; byId?: string; at: string; independence: ExportManifest['independence'] };
  withdrawn?: { by: string; at: string; reason?: string };
  problem?: string;
  restored?: Record<string, number>;
}
interface Db { proposals: ExportProposal[]; imports: ImportProposal[] }
const g = globalThis as unknown as { __civicosInstitutionExports?: Db };
export const portabilityDb = (): Db => { const d = touch('__civicosInstitutionExports', g.__civicosInstitutionExports ??= { proposals: [], imports: [] }); d.proposals ??= []; d.imports ??= []; return d; };
export function resetPortability(): void { g.__civicosInstitutionExports = undefined; }

export interface PortabilityActor { by: string; byId?: string; scope: Scope | null; institution?: string; label?: string }
const fail = (error: string) => ({ error });
const str = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
export const newPortabilityId = (prefix: 'EXP' | 'IMP', at: Date) => `${prefix}-${at.toISOString().replace(/[-:T]/g, '').slice(0, 14)}-${randomBytes(3).toString('hex')}`;
export const PORTABILITY_ID = /^(EXP|IMP)-\d{14}-[0-9a-f]{6}$/;
/** Without a sign-in only a demonstration may propose or confirm (production needs verified officials). */
export function portabilityActorRefusal(a: PortabilityActor, rule: (s: Scope) => string | null): string | null {
  if (a.scope) return rule(a.scope);
  return installationMode() === 'production' ? 'Sign in: an export is proposed and confirmed only by verified officials' : null;
}

/** Proposals past their waiting period lapse (kept). */
export function lapsePortability(now = new Date()): void {
  const d = portabilityDb();
  for (const p of [...d.proposals, ...d.imports]) if (p.state === 'proposed' && Date.parse(p.expiresAt) < now.getTime()) {
    p.state = 'lapsed';
    recordAudit('System (dual control)', 'institution.export.lapse', `InstitutionExport:${p.id}`, 'ok', 'Not confirmed within the waiting period');
  }
}

/** The proposals and exports of one institution (or all), newest first. */
export function listExports(institution?: string): ExportProposal[] {
  lapsePortability();
  return portabilityDb().proposals.filter(p => !institution || p.institution === institution).map(p => structuredClone(p)).reverse();
}

/** Propose an export of one institution's records: an administrator whose scope reaches it. */
export function proposeExport(input: { institution?: unknown; reason?: unknown }, actor: PortabilityActor, now = new Date()): ExportProposal | { error: string } {
  lapsePortability(now);
  const id = str(input.institution, 120);
  const m = getMinistry(id);
  if (!m || m.status === 'merged') return fail(`No institution ${id || '(none given)'}`);
  const why = portabilityActorRefusal(actor, s => exportProposeRefusal(s, id));
  if (why) return fail(why);
  const reason = str(input.reason, 500);
  if (!reason) return fail('Say why the institution\'s records are exported (moving host, standing alone, federating, an audit)');
  const d = portabilityDb();
  if (d.proposals.some(p => p.institution === id && p.state === 'proposed')) return fail('An export of this institution is already waiting for a second official: confirm or withdraw it first');
  const p: ExportProposal = { id: newPortabilityId('EXP', now), institution: id, reason, by: actor.by, ...(actor.byId ? { byId: actor.byId } : {}), at: now.toISOString(), expiresAt: new Date(now.getTime() + dualControlPendingHours() * 3_600_000).toISOString(), state: 'proposed' };
  d.proposals.push(p);
  recordAudit(actor.by, 'institution.export.propose', `InstitutionExport:${p.id}`, 'ok', `${m.name} · ${reason.slice(0, 200)} · awaiting an official who can sign there`);
  return structuredClone(p);
}

/** The proposer (or an administrator) withdraws a waiting export; it is kept. */
export function withdrawExport(proposal: string, actor: PortabilityActor, reason?: string): ExportProposal | { error: string } {
  const p = portabilityDb().proposals.find(x => x.id === proposal);
  if (!p || p.state !== 'proposed') return fail('No export with that number is waiting');
  const why = portabilityActorRefusal(actor, s => exportProposeRefusal(s, p.institution));
  if (why) return fail(why);
  p.state = 'withdrawn';
  p.withdrawn = { by: actor.by, at: new Date().toISOString(), ...(reason ? { reason: reason.slice(0, 300) } : {}) };
  recordAudit(actor.by, 'institution.export.withdraw', `InstitutionExport:${p.id}`, 'ok', reason?.slice(0, 200) || 'Withdrawn');
  return structuredClone(p);
}

/**
 * A different official who can sign at the institution confirms: the export
 * is collected, sealed and written to the backup target, the export is logged
 * in the access log and the audit chain.
 */
export async function confirmExport(proposal: string, actor: PortabilityActor, now = new Date(), target: BackupTarget = targetFromEnv()): Promise<ExportProposal | { error: string }> {
  lapsePortability(now);
  const p = portabilityDb().proposals.find(x => x.id === proposal);
  if (!p || p.state !== 'proposed') return fail('No export with that number is waiting (a proposal lapses after the waiting period)');
  const why = portabilityActorRefusal(actor, s => exportConfirmRefusal(s, p.institution));
  if (why) return fail(why);
  const dual = dualControlRefusal({ by: p.by, ...(p.byId ? { byId: p.byId } : {}) }, { by: actor.by, ...(actor.byId ? { byId: actor.byId } : {}) });
  if (dual) return fail(dual);
  const independence = independenceOf(p.byId, actor.byId);
  p.confirmed = { by: actor.by, ...(actor.byId ? { byId: actor.byId } : {}), at: now.toISOString(), independence };
  // The export itself is a read of every record it carries: in the access log before it is collected, so the export holds it.
  recordAccess({ ...(actor.scope ? accessBy({ ...(actor.byId ? { id: actor.byId } : {}), label: actor.by, ...(actor.institution ? { institution: actor.institution } : {}) }, now) : { by: { name: actor.by } }),
    record: { register: 'institution-export', id: p.id }, action: 'export', purpose: p.reason, result: 'allowed', rule: `Proposed by ${p.by}, confirmed by ${actor.by} (two officials)` }, now);
  try {
    const built = await buildExport(p, now);
    await target.put(`${p.id}.cvx`, built.archive);
    const rec: ExportRecord = {
      id: p.id, institution: p.institution, createdAt: now.toISOString(), archive: `${p.id}.cvx`, sizeBytes: built.archive.length, sha256: sha256(built.archive),
      keyProvider: peekArchive(built.archive, EXPORT_FORMAT).provider, digest: built.manifest.digest, parts: built.manifest.parts.length, counts: built.manifest.counts,
      installation: built.manifest.installation, target: target.kind,
    };
    await target.put(`${p.id}.json`, Buffer.from(JSON.stringify(rec, null, 2), 'utf8'));
    p.export = rec;
    p.state = 'confirmed';
    recordAudit(actor.by, 'institution.export', `InstitutionExport:${p.id}`, 'ok',
      `${built.manifest.institution.name} · proposed by ${p.by}, confirmed by ${actor.by} · ${independence} · ${rec.parts} parts · ${Object.entries(rec.counts).map(([k, n]) => `${k} ${n}`).join(', ')} · sha256 ${rec.sha256.slice(0, 16)}… · digest ${rec.digest.slice(0, 16)}… · ${target.kind}`.slice(0, 900));
    return structuredClone(p);
  } catch (e) {
    p.state = 'failed';
    p.problem = (e as Error).message.slice(0, 300);
    recordAudit(actor.by, 'institution.export', `InstitutionExport:${p.id}`, 'failed', p.problem);
    return fail(`The export could not be made: ${p.problem}`);
  }
}

/** Read a confirmed export's sealed archive back from the target (for download or import elsewhere). */
export async function exportArchive(id: string, target: BackupTarget = targetFromEnv()): Promise<{ record: ExportRecord; archive: Buffer } | { error: string }> {
  const p = portabilityDb().proposals.find(x => x.id === id);
  if (!p?.export) return fail('No confirmed export with that number');
  const archive = await target.get(p.export.archive);
  if (!archive) return fail(`The archive ${p.export.archive} is not at the backup target`);
  if (sha256(archive) !== p.export.sha256) return fail('The archive at the target does not match the SHA-256 recorded when it was made');
  return { record: structuredClone(p.export), archive };
}

// ── What goes in ───────────────────────────────────────────────────────────

/** The slots an institution acts for: named, or standing in provisionally (lib/nation/deployment.ts provisionalOwner()). */
export function actingSlots(institution: string): { slot: AuthorityKey; provisional: boolean }[] {
  return AUTHORITIES.map(a => ({ a, o: provisionalOwner(a.key, authorityFor) })).filter(x => x.o.institution === institution).map(x => ({ slot: x.a.key, provisional: !!x.o.provisional }));
}
const keeperOf = (authority: string) => (isAuthorityKey(authority) ? provisionalOwner(authority, authorityFor).institution : authority);

/** Every part of one institution's export, as JSON, from the stores that hold them (nothing of another institution). */
export function collectInstitution(institution: string, now = new Date()): { name: string; parts: { name: string; data: Buffer; records: number }[]; counts: Record<string, number>; audit: ExportManifest['audit']; accessLog: ExportManifest['accessLog'] } {
  const m = getMinistry(institution);
  if (!m) throw new Error(`No institution ${institution}`);
  const slots = actingSlots(institution);
  const keeps = (k: AuthorityKey) => slots.some(s => s.slot === k);
  const json = (v: unknown) => Buffer.from(JSON.stringify(v), 'utf8');
  const parts: { name: string; data: Buffer; records: number }[] = [];
  const add = (name: string, v: unknown, records: number) => parts.push({ name, data: json(v), records });

  const { basis, ...terms } = termsOf(m, now);
  add('institution.json', { id: m.id, slug: m.slug, name: m.name, archetype: m.archetype, status: m.status, standing: m.standing, departments: m.departments, createdAt: m.createdAt, terms, basis: basis ?? [], slots }, 1);

  // Registers it keeps.
  const types = registerTypes().filter(t => keeperOf(t.authority) === institution);
  const typeKeys = new Set(types.map(t => t.key));
  const orgs = organisationRecords().filter(o => o.standings.some(s => typeKeys.has(s.register))).map(o => ({
    id: o.id, number: o.number, createdAt: o.createdAt, facilities: o.facilities, ...(o.previousNumber ? { previousNumber: o.previousNumber } : {}), ...(o.sample ? { sample: true } : {}),
    // The organisation's identity only: never its representatives or address (the register that keeps it holds them).
    versions: o.versions.map(v => ({ n: v.n, name: v.name, kind: v.kind, ...(v.region ? { region: v.region } : {}), representatives: [], at: v.at, by: v.by, reason: v.reason, ...(v.case ? { case: v.case } : {}) })),
    standings: o.standings.filter(s => typeKeys.has(s.register)),
  }));
  add('registers/organisations.json', { types, organisations: orgs }, orgs.length);
  const prof = professionalRecords();
  const professions = prof.professions.filter(p => keeperOf(p.authority) === institution);
  const kept = new Set(professions.map(p => p.key));
  const people = prof.people.filter(e => kept.has(e.profession));
  add('registers/professions.json', { professions, people }, people.length);
  const products = keeps('medicinesRegulation') ? productRecords() : [];
  add('registers/products.json', products, products.length);
  const imports = keeps('medicinesRegulation') ? importRecords() : [];
  add('registers/medicine-imports.json', imports, imports.length);
  const controlled = keeps('controlledSubstances') ? controlledRecords() : [];
  add('registers/controlled-medicines.json', controlled, controlled.length);
  const orgNumbers = new Set(orgs.map(o => o.number));
  const capacity = keeps('healthRegulation') ? allCapacity().filter(r => orgNumbers.has(r.organisation)) : [];
  add('registers/health-capacity.json', capacity, capacity.length);

  // Procedures, cases, decisions, documents.
  const packages = listPackages().filter(p => ownerInstitution(p.owner, authorityFor) === institution);
  add('procedures.json', packages, packages.length);
  const cases = casesOf(institution);
  add('cases.json', cases, cases.length);
  const decisions = listDecisions().filter(x => x.content.institution.id === institution);
  add('decisions.json', decisions, decisions.length);
  const docs = portableDocuments(institution);
  if ('error' in docs) throw new Error(docs.error);
  add('documents.json', docs, docs.length);

  // The records it carries, as the audit chain and the access log name them.
  const exports = portabilityDb().proposals.filter(p => p.institution === institution).map(p => p.id);
  const resources = new Set<string>([
    `Ministry:${institution}`,
    ...cases.map(c => `Case:${c.ref}`), ...decisions.map(x => `Decision:${x.id}`), ...docs.map(x => `Document:${x.id}`),
    ...products.map(x => `Product:${x.number}`), ...imports.map(x => `ImportAuthorisation:${x.number}`), ...controlled.map(x => `ControlledAuthorisation:${x.number}`),
    ...people.map(x => `Professional:${x.number}`), ...professions.map(x => `Profession:${x.key}`), ...types.map(x => `RegisterType:${x.key}`),
    ...exports.map(x => `InstitutionExport:${x}`),
  ]);
  // Organisation entries only for what this institution recorded (capacity returns); the rest is the business register's.
  const ours = (e: { action: string; resource: string }) => resources.has(e.resource) || (e.action === 'health.capacity.record' && orgNumbers.has(e.resource.replace(/^Organisation:/, '')));
  const chain = listAudit().reverse();
  const items = chain.map(e => (ours(e) ? e : ({ seq: e.seq, prevHash: e.prevHash ?? null, hash: e.hash, ...(e.alg ? { alg: e.alg } : {}) } as AuditLink)));
  const head = chain.length ? { seq: chain[chain.length - 1]!.seq, hash: chain[chain.length - 1]!.hash } : null;
  const fullAudit = items.filter(e => 'action' in e).length;
  add('audit.json', { head, items }, fullAudit);

  const ids = new Set<string>([...cases.flatMap(c => [c.ref, c.id]), ...decisions.map(x => x.id), ...docs.map(x => x.id), ...products.map(x => x.number), ...imports.map(x => x.number), ...controlled.map(x => x.number), ...people.map(x => x.number), ...orgs.map(o => o.number), ...exports]);
  const log = accessLogChain();
  const access = log.entries.map(e => (e.by.institution === institution || (e.record.id && ids.has(e.record.id)) ? e : ({ seq: e.seq, prev: e.prev, hash: e.hash } as AccessLink)));
  const accessHead = log.entries.length ? { seq: log.entries[log.entries.length - 1]!.seq, hash: log.entries[log.entries.length - 1]!.hash } : null;
  const fullAccess = access.filter(e => 'action' in e).length;
  add('access-log.json', { base: log.base, head: accessHead, items: access }, fullAccess);

  const trust = trustList(now);
  add('trust-list.json', trust, trust.keys.length);
  const evidence = importedEvidence(institution);
  add('evidence/imported.json', evidence, evidence.length);

  const counts = { organisations: orgs.length, professionals: people.length, products: products.length, imports: imports.length, controlled: controlled.length, capacityReturns: capacity.length,
    procedures: packages.length, cases: cases.length, decisions: decisions.length, documents: docs.length, auditEntries: fullAudit, accessEntries: fullAccess, importedSegments: evidence.length };
  return { name: m.name, parts, counts, audit: { head, entries: items.length, full: fullAudit }, accessLog: { head: accessHead, entries: access.length, full: fullAccess } };
}

/** Collect and seal one institution's export. */
export async function buildExport(p: Pick<ExportProposal, 'id' | 'institution' | 'reason' | 'by' | 'confirmed'>, now = new Date()): Promise<{ archive: Buffer; manifest: ExportManifest }> {
  const c = collectInstitution(p.institution, now);
  const { archive, manifest } = await packExport({
    id: p.id, createdAt: now.toISOString(), kind: EXPORT_KIND, institution: { id: p.institution, name: c.name }, reason: p.reason,
    proposedBy: p.by, confirmedBy: p.confirmed?.by ?? '', independence: p.confirmed?.independence ?? 'unverified',
    installation: installationMode(), audit: c.audit, accessLog: c.accessLog, counts: c.counts, notIncluded: NOT_INCLUDED,
  }, c.parts);
  return { archive, manifest: manifest as ExportManifest };
}

/** Who acts in a portability route, from the verified official (lib/casework/actor.ts routeActor()): without one (sign-in not enforced) a declared name, refused in production. */
export function portabilityActorOf(a: { id?: string; name: string; scope: (Scope & { id?: string }) | null }): PortabilityActor {
  return { by: a.name, ...(a.id ? { byId: a.id } : {}), scope: a.scope, label: a.name, ...(a.scope?.institution ? { institution: a.scope.institution } : {}) };
}

/** Plain words for where an export was taken (a demo or training export holds sample records). */
export const installationLabel = (mode: string) => MODE_LABEL[mode as keyof typeof MODE_LABEL] ?? mode;
