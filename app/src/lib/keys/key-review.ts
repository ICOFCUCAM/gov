// Independent review of key-management and privileged operations (plan I9;
// acceptance P5-12 "Privileged access and key-management operations are
// recorded and independently reviewable", P6-07; specification Part 5 H
// "Sovereign key management": rotation, revocation and access "approved and
// audited"; plan §2 "Privileged administrators").
//
// Every key operation is already an audit-chain entry: key custody's signing
// and data keys (keys.*), the state's seal keys (seal-key.*), institutions'
// federation keys and the peer keys trusted for other installations
// (federation.key.*, federation.peer.*), the publisher keys a nation trusts
// for its software (update.publisher-key.*), integration and exchange keys,
// break-glass and second-step keys. This module lets a reviewer outside the
// operators read them afterwards and record the review:
//
//   - the reviewer is one who may read the audit chain (canReadAuditChain():
//     an auditor, or an official of the data-protection authority), never an
//     administrator by role, and never a person who took any of the operations
//     reviewed (dualControlRefusal(), comparing people);
//   - a review covers every key operation not yet reviewed up to a sequence
//     of the chain: each entry by its sequence and hash, a digest over them,
//     and whether the chain verified at that point;
//   - the outcome is "no concerns" or "concerns" with the findings in words; a
//     finding is a prompt for the institution that holds the key, never a
//     conclusion, and changes no key and no record;
//   - the reading is in the access log (register `audit`), the review in the
//     audit chain (`audit.key-review`, which is not itself a key operation).
//
// Kept as it stands by a data restore (lib/backup/state.ts KEPT_ON_RESTORE):
// oversight evidence, like the access log.

import { createHash, randomUUID } from 'node:crypto';
import { touch } from '@/lib/data/repo/track';
import { withDefaults } from '@/lib/data/defaults';
import { recordAudit, listAudit, verifyAuditChain } from '@/lib/data/store/audit';
import { dualControlRefusal } from '@/lib/data/dual-control';
import { canReadAuditChain, type Scope } from '@/lib/auth/roles';
import { recordAccess } from '@/lib/records/access-log';
import { accessBy } from '@/lib/records/access-by';
import { installationMode } from '@/lib/ops/mode';
import { authMode } from '@/lib/auth/mode';
import type { AuditEntry } from '@/lib/api/types';

/** The audit actions that are key-management or privileged-access operations. */
export const KEY_OPERATION = /^(keys\.|seal-key\.|federation\.key\.|federation\.peer\.|update\.publisher-key\.|integration\.key\.|exchange\.key\.|update\.break-glass|auth\.two-step\.key)/;
export const REVIEW_ACTION = 'audit.key-review';

export interface KeyReview {
  id: string;
  reviewer: { by: string; byId?: string; institution?: string; capacity: 'auditor' | 'data-protection' | 'unverified' };
  at: string;
  /** The operations it covers: sequence, hash, action and who took it. */
  entries: { seq: number; hash: string; action: string; actor: string; at: string }[];
  through: number;
  digest: string;
  chain: { ok: boolean; brokenAtSeq?: number };
  outcome: 'no-concerns' | 'concerns';
  findings: string;
}
type Db = { reviews: KeyReview[] };
const seed = (): Db => ({ reviews: [] });
const g = globalThis as unknown as { __civicosKeyReviews?: Db };
const db = (): Db => touch('__civicosKeyReviews', g.__civicosKeyReviews = withDefaults(g.__civicosKeyReviews ??= seed(), seed()));
export function resetKeyReviews(): void { g.__civicosKeyReviews = undefined; }
const fail = (error: string, status = 422) => ({ error, status });

export interface Reviewer { by: string; byId?: string; scope: Scope | null; dataProtection?: string }

/** Why this person may not review key operations, or null. */
export function reviewerRefusal(r: Reviewer): string | null {
  if (!r.scope) return installationMode() === 'production' || authMode().enforced ? 'Sign in: key operations are reviewed by an auditor or the data-protection authority, signed in' : null;
  return canReadAuditChain(r.scope, r.dataProtection) ? 'Key operations are reviewed by an auditor or an official of the data-protection authority: never by the operators who hold the keys' : null;
}

const reviewedSeqs = (): Set<number> => new Set(db().reviews.flatMap(x => x.entries.map(e => e.seq)));

/** Key operations in the chain, oldest first, each with the review that covered it (if any). */
export function keyOperations(): (Pick<AuditEntry, 'seq' | 'hash' | 'action' | 'actor' | 'at' | 'resource' | 'outcome'> & { review?: string })[] {
  const by = new Map<number, string>();
  for (const r of db().reviews) for (const e of r.entries) by.set(e.seq, r.id);
  return listAudit().reverse().filter(e => KEY_OPERATION.test(e.action)).map(e => ({ seq: e.seq, hash: e.hash, action: e.action, actor: e.actor, at: e.at, resource: e.resource, outcome: e.outcome, ...(by.has(e.seq) ? { review: by.get(e.seq)! } : {}) }));
}

/**
 * Record a review of every key operation not yet reviewed, up to `through`
 * (the head by default). The reader is written to the access log first.
 */
export function recordKeyReview(input: { through?: unknown; outcome?: unknown; findings?: unknown }, r: Reviewer, now = new Date()): KeyReview | { error: string; status: number } {
  const why = reviewerRefusal(r);
  if (why) return fail(why, 403);
  const outcome = input.outcome === 'no-concerns' || input.outcome === 'concerns' ? input.outcome : null;
  if (!outcome) return fail("outcome is 'no-concerns' or 'concerns'");
  const findings = typeof input.findings === 'string' ? input.findings.trim().slice(0, 4000) : '';
  if (outcome === 'concerns' && findings.length < 10) return fail('Say what the concerns are: they go to the institution that holds the key as a prompt, never as a conclusion');
  const done = reviewedSeqs();
  const through = Number.isInteger(input.through) ? (input.through as number) : Infinity;
  const ops = listAudit().reverse().filter(e => KEY_OPERATION.test(e.action) && !done.has(e.seq) && e.seq <= through);
  if (!ops.length) return fail('No key operation is waiting for review', 409);
  // Independent: the reviewer took none of the operations reviewed.
  for (const e of ops) {
    const same = dualControlRefusal({ by: e.actor }, { by: r.by, ...(r.byId ? { byId: r.byId } : {}) });
    if (same) return fail(`You took operation ${e.seq} (${e.action}) yourself: a different person reviews it`, 403);
  }
  const chain = verifyAuditChain();
  const entries = ops.map(e => ({ seq: e.seq, hash: e.hash, action: e.action, actor: e.actor, at: e.at }));
  const digest = createHash('sha256').update(entries.map(e => `${e.seq}:${e.hash}`).join('\n')).digest('hex');
  const capacity: KeyReview['reviewer']['capacity'] = !r.scope ? 'unverified' : r.scope.role === 'auditor' ? 'auditor' : 'data-protection';
  // The reading itself is logged, as every read of the audit chain is.
  recordAccess({ ...(r.scope ? accessBy({ ...(r.byId ? { id: r.byId } : {}), label: r.by, ...(r.scope.institution ? { institution: r.scope.institution } : {}) }, now) : { by: { name: r.by } }),
    record: { register: 'audit', query: `key operations ${entries[0]!.seq}–${entries.at(-1)!.seq}` }, action: 'view', purpose: 'Independent review of key-management and privileged operations', result: 'allowed', rule: 'canReadAuditChain' }, now);
  const rev: KeyReview = {
    id: `KR-${randomUUID().slice(0, 8)}`, reviewer: { by: r.by, ...(r.byId ? { byId: r.byId } : {}), ...(r.scope?.institution ? { institution: r.scope.institution } : {}), capacity },
    at: now.toISOString(), entries, through: entries.at(-1)!.seq, digest, chain: { ok: chain.ok, ...(chain.brokenAtSeq !== undefined ? { brokenAtSeq: chain.brokenAtSeq } : {}) }, outcome, findings,
  };
  db().reviews.push(rev);
  recordAudit(r.by, REVIEW_ACTION, `KeyReview:${rev.id}`, 'ok', `${entries.length} key operation(s) ${entries[0]!.seq}–${rev.through} · digest ${digest.slice(0, 16)} · chain ${chain.ok ? 'verifies' : 'broken'} · ${outcome}`);
  return structuredClone(rev);
}

/** Reviews recorded, newest first. */
export const keyReviews = (): KeyReview[] => db().reviews.map(x => structuredClone(x)).reverse();

/** What waits for review (the onboarding hub and the auditors' view). */
export function keyReviewStatus(): { unreviewed: number; oldest?: string; lastReview?: { id: string; at: string; outcome: KeyReview['outcome'] } } {
  const ops = keyOperations().filter(o => !o.review);
  const last = db().reviews.at(-1);
  return { unreviewed: ops.length, ...(ops[0] ? { oldest: ops[0].at } : {}), ...(last ? { lastReview: { id: last.id, at: last.at, outcome: last.outcome } } : {}) };
}
