import { describe, it, expect } from 'vitest';
import { loadDivisions, defaultUnits, divisionNoun } from './divisions';

describe('official divisions', () => {
  it('gives the United States its states and the District of Columbia', async () => {
    const [l1] = await loadDivisions('USA');
    const units = defaultUnits(l1!);
    expect(units).toHaveLength(51);
    expect(units.map(u => u.name)).toContain('District of Columbia');
    expect(units.map(u => u.name)).not.toContain('Guam');
    expect(divisionNoun(l1!)).toBe('state');
  });

  it("gives Kenya its 47 counties in ISO order", async () => {
    const [l1] = await loadDivisions('KEN');
    expect(l1!.units).toHaveLength(47);
    expect(l1!.units[0]!.name).toBe('Baringo');
    expect(divisionNoun(l1!)).toBe('county');
  });

  it("gives Uganda its regions and, beneath them, its districts", async () => {
    const [regions, districts] = await loadDivisions('UGA');
    expect(regions!.units.map(u => u.name)).toEqual(['Central', 'Eastern', 'Northern', 'Western']);
    expect(divisionNoun(regions!)).toBe('region');
    expect(districts!.units.length).toBeGreaterThan(130);
    expect(districts!.units.map(u => u.name)).toContain('Kampala');
    expect(divisionNoun(districts!)).toBe('district');
    // Districts follow their region: all Central districts come first.
    expect(districts!.units[0]!.parent).toBe('UG-C');
  });

  it('returns no levels for an unknown country', async () => {
    expect(await loadDivisions('ZZZ')).toEqual([]);
  });
});
