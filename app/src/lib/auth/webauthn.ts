// Passkeys and security keys (Web Authentication, W3C WebAuthn Level 2 §7),
// verified on the server without an outside library: the registration and
// authentication ceremonies' checks, a minimal CBOR reader (RFC 8949,
// definite lengths only, as CTAP2 sends) and COSE public keys (RFC 9053:
// ES256, RS256, EdDSA). Pure functions over bytes; challenges, stored
// credentials and the audit live in lib/auth/passkeys.ts and
// lib/auth/officials.ts.
//
// Attestation: the platform asks for none and does not trust any statement it
// is sent (it records the format only), so a credential proves possession of
// its key, never the make of the device. Tested against real browser and
// authenticator responses (SimpleWebAuthn's published vectors) and a software
// authenticator (webauthn.test.ts).

import { createHash, createPublicKey, verify as verifySig, type KeyObject } from 'node:crypto';

export const ALG_ES256 = -7;
export const ALG_RS256 = -257;
export const ALG_EDDSA = -8;
/** The algorithms the platform accepts, in order of preference (PublicKeyCredentialParameters). */
export const SUPPORTED_ALGS = [ALG_ES256, ALG_EDDSA, ALG_RS256] as const;

export const b64u = (b: Uint8Array) => Buffer.from(b).toString('base64url');
/** base64url (or standard base64, padded or not) to bytes; throws on anything else. */
export function fromB64u(s: string): Buffer {
  if (typeof s !== 'string' || !/^[A-Za-z0-9_\-+/]*={0,2}$/.test(s)) throw new WebAuthnError('Not base64url');
  return Buffer.from(s.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''), 'base64url');
}
const sha256 = (b: Uint8Array | string) => createHash('sha256').update(b).digest();

export class WebAuthnError extends Error {}

// ── CBOR (definite lengths) ──────────────────────────────────────────────
export type Cbor = number | bigint | string | Uint8Array | boolean | null | undefined | Cbor[] | Map<Cbor, Cbor>;

/** Decode one CBOR item at `offset`; returns it and where it ends. */
export function cborDecode(buf: Uint8Array, offset = 0, depth = 0): { value: Cbor; end: number } {
  if (depth > 16) throw new WebAuthnError('CBOR nested too deeply');
  const need = (n: number) => { if (offset + n > buf.length) throw new WebAuthnError('CBOR ends early'); };
  need(1);
  const ib = buf[offset++]!;
  const major = ib >> 5;
  const info = ib & 31;
  let len: number | bigint;
  if (info < 24) len = info;
  else if (info === 24) { need(1); len = buf[offset]!; offset += 1; }
  else if (info === 25) { need(2); len = (buf[offset]! << 8) | buf[offset + 1]!; offset += 2; }
  else if (info === 26) { need(4); len = Buffer.from(buf.buffer, buf.byteOffset + offset, 4).readUInt32BE(0); offset += 4; }
  else if (info === 27) { need(8); len = Buffer.from(buf.buffer, buf.byteOffset + offset, 8).readBigUInt64BE(0); offset += 8; }
  else throw new WebAuthnError('CBOR indefinite lengths are not accepted');
  const n = (): number => {
    if (typeof len === 'bigint') { if (len > BigInt(Number.MAX_SAFE_INTEGER)) throw new WebAuthnError('CBOR length too large'); return Number(len); }
    return len;
  };
  switch (major) {
    case 0: return { value: typeof len === 'bigint' && len > BigInt(Number.MAX_SAFE_INTEGER) ? len : n(), end: offset };
    case 1: return { value: typeof len === 'bigint' && len > BigInt(Number.MAX_SAFE_INTEGER) ? -1n - len : -1 - n(), end: offset };
    case 2: { const l = n(); need(l); return { value: buf.slice(offset, offset + l), end: offset + l }; }
    case 3: { const l = n(); need(l); return { value: new TextDecoder('utf-8', { fatal: true }).decode(buf.slice(offset, offset + l)), end: offset + l }; }
    case 4: {
      const out: Cbor[] = [];
      for (let i = 0, l = n(); i < l; i++) { const r = cborDecode(buf, offset, depth + 1); out.push(r.value); offset = r.end; }
      return { value: out, end: offset };
    }
    case 5: {
      const out = new Map<Cbor, Cbor>();
      for (let i = 0, l = n(); i < l; i++) {
        const k = cborDecode(buf, offset, depth + 1);
        if (typeof k.value === 'object' && k.value !== null) throw new WebAuthnError('CBOR map keys must be numbers or text');
        const v = cborDecode(buf, k.end, depth + 1);
        if (out.has(k.value)) throw new WebAuthnError('CBOR map has a repeated key');
        out.set(k.value, v.value); offset = v.end;
      }
      return { value: out, end: offset };
    }
    case 6: return cborDecode(buf, offset, depth + 1); // tag: the tagged item
    case 7:
      if (info === 20) return { value: false, end: offset };
      if (info === 21) return { value: true, end: offset };
      if (info === 22) return { value: null, end: offset };
      if (info === 23) return { value: undefined, end: offset };
      throw new WebAuthnError('CBOR floats and simple values are not expected here');
    default: throw new WebAuthnError('CBOR major type unknown');
  }
}

// ── COSE keys ───────────────────────────────────────────────────────────
/** A COSE_Key (RFC 9052 §7) as a Node public key, with its algorithm. */
export function coseToKey(cose: Uint8Array): { key: KeyObject; alg: number } {
  const { value, end } = cborDecode(cose);
  if (end !== cose.length || !(value instanceof Map)) throw new WebAuthnError('The public key is not a COSE key');
  const kty = value.get(1), alg = value.get(3);
  const bytes = (k: number) => { const v = value.get(k); if (!(v instanceof Uint8Array)) throw new WebAuthnError('The COSE key is incomplete'); return b64u(v); };
  if (alg === ALG_ES256) {
    if (kty !== 2 || value.get(-1) !== 1) throw new WebAuthnError('ES256 needs an EC2 key on P-256');
    const x = bytes(-2), y = bytes(-3);
    if (fromB64u(x).length !== 32 || fromB64u(y).length !== 32) throw new WebAuthnError('The P-256 key has the wrong size');
    return { key: createPublicKey({ key: { kty: 'EC', crv: 'P-256', x, y }, format: 'jwk' }), alg };
  }
  if (alg === ALG_EDDSA) {
    if (kty !== 1 || value.get(-1) !== 6) throw new WebAuthnError('EdDSA needs an OKP key on Ed25519');
    return { key: createPublicKey({ key: { kty: 'OKP', crv: 'Ed25519', x: bytes(-2) }, format: 'jwk' }), alg };
  }
  if (alg === ALG_RS256) {
    if (kty !== 3) throw new WebAuthnError('RS256 needs an RSA key');
    const k = createPublicKey({ key: { kty: 'RSA', n: bytes(-1), e: bytes(-2) }, format: 'jwk' });
    if ((k.asymmetricKeyDetails?.modulusLength ?? 0) < 2048) throw new WebAuthnError('RSA keys shorter than 2048 bits are refused');
    return { key: k, alg };
  }
  throw new WebAuthnError(`Algorithm ${String(alg)} is not accepted`);
}

function checkSignature(alg: number, key: KeyObject, data: Buffer, sig: Buffer): boolean {
  try {
    if (alg === ALG_ES256) return verifySig('sha256', data, { key, dsaEncoding: 'der' }, sig);
    if (alg === ALG_RS256) return verifySig('sha256', data, key, sig);
    if (alg === ALG_EDDSA) return verifySig(null, data, key, sig);
  } catch { return false; }
  return false;
}

// ── Authenticator data (§6.1) ────────────────────────────────────────────
export interface AuthData {
  rpIdHash: Buffer; flags: number; up: boolean; uv: boolean; be: boolean; bs: boolean; at: boolean; ed: boolean;
  signCount: number;
  attested?: { aaguid: Buffer; credentialId: Buffer; publicKey: Buffer };
}

export function parseAuthData(b: Buffer): AuthData {
  if (b.length < 37) throw new WebAuthnError('Authenticator data is too short');
  const flags = b[32]!;
  const ad: AuthData = { rpIdHash: b.subarray(0, 32), flags, up: !!(flags & 0x01), uv: !!(flags & 0x04), be: !!(flags & 0x08), bs: !!(flags & 0x10), at: !!(flags & 0x40), ed: !!(flags & 0x80), signCount: b.readUInt32BE(33) };
  let off = 37;
  if (ad.at) {
    if (b.length < off + 18) throw new WebAuthnError('Attested credential data is too short');
    const aaguid = b.subarray(off, off + 16); off += 16;
    const idLen = b.readUInt16BE(off); off += 2;
    if (idLen > 1023 || b.length < off + idLen) throw new WebAuthnError('The credential id is too long or cut short');
    const credentialId = b.subarray(off, off + idLen); off += idLen;
    const { end } = cborDecode(b, off);
    ad.attested = { aaguid, credentialId, publicKey: b.subarray(off, end) };
    off = end;
  }
  if (ad.ed) off = cborDecode(b, off).end;
  if (off !== b.length) throw new WebAuthnError('Authenticator data has trailing bytes');
  return ad;
}

// ── Client data (§5.8.1) ─────────────────────────────────────────────────
function checkClientData(raw: Buffer, type: 'webauthn.create' | 'webauthn.get', challenge: string, origins: string[]): void {
  let c: { type?: unknown; challenge?: unknown; origin?: unknown; crossOrigin?: unknown; tokenBinding?: { status?: unknown } };
  try { c = JSON.parse(raw.toString('utf8')); } catch { throw new WebAuthnError('The client data is not JSON'); }
  if (c.type !== type) throw new WebAuthnError(`The client data is not a ${type === 'webauthn.create' ? 'registration' : 'sign-in'}`);
  if (typeof c.challenge !== 'string' || c.challenge.replace(/=+$/, '') !== challenge.replace(/=+$/, '')) throw new WebAuthnError('The challenge does not match (expired or used already?)');
  if (typeof c.origin !== 'string' || !origins.includes(c.origin)) throw new WebAuthnError(`The page origin ${String(c.origin)} is not this platform`);
  if (c.crossOrigin === true) throw new WebAuthnError('Passkeys used from inside another site\'s frame are refused');
  if (c.tokenBinding?.status === 'present') throw new WebAuthnError('Token binding is not supported');
}

export interface Expect {
  /** The challenge the server issued, base64url. */
  challenge: string;
  /** The platform's origins (scheme://host[:port]) the ceremony may run on. */
  origins: string[];
  rpId: string;
  /** Require the user verified (PIN or biometric) on the authenticator. */
  requireUv: boolean;
}

export interface RegistrationJSON {
  id: string; rawId?: string; type?: string;
  response: { clientDataJSON: string; attestationObject: string; transports?: string[] };
}

export interface NewCredential {
  /** base64url credential id. */
  id: string;
  /** COSE public key, base64url. Only the public key is ever kept. */
  publicKey: string;
  alg: number;
  signCount: number;
  aaguid: string;
  fmt: string;
  uv: boolean;
  backupEligible: boolean;
  backedUp: boolean;
  transports: string[];
}

/** The registration ceremony (§7.1, steps 5–26 without attestation trust). */
export function verifyRegistration(r: RegistrationJSON, e: Expect): NewCredential {
  if (!r || typeof r !== 'object' || !r.response) throw new WebAuthnError('No registration response');
  if (r.type !== undefined && r.type !== 'public-key') throw new WebAuthnError('Not a public-key credential');
  checkClientData(fromB64u(r.response.clientDataJSON), 'webauthn.create', e.challenge, e.origins);
  const att = cborDecode(fromB64u(r.response.attestationObject));
  if (!(att.value instanceof Map)) throw new WebAuthnError('The attestation object is not a map');
  const fmt = att.value.get('fmt'), authData = att.value.get('authData');
  if (typeof fmt !== 'string' || !(authData instanceof Uint8Array)) throw new WebAuthnError('The attestation object is incomplete');
  const ad = parseAuthData(Buffer.from(authData));
  if (!ad.rpIdHash.equals(sha256(e.rpId))) throw new WebAuthnError('The passkey was made for another site');
  if (!ad.up) throw new WebAuthnError('The authenticator did not confirm a person was present');
  if (e.requireUv && !ad.uv) throw new WebAuthnError('The authenticator did not verify the person (PIN or biometric)');
  if (!ad.be && ad.bs) throw new WebAuthnError('Inconsistent backup flags');
  if (!ad.attested) throw new WebAuthnError('No credential in the registration');
  const { key: _k, alg } = coseToKey(ad.attested.publicKey);
  const id = b64u(ad.attested.credentialId);
  if (fromB64u(r.id).toString('base64url') !== id) throw new WebAuthnError('The credential id does not match the authenticator data');
  return {
    id, publicKey: b64u(ad.attested.publicKey), alg, signCount: ad.signCount, aaguid: ad.attested.aaguid.toString('hex'), fmt,
    uv: ad.uv, backupEligible: ad.be, backedUp: ad.bs,
    transports: (Array.isArray(r.response.transports) ? r.response.transports : []).filter((t): t is string => typeof t === 'string' && /^[a-z-]{2,16}$/.test(t)).slice(0, 6),
  };
}

export interface AssertionJSON {
  id: string; rawId?: string; type?: string;
  response: { clientDataJSON: string; authenticatorData: string; signature: string; userHandle?: string | null };
}

/** The authentication ceremony (§7.2, steps 5–21) for one stored credential. Returns the new signature counter. */
export function verifyAssertion(r: AssertionJSON, e: Expect, cred: { id: string; publicKey: string; signCount: number }): { signCount: number; uv: boolean; backedUp: boolean } {
  if (!r || typeof r !== 'object' || !r.response) throw new WebAuthnError('No sign-in response');
  if (r.type !== undefined && r.type !== 'public-key') throw new WebAuthnError('Not a public-key credential');
  if (fromB64u(r.id).toString('base64url') !== cred.id) throw new WebAuthnError('This is not the passkey expected');
  const clientData = fromB64u(r.response.clientDataJSON);
  checkClientData(clientData, 'webauthn.get', e.challenge, e.origins);
  const authData = fromB64u(r.response.authenticatorData);
  const ad = parseAuthData(authData);
  if (!ad.rpIdHash.equals(sha256(e.rpId))) throw new WebAuthnError('The passkey belongs to another site');
  if (!ad.up) throw new WebAuthnError('The authenticator did not confirm a person was present');
  if (e.requireUv && !ad.uv) throw new WebAuthnError('The authenticator did not verify the person (PIN or biometric)');
  const { key, alg } = coseToKey(fromB64u(cred.publicKey));
  if (!checkSignature(alg, key, Buffer.concat([authData, sha256(clientData)]), fromB64u(r.response.signature))) throw new WebAuthnError('The passkey\'s signature does not verify');
  // §7.2 step 21: a counter that does not move forward suggests a cloned authenticator.
  if ((ad.signCount !== 0 || cred.signCount !== 0) && ad.signCount <= cred.signCount) throw new WebAuthnError('The passkey\'s counter went backwards (a copied authenticator?); it is refused');
  return { signCount: ad.signCount, uv: ad.uv, backedUp: ad.bs };
}
