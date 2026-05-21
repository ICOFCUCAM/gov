'use client';

// Assembly domains — Chamber Floor + Bill Pipeline.

import * as React from 'react';
import { assemblyBoard } from '@/lib/gov/assembly-engine';
import { FloorFrame, FloorKpi, FloorRule, FloorBar, FloorCallout, ASSEMBLY_DS } from '@/apps/assembly/design-system/assembly-ds';
import { seed, wave } from '@/lib/telemetry';

export function AssemblyFloor({ id, now }: { id: string; now: number }) {
  const board = assemblyBoard(now);
  void id;
  return (
    <FloorFrame archetype="chamber" code="CH-FLR-01" title="Assembly Floor"
      subtitle="live plenary command" posture={board.posture}>
      <FloorKpi items={[
        { label: 'Members', value: board.totalMembers },
        { label: 'Posture', value: board.posture.toUpperCase(), tone: board.posture === 'disorderly' ? 'alert' : board.posture === 'voting' ? 'info' : 'ok' },
        { label: 'Bills active', value: board.bills.length },
        { label: 'Questions / week', value: board.questionsThisWeek, tone: 'info' },
      ]} />
      <FloorRule label="blocs" />
      {board.blocs.map(b => (
        <FloorBar key={b.bloc} label={b.bloc.toUpperCase()}
          pct={Math.round((b.seats / board.totalMembers) * 100)}
          tone={b.bloc === 'government' ? 'ok' : b.bloc === 'opposition' ? 'warn' : 'info'}
          tail={`${b.seats} seats`} />
      ))}
      <FloorCallout kicker="majority doctrine" body="Assembly decisions require simple majority on most matters, two-thirds for constitutional amendments. Every roll-call public; secret ballots on policy are void." />
    </FloorFrame>
  );
}

export function PlenaryPosture({ id, now }: { id: string; now: number }) {
  const board = assemblyBoard(now);
  const ts = now / 4000;
  void id;
  return (
    <FloorFrame archetype="chamber" code="CH-PST-02" title="Plenary Posture"
      subtitle="quorum, attendance & schedule" posture={board.posture}>
      <FloorKpi items={[
        { label: 'Mean attendance', value: `${Math.round(wave(`pp:a:0`, ts, 80, 96))}%`, tone: 'ok' },
        { label: 'Plenary sessions / year', value: 240, tone: 'info' },
        { label: 'Quorum', value: '✓', tone: 'ok' },
        { label: 'Committee sessions / week', value: Math.round(wave(`pp:c:0`, ts, 14, 38)) },
      ]} />
      <FloorCallout kicker="attendance" body="Members below 60% attendance face an automatic ethics inquiry. The chamber sits 240 days a year — disruption of sittings is a constitutional violation." />
    </FloorFrame>
  );
}

export function MembersRegister({ id, now }: { id: string; now: number }) {
  const ts = now / 4000;
  void id;
  const members = Array.from({ length: 12 }, (_, i) => ({
    id: `M-${String(i + 1).padStart(3, '0')}`,
    name: ['Hon. Adamu', 'Hon. Petrov', 'Hon. Mehta', 'Hon. Oduya', 'Hon. Tanaka', 'Hon. Brennan', 'Hon. Park', 'Hon. Chen', 'Hon. Okafor', 'Hon. Ngozi', 'Hon. Hassan', 'Hon. Kovacs'][i]!,
    constituency: `District ${i + 1}`,
    bloc: ['government', 'opposition', 'crossbench'][i % 3]!,
    attendance: Math.round(wave(`mr:a:${i}`, ts, 60, 99)),
  }));
  return (
    <FloorFrame archetype="chamber" code="CH-REG-03" title="Members Register"
      subtitle="per-member dossier (sample)">
      <FloorKpi items={[
        { label: 'Members tracked', value: 420 },
        { label: 'High attendance (>90%)', value: members.filter(m => m.attendance >= 90).length, tone: 'ok' },
        { label: 'At-risk (<70%)', value: members.filter(m => m.attendance < 70).length, tone: 'alert' },
        { label: 'Cross-bench', value: members.filter(m => m.bloc === 'crossbench').length, tone: 'info' },
      ]} />
      <FloorRule label="register (sample)" />
      {members.map(m => (
        <div key={m.id} className="grid grid-cols-[80px_180px_140px_100px_80px] gap-3 border-b py-1.5 text-[11px]"
          style={{ borderColor: ASSEMBLY_DS.ruleSoft, fontFamily: 'ui-monospace, monospace' }}>
          <span style={{ color: ASSEMBLY_DS.jade }}>{m.id}</span>
          <span style={{ color: ASSEMBLY_DS.parchment }}>{m.name}</span>
          <span style={{ color: ASSEMBLY_DS.mut }}>{m.constituency}</span>
          <span className="uppercase tracking-[0.16em]"
            style={{ color: m.bloc === 'government' ? ASSEMBLY_DS.jade : m.bloc === 'opposition' ? ASSEMBLY_DS.ochre : ASSEMBLY_DS.rose }}>● {m.bloc}</span>
          <span className="text-right tabular-nums" style={{ color: m.attendance >= 90 ? ASSEMBLY_DS.jade : m.attendance >= 70 ? ASSEMBLY_DS.ochre : ASSEMBLY_DS.coral }}>{m.attendance}%</span>
        </div>
      ))}
    </FloorFrame>
  );
}

export function VotingBlocs({ id, now }: { id: string; now: number }) {
  const board = assemblyBoard(now);
  void id;
  return (
    <FloorFrame archetype="chamber" code="CH-BLC-04" title="Voting Blocs"
      subtitle="composition" posture={board.posture}>
      <FloorKpi items={[
        { label: 'Total seats', value: board.totalMembers },
        ...board.blocs.map(b => ({ label: b.bloc, value: b.seats, tone: (b.bloc === 'government' ? 'ok' : b.bloc === 'opposition' ? 'warn' : 'info') as 'ok' | 'warn' | 'info' })),
      ]} />
      <FloorRule label="composition" />
      {board.blocs.map(b => (
        <FloorBar key={b.bloc} label={b.bloc.toUpperCase()}
          pct={Math.round((b.seats / board.totalMembers) * 100)}
          tone={b.bloc === 'government' ? 'ok' : b.bloc === 'opposition' ? 'warn' : 'info'}
          tail={`${b.seats} / ${board.totalMembers}`} />
      ))}
    </FloorFrame>
  );
}

export function BillPipeline({ id, now }: { id: string; now: number }) {
  const board = assemblyBoard(now);
  void id;
  return (
    <FloorFrame archetype="bills" code="BL-PIP-05" title="Bill Pipeline"
      subtitle="all active bills">
      <FloorKpi items={[
        { label: 'Bills', value: board.bills.length },
        { label: 'Sent to Senate', value: board.bills.filter(b => b.stage === 'sent-to-senate').length, tone: 'ok' },
        { label: 'Third reading', value: board.bills.filter(b => b.stage === 'third-reading').length, tone: 'info' },
        { label: 'Committee', value: board.bills.filter(b => b.stage === 'committee').length, tone: 'warn' },
      ]} />
      <FloorRule label="pipeline" />
      {board.bills.map(b => (
        <div key={b.id} className="grid grid-cols-[110px_1fr_140px_120px_60px] gap-3 border-b py-1.5 text-[11px]"
          style={{ borderColor: ASSEMBLY_DS.ruleSoft, fontFamily: 'ui-monospace, monospace' }}>
          <span style={{ color: ASSEMBLY_DS.jade }}>{b.id}</span>
          <span style={{ color: ASSEMBLY_DS.parchment }}>{b.title}</span>
          <span className="uppercase tracking-[0.16em]"
            style={{ color: b.stage === 'sent-to-senate' ? ASSEMBLY_DS.jade : b.stage === 'third-reading' ? ASSEMBLY_DS.rose : ASSEMBLY_DS.ochre }}>● {b.stage}</span>
          <span style={{ color: ASSEMBLY_DS.mut }}>{b.sponsor}</span>
          <span className="text-right tabular-nums" style={{ color: ASSEMBLY_DS.mut }}>{b.daysOpen}d</span>
        </div>
      ))}
    </FloorFrame>
  );
}

export function FirstReading({ id, now }: { id: string; now: number }) {
  const board = assemblyBoard(now);
  void id;
  const fr = board.bills.filter(b => b.stage === 'first-reading');
  return (
    <FloorFrame archetype="bills" code="BL-1RD-06" title="First Reading"
      subtitle="bills in first reading">
      <FloorKpi items={[
        { label: 'Bills in first reading', value: fr.length },
        { label: 'Median age', value: fr.length === 0 ? '—' : `${Math.round(fr.reduce((s, b) => s + b.daysOpen, 0) / fr.length)}d` },
        { label: 'Total active bills', value: board.bills.length, tone: 'info' },
        { label: 'Public publication', value: '✓', tone: 'ok' },
      ]} />
      <FloorRule label="first-reading docket" />
      {fr.length === 0 ? (
        <p className="text-[10.5px] italic" style={{ color: ASSEMBLY_DS.mut }}>No bills currently in first reading.</p>
      ) : fr.map(b => (
        <FloorBar key={b.id} label={b.title} pct={Math.min(100, b.daysOpen / 1.2)}
          tone="info" tail={`${b.daysOpen}d`} />
      ))}
    </FloorFrame>
  );
}

export function ThirdReading({ id, now }: { id: string; now: number }) {
  const board = assemblyBoard(now);
  void id;
  const tr = board.bills.filter(b => b.stage === 'third-reading');
  return (
    <FloorFrame archetype="bills" code="BL-3RD-07" title="Third Reading"
      subtitle="bills in third (final) reading">
      <FloorKpi items={[
        { label: 'Bills in third reading', value: tr.length },
        { label: 'Awaiting roll-call', value: tr.length, tone: 'info' },
        { label: 'Median age', value: tr.length === 0 ? '—' : `${Math.round(tr.reduce((s, b) => s + b.daysOpen, 0) / tr.length)}d` },
        { label: 'Public publication', value: '✓', tone: 'ok' },
      ]} />
      <FloorRule label="third-reading docket" />
      {tr.length === 0 ? (
        <p className="text-[10.5px] italic" style={{ color: ASSEMBLY_DS.mut }}>No bills currently in third reading.</p>
      ) : tr.map(b => (
        <FloorBar key={b.id} label={b.title} pct={Math.min(100, b.daysOpen / 1.2)}
          tone="warn" tail={`${b.daysOpen}d`} />
      ))}
    </FloorFrame>
  );
}

export function SentToSenate({ id, now }: { id: string; now: number }) {
  const board = assemblyBoard(now);
  void id;
  const sent = board.bills.filter(b => b.stage === 'sent-to-senate');
  return (
    <FloorFrame archetype="bills" code="BL-SEN-08" title="Sent to Senate"
      subtitle="bills handed to upper chamber">
      <FloorKpi items={[
        { label: 'Sent to Senate', value: sent.length, tone: 'ok' },
        { label: 'YTD', value: 24, tone: 'info' },
        { label: 'Returned with amendments', value: 8, tone: 'warn' },
        { label: 'Concurred', value: 16, tone: 'ok' },
      ]} />
      <FloorRule label="handover docket" />
      {sent.length === 0 ? (
        <p className="text-[10.5px] italic" style={{ color: ASSEMBLY_DS.mut }}>No bills currently with Senate.</p>
      ) : sent.map(b => (
        <FloorBar key={b.id} label={b.title} pct={Math.min(100, b.daysOpen / 1.2)}
          tone="ok" tail={`${b.daysOpen}d`} />
      ))}
    </FloorFrame>
  );
}

void seed;
