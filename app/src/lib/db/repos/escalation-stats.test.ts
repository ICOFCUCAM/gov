import { describe, it, expect, vi, beforeEach } from 'vitest';

const publicClientMock = vi.fn();
vi.mock('@/lib/db/client', () => ({
  publicClient: () => publicClientMock(),
  substrateAvailable: () => publicClientMock() != null,
}));

import { escalationResponseStats, escalationResponseTrend, postureStats, postureTrend, dispatchResponseStats, dispatchResponseTrend } from './memory';

beforeEach(() => publicClientMock.mockReset());

describe('dispatchResponseStats', () => {
  it('returns [] when the substrate is unavailable', async () => {
    publicClientMock.mockReturnValue(null);
    expect(await dispatchResponseStats()).toEqual([]);
  });

  it('maps rows to camelCase, coercing nulls, and forwards options', async () => {
    const rpc = vi.fn(async () => ({
      data: [{
        charter_id: 'POLICE', total: 5, acknowledged: 4, on_scene: 3, closed: 2, open: 3,
        median_ack_minutes: '2.5', median_on_scene_minutes: '11.0', median_close_hours: '1.5',
        oldest_open_hours: '8.0',
      }],
      error: null,
    }));
    publicClientMock.mockReturnValue({ rpc });
    const out = await dispatchResponseStats({ charterId: 'POLICE', days: 30 });
    expect(rpc).toHaveBeenCalledWith('civicos_dispatch_response_stats', { p_charter_id: 'POLICE', p_days: 30 });
    expect(out[0]).toEqual({
      charterId: 'POLICE', total: 5, acknowledged: 4, onScene: 3, closed: 2, open: 3,
      medianAckMinutes: 2.5, medianOnSceneMinutes: 11, medianCloseHours: 1.5, oldestOpenHours: 8,
    });
  });

  it('returns [] on RPC error', async () => {
    publicClientMock.mockReturnValue({ rpc: async () => ({ data: null, error: { message: 'boom' } }) });
    expect(await dispatchResponseStats()).toEqual([]);
  });
});

describe('dispatchResponseTrend', () => {
  it('returns [] when the substrate is unavailable', async () => {
    publicClientMock.mockReturnValue(null);
    expect(await dispatchResponseTrend()).toEqual([]);
  });

  it('maps weekly buckets and forwards the window', async () => {
    const rpc = vi.fn(async () => ({
      data: [
        { week_start: '2026-05-04', closed: 3, median_ack_minutes: '60.0', median_on_scene_minutes: '90.0', median_close_hours: '3.0' },
        { week_start: '2026-05-11', closed: 1, median_ack_minutes: null, median_on_scene_minutes: null, median_close_hours: '1.5' },
      ],
      error: null,
    }));
    publicClientMock.mockReturnValue({ rpc });
    const out = await dispatchResponseTrend({ weeks: 12 });
    expect(rpc).toHaveBeenCalledWith('civicos_dispatch_response_trend', { p_charter_id: null, p_weeks: 12 });
    expect(out).toHaveLength(2);
    expect(out[0]).toEqual({ weekStart: '2026-05-04', closed: 3, medianAckMinutes: 60, medianOnSceneMinutes: 90, medianCloseHours: 3 });
    expect(out[1]!.medianOnSceneMinutes).toBeNull();
  });

  it('forwards a charter filter', async () => {
    const rpc = vi.fn(async () => ({ data: [], error: null }));
    publicClientMock.mockReturnValue({ rpc });
    await dispatchResponseTrend({ charterId: 'POLICE', weeks: 8 });
    expect(rpc).toHaveBeenCalledWith('civicos_dispatch_response_trend', { p_charter_id: 'POLICE', p_weeks: 8 });
  });

  it('returns [] on RPC error', async () => {
    publicClientMock.mockReturnValue({ rpc: async () => ({ data: null, error: { message: 'boom' } }) });
    expect(await dispatchResponseTrend()).toEqual([]);
  });
});

describe('postureStats', () => {
  it('returns [] when the substrate is unavailable', async () => {
    publicClientMock.mockReturnValue(null);
    expect(await postureStats()).toEqual([]);
  });

  it('maps rows to camelCase and forwards options', async () => {
    const rpc = vi.fn(async () => ({
      data: [{
        charter_id: 'P', snapshots: 3, latest_posture: 'elevated',
        latest_readiness: 50, latest_stress: 70, latest_at: '2026-05-21T00:00:00Z',
        avg_readiness: '63.3', avg_stress: '43.3', max_stress: 70, min_readiness: 50,
      }],
      error: null,
    }));
    publicClientMock.mockReturnValue({ rpc });
    const out = await postureStats({ charterId: 'P', days: 30 });
    expect(rpc).toHaveBeenCalledWith('civicos_posture_stats', { p_charter_id: 'P', p_days: 30 });
    expect(out[0]).toEqual({
      charterId: 'P', snapshots: 3, latestPosture: 'elevated', latestReadiness: 50,
      latestStress: 70, latestAt: '2026-05-21T00:00:00Z', avgReadiness: 63.3, avgStress: 43.3,
      maxStress: 70, minReadiness: 50,
    });
  });

  it('returns [] on RPC error', async () => {
    publicClientMock.mockReturnValue({ rpc: async () => ({ data: null, error: { message: 'boom' } }) });
    expect(await postureStats()).toEqual([]);
  });
});

describe('postureTrend', () => {
  it('returns [] when the substrate is unavailable', async () => {
    publicClientMock.mockReturnValue(null);
    expect(await postureTrend()).toEqual([]);
  });

  it('maps weekly buckets and forwards the window + charter', async () => {
    const rpc = vi.fn(async () => ({
      data: [
        { week_start: '2026-05-04', snapshots: 3, avg_readiness: '60.0', avg_stress: '50.0', max_stress: 90 },
        { week_start: '2026-05-11', snapshots: 1, avg_readiness: null, avg_stress: '20.0', max_stress: 20 },
      ],
      error: null,
    }));
    publicClientMock.mockReturnValue({ rpc });
    const out = await postureTrend({ charterId: 'MIN-D', weeks: 8 });
    expect(rpc).toHaveBeenCalledWith('civicos_posture_trend', { p_charter_id: 'MIN-D', p_weeks: 8 });
    expect(out).toHaveLength(2);
    expect(out[0]).toEqual({ weekStart: '2026-05-04', snapshots: 3, avgReadiness: 60, avgStress: 50, maxStress: 90 });
    expect(out[1]!.avgReadiness).toBeNull();
  });

  it('returns [] on RPC error', async () => {
    publicClientMock.mockReturnValue({ rpc: async () => ({ data: null, error: { message: 'boom' } }) });
    expect(await postureTrend()).toEqual([]);
  });
});

describe('escalationResponseStats', () => {
  it('returns [] when the substrate is unavailable', async () => {
    publicClientMock.mockReturnValue(null);
    expect(await escalationResponseStats()).toEqual([]);
  });

  it('maps rows to camelCase, coercing numeric strings and nulls, and forwards options', async () => {
    const rpc = vi.fn(async () => ({
      data: [{
        charter_id: 'MIN-E', total: 3, acknowledged: 2, resolved: 2, open: 1,
        median_ack_minutes: '45.0', p90_ack_minutes: '58.0',
        median_resolve_hours: '3.0', p90_resolve_hours: '3.8', oldest_open_hours: '10.0',
      }, {
        charter_id: 'MIN-X', total: 1, acknowledged: 0, resolved: 0, open: 1,
        median_ack_minutes: null, p90_ack_minutes: null,
        median_resolve_hours: null, p90_resolve_hours: null, oldest_open_hours: '5.0',
      }],
      error: null,
    }));
    publicClientMock.mockReturnValue({ rpc });
    const out = await escalationResponseStats({ charterId: 'MIN-E', days: 30 });
    expect(rpc).toHaveBeenCalledWith('civicos_escalation_response_stats', { p_charter_id: 'MIN-E', p_days: 30 });
    expect(out[0]).toEqual({
      charterId: 'MIN-E', total: 3, acknowledged: 2, resolved: 2, open: 1,
      medianAckMinutes: 45, p90AckMinutes: 58, medianResolveHours: 3, p90ResolveHours: 3.8, oldestOpenHours: 10,
    });
    expect(out[1]!.medianAckMinutes).toBeNull();
    expect(out[1]!.oldestOpenHours).toBe(5);
  });

  it('returns [] on RPC error', async () => {
    publicClientMock.mockReturnValue({ rpc: async () => ({ data: null, error: { message: 'boom' } }) });
    expect(await escalationResponseStats()).toEqual([]);
  });
});

describe('escalationResponseTrend', () => {
  it('returns [] when the substrate is unavailable', async () => {
    publicClientMock.mockReturnValue(null);
    expect(await escalationResponseTrend()).toEqual([]);
  });

  it('maps weekly buckets and forwards the window', async () => {
    const rpc = vi.fn(async () => ({
      data: [
        { week_start: '2026-05-04', resolved: 3, median_ack_minutes: '60.0', median_resolve_hours: '3.0' },
        { week_start: '2026-05-11', resolved: 1, median_ack_minutes: null, median_resolve_hours: '1.5' },
      ],
      error: null,
    }));
    publicClientMock.mockReturnValue({ rpc });
    const out = await escalationResponseTrend({ weeks: 12 });
    expect(rpc).toHaveBeenCalledWith('civicos_escalation_response_trend', { p_charter_id: null, p_weeks: 12 });
    expect(out).toHaveLength(2);
    expect(out[0]).toEqual({ weekStart: '2026-05-04', resolved: 3, medianAckMinutes: 60, medianResolveHours: 3 });
    expect(out[1]!.medianAckMinutes).toBeNull();
  });

  it('forwards a charter filter', async () => {
    const rpc = vi.fn(async () => ({ data: [], error: null }));
    publicClientMock.mockReturnValue({ rpc });
    await escalationResponseTrend({ charterId: 'MIN-E', weeks: 8 });
    expect(rpc).toHaveBeenCalledWith('civicos_escalation_response_trend', { p_charter_id: 'MIN-E', p_weeks: 8 });
  });

  it('returns [] on RPC error', async () => {
    publicClientMock.mockReturnValue({ rpc: async () => ({ data: null, error: { message: 'boom' } }) });
    expect(await escalationResponseTrend()).toEqual([]);
  });
});
