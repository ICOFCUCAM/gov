import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { setSovereign, listMinistries } from '@/lib/data/store';
import { resetLaw, listInstruments } from '@/lib/law/register';
import { resetPackages, activePackage } from './packages';
import { loadDemonstration, DEMO_ACT_TITLE } from './demo';

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

  it('is refused in a production installation', () => {
    vi.stubEnv('CIVICOS_MODE', 'production');
    expect(loadDemonstration('Administrator')).toMatchObject({ error: expect.stringMatching(/production/) });
  });
});
