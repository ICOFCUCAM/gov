import { describe, it, expect, beforeEach } from 'vitest';
import { draftMapping, approveMapping, mappingInForce, powerRefusal, installProposedDefaults, withdrawMapping, listMappings, resetPermitAuthorities } from './authority';
import { recordVersion, confirmVersion, resetLaw } from '@/lib/law/register';

let act = '';
const resolve = (a: string) => ({ healthRegulation: 'min-health', businessRegister: 'min-trade' } as Record<string, string>)[a] ?? a;

describe('permit authority registry', () => {
  beforeEach(() => {
    resetPermitAuthorities(); resetLaw();
    const v = recordVersion({ instrument: { title: 'Pharmacy Act', type: 'act', jurisdiction: 'X', year: 2010, number: '4', issuingAuthority: 'Parliament' }, dates: { inForce: '2010-01-01' }, provisions: [{ eId: 'sec_3', num: '3', text: 'The regulator licenses pharmacies.' }] }, 'L1', 'l1');
    if ('error' in v) throw new Error(v.error);
    confirmVersion(v.instrument.id, v.version.id, 'L2', 'l2');
    act = v.instrument.id;
  });

  it('governs decisions only once a second official approves a version with its legal basis, from its date', () => {
    const d = draftMapping({ permitType: 'pharmacy-licence', title: 'Pharmacy licence', lead: 'healthRegulation', effectiveFrom: '2026-01-01', legalBasis: [{ instrument: act, eId: 'sec_3' }], consulted: [{ authority: 'local-council', role: 'Premises zoning opinion', mandatory: true }] }, 'Admin A', 'a');
    if ('error' in d) throw new Error(d.error);
    expect(mappingInForce('pharmacy-licence', '2026-06-01')).toBeUndefined();
    expect(powerRefusal('pharmacy-licence', 'issue', 'min-health', resolve, { required: true })).toMatch(/No approved/);
    expect(approveMapping('pharmacy-licence', 1, 'Admin A', 'a')).toMatchObject({ error: expect.stringMatching(/different official/) });
    expect(approveMapping('pharmacy-licence', 1, 'Admin B', 'b')).toMatchObject({ state: 'approved', legalBasis: [expect.objectContaining({ eId: 'sec_3' })] });
    expect(mappingInForce('pharmacy-licence', '2025-12-31')).toBeUndefined();
    expect(powerRefusal('pharmacy-licence', 'issue', 'min-health', resolve, { on: '2026-06-01' })).toBeNull();
    // A consulted authority advises; it never decides.
    expect(powerRefusal('pharmacy-licence', 'issue', 'local-council', resolve, { on: '2026-06-01' })).toMatch(/belongs to healthRegulation/);
  });

  it('refuses an approval without legal basis, and a change of lead without a handover plan', () => {
    draftMapping({ permitType: 'pharmacy-licence', title: 'Pharmacy licence', lead: 'healthRegulation', effectiveFrom: '2026-01-01' }, 'A', 'a');
    expect(approveMapping('pharmacy-licence', 1, 'B', 'b')).toMatchObject({ error: expect.stringMatching(/legal basis/) });
    withdrawMapping('pharmacy-licence', 1, 'Drafted without its basis', 'A');
    draftMapping({ permitType: 'pharmacy-licence', title: 'Pharmacy licence', lead: 'healthRegulation', effectiveFrom: '2026-01-01', legalBasis: [{ instrument: act, eId: 'sec_3' }] }, 'A', 'a');
    approveMapping('pharmacy-licence', 2, 'B', 'b');
    draftMapping({ permitType: 'pharmacy-licence', title: 'Pharmacy licence', lead: 'businessRegister', effectiveFrom: '2027-01-01', legalBasis: [{ instrument: act, eId: 'sec_3' }] }, 'A', 'a');
    expect(approveMapping('pharmacy-licence', 3, 'B', 'b')).toMatchObject({ error: expect.stringMatching(/handover plan/) });
    draftMapping({ permitType: 'pharmacy-licence', title: 'Pharmacy licence', lead: 'businessRegister', effectiveFrom: '2027-01-01', legalBasis: [{ instrument: act, eId: 'sec_3' }], handoverPlan: 'Open cases finish with the health regulator; new applications go to the business register from 1 January.' }, 'A', 'a');
    expect(approveMapping('pharmacy-licence', 4, 'B', 'b')).toMatchObject({ handover: { from: 'healthRegulation' } });
    // Each version governs its own period.
    expect(mappingInForce('pharmacy-licence', '2026-12-31')?.lead).toBe('healthRegulation');
    expect(mappingInForce('pharmacy-licence', '2027-01-01')?.lead).toBe('businessRegister');
  });

  it('ships proposed defaults as unapproved drafts that cannot be approved as they are', () => {
    const r = installProposedDefaults('Administrator');
    expect(r.drafted).toContain('building-permit');
    expect(listMappings().every(m => m.state === 'draft' && m.proposal)).toBe(true);
    expect(approveMapping('building-permit', 1, 'Someone else', 'x')).toMatchObject({ error: expect.stringMatching(/lead authority/) });
    expect(approveMapping('pharmacy-licence', 1, 'Someone else', 'x')).toMatchObject({ error: expect.stringMatching(/legal basis/) });
    expect(installProposedDefaults('Administrator').drafted).toEqual([]);
  });
});
