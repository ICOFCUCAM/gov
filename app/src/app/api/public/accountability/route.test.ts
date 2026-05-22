import { describe, it, expect, vi, beforeEach } from 'vitest';

const serviceSlaStats = vi.fn();
const appealsStats = vi.fn();
const serviceSlaTrend = vi.fn();
vi.mock('@/lib/db/repos/institutions', () => ({
  serviceSlaStats: (o: unknown) => serviceSlaStats(o),
  appealsStats: (o: unknown) => appealsStats(o),
  serviceSlaTrend: (o: unknown) => serviceSlaTrend(o),
}));

import { GET } from './route';

beforeEach(() => {
  serviceSlaStats.mockReset().mockResolvedValue([{ charterId: 'MIN-H', submitted: 3 }]);
  appealsStats.mockReset().mockResolvedValue([{ charterId: 'MIN-H', filed: 1 }]);
  serviceSlaTrend.mockReset().mockResolvedValue([{ weekStart: '2026-05-11', resolved: 2 }]);
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
    expect(serviceSlaStats).toHaveBeenCalledWith({ charterId: undefined, days: 90 });
    // weeks ≈ round(90/7) = 13
    expect(serviceSlaTrend).toHaveBeenCalledWith({ charterId: undefined, weeks: 13 });
  });

  it('clamps the days window and forwards a charter filter', async () => {
    const res = await GET(new Request('http://x/api/public/accountability?days=9999&charter=MIN-X'));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.window_days).toBe(365);
    expect(json.charter).toBe('MIN-X');
    expect(appealsStats).toHaveBeenCalledWith({ charterId: 'MIN-X', days: 365 });
  });

  it('sets a short public cache header', async () => {
    const res = await GET(new Request('http://x/api/public/accountability'));
    expect(res.headers.get('cache-control')).toContain('max-age=300');
  });
});
