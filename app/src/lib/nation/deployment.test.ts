import { describe, it, expect } from 'vitest';
import { checkDeployment, moduleRuns, calendarOf, DEFAULT_CALENDAR, authorityIn } from './deployment';
import { setSovereign, getSovereign, authorityFor, listMinistries } from '@/lib/data/store';

describe('deployment profile', () => {
  const ids = ['min-interior', 'min-justice'];

  it('names an existing institution for each register and refuses others', () => {
    expect(checkDeployment({ authorities: { civilRegistration: 'min-interior' } }, ids)).toEqual({ authorities: { civilRegistration: 'min-interior' } });
    expect(checkDeployment({ authorities: { civilRegistration: 'nowhere' } }, ids)).toHaveProperty('error');
    expect(checkDeployment({ authorities: { parliament: 'min-interior' } }, ids)).toHaveProperty('error');
    // An empty value clears the register's authority.
    expect(checkDeployment({ authorities: { civilRegistration: '' } }, ids)).toEqual({ authorities: {} });
  });

  it('checks modules, calendar, identity and signatures', () => {
    expect(checkDeployment({ modules: { civil: { enabled: true, source: 'external', system: 'opencrvs' } } }, ids)).toEqual({ modules: { civil: { enabled: true, source: 'external', system: 'opencrvs' } } });
    expect(checkDeployment({ modules: { civil: { enabled: true, source: 'external' } } }, ids)).toHaveProperty('error');
    expect(checkDeployment({ calendar: { workingDays: [5, 1, 2, 3, 4], holidays: [{ date: '2026-12-25', name: 'Holiday' }] } }, ids)).toEqual({ calendar: { workingDays: [1, 2, 3, 4, 5], holidays: [{ date: '2026-12-25', name: 'Holiday' }] } });
    expect(checkDeployment({ calendar: { workingDays: [7] } }, ids)).toHaveProperty('error');
    expect(checkDeployment({ identity: { assisted: true, citizens: { issuer: 'http://id.example', clientId: 'x' } } }, ids)).toHaveProperty('error');
    expect(checkDeployment({ identity: { assisted: false, citizens: { issuer: 'https://id.example/realm/', clientId: 'civicos' } } }, ids)).toEqual({ identity: { assisted: false, citizens: { issuer: 'https://id.example/realm', clientId: 'civicos' } } });
    expect(checkDeployment({ signature: { framework: 'qualified' } }, ids)).toHaveProperty('error');
  });

  it('runs a module once its authority is named, unless turned off', () => {
    expect(moduleRuns({}, 'civil')).toBe(false);
    expect(moduleRuns({ authorities: { civilRegistration: 'x' } }, 'civil')).toBe(true);
    expect(moduleRuns({ authorities: { civilRegistration: 'x' }, modules: { civil: { enabled: false, source: 'civicos' } } }, 'civil')).toBe(false);
    expect(calendarOf(undefined)).toBe(DEFAULT_CALENDAR);
    expect(authorityIn(undefined, 'police')).toBeUndefined();
  });

  it('is kept in the nation profile, part by part, through setSovereign', () => {
    const inst = listMinistries()[0]!.id;
    expect(setSovereign({ deployment: { authorities: { civilRegistration: inst } } }, 'test')).not.toHaveProperty('error');
    expect(setSovereign({ deployment: { signature: { framework: 'platform' } } }, 'test')).not.toHaveProperty('error');
    expect(getSovereign().deployment).toMatchObject({ authorities: { civilRegistration: inst }, signature: { framework: 'platform' } });
    expect(authorityFor('civilRegistration')).toBe(inst);
    expect(setSovereign({ deployment: { authorities: { civilRegistration: 'nowhere' } } }, 'test')).toHaveProperty('error');
  });
});
