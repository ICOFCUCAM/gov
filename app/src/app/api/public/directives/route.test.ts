import { describe, it, expect, vi, beforeEach } from 'vitest';

const listDirectivesRows = vi.fn();
vi.mock('@/lib/db/repos/memory', () => ({
  listDirectivesRows: (o: unknown) => listDirectivesRows(o),
}));

import { GET } from './route';

beforeEach(() => {
  listDirectivesRows.mockReset().mockResolvedValue([
    { ref: 'DIR-1', kind: 'policy', title: 'A', issued_by_charter_id: 'MIN-X', status: 'effective', citation: null, targets: [], signed_at: '2026-05-01T00:00:00Z', effective_at: '2026-05-02T00:00:00Z', rescinded_at: null },
    { ref: 'DIR-2', kind: 'policy', title: 'draft', issued_by_charter_id: 'MIN-X', status: 'drafting', citation: null, targets: [], signed_at: null, effective_at: null, rescinded_at: null },
  ]);
});

describe('GET /api/public/directives', () => {
  it('returns only public-status directives', async () => {
    const res = await GET(new Request('http://x/api/public/directives'));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.document).toBe('civicos.public_directives');
    expect(json.count).toBe(1); // drafting excluded
    expect(json.directives[0].ref).toBe('DIR-1');
  });

  it('forwards an issuer filter', async () => {
    await GET(new Request('http://x/api/public/directives?issuer=MIN-X'));
    expect(listDirectivesRows).toHaveBeenCalledWith({ issuer: 'MIN-X', limit: 200 });
  });
});
