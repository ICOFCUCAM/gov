'use client';

// Interior Existential Continuity — Pandemic & Biosurvival Resilience.
// Institutional health resilience under biological crisis — never
// biological control or discriminatory classification.

import * as React from 'react';
import { existentialBoard } from '@/lib/gov/existential-continuity';

const G = (v: number) => v >= 62 ? 'rgb(var(--c-ok))' : v >= 45 ? 'rgb(var(--c-warn))' : 'rgb(var(--c-alert))';
const BAD = (v: number) => v >= 60 ? 'rgb(var(--c-alert))' : v >= 40 ? 'rgb(var(--c-warn))' : 'rgb(var(--c-ok))';

export function PandemicBiosurvival({ id, now }: { id: string; now: number }) {
  void id;
  const b = existentialBoard(now);
  const p = b.pandemic; const pl = b.planetary;
  const dims = [
    { l: 'Pandemic propagation pressure', v: p.propagationPressure, good: false },
    { l: 'Health-system survivability', v: p.healthSystemSurvivability, good: true },
    { l: 'Emergency medical resilience', v: p.emergencyMedicalResilience, good: true },
    { l: 'Social continuity under quarantine', v: p.socialContinuityUnderQuarantine, good: true },
    { l: 'Biological-crisis fatigue', v: p.biologicalCrisisFatigue, good: false },
    { l: 'Recovery pressure', v: p.recoveryPressure, good: false },
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
      <div className="border-y border-line bg-black/30 px-3 py-1.5 text-[10px] text-ink-muted">
        Biological-crisis resilience — institutional / health continuity only. No coercive surveillance, no biological
        discrimination, no forced population measures.
      </div>
      <div>
        <div className="px-1 py-1 text-[9px] font-semibold uppercase tracking-[0.2em] text-ink-soft">▌Pandemic resilience dimensions</div>
        <div className="border border-line">{dims.map(x => <Row key={x.l} {...x} />)}</div>
      </div>
      <div>
        <div className="px-1 py-1 text-[9px] font-semibold uppercase tracking-[0.2em] text-ink-soft">▌Planetary & long-horizon biosphere</div>
        <div className="border border-line">
          <Row l="Environmental pressure" v={pl.environmentalPressure} good={false} />
          <Row l="Biosphere continuity" v={pl.biosphereContinuity} good />
          <Row l="Long-horizon infrastructure survivability" v={pl.longHorizonInfraSurvivability} good />
          <Row l="Intergenerational adaptation" v={pl.intergenerationalAdaptation} good />
        </div>
      </div>
      <p className="text-[9px] text-ink-muted">Civilizations recover when health-system survivability holds and rights-preserving emergency continuity is maintained — the runtime models institutional resilience, never individuals.</p>
    </div>
  );
}
