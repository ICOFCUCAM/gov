'use client';

// Judicial branch — Apex Bench + Court Tiers.

import * as React from 'react';
import { judicialBranchBoard } from '@/lib/gov/judicial-branch-engine';
import { CourtFrame, CourtKpi, CourtRule, CourtBar, CourtCallout, JUDICIAL_DS } from '@/apps/judicial-branch/design-system/judicial-ds';
import { seed, wave } from '@/lib/telemetry';

export function ApexBench({ id, now }: { id: string; now: number }) {
  const board = judicialBranchBoard(now);
  void id;
  return (
    <CourtFrame archetype="apex" code="AP-BNC-01" title="Apex Bench"
      subtitle="Constitutional Court command" posture={board.posture}>
      <CourtKpi items={[
        { label: 'Posture', value: board.posture.toUpperCase(), tone: board.posture === 'contested' ? 'alert' : 'info' },
        { label: 'Justices on Constitutional Court', value: board.justices.filter(j => j.court === 'Constitutional').length, tone: 'info' },
        { label: 'Constitutional cases active', value: board.cases.filter(c => c.kind === 'constitutional').length, tone: 'warn' },
        { label: 'Median decision (d)', value: board.medianDecisionDays, tone: 'info' },
      ]} />
      <CourtCallout kicker="independence" body="The Constitutional Court is independent of every political branch. Political pressure on justices is constitutionally void." />
    </CourtFrame>
  );
}

export function ApexPosture({ id, now }: { id: string; now: number }) {
  const board = judicialBranchBoard(now);
  const ts = now / 4000;
  void id;
  return (
    <CourtFrame archetype="apex" code="AP-PST-02" title="Apex Posture"
      subtitle="posture, deliberation, public hearings" posture={board.posture}>
      <CourtKpi items={[
        { label: 'Sessions / month', value: Math.round(wave(`ap:s:0`, ts, 4, 18)), tone: 'info' },
        { label: 'Public hearings %', value: `${Math.round(wave(`ap:p:0`, ts, 80, 98))}%`, tone: 'ok' },
        { label: 'Closed (with rationale)', value: `${Math.round(wave(`ap:c:0`, ts, 2, 14))}%`, tone: 'mute' },
        { label: 'Independence index', value: '98/100', tone: 'ok' },
      ]} />
    </CourtFrame>
  );
}

export function SeparationOfPowers({ id, now }: { id: string; now: number }) {
  const ts = now / 4000;
  void id;
  return (
    <CourtFrame archetype="apex" code="AP-SOP-03" title="Separation of Powers"
      subtitle="branch-relationship monitor">
      <CourtKpi items={[
        { label: 'Branch tensions', value: Math.round(wave(`sop:t:0`, ts, 0, 6)), tone: 'warn' },
        { label: 'Constitutional referrals', value: Math.round(wave(`sop:r:0`, ts, 4, 18)), tone: 'info' },
        { label: 'Executive overrides', value: 0, tone: 'ok' },
        { label: 'Legislative override attempts', value: Math.round(wave(`sop:l:0`, ts, 0, 4)), tone: 'mute' },
      ]} />
      <CourtCallout kicker="doctrine" body="The Court guards the boundaries between branches. Constitutional rulings bind all branches; political defiance is reviewable as a constitutional crisis." />
    </CourtFrame>
  );
}

export function ConstitutionalCourt({ id, now }: { id: string; now: number }) {
  const board = judicialBranchBoard(now);
  const tier = board.tiers.find(t => t.tier === 'Constitutional');
  void id;
  return (
    <CourtFrame archetype="court" code="CT-CON-04" title="Constitutional Court"
      subtitle="constitutional-review docket">
      <CourtKpi items={[
        { label: 'Benches', value: tier?.benches ?? 1 },
        { label: 'Active cases', value: tier?.activeCases ?? 0, tone: 'info' },
        { label: 'Backlog', value: tier?.backlog ?? 0, tone: (tier?.backlog ?? 0) > 20 ? 'warn' : 'ok' },
        { label: 'Clearance', value: `${tier?.clearancePct ?? 0}%`, tone: 'ok' },
      ]} />
      <CourtRule label="constitutional case docket" />
      {board.cases.filter(c => c.kind === 'constitutional').map(c => (
        <CourtBar key={c.id} label={c.id} pct={Math.min(100, c.daysOpen / 4)}
          tone={c.stage === 'ruling-published' ? 'ok' : c.stage === 'deliberation' ? 'info' : 'warn'}
          tail={`${c.stage} · ${c.daysOpen}d`} />
      ))}
    </CourtFrame>
  );
}

function tierSurface(tierName: 'Supreme' | 'Appeals' | 'Trial' | 'Tribunal', code: string, title: string, subtitle: string) {
  return function TierSurface({ id, now }: { id: string; now: number }) {
    const board = judicialBranchBoard(now);
    const tier = board.tiers.find(t => t.tier === tierName);
    void id;
    return (
      <CourtFrame archetype="court" code={code} title={title} subtitle={subtitle}>
        <CourtKpi items={[
          { label: 'Benches', value: tier?.benches ?? 0 },
          { label: 'Active cases', value: tier?.activeCases ?? 0, tone: 'info' },
          { label: 'Backlog', value: tier?.backlog ?? 0, tone: (tier?.backlog ?? 0) > 200 ? 'warn' : 'ok' },
          { label: 'Clearance', value: `${tier?.clearancePct ?? 0}%`, tone: (tier?.clearancePct ?? 0) >= 75 ? 'ok' : 'warn' },
        ]} />
        <CourtCallout kicker="case access" body="92% of citizens live within 50 km of a court. Counsel and translation are provided at filing." />
      </CourtFrame>
    );
  };
}

export const SupremeCourt = tierSurface('Supreme',  'CT-SUP-05', 'Supreme Court',  'apex appellate docket');
export const AppealsCourt = tierSurface('Appeals',  'CT-APP-06', 'Appeals Court',  'appeals tier');
export const TrialCourt   = tierSurface('Trial',    'CT-TRL-07', 'Trial Court',    'trial-tier load');
export const Tribunals    = tierSurface('Tribunal', 'CT-TRB-08', 'Tribunals',      'specialist tribunals');

void seed;
