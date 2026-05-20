'use client';

// Environment domains — Forecast, Registry, Portal & Oversight surfaces.

import * as React from 'react';
import { climateResilienceBoard, CLIMATE_RESILIENCE_SAFEGUARDS } from '@/lib/gov/climate-resilience';
import { environmentalGovernanceBoard, ENVIRONMENTAL_GOVERNANCE_SAFEGUARDS } from '@/lib/gov/environmental-governance';
import { BiomeFrame, BiomeKpi, BiomeRule, BiomeCallout, ENVIRONMENT_DS } from '@/apps/ministry-environment/design-system/environment-ds';

export function PlanetaryTrajectory({ id, now }: { id: string; now: number }) {
  const board = climateResilienceBoard(now);
  void id;
  return (
    <BiomeFrame archetype="forecast" code="FC-PLN-21" title="Planetary Trajectory"
      subtitle={`${board.forecast.horizonYears.join('y / ')}y horizons`}>
      <BiomeKpi items={[
        { label: 'Planetary resilience', value: `${board.forecast.planetaryResilienceIdx}/100`, tone: 'ok' },
        { label: 'Ecosystem-collapse risk', value: `${board.forecast.ecosystemCollapseRisk}/100`, tone: 'warn' },
        { label: 'Intergenerational continuity', value: `${board.forecast.intergenerationalContinuityIdx}/100`, tone: 'info' },
        { label: 'Horizons modelled', value: board.forecast.horizonYears.length },
      ]} />
      <BiomeRule label="multi-horizon trajectories" />
      <div className="grid grid-cols-2 gap-2 text-[11px] md:grid-cols-3">
        {['Temperature anomaly', 'Biodiversity', 'Forest cover', 'Water stress', 'Carbon continuity'].map((label, i) => {
          const series = [board.forecast.temperatureAnomalyTrajectory, board.forecast.biodiversityTrajectory, board.forecast.forestCoverTrajectory, board.forecast.waterStressTrajectory, board.forecast.carbonContinuityTrajectory][i]!;
          const last = series[series.length - 1] ?? 0;
          const isStress = label === 'Temperature anomaly' || label === 'Water stress';
          return (
            <div key={label} className="border p-2" style={{ borderColor: ENVIRONMENT_DS.rule }}>
              <div className="text-[9px] uppercase tracking-[0.18em]" style={{ color: ENVIRONMENT_DS.mut, fontFamily: 'ui-monospace, monospace' }}>{label}</div>
              <div className="text-[13px] font-semibold tabular-nums" style={{ color: isStress ? ENVIRONMENT_DS.amber : ENVIRONMENT_DS.leaf }}>{typeof last === 'number' ? last.toFixed(1) : last}</div>
              <div className="mt-1 flex items-end gap-1">
                {series.map((v, j) => (
                  <div key={j} className="flex-1" style={{ height: `${Math.max(2, Math.min(40, Math.abs(v) * 2))}px`, background: isStress ? ENVIRONMENT_DS.amber : ENVIRONMENT_DS.leaf }} />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </BiomeFrame>
  );
}

export function IntergenerationalContinuity({ id, now }: { id: string; now: number }) {
  const board = climateResilienceBoard(now);
  const gov = environmentalGovernanceBoard(now);
  void id;
  return (
    <BiomeFrame archetype="forecast" code="FC-INT-22" title="Intergenerational Continuity"
      subtitle="long-horizon stewardship index">
      <BiomeKpi items={[
        { label: 'Stewardship index', value: `${gov.resources.intergenerationalStewardshipIdx}/100`, tone: 'ok' },
        { label: 'Resource sustainability', value: `${gov.resources.resourceSustainabilityIdx}/100`, tone: 'ok' },
        { label: 'Intergenerational continuity', value: `${board.forecast.intergenerationalContinuityIdx}/100`, tone: 'info' },
        { label: 'Planetary resilience', value: `${board.forecast.planetaryResilienceIdx}/100`, tone: 'ok' },
      ]} />
      <BiomeCallout kicker="non-exploitation doctrine" body="The current generation does not have the constitutional authority to deplete the commons. Every extraction permit is reviewable, and a minimum ecological reserve is preserved indefinitely." />
    </BiomeFrame>
  );
}

export function ForestryRegister({ id, now }: { id: string; now: number }) {
  const board = environmentalGovernanceBoard(now);
  void id;
  return (
    <BiomeFrame archetype="registry" code="RG-FOR-24" title="Forestry Register"
      subtitle="forestry posture by region">
      <BiomeKpi items={[
        { label: 'Forestry regions', value: board.resources.forestry.length },
        { label: 'Managed', value: board.resources.forestry.filter(f => f.posture === 'managed').length, tone: 'ok' },
        { label: 'Over-extraction', value: board.resources.forestry.filter(f => f.posture === 'over-extraction').length, tone: 'alert' },
        { label: 'Illegal logging cases', value: board.resources.forestry.reduce((s, f) => s + f.illegalLoggingCases, 0), tone: 'warn' },
      ]} />
      <BiomeRule label="forestry posture" />
      {board.resources.forestry.map(f => (
        <div key={f.region} className="grid grid-cols-[180px_1fr_100px_100px_120px] gap-3 border-b py-1.5 text-[11px]"
          style={{ borderColor: ENVIRONMENT_DS.ruleSoft, fontFamily: 'ui-monospace, monospace' }}>
          <span style={{ color: ENVIRONMENT_DS.leaf }}>{f.region}</span>
          <div className="h-1.5 self-center" style={{ background: ENVIRONMENT_DS.moss }}>
            <div className="h-full" style={{ width: `${f.sustainableHarvestPct}%`, background: f.sustainableHarvestPct > 80 ? ENVIRONMENT_DS.leaf : f.sustainableHarvestPct > 60 ? ENVIRONMENT_DS.amber : ENVIRONMENT_DS.coral }} />
          </div>
          <span className="text-right tabular-nums" style={{ color: ENVIRONMENT_DS.mut }}>{f.managedHectaresK}k ha</span>
          <span className="text-right tabular-nums" style={{ color: ENVIRONMENT_DS.mut }}>{f.reforestationActiveK}k restored</span>
          <span className="text-right uppercase tracking-[0.16em]"
            style={{ color: f.posture === 'over-extraction' ? ENVIRONMENT_DS.coral : f.posture === 'pressured' ? ENVIRONMENT_DS.amber : f.posture === 'recovery' ? ENVIRONMENT_DS.sky : ENVIRONMENT_DS.leaf }}>● {f.posture}</span>
        </div>
      ))}
    </BiomeFrame>
  );
}

export function ExtractionPermits({ id, now }: { id: string; now: number }) {
  const board = environmentalGovernanceBoard(now);
  void id;
  return (
    <BiomeFrame archetype="registry" code="RG-EXP-25" title="Extraction Permits"
      subtitle="permit register & monitoring cadence">
      <BiomeKpi items={[
        { label: 'Permits tracked', value: board.resources.extractionPermits.length },
        { label: 'Active', value: board.resources.extractionPermits.filter(p => p.status === 'active').length, tone: 'ok' },
        { label: 'Suspended / revoked', value: board.resources.extractionPermits.filter(p => p.status === 'suspended' || p.status === 'revoked').length, tone: 'alert' },
        { label: 'Enforcement cases open', value: board.resources.enforcementCasesOpen, tone: 'warn' },
      ]} />
      <BiomeRule label="permit ledger" />
      {board.resources.extractionPermits.map(p => (
        <div key={p.id} className="grid grid-cols-[110px_140px_1fr_80px_120px] gap-3 border-b py-1.5 text-[11px]"
          style={{ borderColor: ENVIRONMENT_DS.ruleSoft, fontFamily: 'ui-monospace, monospace' }}>
          <span style={{ color: ENVIRONMENT_DS.leaf }}>{p.id}</span>
          <span style={{ color: ENVIRONMENT_DS.ink }}>{p.resource}</span>
          <span style={{ color: ENVIRONMENT_DS.mut }}>{p.operator} · {p.region}</span>
          <span className="text-right tabular-nums" style={{ color: ENVIRONMENT_DS.mut }}>cmp {p.complianceIdx}</span>
          <span className="text-right uppercase tracking-[0.16em]"
            style={{ color: p.status === 'revoked' ? ENVIRONMENT_DS.coral : p.status === 'suspended' ? ENVIRONMENT_DS.coral : p.status === 'review' ? ENVIRONMENT_DS.amber : ENVIRONMENT_DS.leaf }}>● {p.status}</span>
        </div>
      ))}
    </BiomeFrame>
  );
}

export function LandProtection({ id, now }: { id: string; now: number }) {
  const board = environmentalGovernanceBoard(now);
  void id;
  return (
    <BiomeFrame archetype="registry" code="RG-LND-26" title="Land Protection"
      subtitle="protected land category register">
      <BiomeKpi items={[
        { label: 'Categories', value: board.resources.landProtections.length },
        { label: 'Encroachment incidents', value: board.resources.landProtections.reduce((s, l) => s + l.encroachmentIncidents, 0), tone: 'warn' },
        { label: 'Enforcement cases', value: board.resources.landProtections.reduce((s, l) => s + l.enforcementCases, 0), tone: 'warn' },
        { label: 'Mean status', value: Math.round(board.resources.landProtections.reduce((s, l) => s + l.ecologicalStatusIdx, 0) / Math.max(1, board.resources.landProtections.length)), tone: 'ok' },
      ]} />
      <BiomeRule label="protected land categories" />
      {board.resources.landProtections.map(l => (
        <div key={l.category} className="grid grid-cols-[200px_1fr_80px_100px] gap-3 border-b py-1.5 text-[11px]"
          style={{ borderColor: ENVIRONMENT_DS.ruleSoft, fontFamily: 'ui-monospace, monospace' }}>
          <span style={{ color: ENVIRONMENT_DS.leaf }}>{l.category}</span>
          <div className="h-1.5 self-center" style={{ background: ENVIRONMENT_DS.moss }}>
            <div className="h-full" style={{ width: `${l.ecologicalStatusIdx}%`, background: l.ecologicalStatusIdx > 75 ? ENVIRONMENT_DS.leaf : l.ecologicalStatusIdx > 50 ? ENVIRONMENT_DS.amber : ENVIRONMENT_DS.coral }} />
          </div>
          <span className="text-right tabular-nums" style={{ color: ENVIRONMENT_DS.mut }}>{l.hectaresK}k ha</span>
          <span className="text-right tabular-nums" style={{ color: ENVIRONMENT_DS.mut }}>{l.enforcementCases} cases</span>
        </div>
      ))}
    </BiomeFrame>
  );
}

export function CitizenReports({ id, now }: { id: string; now: number }) {
  const board = environmentalGovernanceBoard(now);
  void id;
  return (
    <BiomeFrame archetype="portal" code="PR-RPT-28" title="Citizen Reports"
      subtitle="citizen incident reports · triaged to investigation">
      <BiomeKpi items={[
        { label: 'Active reports', value: board.portal.reports.length },
        { label: 'Severe severity', value: board.portal.reports.filter(r => r.severity === 'severe').length, tone: 'alert' },
        { label: 'Investigating', value: board.portal.reports.filter(r => r.status === 'investigating').length, tone: 'warn' },
        { label: 'Participation idx', value: `${board.portal.participationIdx}/100`, tone: 'info' },
      ]} />
      <BiomeRule label="report ledger" />
      {board.portal.reports.map(r => (
        <div key={r.id} className="grid grid-cols-[110px_180px_140px_100px_100px] gap-3 border-b py-1.5 text-[11px]"
          style={{ borderColor: ENVIRONMENT_DS.ruleSoft, fontFamily: 'ui-monospace, monospace' }}>
          <span style={{ color: ENVIRONMENT_DS.leaf }}>{r.id}</span>
          <span style={{ color: ENVIRONMENT_DS.ink }}>{r.kind}</span>
          <span style={{ color: ENVIRONMENT_DS.mut }}>{r.region}</span>
          <span className="text-right tabular-nums" style={{ color: ENVIRONMENT_DS.mut }}>{r.reportedHrsAgo}h ago</span>
          <span className="text-right uppercase tracking-[0.16em]"
            style={{ color: r.severity === 'severe' ? ENVIRONMENT_DS.coral : r.severity === 'elevated' ? ENVIRONMENT_DS.amber : ENVIRONMENT_DS.leaf }}>● {r.severity}</span>
        </div>
      ))}
      <BiomeCallout kicker="citizen voice" body="Silencing or burying citizen reports is constitutionally prohibited. Every report receives a triage decision within 72h and a public audit log entry." />
    </BiomeFrame>
  );
}

export function PublicAdvisories({ id, now }: { id: string; now: number }) {
  const board = environmentalGovernanceBoard(now);
  void id;
  return (
    <BiomeFrame archetype="portal" code="PR-ADV-29" title="Public Advisories"
      subtitle="advisory & warning broadcast">
      <BiomeKpi items={[
        { label: 'Active advisories', value: board.portal.advisories.length },
        { label: 'Emergency severity', value: board.portal.advisories.filter(a => a.severity === 'emergency').length, tone: 'alert' },
        { label: 'Warning severity', value: board.portal.advisories.filter(a => a.severity === 'warning').length, tone: 'warn' },
        { label: 'Reach (k)', value: board.portal.advisories.reduce((s, a) => s + a.reachK, 0).toFixed(0), tone: 'info' },
      ]} />
      <BiomeRule label="advisory ledger" />
      {board.portal.advisories.map(a => (
        <div key={a.id} className="grid grid-cols-[110px_180px_140px_100px_100px] gap-3 border-b py-1.5 text-[11px]"
          style={{ borderColor: ENVIRONMENT_DS.ruleSoft, fontFamily: 'ui-monospace, monospace' }}>
          <span style={{ color: ENVIRONMENT_DS.leaf }}>{a.id}</span>
          <span style={{ color: ENVIRONMENT_DS.ink }}>{a.channel}</span>
          <span style={{ color: ENVIRONMENT_DS.mut }}>{a.region}</span>
          <span className="text-right tabular-nums" style={{ color: ENVIRONMENT_DS.mut }}>{a.reachK.toFixed(0)}k reach</span>
          <span className="text-right uppercase tracking-[0.16em]"
            style={{ color: a.severity === 'emergency' ? ENVIRONMENT_DS.coral : a.severity === 'warning' ? ENVIRONMENT_DS.amber : ENVIRONMENT_DS.leaf }}>● {a.severity}</span>
        </div>
      ))}
    </BiomeFrame>
  );
}

export function ClimateSafeguards({ id, now }: { id: string; now: number }) {
  void id; void now;
  return (
    <BiomeFrame archetype="oversight" code="OV-CSF-31" title="Climate Safeguards"
      subtitle="CLIMATE_RESILIENCE_SAFEGUARDS contract · §25.10">
      <BiomeKpi items={[
        { label: 'Humanitarian doctrine', value: CLIMATE_RESILIENCE_SAFEGUARDS.humanitarianDoctrine ? '✓' : '✗', tone: 'ok' },
        { label: 'Intergenerational continuity', value: CLIMATE_RESILIENCE_SAFEGUARDS.intergenerationalContinuity ? '✓' : '✗', tone: 'ok' },
        { label: 'Non-exploitative', value: CLIMATE_RESILIENCE_SAFEGUARDS.nonExploitative ? '✓' : '✗', tone: 'ok' },
        { label: 'Lawful enforcement only', value: CLIMATE_RESILIENCE_SAFEGUARDS.lawfulEnforcementOnly ? '✓' : '✗', tone: 'ok' },
      ]} />
      <BiomeRule label="prohibited postures" />
      <ul className="grid grid-cols-1 gap-1 md:grid-cols-2 text-[11px]"
        style={{ color: ENVIRONMENT_DS.ink, fontFamily: 'ui-monospace, monospace' }}>
        {CLIMATE_RESILIENCE_SAFEGUARDS.prohibited.map(p => (
          <li key={p} className="border-l-2 pl-2" style={{ borderColor: ENVIRONMENT_DS.coral }}>
            <span style={{ color: ENVIRONMENT_DS.coral }}>✕</span> {p}
          </li>
        ))}
      </ul>
      <BiomeCallout kicker="binding contract" body="Every Environment surface attests against this contract. Concealment of climate data is constitutionally void; just-transition obligations apply on every emissions decision." />
    </BiomeFrame>
  );
}

export function IntergenerationalAudit({ id, now }: { id: string; now: number }) {
  void id; void now;
  return (
    <BiomeFrame archetype="oversight" code="OV-INT-32" title="Intergenerational Audit"
      subtitle="stewardship audit & non-exploitation doctrine">
      <BiomeKpi items={[
        { label: 'Non-exploitative use', value: ENVIRONMENTAL_GOVERNANCE_SAFEGUARDS.nonExploitativeResourceUse ? '✓' : '✗', tone: 'ok' },
        { label: 'Public participation', value: ENVIRONMENTAL_GOVERNANCE_SAFEGUARDS.publicParticipation ? '✓' : '✗', tone: 'ok' },
        { label: 'Intergen. stewardship', value: ENVIRONMENTAL_GOVERNANCE_SAFEGUARDS.intergenerationalStewardship ? '✓' : '✗', tone: 'ok' },
        { label: 'EIA bypass attempts', value: 0, tone: 'ok' },
      ]} />
      <BiomeRule label="governance prohibitions" />
      <ul className="grid grid-cols-1 gap-1 md:grid-cols-2 text-[11px]"
        style={{ color: ENVIRONMENT_DS.ink, fontFamily: 'ui-monospace, monospace' }}>
        {ENVIRONMENTAL_GOVERNANCE_SAFEGUARDS.prohibited.map(p => (
          <li key={p} className="border-l-2 pl-2" style={{ borderColor: ENVIRONMENT_DS.coral }}>
            <span style={{ color: ENVIRONMENT_DS.coral }}>✕</span> {p}
          </li>
        ))}
      </ul>
      <BiomeCallout kicker="stewardship doctrine" body="The state is a trustee — not an owner — of the natural commons. Decisions that exploit, deplete or conceal the commons are constitutionally void." />
    </BiomeFrame>
  );
}
