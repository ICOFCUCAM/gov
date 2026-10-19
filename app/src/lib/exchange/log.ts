// The exchange log (review R10, X-Road-style non-repudiation): every request
// a connected system or a federation partner makes is recorded here (digest
// of the request body, the signature key id, time, outcome), and the caller
// gets a receipt signed with the platform's exchange key, so both sides keep
// the same record. A receipt names the request by its Content-Digest, so the
// sender can match it to what it sent; the platform keeps the entry.
//
// The exchange key is CIVICOS_EXCHANGE_KEY (Ed25519, PEM or key file path);
// without it a development key signs receipts marked `production: false`.
// Where the key is held is decided by lib/keys/custody.ts: with a remote
// provider (Vault / OpenBao Transit, a KMS) the receipt is signed there
// before the answer goes out.
// Durable through lib/data/persist.ts (`__civicosExchangeLog`), bounded to
// the most recent MAX_ENTRIES.

import { randomUUID } from 'node:crypto';
import { NextResponse } from 'next/server';
import { verifyBytes } from '@/lib/crypto/signing-key';
import { signer } from '@/lib/keys/custody';
import { contentDigest } from './http-signatures';

export const EXCHANGE_KEY_ENV = 'CIVICOS_EXCHANGE_KEY';
export const MAX_ENTRIES = 20_000;
export const RECEIPT_HEADER = 'CivicOS-Receipt';

export type ExchangeChannel = 'case-feed' | 'site-feed' | 'federation';
export type SignatureState = 'verified' | 'absent' | 'refused';

export interface ExchangeEntry {
  id: string;
  at: string;
  channel: ExchangeChannel;
  /** The feed, or for federation the integration client that called. '?' when the caller was not recognised. */
  feedId: string;
  ministryId?: string;
  /** Federation: the partner tenant and the grant the decision used. */
  tenant?: string;
  grantId?: string;
  method: string;
  path: string;
  /** RFC 9530 Content-Digest (sha-256) of the request body as received. */
  requestDigest: string;
  signature: SignatureState;
  signatureKeyId?: string;
  status: number;
  /** Short outcome, e.g. "3 added, 1 refused" or the refusal reason. */
  result: string;
  receiptId: string;
}

export interface ExchangeReceipt {
  v: 'civicos-exchange-receipt-v1';
  id: string;
  at: string;
  channel: ExchangeChannel;
  feedId: string;
  method: string;
  path: string;
  requestDigest: string;
  signatureKeyId?: string;
  status: number;
  result: string;
  platformKeyId: string;
  production: boolean;
  /** Base64 Ed25519 signature over receiptPayload(). */
  signature: string;
}

interface Db { entries: ExchangeEntry[] }
const g = globalThis as unknown as { __civicosExchangeLog?: Db };
const db = (): Db => {
  const d = (g.__civicosExchangeLog ??= { entries: [] });
  d.entries ??= [];
  return d;
};
export function resetExchangeLog(): void { g.__civicosExchangeLog = undefined; }

/** The exact bytes a receipt's signature covers (every field but the signature, in a fixed order). */
export function receiptPayload(r: Omit<ExchangeReceipt, 'signature'>): string {
  return JSON.stringify([r.v, r.id, r.at, r.channel, r.feedId, r.method, r.path, r.requestDigest, r.signatureKeyId ?? null, r.status, r.result, r.platformKeyId, r.production]);
}

export interface ExchangeInput {
  channel: ExchangeChannel;
  feedId: string | null;
  ministryId?: string;
  tenant?: string;
  grantId?: string;
  method: string;
  path: string;
  body: string;
  signature: SignatureState;
  signatureKeyId?: string;
  status: number;
  result: string;
}

/** Record one exchange and sign its receipt. */
export async function logExchange(input: ExchangeInput, now = Date.now()): Promise<{ entry: ExchangeEntry; receipt: ExchangeReceipt }> {
  const s = signer('exchange');
  // The key that will sign: known at once for a local key; for a remote one, asked of the provider first.
  const key = s.current() ?? await s.load();
  const at = new Date(now).toISOString();
  const id = `EX-${randomUUID()}`;
  const requestDigest = contentDigest(input.body);
  const result = input.result.slice(0, 300);
  const feedId = input.feedId ?? '?';
  const unsigned: Omit<ExchangeReceipt, 'signature'> = {
    v: 'civicos-exchange-receipt-v1', id, at, channel: input.channel, feedId, method: input.method.toUpperCase(), path: input.path,
    requestDigest, ...(input.signatureKeyId ? { signatureKeyId: input.signatureKeyId } : {}), status: input.status, result,
    platformKeyId: key.keyId, production: s.production,
  };
  let signed = s.signSync ? s.signSync(receiptPayload(unsigned)) : await s.sign(receiptPayload(unsigned));
  if (signed.keyId !== unsigned.platformKeyId) {
    // The provider rotated its key in between: name the key that signed.
    unsigned.platformKeyId = signed.keyId;
    signed = await s.sign(receiptPayload(unsigned));
  }
  const receipt: ExchangeReceipt = { ...unsigned, signature: signed.signature };
  const entry: ExchangeEntry = {
    id: `EXL-${id.slice(3)}`, at, channel: input.channel, feedId, ...(input.ministryId ? { ministryId: input.ministryId } : {}),
    ...(input.tenant ? { tenant: input.tenant } : {}), ...(input.grantId ? { grantId: input.grantId } : {}),
    method: unsigned.method, path: input.path, requestDigest, signature: input.signature,
    ...(input.signatureKeyId ? { signatureKeyId: input.signatureKeyId } : {}), status: input.status, result, receiptId: id,
  };
  const d = db();
  d.entries.push(entry);
  if (d.entries.length > MAX_ENTRIES) d.entries.splice(0, d.entries.length - MAX_ENTRIES);
  return { entry, receipt };
}

/** Check a receipt against the platform's exchange public key (as published at /api/exchange/key). */
export function verifyReceipt(r: ExchangeReceipt, publicKeyPem = signer('exchange').current()?.publicKeyPem ?? ''): boolean {
  const { signature, ...rest } = r;
  return verifyBytes(publicKeyPem, receiptPayload(rest), signature);
}

/** The exchange public key as known now (always for a local key; for a remote one once loaded at start). */
export function exchangePublicKey(): { keyId: string; publicKey: string; production: boolean } {
  const s = signer('exchange');
  const k = s.current();
  if (!k) throw new Error('The exchange key has not been loaded from the key provider yet');
  return { keyId: k.keyId, publicKey: k.publicKeyPem, production: s.production };
}

/** The same, asking a remote provider for it when it is not loaded yet. */
export async function loadExchangePublicKey(): Promise<{ keyId: string; publicKey: string; production: boolean }> {
  const s = signer('exchange');
  const k = await s.load();
  return { keyId: k.keyId, publicKey: k.publicKeyPem, production: s.production };
}

/** The most recent exchanges, newest first, optionally for one channel and feed. */
export function listExchanges(filter: { channel?: ExchangeChannel; feedId?: string; ministryId?: string; limit?: number } = {}): ExchangeEntry[] {
  const out: ExchangeEntry[] = [];
  const limit = Math.min(Math.max(filter.limit ?? 50, 1), 500);
  const all = db().entries;
  for (let i = all.length - 1; i >= 0 && out.length < limit; i--) {
    const e = all[i]!;
    if (filter.channel && e.channel !== filter.channel) continue;
    if (filter.feedId && e.feedId !== filter.feedId) continue;
    if (filter.ministryId && e.ministryId !== filter.ministryId) continue;
    out.push(e);
  }
  return out;
}

/**
 * Answer an exchange: record it, then reply with the JSON body plus its
 * signed receipt (in the body as `receipt` and, base64url, in the
 * CivicOS-Receipt header).
 */
export async function exchangeResponse(input: Omit<ExchangeInput, 'status' | 'result'> & { status: number; result: string }, json: Record<string, unknown>, headers: Record<string, string> = {}): Promise<NextResponse> {
  const { receipt } = await logExchange(input);
  const res = NextResponse.json({ ...json, receipt }, { status: input.status, headers });
  res.headers.set(RECEIPT_HEADER, Buffer.from(JSON.stringify(receipt), 'utf8').toString('base64url'));
  return res;
}
