// lib/gov/civic-legitimacy.ts
//
// The sovereign Civic Stability & Democratic Legitimacy engine. Preserves
// constitutional order through legitimacy, trust, fairness and
// accountability — NOT coercion. Strictly institutional/regional
// AGGREGATE observability: no per-citizen data, no ideology, no political
// scoring, no behavioural targeting (enforced by ETHICAL_GUARDRAILS and
// tested). Pure & deterministic; composed from the live governance
// engines so it stays one connected sovereign runtime.

import { seed } from '@/lib/telemetry';
import { economyBoard } from '@/lib/gov/institutional-economy';
import { controlBoard } from '@/lib/gov/sovereign-observability';
import { proceduralBoard } from '@/lib/gov/procedural-execution';
import { generationalBoard, ERA_COUNT } from '@/lib/gov/generational-intelligence';

// Hard ethical boundary — the runtime may observe institutional civic
// stability ONLY. These prohibitions are structural, not advisory.
export const ETHICAL_GUARDRAILS = {
  scope: 'institutional-aggregate-only' as const,
  perCitizenData: false as const,
  politicallyNeutral: true as const,
  prohibited: [
    'citizen-loyalty-scoring', 'ideological-classification', 'predictive-political-targeting',
    'dissent-suppression', 'behavioural-coercion', 'opinion-manipulation', 'election-influence',
  ] as const,
};

export interface RegionLegitimacy {
  region: string;
  trust: number;            // 0..100 institutional trust (aggregate)
  fairness: number;         // 0..100 perceived procedural fairness
  fatigue: number;          // 0..100 civic fatigue / alienation
  cohesion: number;         // 0..100 institutional cohesion
  fractureZone: boolean;
}

export interface RightsPerception {
  rightsProtected: number;
  appealsMeaningful: number;
  oversightReal: number;
  corruptionPunished: number;
  lawAppliesEqually: number;
  accountabilityIntact: number;
}

export type CivicMode =
  | 'legitimate-stable' | 'trust-eroding' | 'procedural-distrust' | 'civic-fatigue'
  | 'legitimacy-fracture' | 'cohesion-divergence' | 'democratic-recovery' | 'restored-legitimacy';

export interface CivicBoard {
  epoch: number;
  trustIndex: number;          // national institutional trust 0..100
  fairnessContinuity: number;  // 0..100
  civicFatigue: number;        // 0..100 (higher = worse)
  rights: RightsPerception;
  regions: RegionLegitimacy[];
  regionalImbalance: number;   // trust dispersion (higher = unequal)
  legitimacyTrajectory: number[];  // per generational era
  mode: CivicMode;
  warnings: { kind: string; detail: string; severity: 'advisory' | 'elevated' | 'critical' }[];
  stabilization: { kind: string; detail: string; advisory: true }[];
  prohibitedActionsBlocked: readonly string[];
  memory: { trustCollapseEras: number[]; recoveryCycles: number; oversightFailures: number; restorationEffectivenessPct: number };
}

const REGIONS = ['Capital District', 'Northern', 'Eastern', 'Western', 'Coastal', 'Highland'];

export function civicBoard(now: number): CivicBoard {
  const epoch = Math.max(0, Math.floor(now / 4000));
  const eco = economyBoard(now);
  const cb = controlBoard(now);
  const pb = proceduralBoard(now);
  const gen = generationalBoard(now);
  const dur0 = gen.durability[0]!;

  // Procedural fairness: degraded by selective acceleration (suspicious
  // obstruction), unresolved/overdue appeals and constitutional breaches.
  const breachFrac = cb.total ? cb.breached / cb.total : 0;
  const appealIntegrity = pb.appealed ? 1 - pb.overdueAppeals / Math.max(1, pb.appealed) : 1;
  const fairnessContinuity = Math.max(0, Math.min(100, Math.round(
    100 - eco.suspiciousCount * 6 - breachFrac * 60 - (1 - appealIntegrity) * 40,
  )));

  // Civic fatigue: unresolved grievances + repeated administrative failure
  // + generational corruption normalization (aggregate).
  const grievancePressure = cb.unresolvedEscalations + pb.unresolvedAppeals;
  const civicFatigue = Math.max(0, Math.min(100, Math.round(
    18 + grievancePressure * 1.4 + eco.meanFatigue * 0.3 + gen.corruption.normalization[0]! * 0.25,
  )));

  // Region legitimacy (aggregate only — region, never citizen).
  const regions: RegionLegitimacy[] = (eco.regions.length ? eco.regions.map(r => r.region) : REGIONS).map((region, i) => {
    const er = eco.regions.find(x => x.region === region);
    const resil = er?.resilienceScore ?? 60;
    const susp = er?.suspicious ?? 0;
    const trust = Math.max(0, Math.min(100, Math.round(
      resil * 0.6 + fairnessContinuity * 0.3 - susp * 4 - civicFatigue * 0.15
      + (seed(`cv:rt:${region}:${epoch}`) - 0.5) * 8,
    )));
    const fairness = Math.max(0, Math.min(100, Math.round(fairnessContinuity - susp * 5 + (seed(`cv:rf:${region}`) - 0.5) * 10)));
    const fatigue = Math.max(0, Math.min(100, Math.round(civicFatigue + (er?.strainPct ?? 60) * 0.1 + (seed(`cv:fa:${region}`) - 0.5) * 8)));
    const cohesion = Math.max(0, Math.min(100, Math.round(trust * 0.5 + (100 - fatigue) * 0.5)));
    return { region, trust, fairness, fatigue, cohesion, fractureZone: trust < 42 || fatigue > 72 };
  });
  const trustIndex = Math.round(regions.reduce((s, r) => s + r.trust, 0) / regions.length);
  const meanTrust = trustIndex;
  const regionalImbalance = Math.round(
    Math.sqrt(regions.reduce((s, r) => s + (r.trust - meanTrust) ** 2, 0) / regions.length),
  );

  // Rights perception (institutional confidence dimensions, aggregate).
  const rights: RightsPerception = {
    rightsProtected: Math.max(0, Math.min(100, Math.round(dur0.separationResilience * 0.7 + fairnessContinuity * 0.3))),
    appealsMeaningful: Math.max(0, Math.min(100, Math.round(appealIntegrity * 100 * 0.8 + (100 - civicFatigue) * 0.2))),
    oversightReal: dur0.oversightStrength,
    corruptionPunished: Math.max(0, Math.min(100, Math.round(100 - eco.suspiciousCount * 10 - cb.corruptionHotspots * 3))),
    lawAppliesEqually: Math.max(0, Math.min(100, 100 - regionalImbalance * 2)),
    accountabilityIntact: Math.max(0, Math.min(100, Math.round((dur0.oversightStrength + dur0.judicialIndependence) / 2))),
  };

  // National legitimacy trajectory across generational eras.
  const legitimacyTrajectory = gen.durability.map((d, e) => Math.max(0, Math.min(100, Math.round(
    (d.oversightStrength + d.judicialIndependence + d.separationResilience) / 3 * 0.6
    + meanTrust * 0.25 - d.authoritarianDriftRisk * 0.2 - gen.corruption.normalization[e]! * 0.15,
  ))));
  const endLeg = legitimacyTrajectory[ERA_COUNT - 1]!;
  const slope = endLeg - legitimacyTrajectory[0]!;

  const mode: CivicMode =
    regions.filter(r => r.fractureZone).length >= 3 ? 'legitimacy-fracture'
      : regionalImbalance >= 16 ? 'cohesion-divergence'
        : civicFatigue >= 60 ? 'civic-fatigue'
          : fairnessContinuity < 55 ? 'procedural-distrust'
            : slope <= -8 ? 'trust-eroding'
              : slope >= 8 && endLeg >= 65 ? 'restored-legitimacy'
                : slope >= 5 ? 'democratic-recovery' : 'legitimate-stable';

  const warnings: CivicBoard['warnings'] = [];
  for (const r of regions.filter(x => x.fractureZone)) {
    warnings.push({ kind: 'legitimacy-fracture-zone', detail: `${r.region}: trust ${r.trust}, fatigue ${r.fatigue} — governance alienation risk`, severity: r.trust < 32 ? 'critical' : 'elevated' });
  }
  if (fairnessContinuity < 55) warnings.push({ kind: 'procedural-distrust', detail: `Fairness continuity ${fairnessContinuity} — selective acceleration / appeal-integrity erosion`, severity: fairnessContinuity < 40 ? 'critical' : 'elevated' });
  if (rights.corruptionPunished < 50) warnings.push({ kind: 'accountability-skepticism', detail: 'Perceived impunity — corruption exposure without consequence erodes constitutional confidence', severity: 'elevated' });
  if (gen.driftRiskHorizon >= 55) warnings.push({ kind: 'democratic-erosion', detail: `Long-horizon authoritarian-drift risk ${gen.driftRiskHorizon} undermines legitimacy`, severity: 'elevated' });

  // Civic stabilization — LAWFUL & advisory only. Opinion manipulation,
  // dissent suppression and election influence are structurally blocked.
  const stabilization: { kind: string; detail: string; advisory: true }[] = [];
  if (fairnessContinuity < 65) stabilization.push({ kind: 'fairness-restoration', detail: 'Prioritise equal processing & reduce selective acceleration; publish fairness metrics', advisory: true });
  if (pb.unresolvedAppeals > 0) stabilization.push({ kind: 'appeals-reinforcement', detail: `Reinforce appeals capacity — ${pb.unresolvedAppeals} unresolved (no silent dismissal)`, advisory: true });
  if (rights.oversightReal < 65) stabilization.push({ kind: 'oversight-visibility', detail: 'Increase independent-oversight visibility & published audit mirroring', advisory: true });
  if (civicFatigue >= 55) stabilization.push({ kind: 'transparency-improvement', detail: 'Reduce procedural opacity & improve citizen status communication', advisory: true });

  const trustCollapseEras = legitimacyTrajectory.map((v, e) => ({ v, e })).filter(x => x.v < 45).map(x => x.e);

  return {
    epoch,
    trustIndex,
    fairnessContinuity,
    civicFatigue,
    rights,
    regions,
    regionalImbalance,
    legitimacyTrajectory,
    mode,
    warnings,
    stabilization,
    prohibitedActionsBlocked: ETHICAL_GUARDRAILS.prohibited,
    memory: {
      trustCollapseEras,
      recoveryCycles: legitimacyTrajectory.reduce((acc: number, v, i) => acc + (i > 0 && v - legitimacyTrajectory[i - 1]! >= 6 ? 1 : 0), 0),
      oversightFailures: gen.durability.filter(d => d.oversightStrength < 45).length,
      restorationEffectivenessPct: Math.max(15, Math.min(95, Math.round(gen.corruption.recoveryLikelihoodPct * 0.6 + (100 - gen.driftRiskHorizon) * 0.4))),
    },
  };
}
