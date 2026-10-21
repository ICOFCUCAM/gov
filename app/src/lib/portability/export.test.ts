// An institution's portable export (Health I4 standalone-and-pilot; spec
// Part 5 L 2, 8, 9; acceptance P4-13, P5-02, P5-08, P5-09, P6-06, P6-16):
// two institutions keep records in one installation; the health regulator's
// export carries its own and nothing of the other's, is sealed through key
// custody, verifies with no running server, is proposed and confirmed by two
// officials of that institution (never set going from whole-government scope
// for an independent institution), and goes back into an empty installation
// with every record identifier unchanged, verifying again there.
import { asNationSets } from '@/lib/casework/testkit';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

vi.mock('@/lib/data/facilities', () => ({ getFacility: (id: string) => (id === 'site-ward-a' ? { id, state: 'published' } : undefined) }));

const { openCase, act, attach, resetCases, registeredEffects, getCase } = await import('@/lib/casework/engine');
const { draftPackage, approvePackage, resetPackages } = await import('@/lib/casework/packages');
const { addDocument, resetDocuments, getDocument } = await import('@/lib/records/documents');
const { resetDecisions, getDecision } = await import('@/lib/records/decisions');
const { resetCertificates } = await import('@/lib/records/certificates');
const { resetAccessLog, listAccess } = await import('@/lib/records/access-log');
const { setSovereign, listAudit } = await import('@/lib/data/store');
const { resetOrganisations, createOrganisation, getOrganisation } = await import('@/lib/organisations/register');
const { resetProfessions, getProfessional } = await import('@/lib/professions/register');
const { resetHealth } = await import('@/lib/health/register');
const { resetSealKeys } = await import('@/lib/keys/seal-register');
const { useTarget, dirTarget } = await import('@/lib/backup/target');
const { openExport } = await import('@/lib/backup/archive');
const { HEALTH_PROCEDURES } = await import('@/lib/health/procedures');
const { PROFESSION_PROCEDURES } = await import('@/lib/professions/procedures');
const { proposeExport, confirmExport, withdrawExport, exportArchive, resetPortability } = await import('./export');
const { verifyInstitutionExport } = await import('./verify');
const { proposeImport, confirmImport } = await import('./import');
const { resetImportedEvidence, importedEvidence } = await import('./evidence');
type Actor = import('@/lib/casework/engine').Actor;
type Scope = import('@/lib/auth/roles').Scope;

const HEALTH = 'min-health', OTHER = 'min-labour';
const KEK = Buffer.alloc(32, 7).toString('base64');
/** Where the test leaves its export, for the offline verifier script (app/scripts/verify-institution-export.mjs). */
export const SAMPLE_DIR = join(tmpdir(), 'civicos-institution-export-test');
const dir = join(tmpdir(), `civicos-export-${process.pid}`);
const at = (inst: string) => (id: string, role: 'officer' | 'signatory' = 'officer'): Actor => ({ id, name: `Official ${id}`, scope: { id, role, institution: inst } });
const hr = at(HEALTH), other = at(OTHER);
const pdf = new Uint8Array(Buffer.from('%PDF-1.7\nfacility evidence\n%%EOF'));
const official = (id: string, role: Scope['role'], institution?: string, bounds?: Scope['bounds']) => ({ by: `Official ${id}`, byId: id, scope: { role, ...(institution ? { institution } : {}), ...(bounds ? { bounds } : {}) }, ...(institution ? { institution } : {}) });
async function step(id: string, action: string, who: Actor, extra: Record<string, unknown> = {}) { const r = await act(id, { action, ...extra }, who); if ('error' in r) throw new Error(`${action}: ${r.error}`); return r; }
const resetAll = () => { for (const r of [resetCases, resetPackages, resetDocuments, resetDecisions, resetCertificates, resetOrganisations, resetProfessions, resetHealth, resetAccessLog, resetPortability, resetImportedEvidence]) r(); };
const chain = () => (globalThis as unknown as { __civicos: { audit: unknown[] } }).__civicos.audit;

function approveAll(list: { key: string }[]) {
  for (const p of list) {
    const d = draftPackage(asNationSets(p as never), 'Author', 'author', registeredEffects()); if ('error' in d) throw new Error(`${p.key}: ${d.error}`);
    const a = approvePackage(p.key, 1, 'Approver', 'approver', '2026-01-01', registeredEffects(), new Date('2026-01-01')); if ('error' in a) throw new Error(`${p.key}: ${a.error}`);
  }
}

/** The health regulator licenses a clinic; another institution registers a nurse. */
async function seedTwoInstitutions() {
  const o = createOrganisation({ name: 'Riverside Clinic', kind: 'clinic', representative: { name: 'REPRESENTATIVE-PERSONAL', role: 'director' } }, 'c', 'Registrar') as { id: string; number: string };
  const c = openCase({ procedure: 'health.facility', fields: { organisation: o.number, campuses: 'site-ward-a' } }, hr('clerk')) as { id: string; ref: string };
  for (const cls of ['premises-evidence', 'fee-receipt']) { const d = addDocument({ class: cls, title: cls, institution: HEALTH, belongsTo: { kind: 'case', id: c.id }, bytes: pdf }, 'Clerk') as { id: string }; attach(c.id, d.id, hr('clerk')); }
  await step(c.id, 'check', hr('clerk'));
  await step(c.id, 'inspect', hr('clerk'));
  const rep = addDocument({ class: 'inspection-report', title: 'Inspection', institution: HEALTH, belongsTo: { kind: 'case', id: c.id }, bytes: pdf }, 'Clerk') as { id: string };
  attach(c.id, rep.id, hr('clerk'));
  await step(c.id, 'inspected', hr('clerk'));
  await step(c.id, 'grant', hr('s1', 'signatory'), { reason: 'Meets the standards' });
  const granted = await step(c.id, 'grant', hr('s2', 'signatory'));
  // The other institution's work in the same installation.
  const n = openCase({ procedure: 'prof.registration', fields: { profession: 'nurse', personRef: 'BR-1999-000044', name: 'OTHER-INSTITUTION-PERSON', qualifications: 'Diploma (as stated)', validUntil: '2030-12-31' } }, other('clerk')) as { id: string; ref: string };
  for (const cls of ['qualification-evidence', 'identity-evidence']) { const d = addDocument({ class: cls, title: cls, institution: OTHER, belongsTo: { kind: 'case', id: n.id }, bytes: pdf }, 'Clerk') as { id: string }; attach(n.id, d.id, other('clerk')); }
  await step(n.id, 'check', other('clerk'));
  await step(n.id, 'verify', other('clerk'));
  await step(n.id, 'register', other('s1', 'signatory'), { reason: 'Qualified' });
  const nurse = await step(n.id, 'register', other('s2', 'signatory'));
  return { org: o, facilityCase: c, decision: granted.decision!, nurseCase: n, nurseDecision: nurse.decision! };
}

describe('an institution\'s portable export', () => {
  beforeEach(() => {
    resetAll();
    resetSealKeys();
    vi.stubEnv('CIVICOS_DATA_KEK', KEK);
    rmSync(dir, { recursive: true, force: true });
    useTarget(dirTarget(dir));
    setSovereign({ deployment: { authorities: { healthRegulation: HEALTH, professionalRegulation: OTHER } } }, 'Administrator');
    approveAll([...HEALTH_PROCEDURES, ...PROFESSION_PROCEDURES]);
  });
  afterEach(() => { useTarget(null); vi.unstubAllEnvs(); rmSync(dir, { recursive: true, force: true }); });

  it('carries the institution\'s own records and nothing of another\'s, sealed, and verifies with no running server', async () => {
    const s = await seedTwoInstitutions();
    const p = proposeExport({ institution: HEALTH, reason: 'Moving to the regulator\'s own host' }, official('a1', 'administrator', HEALTH));
    if ('error' in p) throw new Error(p.error);
    const done = await confirmExport(p.id, official('s9', 'signatory', HEALTH));
    if ('error' in done) throw new Error(done.error);
    expect(done).toMatchObject({ state: 'confirmed', export: { counts: expect.objectContaining({ cases: 1, decisions: 1, documents: 3, organisations: 1, professionals: 0 }) } });
    const got = await exportArchive(p.id);
    if ('error' in got) throw new Error(got.error);
    // Never plaintext: no record content is readable in the archive.
    for (const secret of ['Riverside Clinic', s.facilityCase.ref, 'Meets the standards', '%PDF']) expect(got.archive.includes(Buffer.from(secret))).toBe(false);

    const { manifest, parts } = await openExport<import('./export').ExportManifest>(got.archive);
    const all = [...parts.values()].map(b => b.toString('utf8')).join('\n');
    // Its own records, with their ids…
    expect(all).toContain(s.facilityCase.id);
    expect(all).toContain(s.decision.id);
    expect(all).toContain('Riverside Clinic');
    // …and nothing of the other institution's: its case, decision, documents, register entry or person.
    for (const theirs of [s.nurseCase.id, s.nurseCase.ref, s.nurseDecision.id, 'OTHER-INSTITUTION-PERSON', OTHER === manifest.institution.id ? 'never' : `"owner":"${OTHER}"`]) expect(all).not.toContain(theirs);
    // Nor the organisation's representatives, which the business register keeps.
    expect(all).not.toContain('REPRESENTATIVE-PERSONAL');
    // The audit chain is carried whole, but the other institution's entries only as links (sequence and hashes).
    const audit = JSON.parse(parts.get('audit.json')!.toString()) as { items: { action?: string; resource?: string }[] };
    expect(audit.items.length).toBe(listAudit().filter(e => e.seq <= manifest.audit.head!.seq).length);
    expect(audit.items.some(e => e.resource === `Case:${s.nurseCase.ref}`)).toBe(false);
    expect(audit.items.some(e => e.resource === `Decision:${s.decision.id}` && e.action === 'decision.seal')).toBe(true);

    const report = await verifyInstitutionExport(got.archive);
    expect(report.problems).toEqual([]);
    expect(report).toMatchObject({ ok: true, institution: { id: HEALTH } });
    expect(report.decisions).toEqual([expect.objectContaining({ id: s.decision.id, ok: true, timeFrom: 'audit-chain' })]);
    // The export is itself in the access log and the audit chain.
    expect(listAccess({ register: 'institution-export' })).toEqual([expect.objectContaining({ action: 'export', record: { register: 'institution-export', id: p.id } })]);
    expect(listAudit().find(e => e.action === 'institution.export')).toMatchObject({ outcome: 'ok', resource: `InstitutionExport:${p.id}` });

    // A changed byte, or the wrong key, never verifies.
    const bad = Buffer.from(got.archive); bad.writeUInt8(bad.readUInt8(bad.length - 5) ^ 1, bad.length - 5);
    expect((await verifyInstitutionExport(bad)).ok).toBe(false);
    vi.stubEnv('CIVICOS_DATA_KEK', Buffer.alloc(32, 9).toString('base64'));
    expect((await verifyInstitutionExport(got.archive)).problems[0] ?? '').toMatch(/does not open/);
    vi.stubEnv('CIVICOS_DATA_KEK', KEK);
    // Kept for the offline verifier (app/scripts/verify-institution-export.mjs).
    mkdirSync(SAMPLE_DIR, { recursive: true });
    writeFileSync(join(SAMPLE_DIR, `${p.id}.cvx`), got.archive);
    writeFileSync(join(SAMPLE_DIR, 'latest.txt'), `${p.id}.cvx\n`);
  });

  it('is proposed by an administrator of the institution and confirmed by a different official who can sign there; never from whole-government scope for an independent institution', async () => {
    await seedTwoInstitutions();
    // Not an administrator; another institution's administrator.
    expect(proposeExport({ institution: HEALTH, reason: 'r' }, official('o1', 'officer', HEALTH))).toMatchObject({ error: /Only an administrator/ });
    expect(proposeExport({ institution: HEALTH, reason: 'r' }, official('a2', 'administrator', OTHER))).toMatchObject({ error: /only for your own institution/ });
    // An independent institution: whole-government scope does not reach it.
    const bounds = { independent: [HEALTH], judicial: [] };
    expect(proposeExport({ institution: HEALTH, reason: 'r' }, official('g1', 'administrator', undefined, bounds))).toMatchObject({ error: /independent: only its own administrators/ });
    // Its own administrator proposes; the same person, an officer, or another institution's signatory cannot confirm.
    const p = proposeExport({ institution: HEALTH, reason: 'Federating with the national installation' }, official('a1', 'administrator', HEALTH, bounds));
    if ('error' in p) throw new Error(p.error);
    expect(proposeExport({ institution: HEALTH, reason: 'again' }, official('a1', 'administrator', HEALTH, bounds))).toMatchObject({ error: /already waiting/ });
    expect(await confirmExport(p.id, official('a1', 'signatory', HEALTH, bounds))).toMatchObject({ error: /second, different official/ });
    expect(await confirmExport(p.id, official('o2', 'officer', HEALTH, bounds))).toMatchObject({ error: /can sign at the institution/ });
    expect(await confirmExport(p.id, official('s5', 'signatory', OTHER, bounds))).toMatchObject({ error: /Only an official who can sign at this institution/ });
    expect(await confirmExport(p.id, official('g2', 'signatory', undefined, bounds))).toMatchObject({ error: /Only an official who can sign at this institution/ });
    // Withdrawn proposals are kept; a lapsed one cannot be confirmed.
    expect(withdrawExport(p.id, official('a1', 'administrator', HEALTH, bounds))).toMatchObject({ state: 'withdrawn' });
    const q = proposeExport({ institution: HEALTH, reason: 'Later' }, official('a1', 'administrator', HEALTH, bounds));
    if ('error' in q) throw new Error(q.error);
    expect(await confirmExport(q.id, official('s9', 'signatory', HEALTH, bounds), new Date(Date.now() + 49 * 3_600_000))).toMatchObject({ error: /lapses/ });
    expect(listAudit().filter(e => e.resource.startsWith('InstitutionExport:')).map(e => e.action)).toEqual(expect.arrayContaining(['institution.export.propose', 'institution.export.withdraw', 'institution.export.lapse']));
    // The API path rule refuses it before the route for whole-government scope at an independent institution; the import is the whole government's administrators' only.
    const { apiPermission } = await import('@/lib/auth/roles');
    expect(apiPermission({ role: 'administrator', bounds }, 'POST', `/api/org/ministries/${HEALTH}/export`)).toMatch(/independent/);
    expect(apiPermission({ role: 'administrator', institution: HEALTH, bounds }, 'POST', `/api/org/ministries/${HEALTH}/export`)).toBeNull();
    expect(apiPermission({ role: 'signatory', institution: HEALTH }, 'POST', '/api/platform/institution-import')).toMatch(/administrator/);
  });

  it('goes back into an empty installation with every record identifier unchanged, and verifies there', async () => {
    const s = await seedTwoInstitutions();
    const p = proposeExport({ institution: HEALTH, reason: 'Moving host' }, official('a1', 'administrator', HEALTH));
    if ('error' in p) throw new Error(p.error);
    await confirmExport(p.id, official('s9', 'signatory', HEALTH));
    const got = await exportArchive(p.id);
    if ('error' in got) throw new Error(got.error);
    const before = { facilityCase: getCase(s.facilityCase.id)!, decision: getDecision(s.decision.id)!, org: getOrganisation(s.org.number)! };

    // A new, empty installation (same key custody): no cases, records, audit chain, access log or seal keys.
    resetAll(); resetSealKeys();
    chain().length = 0;
    setSovereign({ deployment: { authorities: { healthRegulation: HEALTH } } }, 'Administrator');
    const imp = await proposeImport(got.archive, official('n1', 'administrator'));
    if ('error' in imp) throw new Error(imp.error);
    expect(imp.report.ok).toBe(true);
    expect(await confirmImport(imp.proposal.id, official('n1', 'administrator'))).toMatchObject({ error: /second, different official/ });
    const done = await confirmImport(imp.proposal.id, official('n2', 'administrator'));
    if ('error' in done) throw new Error(done.error);
    expect(done.restored).toMatchObject({ cases: 1, decisions: 1, documents: 3, organisations: 1, procedures: HEALTH_PROCEDURES.length });

    // The same ids, references, numbers and seals.
    expect(getCase(s.facilityCase.id)).toMatchObject({ id: before.facilityCase.id, ref: before.facilityCase.ref, stage: before.facilityCase.stage, history: before.facilityCase.history });
    expect(getDecision(s.decision.id)).toEqual(before.decision);
    expect(getOrganisation(s.org.number)).toMatchObject({ id: before.org.id, number: before.org.number, standings: before.org.standings });
    for (const d of before.facilityCase.documents) expect(getDocument(d)).toMatchObject({ id: d, institution: HEALTH });
    expect(getProfessional(s.nurseCase.id)).toBeUndefined();
    expect(importedEvidence(HEALTH)).toHaveLength(1);
    // Importing it again changes nothing: every record is already here.
    expect(await proposeImport(got.archive, official('n1', 'administrator'))).toMatchObject({ error: /already in this installation/ });

    // Exported again from here, it verifies: the decision against the evidence it brought.
    const again = proposeExport({ institution: HEALTH, reason: 'Federating later' }, official('h1', 'administrator', HEALTH));
    if ('error' in again) throw new Error(again.error);
    const second = await confirmExport(again.id, official('h2', 'signatory', HEALTH));
    if ('error' in second) throw new Error(second.error);
    const arc = await exportArchive(again.id);
    if ('error' in arc) throw new Error(arc.error);
    const report = await verifyInstitutionExport(arc.archive);
    expect(report.problems).toEqual([]);
    expect(report.decisions).toEqual([expect.objectContaining({ id: s.decision.id, ok: true, timeFrom: 'audit-chain' })]);
  });
});
