import { describe, it, expect, vi, beforeEach } from 'vitest';

const serverClientMock = vi.fn();
const tokenScopedClientMock = vi.fn();
vi.mock('@/lib/db/client', () => ({
  serverClient: () => serverClientMock(),
  tokenScopedClient: (t: string) => tokenScopedClientMock(t),
}));

import { POST } from './route';
import { parseOfficerCsv } from '@/lib/officer-csv';

const JWT = 'aaa.bbb.ccc'; // shape-only; the route checks 3 dot-parts then asks the substrate

beforeEach(() => {
  serverClientMock.mockReset();
  tokenScopedClientMock.mockReset();
  tokenScopedClientMock.mockReturnValue(null);
  delete process.env.CIVICOS_CRON_SECRET;
});

describe('parseOfficerCsv', () => {
  it('parses a well-formed CSV with the documented header columns', () => {
    const csv = 'email,name,charter_id,role,title\na@b,Alice,MIN-X,officer,Director';
    const out = parseOfficerCsv(csv);
    expect(Array.isArray(out)).toBe(true);
    if (Array.isArray(out)) {
      expect(out).toHaveLength(1);
      expect(out[0]!.email).toBe('a@b');
      expect(out[0]!.title).toBe('Director');
    }
  });

  it('rejects an empty CSV', () => {
    const out = parseOfficerCsv('');
    expect(out).toEqual({ error: 'empty CSV' });
  });

  it('rejects a CSV missing required columns', () => {
    const out = parseOfficerCsv('email,name\na@b,Alice');
    expect(out).toEqual({ error: 'missing header column: charter_id' });
  });

  it('treats title as optional', () => {
    const csv = 'email,name,charter_id,role\na@b,Alice,MIN-X,officer';
    const out = parseOfficerCsv(csv);
    expect(Array.isArray(out)).toBe(true);
    if (Array.isArray(out)) {
      expect(out[0]!.title).toBeNull();
    }
  });
});

describe('POST /api/admin/officers/bulk', () => {
  it('returns 401 without the secret', async () => {
    const res = await POST(new Request('http://x', { method: 'POST', body: '' }));
    expect(res.status).toBe(401);
  });

  it('returns 503 when the substrate is not configured', async () => {
    process.env.CIVICOS_CRON_SECRET = 'correct';
    serverClientMock.mockReturnValue(null);
    const res = await POST(new Request('http://x?token=correct', { method: 'POST', body: '' }));
    expect(res.status).toBe(503);
  });

  it('rejects a JSON payload without the rows array', async () => {
    process.env.CIVICOS_CRON_SECRET = 'correct';
    serverClientMock.mockReturnValue({ rpc: vi.fn() });
    const res = await POST(new Request('http://x?token=correct', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ wrong: [] }),
    }));
    expect(res.status).toBe(400);
  });

  it('forwards JSON rows to the RPC and counts the results', async () => {
    process.env.CIVICOS_CRON_SECRET = 'correct';
    const rpc = vi.fn(async () => ({
      data: [
        { email: 'a@b', name: 'A', charter_id: 'MIN-X', role: 'officer', officer_id: 'o-1', status: 'created', error: null },
        { email: 'c@d', name: 'C', charter_id: 'MIN-X', role: 'officer', officer_id: null, status: 'failed', error: 'oops' },
      ],
      error: null,
    }));
    serverClientMock.mockReturnValue({ rpc });
    const res = await POST(new Request('http://x?token=correct', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ rows: [
        { email: 'a@b', name: 'A', charter_id: 'MIN-X', role: 'officer' },
        { email: 'c@d', name: 'C', charter_id: 'MIN-X', role: 'officer' },
      ] }),
    }));
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.ok).toBe(false);
    expect(json.counts).toEqual({ received: 2, created: 1, failed: 1 });
    expect(rpc).toHaveBeenCalledWith('civicos_admin_bulk_create_officers', expect.objectContaining({ p_rows: expect.any(Array) }));
  });

  it('parses a CSV payload when content-type is not JSON', async () => {
    process.env.CIVICOS_CRON_SECRET = 'correct';
    const rpc = vi.fn(async () => ({
      data: [{ email: 'a@b', name: 'A', charter_id: 'MIN-X', role: 'officer',
        officer_id: 'o-1', status: 'created', error: null }],
      error: null,
    }));
    serverClientMock.mockReturnValue({ rpc });
    const res = await POST(new Request('http://x?token=correct', {
      method: 'POST',
      headers: { 'content-type': 'text/csv' },
      body: 'email,name,charter_id,role\na@b,Alice,MIN-X,officer',
    }));
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.counts.created).toBe(1);
  });

  it('rejects a batch larger than 500 rows', async () => {
    process.env.CIVICOS_CRON_SECRET = 'correct';
    serverClientMock.mockReturnValue({ rpc: vi.fn() });
    const rows = Array.from({ length: 501 }, (_, i) => ({
      email: `e${i}@x`, name: `n${i}`, charter_id: 'MIN-X', role: 'officer',
    }));
    const res = await POST(new Request('http://x?token=correct', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ rows }),
    }));
    expect(res.status).toBe(413);
  });

  it('returns 500 when the RPC errors', async () => {
    process.env.CIVICOS_CRON_SECRET = 'correct';
    serverClientMock.mockReturnValue({
      rpc: async () => ({ data: null, error: { message: 'denied' } }),
    });
    const res = await POST(new Request('http://x?token=correct', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ rows: [
        { email: 'a@b', name: 'A', charter_id: 'MIN-X', role: 'officer' },
      ] }),
    }));
    expect(res.status).toBe(500);
  });

  describe('session auth (platform-tier JWT)', () => {
    it('accepts a platform-tier officer session and runs the bulk RPC', async () => {
      tokenScopedClientMock.mockReturnValue({
        rpc: async () => ({ data: { kind: 'officer', role: 'platform-admin' }, error: null }),
      });
      const rpc = vi.fn(async () => ({ data: [], error: null }));
      serverClientMock.mockReturnValue({ rpc });
      const res = await POST(new Request('http://x', {
        method: 'POST',
        headers: { 'content-type': 'application/json', authorization: `Bearer ${JWT}` },
        body: JSON.stringify({ rows: [] }),
      }));
      expect(res.status).toBe(200);
      // platform check goes through the token-scoped client...
      expect(tokenScopedClientMock).toHaveBeenCalledWith(JWT);
    });

    it('rejects a non-platform officer session with 401', async () => {
      tokenScopedClientMock.mockReturnValue({
        rpc: async () => ({ data: { kind: 'officer', role: 'field-officer' }, error: null }),
      });
      const res = await POST(new Request('http://x', {
        method: 'POST',
        headers: { 'content-type': 'application/json', authorization: `Bearer ${JWT}` },
        body: JSON.stringify({ rows: [] }),
      }));
      expect(res.status).toBe(401);
    });

    it('rejects a citizen session with 401', async () => {
      tokenScopedClientMock.mockReturnValue({
        rpc: async () => ({ data: { kind: 'citizen', role: null }, error: null }),
      });
      const res = await POST(new Request('http://x', {
        method: 'POST',
        headers: { 'content-type': 'application/json', authorization: `Bearer ${JWT}` },
        body: JSON.stringify({ rows: [] }),
      }));
      expect(res.status).toBe(401);
    });

    it('rejects a non-JWT bearer that is not the cron secret', async () => {
      const res = await POST(new Request('http://x', {
        method: 'POST',
        headers: { 'content-type': 'application/json', authorization: 'Bearer not-a-jwt' },
        body: JSON.stringify({ rows: [] }),
      }));
      expect(res.status).toBe(401);
      // single-token bearer never reaches the substrate
      expect(tokenScopedClientMock).not.toHaveBeenCalled();
    });
  });
});
