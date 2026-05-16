// Cross-Institution Execution Chains.
//
// Operational causality BETWEEN institutions: an institution's real
// operational state propagates as concrete effects on other institutions'
// execution capacity. Treasury liquidity gates procurement everywhere;
// legislative budget passage authorises fiscal execution; police civil
// stability relieves emergency posture; judiciary backlog stresses
// constitutional continuity. Pure & deterministic; no React/DOM.

export interface ChainInput {
  treasuryOperational: number;     // 0-100 (from federation posture)
  legislativeQuorum: boolean;
  legislativeBlocked: number;
  judicialClearancePct: number;
  judicialBacklog: number;
  policeOperational: number;       // 0-100
  healthOperational: number;       // 0-100
}

export interface ChainEffect {
  source: string;
  target: string;
  effect: string;
  /** signed magnitude applied to target execution capacity (-25..+10) */
  delta: number;
  severity: 'ok' | 'watch' | 'constraint';
}

export function executionChains(i: ChainInput): ChainEffect[] {
  const effects: ChainEffect[] = [];

  // Treasury liquidity gates procurement-bearing institutions.
  const liq = i.treasuryOperational;
  if (liq < 75) {
    const d = -Math.round((75 - liq) * 0.3);
    for (const target of ['Health', 'Education', 'Transport', 'Energy']) {
      effects.push({
        source: 'Treasury', target, effect: `Procurement constrained — liquidity ${liq}`,
        delta: d, severity: liq < 55 ? 'constraint' : 'watch',
      });
    }
  }

  // Legislative authorisation gates fiscal execution.
  if (!i.legislativeQuorum || i.legislativeBlocked >= 3) {
    effects.push({
      source: 'Legislature', target: 'Treasury',
      effect: !i.legislativeQuorum ? 'Fiscal authorisation withheld — no quorum' : `Appropriation stalled — ${i.legislativeBlocked} blocked`,
      delta: -Math.round(8 + i.legislativeBlocked * 3),
      severity: !i.legislativeQuorum ? 'constraint' : 'watch',
    });
  }

  // Judicial backlog stresses constitutional continuity & enforcement.
  if (i.judicialClearancePct < 70 || i.judicialBacklog > 800) {
    effects.push({
      source: 'Judiciary', target: 'Constitutional continuity',
      effect: `Backlog ${i.judicialBacklog} · clearance ${i.judicialClearancePct}% — enforcement delayed`,
      delta: -Math.round((70 - Math.min(70, i.judicialClearancePct)) * 0.3 + (i.judicialBacklog > 800 ? 6 : 0)),
      severity: i.judicialClearancePct < 55 ? 'constraint' : 'watch',
    });
  }

  // Police civil stability relieves (or strains) emergency posture.
  const pol = i.policeOperational;
  effects.push({
    source: 'Police', target: 'Emergency posture',
    effect: pol >= 70 ? 'Civil stability maintained — emergency posture relieved' : `Civil-stability stress (${pol}) — emergency posture strained`,
    delta: pol >= 70 ? +Math.round((pol - 70) * 0.2) : -Math.round((70 - pol) * 0.35),
    severity: pol >= 70 ? 'ok' : pol >= 55 ? 'watch' : 'constraint',
  });

  // Health operational collapse cascades to emergency + workforce.
  if (i.healthOperational < 60) {
    effects.push({
      source: 'Health', target: 'Emergency posture',
      effect: `Healthcare degraded (${i.healthOperational}) — surge capacity consumed`,
      delta: -Math.round((60 - i.healthOperational) * 0.4),
      severity: i.healthOperational < 45 ? 'constraint' : 'watch',
    });
  }

  return effects.sort((a, b) => a.delta - b.delta);
}

export interface ChainSummary {
  effects: ChainEffect[];
  constraints: number;
  worstTarget: string | null;
  systemicDrag: number; // total negative delta magnitude
}
export function chainSummary(i: ChainInput): ChainSummary {
  const effects = executionChains(i);
  const constraints = effects.filter(e => e.severity === 'constraint').length;
  const neg = effects.filter(e => e.delta < 0);
  const worstTarget = neg.length ? neg[0]!.target : null;
  const systemicDrag = neg.reduce((s, e) => s + Math.abs(e.delta), 0);
  return { effects, constraints, worstTarget, systemicDrag };
}
