// The security registers in an institution's portable export (plan I9;
// integration register 25.16): the keeping institution's unmarked security
// records travel in full (metadata only by construction), a marked record only
// as a reference (number, kind, register, case, status: never its summary or
// terms); the offline verifier refuses an export that carries a marked record
// in full; the import brings back the unmarked records with their numbers.
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { listMinistries } from '@/lib/data/store';
import { useTarget, dirTarget } from '@/lib/backup/target';
import { openExport } from '@/lib/backup/archive';
import { resetCases } from '@/lib/casework/engine';
import { resetPackages } from '@/lib/casework/packages';
import { resetDocuments } from '@/lib/records/documents';
import { resetDecisions } from '@/lib/records/decisions';
import { resetAccessLog } from '@/lib/records/access-log';
import { resetSealKeys } from '@/lib/keys/seal-register';
import { resetSecurityRecords, openSecurityRecord, securityRecordRaw } from '@/lib/security/register';
import { proposeExport, confirmExport, exportArchive, resetPortability, type ExportManifest } from './export';
import { verifyInstitutionExport, verifyExportParts } from './verify';
import { proposeImport, confirmImport } from './import';
import { resetImportedEvidence } from './evidence';

let X = '';
const dir = join(tmpdir(), `civicos-security-export-${process.pid}`);
const official = (id: string, role: 'administrator' | 'signatory', institution?: string) => ({ by: `Official ${id}`, byId: id, scope: { role, ...(institution ? { institution } : {}) }, ...(institution ? { institution } : {}) });
const resetAll = () => { for (const r of [resetCases, resetPackages, resetDocuments, resetDecisions, resetAccessLog, resetPortability, resetImportedEvidence, resetSecurityRecords]) r(); };
const open = (summary: string, marking: string) => openSecurityRecord({ kind: 'incident', owner: X, case: { id: `case-${summary}`, ref: `CYI-${summary}` }, summary, marking, caveats: [], status: 'reported', terms: { affectedServices: `TERMS-${summary}` }, by: { name: 'Officer' }, reason: 'Registered' });

describe('security registers in the institution export', () => {
  beforeEach(() => {
    resetAll(); resetSealKeys();
    vi.stubEnv('CIVICOS_DATA_KEK', Buffer.alloc(32, 7).toString('base64'));
    rmSync(dir, { recursive: true, force: true });
    useTarget(dirTarget(dir));
    X = listMinistries()[0]!.id;
  });
  afterEach(() => { useTarget(null); vi.unstubAllEnvs(); rmSync(dir, { recursive: true, force: true }); });

  it('carries unmarked records in full and marked ones as references only; comes back with its numbers', async () => {
    const plain = open('PLAIN', ''), marked = open('MARKED', 'restricted');
    const p = proposeExport({ institution: X, reason: 'Moving host' }, official('a1', 'administrator', X));
    if ('error' in p) throw new Error(p.error);
    const done = await confirmExport(p.id, official('s9', 'signatory', X));
    if ('error' in done) throw new Error(done.error);
    expect(done.export!.counts).toMatchObject({ securityRecords: 1, securityReferences: 1 });
    const got = await exportArchive(p.id);
    if ('error' in got) throw new Error(got.error);
    const { manifest, parts } = await openExport<ExportManifest>(got.archive);
    const sec = JSON.parse(parts.get('registers/security.json')!.toString()) as { records: { number: string }[]; references: Record<string, unknown>[] };
    expect(sec.records.map(r => r.number)).toEqual([plain.number]);
    expect(sec.references).toEqual([expect.objectContaining({ number: marked.number, kind: 'incident', marked: true, marking: 'marked' })]);
    expect(parts.get('registers/security.json')!.toString()).not.toMatch(/TERMS-MARKED|"summary":"MARKED"/);
    const report = await verifyInstitutionExport(got.archive);
    expect(report.problems).toEqual([]);
    expect(report.checks.some(c => /1 unmarked record\(s\) of its own; 1 marked record\(s\) as references only/.test(c))).toBe(true);
    // A marked record carried in full never verifies.
    const bad = new Map(parts); bad.set('registers/security.json', Buffer.from(JSON.stringify({ records: [...sec.records, securityRecordRaw(marked.number)], references: [] })));
    expect(verifyExportParts(manifest, bad).problems).toEqual(expect.arrayContaining([expect.stringMatching(/marked security record is carried in full/)]));

    // An installation that held none of it: the unmarked record comes back with its number; the marked one does not.
    resetAll(); resetSealKeys();
    (globalThis as unknown as { __civicos: { audit: unknown[] } }).__civicos.audit.length = 0;
    const imp = await proposeImport(got.archive, official('n1', 'administrator'));
    if ('error' in imp) throw new Error(imp.error);
    const ok = await confirmImport(imp.proposal.id, official('n2', 'administrator'));
    if ('error' in ok) throw new Error(ok.error);
    expect(ok.restored).toMatchObject({ securityRecords: 1 });
    expect(securityRecordRaw(plain.number)).toMatchObject({ number: plain.number, terms: { affectedServices: 'TERMS-PLAIN' } });
    expect(securityRecordRaw(marked.number)).toBeUndefined();
  });
});
