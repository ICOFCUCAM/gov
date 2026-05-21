// lib/audit/replay — pure, browser-side chain & witness verifier.
//
// Takes an exported substrate dump (the JSON shape produced by
// /api/substrate/export) and walks every audit chain, recomputing
// each entry's FNV-1a digest and asserting both:
//   1. computed_hash === stored_hash
//   2. prev_hash === previous entry's stored_hash
//
// Then cross-checks every witness attestation against the live chain:
// for any (scope, observed_seq) pair, the attested hash must match the
// chain entry at that seq. Mismatches are tamper-after-the-fact alarms.
//
// No network calls. No WebCrypto. Anyone with a browser and a JSON dump
// can run the same verification an auditor runs offline.

export interface RawAuditEntry {
  seq: number;
  scope: string;
  actor: string;
  action: string;
  subject: string;
  detail: string;
  at?: string;
  at_ms?: number;
  prev_hash: string;
  hash: string;
}

export interface RawWitness {
  id: string;
  scope: string;
  observed_seq: number;
  observed_hash: string;
  witness_label: string;
  at?: string;
}

export interface ChainReplayResult {
  scope: string;
  entries: number;
  hashOk: boolean;
  chainOk: boolean;
  brokenAtSeq: number | null;
  reason: string | null;
}

export interface WitnessReplayResult {
  attestations: number;
  matched: number;
  divergent: { id: string; scope: string; observed_seq: number; observed_hash: string; live_hash: string | null; witness_label: string }[];
}

export interface ReplayReport {
  generated_at: string;
  scopes_checked: number;
  chains: ChainReplayResult[];
  witnesses: WitnessReplayResult;
  ok: boolean;
}

/** FNV-1a 32-bit digest. Identical to civicos.fnv1a_hex and the
 *  in-memory mirror in services/audit-ledger.ts. */
export function fnv1aHex(input: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = (h + ((h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24))) >>> 0;
  }
  return h.toString(16).padStart(8, '0');
}

/** Recompute the canonical hash for one entry. Mirrors the substrate's
 *  trigger that pre-computes hash on insert. */
export function recomputeEntryHash(e: RawAuditEntry, prevHash: string): string {
  return fnv1aHex(`${prevHash}|${e.seq}|${e.scope}|${e.actor}|${e.action}|${e.subject}|${e.detail}`);
}

/** Replay one scope's audit chain. */
export function replayScope(scope: string, entries: RawAuditEntry[]): ChainReplayResult {
  const sorted = [...entries].sort((a, b) => a.seq - b.seq);
  let prevHash = '00000000';
  for (const e of sorted) {
    const expected = recomputeEntryHash(e, prevHash);
    if (e.prev_hash !== prevHash) {
      return {
        scope, entries: sorted.length,
        hashOk: false, chainOk: false,
        brokenAtSeq: e.seq,
        reason: `prev_hash mismatch at seq ${e.seq}: expected ${prevHash}, got ${e.prev_hash}`,
      };
    }
    if (e.hash !== expected) {
      return {
        scope, entries: sorted.length,
        hashOk: false, chainOk: false,
        brokenAtSeq: e.seq,
        reason: `hash mismatch at seq ${e.seq}: expected ${expected}, got ${e.hash}`,
      };
    }
    prevHash = e.hash;
  }
  return {
    scope, entries: sorted.length,
    hashOk: true, chainOk: true,
    brokenAtSeq: null, reason: null,
  };
}

/** Cross-check every witness against the live chain it claims to have observed. */
export function replayWitnesses(
  witnesses: RawWitness[],
  entriesByScopeSeq: Map<string, string>, // "scope|seq" → live_hash
): WitnessReplayResult {
  const divergent: WitnessReplayResult['divergent'] = [];
  let matched = 0;
  for (const w of witnesses) {
    const key = `${w.scope}|${w.observed_seq}`;
    const liveHash = entriesByScopeSeq.get(key) ?? null;
    if (liveHash === null) {
      divergent.push({
        id: w.id, scope: w.scope, observed_seq: w.observed_seq,
        observed_hash: w.observed_hash, live_hash: null,
        witness_label: w.witness_label,
      });
      continue;
    }
    if (liveHash !== w.observed_hash) {
      divergent.push({
        id: w.id, scope: w.scope, observed_seq: w.observed_seq,
        observed_hash: w.observed_hash, live_hash: liveHash,
        witness_label: w.witness_label,
      });
      continue;
    }
    matched += 1;
  }
  return { attestations: witnesses.length, matched, divergent };
}

/** Full replay: takes the dump shape produced by /api/substrate/export. */
export function replayDump(input: unknown): ReplayReport | { error: string } {
  if (typeof input !== 'object' || input === null) {
    return { error: 'input is not an object' };
  }
  const d = input as Record<string, unknown>;
  const tables = d.tables as Record<string, { rows?: unknown[] } | undefined> | undefined;
  if (!tables) return { error: 'input.tables missing' };
  const entries = (tables.audit_entries?.rows ?? []) as RawAuditEntry[];
  const witnesses = (tables.audit_witnesses?.rows ?? []) as RawWitness[];

  // Group entries by scope.
  const byScope = new Map<string, RawAuditEntry[]>();
  for (const e of entries) {
    const list = byScope.get(e.scope) ?? [];
    list.push(e);
    byScope.set(e.scope, list);
  }
  const chains = Array.from(byScope.entries()).map(([scope, es]) => replayScope(scope, es));

  // Build the live-hash index per (scope, seq).
  const entriesByScopeSeq = new Map<string, string>();
  for (const e of entries) entriesByScopeSeq.set(`${e.scope}|${e.seq}`, e.hash);

  const witnessReport = replayWitnesses(witnesses, entriesByScopeSeq);

  const ok = chains.every(c => c.chainOk) && witnessReport.divergent.length === 0;

  return {
    generated_at: new Date().toISOString(),
    scopes_checked: chains.length,
    chains,
    witnesses: witnessReport,
    ok,
  };
}
