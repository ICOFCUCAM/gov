'use client';

// Energy — Public Energy Services Portal.
// Outage triage queue with priority lanes, permit application stalls,
// renewable integration request register, advisory feed. Industrial
// palette; geometry: lane-grouped queue cards, monospace ticker
// strips, electric-green for approved/restored, amber for in-progress.

import * as React from 'react';
import { energyExtendedBoard, type OutageReport, type EnergyPermitFlow, type RenewableIntegrationRequest, type PublicAdvisoryEnergy } from '@/lib/gov/energy-extended';

const STEEL = '#2a323c';
const STEEL_DEEP = '#161b22';
const NAVY = '#1c2b44';
const AMBER = '#d68a2e';
const ELECTRIC = '#5fc4a8';
const RED = '#b84030';
const INK = '#d8dbe0';
const PARCH = '#ece6d3';
const MUT = '#7e848c';
const RULE = 'rgba(214,138,46,0.22)';

const OUTAGE_SEV: Record<OutageReport['severity'], string> = {
  minor: ELECTRIC, major: AMBER, critical: RED,
};
const OUTAGE_STATUS: Record<OutageReport['status'], string> = {
  received: NAVY, 'crew-en-route': AMBER, 'in-progress': '#c75a2a', restored: ELECTRIC,
};
const ADV_SEV: Record<PublicAdvisoryEnergy['severity'], string> = {
  advisory: NAVY, warning: AMBER, critical: RED,
};
const RENEW_COL: Record<RenewableIntegrationRequest['status'], string> = {
  queued: MUT, feasibility: NAVY, 'grid-study': AMBER, approved: ELECTRIC, declined: RED,
};
const PERMIT_LABEL: Record<EnergyPermitFlow['category'], string> = {
  'rooftop-solar': 'Rooftop solar',
  'industrial-connection': 'Industrial connection',
  'ev-charger': 'EV charger',
  'biogas-microgrid': 'Biogas microgrid',
  'wind-turbine': 'Wind turbine',
  'storage-battery': 'Storage battery',
};
const SOURCE_GLYPH: Record<RenewableIntegrationRequest['source'], string> = {
  solar: '☀', wind: '⌬', 'small-hydro': '≋', biomass: '⛬', geothermal: '🜂',
};
const ADV_GLYPH: Record<PublicAdvisoryEnergy['kind'], string> = {
  'peak-demand-warning': '⚡', 'planned-maintenance': '⚙', 'load-shedding': '↯', 'tariff-update': '$', 'energy-conservation': '◐', 'storm-readiness': '⛈',
};

export function PublicEnergyServicesPortal({ id, now }: { id: string; now: number }) {
  void id;
  const b = energyExtendedBoard(now);
  const p = b.portal;
  const critical = p.outages.filter(o => o.severity === 'critical');
  const major = p.outages.filter(o => o.severity === 'major');
  const minor = p.outages.filter(o => o.severity === 'minor');
  return (
    <div style={{ background: STEEL_DEEP, color: INK, fontFamily: 'ui-monospace, "JetBrains Mono", "Inter", system-ui, monospace' }}>
      <div className="h-1 w-full" style={{ background: `repeating-linear-gradient(90deg, ${AMBER} 0 14px, ${STEEL_DEEP} 14px 24px)` }} />

      <header className="px-8 py-5" style={{ background: 'linear-gradient(180deg, #1c2330 0%, #161b22 100%)', borderBottom: `1px solid ${RULE}` }}>
        <div className="flex items-baseline justify-between">
          <div>
            <div className="text-[10px] uppercase tracking-[0.42em]" style={{ color: AMBER }}>NGC ▮ PUBLIC ENERGY SERVICES PORTAL</div>
            <h2 className="mt-2 text-[18px] tracking-[0.04em]" style={{ color: PARCH }}>
              {p.outages.length} active outage reports · {p.consumerComplaintsOpen.toLocaleString()} complaints open · uptime {p.portalAvailabilityPct}%
            </h2>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center" style={{ minWidth: '320px' }}>
            {[
              { l: 'Daily calls', v: `${p.consumerCallsDailyK}K`, c: NAVY },
              { l: 'Critical outages', v: critical.length, c: critical.length ? RED : ELECTRIC },
              { l: 'Portal uptime', v: `${p.portalAvailabilityPct}%`, c: p.portalAvailabilityPct >= 99 ? ELECTRIC : AMBER },
            ].map(x => (
              <div key={x.l} className="px-3 py-2" style={{ background: STEEL, borderLeft: `2px solid ${x.c}` }}>
                <div className="text-[8.5px] uppercase tracking-[0.24em]" style={{ color: MUT }}>{x.l}</div>
                <div className="mt-0.5 tabular-nums text-[16px]" style={{ color: x.c }}>{x.v}</div>
              </div>
            ))}
          </div>
        </div>
      </header>

      {/* Outage triage — 3 priority lanes */}
      <section className="px-8 py-5" style={{ background: STEEL_DEEP, borderBottom: `1px solid ${RULE}` }}>
        <h3 className="mb-3 text-[10px] uppercase tracking-[0.36em]" style={{ color: AMBER }}>↯ OUTAGE TRIAGE · PRIORITY LANES</h3>
        <div className="grid grid-cols-1 gap-px lg:grid-cols-3" style={{ background: RULE }}>
          {([
            { label: 'CRITICAL', list: critical, col: RED },
            { label: 'MAJOR', list: major, col: AMBER },
            { label: 'MINOR', list: minor, col: ELECTRIC },
          ]).map(lane => (
            <div key={lane.label} className="px-5 py-4" style={{ background: STEEL }}>
              <div className="mb-2 flex items-baseline justify-between border-b pb-1" style={{ borderColor: RULE }}>
                <span className="text-[10px] uppercase tracking-[0.32em]" style={{ color: lane.col }}>▮ {lane.label}</span>
                <span className="text-[9.5px] tabular-nums" style={{ color: MUT }}>{lane.list.length}</span>
              </div>
              <div className="space-y-1.5">
                {lane.list.length === 0 ? (
                  <div className="text-[10px]" style={{ color: MUT }}>— no active —</div>
                ) : lane.list.map(o => (
                  <article key={o.id} className="px-3 py-2" style={{ background: STEEL_DEEP, borderLeft: `2px solid ${OUTAGE_STATUS[o.status]}` }}>
                    <div className="flex items-baseline justify-between">
                      <span className="tabular-nums text-[9.5px]" style={{ color: AMBER }}>{o.id}</span>
                      <span className="text-[9px] uppercase tracking-[0.2em]" style={{ color: OUTAGE_STATUS[o.status] }}>· {o.status.replace(/-/g, ' ')}</span>
                    </div>
                    <div className="mt-1 text-[11px]" style={{ color: PARCH }}>{o.region}</div>
                    <div className="mt-1 grid grid-cols-3 gap-2 text-[9.5px]">
                      <div>
                        <div className="uppercase tracking-[0.18em]" style={{ color: MUT, fontSize: '8.5px' }}>ACCOUNTS</div>
                        <div className="tabular-nums" style={{ color: OUTAGE_SEV[o.severity] }}>{o.affectedAccountsK}K</div>
                      </div>
                      <div>
                        <div className="uppercase tracking-[0.18em]" style={{ color: MUT, fontSize: '8.5px' }}>SINCE</div>
                        <div className="tabular-nums" style={{ color: MUT }}>{o.reportedHrsAgo}h</div>
                      </div>
                      <div>
                        <div className="uppercase tracking-[0.18em]" style={{ color: MUT, fontSize: '8.5px' }}>ETR</div>
                        <div className="tabular-nums" style={{ color: o.estimatedRestorationHrs > 6 ? RED : AMBER }}>{o.estimatedRestorationHrs}h</div>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Permit stalls */}
      <section className="px-8 py-5" style={{ background: STEEL, borderBottom: `1px solid ${RULE}` }}>
        <h3 className="mb-3 text-[10px] uppercase tracking-[0.36em]" style={{ color: AMBER }}>⚙ ENERGY PERMIT STALLS · 6 CATEGORIES</h3>
        <div className="grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-3">
          {p.permits.map(pm => {
            const approvalRate = pm.approvedThisMonth + pm.rejectedThisMonth === 0 ? 0
              : Math.round((pm.approvedThisMonth / (pm.approvedThisMonth + pm.rejectedThisMonth)) * 100);
            return (
              <article key={pm.category} className="px-4 py-3" style={{ background: STEEL_DEEP, borderTop: `2px solid ${ELECTRIC}` }}>
                <div className="flex items-baseline justify-between">
                  <span className="text-[11.5px]" style={{ color: PARCH }}>{PERMIT_LABEL[pm.category]}</span>
                  <span className="text-[9.5px]" style={{ color: AMBER }}>{pm.medianReviewDays}d median</span>
                </div>
                <div className="mt-2 grid grid-cols-3 gap-2 text-[10px]">
                  <div>
                    <div className="uppercase tracking-[0.2em]" style={{ color: MUT, fontSize: '8.5px' }}>PENDING</div>
                    <div className="tabular-nums text-[13px]" style={{ color: pm.pending > 3000 ? AMBER : INK }}>{pm.pending.toLocaleString()}</div>
                  </div>
                  <div>
                    <div className="uppercase tracking-[0.2em]" style={{ color: MUT, fontSize: '8.5px' }}>APPR. /MO</div>
                    <div className="tabular-nums text-[13px]" style={{ color: ELECTRIC }}>{pm.approvedThisMonth.toLocaleString()}</div>
                  </div>
                  <div>
                    <div className="uppercase tracking-[0.2em]" style={{ color: MUT, fontSize: '8.5px' }}>REJ. /MO</div>
                    <div className="tabular-nums text-[13px]" style={{ color: pm.rejectedThisMonth >= 100 ? RED : MUT }}>{pm.rejectedThisMonth.toLocaleString()}</div>
                  </div>
                </div>
                <div className="mt-2 h-1" style={{ background: STEEL }}>
                  <div className="h-full" style={{ width: `${approvalRate}%`, background: ELECTRIC }} />
                </div>
                <div className="mt-0.5 text-[9.5px]" style={{ color: ELECTRIC }}>approval {approvalRate}%</div>
              </article>
            );
          })}
        </div>
      </section>

      {/* Renewable integration requests + advisories */}
      <section className="grid grid-cols-1 gap-px lg:grid-cols-[1fr_360px]" style={{ background: RULE }}>
        <div className="px-8 py-5" style={{ background: STEEL_DEEP }}>
          <h3 className="mb-3 text-[10px] uppercase tracking-[0.36em]" style={{ color: AMBER }}>☀ RENEWABLE INTEGRATION REQUESTS · CAPACITY-SORTED</h3>
          <div className="overflow-hidden" style={{ background: STEEL }}>
            <div className="grid grid-cols-[80px_30px_120px_140px_100px_80px_100px] gap-2 px-3 py-2 text-[9px] uppercase tracking-[0.2em]" style={{ color: MUT, background: NAVY }}>
              <span>Req ID</span><span></span><span>Source</span><span>Region</span><span className="text-right">Capacity</span><span className="text-right">Days</span><span className="text-right">Status</span>
            </div>
            {p.renewableRequests.map(r => (
              <div key={r.id} className="grid grid-cols-[80px_30px_120px_140px_100px_80px_100px] items-center gap-2 px-3 py-2 text-[11px]" style={{ borderTop: `1px solid ${STEEL_DEEP}` }}>
                <span className="tabular-nums" style={{ color: AMBER }}>{r.id}</span>
                <span className="text-center text-[14px]" style={{ color: ELECTRIC }}>{SOURCE_GLYPH[r.source]}</span>
                <span style={{ color: PARCH }}>{r.source}</span>
                <span style={{ color: INK }}>{r.region}</span>
                <span className="text-right tabular-nums" style={{ color: r.capacityMw >= 100 ? ELECTRIC : INK }}>{r.capacityMw} MW</span>
                <span className="text-right tabular-nums" style={{ color: MUT }}>{r.daysOpen}d</span>
                <span className="text-right text-[9.5px] uppercase tracking-[0.2em]" style={{ color: RENEW_COL[r.status] }}>● {r.status.replace(/-/g, ' ')}</span>
              </div>
            ))}
          </div>
        </div>
        <aside className="px-6 py-5" style={{ background: STEEL }}>
          <h3 className="mb-3 text-[10px] uppercase tracking-[0.36em]" style={{ color: AMBER }}>📡 PUBLIC ADVISORIES · LIVE FEED</h3>
          <div className="space-y-2">
            {p.advisories.map(a => {
              const col = ADV_SEV[a.severity];
              return (
                <div key={a.id} className="px-3 py-2.5" style={{ background: STEEL_DEEP, borderLeft: `2px solid ${col}` }}>
                  <div className="flex items-baseline justify-between">
                    <span className="text-[14px]" style={{ color: col }}>{ADV_GLYPH[a.kind]}</span>
                    <span className="text-[9px] uppercase tracking-[0.2em]" style={{ color: col }}>● {a.severity}</span>
                  </div>
                  <div className="mt-1 text-[11px]" style={{ color: PARCH }}>{a.kind.replace(/-/g, ' ')}</div>
                  <div className="text-[9.5px]" style={{ color: MUT }}>{a.region} · {a.ageHrs}h</div>
                  <div className="mt-1 text-[9.5px] uppercase tracking-[0.2em]" style={{ color: AMBER }}>reach <span className="tabular-nums">{a.reachM}M</span></div>
                </div>
              );
            })}
          </div>
        </aside>
      </section>

      <div className="h-1 w-full" style={{ background: `repeating-linear-gradient(90deg, ${AMBER} 0 14px, ${STEEL_DEEP} 14px 24px)` }} />
    </div>
  );
}
