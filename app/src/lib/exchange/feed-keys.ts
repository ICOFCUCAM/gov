// Public keys institutions register for their feeds (review R10): when a
// connected case system (lib/data/case-import.ts) or site system
// (lib/data/facilities.ts) has a key registered here, every request it makes
// must carry an HTTP Message Signature (RFC 9421, Ed25519) by that key and a
// matching Content-Digest; unsigned or badly signed requests are refused.
// Without a registered key the feed works with its bearer key alone, as
// before. Registering and removing a key are done by a named official and
// audited. Durable through lib/data/persist.ts.

import type { NextRequest } from 'next/server';
import { recordAudit } from '@/lib/data/store/audit';
import { keyIdOfPem } from '@/lib/crypto/signing-key';
import { verifyRequestSignature, type SignatureCheck } from './http-signatures';
import { touch } from '@/lib/data/repo/track';

export type FeedKind = 'case' | 'site';

export interface FeedSigningKey {
  kind: FeedKind;
  feedId: string;
  ministryId: string;
  publicKeyPem: string;
  /** The keyid the sender puts in Signature-Input. */
  keyId: string;
  registeredAt: string;
  registeredBy: string;
}

interface Db { keys: Record<string, FeedSigningKey> }
const g = globalThis as unknown as { __civicosFeedKeys?: Db };
const db = (): Db => {
  const d = touch('__civicosFeedKeys', g.__civicosFeedKeys ??= { keys: {} });
  d.keys ??= {};
  return d;
};
export function resetFeedKeys(): void { g.__civicosFeedKeys = undefined; }

const k = (kind: FeedKind, feedId: string) => `${kind}:${feedId}`;
const resource = (kind: FeedKind, feedId: string) => `${kind === 'case' ? 'CaseFeed' : 'SiteFeed'}:${feedId}`;

export const feedSigningKey = (kind: FeedKind, feedId: string): FeedSigningKey | undefined => db().keys[k(kind, feedId)];

/** Register (or replace) the Ed25519 public key a feed's requests must be signed with. */
export function registerFeedKey(kind: FeedKind, ministryId: string, feedId: string, input: { publicKey?: string; keyId?: string; by?: string }): FeedSigningKey | { error: string } {
  const by = input.by?.trim();
  if (!by) return { error: 'Name the official registering the key' };
  const pem = (input.publicKey ?? '').trim();
  const computed = pem ? keyIdOfPem(pem) : null;
  if (!computed) return { error: 'Send the public key as an Ed25519 SPKI PEM (-----BEGIN PUBLIC KEY-----)' };
  const keyId = (input.keyId ?? '').trim() || computed;
  if (!/^[\x21-\x7e]{1,120}$/.test(keyId) || keyId.includes('"')) return { error: 'The key id is printable ASCII, up to 120 characters, without quotes' };
  const rec: FeedSigningKey = { kind, feedId, ministryId, publicKeyPem: pem, keyId, registeredAt: new Date().toISOString(), registeredBy: by };
  const replaced = !!db().keys[k(kind, feedId)];
  db().keys[k(kind, feedId)] = rec;
  recordAudit(by, replaced ? 'exchange.key.replace' : 'exchange.key.register', resource(kind, feedId), 'ok', `${keyId} (${computed})`);
  return rec;
}

/** Remove a feed's key: its requests are then accepted with the bearer key alone again. */
export function removeFeedKey(kind: FeedKind, feedId: string, by: string | undefined): { removed: true } | { error: string } {
  if (!by?.trim()) return { error: 'Name the official removing the key' };
  const cur = db().keys[k(kind, feedId)];
  if (!cur) return { error: 'No key is registered for this feed' };
  delete db().keys[k(kind, feedId)];
  recordAudit(by.trim(), 'exchange.key.remove', resource(kind, feedId), 'ok', cur.keyId);
  return { removed: true };
}

export type FeedSignatureResult = { required: false } | ({ required: true } & SignatureCheck);

/** Check a feed request: no key registered → not required; otherwise the signature must verify. */
export function checkFeedSignature(kind: FeedKind, feedId: string, req: Pick<NextRequest, 'method' | 'url' | 'headers'>, body: string, now = Date.now()): FeedSignatureResult {
  const key = feedSigningKey(kind, feedId);
  if (!key) return { required: false };
  return { required: true, ...verifyRequestSignature(req, body, key, now) };
}
