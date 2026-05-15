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

  return { permits, bills, receipts, notifications, audit, incidents, tenantSync };
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
