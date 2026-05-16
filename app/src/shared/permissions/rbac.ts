// Sovereign Permissions — shared federation RBAC.
//
// RULE 4: every institutional system must enforce role-based access,
// sovereign permissions and audit. This is the shared, pure permission
// model federated apps consult before executing any action. No React/DOM.

export type Capability =
  | 'view'            // read operational surfaces
  | 'act'             // drive a workflow transition
  | 'approve'         // approve / dispose
  | 'escalate'        // raise escalation tier
  | 'reassign'        // reassign work
  | 'annotate'        // record case notes
  | 'configure';      // configure the institution

export type SovereignRole =
  | 'observer'        // read-only oversight
  | 'officer'         // line execution
  | 'supervisor'      // execution + approvals + reassignment
  | 'commander'       // full operational authority
  | 'auditor';        // read + annotate (integrity)

const MATRIX: Record<SovereignRole, Capability[]> = {
  observer: ['view'],
  officer: ['view', 'act', 'annotate'],
  supervisor: ['view', 'act', 'approve', 'reassign', 'annotate', 'escalate'],
  commander: ['view', 'act', 'approve', 'reassign', 'annotate', 'escalate', 'configure'],
  auditor: ['view', 'annotate'],
};

export const ROLES: SovereignRole[] = ['observer', 'officer', 'supervisor', 'commander', 'auditor'];

export function can(role: SovereignRole, cap: Capability): boolean {
  return MATRIX[role]?.includes(cap) ?? false;
}

export function capabilities(role: SovereignRole): Capability[] {
  return MATRIX[role] ?? [];
}

// Map a runtime action to the capability it requires.
export function capabilityForAction(action: string): Capability {
  switch (action) {
    case 'approve': return 'approve';
    case 'reject': return 'approve';
    case 'escalate': return 'escalate';
    case 'assign': return 'reassign';
    case 'return': return 'act';
    case 'resolve': return 'approve';
    default: return 'act';
  }
}

export interface PermissionCheck { allowed: boolean; role: SovereignRole; capability: Capability; reason: string }
export function checkAction(role: SovereignRole, action: string): PermissionCheck {
  const capability = capabilityForAction(action);
  const allowed = can(role, capability);
  return {
    allowed,
    role,
    capability,
    reason: allowed ? 'authorised' : `role '${role}' lacks '${capability}' capability`,
  };
}
