'use client';

// Interior Civilizational Continuity — Long-Horizon Civilizational
// Trajectory. Identity-continuity forecast, lawful cohesion
// stabilization, structural pluralistic safeguards and memory.

import * as React from 'react';
import { civilizationalBoard, CIVIC_IDENTITY_SAFEGUARDS } from '@/lib/gov/civilizational-identity';

function EraBar({ series }: { series: number[] }) {
  return (
    <span className="flex h-7 items-end gap-px">
      {series.map((v, i) => {
        const col = v >= 62 ? 'rgb(var(--c-ok))' : v >= 45 ? 'rgb(var(--c-warn))' : 'rgb(var(--c-alert))';
        return <span key={i} title={`era ${i}: ${v}`} style={{ height: `${Math.max(2, Math.round((v / 100) * 28))}px`, width: '12px', background: col, opacity: i === 0 ? 1 : 0.5 + i / (series.length * 2) }} />;
      })}
    </span>
  );
}

export function CivilizationalTrajectory({ id, now }: { id: string; now: number }) {
  void id;
  const b = civilizationalBoard(now);
  const end = b.continuityTrajectory[b.continuityTrajectory.length - 1]!;
  return (
    <div className="space-y-2 font-mono">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-y px-3 py-2 text-[11px]"
        style={{ borderColor: `color-mix(in srgb,${end >= 55 ? 'rgb(var(--c-ok))' : 'rgb(var(--c-alert))'} 45%,transparent)`, background: 'rgba(0,0,0,0.3)' }}>
        <span className="text-[9px] uppercase tracking-[0.18em] text-ink-muted">Civilizational continuity mode</span>
        <span className="text-[14px] font-semibold uppercase tracking-[0.12em] text-ink">{b.mode}</span>
        <span className="ml-auto text-[9px] text-ink-muted">cohesion restoration {b.memory.cohesionRestorationPct}%</span>
      </div>

      <div className="flex flex-wrap items-center gap-6 border border-line bg-black/20 px-3 py-2">
        <div>
          <div className="text-[8px] uppercase tracking-[0.16em] text-ink-muted">Identity continuity · generational eras (now → +decades)</div>
          <div className="mt-1"><EraBar series={b.continuityTrajectory} /></div>
          <div className="mt-0.5 flex gap-px text-[7px] text-ink-muted">{b.continuityTrajectory.map((v, i) => <span key={i} className="w-3 text-center tabular-nums">{v}</span>)}</div>
        </div>
        <div className="text-[10px] text-ink-muted">
          <div>now <span className="font-semibold text-ink tabular-nums">{b.continuityTrajectory[0]}</span> → horizon <span className="font-semibold tabular-nums" style={{ color: end >= 55 ? 'rgb(var(--c-ok))' : 'rgb(var(--c-alert))' }}>{end}</span></div>
          <div className="mt-0.5">fragmentation episodes <span className="font-semibold text-ink">{b.memory.fragmentationEpisodes.length}</span> · recovery eras <span className="font-semibold text-ink">{b.memory.culturalRecoveryEras.length}</span></div>
        </div>
      </div>

      <div>
        <div className="px-1 py-1 text-[9px] font-semibold uppercase tracking-[0.2em] text-ink-soft">▌Lawful cohesion stabilization — advisory & pluralistic</div>
        <div className="border border-line">
          {b.stabilization.length === 0 ? (
            <p className="px-2 py-2 text-[10px]" style={{ color: 'rgb(var(--c-ok))' }}>Pluralistic continuity within constitutional tolerance.</p>
          ) : b.stabilization.map((s, i) => (
            <div key={i} className="flex items-start gap-2 border-b border-line/60 px-2 py-1.5 text-[10px] last:border-0">
              <span className="mt-0.5 rounded-[2px] border border-line px-1 text-[8px] font-semibold uppercase tracking-[0.08em] text-ink-soft">{s.kind}</span>
              <span className="min-w-0 flex-1 text-ink">{s.detail}</span>
              <span className="shrink-0 text-[8px] uppercase tracking-[0.1em] text-ink-muted">advisory</span>
            </div>
          ))}
        </div>
      </div>

      <div className="border p-2" style={{ borderColor: 'color-mix(in srgb,rgb(var(--c-alert)) 30%,rgb(var(--c-line)))' }}>
        <div className="text-[9px] font-semibold uppercase tracking-[0.16em]" style={{ color: 'rgb(var(--c-alert))' }}>Pluralistic constitutional safeguards — prohibited & blocked</div>
        <div className="mt-1 flex flex-wrap gap-1">
          {CIVIC_IDENTITY_SAFEGUARDS.prohibited.map(p => (
            <span key={p} className="border px-1 text-[8px] uppercase tracking-[0.06em]" style={{ borderColor: 'color-mix(in srgb,rgb(var(--c-alert)) 40%,transparent)', color: 'rgb(var(--c-alert))' }}>✗ {p}</span>
          ))}
        </div>
        <p className="mt-1 text-[9px] text-ink-muted">
          Scope {CIVIC_IDENTITY_SAFEGUARDS.scope} · pluralistic {String(CIVIC_IDENTITY_SAFEGUARDS.pluralistic)} ·
          politically neutral {String(CIVIC_IDENTITY_SAFEGUARDS.politicallyNeutral)}. The runtime preserves
          constitutional civilization continuity — it does not engineer human identity.
        </p>
      </div>
    </div>
  );
}
