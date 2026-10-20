import { describe, it, expect, afterEach, vi } from 'vitest';
import { resetUpdates, getChamber, listRequests, nationRecord, runningVersion, HOME_NATION } from './updates';

// The Update Center's sample history (releases 1.3.0-1.5.0, the sandbox tenant)
// exists only in demo and training installations (lib/ops/mode.ts).
describe('Update Center seed by installation mode', () => {
  afterEach(() => { vi.unstubAllEnvs(); resetUpdates(); });

  it('starts a production installation with its own nation, on the version it runs, and nothing else', () => {
    vi.stubEnv('CIVICOS_MODE', 'production');
    vi.stubEnv('CIVICOS_VERSION', '2.3.4');
    resetUpdates();
    expect(runningVersion()).toBe('2.3.4');
    const n = nationRecord(HOME_NATION)!;
    expect(n.installedVersion).toBe('2.3.4');
    expect(n.installedReleaseId).toBeUndefined();
    expect(nationRecord('sandbox')).toBeUndefined();
    expect(listRequests(HOME_NATION)).toEqual([]);
    const c = getChamber(HOME_NATION);
    expect('error' in c).toBe(false);
  });

  it('keeps the sample history in a demo installation', () => {
    vi.stubEnv('CIVICOS_MODE', 'demo');
    resetUpdates();
    expect(nationRecord(HOME_NATION)?.installedReleaseId).toBe('DR-140');
    expect(listRequests(HOME_NATION).length).toBeGreaterThan(0);
  });
});
