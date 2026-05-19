'use client';

// Interior Institutional Economy — National Resilience & Stabilization.
// The ministry behaves like national infrastructure protecting itself:
// resilience mode governs behaviour; sovereign resource orchestration
// recommends (advisory) staffing, rerouting and continuity reserves.

import * as React from 'react';
import { economyBoard, type ResilienceMode } from '@/lib/gov/institutional-economy';

const MODE_CSS: Record<ResilienceMode, string> = {
  nominal: 'rgb(var(--c-ok))', strained: 'rgb(var(--c-warn))', overloaded: '#e0673a',
  'degraded-sync': '#8a7df0', 'regional-emergency': 'rgb(var(--c-alert))',
  'national-emergency': 'rgb(var(--c-alert))', 'constitutional-continuity': 'rgb(var(--c-alert))',
  recovery: '#5fb0ff',
};

export function ResilienceContinuity({ id, now }: { id: string; now: number }) {
  void id;
  const b = economyBoard(now);
  return (
    <div className="space-y-2 font-mono">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-y px-3 py-2 text-[11px]"
        style={{ borderColor: `color-mix(in srgb,${MODE_CSS[b.resilience]} 45%,transparent)`, background: 'rgba(0,0,0,0.3)' }}>
        <span className="text-[9px] uppercase tracking-[0.18em] text-ink-muted">National resilience mode</span>
        <span className="text-[14px] font-semibold uppercase tracking-[0.14em]" style={{ color: MODE_CSS[b.resilience] }}>{b.resilience}</span>
        <span className="ml-auto text-[9px] text-ink-muted">util {b.meanUtil}% · fatigue {b.meanFatigue} · overloaded {b.overloadedCount} · suspicious {b.suspiciousCount}</span>
      </div>

      <div>
        <div className="px-1 py-1 text-[9px] font-semibold uppercase tracking-[0.2em] text-ink-soft">▌Sovereign resource orchestration — advisory recommendations</div>
        <div className="border border-line">
          {b.stabilization.length === 0 ? (
            <p className="px-2 py-2 text-[10px]" style={{ color: 'rgb(var(--c-ok))' }}>System within capacity — no stabilization required this epoch.</p>
          ) : b.stabilization.map((s, i) => (
            <div key={i} className="flex items-start gap-2 border-b border-line/60 px-2 py-1.5 text-[10px] last:border-0">
              <span className="mt-0.5 rounded-[2px] border border-line px-1 text-[8px] font-semibold uppercase tracking-[0.08em] text-ink-soft">{s.kind}</span>
              <span className="min-w-0 flex-1 text-ink">{s.detail}</span>
              <span className="shrink-0 text-[8px] uppercase tracking-[0.1em] text-ink-muted">advisory</span>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-2 lg:grid-cols-3">
        <div className="border border-line p-2">
          <div className="text-[9px] font-semibold uppercase tracking-[0.16em] text-ink-soft">Chronic overload</div>
          {b.memory.chronicOverload.map(x => <div key={x} className="mt-0.5 text-[10px] text-ink">{x}</div>)}
        </div>
        <div className="border border-line p-2">
          <div className="text-[9px] font-semibold uppercase tracking-[0.16em] text-ink-soft">Chronic corruption zones</div>
          {b.memory.chronicCorruptionZones.length === 0 ? <div className="mt-0.5 text-[10px]" style={{ color: 'rgb(var(--c-ok))' }}>none</div>
            : b.memory.chronicCorruptionZones.map(x => <div key={x} className="mt-0.5 text-[10px]" style={{ color: 'rgb(var(--c-alert))' }}>{x}</div>)}
        </div>
        <div className="border border-line p-2">
          <div className="text-[9px] font-semibold uppercase tracking-[0.16em] text-ink-soft">Most resilient region</div>
          <div className="mt-0.5 text-[10px]" style={{ color: 'rgb(var(--c-ok))' }}>{b.memory.topResilientRegion}</div>
        </div>
      </div>
      <p className="text-[9px] text-ink-muted">
        Resilience modes change escalation timing, authority routing and processing guarantees. AI recommends;
        humans decide — orchestration is advisory and constitutionally bounded.
      </p>
    </div>
  );
}
