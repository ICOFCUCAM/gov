// Acceptance hardening H and I: the platform's two-official minimum cannot be
// lowered by a procedure version; the country can add steps; two accounts of
// one person are one official; the decision says how independent the two
// were; a proposal waiting for its second official lapses, stays on record,
// and only a new, explicit proposal starts again.
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { openCase, act, attach, resetCases, registeredEffects, getCase, lapseProposals, type Actor } from './engine';
import { draftPackage, approvePackage, resetPackages } from './packages';
import { TAX_PROCEDURES, CUSTOMS_PROCEDURES } from './modules';
import { resetDualControl, proposeDualControlPolicy, confirmDualControlPolicy, withdrawDualControlPolicy, dualControlPolicy, platformMinimum } from './dual-control-policy';
import { recordVersion as recordLaw, confirmVersion as confirmLaw, resetLaw } from '@/lib/law/register';
import { addDocument, resetDocuments } from '@/lib/records/documents';
import { resetDecisions, getDecision } from '@/lib/records/decisions';
import { setSovereign, listMinistries } from '@/lib/data/store';
import { listAudit } from '@/lib/data/store/audit';
import { registerPersonResolver, dualControlRefusal } from '@/lib/data/dual-control';
import { resetTax, registerTaxpayer } from '@/lib/tax/register';
import { resetCustoms } from '@/lib/customs/register';

let TAX = '';
const off = (id: string, role: 'officer' | 'signatory' = 'officer'): Actor => ({ id, name: `Official ${id}`, scope: { id, role, institution: TAX } });
const pdf = new Uint8Array(Buffer.from('%PDF-1.7\nx\n%%EOF'));
const doc = (caseId: string, cls: string) => { const d = addDocument({ class: cls, title: cls, institution: TAX, belongsTo: { kind: 'case', id: caseId }, bytes: pdf }, 'Clerk') as { id: string }; attach(caseId, d.id, off('clerk')); };
// Two accounts of one person (p1a, p1b), one of another (p2), and an account not linked to the identity provider (u3).
const PEOPLE: Record<string, string> = { p1a: 'idp:gov|sub|person-1', p1b: 'idp:gov|sub|person-1', p2: 'idp:gov|sub|person-2' };

async function returnAt(tin: string, now: Date) {
  const c = openCase({ procedure: 'tax.return', fields: { tin, taxType: 'income', period: '2025', baseMinor: 1000 } }, off('clerk'), now) as { id: string };
  doc(c.id, 'return-form');
  await act(c.id, { action: 'check' }, off('clerk'), now);
  await act(c.id, { action: 'propose', reason: 'r', fields: { assessedMinor: 100, assessmentReasons: 'Entered by hand' } }, off('clerk'), now);
  return c.id;
}

describe('dual control (H) and proposals that lapse (I)', () => {
  let tin = '';
  beforeEach(() => {
    for (const r of [resetCases, resetPackages, resetDocuments, resetDecisions, resetDualControl, resetTax, resetCustoms, resetLaw]) r();
    vi.stubEnv('CIVICOS_DATA_KEK', Buffer.alloc(32, 7).toString('base64'));
    TAX = listMinistries()[0]!.id;
    setSovereign({ deployment: { authorities: { tax: TAX, customs: TAX } } }, 'Administrator');
    registerPersonResolver(sub => (PEOPLE[sub] ? { key: PEOPLE[sub]!, bound: true } : undefined));
    // The nation's own version of the return procedure drops the second official for assessments; the platform keeps it.
    for (const p of [...TAX_PROCEDURES, ...CUSTOMS_PROCEDURES]) {
      const own = p.key === 'tax.return' ? { ...p, actions: p.actions.map(a => (a.key === 'assess' ? { ...a, needs: { role: 'signatory' as const } } : a)) } : p;
      draftPackage(own, 'A', 'a', registeredEffects()); approvePackage(p.key, 1, 'B', 'b', '2026-01-01', registeredEffects(), new Date('2026-01-01'));
    }
    tin = (registerTaxpayer({ party: { kind: 'person', id: 'BR-1', name: 'T' }, taxTypes: ['income'] }, 'c', 'Officer') as { tin: string }).tin;
  });
  afterEach(() => { vi.unstubAllEnvs(); registerPersonResolver(() => undefined); });

  it('keeps two officials for a tax assessment even when the procedure version drops it, and refuses two accounts of one person', async () => {
    const t = new Date();
    const id = await returnAt(tin, t);
    expect(await act(id, { action: 'assess', reason: 'ok' }, off('p1a', 'signatory'))).toMatchObject({ pending: true });
    expect(await act(id, { action: 'assess' }, off('p1b', 'signatory'))).toMatchObject({ error: expect.stringMatching(/same person/) });
    const done = await act(id, { action: 'assess' }, off('p2', 'signatory'));
    if ('error' in done) throw new Error(done.error);
    expect(getCase(id)!.history.at(-1)).toMatchObject({ independence: 'identity-provider' });
    expect(getDecision(done.decision!.id)!.content.independence).toBe('identity-provider');
  });

  it('keeps values left out of a proposal, lapses an unconfirmed one, and keeps every version', async () => {
    const law = recordLaw({ instrument: { title: 'Public Finance Act', type: 'act', jurisdiction: 'X', year: 2025, number: '7', issuingAuthority: 'Parliament' }, dates: { inForce: '2025-01-01' }, provisions: [{ eId: 'sec_2', num: '2', text: 'Rules.' }] }, 'L1', 'l1');
    if ('error' in law) throw new Error(law.error);
    confirmLaw(law.instrument.id, law.version.id, 'L2', 'l2');
    const basis = [{ instrument: law.instrument.id, eId: 'sec_2' }];
    const t0 = new Date('2026-10-20T08:00:00Z');
    proposeDualControlPolicy({ extra: ['customs.declaration:release'], legalBasis: basis }, 'Admin A', 'adm-a', t0);
    confirmDualControlPolicy('Admin B', 'adm-b', t0);
    // Changing only the waiting period keeps the further step.
    proposeDualControlPolicy({ pendingHours: 36, legalBasis: basis }, 'Admin A', 'adm-a', t0);
    confirmDualControlPolicy('Admin B', 'adm-b', t0);
    expect(dualControlPolicy()).toMatchObject({ extra: ['customs.declaration:release'], pendingHours: 36 });
    // A proposal not confirmed within the waiting period (36 h now) lapses.
    proposeDualControlPolicy({ pendingHours: 2, legalBasis: basis }, 'Admin A', 'adm-a', t0);
    expect(confirmDualControlPolicy('Admin B', 'adm-b', new Date('2026-10-22T08:00:00Z'))).toMatchObject({ error: expect.stringMatching(/No change is waiting/) });
    proposeDualControlPolicy({ pendingHours: 3, legalBasis: basis }, 'Admin A', 'adm-a', new Date('2026-10-22T08:00:00Z'));
    expect(withdrawDualControlPolicy('Admin A', 'Wrong figure')).toEqual({ ok: true });
    expect(dualControlPolicy().pendingHours).toBe(36);
    expect(dualControlPolicy().changes!.history!.map(h => h.outcome)).toEqual(['adopted', 'adopted', 'lapsed', 'withdrawn']);
  });

  it('records when only the accounts differ, and the country can require the identity link and add steps', async () => {
    const id = await returnAt(tin, new Date());
    await act(id, { action: 'assess', reason: 'ok' }, off('p1a', 'signatory'));
    const done = await act(id, { action: 'assess' }, off('u3', 'signatory'));
    if ('error' in done) throw new Error(done.error);
    expect(getDecision(done.decision!.id)!.content.independence).toBe('accounts-only');

    const rules = { requireIdentityBinding: true, pendingHours: 48, extra: ['customs.declaration:release'] };
    // The basis is cited from the laws register, never typed.
    expect(proposeDualControlPolicy({ ...rules, legalBasis: [] }, 'Admin A', 'adm-a')).toMatchObject({ error: expect.stringMatching(/laws register/) });
    expect(proposeDualControlPolicy({ ...rules, legalBasis: [{ instrument: '/eli/x/act/2026/9', eId: 'reg_4' }] }, 'Admin A', 'adm-a')).toMatchObject({ error: expect.stringMatching(/Legal basis/) });
    const law = recordLaw({ instrument: { title: 'Finance Regulations', type: 'regulation', jurisdiction: 'X', year: 2026, number: '4', issuingAuthority: 'Minister' }, dates: { inForce: '2026-01-01' }, provisions: [{ eId: 'reg_4', num: '4', text: 'Two officials.' }] }, 'L1', 'l1');
    if ('error' in law) throw new Error(law.error);
    confirmLaw(law.instrument.id, law.version.id, 'L2', 'l2');
    expect(proposeDualControlPolicy({ ...rules, legalBasis: [{ instrument: law.instrument.id, eId: 'reg_4' }] }, 'Admin A', 'adm-a')).toHaveProperty('expiresAt');
    // Nothing applies until a different official confirms; a second proposal waits its turn.
    expect(dualControlPolicy()).toMatchObject({ adopted: false, requireIdentityBinding: false });
    expect(proposeDualControlPolicy({ pendingHours: 12, legalBasis: [{ instrument: law.instrument.id, eId: 'reg_4' }] }, 'Admin B', 'adm-b')).toMatchObject({ error: expect.stringMatching(/waiting for a second official/) });
    expect(confirmDualControlPolicy('Admin A', 'adm-a')).toMatchObject({ error: expect.stringMatching(/second, different official/) });
    expect(confirmDualControlPolicy('Admin B', 'adm-b')).toMatchObject({ confirmed: { by: 'Admin B', independence: 'accounts-only' } });
    expect(dualControlPolicy()).toMatchObject({ adopted: true, requireIdentityBinding: true, pendingHours: 48, confirmedBy: 'Admin B', citations: [{ eId: 'reg_4' }] });
    const tin2 = (registerTaxpayer({ party: { kind: 'person', id: 'BR-2', name: 'U' }, taxTypes: ['income'] }, 'c', 'Officer') as { tin: string }).tin;
    const id2 = await returnAt(tin2, new Date());
    await act(id2, { action: 'assess', reason: 'ok' }, off('p1a', 'signatory'));
    expect(await act(id2, { action: 'assess' }, off('u3', 'signatory'))).toMatchObject({ error: expect.stringMatching(/identity provider/) });
    // The country's own step: customs release now needs two officials.
    expect(platformMinimum({ fields: {} } as never, { key: 'release', decision: 'release', needs: { role: 'signatory' } } as never, { key: 'customs.declaration' })).toBeNull();
    const { needsTwoOfficials } = await import('./dual-control-policy');
    expect(needsTwoOfficials({ fields: {} } as never, { key: 'release', decision: 'release', needs: { role: 'signatory' } } as never, { key: 'customs.declaration' })).toBe(true);
  });

  it('needs two signed-in officials in production', () => {
    vi.stubEnv('CIVICOS_MODE', 'production');
    expect(dualControlRefusal({ by: 'A', byId: 'p1a' }, { by: 'B' })).toMatch(/must sign in/);
  });

  it('lapses a proposal after its waiting period: a late or repeated confirmation is refused, the proposal is kept, and a new proposal starts again', async () => {
    const t0 = new Date('2026-10-20T08:00:00Z');
    const id = await returnAt(tin, t0);
    expect(await act(id, { action: 'assess', reason: 'ok', idempotencyKey: 'k1' }, off('p1a', 'signatory'), t0)).toMatchObject({ pending: true });
    // A duplicated proposal while it waits is the same proposal.
    expect(await act(id, { action: 'assess', reason: 'ok', idempotencyKey: 'k1' }, off('p1a', 'signatory'), new Date('2026-10-20T09:00:00Z'))).toMatchObject({ pending: true });
    const late = new Date('2026-10-21T08:30:00Z'); // past the default 24 h
    expect(await act(id, { action: 'assess' }, off('p2', 'signatory'), late)).toMatchObject({ error: expect.stringMatching(/lapsed unconfirmed/) });
    const c = getCase(id)!;
    expect(c.lapsedProposals).toEqual([expect.objectContaining({ action: 'assess', by: expect.objectContaining({ id: 'p1a' }), idempotencyKey: 'k1' })]);
    expect(c.history.some(h => h.action === 'assess')).toBe(false);
    // Repeating the lapsed proposal's request is refused; a new proposal must be explicit.
    expect(await act(id, { action: 'assess', reason: 'ok', idempotencyKey: 'k1' }, off('p1a', 'signatory'), late)).toMatchObject({ error: expect.stringMatching(/lapsed/) });
    expect(listAudit().some(e => e.action === 'case.propose.lapse')).toBe(true);
    // An explicit new proposal starts again, and the daily job lapses it too once its time passes.
    expect(await act(id, { action: 'assess', reason: 'Proposed again', idempotencyKey: 'k2' }, off('p2', 'signatory'), late)).toMatchObject({ pending: true });
    expect(lapseProposals(new Date('2026-10-23T08:00:00Z'))).toHaveLength(1);
    expect(getCase(id)!.lapsedProposals).toHaveLength(2);
  });
});
