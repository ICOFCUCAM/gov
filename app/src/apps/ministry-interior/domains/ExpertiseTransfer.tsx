'use client';

// Interior Cognitive Continuity — Institutional Knowledge Transfer.
// Retiring expertise, succession readiness, procedural-knowledge gaps and
// institutional-memory fragility (aggregate, by region).

import * as React from 'react';
import { knowledgeBoard } from '@/lib/gov/knowledge-continuity';

export function ExpertiseTransfer({ id, now }: { id: string; now: number }) {
  void id;
  const b = knowledgeBoard(now);
  const amnesia = b.transfer.filter(t => t.amnesiaRisk).length;
  return (
    <div className="space-y-2 font-mono">
      <div className="flex flex-wrap items-stretch divide-x divide-line border-y border-line bg-black/30">
        <div className="min-w-[150px] flex-1 px-3 py-1.5"><div className="text-[8px] uppercase tracking-[0.16em] text-ink-muted">Institutional amnesia risk</div><div className="text-[17px] font-semibold tabular-nums" style={{ color: amnesia ? 'rgb(var(--c-alert))' : 'rgb(var(--c-ok))' }}>{amnesia}</div></div>
        <div className="min-w-[150px] flex-1 px-3 py-1.5"><div className="text-[8px] uppercase tracking-[0.16em] text-ink-muted">Mean memory fragility</div><div className="text-[17px] font-semibold tabular-nums text-ink">{Math.round(b.transfer.reduce((s, t) => s + t.institutionalMemoryFragility, 0) / b.transfer.length)}</div></div>
        <div className="min-w-[240px] flex-[2] px-3 py-1.5"><div className="text-[8px] uppercase tracking-[0.16em] text-ink-muted">Doctrine</div><div className="text-[10px] text-ink-soft">Knowledge continuity must survive across administrations & generations.</div></div>
      </div>

      <div className="border border-line">
        <div className="flex items-center gap-2 border-b border-line bg-black/30 px-2 py-1 text-[8px] font-semibold uppercase tracking-[0.16em] text-ink-muted">
          <span className="w-32 shrink-0">Region</span>
          <span className="w-28 shrink-0">Retiring expertise</span>
          <span className="w-28 shrink-0">Succession readiness</span>
          <span className="w-28 shrink-0">Procedural gap</span>
          <span className="min-w-0 flex-1">Institutional-memory fragility</span>
        </div>
        {b.transfer.map(t => (
          <div key={t.region} className="flex items-center gap-2 border-b border-line/60 px-2 py-1 text-[10px] last:border-0">
            <span className="w-32 shrink-0 truncate text-ink">{t.region}</span>
            <span className="w-28 shrink-0 tabular-nums" style={{ color: t.retiringExpertise > 50 ? 'rgb(var(--c-alert))' : 'rgb(var(--c-warn))' }}>{t.retiringExpertise}</span>
            <span className="w-28 shrink-0 tabular-nums" style={{ color: t.successionReadiness >= 60 ? 'rgb(var(--c-ok))' : t.successionReadiness >= 45 ? 'rgb(var(--c-warn))' : 'rgb(var(--c-alert))' }}>{t.successionReadiness}</span>
            <span className="w-28 shrink-0 tabular-nums" style={{ color: t.proceduralKnowledgeGap > 60 ? 'rgb(var(--c-alert))' : 'rgb(var(--c-warn))' }}>{t.proceduralKnowledgeGap}</span>
            <span className="flex min-w-0 flex-1 items-center gap-1">
              <span className="relative h-2 w-32 bg-surface-2"><span className="absolute inset-y-0 left-0" style={{ width: `${t.institutionalMemoryFragility}%`, background: t.institutionalMemoryFragility > 60 ? 'rgb(var(--c-alert))' : t.institutionalMemoryFragility > 40 ? 'rgb(var(--c-warn))' : 'rgb(var(--c-ok))' }} /></span>
              <span className="tabular-nums" style={{ color: t.institutionalMemoryFragility > 60 ? 'rgb(var(--c-alert))' : 'rgb(var(--c-warn))' }}>{t.institutionalMemoryFragility}</span>
              {t.amnesiaRisk ? <span className="text-[8px] uppercase tracking-[0.1em]" style={{ color: 'rgb(var(--c-alert))' }}>· amnesia risk</span> : null}
            </span>
          </div>
        ))}
      </div>
      <p className="text-[9px] text-ink-muted">
        Detects expertise bottlenecks & generational knowledge discontinuity so succession is prepared before
        institutional amnesia — never by profiling individuals.
      </p>
    </div>
  );
}
