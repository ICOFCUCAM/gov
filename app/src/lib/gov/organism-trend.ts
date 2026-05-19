// lib/gov/organism-trend.ts
//
// Short look-back / look-ahead trend over the civilization organism.
// Deterministic snapshots across recent operational epochs so the apex
// surface can render a trajectory without simulating live history.

import { civilizationOrganism } from '@/lib/gov/civilization-organism';

export interface OrganismTrend {
  epochs: number[];                // recent epochs (oldest → now)
  health: number[];                // national sovereign health per epoch
  slope: number;                   // health(now) - health(oldest)
  direction: 'improving' | 'steady' | 'degrading';
}

const LOOKBACK = 6;

export function organismTrend(now: number, lookback = LOOKBACK): OrganismTrend {
  const nowEpoch = Math.max(0, Math.floor(now / 4000));
  const start = Math.max(0, nowEpoch - lookback);
  const epochs: number[] = [];
  const health: number[] = [];
  for (let e = start; e <= nowEpoch; e++) {
    epochs.push(e);
    health.push(civilizationOrganism(e * 4000).nationalSovereignHealth);
  }
  const slope = health.length > 1 ? health[health.length - 1]! - health[0]! : 0;
  const direction: OrganismTrend['direction'] =
    slope >= 5 ? 'improving' : slope <= -5 ? 'degrading' : 'steady';
  return { epochs, health, slope, direction };
}
