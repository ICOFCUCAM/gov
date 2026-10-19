// Interoperability: integration clients, federation grants and webhooks.
import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import { take } from '@/lib/exchange/rate-limit';
import { usageRefusal, obligations, type UsageRequest } from '@/lib/exchange/usage-policy';
import { advanceCursor } from '@/lib/events/outbox';
import { seal, open as openSealed } from '@/lib/crypto/envelope';
import type {
  IntegrationClient,
  IntegrationKind,
  IntegrationRegistered,
  FederationGrant,
  WebhookSubscription,
  WebhookCreated,
  FederationCheck,
} from '@/lib/api/types';
import { db } from './state';
import { uid } from './shared';
import { recordAudit } from './audit';

// ── Interoperability & federation (mirrors the backend contract) ──────
const HOME_TENANT = 'home';

export function listIntegrations(): IntegrationClient[] {
  return [...db.integrations].sort(
    (a, b) => +new Date(b.createdAt) - +new Date(a.createdAt),
  );
}

export function registerIntegration(input: {
  kind: IntegrationKind;
  name: string;
  ownerOrg: string;
  contact: string;
  scopes: string[];
}): IntegrationRegistered | { error: string } {
  if (db.integrations.some(i => i.name === input.name)) {
    return { error: 'Name already registered' };
  }
  const { rawKey, prefix } = newIntegrationKey();
  const client: IntegrationClient = {
    id: uid('IC'),
    kind: input.kind,
    name: input.name,
    ownerOrg: input.ownerOrg,
    scopes: input.scopes,
    status: 'pending',
    rateLimitRpm: 120,
    createdAt: new Date().toISOString(),
    keyPrefix: prefix,
    keyIssuedAt: new Date().toISOString(),
  };
  db.integrations.unshift(client);
  db.integrationKeys[client.id] = sha256Hex(rawKey);
  recordAudit('operator', 'integration.register', `Integration:${client.id}`, 'ok', `${input.name} · civ_${prefix}…`);
  return {
    id: client.id,
    status: client.status,
    apiKey: rawKey,
    note: 'Store this key now: it is shown once and kept only as a SHA-256 hash. PENDING until a ministry operator approves it.',
  };
}

const sha256Hex = (v: string) => createHash('sha256').update(v, 'utf8').digest('hex');
const INTEGRATION_KEY = /^civ_([0-9a-f]{8})_[A-Za-z0-9_-]{43}$/;

/** `civ_<8 hex prefix>_<32 random bytes, base64url>`: the prefix finds the client, the hash proves the key. */
function newIntegrationKey(): { rawKey: string; prefix: string } {
  const prefix = randomBytes(4).toString('hex');
  return { rawKey: `civ_${prefix}_${randomBytes(32).toString('base64url')}`, prefix };
}

/** Issue a new key for a client (the old one stops working at once); shown once, audited. */
export function rotateIntegrationKey(id: string, by: string): IntegrationRegistered | { error: string } {
  const c = db.integrations.find(i => i.id === id);
  if (!c) return { error: 'Integration not found' };
  if (c.status === 'revoked') return { error: 'A revoked integration gets no new key' };
  const { rawKey, prefix } = newIntegrationKey();
  c.keyPrefix = prefix;
  c.keyIssuedAt = new Date().toISOString();
  db.integrationKeys[c.id] = sha256Hex(rawKey);
  recordAudit(by, 'integration.key.rotate', `Integration:${c.id}`, 'ok', `civ_${prefix}…`);
  return { id: c.id, status: c.status, apiKey: rawKey, note: 'Store this key now: it is shown once. The previous key no longer works.' };
}

export type IntegrationAccess =
  | { ok: true; client: IntegrationClient; remaining: number }
  | { ok: false; status: 401 | 403 | 429; error: string; retryAfterSeconds?: number };

/**
 * Check an integration's API key on use (Authorization: Bearer civ_…): the
 * key's SHA-256 is compared in constant time with the one kept, the client
 * must be approved and hold `scope` (when given), and its `rateLimitRpm` is
 * enforced as a token bucket per client.
 */
export function verifyIntegrationKey(authorization: string | null | undefined, scope?: string, now = Date.now()): IntegrationAccess {
  const key = (authorization ?? '').replace(/^Bearer\s+/i, '').trim();
  const m = INTEGRATION_KEY.exec(key);
  if (!m) return { ok: false, status: 401, error: 'Send the integration key: Authorization: Bearer civ_…' };
  const want = Buffer.from(sha256Hex(key), 'hex');
  const client = db.integrations.find(c => {
    if (c.keyPrefix !== m[1]) return false;
    const h = db.integrationKeys[c.id];
    if (!h) return false;
    const have = Buffer.from(h, 'hex');
    return have.length === want.length && timingSafeEqual(have, want);
  });
  if (!client) return { ok: false, status: 401, error: 'Unknown or replaced integration key' };
  if (client.status !== 'approved') return { ok: false, status: 403, error: `This integration is ${client.status}` };
  if (scope && !client.scopes.includes(scope)) return { ok: false, status: 403, error: `Scope '${scope}' is not granted to this integration` };
  const rate = take(`integration:${client.id}`, client.rateLimitRpm, now);
  if (!rate.allowed) return { ok: false, status: 429, error: `Rate limit of ${client.rateLimitRpm} requests a minute reached`, retryAfterSeconds: rate.retryAfterSeconds };
  client.lastUsedAt = new Date(now).toISOString();
  client.calls = (client.calls ?? 0) + 1;
  return { ok: true, client, remaining: rate.remaining };
}

export function setIntegrationStatus(
  id: string,
  status: 'approved' | 'suspended' | 'revoked',
  by: string,
): IntegrationClient | { error: string } {
  const c = db.integrations.find(i => i.id === id);
  if (!c) return { error: 'Integration not found' };
  c.status = status;
  if (status === 'approved') c.approvedBy = by;
  recordAudit(by, `integration.${status}`, `Integration:${id}`, 'ok');
  return c;
}

export function listGrants(): FederationGrant[] {
  return [...db.grants].sort(
    (a, b) => +new Date(b.createdAt) - +new Date(a.createdAt),
  );
}

export function proposeGrant(input: {
  toTenant: string;
  scopes: string[];
  reason: string;
  expiresAt?: string;
  policy?: FederationGrant['policy'];
  by?: string;
}): FederationGrant | { error: string } {
  const by = input.by?.trim() || 'operator';
  const policyNote = input.policy ? `purposes ${input.policy.purposes.join(', ')}; keep ${input.policy.retentionDays} days; onward sharing ${input.policy.onwardSharing ? 'allowed' : 'not allowed'}` : undefined;
  if (input.toTenant === HOME_TENANT) {
    return { error: 'A tenant cannot federate with itself' };
  }
  const existing = db.grants.find(
    g => g.fromTenant === HOME_TENANT && g.toTenant === input.toTenant,
  );
  if (existing) {
    existing.scopes = input.scopes;
    existing.reason = input.reason;
    existing.status = 'proposed';
    existing.expiresAt = input.expiresAt;
    if (input.policy) existing.policy = input.policy;
    recordAudit(by, 'federation.propose', `Grant:${existing.id}`, 'ok', policyNote);
    return existing;
  }
  const grant: FederationGrant = {
    id: uid('FG'),
    fromTenant: HOME_TENANT,
    toTenant: input.toTenant,
    scopes: input.scopes,
    status: 'proposed',
    reason: input.reason,
    createdAt: new Date().toISOString(),
    expiresAt: input.expiresAt,
    ...(input.policy ? { policy: input.policy } : {}),
  };
  db.grants.unshift(grant);
  recordAudit(by, 'federation.propose', `Grant:${grant.id}`, 'ok', policyNote);
  return grant;
}

export function setGrantStatus(
  id: string,
  status: 'approved' | 'revoked',
  by: string,
): FederationGrant | { error: string } {
  const g = db.grants.find(x => x.id === id);
  if (!g) return { error: 'Grant not found' };
  g.status = status;
  if (status === 'approved') g.approvedBy = by;
  recordAudit(by, `federation.${status}`, `Grant:${id}`, 'ok');
  return g;
}

// The default-deny enforcement primitive. Fail closed.
export function federationCheck(
  toTenant: string,
  scope: string,
): FederationCheck {
  if (toTenant === HOME_TENANT) return { allowed: true, reason: 'same-tenant' };
  const g = db.grants.find(
    x => x.fromTenant === HOME_TENANT && x.toTenant === toTenant,
  );
  if (!g) return { allowed: false, reason: 'no grant (default deny)' };
  if (g.status !== 'approved') return { allowed: false, reason: `grant is ${g.status}` };
  if (g.expiresAt && new Date(g.expiresAt).getTime() < Date.now()) {
    return { allowed: false, reason: 'grant expired' };
  }
  if (!g.scopes.includes(scope)) {
    return { allowed: false, reason: `scope '${scope}' not granted` };
  }
  return { allowed: true, reason: 'granted' };
}

/**
 * A partner's exchange under a grant (/api/federation/exchange): the
 * default-deny decision of federationCheck(), the grant it rests on, and an
 * audit entry naming the calling integration.
 */
export function federationExchange(input: { tenant: string; scope: string; client: Pick<IntegrationClient, 'id' | 'name'>; usage?: UsageRequest }, now = Date.now()): FederationCheck & { grantId?: string; obligations?: ReturnType<typeof obligations> } {
  const grant = db.grants.find(x => x.fromTenant === HOME_TENANT && x.toTenant === input.tenant);
  let d: FederationCheck = federationCheck(input.tenant, input.scope);
  // The grant's usage policy (purpose, retention, onward sharing) is enforced at the exchange.
  if (d.allowed && grant) {
    const why = usageRefusal(grant.policy, input.usage ?? {});
    if (why) d = { allowed: false, reason: why };
  }
  const purpose = typeof input.usage?.purpose === 'string' ? ` · purpose ${input.usage.purpose}` : '';
  recordAudit(`Integration: ${input.client.name} (${input.client.id})`, 'federation.exchange', grant ? `Grant:${grant.id}` : `Tenant:${input.tenant}`, d.allowed ? 'ok' : 'denied', `${input.scope}${purpose} · ${d.reason}`);
  return { ...d, ...(grant ? { grantId: grant.id } : {}), ...(d.allowed && grant?.policy ? { obligations: obligations(grant.policy, now) } : {}) };
}

export function listWebhooks(): WebhookSubscription[] {
  return [...db.webhooks].sort(
    (a, b) => +new Date(b.createdAt) - +new Date(a.createdAt),
  );
}

export function subscribeWebhook(input: {
  topic: string;
  url: string;
}): WebhookCreated {
  const secret = `whsec_${randomBytes(32).toString('base64url')}`;
  const sub: WebhookSubscription = {
    id: uid('WH'),
    topic: input.topic,
    url: input.url,
    status: 'active',
    failures: 0,
    createdAt: new Date().toISOString(),
  };
  db.webhooks.unshift(sub);
  db.webhookSecrets[sub.id] = seal(secret, `webhook:${sub.id}`);
  const head = recordAudit('operator', 'webhook.subscribe', `Webhook:${sub.id}`, 'ok', input.topic);
  // A new subscriber receives events from now on, not the history.
  advanceCursor(sub.id, head.seq);
  return {
    id: sub.id,
    topic: sub.topic,
    signingSecret: secret,
    note: WEBHOOK_NOTE,
  };
}

const WEBHOOK_NOTE = 'Store this secret now: it is shown once. Deliveries are CloudEvents 1.0 (application/cloudevents+json); verify X-CivicOS-Signature = sha256=HMAC-SHA256(secret, `${X-CivicOS-Timestamp}.${body}`) and reject timestamps older than 300s.';

/** The webhook's signing secret, or null when it has none the server can read (made before secrets were kept, or sealed under another key). */
export function webhookSigningSecret(id: string): string | null {
  const stored = db.webhookSecrets[id];
  if (!stored) return null;
  const r = openSealed(stored, `webhook:${id}`);
  if ('error' in r) return null;
  if (r.reseal) db.webhookSecrets[id] = seal(r.plain, `webhook:${id}`);
  return r.plain;
}

/** A new signing secret for a webhook (shown once; the old one stops at once). Audited. */
export function rotateWebhookSecret(id: string, by: string): WebhookCreated | { error: string } {
  const w = db.webhooks.find(x => x.id === id);
  if (!w) return { error: 'Subscription not found' };
  const secret = `whsec_${randomBytes(32).toString('base64url')}`;
  db.webhookSecrets[id] = seal(secret, `webhook:${id}`);
  recordAudit(by, 'webhook.secret.rotate', `Webhook:${id}`, 'ok');
  return { id, topic: w.topic, signingSecret: secret, note: WEBHOOK_NOTE };
}

/** Record a delivery run's result on the subscription (consecutive failures; reset on success). */
export function noteWebhookDelivery(id: string, ok: boolean, detail: string, now = Date.now()): void {
  const w = db.webhooks.find(x => x.id === id);
  if (!w) return;
  w.failures = ok ? 0 : (w.failures ?? 0) + 1;
  w.lastDeliveryAt = new Date(now).toISOString();
  w.lastDeliveryDetail = detail.slice(0, 200);
}

export function setWebhookStatus(
  id: string,
  status: 'active' | 'paused' | 'disabled',
): WebhookSubscription | { error: string } {
  const w = db.webhooks.find(x => x.id === id);
  if (!w) return { error: 'Subscription not found' };
  w.status = status;
  recordAudit('operator', `webhook.${status}`, `Webhook:${id}`, 'ok');
  return w;
}
