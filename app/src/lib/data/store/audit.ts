// The platform audit chain (hash-chained, SHA-256 v2; review R16), kept in
// `globalThis.__civicos.audit` as before and read here without loading the
// rest of the store: stores that only record audit entries import this module
// and no longer depend on the whole store.

import { createHash } from 'node:crypto';
import type { AuditEntry } from '@/lib/api/types';
import { verifySignedHeads, headsFingerprint, type SignedHeadCheck } from '@/lib/audit/sign';
import { auditRepo } from '@/lib/data/repo';
import { auditCommitted } from './audit-committed';
import { uid, hash } from './shared';

const g = globalThis as unknown as { __civicos?: { audit?: AuditEntry[] } };
/** The chain, in `__civicos.audit` (created on first use when the rest of the store has not loaded yet). */
const chain = (): AuditEntry[] => ((g.__civicos ??= {}).audit ??= []);

/**
 * The audit chain's hash (v2): SHA-256 over a canonical encoding of every
 * field of the entry and the previous hash, so no field — actor, time, detail
 * included — can change without breaking the chain. Entries written before v2
 * keep their original hash and are verified by the rule they were written with.
 */
export function auditHashV2(e: Pick<AuditEntry, 'seq' | 'at' | 'actor' | 'action' | 'resource' | 'outcome' | 'detail' | 'prevHash'>): string {
  const canonical = JSON.stringify(['civicos-audit-v2', e.seq, e.at, e.actor, e.action, e.resource, e.outcome, e.detail ?? null, e.prevHash ?? 'GENESIS']);
  return createHash('sha256').update(canonical, 'utf8').digest('hex');
}

// Append a hash-chained audit row (tamper-evident, mirrors the backend).
function appendAudit(
  actor: string,
  action: string,
  resource: string,
  outcome: string,
  detail?: string,
): AuditEntry {
  // Through the persistence port (lib/data/repo): memory, or written through to Postgres.
  const repo = auditRepo(chain);
  const prev = repo.head();
  const seq = (prev?.seq ?? 0) + 1;
  const prevHash = prev?.hash ?? null;
  const base = { id: uid('AU'), at: new Date().toISOString(), actor, action, resource, outcome, detail, seq, prevHash };
  const entry: AuditEntry = { ...base, alg: 'sha256-v2', hash: auditHashV2(base) };
  // Tell the save loop the state changed (lib/data/persist.ts markChanged; no import, the store stays edge-safe).
  const pg = globalThis as { __persistChanges?: number };
  pg.__persistChanges = (pg.__persistChanges ?? 0) + 1;
  // Once durable (at once in memory): the CloudEvent for this change (lib/events/outbox.ts) and,
  // every N entries or T minutes, a signed head (lib/audit/sign.ts) — ./audit-committed.ts.
  repo.append(entry, auditCommitted);
  return entry;
}

/** Writes one row to the shared audit chain for modules that keep their own
 *  state outside this file (e.g. the Update Center in ./updates). */
export function recordAudit(
  actor: string,
  action: string,
  resource: string,
  outcome: string,
  detail?: string,
): AuditEntry {
  return appendAudit(actor, action, resource, outcome, detail);
}

// ── Audit ─────────────────────────────────────────────────────────────
/**
 * Whether a list of entries chains, each by the rule it was written with
 * (no signed heads). Used for the live chain and for a chain read back from
 * a backup (lib/backup/state.ts) before it may count as restorable.
 */
export function verifyChainEntries(entries: readonly AuditEntry[]): { ok: boolean; checked: number; brokenAtSeq?: number } {
  const st = { prevHash: null as string | null, upgraded: false };
  for (const e of entries) if (!checkEntry(e, st)) return { ok: false, checked: entries.length, brokenAtSeq: e.seq };
  return { ok: true, checked: entries.length };
}

/**
 * A link of the chain whose content is left out (an institution's export
 * carries another institution's entries only as their sequence and hashes,
 * lib/portability/export.ts): it keeps the chain continuous without carrying
 * what it recorded.
 */
export interface AuditLink { seq: number; prevHash: string | null; hash: string; alg?: string }
export const isAuditEntry = (e: AuditEntry | AuditLink): e is AuditEntry => 'action' in e;

/**
 * Whether a segment of the chain holds (offline, no running server): every
 * full entry's hash recomputed by the rule it was written with, every item
 * linked to the one before by its previous hash, sequences without a gap. A
 * link's own hash is taken as given (its content is not there), but the next
 * item must chain from it, so nothing can be inserted, removed or reordered.
 */
export function verifyAuditSegment(items: readonly (AuditEntry | AuditLink)[]): { ok: boolean; checked: number; full: number; brokenAtSeq?: number } {
  let prev: AuditEntry | AuditLink | undefined;
  let full = 0;
  const st = { prevHash: null as string | null, upgraded: false };
  for (const e of items) {
    if (prev && (e.seq !== prev.seq + 1 || (e.prevHash ?? null) !== prev.hash)) return { ok: false, checked: items.length, full, brokenAtSeq: e.seq };
    st.prevHash = e.prevHash ?? null;
    if (isAuditEntry(e)) { if (!checkEntry(e, st)) return { ok: false, checked: items.length, full, brokenAtSeq: e.seq }; full++; }
    else { st.upgraded ||= e.alg === 'sha256-v2'; }
    prev = e;
  }
  return { ok: true, checked: items.length, full };
}

/** The whole chain, newest first. For screens prefer listAuditPage(): the chain grows without end. */
export function listAudit(): AuditEntry[] {
  return [...chain()].reverse();
}

/**
 * The first entry of the chain with this action and resource (e.g. the
 * `decision.seal` entry of `Decision:<id>`), whose time and position the hash
 * chain fixes. Indexed as the chain grows; rebuilt when the chain is replaced
 * (a restore) or trimmed.
 */
const ig = globalThis as unknown as { __auditFirstIndex?: { chain: AuditEntry[]; first?: AuditEntry; n: number; map: Map<string, AuditEntry> } };
export function firstAuditEntry(action: string, resource: string): AuditEntry | undefined {
  const c = chain();
  let x = ig.__auditFirstIndex;
  if (!x || x.chain !== c || x.n > c.length || x.first !== c[0]) x = ig.__auditFirstIndex = { chain: c, first: c[0], n: 0, map: new Map() };
  for (; x.n < c.length; x.n++) { const e = c[x.n]!; const k = `${e.action}\u0000${e.resource}`; if (!x.map.has(k)) x.map.set(k, e); }
  x.first = c[0];
  return x.map.get(`${action}\u0000${resource}`);
}

/** The index of the first entry with `seq >= seq` (the chain is in sequence order). */
function indexOfSeq(c: AuditEntry[], seq: number): number {
  let lo = 0, hi = c.length;
  while (lo < hi) { const mid = (lo + hi) >> 1; if (c[mid]!.seq < seq) lo = mid + 1; else hi = mid; }
  return lo;
}

/** The entry with a sequence number, found by position (sequences are contiguous) or by search. */
function entryAtSeq(c: AuditEntry[], seq: number): AuditEntry | undefined {
  const guess = c[seq - (c[0]?.seq ?? 1)];
  if (guess?.seq === seq) return guess;
  const e = c[indexOfSeq(c, seq)];
  return e?.seq === seq ? e : undefined;
}

export const AUDIT_PAGE_DEFAULT = 200;
export const AUDIT_PAGE_MAX = 1000;

/**
 * One page of the chain, newest first (go-live review M-8): `limit` entries
 * (default 200, at most 1000) before sequence `before` (exclusive; from the
 * head when absent). `nextBefore` asks for the page after this one.
 */
export function listAuditPage(q: { before?: number; limit?: number } = {}): { events: AuditEntry[]; total: number; nextBefore?: number } {
  const c = chain();
  const n = Math.min(Math.max(Math.floor(Number.isFinite(q.limit) ? q.limit! : AUDIT_PAGE_DEFAULT), 1), AUDIT_PAGE_MAX);
  const end = q.before !== undefined && Number.isFinite(q.before) ? indexOfSeq(c, q.before) : c.length;
  const start = Math.max(0, end - n);
  return { events: c.slice(start, end).reverse(), total: c.length, ...(start > 0 ? { nextBefore: c[start]!.seq } : {}) };
}

/** One step of the chain check: the entry by the rule it was written with, linked to the one before. */
function checkEntry(e: AuditEntry, st: { prevHash: string | null; upgraded: boolean }): boolean {
  // Once the chain is on v2, no entry may fall back.
  const v2 = e.alg === 'sha256-v2';
  if (st.upgraded && !v2) return false;
  st.upgraded ||= v2;
  const expected: string = v2 ? auditHashV2(e) : hash(`${st.prevHash ?? 'GENESIS'}|${e.action}|${e.resource}|${e.outcome}|${e.seq}`);
  if (expected !== e.hash || (e.prevHash ?? null) !== (st.prevHash ?? null)) return false;
  st.prevHash = e.hash;
  return true;
}

export interface AuditChainCheck {
  ok: boolean;
  checked: number;
  brokenAtSeq?: number;
  /** The signed heads (lib/audit/sign.ts): the last one, and whether every one still matches the chain. */
  signed?: SignedHeadCheck;
}

/**
 * The full check, every entry, on the calling thread. For officials' screens
 * and evidence; anything public or frequent reads auditVerification(), which
 * answers from the cached, incremental result.
 */
export function verifyAuditChain(): AuditChainCheck {
  const c = chain();
  const links = verifyChainEntries(c);
  if (!links.ok) return links;
  const signed = verifySignedHeads(seq => entryAtSeq(c, seq));
  return signed.ok ? { ok: true, checked: c.length, signed } : { ok: false, checked: c.length, signed };
}

// ── Verification for everyone (go-live review M-8) ────────────────────
// /api/audit/verify is public and the cover page asks it on every open, so
// it must not hash the whole chain per request. The result is cached: each
// answer checks only the entries appended since the last one (a bounded
// number on the request path; the rest catch up in the background, in chunks
// that yield to other requests), and the whole chain is checked again off the
// request path every CIVICOS_AUDIT_REVERIFY_MINUTES (default 10), also in
// yielding chunks, so a change to an old entry is still found. The cache is
// memory of the running server (not saved; the key is outside `__civicos*`).

export interface CachedAuditVerification extends AuditChainCheck {
  /** Entries in the chain now. */
  total: number;
  /** False while the background catch-up has not reached the head yet. */
  complete: boolean;
  verifiedAt: string;
  /** When the whole chain was last checked from the start. */
  fullCheckAt?: string;
}

interface VerifyCache {
  ref: AuditEntry[];
  count: number;
  prevHash: string | null;
  upgraded: boolean;
  brokenAtSeq?: number;
  /** This cache started from the first entry: reaching the head counts as a full check. */
  fromStart: number;
  fullAt?: number;
  signedKey?: string;
  signedFrom: number;
  signed?: SignedHeadCheck;
  /** Entries hashed by the cache (for tests and metrics). */
  hashed: number;
}
const vg = globalThis as unknown as { __auditVerifyCache?: VerifyCache; __auditVerifyBusy?: { catchUp?: Promise<void>; full?: Promise<void> } };
const busy = () => (vg.__auditVerifyBusy ??= {});
/** Entries checked at most on the request path; more catch up in the background. */
export const SYNC_VERIFY_MAX = 20_000;
const CHUNK = 20_000;
const reverifyMs = (): number => {
  const m = Number(process.env.CIVICOS_AUDIT_REVERIFY_MINUTES);
  return (Number.isFinite(m) && m > 0 ? m : 10) * 60_000;
};
const yieldNow = () => new Promise<void>(r => setImmediate(r));

export function resetAuditVerification(): void { vg.__auditVerifyCache = undefined; }
export const auditVerifyStats = (): { hashed: number; count: number } => ({ hashed: vg.__auditVerifyCache?.hashed ?? 0, count: vg.__auditVerifyCache?.count ?? 0 });

/** The cache for this chain, started over when the chain was replaced (a restore) or no longer holds what was checked. */
function cacheFor(c: AuditEntry[], now: number): VerifyCache {
  const s = vg.__auditVerifyCache;
  const moved = s && (s.ref !== c || c.length < s.count || (s.count > 0 && c[s.count - 1]!.hash !== s.prevHash));
  if (s && !moved) return s;
  return (vg.__auditVerifyCache = { ref: c, count: 0, prevHash: null, upgraded: false, fromStart: now, signedFrom: 0, hashed: s?.hashed ?? 0 });
}

/** Check up to `max` entries after those already checked. */
function advance(s: VerifyCache, max: number, now: number): void {
  if (s.brokenAtSeq !== undefined) return;
  const c = s.ref;
  const end = Math.min(c.length, s.count + max);
  const st = { prevHash: s.prevHash, upgraded: s.upgraded };
  for (let i = s.count; i < end; i++) {
    s.hashed++;
    if (!checkEntry(c[i]!, st)) { s.brokenAtSeq = c[i]!.seq; break; }
    s.count = i + 1;
  }
  s.prevHash = st.prevHash;
  s.upgraded = st.upgraded;
  if (s.count === c.length && s.fullAt === undefined) s.fullAt = s.fromStart;
  void now;
}

function catchUpInBackground(): void {
  const b = busy();
  if (b.catchUp) return;
  b.catchUp = (async () => {
    try {
      for (;;) {
        const s = vg.__auditVerifyCache;
        if (!s || s.brokenAtSeq !== undefined || s.count >= s.ref.length) return;
        advance(s, CHUNK, Date.now());
        await yieldNow();
      }
    } finally { b.catchUp = undefined; }
  })();
}

/**
 * Check the whole chain again from the first entry, in chunks that yield to
 * other requests, and record the result in the cache. One at a time.
 */
export function reverifyAuditChain(): Promise<void> {
  const b = busy();
  if (b.full) return b.full;
  b.full = (async () => {
    try {
      const c = chain();
      const started = Date.now();
      const upTo = c.length;
      const st = { prevHash: null as string | null, upgraded: false };
      let broken: number | undefined;
      for (let i = 0; i < upTo; i++) {
        if (!checkEntry(c[i]!, st)) { broken = c[i]!.seq; break; }
        if ((i + 1) % CHUNK === 0) await yieldNow();
      }
      const s = cacheFor(c, started);
      s.hashed += upTo;
      if (broken !== undefined) s.brokenAtSeq = broken;
      // Every signed head again (the incremental check only looks at new ones).
      s.signedKey = undefined;
      s.signedFrom = 0;
      s.fullAt = started;
    } finally { b.full = undefined; }
  })();
  return b.full;
}

function signedFor(s: VerifyCache): SignedHeadCheck {
  const f = headsFingerprint();
  if (s.signed && s.signedKey === f.key) return s.signed;
  const from = f.count < s.signedFrom ? 0 : s.signedFrom;
  const c = s.ref;
  s.signed = verifySignedHeads(seq => entryAtSeq(c, seq), from);
  s.signedKey = f.key;
  // Heads checked and signed need no second look; a pending one is checked again once signed.
  s.signedFrom = s.signed.ok ? f.firstPending : 0;
  return s.signed;
}

/** The chain's verification as of now, from the cache (see above). */
export function auditVerification(now = Date.now()): CachedAuditVerification {
  const c = chain();
  const s = cacheFor(c, now);
  advance(s, SYNC_VERIFY_MAX, now);
  if (s.brokenAtSeq === undefined && s.count < c.length) catchUpInBackground();
  if (s.fullAt !== undefined && now - s.fullAt > reverifyMs()) void reverifyAuditChain();
  const complete = s.brokenAtSeq !== undefined || s.count === c.length;
  const signed = signedFor(s);
  const base = { checked: s.brokenAtSeq !== undefined ? c.length : s.count, total: c.length, complete, verifiedAt: new Date(now).toISOString(), ...(s.fullAt !== undefined ? { fullCheckAt: new Date(s.fullAt).toISOString() } : {}) };
  if (s.brokenAtSeq !== undefined) return { ok: false, ...base, brokenAtSeq: s.brokenAtSeq };
  return { ok: signed.ok, ...base, signed };
}

/** The chain's current head (sequence and hash), for signing and anchoring. */
export function auditHead(): { seq: number; hash: string } | null {
  const e = chain()[chain().length - 1];
  return e ? { seq: e.seq, hash: e.hash } : null;
}
