import { describe, it, expect, beforeEach } from 'vitest';
import { resetReadiness } from '@/lib/data/readiness';
import { stagingOff } from '@/lib/data/testkit';
import {
  resetSecurity, createQuote, orderAction, securityGate, registerByo, registerSoftware, definitions, applyDefinitions,
  posture, securityDownload, listOrders, pricing, setStorePolicy, securityCenter,
} from './security-store';
import { resetUpdates, nationRecord, decide, updateSettings, HOME_NATION } from './updates';
import { listAudit } from './store';
import type { SecurityOrder } from '@/lib/api/types';

const DAY = 86_400_000;
const home = () => nationRecord(HOME_NATION)!;
const ok = <T,>(r: T): Exclude<T, { error: string }> => { if (r && typeof r === "object" && "error" in r) throw new Error((r as { error: string }).error); return r as Exclude<T, { error: string }>; };
const byo = (over: Record<string, unknown> = {}) => ({
  product: 'Own EDR', vendor: 'National CERT', version: '4.1', category: 'edr', servers: 48, endpoints: 1250,
  lastScanAt: new Date().toISOString(), attestation: 'Full estate scan, no critical findings outstanding.', scope: 'estate', by: 'CISO', ...over,
});
function buy(productId = 'SEC-EDR', seats = 48): SecurityOrder {
  const q = ok(createQuote(home(), { productId, edition: 'standard', seats, years: 1, by: 'CIO' }));
  ok(orderAction(home(), q.id, { action: 'order', poNumber: 'PO-2026-0091', by: 'CIO' }));
  return ok(orderAction(home(), q.id, { action: 'pay', paymentReference: 'TRF-88120', by: 'Accountant General' }));
}

beforeEach(() => { resetUpdates(); resetReadiness(); stagingOff(); resetSecurity(); });

describe('paid flow: quote → order → invoice → payment → licence', () => {
  it('prices in the nation’s currency and issues a licence only on payment, auditing each step', () => {
    const q = ok(createQuote(home(), { productId: 'SEC-EDR', edition: 'advanced', seats: 100, years: 3, by: 'CIO' }));
    expect(q).toMatchObject({ stage: 'quote', currency: 'USD', unitPrice: 190, total: 190 * 100 * 3 * 0.9 });
    expect(q.licence).toBeUndefined();
    expect(orderAction(home(), q.id, { action: 'pay', by: 'AG' })).toMatchObject({ status: 409 }); // no invoice yet
    expect(orderAction(home(), q.id, { action: 'order', by: 'CIO' })).toMatchObject({ status: 422 }); // PO required
    const o = ok(orderAction(home(), q.id, { action: 'order', poNumber: 'PO-77', by: 'CIO' }));
    expect(o.stage).toBe('invoiced');
    expect(o.invoice!.amount).toBe(q.total);
    expect(securityDownload(home(), q.id)).toMatchObject({ status: 403 }); // downloads locked until paid
    expect(orderAction(home(), q.id, { action: 'pay', by: 'Accountant General' })).toMatchObject({ status: 422 }); // payment reference required
    const paid = ok(orderAction(home(), q.id, { action: 'pay', paymentReference: 'TRF-2026-4410', by: 'Accountant General' }));
    expect(paid.stage).toBe('active');
    expect(paid.payment).toMatchObject({ method: 'transfer', reference: 'TRF-2026-4410' });
    expect(paid.licence!.key).toMatch(/^[0-9A-F]{4}(-[0-9A-F]{4}){3}$/);
    expect(paid.licence!.seats).toBe(100);
    expect(paid.payment!.rail).toBeTruthy();
    expect(paid.history.map(h => h.to)).toEqual(['quote', 'ordered', 'invoiced', 'active']);
    expect(securityDownload(home(), q.id)).toMatchObject({ placeholder: true, licence: { key: paid.licence!.key } });
    const actions = listAudit().slice(0, 6).map(a => a.action);
    expect(actions).toEqual(expect.arrayContaining(['security.licence.issue', 'security.payment', 'security.invoice', 'security.order']));
  });

  it('quotes in the reference currency until a contract rate exists', () => {
    const n = { ...home(), currency: 'EUR', contractRate: undefined };
    expect(pricing(n)).toEqual({ currency: 'USD', rate: 1, local: false });
    expect(pricing({ ...n, contractRate: 0.92 })).toEqual({ currency: 'EUR', rate: 0.92, local: true });
  });

  it('validates quotes', () => {
    expect(createQuote(home(), { productId: 'NOPE', edition: 'standard', seats: 1, by: 'x' })).toHaveProperty('error');
    expect(createQuote(home(), { productId: 'SEC-EDR', edition: 'gold', seats: 1, by: 'x' })).toHaveProperty('error');
    expect(createQuote(home(), { productId: 'SEC-EDR', edition: 'standard', seats: 0, by: 'x' })).toHaveProperty('error');
    expect(createQuote(home(), { productId: 'SEC-EDR', edition: 'standard', seats: 1, years: 5, by: 'x' })).toHaveProperty('error');
  });

  it('licences expire, and renewals start when the old licence ends', () => {
    const o = buy();
    const later = Date.parse(o.licence!.expiresAt) + DAY;
    expect(listOrders(HOME_NATION, later).find(x => x.id === o.id)!.stage).toBe('expired');
    const r = ok(orderAction(home(), o.id, { action: 'renew', by: 'CIO' }, Date.parse(o.licence!.expiresAt) - 10 * DAY));
    expect((r as SecurityOrder).renewalOf).toBe(o.id);
  });

  it('security software upgrades are a decision, never automatic', () => {
    const o = buy();
    expect(o.installedVersion).toBeUndefined();
    const i = ok(orderAction(home(), o.id, { action: 'install-software', by: 'Ops' }));
    expect(i.installedVersion).toBe('5.4.1');
    expect(listAudit()[0]!.action).toBe('security.software.install');
  });
});

describe('the security rule', () => {
  it('at seed, the installed nation has only own-software tooling: the estate is reported uncovered', () => {
    const g = securityGate(home());
    expect(g).toMatchObject({ mode: 'byo', platformCovered: false, nationSoftwareCovered: true });
  });

  it('security coverage never blocks an update — security or feature, paid or not', () => {
    expect(securityGate(home()).platformCovered).toBe(false);
    decide(HOME_NATION, 'DR-141', { action: 'approve', by: 'CIO' });
    decide(HOME_NATION, 'DR-141', { action: 'prepare', by: 'Ops' });
    expect(decide(HOME_NATION, 'DR-141', { action: 'install', by: 'Ops', mode: 'self-hosted', verified: true })).not.toHaveProperty('error');
  });

  it('a lapsed licence does not block installing a security release either', () => {
    resetSecurity();
    const o = listOrders(HOME_NATION)[0]!; // the backup licence
    o.licence!.expiresAt = new Date(Date.now() - DAY).toISOString();
    decide(HOME_NATION, 'DR-141', { action: 'approve', by: 'CIO' });
    decide(HOME_NATION, 'DR-141', { action: 'prepare', by: 'Ops' });
    expect(decide(HOME_NATION, 'DR-141', { action: 'install', by: 'Ops', mode: 'self-hosted', verified: true })).not.toHaveProperty('error');
  });

  it('an active host EDR licence covers the estate', () => {
    buy('SEC-EDR', 48);
    expect(securityGate(home())).toMatchObject({ mode: 'subscription', platformCovered: true });
  });

  it('a fresh estate-wide BYO attestation satisfies it without any purchase', () => {
    ok(registerByo(home(), byo()));
    expect(securityGate(home())).toMatchObject({ mode: 'byo', platformCovered: true });
  });

  it('a stale estate attestation does not', () => {
    ok(registerByo(home(), byo({ lastScanAt: new Date(Date.now() - 45 * DAY).toISOString() })));
    expect(securityGate(home()).platformCovered).toBe(false);
  });

  it('nation-supplied software can be registered on BYO alone; with nothing it is refused', () => {
    expect(ok(registerSoftware(home(), { name: 'Courts calendar module', version: '0.3.0', kind: 'module', by: 'National IT' })).securedBy).toBe('byo');
    const bare = { ...nationRecord('sandbox')!, id: 'nobody' };
    expect(registerSoftware(bare, { name: 'X module', version: '1', kind: 'module', by: 'a' })).toHaveProperty('error');
  });

  it('validates BYO registrations', () => {
    expect(registerByo(home(), byo({ attestation: 'ok' }))).toHaveProperty('error');
    expect(registerByo(home(), byo({ scope: 'everything' }))).toHaveProperty('error');
    expect(registerByo(home(), byo({ lastScanAt: new Date(Date.now() + 5 * DAY).toISOString() }))).toHaveProperty('error');
  });
});

describe('definitions are data', () => {
  it('apply automatically by default — the included baseline is always on, paid or not', () => {
    const d = definitions(home());
    expect(d).toMatchObject({ policy: 'automatic', automaticActive: true });
    expect(d.installed).toBe(d.latest);
  });

  it('a manual policy waits for a person', () => {
    buy();
    ok(updateSettings(HOME_NATION, { definitionsPolicy: 'manual' }, 'CISO'));
    const later = Date.now() + 2 * DAY;
    const d = definitions(home(), later);
    expect(d.automaticActive).toBe(false);
    expect(d.installed).not.toBe(d.latest);
    const applied = ok(applyDefinitions(home(), 'CISO', later));
    expect(applied.installed).toBe(applied.latest);
  });
});

describe('posture', () => {
  it('grades coverage, definitions, scans and advisories', () => {
    const weak = posture(home(), [{ releaseId: 'DR-141', version: '1.4.1', title: 'Security update' }]);
    expect(['C', 'D', 'E']).toContain(weak.grade);
    expect(weak.findings.join(' ')).toMatch(/baseline scanning only/);
    expect(weak.lastScanAt).toBeTruthy(); // baseline scanning runs for every nation
    ok(registerByo(home(), byo()));
    buy();
    const strong = posture(home(), []);
    expect(strong.score).toBeGreaterThan(weak.score);
    expect(['A', 'B']).toContain(strong.grade);
    expect(strong.coverage.endpoints).toEqual({ covered: 1250, total: 1250 });
  });
});

describe('store policy is configuration, not code', () => {
  it('the baseline is included and always on for every nation — nothing to buy', () => {
    expect(createQuote(home(), { productId: 'SEC-BASE', edition: 'baseline', seats: 48, years: 1, by: 'CIO' })).toHaveProperty('error');
    const c = securityCenter(home(), []);
    expect(c.baseline.active).toBe(true);
    expect(c.baseline.covers.join(' ')).toMatch(/always installable/);
    // A nation with no paid licence and no BYO is still protected by the baseline.
    const bare = { ...nationRecord('sandbox')!, id: 'nobody' };
    expect(securityCenter(bare, []).baseline.active).toBe(true);
  });

  it('“free only with a paid advanced tier” prices the baseline until one is held', () => {
    setStorePolicy({ includedTier: 'with-paid-tier' });
    expect(ok(createQuote(home(), { productId: 'SEC-BASE', edition: 'baseline', seats: 10, years: 1, by: 'CIO' })).total).toBe(120);
    const q = ok(createQuote(home(), { productId: 'SEC-EDR', edition: 'advanced', seats: 48, years: 1, by: 'CIO' }));
    ok(orderAction(home(), q.id, { action: 'pay-now', by: 'AG' }));
    const free = ok(createQuote(home(), { productId: 'SEC-BASE', edition: 'baseline', seats: 10, years: 1, by: 'CIO' }));
    expect(free).toMatchObject({ total: 0, stage: 'active' });
  });

  it('“paid” prices the baseline like any product', () => {
    setStorePolicy({ includedTier: 'paid' });
    expect(ok(createQuote(home(), { productId: 'SEC-BASE', edition: 'baseline', seats: 10, years: 1, by: 'CIO' })).stage).toBe('quote');
  });

  it('certified third-party vendors only, labelled placeholders, with certification notes', () => {
    const c = securityCenter(home(), []);
    expect(c.policy).toMatchObject({ includedTier: 'free', certifiedVendorsOnly: true, paths: ['procurement', 'instant'] });
    expect(c.catalogue.every(p => p.certification.tested.length > 0 && p.certification.platformVersions)).toBe(true);
    expect(c.catalogue.some(p => p.category === 'endpoint')).toBe(false); // no desktop antivirus of the platform's own
    expect(c.catalogue.every(p => p.certified && /certified partner \(placeholder\)/.test(p.vendor))).toBe(true);
    expect(c.catalogue.filter(p => p.tier === 'included').map(p => p.id)).toEqual(['SEC-BASE']);
  });

  it('instant payment goes straight from quote to licence; procurement can be switched off', () => {
    const q = ok(createQuote(home(), { productId: 'SEC-WAF', edition: 'standard', seats: 5, years: 1, by: 'CIO' }));
    const paid = ok(orderAction(home(), q.id, { action: 'pay-now', by: 'AG' }));
    expect(paid).toMatchObject({ stage: 'active', payment: { method: 'instant' } });
    setStorePolicy({ paths: ['instant'] });
    const q2 = ok(createQuote(home(), { productId: 'SEC-WAF', edition: 'standard', seats: 5, years: 1, by: 'CIO' }));
    expect(orderAction(home(), q2.id, { action: 'order', poNumber: 'PO-1234', by: 'CIO' })).toMatchObject({ status: 422 });
  });
});
