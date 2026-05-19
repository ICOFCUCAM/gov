'use client';

// Interior Cognitive Continuity — Long-Horizon Cognitive Trajectory.
// Knowledge-continuity forecast, lawful stabilization, structural ethical
// cognitive safeguards and memory.

import * as React from 'react';
import { knowledgeBoard, KNOWLEDGE_SAFEGUARDS } from '@/lib/gov/knowledge-continuity';

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

export function CognitiveTrajectory({ id, now }: { id: string; now: number }) {
  void id;
  const b = knowledgeBoard(now);
  const end = b.continuityTrajectory[b.continuityTrajectory.length - 1]!;
  return (
    <div className="space-y-2 font-mono">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-y px-3 py-2 text-[11px]"
        style={{ borderColor: `color-mix(in srgb,${end >= 55 ? 'rgb(var(--c-ok))' : 'rgb(var(--c-alert))'} 45%,transparent)`, background: 'rgba(0,0,0,0.3)' }}>
        <span className="text-[9px] uppercase tracking-[0.18em] text-ink-muted">Knowledge continuity mode</span>
        <span className="text-[14px] font-semibold uppercase tracking-[0.12em] text-ink">{b.mode}</span>
        <span className="ml-auto text-[9px] text-ink-muted">knowledge restoration {b.memory.knowledgeRestorationPct}%</span>
      </div>

      <div className="flex flex-wrap items-center gap-6 border border-line bg-black/20 px-3 py-2">
        <div>
          <div className="text-[8px] uppercase tracking-[0.16em] text-ink-muted">Knowledge continuity · generational eras (now → +decades)</div>
          <div className="mt-1"><EraBar series={b.continuityTrajectory} /></div>
          <div className="mt-0.5 flex gap-px text-[7px] text-ink-muted">{b.continuityTrajectory.map((v, i) => <span key={i} className="w-3 text-center tabular-nums">{v}</span>)}</div>
        </div>
        <div className="text-[10px] text-ink-muted">
          <div>now <span className="font-semibold text-ink tabular-nums">{b.continuityTrajectory[0]}</span> → horizon <span className="font-semibold tabular-nums" style={{ color: end >= 55 ? 'rgb(var(--c-ok))' : 'rgb(var(--c-alert))' }}>{end}</span></div>
          <div className="mt-0.5">expertise-loss eras <span className="font-semibold text-ink">{b.memory.expertiseLossEras.length}</span> · innovation-renewal eras <span className="font-semibold text-ink">{b.memory.innovationRenewalEras.length}</span></div>
          <div className="mt-0.5">learning-recovery cycles <span className="font-semibold text-ink">{b.memory.learningRecoveryCycles}</span></div>
        </div>
      </div>

      <div>
        <div className="px-1 py-1 text-[9px] font-semibold uppercase tracking-[0.2em] text-ink-soft">▌Lawful knowledge-continuity stabilization — advisory & pluralistic</div>
        <div className="border border-line">
          {b.stabilization.length === 0 ? (
            <p className="px-2 py-2 text-[10px]" style={{ color: 'rgb(var(--c-ok))' }}>Knowledge continuity within constitutional tolerance.</p>
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
        <div className="text-[9px] font-semibold uppercase tracking-[0.16em]" style={{ color: 'rgb(var(--c-alert))' }}>Ethical cognitive safeguards — prohibited & blocked</div>
        <div className="mt-1 flex flex-wrap gap-1">
          {KNOWLEDGE_SAFEGUARDS.prohibited.map(p => (
            <span key={p} className="border px-1 text-[8px] uppercase tracking-[0.06em]" style={{ borderColor: 'color-mix(in srgb,rgb(var(--c-alert)) 40%,transparent)', color: 'rgb(var(--c-alert))' }}>✗ {p}</span>
          ))}
        </div>
        <p className="mt-1 text-[9px] text-ink-muted">
          Scope {KNOWLEDGE_SAFEGUARDS.scope} · pluralistic {String(KNOWLEDGE_SAFEGUARDS.pluralistic)} ·
          politically neutral {String(KNOWLEDGE_SAFEGUARDS.politicallyNeutral)}. The runtime preserves
          constitutional cognitive continuity — it does not engineer human thought.
        </p>
      </div>
    </div>
  );
}
