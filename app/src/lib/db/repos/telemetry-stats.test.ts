import { describe, it, expect, vi, beforeEach } from 'vitest';

const publicClientMock = vi.fn();
vi.mock('@/lib/db/client', () => ({
  publicClient: () => publicClientMock(),
  substrateAvailable: () => publicClientMock() != null,
}));

import { telemetryStreamStats, telemetryFleetStatus, telemetryStreamSeries } from './telemetry';

beforeEach(() => publicClientMock.mockReset());

describe('telemetryStreamSeries', () => {
  it('returns [] when the substrate is unavailable', async () => {
    publicClientMock.mockReturnValue(null);
    expect(await telemetryStreamSeries('s1')).toEqual([]);
  });

  it('maps bucket rows and forwards the window + bucket count', async () => {
    const rpc = vi.fn(async () => ({
      data: [
        { bucket_ts: '2026-05-15T00:00:00Z', avg_value: 15, min_value: 10, max_value: 20, samples: 2 },
        { bucket_ts: '2026-05-21T00:00:00Z', avg_value: 60, min_value: 50, max_value: 70, samples: 2 },
      ],
      error: null,
    }));
    publicClientMock.mockReturnValue({ rpc });
    const out = await telemetryStreamSeries('s1', 168, 120);
    expect(rpc).toHaveBeenCalledWith('civicos_telemetry_stream_series', { p_stream_id: 's1', p_hours: 168, p_buckets: 120 });
    expect(out).toHaveLength(2);
    expect(out[0]).toEqual({ bucketTs: '2026-05-15T00:00:00Z', avg: 15, min: 10, max: 20, samples: 2 });
  });

  it('returns [] on RPC error', async () => {
    publicClientMock.mockReturnValue({ rpc: async () => ({ data: null, error: { message: 'boom' } }) });
    expect(await telemetryStreamSeries('s1')).toEqual([]);
  });
});

describe('telemetryFleetStatus', () => {
  it('returns [] when the substrate is unavailable', async () => {
    publicClientMock.mockReturnValue(null);
    expect(await telemetryFleetStatus()).toEqual([]);
  });

  it('maps fleet rows to camelCase and forwards options', async () => {
    const rpc = vi.fn(async () => ({
      data: [{
        stream_id: 'alert-stream', charter_id: 'MIN-E', label: 'Grid load', unit: 'MW',
        latest_value: 99, latest_ts: '2026-05-22T00:00:00Z', age_minutes: 5,
        warn_threshold: 80, alert_threshold: 95, status: 'alert',
      }],
      error: null,
    }));
    publicClientMock.mockReturnValue({ rpc });
    const out = await telemetryFleetStatus({ charterId: 'MIN-E', staleMinutes: 30 });
    expect(rpc).toHaveBeenCalledWith('civicos_telemetry_fleet_status', { p_charter_id: 'MIN-E', p_stale_minutes: 30 });
    expect(out[0]).toEqual({
      streamId: 'alert-stream', charterId: 'MIN-E', label: 'Grid load', unit: 'MW',
      latestValue: 99, latestTs: '2026-05-22T00:00:00Z', ageMinutes: 5,
      warnThreshold: 80, alertThreshold: 95, status: 'alert',
    });
  });

  it('returns [] on RPC error', async () => {
    publicClientMock.mockReturnValue({ rpc: async () => ({ data: null, error: { message: 'boom' } }) });
    expect(await telemetryFleetStatus()).toEqual([]);
  });
});

describe('telemetryStreamStats', () => {
  it('returns null when the substrate is unavailable', async () => {
    publicClientMock.mockReturnValue(null);
    expect(await telemetryStreamStats('s1')).toBeNull();
  });

  it('maps the stats row and forwards stream id + window', async () => {
    const rpc = vi.fn(async () => ({
      data: [{
        samples: 4, min_value: 70, max_value: 100, avg_value: 87.75, median_value: 90.5,
        p95_value: 99.4, stddev_value: 13.2, latest_value: 100, latest_ts: '2026-05-22T00:00:00Z',
        warn_breaches: 3, alert_breaches: 2,
      }],
      error: null,
    }));
    publicClientMock.mockReturnValue({ rpc });
    const out = await telemetryStreamStats('s1', 24);
    expect(rpc).toHaveBeenCalledWith('civicos_telemetry_stream_stats', { p_stream_id: 's1', p_hours: 24 });
    expect(out).toEqual({
      samples: 4, min: 70, max: 100, avg: 87.75, median: 90.5, p95: 99.4, stddev: 13.2,
      latest: 100, latestTs: '2026-05-22T00:00:00Z', warnBreaches: 3, alertBreaches: 2,
    });
  });

  it('treats a zero-sample window as null (no data)', async () => {
    publicClientMock.mockReturnValue({
      rpc: async () => ({ data: [{ samples: 0, min_value: null, max_value: null, avg_value: null,
        median_value: null, p95_value: null, stddev_value: null, latest_value: null, latest_ts: null,
        warn_breaches: 0, alert_breaches: 0 }], error: null }),
    });
    expect(await telemetryStreamStats('s1')).toBeNull();
  });

  it('returns null on RPC error', async () => {
    publicClientMock.mockReturnValue({ rpc: async () => ({ data: null, error: { message: 'boom' } }) });
    expect(await telemetryStreamStats('s1')).toBeNull();
  });
});
