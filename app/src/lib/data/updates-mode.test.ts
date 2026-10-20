import { describe, it, expect, afterEach, vi } from 'vitest';
import { listAdvisories, resetAdvisories } from './advisories';
import { listOfficials, resetComms } from './comms';
import { listTickets, resetSupport } from './support';
import { listOrders, resetSecurity } from './security-store';
import { listReviews, resetSupplyChain } from './supply-chain';
import { resetUpdates, getChamber, listRequests, nationRecord, runningVersion, HOME_NATION } from './updates';

// The Update Center's sample history (releases 1.3.0-1.5.0, the sandbox tenant,
// advisories, tickets, orders, officials, escrow reviews)
// exists only in demo and training installations (lib/ops/mode.ts).
describe('Update Center seed by installation mode', () => {
  const resetAll = () => { resetUpdates(); resetAdvisories(); resetComms(); resetSupport(); resetSecurity(); resetSupplyChain(); };
  afterEach(() => { vi.unstubAllEnvs(); resetAll(); });

  it('starts a production installation with its own nation, on the version it runs, and nothing else', () => {
    vi.stubEnv('CIVICOS_MODE', 'production');
    vi.stubEnv('CIVICOS_VERSION', '2.3.4');
    resetAll();
    expect(runningVersion()).toBe('2.3.4');
    const n = nationRecord(HOME_NATION)!;
    expect(n.installedVersion).toBe('2.3.4');
    expect(n.installedReleaseId).toBeUndefined();
    expect(nationRecord('sandbox')).toBeUndefined();
    expect(listRequests(HOME_NATION)).toEqual([]);
    const c = getChamber(HOME_NATION);
    expect('error' in c).toBe(false);
    expect(listAdvisories()).toEqual([]);
    expect(listOfficials(HOME_NATION)).toEqual([]);
    expect(listTickets(HOME_NATION)).toEqual([]);
    expect(listOrders(HOME_NATION)).toEqual([]);
    expect(listReviews(HOME_NATION)).toEqual([]);
  });

  it('keeps the sample history in a demo installation', () => {
    vi.stubEnv('CIVICOS_MODE', 'demo');
    resetAll();
    expect(nationRecord(HOME_NATION)?.installedReleaseId).toBe('DR-140');
    expect(listRequests(HOME_NATION).length).toBeGreaterThan(0);
    expect(listAdvisories().length).toBeGreaterThan(0);
    expect(listTickets(HOME_NATION).length).toBeGreaterThan(0);
  });
});
