// lib/gov/geopolitical-continuity.ts
//
// The sovereign Constitutional Geopolitical & Strategic Continuity engine.
// Civilizations survive within an interconnected world through strategic
// resilience, lawful cooperation and sovereign autonomy — NOT domination.
// This models strategic autonomy, cross-border pressure propagation,
// migration/humanitarian continuity, global economic shock and diplomatic
// resilience at strict aggregate level. It is DEFENSIVE & internationally
// lawful only — no aggression, offensive manipulation, unlawful
// intelligence aggregation, external ideological targeting or population
// influence operations (enforced by GEOPOLITICAL_SAFEGUARDS + tests).
// Pure & deterministic; composed from the live governance engines.

import { seed, wave } from '@/lib/telemetry';
import { economyBoard } from '@/lib/gov/institutional-economy';
import { civicBoard } from '@/lib/gov/civic-legitimacy';
import { generationalBoard, ERA_COUNT } from '@/lib/gov/generational-intelligence';
import { knowledgeBoard } from '@/lib/gov/knowledge-continuity';
import { territorialBoard } from '@/lib/gov/territorial-continuity';

// Hard constitutional geopolitical boundary — structural, not advisory.
export const GEOPOLITICAL_SAFEGUARDS = {
  scope: 'strategic-aggregate-only' as const,
  perCitizenData: false as const,
  internationallyLawful: true as const,
  defensiveOnly: true as const,
  prohibited: [
    'geopolitical-aggression', 'offensive-strategic-manipulation', 'unlawful-intelligence-aggregation',
    'external-ideological-targeting', 'population-influence-operations', 'cross-border-coercive-systems',
  ] as const,
};

export interface StrategicAutonomy {
  externalDependencyRisk: number;     // higher = worse
  foodSecurity: number;
  energySecurity: number;
  digitalSovereignty: number;
  infrastructureSovereignty: number;
  criticalSupplyVulnerability: number; // higher = worse
  technologicalDependence: number;     // higher = worse
  strategicFragility: number;          // composite, higher = worse
}

export interface CrossBorderVector {
  from: string;
  chain: string;
  magnitude: number;
}

export interface MigrationHumanitarian {
  region: string;
  migrationPressure: number;
  humanitarianCapacity: number;
  absorptionResilience: number;
  borderContinuity: number;
  displacementStress: number;
  supportContinuity: number;
}

export type GeoMode =
  | 'sovereign-stable' | 'rising-external-pressure' | 'dependency-exposure'
  | 'regional-destabilization' | 'migration-pressure' | 'strategic-fragility'
  | 'alliance-strain' | 'strategic-recovery' | 'restored-strategic-autonomy';

export interface GeopoliticalBoard {
  epoch: number;
  autonomy: StrategicAutonomy;
  vectors: CrossBorderVector[];
  externalAmplification: number;
  migration: MigrationHumanitarian[];
  globalShock: { commodityInstability: number; supplyChainDisruption: number; inflationPressure: number; importDependence: number; tradeRouteFragility: number; institutionalStrain: number };
  diplomacy: { regionalCoordination: number; allianceStability: number; emergencyCooperation: number; partnershipResilience: number; isolationPressure: number };
  strategicInformation: { communicationResilience: number; crisisInfoContinuity: number; diplomaticClarity: number; misinformationPressure: number };
  sovereigntyTrajectory: number[];
  mode: GeoMode;
  warnings: { kind: string; detail: string; severity: 'advisory' | 'elevated' | 'critical' }[];
  stabilization: { kind: string; detail: string; advisory: true }[];
  prohibited: readonly string[];
  memory: { regionalCrisisEras: number[]; allianceRecoveryCycles: number; strategicCollapseEras: number[]; adaptationEffectivenessPct: number };
}

export function geopoliticalBoard(now: number): GeopoliticalBoard {
  const epoch = Math.max(0, Math.floor(now / 4000));
  const eco = economyBoard(now);
  const civ = civicBoard(now);
  const gen = generationalBoard(now);
  const kno = knowledgeBoard(now);
  const terr = territorialBoard(now);
  const dur0 = gen.durability[0]!;
  const w = (s: string, lo: number, hi: number) => Math.round(wave(`gp:${s}`, epoch / (7 + seed(`gp:c:${s}`) * 7), lo, hi));

  const externalDependencyRisk = w('dep', 24, 78);
  const foodSecurity = Math.max(0, Math.min(100, 90 - terr.regions.reduce((s, r) => s + r.agriculturalInstability, 0) / terr.regions.length * 0.5));
  const energySecurity = Math.max(0, Math.min(100, w('en', 40, 92) - Math.round(externalDependencyRisk * 0.2)));
  const digitalSovereignty = Math.max(0, Math.min(100, w('dig', 38, 88)));
  const infrastructureSovereignty = Math.max(0, Math.min(100, w('inf', 42, 90) - Math.round(eco.meanFatigue * 0.1)));
  const criticalSupplyVulnerability = Math.max(0, Math.min(100, w('sup', 18, 70) + Math.round(externalDependencyRisk * 0.15)));
  const technologicalDependence = Math.max(0, Math.min(100, 100 - kno.innovation.knowledgeProduction * 0.6 - digitalSovereignty * 0.3));
  const strategicFragility = Math.max(0, Math.min(100, Math.round(
    externalDependencyRisk * 0.25 + criticalSupplyVulnerability * 0.2 + technologicalDependence * 0.2
    + (100 - foodSecurity) * 0.15 + (100 - energySecurity) * 0.1 + (100 - infrastructureSovereignty) * 0.1,
  )));
  const autonomy: StrategicAutonomy = {
    externalDependencyRisk, foodSecurity: Math.round(foodSecurity), energySecurity, digitalSovereignty,
    infrastructureSovereignty, criticalSupplyVulnerability, technologicalDependence, strategicFragility,
  };

  // Cross-border pressure propagation → institutional load.
  const regionalConflict = w('rc', 10, 80);
  const globalRecession = w('gr', 12, 78);
  const neighboringCollapse = w('nc', 8, 74);
  const maritimeDisruption = w('md', 10, 72);
  const vectors: CrossBorderVector[] = [
    { from: 'Regional conflict', chain: 'migration surge → municipal overload → civic pressure', magnitude: Math.round(Math.max(0, regionalConflict - 45) * 0.6) },
    { from: 'Global recession', chain: 'labour instability → institutional fatigue → legitimacy erosion', magnitude: Math.round(Math.max(0, globalRecession - 45) * 0.55) },
    { from: 'Neighboring collapse', chain: 'border strain → identity-system pressure → continuity risk', magnitude: Math.round(Math.max(0, neighboringCollapse - 45) * 0.55) },
    { from: 'Maritime disruption', chain: 'supply-chain stress → economic overload → civic instability', magnitude: Math.round(Math.max(0, maritimeDisruption - 45) * 0.5) },
  ];
  const externalAmplification = Math.min(60, vectors.reduce((s, v) => s + v.magnitude, 0));

  // Migration & humanitarian continuity — lawful, non-discriminatory.
  const migration: MigrationHumanitarian[] = (eco.regions.length ? eco.regions.map(r => r.region) : ['Capital District', 'Northern', 'Eastern', 'Western', 'Coastal', 'Highland']).map(region => {
    const k = `gp:mig:${region}`;
    const er = eco.regions.find(x => x.region === region);
    const migrationPressure = Math.round(Math.max(0, regionalConflict - 30) * 0.5 + wave(`${k}:p`, epoch / 8, 10, 60));
    const humanitarianCapacity = Math.max(0, Math.min(100, Math.round(72 - (er?.fatiguePct ?? 40) * 0.3 + (seed(`${k}:h`) - 0.5) * 16)));
    const absorptionResilience = Math.max(0, Math.min(100, Math.round(humanitarianCapacity * 0.6 + (100 - (er?.strainPct ?? 60)) * 0.4)));
    const borderContinuity = Math.max(0, Math.min(100, Math.round(80 - migrationPressure * 0.3 + (seed(`${k}:b`) - 0.5) * 14)));
    const displacementStress = Math.max(0, Math.min(100, Math.round(migrationPressure * 0.6 + (100 - absorptionResilience) * 0.4)));
    const supportContinuity = Math.max(0, Math.min(100, Math.round((humanitarianCapacity + absorptionResilience) / 2)));
    return { region, migrationPressure, humanitarianCapacity, absorptionResilience, borderContinuity, displacementStress, supportContinuity };
  }).sort((a, b) => b.displacementStress - a.displacementStress);

  const globalShock = {
    commodityInstability: w('com', 18, 80),
    supplyChainDisruption: w('scd', 16, 78),
    inflationPressure: w('inflp', 14, 76),
    importDependence: externalDependencyRisk,
    tradeRouteFragility: w('trf', 14, 74),
    institutionalStrain: 0,
  };
  globalShock.institutionalStrain = Math.min(100, Math.round(
    globalShock.commodityInstability * 0.25 + globalShock.supplyChainDisruption * 0.25
    + globalShock.inflationPressure * 0.2 + globalShock.tradeRouteFragility * 0.15 + externalAmplification * 0.5,
  ));

  const diplomacy = {
    regionalCoordination: w('regco', 40, 88),
    allianceStability: w('all', 38, 86),
    emergencyCooperation: w('emc', 42, 90),
    partnershipResilience: w('par', 40, 86),
    isolationPressure: Math.max(0, Math.min(100, w('iso', 10, 60) + Math.round(strategicFragility * 0.2))),
  };

  const strategicInformation = {
    communicationResilience: Math.max(0, Math.min(100, Math.round(civ.fairnessContinuity * 0.4 + dur0.oversightStrength * 0.6))),
    crisisInfoContinuity: Math.max(0, Math.min(100, kno.cognitiveResilience.crisisInfoStability)),
    diplomaticClarity: Math.max(0, Math.min(100, Math.round(diplomacy.regionalCoordination * 0.6 + dur0.separationResilience * 0.4))),
    misinformationPressure: Math.max(0, Math.min(100, kno.cognitiveResilience.civicConfusionIndex)),
  };

  const sovereigntyTrajectory = gen.durability.map((d, e) => Math.max(0, Math.min(100, Math.round(
    (100 - strategicFragility) * 0.4 + diplomacy.allianceStability * 0.2 + d.separationResilience * 0.15
    + autonomy.energySecurity * 0.1 - e * 1.5 - externalAmplification * 0.15 + (seed(`gp:traj:${e}`) - 0.5) * 8,
  ))));
  const endS = sovereigntyTrajectory[ERA_COUNT - 1]!;
  const slope = endS - sovereigntyTrajectory[0]!;

  const mode: GeoMode =
    strategicFragility >= 65 ? 'strategic-fragility'
      : externalAmplification >= 35 ? 'regional-destabilization'
        : autonomy.externalDependencyRisk >= 65 ? 'dependency-exposure'
          : migration.some(m => m.displacementStress > 70) ? 'migration-pressure'
            : diplomacy.isolationPressure >= 55 ? 'alliance-strain'
              : slope <= -8 ? 'rising-external-pressure'
                : slope >= 8 && endS >= 62 ? 'restored-strategic-autonomy'
                  : slope >= 5 ? 'strategic-recovery' : 'sovereign-stable';

  const warnings: GeopoliticalBoard['warnings'] = [];
  if (strategicFragility >= 55) warnings.push({ kind: 'strategic-fragility', detail: `Strategic fragility ${strategicFragility} — dependency ${externalDependencyRisk}, supply vulnerability ${criticalSupplyVulnerability}`, severity: strategicFragility >= 70 ? 'critical' : 'elevated' });
  if (externalAmplification >= 30) warnings.push({ kind: 'cross-border-contagion', detail: `External pressure amplifies institutional load by ${externalAmplification}`, severity: 'elevated' });
  for (const m of migration.filter(x => x.displacementStress > 70)) {
    warnings.push({ kind: 'humanitarian-continuity-strain', detail: `${m.region}: displacement stress ${m.displacementStress} vs support continuity ${m.supportContinuity}`, severity: 'elevated' });
  }
  if (diplomacy.isolationPressure >= 50) warnings.push({ kind: 'diplomatic-isolation', detail: `Isolation pressure ${diplomacy.isolationPressure} — alliance & cooperation resilience weakening`, severity: 'elevated' });

  // Lawful, defensive strategic stabilization — advisory only.
  const stabilization: { kind: string; detail: string; advisory: true }[] = [];
  if (autonomy.externalDependencyRisk >= 55) stabilization.push({ kind: 'reduce-dependency-exposure', detail: 'Diversify critical-supply & reduce external dependency exposure (lawful, defensive)', advisory: true });
  if (migration.some(m => m.displacementStress > 60)) stabilization.push({ kind: 'humanitarian-readiness', detail: 'Strengthen humanitarian capacity & lawful border continuity — equitable, no discriminatory classification', advisory: true });
  if (globalShock.institutionalStrain >= 50) stabilization.push({ kind: 'shock-buffering', detail: 'Buffer external economic-shock transmission via strategic reserves & supply continuity', advisory: true });
  if (diplomacy.isolationPressure >= 45) stabilization.push({ kind: 'cooperation-readiness', detail: 'Reinforce lawful regional-coordination & emergency-cooperation readiness', advisory: true });

  const regionalCrisisEras = sovereigntyTrajectory.map((v, e) => ({ v, e })).filter(x => x.v < 45).map(x => x.e);

  return {
    epoch, autonomy, vectors, externalAmplification, migration, globalShock, diplomacy,
    strategicInformation, sovereigntyTrajectory, mode, warnings, stabilization,
    prohibited: GEOPOLITICAL_SAFEGUARDS.prohibited,
    memory: {
      regionalCrisisEras,
      allianceRecoveryCycles: sovereigntyTrajectory.reduce((acc: number, v, i) => acc + (i > 0 && v - sovereigntyTrajectory[i - 1]! >= 6 ? 1 : 0), 0),
      strategicCollapseEras: sovereigntyTrajectory.map((v, e) => ({ v, e })).filter(x => x.v < 38).map(x => x.e),
      adaptationEffectivenessPct: Math.max(15, Math.min(95, Math.round((100 - strategicFragility) * 0.5 + diplomacy.partnershipResilience * 0.3 + (100 - gen.driftRiskHorizon) * 0.2))),
    },
  };
}
