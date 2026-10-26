// Local and regional government (plan step I7; specification Part 3 §C.9;
// supplement Part 19). A local government is an institution of standing
// `subnational`: it adopts its own procedures, its council's rules are its
// own (two of its officials, citing the law), a resolution is certified only
// when the vote meets the quorum and the majority those rules set, a budget is
// adopted on a certified resolution, and a service request records its place
// from the map. The whole government neither acts on its cases nor reads them;
// the centre reads only under an approved relationship, logged, and never
// changes anything there (Boundaries.subnational).
import { asNationSets } from '@/lib/casework/testkit';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { NextRequest } from 'next/server';

let official: { id: string; sub: string; name: string; label: string; institution?: string; role: string; bounds?: unknown } | null = null;
vi.mock('@/lib/auth/official', async importOriginal => ({
  ...(await importOriginal<typeof import('@/lib/auth/official')>()),
  currentOfficial: async () => official,
  caseScope: async () => official,
  // The route's own rule, applied to the official of the test (the real one reads the signed session).
  refusal: async (rule: (s: unknown) => string | null) => { const why = official ? rule(official) : null; return why ? new Response(JSON.stringify({ error: why }), { status: 403 }) : null; },
  withOfficial: async <T,>(b: T) => (official ? { ...(b as object), by: official.name } : b),
}));

const { act, attach, openCase, resetCases, registeredEffects, getCase } = await import('@/lib/casework/engine');
const { approvePackage, resetPackages } = await import('@/lib/casework/packages');
const { addDocument, resetDocuments } = await import('@/lib/records/documents');
const { resetDecisions, getDecision } = await import('@/lib/records/decisions');
const { setSovereign, institutionBounds, createMinistry } = await import('@/lib/data/store');
const { db: storeDb } = await import('@/lib/data/store/state');
const { recordTermsDuringSetup } = await import('@/lib/data/store/institutions');
const { applyNation } = await import('@/lib/nation/registry');
const { recordVersion: recordLaw, confirmVersion: confirmLaw, resetLaw } = await import('@/lib/law/register');
const { proposeRelationship, confirmRelationship, resetRelationships } = await import('@/lib/data/store/relationships');
const { caseActRefusal, caseReadRefusal } = await import('@/lib/auth/roles');
const { classifyDecision } = await import('@/lib/permits/decisions');
const { listAccess, resetAccessLog } = await import('@/lib/records/access-log');
const { installLocalGovernmentProcedures, localKey, LOCAL_GOVERNMENT_TEMPLATES } = await import('./procedures');
const { resetLocalGov, proposeCouncilRules, confirmCouncilRules, councilRules, resolutionOfCase, budgetOfCase, requestOfCase, checkVote } = await import('./register');
const route = await import('@/app/api/local-government/route');
const caseRoute = await import('@/app/api/cases/[id]/route');
type Actor = import('@/lib/casework/engine').Actor;

let COUNTY = '', CENTRE = '';
const bounds = () => institutionBounds();
const at = (inst: () => string) => (id: string, role: 'officer' | 'signatory' | 'administrator' = 'officer'): Actor => ({ id, name: `Official ${id}`, scope: { id, role, institution: inst(), bounds: bounds() } });
const county = at(() => COUNTY), centre = at(() => CENTRE);
const wholeGov = (role: 'administrator' | 'signatory' | 'auditor'): Actor => ({ id: `wg-${role}`, name: `Government ${role}`, scope: { id: `wg-${role}`, role, bounds: bounds() } });
const doc = (caseId: string, cls: string, who: Actor) => { const d = addDocument({ class: cls, title: cls, institution: COUNTY, belongsTo: { kind: 'case', id: caseId }, bytes: new Uint8Array(Buffer.from('%PDF-1.7\nx\n%%EOF')) }, 'Clerk') as { id: string }; attach(caseId, d.id, who); };
async function step(id: string, action: string, who: Actor, extra: Record<string, unknown> = {}) { const r = await act(id, { action, ...extra }, who); if ('error' in r) throw new Error(`${action}: ${r.error}`); return r; }
const ok = <T,>(r: T): Exclude<T, { error: string }> => { if (r && typeof r === 'object' && 'error' in r) throw new Error((r as { error: string }).error); return r as Exclude<T, { error: string }>; };
const as = (a: Actor | null) => { official = a ? { id: a.id!, sub: a.id!, name: a.name, label: a.name, institution: a.scope!.institution, role: a.scope!.role!, bounds: bounds() } : null; };
let basis: { instrument: string; eId: string }[];
const VOTE = { meetingId: 'MTG-7', meetingDate: '2026-06-02', agendaItem: '4', resolutionText: 'That the market levy schedule be adopted' };

describe('local and regional government', () => {
  beforeEach(async () => {
    for (const r of [resetCases, resetPackages, resetDocuments, resetDecisions, resetLaw, resetRelationships, resetLocalGov, resetAccessLog]) r();
    vi.stubEnv('CIVICOS_DATA_KEK', Buffer.alloc(32, 7).toString('base64'));
    official = null;
    storeDb.setup = null;
    const mk = (name: string) => ok(createMinistry({ archetype: 'GENERIC', name, slug: `${name.toLowerCase().replace(/\W+/g, '-')}-${Math.random().toString(36).slice(2, 7)}` })).id;
    COUNTY = mk('Northern County Government'); CENTRE = mk('Ministry of Local Government');
    ok(recordTermsDuringSetup(COUNTY, { standing: 'subnational', branch: 'executive' }, 'Setup'));
    setSovereign({ regions: [] }, 'Setup');
    applyNation({ iso3: 'KEN', regions: [] });
    const law = ok(recordLaw({ instrument: { title: 'County Governments Act', type: 'act', jurisdiction: 'X', year: 2012, number: '17', issuingAuthority: 'Parliament' }, dates: { inForce: '2013-01-01' }, provisions: [{ eId: 'sec_14', num: '14', text: 'The quorum of a county assembly.' }] }, 'L1', 'l1'));
    confirmLaw(law.instrument.id, law.version.id, 'L2', 'l2');
    basis = [{ instrument: law.instrument.id, eId: 'sec_14' }];
    const r = ok(installLocalGovernmentProcedures(COUNTY, 'County clerk', 'local:clerk'));
    for (const key of r.drafted) ok(approvePackage(key, 1, 'County signatory', 'local:sig', '2026-01-01', registeredEffects(), new Date('2026-01-01')));
  }, 60_000);
  afterEach(() => { vi.unstubAllEnvs(); setSovereign({ deployment: { authorities: {} } }, 'test'); });

  /** The council's standing rules: 30 seats, a third for a quorum, a simple majority; two of its own officials. */
  const rules = () => { ok(proposeCouncilRules(COUNTY, { seats: 30, quorum: { kind: 'fraction', value: 1 / 3 }, majority: 'simple', legalBasis: basis }, 'Official c1', 'c1')); ok(confirmCouncilRules(COUNTY, 'Official c2', 'c2')); };

  it('is a local government\'s own: only a subnational institution adopts the templates; its decisions belong to it, not a ministry', () => {
    expect(bounds().subnational).toContain(COUNTY);
    expect(installLocalGovernmentProcedures(CENTRE, 'x')).toMatchObject({ error: expect.stringMatching(/not recorded as a regional or local government/) });
    for (const t of LOCAL_GOVERNMENT_TEMPLATES) {
      expect(t).toMatchObject({ owner: 'institution', reference: true });
      expect(t.deadlines).toEqual([]);
      for (const a of t.actions.filter(x => x.decision)) expect(classifyDecision({ fields: {} } as never, a, { key: localKey(t.key, COUNTY) } as never), `${t.key} ${a.key}`).toMatchObject({ kind: 'deployment' });
    }
  });

  it('checks a vote against the council\'s own rules in force: no rules, no certification; not quorate or not carried, never certified', async () => {
    const c = ok(openCase({ procedure: localKey('lg.resolution', COUNTY), fields: { ...VOTE, membersPresent: 9, votesFor: 8, votesAgainst: 1 } }, county('clerk')));
    doc(c.id, 'agenda', county('clerk'));
    expect(await act(c.id, { action: 'record' }, county('clerk'))).toMatchObject({ error: expect.stringMatching(/no standing rules in force/) });
    // The rules: proposed citing the law, confirmed by a different official; none ship.
    expect(proposeCouncilRules(COUNTY, { seats: 30, quorum: { kind: 'fraction', value: 1 / 3 }, majority: 'simple', legalBasis: [] }, 'Official c1')).toMatchObject({ error: expect.stringMatching(/Cite the legal basis/) });
    ok(proposeCouncilRules(COUNTY, { seats: 30, quorum: { kind: 'fraction', value: 1 / 3 }, majority: 'simple', legalBasis: basis }, 'Official c1', 'c1'));
    expect(confirmCouncilRules(COUNTY, 'Official c1', 'c1')).toHaveProperty('error');
    ok(confirmCouncilRules(COUNTY, 'Official c2', 'c2'));
    expect(councilRules(COUNTY)).toMatchObject({ seats: 30, version: 1, majority: 'simple' });
    // 9 of 30 present: below a third (10), so not quorate.
    expect(checkVote(councilRules(COUNTY)!, { present: 9, for: 8, against: 1, abstain: 0, recused: 0 })).toMatchObject({ quorate: false, required: 10, carried: false });
    await step(c.id, 'record', county('clerk'));
    doc(c.id, 'signed-minutes', county('clerk'));
    expect(await act(c.id, { action: 'certify', reason: 'Minutes signed' }, county('s1', 'signatory'))).toMatchObject({ pending: true });
    expect(await act(c.id, { action: 'certify' }, county('s2', 'signatory'))).toMatchObject({ error: expect.stringMatching(/Not quorate: 9 present, 10 required/) });
    // A vote cannot claim more votes than members present.
    expect(checkVote(councilRules(COUNTY)!, { present: 10, for: 9, against: 2, abstain: 0, recused: 0 })).toMatchObject({ error: expect.stringMatching(/More votes/) });
  }, 60_000);

  it('certifies a quorate, carried resolution by two officials with the rules version on the decision; adopts a budget only on it', async () => {
    rules();
    const c = ok(openCase({ procedure: localKey('lg.resolution', COUNTY), fields: { ...VOTE, membersPresent: 18, votesFor: 11, votesAgainst: 5, abstentions: 1, recusals: 1, conflictDeclarations: 'One member declared an interest in a market stall' } }, county('clerk')));
    doc(c.id, 'agenda', county('clerk'));
    await step(c.id, 'record', county('clerk'));
    doc(c.id, 'signed-minutes', county('clerk'));
    await step(c.id, 'certify', county('s1', 'signatory'), { reason: 'Quorate and carried' });
    const done = await step(c.id, 'certify', county('s2', 'signatory'));
    expect(getDecision(done.decision!.id)!.content).toMatchObject({ authority: { basis: 'deployment' }, facts: { quorate: true, carried: true, required: 10, present: 18 }, rules: [{ key: `lg.council-rules.${COUNTY}`, version: 1 }] });
    const res = resolutionOfCase(c.id)!;
    expect(res).toMatchObject({ council: COUNTY, vote: { present: 18, for: 11, against: 5 }, check: { quorate: true, carried: true }, rules: { version: 1 }, conflicts: ['One member declared an interest in a market stall'] });
    // The budget: lines in whole minor units, adopted on the certified resolution.
    const b = ok(openCase({ procedure: localKey('lg.budget', COUNTY), fields: { fiscalYear: '2026/27', budgetVersion: 'original', revenueLines: 'Market levies | 4500000\nTransfers | 12000000', expenditureLines: 'Health services | 9000000\nRoads | 6000000', capitalLines: 'Market shed | 1000000' } }, county('clerk')));
    await step(b.id, 'submit', county('clerk'));
    doc(b.id, 'budget-document', county('clerk'));
    expect(await act(b.id, { action: 'adopt', fields: { approvalResolution: 'RES-2026-999999' }, reason: 'x' }, county('s1', 'signatory'))).toMatchObject({ pending: true });
    expect(await act(b.id, { action: 'adopt' }, county('s2', 'signatory'))).toMatchObject({ error: expect.stringMatching(/certified resolution/) });
    const b2 = ok(openCase({ procedure: localKey('lg.budget', COUNTY), fields: { fiscalYear: '2026/27', budgetVersion: 'original', revenueLines: 'Market levies | 4500000', expenditureLines: 'Roads | 4000000', submittedTo: CENTRE } }, county('clerk')));
    await step(b2.id, 'submit', county('clerk'));
    doc(b2.id, 'budget-document', county('clerk'));
    await step(b2.id, 'adopt', county('s1', 'signatory'), { fields: { approvalResolution: res.number }, reason: 'Approved by the assembly' });
    await step(b2.id, 'adopt', county('s2', 'signatory'));
    expect(budgetOfCase(b2.id)).toMatchObject({ approvedBy: res.number, totals: { revenue: 4500000, expenditure: 4000000, balance: 500000 }, submittedTo: CENTRE });
  }, 60_000);

  it('records where a service request is from the map, never a typed region where a position is given', async () => {
    const c = ok(openCase({ procedure: localKey('lg.service', COUNTY), fields: { serviceCode: 'refuse-collection', longitude: 36.8170, latitude: -1.2860, description: 'Bins not collected for two weeks', urgency: 'routine' } }, county('clerk')));
    await step(c.id, 'triage', county('clerk'));
    expect(requestOfCase(c.id)).toMatchObject({ kind: 'service', state: 'open', place: { regionCode: 'KE-30', point: [36.817, -1.286] } });
    expect(JSON.stringify(requestOfCase(c.id))).not.toMatch(/Bins not collected/);
    const far = ok(openCase({ procedure: localKey('lg.complaint', COUNTY), fields: { serviceCode: 'markets', longitude: 2.35, latitude: 48.85, description: 'x' } }, county('clerk')));
    expect(await act(far.id, { action: 'triage' }, county('clerk'))).toMatchObject({ error: expect.stringMatching(/outside the nation/) });
    await step(c.id, 'resolve', county('clerk'), { fields: { resolution: 'Collected; route rescheduled' }, reason: 'Done' });
    expect(requestOfCase(c.id)).toMatchObject({ state: 'resolved', outcome: { reasons: 'Done' } });
  }, 60_000);

  it('keeps the whole government out: it neither acts on nor reads a local case; the centre reads only under an approved relationship, logged, and never changes anything', async () => {
    rules();
    const c = ok(openCase({ procedure: localKey('lg.resolution', COUNTY), fields: { ...VOTE, membersPresent: 20, votesFor: 15, votesAgainst: 3 } }, county('clerk')));
    doc(c.id, 'agenda', county('clerk'));
    await step(c.id, 'record', county('clerk'));
    const facts = { owner: COUNTY, sensitivity: 'normal' as const, assigned: [] as string[], recordType: localKey('lg.resolution', COUNTY) };
    for (const who of [wholeGov('administrator'), wholeGov('signatory'), wholeGov('auditor'), centre('m1', 'signatory'), centre('m2', 'administrator')]) {
      expect(caseActRefusal(who.scope!, { ...facts, decision: true, action: 'certify' }), who.name).toBeTruthy();
      expect(await act(c.id, { action: 'certify', reason: 'Central override' }, who), who.name).toHaveProperty('error');
    }
    expect(caseReadRefusal(wholeGov('administrator').scope!, facts, 'Oversight')).toBeTruthy();
    // The route: its own officials read; the centre is refused (logged) until an approved relationship covers the purpose.
    as(county('c1'));
    expect((await route.GET(new NextRequest(`http://localhost/api/local-government?institution=${COUNTY}`))).status).toBe(200);
    as(centre('m1', 'signatory'));
    const q = `http://localhost/api/local-government?institution=${COUNTY}&purpose=${encodeURIComponent('Statutory budget return')}`;
    expect((await route.GET(new NextRequest(q))).status).toBe(403);
    expect((await caseRoute.GET(new NextRequest(`http://localhost/api/cases/${c.id}`), { params: Promise.resolve({ id: c.id }) })).status).toBe(403);
    const { relationship } = ok(proposeRelationship({ from: CENTRE, to: COUNTY, type: 'request_information', scope: { recordTypes: ['local-records'], purposes: ['Statutory budget return'] }, legalBasis: basis }, { by: 'Admin A', byId: 'local:a' }));
    ok(confirmRelationship(relationship.id, { by: 'County signatory', byId: 'local:cs', role: 'signatory', institution: COUNTY }, () => false));
    as(centre('m1', 'signatory'));  // the session reads the relationships in force at each request
    expect((await route.GET(new NextRequest(q))).status).toBe(200);
    expect((await route.GET(new NextRequest(`http://localhost/api/local-government?institution=${COUNTY}&purpose=Curiosity`))).status).toBe(403);
    const log = listAccess({ register: 'local-government' });
    expect(log.map(e => e.result)).toEqual(['refused', 'allowed', 'refused']);
    expect(log[1]).toMatchObject({ purpose: 'Statutory budget return', rule: expect.stringMatching(/Relationship .* read only/) });
    // A read relationship never lets the centre change the council's rules or act on its cases.
    const changed = await route.POST(new NextRequest('http://localhost/api/local-government', { method: 'POST', body: JSON.stringify({ op: 'propose-rules', institution: COUNTY, seats: 5, quorum: { kind: 'count', value: 1 }, majority: 'simple', legalBasis: basis }) }));
    expect(changed.status).toBe(403);
    expect(await act(c.id, { action: 'certify', reason: 'x' }, centre('m1', 'signatory'))).toHaveProperty('error');
    expect(councilRules(COUNTY)).toMatchObject({ seats: 30, version: 1 });
    expect(getCase(c.id)!.stage).toBe('recorded');
  }, 60_000);
});
