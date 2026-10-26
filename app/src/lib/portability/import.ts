// Importing an institution's own export into another installation (spec
// Part 5 L 2 "a later federation can be enabled without changing the original
// institution or record identifiers"; Health I4 standalone-and-pilot): the
// way an institution moves host, or a standalone Institutional Edition is
// brought into a national installation later.
//
// An administrator serving the whole government uploads the sealed export and
// proposes the import; the export must verify first (lib/portability/verify.ts)
// and none of its records may already be here (an import never overwrites or
// merges into a record). A different such official confirms it within the
// waiting period. Then every record goes in with its own id, number and
// history: cases, sealed decisions (never re-sealed), documents (each version
// sealed again under this installation's key after its SHA-256 is checked),
// the register records, the procedure versions and the institution's registry
// record. The export's audit and access-log segments and its trust list are
// kept as evidence (lib/portability/evidence.ts) so the decisions still
// verify, and travel on with a later export. Who is responsible, the
// institution's standing and the authority mappings are not taken from the
// export: this installation decides them through its own change process
// (since plan I9 the export carries them in configuration.json, kept here as
// evidence only). Certificates of its decisions come with their codes.
//
// The only file allowed to call the register modules' restore functions
// (lib/casework/register-writes.test.ts lists it with this reason).

import { recordAudit } from '@/lib/data/store/audit';
import { adoptInstitution, getMinistry } from '@/lib/data/store/ministries';
import { dualControlRefusal, independenceOf, dualControlPendingHours } from '@/lib/data/dual-control';
import { installationAdmin } from '@/lib/auth/roles';
import { installationMode } from '@/lib/ops/mode';
import { openExport, sha256 } from '@/lib/backup/archive';
import { targetFromEnv, type BackupTarget } from '@/lib/backup/target';
import { getCase, restoreCases } from '@/lib/casework/engine';
import { restorePackages } from '@/lib/casework/packages';
import { getDecision, restoreDecisions, type SignedDecision } from '@/lib/records/decisions';
import { restoreDocuments, type PortableDocument } from '@/lib/records/documents';
import { restoreCertificates, getCertificate, type Certificate } from '@/lib/records/certificates';
import { getOrganisation, organisationsDb, type Organisation, type RegisterType } from '@/lib/organisations/register';
import { getProfessional, restoreProfessionals, type Professional, type Profession } from '@/lib/professions/register';
import { getProduct, restoreProducts, type ProductEntry } from '@/lib/health/products/register';
import { getImportAuthorisation, restoreImports, type ImportAuthorisation } from '@/lib/health/products/imports';
import { getControlledAuthorisation, restoreControlled, type ControlledAuthorisation } from '@/lib/health/products/controlled';
import { restoreCapacity, type CapacityReturn } from '@/lib/health/register';
import { restoreRecordkeeping, recordkeepingConflicts, type recordkeepingOf } from '@/lib/recordkeeping/register';
import { restoreSecurityRecords, securityRecordRaw, type SecurityRecord } from '@/lib/security/register';
import { raiseCounter } from '@/lib/data/numbering';
import { verifyExportParts, type ExportReport } from './verify';
import { keepEvidence, type EvidenceSegment, type TrustListCopy } from './evidence';
import { portabilityDb, portabilityActorRefusal, lapsePortability, newPortabilityId, type ExportManifest, type ImportProposal, type PortabilityActor, type PortableConfiguration } from './export';
import type { Case, CasePackage } from '@/lib/casework/types';
import type { ArchetypeKey } from '@/lib/api/types';

const fail = (error: string) => ({ error });
type Parts = Map<string, Buffer>;
const read = <T,>(parts: Parts, name: string): T => JSON.parse(parts.get(name)!.toString('utf8')) as T;

/** The records of an export that are already in this installation (an import never overwrites one). */
function clashes(parts: Parts): string[] {
  const out: string[] = [];
  for (const c of read<Case[]>(parts, 'cases.json')) if (getCase(c.id) || getCase(c.ref)) out.push(`case ${c.ref}`);
  for (const d of read<SignedDecision[]>(parts, 'decisions.json')) if (getDecision(d.id)) out.push(`decision ${d.id}`);
  const orgs = read<{ organisations: Organisation[] }>(parts, 'registers/organisations.json').organisations;
  for (const o of orgs) { const here = getOrganisation(o.number); if (here && here.id !== o.id) out.push(`organisation ${o.number} (another record here)`); if (here?.standings.some(s => o.standings.some(x => x.register === s.register))) out.push(`organisation ${o.number}'s standing`); }
  for (const e of read<{ people: Professional[] }>(parts, 'registers/professions.json').people) if (getProfessional(e.number) || getProfessional(e.id)) out.push(`registration ${e.number}`);
  for (const p of read<ProductEntry[]>(parts, 'registers/products.json')) if (getProduct(p.number) || getProduct(p.id)) out.push(`product ${p.number}`);
  for (const a of read<ImportAuthorisation[]>(parts, 'registers/medicine-imports.json')) if (getImportAuthorisation(a.number)) out.push(`import authorisation ${a.number}`);
  for (const a of read<ControlledAuthorisation[]>(parts, 'registers/controlled-medicines.json')) if (getControlledAuthorisation(a.number)) out.push(`controlled-medicine authorisation ${a.number}`);
  if (parts.has('verification.json')) for (const c of read<{ certificates: Certificate[] }>(parts, 'verification.json').certificates) if (getCertificate(c.id)) out.push(`certificate ${c.id}`);
  // Plan I9: records management (exports taken before I9 carry none).
  if (parts.has('registers/records-management.json')) out.push(...recordkeepingConflicts(read<ReturnType<typeof recordkeepingOf>>(parts, 'registers/records-management.json')));
  if (parts.has('registers/security.json')) for (const r of read<{ records: SecurityRecord[] }>(parts, 'registers/security.json').records) if (securityRecordRaw(r.number)) out.push(`security record ${r.number}`);
  return out;
}

async function openChecked(archive: Buffer): Promise<{ manifest: ExportManifest; parts: Parts; report: ExportReport } | { error: string }> {
  let o: { manifest: ExportManifest; parts: Parts };
  try { o = await openExport<ExportManifest>(archive); } catch (e) { return fail(`The export does not open: ${(e as Error).message}`); }
  const report = verifyExportParts(o.manifest, o.parts);
  if (!report.ok) return fail(`The export does not verify: ${report.problems.slice(0, 3).join('; ')}`);
  // A production installation takes in no demonstration or training records (as a restore refuses their backups).
  if (installationMode() === 'production' && o.manifest.installation !== 'production') return fail(`This export was taken in a ${o.manifest.installation} installation: a production installation takes in no sample records`);
  const c = clashes(o.parts);
  if (c.length) return fail(`These records are already in this installation, so nothing is imported: ${c.slice(0, 5).join(', ')}${c.length > 5 ? ` and ${c.length - 5} more` : ''}`);
  return { ...o, report };
}

/** The import proposals, newest first. */
export function listImports(): ImportProposal[] {
  lapsePortability();
  return portabilityDb().imports.map(p => structuredClone(p)).reverse();
}

/** Propose importing an export (uploaded archive): it must verify and hold nothing already here. */
export async function proposeImport(archive: Buffer, actor: PortabilityActor, now = new Date(), target: BackupTarget = targetFromEnv()): Promise<{ proposal: ImportProposal; report: ExportReport } | { error: string }> {
  lapsePortability(now);
  const why = portabilityActorRefusal(actor, installationAdmin);
  if (why) return fail(why);
  if (!archive.length || archive.length > 512 * 1024 ** 2) return fail('Upload the sealed export (.cvx), up to 512 MB');
  const o = await openChecked(archive);
  if ('error' in o) return o;
  const d = portabilityDb();
  if (d.imports.some(p => p.state === 'proposed' && p.digest === o.manifest.digest)) return fail('An import of this export is already waiting for a second official');
  const id = newPortabilityId('IMP', now);
  await target.put(`${id}.cvx`, archive);
  const p: ImportProposal = {
    id, exportId: o.manifest.id, institution: o.manifest.institution.id, institutionName: o.manifest.institution.name, digest: o.manifest.digest, archive: `${id}.cvx`, sizeBytes: archive.length,
    by: actor.by, ...(actor.byId ? { byId: actor.byId } : {}), at: now.toISOString(), expiresAt: new Date(now.getTime() + dualControlPendingHours() * 3_600_000).toISOString(), state: 'proposed',
  };
  d.imports.push(p);
  recordAudit(actor.by, 'institution.import.propose', `InstitutionImport:${id}`, 'ok', `${p.institutionName} from export ${p.exportId} · digest ${p.digest.slice(0, 16)}… · verified · awaiting a second official`);
  return { proposal: structuredClone(p), report: o.report };
}

export function withdrawImport(id: string, actor: PortabilityActor, reason?: string): ImportProposal | { error: string } {
  const p = portabilityDb().imports.find(x => x.id === id);
  if (!p || p.state !== 'proposed') return fail('No import with that number is waiting');
  const why = portabilityActorRefusal(actor, installationAdmin);
  if (why) return fail(why);
  p.state = 'withdrawn';
  p.withdrawn = { by: actor.by, at: new Date().toISOString(), ...(reason ? { reason: reason.slice(0, 300) } : {}) };
  recordAudit(actor.by, 'institution.import.withdraw', `InstitutionImport:${id}`, 'ok', reason?.slice(0, 200) || 'Withdrawn');
  return structuredClone(p);
}

/** A different official confirms: the export is read back, verified again and every record goes in with its own identity. */
export async function confirmImport(id: string, actor: PortabilityActor, now = new Date(), target: BackupTarget = targetFromEnv()): Promise<ImportProposal | { error: string }> {
  lapsePortability(now);
  const p = portabilityDb().imports.find(x => x.id === id);
  if (!p || p.state !== 'proposed') return fail('No import with that number is waiting (a proposal lapses after the waiting period)');
  const why = portabilityActorRefusal(actor, installationAdmin);
  if (why) return fail(why);
  const dual = dualControlRefusal({ by: p.by, ...(p.byId ? { byId: p.byId } : {}) }, { by: actor.by, ...(actor.byId ? { byId: actor.byId } : {}) });
  if (dual) return fail(dual);
  const archive = await target.get(p.archive);
  if (!archive) return fail(`The uploaded export ${p.archive} is not at the backup target`);
  const o = await openChecked(archive);
  if ('error' in o) { p.state = 'failed'; p.problem = o.error.slice(0, 300); recordAudit(actor.by, 'institution.import', `InstitutionImport:${id}`, 'failed', p.problem); return o; }
  if (o.manifest.digest !== p.digest) return fail('The uploaded export changed since it was proposed');
  const applied = apply(o.manifest, o.parts, actor.by);
  if ('error' in applied) { p.state = 'failed'; p.problem = applied.error.slice(0, 300); recordAudit(actor.by, 'institution.import', `InstitutionImport:${id}`, 'failed', p.problem); return applied; }
  const restored = applied.counts;
  const independence = independenceOf(p.byId, actor.byId);
  p.confirmed = { by: actor.by, ...(actor.byId ? { byId: actor.byId } : {}), at: now.toISOString(), independence };
  p.state = 'confirmed';
  p.restored = restored;
  recordAudit(actor.by, 'institution.import', `InstitutionImport:${id}`, 'ok',
    `${p.institutionName} from export ${p.exportId} · proposed by ${p.by}, confirmed by ${actor.by} · ${independence} · ${Object.entries(restored).map(([k, n]) => `${k} ${n}`).join(', ')} · archive sha256 ${sha256(archive).slice(0, 16)}… · digest ${p.digest.slice(0, 16)}… · record ids kept`.slice(0, 900));
  return structuredClone(p);
}

/** Put every record in, keeping its identity. Everything was checked for clashes first. */
function apply(manifest: ExportManifest, parts: Parts, by: string): { counts: Record<string, number> } | { error: string } {
  const inst = read<{ id: string; slug: string; name: string; archetype: ArchetypeKey; departments: { id: string; name: string }[]; createdAt: string }>(parts, 'institution.json');
  if (!getMinistry(inst.id)) { const m = adoptInstitution(inst, by); if ('error' in m) return m; }
  const out: Record<string, number> = {};
  const step = (k: string, r: { restored: number } | { error: string }): string | null => { if ('error' in r) return r.error; out[k] = r.restored; return null; };

  // The organisations register: the organisation's identity and its standings in this institution's registers.
  const { types, organisations } = read<{ types: RegisterType[]; organisations: Organisation[] }>(parts, 'registers/organisations.json');
  const odb = organisationsDb();
  for (const t of types) if (!t.reference && !odb.types.some(x => x.key === t.key)) odb.types.push(structuredClone(t));
  for (const o of organisations) {
    const here = odb.orgs.find(x => x.id === o.id);
    if (here) here.standings.push(...structuredClone(o.standings));
    else odb.orgs.push(structuredClone(o));
  }
  raiseCounter(odb as unknown as Record<string, unknown>, 'orgSeq', organisations.map(o => o.number));
  out.organisations = organisations.length;
  const errs = [
    step('professionals', restoreProfessionals(read<{ professions: Profession[]; people: Professional[] }>(parts, 'registers/professions.json'))),
    step('products', restoreProducts(read<ProductEntry[]>(parts, 'registers/products.json'))),
    step('imports', restoreImports(read<ImportAuthorisation[]>(parts, 'registers/medicine-imports.json'))),
    step('controlled', restoreControlled(read<ControlledAuthorisation[]>(parts, 'registers/controlled-medicines.json'))),
    step('capacityReturns', restoreCapacity(read<CapacityReturn[]>(parts, 'registers/health-capacity.json'))),
    step('procedures', restorePackages(read<CasePackage[]>(parts, 'procedures.json'))),
    step('cases', restoreCases(read<Case[]>(parts, 'cases.json'))),
    step('decisions', restoreDecisions(read<SignedDecision[]>(parts, 'decisions.json'))),
    step('documents', restoreDocuments(read<PortableDocument[]>(parts, 'documents.json'))),
    // Plan I9: certificates of its decisions, with their codes, so they verify here (exports taken before I9 carry none).
    parts.has('verification.json') ? step('certificates', restoreCertificates(read<{ certificates: Certificate[] }>(parts, 'verification.json').certificates)) : null,
  ].filter((e): e is string => !!e);
  if (errs.length) return fail(errs.join('; '));
  // Plan I9: records management, each migration with its per-record manifest and verification history.
  if (parts.has('registers/records-management.json')) out.recordsManagement = restoreRecordkeeping(read<ReturnType<typeof recordkeepingOf>>(parts, 'registers/records-management.json'));
  if (parts.has('registers/security.json')) { const e = step('securityRecords', restoreSecurityRecords(read<{ records: SecurityRecord[] }>(parts, 'registers/security.json').records)); if (e) return fail(e); }

  // The evidence the records verify against, as exported, and what it carried from before.
  const audit = read<EvidenceSegment['audit']>(parts, 'audit.json');
  const access = read<EvidenceSegment['accessLog'] & { head?: unknown }>(parts, 'access-log.json');
  const carried = read<EvidenceSegment[]>(parts, 'evidence/imported.json');
  keepEvidence([...carried, {
    export: manifest.id, digest: manifest.digest, institution: manifest.institution.id, createdAt: manifest.createdAt,
    audit: { head: audit.head, items: audit.items }, accessLog: { base: access.base, items: access.items }, trustList: read<TrustListCopy>(parts, 'trust-list.json'),
    // Plan I9: the configuration it rested on, kept as evidence and never adopted here.
    ...(parts.has('configuration.json') ? { configuration: read<PortableConfiguration>(parts, 'configuration.json') } : {}),
  }]);
  out.evidenceSegments = carried.length + 1;
  return { counts: out };
}
