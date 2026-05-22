import { describe, it, expect, vi, beforeEach } from 'vitest';

const publicClientMock = vi.fn();
vi.mock('@/lib/db/client', () => ({
  publicClient: () => publicClientMock(),
  substrateAvailable: () => publicClientMock() != null,
}));

import { markDispatchOnSceneRow } from './memory';

beforeEach(() => publicClientMock.mockReset());

describe('markDispatchOnSceneRow', () => {
  it('returns null when the substrate is unavailable', async () => {
    publicClientMock.mockReturnValue(null);
    expect(await markDispatchOnSceneRow('DSP-1')).toBeNull();
  });

  it('calls the RPC with the ref and returns the updated row', async () => {
    const rpc = vi.fn(async () => ({ data: { id: 'd1', ref: 'DSP-1', status: 'on-scene' }, error: null }));
    publicClientMock.mockReturnValue({ rpc });
    const out = await markDispatchOnSceneRow('DSP-1');
    expect(rpc).toHaveBeenCalledWith('civicos_mark_dispatch_on_scene', { p_ref: 'DSP-1' });
    expect(out!.status).toBe('on-scene');
  });

  it('returns null on RPC error', async () => {
    publicClientMock.mockReturnValue({ rpc: async () => ({ data: null, error: { message: 'not found' } }) });
    expect(await markDispatchOnSceneRow('DSP-1')).toBeNull();
  });
});
