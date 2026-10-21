import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { resetReadiness } from '@/lib/data/readiness';
import { stagingOff, cosign } from '@/lib/data/testkit';
import {
  resetUpdates, getChamber, decide, reportHealth, superviseProbations, updateSettings, nationRecord,
  simulatedHealthAllowed, effectiveHealthSource, HOME_NATION, HEALTH_CHECKS,
} from './updates';
import { resetSecurity } from './security-store';
import type { HealthCheck } from '@/lib/api/types';

// Step I0.1: a production installation's own nation never passes a probation
// on simulated health reports (docs/reviews/2026-10-institutional-baseline-audit.md §3.2).

const MIN = 60_000;
const ok = <T,>(r: T): Exclude<T, { error: string }> => { if (r && typeof r === 'object' && 'error' in r) throw new Error((r as { error: string }).error); return r as Exclude<T, { error: string }>; };
const healthy = (): HealthCheck[] => HEALTH_CHECKS.map(c => c.key === 'error-rate' ? { key: c.key, ok: true, value: 0.3 } : c.key === 'latency' ? { key: c.key, ok: true, value: 230 } : { key: c.key, ok: true });
const stateOf = (releaseId: string) => { const c = getChamber(HOME_NATION); if ('error' in c) throw new Error(c.error); return c.releases.find(r => r.id === releaseId)!.install; };

/** Install the security release 1.4.1 from the sample history, with the mode switched to production first. */
function installInProduction() {
  ok(cosign(HOME_NATION, 'DR-141', { action: 'approve', by: 'CIO' }));
  ok(decide(HOME_NATION, 'DR-141', { action: 'prepare', by: 'Ops' }));
  const r = ok(cosign(HOME_NATION, 'DR-141', { action: 'install', by: 'Ops', mode: 'self-hosted', verified: true }));
  return r.install.probation!;
}

beforeEach(() => {
  // The sample history (releases to install) is seeded in demo; the test then runs as production,
  // the way a snapshot taken in a demo run, still saying `simulated`, would be read.
  vi.stubEnv('CIVICOS_MODE', 'demo');
  resetUpdates(); resetReadiness(); stagingOff(); resetSecurity();
  vi.stubEnv('CIVICOS_MODE', 'production');
  vi.stubEnv('CIVICOS_RESTORE_POINTS', 'simulated'); // restore points are not the subject here
});
afterEach(() => { vi.unstubAllEnvs(); resetUpdates(); });

describe('production probation reads the deployment agent', () => {
  it('a new production installation starts with agent health reports', () => {
    resetUpdates();
    expect(nationRecord(HOME_NATION)!.settings.healthSource).toBe('agent');
  });

  it('only the publisher demonstration nations, demo/training, or the test override may simulate', () => {
    expect(simulatedHealthAllowed({ id: HOME_NATION })).toBe(false);
    expect(simulatedHealthAllowed({ id: 'sandbox' })).toBe(true);
    expect(simulatedHealthAllowed({ id: HOME_NATION }, { CIVICOS_MODE: 'training', NODE_ENV: 'test' } as NodeJS.ProcessEnv)).toBe(true);
    expect(simulatedHealthAllowed({ id: HOME_NATION }, { CIVICOS_MODE: 'production', NODE_ENV: 'test', CIVICOS_HEALTH_REPORTS: 'simulated' } as NodeJS.ProcessEnv)).toBe(true);
  });

  it('refuses switching the installed nation to simulated health in production', () => {
    const r = updateSettings(HOME_NATION, { healthSource: 'simulated' }, 'CIO');
    expect(r).toHaveProperty('error');
    if ('error' in r) expect(r.error).toMatch(/deployment agent/);
  });

  it('reads a stored `simulated` setting as `agent` and never passes on simulated reports', () => {
    expect(nationRecord(HOME_NATION)!.settings.healthSource).toBe('simulated'); // carried over from the demo seed
    expect(effectiveHealthSource(nationRecord(HOME_NATION)!)).toBe('agent');
    const c = getChamber(HOME_NATION);
    if (!('error' in c)) expect(c.nation.settings.healthSource).toBe('agent');
    const p = installInProduction();
    superviseProbations(Date.parse(p.endsAt) + MIN);
    const inst = stateOf('DR-141');
    expect(inst.probation!.reports.some(r => r.source === 'simulated')).toBe(false);
    expect(inst.probation!.state).not.toBe('passed');
    expect(inst.state).not.toBe('installed');
    // Missing agent reports follow the existing rules: silence, then fallback.
    expect(inst.probation!.reports.some(r => r.source === 'silence')).toBe(true);
  });

  it('one missing report marks the release degraded, not passed', () => {
    const p = installInProduction();
    const s = superviseProbations(Date.parse(p.startedAt) + 4 * MIN);
    expect(s.missingReports).toBe(1);
    expect(stateOf('DR-141').probation).toMatchObject({ state: 'running', degraded: true });
  });

  it('passes on the deployment agent\'s healthy reports', () => {
    ok(updateSettings(HOME_NATION, { probationMinutes: 5 }, 'CIO'));
    const p = installInProduction();
    const start = Date.parse(p.startedAt);
    for (let m = 1; m <= 4; m++) ok(reportHealth(HOME_NATION, { checks: healthy() }, start + m * MIN));
    superviseProbations(Date.parse(p.endsAt) + MIN);
    expect(stateOf('DR-141').probation!.state).toBe('passed');
    expect(stateOf('DR-141').probation!.reports.every(r => r.source === 'agent')).toBe(true);
  });
});
