// Acceptance hardening G: an emergency suspension blocks every new decision
// under the mapping at once, needs a different official to confirm it within
// the policy period, is reviewed and lifted by a different official, keeps
// every event, and leaves earlier decisions as they were.
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { generateKeyPairSync } from 'node:crypto';
import { openCase, act, attach, resetCases, registeredEffects, type Actor } from '@/lib/casework/engine';
import { draftPackage, approvePackage, resetPackages } from '@/lib/casework/packages';
import { TAX_PROCEDURES } from '@/lib/casework/modules';
import { addDocument, resetDocuments } from '@/lib/records/documents';
import { resetDecisions, getDecision, verifyDecision } from '@/lib/records/decisions';
import { setSovereign, listMinistries } from '@/lib/data/store';
import { listAudit } from '@/lib/data/store/audit';
import { recordVersion, confirmVersion, resetLaw } from '@/lib/law/register';
import { resetTax } from '@/lib/tax/register';
import { resetPermitAuthorities, draftMapping, approveMapping, suspendMapping, confirmSuspension, reviewSuspension, liftSuspension, raiseSuspensionAlerts, proposeSuspensionPolicy, confirmSuspensionPolicy, suspenderRefusal, suspensionPolicy, listMappings, mappingInForce } from './authority';

let TAX = '';
const off = (id: string, role: 'officer' | 'signatory' = 'officer'): Actor => ({ id, name: `Tax ${id}`, scope: { id, role, institution: TAX } });
const pdf = new Uint8Array(Buffer.from('%PDF-1.7\nx\n%%EOF'));
const KEY = generateKeyPairSync('ed25519').privateKey.export({ type: 'pkcs8', format: 'pem' }).toString();
async function register(party: string) {
  const c = openCase({ procedure: 'tax.registration', fields: { partyKind: 'person', partyRef: party, partyName: 'P', taxTypes: 'income' } }, off('o1')) as { id: string };
  const d = addDocument({ class: 'identity-evidence', title: 'x', institution: TAX, belongsTo: { kind: 'case', id: c.id }, bytes: pdf }, 'Clerk') as { id: string };
  attach(c.id, d.id, off('o1'));
  await act(c.id, { action: 'verify' }, off('o1'));
  await act(c.id, { action: 'propose' }, off('o1'));
  return act(c.id, { action: 'register', reason: 'Verified' }, off('s1', 'signatory'));
}

describe('emergency suspension of an authority mapping (G)', () => {
  beforeEach(() => {
    for (const r of [resetCases, resetPackages, resetDocuments, resetDecisions, resetLaw, resetTax, resetPermitAuthorities]) r();
    vi.stubEnv('CIVICOS_DATA_KEK', Buffer.alloc(32, 7).toString('base64'));
    vi.stubEnv('CIVICOS_DECISION_KEY', KEY);
    TAX = listMinistries()[0]!.id;
    setSovereign({ deployment: { authorities: { tax: TAX } } }, 'Administrator');
    for (const p of TAX_PROCEDURES) { draftPackage(p, 'A', 'a', registeredEffects()); approvePackage(p.key, 1, 'B', 'b', '2026-01-01', registeredEffects(), new Date('2026-01-01')); }
    const v = recordVersion({ instrument: { title: 'Tax Administration Act', type: 'act', jurisdiction: 'X', year: 2001, number: '1', issuingAuthority: 'Parliament' }, dates: { inForce: '2001-01-01' }, provisions: [{ eId: 'sec_8', num: '8', text: 'Registration.' }] }, 'L1', 'l1');
    if ('error' in v) throw new Error(v.error);
    confirmVersion(v.instrument.id, v.version.id, 'L2', 'l2');
    draftMapping({ permitType: 'tax-registration', title: 'Tax registration', lead: 'tax', effectiveFrom: '2020-01-01', legalBasis: [{ instrument: v.instrument.id, eId: 'sec_8' }] }, 'Admin A', 'aa');
    approveMapping('tax-registration', 1, 'Admin B', 'ab');
    vi.stubEnv('CIVICOS_MODE', 'production');
  });
  afterEach(() => vi.unstubAllEnvs());

  it('blocks new decisions at once, keeps earlier ones, and is confirmed, reviewed and lifted by different officials', async () => {
    const before = await register('BR-1');
    if ('error' in before) throw new Error(before.error);
    expect(suspendMapping('tax-registration', 1, { reason: '' }, 'Admin C', 'ac')).toMatchObject({ error: /reason/ });
    expect(suspendMapping('tax-registration', 1, { reason: 'Court order questions the designation', reviewBy: '2999-01-01' }, 'Admin C', 'ac')).toMatchObject({ error: /no later than/ });
    expect(suspendMapping('tax-registration', 1, { reason: 'Court order questions the designation' }, 'Admin C', 'ac')).not.toHaveProperty('error');
    expect(mappingInForce('tax-registration')).toBeUndefined();
    // No new decision, in production or any other mode.
    expect(await register('BR-2')).toMatchObject({ error: expect.stringMatching(/suspended since/) });
    vi.stubEnv('CIVICOS_MODE', 'demo');
    expect(await register('BR-3')).toMatchObject({ error: expect.stringMatching(/suspended since/) });
    vi.stubEnv('CIVICOS_MODE', 'production');
    // The earlier decision stands, with the version it rested on.
    const d = getDecision(before.decision!.id)!;
    expect(verifyDecision(d)).toEqual({ ok: true });
    expect(d.content.authority).toMatchObject({ version: 1 });
    // Confirmation, review and lifting need a different official.
    expect(confirmSuspension('tax-registration', 1, 'Admin C', 'ac')).toMatchObject({ error: /different official/ });
    expect(confirmSuspension('tax-registration', 1, 'Admin D', 'ad')).not.toHaveProperty('error');
    expect(reviewSuspension('tax-registration', 1, { reason: 'Hearing adjourned', reviewBy: new Date(Date.now() + 5 * 86_400_000).toISOString().slice(0, 10) }, 'Admin C', 'ac')).toMatchObject({ error: /different official/ });
    expect(liftSuspension('tax-registration', 1, 'Resolved', 'Admin C', 'ac')).toMatchObject({ error: /different official/ });
    expect(liftSuspension('tax-registration', 1, 'Court confirmed the designation', 'Admin D', 'ad')).not.toHaveProperty('error');
    expect(await register('BR-4')).not.toHaveProperty('error');
    // Every event is kept on the mapping and in the audit chain.
    expect(listMappings('tax-registration')[0]!.suspensions).toEqual([expect.objectContaining({ by: 'Admin C', confirmed: expect.objectContaining({ by: 'Admin D' }), lifted: expect.objectContaining({ by: 'Admin D' }) })]);
    expect(listAudit().filter(e => e.action.startsWith('permit-authority.suspend')).map(e => e.action).sort()).toEqual(['permit-authority.suspend', 'permit-authority.suspend.confirm', 'permit-authority.suspend.lift']);
  });

  it('stays in force and is flagged once when unconfirmed past the policy period or past its review date; the country adopts its own periods', () => {
    expect(suspensionPolicy()).toMatchObject({ adopted: false, confirmWithinHours: 72, reviewWithinDays: 30 });
    const t0 = new Date('2026-10-20T08:00:00Z');
    suspendMapping('tax-registration', 1, { reason: 'Emergency', reviewBy: '2026-10-25' }, 'Admin C', 'ac', t0);
    const late = new Date('2026-10-24T08:00:00Z');
    expect(confirmSuspension('tax-registration', 1, 'Admin D', 'ad', late)).toMatchObject({ error: /confirmation period has passed/ });
    expect(raiseSuspensionAlerts(late)).toEqual([{ permitType: 'tax-registration', version: 1, flag: 'unconfirmed' }]);
    expect(raiseSuspensionAlerts(late)).toEqual([]);
    expect(raiseSuspensionAlerts(new Date('2026-10-26T08:00:00Z'))).toEqual([{ permitType: 'tax-registration', version: 1, flag: 'review-overdue' }]);
    expect(mappingInForce('tax-registration', '2026-10-26')).toBeUndefined();
    // The country's periods and who may suspend: proposed citing the law, confirmed by a different official.
    expect(proposeSuspensionPolicy({ confirmWithinHours: 24, reviewWithinDays: 14 }, 'Admin A', 'aa', late)).toMatchObject({ error: /laws register/ });
    const basis = [{ instrument: listMappings('tax-registration')[0]!.legalBasis[0]!.instrument, eId: 'sec_8' }];
    expect(proposeSuspensionPolicy({ confirmWithinHours: 24, reviewWithinDays: 14, suspendBy: 'government-administrator', legalBasis: basis }, 'Admin A', 'aa', late)).toHaveProperty('expiresAt');
    expect(suspensionPolicy()).toMatchObject({ confirmWithinHours: 72, adopted: false });
    expect(confirmSuspensionPolicy('Admin A', 'aa', late)).toMatchObject({ error: /second, different official/ });
    expect(confirmSuspensionPolicy('Admin B', 'ab', late)).toHaveProperty('confirmed');
    expect(suspensionPolicy()).toMatchObject({ adopted: true, confirmWithinHours: 24, reviewWithinDays: 14, suspendBy: 'government-administrator', confirmedBy: 'Admin B', citations: [{ eId: 'sec_8' }] });
    // Under that rule an institution's own administrator, or someone not signed in, may not suspend.
    expect(suspenderRefusal({ institution: 'MIN-1' })).toMatch(/government-wide administrators/);
    expect(suspenderRefusal(null)).toMatch(/sign in/);
    expect(suspenderRefusal({})).toBeNull();
  });
});
