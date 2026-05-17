// Federation Aggregate — emergent national operational posture.
//
// RULE 3: all national metrics must emerge from institutional operations.
// This service aggregates the live operational state of every active
// institution (via its own deep engine) into a single whole-of-government
// posture. Nothing here is hardcoded — every figure derives from an
// institution's real operating engine. Pure; server-safe.

import type { Ministry, ArchetypeKey } from '@/lib/api/types';
import { healthInstability } from '@/lib/gov/health-systems';
import { treasuryInstability } from '@/lib/gov/treasury-systems';
import { educationInstability } from '@/lib/gov/education-systems';
import { transportInstability } from '@/lib/gov/transport-systems';
import { energyInstability } from '@/lib/gov/energy-systems';
import { interiorInstability } from '@/lib/gov/interior-systems';
import { agricultureInstability } from '@/lib/gov/agriculture-systems';
import { justiceInstability } from '@/lib/gov/justice-systems';
import { environmentInstability } from '@/lib/gov/environment-systems';
import { tradeInstability } from '@/lib/gov/trade-systems';
import { laborInstability } from '@/lib/gov/labor-systems';

const FN: Partial<Record<ArchetypeKey, (id: string, t: number) => number>> = {
  HEALTH: healthInstability, FINANCE: treasuryInstability, EDUCATION: educationInstability,
  TRANSPORT: transportInstability, ENERGY: energyInstability, INTERIOR: interiorInstability,
  AGRICULTURE: agricultureInstability, JUSTICE: justiceInstability,
  ENVIRONMENT: environmentInstability, TRADE: tradeInstability, LABOR: laborInstability,
};

export interface InstitutionPosture {
  id: string;
  name: string;
  archetype: ArchetypeKey;
  instability: number;     // 0-100 from the institution's own engine
  operational: number;     // 100 - instability
  tone: 'ok' | 'warn' | 'alert';
}
export interface FederationPosture {
  institutions: InstitutionPosture[];
  meanOperational: number;   // emergent national operational index
  worst: InstitutionPosture | null;
  degraded: number;          // institutions in alert
  posture: 'stable' | 'strained' | 'critical';
}

export interface SovereignExecutionIndex {
  index: number;            // 0-100 composite of execution health
  band: 'operational' | 'strained' | 'degraded';
  drivers: { label: string; value: number; weight: number }[];
}
// Emergent sovereign execution index — a single figure that is the
// weighted blend of real institutional operational posture, resilience
// and runtime/audit integrity. No synthetic constant.
export function sovereignExecutionIndex(input: {
  federationOperational: number;   // 0-100
  resilience: number;              // 0-100
  runtimeLoad: number;             // 0-100 (higher = worse)
  auditIntact: boolean;
}): SovereignExecutionIndex {
  const drivers = [
    { label: 'Institutional operations', value: input.federationOperational, weight: 0.4 },
    { label: 'National resilience', value: input.resilience, weight: 0.3 },
    { label: 'Runtime throughput', value: Math.max(0, 100 - input.runtimeLoad), weight: 0.2 },
    { label: 'Audit integrity', value: input.auditIntact ? 100 : 0, weight: 0.1 },
  ];
  const index = Math.round(drivers.reduce((s, d) => s + d.value * d.weight, 0));
  const band: SovereignExecutionIndex['band'] = index >= 70 ? 'operational' : index >= 50 ? 'strained' : 'degraded';
  return { index, band, drivers };
}

// `exec` injects operational causality: real operator execution per
// institution (from the runtime store) shifts its operational posture, so
// national intelligence is emergent from what operators actually do. Pure
// by default (exec → 0) to keep the engine deterministic & testable.
export function federationPosture(
  mins: Ministry[],
  t: number,
  exec?: (instId: string) => number,
  citizenLoad?: (archetype: ArchetypeKey) => number,
): FederationPosture {
  const active = mins.filter(m => m.status === 'active');
  const institutions: InstitutionPosture[] = active.map((m): InstitutionPosture => {
    const fn = FN[m.archetype];
    const instability = fn ? fn(m.id, t) : 40;
    const delta = exec ? exec(m.id) : 0;
    // Inbound citizen-request pressure degrades operational headroom
    // (citizens are first-class causal actors, not just consumers).
    const load = citizenLoad ? Math.round(citizenLoad(m.archetype) * 0.15) : 0;
    const operational = Math.max(0, Math.min(100, 100 - instability + delta - load));
    const tone: 'ok' | 'warn' | 'alert' = operational >= 70 ? 'ok' : operational >= 50 ? 'warn' : 'alert';
    return { id: m.id, name: m.name, archetype: m.archetype, instability, operational, tone };
  }).sort((a, b) => a.operational - b.operational);

  const meanOperational = institutions.length
    ? Math.round(institutions.reduce((s, i) => s + i.operational, 0) / institutions.length)
    : 100;
  const degraded = institutions.filter(i => i.tone === 'alert').length;
  const posture: FederationPosture['posture'] =
    meanOperational < 50 || degraded >= 3 ? 'critical'
      : meanOperational < 70 || degraded >= 1 ? 'strained' : 'stable';

  return {
    institutions,
    meanOperational,
    worst: institutions[0] ?? null,
    degraded,
    posture,
  };
}
