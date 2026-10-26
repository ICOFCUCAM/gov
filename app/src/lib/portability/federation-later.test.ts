// A federation enabled later (plan I9; specification Part 5 L test 2, G
// "Portable record package"; acceptance P5-02, P5-08): an institution runs in
// one installation, exports its records with the configuration they rest on
// and the material its certificates verify with, moves into a clean
// installation with every identifier unchanged, and is federated there
// afterwards: another institution trusts its key (two officials), an exchange
// relationship is recorded, and an envelope it signed about a decision taken
// before the move is accepted, its aggregate reference resolving to the same
// decision. Nothing is adopted from the export's configuration.
import { asNationSets } from '@/lib/casework/testkit';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

vi.mock('@/lib/data/facilities', () => ({ getFacility: (id: string) => (id === 'site-ward-a' ? { id, state: 'published' } : undefined) }));

const { openCase, act, attach, resetCases, registeredEffects, getCase } = await import('@/lib/casework/engine');
const { draftPackage, approvePackage, resetPackages } = await import('@/lib/casework/packages');
const { addDocument, resetDocuments } = await import('@/lib/records/documents');
const { resetDecisions, getDecision } = await import('@/lib/records/decisions');
const { resetCertificates, issueCertificate, checkCode } = await import('@/lib/records/certificates');
const { resetAccessLog } = await import('@/lib/records/access-log');
const { setSovereign, createMinistry } = await import('@/lib/data/store');
const { resetOrganisations, createOrganisation } = await import('@/lib/organisations/register');
const { resetProfessions } = await import('@/lib/professions/register');
const { resetHealth } = await import('@/lib/health/register');
const { resetSealKeys } = await import('@/lib/keys/seal-register');
const { useTarget, dirTarget } = await import('@/lib/backup/target');
const { openExport } = await import('@/lib/backup/archive');
const { HEALTH_PROCEDURES } = await import('@/lib/health/procedures');
const { recordVersion: recordLaw, confirmVersion: confirmLaw, resetLaw } = await import('@/lib/law/register');
const { proposeRelationship, confirmRelationship, resetRelationships, listRelationships } = await import('@/lib/data/store/relationships');
const { resetInstitutionKeys, institutionPublicKey } = await import('@/lib/federation/keys');
const { proposePeerKey, confirmPeerKey, publishEvent, receiveEnvelope, resetFederationEvents } = await import('@/lib/federation/events');
const { proposeExport, confirmExport, exportArchive, resetPortability } = await import('./export');
const { verifyInstitutionExport } = await import('./verify');
const { proposeImport, confirmImport } = await import('./import');
const { resetImportedEvidence, importedEvidence } = await import('./evidence');
type Actor = import('@/lib/casework/engine').Actor;

const HEALTH = 'min-health';
const KEK = Buffer.alloc(32, 5).toString('base64');
const dir = join(tmpdir(), `civicos-federate-later-${process.pid}`);
const hr = (id: string, role: 'officer' | 'signatory' = 'officer'): Actor => ({ id, name: `Official ${id}`, scope: { id, role, institution: HEALTH } });
const official = (id: string, role: 'administrator' | 'signatory', institution?: string) => ({ by: `Official ${id}`, byId: id, scope: { role, ...(institution ? { institution } : {}) }, ...(institution ? { institution } : {}) });
const pdf = new Uint8Array(Buffer.from('%PDF-1.7\nevidence\n%%EOF'));
const ok = <T,>(r: T | { error: string }): T => { if (r && typeof r === 'object' && 'error' in r) throw new Error((r as { error: string }).error); return r as T; };
async function step(id: string, action: string, who: Actor, extra: Record<string, unknown> = {}) { const r = await act(id, { action, ...extra }, who); if ('error' in r) throw new Error(`${action}: ${r.error}`); return r; }
/** Everything an installation holds about cases, records, relationships and federation (the laws register is the nation's reference data, held in both). */
const resetInstallation = () => { for (const r of [resetCases, resetPackages, resetDocuments, resetDecisions, resetCertificates, resetOrganisations, resetProfessions, resetHealth, resetAccessLog, resetPortability, resetImportedEvidence, resetRelationships, resetFederationEvents]) r(); resetSealKeys(); };

describe('a federation enabled later', () => {
  beforeEach(() => {
    resetInstallation(); resetLaw(); resetInstitutionKeys();
    vi.stubEnv('CIVICOS_DATA_KEK', KEK);
    rmSync(dir, { recursive: true, force: true });
    useTarget(dirTarget(dir));
    setSovereign({ deployment: { authorities: { healthRegulation: HEALTH } } }, 'Administrator');
    for (const p of HEALTH_PROCEDURES) {
      ok(draftPackage(asNationSets(p as never), 'Author', 'author', registeredEffects()));
      ok(approvePackage(p.key, 1, 'Approver', 'approver', '2026-01-01', registeredEffects(), new Date('2026-01-01')));
    }
  });
  afterEach(() => { useTarget(null); vi.unstubAllEnvs(); rmSync(dir, { recursive: true, force: true }); });

  it('keeps every identifier through export and import, and federates afterwards with the same references', async () => {
    // Installation A: the health regulator licenses a clinic and issues its certificate.
    const law = ok(recordLaw({ instrument: { title: 'Health Facilities Act', type: 'act', jurisdiction: 'x', year: 2019, number: '11', issuingAuthority: 'Parliament' }, dates: { inForce: '2019-01-01' }, provisions: [{ eId: 'sec_30', num: '30', text: 'The regulator notifies other authorities of licences issued.' }] }, 'L1', 'l1'));
    confirmLaw(law.instrument.id, law.version.id, 'L2', 'l2');
    const o = createOrganisation({ name: 'Harbour Clinic', kind: 'clinic', representative: { name: 'REP', role: 'director' } }, 'c', 'Registrar') as { number: string };
    const c = openCase({ procedure: 'health.facility', fields: { organisation: o.number, campuses: 'site-ward-a' } }, hr('clerk')) as { id: string; ref: string };
    for (const cls of ['premises-evidence', 'fee-receipt']) { const d = addDocument({ class: cls, title: cls, institution: HEALTH, belongsTo: { kind: 'case', id: c.id }, bytes: pdf }, 'Clerk') as { id: string }; attach(c.id, d.id, hr('clerk')); }
    await step(c.id, 'check', hr('clerk'));
    await step(c.id, 'inspect', hr('clerk'));
    const rep = addDocument({ class: 'inspection-report', title: 'Inspection', institution: HEALTH, belongsTo: { kind: 'case', id: c.id }, bytes: pdf }, 'Clerk') as { id: string };
    attach(c.id, rep.id, hr('clerk'));
    await step(c.id, 'inspected', hr('clerk'));
    await step(c.id, 'grant', hr('s1', 'signatory'), { reason: 'Meets the standards' });
    const decision = (await step(c.id, 'grant', hr('s2', 'signatory'))).decision!;
    const cert = ok(issueCertificate({ kind: 'facility-licence', title: 'Facility licence', decision: decision.id, publicFacts: { facility: 'Harbour Clinic' } }, 'Registrar'));
    // An envelope about the decision, signed with the regulator's own key before the move (references only).
    const { envelope } = ok(await publishEvent({ type: 'permit.issued', source: HEALTH, aggregate: `Decision:${decision.id}`, legal: { instrument_reference: law.instrument.id, version_reference: law.version.id }, payloadReference: `Certificate:${cert.code}` }, { by: 'Registrar', institution: HEALTH }));

    const p = ok(proposeExport({ institution: HEALTH, reason: 'Moving to the regulator\'s own host, to federate later' }, official('a1', 'administrator', HEALTH)));
    ok(await confirmExport(p.id, official('s9', 'signatory', HEALTH)));
    const got = ok(await exportArchive(p.id));
    // The export carries its configuration (as evidence) and the material its certificates verify with.
    const { parts } = await openExport<import('./export').ExportManifest>(got.archive);
    const conf = JSON.parse(parts.get('configuration.json')!.toString()) as import('./export').PortableConfiguration;
    expect(conf).toMatchObject({ format: 'civicos.institution-configuration', adoptedOnImport: false });
    const ver = JSON.parse(parts.get('verification.json')!.toString()) as { certificates: { id: string; code: string }[]; federationKey: { keyId: string } | null };
    expect(ver.certificates).toEqual([expect.objectContaining({ id: cert.id, code: cert.code })]);
    expect(ver.federationKey?.keyId).toBe(envelope.integrity.key_id);
    const report = await verifyInstitutionExport(got.archive);
    expect(report.problems).toEqual([]);
    expect(report.checks.join(' ')).toMatch(/Configuration: .* 1 certificate\(s\) from its decisions; federation key/);

    // Installation B: clean. The regulator's key stays in its key custody (never in an export).
    resetInstallation();
    (globalThis as unknown as { __civicos: { audit: unknown[] } }).__civicos.audit.length = 0;
    setSovereign({ deployment: { authorities: { healthRegulation: HEALTH } } }, 'Administrator');
    expect(getDecision(decision.id)).toBeUndefined();
    const imp = ok(await proposeImport(got.archive, official('n1', 'administrator')));
    const done = ok(await confirmImport(imp.proposal.id, official('n2', 'administrator')));
    expect(done.restored).toMatchObject({ cases: 1, decisions: 1, certificates: 1 });
    expect(getCase(c.id)).toMatchObject({ id: c.id, ref: c.ref });
    expect(getDecision(decision.id)?.sha256).toBe(decision.sha256);
    // The certificate's code checks in the new installation, its decision's seal (hash and signature) verifying.
    expect(checkCode(cert.code)).toMatchObject({ status: 'valid', kind: 'facility-licence', sealOk: true });
    // The configuration is kept as evidence, never adopted: no relationship or mapping appears from it.
    expect(importedEvidence(HEALTH)[0]!.configuration).toMatchObject({ adoptedOnImport: false });
    expect(listRelationships()).toEqual([]);

    // Federated afterwards: customs in B trusts the regulator's key (two officials) and records an exchange relationship.
    const customs = ok(createMinistry({ archetype: 'GENERIC', name: 'Customs Service', slug: `customs-${Date.now()}` })).id;
    ok(confirmPeerKey(ok(proposePeerKey({ institution: HEALTH, publicKeyPem: institutionPublicKey(HEALTH)!.publicKeyPem }, { by: 'B admin 1', byId: 'b1' })).id, { by: 'B admin 2', byId: 'b2' }));
    const { relationship } = ok(proposeRelationship({ from: customs, to: HEALTH, type: 'exchange', scope: { recordTypes: ['event:permit.issued'], purposes: ['Import controls'] }, legalBasis: [{ instrument: law.instrument.id, eId: 'sec_30' }] }, { by: 'B admin 1', byId: 'b1' }));
    ok(confirmRelationship(relationship.id, { by: 'B admin 2', byId: 'b2', role: 'administrator' }, () => false));
    // The envelope signed in A before the move is accepted in B, and its references resolve to the same records.
    const r = ok(receiveEnvelope(envelope, customs)).record;
    expect(r).toMatchObject({ state: 'accepted', source: HEALTH, aggregate: `Decision:${decision.id}`, applied: false });
    expect(getDecision(r.aggregate.replace(/^Decision:/, ''))?.id).toBe(decision.id);
    expect(checkCode(envelope.payload_reference!.replace(/^Certificate:/, ''))).toMatchObject({ status: 'valid' });
  });
});
