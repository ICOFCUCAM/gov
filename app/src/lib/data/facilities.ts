// The national facility register (map plan phase 4a, docs/FACILITY_REGISTER_REVIEW.md).
// Every physical site of the nation — schools, health facilities, police
// stations, power stations, airports, border posts, government offices — is
// recorded once, by the institution that owns it, with its longitude and
// latitude, so it stands on the national map.
//
// The nation decides the rules (its facility policy, changed four-eyes by
// administrators):
// - who certifies a site's location: the owning institution, the national
//   mapping agency, or both in turn;
// - who sets each category's sensitivity, and under which law: the owning
//   institution, the mapping agency, a security council, the interior
//   ministry, the data-protection authority, the cabinet or another body it
//   names;
// - which ways of capturing a position it accepts (on-site phone capture,
//   survey-grade GNSS, existing survey data, map pin, typed coordinates,
//   national gazetteer, cadastre, imagery, photo geotags, connected systems,
//   open-data candidates, SMS reports).
//
// A site is proposed by one official and published by another; every change
// is a new version (nothing is deleted); every step goes to the audit chain.
// Each position is checked: inside the territory, inside the region it names,
// duplicates nearby. Its region and district are worked out from the map,
// never typed. Restricted sites show their exact position only to officials
// of the owning institution and the whole government; everyone else sees it
// generalised. Confidential categories stay outside the civilian register.
// Held in platform state (lib/data/persist.ts).

import { createHash, randomBytes, randomUUID, timingSafeEqual } from 'node:crypto';
import { geoContains, geoDistance } from 'd3-geo';
import { getMinistry, listMinistries, recordAudit } from '@/lib/data/store';
import { nationIso3, nationRegions } from '@/lib/nation/registry';
import { loadDistricts, loadNationGeography } from '@/lib/map/geography';
import { parseCsv } from '@/lib/twin/csv';
import { upsertFacilityEntity } from '@/lib/twin/register';
import { safeFetchText } from '@/lib/net/safe-fetch';
import { uuid7 } from './uuid7';
import { facilityRepo } from '@/lib/data/repo';
import { readCrs, toWgs84, type SourceCrs } from '@/lib/geo/crs';
import { kinksOf } from '@/lib/geo/topology';
import { categoryFromOsm } from './facility-standards';
import type { Geom } from '@/lib/geo/admin1';

// ── Vocabulary ────────────────────────────────────────────────────────────

export type Sensitivity = 'public' | 'restricted' | 'confidential';
export type FacilityStatus = 'planned' | 'under-construction' | 'operational' | 'partial' | 'closed' | 'decommissioned';
export type CertificationMode = 'institution' | 'mapping-agency' | 'both';
export type CertStage = 'institution' | 'mapping-agency';
export type SensitivityAuthority = 'owning-institution' | 'mapping-agency' | 'security-council' | 'interior' | 'data-protection' | 'cabinet' | 'other';
export type CaptureMethod =
  | 'gnss-survey' | 'device-gps' | 'photo-geotag' | 'map-pin' | 'typed' | 'national-grid' | 'gazetteer'
  | 'cadastre' | 'imagery' | 'survey-import' | 'system-feed' | 'open-data' | 'sms-report';

export interface FacilityCategory {
  key: string; label: string; glyph: string;
  /** The identifier scheme the sector uses, kept with each site. */
  scheme: string;
  /** Sites of this category closer than this are flagged as a possible duplicate. */
  duplicateMetres: number;
  /** The platform's suggestion; the nation's policy decides. */
  suggestedSensitivity: Sensitivity;
}

export const FACILITY_CATEGORIES: FacilityCategory[] = [
  { key: 'health', label: 'Health facility', glyph: '✚', scheme: 'Master Facility List code', duplicateMetres: 150, suggestedSensitivity: 'public' },
  { key: 'school', label: 'School', glyph: '✎', scheme: 'Education (EMIS) school code', duplicateMetres: 100, suggestedSensitivity: 'public' },
  { key: 'police', label: 'Police station', glyph: '⛨', scheme: 'National station code', duplicateMetres: 200, suggestedSensitivity: 'restricted' },
  { key: 'fire-rescue', label: 'Fire and rescue station', glyph: '✹', scheme: 'Station code', duplicateMetres: 200, suggestedSensitivity: 'public' },
  { key: 'court', label: 'Court', glyph: '⚖', scheme: 'Judiciary court code', duplicateMetres: 150, suggestedSensitivity: 'public' },
  { key: 'prison', label: 'Prison', glyph: '▥', scheme: 'Correctional facility code', duplicateMetres: 300, suggestedSensitivity: 'restricted' },
  { key: 'government-office', label: 'Government office', glyph: '⌂', scheme: 'Organisation registry id', duplicateMetres: 100, suggestedSensitivity: 'public' },
  { key: 'power', label: 'Power station or substation', glyph: '⚡', scheme: 'Regulator or grid-operator code', duplicateMetres: 500, suggestedSensitivity: 'restricted' },
  { key: 'water', label: 'Water and sanitation works', glyph: '◑', scheme: 'Utility asset code', duplicateMetres: 300, suggestedSensitivity: 'restricted' },
  { key: 'telecom', label: 'Telecom site or data centre', glyph: '◬', scheme: 'Regulator licence or site id', duplicateMetres: 300, suggestedSensitivity: 'restricted' },
  { key: 'airport', label: 'Airport or airfield', glyph: '✈', scheme: 'ICAO code', duplicateMetres: 2000, suggestedSensitivity: 'public' },
  { key: 'port', label: 'Seaport or inland port', glyph: '⚓', scheme: 'UN/LOCODE', duplicateMetres: 1500, suggestedSensitivity: 'public' },
  { key: 'border-post', label: 'Border post', glyph: '⛬', scheme: 'UN/LOCODE or national code', duplicateMetres: 500, suggestedSensitivity: 'restricted' },
  { key: 'logistics', label: 'Depot or logistics hub', glyph: '▣', scheme: 'Asset code', duplicateMetres: 300, suggestedSensitivity: 'public' },
  { key: 'shelter', label: 'Emergency shelter', glyph: '⌂', scheme: 'Disaster-management site code', duplicateMetres: 150, suggestedSensitivity: 'public' },
  { key: 'market', label: 'Market', glyph: '◇', scheme: 'Local authority code', duplicateMetres: 150, suggestedSensitivity: 'public' },
  { key: 'defence', label: 'Defence site', glyph: '◈', scheme: 'Defence estate code', duplicateMetres: 500, suggestedSensitivity: 'confidential' },
];
export const categoryOf = (key: string) => FACILITY_CATEGORIES.find(c => c.key === key);

export const CAPTURE_METHODS: { key: CaptureMethod; label: string; how: string; typicalAccuracyM: number }[] = [
  { key: 'gnss-survey', label: 'Survey-grade GNSS', how: 'A surveyor\'s receiver on site; its file is imported (CSV or GPX).', typicalAccuracyM: 1 },
  { key: 'device-gps', label: 'Phone on site', how: 'The field capture page on an official\'s phone reads its GPS, also offline; sent when back online.', typicalAccuracyM: 10 },
  { key: 'photo-geotag', label: 'Geotagged photo', how: 'A photo taken on site; its position is read from the picture.', typicalAccuracyM: 15 },
  { key: 'map-pin', label: 'Pin on the map', how: 'An official places the site on the national map.', typicalAccuracyM: 100 },
  { key: 'typed', label: 'Typed coordinates', how: 'Decimal degrees or degrees-minutes-seconds from a record.', typicalAccuracyM: 30 },
  { key: 'national-grid', label: 'National grid', how: 'Easting and northing on the national grid (its EPSG code or .prj declared), converted to longitude/latitude on the server; the system and transformation are kept.', typicalAccuracyM: 5 },
  { key: 'gazetteer', label: 'National gazetteer', how: 'A named place or address matched in the nation\'s own gazetteer (low accuracy).', typicalAccuracyM: 1000 },
  { key: 'cadastre', label: 'Land registry parcel', how: 'The parcel the site stands on, from the cadastre.', typicalAccuracyM: 20 },
  { key: 'imagery', label: 'Digitised from imagery', how: 'The mapping agency marks the site on aerial or satellite imagery.', typicalAccuracyM: 5 },
  { key: 'survey-import', label: 'Existing survey data', how: 'A census, facility survey or earlier register loaded as a file.', typicalAccuracyM: 50 },
  { key: 'system-feed', label: 'Connected ministry system', how: 'The ministry\'s own system of record (e.g. health or school registry) sends its sites.', typicalAccuracyM: 50 },
  { key: 'open-data', label: 'Open data candidate', how: 'Open datasets offer candidates; an official confirms each one.', typicalAccuracyM: 100 },
  { key: 'sms-report', label: 'SMS from the field', how: 'A field officer without a smartphone texts the coordinates (needs an SMS gateway).', typicalAccuracyM: 30 },
];
export const isCaptureMethod = (v: unknown): v is CaptureMethod => CAPTURE_METHODS.some(m => m.key === v);

export const SENSITIVITY_AUTHORITIES: { key: SensitivityAuthority; label: string }[] = [
  { key: 'owning-institution', label: 'The institution that owns the site' },
  { key: 'mapping-agency', label: 'The national mapping agency' },
  { key: 'security-council', label: 'The national security council' },
  { key: 'interior', label: 'The ministry responsible for internal security' },
  { key: 'data-protection', label: 'The data-protection authority' },
  { key: 'cabinet', label: 'The cabinet' },
  { key: 'other', label: 'Another body the nation names' },
];
export const STATUSES: FacilityStatus[] = ['planned', 'under-construction', 'operational', 'partial', 'closed', 'decommissioned'];

// ── Policy ────────────────────────────────────────────────────────────────

export interface SensitivityRule {
  level: Sensitivity;
  authority: SensitivityAuthority;
  /** The body's name when the authority is "other", or its formal name. */
  body?: string;
  /** The law or instrument the decision rests on, e.g. "Critical Infrastructure Protection Act 2019, s.12". */
  legalBasis?: string;
}

export interface FacilityPolicy {
  certification: CertificationMode;
  /** The institution (registry id) acting as national mapping agency. */
  mappingAgencyId?: string;
  /** Capture methods the nation accepts. */
  methods: CaptureMethod[];
  /** Sensitivity by category; categories not listed use the platform's suggestion, decided by the owning institution. */
  sensitivity: Record<string, SensitivityRule>;
  /** Grid size (degrees) restricted sites are generalised to for viewers without need. */
  generaliseDegrees: number;
  version: number;
  decidedBy?: string[];
  decidedAt?: string;
}

export interface PolicyChange {
  id: string;
  patch: Partial<Pick<FacilityPolicy, 'certification' | 'mappingAgencyId' | 'methods' | 'sensitivity' | 'generaliseDegrees'>>;
  reason: string;
  proposedBy: string;
  proposedAt: string;
  state: 'pending' | 'confirmed' | 'withdrawn';
  decidedBy?: string;
  decidedAt?: string;
  /** The policy version the change was made against; it is refused over a newer one. */
  baseVersion: number;
}

// ── Sites ─────────────────────────────────────────────────────────────────

export interface FacilityLocation {
  lng: number; lat: number;
  accuracyM?: number;
  method: CaptureMethod;
  capturedAt?: string;
  capturedBy?: string;
  /** What the position was given in before conversion (e.g. "EPSG:21037 easting 257000 northing 9857000"). */
  original?: string;
  /** The national grid or other system the position was given in, and the exact transformation to WGS 84 (lib/geo/crs.ts). */
  sourceCrs?: FacilitySourceCrs;
}

export interface FacilitySourceCrs { name: string; epsg?: number; transformation: string; x: number; y: number }

export interface FacilityVersion {
  n: number;
  at: string;
  by: string;
  what: string;
  name: string;
  category: string;
  status: FacilityStatus;
  location: FacilityLocation;
  sensitivity: Sensitivity;
}

export interface CertStamp { stage: CertStage; decision: 'certified' | 'rejected'; by: string; at: string; note?: string }

export interface Facility {
  id: string;
  name: string;
  localName?: string;
  category: string;
  ownerId: string;
  operator?: string;
  ids: Record<string, string>;
  status: FacilityStatus;
  sensitivity: Sensitivity;
  location: FacilityLocation;
  /** Worked out from the map when the site is proposed or moved. */
  place: { regionCode?: string; region?: string; districtCode?: string; district?: string; inside: boolean };
  state: 'proposed' | 'published' | 'withdrawn';
  proposedBy: string;
  proposedAt: string;
  publishedBy?: string;
  publishedAt?: string;
  /** Location certification under the nation's policy at the time it was published. */
  certification: { required: CertStage[]; stamps: CertStamp[]; state: 'awaiting' | 'certified' | 'rejected' };
  source: { kind: 'form' | 'field' | 'import' | 'feed' | 'candidate'; importId?: string; sha256?: string; feedId?: string; ref?: string; candidateId?: string };
  /** A move or change waiting for a second official. */
  pendingVersion?: FacilityVersion & { reason?: string };
  /** 3D readiness (optional): the building's outline on the ground (GeoJSON Polygon, longitude/latitude, wound anticlockwise), its height in metres and its storeys above ground. */
  footprint?: FootprintPolygon;
  heightM?: number;
  levels?: number;
  versions: FacilityVersion[];
  note?: string;
}

export interface FootprintPolygon { type: 'Polygon'; coordinates: number[][][] }

export interface FacilityImport {
  id: string; ministryId: string; by: string; at: string; format: 'csv' | 'geojson' | 'gpx';
  sha256: string; rows: number; accepted: number; refused: { row: number; reason: string }[]; facilityIds: string[];
  /** The coordinate system the file declared, when not WGS 84 longitude/latitude, and the transformation applied. */
  crs?: { name: string; epsg?: number; transformation: string };
}

interface Db { facilities: Facility[]; policy: FacilityPolicy; changes: PolicyChange[]; imports: FacilityImport[]; seq: number }

const DEFAULT_POLICY: FacilityPolicy = {
  certification: 'institution',
  methods: CAPTURE_METHODS.map(m => m.key).filter(m => m !== 'sms-report'),
  sensitivity: {},
  generaliseDegrees: 0.05,
  version: 1,
};

const g = globalThis as unknown as { __civicosFacilities?: Db };
const upgraded = new WeakSet<Db>();
const db = (): Db => {
  const d = (g.__civicosFacilities ??= { facilities: [], policy: { ...DEFAULT_POLICY }, changes: [], imports: [], seq: 1 });
  if (upgraded.has(d)) return d;
  d.changes ??= []; d.imports ??= []; d.policy ??= { ...DEFAULT_POLICY };
  d.policy.methods ??= DEFAULT_POLICY.methods; d.policy.sensitivity ??= {}; d.policy.generaliseDegrees ??= DEFAULT_POLICY.generaliseDegrees;
  // Snapshots saved before national FacilityIDs: published sites get theirs, timed at publication.
  for (const f of d.facilities ?? []) if (f.state !== 'proposed' && f.publishedAt && !f.ids?.[NATIONAL_ID]) f.ids = { ...(f.ids ?? {}), [NATIONAL_ID]: uuid7(Date.parse(f.publishedAt) || Date.now()) };
  upgraded.add(d);
  return d;
};

/**
 * The opaque national FacilityID (data dictionary §1), kept in the site's
 * identifiers under this key: a UUID v7 minted when the site is first
 * published, never reused or changed, and safe to show even for restricted
 * sites. `FAC-00012` stays the display and legacy id.
 */
export const NATIONAL_ID = 'national';
export const nationalId = (f: Pick<Facility, 'ids'>): string | undefined => f.ids?.[NATIONAL_ID];
/** Site records change through the persistence port (lib/data/repo): memory, or written through to Postgres. */
const repo = () => facilityRepo(db);
export function resetFacilities(): void { g.__civicosFacilities = undefined; gi.__facilityGrid = undefined; }

// ── Spatial index ─────────────────────────────────────────────────────────
// A grid of cells of GRID degrees (about 1 km) keyed by floor(lng/GRID),
// floor(lat/GRID), and an index of identifiers, kept beside facilities[] so
// duplicate checks and bbox queries read the few cells around a position
// instead of every site (a national load of 20k schools was O(n²)). The index
// is derived, never persisted: it is rebuilt whenever the facilities array is
// not the one it was built from (a snapshot restored by lib/data/persist.ts,
// a reset) or its length differs; proposals, moves and new identifiers update
// it in place.

export const GRID = 0.01;
interface GridIndex { ref: Facility[]; count: number; cells: Map<string, Facility[]>; cellOf: Map<string, string>; ids: Map<string, Facility[]>; order: Map<string, number> }
const gi = globalThis as unknown as { __facilityGrid?: GridIndex };
const cellKey = (lng: number, lat: number) => `${Math.floor(lng / GRID)},${Math.floor(lat / GRID)}`;
const idKey = (k: string, v: string) => `${k}\u0000${v}`;

function gridAdd(ix: GridIndex, f: Facility): void {
  const c = cellKey(f.location.lng, f.location.lat);
  (ix.cells.get(c) ?? ix.cells.set(c, []).get(c)!).push(f);
  ix.cellOf.set(f.id, c);
  if (!ix.order.has(f.id)) ix.order.set(f.id, ix.order.size);
  for (const [k, v] of Object.entries(f.ids)) if (v) { const key = idKey(k, v); const a = ix.ids.get(key) ?? ix.ids.set(key, []).get(key)!; if (!a.includes(f)) a.push(f); }
}

/** The index for the facilities as they stand: rebuilt after a restore or reset. */
function grid(): GridIndex {
  const list = db().facilities;
  let ix = gi.__facilityGrid;
  if (!ix || ix.ref !== list || ix.count !== list.length) {
    ix = { ref: list, count: 0, cells: new Map(), cellOf: new Map(), ids: new Map(), order: new Map() };
    for (const f of list) gridAdd(ix, f);
    ix.count = list.length;
    gi.__facilityGrid = ix;
  }
  return ix;
}

/** Record a new site in the index (after it is pushed to facilities[]). */
function gridInsert(f: Facility): void {
  const list = db().facilities, ix = gi.__facilityGrid;
  if (ix && ix.ref === list && ix.count === list.length - 1 && list[list.length - 1] === f) { gridAdd(ix, f); ix.count = list.length; return; }
  grid();
}

/** A site's position or identifiers changed: re-file it. */
function gridUpdate(f: Facility): void {
  const ix = grid();
  const old = ix.cellOf.get(f.id);
  if (old) { const a = ix.cells.get(old); if (a) { const i = a.indexOf(f); if (i >= 0) a.splice(i, 1); if (!a.length) ix.cells.delete(old); } }
  gridAdd(ix, f);
}

/** Sites whose cell lies within `metres` of a position (a superset; callers measure exactly), in register order. */
export function sitesNear(lng: number, lat: number, metres: number, category?: string): Facility[] {
  const ix = grid();
  const dLat = metres / 111_000 + GRID;
  const dLng = metres / (111_000 * Math.max(0.01, Math.cos((Math.min(89, Math.abs(lat)) * Math.PI) / 180))) + GRID;
  return sitesInCells([lng - dLng, lat - dLat, lng + dLng, lat + dLat], ix, category);
}

function sitesInCells(b: [number, number, number, number], ix = grid(), category?: string): Facility[] {
  const [x0, y0, x1, y1] = [Math.floor(b[0] / GRID), Math.floor(b[1] / GRID), Math.floor(b[2] / GRID), Math.floor(b[3] / GRID)];
  const out: Facility[] = [];
  const take = (a: Facility[]) => { for (const f of a) if (!category || f.category === category) out.push(f); };
  if ((x1 - x0 + 1) * (y1 - y0 + 1) > ix.cells.size) {
    // A box wider than the occupied cells: walk the cells instead of the box.
    for (const [k, a] of ix.cells) { const c = k.indexOf(','); const x = Number(k.slice(0, c)), y = Number(k.slice(c + 1)); if (x >= x0 && x <= x1 && y >= y0 && y <= y1) take(a); }
  } else {
    for (let x = x0; x <= x1; x++) for (let y = y0; y <= y1; y++) { const a = ix.cells.get(`${x},${y}`); if (a) take(a); }
  }
  return out.sort((p, q) => ix.order.get(p.id)! - ix.order.get(q.id)!);
}

/** Sites carrying any of these identifiers (scheme → value), in register order. */
function sitesWithIds(ids: Record<string, string>): Facility[] {
  const ix = grid();
  const out = new Set<Facility>();
  for (const [k, v] of Object.entries(ids)) if (v) for (const f of ix.ids.get(idKey(k, v)) ?? []) if (f.ids[k] === v) out.add(f);
  return [...out].sort((p, q) => ix.order.get(p.id)! - ix.order.get(q.id)!);
}

const now = () => new Date().toISOString();
const clean = (s: unknown, max = 160) => String(s ?? '').replace(/[\u0000-\u001f]/g, ' ').trim().slice(0, max);

export function facilityPolicy(): FacilityPolicy { return structuredClone(db().policy); }
export function policyChanges(): PolicyChange[] { return db().changes.map(c => structuredClone(c)); }

/** The rule that applies to a category: the nation's, or the platform's suggestion decided by the owning institution. */
export function sensitivityRule(category: string): SensitivityRule {
  return db().policy.sensitivity[category] ?? { level: categoryOf(category)?.suggestedSensitivity ?? 'public', authority: 'owning-institution' };
}

/** An administrator proposes a change to the nation's facility policy; a different administrator confirms it. */
export function proposePolicyChange(input: { patch?: PolicyChange['patch']; reason?: string }, by: string): PolicyChange | { error: string } {
  if (!by.trim()) return { error: 'Name the official proposing the change' };
  const reason = clean(input.reason, 400);
  if (!reason) return { error: 'Say why the policy should change' };
  const p = input.patch ?? {};
  const out: PolicyChange['patch'] = {};
  if (p.certification !== undefined) {
    if (!['institution', 'mapping-agency', 'both'].includes(p.certification)) return { error: 'Certification is by the institution, the mapping agency, or both' };
    out.certification = p.certification;
  }
  if (p.mappingAgencyId !== undefined) {
    if (p.mappingAgencyId && !getMinistry(p.mappingAgencyId)) return { error: 'The mapping agency must be an institution in the registry' };
    out.mappingAgencyId = p.mappingAgencyId || undefined;
  }
  const cert = out.certification ?? db().policy.certification;
  const agency = 'mappingAgencyId' in out ? out.mappingAgencyId : db().policy.mappingAgencyId;
  if (cert !== 'institution' && !agency) return { error: 'Name the institution that acts as the national mapping agency first' };
  if (p.methods !== undefined) {
    if (!Array.isArray(p.methods) || !p.methods.length || p.methods.some(m => !isCaptureMethod(m))) return { error: 'Choose at least one way of capturing a position' };
    out.methods = [...new Set(p.methods)];
  }
  if (p.sensitivity !== undefined) {
    const s: Record<string, SensitivityRule> = {};
    for (const [k, r] of Object.entries(p.sensitivity ?? {})) {
      if (!categoryOf(k)) return { error: `Unknown category "${k}"` };
      if (!['public', 'restricted', 'confidential'].includes(r?.level)) return { error: `Sensitivity for ${k} must be public, restricted or confidential` };
      if (!SENSITIVITY_AUTHORITIES.some(a => a.key === r.authority)) return { error: `Say which body decides the sensitivity of ${k}` };
      if (r.authority === 'other' && !clean(r.body)) return { error: `Name the body that decides the sensitivity of ${k}` };
      if (r.level !== 'public' && !clean(r.legalBasis, 300)) return { error: `Cite the law or instrument that makes ${k} ${r.level}` };
      s[k] = { level: r.level, authority: r.authority, ...(clean(r.body) ? { body: clean(r.body) } : {}), ...(clean(r.legalBasis, 300) ? { legalBasis: clean(r.legalBasis, 300) } : {}) };
    }
    out.sensitivity = s;
  }
  if (p.generaliseDegrees !== undefined) {
    if (!Number.isFinite(p.generaliseDegrees) || p.generaliseDegrees < 0.01 || p.generaliseDegrees > 0.5) return { error: 'Generalise restricted sites to between 0.01° and 0.5° (about 1–50 km)' };
    out.generaliseDegrees = p.generaliseDegrees;
  }
  if (!Object.keys(out).length) return { error: 'Nothing to change' };
  const c: PolicyChange = { id: `FPC-${db().seq++}`, patch: out, reason, proposedBy: by.trim(), proposedAt: now(), state: 'pending', baseVersion: db().policy.version };
  db().changes.unshift(c);
  recordAudit(c.proposedBy, 'facility.policy.propose', `FacilityPolicy:${c.id}`, 'ok', `${Object.keys(out).join(', ')} — ${reason}`);
  return structuredClone(c);
}

export function decidePolicyChange(id: string, decision: 'confirm' | 'withdraw', by: string): FacilityPolicy | { error: string } {
  const c = db().changes.find(x => x.id === id);
  if (!c) return { error: 'No such policy change' };
  if (c.state !== 'pending') return { error: `This change is already ${c.state}` };
  if (!by.trim()) return { error: 'Name the official deciding' };
  if (decision === 'withdraw') {
    c.state = 'withdrawn'; c.decidedBy = by.trim(); c.decidedAt = now();
    recordAudit(c.decidedBy, 'facility.policy.withdraw', `FacilityPolicy:${c.id}`, 'ok', '');
    return facilityPolicy();
  }
  if (by.trim() === c.proposedBy) return { error: 'A different administrator must confirm the change' };
  const d = db();
  if (c.baseVersion !== d.policy.version) return { error: 'The policy has changed since this was proposed; propose it again' };
  d.policy = { ...d.policy, ...c.patch, version: d.policy.version + 1, decidedBy: [c.proposedBy, by.trim()], decidedAt: now() };
  c.state = 'confirmed'; c.decidedBy = by.trim(); c.decidedAt = now();
  // Sites already recorded take the category's new sensitivity as a new version.
  if (c.patch.sensitivity) {
    for (const f of d.facilities) {
      const lvl = sensitivityRule(f.category).level;
      if (lvl !== f.sensitivity) { f.sensitivity = lvl; pushVersion(f, by.trim(), `sensitivity ${lvl} under policy v${d.policy.version}`); }
    }
  }
  recordAudit(c.decidedBy, 'facility.policy.confirm', `FacilityPolicy:${c.id}`, 'ok', `policy v${d.policy.version}`);
  return facilityPolicy();
}

// ── Checks ────────────────────────────────────────────────────────────────

export interface LocationCheck {
  ok: boolean;
  errors: string[];
  warnings: string[];
  place: Facility['place'];
  duplicates: { id: string; name: string; metres: number }[];
}

const feature = (geometry: Geom) => ({ type: 'Feature' as const, properties: {}, geometry });
const metres = (a: [number, number], b: [number, number]) => Math.round(geoDistance(a, b) * 6_371_008.8);

/**
 * Where a position falls: ranges, inside the nation, its region and district
 * worked out from the map. Shared by the facility register and incident
 * places, so both read a position the same way.
 */
export async function placePoint(input: { lng: number; lat: number; region?: string; nearCoast?: boolean; outsideReason?: string; noun?: string; skipMap?: boolean }): Promise<{ errors: string[]; warnings: string[]; place: Facility['place'] }> {
  const errors: string[] = [], warnings: string[] = [];
  const { lng, lat } = input;
  const noun = input.noun ?? 'site';
  const place: Facility['place'] = { inside: false };
  if (!Number.isFinite(lng) || !Number.isFinite(lat)) return { errors: ['Give the longitude and latitude as numbers'], warnings, place };
  if (Math.abs(lat) > 90 || Math.abs(lng) > 180) errors.push('Latitude must be between −90 and 90 and longitude between −180 and 180');
  if (lng === 0 && lat === 0) errors.push('0, 0 is in the ocean off West Africa: the position was probably not captured');
  const decimals = (v: number) => (String(v).split('.')[1] ?? '').length;
  if (decimals(lng) < 4 || decimals(lat) < 4) warnings.push('Fewer than 4 decimal places: the position is only good to about 10 m or worse');
  const iso3 = nationIso3();
  if (iso3 && !errors.length && !input.skipMap) {
    const geo = await loadNationGeography(iso3, nationRegions(), 'full');
    const at: [number, number] = [lng, lat];
    const unit = geo?.units.find(u => u.geometry && geoContains(feature(u.geometry) as never, at));
    if (unit) { place.inside = true; place.regionCode = unit.code; place.region = unit.name; }
    else {
      // Swapped latitude and longitude is the most common mistake.
      const swapped = geo?.units.find(u => u.geometry && geoContains(feature(u.geometry) as never, [lat, lng]));
      if (swapped) errors.push(`The position is outside the nation, but would be in ${swapped.name} with latitude and longitude swapped`);
      else {
        const near = (geo?.units ?? []).filter(u => u.lng != null && u.lat != null).map(u => metres(at, [u.lng!, u.lat!])).sort((a, b) => a - b)[0] ?? Infinity;
        if (near < (input.nearCoast ? 120_000 : 60_000)) warnings.push('Just outside the national boundary as the map draws it (coasts and borders are simplified); confirm with a reason');
        else errors.push('The position is outside the nation');
        if (!input.outsideReason) warnings.push('A position outside the boundary needs a reason');
      }
    }
    if (input.region && place.region && input.region.trim().toLowerCase() !== place.region.toLowerCase()) {
      warnings.push(`The ${noun} is said to be in ${input.region}, but the position falls in ${place.region}`);
    }
    const a2 = place.regionCode ? await loadDistricts(iso3, place.regionCode, 'full') : null;
    const district = a2?.units.find(u => u.parent === place.regionCode && geoContains(feature(u.geometry) as never, at));
    if (district) { place.districtCode = district.code; place.district = district.name; }
  }
  return { errors, warnings, place };
}

/** Same-named sites further apart than this are different sites. */
export const SAME_NAME_METRES = 5000;

/**
 * Sites of the same category that may be this one: within the category's
 * duplicate distance, of the same name within 5 km, or carrying one of its
 * identifiers anywhere. Reads the spatial and identifier indexes, not every site.
 */
export function findDuplicates(input: { lng: number; lat: number; category: string; name?: string; ids?: Record<string, string>; exceptId?: string }): { id: string; name: string; metres: number }[] {
  const { lng, lat } = input;
  const cat = categoryOf(input.category);
  const name = clean(input.name).toLowerCase();
  const near = cat?.duplicateMetres ?? 200;
  const reach = name ? Math.max(near, SAME_NAME_METRES) : near;
  const pool = sitesNear(lng, lat, reach, input.category);
  const byId = sitesWithIds(input.ids ?? {}).filter(f => f.category === input.category && !pool.includes(f));
  if (byId.length) { const order = grid().order; pool.push(...byId); pool.sort((p, q) => order.get(p.id)! - order.get(q.id)!); }
  // Cheap bound before the great-circle distance: a degree of latitude is at least 110.5 km.
  const far = (f: Facility) => Math.abs(f.location.lat - lat) * 110_500 > reach + 1;
  const wanted = (f: Facility) => Object.entries(input.ids ?? {}).some(([key, v]) => v && f.ids[key] === v);
  return pool
    .filter(f => f.state !== 'withdrawn' && f.id !== input.exceptId && (!far(f) || wanted(f)))
    .map(f => ({ f, m: metres([lng, lat], [f.location.lng, f.location.lat]) }))
    .filter(({ f, m }) => m <= near || (name && f.name.toLowerCase() === name && m < SAME_NAME_METRES) || wanted(f))
    .map(({ f, m }) => ({ id: f.id, name: f.name, metres: m }));
}

/** Check a position for a category: ranges, inside the nation and the stated region, duplicates; works out its region and district. */
export async function checkLocation(input: { lng: number; lat: number; category: string; region?: string; name?: string; ids?: Record<string, string>; exceptId?: string; outsideReason?: string }): Promise<LocationCheck> {
  const { lng, lat } = input;
  if (!Number.isFinite(lng) || !Number.isFinite(lat)) return { ok: false, errors: ['Give the longitude and latitude as numbers'], warnings: [], place: { inside: false }, duplicates: [] };
  const coastal = ['port', 'logistics', 'power', 'telecom', 'border-post', 'defence'].includes(input.category);
  const noCategory = !categoryOf(input.category);
  // Without a category the map is not consulted; ranges still are.
  const located = await placePoint({ lng, lat, region: input.region, nearCoast: coastal, outsideReason: input.outsideReason, skipMap: noCategory });
  const errors = [...located.errors, ...(noCategory ? ['Choose a category'] : [])], warnings = located.warnings, place = located.place;
  const duplicates = findDuplicates({ lng, lat, category: input.category, name: input.name, ids: input.ids, exceptId: input.exceptId });
  if (duplicates.length) warnings.push(`Possible duplicate of ${duplicates.map(d => `${d.name} (${d.metres} m)`).join(', ')}`);
  return { ok: !errors.length, errors, warnings, place, duplicates };
}

// ── Workflow ──────────────────────────────────────────────────────────────

function pushVersion(f: Facility, by: string, what: string): void {
  f.versions.push({ n: f.versions.length + 1, at: now(), by, what, name: f.name, category: f.category, status: f.status, location: { ...f.location }, sensitivity: f.sensitivity });
  repo().save(f);
}

function certificationFor(): Facility['certification'] {
  const mode = db().policy.certification;
  const required: CertStage[] = mode === 'both' ? ['institution', 'mapping-agency'] : mode === 'mapping-agency' ? ['mapping-agency'] : ['institution'];
  return { required, stamps: [], state: 'awaiting' };
}

export interface ProposeInput {
  name?: string; localName?: string; category?: string; operator?: string; ids?: Record<string, string>; status?: FacilityStatus;
  lng?: number; lat?: number; accuracyM?: number; method?: CaptureMethod; capturedAt?: string; original?: string;
  region?: string; note?: string; outsideReason?: string; confirmDuplicate?: boolean;
  /** Set by a load that converted the position from a declared coordinate system. */
  sourceCrs?: FacilitySourceCrs;
  /** 3D readiness: the building's footprint (GeoJSON Polygon or a Feature holding one), height (m) and storeys. */
  footprint?: unknown;
  heightM?: number | string;
  levels?: number | string;
}

export const MAX_FOOTPRINT_POINTS = 2000;
export const MAX_FOOTPRINT_KM2 = 5;
/** How far the site's position may be from its footprint. */
export const FOOTPRINT_NEAR_M = 250;

/**
 * Check a building's footprint, height and storeys for a site at a position:
 * a single closed ring of longitude/latitude that does not cross itself, of a
 * plausible size, at or near the site; height 0.5–1,000 m; 1–250 storeys.
 * The ring is closed and wound anticlockwise. `null` clears a value.
 */
export function checkStructure(input: { footprint?: unknown; heightM?: unknown; levels?: unknown }, at: { lng: number; lat: number }): { value: { footprint?: FootprintPolygon | null; heightM?: number | null; levels?: number | null }; warnings: string[] } | { error: string } {
  const value: { footprint?: FootprintPolygon | null; heightM?: number | null; levels?: number | null } = {};
  const warnings: string[] = [];
  let fp = input.footprint;
  if (typeof fp === 'string') {
    if (!fp.trim()) fp = undefined;
    else { try { fp = JSON.parse(fp); } catch { return { error: 'The footprint is not valid GeoJSON' }; } }
  }
  if (fp === null) value.footprint = null;
  else if (fp !== undefined) {
    const g = (fp as { type?: string; geometry?: unknown }).type === 'Feature' ? (fp as { geometry?: unknown }).geometry : fp;
    const poly = g as { type?: string; coordinates?: unknown };
    if (poly?.type !== 'Polygon' || !Array.isArray(poly.coordinates) || !Array.isArray(poly.coordinates[0])) return { error: 'The footprint must be a GeoJSON Polygon (the building\'s outline on the ground)' };
    const ring = (poly.coordinates[0] as unknown[]).map(p => (Array.isArray(p) ? [Number(p[0]), Number(p[1])] : [NaN, NaN]));
    if (ring.some(([x, y]) => !Number.isFinite(x!) || !Number.isFinite(y!) || Math.abs(x!) > 180 || Math.abs(y!) > 90)) return { error: 'The footprint\'s points must be longitude, latitude in degrees' };
    const [a, b] = [ring[0]!, ring[ring.length - 1]!];
    if (a[0] !== b[0] || a[1] !== b[1]) ring.push([a[0]!, a[1]!]);
    if (ring.length < 4) return { error: 'The footprint needs at least three corners' };
    if (ring.length > MAX_FOOTPRINT_POINTS) return { error: `The footprint has more than ${MAX_FOOTPRINT_POINTS} points: simplify it` };
    const rounded = ring.map(([x, y]) => [Math.round(x! * 1e7) / 1e7, Math.round(y! * 1e7) / 1e7]);
    if (kinksOf({ type: 'Polygon', coordinates: [rounded] }, 1).length) return { error: 'The footprint\'s outline crosses itself' };
    // Planar area on a local plane (m²): sign gives the winding.
    const lat0 = (rounded.reduce((s, p) => s + p[1]!, 0) / rounded.length) * Math.PI / 180;
    const kx = 111_320 * Math.cos(lat0), ky = 110_574;
    let twice = 0;
    for (let i = 0; i < rounded.length - 1; i++) twice += rounded[i]![0]! * kx * rounded[i + 1]![1]! * ky - rounded[i + 1]![0]! * kx * rounded[i]![1]! * ky;
    const m2 = Math.abs(twice) / 2;
    if (m2 < 1) return { error: 'The footprint has no area' };
    if (m2 > MAX_FOOTPRINT_KM2 * 1e6) return { error: `The footprint covers more than ${MAX_FOOTPRINT_KM2} km²: record the buildings, not the whole site` };
    if (twice < 0) rounded.reverse();
    // Planar ray casting: a building is small enough for the plane.
    let inside = false;
    for (let i = 0, j = rounded.length - 2; i < rounded.length - 1; j = i++) {
      const [xi, yi] = rounded[i]!, [xj, yj] = rounded[j]!;
      if ((yi! > at.lat) !== (yj! > at.lat) && at.lng < ((xj! - xi!) * (at.lat - yi!)) / (yj! - yi!) + xi!) inside = !inside;
    }
    if (!inside) {
      const nearest = Math.min(...rounded.map(p => metres([at.lng, at.lat], [p[0]!, p[1]!])));
      if (nearest > FOOTPRINT_NEAR_M) return { error: `The footprint is ${nearest.toLocaleString('en')} m from the site's position: draw the building at the site` };
      warnings.push(`The site's position is outside its footprint (${nearest} m from its nearest corner)`);
    }
    value.footprint = { type: 'Polygon', coordinates: [rounded] };
  }
  const num = (v: unknown) => (v === '' || v === undefined ? undefined : v === null ? null : Number(v));
  const h = num(input.heightM);
  if (h === null) value.heightM = null;
  else if (h !== undefined) {
    if (!Number.isFinite(h) || h < 0.5 || h > 1000) return { error: 'Height must be between 0.5 and 1,000 metres' };
    value.heightM = Math.round(h * 10) / 10;
  }
  const l = num(input.levels);
  if (l === null) value.levels = null;
  else if (l !== undefined) {
    if (!Number.isInteger(l) || l < 1 || l > 250) return { error: 'Storeys must be a whole number from 1 to 250' };
    value.levels = l;
  }
  if (value.heightM && value.levels && (value.heightM / value.levels < 2 || value.heightM / value.levels > 10)) warnings.push(`${value.heightM} m for ${value.levels} storeys is ${Math.round((value.heightM / value.levels) * 10) / 10} m a storey: check the height`);
  return { value, warnings };
}

function applyStructure(f: Facility, v: { footprint?: FootprintPolygon | null; heightM?: number | null; levels?: number | null }): string[] {
  const changed: string[] = [];
  if (v.footprint !== undefined) { if (v.footprint) f.footprint = v.footprint; else delete f.footprint; changed.push(v.footprint ? 'footprint' : 'footprint removed'); }
  if (v.heightM !== undefined) { if (v.heightM) f.heightM = v.heightM; else delete f.heightM; changed.push(v.heightM ? `height ${v.heightM} m` : 'height removed'); }
  if (v.levels !== undefined) { if (v.levels) f.levels = v.levels; else delete f.levels; changed.push(v.levels ? `${v.levels} storeys` : 'storeys removed'); }
  return changed;
}

/** An official of the owning institution proposes a site; the position is checked first. */
export async function proposeFacility(ministryId: string, input: ProposeInput, by: string, source: Facility['source'] = { kind: 'form' }): Promise<{ facility: Facility; check: LocationCheck } | { error: string; check?: LocationCheck }> {
  if (!getMinistry(ministryId)) return { error: 'No such institution' };
  if (!by.trim()) return { error: 'Name the official recording the site' };
  const name = clean(input.name);
  if (!name) return { error: 'Give the site its name' };
  const cat = categoryOf(String(input.category ?? ''));
  if (!cat) return { error: 'Choose a category' };
  const rule = sensitivityRule(cat.key);
  if (rule.level === 'confidential') return { error: `${cat.label} sites are confidential under the nation's policy and are kept outside the civilian register` };
  const method = input.method ?? 'typed';
  if (!isCaptureMethod(method)) return { error: 'Unknown way of capturing the position' };
  if (!db().policy.methods.includes(method)) return { error: `The nation does not accept "${CAPTURE_METHODS.find(m => m.key === method)!.label}" as a way of capturing a position` };
  const lng = Number(input.lng), lat = Number(input.lat);
  // The national FacilityID is minted at publication, never given.
  const ids = Object.fromEntries(Object.entries(input.ids ?? {}).map(([k, v]) => [clean(k, 60), clean(v, 80)]).filter(([k, v]) => k && v && k !== NATIONAL_ID));
  const check = await checkLocation({ lng, lat, category: cat.key, region: input.region, name, ids, outsideReason: input.outsideReason });
  if (!check.ok) return { error: check.errors[0]!, check };
  if (!check.place.inside && !clean(input.outsideReason)) return { error: 'The position is outside the boundary as drawn: confirm it with a reason', check };
  if (check.duplicates.length && !input.confirmDuplicate) return { error: 'This may already be recorded: confirm it is a different site', check };
  const structure = checkStructure({ footprint: input.footprint, heightM: input.heightM, levels: input.levels }, { lng, lat });
  if ('error' in structure) return { error: structure.error, check };
  check.warnings.push(...structure.warnings);
  const status = STATUSES.includes(input.status as FacilityStatus) ? input.status as FacilityStatus : 'operational';
  const accuracy = Number(input.accuracyM);
  const f: Facility = {
    id: `FAC-${String(repo().nextSeq()).padStart(5, '0')}`,
    name, ...(clean(input.localName) ? { localName: clean(input.localName) } : {}),
    category: cat.key, ownerId: ministryId, ...(clean(input.operator) ? { operator: clean(input.operator) } : {}),
    ids, status, sensitivity: rule.level,
    location: {
      lng: Math.round(lng * 1e6) / 1e6, lat: Math.round(lat * 1e6) / 1e6, method,
      accuracyM: Number.isFinite(accuracy) && accuracy > 0 ? Math.round(accuracy) : CAPTURE_METHODS.find(m => m.key === method)!.typicalAccuracyM,
      capturedAt: input.capturedAt && !Number.isNaN(Date.parse(input.capturedAt)) ? new Date(input.capturedAt).toISOString() : now(),
      capturedBy: by.trim(), ...(clean(input.original, 200) ? { original: clean(input.original, 200) } : {}),
      ...(input.sourceCrs ? { sourceCrs: { name: clean(input.sourceCrs.name, 160), ...(input.sourceCrs.epsg ? { epsg: input.sourceCrs.epsg } : {}), transformation: String(input.sourceCrs.transformation).slice(0, 2000), x: Number(input.sourceCrs.x), y: Number(input.sourceCrs.y) } } : {}),
    },
    place: check.place,
    state: 'proposed', proposedBy: by.trim(), proposedAt: now(),
    certification: certificationFor(), source, versions: [],
    ...(clean(input.note, 400) || clean(input.outsideReason, 400) ? { note: [clean(input.note, 400), clean(input.outsideReason, 400) && `Outside the drawn boundary: ${clean(input.outsideReason, 400)}`].filter(Boolean).join(' · ') } : {}),
  };
  applyStructure(f, structure.value);
  pushVersion(f, f.proposedBy, 'proposed');
  repo().add(f);
  gridInsert(f);
  recordAudit(f.proposedBy, 'facility.propose', `Facility:${f.id}`, 'ok', `${cat.label}: ${f.name} (${f.location.lat}, ${f.location.lng}; ${method})`);
  return { facility: structuredClone(f), check };
}

export type FacilityAction =
  | { action: 'publish' }
  | { action: 'certify'; stage: CertStage; decision: 'certified' | 'rejected'; note?: string }
  | { action: 'move'; lng: number; lat: number; accuracyM?: number; method?: CaptureMethod; reason?: string }
  | { action: 'confirm-move' }
  | { action: 'status'; status: FacilityStatus }
  | { action: 'withdraw'; reason?: string }
  | { action: 'structure'; footprint?: unknown; heightM?: number | string | null; levels?: number | string | null };

/** Who an action may be taken by is checked by the route (lib/auth); this checks the record's own rules. */
export async function actOnFacility(id: string, a: FacilityAction, by: string): Promise<Facility | { error: string }> {
  const f = db().facilities.find(x => x.id === id);
  if (!f) return { error: 'No such site' };
  if (!by.trim()) return { error: 'Name the official acting' };
  const who = by.trim();
  switch (a.action) {
    case 'publish': {
      if (f.state !== 'proposed') return { error: `The site is already ${f.state}` };
      if (who === f.proposedBy) return { error: 'A different official must publish a site they did not propose' };
      f.state = 'published'; f.publishedBy = who; f.publishedAt = now();
      if (!f.ids[NATIONAL_ID]) { f.ids[NATIONAL_ID] = uuid7(Date.parse(f.publishedAt)); gridUpdate(f); }
      pushVersion(f, who, 'published');
      upsertFacilityEntity({ id: f.id, name: f.name, location: f.location, regionCode: f.place.regionCode, ids: f.ids });
      recordAudit(who, 'facility.publish', `Facility:${f.id}`, 'ok', `${f.name} · national id ${f.ids[NATIONAL_ID]}`);
      break;
    }
    case 'certify': {
      if (f.state !== 'published') return { error: 'Only a published site\'s location can be certified' };
      if (!f.certification.required.includes(a.stage)) return { error: 'The nation\'s policy does not ask for this certification' };
      const order = f.certification.required;
      const next = order.find(s => !f.certification.stamps.some(x => x.stage === s && x.decision === 'certified'));
      if (next !== a.stage) return { error: next ? `The ${next === 'institution' ? 'owning institution' : 'mapping agency'} certifies first` : 'The location is already certified' };
      if (!['certified', 'rejected'].includes(a.decision)) return { error: 'Certify or reject' };
      if (a.decision === 'rejected' && !clean(a.note, 400)) return { error: 'Say why the location is rejected' };
      f.certification.stamps.push({ stage: a.stage, decision: a.decision, by: who, at: now(), ...(clean(a.note, 400) ? { note: clean(a.note, 400) } : {}) });
      f.certification.state = a.decision === 'rejected' ? 'rejected'
        : order.every(s => f.certification.stamps.some(x => x.stage === s && x.decision === 'certified')) ? 'certified' : 'awaiting';
      pushVersion(f, who, `location ${a.decision} by ${a.stage === 'institution' ? 'the owning institution' : 'the mapping agency'}`);
      recordAudit(who, `facility.certify.${a.decision}`, `Facility:${f.id}`, 'ok', `${a.stage}${a.note ? `: ${clean(a.note, 200)}` : ''}`);
      break;
    }
    case 'move': {
      if (f.state === 'withdrawn') return { error: 'The site is withdrawn' };
      const method = a.method ?? 'typed';
      if (!isCaptureMethod(method) || !db().policy.methods.includes(method)) return { error: 'The nation does not accept this way of capturing a position' };
      const check = await checkLocation({ lng: Number(a.lng), lat: Number(a.lat), category: f.category, exceptId: f.id, outsideReason: a.reason });
      if (!check.ok) return { error: check.errors[0]! };
      if (!clean(a.reason, 300)) return { error: 'Say why the position changes' };
      f.pendingVersion = {
        n: f.versions.length + 1, at: now(), by: who, what: 'move proposed', name: f.name, category: f.category, status: f.status, sensitivity: f.sensitivity,
        location: { lng: Math.round(Number(a.lng) * 1e6) / 1e6, lat: Math.round(Number(a.lat) * 1e6) / 1e6, method, accuracyM: a.accuracyM ?? CAPTURE_METHODS.find(m => m.key === method)!.typicalAccuracyM, capturedAt: now(), capturedBy: who },
        reason: clean(a.reason, 300),
      };
      recordAudit(who, 'facility.move.propose', `Facility:${f.id}`, 'ok', `${a.lat}, ${a.lng}: ${clean(a.reason, 200)}`);
      break;
    }
    case 'confirm-move': {
      const p = f.pendingVersion;
      if (!p) return { error: 'No move is waiting' };
      if (p.by === who) return { error: 'A different official must confirm the move' };
      const check = await checkLocation({ lng: p.location.lng, lat: p.location.lat, category: f.category, exceptId: f.id, outsideReason: p.reason });
      f.location = p.location; f.place = check.place; f.pendingVersion = undefined;
      gridUpdate(f);
      // A moved site's location is certified again under the current policy.
      if (f.state === 'published') f.certification = certificationFor();
      pushVersion(f, who, `moved: ${p.reason ?? ''}`);
      if (f.state === 'published') upsertFacilityEntity({ id: f.id, name: f.name, location: f.location, regionCode: f.place.regionCode, ids: f.ids });
      recordAudit(who, 'facility.move.confirm', `Facility:${f.id}`, 'ok', `${f.location.lat}, ${f.location.lng}`);
      break;
    }
    case 'status': {
      if (!STATUSES.includes(a.status)) return { error: 'Unknown status' };
      f.status = a.status;
      pushVersion(f, who, `status ${a.status}`);
      recordAudit(who, 'facility.status', `Facility:${f.id}`, 'ok', a.status);
      break;
    }
    case 'structure': {
      if (f.state === 'withdrawn') return { error: 'The site is withdrawn' };
      const c = checkStructure({ footprint: a.footprint, heightM: a.heightM, levels: a.levels }, f.location);
      if ('error' in c) return c;
      const changed = applyStructure(f, c.value);
      if (!changed.length) return { error: 'Give a footprint, a height or storeys (or null to remove one)' };
      pushVersion(f, who, `building: ${changed.join(', ')}`);
      recordAudit(who, 'facility.structure', `Facility:${f.id}`, 'ok', changed.join(', '));
      break;
    }
    case 'withdraw': {
      if (f.state === 'withdrawn') return { error: 'Already withdrawn' };
      f.state = 'withdrawn';
      pushVersion(f, who, `withdrawn${a.reason ? `: ${clean(a.reason, 200)}` : ''}`);
      recordAudit(who, 'facility.withdraw', `Facility:${f.id}`, 'ok', clean(a.reason, 200));
      break;
    }
    default: return { error: 'Unknown action' };
  }
  repo().save(f);
  return structuredClone(f);
}

// ── Reading ───────────────────────────────────────────────────────────────

/** Who is looking: their institution (undefined = whole government) or the public. */
export type Viewer = { institution?: string; signedIn: boolean };

/** A site as a viewer may see it: restricted sites generalised for anyone without need, versions only for officials. */
export function viewFacility(f: Facility, v: Viewer): Facility & { generalised?: boolean } {
  const exact = f.sensitivity === 'public' || (v.signedIn && (!v.institution || v.institution === f.ownerId));
  const out: Facility & { generalised?: boolean } = structuredClone(f);
  if (!exact) {
    const step = db().policy.generaliseDegrees;
    const snap = (x: number) => Math.round(x / step) * step + step / 2;
    out.location = { lng: Number(snap(f.location.lng).toFixed(4)), lat: Number(snap(f.location.lat).toFixed(4)), method: f.location.method, accuracyM: Math.round(step * 111_000) };
    out.place = { ...f.place, districtCode: undefined, district: undefined };
    delete out.footprint; // an outline would give the exact position away
    out.ids = f.ids[NATIONAL_ID] ? { [NATIONAL_ID]: f.ids[NATIONAL_ID] } : {}; out.versions = []; out.pendingVersion = undefined; out.generalised = true;
  }
  if (!v.signedIn) { out.versions = []; out.pendingVersion = undefined; out.proposedBy = ''; out.publishedBy = undefined; }
  return out;
}

/**
 * Sites as a viewer may see them. The viewer is required: there is no default,
 * so a caller that forgot who is looking cannot receive restricted positions
 * (pass `{ signedIn: true }` only for the whole government, server-side).
 */
export function listFacilities(filter: { ministryId?: string; category?: string; state?: Facility['state'] | 'all'; region?: string; bbox?: [number, number, number, number] }, viewer: Viewer): (Facility & { generalised?: boolean })[] {
  if (!viewer || typeof viewer.signedIn !== 'boolean') throw new Error('listFacilities needs the viewer');
  const b = filter.bbox;
  // A bbox reads the grid around the box, widened by the generalisation step so
  // a restricted site is matched where the viewer sees it, never where it is.
  const m = b ? db().policy.generaliseDegrees : 0;
  const from = b ? sitesInCells([b[0] - m, b[1] - m, b[2] + m, b[3] + m]) : db().facilities;
  const inBox = (f: { location: { lng: number; lat: number } }) => !b || (f.location.lng >= b[0] && f.location.lng <= b[2] && f.location.lat >= b[1] && f.location.lat <= b[3]);
  return from
    .filter(f => (filter.state === 'all' ? true : f.state === (filter.state ?? 'published')))
    .filter(f => !filter.ministryId || f.ownerId === filter.ministryId)
    .filter(f => !filter.category || f.category === filter.category)
    .filter(f => !filter.region || f.place.regionCode === filter.region || f.place.region === filter.region)
    .map(f => viewFacility(f, viewer))
    .filter(inBox);
}

export function getFacility(id: string): Facility | undefined {
  const f = db().facilities.find(x => x.id === id);
  return f ? structuredClone(f) : undefined;
}

/** Counts for dashboards: by category, state and certification (no positions). */
export function facilityCounts(): { total: number; published: number; certified: number; awaiting: number; byCategory: Record<string, number> } {
  const live = db().facilities.filter(f => f.state === 'published');
  const byCategory: Record<string, number> = {};
  for (const f of live) byCategory[f.category] = (byCategory[f.category] ?? 0) + 1;
  return { total: db().facilities.filter(f => f.state !== 'withdrawn').length, published: live.length, certified: live.filter(f => f.certification.state === 'certified').length, awaiting: live.filter(f => f.certification.state === 'awaiting').length, byCategory };
}

/** The mapping agency's institution, when the nation has named one. */
export function mappingAgency(): { id: string; name: string } | null {
  const id = db().policy.mappingAgencyId;
  const m = id ? listMinistries().find(x => x.id === id) : undefined;
  return m ? { id: m.id, name: m.name } : null;
}

// ── Loading existing data (survey files, GNSS exports, registries) ─────────

export const IMPORT_COLUMNS = [
  { name: 'name', required: true, means: 'The site\'s name.', aliases: ['site', 'facility', 'facility name', 'school name', 'title'] },
  { name: 'category', required: true, means: `One of: ${FACILITY_CATEGORIES.map(c => c.key).join(', ')}.`, aliases: ['type', 'kind', 'class'] },
  { name: 'latitude', required: true, means: 'Decimal degrees, e.g. -1.28638; or the northing (metres) when the file declares a national grid.', aliases: ['lat', 'y', 'northing'] },
  { name: 'longitude', required: true, means: 'Decimal degrees, e.g. 36.81724; or the easting (metres) when the file declares a national grid.', aliases: ['lon', 'lng', 'long', 'x', 'easting'] },
  { name: 'code', required: false, means: 'The sector identifier (e.g. Master Facility List code, ICAO code).', aliases: ['id', 'identifier', 'mfl', 'emis', 'icao', 'locode'] },
  { name: 'status', required: false, means: `One of: ${STATUSES.join(', ')} (operational by default).`, aliases: ['state'] },
  { name: 'accuracy', required: false, means: 'Accuracy of the position in metres.', aliases: ['accuracy_m', 'precision', 'hdop'] },
  { name: 'region', required: false, means: 'The region it is in (checked against the position).', aliases: ['county', 'province', 'state_name', 'district'] },
  { name: 'operator', required: false, means: 'Who runs it, if not the institution.', aliases: ['operated by', 'owner'] },
] as const;

const columnOf = (h: string) => { const k = h.trim().toLowerCase().replace(/\s+/g, ' '); return IMPORT_COLUMNS.find(c => c.name === k || (c.aliases as readonly string[]).includes(k))?.name; };

/** Rows from CSV, GeoJSON points or GPX waypoints, in the import columns. */
export function readSitesFile(text: string, format: 'csv' | 'geojson' | 'gpx'): Record<string, string>[] | { error: string } {
  if (format === 'csv') {
    return parseCsv(text).map(r => Object.fromEntries(Object.entries(r).map(([k, v]) => [columnOf(k) ?? k.trim().toLowerCase(), v])));
  }
  if (format === 'geojson') {
    let j: { type?: string; features?: { geometry?: { type?: string; coordinates?: number[] }; properties?: Record<string, unknown> }[] };
    try { j = JSON.parse(text); } catch { return { error: 'The file is not valid GeoJSON' }; }
    if (j.type !== 'FeatureCollection' || !Array.isArray(j.features)) return { error: 'A GeoJSON FeatureCollection of points is needed' };
    return j.features.map(f => {
      const props = Object.fromEntries(Object.entries(f.properties ?? {}).map(([k, v]) => [columnOf(k) ?? k.trim().toLowerCase(), String(v ?? '')]));
      const pt = f.geometry?.type === 'Point' ? f.geometry.coordinates : undefined;
      return { ...props, longitude: pt ? String(pt[0]) : '', latitude: pt ? String(pt[1]) : '', ...(f.geometry?.type && f.geometry.type !== 'Point' ? { _geometry: f.geometry.type } : {}) };
    });
  }
  // GPX waypoints from a GNSS receiver or phone: <wpt lat lon><name/><type/><desc/></wpt>
  const out: Record<string, string>[] = [];
  const re = /<wpt\b([^>]*)>([\s\S]*?)<\/wpt>/g;
  const attr = (s: string, k: string) => new RegExp(`${k}\\s*=\\s*"([^"]*)"`).exec(s)?.[1] ?? '';
  const tag = (s: string, k: string) => (new RegExp(`<${k}>([\\s\\S]*?)</${k}>`).exec(s)?.[1] ?? '').replace(/<!\[CDATA\[|\]\]>/g, '').trim();
  for (let m = re.exec(text); m; m = re.exec(text)) {
    out.push({ name: tag(m[2]!, 'name'), category: tag(m[2]!, 'type'), latitude: attr(m[1]!, 'lat'), longitude: attr(m[1]!, 'lon'), code: tag(m[2]!, 'cmt'), accuracy: tag(m[2]!, 'hdop') ? String(Number(tag(m[2]!, 'hdop')) * 5) : '' });
  }
  if (!out.length) return { error: 'No waypoints found in the GPX file' };
  return out;
}

export const MAX_SITE_ROWS = 5000;

/** Load sites from a file: every row checked, refusals with reasons; dry run first. Each accepted row is proposed (published by a second official). */
export async function importSites(ministryId: string, text: string, format: 'csv' | 'geojson' | 'gpx', by: string, opts: { dryRun?: boolean; method?: CaptureMethod; crs?: string; prj?: string } = {}): Promise<FacilityImport & { dryRun: boolean; preview: { row: number; name: string; category: string; region?: string; warnings: string[] }[] } | { error: string }> {
  if (!getMinistry(ministryId)) return { error: 'No such institution' };
  if (!by.trim()) return { error: 'Name the official loading the file' };
  if (text.length > 10_000_000) return { error: 'The file is larger than 10 MB' };
  const rows = readSitesFile(text, format);
  if ('error' in rows) return rows;
  if (rows.length > MAX_SITE_ROWS) return { error: `More than ${MAX_SITE_ROWS} rows: split the file` };
  // The coordinate system: declared with the load (EPSG code or .prj), or named in a GeoJSON file's own "crs" member.
  let declared = opts.crs;
  if (!declared && !opts.prj && format === 'geojson') { try { const n = (JSON.parse(text) as { crs?: { properties?: { name?: unknown } } }).crs?.properties?.name; if (typeof n === 'string') declared = n; } catch { /* read above */ } }
  const crs: SourceCrs | { error: string } = readCrs({ crs: declared, prj: opts.prj });
  if ('error' in crs) return crs;
  if (format === 'gpx' && !crs.wgs84) return { error: 'GPX positions are always WGS 84 longitude/latitude: do not declare another coordinate system' };
  const fromGrid = crs.projected && !crs.wgs84;
  const method: CaptureMethod = opts.method && isCaptureMethod(opts.method) ? opts.method
    : format === 'gpx' ? 'gnss-survey' : fromGrid && db().policy.methods.includes('national-grid') ? 'national-grid' : 'survey-import';
  const sha256 = createHash('sha256').update(text).digest('hex');
  const imp: FacilityImport = {
    id: `FIM-${randomUUID().slice(0, 8)}`, ministryId, by: by.trim(), at: now(), format, sha256, rows: rows.length, accepted: 0, refused: [], facilityIds: [],
    ...(!crs.wgs84 ? { crs: { name: crs.name, ...(crs.epsg ? { epsg: crs.epsg } : {}), transformation: crs.transformation } } : {}),
  };
  const preview: { row: number; name: string; category: string; region?: string; warnings: string[] }[] = [];
  const seenInFile = new Set<string>();
  for (const [i, r] of rows.entries()) {
    const row = format === 'csv' ? i + 2 : i + 1;
    const refuse = (reason: string) => { if (imp.refused.length < 200) imp.refused.push({ row, reason }); };
    if (r._geometry) { refuse(`A ${r._geometry} is not a point: load sites as points`); continue; }
    const cat = categoryOf((r.category ?? '').trim().toLowerCase());
    if (!(r.name ?? '').trim()) { refuse('No name'); continue; }
    if (!cat) { refuse(`"${r.category ?? ''}" is not a category`); continue; }
    let lat = Number((r.latitude ?? '').replace(',', '.')), lng = Number((r.longitude ?? '').replace(',', '.'));
    let sourceCrs: FacilitySourceCrs | undefined;
    if (!crs.wgs84) {
      const p = toWgs84(crs, lng, lat);
      if (!p) { refuse(`The position ${r.longitude ?? ''}, ${r.latitude ?? ''} cannot be converted from ${crs.name}`); continue; }
      sourceCrs = { name: crs.name, ...(crs.epsg ? { epsg: crs.epsg } : {}), transformation: crs.transformation, x: lng, y: lat };
      lng = p.lng; lat = p.lat;
    } else if (Math.abs(lat) > 90 || Math.abs(lng) > 180) {
      refuse('The coordinates look like easting and northing in metres: declare the file\'s coordinate system (EPSG code or .prj)'); continue;
    }
    const key = `${cat.key}|${lat.toFixed(5)}|${lng.toFixed(5)}`;
    if (seenInFile.has(key)) { refuse('The same site appears twice in the file'); continue; }
    seenInFile.add(key);
    const ids = r.code ? { [cat.scheme]: r.code } : {};
    if (opts.dryRun) {
      const check = await checkLocation({ lng, lat, category: cat.key, region: r.region, name: r.name, ids, outsideReason: undefined });
      if (!check.ok) { refuse(check.errors[0]!); continue; }
      if (!check.place.inside) { refuse('Outside the national boundary as drawn: add it on its own with a reason'); continue; }
      if (sensitivityRule(cat.key).level === 'confidential') { refuse(`${cat.label} sites are confidential and stay outside the civilian register`); continue; }
      imp.accepted++;
      preview.push({ row, name: r.name!, category: cat.key, region: check.place.region, warnings: check.warnings });
      continue;
    }
    const res = await proposeFacility(ministryId, {
      name: r.name, category: cat.key, lat, lng, ids, status: (r.status as FacilityStatus) || undefined, accuracyM: r.accuracy ? Number(r.accuracy) : undefined,
      method, region: r.region, operator: r.operator, confirmDuplicate: false,
      ...(sourceCrs ? { sourceCrs, original: `${sourceCrs.name} ${crs.projected ? 'easting' : 'x'} ${sourceCrs.x} ${crs.projected ? 'northing' : 'y'} ${sourceCrs.y}` } : {}),
    }, by, { kind: 'import', importId: imp.id, sha256 });
    if ('error' in res) { refuse(res.error); continue; }
    imp.accepted++; imp.facilityIds.push(res.facility.id);
  }
  if (!opts.dryRun) {
    db().imports.unshift(imp);
    recordAudit(imp.by, 'facility.import', `FacilityImport:${imp.id}`, imp.accepted ? 'ok' : 'error', `${imp.accepted} of ${imp.rows} rows (${format}${imp.crs ? `, converted from ${imp.crs.name}` : ''}, sha256 ${sha256.slice(0, 12)}…)`);
  }
  return { ...imp, dryRun: !!opts.dryRun, preview: preview.slice(0, 200) };
}

export function listImports(ministryId?: string): FacilityImport[] {
  return db().imports.filter(i => !ministryId || i.ministryId === ministryId).map(i => structuredClone(i));
}

// ── Connected ministry systems (map plan 4b) ──────────────────────────────
// A ministry's own system of record (a health facility list, a school
// registry, a grid operator's asset register) sends its sites with its own key
// (csf_<prefix>_<secret>, shown once; only its SHA-256 is kept, compared in
// constant time). New sites are proposed under the same checks as a form and
// still need an official to publish them; a site this system sent before is
// updated: a new name or status is applied as a version, a new position waits
// for an official to confirm the move. It never touches sites recorded any
// other way. The system can read back what officials did with its sites.
// Every call is audited with the SHA-256 of what was sent.

export interface SiteFeed {
  id: string; ministryId: string; name: string; prefix: string;
  issuedAt: string; issuedBy: string; revokedAt?: string; revokedBy?: string;
  calls: number; lastCallAt?: string; lastResult?: string;
}
interface SiteFeedDb { feeds: SiteFeed[]; hashes: Record<string, string> }
const gf = globalThis as unknown as { __civicosSiteFeeds?: SiteFeedDb };
const feedsDb = (): SiteFeedDb => (gf.__civicosSiteFeeds ??= { feeds: [], hashes: {} });
const SITE_KEY = /^csf_([0-9a-f]{8})_[0-9a-f]{40}$/;
const hash = (v: string) => createHash('sha256').update(v).digest('hex');
export const MAX_FEED_SITES = 2000;

export function listSiteFeeds(ministryId: string): SiteFeed[] {
  return feedsDb().feeds.filter(f => f.ministryId === ministryId).map(f => ({ ...f }));
}

/** Connect a ministry system: returns its key once. */
export function issueSiteFeed(ministryId: string, name: string | undefined, by: string | undefined): { feed: SiteFeed; key: string } | { error: string } {
  const m = getMinistry(ministryId);
  if (!m) return { error: 'No such institution' };
  const who = by?.trim();
  if (!who) return { error: 'Name the official connecting the system' };
  const label = clean(name, 80);
  if (!label) return { error: 'Name the system (e.g. Master Facility List)' };
  if (!db().policy.methods.includes('system-feed')) return { error: 'The nation does not accept sites from connected systems: change the facility policy first' };
  if (feedsDb().feeds.some(f => f.ministryId === ministryId && !f.revokedAt && f.name.toLowerCase() === label.toLowerCase())) return { error: 'A connected system already has that name' };
  const hex = randomBytes(24).toString('hex');
  const prefix = hex.slice(0, 8);
  const key = `csf_${prefix}_${hex.slice(8)}`;
  const feed: SiteFeed = { id: `SFEED-${randomUUID().slice(0, 8)}`, ministryId, name: label, prefix, issuedAt: now(), issuedBy: who, calls: 0 };
  feedsDb().feeds.push(feed);
  feedsDb().hashes[feed.id] = hash(key);
  recordAudit(who, 'facility.feed.issue', `SiteFeed:${feed.id}`, 'ok', `${m.name} · ${label} · csf_${prefix}…`);
  return { feed: { ...feed }, key };
}

export function revokeSiteFeed(ministryId: string, feedId: string, by: string | undefined): SiteFeed | { error: string } {
  const f = feedsDb().feeds.find(x => x.id === feedId && x.ministryId === ministryId);
  if (!f) return { error: 'No such connected system' };
  if (!by?.trim()) return { error: 'Name the official disconnecting the system' };
  if (f.revokedAt) return { error: 'This system is already disconnected' };
  Object.assign(f, { revokedAt: now(), revokedBy: by.trim() });
  delete feedsDb().hashes[f.id];
  recordAudit(by.trim(), 'facility.feed.revoke', `SiteFeed:${f.id}`, 'ok', `${f.name} · csf_${f.prefix}…`);
  return { ...f };
}

/** The connected system a key belongs to, for this ministry; null for anything else. */
export function siteFeedForKey(ministryId: string, authorization: string | null | undefined): SiteFeed | null {
  const key = (authorization ?? '').replace(/^Bearer\s+/i, '').trim();
  const m = SITE_KEY.exec(key);
  if (!m) return null;
  const want = Buffer.from(hash(key), 'hex');
  for (const f of feedsDb().feeds) {
    if (f.ministryId !== ministryId || f.revokedAt || f.prefix !== m[1]) continue;
    const h = feedsDb().hashes[f.id];
    if (!h) continue;
    const have = Buffer.from(h, 'hex');
    if (have.length === want.length && timingSafeEqual(have, want)) return f;
  }
  return null;
}

const feedActor = (f: SiteFeed) => `Connected system: ${f.name} (csf_${f.prefix}…)`;

/** Receive sites from a connected system; answers per site, by position in the list. */
export async function receiveSiteFeed(feed: SiteFeed, body: unknown, raw: string): Promise<{ added: number; updated: number; movesWaiting: number; unchanged: number; refused: { index: number; ref?: string; reason: string }[] } | { error: string }> {
  const list = (body as { sites?: unknown } | null)?.sites;
  const f = feedsDb().feeds.find(x => x.id === feed.id)!;
  f.calls++; f.lastCallAt = now();
  if (!Array.isArray(list)) { f.lastResult = 'refused: no sites list'; return { error: 'Send { "sites": [ … ] }' }; }
  if (list.length > MAX_FEED_SITES) { f.lastResult = 'refused: too many sites'; return { error: `A call takes at most ${MAX_FEED_SITES} sites` }; }
  const actor = feedActor(feed);
  const out = { added: 0, updated: 0, movesWaiting: 0, unchanged: 0, refused: [] as { index: number; ref?: string; reason: string }[] };
  for (const [index, item] of list.entries()) {
    const it = (item ?? {}) as Record<string, unknown>;
    const ref = clean(it.ref, 80);
    if (!ref) { out.refused.push({ index, reason: 'Each site needs "ref", this system\'s own id for it' }); continue; }
    const existing = db().facilities.find(x => x.source.feedId === feed.id && x.source.ref === ref);
    if (!existing) {
      const res = await proposeFacility(feed.ministryId, {
        name: clean(it.name), category: clean(it.category, 40), lat: Number(it.lat), lng: Number(it.lng),
        accuracyM: it.accuracyM != null ? Number(it.accuracyM) : undefined, method: 'system-feed', status: it.status as FacilityStatus,
        region: clean(it.region) || undefined, operator: clean(it.operator) || undefined,
        ids: { [`${feed.name}`]: ref, ...(clean(it.code, 80) && categoryOf(clean(it.category, 40)) ? { [categoryOf(clean(it.category, 40))!.scheme]: clean(it.code, 80) } : {}) },
        confirmDuplicate: it.confirmDuplicate === true,
      }, actor, { kind: 'feed', feedId: feed.id, ref });
      if ('error' in res) out.refused.push({ index, ref, reason: res.error });
      else out.added++;
      continue;
    }
    if (existing.state === 'withdrawn') { out.refused.push({ index, ref, reason: 'An official withdrew this site; it is not changed from the system' }); continue; }
    let changed = false;
    const name = clean(it.name);
    if (name && name !== existing.name) { existing.name = name; pushVersion(existing, actor, `renamed by ${feed.name}`); changed = true; }
    if (it.status && STATUSES.includes(it.status as FacilityStatus) && it.status !== existing.status) {
      existing.status = it.status as FacilityStatus; pushVersion(existing, actor, `status ${existing.status} from ${feed.name}`); changed = true;
    }
    const lat = Number(it.lat), lng = Number(it.lng);
    if (Number.isFinite(lat) && Number.isFinite(lng) && (Math.abs(lat - existing.location.lat) > 1e-6 || Math.abs(lng - existing.location.lng) > 1e-6)) {
      const moved = await actOnFacility(existing.id, { action: 'move', lat, lng, method: 'system-feed', accuracyM: it.accuracyM != null ? Number(it.accuracyM) : undefined, reason: `Position updated in ${feed.name}` }, actor);
      if ('error' in moved) out.refused.push({ index, ref, reason: moved.error });
      else { out.movesWaiting++; changed = true; }
    }
    if (changed) out.updated++; else out.unchanged++;
  }
  f.lastResult = `${out.added} added, ${out.updated} updated, ${out.refused.length} refused`;
  recordAudit(actor, 'facility.feed.receive', `SiteFeed:${feed.id}`, out.refused.length && !out.added && !out.updated ? 'error' : 'ok', `${f.lastResult} · sha256 ${hash(raw).slice(0, 12)}…`);
  return out;
}

/** What officials did with this system's sites since a time: so both sides agree. */
export function siteFeedChanges(feed: SiteFeed, since: string | null): { sites: { ref: string; id: string; nationalId?: string; state: Facility['state']; certification: Facility['certification']['state']; moveWaiting: boolean; lastChange: string }[] } | { error: string } {
  const t = since ? Date.parse(since) : 0;
  if (since && Number.isNaN(t)) return { error: 'since must be a date-time' };
  return {
    sites: db().facilities.filter(x => x.source.feedId === feed.id)
      .map(x => ({ ref: x.source.ref!, id: x.id, ...(x.ids[NATIONAL_ID] ? { nationalId: x.ids[NATIONAL_ID] } : {}), state: x.state, certification: x.certification.state, moveWaiting: !!x.pendingVersion, lastChange: x.versions.at(-1)?.at ?? x.proposedAt }))
      .filter(x => Date.parse(x.lastChange) >= t),
  };
}

// ── Open-data candidates (map plan 4c) ────────────────────────────────────
// Open datasets (OpenStreetMap exports via HDX, healthsites.io, OurAirports,
// power plant databases) suggest sites; they are never published from there.
// Each dataset is loaded with its publisher and licence (share-alike licences
// are flagged: ODbL obliges sharing a derived database under the same terms),
// from an uploaded file or fetched by the server from the address given (that
// host only, under the platform's fetch rules). Each candidate inside the
// nation waits for an official: confirm it as a new site of their institution
// (checked like a form), link it to a site already recorded (its identifier
// goes into the site's crosswalk), or reject it with a reason.

export interface OpenSource {
  id: string; name: string; publisher: string; licence: string; shareAlike: boolean; url?: string;
  loadedAt: string; loadedBy: string; sha256: string; rows: number; candidates: number; refused: { row: number; reason: string }[];
}
export interface Candidate {
  id: string; sourceId: string; name: string; category: string; lng: number; lat: number;
  ref?: string; region?: string; regionCode?: string;
  /** A recorded site of the same kind close by, offered for linking. */
  match?: { id: string; name: string; metres: number };
  /** How its kind of site was known: the dataset's category column, its OpenStreetMap tags, or the kind chosen for the whole dataset. */
  kindFrom?: 'category' | 'osm' | 'dataset';
  state: 'open' | 'confirmed' | 'linked' | 'rejected';
  decidedBy?: string; decidedAt?: string; facilityId?: string; reason?: string;
}
interface OpenDb { sources: OpenSource[]; candidates: Candidate[]; seq: number }
const go = globalThis as unknown as { __civicosOpenSites?: OpenDb };
const openDb = (): OpenDb => (go.__civicosOpenSites ??= { sources: [], candidates: [], seq: 1 });
export const SHARE_ALIKE = /odbl|share.?alike|cc.?by.?sa/i;
export const MAX_CANDIDATES = 5000;

export function listOpenSources(): OpenSource[] { return openDb().sources.map(x => structuredClone(x)); }
export function listCandidates(filter: { state?: Candidate['state'] | 'all'; sourceId?: string; category?: string } = {}): Candidate[] {
  return openDb().candidates
    .filter(c => (filter.state ?? 'open') === 'all' || c.state === (filter.state ?? 'open'))
    .filter(c => !filter.sourceId || c.sourceId === filter.sourceId)
    .filter(c => !filter.category || c.category === filter.category)
    .map(c => ({ ...c }));
}

/** Load an open dataset as candidates: every row checked, those outside the nation refused. */
export async function loadOpenSource(input: { name?: string; publisher?: string; licence?: string; url?: string; text?: string; format?: 'csv' | 'geojson' | 'gpx'; category?: string },
  by: string, deps: { fetch?: typeof fetch; resolve?: (h: string) => Promise<string[]> } = {}): Promise<OpenSource | { error: string }> {
  if (!by.trim()) return { error: 'Name the official loading the dataset' };
  if (!db().policy.methods.includes('open-data')) return { error: 'The nation does not accept open-data candidates: change the facility policy first' };
  const name = clean(input.name, 120), publisher = clean(input.publisher, 120), licence = clean(input.licence, 120);
  if (!name || !publisher) return { error: 'Give the dataset a name and its publisher' };
  if (!licence) return { error: 'Record the dataset\'s licence (e.g. ODbL 1.0, CC BY 4.0, public domain)' };
  const fallback = input.category ? categoryOf(input.category)?.key : undefined;
  if (input.category && !fallback) return { error: 'Unknown category' };
  let text = input.text ?? '';
  let url: string | undefined;
  if (!text && input.url) {
    try { const u = new URL(input.url); if (u.protocol !== 'https:' && u.protocol !== 'http:') throw 0; url = u.href; } catch { return { error: 'Give the dataset\'s address (http or https) or upload the file' }; }
    const host = new URL(url).host;
    try {
      text = (await safeFetchText(url, { allow: u => u.host === host, accept: 'application/geo+json, application/json, text/csv, application/gpx+xml, */*;q=0.1', types: /json|csv|xml|gpx|text\/plain|octet-stream/i, maxBytes: 10_000_000, fetch: deps.fetch, resolve: deps.resolve })).text;
    } catch (e) { return { error: `The dataset could not be fetched: ${(e as Error).message}` }; }
  }
  if (!text.trim()) return { error: 'Upload the file or give its address' };
  const format = input.format ?? (/^\s*[{[]/.test(text) ? 'geojson' : /<gpx|<wpt/i.test(text) ? 'gpx' : 'csv');
  const rows = readSitesFile(text, format);
  if ('error' in rows) return rows;
  if (rows.length > MAX_CANDIDATES) return { error: `More than ${MAX_CANDIDATES} rows: filter the dataset to the nation and one kind of site` };
  const src: OpenSource = {
    id: `OSRC-${openDb().seq++}`, name, publisher, licence, shareAlike: SHARE_ALIKE.test(licence), ...(url ? { url } : {}),
    loadedAt: now(), loadedBy: by.trim(), sha256: createHash('sha256').update(text).digest('hex'), rows: rows.length, candidates: 0, refused: [],
  };
  for (const [i, r] of rows.entries()) {
    const row = format === 'csv' ? i + 2 : i + 1;
    const refuse = (reason: string) => { if (src.refused.length < 200) src.refused.push({ row, reason }); };
    if (r._geometry) { refuse(`A ${r._geometry} is not a point`); continue; }
    const own = categoryOf((r.category ?? '').trim().toLowerCase())?.key;
    const osm = own ? undefined : categoryFromOsm(r);
    const cat = own ?? osm ?? fallback;
    if (!cat) { refuse(`"${r.category ?? ''}" is not a category, and no OpenStreetMap tag says what it is (choose one for the whole dataset)`); continue; }
    const kindFrom: Candidate['kindFrom'] = own ? 'category' : osm ? 'osm' : 'dataset';
    const lat = Number(String(r.latitude ?? '').replace(',', '.')), lng = Number(String(r.longitude ?? '').replace(',', '.'));
    const nm = clean(r.name) || `Unnamed ${categoryOf(cat)!.label.toLowerCase()}`;
    const check = await checkLocation({ lng, lat, category: cat, name: nm });
    if (!check.ok) { refuse(check.errors[0]!); continue; }
    if (!check.place.inside) { refuse('Outside the national boundary'); continue; }
    const ref = clean(r.code ?? r.id ?? r['@id'] ?? r.osm_id ?? r.uuid, 80);
    if (ref && openDb().candidates.some(c => c.sourceId !== src.id && c.ref === ref && openDb().sources.find(s => s.id === c.sourceId)?.name === name)) { refuse('Already loaded from this dataset'); continue; }
    const m = check.duplicates[0];
    openDb().candidates.push({
      id: `CAND-${openDb().seq++}`, sourceId: src.id, name: nm, category: cat, lng, lat, ...(ref ? { ref } : {}),
      region: check.place.region, regionCode: check.place.regionCode, ...(m ? { match: m } : {}), kindFrom, state: 'open',
    });
    src.candidates++;
  }
  openDb().sources.unshift(src);
  recordAudit(src.loadedBy, 'facility.open.load', `OpenSource:${src.id}`, src.candidates ? 'ok' : 'error', `${name} (${publisher}; ${licence}) · ${src.candidates} of ${src.rows} rows · sha256 ${src.sha256.slice(0, 12)}…`);
  return structuredClone(src);
}

/** An official decides a candidate: confirm as a new site of an institution, link to a recorded site, or reject. */
export async function decideCandidate(id: string, d: { decision: 'confirm'; ministryId: string; name?: string; status?: FacilityStatus } | { decision: 'link'; facilityId: string } | { decision: 'reject'; reason?: string }, by: string): Promise<Candidate | { error: string }> {
  const c = openDb().candidates.find(x => x.id === id);
  if (!c) return { error: 'No such candidate' };
  if (c.state !== 'open') return { error: `This candidate is already ${c.state}` };
  if (!by.trim()) return { error: 'Name the official deciding' };
  const src = openDb().sources.find(s => s.id === c.sourceId)!;
  if (d.decision === 'reject') {
    if (!clean(d.reason, 300)) return { error: 'Say why the candidate is rejected' };
    Object.assign(c, { state: 'rejected', decidedBy: by.trim(), decidedAt: now(), reason: clean(d.reason, 300) });
  } else if (d.decision === 'link') {
    const f = db().facilities.find(x => x.id === d.facilityId);
    if (!f || f.state === 'withdrawn') return { error: 'No such site' };
    if (f.category !== c.category) return { error: 'The candidate is a different kind of site' };
    if (c.ref && src.name !== NATIONAL_ID) { f.ids[src.name] = c.ref; gridUpdate(f); }
    pushVersion(f, by.trim(), `linked to ${src.name}${c.ref ? ` (${c.ref})` : ''}`);
    Object.assign(c, { state: 'linked', decidedBy: by.trim(), decidedAt: now(), facilityId: f.id });
  } else {
    const res = await proposeFacility(d.ministryId, {
      name: clean(d.name) || c.name, category: c.category, lng: c.lng, lat: c.lat, method: 'open-data', status: d.status,
      ids: c.ref ? { [src.name]: c.ref } : {}, confirmDuplicate: true, note: `From ${src.name} (${src.publisher}; ${src.licence})`,
    }, by, { kind: 'candidate', candidateId: c.id });
    if ('error' in res) return { error: res.error };
    Object.assign(c, { state: 'confirmed', decidedBy: by.trim(), decidedAt: now(), facilityId: res.facility.id });
  }
  recordAudit(by.trim(), `facility.open.${c.state}`, `Candidate:${c.id}`, 'ok', `${c.name} · ${src.name}${c.reason ? ` · ${c.reason}` : ''}`);
  return { ...c };
}

export function resetOpenSites(): void { go.__civicosOpenSites = undefined; }
