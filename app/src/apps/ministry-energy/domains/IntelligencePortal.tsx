'use client';

// Energy domains — Intelligence, Portal & Oversight surfaces.

import * as React from 'react';
import { energyExtendedBoard, ENERGY_EXTENDED_SAFEGUARDS } from '@/lib/gov/energy-extended';
import { GridFrame, GridKpi, GridRule, LineDiagramRow, ENERGY_DS, GridCallout } from '@/apps/ministry-energy/design-system/energy-ds';

export function DemandTrajectory({ id, now }: { id: string; now: number }) {
  const ext = energyExtendedBoard(now);
  void id;
  return (
    <GridFrame archetype="intelligence" code="IN-DMD-22" title="Demand Trajectory"
      subtitle={`${ext.intelligence.demand.horizonYears.join('y / ')}y horizons`}>
      <GridKpi items={[
        { label: 'Horizons', value: ext.intelligence.demand.horizonYears.length },
        { label: 'Long-horizon resilience', value: `${ext.intelligence.longHorizonResilienceIdx}/100`, tone: 'ok' },
        { label: 'AI reasoning', value: `${ext.intelligence.aiReasoningCoveragePct}%`, tone: 'info' },
        { label: 'Systemic risk', value: `${ext.intelligence.systemicEnergyRisk}/100`, tone: 'warn' },
      ]} />
      <GridRule label="trajectories" />
      <div className="grid grid-cols-2 gap-2 text-[11px] md:grid-cols-3">
        {['Peak demand (GW)', 'Renewable share %', 'Carbon intensity', 'Import dependency', 'Grid resilience', 'Self-sufficiency'].map((label, i) => {
          const series = [ext.intelligence.demand.peakDemandTrajectoryGw, ext.intelligence.demand.renewableShareTrajectoryPct, ext.intelligence.demand.carbonIntensityTrajectory, ext.intelligence.demand.energyImportDependencyTrajectory, ext.intelligence.demand.gridResilienceTrajectory, ext.intelligence.demand.selfSufficiencyTrajectory][i]!;
          const last = series[series.length - 1] ?? 0;
          const isStress = label === 'Carbon intensity' || label === 'Import dependency';
          return (
            <div key={label} className="border p-2" style={{ borderColor: ENERGY_DS.rule }}>
              <div className="text-[9px] uppercase tracking-[0.18em]" style={{ color: ENERGY_DS.mut, fontFamily: 'ui-monospace, monospace' }}>{label}</div>
              <div className="text-[13px] font-semibold tabular-nums" style={{ color: isStress ? ENERGY_DS.amber : ENERGY_DS.lime }}>{last}</div>
              <div className="mt-1 flex items-end gap-1">
                {series.map((v, j) => (
                  <div key={j} className="flex-1" style={{ height: `${Math.max(2, Math.min(40, Math.abs(v) / 3))}px`, background: isStress ? ENERGY_DS.amber : ENERGY_DS.lime }} />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </GridFrame>
  );
}

export function ClimateEnergyRisk({ id, now }: { id: string; now: number }) {
  const ext = energyExtendedBoard(now);
  void id;
  return (
    <GridFrame archetype="intelligence" code="IN-CER-23" title="Climate-Energy Risk"
      subtitle="climate hazard composite">
      <GridKpi items={[
        { label: 'Hazards tracked', value: ext.intelligence.climateRisks.length },
        { label: 'Severe classification', value: ext.intelligence.climateRisks.filter(r => r.classification === 'severe').length, tone: 'alert' },
        { label: 'Elevated', value: ext.intelligence.climateRisks.filter(r => r.classification === 'elevated').length, tone: 'warn' },
        { label: 'Mean preparedness', value: Math.round(ext.intelligence.climateRisks.reduce((s, r) => s + r.preparednessIdx, 0) / Math.max(1, ext.intelligence.climateRisks.length)), tone: 'info' },
      ]} />
      <GridRule label="hazard register" />
      {ext.intelligence.climateRisks.map(r => (
        <div key={r.hazard} className="grid grid-cols-[180px_80px_80px_80px_100px_100px] gap-3 border-b py-1.5 text-[11px]"
          style={{ borderColor: ENERGY_DS.ruleSoft, fontFamily: 'ui-monospace, monospace' }}>
          <span style={{ color: ENERGY_DS.amber }}>{r.hazard}</span>
          <span className="text-right tabular-nums" style={{ color: ENERGY_DS.mut }}>p {r.probabilityNext12mPct}%</span>
          <span className="text-right tabular-nums" style={{ color: ENERGY_DS.mut }}>i {r.impactIfRealisedIdx}</span>
          <span className="text-right tabular-nums" style={{ color: ENERGY_DS.mut }}>pr {r.preparednessIdx}</span>
          <span className="text-right tabular-nums" style={{ color: ENERGY_DS.ink }}>c {r.composite}</span>
          <span className="text-right uppercase tracking-[0.16em]"
            style={{ color: r.classification === 'severe' ? ENERGY_DS.coral : r.classification === 'elevated' ? ENERGY_DS.amber : r.classification === 'moderate' ? ENERGY_DS.electric : ENERGY_DS.lime }}>● {r.classification}</span>
        </div>
      ))}
    </GridFrame>
  );
}

export function CascadingFailure({ id, now }: { id: string; now: number }) {
  const ext = energyExtendedBoard(now);
  void id;
  return (
    <GridFrame archetype="intelligence" code="IN-CSC-24" title="Cascading Failure Scenarios"
      subtitle="multi-trigger cascade analysis">
      <GridKpi items={[
        { label: 'Scenarios', value: ext.intelligence.cascadingScenarios.length },
        { label: 'Systemic-impact', value: ext.intelligence.cascadingScenarios.filter(s => s.impactSeverity === 'systemic').length, tone: 'alert' },
        { label: 'National-impact', value: ext.intelligence.cascadingScenarios.filter(s => s.impactSeverity === 'national').length, tone: 'warn' },
        { label: 'Mean preparedness', value: Math.round(ext.intelligence.cascadingScenarios.reduce((s, x) => s + x.preparednessIdx, 0) / Math.max(1, ext.intelligence.cascadingScenarios.length)), tone: 'info' },
      ]} />
      <GridRule label="scenario register" />
      {ext.intelligence.cascadingScenarios.map(s => (
        <div key={s.id} className="grid grid-cols-[110px_160px_80px_80px_80px_120px] gap-3 border-b py-1.5 text-[11px]"
          style={{ borderColor: ENERGY_DS.ruleSoft, fontFamily: 'ui-monospace, monospace' }}>
          <span style={{ color: ENERGY_DS.amber }}>{s.id}</span>
          <span style={{ color: ENERGY_DS.ink }}>{s.trigger}</span>
          <span className="text-right tabular-nums" style={{ color: ENERGY_DS.mut }}>d {s.cascadeDepth}</span>
          <span className="text-right tabular-nums" style={{ color: ENERGY_DS.mut }}>r {s.affectedRegions}</span>
          <span className="text-right tabular-nums" style={{ color: ENERGY_DS.electric }}>{s.probability12mPct}%</span>
          <span className="text-right uppercase tracking-[0.16em]"
            style={{ color: s.impactSeverity === 'systemic' || s.impactSeverity === 'national' ? ENERGY_DS.coral : s.impactSeverity === 'regional' ? ENERGY_DS.amber : ENERGY_DS.lime }}>● {s.impactSeverity}</span>
        </div>
      ))}
      <GridCallout kicker="anti-fragility doctrine" body="Cascading-failure scenarios are simulated quarterly and the worst pathways inform investment priorities. Critical paths must always carry redundancy." />
    </GridFrame>
  );
}

export function GeopoliticalExposure({ id, now }: { id: string; now: number }) {
  const ext = energyExtendedBoard(now);
  void id;
  return (
    <GridFrame archetype="intelligence" code="IN-GEO-25" title="Geopolitical Energy Exposure"
      subtitle="import-dependency exposure">
      <GridKpi items={[
        { label: 'Counterparties', value: ext.intelligence.geopoliticalExposure.length },
        { label: 'High-vulnerability', value: ext.intelligence.geopoliticalExposure.filter(e => e.vulnerabilityIdx > 65).length, tone: 'alert' },
        { label: 'Mean import share', value: `${Math.round(ext.intelligence.geopoliticalExposure.reduce((s, e) => s + e.importSharePct, 0) / Math.max(1, ext.intelligence.geopoliticalExposure.length))}%`, tone: 'warn' },
        { label: 'Mean alternatives', value: Math.round(ext.intelligence.geopoliticalExposure.reduce((s, e) => s + e.alternativeSourcesAvailable, 0) / Math.max(1, ext.intelligence.geopoliticalExposure.length)) },
      ]} />
      <GridRule label="exposure ledger" />
      {ext.intelligence.geopoliticalExposure.map((e, i) => (
        <div key={`${e.partner}-${e.resource}-${i}`} className="grid grid-cols-[180px_160px_80px_80px_80px] gap-3 border-b py-1.5 text-[11px]"
          style={{ borderColor: ENERGY_DS.ruleSoft, fontFamily: 'ui-monospace, monospace' }}>
          <span style={{ color: ENERGY_DS.amber }}>{e.partner}</span>
          <span style={{ color: ENERGY_DS.ink }}>{e.resource}</span>
          <span className="text-right tabular-nums" style={{ color: ENERGY_DS.mut }}>{e.importSharePct}%</span>
          <span className="text-right tabular-nums" style={{ color: e.vulnerabilityIdx > 65 ? ENERGY_DS.coral : e.vulnerabilityIdx > 35 ? ENERGY_DS.amber : ENERGY_DS.lime }}>v {e.vulnerabilityIdx}</span>
          <span className="text-right tabular-nums" style={{ color: ENERGY_DS.electric }}>{e.alternativeSourcesAvailable} alt</span>
        </div>
      ))}
    </GridFrame>
  );
}

export function OutageReports({ id, now }: { id: string; now: number }) {
  const ext = energyExtendedBoard(now);
  void id;
  return (
    <GridFrame archetype="portal" code="PR-OUT-27" title="Outage Reports"
      subtitle="citizen outage reports">
      <GridKpi items={[
        { label: 'Active reports', value: ext.portal.outages.length },
        { label: 'Critical severity', value: ext.portal.outages.filter(o => o.severity === 'critical').length, tone: 'alert' },
        { label: 'In progress', value: ext.portal.outages.filter(o => o.status === 'in-progress' || o.status === 'crew-en-route').length, tone: 'warn' },
        { label: 'Accounts affected (k)', value: ext.portal.outages.reduce((s, o) => s + o.affectedAccountsK, 0).toFixed(1) },
      ]} />
      <GridRule label="outage ledger" />
      {ext.portal.outages.map(o => (
        <div key={o.id} className="grid grid-cols-[110px_140px_140px_100px_120px] gap-3 border-b py-1.5 text-[11px]"
          style={{ borderColor: ENERGY_DS.ruleSoft, fontFamily: 'ui-monospace, monospace' }}>
          <span style={{ color: ENERGY_DS.amber }}>{o.id}</span>
          <span style={{ color: ENERGY_DS.ink }}>{o.region}</span>
          <span style={{ color: ENERGY_DS.mut }}>{o.affectedAccountsK.toFixed(1)}k accounts</span>
          <span className="text-right tabular-nums" style={{ color: ENERGY_DS.mut }}>{o.estimatedRestorationHrs}h ETA</span>
          <span className="text-right uppercase tracking-[0.16em]"
            style={{ color: o.severity === 'critical' ? ENERGY_DS.coral : o.severity === 'major' ? ENERGY_DS.amber : ENERGY_DS.lime }}>● {o.severity}</span>
        </div>
      ))}
    </GridFrame>
  );
}

export function EnergyPermits({ id, now }: { id: string; now: number }) {
  const ext = energyExtendedBoard(now);
  void id;
  return (
    <GridFrame archetype="portal" code="PR-PMT-28" title="Energy Permits"
      subtitle="rooftop, EV, microgrid">
      <GridKpi items={[
        { label: 'Permit lanes', value: ext.portal.permits.length },
        { label: 'Total pending', value: ext.portal.permits.reduce((s, p) => s + p.pending, 0).toLocaleString(), tone: 'warn' },
        { label: 'Approved / month', value: ext.portal.permits.reduce((s, p) => s + p.approvedThisMonth, 0).toLocaleString(), tone: 'ok' },
        { label: 'Median review (d)', value: Math.round(ext.portal.permits.reduce((s, p) => s + p.medianReviewDays, 0) / Math.max(1, ext.portal.permits.length)) },
      ]} />
      <GridRule label="permit lanes" />
      {ext.portal.permits.map(p => (
        <LineDiagramRow key={p.category}
          label={p.category}
          pct={Math.min(100, (p.approvedThisMonth / Math.max(1, p.pending)) * 100)}
          tone={p.medianReviewDays > 28 ? 'warn' : 'ok'}
          tail={`${p.pending} pend · ${p.approvedThisMonth}/mo · ${p.medianReviewDays}d`} />
      ))}
    </GridFrame>
  );
}

export function RenewableRequests({ id, now }: { id: string; now: number }) {
  const ext = energyExtendedBoard(now);
  void id;
  return (
    <GridFrame archetype="portal" code="PR-RNW-29" title="Renewable Integration"
      subtitle="renewable connection requests">
      <GridKpi items={[
        { label: 'Active requests', value: ext.portal.renewableRequests.length },
        { label: 'In grid-study', value: ext.portal.renewableRequests.filter(r => r.status === 'grid-study').length, tone: 'info' },
        { label: 'Approved', value: ext.portal.renewableRequests.filter(r => r.status === 'approved').length, tone: 'ok' },
        { label: 'Capacity requested (MW)', value: ext.portal.renewableRequests.reduce((s, r) => s + r.capacityMw, 0).toFixed(0) },
      ]} />
      <GridRule label="request docket" />
      {ext.portal.renewableRequests.map(r => (
        <div key={r.id} className="grid grid-cols-[110px_140px_140px_80px_120px] gap-3 border-b py-1.5 text-[11px]"
          style={{ borderColor: ENERGY_DS.ruleSoft, fontFamily: 'ui-monospace, monospace' }}>
          <span style={{ color: ENERGY_DS.amber }}>{r.id}</span>
          <span style={{ color: ENERGY_DS.ink }}>{r.source}</span>
          <span style={{ color: ENERGY_DS.mut }}>{r.region}</span>
          <span className="text-right tabular-nums" style={{ color: ENERGY_DS.mut }}>{r.capacityMw} MW</span>
          <span className="text-right uppercase tracking-[0.16em]"
            style={{ color: r.status === 'declined' ? ENERGY_DS.coral : r.status === 'approved' ? ENERGY_DS.lime : r.status === 'grid-study' || r.status === 'feasibility' ? ENERGY_DS.amber : ENERGY_DS.electric }}>● {r.status}</span>
        </div>
      ))}
    </GridFrame>
  );
}

export function EnergyAdvisories({ id, now }: { id: string; now: number }) {
  const ext = energyExtendedBoard(now);
  void id;
  return (
    <GridFrame archetype="portal" code="PR-ADV-30" title="Energy Advisories"
      subtitle="public advisory feed">
      <GridKpi items={[
        { label: 'Active advisories', value: ext.portal.advisories.length },
        { label: 'Critical', value: ext.portal.advisories.filter(a => a.severity === 'critical').length, tone: 'alert' },
        { label: 'Warning', value: ext.portal.advisories.filter(a => a.severity === 'warning').length, tone: 'warn' },
        { label: 'Reach (M)', value: ext.portal.advisories.reduce((s, a) => s + a.reachM, 0).toFixed(1) },
      ]} />
      <GridRule label="advisory ledger" />
      {ext.portal.advisories.map(a => (
        <div key={a.id} className="grid grid-cols-[110px_180px_140px_100px_100px] gap-3 border-b py-1.5 text-[11px]"
          style={{ borderColor: ENERGY_DS.ruleSoft, fontFamily: 'ui-monospace, monospace' }}>
          <span style={{ color: ENERGY_DS.amber }}>{a.id}</span>
          <span style={{ color: ENERGY_DS.ink }}>{a.kind}</span>
          <span style={{ color: ENERGY_DS.mut }}>{a.region}</span>
          <span className="text-right tabular-nums" style={{ color: ENERGY_DS.mut }}>{a.reachM.toFixed(1)}M reach</span>
          <span className="text-right uppercase tracking-[0.16em]"
            style={{ color: a.severity === 'critical' ? ENERGY_DS.coral : a.severity === 'warning' ? ENERGY_DS.amber : ENERGY_DS.lime }}>● {a.severity}</span>
        </div>
      ))}
    </GridFrame>
  );
}

export function EnergySafeguards({ id, now }: { id: string; now: number }) {
  void id; void now;
  return (
    <GridFrame archetype="oversight" code="OV-SFG-32" title="Energy Safeguards"
      subtitle="ENERGY_EXTENDED_SAFEGUARDS contract · §21.10">
      <GridKpi items={[
        { label: 'Public-safety first', value: ENERGY_EXTENDED_SAFEGUARDS.publicSafetyFirst ? '✓' : '✗', tone: 'ok' },
        { label: 'Equitable load-shedding', value: ENERGY_EXTENDED_SAFEGUARDS.equitableLoadShedding ? '✓' : '✗', tone: 'ok' },
        { label: 'Critical-services protection', value: ENERGY_EXTENDED_SAFEGUARDS.criticalServicesProtection ? '✓' : '✗', tone: 'ok' },
        { label: 'Outage transparency', value: ENERGY_EXTENDED_SAFEGUARDS.transparencyInOutages ? '✓' : '✗', tone: 'ok' },
      ]} />
      <GridRule label="prohibited postures" />
      <ul className="grid grid-cols-1 gap-1 md:grid-cols-2 text-[11px]"
        style={{ color: ENERGY_DS.ink, fontFamily: 'ui-monospace, monospace' }}>
        {ENERGY_EXTENDED_SAFEGUARDS.prohibited.map(p => (
          <li key={p} className="border-l-2 pl-2" style={{ borderColor: ENERGY_DS.coral }}>
            <span style={{ color: ENERGY_DS.coral }}>✕</span> {p}
          </li>
        ))}
      </ul>
      <GridCallout kicker="binding contract" body="Every Energy surface attests against this contract. Discriminatory disconnection, concealment of grid incidents and unilateral rate spikes during emergencies are constitutionally void." />
    </GridFrame>
  );
}

export function EquityAudit({ id, now }: { id: string; now: number }) {
  void id; void now;
  return (
    <GridFrame archetype="oversight" code="OV-EQT-33" title="Equity Audit"
      subtitle="equitable load-shed audit">
      <GridKpi items={[
        { label: 'Discriminatory shedding', value: 0, tone: 'ok' },
        { label: 'Critical-services blackout', value: 0, tone: 'ok' },
        { label: 'Disclosure delays', value: 0, tone: 'ok' },
        { label: 'Equity index', value: '98/100', tone: 'ok' },
      ]} />
      <GridCallout kicker="equity doctrine" body="Every load-shedding event is logged with the affected tier, district and duration. Patterns that disproportionately affect low-income or rural districts trigger automatic civilian-panel review." />
    </GridFrame>
  );
}
