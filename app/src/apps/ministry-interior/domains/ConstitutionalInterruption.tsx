'use client';

// Interior Procedural Execution — Constitutional Interruption & Continuity.
// Judicial halts/suspensions, national continuity governance, and the
// bounded advisory AI (reasoning chain, legal basis, confidence, human
// approver, override history — never sovereign).

import * as React from 'react';
import { proceduralLedger, proceduralBoard, type ContinuityMode } from '@/lib/gov/procedural-execution';

const CONTINUITY_CSS: Record<ContinuityMode, string> = {
  nominal: 'rgb(var(--c-ok))',
  'regional-fallback': 'rgb(var(--c-warn))',
  'ministry-failover': '#e0673a',
  'constitutional-emergency': 'rgb(var(--c-alert))',
};

export function ConstitutionalInterruption({ id, now }: { id: string; now: number }) {
  void id;
  const files = proceduralLedger(now);
  const b = proceduralBoard(now);
  const holds = files.filter(f => f.status === 'judicial-hold').slice(0, 24);
  const advisories = files.filter(f => f.ai.action !== 'monitor')
    .sort((a, x) => x.ai.confidence - a.ai.confidence).slice(0, 10);

  return (
    <div className="space-y-2 font-mono">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-y px-3 py-1.5 text-[10px]"
        style={{ borderColor: `color-mix(in srgb,${CONTINUITY_CSS[b.continuity]} 45%,transparent)`, background: 'rgba(0,0,0,0.3)' }}>
        <span className="font-semibold uppercase tracking-[0.18em]" style={{ color: CONTINUITY_CSS[b.continuity] }}>
          Continuity · {b.continuity}
        </span>
        <span className="text-ink-muted">Judicial holds <span className="font-semibold text-ink">{b.judicialHolds}</span></span>
        <span className="text-ink-muted">Rolled back <span className="font-semibold text-ink">{b.byStatus['rolled-back']}</span></span>
        <span className="text-ink-muted">Redirected <span className="font-semibold text-ink">{b.byStatus.redirected}</span></span>
        <span className="ml-auto text-ink-muted">Resilient national infrastructure — degraded modes recover, they do not fail open</span>
      </div>

      <div>
        <div className="px-1 py-1 text-[9px] font-semibold uppercase tracking-[0.2em] text-ink-soft">▌Judicial interruption — workflows frozen pending legal review</div>
        <div className="border border-line">
          {holds.length === 0 ? <p className="px-2 py-2 text-[10px]" style={{ color: 'rgb(var(--c-ok))' }}>No active judicial interruptions.</p> :
            holds.map(f => (
              <div key={f.id} className="flex items-center gap-2 border-b border-line/60 px-2 py-1 text-[10px] last:border-0">
                <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: '#5fb0ff' }} aria-hidden />
                <span className="w-16 shrink-0 truncate tabular-nums text-ink-muted">{f.id}</span>
                <span className="w-36 shrink-0 truncate text-ink">{f.office}</span>
                <span className="w-40 shrink-0 truncate text-ink-soft">frozen @ {f.stage.label}</span>
                <span className="min-w-0 flex-1 truncate" style={{ color: '#5fb0ff' }}>{f.judicialHoldReason}</span>
              </div>
            ))}
        </div>
      </div>

      <div>
        <div className="px-1 py-1 text-[9px] font-semibold uppercase tracking-[0.2em] text-ink-soft">▌Federated institutional intelligence — advisory, non-sovereign, auditable</div>
        <div className="border border-line">
          {advisories.map(f => (
            <div key={f.id} className="border-b border-line/60 px-2 py-1.5 text-[10px] last:border-0">
              <div className="flex items-center gap-2">
                <span className="w-16 shrink-0 truncate tabular-nums text-ink-muted">{f.id}</span>
                <span className="w-32 shrink-0 truncate text-ink">{f.office}</span>
                <span className="rounded-[2px] border border-line px-1 text-[8px] font-semibold uppercase tracking-[0.08em] text-ink-soft">REC: {f.ai.action}</span>
                <span className="text-ink-muted">conf {Math.round(f.ai.confidence * 100)}%</span>
                <span className="text-ink-muted">approver {f.ai.humanApprover}</span>
                <span className="ml-auto text-ink-muted">overrides {f.ai.overrideHistory}</span>
              </div>
              <div className="mt-0.5 truncate text-[9px] text-ink-muted">
                {f.ai.reasoningChain.join('  ▸  ')} · basis: {f.ai.legalBasis}
              </div>
            </div>
          ))}
        </div>
      </div>
      <p className="text-[9px] text-ink-muted">
        AI cannot override the judiciary, authorize surveillance, independently punish, or bypass constitutional
        separation. Every recommendation exposes its reasoning chain, legal basis, confidence, human approver and override history.
      </p>
    </div>
  );
}
