// The platform's event outbox (review I7): CloudEvents 1.0 written in the
// same step as the audit entry they come from (recordAudit → appendAudit
// calls noteAudit()), so an event exists exactly when its audited change
// does: facilities published or withdrawn, boundaries published, twin source
// runs and scenarios, directives drafted, signed or rescinded, incidents,
// permits, site publications, cases loaded, federation decisions and update
// installs. Webhook subscribers receive them in structured mode
// (application/cloudevents+json) signed with HMAC-SHA256 (lib/events/deliver.ts).
// Durable through lib/data/persist.ts (`__civicosEventOutbox`), bounded.
// The event catalogue is described in docs/ASYNCAPI.yaml.
//
// This module does not import the store (the store calls it).

import { randomUUID } from 'node:crypto';
import type { AuditEntry } from '@/lib/api/types';
import { touch } from '@/lib/data/repo/track';

export const EVENT_SOURCE = '/civicos/platform';
export const TYPE_PREFIX = 'org.civicos.';
export const MAX_EVENTS = 10_000;

/**
 * Audited actions that become events (successful ones only). Sign-in, accounts
 * and email subscriptions never do. The register changes on the second line
 * (institutions, payments, integrations and webhooks, grants proposed,
 * releases, deployments, backups, configuration, the tenant's lifecycle) keep
 * the mirror in services/civic-api current (its follower subscribes to `*`;
 * review D8). Key rotations are not events.
 */
export const EVENT_ACTIONS = new RegExp('^(' + [
  'case\\.(open|stage|decide|refer|deadline\\.lapse)|organisation\\.(create|amend|standing\\.[a-z-]+)|immigration\\.(grant|refuse|revoked|cancelled|expired|extend)|court\\.hearing\\.(schedule|held|adjourned|vacated)|tax\\.taxpayer\\.register|education\\.(inspection\\.record|award\\.(record|revoke))|profession\\.(register|renew|suspended|revoked|lapsed)|customs\\.release(\\.refuse)?|permit-authority\\.(approve|suspend(\\.(confirm|review|lift))?|suspension\\.(unconfirmed|review-overdue))|rule\\.approve|access\\.unusual|civil\\.(birth|death|marriage)\\.register|procedure\\.approve|law\\.version\\.(confirm|withdraw)|certificate\\.(issue|revoke)|decision\\.seal|facility\\.(publish|withdraw|status|move\\.confirm)|boundary\\.(publish|withdraw)|twin\\.(source\\.run|scenario\\.(create|revise))|directive\\.(draft|sign|rescind)|incident\\.[a-z-]+|permit\\.[a-z-]+|site\\.content\\.(publish|withdraw)|queue\\.(add|import|import\\.withdraw)|federation\\.(approved|revoked|exchange)|update\\.(publish|fallback|probation\\.(pass|fail)|staging\\.install)',
  'ministry\\.(create|rename|activate|deactivate|merge)|department\\.(add|remove)|module\\.set|payment\\.execute|integration\\.(register|approved|suspended|revoked)|webhook\\.(subscribe|active|paused|disabled)|federation\\.propose|release\\.(create|promote)|deployment\\.(start|advance|gate-fail|rollback)|backup\\.(create|restore)|config\\.(publish|sign|apply)|tenant\\.transition',
].join('|') + ')$');

export interface CloudEvent {
  specversion: '1.0';
  id: string;
  source: string;
  type: string;
  subject: string;
  time: string;
  datacontenttype: 'application/json';
  /** Extension: the audit chain entry this event was written with. */
  auditseq: number;
  /**
   * Extension: how many data restores the platform has had when the event was
   * written. Audit sequences start again from the restored point after a
   * restore, so consumers order and de-duplicate by (restoreepoch, auditseq)
   * and by id, and re-read everything when it grows (docs/DISASTER_RECOVERY.md).
   */
  restoreepoch?: number;
  /** Set when a restore took away the state this event described: never delivered. */
  voided?: string;
  data: { action: string; resource: string; actor: string; outcome: string; detail?: string; audit: { seq: number; hash: string } };
}

interface Db { events: CloudEvent[]; cursors: Record<string, number>; deliveries: Delivery[]; epoch?: number }
/** `simulated`: a training or demo installation recorded the delivery without sending it (plan I0.2). */
export interface Delivery { webhookId: string; eventId: string; type: string; at: string; ok: boolean; detail: string; simulated?: boolean }

const g = globalThis as unknown as { __civicosEventOutbox?: Db };
export const outboxDb = (): Db => {
  const d = touch('__civicosEventOutbox', g.__civicosEventOutbox ??= { events: [], cursors: {}, deliveries: [] });
  d.events ??= []; d.cursors ??= {}; d.deliveries ??= [];
  return d;
};
export function resetOutbox(): void { g.__civicosEventOutbox = undefined; }

// In-process listeners on audited changes (e.g. the facility tile archive,
// lib/twin/tiles-archive.ts, rebuilt after sites change). Kept on globalThis
// by name, so a module bundled into several routes registers once; never
// persisted (functions), never able to stop the audit entry (errors ignored).
type AuditListener = (e: AuditEntry) => void;
const gl = globalThis as unknown as { __auditListeners?: Map<string, AuditListener> };
/** Call `fn` after every audit entry is written (synchronously; keep it cheap, schedule work). */
export function onAudited(name: string, fn: AuditListener): void { (gl.__auditListeners ??= new Map()).set(name, fn); }

/** Called by appendAudit for every entry, in the same synchronous step: writes the event when the action is one. */
export function noteAudit(e: AuditEntry): CloudEvent | null {
  for (const fn of gl.__auditListeners?.values() ?? []) { try { fn(e); } catch { /* a listener never stops the audit */ } }
  if (e.outcome !== 'ok' || !EVENT_ACTIONS.test(e.action)) return null;
  const ev: CloudEvent = {
    specversion: '1.0', id: `evt-${randomUUID()}`, source: EVENT_SOURCE, type: `${TYPE_PREFIX}${e.action}`,
    subject: e.resource, time: e.at, datacontenttype: 'application/json', auditseq: e.seq, restoreepoch: outboxDb().epoch ?? 0,
    data: { action: e.action, resource: e.resource, actor: e.actor, outcome: e.outcome, ...(e.detail ? { detail: e.detail } : {}), audit: { seq: e.seq, hash: e.hash } },
  };
  const d = outboxDb();
  d.events.push(ev);
  if (d.events.length > MAX_EVENTS) d.events.splice(0, d.events.length - MAX_EVENTS);
  return ev;
}

/** A subscription topic matches an event: "*", the action itself, or a prefix of it ("facility" matches facility.publish). The "org.civicos." or "civicos." prefix is optional. */
export function topicMatches(topic: string, type: string): boolean {
  const t = topic.trim().replace(/^org\.civicos\./, '').replace(/^civicos\./, '');
  const a = type.replace(TYPE_PREFIX, '');
  return t === '*' || a === t || a.startsWith(`${t}.`);
}

/** Events after a webhook's cursor (by audit sequence) for its topic, oldest first. */
export function pendingFor(webhookId: string, topic: string, limit = 50): CloudEvent[] {
  const d = outboxDb();
  const after = d.cursors[webhookId] ?? 0;
  const out: CloudEvent[] = [];
  for (const e of d.events) {
    if (e.voided || e.auditseq <= after || !topicMatches(topic, e.type)) continue;
    out.push(e);
    if (out.length >= limit) break;
  }
  return out;
}

/**
 * After a data restore (lib/data/backups.ts), before its own audit entry:
 * the outbox is kept through a restore (it records what consumers were
 * already told), so events written after the restored point describe state
 * that no longer exists and are voided (never delivered); each consumer's
 * cursor goes back to that point, since the audit sequence starts again
 * there; and the restore epoch grows, so the restore's own event
 * (backup.restore) and every later one tell consumers to re-read.
 */
export function afterRestore(headSeq: number, backupId: string): { voided: number; cursorsReset: number; epoch: number } {
  const d = outboxDb();
  let voided = 0, cursorsReset = 0;
  for (const e of d.events) if (!e.voided && e.auditseq > headSeq && (e.restoreepoch ?? 0) === (d.epoch ?? 0)) { e.voided = backupId; voided++; }
  for (const [k, v] of Object.entries(d.cursors)) if (v > headSeq) { d.cursors[k] = headSeq; cursorsReset++; }
  d.epoch = (d.epoch ?? 0) + 1;
  return { voided, cursorsReset, epoch: d.epoch };
}

export function advanceCursor(webhookId: string, auditseq: number): void {
  const d = outboxDb();
  d.cursors[webhookId] = Math.max(d.cursors[webhookId] ?? 0, auditseq);
}

export function recordDelivery(x: Delivery): void {
  const d = outboxDb();
  d.deliveries.push(x);
  if (d.deliveries.length > 2000) d.deliveries.splice(0, d.deliveries.length - 2000);
}

export const recentEvents = (limit = 50): CloudEvent[] => outboxDb().events.slice(-limit).reverse();
export const recentDeliveries = (limit = 50): Delivery[] => outboxDb().deliveries.slice(-limit).reverse();
