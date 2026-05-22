import { describe, it, expect, vi, beforeEach } from 'vitest';

const listTelemetryStreamsRows = vi.fn();
vi.mock('@/lib/db/repos/telemetry', () => ({
  listTelemetryStreamsRows: (o: unknown) => listTelemetryStreamsRows(o),
}));

import { GET } from './route';

beforeEach(() => {
  listTelemetryStreamsRows.mockReset().mockResolvedValue([
    { stream_id: 'grid.load', charter_id: 'MIN-E', label: 'Grid load', unit: 'MW', aggregation: 'instantaneous', warn_threshold: 80, alert_threshold: 95 },
  ]);
});

describe('GET /api/public/telemetry', () => {
  it('returns the active stream catalog (metadata only)', async () => {
    const res = await GET();
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.document).toBe('civicos.public_telemetry_catalog');
    expect(json.count).toBe(1);
    expect(json.streams[0].stream_id).toBe('grid.load');
    // no sample values field
    expect(json.streams[0].value).toBeUndefined();
    expect(listTelemetryStreamsRows).toHaveBeenCalledWith({ activeOnly: true, limit: 500 });
  });

  it('sets a public cache header', async () => {
    const res = await GET();
    expect(res.headers.get('cache-control')).toContain('max-age=600');
  });
});
