'use client';

// Transport — National Mobility Command Theater. Sovereign corridor flow,
// regional congestion lattice, route-stabilization posture. Steel /
// asphalt chrome with industrial-blue + amber-logistics + restrained-
// orange accents — no consumer-mobility, no smart-city marketing.

import * as React from 'react';
import { transportNetworkBoard, type MobilityPosture, type Tone, type CorridorState } from '@/lib/gov/transport-network';

const POSTURE_COL: Record<MobilityPosture, string> = {
  flowing: 'rgb(var(--c-ok))', engaged: '#3aa8e0',
  congested: '#f0a13a', critical: '#e0673a', 'collapse-watch': 'rgb(var(--c-alert))',
};
const TONE_COL: Record<Tone, string> = { ok: 'rgb(var(--c-ok))', warn: '#f0a13a', alert: '#e0673a' };
const CONG_COL: Record<CorridorState['congestion'], string> = {
  free: 'rgb(var(--c-ok))', flowing: '#3aa8e0', heavy: '#f0a13a', bottleneck: '#e0673a', collapse: 'rgb(var(--c-alert))',
};
const MODE_GLYPH: Record<CorridorState['mode'], string> = { Road: '═', Rail: '═╬═', Maritime: '~~', Aviation: '∢' };

export function MobilityCommandTheater({ id, now }: { id: string; now: number }) {
  void id;
  const b = transportNetworkBoard(now);
  const c = b.command;
  return (
    <div className="space-y-2 font-mono"
      style={{ background: 'linear-gradient(180deg, rgba(48,58,72,0.12) 0%, transparent 80%)' }}>
      {/* Posture banner */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-y px-3 py-2 text-[11px]"
        style={{ borderColor: `color-mix(in srgb,${POSTURE_COL[c.posture]} 50%,transparent)`, background: 'rgba(0,0,0,0.42)' }}>
        <span className="text-[9px] uppercase tracking-[0.22em] text-ink-muted">National circulation</span>
        <span className="text-[16px] font-bold uppercase tracking-[0.16em]" style={{ color: POSTURE_COL[c.posture] }}>{c.posture}</span>
        <span className="text-ink-muted">throughput <span className="font-semibold text-ink tabular-nums">{c.nationalThroughputKt}kt/d</span></span>
        <span className="text-ink-muted">avg load <span className="font-semibold tabular-nums" style={{ color: c.averageLoadPct >= 95 ? '#e0673a' : c.averageLoadPct >= 80 ? '#f0a13a' : 'rgb(var(--c-ok))' }}>{c.averageLoadPct}%</span></span>
        <span className="text-ink-muted">bottlenecks <span className="font-semibold tabular-nums" style={{ color: c.bottlenecks ? '#e0673a' : 'rgb(var(--c-ok))' }}>{c.bottlenecks}</span></span>
        <span className="text-ink-muted">emergency corridors <span className="font-semibold tabular-nums" style={{ color: c.emergencyCorridorsActive ? 'rgb(var(--c-alert))' : 'rgb(var(--c-ok))' }}>{c.emergencyCorridorsActive}</span></span>
        <span className="ml-auto text-[9px] text-ink-muted">{b.systemBanner}</span>
      </div>

      {/* Corridor flow lattice */}
      <div>
        <div className="px-1 py-1 text-[9px] font-semibold uppercase tracking-[0.2em] text-ink-soft">▌ National corridor flow — kinetic load distribution</div>
        <div className="border border-line">
          <div className="flex items-center gap-2 border-b border-line bg-black/35 px-2 py-1 text-[8px] font-semibold uppercase tracking-[0.16em] text-ink-muted">
            <span className="w-32 shrink-0">Corridor</span>
            <span className="w-16 shrink-0">Mode</span>
            <span className="min-w-0 flex-1">Load · congestion vector</span>
            <span className="w-24 shrink-0">Throughput</span>
            <span className="w-24 shrink-0">Congestion</span>
            <span className="w-28 shrink-0 text-right">Stabilization</span>
          </div>
          {c.corridors.map(co => (
            <div key={co.id} className="flex items-center gap-2 border-b border-line/60 px-2 py-1 text-[10px] last:border-0">
              <span className="w-32 shrink-0 truncate text-ink">{co.name}</span>
              <span className="w-16 shrink-0 text-[9px] uppercase tracking-[0.1em] text-ink-soft"><span className="font-mono text-ink-muted" aria-hidden>{MODE_GLYPH[co.mode]}</span> {co.mode}</span>
              <span className="flex min-w-0 flex-1 items-center gap-1">
                <span className="relative h-2 min-w-0 flex-1 bg-surface-2">
                  <span className="absolute inset-y-0 left-0" style={{ width: `${Math.min(100, co.loadPct * 0.7)}%`, background: TONE_COL[co.tone] }} />
                  <span className="absolute inset-y-0 w-px bg-white/40" style={{ left: '70%' }} aria-hidden />
                </span>
                <span className="w-10 shrink-0 text-right tabular-nums" style={{ color: TONE_COL[co.tone] }}>{co.loadPct}%</span>
              </span>
              <span className="w-24 shrink-0 tabular-nums text-ink">{co.throughputKt}kt</span>
              <span className="w-24 shrink-0 text-[9px] uppercase tracking-[0.08em]" style={{ color: CONG_COL[co.congestion] }}>{co.congestion}</span>
              <span className="w-28 shrink-0 text-right text-[9px] uppercase tracking-[0.08em]"
                style={{ color: co.stabilization === 'emergency-corridor' ? 'rgb(var(--c-alert))' : co.stabilization === 'rerouting' ? '#f0a13a' : 'rgb(var(--c-ok))' }}>
                {co.stabilization}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Regional congestion heat */}
      <div>
        <div className="px-1 py-1 text-[9px] font-semibold uppercase tracking-[0.2em] text-ink-soft">▌ Regional congestion heat</div>
        <div className="grid grid-cols-2 gap-px border border-line bg-line sm:grid-cols-3 lg:grid-cols-6">
          {c.regionalCongestion.map(r => (
            <div key={r.region} className="px-2 py-1.5"
              style={{ background: `linear-gradient(180deg, color-mix(in srgb,${TONE_COL[r.tone]} ${Math.round(r.congestionPct / 4)}%, #0a1018) 0%, #03070f 100%)` }}>
              <div className="text-[8px] uppercase tracking-[0.16em] text-ink-muted">{r.region}</div>
              <div className="mt-1 text-[15px] font-semibold tabular-nums text-ink">{r.congestionPct}%</div>
              <div className="mt-1 h-1 w-full bg-surface-2">
                <span className="block h-full" style={{ width: `${Math.min(100, r.congestionPct)}%`, background: TONE_COL[r.tone] }} />
              </div>
            </div>
          ))}
        </div>
      </div>
      <p className="text-[9px] text-ink-muted">
        Corridor load past 70% engages rerouting; past 100% triggers emergency-corridor activation. The white marker
        is the rerouting threshold. Civilian-continuity priority always pre-empts commercial throughput.
      </p>
    </div>
  );
}
