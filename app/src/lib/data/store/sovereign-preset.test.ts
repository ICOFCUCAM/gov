import { describe, expect, it } from 'vitest';
import { applySovereignPreset, getSovereign, setSovereign, authorityFor } from './sovereign';
import { listMinistries } from './ministries';

describe('a sovereign preset', () => {
  it('keeps who is responsible for each register, the languages and the assistant choice', () => {
    const [court, dp] = listMinistries().filter(m => m.status === 'active').map(m => m.id);
    const set = setSovereign({ deployment: { authorities: { judiciary: court!, dataProtection: dp! } }, aiAssistant: false } as never, 'test');
    expect('error' in set).toBe(false);
    const r = applySovereignPreset('presidential-republic', 'test');
    expect('error' in r).toBe(false);
    expect(authorityFor('judiciary')).toBe(court);
    expect(authorityFor('dataProtection')).toBe(dp);
    expect(getSovereign().aiAssistant).toBe(false);
    expect(getSovereign().executiveTitle).toBe('President');
  });
});

describe('after setup (plan phases 0 and 2)', () => {
  it('refuses a preset, and changes who is responsible only by proposal citing the law and a second official', async () => {
    const { completeSetup, PRESET_AFTER_SETUP, AUTHORITIES_AFTER_SETUP, proposeAuthorities, confirmAuthorities, authorityChanges } = await import('./sovereign');
    const { db } = await import('./state');
    const { recordVersion, confirmVersion } = await import('@/lib/law/register');
    const [a, b] = listMinistries().filter(m => m.status === 'active').map(m => m.id);
    // During setup who is responsible is saved directly, as before.
    expect('error' in setSovereign({ deployment: { authorities: { judiciary: a! } } } as never, 'setup')).toBe(false);
    expect(proposeAuthorities({ authorities: { judiciary: b! }, legalBasis: [] }, { by: 'A' })).toMatchObject({ error: expect.stringMatching(/Setup is still running/) });
    completeSetup('Admin A');
    try {
      const before = getSovereign().stateForm;
      expect(applySovereignPreset('emirate', 'Admin A')).toEqual({ error: PRESET_AFTER_SETUP });
      expect(getSovereign().stateForm).toBe(before);
      // A direct change is refused; resending the same names (setup reviewed later) is not a change.
      expect(setSovereign({ deployment: { authorities: { judiciary: b! } } } as never, 'Admin A')).toEqual({ error: AUTHORITIES_AFTER_SETUP });
      expect('error' in setSovereign({ deployment: { authorities: { judiciary: a!, dataProtection: '' } } } as never, 'Admin A')).toBe(false);
      expect(authorityFor('judiciary')).toBe(a);
      const law = recordVersion({ instrument: { title: 'Judicature Act', type: 'act', jurisdiction: 'X', year: 2021, number: '2', issuingAuthority: 'Parliament' }, dates: { inForce: '2021-01-01' }, provisions: [{ eId: 'sec_2', num: '2', text: 'The courts.' }] }, 'L1', 'l1');
      if ('error' in law) throw new Error(law.error);
      confirmVersion(law.instrument.id, law.version.id, 'L2', 'l2');
      const cite = [{ instrument: law.instrument.id, eId: 'sec_2' }];
      expect(proposeAuthorities({ authorities: { judiciary: b! }, legalBasis: [] }, { by: 'Admin A', byId: 'local:a' })).toMatchObject({ error: expect.stringMatching(/laws register/) });
      expect(proposeAuthorities({ authorities: { legislature: 'nowhere' }, legalBasis: cite }, { by: 'Admin A', byId: 'local:a' })).toMatchObject({ error: expect.stringMatching(/No institution/) });
      expect(proposeAuthorities({ authorities: { judiciary: b! }, legalBasis: cite }, { by: 'Admin A', byId: 'local:a' })).toHaveProperty('expiresAt');
      expect(authorityFor('judiciary')).toBe(a);
      expect(confirmAuthorities({ by: 'Admin A', byId: 'local:a' })).toMatchObject({ error: expect.stringMatching(/different/) });
      expect(confirmAuthorities({ by: 'Admin B', byId: 'local:b' })).toHaveProperty('confirmed');
      expect(authorityFor('judiciary')).toBe(b);
      expect(authorityChanges().history?.[0]).toMatchObject({ outcome: 'adopted', by: 'Admin A', confirmed: { by: 'Admin B' } });
    } finally {
      db.setup = null;
    }
  });
});
