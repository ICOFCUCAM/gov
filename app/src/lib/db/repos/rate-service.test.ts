import { describe, it, expect, vi, beforeEach } from 'vitest';

const publicClientMock = vi.fn();
vi.mock('@/lib/db/client', () => ({
  publicClient: () => publicClientMock(),
  substrateAvailable: () => publicClientMock() != null,
}));

import { rateMyServiceRequestRow, cancelMyServiceRequestRow } from './citizen';

beforeEach(() => publicClientMock.mockReset());

describe('rateMyServiceRequestRow', () => {
  it('returns null when the substrate is unavailable', async () => {
    publicClientMock.mockReturnValue(null);
    expect(await rateMyServiceRequestRow('SR-1', 5)).toBeNull();
  });

  it('calls the RPC with ref + satisfaction and returns the updated row', async () => {
    const rpc = vi.fn(async () => ({ data: { id: 's1', ref: 'SR-1', satisfaction: 4 }, error: null }));
    publicClientMock.mockReturnValue({ rpc });
    const out = await rateMyServiceRequestRow('SR-1', 4);
    expect(rpc).toHaveBeenCalledWith('civicos_rate_my_service_request', { p_ref: 'SR-1', p_satisfaction: 4 });
    expect(out!.satisfaction).toBe(4);
  });

  it('returns null on RPC error (not yours / not resolved)', async () => {
    publicClientMock.mockReturnValue({ rpc: async () => ({ data: null, error: { message: 'not found' } }) });
    expect(await rateMyServiceRequestRow('SR-1', 3)).toBeNull();
  });
});

describe('cancelMyServiceRequestRow', () => {
  it('returns null when the substrate is unavailable', async () => {
    publicClientMock.mockReturnValue(null);
    expect(await cancelMyServiceRequestRow('SR-1')).toBeNull();
  });

  it('calls the RPC with ref + reason and returns the cancelled row', async () => {
    const rpc = vi.fn(async () => ({ data: { id: 's1', ref: 'SR-1', status: 'cancelled' }, error: null }));
    publicClientMock.mockReturnValue({ rpc });
    const out = await cancelMyServiceRequestRow('SR-1', 'no longer needed');
    expect(rpc).toHaveBeenCalledWith('civicos_cancel_my_service_request', { p_ref: 'SR-1', p_reason: 'no longer needed' });
    expect(out!.status).toBe('cancelled');
  });

  it('passes null reason when omitted', async () => {
    const rpc = vi.fn(async () => ({ data: { id: 's1', ref: 'SR-1', status: 'cancelled' }, error: null }));
    publicClientMock.mockReturnValue({ rpc });
    await cancelMyServiceRequestRow('SR-1');
    expect(rpc).toHaveBeenCalledWith('civicos_cancel_my_service_request', { p_ref: 'SR-1', p_reason: null });
  });

  it('returns null on RPC error (not yours / already resolved)', async () => {
    publicClientMock.mockReturnValue({ rpc: async () => ({ data: null, error: { message: 'not found' } }) });
    expect(await cancelMyServiceRequestRow('SR-1')).toBeNull();
  });
});

import { revokeAllMyConsentsRows } from './citizen';

describe('revokeAllMyConsentsRows', () => {
  it('returns 0 when the substrate is unavailable', async () => {
    publicClientMock.mockReturnValue(null);
    expect(await revokeAllMyConsentsRows()).toBe(0);
  });

  it('returns the count revoked', async () => {
    const rpc = vi.fn(async () => ({ data: 3, error: null }));
    publicClientMock.mockReturnValue({ rpc });
    expect(await revokeAllMyConsentsRows()).toBe(3);
    expect(rpc).toHaveBeenCalledWith('civicos_revoke_all_my_consents');
  });

  it('returns 0 on RPC error', async () => {
    publicClientMock.mockReturnValue({ rpc: async () => ({ data: null, error: { message: 'x' } }) });
    expect(await revokeAllMyConsentsRows()).toBe(0);
  });
});
