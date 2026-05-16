// National regional command model. The country is a tiered fabric:
// National → Regional → Local. Each region is a deterministic
// operational entity (population, infrastructure coverage, readiness,
// incident load, dependency to the capital). Pure; no React/DOM.

import { seed, wave, domainStress } from '@/lib/telemetry';
import type { ArchetypeKey } from '@/lib/api/types';

export interface RegionInfra { l: string; coverage: number }
export interface RegionModel {
  name: string;
  archetype: ArchetypeKey;   // dominant economic/operational character
  capital: boolean;
  populationM: number;
  composite: number;         // 0-100 operational stress
  readiness: number;         // 0-100
  incidents: number;
  posture: 'stable' | 'watch' | 'elevated' | 'critical';
  infra: RegionInfra[];
  capitalDependency: number; // 0-100 reliance on capital command
  domains: { k: string; v: number }[];
}

const DEF: { n: string; a: ArchetypeKey; cap: boolean; popM: number }[] = [
  { n: 'Northern Province', a: 'AGRICULTURE', cap: false, popM: 4.2 },
  { n: 'Highland Region', a: 'ENERGY', cap: false, popM: 3.1 },
  { n: 'Eastern Region', a: 'INTERIOR', cap: false, popM: 5.6 },
  { n: 'Capital District', a: 'FINANCE', cap: true, popM: 8.4 },
  { n: 'Western Region', a: 'TRANSPORT', cap: false, popM: 4.9 },
  { n: 'Coastal Region', a: 'TRADE', cap: false, popM: 6.3 },
];

const DOMAIN_KEYS = ['ops', 'infra', 'civil', 'sec', 'logi', 'emrg'] as const;
const INFRA = ['Road network', 'Power coverage', 'Water systems', 'Health facilities', 'Comms', 'Schools'] as const;

function postureOf(v: number): RegionModel['posture'] {
  return v >= 78 ? 'critical' : v >= 58 ? 'elevated' : v >= 40 ? 'watch' : 'stable';
}

export function nationalRegions(t: number): RegionModel[] {
  return DEF.map(r => {
    const domains = DOMAIN_KEYS.map(k => ({ k, v: domainStress(r.a, k, 55, t, r.n) }));
    const composite = Math.round(domains.reduce((a, d) => a + d.v, 0) / domains.length);
    const readiness = Math.max(1, 100 - composite);
    const incidents = Math.round(seed(`rinc:${r.n}:${Math.floor(t / 6)}`) * (composite >= 70 ? 7 : 3));
    const infra: RegionInfra[] = INFRA.map(l => ({
      l, coverage: Math.round(wave(`rinf:${r.n}:${l}`, t, r.cap ? 78 : 55, r.cap ? 99 : 94)),
    }));
    const capitalDependency = r.cap ? 0 : 40 + Math.round(seed(`rcd:${r.n}`) * 45);
    return {
      name: r.n, archetype: r.a, capital: r.cap, populationM: r.popM,
      composite, readiness, incidents, posture: postureOf(composite),
      infra, capitalDependency, domains,
    };
  });
}

export interface RegionRollup {
  meanReadiness: number;
  critical: number;
  elevated: number;
  population: number;
  totalIncidents: number;
  meanInfra: number;
  posture: RegionModel['posture'];
}

export function regionRollup(regions: RegionModel[]): RegionRollup {
  const n = regions.length || 1;
  const meanReadiness = Math.round(regions.reduce((a, r) => a + r.readiness, 0) / n);
  const meanInfra = Math.round(
    regions.reduce((a, r) => a + r.infra.reduce((x, i) => x + i.coverage, 0) / r.infra.length, 0) / n,
  );
  const critical = regions.filter(r => r.posture === 'critical').length;
  const elevated = regions.filter(r => r.posture === 'elevated').length;
  return {
    meanReadiness, critical, elevated, meanInfra,
    population: Math.round(regions.reduce((a, r) => a + r.populationM, 0) * 10) / 10,
    totalIncidents: regions.reduce((a, r) => a + r.incidents, 0),
    posture: critical ? 'critical' : elevated ? 'elevated' : meanReadiness < 60 ? 'watch' : 'stable',
  };
}
