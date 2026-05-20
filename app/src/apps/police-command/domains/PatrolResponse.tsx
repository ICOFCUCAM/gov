'use client';

// Police domains — Command Tier additions.
// WatchCommander, CallStack, TacticalDeployment, TrafficEnforcement, K9Operations.

import * as React from 'react';
import { policeOps } from '@/lib/gov/agency-systems';
import { PoliceKpiStrip, PoliceRosterRow, PoliceCalloutNote, PoliceRule } from '@/apps/police-command/design-system/police-ds';
import { seed, wave } from '@/lib/telemetry';

export function WatchCommander({ id, now, accent }: { id: string; now: number; accent: string }) {
  const ts = now / 4000;
  const o = policeOps(id, ts);
  const posture = o.activeIncidents > 90 ? 'critical' : o.activeIncidents > 40 ? 'engaged' : 'stable';
  const tone = posture === 'critical' ? 'alert' : posture === 'engaged' ? 'warn' : 'ok';
  return (
    <div className="space-y-2">
      <PoliceKpiStrip accent={accent} items={[
        { label: 'Posture', value: posture.toUpperCase(), tone },
        { label: 'Active incidents', value: o.activeIncidents, tone },
        { label: 'Units deployed', value: `${o.unitsDeployed}/${o.unitsTotal}` },
        { label: 'Mean response', value: `${o.meanResponseMin}m`, tone: o.meanResponseMin > 18 ? 'warn' : 'ok' },
      ]} />
      <PoliceRule label="shift handover" />
      {['07:00', '15:00', '23:00'].map((t, i) => {
        const k = `wc:${id}:${i}:${Math.floor(ts / 6)}`;
        return (
          <PoliceRosterRow key={t} accent={accent}
            id={`SHIFT-${t}`}
            label={`Watch Commander · ${['Insp. Adamu', 'Insp. Petrov', 'Insp. Mehta'][i]}`}
            status={i === Math.floor(ts) % 3 ? 'on watch' : 'standby'}
            tail={`${Math.round(wave(`${k}:b`, ts, 12, 88))}% briefed`}
            tone={i === Math.floor(ts) % 3 ? 'ok' : 'mute'} />
        );
      })}
      <PoliceCalloutNote kicker="authority" body="Watch Commander holds operational authority for the shift; all use-of-force escalations route through this office." />
    </div>
  );
}

export function CallStackQueue({ id, now, accent }: { id: string; now: number; accent: string }) {
  const ts = now / 4000;
  const queue = Array.from({ length: 10 }, (_, i) => {
    const k = `cs:${id}:${i}:${Math.floor(ts / 2)}`;
    const types = ['Domestic disturbance', 'Vehicle collision', 'Assault in progress', 'Burglary alarm', 'Suspicious person', 'Welfare check', 'Theft', 'Public disorder', 'Medical assist', 'Noise complaint'];
    const priority = seed(`${k}:p`) > 0.86 ? 'P1' : seed(`${k}:p`) > 0.55 ? 'P2' : 'P3';
    return {
      id: `CALL-${(10000 + Math.floor(seed(`${k}:c`) * 90000))}`,
      type: types[i % types.length]!,
      priority,
      waitMin: Math.round(wave(`${k}:w`, ts, 0, priority === 'P1' ? 5 : priority === 'P2' ? 18 : 38)),
    };
  });
  return (
    <div className="space-y-2">
      <PoliceKpiStrip accent={accent} items={[
        { label: 'In queue', value: queue.length },
        { label: 'P1 (emergent)', value: queue.filter(c => c.priority === 'P1').length, tone: 'alert' },
        { label: 'P2 (urgent)', value: queue.filter(c => c.priority === 'P2').length, tone: 'warn' },
        { label: 'Mean wait', value: `${Math.round(queue.reduce((s, c) => s + c.waitMin, 0) / queue.length)}m` },
      ]} />
      <PoliceRule label="call triage" />
      {queue.map(c => (
        <PoliceRosterRow key={c.id} accent={accent}
          id={c.id} label={c.type}
          status={c.priority}
          tail={`${c.waitMin}m wait`}
          tone={c.priority === 'P1' ? 'alert' : c.priority === 'P2' ? 'warn' : 'ok'} />
      ))}
    </div>
  );
}

export function TacticalDeployment({ id, now, accent }: { id: string; now: number; accent: string }) {
  const ts = now / 4000;
  const teams = ['SWAT-1', 'SWAT-2', 'EOD-1', 'Negotiation-1', 'Hostage Rescue', 'Marine-1'];
  return (
    <div className="space-y-2">
      <PoliceKpiStrip accent={accent} items={[
        { label: 'Tactical teams', value: teams.length },
        { label: 'Active calls', value: Math.round(wave(`td:ac:${id}`, ts, 0, 4)), tone: 'warn' },
        { label: 'Readiness', value: `${Math.round(wave(`td:rd:${id}`, ts, 82, 98))}%`, tone: 'ok' },
        { label: 'Hours since last drill', value: Math.round(wave(`td:dr:${id}`, ts, 4, 72)) },
      ]} />
      <PoliceRule label="team status" />
      {teams.map((t, i) => {
        const k = `td:${id}:${i}:${Math.floor(ts / 4)}`;
        const st = seed(`${k}:s`);
        const status = st > 0.8 ? 'deployed' : st > 0.55 ? 'staging' : 'ready';
        return (
          <PoliceRosterRow key={t} accent={accent}
            id={t}
            label={['Tactical Entry', 'Tactical Entry', 'Explosive Ordnance', 'Negotiation Cell', 'Hostage Rescue', 'Marine Tactical'][i]!}
            status={status}
            tail={status === 'deployed' ? `${Math.round(wave(`${k}:t`, ts, 6, 240))}m on-scene` : 'standby'}
            tone={status === 'deployed' ? 'alert' : status === 'staging' ? 'warn' : 'ok'} />
        );
      })}
      <PoliceCalloutNote kicker="rules of engagement" body="All tactical deployment requires Watch Commander authorisation and is logged to the Audit Chain. Use-of-force review is mandatory post-action." />
    </div>
  );
}

export function TrafficEnforcement({ id, now, accent }: { id: string; now: number; accent: string }) {
  const ts = now / 4000;
  const corridors = ['North-South Corridor', 'East Trunk', 'Western Ring', 'Coastal Highway', 'Highland Pass', 'Capital Beltway'];
  return (
    <div className="space-y-2">
      <PoliceKpiStrip accent={accent} items={[
        { label: 'Traffic units', value: Math.round(wave(`te:u:${id}`, ts, 80, 220)) },
        { label: 'Stops (last 24h)', value: Math.round(wave(`te:s:${id}`, ts, 240, 4800)).toLocaleString() },
        { label: 'Crashes (last 24h)', value: Math.round(wave(`te:c:${id}`, ts, 12, 86)), tone: 'warn' },
        { label: 'DUI arrests (24h)', value: Math.round(wave(`te:d:${id}`, ts, 4, 48)) },
      ]} />
      <PoliceRule label="corridor posture" />
      {corridors.map((c, i) => {
        const k = `te:${id}:${i}`;
        const flow = Math.round(wave(`${k}:f`, ts, 35, 98));
        return (
          <PoliceRosterRow key={c} accent={accent}
            id={`HWY-${String(i + 1).padStart(2, '0')}`}
            label={c} status={flow < 50 ? 'congested' : flow < 75 ? 'flowing' : 'open'}
            tail={`flow ${flow}%`}
            tone={flow < 50 ? 'alert' : flow < 75 ? 'warn' : 'ok'} />
        );
      })}
    </div>
  );
}

export function K9Operations({ id, now, accent }: { id: string; now: number; accent: string }) {
  const ts = now / 4000;
  const handlers = ['Sgt. Adamu / K9 Rex', 'Sgt. Petrov / K9 Luna', 'Sgt. Mehta / K9 Atlas', 'Sgt. Oduya / K9 Nyx', 'Sgt. Tanaka / K9 Onyx'];
  return (
    <div className="space-y-2">
      <PoliceKpiStrip accent={accent} items={[
        { label: 'K9 teams', value: handlers.length },
        { label: 'Detections (30d)', value: Math.round(wave(`k9:d:${id}`, ts, 24, 240)) },
        { label: 'Track recoveries', value: Math.round(wave(`k9:t:${id}`, ts, 4, 38)) },
        { label: 'Welfare score', value: `${Math.round(wave(`k9:w:${id}`, ts, 88, 99))}%`, tone: 'ok' },
      ]} />
      <PoliceRule label="K-9 roster" />
      {handlers.map((h, i) => {
        const k = `k9:${id}:${i}:${Math.floor(ts / 4)}`;
        const st = seed(`${k}:s`);
        const spec = ['Narcotics', 'Explosives', 'Search & Rescue', 'Tracking', 'Patrol'][i]!;
        return (
          <PoliceRosterRow key={h} accent={accent}
            id={`K9-${String(i + 1).padStart(2, '0')}`}
            label={`${h} · ${spec}`}
            status={st > 0.65 ? 'deployed' : st > 0.35 ? 'staging' : 'rest cycle'}
            tail={st > 0.65 ? 'on-scene' : 'kennel'}
            tone={st > 0.65 ? 'warn' : 'ok'} />
        );
      })}
      <PoliceCalloutNote kicker="welfare" body="Mandatory rest cycle after 6h field exposure; veterinary check before re-deployment. Logged to the welfare register." />
    </div>
  );
}
