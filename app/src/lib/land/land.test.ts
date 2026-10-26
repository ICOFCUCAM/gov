// The land registry's procedures on the parcel register (plan step I7;
// specification Part 3 §C.7; catalogue Part 8 §3.1–3.3): a transfer, an
// encumbrance and its discharge, a correction and a dispute, each recorded by
// one official and decided by another, every version of the parcel kept. A
// dispute holds the interest it concerns until it is decided and is never
// resolved on its own. Rights and parties stay personal data: only the
// parcel's own record shows them, to those with need (acceptance P3-06).
import { asNationSets } from '@/lib/casework/testkit';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

const { act, attach, openCase, resetCases, registeredEffects, lapseDeadlines } = await import('@/lib/casework/engine');
const { draftPackage, approvePackage, resetPackages } = await import('@/lib/casework/packages');
const { addDocument, resetDocuments } = await import('@/lib/records/documents');
const { resetDecisions, getDecision } = await import('@/lib/records/decisions');
const { setSovereign, listMinistries, institutionBounds } = await import('@/lib/data/store');
const { listAudit } = await import('@/lib/data/store/audit');
const { resetPermitAuthorities, installProposedDefaults, listMappings } = await import('@/lib/permits/authority');
const { classifyDecision } = await import('@/lib/permits/decisions');
const { applyNation } = await import('@/lib/nation/registry');
const { resetParcels, recordParcel, actOnParcel, getParcel, proposeParcelPolicyChange, decideParcelPolicyChange, publicParcel, viewParcel, rightsKeepers } = await import('@/lib/data/parcels');
const { canSeeParcelRights } = await import('@/lib/auth/roles');
const { LAND_PROCEDURES, LAND_PERMITS } = await import('./procedures');
const { resetLand, transactionsOf, disputesOf, landCounts, viewTransaction } = await import('./register');
type Actor = import('@/lib/casework/engine').Actor;

let LANDS = '', OTHER = '';
const bounds = () => institutionBounds();
const at = (inst: () => string) => (id: string, role: 'officer' | 'signatory' | 'auditor' | 'administrator' = 'officer'): Actor => ({ id, name: `Official ${id}`, scope: { id, role, institution: inst(), bounds: bounds() } });
const lands = at(() => LANDS), other = at(() => OTHER);
const pdf = new Uint8Array(Buffer.from('%PDF-1.7\nx\n%%EOF'));
const doc = (caseId: string, cls: string, who: Actor) => { const d = addDocument({ class: cls, title: cls, institution: who.scope!.institution!, belongsTo: { kind: 'case', id: caseId }, bytes: pdf }, 'Clerk') as { id: string }; attach(caseId, d.id, who); };
async function step(id: string, action: string, who: Actor, extra: Record<string, unknown> = {}) { const r = await act(id, { action, ...extra }, who); if ('error' in r) throw new Error(`${action}: ${r.error}`); return r; }
const ok = <T,>(r: T): Exclude<T, { error: string }> => { if (r && typeof r === 'object' && 'error' in r) throw new Error((r as { error: string }).error); return r as Exclude<T, { error: string }>; };
const square = (lng: number, lat: number, d = 0.0009) => ({ type: 'Polygon', coordinates: [[[lng, lat], [lng + d, lat], [lng + d, lat + d], [lng, lat + d], [lng, lat]]] });
const OWNER = 'Wanjiru Kamau-Testowner', BUYER = 'Otieno Achieng-Testbuyer', BANK = 'Example Savings Bank Testlender';
let parcelId = '';

/** A published parcel with one ownership right (R1), recorded by one official and published by another. */
async function publishedParcel(id: string, lng = 36.8170) {
  const r = ok(await recordParcel({ parcelId: id, geometry: square(lng, -1.2860), landUse: 'residential', rights: [{ type: 'ownership', holderKind: 'person', holder: OWNER, holderRef: 'ID-1111', share: '1/1', source: { kind: 'title', ref: 'TITLE-1' } }] }, 'Clerk A'));
  ok(await actOnParcel(r.parcel.id, { action: 'publish' }, 'Registrar B'));
  return r.parcel.id;
}
/** Open a dealing, lodge it with its instrument, verify the parties: the case waits for the decision. */
async function lodged(procedure: string, fields: Record<string, unknown>, opts: { clerk?: Actor; docs?: string[] } = {}) {
  const clerk = opts.clerk ?? lands('clerk');
  const c = ok(openCase({ procedure, fields: { parcel: parcelId, instrumentKind: 'title', instrumentRef: 'DEED-77', instrumentDate: '2026-03-01', ...fields } }, clerk));
  doc(c.id, 'instrument', clerk);
  await step(c.id, 'lodge', clerk);
  doc(c.id, 'identity-evidence', clerk);
  for (const d of opts.docs ?? []) doc(c.id, d, clerk);
  await step(c.id, 'verify', clerk, { reason: 'Identities and the deed checked' });
  return c;
}
/** Two officials register it. */
async function registered(id: string, reason = 'Conditions met') {
  const p = await act(id, { action: 'register', reason }, lands('s1', 'signatory'));
  if ('error' in p) throw new Error(p.error);
  expect(p).toMatchObject({ pending: true });
  return step(id, 'register', lands('s2', 'signatory'));
}

describe('land registry procedures on the parcel register', () => {
  beforeEach(async () => {
    for (const r of [resetCases, resetPackages, resetDocuments, resetDecisions, resetPermitAuthorities, resetParcels, resetLand]) r();
    vi.stubEnv('CIVICOS_DATA_KEK', Buffer.alloc(32, 7).toString('base64'));
    [LANDS, OTHER] = listMinistries().slice(0, 2).map(m => m.id) as [string, string];
    setSovereign({ deployment: { authorities: { landRegistry: LANDS } } }, 'Administrator');
    applyNation({ iso3: 'KEN', regions: [] });
    const c = ok(proposeParcelPolicyChange({ patch: { authorityId: LANDS }, reason: 'Lands keeps the cadastre' }, 'Admin 1'));
    ok(decideParcelPolicyChange(c.id, 'confirm', 'Admin 2'));
    for (const p of LAND_PROCEDURES) {
      ok(draftPackage(asNationSets(p), 'Author', 'author', registeredEffects()));
      ok(approvePackage(p.key, 1, 'Approver', 'approver', '2026-01-01', registeredEffects(), new Date('2026-01-01')));
    }
    parcelId = await publishedParcel('NRB/LAND/1');
  }, 60_000);
  afterEach(() => { vi.unstubAllEnvs(); setSovereign({ deployment: { authorities: {} } }, 'test'); });

  it('ships drafts only, restricted, no day count; every decision classified under a proposed, unapproved mapping led by the land registry slot', () => {
    for (const p of LAND_PROCEDURES) {
      expect(p).toMatchObject({ reference: true, owner: 'landRegistry', sensitivity: 'restricted' });
      expect(p.deadlines.every(d => d.days === undefined), p.key).toBe(true);
      for (const a of p.actions.filter(x => x.decision)) {
        const cls = classifyDecision({ fields: {} } as never, a, p as never);
        expect(cls, `${p.key} ${a.key}`).toMatchObject({ kind: 'mapping', permitType: p.key === 'land.dispute' ? 'land-dispute-decision' : 'land-dealing-registration' });
        expect(a.needs.role).toBe('signatory');
      }
      // Registration and dispute decisions are two officials' (four eyes).
      for (const a of p.actions.filter(x => (x.decision && x.decision !== 'refuse') || x.key === 'record-order')) expect(a.needs.fourEyes, `${p.key} ${a.key}`).toBe(true);
    }
    installProposedDefaults('Installer');
    for (const t of new Set(Object.values(LAND_PERMITS))) expect(listMappings(t)[0]).toMatchObject({ state: 'draft', lead: 'landRegistry', proposal: true });
  });

  it('registers a transfer decided by two officials: a new version with its effective date and decision, the prior state kept (P3-06)', async () => {
    const c = await lodged('land.transfer', { interest: `${parcelId}/R1`, transactionType: 'sale', transferringParties: OWNER, receivingParties: `${BUYER} | person | ID-2222 | 1/1`, effectiveDate: '2026-04-01' });
    const before = getParcel(parcelId)!;
    // The official who verified the parties does not decide; the proposer does not confirm.
    expect(await act(c.id, { action: 'register', reason: 'x' }, { ...lands('clerk'), scope: { ...lands('clerk').scope!, role: 'signatory' } })).toMatchObject({ error: expect.stringMatching(/different person/) });
    expect(await act(c.id, { action: 'register', reason: 'Sale completed' }, lands('s1', 'signatory'))).toMatchObject({ pending: true });
    expect(await act(c.id, { action: 'register' }, lands('s1', 'signatory'))).toHaveProperty('error');
    expect(getParcel(parcelId)!.rights).toEqual(before.rights);
    const done = await step(c.id, 'register', lands('s2', 'signatory'));
    expect(getDecision(done.decision!.id)!.content.authority).toMatchObject({ basis: 'unmapped', permitType: 'land-dealing-registration' });
    const p = getParcel(parcelId)!;
    expect(p.rights).toHaveLength(1);
    expect(p.rights[0]).toMatchObject({ id: `${parcelId}/R2`, type: 'ownership', holder: BUYER, share: '1/1', registered: { case: c.ref, effective: '2026-04-01' } });
    // The earlier state is kept, never erased: the version before still names the earlier holder.
    expect(p.versions.length).toBe(before.versions.length + 1);
    expect(p.versions.at(-2)!.rights[0]).toMatchObject({ id: `${parcelId}/R1`, holder: OWNER });
    expect(p.versions.at(-1)).toMatchObject({ effective: '2026-04-01', change: expect.stringContaining(done.decision!.id) });
    const [t] = transactionsOf(parcelId);
    expect(t).toMatchObject({ kind: 'transfer', interest: `${parcelId}/R1`, case: { ref: c.ref }, decision: done.decision!.id, effective: '2026-04-01', versions: { before: before.versions.length, after: before.versions.length + 1 } });
    // The audit chain names the parcel, the interest and the case, never a holder.
    expect(JSON.stringify(listAudit())).not.toMatch(/Testowner|Testbuyer|ID-2222/);
  }, 60_000);

  it('refuses a transfer by anyone the land registry has not empowered, and an amendment that would change rights directly', async () => {
    // Another ministry cannot open or decide it; a whole-government administrator has no domain authority.
    expect(openCase({ procedure: 'land.transfer', fields: { parcel: parcelId } }, other('x'))).toHaveProperty('error');
    const c = await lodged('land.transfer', { interest: `${parcelId}/R1`, receivingParties: `${BUYER} | person` });
    expect(await act(c.id, { action: 'register', reason: 'x' }, other('o1', 'signatory'))).toHaveProperty('error');
    expect(await act(c.id, { action: 'register', reason: 'x' }, { id: 'wg', name: 'Government administrator', scope: { id: 'wg', role: 'administrator', bounds: bounds() } })).toHaveProperty('error');
    expect(await act(c.id, { action: 'register', reason: 'x' }, lands('o2', 'officer'))).toHaveProperty('error');
    expect(getParcel(parcelId)!.rights[0]!.holder).toBe(OWNER);
    // Once published, rights change only through these procedures: an amendment carrying rights is refused.
    expect(await actOnParcel(parcelId, { action: 'amend', reason: 'Sold', rights: [{ type: 'ownership', holderKind: 'person', holder: BUYER, source: { kind: 'title', ref: 'X' } }] }, 'Clerk A')).toEqual({ error: expect.stringMatching(/only through the land registry/) });
    // Not the slot's institution: the effect refuses even a case opened before the slot changed.
    setSovereign({ deployment: { authorities: { landRegistry: OTHER } } }, 'Administrator');
    expect(await act(c.id, { action: 'register', reason: 'x' }, lands('s1', 'signatory'))).toHaveProperty('error');
  }, 60_000);

  it('holds an interest from the moment a dispute is registered until two officials decide it; nothing releases it on its own', async () => {
    const t = await lodged('land.transfer', { interest: `${parcelId}/R1`, receivingParties: `${BUYER} | person` });
    const d = ok(openCase({ procedure: 'land.dispute', fields: { parcel: parcelId, disputeKind: 'title', interest: `${parcelId}/R1`, grounds: 'The seller is not the only heir', disputeParties: 'A sibling of the registered owner' } }, lands('clerk')));
    doc(d.id, 'dispute-submission', lands('clerk'));
    await step(d.id, 'register', lands('clerk'));
    expect(getParcel(parcelId)!.freezes).toMatchObject([{ interest: `${parcelId}/R1`, case: d.ref }]);
    // The transfer is refused while the interest is held, at the proposal and at the confirmation.
    expect(await act(t.id, { action: 'register', reason: 'x' }, lands('s1', 'signatory'))).toMatchObject({ error: expect.stringMatching(/held by an open dispute or objection/) });
    // Deadlines lapsing, or any amount of time, release nothing.
    lapseDeadlines(new Date('2030-01-01'));
    expect(getParcel(parcelId)!.freezes).toHaveLength(1);
    await step(d.id, 'investigate', lands('clerk'), { reason: 'Assigned' });
    expect(disputesOf(parcelId)[0]).toMatchObject({ state: 'held', interest: `${parcelId}/R1` });
    // Decided by two officials, with reasons: then released.
    expect(await act(d.id, { action: 'decide', fields: { outcome: 'dismissed' }, reason: 'The grant names the seller as sole heir' }, lands('s1', 'signatory'))).toMatchObject({ pending: true });
    expect(getParcel(parcelId)!.freezes).toHaveLength(1);
    const decided = await step(d.id, 'decide', lands('s2', 'signatory'));
    expect(getDecision(decided.decision!.id)!.content.authority).toMatchObject({ permitType: 'land-dispute-decision' });
    expect(getParcel(parcelId)!.freezes).toEqual([]);
    expect(disputesOf(parcelId)[0]).toMatchObject({ state: 'decided', outcome: { result: 'dismissed', decision: decided.decision!.id } });
    // The dispute decision changed no right; the transfer now goes through its own decision.
    expect(getParcel(parcelId)!.rights[0]!.holder).toBe(OWNER);
    await registered(t.id);
    expect(getParcel(parcelId)!.rights[0]!.holder).toBe(BUYER);
  }, 60_000);

  it('keeps a boundary held while the dispute is referred to a court, and records the court\'s order by two officials', async () => {
    const d = ok(openCase({ procedure: 'land.dispute', fields: { parcel: parcelId, disputeKind: 'boundary', grounds: 'The fence stands two metres inside the neighbour\'s land' } }, lands('clerk')));
    doc(d.id, 'dispute-submission', lands('clerk'));
    await step(d.id, 'register', lands('clerk'));
    expect(getParcel(parcelId)!.freezes).toMatchObject([{ interest: 'boundary' }]);
    expect(await actOnParcel(parcelId, { action: 'amend', reason: 'Resurveyed', geometry: square(36.8171, -1.2860) }, 'Clerk A')).toEqual({ error: expect.stringMatching(/held by an open dispute/) });
    expect(await actOnParcel(parcelId, { action: 'withdraw', reason: 'x' }, 'Registrar B')).toEqual({ error: expect.stringMatching(/held by an open dispute/) });
    await step(d.id, 'refer', lands('s1', 'signatory'), { fields: { referTo: OTHER }, reason: 'A boundary dispute for the land court' });
    expect(getParcel(parcelId)!.freezes).toHaveLength(1);
    expect(await act(d.id, { action: 'record-order', reason: 'Order received' }, lands('s1', 'signatory'))).toMatchObject({ error: expect.stringMatching(/must be attached/) });
    doc(d.id, 'court-order', lands('clerk'));
    await step(d.id, 'record-order', lands('s1', 'signatory'), { reason: 'The court fixed the boundary on the survey plan' });
    await step(d.id, 'record-order', lands('s2', 'signatory'));
    expect(getParcel(parcelId)!.freezes).toEqual([]);
    expect(disputesOf(parcelId)[0]).toMatchObject({ state: 'decided', referral: { to: OTHER }, outcome: { result: 'court-order' } });
  }, 60_000);

  it('registers mortgages in rank, stops a transfer while a caveat stands without its holder\'s consent, and discharges in order', async () => {
    const m1 = await lodged('land.encumbrance', { encumbranceType: 'mortgage', beneficiary: BANK, beneficiaryKind: 'organisation', terms: 'Secures a loan' });
    await registered(m1.id);
    const m2 = await lodged('land.encumbrance', { encumbranceType: 'mortgage', beneficiary: `${BANK} Two`, beneficiaryKind: 'organisation' });
    await registered(m2.id);
    let p = getParcel(parcelId)!;
    expect(p.rights.filter(r => r.type === 'mortgage').map(r => [r.id, r.priority])).toEqual([[`${parcelId}/R2`, 1], [`${parcelId}/R3`, 2]]);
    // A caveat stops a transfer until its holder consents (and the consent is attached), or it is discharged.
    const cv = await lodged('land.encumbrance', { encumbranceType: 'caveat', beneficiary: 'A purchaser claiming an interest', beneficiaryKind: 'person' });
    await registered(cv.id);
    await expect(lodged('land.transfer', { interest: `${parcelId}/R1`, receivingParties: `${BUYER} | person` })).rejects.toThrow(/caveat is registered/);
    const t2 = await lodged('land.transfer', { interest: `${parcelId}/R1`, receivingParties: `${BUYER} | person`, restrictionConsent: true }, { docs: ['consent'] });
    await registered(t2.id);
    p = getParcel(parcelId)!;
    // The mortgages still burden the land after the transfer.
    expect(p.rights.map(r => r.type)).toEqual(['ownership', 'mortgage', 'mortgage', 'caveat']);
    // Discharging the first mortgage moves the second up a rank; ownership is never discharged.
    const dc = await lodged('land.discharge', { interest: `${parcelId}/R2`, dischargeGrounds: 'Loan repaid' });
    await registered(dc.id);
    p = getParcel(parcelId)!;
    expect(p.rights.filter(r => r.type === 'mortgage').map(r => [r.id, r.priority])).toEqual([[`${parcelId}/R3`, 1]]);
    await expect(lodged('land.discharge', { interest: p.rights.find(r => r.type === 'ownership')!.id })).rejects.toThrow(/not discharged/);
    expect(landCounts()).toMatchObject({ transactions: 5, byKind: { encumbrance: 3, transfer: 1, discharge: 1 } });
  }, 120_000);

  it('corrects a registered interest under a controlled procedure, and shows rights and parties only on the parcel\'s own record to those with need', async () => {
    const c = await lodged('land.correction', { interest: `${parcelId}/R1`, correctedHolder: 'Wanjiru Kamau-Testowner Njeri', correctedKind: 'person', correctedRef: 'ID-1111', correctedShare: '1/1', correctionGrounds: 'Second name left out at first registration' });
    await registered(c.id);
    const p = getParcel(parcelId)!;
    expect(p.rights[0]).toMatchObject({ id: `${parcelId}/R1`, holder: 'Wanjiru Kamau-Testowner Njeri' });
    // Only the keepers (the cadastre authority, the land registry), whole-government administrators and auditors see rights.
    expect(rightsKeepers()).toEqual([LANDS]);
    expect(canSeeParcelRights({ institution: LANDS, role: 'officer' }, rightsKeepers())).toBeNull();
    expect(canSeeParcelRights({ institution: OTHER, role: 'signatory' }, rightsKeepers())).toMatch(/only to the cadastre authority/);
    const leak = /Testowner|ID-1111|Testbuyer/;
    expect(JSON.stringify(publicParcel(p))).not.toMatch(leak);
    expect(JSON.stringify(viewParcel(p, { rights: false }))).not.toMatch(leak);
    expect(JSON.stringify(viewParcel(p, { rights: true }))).toMatch(/Testowner/);
    const [t] = transactionsOf(parcelId);
    expect(JSON.stringify(viewTransaction(t!, { parties: false }))).not.toMatch(leak);
    expect(viewTransaction(t!, { parties: true }).parties!.receiving[0]).toMatchObject({ holder: 'Wanjiru Kamau-Testowner Njeri' });
  }, 60_000);
});
