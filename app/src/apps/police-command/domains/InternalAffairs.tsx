'use client';

// Police domains — Internal Affairs Tier.
// InternalAffairsBoard, UseOfForceReview, ComplaintsTribunal.

import * as React from 'react';
import { PoliceKpiStrip, PoliceRosterRow, PoliceCalloutNote, PoliceRule } from '@/apps/police-command/design-system/police-ds';
import { seed, wave } from '@/lib/telemetry';

export function InternalAffairsBoard({ id, now, accent }: { id: string; now: number; accent: string }) {
  const ts = now / 4000;
  const cases = Array.from({ length: 8 }, (_, i) => {
    const k = `ia:${id}:${i}:${Math.floor(ts / 4)}`;
    const kinds = ['Excessive force allegation', 'Procedural violation', 'Evidence handling breach', 'Off-duty misconduct', 'Discriminatory enforcement', 'Information disclosure', 'Custody mistreatment', 'Failure to render aid'];
    const stages = ['opened', 'investigating', 'panel-review', 'finding', 'disciplinary', 'closed'];
    return {
      id: `IA-${(90000 + Math.floor(seed(`${k}:c`) * 9000))}`,
      kind: kinds[i]!,
      officer: ['Off. A-3245', 'Off. P-4118', 'Off. M-9087', 'Off. O-2233', 'Off. T-5511', 'Off. B-7702', 'Off. J-3399', 'Off. K-6620'][i]!,
      stage: stages[Math.floor(seed(`${k}:s`) * stages.length)]!,
      ageDays: Math.round(wave(`${k}:a`, ts, 1, 180)),
    };
  });
  return (
    <div className="space-y-2">
      <PoliceKpiStrip accent={accent} items={[
        { label: 'Open investigations', value: cases.length, tone: 'warn' },
        { label: 'Closed (YTD)', value: Math.round(wave(`ia:c:${id}`, ts, 38, 320)) },
        { label: 'Sustained findings (%)', value: `${Math.round(wave(`ia:sf:${id}`, ts, 22, 48))}%` },
        { label: 'Median resolution', value: `${Math.round(wave(`ia:m:${id}`, ts, 32, 96))}d`, tone: 'warn' },
      ]} />
      <PoliceRule label="active IA docket" />
      {cases.map(c => (
        <PoliceRosterRow key={c.id} accent={accent}
          id={c.id} label={`${c.kind} · ${c.officer}`}
          status={c.stage}
          tail={`${c.ageDays}d open`}
          tone={c.stage === 'disciplinary' ? 'alert' : c.ageDays > 90 ? 'warn' : undefined} />
      ))}
      <PoliceCalloutNote kicker="independence" body="Internal Affairs operates independently from line command and reports findings to the Complaints Tribunal and the Audit Chain. Retaliation against complainants is itself a sustained finding." />
    </div>
  );
}

export function UseOfForceReview({ id, now, accent }: { id: string; now: number; accent: string }) {
  const ts = now / 4000;
  const incidents = Array.from({ length: 9 }, (_, i) => {
    const k = `uf:${id}:${i}:${Math.floor(ts / 4)}`;
    const kinds = ['Soft control', 'Hard control', 'Less-lethal (taser)', 'Less-lethal (chemical)', 'Less-lethal (impact)', 'Firearm discharge', 'Hard control', 'K-9 deployment', 'Soft control'];
    const findings = ['proportional', 'proportional', 'proportional', 'under review', 'proportional', 'under review', 'proportional', 'proportional', 'proportional'];
    return {
      id: `UF-${(200000 + Math.floor(seed(`${k}:c`) * 50000))}`,
      kind: kinds[i]!,
      finding: findings[i]!,
      ageDays: Math.round(wave(`${k}:a`, ts, 1, 60)),
      bodyworn: seed(`${k}:bw`) > 0.05,
    };
  });
  return (
    <div className="space-y-2">
      <PoliceKpiStrip accent={accent} items={[
        { label: 'Incidents (30d)', value: incidents.length },
        { label: 'Under review', value: incidents.filter(i => i.finding === 'under review').length, tone: 'warn' },
        { label: 'Firearm discharges (30d)', value: incidents.filter(i => i.kind === 'Firearm discharge').length, tone: 'alert' },
        { label: 'Bodyworn camera coverage', value: `${Math.round((incidents.filter(i => i.bodyworn).length / incidents.length) * 100)}%`, tone: 'ok' },
      ]} />
      <PoliceRule label="use-of-force ledger" />
      {incidents.map(i => (
        <PoliceRosterRow key={i.id} accent={accent}
          id={i.id} label={`${i.kind}${i.bodyworn ? ' · bodyworn ✓' : ' · BODYWORN MISSING'}`}
          status={i.finding}
          tail={`${i.ageDays}d ago`}
          tone={i.finding === 'under review' ? 'warn' : !i.bodyworn ? 'alert' : 'ok'} />
      ))}
      <PoliceCalloutNote kicker="constitutional doctrine" body="Every use of force must be proportional, necessary and accountable. Missing bodyworn footage triggers a presumption against the officer in subsequent review." />
    </div>
  );
}

export function ComplaintsTribunal({ id, now, accent }: { id: string; now: number; accent: string }) {
  const ts = now / 4000;
  const complaints = Array.from({ length: 7 }, (_, i) => {
    const k = `ct:${id}:${i}:${Math.floor(ts / 4)}`;
    const grounds = ['Discriminatory stop', 'Excessive force', 'Procedural irregularity', 'Failure to render aid', 'Detention breach', 'Verbal abuse', 'Failure to record'];
    const stages = ['filed', 'preliminary', 'civilian-panel', 'hearing', 'finding-issued'];
    return {
      id: `CT-${(300000 + Math.floor(seed(`${k}:c`) * 70000))}`,
      ground: grounds[i]!,
      complainant: ['Citizen 9023', 'Citizen 1456', 'Citizen 7711', 'Citizen 3322', 'Citizen 8841', 'Citizen 4509', 'Citizen 6720'][i]!,
      stage: stages[Math.floor(seed(`${k}:s`) * stages.length)]!,
      ageDays: Math.round(wave(`${k}:a`, ts, 1, 240)),
    };
  });
  return (
    <div className="space-y-2">
      <PoliceKpiStrip accent={accent} items={[
        { label: 'Open complaints', value: complaints.length },
        { label: 'Civilian panel hearings', value: complaints.filter(c => c.stage === 'civilian-panel' || c.stage === 'hearing').length },
        { label: 'Findings issued (YTD)', value: Math.round(wave(`ct:f:${id}`, ts, 24, 240)) },
        { label: 'Upheld for complainant', value: `${Math.round(wave(`ct:up:${id}`, ts, 18, 42))}%`, tone: 'warn' },
      ]} />
      <PoliceRule label="complaints register" />
      {complaints.map(c => (
        <PoliceRosterRow key={c.id} accent={accent}
          id={c.id} label={`${c.ground} · ${c.complainant}`}
          status={c.stage}
          tail={`${c.ageDays}d open`}
          tone={c.ageDays > 90 ? 'warn' : undefined} />
      ))}
      <PoliceCalloutNote kicker="civilian oversight" body="The tribunal is chaired by an independent civilian panel — not police. Findings are binding on disciplinary action and citable in subsequent litigation." />
    </div>
  );
}
