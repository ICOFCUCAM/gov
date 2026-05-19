'use client';

// Interior Territorial Continuity — Climate Pressure Propagation.
// Ecological causality into institutional load + water/resource continuity.

import * as React from 'react';
import { territorialBoard } from '@/lib/gov/territorial-continuity';

export function ClimatePropagation({ id, now }: { id: string; now: number }) {
  void id;
  const b = territorialBoard(now);
  return (
    <div className="space-y-2 font-mono">
      <div className="border-y border-line bg-black/30 px-3 py-1.5 text-[10px] text-ink-muted">
        Ecological causality → institutional amplification
        <span className="ml-2 font-semibold tabular-nums" style={{ color: b.institutionalAmplification >= 30 ? 'rgb(var(--c-alert))' : b.institutionalAmplification >= 15 ? 'rgb(var(--c-warn))' : 'rgb(var(--c-ok))' }}>+{b.institutionalAmplification}</span>
        <span className="ml-2">— ecological strain propagates through governance shells</span>
      </div>

      <div className="border border-line">
        {b.edges.map((e, i) => {
          const col = e.magnitude >= 25 ? 'rgb(var(--c-alert))' : e.magnitude > 0 ? 'rgb(var(--c-warn))' : 'rgb(var(--c-ok))';
          return (
            <div key={i} className="flex items-center gap-2 border-b border-line/60 px-2 py-1.5 text-[10px] last:border-0">
              <span className="w-36 shrink-0 truncate text-ink">{e.from}</span>
              <span className="shrink-0" style={{ color: col }} aria-hidden>━━▶</span>
              <span className="w-56 shrink-0 truncate text-ink-soft">{e.to}</span>
              <span className="min-w-0 flex-1 truncate text-[9px] text-ink-muted">{e.mechanism}</span>
              <span className="w-12 shrink-0 text-right tabular-nums" style={{ color: col }}>+{e.magnitude}</span>
            </div>
          );
        })}
      </div>

      <div>
        <div className="px-1 py-1 text-[9px] font-semibold uppercase tracking-[0.2em] text-ink-soft">▌Water & resource continuity</div>
        <div className="border border-line">
          {b.regions.map(r => (
            <div key={r.region} className="flex items-center gap-2 border-b border-line/60 px-2 py-1 text-[10px] last:border-0">
              <span className="w-32 shrink-0 truncate text-ink">{r.region}</span>
              <span className="w-16 shrink-0 text-[8px] uppercase tracking-[0.1em] text-ink-muted">water</span>
              <span className="relative h-2 w-28 shrink-0 bg-surface-2"><span className="absolute inset-y-0 left-0" style={{ width: `${r.waterAvailability}%`, background: r.waterAvailability >= 60 ? 'rgb(var(--c-ok))' : r.waterAvailability >= 40 ? 'rgb(var(--c-warn))' : 'rgb(var(--c-alert))' }} /></span>
              <span className="w-10 shrink-0 tabular-nums text-ink-muted">{r.waterAvailability}</span>
              <span className="min-w-0 flex-1 text-[9px] text-ink-muted">scarcity <span className="tabular-nums" style={{ color: r.scarcityIndex > 70 ? 'rgb(var(--c-alert))' : 'rgb(var(--c-warn))' }}>{r.scarcityIndex}</span> · agri instability {r.agriculturalInstability}{r.scarcityIndex > 65 ? ' · scarcity-escalation risk' : ''}</span>
            </div>
          ))}
        </div>
      </div>
      <p className="text-[9px] text-ink-muted">
        Drought → agricultural collapse → migration → municipal overload; flooding → infrastructure → regional
        instability. Resource continuity is preserved equitably — never through resource authoritarianism.
      </p>
    </div>
  );
}
