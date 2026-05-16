// Environment Systems — deep operational engine (ENVIRONMENT archetype).
// Monitoring network, protected areas, permits/compliance and climate
// adaptation as live operational environments. Pure & deterministic.

import { seed, wave } from '@/lib/telemetry';

const REGIONS = ['Northern', 'Eastern', 'Western', 'Coastal', 'Highland', 'Capital District'];

export interface EnvironmentOps {
  airQualityIndex: number;            // lower better
  waterQualityPct: number;
  monitoringOnline: number; monitoringTotal: number;
  protectedAreaIntegrityPct: number;
  emissionsVsTargetPct: number;       // >100 = over target (bad)
  permitsPending: number; compliancePct: number;
  hazards: { region: string; level: 'low' | 'moderate' | 'severe'; kind: string }[];
}
const HAZARDS = ['Flood risk', 'Drought', 'Pollution event', 'Deforestation', 'Coastal erosion', 'Air-quality breach'];

export function environmentOps(id: string, t: number): EnvironmentOps {
  const total = 180 + Math.round(seed(`en:mt:${id}`) * 120);
  return {
    airQualityIndex: Math.round(wave(`en:aq:${id}`, t, 28, 168)),
    waterQualityPct: Math.round(wave(`en:wq:${id}`, t, 52, 96)),
    monitoringOnline: Math.round(total * wave(`en:mo:${id}`, t, 0.78, 0.99)),
    monitoringTotal: total,
    protectedAreaIntegrityPct: Math.round(wave(`en:pa:${id}`, t, 55, 95)),
    emissionsVsTargetPct: Math.round(wave(`en:em:${id}`, t, 78, 132)),
    permitsPending: Math.round(wave(`en:pp:${id}`, t, 40, 2600)),
    compliancePct: Math.round(wave(`en:cp:${id}`, t, 60, 96)),
    hazards: REGIONS.map((region, i) => {
      const s = wave(`en:hz:${id}:${i}`, t, 0, 1);
      return { region, level: s > 0.78 ? 'severe' : s > 0.45 ? 'moderate' : 'low', kind: HAZARDS[Math.floor(seed(`en:hk:${id}:${i}`) * HAZARDS.length)]! };
    }),
  };
}

export function environmentInstability(id: string, t: number): number {
  const o = environmentOps(id, t);
  const v =
    Math.max(0, (o.airQualityIndex - 100) * 0.4) +
    Math.max(0, (90 - o.waterQualityPct) * 0.6) +
    Math.max(0, (o.emissionsVsTargetPct - 100) * 1.2) +
    o.hazards.filter(h => h.level === 'severe').length * 10 +
    (o.monitoringTotal - o.monitoringOnline) * 0.5;
  return Math.round(Math.max(0, Math.min(100, v)));
}
