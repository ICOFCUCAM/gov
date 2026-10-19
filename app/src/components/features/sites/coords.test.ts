import { describe, it, expect } from 'vitest';
import { parseCoordinates, toDms } from './coords';

const NBO = { lat: -1.286389, lng: 36.817222 };

describe('reading a typed position', () => {
  it.each([
    `1°17'11"S 36°49'2"E`,
    `1°17′11″S, 36°49′02″E`,
    '-1 17 11, 36 49 2',
    '-1 17 11 36 49 2',
    'S 1 17 11 E 36 49 2',
    `36°49'2"E 1°17'11"S`,
  ])('reads %s', s => {
    const p = parseCoordinates(s);
    expect('error' in p).toBe(false);
    if ('error' in p) return;
    expect(p.lat).toBeCloseTo(NBO.lat, 4);
    expect(p.lng).toBeCloseTo(NBO.lng, 4);
  });

  it('reads decimal degrees', () => {
    expect(parseCoordinates('-1.28638, 36.81724')).toEqual({ lat: -1.28638, lng: 36.81724 });
    expect(parseCoordinates('−1.28638 36.81724')).toEqual({ lat: -1.28638, lng: 36.81724 });
    expect(parseCoordinates('1.28638S 36.81724E')).toEqual({ lat: -1.28638, lng: 36.81724 });
  });

  it('refuses what it cannot read, with a reason', () => {
    for (const s of ['', 'Nairobi', '1 70 0, 36 0 0', '95, 36', '1N 2N', '-1N, 36E', '1 2 3 4 5']) {
      expect('error' in parseCoordinates(s)).toBe(true);
    }
  });

  it('writes a position back as degrees, minutes and seconds', () => {
    expect(toDms(NBO.lat, NBO.lng)).toBe('1°17′11″S 36°49′02″E');
  });
});
