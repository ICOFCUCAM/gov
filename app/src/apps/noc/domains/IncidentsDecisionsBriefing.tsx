'use client';

// NOC domains — Incidents, Decisions, Briefing surfaces.

import * as React from 'react';
import { nocBoard } from '@/lib/gov/noc-engine';
import { SituationFrame, SituationKpi, SituationRule, SituationBar, SituationCallout, NOC_DS } from '@/apps/noc/design-system/noc-ds';
import { wave } from '@/lib/telemetry';

export function IncidentFloor({ id, now }: { id: string; now: number }) {
  const b = nocBoard(now);
  void id;
  return (
    <SituationFrame archetype="incidents" code="IF-FLR-08" title="Incident Floor"
      subtitle="all active incidents · cross-ministry" posture={b.posture}>
      <SituationKpi items={[
        { label: 'Total incidents', value: b.incidents.length, tone: 'info' },
        { label: 'Watch', value: b.incidents.filter(i => i.severity === 'watch').length },
        { label: 'Major', value: b.incidents.filter(i => i.severity === 'major').length, tone: 'warn' },
        { label: 'National', value: b.incidents.filter(i => i.severity === 'national').length, tone: 'alert' },
      ]} />
      <SituationRule label="register" />
      {b.incidents.map(i => (
        <div key={i.id} className="grid grid-cols-[100px_100px_120px_120px_120px_60px] gap-3 border-b py-1 text-[11px]"
          style={{ borderColor: NOC_DS.ruleSoft, fontFamily: 'ui-monospace, monospace' }}>
          <span style={{ color: NOC_DS.cyan }}>{i.id}</span>
          <span className="uppercase tracking-[0.16em]" style={{ color: NOC_DS.amber }}>{i.category}</span>
          <span className="uppercase tracking-[0.16em]" style={{ color: NOC_DS.parchmentInk }}>{i.scope}</span>
          <span className="uppercase tracking-[0.16em]"
            style={{ color: i.severity === 'national' ? NOC_DS.crimson : i.severity === 'major' ? NOC_DS.amber : i.severity === 'minor' ? NOC_DS.cyan : NOC_DS.mut }}>● {i.severity}</span>
          <span style={{ color: NOC_DS.mut }}>{i.leadMinistry}</span>
          <span className="text-right tabular-nums" style={{ color: NOC_DS.mut }}>{i.ageMin}m</span>
        </div>
      ))}
    </SituationFrame>
  );
}

export function MajorIncidents({ id, now }: { id: string; now: number }) {
  const b = nocBoard(now);
  void id;
  const major = b.incidents.filter(i => i.severity === 'major' || i.severity === 'national');
  return (
    <SituationFrame archetype="incidents" code="IF-MAJ-09" title="Major Incidents"
      subtitle="major & national-severity incidents" posture={b.posture}>
      <SituationKpi items={[
        { label: 'Major', value: major.filter(i => i.severity === 'major').length, tone: 'warn' },
        { label: 'National', value: major.filter(i => i.severity === 'national').length, tone: 'alert' },
        { label: 'Mean age', value: `${Math.round(major.reduce((s, m) => s + m.ageMin, 0) / Math.max(1, major.length))}m` },
        { label: 'Cabinet briefed', value: '✓ every 60m', tone: 'ok' },
      ]} />
      {major.length === 0 ? (
        <SituationCallout kicker="steady" body="No major or national incidents in flight. The watch continues; routine coordination only." />
      ) : (
        <SituationRule label="major incidents" />
      )}
      {major.map(i => (
        <div key={i.id} className="grid grid-cols-[100px_120px_120px_140px_80px] gap-3 border-b py-1 text-[11px]"
          style={{ borderColor: NOC_DS.ruleSoft, fontFamily: 'ui-monospace, monospace' }}>
          <span style={{ color: NOC_DS.cyan }}>{i.id}</span>
          <span className="uppercase tracking-[0.16em]" style={{ color: NOC_DS.amber }}>{i.category}</span>
          <span className="uppercase tracking-[0.16em]"
            style={{ color: i.severity === 'national' ? NOC_DS.crimson : NOC_DS.amber }}>● {i.severity}</span>
          <span style={{ color: NOC_DS.parchmentInk }}>{i.leadMinistry}</span>
          <span className="text-right tabular-nums" style={{ color: NOC_DS.mut }}>{i.ageMin}m</span>
        </div>
      ))}
    </SituationFrame>
  );
}

export function RegionalRollup({ id, now }: { id: string; now: number }) {
  const ts = now / 4000;
  void id;
  const regions = ['Capital', 'Northern', 'Eastern', 'Western', 'Coastal', 'Highland', 'Polar'];
  return (
    <SituationFrame archetype="incidents" code="IF-REG-10" title="Regional Rollup"
      subtitle="incidents rolled up by region">
      <SituationKpi items={[
        { label: 'Regions tracked', value: regions.length, tone: 'info' },
        { label: 'Elevated regions', value: Math.round(wave('rr:e', ts, 0, 3)), tone: 'warn' },
        { label: 'Crisis regions', value: Math.round(wave('rr:c', ts, 0, 1)), tone: 'alert' },
        { label: 'Mean readiness', value: `${Math.round(wave('rr:m', ts, 72, 92))}%`, tone: 'ok' },
      ]} />
      <SituationRule label="regions" />
      {regions.map((r, i) => {
        const v = Math.round(wave(`rr:${i}`, ts, 58, 96));
        return <SituationBar key={r} label={r} pct={v} tone={v >= 80 ? 'ok' : v >= 65 ? 'warn' : 'alert'}
          tail={`${Math.round(wave(`rr:n:${i}`, ts, 0, 6))} incidents`} />;
      })}
    </SituationFrame>
  );
}

export function CoordinationDecisions({ id, now }: { id: string; now: number }) {
  const b = nocBoard(now);
  void id;
  return (
    <SituationFrame archetype="decisions" code="CD-DEC-11" title="Coordination Decisions"
      subtitle="active NOC coordination decisions">
      <SituationKpi items={[
        { label: 'Active', value: b.decisions.length, tone: 'info' },
        { label: 'Observing', value: b.decisions.filter(d => d.status === 'observing').length },
        { label: 'Coordinating', value: b.decisions.filter(d => d.status === 'coordinating').length, tone: 'warn' },
        { label: 'Routed to Cabinet', value: b.decisions.filter(d => d.status === 'cabinet-decided' || d.status === 'recommendation-published').length, tone: 'ok' },
      ]} />
      <SituationRule label="decisions" />
      {b.decisions.map(d => (
        <div key={d.id} className="grid grid-cols-[120px_1fr_140px_120px_60px] gap-3 border-b py-1 text-[11px]"
          style={{ borderColor: NOC_DS.ruleSoft, fontFamily: 'ui-monospace, monospace' }}>
          <span style={{ color: NOC_DS.cyan }}>{d.id}</span>
          <span style={{ color: NOC_DS.parchmentInk }}>{d.topic}</span>
          <span style={{ color: NOC_DS.mut }}>{d.cabinetOwner}</span>
          <span className="uppercase tracking-[0.16em]"
            style={{ color: d.status === 'cabinet-decided' ? NOC_DS.jade : d.status === 'recommendation-published' ? NOC_DS.cyan : d.status === 'coordinating' ? NOC_DS.amber : NOC_DS.mut }}>● {d.status}</span>
          <span className="text-right tabular-nums" style={{ color: NOC_DS.mut }}>{d.ageHrs}h</span>
        </div>
      ))}
    </SituationFrame>
  );
}

export function RecommendationsPublished({ id, now }: { id: string; now: number }) {
  const b = nocBoard(now);
  void id;
  const published = b.decisions.filter(d => d.status === 'recommendation-published' || d.status === 'cabinet-decided');
  return (
    <SituationFrame archetype="decisions" code="CD-REC-12" title="Recommendations"
      subtitle="published recommendations with rationale">
      <SituationKpi items={[
        { label: 'Published', value: published.length, tone: 'info' },
        { label: 'With rationale', value: published.filter(d => d.rationalePublic).length, tone: 'ok' },
        { label: 'Cabinet-decided', value: published.filter(d => d.status === 'cabinet-decided').length },
        { label: 'Public access', value: '✓ open', tone: 'ok' },
      ]} />
      <SituationCallout kicker="rationale doctrine" body="Every recommendation publishes its rationale, the signals that triggered it, and the alternatives considered. Reasoning-free recommendations are forbidden." />
    </SituationFrame>
  );
}

export function CabinetRouted({ id, now }: { id: string; now: number }) {
  const b = nocBoard(now);
  void id;
  const routed = b.decisions.filter(d => d.status === 'recommendation-published' || d.status === 'cabinet-decided');
  return (
    <SituationFrame archetype="decisions" code="CD-CAB-13" title="Cabinet-Routed"
      subtitle="recommendations routed to Cabinet">
      <SituationKpi items={[
        { label: 'Routed (week)', value: routed.length, tone: 'info' },
        { label: 'Cabinet-decided', value: routed.filter(d => d.status === 'cabinet-decided').length, tone: 'ok' },
        { label: 'Median time-to-decision', value: `${Math.round(routed.reduce((s, r) => s + r.ageHrs, 0) / Math.max(1, routed.length))}h` },
        { label: 'Lapsed (>168h)', value: 0, tone: 'ok' },
      ]} />
      <SituationCallout kicker="cabinet ratification" body="The NOC routes — the Cabinet decides. Recommendations not ratified within 168 hours automatically lapse. The NOC cannot extend its own authority." />
    </SituationFrame>
  );
}

export function PublicBriefing({ id, now }: { id: string; now: number }) {
  const b = nocBoard(now);
  void id;
  return (
    <SituationFrame archetype="briefing" code="PB-BRF-14" title="Public Briefing"
      subtitle="live citizen briefing">
      <SituationKpi items={[
        { label: 'Last published', value: `${b.publicBriefing.lastPublishedMin}m ago`, tone: b.publicBriefing.lastPublishedMin < 240 ? 'ok' : 'warn' },
        { label: 'Cadence', value: `every ${Math.round(b.publicBriefing.cadenceMin / 60)}h`, tone: 'info' },
        { label: 'Languages', value: 5, tone: 'ok' },
        { label: 'Citizen reach (M)', value: '12.4', tone: 'ok' },
      ]} />
      <SituationCallout kicker="open posture" body="The NOC briefs the public every 6 hours, regardless of posture. Citizens learn from the NOC, not from speculation. Cabinet may add but never silence." />
    </SituationFrame>
  );
}

export function BriefingArchive({ id, now }: { id: string; now: number }) {
  const ts = now / 4000;
  void id;
  return (
    <SituationFrame archetype="briefing" code="PB-ARC-15" title="Briefing Archive"
      subtitle="every historical briefing, searchable">
      <SituationKpi items={[
        { label: 'Briefings (year)', value: Math.round(wave('ba:y', ts, 1200, 1460)).toLocaleString(), tone: 'info' },
        { label: 'Searchable', value: '✓ open', tone: 'ok' },
        { label: 'Median publish lag', value: `${Math.round(wave('ba:l', ts, 1, 12))}m` },
        { label: 'Removed / amended', value: '0 silent', tone: 'ok' },
      ]} />
      <SituationCallout kicker="archive doctrine" body="The briefing archive is permanently searchable. Amendments are visible as amendments — silent edits are constitutionally void." />
    </SituationFrame>
  );
}

export function PublicArchiveStream({ id, now }: { id: string; now: number }) {
  const ts = now / 4000;
  void id;
  return (
    <SituationFrame archetype="briefing" code="PB-PUB-30" title="Public Archive Stream"
      subtitle="live citizen archive — every briefing, instantly">
      <SituationKpi items={[
        { label: 'Stream uptime', value: `${Math.round(wave('pa:u', ts, 99.4, 99.99) * 100) / 100}%`, tone: 'ok' },
        { label: 'Subscribers (citizen)', value: Math.round(wave('pa:s', ts, 240000, 1200000)).toLocaleString(), tone: 'info' },
        { label: 'Median publish lag', value: `${Math.round(wave('pa:l', ts, 1, 8))}s`, tone: 'ok' },
        { label: 'Open formats', value: 'RSS · ATOM · JSON', tone: 'ok' },
      ]} />
      <SituationCallout kicker="citizen access" body="The archive is open by default and exportable in machine-readable formats. Any citizen, journalist, or auditor may subscribe; the NOC may not throttle access." />
    </SituationFrame>
  );
}

export function Translations({ id, now }: { id: string; now: number }) {
  const ts = now / 4000;
  void id;
  const langs = ['Lingua Franca', 'Northern Tongue', 'Eastern Script', 'Coastal Creole', 'Highland Dialect'];
  return (
    <SituationFrame archetype="briefing" code="PB-TRA-16" title="Translations"
      subtitle="multi-language briefing pipeline">
      <SituationKpi items={[
        { label: 'Languages', value: langs.length, tone: 'info' },
        { label: 'Mean translation lag', value: `${Math.round(wave('tr:l', ts, 1, 16))}m`, tone: 'ok' },
        { label: 'Human-reviewed', value: '✓ all', tone: 'ok' },
        { label: 'Accessibility (sign-lang)', value: '✓ live', tone: 'ok' },
      ]} />
      <SituationRule label="languages" />
      {langs.map((l, i) => {
        const v = Math.round(wave(`tr:${i}`, ts, 92, 100));
        return <SituationBar key={l} label={l} pct={v} tone={v >= 98 ? 'ok' : 'warn'} tail={`${v}% coverage`} />;
      })}
    </SituationFrame>
  );
}
