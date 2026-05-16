// Interconnected State Fabric.
//
// Mandatory cross-system propagation: no institution is an island. This
// engine computes the instability of each source domain (healthcare,
// treasury, legislative, judicial) and propagates concrete consequences
// onto the domains they couple with. Pure & deterministic — the wiring
// that makes the state behave like one organism.

import type { Ministry } from '@/lib/api/types';
import { healthInstability } from '@/lib/gov/health-systems';
import { ministryOpState } from '@/lib/gov/ministry-ops';
import { legislativeState } from '@/lib/gov/legislative-engine';
import { judicialState } from '@/lib/gov/judicial-engine';
import { seed } from '@/lib/telemetry';

export type DomainKey = 'healthcare' | 'treasury' | 'legislative' | 'judicial';

export interface PropagatedEffect {
  target: string;
  magnitude: number;   // 0-100 stress transferred
  effect: string;
}
export interface DomainPropagation {
  domain: DomainKey;
  label: string;
  instability: number;          // 0-100
  tone: 'ok' | 'warn' | 'alert';
  effects: PropagatedEffect[];
}
export interface StateFabric {
  domains: DomainPropagation[];
  systemicStress: number;       // 0-100 aggregate coupled stress
  worst: DomainKey;
  contagion: 'stable' | 'coupled-stress' | 'systemic';
}

const tone = (n: number): 'ok' | 'warn' | 'alert' => (n >= 65 ? 'alert' : n >= 40 ? 'warn' : 'ok');

function eff(target: string, source: number, factor: number, effect: string): PropagatedEffect {
  return { target, magnitude: Math.round(Math.max(0, Math.min(100, source * factor))), effect };
}

export function stateFabric(mins: Ministry[], t: number): StateFabric {
  const active = mins.filter(m => m.status === 'active');
  const healthM = active.find(m => m.archetype === 'HEALTH');
  const finM = active.find(m => m.archetype === 'FINANCE');

  // Healthcare instability — from the deep health engine (or seeded baseline).
  const hInst = healthM ? healthInstability(healthM.id, t) : Math.round(28 + seed(`sf:h:${t | 0}`) * 22);

  // Treasury instability — fiscal/budget pressure from op-state (or baseline).
  const tInst = finM
    ? (() => { const op = ministryOpState(finM.id, 'FINANCE', 60, t); return Math.round(Math.min(100, op.budgetPressure * 0.6 + (100 - op.slaCompliance) * 0.4)); })()
    : Math.round(30 + seed(`sf:t:${t | 0}`) * 25);

  // Legislative blockage — quorum + blocked bills.
  const leg = legislativeState(t);
  const lInst = Math.round(Math.min(100, (leg.quorum ? 0 : 35) + leg.blocked * 9 + (100 - leg.attendancePct) * 0.4));

  // Judicial instability — clearance + backlog.
  const jud = judicialState(t);
  const jInst = Math.round(Math.min(100, Math.max(0, (75 - jud.meanClearance) * 1.4) + (jud.totalBacklog > 700 ? 22 : 0)));

  const domains: DomainPropagation[] = [
    {
      domain: 'healthcare', label: 'Healthcare', instability: hInst, tone: tone(hInst),
      effects: [
        eff('Workforce readiness', hInst, 0.7, 'Clinical burnout drags national workforce'),
        eff('National resilience', hInst, 0.55, 'Continuity pillar degradation'),
        eff('Emergency posture', hInst, 0.8, 'Surge & dispatch capacity consumed'),
        eff('Treasury expenditure', hInst, 0.5, 'Contingency health spend rises'),
        eff('Pharmaceutical demand', hInst, 0.9, 'Drug & supply demand spike'),
        eff('Logistics strain', hInst, 0.6, 'Cold-chain & ambulance corridor load'),
      ],
    },
    {
      domain: 'treasury', label: 'Treasury', instability: tInst, tone: tone(tInst),
      effects: [
        eff('Procurement', tInst, 0.85, 'Disbursement throttled · contracts stalled'),
        eff('Healthcare', tInst, 0.6, 'Health budget execution constrained'),
        eff('Infrastructure', tInst, 0.7, 'Capital projects deferred'),
        eff('Education', tInst, 0.5, 'Capitation & scholarship delay'),
        eff('Transport readiness', tInst, 0.55, 'Maintenance & fuel budgets squeezed'),
      ],
    },
    {
      domain: 'legislative', label: 'Legislative', instability: lInst, tone: tone(lInst),
      effects: [
        eff('Budget approval', lInst, 0.95, 'Appropriation bills cannot pass'),
        eff('Emergency authorization', lInst, 0.8, 'Emergency powers un-renewable'),
        eff('Procurement legality', lInst, 0.6, 'Statutory procurement basis lapses'),
        eff('Constitutional continuity', lInst, 0.7, 'Legislative function impaired'),
      ],
    },
    {
      domain: 'judicial', label: 'Judicial', instability: jInst, tone: tone(jInst),
      effects: [
        eff('Constitutional integrity', jInst, 0.85, 'Review backlog erodes safeguards'),
        eff('Public accountability', jInst, 0.7, 'Oversight enforcement slows'),
        eff('Institutional trust', jInst, 0.6, 'Confidence in rule of law falls'),
        eff('Legal enforcement', jInst, 0.75, 'Judgments & sanctions delayed'),
      ],
    },
  ];

  const systemicStress = Math.round(domains.reduce((a, d) => a + d.instability, 0) / domains.length);
  const worst = domains.reduce((w, d) => (d.instability > w.instability ? d : w)).domain;
  const contagion: StateFabric['contagion'] =
    systemicStress >= 60 || domains.filter(d => d.tone === 'alert').length >= 2 ? 'systemic'
      : systemicStress >= 38 || domains.some(d => d.tone === 'alert') ? 'coupled-stress'
        : 'stable';

  return { domains, systemicStress, worst, contagion };
}
