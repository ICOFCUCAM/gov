import { describe, it, expect, vi, beforeEach } from 'vitest';

const publicClientMock = vi.fn();
vi.mock('@/lib/db/client', () => ({
  publicClient: () => publicClientMock(),
  substrateAvailable: () => publicClientMock() != null,
}));

import { linkEscalationResponseRow } from './memory';

beforeEach(() => publicClientMock.mockReset());

describe('linkEscalationResponseRow', () => {
  it('returns false when the substrate is unavailable', async () => {
    publicClientMock.mockReturnValue(null);
    expect(await linkEscalationResponseRow('e1', { dispatchRef: 'DSP-1' })).toBe(false);
  });

  it('forwards dispatch + work item refs and returns true', async () => {
    const rpc = vi.fn(async () => ({ data: true, error: null }));
    publicClientMock.mockReturnValue({ rpc });
    expect(await linkEscalationResponseRow('e1', { dispatchRef: 'DSP-1', workItemRef: 'WI-2' })).toBe(true);
    expect(rpc).toHaveBeenCalledWith('civicos_link_escalation_response', {
      p_escalation_id: 'e1', p_dispatch_ref: 'DSP-1', p_work_item_ref: 'WI-2',
    });
  });

  it('defaults missing refs to null', async () => {
    const rpc = vi.fn(async () => ({ data: true, error: null }));
    publicClientMock.mockReturnValue({ rpc });
    await linkEscalationResponseRow('e1', { dispatchRef: 'DSP-1' });
    expect(rpc).toHaveBeenCalledWith('civicos_link_escalation_response', {
      p_escalation_id: 'e1', p_dispatch_ref: 'DSP-1', p_work_item_ref: null,
    });
  });

  it('returns false on RPC error', async () => {
    publicClientMock.mockReturnValue({ rpc: async () => ({ data: null, error: { message: 'x' } }) });
    expect(await linkEscalationResponseRow('e1', { workItemRef: 'WI-2' })).toBe(false);
  });
});
