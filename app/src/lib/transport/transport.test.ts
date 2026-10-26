// Transport (plan step I7; specification Part 3 §D.10; catalogue Part 9):
// a vehicle registered and its keeper changed, a driving licence issued with
// medical fitness only as a sealed document's reference, a road works permit
// placed from the map, an operator licensed as an organisation with a fleet of
// registered vehicles: four records kept apart, each decided by two officials
// of the body the nation names, under proposed, unapproved mappings.
import { asNationSets } from '@/lib/casework/testkit';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

const { act, attach, openCase, resetCases, registeredEffects } = await import('@/lib/casework/engine');
const { draftPackage, approvePackage, resetPackages } = await import('@/lib/casework/packages');
const { addDocument, resetDocuments } = await import('@/lib/records/documents');
const { resetDecisions, getDecision } = await import('@/lib/records/decisions');
const { setSovereign, listMinistries, institutionBounds } = await import('@/lib/data/store');
const { listAudit } = await import('@/lib/data/store/audit');
const { classifyDecision } = await import('@/lib/permits/decisions');
const { resetPermitAuthorities, installProposedDefaults, listMappings } = await import('@/lib/permits/authority');
const { applyNation } = await import('@/lib/nation/registry');
const { createOrganisation } = await import('@/lib/organisations/register');
const { TRANSPORT_PROCEDURES, TRANSPORT_PERMITS } = await import('./procedures');
const { resetTransport, vehicleByMark, licenceOfCase, roadWorksOfCase, operatorOfCase, transportRegister } = await import('./register');
type Actor = import('@/lib/casework/engine').Actor;

let DVLA = '', ROADS = '', REG = '';
const bounds = () => institutionBounds();
const at = (inst: () => string) => (id: string, role: 'officer' | 'signatory' = 'officer'): Actor => ({ id, name: `Official ${id}`, scope: { id, role, institution: inst(), bounds: bounds() } });
const dvla = at(() => DVLA), roads = at(() => ROADS), reg = at(() => REG);
const doc = (caseId: string, cls: string, who: Actor, text = cls) => { const d = addDocument({ class: cls, title: cls, institution: who.scope!.institution!, belongsTo: { kind: 'case', id: caseId }, bytes: new Uint8Array(Buffer.from(`%PDF-1.7\n${text}\n%%EOF`)) }, 'Clerk') as { id: string }; attach(caseId, d.id, who); return d.id; };
async function step(id: string, action: string, who: Actor, extra: Record<string, unknown> = {}) { const r = await act(id, { action, ...extra }, who); if ('error' in r) throw new Error(`${action}: ${r.error}`); return r; }
async function two(id: string, action: string, who: [Actor, Actor], extra: Record<string, unknown> = {}) { const p = await act(id, { action, ...extra }, who[0]); if ('error' in p) throw new Error(`${action}: ${p.error}`); return step(id, action, who[1]); }
const ok = <T,>(r: T): Exclude<T, { error: string }> => { if (r && typeof r === 'object' && 'error' in r) throw new Error((r as { error: string }).error); return r as Exclude<T, { error: string }>; };
const LISTS: Record<string, string[]> = { 'transport.country.vehicle_categories': ['m1', 'n1'], 'transport.country.licence_categories': ['b', 'c'], 'transport.country.operator_classes': ['passenger'] };
const nation = (p: (typeof TRANSPORT_PROCEDURES)[number]) => {
  const used = Object.keys(LISTS).filter(k => p.fields.some(f => f.valuesSource?.kind === 'configured' && f.valuesSource.list === k));
  return { ...asNationSets(p), ...(used.length ? { form: { version: 'nation-1', lists: Object.fromEntries(used.map(k => [k, { values: LISTS[k]!.map(v => ({ value: v, label: v })) }])) } } : {}) };
};
const VIN = 'JH4KA7560MC012345';

describe('transport registers', () => {
  beforeEach(() => {
    for (const r of [resetCases, resetPackages, resetDocuments, resetDecisions, resetPermitAuthorities, resetTransport]) r();
    vi.stubEnv('CIVICOS_DATA_KEK', Buffer.alloc(32, 7).toString('base64'));
    [DVLA, ROADS, REG] = listMinistries().slice(0, 3).map(m => m.id) as [string, string, string];
    setSovereign({ deployment: { authorities: { vehicleRegistration: DVLA, roadAuthority: ROADS, transportRegulator: REG } } }, 'Administrator');
    applyNation({ iso3: 'KEN', regions: [] });
    for (const p of TRANSPORT_PROCEDURES) {
      ok(draftPackage(nation(p), 'Author', 'author', registeredEffects()));
      ok(approvePackage(p.key, 1, 'Approver', 'approver', '2026-01-01', registeredEffects(), new Date('2026-01-01')));
    }
  });
  afterEach(() => { vi.unstubAllEnvs(); setSovereign({ deployment: { authorities: {} } }, 'test'); });

  it('ships drafts only; every decision classified under a proposed mapping of its own; no clinical field anywhere', () => {
    for (const p of TRANSPORT_PROCEDURES) {
      expect(p.deadlines.every(d => d.days === undefined), p.key).toBe(true);
      for (const a of p.actions.filter(x => x.decision)) expect(classifyDecision({ fields: {} } as never, a, p as never), `${p.key} ${a.key}`).toMatchObject({ kind: 'mapping' });
      for (const f of p.fields) expect(`${f.key} ${f.label}`, f.key).not.toMatch(/diagnos|medical condition|health condition|medication|eyesight|disease|clinical|blood/i);
    }
    installProposedDefaults('Installer');
    for (const t of new Set(Object.values(TRANSPORT_PERMITS))) expect(listMappings(t)[0], t).toMatchObject({ state: 'draft', proposal: true });
  });

  it('registers a vehicle once, then changes its keeper with the earlier one kept', async () => {
    const c = ok(openCase({ procedure: 'transport.vehicle-registration', fields: { vin: VIN, make: 'Acme', vehicleCategory: 'm1', keeperName: 'Amina Testkeeper', keeperKind: 'person' } }, dvla('clerk')));
    doc(c.id, 'ownership-evidence', dvla('clerk'));
    await step(c.id, 'check', dvla('clerk'));
    await step(c.id, 'record-inspection', dvla('clerk'), { fields: { inspectionResult: 'passed' }, reason: 'Roadworthy' });
    await two(c.id, 'grant', [dvla('s1', 'signatory'), dvla('s2', 'signatory')], { fields: { registrationMark: 'kaa 001a' }, reason: 'Evidence complete' });
    expect(vehicleByMark('KAA 001A')).toMatchObject({ vin: VIN, keepers: [{ holder: 'Amina Testkeeper' }], state: 'registered' });
    const again = ok(openCase({ procedure: 'transport.vehicle-registration', fields: { vin: VIN, make: 'Acme', vehicleCategory: 'm1', keeperName: 'Someone' } }, dvla('clerk')));
    doc(again.id, 'ownership-evidence', dvla('clerk'));
    expect(await act(again.id, { action: 'check' }, dvla('clerk'))).toMatchObject({ error: expect.stringMatching(/already registered/) });
    const t = ok(openCase({ procedure: 'transport.vehicle-transfer', fields: { registrationMark: 'KAA 001A', newKeeperName: 'Juma Testbuyer', newKeeperKind: 'person' } }, dvla('clerk')));
    doc(t.id, 'transfer-instrument', dvla('clerk'));
    await step(t.id, 'check', dvla('clerk'));
    await two(t.id, 'grant', [dvla('s1', 'signatory'), dvla('s2', 'signatory')], { reason: 'Signed by both' });
    const v = vehicleByMark('KAA 001A')!;
    expect(v.keepers[0]!.holder).toBe('Juma Testbuyer');
    expect(v.history.map(h => [h.kind, h.keepers?.[0]?.holder])).toEqual([['registered', 'Amina Testkeeper'], ['keeper-changed', 'Juma Testbuyer']]);
    // Lists and the audit chain carry no keeper.
    expect(JSON.stringify(transportRegister())).not.toMatch(/Test(keeper|buyer)/);
    expect(JSON.stringify(listAudit())).not.toMatch(/Test(keeper|buyer)/);
  }, 60_000);

  it('issues a driving licence after the test, with medical fitness only as a sealed document\'s reference', async () => {
    const c = ok(openCase({ procedure: 'transport.driving-licence', fields: { applicantName: 'Wanjiru Testdriver', licenceCategories: ['b'], fitnessRequired: true } }, dvla('clerk')));
    doc(c.id, 'identity-evidence', dvla('clerk'));
    await step(c.id, 'check', dvla('clerk'));
    doc(c.id, 'test-record', dvla('clerk'));
    await step(c.id, 'record-test', dvla('clerk'), { fields: { testResult: 'passed' }, reason: 'Passed on the second attempt' });
    expect(await act(c.id, { action: 'grant', fields: { validUntil: '2031-06-01' }, reason: 'x' }, dvla('s1', 'signatory'))).toMatchObject({ pending: true });
    expect(await act(c.id, { action: 'grant' }, dvla('s2', 'signatory'))).toMatchObject({ error: expect.stringMatching(/medical fitness certificate/) });
    const fit = doc(c.id, 'medical-fitness-certificate', dvla('clerk'), 'EYESIGHT-CLINICAL-DETAIL');
    // The proposal waits; a different official confirms it once the certificate is attached.
    const r = await step(c.id, 'grant', dvla('s3', 'signatory'));
    const l = licenceOfCase(c.ref)!;
    expect(l).toMatchObject({ categories: ['b'], validUntil: '2031-06-01', state: 'valid', medicalFitness: { document: fit, sha256: expect.stringMatching(/^[0-9a-f]{64}$/) } });
    expect(JSON.stringify(l)).not.toMatch(/EYESIGHT|CLINICAL/);
    expect(getDecision(r.decision!.id)!.content.authority).toMatchObject({ permitType: 'driving-licence' });
  }, 60_000);

  it('permits road works placed from the map, and licenses an operator only as a registered organisation with registered vehicles', async () => {
    const w = ok(openCase({ procedure: 'transport.road-works', fields: { roadReference: 'A104 km 12–13', longitude: 36.8170, latitude: -1.2860, worksFrom: '2026-07-01', worksTo: '2026-07-10', worksDescription: 'Water main crossing', closureNeeded: true, promoter: 'Water utility' } }, roads('clerk')));
    doc(w.id, 'traffic-management-plan', roads('clerk'));
    await step(w.id, 'check', roads('clerk'));
    await two(w.id, 'grant', [roads('s1', 'signatory'), roads('s2', 'signatory')], { reason: 'Diversion agreed' });
    expect(roadWorksOfCase(w.ref)).toMatchObject({ place: { regionCode: 'KE-30' }, window: { from: '2026-07-01', to: '2026-07-10' }, closure: true });
    const o = ok(openCase({ procedure: 'transport.operator-licence', fields: { organisation: 'ORG-NONE', operatorClass: 'passenger', fleetMarks: 'KZZ 999Z' } }, reg('clerk')));
    doc(o.id, 'insurance-evidence', reg('clerk'));
    await step(o.id, 'check', reg('clerk'));
    await act(o.id, { action: 'grant', reason: 'x' }, reg('s1', 'signatory'));
    expect(await act(o.id, { action: 'grant' }, reg('s2', 'signatory'))).toMatchObject({ error: expect.stringMatching(/organisations register/) });
    const org = ok(createOrganisation({ name: 'Example Bus Company', kind: 'company' }, 'c', 'Registrar'));
    const o2 = ok(openCase({ procedure: 'transport.operator-licence', fields: { organisation: org.number, operatorClass: 'passenger', fleetMarks: '', serviceAreas: 'Route 4' } }, reg('clerk')));
    doc(o2.id, 'insurance-evidence', reg('clerk'));
    await step(o2.id, 'check', reg('clerk'));
    await two(o2.id, 'grant', [reg('s1', 'signatory'), reg('s2', 'signatory')], { reason: 'Insurance and safety in order' });
    expect(operatorOfCase(o2.ref)).toMatchObject({ organisation: org.number, operatorClass: 'passenger', state: 'licensed' });
    // The licensing authority is not the road authority: another institution never decides these.
    const x = ok(openCase({ procedure: 'transport.road-works', fields: { roadReference: 'B1', region: 'x', worksFrom: '2026-07-01', worksTo: '2026-07-02', worksDescription: 'x' } }, roads('clerk')));
    expect(await act(x.id, { action: 'check' }, dvla('clerk'))).toHaveProperty('error');
  }, 60_000);
});
