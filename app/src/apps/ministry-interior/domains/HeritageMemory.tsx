'use client';

// Interior Civilizational Continuity — Heritage & Civilizational Memory.
// Aggregate continuity of heritage, language, oral history and
// constitutional memory across generational eras.

import * as React from 'react';
import { civilizationalBoard } from '@/lib/gov/civilizational-identity';

export function HeritageMemory({ id, now }: { id: string; now: number }) {
  void id;
  const b = civilizationalBoard(now);
  const h = b.heritage;
  const dims = [
    { l: 'Historical-site continuity', v: h.siteContinuity },
    { l: 'Archive survivability', v: h.archiveSurvivability },
    { l: 'Linguistic preservation', v: h.linguisticPreservation },
    { l: 'Oral-history continuity', v: h.oralHistoryContinuity },
    { l: 'Constitutional-memory retention', v: h.constitutionalMemoryRetention },
  ];
  const col = (v: number) => v >= 62 ? 'rgb(var(--c-ok))' : v >= 45 ? 'rgb(var(--c-warn))' : 'rgb(var(--c-alert))';
  return (
    <div className="space-y-2 font-mono">
      <div className="border-y border-line bg-black/30 px-3 py-1.5 text-[10px] text-ink-muted">
        Civilizations collapse when continuity of meaning collapses — heritage & constitutional memory tracked in aggregate.
      </div>
      <div className="border border-line">
        {dims.map(d => (
          <div key={d.l} className="flex items-center gap-2 border-b border-line/60 px-2 py-1.5 text-[10px] last:border-0">
            <span className="w-56 shrink-0 text-ink">{d.l}</span>
            <span className="relative h-2 min-w-0 flex-1 bg-surface-2">
              <span className="absolute inset-y-0 left-0" style={{ width: `${d.v}%`, background: col(d.v) }} />
              <span className="absolute inset-y-0 w-px bg-white/40" style={{ left: '50%' }} aria-hidden />
            </span>
            <span className="w-10 shrink-0 text-right tabular-nums" style={{ color: col(d.v) }}>{d.v}</span>
            <span className="w-28 shrink-0 text-right text-[9px] text-ink-muted">{d.v >= 62 ? 'preserved' : d.v >= 45 ? 'eroding' : 'continuity risk'}</span>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 gap-2 lg:grid-cols-3">
        <div className="border border-line p-2"><div className="text-[9px] font-semibold uppercase tracking-[0.16em] text-ink-soft">Fragmentation episodes</div><div className="mt-0.5 text-[10px]" style={{ color: b.memory.fragmentationEpisodes.length ? 'rgb(var(--c-alert))' : 'rgb(var(--c-ok))' }}>{b.memory.fragmentationEpisodes.length ? b.memory.fragmentationEpisodes.map(e => `E${e}`).join(', ') : 'none'}</div></div>
        <div className="border border-line p-2"><div className="text-[9px] font-semibold uppercase tracking-[0.16em] text-ink-soft">Integration success cycles</div><div className="mt-0.5 text-[14px] font-semibold tabular-nums text-ink">{b.memory.integrationSuccessCycles}</div></div>
        <div className="border border-line p-2"><div className="text-[9px] font-semibold uppercase tracking-[0.16em] text-ink-soft">Cohesion restoration</div><div className="mt-0.5 text-[14px] font-semibold tabular-nums" style={{ color: b.memory.cohesionRestorationPct >= 55 ? 'rgb(var(--c-ok))' : 'rgb(var(--c-warn))' }}>{b.memory.cohesionRestorationPct}%</div></div>
      </div>
      <p className="text-[9px] text-ink-muted">
        The midline marks the continuity threshold. Memory is preserved pluralistically — the runtime maintains
        civilizational continuity, it does not author a single national narrative.
      </p>
    </div>
  );
}
