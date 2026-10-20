// Documents (docs/GOVERNMENT_OPERATING_MODEL.md §7.1, directions 9.2): the
// files a case or a register record carries (birth notifications, medical
// certificates, applications, inspection reports, decisions). Each is a
// record with its class, institution, sensitivity and the case or record it
// belongs to; every new version supersedes the one before and none is
// deleted (a legal hold or the retention rule decides disposal,
// lib/data/retention.ts). Content is checked by its bytes (PDF, PNG, JPEG,
// WebP; never SVG or HTML) and kept sealed with the envelope key
// (lib/crypto/envelope.ts); a production installation refuses documents
// until CIVICOS_DATA_KEK (or the key provider) is set. Up to 5 MB each and
// 50 MB per case in platform state (design decision 14.2: larger files go to
// an object store later). Held in platform state.

import { createHash } from 'node:crypto';
import { seal, open, encryptionAtRest } from '@/lib/crypto/envelope';
import { recordAudit } from '@/lib/data/store/audit';
import { touch } from '@/lib/data/repo/track';
import { uuid7 } from '@/lib/data/uuid7';
import { installationMode } from '@/lib/ops/mode';
import { sniffImage } from '@/lib/public-sites/brand';
import type { Sensitivity } from '@/lib/auth/roles';

export const MAX_DOCUMENT_BYTES = 5 * 1024 * 1024;
export const MAX_PER_RECORD_BYTES = 50 * 1024 * 1024;
export type MediaType = 'application/pdf' | 'image/png' | 'image/jpeg' | 'image/webp';

export interface DocumentVersion { n: number; sha256: string; size: number; mediaType: MediaType; at: string; by: string; note?: string; content: string }
export interface DocumentRecord {
  id: string;
  /** What kind of document, as the procedure names it (e.g. birth-notification, medical-certificate). */
  class: string;
  title: string;
  institution: string;
  belongsTo: { kind: 'case' | 'register'; id: string };
  sensitivity: Sensitivity;
  retention?: string;
  versions: DocumentVersion[];
  legalHold?: { by: string; at: string; reason: string };
  createdAt: string;
  /** Set when the retention rule destroyed the content: what remains is this record and the hashes. */
  disposed?: { at: string; by: string; rule: string };
}

interface DocDb { docs: DocumentRecord[] }
const g = globalThis as unknown as { __civicosDocuments?: DocDb };
const db = (): DocDb => touch('__civicosDocuments', g.__civicosDocuments ??= { docs: [] });
export function resetDocuments(): void { g.__civicosDocuments = undefined; }

/** The media type a file's first bytes show, or null when it is not one the platform keeps. */
export function sniffDocument(bytes: Uint8Array): MediaType | null {
  if (bytes.length >= 5 && Buffer.from(bytes.subarray(0, 5)).toString('latin1') === '%PDF-') return 'application/pdf';
  const img = sniffImage(bytes);
  return img === 'image/png' || img === 'image/jpeg' || img === 'image/webp' ? img : null;
}

const aad = (id: string, n: number) => `document:${id}:${n}`;
const totalFor = (belongsTo: DocumentRecord['belongsTo']) => db().docs.filter(d => d.belongsTo.kind === belongsTo.kind && d.belongsTo.id === belongsTo.id).reduce((a, d) => a + d.versions.reduce((b, v) => b + v.size, 0), 0);

/** Without the data key, a production installation keeps no documents (they would be stored in clear). */
export function documentsRefusal(): string | null {
  return installationMode() === 'production' && !encryptionAtRest().enabled ? 'Documents are kept encrypted: set CIVICOS_DATA_KEK (or the key provider) before attaching any' : null;
}

export interface AddInput { class: string; title: string; institution: string; belongsTo: DocumentRecord['belongsTo']; sensitivity?: Sensitivity; retention?: string; bytes: Uint8Array; note?: string }

/** Keep a new document. */
export function addDocument(input: AddInput, by: string, now = new Date()): DocumentRecord | { error: string } {
  const refused = documentsRefusal();
  if (refused) return { error: refused };
  if (!/^[a-z0-9][a-z0-9-]{1,60}$/.test(input.class)) return { error: 'A document class is a short name in lowercase letters, digits and -' };
  if (!input.title?.trim()) return { error: 'Give the document a title' };
  const checked = checkBytes(input.bytes, input.belongsTo);
  if ('error' in checked) return checked;
  const id = uuid7();
  const v: DocumentVersion = { n: 1, ...checked, at: now.toISOString(), by, ...(input.note ? { note: input.note.slice(0, 300) } : {}), content: seal(Buffer.from(input.bytes).toString('base64'), aad(id, 1)) };
  const doc: DocumentRecord = { id, class: input.class, title: input.title.trim().slice(0, 200), institution: input.institution, belongsTo: input.belongsTo, sensitivity: input.sensitivity ?? 'normal', ...(input.retention ? { retention: input.retention } : {}), versions: [v], createdAt: now.toISOString() };
  db().docs.push(doc);
  recordAudit(by, 'document.add', `Document:${id}`, 'ok', `${input.class} · ${input.belongsTo.kind} ${input.belongsTo.id} · ${checked.mediaType} · ${checked.size} bytes · ${checked.sha256.slice(0, 12)}`);
  return withoutContent(doc);
}

function checkBytes(bytes: Uint8Array, belongsTo: DocumentRecord['belongsTo']): { sha256: string; size: number; mediaType: MediaType } | { error: string } {
  if (!bytes.length) return { error: 'The file is empty' };
  if (bytes.length > MAX_DOCUMENT_BYTES) return { error: 'A document may be at most 5 MB' };
  const mediaType = sniffDocument(bytes);
  if (!mediaType) return { error: 'Only PDF, PNG, JPEG and WebP files are kept (checked by their contents)' };
  if (totalFor(belongsTo) + bytes.length > MAX_PER_RECORD_BYTES) return { error: 'This case already holds 50 MB of documents' };
  return { sha256: createHash('sha256').update(bytes).digest('hex'), size: bytes.length, mediaType };
}

/** A new version supersedes the current one; the earlier ones stay. */
export function addVersion(id: string, bytes: Uint8Array, by: string, note?: string, now = new Date()): DocumentRecord | { error: string } {
  const refused = documentsRefusal();
  if (refused) return { error: refused };
  const d = db().docs.find(x => x.id === id);
  if (!d) return { error: 'No such document' };
  if (d.disposed) return { error: 'This document was disposed of under the retention rule' };
  const checked = checkBytes(bytes, d.belongsTo);
  if ('error' in checked) return checked;
  const n = d.versions.length + 1;
  d.versions.push({ n, ...checked, at: now.toISOString(), by, ...(note ? { note: note.slice(0, 300) } : {}), content: seal(Buffer.from(bytes).toString('base64'), aad(id, n)) });
  recordAudit(by, 'document.version', `Document:${id}`, 'ok', `version ${n} · ${checked.sha256.slice(0, 12)}`);
  return withoutContent(d);
}

/** A copy for callers: everything but the sealed content. */
const withoutContent = (d: DocumentRecord): DocumentRecord => { const c = structuredClone(d); for (const v of c.versions) v.content = ''; return c; };

export const getDocument = (id: string): DocumentRecord | undefined => { const d = db().docs.find(x => x.id === id); return d ? withoutContent(d) : undefined; };
export const documentsOf = (belongsTo: DocumentRecord['belongsTo']): DocumentRecord[] =>
  db().docs.filter(d => d.belongsTo.kind === belongsTo.kind && d.belongsTo.id === belongsTo.id).map(withoutContent);

/** A version's bytes (the latest by default), checked against its SHA-256. */
export function documentBytes(id: string, n?: number): { bytes: Buffer; mediaType: MediaType; sha256: string } | { error: string } {
  const d = db().docs.find(x => x.id === id);
  if (!d) return { error: 'No such document' };
  if (d.disposed) return { error: 'This document was disposed of under the retention rule; only its record and hashes remain' };
  const v = n ? d.versions.find(x => x.n === n) : d.versions[d.versions.length - 1];
  if (!v) return { error: 'No such version' };
  const o = open(v.content, aad(id, v.n));
  if ('error' in o) return o;
  const bytes = Buffer.from(o.plain, 'base64');
  if (createHash('sha256').update(bytes).digest('hex') !== v.sha256) return { error: 'The document does not match its recorded hash' };
  return { bytes, mediaType: v.mediaType, sha256: v.sha256 };
}

/** Hold a document against disposal (an investigation, a court case, an appeal). */
export function holdDocument(id: string, reason: string, by: string, now = new Date()): DocumentRecord | { error: string } {
  const d = db().docs.find(x => x.id === id);
  if (!d) return { error: 'No such document' };
  if (!reason?.trim()) return { error: 'Say why it is held' };
  d.legalHold = { by, at: now.toISOString(), reason: reason.trim().slice(0, 300) };
  recordAudit(by, 'document.hold', `Document:${id}`, 'ok', reason.trim().slice(0, 200));
  return withoutContent(d);
}

export function releaseDocument(id: string, by: string): DocumentRecord | { error: string } {
  const d = db().docs.find(x => x.id === id);
  if (!d) return { error: 'No such document' };
  if (!d.legalHold) return { error: 'This document is not held' };
  delete d.legalHold;
  recordAudit(by, 'document.release', `Document:${id}`, 'ok', 'hold released');
  return withoutContent(d);
}

/** Destroy a document's content under the retention rule (never while held); its record and hashes remain. */
export function disposeDocument(id: string, rule: string, by: string, now = new Date()): DocumentRecord | { error: string } {
  const d = db().docs.find(x => x.id === id);
  if (!d) return { error: 'No such document' };
  if (d.legalHold) return { error: `Held: ${d.legalHold.reason}` };
  if (d.disposed) return { error: 'Already disposed of' };
  for (const v of d.versions) v.content = '';
  d.disposed = { at: now.toISOString(), by, rule };
  recordAudit(by, 'document.dispose', `Document:${id}`, 'ok', `${rule} · ${d.versions.map(v => v.sha256.slice(0, 12)).join(', ')}`);
  return withoutContent(d);
}
