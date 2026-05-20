'use client';

// Education domains — Command, Institutions & Cohorts surfaces.

import * as React from 'react';
import { knowledgeDevelopmentBoard } from '@/lib/gov/knowledge-development';
import { schoolNetwork, higherEducation } from '@/lib/gov/education-systems';
import { HallFrame, HallKpi, HallRule, HallBar, HallCallout, EDUCATION_DS } from '@/apps/ministry-education/design-system/education-ds';

export function LiteracyBoard({ id, now }: { id: string; now: number }) {
  const board = knowledgeDevelopmentBoard(now);
  void id;
  return (
    <HallFrame archetype="command" code="CM-LIT-02" title="Literacy Board"
      subtitle="national literacy & capability"
      posture={board.command.posture}>
      <HallKpi items={[
        { label: 'Literacy index', value: `${board.command.literacyIdx}/100`, tone: 'ok' },
        { label: 'Capability index', value: `${board.command.capabilityIdx}/100`, tone: 'info' },
        { label: 'Institutional performance', value: `${board.command.institutionalPerformance}/100`, tone: 'info' },
        { label: 'Continuity (years)', value: `${board.command.yearsEducationContinuity}y`, tone: 'ok' },
      ]} />
      <HallCallout kicker="literacy doctrine" body="Literacy is a sovereign continuity metric. Any sustained decline triggers an automatic Cabinet review and a civilian-panel briefing." />
    </HallFrame>
  );
}

export function RegionalLiteracy({ id, now }: { id: string; now: number }) {
  const board = knowledgeDevelopmentBoard(now);
  void id;
  return (
    <HallFrame archetype="command" code="CM-RGN-03" title="Regional Literacy"
      subtitle="per-region literacy & continuity risk">
      <HallKpi items={[
        { label: 'Regions', value: board.command.regions.length },
        { label: 'Fracture risk', value: board.command.regions.filter(r => r.continuityRisk === 'fracture').length, tone: 'alert' },
        { label: 'Monitor', value: board.command.regions.filter(r => r.continuityRisk === 'monitor').length, tone: 'warn' },
        { label: 'Mean literacy', value: `${Math.round(board.command.regions.reduce((s, r) => s + r.literacyPct, 0) / Math.max(1, board.command.regions.length))}%`, tone: 'ok' },
      ]} />
      <HallRule label="region register" />
      {board.command.regions.map(r => (
        <HallBar key={r.region}
          label={r.region}
          pct={r.literacyPct}
          tone={r.continuityRisk === 'fracture' ? 'alert' : r.continuityRisk === 'monitor' ? 'warn' : 'ok'}
          tail={`primary ${r.primaryNetPct}% · secondary ${r.secondaryNetPct}%`} />
      ))}
    </HallFrame>
  );
}

function institutionsByType(types: string[], code: string, title: string, subtitle: string) {
  return function InstitutionsByType({ id, now }: { id: string; now: number }) {
    const board = knowledgeDevelopmentBoard(now);
    void id;
    const filtered = board.institutions.filter(i => types.includes(i.type));
    return (
      <HallFrame archetype="institutions" code={code} title={title} subtitle={subtitle}>
        <HallKpi items={[
          { label: 'Institutions', value: filtered.length },
          { label: 'Mean facility integrity', value: `${Math.round(filtered.reduce((s, i) => s + i.facilityIntegrity, 0) / Math.max(1, filtered.length))}%`, tone: 'ok' },
          { label: 'Probation / revoked', value: filtered.filter(i => i.accreditation === 'probation' || i.accreditation === 'revoked').length, tone: 'alert' },
          { label: 'Total enrolment', value: filtered.reduce((s, i) => s + i.enrolment, 0).toLocaleString(), tone: 'info' },
        ]} />
        <HallRule label="institution register" />
        {filtered.slice(0, 12).map(i => (
          <div key={i.id} className="grid grid-cols-[200px_160px_80px_80px_120px] gap-3 border-b py-1.5 text-[11px]"
            style={{ borderColor: EDUCATION_DS.ruleSoft, fontFamily: 'ui-monospace, monospace' }}>
            <span style={{ color: EDUCATION_DS.gold }}>{i.name}</span>
            <span style={{ color: EDUCATION_DS.mut }}>{i.region}</span>
            <span className="text-right tabular-nums" style={{ color: EDUCATION_DS.parchmentInk }}>{i.enrolment.toLocaleString()}</span>
            <span className="text-right tabular-nums" style={{ color: EDUCATION_DS.mut }}>{i.facilityIntegrity}%</span>
            <span className="text-right uppercase tracking-[0.16em]"
              style={{ color: i.accreditation === 'revoked' ? EDUCATION_DS.coral : i.accreditation === 'probation' ? EDUCATION_DS.maple : i.accreditation === 'pending' ? EDUCATION_DS.cobalt : EDUCATION_DS.jade }}>● {i.accreditation}</span>
          </div>
        ))}
      </HallFrame>
    );
  };
}

export const PrimarySecondary = institutionsByType(['Primary', 'Secondary'],            'IN-PRI-05', 'Primary & Secondary',   'primary / secondary schools');
export const Tertiary          = institutionsByType(['Tertiary', 'Research University'], 'IN-TER-06', 'Tertiary & Research',  'universities & research bodies');
export const TeacherColleges   = institutionsByType(['Teacher College'],                  'IN-TCH-07', 'Teacher Colleges',     'teacher-training institutions');

export function GenerationalCohorts({ id, now }: { id: string; now: number }) {
  const board = knowledgeDevelopmentBoard(now);
  void id;
  return (
    <HallFrame archetype="cohorts" code="CO-GEN-08" title="Generational Cohorts"
      subtitle="per-cohort capability readiness">
      <HallKpi items={[
        { label: 'Cohorts tracked', value: board.cohorts.length },
        { label: 'Total population (M)', value: board.cohorts.reduce((s, c) => s + c.populationM, 0).toFixed(1), tone: 'info' },
        { label: 'Mean workforce readiness', value: `${Math.round(board.cohorts.reduce((s, c) => s + c.workforceReadinessPct, 0) / Math.max(1, board.cohorts.length))}%`, tone: 'ok' },
        { label: 'High-inequality cohorts (>60)', value: board.cohorts.filter(c => c.inequalityIdx > 60).length, tone: 'alert' },
      ]} />
      <HallRule label="cohort register" />
      {board.cohorts.map(c => (
        <HallBar key={c.generation}
          label={c.generation}
          pct={c.capabilityReadiness}
          tone={c.capabilityReadiness > 75 ? 'ok' : c.capabilityReadiness > 55 ? 'warn' : 'alert'}
          tail={`${c.populationM.toFixed(1)}M · inequality ${c.inequalityIdx}`} />
      ))}
    </HallFrame>
  );
}

export function WorkforceReadiness({ id, now }: { id: string; now: number }) {
  const board = knowledgeDevelopmentBoard(now);
  const he = higherEducation(id, now / 4000);
  return (
    <HallFrame archetype="cohorts" code="CO-WRK-09" title="Workforce Readiness"
      subtitle="tertiary-to-workforce pathway">
      <HallKpi items={[
        { label: 'Graduation rate', value: `${he.graduationRatePct}%`, tone: 'ok' },
        { label: 'Research output index', value: `${he.researchOutputIndex}/100`, tone: 'info' },
        { label: 'Funding gap', value: `${he.fundingGapPct}%`, tone: he.fundingGapPct > 25 ? 'alert' : 'warn' },
        { label: 'HE posture', value: he.posture, tone: he.posture === 'underfunded' ? 'alert' : he.posture === 'pressured' ? 'warn' : 'ok' },
      ]} />
      <HallCallout kicker="pipeline doctrine" body="Workforce readiness is a coordinated metric across Education, Labour and Trade. Discriminatory pathways into the workforce are constitutionally void." />
      {void board}
    </HallFrame>
  );
}

export function CohortEquality({ id, now }: { id: string; now: number }) {
  const board = knowledgeDevelopmentBoard(now);
  void id;
  return (
    <HallFrame archetype="cohorts" code="CO-EQL-10" title="Cohort Equality"
      subtitle="per-cohort inequality index">
      <HallKpi items={[
        { label: 'Cohorts tracked', value: board.cohorts.length },
        { label: 'High-inequality (>60)', value: board.cohorts.filter(c => c.inequalityIdx > 60).length, tone: 'alert' },
        { label: 'Moderate (30-60)', value: board.cohorts.filter(c => c.inequalityIdx >= 30 && c.inequalityIdx <= 60).length, tone: 'warn' },
        { label: 'Equitable (<30)', value: board.cohorts.filter(c => c.inequalityIdx < 30).length, tone: 'ok' },
      ]} />
      <HallRule label="inequality register" />
      {board.cohorts.map(c => (
        <HallBar key={c.generation}
          label={c.generation}
          pct={c.inequalityIdx}
          tone={c.inequalityIdx > 60 ? 'alert' : c.inequalityIdx > 30 ? 'warn' : 'ok'}
          tail={`literacy continuity ${c.literacyContinuity}`} />
      ))}
    </HallFrame>
  );
}
