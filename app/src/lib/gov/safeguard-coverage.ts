// lib/gov/safeguard-coverage.ts
//
// Bidirectional mapping between continuity engines and the safeguard
// family each one is governed by. Computed from the engine registry +
// safeguard registry — a single authority for "which family protects
// what".

import { ENGINE_REGISTRY } from '@/lib/gov/engine-registry';
import { SAFEGUARD_REGISTRY } from '@/lib/gov/sovereign-safeguards';

export interface CoverageRow { engine: string; engineLabel: string; family: string | null; familyLabel: string | null }

export function safeguardCoverage(): CoverageRow[] {
  return ENGINE_REGISTRY.map(e => {
    const fam = e.safeguardFamily ? SAFEGUARD_REGISTRY.find(s => s.key === e.safeguardFamily) ?? null : null;
    return {
      engine: e.key,
      engineLabel: e.label,
      family: e.safeguardFamily,
      familyLabel: fam?.label ?? null,
    };
  });
}

export function enginesUnderFamily(familyKey: string): string[] {
  return ENGINE_REGISTRY.filter(e => e.safeguardFamily === familyKey).map(e => e.key);
}
