// Field Operations — shared deterministic field-deployment engine.
//
// Institutions operate physical field units (patrols, inspection teams,
// relief columns, ambulances, extension officers). This models their live
// status + telemetry so apps can run a real field-deployment workflow,
// not a static count. Pure & deterministic; no React/DOM.

import { seed, wave } from '@/lib/telemetry';
import type { ArchetypeKey } from '@/lib/api/types';

const REGIONS = ['Capital District', 'Northern', 'Eastern', 'Western', 'Coastal', 'Highland'];
type Tone = 'ok' | 'warn' | 'alert';

const UNIT_KIND: Partial<Record<ArchetypeKey, string>> = {
  HEALTH: 'Ambulance & mobile clinic',
  INTERIOR: 'Patrol & response unit',
  AGRICULTURE: 'Extension & vet team',
  ENVIRONMENT: 'Ranger & monitoring team',
  TRANSPORT: 'Inspection & recovery unit',
  ENERGY: 'Grid maintenance crew',
  JUSTICE: 'Court & transfer escort',
};

export interface FieldUnit {
  id: string;
  region: string;
  status: 'staged' | 'tasked' | 'en-route' | 'on-scene' | 'cleared';
  etaMin: number;
  telemetryPct: number;   // signal/telemetry integrity
  tone: Tone;
}
export interface FieldOperations {
  unitClass: string;
  fleet: number;
  deployed: number;
  available: number;
  meanEtaMin: number;
  telemetryHealthPct: number;
  byRegion: { region: string; active: number; backlog: number; tone: Tone }[];
  units: FieldUnit[];
  posture: 'nominal' | 'surged' | 'overstretched';
}

export function fieldOperations(instId: string, archetype: ArchetypeKey, t: number): FieldOperations {
  const unitClass = UNIT_KIND[archetype] ?? 'Field operations team';
  const fleet = 60 + Math.round(seed(`fo:fl:${instId}`) * 320);
  const deployRatio = wave(`fo:dr:${instId}`, t, 0.28, 0.84);
  const deployed = Math.round(fleet * deployRatio);
  const statuses: FieldUnit['status'][] = ['staged', 'tasked', 'en-route', 'on-scene', 'cleared'];
  const units: FieldUnit[] = Array.from({ length: 10 }, (_, i): FieldUnit => {
    const phase = Math.floor((t / (5 + seed(`fo:c:${instId}:${i}`) * 7) + seed(`fo:o:${instId}:${i}`) * statuses.length)) % statuses.length;
    const status = statuses[phase]!;
    const tele = Math.round(wave(`fo:tl:${instId}:${i}`, t, 62, 99));
    return {
      id: `FU-${100 + i}`,
      region: REGIONS[i % REGIONS.length]!,
      status,
      etaMin: status === 'on-scene' || status === 'cleared' ? 0 : Math.round(wave(`fo:eta:${instId}:${i}`, t, 4, 38)),
      telemetryPct: tele,
      tone: tele >= 85 ? 'ok' : tele >= 68 ? 'warn' : 'alert',
    };
  });
  const meanEtaMin = Math.round(units.filter(u => u.etaMin > 0).reduce((a, u) => a + u.etaMin, 0) / Math.max(1, units.filter(u => u.etaMin > 0).length));
  const telemetryHealthPct = Math.round(units.reduce((a, u) => a + u.telemetryPct, 0) / units.length);
  const byRegion = REGIONS.map((region, i): { region: string; active: number; backlog: number; tone: Tone } => {
    const active = Math.round(wave(`fo:ra:${instId}:${i}`, t, 1, 24));
    const backlog = Math.round(wave(`fo:rb:${instId}:${i}`, t, 0, 40));
    return { region, active, backlog, tone: backlog >= 28 ? 'alert' : backlog >= 14 ? 'warn' : 'ok' };
  });
  const posture: FieldOperations['posture'] =
    deployRatio >= 0.78 ? 'overstretched' : deployRatio >= 0.6 ? 'surged' : 'nominal';
  return {
    unitClass, fleet, deployed, available: fleet - deployed,
    meanEtaMin, telemetryHealthPct, byRegion, units, posture,
  };
}

/** 0-100 field-operations strain — propagates to emergency posture. */
export function fieldStrain(instId: string, archetype: ArchetypeKey, t: number): number {
  const f = fieldOperations(instId, archetype, t);
  const v =
    (f.deployed / Math.max(1, f.fleet)) * 60 +
    Math.max(0, (f.meanEtaMin - 15)) * 1.4 +
    Math.max(0, (90 - f.telemetryHealthPct)) * 0.6 +
    f.byRegion.filter(r => r.tone === 'alert').length * 6;
  return Math.round(Math.max(0, Math.min(100, v)));
}
