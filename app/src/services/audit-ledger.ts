// Sovereign Audit Ledger — federation service.
//
// RULE 4: every institutional system carries a tamper-evident audit trail.
// Per-scope, hash-chained (FNV-1a), append-only.
//
// Architecture: the ledger keeps an in-memory mirror for synchronous UI
// reads, AND persists to the civicos.audit_entries substrate via a
// SECURITY DEFINER RPC. The DB enforces the chain (concurrent inserts are
// serialized per scope via pg_advisory_xact_lock), so the in-memory copy
// is a cache, not the source of truth. When the substrate isn't configured
// the ledger falls back to memory-only — UI works either way.

import { appendAuditRow, auditTrailRows, verifyChainRow, substrateAvailable } from '@/lib/db/repos/audit';
import { enrichActorString } from '@/services/actor-resolver';

export interface AuditEntry {
  seq: number;
  at: number;
  scope: string;
  actor: string;
  action: string;
  subject: string;
  detail: string;
  prevHash: string;
  hash: string;
}

type Listener = () => void;
const chains = new Map<string, AuditEntry[]>();
const listeners = new Set<Listener>();
let _version = 0;
/** Stable snapshot for useSyncExternalStore — changes only on mutation. */
export function version(): number { return _version; }
const emit = () => { _version++; for (const l of listeners) l(); };

export function subscribe(l: Listener): () => void {
  listeners.add(l);
  return () => listeners.delete(l);
}

// Local FNV-1a digest — identical to the Postgres civicos.fnv1a_hex
// function, so the in-memory mirror agrees with the DB byte-for-byte
// (verified by the migration test in this PR).
function digest(s: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = (h + ((h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24))) >>> 0;
  }
  return h.toString(16).padStart(8, '0');
}

/** Compute the next entry locally (used when persistence is unavailable
 *  AND for synchronous UI feedback while the DB round-trip is in-flight). */
function nextEntry(scope: string, actor: string, action: string, subject: string, detail: string): AuditEntry {
  const chain = chains.get(scope) ?? [];
  const prev = chain[chain.length - 1];
  const prevHash = prev ? prev.hash : '00000000';
  const seq = chain.length + 1;
  const at = Date.now();
  const hash = digest(`${prevHash}|${seq}|${scope}|${actor}|${action}|${subject}|${detail}`);
  return { seq, at, scope, actor, action, subject, detail, prevHash, hash };
}

/** Append an audit entry. Returns synchronously with the in-memory entry;
 *  persistence happens in the background. The DB-canonical entry will be
 *  reconciled in via hydrateScope() on next mount. */
export function appendAudit(scope: string, actor: string, action: string, subject: string, detail = ''): AuditEntry {
  // Tag the actor with the signed-in identity when available so the
  // chain records who really acted. The tag is part of the hashed
  // material, so in-memory and DB digests stay aligned.
  const taggedActor = enrichActorString(actor);
  const entry = nextEntry(scope, taggedActor, action, subject, detail);
  const chain = chains.get(scope) ?? [];
  chains.set(scope, [...chain, entry]);
  emit();

  // Persist if substrate is available — fire and forget.
  if (substrateAvailable()) {
    void appendAuditRow(scope, taggedActor, action, subject, detail).catch(() => {
      // Persistence failures don't break the UI; the in-memory mirror
      // remains. A reconciliation pass on hydrate will re-establish truth.
    });
  }

  return entry;
}

export function auditTrail(scope: string, limit = 50): AuditEntry[] {
  const chain = chains.get(scope) ?? [];
  return chain.slice(-limit).reverse();
}

export interface ChainVerification { scope: string; entries: number; intact: boolean; brokenAt: number | null }
export function verifyChain(scope: string): ChainVerification {
  const chain = chains.get(scope) ?? [];
  let prevHash = '00000000';
  for (const e of chain) {
    const expect = digest(`${prevHash}|${e.seq}|${e.scope}|${e.actor}|${e.action}|${e.subject}|${e.detail}`);
    if (e.prevHash !== prevHash || e.hash !== expect) {
      return { scope, entries: chain.length, intact: false, brokenAt: e.seq };
    }
    prevHash = e.hash;
  }
  return { scope, entries: chain.length, intact: true, brokenAt: null };
}

export function auditStats() {
  let entries = 0; let intact = true;
  for (const scope of chains.keys()) {
    const v = verifyChain(scope);
    entries += v.entries;
    if (!v.intact) intact = false;
  }
  return { scopes: chains.size, entries, intact };
}

// ── Persistent reconciliation ─────────────────────────────────────────
// Hydrate an in-memory scope from the canonical DB chain. Call this when
// mounting a surface that wants to display history beyond the current
// process's memory.
export async function hydrateScope(scope: string, limit = 100): Promise<number> {
  if (!substrateAvailable()) return 0;
  const rows = await auditTrailRows(scope, limit);
  if (rows.length === 0) return 0;
  // Rows arrive newest-first; replace local chain with newest-last order.
  chains.set(scope, [...rows].reverse());
  emit();
  return rows.length;
}

/** Server-canonical verification (DB-side walk). Falls back to the local
 *  walk when the substrate isn't configured. */
export async function verifyChainPersistent(scope: string): Promise<ChainVerification> {
  if (substrateAvailable()) {
    const r = await verifyChainRow(scope);
    if (r) return r;
  }
  return verifyChain(scope);
}

/** Reset (tests only). */
export function __resetAudit(): void {
  chains.clear();
  _version = 0;
}
