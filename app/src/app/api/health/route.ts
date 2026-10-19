// /api/health — diagnostic ping with a substrate reachability probe.
// Public (no auth) — returns minimal information so it's safe to expose
// to monitoring systems. Reports: ok flag, substrate-configured flag,
// substrate-reachable flag (via a cheap count on a public view), and where
// the platform keeps its state (lib/data/persist.ts): mode, last save, this
// server's role as state writer, who holds the writer's lease, and any error.
//
// Probes (Helm chart): `?live` answers at once without asking the substrate
// (liveness); `?ready` answers 503 while this server cannot take changes
// (a standby without the writer's lease, a writer that stopped saving, or a
// failed restore), so no traffic reaches it (readiness). Without either, the
// answer is always 200, as before.
//
// Also (counts only, nothing personal): the platform audit chain (entries,
// intact), twin sources overdue against their schedule, warnings and errors
// logged in the last hour, whether traces go to the nation's collector, and an overall status: ok, degraded (something
// needs attention but changes are safe) or down (changes are not safe).
//
// With CIVICOS_STATE=postgres, `persistence.database` reports the per-record
// tables (lib/data/repo/postgres.ts): the adapter, PostGIS, the write queue's
// depth, how far behind other instances' changes this one is (outbox lag) and
// any write error, and the per-record documents every other store is kept as
// (stores, records, merges). A standby there still serves reads and record
// changes (every change, once every store is in the tables: a follower), so
// it reports ready while its tables are healthy.

import { NextResponse } from 'next/server';
import { publicClient } from '@/lib/db/client';
import { persistenceStatus, stateWritable } from '@/lib/data/persist';
import { listAudit, verifyAuditChain } from '@/lib/data/store';
import { problemsLastHour, twinFreshness } from '@/lib/ops/metrics';
import { tracingStatus } from '@/lib/ops/otel';
import { keyCustodyStatus } from '@/lib/keys/custody';

export const dynamic = 'force-dynamic';

function persistence() {
  const s = persistenceStatus();
  return {
    mode: s.adapter,
    role: s.role ?? 'writer',
    fencing: s.fencing ?? 'none',
    writable: stateWritable(),
    startedAt: s.startedAt,
    lastSaved: s.lastSaved ?? null,
    saves: s.saves,
    restoredStores: s.restored.length,
    writer: s.writer ?? null,
    leaseHolder: s.lease?.holder ?? null,
    leaseExpiresAt: s.lease?.expiresAt ?? null,
    error: s.error ?? null,
    note: s.note ?? null,
    database: s.records ? {
      adapter: s.records.adapter,
      postgis: s.records.postgis,
      queueDepth: s.records.queueDepth,
      lagMs: s.records.lagMs,
      lastFlushAt: s.records.lastFlushAt ?? null,
      lastPullAt: s.records.lastPullAt ?? null,
      followed: s.records.followed,
      rebased: s.records.rebased,
      error: s.records.error ?? null,
      // Every other store as per-record documents (counts only).
      documents: s.records.documents ? {
        stores: s.records.documents.stores,
        rows: s.records.documents.rows,
        written: s.records.documents.written,
        followed: s.records.documents.followed,
        merged: s.records.documents.merged,
        conflicts: s.records.documents.conflicts,
        counterOverruns: s.records.documents.counterOverruns,
      } : null,
    } : null,
  };
}

export async function GET(req: Request) {
  const q = new URL(req.url).searchParams;
  if (q.has('live')) return NextResponse.json({ ok: true, at: new Date().toISOString() });
  const sb = publicClient();
  const configured = sb != null;
  let reachable = false;
  let latency_ms: number | null = null;
  if (sb) {
    const start = Date.now();
    try {
      // Reachability probe on one of the substrate's own, publicly readable tables (not a mirror of a platform register, review D8).
      const { error } = await sb.from('civicos_facilities').select('id', { head: true, count: 'exact' }).limit(1);
      reachable = !error;
    } catch { reachable = false; }
    latency_ms = Date.now() - start;
  }
  const p = persistence();
  const chain = verifyAuditChain();
  const twin = twinFreshness();
  const problems = problemsLastHour();
  const keys = keyCustodyStatus();
  // A standby in postgres mode serves reads and record changes while its tables are healthy.
  const serving = p.writable || (p.database !== null && p.role === 'standby' && !p.database.error);
  const down = !serving || !chain.ok || (p.error ?? '').startsWith('restore failed');
  const degraded = !!p.error || !keys.ready || !!p.database?.error || (p.database?.queueDepth ?? 0) > 1000 || twin.overdue.length > 0 || problems.error > 0 || (configured && !reachable);
  const body = {
    ok: configured && reachable,
    status: down ? 'down' : degraded ? 'degraded' : 'ok',
    at: new Date().toISOString(),
    substrate: { configured, reachable, latency_ms },
    persistence: p,
    audit: { entries: listAudit().length, intact: chain.ok, ...(chain.brokenAtSeq != null ? { brokenAtSeq: chain.brokenAtSeq } : {}) },
    twin: { sources: twin.sources, scheduled: twin.scheduled, overdue: twin.overdue.length },
    problems,
    // Whether spans go to the nation's own collector (CIVICOS_OTEL_ENDPOINT); the address is not shown.
    tracing: { enabled: tracingStatus().enabled },
    // Where the signing and data keys are held, and whether the provider is ready (no key ids, no address).
    keys: { provider: keys.provider, ready: keys.ready },
  };
  if (q.has('ready')) {
    const ready = serving && !(p.error ?? '').startsWith('restore failed');
    return NextResponse.json({ ...body, ready }, { status: ready ? 200 : 503 });
  }
  return NextResponse.json(body);
}

export const POST = GET;
