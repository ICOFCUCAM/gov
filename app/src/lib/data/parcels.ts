// The land parcel register — the nation's cadastre (docs/PARCEL_REGISTER.md;
// architecture review G4). Modelled on the national facility register
// (lib/data/facilities.ts) and the boundary versions (lib/data/boundaries.ts),
// in the words of LADM (ISO 19152): each parcel is a spatial unit (its
// outline, area and survey) held as one basic administrative unit (the
// national parcel id) with its rights, restrictions and responsibilities,
// each with a holder, a share and the document it rests on.
//
// The nation decides the rules (its parcel policy, changed four-eyes by
// administrators): which institution is the cadastre authority, the format
// of the national parcel id, whether an overlap with a published parcel is
// refused or flagged and above what area, and which survey methods count
// (fit-for-purpose land administration: general boundaries from imagery or
// walked with the community beside fixed surveyed ones, each with its
// accuracy).
//
// A parcel is recorded by one official of the cadastre authority and
// published by a different one; an amendment waits for a second official;
// withdrawal needs a reason; every change is a version; every step is on the
// audit chain. The outline is checked (lib/geo/parcel-geometry.ts): closed,
// not crossing itself, its area computed, never typed; inside the nation;
// region and district from the boundary version in force (placePoint()),
// never typed; overlaps with published parcels by area. Gaps are not
// checked: an incomplete cadastre is normal.
//
// Holders are personal data. Rights and holders are returned only by
// viewParcel() with `rights: true` (the routes decide it with
// canSeeParcelRights() in lib/auth/roles.ts); publicParcel() — the only shape
// tiles, the OGC collection, lists and exports read — has no rights field at
// all, and audit entries never carry a holder's name or reference.
// Parcel records change through the persistence port (parcelRepo); the
// policy, its changes and loads are the store's own records.

import { createHash, randomUUID } from 'node:crypto';
import { getMinistry, listMinistries, recordAudit } from '@/lib/data/store';
import { parcelRepo } from '@/lib/data/repo';
import { touch } from '@/lib/data/repo/track';
import { withDefaults } from '@/lib/data/defaults';
import { placePoint } from '@/lib/data/facilities';
import { readBoundaryFile, detectFormat, type BoundaryFormat, type Feature } from '@/lib/geo/boundary-files';
import { readCrs, toWgs84 } from '@/lib/geo/crs';
import {
  boxesMeet, interiorPoint, overlapAreaM2, readParcelGeometry,
  type BBox, type MultiPolygonGeom,
} from '@/lib/geo/parcel-geometry';

export type { MultiPolygonGeom, BBox };

// ── Vocabulary ────────────────────────────────────────────────────────────

export type LandUse = 'residential' | 'agricultural' | 'commercial' | 'industrial' | 'public-service' | 'transport' | 'conservation' | 'water' | 'mixed' | 'vacant' | 'other';
/** Land use, at the top level of the HILUCS classification INSPIRE uses. */
export const LAND_USES: { key: LandUse; label: string }[] = [
  { key: 'residential', label: 'Residential' },
  { key: 'agricultural', label: 'Agricultural' },
  { key: 'commercial', label: 'Commercial' },
  { key: 'industrial', label: 'Industrial' },
  { key: 'public-service', label: 'Public service' },
  { key: 'transport', label: 'Transport' },
  { key: 'conservation', label: 'Conservation or forest' },
  { key: 'water', label: 'Water' },
  { key: 'mixed', label: 'Mixed use' },
  { key: 'vacant', label: 'Not in use' },
  { key: 'other', label: 'Other' },
];
export const isLandUse = (v: unknown): v is LandUse => LAND_USES.some(l => l.key === v);

export type SurveyMethod = 'field-survey' | 'gnss-survey' | 'imagery' | 'general-boundary' | 'handheld-gps' | 'scanned-map' | 'cadastral-import';
/** How a parcel's outline was surveyed (LADM LA_SpatialSource), with the accuracy each typically gives. */
export const SURVEY_METHODS: { key: SurveyMethod; label: string; how: string; typicalAccuracyM: number }[] = [
  { key: 'field-survey', label: 'Field survey (fixed boundary)', how: 'A licensed surveyor measured the beacons with a total station.', typicalAccuracyM: 0.05 },
  { key: 'gnss-survey', label: 'Survey-grade GNSS', how: 'Beacons measured with RTK or static GNSS.', typicalAccuracyM: 0.1 },
  { key: 'imagery', label: 'Digitised from imagery (general boundary)', how: 'Visible boundaries traced on aerial, drone or satellite imagery (fit-for-purpose).', typicalAccuracyM: 1 },
  { key: 'general-boundary', label: 'Walked with the community (general boundary)', how: 'Boundaries walked and agreed with neighbours and recorded on site.', typicalAccuracyM: 3 },
  { key: 'handheld-gps', label: 'Handheld GPS', how: 'Corners recorded with a phone or handheld GPS.', typicalAccuracyM: 5 },
  { key: 'scanned-map', label: 'Digitised from a scanned map', how: 'Traced from a registry index map or old survey sheet.', typicalAccuracyM: 10 },
  { key: 'cadastral-import', label: 'Existing cadastral data', how: 'Loaded from the authority\'s existing cadastral system or files.', typicalAccuracyM: 1 },
];
export const isSurveyMethod = (v: unknown): v is SurveyMethod => SURVEY_METHODS.some(m => m.key === v);

export type Rrr = 'right' | 'restriction' | 'responsibility';
export type RightType = 'ownership' | 'customary' | 'leasehold' | 'occupancy' | 'usufruct' | 'easement' | 'mortgage' | 'caveat' | 'use-restriction' | 'maintenance';
/** Rights, restrictions and responsibilities (LADM LA_RRR); ownership-type rights carry shares that add up to at most one. */
export const RIGHT_TYPES: { key: RightType; label: string; rrr: Rrr; ownership?: boolean }[] = [
  { key: 'ownership', label: 'Ownership (freehold)', rrr: 'right', ownership: true },
  { key: 'customary', label: 'Customary tenure', rrr: 'right', ownership: true },
  { key: 'leasehold', label: 'Leasehold', rrr: 'right' },
  { key: 'occupancy', label: 'Occupancy', rrr: 'right' },
  { key: 'usufruct', label: 'Usufruct (use and income)', rrr: 'right' },
  { key: 'easement', label: 'Easement or right of way', rrr: 'right' },
  { key: 'mortgage', label: 'Mortgage or charge', rrr: 'restriction' },
  { key: 'caveat', label: 'Caveat', rrr: 'restriction' },
  { key: 'use-restriction', label: 'Restriction on use', rrr: 'restriction' },
  { key: 'maintenance', label: 'Maintenance duty', rrr: 'responsibility' },
];
export type HolderKind = 'person' | 'group' | 'organisation' | 'state' | 'community' | 'unknown';
export const HOLDER_KINDS: { key: HolderKind; label: string }[] = [
  { key: 'person', label: 'A person' }, { key: 'group', label: 'Several people together' }, { key: 'organisation', label: 'A company or organisation' },
  { key: 'state', label: 'The state or a public body' }, { key: 'community', label: 'A community' }, { key: 'unknown', label: 'Not yet known' },
];
export type SourceKind = 'title' | 'survey-plan' | 'lease' | 'court-order' | 'adjudication' | 'customary-record' | 'other';
export const SOURCE_KINDS: { key: SourceKind; label: string }[] = [
  { key: 'title', label: 'Title or deed' }, { key: 'survey-plan', label: 'Survey plan' }, { key: 'lease', label: 'Lease agreement' }, { key: 'court-order', label: 'Court order' },
  { key: 'adjudication', label: 'Adjudication record' }, { key: 'customary-record', label: 'Customary record' }, { key: 'other', label: 'Other document' },
];

// ── Records ───────────────────────────────────────────────────────────────

/** One right, restriction or responsibility: personal data (holder, holder reference). */
export interface ParcelRight {
  rrr: Rrr;
  type: RightType;
  holderKind: HolderKind;
  holder: string;
  /** The holder's identifier where the authority keeps one (national id, company number). */
  holderRef?: string;
  /** A fraction "n/d" (ownership-type rights add up to at most one). */
  share?: string;
  source: { kind: SourceKind; ref: string; date?: string };
}

export interface ParcelSurvey {
  method: SurveyMethod;
  accuracyM: number;
  surveyedAt?: string;
  surveyor?: string;
  /** The survey plan or field sheet reference. */
  planRef?: string;
  /** The national grid or other system the outline was given in, and the exact transformation to WGS 84 (lib/geo/crs.ts). */
  sourceCrs?: { name: string; epsg?: number; transformation: string };
}

/** Worked out from the map (the boundary version in force) at an interior point; never typed. */
export interface ParcelPlace { regionCode?: string; region?: string; districtCode?: string; district?: string; inside: boolean; at: [number, number] }
export interface ParcelOverlap { id: string; parcelId: string; areaM2: number }

export interface ParcelVersion {
  n: number; at: string; by: string; what: string;
  parcelId: string; landUse: LandUse; areaM2: number; geometry: MultiPolygonGeom; survey: ParcelSurvey; rights: ParcelRight[];
}

/** A change to a published parcel, waiting for a second official. */
export interface ParcelAmendment {
  geometry: MultiPolygonGeom; areaM2: number; bbox: BBox; place: ParcelPlace; landUse: LandUse; survey: ParcelSurvey; rights: ParcelRight[];
  overlaps: ParcelOverlap[]; reason: string; proposedBy: string; proposedAt: string;
}

export interface Parcel {
  /** The platform's record number (PCL-000001). */
  id: string;
  /** The national parcel id (LADM BAUnit / INSPIRE nationalCadastralReference), in the policy's format. */
  parcelId: string;
  geometry: MultiPolygonGeom;
  /** Computed from the outline (m²), never typed. */
  areaM2: number;
  bbox: BBox;
  survey: ParcelSurvey;
  place: ParcelPlace;
  landUse: LandUse;
  /** Personal data: shown only to viewers with need. */
  rights: ParcelRight[];
  state: 'proposed' | 'published' | 'withdrawn';
  recordedBy: string; recordedAt: string;
  publishedBy?: string; publishedAt?: string;
  withdrawnBy?: string; withdrawnAt?: string; withdrawReason?: string;
  /** Overlaps with published parcels above the tolerance, kept when the policy flags instead of refusing. */
  overlaps: ParcelOverlap[];
  source: { kind: 'form' | 'import'; importId?: string; sha256?: string; row?: number };
  pending?: ParcelAmendment;
  versions: ParcelVersion[];
  note?: string;
}

export interface ParcelPolicy {
  /** The institution (registry id) acting as cadastre authority. */
  authorityId?: string;
  /** The national parcel id format: an anchored regular expression. */
  idPattern: string;
  idExample: string;
  /** An overlap with a published parcel above the tolerance is refused, or recorded and flagged. */
  overlap: 'refuse' | 'flag';
  toleranceM2: number;
  methods: SurveyMethod[];
  version: number;
  decidedBy?: string[];
  decidedAt?: string;
}

export interface ParcelPolicyChange {
  id: string;
  patch: Partial<Pick<ParcelPolicy, 'authorityId' | 'idPattern' | 'idExample' | 'overlap' | 'toleranceM2' | 'methods'>>;
  reason: string; proposedBy: string; proposedAt: string;
  state: 'pending' | 'confirmed' | 'withdrawn';
  decidedBy?: string; decidedAt?: string;
  baseVersion: number;
}

export interface ParcelImport {
  id: string; by: string; at: string; format: BoundaryFormat; sha256: string;
  rows: number; accepted: number; refused: { row: number; reason: string }[]; parcelIds: string[];
  crs?: { name: string; epsg?: number; transformation?: string };
  notes: string[];
  withdrawn?: { by: string; at: string; reason: string; count: number };
}

interface Db { parcels: Parcel[]; policy: ParcelPolicy; changes: ParcelPolicyChange[]; imports: ParcelImport[]; seq: number; changeSeq: number }

export const DEFAULT_ID_PATTERN = '^[A-Z0-9][A-Z0-9/.-]{2,39}$';
const DEFAULT_POLICY: ParcelPolicy = {
  idPattern: DEFAULT_ID_PATTERN, idExample: 'BLOCK12/345', overlap: 'refuse', toleranceM2: 1,
  methods: SURVEY_METHODS.map(m => m.key), version: 1,
};

const g = globalThis as unknown as { __civicosParcels?: Db; __parcelIndex?: ParcelIndex };
const upgraded = new WeakSet<Db>();
const db = (): Db => {
  const d = touch('__civicosParcels', g.__civicosParcels ??= { parcels: [], policy: structuredClone(DEFAULT_POLICY), changes: [], imports: [], seq: 1, changeSeq: 1 });
  if (upgraded.has(d)) return d;
  // Snapshots saved before a field existed get its default (withDefaults fills nested policy fields).
  const filled = withDefaults(d as unknown as Record<string, unknown>, { parcels: [], policy: structuredClone(DEFAULT_POLICY), changes: [], imports: [], seq: 1, changeSeq: 1 } as unknown as Record<string, unknown>) as unknown as Db;
  for (const k of Object.keys(filled) as (keyof Db)[]) if (d[k] === undefined || k === 'policy') (d as unknown as Record<string, unknown>)[k] = filled[k];
  upgraded.add(d);
  return d;
};
const repo = () => parcelRepo(db);
export function resetParcels(): void { g.__civicosParcels = undefined; g.__parcelIndex = undefined; }

const now = () => new Date().toISOString();
const clean = (s: unknown, max = 160) => String(s ?? '').replace(/[\u0000-\u001f]/g, ' ').trim().slice(0, max);

// ── Spatial index ─────────────────────────────────────────────────────────
// Cells of CELL degrees (about 1 km) holding every parcel whose box meets
// them (parcels wider than 64 cells go in `large`, read by every query), and
// the parcel ids. Derived, never persisted: rebuilt when the parcel list is
// not the one it was built from (a restored snapshot, another instance's
// change in postgres mode) or changed length. `generation` changes with
// every change to the published parcels: the tiles' cache and ETags key on it.

const CELL = 0.01;
interface ParcelIndex { ref: Parcel[]; count: number; build: number; changes: number; cells: Map<string, Parcel[]>; large: Set<Parcel>; at: Map<Parcel, string[]>; ids: Map<string, Parcel[]>; order: Map<string, number> }
let builds = 0;
const cellsOf = (b: BBox): string[] | null => {
  const [x0, y0, x1, y1] = [Math.floor(b[0] / CELL), Math.floor(b[1] / CELL), Math.floor(b[2] / CELL), Math.floor(b[3] / CELL)];
  if ((x1 - x0 + 1) * (y1 - y0 + 1) > 64) return null;
  const out: string[] = [];
  for (let x = x0; x <= x1; x++) for (let y = y0; y <= y1; y++) out.push(`${x},${y}`);
  return out;
};
function indexAdd(ix: ParcelIndex, p: Parcel): void {
  const cells = cellsOf(p.bbox);
  if (!cells) ix.large.add(p);
  else { for (const c of cells) (ix.cells.get(c) ?? ix.cells.set(c, []).get(c)!).push(p); ix.at.set(p, cells); }
  if (!ix.order.has(p.id)) ix.order.set(p.id, ix.order.size);
  const k = p.parcelId.toUpperCase();
  const a = ix.ids.get(k) ?? ix.ids.set(k, []).get(k)!;
  if (!a.includes(p)) a.push(p);
}
function indexRemove(ix: ParcelIndex, p: Parcel): void {
  ix.large.delete(p);
  for (const c of ix.at.get(p) ?? []) { const a = ix.cells.get(c); if (a) { const i = a.indexOf(p); if (i >= 0) a.splice(i, 1); if (!a.length) ix.cells.delete(c); } }
  ix.at.delete(p);
  for (const [k, a] of ix.ids) { const i = a.indexOf(p); if (i >= 0) { a.splice(i, 1); if (!a.length) ix.ids.delete(k); } }
}
function index(): ParcelIndex {
  const list = db().parcels;
  let ix = g.__parcelIndex;
  if (!ix || ix.ref !== list || ix.count !== list.length) {
    ix = { ref: list, count: 0, build: ++builds, changes: 0, cells: new Map(), large: new Set(), at: new Map(), ids: new Map(), order: new Map() };
    for (const p of list) indexAdd(ix, p);
    ix.count = list.length;
    g.__parcelIndex = ix;
  }
  return ix;
}
/** A parcel's outline or id changed (or it was added): re-file it. */
function reindex(p: Parcel, added = false): void {
  const list = db().parcels, ix = g.__parcelIndex;
  if (added && ix && ix.ref === list && ix.count === list.length - 1 && list[list.length - 1] === p) { indexAdd(ix, p); ix.count = list.length; ix.changes++; return; }
  const i = index();
  indexRemove(i, p); indexAdd(i, p); i.changes++;
}
/** Changes when anything published changes (tiles key their cache and ETags on it). */
export function parcelGeneration(): string { const ix = index(); return `${ix.build}.${ix.changes}`; }

/** Parcels whose box meets a box (any state), in register order. */
function parcelsMeeting(b: BBox): Parcel[] {
  const ix = index();
  const [x0, y0, x1, y1] = [Math.floor(b[0] / CELL), Math.floor(b[1] / CELL), Math.floor(b[2] / CELL), Math.floor(b[3] / CELL)];
  const out = new Set<Parcel>();
  const take = (a: Parcel[]) => { for (const p of a) if (boxesMeet(p.bbox, b)) out.add(p); };
  if ((x1 - x0 + 1) * (y1 - y0 + 1) > ix.cells.size) {
    for (const [k, a] of ix.cells) { const c = k.indexOf(','); const x = Number(k.slice(0, c)), y = Number(k.slice(c + 1)); if (x >= x0 && x <= x1 && y >= y0 && y <= y1) take(a); }
  } else for (let x = x0; x <= x1; x++) for (let y = y0; y <= y1; y++) { const a = ix.cells.get(`${x},${y}`); if (a) take(a); }
  take([...ix.large]);
  return [...out].sort((p, q) => ix.order.get(p.id)! - ix.order.get(q.id)!);
}

/** Published parcels whose box meets a box, in register order (tiles, OGC bbox). */
export function publishedInBox(b: BBox): Parcel[] { return parcelsMeeting(b).filter(p => p.state === 'published'); }

// ── Policy ────────────────────────────────────────────────────────────────

export function parcelPolicy(): ParcelPolicy { return structuredClone(db().policy); }
export function parcelPolicyChanges(): ParcelPolicyChange[] { return db().changes.map(c => structuredClone(c)); }

/** The cadastre authority's institution, when the nation has named one. */
export function cadastreAuthority(): { id: string; name: string } | null {
  const id = db().policy.authorityId;
  const m = id ? listMinistries().find(x => x.id === id) : undefined;
  return m ? { id: m.id, name: m.name } : null;
}

/** The id format as a regular expression, or why it cannot be one. */
export function idFormat(pattern: string): RegExp | { error: string } {
  if (!pattern.startsWith('^') || !pattern.endsWith('$')) return { error: 'The parcel id format must match the whole id: start it with ^ and end it with $' };
  if (pattern.length > 200) return { error: 'The parcel id format is longer than 200 characters' };
  try { return new RegExp(pattern); } catch { return { error: 'The parcel id format is not a valid regular expression' }; }
}

/** An administrator proposes a change to the nation's parcel policy; a different administrator confirms it. */
export function proposeParcelPolicyChange(input: { patch?: ParcelPolicyChange['patch']; reason?: string }, by: string): ParcelPolicyChange | { error: string } {
  if (!by.trim()) return { error: 'Name the official proposing the change' };
  const reason = clean(input.reason, 400);
  if (!reason) return { error: 'Say why the policy should change' };
  const p = input.patch ?? {};
  const out: ParcelPolicyChange['patch'] = {};
  if (p.authorityId !== undefined) {
    if (p.authorityId && !getMinistry(p.authorityId)) return { error: 'The cadastre authority must be an institution in the registry' };
    out.authorityId = p.authorityId || undefined;
  }
  if (p.idPattern !== undefined) {
    const re = idFormat(String(p.idPattern));
    if ('error' in re) return re;
    out.idPattern = String(p.idPattern);
  }
  if (p.idExample !== undefined) out.idExample = clean(p.idExample, 80);
  const pattern = out.idPattern ?? db().policy.idPattern, example = out.idExample ?? db().policy.idExample;
  if ((out.idPattern !== undefined || out.idExample !== undefined) && example && !(idFormat(pattern) as RegExp).test(example)) return { error: `The example "${example}" does not match the parcel id format` };
  if (p.overlap !== undefined) {
    if (p.overlap !== 'refuse' && p.overlap !== 'flag') return { error: 'An overlap is refused or flagged' };
    out.overlap = p.overlap;
  }
  if (p.toleranceM2 !== undefined) {
    const t = Number(p.toleranceM2);
    if (!Number.isFinite(t) || t < 0 || t > 1000) return { error: 'The overlap tolerance is between 0 and 1,000 m²' };
    out.toleranceM2 = t;
  }
  if (p.methods !== undefined) {
    if (!Array.isArray(p.methods) || !p.methods.length || p.methods.some(m => !isSurveyMethod(m))) return { error: 'Choose at least one survey method' };
    out.methods = [...new Set(p.methods)];
  }
  if (!Object.keys(out).length) return { error: 'Nothing to change' };
  const c: ParcelPolicyChange = { id: `PPC-${db().changeSeq++}`, patch: out, reason, proposedBy: by.trim(), proposedAt: now(), state: 'pending', baseVersion: db().policy.version };
  db().changes.unshift(c);
  recordAudit(c.proposedBy, 'parcel.policy.propose', `ParcelPolicy:${c.id}`, 'ok', `${Object.keys(out).join(', ')} — ${reason}`);
  return structuredClone(c);
}

export function decideParcelPolicyChange(id: string, decision: 'confirm' | 'withdraw', by: string): ParcelPolicy | { error: string } {
  const c = db().changes.find(x => x.id === id);
  if (!c) return { error: 'No such policy change' };
  if (c.state !== 'pending') return { error: `This change is already ${c.state}` };
  if (!by.trim()) return { error: 'Name the official deciding' };
  if (decision === 'withdraw') {
    c.state = 'withdrawn'; c.decidedBy = by.trim(); c.decidedAt = now();
    recordAudit(c.decidedBy, 'parcel.policy.withdraw', `ParcelPolicy:${c.id}`, 'ok', '');
    return parcelPolicy();
  }
  if (by.trim() === c.proposedBy) return { error: 'A different administrator must confirm the change' };
  const d = db();
  if (c.baseVersion !== d.policy.version) return { error: 'The policy has changed since this was proposed; propose it again' };
  d.policy = { ...d.policy, ...c.patch, version: d.policy.version + 1, decidedBy: [c.proposedBy, by.trim()], decidedAt: now() };
  if ('authorityId' in c.patch && !c.patch.authorityId) delete d.policy.authorityId;
  c.state = 'confirmed'; c.decidedBy = by.trim(); c.decidedAt = now();
  recordAudit(c.decidedBy, 'parcel.policy.confirm', `ParcelPolicy:${c.id}`, 'ok', `policy v${d.policy.version}`);
  return parcelPolicy();
}

// ── Rights ────────────────────────────────────────────────────────────────

const FRACTION = /^(\d{1,6})\/(\d{1,6})$/;
const fractionOf = (s: string): number | null => { const m = FRACTION.exec(s.trim()); if (!m) return null; const n = Number(m[1]), d = Number(m[2]); return d > 0 && n > 0 && n <= d ? n / d : null; };

/** Read rights from a form or file; the reasons never repeat a holder's name. */
export function readRights(raw: unknown): { rights: ParcelRight[]; warnings: string[] } | { error: string } {
  if (raw === undefined || raw === null || raw === '') return { rights: [], warnings: [] };
  if (!Array.isArray(raw)) return { error: 'Rights are a list' };
  if (raw.length > 50) return { error: 'More than 50 rights on one parcel' };
  const rights: ParcelRight[] = [], warnings: string[] = [];
  let owned = 0;
  for (const [i, r0] of raw.entries()) {
    const r = (r0 ?? {}) as Record<string, unknown>;
    const n = `Right ${i + 1}`;
    const type = RIGHT_TYPES.find(t => t.key === r.type);
    if (!type) return { error: `${n}: choose its type (${RIGHT_TYPES.map(t => t.key).join(', ')})` };
    const holderKind = HOLDER_KINDS.find(h => h.key === (r.holderKind ?? 'unknown'))?.key;
    if (!holderKind) return { error: `${n}: the holder is a person, group, organisation, the state, a community, or not yet known` };
    const holder = clean(r.holder, 200);
    if (!holder && holderKind !== 'unknown') return { error: `${n}: name the holder` };
    const share = clean(r.share, 20);
    if (share && fractionOf(share) === null) return { error: `${n}: the share is a fraction such as 1/2` };
    const src = (r.source ?? {}) as Record<string, unknown>;
    const kind = SOURCE_KINDS.find(s => s.key === (src.kind ?? 'other'))?.key;
    if (!kind) return { error: `${n}: unknown kind of source document` };
    const ref = clean(src.ref, 120);
    if (!ref) return { error: `${n}: give the reference of the document it rests on` };
    const date = clean(src.date, 10);
    if (date && !/^\d{4}-\d{2}-\d{2}$/.test(date)) return { error: `${n}: the document's date is YYYY-MM-DD` };
    if (type.ownership) owned += share ? fractionOf(share)! : 1;
    rights.push({ rrr: type.rrr, type: type.key, holderKind, holder, ...(clean(r.holderRef, 80) ? { holderRef: clean(r.holderRef, 80) } : {}), ...(share ? { share } : {}), source: { kind, ref, ...(date ? { date } : {}) } });
  }
  if (owned > 1 + 1e-9) return { error: 'The ownership shares add up to more than one' };
  if (owned > 0 && owned < 1 - 1e-9) warnings.push(`The ownership shares add up to ${Math.round(owned * 1000) / 1000}, not one`);
  return { rights, warnings };
}

// ── Checks ────────────────────────────────────────────────────────────────

export interface ParcelCheck {
  ok: boolean;
  errors: string[];
  warnings: string[];
  geometry?: MultiPolygonGeom;
  areaM2?: number;
  bbox?: BBox;
  place?: ParcelPlace;
  /** Overlaps with published parcels above the tolerance. */
  overlaps: ParcelOverlap[];
  /** The raster cell size the overlaps were estimated at (m). */
  overlapCellM?: number;
}

/** Overlaps of an outline with published parcels (other than `exceptId`), above the policy's tolerance. */
export function overlapsOf(geometry: MultiPolygonGeom, bbox: BBox, exceptId?: string): { overlaps: ParcelOverlap[]; cellM: number } {
  const tol = db().policy.toleranceM2;
  const out: ParcelOverlap[] = [];
  let cellM = 0;
  for (const p of publishedInBox(bbox)) {
    if (p.id === exceptId) continue;
    const o = overlapAreaM2(geometry, p.geometry);
    cellM = Math.max(cellM, o.cellM);
    if (o.areaM2 > tol) out.push({ id: p.id, parcelId: p.parcelId, areaM2: o.areaM2 });
  }
  return { overlaps: out, cellM };
}

/**
 * Check an outline: its geometry, inside the nation (an interior point; a
 * corner in another district or outside the boundary is flagged), its region
 * and district from the boundary version in force, overlaps with published
 * parcels.
 */
export async function checkParcel(input: { geometry: unknown; exceptId?: string; corners?: boolean }): Promise<ParcelCheck> {
  const read = readParcelGeometry(input.geometry);
  if ('error' in read) return { ok: false, errors: [read.error], warnings: [], overlaps: [] };
  const errors: string[] = [], warnings: string[] = [...read.notes];
  const at = interiorPoint(read.geometry);
  const pt: [number, number] = [Math.round(at[0] * 1e7) / 1e7, Math.round(at[1] * 1e7) / 1e7];
  const located = await placePoint({ lng: pt[0], lat: pt[1], noun: 'parcel', outsideReason: 'parcel' });
  errors.push(...located.errors);
  const place: ParcelPlace = { ...located.place, at: pt };
  if (!errors.length && !place.inside) errors.push('The parcel lies outside the nation as the map draws it');
  // A large parcel's extreme corners: another district, or outside the boundary.
  const [w, s, e, n] = read.bbox;
  const diagonalM = Math.hypot((e - w) * 111_320 * Math.cos((((s + n) / 2) * Math.PI) / 180), (n - s) * 110_574);
  if (!errors.length && (input.corners ?? diagonalM > 500)) {
    const ext = read.geometry.coordinates.flatMap(p => p[0]!);
    const pick = [ext.reduce((a, b) => (b[0] < a[0] ? b : a)), ext.reduce((a, b) => (b[0] > a[0] ? b : a)), ext.reduce((a, b) => (b[1] < a[1] ? b : a)), ext.reduce((a, b) => (b[1] > a[1] ? b : a))];
    const elsewhere = new Set<string>();
    let outside = false;
    for (const c of pick) {
      const q = await placePoint({ lng: c[0], lat: c[1], noun: 'parcel', outsideReason: 'corner' });
      if (!q.place.inside) outside = true;
      else if (q.place.districtCode && place.districtCode && q.place.districtCode !== place.districtCode) elsewhere.add(q.place.district ?? q.place.districtCode);
      else if (q.place.regionCode && q.place.regionCode !== place.regionCode) elsewhere.add(q.place.region ?? q.place.regionCode);
    }
    if (outside) warnings.push('A corner of the parcel lies outside the national boundary as the map draws it');
    if (elsewhere.size) warnings.push(`Part of the parcel lies in ${[...elsewhere].join(', ')}; it is filed under ${place.district ?? place.region ?? 'its interior point'}`);
  }
  const ov = overlapsOf(read.geometry, read.bbox, input.exceptId);
  if (ov.overlaps.length) {
    const text = `Overlaps published parcel${ov.overlaps.length === 1 ? '' : 's'} ${ov.overlaps.map(o => `${o.parcelId} by ${o.areaM2.toLocaleString('en')} m²`).join(', ')} (tolerance ${db().policy.toleranceM2} m², estimated at ${ov.cellM} m cells)`;
    if (db().policy.overlap === 'refuse') errors.push(text); else warnings.push(text);
  }
  return { ok: !errors.length, errors, warnings, geometry: read.geometry, areaM2: read.areaM2, bbox: read.bbox, place, overlaps: ov.overlaps, ...(ov.cellM ? { overlapCellM: ov.cellM } : {}) };
}

/** Check a national parcel id against the policy's format, and that no parcel not withdrawn holds it. */
export function checkParcelId(parcelId: string, exceptId?: string): string | null {
  const id = parcelId.trim();
  if (!id) return 'Give the national parcel id';
  const re = idFormat(db().policy.idPattern);
  if ('error' in re) return re.error;
  if (!re.test(id)) return `"${id.slice(0, 60)}" is not a parcel id in the nation's format (for example ${db().policy.idExample || db().policy.idPattern})`;
  const held = (index().ids.get(id.toUpperCase()) ?? []).find(p => p.id !== exceptId && p.state !== 'withdrawn');
  return held ? `Parcel ${id} is already recorded (${held.id})` : null;
}

// ── Workflow ──────────────────────────────────────────────────────────────

function pushVersion(p: Parcel, by: string, what: string): void {
  p.versions.push({ n: p.versions.length + 1, at: now(), by, what, parcelId: p.parcelId, landUse: p.landUse, areaM2: p.areaM2, geometry: structuredClone(p.geometry), survey: structuredClone(p.survey), rights: structuredClone(p.rights) });
  repo().save(p);
}

function surveyOf(input: { method?: unknown; accuracyM?: unknown; surveyedAt?: unknown; surveyor?: unknown; planRef?: unknown }, sourceCrs?: ParcelSurvey['sourceCrs']): ParcelSurvey | { error: string } {
  const method = input.method ?? 'cadastral-import';
  if (!isSurveyMethod(method)) return { error: 'Unknown survey method' };
  if (!db().policy.methods.includes(method)) return { error: `The nation does not accept "${SURVEY_METHODS.find(m => m.key === method)!.label}" as a survey method` };
  const acc = input.accuracyM === undefined || input.accuracyM === '' ? NaN : Number(input.accuracyM);
  if (input.accuracyM !== undefined && input.accuracyM !== '' && (!Number.isFinite(acc) || acc <= 0 || acc > 1000)) return { error: 'The accuracy is in metres, above 0 and at most 1,000' };
  const at = clean(input.surveyedAt, 30);
  if (at && Number.isNaN(Date.parse(at))) return { error: 'The survey date is not a date' };
  return {
    method, accuracyM: Number.isFinite(acc) ? Math.round(acc * 1000) / 1000 : SURVEY_METHODS.find(m => m.key === method)!.typicalAccuracyM,
    ...(at ? { surveyedAt: new Date(at).toISOString().slice(0, 10) } : {}),
    ...(clean(input.surveyor, 120) ? { surveyor: clean(input.surveyor, 120) } : {}),
    ...(clean(input.planRef, 120) ? { planRef: clean(input.planRef, 120) } : {}),
    ...(sourceCrs ? { sourceCrs } : {}),
  };
}

export interface RecordInput {
  parcelId?: string; geometry?: unknown; landUse?: string; method?: string; accuracyM?: number | string; surveyedAt?: string; surveyor?: string; planRef?: string;
  rights?: unknown; note?: string; areaM2?: unknown;
  /** Set by a load that converted the outline from a declared coordinate system. */
  sourceCrs?: ParcelSurvey['sourceCrs'];
}

/** An official of the cadastre authority records a parcel (who may is checked by the route); a different official publishes it. */
export async function recordParcel(input: RecordInput, by: string, source: Parcel['source'] = { kind: 'form' }): Promise<{ parcel: Parcel; check: ParcelCheck } | { error: string; check?: ParcelCheck }> {
  if (!db().policy.authorityId) return { error: 'The nation has not named its cadastre authority (parcel policy)' };
  if (!by.trim()) return { error: 'Name the official recording the parcel' };
  if (input.areaM2 !== undefined && input.areaM2 !== null && input.areaM2 !== '') return { error: 'The area is computed from the outline, never typed' };
  const parcelId = clean(input.parcelId, 80);
  const idProblem = checkParcelId(parcelId);
  if (idProblem) return { error: idProblem };
  if (!isLandUse(input.landUse)) return { error: 'Choose the land use' };
  const survey = surveyOf(input, input.sourceCrs);
  if ('error' in survey) return survey;
  const rights = readRights(input.rights);
  if ('error' in rights) return rights;
  const check = await checkParcel({ geometry: input.geometry });
  check.warnings.push(...rights.warnings);
  if (!check.ok) return { error: check.errors[0]!, check };
  const p: Parcel = {
    id: `PCL-${String(repo().nextSeq()).padStart(6, '0')}`, parcelId,
    geometry: check.geometry!, areaM2: check.areaM2!, bbox: check.bbox!, survey, place: check.place!, landUse: input.landUse,
    rights: rights.rights, state: 'proposed', recordedBy: by.trim(), recordedAt: now(), overlaps: check.overlaps, source, versions: [],
    ...(clean(input.note, 400) ? { note: clean(input.note, 400) } : {}),
  };
  pushVersion(p, p.recordedBy, 'recorded');
  repo().add(p);
  reindex(p, true);
  recordAudit(p.recordedBy, 'parcel.record', `Parcel:${p.id}`, 'ok', `${p.parcelId}: ${p.areaM2.toLocaleString('en')} m², ${p.landUse}, ${p.rights.length} right${p.rights.length === 1 ? '' : 's'} (${survey.method})${p.overlaps.length ? `, ${p.overlaps.length} overlap flagged` : ''}`);
  return { parcel: structuredClone(p), check };
}

export type ParcelAction =
  | { action: 'publish' }
  | { action: 'withdraw'; reason?: string }
  | { action: 'amend'; reason?: string; geometry?: unknown; landUse?: string; method?: string; accuracyM?: number | string; surveyedAt?: string; surveyor?: string; planRef?: string; rights?: unknown; areaM2?: unknown }
  | { action: 'confirm-amend' }
  | { action: 'discard-amend'; reason?: string };

const findParcel = (id: string): Parcel | undefined => {
  const d = db().parcels;
  return d.find(p => p.id === id) ?? (index().ids.get(id.trim().toUpperCase()) ?? []).find(p => p.state !== 'withdrawn') ?? (index().ids.get(id.trim().toUpperCase()) ?? [])[0];
};

/** Who may act is checked by the route (lib/auth/roles.ts); this checks the record's own rules. */
export async function actOnParcel(id: string, a: ParcelAction, by: string): Promise<Parcel | { error: string; check?: ParcelCheck }> {
  const p = findParcel(id);
  if (!p) return { error: 'No such parcel' };
  const who = by.trim();
  if (!who) return { error: 'Name the official acting' };
  switch (a.action) {
    case 'publish': {
      if (p.state !== 'proposed') return { error: `The parcel is already ${p.state}` };
      if (who === p.recordedBy) return { error: 'A different official must publish a parcel they did not record' };
      // Another parcel may have been published over it since it was recorded.
      const ov = overlapsOf(p.geometry, p.bbox, p.id);
      if (ov.overlaps.length && db().policy.overlap === 'refuse') return { error: `Overlaps published parcel${ov.overlaps.length === 1 ? '' : 's'} ${ov.overlaps.map(o => `${o.parcelId} by ${o.areaM2.toLocaleString('en')} m²`).join(', ')}` };
      p.overlaps = ov.overlaps;
      p.state = 'published'; p.publishedBy = who; p.publishedAt = now();
      pushVersion(p, who, 'published');
      reindex(p);
      recordAudit(who, 'parcel.publish', `Parcel:${p.id}`, 'ok', `${p.parcelId}${p.overlaps.length ? ` (${p.overlaps.length} overlap flagged)` : ''}`);
      break;
    }
    case 'withdraw': {
      if (p.state === 'withdrawn') return { error: 'The parcel is already withdrawn' };
      const reason = clean(a.reason, 300);
      if (!reason) return { error: 'Say why the parcel is withdrawn' };
      p.state = 'withdrawn'; p.withdrawnBy = who; p.withdrawnAt = now(); p.withdrawReason = reason;
      delete p.pending;
      pushVersion(p, who, `withdrawn: ${reason}`);
      reindex(p);
      recordAudit(who, 'parcel.withdraw', `Parcel:${p.id}`, 'ok', `${p.parcelId}: ${reason}`);
      break;
    }
    case 'amend': {
      if (p.state === 'withdrawn') return { error: 'The parcel is withdrawn' };
      if (p.pending) return { error: 'A change already waits for a second official' };
      const reason = clean(a.reason, 300);
      if (!reason) return { error: 'Say why the parcel changes' };
      if (a.areaM2 !== undefined && a.areaM2 !== null && a.areaM2 !== '') return { error: 'The area is computed from the outline, never typed' };
      const landUse = a.landUse === undefined || a.landUse === '' ? p.landUse : a.landUse;
      if (!isLandUse(landUse)) return { error: 'Choose the land use' };
      const survey = a.method === undefined && a.accuracyM === undefined && a.surveyedAt === undefined && a.surveyor === undefined && a.planRef === undefined
        ? p.survey : surveyOf({ method: a.method ?? p.survey.method, accuracyM: a.accuracyM ?? (a.method && a.method !== p.survey.method ? undefined : p.survey.accuracyM), surveyedAt: a.surveyedAt ?? p.survey.surveyedAt, surveyor: a.surveyor ?? p.survey.surveyor, planRef: a.planRef ?? p.survey.planRef }, p.survey.sourceCrs);
      if ('error' in survey) return survey;
      const rights = a.rights === undefined ? { rights: p.rights, warnings: [] } : readRights(a.rights);
      if ('error' in rights) return rights;
      let shape = { geometry: p.geometry, areaM2: p.areaM2, bbox: p.bbox, place: p.place, overlaps: p.overlaps };
      if (a.geometry !== undefined) {
        const check = await checkParcel({ geometry: a.geometry, exceptId: p.id });
        if (!check.ok) return { error: check.errors[0]!, check };
        shape = { geometry: check.geometry!, areaM2: check.areaM2!, bbox: check.bbox!, place: check.place!, overlaps: check.overlaps };
      }
      p.pending = { ...structuredClone(shape), landUse, survey, rights: rights.rights, reason, proposedBy: who, proposedAt: now() };
      if (p.state === 'proposed') {
        // Not yet published: the change is the record (the publisher reviews it).
        Object.assign(p, { geometry: shape.geometry, areaM2: shape.areaM2, bbox: shape.bbox, place: shape.place, overlaps: shape.overlaps, landUse, survey, rights: rights.rights });
        delete p.pending;
        pushVersion(p, who, `changed before publication: ${reason}`);
        reindex(p);
      } else repo().save(p);
      recordAudit(who, p.pending ? 'parcel.amend.propose' : 'parcel.amend', `Parcel:${p.id}`, 'ok', `${p.parcelId}: ${reason}`);
      break;
    }
    case 'confirm-amend': {
      const c = p.pending;
      if (!c) return { error: 'No change waits on this parcel' };
      if (who === c.proposedBy) return { error: 'A different official must confirm a change they did not propose' };
      // Checked again: another parcel may have been published since the change was proposed.
      const ov = overlapsOf(c.geometry, c.bbox, p.id);
      if (ov.overlaps.length && db().policy.overlap === 'refuse') return { error: `The new outline overlaps published parcel${ov.overlaps.length === 1 ? '' : 's'} ${ov.overlaps.map(o => `${o.parcelId} by ${o.areaM2.toLocaleString('en')} m²`).join(', ')}` };
      Object.assign(p, { geometry: c.geometry, areaM2: c.areaM2, bbox: c.bbox, place: c.place, overlaps: ov.overlaps, landUse: c.landUse, survey: c.survey, rights: c.rights });
      delete p.pending;
      pushVersion(p, who, `changed: ${c.reason} (proposed by ${c.proposedBy})`);
      reindex(p);
      recordAudit(who, 'parcel.amend.confirm', `Parcel:${p.id}`, 'ok', `${p.parcelId}: ${c.reason}`);
      break;
    }
    case 'discard-amend': {
      if (!p.pending) return { error: 'No change waits on this parcel' };
      const reason = clean(a.reason, 300);
      if (!reason) return { error: 'Say why the change is discarded' };
      delete p.pending;
      repo().save(p);
      recordAudit(who, 'parcel.amend.discard', `Parcel:${p.id}`, 'ok', `${p.parcelId}: ${reason}`);
      break;
    }
    default: return { error: 'Say what to do: publish, amend, confirm-amend, discard-amend or withdraw' };
  }
  return structuredClone(p);
}

// ── Views ─────────────────────────────────────────────────────────────────

/**
 * The public shape of a parcel: what tiles, the OGC collection, lists and
 * exports carry (INSPIRE Cadastral Parcels: reference, geometry, area,
 * administrative unit; plus land use and survey). It has no rights field, so
 * no caller can leak a holder through it.
 */
export interface PublicParcel {
  id: string; parcelId: string; geometry: MultiPolygonGeom; areaM2: number; bbox: BBox; landUse: LandUse;
  survey: { method: SurveyMethod; accuracyM: number; surveyedAt?: string };
  place: { regionCode?: string; region?: string; districtCode?: string; district?: string };
  state: Parcel['state']; recordedAt: string; publishedAt?: string; withdrawnAt?: string; withdrawReason?: string;
  version: number; overlaps: ParcelOverlap[];
}

export function publicParcel(p: Parcel): PublicParcel {
  return {
    id: p.id, parcelId: p.parcelId, geometry: structuredClone(p.geometry), areaM2: p.areaM2, bbox: [...p.bbox] as BBox, landUse: p.landUse,
    survey: { method: p.survey.method, accuracyM: p.survey.accuracyM, ...(p.survey.surveyedAt ? { surveyedAt: p.survey.surveyedAt } : {}) },
    place: { regionCode: p.place.regionCode, region: p.place.region, districtCode: p.place.districtCode, district: p.place.district },
    state: p.state, recordedAt: p.recordedAt, ...(p.publishedAt ? { publishedAt: p.publishedAt } : {}),
    ...(p.withdrawnAt ? { withdrawnAt: p.withdrawnAt, withdrawReason: p.withdrawReason } : {}),
    version: p.versions.length, overlaps: p.overlaps.map(o => ({ ...o })),
  };
}

/** What an official sees: the public shape, who acted, the survey in full, versions and a waiting change; rights only with `rights: true`. */
export type OfficialParcel = PublicParcel & {
  survey: ParcelSurvey;
  recordedBy: string; publishedBy?: string; withdrawnBy?: string; source: Parcel['source']; note?: string;
  versions: (Omit<ParcelVersion, 'rights'> & { rights?: ParcelRight[]; rightsCount: number })[];
  pending?: Omit<ParcelAmendment, 'rights'> & { rights?: ParcelRight[]; rightsCount: number };
  rights?: ParcelRight[]; rightsCount: number; rightsHidden: boolean;
};

export function viewParcel(p: Parcel, viewer: { rights: boolean }): OfficialParcel {
  const withRights = viewer.rights === true;
  const strip = <T extends { rights: ParcelRight[] }>(x: T): Omit<T, 'rights'> & { rights?: ParcelRight[]; rightsCount: number } => {
    const { rights, ...rest } = structuredClone(x);
    return { ...rest, rightsCount: rights.length, ...(withRights ? { rights } : {}) };
  };
  return {
    ...publicParcel(p), survey: structuredClone(p.survey),
    recordedBy: p.recordedBy, ...(p.publishedBy ? { publishedBy: p.publishedBy } : {}), ...(p.withdrawnBy ? { withdrawnBy: p.withdrawnBy } : {}),
    source: { ...p.source }, ...(p.note ? { note: p.note } : {}),
    versions: p.versions.map(v => strip(v)), ...(p.pending ? { pending: strip(p.pending) } : {}),
    rightsCount: p.rights.length, rightsHidden: !withRights, ...(withRights ? { rights: structuredClone(p.rights) } : {}),
  };
}

export function getParcel(id: string): Parcel | undefined {
  const p = findParcel(id);
  return p ? structuredClone(p) : undefined;
}

export interface ParcelPageFilter {
  /** 'current' is every stage but withdrawn. */
  state?: Parcel['state'] | 'all' | 'current';
  region?: string; district?: string; landUse?: string;
  /** Words in the parcel id, record number, region or district. */
  q?: string;
  /** Only what waits on an official: a parcel to publish, a change to confirm. */
  waiting?: boolean;
  bbox?: BBox;
}
export const PARCEL_PAGE_MAX = 1000;

/** One page of the register (public shapes; never rights) and how many parcels match. */
export function pageParcels(filter: ParcelPageFilter, page: { offset?: number; limit: number }): { parcels: PublicParcel[]; total: number; offset: number; limit: number; next: number | null } {
  const limit = Math.max(1, Math.min(PARCEL_PAGE_MAX, Math.floor(page.limit) || 1));
  const offset = Math.max(0, Math.floor(page.offset ?? 0) || 0);
  const q = (filter.q ?? '').trim().toLowerCase();
  const stateOk = (p: Parcel) => (filter.state === 'all' ? true : filter.state === 'current' ? p.state !== 'withdrawn' : p.state === (filter.state ?? 'published'));
  const match = (p: Parcel) => stateOk(p)
    && (!filter.region || p.place.regionCode === filter.region || p.place.region === filter.region)
    && (!filter.district || p.place.districtCode === filter.district || p.place.district === filter.district)
    && (!filter.landUse || p.landUse === filter.landUse)
    && (!filter.waiting || p.state === 'proposed' || !!p.pending)
    && (!q || [p.parcelId, p.id, p.place.region ?? '', p.place.district ?? ''].some(w => w.toLowerCase().includes(q)));
  const from = filter.bbox ? parcelsMeeting(filter.bbox) : db().parcels;
  const out: Parcel[] = [];
  let total = 0;
  for (const p of from) {
    if (!match(p)) continue;
    if (total >= offset && out.length < limit) out.push(p);
    total++;
  }
  return { parcels: out.map(publicParcel), total, offset, limit, next: offset + limit < total ? offset + limit : null };
}

export function parcelCounts(): { total: number; published: number; proposed: number; waiting: number; withdrawn: number; areaM2: number; byLandUse: Record<string, number> } {
  const byLandUse: Record<string, number> = {};
  let total = 0, published = 0, proposed = 0, waiting = 0, withdrawn = 0, areaM2 = 0;
  for (const p of db().parcels) {
    if (p.state === 'withdrawn') { withdrawn++; continue; }
    total++;
    if (p.state === 'published') { published++; areaM2 += p.areaM2; byLandUse[p.landUse] = (byLandUse[p.landUse] ?? 0) + 1; }
    if (p.state === 'proposed') proposed++;
    if (p.state === 'proposed' || p.pending) waiting++;
  }
  return { total, published, proposed, waiting, withdrawn, areaM2: Math.round(areaM2), byLandUse };
}

// ── Loading files ─────────────────────────────────────────────────────────

export const PARCEL_COLUMNS = [
  { name: 'parcel_id', required: true, means: 'The national parcel id, in the nation\'s format.', aliases: ['parcelid', 'parcel', 'upi', 'pin', 'lr_no', 'lrno', 'title_no', 'cadastral_ref', 'nationalcadastralreference', 'id'] },
  { name: 'land_use', required: true, means: `One of: ${LAND_USES.map(l => l.key).join(', ')}.`, aliases: ['landuse', 'use', 'land use'] },
  { name: 'accuracy', required: false, means: 'Accuracy of the outline in metres (the survey method\'s typical one otherwise).', aliases: ['accuracy_m', 'precision'] },
  { name: 'plan_ref', required: false, means: 'The survey plan or field sheet reference.', aliases: ['plan', 'survey_plan', 'fr_no'] },
  { name: 'surveyed', required: false, means: 'When it was surveyed (YYYY-MM-DD).', aliases: ['survey_date', 'date'] },
  { name: 'holder', required: false, means: 'The holder of the main right (personal data: shown only to the cadastre authority and officials with need).', aliases: ['owner', 'proprietor', 'holder_name'] },
  { name: 'holder_kind', required: false, means: `One of: ${HOLDER_KINDS.map(h => h.key).join(', ')}.`, aliases: ['owner_type', 'holder_type'] },
  { name: 'right', required: false, means: `The right: ${RIGHT_TYPES.map(r => r.key).join(', ')} (ownership by default when a holder is given).`, aliases: ['tenure', 'right_type'] },
  { name: 'share', required: false, means: 'The holder\'s share as a fraction, e.g. 1/2.', aliases: [] },
  { name: 'document', required: false, means: 'The reference of the document the right rests on (title, lease, adjudication record).', aliases: ['title', 'deed', 'source_ref'] },
] as const;
const columnOf = (k: string): string => { const n = k.trim().toLowerCase(); return PARCEL_COLUMNS.find(c => c.name === n || (c.aliases as readonly string[]).includes(n))?.name ?? n; };

export const MAX_PARCEL_ROWS = 20_000;
export const MAX_PARCEL_FILE_BYTES = 100_000_000;

export interface ImportInput {
  bytes?: Uint8Array; text?: string; name?: string; format?: BoundaryFormat;
  /** A GeoJSON file's coordinate system when it is not longitude/latitude: an EPSG code (national grids, lib/geo/crs.ts). */
  crs?: string;
  /** The columns holding the parcel id and the land use, when their names are not among the known ones. */
  idField?: string; landUseField?: string;
  method?: string;
  dryRun?: boolean;
}

/** GeoJSON in a declared national grid: every coordinate converted to longitude/latitude with lib/geo/crs.ts. */
function convertGeoJson(text: string, decl: string | undefined): { text: string; crs?: ParcelImport['crs']; note?: string } | { error: string } {
  let j: { crs?: { properties?: { name?: unknown } }; features?: unknown[] };
  try { j = JSON.parse(text.replace(/^﻿/, '')); } catch { return { error: 'The file is not valid JSON' }; }
  const named = typeof j.crs?.properties?.name === 'string' ? j.crs.properties.name as string : undefined;
  const crs = readCrs({ crs: decl ?? named });
  if ('error' in crs) return crs;
  if (crs.wgs84) { if (j.crs) delete j.crs; return { text: JSON.stringify(j) }; }
  let bad = false;
  const conv = (c: unknown): unknown => {
    if (!Array.isArray(c)) return c;
    if (typeof c[0] === 'number') { const p = toWgs84(crs, Number(c[0]), Number(c[1])); if (!p) { bad = true; return c; } return [p.lng, p.lat]; }
    return c.map(conv);
  };
  for (const f of (j.features ?? []) as { geometry?: { coordinates?: unknown } }[]) if (f?.geometry?.coordinates) f.geometry.coordinates = conv(f.geometry.coordinates);
  if (bad) return { error: `Some coordinates cannot be converted from ${crs.name}: check the declared coordinate system` };
  delete j.crs;
  return { text: JSON.stringify(j), crs: { name: crs.name, ...(crs.epsg ? { epsg: crs.epsg } : {}), transformation: crs.transformation }, note: `Converted from ${crs.name} to longitude/latitude (WGS 84)` };
}

/**
 * Load parcels from a GeoJSON file, a zipped Shapefile or a GeoPackage: every
 * feature checked like a form (refusals with reasons); a dry run records
 * nothing; each accepted row is recorded for a different official to publish.
 * Audited with the file's SHA-256 and the counts, never the rows' contents.
 */
export async function importParcels(input: ImportInput, by: string): Promise<ParcelImport & { dryRun: boolean; preview: { row: number; parcelId: string; areaM2: number; region?: string; district?: string; warnings: string[] }[]; fields: string[] } | { error: string }> {
  if (!db().policy.authorityId) return { error: 'The nation has not named its cadastre authority (parcel policy)' };
  if (!by.trim()) return { error: 'Name the official loading the file' };
  let bytes = input.bytes ?? new TextEncoder().encode(input.text ?? '');
  if (bytes.byteLength > MAX_PARCEL_FILE_BYTES) return { error: `The file is larger than ${MAX_PARCEL_FILE_BYTES / 1_000_000} MB` };
  const sha256 = createHash('sha256').update(bytes).digest('hex');
  const detected = input.format ?? detectFormat(bytes, input.name);
  if (detected === 'topojson') return { error: 'Load parcels as GeoJSON, a zipped Shapefile or a GeoPackage' };
  let crs: ParcelImport['crs'] | undefined;
  const notes: string[] = [];
  if (detected === 'geojson') {
    const c = convertGeoJson(new TextDecoder().decode(bytes), input.crs?.trim() || undefined);
    if ('error' in c) return c;
    bytes = new TextEncoder().encode(c.text);
    if (c.crs) crs = c.crs;
    if (c.note) notes.push(c.note);
  } else if (input.crs?.trim()) return { error: 'A Shapefile or GeoPackage names its own coordinate system (.prj or spatial reference): do not declare one' };
  const read = await readBoundaryFile({ bytes, name: input.name, ...(detected === 'geojson' ? { format: 'geojson' as const } : {}) });
  if ('error' in read) return { error: read.error.replace(/boundaries/g, 'parcels').replace(/boundary/g, 'parcel') };
  notes.push(...read.notes);
  if (read.reprojectedFrom) crs = { name: read.reprojectedFrom };
  if (read.features.length > MAX_PARCEL_ROWS) return { error: `More than ${MAX_PARCEL_ROWS.toLocaleString('en')} parcels: split the file` };
  const method = input.method ?? 'cadastral-import';
  if (!isSurveyMethod(method) || !db().policy.methods.includes(method)) return { error: 'The nation does not accept this survey method' };
  const fields = [...new Set(read.features.flatMap(f => Object.keys(f.properties ?? {})))];
  const imp: ParcelImport = { id: `PIM-${randomUUID().slice(0, 8)}`, by: by.trim(), at: now(), format: read.format, sha256, rows: read.features.length, accepted: 0, refused: [], parcelIds: [], ...(crs ? { crs } : {}), notes };
  const preview: { row: number; parcelId: string; areaM2: number; region?: string; district?: string; warnings: string[] }[] = [];
  const seen = new Set<string>();
  const idKey = input.idField?.trim(), useKey = input.landUseField?.trim();
  for (const [i, f] of (read.features as Feature[]).entries()) {
    const row = i + 1;
    const refuse = (reason: string) => { if (imp.refused.length < 500) imp.refused.push({ row, reason }); };
    const raw = f.properties ?? {};
    const props: Record<string, string> = {};
    for (const [k, v] of Object.entries(raw)) if (v !== null && v !== undefined) props[columnOf(k)] = String(v).trim();
    const parcelId = (idKey ? String(raw[idKey] ?? '') : props.parcel_id ?? '').trim();
    const landUse = (useKey ? String(raw[useKey] ?? '') : props.land_use ?? '').trim().toLowerCase();
    if (!f.geometry) { refuse('No outline'); continue; }
    if (!parcelId) { refuse('No parcel id'); continue; }
    if (seen.has(parcelId.toUpperCase())) { refuse('The same parcel id appears twice in the file'); continue; }
    seen.add(parcelId.toUpperCase());
    const rights = props.holder || props.right ? [{
      type: props.right || 'ownership', holderKind: props.holder_kind || (props.holder ? 'person' : 'unknown'), holder: props.holder ?? '',
      ...(props.share ? { share: props.share } : {}), source: { kind: 'other', ref: props.document || `load ${imp.id} row ${row}` },
    }] : [];
    const rec: RecordInput = { parcelId, geometry: f.geometry, landUse, method, accuracyM: props.accuracy || undefined, planRef: props.plan_ref, surveyedAt: props.surveyed, rights, ...(crs?.transformation ? { sourceCrs: { name: crs.name, ...(crs.epsg ? { epsg: crs.epsg } : {}), transformation: crs.transformation } } : crs ? { sourceCrs: { name: crs.name, transformation: `reprojected from "${crs.name}" (.prj or spatial reference of the file)` } } : {}) };
    if (input.dryRun) {
      const idProblem = checkParcelId(parcelId);
      if (idProblem) { refuse(idProblem); continue; }
      if (!isLandUse(landUse)) { refuse(`"${landUse.slice(0, 30)}" is not a land use`); continue; }
      const r = readRights(rights);
      if ('error' in r) { refuse(r.error); continue; }
      const check = await checkParcel({ geometry: f.geometry, corners: false });
      if (!check.ok) { refuse(check.errors[0]!); continue; }
      imp.accepted++;
      if (preview.length < 200) preview.push({ row, parcelId, areaM2: check.areaM2!, region: check.place?.region, district: check.place?.district, warnings: [...check.warnings, ...r.warnings] });
      continue;
    }
    const res = await recordParcel(rec, by, { kind: 'import', importId: imp.id, sha256, row });
    if ('error' in res) { refuse(res.error); continue; }
    imp.accepted++; imp.parcelIds.push(res.parcel.id);
  }
  if (!input.dryRun) {
    db().imports.unshift(imp);
    recordAudit(imp.by, 'parcel.import', `ParcelImport:${imp.id}`, imp.accepted ? 'ok' : 'error', `${imp.accepted} of ${imp.rows} parcels (${imp.format}${imp.crs ? `, from ${imp.crs.name}` : ''}, sha256 ${sha256.slice(0, 12)}…)`);
  }
  return { ...structuredClone(imp), dryRun: !!input.dryRun, preview, fields };
}

export function listParcelImports(): ParcelImport[] { return db().imports.map(i => structuredClone(i)); }

/** Withdraw a load: every parcel it recorded and not yet withdrawn, with the reason (each its own version and audit entry). */
export function withdrawParcelImport(id: string, reason: string | undefined, by: string): ParcelImport | { error: string } {
  const imp = db().imports.find(i => i.id === id);
  if (!imp) return { error: 'No such load' };
  if (imp.withdrawn) return { error: 'The load is already withdrawn' };
  const why = clean(reason, 300);
  if (!why) return { error: 'Say why the load is withdrawn' };
  if (!by.trim()) return { error: 'Name the official acting' };
  let count = 0;
  for (const pid of imp.parcelIds) {
    const p = db().parcels.find(x => x.id === pid);
    if (!p || p.state === 'withdrawn') continue;
    p.state = 'withdrawn'; p.withdrawnBy = by.trim(); p.withdrawnAt = now(); p.withdrawReason = `load ${imp.id} withdrawn: ${why}`;
    delete p.pending;
    pushVersion(p, by.trim(), `withdrawn with its load ${imp.id}: ${why}`);
    reindex(p);
    count++;
  }
  imp.withdrawn = { by: by.trim(), at: now(), reason: why, count };
  recordAudit(by.trim(), 'parcel.import.withdraw', `ParcelImport:${imp.id}`, 'ok', `${count} parcel${count === 1 ? '' : 's'} withdrawn: ${why}`);
  return structuredClone(imp);
}
