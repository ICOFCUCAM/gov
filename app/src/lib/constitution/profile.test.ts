// The constitutional profile as a versioned, governed package (plan phase 5;
// guidance §7.4): lifecycle with distinct people, scheduled activation,
// superseding keeps history, a dispute freezes the parts it touches and keeps
// the status quo, consequential actions record the version in force (sealed
// decisions, access-log entries with the office acted under), old access-log
// entries still verify, and no installation ships an approved profile.
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { sha256Hex } from '@/lib/audit/sha256';
import { recordVersion as recordLaw, confirmVersion as confirmLaw, resetLaw } from '@/lib/law/register';
import { db } from '@/lib/data/store/state';
import { listMinistries, createMinistry } from '@/lib/data/store/ministries';
import { completeSetup, setSovereign, getSovereign, proposeAuthorities, confirmAuthorities, withdrawAuthorities, authorityFor,
  proposeClassification, confirmClassification, CLASSIFICATION_AFTER_SETUP } from '@/lib/data/store/sovereign';
import { recordAccess, verifyAccessLog, listAccess, resetAccessLog } from '@/lib/records/access-log';
import { accessBy } from '@/lib/records/access-by';
import { recordDecision, verifyDecision, resetDecisions } from '@/lib/records/decisions';
import { resetOffices, recordOfficeDuringSetup, proposeHolding, confirmHolding } from '@/lib/nation/office-register';
import { resetOfficials, createAccount } from '@/lib/auth/officials';
import {
  resetConstitutionProfile, draftProfile, submitProfile, reviewProfile, consultOnProfile, validateProfile, approveProfile, activateDue,
  disputeProfile, resolveDispute, withdrawProfile, refreshProfile, constitutionOverview, profileRef, profileInForce, proposeProcess, confirmProcess,
  waitingProfileSteps, LEGAL_PROCESS_NOTICE, type ConstitutionalProfile,
} from './profile';

const A = { by: 'Admin A', byId: 'local:a', role: 'administrator' as const };
const B = { by: 'Admin B', byId: 'local:b', role: 'administrator' as const };
const C = { by: 'Signer C', byId: 'local:c', role: 'signatory' as const };
const D = { by: 'Admin D', byId: 'local:d', role: 'administrator' as const };
const SETUP_TOKEN = 'test-setup-token-profile-0123456789';
process.env.CIVICOS_SETUP_TOKEN = SETUP_TOKEN;
let basis: { instrument: string; eId: string }[];

const ok = (r: { profile: ConstitutionalProfile } | { error: string }): ConstitutionalProfile => {
  if ('error' in r) throw new Error(r.error);
  return r.profile;
};
/** Draft → legal review → security validation → two approvals. */
function approveThrough(title: string, effectiveFrom: string, now = new Date()) {
  const p = ok(draftProfile({ title, effectiveFrom }, A, now));
  ok(submitProfile(p.id, { legalBasis: basis }, A, now));
  ok(reviewProfile(p.id, { outcome: 'cleared' }, B, now));
  ok(validateProfile(p.id, B, now));
  ok(approveProfile(p.id, { authorisedBy: 'Constitution (Amendment) Act, assent 1 Dec' }, B, now));
  return ok(approveProfile(p.id, { authorisedBy: 'Resolution of the Assembly no. 4' }, C, now));
}

beforeEach(() => {
  resetConstitutionProfile();
  resetAccessLog();
  resetDecisions();
  resetOffices();
  resetLaw();
  db.setup = null;
  db.authorityChanges = {};
  db.classificationChanges = {};
  setSovereign({ deployment: { authorities: {} } }, 'test');
  const law = recordLaw({ instrument: { title: 'Constitution', type: 'act', jurisdiction: 'X', year: 2020, number: '1', issuingAuthority: 'Assembly' }, dates: { inForce: '2020-01-01' }, provisions: [{ eId: 'art_1', num: '1', text: 'The constitution.' }] }, 'L1', 'l1');
  if ('error' in law) throw new Error(law.error);
  confirmLaw(law.instrument.id, law.version.id, 'L2', 'l2');
  basis = [{ instrument: law.instrument.id, eId: 'art_1' }];
});
afterEach(() => { db.setup = null; vi.unstubAllEnvs(); });

describe('the constitutional profile', () => {
  it('ships with no profile, approved or drafted, in every mode (production included); nothing is recorded as in force', () => {
    vi.stubEnv('CIVICOS_MODE', 'production');
    const o = constitutionOverview();
    expect(o.profiles).toEqual([]);
    expect(o.inForce).toBeNull();
    expect(profileRef()).toBeUndefined();
    expect(o.notice).toBe(LEGAL_PROCESS_NOTICE);
    expect(o.notice).toMatch(/does not replace it/);
    expect(o.live.parts.map(p => p.key)).toEqual(['classification', 'institutions', 'authorities', 'offices', 'relationships', 'dualControl', 'suspension', 'competences', 'transitionRules']);
  });

  it('is drafted only after setup by a whole-government administrator, and every step is by a different person from the drafter', () => {
    expect(draftProfile({ title: 'First' }, A)).toMatchObject({ error: expect.stringMatching(/Setup is still running/) });
    completeSetup('Admin A');
    expect(draftProfile({ title: 'First' }, C)).toMatchObject({ error: expect.stringMatching(/whole government/) });
    const p = ok(draftProfile({ title: 'First profile', constraints: 'Rollback: re-approve version 0' }, A));
    expect(p).toMatchObject({ version: 1, status: 'draft', touches: expect.arrayContaining(['authorities', 'classification']) });
    expect(p.digest).toHaveLength(64);
    expect(p.parts).toHaveLength(9);
    // Leaving the draft needs the law.
    expect(submitProfile(p.id, { legalBasis: [] }, A)).toMatchObject({ error: expect.stringMatching(/laws register/) });
    ok(submitProfile(p.id, { legalBasis: basis }, A));
    expect(reviewProfile(p.id, { outcome: 'cleared' }, A)).toMatchObject({ error: expect.stringMatching(/different person from the drafter/) });
    expect(reviewProfile(p.id, { outcome: 'returned' }, B)).toMatchObject({ error: expect.stringMatching(/why/) });
    ok(reviewProfile(p.id, { outcome: 'cleared', note: 'Consistent with art. 1' }, B));
    expect(validateProfile(p.id, A)).toMatchObject({ error: expect.stringMatching(/different person from the drafter/) });
    expect(validateProfile(p.id, C)).toMatchObject({ error: expect.stringMatching(/administrator/) });
    const v = validateProfile(p.id, D);
    expect(v).toMatchObject({ passed: true, profile: { status: 'approval' } });
    // Approval: names the authorising act; never the drafter; each approver a different person; two at least.
    expect(approveProfile(p.id, {}, B)).toMatchObject({ error: expect.stringMatching(/act that authorises/) });
    expect(approveProfile(p.id, { authorisedBy: 'Act 1' }, A)).toMatchObject({ error: expect.stringMatching(/different person from the drafter/) });
    expect(ok(approveProfile(p.id, { authorisedBy: 'Act 1' }, B)).status).toBe('approval');
    expect(approveProfile(p.id, { authorisedBy: 'Act 1' }, B)).toMatchObject({ error: expect.stringMatching(/different person/) });
    const done = ok(approveProfile(p.id, { authorisedBy: 'Act 1' }, C));
    // Effective today: scheduled, then activated with its recorded approvals.
    expect(done.status).toBe('active');
    expect(done.events.map(e => e.step)).toEqual(['drafted', 'submitted', 'legal-review', 'validated', 'approved', 'approved', 'activated']);
    expect(done.events.find(e => e.step === 'activated')).toMatchObject({ by: 'System (scheduled activation)', from: 'scheduled', to: 'active' });
    expect(done.approvals.map(a => a.by)).toEqual(['Admin B', 'Signer C']);
    expect(profileRef()).toEqual({ id: done.id, version: 1, digest: done.digest });
    // The audit chain carries each step.
    expect(db.audit.filter(e => e.action.startsWith('constitution.profile.')).map(e => e.action)).toEqual(expect.arrayContaining(['constitution.profile.drafted', 'constitution.profile.activated']));
  });

  it('adds the nation\'s steps and never removes the platform minimum; a consultation is answered by the consulted institution', () => {
    completeSetup('Admin A');
    const [m1] = listMinistries().filter(m => m.status === 'active');
    expect(proposeProcess({ approvals: 1, legalBasis: basis }, A)).toMatchObject({ error: expect.stringMatching(/from 2/) });
    expect(proposeProcess({ approvals: 3, consultation: 'required', legalBasis: basis }, A)).toHaveProperty('expiresAt');
    expect(confirmProcess(A)).toMatchObject({ error: expect.stringMatching(/different/) });
    expect(confirmProcess(B)).toHaveProperty('confirmed');
    const p = ok(draftProfile({ title: 'With consultation' }, A));
    expect(submitProfile(p.id, { legalBasis: basis }, A)).toMatchObject({ error: expect.stringMatching(/requires an institutional consultation/) });
    ok(submitProfile(p.id, { legalBasis: basis, consult: [m1!.id] }, A));
    expect(ok(reviewProfile(p.id, { outcome: 'cleared' }, B)).status).toBe('consultation');
    expect(waitingProfileSteps()[0]!.what).toMatch(/to respond/);
    expect(consultOnProfile(p.id, { response: 'agree' }, { ...C, institution: 'elsewhere' })).toMatchObject({ error: expect.stringMatching(/consulted institution/) });
    expect(consultOnProfile(p.id, { response: 'object' }, { ...C, institution: m1!.id })).toMatchObject({ error: expect.stringMatching(/objects to/) });
    expect(ok(consultOnProfile(p.id, { response: 'object', note: 'Art. 4 is not met' }, { ...C, institution: m1!.id })).status).toBe('security_validation');
    ok(validateProfile(p.id, B));
    ok(approveProfile(p.id, { authorisedBy: 'Act 1' }, B));
    expect(ok(approveProfile(p.id, { authorisedBy: 'Act 1' }, C)).status).toBe('approval'); // three needed
    expect(ok(approveProfile(p.id, { authorisedBy: 'Act 1' }, D)).status).toBe('active');
  });

  it('activates at its scheduled date, supersedes the one before and keeps every version', () => {
    completeSetup('Admin A');
    const now = new Date();
    const first = approveThrough('First', now.toISOString().slice(0, 10), now);
    expect(first.status).toBe('active');
    // A part changes through its own process: the screen shows it as changed since approval.
    const [m1] = listMinistries().filter(m => m.status === 'active');
    expect(proposeAuthorities({ authorities: { judiciary: m1!.id }, legalBasis: basis }, A)).toHaveProperty('expiresAt');
    expect(confirmAuthorities(B)).toHaveProperty('confirmed');
    expect(constitutionOverview().drift).toEqual(['authorities']);
    const second = approveThrough('Second', '2099-01-01', now);
    expect(second.touches).toEqual(['authorities']);
    expect(second.previous).toMatchObject({ id: first.id, version: 1 });
    expect(second.status).toBe('scheduled');
    // Not before its date: the first stays in force.
    expect(activateDue(now)).toEqual([]);
    expect(profileRef(now)?.id).toBe(first.id);
    // A profile due counts as in force even before the job writes it.
    const later = new Date('2099-01-02T00:00:00Z');
    expect(profileInForce(later)?.id).toBe(second.id);
    expect(activateDue(later)).toEqual([second.id]);
    const o = constitutionOverview(later);
    expect(o.inForce?.id).toBe(second.id);
    const old = o.profiles.find(p => p.id === first.id)!;
    expect(old).toMatchObject({ status: 'superseded', supersededBy: second.id });
    expect(old.events.at(-1)).toMatchObject({ step: 'superseded', to: 'superseded' });
    expect(o.profiles).toHaveLength(2);
  });

  it('refuses approval when the parts changed since the draft, until it is captured again', () => {
    completeSetup('Admin A');
    const p = ok(draftProfile({ title: 'Stale' }, A));
    ok(submitProfile(p.id, { legalBasis: basis }, A));
    ok(reviewProfile(p.id, { outcome: 'cleared' }, B));
    const [m1] = listMinistries().filter(m => m.status === 'active');
    proposeAuthorities({ authorities: { judiciary: m1!.id }, legalBasis: basis }, A);
    confirmAuthorities(B);
    const v = validateProfile(p.id, B);
    expect(v).toMatchObject({ passed: false, profile: { status: 'security_validation' } });
    const r = ok(refreshProfile(p.id, A));
    expect(r.status).toBe('draft');
    expect(r.legalReview).toBeUndefined();
  });

  it('a dispute freezes the parts it touches, keeps the status quo, and is resolved only by a recorded decision', () => {
    completeSetup('Admin A');
    const [m1, m2] = listMinistries().filter(m => m.status === 'active');
    // A change waiting in a part before the dispute.
    expect(proposeAuthorities({ authorities: { judiciary: m1!.id }, legalBasis: basis }, A)).toHaveProperty('expiresAt');
    const p = approveThrough('Contested', '2099-01-01');
    expect(p.status).toBe('scheduled');
    expect(disputeProfile(p.id, {}, C)).toMatchObject({ error: expect.stringMatching(/grounds/) });
    const d = ok(disputeProfile(p.id, { grounds: 'The amendment did not pass the required majority' }, C));
    expect(d.status).toBe('disputed');
    expect(constitutionOverview().frozen.map(f => f.part)).toEqual(expect.arrayContaining(['authorities', 'classification', 'relationships']));
    // Frozen: no confirmation, no new proposal; withdrawing the waiting one stays open.
    expect(confirmAuthorities(B)).toMatchObject({ error: expect.stringMatching(/frozen/) });
    expect(withdrawAuthorities('Admin A', 'Pending the dispute')).toEqual({ ok: true });
    expect(proposeAuthorities({ authorities: { judiciary: m2!.id }, legalBasis: basis }, A)).toMatchObject({ error: expect.stringMatching(/frozen/) });
    expect(proposeClassification({ classification: { stateForms: ['republic'], governmentForms: [], territorialArrangements: [], legalTraditions: [], authorityTypes: [] }, legalBasis: basis }, A)).toMatchObject({ error: expect.stringMatching(/frozen/) });
    expect(authorityFor('judiciary')).toBeUndefined();
    // The status quo: it does not activate at its date while disputed.
    expect(activateDue(new Date('2099-01-02T00:00:00Z'))).toEqual([]);
    expect(profileInForce(new Date('2099-01-02T00:00:00Z'))).toBeUndefined();
    expect(waitingProfileSteps()[0]!.what).toMatch(/recorded decision/);
    // Resolved by the recorded decision, by a different person, naming it.
    expect(resolveDispute(p.id, { outcome: 'upheld', reference: 'Const. Court 12/2026' }, C)).toMatchObject({ error: expect.stringMatching(/different person/) });
    expect(resolveDispute(p.id, { outcome: 'upheld' }, B)).toMatchObject({ error: expect.stringMatching(/Name the decision/) });
    const r = ok(resolveDispute(p.id, { outcome: 'upheld', reference: 'Constitutional Court, case 12/2026, 3 Nov' }, B));
    expect(r.status).toBe('scheduled');
    expect(r.disputes[0]!.resolution).toMatchObject({ outcome: 'upheld', by: 'Admin B' });
    expect(constitutionOverview().frozen).toEqual([]);
    expect(proposeAuthorities({ authorities: { judiciary: m2!.id }, legalBasis: basis }, A)).toHaveProperty('expiresAt');
  });

  it('an active profile under review stays in force; set aside, the one before is reinstated by that decision', () => {
    completeSetup('Admin A');
    const first = approveThrough('First', new Date().toISOString().slice(0, 10));
    const [m1] = listMinistries().filter(m => m.status === 'active');
    proposeAuthorities({ authorities: { judiciary: m1!.id }, legalBasis: basis }, A);
    confirmAuthorities(B);
    const second = approveThrough('Second', new Date().toISOString().slice(0, 10));
    expect(second.status).toBe('active');
    expect(ok(disputeProfile(second.id, { grounds: 'Ultra vires' }, C)).status).toBe('suspended_pending_review');
    expect(profileRef()?.id).toBe(second.id); // status quo
    expect(withdrawProfile(second.id, {}, A)).toMatchObject({ error: expect.stringMatching(/not withdrawn/) });
    const r = ok(resolveDispute(second.id, { outcome: 'set-aside', reference: 'Supreme Court 3/2026' }, B));
    expect(r.status).toBe('set_aside');
    expect(profileRef()?.id).toBe(first.id);
  });

  it('a disputed profile can be withdrawn, which lifts the freeze', () => {
    completeSetup('Admin A');
    const p = approveThrough('Withdrawn', '2099-01-01');
    ok(disputeProfile(p.id, { grounds: 'Contested' }, C));
    expect(withdrawProfile(p.id, {}, C)).toMatchObject({ error: expect.stringMatching(/drafter or an administrator/) });
    expect(ok(withdrawProfile(p.id, { reason: 'Re-drafted' }, A)).status).toBe('withdrawn');
    expect(constitutionOverview().frozen).toEqual([]);
  });
});

describe('the classification after setup (plan phase 5)', () => {
  it('changes only by proposal citing the law, confirmed by a different official; a constitution sent without it keeps it', () => {
    setSovereign({ constitution: { classification: { stateForms: ['republic'], governmentForms: ['presidential'], territorialArrangements: [], legalTraditions: [], authorityTypes: [] } } }, 'setup');
    completeSetup('Admin A');
    const before = getSovereign().constitution?.classification;
    expect(setSovereign({ constitution: { classification: { stateForms: ['monarchy'], governmentForms: [], territorialArrangements: [], legalTraditions: [], authorityTypes: [] } } }, 'Admin A')).toEqual({ error: CLASSIFICATION_AFTER_SETUP });
    // Resending the same, or a constitution without it, is not a change.
    expect('error' in setSovereign({ constitution: { chambers: [{ name: 'Assembly', seats: 100 }], classification: before } }, 'Admin A')).toBe(false);
    expect('error' in setSovereign({ constitution: { chambers: [{ name: 'Assembly', seats: 101 }] } }, 'Admin A')).toBe(false);
    expect(getSovereign().constitution?.classification).toEqual(before);
    const next = { stateForms: ['republic'], governmentForms: ['parliamentary'], territorialArrangements: ['unitary'], legalTraditions: ['common_law'], authorityTypes: [] };
    expect(proposeClassification({ classification: next, legalBasis: [] }, A)).toMatchObject({ error: expect.stringMatching(/laws register/) });
    expect(proposeClassification({ classification: next, legalBasis: basis }, A)).toHaveProperty('expiresAt');
    expect(confirmClassification(A)).toMatchObject({ error: expect.stringMatching(/different/) });
    expect(confirmClassification(B)).toHaveProperty('confirmed');
    expect(getSovereign().constitution?.classification).toMatchObject({ governmentForms: ['parliamentary'] });
    expect(getSovereign().constitution?.chambers).toEqual([{ name: 'Assembly', seats: 101 }]);
    setSovereign({ constitution: {} }, 'reset');
  });
});

describe('consequential actions record the profile version (§7) and the office acted under (§5.4)', () => {
  it('sealed decisions and access-log entries carry the profile version and digest', async () => {
    completeSetup('Admin A');
    const e0 = recordAccess({ by: { id: 'local:x', name: 'X' }, record: { register: 'cases', id: 'C-0' }, action: 'view', result: 'allowed' });
    expect(e0).toMatchObject({ v: 2 });
    expect(e0.profile).toBeUndefined(); // none approved yet
    const p = approveThrough('First', new Date().toISOString().slice(0, 10));
    const e1 = recordAccess({ by: { id: 'local:x', name: 'X' }, office: { id: 'OFF-1', title: 'Registrar' }, record: { register: 'cases', id: 'C-1' }, action: 'view', result: 'allowed' });
    expect(e1).toMatchObject({ v: 2, office: { id: 'OFF-1', title: 'Registrar' }, profile: { id: p.id, version: 1, digest: p.digest } });
    expect(verifyAccessLog()).toEqual({ ok: true, entries: 2 });
    // The office and profile are inside the hash.
    (globalThis as unknown as { __civicosAccessLog: { entries: { office?: { title: string } }[] } }).__civicosAccessLog.entries[1]!.office!.title = 'Minister';
    expect(verifyAccessLog()).toMatchObject({ ok: false, brokenAt: 2 });
    const d = await recordDecision({
      subject: { kind: 'case', id: 'c1', ref: 'CIV-1' }, institution: { id: 'civil', name: 'Civil Registry' }, decision: 'register', reasons: 'Evidence verified.',
      citations: [], officials: [{ role: 'decided', name: 'B', id: 'local:b' }], at: new Date().toISOString(),
    });
    if ('error' in d) throw new Error(d.error);
    expect(d.content.profile).toEqual({ id: p.id, version: 1, digest: p.digest });
    expect(verifyDecision(d)).toEqual({ ok: true });
    expect(verifyDecision({ ...d, content: { ...d.content, profile: { ...d.content.profile!, version: 9 } } })).toMatchObject({ ok: false });
  });

  it('entries written before the new format still verify, chained with new ones', () => {
    const store = (globalThis as unknown as { __civicosAccessLog?: { entries: Record<string, unknown>[]; base: { hash: string; removed: number } } });
    recordAccess({ by: { name: 'warm' }, record: { register: 'x' }, action: 'view', result: 'allowed' });
    resetAccessLog();
    const GENESIS = '0'.repeat(64);
    // An entry exactly as the first format wrote it (fixed field list, no `v`).
    const old = { id: 'old-1', seq: 1, at: '2026-01-01T10:00:00.000Z', by: { id: 'local:a', name: 'A' }, record: { register: 'cases', id: 'C-9' }, action: 'view', result: 'allowed', rule: 'own institution', prev: GENESIS };
    const hash = sha256Hex(JSON.stringify([old.id, old.seq, old.at, old.by, old.record, old.action, null, old.result, old.rule, null, old.prev]));
    recordAccess({ by: { name: 'init' }, record: { register: 'x' }, action: 'view', result: 'allowed' });
    store.__civicosAccessLog!.entries = [{ ...old, hash }];
    const e = recordAccess({ by: { id: 'local:b', name: 'B' }, record: { register: 'cases', id: 'C-10' }, action: 'view', result: 'allowed' });
    expect(e.prev).toBe(hash);
    expect(e.seq).toBe(2);
    expect(verifyAccessLog()).toEqual({ ok: true, entries: 2 });
    expect(listAccess().map(x => x.v ?? 1)).toEqual([2, 1]);
    // An old entry is still checked: changing it shows.
    store.__civicosAccessLog!.entries[0]!.rule = 'changed';
    expect(verifyAccessLog()).toMatchObject({ ok: false, brokenAt: 1 });
  });

  it('names the office an official holds in their institution', async () => {
    resetOfficials();
    await createAccount({ email: 'first@gov.test', name: 'First Admin', office: 'Administrator', password: 'correct horse battery', setupToken: SETUP_TOKEN }, null);
    const m = createMinistry({ archetype: 'GENERIC', name: 'Civil Registry', slug: `civil-${Math.random().toString(36).slice(2, 7)}` });
    if ('error' in m) throw new Error(m.error);
    const office = recordOfficeDuringSetup({ title: 'Registrar-General', kind: 'agency-director', institution: m.id, effectiveFrom: '2020-01-01' }, A);
    if ('error' in office) throw new Error(office.error);
    const holder = await createAccount({ email: 'reg@gov.test', name: 'R. Registrar', office: 'Registrar', password: 'correct horse battery', role: 'signatory', institution: m.id }, 'Admin A');
    if ('error' in holder) throw new Error(holder.error);
    completeSetup('Admin A');
    const h = proposeHolding({ officeId: office.id, accountId: holder.id }, A);
    if ('error' in h) throw new Error(h.error);
    confirmHolding(h.id, B);
    const who = accessBy({ id: `local:${holder.id}`, label: 'R. Registrar, Registrar', institution: m.id });
    expect(who).toEqual({ by: { id: `local:${holder.id}`, name: 'R. Registrar, Registrar', institution: m.id }, office: { id: office.id, title: 'Registrar-General' } });
    expect(accessBy({ id: 'local:nobody', label: 'N' })).toEqual({ by: { id: 'local:nobody', name: 'N' } });
    const e = recordAccess({ ...who, record: { register: 'civil', id: 'E-1' }, action: 'view', result: 'allowed' });
    expect(e.office).toEqual({ id: office.id, title: 'Registrar-General' });
  });
});
