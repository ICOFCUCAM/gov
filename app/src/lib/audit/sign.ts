// Signed heads of the platform audit chain (review R7, register 1.13).
//
// The hash chain (lib/data/store.ts) shows that no entry changed after a
// later one was written; it does not show that the whole tail was not
// rewritten by whoever holds the state. Every SIGN_EVERY entries or
// SIGN_MINUTES minutes the head `{seq, hash, at}` is signed with the
// platform's Ed25519 audit key (CIVICOS_AUDIT_KEY: a PEM private key or a
// key file path; KMS/HSM in production), and the signed head is kept in its
// own append-only store. A rewritten tail no longer matches a signed head,
// and the anchor cron (/api/cron/audit-anchor) copies heads outside the
// platform state as well.
//
// Without CIVICOS_AUDIT_KEY a development key is generated per process and
// every head it signs says `production: false` (not evidence for production).
//
// This module does not import the store (the store calls it), so it takes
// the entries it needs as arguments.

import { signingKey, signBytes, verifyBytes } from '@/lib/crypto/signing-key';
import { withSpanSync } from '@/lib/ops/trace';

export const AUDIT_KEY_ENV = 'CIVICOS_AUDIT_KEY';

export interface SignedHead {
  /** Sequence number of the chain entry that was the head. */
  seq: number;
  /** That entry's hash. */
  hash: string;
  /** When the head was signed. */
  at: string;
  keyId: string;
  publicKeyPem: string;
  /** Base64 Ed25519 signature over `headPayload(seq, hash, at)`. */
  signature: string;
  /** False when signed with the generated development key. */
  production: boolean;
  /** Set by the anchor cron once the head was copied outside the platform state. */
  anchoredAt?: string;
  anchoredTo?: string[];
}

interface HeadsDb { heads: SignedHead[] }
const g = globalThis as unknown as { __civicosAuditHeads?: HeadsDb };
const db = (): HeadsDb => {
  const d = (g.__civicosAuditHeads ??= { heads: [] });
  d.heads ??= [];
  return d;
};
export function resetAuditHeads(): void { g.__civicosAuditHeads = undefined; }

const num = (v: string | undefined, d: number) => { const n = Number(v); return Number.isFinite(n) && n > 0 ? n : d; };
/** Sign the head after this many new entries (CIVICOS_AUDIT_SIGN_EVERY, default 50). */
export const signEvery = () => num(process.env.CIVICOS_AUDIT_SIGN_EVERY, 50);
/** …or after this many minutes with any new entry (CIVICOS_AUDIT_SIGN_MINUTES, default 15). */
export const signMinutes = () => num(process.env.CIVICOS_AUDIT_SIGN_MINUTES, 15);

/** The exact bytes that are signed. */
export const headPayload = (seq: number, hash: string, at: string): string =>
  JSON.stringify(['civicos-audit-head-v1', seq, hash, at]);

export const listSignedHeads = (): SignedHead[] => [...db().heads];
export const lastSignedHead = (): SignedHead | undefined => db().heads[db().heads.length - 1];

/** Sign `head` now (unless it is already the last signed head) and append it. */
export function signHead(head: { seq: number; hash: string }, now = Date.now()): SignedHead {
  const last = lastSignedHead();
  if (last && last.seq === head.seq && last.hash === head.hash) return last;
  if (last && head.seq < last.seq) throw new Error(`Head ${head.seq} is older than the last signed head ${last.seq}`);
  const key = signingKey(AUDIT_KEY_ENV);
  const at = new Date(now).toISOString();
  const signed: SignedHead = {
    seq: head.seq, hash: head.hash, at,
    keyId: key.keyId, publicKeyPem: key.publicKeyPem,
    signature: signBytes(key, headPayload(head.seq, head.hash, at)),
    production: key.production,
  };
  db().heads.push(signed);
  return signed;
}

/**
 * Called after every append: signs the head when the count or time policy
 * says so. The store calls it once per audit entry, so this is also where an
 * append shows in a trace (span `audit.append`, sequence and action only).
 */
export function maybeSignHead(head: { seq: number; hash: string; action?: string }, now = Date.now()): SignedHead | null {
  return withSpanSync('audit.append', { 'civicos.audit.seq': head.seq, ...(head.action ? { 'civicos.audit.action': head.action } : {}) }, span => {
    const signed = signHeadIfDue(head, now);
    if (signed) span.setAttribute('civicos.audit.signed_head', signed.seq);
    return signed;
  });
}

function signHeadIfDue(head: { seq: number; hash: string }, now: number): SignedHead | null {
  const last = lastSignedHead();
  if (!last) return head.seq >= signEvery() ? signHead(head, now) : null;
  if (head.seq <= last.seq) return null;
  if (head.seq - last.seq >= signEvery() || now - Date.parse(last.at) >= signMinutes() * 60_000) return signHead(head, now);
  return null;
}

/** Mark heads as anchored outside the platform state (the anchor cron). */
export function markAnchored(seq: number, where: string[], now = Date.now()): void {
  const h = db().heads.find(x => x.seq === seq);
  if (!h) return;
  h.anchoredAt = new Date(now).toISOString();
  h.anchoredTo = Array.from(new Set([...(h.anchoredTo ?? []), ...where]));
}

export interface SignedHeadCheck {
  ok: boolean;
  /** The last signed head, as checked. */
  head?: Pick<SignedHead, 'seq' | 'hash' | 'at' | 'keyId' | 'production' | 'anchoredAt' | 'anchoredTo'>;
  signedHeads: number;
  /** The signed heads' key is the one configured now (CIVICOS_AUDIT_KEY). */
  currentKey?: boolean;
  problem?: string;
}

/**
 * Check every signed head: its signature, its order, and that the chain
 * still has an entry with that sequence and hash. `entryAt(seq)` returns
 * the chain's entry for a sequence number.
 */
export function verifySignedHeads(entryAt: (seq: number) => { hash: string } | undefined): SignedHeadCheck {
  const heads = db().heads;
  let prev = 0;
  for (const h of heads) {
    if (!verifyBytes(h.publicKeyPem, headPayload(h.seq, h.hash, h.at), h.signature)) {
      return { ok: false, signedHeads: heads.length, problem: `signed head ${h.seq} has a bad signature` };
    }
    if (h.seq < prev) return { ok: false, signedHeads: heads.length, problem: `signed head ${h.seq} is out of order` };
    prev = h.seq;
    const e = entryAt(h.seq);
    if (!e || e.hash !== h.hash) return { ok: false, signedHeads: heads.length, problem: `the chain no longer matches signed head ${h.seq}` };
  }
  const last = heads[heads.length - 1];
  if (!last) return { ok: true, signedHeads: 0 };
  const { seq, hash, at, keyId, production, anchoredAt, anchoredTo } = last;
  return { ok: true, signedHeads: heads.length, head: { seq, hash, at, keyId, production, anchoredAt, anchoredTo }, currentKey: signingKey(AUDIT_KEY_ENV).keyId === keyId };
}
