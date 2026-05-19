// lib/gov/interior-os-status.ts
//
// Richer Interior OS status — combines governance pulse, short-horizon
// trend, citizen brief and safeguard coverage counts into one object the
// apex shells can read in one call. Pure & deterministic.

import { governancePulse, type GovernancePulse } from '@/lib/gov/governance-pulse';
import { organismTrend, type OrganismTrend } from '@/lib/gov/organism-trend';
import { citizenPublicBrief, type CitizenPublicBrief } from '@/lib/gov/citizen-public-brief';
import { SAFEGUARD_REGISTRY } from '@/lib/gov/sovereign-safeguards';
import { ENGINE_REGISTRY } from '@/lib/gov/engine-registry';

export interface InteriorOSStatus {
  pulse: GovernancePulse;
  trend: OrganismTrend;
  brief: CitizenPublicBrief;
  totalEngines: number;
  totalSafeguardFamilies: number;
  totalPriorityLayers: number;
}

export function interiorOSStatus(now: number): InteriorOSStatus {
  return {
    pulse: governancePulse(now),
    trend: organismTrend(now),
    brief: citizenPublicBrief(now),
    totalEngines: ENGINE_REGISTRY.length,
    totalSafeguardFamilies: SAFEGUARD_REGISTRY.length,
    totalPriorityLayers: 3,
  };
}
