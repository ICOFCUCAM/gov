// lib/gov/territorial-continuity.ts
//
// The sovereign Ecological & Territorial Continuity engine. Civilizations
// fail when territorial systems collapse: this models land, water,
// climate, urbanization and disaster adaptation as a continuity organism,
// propagates ecological strain into institutional shells, and forecasts
// territorial survivability across generations. Strictly aggregate /
// territorial — no coercive population control, demographic engineering,
// territorial discrimination, resource authoritarianism or ecological
// surveillance abuse (enforced by ECOLOGICAL_SAFEGUARDS + tests). Pure &
// deterministic; composed from the live governance engines.

import { seed, wave } from '@/lib/telemetry';
import { digitalTwin } from '@/lib/gov/national-causality';
import { economyBoard } from '@/lib/gov/institutional-economy';
import { generationalBoard, ERA_COUNT } from '@/lib/gov/generational-intelligence';
import { civicBoard } from '@/lib/gov/civic-legitimacy';

// Hard constitutional ecological boundary — structural, not advisory.
export const ECOLOGICAL_SAFEGUARDS = {
  scope: 'territorial-aggregate-only' as const,
  perCitizenData: false as const,
  equitableContinuity: true as const,
  prohibited: [
    'coercive-population-control', 'forced-demographic-engineering', 'territorial-discrimination',
    'resource-authoritarianism', 'ecological-surveillance-abuse',
  ] as const,
};

const REGIONS = ['Capital District', 'Northern', 'Eastern', 'Western', 'Coastal', 'Highland'];

export interface RegionEcology {
  region: string;
  drought: number;
  flooding: number;
  wildfire: number;
  desertification: number;
  coastalErosion: number;
  pollution: number;
  biodiversityLoss: number;
  agriculturalInstability: number;
  infraClimateStress: number;
  waterAvailability: number;    // higher = better
  scarcityIndex: number;        // higher = worse
  ecologicalStrain: number;     // 0..160 composite
  survivability: number;        // 0..100
  vulnerabilityZone: boolean;
}

export type EcoMode =
  | 'sustainable-continuity' | 'rising-environmental-strain' | 'territorial-imbalance'
  | 'ecological-overload' | 'climate-migration-pressure' | 'continuity-fragility'
  | 'adaptation-mobilization' | 'ecological-recovery' | 'restored-territorial-resilience';

export interface EcoCausalEdge { from: string; to: string; mechanism: string; magnitude: number }

export interface DisasterAdaptation {
  region: string;
  recurrence: number;
  readiness: number;
  recoveryDurability: number;
  repeatedCollapse: boolean;
}

export interface TerritorialBoard {
  epoch: number;
  regions: RegionEcology[];
  meanStrain: number;
  meanSurvivability: number;
  vulnerabilityZones: number;
  edges: EcoCausalEdge[];
  institutionalAmplification: number;
  urbanization: { key: string; label: string; trajectory: number[]; pressure: string }[];
  disaster: DisasterAdaptation[];
  ecoLegitimacy: { territorialFracture: number; abandonmentPerception: number; disasterResponseConfidence: number };
  resilienceTrajectory: number[];
  mode: EcoMode;
  warnings: { kind: string; detail: string; severity: 'advisory' | 'elevated' | 'critical' }[];
  stabilization: { kind: string; detail: string; advisory: true }[];
  prohibited: readonly string[];
  memory: { droughtEras: number[]; floodCycles: number; migrationWaves: number; repeatedCollapseZones: string[]; recoveryEffectivenessPct: number };
}

export function territorialBoard(now: number): TerritorialBoard {
  const epoch = Math.max(0, Math.floor(now / 4000));
  const twin = digitalTwin(now);
  const eco = economyBoard(now);
  const gen = generationalBoard(now);
  const civ = civicBoard(now);

  const regions: RegionEcology[] = REGIONS.map(region => {
    const k = `tc:${region}`;
    const cadence = 7 + seed(`${k}:cad`) * 8;
    const m = (s: string, lo: number, hi: number) => Math.round(wave(`${k}:${s}`, epoch / cadence, lo, hi));
    const drought = m('dr', 10, 95);
    const flooding = m('fl', 8, 92);
    const wildfire = m('wf', 5, 88);
    const desertification = m('de', 4, 80);
    const coastalErosion = region === 'Coastal' ? m('ce', 30, 96) : m('ce', 2, 45);
    const pollution = m('po', 12, 90);
    const biodiversityLoss = m('bd', 10, 85);
    const agriculturalInstability = Math.round((drought * 0.4 + flooding * 0.3 + desertification * 0.3));
    const infraClimateStress = Math.round((flooding * 0.4 + wildfire * 0.25 + coastalErosion * 0.35));
    const waterAvailability = Math.max(0, Math.min(100, Math.round(100 - drought * 0.6 - pollution * 0.2 + (seed(`${k}:wa`) - 0.5) * 14)));
    const scarcityIndex = Math.max(0, Math.min(100, Math.round(100 - waterAvailability + agriculturalInstability * 0.3)));
    const ecologicalStrain = Math.round(
      drought * 0.18 + flooding * 0.16 + wildfire * 0.12 + desertification * 0.12
      + coastalErosion * 0.1 + pollution * 0.1 + biodiversityLoss * 0.08
      + agriculturalInstability * 0.08 + infraClimateStress * 0.06,
    );
    const survivability = Math.max(0, Math.min(100, Math.round(100 - ecologicalStrain * 0.7 - scarcityIndex * 0.2)));
    return {
      region, drought, flooding, wildfire, desertification, coastalErosion, pollution,
      biodiversityLoss, agriculturalInstability, infraClimateStress, waterAvailability,
      scarcityIndex, ecologicalStrain, survivability,
      vulnerabilityZone: survivability < 42 || scarcityIndex > 70,
    };
  }).sort((a, b) => b.ecologicalStrain - a.ecologicalStrain);

  const meanStrain = Math.round(regions.reduce((s, r) => s + r.ecologicalStrain, 0) / regions.length);
  const meanSurvivability = Math.round(regions.reduce((s, r) => s + r.survivability, 0) / regions.length);
  const worst = regions[0]!;

  // Ecological causality → institutional propagation.
  const edges: EcoCausalEdge[] = [
    { from: 'Drought', to: 'Agriculture → migration → municipal', mechanism: 'drought → agricultural collapse → migration pressure → municipal overload', magnitude: Math.round(Math.max(0, worst.drought - 60) * 0.6) },
    { from: 'Flooding', to: 'Infrastructure → regional → permits', mechanism: 'flooding → infrastructure disruption → regional instability → permit congestion', magnitude: Math.round(Math.max(0, worst.flooding - 60) * 0.55) },
    { from: 'Heatwave/Wildfire', to: 'Energy → economy → institutions', mechanism: 'heat/fire → energy strain → economic slowdown → institutional fatigue', magnitude: Math.round(Math.max(0, worst.wildfire - 55) * 0.5) },
    { from: 'Coastal erosion', to: 'Displacement → identity → housing', mechanism: 'coastal erosion → displacement → identity-system pressure → housing overload', magnitude: Math.round(Math.max(0, worst.coastalErosion - 55) * 0.5) },
  ];
  const institutionalAmplification = Math.min(60, edges.reduce((s, e) => s + e.magnitude, 0));

  // Urbanization & infrastructure evolution (multi-era).
  const urbanDef = [
    { key: 'urban-expansion', label: 'Urban expansion', from: 46, drift: 4.2, pressure: 'housing & municipal load' },
    { key: 'informal-settlement', label: 'Informal settlement growth', from: 28, drift: 3.4, pressure: 'service & registry strain' },
    { key: 'transport-saturation', label: 'Transport saturation', from: 52, drift: 3.0, pressure: 'corridor & mobility stress' },
    { key: 'infra-aging', label: 'Infrastructure aging', from: 38, drift: 3.8, pressure: 'climate-stress fragility' },
    { key: 'regional-depopulation', label: 'Regional depopulation', from: 18, drift: 2.6, pressure: 'territorial inequality' },
  ];
  const urbanization = urbanDef.map(d => ({
    key: d.key, label: d.label, pressure: d.pressure,
    trajectory: Array.from({ length: ERA_COUNT }, (_, e) =>
      Math.max(0, Math.min(100, Math.round(d.from + d.drift * e + (seed(`tc:urb:${d.key}:${e}`) - 0.5) * 8)))),
  }));

  // Disaster adaptation per region.
  const disaster: DisasterAdaptation[] = regions.map(r => {
    const recurrence = Math.round((r.flooding + r.wildfire + r.drought) / 3);
    const readiness = Math.max(0, Math.min(100, Math.round(78 - r.infraClimateStress * 0.4 + (seed(`tc:rd:${r.region}`) - 0.5) * 18)));
    const recoveryDurability = Math.max(0, Math.min(100, Math.round(readiness * 0.6 + (100 - r.ecologicalStrain) * 0.4)));
    return { region: r.region, recurrence, readiness, recoveryDurability, repeatedCollapse: recurrence > 70 && recoveryDurability < 45 };
  });

  // Ecological legitimacy — environmental stress → civic continuity.
  const stressedRegions = regions.filter(r => r.vulnerabilityZone).length;
  const ecoLegitimacy = {
    territorialFracture: Math.min(100, Math.round(stressedRegions / regions.length * 100)),
    abandonmentPerception: Math.max(0, Math.min(100, Math.round(stressedRegions * 12 + (100 - civ.trustIndex) * 0.3))),
    disasterResponseConfidence: Math.max(0, Math.min(100, Math.round(disaster.reduce((s, d) => s + d.readiness, 0) / disaster.length))),
  };

  // Long-horizon ecological resilience trajectory.
  const resilienceTrajectory = gen.durability.map((d, e) => Math.max(0, Math.min(100, Math.round(
    (100 - meanStrain) * 0.5 + meanSurvivability * 0.3 - e * 1.6
    + (d.separationResilience - 50) * 0.1 + (seed(`tc:rt:${e}`) - 0.5) * 8,
  ))));
  const endResil = resilienceTrajectory[ERA_COUNT - 1]!;
  const slope = endResil - resilienceTrajectory[0]!;

  const mode: EcoMode =
    stressedRegions >= 4 ? 'continuity-fragility'
      : meanStrain >= 75 ? 'ecological-overload'
        : ecoLegitimacy.abandonmentPerception >= 55 ? 'climate-migration-pressure'
          : regions.some(r => r.scarcityIndex > 75) ? 'territorial-imbalance'
            : slope <= -8 ? 'rising-environmental-strain'
              : slope >= 8 && endResil >= 62 ? 'restored-territorial-resilience'
                : slope >= 5 ? 'ecological-recovery'
                  : disaster.some(d => d.repeatedCollapse) ? 'adaptation-mobilization'
                    : 'sustainable-continuity';

  const warnings: TerritorialBoard['warnings'] = [];
  for (const r of regions.filter(x => x.vulnerabilityZone)) {
    warnings.push({ kind: 'territorial-vulnerability', detail: `${r.region}: survivability ${r.survivability}, scarcity ${r.scarcityIndex} — continuity vulnerability zone`, severity: r.survivability < 30 ? 'critical' : 'elevated' });
  }
  for (const d of disaster.filter(x => x.repeatedCollapse)) {
    warnings.push({ kind: 'repeated-collapse-territory', detail: `${d.region}: recurrence ${d.recurrence}, recovery durability ${d.recoveryDurability} — recovery exhaustion`, severity: 'critical' });
  }
  if (institutionalAmplification >= 30) warnings.push({ kind: 'ecological-institutional-cascade', detail: `Ecological strain amplifies institutional load by ${institutionalAmplification}`, severity: 'elevated' });

  const stabilization: { kind: string; detail: string; advisory: true }[] = [];
  if (regions.some(r => r.scarcityIndex > 65)) stabilization.push({ kind: 'resource-continuity', detail: 'Pre-position water/resource continuity for scarcity-escalation regions (equitable, non-coercive)', advisory: true });
  if (disaster.some(d => d.readiness < 50)) stabilization.push({ kind: 'adaptation-mobilization', detail: 'Reinforce disaster readiness & evacuation continuity in low-readiness regions', advisory: true });
  if (institutionalAmplification >= 25) stabilization.push({ kind: 'cascade-interdiction', detail: 'Buffer ecological→institutional propagation via municipal & registry surge capacity', advisory: true });
  if (endResil < 50) stabilization.push({ kind: 'territorial-reinforcement', detail: 'Generational territorial reinforcement for forecast low-resilience horizon', advisory: true });

  const droughtEras = resilienceTrajectory.map((v, e) => ({ v, e })).filter(x => x.v < 45).map(x => x.e);

  return {
    epoch, regions, meanStrain, meanSurvivability,
    vulnerabilityZones: stressedRegions, edges, institutionalAmplification,
    urbanization, disaster, ecoLegitimacy, resilienceTrajectory, mode, warnings, stabilization,
    prohibited: ECOLOGICAL_SAFEGUARDS.prohibited,
    memory: {
      droughtEras,
      floodCycles: regions.filter(r => r.flooding > 65).length,
      migrationWaves: ecoLegitimacy.abandonmentPerception >= 50 ? Math.round(ecoLegitimacy.abandonmentPerception / 20) : 0,
      repeatedCollapseZones: disaster.filter(d => d.repeatedCollapse).map(d => d.region),
      recoveryEffectivenessPct: Math.max(15, Math.min(95, Math.round(meanSurvivability * 0.5 + (100 - gen.driftRiskHorizon) * 0.2 + civ.memory.restorationEffectivenessPct * 0.3))),
    },
  };
}
