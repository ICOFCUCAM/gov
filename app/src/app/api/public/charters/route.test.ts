import { describe, it, expect } from 'vitest';
import { GET } from './route';
import { charterRecords } from '@/lib/institution/charter-register';

const get = (q = '') => GET(new Request(`http://x/api/public/charters${q}`));

describe('GET /api/public/charters', () => {
  it('returns the activated charter directory from the platform registry', async () => {
    const res = await get();
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.document).toBe('civicos.public_charters');
    expect(json.source).toBe('platform');
    const active = charterRecords().filter(r => r.activated);
    expect(json.count).toBe(active.length);
    const presidency = json.charters.find((c: { charter_id: string }) => c.charter_id === 'presidency');
    expect(presidency).toMatchObject({ label: active.find(r => r.charterId === 'presidency')!.label, kind: 'branch', activated: true });
  });

  it('gives each active ministry charter its first activation from the registry', async () => {
    const json = await (await get('?kind=ministry')).json();
    expect(json.charters.length).toBeGreaterThan(0);
    for (const c of json.charters) {
      expect(c.kind).toBe('ministry');
      expect(c.activated_at).toEqual(expect.any(String));
      expect(c.registered_at).toEqual(expect.any(String));
    }
  });

  it('filters by activation, charter and text', async () => {
    const all = await (await get('?activated=any')).json();
    expect(all.count).toBe(charterRecords().length);
    const one = await (await get('?activated=any&charter=senate')).json();
    expect(one.charters.map((c: { charter_id: string }) => c.charter_id)).toEqual(['senate']);
    const q = await (await get('?activated=any&q=SENA')).json();
    expect(q.charters.some((c: { charter_id: string }) => c.charter_id === 'senate')).toBe(true);
  });

  it('sets a public cache header', async () => {
    const res = await get();
    expect(res.headers.get('cache-control')).toContain('max-age=600');
  });
});
