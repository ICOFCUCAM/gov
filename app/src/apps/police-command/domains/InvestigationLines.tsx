'use client';

// Police domains — Investigative Tier additions.
// HomicideCaseload, ViolentCrimeBoard, OrganisedCrimeFusion, NarcoticsOperations, MissingPersons.

import * as React from 'react';
import { PoliceKpiStrip, PoliceRosterRow, PoliceCalloutNote, PoliceRule } from '@/apps/police-command/design-system/police-ds';
import { seed, wave } from '@/lib/telemetry';

function caseload(prefix: string, id: string, ts: number, types: string[], count: number) {
  return Array.from({ length: count }, (_, i) => {
    const k = `${prefix}:${id}:${i}:${Math.floor(ts / 4)}`;
    const stages = ['opened', 'investigating', 'forensics', 'arrest', 'filed-with-prosecutor'];
    return {
      id: `${prefix.toUpperCase()}-${(20000 + Math.floor(seed(`${k}:c`) * 70000))}`,
      type: types[Math.floor(seed(`${k}:t`) * types.length)]!,
      stage: stages[Math.floor(seed(`${k}:s`) * stages.length)]!,
      ageDays: Math.round(wave(`${k}:a`, ts, 1, 240)),
      lead: ['Det. Adamu', 'Det. Petrov', 'Det. Mehta', 'Det. Oduya', 'Det. Tanaka', 'Det. Brennan'][i % 6]!,
    };
  });
}

export function HomicideCaseload({ id, now, accent }: { id: string; now: number; accent: string }) {
  const ts = now / 4000;
  const types = ['Homicide (firearm)', 'Homicide (edged)', 'Suspicious death', 'Manslaughter', 'Unexplained fatality'];
  const cases = caseload('hom', id, ts, types, 8);
  return (
    <div className="space-y-2">
      <PoliceKpiStrip accent={accent} items={[
        { label: 'Open homicides', value: cases.length, tone: 'alert' },
        { label: 'Cleared (YTD)', value: Math.round(wave(`hom:c:${id}`, ts, 24, 180)), tone: 'ok' },
        { label: 'Clearance rate', value: `${Math.round(wave(`hom:cr:${id}`, ts, 42, 78))}%` },
        { label: 'Cold cases', value: Math.round(wave(`hom:cd:${id}`, ts, 12, 320)), tone: 'mute' },
      ]} />
      <PoliceRule label="active docket" />
      {cases.map(c => (
        <PoliceRosterRow key={c.id} accent={accent}
          id={c.id} label={`${c.type} · ${c.lead}`}
          status={c.stage}
          tail={`${c.ageDays}d open`}
          tone={c.stage === 'filed-with-prosecutor' ? 'ok' : c.ageDays > 90 ? 'warn' : undefined} />
      ))}
      <PoliceCalloutNote kicker="forensics chain" body="Every homicide case enters the chain-of-custody contract — see Evidence Custody and the Forensics Laboratory queue." />
    </div>
  );
}

export function ViolentCrimeBoard({ id, now, accent }: { id: string; now: number; accent: string }) {
  const ts = now / 4000;
  const types = ['Aggravated assault', 'Armed robbery', 'Weapons offence', 'Kidnapping', 'Carjacking', 'Strangulation'];
  const cases = caseload('vc', id, ts, types, 9);
  return (
    <div className="space-y-2">
      <PoliceKpiStrip accent={accent} items={[
        { label: 'Active cases', value: cases.length, tone: 'warn' },
        { label: 'Weapons seized (30d)', value: Math.round(wave(`vc:w:${id}`, ts, 38, 480)) },
        { label: 'Suspects charged (30d)', value: Math.round(wave(`vc:s:${id}`, ts, 64, 580)) },
        { label: 'Repeat offenders', value: `${Math.round(wave(`vc:r:${id}`, ts, 16, 38))}%`, tone: 'warn' },
      ]} />
      <PoliceRule label="violent-crime docket" />
      {cases.map(c => (
        <PoliceRosterRow key={c.id} accent={accent}
          id={c.id} label={`${c.type} · ${c.lead}`}
          status={c.stage}
          tail={`${c.ageDays}d open`}
          tone={c.stage === 'arrest' || c.stage === 'filed-with-prosecutor' ? 'ok' : c.ageDays > 60 ? 'warn' : undefined} />
      ))}
    </div>
  );
}

export function OrganisedCrimeFusion({ id, now, accent }: { id: string; now: number; accent: string }) {
  const ts = now / 4000;
  const networks = ['Northern Syndicate', 'Coastal Smuggling Ring', 'Highland Cartel', 'Capital Trafficking Network', 'Cross-border Cyber Fraud'];
  return (
    <div className="space-y-2">
      <PoliceKpiStrip accent={accent} items={[
        { label: 'Networks tracked', value: networks.length },
        { label: 'Joint operations', value: Math.round(wave(`oc:j:${id}`, ts, 2, 14)) },
        { label: 'Assets frozen (Bn)', value: (wave(`oc:af:${id}`, ts, 0.2, 4.8)).toFixed(2), tone: 'ok' },
        { label: 'Cross-border edges', value: Math.round(wave(`oc:e:${id}`, ts, 4, 26)) },
      ]} />
      <PoliceRule label="network fusion board" />
      {networks.map((n, i) => {
        const k = `oc:${id}:${i}`;
        const intel = Math.round(wave(`${k}:i`, ts, 18, 86));
        return (
          <PoliceRosterRow key={n} accent={accent}
            id={`OC-${String(i + 1).padStart(2, '0')}`}
            label={n} status={intel > 70 ? 'actionable' : intel > 40 ? 'developing' : 'monitoring'}
            tail={`intel ${intel}%`}
            tone={intel > 70 ? 'alert' : intel > 40 ? 'warn' : 'mute'} />
        );
      })}
      <PoliceCalloutNote kicker="warrant doctrine" body="Surveillance, asset freezes and arrests against organised networks require judicial warrants under §19 — operations without warrant are constitutionally void." />
    </div>
  );
}

export function NarcoticsOperations({ id, now, accent }: { id: string; now: number; accent: string }) {
  const ts = now / 4000;
  const subs = ['Cocaine', 'Methamphetamine', 'Heroin', 'Cannabis (bulk)', 'Synthetic opioids', 'Precursors'];
  return (
    <div className="space-y-2">
      <PoliceKpiStrip accent={accent} items={[
        { label: 'Active operations', value: Math.round(wave(`nar:o:${id}`, ts, 4, 38)) },
        { label: 'Seizures (30d, kg)', value: Math.round(wave(`nar:s:${id}`, ts, 84, 4800)).toLocaleString() },
        { label: 'Arrests (30d)', value: Math.round(wave(`nar:a:${id}`, ts, 24, 420)) },
        { label: 'Street value (Bn)', value: (wave(`nar:v:${id}`, ts, 0.2, 3.8)).toFixed(2), tone: 'ok' },
      ]} />
      <PoliceRule label="substance interdiction" />
      {subs.map((s, i) => {
        const k = `nar:${id}:${i}`;
        const kg = Math.round(wave(`${k}:kg`, ts, 12, 1800));
        return (
          <PoliceRosterRow key={s} accent={accent}
            id={`NAR-${String(i + 1).padStart(2, '0')}`}
            label={s} status={kg > 500 ? 'major seizure' : kg > 100 ? 'active' : 'monitoring'}
            tail={`${kg}kg / 30d`}
            tone={kg > 500 ? 'alert' : kg > 100 ? 'warn' : 'mute'} />
        );
      })}
    </div>
  );
}

export function MissingPersons({ id, now, accent }: { id: string; now: number; accent: string }) {
  const ts = now / 4000;
  const cases = Array.from({ length: 8 }, (_, i) => {
    const k = `mp:${id}:${i}:${Math.floor(ts / 4)}`;
    return {
      id: `MP-${(40000 + Math.floor(seed(`${k}:c`) * 50000))}`,
      who: `${['Adult', 'Minor', 'Adult', 'Minor', 'Vulnerable adult', 'Adult'][i % 6]} · ${['Adamu', 'Petrov', 'Mehta', 'Oduya', 'Tanaka', 'Brennan'][i % 6]} family`,
      ageHrs: Math.round(wave(`${k}:a`, ts, 1, 480)),
      alert: seed(`${k}:al`) > 0.78 ? 'Amber' : 'standard',
      area: ['Capital District', 'Northern', 'Eastern', 'Western', 'Coastal', 'Highland'][i % 6]!,
    };
  });
  return (
    <div className="space-y-2">
      <PoliceKpiStrip accent={accent} items={[
        { label: 'Active cases', value: cases.length },
        { label: 'Amber alerts', value: cases.filter(c => c.alert === 'Amber').length, tone: 'alert' },
        { label: 'Found (last 7d)', value: Math.round(wave(`mp:f:${id}`, ts, 2, 24)), tone: 'ok' },
        { label: 'Median time to find', value: `${Math.round(wave(`mp:m:${id}`, ts, 4, 48))}h` },
      ]} />
      <PoliceRule label="missing-persons registry" />
      {cases.map(c => (
        <PoliceRosterRow key={c.id} accent={accent}
          id={c.id} label={`${c.who} · ${c.area}`}
          status={c.alert === 'Amber' ? 'AMBER ALERT' : 'investigating'}
          tail={`${c.ageHrs}h ago`}
          tone={c.alert === 'Amber' ? 'alert' : c.ageHrs > 48 ? 'warn' : undefined} />
      ))}
    </div>
  );
}
