'use client';

// NOC domains — Continuity, Fusion, Safeguards surfaces.

import * as React from 'react';
import { NOC_SAFEGUARDS } from '@/lib/gov/noc-engine';
import { SituationFrame, SituationKpi, SituationRule, SituationBar, SituationCallout, NOC_DS } from '@/apps/noc/design-system/noc-ds';
import { wave } from '@/lib/telemetry';

export function NationalContinuity({ id, now }: { id: string; now: number }) {
  const ts = now / 4000;
  void id;
  return (
    <SituationFrame archetype="continuity" code="NC-NAT-17" title="National Continuity"
      subtitle="cross-branch continuity-of-government">
      <SituationKpi items={[
        { label: 'Posture', value: 'STEADY', tone: 'ok' },
        { label: 'Communications resilience', value: `${Math.round(wave('nc:c', ts, 92, 99.9) * 10) / 10}%`, tone: 'ok' },
        { label: 'Power resilience', value: `${Math.round(wave('nc:p', ts, 88, 99))}%`, tone: 'ok' },
        { label: 'Records resilience', value: '✓ multi-region', tone: 'ok' },
      ]} />
      <SituationCallout kicker="continuity doctrine" body="Continuity of government is asserted across all branches, all the time. The NOC monitors but does not own the doctrine; it reports to Cabinet and the Senate." />
    </SituationFrame>
  );
}

export function CogStatus({ id, now }: { id: string; now: number }) {
  const ts = now / 4000;
  void id;
  const branches = ['Presidency', 'Cabinet', 'Senate', 'Assembly', 'Judicial Branch', 'Audit Vault'];
  return (
    <SituationFrame archetype="continuity" code="NC-COG-18" title="CoG Status">
      <SituationKpi items={[
        { label: 'Branches', value: branches.length, tone: 'info' },
        { label: 'All asserting CoG', value: '✓', tone: 'ok' },
        { label: 'Last drill', value: `${Math.round(wave('cs:l', ts, 14, 120))}d ago` },
        { label: 'Civilian succession', value: '✓ asserted', tone: 'ok' },
      ]} />
      <SituationRule label="branches" />
      {branches.map(b => (
        <div key={b} className="grid grid-cols-[1fr_140px] gap-3 border-b py-1 text-[11px]"
          style={{ borderColor: NOC_DS.ruleSoft, fontFamily: 'ui-monospace, monospace' }}>
          <span style={{ color: NOC_DS.parchmentInk }}>{b}</span>
          <span className="text-right uppercase tracking-[0.16em]" style={{ color: NOC_DS.jade }}>● CONTINUITY ASSERTED</span>
        </div>
      ))}
    </SituationFrame>
  );
}

export function ContinuityExercises({ id, now }: { id: string; now: number }) {
  const ts = now / 4000;
  void id;
  return (
    <SituationFrame archetype="continuity" code="NC-EXR-19" title="Continuity Exercises"
      subtitle="drills & exercises calendar">
      <SituationKpi items={[
        { label: 'Exercises (12mo)', value: Math.round(wave('cx:y', ts, 6, 14)), tone: 'ok' },
        { label: 'Pass rate', value: `${Math.round(wave('cx:p', ts, 82, 99))}%`, tone: 'ok' },
        { label: 'Next exercise', value: `${Math.round(wave('cx:n', ts, 7, 90))}d`, tone: 'info' },
        { label: 'Senate witnessed', value: '✓ default', tone: 'ok' },
      ]} />
    </SituationFrame>
  );
}

export function IntelFusion({ id, now }: { id: string; now: number }) {
  const ts = now / 4000;
  void id;
  return (
    <SituationFrame archetype="fusion" code="IF-FUS-20" title="Intel Fusion"
      subtitle="open-source · ministry posture · public signals">
      <SituationKpi items={[
        { label: 'Sources tracked', value: Math.round(wave('if:s', ts, 240, 1480)).toLocaleString(), tone: 'info' },
        { label: 'Open-source share', value: '100%', tone: 'ok' },
        { label: 'Classified mixing', value: '✗ prohibited', tone: 'ok' },
        { label: 'Bias auditor', value: '✓ active', tone: 'ok' },
      ]} />
      <SituationCallout kicker="open-source only" body="The NOC operates on open-source and ministry-published signals. Classified or surveillance-derived inputs are forbidden in NOC fusion." />
    </SituationFrame>
  );
}

export function OpenSourceFusion({ id, now }: { id: string; now: number }) {
  const ts = now / 4000;
  void id;
  const sources = ['Public ministry dashboards', 'Open-data feeds', 'News (curated)', 'Sensor networks (open)', 'Academic feeds', 'Civic platforms'];
  return (
    <SituationFrame archetype="fusion" code="IF-OSF-21" title="Open-Source Fusion"
      subtitle="open-source signal streams">
      <SituationKpi items={[
        { label: 'Streams', value: sources.length, tone: 'info' },
        { label: 'Streams up', value: sources.length, tone: 'ok' },
        { label: 'Fusion latency', value: `${Math.round(wave('os:l', ts, 12, 240))}s` },
        { label: 'Citation', value: '✓ every signal', tone: 'ok' },
      ]} />
      <SituationRule label="streams" />
      {sources.map((s, i) => {
        const v = Math.round(wave(`os:${i}`, ts, 92, 100));
        return <SituationBar key={s} label={s} pct={v} tone={v >= 98 ? 'ok' : 'warn'} tail={`${v}% uptime`} />;
      })}
    </SituationFrame>
  );
}

export function CyberPosture({ id, now }: { id: string; now: number }) {
  const ts = now / 4000;
  void id;
  return (
    <SituationFrame archetype="fusion" code="IF-CYB-22" title="Cyber Posture"
      subtitle="national cyber posture (from Communications)">
      <SituationKpi items={[
        { label: 'Posture', value: 'STEADY', tone: 'ok' },
        { label: 'Active incidents', value: Math.round(wave('cp:a', ts, 0, 6)), tone: 'warn' },
        { label: 'Mean detection', value: `${Math.round(wave('cp:d', ts, 4, 28))}m`, tone: 'ok' },
        { label: 'Mean containment', value: `${Math.round(wave('cp:c', ts, 12, 120))}m` },
      ]} />
      <SituationRule label="cyber readiness" />
      {['Identity layer', 'Service layer', 'Data layer', 'Transport layer'].map((l, i) => {
        const v = Math.round(wave(`cp:l:${i}`, ts, 78, 99));
        return <SituationBar key={l} label={l} pct={v} tone={v >= 92 ? 'ok' : v >= 78 ? 'warn' : 'alert'} tail={`${v}%`} />;
      })}
    </SituationFrame>
  );
}

export function NocSafeguardsView({ id, now }: { id: string; now: number }) {
  void id; void now;
  return (
    <SituationFrame archetype="safeguards" code="SF-NOC-23" title="NOC Safeguards"
      subtitle="NOC_SAFEGUARDS constitutional contract">
      <SituationKpi items={[
        { label: 'Civilian command', value: '✓', tone: 'ok' },
        { label: 'Roles never fused', value: '✓', tone: 'ok' },
        { label: 'Audit public', value: '✓', tone: 'ok' },
        { label: 'No constitutional override', value: '✓', tone: 'ok' },
      ]} />
      <SituationRule label="prohibited acts (constitutionally void)" />
      {NOC_SAFEGUARDS.prohibited.map(p => (
        <div key={p} className="border-b py-1 text-[11px]"
          style={{ borderColor: NOC_DS.ruleSoft, fontFamily: 'ui-monospace, monospace', color: NOC_DS.crimson }}>✗ {p}</div>
      ))}
      <SituationCallout kicker="constitutional doctrine" body="The NOC is an instrument of awareness, not command. Every prohibited act is automatically void; the Judicial Branch may strike any breach within hours." />
    </SituationFrame>
  );
}

export function CivilianCommandDoctrine({ id, now }: { id: string; now: number }) {
  void id; void now;
  return (
    <SituationFrame archetype="safeguards" code="SF-CIV-24" title="Civilian Command Doctrine"
      subtitle="civilian command over the NOC">
      <SituationKpi items={[
        { label: 'NOC Director', value: 'CIVILIAN', tone: 'ok' },
        { label: 'Military deputies', value: '0', tone: 'ok' },
        { label: 'Reports to', value: 'Cabinet · Senate', tone: 'info' },
        { label: 'Independent audit', value: '✓ quarterly', tone: 'ok' },
      ]} />
      <SituationCallout kicker="civilian command" body="The NOC Director is a civilian official confirmed by the Senate. The NOC may not be reorganised under military command under any pretext." />
    </SituationFrame>
  );
}

export function RationaleDoctrine({ id, now }: { id: string; now: number }) {
  void id; void now;
  return (
    <SituationFrame archetype="safeguards" code="SF-RAT-25" title="Rationale Doctrine"
      subtitle="every NOC decision is reasoned">
      <SituationKpi items={[
        { label: 'Decisions with rationale', value: '100%', tone: 'ok' },
        { label: 'Public access', value: '✓ open', tone: 'ok' },
        { label: 'Sealed decisions', value: 0, tone: 'ok' },
        { label: 'Audit chain', value: '✓ intact', tone: 'ok' },
      ]} />
      <SituationCallout kicker="rationale doctrine" body="A sealed NOC decision without rationale is void. The Auditor-General and Senate may request and receive every reasoning record on demand." />
    </SituationFrame>
  );
}

export function CabinetNonSubstitution({ id, now }: { id: string; now: number }) {
  void id; void now;
  return (
    <SituationFrame archetype="safeguards" code="SF-CAB-26" title="Cabinet Non-Substitution"
      subtitle="NOC does not substitute for Cabinet">
      <SituationKpi items={[
        { label: 'Substitution attempts', value: 0, tone: 'ok' },
        { label: 'Cabinet bypass attempts', value: 0, tone: 'ok' },
        { label: 'Override capability', value: '✗ none', tone: 'ok' },
        { label: 'Audit fabric', value: '✓ continuous', tone: 'ok' },
      ]} />
      <SituationCallout kicker="non-substitution doctrine" body="The NOC informs and routes. It cannot adopt resolutions, command ministries, or substitute itself for the Cabinet. Every contrary act is void on its face." />
    </SituationFrame>
  );
}
