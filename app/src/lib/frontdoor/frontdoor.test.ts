// The digital front door (plan step I13; forms catalogue Part 13 §3): the
// public service catalogue (published by a different official, every version
// kept, status computed and honest), the journey from discovery to a decision
// and a challenge (routed to the competent institution, tracked, reconsidered
// by officials who took no part), representation granted and revoked by the
// represented person themselves, appointments, complaints and fee refunds only
// through the payments system.
import { asNationSets } from '@/lib/casework/testkit';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

const { openCase, act, attach, resetCases, registeredEffects, getCase } = await import('@/lib/casework/engine');
const { draftPackage, approvePackage, resetPackages, activePackage } = await import('@/lib/casework/packages');
const { addDocument, resetDocuments } = await import('@/lib/records/documents');
const { resetDecisions, getDecision } = await import('@/lib/records/decisions');
const { setSovereign, listMinistries, issueBill, payBill, listReceipts } = await import('@/lib/data/store');
const { recordVersion, confirmVersion, resetLaw } = await import('@/lib/law/register');
const { resetDelegations } = await import('@/lib/records/delegations');
const { resetRefunds, listRefunds } = await import('@/lib/data/store/payments');
const { listAudit } = await import('@/lib/data/store/audit');
await import('@/lib/casework/modules');
const { proposeService, publishService, serviceStatus, publicCatalogue, getService, proposeRetirement, decideRetirement, resetServiceCatalogue, withdrawServiceVersion } = await import('./catalogue');
const { FRONTDOOR_PROCEDURES, frontdoorKey } = await import('./procedures');
const { applyForService, trackFor, requestReconsideration, serviceJourney, identityRoute } = await import('./journey');
const { grantRepresentation, revokeRepresentation, representationCovering } = await import('./representation');
const { resetFrontdoor, routingOf, appointmentOf, reconsiderationOf, complaintOutcomeOf } = await import('./register');
type Actor = import('@/lib/casework/engine').Actor;

let X = '', Y = '', lawId = '';
const off = (id: string, role: 'officer' | 'signatory' = 'officer', inst = () => X): Actor => ({ id, name: `Official ${id}`, scope: { id, role, institution: inst() } });
const cat = (id: string, role: 'officer' | 'signatory' = 'officer', inst = () => X) => ({ id, name: `Official ${id}`, scope: { id, role, institution: inst() } as never });
const pdf = new Uint8Array(Buffer.from('%PDF-1.7\nx\n%%EOF'));
const doc = (caseId: string, cls: string, inst = X) => { const d = addDocument({ class: cls, title: cls, institution: inst, belongsTo: { kind: 'case', id: caseId }, bytes: pdf }, 'Clerk') as { id: string }; const r = attach(caseId, d.id, off('s9', 'signatory', () => inst)); if ('error' in r) throw new Error(r.error); };
async function step(id: string, action: string, who: Actor, extra: Record<string, unknown> = {}) { const r = await act(id, { action, ...extra }, who); if ('error' in r) throw new Error(`${action}: ${r.error}`); return r; }

/** Draft and approve a procedure for an institution (the nation's days set, as in a real adoption). */
function adopt(p: { key: string } & Record<string, unknown>, institution: string, key = p.key) {
  const { forms: _f, ...pkg } = p as never as { forms: string[] } & Parameters<typeof draftPackage>[0];
  const d = draftPackage({ ...asNationSets(pkg), key, owner: institution }, 'Author', 'author', registeredEffects()); if ('error' in d) throw new Error(`${key}: ${d.error}`);
  const a = approvePackage(key, 1, 'Approver', 'approver', '2026-01-01', registeredEffects(), new Date('2026-01-01')); if ('error' in a) throw new Error(`${key}: ${a.error}`);
}
/** A simple decided service procedure of institution X (stands in for any domain procedure). */
const PERMIT = {
  key: 'svc-test.permit', version: 1, owner: '', title: 'Market stall permit', refPrefix: 'MSP', citations: [], reference: true,
  fields: [{ key: 'stall', label: 'Stall', type: 'text' as const, required: true, personalDataClass: 'administrative' as const }],
  documents: [], stages: [{ key: 'submitted', label: 'Submitted' }, { key: 'review', label: 'Under review' }, { key: 'granted', label: 'Granted', terminal: true }, { key: 'refused', label: 'Refused', terminal: true }],
  actions: [
    { key: 'review', label: 'Review', from: ['submitted'], to: 'review', needs: { role: 'officer' as const } },
    { key: 'grant', label: 'Grant', from: ['review'], to: 'granted', decision: 'grant-stall', needs: { role: 'signatory' as const }, requires: { reasons: true } },
    { key: 'refuse', label: 'Refuse', from: ['review'], to: 'refused', decision: 'refuse-stall', needs: { role: 'signatory' as const }, requires: { reasons: true } },
  ],
  deadlines: [], notifications: [], retention: 'market-permits', sensitivity: 'normal' as const,
  authority: { permitType: 'market-stall' },
  tests: [{ name: 'granted', steps: [{ action: 'review', expect: 'review' }, { action: 'grant', expect: 'granted' }] }],
};
const terms = (over: Record<string, unknown> = {}) => ({
  name: 'Market stall permit', description: 'A permit to trade from a market stall.', owner: { institution: X }, legalBasis: [{ instrument: lawId, eId: 'sec_3' }],
  procedure: 'svc-test.permit', forms: [], eligibility: 'Anyone trading in a public market', representatives: true, evidence: ['Identity document'], fee: null,
  channels: ['online', 'assisted'], outcome: 'A permit or a refusal with reasons', review: 'Reconsideration by the institution', languages: ['en'], accessibility: 'Assisted at offices', privacy: 'normal',
  contact: 'Market office', lifeEvents: ['Starting a business'], category: 'Business', declared: 'active', ...over,
});
const amina = { sub: 'sub-amina', name: 'Amina Osei' }, kofi = { sub: 'sub-kofi', name: 'Kofi Mensah' };

describe('digital front door', () => {
  beforeEach(() => {
    for (const r of [resetCases, resetPackages, resetDocuments, resetDecisions, resetLaw, resetServiceCatalogue, resetFrontdoor, resetDelegations, resetRefunds]) r();
    vi.stubEnv('CIVICOS_DATA_KEK', Buffer.alloc(32, 7).toString('base64'));
    [X, Y] = listMinistries().slice(0, 2).map(m => m.id) as [string, string];
    setSovereign({ deployment: { authorities: {} } }, 'Administrator');
    const law = recordVersion({ instrument: { title: 'Markets Act', type: 'act', jurisdiction: 'X', year: 2020, number: '1', issuingAuthority: 'Parliament' }, dates: { inForce: '2020-01-01' }, provisions: [{ eId: 'sec_3', num: '3', text: 'No person shall trade from a market stall without a permit.' }] }, 'L1', 'l1') as { instrument: { id: string }; version: { id: string } };
    confirmVersion(law.instrument.id, law.version.id, 'L2', 'l2');
    lawId = law.instrument.id;
  });
  afterEach(() => { vi.unstubAllEnvs(); });

  it('publishes a service only by a different official who can sign there, keeps every version, and lists only what is published', () => {
    const v1 = proposeService({ terms: terms(), reason: 'New service' }, cat('o1'));
    if ('error' in v1) throw new Error(v1.error);
    expect(v1.id).toBe('SVC-market-stall-permit');
    expect(publicCatalogue()).toEqual([]);
    expect(publishService(v1.id, cat('o1', 'signatory'))).toMatchObject({ error: expect.stringMatching(/different official/) });
    expect(publishService(v1.id, cat('o2'))).toMatchObject({ error: expect.stringMatching(/needs an official who can sign/) });
    expect(publishService(v1.id, cat('s1', 'signatory', () => Y))).toMatchObject({ error: expect.stringMatching(/officials of the institution responsible/) });
    expect(publishService(v1.id, cat('s1', 'signatory'))).not.toHaveProperty('error');
    expect(publicCatalogue().map(s => [s.id, s.version])).toEqual([[v1.id, 1]]);
    // A new version waits; the public still sees version 1 until a second official publishes it; version 1 is kept, superseded.
    proposeService({ id: v1.id, terms: terms({ description: 'A permit to trade from a stall in a public market.' }), reason: 'Clearer wording' }, cat('o1'));
    expect(publicCatalogue()[0]!.description).toBe('A permit to trade from a market stall.');
    publishService(v1.id, cat('s2', 'signatory'));
    expect(getService(v1.id)!.versions.map(v => v.state)).toEqual(['superseded', 'published']);
    expect(publicCatalogue()[0]!).toMatchObject({ version: 2, description: 'A permit to trade from a stall in a public market.' });
    // Withdrawn proposals are kept too.
    proposeService({ id: v1.id, terms: terms({ name: 'Stall' }), reason: 'Rename' }, cat('o1'));
    withdrawServiceVersion(v1.id, 'Not agreed', cat('o1'));
    expect(getService(v1.id)!.versions.map(v => v.state)).toEqual(['superseded', 'published', 'withdrawn']);
    // A fee is a rule reference, never an amount; a bare form ID is refused; legal basis is cited from the laws register.
    expect(proposeService({ terms: terms({ name: 'Other', fee: 500 }), reason: 'x' }, cat('o1'))).toMatchObject({ error: expect.stringMatching(/rule key/) });
    expect(proposeService({ terms: terms({ name: 'Other', forms: ['GOV-SVC-004'] }), reason: 'x' }, cat('o1'))).toMatchObject({ error: expect.stringMatching(/identity/) });
    expect(proposeService({ terms: terms({ name: 'Other', legalBasis: [] }), reason: 'x' }, cat('o1'))).toMatchObject({ error: expect.stringMatching(/Cite the provision/) });
  });

  it('computes the status honestly: a service whose procedure is not approved, whose owner is not named or whose fee rule is not approved never shows active', () => {
    const e = proposeService({ terms: terms({ fee: { rule: 'markets.stall-fee' } }), reason: 'New' }, cat('o1')) as { id: string };
    publishService(e.id, cat('s1', 'signatory'));
    let s = serviceStatus(getService(e.id)!);
    expect(s.shown).toBe('unavailable');
    expect(s.reasons).toEqual(['The procedure svc-test.permit has no approved version in force', 'Its fee rule markets.stall-fee is not approved']);
    adopt({ ...PERMIT, owner: X }, X);
    s = serviceStatus(getService(e.id)!);
    expect(s).toMatchObject({ shown: 'unavailable', reasons: ['Its fee rule markets.stall-fee is not approved'], stages: [expect.objectContaining({ label: 'Submitted' }), expect.anything(), expect.anything(), expect.anything()] });
    // Without a fee the service is active; owned by a slot nobody is named for, it is unavailable again.
    proposeService({ id: e.id, terms: terms(), reason: 'No fee' }, cat('o1')); publishService(e.id, cat('s1', 'signatory'));
    expect(serviceStatus(getService(e.id)!).shown).toBe('active');
    const slot = proposeService({ terms: terms({ name: 'Passport renewal', owner: { slot: 'travelDocuments' } }), reason: 'New' }, { name: 'Unsigned clerk', scope: null }) as { id: string };
    publishService(slot.id, { name: 'Another clerk', scope: null });
    expect(serviceStatus(getService(slot.id)!)).toMatchObject({ shown: 'unavailable', owner: null, reasons: expect.arrayContaining(['No institution is named as responsible for it yet']) });
    // Information only is shown as such, never as active.
    const info = proposeService({ terms: terms({ name: 'Market days', procedure: '', declared: 'informational' }), reason: 'Info' }, cat('o1')) as { id: string };
    publishService(info.id, cat('s1', 'signatory'));
    expect(serviceStatus(getService(info.id)!).shown).toBe('informational');
    // Retirement: proposed, confirmed by a different official; the record is kept and shows retired.
    proposeRetirement(e.id, { reason: 'Markets moved to the council', plan: 'Applications in progress are finished; new ones go to the council' }, cat('o1'));
    expect(decideRetirement(e.id, 'confirm', cat('o1', 'signatory'))).toMatchObject({ error: expect.stringMatching(/different official/) });
    decideRetirement(e.id, 'confirm', cat('s2', 'signatory'));
    expect(serviceStatus(getService(e.id)!).shown).toBe('retired');
    expect(getService(e.id)!.versions.length).toBe(2);
    expect(proposeService({ id: e.id, terms: terms(), reason: 'x' }, cat('o1'))).toMatchObject({ error: expect.stringMatching(/retired/) });
  });

  it('runs the journey: discover, authenticate (says so when no identity provider is connected), apply, route to the competent institution, track, decide, reconsider', async () => {
    adopt({ ...PERMIT, owner: X }, X);
    const recon = FRONTDOOR_PROCEDURES.find(p => p.key === 'svc.reconsideration')!;
    adopt(recon, X, frontdoorKey('svc.reconsideration', X));
    const e = proposeService({ terms: terms(), reason: 'New' }, cat('o1')) as { id: string };
    publishService(e.id, cat('s1', 'signatory'));
    // No identity provider configured: the journey says so and names the lawful alternatives.
    expect(identityRoute()).toMatchObject({ provider: null, assisted: true, statement: expect.stringMatching(/No identity provider is connected/) });
    setSovereign({ deployment: { identity: { citizens: { issuer: 'https://id.example.gov', clientId: 'civicos' }, assisted: true } } }, 'Administrator');
    expect(identityRoute().statement).toMatch(/https:\/\/id\.example\.gov/);
    const j = serviceJourney(e.id)!;
    expect(j.steps.map(s => [s.key, s.state])).toEqual([['discover', 'ready'], ['authenticate', 'ready'], ['apply', 'ready'], ['route', 'ready'], ['track', 'ready'], ['decision', 'ready'], ['challenge', 'ready']]);
    const r = await applyForService(amina, { service: e.id, fields: { stall: 'B12' }, idempotencyKey: 'k1' });
    if ('error' in r) throw new Error(r.error);
    expect(r.case.owner).toBe(X);
    expect(routingOf(r.case.id)).toMatchObject({ kind: 'application', service: { id: e.id, version: 1 }, procedure: { key: 'svc-test.permit', version: 1 }, institution: X, channel: 'online' });
    expect(trackFor(amina)).toEqual([expect.objectContaining({ ref: r.case.ref, stage: 'Submitted', role: 'own', service: 'Market stall permit', challenge: { available: false, why: 'Nothing is decided yet' } })]);
    // The decision, by officials of the institution.
    await step(r.case.id, 'review', off('o1'));
    const d = await step(r.case.id, 'refuse', off('s1', 'signatory'), { reason: 'The market is full' });
    const t = trackFor(amina)[0]!;
    expect(t).toMatchObject({ stage: 'Refused', decisions: [{ id: d.decision!.id, decision: 'refuse-stall' }], challenge: { available: true } });
    // Another person cannot challenge it; the applicant can, once.
    expect(requestReconsideration(kofi, { case: r.case.id, grounds: 'I want a stall too' })).toMatchObject({ error: expect.stringMatching(/your own applications/) });
    const rc = requestReconsideration(amina, { case: r.case.id, grounds: 'A stall was free that day; see the market register' });
    if ('error' in rc) throw new Error(rc.error);
    expect(rc.case.package.key).toBe(frontdoorKey('svc.reconsideration', X));
    expect(requestReconsideration(amina, { case: r.case.id, grounds: 'Again, the same grounds' })).toMatchObject({ error: expect.stringMatching(/already been asked/) });
    // A restricted case: an official of the institution assigns it before working it.
    const { assign } = await import('@/lib/casework/engine');
    assign(rc.case.id, { id: 'o2', name: 'Official o2' }, off('s9', 'signatory'));
    await step(rc.case.id, 'admit', off('o2'));
    doc(rc.case.id, 'reconsideration-notice');
    // The official who refused cannot take part in reconsidering it (a person, not only an account).
    expect(await act(rc.case.id, { action: 'vary', reason: 'A stall was free', fields: { correction: 'Grant the permit for stall B12' } }, off('s1', 'signatory'))).toMatchObject({ pending: true });
    expect(await act(rc.case.id, { action: 'vary' }, off('s2', 'signatory'))).toMatchObject({ error: expect.stringMatching(/took no part in the decision: Official s1/) });
    const rc2 = getCase(rc.case.id)!;
    expect(rc2.stage).toBe('admitted');
    // Two officials who took no part decide it; the original decision stays sealed as it was, the outcome beside it.
    const { cancelPending } = await import('@/lib/casework/engine');
    cancelPending(rc.case.id, off('s3', 'signatory'), 'Proposed by a disqualified official');
    await step(rc.case.id, 'vary', off('s3', 'signatory'), { reason: 'A stall was free', fields: { correction: 'Grant the permit for stall B12 through the permit procedure' } });
    await step(rc.case.id, 'vary', off('s4', 'signatory'));
    expect(reconsiderationOf(rc.case.ref)).toMatchObject({ outcome: 'varied', original: { ref: r.case.ref }, correction: expect.stringMatching(/permit procedure/) });
    expect(getCase(r.case.id)!.stage).toBe('refused');
    expect(getDecision(d.decision!.id)!.content.decision).toBe('refuse-stall');
    expect(trackFor(amina).find(x => x.ref === r.case.ref)!.reconsiderations).toEqual([{ ref: rc.case.ref, outcome: 'Decision varied' }]);
  });

  it('lets a representative act only within the representation the person granted; every act records both; the person revokes it', async () => {
    adopt({ ...PERMIT, owner: X }, X);
    const e = proposeService({ terms: terms(), reason: 'New' }, cat('o1')) as { id: string };
    publishService(e.id, cat('s1', 'signatory'));
    // No representation: refused.
    expect(await applyForService(kofi, { service: e.id, fields: { stall: 'C1' }, onBehalfOf: amina.sub })).toMatchObject({ error: expect.stringMatching(/no representation in force/) });
    // Amina grants Kofi the right to track only: applying is refused.
    const g = grantRepresentation(amina, { agent: kofi, services: [e.id], actions: ['track'], basis: 'Family member' });
    if ('error' in g) throw new Error(g.error);
    expect(g).toMatchObject({ byPrincipal: true, principal: { kind: 'person', id: amina.sub }, agent: { kind: 'citizen', id: kofi.sub }, procedures: ['svc-test.permit'], actions: ['track'] });
    expect(await applyForService(kofi, { service: e.id, fields: { stall: 'C1' }, onBehalfOf: amina.sub })).toMatchObject({ error: expect.stringMatching(/does not cover "Apply"/) });
    // Kofi cannot revoke it; Amina can, and the record is kept.
    expect(revokeRepresentation(kofi, g.id, 'x')).toMatchObject({ error: expect.stringMatching(/only a representation you granted/) });
    expect(revokeRepresentation(amina, g.id, 'No longer needed')).toMatchObject({ revoked: { reason: 'No longer needed' } });
    const g2 = grantRepresentation(amina, { agent: kofi, services: [e.id], actions: ['apply', 'track', 'challenge'] }) as { id: string };
    const r = await applyForService(kofi, { service: e.id, fields: { stall: 'C1' }, onBehalfOf: amina.sub });
    if ('error' in r) throw new Error(r.error);
    expect(r.case).toMatchObject({ applicant: { id: kofi.sub }, onBehalfOf: { id: amina.sub }, delegation: g2.id });
    expect(routingOf(r.case.id)!.representation).toEqual({ id: g2.id, principal: amina.sub, agent: kofi.sub });
    expect(listAudit().some(a => a.action === 'representation.act' && a.resource === `Case:${r.case.ref}` && !!a.detail?.includes(g2.id))).toBe(true);
    // Amina sees it as made for her; Kofi as made by him for another.
    expect(trackFor(amina).map(x => [x.ref, x.role])).toEqual([[r.case.ref, 'made for you']]);
    expect(trackFor(kofi).map(x => [x.ref, x.role])).toEqual([[r.case.ref, 'made by you for another']]);
    // A representation for one service opens no other: another procedure is not covered.
    expect(representationCovering(kofi.sub, amina.sub, 'civil.birth', 'apply')).toMatchObject({ error: expect.any(String) });
    // A service that does not allow representatives cannot be granted.
    const solo = proposeService({ terms: terms({ name: 'Personal licence', representatives: false }), reason: 'x' }, cat('o1')) as { id: string };
    publishService(solo.id, cat('s1', 'signatory'));
    expect(grantRepresentation(amina, { agent: kofi, services: [solo.id], actions: ['apply'] })).toMatchObject({ error: expect.stringMatching(/does not allow someone to act/) });
  });

  it('books appointments with every change kept, closes complaints with reasons, and refunds only a receipt this institution was paid, for exactly what was paid', async () => {
    for (const t of FRONTDOOR_PROCEDURES) adopt(t, X, frontdoorKey(t.key, X));
    // Appointment: confirmed, moved, attended; each change in the history.
    const a = openCase({ procedure: frontdoorKey('svc.appointment', X), fields: { service: 'SVC-x', servicePoint: 'Central office' } }, off('o1'));
    if ('error' in a) throw new Error(a.error);
    await step(a.id, 'confirm', off('o1'), { fields: { appointmentDate: '2026-11-02', appointmentTime: '09:30' } });
    await step(a.id, 'confirm', off('o1'), { fields: { appointmentDate: '2026-11-03', appointmentTime: '14:00' } });
    await step(a.id, 'attended', off('o1'));
    expect(appointmentOf(a.ref)).toMatchObject({ state: 'attended', at: '2026-11-03T14:00', history: [expect.objectContaining({ state: 'confirmed', at: '2026-11-02T09:30' }), expect.objectContaining({ at: '2026-11-03T14:00' }), expect.objectContaining({ state: 'attended' })] });
    // Complaint: restricted; closed with reasons; decides nothing else.
    const c = openCase({ procedure: frontdoorKey('svc.complaint', X), fields: { complaintDescription: 'I waited three hours', service: 'SVC-x' } }, off('o1'));
    if ('error' in c) throw new Error(c.error);
    expect(c.sensitivity).toBe('restricted');
    await step(c.id, 'acknowledge', off('o1'));
    await step(c.id, 'investigate', off('o1'));
    doc(c.id, 'complaint-response');
    await step(c.id, 'resolve', off('s1', 'signatory'), { reason: 'Extra staff at peak hours' });
    expect(complaintOutcomeOf(c.ref)).toMatchObject({ outcome: 'resolved', reasons: 'Extra staff at peak hours' });
    // Refund: a fee bill issued by this institution and paid (a stand-in payment in a demonstration).
    const bill = issueBill({ kind: 'fee' as never, description: 'Stall permit fee', amountMinor: 2500, currency: 'KES', dueDate: '2026-11-30', reference: 'MSP-FEE-1', issuer: X }, 'Cashier') as { id: string };
    const paid = payBill(bill.id, 'Mobile Money', 'Amina') as { id: string };
    const other = issueBill({ kind: 'fee' as never, description: 'Other fee', amountMinor: 900, currency: 'KES', dueDate: '2026-11-30', reference: 'OTHER-1', issuer: Y }, 'Cashier') as { id: string };
    const otherPaid = payBill(other.id, 'Mobile Money', 'Amina') as { id: string };
    const rf = openCase({ procedure: frontdoorKey('svc.refund', X), fields: { receipt: otherPaid.id, grounds: 'The stall was never assigned' } }, off('o1'));
    if ('error' in rf) throw new Error(rf.error);
    expect(await act(rf.id, { action: 'assess' }, off('o1'))).toMatchObject({ error: expect.stringMatching(/issued by another institution/) });
    await step(rf.id, 'assess', off('o1'), { fields: { receipt: paid.id } });
    doc(rf.id, 'refund-decision');
    // Approved by two officials other than the assessor; the amount is the receipt's, never typed.
    expect(await act(rf.id, { action: 'approve', reason: 'Never assigned' }, off('o1', 'signatory'))).toMatchObject({ error: expect.stringMatching(/Separation of duties/) });
    await step(rf.id, 'approve', off('s1', 'signatory'), { reason: 'Never assigned' });
    const done = await step(rf.id, 'approve', off('s2', 'signatory'));
    expect(done.decision!.content.facts).toMatchObject({ amountMinor: 2500, currency: 'KES' });
    expect(listRefunds(X)).toEqual([expect.objectContaining({ receipt: paid.id, amountMinor: 2500, simulated: true })]);
    // Recorded paid by a different official from the rail's reference; a receipt is refunded once.
    expect(await act(rf.id, { action: 'record-paid', fields: { rail: 'Bank', railReference: 'RF-77', paidOn: '2026-11-04' } }, off('s2'))).toMatchObject({ error: expect.stringMatching(/Separation of duties/) });
    await step(rf.id, 'record-paid', off('o3'), { fields: { rail: 'Bank', railReference: 'RF-77', paidOn: '2026-11-04' } });
    expect(listRefunds(X)[0]!.paid).toMatchObject({ railReference: 'RF-77' });
    const again = openCase({ procedure: frontdoorKey('svc.refund', X), fields: { receipt: paid.id, grounds: 'Again' } }, off('o1')) as { id: string };
    expect(await act(again.id, { action: 'assess' }, off('o1'))).toMatchObject({ error: expect.stringMatching(/already been refunded/) });
    expect(listReceipts().find(r => r.id === paid.id)!.amountMinor).toBe(2500);
    // In production a stand-in receipt is never refunded.
    vi.stubEnv('CIVICOS_MODE', 'production');
    const { refundableReceipt } = await import('@/lib/data/store/payments');
    expect(refundableReceipt(otherPaid.id, Y)).toMatchObject({ error: expect.stringMatching(/stand-in payment/) });
    expect(activePackage(frontdoorKey('svc.refund', X))).toBeDefined();
  });

  it('holds sample services only in demonstrations, marked, and never shows them in production', () => {
    const e = proposeService({ terms: terms(), reason: 'Sample', sample: true }, cat('o1')) as { id: string };
    publishService(e.id, cat('s1', 'signatory'));
    expect(publicCatalogue()).toEqual([expect.objectContaining({ id: e.id, sample: true })]);
    vi.stubEnv('CIVICOS_MODE', 'production');
    expect(publicCatalogue()).toEqual([]);
    expect(proposeService({ terms: terms({ name: 'Another' }), reason: 'Sample', sample: true }, cat('o1'))).toMatchObject({ error: expect.stringMatching(/no sample service/) });
  });

  it('ships drafts only: no day count, no amount, no outcome list the law decides; decisions classified as the institution\'s own', async () => {
    const { classifyDecision } = await import('@/lib/permits/decisions');
    for (const p of FRONTDOOR_PROCEDURES) {
      expect(p).toMatchObject({ reference: true, owner: 'institution' });
      for (const d of p.deadlines) expect(d.days, `${p.key} ${d.key}`).toBeUndefined();
      for (const f of p.fields) expect(f.type, `${p.key} ${f.key}`).not.toBe('money');
      for (const a of p.actions.filter(x => x.decision)) expect(classifyDecision({ fields: {} } as never, a, { key: frontdoorKey(p.key, X) })).toMatchObject({ kind: 'deployment' });
    }
  });
});
