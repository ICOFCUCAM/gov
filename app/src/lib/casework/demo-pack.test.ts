import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { setSovereign, listMinistries } from '@/lib/data/store';
import { resetLaw } from '@/lib/law/register';
import { resetPackages } from './packages';
import { resetCases, listCases } from './engine';
import { resetOfficials, listAccounts } from '@/lib/auth/officials';
import { loadDemoPack } from './demo-pack';
import './modules';

describe('the demo data pack', () => {
  beforeEach(() => {
    resetLaw(); resetPackages(); resetCases(); resetOfficials();
    const [a, b] = listMinistries().slice(0, 2).map(m => m.id);
    setSovereign({ deployment: { authorities: { civilRegistration: a!, businessRegister: a!, higherEducationAccreditation: b! } } }, 'Administrator');
  });
  afterEach(() => { vi.unstubAllEnvs(); });

  it('creates the cast, approves the sample procedures and opens one sample case per procedure through the engine', () => {
    const r = loadDemoPack('Administrator');
    if ('error' in r) throw new Error(r.error);
    expect(listAccounts().some(a => a.demo)).toBe(true);
    expect(r.cases.length).toBeGreaterThan(0);
    const cases = listCases({ open: true });
    expect(cases.length).toBe(r.cases.length);
    for (const c of cases) {
      expect(c.source).toBe('sample');
      // Opened by the institution's demo officer, who is assigned to it; nothing decided.
      expect(c.history).toHaveLength(1);
      expect(c.history[0]!.by.name).toMatch(/\(sample\)/);
      expect(c.assignee?.name).toMatch(/\(sample\)/);
    }
  });

  it('opens no second sample case for a procedure on a repeat', () => {
    const first = loadDemoPack('Administrator');
    if ('error' in first) throw new Error(first.error);
    const again = loadDemoPack('Administrator');
    if ('error' in again) throw new Error(again.error);
    expect(again.cases).toHaveLength(0);
    expect(listCases({ open: true })).toHaveLength(first.cases.length);
  });

  it('is refused on a production installation', () => {
    vi.stubEnv('CIVICOS_MODE', 'production');
    expect(loadDemoPack('Administrator')).toEqual({ error: expect.stringMatching(/production/) });
    expect(listCases({})).toHaveLength(0);
  });

  it('says what is missing instead of choosing who is responsible', () => {
    setSovereign({ deployment: { authorities: {} } }, 'Administrator');
    expect(loadDemoPack('Administrator')).toEqual({ error: expect.stringMatching(/Who is responsible/) });
  });
});
