import { describe, it, expect } from 'vitest';
import { encodeTile, decodeTile, tileBounds, toTile, fromTile, validTile, EXTENT } from './mvt';

describe('Mapbox Vector Tiles', () => {
  it('writes the protobuf the specification describes', () => {
    const bytes = encodeTile([{ name: 'p', points: [{ id: 1, x: 25, y: 17, properties: { a: 'b' } }] }]);
    // Tile.layers (field 3, length-delimited) …
    expect(bytes[0]).toBe(0x1a);
    // … whose layer starts with version 2 (field 15, varint: 0x78 0x02) and the name "p" (field 1: 0x0a 0x01 0x70).
    expect([...bytes.slice(2, 7)]).toEqual([0x78, 0x02, 0x0a, 0x01, 0x70]);
    const [l] = decodeTile(bytes);
    // The specification's own point example: MoveTo(1) at (25, 17) is [9, 50, 34], packed in field 4 (0x22, length 3).
    expect(Buffer.from(bytes).includes(Buffer.from([0x22, 0x03, 9, 50, 34]))).toBe(true);
    expect(l).toEqual({ version: 2, name: 'p', extent: 4096, features: [{ id: 1, type: 1, geometry: [[25, 17]], properties: { a: 'b' } }] });
  });

  it('round-trips points, every kind of value and large ids, sharing keys and values', () => {
    const points = Array.from({ length: 3000 }, (_, i) => ({
      id: i * 1_000_003, x: (i * 37) % 4200 - 50, y: (i * 91) % 4200 - 50,
      properties: { name: `Site ${i}`, kind: i % 2 ? 'school' : 'clinic', beds: i, temp: -i - 1, share: i / 7, ok: i % 3 === 0, none: undefined },
    }));
    const [l] = decodeTile(encodeTile([{ name: 'facilities', points }]));
    expect(l!.features).toHaveLength(3000);
    l!.features.forEach((f, i) => {
      const p = points[i]!;
      expect(f.id).toBe(p.id);
      expect(f.geometry).toEqual([[p.x, p.y]]);
      expect(f.properties).toEqual({ name: p.properties.name, kind: p.properties.kind, beds: p.properties.beds, temp: p.properties.temp, share: p.properties.share, ok: p.properties.ok });
    });
    expect(decodeTile(encodeTile([{ name: 'x', points: [{ id: 2 ** 40 + 5, x: 0, y: 0, properties: {} }] }]))[0]!.features[0]!.id).toBe(2 ** 40 + 5);
    expect(decodeTile(encodeTile([]))).toEqual([]);
    expect(encodeTile([{ name: 'empty', points: [] }]).length).toBe(0);
  });

  it('places positions in tiles and back (Web Mercator, xyz)', () => {
    expect(tileBounds(0, 0, 0)).toEqual([-180, expect.closeTo(-85.0511, 3), 180, expect.closeTo(85.0511, 3)]);
    // Nairobi at zoom 10.
    const lng = 36.81724, lat = -1.28638, z = 10;
    const x = Math.floor(((lng + 180) / 360) * 2 ** z), y = Math.floor(((1 - Math.log(Math.tan((lat * Math.PI) / 180) + 1 / Math.cos((lat * Math.PI) / 180)) / Math.PI) / 2) * 2 ** z);
    const [px, py] = toTile(lng, lat, z, x, y);
    expect(px).toBeGreaterThanOrEqual(0); expect(px).toBeLessThan(EXTENT); expect(py).toBeGreaterThanOrEqual(0); expect(py).toBeLessThan(EXTENT);
    const [l2, b2] = fromTile(px, py, z, x, y);
    expect(Math.abs(l2 - lng)).toBeLessThan(1e-4); expect(Math.abs(b2 - lat)).toBeLessThan(1e-4);
    const [w, s, e, n] = tileBounds(z, x, y);
    expect(lng > w && lng < e && lat > s && lat < n).toBe(true);
    expect(validTile(3, 7, 7)).toBe(true);
    expect(validTile(3, 8, 0)).toBe(false);
    expect(validTile(-1, 0, 0)).toBe(false);
  });
});
