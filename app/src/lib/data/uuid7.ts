// UUID version 7 (RFC 9562 §5.7): 48 bits of Unix time in milliseconds, then
// version 7, 12 random bits, the RFC variant and 62 random bits, from the
// platform's cryptographic random source. Sorted by time of minting, opaque
// otherwise: used for identifiers that leave the platform (the national
// FacilityID of the data dictionary, docs/07_DATA_DICTIONARY_AND_INTEROP.md §1).

import { randomBytes } from 'node:crypto';

export const UUID7 = /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

/** A new UUID v7, its time part from `at` (default now). */
export function uuid7(at: number | Date = Date.now()): string {
  const ms = typeof at === 'number' ? at : at.getTime();
  const b = randomBytes(16);
  const t = Math.max(0, Math.floor(ms));
  // 48-bit big-endian milliseconds (beyond 2^32, so split by division, not shifts).
  const hi = Math.floor(t / 2 ** 16), lo = t % 2 ** 16;
  b[0] = (hi >>> 24) & 0xff; b[1] = (hi >>> 16) & 0xff; b[2] = (hi >>> 8) & 0xff; b[3] = hi & 0xff;
  b[4] = (lo >>> 8) & 0xff; b[5] = lo & 0xff;
  b[6] = (b[6]! & 0x0f) | 0x70; // version 7
  b[8] = (b[8]! & 0x3f) | 0x80; // variant 10
  const h = b.toString('hex');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

/** The time a UUID v7 was minted, in milliseconds since the epoch. */
export function uuid7Time(id: string): number | null {
  if (!UUID7.test(id)) return null;
  return parseInt(id.slice(0, 8) + id.slice(9, 13), 16);
}
