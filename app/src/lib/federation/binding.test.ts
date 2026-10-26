// Exchange bound to the relationship register (plan I9; specification Part 5
// E and L test 5; acceptance P5-05): between two registered institutions an
// exchange service answers only while an approved `exchange` relationship in
// force covers the service and the stated purpose; suspending, ending or the
// end date passing stops the next exchange at once, and the earlier
// exchanges and their signed receipts are kept. Mechanism test: the
// relationship is illustrative, recorded as a nation would record one.
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { generateKeyPairSync } from 'node:crypto';
import { callService } from '@/lib/exchange/services';
import { verifyReceipt, listExchanges, resetExchangeLog } from '@/lib/exchange/log';
import { resetSigningKeys } from '@/lib/crypto/signing-key';
import { recordVersion as recordLaw, confirmVersion as confirmLaw, resetLaw } from '@/lib/law/register';
import { createMinistry } from '@/lib/data/store/ministries';
import { setSovereign } from '@/lib/data/store/sovereign';
import { registerIntegration } from '@/lib/data/store';
import { approveIntegration } from '@/lib/data/integration-approval.fixture';
import { proposeRelationship, confirmRelationship, resetRelationships, relationshipGrants } from '@/lib/data/store/relationships';
import { exchangeBinding } from './binding';

const mk = (name: string) => {
  const m = createMinistry({ archetype: 'GENERIC', name, slug: `${name.toLowerCase().replace(/\W+/g, '-')}-${Math.random().toString(36).slice(2, 7)}` });
  if ('error' in m) throw new Error(m.error);
  return m.id;
};
const ok = <T,>(r: T): Exclude<T, { error: string }> => { if (r && typeof r === "object" && "error" in r) throw new Error((r as { error: string }).error); return r as Exclude<T, { error: string }>; };
const A = { by: 'Admin A', byId: 'local:a' };
const B = { by: 'Admin B', byId: 'local:b', role: 'administrator' };
const none = () => false;
let basis: { instrument: string; eId: string }[];
let tax: string, labour: string;

beforeEach(() => {
  resetLaw(); resetRelationships(); resetExchangeLog(); resetSigningKeys();
  const law = recordLaw({ instrument: { title: 'Tax Administration Act', type: 'act', jurisdiction: 'X', year: 2020, number: '7', issuingAuthority: 'Parliament' }, dates: { inForce: '2020-01-01' }, provisions: [{ eId: 'sec_40', num: '40', text: 'The authority may confirm registration to a public body for a lawful purpose.' }] }, 'L1', 'l1');
  if ('error' in law) throw new Error(law.error);
  confirmLaw(law.instrument.id, law.version.id, 'L2', 'l2');
  basis = [{ instrument: law.instrument.id, eId: 'sec_40' }];
  tax = mk('Revenue Authority'); labour = mk('Labour Authority');
  setSovereign({ deployment: { authorities: { tax, labour } } }, 'test');
  vi.stubEnv('CIVICOS_EXCHANGE_KEY', generateKeyPairSync('ed25519').privateKey.export({ type: 'pkcs8', format: 'pem' }).toString());
});
afterEach(() => { vi.unstubAllEnvs(); resetSigningKeys(); setSovereign({ deployment: { authorities: {} } }, 'test'); });

const labourModule = () => ({ kind: 'module' as const, id: 'labour', name: 'Employment registration' });
const exchangeRel = (extra: Record<string, unknown> = {}) => {
  const { relationship } = ok(proposeRelationship({ from: labour, to: tax, type: 'exchange', scope: { recordTypes: ['taxpayer.status'], purposes: ['Employer registration'] }, legalBasis: basis, ...extra }, A));
  return ok(confirmRelationship(relationship.id, B, none)).relationship;
};

describe('exchange services bound to the relationship register', () => {
  it('ships no relationship: a production installation refuses an exchange between two institutions none covers', async () => {
    vi.stubEnv('CIVICOS_MODE', 'production');
    expect(relationshipGrants()).toEqual([]);
    const r = await callService(labourModule(), 'taxpayer.status', { tin: 'T-1' }, 'Employer registration');
    expect(r.status).toBe(403);
    expect(r.error).toMatch(/No approved relationship lets Labour Authority receive taxpayer.status from Revenue Authority/);
    expect(r.data).toBeUndefined();
    expect(verifyReceipt(r.receipt)).toBe(true);
    // A demonstration answers and says no relationship is recorded.
    vi.stubEnv('CIVICOS_MODE', 'demo');
    const d = await callService(labourModule(), 'taxpayer.status', { tin: 'T-1' }, 'Employer registration');
    expect(d.status).toBe(200);
    expect(listExchanges({ channel: 'service' })[0]!.result).toMatch(/no relationship recorded/);
  });

  it('answers under an approved exchange relationship in force, names it on the receipt, and only for a purpose it lists', async () => {
    vi.stubEnv('CIVICOS_MODE', 'production');
    const rel = exchangeRel();
    expect(rel).toMatchObject({ status: 'approved', inForce: true, version: 1 });
    const r = await callService(labourModule(), 'taxpayer.status', { tin: 'T-1' }, 'Employer registration');
    expect(r.status).toBe(200);
    expect(r.data).toEqual({ registered: 'no', active: 'no' });
    expect(listExchanges({ channel: 'service' })[0]!.result).toContain(`relationship ${rel.id} v1`);
    const other = await callService(labourModule(), 'taxpayer.status', { tin: 'T-1' }, 'Debt collection');
    expect(other.status).toBe(403);
    expect(other.error).toMatch(/lists other purposes for taxpayer.status \(employer registration\)/);
    // Within one institution the register does not apply; the reverse direction is not covered.
    expect(exchangeBinding('taxpayer.status', { slot: 'tax' }, { kind: 'module', id: 'x', institution: tax }, 'anything').kind).toBe('none');
    expect(exchangeBinding('taxpayer.status', { institution: labour }, { kind: 'module', id: 'x', institution: tax }, 'Employer registration')).toMatchObject({ kind: 'refused' });
  });

  it('a suspended or ended relationship stops the next exchange at once; earlier exchanges and receipts are kept (P5-05)', async () => {
    vi.stubEnv('CIVICOS_MODE', 'production');
    const rel = exchangeRel();
    const before = await callService(labourModule(), 'taxpayer.status', { tin: 'T-1' }, 'Employer registration');
    expect(before.status).toBe(200);
    const n = listExchanges({ channel: 'service', limit: 500 }).length;
    // Suspended: a new version, proposed citing the law and confirmed by a different official.
    ok(proposeRelationship({ id: rel.id, status: 'suspended', legalBasis: basis }, A));
    expect(ok(confirmRelationship(rel.id, B, none)).relationship).toMatchObject({ status: 'suspended', inForce: false });
    const after = await callService(labourModule(), 'taxpayer.status', { tin: 'T-1' }, 'Employer registration');
    expect(after.status).toBe(403);
    expect(after.error).toMatch(new RegExp(`Relationship ${rel.id} .* is suspended: exchanges under it stopped`));
    // Prior records preserved: the earlier entry and its receipt still verify, the refusal is one more entry.
    const log = listExchanges({ channel: 'service', limit: 500 });
    expect(log.length).toBe(n + 1);
    expect(log.some(e => e.receiptId === before.receipt.id && e.status === 200)).toBe(true);
    expect(verifyReceipt(before.receipt)).toBe(true);
    // Ended (withdrawn) the same way: still stopped, named as ended.
    ok(proposeRelationship({ id: rel.id, status: 'withdrawn', legalBasis: basis }, A));
    ok(confirmRelationship(rel.id, B, none));
    expect((await callService(labourModule(), 'taxpayer.status', { tin: 'T-1' }, 'Employer registration')).error).toMatch(/has ended/);
    // Stopped in a demonstration too: a relationship once recorded governs.
    vi.stubEnv('CIVICOS_MODE', 'demo');
    expect((await callService(labourModule(), 'taxpayer.status', { tin: 'T-1' }, 'Employer registration')).status).toBe(403);
  });

  it('a relationship past its end date (lapsed) stops exchanges', async () => {
    vi.stubEnv('CIVICOS_MODE', 'production');
    const yesterday = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10);
    exchangeRel({ effectiveFrom: '2021-01-01', effectiveTo: yesterday });
    const r = await callService(labourModule(), 'taxpayer.status', { tin: 'T-1' }, 'Employer registration');
    expect(r.status).toBe(403);
    expect(r.error).toMatch(new RegExp(`ended on ${yesterday}`));
  });

  it('binds another institution\'s installation (an integration two officials linked to it) the same way', async () => {
    vi.stubEnv('CIVICOS_MODE', 'production');
    const reg = registerIntegration({ kind: 'integration', name: `Labour installation ${Date.now()}`, ownerOrg: 'Labour Authority', contact: 'ops@example.gov', scopes: ['service:taxpayer.status'] });
    if ('error' in reg) throw new Error(reg.error);
    // The legal basis for the sharing is cited in production.
    ok(approveIntegration(reg.id, { purposes: { 'taxpayer.status': ['employer-registration'] }, institution: labour, legalBasis: basis } as never));
    const caller = { kind: 'integration' as const, id: reg.id, name: 'Labour installation' };
    expect((await callService(caller, 'taxpayer.status', { tin: 'T-1' }, 'Employer registration')).status).toBe(403);
    exchangeRel();
    expect((await callService(caller, 'taxpayer.status', { tin: 'T-1' }, 'employer-registration')).status).toBe(200);
  });

  it('refuses an exchange relationship that names no service or purpose', () => {
    expect(proposeRelationship({ from: labour, to: tax, type: 'exchange', scope: { recordTypes: [], purposes: [] }, legalBasis: basis }, A)).toMatchObject({ error: expect.stringMatching(/never means every service/) });
    expect(proposeRelationship({ from: labour, to: tax, type: 'exchange', scope: { recordTypes: ['All Records'], purposes: ['x'] }, legalBasis: basis }, A)).toMatchObject({ error: expect.stringMatching(/service ids/) });
  });
});
