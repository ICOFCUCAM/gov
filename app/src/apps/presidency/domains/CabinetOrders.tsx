'use client';

// Presidency domains — Cabinet floor + Executive orders + Resolutions surfaces.

import * as React from 'react';
import { presidencyBoard } from '@/lib/gov/presidency-engine';
import { MansionFrame, MansionKpi, MansionRule, MansionBar, MansionCallout, PRESIDENCY_DS } from '@/apps/presidency/design-system/presidency-ds';
import { wave } from '@/lib/telemetry';

export function CabinetFloor({ id, now }: { id: string; now: number }) {
  const b = presidencyBoard(now);
  void id;
  return (
    <MansionFrame archetype="cabinet" code="CB-FLR-01" title="Cabinet Floor"
      subtitle="live executive command · §2.1" posture={b.posture}>
      <MansionKpi items={[
        { label: 'Cabinet posture', value: b.posture.toUpperCase(), tone: b.posture === 'crisis-stewardship' ? 'alert' : 'info' },
        { label: 'Ministers active', value: b.ministers.filter(m => m.presence === 'active').length },
        { label: 'Approval index', value: `${b.approvalIndex}%`, tone: b.approvalIndex >= 60 ? 'ok' : 'warn' },
        { label: 'Cohesion', value: `${b.cabinetCohesion}%`, tone: b.cabinetCohesion >= 85 ? 'ok' : 'warn' },
      ]} />
      <MansionRule label="ministerial presence" />
      {b.ministers.slice(0, 8).map(m => (
        <div key={m.id} className="grid grid-cols-[80px_1fr_140px_120px] gap-3 border-b py-1 text-[11px]"
          style={{ borderColor: PRESIDENCY_DS.ruleSoft, fontFamily: 'ui-monospace, monospace' }}>
          <span style={{ color: PRESIDENCY_DS.goldLeaf }}>{m.id}</span>
          <span style={{ color: PRESIDENCY_DS.parchmentInk }}>{m.name} — {m.ministry}</span>
          <span style={{ color: m.presence === 'active' ? PRESIDENCY_DS.jade : m.presence === 'travelling' ? PRESIDENCY_DS.gold : PRESIDENCY_DS.mut }}>● {m.presence}</span>
          <span className="text-right" style={{ color: PRESIDENCY_DS.mut }}>{m.termMonthsRemaining}mo remaining</span>
        </div>
      ))}
      <MansionCallout kicker="constitutional doctrine" body="The President governs through Cabinet, not above it. Decisions on policy require collective responsibility; unilateral rule-by-decree is void." />
    </MansionFrame>
  );
}

export function CabinetPosture({ id, now }: { id: string; now: number }) {
  const b = presidencyBoard(now);
  const ts = now / 4000;
  void id;
  const dimensions = ['Public approval', 'Coalition cohesion', 'Media posture', 'Civil-society alignment', 'Diplomatic standing'];
  return (
    <MansionFrame archetype="cabinet" code="CB-PST-02" title="Cabinet Posture"
      subtitle="approval & alignment index" posture={b.posture}>
      <MansionKpi items={[
        { label: 'Approval index', value: `${b.approvalIndex}/100`, tone: b.approvalIndex >= 60 ? 'ok' : 'warn' },
        { label: 'Cohesion', value: `${b.cabinetCohesion}/100`, tone: b.cabinetCohesion >= 85 ? 'ok' : 'warn' },
        { label: 'Term horizon', value: `${Math.round(wave('pp:h', ts, 12, 48))} mo`, tone: 'info' },
        { label: 'Active resolutions', value: b.resolutions.length },
      ]} />
      <MansionRule label="posture dimensions" />
      {dimensions.map((d, i) => {
        const v = Math.round(wave(`pp:d:${i}`, ts, 38, 92));
        return <MansionBar key={d} label={d} pct={v} tone={v >= 70 ? 'ok' : v >= 50 ? 'warn' : 'alert'} tail={`${v}%`} />;
      })}
    </MansionFrame>
  );
}

export function CabinetCohesion({ id, now }: { id: string; now: number }) {
  const b = presidencyBoard(now);
  const ts = now / 4000;
  void id;
  return (
    <MansionFrame archetype="cabinet" code="CB-CHN-03" title="Cabinet Cohesion"
      subtitle="inter-ministry alignment metrics">
      <MansionKpi items={[
        { label: 'Cohesion score', value: `${b.cabinetCohesion}/100`, tone: 'ok' },
        { label: 'Open disagreements', value: Math.round(wave('cc:o', ts, 0, 4)), tone: 'warn' },
        { label: 'Resolved this week', value: Math.round(wave('cc:r', ts, 2, 8)), tone: 'ok' },
        { label: 'Cabinet quorum', value: '✓ achieved', tone: 'ok' },
      ]} />
      <MansionRule label="cross-ministry alignment" />
      {['Treasury × Health', 'Justice × Interior', 'Energy × Environment', 'Trade × Foreign Affairs', 'Education × Labour'].map((p, i) => {
        const v = Math.round(wave(`cc:p:${i}`, ts, 56, 96));
        return <MansionBar key={p} label={p} pct={v} tone={v >= 78 ? 'ok' : v >= 60 ? 'warn' : 'alert'} tail={`${v}% aligned`} />;
      })}
      <MansionCallout kicker="collective responsibility" body="Cabinet ministers carry collective responsibility for every adopted resolution. Public dissent after adoption breaches the doctrine and triggers a confidence test." />
    </MansionFrame>
  );
}

export function CabinetCalendar({ id, now }: { id: string; now: number }) {
  const ts = now / 4000;
  void id;
  const sittings = [
    { day: 'Monday', topic: 'Weekly cabinet sitting', kind: 'plenary' },
    { day: 'Wednesday', topic: 'Inter-ministerial committee', kind: 'committee' },
    { day: 'Friday', topic: 'National Security Council', kind: 'security' },
  ];
  return (
    <MansionFrame archetype="cabinet" code="CB-CAL-04" title="Cabinet Calendar"
      subtitle="weekly sitting & committee schedule">
      <MansionKpi items={[
        { label: 'Sittings / week', value: sittings.length },
        { label: 'Committees', value: 7 },
        { label: 'Attendance', value: `${Math.round(wave('cl:a', ts, 84, 99))}%`, tone: 'ok' },
        { label: 'Quarter sittings', value: Math.round(wave('cl:q', ts, 42, 64)) },
      ]} />
      <MansionRule label="this week" />
      {sittings.map((s, i) => (
        <div key={s.day} className="grid grid-cols-[110px_1fr_120px] gap-3 border-b py-1 text-[11px]"
          style={{ borderColor: PRESIDENCY_DS.ruleSoft, fontFamily: 'ui-monospace, monospace' }}>
          <span style={{ color: PRESIDENCY_DS.goldLeaf }}>{s.day}</span>
          <span style={{ color: PRESIDENCY_DS.parchmentInk }}>{s.topic}</span>
          <span className="text-right uppercase tracking-[0.16em]" style={{ color: PRESIDENCY_DS.mut }}>{s.kind}</span>
          {void i}
        </div>
      ))}
    </MansionFrame>
  );
}

export function ExecutiveOrders({ id, now }: { id: string; now: number }) {
  const b = presidencyBoard(now);
  void id;
  return (
    <MansionFrame archetype="orders" code="EO-REG-05" title="Executive Orders Register"
      subtitle="active executive orders · §2.2">
      <MansionKpi items={[
        { label: 'Active orders', value: b.orders.filter(o => o.status === 'in-force' || o.status === 'signed').length, tone: 'info' },
        { label: 'In drafting', value: b.orders.filter(o => o.status === 'drafting').length },
        { label: 'Under judicial review', value: b.orders.filter(o => o.status === 'judicial-review').length, tone: 'warn' },
        { label: 'Repealed', value: b.orders.filter(o => o.status === 'repealed').length, tone: 'mute' },
      ]} />
      <MansionRule label="orders" />
      {b.orders.map(o => (
        <div key={o.id} className="grid grid-cols-[90px_1fr_120px_70px_60px] gap-3 border-b py-1 text-[11px]"
          style={{ borderColor: PRESIDENCY_DS.ruleSoft, fontFamily: 'ui-monospace, monospace' }}>
          <span style={{ color: PRESIDENCY_DS.goldLeaf }}>{o.id}</span>
          <span style={{ color: PRESIDENCY_DS.parchmentInk }}>{o.title}</span>
          <span className="uppercase tracking-[0.16em]"
            style={{ color: o.status === 'in-force' ? PRESIDENCY_DS.jade : o.status === 'judicial-review' ? PRESIDENCY_DS.crimson : o.status === 'repealed' ? PRESIDENCY_DS.mut : PRESIDENCY_DS.gold }}>{o.status}</span>
          <span style={{ color: PRESIDENCY_DS.mut }}>{o.citation}</span>
          <span className="text-right tabular-nums" style={{ color: PRESIDENCY_DS.mut }}>{o.ageDays}d</span>
        </div>
      ))}
      <MansionCallout kicker="transparency doctrine" body="Every order is published in open form with rationale, fiscal impact, and constitutional citation. Sealed orders without rationale are void." />
    </MansionFrame>
  );
}

export function OrderDrafting({ id, now }: { id: string; now: number }) {
  const b = presidencyBoard(now);
  void id;
  const drafting = b.orders.filter(o => o.status === 'drafting' || o.status === 'cabinet-review');
  return (
    <MansionFrame archetype="orders" code="EO-DFT-06" title="Order Drafting"
      subtitle="drafting & cabinet-review workflow">
      <MansionKpi items={[
        { label: 'In drafting', value: drafting.length, tone: 'info' },
        { label: 'AG legality opinions pending', value: Math.max(1, Math.floor(drafting.length / 2)) },
        { label: 'Mean draft age', value: `${Math.round(drafting.reduce((s, o) => s + o.ageDays, 0) / Math.max(1, drafting.length))}d`, tone: 'warn' },
        { label: 'Awaiting signature', value: b.orders.filter(o => o.status === 'cabinet-review').length },
      ]} />
      <MansionRule label="drafting register" />
      {drafting.map(o => (
        <div key={o.id} className="grid grid-cols-[90px_1fr_120px_60px] gap-3 border-b py-1 text-[11px]"
          style={{ borderColor: PRESIDENCY_DS.ruleSoft, fontFamily: 'ui-monospace, monospace' }}>
          <span style={{ color: PRESIDENCY_DS.goldLeaf }}>{o.id}</span>
          <span style={{ color: PRESIDENCY_DS.parchmentInk }}>{o.title}</span>
          <span className="uppercase tracking-[0.16em]" style={{ color: PRESIDENCY_DS.gold }}>{o.status}</span>
          <span className="text-right tabular-nums" style={{ color: PRESIDENCY_DS.mut }}>{o.ageDays}d</span>
        </div>
      ))}
    </MansionFrame>
  );
}

export function OrderArchive({ id, now }: { id: string; now: number }) {
  const b = presidencyBoard(now);
  void id;
  const archived = b.orders.filter(o => o.status === 'repealed' || o.status === 'in-force');
  return (
    <MansionFrame archetype="orders" code="EO-ARC-07" title="Order Archive"
      subtitle="historical & repealed orders">
      <MansionKpi items={[
        { label: 'In force', value: archived.filter(o => o.status === 'in-force').length, tone: 'ok' },
        { label: 'Repealed', value: archived.filter(o => o.status === 'repealed').length, tone: 'mute' },
        { label: 'Mean age', value: `${Math.round(archived.reduce((s, o) => s + o.ageDays, 0) / Math.max(1, archived.length))}d` },
        { label: 'Searchable', value: '✓ public', tone: 'ok' },
      ]} />
      <MansionCallout kicker="archive doctrine" body="The Order Archive is permanently searchable by citizens. Removal or alteration of an archived order requires a constitutional ruling." />
    </MansionFrame>
  );
}

export function CabinetResolutions({ id, now }: { id: string; now: number }) {
  const b = presidencyBoard(now);
  void id;
  return (
    <MansionFrame archetype="resolutions" code="CR-REG-08" title="Cabinet Resolutions"
      subtitle="active resolutions · §2.3">
      <MansionKpi items={[
        { label: 'Active', value: b.resolutions.length, tone: 'info' },
        { label: 'In debate', value: b.resolutions.filter(r => r.stage === 'debate').length },
        { label: 'Adopted', value: b.resolutions.filter(r => r.stage === 'adopted').length, tone: 'ok' },
        { label: 'Tabled-again', value: b.resolutions.filter(r => r.stage === 'tabled-again').length, tone: 'warn' },
      ]} />
      <MansionRule label="resolutions" />
      {b.resolutions.map(r => (
        <div key={r.id} className="grid grid-cols-[100px_1fr_110px_120px_60px] gap-3 border-b py-1 text-[11px]"
          style={{ borderColor: PRESIDENCY_DS.ruleSoft, fontFamily: 'ui-monospace, monospace' }}>
          <span style={{ color: PRESIDENCY_DS.goldLeaf }}>{r.id}</span>
          <span style={{ color: PRESIDENCY_DS.parchmentInk }}>{r.topic}</span>
          <span className="uppercase tracking-[0.16em]"
            style={{ color: r.stage === 'adopted' ? PRESIDENCY_DS.jade : r.stage === 'tabled-again' ? PRESIDENCY_DS.crimson : PRESIDENCY_DS.gold }}>{r.stage}</span>
          <span className="tabular-nums" style={{ color: PRESIDENCY_DS.mut }}>{r.ministersFor} for · {r.ministersAgainst} against</span>
          <span className="text-right tabular-nums" style={{ color: PRESIDENCY_DS.mut }}>{r.ageDays}d</span>
        </div>
      ))}
    </MansionFrame>
  );
}

export function ResolutionDebate({ id, now }: { id: string; now: number }) {
  const b = presidencyBoard(now);
  void id;
  const debating = b.resolutions.filter(r => r.stage === 'debate' || r.stage === 'concurrence');
  return (
    <MansionFrame archetype="resolutions" code="CR-DBT-09" title="Resolution Debate"
      subtitle="in active debate or concurrence">
      <MansionKpi items={[
        { label: 'Under debate', value: b.resolutions.filter(r => r.stage === 'debate').length },
        { label: 'In concurrence', value: b.resolutions.filter(r => r.stage === 'concurrence').length, tone: 'info' },
        { label: 'Mean debate age', value: `${Math.round(debating.reduce((s, r) => s + r.ageDays, 0) / Math.max(1, debating.length))}d`, tone: 'warn' },
        { label: '⅔ threshold', value: '10/15 ministers', tone: 'ok' },
      ]} />
      <MansionCallout kicker="quorum & threshold" body="A resolution requires two-thirds Cabinet concurrence for adoption. Dissenting ministers may record a sealed dissent in the public record." />
    </MansionFrame>
  );
}
