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
