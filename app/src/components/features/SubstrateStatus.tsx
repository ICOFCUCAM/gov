'use client';

import * as React from 'react';
import { TONE, Panel } from '@/components/features/SituationRoom';
import { substrateAvailable, publicClient } from '@/lib/db/client';
import { useIdentity } from '@/components/identity/useIdentity';
import { useRealtimeRefresh } from '@/components/identity/useRealtimeRefresh';
import { distinctAuditScopesRows, verifyChainRow } from '@/lib/db/repos/audit';
import { SubstrateNotConfigured } from '@/components/ui/SubstrateEmpty';
import { buildCsv, downloadCsv, downloadJson } from '@/lib/csv-download';
import { SurfaceHeading } from '@/components/ui/SurfaceHeading';

interface TableCount { table: string; count: number; via: string }

const COUNTABLE_VIEWS = [
  'civicos_institutions', 'civicos_officers', 'civicos_citizens',
  'civicos_facilities', 'civicos_workflow_definitions',
  'civicos_work_items', 'civicos_work_item_steps',
  'civicos_federation_events', 'civicos_audit_entries',
  'civicos_directives', 'civicos_dispatches', 'civicos_escalations',
  'civicos_posture_history',
  'civicos_telemetry_streams', 'civicos_telemetry_samples',
  'civicos_service_requests', 'civicos_consents', 'civicos_appeals',
] as const;

/**
 * SubstrateStatus — the data plane reflected on itself.
 *
 * Row counts across every persistent view (RLS-scoped, so the counts
 * shift with identity), audit chain integrity sampled across the visible
 * scopes, and a session badge confirming which identity is reading.
 *
 * Realtime refreshes the counts on any change to the watched tables;
 * the chain-integrity sweep is on-demand because verify_audit_chain is
 * O(chain length) per call.
 */
export function SubstrateStatus() {
  const { actor, session, ready } = useIdentity();
  const [counts, setCounts] = React.useState<TableCount[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [refreshedAt, setRefreshedAt] = React.useState<number | null>(null);
  const [chainResults, setChainResults] = React.useState<{ scope: string; entries: number; intact: boolean }[]>([]);
  const [verifying, setVerifying] = React.useState(false);
  const available = substrateAvailable();

  const refreshCounts = React.useCallback(async () => {
    if (!available) return;
    const sb = publicClient()!;
    setLoading(true);
    try {
      const next: TableCount[] = [];
      // Use PostgREST head requests with count=exact to get visible-row
      // counts under the current session's RLS. Cheap, parallel.
      await Promise.all(
        COUNTABLE_VIEWS.map(async v => {
          const { count, error } = await sb.from(v).select('id', { head: true, count: 'exact' });
          next.push({ table: v.replace('civicos_', ''), count: error ? -1 : (count ?? 0), via: v });
        }),
      );
      next.sort((a, b) => a.table.localeCompare(b.table));
      setCounts(next);
      setRefreshedAt(Date.now());
    } finally {
      setLoading(false);
    }
  }, [available]);

  React.useEffect(() => { if (ready) void refreshCounts(); }, [ready, actor?.id, session?.user.id, refreshCounts]);

  useRealtimeRefresh(
    React.useMemo(() => [
      { table: 'work_items' as const },
      { table: 'work_item_steps' as const },
      { table: 'federation_events' as const },
      { table: 'audit_entries' as const },
      { table: 'directives' as const },
      { table: 'dispatches' as const },
      { table: 'escalations' as const },
      { table: 'posture_history' as const },
      { table: 'telemetry_streams' as const },
      { table: 'telemetry_samples' as const },
    ], []),
    refreshCounts,
  );

  // ── Daily digest export ─────────────────────────────────────────────
  // Builds a JSON snapshot of what THIS session can see right now:
  // scope label, per-view row counts, chain integrity sweep results,
  // and a timestamp. Useful as a compliance handover artefact — an
  // auditor can save it offline and compare across days.
  const downloadDigest = React.useCallback(() => {
    downloadJson('civicos-substrate-digest', {
      generated_at: new Date().toISOString(),
      scope: scopeLabel,
      session: session
        ? { user_id: session.user.id, email: session.user.email ?? null }
        : null,
      actor: actor
        ? { kind: actor.kind, id: actor.id, name: actor.name,
            role: actor.role, charter_id: actor.charterId }
        : null,
      counts: Object.fromEntries(counts.map(c => [c.table, c.count])),
      totals: {
        tables_visible: counts.filter(c => c.count > 0).length,
        total_rows: counts.reduce((s, c) => s + (c.count > 0 ? c.count : 0), 0),
      },
      chains: chainResults.length === 0 ? null : {
        scopes_checked: chainResults.length,
        all_intact: chainResults.every(r => r.intact),
        results: chainResults,
      },
      substrate_url: process.env.NEXT_PUBLIC_SUPABASE_URL ?? null,
    });
  }, [actor, session, counts, chainResults]);

  const sweepChain = React.useCallback(async () => {
    setVerifying(true);
    try {
      const scopes = await distinctAuditScopesRows(15);
      const results = await Promise.all(scopes.map(async s => {
        const r = await verifyChainRow(s);
        return { scope: s, entries: r?.entries ?? 0, intact: r?.intact ?? false };
      }));
      setChainResults(results);
    } finally {
      setVerifying(false);
    }
  }, []);

  if (!available) {
    return <SubstrateNotConfigured title="Substrate Status" />;
  }

  const scopeLabel = !ready ? 'resolving…'
    : !session ? 'anonymous (counts are public-only)'
    : !actor ? `${session.user.email} · unlinked`
    : actor.kind === 'officer'
      ? ['platform-admin','noc-officer','cabinet-officer','auditor'].includes(actor.role ?? '')
        ? `${actor.name} · ${actor.role} · platform-tier (cross-charter)`
        : `${actor.name} · ${actor.role} · ${actor.charterId ?? '—'}`
      : `${actor.name} · citizen`;

  const total = counts.reduce((s, c) => s + (c.count > 0 ? c.count : 0), 0);
  const visibleTables = counts.filter(c => c.count > 0).length;
  const intactChains = chainResults.filter(r => r.intact).length;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <SurfaceHeading title="Substrate Status" badge="self-portrait · RLS-scoped" />
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={downloadDigest}
            className="focus-ring rounded-[3px] border border-line px-2 py-0.5 text-[9px] uppercase tracking-wider text-ink-muted hover:text-ink"
          >
            download digest
          </button>
          <button
            type="button"
            onClick={() => {
              const csv = buildCsv(['table','count'], counts.map(c => [c.table, c.count]));
              downloadCsv('civicos-counts', csv);
            }}
            className="focus-ring rounded-[3px] border border-line px-2 py-0.5 text-[9px] uppercase tracking-wider text-ink-muted hover:text-ink"
          >
            counts csv
          </button>
        <button
          type="button"
          onClick={() => { void refreshCounts(); }}
          disabled={loading}
          className="focus-ring rounded-[3px] border border-line px-2 py-0.5 text-[9px] uppercase tracking-wider text-ink-muted hover:text-ink disabled:opacity-50"
        >
          {loading ? 'sweeping…' : 'refresh counts'}
        </button>
        </div>
      </div>

      <p className="font-mono text-[10px] text-ink-muted">
        scope: {scopeLabel}
        {refreshedAt ? (
          <>
            {' · refreshed '}
            {new Date(refreshedAt).toLocaleTimeString()}
            {Date.now() - refreshedAt > 60_000 ? <span className="ml-1 text-[9px]" style={{ color: TONE.warn }}>· stale</span> : null}
          </>
        ) : null}
      </p>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Tile label="Tables visible" value={String(visibleTables)} />
        <Tile label="Total rows" value={total.toLocaleString()} />
        <Tile label="Chains verified" value={chainResults.length === 0 ? '—' : `${intactChains}/${chainResults.length}`} />
        <Tile label="Substrate" value={available ? 'connected' : 'offline'} tone={available ? TONE.ok : TONE.alert} />
      </div>

      <Panel title="Row counts (visible to this session)" meta={`${counts.length} views`} bodyClass="!p-0">
        <div className="grid grid-cols-1 gap-px bg-line sm:grid-cols-2 lg:grid-cols-3">
          {counts.map(c => (
            <div key={c.table} className="bg-surface px-3 py-1.5 text-[10px]">
              <div className="flex items-center justify-between gap-2">
                <span className="truncate font-mono text-ink">{c.table}</span>
                <span
                  className="font-mono tabular-nums"
                  style={{ color: c.count < 0 ? TONE.alert : c.count === 0 ? TONE.neutral : TONE.link }}
                >
                  {c.count < 0 ? 'err' : c.count.toLocaleString()}
                </span>
              </div>
            </div>
          ))}
        </div>
      </Panel>

      <div className="flex items-center justify-between gap-2">
        <h3 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-ink">Audit chain integrity</h3>
        <button
          type="button"
          onClick={() => { void sweepChain(); }}
          disabled={verifying}
          className="focus-ring rounded-[3px] border border-line px-2 py-0.5 text-[9px] uppercase tracking-wider text-ink-muted hover:text-ink disabled:opacity-50"
        >
          {verifying ? 'verifying…' : 'sweep top 15 scopes'}
        </button>
      </div>

      <Panel title="Chain verification" meta={chainResults.length === 0 ? 'idle' : `${chainResults.length} scopes`} bodyClass="!p-0">
        {chainResults.length === 0 ? (
          <p className="px-3 py-4 text-[11px] text-ink-muted">
            Click <span className="font-mono">sweep top 15 scopes</span> to walk each
            audit chain server-side. Every entry's prev_hash → hash relationship is
            checked against the DB's deterministic re-derivation.
          </p>
        ) : (
          <div className="max-h-[320px] overflow-y-auto">
            {chainResults.map(r => (
              <div key={r.scope} className="flex items-center gap-2 border-b border-line-soft px-3 py-1 last:border-0 text-[10px]">
                <span className="min-w-0 flex-1 truncate font-mono text-link">{r.scope}</span>
                <span className="w-16 shrink-0 text-right font-mono tabular-nums text-ink">{r.entries}</span>
                <span
                  className="w-16 shrink-0 text-right text-[8.5px] font-bold uppercase tracking-wider"
                  style={{ color: r.intact ? TONE.ok : TONE.alert }}
                >
                  {r.intact ? 'intact' : 'broken'}
                </span>
              </div>
            ))}
          </div>
        )}
      </Panel>

      <p className="text-[10px] text-ink-muted">
        Counts come from <span className="font-mono">head=true, count=exact</span>
        requests against each public civicos view; RLS shapes what's counted, so the
        numbers shift when you sign in or sign out. Chain verification calls
        <span className="font-mono"> civicos_verify_audit_chain</span> server-side
        — the database walks the chain, not the client.
      </p>
    </div>
  );
}

function Tile({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div
      className="rounded-[3px] border border-line bg-surface px-3 py-2"
      style={{ boxShadow: 'inset 0 1px 0 rgba(55,199,212,0.06)' }}
    >
      <div className="truncate text-[8px] font-semibold uppercase tracking-[0.16em] text-ink-muted">{label}</div>
      <div className="font-mono text-[15px] tabular-nums" style={{ color: tone ?? 'rgb(var(--c-ink))' }}>
        {value}
      </div>
    </div>
  );
}
