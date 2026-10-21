// Plan I0.2 (spec Part 6 F, l.4498 and l.4501): a training or demo
// installation never sends a real notification or webhook. Messages, the
// administrator's provider test, CloudEvents webhooks and substrate
// federation webhooks are recorded as simulated, with no request made.
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { listAudit, subscribeWebhook, listWebhooks, recordAudit } from '@/lib/data/store';
import { resetMessaging, enqueue, messageById, INSTALLED_NATION } from './outbox';
import { saveProvider } from './providers';
import { deliverMessages, sendTest } from './deliver';
import { deliverOutbox } from '@/lib/events/deliver';
import { recentDeliveries, resetOutbox } from '@/lib/events/outbox';
import { postSubstrateWebhook } from '@/lib/events/substrate-webhook';

const ok = <T,>(r: T): Exclude<T, { error: string }> => { if (r && typeof r === 'object' && 'error' in r) throw new Error((r as { error: string }).error); return r as Exclude<T, { error: string }>; };
const T0 = Date.UTC(2026, 9, 21, 12, 0, 0);
const provider = () => ok(saveProvider(INSTALLED_NATION, {
  kind: 'http-email', name: 'Mail API', from: 'updates@gov.example', url: 'https://mail.gov.example/v1/send',
  bodyTemplate: '{"to":"{{to}}","subject":"{{subject}}","text":"{{text}}"}', secret: 'k',
}, 'Admin', T0));
const spy = () => vi.fn(async () => new Response('{"id":"x"}', { status: 200, headers: { 'content-type': 'application/json' } }));

beforeEach(() => { resetMessaging(); resetOutbox(); for (const w of listWebhooks()) w.status = 'paused'; });
afterEach(() => vi.unstubAllEnvs());

for (const mode of ['training', 'demo'] as const) {
  describe(`a ${mode} installation sends nothing real`, () => {
    beforeEach(() => vi.stubEnv('CIVICOS_MODE', mode));

    it('records a due message as simulated, with no request to the provider', async () => {
      provider();
      const fetch = spy();
      const m = enqueue({ key: `sim-${mode}`, channel: 'email', stream: 'test', kind: 'test', to: 'person@example.org', subject: 's', text: 't' }, T0);
      const run = await deliverMessages(T0, { http: { fetch: fetch as never, resolve: async () => ['203.0.113.10'] } });
      expect(fetch).not.toHaveBeenCalled();
      expect(run).toMatchObject({ sent: 1, simulated: 1 });
      expect(messageById(m.id)).toMatchObject({ status: 'sent', simulated: true });
      expect(listAudit().find(e => e.action === 'messaging.deliver')!.detail).toMatch(/simulated/);
    });

    it('an administrator\'s provider test is recorded as simulated, not sent', async () => {
      const p = provider();
      const fetch = spy();
      const r = await sendTest(INSTALLED_NATION, p.id, 'tester@example.org', 'Admin', { http: { fetch: fetch as never, resolve: async () => ['203.0.113.10'] } });
      expect(fetch).not.toHaveBeenCalled();
      expect(r).toMatchObject({ ok: true, detail: expect.stringMatching(/simulated/i) });
    });

    it('records each webhook event as a simulated delivery, advancing the cursor, with no request', async () => {
      const sub = subscribeWebhook({ topic: 'boundary', url: 'https://hooks.example.gov/civicos', by: 'Admin' });
      recordAudit('Director', 'boundary.publish', `Boundaries:${mode}`, 'ok');
      const fetch = vi.fn();
      const runs = await deliverOutbox(Date.now(), { fetch: fetch as never, resolve: async () => ['203.0.113.10'] });
      expect(fetch).not.toHaveBeenCalled();
      expect(runs.find(r => r.webhookId === sub.id)).toMatchObject({ delivered: 1, failed: false, simulated: true });
      expect(recentDeliveries().find(d => d.webhookId === sub.id)).toMatchObject({ ok: true, simulated: true });
      // The cursor moved on: nothing is replayed later.
      expect((await deliverOutbox(Date.now(), { fetch: fetch as never })).find(r => r.webhookId === sub.id)).toBeUndefined();
    });

    it('a substrate federation webhook is not posted', async () => {
      const fetch = vi.fn();
      const r = await postSubstrateWebhook('https://partner.example/hook', 'secret', '{}', {}, { fetch: fetch as never, resolve: async () => ['203.0.113.10'] });
      expect(fetch).not.toHaveBeenCalled();
      expect(r).toMatchObject({ ok: true, simulated: true });
    });
  });
}

describe('a production installation sends', () => {
  it('posts the message to the provider', async () => {
    vi.stubEnv('CIVICOS_MODE', 'production');
    provider();
    const fetch = spy();
    const m = enqueue({ key: 'prod-1', channel: 'email', stream: 'test', kind: 'test', to: 'person@example.org', subject: 's', text: 't' }, T0);
    const run = await deliverMessages(T0, { http: { fetch: fetch as never, resolve: async () => ['203.0.113.10'] } });
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(run).toMatchObject({ sent: 1, simulated: 0 });
    expect(messageById(m.id)!.simulated).toBeUndefined();
  });
});
