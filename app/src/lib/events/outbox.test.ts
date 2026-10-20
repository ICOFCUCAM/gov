import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createHmac } from 'node:crypto';
import { recordAudit, listAudit, subscribeWebhook, listWebhooks, rotateWebhookSecret, webhookSigningSecret } from '@/lib/data/store';
import { resetOutbox, recentEvents, topicMatches, outboxDb, type CloudEvent } from './outbox';
import { deliverOutbox, signDelivery } from './deliver';

const resolvePublic = async () => ['203.0.113.10'];

describe('the CloudEvents outbox', () => {
  beforeEach(() => {
    resetOutbox();
    for (const w of listWebhooks()) w.status = 'paused';
  });

  it('writes a CloudEvent in the same step as the audit entry, for notable changes only', () => {
    recordAudit('Director', 'facility.publish', 'Facility:FAC-00012', 'ok', 'Health centre');
    recordAudit('Director', 'auth.sign-in', 'Official:x', 'ok');
    recordAudit('Director', 'facility.publish', 'Facility:FAC-00013', 'denied', 'refused');
    const [ev] = recentEvents();
    const audit = listAudit().find(a => a.resource === 'Facility:FAC-00012')!;
    expect(recentEvents()).toHaveLength(1);
    expect(ev).toMatchObject({
      specversion: '1.0', source: '/civicos/platform', type: 'org.civicos.facility.publish', subject: 'Facility:FAC-00012',
      time: audit.at, datacontenttype: 'application/json', auditseq: audit.seq,
      data: { action: 'facility.publish', actor: 'Director', detail: 'Health centre', audit: { seq: audit.seq, hash: audit.hash } },
    });
    expect(ev!.id).toMatch(/^evt-[0-9a-f-]{36}$/);
  });

  it('writes events for the register changes civic-api mirrors (review D8), not for key rotations', () => {
    const actions = ['ministry.rename', 'department.add', 'module.set', 'payment.execute', 'integration.approved', 'webhook.paused', 'federation.propose', 'release.promote', 'deployment.gate-fail', 'backup.restore', 'config.apply', 'tenant.transition'];
    for (const a of actions) recordAudit('Administrator', a, `X:${a}`, 'ok');
    recordAudit('Administrator', 'integration.key.rotate', 'Integration:IC-1', 'ok');
    recordAudit('Administrator', 'webhook.secret.rotate', 'Webhook:WH-1', 'ok');
    expect(recentEvents().map(e => e.type).reverse()).toEqual(actions.map(a => `org.civicos.${a}`));
  });

  it('matches topics by action or prefix', () => {
    expect(topicMatches('facility', 'org.civicos.facility.publish')).toBe(true);
    expect(topicMatches('org.civicos.boundary.publish', 'org.civicos.boundary.publish')).toBe(true);
    expect(topicMatches('civicos.directive', 'org.civicos.directive.sign')).toBe(true);
    expect(topicMatches('*', 'org.civicos.twin.source.run')).toBe(true);
    expect(topicMatches('facility.pub', 'org.civicos.facility.publish')).toBe(false);
  });

  it('delivers structured-mode CloudEvents with an HMAC signature, from the subscription onward, in order', async () => {
    recordAudit('Director', 'boundary.publish', 'Boundaries:v1', 'ok'); // before the subscription: not delivered
    const sub = subscribeWebhook({ topic: 'boundary', url: 'https://hooks.example.gov/civicos' });
    expect(sub.signingSecret).toMatch(/^whsec_[A-Za-z0-9_-]{43}$/);
    expect(webhookSigningSecret(sub.id)).toBe(sub.signingSecret);
    recordAudit('Director', 'boundary.publish', 'Boundaries:v2', 'ok');
    recordAudit('Director', 'facility.publish', 'Facility:FAC-1', 'ok'); // other topic
    recordAudit('Director', 'boundary.withdraw', 'Boundaries:v2', 'ok');

    const calls: { url: string; init: RequestInit }[] = [];
    const fetch = vi.fn(async (url: string, init: RequestInit) => { calls.push({ url, init }); return new Response('ok', { status: 200 }); });
    const now = Date.now();
    const runs = await deliverOutbox(now, { fetch: fetch as never, resolve: resolvePublic });
    expect(runs.find(r => r.webhookId === sub.id)).toMatchObject({ delivered: 2, failed: false });
    expect(calls.map(c => (JSON.parse(String(c.init.body)) as CloudEvent).subject)).toEqual(['Boundaries:v2', 'Boundaries:v2']);
    const h = calls[0]!.init.headers as Record<string, string>;
    expect(h['content-type']).toBe('application/cloudevents+json; charset=utf-8');
    const ts = Number(h['x-civicos-timestamp']);
    const want = `sha256=${createHmac('sha256', sub.signingSecret).update(`${ts}.${String(calls[0]!.init.body)}`).digest('hex')}`;
    expect(h['x-civicos-signature']).toBe(want);
    expect(signDelivery(sub.signingSecret, ts, String(calls[0]!.init.body))).toBe(want);

    // Nothing new: nothing sent.
    expect((await deliverOutbox(now, { fetch: fetch as never, resolve: resolvePublic })).find(r => r.webhookId === sub.id)).toBeUndefined();
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it('holds the cursor on failure and retries; refuses private addresses', async () => {
    const sub = subscribeWebhook({ topic: 'directive', url: 'https://hooks.example.gov/x' });
    recordAudit('Signer', 'directive.sign', 'Directive:D-1', 'ok');
    const failing = vi.fn(async () => new Response('no', { status: 500 }));
    const r1 = await deliverOutbox(Date.now(), { fetch: failing as never, resolve: resolvePublic });
    expect(r1.find(r => r.webhookId === sub.id)).toMatchObject({ delivered: 0, failed: true });
    expect(listWebhooks().find(w => w.id === sub.id)!.failures).toBe(1);
    const ok = vi.fn(async () => new Response('ok'));
    expect((await deliverOutbox(Date.now(), { fetch: ok as never, resolve: resolvePublic })).find(r => r.webhookId === sub.id)).toMatchObject({ delivered: 1 });
    expect(listWebhooks().find(w => w.id === sub.id)!.failures).toBe(0);

    const internal = subscribeWebhook({ topic: 'directive', url: 'https://hooks.example.gov/y' });
    recordAudit('Signer', 'directive.sign', 'Directive:D-2', 'ok');
    const runs = await deliverOutbox(Date.now(), { fetch: ok as never, resolve: async () => ['10.0.0.5'] });
    expect(runs.find(r => r.webhookId === internal.id)).toMatchObject({ failed: true, detail: expect.stringMatching(/private network/) });
  });

  it('keeps the secret sealed and skips subscriptions without a readable secret', async () => {
    const sub = subscribeWebhook({ topic: '*', url: 'https://hooks.example.gov/z' });
    const store = (globalThis as unknown as { __civicos: { webhookSecrets: Record<string, string> } }).__civicos;
    delete store.webhookSecrets[sub.id];
    recordAudit('Director', 'twin.source.run', 'Twin:SRC-1/RUN-1', 'ok');
    const runs = await deliverOutbox(Date.now(), { fetch: vi.fn() as never, resolve: resolvePublic });
    expect(runs.find(r => r.webhookId === sub.id)).toMatchObject({ failed: true, detail: expect.stringMatching(/issue a new secret/) });
    const next = rotateWebhookSecret(sub.id, 'Director');
    if ('error' in next) throw new Error(next.error);
    expect(webhookSigningSecret(sub.id)).toBe(next.signingSecret);
    expect(outboxDb().cursors[sub.id]).toBeGreaterThan(0);
  });
});

describe('organisation events', () => {
  it('are written for standing changes, not for register-type configuration', async () => {
    const { EVENT_ACTIONS } = await import('./outbox');
    expect(EVENT_ACTIONS.test('organisation.standing.granted')).toBe(true);
    expect(EVENT_ACTIONS.test('organisation.standing.struck-off')).toBe(true);
    expect(EVENT_ACTIONS.test('organisation.create')).toBe(true);
    expect(EVENT_ACTIONS.test('organisation.register-type.define')).toBe(false);
    expect(EVENT_ACTIONS.test('court.hearing.adjourned')).toBe(true);
    expect(EVENT_ACTIONS.test('immigration.grant')).toBe(true);
    expect(EVENT_ACTIONS.test('education.award.record')).toBe(true);
    expect(EVENT_ACTIONS.test('education.award.correct')).toBe(false);
    expect(EVENT_ACTIONS.test('tax.assess')).toBe(false);
    expect(EVENT_ACTIONS.test('profession.suspended')).toBe(true);
    expect(EVENT_ACTIONS.test('health.capacity.record')).toBe(false);
    expect(EVENT_ACTIONS.test('customs.release')).toBe(true);
    expect(EVENT_ACTIONS.test('customs.assess')).toBe(false);
  });
});
