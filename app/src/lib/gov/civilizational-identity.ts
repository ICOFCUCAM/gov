// lib/gov/civilizational-identity.ts
//
// The sovereign Constitutional Cultural & Civilizational Continuity
// engine. Civilizations survive through meaning, memory and civic
// belonging — not only law and territory. This models CONSTITUTIONAL
// civic identity, cultural resilience, heritage memory and pluralistic
// cohesion at strict region/aggregate level. It NEVER classifies ethnic,
// religious, ideological or political identity, scores conformity, or
// engineers assimilation (enforced by CIVIC_IDENTITY_SAFEGUARDS + tests).
// Pure & deterministic; composed from the live governance engines.

import { seed, wave } from '@/lib/telemetry';
import { civicBoard } from '@/lib/gov/civic-legitimacy';
import { generationalBoard, ERA_COUNT } from '@/lib/gov/generational-intelligence';
import { territorialBoard } from '@/lib/gov/territorial-continuity';
import { economyBoard } from '@/lib/gov/institutional-economy';

// Hard constitutional cultural boundary — structural, not advisory.
export const CIVIC_IDENTITY_SAFEGUARDS = {
  scope: 'civic-aggregate-only' as const,
  perCitizenData: false as const,
  politicallyNeutral: true as const,
  pluralistic: true as const,
  prohibited: [
    'ethnic-classification', 'ideological-loyalty-scoring', 'cultural-conformity-metrics',
    'religious-profiling', 'political-identity-targeting', 'forced-assimilation',
    'identity-based-discrimination',
  ] as const,
};

const REGIONS = ['Capital District', 'Northern', 'Eastern', 'Western', 'Coastal', 'Highland'];

export interface RegionIdentity {
  region: string;
  languageContinuity: number;       // aggregate cultural-continuity, not classification
  culturalParticipation: number;
  heritageIntegrity: number;
  intergenerationalTransfer: number;
  civicMemory: number;
  civicBelonging: number;           // constitutional belonging (institutional)
  culturalResilience: number;       // composite 0..100
  fragmentationZone: boolean;
}

export interface IntegrationContinuity {
  region: string;
  integrationPressure: number;
  absorptionCapacity: number;
  inclusionContinuity: number;
  fragmentationRisk: number;
}

export type CivilizationIdentityMode =
  | 'cohesive-continuity' | 'rising-fragmentation' | 'regional-identity-imbalance'
  | 'cultural-erosion' | 'integration-pressure' | 'continuity-fragility'
  | 'cohesion-mobilization' | 'civic-recovery' | 'restored-pluralistic-continuity';

export interface CivilizationalBoard {
  epoch: number;
  regions: RegionIdentity[];
  meanResilience: number;
  fragmentationZones: number;
  civicBelongingIndex: number;
  regionalImbalance: number;
  integration: IntegrationContinuity[];
  heritage: { siteContinuity: number; archiveSurvivability: number; linguisticPreservation: number; oralHistoryContinuity: number; constitutionalMemoryRetention: number };
  continuityTrajectory: number[];
  mode: CivilizationIdentityMode;
  warnings: { kind: string; detail: string; severity: 'advisory' | 'elevated' | 'critical' }[];
  stabilization: { kind: string; detail: string; advisory: true }[];
  prohibited: readonly string[];
  memory: { fragmentationEpisodes: number[]; integrationSuccessCycles: number; culturalRecoveryEras: number[]; cohesionRestorationPct: number };
}

export function civilizationalBoard(now: number): CivilizationalBoard {
  const epoch = Math.max(0, Math.floor(now / 4000));
  const civ = civicBoard(now);
  const gen = generationalBoard(now);
  const terr = territorialBoard(now);
  const eco = economyBoard(now);
  const dur0 = gen.durability[0]!;

  const regions: RegionIdentity[] = REGIONS.map(region => {
    const k = `ci:${region}`;
    const cadence = 8 + seed(`${k}:cad`) * 7;
    const m = (s: string, lo: number, hi: number) => Math.round(wave(`${k}:${s}`, epoch / cadence, lo, hi));
    const cv = civ.regions.find(r => r.region === region);
    const tv = terr.regions.find(r => r.region === region);
    const belongingBase = cv ? cv.trust : 60;
    const erosion = (tv?.vulnerabilityZone ? 12 : 0) + gen.corruption.normalization[0]! * 0.1;

    const languageContinuity = Math.max(0, Math.min(100, m('lang', 50, 95) - Math.round(erosion * 0.4)));
    const culturalParticipation = Math.max(0, Math.min(100, m('part', 40, 90) - Math.round(erosion * 0.5)));
    const heritageIntegrity = Math.max(0, Math.min(100, m('her', 45, 92) - Math.round(erosion * 0.6)));
    const intergenerationalTransfer = Math.max(0, Math.min(100, m('igt', 42, 88) - Math.round(erosion * 0.5)));
    const civicMemory = Math.max(0, Math.min(100, m('mem', 48, 90) - Math.round(erosion * 0.4)));
    const civicBelonging = Math.max(0, Math.min(100, Math.round(belongingBase * 0.7 + culturalParticipation * 0.3 - erosion * 0.3)));
    const culturalResilience = Math.round(
      languageContinuity * 0.2 + culturalParticipation * 0.18 + heritageIntegrity * 0.2
      + intergenerationalTransfer * 0.18 + civicMemory * 0.12 + civicBelonging * 0.12,
    );
    return {
      region, languageContinuity, culturalParticipation, heritageIntegrity,
      intergenerationalTransfer, civicMemory, civicBelonging, culturalResilience,
      fragmentationZone: culturalResilience < 45 || civicBelonging < 40,
    };
  }).sort((a, b) => a.culturalResilience - b.culturalResilience);

  const meanResilience = Math.round(regions.reduce((s, r) => s + r.culturalResilience, 0) / regions.length);
  const civicBelongingIndex = Math.round(regions.reduce((s, r) => s + r.civicBelonging, 0) / regions.length);
  const meanBel = civicBelongingIndex;
  const regionalImbalance = Math.round(Math.sqrt(regions.reduce((s, r) => s + (r.civicBelonging - meanBel) ** 2, 0) / regions.length));
  const fragmentationZones = regions.filter(r => r.fragmentationZone).length;

  // Migration & integration continuity (aggregate, pluralistic).
  const integration: IntegrationContinuity[] = REGIONS.map(region => {
    const er = eco.regions.find(r => r.region === region);
    const k = `ci:int:${region}`;
    const integrationPressure = Math.round((er?.strainPct ?? 60) * 0.5 + wave(`${k}:p`, epoch / 9, 10, 70));
    const absorptionCapacity = Math.max(0, Math.min(100, Math.round(80 - (er?.fatiguePct ?? 40) * 0.4 + (seed(`${k}:a`) - 0.5) * 18)));
    const inclusionContinuity = Math.max(0, Math.min(100, Math.round((regions.find(r => r.region === region)?.civicBelonging ?? 55) * 0.7 + absorptionCapacity * 0.3)));
    const fragmentationRisk = Math.max(0, Math.min(100, Math.round(integrationPressure * 0.5 + (100 - inclusionContinuity) * 0.5)));
    return { region, integrationPressure, absorptionCapacity, inclusionContinuity, fragmentationRisk };
  }).sort((a, b) => b.fragmentationRisk - a.fragmentationRisk);

  const heritage = {
    siteContinuity: Math.max(0, Math.min(100, Math.round(meanResilience * 0.6 + wave(`ci:h:site:${epoch}`, epoch / 11, 40, 90) * 0.4))),
    archiveSurvivability: Math.max(0, Math.min(100, Math.round(70 - gen.corruption.normalization[0]! * 0.2 + (seed(`ci:h:arch:${epoch}`) - 0.5) * 16))),
    linguisticPreservation: Math.round(regions.reduce((s, r) => s + r.languageContinuity, 0) / regions.length),
    oralHistoryContinuity: Math.round(regions.reduce((s, r) => s + r.intergenerationalTransfer, 0) / regions.length),
    constitutionalMemoryRetention: Math.max(0, Math.min(100, Math.round((dur0.oversightStrength + dur0.separationResilience) / 2))),
  };

  const continuityTrajectory = gen.durability.map((d, e) => Math.max(0, Math.min(100, Math.round(
    meanResilience * 0.45 + civicBelongingIndex * 0.3 + d.separationResilience * 0.15
    - e * 1.5 - gen.corruption.normalization[e]! * 0.12 + (seed(`ci:traj:${e}`) - 0.5) * 8,
  ))));
  const endC = continuityTrajectory[ERA_COUNT - 1]!;
  const slope = endC - continuityTrajectory[0]!;

  const mode: CivilizationIdentityMode =
    fragmentationZones >= 4 ? 'continuity-fragility'
      : meanResilience < 45 ? 'cultural-erosion'
        : regionalImbalance >= 16 ? 'regional-identity-imbalance'
          : integration.some(i => i.fragmentationRisk > 70) ? 'integration-pressure'
            : slope <= -8 ? 'rising-fragmentation'
              : slope >= 8 && endC >= 62 ? 'restored-pluralistic-continuity'
                : slope >= 5 ? 'civic-recovery'
                  : fragmentationZones > 0 ? 'cohesion-mobilization' : 'cohesive-continuity';

  const warnings: CivilizationalBoard['warnings'] = [];
  for (const r of regions.filter(x => x.fragmentationZone)) {
    warnings.push({ kind: 'cohesion-fracture-zone', detail: `${r.region}: cultural resilience ${r.culturalResilience}, civic belonging ${r.civicBelonging} — pluralistic cohesion at risk`, severity: r.culturalResilience < 32 ? 'critical' : 'elevated' });
  }
  for (const i of integration.filter(x => x.fragmentationRisk > 70)) {
    warnings.push({ kind: 'integration-fragmentation-risk', detail: `${i.region}: integration pressure ${i.integrationPressure} vs absorption ${i.absorptionCapacity} — inclusion continuity strain`, severity: 'elevated' });
  }
  if (heritage.archiveSurvivability < 50) warnings.push({ kind: 'civilizational-memory-erosion', detail: `Archive survivability ${heritage.archiveSurvivability} — constitutional memory continuity weakening`, severity: 'elevated' });

  // Lawful cultural-continuity stabilization — advisory & pluralistic.
  const stabilization: { kind: string; detail: string; advisory: true }[] = [];
  if (fragmentationZones > 0) stabilization.push({ kind: 'civic-inclusion', detail: 'Strengthen inclusive constitutional participation in cohesion-fracture regions (non-coercive, pluralistic)', advisory: true });
  if (heritage.linguisticPreservation < 60) stabilization.push({ kind: 'linguistic-preservation', detail: 'Support lawful linguistic & heritage continuity programmes', advisory: true });
  if (heritage.archiveSurvivability < 55) stabilization.push({ kind: 'heritage-continuity', detail: 'Reinforce archive & constitutional-memory survivability', advisory: true });
  if (regionalImbalance >= 12) stabilization.push({ kind: 'regional-cohesion', detail: 'Rebalance civic-belonging visibility across regions — no group prioritization', advisory: true });

  const fragmentationEpisodes = continuityTrajectory.map((v, e) => ({ v, e })).filter(x => x.v < 45).map(x => x.e);

  return {
    epoch, regions, meanResilience, fragmentationZones, civicBelongingIndex, regionalImbalance,
    integration, heritage, continuityTrajectory, mode, warnings, stabilization,
    prohibited: CIVIC_IDENTITY_SAFEGUARDS.prohibited,
    memory: {
      fragmentationEpisodes,
      integrationSuccessCycles: continuityTrajectory.reduce((acc: number, v, i) => acc + (i > 0 && v - continuityTrajectory[i - 1]! >= 6 ? 1 : 0), 0),
      culturalRecoveryEras: continuityTrajectory.map((v, e) => ({ v, e })).filter((x, i, arr) => i > 0 && x.v - arr[i - 1]!.v >= 6).map(x => x.e),
      cohesionRestorationPct: Math.max(15, Math.min(95, Math.round(meanResilience * 0.5 + civ.memory.restorationEffectivenessPct * 0.3 + (100 - gen.driftRiskHorizon) * 0.2))),
    },
  };
}
