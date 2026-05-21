import { describe, it, expect, vi, beforeEach } from 'vitest';

const serverClientMock = vi.fn();
vi.mock('@/lib/db/client', () => ({
  serverClient: () => serverClientMock(),
}));

import { GET } from './route';

beforeEach(() => {
  serverClientMock.mockReset();
  delete process.env.CIVICOS_CRON_SECRET;
});

describe('GET /api/substrate/export', () => {
  it('returns 401 without the secret', async () => {
    const res = await GET(new Request('http://x'));
    expect(res.status).toBe(401);
  });

  it('returns 503 when substrate is not configured', async () => {
    process.env.CIVICOS_CRON_SECRET = 'correct';
    serverClientMock.mockReturnValue(null);
    const res = await GET(new Request('http://x?token=correct'));
    expect(res.status).toBe(503);
  });

  it('dumps every documented table and emits a generated_at timestamp', async () => {
    process.env.CIVICOS_CRON_SECRET = 'correct';
    const fromMock = vi.fn((view: string) => ({
      select: () => ({
        limit: () => Promise.resolve({ data: [{ id: view + '-1' }], count: 1, error: null }),
      }),
    }));
    serverClientMock.mockReturnValue({ from: fromMock });
    const res = await GET(new Request('http://x?token=correct'));
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.generated_at).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(typeof json.tables).toBe('object');
    expect(Object.keys(json.tables).length).toBeGreaterThanOrEqual(18);
    // audit_entries and audit_witnesses must be present for handover.
    expect(json.tables.audit_entries).toBeDefined();
    expect(json.tables.audit_witnesses).toBeDefined();
  });

  it('marks truncated tables when count > returned rows', async () => {
    process.env.CIVICOS_CRON_SECRET = 'correct';
    serverClientMock.mockReturnValue({
      from: () => ({
        select: () => ({
          limit: () => Promise.resolve({
            data: [{ id: '1' }, { id: '2' }], count: 10_000, error: null,
          }),
        }),
      }),
    });
    const res = await GET(new Request('http://x?token=correct&cap=2'));
    const json = await res.json();
    expect(json.row_cap_per_table).toBe(2);
    // Every table is truncated under the artificial cap.
    for (const v of Object.values(json.tables) as { truncated: boolean }[]) {
      expect(v.truncated).toBe(true);
    }
  });

  it('records per-table errors without aborting the entire dump', async () => {
    process.env.CIVICOS_CRON_SECRET = 'correct';
    serverClientMock.mockReturnValue({
      from: (view: string) => ({
        select: () => ({
          limit: () => Promise.resolve(
            view === 'civicos_institutions'
              ? { data: null, count: null, error: { message: 'denied' } }
              : { data: [], count: 0, error: null },
          ),
        }),
      }),
    });
    const res = await GET(new Request('http://x?token=correct'));
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.tables.institutions.error).toBe('denied');
    expect(json.tables.officers.error).toBeNull();
  });

  it('clamps cap to a sensible upper bound', async () => {
    process.env.CIVICOS_CRON_SECRET = 'correct';
    serverClientMock.mockReturnValue({
      from: () => ({
        select: () => ({
          limit: () => Promise.resolve({ data: [], count: 0, error: null }),
        }),
      }),
    });
    const res = await GET(new Request('http://x?token=correct&cap=9999999'));
    const json = await res.json();
    expect(json.row_cap_per_table).toBeLessThanOrEqual(50_000);
  });
});
