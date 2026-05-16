// Deep ministry operational model. Turns a matrix row into a real
// institution: SLA, staffing, budget pressure, readiness, logistics,
// public pressure, compliance, corruption risk, constitutional posture,
// escalation chain, regional impact, infrastructure status. Pure.

import { seed, wave } from '@/lib/telemetry';
import type { ArchetypeKey } from '@/lib/api/types';

export interface MinistryOpState {
  readiness: number;        // 0-100
  slaCompliance: number;    // %
  staffingFilled: number;   // %
  budgetPressure: number;   // 0-100 (higher = worse)
  logisticsHealth: number;  // %
  publicPressure: number;   // 0-100
  compliance: number;       // % constitutional/legal compliance
  corruptionRisk: number;   // 0-100
  infrastructureStatus: number; // %
  regionalImpact: number;   // 0-100 footprint
  liveIncidents: number;
  escalationTier: 0 | 1 | 2 | 3;
  constitutional: 'compliant' | 'review' | 'breach';
  aiAdvisory: string;
}

const A = (k: string, lo: number, hi: number, t: number) => Math.round(wave(k, t, lo, hi));

export function ministryOpState(id: string, archetype: ArchetypeKey, pressure: number, t: number): MinistryOpState {
  const base = Math.max(4, Math.min(99, pressure));
  const readiness = Math.max(1, 100 - Math.round(base * 0.6) - Math.round(seed(`mor:${id}`) * 12));
  const slaCompliance = A(`sla:${id}`, 100 - base, 99, t);
  const staffingFilled = A(`stf:${id}`, 62, 98, t);
  const budgetPressure = A(`bgt:${id}`, 20, 30 + base, t);
  const logisticsHealth = A(`log:${id}`, 100 - base, 97, t);
  const publicPressure = A(`pub:${id}`, 15, 25 + base, t);
  const compliance = A(`cmp:${id}`, 78, 99, t);
  const corruptionRisk = Math.round(seed(`cor:${id}`) * 46 + (base > 70 ? 18 : 0));
  const infrastructureStatus = A(`inf:${id}`, 100 - base, 96, t);
  const regionalImpact = 30 + Math.round(seed(`rgi:${id}`) * 60);
  const liveIncidents = Math.round(seed(`linc:${id}:${Math.floor(t / 6)}`) * (base > 65 ? 6 : 2));
  const escalationTier = (base >= 80 ? 3 : base >= 62 ? 2 : base >= 44 ? 1 : 0) as 0 | 1 | 2 | 3;
  const constitutional = compliance >= 92 ? 'compliant' : compliance >= 82 ? 'review' : 'breach';
  const aiAdvisory =
    escalationTier >= 3 ? 'Convene cabinet cell · pre-position reserves · cap exposure'
      : escalationTier === 2 ? 'Tighten SLA monitoring · reallocate to strained regions'
      : budgetPressure >= 70 ? 'Budget pressure elevated · review appropriation'
      : 'Within tolerance · sustain operating tempo';
  return {
    readiness, slaCompliance, staffingFilled, budgetPressure, logisticsHealth,
    publicPressure, compliance, corruptionRisk, infrastructureStatus, regionalImpact,
    liveIncidents, escalationTier, constitutional, aiAdvisory,
  };
}
