// Key custody (review R7, findings S5 and D9): one place that decides where
// the platform's keys are held and how they are used.
//
// Three keys, three uses:
//   audit     Ed25519, signs audit chain heads (lib/audit/sign.ts)
//   exchange  Ed25519, signs exchange receipts (lib/exchange/log.ts)
//   data      the key encryption key for secrets kept in the state
//             (authenticator secrets, webhook secrets; lib/crypto/envelope.ts)
//
// CIVICOS_KEY_PROVIDER chooses the provider:
//   env       (default, today's behaviour) PEM keys or key files from
//             CIVICOS_AUDIT_KEY / CIVICOS_EXCHANGE_KEY and the 32-byte
//             CIVICOS_DATA_KEK (plus _PREVIOUS during a rotation); a
//             development key per process when a signing key is missing.
//   vault     HashiCorp Vault / OpenBao Transit (lib/keys/vault.ts): signing
//             happens in Vault; secrets are sealed with envelope data keys
//             that Vault issues and unwraps.
//   kms-http  a cloud KMS or HSM behind the generic shim (lib/keys/kms-http.ts).
//
// With a remote provider no private key and no key encryption key enters the
// platform. Data keys for bulk sealing are kept in memory only; their wrapped
// form is kept in the platform state (`__civicosKeyring`), where it is useless
// without the provider. At start (src/instrumentation.ts, after the state is
// restored) initKeyCustody() unwraps the stored data keys, creates the first
// one when there is none and loads the signing keys' public halves.
// Remote signatures are asynchronous: audit heads are written at once and
// signed when the provider answers (lib/audit/sign.ts), receipts are signed
// before the answer is sent.

import { createHash } from 'node:crypto';
import { signingKey, signBytes, keyIdOfPem, verifyBytes } from '@/lib/crypto/signing-key';
import { logger } from '@/lib/ops/log';
import type { RemoteKeyService } from './remote';
import { VaultTransit } from './vault';
import { KmsHttp } from './kms-http';
import { touch } from '@/lib/data/repo/track';

export type ProviderKind = 'env' | 'vault' | 'kms-http';
export type SigningPurpose = 'audit' | 'exchange';
export const SIGNING_ENV: Record<SigningPurpose, string> = { audit: 'CIVICOS_AUDIT_KEY', exchange: 'CIVICOS_EXCHANGE_KEY' };

export interface PublicHalf { keyId: string; publicKeyPem: string }
export interface Signature extends PublicHalf { signature: string }

export interface Signer {
  purpose: SigningPurpose;
  source: 'env' | 'file' | 'development' | 'vault' | 'kms-http';
  /** False only for the generated development key. */
  production: boolean;
  /** The public half when known now (always for env keys; for remote keys once loaded). */
  current(): PublicHalf | undefined;
  /** The public half, asking a remote provider when it is not loaded yet. */
  load(): Promise<PublicHalf>;
  /** Sign (base64 Ed25519 signature) and say with which key. */
  sign(data: string | Buffer): Promise<Signature>;
  /** Synchronous signing, only where the key is held locally (env provider). */
  signSync?: (data: string | Buffer) => Signature;
}

export function providerKind(env: NodeJS.ProcessEnv = process.env): ProviderKind {
  const v = (env.CIVICOS_KEY_PROVIDER ?? 'env').trim().toLowerCase();
  if (v === 'vault' || v === 'openbao') return 'vault';
  if (v === 'kms-http' || v === 'kms') return 'kms-http';
  return 'env';
}

/** Names of the keys in the remote provider. */
export function remoteKeyNames(env: NodeJS.ProcessEnv = process.env): Record<SigningPurpose | 'data', string> {
  const p = providerKind(env) === 'vault' ? 'CIVICOS_VAULT' : 'CIVICOS_KMS';
  return {
    audit: env[`${p}_AUDIT_KEY`]?.trim() || 'civicos-audit',
    exchange: env[`${p}_EXCHANGE_KEY`]?.trim() || 'civicos-exchange',
    data: env[`${p}_DATA_KEY`]?.trim() || 'civicos-data',
  };
}

// ── Process-local state (never persisted: no `__civicos` prefix) ─────
interface Local {
  config?: string;
  service?: RemoteKeyService;
  /** Public halves by purpose and version. */
  publics: Map<string, PublicHalf>;
  latest: Map<SigningPurpose, PublicHalf>;
  /** Unwrapped data keys by kid. */
  dataKeys: Map<string, Buffer>;
  ready: boolean;
  error?: string;
}
const lg = globalThis as unknown as { __keyCustodyLocal?: Local };
const local = (): Local => (lg.__keyCustodyLocal ??= { publics: new Map(), latest: new Map(), dataKeys: new Map(), ready: false });

// ── Durable keyring: wrapped data keys only ──────────────────────────
export interface WrappedDataKey { kid: string; wrapped: string; provider: Exclude<ProviderKind, 'env'>; keyName: string; createdAt: string }
interface Keyring { dataKeys: WrappedDataKey[]; current?: string }
const g = globalThis as unknown as { __civicosKeyring?: Keyring };
const keyring = (): Keyring => {
  const k = touch('__civicosKeyring', g.__civicosKeyring ??= { dataKeys: [] });
  k.dataKeys ??= [];
  return k;
};

export const kidOf = (k: Buffer): string => createHash('sha256').update(k).digest('hex').slice(0, 8);

/** The remote service for the configured provider (null for env); one per configuration. */
export function remoteService(env: NodeJS.ProcessEnv = process.env): RemoteKeyService | null {
  const kind = providerKind(env);
  if (kind === 'env') return null;
  const l = local();
  const config = kind === 'vault'
    ? `vault|${env.CIVICOS_VAULT_ADDR}|${env.CIVICOS_VAULT_NAMESPACE ?? ''}|${env.CIVICOS_VAULT_TRANSIT_MOUNT ?? ''}`
    : `kms|${env.CIVICOS_KMS_URL}`;
  if (l.config !== config || !l.service) {
    l.service = kind === 'vault' ? new VaultTransit(env) : new KmsHttp(env);
    l.config = config;
  }
  return l.service;
}

function envSigner(purpose: SigningPurpose): Signer {
  const k = signingKey(SIGNING_ENV[purpose]);
  const sig = (data: string | Buffer): Signature => ({ keyId: k.keyId, publicKeyPem: k.publicKeyPem, signature: signBytes(k, data) });
  const half = { keyId: k.keyId, publicKeyPem: k.publicKeyPem };
  return { purpose, source: k.source, production: k.production, current: () => half, load: async () => half, sign: async d => sig(d), signSync: sig };
}

async function publicFor(svc: RemoteKeyService, purpose: SigningPurpose, name: string, version?: number): Promise<PublicHalf> {
  const l = local();
  const cacheKey = `${purpose}:${name}:${version ?? 'latest'}`;
  const hit = l.publics.get(cacheKey);
  if (hit) return hit;
  const p = await svc.publicKey(name, version);
  const keyId = keyIdOfPem(p.publicKeyPem);
  if (!keyId) throw new Error(`The ${purpose} key ${name} is not an Ed25519 key`);
  const half = { keyId, publicKeyPem: p.publicKeyPem };
  l.publics.set(`${purpose}:${name}:${p.version}`, half);
  if (version === undefined) l.latest.set(purpose, half);
  return half;
}

function remoteSigner(purpose: SigningPurpose, svc: RemoteKeyService): Signer {
  const name = remoteKeyNames()[purpose];
  return {
    purpose, source: svc.kind, production: true,
    current: () => local().latest.get(purpose),
    load: async () => local().latest.get(purpose) ?? publicFor(svc, purpose, name),
    async sign(data) {
      const bytes = typeof data === 'string' ? Buffer.from(data, 'utf8') : data;
      const { signature, version } = await svc.sign(name, bytes);
      const b64 = signature.toString('base64');
      let half = await publicFor(svc, purpose, name, version);
      if (!verifyBytes(half.publicKeyPem, bytes, b64)) {
        // The key was replaced under the same version (re-created): ask again once.
        local().publics.delete(`${purpose}:${name}:${version}`);
        half = await publicFor(svc, purpose, name, version);
      }
      // Never record a signature the public key does not verify.
      if (!verifyBytes(half.publicKeyPem, bytes, b64)) throw new Error(`The ${svc.kind} signature for ${purpose} does not verify against key ${half.keyId}`);
      local().latest.set(purpose, half);
      return { ...half, signature: b64 };
    },
  };
}

/** The signer for a purpose under the configured provider. */
export function signer(purpose: SigningPurpose): Signer {
  const svc = remoteService();
  return svc ? remoteSigner(purpose, svc) : envSigner(purpose);
}

/**
 * Data keys for lib/crypto/envelope.ts: under a remote provider the current
 * envelope data key and every unwrapped one; null under env (envelope.ts then
 * uses CIVICOS_DATA_KEK as before).
 */
export function remoteDataKeys(): { current: Buffer | null; all: Map<string, Buffer> } | null {
  if (providerKind() === 'env') return null;
  const l = local();
  const cur = keyring().current;
  return { current: cur ? l.dataKeys.get(cur) ?? null : null, all: l.dataKeys };
}

/** Make a new envelope data key current (the old ones still open what they sealed). */
export async function rotateDataKey(now = Date.now()): Promise<string> {
  const svc = remoteService();
  if (!svc) throw new Error('Data keys come from a remote provider; with CIVICOS_KEY_PROVIDER=env rotate CIVICOS_DATA_KEK instead');
  const name = remoteKeyNames().data;
  const { plaintext, wrapped } = await svc.dataKey(name);
  const kid = kidOf(plaintext);
  local().dataKeys.set(kid, plaintext);
  const k = keyring();
  k.dataKeys.push({ kid, wrapped, provider: svc.kind, keyName: name, createdAt: new Date(now).toISOString() });
  k.current = kid;
  (globalThis as { __persistChanges?: number }).__persistChanges = ((globalThis as { __persistChanges?: number }).__persistChanges ?? 0) + 1;
  return kid;
}

export interface KeyCustodyStatus {
  provider: ProviderKind;
  endpoint?: string;
  ready: boolean;
  signing: Record<SigningPurpose, { keyId?: string; source: Signer['source']; production: boolean }>;
  data: { enabled: boolean; kid?: string; keys: number; unreadable: number };
  error?: string;
}

/**
 * Start key custody (src/instrumentation.ts, after the state is restored):
 * unwrap the stored data keys, create the first one when there is none, and
 * load the signing keys' public halves. Under env it only reports.
 */
export async function initKeyCustody(): Promise<KeyCustodyStatus> {
  const l = local();
  const svc = (() => { try { return remoteService(); } catch (e) { l.error = (e as Error).message; return null; } })();
  if (svc) {
    const names = remoteKeyNames();
    const problems: string[] = [];
    for (const w of keyring().dataKeys) {
      if (l.dataKeys.has(w.kid)) continue;
      try {
        const k = await svc.unwrap(w.keyName, w.wrapped);
        if (kidOf(k) !== w.kid) throw new Error('unwrapped to a different key');
        l.dataKeys.set(w.kid, k);
      } catch (e) {
        problems.push(`data key ${w.kid}: ${(e as Error).message}`);
      }
    }
    const cur = keyring().current;
    if (!cur || !l.dataKeys.has(cur)) {
      try { await rotateDataKey(); } catch (e) { problems.push(`new data key: ${(e as Error).message}`); }
    }
    for (const p of ['audit', 'exchange'] as const) {
      try { await publicFor(svc, p, names[p]); } catch (e) { problems.push(`${p} key: ${(e as Error).message}`); }
    }
    l.ready = problems.length === 0;
    l.error = problems.length ? problems.join('; ') : undefined;
    const status = keyCustodyStatus();
    logger[l.ready ? 'info' : 'error']('keys.init', { provider: status.provider, ready: status.ready, ...(status.error ? { problem: status.error } : {}) });
    return status;
  }
  l.ready = !l.error;
  return keyCustodyStatus();
}

/** What a status page may show (no key material). */
export function keyCustodyStatus(): KeyCustodyStatus {
  const provider = providerKind();
  const l = local();
  const signingOf = (p: SigningPurpose) => {
    if (provider === 'env') { const k = signingKey(SIGNING_ENV[p]); return { keyId: k.keyId, source: k.source, production: k.production }; }
    return { keyId: l.latest.get(p)?.keyId, source: provider, production: true };
  };
  const remote = remoteDataKeys();
  const ring = keyring();
  return {
    provider,
    ...(provider !== 'env' && l.service ? { endpoint: l.service.endpoint } : {}),
    ready: provider === 'env' ? true : l.ready,
    signing: { audit: signingOf('audit'), exchange: signingOf('exchange') },
    data: remote
      ? { enabled: !!remote.current, ...(ring.current ? { kid: ring.current } : {}), keys: ring.dataKeys.length, unreadable: ring.dataKeys.filter(w => !l.dataKeys.has(w.kid)).length }
      : { enabled: !!process.env.CIVICOS_DATA_KEK?.trim(), keys: [process.env.CIVICOS_DATA_KEK, process.env.CIVICOS_DATA_KEK_PREVIOUS].filter(v => v?.trim()).length, unreadable: 0 },
    ...(l.error ? { error: l.error } : {}),
  };
}

/** Forget the process-local state and the keyring (tests). */
export function resetKeyCustody(): void {
  lg.__keyCustodyLocal = undefined;
  g.__civicosKeyring = undefined;
}
