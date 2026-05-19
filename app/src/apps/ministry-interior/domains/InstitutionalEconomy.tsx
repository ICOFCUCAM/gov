'use client';

// Interior Institutional Economy — finite-capacity agency runtime. Every
// agency operates under capacity, staffing, fatigue and efficiency limits;
// utilisation includes inbound propagated pressure.

import * as React from 'react';
import { economyBoard, type OverloadState } from '@/lib/gov/institutional-economy';

const OVL: Record<OverloadState, string> = {
  nominal: 'rgb(var(--c-ok))', strained: 'rgb(var(--c-warn))',
  overloaded: '#e0673a', saturated: 'rgb(var(--c-alert))',
};

export function InstitutionalEconomy({ id, now }: { id: string; now: number }) {
  void id;
  const b = economyBoard(now);
  return (
    <div className="space-y-2 font-mono">
      <div className="flex flex-wrap items-stretch divide-x divide-line border-y border-line bg-black/30">
        <div className="min-w-[120px] flex-1 px-3 py-1.5"><div className="text-[8px] uppercase tracking-[0.16em] text-ink-muted">Mean utilisation</div><div className="text-[17px] font-semibold tabular-nums" style={{ color: b.meanUtil >= 100 ? 'rgb(var(--c-alert))' : b.meanUtil >= 85 ? 'rgb(var(--c-warn))' : 'rgb(var(--c-ok))' }}>{b.meanUtil}%</div></div>
        <div className="min-w-[120px] flex-1 px-3 py-1.5"><div className="text-[8px] uppercase tracking-[0.16em] text-ink-muted">Mean fatigue</div><div className="text-[17px] font-semibold tabular-nums" style={{ color: b.meanFatigue >= 62 ? 'rgb(var(--c-alert))' : 'rgb(var(--c-warn))' }}>{b.meanFatigue}</div></div>
        <div className="min-w-[120px] flex-1 px-3 py-1.5"><div className="text-[8px] uppercase tracking-[0.16em] text-ink-muted">Overloaded</div><div className="text-[17px] font-semibold tabular-nums" style={{ color: b.overloadedCount ? 'rgb(var(--c-alert))' : 'rgb(var(--c-ok))' }}>{b.overloadedCount}</div></div>
        <div className="min-w-[220px] flex-[2] px-3 py-1.5"><div className="text-[8px] uppercase tracking-[0.16em] text-ink-muted">Resilience</div><div className="text-[12px] font-semibold uppercase tracking-[0.12em] text-ink">{b.resilience}</div></div>
      </div>

      <div className="border border-line">
        <div className="flex items-center gap-2 border-b border-line bg-black/30 px-2 py-1 text-[8px] font-semibold uppercase tracking-[0.16em] text-ink-muted">
          <span className="w-36 shrink-0">Agency</span>
          <span className="w-44 shrink-0">Utilisation (load/cap +inbound)</span>
          <span className="w-20 shrink-0">State</span>
          <span className="w-16 shrink-0">Eff</span>
          <span className="w-16 shrink-0">Fatigue</span>
          <span className="min-w-0 flex-1">Staffing (present/estab · short · OT)</span>
        </div>
        {b.agencies.map(a => (
          <div key={a.agency} className="flex items-center gap-2 border-b border-line/60 px-2 py-1 text-[10px] last:border-0">
            <span className="w-36 shrink-0 truncate text-ink">{a.label}</span>
            <span className="flex w-44 shrink-0 items-center gap-1">
              <span className="relative h-2 w-28 bg-surface-2">
                <span className="absolute inset-y-0 left-0" style={{ width: `${Math.min(100, a.utilPct)}%`, background: OVL[a.overload] }} />
                {a.inboundPressure > 0 ? <span className="absolute inset-y-0" style={{ left: `${Math.min(100, a.baseUtilPct)}%`, width: `${Math.min(100 - Math.min(100, a.baseUtilPct), a.inboundPressure)}%`, background: '#5fb0ff', opacity: 0.7 }} /> : null}
              </span>
              <span className="tabular-nums" style={{ color: OVL[a.overload] }}>{a.utilPct}%</span>
            </span>
            <span className="w-20 shrink-0 text-[9px] font-semibold uppercase tracking-[0.06em]" style={{ color: OVL[a.overload] }}>{a.overload}</span>
            <span className="w-16 shrink-0 tabular-nums" style={{ color: a.efficiencyPct < 50 ? 'rgb(var(--c-alert))' : 'rgb(var(--c-ok))' }}>{a.efficiencyPct}%</span>
            <span className="w-16 shrink-0 tabular-nums" style={{ color: a.fatiguePct >= 62 ? 'rgb(var(--c-alert))' : a.fatiguePct >= 45 ? 'rgb(var(--c-warn))' : 'rgb(var(--c-ok))' }}>{a.fatiguePct}</span>
            <span className="min-w-0 flex-1 truncate text-ink-muted">{a.staffing.present}/{a.staffing.established} · short {a.staffing.shortagePct}% · OT {a.staffing.overtimePct}% · backlog {a.queue.backlog}{a.queue.collapseEtaEpochs != null ? ` · collapse ETA ${a.queue.collapseEtaEpochs}` : ''}</span>
          </div>
        ))}
      </div>
      <p className="text-[9px] text-ink-muted">
        Blue segment = inbound propagated pressure from the national mesh. Institutions are finite — overload degrades
        efficiency, accumulates fatigue and creates corruption opportunity.
      </p>
    </div>
  );
}
