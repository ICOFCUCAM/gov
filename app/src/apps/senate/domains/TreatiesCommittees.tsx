'use client';

// Senate domains — Treaties, Committees & Executive Oversight surfaces.

import * as React from 'react';
import { senateBoard } from '@/lib/gov/senate-engine';
import { ChamberFrame, ChamberKpi, ChamberRule, ChamberBar, ChamberCallout, SENATE_DS } from '@/apps/senate/design-system/senate-ds';
import { seed, wave } from '@/lib/telemetry';

export function TreatyAtlas({ id, now }: { id: string; now: number }) {
  const board = senateBoard(now);
  void id;
  return (
    <ChamberFrame archetype="treaties" code="TR-ATL-09" title="Treaty Atlas"
      subtitle="all treaties under Senate review">
      <ChamberKpi items={[
        { label: 'Treaties', value: board.treaties.length },
        { label: 'Concurred (YTD)', value: board.treaties.filter(t => t.stage === 'concurred').length, tone: 'ok' },
        { label: 'In committee', value: board.treaties.filter(t => t.stage === 'committee-review').length, tone: 'info' },
        { label: 'Universal scope', value: board.treaties.filter(t => t.scope === 'universal').length, tone: 'info' },
      ]} />
      <ChamberRule label="treaty register" />
      {board.treaties.map(t => (
        <div key={t.id} className="grid grid-cols-[110px_1fr_140px_140px_80px] gap-3 border-b py-1.5 text-[11px]"
          style={{ borderColor: SENATE_DS.ruleSoft, fontFamily: 'ui-monospace, monospace' }}>
          <span style={{ color: SENATE_DS.gold }}>{t.id}</span>
          <span style={{ color: SENATE_DS.parchmentInk }}>{t.treaty}</span>
          <span style={{ color: SENATE_DS.mut }}>{t.scope}</span>
          <span className="uppercase tracking-[0.16em]"
            style={{ color: t.stage === 'concurred' ? SENATE_DS.jade : t.stage === 'floor-debate' ? SENATE_DS.rose : SENATE_DS.gold }}>● {t.stage}</span>
          <span className="text-right tabular-nums" style={{ color: SENATE_DS.mut }}>{t.daysOpen}d</span>
        </div>
      ))}
    </ChamberFrame>
  );
}

export function RatificationQueue({ id, now }: { id: string; now: number }) {
  const board = senateBoard(now);
  void id;
  const queue = board.treaties.filter(t => t.stage !== 'concurred');
  return (
    <ChamberFrame archetype="treaties" code="TR-RAT-10" title="Ratification Queue"
      subtitle="active ratifications">
      <ChamberKpi items={[
        { label: 'In queue', value: queue.length },
        { label: 'Floor debate', value: queue.filter(t => t.stage === 'floor-debate').length, tone: 'warn' },
        { label: 'Public consultation', value: queue.filter(t => t.stage === 'public-consultation').length, tone: 'info' },
        { label: 'Mean days open', value: queue.length === 0 ? '—' : Math.round(queue.reduce((s, t) => s + t.daysOpen, 0) / queue.length) },
      ]} />
      <ChamberRule label="queue" />
      {queue.map(t => (
        <ChamberBar key={t.id} label={t.treaty} pct={Math.min(100, t.daysOpen / 7)}
          tone={t.stage === 'floor-debate' ? 'warn' : 'info'} tail={t.stage} />
      ))}
    </ChamberFrame>
  );
}

export function PublicConsultation({ id, now }: { id: string; now: number }) {
  const board = senateBoard(now);
  void id;
  const consult = board.treaties.filter(t => t.stage === 'public-consultation');
  return (
    <ChamberFrame archetype="treaties" code="TR-PUB-11" title="Public Consultation"
      subtitle="citizen consultation windows">
      <ChamberKpi items={[
        { label: 'Open consultations', value: consult.length },
        { label: 'Median window (d)', value: '30', tone: 'info' },
        { label: 'Public submissions', value: '2,840', tone: 'ok' },
        { label: 'Hearings convened', value: consult.length * 2, tone: 'info' },
      ]} />
      <ChamberCallout kicker="constitutional consultation" body="Treaties affecting citizens must include a 30-day public consultation. Submissions are published in Hansard with attribution opt-in." />
    </ChamberFrame>
  );
}

export function StandingCommittees({ id, now }: { id: string; now: number }) {
  const board = senateBoard(now);
  void id;
  return (
    <ChamberFrame archetype="committees" code="CM-STD-12" title="Standing Committees"
      subtitle="permanent senate committees">
      <ChamberKpi items={[
        { label: 'Standing committees', value: board.committees.length },
        { label: 'Total inquiries', value: board.committees.reduce((s, c) => s + c.inquiriesActive, 0), tone: 'info' },
        { label: 'Reports tabled YTD', value: board.committees.reduce((s, c) => s + c.reportsTabledYTD, 0), tone: 'ok' },
        { label: 'Hearings this Q', value: board.committees.reduce((s, c) => s + c.hearingsThisQ, 0) },
      ]} />
      <ChamberRule label="committee register" />
      {board.committees.map(c => (
        <ChamberBar key={c.committee} label={c.committee}
          pct={Math.min(100, c.hearingsThisQ * 4)}
          tone={c.inquiriesActive > 5 ? 'warn' : 'info'}
          tail={`${c.inquiriesActive} inq · ${c.reportsTabledYTD} reports`} />
      ))}
    </ChamberFrame>
  );
}

export function SpecialCommittees({ id, now }: { id: string; now: number }) {
  const ts = now / 4000;
  void id;
  const special = ['Climate Resilience Select', 'Cyber Norms Special', 'Demographics & Migration', 'Sovereign Tech Advisory'];
  return (
    <ChamberFrame archetype="committees" code="CM-SPC-13" title="Special Committees"
      subtitle="time-bound senate committees">
      <ChamberKpi items={[
        { label: 'Special committees', value: special.length },
        { label: 'Hearings this Q', value: Math.round(wave(`sp:h:0`, ts, 12, 48)) },
        { label: 'Mean mandate (months)', value: '12', tone: 'info' },
        { label: 'Tabled reports YTD', value: Math.round(wave(`sp:r:0`, ts, 4, 16)) },
      ]} />
      <ChamberRule label="special committees" />
      {special.map((s, i) => (
        <ChamberBar key={s} label={s} pct={Math.round(wave(`sp:p:${i}`, ts, 30, 90))}
          tone="info" tail={`${Math.round(wave(`sp:m:${i}`, ts, 1, 12))}/12 months`} />
      ))}
    </ChamberFrame>
  );
}

export function Inquiries({ id, now }: { id: string; now: number }) {
  const board = senateBoard(now);
  void id;
  return (
    <ChamberFrame archetype="committees" code="CM-INQ-14" title="Committee Inquiries"
      subtitle="active investigative inquiries">
      <ChamberKpi items={[
        { label: 'Active inquiries', value: board.committees.reduce((s, c) => s + c.inquiriesActive, 0) },
        { label: 'Reports this Q', value: board.committees.reduce((s, c) => s + c.reportsTabledYTD, 0), tone: 'ok' },
        { label: 'Hearings this Q', value: board.committees.reduce((s, c) => s + c.hearingsThisQ, 0) },
        { label: 'Subpoenas issued', value: 0, tone: 'mute' },
      ]} />
      <ChamberCallout kicker="subpoena doctrine" body="Subpoena powers are used sparingly and only with committee-chair signature. Every subpoena tabled to Hansard with rationale." />
    </ChamberFrame>
  );
}

export function ExecutiveOversight({ id, now }: { id: string; now: number }) {
  const ts = now / 4000;
  void id;
  return (
    <ChamberFrame archetype="oversight" code="OV-EXE-15" title="Executive Oversight"
      subtitle="cabinet & ministry oversight">
      <ChamberKpi items={[
        { label: 'Cabinet appearances (q)', value: Math.round(wave(`eo:c:0`, ts, 4, 28)), tone: 'info' },
        { label: 'Ministerial reports', value: Math.round(wave(`eo:r:0`, ts, 24, 120)), tone: 'ok' },
        { label: 'Audit findings reviewed', value: Math.round(wave(`eo:a:0`, ts, 8, 48)) },
        { label: 'Censure motions', value: 0, tone: 'ok' },
      ]} />
      <ChamberCallout kicker="separation of powers" body="The Senate reviews the executive without governing it. Ministerial responsibility — full disclosure to the chamber — is non-negotiable." />
    </ChamberFrame>
  );
}

export function QuestionTime({ id, now }: { id: string; now: number }) {
  const ts = now / 4000;
  void id;
  const ministries = ['Treasury', 'Health', 'Justice', 'Foreign Affairs', 'Police Command', 'Education'];
  return (
    <ChamberFrame archetype="oversight" code="OV-QTM-16" title="Question Time"
      subtitle="ministerial question time">
      <ChamberKpi items={[
        { label: 'Sessions (week)', value: 3, tone: 'info' },
        { label: 'Questions submitted', value: Math.round(wave(`qt:q:0`, ts, 84, 320)) },
        { label: 'Mean response time', value: '4.2 min', tone: 'ok' },
        { label: 'Follow-ups required', value: Math.round(wave(`qt:f:0`, ts, 8, 32)), tone: 'warn' },
      ]} />
      <ChamberRule label="recent activity" />
      {ministries.map((m, i) => (
        <ChamberBar key={m} label={m} pct={Math.round(wave(`qt:${i}`, ts, 38, 92))}
          tone="info" tail={`${Math.round(wave(`qt:n:${i}`, ts, 4, 18))} questions`} />
      ))}
    </ChamberFrame>
  );
}

export function CabinetAppearance({ id, now }: { id: string; now: number }) {
  const ts = now / 4000;
  void id;
  return (
    <ChamberFrame archetype="oversight" code="OV-CAB-17" title="Cabinet Appearance"
      subtitle="cabinet & ministry hearings docket">
      <ChamberKpi items={[
        { label: 'Hearings this Q', value: Math.round(wave(`ca:h:0`, ts, 8, 36)), tone: 'info' },
        { label: 'Ministers appearing', value: Math.round(wave(`ca:m:0`, ts, 4, 14)), tone: 'info' },
        { label: 'Public sessions', value: '94%', tone: 'ok' },
        { label: 'Closed (with rationale)', value: '6%', tone: 'mute' },
      ]} />
      <ChamberCallout kicker="cabinet doctrine" body="Ministers must appear when summoned. Refusal is an automatic ethics referral. All testimony recorded under oath and sealed to Hansard." />
    </ChamberFrame>
  );
}
