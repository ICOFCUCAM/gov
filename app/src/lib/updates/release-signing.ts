// Signed releases and verified update media (plan I9; acceptance P5-15 "A
// disconnected institution can receive a controlled software update and
// verify its authenticity"; specification Part 5 H "Supply chain").
//
// The publisher signs, for every release, an in-toto Statement v1 whose
// subjects are the release's artifacts (file name and SHA-256), and for every
// shipment of physical media a statement whose subjects are the files written
// to it, as DSSE envelopes (the format `cosign attest` writes): the signature
// is Ed25519 over the DSSE pre-authentication encoding of the payload type and
// payload, by the publisher's release key (CIVICOS_RELEASE_SIGNING_KEY: a
// PKCS#8 PEM or a key file, held by the publisher's build; without one a key
// generated for this process signs, marked production: false, and a
// production installation never accepts what it signed).
//
// On the disconnected side nothing is fetched: the nation verifies with the
// publisher's public keys it trusts, each trusted only when one of its
// officials proposes it (a fingerprint compared out of band) and a different
// official confirms it (dualControlRefusal()); one official revokes a key at
// once. A received statement verifies when its signature is by a key the
// nation trusts (not revoked, and not retired before it was signed), and the
// files read from the media (each file's SHA-256 computed locally, by
// app/scripts/verify-update-media.mjs or any sha256sum) are exactly its
// subjects: none missing, none changed, none added.

import { createHash, createPublicKey, verify as edVerify } from 'node:crypto';
import { signingKey, signBytes, keyIdOfPem } from '@/lib/crypto/signing-key';
import { installationMode } from '@/lib/ops/mode';

export const RELEASE_KEY_ENV = 'CIVICOS_RELEASE_SIGNING_KEY';
export const STATEMENT_TYPE = 'https://in-toto.io/Statement/v1';
export const RELEASE_PREDICATE = 'https://civicos.example/attestations/release/v1';
export const MEDIA_PREDICATE = 'https://civicos.example/attestations/update-media/v1';
export const PAYLOAD_TYPE = 'application/vnd.in-toto+json';

export interface Subject { name: string; digest: { sha256: string } }
export interface Statement { _type: string; subject: Subject[]; predicateType: string; predicate: Record<string, unknown> }
export interface DsseEnvelope { payloadType: string; payload: string; signatures: { keyid: string; sig: string }[] }
export interface SignedStatement { envelope: DsseEnvelope; keyId: string; publicKeyPem: string; production: boolean; signedAt: string }

/** DSSE v1 pre-authentication encoding: "DSSEv1" SP LEN(type) SP type SP LEN(body) SP body. */
export function pae(payloadType: string, body: Buffer): Buffer {
  const t = Buffer.from(payloadType, 'utf8');
  return Buffer.concat([Buffer.from(`DSSEv1 ${t.length} `, 'utf8'), t, Buffer.from(` ${body.length} `, 'utf8'), body]);
}

/** The publisher's release key: its public half and whether it is a production key. */
export function releaseKey(): { keyId: string; publicKeyPem: string; production: boolean; source: string } {
  const k = signingKey(RELEASE_KEY_ENV);
  return { keyId: k.keyId, publicKeyPem: k.publicKeyPem, production: k.production, source: k.source };
}

/** Sign a statement as a DSSE envelope with the publisher's release key. */
export function signStatement(statement: Statement, now = new Date()): SignedStatement {
  const k = signingKey(RELEASE_KEY_ENV);
  const body = Buffer.from(JSON.stringify(statement), 'utf8');
  const sig = signBytes(k, pae(PAYLOAD_TYPE, body));
  return { envelope: { payloadType: PAYLOAD_TYPE, payload: body.toString('base64'), signatures: [{ keyid: k.keyId, sig }] }, keyId: k.keyId, publicKeyPem: k.publicKeyPem, production: k.production, signedAt: now.toISOString() };
}

/** The statement a release is signed with: every artifact by file name and SHA-256. */
export function releaseStatement(r: { id: string; version: string; channel: string; nationId?: string; releasedAt: string; artifacts: { filename: string; sha256: string; kind: string }[] }): Statement {
  return {
    _type: STATEMENT_TYPE,
    subject: r.artifacts.map(a => ({ name: a.filename, digest: { sha256: a.sha256 } })),
    predicateType: RELEASE_PREDICATE,
    predicate: { releaseId: r.id, version: r.version, channel: r.channel, ...(r.nationId ? { nation: r.nationId } : {}), releasedAt: r.releasedAt, artifacts: r.artifacts.map(a => ({ name: a.filename, kind: a.kind })) },
  };
}

/** The statement a shipment of physical media is signed with: every file written to it. */
export function mediaStatement(s: { mediaId: string; nationId: string; sealId: string; releaseIds: string[]; contents: { filename: string; sha256: string; sizeBytes: number }[] }, at: string): Statement {
  return {
    _type: STATEMENT_TYPE,
    subject: s.contents.map(c => ({ name: c.filename, digest: { sha256: c.sha256 } })),
    predicateType: MEDIA_PREDICATE,
    predicate: { mediaId: s.mediaId, nation: s.nationId, sealId: s.sealId, releases: s.releaseIds, sizes: Object.fromEntries(s.contents.map(c => [c.filename, c.sizeBytes])), sealedAt: at },
  };
}

export interface TrustedKey { keyId: string; publicKeyPem: string; trustedFrom: string; retiredAt?: string; revokedAt?: string }

/**
 * Verify a DSSE envelope against the keys a nation trusts: a key it trusts
 * signed it (revoked keys never; a retired key only for what was signed
 * before its successor), the signature holds over the pre-authentication
 * encoding, and the payload is an in-toto statement of the expected kind.
 * A development-key signature never verifies in a production installation.
 */
export function verifyEnvelope(envelope: unknown, trusted: TrustedKey[], expect: { predicateType: string; signedAt?: string }): { ok: true; keyId: string; statement: Statement } | { ok: false; problem: string } {
  const e = envelope as DsseEnvelope;
  if (!e || typeof e !== 'object' || e.payloadType !== PAYLOAD_TYPE || typeof e.payload !== 'string' || !Array.isArray(e.signatures) || !e.signatures.length) return { ok: false, problem: 'Not a DSSE envelope of an in-toto statement' };
  const body = Buffer.from(e.payload, 'base64');
  for (const s of e.signatures) {
    const k = trusted.find(t => t.keyId === s?.keyid);
    if (!k) continue;
    if (k.revokedAt) return { ok: false, problem: `Signed by key ${k.keyId}, which this nation revoked on ${k.revokedAt.slice(0, 10)}` };
    if (k.retiredAt && expect.signedAt && expect.signedAt > k.retiredAt) return { ok: false, problem: `Signed by key ${k.keyId} after its successor was trusted` };
    let good = false;
    try { good = edVerify(null, pae(e.payloadType, body), createPublicKey(k.publicKeyPem), Buffer.from(String(s.sig), 'base64')); } catch { good = false; }
    if (!good) return { ok: false, problem: `The signature by ${k.keyId} does not verify: the statement was changed or not signed by that key` };
    let statement: Statement;
    try { statement = JSON.parse(body.toString('utf8')) as Statement; } catch { return { ok: false, problem: 'The signed payload is not JSON' }; }
    if (statement._type !== STATEMENT_TYPE || statement.predicateType !== expect.predicateType || !Array.isArray(statement.subject)) return { ok: false, problem: `The signed payload is not a ${expect.predicateType} statement` };
    return { ok: true, keyId: k.keyId, statement };
  }
  return { ok: false, problem: `No signature by a publisher key this nation trusts (signed by ${e.signatures.map(s => s?.keyid).join(', ').slice(0, 120)}): two of its officials trust a key first` };
}

/** Compare the files read from the media (name and locally computed SHA-256) with a statement's subjects. */
export function compareSubjects(statement: Statement, files: { filename: string; sha256: string }[]): { ok: boolean; missing: string[]; changed: string[]; extra: string[] } {
  const want = new Map(statement.subject.map(s => [s.name, s.digest.sha256.toLowerCase()]));
  const got = new Map(files.map(f => [String(f.filename), String(f.sha256).toLowerCase()]));
  const missing = [...want.keys()].filter(n => !got.has(n));
  const changed = [...want.entries()].filter(([n, h]) => got.has(n) && got.get(n) !== h).map(([n]) => n);
  const extra = [...got.keys()].filter(n => !want.has(n));
  return { ok: !missing.length && !changed.length && !extra.length, missing, changed, extra };
}

/** A key's id from its PEM (null when it is not an Ed25519 public key). */
export const keyIdOfPublicPem = (pem: string): string | null => keyIdOfPem(pem);
/** SHA-256 hex of bytes. */
export const sha256Hex = (b: Uint8Array | string): string => createHash('sha256').update(b).digest('hex');
/** Whether a signature made now with the release key would be accepted by a production installation. */
export const releaseKeyRefusal = (): string | null => (installationMode() === 'production' && !releaseKey().production ? `This installation has no publisher release key: set ${RELEASE_KEY_ENV}. A development key generated for this process signs nothing a production installation accepts` : null);
