'use client';

// Transport — National Logistics Network + Infrastructure Maintenance.
// Supply-chain continuity lanes, inter-ministry support, freight
// intelligence; bridge / tunnel / highway integrity with repair dispatch.

import * as React from 'react';
import { transportNetworkBoard, type Tone, type LogisticsLane } from '@/lib/gov/transport-network';

const TONE_COL: Record<Tone, string> = { ok: 'rgb(var(--c-ok))', warn: '#f0a13a', alert: '#e0673a' };
const CARGO_GLYPH: Record<LogisticsLane['cargoClass'], string> = {
  food: '◷', medical: '✚', fuel: '⛁', industrial: '◆', consumer: '▣', 'strategic-reserve': '★',
};

export function LogisticsNetwork({ id, now }: { id: string; now: number }) {
  void id;
  const b = transportNetworkBoard(now);
  const fragile = b.logistics.filter(l => l.continuityPct < 70).length;
  const repairs = b.infrastructure.filter(a => a.repairDispatched).length;
  return (
    <div className="space-y-2 font-mono">
      <div className="flex flex-wrap items-stretch divide-x divide-line border-y border-line bg-black/35">
        <div className="min-w-[150px] flex-1 px-3 py-1.5"><div className="text-[8px] uppercase tracking-[0.16em] text-ink-muted">Logistics lanes</div><div className="text-[16px] font-semibold tabular-nums text-ink">{b.logistics.length}</div></div>
        <div className="min-w-[150px] flex-1 px-3 py-1.5"><div className="text-[8px] uppercase tracking-[0.16em] text-ink-muted">Fragile lanes</div><div className="text-[16px] font-semibold tabular-nums" style={{ color: fragile ? '#e0673a' : 'rgb(var(--c-ok))' }}>{fragile}</div></div>
        <div className="min-w-[150px] flex-1 px-3 py-1.5"><div className="text-[8px] uppercase tracking-[0.16em] text-ink-muted">Infrastructure assets</div><div className="text-[16px] font-semibold tabular-nums text-ink">{b.infrastructure.length}</div></div>
        <div className="min-w-[150px] flex-1 px-3 py-1.5"><div className="text-[8px] uppercase tracking-[0.16em] text-ink-muted">Repairs dispatched</div><div className="text-[16px] font-semibold tabular-nums" style={{ color: '#f0a13a' }}>{repairs}</div></div>
        <div className="min-w-[220px] flex-[2] px-3 py-1.5"><div className="text-[8px] uppercase tracking-[0.16em] text-ink-muted">Doctrine</div><div className="text-[10px] text-ink-soft">Humanitarian routing always pre-empts commercial freight.</div></div>
      </div>

      {/* Logistics lanes */}
      <div>
        <div className="px-1 py-1 text-[9px] font-semibold uppercase tracking-[0.2em] text-ink-soft">▌ National logistics lanes — supply-chain continuity</div>
        <div className="border border-line">
          <div className="flex items-center gap-2 border-b border-line bg-black/35 px-2 py-1 text-[8px] font-semibold uppercase tracking-[0.16em] text-ink-muted">
            <span className="w-6 shrink-0">▣</span>
            <span className="w-56 shrink-0">Lane</span>
            <span className="w-24 shrink-0">Cargo class</span>
            <span className="min-w-0 flex-1">Continuity</span>
            <span className="w-24 shrink-0">Warehouse cover</span>
            <span className="min-w-0 flex-1">Inter-ministry support</span>
          </div>
          {b.logistics.map(l => (
            <div key={l.id} className="flex items-center gap-2 border-b border-line/60 px-2 py-1 text-[10px] last:border-0">
              <span className="w-6 shrink-0 text-center text-ink-muted" aria-hidden>{CARGO_GLYPH[l.cargoClass]}</span>
              <span className="w-56 shrink-0 truncate text-ink">{l.lane}</span>
              <span className="w-24 shrink-0 text-[9px] uppercase tracking-[0.08em] text-ink-soft">{l.cargoClass}</span>
              <span className="flex min-w-0 flex-1 items-center gap-1">
                <span className="relative h-2 min-w-0 flex-1 bg-surface-2">
                  <span className="absolute inset-y-0 left-0" style={{ width: `${l.continuityPct}%`, background: TONE_COL[l.freightIntelligence] }} />
                </span>
                <span className="w-10 shrink-0 text-right tabular-nums" style={{ color: TONE_COL[l.freightIntelligence] }}>{l.continuityPct}%</span>
              </span>
              <span className="w-24 shrink-0 tabular-nums" style={{ color: l.warehouseCoverDays >= 14 ? 'rgb(var(--c-ok))' : l.warehouseCoverDays >= 7 ? '#f0a13a' : '#e0673a' }}>{l.warehouseCoverDays}d</span>
              <span className="flex min-w-0 flex-1 flex-wrap gap-1">
                {l.interMinistrySupport.map(m => (
                  <span key={m} className="rounded-[2px] border px-1 text-[8.5px]" style={{ borderColor: 'color-mix(in srgb,#3aa8e0 40%,transparent)', color: '#3aa8e0' }}>{m}</span>
                ))}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Infrastructure */}
      <div>
        <div className="px-1 py-1 text-[9px] font-semibold uppercase tracking-[0.2em] text-ink-soft">▌ Infrastructure maintenance — bridge / tunnel / highway integrity (weakest-first)</div>
        <div className="border border-line">
          <div className="flex items-center gap-2 border-b border-line bg-black/35 px-2 py-1 text-[8px] font-semibold uppercase tracking-[0.16em] text-ink-muted">
            <span className="w-44 shrink-0">Asset</span>
            <span className="w-24 shrink-0">Type</span>
            <span className="min-w-0 flex-1">Structural integrity</span>
            <span className="w-24 shrink-0">Degradation</span>
            <span className="w-24 shrink-0 text-right">Repair / construction</span>
          </div>
          {b.infrastructure.map(a => (
            <div key={a.id} className="flex items-center gap-2 border-b border-line/60 px-2 py-1 text-[10px] last:border-0">
              <span className="w-44 shrink-0 truncate text-ink">{a.asset}</span>
              <span className="w-24 shrink-0 text-[9px] uppercase tracking-[0.08em] text-ink-soft">{a.type}</span>
              <span className="flex min-w-0 flex-1 items-center gap-1">
                <span className="relative h-2 min-w-0 flex-1 bg-surface-2">
                  <span className="absolute inset-y-0 left-0" style={{ width: `${a.integrityPct}%`, background: a.integrityPct >= 75 ? 'rgb(var(--c-ok))' : a.integrityPct >= 55 ? '#f0a13a' : '#e0673a' }} />
                  <span className="absolute inset-y-0 w-px bg-white/30" style={{ left: '60%' }} aria-hidden />
                </span>
                <span className="w-10 shrink-0 text-right tabular-nums" style={{ color: a.integrityPct >= 75 ? 'rgb(var(--c-ok))' : '#f0a13a' }}>{a.integrityPct}%</span>
              </span>
              <span className="w-24 shrink-0 tabular-nums text-ink-muted">{a.degradationRate}/ep</span>
              <span className="w-24 shrink-0 text-right text-[9px] uppercase tracking-[0.08em]"
                style={{ color: a.repairDispatched ? 'rgb(var(--c-alert))' : 'rgb(var(--c-ok))' }}>
                {a.repairDispatched ? (a.constructionCoordinated ? 'rebuild' : 'repair') : 'nominal'}
              </span>
            </div>
          ))}
        </div>
      </div>
      <p className="text-[9px] text-ink-muted">
        Lane continuity below 70% engages freight-intelligence escalation; asset integrity below 60% activates
        repair dispatch; below 55% triggers construction coordination.
      </p>
    </div>
  );
}
