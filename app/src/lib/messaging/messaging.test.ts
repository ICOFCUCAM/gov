// The outbox and its delivery worker: idempotency, "not connected" while no
// provider is, retries with growing waits, dead letters with their reason,
// rate limits, failover, links made absolute with List-Unsubscribe for site
// updates, expiry, withdrawal on unsubscribe, sealed secrets, and no address
// or secret ever in the audit chain.
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { randomBytes } from 'node:crypto';
import { listAudit } from '@/lib/data/store';
import { applyNation } from '@/lib/nation/registry';
import { resetComms, alert, outbox as alertOutbox, removeOfficial, saveOfficial } from '@/lib/data/comms';
import { resetSiteSubscriptions, subscribe, confirmSubscription, queueUpdate, unsubscribe, siteOutbox, subscriberCounts } from '@/lib/data/site-subscriptions';
import { resetMessaging, enqueue, mdb, messageById, messageByKey, counts, deadLetterAction, MAX_ATTEMPTS, RETRY_MINUTES, DEAD_RETENTION_DAYS, INSTALLED_NATION } from './outbox';
import { saveProvider, removeProvider, listProviders, saveSettings, connection, publicBase } from './providers';
import { deliverMessages, sendTest } from './deliver';
import { maskAddress, scrub } from './privacy';
import { HOME_NATION } from '@/lib/data/updates';

const ok = <T,>(r: T): Exclude<T, { error: string }> => { if (r && typeof r === 'object' && 'error' in r) throw new Error((r as { error: string }).error); return r as Exclude<T, { error: string }>; };
const T0 = Date.UTC(2026, 9, 19, 12, 0, 0);
const min = 60_000;

/** A stub HTTPS API: answers in turn from `answers` (the last one repeats); records what it got. */
function stubApi(answers: number[]) {
  const got: { url: string; headers: Record<string, string>; body: string }[] = [];
  const fetch = (async (url: string, init: { headers: Record<string, string>; body: string }) => {
    got.push({ url, headers: init.headers, body: init.body });
    const status = answers.length > 1 ? answers.shift()! : answers[0]!;
    return new Response(status < 300 ? JSON.stringify({ id: `p-${got.length}` }) : 'no', { status, headers: { 'content-type': 'application/json' } });
  }) as unknown as typeof globalThis.fetch;
  return { got, net: { http: { fetch, resolve: async () => ['203.0.113.10'] } } };
}
const emailApi = (over: Record<string, unknown> = {}) => ok(saveProvider(INSTALLED_NATION, {
  kind: 'http-email', name: 'Mail API', from: 'updates@gov.example', url: 'https://mail.gov.example/v1/send',
  headers: { Authorization: 'Bearer {{secret}}' }, bodyTemplate: '{"to":"{{to}}","subject":"{{subject}}","text":"{{text}}","unsubscribe":"{{unsubscribe}}"}', secret: 'api-key-secret-1', ...over,
}, 'Admin', T0));
const auditText = () => JSON.stringify(listAudit());

// Real sends happen only in a production installation (plan I0.2; training and demo record them as simulated: simulation.test.ts).
beforeEach(() => { resetMessaging(); resetComms(); resetSiteSubscriptions(); applyNation({ locale: 'en' }); alertOutbox(HOME_NATION); /* the sample officials, seeded in demo */ vi.stubEnv('CIVICOS_MODE', 'production'); });
afterEach(() => vi.unstubAllEnvs());

describe('the outbox', () => {
  it('is the installed nation\'s, keyed like the Update Center', () => {
    expect(INSTALLED_NATION).toBe(HOME_NATION);
  });

  it('queues a message once per idempotency key', () => {
    const a = enqueue({ key: 'k-1', channel: 'email', stream: 'test', kind: 'test', to: 'a@example.org', subject: 's', text: 't' }, T0);
    const b = enqueue({ key: 'k-1', channel: 'email', stream: 'test', kind: 'test', to: 'other@example.org', subject: 's2', text: 't2' }, T0);
    expect(b.id).toBe(a.id);
    expect(mdb().messages).toHaveLength(1);
    expect(a.toMasked).toBe('a***@example.org');
  });

  it('keeps messages queued and says "not connected" while no provider is, and never pretends to send', async () => {
    alert(HOME_NATION, 'security', '1.4.2 is available', 'DR-142', T0);
    expect(connection(INSTALLED_NATION, 'email')).toBe('not connected');
    const run = await deliverMessages(T0 + min);
    expect(run).toMatchObject({ attempted: 0, sent: 0 });
    expect(run.waiting.notConnected).toBeGreaterThan(0);
    expect(counts(INSTALLED_NATION).byStream.alerts.queued).toBeGreaterThan(0);
    expect(counts(INSTALLED_NATION).byStream.alerts.sent).toBe(0);
    expect(alertOutbox(HOME_NATION).every(d => d.status === 'queued')).toBe(true);
  });
});

describe('delivery', () => {
  it('sends through the connected provider, then forgets the address and text; the audit has counts only', async () => {
    emailApi();
    const api = stubApi([200]);
    const [d] = alert(HOME_NATION, 'security', '1.4.2 is available', 'DR-142', T0);
    const run = await deliverMessages(T0, api.net);
    expect(run.sent).toBeGreaterThan(0);
    expect(api.got[0]!.headers.authorization).toBe('Bearer api-key-secret-1');
    expect(api.got[0]!.headers['idempotency-key']).toMatch(/^alert:home:AL-/);
    const body = JSON.parse(api.got[0]!.body) as { to: string; subject: string; text: string };
    expect(body.subject).toBe('Update Center · Security: 1.4.2 is available');
    const m = messageById(d!.messageId!)!;
    expect(m).toMatchObject({ status: 'sent', to: '', text: '', providerMessageId: 'p-1' });
    expect(alertOutbox(HOME_NATION).find(x => x.id === d!.id)).toMatchObject({ status: 'sent', to: 'c***@gov.example' });
    expect(auditText()).not.toMatch(/cio@gov\.example|ciso@gov\.example|api-key-secret-1/);
    expect(listAudit().some(e => e.action === 'messaging.deliver')).toBe(true);
  });

  it('retries with growing waits, then makes a dead letter with the reason; no address in the audit', async () => {
    emailApi();
    const api = stubApi([503]);
    const m = enqueue({ key: 'r-1', channel: 'email', stream: 'test', kind: 'test', to: 'someone@example.org', subject: 's', text: 't' }, T0);
    let now = T0;
    await deliverMessages(now, api.net);
    expect(m).toMatchObject({ status: 'retrying', attempts: 1, nextAttemptAt: new Date(T0 + RETRY_MINUTES[0]! * min).toISOString() });
    expect(m.lastError).toMatch(/answered 503/);
    // Not before its time.
    await deliverMessages(now + 30_000, api.net);
    expect(m.attempts).toBe(1);
    for (let i = 1; i < MAX_ATTEMPTS; i++) {
      now = Date.parse(m.nextAttemptAt);
      await deliverMessages(now, api.net);
    }
    expect(m).toMatchObject({ status: 'dead', attempts: MAX_ATTEMPTS });
    expect(m.lastError).toMatch(/Gave up after 7 attempts/);
    expect(m.to).toBe('someone@example.org'); // kept for a retry by an administrator, for a while
    expect(listAudit().some(e => e.action === 'messaging.dead' && e.resource.endsWith(m.id))).toBe(true);
    expect(auditText()).not.toContain('someone@example.org');
    // Cleared after the retention period.
    await deliverMessages(now + (DEAD_RETENTION_DAYS + 1) * 86_400_000, api.net);
    expect(m.to).toBe('');
  });

  it('makes a dead letter at once on a refusal that will not change; an administrator can send it again or discard it', async () => {
    emailApi();
    const api = stubApi([422, 200]);
    const m = enqueue({ key: 'p-1', channel: 'email', stream: 'test', kind: 'test', to: 'x@example.org', subject: 's', text: 't' }, T0);
    await deliverMessages(T0, api.net);
    expect(m).toMatchObject({ status: 'dead', attempts: 1, lastError: expect.stringMatching(/^Refused/) });
    expect(deadLetterAction(INSTALLED_NATION, m.id, 'retry', 'Admin', T0 + min)).toEqual({ ok: true });
    await deliverMessages(T0 + min, api.net);
    expect(m.status).toBe('sent');
    const n = enqueue({ key: 'p-2', channel: 'email', stream: 'test', kind: 'test', to: 'y@example.org', subject: 's', text: 't' }, T0);
    api.got.length = 0;
    const api2 = stubApi([400]);
    await deliverMessages(T0 + 2 * min, api2.net);
    expect(n.status).toBe('dead');
    expect(deadLetterAction(INSTALLED_NATION, n.id, 'discard', 'Admin')).toEqual({ ok: true });
    expect(n).toMatchObject({ status: 'cancelled', to: '', text: '' });
    expect(deadLetterAction(INSTALLED_NATION, n.id, 'retry', 'Admin')).toMatchObject({ status: 409 });
  });

  it('keeps to each provider\'s rate limit and fails over to the next provider', async () => {
    emailApi({ perMinute: 2 });
    const api = stubApi([200]);
    for (let i = 0; i < 5; i++) enqueue({ key: `rl-${i}`, channel: 'email', stream: 'test', kind: 'test', to: `p${i}@example.org`, subject: 's', text: 't' }, T0);
    const r1 = await deliverMessages(T0, api.net);
    expect(r1).toMatchObject({ sent: 2, waiting: expect.objectContaining({ rateLimited: 3 }) });
    expect(mdb().messages.filter(m => m.status === 'queued')).toHaveLength(3);
    const r2 = await deliverMessages(T0 + min + 1, api.net);
    expect(r2.sent).toBe(2);

    resetMessaging();
    const first = emailApi({ name: 'Primary', priority: 1 });
    emailApi({ name: 'Standby', priority: 2, url: 'https://backup.gov.example/send' });
    const flaky = stubApi([503, 200]);
    const m = enqueue({ key: 'fo-1', channel: 'email', stream: 'test', kind: 'test', to: 'q@example.org', subject: 's', text: 't' }, T0);
    await deliverMessages(T0, flaky.net);
    expect(flaky.got.map(g => new URL(g.url).host)).toEqual(['mail.gov.example', 'backup.gov.example']);
    expect(m.status).toBe('sent');
    expect(m.providerId).not.toBe(first.id);
    expect(listProviders(INSTALLED_NATION).find(p => p.id === first.id)!.lastResult).toMatchObject({ ok: false });
  });

  it('takes back a message whose run died while sending', async () => {
    emailApi();
    const m = enqueue({ key: 'l-1', channel: 'email', stream: 'test', kind: 'test', to: 'l@example.org', subject: 's', text: 't' }, T0);
    m.status = 'sending';
    m.leaseUntil = new Date(T0 + min).toISOString();
    const api = stubApi([200]);
    await deliverMessages(T0 + 30_000, api.net);
    expect(m.status).toBe('sending');
    await deliverMessages(T0 + 2 * min, api.net);
    expect(m.status).toBe('sent');
  });
});

describe('public site email updates', () => {
  const tokenOf = (link: string) => new URL(link, 'http://x').searchParams.get('token')!;

  it('wait for the public address, then go out with absolute links and one-click unsubscribe', async () => {
    emailApi();
    const api = stubApi([200]);
    subscribe('health', 'amina@example.org', { sender: '1', siteName: 'Ministry of Health', now: T0 });
    vi.stubEnv('CIVICOS_PUBLIC_URL', '');
    expect(publicBase(INSTALLED_NATION)).toBeNull();
    const r1 = await deliverMessages(T0, api.net);
    expect(r1.waiting.noPublicAddress).toBe(1);
    ok(saveSettings(INSTALLED_NATION, { publicUrl: 'https://www.gov.example/' }, 'Admin'));
    await deliverMessages(T0 + 1000, api.net);
    const confirmMail = JSON.parse(api.got[0]!.body) as { subject: string; text: string; unsubscribe: string };
    expect(confirmMail.subject).toBe('Confirm email updates from Ministry of Health');
    expect(confirmMail.text).toMatch(/https:\/\/www\.gov\.example\/subscriptions\?token=[\w-]+&action=confirm/);
    expect(confirmMail.unsubscribe).toBe('');
    const token = /token=([\w-]+)&action=confirm/.exec(confirmMail.text)![1]!;
    expect(confirmSubscription(token)).toEqual({ siteId: 'health' });

    queueUpdate('health', 'Ministry of Health: Clinics open on Saturdays', 'From November.', T0 + 2000);
    await deliverMessages(T0 + 3000, api.net);
    const update = JSON.parse(api.got[1]!.body) as { subject: string; text: string; unsubscribe: string };
    expect(update.subject).toBe('Ministry of Health: Clinics open on Saturdays');
    expect(update.text).toMatch(/To stop these emails, open this link: https:\/\/www\.gov\.example\/subscriptions\?token=[\w-]+&action=unsubscribe/);
    expect(update.unsubscribe).toMatch(/^https:\/\/www\.gov\.example\/api\/subscriptions\?token=[\w-]+&action=unsubscribe$/);
    expect(subscriberCounts('health').queued).toBe(0);
    expect(auditText()).not.toContain('amina@example.org');
  });

  it('are written in the language the visitor chose, where the dictionary has the texts', () => {
    subscribe('health', 'fr@example.org', { sender: '1', siteName: 'Santé', locale: 'fr', now: T0 });
    subscribe('health', 'yo@example.org', { sender: '2', siteName: 'Ilera', locale: 'yo', now: T0 });
    const [yo, fr] = siteOutbox('health');
    expect(fr!.subject).toBe('Confirmez les informations par courriel de Santé');
    expect(messageById(fr!.id)!.locale).toBe('fr');
    expect(yo!.subject).toBe('Confirm email updates from Ilera'); // no Yorùbá texts yet: all English
    expect(messageById(yo!.id)!.locale).toBe('en');
  });

  it('withdraw unsent messages when the person unsubscribes, and expire an unused confirmation', async () => {
    subscribe('trade', 'b@example.org', { sender: '1', now: T0 });
    confirmSubscription(tokenOf(siteOutbox('trade')[0]!.link));
    queueUpdate('trade', 'First', 'x', T0);
    const [update] = siteOutbox('trade');
    expect(update!.status).toBe('queued');
    unsubscribe(tokenOf(update!.link), T0 + 1000);
    expect(messageById(update!.id)).toMatchObject({ status: 'cancelled', to: '', text: '' });

    subscribe('trade', 'late@example.org', { sender: '2', now: T0 });
    const confirm = siteOutbox('trade')[0]!;
    emailApi();
    const run = await deliverMessages(T0 + 8 * 86_400_000, stubApi([200]).net);
    expect(run.expired).toBeGreaterThan(0);
    expect(messageById(confirm.id)).toMatchObject({ status: 'dead', to: '', lastError: expect.stringMatching(/Expired/) });
  });
});

describe('alerts to officials', () => {
  it('are in the nation\'s language, and withdrawn when the official is removed', () => {
    applyNation({ locale: 'sw' });
    const [d] = alert(HOME_NATION, 'incidents', 'Probation failed for 1.5.0', 'INC-1', T0);
    expect(messageById(d!.messageId!)).toMatchObject({ subject: 'Kituo cha Masasisho · Matukio: Probation failed for 1.5.0', locale: 'sw' });
    const sms = alert(HOME_NATION, 'incidents', 'Probation failed', 'INC-2', T0).find(x => x.channel === 'sms')!;
    expect(messageById(sms.messageId!)!.text).toBe('Kituo cha Masasisho · Matukio: Probation failed');
    ok(removeOfficial(HOME_NATION, 'OF-2', 'Admin'));
    expect(messageById(sms.messageId!)!.status).toBe('cancelled');
  });

  it('show the official\'s address masked', () => {
    ok(saveOfficial(HOME_NATION, { name: 'Duty officer', role: 'On call', email: 'duty@gov.example', sms: '+254 700 000 009', channels: { email: true, sms: true }, subscriptions: { security: false, releases: false, incidents: true, eol: false }, by: 'Admin' }));
    alert(HOME_NATION, 'incidents', 'x', undefined, T0);
    const mine = alertOutbox(HOME_NATION).filter(a => a.officialName === 'Duty officer');
    expect(mine.map(a => a.to).sort()).toEqual(['d***@gov.example', '•••• 09']);
  });
});

describe('providers', () => {
  it('are checked: TLS only for SMTP, https only for APIs, templates that place the recipient and text', () => {
    expect(saveProvider(INSTALLED_NATION, { kind: 'smtp', name: 'Relay', from: 'a@gov.example', host: 'smtp.gov.example', security: 'none' }, 'Admin')).toMatchObject({ error: expect.stringMatching(/never sent over a connection without TLS/) });
    expect(saveProvider(INSTALLED_NATION, { kind: 'smtp', name: 'Relay', from: 'not-an-address', host: 'smtp.gov.example' }, 'Admin')).toMatchObject({ error: expect.stringMatching(/sender address/) });
    expect(saveProvider(INSTALLED_NATION, { kind: 'http-email', name: 'API', from: 'a@gov.example', url: 'http://mail.gov.example/send', bodyTemplate: '{"to":"{{to}}","text":"{{text}}"}' }, 'Admin')).toMatchObject({ error: expect.stringMatching(/https/) });
    expect(saveProvider(INSTALLED_NATION, { kind: 'http-email', name: 'API', from: 'a@gov.example', url: 'https://10.0.0.5/send', bodyTemplate: '{"to":"{{to}}","text":"{{text}}"}' }, 'Admin')).toMatchObject({ error: expect.stringMatching(/CIVICOS_MESSAGING_PRIVATE/) });
    expect(saveProvider(INSTALLED_NATION, { kind: 'http-email', name: 'API', from: 'a@gov.example', url: 'https://mail.gov.example/send', bodyTemplate: '{"to":{{to}},"text":"{{text}}"}' }, 'Admin')).toMatchObject({ error: expect.stringMatching(/not valid JSON/) });
    expect(saveProvider(INSTALLED_NATION, { kind: 'http-sms', name: 'SMS', from: 'GOV', url: 'https://sms.gov.example/send', bodyTemplate: 'to={{to}}' , contentType: 'form' }, 'Admin')).toMatchObject({ error: expect.stringMatching(/\{\{text\}\}/) });
    expect(saveProvider(INSTALLED_NATION, { kind: 'http-sms', name: 'SMS', from: 'GOV', url: 'https://sms.gov.example/send', headers: { Host: 'x' }, bodyTemplate: 'to={{to}}&m={{text}}', contentType: 'form' }, 'Admin')).toMatchObject({ error: expect.stringMatching(/cannot be set/) });
    const relay = ok(saveProvider(INSTALLED_NATION, { kind: 'smtp', name: 'Relay', from: 'updates@gov.example', host: 'smtp.gov.example', security: 'starttls', username: 'u', secret: 'relay-password' }, 'Admin'));
    expect(relay).toMatchObject({ port: 587, security: 'starttls', hasSecret: true });
    expect(relay).not.toHaveProperty('secret');
  });

  it('keep their secret sealed under the data key, never shown or audited; a save without a secret keeps it', () => {
    vi.stubEnv('CIVICOS_DATA_KEK', randomBytes(32).toString('base64'));
    const p = ok(saveProvider(INSTALLED_NATION, { kind: 'smtp', name: 'Relay', from: 'updates@gov.example', host: 'smtp.gov.example', username: 'u', secret: 'relay-password-9' }, 'Admin'));
    const stored = mdb().providers[INSTALLED_NATION]![0]!.secret!;
    expect(stored.startsWith('enc:v1:')).toBe(true);
    ok(saveProvider(INSTALLED_NATION, { id: p.id, name: 'Main relay' }, 'Admin'));
    expect(mdb().providers[INSTALLED_NATION]![0]!.secret).toBe(stored);
    expect(JSON.stringify(listProviders(INSTALLED_NATION))).not.toContain('relay-password-9');
    expect(auditText()).not.toContain('relay-password-9');
    expect(listAudit().filter(e => e.action.startsWith('messaging.provider')).slice(0, 2).map(e => e.action).sort()).toEqual(['messaging.provider.add', 'messaging.provider.update']);
    expect(ok(removeProvider(INSTALLED_NATION, p.id, 'Admin'))).toEqual({ ok: true });
  });

  it('can be tested with one message to an address that is neither kept nor audited', async () => {
    const p = emailApi();
    const api = stubApi([200]);
    expect(await sendTest(INSTALLED_NATION, p.id, 'tester@example.org', 'Admin', api.net)).toMatchObject({ ok: true });
    expect(JSON.parse(api.got[0]!.body).to).toBe('tester@example.org');
    expect(mdb().messages).toHaveLength(0);
    expect(auditText()).not.toContain('tester@example.org');
    expect(listAudit().some(e => e.action === 'messaging.provider.test')).toBe(true);
  });
});

describe('privacy helpers', () => {
  it('mask addresses and scrub them from failure texts', () => {
    expect(maskAddress('amina@example.org')).toBe('a***@example.org');
    expect(maskAddress('+254 700 000 002')).toBe('•••• 02');
    expect(scrub('550 5.1.1 <amina@example.org>: unknown user; call +254 700 000 002')).toBe('550 5.1.1 <[address]>: unknown user; call [number]');
    expect(messageByKey('none')).toBeUndefined();
  });
});
