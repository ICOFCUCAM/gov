// The product.status exchange service (Health I4 dependency
// exchange-product-status; HLT-MED-024): in the service directory, owned by the
// medicines authority slot, answering only publicProductView() of a decided
// record through callService(), for a purpose two officials approved for the
// caller; shipped with no approved caller. HLT-MED-024's procedure link then
// needs no procedure and finds its service.
import { describe, it, expect, beforeEach } from 'vitest';
import { callService, serviceDirectory, SERVICES } from '@/lib/exchange/services';
import { resetExchangeLog } from '@/lib/exchange/log';
import { registerIntegration, listIntegrations } from '@/lib/data/store';
import { approveIntegration } from '@/lib/data/integration-approval.fixture';
import { proposeIntegrationApproval, confirmIntegrationApproval } from '@/lib/data/store/federation';
import { CATALOGUE_CONTRACTS } from '@/lib/forms/library/catalogue-contracts';
import { procedureLink } from '@/lib/forms/procedure-link';
import { resetProducts } from './register';

const KEYS = ['productId', 'kind', 'fields', 'notices', 'source'];

describe('the product.status exchange service', () => {
  beforeEach(() => { resetExchangeLog(); resetProducts(); });

  it('is declared in the directory, owned by the medicines authority, returning only the public view\'s fields', () => {
    const s = serviceDirectory().find(x => x.id === 'product.status')!;
    expect(s).toMatchObject({ owner: 'medicinesRegulation', kind: 'query', dataClass: 'public', scope: 'service:product.status' });
    expect(Object.keys(s.returns).sort()).toEqual([...KEYS].sort());
    // The handler goes through publicProductView() (lib/health/products/register.ts publicProduct()).
    expect(String(SERVICES.find(x => x.id === 'product.status')!.handle)).toMatch(/publicProduct\(/);
  });

  it('ships no approved caller, and answers an outside caller only for a purpose two officials approved for it', async () => {
    expect(listIntegrations().filter(i => i.status === 'approved' && i.scopes.includes('service:product.status'))).toEqual([]);
    const r = registerIntegration({ kind: 'integration', name: `Hospital pharmacy ${Date.now()}`, ownerOrg: 'Hospital', contact: 'ops@example.gov', scopes: ['service:product.status'] });
    if ('error' in r) throw new Error(r.error);
    const caller = { kind: 'integration' as const, id: r.id, name: 'Hospital pharmacy' };
    expect((await callService(caller, 'product.status', { number: 'PRD-1' }, 'check-before-dispensing-stock')).status).toBe(403);
    // One official cannot approve alone.
    expect(proposeIntegrationApproval(r.id, { purposes: { 'product.status': ['check-before-dispensing-stock'] } }, 'Official A')).not.toHaveProperty('error');
    expect(confirmIntegrationApproval(r.id, 'Official A')).toHaveProperty('error');
    expect(confirmIntegrationApproval(r.id, 'Official B')).not.toHaveProperty('error');
    const ok = await callService(caller, 'product.status', { number: 'PRD-1' }, 'check-before-dispensing-stock');
    expect(ok.status).toBe(200);
    expect(Object.keys(ok.data ?? {}).every(k => KEYS.includes(k))).toBe(true);
    expect((await callService(caller, 'product.status', { number: 'PRD-1' }, 'marketing')).status).toBe(403);
    expect(approveIntegration).toBeTypeOf('function');
  });

  it('is the service HLT-MED-024 names, so its form needs no procedure and finds its service', () => {
    const f = CATALOGUE_CONTRACTS.find(x => x.specId === 'HLT-MED-024')!;
    expect(f.exchange).toBe('product.status');
    const l = procedureLink({ identity: f.identity, procedure: null, exchange: f.exchange, deviations: f.deviations }, { services: serviceDirectory().map(s => s.id), packages: [] });
    expect(l).toMatchObject({ required: false, exchange: { id: 'product.status', exists: true } });
  });
});
