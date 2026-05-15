// CivicOS — Phase 1 mock data adapter (server-side).
//
// This is the SWAPPABLE backend. In production, replace this module with the
// sovereign datastore adapter (Postgres/CockroachDB + CivicBus + Audit Vault,
// per Companions 05/06/76). The API route handlers depend only on these
// function signatures, so the swap is mechanical.
//
// Persistence note: this in-memory store persists for the life of the server
// process. It is sufficient for Phase 1 demo/preview. Production uses a
// durable sovereign datastore.

import type {
  AuditEntry,
  Bill,
  Citizen,
  CreatePermitInput,
  DecidePermitInput,
  Incident,
  IncidentSeverity,
  MunicipalityOnboardingInput,
  MunicipalityOnboardingResult,
  Notification,
  OpsOverview,
  PaymentReceipt,
  Permit,
  PermitStatus,
  QueueHealth,
  ServiceHealth,
  Session,
  SignatureRequest,
  SignatureResult,
  TenantHealth,
  IntegrationClient,
  IntegrationKind,
  IntegrationRegistered,
  FederationGrant,
  WebhookSubscription,
  WebhookCreated,
  FederationCheck,
  Release,
  ReleaseChannel,
  Deployment,
  DeployStrategy,
  DeployState,
  DeployGate,
  TenantLifecycle,
  TenantState,
  BackupRecord,
  BackupKind,
  ConfigBundle,
  ConfigDrift,
  Archetype,
  ArchetypeKey,
  Ministry,
  MinistryStatus,
  MinistryOperations,
  ModuleOps,
  KpiValue,
  QueueValue,
  AlertValue,
  OpsTone,
  RegionStat,
  MinistryRegions,
  QueueItem,
  QueuePriority,
  QueueItemState,
  QueueAction,
  MinistryQueue,
  AnalyticDelta,
  MinistryIncident,
  MinistryIncidents,
  FieldUnitStatus,
  MinistryFieldOps,
  SovereignProfile,
  CabinetOverview,
  AnalyticSeries,
  MinistrySeries,
  SovereignPreset,
  NationalSnapshot,
  CrossMinistryIncident,
  NationalIndicator,
  NationalCoordination,
  CoordinationNode,
  CoordinationEdge,
  OpsTimelineEvent,
  CoordinationPinned,
  VerifyResult,
} from '@/lib/api/types';
import { specFor } from '@/lib/ops-catalog';
import { profileFor } from '@/lib/archetype-profiles';

function uid(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
}

function hash(seed: string): string {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (Math.imul(31, h) + seed.charCodeAt(i)) | 0;
  return (h >>> 0).toString(16).padStart(8, '0') + '…' + (h & 0xffff).toString(16);
}

const citizen: Citizen = {
  id: 'cz-amina',
  displayName: 'Amina Hassan Mwangi',
  preferredLocale: 'en',
  municipality: 'Kiambu',
};

// Module-level singletons (process-lifetime).
const g = globalThis as unknown as { __civicos?: ReturnType<typeof seed> };

function seed() {
  const now = Date.now();
  const days = (n: number) => new Date(now + n * 86400000).toISOString();

  const permits: Permit[] = [
    {
      id: 'PM-4F21',
      type: 'business',
      title: 'Bakery — small business permit',
      applicantName: citizen.displayName,
      municipality: 'Kiambu',
      status: 'in-review',
      submittedAt: days(-3),
      decisionDue: days(9),
      officerName: 'M. Khumalo',
      aiClass: 'B',
      fields: { premises: 'Plot 4423', staff: '3', category: 'Food retail' },
      timeline: [
        { status: 'submitted', at: days(-3) },
        { status: 'in-review', at: days(-2), officerName: 'M. Khumalo' },
        { status: 'needs-info', at: days(-1), officerName: 'M. Khumalo', note: 'Please add a fire-safety annex.' },
      ],
      contestable: true,
    },
  ];

  const bills: Bill[] = [
    { id: 'BL-9001', kind: 'water', description: 'Water — April 2026', amountMinor: 84000, currency: 'KES', dueDate: days(6), status: 'due' },
    { id: 'BL-9002', kind: 'waste', description: 'Solid waste — Q2 2026', amountMinor: 30000, currency: 'KES', dueDate: days(12), status: 'due' },
    { id: 'BL-9003', kind: 'property-tax', description: 'Property tax — 2025 (paid)', amountMinor: 540000, currency: 'KES', dueDate: days(-40), status: 'paid' },
  ];

  const receipts: PaymentReceipt[] = [
    { id: 'PR-3001', billId: 'BL-9003', amountMinor: 540000, currency: 'KES', rail: 'M-Pesa', paidAt: days(-40), hash: hash('BL-9003') },
  ];

  const notifications: Notification[] = [
    { id: 'NT-7001', from: 'Ministry of Education', subject: 'School transfer approved', body: 'The transfer of Aisha to Mukuvisi Primary is confirmed.', at: days(-1), read: false, channel: 'wallet' },
    { id: 'NT-7002', from: 'Tax authority', subject: 'Your 2026 tax draft is ready', body: 'A pre-filled draft is ready for your review. No signature is needed yet.', at: days(-3), read: false, channel: 'wallet', aiClass: 'C' },
    { id: 'NT-7003', from: 'Civic Assistant', subject: 'Pension eligibility', body: 'Here is the information you asked for about pension eligibility.', at: days(-7), read: true, channel: 'wallet', aiClass: 'A' },
  ];

  const audit: AuditEntry[] = [];

  const incidents: Incident[] = [
    {
      id: 'INC-2041',
      severity: 'sev3',
      title: 'Garissa edge sync delayed (>2h)',
      scope: 'Garissa',
      status: 'acknowledged',
      openedAt: days(0),
      acknowledgedAt: days(0),
      owner: 'Platform on-call',
      events: [
        { at: days(0), by: 'system', action: 'opened', note: 'Sync lag threshold exceeded.' },
        { at: days(0), by: 'W. Chebet', action: 'acknowledged', note: 'Investigating link to regional POP.' },
      ],
    },
  ];

  // Minutes since last successful edge sync, per municipality.
  const tenantSync: Record<string, number> = {
    Kiambu: 4,
    Garissa: 137,
    'Tana Delta': 22,
  };

  const integrations: IntegrationClient[] = [
    {
      id: 'IC-7001',
      kind: 'integration',
      name: 'County GIS connector',
      ownerOrg: 'Kiambu Lands Office',
      scopes: ['permit:read'],
      status: 'approved',
      rateLimitRpm: 120,
      createdAt: days(-20),
      approvedBy: 'L. Mwakio',
    },
  ];
  const grants: FederationGrant[] = [
    {
      id: 'FG-3001',
      fromTenant: 'kiambu',
      toTenant: 'min-health',
      scopes: ['permit:read'],
      status: 'approved',
      reason: 'Health ministry oversight of food-handling permits',
      createdAt: days(-15),
      approvedBy: 'STO',
    },
  ];
  const webhooks: WebhookSubscription[] = [
    {
      id: 'WH-9001',
      topic: 'civicos.permit.decided',
      url: 'https://lands.kiambu.go.ke/hooks/permits',
      status: 'active',
      failures: 0,
      createdAt: days(-10),
    },
  ];

  const releases: Release[] = [
    { id: 'REL-140', version: '1.4.0', channel: 'stable', notes: 'Permits SLA + audit chain', createdAt: days(-30), approvedBy: 'L. Mwakio' },
    { id: 'REL-150', version: '1.5.0', channel: 'staging', notes: 'Operations centre + interop', createdAt: days(-7) },
  ];
  const deployments: Deployment[] = [];
  const lifecycle: TenantLifecycle = {
    tenant: 'kiambu',
    state: 'active',
    events: [
      { at: days(-60), from: 'provisioning', to: 'active', reason: 'Go-live after inclusion-floor check', actor: 'L. Mwakio' },
    ],
  };
  const backups: BackupRecord[] = [
    { id: 'BK-9001', kind: 'full', state: 'completed', location: 'sov://backups/kiambu/full-1.enc', encrypted: true, sizeBytes: 4_812_004, createdAt: days(-1) },
  ];
  const configs: ConfigBundle[] = [
    { id: 'CFG-1', scope: 'global', version: 1, contentHash: hash('cfg-v1'), signedBy: 'STO', state: 'applied', createdAt: days(-20) },
  ];

  const ministries: Ministry[] = [];
  const ministryQueues: Record<string, QueueItem[]> = {};
  const ministryIncidents: Record<string, MinistryIncident[]> = {};
  // Global-state-neutral defaults — works for any state form; configurable.
  const sovereign: SovereignProfile = {
    stateName: 'Sovereign State',
    stateForm: 'republic',
    executiveTitle: 'Head of Government',
    legislatureName: 'National Assembly',
    currency: 'USD',
    regionNoun: 'region',
    locale: 'en',
    accent: '#1f2630',
    motto: 'Humans govern · the platform serves',
  };

  return { permits, bills, receipts, notifications, audit, incidents, tenantSync, integrations, grants, webhooks, releases, deployments, lifecycle, backups, configs, ministries, ministryQueues, ministryIncidents, sovereign };
}

// Append a hash-chained audit row (tamper-evident, mirrors the backend).
function appendAudit(
  actor: string,
  action: string,
  resource: string,
  outcome: string,
  detail?: string,
): AuditEntry {
  const prev = db.audit[db.audit.length - 1];
  const seq = (prev?.seq ?? 0) + 1;
  const prevHash = prev?.hash ?? null;
  const entry: AuditEntry = {
    id: uid('AU'),
    at: new Date().toISOString(),
    actor,
    action,
    resource,
    outcome,
    detail,
    seq,
    prevHash,
    hash: hash(`${prevHash ?? 'GENESIS'}|${action}|${resource}|${outcome}|${seq}`),
  };
  db.audit.push(entry);
  return entry;
}

const db = (g.__civicos ??= seed());

// ── Session ───────────────────────────────────────────────────────────
export function getSession(): Session {
  return { authenticated: true, citizen, method: 'demo' };
}

// ── Permits ───────────────────────────────────────────────────────────
export function listPermits(): Permit[] {
  return db.permits;
}

export function getPermit(id: string): Permit | undefined {
  return db.permits.find(p => p.id === id);
}

export function createPermit(input: CreatePermitInput): Permit {
  const now = new Date().toISOString();
  const permit: Permit = {
    id: uid('PM'),
    type: input.type,
    title: input.title,
    applicantName: input.applicantName,
    municipality: input.municipality,
    status: 'submitted',
    submittedAt: now,
    decisionDue: new Date(Date.now() + 12 * 86400000).toISOString(),
    fields: input.fields,
    timeline: [{ status: 'submitted', at: now }],
    contestable: true,
  };
  db.permits.unshift(permit);
  appendAudit('citizen', 'permit.create', `Permit:${permit.id}`, 'ok', permit.title);
  return permit;
}

// Officer decision workflow. Valid transitions only; every decision is
// named to the officer, appended to the timeline, and audited.
const NEXT_STATUS: Record<string, PermitStatus> = {
  approve: 'approved',
  decline: 'declined',
  'request-info': 'needs-info',
  escalate: 'in-review',
};

export function decidePermit(
  id: string,
  input: DecidePermitInput,
): Permit | { error: string } {
  const permit = db.permits.find(p => p.id === id);
  if (!permit) return { error: 'Permit not found' };
  if (permit.status === 'approved' || permit.status === 'declined') {
    return { error: 'Permit already decided' };
  }
  const next = NEXT_STATUS[input.decision];
  if (!next) return { error: 'Unknown decision' };

  const now = new Date().toISOString();
  permit.status = next;
  permit.officerName = input.officerName;
  if (input.aiClass) permit.aiClass = input.aiClass;
  permit.timeline.push({
    status: next,
    at: now,
    officerName: input.officerName,
    note:
      input.decision === 'escalate'
        ? `Escalated for senior review${input.note ? `: ${input.note}` : ''}`
        : input.note,
  });
  appendAudit(
    input.officerName,
    `permit.${input.decision}`,
    `Permit:${id}`,
    'ok',
    input.note,
  );
  return permit;
}

// ── Audit ─────────────────────────────────────────────────────────────
export function listAudit(): AuditEntry[] {
  return [...db.audit].reverse();
}

export function verifyAuditChain(): {
  ok: boolean;
  checked: number;
  brokenAtSeq?: number;
} {
  let prevHash: string | null = null;
  for (const e of db.audit) {
    const expected = hash(
      `${prevHash ?? 'GENESIS'}|${e.action}|${e.resource}|${e.outcome}|${e.seq}`,
    );
    if (expected !== e.hash || (e.prevHash ?? null) !== (prevHash ?? null)) {
      return { ok: false, checked: db.audit.length, brokenAtSeq: e.seq };
    }
    prevHash = e.hash;
  }
  return { ok: true, checked: db.audit.length };
}

// ── Payments ──────────────────────────────────────────────────────────
export function listBills(): Bill[] {
  return db.bills;
}

export function listReceipts(): PaymentReceipt[] {
  return db.receipts;
}

export function payBill(billId: string, rail: string): PaymentReceipt | { error: string } {
  const bill = db.bills.find(b => b.id === billId);
  if (!bill) return { error: 'Bill not found' };
  if (bill.status === 'paid') return { error: 'Bill already paid' };
  bill.status = 'paid';
  const receipt: PaymentReceipt = {
    id: uid('PR'),
    billId,
    amountMinor: bill.amountMinor,
    currency: bill.currency,
    rail,
    paidAt: new Date().toISOString(),
    hash: hash(billId + Date.now()),
  };
  db.receipts.unshift(receipt);
  appendAudit('citizen', 'payment.execute', `Bill:${billId}`, 'ok', `${bill.currency} ${bill.amountMinor / 100}`);
  return receipt;
}

// ── Notifications ─────────────────────────────────────────────────────
export function listNotifications(): Notification[] {
  return db.notifications;
}

// ── Document verification ─────────────────────────────────────────────
export function verifyDocument(code: string): VerifyResult {
  // Demo logic: codes starting with VC- are valid; REV- are revoked; else invalid.
  const c = code.trim().toUpperCase();
  if (c.startsWith('VC-')) {
    return {
      valid: true,
      subject: 'Amina Hassan Mwangi',
      issuer: 'Ministry of Education',
      credentialType: 'Diploma in Nursing',
      issuedAt: new Date(Date.now() - 400 * 86400000).toISOString(),
      revoked: false,
    };
  }
  if (c.startsWith('REV-')) {
    return { valid: false, revoked: true, reason: 'Credential was revoked by the issuer.' };
  }
  return { valid: false, reason: 'Signature did not verify. This document may be altered or not issued by the state.' };
}

// ── Digital signatures ────────────────────────────────────────────────
export function signDocument(req: SignatureRequest): SignatureResult {
  const now = new Date().toISOString();
  return {
    id: uid('SG'),
    documentId: req.documentId,
    signerName: req.signerName,
    signedAt: now,
    hash: hash(req.documentId + req.signerName + now),
    nonRepudiation: true,
  };
}

// ── Municipal onboarding ──────────────────────────────────────────────
export function onboardMunicipality(
  input: MunicipalityOnboardingInput,
): MunicipalityOnboardingResult {
  const checks = [
    {
      label: 'Inclusion floor (USSD / IVR / agent / walk-in)',
      passed:
        input.inclusionFloor.ussd &&
        input.inclusionFloor.ivr &&
        input.inclusionFloor.agentNetwork &&
        input.inclusionFloor.walkIn,
      detail: 'All four channels are required before go-live (Companion 67).',
    },
    {
      label: 'At least one official language declared',
      passed: input.officialLanguages.length >= 1,
      detail: 'Multilingual is structural, not optional (Companion 148).',
    },
    {
      label: 'Constitutional officer signoff',
      passed: input.constitutionalOfficerSignoff,
      detail: 'Required for any citizen-affecting deployment (Companion 28).',
    },
    {
      label: 'Admin contact provided',
      passed: input.adminContact.trim().length > 3,
    },
    {
      label: 'At least one module selected',
      passed: input.modules.length >= 1,
    },
  ];
  const allPassed = checks.every(c => c.passed);
  return {
    id: uid('MU'),
    name: input.name,
    status: allPassed ? 'provisioned' : 'blocked',
    checks,
    goLiveEstimateDays: allPassed ? 14 : 0,
  };
}

// ── Operational intelligence ──────────────────────────────────────────
// All derived from real platform state where possible (permits, bills,
// audit, sync). Tenant-aware, no citizen PII in any operational metric.

const OPEN_PERMIT_STATES: PermitStatus[] = ['submitted', 'in-review', 'needs-info'];

function hoursSince(iso?: string): number {
  if (!iso) return 0;
  return Math.max(0, (Date.now() - new Date(iso).getTime()) / 3_600_000);
}

export function queueHealth(): QueueHealth[] {
  const open = db.permits.filter(p => OPEN_PERMIT_STATES.includes(p.status));
  const needsInfo = db.permits.filter(p => p.status === 'needs-info');
  const oldestOpen = open.reduce((m, p) => Math.max(m, hoursSince(p.submittedAt)), 0);
  const unpaid = db.bills.filter(b => b.status !== 'paid');
  return [
    {
      name: 'Permit review',
      depth: open.length,
      oldestAgeHours: Math.round(oldestOpen),
      slaHours: 288, // 12 days
      breaching: open.some(p => p.decisionDue && hoursSince(p.decisionDue) > 0),
    },
    {
      name: 'Awaiting citizen info',
      depth: needsInfo.length,
      oldestAgeHours: Math.round(
        needsInfo.reduce((m, p) => Math.max(m, hoursSince(p.submittedAt)), 0),
      ),
      slaHours: 720,
      breaching: false,
    },
    {
      name: 'Payments outstanding',
      depth: unpaid.length,
      oldestAgeHours: 0,
      slaHours: 0,
      breaching: unpaid.some(b => b.status === 'overdue'),
    },
  ];
}

export function serviceHealth(): ServiceHealth[] {
  const audit = verifyAuditChain();
  return [
    { name: 'Citizen API', status: 'ok', latencyMs: 78, detail: 'Nominal' },
    { name: 'Officer API', status: 'ok', latencyMs: 96, detail: 'Nominal' },
    { name: 'Payments rail', status: 'ok', latencyMs: 210, detail: 'M-Pesa + ISO 20022 reachable' },
    {
      name: 'Audit ledger',
      status: audit.ok ? 'ok' : 'down',
      latencyMs: 12,
      detail: audit.ok ? `Chain intact (${audit.checked} events)` : `Broken at seq ${audit.brokenAtSeq}`,
    },
    {
      name: 'Edge sync',
      status: Object.values(db.tenantSync).some(m => m > 120) ? 'degraded' : 'ok',
      latencyMs: 0,
      detail: 'One or more municipalities lagging' ,
    },
  ];
}

export function tenantHealth(): TenantHealth[] {
  const munis = Array.from(
    new Set([
      ...db.permits.map(p => p.municipality),
      ...Object.keys(db.tenantSync),
    ]),
  );
  return munis.map(m => {
    const permits = db.permits.filter(p => p.municipality === m);
    const open = permits.filter(p => OPEN_PERMIT_STATES.includes(p.status));
    const slaBreaches = open.filter(
      p => p.decisionDue && hoursSince(p.decisionDue) > 0,
    ).length;
    const lastSync = db.tenantSync[m] ?? 0;
    const status: TenantHealth['status'] =
      lastSync > 120 || slaBreaches > 0
        ? 'degraded'
        : 'ok';
    return {
      municipality: m,
      status,
      openPermits: open.length,
      slaBreaches,
      overdueBills: db.bills.filter(b => b.status === 'overdue').length,
      lastSyncMinutes: lastSync,
    };
  });
}

export function opsOverview(): OpsOverview {
  const services = serviceHealth();
  const queues = queueHealth();
  const tenants = tenantHealth();
  const audit = verifyAuditChain();
  const decided = db.permits.filter(
    p => p.status === 'approved' || p.status === 'declined',
  );
  const onTime = decided.filter(
    p => !p.decisionDue || hoursSince(p.decisionDue) <= 0,
  ).length;
  const slaCompliancePct = decided.length
    ? Math.round((onTime / decided.length) * 100)
    : 100;
  return {
    generatedAt: new Date().toISOString(),
    summary: {
      servicesOk: services.filter(s => s.status === 'ok').length,
      servicesTotal: services.length,
      queuesBreaching: queues.filter(q => q.breaching).length,
      openIncidents: db.incidents.filter(i => i.status !== 'resolved').length,
      slaCompliancePct,
      auditIntact: audit.ok,
    },
    services,
    queues,
    tenants,
  };
}

// ── Incident management ───────────────────────────────────────────────
export function listIncidents(): Incident[] {
  return [...db.incidents].sort(
    (a, b) => +new Date(b.openedAt) - +new Date(a.openedAt),
  );
}

export function createIncident(input: {
  severity: IncidentSeverity;
  title: string;
  scope: string;
  by: string;
}): Incident {
  const now = new Date().toISOString();
  const inc: Incident = {
    id: uid('INC'),
    severity: input.severity,
    title: input.title,
    scope: input.scope,
    status: 'open',
    openedAt: now,
    events: [{ at: now, by: input.by, action: 'opened' }],
  };
  db.incidents.unshift(inc);
  appendAudit(input.by, 'incident.open', `Incident:${inc.id}`, 'ok', input.title);
  return inc;
}

function mutateIncident(
  id: string,
  by: string,
  action: 'acknowledged' | 'resolved' | 'escalated',
  note?: string,
): Incident | { error: string } {
  const inc = db.incidents.find(i => i.id === id);
  if (!inc) return { error: 'Incident not found' };
  const now = new Date().toISOString();
  if (action === 'acknowledged') {
    if (inc.status === 'resolved') return { error: 'Incident already resolved' };
    inc.status = 'acknowledged';
    inc.acknowledgedAt = now;
    inc.owner = by;
  } else if (action === 'resolved') {
    inc.status = 'resolved';
    inc.resolvedAt = now;
  } else if (action === 'escalated') {
    const order: IncidentSeverity[] = ['sev4', 'sev3', 'sev2', 'sev1'];
    const idx = order.indexOf(inc.severity);
    inc.severity = order[Math.min(idx + 1, order.length - 1)]!;
  }
  inc.events.push({ at: now, by, action, note });
  appendAudit(by, `incident.${action}`, `Incident:${id}`, 'ok', note);
  return inc;
}

export const ackIncident = (id: string, by: string, note?: string) =>
  mutateIncident(id, by, 'acknowledged', note);
export const resolveIncident = (id: string, by: string, note?: string) =>
  mutateIncident(id, by, 'resolved', note);
export const escalateIncident = (id: string, by: string, note?: string) =>
  mutateIncident(id, by, 'escalated', note);

// ── Interoperability & federation (mirrors the backend contract) ──────
const HOME_TENANT = 'kiambu';

export function listIntegrations(): IntegrationClient[] {
  return [...db.integrations].sort(
    (a, b) => +new Date(b.createdAt) - +new Date(a.createdAt),
  );
}

export function registerIntegration(input: {
  kind: IntegrationKind;
  name: string;
  ownerOrg: string;
  contact: string;
  scopes: string[];
}): IntegrationRegistered | { error: string } {
  if (db.integrations.some(i => i.name === input.name)) {
    return { error: 'Name already registered' };
  }
  const rawKey = `civ_${Math.random().toString(36).slice(2)}${Math.random()
    .toString(36)
    .slice(2)}`;
  const client: IntegrationClient = {
    id: uid('IC'),
    kind: input.kind,
    name: input.name,
    ownerOrg: input.ownerOrg,
    scopes: input.scopes,
    status: 'pending',
    rateLimitRpm: 120,
    createdAt: new Date().toISOString(),
  };
  db.integrations.unshift(client);
  appendAudit('operator', 'integration.register', `Integration:${client.id}`, 'ok', input.name);
  return {
    id: client.id,
    status: client.status,
    apiKey: rawKey,
    note: 'Store this key now — it is not recoverable. PENDING until a ministry operator approves it.',
  };
}

export function setIntegrationStatus(
  id: string,
  status: 'approved' | 'suspended' | 'revoked',
  by: string,
): IntegrationClient | { error: string } {
  const c = db.integrations.find(i => i.id === id);
  if (!c) return { error: 'Integration not found' };
  c.status = status;
  if (status === 'approved') c.approvedBy = by;
  appendAudit(by, `integration.${status}`, `Integration:${id}`, 'ok');
  return c;
}

export function listGrants(): FederationGrant[] {
  return [...db.grants].sort(
    (a, b) => +new Date(b.createdAt) - +new Date(a.createdAt),
  );
}

export function proposeGrant(input: {
  toTenant: string;
  scopes: string[];
  reason: string;
  expiresAt?: string;
}): FederationGrant | { error: string } {
  if (input.toTenant === HOME_TENANT) {
    return { error: 'A tenant cannot federate with itself' };
  }
  const existing = db.grants.find(
    g => g.fromTenant === HOME_TENANT && g.toTenant === input.toTenant,
  );
  if (existing) {
    existing.scopes = input.scopes;
    existing.reason = input.reason;
    existing.status = 'proposed';
    existing.expiresAt = input.expiresAt;
    appendAudit('operator', 'federation.propose', `Grant:${existing.id}`, 'ok');
    return existing;
  }
  const grant: FederationGrant = {
    id: uid('FG'),
    fromTenant: HOME_TENANT,
    toTenant: input.toTenant,
    scopes: input.scopes,
    status: 'proposed',
    reason: input.reason,
    createdAt: new Date().toISOString(),
    expiresAt: input.expiresAt,
  };
  db.grants.unshift(grant);
  appendAudit('operator', 'federation.propose', `Grant:${grant.id}`, 'ok');
  return grant;
}

export function setGrantStatus(
  id: string,
  status: 'approved' | 'revoked',
  by: string,
): FederationGrant | { error: string } {
  const g = db.grants.find(x => x.id === id);
  if (!g) return { error: 'Grant not found' };
  g.status = status;
  if (status === 'approved') g.approvedBy = by;
  appendAudit(by, `federation.${status}`, `Grant:${id}`, 'ok');
  return g;
}

// The default-deny enforcement primitive. Fail closed.
export function federationCheck(
  toTenant: string,
  scope: string,
): FederationCheck {
  if (toTenant === HOME_TENANT) return { allowed: true, reason: 'same-tenant' };
  const g = db.grants.find(
    x => x.fromTenant === HOME_TENANT && x.toTenant === toTenant,
  );
  if (!g) return { allowed: false, reason: 'no grant (default deny)' };
  if (g.status !== 'approved') return { allowed: false, reason: `grant is ${g.status}` };
  if (g.expiresAt && new Date(g.expiresAt).getTime() < Date.now()) {
    return { allowed: false, reason: 'grant expired' };
  }
  if (!g.scopes.includes(scope)) {
    return { allowed: false, reason: `scope '${scope}' not granted` };
  }
  return { allowed: true, reason: 'granted' };
}

export function listWebhooks(): WebhookSubscription[] {
  return [...db.webhooks].sort(
    (a, b) => +new Date(b.createdAt) - +new Date(a.createdAt),
  );
}

export function subscribeWebhook(input: {
  topic: string;
  url: string;
}): WebhookCreated {
  const secret = `whsec_${Math.random().toString(36).slice(2)}${Math.random()
    .toString(36)
    .slice(2)}`;
  const sub: WebhookSubscription = {
    id: uid('WH'),
    topic: input.topic,
    url: input.url,
    status: 'active',
    failures: 0,
    createdAt: new Date().toISOString(),
  };
  db.webhooks.unshift(sub);
  appendAudit('operator', 'webhook.subscribe', `Webhook:${sub.id}`, 'ok', input.topic);
  return {
    id: sub.id,
    topic: sub.topic,
    signingSecret: secret,
    note: 'Store this secret now. Verify HMAC-SHA256 of `${timestamp}.${body}`; reject timestamps older than 300s.',
  };
}

export function setWebhookStatus(
  id: string,
  status: 'active' | 'paused' | 'disabled',
): WebhookSubscription | { error: string } {
  const w = db.webhooks.find(x => x.id === id);
  if (!w) return { error: 'Subscription not found' };
  w.status = status;
  appendAudit('operator', `webhook.${status}`, `Webhook:${id}`, 'ok');
  return w;
}

// ── Platform operations & lifecycle (mirrors backend state machines) ──
const REL_NEXT: Record<ReleaseChannel, ReleaseChannel | null> = {
  dev: 'staging',
  staging: 'stable',
  stable: null,
};

export function listReleases(): Release[] {
  return [...db.releases].sort(
    (a, b) => +new Date(b.createdAt) - +new Date(a.createdAt),
  );
}
export function createRelease(input: {
  version: string;
  notes: string;
  schemaMigration?: string;
}): Release | { error: string } {
  if (!/^\d+\.\d+\.\d+$/.test(input.version)) {
    return { error: 'version must be semver x.y.z' };
  }
  if (db.releases.some(r => r.version === input.version && r.channel === 'dev')) {
    return { error: 'Version already in DEV' };
  }
  const r: Release = {
    id: uid('REL'),
    version: input.version,
    channel: 'dev',
    notes: input.notes,
    schemaMigration: input.schemaMigration,
    createdAt: new Date().toISOString(),
  };
  db.releases.unshift(r);
  appendAudit('operator', 'release.create', `Release:${r.id}`, 'ok', input.version);
  return r;
}
export function promoteRelease(id: string, by: string): Release | { error: string } {
  const r = db.releases.find(x => x.id === id);
  if (!r) return { error: 'Release not found' };
  const next = REL_NEXT[r.channel];
  if (!next) return { error: 'Already at STABLE' };
  r.channel = next;
  if (next === 'stable') r.approvedBy = by;
  appendAudit(by, 'release.promote', `Release:${id}`, 'ok', `-> ${next}`);
  return r;
}

const DEP_NEXT: Record<DeployState, DeployState | null> = {
  pending: 'precheck',
  precheck: 'rollout',
  rollout: 'verify',
  verify: 'completed',
  completed: null,
  'rolled-back': null,
};

export function listDeployments(): Deployment[] {
  return [...db.deployments].sort(
    (a, b) => +new Date(b.startedAt) - +new Date(a.startedAt),
  );
}
export function startDeployment(
  releaseId: string,
  strategy: DeployStrategy,
): Deployment | { error: string } {
  const rel = db.releases.find(r => r.id === releaseId);
  if (!rel) return { error: 'Release not found' };
  const d: Deployment = {
    id: uid('DEP'),
    releaseId,
    releaseVersion: rel.version,
    strategy,
    state: 'pending',
    gates: [],
    startedAt: new Date().toISOString(),
  };
  db.deployments.unshift(d);
  appendAudit('operator', 'deployment.start', `Deployment:${d.id}`, 'ok', `${rel.version}/${strategy}`);
  return d;
}
export function advanceDeployment(
  id: string,
  by: string,
  gateResult: 'pass' | 'fail',
  note?: string,
): Deployment | { error: string } {
  const d = db.deployments.find(x => x.id === id);
  if (!d) return { error: 'Deployment not found' };
  if (d.state === 'completed' || d.state === 'rolled-back') {
    return { error: `Deployment is ${d.state}` };
  }
  const gate: DeployGate = {
    at: new Date().toISOString(),
    gate: d.state,
    result: gateResult,
    by,
    note,
  };
  d.gates.push(gate);
  if (gateResult === 'fail') {
    d.state = 'rolled-back';
    d.completedAt = new Date().toISOString();
    appendAudit(by, 'deployment.gate-fail', `Deployment:${id}`, 'ok', note);
    return d;
  }
  const next = DEP_NEXT[d.state];
  if (!next) return { error: 'No forward transition' };
  d.state = next;
  if (next === 'completed') d.completedAt = new Date().toISOString();
  appendAudit(by, 'deployment.advance', `Deployment:${id}`, 'ok', `-> ${next}`);
  return d;
}
export function rollbackDeployment(
  id: string,
  by: string,
  note: string,
): Deployment | { error: string } {
  const d = db.deployments.find(x => x.id === id);
  if (!d) return { error: 'Deployment not found' };
  if (d.state === 'completed' || d.state === 'rolled-back') {
    return { error: `Deployment is ${d.state}` };
  }
  d.gates.push({ at: new Date().toISOString(), gate: d.state, result: 'fail', by, note: `rollback: ${note}` });
  d.state = 'rolled-back';
  d.completedAt = new Date().toISOString();
  appendAudit(by, 'deployment.rollback', `Deployment:${id}`, 'ok', note);
  return d;
}

const LIFE_ALLOWED: Record<TenantState, TenantState[]> = {
  provisioning: ['active'],
  active: ['suspended', 'decommissioned'],
  suspended: ['active', 'decommissioned'],
  decommissioned: ['active'],
};
export function getLifecycle(): TenantLifecycle {
  return db.lifecycle;
}
export function transitionTenant(
  to: TenantState,
  reason: string,
  actor: string,
): TenantLifecycle | { error: string } {
  const from = db.lifecycle.state;
  if (from === to) return { error: `Tenant already ${to}` };
  if (!LIFE_ALLOWED[from].includes(to)) {
    return { error: `Illegal transition ${from} -> ${to}` };
  }
  db.lifecycle.state = to;
  db.lifecycle.events.unshift({
    at: new Date().toISOString(),
    from,
    to,
    reason,
    actor,
  });
  appendAudit(actor, 'tenant.transition', `Tenant:${db.lifecycle.tenant}`, 'ok', `${from} -> ${to}`);
  return db.lifecycle;
}

export function listBackups(): BackupRecord[] {
  return [...db.backups].sort(
    (a, b) => +new Date(b.createdAt) - +new Date(a.createdAt),
  );
}
export function createBackup(kind: BackupKind): BackupRecord {
  const b: BackupRecord = {
    id: uid('BK'),
    kind,
    state: 'completed',
    location: `sov://backups/kiambu/${kind}-${Date.now()}.enc`,
    encrypted: true,
    sizeBytes: Math.floor(1_000_000 + Math.random() * 9_000_000),
    createdAt: new Date().toISOString(),
  };
  db.backups.unshift(b);
  appendAudit('operator', 'backup.create', `Backup:${b.id}`, 'ok', kind);
  return b;
}
export function restoreBackup(id: string): BackupRecord | { error: string } {
  const b = db.backups.find(x => x.id === id);
  if (!b) return { error: 'Backup not found' };
  if (b.state !== 'completed') return { error: 'Only COMPLETED backups can be restored' };
  b.state = 'restoring';
  appendAudit('operator', 'backup.restore', `Backup:${id}`, 'ok');
  return b;
}

export function listConfigs(): ConfigBundle[] {
  return [...db.configs].sort((a, b) => b.version - a.version);
}
export function publishConfig(payload: Record<string, unknown>): ConfigBundle {
  const last = db.configs[0];
  const c: ConfigBundle = {
    id: uid('CFG'),
    scope: 'global',
    version: (last?.version ?? 0) + 1,
    contentHash: hash(JSON.stringify(payload)),
    state: 'draft',
    createdAt: new Date().toISOString(),
  };
  db.configs.unshift(c);
  appendAudit('operator', 'config.publish', `Config:${c.id}`, 'ok', `v${c.version}`);
  return c;
}
export function signConfig(id: string, by: string): ConfigBundle | { error: string } {
  const c = db.configs.find(x => x.id === id);
  if (!c) return { error: 'Config not found' };
  if (c.state !== 'draft') return { error: 'Only DRAFT can be signed' };
  c.state = 'signed';
  c.signedBy = by;
  appendAudit(by, 'config.sign', `Config:${id}`, 'ok');
  return c;
}
export function applyConfig(id: string): ConfigBundle | { error: string } {
  const c = db.configs.find(x => x.id === id);
  if (!c) return { error: 'Config not found' };
  if (c.state !== 'signed') return { error: 'Only SIGNED can be applied' };
  db.configs.forEach(x => {
    if (x.state === 'applied') x.state = 'superseded';
  });
  c.state = 'applied';
  appendAudit('operator', 'config.apply', `Config:${id}`, 'ok', `v${c.version}`);
  return c;
}
export function configDrift(): ConfigDrift {
  const applied = db.configs.find(c => c.state === 'applied');
  const signed = db.configs.find(c => c.state === 'signed');
  if (!signed) return { drift: false, reason: 'no newer signed config' };
  if (!applied) return { drift: true, reason: 'signed config never applied' };
  if (signed.version > applied.version) {
    return { drift: true, reason: `applied v${applied.version} != signed v${signed.version}` };
  }
  return { drift: false, reason: 'in sync' };
}

// ── Institutional framework (mirrors backend archetypes) ──────────────
const ARCHETYPES: Record<ArchetypeKey, Archetype> = {
  HEALTH: { key: 'HEALTH', title: 'Ministry of Health', summary: 'Public health, facilities, licensing, outbreak response.', defaultDepartments: ['Public Health', 'Facilities & Licensing', 'Pharmaceuticals', 'Emergency Response'], defaultModules: ['facilities', 'licensing', 'outbreak-monitoring', 'pharma-supply', 'vaccination', 'ambulance-coordination'], domainEntities: ['Hospital', 'Clinic', 'Practitioner', 'Outbreak', 'PharmaBatch', 'VaccinationRecord'] },
  EDUCATION: { key: 'EDUCATION', title: 'Ministry of Education', summary: 'Schools, learners, examinations, curriculum, scholarships.', defaultDepartments: ['Basic Education', 'Examinations', 'Curriculum', 'Scholarships'], defaultModules: ['schools', 'enrolment', 'examinations', 'curriculum', 'scholarships', 'performance-analytics'], domainEntities: ['School', 'Learner', 'Teacher', 'Exam', 'Curriculum', 'Scholarship'] },
  FINANCE: { key: 'FINANCE', title: 'Ministry of Finance / Treasury', summary: 'Treasury, taxation, budget, procurement, public expenditure.', defaultDepartments: ['Treasury', 'Revenue', 'Budget', 'Procurement'], defaultModules: ['treasury', 'taxation', 'budget', 'procurement', 'grants', 'expenditure'], domainEntities: ['Account', 'TaxFiling', 'BudgetLine', 'Tender', 'Grant', 'Disbursement'] },
  AGRICULTURE: { key: 'AGRICULTURE', title: 'Ministry of Agriculture', summary: 'Extension, subsidies, irrigation, market access.', defaultDepartments: ['Extension Services', 'Subsidies', 'Irrigation', 'Markets'], defaultModules: ['farmer-registry', 'subsidies', 'extension', 'market-access', 'climate-advisory'], domainEntities: ['Farmer', 'Subsidy', 'IrrigationScheme', 'MarketPrice', 'ExtensionVisit'] },
  ENERGY: { key: 'ENERGY', title: 'Ministry of Energy', summary: 'Generation, grid, licensing, rural electrification.', defaultDepartments: ['Generation', 'Grid', 'Licensing', 'Electrification'], defaultModules: ['grid-monitoring', 'licensing', 'electrification', 'tariffs'], domainEntities: ['PowerPlant', 'GridSegment', 'Licence', 'ElectrificationProject', 'Tariff'] },
  TRANSPORT: { key: 'TRANSPORT', title: 'Ministry of Transport', summary: 'Roads, vehicles, licensing, public transit, safety.', defaultDepartments: ['Roads', 'Vehicle Registration', 'Licensing', 'Public Transit'], defaultModules: ['vehicle-registry', 'driver-licensing', 'roads', 'transit', 'road-safety'], domainEntities: ['Vehicle', 'DriverLicence', 'RoadSegment', 'TransitRoute', 'Inspection'] },
  JUSTICE: { key: 'JUSTICE', title: 'Ministry of Justice', summary: 'Courts coordination, legal aid, registries, corrections.', defaultDepartments: ['Legal Aid', 'Registries', 'Corrections', 'Court Liaison'], defaultModules: ['legal-aid', 'registries', 'case-coordination', 'corrections'], domainEntities: ['Case', 'LegalAidGrant', 'Registry', 'Facility'] },
  ENVIRONMENT: { key: 'ENVIRONMENT', title: 'Ministry of Environment', summary: 'Monitoring, permits, conservation, climate adaptation.', defaultDepartments: ['Monitoring', 'Permits', 'Conservation', 'Climate'], defaultModules: ['environmental-monitoring', 'permits', 'conservation', 'climate-adaptation'], domainEntities: ['MonitoringStation', 'EnvPermit', 'ProtectedArea', 'EmissionRecord'] },
  INTERIOR: { key: 'INTERIOR', title: 'Ministry of Interior', summary: 'Civil registry, identity, internal coordination.', defaultDepartments: ['Civil Registry', 'Identity', 'Coordination'], defaultModules: ['civil-registry', 'identity', 'permits'], domainEntities: ['CivilRecord', 'IdentityCredential', 'Permit'] },
  LABOR: { key: 'LABOR', title: 'Ministry of Labor', summary: 'Employment, inspections, social insurance, disputes.', defaultDepartments: ['Employment', 'Inspections', 'Social Insurance'], defaultModules: ['employment-registry', 'inspections', 'social-insurance', 'disputes'], domainEntities: ['Employer', 'Worker', 'Inspection', 'InsuranceClaim', 'Dispute'] },
  TRADE: { key: 'TRADE', title: 'Ministry of Trade & Industry', summary: 'Business registration, licensing, standards, exports.', defaultDepartments: ['Business Registration', 'Standards', 'Exports'], defaultModules: ['business-registry', 'licensing', 'standards', 'export-facilitation'], domainEntities: ['Business', 'Licence', 'Standard', 'ExportPermit'] },
  GENERIC: { key: 'GENERIC', title: 'Generic Ministry / Agency / Commission', summary: 'A blank institutional foundation to compose from scratch.', defaultDepartments: ['Administration'], defaultModules: ['documents', 'notifications'], domainEntities: ['Record'] },
};

export function listArchetypes(): Archetype[] {
  return Object.values(ARCHETYPES);
}
export function listMinistries(): Ministry[] {
  return [...db.ministries].sort(
    (a, b) => +new Date(b.createdAt) - +new Date(a.createdAt),
  );
}
export function getMinistry(id: string): Ministry | undefined {
  return db.ministries.find(m => m.id === id);
}
export function createMinistry(input: {
  archetype: ArchetypeKey;
  name: string;
  slug: string;
}): Ministry | { error: string } {
  const bp = ARCHETYPES[input.archetype];
  if (!bp) return { error: 'Unknown archetype' };
  if (!/^[a-z0-9-]+$/.test(input.slug)) {
    return { error: 'slug must be lowercase letters, digits, hyphens' };
  }
  if (db.ministries.some(m => m.slug === input.slug)) {
    return { error: 'slug already used' };
  }
  const m: Ministry = {
    id: uid('MIN'),
    slug: input.slug,
    name: input.name,
    archetype: input.archetype,
    status: 'active',
    createdAt: new Date().toISOString(),
    departments: bp.defaultDepartments.map(name => ({ id: uid('DEP'), name })),
    modules: bp.defaultModules.map(moduleKey => ({ moduleKey, enabled: true })),
  };
  db.ministries.unshift(m);
  appendAudit('operator', 'ministry.create', `Ministry:${m.id}`, 'ok', `${input.archetype}/${input.slug}`);
  return m;
}
export function renameMinistry(id: string, name: string): Ministry | { error: string } {
  const m = getMinistry(id);
  if (!m) return { error: 'Ministry not found' };
  m.name = name;
  appendAudit('operator', 'ministry.rename', `Ministry:${id}`, 'ok', name);
  return m;
}
export function deactivateMinistry(id: string): Ministry | { error: string } {
  const m = getMinistry(id);
  if (!m) return { error: 'Ministry not found' };
  m.status = 'deactivated';
  appendAudit('operator', 'ministry.deactivate', `Ministry:${id}`, 'ok');
  return m;
}
export function mergeMinistry(sourceId: string, targetId: string): Ministry | { error: string } {
  if (sourceId === targetId) return { error: 'Cannot merge into itself' };
  const src = getMinistry(sourceId);
  const tgt = getMinistry(targetId);
  if (!src || !tgt) return { error: 'Ministry not found' };
  if (src.status !== 'active' || tgt.status !== 'active') {
    return { error: 'Both ministries must be active' };
  }
  for (const d of src.departments) {
    if (!tgt.departments.some(x => x.name === d.name)) tgt.departments.push(d);
  }
  for (const mod of src.modules) {
    if (!tgt.modules.some(x => x.moduleKey === mod.moduleKey)) tgt.modules.push(mod);
  }
  src.status = 'merged';
  src.mergedIntoId = targetId;
  src.departments = [];
  src.modules = [];
  appendAudit('operator', 'ministry.merge', `Ministry:${sourceId}`, 'ok', `-> ${targetId}`);
  return tgt;
}
export function addDepartment(ministryId: string, name: string): Ministry | { error: string } {
  const m = getMinistry(ministryId);
  if (!m) return { error: 'Ministry not found' };
  if (m.departments.some(d => d.name === name)) return { error: 'Department exists' };
  m.departments.push({ id: uid('DEP'), name });
  appendAudit('operator', 'department.add', `Ministry:${ministryId}`, 'ok', name);
  return m;
}
export function removeDepartment(ministryId: string, deptId: string): Ministry | { error: string } {
  const m = getMinistry(ministryId);
  if (!m) return { error: 'Ministry not found' };
  m.departments = m.departments.filter(d => d.id !== deptId);
  appendAudit('operator', 'department.remove', `Ministry:${ministryId}`, 'ok', deptId);
  return m;
}
export function setModule(ministryId: string, moduleKey: string, enabled: boolean): Ministry | { error: string } {
  const m = getMinistry(ministryId);
  if (!m) return { error: 'Ministry not found' };
  const existing = m.modules.find(x => x.moduleKey === moduleKey);
  if (existing) existing.enabled = enabled;
  else m.modules.push({ moduleKey, enabled });
  appendAudit('operator', 'module.set', `Ministry:${ministryId}`, 'ok', `${moduleKey}=${enabled}`);
  return m;
}

// ── Module operations (archetype-driven dashboards) ───────────────────
// Deterministic seeded value so a ministry's operational picture is stable
// across reads; derived from real platform data where it exists.
function seededInt(seed: string, min: number, max: number): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  const r = ((h >>> 0) % 1000) / 1000;
  return Math.round(min + r * (max - min));
}

export function ministryOperations(id: string): MinistryOperations | { error: string } {
  const m = getMinistry(id);
  if (!m) return { error: 'Ministry not found' };

  // Real-data hooks: where a module maps onto existing platform data, use it.
  const openPermits = db.permits.filter(p =>
    ['submitted', 'in-review', 'needs-info'].includes(p.status),
  ).length;

  const modules: ModuleOps[] = m.modules
    .filter(mod => mod.enabled)
    .map(mod => {
      const spec = specFor(mod.moduleKey);
      const kpis: KpiValue[] = spec.kpis.map(k => {
        const raw = seededInt(`${id}:${mod.moduleKey}:${k.key}`, k.range[0], k.range[1]);
        const good =
          k.direction === 'higher-better' ? raw >= k.target : raw <= k.target;
        const near =
          k.direction === 'higher-better'
            ? raw >= k.target * 0.9
            : raw <= k.target * 1.15;
        const tone: OpsTone = good ? 'ok' : near ? 'warn' : 'alert';
        return {
          label: k.label,
          value: `${raw}${k.unit ?? ''}`,
          tone,
          target: `${k.target}${k.unit ?? ''}`,
        };
      });
      const queues: QueueValue[] = spec.queues.map(q => {
        let depth = seededInt(`${id}:${mod.moduleKey}:${q.key}:d`, q.range[0], q.range[1]);
        // Health licensing queue reflects real open permits.
        if (mod.moduleKey === 'licensing' && m.archetype === 'HEALTH') {
          depth = openPermits;
        }
        const oldest = seededInt(`${id}:${mod.moduleKey}:${q.key}:o`, 1, Math.round(q.slaHours * 1.2));
        return {
          label: q.label,
          depth,
          oldestAgeHours: oldest,
          slaHours: q.slaHours,
          breaching: oldest > q.slaHours,
        };
      });
      const alerts: AlertValue[] = spec.alerts.map(a => {
        const roll = seededInt(`${id}:${mod.moduleKey}:${a.key}`, 0, 100) / 100;
        return {
          label: a.label,
          severity: a.severity,
          active: roll < a.likelihood,
          detail: a.detail,
        };
      });
      return { module: mod.moduleKey, title: spec.title, kpis, queues, alerts };
    });

  return {
    ministry: { id: m.id, name: m.name, archetype: m.archetype, status: m.status },
    generatedAt: new Date().toISOString(),
    modules,
  };
}

// ── Deep operational console (regions, queues, analytics) ─────────────
const REGIONS = ['Central', 'Coast', 'Eastern', 'Nairobi', 'Rift Valley', 'Western'];

export function regionsFor(id: string): MinistryRegions | { error: string } {
  const m = getMinistry(id);
  if (!m) return { error: 'Ministry not found' };
  const openPermits = db.permits.filter(p =>
    ['submitted', 'in-review', 'needs-info'].includes(p.status),
  ).length;
  const regions: RegionStat[] = REGIONS.map((region, i) => {
    const facil = seededInt(`${id}:${region}:facil`, 78, 99);
    const cap = seededInt(`${id}:${region}:cap`, 45, 95);
    const sla = seededInt(`${id}:${region}:sla`, 0, 6);
    // Spread real open permits across regions deterministically.
    const openCases =
      seededInt(`${id}:${region}:open`, 4, 60) + (i === 0 ? openPermits : 0);
    const status: OpsTone =
      facil < 85 || sla > 3 ? 'alert' : facil < 92 || sla > 1 ? 'warn' : 'ok';
    return {
      region,
      facilitiesOperationalPct: facil,
      capacityPct: cap,
      openCases,
      slaBreaches: sla,
      status,
    };
  });
  const prof = profileFor(m.archetype);
  return {
    ministry: { id: m.id, name: m.name, archetype: m.archetype },
    labels: {
      unit: prof.regionUnitLabel,
      capacity: prof.capacityLabel,
      cases: prof.caseLabel,
    },
    generatedAt: new Date().toISOString(),
    regions,
  };
}

export function analyticsFor(id: string): AnalyticDelta[] | { error: string } {
  const m = getMinistry(id);
  if (!m) return { error: 'Ministry not found' };
  // Archetype-specialised KPIs (Health ≠ Finance ≠ Transport …).
  const profile = profileFor(m.archetype);
  return profile.kpis.map(k => {
    const v = seededInt(`${id}:an:${k.key}`, k.range[0], k.range[1]);
    const d = seededInt(`${id}:an:${k.key}:d`, -120, 140) / 10;
    return {
      label: k.label,
      value: `${v}${k.unit}`,
      delta: d,
      goodWhenUp: k.goodWhenUp,
    };
  });
}

const PRIORITIES: QueuePriority[] = ['routine', 'elevated', 'urgent'];

function seedQueue(id: string): QueueItem[] {
  const m = getMinistry(id);
  const count = 9;
  const items: QueueItem[] = [];
  // Health: lead with real open permits as licensing items.
  if (m?.archetype === 'HEALTH') {
    db.permits
      .filter(p => ['submitted', 'in-review', 'needs-info'].includes(p.status))
      .forEach(p => {
        items.push({
          id: `Q-${p.id}`,
          ref: p.id,
          subject: p.title,
          region: 'Nairobi',
          ageHours: Math.max(1, Math.round((Date.now() - new Date(p.submittedAt ?? Date.now()).getTime()) / 3_600_000)),
          priority: 'elevated',
          state: 'open',
        });
      });
  }
  for (let i = items.length; i < count; i++) {
    const pr = PRIORITIES[seededInt(`${id}:q:${i}:pr`, 0, 2)]!;
    items.push({
      id: `Q-${id.slice(-4)}-${i}`,
      ref: `APP-${seededInt(`${id}:q:${i}:r`, 1000, 9999)}`,
      subject: m ? profileFor(m.archetype).queueSubject : 'Service application',
      region: REGIONS[seededInt(`${id}:q:${i}:rg`, 0, REGIONS.length - 1)]!,
      ageHours: seededInt(`${id}:q:${i}:a`, 2, 360),
      priority: pr,
      state: 'open',
    });
  }
  return items;
}

export function queueFor(id: string): MinistryQueue | { error: string } {
  const m = getMinistry(id);
  if (!m) return { error: 'Ministry not found' };
  if (!db.ministryQueues[id]) db.ministryQueues[id] = seedQueue(id);
  const title = profileFor(m.archetype).queueTitle;
  return {
    ministry: { id: m.id, name: m.name, archetype: m.archetype },
    queueKey: 'approvals',
    title,
    slaHours: 288,
    items: db.ministryQueues[id]!,
  };
}

export function actOnQueueItem(
  id: string,
  itemId: string,
  action: QueueAction,
  by: string,
  note?: string,
): QueueItem | { error: string } {
  const q = db.ministryQueues[id];
  if (!q) return { error: 'Queue not found' };
  const item = q.find(x => x.id === itemId);
  if (!item) return { error: 'Item not found' };
  if (item.state === 'cleared') return { error: 'Item already cleared' };
  const nextState: Record<QueueAction, QueueItemState> = {
    assign: 'assigned',
    escalate: 'escalated',
    clear: 'cleared',
  };
  item.state = nextState[action];
  if (action === 'assign') item.assignee = by;
  if (note) item.note = note;
  appendAudit(by, `queue.${action}`, `QueueItem:${itemId}`, 'ok', item.ref);
  return item;
}

// ── Archetype-specialised: incidents + escalation, field operations ───
function seedIncidents(id: string, archetype: ArchetypeKey): MinistryIncident[] {
  const prof = profileFor(archetype);
  return prof.incidentTypes.map(t => {
    const roll = seededInt(`${id}:inc:${t.key}`, 0, 100) / 100;
    return {
      key: t.key,
      label: t.label,
      severity: t.severity,
      detail: t.detail,
      active: roll < t.likelihood,
      tierIndex: 0,
    };
  });
}

export function incidentsFor(id: string): MinistryIncidents | { error: string } {
  const m = getMinistry(id);
  if (!m) return { error: 'Ministry not found' };
  if (!db.ministryIncidents[id]) {
    db.ministryIncidents[id] = seedIncidents(id, m.archetype);
  }
  return {
    ministry: { id: m.id, name: m.name, archetype: m.archetype },
    escalation: profileFor(m.archetype).escalation,
    incidents: db.ministryIncidents[id]!,
  };
}

export function escalateMinistryIncident(
  id: string,
  key: string,
  by: string,
): MinistryIncident | { error: string } {
  const m = getMinistry(id);
  if (!m) return { error: 'Ministry not found' };
  if (!db.ministryIncidents[id]) {
    db.ministryIncidents[id] = seedIncidents(id, m.archetype);
  }
  const chain = profileFor(m.archetype).escalation;
  const inc = db.ministryIncidents[id]!.find(x => x.key === key);
  if (!inc) return { error: 'Incident not found' };
  if (!inc.active) return { error: 'Incident is not active' };
  if (inc.tierIndex >= chain.length - 1) {
    return { error: 'Already at top of escalation chain' };
  }
  inc.tierIndex += 1;
  appendAudit(
    by,
    'ministry-incident.escalate',
    `Ministry:${id}/${key}`,
    'ok',
    `-> ${chain[inc.tierIndex]}`,
  );
  return inc;
}

export function resolveMinistryIncident(
  id: string,
  key: string,
  by: string,
): MinistryIncident | { error: string } {
  const m = getMinistry(id);
  if (!m) return { error: 'Ministry not found' };
  const list = db.ministryIncidents[id];
  const inc = list?.find(x => x.key === key);
  if (!inc) return { error: 'Incident not found' };
  inc.active = false;
  inc.tierIndex = 0;
  appendAudit(by, 'ministry-incident.resolve', `Ministry:${id}/${key}`, 'ok');
  return inc;
}

export function fieldOpsFor(id: string): MinistryFieldOps | { error: string } {
  const m = getMinistry(id);
  if (!m) return { error: 'Ministry not found' };
  const prof = profileFor(m.archetype);
  const units: FieldUnitStatus[] = prof.fieldUnits.map(u => {
    const counts = u.states.map(state => ({
      state,
      n: seededInt(`${id}:fld:${u.key}:${state}`, 0, 24),
    }));
    return {
      unit: u.key,
      label: u.label,
      counts,
      total: counts.reduce((s, c) => s + c.n, 0),
    };
  });
  return {
    ministry: { id: m.id, name: m.name, archetype: m.archetype },
    units,
  };
}

// ── Sovereign profile + cabinet (global-state neutrality) ────────────
export function getSovereign(): SovereignProfile {
  return db.sovereign;
}

const STATE_FORMS = ['republic', 'federation', 'monarchy', 'city-state', 'union', 'parliamentary'];

export function setSovereign(
  patch: Partial<SovereignProfile>,
  by: string,
): SovereignProfile | { error: string } {
  if (patch.stateForm && !STATE_FORMS.includes(patch.stateForm)) {
    return { error: 'Unknown state form' };
  }
  db.sovereign = { ...db.sovereign, ...patch };
  appendAudit(by, 'sovereign.configure', 'Sovereign:profile', 'ok',
    patch.stateForm ?? patch.stateName);
  return db.sovereign;
}

export function cabinetOverview(): CabinetOverview {
  const ministries = db.ministries.filter(m => m.status !== 'merged');
  const institutions = ministries.map(m => {
    const q = db.ministryQueues[m.id] ?? [];
    const inc = db.ministryIncidents[m.id] ?? [];
    return {
      id: m.id,
      name: m.name,
      archetype: m.archetype,
      status: m.status,
      openQueue: q.filter(x => x.state !== 'cleared').length,
      activeIncidents: inc.filter(x => x.active).length,
    };
  });
  const audit = verifyAuditChain();
  return {
    sovereign: db.sovereign,
    generatedAt: new Date().toISOString(),
    institutions,
    totals: {
      institutions: ministries.length,
      activeMinistries: ministries.filter(m => m.status === 'active').length,
      activeIncidents: institutions.reduce((s, i) => s + i.activeIncidents, 0),
      queuesBreaching: institutions.filter(i => i.openQueue > 6).length,
      auditIntact: audit.ok,
    },
  };
}

// ── Command visualisation series (deterministic period trend) ─────────
export function seriesFor(id: string): MinistrySeries | { error: string } {
  const m = getMinistry(id);
  if (!m) return { error: 'Ministry not found' };
  const prof = profileFor(m.archetype);
  const series: AnalyticSeries[] = prof.kpis.map(k => {
    const lo = k.range[0];
    const hi = k.range[1];
    const points: number[] = [];
    for (let t = 0; t < 12; t++) {
      points.push(seededInt(`${id}:ser:${k.key}:${t}`, lo, hi));
    }
    const current = points[points.length - 1]!;
    const mean = Math.round(points.reduce((a, b) => a + b, 0) / points.length);
    return {
      key: k.key,
      label: k.label,
      unit: k.unit,
      points,
      current,
      mean,
      goodWhenUp: k.goodWhenUp,
    };
  });
  return {
    ministry: { id: m.id, name: m.name, archetype: m.archetype },
    series,
  };
}

// ── Multi-country sovereign presets (global-state neutrality) ─────────
export const SOVEREIGN_PRESETS: SovereignPreset[] = [
  { key: 'parliamentary-republic', label: 'Parliamentary republic',
    profile: { stateName: 'Republic', stateForm: 'parliamentary', executiveTitle: 'Prime Minister', legislatureName: 'Parliament', currency: 'USD', regionNoun: 'county', locale: 'en', accent: '#1f3a5f', motto: 'Through Parliament, the people govern' } },
  { key: 'presidential-republic', label: 'Presidential republic',
    profile: { stateName: 'Republic', stateForm: 'republic', executiveTitle: 'President', legislatureName: 'National Assembly', currency: 'USD', regionNoun: 'region', locale: 'en', accent: '#1f2630', motto: 'Liberty · Order · Service' } },
  { key: 'federation', label: 'Federation',
    profile: { stateName: 'Federal Republic', stateForm: 'federation', executiveTitle: 'Chancellor', legislatureName: 'Federal Assembly', currency: 'EUR', regionNoun: 'state', locale: 'en', accent: '#23303a', motto: 'Unity of the states' } },
  { key: 'constitutional-monarchy', label: 'Constitutional monarchy',
    profile: { stateName: 'Kingdom', stateForm: 'monarchy', executiveTitle: 'Prime Minister', legislatureName: 'Council of State', currency: 'GBP', regionNoun: 'province', locale: 'en', accent: '#3a2342', motto: 'Crown and Constitution' } },
  { key: 'emirate', label: 'Emirate / Gulf state',
    profile: { stateName: 'Emirate', stateForm: 'monarchy', executiveTitle: 'Prime Minister', legislatureName: 'Federal National Council', currency: 'AED', regionNoun: 'emirate', locale: 'ar', accent: '#1d3b34', motto: 'الله · الوطن · القيادة' } },
  { key: 'city-state', label: 'City-state',
    profile: { stateName: 'City-State', stateForm: 'city-state', executiveTitle: 'Prime Minister', legislatureName: 'Parliament', currency: 'SGD', regionNoun: 'district', locale: 'en', accent: '#1f3a3a', motto: 'One city, one nation' } },
  { key: 'union', label: 'Supranational union',
    profile: { stateName: 'Union', stateForm: 'union', executiveTitle: 'High Representative', legislatureName: 'Union Council', currency: 'EUR', regionNoun: 'member state', locale: 'en', accent: '#1b3a5b', motto: 'United in diversity' } },
];

export function listSovereignPresets(): SovereignPreset[] {
  return SOVEREIGN_PRESETS;
}

export function applySovereignPreset(
  key: string,
  by: string,
): SovereignProfile | { error: string } {
  const preset = SOVEREIGN_PRESETS.find(p => p.key === key);
  if (!preset) return { error: 'Unknown preset' };
  db.sovereign = { ...preset.profile };
  appendAudit(by, 'sovereign.preset', `Sovereign:${key}`, 'ok', preset.label);
  return db.sovereign;
}

// ── National executive snapshot (cross-ministry, realistic) ───────────
function ensureIncidentsSeeded(): void {
  for (const m of db.ministries) {
    if (m.status === 'merged') continue;
    if (!db.ministryIncidents[m.id]) {
      db.ministryIncidents[m.id] = seedIncidents(m.id, m.archetype);
    }
    if (!db.ministryQueues[m.id]) {
      db.ministryQueues[m.id] = seedQueue(m.id);
    }
  }
}

// Cross-ministry dependency model — which institutions an institution
// supplies or underwrites. Directed: from → to ("from" supports "to").
const COORDINATION_DEPS: Partial<Record<ArchetypeKey, { to: ArchetypeKey; relation: string }[]>> = {
  FINANCE: [
    { to: 'HEALTH', relation: 'funds' }, { to: 'EDUCATION', relation: 'funds' },
    { to: 'ENERGY', relation: 'funds' }, { to: 'TRANSPORT', relation: 'funds' },
    { to: 'INTERIOR', relation: 'funds' }, { to: 'JUSTICE', relation: 'funds' },
  ],
  ENERGY: [
    { to: 'HEALTH', relation: 'supplies' }, { to: 'TRANSPORT', relation: 'supplies' },
    { to: 'INTERIOR', relation: 'supplies' }, { to: 'EDUCATION', relation: 'supplies' },
    { to: 'ENVIRONMENT', relation: 'supplies' },
  ],
  TRANSPORT: [
    { to: 'HEALTH', relation: 'moves' }, { to: 'AGRICULTURE', relation: 'moves' },
    { to: 'TRADE', relation: 'moves' }, { to: 'INTERIOR', relation: 'moves' },
  ],
  INTERIOR: [
    { to: 'JUSTICE', relation: 'secures' }, { to: 'HEALTH', relation: 'secures' },
    { to: 'TRANSPORT', relation: 'secures' }, { to: 'ENERGY', relation: 'secures' },
  ],
  JUSTICE: [{ to: 'INTERIOR', relation: 'adjudicates' }, { to: 'LABOR', relation: 'adjudicates' }],
  LABOR: [{ to: 'HEALTH', relation: 'staffs' }, { to: 'EDUCATION', relation: 'staffs' }],
  ENVIRONMENT: [{ to: 'ENERGY', relation: 'regulates' }, { to: 'AGRICULTURE', relation: 'regulates' }],
  TRADE: [{ to: 'AGRICULTURE', relation: 'enables' }, { to: 'FINANCE', relation: 'enables' }],
  AGRICULTURE: [{ to: 'HEALTH', relation: 'feeds' }],
};
const SEV_WEIGHT: Record<IncidentSeverity, number> = { sev1: 100, sev2: 78, sev3: 50, sev4: 28 };
const RELATION_COUPLING: Record<string, number> = {
  funds: 0.9, supplies: 0.8, secures: 0.7, moves: 0.6, staffs: 0.55,
  regulates: 0.5, feeds: 0.5, enables: 0.5, adjudicates: 0.5,
};

function toneForRisk(r: number): OpsTone {
  return r >= 67 ? 'alert' : r >= 34 ? 'warn' : 'ok';
}

export function nationalCoordination(): NationalCoordination {
  ensureIncidentsSeeded();
  const active = db.ministries.filter(m => m.status === 'active');
  const byArch = new Map<ArchetypeKey, typeof active[number]>();
  for (const m of active) if (!byArch.has(m.archetype)) byArch.set(m.archetype, m);

  const nodes: CoordinationNode[] = active.map(m => {
    const incs = (db.ministryIncidents[m.id] ?? []).filter(i => i.active);
    const queue = (db.ministryQueues[m.id] ?? []).filter(x => x.state !== 'cleared');
    const slaBreaching = queue.length > 6;
    let risk = incs.reduce((mx, i) => Math.max(mx, SEV_WEIGHT[i.severity]), 0);
    if (slaBreaching) risk = Math.min(100, risk + 15 + Math.min(20, (queue.length - 6) * 3));
    else risk = Math.min(100, risk + Math.min(12, queue.length * 2));
    const sevRank: IncidentSeverity[] = ['sev1', 'sev2', 'sev3', 'sev4'];
    const topSeverity =
      incs.length === 0
        ? null
        : sevRank.find(s => incs.some(i => i.severity === s)) ?? null;
    return {
      ministryId: m.id,
      ministry: m.name,
      archetype: m.archetype,
      riskScore: risk,
      posture: toneForRisk(risk),
      activeIncidents: incs.length,
      topSeverity,
      queueDepth: queue.length,
      slaBreaching,
    };
  });
  const nodeById = new Map(nodes.map(n => [n.ministryId, n]));

  const edges: CoordinationEdge[] = [];
  for (const m of active) {
    for (const dep of COORDINATION_DEPS[m.archetype] ?? []) {
      const target = byArch.get(dep.to);
      if (!target || target.id === m.id) continue;
      const from = nodeById.get(m.id);
      if (!from) continue;
      const coupling = RELATION_COUPLING[dep.relation] ?? 0.5;
      edges.push({
        fromId: m.id,
        toId: target.id,
        from: m.name,
        to: target.name,
        relation: dep.relation,
        propagatedRisk: Math.round(from.riskScore * coupling),
      });
    }
  }

  const timeline: OpsTimelineEvent[] = [];
  const now = Date.now();
  for (const e of [...db.audit].slice(-16)) {
    const a = e.action.toLowerCase();
    const tone: OpsTone =
      e.outcome === 'error' || e.outcome === 'denied'
        ? 'alert'
        : a.includes('escalate')
          ? 'warn'
          : a.startsWith('sovereign')
            ? 'neutral'
            : 'ok';
    timeline.push({
      at: e.at,
      kind: a.startsWith('sovereign') ? 'sovereign' : a.includes('escalate') ? 'escalation' : 'audit',
      tone,
      title: `${e.actor} · ${e.action}`,
      detail: `${e.resource}${e.detail ? ` — ${e.detail}` : ''}`,
    });
  }
  for (const m of active) {
    for (const inc of (db.ministryIncidents[m.id] ?? []).filter(i => i.active)) {
      const offsetMin = seededInt(`tl:${m.id}:${inc.key}`, 6, 2160);
      timeline.push({
        at: new Date(now - offsetMin * 60_000).toISOString(),
        ministryId: m.id,
        ministry: m.name,
        kind: 'incident',
        tone: inc.severity === 'sev1' || inc.severity === 'sev2' ? 'alert' : inc.severity === 'sev3' ? 'warn' : 'neutral',
        title: `${m.name}: ${inc.label}`,
        detail: `${inc.severity.toUpperCase()} — ${inc.detail}`,
      });
    }
    const n = nodeById.get(m.id);
    if (n?.slaBreaching) {
      timeline.push({
        at: new Date(now - seededInt(`tl:sla:${m.id}`, 12, 600) * 60_000).toISOString(),
        ministryId: m.id,
        ministry: m.name,
        kind: 'sla',
        tone: 'warn',
        title: `${m.name}: approvals queue breaching SLA`,
        detail: `${n.queueDepth} items beyond service threshold`,
      });
    }
  }
  timeline.sort((a, b) => (a.at < b.at ? 1 : -1));

  const pinnedIncidents: CoordinationPinned[] = [];
  for (const m of active) {
    const chain = profileFor(m.archetype).escalation;
    for (const inc of (db.ministryIncidents[m.id] ?? []).filter(i => i.active)) {
      if (inc.severity !== 'sev1' && inc.severity !== 'sev2') continue;
      const affects = (COORDINATION_DEPS[m.archetype] ?? [])
        .map(d => byArch.get(d.to))
        .filter((x): x is typeof active[number] => !!x && x.id !== m.id)
        .map(x => x.name);
      pinnedIncidents.push({
        ministryId: m.id,
        ministry: m.name,
        label: inc.label,
        severity: inc.severity,
        authority: chain[inc.tierIndex] ?? '—',
        affects,
      });
    }
  }
  pinnedIncidents.sort((a, b) => a.severity.localeCompare(b.severity));

  const avgNode = nodes.length
    ? Math.round(nodes.reduce((s, n) => s + n.riskScore, 0) / nodes.length)
    : 0;
  const maxEdge = edges.reduce((mx, e) => Math.max(mx, e.propagatedRisk), 0);
  const nationalRisk = Math.round(0.65 * avgNode + 0.35 * maxEdge);
  const cascadeRisks = edges.filter(e => e.propagatedRisk >= 50).length;
  const level = toneForRisk(nationalRisk);

  return {
    sovereign: db.sovereign,
    generatedAt: new Date().toISOString(),
    posture: {
      level,
      label: level === 'alert' ? 'CRITICAL' : level === 'warn' ? 'STRAINED' : 'STABLE',
      nationalRisk,
      coordinatingMinistries: nodes.length,
      cascadeRisks,
    },
    nodes,
    edges,
    timeline: timeline.slice(0, 28),
    pinnedIncidents,
  };
}

export function nationalSnapshot(): NationalSnapshot {
  ensureIncidentsSeeded();
  const ministries = db.ministries.filter(m => m.status !== 'merged');
  const active = ministries.filter(m => m.status === 'active');

  // Realistic national figures, deterministic per configured state.
  const seedKey = db.sovereign.stateName;
  const popM = seededInt(`nat:${seedKey}:pop`, 8, 210);          // 8–210 M
  const regionsN = seededInt(`nat:${seedKey}:reg`, 6, 36);
  const fiscalIdx = seededInt(`nat:${seedKey}:fis`, 78, 118);    // budget exec index
  const svcAvail = seededInt(`nat:${seedKey}:svc`, 92, 100);

  const indicators: NationalIndicator[] = [
    { label: 'Population', value: String(popM), unit: 'M' },
    { label: db.sovereign.regionNoun + 's', value: String(regionsN), unit: '' },
    { label: 'Fiscal execution index', value: String(fiscalIdx), unit: '' },
    { label: 'Service availability', value: String(svcAvail), unit: '%' },
    { label: 'Institutions', value: String(ministries.length), unit: '' },
  ];

  const crossMinistryIncidents: CrossMinistryIncident[] = [];
  for (const m of active) {
    const list = db.ministryIncidents[m.id] ?? [];
    const chain = profileFor(m.archetype).escalation;
    for (const inc of list) {
      if (inc.active) {
        crossMinistryIncidents.push({
          ministryId: m.id,
          ministry: m.name,
          archetype: m.archetype,
          label: inc.label,
          severity: inc.severity,
          authority: chain[inc.tierIndex] ?? '—',
        });
      }
    }
  }
  crossMinistryIncidents.sort((a, b) => a.severity.localeCompare(b.severity));

  const queuesBreaching = active.filter(
    m => (db.ministryQueues[m.id] ?? []).filter(x => x.state !== 'cleared').length > 6,
  ).length;
  const audit = verifyAuditChain();

  return {
    sovereign: db.sovereign,
    generatedAt: new Date().toISOString(),
    classification: 'OFFICIAL',
    environment: 'Production',
    indicators,
    crossMinistryIncidents,
    totals: {
      institutions: ministries.length,
      activeMinistries: active.length,
      activeIncidents: crossMinistryIncidents.length,
      queuesBreaching,
      auditIntact: audit.ok,
    },
  };
}
