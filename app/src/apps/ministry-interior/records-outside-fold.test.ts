// The interior application's record screens stand outside the simulation
// fold, and its census figures are read, never typed (audit B A1 and §4.1;
// acceptance P0-06).
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { isRecordDomain, RECORD_SURFACES } from './core/domains';
import { censusLines } from './domains/PopulationAnalytics';

const units = [{ code: 'XX-01' }, { code: 'XX-02' }, { code: 'XX-03' }];
const obs = (codes: string[], year = '2026') => codes.map((c, i) => ({ entityId: `place:${c}`, value: 1_000_000 * (i + 1), validFrom: `${year}-01-01` }));
const sample = { popM: 54.2, seedYear: 2019 };

describe('interior record screens', () => {
  it('the civil register, permits and population screens (and their legacy keys) are record screens; the rest stay in the fold', () => {
    expect([...RECORD_SURFACES].sort()).toEqual(['civil-registry', 'permits', 'population']);
    for (const k of ['civil-registry', 'population', 'permits', 'licensing']) expect(isRecordDomain(k), k).toBe(true);
    for (const k of ['national-overview', 'interior-command', 'regional', null, 'no-such-key']) expect(isRecordDomain(k), String(k)).toBe(false);
  });

  it('the application host renders a record screen above the simulation fold, folding the shell\'s own generated chrome', () => {
    const host = readFileSync(join(__dirname, '..', 'AppHost.tsx'), 'utf8');
    const outside = host.indexOf('recordsView />');
    expect(outside).toBeGreaterThan(0);
    expect(outside).toBeLessThan(host.indexOf('<SimulatedView mode={mode}>'));
  });
});

describe('census intelligence', () => {
  it('in production says Not connected for what nothing observes, never a typed or generated figure', () => {
    const lines = censusLines(units, [], false, sample);
    expect(lines.every(l => l.kind === 'unavailable' && l.value === 'Not connected')).toBe(true);
    expect(JSON.stringify(lines)).not.toMatch(/82\.11M|19\.36M|58,742|2020|99\.2%|54\.2/);
  });

  it('reads the observed population: the national total only when every region reports', () => {
    const some = censusLines(units, obs(['XX-01', 'XX-02']), false, sample);
    expect(some.find(l => l.label === 'Regions reporting')).toMatchObject({ value: '2 of 3', kind: 'observed' });
    expect(some.find(l => l.label === 'Latest year observed')).toMatchObject({ value: '2026', kind: 'observed' });
    expect(some.find(l => /Population/.test(l.label))).toMatchObject({ value: 'Not connected', kind: 'unavailable' });
    const all = censusLines(units, obs(['XX-01', 'XX-02', 'XX-03']), false, sample);
    expect(all.find(l => l.label === 'Population enumerated')).toMatchObject({ value: '6.00M', kind: 'observed' });
  });

  it('in demo and training marks generated figures Sample', () => {
    const lines = censusLines(units, [], true, sample);
    expect(lines.every(l => l.kind === 'sample')).toBe(true);
    expect(lines.find(l => l.label === 'Population enumeration')?.value).toBe('54.2M');
  });

  it('the screen types no census figure or year', () => {
    const src = readFileSync(join(__dirname, 'domains', 'PopulationAnalytics.tsx'), 'utf8');
    for (const typed of ["'82.11M'", "'19.36M'", "'58,742'", "'2020'", "'99.2%'"]) expect(src, typed).not.toContain(typed);
  });
});
