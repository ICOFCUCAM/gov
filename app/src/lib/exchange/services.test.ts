import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { callService, serviceDirectory } from './services';
import { verifyReceipt, listExchanges, resetExchangeLog } from './log';
import { registerEvent, resetCivil } from '@/lib/civil/register';
import { registerIntegration, listIntegrations, setIntegrationStatus } from '@/lib/data/store';
import { approveIntegration } from '@/lib/data/integration-approval.fixture';
import { generateKeyPairSync } from 'node:crypto';

/** A production installation answers exchanges only with its own exchange key (lib/keys/custody.ts developmentKeyRefusal). */
const exchangeKeyPem = () => generateKeyPairSync('ed25519').privateKey.export({ type: 'pkcs8', format: 'pem' }).toString();

let n = 0;
/** An outside caller (an integration) approved by two officials for these purposes on this service. */
function outside(name: string, service: string, purposes: string[]) {
  const r = registerIntegration({ kind: 'integration', name: `${name} ${++n} ${Date.now()}`, ownerOrg: name, contact: 'ops@example.gov', scopes: [`service:${service}`] });
  if ('error' in r) throw new Error(r.error);
  const a = approveIntegration(r.id, { purposes: { [service]: purposes } });
  if ('error' in a) throw new Error(a.error);
  return { kind: 'integration' as const, id: r.id, name };
}

describe('exchange services', () => {
  beforeEach(() => { resetCivil(); resetExchangeLog(); });

  it('answers whether facts match a birth registration, never the record, with a signed receipt', async () => {
    registerEvent({ kind: 'birth', date: '2026-09-01', place: { region: 'North' }, case: 'c1', child: { given: 'Amara', family: 'Okafor', sex: 'female' } }, 'R');
    const caller = outside('Identity authority', 'person.verify', ['issuing-a-national-identity-card', 'x']);
    const yes = await callService(caller, 'person.verify', { registration: 'BR-2026-000001', family: 'OKAFOR', birthDate: '2026-09-01' }, 'Issuing a national identity card');
    expect(yes).toMatchObject({ status: 200, data: { match: 'yes', status: 'alive' } });
    expect(JSON.stringify(yes.data)).not.toContain('Amara');
    expect(verifyReceipt(yes.receipt)).toBe(true);
    expect((await callService(caller, 'person.verify', { registration: 'BR-2026-000001', family: 'Bello' }, 'x')).data).toEqual({ match: 'no', status: 'unknown' });
    expect((await callService(caller, 'person.verify', { registration: 'BR-2026-000001' }, 'x')).data).toEqual({ match: 'unknown', status: 'unknown' });
    expect(await callService(caller, 'person.verify', { registration: 'BR-2026-000001', family: 'Okafor' }, ' ')).toMatchObject({ status: 400 });
    expect(listExchanges({ channel: 'service' })).toHaveLength(4);
  });

  it('lists every service with its owner, scope and the fields it returns', () => {
    expect(serviceDirectory().map(s => [s.id, s.kind, s.scope])).toEqual([['person.verify', 'query', 'service:person.verify'], ['organisation.standing', 'query', 'service:organisation.standing'], ['taxpayer.status', 'query', 'service:taxpayer.status'], ['qualification.verify', 'query', 'service:qualification.verify'], ['professional.standing', 'query', 'service:professional.standing'], ['customs.release', 'query', 'service:customs.release'], ['product.status', 'query', 'service:product.status'], ['immigration.status', 'query', 'service:immigration.status'], ['civil.birth.registered', 'event', 'events:civil']]);
  });
});

// P2-02 and P5-05 (docs/INSTITUTIONAL_ACCEPTANCE.md).
describe('the exchange log names the caller and purpose; a suspended or revoked integration is refused, earlier entries kept', () => {
  beforeEach(() => { resetCivil(); resetExchangeLog(); });

  it('records the calling institution and the stated purpose on each exchange (P2-02)', async () => {
    registerEvent({ kind: 'birth', date: '2026-09-01', place: { region: 'North' }, case: 'c1', child: { given: 'Amara', family: 'Okafor', sex: 'female' } }, 'R');
    const caller = outside('Identity authority', 'person.verify', ['issuing-a-national-identity-card']);
    const r = await callService(caller, 'person.verify', { registration: 'BR-2026-000001', family: 'Okafor' }, 'Issuing a national identity card');
    expect(r.status).toBe(200);
    const [entry] = listExchanges({ channel: 'service' });
    expect(entry).toMatchObject({ feedId: `integration:${caller.id}`, path: 'service:person.verify', status: 200, receiptId: r.receipt.id });
    expect(entry!.result).toContain('purpose: Issuing a national identity card');
    // The signed receipt carries the same caller and purpose.
    expect(r.receipt).toMatchObject({ feedId: `integration:${caller.id}`, result: expect.stringContaining('purpose: Issuing a national identity card') });
    expect(verifyReceipt(r.receipt)).toBe(true);
  });

  for (const status of ['suspended', 'revoked'] as const) {
    it(`refuses new exchanges once the integration is ${status}, and keeps the earlier entries and receipts intact (P5-05)`, async () => {
      registerEvent({ kind: 'birth', date: '2026-09-01', place: { region: 'North' }, case: 'c1', child: { given: 'Amara', family: 'Okafor', sex: 'female' } }, 'R');
      const caller = outside('Labour inspectorate', 'person.verify', ['right-to-work-check']);
      const before = await callService(caller, 'person.verify', { registration: 'BR-2026-000001', family: 'Okafor' }, 'Right-to-work check');
      expect(before.status).toBe(200);
      const kept = structuredClone(listExchanges({ channel: 'service' }));
      expect(setIntegrationStatus(caller.id, status, 'Administrator')).not.toHaveProperty('error');
      const after = await callService(caller, 'person.verify', { registration: 'BR-2026-000001', family: 'Okafor' }, 'Right-to-work check');
      expect(after).toMatchObject({ status: 403, error: expect.stringMatching(/not an approved integration/) });
      expect(after.data).toBeUndefined();
      const now = listExchanges({ channel: 'service' });
      // The refusal is logged as a new entry; the earlier entry is unchanged and its receipt still verifies.
      expect(now).toHaveLength(kept.length + 1);
      expect(now[0]).toMatchObject({ feedId: `integration:${caller.id}`, status: 403 });
      expect(now.slice(1)).toEqual(kept);
      expect(verifyReceipt(before.receipt)).toBe(true);
    });
  }
});

describe('immigration.status', () => {
  it('answers validity without naming the holder, with a receipt', async () => {
    const { resetImmigration, recordGrant } = await import('@/lib/immigration/register');
    resetImmigration();
    recordGrant({ kind: 'residence-permit', category: 'work', holder: { name: 'Private Holder', nationality: 'KEN', documentNumber: 'AK998877' }, validFrom: '2026-01-01', validUntil: '2028-01-01', conditions: ['Work for the sponsoring employer only'] }, 'issued', 'case-x', 'ok', 'Officer');
    const caller = outside('Labour inspectorate', 'immigration.status', ['right-to-work-check', 'check']);
    const r = await callService(caller, 'immigration.status', { nationality: 'ken', documentNumber: 'AK 998877', on: '2027-03-01' }, 'Right-to-work check');
    expect(r.data).toEqual({ valid: 'yes', kind: 'residence-permit', category: 'work', validUntil: '2028-01-01', conditions: ['Work for the sponsoring employer only'] });
    expect(JSON.stringify(r)).not.toContain('Private Holder');
    expect(r.receipt).toBeTruthy();
    expect((await callService(caller, 'immigration.status', { nationality: 'KEN', documentNumber: 'NOPE' }, 'Check')).data).toEqual({ valid: 'no' });
  });
});

describe('organisation.standing', () => {
  it('answers the standing in one register, without representatives', async () => {
    const { resetOrganisations, createOrganisation, setStanding } = await import('@/lib/organisations/register');
    resetOrganisations();
    const o = createOrganisation({ name: 'Riverside Pharmacy', kind: 'pharmacy', representative: { name: 'Private Owner', role: 'Owner' } }, 'c', 'R') as { id: string; number: string };
    setStanding(o.id, { register: 'business-licences', state: 'granted', reason: 'ok', validUntil: '2027-01-01' }, 'R');
    const r = await callService(outside('Health insurer', 'organisation.standing', ['paying-a-claim']), 'organisation.standing', { number: o.number, register: 'business-licences' }, 'Paying a claim');
    expect(r.data).toEqual({ name: 'Riverside Pharmacy', standing: 'granted', validUntil: '2027-01-01' });
    expect(JSON.stringify(r)).not.toContain('Private Owner');
  });
});

describe('taxpayer.status', () => {
  it('says whether a party is registered and for which taxes, nothing more', async () => {
    const { resetTax, registerTaxpayer } = await import('@/lib/tax/register');
    resetTax();
    registerTaxpayer({ party: { kind: 'organisation', id: 'ORG-1', name: 'Hill Traders' }, taxTypes: ['income'] }, 'c', 'Officer');
    const r = await callService(outside('Public procurement', 'taxpayer.status', ['tender-eligibility']), 'taxpayer.status', { party: 'ORG-1' }, 'Tender eligibility');
    expect(r.data).toEqual({ registered: 'yes', active: 'yes', taxTypes: ['income'] });
    expect((await callService(outside('P', 'taxpayer.status', ['check']), 'taxpayer.status', { party: 'ORG-9' }, 'Check')).data).toEqual({ registered: 'no', active: 'no' });
  });
});

describe('qualification.verify', () => {
  it('confirms a qualification only with its number and the holder\'s name, and never returns the holder\'s reference', async () => {
    const { resetEducation, recordAward } = await import('@/lib/education/register');
    const { resetOrganisations, createOrganisation, setStanding } = await import('@/lib/organisations/register');
    resetEducation(); resetOrganisations();
    const o = createOrganisation({ name: 'Northern Polytechnic', kind: 'college' }, 'c1', 'Registrar') as { id: string; number: string };
    setStanding(o.id, { register: 'schools', state: 'granted', reason: 'Registered', case: 'c2' }, 'Registrar');
    const a = recordAward({ holderRef: 'BR-2001-000007', holderName: 'Kofi Mensah', title: 'Diploma in Surveying', awardingBody: o.number, awardedOn: '2025-06-30' }, 'c3', 'Officer') as { number: string };
    const who = outside('Public service commission', 'qualification.verify', ['recruitment-check', 'check']);
    const r = await callService(who, 'qualification.verify', { number: a.number, holderName: 'kofi mensah' }, 'Recruitment check');
    expect(r.data).toMatchObject({ valid: 'yes', title: 'Diploma in Surveying', awardingBody: 'Northern Polytechnic', awardedOn: '2025-06-30' });
    expect(JSON.stringify(r)).not.toContain('BR-2001');
    expect((await callService(who, 'qualification.verify', { number: a.number, holderName: 'Someone Else' }, 'Check')).data).toEqual({ valid: 'no' });
    expect((await callService(who, 'qualification.verify', { number: 'QUA-0000-000000', holderName: 'Kofi Mensah' }, 'Check')).data).toEqual({ valid: 'no' });
  });
});

describe('professional.standing', () => {
  it('answers from the public register only', async () => {
    const { resetProfessions, registerProfessional } = await import('@/lib/professions/register');
    resetProfessions();
    const e = registerProfessional({ profession: 'pharmacist', personRef: 'BR-1985-000002', name: 'Ama Owusu' }, 'c', 'Registrar') as { number: string };
    const r = await callService(outside('Teaching hospital', 'professional.standing', ['employment-check']), 'professional.standing', { number: e.number }, 'Employment check');
    expect(r.data).toEqual({ registered: 'yes', profession: 'Pharmacists', state: 'registered', conditions: [] });
    expect(JSON.stringify(r)).not.toContain('BR-1985');
  });
});

describe('customs.release', () => {
  it('says whether goods were released, never what or whose', async () => {
    const { resetCustoms, lodgeDeclaration } = await import('@/lib/customs/register');
    resetCustoms();
    const d = lodgeDeclaration({ direction: 'import', declarant: { kind: 'organisation', ref: 'ORG-5', name: 'Secret Importer' }, shipment: { mode: 'sea', transportRef: 'BL-9', from: 'CN', to: 'KE' }, currency: 'KES', goods: '8703 | Cars | JP | 2 u | 4000000' }, 'c', 'Officer') as { number: string };
    const r = await callService(outside('Vehicle registry', 'customs.release', ['first-registration-of-an-imported-vehicle']), 'customs.release', { number: d.number }, 'First registration of an imported vehicle');
    expect(r.data).toEqual({ released: 'no', state: 'lodged' });
    expect(JSON.stringify(r)).not.toMatch(/Secret|ORG-5|Cars|4000000/);
  });
});

describe('purposes approved per caller and service', () => {
  beforeEach(() => { resetCivil(); resetExchangeLog(); });
  afterEach(() => { vi.unstubAllEnvs(); });

  it('refuses an outside caller a purpose not approved for it and that service, naming the approved ones, with a receipt', async () => {
    const caller = outside('Benefits agency', 'person.verify', ['benefit-eligibility']);
    const r = await callService(caller, 'person.verify', { registration: 'BR-2026-000001', family: 'Okafor' }, 'Marketing');
    expect(r).toMatchObject({ status: 403, error: expect.stringContaining('approved: benefit-eligibility') });
    expect(r.data).toBeUndefined();
    expect(verifyReceipt(r.receipt)).toBe(true);
    expect(listExchanges({ channel: 'service' })[0]).toMatchObject({ status: 403, result: expect.stringContaining('purpose not approved') });
    // The approved purpose, in any case and spacing, is answered.
    expect(await callService(caller, 'person.verify', { registration: 'BR-2026-000001', family: 'Okafor' }, 'Benefit eligibility')).toMatchObject({ status: 200 });
  });

  it('a purpose approved for one service does not open another', async () => {
    const r = registerIntegration({ kind: 'integration', name: `two-services-${Date.now()}`, ownerOrg: 'Procurement', contact: 'ops@example.gov', scopes: ['service:taxpayer.status', 'service:organisation.standing'] });
    if ('error' in r) throw new Error(r.error);
    const a = approveIntegration(r.id, { purposes: { 'taxpayer.status': ['tender-eligibility'], 'organisation.standing': ['supplier-check'] } });
    if ('error' in a) throw new Error(a.error);
    const caller = { kind: 'integration' as const, id: r.id, name: 'Procurement' };
    expect(await callService(caller, 'organisation.standing', { number: 'X', register: 'business-licences' }, 'tender-eligibility')).toMatchObject({ status: 403, error: expect.stringContaining('approved: supplier-check') });
    expect(await callService(caller, 'person.verify', { registration: 'BR-1' }, 'tender-eligibility')).toMatchObject({ status: 403, error: expect.stringContaining('approved: none') });
  });

  it('refuses an integration that is not approved', async () => {
    expect(await callService({ kind: 'integration', id: 'IC-unknown', name: 'Nobody' }, 'person.verify', { registration: 'BR-1' }, 'check')).toMatchObject({ status: 403 });
  });

  it('modules inside the installation keep a stated purpose (fixed in code)', async () => {
    const mod = { kind: 'module' as const, id: 'civil', name: 'Civil registration module' };
    expect(await callService(mod, 'person.verify', { registration: 'BR-1', family: 'X' }, 'Any stated purpose')).toMatchObject({ status: 200 });
    expect(await callService(mod, 'person.verify', { registration: 'BR-1', family: 'X' }, ' ')).toMatchObject({ status: 400 });
  });

  it('an integration approved before purposes existed: refused in production, allowed and noted in demo and training', async () => {
    const r = registerIntegration({ kind: 'integration', name: `legacy-${Date.now()}`, ownerOrg: 'Old partner', contact: 'ops@example.gov', scopes: ['service:person.verify'] });
    if ('error' in r) throw new Error(r.error);
    // As restored from a snapshot saved before this change: approved by one official, no purposes.
    Object.assign(listIntegrations().find(c => c.id === r.id)!, { status: 'approved', approvedBy: 'L. Petrov' });
    const caller = { kind: 'integration' as const, id: r.id, name: 'Old partner' };
    vi.stubEnv('CIVICOS_MODE', 'production');
    vi.stubEnv('CIVICOS_EXCHANGE_KEY', exchangeKeyPem());
    expect(await callService(caller, 'person.verify', { registration: 'BR-1' }, 'check')).toMatchObject({ status: 403, error: expect.stringMatching(/No purposes are approved yet/) });
    expect(listExchanges({ channel: 'service' })[0]).toMatchObject({ status: 403, result: expect.stringContaining('purposes not yet approved') });
    for (const mode of ['demo', 'training']) {
      vi.stubEnv('CIVICOS_MODE', mode);
      expect(await callService(caller, 'person.verify', { registration: 'BR-1' }, 'check')).toMatchObject({ status: 200 });
      expect(listExchanges({ channel: 'service' })[0]).toMatchObject({ status: 200, result: expect.stringContaining('purposes not yet approved') });
    }
  });
});
