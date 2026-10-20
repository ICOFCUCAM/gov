import { describe, it, expect, beforeEach } from 'vitest';
import { openCase, act, attach, refer, cancelPending, lapseDeadlines, getCase, resetCases, registerEffect, registeredEffects, type Actor } from './engine';
import { draftPackage, approvePackage, resetPackages } from './packages';
import { samplePackage } from './testkit';
import { addDays } from './calendar';
import { addDocument, resetDocuments } from '@/lib/records/documents';
import { getDecision, verifyDecision, resetDecisions } from '@/lib/records/decisions';
import { recordVersion, confirmVersion, resetLaw } from '@/lib/law/register';
import { setSovereign, listMinistries } from '@/lib/data/store';

let OWNER = '';
const official = (id: string, role: 'officer' | 'signatory' | 'administrator' = 'officer', institution = OWNER): Actor => ({ id, name: `Official ${id}`, scope: { id, role, institution } });
const pdf = new Uint8Array(Buffer.from('%PDF-1.7\nform\n%%EOF'));

function ready(x = {}) {
  const d = draftPackage(samplePackage(x), 'Author', 'author', registeredEffects());
  if ('error' in d) throw new Error(d.error);
  const a = approvePackage(d.key, d.version, 'Approver', 'approver', '2026-01-01', registeredEffects(), new Date('2026-01-01'));
  if ('error' in a) throw new Error(a.error);
}

describe('workflow engine', () => {
  beforeEach(() => {
    resetCases(); resetPackages(); resetDocuments(); resetDecisions(); resetLaw();
    OWNER = listMinistries()[0]!.id;
    setSovereign({ deployment: { authorities: { businessRegister: OWNER, judiciary: '' } } }, 'test');
  });

  it('opens only under an approved procedure whose authority is named, by that institution\'s officials', () => {
    expect(openCase({ procedure: 'test.licence' }, official('a'))).toMatchObject({ error: expect.stringMatching(/No approved version/) });
    ready({ owner: 'businessRegister' });
    expect(openCase({ procedure: 'test.licence' }, official('a', 'officer', 'elsewhere'))).toHaveProperty('error');
    const c = openCase({ procedure: 'test.licence', fields: { name: 'Ade' } }, official('a'));
    if ('error' in c) throw new Error(c.error);
    expect(c).toMatchObject({ stage: 'submitted', owner: OWNER, ref: expect.stringMatching(/^TL-\d{4}-\d{6}$/), version: 1 });
    expect(openCase({ procedure: 'test.licence', fields: { name: 5 } }, official('a'))).toHaveProperty('error');
  });

  it('moves only by the procedure, with its documents, and refuses stale or repeated steps', async () => {
    ready({ owner: 'businessRegister' });
    const c = openCase({ procedure: 'test.licence', fields: { name: 'Ade' }, idempotencyKey: 'k1' }, official('a')) as { id: string; version: number };
    expect(openCase({ procedure: 'test.licence', idempotencyKey: 'k1' }, official('a'))).toMatchObject({ id: c.id });
    expect(await act(c.id, { action: 'grant', reason: 'x' }, official('s', 'signatory'))).toMatchObject({ error: expect.stringMatching(/not possible/) });
    expect(await act(c.id, { action: 'accept' }, official('a'))).toMatchObject({ error: expect.stringMatching(/Application form/) });
    const doc = addDocument({ class: 'application-form', title: 'Form', institution: OWNER, belongsTo: { kind: 'case', id: c.id }, bytes: pdf }, 'A') as { id: string };
    attach(c.id, doc.id, official('a'));
    expect(await act(c.id, { action: 'accept', expectedVersion: 1 }, official('a'))).toMatchObject({ error: expect.stringMatching(/changed since/) });
    const r = await act(c.id, { action: 'accept', expectedVersion: 2, idempotencyKey: 'step-1' }, official('a'));
    if ('error' in r) throw new Error(r.error);
    expect(r.case.stage).toBe('review');
    expect((await act(c.id, { action: 'accept', idempotencyKey: 'step-1' }, official('a')) as { case: { version: number } }).case.version).toBe(r.case.version);
    expect(r.case.deadlines.find(d => d.key === 'decide')?.due).toBe(addDays(r.case.history[1]!.at, 10, 'working'));
  });

  it('decides with four eyes, seals the decision with the law in force, and opens the appeal window', async () => {
    const law = recordVersion({ instrument: { title: 'Licensing Act', type: 'act', jurisdiction: 'X', year: 2020, number: '1', issuingAuthority: 'Parliament' }, dates: { inForce: '2020-01-01' }, provisions: [{ eId: 'sec_5', num: '5', text: 'The registrar may grant a licence.' }] }, 'L1', 'l1');
    if ('error' in law) throw new Error(law.error);
    confirmVersion(law.instrument.id, law.version.id, 'L2', 'l2');
    ready({ owner: 'businessRegister', citations: [{ instrument: law.instrument.id, eId: 'sec_5', version: law.version.id, digest: law.version.digest, on: '2026-01-01' }] });
    const c = openCase({ procedure: 'test.licence', fields: { name: 'Ade' } }, official('a')) as { id: string };
    const doc = addDocument({ class: 'application-form', title: 'Form', institution: OWNER, belongsTo: { kind: 'case', id: c.id }, bytes: pdf }, 'A') as { id: string };
    attach(c.id, doc.id, official('a'));
    await act(c.id, { action: 'accept' }, official('a'));
    expect(await act(c.id, { action: 'grant', reason: 'Meets the conditions.' }, official('a'))).toMatchObject({ error: expect.stringMatching(/can sign/) });
    expect(await act(c.id, { action: 'grant', reason: 'Meets the conditions.' }, official('x', 'administrator', undefined as unknown as string))).toHaveProperty('error');
    const p = await act(c.id, { action: 'grant', reason: 'Meets the conditions.' }, official('s1', 'signatory'));
    expect(p).toMatchObject({ pending: true, case: { stage: 'review' } });
    expect(await act(c.id, { action: 'refuse', reason: 'x' }, official('s2', 'signatory'))).toMatchObject({ error: expect.stringMatching(/waiting for a second official/) });
    expect(await act(c.id, { action: 'grant' }, official('s1', 'signatory'))).toMatchObject({ error: expect.stringMatching(/different official/) });
    const done = await act(c.id, { action: 'grant' }, official('s2', 'signatory'));
    if ('error' in done) throw new Error(done.error);
    expect(done.case).toMatchObject({ stage: 'granted', closedAt: expect.any(String) });
    expect(done.case.history.at(-1)).toMatchObject({ by: { id: 's1' }, confirmedBy: { id: 's2' }, citations: [{ eId: 'sec_5', version: law.version.id }] });
    const d = getDecision(done.decision!.id)!;
    expect(verifyDecision(d).ok).toBe(true);
    expect(d.content.officials.map(o => o.role)).toEqual(['decided', 'confirmed']);
    expect(done.case.deadlines.find(x => x.key === 'appeal')).toBeTruthy();
    expect(done.case.deadlines.find(x => x.key === 'decide')?.met).toBeTruthy();
  });

  it('runs the owning module\'s effects and keeps the facts in the sealed decision', async () => {
    registerEffect('test.number', ({ case: c }) => ({ facts: { licenceNumber: `L-${c.ref}` }, after: (d, cc) => { (globalThis as Record<string, unknown>).__afterSaw = `${d?.id}:${cc.stage}`; } }));
    ready({ owner: 'businessRegister', actions: [...samplePackage().actions.slice(0, 1), { key: 'grant', label: 'Grant', from: ['review'], to: 'granted', decision: 'grant', needs: { role: 'signatory' }, requires: { reasons: true }, effects: ['test.number'] }, samplePackage().actions[2]!] });
    const c = openCase({ procedure: 'test.licence', fields: { name: 'Ade' } }, official('a')) as { id: string; ref: string };
    const doc = addDocument({ class: 'application-form', title: 'Form', institution: OWNER, belongsTo: { kind: 'case', id: c.id }, bytes: pdf }, 'A') as { id: string };
    attach(c.id, doc.id, official('a'));
    await act(c.id, { action: 'accept' }, official('a'));
    const r = await act(c.id, { action: 'grant', reason: 'ok' }, official('s', 'signatory'));
    if ('error' in r) throw new Error(r.error);
    expect(getDecision(r.decision!.id)?.content.facts).toEqual({ licenceNumber: `L-${c.ref}` });
    expect((globalThis as Record<string, unknown>).__afterSaw).toBe(`${r.decision!.id}:granted`);
  });

  it('refers to another institution, withdraws a proposal, and lapses deadlines', async () => {
    const other = listMinistries()[1]!.id;
    ready({ owner: 'businessRegister' });
    const d2 = draftPackage(samplePackage({ key: 'test.inspection', owner: other, refPrefix: 'TI' }), 'Author', 'author', []);
    if ('error' in d2) throw new Error(d2.error);
    approvePackage('test.inspection', 1, 'Approver', 'approver', '2026-01-01', [], new Date('2026-01-01'));
    const c = openCase({ procedure: 'test.licence', fields: { name: 'Ade' } }, official('a')) as { id: string };
    const r = refer(c.id, { procedure: 'test.inspection', reason: 'Fire safety inspection of the premises' }, official('a'));
    if ('error' in r) throw new Error(r.error);
    expect(r.to).toMatchObject({ owner: other, links: [{ kind: 'referred-from', case: c.id }] });
    expect(r.from.links).toEqual([{ kind: 'referral', case: r.to.id }]);
    const doc = addDocument({ class: 'application-form', title: 'Form', institution: OWNER, belongsTo: { kind: 'case', id: c.id }, bytes: pdf }, 'A') as { id: string };
    attach(c.id, doc.id, official('a'));
    await act(c.id, { action: 'accept' }, official('a'));
    expect(lapseDeadlines(new Date(Date.now() + 40 * 86_400_000))).toEqual([expect.objectContaining({ deadline: 'decide', onLapse: 'escalate' })]);
    expect(getCase(c.id)?.priority).toBe('priority');
    const lic = await act(c.id, { action: 'grant', reason: 'ok' }, official('s1', 'signatory'));
    expect(lic).toMatchObject({ pending: true });
    expect(cancelPending(c.id, official('a'), '')).toHaveProperty('error');
    expect(cancelPending(c.id, official('a'), 'Wrong case')).not.toHaveProperty('error');
    expect(getCase(c.id)?.pending).toBeUndefined();
  });
});
