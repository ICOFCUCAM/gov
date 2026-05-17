// Emergency-Power Lifecycle — constitutional time-bound authority.
//
// RULE 4: emergency powers are constitutionally exceptional. They MUST be
// time-bound, extendable only by a constituted authority through an
// explicit renewal, and they auto-lapse the moment the sunset clock
// expires without renewal — silence is not consent. This pure engine
// derives the live lifecycle phase of an emergency declaration from its
// assertion record and the current clock. No synthetic state; no React/DOM.

export type EmergencyPhase =
  | 'none'        // no emergency asserted
  | 'active'      // within the current sunset window
  | 'renewal-due' // inside the renewal-warning band, not yet lapsed
  | 'lapsed'      // sunset passed without renewal — powers constitutionally void
  | 'revoked';    // explicitly stood down by the asserting authority

export interface EmergencyRenewal {
  /** wall-clock hour the renewal was constitutionally enacted */
  atHrs: number;
  /** constituted authority that enacted the renewal */
  authority: string;
}

export interface EmergencyDeclaration {
  /** institution / domain the emergency covers */
  scope: string;
  /** constituted authority that asserted the emergency */
  authority: string;
  /** wall-clock hour of the original assertion */
  assertedAtHrs: number;
  /** explicit stand-down hour, if the authority revoked the powers */
  revokedAtHrs?: number;
  /** constituted renewals; each legitimate renewal restarts the sunset clock */
  renewals?: EmergencyRenewal[];
}

export interface EmergencyLifecycle {
  phase: EmergencyPhase;
  /** hours since the original assertion (0 when no emergency) */
  ageHrs: number;
  /** hours since the last legitimate extension (assertion or renewal) */
  sinceLastRenewalHrs: number;
  /** absolute hour the current window expires */
  sunsetAtHrs: number;
  /** hours remaining before sunset — negative once lapsed */
  hrsToSunset: number;
  /** number of legitimate renewals applied so far */
  renewalCount: number;
  /** are the powers constitutionally in force right now */
  legitimate: boolean;
  detail: string;
}

export const EMERGENCY_SUNSET_HRS = 72;
// The renewal-due band opens once the window is 70% elapsed.
const RENEWAL_WARN_FRACTION = 0.7;

/**
 * Derive the live constitutional lifecycle of an emergency declaration.
 * Pure & deterministic: same declaration + clock → same verdict.
 */
export function emergencyLifecycle(
  decl: EmergencyDeclaration | null | undefined,
  nowHrs: number,
): EmergencyLifecycle {
  if (!decl) {
    return {
      phase: 'none', ageHrs: 0, sinceLastRenewalHrs: 0,
      sunsetAtHrs: 0, hrsToSunset: 0, renewalCount: 0,
      legitimate: true, detail: 'No emergency powers asserted',
    };
  }

  const ageHrs = Math.max(0, Math.round((nowHrs - decl.assertedAtHrs) * 100) / 100);

  // Only renewals that were enacted on/after assertion and on/before now
  // count — a renewal cannot precede the declaration nor be backdated.
  const applied = (decl.renewals ?? [])
    .filter(r => r.atHrs >= decl.assertedAtHrs && r.atHrs <= nowHrs)
    .sort((a, b) => a.atHrs - b.atHrs);
  const lastEventHrs = applied.length ? applied[applied.length - 1]!.atHrs : decl.assertedAtHrs;
  const sinceLastRenewalHrs = Math.max(0, Math.round((nowHrs - lastEventHrs) * 100) / 100);
  const sunsetAtHrs = lastEventHrs + EMERGENCY_SUNSET_HRS;
  const hrsToSunset = Math.round((sunsetAtHrs - nowHrs) * 100) / 100;
  const renewalCount = applied.length;

  // Explicit stand-down by the asserting authority takes precedence.
  if (decl.revokedAtHrs != null && nowHrs >= decl.revokedAtHrs) {
    return {
      phase: 'revoked', ageHrs, sinceLastRenewalHrs, sunsetAtHrs, hrsToSunset, renewalCount,
      legitimate: true,
      detail: `Emergency powers stood down by ${decl.authority} — normal constitutional order restored`,
    };
  }

  if (hrsToSunset <= 0) {
    return {
      phase: 'lapsed', ageHrs, sinceLastRenewalHrs, sunsetAtHrs, hrsToSunset, renewalCount,
      legitimate: false,
      detail: `Emergency lapsed — sunset expired ${Math.abs(hrsToSunset)}h ago without constituted renewal; powers void`,
    };
  }

  const warnThreshold = EMERGENCY_SUNSET_HRS * (1 - RENEWAL_WARN_FRACTION);
  if (hrsToSunset <= warnThreshold) {
    return {
      phase: 'renewal-due', ageHrs, sinceLastRenewalHrs, sunsetAtHrs, hrsToSunset, renewalCount,
      legitimate: true,
      detail: `Renewal due in ${hrsToSunset}h — ${decl.authority} must re-authorise or powers auto-lapse`,
    };
  }

  return {
    phase: 'active', ageHrs, sinceLastRenewalHrs, sunsetAtHrs, hrsToSunset, renewalCount,
    legitimate: true,
    detail: renewalCount
      ? `Emergency in force (${renewalCount} renewal${renewalCount > 1 ? 's' : ''}) — sunset in ${hrsToSunset}h`
      : `Emergency in force — sunset in ${hrsToSunset}h`,
  };
}

/** Map a lifecycle phase to a constitutional check status. */
export function emergencyCheckStatus(phase: EmergencyPhase): 'ok' | 'watch' | 'breach' {
  return phase === 'lapsed' ? 'breach' : phase === 'renewal-due' ? 'watch' : 'ok';
}
