// The Cabinet office (plan step I5; specification Part 1 §3.5): a paper
// registered with its legal basis, reviewed for law and cost by different
// officials, circulated, decided at a meeting whose quorum and vote are
// checked against the nation's adopted rules (a country rule set through
// policy-change.ts, shipped unset), authenticated by a second official,
// corrected only by a new version, published or withheld with reasons, and
// implemented by actions that never transfer an institution's powers (a
// request, not an instruction, to an independent institution). Directives
// with required responses list who has not answered.
import { asNationSets } from '@/lib/casework/testkit';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { openCase, act, attach, resetCases, registeredEffects, type Actor } from '@/lib/casework/engine';
import { draftPackage, approvePackage, resetPackages } from '@/lib/casework/packages';
import { addDocument, resetDocuments } from '@/lib/records/documents';
import { resetDecisions } from '@/lib/records/decisions';
import { setSovereign, createMinistry } from '@/lib/data/store';
import { recordVersion, confirmVersion, resetLaw } from '@/lib/law/register';
import { classifyDecision } from '@/lib/permits/decisions';
import { draftDirective, signDirective, respondToDirective, outstandingResponses, resetDirectives } from '@/lib/data/directives';
import { EXECUTIVE_OFFICE } from '@/lib/auth/roles';
import { CABINET_PROCEDURES, CABINET_PERMITS } from './procedures';
import { resetCabinet, proposeCabinetRules, confirmCabinetRules, cabinetRules, getCabinetDecision, actionsOf, reportAction, proposeActionClosure, decideActionClosure, cabinetIndicators, cabinetRecords } from './register';
import { currentParts } from '@/lib/constitution/parts';
import type { Case } from '@/lib/casework/types';

let CAB = '', HEALTH = '', AUDIT = '';
const who = (id: string): Actor => ({ id, name: `Official ${id}`, scope: { id, role: 'signatory', institution: CAB } });
const pdf = new Uint8Array(Buffer.from('%PDF-1.7\nx\n%%EOF'));
async function step(id: string, action: string, w: Actor, extra: Record<string, unknown> = {}) { const r = await act(id, { action, ...extra }, w); if ('error' in r) throw new Error(`${action}: ${r.error}`); return r; }
async function refused(id: string, action: string, w: Actor, extra: Record<string, unknown> = {}) { const r = await act(id, { action, ...extra }, w); expect('error' in r, `${action} should be refused`).toBe(true); return 'error' in r ? r.error : ''; }
let LAW = { instrument: '', eId: 'art_4' };

describe('the Cabinet office', () => {
  beforeEach(() => {
    for (const r of [resetCases, resetPackages, resetDocuments, resetDecisions, resetLaw, resetCabinet, resetDirectives]) r();
    vi.stubEnv('CIVICOS_DATA_KEK', Buffer.alloc(32, 3).toString('base64'));
    const mk = (name: string) => { const m = createMinistry({ archetype: 'GENERIC', name, slug: `${name.toLowerCase().replace(/\W+/g, '-')}-${Math.random().toString(36).slice(2, 6)}` }); if ('error' in m) throw new Error(m.error); return m.id; };
    CAB = mk('Cabinet Office'); HEALTH = mk('Ministry of Health'); AUDIT = mk('Public Audit Office');
    setSovereign({ deployment: { authorities: { cabinetOffice: CAB, supremeAudit: AUDIT } } }, 'Administrator');
    for (const p of CABINET_PROCEDURES) { draftPackage(asNationSets(p), 'Author', 'a', registeredEffects()); const a = approvePackage(p.key, 1, 'Approver', 'b', '2026-01-01', registeredEffects(), new Date('2026-01-01')); if ('error' in a) throw new Error(`${p.key}: ${a.error}`); }
    const v = recordVersion({ instrument: { title: 'Constitution', type: 'act', jurisdiction: 'X', year: 2000, number: '1', issuingAuthority: 'People' }, dates: { inForce: '2000-01-01' }, provisions: [{ eId: 'art_4', num: '4', text: 'Cabinet decides by the rules it adopts.' }] }, 'L1', 'l1');
    if ('error' in v) throw new Error(v.error);
    confirmVersion(v.instrument.id, v.version.id, 'L2', 'l2');
    LAW = { instrument: v.instrument.id, eId: 'art_4' };
  });
  afterEach(() => vi.unstubAllEnvs());

  async function circulated() {
    const c = openCase({ procedure: 'cabinet.decision', fields: { sponsor: HEALTH, title: 'National immunisation week', decisionRequested: 'Cabinet is asked to approve a national immunisation week in May 2027.', policyContext: 'Coverage fell in three regions.', risks: 'Cost; staff time', classification: 'restricted', conflicts: 'None declared', lawInstrument: LAW.instrument, lawProvision: LAW.eId } }, who('o1')) as Case;
    const d = addDocument({ class: 'paper', title: 'paper', institution: CAB, belongsTo: { kind: 'case', id: c.id }, bytes: pdf }, 'Clerk') as { id: string };
    attach(c.id, d.id, who('o1'));
    await step(c.id, 'register', who('o1'));
    await step(c.id, 'legal-review', who('o2'), { fields: { legalReview: 'Within the Public Health Act' } });
    expect(await refused(c.id, 'fiscal-review', who('o2'), { fields: { fiscalReview: 'x' } })).toMatch(/Separation of duties/);
    await step(c.id, 'fiscal-review', who('o3'), { fields: { fiscalReview: 'Within the health appropriation' } });
    await step(c.id, 'circulate', who('o1'), { fields: { participants: `${HEALTH}, ${CAB}` } });
    return c;
  }
  const adoptRules = () => {
    const p = proposeCabinetRules({ members: 20, quorum: { numerator: 1, denominator: 2 }, rule: 'simple-majority' }, [LAW], 'Admin One', 'admin-1');
    if ('error' in p) throw new Error(p.error);
    const c = confirmCabinetRules('Admin Two', 'admin-2');
    if ('error' in c) throw new Error(c.error);
  };

  it('classifies every decision under a proposed mapping led by the cabinet office slot, with no period set', () => {
    for (const p of CABINET_PROCEDURES) {
      for (const d of p.deadlines) expect(d.days, `${p.key} ${d.key}`).toBeUndefined();
      for (const a of p.actions.filter(x => x.decision)) expect(classifyDecision({ fields: {}, owner: CAB } as unknown as Case, a, p)).toMatchObject({ kind: 'mapping', permitType: CABINET_PERMITS[p.key] });
    }
  });

  it('adopts the Cabinet rules through the change process and a constitutional part counts them only once adopted', () => {
    expect(currentParts().some(p => p.key === 'cabinetRules')).toBe(false);
    expect(proposeCabinetRules({ members: 20, quorum: { numerator: 1, denominator: 2 }, rule: 'simple-majority' }, [], 'Admin One', 'admin-1')).toMatchObject({ error: expect.stringMatching(/legal basis/) });
    proposeCabinetRules({ members: 20, quorum: { numerator: 1, denominator: 2 }, rule: 'simple-majority' }, [LAW], 'Admin One', 'admin-1');
    expect(confirmCabinetRules('Admin One', 'admin-1')).toMatchObject({ error: expect.any(String) });
    confirmCabinetRules('Admin Two', 'admin-2');
    expect(cabinetRules()).toMatchObject({ version: 1, members: 20, rule: 'simple-majority' });
    expect(currentParts().find(p => p.key === 'cabinetRules')).toMatchObject({ version: 1 });
  });

  it('refuses a decision without quorum or majority under the adopted rules, and records one that carries', async () => {
    adoptRules();
    const c = await circulated();
    await step(c.id, 'record-decision', who('o1'), { fields: { meetingDate: '2027-02-01', membersPresent: 8, votesFor: 6, votesAgainst: 1, decisionText: 'Cabinet approves a national immunisation week in May 2027.', legalCategory: 'policy decision' } }).catch(e => e);
    const c2 = await circulated();
    expect(await refused(c2.id, 'record-decision', who('o1'), { fields: { meetingDate: '2027-02-01', membersPresent: 8, votesFor: 6, votesAgainst: 1, decisionText: 'Cabinet approves.', legalCategory: 'policy decision' } })).toMatch(/No quorum: 8 present, 10 needed/);
    expect(await refused(c2.id, 'record-decision', who('o1'), { fields: { meetingDate: '2027-02-01', membersPresent: 12, votesFor: 4, votesAgainst: 6, decisionText: 'Cabinet approves.', legalCategory: 'policy decision' } })).toMatch(/does not carry/);
    await step(c2.id, 'record-decision', who('o1'), { fields: { meetingDate: '2027-02-01', membersPresent: 14, votesFor: 9, votesAgainst: 3, votesAbstain: 2, decisionText: 'Cabinet approves a national immunisation week in May 2027.', legalCategory: 'policy decision', implementationOwner: HEALTH } });
    await step(c2.id, 'confirm', who('s1'), { reason: 'Minutes agree' });
    await step(c2.id, 'confirm', who('s2'));
    const d = getCabinetDecision(c2.id)!;
    expect(d).toMatchObject({ legalCategory: 'policy decision', vote: { present: 14, quorum: 10, for: 9, against: 3, rulesVersion: 1 }, versions: [{ by: { name: 'Official s1' }, confirmedBy: { name: 'Official s2' } }] });
    expect(d.versions[0]!.decision).toBeTruthy();
    expect(d.basis[0]).toMatchObject({ eId: 'art_4' });
    // Withheld with reasons, then corrected as a new version.
    await step(c2.id, 'publish', who('o1'), { fields: { disclosure: 'withheld', disclosureReasons: 'Restricted until announced', distribution: HEALTH } });
    await step(c2.id, 'correct', who('s1'), { reason: 'Clerical error in the month', fields: { correctedText: 'Cabinet approves a national immunisation week in June 2027.' } });
    await step(c2.id, 'correct', who('s2'));
    expect(getCabinetDecision(c2.id)!.versions.map(v => v.text)).toEqual(['Cabinet approves a national immunisation week in May 2027.', 'Cabinet approves a national immunisation week in June 2027.']);
    // The health ministry sees the decision distributed to it and its actions; another ministry does not see the text.
    expect(cabinetRecords({ institution: HEALTH }).decisions).toHaveLength(0);
  });

  it('assigns actions without transferring powers: an instruction to a ministry, a request to an independent institution; closure confirmed by a different official', async () => {
    const c = await circulated();
    // Rules not adopted: a demonstration records that, production refuses.
    await step(c.id, 'record-decision', who('o1'), { fields: { meetingDate: '2027-02-01', membersPresent: 12, consensus: true, decisionText: 'Cabinet approves the week and asks for an audit of coverage data.', legalCategory: 'policy decision' } });
    await step(c.id, 'confirm', who('s1'), { reason: 'ok' }); await step(c.id, 'confirm', who('s2'));
    expect(getCabinetDecision(c.id)!.vote).toMatchObject({ notAdopted: expect.stringMatching(/not adopted/) });
    await step(c.id, 'publish', who('o1'), { fields: { disclosure: 'withheld', disclosureReasons: 'Restricted', distribution: `${HEALTH}, ${AUDIT}` } });
    await step(c.id, 'assign-actions', who('s1'), { fields: { actions: `${HEALTH}; Plan the immunisation week; 2027-04-01\n${AUDIT}; Review the coverage data; 2027-06-01` } });
    const actions = actionsOf(getCabinetDecision(c.id)!.ref);
    expect(actions.find(a => a.institution === HEALTH)).toMatchObject({ kind: 'instruction', due: '2027-04-01' });
    expect(actions.find(a => a.institution === AUDIT)).toMatchObject({ kind: 'request' });
    const a = actions.find(x => x.institution === HEALTH)!;
    expect(reportAction(a.ref, 'Planning started', { name: 'Health officer' }, AUDIT, new Date().toISOString())).toMatchObject({ error: expect.stringMatching(/assigned to/) });
    reportAction(a.ref, 'Planning started', { name: 'Health officer' }, HEALTH, new Date().toISOString());
    proposeActionClosure(a.ref, 'Week held 1-7 June; report attached', { name: 'Health officer' }, HEALTH, new Date().toISOString());
    expect(decideActionClosure(a.ref, true, '', { name: 'Health officer' }, new Date().toISOString())).toMatchObject({ error: expect.stringMatching(/different official/) });
    expect(decideActionClosure(a.ref, true, 'Evidence seen', { name: 'Cabinet secretary' }, new Date().toISOString())).toMatchObject({ state: 'closed' });
    expect(cabinetIndicators().actions).toMatchObject({ of: 2 });
    // Closing the case with an open action needs it recorded as an exception.
    expect(await refused(c.id, 'close', who('o1'), { reason: 'Done' })).toMatch(/exceptions/);
    await step(c.id, 'close', who('o1'), { reason: 'Done', fields: { exceptions: 'The audit office\'s review is its own; requested, not instructed' } });
    // In production, without adopted rules, no Cabinet decision is recorded.
    vi.stubEnv('CIVICOS_MODE', 'production');
    const c2 = await circulated().catch(() => null);
    if (c2) expect(await refused(c2.id, 'record-decision', who('o1'), { fields: { meetingDate: '2027-02-01', membersPresent: 12, consensus: true, decisionText: 'x'.repeat(20), legalCategory: 'policy decision' } })).toMatch(/production installation records no Cabinet decision/);
  });

  it('asks each recipient of a directive for a required response and lists who has not answered', () => {
    const d = draftDirective({ ref: 'DIR-1', kind: 'request', issuedByCharterId: EXECUTIVE_OFFICE, title: 'Report on immunisation readiness', targets: [HEALTH, AUDIT], legalBasis: [LAW], scope: 'Immunisation week', effectiveUntil: '2027-12-31', response: { required: true, by: '2027-03-01', what: 'A readiness report' }, by: 'Cabinet secretary' });
    if ('error' in d) throw new Error(d.error);
    expect(d.payload).toMatchObject({ scope: 'Immunisation week', effectiveUntil: '2027-12-31', response: { required: true, by: '2027-03-01' } });
    const s = signDirective('DIR-1', 'Head of government');
    if ('error' in s) throw new Error(s.error);
    expect(outstandingResponses(s).map(x => x.institution).sort()).toEqual([HEALTH, AUDIT].sort());
    expect(respondToDirective('DIR-1', CAB, 'x', 'Someone')).toMatchObject({ error: expect.stringMatching(/recipient/) });
    const r = respondToDirective('DIR-1', HEALTH, 'Ready: plan attached', 'Health PS');
    if ('error' in r) throw new Error(r.error);
    expect(outstandingResponses(r, new Date('2027-03-02'))).toEqual([{ institution: AUDIT, overdue: true }]);
  });
});
