// The mirror follower: the only writer of civic-api's tables (finding D8,
// one true copy). It keeps them current from the CivicOS platform, which
// owns every register civic-api holds:
//
//  - Events. civic-api is a webhook subscriber of the platform's event outbox
//    (app/src/lib/events/outbox.ts; topic `*`, address
//    <civic-api>/api/mirror/events). Each delivery is a CloudEvent signed
//    with the subscription's secret: X-CivicOS-Signature =
//    sha256=HMAC-SHA256(secret, `${X-CivicOS-Timestamp}.${body}`). The
//    signature and a timestamp within five minutes are checked before
//    anything is read. Events carry what changed (action, resource, audit
//    sequence), not the record, so an event of a mirrored register makes the
//    follower read that register from the platform's mirror feed and write it.
//  - The feed. GET <platform>/api/platform/mirror?registers=… with the
//    follower's own integration key (scope mirror:read), never a caller's
//    credentials: the registers in the platform's shapes, the audit sequence
//    they are current to, and the platform's own tenant.
//  - Idempotent by event id: an event already applied, or one at or below the
//    cursor (the audit sequence the mirror is known to be current to), is
//    acknowledged without writing. Rows, the event id and the cursor are
//    written in one step (MirrorStore.write).
//  - Full re-sync: at start and periodically (CIVICOS_MIRROR_RESYNC_MS), every
//    register is read and written, and the cursor moves to the feed's audit
//    sequence. It also covers events a subscriber never receives (those
//    before it subscribed).
//
// Storage sits behind MirrorStore (prisma-store.ts in the service; an
// in-memory one in the tests), so the rules run without a database.

import { createHmac, timingSafeEqual } from 'node:crypto';
import {
  HELD_BY_PLATFORM, civicBackup, civicBill, civicConfig, civicDeployment, civicGrant, civicIncident, civicIntegration,
  civicLifecycle, civicMinistry, civicPermit, civicReceipt, civicRelease, civicWebhook, tenantIdOf, up,
  type PBackup, type PBill, type PConfig, type PDeployment, type PGrant, type PIncident, type PIntegration, type PLifecycle,
  type PMinistry, type PPermit, type PReceipt, type PRelease, type PWebhook,
} from '../common/platform-shapes';

export const REGISTERS = ['institutions', 'permits', 'payments', 'incidents', 'releases', 'deployments', 'backups', 'configs', 'lifecycle', 'integrations', 'grants', 'webhooks'] as const;
export type RegisterName = (typeof REGISTERS)[number];

/** The platform's audited actions (event type `org.civicos.<action>`) → the registers they change. */
const EVENT_REGISTERS: [RegExp, RegisterName[]][] = [
  [/^(ministry|department|module)\./, ['institutions']],
  [/^permit\./, ['permits']],
  [/^payment\./, ['payments']],
  [/^incident\./, ['incidents']],
  [/^release\./, ['releases']],
  [/^deployment\./, ['deployments', 'releases']],
  [/^backup\./, ['backups']],
  [/^config\./, ['configs']],
  [/^tenant\./, ['lifecycle']],
  [/^integration\./, ['integrations']],
  [/^federation\.(propose|approved|revoked)$/, ['grants']],
  [/^webhook\./, ['webhooks']],
];
export function registersFor(eventType: string): RegisterName[] {
  const action = eventType.replace(/^org\.civicos\./, '');
  return EVENT_REGISTERS.find(([re]) => re.test(action))?.[1] ?? [];
}

export interface CloudEvent { specversion: string; id: string; type: string; subject?: string; time?: string; auditseq: number; data?: unknown }

export interface PlatformSnapshot {
  at: string;
  /** The platform audit chain's sequence these registers are current to. */
  auditSeq: number;
  tenant: { name: string; stateName: string; iso3?: string | null; state: string };
  registers: Partial<{
    institutions: PMinistry[]; permits: PPermit[]; payments: { bills: PBill[]; receipts: PReceipt[] }; incidents: PIncident[];
    releases: PRelease[]; deployments: PDeployment[]; backups: PBackup[]; configs: PConfig[]; lifecycle: PLifecycle;
    integrations: PIntegration[]; grants: PGrant[]; webhooks: PWebhook[];
  }>;
}

// ── Rows (civic-api's shapes, platform-shapes.ts, with their tenant) ───────
export interface TenantRow { id: string; slug: string; name: string; kind: 'NATIONAL' | 'AGENCY'; status: string; country: string; settings: Record<string, unknown> }
type T = { tenantId: string };
export type MinistryRow = ReturnType<typeof civicMinistry> & T;
export type PermitRow = ReturnType<typeof civicPermit> & T;
export type BillRow = ReturnType<typeof civicBill> & T;
export type ReceiptRow = ReturnType<typeof civicReceipt> & T;
export type IncidentRow = ReturnType<typeof civicIncident> & T;
export type IntegrationRow = ReturnType<typeof civicIntegration> & T & { contact: string; keyHash: string };
export type GrantRow = ReturnType<typeof civicGrant>;
export type WebhookRow = ReturnType<typeof civicWebhook> & T & { secretHash: string };
export type ReleaseRow = ReturnType<typeof civicRelease>;
export type DeploymentRow = ReturnType<typeof civicDeployment> & T;
export type BackupRow = ReturnType<typeof civicBackup> & T;
export type ConfigRow = ReturnType<typeof civicConfig> & { tenantId: null };
export type LifecycleRow = { id: string; tenantId: string; fromState: string; toState: string; reason: string; actor: string; at: Date };

export interface MirrorBatch {
  tenants: TenantRow[];
  institutions?: MinistryRow[];
  permits?: PermitRow[];
  payments?: { bills: BillRow[]; receipts: ReceiptRow[] };
  incidents?: IncidentRow[];
  releases?: ReleaseRow[];
  deployments?: DeploymentRow[];
  backups?: BackupRow[];
  configs?: ConfigRow[];
  lifecycle?: LifecycleRow[];
  integrations?: IntegrationRow[];
  grants?: GrantRow[];
  webhooks?: WebhookRow[];
}

export interface MirrorState { cursor: number; lastEventAt: string | null; lastFullSyncAt: string | null; lastError: string | null }
export interface MirrorMark {
  /** The audit sequence the mirror is current to after this write (never lowered). */
  cursor: number;
  /** The audit sequence of the platform read the batch's registers come from. */
  dataSeq?: number;
  event?: { id: string; auditSeq: number; type: string };
  fullSyncAt?: Date;
}

/** The registers a batch carries (tenants aside). */
export const batchRegisters = (b: MirrorBatch): RegisterName[] => REGISTERS.filter(r => b[r] !== undefined);

/**
 * Which of a batch's registers may be written: those whose read is at least as
 * recent as the one last written for them (`seqs`, by register). Several
 * civic-api replicas follow at once, so a slow full read must never land over
 * a newer one. Returns the registers to write and the new per-register sequences.
 */
export function freshRegisters(b: MirrorBatch, seqs: Record<string, number>, dataSeq: number | undefined): { write: RegisterName[]; stale: RegisterName[]; seqs: Record<string, number> } {
  const regs = batchRegisters(b);
  if (dataSeq === undefined) return { write: regs, stale: [], seqs };
  const write = regs.filter(r => dataSeq >= (seqs[r] ?? -1));
  const next = { ...seqs };
  for (const r of write) next[r] = dataSeq;
  return { write, stale: regs.filter(r => !write.includes(r)), seqs: next };
}

/** The batch with only the registers named (tenants kept). */
export function onlyRegisters(b: MirrorBatch, keep: RegisterName[]): MirrorBatch {
  const out: MirrorBatch = { tenants: b.tenants };
  for (const r of keep) (out as unknown as Record<string, unknown>)[r] = b[r];
  return out;
}

/**
 * Where the mirror is kept. `write` stores the rows, the event and the cursor
 * (never lowered) in one step, writing only the registers freshRegisters()
 * allows (so concurrent followers never write an older read over a newer one).
 */
export interface MirrorStore {
  state(): Promise<MirrorState>;
  hasApplied(eventId: string): Promise<boolean>;
  write(batch: MirrorBatch, mark: MirrorMark): Promise<void>;
  noteError(message: string): Promise<void>;
}

const sha = (s: string) => createHmac('sha256', 'civicos-mirror').update(s).digest('hex').slice(0, 24);

/** The platform's registers as civic-api rows (pure). */
export function toBatch(snap: PlatformSnapshot): MirrorBatch {
  const home = tenantIdOf(snap.tenant.name);
  const r = snap.registers;
  const tenants: TenantRow[] = [{
    id: home, slug: `platform-${snap.tenant.name}`.toLowerCase().replace(/[^a-z0-9-]+/g, '-'), name: snap.tenant.stateName || snap.tenant.name,
    kind: 'NATIONAL', status: up(r.lifecycle?.state ?? snap.tenant.state ?? 'active'), country: snap.tenant.iso3 ?? '',
    settings: { mirroredFrom: 'platform', platformTenant: snap.tenant.name, home: true },
  }];
  const b: MirrorBatch = { tenants };
  const T = <X extends object>(x: X) => ({ ...x, tenantId: home });
  if (r.institutions) b.institutions = r.institutions.map(m => T(civicMinistry(m)));
  if (r.permits) b.permits = r.permits.map(p => T(civicPermit(p)));
  if (r.payments) b.payments = { bills: r.payments.bills.map(x => T(civicBill(x))), receipts: r.payments.receipts.map(x => T(civicReceipt(x))) };
  if (r.incidents) b.incidents = r.incidents.map(x => T(civicIncident(x)));
  if (r.releases) b.releases = r.releases.map(civicRelease);
  if (r.deployments) b.deployments = r.deployments.map(x => T(civicDeployment(x)));
  if (r.backups) b.backups = r.backups.map(x => T(civicBackup(x)));
  if (r.configs) b.configs = r.configs.map(x => ({ ...civicConfig(x), tenantId: null }));
  if (r.lifecycle) {
    const l = civicLifecycle(r.lifecycle);
    b.lifecycle = l.events.map(e => ({ id: `${l.tenantId}:${sha(`${e.at.toISOString()}|${e.fromState}|${e.toState}|${e.reason}|${e.actor}`)}`, tenantId: l.tenantId, ...e }));
  }
  if (r.integrations) b.integrations = r.integrations.map(x => ({ ...T(civicIntegration(x)), contact: HELD_BY_PLATFORM, keyHash: HELD_BY_PLATFORM }));
  if (r.webhooks) b.webhooks = r.webhooks.map(x => ({ ...T(civicWebhook(x)), secretHash: HELD_BY_PLATFORM }));
  if (r.grants) {
    b.grants = r.grants.map(civicGrant);
    // A grant names another installation's tenant: a row for it, so the grant can point at it.
    for (const name of new Set(r.grants.flatMap(g => [g.fromTenant, g.toTenant]))) {
      if (tenantIdOf(name) === home) continue;
      tenants.push({ id: tenantIdOf(name), slug: `platform-${name}`.toLowerCase().replace(/[^a-z0-9-]+/g, '-'), name, kind: 'AGENCY', status: 'ACTIVE', country: '', settings: { mirroredFrom: 'platform', platformTenant: name, home: false, note: 'named by a federation grant; the platform keeps no other record of it' } });
    }
  }
  return b;
}

export interface FollowerOptions {
  /** The platform's base address (CIVICOS_PLATFORM_URL). */
  base: string;
  /** The follower's integration key on the platform (scope mirror:read): CIVICOS_MIRROR_KEY. */
  key?: string;
  /** The webhook subscription's signing secret: CIVICOS_MIRROR_WEBHOOK_SECRET. */
  secret?: string;
  /** How far a delivery's timestamp may be from now, in seconds (replay protection). Default 300. */
  toleranceSec?: number;
  timeoutMs?: number;
  fetch?: typeof fetch;
}

export interface Received { status: number; body: Record<string, unknown> }

export class MirrorFollower {
  /** One read-and-write at a time, so an older full read never lands over a newer event's. */
  private queue: Promise<unknown> = Promise.resolve();

  constructor(private readonly store: MirrorStore, private readonly o: FollowerOptions) {}

  private serial<R>(fn: () => Promise<R>): Promise<R> {
    const run = this.queue.then(fn, fn);
    this.queue = run.catch(() => undefined);
    return run;
  }

  /** Whether the signature on a delivery is the subscription's, and recent. */
  verify(headers: Record<string, string | string[] | undefined>, raw: string, nowMs = Date.now()): { ok: true } | { ok: false; reason: string } {
    const h = (k: string) => { const v = headers[k]; return Array.isArray(v) ? v[0] : v; };
    if (!this.o.secret) return { ok: false, reason: 'the follower has no signing secret (CIVICOS_MIRROR_WEBHOOK_SECRET)' };
    const sig = h('x-civicos-signature') ?? '';
    const ts = Number(h('x-civicos-timestamp'));
    if (!/^sha256=[0-9a-f]{64}$/.test(sig) || !Number.isFinite(ts)) return { ok: false, reason: 'missing or malformed X-CivicOS-Signature / X-CivicOS-Timestamp' };
    if (Math.abs(nowMs / 1000 - ts) > (this.o.toleranceSec ?? 300)) return { ok: false, reason: 'timestamp outside the allowed window' };
    const want = createHmac('sha256', this.o.secret).update(`${ts}.${raw}`).digest();
    const have = Buffer.from(sig.slice(7), 'hex');
    return have.length === want.length && timingSafeEqual(have, want) ? { ok: true } : { ok: false, reason: 'signature does not match' };
  }

  /** A webhook delivery: verified, parsed and applied. 2xx tells the platform to move its cursor on. */
  async receive(headers: Record<string, string | string[] | undefined>, raw: string, nowMs = Date.now()): Promise<Received> {
    const v = this.verify(headers, raw, nowMs);
    if (!v.ok) return { status: this.o.secret ? 401 : 503, body: { error: `Delivery refused: ${v.reason}` } };
    let ev: CloudEvent;
    try { ev = JSON.parse(raw) as CloudEvent; } catch { return { status: 400, body: { error: 'Delivery is not JSON' } }; }
    if (!ev || typeof ev.id !== 'string' || typeof ev.type !== 'string' || typeof ev.auditseq !== 'number') return { status: 400, body: { error: 'Delivery is not a CivicOS CloudEvent (id, type, auditseq)' } };
    const hid = headers['x-civicos-event-id'];
    if (hid !== undefined && (Array.isArray(hid) ? hid[0] : hid) !== ev.id) return { status: 400, body: { error: 'X-CivicOS-Event-Id does not match the event' } };
    try {
      return { status: 200, body: { ...(await this.apply(ev)) } };
    } catch (e) {
      const msg = `Event ${ev.id} (${ev.type}) not applied: ${(e as Error).message}`;
      await this.store.noteError(msg).catch(() => undefined);
      // Not acknowledged: the platform keeps its cursor and delivers it again.
      return { status: 503, body: { error: msg } };
    }
  }

  /** Apply one verified event, idempotently. */
  apply(ev: CloudEvent): Promise<{ eventId: string; applied: boolean; reason?: string; registers: RegisterName[] }> {
    return this.serial(() => this.applyNow(ev));
  }

  private async applyNow(ev: CloudEvent): Promise<{ eventId: string; applied: boolean; reason?: string; registers: RegisterName[] }> {
    if (await this.store.hasApplied(ev.id)) return { eventId: ev.id, applied: false, reason: 'already applied', registers: [] };
    const st = await this.store.state();
    const mark: MirrorMark = { cursor: ev.auditseq, event: { id: ev.id, auditSeq: ev.auditseq, type: ev.type } };
    if (ev.auditseq <= st.cursor) {
      await this.store.write({ tenants: [] }, { ...mark, cursor: st.cursor });
      return { eventId: ev.id, applied: false, reason: `covered: the mirror is current to audit sequence ${st.cursor}`, registers: [] };
    }
    const regs = registersFor(ev.type);
    if (!regs.length) {
      await this.store.write({ tenants: [] }, mark);
      return { eventId: ev.id, applied: true, reason: 'no register civic-api mirrors', registers: [] };
    }
    const snap = await this.read(regs);
    await this.store.write(toBatch(snap), { ...mark, dataSeq: snap.auditSeq });
    return { eventId: ev.id, applied: true, registers: regs };
  }

  /** Read every register and write it; the cursor moves to the platform's audit sequence. */
  fullSync(now = new Date()): Promise<{ auditSeq: number; counts: Record<string, number> }> {
    return this.serial(() => this.fullSyncNow(now));
  }

  private async fullSyncNow(now: Date): Promise<{ auditSeq: number; counts: Record<string, number> }> {
    try {
      const snap = await this.read([...REGISTERS]);
      const batch = toBatch(snap);
      await this.store.write(batch, { cursor: snap.auditSeq, dataSeq: snap.auditSeq, fullSyncAt: now });
      const counts: Record<string, number> = {};
      for (const [k, v] of Object.entries(batch)) counts[k] = Array.isArray(v) ? v.length : v && typeof v === 'object' ? Object.values(v).reduce((s: number, x) => s + (Array.isArray(x) ? x.length : 0), 0) : 0;
      return { auditSeq: snap.auditSeq, counts };
    } catch (e) {
      await this.store.noteError(`Full re-sync failed: ${(e as Error).message}`).catch(() => undefined);
      throw e;
    }
  }

  /** The platform's mirror feed for some registers, with the follower's own key. */
  async read(registers: RegisterName[]): Promise<PlatformSnapshot> {
    if (!this.o.key) throw new Error('the follower has no integration key for the platform\'s mirror feed (CIVICOS_MIRROR_KEY)');
    const url = new URL('/api/platform/mirror', this.o.base.endsWith('/') ? this.o.base : `${this.o.base}/`);
    url.searchParams.set('registers', registers.join(','));
    const ac = new AbortController();
    const timer = setTimeout(() => ac.abort(), this.o.timeoutMs ?? 15_000);
    try {
      const res = await (this.o.fetch ?? fetch)(url, { headers: { authorization: `Bearer ${this.o.key}`, accept: 'application/json' }, signal: ac.signal, redirect: 'manual' });
      const text = await res.text();
      if (res.status !== 200) throw new Error(`the platform's mirror feed answered ${res.status}: ${text.slice(0, 200)}`);
      const snap = JSON.parse(text) as PlatformSnapshot;
      if (typeof snap?.auditSeq !== 'number' || !snap.tenant?.name || !snap.registers) throw new Error('the platform\'s mirror feed answered without auditSeq, tenant or registers');
      return snap;
    } catch (e) {
      if (ac.signal.aborted) throw new Error('the platform\'s mirror feed did not answer in time');
      throw e;
    } finally {
      clearTimeout(timer);
    }
  }
}
