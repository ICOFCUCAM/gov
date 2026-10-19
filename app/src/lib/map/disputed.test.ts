import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { disputedAreas, disputesOf, disputeText, isWorldview, worldviewOf, WORLDVIEWS } from './disputed';
import { applyNation, nationWorldview } from '@/lib/nation/registry';
import { setSovereign } from '@/lib/data/store';

describe('disputed territory and the worldview setting', () => {
  it('draws every area as disputed unless the nation chose a point of view', () => {
    const all = disputedAreas();
    expect(all.length).toBeGreaterThanOrEqual(25);
    expect(all.every(a => a.shownAs === 'disputed')).toBe(true);
    expect(disputedAreas('neutral').every(a => a.shownAs === 'disputed')).toBe(true);
  });

  it('a point of view gives areas to the country it recognises, and leaves the rest disputed', () => {
    const india = disputedAreas('IN'), china = disputedAreas('CN'), pakistan = disputedAreas('PK'), us = disputedAreas('US');
    const at = (v: ReturnType<typeof disputedAreas>, n: string) => v.find(a => a.name === n)?.shownAs;
    expect([at(india, 'Jammu and Kashmir'), at(india, 'Aksai Chin'), at(india, 'Gilgit-Baltistan')]).toEqual(['IND', 'IND', 'IND']);
    expect(at(china, 'Aksai Chin')).toBe('CHN');
    expect([at(pakistan, 'Jammu and Kashmir'), at(pakistan, 'Gilgit-Baltistan')]).toEqual(['PAK', 'PAK']);
    // A view that treats an area as breakaway or disputed keeps it disputed.
    expect(at(us, 'Golan Heights')).toBe('disputed');
    expect(at(disputedAreas('UN'), 'Crimea')).toBe('disputed');
  });

  it('knows which disputes a nation is party to, and says so plainly', () => {
    const ken = disputesOf('KEN');
    expect(ken.map(a => a.name)).toContain('Ilemi Triangle');
    expect(disputeText(ken[0]!)).toMatch(/Claimed by South Sudan.*disputed; the platform takes no side/);
    expect(disputesOf('ISL')).toEqual([]);
  });

  it('the nation chooses; unknown views are refused', () => {
    expect(worldviewOf('IND')).toBe('IN');
    expect(worldviewOf('KEN')).toBeNull();
    expect(isWorldview('UN') && isWorldview('neutral') && !isWorldview('XX')).toBe(true);
    expect(WORLDVIEWS.length).toBe(33);
    expect(setSovereign({ map: { worldview: 'XX' } }, 'test')).toEqual({ error: expect.stringMatching(/point of view/) });
    applyNation({ iso3: 'KEN', map: { worldview: 'US' } });
    expect(nationWorldview()).toBe('US');
    applyNation({ iso3: 'KEN', map: {} });
    expect(nationWorldview()).toBe('neutral');
  });

  it('stays small enough to ship with every map', () => {
    expect(gzipSync(readFileSync(new URL('../geo/disputed.json', import.meta.url))).length).toBeLessThan(30_000);
  });
});
