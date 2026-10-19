// The delivery worker for the outbox (lib/messaging/outbox.ts), run by
// /api/cron/deliver-messages (pg_cron, every minute).
//
// Each run: lapsed claims go back to retrying, expired messages and old dead
// letters are settled, then every message that is due is sent through its
// nation's enabled providers for its channel, in their order (the next one is
// tried when one fails), within each provider's rate limit and the run's limit.
// A message whose nation has no provider for its channel stays `queued`
// (not connected); a site's email waits while the nation has no public address
// for its links (an alert goes without its link). A provider's refusal that will not change makes a dead letter at
// once; any other failure is retried after RETRY_MINUTES, and after the last
// attempt the message is a dead letter with its reason.
//
// The audit chain gets one entry per run that sent or failed anything (counts
// only) and one per dead letter (its id and the scrubbed reason): never an
// address or a message's text.

import { recordAudit } from '@/lib/data/store/audit';
import { mdb, forget, RETRY_MINUTES, MAX_ATTEMPTS, DEAD_RETENTION_DAYS } from './outbox';
import { activeProviders, providerSecret, publicBase, privateNetworkAllowed } from './providers';
import { sendSmtp, type SmtpNet } from './adapters/smtp';
import { sendHttp } from './adapters/http';
import { scrub } from './privacy';
import type { SafeFetchOptions } from '@/lib/net/safe-fetch';
import type { OutboundMessage, ProviderConfig, RenderedMessage, SendResult } from './types';

export const PER_RUN_LIMIT = 200;
/** How long a run holds a message it is sending. */
export const LEASE_MS = 2 * 60_000;

export interface DeliveryNet { smtp?: SmtpNet; http?: Pick<SafeFetchOptions, 'fetch' | 'resolve'> }

export interface DeliveryRun {
  at: string;
  attempted: number;
  sent: number;
  retrying: number;
  dead: number;
  /** Messages due but waiting: no provider connected for their channel, or no public address for their links. */
  waiting: { notConnected: number; noPublicAddress: number; rateLimited: number };
  expired: number;
  cleared: number;
}

const iso = (t: number) => new Date(t).toISOString();

/** The message as a provider receives it: links absolute, List-Unsubscribe for site updates. */
export function render(m: OutboundMessage, base: string | null): RenderedMessage | null {
  // A site's emails are their links (confirm, unsubscribe): they wait for the address.
  // An alert is useful without its link to the Update Center: the line is left out.
  if (!base && (m.unsubscribe || (m.link && m.stream !== 'alerts'))) return null;
  const abs = (path?: string) => (path && base ? `${base}${path}` : '');
  const text = (base ? m.text : m.text.replace(/^.*\{link\}.*$\n?/gm, '')).replaceAll('{link}', abs(m.link)).replaceAll('{unsubscribe}', abs(m.unsubscribe));
  const headers: Record<string, string> = {};
  if (m.channel === 'email' && m.unsubscribe) {
    // RFC 2369 / RFC 8058: mail clients offer "Unsubscribe" and post List-Unsubscribe=One-Click to this address.
    headers['List-Unsubscribe'] = `<${abs(m.unsubscribe)}>`;
    headers['List-Unsubscribe-Post'] = 'List-Unsubscribe=One-Click';
  }
  if (m.channel === 'email' && m.stream !== 'test') headers['Auto-Submitted'] = 'auto-generated';
  return { key: m.key, channel: m.channel, to: m.to, subject: m.subject, text, headers };
}

/** Send one rendered message through one provider. */
export async function sendVia(p: ProviderConfig, r: RenderedMessage, net: DeliveryNet = {}): Promise<SendResult> {
  let secret: string | undefined;
  try { secret = providerSecret(p); } catch (e) { return { ok: false, permanent: false, error: scrub((e as Error).message) }; }
  const allowPrivate = privateNetworkAllowed();
  return p.kind === 'smtp'
    ? sendSmtp(p, r, secret, { allowPrivate, net: net.smtp })
    : sendHttp(p, r, secret, { allowPrivate, net: net.http });
}

/** Whether the provider may send another message now (messages per minute); records the send when it may. */
function takeSlot(p: ProviderConfig, now: number): boolean {
  const db = mdb();
  const recent = (db.sends[p.id] ?? []).filter(t => now - t < 60_000);
  if (recent.length >= p.perMinute) { db.sends[p.id] = recent; return false; }
  recent.push(now);
  db.sends[p.id] = recent;
  return true;
}

function note(p: ProviderConfig, ok: boolean, detail: string, now: number) {
  p.lastResult = { at: iso(now), ok, detail: detail.slice(0, 300) };
}

const g = globalThis as unknown as { __messagingRun?: Promise<DeliveryRun> };

/** Run the worker once (one run at a time in this process). */
export function deliverMessages(now = Date.now(), net: DeliveryNet = {}): Promise<DeliveryRun> {
  if (g.__messagingRun) return g.__messagingRun;
  const run = runOnce(now, net).finally(() => { g.__messagingRun = undefined; });
  g.__messagingRun = run;
  return run;
}

async function runOnce(now: number, net: DeliveryNet): Promise<DeliveryRun> {
  const db = mdb();
  const out: DeliveryRun = { at: iso(now), attempted: 0, sent: 0, retrying: 0, dead: 0, waiting: { notConnected: 0, noPublicAddress: 0, rateLimited: 0 }, expired: 0, cleared: 0 };
  const dead = (m: OutboundMessage, reason: string) => {
    m.status = 'dead';
    m.lastError = scrub(reason);
    m.finishedAt = iso(now);
    delete m.leaseUntil;
    out.dead++;
    recordAudit('system (messaging)', 'messaging.dead', `Messaging:${m.nationId}/${m.id}`, 'fail', `${m.channel} · ${m.kind} · ${m.attempts} attempts · ${m.lastError}`);
  };

  // Housekeeping: lapsed claims, expired messages, old dead letters.
  for (const m of db.messages) {
    if (m.status === 'sending' && m.leaseUntil && Date.parse(m.leaseUntil) <= now) { m.status = 'retrying'; delete m.leaseUntil; m.nextAttemptAt = iso(now); }
    if ((m.status === 'queued' || m.status === 'retrying') && m.expiresAt && Date.parse(m.expiresAt) <= now) {
      m.status = 'dead'; m.lastError = 'Expired before it could be sent (its link no longer works)'; m.finishedAt = iso(now); forget(m); out.expired++;
    }
    if (m.status === 'dead' && m.to && m.finishedAt && now - Date.parse(m.finishedAt) > DEAD_RETENTION_DAYS * 86_400_000) { forget(m); out.cleared++; }
  }

  const due = db.messages.filter(m => (m.status === 'queued' || m.status === 'retrying') && Date.parse(m.nextAttemptAt) <= now && m.to);
  for (const m of due) {
    if (out.attempted >= PER_RUN_LIMIT) break;
    const providers = activeProviders(m.nationId, m.channel);
    if (!providers.length) { out.waiting.notConnected++; continue; }
    const r = render(m, publicBase(m.nationId));
    if (!r) { out.waiting.noPublicAddress++; continue; }
    // Claim it before the first await, so an overlapping run elsewhere sees it taken.
    m.status = 'sending';
    m.leaseUntil = iso(now + LEASE_MS);
    let result: SendResult | null = null;
    const errors: string[] = [];
    let tried = 0;
    for (const p of providers) {
      if (!takeSlot(p, now)) continue;
      tried++;
      const res = await sendVia(p, r, net);
      note(p, res.ok, res.ok ? 'sent' : res.error, now);
      if (res.ok) { result = res; m.providerId = p.id; break; }
      errors.push(res.error);
      result = res;
      if (res.permanent) break;
    }
    if (!tried) {
      // Every provider is at its limit: unclaimed, untouched, next run.
      m.status = m.attempts ? 'retrying' : 'queued';
      delete m.leaseUntil;
      out.waiting.rateLimited++;
      continue;
    }
    out.attempted++;
    m.attempts++;
    delete m.leaseUntil;
    if (result?.ok) {
      m.status = 'sent';
      m.sentAt = m.finishedAt = iso(now);
      if (result.id) m.providerMessageId = result.id;
      delete m.lastError;
      forget(m);
      out.sent++;
      continue;
    }
    const reason = errors.join(' · ') || 'No provider answered';
    if (result && !result.ok && result.permanent) { dead(m, `Refused: ${reason}`); continue; }
    if (m.attempts >= MAX_ATTEMPTS) { dead(m, `Gave up after ${m.attempts} attempts: ${reason}`); continue; }
    m.status = 'retrying';
    m.lastError = scrub(reason);
    m.nextAttemptAt = iso(now + RETRY_MINUTES[Math.min(m.attempts - 1, RETRY_MINUTES.length - 1)]! * 60_000);
    out.retrying++;
  }

  if (out.attempted || out.expired) {
    recordAudit('system (messaging)', 'messaging.deliver', 'Messaging:outbox', 'ok',
      `${out.sent} sent · ${out.retrying} to retry · ${out.dead} dead · ${out.expired} expired · ${out.waiting.notConnected} waiting for a provider`);
  }
  return out;
}

/**
 * An administrator's test: one message to an address they give, sent at once
 * through one provider (not queued). The address is never kept or audited.
 */
export async function sendTest(nationId: string, providerId: string, to: string, by: string, net: DeliveryNet = {}, now = Date.now()): Promise<{ ok: true; detail: string } | { error: string; status: number }> {
  const p = (mdb().providers[nationId] ?? []).find(x => x.id === providerId);
  if (!p) return { error: 'Provider not found', status: 404 };
  if (!by.trim()) return { error: 'Name who is making the test', status: 422 };
  const addr = to.trim();
  if (p.channel === 'email' ? !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(addr) : !/^\+?[0-9 ()-]{6,}$/.test(addr)) return { error: p.channel === 'email' ? 'Give an email address to send the test to' : 'Give a phone number to send the test to', status: 422 };
  const r: RenderedMessage = {
    key: `test:${p.id}:${now}`, channel: p.channel, to: addr,
    subject: 'Test message from the platform',
    text: `This is a test of the provider "${p.name}", sent by ${by}. No action is needed.`,
    headers: {},
  };
  const res = await sendVia(p, r, net);
  note(p, res.ok, res.ok ? 'test sent' : res.error, now);
  recordAudit(by, 'messaging.provider.test', `Messaging:${nationId}/${p.id}`, res.ok ? 'ok' : 'fail', res.ok ? `${p.channel} test sent` : res.error);
  return res.ok ? { ok: true, detail: `Sent${res.id ? ` (${res.id})` : ''}` } : { error: res.error, status: 502 };
}
