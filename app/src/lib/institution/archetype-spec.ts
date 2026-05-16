// Per-archetype institutional completeness contract. This is the spec an
// institution must satisfy to be deployment-complete — explicit, not
// inferred. Pure; no store/React imports (store derives from this).

import type { ArchetypeKey } from '@/lib/api/types';

export interface ArchetypeSpec {
  /** minimum governance departments a deployable institution must carry */
  requiredDepartments: number;
  /** minimum enabled operational modules */
  requiredModules: number;
  /** executive/operational surfaces every institution of this archetype ships */
  surfaces: string[];
  /** core platform capabilities inherited by construction */
  capabilities: string[];
}

// Standard sovereign surface + capability sets every institution inherits.
const STD_SURFACES = [
  'command-room', 'executive-intelligence', 'operational-timeline',
  'regional-overview', 'crisis-wall', 'audit-console', 'field-telemetry',
  'strategic-planning',
];
const STD_CAPABILITIES = [
  'identity', 'rbac', 'audit-chain', 'interoperability', 'notifications',
  'observability', 'sovereign-documents', 'treasury', 'communications',
  'intelligence-feed',
];

// Required structural minimums per archetype (mirrors the institutional
// blueprint each archetype provisions on instantiation).
const REQUIRED: Record<ArchetypeKey, { d: number; m: number }> = {
  HEALTH:      { d: 4, m: 6 },
  EDUCATION:   { d: 4, m: 6 },
  FINANCE:     { d: 4, m: 6 },
  AGRICULTURE: { d: 4, m: 5 },
  ENERGY:      { d: 4, m: 4 },
  TRANSPORT:   { d: 4, m: 5 },
  JUSTICE:     { d: 4, m: 4 },
  ENVIRONMENT: { d: 4, m: 4 },
  INTERIOR:    { d: 3, m: 3 },
  LABOR:       { d: 3, m: 4 },
  TRADE:       { d: 3, m: 4 },
  GENERIC:     { d: 1, m: 2 },
};

export function specFor(archetype: ArchetypeKey): ArchetypeSpec {
  const r = REQUIRED[archetype] ?? REQUIRED.GENERIC;
  return {
    requiredDepartments: r.d,
    requiredModules: r.m,
    surfaces: STD_SURFACES,
    capabilities: STD_CAPABILITIES,
  };
}
