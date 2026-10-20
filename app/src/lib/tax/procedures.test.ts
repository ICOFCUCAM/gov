import { describe, it, expect, beforeEach, vi } from 'vitest';
import { openCase, act, attach, resetCases, registeredEffects, type Actor } from '@/lib/casework/engine';
import { draftPackage, approvePackage, resetPackages } from '@/lib/casework/packages';
import { addDocument, resetDocuments } from '@/lib/records/documents';
import { resetDecisions } from '@/lib/records/decisions';
import { setSovereign, listMinistries, listReceipts } from '@/lib/data/store';
import { payBill, listBills } from '@/lib/data/store/payments';
import { recordVersion, confirmVersion, resetLaw } from '@/lib/law/register';
import { draftRule, approveRule, resetRules } from '@/lib/law/rules';
import { TAX_PROCEDURES } from './procedures';
import { resetTax, findTaxpayers, account, reconcileTaxPayments, assessmentOfCase } from './register';

let TAX = '';
const off = (id: string, role: 'officer' | 'signatory' = 'officer'): Actor => ({ id, name: `Tax ${id}`, scope: { id, role, institution: TAX } });
const pdf = new Uint8Array(Buffer.from('%PDF-1.7\nx\n%%EOF'));
const doc = (caseId: string, cls: string) => { const d = addDocument({ class: cls, title: cls, institution: TAX, belongsTo: { kind: 'case', id: caseId }, bytes: pdf }, 'Clerk') as { id: string }; attach(caseId, d.id, off('s0', 'signatory')); };
async function step(id: string, action: string, who: Actor, extra: Record<string, unknown> = {}) { const r = await act(id, { action, ...extra }, who); if ('error' in r) throw new Error(`${action}: ${r.error}`); return r; }

describe('tax procedures', () => {
  beforeEach(() => {
    for (const r of [resetCases, resetPackages, resetDocuments, resetDecisions, resetTax, resetLaw, resetRules]) r();
    vi.stubEnv('CIVICOS_DATA_KEK', Buffer.alloc(32, 7).toString('base64'));
    TAX = listMinistries()[0]!.id;
    setSovereign({ deployment: { authorities: { tax: TAX } } }, 'Administrator');
    for (const p of TAX_PROCEDURES) { draftPackage(p, 'Author', 'a', registeredEffects()); const a = approvePackage(p.key, 1, 'Approver', 'b', '2026-01-01', registeredEffects(), new Date('2026-01-01')); if ('error' in a) throw new Error(a.error); }
  });

  async function taxpayer() {
    const c = openCase({ procedure: 'tax.registration', fields: { partyKind: 'organisation', partyRef: 'ORG-2026-000009', partyName: 'Hill Traders', taxTypes: 'income' } }, off('o1')) as { id: string };
    doc(c.id, 'identity-evidence');
    await step(c.id, 'verify', off('o1')); await step(c.id, 'propose', off('o1'));
    await step(c.id, 'register', off('s1', 'signatory'), { reason: 'Verified' });
    return findTaxpayers({ party: 'ORG-2026-000009' })[0]!;
  }
  async function returnCase(tin: string, extra: Record<string, unknown> = {}) {
    const c = openCase({ procedure: 'tax.return', fields: { tin, taxType: 'income', period: '2025', baseMinor: 2_000_000, ...extra } }, off('o1')) as { id: string };
    doc(c.id, 'return-form');
    await step(c.id, 'check', off('o1'));
    return c.id;
  }

  it('assesses with an amount entered with reasons while no rule is approved, bills it and reconciles the payment', async () => {
    const t = await taxpayer();
    const id = await returnCase(t.tin);
    expect(await act(id, { action: 'propose', reason: 'Checked' }, off('o1'))).toMatchObject({ error: expect.stringMatching(/No approved rule tax.income/) });
    await step(id, 'propose', off('o1'), { reason: 'Checked', fields: { assessedMinor: 300_000, assessmentReasons: 'Assessed under the Act by hand while the rate table awaits approval' } });
    await step(id, 'assess', off('s1', 'signatory'), { reason: 'Return accepted' });
    await step(id, 'assess', off('s2', 'signatory'));
    const a = assessmentOfCase(id)!;
    expect(a).toMatchObject({ amountMinor: 300_000, method: { kind: 'entered' } });
    expect(await act(id, { action: 'issue' }, off('o1'))).toHaveProperty('error');
    await step(id, 'issue', off('o1'), { fields: { dueDate: '2026-12-31' } });
    const bill = listBills().find(b => b.reference === a.reference)!;
    expect(bill).toMatchObject({ amountMinor: 300_000, payer: { name: 'Hill Traders' } });
    payBill(bill.id, 'Test rail');
    reconcileTaxPayments(listReceipts());
    expect(account(t.id, 'income').balanceMinor).toBe(0);
  });

  it('calculates with the approved rule in force and cites it', async () => {
    const v = recordVersion({ instrument: { title: 'Income Tax Act', type: 'act', jurisdiction: 'X', year: 2025, number: '9', issuingAuthority: 'Parliament' }, dates: { inForce: '2025-01-01' }, provisions: [{ eId: 'sch_1', num: 'Schedule 1', text: 'Rates.' }] }, 'L1', 'l1');
    if ('error' in v) throw new Error(v.error);
    confirmVersion(v.instrument.id, v.version.id, 'L2', 'l2');
    draftRule({ key: 'tax.income', title: 'Income tax rates (test)', kind: 'flat-rate', owner: 'tax', effectiveFrom: '2025-01-01', rate: 12.5, citations: [{ instrument: v.instrument.id, eId: 'sch_1' }], tests: [{ name: 't', input: { amountMinor: 1000 }, expectMinor: 125 }] }, 'Rates officer', 'r1');
    approveRule('tax.income', 1, 'Commissioner', 'r2');
    const t = await taxpayer();
    const id = await returnCase(t.tin);
    await step(id, 'propose', off('o1'), { reason: 'Checked' });
    await step(id, 'assess', off('s1', 'signatory'), { reason: 'ok' });
    await step(id, 'assess', off('s2', 'signatory'));
    expect(assessmentOfCase(id)).toMatchObject({ amountMinor: 250_000, method: { kind: 'rule', rule: 'tax.income', version: 1, citations: [expect.objectContaining({ eId: 'sch_1' })] } });
  });
});
