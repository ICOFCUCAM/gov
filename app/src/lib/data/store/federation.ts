// Interoperability: integration clients, federation grants and webhooks.
import { samplesAllowed } from '@/lib/ops/mode';
import { citeBasis } from '@/lib/law/policy-change';
import type { Citation } from '@/lib/law/register';
import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import { take } from '@/lib/exchange/rate-limit';
import { usageRefusal, obligations, parsePurposes, type UsageRequest } from '@/lib/exchange/usage-policy';
import { dualControlRefusal, independenceOf, dualControlPendingHours } from '@/lib/data/dual-control';
import { advanceCursor } from '@/lib/events/outbox';
import { seal, open as openSealed } from '@/lib/crypto/envelope';
import type {
  IntegrationClient,
  IntegrationKind,
  IntegrationRegistered,
  IntegrationApprovalProposal,
  IntegrationApprovalRecord,
  FederationGrant,
  WebhookSubscription,
  WebhookCreated,
  FederationCheck,
} from '@/lib/api/types';
import { db } from './state';
import { uid } from './shared';
import { recordAudit, UNVERIFIED_ACTOR } from './audit';

// ── Interoperability & federation (mirrors the backend contract) ──────
const HOME_TENANT = 'home';

export function listIntegrations(now = Date.now()): IntegrationClient[] {
  lapseIntegrationApprovals(now);
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
  /** Who acted: the verified official (routes pass it from the session). */
  by?: string;
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
  recordAudit(input.by || UNVERIFIED_ACTOR, 'integration.register', `Integration:${client.id}`, 'ok', `${input.name} · civ_${prefix}…`);
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
  return admit(client, scope, now);
}

/** The checks every use of an integration's credential passes: approved, holds the scope, within its rate limit. */
function admit(client: IntegrationClient, scope: string | undefined, now: number): IntegrationAccess {
  if (client.status !== 'approved') return { ok: false, status: 403, error: `This integration is ${client.status}` };
  if (scope && !client.scopes.includes(scope)) return { ok: false, status: 403, error: `Scope '${scope}' is not granted to this integration` };
  const rate = take(`integration:${client.id}`, client.rateLimitRpm, now);
  if (!rate.allowed) return { ok: false, status: 429, error: `Rate limit of ${client.rateLimitRpm} requests a minute reached`, retryAfterSeconds: rate.retryAfterSeconds };
  client.lastUsedAt = new Date(now).toISOString();
  client.calls = (client.calls ?? 0) + 1;
  return { ok: true, client, remaining: rate.remaining };
}

/**
 * Check a use of an access token issued for an integration's key (OAuth2
 * client credentials, lib/auth/client-credentials.ts) once its signature and
 * lifetime have been verified: the integration as it stands now must still
 * hold the key the token was issued for (a rotated key ends its tokens), be
 * approved and hold `scope`; its rate limit applies as for the key itself.
 */
export function verifyIntegrationToken(clientId: string, keyPrefix: string, scope: string | undefined, now = Date.now()): IntegrationAccess {
  const client = db.integrations.find(c => c.id === clientId);
  if (!client || !keyPrefix || client.keyPrefix !== keyPrefix || !db.integrationKeys[client.id]) return { ok: false, status: 401, error: 'The token was issued for a key that has been replaced or removed: ask for a new token' };
  return admit(client, scope, now);
}

/**
 * Suspend or revoke an integration (one administrator: it only takes access
 * away). Approving one, or changing what it is approved for, takes two
 * officials: proposeIntegrationApproval() then confirmIntegrationApproval().
 */
export function setIntegrationStatus(
  id: string,
  status: 'approved' | 'suspended' | 'revoked',
  by: string,
): IntegrationClient | { error: string } {
  const c = db.integrations.find(i => i.id === id);
  if (!c) return { error: 'Integration not found' };
  if (status === 'approved') return { error: 'Approving an integration takes two officials: one proposes its scopes and purposes, a different one confirms' };
  c.status = status;
  if (status === 'revoked' && c.pendingApproval) closeProposal(c, 'withdrawn', new Date(), { withdrawnBy: by });
  recordAudit(by, `integration.${status}`, `Integration:${id}`, 'ok');
  return c;
}

// ── Approving an outside caller: two officials, scopes and purposes ────
//
// An integration is approved for its scopes and, for each exchange service
// it may call (scope service:<id>), the purposes it may state (short slugs,
// parsed as for grant usage policies). One administrator proposes, a
// different one confirms (dualControlRefusal(): verified sessions, and a
// different person at the identity provider); a proposal not confirmed
// within the country's dual-control waiting period (dualControlPolicy()
// .pendingHours, read through dualControlPendingHours()) lapses and is kept
// in the integration's approval history.
// A change of scopes or purposes on an approved integration is the same
// two-official step; until it is confirmed the approved terms stay in force.
//
// Integrations approved before this change (snapshots) have no `approval`
// and no `purposes`: they keep their status and scopes, and the exchange
// services treat their purposes as not yet approved (integrationPurposes()):
// refused in a production installation, allowed and noted on the receipt in
// demo and training.

const normalise = (c: IntegrationClient): IntegrationClient => { c.approvalHistory ??= []; return c; };

function closeProposal(c: IntegrationClient, outcome: IntegrationApprovalRecord['outcome'], now: Date, extra: Partial<IntegrationApprovalRecord> = {}): IntegrationApprovalRecord | undefined {
  const p = c.pendingApproval;
  if (!p) return undefined;
  const rec: IntegrationApprovalRecord = { ...p, outcome, closedAt: now.toISOString(), ...extra };
  normalise(c).approvalHistory!.push(rec);
  c.pendingApproval = undefined;
  return rec;
}

/** Close proposals left unconfirmed past the dual-control waiting period; kept in history, audited. */
export function lapseIntegrationApprovals(now = Date.now()): number {
  const hours = dualControlPendingHours();
  let n = 0;
  for (const c of db.integrations) {
    const p = c.pendingApproval;
    if (!p || now - Date.parse(p.at) <= hours * 3_600_000) continue;
    closeProposal(c, 'lapsed', new Date(now));
    recordAudit('System (dual control)', 'integration.approval.lapse', `Integration:${c.id}`, 'ok', `proposed by ${p.by} on ${p.at.slice(0, 16)}; not confirmed within ${hours} h`);
    n++;
  }
  return n;
}

const SCOPE = /^[A-Za-z][A-Za-z0-9._:*-]{0,80}$/;
const SERVICE_ID = /^[a-z][a-z0-9.-]{1,60}$/;

/** Check proposed terms: scopes, and purposes for every service scope (and only for those). */
function parseTerms(input: { scopes?: unknown; purposes?: unknown }, current: IntegrationClient): Pick<IntegrationApprovalProposal, 'scopes' | 'purposes'> | { error: string } {
  const rawScopes: unknown[] | null = input.scopes === undefined ? current.scopes : Array.isArray(input.scopes) ? input.scopes : typeof input.scopes === 'string' ? input.scopes.split(',') : null;
  if (!rawScopes) return { error: 'Scopes are a list' };
  const scopes = Array.from(new Set(rawScopes.filter((x): x is string => typeof x === 'string').map(x => x.trim()).filter(Boolean)));
  if (!scopes.length) return { error: 'Name at least one scope' };
  if (scopes.length > 50 || scopes.some(x => !SCOPE.test(x))) return { error: 'Scopes are up to 50 names such as permit:read or service:person.verify' };
  const raw = input.purposes === undefined ? (current.purposes ?? {}) : input.purposes;
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return { error: 'Purposes are given per service: { "person.verify": ["identity-card-enrolment"] }' };
  const purposes: Record<string, string[]> = {};
  for (const [service, list] of Object.entries(raw as Record<string, unknown>)) {
    if (!SERVICE_ID.test(service)) return { error: `'${service}' is not a service id` };
    if (!scopes.includes(`service:${service}`)) return { error: `Purposes for ${service} need the scope service:${service}` };
    const p = parsePurposes(list);
    if ('error' in p) return { error: `${service}: ${p.error}` };
    purposes[service] = p;
  }
  const missing = scopes.filter(x => x.startsWith('service:') && !purposes[x.slice('service:'.length)]);
  if (missing.length) return { error: `Name the purposes approved for ${missing.map(x => x.slice('service:'.length)).join(', ')}` };
  return { scopes, purposes };
}

const termsText = (t: { scopes: string[]; purposes: Record<string, string[]> }) =>
  `scopes ${t.scopes.join(', ')}${Object.keys(t.purposes).length ? ` · purposes ${Object.entries(t.purposes).map(([s, p]) => `${s}: ${p.join('/')}`).join('; ')}` : ''}`;

/**
 * One administrator proposes approving an integration (or changing what an
 * approved one may do): its scopes and, per service, its purposes. A waiting
 * proposal it replaces is kept as superseded. Audited.
 */
export function proposeIntegrationApproval(id: string, input: { scopes?: unknown; purposes?: unknown; note?: unknown; legalBasis?: unknown; owners?: string[] }, by: string, byId?: string, now = new Date()): IntegrationClient | { error: string } {
  lapseIntegrationApprovals(now.getTime());
  const c = db.integrations.find(i => i.id === id);
  if (!c) return { error: 'Integration not found' };
  if (c.status === 'revoked') return { error: 'A revoked integration is not approved again; register it anew' };
  const terms = parseTerms(input, c);
  if ('error' in terms) return terms;
  const note = typeof input.note === 'string' ? input.note.trim().slice(0, 300) : '';
  // The law that permits the sharing, cited from the laws register: required in production, checked whenever given.
  const given = Array.isArray(input.legalBasis) && input.legalBasis.length > 0;
  let basis: Citation[] = [];
  if (given || !samplesAllowed()) {
    const b = citeBasis(input.legalBasis, now.toISOString().slice(0, 10), `Data sharing with ${c.name}`);
    if ('error' in b) return b;
    basis = b;
  }
  const owners = [...new Set((input.owners ?? []).filter(Boolean))];
  if (c.pendingApproval) {
    closeProposal(c, 'superseded', now);
    recordAudit(by, 'integration.approval.supersede', `Integration:${id}`, 'ok', 'replaced by a new proposal');
  }
  c.pendingApproval = { ...terms, by, ...(byId ? { byId } : {}), at: now.toISOString(), ...(note ? { note } : {}), ...(basis.length ? { basis } : {}), ...(owners.length ? { owners, consents: [] } : {}) };
  normalise(c);
  recordAudit(by, 'integration.approval.propose', `Integration:${id}`, 'ok', `${c.name} · ${termsText(terms)} · waiting for a second official`);
  return c;
}

/** A different official confirms the waiting proposal: from then the integration is approved for those terms. */
export function confirmIntegrationApproval(id: string, by: string, byId?: string, now = new Date(), institution?: string): IntegrationClient | { error: string } {
  lapseIntegrationApprovals(now.getTime());
  const c = db.integrations.find(i => i.id === id);
  if (!c) return { error: 'Integration not found' };
  const p = c.pendingApproval;
  if (!p) return { error: 'No proposal waits for confirmation (a proposal lapses when not confirmed in time; propose again)' };
  if (c.status === 'revoked') return { error: 'This integration is revoked' };
  const why = dualControlRefusal(p, { by, byId });
  if (why) return { error: why };
  // In production, every institution that owns a service the terms open agrees: an official of
  // each confirms (a different person from the proposer and from each other).
  if (p.owners?.length && !samplesAllowed()) {
    const consents = p.consents ??= [];
    const waiting = p.owners.filter(o => !consents.some(x => x.institution === o));
    if (!institution || !waiting.includes(institution)) return { error: `The data's owners confirm this sharing: an official of ${waiting.join(', ')} confirms it${institution && consents.some(x => x.institution === institution) ? ' (your institution already has)' : ''}` };
    for (const x of consents) { const same = dualControlRefusal({ by: x.by, ...(x.byId ? { byId: x.byId } : {}) }, { by, byId }); if (same) return { error: `${x.by} already confirmed for ${x.institution}: a different person confirms for ${institution}` }; }
    consents.push({ institution, by, ...(byId ? { byId } : {}), at: now.toISOString() });
    if (waiting.length > 1) {
      recordAudit(by, 'integration.approval.consent', `Integration:${id}`, 'ok', `${institution} agreed · still waiting for ${waiting.filter(o => o !== institution).join(', ')}`);
      return c;
    }
  }
  const independence = independenceOf(p.byId, byId);
  const rec = closeProposal(c, 'confirmed', now, { confirmedBy: by, ...(byId ? { confirmedById: byId } : {}), independence })!;
  c.scopes = [...rec.scopes];
  c.purposes = structuredClone(rec.purposes);
  c.status = 'approved';
  c.approvedBy = by;
  c.approval = rec;
  recordAudit(by, 'integration.approved', `Integration:${id}`, 'ok', `${termsText(rec)} · proposed by ${p.by}, confirmed by ${by} (${independence})`);
  return c;
}

/** Withdraw a waiting proposal (any administrator); kept in history, audited. */
export function withdrawIntegrationApproval(id: string, by: string, now = new Date()): IntegrationClient | { error: string } {
  const c = db.integrations.find(i => i.id === id);
  if (!c) return { error: 'Integration not found' };
  if (!closeProposal(c, 'withdrawn', now, { withdrawnBy: by })) return { error: 'No proposal waits for confirmation' };
  recordAudit(by, 'integration.approval.withdraw', `Integration:${id}`, 'ok');
  return c;
}

/**
 * The purposes an outside caller may state for a service:
 * - `approved`: the integration's two-official approval names them (possibly none for this service);
 * - `legacy`: approved before purposes were recorded, so none are approved yet
 *   (the exchange services refuse in production and allow, noted, in demo and training);
 * - `unknown`: no such approved integration.
 */
export function integrationPurposes(id: string, serviceId: string): { kind: 'approved'; purposes: string[] } | { kind: 'legacy' } | { kind: 'unknown' } {
  const c = db.integrations.find(i => i.id === id);
  if (!c || c.status !== 'approved') return { kind: 'unknown' };
  if (!c.approval) return { kind: 'legacy' };
  return { kind: 'approved', purposes: [...(c.purposes?.[serviceId] ?? [])] };
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
  const by = input.by?.trim() || UNVERIFIED_ACTOR;
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
  /** Who acted: the verified official (routes pass it from the session). */
  by?: string;
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
  const head = recordAudit(input.by || UNVERIFIED_ACTOR, 'webhook.subscribe', `Webhook:${sub.id}`, 'ok', input.topic);
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
  by = UNVERIFIED_ACTOR,
): WebhookSubscription | { error: string } {
  const w = db.webhooks.find(x => x.id === id);
  if (!w) return { error: 'Subscription not found' };
  w.status = status;
  recordAudit(by, `webhook.${status}`, `Webhook:${id}`, 'ok');
  return w;
}
