import { asNationSets } from '@/lib/casework/testkit';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { openCase, act, attach, assign, resetCases, registeredEffects, type Actor } from '@/lib/casework/engine';
import { draftPackage, approvePackage, resetPackages } from '@/lib/casework/packages';
import { addDocument, resetDocuments } from '@/lib/records/documents';
import { resetDecisions } from '@/lib/records/decisions';
import { checkCode, resetCertificates } from '@/lib/records/certificates';
import { setSovereign, listMinistries } from '@/lib/data/store';
import { IMMIGRATION_PROCEDURES } from './procedures';
import { resetImmigration, statusOn, getGrant } from './register';

let IMM = '';
const off = (id: string, role: 'officer' | 'signatory' = 'officer'): Actor => ({ id, name: `Officer ${id}`, scope: { id, role, institution: IMM } });
const pdf = new Uint8Array(Buffer.from('%PDF-1.7\nx\n%%EOF'));
async function step(id: string, action: string, who: Actor, extra: Record<string, unknown> = {}) {
  const r = await act(id, { action, ...extra }, who);
  if ('error' in r) throw new Error(`${action}: ${r.error}`);
  return r;
}

describe('visa procedure', () => {
  beforeEach(() => {
    for (const r of [resetCases, resetPackages, resetDocuments, resetDecisions, resetCertificates, resetImmigration]) r();
    vi.stubEnv('CIVICOS_DATA_KEK', Buffer.alloc(32, 7).toString('base64'));
    IMM = listMinistries()[0]!.id;
    setSovereign({ deployment: { authorities: { immigration: IMM } } }, 'Administrator');
    for (const p of IMMIGRATION_PROCEDURES) {
      const d = draftPackage(asNationSets(p), 'Author', 'author', registeredEffects());
      if ('error' in d) throw new Error(`${p.key}: ${d.error}`);
      const a = approvePackage(p.key, 1, 'Approver', 'approver', '2026-01-01', registeredEffects(), new Date('2026-01-01'));
      if ('error' in a) throw new Error(`${p.key}: ${a.error}`);
    }
  });

  it('runs a visa to a verifiable document with four eyes, then extends and revokes it', async () => {
    const c = openCase({ procedure: 'immigration.visa', fields: { holderName: 'Ada Traveller', nationality: 'GHA', documentNumber: 'G1234567', category: 'business', entries: 'multiple' } }, off('o1')) as { id: string };
    // Restricted: only the assigned official works it.
    expect(await act(c.id, { action: 'check' }, off('o2'))).toHaveProperty('error');
    await step(c.id, 'check', off('o1'));
    for (const cls of ['travel-document', 'photograph']) {
      const d = addDocument({ class: cls, title: cls, institution: IMM, belongsTo: { kind: 'case', id: c.id }, bytes: pdf }, 'Officer') as { id: string };
      attach(c.id, d.id, off('o1'));
    }
    await step(c.id, 'complete', off('o1'));
    await step(c.id, 'verify', off('o1'));
    await step(c.id, 'assess', off('o1'), { reason: 'Invitation verified with the host company', fields: { validFrom: '2026-11-01', validUntil: '2027-01-31' } });
    expect(await step(c.id, 'grant', off('s1', 'signatory'), { reason: 'Meets the business visit conditions' })).toMatchObject({ pending: true });
    const done = await step(c.id, 'grant', off('s2', 'signatory'));
    expect(done.decision).toBeTruthy();
    const issued = await step(c.id, 'issue', off('o1'));
    expect(issued.case.stage).toBe('document-issued');
    const status = statusOn({ nationality: 'GHA', documentNumber: 'G1234567', kind: 'visa', on: '2026-12-01' });
    expect(status).toMatchObject({ valid: true, category: 'business' });
    const grant = getGrant(status.number!)!;
    expect(grant.decision).toBe(done.decision!.id);
    expect(checkCode(grant.certificate!)).toMatchObject({ status: 'valid' });

    // Extension.
    const e = openCase({ procedure: 'immigration.extension', fields: { grant: grant.number, newValidUntil: '2027-04-30' } }, off('o1')) as { id: string };
    const ev = addDocument({ class: 'extension-evidence', title: 'Letter', institution: IMM, belongsTo: { kind: 'case', id: e.id }, bytes: pdf }, 'Officer') as { id: string };
    attach(e.id, ev.id, off('o1'));
    await step(e.id, 'assess', off('o1'));
    await step(e.id, 'propose', off('o1'), { reason: 'Project extended' });
    await step(e.id, 'extend', off('s1', 'signatory'), { reason: 'Extended' });
    await step(e.id, 'extend', off('s2', 'signatory'));
    expect(getGrant(grant.number)!.validUntil).toBe('2027-04-30');

    // Revocation after notice.
    const r = openCase({ procedure: 'immigration.revocation', fields: { grant: grant.number, grounds: 'Work outside the visa category' } }, off('o1')) as { id: string };
    expect(assign(r.id, { id: 'o1', name: 'Officer o1' }, off('s1', 'signatory'))).not.toHaveProperty('error');
    const gd = addDocument({ class: 'grounds-evidence', title: 'Report', institution: IMM, belongsTo: { kind: 'case', id: r.id }, bytes: pdf }, 'Officer') as { id: string };
    attach(r.id, gd.id, off('o1'));
    await step(r.id, 'notify', off('o1'), { reason: 'Notice served' });
    await step(r.id, 'propose', off('o1'), { reason: 'Representations considered' });
    await step(r.id, 'revoke', off('s1', 'signatory'), { reason: 'Revoked' });
    await step(r.id, 'revoke', off('s2', 'signatory'));
    expect(statusOn({ nationality: 'GHA', documentNumber: 'G1234567', on: '2026-12-01' })).toEqual({ valid: false });
  });
});
