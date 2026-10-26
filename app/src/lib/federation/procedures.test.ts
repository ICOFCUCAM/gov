// Cross-institution workflow (plan I9; catalogue Part 12 §2.2, GOV-WF-002 …
// 006, 009 … 015): requests, consultations, handovers, tasks, decision
// requests, dependencies, disputes, agreements, onboarding, access and
// exceptions are cases of the receiving institution's own procedures; none
// becomes a binding order. The nature is recorded when a case is taken in: an
// instruction only under an approved `instruct` relationship from the
// requester (directiveTargetRefusal()), otherwise a request it may decline.
// An accepted handover changes no one's responsibility; an agreement grants
// no power. Mechanism tests: institutions and relationships are illustrative.
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import '@/lib/casework/modules';
import { openCase, act, attach, refer, resetCases, registeredEffects, getCase, type Actor } from '@/lib/casework/engine';
import { approvePackage, resetPackages, listPackages } from '@/lib/casework/packages';
import { resetDecisions, getDecision } from '@/lib/records/decisions';
import { addDocument, resetDocuments } from '@/lib/records/documents';
import { recordVersion as recordLaw, confirmVersion as confirmLaw, resetLaw } from '@/lib/law/register';
import { createMinistry, setSovereign, authorityFor } from '@/lib/data/store';
import { proposeRelationship, confirmRelationship, resetRelationships } from '@/lib/data/store/relationships';
import { CROSS_INSTITUTION_PROCEDURES, installCrossInstitutionProcedures, crossKey, natureOfCase, adoptionOf, resetCrossInstitution } from './procedures';

const ok = <T,>(r: T | { error: string }): T => { if (r && typeof r === 'object' && 'error' in r) throw new Error((r as { error: string }).error); return r as T; };
const mk = (name: string) => ok(createMinistry({ archetype: 'GENERIC', name, slug: `${name.toLowerCase().replace(/\W+/g, '-')}-${Math.random().toString(36).slice(2, 7)}` })).id;
const at = (inst: string) => (id: string, role: 'officer' | 'signatory' = 'officer'): Actor => ({ id, name: `Official ${id}`, scope: { id, role, institution: inst } });
async function step(id: string, action: string, who: Actor, extra: Record<string, unknown> = {}) { const r = await act(id, { action, ...extra }, who); if ('error' in r) throw new Error(`${action}: ${r.error}`); return r; }
let health: string, water: string, basis: { instrument: string; eId: string }[];
const pdf = new Uint8Array(Buffer.from('%PDF-1.7\nx\n%%EOF'));
const doc = (caseId: string, cls: string, inst: string) => { const d = addDocument({ class: cls, title: cls, institution: inst, belongsTo: { kind: 'case', id: caseId }, bytes: pdf }, 'Clerk') as { id: string }; ok(attach(caseId, d.id, at(inst)('w1'))); };

function adopt(inst: string) {
  const r = ok(installCrossInstitutionProcedures(inst, 'Author', 'author'));
  for (const k of r.drafted) ok(approvePackage(k, 1, 'Approver', 'approver', '2026-01-01', registeredEffects(), new Date('2026-01-01')));
  return r;
}

beforeEach(() => {
  for (const r of [resetCases, resetPackages, resetDecisions, resetDocuments, resetLaw, resetRelationships, resetCrossInstitution]) r();
  const law = ok(recordLaw({ instrument: { title: 'Public Administration Act', type: 'act', jurisdiction: 'x', year: 2018, number: '5', issuingAuthority: 'Parliament' }, dates: { inForce: '2018-01-01' }, provisions: [{ eId: 'sec_12', num: '12', text: 'Institutions cooperate.' }] }, 'L1', 'l1'));
  confirmLaw(law.instrument.id, law.version.id, 'L2', 'l2');
  basis = [{ instrument: law.instrument.id, eId: 'sec_12' }];
  health = mk('Health Ministry'); water = mk('Water Authority');
});
afterEach(() => setSovereign({ deployment: { authorities: {} } }, 'test'));

describe('cross-institution workflow', () => {
  it('ships as templates each institution adopts as its own drafts, a second official approving; none ships approved', () => {
    expect(listPackages({}).filter(p => p.key.startsWith('xi.'))).toEqual([]);
    const r = ok(installCrossInstitutionProcedures(water, 'Author', 'author'));
    expect(r.drafted).toHaveLength(CROSS_INSTITUTION_PROCEDURES.length);
    expect(adoptionOf(water).every(a => a.state === 'draft')).toBe(true);
    expect(listPackages({ key: crossKey('xi.task', water) })[0]).toMatchObject({ owner: water, state: 'draft' });
    expect(CROSS_INSTITUTION_PROCEDURES.flatMap(t => t.deadlines.map(d => d.days)).filter(d => d !== undefined)).toEqual([]);
  });

  it('a task asked by another institution is a request it may decline; an instruction only under an approved instruct relationship', async () => {
    adopt(water); adopt(health);
    // The requester opens it from one of its own cases (a referral, linked both ways).
    const own = ok(openCase({ procedure: crossKey('xi.consultation', health), fields: { fromInstitution: water, scope: 'x', questions: 'x' } }, at(health)('h-clerk')));
    const { to } = ok(refer(own.id, { procedure: crossKey('xi.task', water), fields: { fromInstitution: health, scope: 'Inspect the borehole at the clinic', purpose: 'Facility licensing' }, reason: 'Water quality check needed' }, at(health)('h-clerk')));
    expect(to.owner).toBe(water);
    expect(to.links).toEqual([{ kind: 'referred-from', case: own.id }]);
    await step(to.id, 'accept', at(water)('w1'), { fields: { taskOwner: 'Water quality unit' } });
    expect(natureOfCase(to.id)).toMatchObject({ nature: 'request', from: health, to: water, why: expect.stringMatching(/A request, not binding/) });
    // It may be declined with reasons.
    await step(to.id, 'decline', at(water)('w-s', 'signatory'), { reason: 'No capacity this quarter' });
    expect(getCase(to.id)!.stage).toBe('declined');

    // Under an approved instruct relationship from Health to Water covering instructions, it is recorded as an instruction.
    const { relationship } = ok(proposeRelationship({ from: health, to: water, type: 'instruct', scope: { recordTypes: ['instruction'] }, legalBasis: basis }, { by: 'Admin A', byId: 'a' }));
    ok(confirmRelationship(relationship.id, { by: 'Admin B', byId: 'b', role: 'administrator' }, () => false));
    const t2 = ok(openCase({ procedure: crossKey('xi.task', water), fields: { fromInstitution: health, scope: 'x', taskOwner: 'Unit' } }, at(water)('w1')));
    await step(t2.id, 'accept', at(water)('w1'));
    expect(natureOfCase(t2.id)).toMatchObject({ nature: 'instruction', why: expect.stringContaining(relationship.id) });
    // A request from the institution itself is refused.
    const self = ok(openCase({ procedure: crossKey('xi.task', water), fields: { fromInstitution: water, scope: 'x', taskOwner: 'x' } }, at(water)('w1')));
    expect(await act(self.id, { action: 'accept' }, at(water)('w1'))).toMatchObject({ error: expect.stringMatching(/comes from another institution/) });
  });

  it('an accepted handover is a sealed decision of two officials that changes no one\'s responsibility', async () => {
    adopt(water);
    setSovereign({ deployment: { authorities: { publicHealth: health } } }, 'Administrator');
    const c = ok(openCase({ procedure: crossKey('xi.handover', water), fields: { fromInstitution: health, serviceConcerned: 'Drinking-water testing', obligations: '12 open cases' } }, at(water)('w1')));
    expect(await act(c.id, { action: 'assess' }, at(water)('w1'))).toMatchObject({ error: expect.stringMatching(/handover plan/i) });
    doc(c.id, 'handover-plan', water);
    await step(c.id, 'assess', at(water)('w1'));
    expect(await step(c.id, 'accept', at(water)('s1', 'signatory'), { reason: 'Capacity in place', fields: { effectiveFrom: '2030-01-01' } })).toMatchObject({ pending: true });
    const done = await step(c.id, 'accept', at(water)('s2', 'signatory'));
    expect(getDecision(done.decision!.id)!.content).toMatchObject({ decision: 'accept-handover', authority: { basis: 'deployment' }, facts: { responsibility: expect.stringMatching(/only through Who is responsible/) } });
    // Who is responsible for public health is unchanged: that changes only through its own change process.
    expect(authorityFor('publicHealth')).toBe(health);
  });

  it('an agreement is registered by two officials and grants no power; an exception needs a future expiry; a dispute goes to a third body', async () => {
    adopt(water);
    const dep = ok(openCase({ procedure: crossKey('xi.dependency', water), fields: { fromInstitution: health, serviceConcerned: 'Facility licensing', dependsOn: 'Water quality certificates', responsibleParties: 'Licensing office; Water quality unit', fallback: 'Licensing holds the case' } }, at(water)('w1')));
    expect(await step(dep.id, 'confirm', at(water)('s1', 'signatory'), { reason: 'Agreed dependency' })).toMatchObject({ pending: true });
    const confirmed = await step(dep.id, 'confirm', at(water)('s2', 'signatory'));
    expect(getDecision(confirmed.decision!.id)!.content).toMatchObject({ decision: 'record-dependency', authority: { basis: 'deployment' }, facts: { from: health, service: 'Facility licensing' } });

    const ag = ok(openCase({ procedure: crossKey('xi.agreement', water), fields: { fromInstitution: health, scope: 'Testing of clinic water supplies', signatories: 'Permanent secretaries', validFrom: '2030-01-01' } }, at(water)('w1')));
    doc(ag.id, 'signed-agreement', water);
    await step(ag.id, 'register', at(water)('s1', 'signatory'), { reason: 'Signed by both' });
    const reg = await step(ag.id, 'register', at(water)('s2', 'signatory'));
    expect(getDecision(reg.decision!.id)!.content.facts).toMatchObject({ grantsPower: expect.stringMatching(/^no: .*relationship register/) });
    // Registering an agreement creates no relationship: an exchange still needs one.
    const { relationshipGrants } = await import('@/lib/data/store/relationships');
    expect(relationshipGrants()).toEqual([]);

    const ex = ok(openCase({ procedure: crossKey('xi.exception', water), fields: { fromInstitution: health, stepConcerned: 'Response time', justification: 'Flood season', expiresOn: '2020-01-01' } }, at(water)('w1')));
    await step(ex.id, 'grant', at(water)('s1', 'signatory'), { reason: 'Seasonal' });
    expect(await act(ex.id, { action: 'grant' }, at(water)('s2', 'signatory'))).toMatchObject({ error: expect.stringMatching(/expiry date is in the future/) });

    const third = mk('Public Service Commission');
    const d = ok(openCase({ procedure: crossKey('xi.dispute', water), fields: { fromInstitution: health, issue: 'Who tests clinic boreholes', resolvingBody: water } }, at(water)('w1')));
    doc(d.id, 'dispute-file', water);
    expect(await act(d.id, { action: 'refer', reason: 'Unresolved' }, at(water)('s1', 'signatory'))).toMatchObject({ error: expect.stringMatching(/neither party/) });
    await step(d.id, 'refer', at(water)('s1', 'signatory'), { reason: 'Unresolved', fields: { resolvingBody: third } });
    expect(getCase(d.id)!.stage).toBe('referred');
  });
});
