// A migration's per-record manifest (plan I9; acceptance P5-06 "A migrated
// record retains its source, transformation history and verification
// status"; specification Part 5 J): the plan carries each record's source id
// and hash, its transformations (step, rule, version) and where it landed;
// the plan's count and source manifest are the manifest's own; every
// reconciliation verifies each record against the platform's own records
// (verified, hash differs, missing, not verifiable here; records under the
// target the manifest does not list are counted) and keeps the status with
// the record; the provenance travels with the institution's portable export,
// verifies offline (a changed transformation does not) and comes back with
// every identifier unchanged in an installation that held none of it.
import { asNationSets } from '@/lib/casework/testkit';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

const { openCase, act, attach, resetCases, registeredEffects, getCase } = await import('@/lib/casework/engine');
const { draftPackage, approvePackage, resetPackages } = await import('@/lib/casework/packages');
const { addDocument, getDocument, resetDocuments } = await import('@/lib/records/documents');
const { resetDecisions } = await import('@/lib/records/decisions');
const { resetCertificates } = await import('@/lib/records/certificates');
const { resetAccessLog } = await import('@/lib/records/access-log');
const { setSovereign, listMinistries } = await import('@/lib/data/store');
const { recordVersion, confirmVersion, resetLaw } = await import('@/lib/law/register');
const { resetSealKeys } = await import('@/lib/keys/seal-register');
const { useTarget, dirTarget } = await import('@/lib/backup/target');
const { openExport } = await import('@/lib/backup/archive');
await import('@/lib/casework/modules');
const { RECORDKEEPING_PROCEDURES, recordkeepingKey } = await import('./procedures');
const { resetRecordkeeping, migrationOfCase, provenanceOf, sourceDigestOf } = await import('./register');
const { parseManifest, parseTransformations, sha256Of } = await import('./migration-manifest');
const { proposeExport, confirmExport, exportArchive, resetPortability } = await import('@/lib/portability/export');
const { verifyExportParts, verifyInstitutionExport } = await import('@/lib/portability/verify');
const { proposeImport, confirmImport } = await import('@/lib/portability/import');
const { resetImportedEvidence } = await import('@/lib/portability/evidence');
type Actor = import('@/lib/casework/engine').Actor;

let X = '', lawId = '';
const KEK = Buffer.alloc(32, 7).toString('base64');
const dir = join(tmpdir(), `civicos-migration-manifest-${process.pid}`);
const off = (id: string, role: 'officer' | 'signatory' = 'officer'): Actor => ({ id, name: `Official ${id}`, scope: { id, role, institution: X } });
const official = (id: string, role: 'administrator' | 'signatory', institution?: string) => ({ by: `Official ${id}`, byId: id, scope: { role, ...(institution ? { institution } : {}) }, ...(institution ? { institution } : {}) });
const pdf = (s: string) => new Uint8Array(Buffer.from(`%PDF-1.7\n${s}\n%%EOF`));
async function step(id: string, action: string, who: Actor, extra: Record<string, unknown> = {}) { const r = await act(id, { action, ...extra }, who); if ('error' in r) throw new Error(`${action}: ${r.error}`); return r; }
const key = (t: string) => recordkeepingKey(t, X);
const resetAll = () => { for (const r of [resetCases, resetPackages, resetDocuments, resetDecisions, resetCertificates, resetRecordkeeping, resetAccessLog, resetPortability, resetImportedEvidence]) r(); };

function adopt() {
  for (const t of RECORDKEEPING_PROCEDURES) {
    const { forms: _f, ...pkg } = t;
    const d = draftPackage({ ...asNationSets(pkg), key: key(t.key), owner: X }, 'Author', 'author', registeredEffects()); if ('error' in d) throw new Error(d.error);
    const a = approvePackage(key(t.key), 1, 'Approver', 'approver', '2026-01-01', registeredEffects(), new Date('2026-01-01')); if ('error' in a) throw new Error(a.error);
  }
}
/** A scanned permit file loaded from the old registry as a document of the class the migration lands in. */
function loaded(text: string): { id: string; sha256: string } {
  const holder = openCase({ procedure: key('rec.incoming'), fields: { subject: 'Holder', senderKind: 'person', channel: 'post', receivedOn: '2026-10-20', recordClass: 'correspondence' } }, off('o1')) as { id: string };
  const d = addDocument({ class: 'permit-file', title: 'Permit file', institution: X, belongsTo: { kind: 'case', id: holder.id }, retention: 'market-permits', bytes: pdf(text) }, 'Loader') as { id: string };
  return { id: d.id, sha256: getDocument(d.id)!.versions[0]!.sha256 };
}
/** Plan a migration with a per-record manifest (lines, columns separated by |). */
async function plan(rows: string[], count: number, manifest: string): Promise<{ id: string; error?: string }> {
  const m = openCase({ procedure: key('rec.migration'), fields: { sourceSystem: 'Old market registry', targetSystem: 'CivicOS', targetKind: 'documents', targetRef: 'market-permits', sourceCount: count, sourceManifest: manifest, description: 'Scanned permit files: extract, normalise, map', recordManifest: rows.join('\n') } }, off('o1')) as { id: string };
  const d = addDocument({ class: 'migration-plan', title: 'Plan', institution: X, belongsTo: { kind: 'case', id: m.id }, bytes: pdf('plan') }, 'Clerk') as { id: string };
  attach(m.id, d.id, off('o1'));
  const r = await act(m.id, { action: 'record-plan' }, off('o1'));
  return { id: m.id, ...('error' in r ? { error: r.error } : {}) };
}

describe('a migration\'s per-record manifest (P5-06)', () => {
  beforeEach(() => {
    resetAll(); resetLaw(); resetSealKeys();
    vi.stubEnv('CIVICOS_DATA_KEK', KEK);
    rmSync(dir, { recursive: true, force: true });
    useTarget(dirTarget(dir));
    X = listMinistries()[0]!.id;
    setSovereign({ deployment: { authorities: {} } }, 'Administrator');
    const law = recordVersion({ instrument: { title: 'Public Archives Act', type: 'act', jurisdiction: 'X', year: 2010, number: '4', issuingAuthority: 'Parliament' }, dates: { inForce: '2010-01-01' }, provisions: [{ eId: 'sec_9', num: '9', text: 'Public records are migrated under a plan approved by two officials.' }] }, 'L1', 'l1') as { instrument: { id: string }; version: { id: string } };
    confirmVersion(law.instrument.id, law.version.id, 'L2', 'l2');
    lawId = law.instrument.id;
    adopt();
  });
  afterEach(() => { useTarget(null); vi.unstubAllEnvs(); rmSync(dir, { recursive: true, force: true }); });

  it('parses each record\'s source, transformations and target, and refuses what is not a manifest', () => {
    expect(parseTransformations('extract@1; normalise-dates@2 > map-fields:permit-mapping@3')).toEqual([{ step: 'extract', version: '1' }, { step: 'normalise-dates', version: '2' }, { step: 'map-fields', rule: 'permit-mapping', version: '3' }]);
    expect(parseTransformations('Fixed the name of Mr Smith')).toMatchObject({ error: expect.stringMatching(/not a transformation step/) });
    const h = 'a'.repeat(64);
    expect(parseManifest(`OLD-1|${h}|extract@1|DOC-1|${h}`, 'documents')).toEqual([{ source: { id: 'OLD-1', sha256: h }, transformations: [{ step: 'extract', version: '1' }], target: { kind: 'document', id: 'DOC-1', sha256: h } }]);
    expect(parseManifest(`OLD-1|${h}|extract@1|DOC-1`, 'documents')).toMatchObject({ error: expect.stringMatching(/target SHA-256 is its content as loaded/) });
    expect(parseManifest(`OLD-1|${h}||DOC-1|${h}\nOLD-1|${h}||DOC-2|${h}`, 'documents')).toMatchObject({ error: expect.stringMatching(/listed twice/) });
    expect(parseManifest(`OLD-1|nothex||EXT-1`, 'external')).toMatchObject({ error: expect.stringMatching(/64 hexadecimal/) });
  });

  it('keeps each migrated record\'s source, transformation history and verification status, computed from the platform\'s own records', async () => {
    const a = loaded('permit A'), b = loaded('permit B');
    const src = [{ id: 'OLD-0001', sha256: sha256Of('legacy row 1') }, { id: 'OLD-0002', sha256: sha256Of('legacy row 2') }];
    const rows = [`${src[0]!.id}|${src[0]!.sha256}|extract@1; normalise-dates@2; map-fields:permit-mapping@3|${a.id}|${a.sha256}`, `${src[1]!.id}|${src[1]!.sha256}|extract@1; map-fields:permit-mapping@3|${b.id}|${b.sha256}`];
    const digest = sourceDigestOf(src.map(s => ({ source: s })));
    // The plan's count and source manifest are the per-record manifest's own.
    expect((await plan(rows, 3, digest)).error).toMatch(/lists 2 record\(s\); the source count says 3/);
    expect((await plan(rows, 2, 'b'.repeat(64))).error).toMatch(/not the digest of the per-record manifest/);
    const m = await plan(rows, 2, digest);
    expect(m.error).toBeUndefined();
    await step(m.id, 'approve', off('s1', 'signatory'), { reason: 'Plan sound', citations: [{ instrument: lawId, eId: 'sec_9' }] });
    await step(m.id, 'approve', off('s2', 'signatory'));
    // Before any reconciliation: the source and transformations are kept, not yet verified.
    expect(provenanceOf(X, a.id)).toMatchObject({ sourceSystem: 'Old market registry', status: 'not-yet-verified', record: { source: src[0], transformations: [{ step: 'extract' }, { step: 'normalise-dates' }, { step: 'map-fields', rule: 'permit-mapping', version: '3' }] } });
    // A file the manifest does not list lands in the class: the reconciliation does not match until it is explained.
    const stray = loaded('not in the manifest');
    expect(await act(m.id, { action: 'reconcile' }, off('o2'))).toMatchObject({ error: expect.stringMatching(/2 of 2 records verified, 0 with a different hash, 0 missing, 1 not in the manifest/) });
    const r1 = await step(m.id, 'reconcile', off('o2'), { fields: { discrepancies: `${stray.id} loaded outside the plan`, correctiveActions: 'Withdraw it and load it as a correction' } });
    expect(r1.case.history.at(-1)).toMatchObject({ action: 'reconcile' });
    const mig = migrationOfCase(getCase(m.id)!.ref)!;
    expect(mig.reconciliation![0]).toMatchObject({ matched: false, records: { verified: 2, mismatched: 0, missing: 0, notVerifiable: 0, unexpected: 1 } });
    // Each record keeps the status every reconciliation found for it; the provenance is read by its id here or in the source.
    expect(provenanceOf(X, a.id)).toMatchObject({ status: 'verified', record: { verification: [{ status: 'verified', reconciliation: 1 }] } });
    expect(provenanceOf(X, 'OLD-0002')).toMatchObject({ record: { target: { id: b.id } }, status: 'verified' });
    expect(provenanceOf(X, 'OLD-9999')).toBeUndefined();
    await step(m.id, 'close', off('s3', 'signatory'), { reason: 'Accepted with the correction' });
    await step(m.id, 'close', off('s4', 'signatory'));
    expect(migrationOfCase(getCase(m.id)!.ref)!.closed).toMatchObject({ outcome: 'accepted-with-corrections' });
  });

  it('finds a record whose content is not what the manifest names, or that is missing', async () => {
    const a = loaded('permit A');
    const src = [{ id: 'OLD-1', sha256: sha256Of('1') }, { id: 'OLD-2', sha256: sha256Of('2') }];
    const rows = [`OLD-1|${src[0]!.sha256}|extract@1|${a.id}|${sha256Of('what the plan expected')}`, `OLD-2|${src[1]!.sha256}|extract@1|DOC-NOT-LOADED|${sha256Of('2')}`];
    const m = await plan(rows, 2, sourceDigestOf(src.map(s => ({ source: s }))));
    await step(m.id, 'approve', off('s1', 'signatory'), { reason: 'Plan sound' });
    await step(m.id, 'approve', off('s2', 'signatory'));
    const r = await step(m.id, 'reconcile', off('o2'), { fields: { discrepancies: 'One file differs, one not loaded', correctiveActions: 'Reload both from the source' } });
    expect(r.decision).toBeUndefined();
    expect(provenanceOf(X, a.id)).toMatchObject({ status: 'hash-mismatch', record: { verification: [{ status: 'hash-mismatch', detail: expect.stringMatching(/^here /) }] } });
    expect(provenanceOf(X, 'DOC-NOT-LOADED')).toMatchObject({ status: 'missing' });
    expect(migrationOfCase(getCase(m.id)!.ref)!.reconciliation![0]!.records).toMatchObject({ verified: 0, mismatched: 1, missing: 1 });
  });

  it('travels with the institution\'s export, verifies offline (a changed transformation does not), and comes back with its history in an installation that held none of it', async () => {
    const a = loaded('permit A');
    const src = [{ id: 'OLD-1', sha256: sha256Of('legacy 1') }];
    const m = await plan([`OLD-1|${src[0]!.sha256}|extract@1; map-fields:permit-mapping@3|${a.id}|${a.sha256}`], 1, sourceDigestOf(src.map(s => ({ source: s }))));
    await step(m.id, 'approve', off('s1', 'signatory'), { reason: 'Plan sound' });
    await step(m.id, 'approve', off('s2', 'signatory'));
    await step(m.id, 'reconcile', off('o2'));
    await step(m.id, 'close', off('s3', 'signatory'), { reason: 'Reconciled' });
    await step(m.id, 'close', off('s4', 'signatory'));
    const before = provenanceOf(X, a.id)!;
    expect(before).toMatchObject({ status: 'verified', closed: { outcome: 'reconciled' } });

    const p = proposeExport({ institution: X, reason: 'Moving host' }, official('a1', 'administrator', X));
    if ('error' in p) throw new Error(p.error);
    const done = await confirmExport(p.id, official('s9', 'signatory', X));
    if ('error' in done) throw new Error(done.error);
    expect(done.export!.counts).toMatchObject({ migratedRecords: 1 });
    const got = await exportArchive(p.id);
    if ('error' in got) throw new Error(got.error);
    const report = await verifyInstitutionExport(got.archive);
    expect(report.problems).toEqual([]);
    expect(report.checks.some(c => /1 migrated record\(s\), each manifest giving back its recorded digests/.test(c))).toBe(true);
    // A transformation changed after the fact does not verify.
    const { manifest, parts } = await openExport<import('@/lib/portability/export').ExportManifest>(got.archive);
    const rm = JSON.parse(parts.get('registers/records-management.json')!.toString()) as { migrations: { records: { transformations: { step: string }[] }[] }[] };
    rm.migrations[0]!.records[0]!.transformations[1]!.step = 'nothing-happened';
    const tampered = new Map(parts); tampered.set('registers/records-management.json', Buffer.from(JSON.stringify(rm)));
    expect(verifyExportParts(manifest, tampered).problems).toEqual(expect.arrayContaining([expect.stringMatching(/differ from the manifest the plan recorded/)]));

    // An installation that holds none of it: two administrators import it, the record's provenance unchanged.
    resetAll(); resetSealKeys();
    (globalThis as unknown as { __civicos: { audit: unknown[] } }).__civicos.audit.length = 0;
    const imp = await proposeImport(got.archive, official('n1', 'administrator'));
    if ('error' in imp) throw new Error(imp.error);
    const ok = await confirmImport(imp.proposal.id, official('n2', 'administrator'));
    if ('error' in ok) throw new Error(ok.error);
    expect(ok.restored).toMatchObject({ recordsManagement: expect.any(Number), documents: expect.any(Number) });
    expect(provenanceOf(X, a.id)).toEqual(before);
    expect(getDocument(a.id)!.versions[0]!.sha256).toBe(a.sha256);
    expect(await proposeImport(got.archive, official('n1', 'administrator'))).toMatchObject({ error: expect.stringMatching(/already in this installation/) });
  });
});
