// Acceptance hardening E and F: every decision rests on a named authority,
// refused in production when the authority mapping it needs is missing, a
// draft, held by another institution, expired or not yet in force; and the
// sealed decision keeps the exact mapping and rule versions it rested on.
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { generateKeyPairSync } from 'node:crypto';
import { openCase, act, attach, resetCases, registeredEffects, type Actor } from '@/lib/casework/engine';
import { draftPackage, approvePackage, resetPackages } from '@/lib/casework/packages';
import { TAX_PROCEDURES, CUSTOMS_PROCEDURES, REFERENCE_PROCEDURES } from '@/lib/casework/modules';
import { addDocument, resetDocuments } from '@/lib/records/documents';
import { resetDecisions, getDecision, verifyDecision } from '@/lib/records/decisions';
import { setSovereign, listMinistries } from '@/lib/data/store';
import { recordVersion, confirmVersion, resetLaw } from '@/lib/law/register';
import { draftRule, approveRule, resetRules } from '@/lib/law/rules';
import { resetTax } from '@/lib/tax/register';
import { resetPermitAuthorities, draftMapping, approveMapping } from './authority';
import { classifyDecision } from './decisions';

let TAX = '', OTHER = '', LAW = '';
const off = (id: string, role: 'officer' | 'signatory' = 'officer'): Actor => ({ id, name: `Tax ${id}`, scope: { id, role, institution: TAX } });
const pdf = new Uint8Array(Buffer.from('%PDF-1.7\nx\n%%EOF'));
const KEY = generateKeyPairSync('ed25519').privateKey.export({ type: 'pkcs8', format: 'pem' }).toString();

/** A taxpayer registration case brought to the decision; returns the result of deciding it. */
async function register(party: string) {
  const c = openCase({ procedure: 'tax.registration', fields: { partyKind: 'person', partyRef: party, partyName: 'P', taxTypes: 'income' } }, off('o1')) as { id: string };
  const d = addDocument({ class: 'identity-evidence', title: 'x', institution: TAX, belongsTo: { kind: 'case', id: c.id }, bytes: pdf }, 'Clerk') as { id: string };
  attach(c.id, d.id, off('o1'));
  await act(c.id, { action: 'verify' }, off('o1'));
  await act(c.id, { action: 'propose' }, off('o1'));
  return act(c.id, { action: 'register', reason: 'Verified' }, off('s1', 'signatory'));
}
const mapping = (version: number, input: Record<string, unknown> = {}) => {
  const m = draftMapping({ permitType: 'tax-registration', title: 'Tax registration', lead: 'tax', effectiveFrom: '2020-01-01', legalBasis: [{ instrument: LAW, eId: 'sec_8' }], ...input }, 'Admin A', 'aa');
  if ('error' in m) throw new Error(m.error);
  const a = approveMapping('tax-registration', version, 'Admin B', 'ab');
  if ('error' in a) throw new Error(a.error);
  return a;
};

describe('decision authority (E) and provenance (F)', () => {
  beforeEach(() => {
    for (const r of [resetCases, resetPackages, resetDocuments, resetDecisions, resetLaw, resetRules, resetTax, resetPermitAuthorities]) r();
    vi.stubEnv('CIVICOS_DATA_KEK', Buffer.alloc(32, 7).toString('base64'));
    vi.stubEnv('CIVICOS_DECISION_KEY', KEY);
    [TAX, OTHER] = listMinistries().slice(0, 2).map(m => m.id) as [string, string];
    setSovereign({ deployment: { authorities: { tax: TAX, customs: TAX, civilRegistration: TAX } } }, 'Administrator');
    for (const p of [...TAX_PROCEDURES, ...CUSTOMS_PROCEDURES]) { draftPackage(p, 'A', 'a', registeredEffects()); approvePackage(p.key, 1, 'B', 'b', '2026-01-01', registeredEffects(), new Date('2026-01-01')); }
    const v = recordVersion({ instrument: { title: 'Tax Administration Act', type: 'act', jurisdiction: 'X', year: 2001, number: '1', issuingAuthority: 'Parliament' }, dates: { inForce: '2001-01-01' }, provisions: [{ eId: 'sec_8', num: '8', text: 'The tax authority registers taxpayers and assesses tax.' }] }, 'L1', 'l1');
    if ('error' in v) throw new Error(v.error);
    confirmVersion(v.instrument.id, v.version.id, 'L2', 'l2');
    LAW = v.instrument.id;
    vi.stubEnv('CIVICOS_MODE', 'production');
  });
  afterEach(() => vi.unstubAllEnvs());

  it('refuses in production without an approved mapping, with only a draft, when another institution holds the power, when expired and when not yet in force', async () => {
    expect(await register('BR-1')).toMatchObject({ error: expect.stringMatching(/No approved authority mapping governs tax-registration/) });
    draftMapping({ permitType: 'tax-registration', title: 'Tax registration', lead: 'tax', effectiveFrom: '2020-01-01', legalBasis: [{ instrument: LAW, eId: 'sec_8' }] }, 'Admin A', 'aa');
    expect(await register('BR-2')).toMatchObject({ error: expect.stringMatching(/No approved authority mapping/) });
    approveMapping('tax-registration', 1, 'Admin B', 'ab');
    expect(await register('BR-3')).not.toHaveProperty('error');
    // A newer version gives the power to another institution: refused from its date.
    mapping(2, { lead: OTHER, effectiveFrom: '2021-01-01', handoverPlan: 'Records transferred' });
    expect(await register('BR-4')).toMatchObject({ error: expect.stringMatching(/belongs to/) });
    resetPermitAuthorities();
    mapping(1, { effectiveTo: '2021-01-01' });
    expect(await register('BR-5')).toMatchObject({ error: expect.stringMatching(/No approved authority mapping/) });
    resetPermitAuthorities();
    mapping(1, { effectiveFrom: '2099-01-01' });
    expect(await register('BR-6')).toMatchObject({ error: expect.stringMatching(/No approved authority mapping/) });
  });

  it('refuses a customs assessment and an unclassified procedure in production, and classifies civil decisions by the deployment profile', async () => {
    const c = openCase({ procedure: 'customs.declaration', fields: { direction: 'import', declarantKind: 'organisation', declarantRef: 'ORG-1', declarantName: 'D', transportRef: 'BL-1', dispatchCountry: 'CN', destinationCountry: 'KE', goods: '0901 | coffee | ET | 1 kg | 100' } }, off('o1')) as { id: string };
    for (const cls of ['commercial-invoice', 'transport-document']) { const d = addDocument({ class: cls, title: cls, institution: TAX, belongsTo: { kind: 'case', id: c.id }, bytes: pdf }, 'Clerk') as { id: string }; attach(c.id, d.id, off('o1')); }
    await act(c.id, { action: 'check' }, off('o1'));
    await act(c.id, { action: 'choose', fields: { channel: 'release-on-documents', channelReasons: 'r' } }, off('o1'));
    expect(await act(c.id, { action: 'propose', reason: 'r', fields: { enteredDuty: '1 | 5', dutyReasons: 'r' } }, off('o1'))).not.toHaveProperty('error');
    expect(await act(c.id, { action: 'assess', reason: 'r' }, off('s1', 'signatory'))).toMatchObject({ error: expect.stringMatching(/No approved authority mapping governs customs-clearance/) });

    const civil = REFERENCE_PROCEDURES[0]!;
    expect(classifyDecision({ fields: {} } as never, { decision: 'register' } as never, civil)).toEqual({ kind: 'deployment', authority: 'civilRegistration' });
    expect(classifyDecision({ fields: {} } as never, { decision: 'grant' } as never, { key: 'nation.own-procedure' })).toBeNull();
    expect(classifyDecision({ fields: {} } as never, { decision: 'grant' } as never, { key: 'nation.own-procedure', authority: { permitType: 'fishing-licence' } })).toEqual({ kind: 'mapping', permitType: 'fishing-licence', power: 'issue' });
    const { checkDecision } = await import('./decisions');
    expect(checkDecision({ fields: {}, owner: TAX } as never, { decision: 'grant' } as never, { key: 'nation.own-procedure', title: 'Own procedure' } as never, new Date())).toMatchObject({ error: expect.stringMatching(/not classified under any authority/) });
  });

  it('seals the exact mapping version a decision rested on, and keeps it when the mapping changes', async () => {
    mapping(1);
    const first = await register('BR-10');
    if ('error' in first) throw new Error(first.error);
    const d1 = getDecision(first.decision!.id)!;
    expect(d1.content.authority).toMatchObject({ basis: 'mapping', permitType: 'tax-registration', power: 'issue', version: 1, lead: 'tax' });
    mapping(2, { effectiveFrom: '2025-06-01', note: 'Same lead, new legal basis' });
    const second = await register('BR-11');
    if ('error' in second) throw new Error(second.error);
    expect(getDecision(second.decision!.id)!.content.authority).toMatchObject({ version: 2 });
    // The earlier decision still says version 1 and still verifies.
    const again = getDecision(first.decision!.id)!;
    expect(again.content.authority).toMatchObject({ version: 1 });
    expect(verifyDecision(again)).toEqual({ ok: true });
  });

  it('seals the rule version an assessment calculated with', async () => {
    vi.stubEnv('CIVICOS_MODE', 'demo');
    draftRule({ key: 'tax.income', title: 'Income tax (test)', kind: 'flat-rate', owner: 'tax', effectiveFrom: '2025-01-01', rate: 10, citations: [{ instrument: LAW, eId: 'sec_8' }], tests: [{ name: 't', input: { amountMinor: 1000 }, expectMinor: 100 }] }, 'R1', 'r1');
    const rule = approveRule('tax.income', 1, 'R2', 'r2') as { digest: string };
    const t = await register('BR-20');
    if ('error' in t) throw new Error(t.error);
    const tin = String(getDecision(t.decision!.id)!.content.facts?.tin);
    const c = openCase({ procedure: 'tax.return', fields: { tin, taxType: 'income', period: '2025', baseMinor: 5000 } }, off('o1')) as { id: string };
    const d = addDocument({ class: 'return-form', title: 'x', institution: TAX, belongsTo: { kind: 'case', id: c.id }, bytes: pdf }, 'Clerk') as { id: string };
    attach(c.id, d.id, off('o1'));
    await act(c.id, { action: 'check' }, off('o1'));
    await act(c.id, { action: 'propose', reason: 'r' }, off('o1'));
    await act(c.id, { action: 'assess', reason: 'r' }, off('s1', 'signatory'));
    const done = await act(c.id, { action: 'assess' }, off('s2', 'signatory'));
    if ('error' in done) throw new Error(done.error);
    expect(getDecision(done.decision!.id)!.content.rules).toEqual([{ key: 'tax.income', version: 1, digest: rule.digest }]);
  });
});
