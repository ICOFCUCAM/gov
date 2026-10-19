// The providers a nation connects to send its email and SMS (register 13.5).
// Configured by an administrator (/admin/messaging, /api/messaging, ADMIN_ONLY
// in lib/auth/roles.ts), every change audited without secrets or addresses.
//
// Three kinds, all the nation's own choice; no vendor is built in:
//   - smtp: its mail relay, over STARTTLS (587) or implicit TLS (465) only,
//     the certificate checked (an internal CA may be given);
//   - http-email: an HTTPS email API, described by a URL, headers and a body
//     template;
//   - http-sms: an HTTPS SMS gateway, described the same way.
// The password or API key is sealed (lib/crypto/envelope.ts, under the key
// custody of CIVICOS_DATA_KEK or the key provider) and never returned.
// Connections go only to the configured host, through the platform's rules
// for outside addresses (lib/net: names resolved once and checked, private
// addresses refused unless CIVICOS_MESSAGING_PRIVATE=1 lets the nation's own
// network in, the nation's egress proxy when it has one).

import { recordAudit } from '@/lib/data/store/audit';
import { seal, open, encryptionAtRest } from '@/lib/crypto/envelope';
import { checkPublicUrl } from '@/lib/public-sites/url-safety';
import { mdb } from './outbox';
import { fillTemplate } from './adapters/http';
import type { MessageChannel, MessagingSettings, ProviderConfig, ProviderKind, ProviderView } from './types';

export const PROVIDER_KINDS: { kind: ProviderKind; channel: MessageChannel; label: string }[] = [
  { kind: 'smtp', channel: 'email', label: 'Mail relay (SMTP)' },
  { kind: 'http-email', channel: 'email', label: 'Email service (HTTPS API)' },
  { kind: 'http-sms', channel: 'sms', label: 'SMS gateway (HTTPS API)' },
];

/** Whether private and internal addresses may be reached (the nation's own network). */
export const privateNetworkAllowed = (env: NodeJS.ProcessEnv = process.env): boolean => env.CIVICOS_MESSAGING_PRIVATE === '1';

const str = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const EMAIL = /^[^\s@<>()[\]\\,;:"]{1,64}@[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+$/i;
const HOST = /^(?=.{1,253}$)[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)*$/i;
const HEADER = /^[A-Za-z0-9-]{1,64}$/;
const aad = (p: { nationId: string; id: string }) => `messaging:${p.nationId}:${p.id}`;

export const viewProvider = (p: ProviderConfig): ProviderView => {
  const { secret, ...rest } = p;
  return { ...structuredClone(rest), hasSecret: !!secret };
};

export function listProviders(nationId: string): ProviderView[] {
  return [...(mdb().providers[nationId] ?? [])].sort((a, b) => a.priority - b.priority).map(viewProvider);
}

/** The enabled providers for a channel, in the order they are tried. */
export function activeProviders(nationId: string, channel: MessageChannel): ProviderConfig[] {
  return (mdb().providers[nationId] ?? []).filter(p => p.enabled && p.channel === channel).sort((a, b) => a.priority - b.priority);
}

/** "connected" when an enabled provider can send the channel. */
export const connection = (nationId: string, channel: MessageChannel): 'connected' | 'not connected' =>
  activeProviders(nationId, channel).length ? 'connected' : 'not connected';

/** A provider's password or API key, opened (resealed under the current key when it was under an older one). */
export function providerSecret(p: ProviderConfig): string | undefined {
  if (!p.secret) return undefined;
  const o = open(p.secret, aad(p));
  if ('error' in o) throw new Error(`The provider's secret cannot be opened: ${o.error}`);
  if (o.reseal) p.secret = seal(o.plain, aad(p));
  return o.plain;
}

export interface ProviderInput {
  id?: string; kind?: string; name?: string; enabled?: boolean; priority?: number; from?: string; replyTo?: string;
  host?: string; port?: number; security?: string; username?: string; caPem?: string;
  url?: string; method?: string; contentType?: string; headers?: Record<string, string>; bodyTemplate?: string;
  /** New password or API key; absent keeps the one held, '' removes it. */
  secret?: string;
  perMinute?: number;
}

type Err = { error: string; status: number };
const bad = (error: string): Err => ({ error, status: 422 });

/** Check and save a provider. Returns it (without its secret) or why not. */
export function saveProvider(nationId: string, input: ProviderInput, by: string, now = Date.now()): ProviderView | Err {
  if (!by.trim()) return bad('Name who is making the change');
  const db = mdb();
  const list = (db.providers[nationId] ??= []);
  const existing = input.id ? list.find(p => p.id === input.id) : undefined;
  if (input.id && !existing) return { error: 'Provider not found', status: 404 };
  const kind = (input.kind ?? existing?.kind) as ProviderKind;
  const def = PROVIDER_KINDS.find(k => k.kind === kind);
  if (!def) return bad('Kind must be smtp, http-email or http-sms');
  if (existing && existing.kind !== kind) return bad('A provider keeps its kind; add a new one instead');
  const pick = <K extends keyof ProviderInput & keyof ProviderConfig>(k: K) => (input[k] !== undefined ? input[k] : existing?.[k]);
  const name = str(pick('name'), 80);
  if (name.length < 2) return bad('Give the provider a name');
  const from = str(pick('from'), 200);
  const replyTo = str(pick('replyTo'), 200) || undefined;
  if (def.channel === 'email' && !EMAIL.test(from)) return bad('Give the sender address (e.g. updates@gov.example)');
  if (def.channel === 'sms' && !/^[A-Za-z0-9 +]{2,20}$/.test(from)) return bad('Give the SMS sender name or number (letters, digits, up to 20)');
  if (replyTo && !EMAIL.test(replyTo)) return bad('The reply-to address does not look right');
  const perMinute = Math.round(Number(pick('perMinute') ?? 60));
  if (!(perMinute >= 1 && perMinute <= 6000)) return bad('Messages per minute must be between 1 and 6000');
  const priority = Math.round(Number(pick('priority') ?? list.length + 1));
  const p: ProviderConfig = {
    id: existing?.id ?? `MP-${(db.seq++).toString().padStart(3, '0')}`, nationId, kind, channel: def.channel, name,
    enabled: input.enabled !== undefined ? !!input.enabled : existing?.enabled ?? true,
    priority: Number.isFinite(priority) ? priority : list.length + 1, from, ...(replyTo ? { replyTo } : {}), perMinute,
    createdAt: existing?.createdAt ?? new Date(now).toISOString(), createdBy: existing?.createdBy ?? by,
    updatedAt: new Date(now).toISOString(), updatedBy: by, ...(existing?.lastResult ? { lastResult: existing.lastResult } : {}),
  };
  if (kind === 'smtp') {
    const host = str(pick('host'), 253).toLowerCase();
    if (!HOST.test(host)) return bad('Give the mail relay\'s host name (e.g. smtp.gov.example)');
    const security = (pick('security') ?? 'starttls') as string;
    if (security !== 'starttls' && security !== 'tls') return bad('Security must be STARTTLS or TLS: messages are never sent over a connection without TLS');
    const port = Math.round(Number(pick('port') ?? (security === 'tls' ? 465 : 587)));
    if (!(port >= 1 && port <= 65535)) return bad('The port is a number from 1 to 65535');
    const username = str(pick('username'), 200) || undefined;
    const caPem = str(pick('caPem'), 20_000) || undefined;
    if (caPem && !/^-----BEGIN CERTIFICATE-----[\s\S]+-----END CERTIFICATE-----$/.test(caPem)) return bad('The certificate authority must be a PEM certificate');
    Object.assign(p, { host, port, security, ...(username ? { username } : {}), ...(caPem ? { caPem } : {}) });
  } else {
    const url = str(pick('url'), 500);
    const c = checkUrl(url);
    if (c) return bad(c);
    const method = (pick('method') ?? 'POST') as string;
    if (method !== 'POST' && method !== 'PUT') return bad('Method must be POST or PUT');
    const contentType = (pick('contentType') ?? 'json') as string;
    if (contentType !== 'json' && contentType !== 'form') return bad('Body type must be json or form');
    const headers = (pick('headers') ?? {}) as Record<string, string>;
    if (typeof headers !== 'object' || Array.isArray(headers) || Object.keys(headers).length > 12) return bad('Headers are a list of up to 12 names and values');
    const clean: Record<string, string> = {};
    for (const [k, v] of Object.entries(headers)) {
      if (!HEADER.test(k) || /^(host|content-length|content-type|transfer-encoding|connection)$/i.test(k)) return bad(`The header ${k} cannot be set`);
      if (typeof v !== 'string' || v.length > 1000 || /[\r\n]/.test(v)) return bad(`The value of ${k} must be one line of text`);
      clean[k] = v;
    }
    const bodyTemplate = str(pick('bodyTemplate'), 4000);
    if (!bodyTemplate.includes('{{to}}')) return bad('The body template must place the recipient ({{to}})');
    if (!bodyTemplate.includes('{{text}}')) return bad('The body template must place the message text ({{text}})');
    if (contentType === 'json') {
      try { JSON.parse(fillTemplate(bodyTemplate, { to: 'a"b', from: 'x', subject: 's', text: 'line\none "quoted"', key: 'k', secret: 's', username: 'u', basic: 'b', unsubscribe: '' }, 'json')); }
      catch { return bad('The body template is not valid JSON once filled in: put each {{placeholder}} inside a JSON string'); }
    }
    const username = str(pick('username'), 200) || undefined;
    const caPem = str(pick('caPem'), 20_000) || undefined;
    if (caPem && !/^-----BEGIN CERTIFICATE-----[\s\S]+-----END CERTIFICATE-----$/.test(caPem)) return bad('The certificate authority must be a PEM certificate');
    Object.assign(p, { url, method, contentType, headers: clean, bodyTemplate, ...(username ? { username } : {}), ...(caPem ? { caPem } : {}) });
  }
  // The secret: a new one is sealed; absent keeps the one held; '' removes it.
  try {
    if (typeof input.secret === 'string' && input.secret !== '') p.secret = seal(input.secret.slice(0, 4000), aad(p));
    else if (input.secret === undefined && existing?.secret) p.secret = existing.secret;
  } catch (e) { return { error: (e as Error).message, status: 503 }; }
  if (existing) {
    for (const k of Object.keys(existing) as (keyof ProviderConfig)[]) if (!(k in p)) delete existing[k];
    Object.assign(existing, p);
  } else list.push(p);
  recordAudit(by, existing ? 'messaging.provider.update' : 'messaging.provider.add', `Messaging:${nationId}/${p.id}`, 'ok',
    `${p.kind} · ${p.name} · ${p.kind === 'smtp' ? `${p.host}:${p.port} ${p.security}` : new URL(p.url!).host} · ${p.enabled ? 'enabled' : 'disabled'}${input.secret !== undefined ? ` · secret ${input.secret ? 'replaced' : 'removed'}` : ''}`);
  return viewProvider(existing ?? p);
}

/** The reason an API address cannot be used, or null. */
function checkUrl(url: string): string | null {
  let u: URL;
  try { u = new URL(url); } catch { return 'Give the provider\'s https:// address'; }
  if (u.protocol !== 'https:') return 'The provider\'s address must be https://';
  if (u.username || u.password) return 'Put credentials in the secret, not in the address';
  if (!privateNetworkAllowed()) {
    const c = checkPublicUrl(url);
    if (!c.ok) return `${c.error} (the nation's own network is reached only with CIVICOS_MESSAGING_PRIVATE=1)`;
  }
  return null;
}

export function removeProvider(nationId: string, id: string, by: string): { ok: true } | Err {
  if (!by.trim()) return bad('Name who is making the change');
  const list = mdb().providers[nationId] ?? [];
  const i = list.findIndex(p => p.id === id);
  if (i < 0) return { error: 'Provider not found', status: 404 };
  const [p] = list.splice(i, 1);
  delete mdb().sends[p!.id];
  recordAudit(by, 'messaging.provider.remove', `Messaging:${nationId}/${p!.id}`, 'ok', `${p!.kind} · ${p!.name}`);
  return { ok: true };
}

export function getSettings(nationId: string): MessagingSettings {
  return structuredClone(mdb().settings[nationId] ?? {});
}

/** The address links in messages start with: the nation's setting, else CIVICOS_PUBLIC_URL. */
export function publicBase(nationId: string, env: NodeJS.ProcessEnv = process.env): string | null {
  const v = mdb().settings[nationId]?.publicUrl || env.CIVICOS_PUBLIC_URL?.trim();
  return v ? v.replace(/\/+$/, '') : null;
}

export function saveSettings(nationId: string, input: { publicUrl?: string | null }, by: string, now = Date.now()): MessagingSettings | Err {
  if (!by.trim()) return bad('Name who is making the change');
  const s = (mdb().settings[nationId] ??= {});
  if (input.publicUrl !== undefined) {
    const v = str(input.publicUrl ?? '', 300).replace(/\/+$/, '');
    if (v) {
      let u: URL;
      try { u = new URL(v); } catch { return bad('Give the platform\'s public address, e.g. https://www.gov.example'); }
      if (u.protocol !== 'https:' && !(u.protocol === 'http:' && (u.hostname === 'localhost' || u.hostname === '127.0.0.1'))) return bad('The public address must be https:// (http only for localhost while testing)');
      if (u.username || u.password || u.search || u.hash || (u.pathname !== '/' && u.pathname !== '')) return bad('Give the address only, without a path');
      s.publicUrl = u.origin;
    } else delete s.publicUrl;
  }
  s.updatedAt = new Date(now).toISOString();
  s.updatedBy = by;
  recordAudit(by, 'messaging.settings', `Messaging:${nationId}`, 'ok', `public address ${s.publicUrl ?? 'cleared'}`);
  return structuredClone(s);
}

/** Whether secrets are sealed at rest (shown to the administrator). */
export const secretsSealed = (): boolean => encryptionAtRest().enabled;
