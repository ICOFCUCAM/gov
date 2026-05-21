'use client';

// Presidency domains — State engagements, security council, ministers, address.

import * as React from 'react';
import { presidencyBoard } from '@/lib/gov/presidency-engine';
import { MansionFrame, MansionKpi, MansionRule, MansionBar, MansionCallout, PRESIDENCY_DS } from '@/apps/presidency/design-system/presidency-ds';
import { wave } from '@/lib/telemetry';

export function StateEngagements({ id, now }: { id: string; now: number }) {
  const b = presidencyBoard(now);
  void id;
  return (
    <MansionFrame archetype="engagements" code="SE-REG-10" title="State Engagements"
      subtitle="all state visits, summits & calls · §2.4">
      <MansionKpi items={[
        { label: 'Total tracked', value: b.engagements.length, tone: 'info' },
        { label: 'Live now', value: b.engagements.filter(e => e.status === 'live').length, tone: 'ok' },
        { label: 'Planning', value: b.engagements.filter(e => e.status === 'planning').length },
        { label: 'Concluded', value: b.engagements.filter(e => e.status === 'concluded').length, tone: 'mute' },
      ]} />
      <MansionRule label="register" />
      {b.engagements.map(e => (
        <div key={e.id} className="grid grid-cols-[100px_1fr_120px_100px_80px] gap-3 border-b py-1 text-[11px]"
          style={{ borderColor: PRESIDENCY_DS.ruleSoft, fontFamily: 'ui-monospace, monospace' }}>
          <span style={{ color: PRESIDENCY_DS.goldLeaf }}>{e.id}</span>
          <span style={{ color: PRESIDENCY_DS.parchmentInk }}>{e.partner}</span>
          <span className="uppercase tracking-[0.16em]" style={{ color: PRESIDENCY_DS.gold }}>{e.kind}</span>
          <span className="uppercase tracking-[0.16em]"
            style={{ color: e.status === 'live' ? PRESIDENCY_DS.jade : e.status === 'scheduled' ? PRESIDENCY_DS.gold : PRESIDENCY_DS.mut }}>{e.status}</span>
          <span className="text-right tabular-nums" style={{ color: PRESIDENCY_DS.mut }}>{e.daysAhead >= 0 ? `+${e.daysAhead}d` : `${e.daysAhead}d`}</span>
        </div>
      ))}
    </MansionFrame>
  );
}

export function StateVisits({ id, now }: { id: string; now: number }) {
  const b = presidencyBoard(now);
  void id;
  const visits = b.engagements.filter(e => e.kind === 'state-visit' || e.kind === 'summit');
  return (
    <MansionFrame archetype="engagements" code="SE-VIS-11" title="State Visits"
      subtitle="inbound & outbound state visits / summits">
      <MansionKpi items={[
        { label: 'State visits', value: visits.length, tone: 'info' },
        { label: 'Inbound (planning)', value: visits.filter(v => v.status === 'planning').length },
        { label: 'Concluded YTD', value: visits.filter(v => v.status === 'concluded').length, tone: 'ok' },
        { label: 'Foreign Affairs liaison', value: '✓ active', tone: 'ok' },
      ]} />
      <MansionCallout kicker="concealment doctrine" body="Every state visit publishes a public itinerary and an open summary within 14 days. Concealment of foreign engagements is constitutionally void." />
    </MansionFrame>
  );
}

export function DiplomaticCalls({ id, now }: { id: string; now: number }) {
  const b = presidencyBoard(now);
  void id;
  const calls = b.engagements.filter(e => e.kind === 'diplomatic-call' || e.kind === 'bilateral' || e.kind === 'multilateral');
  return (
    <MansionFrame archetype="engagements" code="SE-CAL-12" title="Diplomatic Calls"
      subtitle="presidential bilateral & multilateral calls">
      <MansionKpi items={[
        { label: 'Calls (period)', value: calls.length },
        { label: 'Bilateral', value: calls.filter(c => c.kind === 'bilateral').length, tone: 'info' },
        { label: 'Multilateral', value: calls.filter(c => c.kind === 'multilateral').length },
        { label: 'Readouts published', value: '✓ within 7d', tone: 'ok' },
      ]} />
      <MansionRule label="recent calls" />
      {calls.slice(0, 6).map(c => (
        <div key={c.id} className="grid grid-cols-[100px_1fr_140px] gap-3 border-b py-1 text-[11px]"
          style={{ borderColor: PRESIDENCY_DS.ruleSoft, fontFamily: 'ui-monospace, monospace' }}>
          <span style={{ color: PRESIDENCY_DS.goldLeaf }}>{c.id}</span>
          <span style={{ color: PRESIDENCY_DS.parchmentInk }}>{c.partner}</span>
          <span className="text-right uppercase tracking-[0.16em]" style={{ color: PRESIDENCY_DS.gold }}>{c.kind}</span>
        </div>
      ))}
    </MansionFrame>
  );
}

export function SecurityCouncil({ id, now }: { id: string; now: number }) {
  const ts = now / 4000;
  void id;
  const seats = ['President (chair)', 'Vice-President', 'Interior', 'Defence', 'Foreign Affairs', 'Justice', 'Emergency Response', 'Police Command'];
  return (
    <MansionFrame archetype="security" code="SC-COU-13" title="National Security Council"
      subtitle="presidential security cabinet · §2.5">
      <MansionKpi items={[
        { label: 'Council seats', value: seats.length },
        { label: 'Last convened', value: `${Math.round(wave('sc:l', ts, 1, 21))}d ago`, tone: 'info' },
        { label: 'Threat posture', value: 'STEADY', tone: 'ok' },
        { label: 'Civilian chair', value: '✓ President', tone: 'ok' },
      ]} />
      <MansionRule label="council seats" />
      {seats.map((s, i) => (
        <div key={s} className="grid grid-cols-[1fr_120px] gap-3 border-b py-1 text-[11px]"
          style={{ borderColor: PRESIDENCY_DS.ruleSoft, fontFamily: 'ui-monospace, monospace' }}>
          <span style={{ color: PRESIDENCY_DS.parchmentInk }}>{s}</span>
          <span className="text-right uppercase tracking-[0.16em]" style={{ color: i === 0 ? PRESIDENCY_DS.goldLeaf : PRESIDENCY_DS.jade }}>{i === 0 ? 'CHAIR' : '✓ ACTIVE'}</span>
        </div>
      ))}
      <MansionCallout kicker="civilian supremacy" body="The Security Council is chaired by a civilian (the President). Military officers attend but do not vote. Civilian supremacy over the military is non-negotiable." />
    </MansionFrame>
  );
}

export function NationalStrategy({ id, now }: { id: string; now: number }) {
  const ts = now / 4000;
  void id;
  const pillars = ['Sovereign capability', 'Continental posture', 'Cyber & digital fabric', 'Civil resilience', 'Climate & energy'];
  return (
    <MansionFrame archetype="security" code="SC-STR-14" title="National Strategy"
      subtitle="long-horizon strategic posture">
      <MansionKpi items={[
        { label: 'Strategy version', value: 'NSS-2025', tone: 'info' },
        { label: 'Pillars', value: pillars.length },
        { label: 'Review cycle', value: '24mo', tone: 'ok' },
        { label: 'Public summary', value: '✓ published', tone: 'ok' },
      ]} />
      <MansionRule label="strategic pillars" />
      {pillars.map((p, i) => {
        const v = Math.round(wave(`ns:p:${i}`, ts, 58, 92));
        return <MansionBar key={p} label={p} pct={v} tone={v >= 75 ? 'ok' : v >= 55 ? 'warn' : 'alert'} tail={`${v}% maturity`} />;
      })}
    </MansionFrame>
  );
}

export function ContinuityOfGovernment({ id, now }: { id: string; now: number }) {
  const ts = now / 4000;
  void id;
  return (
    <MansionFrame archetype="security" code="SC-COG-15" title="Continuity of Government"
      subtitle="continuity-of-government posture">
      <MansionKpi items={[
        { label: 'Posture', value: 'STEADY', tone: 'ok' },
        { label: 'Succession order', value: 'asserted', tone: 'ok' },
        { label: 'Last exercise', value: `${Math.round(wave('cg:l', ts, 30, 180))}d ago` },
        { label: 'Civilian command', value: '✓ asserted', tone: 'ok' },
      ]} />
      <MansionCallout kicker="continuity doctrine" body="In any contingency, civilian command continues without interruption. The succession order is publicly known; covert continuity arrangements are constitutionally void." />
    </MansionFrame>
  );
}

export function MinisterialCorps({ id, now }: { id: string; now: number }) {
  const b = presidencyBoard(now);
  void id;
  return (
    <MansionFrame archetype="ministers" code="MN-COR-16" title="Ministerial Corps"
      subtitle="per-minister dossier · §2.6">
      <MansionKpi items={[
        { label: 'Ministers', value: b.ministers.length, tone: 'info' },
        { label: 'Active', value: b.ministers.filter(m => m.presence === 'active').length, tone: 'ok' },
        { label: 'On leave', value: b.ministers.filter(m => m.presence === 'on-leave').length, tone: 'warn' },
        { label: 'Travelling', value: b.ministers.filter(m => m.presence === 'travelling').length },
      ]} />
      <MansionRule label="ministers" />
      {b.ministers.map(m => (
        <div key={m.id} className="grid grid-cols-[80px_180px_180px_110px_100px] gap-3 border-b py-1 text-[11px]"
          style={{ borderColor: PRESIDENCY_DS.ruleSoft, fontFamily: 'ui-monospace, monospace' }}>
          <span style={{ color: PRESIDENCY_DS.goldLeaf }}>{m.id}</span>
          <span style={{ color: PRESIDENCY_DS.parchmentInk }}>{m.name}</span>
          <span style={{ color: PRESIDENCY_DS.parchmentInk }}>{m.ministry}</span>
          <span className="uppercase tracking-[0.16em]"
            style={{ color: m.presence === 'active' ? PRESIDENCY_DS.jade : m.presence === 'on-leave' ? PRESIDENCY_DS.gold : PRESIDENCY_DS.parchment }}>● {m.presence}</span>
          <span className="text-right tabular-nums" style={{ color: PRESIDENCY_DS.mut }}>{m.termMonthsRemaining}mo</span>
        </div>
      ))}
    </MansionFrame>
  );
}

export function AppointmentsBoard({ id, now }: { id: string; now: number }) {
  const ts = now / 4000;
  void id;
  const pending = ['Auditor-General', 'Solicitor-General', 'Central Bank Governor', 'Ambassador (Pacific)'];
  return (
    <MansionFrame archetype="ministers" code="MN-APP-17" title="Appointments Board"
      subtitle="active appointments awaiting Senate concurrence">
      <MansionKpi items={[
        { label: 'Pending nominations', value: pending.length, tone: 'info' },
        { label: 'Senate concurrence rate', value: `${Math.round(wave('mn:c', ts, 78, 96))}%`, tone: 'ok' },
        { label: 'Mean vet days', value: `${Math.round(wave('mn:v', ts, 14, 42))}d` },
        { label: 'Public vetting', value: '✓ open', tone: 'ok' },
      ]} />
      <MansionRule label="nominations" />
      {pending.map((p, i) => (
        <div key={p} className="grid grid-cols-[1fr_120px_100px] gap-3 border-b py-1 text-[11px]"
          style={{ borderColor: PRESIDENCY_DS.ruleSoft, fontFamily: 'ui-monospace, monospace' }}>
          <span style={{ color: PRESIDENCY_DS.parchmentInk }}>{p}</span>
          <span style={{ color: PRESIDENCY_DS.gold }}>Senate vetting</span>
          <span className="text-right tabular-nums" style={{ color: PRESIDENCY_DS.mut }}>{Math.round(wave(`mn:p:${i}`, ts, 4, 28))}d</span>
        </div>
      ))}
    </MansionFrame>
  );
}

export function RotationSchedule({ id, now }: { id: string; now: number }) {
  const ts = now / 4000;
  void id;
  return (
    <MansionFrame archetype="ministers" code="MN-ROT-18" title="Rotation Schedule"
      subtitle="cabinet rotation & end-of-term">
      <MansionKpi items={[
        { label: 'Term cycle', value: '48 mo' },
        { label: 'Next rotation', value: `${Math.round(wave('rs:n', ts, 4, 36))}mo`, tone: 'info' },
        { label: 'Mid-term review', value: '✓ public', tone: 'ok' },
        { label: 'Forced reshuffles', value: 0, tone: 'ok' },
      ]} />
      <MansionCallout kicker="cabinet-purge doctrine" body="Mass removal of ministers without cause is a cabinet-purge and is constitutionally void. Each individual removal must be reasoned and recorded." />
    </MansionFrame>
  );
}

export function CitizenAddress({ id, now }: { id: string; now: number }) {
  const ts = now / 4000;
  void id;
  return (
    <MansionFrame archetype="address" code="AD-CIT-19" title="Citizen Address"
      subtitle="citizen-facing addresses · §2.7">
      <MansionKpi items={[
        { label: 'Addresses this quarter', value: Math.round(wave('ca:q', ts, 4, 16)), tone: 'info' },
        { label: 'Audience reach (M)', value: (wave('ca:r', ts, 4, 28)).toFixed(1), tone: 'ok' },
        { label: 'Captioned & translated', value: '✓ all', tone: 'ok' },
        { label: 'Public archive', value: '✓ open', tone: 'ok' },
      ]} />
      <MansionCallout kicker="open address doctrine" body="Every presidential address is captioned, translated to all sovereign languages, and archived in the public record. No address is sealed." />
    </MansionFrame>
  );
}

export function PublicEngagements({ id, now }: { id: string; now: number }) {
  const ts = now / 4000;
  void id;
  const venues = ['Town hall (Capital)', 'Town hall (Northern)', 'Town hall (Coastal)', 'University address', 'Civic society forum'];
  return (
    <MansionFrame archetype="address" code="AD-ENG-20" title="Public Engagements"
      subtitle="town halls, fora & public engagements">
      <MansionKpi items={[
        { label: 'Engagements / quarter', value: venues.length },
        { label: 'Audience served', value: `${Math.round(wave('pe:a', ts, 12, 80))}k`, tone: 'ok' },
        { label: 'Q&A unfiltered', value: '✓', tone: 'ok' },
        { label: 'Regional balance', value: '✓ all regions', tone: 'ok' },
      ]} />
      <MansionRule label="upcoming engagements" />
      {venues.map((v, i) => (
        <div key={v} className="grid grid-cols-[1fr_120px] gap-3 border-b py-1 text-[11px]"
          style={{ borderColor: PRESIDENCY_DS.ruleSoft, fontFamily: 'ui-monospace, monospace' }}>
          <span style={{ color: PRESIDENCY_DS.parchmentInk }}>{v}</span>
          <span className="text-right tabular-nums" style={{ color: PRESIDENCY_DS.mut }}>+{Math.round(wave(`pe:v:${i}`, ts, 7, 90))}d</span>
        </div>
      ))}
    </MansionFrame>
  );
}
