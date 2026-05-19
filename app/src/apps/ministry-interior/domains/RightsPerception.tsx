'use client';

// Interior Civic Legitimacy — Rights-Perception Continuity. Whether
// citizens (in aggregate) can believe rights are protected, appeals
// meaningful, oversight real, corruption punished and law equal — plus
// civic fatigue / alienation accumulation.

import * as React from 'react';
import { civicBoard } from '@/lib/gov/civic-legitimacy';

export function RightsPerception({ id, now }: { id: string; now: number }) {
  void id;
  const b = civicBoard(now);
  const dims: { l: string; v: number }[] = [
    { l: 'Rights protected', v: b.rights.rightsProtected },
    { l: 'Appeals meaningful', v: b.rights.appealsMeaningful },
    { l: 'Oversight is real', v: b.rights.oversightReal },
    { l: 'Corruption punished', v: b.rights.corruptionPunished },
    { l: 'Law applies equally', v: b.rights.lawAppliesEqually },
    { l: 'Accountability intact', v: b.rights.accountabilityIntact },
  ];
  const col = (v: number) => v >= 65 ? 'rgb(var(--c-ok))' : v >= 45 ? 'rgb(var(--c-warn))' : 'rgb(var(--c-alert))';
  return (
    <div className="space-y-2 font-mono">
      <div className="border-y border-line bg-black/30 px-3 py-1.5 text-[10px] text-ink-muted">
        Constitutional-confidence dimensions — aggregate perception of whether lawful governance holds.
        Civic fatigue <span className="font-semibold tabular-nums" style={{ color: b.civicFatigue >= 60 ? 'rgb(var(--c-alert))' : 'rgb(var(--c-warn))' }}>{b.civicFatigue}</span>
      </div>

      <div className="border border-line">
        {dims.map(d => (
          <div key={d.l} className="flex items-center gap-2 border-b border-line/60 px-2 py-1.5 text-[10px] last:border-0">
            <span className="w-44 shrink-0 text-ink">{d.l}</span>
            <span className="relative h-2 min-w-0 flex-1 bg-surface-2">
              <span className="absolute inset-y-0 left-0" style={{ width: `${d.v}%`, background: col(d.v) }} />
              <span className="absolute inset-y-0 w-px bg-white/40" style={{ left: '50%' }} aria-hidden />
            </span>
            <span className="w-10 shrink-0 text-right tabular-nums" style={{ color: col(d.v) }}>{d.v}</span>
            <span className="w-32 shrink-0 text-right text-[9px] text-ink-muted">{d.v >= 65 ? 'confidence held' : d.v >= 45 ? 'eroding' : 'skepticism risk'}</span>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-2 lg:grid-cols-2">
        <div className="border border-line p-2">
          <div className="text-[9px] font-semibold uppercase tracking-[0.16em] text-ink-soft">Civic alienation signal</div>
          <div className="mt-0.5 text-[10px] text-ink-muted">
            Citizens disengage gradually before instability. Fatigue {b.civicFatigue} ·
            fracture zones {b.regions.filter(r => r.fractureZone).length}/{b.regions.length} ·
            <span style={{ color: b.civicFatigue >= 60 ? 'rgb(var(--c-alert))' : 'rgb(var(--c-ok))' }}> {b.civicFatigue >= 60 ? 'alienation rising' : 'engagement stable'}</span>
          </div>
        </div>
        <div className="border border-line p-2">
          <div className="text-[9px] font-semibold uppercase tracking-[0.16em] text-ink-soft">Restoration effectiveness</div>
          <div className="mt-0.5 text-[14px] font-semibold tabular-nums" style={{ color: b.memory.restorationEffectivenessPct >= 55 ? 'rgb(var(--c-ok))' : 'rgb(var(--c-warn))' }}>{b.memory.restorationEffectivenessPct}%</div>
        </div>
      </div>
      <p className="text-[9px] text-ink-muted">
        The midline marks the confidence threshold. Perception is modelled at constitutional/institutional level only —
        never by profiling, scoring or classifying citizens.
      </p>
    </div>
  );
}
