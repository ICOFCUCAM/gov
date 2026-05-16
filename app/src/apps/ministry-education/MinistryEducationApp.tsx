'use client';

// apps/ministry-education — federated education execution application.

import * as React from 'react';
import { StatGrid, Bars, Panel } from '@/apps/_shared/AppKit';
import { RuntimeQueue } from '@/components/features/RuntimeQueue';
import { schoolNetwork, examOps, teacherOps, studentServices } from '@/lib/gov/education-systems';
import type { SovereignRole, Capability } from '@/shared/permissions/rbac';
import type { WorkKind } from '@/lib/gov/runtime-workflow';

const WF: Record<string, WorkKind> = { command: 'incident', schools: 'case', higher: 'case', exams: 'case', curriculum: 'case', teacher: 'approval', student: 'approval' };
const LABEL: Record<string, string> = { command: 'Education Command', schools: 'School Network', higher: 'Higher Education', exams: 'Examination Systems', curriculum: 'Curriculum', teacher: 'Teacher Systems', student: 'Student Systems' };

export function MinistryEducationApp({ instanceId, domain, now, role, withheld }: {
  instanceId: string; domain: string; now: number; role: SovereignRole; withheld: Capability[];
}) {
  const id = instanceId; const ts = now / 4000;
  const d = WF[domain] ? domain : 'command';
  const label = LABEL[d] ?? 'Education Command';
  const sn = schoolNetwork(id, ts);
  let body: React.ReactNode;
  if (d === 'exams') {
    const ex = examOps(id, ts);
    body = (
      <>
        <StatGrid items={[
          { l: 'Centres', v: `${ex.centres}`, t: 'ok' },
          { l: 'Candidates', v: ex.candidates.toLocaleString(), t: 'ok' },
          { l: 'Sittings active', v: `${ex.sittingsActive}`, t: 'ok' },
          { l: 'Results pending', v: ex.resultsPending.toLocaleString(), t: ex.resultsPending > 30000 ? 'warn' : 'ok' },
          { l: 'Integrity flags', v: `${ex.integrityFlags}`, t: ex.integrityFlags ? 'alert' : 'ok' },
          { l: 'Pipeline stages', v: `${ex.pipeline.length}`, t: 'ok' },
        ]} />
        <Panel title="Examination pipeline" meta="registration → release">
          <Bars rows={ex.pipeline.map(s => ({ label: s.stage, pct: Math.min(100, s.count), tone: 'warn', tail: `${s.count}` }))} />
        </Panel>
      </>
    );
  } else if (d === 'teacher' || d === 'student') {
    const tc = teacherOps(id, ts); const ss = studentServices(id, ts);
    body = (
      <StatGrid items={[
        { l: 'Teachers', v: tc.teachers.toLocaleString(), t: 'ok' },
        { l: 'Vacancies', v: `${tc.vacanciesPct}%`, t: tc.vacanciesPct >= 15 ? 'alert' : 'warn' },
        { l: 'Payroll on-time', v: `${tc.payrollOnTimePct}%`, t: tc.payrollOnTimePct >= 95 ? 'ok' : 'warn' },
        { l: 'Learner records', v: `${ss.learnerRecordsM}M`, t: 'ok' },
        { l: 'Scholarships', v: ss.scholarshipsActive.toLocaleString(), t: 'ok' },
        { l: 'Portal uptime', v: `${ss.portalUptime}%`, t: ss.portalUptime >= 99 ? 'ok' : 'warn' },
      ]} />
    );
  } else {
    body = (
      <>
        <StatGrid items={[
          { l: 'Schools', v: sn.schools.toLocaleString(), t: 'ok' },
          { l: 'Enrolment', v: `${sn.enrolmentM}M`, t: 'ok' },
          { l: 'Pupil:teacher', v: `${sn.pupilTeacherRatio}:1`, t: sn.pupilTeacherRatio >= 45 ? 'alert' : sn.pupilTeacherRatio >= 35 ? 'warn' : 'ok' },
          { l: 'Dropout rate', v: `${sn.dropoutRatePct}%`, t: sn.dropoutRatePct >= 12 ? 'alert' : sn.dropoutRatePct >= 7 ? 'warn' : 'ok' },
          { l: 'Infrastructure', v: `${sn.infrastructurePct}%`, t: sn.infrastructurePct >= 80 ? 'ok' : 'warn' },
          { l: 'Regions', v: `${sn.byRegion.length}`, t: 'ok' },
        ]} />
        <Panel title="Regional school capacity" meta="infrastructure · enrolment">
          <Bars rows={sn.byRegion.map(r => ({ label: r.region, pct: r.capacityPct, tone: r.tone, tail: `${r.capacityPct}%` }))} />
        </Panel>
      </>
    );
  }
  return (
    <div className="space-y-2">
      {body}
      <RuntimeQueue scope={`${id}:${d}`} kind={WF[d] ?? 'case'} title={`${label} runtime — execute the education workflow`} by="Education Officer" role={role} withheld={withheld} />
    </div>
  );
}
