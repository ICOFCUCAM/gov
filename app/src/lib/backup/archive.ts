// The backup archive (register 3.7, 9.1): one file per backup, encrypted,
// never plaintext at rest.
//
// Envelope encryption through the platform's key custody (lib/keys/custody.ts):
// every backup gets its own random 256-bit data key; each part (and the
// manifest) is gzip-compressed and sealed with AES-256-GCM under it, with
// associated data naming the backup and the part, so a part cannot be moved
// to another backup or renamed without failing. The data key itself is kept
// in the archive only wrapped:
//   env       sealed under CIVICOS_DATA_KEK (lib/crypto/envelope.ts seal(),
//             associated data `backup:<id>`); the key encryption key is
//             never in the archive
//   vault /   a data key the provider issued (svc.dataKey) for the data key
//   kms-http  name; only the provider can unwrap it (svc.unwrap)
// Without a key a backup is refused: there is no plaintext mode.
//
// Layout:
//   "CVBKUP1\n"  uint32 (big-endian) header length  header JSON  ciphertexts
// The header holds only what is needed to open the rest (the wrapped key,
// each part's name, IV, tag, offset and length). The manifest — what was
// backed up, when, sizes, SHA-256 per part over the plaintext, schema and
// release, the audit chain head — is itself a sealed part.

import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';
import { gzipSync, gunzipSync } from 'node:zlib';
import { seal, open, encryptionAtRest } from '@/lib/crypto/envelope';
import { providerKind, remoteService, remoteKeyNames } from '@/lib/keys/custody';
import type { InstallationMode } from '@/lib/ops/mode';

export const ARCHIVE_FORMAT = 'civicos-backup/1';
const MAGIC = Buffer.from('CVBKUP1\n', 'utf8');

/** Why a part exists and how it is restored. */
export type PartKind = 'store' | 'table' | 'pg_dump';
export interface ManifestPart {
  name: string;
  kind: PartKind;
  /** Plaintext size before compression. */
  bytes: number;
  /** SHA-256 (hex) of the plaintext. */
  sha256: string;
  /** Rows (tables) or records (stores, top-level entries). */
  rows?: number;
  /** Tables: the columns written, in order (generated columns are left out and recomputed). */
  columns?: string[];
}
export interface Manifest {
  format: typeof ARCHIVE_FORMAT;
  id: string;
  createdAt: string;
  createdBy: string;
  reason: BackupReason;
  /** snapshot: the platform's stores (memory, file, supabase modes); postgres: the record tables. */
  mode: 'snapshot' | 'postgres';
  /**
   * What the installation was when the backup was taken (lib/ops/mode.ts): a
   * production installation refuses to restore a demo or training backup.
   * Absent in backups taken before step I0.1 (read as unknown).
   */
  installation?: InstallationMode;
  adapter: string;
  app: { release: string | null; package: string; node: string };
  schema: { snapshotFormat: number; records?: string; migrations?: string[] };
  audit: { seq: number; hash: string | null; entries: number };
  parts: ManifestPart[];
  /** SHA-256 over the parts' names and hashes: the state this backup holds, as one value. */
  stateDigest: string;
  /** What is not in the backup, and why. */
  excluded: { what: string; why: string }[];
  /** Stores a restore leaves as they are (the backup system's own records, the Update Center's install records). */
  keptOnRestore: string[];
}
export type BackupReason = 'scheduled' | 'manual' | 'restore-point' | 'pre-restore' | 'drill';

interface Sealed { name: string; iv: string; tag: string; offset: number; length: number }
interface Header {
  format: typeof ARCHIVE_FORMAT;
  id: string;
  createdAt: string;
  key: { scheme: 'aes-256-gcm'; provider: 'env' | 'vault' | 'kms-http'; keyName?: string; wrapped: string };
  manifest: Sealed;
  parts: Sealed[];
}

export const sha256 = (b: string | Uint8Array): string => createHash('sha256').update(b).digest('hex');
/** The digest of a state: its parts' names and hashes, sorted. */
export const stateDigest = (parts: { name: string; sha256: string }[]): string =>
  sha256([...parts].sort((a, b) => (a.name < b.name ? -1 : 1)).map(p => `${p.name}:${p.sha256}`).join('\n'));

const aad = (id: string, name: string) => Buffer.from(`${ARCHIVE_FORMAT}|${id}|${name}`, 'utf8');

/** A fresh data key, and its wrapped form for the header. Refuses when no key is configured. */
async function newDataKey(id: string): Promise<{ dek: Buffer; key: Header['key'] }> {
  const kind = providerKind();
  if (kind !== 'env') {
    const svc = remoteService();
    if (!svc) throw new Error('Key custody is not configured');
    const name = remoteKeyNames().data;
    const { plaintext, wrapped } = await svc.dataKey(name);
    return { dek: plaintext, key: { scheme: 'aes-256-gcm', provider: svc.kind, keyName: name, wrapped } };
  }
  if (!encryptionAtRest().enabled) {
    throw new Error('Backups are encrypted and no key is configured: set CIVICOS_DATA_KEK (or a key provider, CIVICOS_KEY_PROVIDER) before taking a backup');
  }
  const dek = randomBytes(32);
  return { dek, key: { scheme: 'aes-256-gcm', provider: 'env', wrapped: seal(dek.toString('base64'), `backup:${id}`) } };
}

async function unwrapDataKey(h: Header): Promise<Buffer> {
  if (h.key.provider === 'env') {
    const o = open(h.key.wrapped, `backup:${h.id}`);
    if ('error' in o) throw new Error(`The backup's key does not open: ${o.error}`);
    const k = Buffer.from(o.plain, 'base64');
    if (k.length !== 32) throw new Error('The backup\'s key does not open (wrong key)');
    return k;
  }
  const svc = remoteService();
  if (!svc || svc.kind !== h.key.provider) throw new Error(`This backup's key is held by ${h.key.provider}; configure that key provider to open it`);
  return svc.unwrap(h.key.keyName ?? remoteKeyNames().data, h.key.wrapped);
}

function sealPart(dek: Buffer, id: string, name: string, plain: Buffer): { iv: Buffer; tag: Buffer; ct: Buffer } {
  const iv = randomBytes(12);
  const c = createCipheriv('aes-256-gcm', dek, iv);
  c.setAAD(aad(id, name));
  const ct = Buffer.concat([c.update(gzipSync(plain)), c.final()]);
  return { iv, tag: c.getAuthTag(), ct };
}

function openPart(dek: Buffer, id: string, s: Sealed, payload: Buffer): Buffer {
  if (s.offset < 0 || s.length < 0 || s.offset + s.length > payload.length) throw new Error(`Part ${s.name} lies outside the archive`);
  try {
    const d = createDecipheriv('aes-256-gcm', dek, Buffer.from(s.iv, 'base64'));
    d.setAAD(aad(id, s.name));
    d.setAuthTag(Buffer.from(s.tag, 'base64'));
    return gunzipSync(Buffer.concat([d.update(payload.subarray(s.offset, s.offset + s.length)), d.final()]));
  } catch {
    throw new Error(`Part ${s.name} does not open: the archive was changed, or this is not the key it was sealed with`);
  }
}

export interface PlainPart { name: string; kind: PartKind; data: Buffer; rows?: number; columns?: string[] }

/** Seal parts and a manifest into one archive. Returns the archive and the manifest as written. */
export async function packArchive(meta: Omit<Manifest, 'format' | 'parts' | 'stateDigest'>, parts: PlainPart[]): Promise<{ archive: Buffer; manifest: Manifest }> {
  const names = new Set<string>();
  for (const p of parts) {
    if (names.has(p.name) || p.name === 'manifest') throw new Error(`Duplicate or reserved part name ${p.name}`);
    names.add(p.name);
  }
  const listed: ManifestPart[] = parts.map(p => ({ name: p.name, kind: p.kind, bytes: p.data.length, sha256: sha256(p.data), ...(p.rows !== undefined ? { rows: p.rows } : {}), ...(p.columns ? { columns: p.columns } : {}) }));
  const manifest: Manifest = { format: ARCHIVE_FORMAT, ...meta, parts: listed, stateDigest: stateDigest(listed) };
  const { dek, key } = await newDataKey(meta.id);
  const chunks: Buffer[] = [];
  let offset = 0;
  const place = (name: string, plain: Buffer): Sealed => {
    const { iv, tag, ct } = sealPart(dek, meta.id, name, plain);
    chunks.push(ct);
    const s = { name, iv: iv.toString('base64'), tag: tag.toString('base64'), offset, length: ct.length };
    offset += ct.length;
    return s;
  };
  const sealedParts = parts.map(p => place(p.name, p.data));
  const sealedManifest = place('manifest', Buffer.from(JSON.stringify(manifest), 'utf8'));
  dek.fill(0);
  const header: Header = { format: ARCHIVE_FORMAT, id: meta.id, createdAt: meta.createdAt, key, manifest: sealedManifest, parts: sealedParts };
  const h = Buffer.from(JSON.stringify(header), 'utf8');
  const len = Buffer.alloc(4); len.writeUInt32BE(h.length);
  return { archive: Buffer.concat([MAGIC, len, h, ...chunks]), manifest };
}

function readHeader(archive: Buffer): { header: Header; payload: Buffer } {
  if (archive.length < MAGIC.length + 4 || !archive.subarray(0, MAGIC.length).equals(MAGIC)) throw new Error('Not a CivicOS backup archive');
  const n = archive.readUInt32BE(MAGIC.length);
  const start = MAGIC.length + 4;
  if (n <= 0 || start + n > archive.length) throw new Error('The archive header is damaged');
  let header: Header;
  try { header = JSON.parse(archive.subarray(start, start + n).toString('utf8')) as Header; } catch { throw new Error('The archive header is damaged'); }
  if (header.format !== ARCHIVE_FORMAT || !header.manifest || !Array.isArray(header.parts) || !header.key?.wrapped) throw new Error('Unknown archive format');
  return { header, payload: archive.subarray(start + n) };
}

/** The archive's id and key provider, without opening it. */
export function peekArchive(archive: Buffer): { id: string; createdAt: string; provider: string } {
  const { header } = readHeader(archive);
  return { id: header.id, createdAt: header.createdAt, provider: header.key.provider };
}

export interface OpenedArchive { manifest: Manifest; parts: Map<string, Buffer> }

/**
 * Read an archive back: unwrap its key, open the manifest and every part,
 * and check each part against the manifest (name, kind, size, SHA-256).
 * Throws with the reason on the first problem.
 */
export async function openArchive(archive: Buffer, expectId?: string): Promise<OpenedArchive> {
  const { header, payload } = readHeader(archive);
  if (expectId && header.id !== expectId) throw new Error(`The archive holds backup ${header.id}, not ${expectId}`);
  const dek = await unwrapDataKey(header);
  try {
    if (header.manifest.name !== 'manifest') throw new Error('The archive header is damaged');
    const manifest = JSON.parse(openPart(dek, header.id, header.manifest, payload).toString('utf8')) as Manifest;
    if (manifest.id !== header.id || manifest.format !== ARCHIVE_FORMAT) throw new Error('The manifest does not belong to this archive');
    const sealed = new Map(header.parts.map(p => [p.name, p]));
    if (sealed.size !== manifest.parts.length) throw new Error(`The archive holds ${sealed.size} parts; the manifest lists ${manifest.parts.length}`);
    const parts = new Map<string, Buffer>();
    for (const p of manifest.parts) {
      const s = sealed.get(p.name);
      if (!s) throw new Error(`Part ${p.name} is missing from the archive`);
      const plain = openPart(dek, header.id, s, payload);
      if (plain.length !== p.bytes || sha256(plain) !== p.sha256) throw new Error(`Part ${p.name} does not match its SHA-256 in the manifest`);
      parts.set(p.name, plain);
    }
    if (stateDigest(manifest.parts) !== manifest.stateDigest) throw new Error('The manifest\'s state digest does not match its parts');
    return { manifest, parts };
  } finally {
    dek.fill(0);
  }
}
