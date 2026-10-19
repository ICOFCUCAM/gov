// District shapes for every other nation, installed at setup (map plan
// phase 3). The platform bundles district (admin-2) shapes for a few nations
// (lib/geo/admin2, built by scripts/build-map-pack.mjs); for any other nation
// an administrator installs them here:
// - from geoBoundaries gbOpen: the server asks the geoBoundaries API
//   (www.geoboundaries.org) for the level's metadata and downloads the
//   simplified GeoJSON from the geoBoundaries repository's file host
//   (media.githubusercontent.com), both through safeFetchText (public
//   addresses only, size and time limits, each host allowed by name);
// - or, offline / air-gapped, from the geoBoundaries GeoJSON file uploaded
//   by the administrator, with its metadata file or the source and licence typed.
// Either way the same rules as the bundled files (lib/geo/admin2-convert.mjs):
// open licences only, never GADM-derived data; each district placed under the
// region whose shape holds it (from the map, never typed); codes ISO 3166-2
// when the source has them, else `${region}:${slug}`. Source, licence, year,
// SHA-256, who installed and when are kept and audited; removing the
// installed districts hands the map back to the bundled ones (or none).
// Maps read them through lib/map/districts-installed.ts; a version published
// by the nation's mapping authority (lib/data/boundaries.ts) still comes first.

import { createHash } from 'node:crypto';
import { recordAudit } from '@/lib/data/store/audit';
import { nationIso3 } from '@/lib/nation/registry';
import { safeFetchText } from '@/lib/net/safe-fetch';
import { loadCountry, type BoundaryCredit, type Geom } from '@/lib/geo/admin1';
import { ADMIN2, type Admin2Unit } from '@/lib/geo/admin2';
import BOUNDARY_INDEX from '@/lib/geo/boundaries/index.json';
import { activeBoundary } from '@/lib/map/boundary-active';
import { countVertices, needsSimplifying, simplifyFeatures, type Simplification } from '@/lib/geo/boundary-simplify';
import { assignUnits, finerThan, labelPoint, levelsBelow, licenceRefusal, parentFinder, rewind, roundGeometry, type GbMeta } from '@/lib/geo/admin2-convert.mjs';
import type { InstalledDistrictsLike } from '@/lib/map/districts-installed';
import { touch } from '@/lib/data/repo/track';

export type { GbMeta };

export interface DistrictPack extends InstalledDistrictsLike {
  /** geoBoundaries' identifier of the release (e.g. RWA-ADM2-39286606). */
  boundaryId?: string;
  method: 'download' | 'upload';
  /** Where the shapes were downloaded from (download only). */
  url?: string;
  /** SHA-256 of the converted units, and of the file as received. */
  sha256: string;
  fileSha256: string;
  parents: number;
  /** Districts placed by the outline vote (their label point outside every region). */
  viaVote: number;
  warnings: string[];
  installedBy: string;
}
export type DistrictPackSummary = Omit<DistrictPack, 'units'> & { unitCount: number };
export interface PackEvent { at: string; by: string; action: 'install' | 'remove'; iso3: string; method?: DistrictPack['method']; adm?: string; units?: number; sha256?: string; source?: string; licence?: string; reason?: string }

interface Db { installed: Record<string, DistrictPack>; history: PackEvent[] }
const g = globalThis as unknown as { __civicosMapPack?: Db };
const db = (): Db => { const d = touch('__civicosMapPack', g.__civicosMapPack ??= { installed: {}, history: [] }); d.installed ??= {}; d.history ??= []; return d; };
export function resetMapPack(): void { g.__civicosMapPack = undefined; }

/** The geoBoundaries API and the host its files are served from. */
export const GB_API = 'https://www.geoboundaries.org/api/current/gbOpen';
export const GB_HOSTS = ['www.geoboundaries.org', 'media.githubusercontent.com'] as const;
export const MAX_PACK_BYTES = 60_000_000;
export const MAX_PACK_UNITS = 8000;

const now = () => new Date().toISOString();
const clean = (s: unknown, max = 200) => String(s ?? '').replace(/[\u0000-\u001f]/g, ' ').trim().slice(0, max);
const sha = (s: string) => createHash('sha256').update(s).digest('hex');
const UPGRADED = BOUNDARY_INDEX as Record<string, { adm?: string }>;

export interface FetchDeps { fetch?: typeof fetch; resolve?: (host: string) => Promise<string[]> }

/** The first-level shapes the map draws (published by the nation, else bundled), to place districts in. */
async function firstLevel(iso3: string): Promise<{ adm: string; provinces: { code: string; geometry: Geom }[] }> {
  const own = await activeBoundary(iso3, 1);
  if (own) return { adm: 'ADM1', provinces: own.units.map(u => ({ code: u.code, geometry: u.geometry })) };
  const c = await loadCountry(iso3);
  return { adm: UPGRADED[iso3]?.adm ?? 'ADM1', provinces: (c?.provinces ?? []).map(p => ({ code: p.code, geometry: p.geometry as Geom })) };
}

/**
 * The address of the release's GeoJSON on the geoBoundaries file host. The
 * API names github.com/wmgeolab/geoBoundaries/raw/…, which redirects to the
 * Git LFS host (media.githubusercontent.com); the server goes there directly
 * and refuses any other repository or path.
 */
export function gbFileUrl(meta: GbMeta, iso3: string, adm: string): string | null {
  const raw = clean(meta.simplifiedGeometryGeoJSON || meta.gjDownloadURL, 600);
  const file = `releaseData/gbOpen/${iso3}/${adm}/[A-Za-z0-9_.-]+\\.geojson`;
  const ref = '([A-Za-z0-9._-]{1,64})';
  const forms = [
    new RegExp(`^https://github\\.com/wmgeolab/geoBoundaries/raw/${ref}/(${file})$`),
    new RegExp(`^https://raw\\.githubusercontent\\.com/wmgeolab/geoBoundaries/${ref}/(${file})$`),
    new RegExp(`^https://media\\.githubusercontent\\.com/media/wmgeolab/geoBoundaries/${ref}/(${file})$`),
  ];
  for (const re of forms) {
    const m = re.exec(raw);
    if (m && !m[1]!.includes('..')) return `https://media.githubusercontent.com/media/wmgeolab/geoBoundaries/${m[1]}/${m[2]}`;
  }
  return null;
}

type Feature = { type?: string; properties?: Record<string, unknown> | null; geometry?: { type: string; coordinates?: unknown } | null };

/** Read a GeoJSON FeatureCollection, or say why not. */
function readCollection(text: string): Feature[] | { error: string } {
  if (/^\s*version https:\/\/git-lfs/.test(text.slice(0, 200))) return { error: 'The file host returned a Git LFS pointer, not the shapes' };
  let j: unknown;
  try { j = JSON.parse(text); } catch { return { error: 'The file is not valid JSON' }; }
  const o = j as { type?: string; features?: Feature[]; crs?: { properties?: { name?: string } } };
  const crs = o.crs?.properties?.name;
  if (crs && !/CRS84|EPSG:?:?4326/i.test(crs)) return { error: `The file is in ${crs}: districts must be in longitude/latitude (WGS 84)` };
  if (o.type !== 'FeatureCollection' || !Array.isArray(o.features)) return { error: 'Expected a GeoJSON FeatureCollection (the geoBoundaries .geojson file)' };
  return o.features;
}

/** Bounding extent in degrees of the features' coordinates (to choose how finely to round them). */
function extentOf(feats: Feature[]): number {
  let x0 = 180, y0 = 90, x1 = -180, y1 = -90;
  const walk = (c: unknown): void => {
    if (!Array.isArray(c)) return;
    if (typeof c[0] === 'number') { const [x, y] = c as number[]; if (x! < x0) x0 = x!; if (x! > x1) x1 = x!; if (y! < y0) y0 = y!; if (y! > y1) y1 = y!; return; }
    for (const x of c) walk(x);
  };
  for (const f of feats) walk(f.geometry?.coordinates);
  return Math.max(x1 - x0, y1 - y0);
}

export interface Converted { units: Admin2Unit[]; parents: number; viaVote: number; warnings: string[]; simplified?: Simplification }

/** Districts from a geoBoundaries FeatureCollection, placed in the nation's regions (shared rules: admin2-convert.mjs). */
export async function convertDistricts(iso3: string, text: string, opts: { simplify?: { aboveVertices?: number; targetVertices?: number } } = {}): Promise<Converted | { error: string }> {
  const feats = readCollection(text);
  if ('error' in feats) return feats;
  if (!feats.length) return { error: 'The file holds no districts' };
  if (feats.length > MAX_PACK_UNITS) return { error: `More than ${MAX_PACK_UNITS} districts in one file` };
  const first = await firstLevel(iso3);
  if (!first.provinces.length) return { error: 'The map has no regions for this nation to place districts in' };
  const digits = extentOf(feats) < 5 ? 5 : 4;
  const warnings: string[] = [];
  let skipped = 0;
  const items: { geometry: Geom; name: unknown; iso: unknown; label: [number, number] }[] = [];
  for (const f of feats) {
    const rounded = roundGeometry(f.geometry, digits);
    if (!rounded) { skipped++; continue; }
    const geometry = rewind(rounded);
    const p = f.properties ?? {};
    items.push({ geometry, name: clean(p.shapeName ?? p.name ?? p.NAME, 120), iso: clean(p.shapeISO ?? p.iso_3166_2, 20), label: labelPoint(geometry) });
  }
  if (skipped) warnings.push(`${skipped} feature${skipped === 1 ? ' was' : 's were'} not an area in longitude/latitude and ${skipped === 1 ? 'was' : 'were'} left out`);
  if (!items.length) return { error: 'No district in the file is an area in longitude/latitude' };
  // Large nations' districts are simplified on shared borders (lib/geo/boundary-simplify.ts), as uploaded boundaries are.
  const asFeatures = items.map(it => ({ type: 'Feature' as const, properties: {}, geometry: it.geometry }));
  const vertices = countVertices(asFeatures as never);
  let simplified: Simplification | undefined;
  if (needsSimplifying(vertices, text.length, opts.simplify)) {
    const r = simplifyFeatures(asFeatures as never, opts.simplify?.targetVertices);
    simplified = r.info;
    r.features.forEach((f, i) => { const g = (f as { geometry?: Geom }).geometry; if (g && items[i]) { items[i]!.geometry = g; items[i]!.label = labelPoint(g); } });
    warnings.push(`Simplified on the server keeping shared borders: ${r.info.verticesBefore.toLocaleString('en')} points to ${r.info.verticesAfter.toLocaleString('en')}`);
  }
  const { units, viaVote, crossing } = assignUnits(items, parentFinder(first.provinces), iso3, digits - 1);
  const parents = units.filter(u => u.parent).length;
  if (!parents) return { error: 'None of the districts lies in the nation’s regions as the map draws them: is the file for this nation?' };
  if (parents < units.length) warnings.push(`${units.length - parents} district${units.length - parents === 1 ? ' lies' : 's lie'} outside every region and cannot be opened from one`);
  if (viaVote) warnings.push(`${viaVote} district${viaVote === 1 ? ' was' : 's were'} placed by where most of ${viaVote === 1 ? 'its' : 'their'} outline lies (label point outside every region)`);
  if (crossing.length) warnings.push(`${crossing.length} district${crossing.length === 1 ? ' lies' : 's lie'} across region borders: ${crossing.slice(0, 6).join('; ')}${crossing.length > 6 ? '…' : ''}`);
  return { units: units as Admin2Unit[], parents, viaVote, warnings, ...(simplified ? { simplified } : {}) };
}

function record(iso3: string, c: Converted, meta: { adm: string; credit: BoundaryCredit; boundaryId?: string; method: DistrictPack['method']; url?: string; fileSha256: string }, by: string): DistrictPack {
  const p: DistrictPack = {
    iso3, adm: meta.adm, units: c.units, credit: meta.credit, installedAt: now(), installedBy: by,
    ...(meta.boundaryId ? { boundaryId: meta.boundaryId } : {}), method: meta.method, ...(meta.url ? { url: meta.url } : {}),
    sha256: sha(JSON.stringify(c.units)), fileSha256: meta.fileSha256, parents: c.parents, viaVote: c.viaVote, warnings: c.warnings,
  };
  const d = db();
  d.installed[iso3] = p;
  d.history.push({ at: p.installedAt, by, action: 'install', iso3, method: p.method, adm: p.adm, units: p.units.length, sha256: p.sha256, source: p.credit.source, licence: p.credit.licence });
  recordAudit(by, 'map-pack.install', `MapPack:${iso3}:districts`, 'ok',
    `${p.method === 'download' ? 'downloaded from geoBoundaries' : 'uploaded file'}: ${p.adm}, ${p.units.length} districts (${p.parents} placed in a region), ${p.credit.source} (${p.credit.licence}${p.credit.year ? `, ${p.credit.year}` : ''}), sha256 ${p.sha256.slice(0, 12)}`);
  return p;
}

const summary = (p: DistrictPack): DistrictPackSummary => { const { units, ...rest } = p; return { ...structuredClone(rest), unitCount: units.length }; };

const creditOf = (meta: GbMeta, via = 'geoBoundaries'): BoundaryCredit => ({
  source: clean(meta.boundarySource, 200) || 'geoBoundaries',
  licence: clean(meta.boundaryLicense, 120),
  year: clean(meta.boundaryYearRepresented ?? meta.boundaryYear, 10),
  via,
});

/**
 * Download the nation's districts from geoBoundaries gbOpen and install them.
 * The level is the first one below the map's regions that is clearly finer
 * than them (as the build script chooses), unless `adm` names one.
 */
export async function installDistrictsFromGeoBoundaries(by: string, opts: { adm?: string } & FetchDeps = {}): Promise<DistrictPackSummary | { error: string }> {
  const iso3 = nationIso3();
  if (!iso3) return { error: 'Set the nation in setup first: districts belong to a nation' };
  if (!by.trim()) return { error: 'Name the official installing the districts' };
  const forced = opts.adm ? clean(opts.adm, 4).toUpperCase() : '';
  if (forced && !/^ADM[2-5]$/.test(forced)) return { error: 'The level must be ADM2 to ADM5' };
  const first = await firstLevel(iso3);
  if (!first.provinces.length) return { error: 'The map has no regions for this nation to place districts in' };
  const deps = { ...(opts.fetch ? { fetch: opts.fetch } : {}), ...(opts.resolve ? { resolve: opts.resolve } : {}) };

  const tried: string[] = [];
  let chosen: { adm: string; meta: GbMeta } | null = null;
  for (const adm of forced ? [forced] : levelsBelow(first.adm)) {
    let meta: GbMeta;
    try {
      const r = await safeFetchText(`${GB_API}/${iso3}/${adm}/`, { ...deps, allow: u => u.protocol === 'https:' && u.host === 'www.geoboundaries.org', accept: 'application/json', maxBytes: 200_000, timeoutMs: 20_000, redirects: 2 });
      meta = JSON.parse(r.text) as GbMeta;
    } catch (e) { tried.push(`${adm}: ${(e as Error).message}`); continue; }
    if (!meta || typeof meta !== 'object' || (meta.boundaryISO && meta.boundaryISO !== iso3)) { tried.push(`${adm}: no release for ${iso3}`); continue; }
    const count = Number(meta.admUnitCount);
    if (!forced && Number.isFinite(count) && !finerThan(count, first.provinces.length)) { tried.push(`${adm}: ${count} units, not finer than the map's ${first.provinces.length} regions`); continue; }
    chosen = { adm, meta }; break;
  }
  if (!chosen) return { error: `geoBoundaries has no district level for ${iso3} (${tried.join('; ') || 'nothing found'})` };
  const refused = licenceRefusal(chosen.meta);
  if (refused) return { error: `geoBoundaries ${chosen.adm} for ${iso3} cannot be installed: ${refused}` };
  const url = gbFileUrl(chosen.meta, iso3, chosen.adm);
  if (!url) return { error: 'geoBoundaries named a download address outside its own repository: refused' };

  let text: string;
  try {
    text = (await safeFetchText(url, { ...deps, allow: u => u.protocol === 'https:' && u.host === 'media.githubusercontent.com' && u.pathname.startsWith('/media/wmgeolab/geoBoundaries/'), maxBytes: MAX_PACK_BYTES, timeoutMs: 120_000, redirects: 2 })).text;
  } catch (e) { return { error: `The district file could not be downloaded: ${(e as Error).message}` }; }
  const c = await convertDistricts(iso3, text);
  if ('error' in c) return c;
  return summary(record(iso3, c, { adm: chosen.adm, credit: creditOf(chosen.meta), ...(chosen.meta.boundaryID ? { boundaryId: clean(chosen.meta.boundaryID, 80) } : {}), method: 'download', url, fileSha256: sha(text) }, by.trim()));
}

export interface UploadInput {
  /** The geoBoundaries GeoJSON file (…-ADM2.geojson or …_simplified.geojson). */
  text: string;
  /** The release's metadata file (…-metaData.json from the same download), when at hand. */
  metaText?: string;
  /** Otherwise: who published the shapes, under which licence, which year, which level. */
  source?: string;
  licence?: string;
  year?: string;
  adm?: string;
}

/** Install the nation's districts from an uploaded geoBoundaries file (offline or air-gapped installations). */
export async function installDistrictsFromFile(input: UploadInput, by: string): Promise<DistrictPackSummary | { error: string }> {
  const iso3 = nationIso3();
  if (!iso3) return { error: 'Set the nation in setup first: districts belong to a nation' };
  if (!by.trim()) return { error: 'Name the official installing the districts' };
  if (!input.text) return { error: 'Attach the geoBoundaries GeoJSON file' };
  if (input.text.length > MAX_PACK_BYTES) return { error: `The file is larger than ${MAX_PACK_BYTES / 1_000_000} MB: use the simplified file` };
  let meta: GbMeta;
  if (input.metaText) {
    try { meta = JSON.parse(input.metaText) as GbMeta; } catch { return { error: 'The metadata file is not valid JSON' }; }
    if (meta.boundaryISO && meta.boundaryISO !== iso3) return { error: `The metadata is for ${clean(meta.boundaryISO, 3)}, not ${iso3}` };
  } else {
    meta = { boundarySource: clean(input.source), boundaryLicense: clean(input.licence, 120), boundaryYearRepresented: clean(input.year, 10), boundaryType: clean(input.adm, 4).toUpperCase() };
    if (!meta.boundarySource) return { error: 'Name who published the shapes (from the geoBoundaries metadata), or attach the metadata file' };
    if (!meta.boundaryLicense) return { error: 'Record the licence the shapes are published under, or attach the metadata file' };
  }
  const refused = licenceRefusal(meta);
  if (refused) return { error: `These districts cannot be installed: ${refused}` };
  const adm = clean(meta.boundaryType, 4).toUpperCase();
  const c = await convertDistricts(iso3, input.text);
  if ('error' in c) return c;
  return summary(record(iso3, c, { adm: /^ADM[2-5]$/.test(adm) ? adm : 'ADM2', credit: creditOf(meta), ...(meta.boundaryID ? { boundaryId: clean(meta.boundaryID, 80) } : {}), method: 'upload', fileSha256: sha(input.text) }, by.trim()));
}

/** Remove the installed districts: maps return to the bundled districts, or to none. Kept in the history. */
export function removeInstalledDistricts(by: string, reason?: string): { removed: DistrictPackSummary } | { error: string } {
  const iso3 = nationIso3();
  if (!iso3) return { error: 'Set the nation in setup first' };
  if (!by.trim()) return { error: 'Name the official removing the districts' };
  const d = db();
  const p = d.installed[iso3];
  if (!p) return { error: 'No districts are installed for this nation' };
  const why = clean(reason, 400);
  delete d.installed[iso3];
  d.history.push({ at: now(), by: by.trim(), action: 'remove', iso3, adm: p.adm, units: p.units.length, sha256: p.sha256, ...(why ? { reason: why } : {}) });
  recordAudit(by.trim(), 'map-pack.remove', `MapPack:${iso3}:districts`, 'ok', `${p.units.length} districts (${p.credit.source}, sha256 ${p.sha256.slice(0, 12)}) removed; maps return to ${Object.prototype.hasOwnProperty.call(ADMIN2, iso3) ? 'the bundled districts' : 'regions only'}${why ? `: ${why}` : ''}`);
  return { removed: summary(p) };
}

export interface DistrictPackStatus {
  iso3: string | null;
  /** Districts bundled with the platform for this nation. */
  bundled: (BoundaryCredit & { adm: string; units: number }) | null;
  installed: DistrictPackSummary | null;
  /** The nation's mapping authority has published its own districts, which maps draw first. */
  ownPublished: boolean;
  /** Which districts maps draw now. */
  drawn: 'own' | 'installed' | 'bundled' | 'none';
  history: PackEvent[];
  hosts: readonly string[];
  maxBytes: number;
}

export async function districtPackStatus(): Promise<DistrictPackStatus> {
  const iso3 = nationIso3() ?? null;
  const e = iso3 && Object.prototype.hasOwnProperty.call(ADMIN2, iso3) ? ADMIN2[iso3]! : null;
  const p = iso3 ? db().installed[iso3] : undefined;
  const ownPublished = iso3 ? !!(await activeBoundary(iso3, 2)) : false;
  return {
    iso3,
    bundled: e ? { source: e.source, licence: e.licence, year: e.year, via: e.via ?? 'geoBoundaries', adm: e.adm, units: e.units } : null,
    installed: p ? summary(p) : null,
    ownPublished,
    drawn: ownPublished ? 'own' : p ? 'installed' : e ? 'bundled' : 'none',
    history: db().history.filter(h => h.iso3 === iso3).slice(-20).reverse(),
    hosts: GB_HOSTS,
    maxBytes: MAX_PACK_BYTES,
  };
}

/** The installed districts for the public read (maps): the summary, every district, or one region's. */
export function installedForMaps(iso3: string, shapes: boolean, parent?: string): InstalledDistrictsLike | Omit<InstalledDistrictsLike, 'units'> & { units: number } | null {
  if (iso3 !== nationIso3()) return null;
  const p = db().installed[iso3];
  if (!p) return null;
  const base = { iso3: p.iso3, adm: p.adm, credit: p.credit, installedAt: p.installedAt };
  if (!shapes) return { ...base, units: p.units.length };
  return { ...base, units: parent ? p.units.filter(u => u.parent === parent) : p.units };
}
