import { describe, it, expect, afterEach } from 'vitest';
import { loadNationGeography, loadUnitGeography } from './geography';
import { buildMapModel } from './model';
import { projectionKind } from './projection';
import { partnerCapital, iso3ForName } from './world';
import { capitalsOf, defaultCapital } from '@/lib/geo/capitals';
import { applyNation, nationCapital, nationProjection } from '@/lib/nation/registry';
import { setSovereign } from '@/lib/data/store';

describe('opening a unit to the units beneath it (map plan phase 3)', () => {
  it('opens Uganda\'s regions to their official districts', async () => {
    const geo = await loadNationGeography('UGA', ['Central', 'Eastern', 'Northern', 'Western']);
    expect(geo!.units.every(u => u.drill)).toBe(true);
    const central = await loadUnitGeography('UGA', { name: 'Central', code: geo!.units[0]!.code });
    expect(central!.units.length).toBeGreaterThan(20);
    expect(central!.units.every(u => /^UG-\d+$/.test(u.code!) && u.geometry)).toBe(true);
    expect(central!.parent).toEqual({ name: 'Central', code: geo!.units[0]!.code });
    expect(central!.noun).toBe('district');
  }, 60_000);

  it('opens a Kenyan county to its district shapes, credited to their source', async () => {
    const nairobi = await loadUnitGeography('KEN', { name: 'Nairobi', code: 'KE-30' });
    expect(nairobi!.units.length).toBeGreaterThan(5);
    expect(nairobi!.units.every(u => u.code!.startsWith('KE-30:'))).toBe(true);
    expect(nairobi!.credit).toMatch(/via geoBoundaries/);
    const m = buildMapModel(nairobi!, { width: 600, maxHeight: 500 });
    expect(m.units.every(u => u.d.length > 0)).toBe(true);
  }, 60_000);

  it('says nothing is beneath a unit with no shapes below it', async () => {
    expect(await loadUnitGeography('KEN', { name: 'Atlantis' })).toBeNull();
    expect(await loadUnitGeography('CHL', { name: 'Arica', code: 'CL-AP' })).toBeNull();
  }, 60_000);

  it('does not list figures for other levels as unplaced', async () => {
    const geo = await loadNationGeography('UGA', ['Central', 'Eastern', 'Northern', 'Western']);
    const district = geo!.otherCodes![0]!;
    const m = buildMapModel(geo!, { width: 600, maxHeight: 500, values: [{ key: district, value: 4 }, { key: 'Atlantis', value: 1 }] });
    expect(m.unmatched).toEqual(['Atlantis']);
  }, 60_000);
});

describe('the capital and projection the nation chose', () => {
  afterEach(() => applyNation({ iso3: undefined }));

  it('marks the map data\'s capital as a default until the nation chooses', async () => {
    applyNation({ iso3: 'KEN' });
    expect(nationCapital()).toEqual(expect.objectContaining({ name: 'Nairobi', chosen: false }));
    const geo = await loadNationGeography('KEN', []);
    const m = buildMapModel(geo!, { width: 600, maxHeight: 500, capital: nationCapital() });
    expect(m.capital).toEqual(expect.objectContaining({ name: 'Nairobi', chosen: false }));
    expect(m.capital!.x).toBeGreaterThan(0);
    applyNation({ iso3: 'KEN', map: { capital: { name: 'Elsewhere', lng: 37, lat: 0 }, projection: 'transverse-mercator' } });
    expect(nationCapital()).toEqual({ name: 'Elsewhere', lng: 37, lat: 0, chosen: true });
    expect(nationProjection()).toBe('transverse-mercator');
  }, 60_000);

  it('never picks between a country\'s capitals: all are listed with their roles, none former', () => {
    expect(capitalsOf('ZAF').map(c => c.name).sort()).toEqual(['Bloemfontein', 'Cape Town', 'Pretoria']);
    expect(capitalsOf('TZA').find(c => c.name === 'Dodoma')!.roles).toContain('official');
    expect(capitalsOf('NGA').map(c => c.name)).toEqual(['Abuja']);
    expect(defaultCapital('XXX')).toBeNull();
  });

  it('uses the projection the nation chose, but the United States layout only for the United States', async () => {
    const geo = await loadNationGeography('KEN', []);
    const fc = { type: 'FeatureCollection', features: geo!.units.map(u => ({ type: 'Feature', properties: {}, geometry: u.geometry })) } as never;
    expect(projectionKind('KEN', fc, 'transverse-mercator')).toBe('transverse-mercator');
    expect(projectionKind('KEN', fc, 'albers-usa')).toBe('azimuthal-equal-area');
  }, 60_000);

  it('finds a declared partner\'s capital, by the name the nation gave when the map data knows it', () => {
    expect(iso3ForName('United States')).toBe('USA');
    expect(partnerCapital({ name: 'Tanzania', capital: 'Dodoma' })).toEqual(expect.objectContaining({ name: 'Dodoma', named: true }));
    expect(partnerCapital({ name: 'Tanzania' })).toEqual(expect.objectContaining({ name: 'Dar es Salaam', named: false }));
    expect(partnerCapital({ name: 'Atlantis' })).toBeNull();
  });

  it('refuses map settings that cannot be drawn', () => {
    expect(setSovereign({ map: { capital: { name: 'X', lng: 200, lat: 0 } } }, 'test')).toHaveProperty('error');
    expect(setSovereign({ map: { capital: { name: '', lng: 1, lat: 1 } } }, 'test')).toHaveProperty('error');
    expect(setSovereign({ map: { projection: 'mercator' as never } }, 'test')).toHaveProperty('error');
    const ok = setSovereign({ map: { capital: { name: 'Kampala', lng: 32.58, lat: 0.32 }, projection: 'auto' } }, 'test');
    expect(ok).not.toHaveProperty('error');
    setSovereign({ map: undefined }, 'test');
  });
});
