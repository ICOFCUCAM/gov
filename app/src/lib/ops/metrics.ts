// Platform metrics in the Prometheus text format (architecture review R12,
// finding O2), for the nation's own Prometheus or OpenTelemetry collector —
// the platform never pushes them anywhere. Cheap to scrape: no store is
// serialised; sizes are counted from top-level lists.
//
// What is measured: process memory and uptime; each durable store's record
// count; persistence (adapter, saves, last save, error); the audit chain
// (length, intact); twin sources (age of the last run, overdue against their
// schedule, last run status); the facility register; warnings and errors
// logged recently.

import { liveKeys, persistenceStatus } from '@/lib/data/persist';
import { listAudit, verifyAuditChain } from '@/lib/data/store';
import { listRuns, listSources } from '@/lib/twin/register';
import { facilityCounts } from '@/lib/data/facilities';
import { recentProblems } from '@/lib/ops/log';

type Sample = { labels?: Record<string, string>; value: number };
interface Family { name: string; help: string; type: 'gauge' | 'counter'; samples: Sample[] }

const esc = (v: string) => v.replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/"/g, '\\"');
const fmtLabels = (l?: Record<string, string>) => (l && Object.keys(l).length ? `{${Object.entries(l).map(([k, v]) => `${k}="${esc(v)}"`).join(',')}}` : '');

/** Render families in the Prometheus exposition format 0.0.4. */
export function render(families: Family[]): string {
  return families.map(f => [`# HELP ${f.name} ${f.help}`, `# TYPE ${f.name} ${f.type}`, ...f.samples.map(s => `${f.name}${fmtLabels(s.labels)} ${Number.isFinite(s.value) ? s.value : 0}`)].join('\n')).join('\n') + '\n';
}

/** Records in a store: the summed length of its top-level lists and maps. */
function records(store: unknown): number {
  if (!store || typeof store !== 'object') return 0;
  let n = 0;
  for (const v of Object.values(store as Record<string, unknown>)) {
    if (Array.isArray(v)) n += v.length;
    else if (v instanceof Map || v instanceof Set) n += v.size;
  }
  return n;
}

const PERIOD_S: Record<string, number> = { daily: 86_400, weekly: 7 * 86_400 };

/** Twin sources and those overdue against their schedule (not run within twice their period). */
export function twinFreshness(now = Date.now()): { sources: number; scheduled: number; overdue: string[] } {
  const sources = listSources();
  const scheduled = sources.filter(s => PERIOD_S[s.schedule]);
  return { sources: sources.length, scheduled: scheduled.length, overdue: scheduled.filter(s => !s.lastRun || now - Date.parse(s.lastRun) > 2 * PERIOD_S[s.schedule]! * 1000).map(s => s.id) };
}

/** Warnings and errors logged in the last hour. */
export function problemsLastHour(now = Date.now()): { warn: number; error: number } {
  const p = recentProblems(200).filter(e => now - Date.parse(e.ts) < 3_600_000);
  return { warn: p.filter(e => e.level === 'warn').length, error: p.filter(e => e.level === 'error').length };
}

export function collect(now = Date.now()): Family[] {
  const mem = process.memoryUsage();
  const persist = persistenceStatus();
  const chain = verifyAuditChain();
  const g = globalThis as unknown as Record<string, unknown>;
  const sources = listSources();
  const runs = listRuns();
  const lastRun = new Map<string, (typeof runs)[number]>();
  for (const r of runs) { const p = lastRun.get(r.sourceId); if (!p || p.at < r.at) lastRun.set(r.sourceId, r); }
  const fc = facilityCounts();
  const problems = recentProblems(200);
  const sinceHour = problems.filter(p => now - Date.parse(p.ts) < 3_600_000);
  return [
    { name: 'civicos_process_uptime_seconds', help: 'Seconds since the server started.', type: 'gauge', samples: [{ value: Math.round(process.uptime()) }] },
    { name: 'civicos_process_memory_bytes', help: 'Process memory by kind.', type: 'gauge', samples: [
      { labels: { kind: 'rss' }, value: mem.rss }, { labels: { kind: 'heap_used' }, value: mem.heapUsed }, { labels: { kind: 'heap_total' }, value: mem.heapTotal }, { labels: { kind: 'external' }, value: mem.external }] },
    { name: 'civicos_store_records', help: 'Records held by each durable store (summed top-level lists).', type: 'gauge',
      samples: liveKeys().map(k => ({ labels: { store: k.replace(/^__civicos/, '') || 'main' }, value: records(g[k]) })) },
    { name: 'civicos_persistence_saves_total', help: 'State saves since start.', type: 'counter', samples: [{ labels: { adapter: persist.adapter }, value: persist.saves }] },
    { name: 'civicos_persistence_last_save_age_seconds', help: 'Seconds since the state was last saved (-1: never).', type: 'gauge',
      samples: [{ labels: { adapter: persist.adapter }, value: persist.lastSaved ? Math.round((now - Date.parse(persist.lastSaved)) / 1000) : -1 }] },
    { name: 'civicos_persistence_error', help: '1 when the last save or restore failed.', type: 'gauge', samples: [{ labels: { adapter: persist.adapter }, value: persist.error ? 1 : 0 }] },
    { name: 'civicos_audit_entries', help: 'Entries in the platform audit chain.', type: 'gauge', samples: [{ value: listAudit().length }] },
    { name: 'civicos_audit_chain_intact', help: '1 when every entry of the audit chain verifies.', type: 'gauge', samples: [{ value: chain.ok ? 1 : 0 }] },
    { name: 'civicos_twin_sources', help: 'Registered twin sources.', type: 'gauge', samples: [{ value: sources.length }] },
    { name: 'civicos_twin_source_last_run_age_seconds', help: 'Seconds since each source last ran (-1: never).', type: 'gauge',
      samples: sources.map(s => ({ labels: { source: s.id, schedule: s.schedule }, value: s.lastRun ? Math.round((now - Date.parse(s.lastRun)) / 1000) : -1 })) },
    { name: 'civicos_twin_source_overdue', help: '1 when a scheduled source has not run within twice its period.', type: 'gauge',
      samples: sources.filter(s => PERIOD_S[s.schedule]).map(s => ({ labels: { source: s.id }, value: !s.lastRun || now - Date.parse(s.lastRun) > 2 * PERIOD_S[s.schedule]! * 1000 ? 1 : 0 })) },
    { name: 'civicos_twin_source_last_run_ok', help: '1 when the source\'s last run succeeded fully.', type: 'gauge',
      samples: sources.map(s => ({ labels: { source: s.id }, value: lastRun.get(s.id)?.status === 'ok' ? 1 : 0 })) },
    { name: 'civicos_facilities', help: 'Sites in the national facility register by state.', type: 'gauge', samples: [
      { labels: { state: 'total' }, value: fc.total }, { labels: { state: 'published' }, value: fc.published }, { labels: { state: 'certified' }, value: fc.certified }, { labels: { state: 'awaiting' }, value: fc.awaiting }] },
    { name: 'civicos_log_problems_last_hour', help: 'Warnings and errors logged in the last hour.', type: 'gauge', samples: [
      { labels: { level: 'warn' }, value: sinceHour.filter(p => p.level === 'warn').length }, { labels: { level: 'error' }, value: sinceHour.filter(p => p.level === 'error').length }] },
  ];
}
