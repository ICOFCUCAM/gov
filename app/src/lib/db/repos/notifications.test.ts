import { describe, it, expect, vi, beforeEach } from 'vitest';

const publicClientMock = vi.fn();
vi.mock('@/lib/db/client', () => ({
  publicClient: () => publicClientMock(),
  substrateAvailable: () => publicClientMock() != null,
}));

import { myNotifications } from './citizen';

beforeEach(() => publicClientMock.mockReset());

describe('myNotifications', () => {
  it('returns [] when the substrate is unavailable', async () => {
    publicClientMock.mockReturnValue(null);
    expect(await myNotifications()).toEqual([]);
  });

  it('returns the feed and forwards the limit', async () => {
    const rows = [
      { kind: 'request_unrated', ref: 'SR-1', at: '2026-05-22T00:00:00Z', detail: 'birth cert', action: 'rate' },
      { kind: 'consent_expiring', ref: 'c1', at: '2026-05-25T00:00:00Z', detail: 'MIN-H · health', action: 'extend' },
    ];
    const rpc = vi.fn(async () => ({ data: rows, error: null }));
    publicClientMock.mockReturnValue({ rpc });
    const out = await myNotifications(30);
    expect(rpc).toHaveBeenCalledWith('civicos_my_notifications', { p_limit: 30 });
    expect(out).toHaveLength(2);
    expect(out[0]!.action).toBe('rate');
  });

  it('returns [] on RPC error', async () => {
    publicClientMock.mockReturnValue({ rpc: async () => ({ data: null, error: { message: 'x' } }) });
    expect(await myNotifications()).toEqual([]);
  });
});
