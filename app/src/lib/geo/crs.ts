// National coordinate systems for positions given on a national grid
// (architecture review G1, R13). Mapping agencies and surveyors publish in
// national grids — Arc 1960 / UTM in East Africa, OSGB36 in Britain,
// ETRS89-LAEA across Europe, Minna in Nigeria — and refusing them pushes the
// conversion onto ministries. A file declares its system by EPSG code or a
// .prj (WKT); the server converts each position to WGS 84 longitude/latitude
// with proj4 (bundled, nothing fetched) and records the system and the exact
// transformation used, so the conversion can be checked and repeated.
//
// The definitions below are bundled proj4 strings for common national grids,
// with the datum shift (towgs84) where the system needs one; generic UTM zones
// on WGS 84, ETRS89, NAD83 and GDA2020 are built from their codes. Shifts are
// the published 3- or 7-parameter ones: good to a few metres, not to the
// centimetre of a grid-shift file.

import proj4 from 'proj4';
import { crsFromWkt, wktName } from './boundary-files';

export interface CrsDef {
  epsg: number; name: string; proj4: string; area: string;
  /** The nations (ISO 3166-1 alpha-3) whose national grid it is: offered by their OGC API (lib/twin/ogc-crs.ts). */
  countries?: readonly string[];
}

const EUROPE = ['AUT', 'BEL', 'BGR', 'HRV', 'CYP', 'CZE', 'DNK', 'EST', 'FIN', 'FRA', 'DEU', 'GRC', 'HUN', 'IRL', 'ITA', 'LVA', 'LTU', 'LUX', 'MLT', 'NLD', 'POL', 'PRT', 'ROU', 'SVK', 'SVN', 'ESP', 'SWE', 'ISL', 'LIE', 'NOR', 'CHE'];

const ARC1960 = '+ellps=clrk80 +towgs84=-160,-6,-302,0,0,0,0';
const ADINDAN = '+ellps=clrk80 +towgs84=-166,-15,204,0,0,0,0';
const MINNA = '+ellps=clrk80 +towgs84=-92,-93,122,0,0,0,0';

/** Bundled national grids (the Nation Pack may add its own). */
export const NATIONAL_CRS: CrsDef[] = [
  { epsg: 4326, name: 'WGS 84 (longitude/latitude)', proj4: '+proj=longlat +datum=WGS84 +no_defs', area: 'World' },
  { epsg: 3857, name: 'WGS 84 / Pseudo-Mercator (web maps)', proj4: '+proj=merc +a=6378137 +b=6378137 +lat_ts=0 +lon_0=0 +x_0=0 +y_0=0 +k=1 +units=m +nadgrids=@null +no_defs', area: 'World' },
  { epsg: 4210, name: 'Arc 1960 (longitude/latitude)', proj4: `+proj=longlat ${ARC1960} +no_defs`, area: 'Kenya, Tanzania, Uganda', countries: ['KEN', 'TZA', 'UGA'] },
  { epsg: 21035, name: 'Arc 1960 / UTM zone 35S', proj4: `+proj=utm +zone=35 +south ${ARC1960} +units=m +no_defs`, area: 'Tanzania, Uganda (west)', countries: ['TZA', 'UGA'] },
  { epsg: 21036, name: 'Arc 1960 / UTM zone 36S', proj4: `+proj=utm +zone=36 +south ${ARC1960} +units=m +no_defs`, area: 'Kenya, Tanzania, Uganda', countries: ['KEN', 'TZA', 'UGA'] },
  { epsg: 21037, name: 'Arc 1960 / UTM zone 37S', proj4: `+proj=utm +zone=37 +south ${ARC1960} +units=m +no_defs`, area: 'Kenya, Tanzania', countries: ['KEN', 'TZA'] },
  { epsg: 21095, name: 'Arc 1960 / UTM zone 35N', proj4: `+proj=utm +zone=35 ${ARC1960} +units=m +no_defs`, area: 'Uganda', countries: ['UGA'] },
  { epsg: 21096, name: 'Arc 1960 / UTM zone 36N', proj4: `+proj=utm +zone=36 ${ARC1960} +units=m +no_defs`, area: 'Kenya, Uganda', countries: ['KEN', 'UGA'] },
  { epsg: 21097, name: 'Arc 1960 / UTM zone 37N', proj4: `+proj=utm +zone=37 ${ARC1960} +units=m +no_defs`, area: 'Kenya', countries: ['KEN'] },
  { epsg: 20137, name: 'Adindan / UTM zone 37N', proj4: `+proj=utm +zone=37 ${ADINDAN} +units=m +no_defs`, area: 'Ethiopia, Sudan', countries: ['ETH', 'SDN'] },
  { epsg: 20138, name: 'Adindan / UTM zone 38N', proj4: `+proj=utm +zone=38 ${ADINDAN} +units=m +no_defs`, area: 'Ethiopia', countries: ['ETH'] },
  { epsg: 26391, name: 'Minna / Nigeria West Belt', proj4: `+proj=tmerc +lat_0=4 +lon_0=4.5 +k=0.99975 +x_0=230738.26 +y_0=0 ${MINNA} +units=m +no_defs`, area: 'Nigeria (west)', countries: ['NGA'] },
  { epsg: 26392, name: 'Minna / Nigeria Mid Belt', proj4: `+proj=tmerc +lat_0=4 +lon_0=8.5 +k=0.99975 +x_0=670553.98 +y_0=0 ${MINNA} +units=m +no_defs`, area: 'Nigeria (centre)', countries: ['NGA'] },
  { epsg: 26393, name: 'Minna / Nigeria East Belt', proj4: `+proj=tmerc +lat_0=4 +lon_0=12.5 +k=0.99975 +x_0=1110369.7 +y_0=0 ${MINNA} +units=m +no_defs`, area: 'Nigeria (east)', countries: ['NGA'] },
  { epsg: 27700, name: 'OSGB36 / British National Grid', proj4: '+proj=tmerc +lat_0=49 +lon_0=-2 +k=0.9996012717 +x_0=400000 +y_0=-100000 +ellps=airy +towgs84=446.448,-125.157,542.06,0.15,0.247,0.842,-20.489 +units=m +no_defs', area: 'United Kingdom', countries: ['GBR'] },
  { epsg: 4258, name: 'ETRS89 (longitude/latitude)', proj4: '+proj=longlat +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +no_defs', area: 'Europe', countries: EUROPE },
  { epsg: 3035, name: 'ETRS89-extended / LAEA Europe', proj4: '+proj=laea +lat_0=52 +lon_0=10 +x_0=4321000 +y_0=3210000 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs', area: 'Europe (statistics, INSPIRE grids)', countries: EUROPE },
  { epsg: 2154, name: 'RGF93 v1 / Lambert-93', proj4: '+proj=lcc +lat_0=46.5 +lon_0=3 +lat_1=49 +lat_2=44 +x_0=700000 +y_0=6600000 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs', area: 'France', countries: ['FRA'] },
  { epsg: 4269, name: 'NAD83 (longitude/latitude)', proj4: '+proj=longlat +datum=NAD83 +no_defs', area: 'North America', countries: ['USA', 'CAN'] },
  { epsg: 7844, name: 'GDA2020 (longitude/latitude)', proj4: '+proj=longlat +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +no_defs', area: 'Australia', countries: ['AUS'] },
];

/** A system positions can be converted from: its name, EPSG code when known, and the transformation used. */
export interface SourceCrs {
  name: string;
  epsg?: number;
  /** The exact transformation to WGS 84: a proj4 definition, or the WKT it came from. */
  transformation: string;
  /** Coordinates are already longitude/latitude on WGS 84 (nothing to convert). */
  wgs84?: boolean;
  /** Longitude/latitude on another datum, or a projected grid (easting/northing in metres). */
  projected: boolean;
  toLonLat: (p: [number, number]) => [number, number];
  /** The reverse: WGS 84 longitude/latitude to this system's x/y (longitude/latitude for a geographic one), for serving positions in it. */
  fromLonLat: (p: [number, number]) => [number, number];
}

function fromDef(epsg: number, name: string, def: string): SourceCrs {
  const t = proj4(def, 'WGS84');
  const wgs84 = epsg === 4326;
  return { name: `${name} (EPSG:${epsg})`, epsg, transformation: def, ...(wgs84 ? { wgs84 } : {}), projected: !/\+proj=longlat/.test(def), toLonLat: p => (wgs84 ? p : (t.forward(p) as [number, number])), fromLonLat: p => (wgs84 ? p : (t.inverse(p) as [number, number])) };
}

/** A generic UTM zone from its EPSG code: WGS 84 (326zz/327zz), ETRS89 (258zz), NAD83 (269zz), GDA2020 / MGA (78zz). */
function utmFromCode(code: number): SourceCrs | null {
  let m = /^32([67])(\d\d)$/.exec(String(code));
  if (m && +m[2]! >= 1 && +m[2]! <= 60) return fromDef(code, `WGS 84 / UTM zone ${+m[2]!}${m[1] === '7' ? 'S' : 'N'}`, `+proj=utm +zone=${+m[2]!}${m[1] === '7' ? ' +south' : ''} +datum=WGS84 +units=m +no_defs`);
  m = /^258(2[89]|3[0-8])$/.exec(String(code));
  if (m) return fromDef(code, `ETRS89 / UTM zone ${+m[1]!}N`, `+proj=utm +zone=${+m[1]!} +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs`);
  m = /^269(0[1-9]|1\d|2[0-3])$/.exec(String(code));
  if (m) return fromDef(code, `NAD83 / UTM zone ${+m[1]!}N`, `+proj=utm +zone=${+m[1]!} +datum=NAD83 +units=m +no_defs`);
  m = /^78(4[6-9]|5[0-9])$/.exec(String(code));
  if (m) return fromDef(code, `GDA2020 / MGA zone ${+m[1]!}`, `+proj=utm +zone=${+m[1]!} +south +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs`);
  return null;
}

/** A system by EPSG code: bundled national grids and generic UTM zones; null when not bundled. */
export function crsByEpsg(code: number): SourceCrs | null {
  if (!Number.isInteger(code)) return null;
  const d = NATIONAL_CRS.find(c => c.epsg === code);
  return d ? fromDef(d.epsg, d.name, d.proj4) : utmFromCode(code);
}

/** The EPSG code in a declaration: "EPSG:21037", "21037", "urn:ogc:def:crs:EPSG::21037", "http://www.opengis.net/def/crs/EPSG/0/21037". */
export function epsgOf(v: string): number | null {
  const s = v.trim();
  if (/^urn:ogc:def:crs:OGC:(1\.3)?:CRS84$/i.test(s) || /\/def\/crs\/OGC\/1\.3\/CRS84$/i.test(s)) return 4326;
  const m = /^(?:EPSG:{1,2})?(\d{4,5})$/i.exec(s) ?? /EPSG::?(\d{4,5})$/i.exec(s) ?? /\/def\/crs\/EPSG\/\d+\/(\d{4,5})$/i.exec(s);
  return m ? Number(m[1]) : null;
}

/**
 * The system a file declares: an EPSG code (in any of its spellings) or the
 * WKT of a .prj. Refused, naming it, when it cannot be read here.
 */
export function readCrs(decl: { crs?: string; prj?: string }): SourceCrs | { error: string } {
  if (decl.prj?.trim()) {
    const wkt = decl.prj.trim();
    const code = /AUTHORITY\s*\[\s*"EPSG"\s*,\s*"?(\d{4,5})"?\s*\]\s*\]\s*$/i.exec(wkt)?.[1] ?? /ID\s*\[\s*"EPSG"\s*,\s*(\d{4,5})\s*\]\s*\]\s*$/i.exec(wkt)?.[1];
    if (code) { const c = crsByEpsg(Number(code)); if (c) return c; }
    const c = crsFromWkt(wkt);
    if ('error' in c) return c;
    const projected = !/^(GEOGCS|GEOGCRS|GEOGRAPHICCRS|GEODCRS|GEODETICCRS)\s*\[/i.test(wkt);
    const inv = c.toLonLat ? (() => { try { return proj4(wkt, 'WGS84'); } catch { return null; } })() : null;
    return { name: c.name || wktName(wkt), transformation: wkt, projected, ...(c.toLonLat ? {} : { wgs84: true }), toLonLat: p => (c.toLonLat ? (c.toLonLat(p) as [number, number]) : p), fromLonLat: p => (inv ? (inv.inverse(p) as [number, number]) : p) };
  }
  if (decl.crs?.trim()) {
    const code = epsgOf(decl.crs);
    if (code == null) return { error: `"${decl.crs.trim().slice(0, 60)}" is not an EPSG code (e.g. EPSG:21037)` };
    const c = crsByEpsg(code);
    return c ?? { error: `EPSG:${code} is not one of the bundled coordinate systems: attach the file's .prj, or ask the mapping agency to add it to the Nation Pack` };
  }
  return crsByEpsg(4326)!;
}

/** Convert one position; null when the result is not a position on Earth. */
export function toWgs84(crs: SourceCrs, x: number, y: number): { lng: number; lat: number } | null {
  if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
  const [lng, lat] = crs.toLonLat([x, y]);
  if (!Number.isFinite(lng) || !Number.isFinite(lat) || Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;
  return { lng: Math.round(lng * 1e7) / 1e7, lat: Math.round(lat * 1e7) / 1e7 };
}

/** The bundled national grids of a nation (ISO 3166-1 alpha-3), in the order they are listed. */
export const nationalGridsOf = (iso3: string | undefined): CrsDef[] =>
  (iso3 ? NATIONAL_CRS.filter(c => c.countries?.includes(iso3.toUpperCase())) : []);

/** The bundled systems, for a chooser. */
export const crsChoices = () => NATIONAL_CRS.map(c => ({ epsg: c.epsg, name: c.name, area: c.area }));
