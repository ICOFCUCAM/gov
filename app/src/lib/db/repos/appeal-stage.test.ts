import { describe, it, expect, vi, beforeEach } from 'vitest';

const publicClientMock = vi.fn();
vi.mock('@/lib/db/client', () => ({
  publicClient: () => publicClientMock(),
  substrateAvailable: () => publicClientMock() != null,
}));

import { advanceAppealStageRow, withdrawMyAppealRow } from './citizen';

beforeEach(() => publicClientMock.mockReset());

describe('advanceAppealStageRow', () => {
  it('returns null when the substrate is unavailable', async () => {
    publicClientMock.mockReturnValue(null);
    expect(await advanceAppealStageRow('AP-1', 'admitted')).toBeNull();
  });

  it('calls the RPC with ref + stage and returns the updated row', async () => {
    const rpc = vi.fn(async () => ({ data: { id: 'a1', ref: 'AP-1', status: 'heard' }, error: null }));
    publicClientMock.mockReturnValue({ rpc });
    const out = await advanceAppealStageRow('AP-1', 'heard');
    expect(rpc).toHaveBeenCalledWith('civicos_advance_appeal_stage', { p_ref: 'AP-1', p_stage: 'heard' });
    expect(out!.status).toBe('heard');
  });

  it('returns null on RPC error (e.g. already decided / not an officer)', async () => {
    publicClientMock.mockReturnValue({ rpc: async () => ({ data: null, error: { message: 'insufficient_privilege' } }) });
    expect(await advanceAppealStageRow('AP-1', 'admitted')).toBeNull();
  });
});

describe('withdrawMyAppealRow', () => {
  it('returns null when the substrate is unavailable', async () => {
    publicClientMock.mockReturnValue(null);
    expect(await withdrawMyAppealRow('AP-1')).toBeNull();
  });

  it('calls the RPC with ref + reason and returns the withdrawn row', async () => {
    const rpc = vi.fn(async () => ({ data: { id: 'a1', ref: 'AP-1', status: 'withdrawn' }, error: null }));
    publicClientMock.mockReturnValue({ rpc });
    const out = await withdrawMyAppealRow('AP-1', 'changed my mind');
    expect(rpc).toHaveBeenCalledWith('civicos_withdraw_my_appeal', { p_ref: 'AP-1', p_reason: 'changed my mind' });
    expect(out!.status).toBe('withdrawn');
  });

  it('passes null reason when omitted', async () => {
    const rpc = vi.fn(async () => ({ data: { id: 'a1', ref: 'AP-1', status: 'withdrawn' }, error: null }));
    publicClientMock.mockReturnValue({ rpc });
    await withdrawMyAppealRow('AP-1');
    expect(rpc).toHaveBeenCalledWith('civicos_withdraw_my_appeal', { p_ref: 'AP-1', p_reason: null });
  });

  it('returns null on RPC error (e.g. not yours / already decided)', async () => {
    publicClientMock.mockReturnValue({ rpc: async () => ({ data: null, error: { message: 'not found' } }) });
    expect(await withdrawMyAppealRow('AP-1')).toBeNull();
  });
});
