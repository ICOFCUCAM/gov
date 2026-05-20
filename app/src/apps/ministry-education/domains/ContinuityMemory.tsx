'use client';

// Education domains — Continuity, Civilizational Memory, Portal & Oversight surfaces.

import * as React from 'react';
import { knowledgeDevelopmentBoard } from '@/lib/gov/knowledge-development';
import { KNOWLEDGE_SAFEGUARDS } from '@/lib/gov/knowledge-continuity';
import { studentServices } from '@/lib/gov/education-systems';
import { HallFrame, HallKpi, HallRule, HallBar, HallCallout, EDUCATION_DS } from '@/apps/ministry-education/design-system/education-ds';
import { seed, wave } from '@/lib/telemetry';

export function EducationIncidents({ id, now }: { id: string; now: number }) {
  const board = knowledgeDevelopmentBoard(now);
  void id;
  return (
    <HallFrame archetype="continuity" code="CN-INC-23" title="Education Incidents"
      subtitle="live incident ledger">
      <HallKpi items={[
        { label: 'Active incidents', value: board.incidents.length },
        { label: 'National severity', value: board.incidents.filter(i => i.severity === 'national').length, tone: 'alert' },
        { label: 'Critical severity', value: board.incidents.filter(i => i.severity === 'critical').length, tone: 'alert' },
        { label: 'Learners affected', value: board.incidents.reduce((s, i) => s + i.affectedLearners, 0).toLocaleString(), tone: 'warn' },
      ]} />
      <HallRule label="incident ledger" />
      {board.incidents.map(i => (
        <div key={i.id} className="grid grid-cols-[110px_180px_140px_120px_120px] gap-3 border-b py-1.5 text-[11px]"
          style={{ borderColor: EDUCATION_DS.ruleSoft, fontFamily: 'ui-monospace, monospace' }}>
          <span style={{ color: EDUCATION_DS.gold }}>{i.id}</span>
          <span style={{ color: EDUCATION_DS.parchmentInk }}>{i.kind}</span>
          <span style={{ color: EDUCATION_DS.mut }}>{i.region}</span>
          <span className="text-right tabular-nums" style={{ color: EDUCATION_DS.mut }}>{i.affectedLearners.toLocaleString()}</span>
          <span className="text-right uppercase tracking-[0.16em]"
            style={{ color: i.severity === 'national' || i.severity === 'critical' ? EDUCATION_DS.coral : i.severity === 'elevated' ? EDUCATION_DS.maple : EDUCATION_DS.jade }}>● {i.recoveryPathway}</span>
        </div>
      ))}
    </HallFrame>
  );
}

export function SchoolDisruption({ id, now }: { id: string; now: number }) {
  const board = knowledgeDevelopmentBoard(now);
  void id;
  const disrupt = board.incidents.filter(i => i.kind === 'school-disruption' || i.kind === 'natural-disaster-school' || i.kind === 'conflict-disruption');
  return (
    <HallFrame archetype="continuity" code="CN-SCH-24" title="School Disruption"
      subtitle="active school disruption">
      <HallKpi items={[
        { label: 'Active disruptions', value: disrupt.length, tone: disrupt.length > 0 ? 'warn' : 'ok' },
        { label: 'National severity', value: disrupt.filter(i => i.severity === 'national').length, tone: 'alert' },
        { label: 'Learners affected', value: disrupt.reduce((s, i) => s + i.affectedLearners, 0).toLocaleString(), tone: 'warn' },
        { label: 'Mean age (d)', value: disrupt.length === 0 ? '—' : Math.round(disrupt.reduce((s, i) => s + i.ageDays, 0) / disrupt.length), tone: 'info' },
      ]} />
      <HallRule label="disruption ledger" />
      {disrupt.length === 0 ? (
        <p className="text-[10.5px] italic" style={{ color: EDUCATION_DS.mut }}>No active school disruption. National posture: nominal.</p>
      ) : disrupt.map(i => (
        <HallBar key={i.id}
          label={`${i.kind} · ${i.region}`}
          pct={Math.min(100, i.affectedLearners / 1000)}
          tone={i.severity === 'national' || i.severity === 'critical' ? 'alert' : i.severity === 'elevated' ? 'warn' : 'ok'}
          tail={`${i.recoveryPathway}`} />
      ))}
    </HallFrame>
  );
}

export function ExamIntegrity({ id, now }: { id: string; now: number }) {
  const board = knowledgeDevelopmentBoard(now);
  const ts = now / 4000;
  void id; void ts;
  const breaches = board.incidents.filter(i => i.kind === 'exam-integrity-breach');
  return (
    <HallFrame archetype="continuity" code="CN-EXM-25" title="Exam Integrity"
      subtitle="examination integrity board">
      <HallKpi items={[
        { label: 'Integrity breaches', value: breaches.length, tone: breaches.length > 0 ? 'alert' : 'ok' },
        { label: 'Learners affected', value: breaches.reduce((s, i) => s + i.affectedLearners, 0).toLocaleString(), tone: 'warn' },
        { label: 'Examinations sealed', value: '99.7%', tone: 'ok' },
        { label: 'Mean response (d)', value: breaches.length === 0 ? '—' : Math.round(breaches.reduce((s, i) => s + i.ageDays, 0) / breaches.length), tone: 'warn' },
      ]} />
      <HallCallout kicker="integrity doctrine" body="Examination integrity is a non-negotiable continuity contract. Breach triggers immediate investigation, optional civilian-panel tribunal and audit closure." />
    </HallFrame>
  );
}

export function CivilizationalMemoryBoard({ id, now }: { id: string; now: number }) {
  const board = knowledgeDevelopmentBoard(now);
  void id;
  return (
    <HallFrame archetype="memory" code="CM-MEM-26" title="Civilizational Memory"
      subtitle="multi-category preservation board">
      <HallKpi items={[
        { label: 'Categories', value: board.civilizationalMemory.length },
        { label: 'Mean preservation', value: `${Math.round(board.civilizationalMemory.reduce((s, c) => s + c.preservationPct, 0) / Math.max(1, board.civilizationalMemory.length))}%`, tone: 'ok' },
        { label: 'Mean access', value: `${Math.round(board.civilizationalMemory.reduce((s, c) => s + c.publicAccessIdx, 0) / Math.max(1, board.civilizationalMemory.length))}/100`, tone: 'info' },
        { label: 'Mean transfer', value: `${Math.round(board.civilizationalMemory.reduce((s, c) => s + c.generationalTransferIdx, 0) / Math.max(1, board.civilizationalMemory.length))}/100`, tone: 'ok' },
      ]} />
      <HallRule label="memory categories" />
      {board.civilizationalMemory.map(c => (
        <HallBar key={c.category}
          label={c.category}
          pct={c.preservationPct}
          tone={c.preservationPct > 85 ? 'ok' : c.preservationPct > 65 ? 'warn' : 'alert'}
          tail={`digitised ${c.digitisationPct}%`} />
      ))}
    </HallFrame>
  );
}

export function HistoricalArchives({ id, now }: { id: string; now: number }) {
  const board = knowledgeDevelopmentBoard(now);
  void id;
  const hist = board.civilizationalMemory.find(c => c.category === 'Historical archives');
  return (
    <HallFrame archetype="memory" code="CM-HIS-27" title="Historical Archives"
      subtitle="historical archive preservation">
      <HallKpi items={[
        { label: 'Preservation', value: `${hist?.preservationPct ?? 0}%`, tone: 'ok' },
        { label: 'Public access', value: `${hist?.publicAccessIdx ?? 0}/100`, tone: 'info' },
        { label: 'Generational transfer', value: `${hist?.generationalTransferIdx ?? 0}/100`, tone: 'ok' },
        { label: 'Digitisation', value: `${hist?.digitisationPct ?? 0}%`, tone: 'info' },
      ]} />
      <HallCallout kicker="historical fidelity" body="Historical archives are intergenerational property. Politically motivated redaction is constitutionally void." />
    </HallFrame>
  );
}

export function ConstitutionalLiteracy({ id, now }: { id: string; now: number }) {
  const board = knowledgeDevelopmentBoard(now);
  void id;
  const con = board.civilizationalMemory.find(c => c.category === 'Constitutional literacy');
  return (
    <HallFrame archetype="memory" code="CM-CON-28" title="Constitutional Literacy"
      subtitle="constitutional literacy index">
      <HallKpi items={[
        { label: 'Preservation', value: `${con?.preservationPct ?? 0}%`, tone: 'ok' },
        { label: 'Public access', value: `${con?.publicAccessIdx ?? 0}/100`, tone: 'info' },
        { label: 'Generational transfer', value: `${con?.generationalTransferIdx ?? 0}/100`, tone: 'ok' },
        { label: 'Digitisation', value: `${con?.digitisationPct ?? 0}%`, tone: 'info' },
      ]} />
      <HallCallout kicker="constitutional doctrine" body="Constitutional literacy is taught at every level. Every citizen has a right to understand the constitution that governs them." />
    </HallFrame>
  );
}

export function CivicEducation({ id, now }: { id: string; now: number }) {
  const board = knowledgeDevelopmentBoard(now);
  void id;
  const civ = board.civilizationalMemory.find(c => c.category === 'Civic education');
  const inter = board.civilizationalMemory.find(c => c.category === 'Intergenerational records');
  return (
    <HallFrame archetype="memory" code="CM-CIV-29" title="Civic Education"
      subtitle="civic education & intergenerational records">
      <HallKpi items={[
        { label: 'Civic preservation', value: `${civ?.preservationPct ?? 0}%`, tone: 'ok' },
        { label: 'Civic public access', value: `${civ?.publicAccessIdx ?? 0}/100`, tone: 'info' },
        { label: 'Intergenerational records', value: `${inter?.preservationPct ?? 0}%`, tone: 'ok' },
        { label: 'Intergenerational transfer', value: `${inter?.generationalTransferIdx ?? 0}/100`, tone: 'ok' },
      ]} />
    </HallFrame>
  );
}

export function StudentApplications({ id, now }: { id: string; now: number }) {
  const o = studentServices(id, now / 4000);
  return (
    <HallFrame archetype="portal" code="PR-APP-30" title="Student Applications"
      subtitle="application docket">
      <HallKpi items={[
        { label: 'Active applications', value: o.enrolmentRequests.toLocaleString(), tone: 'info' },
        { label: 'Scholarships active', value: o.scholarshipsActive.toLocaleString(), tone: 'ok' },
        { label: 'Portal uptime', value: `${o.portalUptime}%`, tone: 'ok' },
        { label: 'Satisfaction', value: `${o.satisfactionPct}%`, tone: 'info' },
      ]} />
    </HallFrame>
  );
}

export function ScholarshipPortal({ id, now }: { id: string; now: number }) {
  const o = studentServices(id, now / 4000);
  const ts = now / 4000;
  void id; void ts;
  return (
    <HallFrame archetype="portal" code="PR-SCH-31" title="Scholarship Portal"
      subtitle="scholarship & grant flow">
      <HallKpi items={[
        { label: 'Scholarships active', value: o.scholarshipsActive.toLocaleString(), tone: 'ok' },
        { label: 'Annual grant (Bn)', value: (wave(`sch:g:0`, ts, 0.4, 6.4)).toFixed(1), tone: 'info' },
        { label: 'Mean processing (d)', value: Math.round(wave(`sch:p:0`, ts, 8, 48)), tone: 'warn' },
        { label: 'Equitable allocation idx', value: `${Math.round(wave(`sch:e:0`, ts, 78, 96))}/100`, tone: 'ok' },
      ]} />
      <HallCallout kicker="merit-with-equity" body="Scholarships are awarded on merit with equitable allocation. Discriminatory allocation is constitutionally void." />
    </HallFrame>
  );
}

export function PublicAdvisories({ id, now }: { id: string; now: number }) {
  const ts = now / 4000;
  void id;
  return (
    <HallFrame archetype="portal" code="PR-ADV-32" title="Public Advisories"
      subtitle="public advisory feed">
      <HallKpi items={[
        { label: 'Active advisories', value: Math.round(wave(`adv:a:0`, ts, 4, 24)), tone: 'info' },
        { label: 'Curriculum-update notices', value: Math.round(wave(`adv:c:0`, ts, 1, 8)) },
        { label: 'Reach (M)', value: (wave(`adv:r:0`, ts, 4, 24)).toFixed(1), tone: 'info' },
        { label: 'Acknowledged', value: `${Math.round(wave(`adv:k:0`, ts, 82, 99))}%`, tone: 'ok' },
      ]} />
    </HallFrame>
  );
}

export function KnowledgeSafeguards({ id, now }: { id: string; now: number }) {
  void id; void now;
  return (
    <HallFrame archetype="oversight" code="OV-SFG-33" title="Knowledge Safeguards"
      subtitle="KNOWLEDGE_SAFEGUARDS contract · §14.10">
      <HallKpi items={[
        { label: 'Scope', value: KNOWLEDGE_SAFEGUARDS.scope, tone: 'info' },
        { label: 'Per-citizen data', value: KNOWLEDGE_SAFEGUARDS.perCitizenData ? 'enabled' : 'forbidden', tone: 'ok' },
        { label: 'Politically neutral', value: KNOWLEDGE_SAFEGUARDS.politicallyNeutral ? '✓' : '✗', tone: 'ok' },
        { label: 'Pluralistic', value: KNOWLEDGE_SAFEGUARDS.pluralistic ? '✓' : '✗', tone: 'ok' },
      ]} />
      <HallRule label="prohibited postures" />
      <ul className="grid grid-cols-1 gap-1 md:grid-cols-2 text-[11px]"
        style={{ color: EDUCATION_DS.parchmentInk, fontFamily: 'ui-monospace, monospace' }}>
        {KNOWLEDGE_SAFEGUARDS.prohibited.map(p => (
          <li key={p} className="border-l-2 pl-2" style={{ borderColor: EDUCATION_DS.coral }}>
            <span style={{ color: EDUCATION_DS.coral }}>✕</span> {p}
          </li>
        ))}
      </ul>
      <HallCallout kicker="binding contract" body="Every Education surface attests against this contract. Cognitive profiling, ideological classification and educational-conformity scoring are constitutionally void." />
    </HallFrame>
  );
}

export function PluralismAudit({ id, now }: { id: string; now: number }) {
  void id; void now;
  return (
    <HallFrame archetype="oversight" code="OV-PLR-34" title="Pluralism Audit"
      subtitle="pluralism & non-conformity audit">
      <HallKpi items={[
        { label: 'Conformity-scoring incidents', value: 0, tone: 'ok' },
        { label: 'Ideological-classification incidents', value: 0, tone: 'ok' },
        { label: 'Curriculum dissent permitted', value: '✓', tone: 'ok' },
        { label: 'Pluralism index', value: '97/100', tone: 'ok' },
      ]} />
      <HallCallout kicker="pluralism doctrine" body="The education system protects multiple traditions, methods and perspectives. Compulsory uniformity of thought is constitutionally void." />
    </HallFrame>
  );
}

void seed;
