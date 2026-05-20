'use client';

// Environment — Natural Resource Governance.
// Water basin allocation ledger (current vs ecological reserve),
// land protection tiles by category, forestry posture by region, and
// extraction permits weakest-first. Distinct from prior environment
// surfaces: ledger-style rows, allocation bars with reserve markers,
// no hex tiles, no contour backdrops, no horizon curves.

import * as React from 'react';
import { environmentalGovernanceBoard, type WaterAllocation, type ForestryRegister, type ExtractionPermit, type LandProtection } from '@/lib/gov/environmental-governance';

const FOREST_DEEP = '#152721';
const PANEL = '#1a221f';
const PANEL2 = '#1f2925';
const CANOPY = '#4f7a5e';
const EARTH = '#5a4a35';
const ATMOS = '#6a7d8a';
const SKY = '#314050';
const AMBER = '#b88b3a';
const GLACIER = '#e5e8e6';
const INK = '#d6dad3';
const MUT = '#7d8881';
const ALERT = '#a04030';
const WATER = '#5a8db0';

const WATER_COL: Record<WaterAllocation['status'], string> = {
  'within-budget': CANOPY, observant: AMBER, 'over-allocation': '#a05538', 'critical-depletion': ALERT,
};
const FORESTRY_COL: Record<ForestryRegister['posture'], string> = {
  managed: CANOPY, pressured: AMBER, 'over-extraction': ALERT, recovery: ATMOS,
};
const PERMIT_COL: Record<ExtractionPermit['status'], string> = {
  active: CANOPY, review: AMBER, suspended: '#a05538', revoked: ALERT,
};
const CATEGORY_GLYPH: Record<LandProtection['category'], string> = {
  'national-park': '⛰', 'nature-reserve': '⌬', 'wildlife-corridor': '◇', wetland: '≋', 'marine-protected': '⌒',
};
const RESOURCE_GLYPH: Record<ExtractionPermit['resource'], string> = {
  minerals: '◈', aggregates: '◇', groundwater: '≋', forestry: '⛬', 'oil-gas': '⌬',
};

export function NaturalResourceGovernance({ id, now }: { id: string; now: number }) {
  void id;
  const b = environmentalGovernanceBoard(now);
  const r = b.resources;
  return (
    <div style={{ background: FOREST_DEEP, color: INK, fontFamily: 'ui-sans-serif, "Inter", system-ui, sans-serif' }}>
      {/* Header */}
      <header className="px-8 py-5" style={{ background: 'linear-gradient(180deg, #1a221f 0%, #152721 100%)', borderBottom: '1px solid rgba(229,232,230,0.06)' }}>
        <div className="flex items-baseline justify-between">
          <div>
            <div className="text-[9px] uppercase tracking-[0.5em]" style={{ color: GLACIER, opacity: 0.75 }}>Natural Resource Governance</div>
            <h2 className="mt-2 text-[18px] tracking-[0.02em]" style={{ color: GLACIER }}>
              {r.waterAllocations.length} basins · {r.landProtections.length} protection categories · {r.forestry.length} forestry regions · {r.extractionPermits.length} extraction permits
            </h2>
          </div>
          <div className="grid grid-cols-3 gap-3 text-center" style={{ minWidth: '420px' }}>
            {[
              { l: 'Resource sustainability', v: r.resourceSustainabilityIdx, c: r.resourceSustainabilityIdx >= 75 ? CANOPY : r.resourceSustainabilityIdx >= 55 ? AMBER : ALERT },
              { l: 'Enforcement open', v: r.enforcementCasesOpen, c: r.enforcementCasesOpen > 60 ? ALERT : r.enforcementCasesOpen > 30 ? AMBER : CANOPY },
              { l: 'Intergen. stewardship', v: r.intergenerationalStewardshipIdx, c: r.intergenerationalStewardshipIdx >= 75 ? CANOPY : ATMOS },
            ].map(x => (
              <div key={x.l} className="px-3 py-2" style={{ background: PANEL2, border: '1px solid rgba(229,232,230,0.06)' }}>
                <div className="text-[8.5px] uppercase tracking-[0.24em]" style={{ color: MUT }}>{x.l}</div>
                <div className="mt-1 tabular-nums text-[18px]" style={{ color: x.c }}>{x.v}</div>
              </div>
            ))}
          </div>
        </div>
      </header>

      {/* Water allocation ledger */}
      <section className="px-8 py-5" style={{ background: PANEL, borderBottom: '1px solid rgba(229,232,230,0.06)' }}>
        <h3 className="mb-3 text-[10px] uppercase tracking-[0.36em]" style={{ color: GLACIER }}>≋ Water allocation ledger · withdrawal vs ecological reserve</h3>
        <div className="space-y-2">
          {r.waterAllocations.map(w => {
            const col = WATER_COL[w.status];
            return (
              <div key={w.basin} className="grid grid-cols-[200px_1fr_120px_110px] items-center gap-4 px-4 py-3" style={{ background: PANEL2, border: '1px solid rgba(229,232,230,0.05)' }}>
                <div>
                  <div className="text-[12px]" style={{ color: GLACIER }}>{w.basin}</div>
                  <div className="text-[9px] uppercase tracking-[0.2em]" style={{ color: MUT }}>{w.allocationMcm.toLocaleString()} Mcm/yr allocation</div>
                </div>
                <div>
                  {/* allocation bar */}
                  <div className="relative h-3" style={{ background: 'rgba(15,30,22,0.6)' }}>
                    <div className="absolute inset-y-0 left-0" style={{ width: `${Math.min(100, w.withdrawalPct)}%`, background: `linear-gradient(90deg, ${WATER}88, ${col})` }} />
                    {/* ecological reserve marker — vertical line at 100 - reserve */}
                    <div className="absolute inset-y-[-3px] w-px" style={{ left: `${100 - w.ecologicalReservePct}%`, background: CANOPY, boxShadow: `0 0 4px ${CANOPY}` }} />
                    {/* threshold tick at 100% allocation */}
                    <div className="absolute inset-y-0 w-px" style={{ left: '100%', background: ALERT, marginLeft: '-1px' }} />
                  </div>
                  <div className="mt-1 flex items-baseline justify-between text-[9px] uppercase tracking-[0.18em]" style={{ color: MUT }}>
                    <span>0 Mcm</span>
                    <span style={{ color: CANOPY }}>↑ ecological reserve {w.ecologicalReservePct}%</span>
                    <span style={{ color: ALERT }}>100%</span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[8.5px] uppercase tracking-[0.22em]" style={{ color: MUT }}>Withdrawal</div>
                  <div className="tabular-nums text-[18px]" style={{ color: col }}>{w.withdrawalPct}%</div>
                </div>
                <div className="text-right text-[10px] uppercase tracking-[0.2em]" style={{ color: col }}>● {w.status.replace(/-/g, ' ')}</div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Land protection categories */}
      <section className="px-8 py-5" style={{ background: FOREST_DEEP, borderBottom: '1px solid rgba(229,232,230,0.06)' }}>
        <h3 className="mb-3 text-[10px] uppercase tracking-[0.36em]" style={{ color: GLACIER }}>◇ Protected land · category register</h3>
        <div className="grid grid-cols-1 gap-2 md:grid-cols-3 xl:grid-cols-5">
          {r.landProtections.map(l => {
            const col = l.ecologicalStatusIdx >= 80 ? CANOPY : l.ecologicalStatusIdx >= 65 ? ATMOS : AMBER;
            return (
              <div key={l.category} className="px-4 py-3" style={{ background: PANEL, border: `1px solid ${col}33` }}>
                <div className="flex items-baseline justify-between">
                  <span className="text-[16px]" style={{ color: col }}>{CATEGORY_GLYPH[l.category]}</span>
                  <span className="text-[9px] uppercase tracking-[0.2em]" style={{ color: MUT }}>{l.category.replace(/-/g, ' ')}</span>
                </div>
                <div className="mt-2 tabular-nums text-[18px]" style={{ color: GLACIER }}>{l.hectaresK.toLocaleString()}<span className="ml-1 text-[10px]" style={{ color: MUT }}>K ha</span></div>
                <div className="mt-2 h-[3px]" style={{ background: 'rgba(15,30,22,0.6)' }}>
                  <div className="h-full" style={{ width: `${l.ecologicalStatusIdx}%`, background: col }} />
                </div>
                <div className="mt-2 grid grid-cols-2 gap-2 text-[10px]">
                  <div>
                    <div className="uppercase tracking-[0.18em]" style={{ color: MUT, fontSize: '8.5px' }}>Encroachments</div>
                    <div className="tabular-nums" style={{ color: l.encroachmentIncidents ? AMBER : MUT }}>{l.encroachmentIncidents}</div>
                  </div>
                  <div>
                    <div className="uppercase tracking-[0.18em]" style={{ color: MUT, fontSize: '8.5px' }}>Enforcement</div>
                    <div className="tabular-nums" style={{ color: l.enforcementCases >= 12 ? ALERT : MUT }}>{l.enforcementCases}</div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Forestry register */}
      <section className="px-8 py-5" style={{ background: PANEL, borderBottom: '1px solid rgba(229,232,230,0.06)' }}>
        <h3 className="mb-3 text-[10px] uppercase tracking-[0.36em]" style={{ color: GLACIER }}>⛬ Forestry administration · regional posture</h3>
        <div className="overflow-hidden" style={{ background: FOREST_DEEP }}>
          <div className="grid grid-cols-[1fr_140px_1fr_100px_120px_120px] gap-3 px-4 py-2 text-[9px] uppercase tracking-[0.2em]" style={{ color: MUT, background: PANEL2 }}>
            <span>Region</span><span className="text-right">Managed</span><span>Sustainable harvest</span><span className="text-right">Illegal</span><span className="text-right">Reforest. K ha</span><span className="text-right">Posture</span>
          </div>
          {r.forestry.map(f => {
            const col = FORESTRY_COL[f.posture];
            return (
              <div key={f.region} className="grid grid-cols-[1fr_140px_1fr_100px_120px_120px] items-center gap-3 px-4 py-2.5 text-[11px]" style={{ borderTop: '1px solid rgba(229,232,230,0.05)' }}>
                <span style={{ color: GLACIER }}>{f.region}</span>
                <span className="text-right tabular-nums" style={{ color: INK }}>{f.managedHectaresK.toLocaleString()}K</span>
                <div className="flex items-center gap-2">
                  <div className="h-[3px] flex-1" style={{ background: 'rgba(15,30,22,0.6)' }}>
                    <div className="h-full" style={{ width: `${f.sustainableHarvestPct}%`, background: col }} />
                  </div>
                  <span className="tabular-nums text-[10px]" style={{ color: col, minWidth: '32px', textAlign: 'right' }}>{f.sustainableHarvestPct}%</span>
                </div>
                <span className="text-right tabular-nums" style={{ color: f.illegalLoggingCases >= 12 ? ALERT : f.illegalLoggingCases >= 6 ? AMBER : MUT }}>{f.illegalLoggingCases}</span>
                <span className="text-right tabular-nums" style={{ color: f.reforestationActiveK >= 80 ? CANOPY : INK }}>{f.reforestationActiveK.toLocaleString()}</span>
                <span className="text-right text-[10px] uppercase tracking-[0.2em]" style={{ color: col }}>● {f.posture.replace(/-/g, ' ')}</span>
              </div>
            );
          })}
        </div>
      </section>

      {/* Extraction permits */}
      <section className="px-8 py-5" style={{ background: FOREST_DEEP }}>
        <h3 className="mb-3 text-[10px] uppercase tracking-[0.36em]" style={{ color: GLACIER }}>◈ Extraction permits register · weakest compliance first</h3>
        <div className="overflow-hidden" style={{ background: PANEL }}>
          <div className="grid grid-cols-[80px_120px_140px_1fr_120px_100px_90px_90px] gap-3 px-4 py-2 text-[9px] uppercase tracking-[0.2em]" style={{ color: MUT, background: PANEL2 }}>
            <span>Permit</span><span>Resource</span><span>Region</span><span>Operator</span><span>Compliance</span><span className="text-right">Cadence (d)</span><span className="text-right">Review (d)</span><span className="text-right">Status</span>
          </div>
          {r.extractionPermits.map(p => {
            const col = PERMIT_COL[p.status];
            return (
              <div key={p.id} className="grid grid-cols-[80px_120px_140px_1fr_120px_100px_90px_90px] items-center gap-3 px-4 py-2.5 text-[11px]" style={{ borderTop: '1px solid rgba(229,232,230,0.05)' }}>
                <span className="tabular-nums" style={{ color: MUT }}>{p.id}</span>
                <span className="text-[10px]" style={{ color: GLACIER }}><span className="mr-2" style={{ color: EARTH }}>{RESOURCE_GLYPH[p.resource]}</span>{p.resource}</span>
                <span style={{ color: MUT }}>{p.region}</span>
                <span style={{ color: INK }}>{p.operator}</span>
                <div className="flex items-center gap-2">
                  <div className="h-[3px] flex-1" style={{ background: 'rgba(15,30,22,0.6)' }}>
                    <div className="h-full" style={{ width: `${p.complianceIdx}%`, background: col }} />
                  </div>
                  <span className="tabular-nums text-[10px]" style={{ color: col, minWidth: '24px', textAlign: 'right' }}>{p.complianceIdx}</span>
                </div>
                <span className="text-right tabular-nums" style={{ color: p.monitoringCadenceDays >= 90 ? AMBER : INK }}>{p.monitoringCadenceDays}</span>
                <span className="text-right tabular-nums" style={{ color: p.daysToReview <= 14 ? AMBER : MUT }}>{p.daysToReview}</span>
                <span className="text-right text-[9.5px] uppercase tracking-[0.2em]" style={{ color: col }}>● {p.status}</span>
              </div>
            );
          })}
        </div>
      </section>
      {void SKY}
    </div>
  );
}
