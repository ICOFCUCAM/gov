'use client';

// Transport — Public Transport Services Portal.
// Transit schedule grid (6 modes), permit stalls (6 categories),
// logistics request register (sorted by cargo), advisory feed.

import * as React from 'react';
import { transportExtendedBoard, type TransitSchedule, type TransportPermitFlow, type LogisticsRequest, type PublicAdvisoryMobility, type TransportMode } from '@/lib/gov/transport-extended';

const STEEL_DEEP = '#0d1117';
const STEEL = '#161b22';
const PANEL = '#1c2330';
const ORANGE = '#e0673a';
const AMBER = '#f0a13a';
const TEAL = '#3aa39c';
const NAVY = '#3a5680';
const RED = '#c44a3a';
const INK = '#d8dde2';
const PARCH = '#eaecef';
const MUT = '#7e8590';
const RULE = 'rgba(224,103,58,0.22)';

const ADV_COL: Record<PublicAdvisoryMobility['severity'], string> = {
  advisory: NAVY, warning: AMBER, critical: RED,
};
const STATUS_COL: Record<LogisticsRequest['status'], string> = {
  queued: MUT, routing: NAVY, scheduled: AMBER, 'in-transit': ORANGE, delivered: TEAL,
};
const MODE_GLYPH: Record<TransportMode, string> = {
  highway: '▰', rail: '═', aviation: '✈', maritime: '⛴', 'urban-transit': '◐', 'bridge-tunnel': '⌒',
};
const ADV_GLYPH: Record<PublicAdvisoryMobility['kind'], string> = {
  'congestion-alert': '⇉', 'corridor-closure': '✕', 'transit-disruption': '◐', 'weather-advisory': '⛈', 'cargo-priority-update': '📦', 'border-delay': '◊',
};
const SCHEDULE_GLYPH: Record<TransitSchedule['mode'], string> = {
  'urban-rail': '◐', 'long-distance-rail': '═', bus: '▰', ferry: '⛴', aviation: '✈', 'tram-light-rail': '○',
};
const PERMIT_LABEL: Record<TransportPermitFlow['category'], string> = {
  'commercial-vehicle': 'Commercial vehicle',
  'oversize-cargo': 'Oversize cargo',
  'hazardous-materials': 'Hazardous materials',
  'cross-border-freight': 'Cross-border freight',
  'special-event-routing': 'Special event routing',
  'aviation-charter': 'Aviation charter',
};

export function PublicTransportPortal({ id, now }: { id: string; now: number }) {
  void id;
  const b = transportExtendedBoard(now);
  const p = b.portal;
  return (
    <div style={{ background: STEEL_DEEP, color: INK, fontFamily: 'ui-sans-serif, "Inter", system-ui, sans-serif' }}>
      <div className="h-1 w-full" style={{ background: `repeating-linear-gradient(90deg, ${ORANGE} 0 32px, transparent 32px 48px)` }} />

      <header className="px-8 py-5" style={{ background: 'linear-gradient(180deg, #1c2330 0%, #0d1117 100%)', borderBottom: `1px solid ${RULE}` }}>
        <div className="flex items-baseline justify-between">
          <div>
            <div className="text-[10px] uppercase tracking-[0.42em]" style={{ color: ORANGE }}>NLO ▸ PUBLIC TRANSPORT SERVICES PORTAL</div>
            <h2 className="mt-2 text-[18px] tracking-[0.04em]" style={{ color: PARCH }}>
              {p.rideshipDailyMillions}M daily ridership · {p.logisticsRequests.length} live freight requests · uptime {p.portalAvailabilityPct}%
            </h2>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center" style={{ minWidth: '320px' }}>
            {[
              { l: 'Complaints open', v: p.citizenComplaintsOpen.toLocaleString(), c: p.citizenComplaintsOpen >= 3000 ? RED : AMBER },
              { l: 'Advisories', v: p.advisories.length, c: p.advisories.filter(a => a.severity === 'critical').length ? RED : NAVY },
              { l: 'Portal uptime', v: `${p.portalAvailabilityPct}%`, c: p.portalAvailabilityPct >= 99 ? TEAL : AMBER },
            ].map(x => (
              <div key={x.l} className="px-3 py-2" style={{ background: STEEL, borderLeft: `2px solid ${x.c}` }}>
                <div className="text-[8.5px] uppercase tracking-[0.24em]" style={{ color: MUT }}>{x.l}</div>
                <div className="mt-0.5 tabular-nums text-[16px]" style={{ color: x.c }}>{x.v}</div>
              </div>
            ))}
          </div>
        </div>
      </header>

      {/* Transit schedules */}
      <section className="px-8 py-5" style={{ background: STEEL_DEEP, borderBottom: `1px solid ${RULE}` }}>
        <h3 className="mb-3 text-[10px] uppercase tracking-[0.36em]" style={{ color: ORANGE }}>⏱ TRANSIT SCHEDULES · 6 MODES</h3>
        <div className="grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-3">
          {p.schedules.map(s => (
            <article key={s.mode} className="px-4 py-3" style={{ background: STEEL, borderTop: `2px solid ${s.onTimePct >= 90 ? TEAL : s.onTimePct >= 75 ? AMBER : RED}` }}>
              <div className="flex items-baseline justify-between">
                <span className="text-[12px]" style={{ color: PARCH }}>
                  <span className="mr-2 text-[16px]" style={{ color: TEAL }}>{SCHEDULE_GLYPH[s.mode]}</span>
                  {s.mode.replace(/-/g, ' ')}
                </span>
                <span className="text-[9.5px]" style={{ color: MUT }}>{s.routesActive} routes</span>
              </div>
              <div className="mt-2 grid grid-cols-4 gap-2 text-[10px]">
                <div>
                  <div className="uppercase tracking-[0.18em]" style={{ color: MUT, fontSize: '8.5px' }}>ON TIME</div>
                  <div className="tabular-nums text-[13px]" style={{ color: s.onTimePct >= 90 ? TEAL : AMBER }}>{s.onTimePct}%</div>
                </div>
                <div>
                  <div className="uppercase tracking-[0.18em]" style={{ color: MUT, fontSize: '8.5px' }}>CANCEL</div>
                  <div className="tabular-nums text-[13px]" style={{ color: s.cancelledToday >= 12 ? RED : INK }}>{s.cancelledToday}</div>
                </div>
                <div>
                  <div className="uppercase tracking-[0.18em]" style={{ color: MUT, fontSize: '8.5px' }}>HEADWAY</div>
                  <div className="tabular-nums text-[13px]" style={{ color: INK }}>{s.averageHeadwayMin}m</div>
                </div>
                <div>
                  <div className="uppercase tracking-[0.18em]" style={{ color: MUT, fontSize: '8.5px' }}>RIDES /D</div>
                  <div className="tabular-nums text-[13px]" style={{ color: ORANGE }}>{s.ridershipDailyK}K</div>
                </div>
              </div>
              <div className="mt-2 h-1" style={{ background: STEEL_DEEP }}>
                <div className="h-full" style={{ width: `${s.onTimePct}%`, background: s.onTimePct >= 90 ? TEAL : AMBER }} />
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* Permit stalls */}
      <section className="px-8 py-5" style={{ background: STEEL, borderBottom: `1px solid ${RULE}` }}>
        <h3 className="mb-3 text-[10px] uppercase tracking-[0.36em]" style={{ color: ORANGE }}>📜 TRANSPORT PERMIT STALLS · 6 CATEGORIES</h3>
        <div className="grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-3">
          {p.permits.map(pm => {
            const approvalRate = pm.approvedThisWeek + pm.rejectedThisWeek === 0 ? 0
              : Math.round((pm.approvedThisWeek / (pm.approvedThisWeek + pm.rejectedThisWeek)) * 100);
            return (
              <article key={pm.category} className="px-4 py-3" style={{ background: STEEL_DEEP, borderLeft: `2px solid ${ORANGE}` }}>
                <div className="flex items-baseline justify-between">
                  <span className="text-[11.5px]" style={{ color: PARCH }}>{PERMIT_LABEL[pm.category]}</span>
                  <span className="text-[9.5px]" style={{ color: AMBER }}>{pm.medianReviewDays}d median</span>
                </div>
                <div className="mt-2 grid grid-cols-3 gap-2 text-[10px]">
                  <div>
                    <div className="uppercase tracking-[0.2em]" style={{ color: MUT, fontSize: '8.5px' }}>PENDING</div>
                    <div className="tabular-nums text-[13px]" style={{ color: pm.pending > 2000 ? AMBER : INK }}>{pm.pending.toLocaleString()}</div>
                  </div>
                  <div>
                    <div className="uppercase tracking-[0.2em]" style={{ color: MUT, fontSize: '8.5px' }}>APPR. /WK</div>
                    <div className="tabular-nums text-[13px]" style={{ color: TEAL }}>{pm.approvedThisWeek.toLocaleString()}</div>
                  </div>
                  <div>
                    <div className="uppercase tracking-[0.2em]" style={{ color: MUT, fontSize: '8.5px' }}>REJ. /WK</div>
                    <div className="tabular-nums text-[13px]" style={{ color: pm.rejectedThisWeek >= 80 ? RED : MUT }}>{pm.rejectedThisWeek.toLocaleString()}</div>
                  </div>
                </div>
                <div className="mt-2 h-1" style={{ background: STEEL_DEEP }}>
                  <div className="h-full" style={{ width: `${approvalRate}%`, background: TEAL }} />
                </div>
                <div className="mt-0.5 text-[9.5px]" style={{ color: TEAL }}>approval {approvalRate}%</div>
              </article>
            );
          })}
        </div>
      </section>

      {/* Logistics requests + advisories */}
      <section className="grid grid-cols-1 gap-px lg:grid-cols-[1fr_360px]" style={{ background: RULE }}>
        <div className="px-8 py-5" style={{ background: STEEL_DEEP }}>
          <h3 className="mb-3 text-[10px] uppercase tracking-[0.36em]" style={{ color: ORANGE }}>📦 LOGISTICS REQUESTS · CARGO-SORTED</h3>
          <div className="overflow-hidden" style={{ background: STEEL }}>
            <div className="grid grid-cols-[80px_30px_180px_140px_140px_80px_100px] gap-2 px-3 py-2 text-[9px] uppercase tracking-[0.2em]" style={{ color: MUT, background: PANEL }}>
              <span>Req ID</span><span></span><span>Shipper</span><span>Origin</span><span>Destination</span><span className="text-right">Cargo t</span><span className="text-right">Status</span>
            </div>
            {p.logisticsRequests.map(r => (
              <div key={r.id} className="grid grid-cols-[80px_30px_180px_140px_140px_80px_100px] items-center gap-2 px-3 py-2 text-[11px]" style={{ borderTop: `1px solid ${STEEL_DEEP}` }}>
                <span className="tabular-nums" style={{ color: AMBER }}>{r.id}</span>
                <span className="text-center text-[14px]" style={{ color: TEAL }}>{MODE_GLYPH[r.mode]}</span>
                <span style={{ color: PARCH }}>{r.shipper}</span>
                <span style={{ color: INK }}>{r.origin}</span>
                <span style={{ color: INK }}>{r.destination}</span>
                <span className="text-right tabular-nums" style={{ color: r.cargoTons >= 1000 ? ORANGE : INK }}>{r.cargoTons.toLocaleString()}</span>
                <span className="text-right text-[9.5px] uppercase tracking-[0.2em]" style={{ color: STATUS_COL[r.status] }}>● {r.status.replace(/-/g, ' ')}</span>
              </div>
            ))}
          </div>
        </div>
        <aside className="px-6 py-5" style={{ background: STEEL }}>
          <h3 className="mb-3 text-[10px] uppercase tracking-[0.36em]" style={{ color: ORANGE }}>📡 PUBLIC ADVISORIES · LIVE FEED</h3>
          <div className="space-y-2">
            {p.advisories.map(a => {
              const col = ADV_COL[a.severity];
              return (
                <div key={a.id} className="px-3 py-2.5" style={{ background: STEEL_DEEP, borderLeft: `2px solid ${col}` }}>
                  <div className="flex items-baseline justify-between">
                    <span className="text-[14px]" style={{ color: col }}>{ADV_GLYPH[a.kind]}</span>
                    <span className="text-[9px] uppercase tracking-[0.2em]" style={{ color: col }}>● {a.severity}</span>
                  </div>
                  <div className="mt-1 text-[11px]" style={{ color: PARCH }}>{a.kind.replace(/-/g, ' ')}</div>
                  <div className="text-[9.5px]" style={{ color: MUT }}>{a.region} · {a.ageHrs}h ago</div>
                  <div className="mt-1 text-[9.5px] uppercase tracking-[0.2em]" style={{ color: AMBER }}>reach <span className="tabular-nums">{a.reachM}M</span></div>
                </div>
              );
            })}
          </div>
        </aside>
      </section>

      <div className="h-1 w-full" style={{ background: `repeating-linear-gradient(90deg, ${ORANGE} 0 32px, transparent 32px 48px)` }} />
    </div>
  );
}
