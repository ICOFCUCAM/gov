// The platform audit chain (hash-chained, SHA-256 v2; review R16), kept in
// `globalThis.__civicos.audit` as before and read here without loading the
// rest of the store: stores that only record audit entries import this module
// and no longer depend on the whole store.

import { createHash } from 'node:crypto';
import type { AuditEntry } from '@/lib/api/types';
import { verifySignedHeads, type SignedHeadCheck } from '@/lib/audit/sign';
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
export function listAudit(): AuditEntry[] {
  return [...chain()].reverse();
}

export function verifyAuditChain(): {
  ok: boolean;
  checked: number;
  brokenAtSeq?: number;
  /** The signed heads (lib/audit/sign.ts): the last one, and whether every one still matches the chain. */
  signed?: SignedHeadCheck;
} {
  let prevHash: string | null = null;
  let upgraded = false;
  for (const e of chain()) {
    // Each entry by the rule it was written with; once the chain is on v2, no entry may fall back.
    const v2 = e.alg === 'sha256-v2';
    if (upgraded && !v2) return { ok: false, checked: chain().length, brokenAtSeq: e.seq };
    upgraded ||= v2;
    const expected: string = v2 ? auditHashV2(e) : hash(`${prevHash ?? 'GENESIS'}|${e.action}|${e.resource}|${e.outcome}|${e.seq}`);
    if (expected !== e.hash || (e.prevHash ?? null) !== (prevHash ?? null)) {
      return { ok: false, checked: chain().length, brokenAtSeq: e.seq };
    }
    prevHash = e.hash;
  }
  const bySeq = new Map(chain().map(e => [e.seq, e]));
  const signed = verifySignedHeads(seq => bySeq.get(seq));
  return signed.ok ? { ok: true, checked: chain().length, signed } : { ok: false, checked: chain().length, signed };
}

/** The chain's current head (sequence and hash), for signing and anchoring. */
export function auditHead(): { seq: number; hash: string } | null {
  const e = chain()[chain().length - 1];
  return e ? { seq: e.seq, hash: e.hash } : null;
}
