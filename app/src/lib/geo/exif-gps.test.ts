import { describe, it, expect } from 'vitest';
import { readPhotoPosition } from './exif-gps';

// A synthetic JPEG: SOI, an APP1 "Exif" segment holding a TIFF block with
// IFD0 → GPS IFD, then SOS/EOI. Built byte by byte so the test needs no file.
type Tag = { tag: number; type: number; count: number; data: number[] };

function tiff(le: boolean, gpsTags: Tag[], ifd0Extra: Tag[] = []): number[] {
  const out: number[] = [];
  const w16 = (v: number) => (le ? out.push(v & 0xff, (v >> 8) & 0xff) : out.push((v >> 8) & 0xff, v & 0xff));
  const w32 = (v: number) => (le ? out.push(v & 0xff, (v >>> 8) & 0xff, (v >>> 16) & 0xff, (v >>> 24) & 0xff) : out.push((v >>> 24) & 0xff, (v >>> 16) & 0xff, (v >>> 8) & 0xff, v & 0xff));
  const ifd0Tags = 1 + ifd0Extra.length;
  const ifd0At = 8, ifd0Size = 2 + ifd0Tags * 12 + 4;
  const gpsAt = ifd0At + ifd0Size;
  const gpsSize = 2 + gpsTags.length * 12 + 4;
  let dataAt = gpsAt + gpsSize;
  const blobs: number[][] = [];
  const entry = (t: Tag) => {
    w16(t.tag); w16(t.type); w32(t.count);
    if (t.data.length <= 4) { const d = [...t.data]; while (d.length < 4) d.push(0); out.push(...d); }
    else { w32(dataAt); blobs.push(t.data); dataAt += t.data.length; }
  };
  out.push(...(le ? [0x49, 0x49] : [0x4d, 0x4d])); w16(42); w32(ifd0At);
  w16(ifd0Tags);
  const ptr: number[] = []; { const save = out.length; w32(gpsAt); ptr.push(...out.splice(save)); }
  entry({ tag: 0x8825, type: 4, count: 1, data: ptr });
  for (const t of ifd0Extra) entry(t);
  w32(0);
  w16(gpsTags.length); for (const t of gpsTags) entry(t); w32(0);
  for (const b of blobs) out.push(...b);
  return out;
}

function rat(le: boolean, ...pairs: [number, number][]): number[] {
  const out: number[] = [];
  for (const [n, d] of pairs) for (const v of [n, d]) out.push(...(le ? [v & 0xff, (v >>> 8) & 0xff, (v >>> 16) & 0xff, (v >>> 24) & 0xff] : [(v >>> 24) & 0xff, (v >>> 16) & 0xff, (v >>> 8) & 0xff, v & 0xff]));
  return out;
}
const str = (s: string) => [...s].map(c => c.charCodeAt(0)).concat(0);

function jpeg(t: number[]): Uint8Array {
  const body = [0x45, 0x78, 0x69, 0x66, 0, 0, ...t];
  const len = body.length + 2;
  return new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 4, 0, 0, 0xff, 0xe1, (len >> 8) & 0xff, len & 0xff, ...body, 0xff, 0xda, 0, 2, 0xff, 0xd9]);
}

const nairobi = (le: boolean, extra: Tag[] = []): Tag[] => [
  { tag: 1, type: 2, count: 2, data: str('S') },
  { tag: 2, type: 5, count: 3, data: rat(le, [1, 1], [17, 1], [1100, 100]) },
  { tag: 3, type: 2, count: 2, data: str('E') },
  { tag: 4, type: 5, count: 3, data: rat(le, [36, 1], [49, 1], [2, 1]) },
  ...extra,
];

describe('reading a photo\'s position', () => {
  it.each([true, false])('reads latitude, longitude and hemisphere (little-endian %s)', le => {
    const p = readPhotoPosition(jpeg(tiff(le, nairobi(le))));
    expect(p).not.toBeNull();
    expect(p!.lat).toBeCloseTo(-(1 + 17 / 60 + 11 / 3600), 6);
    expect(p!.lng).toBeCloseTo(36 + 49 / 60 + 2 / 3600, 6);
    expect(p!.accuracyM).toBeUndefined();
  });

  it('reads the accuracy and the GPS time when the camera wrote them', () => {
    const le = true;
    const p = readPhotoPosition(jpeg(tiff(le, nairobi(le, [
      { tag: 7, type: 5, count: 3, data: rat(le, [9, 1], [30, 1], [15, 1]) },
      { tag: 29, type: 2, count: 11, data: str('2026:10:01') },
      { tag: 31, type: 5, count: 1, data: rat(le, [48, 10]) },
    ]))));
    expect(p!.accuracyM).toBe(4.8);
    expect(p!.takenAt).toBe('2026-10-01T09:30:15.000Z');
  });

  it('accepts an ArrayBuffer', () => {
    const b = jpeg(tiff(true, nairobi(true)));
    expect(readPhotoPosition(b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength))).not.toBeNull();
  });

  it('returns null for a photo without a position, a non-JPEG and broken or hostile bytes', () => {
    expect(readPhotoPosition(jpeg(tiff(true, [{ tag: 1, type: 2, count: 2, data: str('N') }])))).toBeNull();
    expect(readPhotoPosition(new Uint8Array([0x89, 0x50, 0x4e, 0x47]))).toBeNull();
    expect(readPhotoPosition(new Uint8Array([]))).toBeNull();
    const good = jpeg(tiff(true, nairobi(true)));
    for (let cut = 0; cut < good.length; cut += 7) expect(() => readPhotoPosition(good.slice(0, cut))).not.toThrow();
    // An offset pointing far outside the file.
    const bad = good.slice();
    bad[12 + 6 + 4] = 0xff; bad[12 + 6 + 5] = 0xff; bad[12 + 6 + 6] = 0xff; bad[12 + 6 + 7] = 0x7f;
    expect(readPhotoPosition(bad)).toBeNull();
  });

  it('treats 0, 0 (no fix) and a zero denominator as no position', () => {
    const le = true;
    expect(readPhotoPosition(jpeg(tiff(le, [
      { tag: 2, type: 5, count: 3, data: rat(le, [0, 1], [0, 1], [0, 1]) },
      { tag: 4, type: 5, count: 3, data: rat(le, [0, 1], [0, 1], [0, 1]) },
    ])))).toBeNull();
    expect(readPhotoPosition(jpeg(tiff(le, [
      { tag: 2, type: 5, count: 3, data: rat(le, [1, 0], [0, 1], [0, 1]) },
      { tag: 4, type: 5, count: 3, data: rat(le, [36, 1], [0, 1], [0, 1]) },
    ])))).toBeNull();
  });
});
