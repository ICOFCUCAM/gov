// Passports and travel documents (plan step I6; field series Part 4 §5;
// specification Part 2 §C.4): the fee only from the approved schedule (its
// version sealed with the decision), identity through the identity.verify
// exchange (a check that cannot be made holds the case and is never a ground
// for refusal: acceptance P2-08), production with quality checks and a
// reconciliation, custody and collection, the ICAO Doc 9303 data elements and
// no biometric template, lost reports that are not proof of fraud, reviews by
// officials who took no part in a refusal, and reads logged with a purpose.
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

const { openCase, act, attach, resetCases, registeredEffects, getCase, cancelPending } = await import('@/lib/casework/engine');
const { draftPackage, approvePackage, resetPackages } = await import('@/lib/casework/packages');
const { addDocument, resetDocuments } = await import('@/lib/records/documents');
const { resetDecisions, getDecision } = await import('@/lib/records/decisions');
const { setSovereign, listMinistries, listBills } = await import('@/lib/data/store');
const { classifyDecision } = await import('@/lib/permits/decisions');
const { resetPermitAuthorities, installProposedDefaults, listMappings } = await import('@/lib/permits/authority');
const { draftRule, approveRule, resetRules } = await import('@/lib/law/rules');
const { recordVersion, confirmVersion, resetLaw } = await import('@/lib/law/register');
const { callService } = await import('@/lib/exchange/services');
const { listAccess, resetAccessLog } = await import('@/lib/records/access-log');
const { resetIdentity, enrolIdentity, requestCredential, recordProduction: produceCredential, recordDelivery } = await import('@/lib/identity/register');
const { PASSPORT_PROCEDURES, PASSPORT_PERMITS } = await import('./procedures');
const { resetPassports, getTravelDocument, documentStatus, productionReconciliation, reviewsOf, ICAO_ELEMENTS } = await import('./register');
const route = await import('@/app/api/passports/route');
type Actor = import('@/lib/casework/engine').Actor;

let TDA = '', IDA = '', OTHER = '';
const off = (id: string, role: 'officer' | 'signatory' = 'officer', inst = () => TDA): Actor => ({ id, name: `Official ${id}`, scope: { id, role, institution: inst() } });
const pdf = new Uint8Array(Buffer.from('%PDF-1.7\nx\n%%EOF'));
const doc = (caseId: string, cls: string) => { const d = addDocument({ class: cls, title: cls, institution: TDA, belongsTo: { kind: 'case', id: caseId }, bytes: pdf }, 'Clerk') as { id: string }; attach(caseId, d.id, off('o1')); };
async function step(id: string, action: string, who: Actor, extra: Record<string, unknown> = {}) { const r = await act(id, { action, ...extra }, who); if ('error' in r) throw new Error(`${action}: ${r.error}`); return r; }
let CREDENTIAL = '';
const APPLICANT = () => ({ applicationKind: 'first', documentType: 'ordinary', identityNumber: CREDENTIAL, surname: 'Osei', givenNames: 'Amina', birthDate: '1990-04-02', nationality: 'KEN', sex: 'F' });
let lawId = '';
function feeSchedule(amounts: { code: string; amountMinor: number }[], from = '2026-01-01') {
  const d = draftRule({ key: 'passports.fees', title: 'Passport fees', kind: 'fixed-amounts', owner: 'travelDocuments', effectiveFrom: from, amounts, citations: [{ instrument: lawId, eId: 'sch_1' }], tests: [{ name: 'ordinary', input: { amountMinor: 0, code: amounts[0]!.code }, expectMinor: amounts[0]!.amountMinor }] }, 'Drafter', 'drafter') as { version: number };
  const a = approveRule('passports.fees', d.version, 'Approver', 'approver');
  if ('error' in a) throw new Error(a.error);
}
async function applyUntilVerified(fields: Record<string, unknown> = APPLICANT()) {
  const c = openCase({ procedure: 'passport.application', fields }, off('o1')) as { id: string };
  doc(c.id, 'application'); doc(c.id, 'photograph');
  await step(c.id, 'assess-fee', off('o1'));
  await step(c.id, 'verify-identity', off('o1'));
  return c.id;
}
async function issue(id: string, numbers: string[] = ['AK1234567']) {
  await step(id, 'propose', off('o1'), { reason: 'Eligible', fields: { validFrom: '2026-11-01', validUntil: '2036-10-31' } });
  await step(id, 'issue', off('s1', 'signatory'), { reason: 'Issue' });
  const decided = await step(id, 'issue', off('s2', 'signatory'));
  for (const [i, n] of numbers.entries()) {
    await step(id, 'record-production', off('o1'), { fields: { documentNumber: n, batch: 'B-2026-11' } });
    if (i < numbers.length - 1) await step(id, 'quality-fail', off('o1'), { fields: { qualityNote: 'Laminate misaligned' } });
  }
  await step(id, 'quality-pass', off('o1'), { fields: { documentCode: 'P', custodyPlace: 'Central office vault' } });
  doc(id, 'delivery-evidence');
  await step(id, 'record-collection', off('o1'), { fields: { deliveryMethod: 'collected', recipient: 'holder' } });
  return decided;
}

describe('passports and travel documents', () => {
  beforeEach(() => {
    for (const r of [resetCases, resetPackages, resetDocuments, resetDecisions, resetPassports, resetIdentity, resetPermitAuthorities, resetRules, resetLaw, resetAccessLog]) r();
    vi.stubEnv('CIVICOS_DATA_KEK', Buffer.alloc(32, 7).toString('base64'));
    official = null;
    [TDA, IDA, OTHER] = listMinistries().slice(0, 3).map(m => m.id) as [string, string, string];
    setSovereign({ iso3: 'KEN', deployment: { authorities: { travelDocuments: TDA, identity: IDA } } } as never, 'Administrator');
    for (const p of PASSPORT_PROCEDURES) {
      const d = draftPackage(asNationSets(p), 'Author', 'author', registeredEffects()); if ('error' in d) throw new Error(`${p.key}: ${d.error}`);
      const a = approvePackage(p.key, 1, 'Approver', 'approver', '2026-01-01', registeredEffects(), new Date('2026-01-01')); if ('error' in a) throw new Error(`${p.key}: ${a.error}`);
    }
    const law = recordVersion({ instrument: { title: 'Passports Act', type: 'act', jurisdiction: 'KEN', year: 2020, number: '3', issuingAuthority: 'Parliament' }, dates: { inForce: '2020-01-01' }, provisions: [{ eId: 'sch_1', num: '1', text: 'The fees in the Schedule.' }] }, 'L1', 'l1') as { instrument: { id: string }; version: { id: string } };
    confirmVersion(law.instrument.id, law.version.id, 'L2', 'l2');
    lawId = law.instrument.id;
    // The holder's identity, enrolled and credentialled by the identity authority.
    const r = enrolIdentity({ givenNames: 'Amina', familyName: 'Osei', birthDate: '1990-04-02', eligibility: { rule: 'x', outcome: 'eligible' } }, 'case-id', { name: 'Identity official' }) as { number: string };
    const c = requestCredential({ identity: r.number, type: 'identity-card', validFrom: '2026-01-01', validUntil: '2036-01-01' }, 'case-cr', { name: 'Identity official' }) as { number: string };
    produceCredential(c.number, { serial: 'S1', qualityChecked: true }, 'case-cr', { name: 'x' });
    recordDelivery(c.number, { method: 'collected', recipient: 'holder', evidence: 'doc' }, 'case-cr', { name: 'x' });
    CREDENTIAL = c.number;
  });
  afterEach(() => { vi.unstubAllEnvs(); setSovereign({ deployment: { authorities: {} } }, 'test'); });

  it('ships drafts only: restricted, no biometric template or score, no fee or day count; decisions under proposed, unapproved mappings', () => {
    for (const p of PASSPORT_PROCEDURES) {
      expect(p).toMatchObject({ reference: true, sensitivity: 'restricted', owner: 'travelDocuments', deadlines: [] });
      expect(JSON.stringify(p)).not.toMatch(/fingerprint|biometric_|templateData|risk score/i);
      for (const f of p.fields) expect(f.type, f.key).not.toBe('money');
      for (const a of p.actions.filter(x => x.decision)) expect(classifyDecision({ fields: {} } as never, a, p as never), `${p.key} ${a.key}`).toMatchObject({ kind: 'mapping' });
    }
    installProposedDefaults('Installer');
    for (const t of new Set(Object.values(PASSPORT_PERMITS))) expect(listMappings(t), t).toEqual([expect.objectContaining({ state: 'draft', lead: 'travelDocuments' })]);
    expect(ICAO_ELEMENTS).toEqual(expect.arrayContaining(['documentCode', 'issuingState', 'documentNumber', 'dateOfExpiry']));
  });

  it('takes the fee only from the approved schedule and seals its version; with none, nobody types one (an exemption names its ground)', async () => {
    const c = openCase({ procedure: 'passport.application', fields: APPLICANT() }, off('o1')) as { id: string };
    doc(c.id, 'application'); doc(c.id, 'photograph');
    expect(await act(c.id, { action: 'assess-fee' }, off('o1'))).toMatchObject({ error: expect.stringMatching(/No approved rule passports\.fees.*The fee is never typed/) });
    feeSchedule([{ code: 'ordinary.first', amountMinor: 450000 }, { code: 'ordinary', amountMinor: 400000 }]);
    await step(c.id, 'assess-fee', off('o1'));
    expect(listBills().find(b => b.reference === `passport:${getCase(c.id)!.ref}`)).toMatchObject({ amountMinor: 450000, issuer: TDA });
    await step(c.id, 'verify-identity', off('o1'));
    const decided = await issue(c.id);
    expect(getDecision(decided.decision!.id)!.content.rules).toEqual([expect.objectContaining({ key: 'passports.fees', version: 1 })]);
    const d = getTravelDocument('AK1234567')!;
    expect(d).toMatchObject({ state: 'issued', fee: { amountMinor: 450000, code: 'ordinary.first', rule: { key: 'passports.fees', version: 1 } }, identityBasis: { kind: 'exchange' } });
    // An exemption the law gives: recorded with its ground and reasons, no bill.
    const x = openCase({ procedure: 'passport.application', fields: { ...APPLICANT(), feeExemption: 'Official travel (Passports Act s.12)', feeExemptionReasons: 'Travelling for the state' } }, off('o1')) as { id: string };
    doc(x.id, 'application'); doc(x.id, 'photograph');
    await step(x.id, 'assess-fee', off('o1'));
    expect(listBills().some(b => b.reference === `passport:${getCase(x.id)!.ref}`)).toBe(false);
  });

  it('holds the case when identity cannot be verified, and never refuses on that alone (P2-08)', async () => {
    feeSchedule([{ code: 'ordinary', amountMinor: 400000 }]);
    // The identity authority is not named: the exchange answers "unable to verify".
    setSovereign({ deployment: { authorities: { travelDocuments: TDA } } }, 'Administrator');
    const c = openCase({ procedure: 'passport.application', fields: APPLICANT() }, off('o1')) as { id: string };
    doc(c.id, 'application'); doc(c.id, 'photograph');
    await step(c.id, 'assess-fee', off('o1'));
    expect(await act(c.id, { action: 'verify-identity' }, off('o1'))).toMatchObject({ error: expect.stringMatching(/Identity not verified \(unable_to_verify.*not a ground for refusal/) });
    expect(await act(c.id, { action: 'refuse', reason: 'x', fields: { reviewRoute: 'x' } }, off('s1', 'signatory'))).toMatchObject({ error: expect.stringMatching(/not possible/) });
    await step(c.id, 'hold', off('o1'), { reason: 'Identity service unavailable' });
    expect(await act(c.id, { action: 'refuse', reason: 'x', fields: { reviewRoute: 'x' } }, off('s1', 'signatory'))).toMatchObject({ error: expect.stringMatching(/not possible while the case is Held/) });
    // Once the identity authority answers again, the case continues where it was held.
    setSovereign({ deployment: { authorities: { travelDocuments: TDA, identity: IDA } } }, 'Administrator');
    await step(c.id, 'verify-identity', off('o1'));
    expect(getCase(c.id)!.stage).toBe('verified');
  });

  it('records production with quality checks and reconciles each number; the ICAO Doc 9303 elements, no biometric template; status through the exchange', async () => {
    feeSchedule([{ code: 'ordinary', amountMinor: 400000 }]);
    const id = await applyUntilVerified();
    await issue(id, ['AK0000001', 'AK0000002']);
    const d = getTravelDocument('AK0000002')!;
    expect(d.productions.map(p => [p.documentNumber, p.quality?.passed])).toEqual([['AK0000001', false], ['AK0000002', true]]);
    expect(d.icao).toMatchObject({ documentCode: 'P', issuingState: 'KEN', surname: 'Osei', documentNumber: 'AK0000002', nationality: 'KEN', dateOfExpiry: '2036-10-31' });
    expect(Object.keys(d.icao!).every(k => (ICAO_ELEMENTS as readonly string[]).includes(k))).toBe(true);
    expect(JSON.stringify(d)).not.toMatch(/biometric|fingerprint|template/i);
    expect(d.custody.map(e => e.event)).toEqual(['received-in-custody', 'handed-over']);
    expect(productionReconciliation()).toEqual([{ batch: 'B-2026-11', produced: 2, spoiled: 1, inCustody: 0, issued: 1, other: 0 }]);
    // A spoiled number is never used again.
    const other = await applyUntilVerified();
    await step(other, 'propose', off('o1'), { reason: 'x', fields: { validFrom: '2026-11-01', validUntil: '2036-10-31' } });
    await step(other, 'issue', off('s1', 'signatory'), { reason: 'x' }); await step(other, 'issue', off('s2', 'signatory'));
    expect(await act(other, { action: 'record-production', fields: { documentNumber: 'AK0000001', batch: 'B-2026-11' } }, off('o1'))).toMatchObject({ error: expect.stringMatching(/already recorded/) });
    const caller = { kind: 'module' as const, id: 'test', name: 'Border' };
    const s = await callService(caller, 'travel-document.status', { documentNumber: 'AK0000002', on: '2027-01-01' }, 'border check');
    expect(s.data).toEqual({ status: 'valid', validUntil: '2036-10-31' });
    expect((await callService(caller, 'travel-document.status', { documentNumber: 'AK0000001' }, 'border check')).data).toMatchObject({ status: 'not-valid' });
  });

  it('records a loss as a report, cancels by decision, and supersedes the old document when its replacement is collected', async () => {
    feeSchedule([{ code: 'ordinary', amountMinor: 400000 }]);
    await issue(await applyUntilVerified());
    const s = openCase({ procedure: 'passport.status', fields: { document: 'AK1234567', statusKind: 'lost', circumstances: 'Lost while travelling' } }, off('o1')) as { id: string };
    doc(s.id, 'report');
    await step(s.id, 'record-report', off('o1'));
    expect(documentStatus('AK1234567')).toEqual({ status: 'not-valid', reason: 'reported-lost' });
    await step(s.id, 'cancel', off('s1', 'signatory'), { reason: 'Not found' });
    expect(getTravelDocument('AK1234567')!.state).toBe('cancelled');
    const r = await applyUntilVerified({ ...APPLICANT(), applicationKind: 'replacement-lost', previousDocument: 'AK1234567' });
    await issue(r, ['AK7654321']);
    expect(getTravelDocument('AK1234567')).toMatchObject({ state: 'superseded', replacedBy: getTravelDocument('AK7654321')!.number });
    // A child's application needs the recorded consent.
    const child = await applyUntilVerified({ ...APPLICANT(), applicationKind: 'child' });
    expect(await act(child, { action: 'propose', reason: 'x', fields: { validFrom: '2026-11-01', validUntil: '2031-10-31' } }, off('o1'))).toMatchObject({ error: expect.stringMatching(/consent/) });
  });

  it('reviews a refusal by officials who took no part in it, keeping the refusal as it was', async () => {
    feeSchedule([{ code: 'ordinary', amountMinor: 400000 }]);
    const id = await applyUntilVerified();
    await step(id, 'refuse', off('s1', 'signatory'), { reason: 'Insufficient evidence of nationality', fields: { reviewRoute: 'Passport review panel' } });
    const refused = await step(id, 'refuse', off('s2', 'signatory'));
    const r = openCase({ procedure: 'passport.review', fields: { originalCase: getCase(id)!.ref, grounds: 'New evidence of nationality' } }, off('o1')) as { id: string };
    doc(r.id, 'request');
    await step(r.id, 'accept', off('o1'));
    await step(r.id, 'propose', off('o1'), { reason: 'The new certificate settles nationality', fields: { reviewOutcome: 'overturned' } });
    // A refusing official's proposal cannot be confirmed by anyone: the review is checked when the decision is made.
    await step(r.id, 'decide', off('s1', 'signatory'), { reason: 'x', fields: { reviewRoute: 'Court' } });
    expect(await act(r.id, { action: 'decide' }, off('s3', 'signatory'))).toMatchObject({ error: expect.stringMatching(/Official s1 took part in the decision under review/) });
    expect(cancelPending(r.id, off('s1', 'signatory'), 'Took part in the refusal')).not.toHaveProperty('error');
    await step(r.id, 'decide', off('s3', 'signatory'), { reason: 'Overturned', fields: { reviewRoute: 'Court' } });
    expect(await act(r.id, { action: 'decide' }, off('s2', 'signatory'))).toMatchObject({ error: expect.stringMatching(/took part/) });
    const d = await step(r.id, 'decide', off('s4', 'signatory'));
    expect(reviewsOf(id)).toEqual([expect.objectContaining({ outcome: 'overturned', decision: d.decision!.id })]);
    expect(getCase(id)!.decisions).toEqual([refused.decision!.id]);
  });

  it('is read only by the travel document authority, with a stated purpose for a document; every read and refusal logged', async () => {
    feeSchedule([{ code: 'ordinary', amountMinor: 400000 }]);
    await issue(await applyUntilVerified());
    const as = (who: Actor) => { official = { id: who.id!, name: who.name, label: who.name, institution: who.scope!.institution, role: who.scope!.role! }; };
    const get = async (qs: string) => route.GET(new NextRequest(`http://localhost/api/passports${qs}`));
    as(off('o1'));
    const overview = await (await get('')).json();
    expect(overview).toMatchObject({ feeSchedule: { key: 'passports.fees', version: 1 }, documents: [] });
    expect(JSON.stringify(overview)).not.toMatch(/Osei|AK1234567/);
    expect((await get('?number=AK1234567')).status).toBe(403);
    expect((await (await get('?number=AK1234567&purpose=collection%20query')).json()).documents).toHaveLength(1);
    as(off('x', 'signatory', () => OTHER));
    expect((await get('?number=AK1234567&purpose=x')).status).toBe(403);
    expect(listAccess({}).filter(e => e.record.register === 'travel-documents').map(e => e.result)).toEqual(expect.arrayContaining(['allowed', 'refused']));
  });
});
