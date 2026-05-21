'use client';

// NOC domains — Situation Room + Ministry Posture surfaces.

import * as React from 'react';
import { nocBoard } from '@/lib/gov/noc-engine';
import { SituationFrame, SituationKpi, SituationRule, SituationBar, SituationCallout, NOC_DS } from '@/apps/noc/design-system/noc-ds';
import { wave } from '@/lib/telemetry';

export function SituationRoom({ id, now }: { id: string; now: number }) {
  const b = nocBoard(now);
  void id;
  return (
    <SituationFrame archetype="situation" code="SR-RUN-01" title="Situation Room"
      subtitle="live national operational picture" posture={b.posture}>
      <SituationKpi items={[
        { label: 'National readiness', value: `${b.nationalReadiness}/100`, tone: b.nationalReadiness >= 80 ? 'ok' : b.nationalReadiness >= 65 ? 'warn' : 'alert' },
        { label: 'Active incidents', value: b.incidents.length, tone: 'info' },
        { label: 'Major / national', value: b.incidents.filter(i => i.severity === 'major' || i.severity === 'national').length, tone: 'alert' },
        { label: 'Cabinet sync', value: `${b.cabinetSyncMin}m ago`, tone: 'ok' },
      ]} />
      <SituationRule label="ministry posture (15)" />
      {b.ministries.slice(0, 8).map(m => (
        <SituationBar key={m.ministry} label={m.ministry} pct={m.operational}
          tone={m.posture === 'crisis' ? 'alert' : m.posture === 'elevated' ? 'warn' : 'ok'}
          tail={`${m.inFlightIncidents} incidents`} />
      ))}
      <SituationCallout kicker="civilian command" body="The NOC observes & coordinates — it does not command. Operational orders remain with the constitutional lead ministry. Cabinet decides; NOC informs." />
    </SituationFrame>
  );
}

export function NationalReadiness({ id, now }: { id: string; now: number }) {
  const b = nocBoard(now);
  const ts = now / 4000;
  void id;
  const dims = ['Operational', 'Logistical', 'Information', 'Continuity', 'Civic confidence'];
  return (
    <SituationFrame archetype="situation" code="SR-RDY-02" title="National Readiness"
      subtitle="aggregate readiness index" posture={b.posture}>
      <SituationKpi items={[
        { label: 'Overall', value: `${b.nationalReadiness}/100`, tone: b.nationalReadiness >= 80 ? 'ok' : 'warn' },
        { label: 'Posture', value: b.posture.toUpperCase(), tone: b.posture === 'national-emergency' ? 'alert' : 'info' },
        { label: 'Cabinet sync', value: `${b.cabinetSyncMin}m`, tone: 'ok' },
        { label: 'Public briefing', value: `${b.publicBriefing.lastPublishedMin}m ago`, tone: 'ok' },
      ]} />
      <SituationRule label="readiness dimensions" />
      {dims.map((d, i) => {
        const v = Math.round(wave(`rd:${i}`, ts, 62, 96));
        return <SituationBar key={d} label={d} pct={v} tone={v >= 80 ? 'ok' : v >= 60 ? 'warn' : 'alert'} tail={`${v}%`} />;
      })}
    </SituationFrame>
  );
}

export function CabinetSync({ id, now }: { id: string; now: number }) {
  const b = nocBoard(now);
  void id;
  return (
    <SituationFrame archetype="situation" code="SR-CAB-03" title="Cabinet Sync"
      subtitle="cadence with Presidency / Cabinet">
      <SituationKpi items={[
        { label: 'Last sync', value: `${b.cabinetSyncMin}m ago`, tone: 'ok' },
        { label: 'Target cadence', value: '≤ 60m', tone: 'info' },
        { label: 'Decisions routed (week)', value: b.decisions.filter(d => d.status === 'cabinet-decided').length, tone: 'ok' },
        { label: 'Bypass attempts', value: 0, tone: 'ok' },
      ]} />
      <SituationCallout kicker="non-substitution" body="The NOC routes — it does not decide. Every coordination decision must be ratified by Cabinet within 168 hours or it lapses." />
    </SituationFrame>
  );
}

export function CrossDomainFabric({ id, now }: { id: string; now: number }) {
  const ts = now / 4000;
  void id;
  const fabrics = ['Energy × Health', 'Climate × Agriculture', 'Cyber × Finance', 'Foreign × Transport', 'Justice × Communications'];
  return (
    <SituationFrame archetype="situation" code="SR-XDF-04" title="Cross-Domain Fabric"
      subtitle="cross-ministry signal correlations">
      <SituationKpi items={[
        { label: 'Active fabrics', value: fabrics.length, tone: 'info' },
        { label: 'Signals fused / hr', value: Math.round(wave('xd:s', ts, 240, 1480)).toLocaleString() },
        { label: 'False positives', value: `${Math.round(wave('xd:f', ts, 2, 12))}%`, tone: 'warn' },
        { label: 'Open coordinations', value: 4 },
      ]} />
      <SituationRule label="correlations" />
      {fabrics.map((f, i) => {
        const v = Math.round(wave(`xd:${i}`, ts, 28, 94));
        return <SituationBar key={f} label={f} pct={v} tone={v >= 70 ? 'warn' : 'info'} tail={`${v}% correlation`} />;
      })}
    </SituationFrame>
  );
}

export function MinistryPosture({ id, now }: { id: string; now: number }) {
  const b = nocBoard(now);
  void id;
  return (
    <SituationFrame archetype="ministries" code="MP-PST-05" title="Ministry Posture"
      subtitle="per-ministry posture index" posture={b.posture}>
      <SituationKpi items={[
        { label: 'Ministries', value: b.ministries.length },
        { label: 'Steady', value: b.ministries.filter(m => m.posture === 'steady').length, tone: 'ok' },
        { label: 'Elevated', value: b.ministries.filter(m => m.posture === 'elevated').length, tone: 'warn' },
        { label: 'Crisis', value: b.ministries.filter(m => m.posture === 'crisis').length, tone: 'alert' },
      ]} />
      <SituationRule label="all 15 ministries" />
      {b.ministries.map(m => (
        <SituationBar key={m.ministry} label={m.ministry} pct={m.operational}
          tone={m.posture === 'crisis' ? 'alert' : m.posture === 'elevated' ? 'warn' : 'ok'}
          tail={`${m.inFlightIncidents} incidents`} />
      ))}
    </SituationFrame>
  );
}

export function MinistryContribution({ id, now }: { id: string; now: number }) {
  const b = nocBoard(now);
  void id;
  return (
    <SituationFrame archetype="ministries" code="MP-CON-06" title="Ministry Contribution"
      subtitle="contribution to national readiness">
      <SituationKpi items={[
        { label: 'Top contributor', value: b.ministries.reduce((a, c) => c.contributionToNational > a.contributionToNational ? c : a, b.ministries[0]!).ministry.toUpperCase(), tone: 'ok' },
        { label: 'Mean contribution', value: Math.round(b.ministries.reduce((s, m) => s + m.contributionToNational, 0) / b.ministries.length), tone: 'info' },
        { label: 'Lowest', value: b.ministries.reduce((a, c) => c.contributionToNational < a.contributionToNational ? c : a, b.ministries[0]!).contributionToNational, tone: 'warn' },
        { label: 'Variance band', value: '±18' },
      ]} />
      <SituationRule label="contribution index" />
      {b.ministries.sort((a, c) => c.contributionToNational - a.contributionToNational).slice(0, 10).map(m => (
        <SituationBar key={m.ministry} label={m.ministry} pct={m.contributionToNational}
          tone={m.contributionToNational >= 70 ? 'ok' : m.contributionToNational >= 50 ? 'warn' : 'alert'}
          tail={`${m.contributionToNational}/100`} />
      ))}
    </SituationFrame>
  );
}

export function MinistryIncidents({ id, now }: { id: string; now: number }) {
  const b = nocBoard(now);
  void id;
  return (
    <SituationFrame archetype="ministries" code="MP-INC-07" title="Ministry Incidents"
      subtitle="incidents in flight per ministry">
      <SituationKpi items={[
        { label: 'Total in flight', value: b.ministries.reduce((s, m) => s + m.inFlightIncidents, 0), tone: 'info' },
        { label: 'Most loaded', value: b.ministries.reduce((a, c) => c.inFlightIncidents > a.inFlightIncidents ? c : a, b.ministries[0]!).ministry.toUpperCase(), tone: 'warn' },
        { label: 'Zero incidents', value: b.ministries.filter(m => m.inFlightIncidents === 0).length, tone: 'ok' },
        { label: 'Mean / ministry', value: (b.ministries.reduce((s, m) => s + m.inFlightIncidents, 0) / b.ministries.length).toFixed(1) },
      ]} />
      <SituationRule label="incidents per ministry" />
      {b.ministries.map(m => (
        <div key={m.ministry} className="grid grid-cols-[180px_1fr_60px] gap-3 border-b py-1 text-[11px]"
          style={{ borderColor: NOC_DS.ruleSoft, fontFamily: 'ui-monospace, monospace' }}>
          <span style={{ color: NOC_DS.cyan }}>{m.ministry}</span>
          <div className="h-1 self-center" style={{ background: NOC_DS.graphiteSoft }}>
            <div className="h-full" style={{ width: `${Math.min(100, m.inFlightIncidents * 12)}%`, background: m.inFlightIncidents >= 6 ? NOC_DS.crimson : m.inFlightIncidents >= 3 ? NOC_DS.amber : NOC_DS.jade }} />
          </div>
          <span className="text-right tabular-nums" style={{ color: NOC_DS.parchmentInk }}>{m.inFlightIncidents}</span>
        </div>
      ))}
    </SituationFrame>
  );
}
