// The nation's own boundaries (map plan phase 4: boundary sources with versions).
//
// The mapping authority loads its administrative boundaries (GeoJSON,
// TopoJSON, a zipped Shapefile or a GeoPackage: lib/geo/boundary-files.ts) for a level — regions (1) or districts (2) —
// with the source, licence and the date they took legal effect. The server
// checks them before anyone can publish:
// - longitude/latitude (WGS 84): a Shapefile's .prj or a GeoPackage's
//   spatial reference is reprojected (UTM, national grids, other datums) or
//   refused naming the system; GeoJSON in other systems and bare
//   coordinates in metres are refused;
// - heavy files (over 200,000 points, or 5 MB) are simplified on a shared
//   topology (lib/geo/boundary-simplify.ts): borders stay shared, no unit is
//   dropped; points before and after and the tolerance are recorded;
// - polygons only, rings closed, wound the way the map expects (fixed, noted);
// - every unit has a code and a name, codes unique; codes and names matched to
//   the nation's official subdivisions (ISO 3166-2), and the rest listed;
// - districts get their region from the map (never typed);
// - coverage against the boundaries in force (area, units outside, overlaps);
// - fewer units than the boundaries in force must be confirmed.
// One official proposes, a different one publishes (four-eyes); every
// version is kept with its SHA-256, nothing is overwritten, and withdrawing a
// published version returns the map to the one before. While a published
// version is in force, every map draws it and credits it
// (lib/map/boundary-active.ts). GADM-derived data is refused (its licence
// forbids redistribution).

import { createHash } from 'node:crypto';
import { geoArea, geoCentroid, geoContains } from 'd3-geo';
import { readBoundaryFile, type BoundaryFormat, type Feature } from '@/lib/geo/boundary-files';
import { countVertices, needsSimplifying, simplifyFeatures, SIMPLIFY_TARGET_VERTICES, type Simplification } from '@/lib/geo/boundary-simplify';
import { recordAudit } from '@/lib/data/store';
import { nationIso3, nationRegions } from '@/lib/nation/registry';
import { loadDivisions } from '@/lib/geo/divisions';
import { loadAdmin2 } from '@/lib/geo/admin2';
import type { Geom } from '@/lib/geo/admin1';
import { nameKeys } from '@/lib/map/names';
import { pickActive, type ActiveBoundary, type BoundarySource, type BoundaryUnit } from '@/lib/map/boundary-active';

export type { BoundarySource, BoundaryUnit, BoundaryFormat, Simplification };
export type Level = 1 | 2;

export interface BoundaryCheck {
  errors: string[];
  warnings: string[];
  summary: {
    units: number;
    /** Units matched to an official subdivision code. */
    matched: number;
    /** Official subdivisions of the level the file does not hold. */
    missing: string[];
    /** Units not in the official list (kept with the file's code). */
    unofficial: string[];
    areaKm2: number;
    /** Area of the boundaries in force, to compare. */
    previousAreaKm2?: number;
    previousUnits?: number;
    /** Rings rewound to the map's winding. */
    rewound: number;
    /** Fewer units than the boundaries in force. */
    fewer: boolean;
    /** Points in the file as read, and as recorded (after any simplification). */
    vertices?: number;
    /** The file was simplified on the server: how, and to how many points. */
    simplified?: Simplification;
    /** The coordinate system the file was in, and whether it was reprojected. */
    crs?: string;
    reprojectedFrom?: string;
    /** Attribute fields of the file (to choose the code and name fields). */
    fields?: string[];
  };
  /** How the file was read: format, reprojection, encoding, layer, simplification. */
  notes?: string[];
}

export interface BoundaryVersion {
  id: string;
  iso3: string;
  level: Level;
  /** Version number for the nation and level, from 1. */
  n: number;
  source: BoundarySource;
  /** When the boundaries took legal effect (YYYY-MM-DD). */
  validFrom: string;
  units: BoundaryUnit[];
  sha256: string;
  /** SHA-256 of the uploaded file as received. */
  fileSha256: string;
  format: BoundaryFormat;
  /** Set when the shapes were simplified on the server (the full-detail file is kept only as its SHA-256, fileSha256). */
  simplified?: Simplification;
  /** The coordinate system the file was reprojected from. */
  reprojectedFrom?: string;
  check: BoundaryCheck;
  state: 'proposed' | 'published' | 'withdrawn';
  proposedBy: string; proposedAt: string;
  publishedBy?: string; publishedAt?: string;
  withdrawnBy?: string; withdrawnAt?: string; withdrawReason?: string;
  /** The proposer confirmed that fewer units than before is intended (a merger of units). */
  confirmFewer?: boolean;
  note?: string;
}

interface Db { versions: BoundaryVersion[]; seq: number }
const g = globalThis as unknown as { __civicosBoundaries?: Db };
const db = (): Db => { const d = (g.__civicosBoundaries ??= { versions: [], seq: 1 }); d.versions ??= []; d.seq ??= 1; return d; };
export function resetBoundaries(): void { g.__civicosBoundaries = undefined; }

/** Largest file accepted (zipped Shapefiles and GeoPackages travel as multipart uploads). */
export const MAX_BOUNDARY_BYTES = 100_000_000;
export const MAX_BOUNDARY_UNITS = 6000;
const now = () => new Date().toISOString();
const clean = (s: unknown, max = 200) => String(s ?? '').replace(/[\u0000-\u001f]/g, ' ').trim().slice(0, max);
const R_KM = 6371.0088;

const CODE_FIELDS = ['iso_3166_2', 'ISO_3166_2', 'iso3166_2', 'shapeISO', 'iso', 'ISO', 'code', 'CODE', 'pcode', 'PCODE', 'ADM2_PCODE', 'ADM1_PCODE', 'HASC_2', 'HASC_1', 'id'];
const NAME_FIELDS = ['name', 'NAME', 'shapeName', 'name_en', 'NAME_EN', 'ADM2_EN', 'ADM1_EN', 'NAME_2', 'NAME_1', 'admin_name'];

const pick = (p: Record<string, unknown>, fields: string[], chosen?: string) => {
  if (chosen) return clean(p[chosen], 120);
  for (const f of fields) { const v = clean(p[f], 120); if (v) return v; }
  return '';
};

/** Close rings and wind each polygon the way the map's projection expects (exterior clockwise on the sphere). */
function normalise(geom: { type: string; coordinates?: unknown }): { geom: Geom; rewound: number; closed: number } | { error: string } {
  const polys: number[][][][] = geom.type === 'Polygon' ? [geom.coordinates as number[][][]] : geom.type === 'MultiPolygon' ? (geom.coordinates as number[][][][]) : [];
  if (!polys.length || !Array.isArray(polys[0])) return { error: `${geom.type} is not an area: only Polygon and MultiPolygon` };
  let rewound = 0, closed = 0;
  const out: number[][][][] = [];
  for (const poly of polys) {
    const rings: number[][][] = [];
    for (const ring of poly) {
      if (!Array.isArray(ring) || ring.length < 3) return { error: 'A ring has fewer than three points' };
      const pts = ring.map(p => [Number(p[0]), Number(p[1])]);
      if (pts.some(([x, y]) => !Number.isFinite(x!) || !Number.isFinite(y!))) return { error: 'A coordinate is not a number' };
      if (pts.some(([x, y]) => Math.abs(x!) > 180 || Math.abs(y!) > 90)) return { error: 'Coordinates are beyond ±180/±90: the file is probably in a projected system (metres). Convert it to longitude/latitude (WGS 84)' };
      const [a, b] = [pts[0]!, pts[pts.length - 1]!];
      if (a[0] !== b[0] || a[1] !== b[1]) { pts.push([a[0]!, a[1]!]); closed++; }
      if (pts.length < 4) return { error: 'A ring has fewer than three points' };
      rings.push(pts.map(([x, y]) => [Math.round(x! * 1e6) / 1e6, Math.round(y! * 1e6) / 1e6]));
    }
    // An area larger than a hemisphere means the rings run the other way round.
    if (geoArea({ type: 'Polygon', coordinates: rings } as never) > 2 * Math.PI) { rings.forEach(r => r.reverse()); rewound++; }
    out.push(rings);
  }
  return { geom: out.length === 1 ? { type: 'Polygon', coordinates: out[0]! } : { type: 'MultiPolygon', coordinates: out }, rewound, closed };
}

const asFeature = (geometry: Geom) => ({ type: 'Feature' as const, properties: {}, geometry });

/**
 * A point inside the unit (its label point): the centre when that lies
 * inside, else a point inside its largest part (a coastal unit with islands
 * can have its centre in the sea).
 */
function insidePoint(gm: Geom): [number, number] {
  const f = asFeature(gm) as never;
  const c = geoCentroid(f) as [number, number];
  if (geoContains(f, c)) return c;
  const polys = (gm.type === 'Polygon' ? [gm.coordinates] : gm.coordinates) as number[][][][];
  const largest = polys.map(p => ({ p, a: geoArea({ type: 'Polygon', coordinates: p } as never) })).sort((a, b) => b.a - a.a)[0]!.p;
  const lc = geoCentroid({ type: 'Polygon', coordinates: largest } as never) as [number, number];
  if (geoContains(f, lc)) return lc;
  const ring = largest[0]!;
  const step = Math.max(1, Math.floor(ring.length / 60));
  for (const t of [0.5, 0.25, 0.75, 0.1, 0.9]) {
    for (let i = 0; i < ring.length; i += step) {
      const q: [number, number] = [ring[i]![0]! + (lc[0] - ring[i]![0]!) * t, ring[i]![1]! + (lc[1] - ring[i]![1]!) * t];
      if (geoContains(f, q)) return q;
    }
  }
  return c;
}
const areaKm2 = (gm: Geom) => geoArea(asFeature(gm) as never) * R_KM * R_KM;
const slug = (s: string) => s.toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

/** What a map currently draws for the level (the version in force, or the bundled shapes), to compare against. */
async function current(iso3: string, level: Level): Promise<{ code: string; name: string; geometry?: Geom }[]> {
  const active = pickActive(db().versions, iso3, level);
  if (active) return active.units;
  if (level === 2) return (await loadAdmin2(iso3))?.units ?? [];
  const { loadNationGeography } = await import('@/lib/map/geography');
  return ((await loadNationGeography(iso3, nationRegions()))?.units ?? []).filter(u => u.code).map(u => ({ code: u.code!, name: u.name, geometry: u.geometry }));
}

export interface LoadInput {
  level: Level;
  /** The file as text (GeoJSON, TopoJSON) ... */
  text?: string;
  /** ... or as bytes (any format: zipped Shapefile, GeoPackage, JSON). */
  bytes?: Uint8Array;
  fileName?: string;
  /** Detected from the file when not given. */
  format?: BoundaryFormat;
  source: Partial<BoundarySource>;
  validFrom?: string;
  codeField?: string;
  nameField?: string;
  confirmFewer?: boolean;
  note?: string;
}

/** Check a boundary file; with `dryRun`, nothing is recorded. */
export async function proposeBoundaries(input: LoadInput, by: string, opts: { dryRun?: boolean; simplify?: { aboveVertices?: number; aboveBytes?: number; targetVertices?: number } } = {}): Promise<{ version?: BoundaryVersion; check: BoundaryCheck; dryRun: boolean } | { error: string; check?: BoundaryCheck }> {
  const iso3 = nationIso3();
  if (!iso3) return { error: 'Set the nation in setup first: boundaries belong to a nation' };
  if (!by.trim()) return { error: 'Name the official loading the boundaries' };
  if (input.level !== 1 && input.level !== 2) return { error: 'Choose the level: regions (1) or districts (2)' };
  const size = input.bytes ? input.bytes.byteLength : Buffer.byteLength(input.text ?? '');
  if (!size) return { error: 'Attach the boundary file' };
  if (size > MAX_BOUNDARY_BYTES) return { error: `The file is larger than ${MAX_BOUNDARY_BYTES / 1_000_000} MB: split it by level or simplify it first` };
  const source: BoundarySource = { publisher: clean(input.source.publisher), licence: clean(input.source.licence, 120), ...(clean(input.source.url, 400) ? { url: clean(input.source.url, 400) } : {}), ...(clean(input.source.year, 10) ? { year: clean(input.source.year, 10) } : {}), ...(clean(input.source.note, 400) ? { note: clean(input.source.note, 400) } : {}) };
  if (!source.publisher) return { error: 'Name who publishes the boundaries (e.g. the national mapping agency)' };
  if (!source.licence) return { error: 'Record the licence the boundaries are published under' };
  if (/gadm/i.test(`${source.publisher} ${source.licence} ${source.url ?? ''} ${source.note ?? ''}`)) return { error: 'GADM data may not be redistributed: load the national or geoBoundaries / OCHA HDX boundaries instead' };
  const validFrom = clean(input.validFrom, 10) || now().slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(validFrom) || Number.isNaN(Date.parse(validFrom))) return { error: 'The date the boundaries took effect must be YYYY-MM-DD' };

  const read = await readBoundaryFile({ bytes: input.bytes, text: input.text, name: input.fileName, format: input.format });
  if ('error' in read) return read;
  const format = read.format;
  let feats: Feature[] = read.features;
  if (!feats.length) return { error: 'The file holds no features' };
  if (feats.length > MAX_BOUNDARY_UNITS) return { error: `More than ${MAX_BOUNDARY_UNITS} units in one file` };
  const notes: string[] = [`Read as ${({ geojson: 'GeoJSON', topojson: 'TopoJSON', 'shapefile-zip': 'a zipped Shapefile', geopackage: 'a GeoPackage' } as const)[format]}`, ...read.notes];
  const fields = [...new Set(feats.slice(0, 50).flatMap(f => Object.keys(f.properties ?? {})))].slice(0, 80);
  const verticesRead = countVertices(feats);
  let simplified: Simplification | undefined;
  if (needsSimplifying(verticesRead, size, opts.simplify)) {
    const s = simplifyFeatures(feats, opts.simplify?.targetVertices ?? SIMPLIFY_TARGET_VERTICES);
    feats = s.features; simplified = s.info;
    notes.push(`Simplified on the server keeping shared borders: ${s.info.verticesBefore.toLocaleString('en')} points to ${s.info.verticesAfter.toLocaleString('en')}, smallest detail kept ${s.info.minAreaKm2} km², all ${s.info.units} units kept`);
  }

  const errors: string[] = [], warnings: string[] = [];
  const levels = await loadDivisions(iso3).catch(() => []);
  const official = levels.flatMap(l => l.units);
  const ofLevel = levels[input.level - 1]?.units ?? [];
  const byCode = new Map(official.map(d => [d.code.toUpperCase(), d]));
  const byName = new Map<string, (typeof official)[number]>();
  for (const d of (ofLevel.length ? ofLevel : official)) for (const k of nameKeys(d.name)) if (!byName.has(k)) byName.set(k, d);

  const regions = input.level === 2 ? await current(iso3, 1) : [];
  let rewound = 0, closedRings = 0;
  const units: BoundaryUnit[] = [];
  const unofficial: string[] = [];
  const seen = new Set<string>();
  feats.forEach((f, i) => {
    const p = (f.properties ?? {}) as Record<string, unknown>;
    const rawCode = pick(p, CODE_FIELDS, input.codeField) || (typeof f.id === 'string' || typeof f.id === 'number' ? clean(f.id, 120) : '');
    const name = pick(p, NAME_FIELDS, input.nameField);
    const label = name || rawCode || `feature ${i + 1}`;
    if (!f.geometry) { errors.push(`${label}: no geometry`); return; }
    const n = normalise(f.geometry);
    if ('error' in n) { errors.push(`${label}: ${n.error}`); return; }
    rewound += n.rewound; closedRings += n.closed;
    if (!name) { errors.push(`${label}: no name (choose the name field)`); return; }
    const off = (rawCode && byCode.get(rawCode.toUpperCase())) || nameKeys(name).map(k => byName.get(k)).find(Boolean);
    const [lng, lat] = insidePoint(n.geom);
    let parent: string | undefined;
    if (input.level === 2) {
      const host = regions.find(r => r.geometry && geoContains(asFeature(r.geometry) as never, [lng!, lat!]));
      parent = host?.code;
      if (!parent) warnings.push(`${name} lies outside every region as the map draws them`);
      else if (off?.parent && off.parent !== parent) warnings.push(`${name} is listed under ${off.parent} but lies in ${parent}`);
    }
    let code = off?.code ?? '';
    if (!code) {
      if (input.level === 2 && parent) code = `${parent}:${slug(name)}`;
      else if (rawCode) code = rawCode;
      else { errors.push(`${label}: no code (choose the code field)`); return; }
      unofficial.push(name);
    }
    if (seen.has(code)) { errors.push(`${name}: the code ${code} is used twice`); return; }
    seen.add(code);
    units.push({ code, name: off && input.level === 1 ? off.name : name, ...(parent ? { parent } : {}), geometry: n.geom, lng: Math.round(lng! * 1e5) / 1e5, lat: Math.round(lat! * 1e5) / 1e5, ...(rawCode && rawCode !== code ? { sourceCode: rawCode } : {}) });
  });
  if (rewound) warnings.push(`${rewound} polygon${rewound === 1 ? ' was' : 's were'} wound the other way round and were turned`);
  if (closedRings) warnings.push(`${closedRings} ring${closedRings === 1 ? ' was' : 's were'} not closed and were closed`);

  const have = new Set(units.map(u => u.code));
  const missing = ofLevel.filter(d => !have.has(d.code)).map(d => d.name);
  if (missing.length && ofLevel.length) warnings.push(`${missing.length} official ${input.level === 1 ? 'region' : 'district'}${missing.length === 1 ? ' is' : 's are'} not in the file: ${missing.slice(0, 8).join(', ')}${missing.length > 8 ? '…' : ''}`);
  if (unofficial.length) warnings.push(`${unofficial.length} unit${unofficial.length === 1 ? ' is' : 's are'} not in the official list and keep the file's code: ${unofficial.slice(0, 8).join(', ')}${unofficial.length > 8 ? '…' : ''}`);

  // Overlaps: a unit whose centre lies inside another (checked up to 800 units).
  const overlaps: string[] = [];
  if (units.length <= 800) {
    for (const u of units) {
      const other = units.find(o => o !== u && geoContains(asFeature(o.geometry) as never, [u.lng, u.lat]));
      if (other && geoContains(asFeature(u.geometry) as never, [u.lng, u.lat])) overlaps.push(`${u.name} / ${other.name}`);
      if (overlaps.length >= 6) break;
    }
  }
  if (overlaps.length) warnings.push(`Units overlap: ${overlaps.join(', ')}`);

  const prev = await current(iso3, input.level);
  const area = units.reduce((s, u) => s + areaKm2(u.geometry), 0);
  const prevArea = prev.reduce((s, u) => s + (u.geometry ? areaKm2(u.geometry) : 0), 0);
  if (prevArea > 0 && area > 0) {
    const ratio = area / prevArea;
    if (ratio < 0.9) warnings.push(`The units cover ${Math.round((1 - ratio) * 100)}% less area than the boundaries in force: gaps, or part of the nation missing`);
    else if (ratio > 1.1) warnings.push(`The units cover ${Math.round((ratio - 1) * 100)}% more area than the boundaries in force: overlaps, or land beyond the nation`);
  }
  if (prev.length) {
    const outside = units.filter(u => !prev.some(q => q.geometry && geoContains(asFeature(q.geometry) as never, [u.lng, u.lat]))).map(u => u.name);
    if (outside.length) warnings.push(`${outside.length} unit${outside.length === 1 ? ' lies' : 's lie'} outside the nation as the map draws it now: ${outside.slice(0, 6).join(', ')}`);
  }
  const fewer = prev.length > 0 && units.length < prev.length;
  if (fewer) warnings.push(`Fewer units than the boundaries in force (${units.length} instead of ${prev.length}): confirm this is intended (units merged)`);
  if (!units.length && !errors.length) errors.push('No usable units in the file');

  const check: BoundaryCheck = {
    errors, warnings,
    summary: {
      units: units.length, matched: units.length - unofficial.length, missing, unofficial, areaKm2: Math.round(area), ...(prevArea ? { previousAreaKm2: Math.round(prevArea) } : {}), ...(prev.length ? { previousUnits: prev.length } : {}), rewound, fewer,
      vertices: simplified ? simplified.verticesAfter : verticesRead, ...(simplified ? { simplified } : {}), ...(read.crs ? { crs: read.crs } : {}), ...(read.reprojectedFrom ? { reprojectedFrom: read.reprojectedFrom } : {}), fields,
    },
    notes,
  };
  if (opts.dryRun) return { check, dryRun: true };
  if (errors.length) return { error: `The boundaries cannot be recorded: ${errors[0]}${errors.length > 1 ? ` (and ${errors.length - 1} more)` : ''}`, check };
  if (fewer && !input.confirmFewer) return { error: 'Fewer units than the boundaries in force: confirm that units were merged', check };

  const d = db();
  const n = d.versions.filter(v => v.iso3 === iso3 && v.level === input.level).length + 1;
  const v: BoundaryVersion = {
    id: `bnd-${String(d.seq++).padStart(4, '0')}`, iso3, level: input.level, n, source, validFrom, units,
    sha256: createHash('sha256').update(JSON.stringify(units)).digest('hex'),
    fileSha256: createHash('sha256').update(input.bytes ?? input.text ?? '').digest('hex'),
    format, ...(simplified ? { simplified } : {}), ...(read.reprojectedFrom ? { reprojectedFrom: read.reprojectedFrom } : {}), check, state: 'proposed', proposedBy: by.trim(), proposedAt: now(),
    ...(input.confirmFewer ? { confirmFewer: true } : {}), ...(clean(input.note, 400) ? { note: clean(input.note, 400) } : {}),
  };
  d.versions.push(v);
  recordAudit(v.proposedBy, 'boundary.propose', `Boundary:${v.id}`, 'ok', `level ${v.level} v${v.n}, ${format}, ${units.length} units, valid from ${validFrom}${read.reprojectedFrom ? `, reprojected from ${read.reprojectedFrom}` : ''}${simplified ? `, simplified ${simplified.verticesBefore}→${simplified.verticesAfter} points (min ${simplified.minAreaKm2} km²)` : ''}, sha256 ${v.sha256.slice(0, 12)}`);
  return { version: strip(v), check, dryRun: false };
}

/** A different official publishes a proposed version; it is drawn from its validFrom date. */
export function publishBoundaries(id: string, by: string): BoundaryVersion | { error: string } {
  const v = db().versions.find(x => x.id === id);
  if (!v) return { error: 'Boundary version not found' };
  if (v.state !== 'proposed') return { error: `This version is ${v.state}` };
  if (!by.trim()) return { error: 'Name the official publishing' };
  if (by.trim() === v.proposedBy) return { error: 'A different official must publish the boundaries they did not load (four-eyes)' };
  if (v.iso3 !== nationIso3()) return { error: 'These boundaries were loaded for another nation' };
  v.state = 'published'; v.publishedBy = by.trim(); v.publishedAt = now();
  recordAudit(v.publishedBy, 'boundary.publish', `Boundary:${v.id}`, 'ok', `level ${v.level} v${v.n}, valid from ${v.validFrom}`);
  return strip(v);
}

/** Withdraw a version (proposed or published); a withdrawn published version hands the map back to the one before. Kept in the record. */
export function withdrawBoundaries(id: string, by: string, reason?: string): BoundaryVersion | { error: string } {
  const v = db().versions.find(x => x.id === id);
  if (!v) return { error: 'Boundary version not found' };
  if (v.state === 'withdrawn') return { error: 'Already withdrawn' };
  const why = clean(reason, 400);
  if (v.state === 'published' && !why) return { error: 'Give the reason for withdrawing published boundaries' };
  v.state = 'withdrawn'; v.withdrawnBy = by.trim() || 'operator'; v.withdrawnAt = now(); if (why) v.withdrawReason = why;
  recordAudit(v.withdrawnBy, 'boundary.withdraw', `Boundary:${v.id}`, 'ok', why || 'proposal withdrawn');
  return strip(v);
}

/** A version without its shapes (for lists). */
function strip(v: BoundaryVersion): BoundaryVersion { return { ...structuredClone({ ...v, units: [] }), units: [] }; }

export function listBoundaryVersions(level?: Level): (BoundaryVersion & { unitCount: number; inForce: boolean })[] {
  const iso3 = nationIso3();
  const force = new Set([pickActive(db().versions, iso3 ?? '', 1)?.id, pickActive(db().versions, iso3 ?? '', 2)?.id]);
  return db().versions
    .filter(v => v.iso3 === iso3 && (!level || v.level === level))
    .map(v => ({ ...strip(v), unitCount: v.units.length, inForce: force.has(v.id) }))
    .reverse();
}

/** One version with its shapes (for its preview and the open data service). */
export function getBoundaryVersion(id: string): BoundaryVersion | undefined {
  const v = db().versions.find(x => x.id === id);
  return v ? structuredClone(v) : undefined;
}

/** The versions in force for the installed nation on a date (both levels), as known now or by `knownBy`. */
export function boundariesInForce(at?: Date, knownBy?: Date): ActiveBoundary[] {
  const iso3 = nationIso3();
  if (!iso3) return [];
  return ([1, 2] as const).map(l => pickActive(db().versions, iso3, l, at, knownBy)).filter((x): x is ActiveBoundary => !!x);
}
