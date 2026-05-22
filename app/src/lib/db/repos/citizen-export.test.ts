import { describe, it, expect, vi, beforeEach } from 'vitest';

const publicClientMock = vi.fn();
vi.mock('@/lib/db/client', () => ({
  publicClient: () => publicClientMock(),
  substrateAvailable: () => publicClientMock() != null,
}));

import {
  myDataExport, logMyDataExport, myAuditTrail, verifyMyAuditTrail, myExpiringConsents,
} from './citizen';

beforeEach(() => publicClientMock.mockReset());

describe('myExpiringConsents', () => {
  it('returns [] when the substrate is unavailable', async () => {
    publicClientMock.mockReturnValue(null);
    expect(await myExpiringConsents()).toEqual([]);
  });

  it('passes the window and returns the rows', async () => {
    const rows = [{
      id: 'c1', target_charter_id: 'MIN-H', scope: 'health.records',
      granted_at: '2026-05-01T00:00:00Z', expires_at: '2026-05-28T00:00:00Z', days_remaining: 6,
    }];
    const rpc = vi.fn(async () => ({ data: rows, error: null }));
    publicClientMock.mockReturnValue({ rpc });
    const out = await myExpiringConsents(7);
    expect(out).toHaveLength(1);
    expect(out[0]!.days_remaining).toBe(6);
    expect(rpc).toHaveBeenCalledWith('civicos_my_expiring_consents', { p_within_days: 7 });
  });

  it('returns [] on RPC error', async () => {
    publicClientMock.mockReturnValue({
      rpc: async () => ({ data: null, error: { message: 'denied' } }),
    });
    expect(await myExpiringConsents()).toEqual([]);
  });
});

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

describe('logMyDataExport', () => {
  it('returns null when the substrate is unavailable', async () => {
    publicClientMock.mockReturnValue(null);
    expect(await logMyDataExport()).toBeNull();
  });

  it('returns the audit entry id from the RPC', async () => {
    const rpc = vi.fn(async () => ({ data: 'audit-entry-1', error: null }));
    publicClientMock.mockReturnValue({ rpc });
    expect(await logMyDataExport()).toBe('audit-entry-1');
    expect(rpc).toHaveBeenCalledWith('civicos_log_my_data_export');
  });

  it('returns null when there is no linked citizen (RPC returns null)', async () => {
    publicClientMock.mockReturnValue({ rpc: async () => ({ data: null, error: null }) });
    expect(await logMyDataExport()).toBeNull();
  });
});

describe('myAuditTrail', () => {
  it('returns [] when the substrate is unavailable', async () => {
    publicClientMock.mockReturnValue(null);
    expect(await myAuditTrail()).toEqual([]);
  });

  it('returns the citizen-scope audit entries and passes the limit', async () => {
    const rows = [{
      seq: 42, actor: 'Amina', action: 'data_export', subject: 'c1',
      detail: 'citizen exported their personal data (portability)',
      at: '2026-05-22T00:00:00Z', prev_hash: 'aaaa', hash: 'bbbb',
    }];
    const rpc = vi.fn(async () => ({ data: rows, error: null }));
    publicClientMock.mockReturnValue({ rpc });
    const out = await myAuditTrail(50);
    expect(out).toHaveLength(1);
    expect(out[0]!.action).toBe('data_export');
    expect(rpc).toHaveBeenCalledWith('civicos_my_audit_trail', { p_limit: 50 });
  });

  it('returns [] on RPC error', async () => {
    publicClientMock.mockReturnValue({
      rpc: async () => ({ data: null, error: { message: 'denied' } }),
    });
    expect(await myAuditTrail()).toEqual([]);
  });
});

describe('verifyMyAuditTrail', () => {
  it('returns null when the substrate is unavailable', async () => {
    publicClientMock.mockReturnValue(null);
    expect(await verifyMyAuditTrail()).toBeNull();
  });

  it('unwraps the set-returning verifier row', async () => {
    publicClientMock.mockReturnValue({
      rpc: async () => ({ data: [{ entries: 3, intact: true, broken_at: null }], error: null }),
    });
    expect(await verifyMyAuditTrail()).toEqual({ entries: 3, intact: true, broken_at: null });
  });

  it('surfaces a broken chain', async () => {
    publicClientMock.mockReturnValue({
      rpc: async () => ({ data: [{ entries: 5, intact: false, broken_at: 4 }], error: null }),
    });
    const out = await verifyMyAuditTrail();
    expect(out!.intact).toBe(false);
    expect(out!.broken_at).toBe(4);
  });

  it('returns null on RPC error', async () => {
    publicClientMock.mockReturnValue({
      rpc: async () => ({ data: null, error: { message: 'denied' } }),
    });
    expect(await verifyMyAuditTrail()).toBeNull();
  });
});
