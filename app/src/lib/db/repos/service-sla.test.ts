import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const publicClientMock = vi.fn();
vi.mock('@/lib/db/client', () => ({
  publicClient: () => publicClientMock(),
  substrateAvailable: () => publicClientMock() != null,
}));

import { serviceSlaStats, appealsStats, serviceSlaTrend, appealsTrend, consentFootprintStats, directiveStats, directiveTrend, directiveFigures, institutionByCharterId } from './institutions';

beforeEach(() => publicClientMock.mockReset());

// The register's reads go to the platform (review D8), never the substrate's mirror.
function stubPlatform(body: unknown, status = 200): string[] {
  const urls: string[] = [];
  vi.stubGlobal('window', {});
  vi.stubGlobal('fetch', vi.fn(async (url: string) => { urls.push(url); return new Response(JSON.stringify(body), { status }); }));
  return urls;
}
afterEach(() => vi.unstubAllGlobals());

describe('institutionByCharterId', () => {
  it('returns null on the server (server code reads the register directly)', async () => {
    expect(await institutionByCharterId('MIN-H')).toBeNull();
  });

  it('reads the platform register by charter id, never civicos_institutions', async () => {
    const from = vi.fn();
    publicClientMock.mockReturnValue({ from });
    const urls = stubPlatform({ charters: [{ charter_id: 'ministry-health', label: 'Health', kind: 'ministry', domain: 'health', archetype_or_branch: 'HEALTH', activated: true, activated_at: '2026-01-01T00:00:00Z', registered_at: '2026-01-01T00:00:00Z' }] });
    const out = await institutionByCharterId('ministry-health');
    expect(from).not.toHaveBeenCalled();
    expect(urls[0]).toBe('/api/public/charters?activated=any&charter=ministry-health');
    expect(out).toMatchObject({ id: 'ministry-health', charter_id: 'ministry-health', label: 'Health', activated: true, activated_at: '2026-01-01T00:00:00Z', grammar: null });
  });

  it('returns null when absent or the platform refuses', async () => {
    stubPlatform({ charters: [] });
    expect(await institutionByCharterId('NOPE')).toBeNull();
    stubPlatform({ error: 'no' }, 500);
    expect(await institutionByCharterId('NOPE')).toBeNull();
  });
});

describe('serviceSlaTrend', () => {
  it('returns [] when the substrate is unavailable', async () => {
    publicClientMock.mockReturnValue(null);
    expect(await serviceSlaTrend()).toEqual([]);
  });

  it('maps weekly buckets and forwards the window', async () => {
    const rpc = vi.fn(async () => ({
      data: [
        { week_start: '2026-05-04', resolved: 2, median_resolve_hours: '36.0', p90_resolve_hours: '46.0' },
        { week_start: '2026-05-11', resolved: 1, median_resolve_hours: '24.0', p90_resolve_hours: '24.0' },
      ],
      error: null,
    }));
    publicClientMock.mockReturnValue({ rpc });
    const out = await serviceSlaTrend({ weeks: 12 });
    expect(rpc).toHaveBeenCalledWith('civicos_service_sla_trend', { p_charter_id: null, p_weeks: 12 });
    expect(out).toHaveLength(2);
    expect(out[0]).toEqual({ weekStart: '2026-05-04', resolved: 2, medianResolveHours: 36, p90ResolveHours: 46 });
  });

  it('forwards a charter filter', async () => {
    const rpc = vi.fn(async () => ({ data: [], error: null }));
    publicClientMock.mockReturnValue({ rpc });
    await serviceSlaTrend({ charterId: 'MIN-H', weeks: 8 });
    expect(rpc).toHaveBeenCalledWith('civicos_service_sla_trend', { p_charter_id: 'MIN-H', p_weeks: 8 });
  });

  it('returns [] on RPC error', async () => {
    publicClientMock.mockReturnValue({ rpc: async () => ({ data: null, error: { message: 'boom' } }) });
    expect(await serviceSlaTrend()).toEqual([]);
  });
});

describe('directiveStats / directiveTrend', () => {
  const body = {
    directive_stats: [{ charterId: 'MIN-J', signed: 4, effective: 3, inForce: 1, rescinded: 1, medianSignToEffectiveDays: 4 }],
    directive_trend: [{ weekStart: '2026-05-04', signed: 3, effective: 2, medianSignToEffectiveDays: 3 }],
    directive_source: { kind: 'reported', source: 'Directives register (platform, /api/directives)', asOf: '2026-05-12T00:00:00Z' },
  };

  it('return [] on the server', async () => {
    expect(await directiveStats()).toEqual([]);
    expect(await directiveTrend()).toEqual([]);
  });

  it('read the platform figures with the window forwarded, never the substrate RPCs', async () => {
    const rpc = vi.fn();
    publicClientMock.mockReturnValue({ rpc });
    const urls = stubPlatform(body);
    expect(await directiveStats({ charterId: 'MIN-J', days: 365 })).toEqual(body.directive_stats);
    expect(await directiveTrend({ charterId: 'MIN-J', weeks: 8 })).toEqual(body.directive_trend);
    expect(rpc).not.toHaveBeenCalled();
    expect(urls[0]).toBe('/api/public/accountability?only=directives&directive_days=365&weeks=12&charter=MIN-J');
    expect(urls[1]).toBe('/api/public/accountability?only=directives&directive_days=365&weeks=8&charter=MIN-J');
  });

  it('say where the figures come from', async () => {
    stubPlatform(body);
    expect((await directiveFigures()).source).toMatchObject({ kind: 'reported' });
  });

  it('return [] when the platform refuses', async () => {
    stubPlatform({ error: 'boom' }, 500);
    expect(await directiveStats()).toEqual([]);
    expect(await directiveTrend()).toEqual([]);
  });
});
