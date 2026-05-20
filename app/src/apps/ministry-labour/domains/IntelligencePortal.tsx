'use client';

// Labour domains — Intelligence, Portal & Oversight surfaces.

import * as React from 'react';
import { workforceContinuityBoard } from '@/lib/gov/workforce-continuity';
import { labourExtendedBoard, LABOUR_EXTENDED_SAFEGUARDS } from '@/lib/gov/labour-extended';
import { WorkforceFrame, WorkforceKpi, WorkforceRule, FlowBar, WorkforceCallout, LABOUR_DS } from '@/apps/ministry-labour/design-system/labour-ds';
import { seed, wave } from '@/lib/telemetry';

export function DemandForecast({ id, now }: { id: string; now: number }) {
  const board = workforceContinuityBoard(now);
  void id;
  return (
    <WorkforceFrame archetype="intelligence" code="IN-DMD-23" title="Labour Demand Forecast"
      subtitle={`${board.forecast.horizonYears.join('y / ')}y trajectory`}>
      <WorkforceKpi items={[
        { label: 'Horizons', value: board.forecast.horizonYears.length },
        { label: 'Generational continuity', value: `${board.forecast.generationalContinuityIdx}/100`, tone: 'ok' },
        { label: 'Social sustainability', value: `${board.forecast.socialSustainabilityIdx}/100`, tone: 'info' },
        { label: 'Systemic risk', value: `${board.forecast.systemicLaborRisk}/100`, tone: 'warn' },
      ]} />
      <WorkforceRule label="multi-horizon trajectories" />
      <div className="grid grid-cols-2 gap-2 text-[11px] md:grid-cols-3">
        {['Employment', 'Participation', 'Productivity', 'Automation displacement', 'Pension solvency'].map((label, i) => {
          const series = [board.forecast.employmentTrajectory, board.forecast.participationTrajectory, board.forecast.productivityTrajectory, board.forecast.automationDisplacementTrajectory, board.forecast.pensionSolvencyTrajectory][i]!;
          const last = series[series.length - 1] ?? 0;
          const isStress = label === 'Automation displacement';
          return (
            <div key={label} className="border p-2" style={{ borderColor: LABOUR_DS.rule }}>
              <div className="text-[9px] uppercase tracking-[0.18em]" style={{ color: LABOUR_DS.mut, fontFamily: 'ui-monospace, monospace' }}>{label}</div>
              <div className="text-[13px] font-semibold tabular-nums" style={{ color: isStress ? LABOUR_DS.amber : LABOUR_DS.teal }}>{last}</div>
              <div className="mt-1 flex items-end gap-1">
                {series.map((v, j) => (
                  <div key={j} className="flex-1" style={{ height: `${Math.max(2, Math.min(40, Math.abs(v) / 3))}px`, background: isStress ? LABOUR_DS.amber : LABOUR_DS.teal }} />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </WorkforceFrame>
  );
}

export function LabourMarketAnomalies({ id, now }: { id: string; now: number }) {
  const board = workforceContinuityBoard(now);
  void id;
  return (
    <WorkforceFrame archetype="intelligence" code="IN-ANM-24" title="Labour Market Anomalies"
      subtitle="anomaly detection feed">
      <WorkforceKpi items={[
        { label: 'Active incidents', value: board.incidents.length },
        { label: 'National severity', value: board.incidents.filter(i => i.severity === 'national').length, tone: 'alert' },
        { label: 'Critical severity', value: board.incidents.filter(i => i.severity === 'critical').length, tone: 'alert' },
        { label: 'Workers affected (k)', value: board.incidents.reduce((s, i) => s + i.workersAffectedK, 0).toFixed(1) },
      ]} />
      <WorkforceRule label="incident ledger" />
      {board.incidents.map(i => (
        <div key={i.id} className="grid grid-cols-[110px_180px_140px_100px_120px] gap-3 border-b py-1.5 text-[11px]"
          style={{ borderColor: LABOUR_DS.ruleSoft, fontFamily: 'ui-monospace, monospace' }}>
          <span style={{ color: LABOUR_DS.steel }}>{i.id}</span>
          <span style={{ color: LABOUR_DS.ink }}>{i.kind}</span>
          <span style={{ color: LABOUR_DS.mut }}>{i.region}</span>
          <span className="text-right tabular-nums" style={{ color: LABOUR_DS.mut }}>{i.workersAffectedK.toFixed(1)}k</span>
          <span className="text-right uppercase tracking-[0.16em]"
            style={{ color: i.severity === 'national' || i.severity === 'critical' ? LABOUR_DS.coral : i.severity === 'elevated' ? LABOUR_DS.amber : LABOUR_DS.teal }}>● {i.recoveryPathway}</span>
        </div>
      ))}
    </WorkforceFrame>
  );
}

export function EmploymentApplications({ id, now }: { id: string; now: number }) {
  const ext = labourExtendedBoard(now);
  void id;
  return (
    <WorkforceFrame archetype="portal" code="PR-EMP-26" title="Employment Applications"
      subtitle="application docket">
      <WorkforceKpi items={[
        { label: 'Active applications', value: ext.portal.employmentApplications.length },
        { label: 'Placed', value: ext.portal.employmentApplications.filter(a => a.status === 'placed').length, tone: 'ok' },
        { label: 'Awaiting interview', value: ext.portal.employmentApplications.filter(a => a.status === 'interview').length, tone: 'info' },
        { label: 'Screening / matching', value: ext.portal.employmentApplications.filter(a => a.status === 'screening' || a.status === 'matching').length, tone: 'warn' },
      ]} />
      <WorkforceRule label="application docket" />
      {ext.portal.employmentApplications.map(a => (
        <div key={a.id} className="grid grid-cols-[110px_160px_140px_80px_120px] gap-3 border-b py-1.5 text-[11px]"
          style={{ borderColor: LABOUR_DS.ruleSoft, fontFamily: 'ui-monospace, monospace' }}>
          <span style={{ color: LABOUR_DS.steel }}>{a.id}</span>
          <span style={{ color: LABOUR_DS.ink }}>{a.applicant} · {a.sectorPreference}</span>
          <span style={{ color: LABOUR_DS.mut }}>{a.region}</span>
          <span className="text-right tabular-nums" style={{ color: LABOUR_DS.mut }}>{a.daysOpen}d</span>
          <span className="text-right uppercase tracking-[0.16em]"
            style={{ color: a.status === 'placed' ? LABOUR_DS.teal : a.status === 'interview' ? LABOUR_DS.steel : LABOUR_DS.amber }}>● {a.status}</span>
        </div>
      ))}
    </WorkforceFrame>
  );
}

export function PensionRequests({ id, now }: { id: string; now: number }) {
  const ext = labourExtendedBoard(now);
  void id;
  return (
    <WorkforceFrame archetype="portal" code="PR-PEN-27" title="Pension Requests"
      subtitle="pension access docket">
      <WorkforceKpi items={[
        { label: 'Active requests', value: ext.portal.pensionRequests.length },
        { label: 'Disbursed', value: ext.portal.pensionRequests.filter(r => r.status === 'disbursed').length, tone: 'ok' },
        { label: 'Approved', value: ext.portal.pensionRequests.filter(r => r.status === 'approved').length, tone: 'info' },
        { label: 'Verifying', value: ext.portal.pensionRequests.filter(r => r.status === 'verifying').length, tone: 'warn' },
      ]} />
      <WorkforceRule label="request docket" />
      {ext.portal.pensionRequests.map(r => (
        <div key={r.id} className="grid grid-cols-[110px_160px_120px_100px_120px] gap-3 border-b py-1.5 text-[11px]"
          style={{ borderColor: LABOUR_DS.ruleSoft, fontFamily: 'ui-monospace, monospace' }}>
          <span style={{ color: LABOUR_DS.steel }}>{r.id}</span>
          <span style={{ color: LABOUR_DS.ink }}>{r.scheme}</span>
          <span className="text-right tabular-nums" style={{ color: LABOUR_DS.mut }}>{r.amountMonthly} /mo</span>
          <span className="text-right tabular-nums" style={{ color: LABOUR_DS.mut }}>{r.daysOpen}d</span>
          <span className="text-right uppercase tracking-[0.16em]"
            style={{ color: r.status === 'disbursed' ? LABOUR_DS.teal : r.status === 'approved' ? LABOUR_DS.steel : LABOUR_DS.amber }}>● {r.status}</span>
        </div>
      ))}
    </WorkforceFrame>
  );
}

export function LabourComplaints({ id, now }: { id: string; now: number }) {
  const ext = labourExtendedBoard(now);
  void id;
  return (
    <WorkforceFrame archetype="portal" code="PR-CMP-28" title="Labour Complaints"
      subtitle="citizen complaint docket">
      <WorkforceKpi items={[
        { label: 'Active complaints', value: ext.portal.complaints.length },
        { label: 'Critical', value: ext.portal.complaints.filter(c => c.severity === 'critical').length, tone: 'alert' },
        { label: 'Serious', value: ext.portal.complaints.filter(c => c.severity === 'serious').length, tone: 'warn' },
        { label: 'Resolved', value: ext.portal.complaints.filter(c => c.stage === 'resolved').length, tone: 'ok' },
      ]} />
      <WorkforceRule label="complaint ledger" />
      {ext.portal.complaints.map(c => (
        <div key={c.id} className="grid grid-cols-[110px_160px_140px_80px_120px] gap-3 border-b py-1.5 text-[11px]"
          style={{ borderColor: LABOUR_DS.ruleSoft, fontFamily: 'ui-monospace, monospace' }}>
          <span style={{ color: LABOUR_DS.steel }}>{c.id}</span>
          <span style={{ color: LABOUR_DS.ink }}>{c.kind}</span>
          <span style={{ color: LABOUR_DS.mut }}>{c.region}</span>
          <span className="text-right tabular-nums" style={{ color: LABOUR_DS.mut }}>{c.daysOpen}d</span>
          <span className="text-right uppercase tracking-[0.16em]"
            style={{ color: c.severity === 'critical' ? LABOUR_DS.coral : c.severity === 'serious' ? LABOUR_DS.amber : LABOUR_DS.teal }}>● {c.stage}</span>
        </div>
      ))}
    </WorkforceFrame>
  );
}

export function VocationalEnrolments({ id, now }: { id: string; now: number }) {
  const ext = labourExtendedBoard(now);
  void id;
  return (
    <WorkforceFrame archetype="portal" code="PR-VOC-29" title="Vocational Enrolments"
      subtitle="apprenticeship & reskilling">
      <WorkforceKpi items={[
        { label: 'Programmes', value: ext.portal.vocationalEnrolments.length },
        { label: 'Enrolled / month (k)', value: ext.portal.vocationalEnrolments.reduce((s, v) => s + v.enrolledThisMonthK, 0).toFixed(1), tone: 'info' },
        { label: 'Mean placement', value: `${Math.round(ext.portal.vocationalEnrolments.reduce((s, v) => s + v.placementRatePct, 0) / Math.max(1, ext.portal.vocationalEnrolments.length))}%`, tone: 'ok' },
        { label: 'Mean wait (mo)', value: Math.round(ext.portal.vocationalEnrolments.reduce((s, v) => s + v.waitlistMonths, 0) / Math.max(1, ext.portal.vocationalEnrolments.length)), tone: 'warn' },
      ]} />
      <WorkforceRule label="programme register" />
      {ext.portal.vocationalEnrolments.map(v => (
        <FlowBar key={v.programme}
          label={v.programme}
          pct={v.placementRatePct}
          tone={v.placementRatePct > 70 ? 'ok' : v.placementRatePct > 50 ? 'warn' : 'alert'}
          tail={`${v.enrolledThisMonthK.toFixed(1)}k · ${v.waitlistMonths}mo wait`} />
      ))}
    </WorkforceFrame>
  );
}

export function LabourAdvisories({ id, now }: { id: string; now: number }) {
  const ext = labourExtendedBoard(now);
  void id;
  return (
    <WorkforceFrame archetype="portal" code="PR-ADV-30" title="Labour Advisories"
      subtitle="public advisory feed">
      <WorkforceKpi items={[
        { label: 'Active advisories', value: ext.portal.advisories.length },
        { label: 'Reach (M)', value: ext.portal.advisories.reduce((s, a) => s + a.reachM, 0).toFixed(1), tone: 'info' },
        { label: 'Sector-shortage', value: ext.portal.advisories.filter(a => a.kind === 'sector-shortage').length, tone: 'warn' },
        { label: 'Pension-reform', value: ext.portal.advisories.filter(a => a.kind === 'pension-reform-notice').length, tone: 'info' },
      ]} />
      <WorkforceRule label="advisory ledger" />
      {ext.portal.advisories.map(a => (
        <div key={a.id} className="grid grid-cols-[110px_220px_140px_100px] gap-3 border-b py-1.5 text-[11px]"
          style={{ borderColor: LABOUR_DS.ruleSoft, fontFamily: 'ui-monospace, monospace' }}>
          <span style={{ color: LABOUR_DS.steel }}>{a.id}</span>
          <span style={{ color: LABOUR_DS.ink }}>{a.kind}</span>
          <span style={{ color: LABOUR_DS.mut }}>{a.region}</span>
          <span className="text-right tabular-nums" style={{ color: LABOUR_DS.mut }}>{a.reachM.toFixed(1)}M reach</span>
        </div>
      ))}
    </WorkforceFrame>
  );
}

export function LabourSafeguards({ id, now }: { id: string; now: number }) {
  void id; void now;
  return (
    <WorkforceFrame archetype="oversight" code="OV-SFG-33" title="Labour Safeguards"
      subtitle="LABOUR_EXTENDED_SAFEGUARDS contract · §24.7">
      <WorkforceKpi items={[
        { label: 'Right to counsel', value: LABOUR_EXTENDED_SAFEGUARDS.rightToCounselInDisputes ? '✓' : '✗', tone: 'ok' },
        { label: 'Workplace safety as public good', value: LABOUR_EXTENDED_SAFEGUARDS.workplaceSafetyAsPublicGood ? '✓' : '✗', tone: 'ok' },
        { label: 'Benefits continuity', value: LABOUR_EXTENDED_SAFEGUARDS.benefitsContinuityDuringTransition ? '✓' : '✗', tone: 'ok' },
        { label: 'Non-retaliation', value: LABOUR_EXTENDED_SAFEGUARDS.nonRetaliationForComplaints ? '✓' : '✗', tone: 'ok' },
      ]} />
      <WorkforceRule label="prohibited postures" />
      <ul className="grid grid-cols-1 gap-1 md:grid-cols-2 text-[11px]"
        style={{ color: LABOUR_DS.ink, fontFamily: 'ui-monospace, monospace' }}>
        {LABOUR_EXTENDED_SAFEGUARDS.prohibited.map(p => (
          <li key={p} className="border-l-2 pl-2" style={{ borderColor: LABOUR_DS.coral }}>
            <span style={{ color: LABOUR_DS.coral }}>✕</span> {p}
          </li>
        ))}
      </ul>
      <WorkforceCallout kicker="binding contract" body="Every Labour surface attests against this contract. Retaliatory termination, wage theft, and benefits clawback without notice are constitutionally void." />
    </WorkforceFrame>
  );
}

export function WorkplaceSafetyAudit({ id, now }: { id: string; now: number }) {
  const ts = now / 4000;
  void id; void ts;
  return (
    <WorkforceFrame archetype="oversight" code="OV-SFA-34" title="Workplace Safety Audit"
      subtitle="audit & ratios">
      <WorkforceKpi items={[
        { label: 'Fatalities (YTD)', value: Math.round(wave(`wsa:f:0`, ts, 8, 240)), tone: 'alert' },
        { label: 'Injuries (Q)', value: Math.round(wave(`wsa:i:0`, ts, 800, 18000)).toLocaleString(), tone: 'warn' },
        { label: 'Inspection coverage', value: `${Math.round(wave(`wsa:c:0`, ts, 64, 96))}%`, tone: 'ok' },
        { label: 'Retaliation findings', value: 0, tone: 'ok' },
      ]} />
      <WorkforceCallout kicker="audit doctrine" body="Workplace fatalities trigger automatic civilian-panel review. Patterns concentrated in a sector or operator trigger sector-wide inspection." />
    </WorkforceFrame>
  );
}

void seed;
