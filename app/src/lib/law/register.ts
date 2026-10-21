// The laws register (docs/GOVERNMENT_OPERATING_MODEL.md §5, directions §7):
// the nation's legal instruments as versioned, structured texts, so every
// legally significant decision can cite the exact provision that authorised
// it, as it stood on the day. Entered by the nation, never invented: one
// official of the law-register authority records a version, a different one
// confirms it, and only confirmed versions can be cited. Nothing is deleted;
// a mistaken version is withdrawn and kept. The internal model follows Akoma
// Ntoso's structure and identifiers (eId) and ELI-shaped instrument ids, and
// does not depend on either format. Held in platform state.

import { sha256Hex } from '@/lib/audit/sha256';
import { recordAudit } from '@/lib/data/store/audit';
import { touch } from '@/lib/data/repo/track';
import { uuid7 } from '@/lib/data/uuid7';
import { dualControlRefusal } from '@/lib/data/dual-control';

export type InstrumentType = 'constitution' | 'act' | 'regulation' | 'decree' | 'order' | 'treaty' | 'bylaw' | 'other';
export const INSTRUMENT_TYPES: InstrumentType[] = ['constitution', 'act', 'regulation', 'decree', 'order', 'treaty', 'bylaw', 'other'];
export type RelationKind = 'amends' | 'repeals' | 'replaces' | 'implements' | 'cites' | 'depends-on';
export const RELATION_KINDS: RelationKind[] = ['amends', 'repeals', 'replaces', 'implements', 'cites', 'depends-on'];

export interface Provision { eId: string; num: string; heading?: string; text: string; parent?: string }

export interface LegalVersion {
  id: string;
  language: string;
  dates: { adopted?: string; published?: string; inForce: string; ceased?: string };
  publicationRef?: string;
  provisions: Provision[];
  /** SHA-256 of the canonical text (provisions in order, with their numbers, headings and parents). */
  digest: string;
  state: 'recorded' | 'confirmed' | 'withdrawn';
  recordedBy: string; recordedById?: string; at: string;
  confirmedBy?: string; confirmedAt?: string;
  withdrawn?: { by: string; at: string; reason: string };
  applicability?: { territorial?: string[]; personal?: string; subject?: string; transitional?: string };
  /** How it entered: typed in, imported from a file (its SHA-256), or from the legislature's record (plan phase 7). */
  source: { kind: 'entered' } | { kind: 'sample' } | { kind: 'akoma-ntoso' | 'csv'; sha256: string } | LegislativeSource;
}

/**
 * Provenance of a version that entered from the legislature's own record
 * (lib/legislature/register.ts): the bill and the text version passed, the
 * recorded votes, assent, publication and the clerk's certification of the
 * record (its SHA-256). The text is the bill's, never retyped.
 */
export interface LegislativeSource {
  kind: 'legislature';
  legislature: string;
  bill: string; billNumber: string; billVersion: number; textDigest: string;
  votes: { stage: string; date: string; yes: number; no: number; abstain: number; result: string }[];
  assent?: { outcome: string; date: string; by: string; communicated?: boolean };
  publication: { date: string; reference: string };
  certification: { digest: string; by: string; at: string };
  procedureVersion: number;
}

export interface LegalInstrument {
  id: string;
  title: string;
  type: InstrumentType;
  jurisdiction: string;
  issuingAuthority: string;
  officialSource?: string;
  versions: LegalVersion[];
  relations: { kind: RelationKind; target: string; at?: string; by: string }[];
  createdAt: string;
  /** Sample instruments exist only in demonstration and training installations. */
  sample?: boolean;
}

/** A decision's citation: the provision, the exact version and its digest, the date it was applied for. */
export interface Citation { instrument: string; eId: string; version: string; digest: string; on: string; title?: string; num?: string; context?: string }

interface LawDb { instruments: LegalInstrument[] }
const g = globalThis as unknown as { __civicosLaw?: LawDb };
const db = (): LawDb => touch('__civicosLaw', g.__civicosLaw ??= { instruments: [] });
export function resetLaw(): void { g.__civicosLaw = undefined; }

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const EID = /^[a-z][a-z0-9]*(?:_[a-z0-9]+)*(?:__[a-z][a-z0-9]*(?:_[a-z0-9]+)*)*$/;
const ID = /^\/eli\/[a-z0-9-]+\/[a-z0-9-]+\/\d{4}\/[A-Za-z0-9.-]+$/;

/** An ELI-shaped id: /eli/{jurisdiction}/{type}/{year}/{number}. */
export const instrumentId = (jurisdiction: string, type: string, year: number | string, number: string) =>
  `/eli/${jurisdiction.toLowerCase().replace(/[^a-z0-9-]/g, '-')}/${type}/${year}/${number.replace(/[^A-Za-z0-9.-]/g, '-')}`;

/** The canonical digest of a version's text: independent of how it was entered. */
export const canonicalDigest = (provisions: Provision[]): string =>
  sha256Hex(JSON.stringify(provisions.map(p => [p.eId, p.num, p.heading ?? null, p.text.replace(/\s+/g, ' ').trim(), p.parent ?? null])));

export function checkProvisions(list: unknown): Provision[] | { error: string } {
  if (!Array.isArray(list) || !list.length) return { error: 'A version needs its provisions (articles, sections, paragraphs)' };
  if (list.length > 20_000) return { error: 'At most 20 000 provisions in one version' };
  const seen = new Set<string>();
  const out: Provision[] = [];
  for (const [i, x] of list.entries()) {
    const p = x as Partial<Provision>;
    if (typeof p?.eId !== 'string' || !EID.test(p.eId)) return { error: `Provision ${i + 1}: its identifier must look like art_12 or art_12__para_1` };
    if (seen.has(p.eId)) return { error: `Provision ${p.eId} appears twice` };
    if (typeof p.num !== 'string' || !p.num.trim() || p.num.length > 40) return { error: `Provision ${p.eId}: give its number as printed (e.g. 12, 12(1))` };
    if (typeof p.text !== 'string' || !p.text.trim() || p.text.length > 100_000) return { error: `Provision ${p.eId}: its text is missing or too long` };
    if (p.parent !== undefined && (typeof p.parent !== 'string' || !seen.has(p.parent))) return { error: `Provision ${p.eId}: its parent ${String(p.parent)} must come before it` };
    seen.add(p.eId);
    out.push({ eId: p.eId, num: p.num.trim(), ...(typeof p.heading === 'string' && p.heading.trim() ? { heading: p.heading.trim().slice(0, 300) } : {}), text: p.text.trim(), ...(p.parent ? { parent: p.parent } : {}) });
  }
  return out;
}

export interface RecordInput {
  instrument: { id?: string; title?: string; type?: string; jurisdiction?: string; year?: number; number?: string; issuingAuthority?: string; officialSource?: string };
  language?: string;
  dates?: { adopted?: string; published?: string; inForce?: string; ceased?: string };
  publicationRef?: string;
  provisions: unknown;
  applicability?: LegalVersion['applicability'];
  source?: LegalVersion['source'];
}

/** Record a new version (and the instrument, the first time). It cannot be cited until a different official confirms it. */
export function recordVersion(input: RecordInput, by: string, byId?: string, now = new Date()): { instrument: LegalInstrument; version: LegalVersion } | { error: string } {
  const provisions = checkProvisions(input.provisions);
  if ('error' in provisions) return provisions;
  const d = input.dates ?? {};
  for (const [k, v] of Object.entries(d)) if (v !== undefined && !ISO_DATE.test(v)) return { error: `The ${k} date must be YYYY-MM-DD` };
  if (!d.inForce) return { error: 'Say from which date this version is in force' };
  if (d.ceased && d.ceased <= d.inForce) return { error: 'A version must cease after it comes into force' };
  if (d.published && d.adopted && d.published < d.adopted) return { error: 'Publication cannot come before adoption' };
  const language = (input.language ?? 'en').trim();
  if (!/^[a-z]{2,3}(-[A-Za-z0-9]{2,8})*$/.test(language)) return { error: 'Language must be a language code such as en or fr' };

  const i = input.instrument;
  let inst = i.id ? db().instruments.find(x => x.id === i.id) : undefined;
  if (i.id && !inst && !ID.test(i.id)) return { error: 'An instrument id looks like /eli/{jurisdiction}/{type}/{year}/{number}' };
  if (!inst) {
    if (!i.title?.trim()) return { error: 'A new instrument needs its official title' };
    if (!INSTRUMENT_TYPES.includes(i.type as InstrumentType)) return { error: `Instrument type must be one of ${INSTRUMENT_TYPES.join(', ')}` };
    if (!i.jurisdiction?.trim()) return { error: 'Name the jurisdiction (the nation, or a region)' };
    if (!i.issuingAuthority?.trim()) return { error: 'Name the issuing authority' };
    const id = i.id ?? (i.year && i.number ? instrumentId(i.jurisdiction, i.type!, i.year, i.number) : undefined);
    if (!id || !ID.test(id)) return { error: 'Give the instrument\'s year and number (or its id)' };
    if (db().instruments.some(x => x.id === id)) return { error: `${id} is already recorded` };
    inst = { id, title: i.title.trim().slice(0, 500), type: i.type as InstrumentType, jurisdiction: i.jurisdiction.trim(), issuingAuthority: i.issuingAuthority.trim().slice(0, 200), ...(i.officialSource ? { officialSource: i.officialSource.slice(0, 500) } : {}), versions: [], relations: [], createdAt: now.toISOString() };
    db().instruments.push(inst);
  }
  const overlap = inst.versions.find(v => v.state === 'confirmed' && v.language === language && v.dates.inForce === d.inForce);
  if (overlap) return { error: `A confirmed ${language} version already comes into force on ${d.inForce}` };
  const version: LegalVersion = {
    id: uuid7(), language, dates: { ...(d.adopted ? { adopted: d.adopted } : {}), ...(d.published ? { published: d.published } : {}), inForce: d.inForce, ...(d.ceased ? { ceased: d.ceased } : {}) },
    ...(input.publicationRef ? { publicationRef: input.publicationRef.slice(0, 300) } : {}),
    provisions, digest: canonicalDigest(provisions), state: 'recorded', recordedBy: by, ...(byId ? { recordedById: byId } : {}), at: now.toISOString(),
    ...(input.applicability ? { applicability: input.applicability } : {}), source: input.source ?? { kind: 'entered' },
  };
  inst.versions.push(version);
  recordAudit(by, 'law.version.record', `Law:${inst.id}`, 'ok', `${inst.title} · in force ${d.inForce} · ${provisions.length} provisions · ${version.digest.slice(0, 12)}`);
  return { instrument: inst, version };
}

/** A different official confirms a recorded version (four-eyes); from then on it can be cited. */
export function confirmVersion(instrument: string, versionId: string, by: string, byId?: string, now = new Date()): LegalVersion | { error: string } {
  const inst = db().instruments.find(x => x.id === instrument);
  const v = inst?.versions.find(x => x.id === versionId);
  if (!inst || !v) return { error: 'No such version' };
  if (v.state !== 'recorded') return { error: `This version is already ${v.state}` };
  const same = dualControlRefusal({ by: v.recordedBy, byId: v.recordedById }, { by, byId });
  if (same) return { error: same };
  if (inst.versions.some(x => x.state === 'confirmed' && x.language === v.language && x.dates.inForce === v.dates.inForce)) return { error: `A confirmed ${v.language} version already comes into force on ${v.dates.inForce}` };
  v.state = 'confirmed'; v.confirmedBy = by; v.confirmedAt = now.toISOString();
  recordAudit(by, 'law.version.confirm', `Law:${inst.id}`, 'ok', `${inst.title} · in force ${v.dates.inForce} · ${v.digest.slice(0, 12)} · recorded by ${v.recordedBy}`);
  return v;
}

/** Withdraw a mistaken version: kept, marked, never cited again. Citations already made keep pointing to it. */
export function withdrawVersion(instrument: string, versionId: string, reason: string, by: string, now = new Date()): LegalVersion | { error: string } {
  const inst = db().instruments.find(x => x.id === instrument);
  const v = inst?.versions.find(x => x.id === versionId);
  if (!inst || !v) return { error: 'No such version' };
  if (v.state === 'withdrawn') return { error: 'Already withdrawn' };
  if (!reason?.trim()) return { error: 'Say why it is withdrawn' };
  v.state = 'withdrawn'; v.withdrawn = { by, at: now.toISOString(), reason: reason.trim().slice(0, 500) };
  recordAudit(by, 'law.version.withdraw', `Law:${inst.id}`, 'ok', `${inst.title} · ${v.dates.inForce} · ${reason.trim().slice(0, 200)}`);
  return v;
}

/** Record that one instrument amends, repeals, replaces, implements, cites or depends on another. */
export function relate(instrument: string, kind: RelationKind, target: string, by: string, at?: string): LegalInstrument | { error: string } {
  const inst = db().instruments.find(x => x.id === instrument);
  if (!inst) return { error: 'No such instrument' };
  if (!RELATION_KINDS.includes(kind)) return { error: `Relation must be one of ${RELATION_KINDS.join(', ')}` };
  if (!db().instruments.some(x => x.id === target) || target === instrument) return { error: 'The other instrument must be recorded (and not this one)' };
  if (at !== undefined && !ISO_DATE.test(at)) return { error: 'The date must be YYYY-MM-DD' };
  inst.relations.push({ kind, target, ...(at ? { at } : {}), by });
  recordAudit(by, 'law.relate', `Law:${inst.id}`, 'ok', `${kind} ${target}`);
  return inst;
}

const inForceOn = (v: LegalVersion, date: string) => v.state === 'confirmed' && v.dates.inForce <= date && (!v.dates.ceased || date < v.dates.ceased);

/**
 * The confirmed version of an instrument in force on a date, in a language
 * (the latest to come into force on or before it). Never the current one by
 * default: no version in force is an answer, not a fallback.
 */
export function versionOn(instrument: string, date: string, language?: string): LegalVersion | { error: string } {
  if (!ISO_DATE.test(date)) return { error: 'The date must be YYYY-MM-DD' };
  const inst = db().instruments.find(x => x.id === instrument);
  if (!inst) return { error: `No instrument ${instrument} is recorded` };
  const live = inst.versions.filter(v => inForceOn(v, date) && (!language || v.language === language)).sort((a, b) => b.dates.inForce.localeCompare(a.dates.inForce));
  return live[0] ?? { error: `No confirmed version of ${inst.title} was in force on ${date}` };
}

/** The provision as it stood on a date, with the version it comes from. */
export function provisionOn(instrument: string, eId: string, date: string, language?: string): { version: LegalVersion; provision: Provision; instrument: LegalInstrument } | { error: string } {
  const v = versionOn(instrument, date, language);
  if ('error' in v) return v;
  const p = v.provisions.find(x => x.eId === eId);
  const inst = db().instruments.find(x => x.id === instrument)!;
  return p ? { version: v, provision: p, instrument: inst } : { error: `${inst.title} had no provision ${eId} on ${date}` };
}

/** Resolve a citation for a decision made on `on`: the exact version and its digest, kept with the decision. */
export function cite(instrument: string, eId: string, on: string, context?: string): Citation | { error: string } {
  const r = provisionOn(instrument, eId, on);
  if ('error' in r) return r;
  return { instrument, eId, version: r.version.id, digest: r.version.digest, on, title: r.instrument.title, num: r.provision.num, ...(context ? { context: context.slice(0, 300) } : {}) };
}

export function listInstruments(filter: { type?: string; q?: string; state?: 'confirmed' | 'any' } = {}): LegalInstrument[] {
  const q = filter.q?.trim().toLowerCase();
  return db().instruments
    .filter(i => !filter.type || i.type === filter.type)
    .filter(i => !q || i.title.toLowerCase().includes(q) || i.id.includes(q))
    .filter(i => filter.state !== 'confirmed' || i.versions.some(v => v.state === 'confirmed'))
    .map(i => structuredClone(i));
}

export const getInstrument = (id: string): LegalInstrument | undefined => {
  const i = db().instruments.find(x => x.id === id);
  return i ? structuredClone(i) : undefined;
};
