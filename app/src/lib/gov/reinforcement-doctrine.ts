// lib/gov/reinforcement-doctrine.ts
//
// Formal sovereign reinforcement doctrine per organism mode. Returns a
// one-line constitutional response strategy — advisory only, never an
// instruction to centralize control.

import type { OrganismMode } from '@/lib/gov/civilization-organism';

export const REINFORCEMENT_DOCTRINE: Record<OrganismMode, string> = {
  'sovereign-stable': 'Maintain civic transparency and audit cadence; observe upstream pressure.',
  'rising-strain': 'Reinforce the weakest continuity layer first; surface advisory orchestration.',
  'multi-layer-pressure': 'Activate distributed reserves; prioritize fairness and procedural integrity.',
  'continuity-fracture': 'Convene independent oversight; preserve constitutional separation under strain.',
  'constitutional-strain': 'Reinforce oversight & judicial independence; expose drift indicators publicly.',
  'restoration-cycle': 'Sustain reform momentum; capture institutional memory of what worked.',
  'adaptive-equilibrium': 'Hold current posture; deepen pluralistic resilience without expansion of authority.',
  'civilizational-recovery': 'Stabilize regional cohesion and heritage continuity; rebuild legitimacy lawfully.',
  'restored-sovereign-equilibrium': 'Maintain humility — restoration is fragile; keep all safeguards visible.',
  'existential-watch': 'Preserve constitutional humanity through the catastrophe; emergency powers stay bounded and reviewable.',
};

export function reinforcementDoctrineFor(mode: OrganismMode): string {
  return REINFORCEMENT_DOCTRINE[mode];
}
