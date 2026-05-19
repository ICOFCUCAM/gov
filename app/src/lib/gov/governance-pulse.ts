// lib/gov/governance-pulse.ts
//
// Compact sovereign-pulse summary derived from the civilization organism.
// One-line status suitable for shell headers, ticker strips and
// at-a-glance pulse indicators. Pure & deterministic.

import { civilizationOrganism } from '@/lib/gov/civilization-organism';

export interface GovernancePulse {
  epoch: number;
  health: number;
  mode: string;
  dominantLabel: string;
  dominantIndex: number;
  alerts: number;
  warns: number;
  // A short, stable status line for header/ticker rendering.
  line: string;
}

export function governancePulse(now: number): GovernancePulse {
  const o = civilizationOrganism(now);
  const line = `${o.organismMode.toUpperCase()} · health ${o.nationalSovereignHealth} · weak: ${o.dominantLayer.label} (${o.dominantLayer.index}) · alerts ${o.alerts}/${o.warns}`;
  return {
    epoch: o.epoch,
    health: o.nationalSovereignHealth,
    mode: o.organismMode,
    dominantLabel: o.dominantLayer.label,
    dominantIndex: o.dominantLayer.index,
    alerts: o.alerts,
    warns: o.warns,
    line,
  };
}
