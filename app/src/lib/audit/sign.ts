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
// The key is held as lib/keys/custody.ts decides (CIVICOS_KEY_PROVIDER). With
// a remote provider (Vault / OpenBao Transit, a KMS) the head is recorded at
// once with `pending: true` and signed when the provider answers; a head the
// provider could not sign stays pending (with the reason) and is tried again
// on the next append. A pending head is not yet evidence and is not checked.
//
// This module does not import the store (the store calls it), so it takes
// the entries it needs as arguments.

import { verifyBytes } from '@/lib/crypto/signing-key';
import { signer, type Signer } from '@/lib/keys/custody';
import { logger } from '@/lib/ops/log';
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
  /** A remote key provider has not signed it yet (`signature` is empty). */
  pending?: boolean;
  /** Why the provider has not signed it (it is tried again). */
  signError?: string;
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
/** Heads a remote provider has not signed yet. */
export const pendingHeads = (): number => { let n = 0; for (const h of db().heads) if (h.pending) n++; return n; };
export const lastSignedHead = (): SignedHead | undefined => db().heads[db().heads.length - 1];

// Signatures in flight with a remote provider (process-local; by sequence number).
const inflight = new Map<number, Promise<SignedHead>>();
const markChanged = () => { const pg = globalThis as { __persistChanges?: number }; pg.__persistChanges = (pg.__persistChanges ?? 0) + 1; };

function completeRemote(h: SignedHead, s: Signer): Promise<SignedHead> {
  const running = inflight.get(h.seq);
  if (running) return running;
  const p = s.sign(headPayload(h.seq, h.hash, h.at)).then(r => {
    h.keyId = r.keyId; h.publicKeyPem = r.publicKeyPem; h.signature = r.signature; h.production = s.production;
    delete h.pending; delete h.signError;
    markChanged();
    return h;
  }, (e: Error) => {
    h.signError = e.message.slice(0, 300);
    markChanged();
    logger.error('audit.sign_failed', { seq: h.seq, provider: s.source, message: h.signError });
    return h;
  }).finally(() => inflight.delete(h.seq));
  inflight.set(h.seq, p);
  return p;
}

/** Sign `head` now (unless it is already the last signed head) and append it. */
export function signHead(head: { seq: number; hash: string }, now = Date.now()): SignedHead {
  const last = lastSignedHead();
  if (last && last.seq === head.seq && last.hash === head.hash) return last;
  if (last && head.seq < last.seq) throw new Error(`Head ${head.seq} is older than the last signed head ${last.seq}`);
  const s = signer('audit');
  const at = new Date(now).toISOString();
  const payload = headPayload(head.seq, head.hash, at);
  let signed: SignedHead;
  if (s.signSync) {
    const r = s.signSync(payload);
    signed = { seq: head.seq, hash: head.hash, at, keyId: r.keyId, publicKeyPem: r.publicKeyPem, signature: r.signature, production: s.production };
    db().heads.push(signed);
  } else {
    const cur = s.current();
    signed = { seq: head.seq, hash: head.hash, at, keyId: cur?.keyId ?? '', publicKeyPem: cur?.publicKeyPem ?? '', signature: '', production: s.production, pending: true };
    db().heads.push(signed);
    void completeRemote(signed, s);
  }
  return signed;
}

/** The head once its signature is settled (at once for a local key; when the remote provider answered otherwise). */
export async function settledHead(h: SignedHead): Promise<SignedHead> {
  if (!h.pending) return h;
  return inflight.get(h.seq) ?? completeRemote(h, signer('audit'));
}

/** Sign heads still pending (after a restart or a provider outage); a few at a time. */
export function retryPendingHeads(max = 5): void {
  const heads = db().heads;
  let n = 0;
  for (let i = heads.length - 1; i >= 0 && i >= heads.length - 200 && n < max; i--) {
    const h = heads[i]!;
    if (h.pending && !inflight.has(h.seq)) { n++; void completeRemote(h, signer('audit')); }
  }
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
    if (pendingHeads() > (signed?.pending ? 1 : 0)) retryPendingHeads();
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
  /** Heads a remote key provider has not signed yet (not counted as evidence). */
  pending?: number;
  /** The signed heads' key is the one configured now (CIVICOS_AUDIT_KEY or the key provider's). */
  currentKey?: boolean;
  problem?: string;
}

/**
 * Check every signed head: its signature, its order, and that the chain
 * still has an entry with that sequence and hash. `entryAt(seq)` returns
 * the chain's entry for a sequence number. Pending heads (not yet signed by
 * a remote provider) are checked for order and chain only.
 */
export function verifySignedHeads(entryAt: (seq: number) => { hash: string } | undefined): SignedHeadCheck {
  const heads = db().heads;
  let prev = 0;
  let pending = 0;
  let last: SignedHead | undefined;
  for (const h of heads) {
    if (h.pending) pending++;
    else if (!verifyBytes(h.publicKeyPem, headPayload(h.seq, h.hash, h.at), h.signature)) {
      return { ok: false, signedHeads: heads.length, problem: `signed head ${h.seq} has a bad signature` };
    }
    if (h.seq < prev) return { ok: false, signedHeads: heads.length, problem: `signed head ${h.seq} is out of order` };
    prev = h.seq;
    const e = entryAt(h.seq);
    if (!e || e.hash !== h.hash) return { ok: false, signedHeads: heads.length, problem: `the chain no longer matches signed head ${h.seq}` };
    if (!h.pending) last = h;
  }
  const extra = pending ? { pending } : {};
  if (!last) return { ok: true, signedHeads: heads.length - pending, ...extra };
  const { seq, hash, at, keyId, production, anchoredAt, anchoredTo } = last;
  const cur = signer('audit').current();
  return { ok: true, signedHeads: heads.length - pending, ...extra, head: { seq, hash, at, keyId, production, anchoredAt, anchoredTo }, ...(cur ? { currentKey: cur.keyId === keyId } : {}) };
}
