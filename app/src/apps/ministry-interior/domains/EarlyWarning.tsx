'use client';

// Interior Temporal Intelligence — National Early-Warning System.
// Collapse signals detected on forward trajectories BEFORE failure:
// fracture points with ETA, severity and kind.

import * as React from 'react';
import { temporalBoard, type EarlyWarning as EW } from '@/lib/gov/temporal-intelligence';

const SEV: Record<EW['severity'], string> = {
  advisory: 'rgb(var(--c-warn))', elevated: '#e0673a', critical: 'rgb(var(--c-alert))',
};

export function EarlyWarning({ id, now }: { id: string; now: number }) {
  void id;
  const b = temporalBoard(now);
  const crit = b.warnings.filter(w => w.severity === 'critical').length;
  return (
    <div className="space-y-2 font-mono">
      <div className="flex flex-wrap items-stretch divide-x divide-line border-y border-line bg-black/30">
        <div className="min-w-[130px] flex-1 px-3 py-1.5"><div className="text-[8px] uppercase tracking-[0.16em] text-ink-muted">Active signals</div><div className="text-[17px] font-semibold tabular-nums text-ink">{b.warnings.length}</div></div>
        <div className="min-w-[130px] flex-1 px-3 py-1.5"><div className="text-[8px] uppercase tracking-[0.16em] text-ink-muted">Critical</div><div className="text-[17px] font-semibold tabular-nums" style={{ color: crit ? 'rgb(var(--c-alert))' : 'rgb(var(--c-ok))' }}>{crit}</div></div>
        <div className="min-w-[150px] flex-1 px-3 py-1.5"><div className="text-[8px] uppercase tracking-[0.16em] text-ink-muted">Temporal resilience</div><div className="text-[12px] font-semibold uppercase tracking-[0.1em] text-ink">{b.resilience}</div></div>
        <div className="min-w-[220px] flex-[2] px-3 py-1.5"><div className="text-[8px] uppercase tracking-[0.16em] text-ink-muted">Doctrine</div><div className="text-[10px] text-ink-soft">Identify failure before collapse occurs.</div></div>
      </div>

      <div className="border border-line">
        <div className="flex items-center gap-2 border-b border-line bg-black/30 px-2 py-1 text-[8px] font-semibold uppercase tracking-[0.16em] text-ink-muted">
          <span className="w-8 shrink-0">ETA</span>
          <span className="w-40 shrink-0">Agency</span>
          <span className="w-32 shrink-0">Signal</span>
          <span className="w-20 shrink-0">Severity</span>
          <span className="min-w-0 flex-1">Trajectory</span>
        </div>
        {b.warnings.length === 0 ? (
          <p className="px-2 py-2 text-[10px]" style={{ color: 'rgb(var(--c-ok))' }}>No collapse signals on the forecast horizon — system anticipated stable.</p>
        ) : b.warnings.map((w, i) => (
          <div key={i} className="flex items-center gap-2 border-b border-line/60 px-2 py-1 text-[10px] last:border-0">
            <span className={`w-8 shrink-0 tabular-nums font-semibold ${w.severity === 'critical' ? 'animate-pulse' : ''}`} style={{ color: SEV[w.severity] }}>{w.etaEpochs}</span>
            <span className="w-40 shrink-0 truncate text-ink">{w.label}</span>
            <span className="w-32 shrink-0 text-[9px] font-semibold uppercase tracking-[0.06em]" style={{ color: SEV[w.severity] }}>{w.kind}</span>
            <span className="w-20 shrink-0 text-[9px] uppercase tracking-[0.08em]" style={{ color: SEV[w.severity] }}>{w.severity}</span>
            <span className="min-w-0 flex-1 truncate text-ink-muted">{w.detail}</span>
          </div>
        ))}
      </div>
      <p className="text-[9px] text-ink-muted">
        Signals propagate to continuity governance with constitutional risk advisories. ETA is in operational epochs;
        critical signals pulse and pre-empt stabilization.
      </p>
    </div>
  );
}
