import { describe, it, expect, beforeEach, vi } from 'vitest';
import { registerTaxpayer, fileReturn, recordAssessment, varyAssessment, account, reconcileTaxPayments, getReturn, resetTax, taxCounts } from './register';

describe('tax register', () => {
  beforeEach(() => resetTax());

  it('registers a taxpayer once, files and amends a return, assesses, posts payments once and varies on objection', () => {
    const t = registerTaxpayer({ party: { kind: 'organisation', id: 'ORG-2026-000001', name: 'Riverside Ltd' }, taxTypes: ['income', 'value-added'] }, 'c1', 'Officer', new Date('2026-02-01'));
    if ('error' in t) throw new Error(t.error);
    expect(t.tin).toBe('TIN-2026-000001');
    expect(registerTaxpayer({ party: { kind: 'organisation', id: 'ORG-2026-000001', name: 'Riverside Ltd' }, taxTypes: ['income'] }, 'c2', 'O')).toHaveProperty('error');
    expect(fileReturn({ tin: t.tin, taxType: 'customs', period: '2026', baseMinor: 1, currency: 'USD' }, 'c', 'O')).toMatchObject({ error: expect.stringMatching(/not registered for customs/) });
    expect(fileReturn({ tin: t.tin, taxType: 'income', period: '26', baseMinor: 1, currency: 'USD' }, 'c', 'O')).toMatchObject({ error: expect.stringMatching(/period/) });
    const r = fileReturn({ tin: t.tin, taxType: 'income', period: '2025', baseMinor: 1_000_000, currency: 'USD' }, 'c3', 'Taxpayer') as { id: string };
    fileReturn({ tin: t.tin, taxType: 'income', period: '2025', baseMinor: 900_000, currency: 'USD', reason: 'Corrected costs' }, 'c4', 'Taxpayer');
    expect(getReturn(r.id)!.versions.map(v => v.baseMinor)).toEqual([1_000_000, 900_000]);
    expect(recordAssessment({ taxpayer: t.id, taxType: 'income', period: '2025', returnId: r.id, baseMinor: 900_000, amountMinor: 90_000, currency: 'USD', method: { kind: 'entered', reasons: '' }, case: 'c5', by: 'Assessor' })).toHaveProperty('error');
    const a = recordAssessment({ taxpayer: t.id, taxType: 'income', period: '2025', returnId: r.id, baseMinor: 900_000, amountMinor: 90_000, currency: 'USD', method: { kind: 'entered', reasons: 'No approved rule yet; computed under the Act by the assessor' }, case: 'c5', by: 'Assessor' });
    if ('error' in a) throw new Error(a.error);
    expect(getReturn(r.id)!.state).toBe('assessed');
    const receipts = [{ id: 'PR-1', reference: a.reference, amountMinor: 40_000, currency: 'USD', paidAt: '2026-03-01T00:00:00Z', rail: 'Bank' }, { id: 'PR-2', reference: 'tax:NOPE', amountMinor: 1, currency: 'USD', paidAt: '2026-03-01T00:00:00Z', rail: 'Bank' }];
    expect(reconcileTaxPayments(receipts)).toEqual({ posted: 1, unmatched: ['PR-2'] });
    expect(reconcileTaxPayments(receipts).posted).toBe(0);
    expect(account(t.id, 'income').balanceMinor).toBe(50_000);
    varyAssessment(a.id, 70_000, 'Objection upheld in part', 'c6', 'Objections officer');
    expect(account(t.id, 'income').balanceMinor).toBe(30_000);
    expect(taxCounts()).toMatchObject({ taxpayers: { 'organisation:active': 1 }, assessments: { entered: 1 } });
  });

  it('never posts a stand-in payment in production', () => {
    const t = registerTaxpayer({ party: { kind: 'person', id: 'BR-77', name: 'P' }, taxTypes: ['income'] }, 'c1', 'Officer') as { id: string; tin: string };
    const a = recordAssessment({ taxpayer: t.id, taxType: 'income', period: '2025', baseMinor: 1000, amountMinor: 100, currency: 'USD', method: { kind: 'entered', reasons: 'r' }, case: 'c2', by: 'Assessor' }) as { reference: string };
    vi.stubEnv('CIVICOS_MODE', 'production');
    expect(reconcileTaxPayments([{ id: 'PR-s', reference: a.reference, amountMinor: 100, currency: 'USD', paidAt: '2026-01-01', rail: 'stand-in', simulated: true }]).posted).toBe(0);
    expect(account(t.id, 'income').balanceMinor).toBe(100);
    vi.unstubAllEnvs();
  });
});
