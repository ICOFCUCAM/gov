'use client';

// Interior National Apex — Sovereign Causality Topology. The directed
// cross-shell causality graph (amplify / stabilize, with propagation
// delay) and the detected cascade chains.

import * as React from 'react';
import { digitalTwin } from '@/lib/gov/national-causality';

export function CausalityGraph({ id, now }: { id: string; now: number }) {
  void id;
  const t = digitalTwin(now);
  const edges = [...t.edges].sort((a, b) => Math.abs(b.magnitude) - Math.abs(a.magnitude));
  return (
    <div className="space-y-2 font-mono">
      <div>
        <div className="px-1 py-1 text-[9px] font-semibold uppercase tracking-[0.2em] text-ink-soft">▌Causal topology — propagation across federated shells</div>
        <div className="border border-line">
          {edges.map((e, i) => {
            const col = e.kind === 'stabilize' ? 'rgb(var(--c-ok))' : e.magnitude >= 14 ? 'rgb(var(--c-alert))' : e.magnitude > 0 ? 'rgb(var(--c-warn))' : 'rgb(var(--c-ink-muted))';
            return (
              <div key={i} className="flex items-center gap-2 border-b border-line/60 px-2 py-1 text-[10px] last:border-0">
                <span className="w-32 shrink-0 truncate text-right text-ink">{e.from}</span>
                <span className="shrink-0" style={{ color: col }} aria-hidden>{e.kind === 'stabilize' ? '╍╍▷' : '━━▶'}</span>
                <span className="w-32 shrink-0 truncate text-ink">{e.to}</span>
                <span className="w-16 shrink-0 text-[8px] uppercase tracking-[0.08em]" style={{ color: col }}>{e.kind}</span>
                <span className="w-14 shrink-0 text-[8px] text-ink-muted">Δ{e.delayEpochs}ep</span>
                <span className="min-w-0 flex-1 truncate text-ink-muted">{e.mechanism}</span>
                <span className="w-12 shrink-0 text-right tabular-nums" style={{ color: col }}>{e.magnitude > 0 ? '+' : ''}{e.magnitude}</span>
              </div>
            );
          })}
        </div>
      </div>

      <div>
        <div className="px-1 py-1 text-[9px] font-semibold uppercase tracking-[0.2em] text-ink-soft">▌Cascade chains — contiguous amplifying instability</div>
        <div className="border border-line">
          {t.cascades.length === 0 ? (
            <p className="px-2 py-2 text-[10px]" style={{ color: 'rgb(var(--c-ok))' }}>No active cascade chains — propagation contained.</p>
          ) : t.cascades.map((c, i) => (
            <div key={i} className="border-b border-line/60 px-2 py-1.5 text-[10px] last:border-0">
              <div className="flex items-center gap-1.5">
                {c.path.map((p, j) => (
                  <React.Fragment key={p}>
                    <span className="font-semibold text-ink">{p}</span>
                    {j < c.path.length - 1 ? <span style={{ color: 'rgb(var(--c-alert))' }} aria-hidden>▶</span> : null}
                  </React.Fragment>
                ))}
                <span className="ml-auto tabular-nums" style={{ color: 'rgb(var(--c-alert))' }}>peak {c.peakStrain}</span>
              </div>
              <div className="mt-0.5 truncate text-[8.5px] text-ink-muted">{c.mechanism.join('  ▸  ')}</div>
            </div>
          ))}
        </div>
      </div>
      <p className="text-[9px] text-ink-muted">
        Amplifying edges spread strain; stabilizing edges (regional reinforcement, fiscal backing) absorb it. Delay
        attenuates propagation. Cascades are interdicted by the stabilization layer before systemic collapse.
      </p>
    </div>
  );
}
