// A software authenticator for tests (never imported by the app): makes
// WebAuthn registration and assertion responses the way a browser and a
// CTAP2 authenticator would, with real keys, so the ceremonies in
// lib/auth/webauthn.ts can be exercised end to end, including the ways they
// must fail.

import { createHash, generateKeyPairSync, randomBytes, sign, type KeyObject } from 'node:crypto';
import { ALG_EDDSA, ALG_ES256, ALG_RS256, type AssertionJSON, type RegistrationJSON } from './webauthn';

type Item = number | string | Uint8Array | boolean | null | Item[] | Map<Item, Item>;

function head(major: number, n: number): Buffer {
  if (n < 24) return Buffer.from([(major << 5) | n]);
  if (n < 256) return Buffer.from([(major << 5) | 24, n]);
  if (n < 65536) { const b = Buffer.alloc(3); b[0] = (major << 5) | 25; b.writeUInt16BE(n, 1); return b; }
  const b = Buffer.alloc(5); b[0] = (major << 5) | 26; b.writeUInt32BE(n, 1); return b;
}

/** Definite-length CBOR (enough for COSE keys and attestation objects). */
export function cborEncode(v: Item): Buffer {
  if (typeof v === 'number') return v >= 0 ? head(0, v) : head(1, -1 - v);
  if (typeof v === 'string') { const b = Buffer.from(v, 'utf8'); return Buffer.concat([head(3, b.length), b]); }
  if (v instanceof Uint8Array) return Buffer.concat([head(2, v.length), Buffer.from(v)]);
  if (v === false) return Buffer.from([0xf4]);
  if (v === true) return Buffer.from([0xf5]);
  if (v === null) return Buffer.from([0xf6]);
  if (Array.isArray(v)) return Buffer.concat([head(4, v.length), ...v.map(cborEncode)]);
  return Buffer.concat([head(5, v.size), ...[...v].flatMap(([k, x]) => [cborEncode(k), cborEncode(x)])]);
}

const sha256 = (b: Uint8Array | string) => createHash('sha256').update(b).digest();
const b64u = (b: Uint8Array) => Buffer.from(b).toString('base64url');

export interface SoftOptions { alg?: number; uv?: boolean; up?: boolean; rpId: string; origin: string }

export class SoftAuthenticator {
  readonly credentialId = randomBytes(32);
  readonly alg: number;
  private readonly priv: KeyObject;
  private readonly cose: Buffer;
  counter = 0;
  constructor(readonly o: SoftOptions) {
    this.alg = o.alg ?? ALG_ES256;
    if (this.alg === ALG_ES256) {
      const { privateKey, publicKey } = generateKeyPairSync('ec', { namedCurve: 'P-256' });
      const j = publicKey.export({ format: 'jwk' });
      this.priv = privateKey;
      this.cose = cborEncode(new Map<Item, Item>([[1, 2], [3, ALG_ES256], [-1, 1], [-2, Buffer.from(j.x!, 'base64url')], [-3, Buffer.from(j.y!, 'base64url')]]));
    } else if (this.alg === ALG_EDDSA) {
      const { privateKey, publicKey } = generateKeyPairSync('ed25519');
      const j = publicKey.export({ format: 'jwk' });
      this.priv = privateKey;
      this.cose = cborEncode(new Map<Item, Item>([[1, 1], [3, ALG_EDDSA], [-1, 6], [-2, Buffer.from(j.x!, 'base64url')]]));
    } else if (this.alg === ALG_RS256) {
      const { privateKey, publicKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
      const j = publicKey.export({ format: 'jwk' });
      this.priv = privateKey;
      this.cose = cborEncode(new Map<Item, Item>([[1, 3], [3, ALG_RS256], [-1, Buffer.from(j.n!, 'base64url')], [-2, Buffer.from(j.e!, 'base64url')]]));
    } else throw new Error('unsupported alg');
  }

  private flags(at: boolean) { return (this.o.up === false ? 0 : 0x01) | (this.o.uv === false ? 0 : 0x04) | (at ? 0x40 : 0); }

  private authData(at: boolean, rpId = this.o.rpId): Buffer {
    const count = Buffer.alloc(4); count.writeUInt32BE(this.counter, 0);
    const base = Buffer.concat([sha256(rpId), Buffer.from([this.flags(at)]), count]);
    if (!at) return base;
    const len = Buffer.alloc(2); len.writeUInt16BE(this.credentialId.length, 0);
    return Buffer.concat([base, Buffer.alloc(16), len, this.credentialId, this.cose]);
  }

  private clientData(type: string, challenge: string, origin = this.o.origin) {
    return Buffer.from(JSON.stringify({ type, challenge, origin, crossOrigin: false }));
  }

  /** navigator.credentials.create() as a browser would return it (attestation "none"). */
  register(challenge: string, over: { origin?: string; rpId?: string } = {}): RegistrationJSON {
    const attestationObject = cborEncode(new Map<Item, Item>([['fmt', 'none'], ['attStmt', new Map()], ['authData', this.authData(true, over.rpId)]]));
    return { id: b64u(this.credentialId), rawId: b64u(this.credentialId), type: 'public-key',
      response: { clientDataJSON: b64u(this.clientData('webauthn.create', challenge, over.origin)), attestationObject: b64u(attestationObject), transports: ['internal'] } };
  }

  /** navigator.credentials.get(); the counter moves forward by one each time (unless `keepCounter`). */
  assert(challenge: string, over: { origin?: string; rpId?: string; userHandle?: string; keepCounter?: boolean; type?: string } = {}): AssertionJSON {
    if (!over.keepCounter) this.counter++;
    const ad = this.authData(false, over.rpId);
    const cd = this.clientData(over.type ?? 'webauthn.get', challenge, over.origin);
    const data = Buffer.concat([ad, sha256(cd)]);
    const signature = this.alg === ALG_EDDSA ? sign(null, data, this.priv) : sign('sha256', data, this.alg === ALG_ES256 ? { key: this.priv, dsaEncoding: 'der' } : this.priv);
    return { id: b64u(this.credentialId), rawId: b64u(this.credentialId), type: 'public-key',
      response: { clientDataJSON: b64u(cd), authenticatorData: b64u(ad), signature: b64u(signature), userHandle: over.userHandle ?? null } };
  }
}
