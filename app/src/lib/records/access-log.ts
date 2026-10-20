// The access log (docs/GOVERNMENT_OPERATING_MODEL.md §4.3, directions 15.2,
// 15.3): every read of a restricted or secret record, every search over them,
// every export, every refused access and every change of who may see what.
// Kept apart from the audit chain because its volume and retention differ,
// and hash-chained the same way (SHA-256 over the previous hash and the
// entry), so an entry cannot be changed or removed without the chain showing
// it. It holds no record content: who, which record, what, why, when, the
// result and the rule. Read by auditors and the data-protection authority's
// officials; nobody edits it; it is shortened only by the nation's retention
// rule, which keeps the hash of what it removed. Held in platform state
// (lib/data/persist.ts).

import { sha256Hex } from '@/lib/audit/sha256';
import { touch } from '@/lib/data/repo/track';
import { uuid7 } from '@/lib/data/uuid7';

export type AccessAction = 'view' | 'search' | 'export' | 'refused' | 'permission';

export interface AccessEntry {
  id: string;
  seq: number;
  at: string;
  /** The official (session subject), their name and institution. */
  by: { id?: string; name: string; institution?: string };
  /** The register and record, e.g. { register: 'cases', id: 'CIV-2026-000012' }; a search names its query instead. */
  record: { register: string; id?: string; query?: string };
  action: AccessAction;
  purpose?: string;
  result: 'allowed' | 'refused';
  /** Why it was refused, or the rule that allowed it. */
  rule?: string;
  /** Links the entry to an exchange transaction or a request. */
  correlation?: string;
  prev: string;
  hash: string;
}

interface AccessDb {
  entries: AccessEntry[];
  /** The hash the first kept entry chains from (after a retention sweep removed older ones), with what was removed. */
  base: { hash: string; removed: number; before?: string };
}

const GENESIS = '0'.repeat(64);
const g = globalThis as unknown as { __civicosAccessLog?: AccessDb };
const db = (): AccessDb => touch('__civicosAccessLog', g.__civicosAccessLog ??= { entries: [], base: { hash: GENESIS, removed: 0 } });
export function resetAccessLog(): void { g.__civicosAccessLog = undefined; }

const body = (e: Omit<AccessEntry, 'hash'>) => JSON.stringify([e.id, e.seq, e.at, e.by, e.record, e.action, e.purpose ?? null, e.result, e.rule ?? null, e.correlation ?? null, e.prev]);

/** Write one entry. */
export function recordAccess(input: Omit<AccessEntry, 'id' | 'seq' | 'at' | 'prev' | 'hash'>, now = new Date()): AccessEntry {
  const d = db();
  const last = d.entries[d.entries.length - 1];
  const e: Omit<AccessEntry, 'hash'> = {
    id: uuid7(), seq: (last?.seq ?? d.base.removed) + 1, at: now.toISOString(),
    by: { ...(input.by.id ? { id: input.by.id } : {}), name: input.by.name.slice(0, 200), ...(input.by.institution ? { institution: input.by.institution } : {}) },
    record: { register: input.record.register, ...(input.record.id ? { id: input.record.id } : {}), ...(input.record.query ? { query: input.record.query.slice(0, 200) } : {}) },
    action: input.action, ...(input.purpose ? { purpose: input.purpose.slice(0, 500) } : {}), result: input.result,
    ...(input.rule ? { rule: input.rule.slice(0, 300) } : {}), ...(input.correlation ? { correlation: input.correlation } : {}),
    prev: last?.hash ?? d.base.hash,
  };
  const entry = { ...e, hash: sha256Hex(body(e)) };
  d.entries.push(entry);
  return entry;
}

/** Recompute the chain: intact, or where it first breaks. */
export function verifyAccessLog(): { ok: boolean; entries: number; brokenAt?: number } {
  const d = db();
  let prev = d.base.hash;
  for (const e of d.entries) {
    const { hash, ...rest } = e;
    if (e.prev !== prev || sha256Hex(body(rest)) !== hash) return { ok: false, entries: d.entries.length, brokenAt: e.seq };
    prev = hash;
  }
  return { ok: true, entries: d.entries.length };
}

export interface AccessFilter { register?: string; recordId?: string; by?: string; institution?: string; action?: AccessAction; since?: string; limit?: number }

/** Entries, newest first, filtered. */
export function listAccess(f: AccessFilter = {}): AccessEntry[] {
  const limit = Math.min(Math.max(f.limit ?? 200, 1), 1000);
  const out: AccessEntry[] = [];
  for (let i = db().entries.length - 1; i >= 0 && out.length < limit; i--) {
    const e = db().entries[i]!;
    if (f.register && e.record.register !== f.register) continue;
    if (f.recordId && e.record.id !== f.recordId) continue;
    if (f.by && e.by.id !== f.by) continue;
    if (f.institution && e.by.institution !== f.institution) continue;
    if (f.action && e.action !== f.action) continue;
    if (f.since && e.at < f.since) continue;
    out.push(structuredClone(e));
  }
  return out;
}

/**
 * Patterns the data-protection authority looks at (design §4.3): an official
 * who opened many different records in a day, read outside working hours,
 * or was refused repeatedly. Counts only.
 */
export function unusualAccess(since: string, opts: { manyRecords?: number; refusals?: number; hours?: [number, number] } = {}): { official: string; name: string; reason: string; count: number }[] {
  const many = opts.manyRecords ?? 50, refusals = opts.refusals ?? 5, [from, to] = opts.hours ?? [6, 20];
  const by = new Map<string, { name: string; records: Set<string>; refused: number; offHours: number }>();
  for (const e of db().entries) {
    if (e.at < since) continue;
    const k = e.by.id ?? e.by.name;
    const x = by.get(k) ?? { name: e.by.name, records: new Set<string>(), refused: 0, offHours: 0 };
    if (e.record.id) x.records.add(`${e.record.register}/${e.record.id}`);
    if (e.result === 'refused') x.refused++;
    const h = new Date(e.at).getUTCHours();
    if (h < from || h >= to) x.offHours++;
    by.set(k, x);
  }
  const out: { official: string; name: string; reason: string; count: number }[] = [];
  for (const [k, x] of by) {
    if (x.records.size >= many) out.push({ official: k, name: x.name, reason: 'many different records', count: x.records.size });
    if (x.refused >= refusals) out.push({ official: k, name: x.name, reason: 'repeatedly refused', count: x.refused });
    if (x.offHours > 0) out.push({ official: k, name: x.name, reason: 'outside working hours', count: x.offHours });
  }
  return out;
}

/**
 * Remove entries older than the nation's retention period (called only by the
 * retention sweep, lib/data/retention.ts): the chain restarts from the hash
 * of the last removed entry, which is kept with how many were removed.
 */
export function pruneAccessLog(before: string): { removed: number } {
  const d = db();
  let n = 0;
  while (n < d.entries.length && d.entries[n]!.at < before) n++;
  if (!n) return { removed: 0 };
  const last = d.entries[n - 1]!;
  d.base = { hash: last.hash, removed: d.base.removed + n, before };
  d.entries.splice(0, n);
  return { removed: n };
}
