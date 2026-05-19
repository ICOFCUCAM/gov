'use client';

// apps/ministry-education — federated education execution application.
// Cinematic sovereign command rhythm (shared ops kit).

import * as React from 'react';
import { RuntimeQueue } from '@/components/features/RuntimeQueue';
import { schoolNetwork, examOps, teacherOps, studentServices, higherEducation, curriculumOps, educationCommand } from '@/lib/gov/education-systems';
import { OpsHeader, KpiStrip, BarPanel } from '@/apps/_shared/Ops';
import { MinistryChainSection } from '@/apps/_shared/InstitutionChain';
import type { Tone } from '@/apps/_shared/SovereignUI';
import type { SovereignRole, Capability } from '@/shared/permissions/rbac';
import type { WorkKind } from '@/lib/gov/runtime-workflow';

const ACC = '#5fa8ff';
const WF: Record<string, WorkKind> = { command: 'incident', schools: 'case', higher: 'case', exams: 'case', curriculum: 'case', teacher: 'approval', student: 'approval' };
const LABEL: Record<string, string> = { command: 'Education Command', schools: 'School Network', higher: 'Higher Education', exams: 'Examination Systems', curriculum: 'Curriculum', teacher: 'Teacher Systems', student: 'Student Systems' };
type K = { l: string; v: string; t: Tone };
const strip = (items: K[]) => items.map((m, i) => ({ ...m, s: '', k: `ed${i}` }));

export function MinistryEducationApp({ instanceId, domain, now, role, withheld }: {
  instanceId: string; domain: string; now: number; role: SovereignRole; withheld: Capability[];
}) {
  const id = instanceId; const ts = now / 4000;
  const d = WF[domain] ? domain : 'command';
  const label = LABEL[d] ?? 'Education Command';
  const sn = schoolNetwork(id, ts);
  let kpis: K[] = [];
  let bars: { title: string; meta: string; rows: { label: string; pct: number; tone: Tone; tail: string }[] } | null = null;
  let pTone: Tone = 'ok';

  if (d === 'exams') {
    const ex = examOps(id, ts); pTone = ex.integrityFlags ? 'alert' : 'ok';
    kpis = [
      { l: 'Centres', v: `${ex.centres}`, t: 'ok' }, { l: 'Candidates', v: ex.candidates.toLocaleString(), t: 'ok' },
      { l: 'Sittings Active', v: `${ex.sittingsActive}`, t: 'ok' }, { l: 'Results Pending', v: ex.resultsPending.toLocaleString(), t: ex.resultsPending > 30000 ? 'warn' : 'ok' },
      { l: 'Integrity Flags', v: `${ex.integrityFlags}`, t: ex.integrityFlags ? 'alert' : 'ok' }, { l: 'Pipeline Stages', v: `${ex.pipeline.length}`, t: 'ok' },
    ];
    bars = { title: 'Examination pipeline', meta: 'registration → release', rows: ex.pipeline.map(s => ({ label: s.stage, pct: Math.min(100, s.count), tone: 'warn' as Tone, tail: `${s.count}` })) };
  } else if (d === 'command') {
    const C = educationCommand(id, ts); pTone = C.posture === 'crisis' ? 'alert' : C.posture === 'engaged' ? 'warn' : 'ok';
    kpis = [
      { l: 'Posture Index', v: `${C.postureIndex}`, t: pTone }, { l: 'Command Posture', v: C.posture, t: pTone },
      { l: 'Critical Domains', v: `${C.criticalDomains}`, t: C.criticalDomains ? 'alert' : 'ok' },
      { l: 'Open Directives', v: `${C.directives.length}`, t: C.directives.some(x => x.priority === 'critical') ? 'alert' : C.directives.length ? 'warn' : 'ok' },
      { l: 'Pupil:Teacher', v: `${sn.pupilTeacherRatio}:1`, t: sn.pupilTeacherRatio >= 45 ? 'alert' : sn.pupilTeacherRatio >= 35 ? 'warn' : 'ok' },
      { l: 'Dropout Rate', v: `${sn.dropoutRatePct}%`, t: sn.dropoutRatePct >= 12 ? 'alert' : 'ok' },
    ];
    bars = { title: 'Whole-of-education domain status', meta: 'emergent from every subsystem engine', rows: C.domains.map(x => ({ label: x.domain, pct: x.tone === 'ok' ? 88 : x.tone === 'warn' ? 55 : 22, tone: x.tone, tail: x.value })) };
  } else if (d === 'higher') {
    const H = higherEducation(id, ts); pTone = H.posture === 'underfunded' ? 'alert' : H.posture === 'pressured' ? 'warn' : 'ok';
    kpis = [
      { l: 'Institutions', v: `${H.institutions}`, t: 'ok' }, { l: 'Enrolment', v: `${H.enrolmentK}k`, t: 'ok' },
      { l: 'Graduation Rate', v: `${H.graduationRatePct}%`, t: H.graduationRatePct >= 70 ? 'ok' : 'warn' },
      { l: 'Research Output', v: `${H.researchOutputIndex}`, t: H.researchOutputIndex >= 60 ? 'ok' : 'warn' },
      { l: 'Funding Gap', v: `${H.fundingGapPct}%`, t: H.fundingGapPct >= 25 ? 'alert' : H.fundingGapPct >= 14 ? 'warn' : 'ok' },
      { l: 'Posture', v: H.posture, t: pTone },
    ];
    bars = { title: 'Institution tiers', meta: 'tier · utilisation', rows: H.tiers.map(x => ({ label: x.tier, pct: Math.min(100, x.utilisationPct), tone: x.tone, tail: `${x.utilisationPct}%` })) };
  } else if (d === 'curriculum') {
    const Cu = curriculumOps(id, ts); pTone = Cu.posture === 'obsolete' ? 'alert' : Cu.posture === 'lagging' ? 'warn' : 'ok';
    kpis = [
      { l: 'Frameworks', v: `${Cu.frameworks}`, t: 'ok' }, { l: 'Revision Cycle', v: `${Cu.revisionCyclePct}%`, t: Cu.revisionCyclePct >= 80 ? 'ok' : 'warn' },
      { l: 'Textbook Coverage', v: `${Cu.textbookCoveragePct}%`, t: Cu.textbookCoveragePct >= 85 ? 'ok' : 'warn' },
      { l: 'Digital Adoption', v: `${Cu.digitalAdoptionPct}%`, t: Cu.digitalAdoptionPct >= 60 ? 'ok' : 'warn' },
      { l: 'Outdated Frameworks', v: `${Cu.outdatedFrameworks}`, t: Cu.outdatedFrameworks ? 'alert' : 'ok' }, { l: 'Posture', v: Cu.posture, t: pTone },
    ];
    bars = { title: 'Subject frameworks', meta: 'coverage · last revised', rows: Cu.subjects.map(s => ({ label: s.subject, pct: s.coveragePct, tone: s.tone, tail: `${s.lastRevisedYrs}y` })) };
  } else if (d === 'teacher') {
    const tc = teacherOps(id, ts); pTone = tc.vacanciesPct >= 15 ? 'alert' : tc.vacanciesPct >= 8 ? 'warn' : 'ok';
    kpis = [
      { l: 'Teachers', v: tc.teachers.toLocaleString(), t: 'ok' }, { l: 'Vacancies', v: `${tc.vacanciesPct}%`, t: pTone },
      { l: 'Postings Pending', v: tc.postingsPending.toLocaleString(), t: tc.postingsPending > 1500 ? 'warn' : 'ok' },
      { l: 'Payroll On-Time', v: `${tc.payrollOnTimePct}%`, t: tc.payrollOnTimePct >= 95 ? 'ok' : 'warn' },
      { l: 'Training Active', v: tc.trainingActive.toLocaleString(), t: 'ok' },
    ];
  } else if (d === 'student') {
    const ss = studentServices(id, ts); pTone = ss.portalUptime >= 99 ? 'ok' : 'warn';
    kpis = [
      { l: 'Learner Records', v: `${ss.learnerRecordsM}M`, t: 'ok' }, { l: 'Portal Uptime', v: `${ss.portalUptime}%`, t: ss.portalUptime >= 99 ? 'ok' : 'warn' },
      { l: 'Scholarships Active', v: ss.scholarshipsActive.toLocaleString(), t: 'ok' },
      { l: 'Enrolment Requests', v: ss.enrolmentRequests.toLocaleString(), t: ss.enrolmentRequests > 10000 ? 'warn' : 'ok' },
      { l: 'Satisfaction', v: `${ss.satisfactionPct}%`, t: ss.satisfactionPct >= 70 ? 'ok' : 'warn' },
    ];
  } else {
    pTone = sn.dropoutRatePct >= 12 ? 'alert' : sn.dropoutRatePct >= 7 ? 'warn' : 'ok';
    kpis = [
      { l: 'Schools', v: sn.schools.toLocaleString(), t: 'ok' }, { l: 'Enrolment', v: `${sn.enrolmentM}M`, t: 'ok' },
      { l: 'Pupil:Teacher', v: `${sn.pupilTeacherRatio}:1`, t: sn.pupilTeacherRatio >= 45 ? 'alert' : sn.pupilTeacherRatio >= 35 ? 'warn' : 'ok' },
      { l: 'Dropout Rate', v: `${sn.dropoutRatePct}%`, t: pTone },
      { l: 'Infrastructure', v: `${sn.infrastructurePct}%`, t: sn.infrastructurePct >= 80 ? 'ok' : 'warn' }, { l: 'Regions', v: `${sn.byRegion.length}`, t: 'ok' },
    ];
    bars = { title: 'Regional school capacity', meta: 'infrastructure · enrolment', rows: sn.byRegion.map(r => ({ label: r.region, pct: r.capacityPct, tone: r.tone, tail: `${r.capacityPct}%` })) };
  }

  return (
    <div className="space-y-2 rounded-[5px] p-2" style={{ background: '#03070f', boxShadow: 'inset 0 0 90px rgba(0,0,0,0.6)' }}>
      <OpsHeader index={1} title={`Education · ${label}`} subtitle="Sovereign Education Execution"
        posture={pTone === 'alert' ? 'CRITICAL' : pTone === 'warn' ? 'ENGAGED' : 'STABLE'} tone={pTone} now={now} role={role} accent={ACC} />
      <KpiStrip ts={ts} accent={ACC} items={strip(kpis)} />
      {bars ? <BarPanel title={bars.title} meta={bars.meta} accent={ACC} live rows={bars.rows} /> : null}
      <MinistryChainSection ministryKey="EDUCATION" id={id} now={now} accent={ACC} />
      <RuntimeQueue scope={`${id}:${d}`} kind={WF[d] ?? 'case'} title={`${label} runtime — execute the education workflow`} by="Education Officer" role={role} withheld={withheld} />
    </div>
  );
}
