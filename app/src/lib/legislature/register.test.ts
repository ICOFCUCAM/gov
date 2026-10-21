// The legislature's own record (plan phase 7; guidance §2.3, §6.2; audit J):
// kept only by the legislature's officials, under a procedure two of them
// approved (the reference is never approved as it stands); votes counted by
// the nation's rules and never rewritten, only corrected through the
// chamber's process with the previous version kept; assent by the head of
// state's office; the enacted text enters the laws register from the record,
// certified, and is confirmed there by a different official. Mechanism tests:
// institutions, rules and texts below are illustrative.
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createMinistry } from '@/lib/data/store/ministries';
import { setSovereign } from '@/lib/data/store/sovereign';
import { db as storeDb } from '@/lib/data/store/state';
import { recordTermsDuringSetup, institutionBounds } from '@/lib/data/store/institutions';
import { resetLaw, recordVersion, confirmVersion, getInstrument, versionOn } from '@/lib/law/register';
import { toAkomaNtoso } from '@/lib/law/akoma-ntoso';
import { apiPermission, type Scope } from '@/lib/auth/roles';
import { onboardingStatus } from '@/lib/onboarding/status';
import {
  resetLegislature, draftProcedure, approveProcedure, activeProcedure, listProcedures, introduceBill, addText, recordStage, referToCommittee,
  recordReport, proposeAmendment, decideAmendment, recordVote, passBill, recordAssent, recordCommencement, publishBill, certifyBill,
  transmitToLaws, proposeCorrection, confirmCorrection, getBill, publicBill, certificationOf, voteResult, waitingLegislative, readsFullRecord,
  type LegislativeActor,
} from './register';

const mk = (name: string) => {
  const m = createMinistry({ archetype: 'GENERIC', name, slug: `${name.toLowerCase().replace(/\W+/g, '-')}-${Math.random().toString(36).slice(2, 7)}` });
  if ('error' in m) throw new Error(m.error);
  return m.id;
};
const ok = <T,>(r: T | { error: string }): T => { if (r && typeof r === 'object' && 'error' in r) throw new Error((r as { error: string }).error); return r as T; };
const SEC = [{ eId: 'sec_1', num: '1', heading: 'Short title', text: 'This Act may be cited as the Public Records Act.' }, { eId: 'sec_2', num: '2', text: 'Every public body keeps its records.' }];

let assembly: string, head: string, justice: string, finance: string;
let clerk: LegislativeActor, deputy: LegislativeActor, staff: LegislativeActor, wgAdmin: LegislativeActor, minister: LegislativeActor, president: LegislativeActor, lawOfficial: { by: string; byId: string };

const actor = (by: string, s: Scope): LegislativeActor => ({ by, byId: `local:${by.toLowerCase().replace(/\W+/g, '-')}`, scope: s });

beforeEach(() => {
  resetLegislature();
  resetLaw();
  storeDb.setup = null;
  assembly = mk('National Assembly'); head = mk('Office of the President'); justice = mk('Ministry of Justice'); finance = mk('Ministry of Finance');
  recordTermsDuringSetup(assembly, { standing: 'legislature', branch: 'legislature' }, 'Setup');
  recordTermsDuringSetup(head, { standing: 'head-of-state', branch: 'crown' }, 'Setup');
  setSovereign({ deployment: { authorities: { legislature: assembly, headOfState: head, lawRegister: justice } } }, 'Setup');
  const bounds = institutionBounds();
  clerk = actor('Clerk', { role: 'signatory', institution: assembly, bounds });
  deputy = actor('Deputy Clerk', { role: 'signatory', institution: assembly, bounds });
  staff = actor('Table Office', { role: 'officer', institution: assembly, bounds });
  wgAdmin = actor('Head of Service', { role: 'administrator', bounds });
  minister = actor('Minister', { role: 'signatory', institution: finance, bounds });
  president = actor('President\'s Secretary', { role: 'signatory', institution: head, bounds });
  lawOfficial = { by: 'Registrar of Laws', byId: 'local:registrar' };
});
afterEach(() => { setSovereign({ deployment: { authorities: {} } }, 'test'); });

/** The legislature drafts its procedure from the reference and a second official approves it. */
function approveFromReference(over: Record<string, unknown> = {}) {
  const d = ok(draftProcedure({ fromReference: true, title: 'Standing orders', chambers: ['National Assembly'], ...over }, staff));
  return ok(approveProcedure(d.version, clerk, '2026-01-01'));
}

/** Introduce and carry a bill through every stage to passage. */
function passedBill() {
  approveFromReference();
  const b = ok(introduceBill({ title: 'Public Records Bill', provisions: SEC, sponsor: 'Hon. A. Member', date: '2026-10-01' }, staff));
  ok(recordStage(b.id, { stage: 'second-reading', date: '2026-10-05' }, staff));
  ok(recordVote(b.id, { yes: 100, no: 20, abstain: 3, date: '2026-10-05' }, clerk));
  ok(recordStage(b.id, { stage: 'committee', date: '2026-10-06' }, staff));
  ok(referToCommittee(b.id, { committee: 'Committee on Public Administration', date: '2026-10-06' }, staff));
  ok(recordReport(b.id, { committee: 'Committee on Public Administration', date: '2026-10-10', recommendation: 'proceed', summary: 'Proceed without amendment.' }, staff));
  ok(recordStage(b.id, { stage: 'third-reading', date: '2026-10-12' }, staff));
  ok(recordVote(b.id, { yes: 98, no: 21, abstain: 4, date: '2026-10-12' }, clerk));
  return ok(passBill(b.id, { date: '2026-10-12' }, clerk));
}

describe('the legislative procedure', () => {
  it('ships only an unapproved reference: no bill is introduced until two officials of the legislature approve the nation\'s version', () => {
    expect(listProcedures().map(p => p.state)).toEqual(['reference']);
    expect(activeProcedure()).toBeUndefined();
    expect(introduceBill({ title: 'A Bill', provisions: SEC }, staff)).toMatchObject({ error: expect.stringMatching(/not approved its legislative procedure/) });
    expect(approveProcedure(0, clerk)).toMatchObject({ error: expect.stringMatching(/reference is never approved/) });
    const d = ok(draftProcedure({ fromReference: true, chambers: ['National Assembly'] }, clerk));
    expect(d).toMatchObject({ state: 'draft', fromReference: true, version: 1 });
    expect(waitingLegislative().map(w => w.what)).toEqual([expect.stringMatching(/Legislative procedure version 1/)]);
    // The author cannot approve it; an officer cannot; the whole government cannot.
    expect(approveProcedure(1, clerk)).toMatchObject({ error: expect.stringMatching(/different official/) });
    expect(approveProcedure(1, staff)).toMatchObject({ error: expect.stringMatching(/can sign at the legislature/) });
    expect(approveProcedure(1, wgAdmin)).toMatchObject({ error: expect.stringMatching(/serving the whole government does not reach it/) });
    expect(ok(approveProcedure(1, deputy))).toMatchObject({ state: 'approved', approvedBy: 'Deputy Clerk' });
    expect(activeProcedure()?.version).toBe(1);
  });

  it('refuses a procedure that does not fit together', () => {
    expect(draftProcedure({ fromReference: true, chambers: ['A'], votes: { names: 'never', majority: 'simple' }, publicRecord: { bills: 'introduced', votes: 'names' } }, staff)).toMatchObject({ error: expect.stringMatching(/names when names are never recorded/) });
    expect(draftProcedure({ fromReference: true, chambers: ['A'], votes: { names: 'never', majority: 'absolute' } }, staff)).toMatchObject({ error: expect.stringMatching(/number of seats/) });
  });

  it('counts votes by the nation\'s rules, never by the platform\'s', () => {
    expect(voteResult({ names: 'never', majority: 'simple' }, { yes: 5, no: 5, abstain: 0 }).result).toBe('negatived');
    expect(voteResult({ names: 'never', majority: 'absolute', membership: 100 }, { yes: 50, no: 10, abstain: 0 }).result).toBe('negatived');
    expect(voteResult({ names: 'never', majority: 'absolute', membership: 100 }, { yes: 51, no: 10, abstain: 0 }).result).toBe('carried');
    expect(voteResult({ names: 'never', majority: 'two-thirds-voting' }, { yes: 20, no: 10, abstain: 40 }).result).toBe('carried');
    expect(voteResult({ names: 'never', majority: 'simple', quorum: 50 }, { yes: 20, no: 10, abstain: 0 }).result).toBe('inquorate');
  });
});

describe('the clerk keeps the record', () => {
  it('lets only the legislature\'s own officials write it — never the whole government, never a ministry', () => {
    approveFromReference();
    for (const who of [wgAdmin, minister, president]) {
      expect(introduceBill({ title: 'A Bill', provisions: SEC }, who), who.by).toMatchObject({ error: expect.stringMatching(/kept by its own officials/) });
    }
    const b = ok(introduceBill({ title: 'A Bill', provisions: SEC }, staff));
    expect(recordStage(b.id, { stage: 'second-reading' }, minister)).toMatchObject({ error: expect.stringMatching(/another institution cannot write/) });
    ok(recordStage(b.id, { stage: 'second-reading' }, staff));
    // A vote is recorded by the clerk (can sign), not by staff.
    expect(recordVote(b.id, { yes: 3, no: 1 }, staff)).toMatchObject({ error: expect.stringMatching(/can sign at the legislature/) });
    expect(recordVote(b.id, { yes: 3, no: 1 }, wgAdmin)).toMatchObject({ error: expect.stringMatching(/kept by its own officials/) });
    // The path rule says the same before the route runs.
    const bounds = institutionBounds();
    expect(apiPermission({ role: 'administrator', bounds }, 'POST', '/api/legislature/bills')).toMatch(/kept by its own officials/);
    expect(apiPermission({ role: 'signatory', institution: finance, bounds }, 'POST', `/api/legislature/bills/${b.id}`)).toMatch(/another institution/);
    expect(apiPermission({ role: 'officer', institution: assembly, bounds }, 'POST', `/api/legislature/bills/${b.id}`)).toBeNull();
    expect(apiPermission({ role: 'signatory', institution: head, bounds }, 'POST', `/api/legislature/bills/${b.id}/assent`)).toBeNull();
    expect(apiPermission({ role: 'signatory', institution: assembly, bounds }, 'POST', `/api/legislature/bills/${b.id}/assent`)).toMatch(/head of state's office/);
  });

  it('moves a bill forward only through its stages, past a vote only once carried, keeping every text version', () => {
    approveFromReference();
    const b = ok(introduceBill({ title: 'Public Records Bill', provisions: SEC, date: '2026-10-01' }, staff));
    expect(b).toMatchObject({ stage: 'introduced', state: 'in-progress', procedureVersion: 1, texts: [{ n: 1, label: 'As introduced' }] });
    expect(recordStage(b.id, { stage: 'committee' }, staff)).toMatchObject({ error: expect.stringMatching(/pass over Second reading/) });
    ok(recordStage(b.id, { stage: 'second-reading' }, staff));
    expect(recordStage(b.id, { stage: 'committee' }, staff)).toMatchObject({ error: expect.stringMatching(/vote on the bill/) });
    ok(recordVote(b.id, { yes: 2, no: 3 }, clerk));
    expect(recordStage(b.id, { stage: 'committee' }, staff)).toMatchObject({ error: expect.stringMatching(/vote on the bill/) });
    ok(recordVote(b.id, { yes: 4, no: 3 }, clerk));
    ok(recordStage(b.id, { stage: 'committee' }, staff));
    expect(recordStage(b.id, { stage: 'introduced' }, staff)).toMatchObject({ error: expect.stringMatching(/moves forward/) });
    // An amendment, agreed, gives a new text version; the first stays.
    const withAmendment = ok(proposeAmendment(b.id, { number: '1', proposer: 'Hon. B. Member', text: 'In section 2, after "keeps" insert "and publishes".' }, staff));
    const m = withAmendment.amendments[0]!;
    ok(decideAmendment(b.id, { amendment: m.id, outcome: 'agreed' }, staff));
    const amended = ok(addText(b.id, { label: 'As amended in committee', provisions: [SEC[0], { ...SEC[1]!, text: 'Every public body keeps and publishes its records.' }], amendments: [m.id] }, staff));
    expect(amended.texts.map(t => t.label)).toEqual(['As introduced', 'As amended in committee']);
    expect(amended.texts[0]!.digest).not.toBe(amended.texts[1]!.digest);
    // The report stage is optional in these standing orders: the bill may pass over it.
    ok(recordStage(b.id, { stage: 'third-reading' }, staff));
    expect(passBill(b.id, {}, clerk)).toMatchObject({ error: expect.stringMatching(/vote on the bill/) });
  });

  it('records names only where the standing orders say, and they must match the counts', () => {
    approveFromReference({ votes: { names: 'on-division', majority: 'simple' } });
    const b = ok(introduceBill({ title: 'A Bill', provisions: SEC }, staff));
    ok(recordStage(b.id, { stage: 'second-reading' }, staff));
    expect(recordVote(b.id, { yes: 1, no: 0, names: [{ name: 'A', vote: 'yes' }] }, clerk)).toMatchObject({ error: expect.stringMatching(/only on a division/) });
    expect(recordVote(b.id, { yes: 2, no: 0, division: true, names: [{ name: 'A', vote: 'yes' }] }, clerk)).toMatchObject({ error: expect.stringMatching(/do not match/) });
    expect(recordVote(b.id, { yes: 1, no: 0, division: true }, clerk)).toMatchObject({ error: expect.stringMatching(/list them/) });
    const v = ok(recordVote(b.id, { yes: 2, no: 1, division: true, names: [{ name: 'A', vote: 'yes' }, { name: 'B', vote: 'yes' }, { name: 'C', vote: 'no' }] }, clerk)).votes[0]!;
    expect(v).toMatchObject({ result: 'carried', names: [{ name: 'A' }, { name: 'B' }, { name: 'C' }] });
  });

  it('never rewrites a recorded vote: a correction is confirmed by a different official who can sign, and the previous version stays', () => {
    approveFromReference();
    const b = ok(introduceBill({ title: 'A Bill', provisions: SEC }, staff));
    ok(recordStage(b.id, { stage: 'second-reading' }, staff));
    const v = ok(recordVote(b.id, { yes: 10, no: 4, abstain: 1 }, clerk)).votes[0]!;
    // Nobody outside the legislature proposes one.
    expect(proposeCorrection(b.id, { target: { kind: 'vote', id: v.id }, values: { yes: 11 }, reason: 'Miscount' }, minister)).toMatchObject({ error: expect.stringMatching(/another institution/) });
    expect(proposeCorrection(b.id, { target: { kind: 'vote', id: v.id }, values: { yes: 11 }, reason: '' }, staff)).toMatchObject({ error: expect.stringMatching(/Say why/) });
    const c = ok(proposeCorrection(b.id, { target: { kind: 'vote', id: v.id }, values: { yes: 11 }, reason: 'Tellers\' miscount reported by the Speaker' }, staff)).corrections[0]!;
    expect(getBill(b.id)!.votes[0]!.yes).toBe(10);
    expect(confirmCorrection(b.id, c.id, wgAdmin)).toMatchObject({ error: expect.stringMatching(/kept by its own officials/) });
    expect(confirmCorrection(b.id, c.id, staff)).toMatchObject({ error: expect.stringMatching(/can sign at the legislature/) });
    const after = ok(confirmCorrection(b.id, c.id, clerk));
    expect(after.votes[0]).toMatchObject({ yes: 11, no: 4, result: 'carried', history: [{ values: { yes: 10, no: 4, result: 'carried' }, correction: c.id }] });
    expect(after.journal.at(-1)).toMatchObject({ kind: 'correction' });
    // A correction never reverses a result the bill has moved on from.
    ok(recordStage(b.id, { stage: 'committee' }, staff));
    expect(proposeCorrection(b.id, { target: { kind: 'vote', id: v.id }, values: { yes: 1 }, reason: 'x' }, staff)).toMatchObject({ error: expect.stringMatching(/chamber's own decision/) });
  });
});

describe('from passage to the laws register', () => {
  it('needs assent from the head of state\'s office, then commencement, publication and a current certification', () => {
    const b = passedBill();
    expect(b).toMatchObject({ state: 'passed', passed: { textVersion: 1 } });
    expect(publishBill(b.id, { reference: 'Gazette 1', actNumber: '7' }, clerk)).toMatchObject({ error: expect.stringMatching(/enacted bill/) });
    expect(recordAssent(b.id, { outcome: 'assented' }, clerk)).toMatchObject({ error: expect.stringMatching(/head of state's office/) });
    expect(recordAssent(b.id, { outcome: 'assented' }, wgAdmin)).toMatchObject({ error: expect.stringMatching(/head of state's office/) });
    expect(readsFullRecord(president.scope, getBill(b.id)!)).toBe(true);
    ok(recordAssent(b.id, { outcome: 'assented', date: '2026-10-20' }, president));
    expect(getBill(b.id)).toMatchObject({ state: 'assented', assent: { outcome: 'assented', institution: head } });
    ok(recordCommencement(b.id, { inForce: '2027-01-01' }, clerk));
    ok(publishBill(b.id, { date: '2026-10-25', reference: 'Gazette Supplement 12', actNumber: '7' }, clerk));
    expect(transmitToLaws(b.id, clerk)).toMatchObject({ error: expect.stringMatching(/Certify the record/) });
    const certified = ok(certifyBill(b.id, clerk));
    expect(certificationOf(certified)).toMatchObject({ current: true, by: 'Clerk' });
    // The executive cannot send it, nor type the law in under the legislature's name.
    expect(transmitToLaws(b.id, minister)).toMatchObject({ error: expect.stringMatching(/another institution/) });
    const sent = ok(transmitToLaws(b.id, clerk));
    const inst = getInstrument(sent.instrument)!;
    const v = inst.versions.find(x => x.id === sent.version)!;
    expect(inst).toMatchObject({ title: 'Public Records Bill', type: 'act', issuingAuthority: 'National Assembly' });
    expect(v).toMatchObject({ state: 'recorded', recordedBy: 'Clerk', dates: { adopted: '2026-10-20', published: '2026-10-25', inForce: '2027-01-01' }, publicationRef: 'Gazette Supplement 12' });
    expect(v.provisions).toEqual(SEC);
    expect(v.source).toMatchObject({ kind: 'legislature', bill: b.id, billVersion: 1, textDigest: b.texts[0]!.digest, assent: { outcome: 'assented' }, certification: { digest: certificationOf(getBill(b.id)!)!.digest } });
    expect((v.source as { votes: unknown[] }).votes).toHaveLength(2);
    expect(transmitToLaws(b.id, clerk)).toMatchObject({ error: expect.stringMatching(/Already in the laws register/) });
    // Confirmed by a different official, as every law is.
    expect(confirmVersion(sent.instrument, sent.version, 'Clerk', clerk.byId)).toMatchObject({ error: expect.stringMatching(/different/) });
    ok(confirmVersion(sent.instrument, sent.version, lawOfficial.by, lawOfficial.byId));
    expect(versionOn(sent.instrument, '2027-02-01')).toMatchObject({ id: sent.version });
    // Akoma Ntoso of the bill and of the act.
    const bill = getBill(b.id)!;
    expect(toAkomaNtoso({ id: '/eli/x/bill/2026/b1', title: bill.title, type: 'act' }, { language: 'en', dates: { inForce: '2026-10-01' }, provisions: bill.texts[0]!.provisions }, { doc: 'bill', lifecycle: [{ date: '2026-10-01', name: 'introduced' }] }))
      .toMatch(/<bill name="act">[\s\S]*<eventRef eId="evt_1" date="2026-10-01"[\s\S]*<\/bill>/);
  });

  it('a later change to the record makes the certification stale until the clerk certifies again', () => {
    const b = passedBill();
    ok(certifyBill(b.id, clerk));
    expect(certifyBill(b.id, clerk)).toMatchObject({ error: expect.stringMatching(/already certified/) });
    ok(recordAssent(b.id, { outcome: 'assented' }, president));
    expect(certificationOf(getBill(b.id)!)?.current).toBe(false);
  });

  it('a law typed in through the laws register is marked as entered, never as from the legislature', () => {
    const r = ok(recordVersion({ instrument: { title: 'Old Act', type: 'act', jurisdiction: 'X', year: 1990, number: '1', issuingAuthority: 'Parliament' }, dates: { inForce: '1990-01-01' }, provisions: SEC }, 'Registrar', 'local:r'));
    expect(r.version.source).toEqual({ kind: 'entered' });
  });
});

describe('what the public sees', () => {
  it('follows the chamber\'s setting: names or counts, never who on the staff recorded a step', () => {
    approveFromReference({ publicRecord: { bills: 'introduced', votes: 'counts' } });
    const b = ok(introduceBill({ title: 'A Bill', provisions: SEC, sponsor: 'Hon. A. Member' }, staff));
    ok(recordStage(b.id, { stage: 'second-reading' }, staff));
    ok(recordVote(b.id, { yes: 2, no: 1, division: true, names: [{ name: 'A', vote: 'yes' }, { name: 'B', vote: 'yes' }, { name: 'C', vote: 'no' }] }, clerk));
    const p = publicBill(b.id)!;
    expect(p.votes?.[0]).toMatchObject({ yes: 2, no: 1, result: 'carried' });
    expect(p.votes?.[0]).not.toHaveProperty('names');
    expect(JSON.stringify(p)).not.toMatch(/Table Office|Clerk|local:/);
    expect(p.sponsor).toBe('Hon. A. Member');
  });

  it('shows nothing until the stage the chamber publishes from', () => {
    approveFromReference({ publicRecord: { bills: 'passed', votes: 'none' } });
    const b = ok(introduceBill({ title: 'A Bill', provisions: SEC }, staff));
    expect(publicBill(b.id)).toBeNull();
    expect(readsFullRecord(wgAdmin.scope, getBill(b.id)!)).toBe(false);
    expect(readsFullRecord(president.scope, getBill(b.id)!)).toBe(false);
  });
});

describe('onboarding', () => {
  it('adds the legislative record track only when a legislature is named, and lists what waits for a second official', () => {
    const d = ok(draftProcedure({ fromReference: true, chambers: ['National Assembly'] }, staff));
    const st = onboardingStatus();
    const t = st.tracks.find(x => x.key === 'legislature')!;
    expect(t.checks.find(c => /procedure approved/.test(c.label))).toMatchObject({ done: false });
    expect(st.waiting.some(w => /Legislative procedure version 1/.test(w.what))).toBe(true);
    ok(approveProcedure(d.version, clerk));
    expect(onboardingStatus().tracks.find(x => x.key === 'legislature')!.checks.find(c => /procedure approved/.test(c.label))).toMatchObject({ done: true });
    setSovereign({ deployment: { authorities: {} } }, 'test');
    expect(onboardingStatus().tracks.some(x => x.key === 'legislature')).toBe(false);
  });
});
