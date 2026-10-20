import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

let scope: { id: string; name: string; label: string; role: string; institution?: string } | null = null;
vi.mock('@/lib/auth/official', () => ({ caseScope: async () => scope }));
vi.mock('@/lib/casework/actor', () => ({ routeActor: async (by?: string) => ({ id: scope?.id ?? 'x', name: scope?.label ?? by ?? 'Official' }) }));

const { GET, POST } = await import('./route');
const { issueBill, listBills, payBill } = await import('@/lib/data/store/payments');
const { listAudit } = await import('@/lib/data/store/audit');

const post = (body: unknown) => POST(new Request('http://x', { method: 'POST', body: typeof body === 'string' ? body : JSON.stringify(body), headers: { 'content-type': 'application/json' } }) as never);
let n = 0;
const taxBill = (issuer: string) => issueBill({ kind: 'tax', description: 'income 2025', amountMinor: 5000, currency: 'KES', dueDate: '2026-12-31', reference: `tax:TEST-${++n}`, payer: { kind: 'person', id: `BR-${n}`, name: `Secret Taxpayer ${n}` }, issuer }, 'Tax official') as { id: string };

beforeEach(() => { scope = null; });
afterEach(() => vi.unstubAllEnvs());

describe('GET /api/payments', () => {
  it('returns general bills and receipts to everyone, and a tax bill only to the institution that issued it', async () => {
    const b = taxBill('ministry-of-finance');
    let json = await (await GET()).json();
    expect(json.bills.length).toBeGreaterThan(0);
    expect(Array.isArray(json.receipts)).toBe(true);
    expect(json.bills.some((x: { id: string }) => x.id === b.id)).toBe(false);
    expect(JSON.stringify(json)).not.toContain('Secret Taxpayer');
    scope = { id: 'o', name: 'O', label: 'Other ministry', role: 'signatory', institution: 'ministry-of-health' };
    json = await (await GET()).json();
    expect(json.bills.some((x: { id: string }) => x.id === b.id)).toBe(false);
    scope = { id: 't', name: 'T', label: 'Tax official', role: 'officer', institution: 'ministry-of-finance' };
    json = await (await GET()).json();
    expect(json.bills.some((x: { id: string }) => x.id === b.id)).toBe(true);
  });
});

describe('POST /api/payments (the stand-in payment)', () => {
  it('rejects invalid JSON and a missing billId', async () => {
    expect((await post('no')).status).toBe(400);
    expect((await post({})).status).toBe(422);
  });

  it('pays a general bill in a demonstration installation, simulated and attributed to who acted, once', async () => {
    const general = listBills().find(b => !b.payer && b.status !== 'paid')!;
    scope = { id: 's', name: 'S', label: 'Signed-in official', role: 'officer', institution: 'x' };
    const res = await post({ billId: general.id, rail: 'bank-transfer' });
    expect(res.status).toBe(201);
    expect((await res.json()).receipt).toMatchObject({ billId: general.id, rail: 'bank-transfer', simulated: true });
    expect(listAudit().find(e => e.action === 'payment.execute' && e.resource === `Bill:${general.id}`)?.actor).toBe('Signed-in official');
    expect((await post({ billId: general.id })).status).toBe(409);
  });

  it('never marks a tax or customs bill paid, and is refused entirely in production', async () => {
    const b = taxBill('ministry-of-finance');
    expect((await post({ billId: b.id })).status).toBe(409);
    expect(listBills().find(x => x.id === b.id)?.status).not.toBe('paid');
    vi.stubEnv('CIVICOS_MODE', 'production');
    const general = listBills().find(x => !x.payer && x.status !== 'paid');
    if (general) expect((await post({ billId: general.id })).status).toBe(409);
  });

  it('keeps payBill usable by the store (demonstration flows) with the simulated mark', () => {
    const b = taxBill('ministry-of-finance');
    expect(payBill(b.id, 'Test rail')).toMatchObject({ simulated: true, reference: expect.stringMatching(/^tax:/) });
  });
});
