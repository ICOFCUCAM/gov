// The platform's one outbox for email and SMS (register 13.5, 3.10, 14.15).
//
// Everything that tells a person something by email or text message queues it
// here: Update Center alerts to the nation's named officials (lib/data/comms.ts
// alert(): releases, security, incidents and fallbacks, end of life) and a
// public site's email updates (lib/data/site-subscriptions.ts: confirmation
// links and announcements). The delivery worker (lib/messaging/deliver.ts,
// /api/cron/deliver-messages) sends them through the providers the nation's
// administrator connected (lib/messaging/providers.ts): its own mail relay
// (SMTP), an HTTPS email API or an HTTPS SMS gateway. Nothing is sent to the
// publisher: these are the nation's own messages to its own people, through
// providers it chose (operational data still leaves only through transmit()).
//
// Rules:
//   - every message has an idempotency key; queuing the same key again returns
//     the message already queued, and the key goes to the provider (SMTP
//     Message-ID, the API's Idempotency-Key) so a retried send is recognised;
//   - without a connected provider a message stays `queued` and screens say
//     "not connected": nothing ever pretends to have been sent;
//   - failures are retried with growing waits (RETRY_MINUTES); a refusal that
//     will not change (an unknown recipient) or the last attempt makes the
//     message a dead letter with its reason;
//   - addresses never enter the audit chain; screens show them masked; a
//     message's address and text are emptied once it is sent or cancelled,
//     and a dead letter's after DEAD_RETENTION_DAYS (or when an administrator
//     discards it);
//   - unsubscribing withdraws the person's queued messages (cancelled, emptied).
//
// Durable: `__civicosMessaging` (lib/data/persist.ts; per-record documents in
// postgres mode through touch()).

import { recordAudit } from '@/lib/data/store/audit';
import { touch } from '@/lib/data/repo/track';
import { withDefaults } from '@/lib/data/defaults';
import { maskAddress } from './privacy';
import type { MessageChannel, MessageStatus, MessageStream, MessagingSettings, OutboundMessage, ProviderConfig } from './types';

/** The installed nation's key (the same as the Update Center's HOME_NATION). */
export const INSTALLED_NATION = 'home';
/** Waits before each retry, in minutes; after the last one the message is a dead letter. */
export const RETRY_MINUTES = [1, 5, 15, 60, 180, 360];
export const MAX_ATTEMPTS = RETRY_MINUTES.length + 1;
/** How long a dead letter keeps its address and text so an administrator can retry it. */
export const DEAD_RETENTION_DAYS = 14;
/** The most messages kept; the oldest finished ones go first. */
export const MAX_MESSAGES = 20_000;

export interface MessagingDb {
  messages: OutboundMessage[];
  /** Idempotency key → message id. */
  keys: Record<string, string>;
  /** Providers per nation. */
  providers: Record<string, ProviderConfig[]>;
  settings: Record<string, MessagingSettings>;
  /** Send times per provider in the last minute (rate limit). */
  sends: Record<string, number[]>;
  seq: number;
}

const seed = (): MessagingDb => ({ messages: [], keys: {}, providers: {}, settings: {}, sends: {}, seq: 1 });
const g = globalThis as unknown as { __civicosMessaging?: MessagingDb };
// The store object last given its defaults (a snapshot restored later is a new object and is checked again).
let checked: MessagingDb | undefined;
export function mdb(): MessagingDb {
  const d = g.__civicosMessaging ??= seed();
  if (checked !== d) { withDefaults(d as unknown as Record<string, unknown>, seed() as unknown as Record<string, unknown>, { opaque: ['keys', 'providers', 'settings', 'sends'] }); checked = d; }
  return touch('__civicosMessaging', d);
}
export function resetMessaging(): void { g.__civicosMessaging = undefined; }

const iso = (t: number) => new Date(t).toISOString();

export interface EnqueueInput {
  key: string;
  nationId?: string;
  channel: MessageChannel;
  stream: MessageStream;
  kind: string;
  to: string;
  subject: string;
  text: string;
  link?: string;
  unsubscribe?: string;
  locale?: string;
  ref?: OutboundMessage['ref'];
  expiresAt?: string;
}

/** Queue a message (once per key). Returns the message, new or already queued under that key. */
export function enqueue(input: EnqueueInput, now = Date.now()): OutboundMessage {
  const db = mdb();
  const existing = db.keys[input.key] ? db.messages.find(m => m.id === db.keys[input.key]) : undefined;
  if (existing) return existing;
  const m: OutboundMessage = {
    id: `MSG-${db.seq++}`, key: input.key, nationId: input.nationId ?? INSTALLED_NATION, channel: input.channel, stream: input.stream, kind: input.kind,
    to: input.to.trim(), toMasked: maskAddress(input.to), subject: input.subject.slice(0, 300), text: input.text.slice(0, 20_000),
    ...(input.link ? { link: input.link } : {}), ...(input.unsubscribe ? { unsubscribe: input.unsubscribe } : {}),
    locale: input.locale ?? 'en', ...(input.ref ? { ref: input.ref } : {}),
    status: 'queued', attempts: 0, nextAttemptAt: iso(now), createdAt: iso(now), ...(input.expiresAt ? { expiresAt: input.expiresAt } : {}),
  };
  db.messages.push(m);
  db.keys[m.key] = m.id;
  prune(db);
  return m;
}

/** Empty a message's address and text (kept: masked address, subject, statuses). */
export function forget(m: OutboundMessage): void {
  m.to = '';
  m.text = '';
  delete m.link;
  delete m.unsubscribe;
}

const FINAL: MessageStatus[] = ['sent', 'dead', 'cancelled'];
export const isFinal = (m: OutboundMessage) => FINAL.includes(m.status);

function prune(db: MessagingDb): void {
  if (db.messages.length <= MAX_MESSAGES) return;
  let excess = db.messages.length - MAX_MESSAGES;
  db.messages = db.messages.filter(m => {
    if (excess > 0 && isFinal(m)) { excess--; delete db.keys[m.key]; return false; }
    return true;
  });
}

/**
 * Withdraw the messages not yet sent that match `ref` (an unsubscribed
 * subscriber, a removed official): cancelled, address and text emptied.
 * Returns how many.
 */
export function cancelFor(ref: { kind: 'site-subscriber' | 'official'; id: string }, now = Date.now()): number {
  let n = 0;
  for (const m of mdb().messages) {
    if (m.ref?.kind !== ref.kind || m.ref.id !== ref.id || isFinal(m)) continue;
    m.status = 'cancelled';
    m.finishedAt = iso(now);
    forget(m);
    n++;
  }
  return n;
}

/**
 * Everything the outbox still holds for `ref` goes (go-live review M-13): the
 * messages not yet sent are withdrawn (as cancelFor), and the address and
 * text of any finished one still holding them (a dead letter inside its
 * retention) are emptied. Unsubscribing and the retention sweep for
 * unconfirmed email-update requests (lib/data/site-subscriptions.ts) call it.
 * Returns how many messages were changed.
 */
export function forgetFor(ref: { kind: 'site-subscriber' | 'official'; id: string }, now = Date.now()): number {
  let n = cancelFor(ref, now);
  for (const m of mdb().messages) {
    if (m.ref?.kind !== ref.kind || m.ref.id !== ref.id || !m.to) continue;
    forget(m);
    n++;
  }
  return n;
}

export const messageById = (id: string): OutboundMessage | undefined => mdb().messages.find(m => m.id === id);
export const messageByKey = (key: string): OutboundMessage | undefined => { const id = mdb().keys[key]; return id ? messageById(id) : undefined; };
export const messagesWhere = (pred: (m: OutboundMessage) => boolean): OutboundMessage[] => mdb().messages.filter(pred);

/** The delivery state shown for an alert or a site message. */
export const statusOfKey = (key: string): MessageStatus | undefined => messageByKey(key)?.status;

/** A message as screens and the API show it: masked address, no text, no links. */
export interface MessageView {
  id: string; channel: MessageChannel; stream: MessageStream; kind: string; to: string; subject: string; status: MessageStatus;
  attempts: number; nextAttemptAt?: string; lastError?: string; providerId?: string; createdAt: string; sentAt?: string; finishedAt?: string;
}
export function view(m: OutboundMessage): MessageView {
  return {
    id: m.id, channel: m.channel, stream: m.stream, kind: m.kind, to: m.toMasked, subject: m.subject, status: m.status, attempts: m.attempts,
    ...(m.status === 'queued' || m.status === 'retrying' ? { nextAttemptAt: m.nextAttemptAt } : {}),
    ...(m.lastError ? { lastError: m.lastError } : {}), ...(m.providerId ? { providerId: m.providerId } : {}),
    createdAt: m.createdAt, ...(m.sentAt ? { sentAt: m.sentAt } : {}), ...(m.finishedAt ? { finishedAt: m.finishedAt } : {}),
  };
}

export type Counts = Record<MessageStatus, number>;
const zero = (): Counts => ({ queued: 0, sending: 0, retrying: 0, sent: 0, dead: 0, cancelled: 0 });

/** Counts per channel and per stream for a nation (no addresses). */
export function counts(nationId: string): { byChannel: Record<MessageChannel, Counts>; byStream: Record<MessageStream, Counts> } {
  const byChannel: Record<MessageChannel, Counts> = { email: zero(), sms: zero() };
  const byStream: Record<MessageStream, Counts> = { alerts: zero(), 'site-updates': zero(), test: zero() };
  for (const m of mdb().messages) {
    if (m.nationId !== nationId) continue;
    byChannel[m.channel][m.status]++;
    byStream[m.stream][m.status]++;
  }
  return { byChannel, byStream };
}

/** An administrator sends a dead letter again (its address is still held) or discards it. */
export function deadLetterAction(nationId: string, id: string, action: 'retry' | 'discard', by: string, now = Date.now()): { ok: true } | { error: string; status: number } {
  const m = messageById(id);
  if (!m || m.nationId !== nationId) return { error: 'Message not found', status: 404 };
  if (m.status !== 'dead') return { error: 'Only a dead letter can be sent again or discarded', status: 409 };
  if (action === 'retry') {
    if (!m.to) return { error: 'This dead letter was cleared; its address is no longer held', status: 409 };
    m.status = 'queued';
    m.attempts = 0;
    m.nextAttemptAt = iso(now);
    delete m.finishedAt;
    delete m.expiresAt;
  } else {
    m.status = 'cancelled';
    forget(m);
  }
  recordAudit(by, `messaging.dead.${action}`, `Messaging:${nationId}/${m.id}`, 'ok', `${m.channel} · ${m.kind}`);
  return { ok: true };
}
