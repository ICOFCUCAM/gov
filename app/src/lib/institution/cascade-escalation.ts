// Cascade escalation engine. Critical/strained propagation is not just
// surfaced — it produces actionable national escalations with a
// recommended coordination action. Pure & deterministic.

import { seed } from '@/lib/telemetry';
import type { CascadeNode } from '@/lib/institution/cascade';

export interface CascadeEscalation {
  id: string;
  institution: string;
  severity: 'critical' | 'elevated';
  totalStress: number;
  inheritedStress: number;
  driver: string;          // top upstream contributor
  recommendation: string;
  route: string;           // command surface to coordinate from
  ageMin: number;
}

export function cascadeEscalations(nodes: CascadeNode[]): CascadeEscalation[] {
  return nodes
    .filter(n => n.posture === 'critical' || n.posture === 'strained')
    .map(n => {
      const severity: CascadeEscalation['severity'] = n.posture === 'critical' ? 'critical' : 'elevated';
      const driver = n.contributors[0]?.name?.replace(/ Ministry| \(capability\)/, '') ?? 'intrinsic degradation';
      const recommendation = severity === 'critical'
        ? `Convene cross-ministry cell · stabilise ${driver} · pre-position reserves`
        : `Coordinate with ${driver} · monitor dependent load · prepare contingency`;
      return {
        id: `casc:${n.id}`,
        institution: n.name.replace(/ Ministry| \(capability\)/, ''),
        severity,
        totalStress: n.totalStress,
        inheritedStress: n.inheritedStress,
        driver,
        recommendation,
        route: severity === 'critical' ? '/gov/situation-room' : '/gov/coordination',
        ageMin: 2 + Math.round(seed(`cascage:${n.id}`) * 56),
      };
    })
    .sort((a, b) => b.totalStress - a.totalStress);
}
