'use client';

// Interior Temporal Intelligence — Temporal Corruption Intelligence.
// Corruption emergence over time: chronic abuse vs overload-triggered vs
// seasonal-window exploitation, with escalation trajectories.

import * as React from 'react';
import { temporalBoard } from '@/lib/gov/temporal-intelligence';

const PAT: Record<string, { c: string; t: string }> = {
  chronic: { c: 'rgb(var(--c-alert))', t: 'Chronic abuse culture' },
  'overload-triggered': { c: '#e0673a', t: 'Suspicious only under overload' },
  'seasonal-window': { c: 'rgb(var(--c-warn))', t: 'Recurring seasonal window' },
};

export function TemporalCorruption({ id, now }: { id: string; now: number }) {
  void id;
  const b = temporalBoard(now);
  const rows = b.temporalCorruption;
  return (
    <div className="space-y-2 font-mono">
      <div className="flex flex-wrap items-stretch divide-x divide-line border-y border-line bg-black/30">
        {(['chronic', 'overload-triggered', 'seasonal-window'] as const).map(p => (
          <div key={p} className="min-w-[170px] flex-1 px-3 py-1.5">
            <div className="text-[8px] uppercase tracking-[0.14em]" style={{ color: PAT[p]!.c }}>{PAT[p]!.t}</div>
            <div className="mt-0.5 text-[16px] font-semibold tabular-nums text-ink">{rows.filter(r => r.pattern === p).length}</div>
          </div>
        ))}
        <div className="min-w-[220px] flex-[2] px-3 py-1.5">
          <div className="text-[8px] uppercase tracking-[0.14em] text-ink-muted">Discriminator</div>
          <div className="mt-0.5 text-[10px] text-ink-soft">Structural overload ≠ intentional exploitation of overload.</div>
        </div>
      </div>

      <div className="border border-line">
        <div className="flex items-center gap-2 border-b border-line bg-black/30 px-2 py-1 text-[8px] font-semibold uppercase tracking-[0.16em] text-ink-muted">
          <span className="w-40 shrink-0">Agency</span>
          <span className="w-44 shrink-0">Pattern</span>
          <span className="w-40 shrink-0">Corruption escalation →</span>
          <span className="min-w-0 flex-1">Assessment</span>
        </div>
        {rows.length === 0 ? (
          <p className="px-2 py-2 text-[10px]" style={{ color: 'rgb(var(--c-ok))' }}>No corruption escalation trajectory detected on the horizon.</p>
        ) : rows.map(r => (
          <div key={r.agency} className="flex items-center gap-2 border-b border-line/60 px-2 py-1 text-[10px] last:border-0">
            <span className="w-40 shrink-0 truncate text-ink">{r.label}</span>
            <span className="w-44 shrink-0 text-[9px] font-semibold uppercase tracking-[0.06em]" style={{ color: PAT[r.pattern]!.c }}>{r.pattern}</span>
            <span className="flex w-40 shrink-0 items-center gap-1">
              <span className="relative h-2 w-24 bg-surface-2">
                <span className="absolute inset-y-0 left-0" style={{ width: `${Math.min(100, r.trajectory * 3)}%`, background: PAT[r.pattern]!.c }} />
              </span>
              <span className="tabular-nums" style={{ color: PAT[r.pattern]!.c }}>+{r.trajectory}</span>
            </span>
            <span className="min-w-0 flex-1 truncate text-ink-muted">{PAT[r.pattern]!.t}{r.pattern !== 'seasonal-window' ? ' · escalate to anti-corruption oversight' : ''}</span>
          </div>
        ))}
      </div>
      <p className="text-[9px] text-ink-muted">
        Offices that turn suspicious only during overload, recurring bribery windows and cyclical permit manipulation
        are tracked across time — chronic patterns propagate to oversight with immutable historical evidence.
      </p>
    </div>
  );
}
