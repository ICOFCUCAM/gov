'use client';

// Interior Generational Continuity — Institutional Aging. Institutions
// modelled as aging entities: brittleness, procedural sclerosis and
// adaptability. Detects governance sclerosis before structural failure.

import * as React from 'react';
import { generationalBoard, type ShellAging } from '@/lib/gov/generational-intelligence';

const ST: Record<ShellAging['state'], string> = {
  adaptive: 'rgb(var(--c-ok))', maturing: 'rgb(var(--c-warn))',
  rigid: '#e0673a', sclerotic: 'rgb(var(--c-alert))',
};

export function InstitutionalAging({ id, now }: { id: string; now: number }) {
  void id;
  const b = generationalBoard(now);
  const sclerotic = b.aging.filter(a => a.state === 'sclerotic').length;
  return (
    <div className="space-y-2 font-mono">
      <div className="flex flex-wrap items-stretch divide-x divide-line border-y border-line bg-black/30">
        <div className="min-w-[130px] flex-1 px-3 py-1.5"><div className="text-[8px] uppercase tracking-[0.16em] text-ink-muted">Sclerotic institutions</div><div className="text-[17px] font-semibold tabular-nums" style={{ color: sclerotic ? 'rgb(var(--c-alert))' : 'rgb(var(--c-ok))' }}>{sclerotic}</div></div>
        <div className="min-w-[130px] flex-1 px-3 py-1.5"><div className="text-[8px] uppercase tracking-[0.16em] text-ink-muted">Rigid</div><div className="text-[17px] font-semibold tabular-nums" style={{ color: '#e0673a' }}>{b.aging.filter(a => a.state === 'rigid').length}</div></div>
        <div className="min-w-[130px] flex-1 px-3 py-1.5"><div className="text-[8px] uppercase tracking-[0.16em] text-ink-muted">Adaptive</div><div className="text-[17px] font-semibold tabular-nums" style={{ color: 'rgb(var(--c-ok))' }}>{b.aging.filter(a => a.state === 'adaptive').length}</div></div>
        <div className="min-w-[220px] flex-[2] px-3 py-1.5"><div className="text-[8px] uppercase tracking-[0.16em] text-ink-muted">Doctrine</div><div className="text-[10px] text-ink-soft">Aging institutions become brittle — renew before sclerosis normalizes.</div></div>
      </div>

      <div className="border border-line">
        <div className="flex items-center gap-2 border-b border-line bg-black/30 px-2 py-1 text-[8px] font-semibold uppercase tracking-[0.16em] text-ink-muted">
          <span className="w-44 shrink-0">Institution</span>
          <span className="w-16 shrink-0">Age (yr)</span>
          <span className="w-32 shrink-0">Brittleness</span>
          <span className="w-32 shrink-0">Sclerosis</span>
          <span className="w-32 shrink-0">Adaptability</span>
          <span className="min-w-0 flex-1">State</span>
        </div>
        {b.aging.map(a => (
          <div key={a.key} className="flex items-center gap-2 border-b border-line/60 px-2 py-1 text-[10px] last:border-0">
            <span className="w-44 shrink-0 truncate text-ink">{a.label}</span>
            <span className="w-16 shrink-0 tabular-nums text-ink-muted">{a.ageYears}</span>
            <span className="w-32 shrink-0"><span className="relative block h-1.5 w-24 bg-surface-2"><span className="absolute inset-y-0 left-0" style={{ width: `${a.brittleness}%`, background: 'rgb(var(--c-alert))' }} /></span></span>
            <span className="w-32 shrink-0"><span className="relative block h-1.5 w-24 bg-surface-2"><span className="absolute inset-y-0 left-0" style={{ width: `${a.sclerosis}%`, background: '#e0673a' }} /></span></span>
            <span className="w-32 shrink-0"><span className="relative block h-1.5 w-24 bg-surface-2"><span className="absolute inset-y-0 left-0" style={{ width: `${a.adaptability}%`, background: 'rgb(var(--c-ok))' }} /></span></span>
            <span className="min-w-0 flex-1 text-[9px] font-semibold uppercase tracking-[0.06em]" style={{ color: ST[a.state] }}>{a.state}</span>
          </div>
        ))}
      </div>
      {b.corruption.entrenched.length > 0 ? (
        <p className="text-[9px]" style={{ color: 'rgb(var(--c-alert))' }}>
          Entrenched sclerotic institutions: {b.corruption.entrenched.join(', ')} — chronic inefficiency normalized; structural renewal required.
        </p>
      ) : (
        <p className="text-[9px] text-ink-muted">No entrenched sclerotic institution — adaptability preserved across the federation.</p>
      )}
    </div>
  );
}
