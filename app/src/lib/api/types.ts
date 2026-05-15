// CivicOS — Phase 1 API contract types.
// These types are the contract between UI and backend. The backend
// implementation is swappable (mock adapter now; sovereign datastore later).

export type ISODate = string;

export interface Citizen {
  id: string;               // per-session handle, not a global ID (Companion 03)
  displayName: string;
  preferredLocale: 'en' | 'sw' | 'ar' | 'fr' | 'yo';
  municipality: string;
}

export interface Session {
  authenticated: boolean;
  citizen?: Citizen;
  method?: 'agent' | 'office' | 'biometric' | 'demo';
}

// ── Permits ───────────────────────────────────────────────────────────
export type PermitType =
  | 'building'
  | 'business'
  | 'market-stall'
  | 'event'
  | 'vehicle'
  | 'food-handling';

export type PermitStatus =
  | 'draft'
  | 'submitted'
  | 'in-review'
  | 'needs-info'
  | 'approved'
  | 'declined';

export interface PermitTimelineEntry {
  status: PermitStatus;
  at: ISODate;
  note?: string;
  officerName?: string;
}

export interface Permit {
  id: string;
  type: PermitType;
  title: string;
  applicantName: string;
  municipality: string;
  status: PermitStatus;
  submittedAt?: ISODate;
  decisionDue?: ISODate;
  officerName?: string;
  aiClass?: 'A' | 'B' | 'C' | 'D' | 'E';
  fields: Record<string, string>;
  timeline: PermitTimelineEntry[];
  contestable: boolean;
}

export type PermitDecision = 'approve' | 'decline' | 'request-info' | 'escalate';

export interface DecidePermitInput {
  decision: PermitDecision;
  officerName: string;
  note?: string;
  aiClass?: 'A' | 'B' | 'C' | 'D' | 'E';
}

export interface AuditEntry {
  id: string;
  at: ISODate;
  actor: string; // officer name / system
  action: string; // e.g. "permit.decide"
  resource: string; // e.g. "Permit:PM-4F21"
  outcome: string; // "ok" | "denied" | "error"
  detail?: string;
  seq: number;
  prevHash: string | null;
  hash: string;
}

export interface CreatePermitInput {
  type: PermitType;
  title: string;
  applicantName: string;
  municipality: string;
  fields: Record<string, string>;
}

// ── Operational intelligence ──────────────────────────────────────────
export type HealthStatus = 'ok' | 'degraded' | 'down';

export interface ServiceHealth {
  name: string;
  status: HealthStatus;
  latencyMs: number; // p95
  detail: string;
}

export interface QueueHealth {
  name: string;
  depth: number;
  oldestAgeHours: number;
  slaHours: number;
  breaching: boolean;
}

export interface TenantHealth {
  municipality: string;
  status: HealthStatus;
  openPermits: number;
  slaBreaches: number;
  overdueBills: number;
  lastSyncMinutes: number; // minutes since last edge sync
}

export type IncidentSeverity = 'sev1' | 'sev2' | 'sev3' | 'sev4';
export type IncidentStatus = 'open' | 'acknowledged' | 'resolved';

export interface IncidentEvent {
  at: ISODate;
  by: string;
  action: string; // opened | acknowledged | escalated | resolved | note
  note?: string;
}

export interface Incident {
  id: string;
  severity: IncidentSeverity;
  title: string;
  scope: string; // service or municipality
  status: IncidentStatus;
  openedAt: ISODate;
  acknowledgedAt?: ISODate;
  resolvedAt?: ISODate;
  owner?: string;
  events: IncidentEvent[];
}

export interface OpsOverview {
  generatedAt: ISODate;
  summary: {
    servicesOk: number;
    servicesTotal: number;
    queuesBreaching: number;
    openIncidents: number;
    slaCompliancePct: number;
    auditIntact: boolean;
  };
  services: ServiceHealth[];
  queues: QueueHealth[];
  tenants: TenantHealth[];
}

// ── Payments ──────────────────────────────────────────────────────────
export type BillKind = 'water' | 'waste' | 'property-tax' | 'permit-fee' | 'transit';

export interface Bill {
  id: string;
  kind: BillKind;
  description: string;
  amountMinor: number;       // minor units (e.g., cents)
  currency: string;
  dueDate: ISODate;
  status: 'due' | 'paid' | 'overdue';
}

export interface PaymentReceipt {
  id: string;
  billId: string;
  amountMinor: number;
  currency: string;
  rail: string;              // e.g., M-Pesa, ISO 20022 credit transfer
  paidAt: ISODate;
  hash: string;
}

// ── Notifications ─────────────────────────────────────────────────────
export interface Notification {
  id: string;
  from: string;              // ministry / office / assistant
  subject: string;
  body: string;
  at: ISODate;
  read: boolean;
  channel: 'wallet' | 'sms' | 'ussd' | 'ivr';
  aiClass?: 'A' | 'B' | 'C' | 'D' | 'E';
}

// ── Document verification ─────────────────────────────────────────────
export interface VerifyResult {
  valid: boolean;
  subject?: string;
  issuer?: string;
  credentialType?: string;
  issuedAt?: ISODate;
  revoked?: boolean;
  reason?: string;           // when invalid
}

// ── Digital signatures ────────────────────────────────────────────────
export interface SignatureRequest {
  documentId: string;
  documentTitle: string;
  signerName: string;
}

export interface SignatureResult {
  id: string;
  documentId: string;
  signerName: string;
  signedAt: ISODate;
  hash: string;
  nonRepudiation: true;
}

// ── Municipal onboarding ──────────────────────────────────────────────
export interface MunicipalityOnboardingInput {
  name: string;
  country: string;
  adminContact: string;
  population: number;
  officialLanguages: string[];
  inclusionFloor: {
    ussd: boolean;
    ivr: boolean;
    agentNetwork: boolean;
    walkIn: boolean;
  };
  modules: PermitType[] | string[];
  constitutionalOfficerSignoff: boolean;
}

export interface MunicipalityOnboardingResult {
  id: string;
  name: string;
  status: 'provisioned' | 'blocked';
  checks: { label: string; passed: boolean; detail?: string }[];
  goLiveEstimateDays: number;
}

// Generic envelope
export interface ApiError {
  error: string;
  detail?: string;
}

// ── Interoperability & federation ─────────────────────────────────────
export type IntegrationKind = 'integration' | 'extension';
export type IntegrationStatus = 'pending' | 'approved' | 'suspended' | 'revoked';

export interface IntegrationClient {
  id: string;
  kind: IntegrationKind;
  name: string;
  ownerOrg: string;
  scopes: string[];
  status: IntegrationStatus;
  rateLimitRpm: number;
  createdAt: ISODate;
  approvedBy?: string;
}

export interface IntegrationRegistered {
  id: string;
  status: IntegrationStatus;
  apiKey: string; // shown once
  note: string;
}

export type FederationStatus = 'proposed' | 'approved' | 'revoked';

export interface FederationGrant {
  id: string;
  fromTenant: string;
  toTenant: string;
  scopes: string[];
  status: FederationStatus;
  reason: string;
  createdAt: ISODate;
  approvedBy?: string;
  expiresAt?: ISODate;
}

export type WebhookStatus = 'active' | 'paused' | 'disabled';

export interface WebhookSubscription {
  id: string;
  topic: string;
  url: string;
  status: WebhookStatus;
  failures: number;
  createdAt: ISODate;
}

export interface WebhookCreated {
  id: string;
  topic: string;
  signingSecret: string; // shown once
  note: string;
}

export interface FederationCheck {
  allowed: boolean;
  reason: string;
}

// ── Platform operations & lifecycle ───────────────────────────────────
export type ReleaseChannel = 'dev' | 'staging' | 'stable';
export interface Release {
  id: string;
  version: string;
  channel: ReleaseChannel;
  notes: string;
  schemaMigration?: string;
  approvedBy?: string;
  createdAt: ISODate;
}

export type DeployStrategy = 'rolling' | 'canary' | 'blue-green';
export type DeployState =
  | 'pending' | 'precheck' | 'rollout' | 'verify' | 'completed' | 'rolled-back';
export interface DeployGate {
  at: ISODate; gate: string; result: 'pass' | 'fail'; by: string; note?: string;
}
export interface Deployment {
  id: string;
  releaseId: string;
  releaseVersion: string;
  strategy: DeployStrategy;
  state: DeployState;
  gates: DeployGate[];
  startedAt: ISODate;
  completedAt?: ISODate;
}

export type TenantState =
  | 'provisioning' | 'active' | 'suspended' | 'decommissioned';
export interface TenantLifecycle {
  tenant: string;
  state: TenantState;
  events: { at: ISODate; from: string; to: string; reason: string; actor: string }[];
}

export type BackupKind = 'full' | 'incremental';
export type BackupState = 'pending' | 'completed' | 'failed' | 'restoring';
export interface BackupRecord {
  id: string;
  kind: BackupKind;
  state: BackupState;
  location: string;
  encrypted: boolean;
  sizeBytes?: number;
  createdAt: ISODate;
}

export type ConfigState = 'draft' | 'signed' | 'applied' | 'superseded';
export interface ConfigBundle {
  id: string;
  scope: 'global' | 'tenant';
  version: number;
  contentHash: string;
  signedBy?: string;
  state: ConfigState;
  createdAt: ISODate;
}
export interface ConfigDrift { drift: boolean; reason: string; }

// ── Institutional framework (dynamic multi-ministry) ──────────────────
export type ArchetypeKey =
  | 'HEALTH' | 'EDUCATION' | 'FINANCE' | 'AGRICULTURE' | 'ENERGY'
  | 'TRANSPORT' | 'JUSTICE' | 'ENVIRONMENT' | 'INTERIOR' | 'LABOR'
  | 'TRADE' | 'GENERIC';

export interface Archetype {
  key: ArchetypeKey;
  title: string;
  summary: string;
  defaultDepartments: string[];
  defaultModules: string[];
  domainEntities: string[];
}

export type MinistryStatus = 'active' | 'merged' | 'deactivated';

export interface Department { id: string; name: string; }
export interface ModuleActivation { moduleKey: string; enabled: boolean; }

export interface Ministry {
  id: string;
  slug: string;
  name: string;
  archetype: ArchetypeKey;
  status: MinistryStatus;
  mergedIntoId?: string;
  createdAt: ISODate;
  departments: Department[];
  modules: ModuleActivation[];
}

// ── Module operations (archetype-driven operational dashboards) ───────
export type OpsTone = 'ok' | 'warn' | 'alert' | 'neutral';
export interface KpiValue { label: string; value: string; tone: OpsTone; target?: string; }
export interface QueueValue {
  label: string; depth: number; oldestAgeHours: number;
  slaHours: number; breaching: boolean;
}
export interface AlertValue {
  label: string; severity: IncidentSeverity; active: boolean; detail: string;
}
export interface ModuleOps {
  module: string; title: string;
  kpis: KpiValue[]; queues: QueueValue[]; alerts: AlertValue[];
}
export interface MinistryOperations {
  ministry: { id: string; name: string; archetype: ArchetypeKey; status: MinistryStatus };
  generatedAt: ISODate;
  modules: ModuleOps[];
}

// ── Deep operational console (regions, actionable queues) ────────────
export interface RegionStat {
  region: string;
  facilitiesOperationalPct: number;
  capacityPct: number;
  openCases: number;
  slaBreaches: number;
  status: OpsTone;
}
export interface MinistryRegions {
  ministry: { id: string; name: string; archetype: ArchetypeKey };
  labels: { unit: string; capacity: string; cases: string };
  generatedAt: ISODate;
  regions: RegionStat[];
}

export type QueuePriority = 'routine' | 'elevated' | 'urgent';
export type QueueItemState = 'open' | 'assigned' | 'escalated' | 'cleared';
export type QueueAction = 'assign' | 'escalate' | 'clear';

export interface QueueItem {
  id: string;
  ref: string;
  subject: string;
  region: string;
  ageHours: number;
  priority: QueuePriority;
  state: QueueItemState;
  assignee?: string;
  note?: string;
}
export interface MinistryQueue {
  ministry: { id: string; name: string; archetype: ArchetypeKey };
  queueKey: string;
  title: string;
  slaHours: number;
  items: QueueItem[];
}

export interface AnalyticDelta {
  label: string;
  value: string;
  delta: number; // signed % vs prior period
  goodWhenUp: boolean;
}

// ── Archetype-specialised operational surfaces ───────────────────────
export interface MinistryIncident {
  key: string;
  label: string;
  severity: IncidentSeverity;
  detail: string;
  active: boolean;
  tierIndex: number; // position in the escalation chain
}
export interface MinistryIncidents {
  ministry: { id: string; name: string; archetype: ArchetypeKey };
  escalation: string[];
  incidents: MinistryIncident[];
}
export interface FieldUnitStatus {
  unit: string;
  label: string;
  counts: { state: string; n: number }[];
  total: number;
}
export interface MinistryFieldOps {
  ministry: { id: string; name: string; archetype: ArchetypeKey };
  units: FieldUnitStatus[];
}

// ── Sovereign profile (global-state neutrality) ──────────────────────
export type StateForm =
  | 'republic'
  | 'federation'
  | 'monarchy'
  | 'city-state'
  | 'union'
  | 'parliamentary';

export interface SovereignProfile {
  stateName: string;
  stateForm: StateForm;
  executiveTitle: string;   // President / Prime Minister / Chancellor / Emir …
  legislatureName: string;  // National Assembly / Bundestag / Federal Council …
  currency: string;         // ISO 4217
  regionNoun: string;       // region / province / state / emirate / canton …
  locale: string;
}

export interface CabinetOverview {
  sovereign: SovereignProfile;
  generatedAt: ISODate;
  institutions: {
    id: string;
    name: string;
    archetype: ArchetypeKey;
    status: MinistryStatus;
    openQueue: number;
    activeIncidents: number;
  }[];
  totals: {
    institutions: number;
    activeMinistries: number;
    activeIncidents: number;
    queuesBreaching: number;
    auditIntact: boolean;
  };
}

// ── Command visualisation series ─────────────────────────────────────
export interface AnalyticSeries {
  key: string;
  label: string;
  unit: string;
  points: number[];      // ~12 period points (oldest → newest)
  current: number;
  mean: number;
  goodWhenUp: boolean;
}
export interface MinistrySeries {
  ministry: { id: string; name: string; archetype: ArchetypeKey };
  series: AnalyticSeries[];
}
