// Ed25519 signing keys the platform holds outside its data (register 1.13).
//
// A key comes from an environment variable holding either a PKCS#8 PEM
// private key or the path of a file containing one (a key file for
// air-gapped nations; a KMS or HSM in production exports the same PEM or
// fronts this module). Without the variable, a key is generated for this
// process only and every signature it makes is marked `production: false`:
// it is never written to the platform state, so whoever reads a snapshot
// cannot sign with it, and nothing it signed counts as evidence.

import { createPrivateKey, createPublicKey, createHash, generateKeyPairSync, sign, verify, type KeyObject } from 'node:crypto';
import { readFileSync } from 'node:fs';

export interface SigningKey {
  privateKey: KeyObject;
  /** SPKI PEM of the public half, published with every signature. */
  publicKeyPem: string;
  /** `ed25519:<first 16 hex of SHA-256 over the SPKI DER>`. */
  keyId: string;
  /** False for the generated development key. */
  production: boolean;
  source: 'env' | 'file' | 'development';
}

const cache = new Map<string, SigningKey>();
// Development keys live on globalThis under a key persist.ts never saves (it saves only `__civicos*`).
const dev = globalThis as unknown as { __devSigningKeys?: Map<string, SigningKey> };

export function keyIdOf(publicKey: KeyObject): string {
  const der = publicKey.export({ type: 'spki', format: 'der' });
  return `ed25519:${createHash('sha256').update(der).digest('hex').slice(0, 16)}`;
}

/** Key id of an SPKI PEM public key (null when it is not an Ed25519 key). */
export function keyIdOfPem(publicKeyPem: string): string | null {
  try {
    const k = createPublicKey(publicKeyPem);
    return k.asymmetricKeyType === 'ed25519' ? keyIdOf(k) : null;
  } catch {
    return null;
  }
}

function fromPem(pem: string, source: SigningKey['source']): SigningKey {
  const privateKey = createPrivateKey(pem);
  if (privateKey.asymmetricKeyType !== 'ed25519') throw new Error('The signing key must be an Ed25519 private key');
  const pub = createPublicKey(privateKey);
  return { privateKey, publicKeyPem: pub.export({ type: 'spki', format: 'pem' }).toString(), keyId: keyIdOf(pub), production: true, source };
}

/** The key named by `envVar`, else a development key for this process (`production: false`). */
export function signingKey(envVar: string): SigningKey {
  const raw = process.env[envVar]?.trim();
  if (raw) {
    const hit = cache.get(`${envVar}:${raw}`);
    if (hit) return hit;
    const k = raw.startsWith('-----BEGIN') ? fromPem(raw.replace(/\\n/g, '\n'), 'env') : fromPem(readFileSync(raw, 'utf8'), 'file');
    cache.set(`${envVar}:${raw}`, k);
    return k;
  }
  const keys = (dev.__devSigningKeys ??= new Map());
  let k = keys.get(envVar);
  if (!k) {
    const { privateKey, publicKey } = generateKeyPairSync('ed25519');
    k = { privateKey, publicKeyPem: publicKey.export({ type: 'spki', format: 'pem' }).toString(), keyId: keyIdOf(publicKey), production: false, source: 'development' };
    keys.set(envVar, k);
  }
  return k;
}

export const signBytes = (key: SigningKey, data: string | Buffer): string =>
  sign(null, typeof data === 'string' ? Buffer.from(data, 'utf8') : data, key.privateKey).toString('base64');

/** Check an Ed25519 signature against an SPKI PEM public key. */
export function verifyBytes(publicKeyPem: string, data: string | Buffer, signatureB64: string): boolean {
  try {
    return verify(null, typeof data === 'string' ? Buffer.from(data, 'utf8') : data, createPublicKey(publicKeyPem), Buffer.from(signatureB64, 'base64'));
  } catch {
    return false;
  }
}

/** Forget cached keys (tests change the environment). */
export function resetSigningKeys(): void {
  cache.clear();
  dev.__devSigningKeys = undefined;
}
