'use client';

// Interior Procedural Execution — Sovereign Workflow Orchestration. The
// execution chain as runtime rails: Application → Municipal Review →
// Regional Validation → National Registry Commit → Judicial Exception
// Review → Ministry Synchronization → Citizen Notification → Archive &
// Audit. Stalled / rejected / redirected / appealed / judicial-hold /
// rollback states are visible, never silent.

import * as React from 'react';
import { proceduralLedger, proceduralBoard, type ProcStatus } from '@/lib/gov/procedural-execution';

const STATUS_CSS: Record<ProcStatus, string> = {
  running: 'rgb(var(--c-ok))', stalled: 'rgb(var(--c-warn))', rejected: 'rgb(var(--c-alert))',
  redirected: '#45c0c8', appealed: '#8a7df0', 'judicial-hold': '#5fb0ff',
  'rolled-back': '#e0673a', archived: 'rgb(var(--c-ink-muted))',
};

export function WorkflowOrchestration({ id, now }: { id: string; now: number }) {
  void id;
  const files = proceduralLedger(now);
  const b = proceduralBoard(now);
  return (
    <div className="space-y-2 font-mono">
      {/* Execution rails — left → right propagation */}
      <div className="grid grid-cols-4 gap-px border border-line bg-line lg:grid-cols-8">
        {b.stageCounts.map((s, i) => (
          <div key={s.stage.key} className="bg-black/40 px-2 py-1.5">
            <div className="text-[8px] tabular-nums text-ink-muted">{i + 1}·{s.stage.jurisdiction}</div>
            <div className="truncate text-[8.5px] uppercase tracking-[0.1em] text-ink-soft">{s.stage.label}</div>
            <div className="mt-0.5 text-[15px] font-semibold tabular-nums text-ink">{s.count}</div>
            <div className="mt-0.5 h-1 w-full bg-surface-2">
              <span className="block h-full" style={{ width: `${s.count ? Math.min(100, s.stalled / s.count * 100) : 0}%`, background: 'rgb(var(--c-warn))' }} />
            </div>
            <div className="text-[8px]" style={{ color: s.stalled ? 'rgb(var(--c-warn))' : 'rgb(var(--c-ok))' }}>{s.stalled} stalled</div>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-stretch divide-x divide-line border-y border-line bg-black/30">
        {(Object.keys(b.byStatus) as ProcStatus[]).map(s => (
          <div key={s} className="min-w-[96px] flex-1 px-2 py-1">
            <div className="text-[8px] uppercase tracking-[0.12em]" style={{ color: STATUS_CSS[s] }}>{s}</div>
            <div className="text-[14px] font-semibold tabular-nums text-ink">{b.byStatus[s]}</div>
          </div>
        ))}
      </div>

      <div className="border border-line">
        <div className="flex items-center gap-2 border-b border-line bg-black/30 px-2 py-1 text-[8px] font-semibold uppercase tracking-[0.16em] text-ink-muted">
          <span className="w-20 shrink-0">File</span>
          <span className="w-36 shrink-0">Office</span>
          <span className="w-40 shrink-0">Stage · jurisdiction</span>
          <span className="w-24 shrink-0">Status</span>
          <span className="w-24 shrink-0">Deadline</span>
          <span className="min-w-0 flex-1">Lineage</span>
        </div>
        <div className="max-h-[420px] overflow-y-auto">
          {files.slice(0, 70).map(f => (
            <div key={f.id} className="flex items-center gap-2 border-b border-line/50 px-2 py-1 text-[10px] last:border-0">
              <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${f.remainingHrs < 0 && f.status !== 'archived' ? 'animate-pulse' : ''}`} style={{ background: STATUS_CSS[f.status] }} aria-hidden />
              <span className="w-[68px] shrink-0 truncate tabular-nums text-ink-muted">{f.id}</span>
              <span className="w-36 shrink-0 truncate text-ink">{f.office}</span>
              <span className="w-40 shrink-0 truncate text-ink-soft">{f.stage.label} · {f.jurisdiction}</span>
              <span className="w-24 shrink-0 text-[9px] font-semibold uppercase tracking-[0.06em]" style={{ color: STATUS_CSS[f.status] }}>{f.status}</span>
              <span className="w-24 shrink-0 tabular-nums" style={{ color: f.remainingHrs < 0 ? 'rgb(var(--c-alert))' : f.remainingHrs < 24 ? 'rgb(var(--c-warn))' : 'rgb(var(--c-ok))' }}>
                {f.remainingHrs < 0 ? `+${-f.remainingHrs}h over` : `${f.remainingHrs}h left`}
              </span>
              <span className="min-w-0 flex-1 truncate text-ink-muted">{f.lineage.length} steps · {f.lineage.map(l => l.jurisdiction).join('→')}</span>
            </div>
          ))}
        </div>
      </div>
      <p className="text-[9px] text-ink-muted">
        Continuity mode: <span className="font-semibold text-ink">{b.continuity}</span> · recurring institutional bottleneck:
        <span className="font-semibold text-ink"> {b.recurringBottleneck}</span>. Every state transition is recorded — files cannot be silently suppressed.
      </p>
    </div>
  );
}
