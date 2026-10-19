// The position a photo was taken at, read in the browser from the JPEG's own
// EXIF block (the GPS tags a phone camera writes). Nothing is sent anywhere:
// the file is read from the official's device and only the numbers are used.
//
// Small and defensive: every offset is bounds-checked, the number of IFD
// entries read is capped, and anything unexpected returns null rather than
// throwing. Reads GPSLatitude/Ref, GPSLongitude/Ref, GPSHPositioningError
// (accuracy in metres, when the camera wrote it), GPSDateStamp/GPSTimeStamp
// and, failing that, DateTimeOriginal.

export interface PhotoPosition {
  lat: number;
  lng: number;
  /** Horizontal accuracy in metres, when the camera recorded it. */
  accuracyM?: number;
  /** When the photo was taken (ISO 8601), when recorded. */
  takenAt?: string;
}

const MAX_ENTRIES = 512;

type Bytes = Uint8Array;

function u16(b: Bytes, o: number, le: boolean): number | null {
  if (o < 0 || o + 2 > b.length) return null;
  return le ? b[o]! | (b[o + 1]! << 8) : (b[o]! << 8) | b[o + 1]!;
}
function u32(b: Bytes, o: number, le: boolean): number | null {
  if (o < 0 || o + 4 > b.length) return null;
  const v = le ? b[o]! | (b[o + 1]! << 8) | (b[o + 2]! << 16) | (b[o + 3]! << 24) : (b[o]! << 24) | (b[o + 1]! << 16) | (b[o + 2]! << 8) | b[o + 3]!;
  return v >>> 0;
}

interface Entry { tag: number; type: number; count: number; valueAt: number }

/** The entries of one IFD within the TIFF block `t` (offsets relative to its start). */
function readIfd(t: Bytes, at: number, le: boolean): Entry[] | null {
  const n = u16(t, at, le);
  if (n == null || n > MAX_ENTRIES) return null;
  const out: Entry[] = [];
  const SIZE: Record<number, number> = { 1: 1, 2: 1, 3: 2, 4: 4, 5: 8, 7: 1, 9: 4, 10: 8 };
  for (let i = 0; i < n; i++) {
    const e = at + 2 + i * 12;
    const tag = u16(t, e, le), type = u16(t, e + 2, le), count = u32(t, e + 4, le);
    if (tag == null || type == null || count == null) return null;
    const size = (SIZE[type] ?? 0) * count;
    let valueAt = e + 8;
    if (size > 4) { const off = u32(t, e + 8, le); if (off == null) return null; valueAt = off; }
    if (size && (valueAt < 0 || valueAt + size > t.length)) continue; // points outside the block: ignore the entry
    out.push({ tag, type, count, valueAt });
  }
  return out;
}

function rationals(t: Bytes, e: Entry, le: boolean): number[] | null {
  if (e.type !== 5 && e.type !== 10) return null;
  const out: number[] = [];
  for (let i = 0; i < Math.min(e.count, 8); i++) {
    const num = u32(t, e.valueAt + i * 8, le), den = u32(t, e.valueAt + i * 8 + 4, le);
    if (num == null || den == null) return null;
    const n = e.type === 10 ? num | 0 : num, d = e.type === 10 ? den | 0 : den;
    if (d === 0) return null;
    out.push(n / d);
  }
  return out;
}

function ascii(t: Bytes, e: Entry): string {
  if (e.type !== 2) return '';
  let s = '';
  for (let i = 0; i < Math.min(e.count, 64); i++) {
    const c = t[e.valueAt + i];
    if (c === undefined || c === 0) break;
    s += String.fromCharCode(c);
  }
  return s.trim();
}

function degrees(v: number[] | null): number | null {
  if (!v || !v.length) return null;
  const [d = 0, m = 0, s = 0] = v;
  if (![d, m, s].every(Number.isFinite) || m < 0 || m >= 60 || s < 0 || s >= 60.0001) return null;
  return Math.abs(d) + m / 60 + s / 3600;
}

/** The TIFF block inside a JPEG's EXIF APP1 segment, or null. */
function exifBlock(b: Bytes): Bytes | null {
  if (b.length < 4 || b[0] !== 0xff || b[1] !== 0xd8) return null; // not a JPEG
  let o = 2;
  for (let guard = 0; guard < 256 && o + 4 <= b.length; guard++) {
    if (b[o] !== 0xff) return null;
    const marker = b[o + 1]!;
    if (marker === 0xd8 || (marker >= 0xd0 && marker <= 0xd7) || marker === 0x01) { o += 2; continue; }
    if (marker === 0xda || marker === 0xd9) return null; // image data starts: no EXIF before it
    const len = u16(b, o + 2, false);
    if (len == null || len < 2 || o + 2 + len > b.length) return null;
    if (marker === 0xe1 && len >= 8 && b[o + 4] === 0x45 && b[o + 5] === 0x78 && b[o + 6] === 0x69 && b[o + 7] === 0x66 && b[o + 8] === 0 && b[o + 9] === 0) {
      return b.subarray(o + 10, o + 2 + len);
    }
    o += 2 + len;
  }
  return null;
}

/** Read the GPS position a camera wrote into a JPEG; null when there is none or the file is not a readable JPEG. */
export function readPhotoPosition(input: ArrayBuffer | Uint8Array): PhotoPosition | null {
  try {
    const b = input instanceof Uint8Array ? input : new Uint8Array(input);
    const t = exifBlock(b);
    if (!t || t.length < 8) return null;
    const le = t[0] === 0x49 && t[1] === 0x49 ? true : t[0] === 0x4d && t[1] === 0x4d ? false : null;
    if (le === null || u16(t, 2, le) !== 42) return null;
    const ifd0At = u32(t, 4, le);
    if (ifd0At == null) return null;
    const ifd0 = readIfd(t, ifd0At, le);
    if (!ifd0) return null;
    const gpsPtr = ifd0.find(e => e.tag === 0x8825);
    const gpsAt = gpsPtr ? u32(t, gpsPtr.valueAt, le) : null;
    if (gpsAt == null) return null;
    const gps = readIfd(t, gpsAt, le);
    if (!gps) return null;
    const get = (tag: number) => gps.find(e => e.tag === tag);
    const latRef = get(1), lat = get(2), lngRef = get(3), lng = get(4);
    if (!lat || !lng) return null;
    const la = degrees(rationals(t, lat, le)), lo = degrees(rationals(t, lng, le));
    if (la == null || lo == null || la > 90 || lo > 180) return null;
    const ns = latRef ? ascii(t, latRef).toUpperCase() : 'N', ew = lngRef ? ascii(t, lngRef).toUpperCase() : 'E';
    const out: PhotoPosition = {
      lat: Math.round((ns === 'S' ? -la : la) * 1e7) / 1e7,
      lng: Math.round((ew === 'W' ? -lo : lo) * 1e7) / 1e7,
    };
    if (out.lat === 0 && out.lng === 0) return null; // a camera without a fix often writes 0, 0
    const err = get(31);
    const acc = err ? rationals(t, err, le)?.[0] : undefined;
    if (acc != null && Number.isFinite(acc) && acc > 0 && acc < 100_000) out.accuracyM = Math.round(acc * 10) / 10;
    // When: GPS date and time (UTC) first, else the camera's local DateTimeOriginal.
    const ds = get(29), ts = get(7);
    const date = ds ? ascii(t, ds) : '';
    const time = ts ? rationals(t, ts, le) : null;
    if (/^\d{4}:\d{2}:\d{2}$/.test(date) && time && time.length >= 3) {
      const [h, m, s] = time as [number, number, number];
      const iso = `${date.replace(/:/g, '-')}T${String(Math.floor(h)).padStart(2, '0')}:${String(Math.floor(m)).padStart(2, '0')}:${String(Math.floor(s)).padStart(2, '0')}Z`;
      if (!Number.isNaN(Date.parse(iso))) out.takenAt = new Date(iso).toISOString();
    } else {
      const exifPtr = ifd0.find(e => e.tag === 0x8769);
      const exifAt = exifPtr ? u32(t, exifPtr.valueAt, le) : null;
      const exif = exifAt != null ? readIfd(t, exifAt, le) : null;
      const dto = exif?.find(e => e.tag === 0x9003);
      const v = dto ? ascii(t, dto) : '';
      const m = /^(\d{4}):(\d{2}):(\d{2}) (\d{2}):(\d{2}):(\d{2})$/.exec(v);
      if (m && !Number.isNaN(Date.parse(`${m[1]}-${m[2]}-${m[3]}T${m[4]}:${m[5]}:${m[6]}`))) out.takenAt = `${m[1]}-${m[2]}-${m[3]}T${m[4]}:${m[5]}:${m[6]}`;
    }
    return out;
  } catch {
    return null;
  }
}
