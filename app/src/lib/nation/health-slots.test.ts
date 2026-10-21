// The medicines, controlled-substances and public-health slots (owner's
// direction of 21 October 2026, health integration §3): configurable, shipped
// empty like every slot; until the nation names one, the health regulator (or
// the next slot down) stands in as a recorded provisional owner, shown as
// such, refused as the competent authority in production and never confirmed
// as proof of legal competence. Batch 1's facility and professional forms
// stay on their own slots.
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { setSovereign, listMinistries, authorityFor } from '@/lib/data/store';
import { AUTHORITIES, REQUIRED_AUTHORITIES, HEALTH_SLOTS, checkDeployment, provisionalOwner } from './deployment';
import { CATALOGUE_CONTRACTS } from '@/lib/forms/library/catalogue-contracts';
import { libraryPublication, recordApproval, resetPublication } from '@/lib/forms/publication';
import { draftPackage, resetPackages } from '@/lib/casework/packages';
import { registeredEffects } from '@/lib/casework/engine';
import { asNationSets } from '@/lib/casework/testkit';
import { REFERENCE_BIRTH } from '@/lib/civil/procedures';
import { onboardingStatus } from '@/lib/onboarding/status';

let HEALTH = '', MEDICINES = '';
const env = (mode: string) => ({ NODE_ENV: 'test', CIVICOS_MODE: mode } as unknown as NodeJS.ProcessEnv);
const med = (id: string) => CATALOGUE_CONTRACTS.find(f => f.specId === id)!;
const pubOf = (id: string) => libraryPublication(med(id), 'its procedure');
const authorityGate = (id: string) => pubOf(id).automatic.find(g => g.id === 'authority')!;

describe('health responsibility slots', () => {
  beforeEach(() => {
    resetPublication(); resetPackages();
    const m = listMinistries();
    HEALTH = m[0]!.id; MEDICINES = m[1]!.id;
    setSovereign({ deployment: { authorities: { healthRegulation: HEALTH, professionalRegulation: HEALTH } } } as never, 'Administrator');
  });
  afterEach(() => { vi.unstubAllEnvs(); setSovereign({ deployment: { authorities: {} } } as never, 'Administrator'); });

  it('are slots of the deployment profile, optional and shipped empty, set through the same profile check', () => {
    for (const k of ['medicinesRegulation', 'controlledSubstances', 'publicHealth'] as const) {
      expect(AUTHORITIES.find(a => a.key === k), k).toMatchObject({ optional: true });
      expect(REQUIRED_AUTHORITIES.some(a => a.key === k)).toBe(false);
      expect(authorityFor(k)).toBeUndefined();
    }
    expect(HEALTH_SLOTS).toEqual(['medicinesRegulation', 'controlledSubstances', 'publicHealth']);
    expect(checkDeployment({ authorities: { medicinesRegulation: MEDICINES, publicHealth: '' } }, [MEDICINES])).toEqual({ authorities: { medicinesRegulation: MEDICINES } });
    setSovereign({ deployment: { authorities: { healthRegulation: HEALTH, medicinesRegulation: MEDICINES } } } as never, 'Administrator');
    expect(authorityFor('medicinesRegulation')).toBe(MEDICINES);
  });

  it('stand in provisionally, down the chain, and say so', () => {
    expect(provisionalOwner('medicinesRegulation', authorityFor)).toMatchObject({ slot: 'medicinesRegulation', actingSlot: 'healthRegulation', institution: HEALTH, provisional: expect.stringMatching(/^provisional: the nation has not named the medicines authority/) });
    expect(provisionalOwner('controlledSubstances', authorityFor)).toMatchObject({ actingSlot: 'healthRegulation', provisional: expect.stringMatching(/controlled-substances authority/) });
    expect(provisionalOwner('publicHealth', authorityFor)).toMatchObject({ actingSlot: 'healthRegulation', provisional: expect.stringMatching(/public-health authority/) });
    expect(provisionalOwner('healthRegulation', authorityFor)).toEqual({ slot: 'healthRegulation', actingSlot: 'healthRegulation', institution: HEALTH });
    setSovereign({ deployment: { authorities: { healthRegulation: HEALTH, medicinesRegulation: MEDICINES } } } as never, 'Administrator');
    expect(provisionalOwner('medicinesRegulation', authorityFor)).toEqual({ slot: 'medicinesRegulation', actingSlot: 'medicinesRegulation', institution: MEDICINES });
    // The controlled-substances slot now falls to the medicines regulator, still provisionally.
    expect(provisionalOwner('controlledSubstances', authorityFor)).toMatchObject({ actingSlot: 'medicinesRegulation', institution: MEDICINES, provisional: expect.any(String) });
    setSovereign({ deployment: { authorities: {} } } as never, 'Administrator');
    expect(provisionalOwner('medicinesRegulation', authorityFor)).toMatchObject({ provisional: expect.stringMatching(/no institution stands in/) });
    expect(provisionalOwner('medicinesRegulation', authorityFor).institution).toBeUndefined();
  });

  it('name the batch-2 forms and the public-health return; batch 1 keeps the health and professional regulators', () => {
    for (const f of CATALOGUE_CONTRACTS) {
      if (f.batch === 2) expect(f.owner, f.specId).toBe(f.specId === 'HLT-MED-014' ? 'controlledSubstances' : 'medicinesRegulation');
      else if (f.specId === 'HLT-PH-015') expect(f.owner).toBe('publicHealth');
      else expect(['healthRegulation', 'professionalRegulation'], f.specId).toContain(f.owner);
    }
    expect(med('HLT-FAC-002').owner).toBe('healthRegulation');
    expect(med('HLT-LIC-001').owner).toBe('professionalRegulation');
  });

  it('show the provisional owner on the publication and pass the competent-authority gate only outside production', () => {
    const demo = pubOf('HLT-MED-001');
    expect(demo.owner).toMatchObject({ slot: 'medicinesRegulation', provisional: expect.stringMatching(/^provisional: the nation has not named the medicines authority/) });
    expect(authorityGate('HLT-MED-001')).toMatchObject({ passed: true, notes: [expect.stringMatching(/provisional: the nation has not named the medicines authority/)] });
    vi.stubEnv('CIVICOS_MODE', 'production');
    expect(authorityGate('HLT-MED-001')).toMatchObject({ passed: false, detail: [expect.stringMatching(/provisional: the nation has not named the medicines authority.*production takes only the institution the nation names/)] });
    expect(authorityGate('HLT-PH-015')).toMatchObject({ passed: false, detail: [expect.stringMatching(/public-health authority/)] });
    // Batch 1's facility forms are on a named slot: no provisional owner.
    expect(pubOf('HLT-FAC-002').owner).toEqual({ slot: 'healthRegulation', actingSlot: 'healthRegulation', institution: HEALTH });
    // Once the nation names the medicines authority, nothing is provisional.
    setSovereign({ deployment: { authorities: { healthRegulation: HEALTH, medicinesRegulation: MEDICINES } } } as never, 'Administrator');
    expect(pubOf('HLT-MED-001').owner).toEqual({ slot: 'medicinesRegulation', actingSlot: 'medicinesRegulation', institution: MEDICINES });
    expect(authorityGate('HLT-MED-001').detail.join(' ')).not.toMatch(/provisional/);
  });

  it('never let anyone confirm a provisional owner as the competent authority', () => {
    const r = draftPackage({ ...asNationSets(REFERENCE_BIRTH), owner: 'medicinesRegulation', version: 1, reference: false } as never, 'Official rg', 'rg', registeredEffects());
    expect(r).not.toHaveProperty('error');
    const signer = { id: 'au', name: 'Official au', scope: { id: 'au', role: 'signatory' as const, institution: HEALTH } };
    expect(recordApproval('civil.birth', 1, { kind: 'authority', note: 'Confirmed' }, signer)).toMatchObject({ error: expect.stringMatching(/provisional: the nation has not named the medicines authority/) });
  });

  it('appear in the setup hub: provisional owners are not done in production', () => {
    const check = (mode: string) => onboardingStatus(env(mode)).tracks.find(t => t.key === 'institutions')!.checks.find(c => c.label.startsWith('Health bodies the forms name'))!;
    expect(check('demo')).toMatchObject({ done: true, detail: expect.stringMatching(/provisional: the nation has not named the medicines authority/) });
    expect(check('production')).toMatchObject({ done: false });
    setSovereign({ deployment: { authorities: { healthRegulation: HEALTH, medicinesRegulation: MEDICINES, controlledSubstances: MEDICINES, publicHealth: HEALTH } } } as never, 'Administrator');
    expect(check('production')).toMatchObject({ done: true, detail: 'Each named' });
  });
});
