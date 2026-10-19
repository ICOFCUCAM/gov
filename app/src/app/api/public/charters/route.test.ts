import { describe, it, expect, vi, beforeEach } from 'vitest';

const listInstitutionsRows = vi.fn();
vi.mock('@/lib/db/repos/institutions', () => ({
  listInstitutionsRows: (o: unknown) => listInstitutionsRows(o),
}));

import { GET } from './route';
import { institutionRows } from '@/lib/db/mirror';

beforeEach(() => {
  listInstitutionsRows.mockReset().mockResolvedValue([
    { charter_id: 'presidency', label: 'Presidency (mirror)', kind: 'branch', domain: 'presidency', archetype_or_branch: 'GENERIC', activated_at: '2026-01-01T00:00:00Z' },
  ]);
});

describe('GET /api/public/charters', () => {
  it('returns the activated charter directory from the platform registry', async () => {
    const res = await GET();
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.document).toBe('civicos.public_charters');
    const active = institutionRows().filter(r => r.activated);
    expect(json.count).toBe(active.length);
    const presidency = json.charters.find((c: { charter_id: string }) => c.charter_id === 'presidency');
    // The registry's label, the substrate mirror's activation time.
    expect(presidency).toMatchObject({ label: active.find(r => r.charterId === 'presidency')!.label, kind: 'branch', activated_at: '2026-01-01T00:00:00Z' });
    expect(listInstitutionsRows).toHaveBeenCalledWith({ activated: true });
  });

  it('answers without the substrate', async () => {
    listInstitutionsRows.mockRejectedValue(new Error('down'));
    const json = await (await GET()).json();
    expect(json.count).toBeGreaterThan(0);
    expect(json.charters.every((c: { activated_at: string | null }) => c.activated_at === null)).toBe(true);
  });

  it('sets a public cache header', async () => {
    const res = await GET();
    expect(res.headers.get('cache-control')).toContain('max-age=600');
  });
});
