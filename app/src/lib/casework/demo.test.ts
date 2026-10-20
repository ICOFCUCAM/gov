import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { setSovereign, listMinistries } from '@/lib/data/store';
import { resetLaw, listInstruments } from '@/lib/law/register';
import { resetPackages, activePackage } from './packages';
import { loadDemonstration, DEMO_ACT_TITLE, DEMO_ORG_ACT_TITLE } from './demo';

describe('demonstration set', () => {
  beforeEach(() => {
    resetLaw(); resetPackages();
    setSovereign({ deployment: { authorities: { civilRegistration: listMinistries()[0]!.id } } }, 'Administrator');
  });
  afterEach(() => { vi.unstubAllEnvs(); });

  it('records a sample act and approves the civil procedures cited to it, once', () => {
    const r = loadDemonstration('Administrator');
    if ('error' in r) throw new Error(r.error);
    expect(r.approved).toEqual(['civil.birth', 'civil.late-birth', 'civil.death', 'civil.marriage', 'civil.correction']);
    const act = listInstruments({ state: 'any' }).find(i => i.title === DEMO_ACT_TITLE)!;
    expect(act.versions[0]).toMatchObject({ state: 'confirmed', source: { kind: 'sample' } });
    expect(activePackage('civil.birth')).toMatchObject({ citations: [expect.objectContaining({ instrument: act.id, eId: 'sec_12' })] });
    // A second load changes nothing.
    expect(loadDemonstration('Administrator')).toMatchObject({ approved: [], present: expect.arrayContaining(['civil.birth']) });
  });

  it('adds the organisation procedures under a second sample act once their authorities are named', () => {
    const [a, b] = listMinistries().slice(0, 2).map(m => m.id);
    setSovereign({ deployment: { authorities: { civilRegistration: a!, businessRegister: a!, higherEducationAccreditation: b!, immigration: a!, police: b!, judiciary: b! } } }, 'Administrator');
    const r = loadDemonstration('Administrator');
    if ('error' in r) throw new Error(r.error);
    expect(r.approved).toEqual(expect.arrayContaining(['civil.birth', 'org.registration', 'org.licence', 'org.accreditation', 'org.licence-revocation', 'immigration.visa', 'police.incident', 'court.case']));
    expect(listInstruments({ state: 'any' }).map(i => i.title)).toContain(DEMO_ORG_ACT_TITLE);
    expect(activePackage('org.accreditation')).toMatchObject({ citations: [expect.objectContaining({ eId: 'sec_40' })] });
  });

  it('adds the cycle 3 procedures under their sample acts, with no sample rate and no approved authority mapping', async () => {
    const [a, b, c] = listMinistries().slice(0, 3).map(m => m.id);
    setSovereign({ deployment: { authorities: { civilRegistration: a!, tax: a!, education: b!, professionalRegulation: c!, healthRegulation: c!, customs: a! } } }, 'Administrator');
    const r = loadDemonstration('Administrator');
    if ('error' in r) throw new Error(r.error);
    expect(r.approved).toEqual(expect.arrayContaining(['tax.return', 'edu.school', 'edu.qualification', 'prof.registration', 'health.facility', 'health.pharmacy-revocation', 'customs.declaration']));
    const { listRules } = await import('@/lib/law/rules');
    const { listMappings } = await import('@/lib/permits/authority');
    expect(listRules()).toEqual([]);
    expect(listMappings().filter(m => m.state === 'approved')).toEqual([]);
    expect(listInstruments({ state: 'any' }).filter(i => i.title.includes('sample for demonstration')).length).toBeGreaterThanOrEqual(6);
  });

  it('is refused in a production installation', () => {
    vi.stubEnv('CIVICOS_MODE', 'production');
    expect(loadDemonstration('Administrator')).toMatchObject({ error: expect.stringMatching(/production/) });
  });
});
