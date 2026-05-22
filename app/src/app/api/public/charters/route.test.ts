import { describe, it, expect, vi, beforeEach } from 'vitest';

const listInstitutionsRows = vi.fn();
vi.mock('@/lib/db/repos/institutions', () => ({
  listInstitutionsRows: (o: unknown) => listInstitutionsRows(o),
}));

import { GET } from './route';

beforeEach(() => {
  listInstitutionsRows.mockReset().mockResolvedValue([
    { charter_id: 'MIN-H', label: 'Health', kind: 'ministry', domain: 'health', archetype_or_branch: 'executive', activated_at: '2026-01-01T00:00:00Z' },
  ]);
});

describe('GET /api/public/charters', () => {
  it('returns the activated charter directory', async () => {
    const res = await GET();
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.document).toBe('civicos.public_charters');
    expect(json.count).toBe(1);
    expect(json.charters[0].charter_id).toBe('MIN-H');
    expect(listInstitutionsRows).toHaveBeenCalledWith({ activated: true });
  });

  it('sets a public cache header', async () => {
    const res = await GET();
    expect(res.headers.get('cache-control')).toContain('max-age=600');
  });
});
