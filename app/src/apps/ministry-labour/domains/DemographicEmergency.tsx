'use client';

// Labour domains — Demographic, Continuity & Emergency surfaces.

import * as React from 'react';
import { workforceContinuityBoard } from '@/lib/gov/workforce-continuity';
import { labourExtendedBoard } from '@/lib/gov/labour-extended';
import { WorkforceFrame, WorkforceKpi, WorkforceRule, FlowBar, WorkforceCallout, LABOUR_DS } from '@/apps/ministry-labour/design-system/labour-ds';

export function AgeCohorts({ id, now }: { id: string; now: number }) {
  const board = workforceContinuityBoard(now);
  void id;
  return (
    <WorkforceFrame archetype="demographic" code="DM-AGE-13" title="Age Cohorts"
      subtitle="per-cohort participation & skills">
      <WorkforceKpi items={[
        { label: 'Cohorts tracked', value: board.demographics.cohorts.length },
        { label: 'Youth unemployment', value: `${board.demographics.youthUnemploymentPct}%`, tone: 'alert' },
        { label: 'Aging index', value: `${board.demographics.agingIndex}/100`, tone: 'warn' },
        { label: 'Dependency ratio', value: `${board.demographics.dependencyRatio}/100`, tone: 'info' },
      ]} />
      <WorkforceRule label="cohorts" />
      {board.demographics.cohorts.map(c => (
        <div key={c.band} className="grid grid-cols-[80px_1fr_80px_80px_100px] gap-3 border-b py-1.5 text-[11px]"
          style={{ borderColor: LABOUR_DS.ruleSoft, fontFamily: 'ui-monospace, monospace' }}>
          <span style={{ color: LABOUR_DS.steel }}>{c.band}</span>
          <div className="h-1.5 self-center" style={{ background: LABOUR_DS.slateDeep }}>
            <div className="h-full" style={{ width: `${c.participationPct}%`, background: LABOUR_DS.teal }} />
          </div>
          <span className="text-right tabular-nums" style={{ color: LABOUR_DS.ink }}>{c.populationM.toFixed(1)}M</span>
          <span className="text-right tabular-nums" style={{ color: c.unemploymentPct > 12 ? LABOUR_DS.coral : c.unemploymentPct > 8 ? LABOUR_DS.amber : LABOUR_DS.teal }}>{c.unemploymentPct}%</span>
          <span className="text-right tabular-nums" style={{ color: LABOUR_DS.mut }}>match {c.skillsMatchIdx}</span>
        </div>
      ))}
    </WorkforceFrame>
  );
}

export function SkillsPipeline({ id, now }: { id: string; now: number }) {
  const board = workforceContinuityBoard(now);
  void id;
  return (
    <WorkforceFrame archetype="demographic" code="DM-SKL-14" title="Skills Pipeline"
      subtitle="per-pipeline supply & demand">
      <WorkforceKpi items={[
        { label: 'Pipelines', value: board.employment.pipelines.length },
        { label: 'Critical', value: board.employment.pipelines.filter(p => p.priority === 'critical').length, tone: 'alert' },
        { label: 'Declining', value: board.employment.pipelines.filter(p => p.priority === 'declining').length, tone: 'warn' },
        { label: 'Skills mismatch idx', value: `${board.demographics.skillsMismatchIdx}/100`, tone: 'warn' },
      ]} />
      <WorkforceRule label="pipeline register" />
      {board.employment.pipelines.map(p => (
        <FlowBar key={p.pipeline}
          label={p.pipeline}
          pct={p.placementRatePct}
          tone={p.priority === 'critical' ? 'alert' : p.priority === 'declining' ? 'warn' : 'ok'}
          tail={`${p.enrolledK.toFixed(1)}k · ${p.completionRatePct}% completion`} />
      ))}
    </WorkforceFrame>
  );
}

export function EmploymentCoordination({ id, now }: { id: string; now: number }) {
  const board = workforceContinuityBoard(now);
  void id;
  return (
    <WorkforceFrame archetype="demographic" code="DM-EMC-15" title="Employment Coordination"
      subtitle="inter-ministry employment alignment">
      <WorkforceKpi items={[
        { label: 'Vacancies (k)', value: board.employment.vacanciesActiveK.toFixed(1), tone: 'info' },
        { label: 'Placements / mo (k)', value: board.employment.placementsThisMonthK.toFixed(1), tone: 'ok' },
        { label: 'Jobseekers (k)', value: board.employment.jobseekersK.toFixed(1), tone: 'warn' },
        { label: 'Reskilling programmes', value: board.employment.reskillingProgrammesActive, tone: 'info' },
      ]} />
      <WorkforceCallout kicker="coordination" body="Labour places workforce through pipelines coordinated with Education, Trade & Industry, and Health. Discriminatory placement is constitutionally void." />
    </WorkforceFrame>
  );
}

export function SocialPressureRegister({ id, now }: { id: string; now: number }) {
  const board = workforceContinuityBoard(now);
  void id;
  return (
    <WorkforceFrame archetype="continuity" code="CN-PRS-17" title="Social Pressure Register"
      subtitle="per-pressure social register">
      <WorkforceKpi items={[
        { label: 'Social unrest idx', value: `${board.pressure.socialUnrestIdx}/100`, tone: board.pressure.socialUnrestIdx > 60 ? 'alert' : 'warn' },
        { label: 'Wage pressure idx', value: `${board.pressure.wagePressureIdx}/100`, tone: 'warn' },
        { label: 'Household inflation', value: `${board.pressure.householdInflationImpactIdx}/100`, tone: 'warn' },
        { label: 'Market instability', value: `${board.pressure.laborMarketInstabilityIdx}/100`, tone: 'info' },
      ]} />
      <WorkforceRule label="regional hardship" />
      {board.pressure.regionalHardship.map(r => (
        <FlowBar key={r.region}
          label={r.region}
          pct={r.hardshipIdx}
          tone={r.tone === 'alert' ? 'alert' : r.tone === 'warn' ? 'warn' : 'ok'} />
      ))}
    </WorkforceFrame>
  );
}

export function IndustrialClosures({ id, now }: { id: string; now: number }) {
  const ext = labourExtendedBoard(now);
  void id;
  return (
    <WorkforceFrame archetype="emergency" code="EM-ICL-19" title="Industrial Closures"
      subtitle="live closure ledger">
      <WorkforceKpi items={[
        { label: 'Active closures', value: ext.emergency.closures.length },
        { label: 'Workers displaced (k)', value: ext.emergency.totalDisplacedK.toFixed(0), tone: 'warn' },
        { label: 'Workers redeployed (k)', value: ext.emergency.totalRedeployedK.toFixed(0), tone: 'ok' },
        { label: 'Mean reabsorption (mo)', value: ext.emergency.meanReabsorptionMonths.toFixed(1), tone: 'info' },
      ]} />
      <WorkforceRule label="closure ledger" />
      {ext.emergency.closures.map(c => (
        <div key={c.id} className="grid grid-cols-[110px_140px_140px_100px_120px] gap-3 border-b py-1.5 text-[11px]"
          style={{ borderColor: LABOUR_DS.ruleSoft, fontFamily: 'ui-monospace, monospace' }}>
          <span style={{ color: LABOUR_DS.steel }}>{c.id}</span>
          <span style={{ color: LABOUR_DS.ink }}>{c.sector} · {c.closureCause}</span>
          <span style={{ color: LABOUR_DS.mut }}>{c.region}</span>
          <span className="text-right tabular-nums" style={{ color: LABOUR_DS.mut }}>{c.workersDisplacedK.toFixed(1)}k</span>
          <span className="text-right uppercase tracking-[0.16em]"
            style={{ color: c.phase === 'closed' ? LABOUR_DS.teal : c.phase === 'reabsorption' ? LABOUR_DS.steel : c.phase === 'reskilling' || c.phase === 'redeployment' ? LABOUR_DS.amber : LABOUR_DS.coral }}>● {c.phase}</span>
        </div>
      ))}
    </WorkforceFrame>
  );
}

export function RedeploymentCorridors({ id, now }: { id: string; now: number }) {
  const ext = labourExtendedBoard(now);
  void id;
  return (
    <WorkforceFrame archetype="emergency" code="EM-RDP-20" title="Redeployment Corridors"
      subtitle="sector-to-sector worker corridors">
      <WorkforceKpi items={[
        { label: 'Corridors', value: ext.emergency.redeploymentCorridors.length },
        { label: 'Saturated', value: ext.emergency.redeploymentCorridors.filter(c => c.status === 'saturated').length, tone: 'alert' },
        { label: 'Workers routed (k)', value: ext.emergency.redeploymentCorridors.reduce((s, c) => s + c.workersRoutedK, 0).toFixed(1) },
        { label: 'Mean bridging (mo)', value: Math.round(ext.emergency.redeploymentCorridors.reduce((s, c) => s + c.bridgingMonths, 0) / Math.max(1, ext.emergency.redeploymentCorridors.length)) },
      ]} />
      <WorkforceRule label="corridor register" />
      {ext.emergency.redeploymentCorridors.map(c => (
        <FlowBar key={c.id}
          label={`${c.fromSector} → ${c.toSector}`}
          pct={c.capacityRoutedPct}
          tone={c.status === 'saturated' ? 'alert' : c.status === 'congested' ? 'warn' : c.status === 'active' ? 'ok' : 'info'}
          tail={`${c.workersRoutedK.toFixed(1)}k · ${c.bridgingMonths}mo bridge`} />
      ))}
    </WorkforceFrame>
  );
}

export function EmergencyProgrammes({ id, now }: { id: string; now: number }) {
  const ext = labourExtendedBoard(now);
  void id;
  return (
    <WorkforceFrame archetype="emergency" code="EM-PRG-21" title="Emergency Programmes"
      subtitle="bridge, reskilling, relocation, pension acceleration">
      <WorkforceKpi items={[
        { label: 'Programmes', value: ext.emergency.emergencyProgrammes.length },
        { label: 'Beneficiaries active (k)', value: ext.emergency.emergencyProgrammes.reduce((s, p) => s + p.beneficiariesActiveK, 0).toFixed(1), tone: 'info' },
        { label: 'Enrolments / week (k)', value: ext.emergency.emergencyProgrammes.reduce((s, p) => s + p.enrolmentsThisWeekK, 0).toFixed(1) },
        { label: 'Disbursement / mo (Bn)', value: ext.emergency.emergencyProgrammes.reduce((s, p) => s + p.disbursementBnThisMonth, 0).toFixed(1), tone: 'ok' },
      ]} />
      <WorkforceRule label="programme register" />
      {ext.emergency.emergencyProgrammes.map(p => (
        <FlowBar key={p.programme}
          label={p.programme}
          pct={p.fulfilmentPct}
          tone={p.fulfilmentPct > 80 ? 'ok' : p.fulfilmentPct > 60 ? 'warn' : 'alert'}
          tail={`${p.beneficiariesActiveK.toFixed(1)}k active`} />
      ))}
    </WorkforceFrame>
  );
}
