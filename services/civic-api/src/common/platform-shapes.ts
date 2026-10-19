// The CivicOS platform's records (app/src/lib/api/types.ts) in civic-api's
// shapes (prisma/schema.prisma). One set of converters serves both
// directions this service has with the platform:
//   - forwarded writes (forward.ts) answer in civic-api's shape;
//   - the mirror follower (src/mirror/follower.ts) writes these rows.
// So a record reads the same whether it came back from a forwarded write or
// from civic-api's own (mirrored) tables. No decorators, no Prisma import.

/** Mirrored rows belong to tenants named after the platform's (`platform:home`). */
export const tenantIdOf = (platformTenant: string): string => `platform:${platformTenant}`;
export const platformTenantOf = (tenantId: string): string => tenantId.replace(/^platform:/, '');
/** A ministry's department, by the ministry: the platform's department ids are unique only within one ministry. */
export const departmentId = (ministryId: string, deptId: string): string => `${ministryId}:${deptId}`;
export const platformDepartmentId = (ministryId: string, mirrorId: string): string =>
  mirrorId.startsWith(`${ministryId}:`) ? mirrorId.slice(ministryId.length + 1) : mirrorId;
export const moduleActivationId = (ministryId: string, moduleKey: string): string => `${ministryId}:${moduleKey}`;
/** What civic-api's key and secret columns hold for records whose credentials only the platform keeps. */
export const HELD_BY_PLATFORM = 'held-by-platform';

/** 'needs-info' → 'NEEDS_INFO'. */
export const up = (s: string | undefined | null): string => String(s ?? '').toUpperCase().replace(/-/g, '_');
/** 'NEEDS_INFO' → 'needs-info'. */
export const down = (s: string | undefined | null): string => String(s ?? '').toLowerCase().replace(/_/g, '-');
const date = (s: string | undefined | null): Date | null => (s ? new Date(s) : null);
const req = (s: string | undefined | null): Date => (s ? new Date(s) : new Date(0));

// ── The platform's records (only the fields civic-api uses) ────────────────
export interface PMinistry { id: string; slug: string; name: string; archetype: string; status: string; mergedIntoId?: string; createdAt: string; departments: { id: string; name: string }[]; modules: { moduleKey: string; enabled: boolean }[] }
export interface PPermit { id: string; type: string; title: string; applicantName: string; municipality: string; status: string; submittedAt?: string; decisionDue?: string; officerName?: string; aiClass?: string; fields: Record<string, string>; timeline: { status: string; at: string; note?: string; officerName?: string }[] }
export interface PBill { id: string; kind: string; description: string; amountMinor: number; currency: string; dueDate: string; status: string }
export interface PReceipt { id: string; billId: string; amountMinor: number; currency: string; rail: string; paidAt: string; hash: string }
export interface PIncident { id: string; severity: string; title: string; scope: string; status: string; openedAt: string; acknowledgedAt?: string; resolvedAt?: string; owner?: string; events: unknown[] }
export interface PIntegration { id: string; kind: string; name: string; ownerOrg: string; scopes: string[]; status: string; rateLimitRpm: number; createdAt: string; approvedBy?: string }
export interface PGrant { id: string; fromTenant: string; toTenant: string; scopes: string[]; status: string; reason: string; createdAt: string; approvedBy?: string; expiresAt?: string }
export interface PWebhook { id: string; topic: string; url: string; status: string; failures: number; createdAt: string }
export interface PRelease { id: string; version: string; channel: string; notes: string; schemaMigration?: string; approvedBy?: string; createdAt: string }
export interface PDeployment { id: string; releaseId: string; strategy: string; state: string; gates: unknown[]; startedAt: string; completedAt?: string }
export interface PBackup { id: string; kind: string; state: string; location: string; encrypted: boolean; sizeBytes?: number; createdAt: string }
export interface PConfig { id: string; scope: string; version: number; contentHash: string; signedBy?: string; state: string; createdAt: string }
export interface PLifecycle { tenant: string; state: string; events: { at: string; from: string; to: string; reason: string; actor: string }[] }

// ── civic-api's shapes ───────────────────────────────────────────────────
export const civicDepartment = (ministryId: string, d: { id: string; name: string }) =>
  ({ id: departmentId(ministryId, d.id), ministryId, name: d.name });
export const civicModule = (ministryId: string, x: { moduleKey: string; enabled: boolean }) =>
  ({ id: moduleActivationId(ministryId, x.moduleKey), ministryId, moduleKey: x.moduleKey, enabled: !!x.enabled });
export const civicMinistry = (m: PMinistry) => ({
  id: m.id, slug: m.slug, name: m.name, archetype: up(m.archetype), status: up(m.status),
  mergedIntoId: m.mergedIntoId ?? null, createdAt: req(m.createdAt),
  departments: (m.departments ?? []).map(d => civicDepartment(m.id, d)),
  modules: (m.modules ?? []).map(x => civicModule(m.id, x)),
});

export const civicTransitions = (p: PPermit) => (p.timeline ?? []).map((t, i) => ({
  id: `${p.id}:${i}`, permitId: p.id, status: up(t.status), note: t.note ?? null, officerName: t.officerName ?? null, at: req(t.at),
}));
export const civicPermit = (p: PPermit) => ({
  id: p.id, type: up(p.type), title: p.title, status: up(p.status), fields: p.fields ?? {},
  applicantName: p.applicantName ?? null, municipality: p.municipality ?? null, citizenId: null as string | null,
  aiClass: p.aiClass ?? null, submittedAt: req(p.submittedAt), decisionDueAt: date(p.decisionDue),
  timeline: civicTransitions(p),
});

export const civicBill = (b: PBill) => ({
  id: b.id, kind: up(b.kind), description: b.description, amountMinor: b.amountMinor, currency: b.currency,
  dueDate: req(b.dueDate), status: up(b.status), citizenId: null as string | null,
});
export const civicReceipt = (r: PReceipt) => ({
  id: r.id, billId: r.billId, kind: 'payment', amountMinor: r.amountMinor, currency: r.currency, rail: r.rail,
  hash: r.hash, prevHash: null as string | null, createdAt: req(r.paidAt),
  payload: { source: 'platform', billId: r.billId, amountMinor: r.amountMinor, currency: r.currency, rail: r.rail, paidAt: r.paidAt },
});

export const civicIncident = (i: PIncident) => ({
  id: i.id, severity: up(i.severity), title: i.title, scope: i.scope, status: up(i.status), owner: i.owner ?? null,
  openedAt: req(i.openedAt), acknowledgedAt: date(i.acknowledgedAt), resolvedAt: date(i.resolvedAt), events: i.events ?? [],
});

export const civicIntegration = (c: PIntegration) => ({
  id: c.id, kind: up(c.kind), name: c.name, ownerOrg: c.ownerOrg, scopes: c.scopes ?? [], status: up(c.status),
  rateLimitRpm: c.rateLimitRpm ?? 120, approvedBy: c.approvedBy ?? null, createdAt: req(c.createdAt),
});
export const civicGrant = (g: PGrant) => ({
  id: g.id, fromTenantId: tenantIdOf(g.fromTenant), toTenantId: tenantIdOf(g.toTenant), scopes: g.scopes ?? [], status: up(g.status),
  reason: g.reason, approvedBy: g.approvedBy ?? null, expiresAt: date(g.expiresAt), createdAt: req(g.createdAt),
});
export const civicWebhook = (w: PWebhook) => ({
  id: w.id, topic: w.topic, url: w.url, status: up(w.status), failures: w.failures ?? 0, createdAt: req(w.createdAt),
});

export const civicRelease = (r: PRelease) => ({
  id: r.id, version: r.version, channel: up(r.channel), status: 'AVAILABLE', notes: r.notes,
  schemaMigration: r.schemaMigration ?? null, approvedBy: r.approvedBy ?? null, createdAt: req(r.createdAt),
});
export const civicDeployment = (d: PDeployment) => ({
  id: d.id, releaseId: d.releaseId, strategy: up(d.strategy), state: up(d.state), gates: d.gates ?? [],
  startedAt: req(d.startedAt), completedAt: date(d.completedAt),
});
export const civicBackup = (b: PBackup) => ({
  id: b.id, kind: up(b.kind), status: up(b.state), location: b.location, encrypted: b.encrypted !== false,
  sizeBytes: typeof b.sizeBytes === 'number' ? b.sizeBytes : null, createdAt: req(b.createdAt),
});
export const civicConfig = (c: PConfig) => ({
  id: c.id, scope: up(c.scope), version: c.version, contentHash: c.contentHash, signedBy: c.signedBy ?? null,
  status: up(c.state), createdAt: req(c.createdAt),
});
export const civicLifecycle = (l: PLifecycle) => ({
  tenantId: tenantIdOf(l.tenant), state: up(l.state),
  events: (l.events ?? []).map(e => ({ fromState: up(e.from), toState: up(e.to), reason: e.reason, actor: e.actor, at: req(e.at) })),
});
