'use client';

import * as React from 'react';
import Link from 'next/link';
import { TONE, Panel } from '@/components/features/SituationRoom';
import { recentActorStepsRows, type ActorStepRow } from '@/lib/db/repos/work-items';
import { substrateAvailable } from '@/lib/db/client';
import type { WorkKind } from '@/lib/db/types';
import { useIdentity } from '@/components/identity/useIdentity';
import { useRealtimeRefresh } from '@/components/identity/useRealtimeRefresh';
import { getPref, getBoolPref, setPref } from '@/lib/prefs';
import { FilterChips } from '@/components/ui/FilterChips';
import { SubstrateNotConfigured } from '@/components/ui/SubstrateEmpty';

const KINDS: (WorkKind | 'all')[] = ['all','approval','case','procurement','encounter','bill','judicial','incident','permit','field','lab'];

const actionTone = (a: string) =>
  a === 'approve' || a === 'resolve' ? TONE.ok
  : a === 'reject' ? TONE.alert
  : a === 'escalate' ? TONE.warn
  : TONE.link;

/**
 * ActivityLog — every transition across every work item the current
 * session is entitled to see. The audit complement to the substrate's
 * audit chain: chain is "what was recorded with tamper-evidence", this
 * is "what happened to operational state".
 *
 * Two filter axes (kind, signed-only). Realtime via work_item_steps.
 * Each row links to the parent work item's detail page.
 */
export function ActivityLog() {
  const { actor, ready } = useIdentity();
  const [rows, setRows] = React.useState<ActorStepRow[]>([]);
  const [kindFilter, setKindFilter] = React.useState<WorkKind | 'all'>(() =>
    getPref<WorkKind | 'all'>('activity.kind', KINDS, 'all'));
  const [signedOnly, setSignedOnly] = React.useState<boolean>(() => getBoolPref('activity.signedOnly', false));
  const [scope, setScope] = React.useState<'all' | 'mine' | 'charter'>(() =>
    getPref<'all' | 'mine' | 'charter'>('activity.scope', ['all','mine','charter'] as const, 'all'));

  React.useEffect(() => {
    setPref('activity.kind', kindFilter);
    setPref('activity.signedOnly', signedOnly);
    setPref('activity.scope', scope);
  }, [kindFilter, signedOnly, scope]);
  const available = substrateAvailable();

  const refresh = React.useCallback(async () => {
    if (!available) return;
    const opts: Parameters<typeof recentActorStepsRows>[0] = { limit: 120, signedOnly };
    if (kindFilter !== 'all') opts.kind = kindFilter;
    if (scope === 'charter' && actor?.kind === 'officer' && actor.charterId) {
      opts.charter = actor.charterId;
    }
    let r = await recentActorStepsRows(opts);
    if (scope === 'mine' && actor) r = r.filter(s => s.actor_id === actor.id);
    setRows(r);
  }, [available, kindFilter, signedOnly, scope, actor]);

  React.useEffect(() => { if (ready) void refresh(); }, [ready, refresh]);

  useRealtimeRefresh(
    React.useMemo(() => [{ table: 'work_item_steps' as const }], []),
    refresh,
  );

  if (!available) {
    return <SubstrateNotConfigured title="Activity Log" />;
  }

  const signedCount = rows.filter(r => !!r.signature_hash).length;
  const ecdsaCount = rows.filter(r => r.signature_hash && r.signature_hash.length > 8).length;

  function downloadCsv() {
    const header = ['at','seq','action','from_stage','to_stage','actor_name','actor_role','actor_id','work_item_ref','work_item_scope','workflow_id','signature_alg','signature_hash'];
    const csv = [
      header.join(','),
      ...rows.map(r => [
        new Date(r.at).toISOString(), r.seq, r.action,
        r.from_stage ?? '', r.to_stage, r.actor_name, r.actor_role ?? '', r.actor_id ?? '',
        r.work_item_ref, r.work_item_scope, r.workflow_id,
        r.signature_hash ? (r.signature_hash.length === 8 ? 'fnv1a' : 'ecdsa-p256') : '',
        r.signature_hash ?? '',
      ].map(v => {
        const s = String(v);
        return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
      }).join(',')),
    ].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `civicos-activity-${new Date().toISOString().slice(0,10)}.csv`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div className="flex items-center gap-2">
          <h2 className="text-base font-semibold uppercase tracking-[0.16em] text-ink">Activity Log</h2>
          <span
            className="rounded-[3px] border px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-[0.16em]"
            style={{ borderColor: 'rgb(var(--c-line))', color: 'rgb(var(--c-ink-muted))' }}
          >
            transitions · realtime
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="font-mono text-[10px] text-ink-muted">
            {rows.length} steps · {signedCount} signed · {ecdsaCount} ECDSA
          </span>
          <button type="button"
            onClick={downloadCsv}
            disabled={rows.length === 0}
            className="focus-ring rounded-[3px] border border-line px-2 py-0.5 text-[9px] uppercase tracking-wider text-ink-muted hover:text-ink disabled:opacity-50">
            download csv
          </button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-[3px] border border-line bg-surface px-3 py-2">
          <div className="text-[8px] font-semibold uppercase tracking-[0.16em] text-ink-muted">Total</div>
          <div className="font-mono text-[15px] tabular-nums text-ink">{rows.length}</div>
        </div>
        <div className="rounded-[3px] border border-line bg-surface px-3 py-2">
          <div className="text-[8px] font-semibold uppercase tracking-[0.16em] text-ink-muted">Signed</div>
          <div className="font-mono text-[15px] tabular-nums" style={{ color: TONE.link }}>{signedCount}</div>
        </div>
        <div className="rounded-[3px] border border-line bg-surface px-3 py-2">
          <div className="text-[8px] font-semibold uppercase tracking-[0.16em] text-ink-muted">ECDSA</div>
          <div className="font-mono text-[15px] tabular-nums" style={{ color: TONE.ok }}>{ecdsaCount}</div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <FilterChips label="scope:" options={['all','mine','charter'] as const} value={scope} onChange={setScope} />
        <FilterChips label="kind:" options={KINDS} value={kindFilter} onChange={setKindFilter} />
        <label className="flex items-center gap-1 text-[9px] uppercase tracking-wider text-ink-muted">
          <input type="checkbox" checked={signedOnly} onChange={e => setSignedOnly(e.currentTarget.checked)} />
          signed only
        </label>
      </div>

      <Panel title="Transitions" meta={`${rows.length}`} bodyClass="!p-0">
        {rows.length === 0 ? (
          <p className="px-3 py-4 text-[11px] text-ink-muted">No transitions match.</p>
        ) : (
          <div className="max-h-[560px] overflow-y-auto">
            {rows.map(s => (
              <Link key={s.id} href={`/gov/items/${encodeURIComponent(s.work_item_ref)}`}
                className="block border-b border-line-soft px-3 py-1.5 last:border-0 text-[10px] hover:bg-surface-2">
                <div className="flex items-center gap-2">
                  <span className="w-16 shrink-0 font-mono tabular-nums text-ink-muted">
                    {new Date(s.at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </span>
                  <span className="w-10 shrink-0 font-mono tabular-nums text-ink-muted">#{s.seq}</span>
                  <span className="w-20 shrink-0 truncate font-mono" style={{ color: actionTone(s.action) }}>{s.action}</span>
                  <span className="min-w-0 flex-1 truncate text-ink">{s.work_item_title}</span>
                  <span className="w-32 shrink-0 truncate text-right font-mono text-link">{s.work_item_ref}</span>
                  <span className="w-32 shrink-0 truncate text-right text-ink-muted">{s.actor_name}</span>
                </div>
                <div className="mt-0.5 flex items-center gap-2 font-mono text-[9px] text-ink-muted">
                  <span>{s.from_stage ?? '—'} → {s.to_stage}</span>
                  <span>· {s.work_item_scope}</span>
                  {s.signature_hash ? (
                    <span className="ml-auto">
                      {s.signature_hash.length === 8 ? 'digest' : 'ECDSA'} · {s.signature_hash.slice(0, 16)}…
                    </span>
                  ) : null}
                </div>
              </Link>
            ))}
          </div>
        )}
      </Panel>
    </div>
  );
}
