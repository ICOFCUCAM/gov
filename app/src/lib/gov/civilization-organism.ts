// lib/gov/civilization-organism.ts
//
// The sovereign apex synthesis. Braids every continuity layer (13 engines)
// into a single constitutional-organism status — one composite reading of
// the nation's sovereign-civilization health, with a master organism mode
// and an aggregate safeguard count. Pure & deterministic.

import { digitalTwin } from '@/lib/gov/national-causality';
import { economyBoard } from '@/lib/gov/institutional-economy';
import { temporalBoard } from '@/lib/gov/temporal-intelligence';
import { proceduralBoard } from '@/lib/gov/procedural-execution';
import { civicBoard, ETHICAL_GUARDRAILS } from '@/lib/gov/civic-legitimacy';
import { generationalBoard } from '@/lib/gov/generational-intelligence';
import { territorialBoard, ECOLOGICAL_SAFEGUARDS } from '@/lib/gov/territorial-continuity';
import { civilizationalBoard, CIVIC_IDENTITY_SAFEGUARDS } from '@/lib/gov/civilizational-identity';
import { knowledgeBoard, KNOWLEDGE_SAFEGUARDS } from '@/lib/gov/knowledge-continuity';
import { geopoliticalBoard, GEOPOLITICAL_SAFEGUARDS } from '@/lib/gov/geopolitical-continuity';
import { existentialBoard, EXISTENTIAL_SAFEGUARDS } from '@/lib/gov/existential-continuity';

export type OrganismMode =
  | 'sovereign-stable' | 'rising-strain' | 'multi-layer-pressure'
  | 'continuity-fracture' | 'constitutional-strain' | 'restoration-cycle'
  | 'adaptive-equilibrium' | 'civilizational-recovery' | 'restored-sovereign-equilibrium' | 'existential-watch';

export interface LayerReading { key: string; label: string; index: number; tone: 'ok' | 'warn' | 'alert' }

export interface CivilizationOrganism {
  epoch: number;
  layers: LayerReading[];
  nationalSovereignHealth: number;       // 0..100 composite
  organismMode: OrganismMode;
  safeguardSetCount: number;             // 6 structural safeguard families
  totalProhibitedCount: number;
  alerts: number;
  warns: number;
}

const tone = (good: number, badThreshold = 45, warnThreshold = 62): 'ok' | 'warn' | 'alert' =>
  good >= warnThreshold ? 'ok' : good >= badThreshold ? 'warn' : 'alert';

export function civilizationOrganism(now: number): CivilizationOrganism {
  const twin = digitalTwin(now);
  const eco = economyBoard(now);
  const tmp = temporalBoard(now);
  const proc = proceduralBoard(now);
  const civ = civicBoard(now);
  const gen = generationalBoard(now);
  const terr = territorialBoard(now);
  const cul = civilizationalBoard(now);
  const kno = knowledgeBoard(now);
  const geo = geopoliticalBoard(now);
  const ext = existentialBoard(now);

  // Each layer reduces to a single 0..100 "goodness" reading (higher = better).
  const layers: LayerReading[] = [
    { key: 'national', label: 'National Twin', index: Math.max(0, 100 - twin.meanStrain / 1.6), tone: 'ok' },
    { key: 'runtime', label: 'Sovereign Runtime', index: Math.max(0, 100 - eco.meanUtil + 50), tone: 'ok' },
    { key: 'temporal', label: 'Temporal Foresight', index: 100 - tmp.continuity.degradationProbPct, tone: 'ok' },
    { key: 'procedural', label: 'Procedural Execution', index: 100 - Math.round((proc.byStatus.stalled + proc.byStatus['judicial-hold']) / Math.max(1, proc.total) * 100), tone: 'ok' },
    { key: 'civic', label: 'Civic Legitimacy', index: civ.trustIndex, tone: 'ok' },
    { key: 'generational', label: 'Generational Durability', index: gen.continuityHealth[gen.continuityHealth.length - 1]!, tone: 'ok' },
    { key: 'territorial', label: 'Territorial Continuity', index: terr.meanSurvivability, tone: 'ok' },
    { key: 'civilizational', label: 'Civilizational Identity', index: cul.meanResilience, tone: 'ok' },
    { key: 'cognitive', label: 'Knowledge Continuity', index: kno.meanResilience, tone: 'ok' },
    { key: 'geopolitical', label: 'Strategic Continuity', index: 100 - geo.autonomy.strategicFragility, tone: 'ok' },
    { key: 'existential', label: 'Existential Resilience', index: ext.civilizationResilienceTrajectory[0]!, tone: 'ok' },
  ].map(l => ({ ...l, index: Math.max(0, Math.min(100, Math.round(l.index))), tone: tone(l.index) }));

  const nationalSovereignHealth = Math.round(layers.reduce((s, l) => s + l.index, 0) / layers.length);
  const alerts = layers.filter(l => l.tone === 'alert').length;
  const warns = layers.filter(l => l.tone === 'warn').length;

  // Composite mode — apex synthesis across the federation of continuity engines.
  const organismMode: OrganismMode =
    ext.mode === 'cascading-fragility' || ext.mode === 'catastrophic-risk-elevated' ? 'existential-watch'
      : alerts >= 4 ? 'continuity-fracture'
        : alerts >= 2 ? 'multi-layer-pressure'
          : civ.mode === 'legitimacy-fracture' || gen.driftRiskHorizon >= 60 ? 'constitutional-strain'
            : nationalSovereignHealth >= 78 && alerts === 0 ? 'restored-sovereign-equilibrium'
              : nationalSovereignHealth >= 68 && warns <= 2 ? 'adaptive-equilibrium'
                : nationalSovereignHealth >= 60 ? 'sovereign-stable'
                  : ext.memory.survivalAdaptations > 0 ? 'civilizational-recovery'
                    : gen.memory.reformsEnacted > 0 ? 'restoration-cycle' : 'rising-strain';

  const safeguardSets = [ETHICAL_GUARDRAILS, ECOLOGICAL_SAFEGUARDS, CIVIC_IDENTITY_SAFEGUARDS,
    KNOWLEDGE_SAFEGUARDS, GEOPOLITICAL_SAFEGUARDS, EXISTENTIAL_SAFEGUARDS];
  const totalProhibitedCount = safeguardSets.reduce((s, g) => s + g.prohibited.length, 0);

  return {
    epoch: Math.max(0, Math.floor(now / 4000)),
    layers,
    nationalSovereignHealth,
    organismMode,
    safeguardSetCount: safeguardSets.length,
    totalProhibitedCount,
    alerts, warns,
  };
}
