// Planning and building control, and housing (plan step I7; specification
// Part 3 §D.13; supplement Part 20). A planning application and a building
// permit on a registered parcel, decided against the nation's adopted rules
// (their version on every decision), with the permit, construction and
// occupancy kept as distinct states (acceptance P3-11); inspections as
// findings with reasons; stop-work orders and their lifting; a changed
// design decided again. Housing: eligibility and priority only from a
// programme's approved terms, a home allocated by an official with reasons.
import { asNationSets } from '@/lib/casework/testkit';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

const { act, attach, openCase, resetCases, registeredEffects } = await import('@/lib/casework/engine');
const { draftPackage, approvePackage, resetPackages } = await import('@/lib/casework/packages');
const { addDocument, resetDocuments } = await import('@/lib/records/documents');
const { resetDecisions, getDecision } = await import('@/lib/records/decisions');
const { setSovereign, listMinistries, institutionBounds } = await import('@/lib/data/store');
const { resetPermitAuthorities, installProposedDefaults, listMappings } = await import('@/lib/permits/authority');
const { classifyDecision } = await import('@/lib/permits/decisions');
const { applyNation } = await import('@/lib/nation/registry');
const { recordVersion: recordLaw, confirmVersion: confirmLaw, resetLaw } = await import('@/lib/law/register');
const { resetParcels, recordParcel, actOnParcel, proposeParcelPolicyChange, decideParcelPolicyChange } = await import('@/lib/data/parcels');
const { BUILDING_PROCEDURES, BUILDING_DECISION_PERMITS } = await import('./procedures');
const { resetBuilding, proposeBuildingRules, confirmBuildingRules, buildingRules, permitOfCase, planningOfCase, inspectionsOf, stopOrdersOf } = await import('./register');
const { HOUSING_PROCEDURES, HOUSING_PERMITS } = await import('@/lib/housing/procedures');
const { resetHousing, listProgrammes, applicationOfCase, waitingList, housingCounts } = await import('@/lib/housing/register');
type Actor = import('@/lib/casework/engine').Actor;

let BC = '', HOU = '', OTHER = '';
const bounds = () => institutionBounds();
const at = (inst: () => string) => (id: string, role: 'officer' | 'signatory' = 'officer'): Actor => ({ id, name: `Official ${id}`, scope: { id, role, institution: inst(), bounds: bounds() } });
const bc = at(() => BC), hou = at(() => HOU);
let n = 0;
const doc = (caseId: string, cls: string, who: Actor) => { const d = addDocument({ class: cls, title: cls, institution: who.scope!.institution!, belongsTo: { kind: 'case', id: caseId }, bytes: new Uint8Array(Buffer.from(`%PDF-1.7\n${cls} ${++n}\n%%EOF`)) }, 'Clerk') as { id: string }; attach(caseId, d.id, who); return d.id; };
async function step(id: string, action: string, who: Actor, extra: Record<string, unknown> = {}) { const r = await act(id, { action, ...extra }, who); if ('error' in r) throw new Error(`${action}: ${r.error}`); return r; }
/** Two officials take a decision step: the first proposes, a different one confirms. */
async function two(id: string, action: string, who: [Actor, Actor], extra: Record<string, unknown> = {}) { const p = await act(id, { action, ...extra }, who[0]); if ('error' in p) throw new Error(`${action}: ${p.error}`); return step(id, action, who[1]); }
const ok = <T,>(r: T): Exclude<T, { error: string }> => { if (r && typeof r === 'object' && 'error' in r) throw new Error((r as { error: string }).error); return r as Exclude<T, { error: string }>; };
const square = (lng: number, lat: number, d = 0.0009) => ({ type: 'Polygon', coordinates: [[[lng, lat], [lng + d, lat], [lng + d, lat + d], [lng, lat + d], [lng, lat]]] });
let basis: { instrument: string; eId: string }[];
let parcel = '';
const RULES = { categories: ['Class A dwelling', 'Class B commercial'], uses: ['residential', 'commercial'], checklists: [{ stage: 'foundation', items: ['footings', 'damp-proofing'] }, { stage: 'final', items: ['fire exits', 'electrical', 'drainage'] }], severities: ['minor', 'major', 'critical'] };
const signers = (): [Actor, Actor] => [bc('s1', 'signatory'), bc('s2', 'signatory')];

describe('planning and building control on the parcel register', () => {
  beforeEach(async () => {
    for (const r of [resetCases, resetPackages, resetDocuments, resetDecisions, resetPermitAuthorities, resetParcels, resetBuilding, resetHousing, resetLaw]) r();
    vi.stubEnv('CIVICOS_DATA_KEK', Buffer.alloc(32, 7).toString('base64'));
    [BC, HOU, OTHER] = listMinistries().slice(0, 3).map(m => m.id) as [string, string, string];
    setSovereign({ deployment: { authorities: { buildingControl: BC, housing: HOU } } }, 'Administrator');
    applyNation({ iso3: 'KEN', regions: [] });
    for (const p of [...BUILDING_PROCEDURES, ...HOUSING_PROCEDURES]) {
      ok(draftPackage(asNationSets(p), 'Author', 'author', registeredEffects()));
      ok(approvePackage(p.key, 1, 'Approver', 'approver', '2026-01-01', registeredEffects(), new Date('2026-01-01')));
    }
    const law = ok(recordLaw({ instrument: { title: 'Building Control Act', type: 'act', jurisdiction: 'X', year: 2020, number: '3', issuingAuthority: 'Parliament' }, dates: { inForce: '2020-01-01' }, provisions: [{ eId: 'sec_12', num: '12', text: 'Building work shall conform to the approved plans.' }] }, 'L1', 'l1'));
    confirmLaw(law.instrument.id, law.version.id, 'L2', 'l2');
    basis = [{ instrument: law.instrument.id, eId: 'sec_12' }];
    const c = ok(proposeParcelPolicyChange({ patch: { authorityId: OTHER }, reason: 'The survey office keeps the cadastre' }, 'Admin 1'));
    ok(decideParcelPolicyChange(c.id, 'confirm', 'Admin 2'));
    const r = ok(await recordParcel({ parcelId: 'NRB/BLD/1', geometry: square(36.8170, -1.2860), landUse: 'residential' }, 'Clerk A'));
    ok(await actOnParcel(r.parcel.id, { action: 'publish' }, 'Registrar B'));
    parcel = r.parcel.id;
  }, 60_000);
  afterEach(() => { vi.unstubAllEnvs(); setSovereign({ deployment: { authorities: {} } }, 'test'); });

  /** The nation's building control rules, adopted by two officials citing the law. */
  const adopt = () => { ok(proposeBuildingRules({ ...RULES, legalBasis: basis }, 'Official s1', 'local:s1')); ok(confirmBuildingRules('Official s2', 'local:s2')); };

  it('ships drafts only, no day count; each decision classified under a proposed, unapproved mapping of its own kind', () => {
    for (const p of [...BUILDING_PROCEDURES, ...HOUSING_PROCEDURES]) {
      expect(p).toMatchObject({ reference: true });
      expect(p.deadlines.every(d => d.days === undefined), p.key).toBe(true);
      for (const a of p.actions.filter(x => x.decision)) expect(classifyDecision({ fields: {} } as never, a, p as never), `${p.key} ${a.key}`).toMatchObject({ kind: 'mapping' });
    }
    const kinds = (key: string) => BUILDING_PROCEDURES.concat(HOUSING_PROCEDURES).find(p => p.key === key)!.actions.filter(a => a.decision).map(a => [a.key, (classifyDecision({ fields: {} } as never, a, { key } as never) as { permitType: string }).permitType]);
    expect(Object.fromEntries(kinds('building.permit'))).toMatchObject({ grant: 'building-permit', 'stop-work': 'building-enforcement', 'lift-stop': 'building-enforcement', 'certify-occupancy': 'occupancy-certificate', 'refuse-occupancy': 'occupancy-certificate', 'approve-variation': 'building-permit' });
    expect(Object.fromEntries(kinds('building.planning'))).toMatchObject({ grant: 'planning-permission', refuse: 'planning-permission' });
    installProposedDefaults('Installer');
    for (const t of new Set([...Object.values(BUILDING_DECISION_PERMITS), ...Object.values(HOUSING_PERMITS)])) expect(listMappings(t)[0], t).toMatchObject({ state: 'draft', proposal: true });
  });

  it('decides nothing before the nation adopts its rules (two officials, citing the law), and only on a published parcel', async () => {
    const c = ok(openCase({ procedure: 'building.planning', fields: { parcel, proposedUse: 'residential', description: 'Four flats' } }, bc('clerk')));
    doc(c.id, 'site-plan', bc('clerk'));
    expect(await act(c.id, { action: 'validate' }, bc('clerk'))).toMatchObject({ error: expect.stringMatching(/not adopted its building control rules/) });
    expect(proposeBuildingRules({ ...RULES, legalBasis: [] }, 'Official s1')).toMatchObject({ error: expect.stringMatching(/Cite the legal basis/) });
    ok(proposeBuildingRules({ ...RULES, legalBasis: basis }, 'Official s1', 'local:s1'));
    expect(confirmBuildingRules('Official s1', 'local:s1')).toHaveProperty('error');
    ok(confirmBuildingRules('Official s2', 'local:s2'));
    expect(buildingRules()).toMatchObject({ version: 1, digest: expect.stringMatching(/^[0-9a-f]{64}$/) });
    // A use outside the nation's list, or a parcel that is not in the register, is refused.
    const bad = ok(openCase({ procedure: 'building.planning', fields: { parcel: 'NO/SUCH/PARCEL', proposedUse: 'residential', description: 'x' } }, bc('clerk')));
    doc(bad.id, 'site-plan', bc('clerk'));
    expect(await act(bad.id, { action: 'validate' }, bc('clerk'))).toMatchObject({ error: expect.stringMatching(/No parcel/) });
    await step(c.id, 'validate', bc('clerk'));
  }, 60_000);

  it('keeps planning permission, building approval, construction and occupancy distinct, each decision with its parcel and rules version (P3-11)', async () => {
    adopt();
    // Planning permission first: on the parcel, with conditions.
    const pl = ok(openCase({ procedure: 'building.planning', fields: { parcel, proposedUse: 'residential', description: 'Four flats in two storeys', representations: 'A neighbour asks about parking' } }, bc('clerk')));
    doc(pl.id, 'site-plan', bc('clerk'));
    await step(pl.id, 'validate', bc('clerk'));
    await step(pl.id, 'close-consultation', bc('clerk'), { fields: { consultationNotice: 'Site notice and the gazette' }, reason: 'Twenty-one days elapsed' });
    const granted = await two(pl.id, 'grant', signers(), { fields: { conditions: 'Two parking spaces\nNo work on Sundays' }, reason: 'Conforms to the local plan' });
    const planning = planningOfCase(pl.id)!;
    expect(planning).toMatchObject({ outcome: 'granted-with-conditions', parcel: { id: parcel, version: 2 }, rules: { version: 1 }, decision: granted.decision!.id, representations: 1 });
    expect(getDecision(granted.decision!.id)!.content).toMatchObject({ rules: [{ key: 'building.rules', version: 1 }], facts: { parcelVersion: 2 } });

    // The building permit relies on it; a refused or another parcel's decision would not do.
    const bp = ok(openCase({ procedure: 'building.permit', fields: { parcel, planningDecision: planning.number, buildingCategory: 'Class A dwelling', buildingUse: 'residential', floorArea: 420 } }, bc('clerk')));
    const v1 = doc(bp.id, 'design-documents', bc('clerk'));
    await step(bp.id, 'validate', bc('clerk'));
    const v2 = doc(bp.id, 'design-documents', bc('clerk'));
    await step(bp.id, 'submit-plans', bc('clerk'), { reason: 'Stair widened after review comments' });
    await step(bp.id, 'technical-review', bc('clerk'), { fields: { reviewFindings: 'Structure adequate; fire separation adequate' }, reason: 'Reviewed by the structural engineer' });
    // The reviewer does not decide.
    expect(await act(bp.id, { action: 'grant', reason: 'x' }, { ...bc('clerk'), scope: { ...bc('clerk').scope!, role: 'signatory' } })).toMatchObject({ error: expect.stringMatching(/different person/) });
    const permitted = await two(bp.id, 'grant', signers(), { fields: { conditions: 'Inspection at foundation and on completion' }, reason: 'Plans conform' });
    let p = permitOfCase(bp.id)!;
    expect(p.designs.map(d => d.document)).toEqual([v1, v2]);
    expect(p).toMatchObject({ approvedDesign: 2, planning: planning.number, permit: { state: 'granted', decision: permitted.decision!.id }, construction: { state: 'not-started' }, occupancy: { state: 'none' } });

    // Construction: commenced, inspected (findings with reasons; severities the nation's), stopped by an order citing the law, lifted by two.
    await step(bp.id, 'commence', bc('clerk'), { fields: { commencementDate: '2026-05-01' } });
    expect(await act(bp.id, { action: 'inspect', fields: { inspectionStage: 'foundation', inspectionResult: 'remediation-required', inspectionFindings: 'footings | Cracked footing on the north side | catastrophic' }, reason: 'x' }, bc('insp'))).toMatchObject({ error: expect.stringMatching(/severity is one of the nation's/) });
    expect(await act(bp.id, { action: 'inspect', fields: { inspectionStage: 'foundation', inspectionResult: 'fail', inspectionFindings: '' }, reason: 'x' }, bc('insp'))).toMatchObject({ error: expect.stringMatching(/findings it rests on/) });
    await step(bp.id, 'inspect', bc('insp'), { fields: { inspectionStage: 'foundation', inspectionDate: '2026-05-10', inspectionResult: 'remediation-required', inspectionFindings: 'footings | Cracked footing on the north side | major\ndamp-proofing | Membrane laid | minor' }, reason: 'Footing must be recast' });
    const [i1] = inspectionsOf(p.number);
    expect(i1).toMatchObject({ stage: 'foundation', inspector: { id: 'insp', name: 'Official insp' }, result: 'remediation-required', checklist: { rules: { version: 1 }, items: ['footings', 'damp-proofing'] }, findings: [{ item: 'footings', severity: 'major' }, { item: 'damp-proofing', severity: 'minor' }], reasons: 'Footing must be recast' });
    expect(await act(bp.id, { action: 'stop-work', fields: { stopGrounds: 'Building over a cracked footing' }, reason: 'Unsafe' }, signers()[0])).toMatchObject({ error: expect.stringMatching(/Cite the provisions/) });
    const stop = await step(bp.id, 'stop-work', signers()[0], { fields: { stopGrounds: 'Building over a cracked footing' }, reason: 'Unsafe until recast', citations: basis });
    p = permitOfCase(bp.id)!;
    expect(p).toMatchObject({ permit: { state: 'granted' }, construction: { state: 'stopped' }, occupancy: { state: 'none' } });
    expect(stopOrdersOf(p.number)).toMatchObject([{ decision: stop.decision!.id, grounds: 'Building over a cracked footing' }]);
    expect(await act(bp.id, { action: 'complete', fields: { completionDate: '2026-09-01' } }, bc('clerk'))).toHaveProperty('error');
    await step(bp.id, 'inspect-stopped', bc('insp'), { fields: { inspectionStage: 'foundation', inspectionResult: 'pass', inspectionFindings: '' }, reason: 'Footing recast' });
    await two(bp.id, 'lift-stop', signers(), { reason: 'Recast footing passed inspection' });
    expect(permitOfCase(bp.id)!.construction.state).toBe('commenced');

    // A changed design is decided again: until then the approved design stands.
    const v3 = doc(bp.id, 'design-documents', bc('clerk'));
    await step(bp.id, 'submit-variation', bc('clerk'), { reason: 'Roof changed to a terrace' });
    expect(permitOfCase(bp.id)).toMatchObject({ approvedDesign: 2, variationPending: 3 });
    await two(bp.id, 'approve-variation', signers(), { reason: 'Terrace conforms' });
    expect(permitOfCase(bp.id)!.approvedDesign).toBe(3);
    expect(permitOfCase(bp.id)!.designs[2]!.document).toBe(v3);

    // Completion, then occupancy only after a final inspection that passes.
    doc(bp.id, 'completion-documents', bc('clerk'));
    await step(bp.id, 'complete', bc('clerk'), { fields: { completionDate: '2026-09-01' } });
    p = permitOfCase(bp.id)!;
    expect(p).toMatchObject({ permit: { state: 'granted' }, construction: { state: 'completed', completedOn: '2026-09-01' }, occupancy: { state: 'none' } });
    expect(await act(bp.id, { action: 'certify-occupancy', reason: 'x' }, signers()[0])).toMatchObject({ error: expect.stringMatching(/final inspection after completion/) });
    await step(bp.id, 'inspect-after-completion', bc('insp'), { fields: { inspectionStage: 'final', inspectionDate: '2026-09-02', inspectionResult: 'remediation-required', inspectionFindings: 'fire exits | Exit door locked | critical' }, reason: 'Exit must open outward' });
    expect(await act(bp.id, { action: 'certify-occupancy', reason: 'x' }, signers()[0])).toMatchObject({ error: expect.stringMatching(/occupancy is certified only after a pass/) });
    await step(bp.id, 'refuse-occupancy', signers()[0], { reason: 'Locked fire exit' });
    expect(permitOfCase(bp.id)!.occupancy.state).toBe('refused');
    await step(bp.id, 'inspect-after-completion', bc('insp'), { fields: { inspectionStage: 'final', inspectionDate: '2026-09-09', inspectionResult: 'pass', inspectionFindings: '' }, reason: 'Exit fixed' });
    const occ = await two(bp.id, 'certify-occupancy', signers(), { reason: 'Final inspection passed' });
    p = permitOfCase(bp.id)!;
    expect(p).toMatchObject({ permit: { state: 'granted' }, construction: { state: 'completed' }, occupancy: { state: 'certified', certificate: expect.stringMatching(/^OCC-/), decision: occ.decision!.id, finalInspection: inspectionsOf(p.number).at(-1)!.number } });
    expect(getDecision(occ.decision!.id)!.content.authority).toMatchObject({ permitType: 'occupancy-certificate' });
    expect(occ.case.stage).toBe('occupancy-certified');
  }, 120_000);

  it('never lets a refused planning decision, another parcel\'s, or a later change of the map stand in for the record decided on', async () => {
    adopt();
    const pl = ok(openCase({ procedure: 'building.planning', fields: { parcel, proposedUse: 'commercial', description: 'A warehouse' } }, bc('clerk')));
    doc(pl.id, 'site-plan', bc('clerk'));
    await step(pl.id, 'validate', bc('clerk'));
    await step(pl.id, 'close-consultation', bc('clerk'), { fields: { consultationNotice: 'Site notice' }, reason: 'Done' });
    await step(pl.id, 'refuse', signers()[0], { reason: 'Contrary to the residential zoning' });
    const refused = planningOfCase(pl.id)!;
    expect(refused.outcome).toBe('refused');
    const bp = ok(openCase({ procedure: 'building.permit', fields: { parcel, planningDecision: refused.number, buildingCategory: 'Class B commercial', buildingUse: 'commercial' } }, bc('clerk')));
    doc(bp.id, 'design-documents', bc('clerk'));
    expect(await act(bp.id, { action: 'validate' }, bc('clerk'))).toMatchObject({ error: expect.stringMatching(/refused permission/) });
    // The parcel's outline changes later (a new version): the planning decision keeps the version it was taken on.
    ok(await actOnParcel(parcel, { action: 'amend', reason: 'Resurveyed', landUse: 'commercial' }, 'Clerk A'));
    ok(await actOnParcel(parcel, { action: 'confirm-amend' }, 'Registrar B'));
    expect(planningOfCase(pl.id)!.parcel.version).toBe(2);
    // Another institution never acts on these cases.
    expect(await act(bp.id, { action: 'validate' }, at(() => OTHER)('o1'))).toHaveProperty('error');
  }, 60_000);

  it('allocates housing only from a programme\'s approved terms: eligibility criterion by criterion, priority points, an official\'s reasons, out of order said', async () => {
    const prog = ok(openCase({ procedure: 'housing.programme', fields: {
      programmeTitle: 'Affordable rental homes', programmeDescription: 'Rental homes for households in need',
      eligibilityCriteria: 'resident | Resident in the district\nincome | Household income below the programme limit',
      priorityFactors: 'homeless | Homeless now | 50\nchildren | Children in the household | 20',
      homes: 'H-1 | KE-30 | NRB/BLD/1 | 2\nH-2 | KE-30 | | 3',
    } }, hou('clerk')));
    doc(prog.id, 'programme-instrument', hou('clerk'));
    await step(prog.id, 'check', hou('clerk'));
    expect(await act(prog.id, { action: 'register', reason: 'x' }, hou('s1', 'signatory'))).toMatchObject({ error: expect.stringMatching(/Cite the provisions/) });
    await two(prog.id, 'register', [hou('s1', 'signatory'), hou('s2', 'signatory')], { reason: 'Programme approved', citations: basis });
    const [programme] = listProgrammes();
    expect(programme).toMatchObject({ terms: [{ n: 1, eligibility: [{ key: 'resident' }, { key: 'income' }], priority: [{ key: 'homeless', points: 50 }, { key: 'children', points: 20 }] }], units: [{ ref: 'H-1', state: 'available' }, { ref: 'H-2', state: 'available' }] });

    const apply = async (answers: string, factors: string) => {
      const c = ok(openCase({ procedure: 'housing.application', fields: { programme: programme!.number, householdSize: 4, currentSituation: 'overcrowded' } }, hou('clerk')));
      doc(c.id, 'application', hou('clerk'));
      await step(c.id, 'accept', hou('clerk'));
      return { c, assess: (who = hou('clerk')) => act(c.id, { action: 'assess-eligible', fields: { criteriaAnswers: answers, priorityFactorsFound: factors }, reason: 'Evidence seen' }, who) };
    };
    // Every criterion is answered, and only the programme's factors count.
    const partial = await apply('resident | yes | Utility bill', '');
    expect(await partial.assess()).toMatchObject({ error: expect.stringMatching(/income not answered/) });
    const a = await apply('resident | yes | Utility bill\nincome | yes | Payslips', 'children');
    ok(await a.assess());
    const b = await apply('resident | yes | Lease\nincome | yes | Payslips', 'homeless\nchildren');
    ok(await b.assess());
    expect(applicationOfCase(b.c.id)!.assessment).toMatchObject({ terms: 1, eligible: true, points: 70, factors: ['homeless', 'children'] });
    expect(waitingList(programme!.number).map(x => x.case.id)).toEqual([b.c.id, a.c.id]);
    // An applicant who does not meet a criterion is found ineligible by an official who can sign, with reasons.
    const no = await apply('resident | no | No proof of residence\nincome | yes | Payslips', '');
    expect(await no.assess()).toMatchObject({ error: expect.stringMatching(/Not every criterion is met/) });
    ok(await act(no.c.id, { action: 'find-ineligible', fields: { criteriaAnswers: 'resident | no | No proof of residence\nincome | yes | Payslips' }, reason: 'Not resident in the district' }, hou('s1', 'signatory')));
    expect(applicationOfCase(no.c.id)!.state).toBe('ineligible');
    // Allocated by two officials, with reasons: passing over the applicant with more points is said on the decision.
    const alloc = await two(a.c.id, 'allocate', [hou('s1', 'signatory'), hou('s2', 'signatory')], { fields: { unit: 'H-1' }, reason: 'Ground-floor home suits this household; the other applicant needs three rooms' });
    expect(getDecision(alloc.decision!.id)!.content).toMatchObject({ facts: { outOfOrder: true, points: 20, terms: 1 }, rules: [{ key: `housing.terms.${programme!.number}`, version: 1 }] });
    expect(applicationOfCase(a.c.id)!.allocation).toMatchObject({ unit: 'H-1', outOfOrder: true, higherWaiting: 1, terms: 1 });
    // A home is allocated once.
    expect(await act(b.c.id, { action: 'allocate', fields: { unit: 'H-1' }, reason: 'x' }, hou('s1', 'signatory'))).toMatchObject({ pending: true });
    expect(await act(b.c.id, { action: 'allocate' }, hou('s2', 'signatory'))).toMatchObject({ error: expect.stringMatching(/already allocated/) });
    expect(housingCounts()).toMatchObject({ programmes: 1, homes: 2, available: 1, allocated: 1, outOfOrder: 1 });
  }, 60_000);
});
