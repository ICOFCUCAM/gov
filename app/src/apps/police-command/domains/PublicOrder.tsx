'use client';

// Police domains — Public Order Tier.
// ProtestPosture, PublicEventSecurity.

import * as React from 'react';
import { PoliceKpiStrip, PoliceRosterRow, PoliceCalloutNote, PoliceRule } from '@/apps/police-command/design-system/police-ds';
import { seed, wave } from '@/lib/telemetry';

export function ProtestPosture({ id, now, accent }: { id: string; now: number; accent: string }) {
  const ts = now / 4000;
  const assemblies = Array.from({ length: 5 }, (_, i) => {
    const k = `pp:${id}:${i}:${Math.floor(ts / 4)}`;
    const causes = ['Cost-of-living rally', 'Labour union march', 'Climate-action sit-in', 'Student demonstration', 'Civil-rights vigil'];
    const crowd = Math.round(wave(`${k}:c`, ts, 80, 12000));
    return {
      id: `ASM-${(60000 + Math.floor(seed(`${k}:id`) * 30000))}`,
      cause: causes[i]!,
      area: ['Capital Plaza', 'Parliament Steps', 'Northern Square', 'Eastern Park', 'University Quad'][i]!,
      crowd,
      tone: crowd > 8000 ? 'alert' : crowd > 3000 ? 'warn' : 'ok',
      posture: crowd > 8000 ? 'engaged' : crowd > 3000 ? 'liaison' : 'observe',
    } as const;
  });
  return (
    <div className="space-y-2">
      <PoliceKpiStrip accent={accent} items={[
        { label: 'Assemblies tracked', value: assemblies.length },
        { label: 'Total crowd', value: assemblies.reduce((s, a) => s + a.crowd, 0).toLocaleString() },
        { label: 'Officers committed', value: Math.round(wave(`pp:o:${id}`, ts, 80, 1800)) },
        { label: 'Use-of-force incidents (today)', value: Math.round(wave(`pp:u:${id}`, ts, 0, 4)), tone: 'alert' },
      ]} />
      <PoliceRule label="active assemblies" />
      {assemblies.map(a => (
        <PoliceRosterRow key={a.id} accent={accent}
          id={a.id} label={`${a.cause} · ${a.area}`}
          status={a.posture}
          tail={a.crowd.toLocaleString()}
          tone={a.tone} />
      ))}
      <PoliceCalloutNote kicker="constitutional doctrine" body="Right to peaceful assembly is protected. Police presence is facilitative by default; escalation requires Watch Commander authorisation and is reviewable by the Complaints Tribunal." />
    </div>
  );
}

export function PublicEventSecurity({ id, now, accent }: { id: string; now: number; accent: string }) {
  const ts = now / 4000;
  const events = Array.from({ length: 6 }, (_, i) => {
    const k = `pe:${id}:${i}:${Math.floor(ts / 4)}`;
    const kinds = ['National stadium fixture', 'Independence parade', 'Cultural festival', 'Head-of-state visit', 'Diplomatic summit', 'Marathon'];
    return {
      id: `EV-${(80000 + Math.floor(seed(`${k}:id`) * 20000))}`,
      kind: kinds[i]!,
      attendance: Math.round(wave(`${k}:a`, ts, 1200, 84000)),
      threatLevel: ['low', 'low', 'medium', 'high', 'high', 'medium'][i]! as 'low' | 'medium' | 'high',
      officers: Math.round(wave(`${k}:o`, ts, 40, 1400)),
    };
  });
  return (
    <div className="space-y-2">
      <PoliceKpiStrip accent={accent} items={[
        { label: 'Active events', value: events.length },
        { label: 'Crowd attendance', value: events.reduce((s, e) => s + e.attendance, 0).toLocaleString() },
        { label: 'Officers committed', value: events.reduce((s, e) => s + e.officers, 0).toLocaleString() },
        { label: 'High-threat events', value: events.filter(e => e.threatLevel === 'high').length, tone: 'alert' },
      ]} />
      <PoliceRule label="event security board" />
      {events.map(e => (
        <PoliceRosterRow key={e.id} accent={accent}
          id={e.id} label={`${e.kind} · ${e.attendance.toLocaleString()} attendance`}
          status={`${e.threatLevel} threat`}
          tail={`${e.officers} officers`}
          tone={e.threatLevel === 'high' ? 'alert' : e.threatLevel === 'medium' ? 'warn' : 'ok'} />
      ))}
      <PoliceCalloutNote kicker="proportionality" body="Officer deployment is calibrated to actual threat — not symbolic posture. Plain-clothes ratios and intelligence-led restrictions are reviewable." />
    </div>
  );
}
