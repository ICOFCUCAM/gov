// Officials sign in through the government's own identity provider (OpenID
// Connect Core 1.0, authorization code flow with PKCE S256, state and nonce).
//
// - An administrator configures the provider (ADMIN_ONLY, audited); its
//   metadata comes from `<issuer>/.well-known/openid-configuration`, which
//   must name the same issuer. The client secret is sealed under the data key
//   (lib/crypto/envelope.ts). Everything is fetched by the server only,
//   through the platform's safe fetch (lib/net/safe-fetch.ts), and only from
//   the issuer's own host (or hosts an administrator listed).
// - Sign-ins in progress keep state, nonce and the PKCE verifier on the
//   server for ten minutes; the browser carries the state in an httpOnly
//   cookie, so a callback must come back to the browser that started it, and
//   each state is used once.
// - The ID token's signature is checked against the provider's JWKS
//   (asymmetric algorithms only), then iss, aud, azp, exp, iat, nbf and nonce,
//   with two minutes' clock skew.
// - The identity is matched to an existing platform account by a stable claim
//   (sub, or a claim the administrator names, such as an employee number, or
//   a verified email). It never makes an account with powers: an unmatched
//   identity waits as a request an administrator approves, choosing the role
//   from lib/auth/roles.ts. Roles come from the provider's groups only when
//   an administrator has mapped them (audited).
// - The provider's own multi-factor sign-in (acr/amr) counts as the second
//   sign-in step only when the administrator's policy says so.

import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { safeFetchText } from '@/lib/net/safe-fetch';
import { seal, open as openSealed } from '@/lib/crypto/envelope';
import { recordAudit, getMinistry } from '@/lib/data/store';
import { isRole, roleLabel, roleOf, type OfficialRole } from './roles';
import { accountByEmail, accountById, accountByIdentity, createAccountForIdentity, linkIdentity, noteIdentitySignIn, setRole, type PublicAccount } from './officials';
import { isAcceptedAlg, verifyJws, JwsError, ACCEPTED_ALGS, type Jwks, type JwsAlg } from './jws';
import { platformOrigin, prune, signOnDb, type GroupRule, type IdentityRequest, type ProviderConfig } from './sign-on-store';
import { SESSION_HOURS } from './session-token';

export const OIDC_COOKIE = 'civicos_oidc';
export const CALLBACK_PATH = '/api/auth/oidc/callback';
export const CLOCK_SKEW_S = 120;
const FLOW_MS = 10 * 60_000;
const DEFAULT_MFA_AMR = ['mfa', 'hwk', 'otp', 'sms', 'swk', 'fpt', 'face', 'iris', 'pin'];

// ── Fetching from the provider ─────────────────────────────────────────
export interface Fetched { text: string; type: string }
/** How the server reaches the provider; tests may pass `resolve` to point a name at a local stub. */
export interface FetchDeps { resolve?: (host: string) => Promise<string[]>; fetch?: typeof fetch }

const LOOPBACK = new Set(['localhost', '127.0.0.1', '[::1]']);
const httpAllowed = (u: URL) => u.protocol === 'https:' || (u.protocol === 'http:' && LOOPBACK.has(u.hostname));

function hostsOf(issuer: string, extra: string[]): Set<string> {
  return new Set([new URL(issuer).host, ...extra]);
}

export async function providerFetch(url: string, p: Pick<ProviderConfig, 'issuer' | 'extraHosts' | 'internalNetwork'>, deps: FetchDeps, init: { method?: string; body?: string; headers?: Record<string, string>; accept?: string } = {}): Promise<Fetched> {
  const hosts = hostsOf(p.issuer, p.extraHosts);
  const r = await safeFetchText(url, {
    allow: u => hosts.has(u.host) && httpAllowed(u),
    accept: init.accept ?? 'application/json',
    maxBytes: 512_000,
    timeoutMs: 10_000,
    redirects: 2,
    types: /^application\/(json|jwk-set\+json|[a-z.+-]*\+json)$/,
    allowPrivate: p.internalNetwork,
    ...(init.method ? { method: init.method } : {}),
    ...(init.body !== undefined ? { body: init.body } : {}),
    ...(init.headers ? { headers: init.headers } : {}),
    ...(deps.resolve ? { resolve: deps.resolve } : {}),
    ...(deps.fetch ? { fetch: deps.fetch } : {}),
  });
  return { text: r.text, type: r.type };
}

const parseJson = (t: string, what: string): Record<string, unknown> => {
  try {
    const v = JSON.parse(t) as unknown;
    if (v && typeof v === 'object' && !Array.isArray(v)) return v as Record<string, unknown>;
  } catch { /* below */ }
  throw new Error(`The provider's ${what} is not a JSON object`);
};

// ── Configuration (administrators) ─────────────────────────────────────
export interface ProviderInput {
  name?: string; issuer?: string; clientId?: string; clientSecret?: string; tokenAuth?: string; scopes?: string;
  matchClaim?: string; groups?: { claim?: string; rules?: { group?: string; role?: string; institution?: string }[] } | null;
  mfa?: { accept?: boolean; amr?: string[]; acr?: string[] }; internalNetwork?: boolean; extraHosts?: string[]; enabled?: boolean;
}

const CLAIM = /^[A-Za-z0-9_.:-]{1,64}$/;
const HOST = /^[a-z0-9.-]+(:\d{1,5})?$/i;

function checkIssuer(raw: string): string | { error: string } {
  const issuer = raw.trim();
  let u: URL;
  try { u = new URL(issuer); } catch { return { error: 'Enter the provider\'s issuer address (https://…)' }; }
  if (!httpAllowed(u)) return { error: 'The issuer must be an https address' };
  if (u.search || u.hash || u.username || u.password) return { error: 'The issuer has no query, fragment or credentials' };
  return issuer;
}

/** Read the provider's metadata and check it names the same issuer, with endpoints on allowed hosts. */
export async function discover(p: Pick<ProviderConfig, 'issuer' | 'extraHosts' | 'internalNetwork'>, deps: FetchDeps = {}): Promise<ProviderConfig['metadata']> {
  const url = `${p.issuer.replace(/\/+$/, '')}/.well-known/openid-configuration`;
  const m = parseJson((await providerFetch(url, p, deps)).text, 'discovery document');
  if (m.issuer !== p.issuer) throw new Error(`The provider says its issuer is ${String(m.issuer)}, not ${p.issuer}`);
  const hosts = hostsOf(p.issuer, p.extraHosts);
  const endpoint = (k: string, required: boolean): string | undefined => {
    const v = m[k];
    if (v === undefined && !required) return undefined;
    if (typeof v !== 'string') throw new Error(`The provider does not publish ${k}`);
    let u: URL;
    try { u = new URL(v); } catch { throw new Error(`The provider's ${k} is not an address`); }
    if (!httpAllowed(u)) throw new Error(`The provider's ${k} is not https`);
    if (!hosts.has(u.host)) throw new Error(`The provider's ${k} is on ${u.host}, not the issuer's host; an administrator can list it as a further host`);
    return u.href;
  };
  const strings = (k: string) => (Array.isArray(m[k]) ? (m[k] as unknown[]).filter((x): x is string => typeof x === 'string') : undefined);
  const pkce = strings('code_challenge_methods_supported');
  if (pkce && !pkce.includes('S256')) throw new Error('The provider does not support PKCE with S256');
  const types = strings('response_types_supported');
  if (types && !types.includes('code')) throw new Error('The provider does not support the authorization code flow');
  const algs = strings('id_token_signing_alg_values_supported');
  if (algs && !algs.some(isAcceptedAlg)) throw new Error('The provider signs ID tokens only with algorithms this platform does not accept (asymmetric only)');
  return {
    authorization_endpoint: endpoint('authorization_endpoint', true)!,
    token_endpoint: endpoint('token_endpoint', true)!,
    jwks_uri: endpoint('jwks_uri', true)!,
    ...(m.end_session_endpoint !== undefined ? { end_session_endpoint: endpoint('end_session_endpoint', false)! } : {}),
    ...(algs ? { id_token_signing_alg_values_supported: algs } : {}),
    ...(pkce ? { code_challenge_methods_supported: pkce } : {}),
  };
}

const secretAad = (issuer: string) => `oidc-client:${issuer}`;

/** Configure (or change) the identity provider. Administrators only (the route is ADMIN_ONLY); audited without the secret. */
export async function saveProvider(input: ProviderInput, by: string, deps: FetchDeps = {}): Promise<{ provider: ProviderView } | { error: string }> {
  const d = signOnDb();
  const prev = d.provider;
  const issuer = checkIssuer(input.issuer ?? prev?.issuer ?? '');
  if (typeof issuer !== 'string') return issuer;
  const name = (input.name ?? prev?.name ?? '').trim();
  if (!name || name.length > 60) return { error: 'Give the provider a name (shown on the sign-in button), up to 60 characters' };
  const clientId = (input.clientId ?? prev?.clientId ?? '').trim();
  if (!clientId || clientId.length > 256) return { error: 'Enter the client id the provider issued for this platform' };
  const tokenAuth = (input.tokenAuth ?? prev?.tokenAuth ?? 'client_secret_basic') as ProviderConfig['tokenAuth'];
  if (!['client_secret_basic', 'client_secret_post', 'none'].includes(tokenAuth)) return { error: 'Client authentication must be client_secret_basic, client_secret_post or none' };
  const scopes = (input.scopes ?? prev?.scopes ?? 'openid profile email').trim().replace(/\s+/g, ' ');
  if (!scopes.split(' ').includes('openid') || !/^[\x21\x23-\x5b\x5d-\x7e ]{1,512}$/.test(scopes)) return { error: 'Scopes must include openid' };
  const matchClaim = (input.matchClaim ?? prev?.matchClaim ?? 'sub').trim();
  if (!CLAIM.test(matchClaim)) return { error: 'The matching claim is a claim name, such as sub, employee_id or email' };
  let groups: ProviderConfig['groups'];
  const gi = input.groups === undefined ? prev?.groups : input.groups;
  if (gi && (gi.rules?.length ?? 0) > 0) {
    const claim = (gi.claim ?? 'groups').trim();
    if (!CLAIM.test(claim)) return { error: 'The groups claim is a claim name, such as groups or roles' };
    const rules: GroupRule[] = [];
    for (const r of gi.rules ?? []) {
      const group = (r.group ?? '').trim();
      if (!group || group.length > 256) return { error: 'Each group rule names a group' };
      if (!isRole(r.role)) return { error: `Choose a role for the group ${group}` };
      const institution = (r.institution ?? '').trim() || undefined;
      if (institution && !getMinistry(institution)) return { error: `No institution ${institution}` };
      rules.push({ group, role: r.role as OfficialRole, ...(institution ? { institution } : {}) });
    }
    if (rules.length > 50) return { error: 'At most 50 group rules' };
    groups = { claim, rules };
  }
  const mfaIn = input.mfa ?? prev?.mfa;
  const list = (v: unknown, fallback: string[]) => (Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string' && /^[\x21-\x7e]{1,128}$/.test(x)).slice(0, 20) : fallback);
  const mfa = { accept: !!mfaIn?.accept, amr: list(mfaIn?.amr, DEFAULT_MFA_AMR), acr: list(mfaIn?.acr, []) };
  const extraHosts = (input.extraHosts ?? prev?.extraHosts ?? []).map(h => String(h).trim().toLowerCase()).filter(Boolean);
  if (extraHosts.some(h => !HOST.test(h)) || extraHosts.length > 5) return { error: 'Further hosts are host names (with an optional port), at most five' };
  const internalNetwork = input.internalNetwork ?? prev?.internalNetwork ?? false;
  // The secret: a new one replaces the old; the old one is kept only while the issuer is unchanged.
  let clientSecret: string | undefined;
  if (tokenAuth !== 'none') {
    const given = input.clientSecret?.trim();
    if (given) {
      if (given.length > 1024) return { error: 'The client secret is too long' };
      try { clientSecret = seal(given, secretAad(issuer)); } catch (e) { return { error: (e as Error).message }; }
    } else if (prev?.clientSecret && prev.issuer === issuer) clientSecret = prev.clientSecret;
    else return { error: 'Enter the client secret the provider issued (or choose client authentication none for a public client)' };
  }
  let metadata: ProviderConfig['metadata'];
  try { metadata = await discover({ issuer, extraHosts, internalNetwork }, deps); }
  catch (e) {
    recordAudit(by, 'auth.oidc.configure', 'SignOn:provider', 'error', `${issuer}: ${(e as Error).message}`);
    return { error: `The provider's configuration could not be read: ${(e as Error).message}` };
  }
  const now = new Date().toISOString();
  const p: ProviderConfig = { name, issuer, clientId, ...(clientSecret ? { clientSecret } : {}), tokenAuth, scopes, matchClaim, ...(groups ? { groups } : {}), mfa, internalNetwork, extraHosts,
    enabled: input.enabled ?? prev?.enabled ?? true, metadata, discoveredAt: now, updatedAt: now, updatedBy: by, version: (prev?.version ?? 0) + 1 };
  d.provider = p;
  // Sign-ins started under the earlier configuration do not finish.
  d.flows = {};
  jwksCache.clear();
  recordAudit(by, 'auth.oidc.configure', 'SignOn:provider', 'ok',
    `${name} · ${issuer} · client ${clientId} · ${tokenAuth} · matched by ${matchClaim} · ${groups ? `roles from ${groups.claim}: ${groups.rules.map(r => `${r.group} → ${roleLabel(r.role)}${r.institution ? ` (${getMinistry(r.institution)?.name ?? r.institution})` : ''}`).join('; ')}` : 'roles set by administrators only'} · provider MFA ${mfa.accept ? `counts as second step (amr ${mfa.amr.join(',') || '—'}; acr ${mfa.acr.join(',') || '—'})` : 'does not count as second step'}${internalNetwork ? ' · on the government network' : ''}${extraHosts.length ? ` · further hosts ${extraHosts.join(', ')}` : ''} · ${p.enabled ? 'on' : 'off'}`);
  return { provider: view(p) };
}

export function setProviderEnabled(enabled: boolean, by: string): { provider: ProviderView } | { error: string } {
  const p = signOnDb().provider;
  if (!p) return { error: 'No identity provider is configured' };
  p.enabled = enabled;
  p.updatedAt = new Date().toISOString(); p.updatedBy = by;
  if (!enabled) signOnDb().flows = {};
  recordAudit(by, enabled ? 'auth.oidc.enable' : 'auth.oidc.disable', 'SignOn:provider', 'ok', p.name);
  return { provider: view(p) };
}

export type ProviderView = Omit<ProviderConfig, 'clientSecret'> & { hasSecret: boolean };
const view = ({ clientSecret, ...p }: ProviderConfig): ProviderView => ({ ...p, hasSecret: !!clientSecret });
export const providerView = (): ProviderView | null => (signOnDb().provider ? view(signOnDb().provider!) : null);
/** What the sign-in page shows before anyone signs in. */
export const providerPublic = (): { name: string } | null => {
  const p = signOnDb().provider;
  return p?.enabled ? { name: p.name } : null;
};
/** The address to register at the provider as this platform's redirect URI. */
export function callbackUrl(requestOrigin?: string): string | { error: string } {
  const o = platformOrigin(requestOrigin);
  return 'error' in o ? o : `${o.origin}${CALLBACK_PATH}`;
}

// ── The provider's keys ────────────────────────────────────────────────
const jwksCache = new Map<string, { jwks: Jwks; at: number }>();
const JWKS_TTL = 60 * 60_000;
const JWKS_MIN_REFRESH = 60_000;

export async function providerKeys(p: Pick<ProviderConfig, 'issuer' | 'extraHosts' | 'internalNetwork' | 'metadata'>, deps: FetchDeps, fresh: boolean, now: number): Promise<Jwks> {
  const c = jwksCache.get(p.metadata.jwks_uri);
  if (c && now - c.at < (fresh ? JWKS_MIN_REFRESH : JWKS_TTL)) return c.jwks;
  const j = parseJson((await providerFetch(p.metadata.jwks_uri, p, deps, { accept: 'application/jwk-set+json, application/json' })).text, 'key set');
  if (!Array.isArray(j.keys)) throw new Error('The provider\'s key set has no keys');
  const jwks = { keys: (j.keys as unknown[]).filter((k): k is Jwks['keys'][number] => !!k && typeof k === 'object').slice(0, 50) };
  jwksCache.set(p.metadata.jwks_uri, { jwks, at: now });
  return jwks;
}
export function clearJwksCache(): void { jwksCache.clear(); }

// ── The ID token ───────────────────────────────────────────────────────
export interface IdClaims { sub: string; [k: string]: unknown }

/** Check an ID token (OIDC Core §3.1.3.7): signature, then issuer, audience, authorised party, times and nonce. */
export function checkIdToken(token: string, p: Pick<ProviderConfig, 'issuer' | 'clientId' | 'metadata'>, jwks: Jwks, nonce: string, now = Date.now()): IdClaims {
  const allowed = (p.metadata.id_token_signing_alg_values_supported?.filter(isAcceptedAlg) ?? ['RS256']) as JwsAlg[];
  const { payload: c } = verifyJws(token, jwks, allowed.length ? allowed : (ACCEPTED_ALGS as readonly JwsAlg[]).filter(a => a === 'RS256'));
  const t = Math.floor(now / 1000);
  if (c.iss !== p.issuer) throw new JwsError('The token was issued by another provider');
  const aud = Array.isArray(c.aud) ? c.aud : [c.aud];
  if (!aud.includes(p.clientId)) throw new JwsError('The token was issued for another application');
  if ((aud.length > 1 || c.azp !== undefined) && c.azp !== p.clientId) throw new JwsError('The token\'s authorised party is another application');
  if (typeof c.exp !== 'number' || c.exp + CLOCK_SKEW_S <= t) throw new JwsError('The token has expired');
  if (typeof c.iat !== 'number' || c.iat - CLOCK_SKEW_S > t) throw new JwsError('The token is dated in the future');
  if (t - c.iat > FLOW_MS / 1000 + CLOCK_SKEW_S) throw new JwsError('The token was issued too long ago');
  if (c.nbf !== undefined && (typeof c.nbf !== 'number' || c.nbf - CLOCK_SKEW_S > t)) throw new JwsError('The token is not valid yet');
  if (typeof c.nonce !== 'string' || c.nonce !== nonce) throw new JwsError('The token does not answer this sign-in (nonce)');
  if (typeof c.sub !== 'string' || !c.sub || c.sub.length > 255) throw new JwsError('The token names nobody');
  return c as IdClaims;
}

// ── Signing in ─────────────────────────────────────────────────────────
const b64u = (b: Buffer) => b.toString('base64url');
export const safeFrom = (from: string | null | undefined): string =>
  from && from.startsWith('/') && !from.startsWith('//') && !from.startsWith('/\\') && from.length < 512 ? from : '/gov/work';

/** Begin: the provider's authorization address to send the browser to, and the state for its cookie. */
export function startSignIn(from: string | null | undefined, requestOrigin?: string, now = Date.now()): { url: string; state: string } | { error: string } {
  const d = signOnDb();
  const p = d.provider;
  if (!p?.enabled) return { error: 'Sign-in with the identity provider is not set up on this installation' };
  const cb = callbackUrl(requestOrigin);
  if (typeof cb !== 'string') return cb;
  prune(d, now);
  const open = Object.values(d.flows);
  if (open.length >= 2000) for (const f of open.sort((a, b) => a.createdAt - b.createdAt).slice(0, open.length - 1999)) delete d.flows[f.state];
  const state = b64u(randomBytes(32)), nonce = b64u(randomBytes(32)), verifier = b64u(randomBytes(48));
  d.flows[state] = { state, nonce, verifier, from: safeFrom(from), createdAt: now, providerVersion: p.version, redirectUri: cb };
  const u = new URL(p.metadata.authorization_endpoint);
  u.searchParams.set('response_type', 'code');
  u.searchParams.set('client_id', p.clientId);
  u.searchParams.set('redirect_uri', cb);
  u.searchParams.set('scope', p.scopes);
  u.searchParams.set('state', state);
  u.searchParams.set('nonce', nonce);
  u.searchParams.set('code_challenge', b64u(createHash('sha256').update(verifier).digest()));
  u.searchParams.set('code_challenge_method', 'S256');
  if (p.mfa.accept && p.mfa.acr.length) u.searchParams.set('acr_values', p.mfa.acr.join(' '));
  return { url: u.href, state };
}

export type Finish =
  | { ok: true; account: PublicAccount; twoStep: boolean; from: string; sid: string; groupsApplied?: string }
  | { ok: false; error: string; pending?: true };

const stringClaim = (v: unknown): string | undefined => (typeof v === 'string' && v ? v : typeof v === 'number' && Number.isFinite(v) ? String(v) : undefined);
const groupsOf = (c: IdClaims, claim: string | undefined): string[] => {
  if (!claim) return [];
  const v = c[claim];
  return (Array.isArray(v) ? v : typeof v === 'string' ? v.split(/[\s,]+/) : []).filter((x): x is string => typeof x === 'string' && !!x).slice(0, 200);
};

/** The callback: check the state (this browser, once), exchange the code, check the ID token, find the official. */
export async function finishSignIn(q: { state?: string | null; code?: string | null; error?: string | null; cookieState?: string | null },
  requestOrigin: string | undefined, deps: FetchDeps = {}, now = Date.now()): Promise<Finish> {
  const d = signOnDb();
  prune(d, now);
  const state = q.state ?? '';
  const flow = state ? d.flows[state] : undefined;
  // Used once, whatever happens next.
  if (flow) delete d.flows[state];
  if (!flow || !q.cookieState || q.cookieState !== state) {
    recordAudit('sign-in attempt', 'auth.oidc.sign-in', 'Official:?', 'denied', flow ? 'state does not belong to this browser' : 'unknown, expired or used state');
    return { ok: false, error: 'This sign-in has expired or was already used; start again' };
  }
  const p = d.provider;
  if (!p?.enabled || p.version !== flow.providerVersion) return { ok: false, error: 'The identity provider\'s configuration changed; start again' };
  if (q.error) {
    recordAudit('sign-in attempt', 'auth.oidc.sign-in', 'Official:?', 'denied', `provider answered ${q.error.slice(0, 80)}`);
    return { ok: false, error: `The identity provider did not sign you in (${q.error.slice(0, 80)})` };
  }
  if (!q.code) return { ok: false, error: 'The identity provider sent no authorization code' };
  if (callbackUrl(requestOrigin) !== flow.redirectUri) return { ok: false, error: 'This sign-in started at another address' };

  // Exchange the code (RFC 6749 §4.1.3 with the PKCE verifier, RFC 7636 §4.5).
  const form = new URLSearchParams({ grant_type: 'authorization_code', code: q.code, redirect_uri: flow.redirectUri, code_verifier: flow.verifier });
  const headers: Record<string, string> = { 'content-type': 'application/x-www-form-urlencoded' };
  if (p.tokenAuth === 'none') form.set('client_id', p.clientId);
  else {
    const opened = p.clientSecret ? openSealed(p.clientSecret, secretAad(p.issuer)) : { error: 'No client secret' };
    if ('error' in opened) {
      recordAudit('sign-in attempt', 'auth.oidc.sign-in', 'Official:?', 'error', `client secret: ${opened.error}`);
      return { ok: false, error: 'The platform cannot read the identity provider\'s client secret; ask an administrator' };
    }
    if (opened.reseal) try { p.clientSecret = seal(opened.plain, secretAad(p.issuer)); } catch { /* kept as it was */ }
    if (p.tokenAuth === 'client_secret_post') { form.set('client_id', p.clientId); form.set('client_secret', opened.plain); }
    else headers.authorization = `Basic ${Buffer.from(`${encodeURIComponent(p.clientId)}:${encodeURIComponent(opened.plain)}`).toString('base64')}`;
  }
  let idToken: string;
  try {
    const t = parseJson((await providerFetch(p.metadata.token_endpoint, p, deps, { method: 'POST', body: form.toString(), headers })).text, 'token answer');
    if (typeof t.id_token !== 'string') throw new Error('The provider sent no ID token');
    if (typeof t.token_type === 'string' && t.token_type.toLowerCase() !== 'bearer') throw new Error('Unexpected token type');
    idToken = t.id_token;
  } catch (e) {
    recordAudit('sign-in attempt', 'auth.oidc.sign-in', 'Official:?', 'error', `token exchange: ${(e as Error).message.slice(0, 160)}`);
    return { ok: false, error: 'The identity provider did not complete the sign-in; try again' };
  }

  let claims: IdClaims;
  try {
    try { claims = checkIdToken(idToken, p, await providerKeys(p, deps, false, now), flow.nonce, now); }
    catch (e) {
      // A key the platform has not seen yet (the provider rotated): fetch the key set again, at most once a minute.
      if (!(e instanceof JwsError) || !/No key/.test(e.message)) throw e;
      claims = checkIdToken(idToken, p, await providerKeys(p, deps, true, now), flow.nonce, now);
    }
  } catch (e) {
    recordAudit('sign-in attempt', 'auth.oidc.sign-in', 'Official:?', 'denied', `ID token: ${(e as Error).message.slice(0, 160)}`);
    return { ok: false, error: 'The identity provider\'s answer could not be verified' };
  }

  // Who it is: the configured claim (a verified email only).
  const claim = p.matchClaim;
  const value = claim === 'sub' ? claims.sub : stringClaim(claims[claim]);
  if (!value) {
    recordAudit('sign-in attempt', 'auth.oidc.sign-in', 'Official:?', 'denied', `the token carries no ${claim}`);
    return { ok: false, error: `Your identity provider did not send the ${claim} this platform matches officials by; ask an administrator` };
  }
  if (claim === 'email' && claims.email_verified !== true) {
    recordAudit('sign-in attempt', 'auth.oidc.sign-in', 'Official:?', 'denied', 'email not verified by the provider');
    return { ok: false, error: 'Your identity provider has not verified your email address' };
  }
  const ident = { issuer: p.issuer, claim, value: claim === 'email' ? value.trim().toLowerCase() : value };
  let account = accountByIdentity(ident.issuer, ident.claim, ident.value);
  if (!account && claim === 'email') {
    const byEmail = accountByEmail(ident.value);
    if (byEmail && !byEmail.identity) {
      const linked = linkIdentity(byEmail.id, ident, `Identity provider ${p.name} (verified email)`);
      if (!('error' in linked)) account = linked;
    }
  }
  const groups = groupsOf(claims, p.groups?.claim);
  if (!account) {
    upsertRequest(ident, claims, groups, now);
    return { ok: false, pending: true, error: 'Your identity is not linked to an official account here yet. An administrator has been asked to approve it; try again once they have.' };
  }
  if (account.disabled) {
    recordAudit(account.name, 'auth.oidc.sign-in', `Official:${account.id}`, 'denied', 'account disabled');
    return { ok: false, error: 'This official account is disabled' };
  }

  // Roles from groups, only where an administrator mapped them (first rule that matches).
  let groupsApplied: string | undefined;
  const rule = p.groups?.rules.find(r => groups.includes(r.group));
  if (rule && (rule.role !== roleOf(account) || (rule.institution ?? undefined) !== (account.institution ?? undefined))) {
    const r = setRole(account.id, { role: rule.role, institution: rule.institution ?? null }, `Identity provider ${p.name} (group ${rule.group})`);
    if ('error' in r) recordAudit(account.name, 'auth.oidc.groups', `Official:${account.id}`, 'denied', `group ${rule.group}: ${r.error}`);
    else { account = r; groupsApplied = rule.group; }
  }

  const amr = Array.isArray(claims.amr) ? claims.amr.filter((x): x is string => typeof x === 'string') : [];
  const acr = typeof claims.acr === 'string' ? claims.acr : undefined;
  const twoStep = p.mfa.accept && (amr.some(m => p.mfa.amr.includes(m)) || (!!acr && p.mfa.acr.includes(acr)));
  const sid = randomUUID();
  try { d.logout[sid] = { idToken: seal(idToken, `oidc-logout:${sid}`), expiresAt: now + SESSION_HOURS * 3_600_000 }; } catch { /* sign-out at the provider then goes without a hint */ }
  noteIdentitySignIn(account.id, now);
  return { ok: true, account: accountById(account.id) ?? account, twoStep, from: flow.from, sid, ...(groupsApplied ? { groupsApplied } : {}) };
}

function upsertRequest(ident: { issuer: string; claim: string; value: string }, c: IdClaims, groups: string[], now: number): void {
  const d = signOnDb();
  const at = new Date(now).toISOString();
  const name = stringClaim(c.name) ?? ([stringClaim(c.given_name), stringClaim(c.family_name)].filter(Boolean).join(' ') || stringClaim(c.preferred_username) || ident.value);
  const email = stringClaim(c.email);
  let r = d.requests.find(x => x.issuer === ident.issuer && x.claim === ident.claim && x.value === ident.value);
  if (r) {
    r.lastAt = at; r.attempts++; r.name = name.slice(0, 120); r.groups = groups;
    if (email) r.email = email.slice(0, 254);
    if (r.status === 'approved') r.status = 'pending'; // approved, then its account was unlinked: ask again
  } else {
    r = { id: randomUUID(), ...ident, name: name.slice(0, 120), ...(email ? { email: email.slice(0, 254) } : {}), groups, firstAt: at, lastAt: at, attempts: 1, status: 'pending' };
    d.requests.unshift(r);
    if (d.requests.length > 500) d.requests.length = 500;
  }
  recordAudit('sign-in attempt', 'auth.oidc.sign-in', `SignOnRequest:${r.id}`, 'denied', r.status === 'refused' ? 'identity refused by an administrator' : 'identity not linked to an account; waiting for an administrator');
}

// ── Identities waiting for an administrator ────────────────────────────
export const listRequests = (): IdentityRequest[] => signOnDb().requests;

export function decideRequest(id: string, input: { action?: string; accountId?: string; account?: { email?: string; name?: string; office?: string; role?: string; institution?: string }; reason?: string }, by: string, now = Date.now()): { request: IdentityRequest } | { error: string } {
  const r = signOnDb().requests.find(x => x.id === id);
  if (!r) return { error: 'No such request' };
  if (r.status === 'approved') return { error: 'This request was approved already' };
  const ident = { issuer: r.issuer, claim: r.claim, value: r.value };
  if (input.action === 'link') {
    const a = linkIdentity(input.accountId ?? '', ident, by);
    if ('error' in a) return a;
    Object.assign(r, { status: 'approved', decidedBy: by, decidedAt: new Date(now).toISOString(), accountId: a.id });
  } else if (input.action === 'create') {
    const a = createAccountForIdentity({ ...input.account, email: input.account?.email ?? r.email }, ident, by);
    if ('error' in a) return a;
    Object.assign(r, { status: 'approved', decidedBy: by, decidedAt: new Date(now).toISOString(), accountId: a.id });
  } else if (input.action === 'refuse') {
    Object.assign(r, { status: 'refused', decidedBy: by, decidedAt: new Date(now).toISOString(), reason: (input.reason ?? '').trim().slice(0, 300) || undefined });
  } else return { error: 'action must be link, create or refuse' };
  recordAudit(by, 'auth.oidc.request', `SignOnRequest:${r.id}`, 'ok', `${r.name} · ${r.status}${r.accountId ? ` · account ${r.accountId}` : ''}${r.reason ? ` · ${r.reason}` : ''}`);
  return { request: r };
}

// ── Signing out at the provider (RP-initiated logout) ──────────────────
/** Where to send the browser to end the provider's session too, when the provider supports it. */
export function logoutUrl(sid: string | undefined, requestOrigin?: string): string | null {
  const d = signOnDb();
  const p = d.provider;
  const entry = sid ? d.logout[sid] : undefined;
  if (sid) delete d.logout[sid];
  if (!p?.metadata.end_session_endpoint || !sid) return null;
  const u = new URL(p.metadata.end_session_endpoint);
  if (entry) {
    const t = openSealed(entry.idToken, `oidc-logout:${sid}`);
    if (!('error' in t)) u.searchParams.set('id_token_hint', t.plain);
  }
  u.searchParams.set('client_id', p.clientId);
  const o = platformOrigin(requestOrigin);
  if (!('error' in o)) u.searchParams.set('post_logout_redirect_uri', `${o.origin}/sign-in`);
  return u.href;
}
