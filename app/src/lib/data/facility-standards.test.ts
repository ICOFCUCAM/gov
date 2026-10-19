import { describe, it, expect, beforeEach } from 'vitest';
import { FACILITY_STANDARDS, HXL_COLUMNS, categoryFromOsm, standardsOf, osmText } from './facility-standards';
import { FACILITY_CATEGORIES, resetFacilities, resetOpenSites, loadOpenSource, listCandidates, proposeFacility, actOnFacility } from './facilities';
import { facilityItems } from '@/lib/twin/ogc-facilities';
import { listMinistries } from './store';
import { applyNation } from '@/lib/nation/registry';

describe('facility categories mapped to INSPIRE, HXL, OpenStreetMap and Smart Data Models', () => {
  beforeEach(() => { resetFacilities(); resetOpenSites(); applyNation({ iso3: 'KEN', regions: [] }); });

  it('maps every kind of site, in the register\'s order', () => {
    expect(Object.keys(FACILITY_STANDARDS)).toEqual(FACILITY_CATEGORIES.map(c => c.key));
    for (const c of FACILITY_CATEGORIES) {
      const s = standardsOf(c.key)!;
      expect(s.inspire.theme).toMatch(/^(US|TN|AM)$/);
      if (s.inspire.code) expect(s.inspire.codeList).toBe(`http://inspire.ec.europa.eu/codelist/${s.inspire.featureType === 'UtilityNetwork' ? 'UtilityNetworkTypeValue' : 'ServiceTypeValue'}/${s.inspire.code}`);
      expect(s.hxl.tag).toMatch(/^#loc(\+[a-z_]+)+$/);
      expect(Object.keys(s.osm.tags).length).toBeGreaterThan(0);
      expect(['PointOfInterest', 'Building']).toContain(s.smartDataModel.type);
    }
    expect(standardsOf('police')!.inspire.code).toBe('policeService');
    expect(osmText(standardsOf('school')!)).toBe('amenity=school, amenity=kindergarten');
    expect(HXL_COLUMNS).toMatchObject({ latitude: '#geo+lat', longitude: '#geo+lon', regionCode: '#adm1+code' });
  });

  it('recognises the kind of site from OpenStreetMap tags, including ogr2ogr other_tags', () => {
    expect(categoryFromOsm({ amenity: 'school' })).toBe('school');
    expect(categoryFromOsm({ amenity: 'Hospital' })).toBe('health');
    expect(categoryFromOsm({ healthcare: 'pharmacy' })).toBe('health');
    expect(categoryFromOsm({ power: 'substation' })).toBe('power');
    expect(categoryFromOsm({ aeroway: 'aerodrome' })).toBe('airport');
    expect(categoryFromOsm({ other_tags: '"barrier"=>"border_control","name:en"=>"Namanga"' })).toBe('border-post');
    // A specific value beats a key that takes any value.
    expect(categoryFromOsm({ healthcare: 'yes', amenity: 'school' })).toBe('school');
    expect(categoryFromOsm({ amenity: 'bench' })).toBeUndefined();
    expect(categoryFromOsm({ military: 'no' })).toBeUndefined();
  });

  it('suggests open-data candidates of the right kind from an OpenStreetMap export without a category column', async () => {
    const geojson = JSON.stringify({ type: 'FeatureCollection', features: [
      { type: 'Feature', geometry: { type: 'Point', coordinates: [36.8066, -1.30095] }, properties: { name: 'Kenyatta National Hospital', amenity: 'hospital', osm_id: 'node/1' } },
      { type: 'Feature', geometry: { type: 'Point', coordinates: [36.79, -1.27] }, properties: { name: 'Westlands Primary', other_tags: '"amenity"=>"school"', osm_id: 'node/2' } },
      { type: 'Feature', geometry: { type: 'Point', coordinates: [36.78, -1.26] }, properties: { name: 'A bench', amenity: 'bench', osm_id: 'node/3' } },
    ] });
    const src = await loadOpenSource({ name: 'OSM Nairobi', publisher: 'OpenStreetMap contributors', licence: 'ODbL 1.0', text: geojson }, 'Officer A');
    if ('error' in src) throw new Error(src.error);
    expect(src.candidates).toBe(2);
    expect(src.refused[0]!.reason).toMatch(/no OpenStreetMap tag/);
    expect(listCandidates().map(c => [c.name, c.category, c.kindFrom])).toEqual([['Kenyatta National Hospital', 'health', 'osm'], ['Westlands Primary', 'school', 'osm']]);
  }, 60_000);

  it('carries the crosswalk in the OGC collection', async () => {
    const m = listMinistries()[0]!.id;
    const r = await proposeFacility(m, { name: 'Central Police Station', category: 'police', lng: 36.82194, lat: -1.28333 }, 'Officer A');
    if ('error' in r) throw new Error(r.error);
    await actOnFacility(r.facility.id, { action: 'publish' }, 'Signer B');
    const items = facilityItems('http://x', {}, { signedIn: true });
    if ('error' in items) throw new Error(items.error);
    expect(items.features[0]!.properties.standards).toEqual({
      inspireTheme: 'US', inspireFeatureType: 'GovernmentalService', inspireCode: 'policeService', inspireCodeList: 'http://inspire.ec.europa.eu/codelist/ServiceTypeValue/policeService',
      hxl: '#loc+police', osm: 'amenity=police', smartDataModel: 'PointOfInterest', smartDataModelCategory: 'police',
    });
  }, 60_000);
});
