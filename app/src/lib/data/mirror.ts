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
//
// Plan I9 (acceptance P5-15): the seal proves custody, not authenticity. The
// publisher signs a statement of every file written to the media
// (lib/updates/release-signing.ts, DSSE over an in-toto statement), written to
// the media beside them. After the seal is verified, the nation verifies the
// contents on the disconnected side: the statement read from the media must
// be signed by a publisher key two of its officials trusted
// (lib/data/release-trust.ts), name this shipment, and its subjects must be
// exactly the files read (each SHA-256 computed locally,
// app/scripts/verify-update-media.mjs). Only then are the releases mirrored;
// contents that do not verify mark the media unusable. A production
// installation never accepts media signed with a development key.

import { createHash } from 'node:crypto';
import type { DistributionRelease, LocalMirror, MediaShipment, ReleaseArtifact, SyncItem, SyncManifest } from '@/lib/api/types';
import { recordAudit } from '@/lib/data/store/audit';
import { allReleases, nationRecord, visibleTo, releaseFor } from './updates';
import { compareVersions } from '@/lib/updates/semver';
import { touch } from '@/lib/data/repo/track';
import { mediaStatement, releaseStatement, signStatement, verifyEnvelope, compareSubjects, MEDIA_PREDICATE, RELEASE_PREDICATE, type SignedStatement } from '@/lib/updates/release-signing';
import { trustedKeysFor } from './release-trust';
import { installationMode } from '@/lib/ops/mode';

const sha = (v: string) => createHash('sha256').update(v).digest('hex');
const DELTA_KINDS = new Set(['container-image', 'offline-bundle', 'restore-kit', 'binary-tarball']);

interface MirrorDb { mirrors: Record<string, LocalMirror>; media: MediaShipment[]; mediaSeq: number }
const g = globalThis as unknown as { __civicosMirror?: MirrorDb };
function mdb(): MirrorDb { return touch('__civicosMirror', g.__civicosMirror ??= { mirrors: {}, media: [], mediaSeq: 1001 }); }
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
    // Older than what the nation runs: not needed (the installed release is kept for reinstall and fallback).
    if (compareVersions(r.version, n.installedVersion) < 0) continue;
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
  // Plan I9 (P5-15): a production installation mirrors only releases whose signed statement and artifacts it verified.
  const unverified = ids.filter(id => !m.verified?.[id]);
  if (installationMode() === 'production' && unverified.length) return { error: `Verify each release's signed statement and artifacts first (${unverified.join(', ')})`, status: 409 };
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
  const mediaId = `MEDIA-${db.mediaSeq}`;
  // Plan I9: the publisher's signed statement of every file written to the media (written to it as media-manifest.intoto.json).
  const signed = signStatement(mediaStatement({ mediaId, nationId, sealId, releaseIds: rs.map(r => r.id), contents }, at), new Date(now));
  const a = recordAudit(by, 'update.media.sealed', `UpdateChamber:${nationId}/media`, 'ok', `${mediaId} · seal ${sealId} · ${rs.map(r => r.version).join(', ')} · signed by ${signed.keyId}${signed.production ? '' : ' (development key)'}`);
  db.mediaSeq++;
  const s: MediaShipment = { mediaId, nationId, releaseIds: rs.map(r => r.id), contents, sealId, state: 'sealed', chain: [{ step: 'sealed', at, by, sealId, auditSeq: a.seq }],
    signed: { envelope: signed.envelope, keyId: signed.keyId, production: signed.production, signedAt: signed.signedAt } };
  db.media.push(s);
  return s;
}

const NEXT: Record<string, { from: MediaShipment['state']; side: 'publisher' | 'nation' }> = {
  'handed-over': { from: 'sealed', side: 'publisher' },
  received: { from: 'handed-over', side: 'nation' },
  'seal-verified': { from: 'received', side: 'nation' },
  'contents-verified': { from: 'seal-verified', side: 'nation' },
};

/** The next custody step. Handing over names who receives it; verification compares the seal number. */
export function custodyStep(side: 'publisher' | 'nation', nationId: string | null, mediaId: string, input: { step?: string; by?: string; to?: string; sealId?: string; note?: string; envelope?: unknown; files?: unknown }, now = Date.now()): MediaShipment | { error: string; status: number } {
  const s = mdb().media.find(x => x.mediaId === mediaId && (nationId === null || x.nationId === nationId));
  if (!s) return { error: 'Media not found', status: 404 };
  const step = String(input.step ?? '');
  const rule = NEXT[step];
  if (!rule || rule.side !== side) return { error: `Unknown custody step for the ${side}`, status: 422 };
  if (s.state !== rule.from) return { error: s.state === 'seal-broken' ? 'The seal did not match: this media must not be used' : s.state === 'contents-rejected' ? 'The contents did not verify: this media must not be used' : `Next step is after “${s.state}”, not ${step}`, status: 409 };
  if (step === 'contents-verified') return verifyContents(s, input, now);
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
  // Verified media counts as mirrored for an air-gapped nation's sync manifest; signed media only once its contents verify too.
  if (ok && !s.signed) {
    const m = getMirror(s.nationId);
    if (m) m.mirrored = [...new Set([...m.mirrored, ...s.releaseIds])];
  }
  return s;
}

/**
 * The contents check on the disconnected side (plan I9, acceptance P5-15):
 * `envelope` is the signed statement as read from the media
 * (media-manifest.intoto.json), `files` each file read from it with the
 * SHA-256 computed there. Verified: signed by a publisher key the nation
 * trusts (two officials), naming this shipment, nation and seal, and the
 * files exactly its subjects; the releases are then mirrored. Anything else
 * is recorded with its problems and the media is unusable.
 */
function verifyContents(s: MediaShipment, input: { by?: string; envelope?: unknown; files?: unknown; note?: string }, now: number): MediaShipment | { error: string; status: number } {
  if (!s.signed) return { error: 'This media was sealed before its contents were signed: its seal is its only check', status: 409 };
  const by = str(input.by, 120);
  if (!by) return { error: 'Name who is taking this step', status: 422 };
  const files = Array.isArray(input.files) ? input.files.filter(f => f && typeof f === 'object').map(f => ({ filename: str((f as { filename?: unknown }).filename, 300), sha256: str((f as { sha256?: unknown }).sha256, 64).toLowerCase() })) : [];
  if (!files.length || files.some(f => !f.filename || !/^[0-9a-f]{64}$/.test(f.sha256))) return { error: 'List every file read from the media with the SHA-256 computed there (scripts/verify-update-media.mjs prints them)', status: 422 };
  if (input.envelope === undefined) return { error: 'Give the signed statement as read from the media (media-manifest.intoto.json)', status: 422 };
  const problems: string[] = [];
  const v = verifyEnvelope(input.envelope, trustedKeysFor(s.nationId), { predicateType: MEDIA_PREDICATE, signedAt: s.signed.signedAt });
  if (!v.ok) problems.push(v.problem);
  else {
    const p = v.statement.predicate as { mediaId?: string; nation?: string; sealId?: string };
    if (p.mediaId !== s.mediaId || p.nation !== s.nationId || String(p.sealId ?? '').toUpperCase() !== s.sealId.toUpperCase()) problems.push(`The statement is for ${p.mediaId ?? '?'} (nation ${p.nation ?? '?'}, seal ${p.sealId ?? '?'}), not this media`);
    const c = compareSubjects(v.statement, files);
    if (c.missing.length) problems.push(`Missing from the media: ${c.missing.join(', ').slice(0, 300)}`);
    if (c.changed.length) problems.push(`Changed (SHA-256 differs from the signed statement): ${c.changed.join(', ').slice(0, 300)}`);
    if (c.extra.length) problems.push(`Not in the signed statement: ${c.extra.join(', ').slice(0, 300)}`);
    if (installationMode() === 'production' && !s.signed.production && v.keyId === s.signed.keyId) problems.push('Signed with a development key: a production installation never accepts it');
  }
  const ok = problems.length === 0;
  const note = str(input.note, 500);
  const a = recordAudit(by, 'update.media.contents-verified', `UpdateChamber:${s.nationId}/media`, ok ? 'ok' : 'denied',
    `${s.mediaId} · ${files.length} file(s)${v.ok ? ` · signed by ${v.keyId}` : ''}${ok ? ' · every file matches the signed statement' : ` · ${problems.join('; ').slice(0, 400)}`}${note ? ` · ${note}` : ''}`);
  s.chain.push({ step: 'contents-verified', at: new Date(now).toISOString(), by, ok, ...(note ? { note } : {}), ...(ok ? {} : { problems }), auditSeq: a.seq });
  s.state = ok ? 'contents-verified' : 'contents-rejected';
  if (ok) {
    const m = getMirror(s.nationId);
    if (m) m.mirrored = [...new Set([...m.mirrored, ...s.releaseIds])];
  }
  return s;
}

/** What is written to the media beside the files: the signed statement (media-manifest.intoto.json). */
export function mediaManifestFile(nationId: string | null, mediaId: string): { filename: string; envelope: NonNullable<MediaShipment['signed']>['envelope'] } | undefined {
  const s = mdb().media.find(x => x.mediaId === mediaId && (nationId === null || x.nationId === nationId));
  return s?.signed ? { filename: 'media-manifest.intoto.json', envelope: structuredClone(s.signed.envelope) } : undefined;
}

// ── Signed releases (plan I9, acceptance P5-15) ─────────────────────
/** The publisher's signed statement of a release the nation can see: every artifact by name and SHA-256 (audited like a download). */
export function signedRelease(nationId: string, releaseId: string, by = 'download link'): SignedStatement | undefined {
  const r = releaseFor(nationId, releaseId);
  if (!r) return undefined;
  const signed = signStatement(releaseStatement({ id: r.id, version: r.version, channel: r.channel, ...(r.nationId ? { nationId: r.nationId } : {}), releasedAt: r.releasedAt, artifacts: r.artifacts.map(a => ({ filename: a.filename, sha256: a.sha256, kind: a.kind })) }));
  recordAudit(by, 'update.release.statement', `UpdateChamber:${nationId}/${r.version}`, 'ok', `release ${r.id} · ${r.artifacts.length} artifact(s) · signed by ${signed.keyId}${signed.production ? '' : ' (development key)'}`);
  return signed;
}

/**
 * The nation verifies a release before it is mirrored: the statement (as
 * fetched or carried) signed by a publisher key it trusts, naming this
 * release, and the artifacts it holds (SHA-256 computed where they are) every
 * one the statement lists for its delivery mode, none changed. Recorded either
 * way; only a verified release can be recorded as synced in production.
 */
export function verifyRelease(nationId: string, releaseId: string, input: { by?: string; envelope?: unknown; files?: unknown }, now = Date.now()): { verified: boolean; problems: string[] } | { error: string; status: number } {
  const n = nationRecord(nationId);
  if (!n) return { error: 'Nation not found', status: 404 };
  const r = releaseFor(nationId, releaseId);
  if (!r) return { error: 'Choose one of your releases', status: 422 };
  const m = getMirror(nationId);
  if (!m) return { error: 'Register the mirror first', status: 409 };
  const by = str(input.by, 120);
  if (!by) return { error: 'Name who verified the release', status: 422 };
  const files = Array.isArray(input.files) ? input.files.filter(f => f && typeof f === 'object').map(f => ({ filename: str((f as { filename?: unknown }).filename, 300), sha256: str((f as { sha256?: unknown }).sha256, 64).toLowerCase() })) : [];
  if (!files.length || files.some(f => !f.filename || !/^[0-9a-f]{64}$/.test(f.sha256))) return { error: 'List each artifact held with the SHA-256 computed where it is', status: 422 };
  const problems: string[] = [];
  const v = verifyEnvelope(input.envelope, trustedKeysFor(nationId), { predicateType: RELEASE_PREDICATE });
  if (!v.ok) problems.push(v.problem);
  else {
    const p = v.statement.predicate as { releaseId?: string; version?: string };
    if (p.releaseId !== r.id || p.version !== r.version) problems.push(`The statement is for ${p.releaseId ?? '?'} ${p.version ?? ''}, not ${r.id} ${r.version}`);
    // The artifacts of the nation's delivery mode must all be there; others in the statement may be absent.
    const wanted = new Set(artifactsFor(r, n.deliveryMode).map(a => a.filename));
    const c = compareSubjects({ ...v.statement, subject: v.statement.subject.filter(s => wanted.has(s.name) || files.some(f => f.filename === s.name)) }, files);
    if (c.missing.length) problems.push(`Not held: ${c.missing.join(', ').slice(0, 300)}`);
    if (c.changed.length) problems.push(`Changed (SHA-256 differs from the signed statement): ${c.changed.join(', ').slice(0, 300)}`);
    if (c.extra.length) problems.push(`Not in the signed statement: ${c.extra.join(', ').slice(0, 300)}`);
  }
  const verified = problems.length === 0;
  recordAudit(by, 'update.release.verify', `UpdateChamber:${nationId}/${r.version}`, verified ? 'ok' : 'denied', `${r.id} · ${files.length} artifact(s)${v.ok ? ` · signed by ${v.keyId}` : ''}${verified ? ' · verified' : ` · ${problems.join('; ').slice(0, 400)}`}`);
  if (verified && v.ok) (m.verified ??= {})[r.id] = { at: new Date(now).toISOString(), by, keyId: v.keyId, files: files.length };
  return { verified, problems };
}
