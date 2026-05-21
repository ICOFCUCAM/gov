'use client';

// Senate domains — Chamber Floor + Bill Pipeline surfaces.

import * as React from 'react';
import { senateBoard } from '@/lib/gov/senate-engine';
import { ChamberFrame, ChamberKpi, ChamberRule, ChamberBar, ChamberCallout, SENATE_DS } from '@/apps/senate/design-system/senate-ds';
import { seed, wave } from '@/lib/telemetry';

export function SenateFloor({ id, now }: { id: string; now: number }) {
  const board = senateBoard(now);
  void id;
  return (
    <ChamberFrame archetype="chamber" code="CH-FLR-01" title="Senate Floor"
      subtitle="live plenary command" posture={board.posture}>
      <ChamberKpi items={[
        { label: 'Total senators', value: board.totalSenators },
        { label: 'Posture', value: board.posture.toUpperCase(), tone: board.posture === 'contested' ? 'alert' : board.posture === 'voting' ? 'info' : 'ok' },
        { label: 'Active bills', value: board.bills.length, tone: 'info' },
        { label: 'Active treaties', value: board.treaties.length, tone: 'info' },
      ]} />
      <ChamberRule label="blocs (composition)" />
      {board.blocs.map(b => (
        <ChamberBar key={b.bloc} label={b.bloc.toUpperCase()}
          pct={Math.round((b.seats / board.totalSenators) * 100)}
          tone={b.bloc === 'government' ? 'ok' : b.bloc === 'opposition' ? 'warn' : 'info'}
          tail={`${b.seats} seats`} />
      ))}
      <ChamberCallout kicker="quorum doctrine" body="Plenary requires majority for procedural votes, two-thirds for constitutional override. Every roll-call sealed within 24 h." />
    </ChamberFrame>
  );
}

export function PlenaryPosture({ id, now }: { id: string; now: number }) {
  const board = senateBoard(now);
  const ts = now / 4000;
  void id;
  return (
    <ChamberFrame archetype="chamber" code="CH-PST-02" title="Plenary Posture"
      subtitle="quorum, attendance & schedule" posture={board.posture}>
      <ChamberKpi items={[
        { label: 'Posture', value: board.posture.toUpperCase(), tone: board.posture === 'contested' ? 'alert' : 'info' },
        { label: 'Mean attendance', value: `${Math.round(wave(`pp:a:0`, ts, 78, 96))}%`, tone: 'ok' },
        { label: 'Quorum reached', value: '✓', tone: 'ok' },
        { label: 'Sessions / quarter', value: Math.round(wave(`pp:s:0`, ts, 24, 64)), tone: 'info' },
      ]} />
      <ChamberCallout kicker="attendance doctrine" body="Senators below 60% attendance face an automatic ethics inquiry. Closed sessions require published rationale within 7 days." />
    </ChamberFrame>
  );
}

export function SenatorsRegister({ id, now }: { id: string; now: number }) {
  const ts = now / 4000;
  void id;
  const senators = Array.from({ length: 12 }, (_, i) => ({
    id: `S-${String(i + 1).padStart(3, '0')}`,
    name: ['Sen. Adamu', 'Sen. Petrov', 'Sen. Mehta', 'Sen. Oduya', 'Sen. Tanaka', 'Sen. Brennan', 'Sen. Park', 'Sen. Chen', 'Sen. Okafor', 'Sen. Ngozi', 'Sen. Hassan', 'Sen. Kovacs'][i]!,
    region: ['Capital', 'Northern', 'Eastern', 'Western', 'Coastal', 'Highland'][i % 6]!,
    bloc: ['government', 'opposition', 'crossbench'][i % 3]!,
    attendance: Math.round(wave(`sr:a:${i}`, ts, 64, 99)),
  }));
  return (
    <ChamberFrame archetype="chamber" code="CH-REG-03" title="Senators Register"
      subtitle="per-senator dossier (sample)">
      <ChamberKpi items={[
        { label: 'Senators tracked', value: 84 },
        { label: 'Above 90% attendance', value: senators.filter(s => s.attendance >= 90).length, tone: 'ok' },
        { label: 'Below 70%', value: senators.filter(s => s.attendance < 70).length, tone: 'alert' },
        { label: 'Cross-bench', value: senators.filter(s => s.bloc === 'crossbench').length, tone: 'info' },
      ]} />
      <ChamberRule label="register" />
      {senators.map(s => (
        <div key={s.id} className="grid grid-cols-[80px_180px_120px_100px_80px] gap-3 border-b py-1.5 text-[11px]"
          style={{ borderColor: SENATE_DS.ruleSoft, fontFamily: 'ui-monospace, monospace' }}>
          <span style={{ color: SENATE_DS.gold }}>{s.id}</span>
          <span style={{ color: SENATE_DS.parchmentInk }}>{s.name}</span>
          <span style={{ color: SENATE_DS.mut }}>{s.region}</span>
          <span className="uppercase tracking-[0.16em]"
            style={{ color: s.bloc === 'government' ? SENATE_DS.jade : s.bloc === 'opposition' ? SENATE_DS.gold : SENATE_DS.rose }}>● {s.bloc}</span>
          <span className="text-right tabular-nums" style={{ color: s.attendance >= 90 ? SENATE_DS.jade : s.attendance >= 70 ? SENATE_DS.gold : SENATE_DS.coral }}>{s.attendance}%</span>
        </div>
      ))}
    </ChamberFrame>
  );
}

export function VotingBlocs({ id, now }: { id: string; now: number }) {
  const board = senateBoard(now);
  void id;
  return (
    <ChamberFrame archetype="chamber" code="CH-BLC-04" title="Voting Blocs"
      subtitle="government / opposition / cross-bench" posture={board.posture}>
      <ChamberKpi items={[
        { label: 'Total seats', value: board.totalSenators },
        ...board.blocs.map(b => ({ label: b.bloc, value: b.seats, tone: (b.bloc === 'government' ? 'ok' : b.bloc === 'opposition' ? 'warn' : 'info') as 'ok' | 'warn' | 'info' })),
      ]} />
      <ChamberRule label="bloc composition" />
      {board.blocs.map(b => (
        <ChamberBar key={b.bloc} label={b.bloc.toUpperCase()}
          pct={Math.round((b.seats / board.totalSenators) * 100)}
          tone={b.bloc === 'government' ? 'ok' : b.bloc === 'opposition' ? 'warn' : 'info'}
          tail={`${b.seats} / ${board.totalSenators}`} />
      ))}
      <ChamberCallout kicker="bloc dynamics" body="Cross-bench senators hold the balance. Two-thirds override requires their concurrence; manipulation of cross-bench voting is constitutionally void." />
    </ChamberFrame>
  );
}

export function BillPipeline({ id, now }: { id: string; now: number }) {
  const board = senateBoard(now);
  void id;
  return (
    <ChamberFrame archetype="bills" code="BL-PIP-05" title="Bill Pipeline"
      subtitle="all active bills">
      <ChamberKpi items={[
        { label: 'Bills active', value: board.bills.length },
        { label: 'Awaiting assent', value: board.bills.filter(b => b.stage === 'awaiting-assent').length, tone: 'ok' },
        { label: 'In committee', value: board.bills.filter(b => b.stage === 'committee').length, tone: 'info' },
        { label: 'Final vote', value: board.bills.filter(b => b.stage === 'final-vote').length, tone: 'warn' },
      ]} />
      <ChamberRule label="pipeline register" />
      {board.bills.map(b => (
        <div key={b.id} className="grid grid-cols-[110px_1fr_140px_80px_80px] gap-3 border-b py-1.5 text-[11px]"
          style={{ borderColor: SENATE_DS.ruleSoft, fontFamily: 'ui-monospace, monospace' }}>
          <span style={{ color: SENATE_DS.gold }}>{b.id}</span>
          <span style={{ color: SENATE_DS.parchmentInk }}>{b.title}</span>
          <span className="uppercase tracking-[0.16em]"
            style={{ color: b.stage === 'awaiting-assent' ? SENATE_DS.jade : b.stage === 'final-vote' ? SENATE_DS.rose : b.stage === 'committee' ? SENATE_DS.gold : SENATE_DS.parchmentInk }}>● {b.stage}</span>
          <span className="text-right tabular-nums" style={{ color: SENATE_DS.mut }}>{b.daysOpen}d</span>
          <span className="text-right tabular-nums" style={{ color: SENATE_DS.mut }}>{b.pageCount}p</span>
        </div>
      ))}
    </ChamberFrame>
  );
}

export function SecondReading({ id, now }: { id: string; now: number }) {
  const board = senateBoard(now);
  void id;
  const sr = board.bills.filter(b => b.stage === 'second-reading');
  return (
    <ChamberFrame archetype="bills" code="BL-2RD-06" title="Second Reading"
      subtitle="bills in second-reading debate">
      <ChamberKpi items={[
        { label: 'Bills in second reading', value: sr.length, tone: sr.length > 0 ? 'info' : 'ok' },
        { label: 'Total pages', value: sr.reduce((s, b) => s + b.pageCount, 0).toLocaleString() },
        { label: 'Median days open', value: sr.length === 0 ? '—' : Math.round(sr.reduce((s, b) => s + b.daysOpen, 0) / sr.length) },
        { label: 'Public consultation', value: '✓', tone: 'ok' },
      ]} />
      <ChamberRule label="second-reading docket" />
      {sr.length === 0 ? (
        <p className="text-[10.5px] italic" style={{ color: SENATE_DS.mut }}>No bills in second reading.</p>
      ) : sr.map(b => (
        <ChamberBar key={b.id} label={b.title} pct={Math.min(100, b.daysOpen / 2)}
          tone={b.daysOpen > 120 ? 'warn' : 'info'} tail={`${b.daysOpen}d · ${b.pageCount}p`} />
      ))}
    </ChamberFrame>
  );
}

export function AmendmentDocket({ id, now }: { id: string; now: number }) {
  const board = senateBoard(now);
  const ts = now / 4000;
  void id;
  return (
    <ChamberFrame archetype="bills" code="BL-AMD-07" title="Amendment Docket"
      subtitle="filed amendments">
      <ChamberKpi items={[
        { label: 'Bills in amendment', value: board.bills.filter(b => b.stage === 'amendment').length },
        { label: 'Amendments filed (week)', value: Math.round(wave(`ad:f:0`, ts, 8, 84)), tone: 'info' },
        { label: 'Adopted', value: Math.round(wave(`ad:a:0`, ts, 4, 32)), tone: 'ok' },
        { label: 'Withdrawn', value: Math.round(wave(`ad:w:0`, ts, 0, 18)), tone: 'mute' },
      ]} />
      <ChamberCallout kicker="amendment doctrine" body="Every amendment is sponsored, signed and recorded. Anonymous amendments are constitutionally void." />
    </ChamberFrame>
  );
}

export function ConferenceCommittee({ id, now }: { id: string; now: number }) {
  const board = senateBoard(now);
  const ts = now / 4000;
  void id;
  return (
    <ChamberFrame archetype="bills" code="BL-CON-08" title="Conference Committee"
      subtitle="inter-chamber reconciliation">
      <ChamberKpi items={[
        { label: 'Conferences active', value: Math.round(wave(`cc:a:0`, ts, 1, 5)), tone: 'info' },
        { label: 'Bills in conference', value: board.bills.filter(b => b.stage === 'final-vote').length },
        { label: 'Median resolution', value: `${Math.round(wave(`cc:r:0`, ts, 8, 28))}d`, tone: 'warn' },
        { label: 'Cross-chamber agreement', value: `${Math.round(wave(`cc:a2:0`, ts, 64, 94))}%`, tone: 'ok' },
      ]} />
      <ChamberCallout kicker="reconciliation" body="When chambers diverge, a conference committee proposes a unified text. Either chamber may reject; concurrence is recorded with each senator's vote." />
    </ChamberFrame>
  );
}
