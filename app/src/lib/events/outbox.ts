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

/** Audited actions that become events (successful ones only). Sign-in, accounts and subscriptions never do. */
export const EVENT_ACTIONS = /^(facility\.(publish|withdraw|status|move\.confirm)|boundary\.(publish|withdraw)|twin\.(source\.run|scenario\.(create|revise))|directive\.(draft|sign|rescind)|incident\.[a-z-]+|permit\.[a-z-]+|site\.content\.(publish|withdraw)|queue\.(add|import|import\.withdraw)|federation\.(approved|revoked|exchange)|update\.(publish|fallback|probation\.(pass|fail)|staging\.install))$/;

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
  data: { action: string; resource: string; actor: string; outcome: string; detail?: string; audit: { seq: number; hash: string } };
}

interface Db { events: CloudEvent[]; cursors: Record<string, number>; deliveries: Delivery[] }
export interface Delivery { webhookId: string; eventId: string; type: string; at: string; ok: boolean; detail: string }

const g = globalThis as unknown as { __civicosEventOutbox?: Db };
export const outboxDb = (): Db => {
  const d = touch('__civicosEventOutbox', g.__civicosEventOutbox ??= { events: [], cursors: {}, deliveries: [] });
  d.events ??= []; d.cursors ??= {}; d.deliveries ??= [];
  return d;
};
export function resetOutbox(): void { g.__civicosEventOutbox = undefined; }

/** Called by appendAudit for every entry, in the same synchronous step: writes the event when the action is one. */
export function noteAudit(e: AuditEntry): CloudEvent | null {
  if (e.outcome !== 'ok' || !EVENT_ACTIONS.test(e.action)) return null;
  const ev: CloudEvent = {
    specversion: '1.0', id: `evt-${randomUUID()}`, source: EVENT_SOURCE, type: `${TYPE_PREFIX}${e.action}`,
    subject: e.resource, time: e.at, datacontenttype: 'application/json', auditseq: e.seq,
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
    if (e.auditseq <= after || !topicMatches(topic, e.type)) continue;
    out.push(e);
    if (out.length >= limit) break;
  }
  return out;
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
