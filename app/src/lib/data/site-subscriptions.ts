// Email updates from a public site (the newsletter box in every design).
//
// Double opt-in: subscribing only queues a confirmation email; nobody gets
// updates until they open its link and confirm. Every update carries a link
// to unsubscribe, and unsubscribing deletes the email address (only a count
// remains). The links hold a random token; only its SHA-256 is stored. The
// page behind a link asks before it changes anything, so mail scanners that
// open links cannot confirm or unsubscribe on someone's behalf.
//
// The same answer is given whether or not an address is already subscribed,
// so the form cannot be used to find out who subscribes. Attempts are limited
// per sender and per address.
//
// Messages go to the platform's one outbox (lib/messaging/outbox.ts) in the
// language the visitor chose, with links as paths on the platform; the
// delivery worker sends them through the nation's email provider
// (/admin/messaging), adding the platform's public address and the
// List-Unsubscribe / List-Unsubscribe-Post headers (RFC 8058) to updates.
// Without a provider they stay queued. Unsubscribing withdraws the person's
// unsent messages too. See docs/INTEGRATION_REGISTER.md 14.15. Audit entries
// never carry the address.
//
// Retention (go-live review M-9, M-13): unsubscribing empties everything the
// outbox still holds for the person (`forgetFor`: unsent messages withdrawn,
// a dead letter's address and text emptied); requests never confirmed are
// deleted once their link has expired, with what the outbox holds for them
// (`sweepSubscriptions`, from the hourly retention sweep and, as a fallback,
// from new requests); the attempt counters are kept per hashed sender and
// address, pruned after their window and bounded. Requests reach the audit
// chain a few per site and window, then as one summary (lib/audit/aggregate.ts).

import { createHash, randomBytes } from 'node:crypto';
import { recordAudit } from '@/lib/data/store/audit';
import { touch } from '@/lib/data/repo/track';
import { enqueue, forgetFor, messagesWhere, isFinal } from '@/lib/messaging/outbox';
import { recordAggregated } from '@/lib/audit/aggregate';
import { siteConfirmation, siteUpdate } from '@/lib/messaging/templates';
import type { MessageStatus } from '@/lib/messaging/types';

export type SubscriberStatus = 'pending' | 'confirmed' | 'unsubscribed';

interface Subscriber {
  id: string;
  siteId: string;
  /** Lower-cased; emptied on unsubscribe. */
  email: string;
  status: SubscriberStatus;
  /** SHA-256 of the tokens in the links sent to this address (the most recent ones); any of them works. */
  tokenHashes: string[];
  createdAt: string;
  confirmationSentAt: string;
  confirmedAt?: string;
  unsubscribedAt?: string;
  /** The language the visitor used when subscribing; emails are in it where the dictionaries have the texts. */
  locale?: string;
}

export interface SiteMessage {
  id: string;
  siteId: string;
  to: string;
  kind: 'confirm' | 'update';
  subject: string;
  body: string;
  /** Confirmation or unsubscribe link, a path on the platform (empty once the message is sent or withdrawn). */
  link: string;
  status: MessageStatus;
  at: string;
}

/** `outbox` held messages before the platform outbox existed; any found are moved there. */
interface Db { subs: Subscriber[]; outbox: (Omit<SiteMessage, 'status'> & { status: string })[]; attempts: Map<string, number[]>; seq: number; lastSweep?: number }
const g = globalThis as unknown as { __civicosSiteSubs?: Db };
const db = (): Db => {
  const d = touch('__civicosSiteSubs', g.__civicosSiteSubs ??= { subs: [], outbox: [], attempts: new Map(), seq: 1 });
  if (d.outbox?.length) moveOldOutbox(d);
  return d;
};

/** Messages queued in a snapshot saved before the platform outbox: moved there, oldest first. */
function moveOldOutbox(d: Db): void {
  const old = d.outbox.splice(0);
  for (const m of old.reverse()) {
    const sub = d.subs.find(s => s.siteId === m.siteId && s.email === m.to && s.status !== 'unsubscribed');
    if (!sub || !m.to) continue;
    enqueue({
      key: `site:${m.siteId}:${m.id}`, channel: 'email', stream: 'site-updates', kind: `site.${m.kind}`, to: m.to,
      subject: m.subject, text: `${m.body}\n\n{link}\n`, link: m.link,
      ...(m.kind === 'update' ? { unsubscribe: m.link.replace(/^\/subscriptions\?/, '/api/subscriptions?') } : {}),
      ref: { kind: 'site-subscriber', id: sub.id, siteId: m.siteId },
      ...(m.kind === 'confirm' ? { expiresAt: new Date(Date.parse(m.at) + CONFIRM_DAYS * 86_400_000).toISOString() } : {}),
    }, Date.parse(m.at) || Date.now());
  }
}
export function resetSiteSubscriptions(): void { g.__civicosSiteSubs = undefined; }

/** How long a confirmation link stays valid. */
export const CONFIRM_DAYS = 7;
const WINDOW_MS = 10 * 60_000;
const MAX_PER_SENDER = 5;
const MAX_PER_ADDRESS = 3;

const hash = (s: string) => createHash('sha256').update(s).digest('hex');
const EMAIL = /^[^\s@<>()[\]\\,;:"]{1,64}@[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+$/i;

/** Attempt counters kept at most; the least recently used go first. */
const MAX_ATTEMPT_KEYS = 20_000;

/** Too many attempts in the window? Records this one either way. */
function limited(key: string, max: number, now: number): boolean {
  const attempts = db().attempts;
  const list = (attempts.get(key) ?? []).filter(t => now - t < WINDOW_MS);
  list.push(now);
  // Re-inserted so the map's order is "least recently used first".
  attempts.delete(key);
  attempts.set(key, list.slice(-(max + 1)));
  if (attempts.size > MAX_ATTEMPT_KEYS) {
    pruneAttempts(now);
    for (const k of attempts.keys()) { if (attempts.size <= MAX_ATTEMPT_KEYS) break; attempts.delete(k); }
  }
  return list.length > max;
}

function pruneAttempts(now: number): void {
  const attempts = db().attempts;
  for (const [k, list] of attempts) if (!list.some(t => now - t < WINDOW_MS)) attempts.delete(k);
}
/** The attempt counters' keys (hashes; for tests). */
export const attemptKeys = (): string[] => [...db().attempts.keys()];

/** Keep the hashes of the most recent links, so an older email's link still works. */
const remember = (hashes: string[], token: string) => [...hashes, hash(token)].slice(-24);

/** Queue an email for a subscriber in the platform outbox (once per link token). */
function queue(sub: Subscriber, kind: 'confirm' | 'update', token: string, msg: { subject: string; text: string; locale: string }, now: number): void {
  enqueue({
    key: `site:${sub.siteId}:${sub.id}:${kind}:${hash(token).slice(0, 16)}`, channel: 'email', stream: 'site-updates', kind: `site.${kind}`,
    to: sub.email, subject: msg.subject, text: msg.text, locale: msg.locale,
    link: `/subscriptions?token=${token}&action=${kind === 'confirm' ? 'confirm' : 'unsubscribe'}`,
    // One-click unsubscribe (RFC 8058): mail clients post List-Unsubscribe=One-Click here.
    ...(kind === 'update' ? { unsubscribe: `/api/subscriptions?token=${token}&action=unsubscribe` } : {}),
    ref: { kind: 'site-subscriber', id: sub.id, siteId: sub.siteId },
    ...(kind === 'confirm' ? { expiresAt: new Date(now + CONFIRM_DAYS * 86_400_000).toISOString() } : {}),
  }, now);
}

/**
 * Ask for email updates from a site. Answers `{ ok: true }` for any valid
 * address — new, pending or already confirmed — and queues a confirmation
 * link only where one is needed.
 */
export function subscribe(siteId: string, rawEmail: string, { sender = 'unknown', siteName = siteId, now = Date.now(), locale }: { sender?: string; siteName?: string; now?: number; locale?: string } = {}): { ok: true } | { error: 'invalid' | 'busy' } {
  const email = String(rawEmail ?? '').trim().toLowerCase();
  if (email.length > 254 || !EMAIL.test(email)) return { error: 'invalid' };
  const d = db();
  if (now - (d.lastSweep ?? 0) > 3_600_000) sweepSubscriptions(now);
  // Neither the sender's network address nor the email address is kept in the counters, only hashes.
  if (limited(`ip:${hash(`sender|${sender}`)}`, MAX_PER_SENDER, now) || limited(`to:${hash(email)}`, MAX_PER_ADDRESS, now)) return { error: 'busy' };
  const at = new Date(now).toISOString();
  const existing = d.subs.find(s => s.siteId === siteId && s.email === email && s.status !== 'unsubscribed');
  if (existing?.status === 'confirmed') return { ok: true };
  const token = randomBytes(24).toString('base64url');
  const sub: Subscriber = existing
    ? Object.assign(existing, { tokenHashes: remember(existing.tokenHashes, token), confirmationSentAt: at, ...(locale ? { locale } : {}) })
    : { id: `SUB-${d.seq++}`, siteId, email, status: 'pending', tokenHashes: [hash(token)], createdAt: at, confirmationSentAt: at, ...(locale ? { locale } : {}) };
  if (!existing) d.subs.push(sub);
  queue(sub, 'confirm', token, siteConfirmation(siteName, CONFIRM_DAYS, sub.locale ?? 'en'), now);
  recordAggregated(`site.subscribe|${siteId}`, { actor: 'public', action: 'site.subscribe', resource: `PublicSite:${siteId}`, outcome: 'ok', detail: existing ? 'confirmation sent again' : 'confirmation sent' }, now);
  return { ok: true };
}

function byToken(token: string): Subscriber | undefined {
  if (typeof token !== 'string' || token.length < 20 || token.length > 100) return undefined;
  const h = hash(token);
  return db().subs.find(s => s.status !== 'unsubscribed' && s.tokenHashes.includes(h));
}

/** What a link is for, without acting on it (the page asks first). */
export function lookupToken(token: string, now = Date.now()): { siteId: string; status: SubscriberStatus } | null {
  const s = byToken(token);
  if (!s) return null;
  if (s.status === 'pending' && now - Date.parse(s.confirmationSentAt) > CONFIRM_DAYS * 86_400_000) return null;
  return { siteId: s.siteId, status: s.status };
}

/** Confirm a subscription from its emailed link. */
export function confirmSubscription(token: string, now = Date.now()): { siteId: string } | { error: string } {
  const s = byToken(token);
  if (!s || !lookupToken(token, now)) return { error: 'This link is not valid or has expired.' };
  if (s.status === 'pending') {
    s.status = 'confirmed';
    s.confirmedAt = new Date(now).toISOString();
    recordAudit('public', 'site.subscribe.confirm', `PublicSite:${s.siteId}`, 'ok');
  }
  return { siteId: s.siteId };
}

/** Unsubscribe from an emailed link: the address is deleted, only the count remains. */
export function unsubscribe(token: string, now = Date.now()): { siteId: string } | { error: string } {
  const s = byToken(token);
  if (!s) return { error: 'This link is not valid or has expired.' };
  s.status = 'unsubscribed';
  s.email = '';
  s.tokenHashes = [];
  s.unsubscribedAt = new Date(now).toISOString();
  // Messages not yet sent to the address are withdrawn, and nothing the outbox holds keeps the address (M-13).
  forgetFor({ kind: 'site-subscriber', id: s.id }, now);
  recordAudit('public', 'site.unsubscribe', `PublicSite:${s.siteId}`, 'ok');
  return { siteId: s.siteId };
}

/**
 * The retention sweep for email updates: requests never confirmed are
 * deleted once their link has expired (CONFIRM_DAYS), and the outbox
 * forgets what it held for them; attempt counters past their window are
 * dropped. Returns how many unconfirmed requests were deleted.
 */
export function sweepSubscriptions(now = Date.now()): number {
  const d = db();
  d.lastSweep = now;
  const expired = d.subs.filter(s => s.status === 'pending' && now - Date.parse(s.confirmationSentAt) > CONFIRM_DAYS * 86_400_000);
  for (const s of expired) forgetFor({ kind: 'site-subscriber', id: s.id }, now);
  if (expired.length) {
    const gone = new Set(expired);
    d.subs = d.subs.filter(s => !gone.has(s));
  }
  pruneAttempts(now);
  return expired.length;
}

/** Subscriber numbers for the site editor (no addresses). */
export function subscriberCounts(siteId: string): { confirmed: number; pending: number; unsubscribed: number; queued: number } {
  const subs = db().subs.filter(s => s.siteId === siteId);
  return {
    confirmed: subs.filter(s => s.status === 'confirmed').length,
    pending: subs.filter(s => s.status === 'pending').length,
    unsubscribed: subs.filter(s => s.status === 'unsubscribed').length,
    queued: siteMessages(siteId).filter(m => !isFinal(m)).length,
  };
}

/**
 * Queue an update to every confirmed subscriber of a site, each with its own
 * unsubscribe link (one-click, RFC 8058, when the provider is connected).
 * Called when a version with new news is published.
 */
export function queueUpdate(siteId: string, subject: string, body: string, now = Date.now()): number {
  const to = db().subs.filter(s => s.siteId === siteId && s.status === 'confirmed');
  for (const s of to) {
    const token = randomBytes(24).toString('base64url');
    s.tokenHashes = remember(s.tokenHashes, token);
    queue(s, 'update', token, siteUpdate(subject, body, s.locale ?? 'en'), now);
  }
  if (to.length) recordAudit('platform', 'site.update.queue', `PublicSite:${siteId}`, 'ok', `${to.length} recipients`);
  return to.length;
}

const siteMessages = (siteId: string) => messagesWhere(m => m.stream === 'site-updates' && m.ref?.siteId === siteId);

/** A site's messages in the platform outbox, newest first (server only: holds addresses until sent; never through the API). */
export function siteOutbox(siteId: string, limit = 50): SiteMessage[] {
  return siteMessages(siteId).slice(-limit).reverse().map(m => ({
    id: m.id, siteId, to: m.to, kind: m.kind === 'site.confirm' ? 'confirm' : 'update', subject: m.subject,
    body: m.text, link: m.link ?? '', status: m.status, at: m.createdAt,
  }));
}
