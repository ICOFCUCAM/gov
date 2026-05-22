import { describe, it, expect, vi, beforeEach } from 'vitest';

const publicClientMock = vi.fn();
vi.mock('@/lib/db/client', () => ({
  publicClient: () => publicClientMock(),
  substrateAvailable: () => publicClientMock() != null,
}));

import { serviceSlaStats } from './institutions';

beforeEach(() => publicClientMock.mockReset());

describe('serviceSlaStats', () => {
  it('returns [] when the substrate is unavailable', async () => {
    publicClientMock.mockReturnValue(null);
    expect(await serviceSlaStats()).toEqual([]);
  });

  it('maps aggregate rows to camelCase, coercing numeric strings and nulls', async () => {
    const rpc = vi.fn(async () => ({
      data: [{
        charter_id: 'MIN-H', submitted: 4, acknowledged: 2, resolved: 3, open: 1,
        median_ack_hours: '1.0', median_resolve_hours: '4.0', p90_resolve_hours: '8.8',
        oldest_open_hours: '50.0',
      }, {
        charter_id: 'MIN-X', submitted: 1, acknowledged: 0, resolved: 0, open: 1,
        median_ack_hours: null, median_resolve_hours: null, p90_resolve_hours: null,
        oldest_open_hours: '12.0',
      }],
      error: null,
    }));
    publicClientMock.mockReturnValue({ rpc });
    const out = await serviceSlaStats({ days: 90 });
    expect(rpc).toHaveBeenCalledWith('civicos_service_sla_stats', { p_charter_id: null, p_days: 90 });
    expect(out[0]).toEqual({
      charterId: 'MIN-H', submitted: 4, acknowledged: 2, resolved: 3, open: 1,
      medianAckHours: 1, medianResolveHours: 4, p90ResolveHours: 8.8, oldestOpenHours: 50,
    });
    // nulls preserved (not coerced to 0)
    expect(out[1]!.medianAckHours).toBeNull();
    expect(out[1]!.medianResolveHours).toBeNull();
    expect(out[1]!.oldestOpenHours).toBe(12);
  });

  it('forwards a charter filter', async () => {
    const rpc = vi.fn(async () => ({ data: [], error: null }));
    publicClientMock.mockReturnValue({ rpc });
    await serviceSlaStats({ charterId: 'MIN-H', days: 30 });
    expect(rpc).toHaveBeenCalledWith('civicos_service_sla_stats', { p_charter_id: 'MIN-H', p_days: 30 });
  });

  it('returns [] on RPC error', async () => {
    publicClientMock.mockReturnValue({
      rpc: async () => ({ data: null, error: { message: 'boom' } }),
    });
    expect(await serviceSlaStats()).toEqual([]);
  });
});
