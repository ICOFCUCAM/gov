import { asNationSets } from '@/lib/casework/testkit';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { openCase, act, attach, resetCases, registeredEffects, type Actor } from '@/lib/casework/engine';
import { draftPackage, approvePackage, resetPackages } from '@/lib/casework/packages';
import { addDocument, resetDocuments } from '@/lib/records/documents';
import { resetDecisions } from '@/lib/records/decisions';
import { setSovereign, listMinistries, listReceipts } from '@/lib/data/store';
import { payBill, listBills } from '@/lib/data/store/payments';
import { recordVersion, confirmVersion, resetLaw } from '@/lib/law/register';
import { draftRule, approveRule, resetRules } from '@/lib/law/rules';
import { CUSTOMS_PROCEDURES } from './procedures';
import { resetCustoms, declarationOfCase, reconcileCustomsPayments } from './register';

let CUS = '', OTHER = '';
const off = (id: string, role: 'officer' | 'signatory' = 'officer', inst = () => CUS): Actor => ({ id, name: `Customs ${id}`, scope: { id, role, institution: inst() } });
const pdf = new Uint8Array(Buffer.from('%PDF-1.7\nx\n%%EOF'));
const doc = (caseId: string, cls: string) => { const d = addDocument({ class: cls, title: cls, institution: CUS, belongsTo: { kind: 'case', id: caseId }, bytes: pdf }, 'Clerk') as { id: string }; attach(caseId, d.id, off('s0', 'signatory')); };
async function step(id: string, action: string, who: Actor, extra: Record<string, unknown> = {}) { const r = await act(id, { action, ...extra }, who); if ('error' in r) throw new Error(`${action}: ${r.error}`); return r; }
const FIELDS = { direction: 'import', declarantKind: 'organisation', declarantRef: 'ORG-2026-000003', declarantName: 'Harbour Traders', transportMode: 'sea', transportRef: 'MSCU7654321', dispatchCountry: 'CN', destinationCountry: 'KE', currency: 'KES', goods: '8471300000 | Laptop computers | CN | 20 u | 1500000\n6109100000 | Cotton T-shirts | CN | 500 u | 250000' };

describe('customs declaration procedure', () => {
  beforeEach(() => {
    for (const r of [resetCases, resetPackages, resetDocuments, resetDecisions, resetCustoms, resetLaw, resetRules]) r();
    vi.stubEnv('CIVICOS_DATA_KEK', Buffer.alloc(32, 7).toString('base64'));
    [CUS, OTHER] = listMinistries().slice(0, 2).map(m => m.id) as [string, string];
    setSovereign({ deployment: { authorities: { customs: CUS } } }, 'Administrator');
    for (const p of CUSTOMS_PROCEDURES) { const d = draftPackage(asNationSets(p), 'Author', 'a', registeredEffects()); if ('error' in d) throw new Error(d.error); const a = approvePackage(p.key, 1, 'Approver', 'b', '2026-01-01', registeredEffects(), new Date('2026-01-01')); if ('error' in a) throw new Error(a.error); }
  });

  async function lodged(extra: Record<string, unknown> = {}) {
    const c = openCase({ procedure: 'customs.declaration', fields: { ...FIELDS, ...extra } }, off('o1')) as { id: string };
    doc(c.id, 'commercial-invoice'); doc(c.id, 'transport-document');
    await step(c.id, 'check', off('o1'));
    return c.id;
  }

  it('assesses with the approved tariff where it covers a line and by hand with reasons where not, bills, reconciles and releases', async () => {
    const v = recordVersion({ instrument: { title: 'Customs Tariff Order (test)', type: 'regulation', jurisdiction: 'X', year: 2026, number: '1', issuingAuthority: 'Minister' }, dates: { inForce: '2026-01-01' }, provisions: [{ eId: 'sch_1', num: 'Schedule 1', text: 'Tariff.' }] }, 'L1', 'l1');
    if ('error' in v) throw new Error(v.error);
    confirmVersion(v.instrument.id, v.version.id, 'L2', 'l2');
    // A test tariff covering only chapter 84: the T-shirts must be entered by hand.
    expect(draftRule({ key: 'customs.tariff', title: 'Tariff (test)', kind: 'tariff', owner: 'customs', effectiveFrom: '2026-01-01', lines: [{ code: '84', rate: 10 }], citations: [{ instrument: v.instrument.id, eId: 'sch_1' }], tests: [{ name: 't', input: { amountMinor: 1000, code: '847130' }, expectMinor: 100 }] }, 'Tariff officer', 't1')).not.toHaveProperty('error');
    approveRule('customs.tariff', 1, 'Commissioner', 't2');
    const id = await lodged();
    await step(id, 'choose', off('o1'), { fields: { channel: 'documentary-check', channelReasons: 'Valuation looks low for the goods' } });
    doc(id, 'inspection-report');
    await step(id, 'inspect', off('o1'), { fields: { inspectionOutcome: 'no-discrepancy', findings: 'Invoices consistent with the transport document' } });
    expect(await act(id, { action: 'propose', reason: 'Checked' }, off('o1'))).toMatchObject({ error: expect.stringMatching(/Line 2 \(6109100000\)/) });
    await step(id, 'propose', off('o1'), { reason: 'Checked', fields: { enteredDuty: '2 | 62500', dutyReasons: 'Chapter 61 rate applied by the officer while that part of the tariff awaits approval' } });
    await step(id, 'assess', off('s1', 'signatory'), { reason: 'Duty as proposed' });
    await step(id, 'assess', off('s2', 'signatory'));
    const d = declarationOfCase(id)!;
    expect(d.assessment).toMatchObject({ totalMinor: 150000 + 62500, lines: [{ n: 1, dutyMinor: 150000, method: { kind: 'rule', rule: 'customs.tariff', version: 1 } }, { n: 2, dutyMinor: 62500, method: { kind: 'entered' } }] });
    await step(id, 'notify', off('o1'), { fields: { dueDate: '2026-11-15' } });
    expect(await act(id, { action: 'release', reason: 'Clear' }, off('s1', 'signatory'))).toMatchObject({ error: expect.stringMatching(/unpaid/) });
    const bill = listBills().find(b => b.reference === d.assessment!.reference)!;
    expect(bill).toMatchObject({ kind: 'customs-duty', amountMinor: 212500, payer: { id: 'ORG-2026-000003' } });
    payBill(bill.id, 'Test rail');
    reconcileCustomsPayments(listReceipts());
    await step(id, 'release', off('s1', 'signatory'), { reason: 'Duty paid, documents in order' });
    expect(declarationOfCase(id)!.state).toBe('released');
  });

  it('needs an officer\'s reasons for the channel, refuses release with four eyes, and is closed to other institutions', async () => {
    const id = await lodged();
    expect(await act(id, { action: 'choose', fields: { channel: 'physical-inspection' } }, off('o1'))).toHaveProperty('error');
    await step(id, 'choose', off('o1'), { fields: { channel: 'physical-inspection', channelReasons: 'Goods description vague' } });
    doc(id, 'inspection-report');
    await step(id, 'inspect', off('o1'), { fields: { inspectionOutcome: 'discrepancy', findings: 'Undeclared goods in the container' } });
    expect(await act(id, { action: 'assess' }, off('x', 'signatory', () => OTHER))).toHaveProperty('error');
    expect(await step(id, 'refuse', off('s1', 'signatory'), { reason: 'Goods do not match the declaration' })).toMatchObject({ pending: true });
    await step(id, 'refuse', off('s2', 'signatory'));
    expect(declarationOfCase(id)!.state).toBe('release-refused');
    // The engine's fields hold no risk score; nothing chooses a channel but an officer.
    expect(JSON.stringify(CUSTOMS_PROCEDURES)).not.toMatch(/risk|score/i);
  });
});
