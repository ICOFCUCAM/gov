'use client';

// Trade & Industry — National Industrial Command.
// Industrial lattice of factory clusters, capacity rails, output
// continuity ledgers. Steel industrial gray / export blue /
// manufacturing amber / metallic silver / deep production navy.
// Distinguishing geometry: dense capacity-bar rails, factory tile
// matrix, throughput gauges (no chamber, no manuscript, no clinical
// circles).

import * as React from 'react';
import { industrialContinuityBoard, type FactoryCluster, type IndustrialPosture } from '@/lib/gov/industrial-continuity';

const STEEL = '#3c424d';
const STEEL_DARK = '#2a2e36';
const PANEL = '#23272f';
const PANEL2 = '#1c1f25';
const EXPORT_BLUE = '#3a78c4';
const AMBER = '#c98538';
const SILVER = '#c4c8d0';
const NAVY = '#1c3a6a';
const INK = '#dbdee4';
const MUT = '#7c828d';
const ALERT = '#c44a3a';
const RIVET = 'rgba(196,200,208,0.18)';

const STATUS_COL: Record<FactoryCluster['status'], string> = {
  nominal: EXPORT_BLUE, derated: AMBER, priority: SILVER, halted: ALERT,
};

const POSTURE_TONE: Record<IndustrialPosture, string> = {
  productive: EXPORT_BLUE, engaged: EXPORT_BLUE, pressured: AMBER, contraction: '#a05538', 'industrial-crisis': ALERT,
};

function CapacityRail({ cap, util, color }: { cap: number; util: number; color: string }) {
  return (
    <div className="relative h-2 w-full" style={{ background: '#15171c', boxShadow: 'inset 0 1px 0 rgba(0,0,0,0.6)' }}>
      <div className="absolute inset-y-0 left-0" style={{ width: `${Math.min(100, cap)}%`, background: RIVET }} />
      <div className="absolute inset-y-0 left-0" style={{ width: `${Math.min(100, util)}%`, background: color, boxShadow: `0 0 8px ${color}55` }} />
      {/* shift ticks */}
      {[33, 66].map(t => <div key={t} className="absolute inset-y-0" style={{ left: `${t}%`, width: '1px', background: 'rgba(0,0,0,0.45)' }} />)}
    </div>
  );
}

export function NationalIndustrialCommand({ id, now }: { id: string; now: number }) {
  void id;
  const b = industrialContinuityBoard(now);
  const c = b.command;
  const halted = c.clusters.filter(x => x.status === 'halted').length;
  const priority = c.clusters.filter(x => x.status === 'priority').length;
  return (
    <div style={{ fontFamily: 'ui-sans-serif, system-ui, sans-serif', color: INK }}>
      {/* Industrial masthead — riveted plate */}
      <div className="relative" style={{ background: `linear-gradient(180deg, ${STEEL} 0%, ${STEEL_DARK} 100%)`, borderTop: `1px solid ${RIVET}`, borderBottom: `1px solid ${RIVET}` }}>
        {/* rivets */}
        <div className="pointer-events-none absolute inset-x-3 top-1 flex justify-between">
          {Array.from({ length: 18 }).map((_, i) => <span key={i} className="block h-1 w-1 rounded-full" style={{ background: RIVET }} />)}
        </div>
        <div className="pointer-events-none absolute inset-x-3 bottom-1 flex justify-between">
          {Array.from({ length: 18 }).map((_, i) => <span key={i} className="block h-1 w-1 rounded-full" style={{ background: RIVET }} />)}
        </div>
        <div className="flex items-center justify-between px-6 py-5">
          <div>
            <div className="text-[9px] uppercase tracking-[0.4em]" style={{ color: SILVER }}>NATIONAL INDUSTRIAL COMMAND ▮▮▮ EPOCH {String(b.epoch).padStart(6, '0')}</div>
            <h2 className="mt-2 text-[18px] tracking-[0.05em]" style={{ color: '#f1f3f7' }}>{b.bannerLine}</h2>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-block h-3 w-3" style={{ background: POSTURE_TONE[c.posture], boxShadow: `0 0 10px ${POSTURE_TONE[c.posture]}88` }} />
            <span className="text-[11px] uppercase tracking-[0.32em]" style={{ color: POSTURE_TONE[c.posture] }}>{c.posture.replace('-', ' ')}</span>
          </div>
        </div>
        {/* readout strip */}
        <div className="grid grid-cols-2 md:grid-cols-6" style={{ borderTop: `1px solid ${RIVET}` }}>
          {[
            { l: 'OUTPUT CONT.', v: c.outputContinuityIdx, u: '', t: c.outputContinuityIdx >= 75 ? EXPORT_BLUE : c.outputContinuityIdx >= 55 ? AMBER : ALERT },
            { l: 'MFG CAPACITY', v: c.manufacturingCapacityPct, u: '%', t: c.manufacturingCapacityPct >= 90 ? EXPORT_BLUE : AMBER },
            { l: 'NETWORK UTIL', v: c.factoryNetworkUtilisationPct, u: '%', t: c.factoryNetworkUtilisationPct >= 70 ? EXPORT_BLUE : AMBER },
            { l: 'STRATEGIC PRI', v: c.strategicPrioritisationIdx, u: '', t: SILVER },
            { l: 'RESILIENCE', v: c.resiliencePostureIdx, u: '', t: c.resiliencePostureIdx >= 75 ? EXPORT_BLUE : AMBER },
            { l: 'CHAIN STABLE', v: c.supplyChainStabilisationIdx, u: '', t: c.supplyChainStabilisationIdx >= 75 ? EXPORT_BLUE : AMBER },
          ].map(x => (
            <div key={x.l} className="px-4 py-3" style={{ borderRight: `1px solid ${RIVET}`, background: STEEL_DARK }}>
              <div className="text-[8.5px] uppercase tracking-[0.32em]" style={{ color: MUT }}>{x.l}</div>
              <div className="mt-1 tabular-nums text-[17px]" style={{ color: x.t }}>{x.v}{x.u}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Factory lattice */}
      <section style={{ background: PANEL, padding: '20px 24px', borderBottom: `1px solid ${RIVET}` }}>
        <div className="mb-4 flex items-baseline justify-between">
          <h3 className="text-[11px] uppercase tracking-[0.32em]" style={{ color: SILVER }}>▮ FACTORY NETWORK · CAPACITY LATTICE</h3>
          <div className="flex items-center gap-4 text-[9px] uppercase tracking-[0.24em]" style={{ color: MUT }}>
            <span>halted <span className="ml-1 tabular-nums" style={{ color: halted ? ALERT : MUT }}>{halted}</span></span>
            <span>priority <span className="ml-1 tabular-nums" style={{ color: priority ? SILVER : MUT }}>{priority}</span></span>
            <span>{c.clusters.length} clusters</span>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
          {c.clusters.map(f => (
            <div key={f.id} className="relative" style={{ background: PANEL2, border: `1px solid ${RIVET}` }}>
              {/* corner rivets */}
              {[0, 1, 2, 3].map(i => (
                <span key={i} className="absolute h-1 w-1" style={{
                  background: RIVET,
                  top: i < 2 ? '4px' : 'auto',
                  bottom: i >= 2 ? '4px' : 'auto',
                  left: i % 2 === 0 ? '4px' : 'auto',
                  right: i % 2 === 1 ? '4px' : 'auto',
                }} />
              ))}
              <div className="px-4 pt-3">
                <div className="flex items-baseline justify-between">
                  <span className="tabular-nums text-[9px]" style={{ color: MUT }}>{f.id}</span>
                  <span className="text-[9px] uppercase tracking-[0.24em]" style={{ color: STATUS_COL[f.status] }}>▮ {f.status}</span>
                </div>
                <div className="mt-1 text-[13px]" style={{ color: INK }}>{f.cluster}</div>
                <div className="text-[10px]" style={{ color: MUT }}>{f.region} · {f.shiftsRunning}-shift</div>
              </div>
              <div className="px-4 pb-3 pt-3">
                <div className="mb-1 flex items-baseline justify-between text-[9px] uppercase tracking-[0.18em]" style={{ color: MUT }}>
                  <span>UTIL <span className="ml-1 tabular-nums" style={{ color: STATUS_COL[f.status] }}>{f.utilisationPct}%</span></span>
                  <span>CAP <span className="ml-1 tabular-nums" style={{ color: SILVER }}>{f.capacityPct}%</span></span>
                </div>
                <CapacityRail cap={f.capacityPct} util={f.utilisationPct} color={STATUS_COL[f.status]} />
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Footer telemetry strip */}
      <div className="flex items-center justify-between px-6 py-3 text-[9px] uppercase tracking-[0.32em]" style={{ background: STEEL_DARK, color: MUT }}>
        <span>▮▮ INDUSTRIAL COMMAND CHANNEL · ENGAGED ▮▮</span>
        <span style={{ color: NAVY === POSTURE_TONE[c.posture] ? SILVER : POSTURE_TONE[c.posture] }}>· {c.posture}</span>
      </div>
    </div>
  );
}
