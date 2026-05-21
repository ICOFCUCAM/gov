'use client';

// Assembly domains — Budget Appropriation, Citizen Petitions, Question Time.

import * as React from 'react';
import { assemblyBoard } from '@/lib/gov/assembly-engine';
import { FloorFrame, FloorKpi, FloorRule, FloorBar, FloorCallout, ASSEMBLY_DS } from '@/apps/assembly/design-system/assembly-ds';
import { seed, wave } from '@/lib/telemetry';

export function BudgetCycle({ id, now }: { id: string; now: number }) {
  const board = assemblyBoard(now);
  void id;
  return (
    <FloorFrame archetype="budget" code="BD-CYC-09" title="Budget Cycle"
      subtitle="annual budget appropriation">
      <FloorKpi items={[
        { label: 'Stage', value: board.budget.stage.toUpperCase(), tone: board.budget.stage === 'assented' ? 'ok' : board.budget.stage === 'appropriation-vote' ? 'warn' : 'info' },
        { label: 'Appropriation', value: `${board.budget.appropriationBn} Bn`, tone: 'info' },
        { label: 'Scrutiny days left', value: board.budget.scrutinyDaysLeft, tone: board.budget.scrutinyDaysLeft <= 5 ? 'alert' : 'warn' },
        { label: 'Ministries scrutinised', value: `${board.budget.ministriesScrutinised}/15`, tone: 'info' },
      ]} />
      <FloorCallout kicker="constitutional contract" body="The budget requires a roll-call appropriation vote. Budget without Assembly vote is constitutionally void." />
    </FloorFrame>
  );
}

export function AppropriationBill({ id, now }: { id: string; now: number }) {
  const board = assemblyBoard(now);
  const ts = now / 4000;
  void id;
  const ministries = ['Treasury', 'Health', 'Education', 'Police Command', 'Transport', 'Energy', 'Agriculture', 'Environment', 'Justice', 'Interior', 'Labour', 'Trade', 'Foreign Affairs', 'Communications', 'Emergency'];
  return (
    <FloorFrame archetype="budget" code="BD-APP-10" title="Appropriation Bill"
      subtitle="active appropriation bill (line-by-line)">
      <FloorKpi items={[
        { label: 'Appropriation', value: `${board.budget.appropriationBn} Bn`, tone: 'info' },
        { label: 'Stage', value: board.budget.stage.toUpperCase(), tone: 'info' },
        { label: 'Lines tabled', value: 14, tone: 'info' },
        { label: 'Amendments filed', value: Math.round(wave(`ap:a:0`, ts, 4, 84)) },
      ]} />
      <FloorRule label="appropriation by ministry (allocation share)" />
      {ministries.map((m, i) => (
        <FloorBar key={m} label={m} pct={Math.round(wave(`ap:p:${i}`, ts, 4, 18))}
          tone={i % 3 === 0 ? 'info' : 'ok'} tail={`${Math.round(wave(`ap:b:${i}`, ts, 4, 96))} Bn`} />
      ))}
    </FloorFrame>
  );
}

export function AuditFindings({ id, now }: { id: string; now: number }) {
  const ts = now / 4000;
  void id;
  return (
    <FloorFrame archetype="budget" code="BD-AUD-11" title="Audit Findings"
      subtitle="audit findings tabled to chamber">
      <FloorKpi items={[
        { label: 'Findings YTD', value: Math.round(wave(`af:y:0`, ts, 24, 120)), tone: 'info' },
        { label: 'Material findings', value: Math.round(wave(`af:m:0`, ts, 2, 18)), tone: 'warn' },
        { label: 'Resolved', value: Math.round(wave(`af:r:0`, ts, 18, 90)), tone: 'ok' },
        { label: 'Sealed to public', value: '100%', tone: 'ok' },
      ]} />
      <FloorCallout kicker="audit doctrine" body="Audit findings are tabled to the Assembly first — before publication elsewhere. Concealment of audit findings is constitutionally void." />
    </FloorFrame>
  );
}

export function CitizenPetitions({ id, now }: { id: string; now: number }) {
  const board = assemblyBoard(now);
  void id;
  return (
    <FloorFrame archetype="petitions" code="PT-ACT-12" title="Citizen Petitions"
      subtitle="active petitions (5,000-signature threshold)">
      <FloorKpi items={[
        { label: 'Active petitions', value: board.petitions.length },
        { label: 'Threshold met', value: board.petitions.filter(p => p.status === 'threshold-met' || p.status === 'scheduled' || p.status === 'debated').length, tone: 'ok' },
        { label: 'Total signatures', value: board.petitions.reduce((s, p) => s + p.signatures, 0).toLocaleString(), tone: 'info' },
        { label: 'Median signatures', value: board.petitions.length === 0 ? '—' : Math.round(board.petitions.reduce((s, p) => s + p.signatures, 0) / board.petitions.length).toLocaleString() },
      ]} />
      <FloorRule label="petition register" />
      {board.petitions.map(p => (
        <div key={p.id} className="grid grid-cols-[110px_1fr_120px_120px_80px] gap-3 border-b py-1.5 text-[11px]"
          style={{ borderColor: ASSEMBLY_DS.ruleSoft, fontFamily: 'ui-monospace, monospace' }}>
          <span style={{ color: ASSEMBLY_DS.jade }}>{p.id}</span>
          <span style={{ color: ASSEMBLY_DS.parchment }}>{p.title}</span>
          <span className="text-right tabular-nums" style={{ color: p.signatures >= 5000 ? ASSEMBLY_DS.jade : ASSEMBLY_DS.mut }}>{p.signatures.toLocaleString()}</span>
          <span className="uppercase tracking-[0.16em]"
            style={{ color: p.status === 'debated' ? ASSEMBLY_DS.jade : p.status === 'scheduled' ? ASSEMBLY_DS.rose : p.status === 'threshold-met' ? ASSEMBLY_DS.ochre : ASSEMBLY_DS.mut }}>● {p.status}</span>
          <span className="text-right tabular-nums" style={{ color: ASSEMBLY_DS.mut }}>{p.daysOpen}d</span>
        </div>
      ))}
    </FloorFrame>
  );
}

export function PetitionDebateQueue({ id, now }: { id: string; now: number }) {
  const board = assemblyBoard(now);
  void id;
  const queue = board.petitions.filter(p => p.status === 'threshold-met' || p.status === 'scheduled');
  return (
    <FloorFrame archetype="petitions" code="PT-DBQ-13" title="Petition Debate Queue"
      subtitle="petitions awaiting plenary debate">
      <FloorKpi items={[
        { label: 'In queue', value: queue.length, tone: queue.length > 0 ? 'warn' : 'ok' },
        { label: 'Median time to debate (d)', value: 78, tone: 'warn' },
        { label: 'Debated YTD', value: 14, tone: 'ok' },
        { label: 'Median signatures', value: queue.length === 0 ? '—' : Math.round(queue.reduce((s, p) => s + p.signatures, 0) / queue.length).toLocaleString() },
      ]} />
      <FloorRule label="queue" />
      {queue.length === 0 ? (
        <p className="text-[10.5px] italic" style={{ color: ASSEMBLY_DS.mut }}>No petitions in debate queue.</p>
      ) : queue.map(p => (
        <FloorBar key={p.id} label={p.title} pct={Math.min(100, p.daysOpen / 1.2)}
          tone="warn" tail={`${p.signatures.toLocaleString()} sigs`} />
      ))}
      <FloorCallout kicker="constitutional contract" body="Petitions that pass the 5,000-signature threshold must be debated within 90 days. Suppression of petitions is constitutionally void." />
    </FloorFrame>
  );
}

export function QuestionTime({ id, now }: { id: string; now: number }) {
  const board = assemblyBoard(now);
  const ts = now / 4000;
  void id;
  return (
    <FloorFrame archetype="oversight" code="OV-QTM-14" title="Question Time"
      subtitle="weekly ministerial Question Time">
      <FloorKpi items={[
        { label: 'Questions this week', value: board.questionsThisWeek },
        { label: 'Ministers appearing', value: Math.round(wave(`qt:m:0`, ts, 5, 12)), tone: 'info' },
        { label: 'On-time response', value: '94%', tone: 'ok' },
        { label: 'Follow-ups', value: Math.round(wave(`qt:f:0`, ts, 8, 38)), tone: 'warn' },
      ]} />
      <FloorCallout kicker="constitutional contract" body="Question Time is weekly and non-skippable. Ministerial non-appearance is an automatic ethics referral." />
    </FloorFrame>
  );
}

export function MinisterialStatements({ id, now }: { id: string; now: number }) {
  const ts = now / 4000;
  void id;
  return (
    <FloorFrame archetype="oversight" code="OV-MIN-15" title="Ministerial Statements"
      subtitle="statements & dispatches">
      <FloorKpi items={[
        { label: 'Statements this week', value: Math.round(wave(`ms:s:0`, ts, 4, 28)), tone: 'info' },
        { label: 'Emergency dispatches', value: Math.round(wave(`ms:e:0`, ts, 0, 8)), tone: 'warn' },
        { label: 'Public-published', value: '100%', tone: 'ok' },
        { label: 'Average length (min)', value: Math.round(wave(`ms:l:0`, ts, 4, 14)) },
      ]} />
    </FloorFrame>
  );
}

export function CabinetSummons({ id, now }: { id: string; now: number }) {
  const ts = now / 4000;
  void id;
  return (
    <FloorFrame archetype="oversight" code="OV-CAB-16" title="Cabinet Summons"
      subtitle="active cabinet summons">
      <FloorKpi items={[
        { label: 'Summons issued', value: Math.round(wave(`cs:i:0`, ts, 1, 8)), tone: 'info' },
        { label: 'Awaiting response', value: Math.round(wave(`cs:a:0`, ts, 0, 4)), tone: 'warn' },
        { label: 'Compliance', value: '100%', tone: 'ok' },
        { label: 'Sealed to Hansard', value: '✓', tone: 'ok' },
      ]} />
      <FloorCallout kicker="cabinet doctrine" body="When summoned by the Assembly, ministers must appear. Refusal is an automatic ethics referral and may trigger no-confidence procedure." />
    </FloorFrame>
  );
}

void seed;
