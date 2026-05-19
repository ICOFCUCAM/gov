'use client';

// Interior Generational Continuity — Demographic Evolution. Generational
// population currents and the institutional strain each one drives.

import * as React from 'react';
import { generationalBoard } from '@/lib/gov/generational-intelligence';

function Current({ series }: { series: number[] }) {
  return (
    <span className="flex h-4 items-end gap-px">
      {series.map((v, i) => (
        <span key={i} style={{ height: `${Math.max(2, Math.round((v / 100) * 16))}px`, width: '8px', background: '#45c0c8', opacity: 0.45 + i / (series.length * 1.6) }} />
      ))}
    </span>
  );
}

export function DemographicEvolution({ id, now }: { id: string; now: number }) {
  void id;
  const b = generationalBoard(now);
  return (
    <div className="space-y-2 font-mono">
      <div className="border-y border-line bg-black/30 px-3 py-1.5 text-[10px] text-ink-muted">
        Demographic transformation across <span className="font-semibold text-ink">{b.demographics[0]!.trajectory.length}</span> generational eras —
        each current is causally linked to long-horizon institutional strain.
      </div>
      <div className="border border-line">
        <div className="flex items-center gap-2 border-b border-line bg-black/30 px-2 py-1 text-[8px] font-semibold uppercase tracking-[0.16em] text-ink-muted">
          <span className="w-44 shrink-0">Demographic current</span>
          <span className="w-32 shrink-0">Trajectory (now→horizon)</span>
          <span className="w-28 shrink-0">Now → horizon</span>
          <span className="min-w-0 flex-1">Linked institutional strain</span>
        </div>
        {b.demographics.map(d => {
          const a = d.trajectory[0]!, z = d.trajectory[d.trajectory.length - 1]!;
          const rising = z > a;
          return (
            <div key={d.key} className="flex items-center gap-2 border-b border-line/60 px-2 py-1.5 text-[10px] last:border-0">
              <span className="w-44 shrink-0 truncate text-ink">{d.label}</span>
              <span className="w-32 shrink-0"><Current series={d.trajectory} /></span>
              <span className="w-28 shrink-0 tabular-nums text-ink-muted">{a} → <span style={{ color: rising ? 'rgb(var(--c-warn))' : 'rgb(var(--c-ok))' }}>{z}</span></span>
              <span className="min-w-0 flex-1 truncate text-ink-muted">{d.linkedStrain}</span>
            </div>
          );
        })}
      </div>
      <p className="text-[9px] text-ink-muted">
        Urban migration → municipal & permit congestion · aging population → citizen-service load · regional
        depopulation → divergence. Demographic evolution feeds the generational continuity-health forecast.
      </p>
    </div>
  );
}
