import { describe, it, expect } from 'vitest';
import {
  MAX_PICK, NO_GLYPH, POINT_STRIDE, POLY_STRIDE, WEBGL_POINTS, applyMatrix, atlasLayout, decodePickId, encodePickId, glyphIndex,
  lerpZoom, mapMatrix, nearestPick, packPoints, packPolygons, parseColour, pointRenderer, pointSize, toneIndex,
} from './gl-points';
import { triangulate, trianglesArea, polygonArea } from './triangulate';
import { STATUS } from '@/lib/theme/tokens';

describe('which renderer draws the located points', () => {
  it('keeps SVG to 2,000, the canvas to 20,000 and WebGL above, falling back without WebGL', () => {
    expect(WEBGL_POINTS).toBe(20_000);
    expect(pointRenderer(2000, { webgl: true })).toBe('svg');
    expect(pointRenderer(2001, { webgl: true })).toBe('canvas');
    expect(pointRenderer(20_000, { webgl: true })).toBe('canvas');
    expect(pointRenderer(20_001, { webgl: true })).toBe('webgl');
    expect(pointRenderer(100_000, { webgl: false })).toBe('canvas');
    expect(pointRenderer(5000, { webgl: true, webglAbove: 4000 })).toBe('webgl');
    // Tile-backed layers always draw on the GPU when it is there.
    expect(pointRenderer(3, { webgl: true, tiles: true })).toBe('webgl');
    expect(pointRenderer(3, { webgl: false, tiles: true })).toBe('canvas');
  });
});

describe('picking ids', () => {
  it('round-trips every index through a 24-bit colour, with 0 meaning nothing', () => {
    for (const i of [0, 1, 254, 255, 256, 65_535, 65_536, 99_999, 1_000_000, MAX_PICK]) {
      const [r, g, b, a] = encodePickId(i);
      expect(a).toBe(255);
      expect([r, g, b].every(c => c >= 0 && c <= 255)).toBe(true);
      expect(decodePickId(r, g, b, a)).toBe(i);
    }
    expect(decodePickId(0, 0, 0)).toBeNull();
    expect(decodePickId(5, 0, 0, 0)).toBeNull();
    expect(() => encodePickId(MAX_PICK + 1)).toThrow();
    expect(() => encodePickId(-1)).toThrow();
  });

  it('finds the drawn id nearest the centre of a block read back from the GPU', () => {
    const size = 9, px = new Uint8Array(size * size * 4);
    const put = (col: number, row: number, id: number) => px.set(encodePickId(id), (row * size + col) * 4);
    put(0, 0, 7); put(6, 4, 42); put(8, 8, 3);
    expect(nearestPick(px, size, 4)).toBe(42);
    expect(nearestPick(new Uint8Array(size * size * 4), size)).toBeNull();
    // Outside the radius nothing counts.
    const far = new Uint8Array(size * size * 4); far.set(encodePickId(9), 0);
    expect(nearestPick(far, size, 3)).toBeNull();
    // Points and polygons share the pass: polygon ids follow the point ids and can be told apart.
    expect(nearestPick(px, size, 4, id => id < 10)).toBeNull();
    expect(nearestPick(px, size, 6, id => id < 10)).toBe(7);
    expect(nearestPick(px, size, 6, id => id >= 10)).toBe(42);
  });
});

describe('buffer packing', () => {
  it('packs points interleaved in tone order, alert last, and picks answer with the caller\'s index', () => {
    const pts = [
      { x: 1, y: 2, tone: 'alert' as const, glyph: 3 },
      { x: 3, y: 4, tone: 'ok' as const, generalised: true },
      { x: 5, y: 6, tone: 'neutral' as const },
      { x: 7, y: 8, tone: 'warn' as const, glyph: 999 },
      { x: 9, y: 10, tone: 'ok' as const },
    ];
    const p = packPoints(pts);
    expect(p.count).toBe(5);
    expect(p.data.byteLength).toBe(5 * POINT_STRIDE);
    expect([...p.order]).toEqual([2, 1, 4, 3, 0]);
    const f = new Float32Array(p.data), u = new Uint8Array(p.data);
    p.order.forEach((orig, k) => {
      const o = k * POINT_STRIDE;
      expect(f[o / 4]).toBe(pts[orig]!.x); expect(f[o / 4 + 1]).toBe(pts[orig]!.y);
      expect(u[o + 8]).toBe(toneIndex(pts[orig]!.tone));
      expect(decodePickId(u[o + 12]!, u[o + 13]!, u[o + 14]!, u[o + 15]!)).toBe(orig);
      expect(p.drawIndex(orig)).toBe(k);
    });
    // glyph indices out of the atlas are "no glyph"; the generalised flag is kept
    expect(u[p.drawIndex(0) * POINT_STRIDE + 9]).toBe(3);
    expect(u[p.drawIndex(3) * POINT_STRIDE + 9]).toBe(NO_GLYPH);
    expect(u[p.drawIndex(1) * POINT_STRIDE + 10]).toBe(1);
  });

  it('packs 100,000 points quickly', () => {
    const pts = Array.from({ length: 100_000 }, (_, i) => ({ x: i % 640, y: (i * 7) % 480, tone: (['ok', 'warn', 'alert', 'neutral'] as const)[i % 4]! }));
    const t0 = performance.now();
    const p = packPoints(pts);
    expect(p.count).toBe(100_000);
    expect(performance.now() - t0).toBeLessThan(500);
  });

  it('packs polygons as one triangle list with fill and pick colours per polygon', () => {
    const sq = triangulate([[[0, 0], [10, 0], [10, 10], [0, 10], [0, 0]]]);
    const tri = triangulate([[[20, 0], [30, 0], [25, 8]]]);
    const p = packPolygons([{ triangles: sq, fill: [1, 0, 0, 0.5] }, { triangles: tri, fill: [0, 1, 0, 1] }]);
    expect(p.vertices).toBe(6 + 3);
    expect(p.data.byteLength).toBe(9 * POLY_STRIDE);
    const u = new Uint8Array(p.data);
    expect([...u.subarray(8, 12)]).toEqual([255, 0, 0, 128]);
    expect(decodePickId(u[12]!, u[13]!, u[14]!)).toBe(0);
    const last = 8 * POLY_STRIDE;
    expect([...u.subarray(last + 8, last + 12)]).toEqual([0, 255, 0, 255]);
    expect(decodePickId(u[last + 12]!, u[last + 13]!, u[last + 14]!)).toBe(1);
    // after 500 points, the polygons' pick ids start at 500
    const off = new Uint8Array(packPolygons([{ triangles: tri, fill: [0, 0, 0, 1] }], 500).data);
    expect(decodePickId(off[12]!, off[13]!, off[14]!)).toBe(500);
  });
});

describe('projection matrices', () => {
  it('takes the map frame to clip space, y down to y up', () => {
    const m = mapMatrix(800, 400);
    const at = (x: number, y: number) => applyMatrix(m, x, y).map(v => Math.round(v * 1e6) / 1e6 + 0);
    expect(at(0, 0)).toEqual([-1, 1]);
    expect(at(800, 400)).toEqual([1, -1]);
    expect(at(400, 200)).toEqual([0, 0]);
  });

  it('applies the map\'s zoom exactly as the SVG group transform does', () => {
    const zoom = { z: 2.5, tx: -300, ty: -120 };
    const m = mapMatrix(800, 400, zoom);
    for (const [x, y] of [[0, 0], [123, 45], [800, 400], [512.5, 3.25]] as const) {
      const sx = x * zoom.z + zoom.tx, sy = y * zoom.z + zoom.ty;
      const [cx, cy] = applyMatrix(m, x, y);
      expect(cx).toBeCloseTo((sx / 800) * 2 - 1, 5);
      expect(cy).toBeCloseTo(1 - (sy / 400) * 2, 5);
    }
  });

  it('eases between zooms', () => {
    const a = { z: 1, tx: 0, ty: 0 }, b = { z: 3, tx: -100, ty: -50 };
    expect(lerpZoom(a, b, 0)).toEqual(a);
    expect(lerpZoom(a, b, 1)).toEqual(b);
    expect(lerpZoom(a, b, 0.5)).toEqual({ z: 2, tx: -50, ty: -25 });
  });
});

describe('sizes, colours and glyphs', () => {
  it('sizes dots and tiles by zoom and density', () => {
    expect(pointSize('dot', 1, 30_000).body).toBe(7);
    expect(pointSize('dot', 1, 100_000).body).toBe(5);
    expect(pointSize('dot', 4, 30_000).body).toBe(14);
    expect(pointSize('dot', 100, 30_000).body).toBe(21);
    // the theatre's 18 px glyph tile when sparse; small tiles without glyphs when crowded
    expect(pointSize('tile', 1, 500)).toMatchObject({ body: 18, glyph: true });
    expect(pointSize('tile', 1, 50_000)).toMatchObject({ body: 7, glyph: false });
    expect(pointSize('tile', 4, 50_000)).toMatchObject({ body: 18, glyph: true });
    expect(pointSize('tile', 1, 500).frame).toBeGreaterThan(18);
  });

  it('follows the spacing between points when it knows the land they spread over', () => {
    // 50,000 sites over ~150,000 px² of land: specks, no halo, no glyph, no glow
    const dense = pointSize('dot', 1, 50_000, 150_000);
    expect(dense.body).toBeGreaterThanOrEqual(2.5); expect(dense.body).toBeLessThan(3);
    expect(dense.halo).toBe(false);
    const tile = pointSize('tile', 1, 50_000, 150_000);
    expect(tile).toMatchObject({ glyph: false, glow: false });
    expect(tile.body).toBeLessThan(4);
    // zoomed in 8 times the same layer spreads out: full theatre tiles again
    expect(pointSize('tile', 8, 50_000, 150_000)).toMatchObject({ glyph: true, glow: true });
    expect(pointSize('tile', 12, 50_000, 150_000).body).toBe(18);
    // a sparse layer keeps the full look
    expect(pointSize('dot', 1, 25_000, 4_000_000)).toMatchObject({ body: 7, halo: true });
  });

  it('reads the token colours and theme triplets', () => {
    expect(parseColour(STATUS.ok)).toEqual([0x34 / 255, 0xd3 / 255, 0x9c / 255, 1]);
    expect(parseColour('7 12 20')).toEqual([7 / 255, 12 / 255, 20 / 255, 1]);
    expect(parseColour('rgb(255, 0, 0)', 0.5)).toEqual([1, 0, 0, 0.5]);
    expect(parseColour('#fff')).toEqual([1, 1, 1, 1]);
    expect(parseColour('rgb(var(--c-bg))')).toBeNull();
  });

  it('lays out the glyph atlas', () => {
    const g = glyphIndex(['✚', undefined, '✎', '✚', '⚖']);
    expect(g.list).toEqual(['✚', '✎', '⚖']);
    expect(g.of('⚖')).toBe(2);
    expect(g.of(undefined)).toBeUndefined();
    expect(atlasLayout(17)).toEqual({ cols: 16, rows: 2, width: 512, height: 64 });
  });
});

describe('polygon triangulation', () => {
  const close = (a: number, b: number) => expect(Math.abs(a - b)).toBeLessThan(1e-6 * Math.max(1, Math.abs(b)));

  it('covers a square, a concave L and either winding exactly', () => {
    const sq = [[[0, 0], [4, 0], [4, 4], [0, 4], [0, 0]]];
    close(trianglesArea(triangulate(sq)), 16);
    const L = [[[0, 0], [6, 0], [6, 2], [2, 2], [2, 6], [0, 6]]];
    expect(triangulate(L).length / 6).toBe(4);
    close(trianglesArea(triangulate(L)), polygonArea(L));
    const cw = [[...L[0]!].reverse()];
    close(trianglesArea(triangulate(cw)), polygonArea(L));
  });

  it('leaves holes open', () => {
    const withHole = [
      [[0, 0], [10, 0], [10, 10], [0, 10], [0, 0]],
      [[3, 3], [3, 7], [7, 7], [7, 3], [3, 3]],
      [[8, 8], [9, 8], [9, 9], [8, 9]],
    ];
    const t = triangulate(withHole);
    close(trianglesArea(t), 100 - 16 - 1);
    // No triangle's centre falls in a hole.
    for (let i = 0; i < t.length; i += 6) {
      const cx = (t[i]! + t[i + 2]! + t[i + 4]!) / 3, cy = (t[i + 1]! + t[i + 3]! + t[i + 5]!) / 3;
      expect(cx > 3 && cx < 7 && cy > 3 && cy < 7).toBe(false);
    }
  });

  it('handles a many-sided star and degenerate input', () => {
    const star = [Array.from({ length: 40 }, (_, i) => { const a = (i / 40) * Math.PI * 2, r = i % 2 ? 4 : 10; return [r * Math.cos(a), r * Math.sin(a)]; })];
    close(trianglesArea(triangulate(star)), polygonArea(star));
    expect(triangulate([[[0, 0], [1, 1]]])).toEqual([]);
    expect(triangulate([[[0, 0], [1, 0], [2, 0], [0, 0]]])).toEqual([]);
  });
});
