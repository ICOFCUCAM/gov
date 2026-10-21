import { setNationDays } from '@/lib/casework/testkit';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { installReferenceProcedures } from './procedures';
import { resetCivil, getEvent, searchPersons, getPerson, current } from './register';
import { approvePackage, resetPackages, runPackageTests, getPackage } from '@/lib/casework/packages';
import { openCase, act, attach, resetCases, registeredEffects, type Actor } from '@/lib/casework/engine';
import { addDocument, resetDocuments } from '@/lib/records/documents';
import { getDecision, resetDecisions } from '@/lib/records/decisions';
import { checkCode, resetCertificates } from '@/lib/records/certificates';
import { setSovereign, listMinistries } from '@/lib/data/store';

let CIVIL = '';
const as = (id: string, role: 'officer' | 'signatory' = 'officer'): Actor => ({ id, name: `Registrar ${id}`, scope: { id, role, institution: CIVIL } });
const pdf = new Uint8Array(Buffer.from('%PDF-1.7\nnotification\n%%EOF'));
const fields = { childGiven: 'Amara', childFamily: 'Okafor', sex: 'female', birthDate: '2026-09-01', birthPlace: 'District hospital', region: 'North', motherGiven: 'Ngozi', motherFamily: 'Okafor', informantName: 'Ngozi Okafor', informantRelation: 'mother' };

async function registerOne(f = fields) {
  const c = openCase({ procedure: 'civil.birth', fields: f }, as('clerk')) as { id: string; ref: string };
  await act(c.id, { action: 'check' }, as('clerk'));
  const d = addDocument({ class: 'birth-notification', title: 'Notification', institution: CIVIL, belongsTo: { kind: 'case', id: c.id }, bytes: pdf }, 'clerk') as { id: string };
  attach(c.id, d.id, as('clerk'));
  await act(c.id, { action: 'complete' }, as('clerk'));
  return c;
}

describe('birth registration on the workflow foundation', () => {
  beforeEach(() => {
    for (const r of [resetCivil, resetPackages, resetCases, resetDocuments, resetDecisions, resetCertificates]) r();
    vi.stubEnv('CIVICOS_DATA_KEK', Buffer.alloc(32, 4).toString('base64'));
    CIVIL = listMinistries()[0]!.id;
    setSovereign({ deployment: { authorities: { civilRegistration: CIVIL } } }, 'test');
  });

  it('ships as a draft whose own tests pass, and runs only once the authority approves it', async () => {
    expect(installReferenceProcedures('Administrator').drafted).toContain('civil.birth');
    expect(installReferenceProcedures('Administrator').present).toContain('civil.birth');
    expect(runPackageTests(getPackage('civil.birth', 1)!)).toEqual({ ok: true, failures: [] });
    expect(openCase({ procedure: 'civil.birth' }, as('clerk'))).toHaveProperty('error');
    setNationDays();
    expect(approvePackage('civil.birth', 1, 'Chief Registrar', 'chief', '2026-01-01', registeredEffects(), new Date('2026-01-01'))).toMatchObject({ state: 'approved' });
  });

  it('registers a birth four-eyes, seals the decision with its number, issues a certificate anyone can check', async () => {
    installReferenceProcedures('Administrator');
    setNationDays();
    approvePackage('civil.birth', 1, 'Chief Registrar', 'chief', '2026-01-01', registeredEffects(), new Date('2026-01-01'));
    const c = await registerOne();
    expect(await act(c.id, { action: 'verify' }, as('clerk'))).toMatchObject({ case: { stage: 'pending-approval' } });
    expect(await act(c.id, { action: 'register', reason: 'Notification verified against the facility register.' }, as('r1', 'signatory'))).toMatchObject({ pending: true });
    const done = await act(c.id, { action: 'register' }, as('r2', 'signatory'));
    if ('error' in done) throw new Error(done.error);
    const decision = getDecision(done.decision!.id)!;
    expect(decision.content.facts).toMatchObject({ registrationNumber: 'BR-2026-000001', dateOfBirth: '2026-09-01', late: false });
    expect(getEvent('BR-2026-000001')).toMatchObject({ case: c.id, decision: decision.id, place: { region: 'North' } });
    const issued = await act(c.id, { action: 'issue' }, as('clerk'));
    if ('error' in issued) throw new Error(issued.error);
    expect(issued.case.stage).toBe('certificate-issued');
    const code = issued.case.history.at(-1) && (await import('@/lib/records/certificates')).certificatesFor([decision.id])[0]!.code;
    expect(checkCode(code!)).toMatchObject({ status: 'valid', sealOk: true, publicFacts: { 'Registration number': 'BR-2026-000001' } });
    expect(JSON.stringify(checkCode(code!))).not.toContain('Amara');
  });

  it('stops a possible duplicate at verification until it is adjudicated', async () => {
    installReferenceProcedures('Administrator');
    setNationDays();
    approvePackage('civil.birth', 1, 'Chief Registrar', 'chief', '2026-01-01', registeredEffects(), new Date('2026-01-01'));
    const first = await registerOne();
    await act(first.id, { action: 'verify' }, as('clerk'));
    await act(first.id, { action: 'register', reason: 'ok' }, as('r1', 'signatory'));
    await act(first.id, { action: 'register' }, as('r2', 'signatory'));
    const second = await registerOne();
    expect(await act(second.id, { action: 'verify' }, as('clerk'))).toMatchObject({ error: expect.stringMatching(/Possible duplicate of BR-2026-000001/) });
    await act(second.id, { action: 'refer-adjudication', reason: 'Same names and date of birth' }, as('clerk'));
    expect(await act(second.id, { action: 'adjudicate', reason: 'Twins: different persons' }, as('r1', 'signatory'))).toMatchObject({ case: { stage: 'pending-approval' } });
    expect(searchPersons({ family: 'Okafor' })).toHaveLength(1);
  });
});

describe('the other civil procedures', () => {
  beforeEach(() => {
    for (const r of [resetCivil, resetPackages, resetCases, resetDocuments, resetDecisions, resetCertificates]) r();
    vi.stubEnv('CIVICOS_DATA_KEK', Buffer.alloc(32, 4).toString('base64'));
    CIVIL = listMinistries()[0]!.id;
    setSovereign({ deployment: { authorities: { civilRegistration: CIVIL } } }, 'test');
  });

  it('ship as drafts whose tests pass, and register deaths, marriages and corrections of persons in the register', async () => {
    expect(installReferenceProcedures('Administrator').drafted).toEqual(['civil.birth', 'civil.late-birth', 'civil.death', 'civil.marriage', 'civil.correction']);
    setNationDays();
    for (const k of ['civil.birth', 'civil.late-birth', 'civil.death', 'civil.marriage', 'civil.correction']) {
      expect(runPackageTests(getPackage(k, 1)!), k).toEqual({ ok: true, failures: [] });
      approvePackage(k, 1, 'Chief Registrar', 'chief', '2026-01-01', registeredEffects(), new Date('2026-01-01'));
    }
    const a = await registerOne(); await act(a.id, { action: 'verify' }, as('clerk'));
    await act(a.id, { action: 'register', reason: 'ok' }, as('r1', 'signatory')); await act(a.id, { action: 'register' }, as('r2', 'signatory'));
    const b = await registerOne({ ...fields, childGiven: 'Tunde', childFamily: 'Bello', motherFamily: 'Bello' }); await act(b.id, { action: 'verify' }, as('clerk'));
    await act(b.id, { action: 'register', reason: 'ok' }, as('r1', 'signatory')); await act(b.id, { action: 'register' }, as('r2', 'signatory'));
    const run = async (procedure: string, f: Record<string, unknown>, docs: string[], decision: string) => {
      const c = openCase({ procedure, fields: f }, as('clerk')) as { id: string };
      for (const cls of docs) { const d = addDocument({ class: cls, title: cls, institution: CIVIL, belongsTo: { kind: 'case', id: c.id }, bytes: pdf }, 'clerk') as { id: string }; attach(c.id, d.id, as('clerk')); }
      await act(c.id, { action: 'check' }, as('clerk')); await act(c.id, { action: 'verify' }, as('clerk'));
      await act(c.id, { action: decision, reason: 'Evidence verified' }, as('r1', 'signatory'));
      return act(c.id, { action: decision }, as('r2', 'signatory'));
    };
    expect(await run('civil.marriage', { spouseOneRegistration: 'BR-2026-000001', spouseTwoRegistration: 'BR-2026-000002', marriageDate: '2026-10-01', form: 'customary' }, ['marriage-record', 'consent'], 'register')).toMatchObject({ case: { stage: 'registered' }, decision: { content: { facts: { registrationNumber: 'MR-2026-000001', form: 'customary' } } } });
    expect(await run('civil.correction', { personRegistration: 'BR-2026-000001', correctGiven: 'Amarachi', grounds: 'Spelling on the hospital record' }, ['supporting-evidence'], 'correct')).toMatchObject({ case: { stage: 'registered' } });
    expect(current(getPerson('BR-2026-000001')!).names.given).toBe('Amarachi');
    expect(await run('civil.death', { deceasedRegistration: 'BR-2026-000002', deathDate: '2026-10-10' }, ['death-notification'], 'register')).toMatchObject({ decision: { content: { facts: { registrationNumber: 'DR-2026-000001' } } } });
    expect(await run('civil.death', { deceasedRegistration: 'BR-9999', deathDate: '2026-10-10' }, ['death-notification'], 'register')).toMatchObject({ error: expect.stringMatching(/No person/) });
  });
});
