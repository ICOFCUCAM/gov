// Operational intelligence and platform incidents.
import { nationPaymentRail } from '@/lib/nation/registry';
import type {
  Incident,
  IncidentSeverity,
  OpsOverview,
  PermitStatus,
  QueueHealth,
  ServiceHealth,
  TenantHealth,
} from '@/lib/api/types';
import { db } from './state';
import { uid } from './shared';
import { recordAudit, verifyAuditChain } from './audit';

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
    { name: 'Payments rail', status: 'ok', latencyMs: 210, detail: `${nationPaymentRail()} + ISO 20022 reachable` },
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
  recordAudit(input.by, 'incident.open', `Incident:${inc.id}`, 'ok', input.title);
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
  recordAudit(by, `incident.${action}`, `Incident:${id}`, 'ok', note);
  return inc;
}

export const ackIncident = (id: string, by: string, note?: string) =>
  mutateIncident(id, by, 'acknowledged', note);
export const resolveIncident = (id: string, by: string, note?: string) =>
  mutateIncident(id, by, 'resolved', note);
export const escalateIncident = (id: string, by: string, note?: string) =>
  mutateIncident(id, by, 'escalated', note);
