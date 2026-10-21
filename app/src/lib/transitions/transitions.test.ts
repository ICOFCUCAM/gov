// Transitions and emergencies as recorded legal events (plan phase 6;
// guidance §4, §5.1). Mechanism tests: every value below is illustrative,
// recorded as a nation would record it; the platform ships none.
//   - nothing ships in any mode; each kind cites the law and needs a different person;
//   - acting appointments create a time-limited holding, ended with the event;
//   - an emergency lapses at its expiry, is renewed only by a new confirmed declaration,
//     and never lifts audit, access logging, dual control or privacy rules;
//   - a court's ruling flags (never changes) affected decisions and blocks new ones only
//     where its effect requires; only a court's officials record it;
//   - a declared conflict of interest recuses the official on the case at once;
//   - a caretaker period refuses only the kinds the nation listed;
//   - impeachment stages run in order, none skipped, no outcome automatic;
//   - a disputed (frozen) part of the constitutional profile freezes the transitions touching it;
//   - holdings past their recorded term are no longer in force.
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
// The full scrypt cost is covered by password-hash.test.ts; these tests check behaviour, not cost (and stay inside their time under a full run).
process.env.CIVICOS_SCRYPT_N = '16384';
import { recordVersion as recordLaw, confirmVersion as confirmLaw, resetLaw } from '@/lib/law/register';
import { db } from '@/lib/data/store/state';
import { createMinistry } from '@/lib/data/store/ministries';
import { setSovereign } from '@/lib/data/store/sovereign';
import { recordTermsDuringSetup, institutionBounds } from '@/lib/data/store/institutions';
import { proposeRelationship, confirmRelationship, resetRelationships } from '@/lib/data/store/relationships';
import { resetOfficials, createAccount } from '@/lib/auth/officials';
import { caseActRefusal, caseReadRefusal, apiPermission } from '@/lib/auth/roles';
import { dualControlRefusal } from '@/lib/data/dual-control';
import { recordAccess, listAccess, resetAccessLog, verifyAccessLog } from '@/lib/records/access-log';
import { recordDecision, getDecision, verifyDecision, resetDecisions } from '@/lib/records/decisions';
import { resetOffices, recordOfficeDuringSetup, proposeHolding, confirmHolding, listHoldings, listOffices, pastTermHoldings, officesHeldBy } from '@/lib/nation/office-register';
import { openCase, act, attach, resetCases, getCase, registeredEffects, type Actor } from '@/lib/casework/engine';
import { draftPackage, approvePackage, resetPackages } from '@/lib/casework/packages';
import { samplePackage } from '@/lib/casework/testkit';
import { addDocument, resetDocuments } from '@/lib/records/documents';
import { draftDirective, resetDirectives } from '@/lib/data/directives';
import { profileDb, resetConstitutionProfile } from '@/lib/constitution/profile-state';
import { currentParts } from '@/lib/constitution/parts';
import '@/lib/transitions/guard';
import { resetTransitions, recusedOn, statusOf, transitionsDb, competencesInForce } from './state';
import { caretakerRefusal, judicialRefusal } from './restrictions';
import {
  proposeTransition, confirmTransition, withdrawTransition, endTransition, advanceImpeachment, proposeTransitionRules, confirmTransitionRules,
  transitionsOverview, flaggedDecisions, waitingTransitions, type TransitionView,
} from './events';

const SETUP_TOKEN = 'test-setup-token-transitions-0123456789';
process.env.CIVICOS_SETUP_TOKEN = SETUP_TOKEN;
const PW = 'correct horse battery';
const pdf = new Uint8Array(Buffer.from('%PDF-1.7\nform\n%%EOF'));
let basis: { instrument: string; eId: string }[];
let lawId = '';
let exec = '', health = '', court = '', assembly = '', region = '';
type Acc = { by: string; byId: string; role: 'administrator' | 'signatory' | 'officer'; institution?: string; id: string };
let A: Acc, B: Acc, C: Acc, healthSigner: Acc, healthSigner2: Acc, healthOfficer: Acc, judge1: Acc, judge2: Acc, clerk1: Acc, clerk2: Acc;
const ok = (r: { transition: TransitionView } | { error: string }): TransitionView => { if ('error' in r) throw new Error(r.error); return r.transition; };
const mk = (name: string) => { const m = createMinistry({ archetype: 'GENERIC', name, slug: `${name.toLowerCase().replace(/\W+/g, '-')}-${Math.random().toString(36).slice(2, 7)}` }); if ('error' in m) throw new Error(m.error); return m.id; };
async function account(name: string, role: Acc['role'], institution?: string): Promise<Acc> {
  const a = await createAccount({ email: `${name.toLowerCase().replace(/\W+/g, '.')}@gov.test`, name, office: name, password: PW, role, ...(institution ? { institution } : {}) }, 'First Admin');
  if ('error' in a) throw new Error(a.error);
  return { by: name, byId: `local:${a.id}`, id: a.id, role, ...(institution ? { institution } : {}) };
}
const day = (offset: number) => new Date(Date.now() + offset * 86_400_000).toISOString().slice(0, 10);
const at = (offset: number) => new Date(Date.now() + offset * 86_400_000);
let officeId = '';

beforeEach(async () => {
  resetTransitions(); resetLaw(); resetOffices(); resetOfficials(); resetRelationships(); resetConstitutionProfile();
  resetCases(); resetPackages(); resetDocuments(); resetDecisions(); resetAccessLog(); resetDirectives();
  db.setup = null;
  await createAccount({ email: 'first@gov.test', name: 'First Admin', office: 'Administrator', password: PW, setupToken: SETUP_TOKEN }, null);
  exec = mk('Cabinet Office'); health = mk('Ministry of Health'); court = mk('Constitutional Court'); assembly = mk('National Assembly'); region = mk('Northern Region');
  recordTermsDuringSetup(court, { standing: 'judiciary', branch: 'judiciary' }, 'First Admin');
  recordTermsDuringSetup(assembly, { standing: 'legislature', branch: 'legislature' }, 'First Admin');
  recordTermsDuringSetup(region, { standing: 'subnational', branch: 'executive' }, 'First Admin');
  setSovereign({ regions: ['North', 'South'], deployment: { authorities: { businessRegister: health } } }, 'test');
  A = await account('Admin A', 'administrator'); B = await account('Admin B', 'administrator'); C = await account('Admin C', 'administrator');
  healthSigner = await account('Health Signer', 'signatory', health); healthSigner2 = await account('Health Signer Two', 'signatory', health);
  healthOfficer = await account('Health Officer', 'officer', health);
  judge1 = await account('Judge One', 'signatory', court); judge2 = await account('Judge Two', 'signatory', court);
  clerk1 = await account('Clerk One', 'signatory', assembly); clerk2 = await account('Clerk Two', 'signatory', assembly);
  const law = recordLaw({ instrument: { title: 'Public Service Act', type: 'act', jurisdiction: 'X', year: 2020, number: '1', issuingAuthority: 'Assembly' },
    dates: { inForce: '2020-01-01' }, provisions: [{ eId: 'sec_1', num: '1', text: 'Offices.' }, { eId: 'sec_5', num: '5', text: 'Licences.' }, { eId: 'sec_9', num: '9', text: 'Emergencies.' }] }, 'L1', 'l1');
  if ('error' in law) throw new Error(law.error);
  confirmLaw(law.instrument.id, law.version.id, 'L2', 'l2');
  lawId = law.instrument.id;
  basis = [{ instrument: lawId, eId: 'sec_1' }];
  const o = recordOfficeDuringSetup({ title: 'Minister of Health', kind: 'minister', institution: health, effectiveFrom: '2020-01-01', term: { years: 5 } }, { by: 'First Admin', role: 'administrator' });
  if ('error' in o) throw new Error(o.error);
  officeId = o.id;
  db.setup = { completedAt: new Date().toISOString(), by: 'First Admin', stateName: 'Testland' };
});
afterEach(() => { db.setup = null; vi.unstubAllEnvs(); setSovereign({ regions: [], deployment: { authorities: {} } }, 'test'); });

/** The adopted rules a nation might record: who records each impeachment stage, who declares an emergency. */
function adoptRules(extra: Record<string, unknown> = {}) {
  const p = proposeTransitionRules({ impeachmentStages: [assembly, assembly, assembly, assembly, court, assembly, court], emergencyDeclarers: ['executive-office'], emergencyMaxDays: 30, legalBasis: basis, ...extra }, A);
  if ('error' in p) throw new Error(p.error);
  const c = confirmTransitionRules(B);
  if ('error' in c) throw new Error(c.error);
}

describe('transitions and emergencies', () => {
  it('ship nothing in any mode: no transition, no rule adopted, nothing restricted or recused', () => {
    for (const mode of ['production', 'training', 'demo']) {
      vi.stubEnv('CIVICOS_MODE', mode);
      resetTransitions();
      const o = transitionsOverview();
      expect(o.transitions).toEqual([]);
      expect(o.rules).toMatchObject({ adopted: false, caretakerProcedures: [], caretakerDecisions: [], caretakerDirectives: [], emergencyDeclarers: [], emergencyMaxDays: 0, impeachmentStages: ['', '', '', '', '', '', ''] });
      expect(o.inForce).toEqual({ caretaker: [], emergencies: [], rulings: [], competences: [] });
      expect(caretakerRefusal({ institution: health, procedure: 'test.licence', decision: 'grant', directive: 'policy' })).toBeNull();
      expect(recusedOn(['any'])).toEqual([]);
      expect(o.notice).toMatch(/never decides/);
      expect(o.reference.note).toMatch(/not approved/);
    }
    // Without the nation's rules, impeachment and emergencies cannot even be recorded: the platform never names who acts.
    expect(proposeTransition({ kind: 'impeachment', office: officeId, person: { name: 'X' }, legalBasis: basis }, clerk1)).toMatchObject({ error: expect.stringMatching(/not named the institution that records stage 1/) });
    expect(proposeTransition({ kind: 'emergency', actingInstitution: 'executive-office', trigger: 'Flood', effectiveTo: day(5), legalBasis: basis }, A)).toMatchObject({ error: expect.stringMatching(/not named who may declare/) });
  });

  it('cites the law and needs a different person; an acting appointment creates a time-limited holding, ended with it', () => {
    const input = { kind: 'acting', office: officeId, person: healthSigner.id, effectiveTo: day(10), reason: 'Minister abroad' };
    expect(proposeTransition({ ...input, legalBasis: [] }, A)).toMatchObject({ error: expect.stringMatching(/Cite the legal basis/) });
    expect(proposeTransition({ ...input, effectiveTo: undefined, legalBasis: basis }, A)).toMatchObject({ error: expect.stringMatching(/time-limited/) });
    expect(proposeTransition({ ...input, legalBasis: basis }, healthOfficer)).toMatchObject({ error: expect.stringMatching(/An administrator/) });
    const t = ok(proposeTransition({ ...input, legalBasis: basis }, A));
    expect(t).toMatchObject({ status: 'waiting', ref: expect.stringMatching(/^TR-\d{4}-0001$/), names: { office: 'Minister of Health' } });
    expect(waitingTransitions().map(w => w.id)).toEqual([t.id]);
    expect(confirmTransition(t.id, A)).toMatchObject({ error: expect.stringMatching(/different official/) });
    expect(confirmTransition(t.id, healthSigner)).toMatchObject({ error: expect.stringMatching(/person the record names/) });
    expect(confirmTransition(t.id, healthOfficer)).toMatchObject({ error: expect.stringMatching(/can sign/) });
    const done = ok(confirmTransition(t.id, healthSigner2));
    expect(done).toMatchObject({ status: 'in-force', basis: [{ instrument: lawId, eId: 'sec_1' }], holding: expect.any(String) });
    const h = listHoldings(officeId).find(x => x.id === done.holding)!;
    expect(h).toMatchObject({ state: 'active', acting: true, to: day(10), event: t.id, accountId: healthSigner.id });
    expect(listOffices().find(o => o.id === officeId)!.holders.map(x => x.name)).toContain('Health Signer');
    // Holding an office still grants no permission: the rules read role and institution only.
    expect(apiPermission({ role: 'officer', institution: health }, 'POST', '/api/constitution/transitions')).toBeNull();
    // Ended early with reasons: a new version a different person confirms; the holding ends with it; every version kept.
    expect(endTransition(t.id, { reason: '' }, A)).toMatchObject({ error: expect.stringMatching(/why/) });
    ok(endTransition(t.id, { reason: 'Minister returned', legalBasis: basis }, A));
    expect(getStatus(t.id)).toBe('in-force');
    const ended = ok(confirmTransition(t.id, B));
    expect(ended.status).toBe('ended');
    expect(ended.history.filter(x => x.outcome === 'adopted')).toHaveLength(2);
    expect(listHoldings(officeId).find(x => x.id === done.holding)).toMatchObject({ state: 'ended', endReason: expect.stringMatching(/Minister returned/) });
    expect(db.audit.some(e => e.action === 'transition.acting' && (e.detail ?? '').includes('confirmed by Health Signer Two'))).toBe(true);
  });

  it('a delegation is between two officials, time-limited and lapses at its end', () => {
    expect(proposeTransition({ kind: 'delegation', delegator: healthSigner.id, person: healthSigner.id, powers: ['Sign licences'], effectiveTo: day(3), legalBasis: basis }, healthSigner)).toMatchObject({ error: expect.stringMatching(/themselves/) });
    const t = ok(proposeTransition({ kind: 'delegation', institution: health, delegator: healthSigner.id, person: healthOfficer.id, powers: ['Sign licences under sec. 5'], effectiveTo: day(3), legalBasis: basis }, healthSigner));
    expect(confirmTransition(t.id, healthOfficer)).toMatchObject({ error: expect.stringMatching(/person the record names/) });
    ok(confirmTransition(t.id, healthSigner2));
    const e = transitionsDb().events.find(x => x.id === t.id)!;
    expect(statusOf(e)).toBe('in-force');
    expect(statusOf(e, at(5))).toBe('expired');
  });

  it('an emergency is declared by whom the nation names, within its regions and longest period, lapses at expiry and is renewed only by a new confirmed declaration', () => {
    adoptRules();
    const base = { kind: 'emergency', actingInstitution: 'executive-office', trigger: 'Severe flooding', regions: ['North'], powers: ['Requisition of shelters'], legalBasis: [{ instrument: lawId, eId: 'sec_9' }] };
    expect(proposeTransition({ ...base, actingInstitution: health, effectiveTo: day(5) }, healthSigner)).toMatchObject({ error: expect.stringMatching(/not among those/) });
    expect(proposeTransition({ ...base, effectiveTo: undefined }, A)).toMatchObject({ error: expect.stringMatching(/time-limited/) });
    expect(proposeTransition({ ...base, effectiveTo: day(60) }, A)).toMatchObject({ error: expect.stringMatching(/at most 30 days/) });
    expect(proposeTransition({ ...base, regions: ['Atlantis'], effectiveTo: day(5) }, A)).toMatchObject({ error: expect.stringMatching(/nation's list/) });
    expect(proposeTransition({ ...base, suspensions: ['trading-licence'], effectiveTo: day(5) }, A)).toMatchObject({ error: expect.stringMatching(/No emergency suspension/) });
    const t = ok(proposeTransition({ ...base, effectiveTo: day(5) }, A));
    expect(transitionsOverview().inForce.emergencies).toEqual([]); // not before a second person confirms
    ok(confirmTransition(t.id, B));
    expect(transitionsOverview().inForce.emergencies).toHaveLength(1);
    const e = transitionsDb().events.find(x => x.id === t.id)!;
    // Lapses automatically at its expiry: no job, no one ends it.
    expect(statusOf(e, at(6))).toBe('expired');
    expect(transitionsOverview(at(6)).inForce.emergencies).toEqual([]);
    // Renewal is a new declaration, confirmed again.
    const r = ok(proposeTransition({ ...base, renews: t.id, effectiveFrom: day(6), effectiveTo: day(20) }, A));
    expect(r.status).toBe('waiting');
    const renewal = transitionsDb().events.find(x => x.id === r.id)!;
    expect(statusOf(renewal, at(7))).toBe('waiting');
    ok(confirmTransition(r.id, C));
    expect(transitionsOverview(at(7)).inForce.emergencies.map(x => x.id)).toEqual([r.id]);
  });

  it('an emergency never lifts audit, access logging, two-official rules or privacy rules', async () => {
    adoptRules();
    const before = {
      bounds: institutionBounds(),
      outsiderAct: caseActRefusal({ id: A.byId, role: 'administrator' }, { owner: health, sensitivity: 'restricted', decision: true }),
      outsiderRead: caseReadRefusal({ id: healthOfficer.byId, role: 'officer', institution: exec }, { owner: health, sensitivity: 'restricted' }),
      courtRead: caseReadRefusal({ id: A.byId, role: 'administrator' }, { owner: court, sensitivity: 'normal', judicial: true, independent: true }),
      same: dualControlRefusal({ by: 'A', byId: A.byId }, { by: 'A', byId: A.byId }),
      auditor: apiPermission({ role: 'auditor' }, 'POST', '/api/cases/x'),
    };
    const t = ok(proposeTransition({ kind: 'emergency', actingInstitution: 'executive-office', trigger: 'Earthquake', effectiveTo: day(10), powers: ['Every power', 'Read every record'], legalBasis: basis }, A));
    ok(confirmTransition(t.id, B));
    expect(transitionsOverview().inForce.emergencies).toHaveLength(1);
    const after = {
      bounds: institutionBounds(),
      outsiderAct: caseActRefusal({ id: A.byId, role: 'administrator' }, { owner: health, sensitivity: 'restricted', decision: true }),
      outsiderRead: caseReadRefusal({ id: healthOfficer.byId, role: 'officer', institution: exec }, { owner: health, sensitivity: 'restricted' }),
      courtRead: caseReadRefusal({ id: A.byId, role: 'administrator' }, { owner: court, sensitivity: 'normal', judicial: true, independent: true }),
      same: dualControlRefusal({ by: 'A', byId: A.byId }, { by: 'A', byId: A.byId }),
      auditor: apiPermission({ role: 'auditor' }, 'POST', '/api/cases/x'),
    };
    expect(after).toEqual(before);
    expect(after.outsiderAct).toBeTruthy();
    expect(after.outsiderRead).toBeTruthy();
    expect(after.courtRead).toBeTruthy();
    expect(after.same).toBeTruthy();
    // Reads are still written to the access log, chained and verifiable.
    recordAccess({ by: { id: A.byId, name: 'Admin A' }, record: { register: 'cases', id: 'c1' }, action: 'view', purpose: 'Emergency response', result: 'refused' });
    expect(listAccess({})).toHaveLength(1);
    expect(verifyAccessLog().ok).toBe(true);
    // Two officials are still needed for an emergency's own record, and for ending it.
    ok(endTransition(t.id, { reason: 'Danger passed', legalBasis: basis }, A));
    expect(confirmTransition(t.id, A)).toMatchObject({ error: expect.stringMatching(/different official/) });
    // A decision still needs an official who can sign at the responsible institution.
    ready();
    const c = await openAndAccept();
    expect(await act(c, { action: 'grant', reason: 'Emergency' }, actor(A, undefined, 'administrator'))).toMatchObject({ error: expect.stringMatching(/Cases are worked only by officials/) });
  });

  it('a court\'s ruling is recorded only by the court, flags affected decisions without changing them, and refuses new ones only where its effect requires', async () => {
    const sealed = await recordDecision({ subject: { kind: 'case', id: 'c-old', ref: 'TL-OLD' }, institution: { id: health, name: 'Ministry of Health' }, decision: 'grant', reasons: 'Met the conditions',
      citations: [{ instrument: lawId, eId: 'sec_5', version: 'v', digest: 'd', on: '2026-01-01' }], officials: [{ role: 'decided', name: 'S1' }], at: new Date().toISOString() });
    if ('error' in sealed) throw new Error(sealed.error);
    const ruling = { kind: 'judicial-review', actingInstitution: court, reference: 'CC 4/2026', target: { instrument: lawId, eId: 'sec_5' }, effect: 'invalid', finality: 'final', legalBasis: basis };
    expect(proposeTransition({ ...ruling, actingInstitution: health }, healthSigner)).toMatchObject({ error: expect.stringMatching(/Name the court/) });
    expect(proposeTransition(ruling, A)).toMatchObject({ error: expect.stringMatching(/An official of the court/) });
    const t = ok(proposeTransition(ruling, judge1));
    expect(confirmTransition(t.id, A)).toMatchObject({ error: expect.stringMatching(/can sign at Constitutional Court/) });
    ok(confirmTransition(t.id, judge2));
    // The old decision is flagged for legal assessment, never deleted or changed.
    expect(flaggedDecisions()).toEqual([expect.objectContaining({ decision: sealed.id, ruling: t.ref, effect: 'invalid' })]);
    const kept = getDecision(sealed.id)!;
    expect(kept.content).toEqual(sealed.content);
    expect(verifyDecision(kept).ok).toBe(true);
    // A new decision citing it is refused; a directive too.
    expect(judicialRefusal([{ instrument: lawId, eId: 'sec_5' }])).toMatch(/declared invalid by Constitutional Court \(CC 4\/2026\)/);
    expect(judicialRefusal([{ instrument: lawId, eId: 'sec_1' }])).toBeNull();
    ready([{ instrument: lawId, eId: 'sec_5' }]);
    const c = await openAndAccept();
    expect(await act(c, { action: 'grant', reason: 'ok' }, actor(healthSigner))).toMatchObject({ error: expect.stringMatching(/declared invalid/) });
    expect(draftDirective({ ref: 'D-1', kind: 'communication', issuedByCharterId: 'executive-office', title: 'Notice', legalBasis: [{ instrument: lawId, eId: 'sec_5' }], by: 'Admin A' })).toMatchObject({ error: expect.stringMatching(/declared invalid/) });
    // A court ruling is not ended here: a later ruling is recorded.
    expect(endTransition(t.id, { reason: 'x', legalBasis: basis }, judge1)).toMatchObject({ error: expect.stringMatching(/later ruling/) });
  });

  it('a stayed ruling, or one that reads a provision down, flags but does not block', () => {
    const t1 = ok(proposeTransition({ kind: 'judicial-review', actingInstitution: court, reference: 'CC 5/2026', target: { instrument: lawId, eId: 'sec_5' }, effect: 'suspended', finality: 'stayed', legalBasis: basis }, judge1));
    ok(confirmTransition(t1.id, judge2));
    const t2 = ok(proposeTransition({ kind: 'judicial-review', actingInstitution: court, reference: 'CC 6/2026', target: { instrument: lawId, eId: 'sec_1' }, effect: 'read-down', legalBasis: basis }, judge1));
    ok(confirmTransition(t2.id, judge2));
    expect(judicialRefusal([{ instrument: lawId, eId: 'sec_5' }, { instrument: lawId, eId: 'sec_1' }])).toBeNull();
    expect(transitionsOverview().inForce.rulings).toHaveLength(2);
  });

  it('a declared conflict of interest recuses the official on that case at once; only two people lift it', async () => {
    ready();
    const caseId = await openAndAccept();
    const ref = getCase(caseId)!.ref;
    const d = ok(proposeTransition({ kind: 'conflict', person: healthSigner.id, interest: 'The applicant is my brother-in-law', cases: [ref] }, healthSigner));
    expect(d.status).toBe('waiting'); // declared without a citation: it only restricts the declarant
    expect(recusedOn([caseId, ref])).toContain(healthSigner.byId);
    expect(caseActRefusal({ id: healthSigner.byId, role: 'signatory', institution: health }, { owner: health, sensitivity: 'normal', recused: recusedOn([ref]) })).toMatch(/conflict of interest/);
    expect(await act(caseId, { action: 'grant', reason: 'ok' }, actor(healthSigner))).toMatchObject({ error: expect.stringMatching(/conflict of interest/) });
    // Another official acts as before.
    expect(await act(caseId, { action: 'grant', reason: 'ok' }, actor(healthSigner2))).toMatchObject({ pending: true });
    // A declaration is never withdrawn by one person; it is acknowledged by another (never the declarant).
    expect(withdrawTransition(d.id, healthSigner)).toMatchObject({ error: expect.stringMatching(/kept/) });
    expect(confirmTransition(d.id, healthSigner)).toMatchObject({ error: expect.stringMatching(/person the record names/) });
    ok(confirmTransition(d.id, healthSigner2));
    // Lifting: asked by the declarant, citing the law; confirmed by a different person; still recused while it waits.
    ok(endTransition(d.id, { reason: 'Relative withdrew the application', legalBasis: basis }, healthSigner));
    expect(recusedOn([ref])).toContain(healthSigner.id);
    expect(confirmTransition(d.id, healthSigner)).toMatchObject({ error: expect.stringMatching(/person the record names/) });
    ok(confirmTransition(d.id, A));
    expect(recusedOn([ref])).toEqual([]);
  });

  it('a caretaker period refuses only the kinds the nation listed, and warns while none is listed', async () => {
    ready();
    const ct = ok(proposeTransition({ kind: 'caretaker', institution: 'executive-office', reason: 'Parliament dissolved pending elections', legalBasis: basis }, A));
    ok(confirmTransition(ct.id, B));
    // No rule adopted: nothing restricted, the screen warns (never an invented restriction).
    expect(caretakerRefusal({ institution: health, procedure: 'test.licence', decision: 'grant' })).toBeNull();
    expect(transitionsOverview().warnings.join(' ')).toMatch(/adopted no caretaker restrictions: nothing is restricted/);
    const c1 = await openAndAccept();
    expect(await act(c1, { action: 'grant', reason: 'ok' }, actor(healthSigner))).toMatchObject({ pending: true });
    // The nation adopts its restrictions: decisions under the listed procedure, and policy directives.
    adoptRules({ caretakerProcedures: ['test.licence'], caretakerDirectives: ['policy'] });
    expect(transitionsOverview().warnings.join(' ')).not.toMatch(/nothing is restricted/);
    const c2 = await openAndAccept();
    expect(await act(c2, { action: 'refuse', reason: 'no' }, actor(healthSigner))).toMatchObject({ error: expect.stringMatching(/caretaker period/) });
    // The proposal made before the restriction is checked again when confirmed.
    expect(await act(c1, { action: 'grant' }, actor(healthSigner2))).toMatchObject({ error: expect.stringMatching(/caretaker period/) });
    // Unlisted kinds go on; an independent institution is not covered by the government's caretaker period.
    expect(caretakerRefusal({ institution: health, procedure: 'other.permit', decision: 'grant' })).toBeNull();
    expect(caretakerRefusal({ institution: court, procedure: 'test.licence' })).toBeNull();
    // Nor a regional government with its own powers.
    expect(caretakerRefusal({ institution: region, procedure: 'test.licence' })).toBeNull();
    expect(draftDirective({ ref: 'D-2', kind: 'policy', issuedByCharterId: 'executive-office', title: 'New policy', by: 'Admin A' })).toMatchObject({ error: expect.stringMatching(/caretaker period/) });
    expect(draftDirective({ ref: 'D-3', kind: 'communication', issuedByCharterId: 'executive-office', title: 'Notice', by: 'Admin A' })).not.toHaveProperty('error');
    // Ended (two people): the restriction goes with it.
    ok(endTransition(ct.id, { reason: 'New government sworn in', legalBasis: basis }, A));
    ok(confirmTransition(ct.id, C));
    expect(caretakerRefusal({ institution: health, procedure: 'test.licence' })).toBeNull();
  });

  it('impeachment runs through seven separate stages in order, each by the institution the nation names; no outcome is automatic', async () => {
    adoptRules();
    const subject = await account('Minister Holder', 'signatory', health);
    const h = proposeHolding({ officeId, accountId: subject.id, from: '2024-01-01' }, { by: 'Admin A', byId: A.byId, role: 'administrator' });
    if ('error' in h) throw new Error(h.error);
    confirmHolding(h.id, { by: 'Admin B', byId: B.byId, role: 'administrator' });
    const p = ok(proposeTransition({ kind: 'impeachment', office: officeId, person: subject.id, reason: 'Petition no. 12', legalBasis: basis }, clerk1));
    expect(p.stageLabel).toMatch(/Stage 1: Complaint/);
    expect(proposeTransition({ kind: 'impeachment', office: officeId, person: subject.id, stage: 4, legalBasis: basis }, clerk1)).toMatchObject({ error: expect.stringMatching(/begins at stage 1/) });
    expect(confirmTransition(p.id, subject)).toMatchObject({ error: expect.stringMatching(/person the record names|can sign at National Assembly/) });
    expect(confirmTransition(p.id, A)).toMatchObject({ error: expect.stringMatching(/can sign at National Assembly/) });
    ok(confirmTransition(p.id, clerk2));
    // No stage skipped.
    expect(advanceImpeachment(p.id, { stage: 3, outcome: 'initiated', legalBasis: basis }, clerk1)).toMatchObject({ error: expect.stringMatching(/none is skipped: the next is stage 2/) });
    ok(advanceImpeachment(p.id, { stage: 2, outcome: 'proceed', legalBasis: basis }, clerk1));
    expect(advanceImpeachment(p.id, { stage: 3, outcome: 'initiated', legalBasis: basis }, clerk1)).toMatchObject({ error: expect.stringMatching(/waiting for a second official/) });
    ok(confirmTransition(p.id, clerk2));
    ok(advanceImpeachment(p.id, { stage: 3, outcome: 'initiated', legalBasis: basis }, clerk1)); ok(confirmTransition(p.id, clerk2));
    ok(advanceImpeachment(p.id, { stage: 4, outcome: 'carried', legalBasis: basis }, clerk1)); ok(confirmTransition(p.id, clerk2));
    // Stage 5 belongs to the court the nation named: the assembly cannot record it.
    expect(advanceImpeachment(p.id, { stage: 5, outcome: 'upheld', legalBasis: basis }, clerk1)).toMatchObject({ error: expect.stringMatching(/An official of Constitutional Court records stage 5/) });
    ok(advanceImpeachment(p.id, { stage: 5, outcome: 'upheld', legalBasis: basis }, judge1)); ok(confirmTransition(p.id, judge2));
    const six = ok(advanceImpeachment(p.id, { stage: 6, outcome: 'removed', legalBasis: basis }, clerk1));
    expect(six.pending?.values).toMatchObject({ stage: 6, outcome: 'removed' });
    const after6 = ok(confirmTransition(p.id, clerk2));
    expect(after6.history.filter(x => x.outcome === 'adopted').map(x => x.values.stage)).toEqual([6, 5, 4, 3, 2, 1]);
    // Removal recorded: the holding and the account are untouched until the nation ends the holding on Offices.
    expect(officesHeldBy(subject.id).map(o => o.id)).toContain(officeId);
    expect(after6.next).toMatchObject({ stage: 7 });
  });

  it('a dismissed complaint closes the proceeding', () => {
    adoptRules();
    const p = ok(proposeTransition({ kind: 'impeachment', office: officeId, person: { name: 'The Minister' }, legalBasis: basis }, clerk1));
    ok(confirmTransition(p.id, clerk2));
    ok(advanceImpeachment(p.id, { stage: 2, outcome: 'dismissed', legalBasis: basis }, clerk1));
    expect(ok(confirmTransition(p.id, clerk2)).status).toBe('closed');
    expect(advanceImpeachment(p.id, { stage: 3, outcome: 'initiated', legalBasis: basis }, clerk1)).toMatchObject({ error: expect.stringMatching(/closed/) });
  });

  it('a dissolution is recorded only under an approved dissolve relationship', async () => {
    const hos = mk('Office of the Head of State');
    const signer = await account('HoS Signer', 'signatory', hos), signer2 = await account('HoS Signer Two', 'signatory', hos);
    const input = { kind: 'dissolution', institution: assembly, actingInstitution: hos, reference: 'Proclamation 1', arrangements: 'Elections within 60 days', legalBasis: basis };
    expect(proposeTransition(input, signer)).toMatchObject({ error: expect.stringMatching(/never assumes who may dissolve/) });
    const r = proposeRelationship({ from: hos, to: assembly, type: 'dissolve', legalBasis: basis }, A);
    if ('error' in r) throw new Error(r.error);
    const conf = confirmRelationship(r.relationship.id, { ...clerk1 }, id => id === assembly);
    if ('error' in conf) throw new Error(conf.error);
    const t = ok(proposeTransition(input, signer));
    expect(ok(confirmTransition(t.id, signer2)).status).toBe('in-force');
  });

  it('transfers of powers are versioned allocations in force from their date, part of the constitutional profile', () => {
    const before = currentParts().find(p => p.key === 'competences')!;
    expect(before).toMatchObject({ version: 0, summary: 'No transfer of a power recorded' });
    const t = ok(proposeTransition({ kind: 'competence', competence: 'primary-health-licensing', institution: health, actingInstitution: region, regions: ['North'], direction: 'devolution', arrangements: 'Records and staff move with it', legalBasis: basis }, A));
    expect(competencesInForce()).toEqual([]);
    ok(confirmTransition(t.id, B));
    expect(competencesInForce()).toEqual([expect.objectContaining({ competence: 'primary-health-licensing', holder: region, previous: health, regions: ['North'] })]);
    const mid = currentParts().find(p => p.key === 'competences')!;
    expect(mid.version).toBe(1);
    expect(mid.digest).not.toBe(before.digest);
    // Recentralised later: a new version, the earlier one kept.
    const back = ok(proposeTransition({ kind: 'competence', competence: 'primary-health-licensing', institution: region, actingInstitution: health, regions: ['North'], direction: 'recentralisation', effectiveFrom: day(30), legalBasis: basis }, A));
    ok(confirmTransition(back.id, B));
    expect(competencesInForce()[0]!.holder).toBe(region);
    expect(competencesInForce(at(31))[0]!.holder).toBe(health);
    expect(transitionsOverview().transitions.filter(x => x.kind === 'competence')).toHaveLength(2);
  });

  it('a part frozen by a dispute freezes the transitions touching it', () => {
    profileDb().profiles.push({ id: 'p1', version: 1, title: 'Disputed', status: 'disputed', parts: [], digest: 'x', touches: ['offices'], effectiveFrom: day(0), basis: [],
      drafted: { by: 'Admin A', at: new Date().toISOString() }, consult: [], consultations: [], approvals: [], disputes: [{ raisedBy: 'Clerk', at: new Date().toISOString(), grounds: 'Art. 4', statusBefore: 'approval', frozen: ['offices'] }], events: [] });
    expect(proposeTransition({ kind: 'acting', office: officeId, person: healthSigner.id, effectiveTo: day(10), reason: 'Absence', legalBasis: basis }, A)).toMatchObject({ error: expect.stringMatching(/Offices of state is frozen/) });
    // A court's ruling and a declaration of interest touch no part: never frozen by a dispute.
    expect(proposeTransition({ kind: 'conflict', person: healthSigner.id, interest: 'Shareholding' }, healthSigner)).toHaveProperty('transition');
  });

  it('a holding past its recorded term is no longer in force and is flagged', async () => {
    const holder = await account('Long Serving', 'signatory', health);
    const h = proposeHolding({ officeId, accountId: holder.id, from: '2019-01-01' }, { by: 'Admin A', byId: A.byId, role: 'administrator' });
    if ('error' in h) throw new Error(h.error);
    confirmHolding(h.id, { by: 'Admin B', byId: B.byId, role: 'administrator' });
    expect(listOffices().find(o => o.id === officeId)!.holders.map(x => x.name)).not.toContain('Long Serving');
    expect(officesHeldBy(holder.id)).toEqual([]);
    expect(pastTermHoldings()).toEqual([expect.objectContaining({ holderName: 'Long Serving', termEnded: '2023-12-31' })]);
    expect(transitionsOverview().warnings.join(' ')).toMatch(/Long Serving's term as Minister of Health ended on 2023-12-31/);
  });
});

// ── helpers ──────────────────────────────────────────────────────────────────
function getStatus(id: string) { return statusOf(transitionsDb().events.find(x => x.id === id)!); }
function actor(a: Acc, institution = a.institution, role = a.role): Actor { return { id: a.byId, name: a.by, scope: { id: a.byId, role, ...(institution ? { institution } : {}) } }; }
function ready(citations: { instrument: string; eId: string }[] = []) {
  const d = draftPackage(samplePackage({ owner: 'businessRegister', citations: citations.map(c => ({ ...c, version: 'v', digest: 'd', on: '2026-01-01' })) }), 'Author', 'author', registeredEffects());
  if ('error' in d) throw new Error(d.error);
  const a = approvePackage(d.key, d.version, 'Approver', 'approver', '2026-01-01', registeredEffects(), new Date('2026-01-01'));
  if ('error' in a) throw new Error(a.error);
}
async function openAndAccept(): Promise<string> {
  const c = openCase({ procedure: 'test.licence', fields: { name: 'Ade' } }, actor(healthOfficer));
  if ('error' in c) throw new Error(c.error);
  const doc = addDocument({ class: 'application-form', title: 'Form', institution: health, belongsTo: { kind: 'case', id: c.id }, bytes: pdf }, 'A') as { id: string };
  attach(c.id, doc.id, actor(healthOfficer));
  const r = await act(c.id, { action: 'accept' }, actor(healthOfficer));
  if ('error' in r) throw new Error(r.error);
  return c.id;
}
