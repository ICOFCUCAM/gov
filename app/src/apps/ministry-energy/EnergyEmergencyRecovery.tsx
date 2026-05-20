'use client';

// Energy — Emergency & Recovery Operations.
// Dedicated restoration choreography: blackout events progressing
// through 6 phases (isolation → stabilised), restoration crew roster,
// emergency-asset deployment counts, critical-services backup status.
// Industrial palette (deep navy / amber / electric green / steel grey)
// with phase-pip restoration progress — distinct from prior Energy
// surfaces that focus on grid stability or generation.

import * as React from 'react';
import { energyExtendedBoard, type BlackoutEvent, type EmergencyOperations, type RestorationCrew } from '@/lib/gov/energy-extended';

const STEEL = '#2a323c';
const STEEL_DEEP = '#161b22';
const NAVY = '#1c2b44';
const AMBER = '#d68a2e';
const AMBER_DIM = '#9d6620';
const ELECTRIC = '#5fc4a8';
const RED = '#b84030';
const INK = '#d8dbe0';
const PARCH = '#ece6d3';
const MUT = '#7e848c';
const RULE = 'rgba(214,138,46,0.22)';

const POSTURE_COL: Record<EmergencyOperations['posture'], string> = {
  standby: ELECTRIC, engaged: AMBER, 'major-restoration': '#c75a2a', 'national-recovery': RED,
};

const PHASES: BlackoutEvent['phase'][] = ['isolation', 'damage-assessment', 'crew-dispatch', 'restoration', 'energisation', 'stabilised'];
const PHASE_COL: Record<BlackoutEvent['phase'], string> = {
  isolation: RED, 'damage-assessment': '#c75a2a', 'crew-dispatch': AMBER, restoration: AMBER, energisation: ELECTRIC, stabilised: ELECTRIC,
};

const CAUSE_GLYPH: Record<BlackoutEvent['cause'], string> = {
  storm: '⛈', 'equipment-failure': '⚙', overload: '⚡', 'cyber-incident': '⌬', wildfire: '🜂', 'cascading-trip': '↯', 'cold-snap': '❄',
};

const CREW_GLYPH: Record<RestorationCrew['crewKind'], string> = {
  'line-crew': '⛓', 'substation-crew': '◬', 'tree-clearance': '⛬', 'mobile-genset': '⚡', 'control-room': '◧',
};

function PhasePips({ phase }: { phase: BlackoutEvent['phase'] }) {
  const idx = PHASES.indexOf(phase);
  return (
    <div className="flex items-center gap-1">
      {PHASES.map((p, i) => (
        <React.Fragment key={p}>
          <span title={p} className="block" style={{
            width: i === idx ? 10 : 6, height: i === idx ? 10 : 6,
            background: i <= idx ? PHASE_COL[phase] : 'rgba(214,138,46,0.18)',
            clipPath: i === idx ? 'polygon(50% 0, 100% 50%, 50% 100%, 0 50%)' : 'circle(50%)',
          }} />
          {i < PHASES.length - 1 ? <span className="block h-px w-3" style={{ background: i < idx ? PHASE_COL[phase] : RULE }} /> : null}
        </React.Fragment>
      ))}
    </div>
  );
}

export function EnergyEmergencyRecovery({ id, now }: { id: string; now: number }) {
  void id;
  const b = energyExtendedBoard(now);
  const e = b.emergency;
  return (
    <div style={{ background: STEEL_DEEP, color: INK, fontFamily: 'ui-monospace, "JetBrains Mono", "Inter", system-ui, monospace' }}>
      {/* high-voltage warning stripe */}
      <div className="h-1 w-full" style={{ background: `repeating-linear-gradient(90deg, ${AMBER} 0 14px, ${STEEL_DEEP} 14px 24px)` }} />

      <header className="px-8 py-5" style={{ background: 'linear-gradient(180deg, #1c2330 0%, #161b22 100%)', borderBottom: `1px solid ${RULE}` }}>
        <div className="flex items-baseline justify-between">
          <div>
            <div className="text-[10px] uppercase tracking-[0.42em]" style={{ color: AMBER }}>NGC ▮ NATIONAL GRID RECOVERY OPS</div>
            <h2 className="mt-2 text-[18px] tracking-[0.04em]" style={{ color: PARCH }}>
              {e.blackouts.length} active events · load restored {e.loadRestoredNationalPct}% · mean ETR {e.meanRestorationHrs}h
            </h2>
          </div>
          <div className="flex items-center gap-3">
            <span className="block h-3 w-3" style={{ background: POSTURE_COL[e.posture], boxShadow: `0 0 8px ${POSTURE_COL[e.posture]}88` }} />
            <span className="text-[11px] uppercase tracking-[0.32em]" style={{ color: POSTURE_COL[e.posture] }}>{e.posture.replace(/-/g, ' ')}</span>
          </div>
        </div>
      </header>

      {/* Active blackout events */}
      <section className="px-8 py-5" style={{ background: STEEL_DEEP, borderBottom: `1px solid ${RULE}` }}>
        <h3 className="mb-3 text-[10px] uppercase tracking-[0.36em]" style={{ color: AMBER }}>↯ ACTIVE BLACKOUT EVENTS · RECOVERY CHOREOGRAPHY</h3>
        <div className="space-y-2">
          {e.blackouts.map(bo => (
            <article key={bo.id} className="grid grid-cols-[80px_1fr] gap-px" style={{ background: RULE }}>
              <div className="px-4 py-3 text-center" style={{ background: STEEL_DEEP }}>
                <div className="text-[20px]" style={{ color: PHASE_COL[bo.phase] }}>{CAUSE_GLYPH[bo.cause]}</div>
                <div className="mt-1 tabular-nums text-[10px]" style={{ color: MUT }}>{bo.id}</div>
                <div className="mt-1 text-[9px] uppercase tracking-[0.18em]" style={{ color: PHASE_COL[bo.phase] }}>{bo.cause}</div>
              </div>
              <div className="px-4 py-3" style={{ background: STEEL }}>
                <div className="flex items-baseline justify-between">
                  <span className="text-[12px]" style={{ color: PARCH }}>{bo.region}</span>
                  <span className="text-[10px] uppercase tracking-[0.2em]" style={{ color: PHASE_COL[bo.phase] }}>{bo.phase.replace(/-/g, ' ')}</span>
                </div>
                <div className="mt-2"><PhasePips phase={bo.phase} /></div>
                <div className="mt-2 grid grid-cols-4 gap-3 text-[10px]">
                  <div>
                    <div className="uppercase tracking-[0.18em]" style={{ color: MUT, fontSize: '8.5px' }}>SUBSTATIONS</div>
                    <div className="tabular-nums" style={{ color: INK }}>{bo.affectedSubstations}</div>
                  </div>
                  <div>
                    <div className="uppercase tracking-[0.18em]" style={{ color: MUT, fontSize: '8.5px' }}>POPULATION</div>
                    <div className="tabular-nums" style={{ color: bo.populationAffectedK >= 400 ? RED : AMBER }}>{bo.populationAffectedK.toLocaleString()}K</div>
                  </div>
                  <div>
                    <div className="uppercase tracking-[0.18em]" style={{ color: MUT, fontSize: '8.5px' }}>INDUSTRIAL</div>
                    <div className="tabular-nums" style={{ color: INK }}>{bo.industrialFacilitiesOut}</div>
                  </div>
                  <div>
                    <div className="uppercase tracking-[0.18em]" style={{ color: MUT, fontSize: '8.5px' }}>ETR</div>
                    <div className="tabular-nums" style={{ color: bo.estimatedRestorationHrs >= 12 ? RED : AMBER }}>{bo.estimatedRestorationHrs}h</div>
                  </div>
                </div>
                {/* load restoration progress bar */}
                <div className="mt-3 h-1.5" style={{ background: STEEL_DEEP }}>
                  <div className="h-full" style={{ width: `${bo.loadRestoredPct}%`, background: `linear-gradient(90deg, ${PHASE_COL[bo.phase]} 0%, ${ELECTRIC} 100%)`, boxShadow: bo.loadRestoredPct > 0 ? `0 0 6px ${ELECTRIC}55` : 'none' }} />
                </div>
                <div className="mt-1 flex items-baseline justify-between text-[9px] uppercase tracking-[0.18em]">
                  <span style={{ color: MUT }}>LOAD RESTORED <span className="tabular-nums" style={{ color: ELECTRIC }}>{bo.loadRestoredPct}%</span></span>
                  <span style={{ color: MUT }}>since {bo.startedHrsAgo}h ago</span>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* Restoration crews + asset deployment */}
      <section className="grid grid-cols-1 gap-px lg:grid-cols-[1fr_360px]" style={{ background: RULE }}>
        <div className="px-8 py-5" style={{ background: STEEL_DEEP }}>
          <h3 className="mb-3 text-[10px] uppercase tracking-[0.36em]" style={{ color: AMBER }}>⛓ RESTORATION CREW ROSTER · {e.crews.length} ACTIVE</h3>
          <div className="overflow-hidden" style={{ background: STEEL }}>
            <div className="grid grid-cols-[60px_1fr_120px_70px_80px_80px_100px] gap-2 px-3 py-2 text-[9px] uppercase tracking-[0.2em]" style={{ color: MUT, background: NAVY }}>
              <span></span><span>Crew ID</span><span>Region</span><span className="text-right">Dep.</span><span className="text-right">Avail.</span><span className="text-right">Veh.</span><span>En route to</span>
            </div>
            {e.crews.map(c => (
              <div key={c.id} className="grid grid-cols-[60px_1fr_120px_70px_80px_80px_100px] items-center gap-2 px-3 py-2 text-[11px]" style={{ borderTop: `1px solid ${STEEL_DEEP}` }}>
                <span className="text-center text-[14px]" style={{ color: ELECTRIC }}>{CREW_GLYPH[c.crewKind]}</span>
                <div>
                  <div style={{ color: INK }}>{c.id}</div>
                  <div className="text-[9px]" style={{ color: MUT }}>{c.crewKind.replace(/-/g, ' ')}</div>
                </div>
                <span style={{ color: PARCH }}>{c.region}</span>
                <span className="text-right tabular-nums" style={{ color: ELECTRIC }}>{c.membersDeployed}</span>
                <span className="text-right tabular-nums" style={{ color: MUT }}>{c.membersAvailable}</span>
                <span className="text-right tabular-nums" style={{ color: INK }}>{c.vehiclesActive}</span>
                <span className="text-[9.5px]" style={{ color: AMBER }}>{c.enRouteTo}</span>
              </div>
            ))}
          </div>
        </div>
        <aside className="px-6 py-5" style={{ background: STEEL }}>
          <h3 className="mb-3 text-[10px] uppercase tracking-[0.36em]" style={{ color: AMBER }}>⚙ ASSET DEPLOYMENT</h3>
          <div className="space-y-2">
            {e.assets.map(a => (
              <div key={a.asset} className="px-3 py-2.5" style={{ background: STEEL_DEEP, borderLeft: `2px solid ${a.utilisationPct >= 80 ? RED : a.utilisationPct >= 50 ? AMBER : ELECTRIC}` }}>
                <div className="flex items-baseline justify-between">
                  <span className="text-[10.5px]" style={{ color: PARCH }}>{a.asset.replace(/-/g, ' ')}</span>
                  <span className="tabular-nums text-[10px]" style={{ color: INK }}>{a.unitsDeployed}/{a.unitsTotal}</span>
                </div>
                <div className="mt-1.5 h-1" style={{ background: '#0a0e14' }}>
                  <div className="h-full" style={{ width: `${a.utilisationPct}%`, background: a.utilisationPct >= 80 ? RED : a.utilisationPct >= 50 ? AMBER : ELECTRIC }} />
                </div>
                <div className="mt-0.5 text-right tabular-nums text-[9.5px]" style={{ color: MUT }}>util {a.utilisationPct}%</div>
              </div>
            ))}
          </div>
          {/* critical services on backup */}
          {e.criticalServicesOnBackup.length > 0 ? (
            <div className="mt-5">
              <h4 className="mb-2 text-[10px] uppercase tracking-[0.32em]" style={{ color: RED }}>⚠ CRITICAL SERVICES ON BACKUP</h4>
              <div className="space-y-1.5">
                {e.criticalServicesOnBackup.map(s => {
                  const col = s.status === 'critical' ? RED : s.status === 'low-fuel' ? AMBER : ELECTRIC;
                  return (
                    <div key={s.service} className="grid grid-cols-[1fr_60px_70px] items-baseline gap-2 px-3 py-1.5 text-[10px]" style={{ background: STEEL_DEEP, borderLeft: `2px solid ${col}` }}>
                      <span style={{ color: PARCH }}>{s.service}</span>
                      <span className="text-right tabular-nums" style={{ color: col }}>{s.backupHrsRemaining}h</span>
                      <span className="text-right text-[9px] uppercase tracking-[0.2em]" style={{ color: col }}>· {s.status}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : null}
        </aside>
      </section>

      <div className="h-1 w-full" style={{ background: `repeating-linear-gradient(90deg, ${AMBER} 0 14px, ${STEEL_DEEP} 14px 24px)` }} />
      {void AMBER_DIM}
    </div>
  );
}
