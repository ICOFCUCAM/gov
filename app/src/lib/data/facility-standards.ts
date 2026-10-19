// Each kind of site in the national facility register mapped to the
// vocabularies other systems use (architecture review G6, R20), so the
// register can be exchanged without a person translating categories:
//
// - INSPIRE (EU spatial data infrastructure): the theme and feature type,
//   and the code from the theme's code list where one fits (Utility and
//   governmental services: ServiceTypeValue, UtilityNetworkTypeValue;
//   Transport networks: aerodromes and ports; Area management: none).
// - HXL (Humanitarian Exchange Language, used on HDX): the hashtag and
//   attributes a column of such sites carries, and the common columns.
// - OpenStreetMap: the tags such a site carries; used to recognise the kind
//   of site in an OpenStreetMap export loaded as open-data candidates.
// - FIWARE Smart Data Models: the entity type (and category) for an NGSI-LD
//   view.
//
// The register's own keys stay the source of truth (lib/data/facilities.ts,
// in the same order); these are crosswalks.

export interface CategoryStandards {
  inspire: { theme: string; themeName: string; featureType: string; code?: string; codeList?: string };
  hxl: { tag: string; type: string };
  /** OSM tags: any one of these key=value pairs marks the kind of site ("*" for any value). */
  osm: { tags: Record<string, string[]>; primary: string };
  smartDataModel: { type: 'PointOfInterest' | 'Building'; category: string; model: string };
}

const US = { theme: 'US', themeName: 'Utility and governmental services' };
const TN = { theme: 'TN', themeName: 'Transport networks' };
const AM = { theme: 'AM', themeName: 'Area management/restriction/regulation zones and reporting units' };
const SERVICE = 'http://inspire.ec.europa.eu/codelist/ServiceTypeValue';
const NETWORK = 'http://inspire.ec.europa.eu/codelist/UtilityNetworkTypeValue';
const gov = (code: string) => ({ ...US, featureType: 'GovernmentalService', code, codeList: `${SERVICE}/${code}` });
const net = (code: string) => ({ ...US, featureType: 'UtilityNetwork', code, codeList: `${NETWORK}/${code}` });
const POI = 'https://smart-data-models.github.io/dataModel.PointOfInterest/PointOfInterest/schema.json';
const BUILDING = 'https://smart-data-models.github.io/dataModel.Building/Building/schema.json';
const poi = (category: string) => ({ type: 'PointOfInterest' as const, category, model: POI });
const building = (category: string) => ({ type: 'Building' as const, category, model: BUILDING });

export const FACILITY_STANDARDS: Record<string, CategoryStandards> = {
  health: { inspire: gov('hospitalService'), hxl: { tag: '#loc+health', type: 'health facility' }, osm: { tags: { amenity: ['hospital', 'clinic', 'doctors'], healthcare: ['*'] }, primary: 'amenity=clinic' }, smartDataModel: building('hospital') },
  school: { inspire: gov('education'), hxl: { tag: '#loc+education', type: 'school' }, osm: { tags: { amenity: ['school', 'kindergarten'] }, primary: 'amenity=school' }, smartDataModel: building('school') },
  police: { inspire: gov('policeService'), hxl: { tag: '#loc+police', type: 'police station' }, osm: { tags: { amenity: ['police'] }, primary: 'amenity=police' }, smartDataModel: poi('police') },
  'fire-rescue': { inspire: gov('fireProtectionService'), hxl: { tag: '#loc+fire', type: 'fire and rescue station' }, osm: { tags: { amenity: ['fire_station'] }, primary: 'amenity=fire_station' }, smartDataModel: poi('fireStation') },
  court: { inspire: gov('lawCourts'), hxl: { tag: '#loc+justice', type: 'court' }, osm: { tags: { amenity: ['courthouse'] }, primary: 'amenity=courthouse' }, smartDataModel: poi('courthouse') },
  prison: { inspire: gov('prisons'), hxl: { tag: '#loc+justice+prison', type: 'prison' }, osm: { tags: { amenity: ['prison'] }, primary: 'amenity=prison' }, smartDataModel: poi('prison') },
  'government-office': { inspire: gov('generalPublicServices'), hxl: { tag: '#loc+government', type: 'government office' }, osm: { tags: { office: ['government'], amenity: ['townhall'] }, primary: 'office=government' }, smartDataModel: building('government') },
  power: { inspire: net('electricity'), hxl: { tag: '#loc+energy', type: 'power station or substation' }, osm: { tags: { power: ['plant', 'substation', 'generator'] }, primary: 'power=substation' }, smartDataModel: poi('powerPlant') },
  water: { inspire: net('water'), hxl: { tag: '#loc+wash', type: 'water and sanitation works' }, osm: { tags: { man_made: ['water_works', 'wastewater_plant', 'water_tower', 'reservoir_covered'], amenity: ['water_point'] }, primary: 'man_made=water_works' }, smartDataModel: poi('waterWorks') },
  telecom: { inspire: net('telecommunications'), hxl: { tag: '#loc+telecom', type: 'telecom site or data centre' }, osm: { tags: { telecom: ['data_center', 'exchange'], 'tower:type': ['communication'] }, primary: 'telecom=data_center' }, smartDataModel: poi('telecommunications') },
  airport: { inspire: { ...TN, featureType: 'AerodromeArea' }, hxl: { tag: '#loc+airport', type: 'airport or airfield' }, osm: { tags: { aeroway: ['aerodrome', 'airstrip'] }, primary: 'aeroway=aerodrome' }, smartDataModel: poi('airport') },
  port: { inspire: { ...TN, featureType: 'PortArea' }, hxl: { tag: '#loc+port', type: 'seaport or inland port' }, osm: { tags: { landuse: ['port'], industrial: ['port'], harbour: ['*'] }, primary: 'landuse=port' }, smartDataModel: poi('port') },
  'border-post': { inspire: gov('publicOrderAndSafety'), hxl: { tag: '#loc+border', type: 'border post' }, osm: { tags: { barrier: ['border_control'] }, primary: 'barrier=border_control' }, smartDataModel: poi('borderControl') },
  logistics: { inspire: { ...TN, featureType: 'TransportArea' }, hxl: { tag: '#loc+logistics', type: 'depot or logistics hub' }, osm: { tags: { industrial: ['warehouse', 'depot', 'logistics'], building: ['warehouse'] }, primary: 'building=warehouse' }, smartDataModel: building('warehouse') },
  shelter: { inspire: gov('civilDefence'), hxl: { tag: '#loc+shelter', type: 'emergency shelter' }, osm: { tags: { social_facility: ['shelter'], emergency: ['assembly_point'] }, primary: 'social_facility=shelter' }, smartDataModel: poi('shelter') },
  market: { inspire: { ...AM, featureType: 'ManagementRestrictionOrRegulationZone' }, hxl: { tag: '#loc+market', type: 'market' }, osm: { tags: { amenity: ['marketplace'] }, primary: 'amenity=marketplace' }, smartDataModel: poi('market') },
  defence: { inspire: gov('militaryDefence'), hxl: { tag: '#loc+defence', type: 'defence site' }, osm: { tags: { landuse: ['military'], military: ['*'] }, primary: 'landuse=military' }, smartDataModel: poi('military') },
};

/** HXL hashtags for the columns of a site list (name, position, admin units, identifiers). */
export const HXL_COLUMNS: Record<string, string> = {
  name: '#loc+name', category: '#loc+type', latitude: '#geo+lat', longitude: '#geo+lon',
  regionCode: '#adm1+code', region: '#adm1+name', districtCode: '#adm2+code', district: '#adm2+name',
  id: '#loc+code', nationalId: '#loc+code+national', status: '#status', institution: '#org+name',
};

export function standardsOf(category: string): CategoryStandards | undefined {
  return FACILITY_STANDARDS[category];
}

/** OSM tags written as "key=value"; "*" means any value. */
export const osmText = (s: CategoryStandards) => Object.entries(s.osm.tags).flatMap(([k, vs]) => vs.map(v => `${k}=${v}`)).join(', ');

/** Tags of an OSM row: its own columns, and an ogr2ogr "other_tags" column ("amenity"=>"school",…). */
function osmTagsOf(row: Record<string, string | undefined>): Record<string, string> {
  const tags: Record<string, string> = {};
  for (const [k, v] of Object.entries(row)) if (v != null && v !== '') tags[k.trim().toLowerCase()] = String(v).trim().toLowerCase();
  const other = row.other_tags ?? row['other tags'];
  if (other) for (const m of String(other).matchAll(/"([^"]+)"=>"([^"]*)"/g)) tags[m[1]!.toLowerCase()] = m[2]!.toLowerCase();
  return tags;
}

/**
 * The register's kind of site for an OpenStreetMap feature, from its tags
 * (amenity=school → school); undefined when no kind matches. The more
 * specific value tags win over the "any value" ones.
 */
export function categoryFromOsm(row: Record<string, string | undefined>): string | undefined {
  const tags = osmTagsOf(row);
  let wildcard: string | undefined;
  for (const [key, s] of Object.entries(FACILITY_STANDARDS)) {
    for (const [k, vs] of Object.entries(s.osm.tags)) {
      const v = tags[k];
      if (!v || v === 'no') continue;
      if (vs.includes(v)) return key;
      if (vs.includes('*')) wildcard ??= key;
    }
  }
  return wildcard;
}
