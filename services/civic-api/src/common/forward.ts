// Forward mode (CIVIC_API_MODE=forward, the default; read-only-mirror.ts):
// a write made to civic-api is passed to the CivicOS platform route that owns
// the record, and the platform's answer comes back in civic-api's shape.
//
//  - One table, FORWARD_ROUTES: each civic-api write endpoint → the platform
//    route, with a request mapper (civic-api's body → the platform's) and an
//    answer mapper (the platform's body → civic-api's, platform-shapes.ts).
//    UNMAPPED lists the writes with no platform route yet: they answer 410.
//  - The caller's own credentials go through unchanged: its `Authorization`
//    and `Cookie` headers, nothing else that identifies anyone. civic-api adds
//    no identity of its own, and its development principal header
//    (x-civic-principal) is never sent. The platform (middleware, roles.ts,
//    withOfficial()) decides who acted and whether they may.
//  - civic-api's own tables are never written here; the mirror follower
//    (src/mirror/follower.ts) brings the change back from the platform.
//  - One attempt only: a write is not idempotent, so it is never retried. A
//    platform that does not answer in time is 504, one that cannot be reached
//    or fails (5xx, an answer that is not JSON) is 502, each with the reason.
//
// No decorators: the Nest guard (read-only-mirror.guard.ts) calls forwardWrite().

import {
  civicBackup, civicConfig, civicDeployment, civicGrant, civicIncident, civicIntegration, civicLifecycle,
  civicMinistry, civicModule, civicDepartment, civicPermit, civicReceipt, civicRelease, civicWebhook,
  down, platformDepartmentId, platformTenantOf,
  type PBackup, type PConfig, type PDeployment, type PGrant, type PIncident, type PIntegration, type PLifecycle,
  type PMinistry, type PPermit, type PReceipt, type PRelease, type PWebhook,
} from './platform-shapes';
import { unmappedRefusal } from './read-only-mirror';

/** Read-only answers from civic-api's own (mirrored) tables that some request mappers need. */
export interface ForwardLookup {
  /** A citizen civic-api holds: the name and municipality the platform's permit needs. */
  citizen(citizenId: string): Promise<{ displayName: string; municipality: string } | null>;
  /** The platform's own tenant as last mirrored (e.g. 'home'), or null before the first sync. */
  platformTenant(): Promise<string | null>;
}

type Params = Record<string, string>;
type Body = Record<string, unknown>;
export type Outbound = { method: 'POST' | 'DELETE'; path: string; body?: Body };
export type Refused = { refuse: string; status: 410 | 422 };

export interface ForwardRoute {
  method: 'POST' | 'DELETE';
  /** civic-api's path after /api, with :params. */
  path: string;
  /** The platform route it goes to (documentation, X-CivicOS-Forwarded-To). */
  platform: string;
  to(params: Params, body: Body, lookup: ForwardLookup | undefined): Promise<Outbound | Refused> | Outbound | Refused;
  /** The platform's 2xx body in civic-api's shape (the platform's own when absent). */
  answer?(platform: Body, params: Params, body: Body): unknown;
}

const str = (v: unknown): string | undefined => (typeof v === 'string' ? v : undefined);
/** Only the fields named, and only those the caller sent. */
const pick = (b: Body, ...keys: string[]): Body => {
  const out: Body = {};
  for (const k of keys) if (b[k] !== undefined) out[k] = b[k];
  return out;
};
const enc = encodeURIComponent;
const ministryAnswer = (p: Body) => civicMinistry(p.ministry as PMinistry);

const DECISIONS: Record<string, string> = { APPROVED: 'approve', DECLINED: 'decline', NEEDS_INFO: 'request-info' };

export const FORWARD_ROUTES: ForwardRoute[] = [
  // ── org → the ministry registry ──────────────────────────────────────────
  { method: 'POST', path: 'org/ministries', platform: '/api/org/ministries',
    to: (_p, b) => ({ method: 'POST', path: '/api/org/ministries', body: pick(b, 'archetype', 'name', 'slug') }), answer: ministryAnswer },
  { method: 'POST', path: 'org/ministries/:id/rename', platform: '/api/org/ministries/{id}/rename',
    to: (p, b) => ({ method: 'POST', path: `/api/org/ministries/${enc(p.id!)}/rename`, body: pick(b, 'name') }), answer: ministryAnswer },
  { method: 'POST', path: 'org/ministries/:id/deactivate', platform: '/api/org/ministries/{id}/deactivate',
    to: p => ({ method: 'POST', path: `/api/org/ministries/${enc(p.id!)}/deactivate`, body: {} }), answer: ministryAnswer },
  { method: 'POST', path: 'org/ministries/:id/merge', platform: '/api/org/ministries/{id}/merge',
    to: (p, b) => ({ method: 'POST', path: `/api/org/ministries/${enc(p.id!)}/merge`, body: pick(b, 'targetId') }), answer: ministryAnswer },
  { method: 'POST', path: 'org/ministries/:id/departments', platform: '/api/org/ministries/{id}/departments',
    to: (p, b) => ({ method: 'POST', path: `/api/org/ministries/${enc(p.id!)}/departments`, body: pick(b, 'name') }),
    // civic-api answered with the new department; the platform answers with the ministry.
    answer: (r, p, b) => {
      const m = r.ministry as PMinistry;
      const d = m.departments.find(x => x.name === b.name);
      return d ? civicDepartment(m.id, d) : civicMinistry(m);
    } },
  { method: 'DELETE', path: 'org/ministries/:id/departments/:deptId', platform: '/api/org/ministries/{id}/departments/{deptId}',
    to: p => ({ method: 'DELETE', path: `/api/org/ministries/${enc(p.id!)}/departments/${enc(platformDepartmentId(p.id!, p.deptId!))}` }),
    answer: (_r, p) => ({ removed: p.deptId }) },
  { method: 'POST', path: 'org/ministries/:id/modules', platform: '/api/org/ministries/{id}/modules',
    to: (p, b) => ({ method: 'POST', path: `/api/org/ministries/${enc(p.id!)}/modules`, body: pick(b, 'moduleKey', 'enabled') }),
    answer: (r, _p, b) => {
      const m = r.ministry as PMinistry;
      const x = m.modules.find(y => y.moduleKey === b.moduleKey);
      return x ? civicModule(m.id, x) : civicMinistry(m);
    } },

  // ── permits ──────────────────────────────────────────────────────────────
  { method: 'POST', path: 'permits', platform: '/api/permits',
    to: async (_p, b, lookup) => {
      // The platform's permit names its applicant and municipality; civic-api's
      // named a citizen it holds. Given fields win; otherwise the mirrored citizen.
      let applicantName = str(b.applicantName);
      let municipality = str(b.municipality);
      if ((!applicantName || !municipality) && typeof b.citizenId === 'string' && lookup) {
        const c = await lookup.citizen(b.citizenId);
        applicantName ??= c?.displayName;
        municipality ??= c?.municipality;
      }
      if (!applicantName || !municipality) return { refuse: 'The platform records a permit with its applicant\'s name and municipality: send applicantName and municipality, or the citizenId of a citizen civic-api holds', status: 422 };
      return { method: 'POST', path: '/api/permits', body: { type: down(str(b.type)), title: b.title, applicantName, municipality, fields: b.fields ?? {} } };
    },
    answer: r => civicPermit(r.permit as PPermit) },
  { method: 'POST', path: 'permits/:id/decide', platform: '/api/permits/{id}/decide',
    to: (p, b) => {
      const d = str(b.decision) ?? '';
      return { method: 'POST', path: `/api/permits/${enc(p.id!)}/decide`, body: { ...pick(b, 'officerName', 'note', 'aiClass'), decision: DECISIONS[d] ?? down(d) } };
    },
    answer: r => civicPermit(r.permit as PPermit) },

  // ── payments ─────────────────────────────────────────────────────────────
  { method: 'POST', path: 'payments', platform: '/api/payments',
    to: (_p, b) => ({ method: 'POST', path: '/api/payments', body: pick(b, 'billId', 'rail') }),
    answer: r => civicReceipt(r.receipt as PReceipt) },

  // ── ops ──────────────────────────────────────────────────────────────────
  { method: 'POST', path: 'ops/incidents', platform: '/api/ops/incidents',
    to: (_p, b) => ({ method: 'POST', path: '/api/ops/incidents', body: { ...pick(b, 'title', 'scope'), ...(b.severity !== undefined ? { severity: down(str(b.severity)) } : {}) } }),
    answer: r => civicIncident(r.incident as PIncident) },

  // ── interop → integrations, federation, webhooks ─────────────────────────
  { method: 'POST', path: 'integrations', platform: '/api/integrations',
    to: (_p, b) => ({ method: 'POST', path: '/api/integrations', body: { ...pick(b, 'name', 'ownerOrg', 'contact', 'scopes'), ...(b.kind !== undefined ? { kind: down(str(b.kind)) } : {}) } }),
    // The key is shown once, as before; only the platform keeps its hash.
    answer: r => ({ ...r, status: String(r.status ?? '').toUpperCase() }) },
  { method: 'POST', path: 'integrations/:id/approve', platform: '/api/integrations/{id}/approve',
    to: p => ({ method: 'POST', path: `/api/integrations/${enc(p.id!)}/approve`, body: {} }),
    answer: r => civicIntegration(r.integration as PIntegration) },
  { method: 'POST', path: 'integrations/:id/revoke', platform: '/api/integrations/{id}/revoke',
    to: p => ({ method: 'POST', path: `/api/integrations/${enc(p.id!)}/revoke`, body: {} }),
    answer: r => civicIntegration(r.integration as PIntegration) },
  { method: 'POST', path: 'federation/propose', platform: '/api/federation/propose',
    to: (_p, b) => {
      const to = str(b.toTenant) ?? str(b.toTenantId);
      return { method: 'POST', path: '/api/federation/propose', body: { ...pick(b, 'scopes', 'reason', 'expiresAt', 'policy'), ...(to !== undefined ? { toTenant: platformTenantOf(to) } : {}) } };
    },
    answer: r => civicGrant(r.grant as PGrant) },
  { method: 'POST', path: 'federation/grants/:id/approve', platform: '/api/federation/grants/{id}/approve',
    to: p => ({ method: 'POST', path: `/api/federation/grants/${enc(p.id!)}/approve`, body: {} }),
    answer: r => civicGrant(r.grant as PGrant) },
  { method: 'POST', path: 'federation/grants/:id/revoke', platform: '/api/federation/grants/{id}/revoke',
    to: p => ({ method: 'POST', path: `/api/federation/grants/${enc(p.id!)}/revoke`, body: {} }),
    answer: r => civicGrant(r.grant as PGrant) },
  { method: 'POST', path: 'webhooks', platform: '/api/webhooks',
    to: (_p, b) => ({ method: 'POST', path: '/api/webhooks', body: pick(b, 'topic', 'url') }) },
  { method: 'POST', path: 'webhooks/:id/pause', platform: '/api/webhooks/{id}/pause',
    to: p => ({ method: 'POST', path: `/api/webhooks/${enc(p.id!)}/pause`, body: {} }),
    answer: r => civicWebhook(r.webhook as PWebhook) },

  // ── platform-ops → releases, deployments, lifecycle, backups, configuration
  { method: 'POST', path: 'platform/releases', platform: '/api/platform/releases',
    to: (_p, b) => ({ method: 'POST', path: '/api/platform/releases', body: pick(b, 'version', 'notes', 'schemaMigration') }),
    answer: r => civicRelease(r.release as PRelease) },
  { method: 'POST', path: 'platform/releases/:id/promote', platform: '/api/platform/releases/{id}/promote',
    to: p => ({ method: 'POST', path: `/api/platform/releases/${enc(p.id!)}/promote`, body: {} }),
    answer: r => civicRelease(r.release as PRelease) },
  { method: 'POST', path: 'platform/deployments', platform: '/api/platform/deployments',
    to: (_p, b) => ({ method: 'POST', path: '/api/platform/deployments', body: { ...pick(b, 'releaseId'), ...(b.strategy !== undefined ? { strategy: down(str(b.strategy)) } : {}) } }),
    answer: r => civicDeployment(r.deployment as PDeployment) },
  { method: 'POST', path: 'platform/deployments/:id/advance', platform: '/api/platform/deployments/{id}/advance',
    to: (p, b) => ({ method: 'POST', path: `/api/platform/deployments/${enc(p.id!)}/advance`, body: pick(b, 'gateResult', 'note') }),
    answer: r => civicDeployment(r.deployment as PDeployment) },
  { method: 'POST', path: 'platform/deployments/:id/rollback', platform: '/api/platform/deployments/{id}/rollback',
    to: (p, b) => ({ method: 'POST', path: `/api/platform/deployments/${enc(p.id!)}/rollback`, body: pick(b, 'note') }),
    answer: r => civicDeployment(r.deployment as PDeployment) },
  { method: 'POST', path: 'platform/tenants/:id/transition', platform: '/api/platform/lifecycle/transition',
    to: async (p, b, lookup) => {
      // The platform keeps one tenant's lifecycle: its own installation's.
      const own = lookup ? await lookup.platformTenant() : null;
      if (!own) return { refuse: 'the platform\'s own tenant is not mirrored here yet, so this tenant cannot be matched to it', status: 410 };
      if (platformTenantOf(p.id!) !== own) return { refuse: `the platform keeps the lifecycle of its own tenant (platform:${own}) only`, status: 410 };
      return { method: 'POST', path: '/api/platform/lifecycle/transition', body: { ...pick(b, 'reason'), ...(b.to !== undefined ? { to: down(str(b.to)) } : {}) } };
    },
    answer: r => civicLifecycle(r.lifecycle as PLifecycle) },
  { method: 'POST', path: 'platform/backups', platform: '/api/platform/backups',
    to: (_p, b) => ({ method: 'POST', path: '/api/platform/backups', body: b.kind !== undefined ? { kind: down(str(b.kind)) } : {} }),
    answer: r => civicBackup(r.backup as PBackup) },
  { method: 'POST', path: 'platform/backups/:id/restore', platform: '/api/platform/backups/{id}/restore',
    to: p => ({ method: 'POST', path: `/api/platform/backups/${enc(p.id!)}/restore`, body: {} }),
    answer: r => civicBackup(r.backup as PBackup) },
  { method: 'POST', path: 'platform/config', platform: '/api/platform/config',
    to: (_p, b) => (String(b.scope ?? 'GLOBAL').toUpperCase() === 'TENANT'
      ? { refuse: 'the platform publishes global configuration bundles only; a tenant-scoped bundle has no platform equivalent', status: 410 }
      : { method: 'POST', path: '/api/platform/config', body: pick(b, 'payload') }),
    answer: r => civicConfig(r.config as PConfig) },
  { method: 'POST', path: 'platform/config/:id/sign', platform: '/api/platform/config/{id}/sign',
    to: p => ({ method: 'POST', path: `/api/platform/config/${enc(p.id!)}/sign`, body: {} }),
    answer: r => civicConfig(r.config as PConfig) },
  { method: 'POST', path: 'platform/config/:id/apply', platform: '/api/platform/config/{id}/apply',
    to: p => ({ method: 'POST', path: `/api/platform/config/${enc(p.id!)}/apply`, body: {} }),
    answer: r => civicConfig(r.config as PConfig) },
];

/** civic-api writes with no platform route to forward to (they answer 410), and why. */
export const UNMAPPED: { method: string; path: string; why: string }[] = [
  { method: 'POST', path: 'identity/citizens', why: 'citizen identity is owned by the substrate (citizen sign-in), and the platform has no route that records a citizen' },
  { method: 'POST', path: 'tenancy/provision', why: 'the platform holds one nation (its setup, /api/setup and /api/sovereign) and keeps no other tenant; /api/municipalities only checks a municipality\'s readiness and records nothing' },
];

/** The route a civic-api write matches, with its params; path with or without /api and a query. */
export function matchForward(method: string, path: string): { route: ForwardRoute; params: Params } | null {
  const segs = path.split('?')[0]!.split('/').filter(Boolean);
  if (segs[0] === 'api') segs.shift();
  const m = method.toUpperCase();
  for (const route of FORWARD_ROUTES) {
    if (route.method !== m) continue;
    const want = route.path.split('/');
    if (want.length !== segs.length) continue;
    const params: Params = {};
    let ok = true;
    for (let i = 0; i < want.length; i++) {
      const w = want[i]!;
      if (w.startsWith(':')) {
        try { params[w.slice(1)] = decodeURIComponent(segs[i]!); } catch { ok = false; break; }
      } else if (w !== segs[i]) { ok = false; break; }
    }
    if (ok) return { route, params };
  }
  return null;
}

export interface ForwardOptions {
  /** The platform's base address (CIVICOS_PLATFORM_URL). */
  base: string;
  /** How long the platform has to answer (CIVICOS_PLATFORM_TIMEOUT_MS, default 10 s). */
  timeoutMs?: number;
  fetch?: typeof fetch;
  lookup?: ForwardLookup;
  now?: () => Date;
}

export interface ForwardAnswer {
  status: number;
  body: unknown;
  headers: Record<string, string>;
  /** Whether the platform was asked (false for refusals civic-api answers itself). */
  forwarded: boolean;
}

export interface IncomingWrite {
  method: string;
  /** The request path (originalUrl), with or without /api and a query. */
  path: string;
  headers: Record<string, string | string[] | undefined>;
  body: unknown;
}

/** The headers that carry the caller's credentials, passed through unchanged. Nothing else identifies anyone. */
export const CREDENTIAL_HEADERS = ['authorization', 'cookie'] as const;

const header = (h: IncomingWrite['headers'], k: string): string | undefined => {
  const v = h[k] ?? h[k.toLowerCase()];
  return Array.isArray(v) ? v.join(k === 'cookie' ? '; ' : ', ') : v;
};

const envelope = (status: number, error: string, now: Date, extra: Record<string, unknown> = {}) =>
  ({ error, status, at: now.toISOString(), ...extra });

/** Forward one write; never throws. */
export async function forwardWrite(req: IncomingWrite, opts: ForwardOptions): Promise<ForwardAnswer> {
  const now = (opts.now ?? (() => new Date()))();
  const found = matchForward(req.method, req.path);
  const baseHeaders: Record<string, string> = { 'X-CivicOS-Mode': 'forward' };
  if (!found) {
    const why = UNMAPPED.find(u => matchesPath(u.path, req.path) && u.method === req.method.toUpperCase())?.why;
    const r = unmappedRefusal(req.method, req.path, why);
    return { status: r.status, body: envelope(r.status, r.message, now), headers: { ...baseHeaders, 'X-CivicOS-Owner': r.owner }, forwarded: false };
  }
  const { route, params } = found;
  const body = (req.body && typeof req.body === 'object' && !Array.isArray(req.body) ? req.body : {}) as Body;
  const out = await route.to(params, body, opts.lookup);
  if ('refuse' in out) {
    const msg = out.status === 410 ? unmappedRefusal(req.method, req.path, out.refuse).message : out.refuse;
    return { status: out.status, body: envelope(out.status, msg, now), headers: { ...baseHeaders, 'X-CivicOS-Owner': route.platform }, forwarded: false };
  }
  const target = new URL(out.path, opts.base.endsWith('/') ? opts.base : `${opts.base}/`);
  const headers: Record<string, string> = { accept: 'application/json' };
  for (const k of CREDENTIAL_HEADERS) { const v = header(req.headers, k); if (v) headers[k] = v; }
  const rid = header(req.headers, 'x-request-id');
  if (rid) headers['x-request-id'] = rid;
  if (out.body !== undefined) headers['content-type'] = 'application/json';
  const answerHeaders = { ...baseHeaders, 'X-CivicOS-Owner': route.platform, 'X-CivicOS-Forwarded-To': `${out.method} ${out.path}` };
  const what = `${out.method} ${out.path}`;
  const timeoutMs = opts.timeoutMs ?? 10_000;
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), timeoutMs);
  let status: number;
  let text: string;
  try {
    // One attempt: a write is never retried.
    const res = await (opts.fetch ?? fetch)(target, {
      method: out.method, headers, body: out.body !== undefined ? JSON.stringify(out.body) : undefined, signal: ac.signal, redirect: 'manual',
    });
    status = res.status;
    text = await res.text();
  } catch (e) {
    const timedOut = ac.signal.aborted;
    return timedOut
      ? { status: 504, forwarded: true, headers: answerHeaders, body: envelope(504, `The CivicOS platform did not answer ${what} within ${Math.round(timeoutMs / 100) / 10} s. The change may or may not have been made there: check the platform before trying again (civic-api does not retry writes).`, now) }
      : { status: 502, forwarded: true, headers: answerHeaders, body: envelope(502, `The CivicOS platform could not be reached for ${what}: ${(e as Error).message}. Nothing was written by civic-api.`, now) };
  } finally {
    clearTimeout(timer);
  }
  let parsed: unknown;
  try { parsed = text ? JSON.parse(text) : {}; } catch { parsed = undefined; }
  const platformError = (p: unknown): string | undefined => {
    if (!p || typeof p !== 'object') return undefined;
    const o = p as { error?: unknown; detail?: unknown };
    const e = typeof o.error === 'string' ? o.error : undefined;
    return e && typeof o.detail === 'string' ? `${e}: ${o.detail}` : e;
  };
  if (status >= 500) {
    return { status: 502, forwarded: true, headers: answerHeaders, body: envelope(502, `The CivicOS platform answered ${status} to ${what}${platformError(parsed) ? `: ${platformError(parsed)}` : ''}. The change may not have been made; check the platform before trying again.`, now, { upstreamStatus: status }) };
  }
  if (status >= 300 && status < 400) {
    return { status: 502, forwarded: true, headers: answerHeaders, body: envelope(502, `The CivicOS platform answered ${what} with a redirect (${status}); CIVICOS_PLATFORM_URL should be the platform's own address.`, now, { upstreamStatus: status }) };
  }
  if (status >= 400) {
    return { status, forwarded: true, headers: answerHeaders, body: envelope(status, platformError(parsed) ?? `The CivicOS platform refused ${what} (${status})`, now, { forwardedTo: what }) };
  }
  if (parsed === undefined || typeof parsed !== 'object' || parsed === null) {
    return { status: 502, forwarded: true, headers: answerHeaders, body: envelope(502, `The CivicOS platform answered ${what} with something that is not JSON; the change may have been made there.`, now, { upstreamStatus: status }) };
  }
  let mapped: unknown = parsed;
  if (route.answer) {
    try { mapped = route.answer(parsed as Body, params, body); } catch { mapped = parsed; }
  }
  return { status, forwarded: true, headers: answerHeaders, body: mapped };
}

function matchesPath(pattern: string, path: string): boolean {
  const segs = path.split('?')[0]!.split('/').filter(Boolean);
  if (segs[0] === 'api') segs.shift();
  const want = pattern.split('/');
  return want.length === segs.length && want.every((w, i) => w.startsWith(':') || w === segs[i]);
}
