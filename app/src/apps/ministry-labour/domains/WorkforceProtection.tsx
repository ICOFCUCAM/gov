'use client';

// Labour domains — Workforce, Protection & Rights surfaces.

import * as React from 'react';
import { workforceContinuityBoard } from '@/lib/gov/workforce-continuity';
import { WorkforceFrame, WorkforceKpi, WorkforceRule, FlowBar, WorkforceCallout, LABOUR_DS } from '@/apps/ministry-labour/design-system/labour-ds';

function postureMap(p: 'thriving' | 'stable' | 'tightening' | 'strained' | 'crisis-mobilisation'): 'flowing' | 'engaged' | 'strained' | 'crisis' | 'mobilisation' {
  if (p === 'crisis-mobilisation') return 'mobilisation';
  if (p === 'strained') return 'strained';
  if (p === 'tightening') return 'engaged';
  return 'flowing';
}

export function EmploymentBoard({ id, now }: { id: string; now: number }) {
  const board = workforceContinuityBoard(now);
  void id;
  return (
    <WorkforceFrame archetype="workforce" code="WF-EMP-02" title="Employment Board"
      subtitle="national unemployment & participation"
      posture={postureMap(board.command.posture)}>
      <WorkforceKpi items={[
        { label: 'Unemployment', value: `${board.command.unemploymentPct}%`, tone: board.command.unemploymentPct > 12 ? 'alert' : board.command.unemploymentPct > 8 ? 'warn' : 'ok' },
        { label: 'Participation', value: `${board.command.participationRatePct}%`, tone: 'info' },
        { label: 'Continuity index', value: `${board.command.employmentContinuityIdx}/100`, tone: 'ok' },
        { label: 'Workforce shortages', value: `${board.command.workforceShortagesIdx}/100`, tone: 'warn' },
      ]} />
      <WorkforceRule label="active labour signals" />
      <WorkforceCallout kicker="benefits continuity" body="Unemployment-benefit disbursement must run within the constitutional 14-day window. Late disbursement is a sustained finding before the Audit Vault." />
    </WorkforceFrame>
  );
}

export function SectorAllocation({ id, now }: { id: string; now: number }) {
  const board = workforceContinuityBoard(now);
  void id;
  return (
    <WorkforceFrame archetype="workforce" code="WF-SEC-03" title="Sector Allocation"
      subtitle="per-sector workforce distribution">
      <WorkforceKpi items={[
        { label: 'Vacancies (k)', value: board.employment.vacanciesActiveK.toFixed(1), tone: 'info' },
        { label: 'Placements / month (k)', value: board.employment.placementsThisMonthK.toFixed(1), tone: 'ok' },
        { label: 'Jobseekers (k)', value: board.employment.jobseekersK.toFixed(1), tone: 'warn' },
        { label: 'Vocational trainees (k)', value: board.employment.vocationalTraineesK.toFixed(1) },
      ]} />
      <WorkforceRule label="skills pipelines" />
      {board.employment.pipelines.map(p => (
        <FlowBar key={p.pipeline}
          label={p.pipeline}
          pct={p.placementRatePct}
          tone={p.priority === 'critical' ? 'alert' : p.priority === 'declining' ? 'warn' : 'ok'}
          tail={`${p.enrolledK.toFixed(1)}k enrolled · ${p.completionRatePct}% completion`} />
      ))}
    </WorkforceFrame>
  );
}

export function RegionalWorkforce({ id, now }: { id: string; now: number }) {
  const board = workforceContinuityBoard(now);
  void id;
  return (
    <WorkforceFrame archetype="workforce" code="WF-REG-04" title="Regional Workforce"
      subtitle="per-region workforce posture">
      <WorkforceKpi items={[
        { label: 'Regions', value: board.command.regions.length },
        { label: 'Distressed', value: board.command.regions.filter(r => r.classification === 'distressed').length, tone: 'alert' },
        { label: 'Strained', value: board.command.regions.filter(r => r.classification === 'strained').length, tone: 'warn' },
        { label: 'Thriving', value: board.command.regions.filter(r => r.classification === 'thriving').length, tone: 'ok' },
      ]} />
      <WorkforceRule label="region register" />
      {board.command.regions.map(r => (
        <FlowBar key={r.region}
          label={r.region}
          pct={r.participationRatePct}
          tone={r.classification === 'distressed' ? 'alert' : r.classification === 'strained' ? 'alert' : r.classification === 'tightening' ? 'warn' : 'ok'}
          tail={`unemp ${r.unemploymentPct}% · hardship ${r.hardshipIdx}`} />
      ))}
    </WorkforceFrame>
  );
}

export function BenefitsProgrammes({ id, now }: { id: string; now: number }) {
  const board = workforceContinuityBoard(now);
  void id;
  return (
    <WorkforceFrame archetype="protection" code="SP-BEN-06" title="Benefits Programmes"
      subtitle="programmes & fund coverage">
      <WorkforceKpi items={[
        { label: 'Programmes', value: board.social.programmes.length },
        { label: 'Stressed', value: board.social.programmes.filter(p => p.status === 'stressed').length, tone: 'alert' },
        { label: 'Beneficiaries (k)', value: board.social.programmes.reduce((s, p) => s + p.beneficiariesK, 0).toFixed(0), tone: 'info' },
        { label: 'Vulnerable coverage', value: `${board.social.vulnerablePopulationCoveragePct}%`, tone: 'ok' },
      ]} />
      <WorkforceRule label="programme register" />
      {board.social.programmes.map(p => (
        <div key={p.id} className="grid grid-cols-[120px_200px_120px_80px_120px] gap-3 border-b py-1.5 text-[11px]"
          style={{ borderColor: LABOUR_DS.ruleSoft, fontFamily: 'ui-monospace, monospace' }}>
          <span style={{ color: LABOUR_DS.steel }}>{p.id}</span>
          <span style={{ color: LABOUR_DS.ink }}>{p.programme}</span>
          <span style={{ color: LABOUR_DS.mut }}>{p.category}</span>
          <span className="text-right tabular-nums" style={{ color: LABOUR_DS.mut }}>{p.payoutOnTimePct}%</span>
          <span className="text-right uppercase tracking-[0.16em]"
            style={{ color: p.status === 'stressed' ? LABOUR_DS.coral : p.status === 'pressured' ? LABOUR_DS.coral : p.status === 'observant' ? LABOUR_DS.amber : LABOUR_DS.teal }}>● {p.status}</span>
        </div>
      ))}
    </WorkforceFrame>
  );
}

export function PensionBoard({ id, now }: { id: string; now: number }) {
  const board = workforceContinuityBoard(now);
  void id;
  const pensions = board.social.programmes.filter(p => p.category === 'pension' || p.category === 'disability');
  return (
    <WorkforceFrame archetype="protection" code="SP-PEN-07" title="Pension Board"
      subtitle="pension funds, claims & solvency">
      <WorkforceKpi items={[
        { label: 'Schemes', value: pensions.length },
        { label: 'Continuity (years)', value: board.social.pensionContinuityYears, tone: board.social.pensionContinuityYears > 25 ? 'ok' : 'warn' },
        { label: 'Beneficiaries (k)', value: pensions.reduce((s, p) => s + p.beneficiariesK, 0).toFixed(0), tone: 'info' },
        { label: 'Mean payout on time', value: `${Math.round(pensions.reduce((s, p) => s + p.payoutOnTimePct, 0) / Math.max(1, pensions.length))}%`, tone: 'ok' },
      ]} />
      <WorkforceRule label="pension schemes" />
      {pensions.map(p => (
        <FlowBar key={p.id}
          label={`${p.programme} · ${p.category}`}
          pct={p.payoutOnTimePct}
          tone={p.payoutOnTimePct > 92 ? 'ok' : p.payoutOnTimePct > 78 ? 'warn' : 'alert'}
          tail={`${p.beneficiariesK.toFixed(0)}k · ${p.fundCoverageMonths}m cover`} />
      ))}
    </WorkforceFrame>
  );
}

export function WorkplaceInspections({ id, now }: { id: string; now: number }) {
  const board = workforceContinuityBoard(now);
  void id;
  return (
    <WorkforceFrame archetype="rights" code="RG-INS-09" title="Workplace Inspections"
      subtitle="inspection ledger & compliance">
      <WorkforceKpi items={[
        { label: 'Inspections active', value: board.rights.inspectionsActive },
        { label: 'Compliance index', value: `${board.rights.complianceIdx}/100`, tone: 'ok' },
        { label: 'Safety incidents (Q)', value: board.rights.safetyIncidentsThisQ, tone: 'warn' },
        { label: 'Rights alerts', value: board.rights.rightsAlertsRaised, tone: 'alert' },
      ]} />
      <WorkforceCallout kicker="non-retaliation doctrine" body="Workplace inspection findings cannot trigger retaliation against the worker who raised them. Retaliatory termination is constitutionally void." />
    </WorkforceFrame>
  );
}

export function OccupationalIncidents({ id, now }: { id: string; now: number }) {
  const board = workforceContinuityBoard(now);
  void id;
  return (
    <WorkforceFrame archetype="rights" code="RG-INC-10" title="Occupational Incidents"
      subtitle="active workplace incidents">
      <WorkforceKpi items={[
        { label: 'Disputes active', value: board.rights.disputes.length },
        { label: 'Rights-alert disputes', value: board.rights.disputes.filter(d => d.rightsStatus === 'alert').length, tone: 'alert' },
        { label: 'Under review', value: board.rights.disputes.filter(d => d.rightsStatus === 'under-review').length, tone: 'warn' },
        { label: 'Mean days open', value: Math.round(board.rights.disputes.reduce((s, d) => s + d.daysOpen, 0) / Math.max(1, board.rights.disputes.length)) },
      ]} />
      <WorkforceRule label="dispute ledger" />
      {board.rights.disputes.map(d => (
        <div key={d.id} className="grid grid-cols-[110px_160px_140px_80px_120px] gap-3 border-b py-1.5 text-[11px]"
          style={{ borderColor: LABOUR_DS.ruleSoft, fontFamily: 'ui-monospace, monospace' }}>
          <span style={{ color: LABOUR_DS.steel }}>{d.id}</span>
          <span style={{ color: LABOUR_DS.ink }}>{d.kind}</span>
          <span style={{ color: LABOUR_DS.mut }}>{d.region}</span>
          <span className="text-right tabular-nums" style={{ color: LABOUR_DS.mut }}>{d.workersAffectedK.toFixed(1)}k</span>
          <span className="text-right uppercase tracking-[0.16em]"
            style={{ color: d.rightsStatus === 'alert' ? LABOUR_DS.coral : d.rightsStatus === 'under-review' ? LABOUR_DS.amber : LABOUR_DS.teal }}>● {d.stage}</span>
        </div>
      ))}
    </WorkforceFrame>
  );
}

export function TribunalLanes({ id, now }: { id: string; now: number }) {
  const ts = now / 4000;
  void id; void ts;
  const lanes = [
    { lane: 'Mediation',    active: 1820, mean: 21, win: 64 },
    { lane: 'Conciliation', active: 920,  mean: 38, win: 58 },
    { lane: 'Arbitration',  active: 480,  mean: 82, win: 52 },
    { lane: 'Labour court', active: 240,  mean: 168, win: 49 },
  ];
  return (
    <WorkforceFrame archetype="rights" code="RG-TRB-11" title="Tribunal Lanes"
      subtitle="mediation / arbitration / labour court">
      <WorkforceKpi items={[
        { label: 'Lanes', value: lanes.length },
        { label: 'Total active cases', value: lanes.reduce((s, l) => s + l.active, 0).toLocaleString() },
        { label: 'Mean worker win rate', value: `${Math.round(lanes.reduce((s, l) => s + l.win, 0) / lanes.length)}%`, tone: 'info' },
        { label: 'Mean resolution (d)', value: Math.round(lanes.reduce((s, l) => s + l.mean, 0) / lanes.length), tone: 'warn' },
      ]} />
      <WorkforceRule label="lane register" />
      {lanes.map(l => (
        <FlowBar key={l.lane}
          label={l.lane}
          pct={l.win}
          tone={l.win > 60 ? 'ok' : 'warn'}
          tail={`${l.active.toLocaleString()} cases · ${l.mean}d median`} />
      ))}
      <WorkforceCallout kicker="counsel doctrine" body="Workers in any tribunal lane have a constitutional right to counsel; legal-aid must be offered at filing." />
    </WorkforceFrame>
  );
}
