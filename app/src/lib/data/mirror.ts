// CivicOS — Update Center local mirror and offline logistics, server-side.
//
// Self-hosted and air-gapped nations register a local mirror of the
// distribution registry (its URL, and whether it is connected or behind an
// air gap). A sync manifest lists exactly which artifacts of the nation's
// releases the mirror still lacks, for the nation's delivery mode; where the
// mirror already holds the previous release, large artifacts come as deltas
// and the manifest shows the bytes saved. Recording a sync names the person.
//
// Air-gapped nations receive physical media. Each shipment has a chain of
// custody — sealed, handed over, received, seal verified — every step by a
// named person (and the person it was handed to), in order, and written to
// the audit chain. A seal that does not match marks the media unusable.
// Hosted (SaaS) nations have no mirror: the publisher runs the registry.

import { createHash } from 'node:crypto';
import type { DistributionRelease, LocalMirror, MediaShipment, ReleaseArtifact, SyncItem, SyncManifest } from '@/lib/api/types';
import { recordAudit } from './store';
import { allReleases, nationRecord, visibleTo } from './updates';
import { compareVersions } from '@/lib/updates/semver';

const sha = (v: string) => createHash('sha256').update(v).digest('hex');
const DELTA_KINDS = new Set(['container-image', 'offline-bundle', 'restore-kit', 'binary-tarball']);

interface MirrorDb { mirrors: Record<string, LocalMirror>; media: MediaShipment[]; mediaSeq: number }
const g = globalThis as unknown as { __civicosMirror?: MirrorDb };
function mdb(): MirrorDb { return (g.__civicosMirror ??= { mirrors: {}, media: [], mediaSeq: 1001 }); }
export function resetMirror(): void { g.__civicosMirror = undefined; }

const str = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '');

export function getMirror(nationId: string): LocalMirror | undefined { return mdb().mirrors[nationId]; }

export function registerMirror(nationId: string, input: { registryUrl?: string; kind?: string; by?: string }, now = Date.now()): LocalMirror | { error: string; status: number } {
  const n = nationRecord(nationId);
  if (!n) return { error: 'Nation not found', status: 404 };
  if (n.deliveryMode === 'saas') return { error: 'Hosted nations use the publisher’s registry; a local mirror is for self-hosted and air-gapped nations', status: 409 };
  const url = str(input.registryUrl, 300), by = str(input.by, 120);
  if (!/^(https?|oci):\/\/[^\s/]+/.test(url)) return { error: 'Give the mirror’s registry address (https:// or oci://)', status: 422 };
  if (!by) return { error: 'Name who is registering the mirror', status: 422 };
  const kind = input.kind === 'air-gapped' || n.deliveryMode === 'air-gapped' ? 'air-gapped' : 'connected';
  const prev = mdb().mirrors[nationId];
  const m: LocalMirror = { nationId, registryUrl: url, kind, registeredAt: new Date(now).toISOString(), registeredBy: by, lastSync: prev?.lastSync, mirrored: prev?.mirrored ?? [] };
  mdb().mirrors[nationId] = m;
  recordAudit(by, 'update.mirror.register', `UpdateChamber:${nationId}/mirror`, 'ok', `${kind} · ${url}`);
  return m;
}

/** Releases the nation can see, oldest first, that its delivery mode has artifacts for. */
function releasesFor(nationId: string): DistributionRelease[] {
  return allReleases().filter(r => visibleTo(r, nationId)).sort((a, b) => compareVersions(a.version, b.version));
}
function artifactsFor(r: DistributionRelease, mode: string): ReleaseArtifact[] {
  return r.artifacts.filter(a => a.mode === mode || a.mode === 'any');
}

/** A delta from `from` to `to` for one artifact: deterministic size, 8–25% of the full file. */
export function deltaOf(from: DistributionRelease, to: DistributionRelease, a: ReleaseArtifact): SyncItem['delta'] {
  const frac = 0.08 + (parseInt(sha(`${from.id}>${to.id}:${a.kind}`).slice(0, 4), 16) / 0xffff) * 0.17;
  const size = Math.round(a.sizeBytes * frac);
  const tag = (v: string) => v.replace(/\+/g, '_');
  return { from: from.version, filename: `${a.filename.replace(/\.(oci|tar|tar\.gz)$/, '')}.from-${tag(from.version)}.delta`, sha256: sha(`delta:${from.id}>${to.id}:${a.id}`), sizeBytes: size, savedBytes: a.sizeBytes - size };
}

/** What the mirror still needs, with deltas where the previous release is already mirrored (or installed). */
export function syncManifest(nationId: string, now = Date.now()): SyncManifest | { error: string; status: number } {
  const n = nationRecord(nationId);
  if (!n) return { error: 'Nation not found', status: 404 };
  if (n.deliveryMode === 'saas') return { error: 'Hosted nations have no mirror to sync', status: 409 };
  const m = getMirror(nationId);
  const have = new Set([...(m?.mirrored ?? [])]);
  const rs = releasesFor(nationId);
  const items: SyncItem[] = [];
  for (const r of rs) {
    if (have.has(r.id)) continue;
    // The newest earlier release in the same channel family that the mirror holds (or the nation runs).
    const prev = [...rs].reverse().find(p => compareVersions(p.version, r.version) < 0 && (have.has(p.id) || p.version === n.installedVersion) && (p.channel === 'global' || p.nationId === r.nationId));
    for (const a of artifactsFor(r, n.deliveryMode)) {
      const base: SyncItem = { releaseId: r.id, version: r.version, artifactId: a.id, filename: a.filename, ref: a.ref, sha256: a.sha256, sizeBytes: a.sizeBytes };
      if (prev && DELTA_KINDS.has(a.kind)) base.delta = deltaOf(prev, r, a);
      items.push(base);
    }
  }
  const fullBytes = items.reduce((s, i) => s + i.sizeBytes, 0);
  const transferBytes = items.reduce((s, i) => s + (i.delta?.sizeBytes ?? i.sizeBytes), 0);
  return { nationId, generatedAt: new Date(now).toISOString(), registryUrl: m?.registryUrl, items, fullBytes, transferBytes, savedBytes: fullBytes - transferBytes };
}

export function recordSync(nationId: string, input: { releaseIds?: string[]; by?: string }, now = Date.now()): LocalMirror | { error: string; status: number } {
  const m = getMirror(nationId);
  if (!m) return { error: 'Register the mirror first', status: 409 };
  const by = str(input.by, 120);
  if (!by) return { error: 'Name who ran the sync', status: 422 };
  const ids = [...new Set(input.releaseIds ?? [])];
  const visible = new Set(releasesFor(nationId).map(r => r.id));
  if (!ids.length || ids.some(id => !visible.has(id))) return { error: 'List the releases synced (your own releases only)', status: 422 };
  const manifest = syncManifest(nationId, now);
  const bytes = 'error' in manifest ? 0 : manifest.items.filter(i => ids.includes(i.releaseId)).reduce((s, i) => s + (i.delta?.sizeBytes ?? i.sizeBytes), 0);
  m.mirrored = [...new Set([...m.mirrored, ...ids])];
  m.lastSync = { at: new Date(now).toISOString(), by, releaseIds: ids, bytes };
  recordAudit(by, 'update.mirror.sync', `UpdateChamber:${nationId}/mirror`, 'ok', `${ids.join(',')} · ${bytes} bytes`);
  return m;
}

// ── Physical media chain of custody ─────────────────────────────────
export function listMedia(nationId: string | null): MediaShipment[] {
  return mdb().media.filter(x => nationId === null || x.nationId === nationId).sort((a, b) => (b.chain[0]?.at ?? '').localeCompare(a.chain[0]?.at ?? ''));
}

/** Publisher: write the releases to media and seal it. */
export function sealMedia(nationId: string, input: { releaseIds?: string[]; sealId?: string; by?: string }, now = Date.now()): MediaShipment | { error: string; status: number } {
  const n = nationRecord(nationId);
  if (!n) return { error: 'Nation not found', status: 404 };
  if (n.deliveryMode === 'saas') return { error: 'Hosted nations receive no physical media', status: 409 };
  const by = str(input.by, 120), sealId = str(input.sealId, 60);
  if (!by) return { error: 'Name who sealed the media', status: 422 };
  if (!/^[A-Z0-9-]{4,}$/i.test(sealId)) return { error: 'Record the tamper-evident seal number', status: 422 };
  const rs = releasesFor(nationId).filter(r => (input.releaseIds ?? []).includes(r.id));
  if (!rs.length) return { error: 'Choose releases this nation can receive', status: 422 };
  const db = mdb();
  const contents = rs.flatMap(r => artifactsFor(r, n.deliveryMode).map(a => ({ filename: a.filename, sha256: a.sha256, sizeBytes: a.sizeBytes })));
  const at = new Date(now).toISOString();
  const a = recordAudit(by, 'update.media.sealed', `UpdateChamber:${nationId}/media`, 'ok', `MEDIA-${db.mediaSeq} · seal ${sealId} · ${rs.map(r => r.version).join(', ')}`);
  const s: MediaShipment = { mediaId: `MEDIA-${db.mediaSeq++}`, nationId, releaseIds: rs.map(r => r.id), contents, sealId, state: 'sealed', chain: [{ step: 'sealed', at, by, sealId, auditSeq: a.seq }] };
  db.media.push(s);
  return s;
}

const NEXT: Record<string, { from: MediaShipment['state']; side: 'publisher' | 'nation' }> = {
  'handed-over': { from: 'sealed', side: 'publisher' },
  received: { from: 'handed-over', side: 'nation' },
  'seal-verified': { from: 'received', side: 'nation' },
};

/** The next custody step. Handing over names who receives it; verification compares the seal number. */
export function custodyStep(side: 'publisher' | 'nation', nationId: string | null, mediaId: string, input: { step?: string; by?: string; to?: string; sealId?: string; note?: string }, now = Date.now()): MediaShipment | { error: string; status: number } {
  const s = mdb().media.find(x => x.mediaId === mediaId && (nationId === null || x.nationId === nationId));
  if (!s) return { error: 'Media not found', status: 404 };
  const step = String(input.step ?? '');
  const rule = NEXT[step];
  if (!rule || rule.side !== side) return { error: `Unknown custody step for the ${side}`, status: 422 };
  if (s.state !== rule.from) return { error: s.state === 'seal-broken' ? 'The seal did not match: this media must not be used' : `Next step is after “${s.state}”, not ${step}`, status: 409 };
  const by = str(input.by, 120), to = str(input.to, 120), note = str(input.note, 500);
  if (!by) return { error: 'Name who is taking this step', status: 422 };
  if (step === 'handed-over' && !to) return { error: 'Name who the media is handed to (courier or official)', status: 422 };
  if (step === 'received') {
    const handedTo = s.chain.find(c => c.step === 'handed-over')?.to;
    if (!note && handedTo && handedTo !== by) return { error: `Handed to ${handedTo}; a different receiver must note how it reached them`, status: 422 };
  }
  const at = new Date(now).toISOString();
  let ok: boolean | undefined;
  if (step === 'seal-verified') {
    const read = str(input.sealId, 60);
    if (!read) return { error: 'Enter the seal number as read on the media', status: 422 };
    ok = read.toUpperCase() === s.sealId.toUpperCase();
  }
  const a = recordAudit(by, `update.media.${step}`, `UpdateChamber:${s.nationId}/media`, ok === false ? 'denied' : 'ok',
    `${s.mediaId}${to ? ` · to ${to}` : ''}${ok === false ? ` · seal mismatch (read ${str(input.sealId, 60)}, sealed ${s.sealId})` : ''}${note ? ` · ${note}` : ''}`);
  s.chain.push({ step: step as MediaShipment['chain'][number]['step'], at, by, to: to || undefined, note: note || undefined, sealId: step === 'seal-verified' ? str(input.sealId, 60) : undefined, ok, auditSeq: a.seq });
  s.state = ok === false ? 'seal-broken' : step as MediaShipment['state'];
  // Verified media counts as mirrored for an air-gapped nation's sync manifest.
  if (ok) {
    const m = getMirror(s.nationId);
    if (m) m.mirrored = [...new Set([...m.mirrored, ...s.releaseIds])];
  }
  return s;
}
