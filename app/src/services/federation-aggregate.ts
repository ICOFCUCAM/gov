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

export function federationPosture(mins: Ministry[], t: number): FederationPosture {
  const active = mins.filter(m => m.status === 'active');
  const institutions: InstitutionPosture[] = active.map((m): InstitutionPosture => {
    const fn = FN[m.archetype];
    const instability = fn ? fn(m.id, t) : 40;
    const operational = Math.max(0, 100 - instability);
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
