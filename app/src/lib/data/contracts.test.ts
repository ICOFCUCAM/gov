import { describe, it, expect, beforeEach } from 'vitest';
import { resetUpdates, getChamber, nationRecord, enrolNation, HOME_NATION } from './updates';
import { resetSecurity, createQuote, orderAction } from './security-store';
import { resetSupport, supportTier } from './support';
import { resetHosting } from './hosting';
import { listAudit } from './store';
import { resetContracts, contractFor, publisherContractAction, nationContractAction, TIER_UPLIFT } from './contracts';
import { HOSTING_MODEL } from '@/lib/updates/hosting-model';
import { GET as cGET, POST as cPOST } from '@/app/api/releases/contract/route';
import { GET as pubGET } from '@/app/api/releases/publisher/contracts/route';

const ok = <T,>(r: T): Exclude<T, { error: string }> => { if (r && typeof r === 'object' && 'error' in r) throw new Error((r as { error: string }).error); return r as Exclude<T, { error: string }>; };
const key = (id: string) => { const c = getChamber(id); if ('error' in c) throw new Error(c.error); return c.nation.channelKey; };
const json = (url: string, body: unknown) => new Request(url, { method: 'POST', body: JSON.stringify(body), headers: { 'content-type': 'application/json' } }) as never;
const home = () => nationRecord(HOME_NATION)!;
const sandbox = () => nationRecord('sandbox')!;

beforeEach(() => { resetUpdates(); resetSecurity(); resetSupport(); resetHosting(); resetContracts(); });

describe('contracts are consistent with the systems that hold the facts', () => {
  it('kind follows the hosting path; the fee comes from the hosting cost model and the support tier', () => {
    const sb = contractFor(sandbox(), 'Sandbox');
    expect(sb).toMatchObject({ kind: 'hosted-subscription', hostingPath: 'hosted', plan: 'standard', supportTier: 'standard', currency: 'USD' });
    const p = HOSTING_MODEL.hosted.plans.standard;
    expect(sb.annualFee).toBe(Math.round(p.base + p.perCitizen * 1_000_000));
    const h = contractFor(home(), 'Home');
    expect(h.kind).toBe('self-run-subscription'); // self-hosted, no hosted path
    expect(h.supportTier).toBe(supportTier(HOME_NATION));
    const base = (HOSTING_MODEL.perpetual.base + HOSTING_MODEL.perpetual.perCitizen * 8_000_000) * (HOSTING_MODEL.perpetual.supportPct + HOSTING_MODEL.perpetual.updatesPct);
    expect(h.annualFee).toBe(Math.round(base * (1 + TIER_UPLIFT.enterprise)));
  });

  it('changing the tier through the contract changes the support desk, and the fee', () => {
    const before = contractFor(sandbox(), 'Sandbox').annualFee;
    ok(publisherContractAction(sandbox(), { action: 'set-tier', tier: 'sovereign', by: 'Account manager' }));
    expect(supportTier('sandbox')).toBe('sovereign');
    expect(contractFor(sandbox(), 'Sandbox').annualFee).toBe(Math.round(before * (1 + TIER_UPLIFT.sovereign)));
  });

  it('billing shows platform invoices and the security store’s own invoices', () => {
    const q = createQuote(home(), { productId: 'SEC-EDR', edition: 'standard', seats: 10, years: 1, by: 'CISO' });
    if ('error' in q) throw new Error(q.error);
    ok(orderAction(home(), q.id, { action: 'order', by: 'CISO', poNumber: 'PO-77' }));
    const c = contractFor(home(), 'Home');
    expect(c.invoices.some(i => i.source === 'platform' && i.status === 'paid')).toBe(true);
    const sec = c.invoices.find(i => i.source === 'security-store');
    expect(sec).toBeTruthy();
    expect(sec!.amount).toBeGreaterThan(0);
  });

  it('prices in the nation’s currency only once a contract rate is set', () => {
    const n = enrolNation({ name: 'Coast republic', deliveryMode: 'saas', installedVersion: '1.4.0', currency: 'EUR', by: 'P' });
    if ('error' in n) throw new Error(n.error);
    expect(contractFor(nationRecord(n.id)!, n.name)).toMatchObject({ currency: 'USD', localPricing: false });
  });
});

describe('renewal is proposed by the publisher and accepted by a named official — never automatic', () => {
  it('the home contract is in its notice period; acceptance extends the term and is audited', () => {
    const c = contractFor(home(), 'Home');
    expect(c.renewal.status).toBe('notice-period');
    expect(nationContractAction(home(), { action: 'accept-renewal', by: 'Minister' })).toMatchObject({ status: 409 });
    expect(publisherContractAction(home(), { action: 'propose-renewal', years: 2, by: 'Sales' })).toMatchObject({ status: 422 });
    ok(publisherContractAction(home(), { action: 'propose-renewal', years: 5, by: 'Account manager' }));
    const p = contractFor(home(), 'Home');
    expect(p.renewal.status).toBe('proposed');
    expect(p.renewal.proposal!.annualFee).toBe(Math.round(c.annualFee * (1 - HOSTING_MODEL.hosted.fiveYearDiscountPct / 100)));
    ok(nationContractAction(home(), { action: 'accept-renewal', by: 'Permanent Secretary, ICT' }));
    const r = contractFor(home(), 'Home');
    expect(r.term.years).toBe(6);
    expect(r.renewal).toMatchObject({ status: 'renewed', acceptedBy: 'Permanent Secretary, ICT' });
    expect(listAudit()[0]).toMatchObject({ action: 'contract.renewal.accept' });
  });

  it('seats cannot drop below those in use; payments need a reference', () => {
    expect(publisherContractAction(home(), { action: 'set-seats', licensed: 10, by: 'AM' })).toMatchObject({ status: 422 });
    ok(publisherContractAction(home(), { action: 'set-seats', licensed: 2000, by: 'AM' }));
    expect(contractFor(home(), 'Home').seats.licensed).toBe(2000);
    expect(publisherContractAction(home(), { action: 'mark-paid', invoiceId: 'nope', reference: 'x', by: 'AM' })).toMatchObject({ status: 404 });
  });
});

describe('routes', () => {
  it('a nation sees only its own contract; the publisher sees all', async () => {
    const mine = await (await cGET(new Request('http://x') as never)).json();
    expect(mine.contract.nationId).toBe(HOME_NATION);
    const sb = await (await cGET(new Request(`http://x?link=${key('sandbox')}`) as never)).json();
    expect(sb.contract.nationId).toBe('sandbox');
    expect((await cPOST(json('http://x', { action: 'request-change', by: 'CIO', note: 'Add the land registry module' }))).status).toBe(200);
    const all = await (await pubGET(new Request('http://x') as never)).json();
    expect(all.contracts.map((c: { nationId: string }) => c.nationId).sort()).toEqual([HOME_NATION, 'sandbox']);
  });
});
