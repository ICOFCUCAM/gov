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
// No email provider is connected yet: messages wait in an outbox, with links
// as paths on the platform (the sender adds the site's address). See
// docs/INTEGRATION_REGISTER.md 14.15. Audit entries never carry the address.
//
// Retention (go-live review M-9, M-13): unsubscribing also deletes every
// message to that address for the site from the outbox (`purgeMessagesTo`,
// which a delivery service calls for what it holds too); requests never
// confirmed are deleted, with their messages, once their link has expired
// (`sweepSubscriptions`, from the hourly retention sweep and, as a fallback,
// from new requests); the attempt counters are kept per hashed sender and
// address, pruned after their window and bounded. Requests reach the audit
// chain a few per site and window, then as one summary (lib/audit/aggregate.ts).

import { createHash, randomBytes } from 'node:crypto';
import { recordAudit } from '@/lib/data/store/audit';
import { touch } from '@/lib/data/repo/track';
import { recordAggregated } from '@/lib/audit/aggregate';

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
}

export interface SiteMessage {
  id: string;
  siteId: string;
  to: string;
  kind: 'confirm' | 'update';
  subject: string;
  body: string;
  /** Confirmation or unsubscribe link, a path on the platform. */
  link: string;
  status: 'queued';
  at: string;
}

interface Db { subs: Subscriber[]; outbox: SiteMessage[]; attempts: Map<string, number[]>; seq: number; lastSweep?: number }
const g = globalThis as unknown as { __civicosSiteSubs?: Db };
const db = (): Db => touch('__civicosSiteSubs', g.__civicosSiteSubs ??= { subs: [], outbox: [], attempts: new Map(), seq: 1 });
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

function queue(m: Omit<SiteMessage, 'id' | 'status'>): void {
  const d = db();
  d.outbox.unshift({ id: `SM-${d.seq++}`, status: 'queued', ...m });
  d.outbox.splice(5000);
}

/**
 * Ask for email updates from a site. Answers `{ ok: true }` for any valid
 * address — new, pending or already confirmed — and queues a confirmation
 * link only where one is needed.
 */
export function subscribe(siteId: string, rawEmail: string, { sender = 'unknown', siteName = siteId, now = Date.now() }: { sender?: string; siteName?: string; now?: number } = {}): { ok: true } | { error: 'invalid' | 'busy' } {
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
    ? Object.assign(existing, { tokenHashes: remember(existing.tokenHashes, token), confirmationSentAt: at })
    : { id: `SUB-${d.seq++}`, siteId, email, status: 'pending', tokenHashes: [hash(token)], createdAt: at, confirmationSentAt: at };
  if (!existing) d.subs.push(sub);
  queue({
    siteId, to: email, kind: 'confirm', at,
    subject: `Confirm email updates from ${siteName}`,
    body: `Someone asked for email updates from ${siteName} for this address. Open the link to confirm; if it was not you, ignore this email and nothing will be sent. The link works for ${CONFIRM_DAYS} days.`,
    link: `/subscriptions?token=${token}&action=confirm`,
  });
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
  // Nothing more goes to the address: its waiting messages for this site go with it.
  purgeMessagesTo(s.email, s.siteId);
  s.status = 'unsubscribed';
  s.email = '';
  s.tokenHashes = [];
  s.unsubscribedAt = new Date(now).toISOString();
  recordAudit('public', 'site.unsubscribe', `PublicSite:${s.siteId}`, 'ok');
  return { siteId: s.siteId };
}

/**
 * Delete every message to an address from the outbox (for one site, or all),
 * whatever its state. Unsubscribing and the retention sweep call it; a
 * delivery service that keeps its own queue or sent log calls it (or does
 * the same) for the same address. Returns how many messages went.
 */
export function purgeMessagesTo(address: string, siteId?: string): number {
  const to = String(address ?? '').trim().toLowerCase();
  if (!to) return 0;
  const d = db();
  const before = d.outbox.length;
  d.outbox = d.outbox.filter(m => !(m.to === to && (siteId === undefined || m.siteId === siteId)));
  return before - d.outbox.length;
}

/**
 * The retention sweep for email updates: requests never confirmed are
 * deleted once their link has expired (CONFIRM_DAYS), with their messages;
 * messages to an address that no longer has a request or subscription for
 * that site are deleted; attempt counters past their window are dropped.
 * Returns how many unconfirmed requests were deleted.
 */
export function sweepSubscriptions(now = Date.now()): number {
  const d = db();
  d.lastSweep = now;
  const expired = d.subs.filter(s => s.status === 'pending' && now - Date.parse(s.confirmationSentAt) > CONFIRM_DAYS * 86_400_000);
  if (expired.length) {
    const gone = new Set(expired);
    d.subs = d.subs.filter(s => !gone.has(s));
  }
  const live = new Set(d.subs.filter(s => s.status !== 'unsubscribed' && s.email).map(s => `${s.siteId}|${s.email}`));
  d.outbox = d.outbox.filter(m => live.has(`${m.siteId}|${m.to}`));
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
    queued: db().outbox.filter(m => m.siteId === siteId).length,
  };
}

/**
 * Queue an update to every confirmed subscriber of a site, each with its own
 * unsubscribe link (one-click, RFC 8058, when the provider is connected).
 * Called when a version with new news is published.
 */
export function queueUpdate(siteId: string, subject: string, body: string, now = Date.now()): number {
  const at = new Date(now).toISOString();
  const to = db().subs.filter(s => s.siteId === siteId && s.status === 'confirmed');
  for (const s of to) {
    const token = randomBytes(24).toString('base64url');
    s.tokenHashes = remember(s.tokenHashes, token);
    queue({ siteId, to: s.email, kind: 'update', subject, body, link: `/subscriptions?token=${token}&action=unsubscribe`, at });
  }
  if (to.length) recordAudit('platform', 'site.update.queue', `PublicSite:${siteId}`, 'ok', `${to.length} recipients`);
  return to.length;
}

/** Messages waiting for an email provider (operators only). */
export function siteOutbox(siteId: string, limit = 50): SiteMessage[] {
  return db().outbox.filter(m => m.siteId === siteId).slice(0, limit).map(m => ({ ...m }));
}
