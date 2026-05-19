'use client';

// Interior National Apex — Sovereign National Digital Twin. A live
// operational twin of the nation: per-shell effective strain (base +
// causal propagation), fracture points and national continuity mode.

import * as React from 'react';
import { digitalTwin } from '@/lib/gov/national-causality';

const POS: Record<string, string> = {
  stable: 'rgb(var(--c-ok))', strained: 'rgb(var(--c-warn))',
  overloaded: '#e0673a', fracturing: 'rgb(var(--c-alert))',
};

export function NationalDigitalTwin({ id, now }: { id: string; now: number }) {
  void id;
  const t = digitalTwin(now);
  return (
    <div className="space-y-2 font-mono">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-y px-3 py-2 text-[11px]"
        style={{ borderColor: `color-mix(in srgb,${t.fractureCount ? 'rgb(var(--c-alert))' : 'rgb(var(--c-ok))'} 45%,transparent)`, background: 'rgba(0,0,0,0.3)' }}>
        <span className="text-[9px] uppercase tracking-[0.18em] text-ink-muted">National continuity mode</span>
        <span className="text-[14px] font-semibold uppercase tracking-[0.12em] text-ink">{t.continuity}</span>
        <span className="text-ink-muted">mean strain <span className="font-semibold text-ink tabular-nums">{t.meanStrain}</span></span>
        <span className="text-ink-muted">fractures <span className="font-semibold tabular-nums" style={{ color: t.fractureCount ? 'rgb(var(--c-alert))' : 'rgb(var(--c-ok))' }}>{t.fractureCount}</span></span>
        <span className="ml-auto text-[9px] text-ink-muted">federated constitutional organism · {t.shells.length} shells</span>
      </div>

      <div className="border border-line">
        <div className="flex items-center gap-2 border-b border-line bg-black/30 px-2 py-1 text-[8px] font-semibold uppercase tracking-[0.16em] text-ink-muted">
          <span className="w-44 shrink-0">Sovereign shell</span>
          <span className="w-16 shrink-0">Kind</span>
          <span className="w-36 shrink-0">Base → effective strain</span>
          <span className="w-20 shrink-0">Inbound</span>
          <span className="w-24 shrink-0">Posture</span>
          <span className="min-w-0 flex-1">Effective</span>
        </div>
        {[...t.shells].sort((a, b) => b.effectiveStrain - a.effectiveStrain).map(s => (
          <div key={s.key} className="flex items-center gap-2 border-b border-line/60 px-2 py-1 text-[10px] last:border-0">
            <span className="w-44 shrink-0 truncate text-ink">{s.label}</span>
            <span className="w-16 shrink-0 text-[8px] uppercase tracking-[0.08em] text-ink-muted">{s.kind}</span>
            <span className="w-36 shrink-0 tabular-nums text-ink-muted">{s.baseStrain} → <span className="text-ink">{s.effectiveStrain}</span></span>
            <span className="w-20 shrink-0 tabular-nums" style={{ color: s.inbound > 0 ? 'rgb(var(--c-alert))' : s.inbound < 0 ? 'rgb(var(--c-ok))' : 'rgb(var(--c-ink-muted))' }}>{s.inbound > 0 ? '+' : ''}{s.inbound}</span>
            <span className="w-24 shrink-0 text-[9px] font-semibold uppercase tracking-[0.06em]" style={{ color: POS[s.posture] }}>{s.posture}</span>
            <span className="flex min-w-0 flex-1 items-center gap-1">
              <span className="relative h-2 min-w-0 flex-1 bg-surface-2">
                <span className="absolute inset-y-0 left-0" style={{ width: `${Math.min(100, s.effectiveStrain / 1.8)}%`, background: POS[s.posture] }} />
                <span className="absolute inset-y-0 w-px bg-white/40" style={{ left: `${115 / 1.8}%` }} aria-hidden />
              </span>
              <span className="w-8 shrink-0 text-right tabular-nums" style={{ color: POS[s.posture] }}>{s.effectiveStrain}</span>
            </span>
          </div>
        ))}
      </div>
      <p className="text-[9px] text-ink-muted">
        The white marker is the fracture threshold. Interior shells derive strain from the live economy board; external
        ministries contribute federated posture only — no internal data crosses the constitutional shell line.
      </p>
    </div>
  );
}
