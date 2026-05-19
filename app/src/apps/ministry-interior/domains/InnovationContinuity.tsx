'use client';

// Interior Cognitive Continuity — Scientific & Innovation Continuity +
// institutional cognitive resilience (institutional/factual only).

import * as React from 'react';
import { knowledgeBoard } from '@/lib/gov/knowledge-continuity';

const G = (v: number) => v >= 62 ? 'rgb(var(--c-ok))' : v >= 45 ? 'rgb(var(--c-warn))' : 'rgb(var(--c-alert))';
const BAD = (v: number) => v >= 60 ? 'rgb(var(--c-alert))' : v >= 40 ? 'rgb(var(--c-warn))' : 'rgb(var(--c-ok))';

export function InnovationContinuity({ id, now }: { id: string; now: number }) {
  void id;
  const b = knowledgeBoard(now);
  const iv = b.innovation;
  const cr = b.cognitiveResilience;
  const innov = [
    { l: 'Research continuity', v: iv.researchContinuity, good: true },
    { l: 'Scientific capacity', v: iv.scientificCapacity, good: true },
    { l: 'Innovation ecosystem', v: iv.innovationEcosystem, good: true },
    { l: 'Technical-education resilience', v: iv.technicalEducationResilience, good: true },
    { l: 'Knowledge production', v: iv.knowledgeProduction, good: true },
    { l: 'Stagnation risk', v: iv.stagnationRisk, good: false },
    { l: 'Expertise migration', v: iv.expertiseMigration, good: false },
  ];
  const cog = [
    { l: 'Institutional trust resilience', v: cr.institutionalTrustResilience, good: true },
    { l: 'Factual continuity', v: cr.factualContinuity, good: true },
    { l: 'Public-information reliability', v: cr.publicInfoReliability, good: true },
    { l: 'Crisis-information stability', v: cr.crisisInfoStability, good: true },
    { l: 'Civic confusion index', v: cr.civicConfusionIndex, good: false },
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
      <div>
        <div className="px-1 py-1 text-[9px] font-semibold uppercase tracking-[0.2em] text-ink-soft">▌Scientific & innovation continuity</div>
        <div className="border border-line">{innov.map(x => <Row key={x.l} {...x} />)}</div>
      </div>
      <div>
        <div className="px-1 py-1 text-[9px] font-semibold uppercase tracking-[0.2em] text-ink-soft">▌Institutional cognitive resilience — factual / institutional only</div>
        <div className="border border-line">{cog.map(x => <Row key={x.l} {...x} />)}</div>
      </div>
      <p className="text-[9px] text-ink-muted">
        Cognitive resilience tracks institutional factual continuity & public-information reliability — it never
        targets political speech, classifies opinion, or automates censorship. Civilizations stagnate when
        innovation continuity collapses; the runtime forecasts it, it does not direct thought.
      </p>
    </div>
  );
}
