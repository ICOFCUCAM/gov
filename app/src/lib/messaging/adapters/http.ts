// A generic HTTPS provider: an email API or an SMS gateway the nation chose,
// described by its address, headers and a body template (no vendor is built
// in). Sent through safeFetchText (lib/net/safe-fetch.ts): only to the
// configured host, its name resolved once and checked, private addresses
// refused unless CIVICOS_MESSAGING_PRIVATE=1, redirects not followed, the
// nation's egress proxy when it has one. The message's idempotency key goes
// in `Idempotency-Key` (and {{key}}), so a provider that honours it never
// sends a retried message twice.
//
// Template placeholders: {{to}} {{from}} {{subject}} {{text}} {{key}}
// {{secret}} {{username}} {{basic}} (base64 of username:secret) and
// {{unsubscribe}} (the one-click unsubscribe address of a site update, for
// APIs that take List-Unsubscribe; empty otherwise). In a JSON
// body each value is escaped for a JSON string; in a form body, URL-encoded.

import { safeFetchText, FetchStatusError, type SafeFetchOptions } from '@/lib/net/safe-fetch';
import { scrub } from '../privacy';
import type { ProviderConfig, RenderedMessage, SendResult } from '../types';

export type Vars = Record<'to' | 'from' | 'subject' | 'text' | 'key' | 'secret' | 'username' | 'basic' | 'unsubscribe', string>;

export function fillTemplate(template: string, vars: Vars, mode: 'json' | 'form' | 'header'): string {
  return template.replace(/\{\{(\w+)\}\}/g, (all, name: string) => {
    if (!(name in vars)) return all;
    const v = vars[name as keyof Vars];
    return mode === 'json' ? JSON.stringify(v).slice(1, -1) : mode === 'form' ? encodeURIComponent(v) : v.replace(/[\r\n]/g, ' ');
  });
}

/** Statuses that will not change on a retry: the request itself is refused. */
const PERMANENT = new Set([400, 404, 405, 410, 413, 415, 422]);

export async function sendHttp(p: ProviderConfig, m: RenderedMessage, secret: string | undefined, o: { allowPrivate: boolean; net?: Pick<SafeFetchOptions, 'fetch' | 'resolve'> }): Promise<SendResult> {
  const vars: Vars = {
    to: m.to, from: p.from, subject: m.subject, text: m.text, key: m.key,
    secret: secret ?? '', username: p.username ?? '', basic: Buffer.from(`${p.username ?? ''}:${secret ?? ''}`).toString('base64'),
    unsubscribe: (m.headers['List-Unsubscribe'] ?? '').replace(/^<|>$/g, ''),
  };
  const target = new URL(p.url!);
  const headers: Record<string, string> = {
    'content-type': p.contentType === 'form' ? 'application/x-www-form-urlencoded' : 'application/json',
    'idempotency-key': m.key,
  };
  for (const [k, v] of Object.entries(p.headers ?? {})) headers[k.toLowerCase()] = fillTemplate(v, vars, 'header');
  try {
    const r = await safeFetchText(p.url!, {
      allow: u => u.host === target.host,
      method: p.method ?? 'POST',
      body: fillTemplate(p.bodyTemplate ?? '', vars, p.contentType === 'form' ? 'form' : 'json'),
      headers,
      accept: 'application/json, text/plain;q=0.5, */*;q=0.1',
      timeoutMs: 15_000,
      maxBytes: 64_000,
      redirects: 0,
      allowPrivate: o.allowPrivate,
      ...(p.caPem ? { ca: p.caPem } : {}),
      ...(o.net ?? {}),
    });
    let id: string | undefined;
    try {
      const j = JSON.parse(r.text) as Record<string, unknown>;
      const v = j.id ?? j.messageId ?? j.message_id;
      if (typeof v === 'string' || typeof v === 'number') id = String(v).slice(0, 200);
    } catch { /* not JSON: accepted without an id */ }
    return { ok: true, ...(id ? { id } : {}) };
  } catch (e) {
    const status = e instanceof FetchStatusError ? e.status : 0;
    return { ok: false, permanent: PERMANENT.has(status), error: scrub(`${p.name}: ${(e as Error).message}`) };
  }
}
