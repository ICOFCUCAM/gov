// lib/gov/generational-intelligence.ts
//
// The sovereign Generational / Civilizational Continuity engine. Reasons
// across years, decades and generations: institutional aging, demographic
// evolution, long-horizon corruption mutation, constitutional durability
// (authoritarian-drift risk) and civilization continuity health. Pure &
// deterministic; seeded from the live national digital twin so the
// long-horizon projection stays one connected sovereign runtime.

import { seed } from '@/lib/telemetry';
import { digitalTwin, SHELLS, type ShellKey } from '@/lib/gov/national-causality';
import { economyBoard } from '@/lib/gov/institutional-economy';
import { temporalBoard } from '@/lib/gov/temporal-intelligence';

export const ERA_COUNT = 8;        // generational steps (~a decade each)

export interface ShellAging {
  key: ShellKey;
  label: string;
  ageYears: number;
  brittleness: number;     // 0..100 — rigidity / fragility
  sclerosis: number;       // 0..100 — procedural accumulation
  adaptability: number;    // 0..100 — capacity to reform
  state: 'adaptive' | 'maturing' | 'rigid' | 'sclerotic';
}

export interface ConstitutionalDurability {
  era: number;
  emergencyNormalization: number;   // 0..100 (higher = worse)
  oversightStrength: number;        // 0..100 (higher = better)
  judicialIndependence: number;     // 0..100 (higher = better)
  separationResilience: number;     // 0..100 (higher = better)
  concentrationDrift: number;       // 0..100 (higher = worse)
  authoritarianDriftRisk: number;   // 0..100 (higher = worse)
}

export interface DemographicCurrent {
  key: string;
  label: string;
  trajectory: number[];      // per era, index 0 = now
  linkedStrain: string;
}

export type CivilizationMode =
  | 'resilient-continuity' | 'adaptive-governance' | 'institutional-aging'
  | 'regional-divergence' | 'constitutional-fatigue' | 'corruption-normalization'
  | 'continuity-degradation' | 'democratic-recovery' | 'restored-constitutional-resilience';

export interface GenerationalBoard {
  epoch: number;
  continuityHealth: number[];          // per era 0..100
  durability: ConstitutionalDurability[];
  aging: ShellAging[];
  demographics: DemographicCurrent[];
  corruption: { normalization: number[]; mutation: number; recoveryLikelihoodPct: number; entrenched: string[] };
  mode: CivilizationMode;
  driftRiskNow: number;
  driftRiskHorizon: number;
  memory: { crisisEras: number[]; reformsEnacted: number; corruptionEpochs: number; recoveryEffectivenessPct: number; longestStableRun: number };
  stabilization: { kind: string; detail: string; advisory: true }[];
}

export function generationalBoard(now: number): GenerationalBoard {
  const epoch = Math.max(0, Math.floor(now / 4000));
  const twin = digitalTwin(now);
  const eco = economyBoard(now);
  const tmp = temporalBoard(now);

  const seed0 = twin.meanStrain;            // civilization stress anchor
  const corrSeed = eco.suspiciousCount;
  const baseDrift = Math.min(60, 12 + twin.fractureCount * 6 + corrSeed * 4);

  // ── Constitutional durability across eras ───────────────────────────
  const durability: ConstitutionalDurability[] = [];
  let emergencyNorm = Math.min(70, 14 + (twin.continuity === 'constitutional-pressure' ? 26 : 0) + corrSeed * 4);
  let oversight = 82 - corrSeed * 3;
  let judicial = 80 - twin.fractureCount * 2;
  let concentration = baseDrift;
  for (let e = 0; e < ERA_COUNT; e++) {
    const reform = seed(`gi:reform:${epoch}:${e}`) > 0.66 ? 12 + Math.floor(seed(`gi:rf2:${e}`) * 10) : 0;
    const stress = seed0 * (0.6 + seed(`gi:str:${e}`) * 0.5);
    emergencyNorm = Math.max(0, Math.min(100, emergencyNorm + stress * 0.05 + 4 - reform));
    oversight = Math.max(0, Math.min(100, oversight - stress * 0.04 - 2 + reform));
    judicial = Math.max(0, Math.min(100, judicial - stress * 0.035 - 1.5 + reform * 0.8));
    concentration = Math.max(0, Math.min(100, concentration + emergencyNorm * 0.06 + (100 - oversight) * 0.05 - reform));
    const separationResilience = Math.max(0, Math.min(100, Math.round((oversight + judicial) / 2 - concentration * 0.4)));
    const authoritarianDriftRisk = Math.max(0, Math.min(100, Math.round(
      concentration * 0.4 + emergencyNorm * 0.35 + (100 - oversight) * 0.25,
    )));
    durability.push({
      era: e,
      emergencyNormalization: Math.round(emergencyNorm),
      oversightStrength: Math.round(oversight),
      judicialIndependence: Math.round(judicial),
      separationResilience,
      concentrationDrift: Math.round(concentration),
      authoritarianDriftRisk,
    });
  }

  // ── Institutional aging ─────────────────────────────────────────────
  const aging: ShellAging[] = SHELLS.map(s => {
    const strain = twin.shells.find(x => x.key === s.key)?.effectiveStrain ?? 70;
    const ageYears = 18 + Math.floor(seed(`gi:age:${s.key}`) * 60);
    const brittleness = Math.max(0, Math.min(100, Math.round(20 + Math.max(0, strain - 80) * 0.7 + ageYears * 0.35)));
    const sclerosis = Math.max(0, Math.min(100, Math.round(15 + ageYears * 0.5 + (eco.meanFatigue) * 0.25)));
    const adaptability = Math.max(0, Math.min(100, Math.round(100 - brittleness * 0.6 - sclerosis * 0.4)));
    const state: ShellAging['state'] =
      adaptability >= 60 ? 'adaptive' : adaptability >= 42 ? 'maturing' : adaptability >= 25 ? 'rigid' : 'sclerotic';
    return { key: s.key, label: s.label, ageYears, brittleness, sclerosis, adaptability, state };
  }).sort((a, b) => a.adaptability - b.adaptability);
  const meanBrittle = Math.round(aging.reduce((s, a) => s + a.brittleness, 0) / aging.length);

  // ── Demographic evolution ───────────────────────────────────────────
  const demoDef: { key: string; label: string; from: number; drift: number; linkedStrain: string }[] = [
    { key: 'urban-migration', label: 'Urban migration', from: 48, drift: 4.5, linkedStrain: 'municipal & permit congestion' },
    { key: 'aging-population', label: 'Aging population', from: 22, drift: 3.0, linkedStrain: 'citizen-service & health load' },
    { key: 'youth-pressure', label: 'Youth pressure', from: 38, drift: -1.8, linkedStrain: 'policing & education demand' },
    { key: 'regional-depopulation', label: 'Regional depopulation', from: 16, drift: 2.4, linkedStrain: 'regional instability & divergence' },
    { key: 'identity-growth', label: 'Identity-system growth', from: 55, drift: 3.6, linkedStrain: 'registry & national-ID strain' },
    { key: 'municipal-expansion', label: 'Municipal expansion', from: 41, drift: 2.8, linkedStrain: 'municipal & infrastructure stress' },
  ];
  const demographics: DemographicCurrent[] = demoDef.map(d => ({
    key: d.key, label: d.label, linkedStrain: d.linkedStrain,
    trajectory: Array.from({ length: ERA_COUNT }, (_, e) =>
      Math.max(0, Math.min(100, Math.round(d.from + d.drift * e + (seed(`gi:demo:${d.key}:${e}`) - 0.5) * 8)))),
  }));

  // ── Long-horizon corruption evolution ───────────────────────────────
  const normalization: number[] = [];
  let norm = Math.min(80, 20 + corrSeed * 8);
  for (let e = 0; e < ERA_COUNT; e++) {
    const reform = seed(`gi:creform:${epoch}:${e}`) > 0.7 ? 14 : 0;
    norm = Math.max(0, Math.min(100, norm + 3 + corrSeed * 1.2 - reform - (durability[e]!.oversightStrength - 60) * 0.08));
    normalization.push(Math.round(norm));
  }
  const mutation = Math.round(40 + seed(`gi:mut:${epoch}`) * 50);
  const recoveryLikelihoodPct = Math.max(10, Math.min(95, Math.round(
    100 - normalization[ERA_COUNT - 1]! * 0.6 - mutation * 0.2 + tmp.memory.recoveryEffectivenessPct * 0.2,
  )));
  const entrenched = aging.filter(a => a.state === 'sclerotic').slice(0, 3).map(a => a.label);

  // ── Civilization continuity health ──────────────────────────────────
  const continuityHealth: number[] = durability.map((d, e) => Math.max(0, Math.min(100, Math.round(
    100 - meanBrittle * 0.25 - normalization[e]! * 0.25 - d.authoritarianDriftRisk * 0.3 - (e * 1.4)
    + (recoveryLikelihoodPct - 50) * 0.18,
  ))));

  const driftRiskNow = durability[0]!.authoritarianDriftRisk;
  const driftRiskHorizon = durability[ERA_COUNT - 1]!.authoritarianDriftRisk;
  const slope = continuityHealth[ERA_COUNT - 1]! - continuityHealth[0]!;
  const endHealth = continuityHealth[ERA_COUNT - 1]!;

  const mode: CivilizationMode =
    driftRiskHorizon >= 65 ? 'continuity-degradation'
      : driftRiskHorizon >= 50 ? 'constitutional-fatigue'
        : normalization[ERA_COUNT - 1]! >= 65 ? 'corruption-normalization'
          : aging.filter(a => a.state === 'sclerotic' || a.state === 'rigid').length >= 6 ? 'institutional-aging'
            : eco.regions.filter(r => r.resilienceScore < 40).length >= 3 ? 'regional-divergence'
              : slope >= 10 && endHealth >= 70 ? 'restored-constitutional-resilience'
                : slope >= 6 ? 'democratic-recovery'
                  : endHealth >= 72 ? 'resilient-continuity' : 'adaptive-governance';

  const crisisEras = continuityHealth.map((h, e) => ({ h, e })).filter(x => x.h < 45).map(x => x.e);
  let longestStableRun = 0, run = 0;
  for (const h of continuityHealth) { if (h >= 60) { run++; longestStableRun = Math.max(longestStableRun, run); } else run = 0; }

  const stabilization: { kind: string; detail: string; advisory: true }[] = [];
  if (driftRiskHorizon >= 50) stabilization.push({ kind: 'restore-separation', detail: `Authoritarian-drift risk reaches ${driftRiskHorizon} by horizon — reinforce oversight & judicial independence`, advisory: true });
  if (normalization[ERA_COUNT - 1]! >= 60) stabilization.push({ kind: 'corruption-deentrenchment', detail: `Corruption normalization ${normalization[ERA_COUNT - 1]} — sustained anti-corruption reform across generations`, advisory: true });
  if (aging.filter(a => a.state === 'sclerotic').length > 0) stabilization.push({ kind: 'institutional-renewal', detail: `Renew ${entrenched.join(', ')} — sclerotic institutions require structural reform`, advisory: true });
  if (crisisEras.length > 0) stabilization.push({ kind: 'continuity-reinforcement', detail: `Pre-position generational continuity reserves for ${crisisEras.length} forecast crisis era(s)`, advisory: true });

  return {
    epoch,
    continuityHealth,
    durability,
    aging,
    demographics,
    corruption: { normalization, mutation, recoveryLikelihoodPct, entrenched },
    mode,
    driftRiskNow,
    driftRiskHorizon,
    memory: {
      crisisEras,
      reformsEnacted: Array.from({ length: ERA_COUNT }, (_, e) => seed(`gi:reform:${epoch}:${e}`) > 0.66 ? 1 : 0).reduce((s: number, n) => s + n, 0),
      corruptionEpochs: normalization.filter(n => n >= 70).length,
      recoveryEffectivenessPct: recoveryLikelihoodPct,
      longestStableRun,
    },
    stabilization,
  };
}
