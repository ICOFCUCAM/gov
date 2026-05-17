// Strategic Decision Engine — national intelligence that terminates in execution.
//
// RULE 3 + the execution mandate: the platform must never stop at a
// dashboard. This engine synthesises every emergent national signal —
// sovereign execution index, fabric contagion, cross-institution chain
// constraints, constitutional/emergency posture and the worst-operating
// institution — into a deterministically ranked queue of sovereign
// decisions. Each decision carries a concrete EXECUTABLE DIRECTIVE (a real
// runtime scope + work kind + title) so the operator can inject it into
// the live institutional runtime, closing the intelligence → decision →
// execution → causality loop. Pure & deterministic; no React/DOM.

import type { WorkKind } from '@/lib/gov/runtime-workflow';

export interface StrategicSignals {
  executionIndex: number;                       // 0-100
  executionBand: 'operational' | 'strained' | 'degraded';
  fragility: 'resilient' | 'coupled' | 'cascading';
  amplification: number;                        // systemic resilience drag
  worstNode: { id: string; name: string; effective: number } | null;
  chainConstraints: number;
  chainWorstTarget: string | null;
  systemicDrag: number;
  legislativeQuorum: boolean;
  legislativeBlocked: number;
  judicialClearancePct: number;
  judicialBacklog: number;
  treasuryOperational: number;
  lapsedEmergencies: number;
  worstInstitution: { id: string; name: string; operational: number } | null;
}

export interface ExecutableDirective {
  scope: string;       // runtime scope the directive injects into
  kind: WorkKind;      // workflow the injected work item runs
  title: string;       // operator-facing directive title
}
export interface DecisionMetric {
  /** stable signal key the decision is accountable to */
  key: string;
  label: string;
  /** signal value at the moment the decision was raised */
  baseline: number;
  /** the direction that constitutes success */
  goal: 'raise' | 'lower';
}
export interface StrategicDecision {
  id: string;
  title: string;
  rationale: string;
  severity: 'critical' | 'priority' | 'advisory';
  /** weighted urgency used for ordering (higher = sooner) */
  urgency: number;
  domain: string;
  directive: ExecutableDirective;
  /** the signal this decision is held accountable to (efficacy ledger) */
  metric: DecisionMetric;
}

const SEV_RANK: Record<StrategicDecision['severity'], number> = {
  critical: 100, priority: 60, advisory: 30,
};

export function strategicDecisions(s: StrategicSignals): StrategicDecision[] {
  const out: StrategicDecision[] = [];
  const push = (
    id: string,
    severity: StrategicDecision['severity'],
    bump: number,
    title: string,
    rationale: string,
    domain: string,
    directive: ExecutableDirective,
    metric: DecisionMetric,
  ) => out.push({ id, severity, urgency: SEV_RANK[severity] + bump, title, rationale, domain, directive, metric });

  // 1. Sovereign execution degraded — stabilise the worst institution.
  if (s.executionBand === 'degraded' && s.worstInstitution) {
    const w = s.worstInstitution;
    push('exec-stabilise', 'critical', 100 - s.executionIndex,
      `Stabilise sovereign execution — ${w.name}`,
      `Execution index ${s.executionIndex} (degraded); ${w.name} operating at ${w.operational}.`,
      w.id,
      { scope: `${w.id}:command`, kind: 'incident', title: `Operational stabilisation directive — ${w.name}` },
      { key: 'executionIndex', label: 'Sovereign execution index', baseline: s.executionIndex, goal: 'raise' });
  }

  // 2. Fabric contagion cascading — contain at the worst propagation node.
  if (s.fragility === 'cascading' && s.worstNode) {
    const n = s.worstNode;
    push('contagion-contain', 'critical', s.amplification * 2,
      `Contain fabric contagion — ${n.name}`,
      `Resilience cascading (−${s.amplification} systemic drag); ${n.name} effective resilience ${n.effective}.`,
      n.id,
      { scope: `${n.id}:command`, kind: 'incident', title: `Dependency-isolation directive — ${n.name}` },
      { key: 'amplification', label: 'Systemic resilience drag', baseline: s.amplification, goal: 'lower' });
  }

  // 3. Treasury liquidity collapse — authorise a liquidity injection.
  if (s.treasuryOperational < 55) {
    push('treasury-liquidity', 'critical', 55 - s.treasuryOperational,
      'Inject sovereign liquidity — Treasury',
      `Treasury operational ${s.treasuryOperational}; procurement gated across the federation.`,
      'treasury',
      { scope: 'treasury:command', kind: 'procurement', title: 'Emergency liquidity authorisation' },
      { key: 'treasuryOperational', label: 'Treasury operational', baseline: s.treasuryOperational, goal: 'raise' });
  }

  // 4. Legislative quorum lost — fiscal authority is unconstituted.
  if (!s.legislativeQuorum) {
    push('leg-quorum', 'critical', 40,
      'Restore legislative quorum',
      'No legislative quorum — fiscal authorisation is constitutionally withheld.',
      'legislature',
      { scope: 'legislature:command', kind: 'bill', title: 'Convene quorum — restore fiscal authorisation' },
      { key: 'legislativeQuorum', label: 'Legislative quorum', baseline: s.legislativeQuorum ? 1 : 0, goal: 'raise' });
  } else if (s.legislativeBlocked >= 3) {
    push('leg-blocked', 'priority', s.legislativeBlocked * 4,
      'Clear blocked appropriations',
      `${s.legislativeBlocked} appropriations stalled — fiscal execution constrained.`,
      'legislature',
      { scope: 'legislature:command', kind: 'bill', title: 'Expedite blocked appropriations' },
      { key: 'legislativeBlocked', label: 'Blocked appropriations', baseline: s.legislativeBlocked, goal: 'lower' });
  }

  // 5. Lapsed emergency powers — constitutional breach, must be resolved.
  if (s.lapsedEmergencies > 0) {
    push('emergency-lapsed', 'critical', s.lapsedEmergencies * 10,
      'Resolve lapsed emergency powers',
      `${s.lapsedEmergencies} emergency declaration(s) past sunset without renewal — powers void.`,
      'legislature',
      { scope: 'legislature:command', kind: 'approval', title: 'Re-authorise or stand down lapsed emergency powers' },
      { key: 'lapsedEmergencies', label: 'Lapsed emergency powers', baseline: s.lapsedEmergencies, goal: 'lower' });
  }

  // 6. Judicial backlog — constitutional enforcement is delayed.
  if (s.judicialClearancePct < 70 || s.judicialBacklog > 800) {
    push('jud-surge', 'priority', (70 - Math.min(70, s.judicialClearancePct)) + (s.judicialBacklog > 800 ? 10 : 0),
      'Surge judicial clearance',
      `Clearance ${s.judicialClearancePct}% · backlog ${s.judicialBacklog} — enforcement delayed.`,
      'judiciary',
      { scope: 'judiciary:command', kind: 'judicial', title: 'Backlog-clearance surge directive' },
      { key: 'judicialClearancePct', label: 'Judicial clearance %', baseline: s.judicialClearancePct, goal: 'raise' });
  }

  // 7. Cross-institution chain constraint — relieve the worst target.
  if (s.chainConstraints > 0 && s.chainWorstTarget) {
    const dom = s.chainWorstTarget.toLowerCase().split(' ')[0]!;
    push('chain-relieve', 'priority', s.systemicDrag,
      `Relieve execution constraint — ${s.chainWorstTarget}`,
      `${s.chainConstraints} active constraint(s); systemic drag ${s.systemicDrag} on ${s.chainWorstTarget}.`,
      dom,
      { scope: `${dom}:command`, kind: 'approval', title: `Constraint-relief directive — ${s.chainWorstTarget}` },
      { key: 'systemicDrag', label: 'Cross-institution drag', baseline: s.systemicDrag, goal: 'lower' });
  }

  // 8. Single worst institution still below operating floor.
  if (s.worstInstitution && s.worstInstitution.operational < 50 && s.executionBand !== 'degraded') {
    const w = s.worstInstitution;
    push('inst-recover', 'priority', 50 - w.operational,
      `Operational recovery — ${w.name}`,
      `${w.name} operating at ${w.operational}, below the 50 operating floor.`,
      w.id,
      { scope: `${w.id}:command`, kind: 'incident', title: `Recovery directive — ${w.name}` },
      { key: 'worstOperational', label: `${w.name} operational`, baseline: w.operational, goal: 'raise' });
  }

  return out.sort((a, b) => b.urgency - a.urgency || a.id.localeCompare(b.id));
}

export interface StrategicPosture {
  decisions: StrategicDecision[];
  critical: number;
  posture: 'steady' | 'engaged' | 'crisis';
}
export function strategicPosture(s: StrategicSignals): StrategicPosture {
  const decisions = strategicDecisions(s);
  const critical = decisions.filter(d => d.severity === 'critical').length;
  const posture: StrategicPosture['posture'] =
    critical >= 2 ? 'crisis' : critical >= 1 || decisions.length >= 3 ? 'engaged' : 'steady';
  return { decisions, critical, posture };
}
