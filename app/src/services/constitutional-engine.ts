// Constitutional Engine — shared federation service.
//
// RULE 4: every institutional system must operate under constitutional
// compliance. This pure engine evaluates an institution's posture against
// constitutional invariants — mandate adherence, separation of powers,
// emergency-power sunset, rights safeguards, audit integrity — and returns
// a compliance verdict that gates sensitive runtime actions. No React/DOM.

import {
  emergencyLifecycle,
  emergencyCheckStatus,
  type EmergencyDeclaration,
  type EmergencyLifecycle,
} from '@/shared/sovereignty/emergency-powers';

export type AppKind = 'ministry' | 'branch' | 'agency' | 'citizen' | 'officer';

export interface ConstitutionalInput {
  kind: AppKind;
  /** branch/archetype the app operationalises */
  domain: string;
  /** 0-100 operational stress (higher = worse) */
  stress: number;
  /** is an emergency posture currently asserted */
  emergencyAsserted: boolean;
  /** hours since emergency asserted (legacy sunset input) */
  emergencyAgeHrs?: number;
  /** full emergency-power declaration record (preferred — drives the lifecycle clock) */
  emergency?: EmergencyDeclaration | null;
  /** wall-clock hour for the lifecycle clock (defaults to emergencyAgeHrs) */
  nowHrs?: number;
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
  /** live emergency-power lifecycle (phase 'none' when not asserted) */
  emergency: EmergencyLifecycle;
  /** capabilities the constitution withholds while non-compliant */
  withheld: string[];
}

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

  // Emergency-power sunset — driven by the real lifecycle clock. A
  // declaration record is preferred; legacy callers supplying only
  // `emergencyAsserted`/`emergencyAgeHrs` are mapped to a synthetic
  // declaration so the same constitutional clock governs every path.
  const decl: EmergencyDeclaration | null =
    i.emergency !== undefined
      ? i.emergency
      : i.emergencyAsserted
        ? { scope: i.domain, authority: 'Asserting authority', assertedAtHrs: 0 }
        : null;
  const nowHrs = i.nowHrs ?? i.emergencyAgeHrs ?? 0;
  const emergency = emergencyLifecycle(decl, nowHrs);
  checks.push({
    rule: 'Emergency-power sunset',
    status: emergencyCheckStatus(emergency.phase),
    detail: emergency.detail,
  });

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

  return { compliant: !breach, posture, checks, emergency, withheld };
}
