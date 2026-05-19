'use client';

// Interior Existential Continuity — catastrophic-risk continuity & long-
// duration governance resilience (constitutional, rights-preserving).

import * as React from 'react';
import { existentialBoard } from '@/lib/gov/existential-continuity';

const G = (v: number) => v >= 62 ? 'rgb(var(--c-ok))' : v >= 45 ? 'rgb(var(--c-warn))' : 'rgb(var(--c-alert))';
const BAD = (v: number) => v >= 60 ? 'rgb(var(--c-alert))' : v >= 40 ? 'rgb(var(--c-warn))' : 'rgb(var(--c-ok))';

export function ExistentialContinuity({ id, now }: { id: string; now: number }) {
  void id;
  const b = existentialBoard(now);
  const c = b.catastrophic; const g = b.governance;
  const cat = [
    { l: 'Infrastructure-collapse probability', v: c.infrastructureCollapseProb, good: false },
    { l: 'Blackout risk', v: c.blackoutRisk, good: false },
    { l: 'Communications continuity', v: c.communicationsContinuity, good: true },
    { l: 'Food-system survivability', v: c.foodSystemSurvivability, good: true },
    { l: 'Water-system continuity', v: c.waterSystemContinuity, good: true },
    { l: 'Energy-collapse exposure', v: c.energyCollapseExposure, good: false },
    { l: 'Cascading failure index', v: c.cascadingFailure, good: false },
    { l: 'Civilization stress amplification', v: c.civilizationStressAmplification, good: false },
  ];
  const gov = [
    { l: 'Persistence under catastrophe', v: g.persistenceUnderCatastrophe, good: true },
    { l: 'Constitutional emergency continuity', v: g.constitutionalEmergencyContinuity, good: true },
    { l: 'Distributed continuity', v: g.distributedContinuity, good: true },
    { l: 'Regional autonomy resilience', v: g.regionalAutonomyResilience, good: true },
    { l: 'Institutional redundancy', v: g.institutionalRedundancy, good: true },
  ];
  const Row = ({ l, v, good }: { l: string; v: number; good: boolean }) => (
    <div className="flex items-center gap-2 border-b border-line/60 px-2 py-1.5 text-[10px] last:border-0">
      <span className="w-56 shrink-0 text-ink">{l}</span>
      <span className="relative h-2 min-w-0 flex-1 bg-surface-2"><span className="absolute inset-y-0 left-0" style={{ width: `${v}%`, background: good ? G(v) : BAD(v) }} /></span>
      <span className="w-10 shrink-0 text-right tabular-nums" style={{ color: good ? G(v) : BAD(v) }}>{v}</span>
    </div>
  );
  return (
    <div className="space-y-2 font-mono">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-y px-3 py-2 text-[11px]"
        style={{ borderColor: `color-mix(in srgb,${BAD(c.cascadingFailure)} 45%,transparent)`, background: 'rgba(0,0,0,0.3)' }}>
        <span className="text-[9px] uppercase tracking-[0.18em] text-ink-muted">Existential continuity mode</span>
        <span className="text-[14px] font-semibold uppercase tracking-[0.12em] text-ink">{b.mode}</span>
        <span className="text-ink-muted">cascading failure <span className="font-semibold tabular-nums" style={{ color: BAD(c.cascadingFailure) }}>{c.cascadingFailure}</span></span>
        <span className="ml-auto text-[9px] text-ink-muted">rights-preserving · humanitarian · constitutional</span>
      </div>
      <div>
        <div className="px-1 py-1 text-[9px] font-semibold uppercase tracking-[0.2em] text-ink-soft">▌Catastrophic-risk continuity</div>
        <div className="border border-line">{cat.map(x => <Row key={x.l} {...x} />)}</div>
      </div>
      <div>
        <div className="px-1 py-1 text-[9px] font-semibold uppercase tracking-[0.2em] text-ink-soft">▌Long-duration governance resilience</div>
        <div className="border border-line">{gov.map(x => <Row key={x.l} {...x} />)}</div>
      </div>
      {b.warnings.length > 0 ? (
        <div className="border border-line">
          {b.warnings.map((w, i) => (
            <div key={i} className="flex items-center gap-2 border-b border-line/60 px-2 py-1 text-[10px] last:border-0">
              <span className="w-52 shrink-0 text-[9px] font-semibold uppercase tracking-[0.06em]" style={{ color: w.severity === 'critical' ? 'rgb(var(--c-alert))' : 'rgb(var(--c-warn))' }}>{w.kind}</span>
              <span className="min-w-0 flex-1 truncate text-ink-muted">{w.detail}</span>
            </div>
          ))}
        </div>
      ) : <p className="text-[9px]" style={{ color: 'rgb(var(--c-ok))' }}>No existential-pressure warning — civilization continuity within constitutional tolerance.</p>}
      <p className="text-[9px] text-ink-muted">Civilizations survive disruption only when they preserve constitutional humanity through it — the runtime exists to protect continuity, never to centralize unchecked emergency power.</p>
    </div>
  );
}
