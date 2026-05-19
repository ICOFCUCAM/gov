'use client';

// Interior Generational Continuity — Civilization Continuity Forecast.
// Multi-decade continuity-health trajectory, civilization mode and the
// generational crisis-era memory.

import * as React from 'react';
import { generationalBoard } from '@/lib/gov/generational-intelligence';

function EraBar({ series }: { series: number[] }) {
  return (
    <span className="flex h-7 items-end gap-px">
      {series.map((v, i) => {
        const h = Math.max(2, Math.round((v / 100) * 28));
        const col = v >= 70 ? 'rgb(var(--c-ok))' : v >= 45 ? 'rgb(var(--c-warn))' : 'rgb(var(--c-alert))';
        return <span key={i} title={`era ${i}: ${v}`} style={{ height: `${h}px`, width: '12px', background: col, opacity: i === 0 ? 1 : 0.5 + i / (series.length * 2) }} />;
      })}
    </span>
  );
}

export function GenerationalForecast({ id, now }: { id: string; now: number }) {
  void id;
  const b = generationalBoard(now);
  const endH = b.continuityHealth[b.continuityHealth.length - 1]!;
  return (
    <div className="space-y-2 font-mono">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-y px-3 py-2 text-[11px]"
        style={{ borderColor: `color-mix(in srgb,${endH >= 60 ? 'rgb(var(--c-ok))' : endH >= 40 ? 'rgb(var(--c-warn))' : 'rgb(var(--c-alert))'} 45%,transparent)`, background: 'rgba(0,0,0,0.3)' }}>
        <span className="text-[9px] uppercase tracking-[0.18em] text-ink-muted">Civilization continuity mode</span>
        <span className="text-[14px] font-semibold uppercase tracking-[0.12em] text-ink">{b.mode}</span>
        <span className="ml-auto text-[9px] text-ink-muted">drift now {b.driftRiskNow} → horizon {b.driftRiskHorizon} · recovery {b.memory.recoveryEffectivenessPct}%</span>
      </div>

      <div className="flex flex-wrap items-center gap-6 border border-line bg-black/20 px-3 py-2">
        <div>
          <div className="text-[8px] uppercase tracking-[0.16em] text-ink-muted">Continuity health · 8 generational eras (now → +decades)</div>
          <div className="mt-1"><EraBar series={b.continuityHealth} /></div>
          <div className="mt-0.5 flex gap-px text-[7px] text-ink-muted">{b.continuityHealth.map((h, i) => <span key={i} className="w-3 text-center tabular-nums">{h}</span>)}</div>
        </div>
        <div className="text-[10px] text-ink-muted">
          <div>now <span className="font-semibold text-ink tabular-nums">{b.continuityHealth[0]}</span> → horizon <span className="font-semibold tabular-nums" style={{ color: endH >= 60 ? 'rgb(var(--c-ok))' : 'rgb(var(--c-alert))' }}>{endH}</span></div>
          <div className="mt-0.5">longest stable run <span className="font-semibold text-ink">{b.memory.longestStableRun}</span> eras</div>
          <div className="mt-0.5">reforms enacted <span className="font-semibold text-ink">{b.memory.reformsEnacted}</span> · corruption epochs <span className="font-semibold text-ink">{b.memory.corruptionEpochs}</span></div>
        </div>
      </div>

      <div>
        <div className="px-1 py-1 text-[9px] font-semibold uppercase tracking-[0.2em] text-ink-soft">▌Generational stabilization — advisory, constitutionally bounded</div>
        <div className="border border-line">
          {b.stabilization.length === 0 ? (
            <p className="px-2 py-2 text-[10px]" style={{ color: 'rgb(var(--c-ok))' }}>Civilization continuity within generational tolerance.</p>
          ) : b.stabilization.map((s, i) => (
            <div key={i} className="flex items-start gap-2 border-b border-line/60 px-2 py-1.5 text-[10px] last:border-0">
              <span className="mt-0.5 rounded-[2px] border border-line px-1 text-[8px] font-semibold uppercase tracking-[0.08em] text-ink-soft">{s.kind}</span>
              <span className="min-w-0 flex-1 text-ink">{s.detail}</span>
              <span className="shrink-0 text-[8px] uppercase tracking-[0.1em] text-ink-muted">advisory</span>
            </div>
          ))}
        </div>
      </div>
      {b.memory.crisisEras.length > 0 ? (
        <p className="text-[9px]" style={{ color: 'rgb(var(--c-alert))' }}>
          Forecast crisis eras: {b.memory.crisisEras.map(e => `E${e}`).join(', ')} — continuity health falls below the survivability floor; pre-emptive generational reinforcement required.
        </p>
      ) : (
        <p className="text-[9px] text-ink-muted">No forecast crisis era — the constitution endures across the projected generational horizon.</p>
      )}
    </div>
  );
}
