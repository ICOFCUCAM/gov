// Secrets kept in the platform state, encrypted under a key that is not
// (review R7, register 1.31): AES-256-GCM under CIVICOS_DATA_KEK, the key
// encryption key a nation holds in its KMS or HSM (or a key file on
// air-gapped servers) and hands to the platform through the environment.
//
// Stored form: `enc:v1:<kid>:<iv>:<tag>:<ciphertext>` (base64url parts),
// where kid is the first 8 hex of SHA-256 over the key, so a rotated key is
// recognised. Every value is bound to what it belongs to (associated data,
// e.g. `totp:<account id>`), so a ciphertext copied to another account does
// not open. During a rotation CIVICOS_DATA_KEK_PREVIOUS still opens old
// values, which are then sealed again under the current key.
//
// Without CIVICOS_DATA_KEK values stay as they are (plaintext), as before;
// the status says so. Plaintext written before encryption was turned on
// stays readable and is sealed on its next use.
//
// Under a remote key provider (CIVICOS_KEY_PROVIDER=vault or kms-http,
// lib/keys/custody.ts) the key is an envelope data key the provider issued
// and unwraps at start; the key encryption key stays in the provider. The
// stored form is the same; values sealed under CIVICOS_DATA_KEK still open
// (while it is set) and are sealed again under the data key on next use.
// Sealing refuses while the provider has not given a data key, rather than
// keeping a secret in plaintext.

import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { remoteDataKeys, providerKind } from '@/lib/keys/custody';

const PREFIX = 'enc:v1:';
const b64u = (b: Buffer) => b.toString('base64url');

/** Parse a 32-byte key given as base64, base64url, hex, or the path of a file holding one. */
export function parseKek(raw: string | undefined): Buffer | null {
  const v = raw?.trim();
  if (!v) return null;
  const text = v.startsWith('/') || v.startsWith('./') ? readFileSync(v, 'utf8').trim() : v;
  const asHex = /^[0-9a-fA-F]{64}$/.test(text) ? Buffer.from(text, 'hex') : null;
  const k = asHex ?? Buffer.from(text, 'base64');
  if (k.length !== 32) throw new Error('CIVICOS_DATA_KEK must be 32 bytes (base64 or hex)');
  return k;
}

const kidOf = (k: Buffer) => createHash('sha256').update(k).digest('hex').slice(0, 8);

function keys(env: NodeJS.ProcessEnv = process.env): { current: Buffer | null; all: Map<string, Buffer>; remote: boolean } {
  const envCurrent = parseKek(env.CIVICOS_DATA_KEK);
  const previous = parseKek(env.CIVICOS_DATA_KEK_PREVIOUS);
  const all = new Map<string, Buffer>();
  if (envCurrent) all.set(kidOf(envCurrent), envCurrent);
  if (previous) all.set(kidOf(previous), previous);
  const remote = remoteDataKeys();
  if (!remote) return { current: envCurrent, all, remote: false };
  for (const [kid, k] of remote.all) all.set(kid, k);
  return { current: remote.current, all, remote: true };
}

export const isSealed = (stored: string): boolean => stored.startsWith(PREFIX);
export const encryptionAtRest = (): { enabled: boolean; kid?: string; provider: string } => {
  const k = keys().current;
  return k ? { enabled: true, kid: kidOf(k), provider: providerKind() } : { enabled: false, provider: providerKind() };
};

/** Seal a secret under the current key; returned unchanged when no key is configured (env provider only). */
export function seal(plain: string, aad: string): string {
  const { current: k, remote } = keys();
  if (!k && remote) throw new Error('Key custody is not ready: the key provider has not issued a data key, so this secret cannot be kept safely');
  if (!k) return plain;
  const iv = randomBytes(12);
  const c = createCipheriv('aes-256-gcm', k, iv);
  c.setAAD(Buffer.from(aad, 'utf8'));
  const ct = Buffer.concat([c.update(plain, 'utf8'), c.final()]);
  return `${PREFIX}${kidOf(k)}:${b64u(iv)}:${b64u(c.getAuthTag())}:${b64u(ct)}`;
}

export type Opened = { plain: string; reseal: boolean } | { error: string };

/**
 * Open a stored secret. `reseal` is true when it should be written back
 * sealed under the current key (it was plaintext, or under the previous key).
 */
export function open(stored: string, aad: string): Opened {
  const { current, all } = keys();
  if (!isSealed(stored)) return { plain: stored, reseal: !!current };
  const [kid, iv, tag, ct] = stored.slice(PREFIX.length).split(':');
  const k = kid ? all.get(kid) : undefined;
  if (!k || !iv || !tag || ct === undefined) {
    return { error: current ? 'This secret was sealed under a key the server does not hold (CIVICOS_DATA_KEK_PREVIOUS, or a data key the key provider could not unwrap?)' : 'This secret is encrypted and CIVICOS_DATA_KEK is not set' };
  }
  try {
    const d = createDecipheriv('aes-256-gcm', k, Buffer.from(iv, 'base64url'));
    d.setAAD(Buffer.from(aad, 'utf8'));
    d.setAuthTag(Buffer.from(tag, 'base64url'));
    const plain = Buffer.concat([d.update(Buffer.from(ct, 'base64url')), d.final()]).toString('utf8');
    return { plain, reseal: !!current && kid !== kidOf(current) };
  } catch {
    return { error: 'This secret does not open (wrong key, or it was changed or moved)' };
  }
}
