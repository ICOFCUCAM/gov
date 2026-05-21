'use client';

// Judicial branch — Cases, Justices, Reasoning, Conduct.

import * as React from 'react';
import { judicialBranchBoard } from '@/lib/gov/judicial-branch-engine';
import { CourtFrame, CourtKpi, CourtRule, CourtBar, CourtCallout, JUDICIAL_DS } from '@/apps/judicial-branch/design-system/judicial-ds';
import { seed, wave } from '@/lib/telemetry';

export function CaseDocket({ id, now }: { id: string; now: number }) {
  const board = judicialBranchBoard(now);
  void id;
  return (
    <CourtFrame archetype="case" code="CS-DKT-09" title="Case Docket"
      subtitle="active case docket">
      <CourtKpi items={[
        { label: 'Cases', value: board.cases.length },
        { label: 'Ruling published', value: board.cases.filter(c => c.stage === 'ruling-published').length, tone: 'ok' },
        { label: 'In deliberation', value: board.cases.filter(c => c.stage === 'deliberation').length, tone: 'info' },
        { label: 'Public hearings', value: board.cases.filter(c => c.publicHearing).length, tone: 'ok' },
      ]} />
      <CourtRule label="case register" />
      {board.cases.map(c => (
        <div key={c.id} className="grid grid-cols-[110px_140px_140px_80px_80px] gap-3 border-b py-1.5 text-[11px]"
          style={{ borderColor: JUDICIAL_DS.ruleSoft, fontFamily: 'ui-monospace, monospace' }}>
          <span style={{ color: JUDICIAL_DS.gold }}>{c.id}</span>
          <span style={{ color: JUDICIAL_DS.parchmentInk }}>{c.kind}</span>
          <span className="uppercase tracking-[0.16em]"
            style={{ color: c.stage === 'ruling-published' ? JUDICIAL_DS.jade : c.stage === 'deliberation' ? JUDICIAL_DS.violet : JUDICIAL_DS.gold }}>● {c.stage}</span>
          <span className="text-right tabular-nums" style={{ color: JUDICIAL_DS.mut }}>{c.daysOpen}d</span>
          <span className="text-right" style={{ color: c.publicHearing ? JUDICIAL_DS.jade : JUDICIAL_DS.mut }}>{c.publicHearing ? 'public' : 'closed'}</span>
        </div>
      ))}
    </CourtFrame>
  );
}

function caseSurface(kind: 'constitutional' | 'criminal-appeal' | 'civil-appeal' | 'commercial', code: string, title: string, subtitle: string) {
  return function CaseSurface({ id, now }: { id: string; now: number }) {
    const board = judicialBranchBoard(now);
    void id;
    const matching = board.cases.filter(c => c.kind === kind);
    return (
      <CourtFrame archetype="case" code={code} title={title} subtitle={subtitle}>
        <CourtKpi items={[
          { label: 'Cases', value: matching.length, tone: 'info' },
          { label: 'Ruling published', value: matching.filter(c => c.stage === 'ruling-published').length, tone: 'ok' },
          { label: 'Public hearings', value: matching.filter(c => c.publicHearing).length, tone: 'ok' },
          { label: 'Median age', value: matching.length === 0 ? '—' : `${Math.round(matching.reduce((s, c) => s + c.daysOpen, 0) / matching.length)}d` },
        ]} />
        <CourtRule label="docket" />
        {matching.length === 0 ? (
          <p className="text-[10.5px] italic" style={{ color: JUDICIAL_DS.mut }}>No active cases of this kind.</p>
        ) : matching.map(c => (
          <CourtBar key={c.id} label={c.id} pct={Math.min(100, c.daysOpen / 4)}
            tone={c.stage === 'ruling-published' ? 'ok' : c.stage === 'deliberation' ? 'info' : 'warn'}
            tail={`${c.stage} · ${c.daysOpen}d`} />
        ))}
      </CourtFrame>
    );
  };
}

export const ConstitutionalCases = caseSurface('constitutional',  'CS-CON-10', 'Constitutional Cases', 'constitutional matters');
export const CriminalAppeals     = caseSurface('criminal-appeal', 'CS-CRA-11', 'Criminal Appeals',     'criminal appeals');
export const CivilAppeals        = caseSurface('civil-appeal',    'CS-CIV-12', 'Civil Appeals',        'civil appeals');
export const CommercialCases     = caseSurface('commercial',      'CS-COM-13', 'Commercial Cases',     'commercial docket');

export function JusticesRegister({ id, now }: { id: string; now: number }) {
  const board = judicialBranchBoard(now);
  void id;
  return (
    <CourtFrame archetype="justice" code="JS-REG-14" title="Justices Register"
      subtitle="per-justice dossier">
      <CourtKpi items={[
        { label: 'Justices', value: board.justices.length },
        { label: 'Constitutional Court', value: board.justices.filter(j => j.court === 'Constitutional').length, tone: 'info' },
        { label: 'Supreme Court', value: board.justices.filter(j => j.court === 'Supreme').length, tone: 'info' },
        { label: 'Mean term remaining', value: `${Math.round(board.justices.reduce((s, j) => s + j.termRemainingYears, 0) / board.justices.length)} y` },
      ]} />
      <CourtRule label="register" />
      {board.justices.map(j => (
        <div key={j.id} className="grid grid-cols-[80px_180px_140px_120px_80px] gap-3 border-b py-1.5 text-[11px]"
          style={{ borderColor: JUDICIAL_DS.ruleSoft, fontFamily: 'ui-monospace, monospace' }}>
          <span style={{ color: JUDICIAL_DS.gold }}>{j.id}</span>
          <span style={{ color: JUDICIAL_DS.parchmentInk }}>{j.name}</span>
          <span style={{ color: JUDICIAL_DS.mut }}>{j.court}</span>
          <span style={{ color: JUDICIAL_DS.mut }}>{j.appointedBy}</span>
          <span className="text-right tabular-nums" style={{ color: j.termRemainingYears < 4 ? JUDICIAL_DS.coral : JUDICIAL_DS.mut }}>{j.termRemainingYears}y</span>
        </div>
      ))}
    </CourtFrame>
  );
}

export function AppointmentsPipeline({ id, now }: { id: string; now: number }) {
  const ts = now / 4000;
  void id;
  return (
    <CourtFrame archetype="justice" code="JS-APP-15" title="Appointments Pipeline"
      subtitle="appointment & confirmation queue">
      <CourtKpi items={[
        { label: 'Vacancies', value: Math.round(wave(`ap:v:0`, ts, 0, 4)), tone: 'warn' },
        { label: 'Nominations', value: Math.round(wave(`ap:n:0`, ts, 0, 8)), tone: 'info' },
        { label: 'Senate confirmations', value: 'Two-thirds required', tone: 'info' },
        { label: 'Median confirmation (d)', value: '120', tone: 'info' },
      ]} />
      <CourtCallout kicker="appointment doctrine" body="Constitutional Court justices require Senate two-thirds confirmation. Independent panel reviews qualifications and ethics before nomination." />
    </CourtFrame>
  );
}

export function TenureBoard({ id, now }: { id: string; now: number }) {
  const board = judicialBranchBoard(now);
  void id;
  return (
    <CourtFrame archetype="justice" code="JS-TEN-16" title="Tenure Board"
      subtitle="term remaining & rotation">
      <CourtKpi items={[
        { label: 'Justices', value: board.justices.length },
        { label: 'Term-end this year', value: board.justices.filter(j => j.termRemainingYears < 4).length, tone: 'info' },
        { label: 'Mean tenure remaining', value: `${Math.round(board.justices.reduce((s, j) => s + j.termRemainingYears, 0) / board.justices.length)}y` },
        { label: 'Lifetime tenure', value: 'Subject to misconduct review', tone: 'mute' },
      ]} />
      <CourtRule label="tenure remaining" />
      {board.justices.map(j => (
        <CourtBar key={j.id} label={j.name}
          pct={Math.min(100, j.termRemainingYears * 4)}
          tone={j.termRemainingYears < 4 ? 'warn' : 'ok'}
          tail={`${j.termRemainingYears} y · ${j.court}`} />
      ))}
    </CourtFrame>
  );
}

export function OpenReasoning({ id, now }: { id: string; now: number }) {
  const ts = now / 4000;
  void id;
  return (
    <CourtFrame archetype="reasoning" code="RS-OPN-17" title="Open Reasoning"
      subtitle="decisions published with full reasoning">
      <CourtKpi items={[
        { label: 'Decisions published YTD', value: Math.round(wave(`or:d:0`, ts, 240, 1200)), tone: 'info' },
        { label: 'Median pages', value: Math.round(wave(`or:p:0`, ts, 28, 84)) },
        { label: 'Sealed without rationale', value: 0, tone: 'ok' },
        { label: 'Published within 24h', value: '94%', tone: 'ok' },
      ]} />
      <CourtCallout kicker="open reasoning doctrine" body="Every decision is published with full reasoning. Sealed rulings without rationale are constitutionally void." />
    </CourtFrame>
  );
}

export function RecentDecisions({ id, now }: { id: string; now: number }) {
  const ts = now / 4000;
  void id;
  const topics = ['Privacy & data sovereignty', 'Cell-broadcast misuse', 'Election-tampering ruling', 'Emergency-powers limits', 'Press independence', 'Right to digital identity', 'Pension solvency mandate', 'Treaty supremacy'];
  return (
    <CourtFrame archetype="reasoning" code="RS-REC-18" title="Recent Decisions"
      subtitle="latest published decisions">
      <CourtKpi items={[
        { label: 'Decisions (last 30d)', value: Math.round(wave(`rd:30:0`, ts, 24, 84)), tone: 'info' },
        { label: 'Constitutional', value: Math.round(wave(`rd:c:0`, ts, 4, 18)) },
        { label: 'Public-search hits', value: Math.round(wave(`rd:s:0`, ts, 240, 12000)).toLocaleString(), tone: 'info' },
        { label: 'Citizen requests', value: '✓ open', tone: 'ok' },
      ]} />
      <CourtRule label="recent (sample)" />
      {topics.map((t, i) => (
        <CourtBar key={t} label={t} pct={Math.round(wave(`rd:p:${i}`, ts, 38, 96))}
          tone="info" tail={`№ ${(400 + i)}/2025`} />
      ))}
    </CourtFrame>
  );
}

export function DoctrineLibrary({ id, now }: { id: string; now: number }) {
  void id; void now;
  return (
    <CourtFrame archetype="reasoning" code="RS-DOC-19" title="Doctrine Library"
      subtitle="constitutional doctrine library">
      <CourtKpi items={[
        { label: 'Doctrines indexed', value: 96, tone: 'info' },
        { label: 'Recent additions (year)', value: 12, tone: 'ok' },
        { label: 'Public access', value: '✓ free', tone: 'ok' },
        { label: 'Citizen tools', value: 'Search + commentary', tone: 'info' },
      ]} />
      <CourtCallout kicker="doctrine" body="Constitutional doctrines are indexed and searchable. Each carries the leading case, dissents, and citizen-friendly commentary." />
    </CourtFrame>
  );
}

export function JudicialConduct({ id, now }: { id: string; now: number }) {
  const board = judicialBranchBoard(now);
  void id;
  return (
    <CourtFrame archetype="conduct" code="CD-JUD-20" title="Judicial Conduct"
      subtitle="conduct case docket">
      <CourtKpi items={[
        { label: 'Open cases', value: board.conductCases.length, tone: board.conductCases.length > 0 ? 'warn' : 'ok' },
        { label: 'Civilian-panel review', value: board.conductCases.filter(c => c.stage === 'civilian-panel').length },
        { label: 'In tribunal', value: board.conductCases.filter(c => c.stage === 'tribunal').length, tone: 'warn' },
        { label: 'Closed YTD', value: 4, tone: 'mute' },
      ]} />
      <CourtRule label="conduct register" />
      {board.conductCases.length === 0 ? (
        <p className="text-[10.5px] italic" style={{ color: JUDICIAL_DS.mut }}>No open conduct cases.</p>
      ) : board.conductCases.map(c => (
        <div key={c.id} className="grid grid-cols-[110px_140px_140px_120px_80px] gap-3 border-b py-1.5 text-[11px]"
          style={{ borderColor: JUDICIAL_DS.ruleSoft, fontFamily: 'ui-monospace, monospace' }}>
          <span style={{ color: JUDICIAL_DS.gold }}>{c.id}</span>
          <span style={{ color: JUDICIAL_DS.parchmentInk }}>{c.justice}</span>
          <span style={{ color: JUDICIAL_DS.mut }}>{c.ground}</span>
          <span className="uppercase tracking-[0.16em]"
            style={{ color: c.stage === 'tribunal' ? JUDICIAL_DS.coral : c.stage === 'civilian-panel' ? JUDICIAL_DS.violet : JUDICIAL_DS.gold }}>● {c.stage}</span>
          <span className="text-right tabular-nums" style={{ color: JUDICIAL_DS.mut }}>{c.daysOpen}d</span>
        </div>
      ))}
    </CourtFrame>
  );
}

export function CivilianPanelReviews({ id, now }: { id: string; now: number }) {
  const board = judicialBranchBoard(now);
  void id;
  return (
    <CourtFrame archetype="conduct" code="CD-CIV-21" title="Civilian-Panel Reviews"
      subtitle="independent panel reviews">
      <CourtKpi items={[
        { label: 'Active reviews', value: board.conductCases.filter(c => c.stage === 'civilian-panel').length },
        { label: 'Panellists', value: 11, tone: 'info' },
        { label: 'Lay-citizen seats', value: 7, tone: 'ok' },
        { label: 'Senate-nominated', value: 4, tone: 'info' },
      ]} />
      <CourtCallout kicker="independence" body="The civilian panel reviews every conduct complaint. Independence from the bench is structural — the panel cannot be chaired by a sitting justice." />
    </CourtFrame>
  );
}

export function ConductTribunal({ id, now }: { id: string; now: number }) {
  const board = judicialBranchBoard(now);
  void id;
  return (
    <CourtFrame archetype="conduct" code="CD-TRB-22" title="Conduct Tribunal"
      subtitle="misconduct tribunal">
      <CourtKpi items={[
        { label: 'In tribunal', value: board.conductCases.filter(c => c.stage === 'tribunal').length, tone: 'warn' },
        { label: 'Removals YTD', value: 0, tone: 'ok' },
        { label: 'Sustained findings YTD', value: 2, tone: 'mute' },
        { label: 'Open hearings', value: '100%', tone: 'ok' },
      ]} />
    </CourtFrame>
  );
}

void seed;
