'use client';

// Transport domains — Intelligence, Portal & Oversight surfaces.

import * as React from 'react';
import { transportExtendedBoard, TRANSPORT_EXTENDED_SAFEGUARDS } from '@/lib/gov/transport-extended';
import { CorridorFrame, CorridorKpi, CorridorRule, CorridorBar, CorridorCallout, TRANSPORT_DS } from '@/apps/ministry-transport/design-system/transport-ds';

export function DemandForecast({ id, now }: { id: string; now: number }) {
  const ext = transportExtendedBoard(now);
  void id;
  return (
    <CorridorFrame archetype="intelligence" code="IN-DMD-23" title="Demand Forecast"
      subtitle={`${ext.intelligence.demand.horizonYears.join('y / ')}y horizons`}>
      <CorridorKpi items={[
        { label: 'Long-horizon resilience', value: `${ext.intelligence.longHorizonResilienceIdx}/100`, tone: 'ok' },
        { label: 'Systemic risk', value: `${ext.intelligence.systemicMobilityRisk}/100`, tone: 'warn' },
        { label: 'AI reasoning', value: `${ext.intelligence.aiReasoningCoveragePct}%`, tone: 'info' },
        { label: 'Horizons', value: ext.intelligence.demand.horizonYears.length },
      ]} />
      <CorridorRule label="trajectories" />
      <div className="grid grid-cols-2 gap-2 text-[11px] md:grid-cols-3">
        {['Passenger-km', 'Freight ton-km', 'Electrification %', 'Congestion idx', 'Infra resilience', 'Modal shift to rail %'].map((label, i) => {
          const series = [ext.intelligence.demand.passengerKmTrajectory, ext.intelligence.demand.freightTonKmTrajectory, ext.intelligence.demand.electrificationShareTrajectory, ext.intelligence.demand.congestionIndexTrajectory, ext.intelligence.demand.infrastructureResilienceTrajectory, ext.intelligence.demand.modalShiftTowardsRailPctTrajectory][i]!;
          const last = series[series.length - 1] ?? 0;
          const isStress = label === 'Congestion idx';
          return (
            <div key={label} className="border p-2" style={{ borderColor: TRANSPORT_DS.rule }}>
              <div className="text-[9px] uppercase tracking-[0.18em]" style={{ color: TRANSPORT_DS.mut, fontFamily: 'ui-monospace, monospace' }}>{label}</div>
              <div className="text-[13px] font-semibold tabular-nums" style={{ color: isStress ? TRANSPORT_DS.signal : TRANSPORT_DS.rail }}>{last}</div>
              <div className="mt-1 flex items-end gap-1">
                {series.map((v, j) => (
                  <div key={j} className="flex-1" style={{ height: `${Math.max(2, Math.min(40, Math.abs(v) / 3))}px`, background: isStress ? TRANSPORT_DS.signal : TRANSPORT_DS.rail }} />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </CorridorFrame>
  );
}

export function ClimateMobilityRisk({ id, now }: { id: string; now: number }) {
  const ext = transportExtendedBoard(now);
  void id;
  return (
    <CorridorFrame archetype="intelligence" code="IN-CMR-24" title="Climate Mobility Risk"
      subtitle="climate-hazard mobility composite">
      <CorridorKpi items={[
        { label: 'Hazards tracked', value: ext.intelligence.climateRisks.length },
        { label: 'Severe', value: ext.intelligence.climateRisks.filter(r => r.classification === 'severe').length, tone: 'alert' },
        { label: 'Elevated', value: ext.intelligence.climateRisks.filter(r => r.classification === 'elevated').length, tone: 'warn' },
        { label: 'Mean preparedness', value: Math.round(ext.intelligence.climateRisks.reduce((s, r) => s + r.preparednessIdx, 0) / Math.max(1, ext.intelligence.climateRisks.length)), tone: 'info' },
      ]} />
      <CorridorRule label="hazard register" />
      {ext.intelligence.climateRisks.map(r => (
        <div key={r.hazard} className="grid grid-cols-[200px_80px_80px_80px_100px_100px] gap-3 border-b py-1.5 text-[11px]"
          style={{ borderColor: TRANSPORT_DS.ruleSoft, fontFamily: 'ui-monospace, monospace' }}>
          <span style={{ color: TRANSPORT_DS.harbour }}>{r.hazard}</span>
          <span className="text-right tabular-nums" style={{ color: TRANSPORT_DS.mut }}>p {r.probabilityNext12mPct}%</span>
          <span className="text-right tabular-nums" style={{ color: TRANSPORT_DS.mut }}>i {r.impactIfRealisedIdx}</span>
          <span className="text-right tabular-nums" style={{ color: TRANSPORT_DS.mut }}>pr {r.preparednessIdx}</span>
          <span className="text-right tabular-nums" style={{ color: TRANSPORT_DS.ink }}>c {r.composite}</span>
          <span className="text-right uppercase tracking-[0.16em]"
            style={{ color: r.classification === 'severe' ? TRANSPORT_DS.coral : r.classification === 'elevated' ? TRANSPORT_DS.signal : r.classification === 'moderate' ? TRANSPORT_DS.harbour : TRANSPORT_DS.rail }}>● {r.classification}</span>
        </div>
      ))}
    </CorridorFrame>
  );
}

export function FreightBottlenecks({ id, now }: { id: string; now: number }) {
  const ext = transportExtendedBoard(now);
  void id;
  return (
    <CorridorFrame archetype="intelligence" code="IN-BTL-25" title="Freight Bottlenecks"
      subtitle="bottleneck register">
      <CorridorKpi items={[
        { label: 'Bottlenecks', value: ext.intelligence.bottlenecks.length },
        { label: 'Critical', value: ext.intelligence.bottlenecks.filter(b => b.classification === 'critical').length, tone: 'alert' },
        { label: 'Congested', value: ext.intelligence.bottlenecks.filter(b => b.classification === 'congested').length, tone: 'warn' },
        { label: 'Mean delay (h)', value: Math.round(ext.intelligence.bottlenecks.reduce((s, b) => s + b.averageDelayHrs, 0) / Math.max(1, ext.intelligence.bottlenecks.length)) },
      ]} />
      <CorridorRule label="bottleneck register" />
      {ext.intelligence.bottlenecks.map(b => (
        <div key={b.id} className="grid grid-cols-[110px_180px_80px_80px_100px_100px] gap-3 border-b py-1.5 text-[11px]"
          style={{ borderColor: TRANSPORT_DS.ruleSoft, fontFamily: 'ui-monospace, monospace' }}>
          <span style={{ color: TRANSPORT_DS.harbour }}>{b.id}</span>
          <span style={{ color: TRANSPORT_DS.ink }}>{b.corridor} · {b.mode}</span>
          <span className="text-right tabular-nums" style={{ color: TRANSPORT_DS.mut }}>{b.utilisationPct}%</span>
          <span className="text-right tabular-nums" style={{ color: TRANSPORT_DS.mut }}>{b.averageDelayHrs}h</span>
          <span className="text-right tabular-nums" style={{ color: b.vulnerabilityIdx > 65 ? TRANSPORT_DS.coral : b.vulnerabilityIdx > 40 ? TRANSPORT_DS.signal : TRANSPORT_DS.rail }}>v {b.vulnerabilityIdx}</span>
          <span className="text-right uppercase tracking-[0.16em]"
            style={{ color: b.classification === 'critical' ? TRANSPORT_DS.coral : b.classification === 'congested' ? TRANSPORT_DS.signal : b.classification === 'thinning' ? TRANSPORT_DS.harbour : TRANSPORT_DS.rail }}>● {b.classification}</span>
        </div>
      ))}
    </CorridorFrame>
  );
}

export function MobilityAnomalies({ id, now }: { id: string; now: number }) {
  const ext = transportExtendedBoard(now);
  void id;
  return (
    <CorridorFrame archetype="intelligence" code="IN-ANM-26" title="Mobility Anomalies"
      subtitle="anomaly detection feed">
      <CorridorKpi items={[
        { label: 'Active anomalies', value: ext.intelligence.anomalies.length },
        { label: 'Critical tier', value: ext.intelligence.anomalies.filter(a => a.tier === 'critical').length, tone: 'alert' },
        { label: 'Urgent', value: ext.intelligence.anomalies.filter(a => a.tier === 'urgent').length, tone: 'alert' },
        { label: 'Mean confidence', value: `${Math.round(ext.intelligence.anomalies.reduce((s, a) => s + a.confidence, 0) / Math.max(1, ext.intelligence.anomalies.length))}/100`, tone: 'info' },
      ]} />
      <CorridorRule label="anomaly ledger" />
      {ext.intelligence.anomalies.map(a => (
        <div key={a.id} className="grid grid-cols-[110px_220px_140px_80px_100px] gap-3 border-b py-1.5 text-[11px]"
          style={{ borderColor: TRANSPORT_DS.ruleSoft, fontFamily: 'ui-monospace, monospace' }}>
          <span style={{ color: TRANSPORT_DS.harbour }}>{a.id}</span>
          <span style={{ color: TRANSPORT_DS.ink }}>{a.signal}</span>
          <span style={{ color: TRANSPORT_DS.mut }}>{a.region}</span>
          <span className="text-right tabular-nums" style={{ color: TRANSPORT_DS.mut }}>conf {a.confidence}</span>
          <span className="text-right uppercase tracking-[0.16em]"
            style={{ color: a.tier === 'critical' || a.tier === 'urgent' ? TRANSPORT_DS.coral : a.tier === 'elevated' ? TRANSPORT_DS.signal : TRANSPORT_DS.rail }}>● {a.tier}</span>
        </div>
      ))}
    </CorridorFrame>
  );
}

export function TransitSchedules({ id, now }: { id: string; now: number }) {
  const ext = transportExtendedBoard(now);
  void id;
  return (
    <CorridorFrame archetype="portal" code="PR-SCH-28" title="Transit Schedules"
      subtitle="per-route schedule transparency">
      <CorridorKpi items={[
        { label: 'Modes', value: ext.portal.schedules.length },
        { label: 'Mean on-time', value: `${Math.round(ext.portal.schedules.reduce((s, t) => s + t.onTimePct, 0) / Math.max(1, ext.portal.schedules.length))}%`, tone: 'ok' },
        { label: 'Cancelled today', value: ext.portal.schedules.reduce((s, t) => s + t.cancelledToday, 0), tone: 'warn' },
        { label: 'Daily ridership (k)', value: ext.portal.schedules.reduce((s, t) => s + t.ridershipDailyK, 0).toFixed(0), tone: 'info' },
      ]} />
      <CorridorRule label="schedules" />
      {ext.portal.schedules.map(s => (
        <CorridorBar key={s.mode}
          label={s.mode}
          pct={s.onTimePct}
          tone={s.onTimePct > 90 ? 'ok' : s.onTimePct > 75 ? 'warn' : 'alert'}
          tail={`${s.routesActive} routes · ${s.ridershipDailyK.toFixed(0)}k riders`} />
      ))}
    </CorridorFrame>
  );
}

export function TransportPermits({ id, now }: { id: string; now: number }) {
  const ext = transportExtendedBoard(now);
  void id;
  return (
    <CorridorFrame archetype="portal" code="PR-PMT-29" title="Transport Permits"
      subtitle="commercial, oversize, hazmat & charter">
      <CorridorKpi items={[
        { label: 'Permit lanes', value: ext.portal.permits.length },
        { label: 'Total pending', value: ext.portal.permits.reduce((s, p) => s + p.pending, 0).toLocaleString(), tone: 'warn' },
        { label: 'Approved / week', value: ext.portal.permits.reduce((s, p) => s + p.approvedThisWeek, 0).toLocaleString(), tone: 'ok' },
        { label: 'Median review (d)', value: Math.round(ext.portal.permits.reduce((s, p) => s + p.medianReviewDays, 0) / Math.max(1, ext.portal.permits.length)) },
      ]} />
      <CorridorRule label="permit lanes" />
      {ext.portal.permits.map(p => (
        <CorridorBar key={p.category}
          label={p.category}
          pct={Math.min(100, (p.approvedThisWeek / Math.max(1, p.pending)) * 100)}
          tone={p.medianReviewDays > 14 ? 'warn' : 'ok'}
          tail={`${p.pending} pend · ${p.medianReviewDays}d`} />
      ))}
    </CorridorFrame>
  );
}

export function LogisticsRequests({ id, now }: { id: string; now: number }) {
  const ext = transportExtendedBoard(now);
  void id;
  return (
    <CorridorFrame archetype="portal" code="PR-LGR-30" title="Logistics Requests"
      subtitle="citizen & freight logistics requests">
      <CorridorKpi items={[
        { label: 'Active requests', value: ext.portal.logisticsRequests.length },
        { label: 'Delivered', value: ext.portal.logisticsRequests.filter(r => r.status === 'delivered').length, tone: 'ok' },
        { label: 'Queued / routing', value: ext.portal.logisticsRequests.filter(r => r.status === 'queued' || r.status === 'routing').length, tone: 'warn' },
        { label: 'In transit', value: ext.portal.logisticsRequests.filter(r => r.status === 'in-transit').length, tone: 'info' },
      ]} />
      <CorridorRule label="request docket" />
      {ext.portal.logisticsRequests.map(r => (
        <div key={r.id} className="grid grid-cols-[110px_160px_180px_80px_120px] gap-3 border-b py-1.5 text-[11px]"
          style={{ borderColor: TRANSPORT_DS.ruleSoft, fontFamily: 'ui-monospace, monospace' }}>
          <span style={{ color: TRANSPORT_DS.harbour }}>{r.id}</span>
          <span style={{ color: TRANSPORT_DS.ink }}>{r.shipper} · {r.mode}</span>
          <span style={{ color: TRANSPORT_DS.mut }}>{r.origin} → {r.destination}</span>
          <span className="text-right tabular-nums" style={{ color: TRANSPORT_DS.mut }}>{r.cargoTons} t</span>
          <span className="text-right uppercase tracking-[0.16em]"
            style={{ color: r.status === 'delivered' ? TRANSPORT_DS.rail : r.status === 'queued' ? TRANSPORT_DS.signal : TRANSPORT_DS.harbour }}>● {r.status}</span>
        </div>
      ))}
    </CorridorFrame>
  );
}

export function MobilityAdvisories({ id, now }: { id: string; now: number }) {
  const ext = transportExtendedBoard(now);
  void id;
  return (
    <CorridorFrame archetype="portal" code="PR-ADV-31" title="Mobility Advisories"
      subtitle="public advisory feed">
      <CorridorKpi items={[
        { label: 'Active advisories', value: ext.portal.advisories.length },
        { label: 'Critical', value: ext.portal.advisories.filter(a => a.severity === 'critical').length, tone: 'alert' },
        { label: 'Warning', value: ext.portal.advisories.filter(a => a.severity === 'warning').length, tone: 'warn' },
        { label: 'Reach (M)', value: ext.portal.advisories.reduce((s, a) => s + a.reachM, 0).toFixed(1) },
      ]} />
      <CorridorRule label="advisory ledger" />
      {ext.portal.advisories.map(a => (
        <div key={a.id} className="grid grid-cols-[110px_180px_140px_100px_100px] gap-3 border-b py-1.5 text-[11px]"
          style={{ borderColor: TRANSPORT_DS.ruleSoft, fontFamily: 'ui-monospace, monospace' }}>
          <span style={{ color: TRANSPORT_DS.harbour }}>{a.id}</span>
          <span style={{ color: TRANSPORT_DS.ink }}>{a.kind}</span>
          <span style={{ color: TRANSPORT_DS.mut }}>{a.region}</span>
          <span className="text-right tabular-nums" style={{ color: TRANSPORT_DS.mut }}>{a.reachM.toFixed(1)}M reach</span>
          <span className="text-right uppercase tracking-[0.16em]"
            style={{ color: a.severity === 'critical' ? TRANSPORT_DS.coral : a.severity === 'warning' ? TRANSPORT_DS.signal : TRANSPORT_DS.rail }}>● {a.severity}</span>
        </div>
      ))}
    </CorridorFrame>
  );
}

export function TransportSafeguards({ id, now }: { id: string; now: number }) {
  void id; void now;
  return (
    <CorridorFrame archetype="oversight" code="OV-SFG-34" title="Transport Safeguards"
      subtitle="TRANSPORT_EXTENDED_SAFEGUARDS contract · §16.11">
      <CorridorKpi items={[
        { label: 'Equitable mobility', value: TRANSPORT_EXTENDED_SAFEGUARDS.equitableMobilityAccess ? '✓' : '✗', tone: 'ok' },
        { label: 'Evacuation priority', value: TRANSPORT_EXTENDED_SAFEGUARDS.emergencyEvacuationPriority ? '✓' : '✗', tone: 'ok' },
        { label: 'Critical-goods freight', value: TRANSPORT_EXTENDED_SAFEGUARDS.freightContinuityForCriticalGoods ? '✓' : '✗', tone: 'ok' },
        { label: 'Schedule transparency', value: TRANSPORT_EXTENDED_SAFEGUARDS.transparentSchedulingAndPermits ? '✓' : '✗', tone: 'ok' },
      ]} />
      <CorridorRule label="prohibited postures" />
      <ul className="grid grid-cols-1 gap-1 md:grid-cols-2 text-[11px]"
        style={{ color: TRANSPORT_DS.ink, fontFamily: 'ui-monospace, monospace' }}>
        {TRANSPORT_EXTENDED_SAFEGUARDS.prohibited.map(p => (
          <li key={p} className="border-l-2 pl-2" style={{ borderColor: TRANSPORT_DS.coral }}>
            <span style={{ color: TRANSPORT_DS.coral }}>✕</span> {p}
          </li>
        ))}
      </ul>
      <CorridorCallout kicker="binding contract" body="Every Transport surface attests against this contract. Discriminatory route closure, denial of evacuation priority and extraction of citizen-movement data are constitutionally void." />
    </CorridorFrame>
  );
}

export function EquitableMobilityAudit({ id, now }: { id: string; now: number }) {
  void id; void now;
  return (
    <CorridorFrame archetype="oversight" code="OV-EQT-35" title="Equitable Mobility Audit"
      subtitle="equitable access audit">
      <CorridorKpi items={[
        { label: 'Discriminatory closures', value: 0, tone: 'ok' },
        { label: 'Denied evacuations', value: 0, tone: 'ok' },
        { label: 'Concealed failures', value: 0, tone: 'ok' },
        { label: 'Mobility equity index', value: '97/100', tone: 'ok' },
      ]} />
      <CorridorCallout kicker="equity doctrine" body="Every route closure carries a public notice, a detour pathway and an appeal mechanism. Patterns that disproportionately disadvantage rural or low-income districts trigger civilian-panel review." />
    </CorridorFrame>
  );
}
