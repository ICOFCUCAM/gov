'use client';

// apps/ministry-education — federated education execution application.

import * as React from 'react';
import { StatGrid, Bars, Panel } from '@/apps/_shared/AppKit';
import { RuntimeQueue } from '@/components/features/RuntimeQueue';
import { schoolNetwork, examOps, teacherOps, studentServices, higherEducation, curriculumOps, educationCommand } from '@/lib/gov/education-systems';
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
  } else if (d === 'command') {
    const C = educationCommand(id, ts);
    body = (
      <>
        <StatGrid items={[
          { l: 'Posture index', v: `${C.postureIndex}`, t: C.posture === 'crisis' ? 'alert' : C.posture === 'engaged' ? 'warn' : 'ok' },
          { l: 'Command posture', v: C.posture, t: C.posture === 'crisis' ? 'alert' : C.posture === 'engaged' ? 'warn' : 'ok' },
          { l: 'Critical domains', v: `${C.criticalDomains}`, t: C.criticalDomains ? 'alert' : 'ok' },
          { l: 'Open directives', v: `${C.directives.length}`, t: C.directives.some(x => x.priority === 'critical') ? 'alert' : C.directives.length ? 'warn' : 'ok' },
          { l: 'Pupil:teacher', v: `${sn.pupilTeacherRatio}:1`, t: sn.pupilTeacherRatio >= 45 ? 'alert' : sn.pupilTeacherRatio >= 35 ? 'warn' : 'ok' },
          { l: 'Dropout rate', v: `${sn.dropoutRatePct}%`, t: sn.dropoutRatePct >= 12 ? 'alert' : 'ok' },
        ]} />
        <Panel title="Whole-of-education domain status" meta="emergent from every subsystem engine">
          <Bars rows={C.domains.map(x => ({ label: x.domain, pct: x.tone === 'ok' ? 88 : x.tone === 'warn' ? 55 : 22, tone: x.tone, tail: x.value }))} />
        </Panel>
      </>
    );
  } else if (d === 'higher') {
    const H = higherEducation(id, ts);
    body = (
      <>
        <StatGrid items={[
          { l: 'Institutions', v: `${H.institutions}`, t: 'ok' },
          { l: 'Enrolment', v: `${H.enrolmentK}k`, t: 'ok' },
          { l: 'Graduation rate', v: `${H.graduationRatePct}%`, t: H.graduationRatePct >= 70 ? 'ok' : 'warn' },
          { l: 'Research output', v: `${H.researchOutputIndex}`, t: H.researchOutputIndex >= 60 ? 'ok' : 'warn' },
          { l: 'Funding gap', v: `${H.fundingGapPct}%`, t: H.fundingGapPct >= 25 ? 'alert' : H.fundingGapPct >= 14 ? 'warn' : 'ok' },
          { l: 'Posture', v: H.posture, t: H.posture === 'underfunded' ? 'alert' : H.posture === 'pressured' ? 'warn' : 'ok' },
        ]} />
        <Panel title="Institution tiers" meta="tier · utilisation">
          <Bars rows={H.tiers.map(x => ({ label: x.tier, pct: Math.min(100, x.utilisationPct), tone: x.tone, tail: `${x.utilisationPct}%` }))} />
        </Panel>
      </>
    );
  } else if (d === 'curriculum') {
    const Cu = curriculumOps(id, ts);
    body = (
      <>
        <StatGrid items={[
          { l: 'Frameworks', v: `${Cu.frameworks}`, t: 'ok' },
          { l: 'Revision cycle', v: `${Cu.revisionCyclePct}%`, t: Cu.revisionCyclePct >= 80 ? 'ok' : 'warn' },
          { l: 'Textbook coverage', v: `${Cu.textbookCoveragePct}%`, t: Cu.textbookCoveragePct >= 85 ? 'ok' : 'warn' },
          { l: 'Digital adoption', v: `${Cu.digitalAdoptionPct}%`, t: Cu.digitalAdoptionPct >= 60 ? 'ok' : 'warn' },
          { l: 'Outdated frameworks', v: `${Cu.outdatedFrameworks}`, t: Cu.outdatedFrameworks ? 'alert' : 'ok' },
          { l: 'Posture', v: Cu.posture, t: Cu.posture === 'obsolete' ? 'alert' : Cu.posture === 'lagging' ? 'warn' : 'ok' },
        ]} />
        <Panel title="Subject frameworks" meta="coverage · last revised">
          <Bars rows={Cu.subjects.map(s => ({ label: s.subject, pct: s.coveragePct, tone: s.tone, tail: `${s.lastRevisedYrs}y` }))} />
        </Panel>
      </>
    );
  } else if (d === 'teacher') {
    const tc = teacherOps(id, ts);
    body = (
      <StatGrid items={[
        { l: 'Teachers', v: tc.teachers.toLocaleString(), t: 'ok' },
        { l: 'Vacancies', v: `${tc.vacanciesPct}%`, t: tc.vacanciesPct >= 15 ? 'alert' : tc.vacanciesPct >= 8 ? 'warn' : 'ok' },
        { l: 'Postings pending', v: tc.postingsPending.toLocaleString(), t: tc.postingsPending > 1500 ? 'warn' : 'ok' },
        { l: 'Payroll on-time', v: `${tc.payrollOnTimePct}%`, t: tc.payrollOnTimePct >= 95 ? 'ok' : 'warn' },
        { l: 'Training active', v: tc.trainingActive.toLocaleString(), t: 'ok' },
      ]} />
    );
  } else if (d === 'student') {
    const ss = studentServices(id, ts);
    body = (
      <StatGrid items={[
        { l: 'Learner records', v: `${ss.learnerRecordsM}M`, t: 'ok' },
        { l: 'Portal uptime', v: `${ss.portalUptime}%`, t: ss.portalUptime >= 99 ? 'ok' : 'warn' },
        { l: 'Scholarships active', v: ss.scholarshipsActive.toLocaleString(), t: 'ok' },
        { l: 'Enrolment requests', v: ss.enrolmentRequests.toLocaleString(), t: ss.enrolmentRequests > 10000 ? 'warn' : 'ok' },
        { l: 'Satisfaction', v: `${ss.satisfactionPct}%`, t: ss.satisfactionPct >= 70 ? 'ok' : 'warn' },
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
      <div className="rounded-[3px] border border-line bg-surface px-2.5 py-1 text-[9px] font-semibold uppercase tracking-[0.16em] text-ink-muted">
        {label} subsystem
      </div>
      {body}
      <RuntimeQueue scope={`${id}:${d}`} kind={WF[d] ?? 'case'} title={`${label} runtime — execute the education workflow`} by="Education Officer" role={role} withheld={withheld} />
    </div>
  );
}
