import { describe, it, expect } from 'vitest';
import { gzipSync } from 'node:zlib';
import {
  Compression, HEADER_BYTES, PMTilesReader, ROOT_BYTES, TileType, bufferSource, deserializeDirectory, deserializeHeader, findEntry,
  serializeDirectory, serializeHeader, tileIdToZxy, writeArchive, zxyToTileId, httpSource, ArchiveChanged, type Entry, type Header,
} from './pmtiles';
import { encodeTile, decodeTile } from './mvt';

const gzip = (b: Uint8Array) => new Uint8Array(gzipSync(b));

describe('PMTiles tile ids', () => {
  it('numbers tiles along the Hilbert curve as the spec does', () => {
    expect(zxyToTileId(0, 0, 0)).toBe(0);
    expect(zxyToTileId(1, 0, 0)).toBe(1);
    expect(zxyToTileId(1, 0, 1)).toBe(2);
    expect(zxyToTileId(1, 1, 1)).toBe(3);
    expect(zxyToTileId(1, 1, 0)).toBe(4);
    expect(zxyToTileId(2, 0, 0)).toBe(5);
    expect(zxyToTileId(12, 0, 0)).toBe((4 ** 12 - 1) / 3);
  });

  it('round-trips z/x/y through tile ids up to zoom 26', () => {
    for (const [z, x, y] of [[0, 0, 0], [3, 5, 2], [7, 100, 3], [12, 2398, 2047], [18, 155_000, 100_000], [26, 2 ** 26 - 1, 12345]] as const) {
      expect(tileIdToZxy(zxyToTileId(z, x, y))).toEqual([z, x, y]);
    }
    for (let z = 0; z <= 4; z++) {
      const ids = new Set<number>();
      for (let x = 0; x < 2 ** z; x++) for (let y = 0; y < 2 ** z; y++) ids.add(zxyToTileId(z, x, y));
      expect(ids.size).toBe(4 ** z);
      expect(Math.min(...ids)).toBe((4 ** z - 1) / 3);
    }
    expect(() => zxyToTileId(2, 4, 0)).toThrow();
  });
});

describe('PMTiles header and directories', () => {
  it('writes and reads the 127-byte header', () => {
    const h: Header = {
      specVersion: 3, rootDirectoryOffset: 127, rootDirectoryLength: 40, jsonMetadataOffset: 167, jsonMetadataLength: 20,
      leafDirectoryOffset: 187, leafDirectoryLength: 0, tileDataOffset: 187, tileDataLength: 2 ** 33 + 5,
      numAddressedTiles: 10, numTileEntries: 7, numTileContents: 5, clustered: true,
      internalCompression: Compression.Gzip, tileCompression: Compression.Gzip, tileType: TileType.Mvt, minZoom: 0, maxZoom: 12,
      minLon: 33.9098987, minLat: -4.6787, maxLon: 41.899, maxLat: 5.0193, centerZoom: 6, centerLon: 37.9, centerLat: 0.17,
    };
    const b = serializeHeader(h);
    expect(b.length).toBe(HEADER_BYTES);
    expect(String.fromCharCode(...b.subarray(0, 7))).toBe('PMTiles');
    expect(b[7]).toBe(3);
    expect(deserializeHeader(b)).toEqual(h);
    expect(() => deserializeHeader(new Uint8Array(127))).toThrow(/not a PMTiles/);
  });

  it('serialises directories with delta ids and contiguous offsets', () => {
    const entries: Entry[] = [
      { tileId: 0, offset: 0, length: 10, runLength: 1 },
      { tileId: 1, offset: 10, length: 5, runLength: 3 },
      { tileId: 9, offset: 0, length: 10, runLength: 1 },
      { tileId: 2 ** 40, offset: 2 ** 35, length: 300, runLength: 0 },
    ];
    const b = serializeDirectory(entries);
    expect(deserializeDirectory(b)).toEqual(entries);
    expect(findEntry(entries, 2)).toEqual(entries[1]);
    expect(findEntry(entries, 4)).toBeNull();
    expect(findEntry(entries, 9)).toEqual(entries[2]);
    expect(findEntry(entries, 2 ** 40 + 77)).toEqual(entries[3]);
  });
});

describe('PMTiles archives', () => {
  const tileAt = (z: number, x: number, y: number) => encodeTile([{ name: 'facilities', points: [{ id: z * 1000 + x, x: 100 + x, y: 200 + y, properties: { name: `site ${z}/${x}/${y}`, z } }] }]);

  it('round-trips vector tiles through an archive, compressed and deduplicated', async () => {
    const tiles = [] as { z: number; x: number; y: number; data: Uint8Array }[];
    for (let z = 0; z <= 6; z++) for (let x = 0; x < Math.min(2 ** z, 6); x++) tiles.push({ z, x, y: Math.min(2 ** z - 1, 3), data: gzip(tileAt(z, x, Math.min(2 ** z - 1, 3))) });
    // three tiles with identical bytes: stored once
    const dup = gzip(tileAt(9, 9, 9));
    tiles.push({ z: 8, x: 200, y: 1, data: dup }, { z: 8, x: 10, y: 250, data: dup }, { z: 8, x: 77, y: 77, data: dup });
    const archive = writeArchive(tiles.slice().reverse(), {
      tileType: TileType.Mvt, tileCompression: Compression.Gzip, internalCompression: Compression.Gzip, compress: gzip,
      metadata: { name: 'test', vector_layers: [{ id: 'facilities' }] }, bounds: [33.9, -4.7, 41.9, 5.0],
    });
    const r = new PMTilesReader(bufferSource(archive));
    const h = await r.header();
    expect(h).toMatchObject({ tileType: TileType.Mvt, minZoom: 0, maxZoom: 8, clustered: true, numAddressedTiles: tiles.length, numTileContents: tiles.length - 2 });
    expect(h.rootDirectoryOffset).toBe(HEADER_BYTES);
    expect(await r.metadata()).toMatchObject({ name: 'test' });
    for (const t of tiles) {
      const got = await r.tile(t.z, t.x, t.y);
      const layer = decodeTile(got!)[0]!;
      expect(layer.name).toBe('facilities');
    }
    expect(decodeTile((await r.tile(3, 2, 3))!)[0]!.features[0]!.properties).toEqual({ name: 'site 3/2/3', z: 3 });
    expect(await r.tile(3, 7, 7)).toBeNull();
    expect(await r.tile(9, 0, 0)).toBeNull();
  });

  it('extends a run for consecutive identical tiles', async () => {
    const same = gzip(tileAt(1, 1, 1));
    const tiles = [0, 1, 2, 3].map(i => ({ z: 2, ...((): { x: number; y: number } => { const [, x, y] = tileIdToZxy(5 + i); return { x, y }; })(), data: same }));
    const archive = writeArchive(tiles, { tileType: TileType.Mvt, tileCompression: Compression.Gzip, internalCompression: Compression.None, compress: b => b, metadata: {}, bounds: [-180, -85, 180, 85] });
    const h = deserializeHeader(archive);
    expect(h).toMatchObject({ numAddressedTiles: 4, numTileEntries: 1, numTileContents: 1 });
    const root = deserializeDirectory(archive.slice(h.rootDirectoryOffset, h.rootDirectoryOffset + h.rootDirectoryLength));
    expect(root).toEqual([{ tileId: 5, offset: 0, length: same.length, runLength: 4 }]);
  });

  it('moves entries into leaf directories when the root would pass 16 KiB', async () => {
    const tiles: { z: number; x: number; y: number; data: Uint8Array }[] = [];
    for (let x = 0; x < 128; x++) for (let y = 0; y < 128; y++) tiles.push({ z: 7, x, y, data: new Uint8Array([x, y, 7, (x * y) % 251]) });
    const archive = writeArchive(tiles, { tileType: TileType.Unknown, tileCompression: Compression.None, internalCompression: Compression.None, compress: b => b, metadata: {}, bounds: [-180, -85, 180, 85], leafSize: 1024 });
    const h = deserializeHeader(archive);
    expect(h.leafDirectoryLength).toBeGreaterThan(0);
    expect(h.rootDirectoryOffset + h.rootDirectoryLength).toBeLessThanOrEqual(ROOT_BYTES);
    const r = new PMTilesReader(bufferSource(archive));
    for (const [x, y] of [[0, 0], [127, 127], [64, 3], [5, 99]] as const) expect([...(await r.tile(7, x, y))!]).toEqual([x, y, 7, (x * y) % 251]);
  });

  it('reads over HTTP ranges and notices a rebuilt archive', async () => {
    const a = writeArchive([{ z: 0, x: 0, y: 0, data: tileAt(0, 0, 0) }], { tileType: TileType.Mvt, tileCompression: Compression.None, internalCompression: Compression.None, compress: b => b, metadata: {}, bounds: [-1, -1, 1, 1] });
    let etag = '"one"';
    const ranges: string[] = [];
    const fake = (async (_url: string, init?: RequestInit) => {
      const range = (init?.headers as Record<string, string>).range!;
      ranges.push(range);
      const [, s, e] = /bytes=(\d+)-(\d+)/.exec(range)!;
      return new Response(a.slice(Number(s), Number(e) + 1), { status: 206, headers: { etag } });
    }) as unknown as typeof fetch;
    const r = new PMTilesReader(httpSource('/x.pmtiles', fake));
    expect(decodeTile((await r.tile(0, 0, 0))!)[0]!.features).toHaveLength(1);
    expect(ranges[0]).toBe(`bytes=0-${ROOT_BYTES - 1}`);
    etag = '"two"';
    await expect(r.tile(0, 0, 0)).rejects.toBeInstanceOf(ArchiveChanged);
  });
});
