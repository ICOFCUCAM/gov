import { describe, it, expect, vi, beforeEach } from 'vitest';

const publicClientMock = vi.fn();
vi.mock('@/lib/db/client', () => ({
  publicClient: () => publicClientMock(),
  substrateAvailable: () => publicClientMock() != null,
}));

import { myDataExport } from './citizen';

beforeEach(() => publicClientMock.mockReset());

describe('myDataExport', () => {
  it('returns null when the substrate is unavailable', async () => {
    publicClientMock.mockReturnValue(null);
    expect(await myDataExport()).toBeNull();
  });

  it('returns the portability document from the RPC', async () => {
    const doc = {
      document: 'civicos.citizen_data_export',
      version: 1,
      generated_at: '2026-05-22T00:00:00Z',
      citizen: { id: 'c1', national_id: 'NID-1', display_name: 'A' },
      service_requests: [{ ref: 'SR-1' }],
      consents: [],
      appeals: [],
      receipt_timeline: [],
      counts: { service_requests: 1, consents: 0, appeals: 0 },
    };
    const rpc = vi.fn(async () => ({ data: doc, error: null }));
    publicClientMock.mockReturnValue({ rpc });
    const out = await myDataExport();
    expect(out).toEqual(doc);
    expect(rpc).toHaveBeenCalledWith('civicos_my_data_export');
  });

  it('returns null on RPC error', async () => {
    publicClientMock.mockReturnValue({
      rpc: async () => ({ data: null, error: { message: 'denied' } }),
    });
    expect(await myDataExport()).toBeNull();
  });
});
