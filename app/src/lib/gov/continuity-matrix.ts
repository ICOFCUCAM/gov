// lib/gov/continuity-matrix.ts
//
// Single matrix collapsing the 'mode' string from every continuity engine
// (national/temporal/procedural/civic/generational/territorial/
// civilizational/cognitive/geopolitical/existential) into one row-per-layer
// view, plus the organism's master mode. Pure & deterministic.

import { digitalTwin } from '@/lib/gov/national-causality';
import { temporalBoard } from '@/lib/gov/temporal-intelligence';
import { proceduralBoard } from '@/lib/gov/procedural-execution';
import { civicBoard } from '@/lib/gov/civic-legitimacy';
import { generationalBoard } from '@/lib/gov/generational-intelligence';
import { territorialBoard } from '@/lib/gov/territorial-continuity';
import { civilizationalBoard } from '@/lib/gov/civilizational-identity';
import { knowledgeBoard } from '@/lib/gov/knowledge-continuity';
import { geopoliticalBoard } from '@/lib/gov/geopolitical-continuity';
import { existentialBoard } from '@/lib/gov/existential-continuity';
import { civilizationOrganism } from '@/lib/gov/civilization-organism';

export interface ModeRow { layer: string; mode: string }

export interface ContinuityMatrix {
  epoch: number;
  organismMode: string;
  layers: ModeRow[];
}

export function continuityMatrix(now: number): ContinuityMatrix {
  return {
    epoch: Math.max(0, Math.floor(now / 4000)),
    organismMode: civilizationOrganism(now).organismMode,
    layers: [
      { layer: 'National Digital Twin', mode: digitalTwin(now).continuity },
      { layer: 'Temporal Foresight', mode: temporalBoard(now).resilience },
      { layer: 'Procedural Execution', mode: proceduralBoard(now).continuity },
      { layer: 'Civic Legitimacy', mode: civicBoard(now).mode },
      { layer: 'Generational Durability', mode: generationalBoard(now).mode },
      { layer: 'Territorial Continuity', mode: territorialBoard(now).mode },
      { layer: 'Civilizational Identity', mode: civilizationalBoard(now).mode },
      { layer: 'Knowledge Continuity', mode: knowledgeBoard(now).mode },
      { layer: 'Strategic Continuity', mode: geopoliticalBoard(now).mode },
      { layer: 'Existential Resilience', mode: existentialBoard(now).mode },
    ],
  };
}
