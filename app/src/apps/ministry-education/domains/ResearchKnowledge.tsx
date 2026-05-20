'use client';

// Education domains — Research, Knowledge Infra & Curriculum surfaces.

import * as React from 'react';
import { knowledgeDevelopmentBoard } from '@/lib/gov/knowledge-development';
import { curriculumOps, examOps, teacherOps, studentServices, schoolNetwork } from '@/lib/gov/education-systems';
import { HallFrame, HallKpi, HallRule, HallBar, HallCallout, EDUCATION_DS } from '@/apps/ministry-education/design-system/education-ds';

export function ResearchProgrammes({ id, now }: { id: string; now: number }) {
  const board = knowledgeDevelopmentBoard(now);
  void id;
  return (
    <HallFrame archetype="research" code="RS-PRG-12" title="Research Programmes"
      subtitle="per-programme funding & capability">
      <HallKpi items={[
        { label: 'Programmes', value: board.research.length },
        { label: 'Core priority', value: board.research.filter(r => r.strategicPriority === 'core').length, tone: 'info' },
        { label: 'Sunset', value: board.research.filter(r => r.strategicPriority === 'sunset').length, tone: 'warn' },
        { label: 'Total funding (Bn)', value: board.research.reduce((s, r) => s + r.fundingBn, 0).toFixed(1) },
      ]} />
      <HallRule label="programme register" />
      {board.research.map(r => (
        <div key={r.id} className="grid grid-cols-[160px_100px_80px_100px_100px] gap-3 border-b py-1.5 text-[11px]"
          style={{ borderColor: EDUCATION_DS.ruleSoft, fontFamily: 'ui-monospace, monospace' }}>
          <span style={{ color: EDUCATION_DS.gold }}>{r.sector}</span>
          <span className="text-right tabular-nums" style={{ color: EDUCATION_DS.parchmentInk }}>{r.fundingBn.toFixed(1)} Bn</span>
          <span className="text-right tabular-nums" style={{ color: EDUCATION_DS.mut }}>{r.fundingLineageYears}y</span>
          <span className="text-right tabular-nums" style={{ color: EDUCATION_DS.cobalt }}>idx {r.capabilityIdx}</span>
          <span className="text-right uppercase tracking-[0.16em]"
            style={{ color: r.strategicPriority === 'sunset' ? EDUCATION_DS.maple : r.strategicPriority === 'advisory' ? EDUCATION_DS.cobalt : EDUCATION_DS.jade }}>● {r.strategicPriority}</span>
        </div>
      ))}
    </HallFrame>
  );
}

export function StrategicResearchPriority({ id, now }: { id: string; now: number }) {
  const board = knowledgeDevelopmentBoard(now);
  void id;
  const priorities = ['core', 'advisory', 'sunset'] as const;
  return (
    <HallFrame archetype="research" code="RS-PRI-13" title="Strategic Research Priority"
      subtitle="core / advisory / sunset allocation">
      <HallKpi items={[
        { label: 'Core programmes', value: board.research.filter(r => r.strategicPriority === 'core').length, tone: 'info' },
        { label: 'Advisory programmes', value: board.research.filter(r => r.strategicPriority === 'advisory').length },
        { label: 'Sunset programmes', value: board.research.filter(r => r.strategicPriority === 'sunset').length, tone: 'warn' },
        { label: 'Mean capability idx', value: Math.round(board.research.reduce((s, r) => s + r.capabilityIdx, 0) / Math.max(1, board.research.length)), tone: 'info' },
      ]} />
      <HallRule label="priority distribution" />
      {priorities.map(p => {
        const items = board.research.filter(r => r.strategicPriority === p);
        const funding = items.reduce((s, r) => s + r.fundingBn, 0);
        return (
          <HallBar key={p}
            label={p}
            pct={Math.min(100, items.length * 12)}
            tone={p === 'sunset' ? 'warn' : p === 'advisory' ? 'info' : 'ok'}
            tail={`${items.length} programmes · ${funding.toFixed(1)} Bn`} />
        );
      })}
    </HallFrame>
  );
}

export function RemoteLearning({ id, now }: { id: string; now: number }) {
  const board = knowledgeDevelopmentBoard(now);
  void id;
  return (
    <HallFrame archetype="knowledge" code="KN-RML-15" title="Remote Learning"
      subtitle="remote-learning coverage">
      <HallKpi items={[
        { label: 'Remote-learning coverage', value: `${board.knowledgeInfra.remoteLearningCoveragePct}%`, tone: 'ok' },
        { label: 'Digital content idx', value: `${board.knowledgeInfra.digitalContentDistributionIdx}/100`, tone: 'info' },
        { label: 'Bandwidth equity', value: `${board.knowledgeInfra.bandwidthEquityIdx}/100`, tone: 'info' },
        { label: 'Curation continuity', value: `${board.knowledgeInfra.curationContinuity}/100`, tone: 'ok' },
      ]} />
      <HallCallout kicker="digital-equity doctrine" body="Remote learning must reach rural and low-bandwidth regions. Discriminatory access is constitutionally void." />
    </HallFrame>
  );
}

export function ArchivalRecords({ id, now }: { id: string; now: number }) {
  const board = knowledgeDevelopmentBoard(now);
  void id;
  return (
    <HallFrame archetype="knowledge" code="KN-ARC-16" title="Archival Records"
      subtitle="national archival records">
      <HallKpi items={[
        { label: 'Archival records (M)', value: board.knowledgeInfra.archivalRecordsM.toFixed(1), tone: 'info' },
        { label: 'Archive integrity', value: `${board.knowledgeInfra.archiveIntegrity}/100`, tone: 'ok' },
        { label: 'Curation continuity', value: `${board.knowledgeInfra.curationContinuity}/100`, tone: 'ok' },
        { label: 'Digital content idx', value: `${board.knowledgeInfra.digitalContentDistributionIdx}/100`, tone: 'info' },
      ]} />
      <HallCallout kicker="memory doctrine" body="National archives are intergenerational property. Tampering, deletion or politicised redaction is constitutionally void." />
    </HallFrame>
  );
}

export function BandwidthEquity({ id, now }: { id: string; now: number }) {
  const board = knowledgeDevelopmentBoard(now);
  void id;
  return (
    <HallFrame archetype="knowledge" code="KN-BND-17" title="Bandwidth Equity"
      subtitle="per-region bandwidth equity">
      <HallKpi items={[
        { label: 'Bandwidth equity', value: `${board.knowledgeInfra.bandwidthEquityIdx}/100`, tone: 'info' },
        { label: 'Remote-learning coverage', value: `${board.knowledgeInfra.remoteLearningCoveragePct}%`, tone: 'ok' },
        { label: 'Digital content idx', value: `${board.knowledgeInfra.digitalContentDistributionIdx}/100`, tone: 'info' },
        { label: 'Archive integrity', value: `${board.knowledgeInfra.archiveIntegrity}/100`, tone: 'ok' },
      ]} />
      <HallCallout kicker="bandwidth pact" body="Bandwidth equity is co-managed with Communications. Rural-broadband targets are quarterly-reviewable; failures trigger a Cabinet brief." />
    </HallFrame>
  );
}

export function CurriculumBoard({ id, now }: { id: string; now: number }) {
  const o = curriculumOps(id, now / 4000);
  return (
    <HallFrame archetype="curriculum" code="CR-BRD-18" title="Curriculum Board"
      subtitle="frameworks, revision & adoption">
      <HallKpi items={[
        { label: 'Frameworks', value: o.frameworks },
        { label: 'Revision cycle', value: `${o.revisionCyclePct}%`, tone: 'ok' },
        { label: 'Textbook coverage', value: `${o.textbookCoveragePct}%`, tone: 'info' },
        { label: 'Posture', value: o.posture, tone: o.posture === 'obsolete' ? 'alert' : o.posture === 'lagging' ? 'warn' : 'ok' },
      ]} />
      <HallRule label="subjects" />
      {o.subjects.map(s => (
        <HallBar key={s.subject}
          label={s.subject}
          pct={s.coveragePct}
          tone={s.tone === 'alert' ? 'alert' : s.tone === 'warn' ? 'warn' : 'ok'}
          tail={`${s.lastRevisedYrs}y since revision`} />
      ))}
    </HallFrame>
  );
}

export function ExaminationBoard({ id, now }: { id: string; now: number }) {
  const o = examOps(id, now / 4000);
  return (
    <HallFrame archetype="curriculum" code="CR-EXM-19" title="Examination Board"
      subtitle="examination cycle">
      <HallKpi items={[
        { label: 'Centres', value: o.centres },
        { label: 'Candidates', value: o.candidates.toLocaleString(), tone: 'info' },
        { label: 'Results pending', value: o.resultsPending.toLocaleString(), tone: 'warn' },
        { label: 'Integrity flags', value: o.integrityFlags, tone: o.integrityFlags > 10 ? 'alert' : 'warn' },
      ]} />
      <HallRule label="pipeline" />
      {o.pipeline.map(p => (
        <HallBar key={p.stage}
          label={p.stage}
          pct={Math.min(100, p.count)}
          tone={p.stage === 'Marking' || p.stage === 'Moderation' ? 'warn' : 'info'}
          tail={`${p.count}`} />
      ))}
    </HallFrame>
  );
}

export function TeacherWorkforce({ id, now }: { id: string; now: number }) {
  const o = teacherOps(id, now / 4000);
  return (
    <HallFrame archetype="curriculum" code="CR-TCH-20" title="Teacher Workforce"
      subtitle="teacher capacity, vacancies & payroll">
      <HallKpi items={[
        { label: 'Teachers', value: o.teachers.toLocaleString(), tone: 'info' },
        { label: 'Vacancies', value: `${o.vacanciesPct}%`, tone: o.vacanciesPct > 12 ? 'alert' : 'warn' },
        { label: 'Postings pending', value: o.postingsPending.toLocaleString(), tone: 'warn' },
        { label: 'Payroll on-time', value: `${o.payrollOnTimePct}%`, tone: 'ok' },
      ]} />
      <HallCallout kicker="teacher dignity" body="Teacher payroll is a sovereign-priority obligation. Delays in disbursement are reviewable; chronic delays trigger civilian-panel review." />
    </HallFrame>
  );
}

export function StudentServicesBoard({ id, now }: { id: string; now: number }) {
  const o = studentServices(id, now / 4000);
  const sch = schoolNetwork(id, now / 4000);
  return (
    <HallFrame archetype="curriculum" code="CR-STD-21" title="Student Services"
      subtitle="per-region student-services posture">
      <HallKpi items={[
        { label: 'Portal uptime', value: `${o.portalUptime}%`, tone: 'ok' },
        { label: 'Learner records (M)', value: o.learnerRecordsM.toFixed(1), tone: 'info' },
        { label: 'Scholarships active', value: o.scholarshipsActive.toLocaleString(), tone: 'ok' },
        { label: 'Satisfaction', value: `${o.satisfactionPct}%`, tone: 'info' },
      ]} />
      <HallRule label="regional schools" />
      {sch.byRegion.map(r => (
        <HallBar key={r.region}
          label={r.region}
          pct={r.capacityPct}
          tone={r.tone === 'alert' ? 'alert' : r.tone === 'warn' ? 'warn' : 'ok'}
          tail={`${r.schools.toLocaleString()} schools`} />
      ))}
    </HallFrame>
  );
}
