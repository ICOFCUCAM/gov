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
  /** Set when the nation's retention rule removed the applicant's details (lib/data/retention.ts). */
  anonymisedAt?: ISODate;
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
  /** How `hash` was computed: 'sha256-v2' (SHA-256 over every field) for entries written since October 2026; absent = the original 32-bit hash over action, resource, outcome and sequence. */
  alg?: 'sha256-v2';
}

/** The platform chain's signed heads, as `/api/audit/verify` reports them (lib/audit/sign.ts). */
export interface AuditSignedHeads {
  ok: boolean;
  signedHeads: number;
  head?: {
    seq: number; hash: string; at: ISODate; keyId: string; production: boolean; anchoredAt?: ISODate; anchoredTo?: string[];
    /** RFC 3161 time-stamp from the nation's TSA (lib/audit/tsa.ts). */
    timestamp?: { tsa: string; genTime: ISODate; serial: string; trusted?: boolean };
    timestampError?: string;
  };
  /** Heads a remote key provider has not signed yet. */
  pending?: number;
  /** Heads time-stamped by the nation's TSA. */
  timestamped?: number;
  currentKey?: boolean;
  problem?: string;
}

export interface AuditVerification {
  ok: boolean;
  checked: number;
  brokenAtSeq?: number;
  signed?: AuditSignedHeads;
  /** From the cached, incremental check (/api/audit/verify): entries in the chain now. */
  total?: number;
  /** False while the server is still catching up with new entries. */
  complete?: boolean;
  verifiedAt?: string;
  /** When the whole chain was last checked from its first entry. */
  fullCheckAt?: string;
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
  /** First 8 hex of the API key (`civ_<prefix>_…`), to recognise it; the key is shown once and kept only as a SHA-256 hash. Absent on clients registered before keys were kept. */
  keyPrefix?: string;
  keyIssuedAt?: ISODate;
  lastUsedAt?: ISODate;
  calls?: number;
}

export interface IntegrationRegistered {
  id: string;
  status: IntegrationStatus;
  apiKey: string; // shown once
  note: string;
}

export type FederationStatus = 'proposed' | 'approved' | 'revoked';

/** What a partner may do with data received under a grant (ODRL-like; lib/exchange/usage-policy.ts). */
export interface UsagePolicy {
  /** Purposes the data may be used for (short words, e.g. "oversight", "statistics"). */
  purposes: string[];
  /** Days the partner may keep the data. */
  retentionDays: number;
  /** Whether the partner may pass the data on to a third party. */
  onwardSharing: boolean;
}

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
  /** Absent on grants made before usage policies: exchanges under them are refused until one is set. */
  policy?: UsagePolicy;
}

export type WebhookStatus = 'active' | 'paused' | 'disabled';

export interface WebhookSubscription {
  id: string;
  topic: string;
  url: string;
  status: WebhookStatus;
  failures: number;
  createdAt: ISODate;
  lastDeliveryAt?: ISODate;
  lastDeliveryDetail?: string;
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
  /** When it first became active (a ministry created active: its creation). Absent on records saved before it was kept. */
  activatedAt?: ISODate;
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
  /** When the case reached the institution; its age is counted from this. Absent on examples. */
  receivedAt?: ISODate;
  /** Where the case came from: an example of the platform, a loaded file, typed in, or a connected case system. Absent means example. */
  source?: 'sample' | 'imported' | 'entered' | 'feed';
  /** The connected case system (CaseFeed) that sent it; only that system updates it. */
  feedId?: string;
  /** The load (lib/data/case-import.ts) a case came in with. */
  importId?: string;
  /** When an official last assigned, escalated or closed it. */
  actedAt?: ISODate;
  /** Set when the nation's retention rule removed its details (lib/data/retention.ts). */
  anonymisedAt?: ISODate;
}
/** One load of real cases into an institution's queue (lib/data/case-import.ts). */
export interface CaseImport {
  id: string;
  ministryId: string;
  at: ISODate;
  by: string;
  fileName?: string;
  sha256: string;
  accepted: number;
  refused: number;
  removedSamples: number;
  withdrawnAt?: ISODate;
  withdrawnBy?: string;
  /** Cases removed by the withdrawal; cases already acted on stay. */
  withdrawn?: number;
}
export interface CaseRefusal { row: number; reference?: string; reason: string }
/** A ministry's case system connected to its queue (lib/data/case-import.ts). Only a hash of its key is kept. */
export interface CaseFeed {
  id: string;
  ministryId: string;
  name: string;
  prefix: string;
  issuedAt: ISODate;
  issuedBy: string;
  revokedAt?: ISODate;
  revokedBy?: string;
  lastCallAt?: ISODate;
  calls: number;
  lastResult?: { added: number; updated: number; unchanged: number; refused: number };
}
export interface CaseColumn { name: string; required: boolean; means: string; aliases: string[] }

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
  /** Where it is happening, recorded by a named official (lib/data/incident-places.ts). */
  place?: IncidentPlace;
  /** Earlier places, oldest first (a place is moved or cleared, never overwritten silently). */
  placeHistory?: IncidentPlace[];
}
/**
 * Where an incident is: a whole region, a point on the map (region and
 * district worked out from the map) or a registered site. A restricted site
 * lends only its generalised position.
 */
export interface IncidentPlace {
  how: 'region' | 'point' | 'site';
  region?: string;
  regionCode?: string;
  district?: string;
  districtCode?: string;
  lng?: number;
  lat?: number;
  /** For "site": the national facility register record. */
  facilityId?: string;
  facilityName?: string;
  /** The site's position was generalised (restricted category). */
  generalised?: boolean;
  /** How a point was captured (map pin, device location, typed coordinates…). */
  method?: string;
  by: string;
  at: ISODate;
  note?: string;
  /** Set on history entries: the place was cleared rather than moved. */
  cleared?: boolean;
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
  languages?: string[];     // further official languages (codes); public sites offer visitors each one
  seal?: string;            // short insignia monogram (e.g. national initials)
  accent?: string;          // sovereign theme accent (hex)
  motto?: string;           // formal national style / motto
  aiAssistant?: boolean;    // nation opted in to the AI assistant (false = off; unset = legacy on)
  /** Which model service the AI assistant uses (setup 1.6): the default provider, or the nation's own
   *  sovereign / on-premises model. Its key is never stored here (CIVICOS_AI_API_KEY). */
  aiAssistantModel?: AiAssistantModel;
  iso3?: string;            // ISO 3166-1 alpha-3 country code — drives the national map
  paymentRail?: string;     // the nation's domestic payment rail, e.g. "Mobile Money", "Instant Payments"
  timeZone?: string;        // IANA time zone of the capital, e.g. "Africa/Kampala"
  emergency?: { general?: string; police?: string; fire?: string; ambulance?: string }; // public emergency numbers
  foreignAffairs?: { partners?: { name: string; capital?: string }[]; memberships?: string[] }; // the nation's partners and international memberships
  regions?: string[];       // operational regions engines report by (from admin-1 or the nation's own grouping)
  constitution?: NationalConstitution; // the nation's own constitutional facts, over the form-of-state template
  map?: NationMapSettings;  // how the nation's maps are drawn (capital, projection); defaults from the map data
  domain?: string;          // the nation's own web domain (e.g. data.gov.ke); persistent identifiers of the twin are minted under it
}

/** The nation's own map settings. Anything left out falls back to the map data
 *  (capital from Natural Earth, projection chosen for the nation's shape). */
export interface NationMapSettings {
  /** The capital the maps mark; several countries have more than one, and only the nation chooses. */
  capital?: { name: string; lng: number; lat: number };
  /** The projection shaded maps use; 'auto' (or unset) picks one for the nation's shape. */
  projection?: 'auto' | 'conic-equal-area' | 'azimuthal-equal-area' | 'transverse-mercator' | 'albers-usa';
  /**
   * How disputed territory is drawn (lib/map/disputed.ts): 'neutral' (or
   * unset) draws every disputed area as disputed; a Natural Earth point-of-view
   * code (e.g. 'IN', 'US', 'UN') draws areas as that view does. Only the
   * nation chooses; the platform never takes a side.
   */
  worldview?: string;
}

/** A nation's own constitutional facts. Anything left out falls back to the
 *  template for its form of state (lib/gov/constitution.ts). */
export interface NationalConstitution {
  headOfStateTitle?: string;
  /** Official seat of the executive, e.g. "State House". */
  executiveSeat?: string;
  /** Chambers in order: the primary/lower chamber first, then any upper chamber. */
  chambers?: { name: string; seats: number; role?: string }[];
  judicialApex?: string;
  judicialTiers?: string[];
  emergencyDoctrine?: string;
  /** Where these facts come from, e.g. "Constitution of 1995, arts. 77–78". */
  source?: string;
}

/** First-run platform setup. Null until a nation or ministry has completed
 *  onboarding; once set, sign-in goes straight to the welcome page. */
export interface PlatformSetup {
  completedAt: ISODate;
  by: string;
  stateName: string;
}

export interface ProtocolOffice {
  rank: number;
  office: string;   // e.g. "Head of State"
  holder: string;   // title that fills it for this sovereign
}
export interface SovereignIdentity {
  stateName: string;
  seal: string;
  accent: string;
  motto: string;
  locale: string;
  dir: 'ltr' | 'rtl';
  protocol: ProtocolOffice[];
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

// ── National coordination intelligence (Phase 2A) ────────────────────
// Read-only coordination fabric: surfaces cross-ministry dependency,
// cascade risk and a national operations timeline so humans coordinate.
// No autonomous action, no forecasting — derived from current real
// operational state only.
export interface CoordinationNode {
  ministryId: string;
  ministry: string;
  archetype: ArchetypeKey;
  riskScore: number;            // 0..100 composite from live ops data
  posture: OpsTone;
  activeIncidents: number;
  topSeverity: IncidentSeverity | null;
  queueDepth: number;
  slaBreaching: boolean;
}
export interface CoordinationEdge {
  fromId: string;
  toId: string;
  from: string;
  to: string;
  relation: string;             // supplies / funds / secures / staffs …
  propagatedRisk: number;       // 0..100 risk transmitted along dependency
}
export interface OpsTimelineEvent {
  at: ISODate;
  ministryId?: string;
  ministry?: string;
  kind: 'incident' | 'escalation' | 'sla' | 'sovereign' | 'audit';
  tone: OpsTone;
  title: string;
  detail?: string;
}
export interface CoordinationPinned {
  ministryId: string;
  ministry: string;
  label: string;
  severity: IncidentSeverity;
  authority: string;
  affects: string[];            // dependent ministries in scope
}
// Live sovereign data fabric — a deterministic, time-stepped operational
// pressure model. Pure function of (sovereign, institution, tick) plus
// dependency propagation, so it is replayable and instance-stable.
export interface FabricPressure {
  ministryId: string;
  ministry: string;
  archetype: ArchetypeKey;
  pressure: number;             // 0..100 living composite
  trend: 'rising' | 'falling' | 'steady';
  drivers: string[];            // human-readable pressure sources
}
export interface ChronologyEvent {
  tick: number;
  at: ISODate;
  ministryId?: string;
  ministry?: string;
  kind: 'incident' | 'recovery' | 'propagation' | 'degradation' | 'escalation';
  tone: OpsTone;
  title: string;
  detail: string;
}
export interface NationalCoordination {
  sovereign: SovereignProfile;
  generatedAt: ISODate;
  tick: number;
  tickMs: number;
  posture: {
    level: OpsTone;
    label: string;              // STABLE | STRAINED | CRITICAL
    nationalRisk: number;       // 0..100
    coordinatingMinistries: number;
    cascadeRisks: number;       // dependency edges over threshold
  };
  nodes: CoordinationNode[];
  edges: CoordinationEdge[];
  fabric: FabricPressure[];
  chronology: ChronologyEvent[];
  timeline: OpsTimelineEvent[];
  pinnedIncidents: CoordinationPinned[];
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

// ── Sovereign presets + national executive snapshot ──────────────────
export interface SovereignPreset {
  key: string;
  label: string;
  profile: SovereignProfile;
}
export interface NationalIndicator {
  label: string;
  value: string;
  unit: string;
  /** What kind of figure it is (lib/twin/signal.ts); screens mark anything not observed or reported. */
  kind?: import('@/lib/twin/signal').SignalKind;
  /** Where it comes from, in words. */
  source?: string;
}
export interface CrossMinistryIncident {
  ministryId: string;
  ministry: string;
  archetype: ArchetypeKey;
  label: string;
  severity: IncidentSeverity;
  authority: string; // current escalation tier name
  key?: string;
  place?: IncidentPlace;
}
export interface NationalSnapshot {
  sovereign: SovereignProfile;
  generatedAt: ISODate;
  classification: string; // e.g. "OFFICIAL"
  environment: string;    // e.g. "Production"
  indicators: NationalIndicator[];
  crossMinistryIncidents: CrossMinistryIncident[];
  totals: {
    institutions: number;
    activeMinistries: number;
    activeIncidents: number;
    queuesBreaching: number;
    auditIntact: boolean;
  };
}

// ── Sovereign Update Center (release distribution to nations) ─────────
// The platform pipeline above (Release → Deployment) builds and promotes a
// version. Distribution is the layer after it: a promoted version is
// published to nations as a global release, or a build is made for one
// nation from its own feature requests. Nothing installs itself: each
// nation's administrators approve, schedule or download, and record the
// install themselves.
export type DistributionChannel = 'global' | 'nation';
export type ReleaseSeverity = 'security' | 'critical' | 'feature' | 'maintenance';
/** How a nation runs the platform: hosted for it, on its own infrastructure, or disconnected. */
export type DeliveryMode = 'saas' | 'self-hosted' | 'air-gapped';
export type ArtifactKind =
  | 'container-image' | 'helm-chart' | 'source-tarball' | 'binary-tarball'
  | 'offline-bundle' | 'migration-kit' | 'mobile-android' | 'mobile-ios'
  | 'desktop-console' | 'sbom-cyclonedx' | 'sbom-spdx' | 'documentation'
  | 'install-kit' | 'restore-kit';

export interface ArtifactSignature {
  method: 'cosign' | 'gpg';
  /** Fingerprint of the publisher key that signed it. */
  keyFingerprint: string;
  /** Detached signature file name, where the method uses one. */
  signatureFile?: string;
}
export interface ReleaseArtifact {
  id: string;
  kind: ArtifactKind;
  label: string;
  /** Delivery mode this artifact serves; 'any' for SBOMs, documentation and client apps. */
  mode: DeliveryMode | 'any';
  filename: string;
  /** OCI reference for images and charts (pinned by digest). */
  ref?: string;
  platform?: string;
  sha256: string;
  sizeBytes: number;
  signature: ArtifactSignature;
  /** Always true in this build: the link serves a manifest, not a real binary. */
  placeholder: true;
}

export type ChangeKind = 'feature' | 'fix' | 'security' | 'breaking' | 'deprecation';
export interface ReleaseChange { kind: ChangeKind; text: string; ref?: string }
export interface ReleaseMigration {
  id: string;
  kind: 'database' | 'configuration' | 'data';
  description: string;
  reversible: boolean;
  estimatedMinutes: number;
  /** Expand/contract keeps the previous release working on the new schema,
   *  so a fallback is clean; in-place changes rely on the restore point. */
  pattern?: 'expand' | 'contract' | 'in-place';
}

export interface DistributionRelease {
  id: string;
  version: string;
  channel: DistributionChannel;
  /** Set only for nation-specific builds: the one nation that can see it. */
  nationId?: string;
  /** Nation builds are made on top of a global version. */
  baseVersion?: string;
  title: string;
  summary: string;
  severity: ReleaseSeverity;
  recommended: boolean;
  releasedAt: ISODate;
  /** Oldest installed version this release can be applied over directly. */
  minCompatibleVersion: string;
  changes: ReleaseChange[];
  migrations: ReleaseMigration[];
  breakingChanges: string[];
  upgradeNotes: string;
  rollbackNotes: string;
  supportUntil: ISODate;
  delivery: DeliveryMode[];
  artifacts: ReleaseArtifact[];
  /** Feature requests this build delivers (nation builds only). */
  deliversRequests: string[];
  /** The platform pipeline release this was promoted from, if any. */
  platformReleaseId?: string;
  publishedBy: string;
  /** Staged rollout: pilot-ring nations first, then general availability. */
  rollout: RolloutRing;
  /** Its migrations leave the previous release working on the new schema
   *  (expand/contract), so the software can be switched back automatically
   *  without touching data. False forces "ask before falling back". */
  compatibleWithPrevious: boolean;
  /** Publisher safety: a halted or withdrawn release cannot be newly approved or installed. */
  status: ReleaseStatus;
  statusReason?: string;
  statusAt?: ISODate;
}
export type RolloutRing = 'pilot' | 'general';
export type ReleaseStatus = 'active' | 'halted' | 'withdrawn';

/** 'probation': installed and being health-checked; 'fallen-back': the
 *  system restored the last known good release after probation failed. */
export type InstallState = 'available' | 'approved' | 'scheduled' | 'probation' | 'installed' | 'skipped' | 'rolled-back' | 'fallen-back';
/** 'prepare' takes the restore point; 'fallback' and 'keep' answer a failed
 *  probation when the nation asked to decide before falling back. */
export type InstallAction = 'approve' | 'schedule' | 'unschedule' | 'prepare' | 'install' | 'skip' | 'reconsider' | 'rollback' | 'fallback' | 'keep' | 'cancel-proposal';
export interface MaintenanceWindow { start: ISODate; end: ISODate }
export interface InstallEvent {
  at: ISODate;
  by: string;
  action: InstallAction;
  from: InstallState;
  to: InstallState;
  note?: string;
  window?: MaintenanceWindow;
  mode?: DeliveryMode;
  /** Sequence number of the audit-chain entry that records this decision. */
  auditSeq?: number;
}
export interface NationInstall {
  releaseId: string;
  state: InstallState;
  mode?: DeliveryMode;
  window?: MaintenanceWindow;
  events: InstallEvent[];
  /** Taken before the install; required for it. */
  restorePoint?: RestorePoint;
  probation?: Probation;
  /** Four-eyes: a production approve or install proposed by one official, awaiting a second. */
  pending?: { action: 'approve' | 'install'; by: string; at: ISODate; mode?: DeliveryMode; verified?: boolean; note?: string };
}

// ── Resilience: restore points, probation and fallback ───────────────
export interface RestorePoint {
  id: string;
  /** The version the snapshot protects (the release running when it was taken). */
  version: string;
  releaseId?: string;
  createdAt: ISODate;
  createdBy: string;
  sizeBytes: number;
  verified: boolean;
  /** Database snapshot, configuration, the previous release's artifacts. */
  contents: string[];
  /** What restoring it gives back and what is lost (irreversible migrations). */
  restoreNotes: string[];
  restoredAt?: ISODate;
}
export type HealthCheckKey =
  | 'readiness' | 'liveness' | 'error-rate' | 'latency' | 'audit-chain'
  | 'smoke-sign-in' | 'smoke-wallet' | 'smoke-payments' | 'smoke-registry';
export interface HealthCheck {
  key: HealthCheckKey;
  ok: boolean;
  /** error-rate in %, latency in ms. */
  value?: number;
  detail?: string;
}
export interface HealthReport {
  at: ISODate;
  source: 'agent' | 'simulated' | 'silence';
  checks: HealthCheck[];
  ok: boolean;
}
export type ProbationState = 'running' | 'passed' | 'failed' | 'awaiting-decision' | 'kept' | 'ended';
export interface Probation {
  releaseId: string;
  version: string;
  /** The last known good release this install replaced, and the restore point protecting it. */
  lkgVersion: string;
  lkgReleaseId?: string;
  restorePointId: string;
  startedAt: ISODate;
  endsAt: ISODate;
  minutes: number;
  state: ProbationState;
  baseline: { errorRatePct: number; latencyMs: number };
  /** A report is bad when a critical check fails or a threshold is breached; a
   *  missed report interval counts as bad too. Fallback needs
   *  `consecutiveFailures` bad reports in a row, or two independent critical
   *  checks failing in one report (confirmed). */
  thresholds: { errorRatePct: number; latencyMs: number; consecutiveFailures: number; silenceMinutes: number };
  reports: HealthReport[];
  failedChecks: HealthCheckKey[];
  /** Consecutive bad or missing reports. Above zero the release is "degraded — watching". */
  failStreak: number;
  degraded: boolean;
  concludedAt?: ISODate;
  incidentId?: string;
}
export type FallbackTrigger = 'automatic' | 'approved' | 'break-glass';
export interface FallbackIncident {
  id: string;
  nationId: string;
  releaseId?: string;
  fromVersion: string;
  toVersion: string;
  restorePointId?: string;
  trigger: FallbackTrigger;
  /** Awaiting a decision when the nation asked to decide before falling back. */
  state: 'awaiting-decision' | 'restored' | 'kept';
  /** Fallback switches software only. Restoring the data snapshot is a separate, deliberate decision. */
  dataRestored?: { at: ISODate; by: string; snapshotAt: ISODate };
  failedChecks: HealthCheckKey[];
  timeline: { at: ISODate; text: string }[];
  openedAt: ISODate;
  acknowledgedAt?: ISODate;
  acknowledgedBy?: string;
  auditSeq?: number;
}
export interface ResilienceSettings {
  probationMinutes: number;
  /** Automatic restores the last known good release on failure; ask waits for a decision. */
  fallback: 'automatic' | 'ask';
  /** Who reports health: the in-store simulation (prototype) or the nation's deployment agent. */
  healthSource: 'simulated' | 'agent';
  ring: RolloutRing;
  /** Security definitions are data: applied automatically by default. */
  definitionsPolicy: 'automatic' | 'manual';
  /** A production install needs the same release to pass staging probation and a UAT sign-off (default on). */
  stagingRequired: boolean;
}

export interface SubscribedNation {
  id: string;
  name: string;
  iso3?: string;
  deliveryMode: DeliveryMode;
  /** Private distribution link key: the nation's own feed and downloads. */
  channelKey: string;
  installedVersion: string;
  installedReleaseId?: string;
  /** Versions this nation ran before, most recent last (rollback target). */
  history: { version: string; releaseId?: string; at: ISODate }[];
  enrolledAt: ISODate;
  /** True for the nation this installation belongs to. */
  home?: boolean;
  /** Last known good: the release that most recently passed probation. */
  lkg?: { version: string; releaseId?: string };
  /** The nation's language for release communication (the installed nation uses its setup language). */
  language?: string;
  /** Deployment-agent credential metadata (the secret itself is shown once and never stored). */
  agentCredential?: { prefix: string; issuedAt: ISODate; issuedBy: string; rotations: number };
  settings: ResilienceSettings;
  /** Currency the nation is invoiced in, and the contract rate from the reference price list. */
  currency?: string;
  contractRate?: number;
  estate: { servers: number; endpoints: number };
}

export type FeatureRequestStage =
  | 'requested' | 'under-review' | 'scoped' | 'in-development' | 'ready' | 'delivered' | 'declined';
export type FeatureRequestPriority = 'low' | 'normal' | 'high' | 'urgent';
export interface FeatureRequest {
  id: string;
  nationId: string;
  title: string;
  description: string;
  priority: FeatureRequestPriority;
  institution: string;
  stage: FeatureRequestStage;
  submittedAt: ISODate;
  submittedBy: string;
  targetVersion?: string;
  deliveredIn?: string;
  history: { at: ISODate; by: string; from: FeatureRequestStage | null; to: FeatureRequestStage; note?: string }[];
}

/** A release as one nation sees it: its own decision state and fit. */
export interface ChamberRelease extends DistributionRelease {
  install: NationInstall;
  /** Newer than what the nation runs. */
  newer: boolean;
  /** Can be applied directly over the installed version. */
  compatible: boolean;
  /** Installed earlier and since replaced by a newer install. */
  superseded: boolean;
  /** Not installable because the publisher halted or withdrew it. */
  blocked: boolean;
}
export interface PublisherKey { fingerprint: string; cosignKey: string; gpgKey: string; demo: true }
export interface UpdateChamber {
  nation: SubscribedNation;
  installed: string;
  latest: string;
  releases: ChamberRelease[];
  /** Release ids, in order, that take the installed version to the latest. */
  upgradePath: string[];
  requests: FeatureRequest[];
  publisherKey: PublisherKey;
  /** The install currently in probation, if any. */
  probation?: Probation;
  incidents: FallbackIncident[];
  /** Halted or withdrawn releases this nation runs: falling back is advised. */
  advisories: { releaseId: string; version: string; status: ReleaseStatus; reason?: string }[];
  security: SecurityGate;
  changeControl: ChangeControl;
  /** Set when the installed release line nears (or has passed) its end of life. */
  lifecycle?: LifecycleWarning;
}
/** Advisory only: security coverage never blocks an update. */
export interface SecurityGate {
  mode: 'subscription' | 'byo' | 'none';
  /** The platform estate is covered (Endpoint/EDR licence or estate-wide BYO with a fresh scan). */
  platformCovered: boolean;
  /** The nation's own software is covered (any BYO or platform licence). */
  nationSoftwareCovered: boolean;
  reason: string;
}
export interface ReleaseHealthStats { installs: number; probations: number; passed: number; fallbacks: number; failureRate: number }
export interface PublisherOverview {
  nations: (SubscribedNation & { openRequests: number; available: number; securityPending: number })[];
  releases: (DistributionRelease & { stats: ReleaseHealthStats })[];
  incidents: (FallbackIncident & { nationName: string })[];
  requests: FeatureRequest[];
  /** nationId → releaseId → state, for the install matrix. */
  installs: Record<string, Record<string, InstallState>>;
  /** Stable platform-pipeline releases not yet published to nations. */
  promotable: { id: string; version: string; notes: string }[];
  publisherKey: PublisherKey;
}

// ── Security store: platform security software (paid) and bring-your-own ──
/** Server-side protection. 'endpoint' (officers' desktops) is BYO-only: the store does not sell desktop antivirus. */
export type SecurityCategory = 'vulnerability' | 'container' | 'edr' | 'mdr' | 'waf' | 'siem' | 'backup' | 'endpoint';
export interface SecurityEdition {
  key: string;
  name: string;
  features: string[];
  /** Annual price per unit in the publisher's reference currency (major units). */
  unitPriceRef: number;
}
export interface SecurityProduct {
  id: string;
  category: SecurityCategory;
  name: string;
  vendor: string;
  /** Vendor certified by the publisher (placeholder names in this build). */
  certified: boolean;
  /** 'included': free and always on for every nation; 'paid': advanced tools licensed per unit. See StorePolicy. */
  tier: 'included' | 'paid';
  /** What the publisher tested before certifying the product, and against which platform versions. */
  certification: { tested: string[]; platformVersions: string; certifiedAt: ISODate; notes: string };
  summary: string;
  unit: 'server' | 'endpoint';
  platforms: string[];
  editions: SecurityEdition[];
  latestVersion: string;
  /** Vendor-neutral placeholder product: no real software is distributed. */
  placeholder: true;
}
export type OrderStage = 'quote' | 'ordered' | 'invoiced' | 'active' | 'expired' | 'cancelled';
export interface SecurityOrder {
  id: string;
  nationId: string;
  productId: string;
  edition: string;
  seats: number;
  years: number;
  currency: string;
  unitPrice: number;
  total: number;
  stage: OrderStage;
  quotedAt: ISODate;
  validUntil: ISODate;
  poNumber?: string;
  invoice?: { id: string; issuedAt: ISODate; dueAt: ISODate; amount: number };
  /** 'transfer': government procurement (purchase order, invoice, bank transfer with a reference); 'instant': paid at once on the nation's rail; 'included': no charge. */
  payment?: { receiptId: string; rail: string; method: 'transfer' | 'instant' | 'included'; reference?: string; paidAt: ISODate; hash: string };
  licence?: { key: string; issuedAt: ISODate; expiresAt: ISODate; seats: number };
  /** Security software version the nation runs; upgrading it is the nation's decision. */
  installedVersion?: string;
  renewalOf?: string;
  history: { at: ISODate; by: string; from: OrderStage | null; to: OrderStage; note?: string; auditSeq?: number }[];
}
export interface ByoSecurityTool {
  id: string;
  nationId: string;
  product: string;
  vendor: string;
  version: string;
  category: SecurityCategory;
  coverage: { servers: number; endpoints: number };
  lastScanAt: ISODate;
  attestation: string;
  attestedBy: string;
  /** 'estate' covers the whole installation (accepted for platform releases); 'nation-software' only the nation's own software. */
  scope: 'estate' | 'nation-software';
  registeredAt: ISODate;
}
export interface NationSoftware {
  id: string;
  nationId: string;
  name: string;
  version: string;
  kind: 'module' | 'integration' | 'build';
  registeredAt: ISODate;
  registeredBy: string;
  securedBy: 'subscription' | 'byo';
  securedByRef: string;
}
export interface SecurityDefinitions {
  installed: string;
  installedAt: ISODate;
  latest: string;
  latestAt: ISODate;
  policy: 'automatic' | 'manual';
  /** Automatic updates run only while some protection is active. */
  automaticActive: boolean;
}
export interface SecurityPosture {
  grade: 'A' | 'B' | 'C' | 'D' | 'E';
  score: number;
  coverage: { servers: { covered: number; total: number }; endpoints: { covered: number; total: number } };
  definitionsAgeHours: number;
  lastScanAt?: ISODate;
  advisories: { releaseId: string; version: string; title: string }[];
  gate: SecurityGate;
  findings: string[];
}
/** The store's business model, held as configuration (decided by the owner; see `decision`). */
export interface StorePolicy {
  /** 'free': the baseline is included and always on for every nation (decided); 'with-paid-tier' / 'paid' remain configurable. */
  includedTier: 'free' | 'with-paid-tier' | 'paid';
  /** The catalogue lists certified third-party vendors only (decided). */
  certifiedVendorsOnly: boolean;
  /** Payment routes offered: government procurement and instant payment (both kept). */
  paths: ('procurement' | 'instant')[];
  decision: string;
}
export interface SecurityCenter {
  nation: SubscribedNation;
  policy: StorePolicy;
  /** Always-on protection every nation has, paid or not. */
  baseline: { products: string[]; covers: string[]; active: boolean; lastScanAt?: ISODate };
  currency: string;
  /** False until a contract rate is set: quotes stay in the reference currency. */
  localPricing: boolean;
  referenceCurrency: string;
  catalogue: (SecurityProduct & { prices: Record<string, number> })[];
  orders: SecurityOrder[];
  byo: ByoSecurityTool[];
  software: NationSoftware[];
  definitions: SecurityDefinitions;
  posture: SecurityPosture;
}

// ── Update Center: hosting & deployment paths ─────────────────────────
// Four ways to run the platform, each assessed from a questionnaire with a
// documented cost model (lib/updates/hosting-model.ts). Every figure is an
// estimate until the publisher's engineering review issues an assessment.
export type HostingPath = 'sovereign-dc' | 'other-cloud' | 'hosted' | 'perpetual';
export type CloudKind = 'public-hyperscaler' | 'regional-sovereign' | 'private-cloud';
export interface HostingQuestionnaire {
  population: number;
  activeUsers: number;
  institutions: number;
  services: number;
  residency: 'in-country' | 'regional' | 'none';
  legalConstraints: string;
  /** Target availability, e.g. 99.9. */
  availability: number;
  rtoHours: number;
  rpoMinutes: number;
  existingFacility: 'none' | 'partial' | 'tier3-ready';
  power: 'reliable' | 'unstable';
  connectivity: 'redundant-fibre' | 'single-link' | 'limited';
  itStaff: number;
  // Another cloud
  cloudKind?: CloudKind;
  cloudRegionInCountry?: boolean;
  capabilities?: { kubernetes: boolean; managedPostgres: boolean; objectStorage: boolean; kms: boolean };
  // Our hosted cloud
  plan?: 'standard' | 'enterprise' | 'sovereign-dedicated';
  term?: 1 | 5;
  // Buy outright
  support?: boolean;
  updates?: boolean;
}
export interface CostLine { label: string; amount: number; basis: string }
export interface TimelinePhase { phase: string; minWeeks: number; maxWeeks: number; detail: string }
export interface HostingEstimate {
  path: HostingPath;
  modelVersion: string;
  /** Amounts are in this currency (the nation's, once a contract rate exists). */
  currency: string;
  computedAt: ISODate;
  sizing?: { vcpu: number; ramGb: number; storageTb: number; bandwidthGbps: number; nodes: number; racks: number; sites: string[]; tier: string };
  timeline: TimelinePhase[];
  totalWeeks: { min: number; max: number };
  capex: CostLine[];
  capexTotal: number;
  annual: CostLine[];
  annualTotal: number;
  fiveYearTotal: number;
  compatibility?: { item: string; status: 'ready' | 'needs-work' | 'missing'; note: string }[];
  residencyFit?: { fits: boolean; note: string };
  landingZone?: string[];
  subscription?: { plan: string; term: 1 | 5; annual: number; termTotal: number; discountPct: number; includes: string[] };
  licence?: { perpetual: number; supportAnnual: number; updatesAnnual: number; independent: string };
  staffing?: { role: string; count: number; note: string }[];
  risks: string[];
  prerequisites: string[];
  assumptions: string[];
  migration?: { from: HostingPath; steps: string[]; guarantees: string[] };
  /** Engineering-review adjustments applied (issued assessments only). */
  adjustments?: { capexFactor: number; annualFactor: number; timelineFactor: number };
}
export type HostingStage = 'preliminary' | 'in-review' | 'issued' | 'revision-requested' | 'accepted' | 'withdrawn';
export interface HostingAssessment {
  version: number;
  issuedAt: ISODate;
  issuedBy: string;
  notes: string;
  estimate: HostingEstimate;
}
export interface HostingRequest {
  id: string;
  nationId: string;
  path: HostingPath;
  /** The path the nation runs today, for the migration plan. */
  currentPath?: HostingPath;
  questionnaire: HostingQuestionnaire;
  stage: HostingStage;
  submittedAt: ISODate;
  submittedBy: string;
  preliminary: HostingEstimate;
  assessments: HostingAssessment[];
  decision?: { at: ISODate; by: string; version: number; note?: string };
  history: { at: ISODate; by: string; from: HostingStage | null; to: HostingStage; note?: string; auditSeq?: number }[];
}
export interface HostingCenter {
  nation: SubscribedNation;
  currentPath?: HostingPath;
  currency: string;
  localPricing: boolean;
  /** Contract rate from the reference currency, for live client-side estimates. */
  rate: number;
  /** Indicative figures for all four paths from the nation's latest (or default) answers. */
  comparison: Record<HostingPath, HostingEstimate>;
  basis: HostingQuestionnaire;
  requests: HostingRequest[];
  model: { version: string; unitCosts: { label: string; value: string }[] };
}

// ── Update Center: preflight compatibility and staging ────────────────
export type PreflightStatus = 'compatible' | 'needs-change' | 'blocking';
export interface PreflightFinding {
  key: string;
  subject: string;
  kind: 'module' | 'integration' | 'build' | 'configuration' | 'institution';
  status: PreflightStatus;
  reason: string;
  /** A blocking finding waived by two named officials. */
  waiver?: { by: string; secondBy: string; reason: string; at: ISODate };
}
export interface PreflightReport {
  nationId: string;
  releaseId: string;
  version: string;
  runAt: ISODate;
  runBy: string;
  findings: PreflightFinding[];
  summary: { compatible: number; needsChange: number; blocking: number; waived: number };
  /** No blocking finding is left unwaived. */
  approvable: boolean;
}
export interface StagingRun {
  releaseId: string;
  version: string;
  state: 'probation' | 'passed' | 'failed';
  startedAt: ISODate;
  endsAt: ISODate;
  startedBy: string;
  passedAt?: ISODate;
  failedReason?: string;
  uat?: { tester: string; date: ISODate; evidence: string; signedAt: ISODate };
}
export interface StagingEnvironment {
  nationId: string;
  name: string;
  url?: string;
  provisioned: boolean;
  /** Hosted nations get staging provisioned by the publisher. */
  provisionedBy?: 'publisher' | 'nation';
  runs: StagingRun[];
}

// ── Update Center: change control ─────────────────────────────────────
export interface Blackout { id: string; label: string; kind: 'election' | 'budget' | 'emergency' | 'other'; start: ISODate; end: ISODate; by: string; at: ISODate }
/** A preferred weekly maintenance window, in the nation's local time. */
export interface MaintenanceSlot { day: number; start: string; hours: number }
export interface ChangeControl {
  nationId: string;
  windows: MaintenanceSlot[];
  blackouts: Blackout[];
  /** Blocks new installs except security and critical releases (which still need four-eyes). */
  freeze?: { on: boolean; by: string; at: ISODate; reason: string };
  fourEyes: true;
}

// ── Update Center: security advisories (CSAF/VEX-style) ───────────────
export type AdvisorySeverity = 'critical' | 'high' | 'medium' | 'low';
export interface SecurityAdvisory {
  id: string;
  title: string;
  summary: string;
  severity: AdvisorySeverity;
  /** CVSS v3.1 base score and vector. */
  cvss: number;
  cvssVector: string;
  cwe?: string;
  /** Affected versions: from `affectedFrom` up to (not including) `affectedBefore`, or all later versions if absent. */
  affectedFrom: string;
  affectedBefore?: string;
  fixedIn?: string;
  /** final: fix available; interim: still under investigation. */
  status: 'final' | 'interim';
  publishedAt: ISODate;
  updatedAt: ISODate;
  /** Raised from the platform's own dependency audit (scripts/audit-deps.mjs), not written by hand. */
  dependency?: { ghsa: string; package: string; vulnerable?: string; patched?: string; accepted?: { reason: string; reviewBy: string }; resolvedAt?: ISODate };
}
export type AdvisoryNationStatus = 'affected' | 'not-affected' | 'fixed' | 'under-investigation';
export interface AdvisoryExposure {
  advisory: SecurityAdvisory;
  status: AdvisoryNationStatus;
  /** VEX justification when the publisher states this nation is not affected. */
  justification?: string;
  /** The release that fixes it, as this nation sees it. */
  fixReleaseId?: string;
}
export interface PatchCommitment {
  advisoryId: string;
  severity: AdvisorySeverity;
  committedHours: number;
  dueAt: ISODate;
  fixedAt?: ISODate;
  state: 'met' | 'breached' | 'open';
  hoursLeft?: number;
}

// ── Update Center: support desk and service levels ────────────────────
export type SupportTier = 'standard' | 'enterprise' | 'sovereign';
export type TicketPriority = 'P1' | 'P2' | 'P3' | 'P4';
export type TicketState = 'open' | 'acknowledged' | 'in-progress' | 'waiting-on-nation' | 'resolved' | 'closed';
export interface SlaTarget { responseMinutes: number; resolutionHours: number }
export interface SupportTierPolicy {
  tier: SupportTier;
  label: string;
  /** When the desk answers, e.g. 24×7 or business hours. */
  coverage: string;
  /** Monthly availability target for hosted services, percent. */
  uptimeTarget: number;
  targets: Record<TicketPriority, SlaTarget>;
  /** Service credit when the monthly uptime target is missed, percent of the monthly fee (placeholder). */
  creditPct: number;
}
export interface TicketMessage { at: ISODate; by: string; side: 'nation' | 'publisher' | 'system'; text: string }
export interface SupportTicket {
  id: string;
  nationId: string;
  priority: TicketPriority;
  title: string;
  description: string;
  /** The release or fallback incident the ticket is about. */
  link?: { kind: 'release' | 'incident'; id: string };
  source: 'nation' | 'fallback-incident';
  state: TicketState;
  /** Contract tier at the time the ticket was opened: its targets apply. */
  tier: SupportTier;
  openedAt: ISODate;
  openedBy: string;
  firstResponseAt?: ISODate;
  resolvedAt?: ISODate;
  closedAt?: ISODate;
  /** The resolution clock pauses while the publisher waits on the nation. */
  waitingSince?: ISODate;
  pausedMinutes: number;
  thread: TicketMessage[];
}
export interface SlaClock { dueAt: ISODate; state: 'running' | 'met' | 'breached' | 'paused'; minutesLeft?: number }
export interface TicketView extends SupportTicket { sla: { response: SlaClock; resolution: SlaClock }; nationName?: string }
export type ServiceImpact = 'operational' | 'degraded' | 'partial-outage' | 'major-outage' | 'maintenance';
export interface ServiceIncident {
  id: string;
  title: string;
  impact: Exclude<ServiceImpact, 'operational'>;
  components: string[];
  /** Which nations it affects: every nation, or the ones listed. */
  nations: 'all' | string[];
  startedAt: ISODate;
  resolvedAt?: ISODate;
  /** Planned maintenance (announced ahead; excluded from availability). */
  scheduled?: { start: ISODate; end: ISODate };
  updates: { at: ISODate; state: 'investigating' | 'identified' | 'monitoring' | 'resolved' | 'scheduled' | 'in-progress' | 'completed'; text: string; by: string }[];
}
export interface StatusComponent { key: string; label: string; group: 'publisher' | 'hosted' | 'installation'; status: ServiceImpact; uptime90?: number; days?: { date: string; impact: ServiceImpact }[]; detail?: string }
export interface StatusPage {
  nation: { id: string; name: string; deliveryMode: DeliveryMode };
  generatedAt: ISODate;
  overall: ServiceImpact;
  components: StatusComponent[];
  active: ServiceIncident[];
  recent: ServiceIncident[];
  fallbackIncidents: FallbackIncident[];
  maintenance: { upcoming: { title: string; start: ISODate; end: ISODate; kind: 'install' | 'publisher' }[]; windows: MaintenanceSlot[]; blackouts: Blackout[] };
}
export interface SlaReport {
  nationId: string;
  nationName: string;
  month: string;
  generatedAt: ISODate;
  tier: SupportTierPolicy;
  /** Hosted (or publisher) services counted for availability; planned maintenance excluded. */
  uptime: { key: string; label: string; uptime: number; downtimeMinutes: number }[];
  serviceUptime: number;
  uptimeMet: boolean;
  creditPct: number;
  incidents: { id: string; title: string; kind: 'service' | 'fallback'; impact: string; startedAt: ISODate; resolvedAt?: ISODate; minutes?: number }[];
  tickets: {
    opened: number;
    byPriority: Record<TicketPriority, { opened: number; responseMet: number; responseBreached: number; resolutionMet: number; resolutionBreached: number; open: number }>;
    responsePct: number | null;
    resolutionPct: number | null;
  };
}

// ── Update Center: supply-chain proof, source-code escrow, source audits ─
export interface ProvenanceSummary {
  artifactId: string;
  filename: string;
  kind: ArtifactKind;
  label: string;
  /** The in-toto subject: what the attestation is about. */
  subject: { name: string; digest: { sha256: string } };
  builder: { id: string; version: string };
  buildType: string;
  source: { uri: string; tag: string; commit: string };
  startedOn: ISODate;
  finishedOn: ISODate;
  /** Inputs to the build, each pinned by digest. */
  materials: { uri: string; digest: Record<string, string> }[];
  slsaLevel: string;
  verify: string[];
}
export interface EscrowDeposit {
  id: string;
  releaseId: string;
  version: string;
  /** Set for builds made for one nation. */
  nationId?: string;
  agent: string;
  depositedAt: ISODate;
  depositedBy: string;
  /** SHA-256 of the deposit's contents manifest. */
  contentsHash: string;
  contents: string[];
  sourceCommit: string;
  verifiedAt?: ISODate;
  verifiedBy?: string;
}
export type EscrowReleaseCondition = 'insolvency' | 'end-of-support' | 'material-breach';
export interface EscrowAgreement {
  nationId: string;
  agent: string;
  agreementRef: string;
  effectiveFrom: ISODate;
  covers: string;
  depositWithinDays: number;
  verification: string;
  releaseConditions: { key: EscrowReleaseCondition; label: string; detail: string }[];
  invocation: string[];
  placeholder: true;
}
export interface EscrowStatusRow {
  releaseId: string;
  version: string;
  title: string;
  releasedAt: ISODate;
  state: 'verified' | 'deposited' | 'pending' | 'overdue';
  dueBy: ISODate;
  installed: boolean;
  deposit?: EscrowDeposit;
}
export type SourceReviewStage = 'requested' | 'scoping' | 'approved' | 'in-progress' | 'completed' | 'declined' | 'withdrawn';
export type SourceReviewEnvironment = 'escrow-agent' | 'reading-room' | 'offline-copy';
export interface SourceReview {
  id: string;
  nationId: string;
  releaseId: string;
  version: string;
  auditor: string;
  auditorKind: 'national-cert' | 'independent-firm' | 'academic' | 'government-team';
  scope: string;
  purpose: string;
  environment: SourceReviewEnvironment;
  ndaAccepted: true;
  stage: SourceReviewStage;
  requestedAt: ISODate;
  requestedBy: string;
  schedule?: { start: ISODate; end: ISODate };
  findings?: { summary: string; critical: number; high: number; medium: number; low: number; reportRef: string };
  history: { at: ISODate; by: string; from: SourceReviewStage | null; to: SourceReviewStage; note?: string }[];
}

// ── Update Center: support lifecycle ──────────────────────────────────
export type LifecycleKind = 'lts' | 'standard';
export type LifecyclePhase = 'active' | 'security-only' | 'end-of-life';
export interface LifecyclePolicy {
  /** Months of full support (features and fixes) from a line's first release, then months of security fixes only. */
  standard: { activeMonths: number; securityMonths: number };
  lts: { activeMonths: number; securityMonths: number };
  /** Months before end of life at which notices go out. */
  noticeMonths: number[];
  /** Release lines (major.minor) designated long-term support. */
  ltsLines: string[];
  updatedAt?: ISODate;
  updatedBy?: string;
}
export interface LifecycleLine {
  line: string;
  kind: LifecycleKind;
  gaAt: ISODate;
  activeUntil: ISODate;
  endOfLife: ISODate;
  phase: LifecyclePhase;
  latestVersion: string;
  /** Notices whose time has come (12, 6, 3 months before end of life). */
  notices: { months: number; dueAt: ISODate; issuedAt?: ISODate }[];
}
export interface LifecycleWarning {
  line: string;
  version: string;
  endOfLife: ISODate;
  daysLeft: number;
  level: 'notice' | 'warning' | 'urgent' | 'expired';
  /** The newest supported line to move to. */
  moveTo?: string;
}

// ── Update Center: local mirror and offline logistics ─────────────────
export interface LocalMirror {
  nationId: string;
  registryUrl: string;
  kind: 'connected' | 'air-gapped';
  registeredAt: ISODate;
  registeredBy: string;
  lastSync?: { at: ISODate; by: string; releaseIds: string[]; bytes: number };
  /** Releases whose artifacts are in the mirror. */
  mirrored: string[];
}
export interface SyncItem {
  releaseId: string;
  version: string;
  artifactId: string;
  filename: string;
  ref?: string;
  sha256: string;
  sizeBytes: number;
  /** A delta from the previous release, when the mirror already holds it. */
  delta?: { from: string; filename: string; sha256: string; sizeBytes: number; savedBytes: number };
}
export interface SyncManifest {
  nationId: string;
  generatedAt: ISODate;
  registryUrl?: string;
  items: SyncItem[];
  fullBytes: number;
  transferBytes: number;
  savedBytes: number;
}
export type CustodyStep = 'sealed' | 'handed-over' | 'received' | 'seal-verified';
export interface MediaShipment {
  mediaId: string;
  nationId: string;
  releaseIds: string[];
  /** Contents written to the media: file names and checksums. */
  contents: { filename: string; sha256: string; sizeBytes: number }[];
  sealId: string;
  state: CustodyStep | 'seal-broken';
  chain: { step: CustodyStep; at: ISODate; by: string; to?: string; note?: string; sealId?: string; ok?: boolean; auditSeq?: number }[];
}

// ── Update Center: release communication ──────────────────────────────
export type AlertCategory = 'security' | 'releases' | 'incidents' | 'eol';
export type AlertChannel = 'email' | 'sms';
export interface ReleaseResource { kind: 'training' | 'admin-guide' | 'runbook' | 'video'; title: string; url: string; language: string; placeholder?: boolean }
export interface WhatsNew {
  releaseId: string;
  version: string;
  /** The nation's language and whether the notes are in it. */
  locale: string;
  translated: boolean;
  /** True when the nation's language is not English and no translation exists yet. */
  pending: boolean;
  summary: string;
  changes: { kind: ChangeKind; text: string }[];
  resources: ReleaseResource[];
}
export interface Official {
  id: string;
  name: string;
  role: string;
  email?: string;
  sms?: string;
  channels: Record<AlertChannel, boolean>;
  subscriptions: Record<AlertCategory, boolean>;
}
export interface AlertDelivery {
  id: string;
  at: ISODate;
  nationId: string;
  category: AlertCategory;
  subject: string;
  ref?: string;
  officialId: string;
  officialName: string;
  channel: AlertChannel;
  to: string;
  /** No provider is connected: deliveries are queued (placeholder). */
  status: 'queued' | 'sent' | 'failed';
}

// ── Update Center: licence and contract management ────────────────────
export type ContractKind = 'hosted-subscription' | 'self-run-subscription' | 'perpetual-licence';
export interface ContractModule { key: string; label: string; entitled: boolean }
export interface ContractInvoice {
  id: string;
  /** Platform invoices come from the contract; security-store invoices from the security store's orders. */
  source: 'platform' | 'security-store';
  description: string;
  period?: { from: ISODate; to: ISODate };
  issuedAt: ISODate;
  dueAt: ISODate;
  amount: number;
  currency: string;
  status: 'paid' | 'due' | 'overdue' | 'upcoming';
  paidAt?: ISODate;
  reference?: string;
}
export interface Contract {
  id: string;
  nationId: string;
  nationName: string;
  kind: ContractKind;
  hostingPath: HostingPath;
  plan?: string;
  modules: ContractModule[];
  seats: { licensed: number; used: number };
  term: { start: ISODate; end: ISODate; years: number };
  renewal: { noticeDays: number; noticeFrom: ISODate; status: 'not-due' | 'notice-period' | 'proposed' | 'renewed' | 'lapsed'; proposal?: { years: number; annualFee: number; by: string; at: ISODate }; acceptedBy?: string; acceptedAt?: ISODate };
  supportTier: SupportTier;
  currency: string;
  /** Contract rate applied to reference prices; false when prices are still in the reference currency. */
  localPricing: boolean;
  annualFee: number;
  feeBasis: string;
  invoices: ContractInvoice[];
  outstanding: number;
  history: { at: ISODate; by: string; action: string; note?: string }[];
}

// ── Update Center: data-sovereignty controls ──────────────────────────
/** The model service behind the AI assistant. */
export interface AiAssistantModel {
  /** 'anthropic' (Messages API; default) or 'openai' (an OpenAI-compatible chat completions API, as most self-hosted model servers offer). */
  api: 'anthropic' | 'openai';
  /** Base address of the service; empty = the provider's public service. */
  endpoint?: string;
  /** Model name at that service. */
  model?: string;
}

export type DataCategory = 'crash-reports' | 'usage-metrics' | 'health-reports' | 'support-attachments' | 'ai-advisory';
export interface DataCategoryInfo {
  key: DataCategory;
  label: string;
  purpose: string;
  contains: string[];
  never: string[];
  destination: string;
  /** What switching it off costs the nation. */
  whenOff: string;
}
export interface DataSharingState {
  category: DataCategory;
  enabled: boolean;
  approvedBy?: string;
  reason?: string;
  at?: ISODate;
  history: { at: ISODate; by: string; enabled: boolean; reason?: string; auditSeq?: number }[];
  /** Transmissions held back in this country because the category is off. */
  heldBack: number;
  /** Transmissions that left (category on). */
  sent: number;
  lastSentAt?: ISODate;
}
export interface DataTransmission {
  id: string;
  at: ISODate;
  nationId: string;
  category: DataCategory;
  summary: string;
  payload: Record<string, unknown>;
}

// ── My work (/api/work) ───────────────────────────────────────────────
export interface WorkQueueItem extends QueueItem { ministryId: string; ministry: string; queueTitle: string; slaHours: number; overdue: boolean }
export interface WorkMinistryIncident extends MinistryIncident { ministryId: string; ministry: string; authority: string | null; canEscalate: boolean }
export interface WorkOverview {
  generatedAt: ISODate;
  counts: { decisions: number; overdue: number; incidents: number };
  queue: WorkQueueItem[];
  ministryIncidents: WorkMinistryIncident[];
  permits: Permit[];
  incidents: Incident[];
}
