import { describe, it, expect, vi, beforeEach } from 'vitest';

const serviceSlaStats = vi.fn();
const appealsStats = vi.fn();
const serviceSlaTrend = vi.fn();
const appealsTrend = vi.fn();
const consentFootprintStats = vi.fn();
vi.mock('@/lib/db/repos/institutions', () => ({
  serviceSlaStats: (o: unknown) => serviceSlaStats(o),
  appealsStats: (o: unknown) => appealsStats(o),
  serviceSlaTrend: (o: unknown) => serviceSlaTrend(o),
  appealsTrend: (o: unknown) => appealsTrend(o),
  consentFootprintStats: (o: unknown) => consentFootprintStats(o),
}));

import { GET } from './route';
import { resetDirectives, draftDirective, signDirective } from '@/lib/data/directives';

beforeEach(() => {
  serviceSlaStats.mockReset().mockResolvedValue([{ charterId: 'MIN-H', submitted: 3 }]);
  appealsStats.mockReset().mockResolvedValue([{ charterId: 'MIN-H', filed: 1 }]);
  serviceSlaTrend.mockReset().mockResolvedValue([{ weekStart: '2026-05-11', resolved: 2 }]);
  appealsTrend.mockReset().mockResolvedValue([{ weekStart: '2026-05-11', decided: 1 }]);
  consentFootprintStats.mockReset().mockResolvedValue([{ charterId: 'MIN-H', scope: 'health.records', active: 2 }]);
  // Governance output comes from the platform's directives register (review D8).
  resetDirectives();
  draftDirective({ ref: 'DIR-ACC-1', issuedByCharterId: 'presidency', title: 'One', by: 'Test Official' });
  signDirective('DIR-ACC-1', 'Test Official', new Date(Date.now() - 1000).toISOString());
  draftDirective({ ref: 'DIR-ACC-2', issuedByCharterId: 'presidency', title: 'Draft only', by: 'Test Official' });
});

describe('GET /api/public/accountability', () => {
  it('returns the three aggregates with the default 90-day window', async () => {
    const res = await GET(new Request('http://x/api/public/accountability'));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.document).toBe('civicos.public_accountability');
    expect(json.window_days).toBe(90);
    expect(json.charter).toBeNull();
    expect(json.service_sla).toHaveLength(1);
    expect(json.appeals).toHaveLength(1);
    expect(json.sla_trend).toHaveLength(1);
    expect(json.appeals_trend).toHaveLength(1);
    expect(json.consent_footprint).toHaveLength(1);
    // Signed only: the draft never counts.
    expect(json.directive_stats).toEqual([expect.objectContaining({ charterId: 'presidency', signed: 1, effective: 1, inForce: 1, rescinded: 0 })]);
    expect(json.directive_trend).toHaveLength(1);
    expect(json.directive_trend[0].signed).toBe(1);
    expect(json.directive_source).toMatchObject({ kind: 'reported', source: expect.stringContaining('Directives register') });
    expect(serviceSlaStats).toHaveBeenCalledWith({ charterId: undefined, days: 90 });
    // weeks ≈ round(90/7) = 13
    expect(serviceSlaTrend).toHaveBeenCalledWith({ charterId: undefined, weeks: 13 });
    expect(appealsTrend).toHaveBeenCalledWith({ charterId: undefined, weeks: 13 });
    expect(consentFootprintStats).toHaveBeenCalledWith({ charterId: undefined });
  });

  it('clamps the days window and forwards a charter filter', async () => {
    const res = await GET(new Request('http://x/api/public/accountability?days=9999&charter=MIN-X'));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.window_days).toBe(365);
    expect(json.charter).toBe('MIN-X');
    expect(appealsStats).toHaveBeenCalledWith({ charterId: 'MIN-X', days: 365 });
  });

  it('answers the governance output alone with ?only=directives, scoped to a charter', async () => {
    const json = await (await GET(new Request('http://x/api/public/accountability?only=directives&charter=senate&weeks=12'))).json();
    expect(json.directive_stats).toEqual([]);
    expect(json.directive_trend).toEqual([]);
    expect(json.service_sla).toBeUndefined();
    expect(serviceSlaStats).not.toHaveBeenCalled();
    const mine = await (await GET(new Request('http://x/api/public/accountability?only=directives&charter=presidency'))).json();
    expect(mine.directive_stats[0].signed).toBe(1);
  });

  it('sets a short public cache header', async () => {
    const res = await GET(new Request('http://x/api/public/accountability'));
    expect(res.headers.get('cache-control')).toContain('max-age=300');
  });
});
