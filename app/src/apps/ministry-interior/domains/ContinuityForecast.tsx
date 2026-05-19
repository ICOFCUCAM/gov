'use client';

// Interior Temporal Intelligence — Continuity Forecasting & Anticipatory
// Orchestration. Forecast degradation / regional collapse / staffing
// failure / emergency escalation, with pre-emptive (advisory) actions.

import * as React from 'react';
import { temporalBoard } from '@/lib/gov/temporal-intelligence';

function Gauge({ label, pct }: { label: string; pct: number }) {
  const col = pct >= 66 ? 'rgb(var(--c-alert))' : pct >= 40 ? 'rgb(var(--c-warn))' : 'rgb(var(--c-ok))';
  return (
    <div className="min-w-[150px] flex-1 px-3 py-1.5">
      <div className="text-[8px] uppercase tracking-[0.16em] text-ink-muted">{label}</div>
      <div className="mt-0.5 flex items-center gap-2">
        <div className="relative h-2 flex-1 bg-surface-2">
          <span className="absolute inset-y-0 left-0" style={{ width: `${pct}%`, background: col }} />
        </div>
        <span className="text-[14px] font-semibold tabular-nums" style={{ color: col }}>{pct}%</span>
      </div>
    </div>
  );
}

export function ContinuityForecast({ id, now }: { id: string; now: number }) {
  void id;
  const b = temporalBoard(now);
  const c = b.continuity;
  return (
    <div className="space-y-2 font-mono">
      <div className="flex flex-wrap items-center gap-x-4 border-y border-line bg-black/30 px-3 py-2 text-[11px]">
        <span className="text-[9px] uppercase tracking-[0.18em] text-ink-muted">Temporal resilience</span>
        <span className="text-[14px] font-semibold uppercase tracking-[0.12em] text-ink">{b.resilience}</span>
        <span className="ml-auto text-[9px] text-ink-muted">recovery effectiveness {b.memory.recoveryEffectivenessPct}%</span>
      </div>

      <div className="flex flex-wrap items-stretch divide-x divide-line border border-line bg-black/20">
        <Gauge label="Ministry degradation" pct={c.degradationProbPct} />
        <Gauge label="Regional collapse" pct={c.regionalCollapseProbPct} />
        <Gauge label="Staffing failure" pct={c.staffingFailureProbPct} />
        <Gauge label="Emergency escalation" pct={c.emergencyEscalationProbPct} />
      </div>

      <div>
        <div className="px-1 py-1 text-[9px] font-semibold uppercase tracking-[0.2em] text-ink-soft">▌Anticipatory orchestration — pre-emptive (advisory)</div>
        <div className="border border-line">
          {c.preemptiveActions.length === 0 ? (
            <p className="px-2 py-2 text-[10px]" style={{ color: 'rgb(var(--c-ok))' }}>No pre-emptive action required — forecast within continuity tolerance.</p>
          ) : c.preemptiveActions.map((a, i) => (
            <div key={i} className="flex items-start gap-2 border-b border-line/60 px-2 py-1.5 text-[10px] last:border-0">
              <span className="mt-0.5 rounded-[2px] border border-line px-1 text-[8px] font-semibold uppercase tracking-[0.08em] text-ink-soft">{a.kind}</span>
              <span className="min-w-0 flex-1 text-ink">{a.detail}</span>
              <span className="shrink-0 text-[8px] uppercase tracking-[0.1em] text-ink-muted">advisory</span>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-2 lg:grid-cols-3">
        <div className="border border-line p-2">
          <div className="text-[9px] font-semibold uppercase tracking-[0.16em] text-ink-soft">Recurring seasons</div>
          {b.memory.recurringSeasons.map(s => <div key={s} className="mt-0.5 text-[10px] text-ink">{s}</div>)}
        </div>
        <div className="border border-line p-2">
          <div className="text-[9px] font-semibold uppercase tracking-[0.16em] text-ink-soft">Annual collapse cycle</div>
          <div className="mt-0.5 text-[10px]" style={{ color: 'rgb(var(--c-warn))' }}>{b.memory.annualCollapseCycle}</div>
        </div>
        <div className="border border-line p-2">
          <div className="text-[9px] font-semibold uppercase tracking-[0.16em] text-ink-soft">Chronic instability regions</div>
          {b.memory.chronicInstabilityRegions.length === 0 ? <div className="mt-0.5 text-[10px]" style={{ color: 'rgb(var(--c-ok))' }}>none</div>
            : b.memory.chronicInstabilityRegions.map(r => <div key={r} className="mt-0.5 text-[10px]" style={{ color: 'rgb(var(--c-alert))' }}>{r}</div>)}
        </div>
      </div>
      <p className="text-[9px] text-ink-muted">
        Predictive stabilization: reinforce weak regions, pre-position reserves and reroute workflows BEFORE collapse.
        AI is advisory, auditable and constitutionally bounded — humans authorize.
      </p>
    </div>
  );
}
