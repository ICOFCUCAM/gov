// What a profession's public check shows changes only by two officials citing the law.
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { resetProfessions, profession, defineProfession, proposeDisclosure, confirmDisclosure, withdrawDisclosure, disclosureChanges } from './register';
import { recordVersion, confirmVersion, resetLaw } from '@/lib/law/register';

const law = () => {
  const v = recordVersion({ instrument: { title: 'Medical Practitioners Act', type: 'act', jurisdiction: 'X', year: 2020, number: '4', issuingAuthority: 'Parliament' }, dates: { inForce: '2020-01-01' }, provisions: [{ eId: 'sec_12', num: '12', text: 'The public register shows conditions.' }] }, 'L1', 'l1');
  if ('error' in v) throw new Error(v.error);
  confirmVersion(v.instrument.id, v.version.id, 'L2', 'l2');
  return [{ instrument: v.instrument.id, eId: 'sec_12' }];
};

describe('what the public professional check shows', () => {
  beforeEach(() => { resetProfessions(); resetLaw(); });
  afterEach(() => vi.unstubAllEnvs());

  it('is proposed citing the law and applies only once a different official confirms; earlier versions kept', () => {
    const key = 'medical-practitioner';
    expect(proposeDisclosure(key, ['name', 'state', 'conditions'], [], 'Admin A', 'a')).toMatchObject({ error: expect.stringMatching(/laws register/) });
    const basis = law();
    expect(proposeDisclosure(key, ['number'], basis, 'Admin A', 'a')).toMatchObject({ error: expect.stringMatching(/name and the standing/) });
    expect(proposeDisclosure(key, ['name', 'number', 'profession', 'state', 'validUntil', 'conditions'], basis, 'Admin A', 'a')).toHaveProperty('expiresAt');
    expect(profession(key)!.publicFields ?? []).not.toContain('conditions');
    expect(confirmDisclosure(key, 'Admin A', 'a')).toMatchObject({ error: expect.stringMatching(/second, different official/) });
    expect(confirmDisclosure(key, 'Admin B', 'b')).toHaveProperty('confirmed');
    expect(profession(key)!.publicFields).toContain('conditions');
    proposeDisclosure(key, ['name', 'state'], basis, 'Admin A', 'a');
    withdrawDisclosure(key, 'Admin A');
    expect(disclosureChanges(key).history!.map(h => h.outcome)).toEqual(['adopted', 'withdrawn']);
  });

  it('cannot be changed by redefining the profession, and a new one starts with the default in production', () => {
    expect(defineProfession({ key: 'medical-practitioner', title: 'Medical practitioners', authority: 'healthRegulation', publicFields: ['name', 'state', 'conditions'] }, 'Admin')).toMatchObject({ error: expect.stringMatching(/two officials citing the law/) });
    vi.stubEnv('CIVICOS_MODE', 'production');
    const p = defineProfession({ key: 'optometrist', title: 'Optometrists', authority: 'healthRegulation', publicFields: ['name', 'state', 'conditions'] }, 'Admin');
    if ('error' in p) throw new Error(p.error);
    expect(p.publicFields).not.toContain('conditions');
  });
});
