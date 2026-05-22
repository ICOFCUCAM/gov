import { describe, it, expect, vi, beforeEach } from 'vitest';

const publicClientMock = vi.fn();
vi.mock('@/lib/db/client', () => ({
  publicClient: () => publicClientMock(),
  substrateAvailable: () => publicClientMock() != null,
}));

import { setTelemetryStreamActiveRow } from './telemetry';

beforeEach(() => publicClientMock.mockReset());

describe('setTelemetryStreamActiveRow', () => {
  it('returns false when the substrate is unavailable', async () => {
    publicClientMock.mockReturnValue(null);
    expect(await setTelemetryStreamActiveRow('s1', false)).toBe(false);
  });

  it('passes id + active and returns true on success', async () => {
    const rpc = vi.fn(async () => ({ data: true, error: null }));
    publicClientMock.mockReturnValue({ rpc });
    expect(await setTelemetryStreamActiveRow('s1', false)).toBe(true);
    expect(rpc).toHaveBeenCalledWith('civicos_set_telemetry_stream_active', { p_stream_id: 's1', p_active: false });
  });

  it('returns false on RPC error', async () => {
    publicClientMock.mockReturnValue({ rpc: async () => ({ data: null, error: { message: 'x' } }) });
    expect(await setTelemetryStreamActiveRow('s1', true)).toBe(false);
  });
});
