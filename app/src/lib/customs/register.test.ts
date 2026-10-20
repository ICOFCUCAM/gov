import { describe, it, expect, beforeEach, vi } from 'vitest';
import { resetCustoms, lodgeDeclaration, parseGoods, chooseChannel, recordCustomsInspection, recordDuty, releaseGoods, reconcileCustomsPayments, getDeclaration, amendGoods, releaseBlocker } from './register';

const goods = '0901110000 | Green coffee beans | ET | 1200 kg | 480000\n8471300000 | Laptop computers | CN | 20 u | 1500000';
const base = { direction: 'import', declarant: { kind: 'organisation', ref: 'ORG-2026-000003', name: 'Harbour Traders' }, shipment: { mode: 'sea', transportRef: 'MSCU1234567', from: 'ET', to: 'KE' }, currency: 'KES', goods };

describe('customs register', () => {
  beforeEach(() => resetCustoms());

  it('reads goods lines strictly and never guesses', () => {
    expect(parseGoods(goods)).toHaveLength(2);
    expect(parseGoods('12 | x | ET | 1 kg | 5')).toMatchObject({ error: /4 to 12 digits/ });
    expect(parseGoods('0901 | x | Ethiopia | 1 kg | 5')).toMatchObject({ error: /two-letter/ });
    expect(parseGoods('0901 | x | ET | lots | 5')).toMatchObject({ error: /quantity/ });
    expect(parseGoods('0901 | x | ET | 1 kg | 5.50')).toMatchObject({ error: /whole number/ });
  });

  it('releases only when assessed, inspected as chosen, and paid; payments post once', () => {
    const d = lodgeDeclaration(base, 'case-1', 'Officer') as { number: string };
    expect(lodgeDeclaration(base, 'case-2', 'Officer')).toMatchObject({ error: /already lodged/ });
    expect(amendGoods(d.number, goods.replace('Laptop computers', 'Notebook computers'), 'Description corrected', 'case-1', 'Officer')).toMatchObject({ versions: [{}, { n: 2 }] });
    expect(chooseChannel(d.number, 'red', 'x', 'Officer')).toMatchObject({ error: /channel is one of/ });
    expect(chooseChannel(d.number, 'physical-inspection', '', 'Officer')).toMatchObject({ error: /why/ });
    chooseChannel(d.number, 'physical-inspection', 'First consignment from this declarant', 'Officer');
    recordDuty(d.number, [{ n: 1, code: '0901110000', valueMinor: 480000, dutyMinor: 0, method: { kind: 'entered', reasons: 'Exempt under the schedule (entered by hand)' } }, { n: 2, code: '8471300000', valueMinor: 1500000, dutyMinor: 75000, method: { kind: 'entered', reasons: 'Rate applied by the officer pending the approved tariff' } }], 'case-1', 'Assessor');
    expect(amendGoods(d.number, goods, 'late', 'case-1', 'Officer')).toMatchObject({ error: /before the duty is assessed/ });
    expect(releaseBlocker(getDeclaration(d.number)!)).toMatch(/has not been recorded/);
    recordCustomsInspection(d.number, { outcome: 'discrepancy', findings: 'Two cartons more than declared' }, 'case-1', 'Inspector');
    expect(releaseGoods(d.number, 'ok', 'case-1', 'Officer')).toMatchObject({ error: /discrepancy/ });
    recordCustomsInspection(d.number, { outcome: 'no-discrepancy', findings: 'Recount matches the corrected invoice' }, 'case-1', 'Inspector');
    expect(releaseGoods(d.number, 'ok', 'case-1', 'Officer')).toMatchObject({ error: /unpaid/ });
    const ref = getDeclaration(d.number)!.assessment!.reference;
    const receipt = { id: 'PR-1', reference: ref, amountMinor: 75000, currency: 'KES' };
    expect(reconcileCustomsPayments([receipt, receipt])).toEqual({ posted: 1, unmatched: [] });
    expect(reconcileCustomsPayments([receipt])).toEqual({ posted: 0, unmatched: [] });
    expect(releaseGoods(d.number, 'Duty paid, inspection clear', 'case-1', 'Officer')).toMatchObject({ state: 'released' });
  });

  it('never counts a stand-in payment in production, only a real transfer', () => {
    const d = lodgeDeclaration(base, 'case-p', 'Officer') as { number: string };
    chooseChannel(d.number, 'release-on-documents', 'Regular trader', 'Officer');
    recordDuty(d.number, [{ n: 1, code: '0901110000', valueMinor: 480000, dutyMinor: 1000, method: { kind: 'entered', reasons: 'r' } }, { n: 2, code: '8471300000', valueMinor: 1500000, dutyMinor: 0, method: { kind: 'entered', reasons: 'r' } }], 'case-p', 'Assessor');
    const ref = getDeclaration(d.number)!.assessment!.reference;
    vi.stubEnv('CIVICOS_MODE', 'production');
    expect(reconcileCustomsPayments([{ id: 'PR-sim', reference: ref, amountMinor: 1000, currency: 'KES', simulated: true }])).toEqual({ posted: 0, unmatched: [] });
    expect(releaseGoods(d.number, 'ok', 'case-p', 'Officer')).toMatchObject({ error: /unpaid/ });
    expect(reconcileCustomsPayments([{ id: 'PR-bank', reference: ref, amountMinor: 1000, currency: 'KES' }])).toEqual({ posted: 1, unmatched: [] });
    expect(releaseGoods(d.number, 'Paid by bank transfer', 'case-p', 'Officer')).toMatchObject({ state: 'released' });
    vi.unstubAllEnvs();
  });

  it('keeps every channel choice and never lets a discrepancy be followed by release on documents', () => {
    const d = lodgeDeclaration({ ...base, shipment: { ...base.shipment, transportRef: 'BL-DOWN' } }, 'case-d', 'Officer A') as { number: string };
    chooseChannel(d.number, 'physical-inspection', 'Suspicious', 'Officer A');
    recordCustomsInspection(d.number, { outcome: 'discrepancy', findings: 'Undeclared goods' }, 'case-d', 'Inspector');
    amendGoods(d.number, goods, 'Corrected lines', 'case-d', 'Officer B');
    expect(chooseChannel(d.number, 'release-on-documents', 'Changed my mind', 'Officer B')).toMatchObject({ error: /raised, not lowered/ });
    expect(chooseChannel(d.number, 'documentary-check', 'Lower', 'Officer B')).toMatchObject({ error: /raised, not lowered/ });
    recordDuty(d.number, [{ n: 1, code: '0901110000', valueMinor: 480000, dutyMinor: 0, method: { kind: 'entered', reasons: 'r' } }, { n: 2, code: '8471300000', valueMinor: 1500000, dutyMinor: 0, method: { kind: 'entered', reasons: 'r' } }], 'case-d', 'Assessor');
    expect(releaseGoods(d.number, 'ok', 'case-d', 'Signer')).toMatchObject({ error: /discrepancy/ });
    // Before any inspection a choice can be changed, and every choice is kept.
    const e = lodgeDeclaration({ ...base, shipment: { ...base.shipment, transportRef: 'BL-KEEP' } }, 'case-e', 'Officer A') as { number: string };
    chooseChannel(e.number, 'physical-inspection', 'First view', 'Officer A');
    chooseChannel(e.number, 'documentary-check', 'Supervisor review: documents suffice', 'Supervisor');
    expect(getDeclaration(e.number)!.channels!.map(c => c.kind)).toEqual(['physical-inspection', 'documentary-check']);
  });
});
