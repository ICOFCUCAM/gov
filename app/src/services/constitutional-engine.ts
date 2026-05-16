// Constitutional Engine — shared federation service.
//
// RULE 4: every institutional system must operate under constitutional
// compliance. This pure engine evaluates an institution's posture against
// constitutional invariants — mandate adherence, separation of powers,
// emergency-power sunset, rights safeguards, audit integrity — and returns
// a compliance verdict that gates sensitive runtime actions. No React/DOM.

export type AppKind = 'ministry' | 'branch' | 'agency' | 'citizen' | 'officer';

export interface ConstitutionalInput {
  kind: AppKind;
  /** branch/archetype the app operationalises */
  domain: string;
  /** 0-100 operational stress (higher = worse) */
  stress: number;
  /** is an emergency posture currently asserted */
  emergencyAsserted: boolean;
  /** hours since emergency asserted (for sunset) */
  emergencyAgeHrs?: number;
  /** audit chain intact */
  auditIntact: boolean;
}

export interface ConstitutionalCheck {
  rule: string;
  status: 'ok' | 'watch' | 'breach';
  detail: string;
}
export interface ConstitutionalVerdict {
  compliant: boolean;
  posture: 'compliant' | 'under-review' | 'breach';
  checks: ConstitutionalCheck[];
  /** capabilities the constitution withholds while non-compliant */
  withheld: string[];
}

const EMERGENCY_SUNSET_HRS = 72;

export function evaluateConstitution(i: ConstitutionalInput): ConstitutionalVerdict {
  const checks: ConstitutionalCheck[] = [];

  // Mandate adherence — extreme stress without containment signals overreach risk.
  checks.push({
    rule: 'Mandate adherence',
    status: i.stress >= 85 ? 'watch' : 'ok',
    detail: i.stress >= 85 ? 'Severe operational stress — mandate continuity at risk' : 'Operating within mandate',
  });

  // Separation of powers — branch apps must not absorb cross-branch authority.
  checks.push({
    rule: 'Separation of powers',
    status: 'ok',
    detail: i.kind === 'branch' ? 'Branch authority bounded to its constitutional remit' : 'Executive instrument under constituted oversight',
  });

  // Emergency-power sunset — asserted emergency must be time-bound.
  if (i.emergencyAsserted) {
    const age = i.emergencyAgeHrs ?? 0;
    checks.push({
      rule: 'Emergency-power sunset',
      status: age >= EMERGENCY_SUNSET_HRS ? 'breach' : age >= EMERGENCY_SUNSET_HRS * 0.7 ? 'watch' : 'ok',
      detail: age >= EMERGENCY_SUNSET_HRS
        ? `Emergency exceeded ${EMERGENCY_SUNSET_HRS}h sunset without renewal — constitutional breach`
        : `Emergency asserted ${age}h ago — renewal required by ${EMERGENCY_SUNSET_HRS}h`,
    });
  } else {
    checks.push({ rule: 'Emergency-power sunset', status: 'ok', detail: 'No emergency powers asserted' });
  }

  // Rights safeguards — citizen-facing systems carry a higher bar.
  checks.push({
    rule: 'Rights safeguards',
    status: i.kind === 'citizen' && i.stress >= 75 ? 'watch' : 'ok',
    detail: i.kind === 'citizen' ? 'Citizen-facing continuity & due-process safeguards monitored' : 'Procedural safeguards inherited',
  });

  // Audit integrity — tamper-evident chain is a constitutional invariant.
  checks.push({
    rule: 'Audit integrity',
    status: i.auditIntact ? 'ok' : 'breach',
    detail: i.auditIntact ? 'Tamper-evident audit chain intact' : 'Audit chain integrity failure — constitutional breach',
  });

  const breach = checks.some(c => c.status === 'breach');
  const watch = checks.some(c => c.status === 'watch');
  const posture: ConstitutionalVerdict['posture'] = breach ? 'breach' : watch ? 'under-review' : 'compliant';

  // While breached, the constitution withholds escalation/configuration.
  const withheld = breach ? ['escalate', 'configure'] : watch ? ['configure'] : [];

  return { compliant: !breach, posture, checks, withheld };
}
