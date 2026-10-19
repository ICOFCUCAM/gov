import { describe, it, expect } from 'vitest';
import { EXTENT, encodeTile, fromTile } from '@/lib/geo/mvt';
import { PieceCache, loadUnitTiles, mergeUnitPieces, tilePath, unitPiecesOf } from './boundary-tiles';

const t = { z: 6, x: 38, y: 32 };
const tile = (shapes: { code: string; rings: [number, number][][] }[], layer = 'districts') =>
  encodeTile([{ name: layer, points: [], shapes: shapes.map((s, i) => ({ id: i + 1, type: 'polygon' as const, rings: s.rings, properties: { code: s.code, name: s.code } })) }]);

describe('console maps drawing units from the boundary tiles', () => {
  it('clips a unit back to the tile\'s own box and strokes none of the tile\'s edges', () => {
    // A unit wider than the tile (it runs into the buffer on the west and the south).
    const b = tile([{ code: 'D-1', rings: [[[-64, 1000], [3000, 1000], [3000, EXTENT + 64], [-64, EXTENT + 64]]] }]);
    const [p] = unitPiecesOf(b, t);
    expect(p!.code).toBe('D-1');
    const ring = p!.rings[0]!;
    const west = fromTile(0, 0, t.z, t.x, t.y)[0], south = fromTile(0, EXTENT, t.z, t.x, t.y)[1];
    expect(Math.min(...ring.map(c => c[0]))).toBeCloseTo(west, 9);
    expect(Math.min(...ring.map(c => c[1]))).toBeCloseTo(south, 9);
    // The outline is the unit's own north and east sides only, as one line.
    expect(p!.edges).toHaveLength(1);
    const line = p!.edges[0]!;
    // From the tile's west edge along the north side, then down the east side to the tile's south edge.
    expect(line).toHaveLength(3);
    expect(line[0]![0]).toBeCloseTo(west, 9);
    expect(line[1]![0]).toBeGreaterThan(west + 1e-6);
    expect(line[2]![1]).toBeCloseTo(south, 9);
  });

  it('keeps a unit inside the tile whole, with its closed outline, and leaves out the disputed layer and features without a code', () => {
    const b = encodeTile([
      { name: 'regions', points: [], shapes: [
        { id: 1, type: 'polygon', rings: [[[100, 100], [900, 100], [900, 900], [100, 900]]], properties: { code: 'R-1' } },
        { id: 2, type: 'polygon', rings: [[[0, 0], [10, 0], [10, 10]]], properties: { name: 'no code' } },
      ] },
      { name: 'disputed', points: [], shapes: [{ id: 3, type: 'polygon', rings: [[[1, 1], [50, 1], [50, 50]]], properties: { code: 'X' } }] },
    ]);
    const ps = unitPiecesOf(b, t);
    expect(ps.map(p => p.code)).toEqual(['R-1']);
    expect(ps[0]!.edges).toHaveLength(1);
    expect(ps[0]!.edges[0]).toHaveLength(5); // closed: back to the first corner
  });

  it('groups a unit\'s pieces from several tiles and draws them with the map\'s projection', async () => {
    const left = tile([{ code: 'D-1', rings: [[[2000, 0], [EXTENT + 64, 0], [EXTENT + 64, 2000], [2000, 2000]]] }]);
    const right = tile([{ code: 'D-1', rings: [[[-64, 0], [1000, 0], [1000, 2000], [-64, 2000]]] }, { code: 'D-2', rings: [[[1500, 100], [2500, 100], [2500, 900]]] }]);
    const a = { ...t }, b = { ...t, x: t.x + 1 };
    const m = mergeUnitPieces([unitPiecesOf(left, a), unitPiecesOf(right, b)]);
    expect([...m.keys()].sort()).toEqual(['D-1', 'D-2']);
    expect(m.get('D-1')!.rings).toHaveLength(2);
    // The two pieces meet exactly at the tiles' shared edge: no gap, no overlap.
    const east = Math.max(...m.get('D-1')!.rings[0]!.map(c => c[0])), west = Math.min(...m.get('D-1')!.rings[1]!.map(c => c[0]));
    expect(east).toBeCloseTo(west, 9);
    const project = (lng: number, lat: number) => [lng * 10, -lat * 10] as [number, number];
    expect(tilePath(m.get('D-2')!.rings, project, true)).toMatch(/^M [\d.-]+ [\d.-]+ L .* Z$/);
    expect(tilePath(m.get('D-1')!.edges, project, false)).not.toMatch(/Z/);
    // Loaded through the cache: each tile fetched once.
    const fetched: string[] = [];
    const cache = new PieceCache(4);
    const fetch = async (x: { z: number; x: number; y: number }) => { fetched.push(`${x.z}/${x.x}/${x.y}`); return x.x === a.x ? left : right; };
    const r1 = await loadUnitTiles([a, b], { fetch, cache });
    const r2 = await loadUnitTiles([a, b], { fetch, cache });
    expect(r1.units.get('D-1')!.rings).toHaveLength(2);
    expect(r2.tiles).toBe(2);
    expect(fetched).toHaveLength(2);
  });
});
