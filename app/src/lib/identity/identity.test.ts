// The identity authority (plan step I6; specification Part 2 §C.1; field
// series Part 4 §3): enrolment with a duplicate review an official decides
// (never a merge), credentials issued, produced and delivered, status reports
// and decisions, identity resolution, and verification through the exchange
// that returns a result and its meaning, never the record. Every decision is
// classified under a proposed, unapproved mapping and refused in production
// until approved; the register is read only by the identity authority, every
// read logged.
import { asNationSets } from '@/lib/casework/testkit';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { NextRequest } from 'next/server';

let official: { id: string; name: string; label: string; institution?: string; role: string } | null = null;
vi.mock('@/lib/auth/official', async importOriginal => ({
  ...(await importOriginal<typeof import('@/lib/auth/official')>()),
  currentOfficial: async () => (official ? { ...official, sub: official.id } : null),
  caseScope: async () => official,
  refusal: async () => null,
  withOfficial: async <T,>(b: T) => b,
}));

const { openCase, act, attach, resetCases, registeredEffects, getCase } = await import('@/lib/casework/engine');
const { draftPackage, approvePackage, resetPackages } = await import('@/lib/casework/packages');
const { addDocument, resetDocuments } = await import('@/lib/records/documents');
const { resetDecisions, getDecision } = await import('@/lib/records/decisions');
const { setSovereign, listMinistries } = await import('@/lib/data/store');
const { classifyDecision } = await import('@/lib/permits/decisions');
const { resetPermitAuthorities, installProposedDefaults, listMappings } = await import('@/lib/permits/authority');
const { callService } = await import('@/lib/exchange/services');
const { listAccess, resetAccessLog } = await import('@/lib/records/access-log');
const { IDENTITY_PROCEDURES, IDENTITY_PERMITS } = await import('./procedures');
const { resetIdentity, getIdentity, getCredential, findCandidates, verifyIdentity, identityCounts, listedIdentity } = await import('./register');
const route = await import('@/app/api/identity/route');
type Actor = import('@/lib/casework/engine').Actor;

let IDA = '', OTHER = '';
const off = (id: string, role: 'officer' | 'signatory' = 'officer', inst = () => IDA): Actor => ({ id, name: `Official ${id}`, scope: { id, role, institution: inst() } });
const pdf = new Uint8Array(Buffer.from('%PDF-1.7\nx\n%%EOF'));
const doc = (caseId: string, cls: string, who: Actor = off('o1')) => { const d = addDocument({ class: cls, title: cls, institution: IDA, belongsTo: { kind: 'case', id: caseId }, bytes: pdf }, 'Clerk') as { id: string }; attach(caseId, d.id, who); };
async function step(id: string, action: string, who: Actor, extra: Record<string, unknown> = {}) { const r = await act(id, { action, ...extra }, who); if ('error' in r) throw new Error(`${action}: ${r.error}`); return r; }
const PERSON = { givenNames: 'Amina', familyName: 'Osei', birthDate: '1990-04-02', eligibilityRule: 'National Identity Act s.4', eligibilityOutcome: 'eligible' };

async function enrol(fields: Record<string, unknown> = PERSON, opts: { duplicate?: string } = {}) {
  const c = openCase({ procedure: 'identity.enrolment', fields }, off('o1')) as { id: string };
  doc(c.id, 'application');
  await step(c.id, 'assess-eligibility', off('o1'), { reason: 'Citizen by birth registration' });
  doc(c.id, 'identity-evidence');
  await step(c.id, 'verify', off('o1'), { reason: 'Documents examined', fields: { verificationMethod: 'Document examination', verificationResult: 'verified' } });
  if (opts.duplicate) await step(c.id, 'determine-duplicate', off('s1', 'signatory'), { reason: 'Different parents and birthplace on the evidence', fields: { duplicateOutcome: opts.duplicate } });
  await step(c.id, 'propose', off('o1'), { reason: 'Eligible and verified' });
  await step(c.id, 'enrol', off('s1', 'signatory'), { reason: 'Enrolled' });
  const done = await step(c.id, 'enrol', off('s2', 'signatory'));
  return { case: done.case, decision: done.decision!, number: String(getDecision(done.decision!.id)?.content.facts?.identity ?? '') };
}
async function credential(identity: string, kind = 'first', replaces?: string) {
  const c = openCase({ procedure: 'identity.credential', fields: { identity, credentialKind: kind, ...(replaces ? { replaces } : {}) } }, off('o1')) as { id: string };
  doc(c.id, 'application');
  await step(c.id, 'assess', off('o1'));
  await step(c.id, 'propose', off('o1'), { reason: 'Validity as the law sets', fields: { credentialType: 'identity-card', validFrom: '2026-10-01', validUntil: '2036-09-30' } });
  await step(c.id, 'issue', off('s1', 'signatory'), { reason: 'Issue' });
  const issued = await step(c.id, 'issue', off('s2', 'signatory'));
  await step(c.id, 'record-production', off('o1'), { fields: { serial: `S-${c.id.slice(-6)}`, qualityChecked: true } });
  expect(await act(c.id, { action: 'record-delivery', fields: { deliveryMethod: 'collected', recipient: 'holder' } }, off('o1'))).toMatchObject({ error: expect.stringMatching(/must be attached/) });
  doc(c.id, 'delivery-evidence');
  await step(c.id, 'record-delivery', off('o1'), { fields: { deliveryMethod: 'collected', recipient: 'holder' } });
  return String(getDecision(issued.decision!.id)?.content.facts?.credential ?? '');
}

describe('identity authority', () => {
  beforeEach(() => {
    for (const r of [resetCases, resetPackages, resetDocuments, resetDecisions, resetIdentity, resetPermitAuthorities, resetAccessLog]) r();
    vi.stubEnv('CIVICOS_DATA_KEK', Buffer.alloc(32, 7).toString('base64'));
    official = null;
    [IDA, OTHER] = listMinistries().slice(0, 2).map(m => m.id) as [string, string];
    setSovereign({ deployment: { authorities: { identity: IDA } } }, 'Administrator');
    for (const p of IDENTITY_PROCEDURES) {
      const d = draftPackage(asNationSets(p), 'Author', 'author', registeredEffects()); if ('error' in d) throw new Error(`${p.key}: ${d.error}`);
      const a = approvePackage(p.key, 1, 'Approver', 'approver', '2026-01-01', registeredEffects(), new Date('2026-01-01')); if ('error' in a) throw new Error(`${p.key}: ${a.error}`);
    }
  });
  afterEach(() => { vi.unstubAllEnvs(); setSovereign({ deployment: { authorities: {} } }, 'test'); });

  it('ships drafts only: restricted, no biometric, template or score field, no day count; every decision under a proposed, unapproved mapping', () => {
    for (const p of IDENTITY_PROCEDURES) {
      expect(p.reference, p.key).toBe(true);
      expect(p.sensitivity, p.key).toBe('restricted');
      expect(p.owner, p.key).toBe('identity');
      expect(p.deadlines, p.key).toEqual([]);
      for (const f of p.fields) expect(`${f.key} ${f.label}`, `${p.key} ${f.key}`).not.toMatch(/biometric|fingerprint|iris|template|score|risk level/i);
      for (const a of p.actions.filter(x => x.decision)) {
        expect(a.needs.role, `${p.key} ${a.key}`).toBe('signatory');
        expect(classifyDecision({ fields: {} } as never, a, p as never), `${p.key} ${a.key}`).toMatchObject({ kind: 'mapping', permitType: expect.stringMatching(/^identity-/) });
      }
    }
    installProposedDefaults('Installer');
    for (const t of new Set(Object.values(IDENTITY_PERMITS))) expect(listMappings(t), t).toEqual([expect.objectContaining({ state: 'draft', lead: 'identity' })]);
  });

  it('enrols an identity four-eyes; a possible duplicate is a flag an official determines with reasons, never a merge', async () => {
    const first = await enrol({ ...PERSON, civilRegistration: 'BR-1990-000123', linkBasis: 'National Identity Act s.6 (reliance on the civil register)' });
    const r = getIdentity(first.number)!;
    expect(r).toMatchObject({ state: 'active', civilLink: { registration: 'BR-1990-000123' }, decision: first.decision.id });
    expect(r.claims.find(x => x.attribute === 'familyName')).toMatchObject({ value: 'Osei', source: 'civil-register', verification: 'verified' });
    // The same names and date of birth: the enrolment cannot be proposed until an official determines it.
    const c = openCase({ procedure: 'identity.enrolment', fields: PERSON }, off('o1')) as { id: string };
    doc(c.id, 'application');
    await step(c.id, 'assess-eligibility', off('o1'), { reason: 'x' });
    doc(c.id, 'identity-evidence');
    await step(c.id, 'verify', off('o1'), { reason: 'x', fields: { verificationMethod: 'Interview', verificationResult: 'verified' } });
    expect(await act(c.id, { action: 'propose', reason: 'x' }, off('o1'))).toMatchObject({ error: expect.stringMatching(/Possible duplicate of ID-.*determines it with reasons first \(never a merge\)/) });
    // An officer cannot determine it; an official who can sign does, with reasons.
    expect(await act(c.id, { action: 'determine-duplicate', reason: 'x', fields: { duplicateOutcome: 'different-persons' } }, off('o1'))).toHaveProperty('error');
    await step(c.id, 'determine-duplicate', off('s1', 'signatory'), { reason: 'Different birthplace and parents on the evidence', fields: { duplicateOutcome: 'different-persons' } });
    await step(c.id, 'propose', off('o1'), { reason: 'x' });
    await step(c.id, 'enrol', off('s1', 'signatory'), { reason: 'x' });
    expect(await act(c.id, { action: 'enrol' }, off('s1', 'signatory'))).toMatchObject({ error: expect.any(String) });
    await step(c.id, 'enrol', off('s2', 'signatory'));
    expect(identityCounts().records).toEqual({ active: 2 });
    // An unverified identity is never enrolled.
    const u = openCase({ procedure: 'identity.enrolment', fields: { ...PERSON, familyName: 'Mensah' } }, off('o1')) as { id: string };
    doc(u.id, 'application'); await step(u.id, 'assess-eligibility', off('o1'), { reason: 'x' });
    doc(u.id, 'identity-evidence'); await step(u.id, 'verify', off('o1'), { reason: 'x', fields: { verificationMethod: 'x', verificationResult: 'unresolved' } });
    expect(await act(u.id, { action: 'propose', reason: 'x' }, off('o1'))).toMatchObject({ error: expect.stringMatching(/not verified/) });
  });

  it('issues a credential with production and delivery records; identity.verify returns the result and its meaning, never the record', async () => {
    const { number } = await enrol();
    const cred = await credential(number);
    expect(getCredential(cred)).toMatchObject({ state: 'active', type: 'identity-card', validUntil: '2036-09-30', production: { qualityChecked: true }, delivery: { method: 'collected', recipient: 'holder', evidence: expect.any(String) } });
    const caller = { kind: 'module' as const, id: 'test', name: 'Benefits' };
    const ok = await callService(caller, 'identity.verify', { number: cred, familyName: 'Osei', birthDate: '1990-04-02' }, 'benefit claim');
    expect(ok.data).toMatchObject({ result: 'verified', credentialState: 'active', validUntil: '2036-09-30' });
    expect(Object.keys(ok.data!).sort()).toEqual(['credentialState', 'meaning', 'result', 'source', 'validUntil']);
    expect(JSON.stringify(ok.data)).not.toMatch(/Amina|1990-04-02|BR-/);
    expect(ok.receipt.id).toBeTruthy();
    const wrong = await callService(caller, 'identity.verify', { number: cred, familyName: 'Someone', birthDate: '1990-04-02' }, 'benefit claim');
    expect(wrong.data).toMatchObject({ result: 'not_verified', meaning: expect.stringMatching(/not proof that the person does not exist/) });
    expect((await callService(caller, 'identity.verify', { number: cred }, 'x')).data).toMatchObject({ result: 'unable_to_verify' });
    // With no identity authority named, the service cannot answer: it says so, never a negative answer.
    setSovereign({ deployment: { authorities: {} } }, 'test');
    expect(await callService(caller, 'identity.verify', { number: cred, familyName: 'Osei' }, 'x')).toMatchObject({ status: 503, data: { result: 'unable_to_verify' } });
  });

  it('records a loss as a report (not proof of fraud), then a decided cancellation; a replacement follows the report and replaces on delivery', async () => {
    const { number } = await enrol();
    const cred = await credential(number);
    // A replacement for a loss needs the recorded report first.
    const early = openCase({ procedure: 'identity.credential', fields: { identity: number, credentialKind: 'replacement-lost', replaces: cred } }, off('o1')) as { id: string };
    doc(early.id, 'application');
    expect(await act(early.id, { action: 'assess' }, off('o1'))).toMatchObject({ error: expect.stringMatching(/no lost report recorded/) });
    const s = openCase({ procedure: 'identity.credential-status', fields: { credential: cred, statusKind: 'lost', circumstances: 'Lost on a bus' } }, off('o1')) as { id: string };
    doc(s.id, 'report');
    await step(s.id, 'record-report', off('o1'));
    expect(getCredential(cred)!.state).toBe('reported-lost');
    expect(verifyIdentity({ number: cred, familyName: 'Osei' })).toMatchObject({ result: 'additional_review_required', credentialState: 'reported-lost' });
    const cancelled = await step(s.id, 'cancel', off('s1', 'signatory'), { reason: 'Not found within the period the holder gave' });
    expect(cancelled.decision).toBeTruthy();
    expect(getCredential(cred)).toMatchObject({ state: 'cancelled', history: expect.arrayContaining([expect.objectContaining({ what: 'reported-lost → cancelled', reason: 'Not found within the period the holder gave' })]) });
    const replacement = await credential(number, 'replacement-lost', cred);
    expect(getCredential(replacement)).toMatchObject({ state: 'active', replaces: cred });
    // A cancelled credential is kept, never replaced twice or deleted.
    expect(getCredential(cred)!.state).toBe('cancelled');
    expect(getIdentity(number)!.credentials).toHaveLength(2);
  });

  it('revokes only after notice and representations, by two officials; a correction and a reinstatement are decisions with reasons', async () => {
    const { number } = await enrol();
    const cred = await credential(number);
    const s = openCase({ procedure: 'identity.credential-status', fields: { credential: cred, statusKind: 'revocation' } }, off('o1')) as { id: string };
    doc(s.id, 'report');
    await step(s.id, 'record-report', off('o1'));
    expect(getCredential(cred)!.state).toBe('active');
    await step(s.id, 'suspend', off('s1', 'signatory'), { reason: 'Obtained with a document reported forged' });
    expect(getCredential(cred)!.state).toBe('suspended');
    expect(await act(s.id, { action: 'revoke', reason: 'x', fields: { reviewRoute: 'x' } }, off('s1', 'signatory'))).toHaveProperty('error');
    doc(s.id, 'notice');
    await step(s.id, 'notify', off('o1'), { reason: 'Notice served' });
    await step(s.id, 'propose', off('o1'), { reason: 'Representations considered' });
    await step(s.id, 'revoke', off('s1', 'signatory'), { reason: 'Revoked', fields: { reviewRoute: 'Identity Appeals Board' } });
    await step(s.id, 'revoke', off('s2', 'signatory'));
    expect(getCredential(cred)!.state).toBe('revoked');
  });

  it('resolves a suspected duplicate by an official\'s determination: the later record is superseded by a link and kept, its credentials cancelled', async () => {
    const a = await enrol();
    const b = await enrol({ ...PERSON, birthDate: '1990-04-03' });
    const credB = await credential(b.number);
    const r = openCase({ procedure: 'identity.resolution', fields: { resolutionKind: 'duplicate', records: `${a.number}\n${b.number}`, allegation: 'Same person enrolled twice (reported by a registrar)' } }, off('o1')) as { id: string };
    doc(r.id, 'report');
    await step(r.id, 'open-review', off('o1'));
    expect(getIdentity(a.number)!.underReview).toMatchObject({ case: r.id, kind: 'duplicate' });
    expect(verifyIdentity({ number: credB, familyName: 'Osei' })).toMatchObject({ result: 'additional_review_required' });
    // No credential is issued on a record under review.
    const blocked = openCase({ procedure: 'identity.credential', fields: { identity: a.number, credentialKind: 'first' } }, off('o1')) as { id: string };
    doc(blocked.id, 'application');
    expect(await act(blocked.id, { action: 'assess' }, off('o1'))).toMatchObject({ error: expect.stringMatching(/under review/) });
    doc(r.id, 'comparison-evidence');
    await step(r.id, 'propose', off('o1'), { reason: 'Same person: the birth date was mistyped at the second enrolment', fields: { comparison: 'Same photograph, same parents, same civil register entry', outcome: 'same-person' } });
    await step(r.id, 'determine', off('s1', 'signatory'), { reason: 'Same person, determined on the comparison' });
    const d = await step(r.id, 'determine', off('s2', 'signatory'));
    const later = getIdentity(b.number)!;
    expect(later).toMatchObject({ state: 'superseded', supersededBy: a.number });
    expect(later.resolution).toEqual([expect.objectContaining({ other: a.number, outcome: 'same-person', decision: d.decision!.id })]);
    expect(getCredential(credB)!.state).toBe('cancelled');
    expect(getIdentity(a.number)!.underReview).toBeUndefined();
    expect(findCandidates({ givenNames: 'Amina', familyName: 'Osei', birthDate: '1990-04-03' })).toEqual([]);
    expect(identityCounts().records).toEqual({ active: 1, superseded: 1 });
  });

  it('contains suspected misuse by suspending named credentials, and reinstates them when misuse is not confirmed', async () => {
    const { number } = await enrol();
    const cred = await credential(number);
    const r = openCase({ procedure: 'identity.resolution', fields: { resolutionKind: 'misuse', records: number, allegation: 'A bank reports the credential used by someone else' } }, off('o1')) as { id: string };
    doc(r.id, 'report');
    await step(r.id, 'open-review', off('o1'));
    await step(r.id, 'contain', off('s1', 'signatory'), { reason: 'Suspended while the report is reviewed', fields: { credentialsToSuspend: cred } });
    expect(getCredential(cred)!.state).toBe('suspended');
    doc(r.id, 'comparison-evidence');
    await step(r.id, 'propose', off('o1'), { reason: 'The bank\'s record matched a different card', fields: { comparison: 'x', outcome: 'misuse-not-confirmed' } });
    await step(r.id, 'determine', off('s1', 'signatory'), { reason: 'Not confirmed' });
    await step(r.id, 'determine', off('s2', 'signatory'));
    expect(getCredential(cred)!.state).toBe('active');
  });

  it('refuses every decision in production until the nation approves its mapping', async () => {
    vi.stubEnv('CIVICOS_MODE', 'production');
    const c = openCase({ procedure: 'identity.enrolment', fields: PERSON }, off('o1')) as { id: string };
    doc(c.id, 'application');
    await step(c.id, 'assess-eligibility', off('o1'), { reason: 'x' });
    doc(c.id, 'identity-evidence');
    await step(c.id, 'verify', off('o1'), { reason: 'x', fields: { verificationMethod: 'x', verificationResult: 'verified' } });
    await step(c.id, 'propose', off('o1'), { reason: 'x' });
    expect(await act(c.id, { action: 'enrol', reason: 'x' }, off('s1', 'signatory'))).toMatchObject({ error: expect.stringMatching(/identity-enrolment/) });
    expect(getCase(c.id)!.stage).toBe('pending-approval');
  });

  it('is read only by the identity authority, every search and refusal logged; a name search states its purpose; lists mask numbers', async () => {
    const { number } = await enrol();
    const as = (who: Actor | null) => { official = who ? { id: who.id!, name: who.name, label: who.name, institution: who.scope!.institution, role: who.scope!.role! } : null; };
    const get = async (qs: string) => route.GET(new NextRequest(`http://localhost/api/identity${qs}`));
    as(off('o1'));
    const counts = await (await get('')).json();
    expect(counts.records).toEqual([]);
    expect(JSON.stringify(counts)).not.toMatch(/Osei|ID-20/);
    expect((await (await get(`?number=${number}`)).json()).records[0]).toMatchObject({ number, claims: expect.any(Array) });
    expect((await get('?familyName=Osei&birthDate=1990-04-02')).status).toBe(403);
    expect((await (await get('?familyName=Osei&birthDate=1990-04-02&purpose=duplicate%20review')).json()).records).toHaveLength(1);
    const masked = (await (await get(`?number=${number}&masked=1`)).json()).records[0];
    expect(masked.number).toMatch(/^ID-•••\d{3}$/);
    expect(listedIdentity(getIdentity(number)!)).not.toHaveProperty('claims');
    as(off('x1', 'signatory', () => OTHER));
    expect((await get(`?number=${number}`)).status).toBe(403);
    const log = listAccess({});
    expect(log.filter(e => e.record.register === 'identity').map(e => e.result)).toEqual(expect.arrayContaining(['allowed', 'refused']));
    expect(log.some(e => e.record.register === 'identity' && e.result === 'refused' && e.by.institution === OTHER)).toBe(true);
    expect(log.some(e => e.purpose === 'duplicate review')).toBe(true);
  });
});
