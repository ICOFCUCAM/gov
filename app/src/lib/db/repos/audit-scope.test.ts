import { describe, it, expect, vi, beforeEach } from 'vitest';

const publicClientMock = vi.fn();
vi.mock('@/lib/db/client', () => ({
  publicClient: () => publicClientMock(),
  substrateAvailable: () => publicClientMock() != null,
}));

import { auditScopeSummaryRows } from './audit';

beforeEach(() => publicClientMock.mockReset());

describe('auditScopeSummaryRows', () => {
  it('returns [] when the substrate is unavailable', async () => {
    publicClientMock.mockReturnValue(null);
    expect(await auditScopeSummaryRows()).toEqual([]);
  });

  it('maps rows to camelCase and forwards the limit', async () => {
    const rpc = vi.fn(async () => ({
      data: [{ scope: 'citizen:abc', entries: 3, first_at: '2026-05-01T00:00:00Z', last_at: '2026-05-22T00:00:00Z', max_seq: 3 }],
      error: null,
    }));
    publicClientMock.mockReturnValue({ rpc });
    const out = await auditScopeSummaryRows(50);
    expect(rpc).toHaveBeenCalledWith('civicos_audit_scope_summary', { p_limit: 50 });
    expect(out[0]).toEqual({ scope: 'citizen:abc', entries: 3, firstAt: '2026-05-01T00:00:00Z', lastAt: '2026-05-22T00:00:00Z', maxSeq: 3 });
  });

  it('returns [] on RPC error (e.g. insufficient privilege)', async () => {
    publicClientMock.mockReturnValue({ rpc: async () => ({ data: null, error: { message: 'insufficient_privilege' } }) });
    expect(await auditScopeSummaryRows()).toEqual([]);
  });
});
