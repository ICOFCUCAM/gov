// OGC API – Features Part 2: Coordinate Reference Systems by Reference
// (architecture review I1). The twin's collections are stored in CRS84
// (WGS 84 longitude/latitude); a client may ask for its features in another
// system (`crs`), give its `bbox` in another system (`bbox-crs`), and every
// items and feature answer says which system its coordinates are in
// (`Content-Crs`). Offered: CRS84, EPSG:4326 (WGS 84 with its official axis
// order, latitude first), EPSG:3857 (web maps) and the nation's national grids
// that the facility register's site importer already converts from
// (lib/geo/crs.ts, proj4 bundled; nothing is fetched). The same definitions
// work both ways, so a position imported on the national grid is served back
// on it within the transformation's precision.
//
// Axis order follows the EPSG definition of each system, as Part 2 requires:
// geographic systems (4326, 4210 Arc 1960, 4258 ETRS89 …) latitude first;
// EPSG:3035 (ETRS89-LAEA) northing first; the other projected grids
// easting first. CRS84 is longitude first.

import { crsByEpsg, nationalGridsOf, type SourceCrs } from '@/lib/geo/crs';
import { nationIso3 } from '@/lib/nation/registry';

export const CRS84 = 'http://www.opengis.net/def/crs/OGC/1.3/CRS84';
export const CRS_CONFORMANCE = ['http://www.opengis.net/spec/ogcapi-features-2/1.0/conf/crs'];
const EPSG_URI = (code: number) => `http://www.opengis.net/def/crs/EPSG/0/${code}`;
/** Projected systems whose EPSG axis order is northing first. */
const NORTHING_FIRST = new Set([3035]);

type Xy = [number, number];

/** A system the twin serves positions in: its URI, and the conversions from and to CRS84 in its own axis order. */
export interface ServedCrs {
  uri: string;
  epsg?: number;
  /** CRS84 longitude/latitude to this system's coordinates, in its axis order. */
  fromCrs84: (p: Xy) => Xy;
  /** This system's coordinates, in its axis order, to CRS84. */
  toCrs84: (p: Xy) => Xy;
  /** Decimal places served (degrees 7, metres 2). */
  digits: number;
}

const swap = (p: Xy): Xy => [p[1], p[0]];
const crs84: ServedCrs = { uri: CRS84, fromCrs84: p => p, toCrs84: p => p, digits: 7 };

function served(code: number, c: SourceCrs): ServedCrs {
  const yFirst = !c.projected || NORTHING_FIRST.has(code);
  return {
    uri: EPSG_URI(code), epsg: code, digits: c.projected ? 2 : 7,
    fromCrs84: p => { const q = c.fromLonLat(p); return yFirst ? swap(q) : q; },
    toCrs84: p => c.toLonLat(yFirst ? swap(p) : p),
  };
}

/** The EPSG codes the nation's twin offers besides CRS84: WGS 84, web Mercator and its national grids. */
export function offeredEpsg(iso3 = nationIso3()): number[] {
  return [...new Set([4326, 3857, ...nationalGridsOf(iso3).map(c => c.epsg)])];
}

/** The `crs` list of every collection: CRS84 first (the storage system), then the others. */
export const collectionCrs = (iso3 = nationIso3()): string[] => [CRS84, ...offeredEpsg(iso3).map(EPSG_URI)];

/**
 * A CRS a client names (`crs`, `bbox-crs`): its URI as listed (or the
 * `[EPSG:4326]` safe-CURIE form), when the nation's twin offers it. Undefined
 * for no value (CRS84); an error naming the systems offered otherwise.
 */
export function readCrsParam(v: string | null, param: 'crs' | 'bbox-crs'): ServedCrs | { error: string } | undefined {
  if (v == null || v.trim() === '') return undefined;
  const s = v.trim().replace(/^\[(.*)\]$/, '$1');
  if (s === CRS84 || /^(OGC:)?CRS84$/i.test(s)) return crs84;
  const m = /^http:\/\/www\.opengis\.net\/def\/crs\/EPSG\/0\/(\d{4,5})$/.exec(s) ?? /^EPSG:(\d{4,5})$/i.exec(s);
  const code = m ? Number(m[1]) : NaN;
  const offered = offeredEpsg();
  const c = offered.includes(code) ? crsByEpsg(code) : null;
  if (!c) return { error: `${param} must be one of the collection's systems: ${collectionCrs().join(', ')}` };
  return served(code, c);
}

const round = (v: number, d: number) => Math.round(v * 10 ** d) / 10 ** d;

/** Every position of a GeoJSON geometry through `f`. */
function mapCoords(c: unknown, f: (p: Xy) => Xy, digits: number): unknown {
  if (Array.isArray(c) && typeof c[0] === 'number') {
    const [x, y] = f([c[0] as number, c[1] as number]);
    return [round(x, digits), round(y, digits), ...c.slice(2)];
  }
  return Array.isArray(c) ? c.map(x => mapCoords(x, f, digits)) : c;
}

interface Geometry { type: string; coordinates?: unknown; geometries?: Geometry[] }
function mapGeometry(g: Geometry | null | undefined, f: (p: Xy) => Xy, digits: number): Geometry | null | undefined {
  if (!g) return g;
  if (g.type === 'GeometryCollection') return { ...g, geometries: (g.geometries ?? []).map(x => mapGeometry(x, f, digits)!) };
  return { ...g, coordinates: mapCoords(g.coordinates, f, digits) };
}

/**
 * A bbox given in `bbox-crs`, as the CRS84 box the collections filter on:
 * the box's edges are sampled and converted, and their envelope taken, so a
 * box on a projected grid covers everything inside it.
 */
export function bboxToCrs84(bbox: string | null, crs: ServedCrs | undefined): string | null | { error: string } {
  if (!bbox || !crs || crs.uri === CRS84) return bbox;
  const n = bbox.split(',').map(Number);
  if (n.length !== 4 || n.some(x => !Number.isFinite(x))) return { error: 'bbox must be four numbers in bbox-crs axis order' };
  const [a, b, c, d] = n as [number, number, number, number];
  if (a > c || b > d) return { error: 'bbox must be lower corner, then upper corner' };
  const pts: Xy[] = [];
  for (let i = 0; i <= 8; i++) {
    const t = i / 8;
    pts.push([a + (c - a) * t, b], [a + (c - a) * t, d], [a, b + (d - b) * t], [c, b + (d - b) * t]);
  }
  const ll = pts.map(p => crs.toCrs84(p)).filter(p => Number.isFinite(p[0]) && Number.isFinite(p[1]));
  if (!ll.length) return { error: 'bbox is not a box on Earth in bbox-crs' };
  const xs = ll.map(p => p[0]), ys = ll.map(p => p[1]);
  return [Math.max(-180, Math.min(...xs)), Math.max(-90, Math.min(...ys)), Math.min(180, Math.max(...xs)), Math.min(90, Math.max(...ys))].map(v => round(v, 7)).join(',');
}

interface Feature { geometry?: Geometry | null; bbox?: number[]; [k: string]: unknown }
interface Link { href: string; rel: string; [k: string]: unknown }

/** One feature's geometry (and its bbox, when it has one) in the system asked for. */
export function featureInCrs<F extends Feature>(f: F, crs: ServedCrs | undefined): F {
  if (!crs || crs.uri === CRS84) return f;
  const geometry = mapGeometry(f.geometry, crs.fromCrs84, crs.digits);
  if (!f.bbox) return { ...f, geometry };
  const corners = [crs.fromCrs84([f.bbox[0]!, f.bbox[1]!]), crs.fromCrs84([f.bbox[2]!, f.bbox[3]!])];
  return { ...f, geometry, bbox: [Math.min(corners[0]![0], corners[1]![0]), Math.min(corners[0]![1], corners[1]![1]), Math.max(corners[0]![0], corners[1]![0]), Math.max(corners[0]![1], corners[1]![1])].map(v => round(v, crs.digits)) };
}

/**
 * Carry the client's own `crs`, `bbox` and `bbox-crs` into the paging and
 * self links of an answer (the collections build them from the CRS84 box).
 */
export function linksInCrs(links: Link[] | undefined, q: { crs: string | null; bbox: string | null; bboxCrs: string | null }): Link[] | undefined {
  if (!links || (!q.crs && !q.bboxCrs)) return links;
  return links.map(l => {
    if (!/\/items(\/|\?|$)/.test(l.href) || !['self', 'next', 'prev', 'alternate'].includes(l.rel)) return l;
    const u = new URL(l.href);
    if (q.crs) u.searchParams.set('crs', q.crs);
    if (q.bboxCrs && q.bbox) { u.searchParams.set('bbox', q.bbox); u.searchParams.set('bbox-crs', q.bboxCrs); }
    return { ...l, href: u.href };
  });
}

/** An items or feature answer in the system asked for, with its links kept in that system. */
export function answerInCrs<T extends { features?: Feature[]; links?: Link[]; geometry?: Geometry | null }>(body: T, crs: ServedCrs | undefined, q: { crs: string | null; bbox: string | null; bboxCrs: string | null }): T {
  const links = linksInCrs(body.links, q);
  if (body.features) return { ...body, features: body.features.map(f => featureInCrs(f, crs)), ...(links ? { links } : {}) };
  return { ...featureInCrs(body as Feature, crs), ...(links ? { links } : {}) } as T;
}

/** The Content-Crs header value of an answer (RFC: the URI in angle brackets). */
export const contentCrs = (crs: ServedCrs | undefined): string => `<${crs?.uri ?? CRS84}>`;

/** A collection's description with the systems it offers (Part 2: `crs`, `storageCrs`). */
export function withCrs<T extends object>(info: T): T & { crs: string[]; storageCrs: string } {
  return { ...info, crs: collectionCrs(), storageCrs: CRS84 };
}
