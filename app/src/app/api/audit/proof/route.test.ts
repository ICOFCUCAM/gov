import { describe, it, expect, vi, beforeEach } from 'vitest';

const publicClientMock = vi.fn();
vi.mock('@/lib/db/client', () => ({
  publicClient: () => publicClientMock(),
}));

import { GET } from './route';

beforeEach(() => publicClientMock.mockReset());

function chain(rows: unknown[]): Record<string, unknown> {
  const self: Record<string, unknown> = {};
  for (const m of ['select','eq','lte','order','limit']) self[m] = () => self;
  self.then = (resolve: (r: { data: unknown[]; error: null }) => void) => {
    resolve({ data: rows, error: null }); return self;
  };
  return self;
}

describe('GET /api/audit/proof', () => {
  it('returns 503 when substrate is not configured', async () => {
    publicClientMock.mockReturnValue(null);
    const res = await GET(new Request('http://x/api/audit/proof?scope=X&seq=1'));
    expect(res.status).toBe(503);
  });

  it('rejects missing scope/seq with 400', async () => {
    publicClientMock.mockReturnValue({ from: () => chain([]) });
    const res = await GET(new Request('http://x/api/audit/proof'));
    expect(res.status).toBe(400);
  });

  it('rejects non-positive seq with 400', async () => {
    publicClientMock.mockReturnValue({ from: () => chain([]) });
    const res = await GET(new Request('http://x/api/audit/proof?scope=X&seq=0'));
    expect(res.status).toBe(400);
  });

  it('returns 404 when the chain has no entries for the scope', async () => {
    publicClientMock.mockReturnValue({ from: () => chain([]) });
    const res = await GET(new Request('http://x/api/audit/proof?scope=X&seq=1'));
    expect(res.status).toBe(404);
  });

  it('returns 404 when seq is past the chain head', async () => {
    publicClientMock.mockReturnValue({
      from: () => chain([{ seq: 1, scope: 'X', hash: 'h1', prev_hash: '00000000' }]),
    });
    const res = await GET(new Request('http://x/api/audit/proof?scope=X&seq=5'));
    expect(res.status).toBe(404);
  });

  it('returns the chain prefix + matching witnesses on success', async () => {
    let phase: 'entries' | 'witnesses' = 'entries';
    publicClientMock.mockReturnValue({
      from: (view: string) => {
        if (view === 'civicos_audit_entries') {
          phase = 'entries';
          return chain([
            { seq: 1, scope: 'X', hash: 'h1', prev_hash: '00000000' },
            { seq: 2, scope: 'X', hash: 'h2', prev_hash: 'h1' },
          ]);
        }
        phase = 'witnesses';
        return chain([{ id: 'w', scope: 'X', observed_seq: 2, observed_hash: 'h2', witness_label: 'l' }]);
      },
    });
    const res = await GET(new Request('http://x/api/audit/proof?scope=X&seq=2'));
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.proof_for).toEqual({ scope: 'X', seq: 2 });
    expect(json.tables.audit_entries.rows).toHaveLength(2);
    expect(json.tables.audit_witnesses.rows).toHaveLength(1);
    // Touch phase variable so the linter is happy in strict mode.
    expect(['entries', 'witnesses']).toContain(phase);
  });
});
