'use client';

// Interior Institutional Economy — National Pressure Propagation. Overload
// in one agency/region propagates across the sovereign mesh; regional
// strain and synchronization degradation are made visible.

import * as React from 'react';
import { economyBoard } from '@/lib/gov/institutional-economy';

export function PressurePropagation({ id, now }: { id: string; now: number }) {
  void id;
  const b = economyBoard(now);
  const active = [...b.edges].sort((x, y) => y.magnitude - x.magnitude);
  const lbl = (k: string) => b.agencies.find(a => a.agency === k)?.label ?? k;

  return (
    <div className="space-y-2 font-mono">
      <div>
        <div className="px-1 py-1 text-[9px] font-semibold uppercase tracking-[0.2em] text-ink-soft">▌Pressure mesh — source overload → downstream strain</div>
        <div className="border border-line">
          {active.map((e, i) => (
            <div key={i} className="flex items-center gap-2 border-b border-line/60 px-2 py-1 text-[10px] last:border-0">
              <span className="w-36 shrink-0 truncate text-ink">{lbl(e.from)}</span>
              <span className="shrink-0 text-ink-muted" aria-hidden>━━▶</span>
              <span className="w-36 shrink-0 truncate text-ink">{lbl(e.to)}</span>
              <div className="relative h-2 min-w-0 flex-1 bg-surface-2">
                <span className="absolute inset-y-0 left-0" style={{ width: `${Math.min(100, e.magnitude * 2)}%`, background: e.magnitude >= 20 ? 'rgb(var(--c-alert))' : e.magnitude > 0 ? 'rgb(var(--c-warn))' : 'rgb(var(--c-ok))' }} />
              </div>
              <span className="w-28 shrink-0 truncate text-[8.5px] text-ink-muted">{e.kind}</span>
              <span className="w-12 shrink-0 text-right tabular-nums" style={{ color: e.magnitude > 0 ? 'rgb(var(--c-warn))' : 'rgb(var(--c-ok))' }}>+{e.magnitude}</span>
            </div>
          ))}
        </div>
      </div>

      <div>
        <div className="px-1 py-1 text-[9px] font-semibold uppercase tracking-[0.2em] text-ink-soft">▌Regional strain & resilience</div>
        <div className="border border-line">
          {b.regions.map(r => (
            <div key={r.region} className="flex items-center gap-2 border-b border-line/60 px-2 py-1 text-[10px] last:border-0">
              <span className="w-28 shrink-0 truncate text-ink">{r.region}</span>
              <div className="relative h-2 min-w-0 flex-1 bg-surface-2">
                <span className="absolute inset-y-0 left-0" style={{ width: `${Math.min(100, r.strainPct / 1.6)}%`, background: r.strainPct >= 120 ? 'rgb(var(--c-alert))' : r.strainPct >= 80 ? 'rgb(var(--c-warn))' : 'rgb(var(--c-ok))' }} />
              </div>
              <span className="w-16 shrink-0 text-right tabular-nums text-ink-muted">strain {r.strainPct}</span>
              <span className="w-16 shrink-0 text-right tabular-nums text-ink-muted">fat {r.fatiguePct}</span>
              <span className="w-20 shrink-0 text-right tabular-nums" style={{ color: r.suspicious ? 'rgb(var(--c-alert))' : 'rgb(var(--c-ink-muted))' }}>{r.suspicious} susp</span>
              <span className="w-24 shrink-0 text-right tabular-nums" style={{ color: r.resilienceScore >= 60 ? 'rgb(var(--c-ok))' : r.resilienceScore >= 35 ? 'rgb(var(--c-warn))' : 'rgb(var(--c-alert))' }}>resil {r.resilienceScore}</span>
            </div>
          ))}
        </div>
      </div>
      <p className="text-[9px] text-ink-muted">
        Immigration surge → registry pressure · municipal failure → regional backlog · disaster → permit delay.
        Pressure waves are real: a saturated upstream agency raises downstream utilisation across the mesh.
      </p>
    </div>
  );
}
