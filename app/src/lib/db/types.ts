// lib/db/types — typed shapes mirroring the civicos.* schema.
//
// Kept hand-written for clarity over generated noise. Each interface
// matches one table 1:1; jsonb columns are typed `Record<string, unknown>`
// at this layer (callers narrow further).

export type Posture = 'steady' | 'elevated' | 'crisis' | 'national-emergency' | 'recovery';
export type Severity = 'watch' | 'minor' | 'major' | 'national';
export type Priority = 'routine' | 'priority' | 'urgent' | 'critical';
export type WorkKind = 'approval' | 'case' | 'procurement' | 'encounter' | 'bill' | 'judicial' | 'incident' | 'permit' | 'field' | 'lab';
export type ActionKey = 'advance' | 'approve' | 'reject' | 'escalate' | 'assign' | 'resolve' | 'return' | 'sign';
export type InstitutionKind = 'ministry' | 'branch' | 'agency' | 'citizen' | 'officer' | 'platform';
export type ConsentStatus = 'pending' | 'granted' | 'denied' | 'revoked' | 'expired';

export interface InstitutionRow {
  id: string;
  charter_id: string;
  label: string;
  kind: InstitutionKind;
  domain: string;
  archetype_or_branch: string;
  grammar: string | null;
  safeguards_constant: string | null;
  expected_domains: number | null;
  shipped_domains: number | null;
  activated: boolean;
  activated_at: string | null;
  registered_at: string;
  meta: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface OfficerRow {
  id: string;
  auth_user_id: string | null;
  institution_id: string | null;
  charter_id: string | null;
  role: string;
  title: string | null;
  name: string;
  email: string | null;
  active: boolean;
  joined_at: string;
  meta: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface CitizenRow {
  id: string;
  auth_user_id: string | null;
  national_id: string | null;
  display_name: string | null;
  region: string | null;
  registered_at: string;
  active: boolean;
  meta: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface FacilityRow {
  id: string;
  code: string;
  institution_id: string | null;
  charter_id: string | null;
  archetype: string | null;
  name: string;
  region: string | null;
  kind: string | null;
  coords: { lat: number; lon: number } | null;
  operational_status: string;
  meta: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface WorkflowDefinitionRow {
  id: string;
  workflow_id: string;
  institution_charter_id: string;
  archetype: string | null;
  title: string;
  description: string | null;
  blueprint_citation: string | null;
  kind: WorkKind;
  step_count: number;
  emits: string[];
  definition: Record<string, unknown>;
  synced_at: string;
  created_at: string;
  updated_at: string;
}

export interface WorkItemRow {
  id: string;
  scope: string;
  workflow_id: string;
  ref: string;
  kind: WorkKind;
  title: string;
  current_stage: string;
  priority: Priority;
  assignee_id: string | null;
  assignee_name: string | null;
  originating_charter_id: string | null;
  citizen_id: string | null;
  closed: boolean;
  closed_at: string | null;
  meta: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface WorkItemStepRow {
  id: string;
  work_item_id: string;
  seq: number;
  step_id: string | null;
  from_stage: string | null;
  to_stage: string;
  action: ActionKey;
  actor_id: string | null;
  actor_name: string;
  actor_role: string | null;
  requires_signature: boolean;
  signature_hash: string | null;
  signed_at: string | null;
  audit_tag: string | null;
  detail: string;
  at: string;
}

export interface FederationEventRow {
  id: string;
  type: string;
  source: string;
  target: string | null;
  channel: string;
  payload: Record<string, unknown>;
  at: string;
  at_ms: number;
  consumed_count: number;
  last_consumed_at: string | null;
}

export interface AuditEntryRow {
  id: string;
  scope: string;
  seq: number;
  actor: string;
  action: string;
  subject: string;
  detail: string;
  at: string;
  at_ms: number;
  prev_hash: string;
  hash: string;
}

export interface AuditWitnessRow {
  id: string;
  scope: string;
  observed_seq: number;
  observed_hash: string;
  witness_label: string;
  has_jwk: boolean;
  has_signature: boolean;
  at: string;
  recorded_by: string | null;
}

export interface DirectiveRow {
  id: string;
  ref: string;
  kind: string;
  issued_by_charter_id: string;
  issued_by_name: string | null;
  title: string;
  citation: string | null;
  status: string;
  targets: string[];
  payload: Record<string, unknown>;
  signed_at: string | null;
  signed_by_id: string | null;
  effective_at: string | null;
  rescinded_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface DispatchRow {
  id: string;
  ref: string;
  issued_by_charter_id: string;
  issued_by_officer_id: string | null;
  target_facility_id: string | null;
  target_charter_id: string | null;
  kind: string;
  priority: Priority;
  status: string;
  detail: string | null;
  payload: Record<string, unknown>;
  dispatched_at: string;
  acknowledged_at: string | null;
  on_scene_at: string | null;
  closed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface EscalationRow {
  id: string;
  source_charter_id: string;
  target_charter_id: string | null;
  severity: Severity;
  reason: string;
  linked_work_item_id: string | null;
  linked_dispatch_id: string | null;
  triggered_by_actor: string | null;
  triggered_at: string;
  acknowledged_at: string | null;
  acknowledged_by: string | null;
  resolved_at: string | null;
  payload: Record<string, unknown>;
  created_at: string;
}

export interface PostureHistoryRow {
  id: string;
  charter_id: string;
  posture: Posture;
  readiness: number | null;
  stress: number | null;
  snapshot_at: string;
  detail: Record<string, unknown>;
}

export interface TelemetryStreamRow {
  id: string;
  stream_id: string;
  charter_id: string;
  facility_id: string | null;
  label: string;
  unit: string | null;
  aggregation: string;
  retention_days: number;
  warn_threshold: number | null;
  alert_threshold: number | null;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface TelemetrySampleRow {
  id: string;
  stream_id: string;
  ts: string;
  value: number;
  facility_id: string | null;
  meta: Record<string, unknown>;
}

export interface ServiceRequestRow {
  id: string;
  ref: string;
  citizen_id: string;
  target_charter_id: string;
  service: string;
  domain: string | null;
  title: string | null;
  status: string;
  payload: Record<string, unknown>;
  linked_work_item_id: string | null;
  submitted_at: string;
  acknowledged_at: string | null;
  resolved_at: string | null;
  cancelled_at: string | null;
  satisfaction: number | null;
  created_at: string;
  updated_at: string;
}

export interface ConsentRow {
  id: string;
  citizen_id: string;
  target_charter_id: string;
  scope: string;
  status: ConsentStatus;
  granted_at: string | null;
  revoked_at: string | null;
  expires_at: string | null;
  payload: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface AppealRow {
  id: string;
  ref: string;
  citizen_id: string;
  originating_charter_id: string;
  originating_decision_ref: string | null;
  ground: string;
  status: string;
  decision: string | null;
  reasoning: string | null;
  linked_work_item_id: string | null;
  filed_at: string;
  admitted_at: string | null;
  heard_at: string | null;
  decided_at: string | null;
  published_at: string | null;
  withdrawn_at: string | null;
  created_at: string;
  updated_at: string;
}
