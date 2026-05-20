'use client';

// Labour — Workplace Safety & Labour Rights Enforcement.
// Inspection register (severity-sorted), occupational incident
// ledger (fatalities surface first), tribunal lane register.
// Distinct geometry from Justice forum lanes — uses inspection
// findings count + remediation progress bars.

import * as React from 'react';
import { labourExtendedBoard, type WorkplaceInspection, type OccupationalIncident, type TribunalLane } from '@/lib/gov/labour-extended';

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

const INSPECT_COL: Record<WorkplaceInspection['severity'], string> = {
  compliant: TEAL, 'minor-findings': AMBER, 'major-findings': COPPER, 'shutdown-order': ALERT,
};
const INCIDENT_COL: Record<OccupationalIncident['kind'], string> = {
  injury: AMBER, fatality: ALERT, 'chemical-exposure': COPPER, 'mental-health-event': CIVIC, 'equipment-failure': COPPER, harassment: COPPER,
};
const STATUS_COL: Record<OccupationalIncident['status'], string> = {
  reported: ALERT, investigation: COPPER, remediation: AMBER, closed: TEAL,
};
const SECTOR_GLYPH: Record<WorkplaceInspection['sector'], string> = {
  manufacturing: '⚙', mining: '⛏', agriculture: '🌾', logistics: '📦', energy: '⚡', services: '◐', retail: '◇',
};

const TRIBUNAL_LABEL: Record<TribunalLane['lane'], string> = {
  mediation: 'Mediation', conciliation: 'Conciliation', arbitration: 'Arbitration', 'labour-court': 'Labour court',
};

export function WorkplaceSafetyRights({ id, now }: { id: string; now: number }) {
  void id;
  const b = labourExtendedBoard(now);
  const r = b.rights;
  return (
    <div style={{ background: SLATE_DEEP, color: INK, fontFamily: '"Inter", ui-sans-serif, system-ui, sans-serif' }}>
      <header className="px-8 py-5" style={{ background: 'linear-gradient(180deg, #2a2f36 0%, #1d2128 100%)', borderBottom: `1px solid ${SLATE}40` }}>
        <div className="flex items-start justify-between gap-6">
          <div>
            <div className="text-[10px] uppercase tracking-[0.42em]" style={{ color: AMBER }}>Workplace Safety &amp; Labour Rights Enforcement</div>
            <h2 className="mt-2 text-[18px] tracking-[0.02em]" style={{ color: PAPER }}>
              {r.inspections.length} inspections · {r.incidents.length} active incidents · {r.tribunalLanes.length} tribunal lanes
            </h2>
          </div>
          <div className="grid grid-cols-4 gap-2 text-center" style={{ minWidth: '520px' }}>
            {[
              { l: 'Fatalities YTD', v: r.workplaceFatalitiesThisYear, c: r.workplaceFatalitiesThisYear >= 250 ? ALERT : COPPER },
              { l: 'Injuries Q', v: r.workplaceInjuriesThisQ.toLocaleString(), c: r.workplaceInjuriesThisQ >= 8000 ? COPPER : AMBER },
              { l: 'Enforcement /mo', v: r.enforcementActionsMonth, c: TEAL },
              { l: 'Compliance idx', v: r.complianceIdx, c: r.complianceIdx >= 75 ? TEAL : AMBER },
            ].map(x => (
              <div key={x.l} className="rounded-md px-3 py-2" style={{ background: PANEL2 }}>
                <div className="text-[8.5px] uppercase tracking-[0.24em]" style={{ color: MUT }}>{x.l}</div>
                <div className="mt-0.5 tabular-nums text-[15px]" style={{ color: x.c }}>{x.v}</div>
              </div>
            ))}
          </div>
        </div>
      </header>

      {/* Workplace inspections */}
      <section className="px-8 py-6" style={{ background: SLATE_DEEP, borderBottom: `1px solid ${SLATE}40` }}>
        <h3 className="mb-3 text-[10px] uppercase tracking-[0.36em]" style={{ color: AMBER }}>⊡ Workplace inspection register · severity-sorted</h3>
        <div className="overflow-hidden rounded-md" style={{ background: PANEL }}>
          <div className="grid grid-cols-[80px_30px_120px_140px_70px_1fr_100px] gap-2 px-3 py-2 text-[9px] uppercase tracking-[0.2em]" style={{ color: MUT, background: PANEL2 }}>
            <span>ID</span><span></span><span>Region · Sector</span><span>Kind</span><span className="text-right">Findings</span><span>Remediation</span><span className="text-right">Severity</span>
          </div>
          {r.inspections.map(insp => (
            <div key={insp.id} className="grid grid-cols-[80px_30px_120px_140px_70px_1fr_100px] items-center gap-2 px-3 py-2 text-[11px]" style={{ borderTop: `1px solid ${SLATE_DEEP}` }}>
              <span className="tabular-nums" style={{ color: AMBER }}>{insp.id}</span>
              <span className="text-center text-[14px]" style={{ color: INSPECT_COL[insp.severity] }}>{SECTOR_GLYPH[insp.sector]}</span>
              <div>
                <div style={{ color: PAPER }}>{insp.region}</div>
                <div className="text-[9px]" style={{ color: MUT }}>{insp.sector}</div>
              </div>
              <span className="text-[9.5px] uppercase tracking-[0.18em]" style={{ color: CIVIC }}>{insp.inspectionKind.replace(/-/g, ' ')}</span>
              <span className="text-right tabular-nums" style={{ color: insp.findings >= 6 ? ALERT : insp.findings >= 1 ? AMBER : TEAL }}>{insp.findings}</span>
              <div className="flex items-center gap-2">
                <div className="h-1 flex-1 rounded-full" style={{ background: SLATE_DEEP }}>
                  <div className="h-full rounded-full" style={{ width: `${insp.remediationProgressPct}%`, background: insp.remediationProgressPct >= 80 ? TEAL : AMBER }} />
                </div>
                <span className="tabular-nums text-[9.5px]" style={{ color: insp.remediationProgressPct >= 80 ? TEAL : AMBER }}>{insp.remediationProgressPct}%</span>
              </div>
              <span className="text-right text-[9.5px] uppercase tracking-[0.2em]" style={{ color: INSPECT_COL[insp.severity] }}>● {insp.severity.replace(/-/g, ' ')}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Occupational incidents */}
      <section className="px-8 py-6" style={{ background: PANEL, borderBottom: `1px solid ${SLATE}40` }}>
        <h3 className="mb-3 text-[10px] uppercase tracking-[0.36em]" style={{ color: AMBER }}>⚠ Occupational incident ledger · fatalities first</h3>
        <div className="grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-4">
          {r.incidents.map(inc => (
            <article key={inc.id} className="rounded-md px-4 py-3" style={{ background: PANEL2, borderLeft: `3px solid ${INCIDENT_COL[inc.kind]}` }}>
              <div className="flex items-baseline justify-between">
                <span className="text-[14px]" style={{ color: INCIDENT_COL[inc.kind] }}>{inc.kind === 'fatality' ? '✕' : inc.kind === 'chemical-exposure' ? '⚗' : inc.kind === 'injury' ? '⊕' : inc.kind === 'harassment' ? '⊘' : inc.kind === 'mental-health-event' ? '◇' : '⚙'}</span>
                <span className="text-[9.5px] uppercase tracking-[0.2em]" style={{ color: STATUS_COL[inc.status] }}>● {inc.status}</span>
              </div>
              <div className="mt-1 text-[11px]" style={{ color: PAPER }}>{inc.kind.replace(/-/g, ' ')}</div>
              <div className="text-[9.5px] italic" style={{ color: MUT }}>{inc.region} · {inc.sector} · {inc.ageDays}d</div>
              <div className="mt-2 text-[10px] uppercase tracking-[0.18em]" style={{ color: AMBER }}>
                <span className="tabular-nums">{inc.workersAffected}</span> worker{inc.workersAffected === 1 ? '' : 's'} affected
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* Tribunal lanes */}
      <section className="px-8 py-6" style={{ background: SLATE_DEEP }}>
        <h3 className="mb-3 text-[10px] uppercase tracking-[0.36em]" style={{ color: AMBER }}>⚖ Tribunal lanes · dispute resolution capacity</h3>
        <div className="grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-4">
          {r.tribunalLanes.map(l => (
            <article key={l.lane} className="rounded-md px-4 py-4" style={{ background: PANEL, borderTop: `2px solid ${CIVIC}` }}>
              <div className="text-[11px] uppercase tracking-[0.22em]" style={{ color: PAPER }}>{TRIBUNAL_LABEL[l.lane]}</div>
              <div className="mt-3 grid grid-cols-2 gap-2 text-center text-[10px]">
                <div>
                  <div className="uppercase tracking-[0.18em]" style={{ color: MUT, fontSize: '8.5px' }}>Active</div>
                  <div className="tabular-nums text-[14px]" style={{ color: INK }}>{l.casesActive.toLocaleString()}</div>
                </div>
                <div>
                  <div className="uppercase tracking-[0.18em]" style={{ color: MUT, fontSize: '8.5px' }}>Pending hearings</div>
                  <div className="tabular-nums text-[14px]" style={{ color: l.pendingHearings >= 300 ? COPPER : AMBER }}>{l.pendingHearings}</div>
                </div>
                <div>
                  <div className="uppercase tracking-[0.18em]" style={{ color: MUT, fontSize: '8.5px' }}>Mean res.</div>
                  <div className="tabular-nums text-[14px]" style={{ color: l.meanResolutionDays >= 180 ? COPPER : AMBER }}>{l.meanResolutionDays}d</div>
                </div>
                <div>
                  <div className="uppercase tracking-[0.18em]" style={{ color: MUT, fontSize: '8.5px' }}>Worker win</div>
                  <div className="tabular-nums text-[14px]" style={{ color: l.workerWinRatePct >= 60 ? TEAL : AMBER }}>{l.workerWinRatePct}%</div>
                </div>
              </div>
              <div className="mt-3 h-1 rounded-full" style={{ background: SLATE_DEEP }}>
                <div className="h-full rounded-full" style={{ width: `${l.workerWinRatePct}%`, background: TEAL }} />
              </div>
            </article>
          ))}
        </div>
      </section>
      {void SLATE_DARK}
    </div>
  );
}
