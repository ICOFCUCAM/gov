// Health workforce counts (Health I4 dependency health-department-functions;
// Institutional specification Part 2 §C.2 "Workforce counts by approved
// professional category"): derived from the register of regulated
// professionals, never typed; by profession, standing and region of practice;
// small cells suppressed by the nation's threshold (nothing published until it
// is adopted); no name, number or person reference in any count; and only
// unsuppressed counts of registered professionals reach the twin, as a
// registered source's observations.
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { asNationSets } from '@/lib/casework/testkit';
import { openCase, act, attach, resetCases, registeredEffects, type Actor } from '@/lib/casework/engine';
import { draftPackage, approvePackage, resetPackages } from '@/lib/casework/packages';
import { addDocument, resetDocuments } from '@/lib/records/documents';
import { resetDecisions } from '@/lib/records/decisions';
import { resetCertificates } from '@/lib/records/certificates';
import { setSovereign, listMinistries } from '@/lib/data/store';
import { recordVersion, confirmVersion, resetLaw } from '@/lib/law/register';
import { resetTwin, syncRegister, regionEntities, signalFor } from '@/lib/twin/register';
import { resetSmallCells, proposeSmallCellRule, confirmSmallCellRule } from '@/lib/health/small-cells';
import { resetProfessions, registerProfessional, setProfessionalState, getProfessional } from './register';
import { REFERENCE_PROFESSIONAL_REGISTRATION } from './procedures';
import { workforceCounts, workforceTwinRows, publishWorkforceCounts } from './workforce';
import '@/lib/casework/modules';

let PR = '';
const pdf = new Uint8Array(Buffer.from('%PDF-1.7\nx\n%%EOF'));
const who = (id: string, role: 'officer' | 'signatory' = 'officer'): Actor => ({ id, name: `Official ${id}`, scope: { id, role, institution: PR } });

describe('health workforce counts from the professions register', () => {
  beforeEach(async () => {
    for (const r of [resetCases, resetPackages, resetDocuments, resetDecisions, resetCertificates, resetProfessions, resetSmallCells, resetLaw, resetTwin]) r();
    vi.stubEnv('CIVICOS_DATA_KEK', Buffer.alloc(32, 7).toString('base64'));
    PR = listMinistries()[0]!.id;
    setSovereign({ regions: ['North', 'South'], deployment: { authorities: { professionalRegulation: PR } } }, 'Administrator');
    await syncRegister();
  });
  afterEach(() => vi.unstubAllEnvs());

  it('records the region of practice through the registration decision, never on the public check', async () => {
    const d = draftPackage(asNationSets(REFERENCE_PROFESSIONAL_REGISTRATION), 'Author', 'author', registeredEffects()); if ('error' in d) throw new Error(d.error);
    const a = approvePackage('prof.registration', 1, 'Approver', 'approver', '2026-01-01', registeredEffects(), new Date('2026-01-01')); if ('error' in a) throw new Error(a.error);
    const c = openCase({ procedure: 'prof.registration', fields: { profession: 'nurse', personRef: 'P-9', name: 'Sample Nurse', region: 'South' } }, who('clerk')) as { id: string };
    for (const cls of ['qualification-evidence', 'identity-evidence']) { const x = addDocument({ class: cls, title: cls, institution: PR, belongsTo: { kind: 'case', id: c.id }, bytes: pdf }, 'Clerk') as { id: string }; attach(c.id, x.id, who('clerk')); }
    for (const [action, actor, extra] of [['check', who('clerk'), {}], ['verify', who('clerk'), {}], ['register', who('s1', 'signatory'), { reason: 'Qualified' }], ['register', who('s2', 'signatory'), {}]] as const) {
      const r = await act(c.id, { action, ...extra }, actor); if ('error' in r) throw new Error(`${action}: ${r.error}`);
    }
    const e = registerProfessional({ profession: 'nurse', personRef: 'P-10', name: 'Other Nurse', region: 'Atlantis' }, 'case-x', 'Registrar');
    expect(e).toMatchObject({ error: expect.stringMatching(/not one of the nation's regions/) });
    const tally = workforceCounts().cells;
    expect(tally).toEqual([{ profession: 'nurse', title: 'Nurses', state: 'registered', region: 'South', cell: { suppressed: 'no-threshold' } }]);
  });

  it('counts by profession, standing and region, suppresses small cells by the nation\'s threshold, and names nobody', async () => {
    const add = (profession: string, n: number, region?: string, prefix = profession) => Array.from({ length: n }, (_, i) => (registerProfessional({ profession, personRef: `${prefix}-${region ?? 'none'}-${i}`, name: `PERSON-${prefix}-${i}`, ...(region ? { region } : {}) }, `case-${prefix}-${region}-${i}`, 'Registrar') as { number: string }).number);
    add('nurse', 12, 'North'); add('nurse', 3, 'South'); add('midwife', 7, 'North'); add('pharmacist', 2);
    const suspended = add('nurse', 1, 'North', 'nurse-s');
    setProfessionalState(suspended[0]!, { state: 'suspended', reason: 'Fitness' }, 'case-s', 'Registrar');
    // No threshold adopted: nothing is published.
    expect(workforceCounts().cells.every(c => 'suppressed' in c.cell && c.cell.suppressed === 'no-threshold')).toBe(true);
    expect(workforceTwinRows()).toEqual([]);
    // Two officials adopt the threshold, citing the law.
    const law = recordVersion({ instrument: { title: 'Statistics Act', type: 'act', jurisdiction: 'xx', year: 2020, number: '4', issuingAuthority: 'Parliament' }, dates: { inForce: '2020-01-01' }, provisions: [{ eId: 'sec_20', num: '20', text: 'Disclosure control.' }], source: { kind: 'sample' } }, 'Recorder', 'rec') as { instrument: { id: string }; version: { id: string } };
    confirmVersion(law.instrument.id, law.version.id, 'Confirmer', 'conf');
    expect(proposeSmallCellRule(5, [{ instrument: law.instrument.id, eId: 'sec_20' }], 'Admin A', 'admin-a')).not.toHaveProperty('error');
    expect(confirmSmallCellRule('Admin B', 'admin-b')).not.toHaveProperty('error');
    const w = workforceCounts();
    const cell = (profession: string, state: string, region: string | null) => w.cells.find(c => c.profession === profession && c.state === state && c.region === region)?.cell;
    expect(cell('nurse', 'registered', 'North')).toEqual({ value: 12 });
    expect(cell('nurse', 'registered', 'South')).toEqual({ suppressed: 'below-threshold' });
    expect(cell('midwife', 'registered', 'North')).toEqual({ value: 7 });
    expect(cell('pharmacist', 'registered', null)).toEqual({ suppressed: 'below-threshold' });
    expect(cell('nurse', 'suspended', 'North')).toEqual({ suppressed: 'below-threshold' });
    expect(w.totals.find(t => t.profession === 'nurse' && t.state === 'registered')!.cell).toEqual({ value: 15 });
    expect(w.regionNotRecorded).toEqual({ suppressed: 'below-threshold' });
    expect(w.sha256).toMatch(/^[0-9a-f]{64}$/);
    // Nobody is named: no name, registration number or person reference in any count.
    expect(JSON.stringify(w)).not.toMatch(/PERSON-|PRN-|nurse-North-|"value":3\b|"value":2\b|"value":1\b/);
    expect(getProfessional(suspended[0]!)!.state).toBe('suspended');
    // The twin: registered professionals by profession and region, unsuppressed cells only, through a registered source.
    expect(workforceTwinRows().map(r => [r.metric, r.region, r.value]).sort()).toEqual([['health.workforce.midwife', 'North', 7], ['health.workforce.nurse', 'North', 12]]);
    const run = await publishWorkforceCounts('Officer', false, new Date('2026-10-20T00:00:00Z'));
    expect(run, JSON.stringify(run)).toMatchObject({ published: true, accepted: 2 });
    const north = regionEntities().find(e => e.name === 'North')!, south = regionEntities().find(e => e.name === 'South')!;
    expect(signalFor(north.id, 'health.workforce.nurse')).toMatchObject({ value: 12 });
    expect(signalFor(south.id, 'health.workforce.nurse')).toBeNull();
  });
});
