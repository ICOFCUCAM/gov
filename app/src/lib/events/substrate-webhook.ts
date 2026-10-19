// Posting to a substrate federation webhook (civicos.event_webhooks), for the
// delivery worker (/api/cron/deliver-events) and the connectivity test
// (/api/federation/webhooks/test). Go-live review M-5.
//
// Same rules as the platform's CloudEvents webhooks (lib/events/deliver.ts):
// through safeFetchText, so only public addresses (every resolved address
// checked, the connection pinned to the checked one), unless the nation
// allows its own network with CIVICOS_WEBHOOKS_PRIVATE=1; redirects are never
// followed; a time and size limit. The body is signed with HMAC-SHA256.

import { createHmac } from 'node:crypto';
import { safeFetchText, type SafeFetchOptions } from '@/lib/net/safe-fetch';

export const SUBSTRATE_WEBHOOK_TIMEOUT_MS = 5000;

export type WebhookNet = Pick<SafeFetchOptions, 'fetch' | 'resolve'>;

export const substrateSignature = (secret: string, body: string): string =>
  `sha256=${createHmac('sha256', secret).update(body).digest('hex')}`;

/** POST `body` signed with `secret`; ok on a 2xx, otherwise the reason (for the operator's log, not for callers). */
export async function postSubstrateWebhook(
  url: string, secret: string, body: string, headers: Record<string, string>, net: WebhookNet = {},
): Promise<{ ok: boolean; detail: string }> {
  try {
    await safeFetchText(url, {
      allow: () => true,
      method: 'POST',
      body,
      headers: { 'content-type': 'application/json', 'x-civicos-signature': substrateSignature(secret, body), ...headers },
      timeoutMs: SUBSTRATE_WEBHOOK_TIMEOUT_MS,
      maxBytes: 64_000,
      redirects: 0,
      allowPrivate: process.env.CIVICOS_WEBHOOKS_PRIVATE === '1',
      ...net,
    });
    return { ok: true, detail: 'delivered' };
  } catch (e) {
    return { ok: false, detail: ((e as Error).message || 'not delivered').slice(0, 300) };
  }
}
