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
  VerifyResult,
} from '@/lib/api/types';

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

  return { permits, bills, receipts, notifications, audit, incidents, tenantSync, integrations, grants, webhooks, releases, deployments, lifecycle, backups, configs };
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
