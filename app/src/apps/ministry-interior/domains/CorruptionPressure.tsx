'use client';

// Interior Institutional Economy — Corruption Pressure Intelligence.
// Corruption risk emerges from overload, but the runtime separates lawful
// overload (risk explained by load) from suspicious obstruction (risk
// WITHOUT load — the bribery / selective-acceleration signature).

import * as React from 'react';
import { economyBoard, type CorruptionMode } from '@/lib/gov/institutional-economy';

const MODE_CSS: Record<CorruptionMode, string> = {
  clean: 'rgb(var(--c-ok))',
  'lawful-overload': 'rgb(var(--c-warn))',
  'suspicious-obstruction': 'rgb(var(--c-alert))',
};

export function CorruptionPressure({ id, now }: { id: string; now: number }) {
  void id;
  const b = economyBoard(now);
  const ranked = [...b.agencies].sort((x, y) => y.corruption.pressure - x.corruption.pressure);
  const suspicious = ranked.filter(a => a.corruption.mode === 'suspicious-obstruction');

  return (
    <div className="space-y-2 font-mono">
      <div className="flex flex-wrap items-stretch divide-x divide-line border-y border-line bg-black/30">
        <div className="min-w-[150px] flex-1 px-3 py-1.5"><div className="text-[8px] uppercase tracking-[0.16em] text-ink-muted">Suspicious obstruction</div><div className="text-[17px] font-semibold tabular-nums" style={{ color: suspicious.length ? 'rgb(var(--c-alert))' : 'rgb(var(--c-ok))' }}>{suspicious.length}</div></div>
        <div className="min-w-[150px] flex-1 px-3 py-1.5"><div className="text-[8px] uppercase tracking-[0.16em] text-ink-muted">Lawful overload</div><div className="text-[17px] font-semibold tabular-nums" style={{ color: 'rgb(var(--c-warn))' }}>{ranked.filter(a => a.corruption.mode === 'lawful-overload').length}</div></div>
        <div className="min-w-[260px] flex-[2] px-3 py-1.5"><div className="text-[8px] uppercase tracking-[0.16em] text-ink-muted">Discriminator</div><div className="text-[10px] text-ink-soft">High risk WITHOUT load ⇒ obstruction, not capacity.</div></div>
      </div>

      <div className="border border-line">
        <div className="flex items-center gap-2 border-b border-line bg-black/30 px-2 py-1 text-[8px] font-semibold uppercase tracking-[0.16em] text-ink-muted">
          <span className="w-36 shrink-0">Agency</span>
          <span className="w-40 shrink-0">Corruption pressure</span>
          <span className="w-24 shrink-0">Utilisation</span>
          <span className="w-40 shrink-0">Classification</span>
          <span className="min-w-0 flex-1">Anomaly signature</span>
        </div>
        {ranked.map(a => (
          <div key={a.agency} className="flex items-center gap-2 border-b border-line/60 px-2 py-1 text-[10px] last:border-0">
            <span className="w-36 shrink-0 truncate text-ink">{a.label}</span>
            <span className="flex w-40 shrink-0 items-center gap-1">
              <span className="relative h-2 w-28 bg-surface-2">
                <span className="absolute inset-y-0 left-0" style={{ width: `${a.corruption.pressure}%`, background: MODE_CSS[a.corruption.mode] }} />
              </span>
              <span className="tabular-nums" style={{ color: MODE_CSS[a.corruption.mode] }}>{a.corruption.pressure}</span>
            </span>
            <span className="w-24 shrink-0 tabular-nums text-ink-muted">{a.baseUtilPct}%</span>
            <span className="w-40 shrink-0 text-[9px] font-semibold uppercase tracking-[0.06em]" style={{ color: MODE_CSS[a.corruption.mode] }}>{a.corruption.mode}</span>
            <span className="min-w-0 flex-1 truncate text-ink-muted">
              {a.corruption.selectiveAccel ? 'selective acceleration · ' : ''}queue divergence {a.corruption.queueDivergence}
              {a.corruption.mode === 'suspicious-obstruction' ? ' · escalate to oversight' : ''}
            </span>
          </div>
        ))}
      </div>
      <p className="text-[9px] text-ink-muted">
        Lawful overload is a capacity problem (resource orchestration). Suspicious obstruction is an integrity problem
        — selective acceleration & queue divergence without load propagate to anti-corruption oversight with immutable evidence.
      </p>
    </div>
  );
}
