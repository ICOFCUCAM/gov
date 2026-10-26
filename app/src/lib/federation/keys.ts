// Per-institution signing keys for federation events (plan I9; specification
// Part 5 E "A receiver validates the sender and message integrity", H
// "Sovereign key management": a shared operator should not hold every
// institution's keys). Through key custody (lib/keys/custody.ts), never in
// the platform state:
//
//   CIVICOS_KEY_PROVIDER=vault | kms-http
//             each institution signs with its own named key in the provider,
//             `<exchange key name>-inst-<institution>` (e.g. civicos-exchange-inst-min-health):
//             the platform asks the provider to sign and never sees the key.
//   env       CIVICOS_INSTITUTION_KEYS names a directory holding one Ed25519
//             PKCS#8 PEM file per institution, `<institution>.pem` (a key file
//             for an air-gapped institution; the directory can be mounted per
//             institution). Without one, a development key generated for this
//             process only signs, marked production: false, and a production
//             installation refuses it (institutionKeyRefusal(), as
//             developmentKeyRefusal() does for the platform's own keys).
//
// The public halves are published (GET /api/exchange/institution-keys) for
// peers to register; the first key seen for an institution and every change
// (a rotation) are audited with key ids only.

import { createPrivateKey, createPublicKey, generateKeyPairSync, sign, type KeyObject } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { keyIdOf, keyIdOfPem, verifyBytes } from '@/lib/crypto/signing-key';
import { remoteService, remoteKeyNames, providerKind } from '@/lib/keys/custody';
import { installationMode } from '@/lib/ops/mode';
import { recordAudit } from '@/lib/data/store/audit';
import { touch } from '@/lib/data/repo/track';

export const INSTITUTION_KEYS_ENV = 'CIVICOS_INSTITUTION_KEYS';
const SAFE = /^[A-Za-z0-9][A-Za-z0-9._-]{0,119}$/;

export interface InstitutionSignature { keyId: string; publicKeyPem: string; signature: string; production: boolean; source: 'file' | 'development' | 'vault' | 'kms-http' }
interface LocalKey { privateKey: KeyObject; publicKeyPem: string; keyId: string; production: boolean; source: 'file' | 'development' }

// Process-local (never persisted: no `__civicos` prefix).
const lg = globalThis as unknown as { __institutionKeysLocal?: Map<string, LocalKey> };
const local = () => (lg.__institutionKeysLocal ??= new Map());
/** Forget cached keys (tests change the environment). */
export function resetInstitutionKeys(): void { lg.__institutionKeysLocal = undefined; g.__civicosInstitutionKeys = undefined; }

// Durable: the key id last seen per institution (never key material), so a change is audited as a rotation.
interface Seen { institution: string; keyId: string; source: InstitutionSignature['source']; since: string; publicKeyPem: string }
const g = globalThis as unknown as { __civicosInstitutionKeys?: { seen: Record<string, Seen> } };
const seenDb = () => { const d = touch('__civicosInstitutionKeys', g.__civicosInstitutionKeys ??= { seen: {} }); d.seen ??= {}; return d; };

/** The remote key name an institution signs with under a remote provider. */
export const remoteInstitutionKeyName = (institution: string) => `${remoteKeyNames().exchange}-inst-${institution.toLowerCase().replace(/[^a-z0-9-]+/g, '-')}`.slice(0, 120);

function localKey(institution: string): LocalKey {
  const hit = local().get(institution);
  if (hit) return hit;
  const dir = process.env[INSTITUTION_KEYS_ENV]?.trim();
  let k: LocalKey | undefined;
  if (dir && SAFE.test(institution)) {
    const file = path.join(dir, `${institution}.pem`);
    if (existsSync(file)) {
      const privateKey = createPrivateKey(readFileSync(file, 'utf8'));
      if (privateKey.asymmetricKeyType !== 'ed25519') throw new Error(`The key file for ${institution} is not an Ed25519 private key`);
      const pub = createPublicKey(privateKey);
      k = { privateKey, publicKeyPem: pub.export({ type: 'spki', format: 'pem' }).toString(), keyId: keyIdOf(pub), production: true, source: 'file' };
    }
  }
  if (!k) {
    const { privateKey, publicKey } = generateKeyPairSync('ed25519');
    k = { privateKey, publicKeyPem: publicKey.export({ type: 'spki', format: 'pem' }).toString(), keyId: keyIdOf(publicKey), production: false, source: 'development' };
  }
  local().set(institution, k);
  return k;
}

/** Whether the institution's key is a production key (a key file or a remote provider). */
export function institutionKeyIsProduction(institution: string): boolean {
  return providerKind() !== 'env' || localKey(institution).production;
}

/**
 * Why an institution may not sign here, or null: a production installation
 * never signs a federation event with a development key.
 */
export function institutionKeyRefusal(institution: string): string | null {
  if (installationMode() !== 'production') return null;
  if (institutionKeyIsProduction(institution)) return null;
  return `This production installation has no signing key for ${institution}: put its Ed25519 key file in ${INSTITUTION_KEYS_ENV}/${institution}.pem or use CIVICOS_KEY_PROVIDER (key ${remoteInstitutionKeyName(institution)}). A development key generated for this process signs nothing here`;
}

function noteKey(institution: string, half: { keyId: string; publicKeyPem: string }, source: InstitutionSignature['source'], production: boolean, now = new Date()): void {
  if (!production) return;
  const d = seenDb();
  const was = d.seen[institution];
  if (was?.keyId === half.keyId) return;
  d.seen[institution] = { institution, keyId: half.keyId, source, since: now.toISOString(), publicKeyPem: half.publicKeyPem };
  recordAudit('system (key custody)', was ? 'federation.key.rotate' : 'federation.key.register', `InstitutionKey:${institution}/${half.keyId}`, 'ok',
    `${institution} federation signing key ${half.keyId} (${source})${was ? ` replaces ${was.keyId} (kept for verifying what it signed)` : ''}`);
}

/** Sign bytes as an institution, through key custody. */
export async function signAsInstitution(institution: string, data: string | Buffer): Promise<InstitutionSignature> {
  const refused = institutionKeyRefusal(institution);
  if (refused) throw new Error(refused);
  const bytes = typeof data === 'string' ? Buffer.from(data, 'utf8') : data;
  const svc = remoteService();
  if (svc) {
    const name = remoteInstitutionKeyName(institution);
    const { signature, version } = await svc.sign(name, bytes);
    const { publicKeyPem } = await svc.publicKey(name, version);
    const keyId = keyIdOfPem(publicKeyPem);
    const b64 = signature.toString('base64');
    if (!keyId || !verifyBytes(publicKeyPem, bytes, b64)) throw new Error(`The ${svc.kind} signature for ${institution} does not verify against its public key`);
    noteKey(institution, { keyId, publicKeyPem }, svc.kind, true);
    return { keyId, publicKeyPem, signature: b64, production: true, source: svc.kind };
  }
  const k = localKey(institution);
  noteKey(institution, k, k.source, k.production);
  return { keyId: k.keyId, publicKeyPem: k.publicKeyPem, signature: sign(null, bytes, k.privateKey).toString('base64'), production: k.production, source: k.source };
}

/** The public half an institution signs with now (env provider), or the last one seen (any provider). */
export function institutionPublicKey(institution: string): { keyId: string; publicKeyPem: string; production: boolean; source: InstitutionSignature['source'] } | undefined {
  if (providerKind() === 'env') { const k = localKey(institution); return { keyId: k.keyId, publicKeyPem: k.publicKeyPem, production: k.production, source: k.source }; }
  const s = seenDb().seen[institution];
  return s ? { keyId: s.keyId, publicKeyPem: s.publicKeyPem, production: true, source: s.source } : undefined;
}

/** Production keys seen per institution (the published trust list of this installation's institutions). */
export const seenInstitutionKeys = (): Seen[] => Object.values(seenDb().seen).map(s => ({ ...s }));
