// lib/gov/knowledge-continuity.ts
//
// The sovereign Constitutional Knowledge & Cognitive Continuity engine.
// Civilizations survive through learning, memory transmission and
// expertise continuity — not only law and territory. This models
// educational resilience, constitutional literacy, institutional
// knowledge transfer, innovation continuity and institutional cognitive
// resilience at strict aggregate level. It NEVER profiles cognition,
// classifies ideology, scores conformity, targets speech or automates
// censorship (enforced by KNOWLEDGE_SAFEGUARDS + tests). Pure &
// deterministic; composed from the live governance engines.

import { seed, wave } from '@/lib/telemetry';
import { civicBoard } from '@/lib/gov/civic-legitimacy';
import { generationalBoard, ERA_COUNT } from '@/lib/gov/generational-intelligence';
import { civilizationalBoard } from '@/lib/gov/civilizational-identity';
import { economyBoard } from '@/lib/gov/institutional-economy';

// Hard constitutional cognitive boundary — structural, not advisory.
export const KNOWLEDGE_SAFEGUARDS = {
  scope: 'cognitive-aggregate-only' as const,
  perCitizenData: false as const,
  politicallyNeutral: true as const,
  pluralistic: true as const,
  prohibited: [
    'cognitive-profiling', 'ideological-classification', 'educational-conformity-scoring',
    'political-learning-manipulation', 'thought-control', 'opinion-engineering',
    'predictive-speech-targeting', 'censorship-automation',
  ] as const,
};

const REGIONS = ['Capital District', 'Northern', 'Eastern', 'Western', 'Coastal', 'Highland'];

export interface RegionKnowledge {
  region: string;
  literacyContinuity: number;
  civicEducationResilience: number;
  trainingDurability: number;
  specialistShortage: number;       // higher = worse
  learningInfraGap: number;         // higher = worse
  constitutionalLiteracy: number;
  educationalResilience: number;    // composite 0..100
  collapseZone: boolean;
}

export interface KnowledgeTransfer {
  region: string;
  retiringExpertise: number;
  successionReadiness: number;
  proceduralKnowledgeGap: number;
  institutionalMemoryFragility: number;
  amnesiaRisk: boolean;
}

export type CognitiveMode =
  | 'continuous-learning' | 'rising-knowledge-strain' | 'regional-learning-imbalance'
  | 'expertise-erosion' | 'institutional-amnesia' | 'innovation-stagnation'
  | 'learning-mobilization' | 'cognitive-recovery' | 'restored-knowledge-continuity';

export interface KnowledgeBoard {
  epoch: number;
  regions: RegionKnowledge[];
  meanResilience: number;
  collapseZones: number;
  constitutionalLiteracyIndex: number;
  regionalImbalance: number;
  transfer: KnowledgeTransfer[];
  innovation: { researchContinuity: number; scientificCapacity: number; innovationEcosystem: number; technicalEducationResilience: number; knowledgeProduction: number; stagnationRisk: number; expertiseMigration: number };
  cognitiveResilience: { institutionalTrustResilience: number; factualContinuity: number; publicInfoReliability: number; crisisInfoStability: number; civicConfusionIndex: number };
  continuityTrajectory: number[];
  mode: CognitiveMode;
  warnings: { kind: string; detail: string; severity: 'advisory' | 'elevated' | 'critical' }[];
  stabilization: { kind: string; detail: string; advisory: true }[];
  prohibited: readonly string[];
  memory: { expertiseLossEras: number[]; learningRecoveryCycles: number; innovationRenewalEras: number[]; knowledgeRestorationPct: number };
}

export function knowledgeBoard(now: number): KnowledgeBoard {
  const epoch = Math.max(0, Math.floor(now / 4000));
  const civ = civicBoard(now);
  const gen = generationalBoard(now);
  const cul = civilizationalBoard(now);
  const eco = economyBoard(now);
  const dur0 = gen.durability[0]!;

  const regions: RegionKnowledge[] = REGIONS.map(region => {
    const k = `kc:${region}`;
    const cadence = 8 + seed(`${k}:cad`) * 7;
    const m = (s: string, lo: number, hi: number) => Math.round(wave(`${k}:${s}`, epoch / cadence, lo, hi));
    const er = eco.regions.find(r => r.region === region);
    const cr = cul.regions.find(r => r.region === region);
    const strainPenalty = (er?.strainPct ?? 60) * 0.12 + gen.corruption.normalization[0]! * 0.08;

    const literacyContinuity = Math.max(0, Math.min(100, m('lit', 52, 94) - Math.round(strainPenalty * 0.4)));
    const civicEducationResilience = Math.max(0, Math.min(100, m('cer', 45, 90) - Math.round(strainPenalty * 0.5)));
    const trainingDurability = Math.max(0, Math.min(100, m('trn', 44, 88) - Math.round((er?.fatiguePct ?? 40) * 0.2)));
    const specialistShortage = Math.max(0, Math.min(100, m('shr', 8, 55) + Math.round((er?.fatiguePct ?? 40) * 0.2)));
    const learningInfraGap = Math.max(0, Math.min(100, m('gap', 6, 50) + Math.round((er?.strainPct ?? 60) * 0.1)));
    const constitutionalLiteracy = Math.max(0, Math.min(100, Math.round(
      literacyContinuity * 0.4 + (cr?.civicMemory ?? 60) * 0.3 + dur0.separationResilience * 0.3 - strainPenalty * 0.3,
    )));
    const educationalResilience = Math.round(
      literacyContinuity * 0.22 + civicEducationResilience * 0.2 + trainingDurability * 0.2
      + (100 - specialistShortage) * 0.18 + (100 - learningInfraGap) * 0.1 + constitutionalLiteracy * 0.1,
    );
    return {
      region, literacyContinuity, civicEducationResilience, trainingDurability,
      specialistShortage, learningInfraGap, constitutionalLiteracy, educationalResilience,
      collapseZone: educationalResilience < 45 || specialistShortage > 45,
    };
  }).sort((a, b) => a.educationalResilience - b.educationalResilience);

  const meanResilience = Math.round(regions.reduce((s, r) => s + r.educationalResilience, 0) / regions.length);
  const constitutionalLiteracyIndex = Math.round(regions.reduce((s, r) => s + r.constitutionalLiteracy, 0) / regions.length);
  const meanLit = constitutionalLiteracyIndex;
  const regionalImbalance = Math.round(Math.sqrt(regions.reduce((s, r) => s + (r.constitutionalLiteracy - meanLit) ** 2, 0) / regions.length));
  const collapseZones = regions.filter(r => r.collapseZone).length;

  const transfer: KnowledgeTransfer[] = REGIONS.map(region => {
    const k = `kc:tr:${region}`;
    const er = eco.regions.find(r => r.region === region);
    const retiringExpertise = Math.round(wave(`${k}:ret`, epoch / 10, 18, 62));
    const successionReadiness = Math.max(0, Math.min(100, Math.round(74 - (er?.fatiguePct ?? 40) * 0.35 + (seed(`${k}:s`) - 0.5) * 18)));
    const proceduralKnowledgeGap = Math.max(0, Math.min(100, Math.round(retiringExpertise * 0.6 + (100 - successionReadiness) * 0.4)));
    const institutionalMemoryFragility = Math.max(0, Math.min(100, Math.round(proceduralKnowledgeGap * 0.6 + gen.corruption.normalization[0]! * 0.2)));
    return { region, retiringExpertise, successionReadiness, proceduralKnowledgeGap, institutionalMemoryFragility, amnesiaRisk: proceduralKnowledgeGap > 60 && successionReadiness < 45 };
  }).sort((a, b) => b.institutionalMemoryFragility - a.institutionalMemoryFragility);

  const sc = (s: string, lo: number, hi: number) => Math.round(wave(`kc:innov:${s}`, epoch / 9, lo, hi));
  const researchContinuity = Math.max(0, Math.min(100, sc('rc', 40, 88) - Math.round(gen.driftRiskHorizon * 0.1)));
  const scientificCapacity = Math.max(0, Math.min(100, sc('sci', 38, 86)));
  const innovationEcosystem = Math.max(0, Math.min(100, Math.round((researchContinuity + scientificCapacity) / 2 - eco.meanFatigue * 0.15)));
  const technicalEducationResilience = Math.round(regions.reduce((s, r) => s + r.trainingDurability, 0) / regions.length);
  const knowledgeProduction = Math.max(0, Math.min(100, Math.round(innovationEcosystem * 0.6 + technicalEducationResilience * 0.4)));
  const innovation = {
    researchContinuity, scientificCapacity, innovationEcosystem, technicalEducationResilience, knowledgeProduction,
    stagnationRisk: Math.max(0, Math.min(100, Math.round(100 - knowledgeProduction * 0.7 - researchContinuity * 0.3))),
    expertiseMigration: Math.max(0, Math.min(100, Math.round((100 - innovationEcosystem) * 0.5 + eco.meanFatigue * 0.3))),
  };

  // Institutional cognitive resilience — institutional/factual ONLY.
  const cognitiveResilience = {
    institutionalTrustResilience: civ.trustIndex,
    factualContinuity: Math.max(0, Math.min(100, Math.round(60 + dur0.oversightStrength * 0.3 - gen.corruption.normalization[0]! * 0.2))),
    publicInfoReliability: Math.max(0, Math.min(100, Math.round(civ.fairnessContinuity * 0.5 + dur0.oversightStrength * 0.5))),
    crisisInfoStability: Math.max(0, Math.min(100, Math.round(70 - eco.meanFatigue * 0.3 + (seed(`kc:cis:${epoch}`) - 0.5) * 16))),
    civicConfusionIndex: Math.max(0, Math.min(100, Math.round((100 - civ.trustIndex) * 0.5 + gen.corruption.normalization[0]! * 0.3))),
  };

  const continuityTrajectory = gen.durability.map((d, e) => Math.max(0, Math.min(100, Math.round(
    meanResilience * 0.4 + constitutionalLiteracyIndex * 0.25 + innovation.knowledgeProduction * 0.15
    + d.separationResilience * 0.1 - e * 1.5 - gen.corruption.normalization[e]! * 0.1 + (seed(`kc:traj:${e}`) - 0.5) * 8,
  ))));
  const endC = continuityTrajectory[ERA_COUNT - 1]!;
  const slope = endC - continuityTrajectory[0]!;

  const mode: CognitiveMode =
    collapseZones >= 4 ? 'institutional-amnesia'
      : meanResilience < 45 ? 'expertise-erosion'
        : innovation.stagnationRisk >= 60 ? 'innovation-stagnation'
          : regionalImbalance >= 16 ? 'regional-learning-imbalance'
            : slope <= -8 ? 'rising-knowledge-strain'
              : slope >= 8 && endC >= 62 ? 'restored-knowledge-continuity'
                : slope >= 5 ? 'cognitive-recovery'
                  : collapseZones > 0 || transfer.some(t => t.amnesiaRisk) ? 'learning-mobilization' : 'continuous-learning';

  const warnings: KnowledgeBoard['warnings'] = [];
  for (const r of regions.filter(x => x.collapseZone)) {
    warnings.push({ kind: 'expertise-collapse-zone', detail: `${r.region}: educational resilience ${r.educationalResilience}, specialist shortage ${r.specialistShortage} — learning continuity risk`, severity: r.educationalResilience < 32 ? 'critical' : 'elevated' });
  }
  for (const t of transfer.filter(x => x.amnesiaRisk)) {
    warnings.push({ kind: 'institutional-amnesia', detail: `${t.region}: procedural-knowledge gap ${t.proceduralKnowledgeGap}, succession readiness ${t.successionReadiness} — institutional memory loss`, severity: 'elevated' });
  }
  if (innovation.stagnationRisk >= 55) warnings.push({ kind: 'innovation-stagnation', detail: `Stagnation risk ${innovation.stagnationRisk} · expertise migration ${innovation.expertiseMigration} — adaptive-capacity erosion`, severity: 'elevated' });
  if (cognitiveResilience.civicConfusionIndex >= 55) warnings.push({ kind: 'information-instability', detail: `Civic confusion ${cognitiveResilience.civicConfusionIndex} — strengthen factual continuity & institutional clarity (no speech targeting)`, severity: 'elevated' });

  // Lawful knowledge-continuity stabilization — advisory & pluralistic.
  const stabilization: { kind: string; detail: string; advisory: true }[] = [];
  if (collapseZones > 0) stabilization.push({ kind: 'educational-continuity', detail: 'Reinforce educational continuity & specialist pipelines in collapse-zone regions (pluralistic, politically neutral)', advisory: true });
  if (transfer.some(t => t.amnesiaRisk)) stabilization.push({ kind: 'expertise-transfer', detail: 'Accelerate succession readiness & procedural-knowledge capture before institutional amnesia', advisory: true });
  if (innovation.stagnationRisk >= 50) stabilization.push({ kind: 'research-continuity', detail: 'Stabilize research continuity & technical-education resilience', advisory: true });
  if (cognitiveResilience.publicInfoReliability < 60) stabilization.push({ kind: 'factual-continuity', detail: 'Strengthen transparent public-information reliability & crisis-information stability', advisory: true });
  if (regionalImbalance >= 12) stabilization.push({ kind: 'constitutional-literacy', detail: 'Rebalance constitutional-literacy access across regions — no conformity enforcement', advisory: true });

  const expertiseLossEras = continuityTrajectory.map((v, e) => ({ v, e })).filter(x => x.v < 45).map(x => x.e);

  return {
    epoch, regions, meanResilience, collapseZones, constitutionalLiteracyIndex, regionalImbalance,
    transfer, innovation, cognitiveResilience, continuityTrajectory, mode, warnings, stabilization,
    prohibited: KNOWLEDGE_SAFEGUARDS.prohibited,
    memory: {
      expertiseLossEras,
      learningRecoveryCycles: continuityTrajectory.reduce((acc: number, v, i) => acc + (i > 0 && v - continuityTrajectory[i - 1]! >= 6 ? 1 : 0), 0),
      innovationRenewalEras: continuityTrajectory.map((v, e) => ({ v, e })).filter((x, i, arr) => i > 0 && x.v - arr[i - 1]!.v >= 6).map(x => x.e),
      knowledgeRestorationPct: Math.max(15, Math.min(95, Math.round(meanResilience * 0.5 + innovation.knowledgeProduction * 0.3 + (100 - gen.driftRiskHorizon) * 0.2))),
    },
  };
}
