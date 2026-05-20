'use client';

// Police domains — Forensic Tier.
// ForensicsLab, EvidenceCustody, CrimeSceneCoordination.

import * as React from 'react';
import { PoliceKpiStrip, PoliceRosterRow, PoliceCalloutNote, PoliceRule } from '@/apps/police-command/design-system/police-ds';
import { seed, wave } from '@/lib/telemetry';

export function ForensicsLab({ id, now, accent }: { id: string; now: number; accent: string }) {
  const ts = now / 4000;
  const benches = [
    { name: 'DNA bench', code: 'DNA' },
    { name: 'Ballistics bench', code: 'BAL' },
    { name: 'Toxicology bench', code: 'TOX' },
    { name: 'Digital forensics', code: 'DIG' },
    { name: 'Fingerprint analysis', code: 'PRT' },
    { name: 'Documents & questioned-writing', code: 'DOC' },
  ];
  return (
    <div className="space-y-2">
      <PoliceKpiStrip accent={accent} items={[
        { label: 'Active requests', value: Math.round(wave(`fl:a:${id}`, ts, 80, 1800)).toLocaleString() },
        { label: 'Mean turnaround', value: `${Math.round(wave(`fl:t:${id}`, ts, 18, 86))}h`, tone: 'warn' },
        { label: 'Backlog >30d', value: Math.round(wave(`fl:b:${id}`, ts, 8, 240)), tone: 'alert' },
        { label: 'Chain-of-custody integrity', value: '100%', tone: 'ok' },
      ]} />
      <PoliceRule label="laboratory benches" />
      {benches.map((b, i) => {
        const k = `fl:${id}:${i}`;
        const queue = Math.round(wave(`${k}:q`, ts, 12, 480));
        const tat = Math.round(wave(`${k}:t`, ts, 6, 96));
        return (
          <PoliceRosterRow key={b.code} accent={accent}
            id={b.code} label={b.name}
            status={tat > 72 ? 'backlog' : tat > 36 ? 'engaged' : 'flowing'}
            tail={`q=${queue} · ${tat}h TAT`}
            tone={tat > 72 ? 'alert' : tat > 36 ? 'warn' : 'ok'} />
        );
      })}
      <PoliceCalloutNote kicker="evidence integrity" body="Every analysis is double-blind validated where statute requires it; results are cryptographically signed and replicated to the Audit Chain." />
    </div>
  );
}

export function EvidenceCustody({ id, now, accent }: { id: string; now: number; accent: string }) {
  const ts = now / 4000;
  const entries = Array.from({ length: 8 }, (_, i) => {
    const k = `ec:${id}:${i}:${Math.floor(ts / 4)}`;
    const kinds = ['Firearm', 'Narcotic sample', 'Digital device', 'Biological sample', 'Documents', 'Currency', 'Vehicle', 'Clothing'];
    return {
      id: `EV-${(700000 + Math.floor(seed(`${k}:c`) * 200000))}`,
      kind: kinds[i % kinds.length]!,
      caseId: `CASE-${(20000 + Math.floor(seed(`${k}:cs`) * 70000))}`,
      sealOk: seed(`${k}:s`) > 0.04,
      ageHrs: Math.round(wave(`${k}:a`, ts, 1, 720)),
    };
  });
  return (
    <div className="space-y-2">
      <PoliceKpiStrip accent={accent} items={[
        { label: 'Items in custody', value: Math.round(wave(`ec:t:${id}`, ts, 4800, 84000)).toLocaleString() },
        { label: 'Custody transfers (24h)', value: Math.round(wave(`ec:x:${id}`, ts, 24, 420)) },
        { label: 'Seal integrity', value: `${Math.round(wave(`ec:si:${id}`, ts, 99.4, 100) * 100) / 100}%`, tone: 'ok' },
        { label: 'Anomalies', value: entries.filter(e => !e.sealOk).length, tone: 'alert' },
      ]} />
      <PoliceRule label="recent custody events" />
      {entries.map(e => (
        <PoliceRosterRow key={e.id} accent={accent}
          id={e.id} label={`${e.kind} · ${e.caseId}`}
          status={e.sealOk ? 'sealed' : 'SEAL BREACH'}
          tail={`${e.ageHrs}h held`}
          tone={e.sealOk ? 'ok' : 'alert'} />
      ))}
      <PoliceCalloutNote kicker="chain of custody" body="Every transfer requires evidence-custodian signature; breach of seal triggers automatic Audit Chain entry and Internal Affairs review." />
    </div>
  );
}

export function CrimeSceneCoordination({ id, now, accent }: { id: string; now: number; accent: string }) {
  const ts = now / 4000;
  const scenes = Array.from({ length: 6 }, (_, i) => {
    const k = `cs:${id}:${i}:${Math.floor(ts / 2)}`;
    const types = ['Homicide scene', 'Aggravated assault', 'Burglary', 'Vehicle collision', 'Suspicious death', 'Arson'];
    return {
      id: `SOC-${(30000 + Math.floor(seed(`${k}:c`) * 60000))}`,
      type: types[i]!,
      area: ['Capital District', 'Northern', 'Eastern', 'Western', 'Coastal', 'Highland'][i]!,
      ageMin: Math.round(wave(`${k}:a`, ts, 8, 360)),
      sealed: seed(`${k}:s`) > 0.18,
    };
  });
  return (
    <div className="space-y-2">
      <PoliceKpiStrip accent={accent} items={[
        { label: 'Active scenes', value: scenes.length },
        { label: 'Mean SOC arrival', value: `${Math.round(wave(`cs:m:${id}`, ts, 12, 48))}m`, tone: 'warn' },
        { label: 'Scenes sealed', value: `${scenes.filter(s => s.sealed).length}/${scenes.length}`, tone: 'ok' },
        { label: 'Officer hours (24h)', value: Math.round(wave(`cs:h:${id}`, ts, 84, 980)).toLocaleString() },
      ]} />
      <PoliceRule label="scene coordination" />
      {scenes.map(s => (
        <PoliceRosterRow key={s.id} accent={accent}
          id={s.id} label={`${s.type} · ${s.area}`}
          status={s.sealed ? 'SOC on-scene' : 'awaiting SOC'}
          tail={`${s.ageMin}m old`}
          tone={s.sealed ? 'ok' : 'warn'} />
      ))}
      <PoliceCalloutNote kicker="integrity protocol" body="Scenes must be sealed within the first 30 minutes; contamination breaches are flagged to the prosecutor and the Forensics Laboratory." />
    </div>
  );
}
