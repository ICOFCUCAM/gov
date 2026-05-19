'use client';

// Interior Existential Continuity — Post-Collapse Recovery & Species
// Memory. Recovery quality determines civilizational survival.

import * as React from 'react';
import { existentialBoard } from '@/lib/gov/existential-continuity';

const G = (v: number) => v >= 62 ? 'rgb(var(--c-ok))' : v >= 45 ? 'rgb(var(--c-warn))' : 'rgb(var(--c-alert))';

export function PostCollapseRecovery({ id, now }: { id: string; now: number }) {
  void id;
  const b = existentialBoard(now);
  const r = b.recovery; const sm = b.speciesMemory;
  const dims = [
    { l: 'Recovery durability', v: r.recoveryDurability },
    { l: 'Institutional reformation capacity', v: r.institutionalReformationCapacity },
    { l: 'Social-cohesion restoration', v: r.socialCohesionRestoration },
    { l: 'Legitimacy reconstruction', v: r.legitimacyReconstruction },
    { l: 'Infrastructure regeneration', v: r.infrastructureRegeneration },
    { l: 'Educational recovery', v: r.educationalRecovery },
    { l: 'Ecological recovery', v: r.ecologicalRecovery },
  ];
  const mem = [
    { l: 'Constitutional archive', v: sm.constitutionalArchive },
    { l: 'Scientific memory', v: sm.scientificMemory },
    { l: 'Institutional archive', v: sm.institutionalArchive },
    { l: 'Recovery knowledge', v: sm.recoveryKnowledge },
  ];
  const Row = ({ l, v }: { l: string; v: number }) => (
    <div className="flex items-center gap-2 border-b border-line/60 px-2 py-1.5 text-[10px] last:border-0">
      <span className="w-56 shrink-0 text-ink">{l}</span>
      <span className="relative h-2 min-w-0 flex-1 bg-surface-2"><span className="absolute inset-y-0 left-0" style={{ width: `${v}%`, background: G(v) }} /></span>
      <span className="w-10 shrink-0 text-right tabular-nums" style={{ color: G(v) }}>{v}</span>
    </div>
  );
  return (
    <div className="space-y-2 font-mono">
      <div className="flex flex-wrap items-stretch divide-x divide-line border-y border-line bg-black/30">
        <div className="min-w-[150px] flex-1 px-3 py-1.5"><div className="text-[8px] uppercase tracking-[0.16em] text-ink-muted">Recovery timeline</div><div className="text-[17px] font-semibold tabular-nums text-ink">~{r.recoveryTimelineEpochs} ep</div></div>
        <div className="min-w-[150px] flex-1 px-3 py-1.5"><div className="text-[8px] uppercase tracking-[0.16em] text-ink-muted">Recurrence risk</div><div className="text-[17px] font-semibold tabular-nums" style={{ color: r.recurrenceRisk >= 55 ? 'rgb(var(--c-alert))' : 'rgb(var(--c-warn))' }}>{r.recurrenceRisk}</div></div>
        <div className="min-w-[260px] flex-[2] px-3 py-1.5"><div className="text-[8px] uppercase tracking-[0.16em] text-ink-muted">Doctrine</div><div className="text-[10px] text-ink-soft">Recovery quality determines civilizational survival.</div></div>
      </div>
      <div>
        <div className="px-1 py-1 text-[9px] font-semibold uppercase tracking-[0.2em] text-ink-soft">▌Post-collapse recovery dimensions</div>
        <div className="border border-line">{dims.map(x => <Row key={x.l} {...x} />)}</div>
      </div>
      <div>
        <div className="px-1 py-1 text-[9px] font-semibold uppercase tracking-[0.2em] text-ink-soft">▌Species memory — civilization preservation</div>
        <div className="border border-line">{mem.map(x => <Row key={x.l} {...x} />)}</div>
      </div>
      <p className="text-[9px] text-ink-muted">Preserves constitutional, scientific, institutional and recovery knowledge so civilization can reform itself after disruption — without abandoning lawful humanity.</p>
    </div>
  );
}
