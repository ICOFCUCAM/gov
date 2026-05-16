// Ministry Factory — composes the full sovereign operational ecosystem
// for ANY institution from its archetype. A ministry is not a page: it
// is a six-layer ecosystem across national / regional / local tiers,
// dependency-aware against other ministries. Pure & deterministic.

import type { ArchetypeKey, Ministry } from '@/lib/api/types';
import { seed } from '@/lib/telemetry';
import { subsystemsFor } from '@/lib/institution/operational-catalog';

export type LayerKey = 'executive' | 'operational' | 'intelligence' | 'public' | 'institutional' | 'infrastructure';
export interface FabricLayer { key: LayerKey; name: string; modules: string[] }
export interface FabricTier { tier: 'National Command' | 'Regional Command' | 'Local Operations'; scope: string; units: number }
export interface MinistryDependency { archetype: ArchetypeKey; relation: string; direction: 'consumes' | 'provides' | 'mutual' }

// Every activated institution inherits these standard layer modules.
const BASE_LAYERS: FabricLayer[] = [
  { key: 'executive', name: 'Executive layer', modules: ['Minister command centre', 'Deputy operations', 'Strategic briefings', 'Escalation system', 'National telemetry', 'Readiness posture'] },
  { key: 'operational', name: 'Operational layer', modules: ['Field operations', 'Regional coordination', 'Logistics', 'Approvals', 'Inspections', 'Deployments', 'Incident handling'] },
  { key: 'intelligence', name: 'Intelligence layer', modules: ['Analytics', 'Forecasting', 'Risk heatmaps', 'National trends', 'Anomaly detection', 'Cross-ministry dependency analysis'] },
  { key: 'public', name: 'Public-service layer', modules: ['Citizen portal', 'Requests', 'Licensing', 'Public applications', 'Payments', 'Verification'] },
  { key: 'institutional', name: 'Institutional layer', modules: ['Staffing & workforce', 'Budgeting', 'Compliance', 'Procurement', 'Audit', 'Policy implementation'] },
  { key: 'infrastructure', name: 'Infrastructure layer', modules: ['Facilities', 'Regional coverage', 'Infrastructure monitoring', 'Operational uptime', 'National coverage map'] },
];

// Archetype cross-ministry dependency graph (real interconnection).
const DEPS: Partial<Record<ArchetypeKey, MinistryDependency[]>> = {
  HEALTH: [
    { archetype: 'FINANCE', relation: 'Budget & insurance settlement', direction: 'consumes' },
    { archetype: 'TRANSPORT', relation: 'Ambulance corridors · supply chain', direction: 'mutual' },
    { archetype: 'INTERIOR', relation: 'Civil registry · identity', direction: 'consumes' },
    { archetype: 'TRADE', relation: 'Pharmaceutical imports', direction: 'consumes' },
    { archetype: 'GENERIC', relation: 'Emergency response coordination', direction: 'provides' },
  ],
  ENERGY: [
    { archetype: 'FINANCE', relation: 'Tariff & subsidy settlement', direction: 'consumes' },
    { archetype: 'TRANSPORT', relation: 'Fuel logistics corridors', direction: 'mutual' },
    { archetype: 'INTERIOR', relation: 'Critical-infrastructure security', direction: 'consumes' },
    { archetype: 'HEALTH', relation: 'Facility power continuity', direction: 'provides' },
  ],
  TRANSPORT: [
    { archetype: 'HEALTH', relation: 'Medical supply & evacuation', direction: 'provides' },
    { archetype: 'TRADE', relation: 'Export/import corridors', direction: 'mutual' },
    { archetype: 'INTERIOR', relation: 'Border & checkpoint coordination', direction: 'mutual' },
    { archetype: 'ENERGY', relation: 'Fuel distribution', direction: 'consumes' },
  ],
  FINANCE: [
    { archetype: 'GENERIC', relation: 'Whole-of-government appropriation', direction: 'provides' },
    { archetype: 'TRADE', relation: 'Revenue & customs', direction: 'mutual' },
    { archetype: 'INTERIOR', relation: 'Identity-linked taxation', direction: 'consumes' },
  ],
  INTERIOR: [
    { archetype: 'GENERIC', relation: 'Identity & civil registry backbone', direction: 'provides' },
    { archetype: 'TRANSPORT', relation: 'Border control', direction: 'mutual' },
    { archetype: 'FINANCE', relation: 'Sanctions & enforcement', direction: 'mutual' },
  ],
  AGRICULTURE: [
    { archetype: 'TRADE', relation: 'Commodity markets & exports', direction: 'mutual' },
    { archetype: 'TRANSPORT', relation: 'Produce logistics', direction: 'consumes' },
    { archetype: 'ENVIRONMENT', relation: 'Irrigation & climate data', direction: 'consumes' },
  ],
  EDUCATION: [
    { archetype: 'FINANCE', relation: 'Scholarship & capitation funding', direction: 'consumes' },
    { archetype: 'INTERIOR', relation: 'Learner identity', direction: 'consumes' },
  ],
  ENVIRONMENT: [
    { archetype: 'AGRICULTURE', relation: 'Climate & water advisory', direction: 'provides' },
    { archetype: 'ENERGY', relation: 'Emissions oversight', direction: 'mutual' },
  ],
  TRADE: [
    { archetype: 'FINANCE', relation: 'Customs revenue', direction: 'provides' },
    { archetype: 'TRANSPORT', relation: 'Trade corridors', direction: 'mutual' },
  ],
  JUSTICE: [
    { archetype: 'INTERIOR', relation: 'Corrections & enforcement', direction: 'mutual' },
    { archetype: 'FINANCE', relation: 'Asset recovery', direction: 'provides' },
  ],
  LABOR: [
    { archetype: 'FINANCE', relation: 'Social-insurance funds', direction: 'mutual' },
    { archetype: 'EDUCATION', relation: 'Skills & training pipeline', direction: 'consumes' },
  ],
};

export function ministryLayers(): FabricLayer[] {
  return BASE_LAYERS;
}

export function ministryTiers(m: Pick<Ministry, 'id' | 'archetype'>): FabricTier[] {
  const subs = subsystemsFor(m.archetype);
  const footprint = subs.reduce((a, s) => a + s.scale, 0);
  const regions = 6 + Math.round(seed(`tier:${m.id}:r`) * 8);
  const local = Math.max(regions * 4, Math.round(footprint / 40));
  return [
    { tier: 'National Command', scope: 'Strategic operations · executive authority', units: 1 },
    { tier: 'Regional Command', scope: `${regions} ${'regions'} · provincial coordination`, units: regions },
    { tier: 'Local Operations', scope: 'Municipal · field delivery', units: local },
  ];
}

export function ministryDependencies(archetype: ArchetypeKey): MinistryDependency[] {
  return DEPS[archetype] ?? [
    { archetype: 'FINANCE', relation: 'Appropriation & budget', direction: 'consumes' },
    { archetype: 'INTERIOR', relation: 'Identity & coordination', direction: 'consumes' },
    { archetype: 'GENERIC', relation: 'Whole-of-government services', direction: 'mutual' },
  ];
}

export interface MinistryFabric {
  layers: FabricLayer[];
  tiers: FabricTier[];
  dependencies: MinistryDependency[];
  /** how many of the six layers are provisioned (all, by construction) */
  layersProvisioned: number;
}

export function ministryFabric(m: Pick<Ministry, 'id' | 'archetype'>): MinistryFabric {
  const layers = ministryLayers();
  return {
    layers,
    tiers: ministryTiers(m),
    dependencies: ministryDependencies(m.archetype),
    layersProvisioned: layers.length,
  };
}
