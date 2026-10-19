import { describe, it, expect, beforeEach } from 'vitest';
import { facilitiesTile, facilitiesTileJson, parseTile, TILE_LAYER } from './tiles';
import { decodeTile, fromTile } from '@/lib/geo/mvt';
import { resetFacilities, proposeFacility, actOnFacility } from '@/lib/data/facilities';
import { listMinistries } from '@/lib/data/store';
import { applyNation } from '@/lib/nation/registry';

const tileOf = (lng: number, lat: number, z: number) => ({
  x: Math.floor(((lng + 180) / 360) * 2 ** z),
  y: Math.floor(((1 - Math.log(Math.tan((lat * Math.PI) / 180) + 1 / Math.cos((lat * Math.PI) / 180)) / Math.PI) / 2) * 2 ** z),
});

let school: string, police: string;
beforeEach(async () => {
  resetFacilities();
  applyNation({ iso3: 'KEN', regions: [] });
  const [m] = listMinistries();
  const add = async (name: string, category: string, lng: number, lat: number) => {
    const r = await proposeFacility(m!.id, { name, category, lng, lat, method: 'device-gps' }, 'Officer A');
    if ('error' in r) throw new Error(r.error);
    await actOnFacility(r.facility.id, { action: 'publish' }, 'Signer B');
    return r.facility.id;
  };
  school = await add('Nairobi Primary', 'school', 36.81724, -1.28638);
  police = await add('Central Police Station', 'police', 36.82194, -1.28333);
  await add('Mombasa Clinic', 'health', 39.6682, -4.0435);
});

describe('facility vector tiles', () => {
  it('serves published sites as an MVT point layer that decodes to their positions', () => {
    const z = 12, { x, y } = tileOf(36.81724, -1.28638, z);
    const t = facilitiesTile(z, x, y, { signedIn: true });
    const layers = decodeTile(t.bytes);
    expect(layers.map(l => l.name)).toEqual([TILE_LAYER]);
    const [l] = layers;
    expect(l!.version).toBe(2);
    const byId = new Map(l!.features.map(f => [f.properties.id, f]));
    expect([...byId.keys()].sort()).toEqual([school, police].sort());
    const s = byId.get(school)!;
    expect(s.type).toBe(1);
    expect(s.properties).toMatchObject({ name: 'Nairobi Primary', category: 'school', categoryLabel: 'School', status: 'operational', regionCode: 'KE-30', certified: false, nationalId: expect.stringMatching(/^[0-9a-f-]{36}$/) });
    expect(s.id).toBe(Number(school.replace(/\D/g, '')));
    const [lng, lat] = fromTile(s.geometry[0]![0], s.geometry[0]![1], z, x, y);
    expect(Math.abs(lng - 36.81724)).toBeLessThan(1e-3); expect(Math.abs(lat + 1.28638)).toBeLessThan(1e-3);
    // Mombasa is in another tile; a whole-nation tile has all three.
    const all = decodeTile(facilitiesTile(0, 0, 0, { signedIn: true }).bytes)[0]!;
    expect(all.features).toHaveLength(3);
    const far = tileOf(2.35, 48.85, 8);
    expect(decodeTile(facilitiesTile(8, far.x, far.y, { signedIn: true }).bytes)).toEqual([]);
  });

  it('places a restricted site where the viewer may see it', () => {
    const z = 14, { x, y } = tileOf(36.82194, -1.28333, z);
    const gov = decodeTile(facilitiesTile(z, x, y, { signedIn: true }).bytes)[0]!.features.find(f => f.properties.id === police)!;
    const [glng, glat] = fromTile(gov.geometry[0]![0], gov.geometry[0]![1], z, x, y);
    expect(Math.abs(glng - 36.82194)).toBeLessThan(1e-4); expect(Math.abs(glat + 1.28333)).toBeLessThan(1e-4);
    // The public sees it at its generalised position (the policy's 0.05° grid), marked, never at its true one.
    const step = 0.05, snap = (v: number) => Math.round(v / step) * step + step / 2;
    for (const zz of [4, 10, 14]) {
      const tt = tileOf(snap(36.82194), snap(-1.28333), zz);
      const pub = decodeTile(facilitiesTile(zz, tt.x, tt.y, { signedIn: false }).bytes)[0]!.features.find(f => f.properties.id === police)!;
      expect(pub.properties.generalised).toBe(true);
      const [plng, plat] = fromTile(pub.geometry[0]![0], pub.geometry[0]![1], zz, tt.x, tt.y);
      const tol = 360 / 2 ** zz / 4096 * 2;
      expect(Math.abs(plng - snap(36.82194))).toBeLessThan(tol); expect(Math.abs(plat - snap(-1.28333))).toBeLessThan(tol);
      expect(Math.abs(plng - 36.82194) + Math.abs(plat + 1.28333)).toBeGreaterThan(0.005);
    }
    expect(gov.properties.generalised).toBeUndefined();
  });

  it('reads tile addresses and describes itself as TileJSON', () => {
    expect(parseTile('12', '2466', '2063.mvt')).toEqual({ z: 12, x: 2466, y: 2063 });
    expect(parseTile('3', '1', '2.pbf')).toEqual({ z: 3, x: 1, y: 2 });
    expect(parseTile('3', '8', '0')).toBeNull();
    expect(parseTile('30', '0', '0')).toBeNull();
    expect(parseTile('a', '0', '0')).toBeNull();
    const tj = facilitiesTileJson('https://gov.example', { signedIn: false });
    expect(tj).toMatchObject({ tilejson: '3.0.0', tiles: ['https://gov.example/api/twin/tiles/facilities/{z}/{x}/{y}.mvt'], vector_layers: [expect.objectContaining({ id: 'facilities' })] });
    expect(tj.bounds[0]).toBeGreaterThan(36); expect(tj.bounds[2]).toBeLessThan(40);
  });
});
