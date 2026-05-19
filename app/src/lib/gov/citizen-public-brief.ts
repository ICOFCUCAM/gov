// lib/gov/citizen-public-brief.ts
//
// Strict citizen-safe public brief — a one-screen summary of the
// constitutional civilization's operational state that contains NO
// per-citizen identifiers, ideological labels or surveillance signals.
// Aggregate institutional readings only.

import { civilizationOrganism } from '@/lib/gov/civilization-organism';
import { civicBoard } from '@/lib/gov/civic-legitimacy';
import { proceduralBoard } from '@/lib/gov/procedural-execution';
import { SAFEGUARD_REGISTRY } from '@/lib/gov/sovereign-safeguards';

export interface CitizenPublicBrief {
  epoch: number;
  nationalHealth: number;
  organismMode: string;
  trustIndex: number;            // aggregate institutional trust
  unresolvedAppeals: number;
  safeguardFamilies: number;
  totalProhibitions: number;
  briefLine: string;             // a single, short, citizen-readable status line
}

export function citizenPublicBrief(now: number): CitizenPublicBrief {
  const o = civilizationOrganism(now);
  const c = civicBoard(now);
  const p = proceduralBoard(now);
  const total = SAFEGUARD_REGISTRY.reduce((s, x) => s + x.prohibited.length, 0);
  const briefLine = `Sovereign health ${o.nationalSovereignHealth} · trust ${c.trustIndex} · ${p.unresolvedAppeals} appeal(s) under review · ${SAFEGUARD_REGISTRY.length} constitutional safeguard families active`;
  return {
    epoch: o.epoch,
    nationalHealth: o.nationalSovereignHealth,
    organismMode: o.organismMode,
    trustIndex: c.trustIndex,
    unresolvedAppeals: p.unresolvedAppeals,
    safeguardFamilies: SAFEGUARD_REGISTRY.length,
    totalProhibitions: total,
    briefLine,
  };
}
