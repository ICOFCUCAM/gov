'use client';

// Emergency Management — National Emergency Command Center.
// Escalation-level dial (1-5), hazard-striped masthead, regional
// theatre tiles with pulsing status dots, live rescue operations
// table. Emergency amber / disaster crimson / rescue white /
// continuity blue-gray / restrained hazard orange. Monospaced
// tabular type — operational, disciplined, time-pressured.

import * as React from 'react';
import { emergencyResilienceBoard, type EmergencyPosture, type RegionalTheatre, type RescueOperation } from '@/lib/gov/emergency-resilience';

const AMBER = '#d68a2e';
const CRIMSON = '#b8302e';
const RESCUE_WHITE = '#f5f5f0';
const BLUEGRAY = '#4a5a6a';
const BLUEGRAY_DARK = '#2c343c';
const HAZARD = '#c75a2a';
const INK = '#dcdcd8';
const INK_DARK = '#1b1f24';
const PANEL = '#1f242b';
const PANEL2 = '#262c34';
const MUT = '#7e848c';
const OK = '#3a8a82';

const POSTURE_COL: Record<EmergencyPosture, string> = {
  standby: OK, watch: AMBER, engaged: HAZARD, crisis: CRIMSON, 'national-mobilisation': '#7a1817',
};

const THEATRE_COL: Record<RegionalTheatre['status'], string> = {
  nominal: OK, watch: AMBER, engaged: HAZARD, crisis: CRIMSON,
};

const PHASE_COL: Record<RescueOperation['phase'], string> = {
  mobilising: AMBER, 'active-rescue': CRIMSON, containment: HAZARD, stabilising: BLUEGRAY, 'standing-down': OK,
};

// Hazard stripe header — diagonal amber/black bars
function HazardStripe() {
  return (
    <div className="h-2 w-full" style={{
      background: `repeating-linear-gradient(135deg, ${AMBER} 0 12px, ${INK_DARK} 12px 22px)`,
    }} />
  );
}

function EscalationDial({ level, posture }: { level: 1 | 2 | 3 | 4 | 5; posture: EmergencyPosture }) {
  const col = POSTURE_COL[posture];
  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map(i => {
          const active = i <= level;
          const segCol = active ? (i >= 4 ? CRIMSON : i === 3 ? HAZARD : i === 2 ? AMBER : OK) : BLUEGRAY_DARK;
          return (
            <div key={i} className="relative" style={{ width: 28, height: 16 }}>
              <div className="absolute inset-0" style={{
                background: segCol,
                clipPath: 'polygon(0 0, 88% 0, 100% 50%, 88% 100%, 0 100%, 12% 50%)',
                boxShadow: active ? `0 0 8px ${segCol}88` : 'none',
              }} />
              <span className="absolute inset-0 flex items-center justify-center text-[10px] tabular-nums" style={{
                color: active ? RESCUE_WHITE : MUT, fontFamily: 'ui-monospace, "JetBrains Mono", monospace',
              }}>{i}</span>
            </div>
          );
        })}
      </div>
      <div className="rounded-sm px-3 py-1 text-[10px] uppercase tracking-[0.32em]" style={{ background: `${col}22`, color: col, fontFamily: 'ui-monospace, "JetBrains Mono", monospace' }}>
        ▮ {posture.replace(/-/g, ' ')}
      </div>
    </div>
  );
}

function PulseDot({ col }: { col: string }) {
  return (
    <span className="relative inline-block" style={{ width: 10, height: 10 }} aria-hidden>
      <span className="absolute inset-0 rounded-full" style={{ background: col }} />
      <span className="absolute -inset-1 rounded-full" style={{ background: col, opacity: 0.35, animation: 'pulse 2s ease-in-out infinite' }} />
    </span>
  );
}

function CrisisRings({ status, intensity }: { status: RegionalTheatre['status']; intensity: number }) {
  const col = THEATRE_COL[status];
  const rings = status === 'crisis' ? 3 : status === 'engaged' ? 2 : status === 'watch' ? 1 : 0;
  const max = 60;
  return (
    <svg width={70} height={70} viewBox="0 0 70 70" aria-hidden>
      {Array.from({ length: rings }).map((_, i) => (
        <circle key={i} cx={35} cy={35} r={12 + i * 8} fill="none" stroke={col} strokeOpacity={0.45 - i * 0.12} strokeWidth={1.2} strokeDasharray="3 4" />
      ))}
      <circle cx={35} cy={35} r={9} fill={col} fillOpacity={0.85} />
      <text x={35} y={39} textAnchor="middle" fontSize={10} fontWeight={700} fill={RESCUE_WHITE} fontFamily="ui-monospace, monospace">{intensity}</text>
      <text x={35} y={68} textAnchor="middle" fontSize={7} fill={MUT} fontFamily="ui-monospace, monospace">{Math.min(max, intensity)}</text>
    </svg>
  );
}

export function NationalEmergencyCommandCenter({ id, now }: { id: string; now: number }) {
  void id;
  const b = emergencyResilienceBoard(now);
  const c = b.command;
  return (
    <div style={{ background: INK_DARK, color: INK, fontFamily: 'ui-sans-serif, system-ui, sans-serif' }}>
      <HazardStripe />
      {/* Operations masthead — monospaced clock-strip */}
      <header className="px-6 py-5" style={{ background: PANEL, borderBottom: `1px solid ${BLUEGRAY}40` }}>
        <div className="flex items-start justify-between gap-6">
          <div>
            <div className="flex items-baseline gap-3">
              <span className="text-[10px] uppercase tracking-[0.5em]" style={{ color: AMBER, fontFamily: 'ui-monospace, "JetBrains Mono", monospace' }}>NEC ▮ NATIONAL EMERGENCY COMMAND</span>
              <span className="text-[10px]" style={{ color: MUT, fontFamily: 'ui-monospace, monospace' }}>OP-{String(b.epoch).padStart(8, '0')}</span>
            </div>
            <h2 className="mt-2 text-[18px] tracking-[0.04em] uppercase" style={{ color: RESCUE_WHITE }}>{b.bannerLine}</h2>
            <div className="mt-3"><EscalationDial level={c.nationalEscalationLevel} posture={c.posture} /></div>
          </div>
          <div className="grid grid-cols-2 gap-2" style={{ minWidth: '320px' }}>
            {[
              { l: 'ACTIVE CRISES', v: c.activeCrises, c: c.activeCrises >= 4 ? CRIMSON : c.activeCrises ? AMBER : OK },
              { l: 'SEVERITY COMP.', v: c.severityComposite, c: c.severityComposite >= 60 ? CRIMSON : c.severityComposite >= 35 ? HAZARD : OK },
              { l: 'CONTINUITY IDX', v: c.continuityStabilisationIdx, c: c.continuityStabilisationIdx >= 75 ? OK : AMBER },
              { l: 'READINESS', v: `${c.responseReadinessPct}%`, c: c.responseReadinessPct >= 60 ? OK : AMBER },
            ].map(x => (
              <div key={x.l} className="px-3 py-2" style={{ background: PANEL2, borderLeft: `2px solid ${x.c}` }}>
                <div className="text-[8.5px] uppercase tracking-[0.24em]" style={{ color: MUT, fontFamily: 'ui-monospace, monospace' }}>{x.l}</div>
                <div className="mt-0.5 tabular-nums text-[18px]" style={{ color: x.c, fontFamily: 'ui-monospace, monospace' }}>{x.v}</div>
              </div>
            ))}
          </div>
        </div>
      </header>

      {/* Regional theatres */}
      <section className="px-6 py-5" style={{ background: INK_DARK, borderBottom: `1px solid ${BLUEGRAY}30` }}>
        <div className="mb-3 flex items-baseline justify-between">
          <h3 className="text-[10px] uppercase tracking-[0.36em]" style={{ color: AMBER, fontFamily: 'ui-monospace, monospace' }}>◉ REGIONAL THEATRES</h3>
          <span className="text-[9px] uppercase tracking-[0.24em]" style={{ color: MUT, fontFamily: 'ui-monospace, monospace' }}>
            multi-agency · {c.multiAgencyCoordinationIdx} · resilience · {c.resilienceIdx}
          </span>
        </div>
        <div className="grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-3">
          {c.theatres.map(t => (
            <div key={t.region} className="grid grid-cols-[70px_1fr] items-center gap-3 px-4 py-3" style={{ background: PANEL, borderTop: `2px solid ${THEATRE_COL[t.status]}` }}>
              <CrisisRings status={t.status} intensity={t.activeIncidents} />
              <div>
                <div className="flex items-baseline justify-between">
                  <span className="text-[12px]" style={{ color: RESCUE_WHITE }}>{t.region}</span>
                  <span className="flex items-center gap-2 text-[9px] uppercase tracking-[0.22em]" style={{ color: THEATRE_COL[t.status], fontFamily: 'ui-monospace, monospace' }}>
                    <PulseDot col={THEATRE_COL[t.status]} /> {t.status}
                  </span>
                </div>
                <div className="mt-2 grid grid-cols-3 gap-2 text-[10px]" style={{ fontFamily: 'ui-monospace, monospace' }}>
                  <div>
                    <div className="uppercase tracking-[0.18em]" style={{ color: MUT, fontSize: '8.5px' }}>RESPOND.</div>
                    <div className="tabular-nums" style={{ color: INK }}>{t.respondersDeployed.toLocaleString()}</div>
                  </div>
                  <div>
                    <div className="uppercase tracking-[0.18em]" style={{ color: MUT, fontSize: '8.5px' }}>POP AFF.</div>
                    <div className="tabular-nums" style={{ color: INK }}>{t.populationAffectedK.toLocaleString()}K</div>
                  </div>
                  <div>
                    <div className="uppercase tracking-[0.18em]" style={{ color: MUT, fontSize: '8.5px' }}>RECOVERY</div>
                    <div className="tabular-nums" style={{ color: t.recoveryStartedPct >= 60 ? OK : AMBER }}>{t.recoveryStartedPct}%</div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Rescue operations */}
      <section className="px-6 py-5" style={{ background: PANEL }}>
        <div className="mb-3 flex items-baseline justify-between">
          <h3 className="text-[10px] uppercase tracking-[0.36em]" style={{ color: AMBER, fontFamily: 'ui-monospace, monospace' }}>↦ ACTIVE RESCUE OPERATIONS</h3>
          <span className="text-[9px] uppercase tracking-[0.24em]" style={{ color: MUT, fontFamily: 'ui-monospace, monospace' }}>
            responders · {b.response.respondersAvailableK}/{b.response.respondersTotalK}K avail · veh {b.response.rescueVehiclesDeployed} · air {b.response.aerialAssetsDeployed} · marine {b.response.marineAssetsDeployed}
          </span>
        </div>
        <div className="overflow-hidden" style={{ background: INK_DARK }}>
          <div className="grid grid-cols-[80px_120px_100px_1fr_80px_70px_70px_100px] gap-2 px-3 py-2 text-[9px] uppercase tracking-[0.22em]" style={{ color: MUT, background: PANEL2, fontFamily: 'ui-monospace, monospace' }}>
            <span>OP-ID</span><span>KIND</span><span>REGION</span><span>PHASE</span><span className="text-right">SEV</span><span className="text-right">EVAC K</span><span className="text-right">RESC.</span><span className="text-right">RESP.MIN</span>
          </div>
          {b.response.rescueOperations.map(o => (
            <div key={o.id} className="grid grid-cols-[80px_120px_100px_1fr_80px_70px_70px_100px] items-center gap-2 px-3 py-2 text-[11px]" style={{ borderTop: `1px solid ${BLUEGRAY}20`, fontFamily: 'ui-monospace, monospace' }}>
              <span style={{ color: MUT }}>{o.id}</span>
              <span style={{ color: INK }}>{o.kind.replace(/-/g, ' ')}</span>
              <span style={{ color: MUT }}>{o.region}</span>
              <span className="flex items-center gap-2" style={{ color: PHASE_COL[o.phase] }}>
                <PulseDot col={PHASE_COL[o.phase]} /> {o.phase}
              </span>
              <span className="text-right uppercase" style={{ color: o.severity === 'catastrophic' ? CRIMSON : o.severity === 'severe' ? HAZARD : o.severity === 'elevated' ? AMBER : OK }}>{o.severity}</span>
              <span className="text-right tabular-nums" style={{ color: INK }}>{o.evacueesK}</span>
              <span className="text-right tabular-nums" style={{ color: OK }}>{o.rescuedToday}</span>
              <span className="text-right tabular-nums" style={{ color: o.meanResponseMin >= 25 ? CRIMSON : o.meanResponseMin >= 15 ? AMBER : OK }}>{o.meanResponseMin}m</span>
            </div>
          ))}
        </div>
      </section>

      <HazardStripe />
    </div>
  );
}
