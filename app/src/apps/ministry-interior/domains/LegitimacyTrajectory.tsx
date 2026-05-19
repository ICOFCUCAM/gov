'use client';

// Interior Civic Legitimacy — National Legitimacy Trajectory. Long-term
// legitimacy forecast, lawful civic stabilization, the structural ethical
// guardrails and legitimacy memory.

import * as React from 'react';
import { civicBoard, ETHICAL_GUARDRAILS } from '@/lib/gov/civic-legitimacy';

function EraBar({ series }: { series: number[] }) {
  return (
    <span className="flex h-7 items-end gap-px">
      {series.map((v, i) => {
        const col = v >= 65 ? 'rgb(var(--c-ok))' : v >= 45 ? 'rgb(var(--c-warn))' : 'rgb(var(--c-alert))';
        return <span key={i} title={`era ${i}: ${v}`} style={{ height: `${Math.max(2, Math.round((v / 100) * 28))}px`, width: '12px', background: col, opacity: i === 0 ? 1 : 0.5 + i / (series.length * 2) }} />;
      })}
    </span>
  );
}

export function LegitimacyTrajectory({ id, now }: { id: string; now: number }) {
  void id;
  const b = civicBoard(now);
  const end = b.legitimacyTrajectory[b.legitimacyTrajectory.length - 1]!;
  return (
    <div className="space-y-2 font-mono">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-y px-3 py-2 text-[11px]"
        style={{ borderColor: `color-mix(in srgb,${end >= 60 ? 'rgb(var(--c-ok))' : 'rgb(var(--c-alert))'} 45%,transparent)`, background: 'rgba(0,0,0,0.3)' }}>
        <span className="text-[9px] uppercase tracking-[0.18em] text-ink-muted">Civic continuity mode</span>
        <span className="text-[14px] font-semibold uppercase tracking-[0.12em] text-ink">{b.mode}</span>
        <span className="ml-auto text-[9px] text-ink-muted">trust {b.trustIndex} · restoration {b.memory.restorationEffectivenessPct}%</span>
      </div>

      <div className="flex flex-wrap items-center gap-6 border border-line bg-black/20 px-3 py-2">
        <div>
          <div className="text-[8px] uppercase tracking-[0.16em] text-ink-muted">Legitimacy trajectory · generational eras (now → +decades)</div>
          <div className="mt-1"><EraBar series={b.legitimacyTrajectory} /></div>
          <div className="mt-0.5 flex gap-px text-[7px] text-ink-muted">{b.legitimacyTrajectory.map((v, i) => <span key={i} className="w-3 text-center tabular-nums">{v}</span>)}</div>
        </div>
        <div className="text-[10px] text-ink-muted">
          <div>now <span className="font-semibold text-ink tabular-nums">{b.legitimacyTrajectory[0]}</span> → horizon <span className="font-semibold tabular-nums" style={{ color: end >= 60 ? 'rgb(var(--c-ok))' : 'rgb(var(--c-alert))' }}>{end}</span></div>
          <div className="mt-0.5">trust-collapse eras <span className="font-semibold text-ink">{b.memory.trustCollapseEras.length}</span> · recovery cycles <span className="font-semibold text-ink">{b.memory.recoveryCycles}</span></div>
          <div className="mt-0.5">oversight failures <span className="font-semibold text-ink">{b.memory.oversightFailures}</span></div>
        </div>
      </div>

      <div>
        <div className="px-1 py-1 text-[9px] font-semibold uppercase tracking-[0.2em] text-ink-soft">▌Lawful civic stabilization — advisory</div>
        <div className="border border-line">
          {b.stabilization.length === 0 ? (
            <p className="px-2 py-2 text-[10px]" style={{ color: 'rgb(var(--c-ok))' }}>Legitimacy within constitutional tolerance — no civic stabilization required.</p>
          ) : b.stabilization.map((s, i) => (
            <div key={i} className="flex items-start gap-2 border-b border-line/60 px-2 py-1.5 text-[10px] last:border-0">
              <span className="mt-0.5 rounded-[2px] border border-line px-1 text-[8px] font-semibold uppercase tracking-[0.08em] text-ink-soft">{s.kind}</span>
              <span className="min-w-0 flex-1 text-ink">{s.detail}</span>
              <span className="shrink-0 text-[8px] uppercase tracking-[0.1em] text-ink-muted">advisory</span>
            </div>
          ))}
        </div>
      </div>

      <div className="border p-2" style={{ borderColor: 'color-mix(in srgb,rgb(var(--c-alert)) 30%,rgb(var(--c-line)))' }}>
        <div className="text-[9px] font-semibold uppercase tracking-[0.16em]" style={{ color: 'rgb(var(--c-alert))' }}>Structural ethical guardrails — prohibited & blocked</div>
        <div className="mt-1 flex flex-wrap gap-1">
          {ETHICAL_GUARDRAILS.prohibited.map(p => (
            <span key={p} className="border px-1 text-[8px] uppercase tracking-[0.06em]" style={{ borderColor: 'color-mix(in srgb,rgb(var(--c-alert)) 40%,transparent)', color: 'rgb(var(--c-alert))' }}>✗ {p}</span>
          ))}
        </div>
        <p className="mt-1 text-[9px] text-ink-muted">
          Scope: {ETHICAL_GUARDRAILS.scope} · per-citizen data: {String(ETHICAL_GUARDRAILS.perCitizenData)} ·
          politically neutral: {String(ETHICAL_GUARDRAILS.politicallyNeutral)}. The runtime preserves constitutional
          democratic continuity — it does not maximize institutional control.
        </p>
      </div>
    </div>
  );
}
