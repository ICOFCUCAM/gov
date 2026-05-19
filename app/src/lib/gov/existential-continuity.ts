// lib/gov/existential-continuity.ts
//
// The sovereign Constitutional Existential & Species-Continuity engine.
// Civilizations survive existential disruption only when they preserve
// constitutional humanity, dignity and democratic continuity through the
// catastrophe — never by suspending them. This models pandemic / health
// resilience, catastrophic-risk continuity, long-duration governance
// resilience, post-collapse recovery and planetary survivability at strict
// civilization-aggregate level. Emergency authoritarianism, coercive
// biosurveillance, population-value scoring, genetic prioritisation and
// technocratic survival hierarchy are STRUCTURALLY prohibited (enforced
// by EXISTENTIAL_SAFEGUARDS + tests). Pure & deterministic; composed
// from the live governance engines.

import { seed, wave } from '@/lib/telemetry';
import { digitalTwin } from '@/lib/gov/national-causality';
import { economyBoard } from '@/lib/gov/institutional-economy';
import { civicBoard } from '@/lib/gov/civic-legitimacy';
import { generationalBoard, ERA_COUNT } from '@/lib/gov/generational-intelligence';
import { territorialBoard } from '@/lib/gov/territorial-continuity';
import { knowledgeBoard } from '@/lib/gov/knowledge-continuity';
import { geopoliticalBoard } from '@/lib/gov/geopolitical-continuity';

// Hard constitutional existential boundary — structural, not advisory.
export const EXISTENTIAL_SAFEGUARDS = {
  scope: 'civilization-aggregate-only' as const,
  perCitizenData: false as const,
  rightsPreserving: true as const,
  humanitarian: true as const,
  prohibited: [
    'emergency-authoritarianism', 'survival-based-discrimination', 'coercive-biosurveillance',
    'population-value-scoring', 'genetic-prioritization', 'technocratic-survival-hierarchy',
    'suspension-of-constitutional-humanity',
  ] as const,
};

export interface PandemicResilience {
  propagationPressure: number;
  healthSystemSurvivability: number;
  emergencyMedicalResilience: number;
  socialContinuityUnderQuarantine: number;
  biologicalCrisisFatigue: number;
  recoveryPressure: number;
}

export interface CatastrophicRisk {
  infrastructureCollapseProb: number;
  blackoutRisk: number;
  communicationsContinuity: number;
  foodSystemSurvivability: number;
  waterSystemContinuity: number;
  energyCollapseExposure: number;
  cascadingFailure: number;
  civilizationStressAmplification: number;
}

export interface LongDurationGovernance {
  persistenceUnderCatastrophe: number;
  constitutionalEmergencyContinuity: number;
  distributedContinuity: number;
  regionalAutonomyResilience: number;
  institutionalRedundancy: number;
}

export interface RecoveryIntelligence {
  recoveryDurability: number;
  institutionalReformationCapacity: number;
  socialCohesionRestoration: number;
  legitimacyReconstruction: number;
  infrastructureRegeneration: number;
  educationalRecovery: number;
  ecologicalRecovery: number;
  recoveryTimelineEpochs: number;
  recurrenceRisk: number;
}

export type ExistentialMode =
  | 'stable-survivability' | 'rising-existential-pressure' | 'pandemic-strain'
  | 'catastrophic-risk-elevated' | 'cascading-fragility' | 'continuity-survival'
  | 'distributed-recovery' | 'adaptive-restoration' | 'restored-civilization-resilience';

export interface ExistentialBoard {
  epoch: number;
  pandemic: PandemicResilience;
  catastrophic: CatastrophicRisk;
  governance: LongDurationGovernance;
  recovery: RecoveryIntelligence;
  planetary: { environmentalPressure: number; biosphereContinuity: number; longHorizonInfraSurvivability: number; intergenerationalAdaptation: number };
  speciesMemory: { constitutionalArchive: number; scientificMemory: number; institutionalArchive: number; recoveryKnowledge: number };
  civilizationResilienceTrajectory: number[];
  mode: ExistentialMode;
  warnings: { kind: string; detail: string; severity: 'advisory' | 'elevated' | 'critical' }[];
  stabilization: { kind: string; detail: string; advisory: true }[];
  prohibited: readonly string[];
  memory: { collapseEras: number[]; survivalAdaptations: number; constitutionalRestorationCycles: number; longestSurvivableRun: number; restorationEffectivenessPct: number };
}

export function existentialBoard(now: number): ExistentialBoard {
  const epoch = Math.max(0, Math.floor(now / 4000));
  const twin = digitalTwin(now);
  const eco = economyBoard(now);
  const civ = civicBoard(now);
  const gen = generationalBoard(now);
  const terr = territorialBoard(now);
  const kno = knowledgeBoard(now);
  const geo = geopoliticalBoard(now);
  const dur0 = gen.durability[0]!;
  const w = (s: string, lo: number, hi: number) => Math.round(wave(`ex:${s}`, epoch / (8 + seed(`ex:c:${s}`) * 7), lo, hi));

  // Pandemic & biosurvival — institutional resilience under biological crisis.
  const pandemic: PandemicResilience = {
    propagationPressure: w('prop', 12, 78),
    healthSystemSurvivability: Math.max(0, Math.min(100, w('hss', 42, 90) - Math.round(eco.meanFatigue * 0.18))),
    emergencyMedicalResilience: Math.max(0, Math.min(100, w('emr', 40, 88))),
    socialContinuityUnderQuarantine: Math.max(0, Math.min(100, Math.round(civ.trustIndex * 0.7 + civ.fairnessContinuity * 0.3))),
    biologicalCrisisFatigue: Math.min(100, Math.round(eco.meanFatigue * 0.5 + w('bcf', 10, 60))),
    recoveryPressure: Math.min(100, w('rcp', 18, 70)),
  };

  // Catastrophic-risk continuity — cascading systemic disruption.
  const infraCollapseProb = Math.min(100, w('icp', 8, 60) + Math.round(terr.meanStrain * 0.2));
  const blackoutRisk = w('blk', 8, 64);
  const communicationsContinuity = Math.max(0, Math.min(100, w('com', 50, 92) - Math.round(blackoutRisk * 0.2)));
  const foodSystemSurvivability = Math.max(0, Math.min(100, w('food', 40, 90) - Math.round(terr.meanStrain * 0.2)));
  const waterSystemContinuity = Math.max(0, Math.min(100, Math.round(terr.regions.reduce((s, r) => s + r.waterAvailability, 0) / terr.regions.length)));
  const energyCollapseExposure = Math.min(100, Math.round(100 - geo.autonomy.energySecurity));
  const cascadingFailure = Math.min(100, Math.round(
    infraCollapseProb * 0.3 + blackoutRisk * 0.2 + (100 - foodSystemSurvivability) * 0.2
    + (100 - waterSystemContinuity) * 0.15 + energyCollapseExposure * 0.15,
  ));
  const civilizationStressAmplification = Math.min(100, Math.round(cascadingFailure * 0.6 + twin.fractureCount * 5));
  const catastrophic: CatastrophicRisk = {
    infrastructureCollapseProb: infraCollapseProb, blackoutRisk, communicationsContinuity,
    foodSystemSurvivability, waterSystemContinuity, energyCollapseExposure,
    cascadingFailure, civilizationStressAmplification,
  };

  // Long-duration governance resilience.
  const governance: LongDurationGovernance = {
    persistenceUnderCatastrophe: Math.max(0, Math.min(100, Math.round(dur0.separationResilience * 0.6 + civ.trustIndex * 0.4))),
    constitutionalEmergencyContinuity: Math.max(0, Math.min(100, Math.round(dur0.judicialIndependence * 0.5 + dur0.oversightStrength * 0.5))),
    distributedContinuity: Math.max(0, Math.min(100, w('dc', 50, 88))),
    regionalAutonomyResilience: Math.max(0, Math.min(100, Math.round(terr.meanSurvivability * 0.5 + civ.trustIndex * 0.5))),
    institutionalRedundancy: Math.max(0, Math.min(100, w('redu', 45, 86))),
  };

  // Post-collapse recovery intelligence.
  const recoveryDurability = Math.max(0, Math.min(100, Math.round(
    governance.persistenceUnderCatastrophe * 0.3 + kno.memory.knowledgeRestorationPct * 0.25
    + civ.memory.restorationEffectivenessPct * 0.25 + (100 - cascadingFailure) * 0.2,
  )));
  const recovery: RecoveryIntelligence = {
    recoveryDurability,
    institutionalReformationCapacity: Math.max(0, Math.min(100, Math.round(governance.constitutionalEmergencyContinuity * 0.7 + kno.meanResilience * 0.3))),
    socialCohesionRestoration: Math.max(0, Math.min(100, Math.round(civ.trustIndex * 0.6 + civ.fairnessContinuity * 0.4))),
    legitimacyReconstruction: civ.memory.restorationEffectivenessPct,
    infrastructureRegeneration: Math.max(0, Math.min(100, Math.round((100 - infraCollapseProb) * 0.6 + governance.institutionalRedundancy * 0.4))),
    educationalRecovery: kno.memory.knowledgeRestorationPct,
    ecologicalRecovery: terr.memory.recoveryEffectivenessPct,
    recoveryTimelineEpochs: Math.max(1, Math.min(20, Math.round(20 - recoveryDurability / 8))),
    recurrenceRisk: Math.min(100, Math.round(cascadingFailure * 0.5 + (100 - recoveryDurability) * 0.3)),
  };

  // Planetary & long-horizon resilience.
  const planetary = {
    environmentalPressure: terr.meanStrain,
    biosphereContinuity: Math.max(0, Math.min(100, Math.round(100 - terr.meanStrain * 0.5))),
    longHorizonInfraSurvivability: Math.max(0, Math.min(100, Math.round((100 - infraCollapseProb) * 0.5 + governance.institutionalRedundancy * 0.5))),
    intergenerationalAdaptation: Math.max(0, Math.min(100, Math.round(gen.memory.recoveryEffectivenessPct * 0.6 + kno.memory.knowledgeRestorationPct * 0.4))),
  };

  // Species memory — civilization preservation, aggregate.
  const speciesMemory = {
    constitutionalArchive: Math.max(0, Math.min(100, Math.round(dur0.oversightStrength * 0.4 + governance.institutionalRedundancy * 0.6))),
    scientificMemory: Math.max(0, Math.min(100, Math.round(kno.innovation.knowledgeProduction * 0.6 + kno.meanResilience * 0.4))),
    institutionalArchive: Math.max(0, Math.min(100, Math.round(governance.persistenceUnderCatastrophe * 0.5 + recovery.institutionalReformationCapacity * 0.5))),
    recoveryKnowledge: Math.max(0, Math.min(100, Math.round(recovery.recoveryDurability * 0.6 + gen.memory.recoveryEffectivenessPct * 0.4))),
  };

  const civilizationResilienceTrajectory = gen.durability.map((d, e) => Math.max(0, Math.min(100, Math.round(
    governance.persistenceUnderCatastrophe * 0.3 + recovery.recoveryDurability * 0.25
    + (100 - cascadingFailure) * 0.2 + speciesMemory.scientificMemory * 0.1
    + d.separationResilience * 0.1 - e * 1.5 + (seed(`ex:traj:${e}`) - 0.5) * 8,
  ))));
  const endR = civilizationResilienceTrajectory[ERA_COUNT - 1]!;
  const slope = endR - civilizationResilienceTrajectory[0]!;

  const mode: ExistentialMode =
    cascadingFailure >= 70 ? 'cascading-fragility'
      : pandemic.propagationPressure >= 65 && pandemic.healthSystemSurvivability < 55 ? 'pandemic-strain'
        : civilizationStressAmplification >= 60 ? 'catastrophic-risk-elevated'
          : governance.persistenceUnderCatastrophe < 50 ? 'continuity-survival'
            : slope <= -8 ? 'rising-existential-pressure'
              : slope >= 8 && endR >= 62 ? 'restored-civilization-resilience'
                : slope >= 5 ? 'adaptive-restoration'
                  : governance.distributedContinuity >= 65 && recovery.recoveryDurability >= 60 ? 'distributed-recovery' : 'stable-survivability';

  const warnings: ExistentialBoard['warnings'] = [];
  if (cascadingFailure >= 60) warnings.push({ kind: 'cascading-systemic-fragility', detail: `Cascading failure index ${cascadingFailure} · civilization stress ${civilizationStressAmplification}`, severity: cascadingFailure >= 75 ? 'critical' : 'elevated' });
  if (pandemic.propagationPressure >= 60 && pandemic.healthSystemSurvivability < 55) warnings.push({ kind: 'biological-crisis-strain', detail: `Propagation ${pandemic.propagationPressure} vs health survivability ${pandemic.healthSystemSurvivability}`, severity: 'elevated' });
  if (governance.persistenceUnderCatastrophe < 50) warnings.push({ kind: 'constitutional-continuity-risk', detail: `Persistence under catastrophe ${governance.persistenceUnderCatastrophe} — strengthen distributed continuity (lawful, rights-preserving)`, severity: 'elevated' });
  if (recovery.recoveryDurability < 45) warnings.push({ kind: 'recovery-fragility', detail: `Recovery durability ${recovery.recoveryDurability} · recurrence risk ${recovery.recurrenceRisk}`, severity: 'elevated' });

  // Lawful, rights-preserving stabilization — advisory only.
  const stabilization: { kind: string; detail: string; advisory: true }[] = [];
  if (cascadingFailure >= 50) stabilization.push({ kind: 'continuity-redundancy', detail: 'Strengthen institutional redundancy & distributed continuity (lawful, rights-preserving)', advisory: true });
  if (pandemic.propagationPressure >= 50) stabilization.push({ kind: 'biological-resilience', detail: 'Reinforce health-system survivability & emergency medical resilience — no biological discrimination', advisory: true });
  if (governance.constitutionalEmergencyContinuity < 65) stabilization.push({ kind: 'constitutional-emergency-governance', detail: 'Preserve constitutional oversight & judicial independence during emergency (no permanent exceptional authority)', advisory: true });
  if (recovery.recoveryDurability < 55) stabilization.push({ kind: 'recovery-preparedness', detail: 'Pre-position recovery pathways & civilization-memory archives for post-disruption restoration', advisory: true });
  if (planetary.biosphereContinuity < 55) stabilization.push({ kind: 'planetary-resilience', detail: 'Reinforce biosphere continuity & long-horizon infrastructure survivability', advisory: true });

  const collapseEras = civilizationResilienceTrajectory.map((v, e) => ({ v, e })).filter(x => x.v < 40).map(x => x.e);
  let longestSurvivableRun = 0, run = 0;
  for (const v of civilizationResilienceTrajectory) { if (v >= 55) { run++; longestSurvivableRun = Math.max(longestSurvivableRun, run); } else run = 0; }

  return {
    epoch, pandemic, catastrophic, governance, recovery, planetary, speciesMemory,
    civilizationResilienceTrajectory, mode, warnings, stabilization,
    prohibited: EXISTENTIAL_SAFEGUARDS.prohibited,
    memory: {
      collapseEras,
      survivalAdaptations: civilizationResilienceTrajectory.reduce((acc: number, v, i) => acc + (i > 0 && v - civilizationResilienceTrajectory[i - 1]! >= 6 ? 1 : 0), 0),
      constitutionalRestorationCycles: gen.memory.reformsEnacted,
      longestSurvivableRun,
      restorationEffectivenessPct: Math.max(15, Math.min(95, Math.round(recovery.recoveryDurability * 0.5 + speciesMemory.recoveryKnowledge * 0.5))),
    },
  };
}
