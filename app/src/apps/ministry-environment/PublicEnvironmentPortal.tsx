'use client';

// Environment — Public Environment Portal.
// Citizen-facing surface: permit application flows, citizen incident
// report queue, public advisory feed, participation metrics.
// Distinct geometry: card grid + queue list + advisory feed strips.

import * as React from 'react';
import { environmentalGovernanceBoard, type PermitApplicationFlow, type CitizenIncidentReport, type PublicAdvisory } from '@/lib/gov/environmental-governance';

const FOREST_DEEP = '#152721';
const PANEL = '#1a221f';
const PANEL2 = '#1f2925';
const CANOPY = '#4f7a5e';
const EARTH = '#5a4a35';
const ATMOS = '#6a7d8a';
const AMBER = '#b88b3a';
const GLACIER = '#e5e8e6';
const INK = '#d6dad3';
const MUT = '#7d8881';
const ALERT = '#a04030';

const STATUS_COL: Record<CitizenIncidentReport['status'], string> = {
  received: ATMOS, triaged: AMBER, investigating: '#a05538', resolved: CANOPY,
};
const SEV_COL: Record<CitizenIncidentReport['severity'], string> = {
  low: CANOPY, elevated: AMBER, severe: ALERT,
};
const ADV_SEV_COL: Record<PublicAdvisory['severity'], string> = {
  advisory: ATMOS, warning: AMBER, emergency: ALERT,
};
const ADV_GLYPH: Record<PublicAdvisory['channel'], string> = {
  'wildfire-alert': '🜂', 'flood-notice': '≋', 'air-quality-warning': '☁', 'conservation-call': '◇', 'water-restriction': '⌬',
};
const INC_GLYPH: Record<CitizenIncidentReport['kind'], string> = {
  'pollution-event': '☁', 'illegal-dumping': '◇', 'wildlife-distress': '◈', 'water-contamination': '≋', 'air-quality': '∴', 'illegal-logging': '⛬',
};
const PERMIT_LABEL: Record<PermitApplicationFlow['category'], string> = {
  'environmental-impact': 'Environmental impact assessment',
  'water-use': 'Water-use permit',
  emissions: 'Emissions permit',
  'land-change': 'Land-use change permit',
  'waste-disposal': 'Waste disposal permit',
};

export function PublicEnvironmentPortal({ id, now }: { id: string; now: number }) {
  void id;
  const b = environmentalGovernanceBoard(now);
  const p = b.portal;
  return (
    <div style={{ background: FOREST_DEEP, color: INK, fontFamily: 'ui-sans-serif, "Inter", system-ui, sans-serif' }}>
      {/* Public-service banner */}
      <header className="px-8 py-5" style={{ background: 'linear-gradient(180deg, #1f2925 0%, #152721 100%)', borderBottom: '1px solid rgba(229,232,230,0.06)' }}>
        <div className="flex items-baseline justify-between">
          <div>
            <div className="text-[9px] uppercase tracking-[0.5em]" style={{ color: GLACIER, opacity: 0.75 }}>Public Environment Portal</div>
            <h2 className="mt-2 text-[18px] tracking-[0.02em]" style={{ color: GLACIER }}>
              {p.reports.length} active citizen reports · {p.advisories.length} public advisories · participation {p.participationIdx}
            </h2>
          </div>
          <div className="grid grid-cols-4 gap-3 text-center" style={{ minWidth: '480px' }}>
            {[
              { l: 'Participation', v: p.participationIdx, c: p.participationIdx >= 70 ? CANOPY : ATMOS },
              { l: 'Conservation enrol.', v: `${p.conservationEnrolmentsK}K`, c: CANOPY },
              { l: 'Education progs.', v: p.educationProgrammesActive, c: AMBER },
              { l: 'Portal uptime', v: `${p.portalUptimePct}%`, c: p.portalUptimePct >= 99 ? CANOPY : ATMOS },
            ].map(x => (
              <div key={x.l} className="px-3 py-2" style={{ background: PANEL2, border: '1px solid rgba(229,232,230,0.06)' }}>
                <div className="text-[8.5px] uppercase tracking-[0.24em]" style={{ color: MUT }}>{x.l}</div>
                <div className="mt-1 tabular-nums text-[16px]" style={{ color: x.c }}>{x.v}</div>
              </div>
            ))}
          </div>
        </div>
      </header>

      {/* Permit application flows */}
      <section className="px-8 py-5" style={{ background: PANEL, borderBottom: '1px solid rgba(229,232,230,0.06)' }}>
        <h3 className="mb-3 text-[10px] uppercase tracking-[0.36em]" style={{ color: GLACIER }}>◊ Environmental permit applications</h3>
        <div className="grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-3">
          {p.permits.map(pp => (
            <div key={pp.category} className="px-4 py-3" style={{ background: PANEL2, border: '1px solid rgba(229,232,230,0.06)' }}>
              <div className="flex items-baseline justify-between">
                <span className="text-[12px]" style={{ color: GLACIER }}>{PERMIT_LABEL[pp.category]}</span>
                <span className="text-[9px] uppercase tracking-[0.2em]" style={{ color: MUT }}>· {pp.category}</span>
              </div>
              <div className="mt-3 grid grid-cols-4 gap-2 text-center text-[10px]">
                <div>
                  <div className="uppercase tracking-[0.18em]" style={{ color: MUT, fontSize: '8.5px' }}>Pending</div>
                  <div className="tabular-nums text-[14px]" style={{ color: pp.pending > 1500 ? AMBER : INK }}>{pp.pending.toLocaleString()}</div>
                </div>
                <div>
                  <div className="uppercase tracking-[0.18em]" style={{ color: MUT, fontSize: '8.5px' }}>Approved</div>
                  <div className="tabular-nums text-[14px]" style={{ color: CANOPY }}>{pp.approvedToday}</div>
                </div>
                <div>
                  <div className="uppercase tracking-[0.18em]" style={{ color: MUT, fontSize: '8.5px' }}>Rejected</div>
                  <div className="tabular-nums text-[14px]" style={{ color: pp.rejectedToday >= 20 ? ALERT : MUT }}>{pp.rejectedToday}</div>
                </div>
                <div>
                  <div className="uppercase tracking-[0.18em]" style={{ color: MUT, fontSize: '8.5px' }}>Median d</div>
                  <div className="tabular-nums text-[14px]" style={{ color: pp.medianReviewDays >= 60 ? AMBER : ATMOS }}>{pp.medianReviewDays}</div>
                </div>
              </div>
              {pp.appealsOpen > 0 ? (
                <div className="mt-2 text-[9.5px] uppercase tracking-[0.18em]" style={{ color: AMBER }}>
                  ⤴ {pp.appealsOpen} appeal{pp.appealsOpen === 1 ? '' : 's'} open
                </div>
              ) : null}
            </div>
          ))}
        </div>
      </section>

      {/* Citizen incident reports queue */}
      <section className="px-8 py-5" style={{ background: FOREST_DEEP, borderBottom: '1px solid rgba(229,232,230,0.06)' }}>
        <div className="mb-3 flex items-baseline justify-between">
          <h3 className="text-[10px] uppercase tracking-[0.36em]" style={{ color: GLACIER }}>✉ Citizen incident reports · live queue</h3>
          <span className="text-[9px] uppercase tracking-[0.22em]" style={{ color: MUT }}>most recent first</span>
        </div>
        <div className="overflow-hidden" style={{ background: PANEL }}>
          <div className="grid grid-cols-[80px_140px_140px_1fr_110px_100px_100px] gap-3 px-4 py-2 text-[9px] uppercase tracking-[0.2em]" style={{ color: MUT, background: PANEL2 }}>
            <span>Report</span><span>Kind</span><span>Region</span><span>Status pipeline</span><span className="text-right">Hours ago</span><span className="text-right">Severity</span><span className="text-right">Stage</span>
          </div>
          {p.reports.map(r => {
            const stages: CitizenIncidentReport['status'][] = ['received', 'triaged', 'investigating', 'resolved'];
            const idx = stages.indexOf(r.status);
            return (
              <div key={r.id} className="grid grid-cols-[80px_140px_140px_1fr_110px_100px_100px] items-center gap-3 px-4 py-2.5 text-[11px]" style={{ borderTop: '1px solid rgba(229,232,230,0.05)' }}>
                <span className="tabular-nums" style={{ color: MUT }}>{r.id}</span>
                <span style={{ color: GLACIER }}>
                  <span className="mr-2" style={{ color: EARTH }}>{INC_GLYPH[r.kind]}</span>{r.kind.replace(/-/g, ' ')}
                </span>
                <span style={{ color: MUT }}>{r.region}</span>
                <div className="flex items-center gap-1">
                  {stages.map((s, si) => (
                    <React.Fragment key={s}>
                      <span className="block rounded-full" style={{
                        width: si === idx ? 8 : 5,
                        height: si === idx ? 8 : 5,
                        background: si <= idx ? STATUS_COL[r.status] : 'rgba(214,218,211,0.16)',
                      }} />
                      {si < stages.length - 1 ? <span className="block h-px w-3" style={{ background: si < idx ? STATUS_COL[r.status] : 'rgba(214,218,211,0.08)' }} /> : null}
                    </React.Fragment>
                  ))}
                </div>
                <span className="text-right tabular-nums" style={{ color: MUT }}>{r.reportedHrsAgo}h</span>
                <span className="text-right text-[9.5px] uppercase tracking-[0.2em]" style={{ color: SEV_COL[r.severity] }}>● {r.severity}</span>
                <span className="text-right text-[9.5px] uppercase tracking-[0.2em]" style={{ color: STATUS_COL[r.status] }}>· {r.status}</span>
              </div>
            );
          })}
        </div>
      </section>

      {/* Public advisory feed */}
      <section className="px-8 py-5" style={{ background: PANEL }}>
        <h3 className="mb-3 text-[10px] uppercase tracking-[0.36em]" style={{ color: GLACIER }}>📡 Public advisory feed · live channels</h3>
        <div className="grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-3">
          {p.advisories.map(a => {
            const col = ADV_SEV_COL[a.severity];
            return (
              <div key={a.id} className="px-4 py-3" style={{ background: PANEL2, borderLeft: `3px solid ${col}` }}>
                <div className="flex items-baseline justify-between">
                  <span className="text-[14px]" style={{ color: col }}>{ADV_GLYPH[a.channel]}</span>
                  <span className="text-[9px] uppercase tracking-[0.22em]" style={{ color: col }}>● {a.severity}</span>
                </div>
                <div className="mt-1 text-[12px]" style={{ color: GLACIER }}>{a.channel.replace(/-/g, ' ')}</div>
                <div className="text-[10px]" style={{ color: MUT }}>{a.region} · {a.ageHrs}h ago</div>
                <div className="mt-2 text-[9.5px] uppercase tracking-[0.2em]" style={{ color: AMBER }}>
                  reach <span className="tabular-nums">{a.reachK.toLocaleString()}K</span> citizens
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
