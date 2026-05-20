'use client';

// Labour — Emergency & Recovery Operations.
// Industrial closures progressing through 6 recovery phases, sector-
// to-sector redeployment corridors as flow ribbons, emergency social
// programmes as enrolment chips. Workforce palette (civic blue ·
// teal · copper · workforce amber · slate gray); distinct geometry
// from prior Labour surfaces (Sankey ribbons, support corridor rails,
// age pyramid, broken-bar traces).

import * as React from 'react';
import { labourExtendedBoard, type IndustrialClosure, type RedeploymentCorridor, type RecoveryPhase } from '@/lib/gov/labour-extended';

const CIVIC = '#2e6aa6';
const TEAL = '#3a8a82';
const COPPER = '#a45f3a';
const AMBER = '#c08b3a';
const SLATE = '#5e6770';
const SLATE_DARK = '#2a2f36';
const SLATE_DEEP = '#1d2128';
const PAPER = '#f4efe5';
const PANEL = '#262b33';
const PANEL2 = '#2e343d';
const INK = '#dad8d0';
const MUT = '#8a8e95';
const ALERT = '#b04030';

const PHASES: RecoveryPhase[] = ['assessment', 'support-activation', 'redeployment', 'reskilling', 'reabsorption', 'closed'];
const PHASE_COL: Record<RecoveryPhase, string> = {
  assessment: ALERT, 'support-activation': COPPER, redeployment: AMBER, reskilling: CIVIC, reabsorption: TEAL, closed: SLATE,
};
const SECTOR_GLYPH: Record<IndustrialClosure['sector'], string> = {
  manufacturing: '⚙', mining: '⛏', agriculture: '🌾', logistics: '📦', energy: '⚡', services: '◐', retail: '◇',
};
const CAUSE_LABEL: Record<IndustrialClosure['closureCause'], string> = {
  restructuring: 'restructuring', bankruptcy: 'bankruptcy', automation: 'automation',
  'climate-shock': 'climate shock', 'export-shock': 'export shock', 'cyber-incident': 'cyber incident', regulatory: 'regulatory',
};
const STATUS_COL: Record<RedeploymentCorridor['status'], string> = {
  opening: SLATE, active: TEAL, congested: AMBER, saturated: ALERT,
};

// Recovery phase pip rail (different from energy/transport — uses dots not bars)
function RecoveryPhaseRail({ phase }: { phase: RecoveryPhase }) {
  const idx = PHASES.indexOf(phase);
  return (
    <div className="flex items-center gap-1.5">
      {PHASES.map((p, i) => (
        <React.Fragment key={p}>
          <span className="block rounded-full" style={{
            width: i === idx ? 9 : 5, height: i === idx ? 9 : 5,
            background: i <= idx ? PHASE_COL[phase] : 'rgba(218,216,208,0.18)',
            border: i === idx ? `2px solid ${PHASE_COL[phase]}66` : 'none',
          }} />
          {i < PHASES.length - 1 ? <span className="block h-px w-3" style={{ background: i < idx ? PHASE_COL[phase] : 'rgba(218,216,208,0.12)' }} /> : null}
        </React.Fragment>
      ))}
    </div>
  );
}

// Sector-to-sector flow arrow
function RedeploymentArrow({ rc }: { rc: RedeploymentCorridor }) {
  const col = STATUS_COL[rc.status];
  return (
    <div className="grid grid-cols-[1fr_60px_1fr] items-center gap-2 px-3 py-2.5 rounded-md" style={{ background: PANEL, border: `1px solid ${col}33` }}>
      <div className="text-right">
        <div className="text-[14px] inline-block mr-1.5" style={{ color: COPPER }}>{SECTOR_GLYPH[rc.fromSector]}</div>
        <span className="text-[11px]" style={{ color: PAPER }}>{rc.fromSector}</span>
      </div>
      <div className="flex flex-col items-center">
        <span className="text-[16px] leading-none" style={{ color: col }}>↦</span>
        <span className="text-[8.5px] uppercase tracking-[0.16em] mt-1" style={{ color: col }}>{rc.workersRoutedK}K</span>
      </div>
      <div>
        <div className="text-[14px] inline-block mr-1.5" style={{ color: TEAL }}>{SECTOR_GLYPH[rc.toSector]}</div>
        <span className="text-[11px]" style={{ color: PAPER }}>{rc.toSector}</span>
      </div>
      <div className="col-span-3 mt-1.5 grid grid-cols-[1fr_70px_80px_80px] items-center gap-2 text-[9.5px]">
        <div className="h-1 rounded-full" style={{ background: SLATE_DEEP }}>
          <div className="h-full rounded-full" style={{ width: `${Math.min(100, rc.capacityRoutedPct)}%`, background: col }} />
        </div>
        <span className="text-right tabular-nums" style={{ color: col }}>{rc.capacityRoutedPct}%</span>
        <span className="text-right tabular-nums" style={{ color: MUT }}>{rc.bridgingMonths}mo bridge</span>
        <span className="text-right uppercase tracking-[0.16em]" style={{ color: col }}>● {rc.status}</span>
      </div>
    </div>
  );
}

const PROGRAMME_LABEL: Record<string, string> = {
  'emergency-bridge': 'Emergency social bridge',
  'rapid-reskilling': 'Rapid reskilling',
  'relocation-grant': 'Relocation grant',
  'pension-acceleration': 'Pension acceleration',
  'family-support': 'Family support',
};

export function LabourEmergencyRecovery({ id, now }: { id: string; now: number }) {
  void id;
  const b = labourExtendedBoard(now);
  const e = b.emergency;
  const posCol = e.posture === 'national-mobilisation' ? ALERT
    : e.posture === 'major-displacement' ? COPPER
      : e.posture === 'engaged' ? AMBER : TEAL;
  return (
    <div style={{ background: SLATE_DEEP, color: INK, fontFamily: '"Inter", ui-sans-serif, system-ui, sans-serif' }}>
      <header className="px-8 py-5" style={{ background: 'linear-gradient(180deg, #2a2f36 0%, #1d2128 100%)', borderBottom: `1px solid ${SLATE}40` }}>
        <div className="flex items-start justify-between gap-6">
          <div>
            <div className="text-[10px] uppercase tracking-[0.42em]" style={{ color: AMBER }}>National Workforce — Emergency &amp; Recovery Operations</div>
            <h2 className="mt-2 text-[18px] tracking-[0.02em]" style={{ color: PAPER }}>
              {e.closures.length} active industrial closures · {e.totalDisplacedK}K displaced · {e.totalRedeployedK}K rerouted · mean reabsorption {e.meanReabsorptionMonths}mo
            </h2>
            <div className="mt-2 flex items-center gap-2 text-[10px] uppercase tracking-[0.24em]" style={{ color: MUT }}>
              <span className="inline-block h-2 w-2 rounded-full" style={{ background: posCol }} />
              <span style={{ color: posCol }}>{e.posture.replace(/-/g, ' ')}</span>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2" style={{ minWidth: '260px' }}>
            {[
              { l: 'Total displaced', v: `${e.totalDisplacedK}K`, c: e.totalDisplacedK >= 80 ? ALERT : e.totalDisplacedK >= 30 ? COPPER : TEAL },
              { l: 'Total rerouted', v: `${e.totalRedeployedK}K`, c: TEAL },
            ].map(x => (
              <div key={x.l} className="rounded-md px-3 py-2 text-center" style={{ background: PANEL2 }}>
                <div className="text-[8.5px] uppercase tracking-[0.24em]" style={{ color: MUT }}>{x.l}</div>
                <div className="mt-0.5 tabular-nums text-[16px]" style={{ color: x.c }}>{x.v}</div>
              </div>
            ))}
          </div>
        </div>
      </header>

      {/* Active closures */}
      <section className="px-8 py-6" style={{ background: SLATE_DEEP, borderBottom: `1px solid ${SLATE}40` }}>
        <h3 className="mb-3 text-[10px] uppercase tracking-[0.36em]" style={{ color: AMBER }}>◇ Active industrial closures · recovery choreography</h3>
        <div className="space-y-2">
          {e.closures.map(c => (
            <article key={c.id} className="grid grid-cols-[60px_1fr] gap-px rounded-md overflow-hidden" style={{ background: `${SLATE}30` }}>
              <div className="px-3 py-3 flex flex-col items-center justify-center" style={{ background: SLATE_DEEP }}>
                <div className="text-[20px]" style={{ color: PHASE_COL[c.phase] }}>{SECTOR_GLYPH[c.sector]}</div>
                <div className="mt-1 tabular-nums text-[9.5px]" style={{ color: MUT }}>{c.id}</div>
              </div>
              <div className="px-4 py-3" style={{ background: PANEL }}>
                <div className="flex items-baseline justify-between">
                  <span className="text-[12px]" style={{ color: PAPER }}>{c.sector}<span className="text-[10px] italic ml-2" style={{ color: MUT }}>· {c.region}</span></span>
                  <span className="text-[9.5px] uppercase tracking-[0.2em]" style={{ color: PHASE_COL[c.phase] }}>{c.phase.replace(/-/g, ' ')}</span>
                </div>
                <div className="text-[10px] italic" style={{ color: MUT }}>cause: {CAUSE_LABEL[c.closureCause]} · {c.daysSinceClosure}d since closure</div>
                <div className="mt-2"><RecoveryPhaseRail phase={c.phase} /></div>
                <div className="mt-3 grid grid-cols-3 gap-3 text-[10px]">
                  <div>
                    <div className="uppercase tracking-[0.18em]" style={{ color: MUT, fontSize: '8.5px' }}>Displaced</div>
                    <div className="tabular-nums" style={{ color: c.workersDisplacedK >= 8 ? ALERT : c.workersDisplacedK >= 3 ? COPPER : INK }}>{c.workersDisplacedK}K</div>
                  </div>
                  <div>
                    <div className="uppercase tracking-[0.18em]" style={{ color: MUT, fontSize: '8.5px' }}>Reabsorbed</div>
                    <div className="tabular-nums" style={{ color: c.reabsorptionRatePct >= 70 ? TEAL : c.reabsorptionRatePct >= 30 ? AMBER : COPPER }}>{c.reabsorptionRatePct}%</div>
                  </div>
                  <div>
                    <div className="uppercase tracking-[0.18em]" style={{ color: MUT, fontSize: '8.5px' }}>ETR months</div>
                    <div className="tabular-nums" style={{ color: c.estimatedReabsorptionMonths >= 12 ? ALERT : AMBER }}>{c.estimatedReabsorptionMonths}</div>
                  </div>
                </div>
                <div className="mt-2 h-1 rounded-full" style={{ background: SLATE_DEEP }}>
                  <div className="h-full rounded-full" style={{ width: `${c.reabsorptionRatePct}%`, background: `linear-gradient(90deg, ${COPPER} 0%, ${TEAL} 100%)` }} />
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* Redeployment corridors + emergency programmes */}
      <section className="grid grid-cols-1 gap-px lg:grid-cols-[1fr_360px]" style={{ background: `${SLATE}30` }}>
        <div className="px-8 py-6" style={{ background: SLATE_DEEP }}>
          <h3 className="mb-3 text-[10px] uppercase tracking-[0.36em]" style={{ color: AMBER }}>↦ Sector → sector redeployment corridors</h3>
          <div className="grid grid-cols-1 gap-2 lg:grid-cols-2">
            {e.redeploymentCorridors.map(rc => <RedeploymentArrow key={rc.id} rc={rc} />)}
          </div>
        </div>
        <aside className="px-6 py-6" style={{ background: PANEL }}>
          <h3 className="mb-3 text-[10px] uppercase tracking-[0.36em]" style={{ color: AMBER }}>✦ Emergency social programmes</h3>
          <div className="space-y-2">
            {e.emergencyProgrammes.map(p => (
              <div key={p.programme} className="rounded-md px-3 py-2.5" style={{ background: SLATE_DEEP, borderLeft: `2px solid ${p.fulfilmentPct >= 75 ? TEAL : p.fulfilmentPct >= 55 ? AMBER : COPPER}` }}>
                <div className="flex items-baseline justify-between">
                  <span className="text-[11px]" style={{ color: PAPER }}>{PROGRAMME_LABEL[p.programme] ?? p.programme}</span>
                  <span className="text-[9.5px] tabular-nums" style={{ color: AMBER }}>{p.disbursementBnThisMonth}Bn/mo</span>
                </div>
                <div className="mt-2 grid grid-cols-3 gap-2 text-[9.5px]">
                  <div>
                    <div className="uppercase tracking-[0.16em]" style={{ color: MUT, fontSize: '8.5px' }}>Active</div>
                    <div className="tabular-nums" style={{ color: INK }}>{p.beneficiariesActiveK}K</div>
                  </div>
                  <div>
                    <div className="uppercase tracking-[0.16em]" style={{ color: MUT, fontSize: '8.5px' }}>Enrol /wk</div>
                    <div className="tabular-nums" style={{ color: TEAL }}>{p.enrolmentsThisWeekK}K</div>
                  </div>
                  <div>
                    <div className="uppercase tracking-[0.16em]" style={{ color: MUT, fontSize: '8.5px' }}>Fulfil</div>
                    <div className="tabular-nums" style={{ color: p.fulfilmentPct >= 75 ? TEAL : AMBER }}>{p.fulfilmentPct}%</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </aside>
      </section>
    </div>
  );
}
