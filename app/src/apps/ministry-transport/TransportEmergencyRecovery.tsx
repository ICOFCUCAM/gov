'use client';

// Transport — Emergency & Recovery Operations.
// Infrastructure failure register progressing through 6 recovery
// phases (isolation → restored), evacuation corridor lanes with
// utilisation gauges, repair crew dispatch list. Industrial steel/
// orange palette extending existing Transport surfaces but with new
// geometry: corridor flow arrows for evacuation lanes, phase pip
// rail for recovery — not a clone of the energy version.

import * as React from 'react';
import { transportExtendedBoard, type InfrastructureFailure, type EvacuationCorridor, type RecoveryPhase, type TransportMode } from '@/lib/gov/transport-extended';

const STEEL_DEEP = '#0d1117';
const STEEL = '#161b22';
const PANEL = '#1c2330';
const PANEL2 = '#222a38';
const ORANGE = '#e0673a';
const AMBER = '#f0a13a';
const TEAL = '#3aa39c';
const NAVY = '#3a5680';
const RED = '#c44a3a';
const INK = '#d8dde2';
const PARCH = '#eaecef';
const MUT = '#7e8590';
const RULE = 'rgba(224,103,58,0.22)';

const PHASES: RecoveryPhase[] = ['isolation', 'damage-survey', 'repair-dispatch', 'detour-routing', 'partial-reopen', 'restored'];
const PHASE_COL: Record<RecoveryPhase, string> = {
  isolation: RED, 'damage-survey': ORANGE, 'repair-dispatch': AMBER, 'detour-routing': AMBER, 'partial-reopen': TEAL, restored: TEAL,
};

const MODE_GLYPH: Record<TransportMode, string> = {
  highway: '▰', rail: '═', aviation: '✈', maritime: '⛴', 'urban-transit': '◐', 'bridge-tunnel': '⌒',
};

const CAUSE_GLYPH: Record<InfrastructureFailure['cause'], string> = {
  flood: '≋', collapse: '◬', collision: '↯', wildfire: '🜂', storm: '⛈', subsidence: '◊', 'cyber-incident': '⌬',
};

const EVAC_COL: Record<EvacuationCorridor['status'], string> = {
  activated: TEAL, 'priority-lanes-open': AMBER, 'capacity-pressured': RED, closed: MUT,
};

function PhaseRail({ phase }: { phase: RecoveryPhase }) {
  const idx = PHASES.indexOf(phase);
  return (
    <div className="flex items-center gap-1">
      {PHASES.map((p, i) => (
        <React.Fragment key={p}>
          <span style={{
            width: i === idx ? 14 : 8, height: 4,
            background: i <= idx ? PHASE_COL[phase] : 'rgba(224,103,58,0.18)',
            borderRadius: 1,
          }} />
          {i < PHASES.length - 1 ? <span style={{ width: 6, height: 1, background: i < idx ? PHASE_COL[phase] : RULE }} /> : null}
        </React.Fragment>
      ))}
    </div>
  );
}

// Corridor flow ribbon (utilisation as filled track + arrow)
function CorridorFlow({ utilisationPct, col }: { utilisationPct: number; col: string }) {
  const w = 220, h = 22;
  const filled = Math.min(100, utilisationPct);
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="block" aria-hidden>
      <rect x={0} y={h / 2 - 5} width={w - 10} height={10} fill={STEEL_DEEP} />
      <rect x={0} y={h / 2 - 5} width={(w - 10) * (filled / 100)} height={10} fill={col} />
      {/* arrow tip */}
      <polygon points={`${w - 10},${h / 2 - 8} ${w},${h / 2} ${w - 10},${h / 2 + 8}`} fill={col} />
      {/* dashed flow ticks */}
      {Array.from({ length: 8 }).map((_, i) => (
        <line key={i} x1={(w - 10) * (i / 8)} y1={h / 2 - 5} x2={(w - 10) * (i / 8)} y2={h / 2 + 5} stroke="rgba(255,255,255,0.12)" />
      ))}
    </svg>
  );
}

export function TransportEmergencyRecovery({ id, now }: { id: string; now: number }) {
  void id;
  const b = transportExtendedBoard(now);
  const e = b.emergency;
  const posCol = e.posture === 'national-recovery' ? RED : e.posture === 'major-disruption' ? ORANGE : e.posture === 'engaged' ? AMBER : TEAL;
  return (
    <div style={{ background: STEEL_DEEP, color: INK, fontFamily: 'ui-sans-serif, "Inter", system-ui, sans-serif' }}>
      {/* Lane stripe header — distinct from energy's high-voltage stripe */}
      <div className="h-1 w-full" style={{ background: `repeating-linear-gradient(90deg, ${ORANGE} 0 32px, transparent 32px 48px)` }} />

      <header className="px-8 py-5" style={{ background: 'linear-gradient(180deg, #1c2330 0%, #0d1117 100%)', borderBottom: `1px solid ${RULE}` }}>
        <div className="flex items-baseline justify-between">
          <div>
            <div className="text-[10px] uppercase tracking-[0.42em]" style={{ color: ORANGE }}>NLO ▸ NATIONAL LOGISTICS &amp; MOBILITY · RECOVERY OPS</div>
            <h2 className="mt-2 text-[18px] tracking-[0.04em]" style={{ color: PARCH }}>
              {e.failures.length} active infrastructure failures · rerouted load {e.reroutedNationalLoadPct}% · mean ETR {e.meanRestorationHrs}h
            </h2>
          </div>
          <div className="flex items-center gap-3">
            <span className="block h-3 w-3 rounded-sm" style={{ background: posCol, boxShadow: `0 0 8px ${posCol}88` }} />
            <span className="text-[11px] uppercase tracking-[0.32em]" style={{ color: posCol }}>{e.posture.replace(/-/g, ' ')}</span>
          </div>
        </div>
      </header>

      {/* Active infrastructure failures */}
      <section className="px-8 py-5" style={{ background: STEEL_DEEP, borderBottom: `1px solid ${RULE}` }}>
        <h3 className="mb-3 text-[10px] uppercase tracking-[0.36em]" style={{ color: ORANGE }}>▰ ACTIVE INFRASTRUCTURE FAILURES · {e.failures.length}</h3>
        <div className="space-y-2">
          {e.failures.map(f => (
            <article key={f.id} className="grid grid-cols-[80px_1fr] gap-px" style={{ background: RULE }}>
              <div className="px-4 py-3 text-center" style={{ background: STEEL_DEEP }}>
                <div className="text-[20px]" style={{ color: PHASE_COL[f.phase] }}>{MODE_GLYPH[f.mode]}</div>
                <div className="mt-1 tabular-nums text-[10px]" style={{ color: MUT }}>{f.id}</div>
                <div className="mt-1 text-[18px]" style={{ color: AMBER }}>{CAUSE_GLYPH[f.cause]}</div>
              </div>
              <div className="px-4 py-3" style={{ background: STEEL }}>
                <div className="flex items-baseline justify-between">
                  <span className="text-[12px]" style={{ color: PARCH }}>{f.asset}</span>
                  <span className="text-[10px] uppercase tracking-[0.2em]" style={{ color: PHASE_COL[f.phase] }}>{f.phase.replace(/-/g, ' ')}</span>
                </div>
                <div className="mt-0.5 text-[10px] italic" style={{ color: MUT }}>{f.mode} · {f.cause} · {f.region} · {f.startedHrsAgo}h ago</div>
                <div className="mt-2"><PhaseRail phase={f.phase} /></div>
                <div className="mt-2 grid grid-cols-4 gap-3 text-[10px]">
                  <div>
                    <div className="uppercase tracking-[0.18em]" style={{ color: MUT, fontSize: '8.5px' }}>POP DISRUPTED</div>
                    <div className="tabular-nums" style={{ color: f.populationDisruptedK >= 200 ? RED : AMBER }}>{f.populationDisruptedK.toLocaleString()}K</div>
                  </div>
                  <div>
                    <div className="uppercase tracking-[0.18em]" style={{ color: MUT, fontSize: '8.5px' }}>FREIGHT KT</div>
                    <div className="tabular-nums" style={{ color: INK }}>{f.freightDisruptedTonsK.toLocaleString()}</div>
                  </div>
                  <div>
                    <div className="uppercase tracking-[0.18em]" style={{ color: MUT, fontSize: '8.5px' }}>DETOURS</div>
                    <div className="tabular-nums" style={{ color: INK }}>{f.detoursActive}</div>
                  </div>
                  <div>
                    <div className="uppercase tracking-[0.18em]" style={{ color: MUT, fontSize: '8.5px' }}>ETR</div>
                    <div className="tabular-nums" style={{ color: f.estimatedRestorationHrs > 24 ? RED : AMBER }}>{f.estimatedRestorationHrs}h</div>
                  </div>
                </div>
                <div className="mt-2 h-1" style={{ background: STEEL_DEEP }}>
                  <div className="h-full" style={{ width: `${100 - f.reroutedTrafficPctOfNormal}%`, background: TEAL }} />
                </div>
                <div className="mt-0.5 flex items-baseline justify-between text-[9px] uppercase tracking-[0.18em]">
                  <span style={{ color: MUT }}>FLOW INTACT <span className="tabular-nums" style={{ color: TEAL }}>{100 - f.reroutedTrafficPctOfNormal}%</span></span>
                  <span style={{ color: MUT }}>REROUTED <span className="tabular-nums" style={{ color: ORANGE }}>{f.reroutedTrafficPctOfNormal}%</span></span>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* Evacuation corridors + repair crews */}
      <section className="grid grid-cols-1 gap-px lg:grid-cols-[1fr_360px]" style={{ background: RULE }}>
        <div className="px-8 py-5" style={{ background: STEEL_DEEP }}>
          <h3 className="mb-3 text-[10px] uppercase tracking-[0.36em]" style={{ color: ORANGE }}>⇉ EVACUATION CORRIDORS · CAPACITY LANES</h3>
          <div className="space-y-2">
            {e.evacuationCorridors.map(ec => (
              <div key={ec.id} className="grid grid-cols-[150px_1fr_220px_70px_90px] items-center gap-3 px-4 py-3" style={{ background: STEEL, borderLeft: `3px solid ${EVAC_COL[ec.status]}` }}>
                <div>
                  <div className="text-[10px] uppercase tracking-[0.2em]" style={{ color: PARCH }}>{ec.region}</div>
                  <div className="text-[9px]" style={{ color: MUT }}>{ec.modesActive.join(' · ')}</div>
                </div>
                <div className="text-[11px]" style={{ color: INK }}>
                  <span style={{ color: AMBER }}>{ec.origin}</span>
                  <span className="mx-2" style={{ color: ORANGE }}>↦</span>
                  <span style={{ color: TEAL }}>{ec.destination}</span>
                </div>
                <CorridorFlow utilisationPct={ec.utilisationPct} col={EVAC_COL[ec.status]} />
                <span className="text-right tabular-nums text-[11px]" style={{ color: EVAC_COL[ec.status] }}>{ec.utilisationPct}%</span>
                <span className="text-right text-[9px] uppercase tracking-[0.18em]" style={{ color: EVAC_COL[ec.status] }}>· {ec.status.replace(/-/g, ' ')}</span>
              </div>
            ))}
          </div>
        </div>
        <aside className="px-6 py-5" style={{ background: STEEL }}>
          <h3 className="mb-3 text-[10px] uppercase tracking-[0.36em]" style={{ color: ORANGE }}>⛓ REPAIR CREW DISPATCH</h3>
          <div className="space-y-1.5">
            {e.repairCrews.map(c => (
              <div key={c.id} className="grid grid-cols-[24px_1fr_50px_60px] items-baseline gap-2 px-3 py-2 text-[10.5px]" style={{ background: STEEL_DEEP, borderLeft: `2px solid ${NAVY}` }}>
                <span className="text-center text-[14px]" style={{ color: TEAL }}>{MODE_GLYPH[c.mode]}</span>
                <div>
                  <div style={{ color: PARCH }}>{c.id}</div>
                  <div className="text-[9px]" style={{ color: MUT }}>{c.mode} · {c.region}</div>
                </div>
                <span className="text-right tabular-nums" style={{ color: INK }}>{c.crewSize}p</span>
                <span className="text-right tabular-nums" style={{ color: AMBER }}>{c.estimatedDurationHrs}h</span>
                <div className="col-span-4 mt-0.5 text-[9px] uppercase tracking-[0.18em]" style={{ color: MUT }}>
                  ↦ to <span className="not-italic" style={{ color: ORANGE }}>{c.enRouteTo}</span> · <span className="not-italic">{c.vehiclesDeployed}</span> veh
                </div>
              </div>
            ))}
          </div>
        </aside>
      </section>

      <div className="h-1 w-full" style={{ background: `repeating-linear-gradient(90deg, ${ORANGE} 0 32px, transparent 32px 48px)` }} />
      {void PANEL}{void PANEL2}
    </div>
  );
}
