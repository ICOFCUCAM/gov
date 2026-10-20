import { describe, it, expect, beforeEach } from 'vitest';
import { openCase, act, attach, refer, getCase, resetCases, registeredEffects, type Actor } from './engine';
import { approvePackage, resetPackages, draftPackage } from './packages';
import { samplePackage } from './testkit';
import { addDocument, resetDocuments } from '@/lib/records/documents';
import { setSovereign, listMinistries, listAudit } from '@/lib/data/store';
import { draftReferralProcedure, referralKey } from './referral';
import './modules';

let EDU = '', HEALTH = '';
const of = (inst: () => string) => (id: string, role: 'officer' | 'signatory' = 'officer'): Actor => ({ id, name: `Official ${id}`, scope: { id, role, institution: inst() } });
const edu = of(() => EDU), health = of(() => HEALTH);

describe('referral between institutions as linked cases', () => {
  beforeEach(() => {
    resetCases(); resetPackages(); resetDocuments();
    [EDU, HEALTH] = listMinistries().slice(0, 2).map(m => m.id) as [string, string];
    setSovereign({ deployment: { authorities: { businessRegister: EDU } } }, 'test');
  });

  it('opens a case at the other institution, which reports back to the origin', async () => {
    const d = draftPackage(samplePackage({ owner: 'businessRegister' }), 'Author', 'author', registeredEffects());
    if ('error' in d) throw new Error(d.error);
    approvePackage(d.key, d.version, 'Approver', 'approver', '2026-01-01', registeredEffects(), new Date('2026-01-01'));
    expect(draftReferralProcedure(HEALTH, 'Administrator')).toEqual({ drafted: referralKey(HEALTH) });
    expect(draftReferralProcedure(HEALTH, 'Administrator')).toEqual({ present: referralKey(HEALTH) });
    expect(approvePackage(referralKey(HEALTH), 1, 'Health approver', 'ha', '2026-01-01', registeredEffects(), new Date('2026-01-01'))).not.toHaveProperty('error');

    const origin = openCase({ procedure: 'test.licence', fields: { name: 'Campus' } }, edu('e1')) as { id: string; ref: string };
    const r = refer(origin.id, { procedure: referralKey(HEALTH), fields: { request: 'Fire and health inspection of the campus' }, reason: 'Needed before accreditation' }, edu('e1'));
    if ('error' in r) throw new Error(r.error);
    expect(r.to).toMatchObject({ owner: HEALTH, links: [{ kind: 'referred-from', case: origin.id }] });
    expect(r.to.deadlines[0]).toMatchObject({ key: 'report' });
    // Only Health works it.
    expect(await act(r.to.id, { action: 'accept' }, edu('e1'))).toHaveProperty('error');
    expect(await act(r.to.id, { action: 'accept' }, health('h1'))).not.toHaveProperty('error');
    const doc = addDocument({ class: 'referral-report', title: 'Inspection report', institution: HEALTH, belongsTo: { kind: 'case', id: r.to.id }, bytes: new Uint8Array(Buffer.from('%PDF-1.7\nr\n%%EOF')) }, 'Inspector') as { id: string };
    attach(r.to.id, doc.id, health('h1'));
    expect(await act(r.to.id, { action: 'report', reason: 'Passed with two remarks' }, health('h1'))).toMatchObject({ case: { stage: 'reported' } });
    expect(getCase(origin.id)!.links).toEqual([{ kind: 'referral', case: r.to.id }]);
    expect(listAudit().some(e => e.action === 'case.referral.report' && e.resource === `Case:${origin.ref}`)).toBe(true);
  });
});
