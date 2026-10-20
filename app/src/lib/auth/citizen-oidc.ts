// Citizens sign in through the nation's identity provider
// (docs/GOVERNMENT_OPERATING_MODEL.md §10.1, directions 8.7-8.10): OpenID
// Connect authorization code with PKCE, to the issuer and client the
// deployment profile names (deployment.identity.citizens; the client secret,
// if the provider requires one, in CIVICOS_CITIZEN_OIDC_SECRET). The ID token
// is checked exactly as for officials (lib/auth/oidc.ts checkIdToken). The
// session it gives (lib/auth/citizen-session.ts) carries the provider's
// subject and name only. Flows in progress are kept in memory for ten
// minutes; nothing about the citizen is stored by signing in.

import { createHash, randomBytes } from 'node:crypto';
import { discover, checkIdToken, providerFetch, providerKeys, type FetchDeps } from './oidc';
import { getSovereign } from '@/lib/data/store';
import { recordAudit } from '@/lib/data/store/audit';

export const CITIZEN_FLOW_COOKIE = 'civicos_citizen_oidc';
export const CITIZEN_CALLBACK_PATH = '/api/auth/citizen/callback';
const FLOW_MS = 10 * 60_000;

interface Provider { issuer: string; clientId: string; extraHosts: string[]; internalNetwork: boolean; metadata: Awaited<ReturnType<typeof discover>>; at: number }
interface Flow { state: string; nonce: string; verifier: string; from: string; redirectUri: string; at: number }
interface Mem { provider?: Provider; flows: Map<string, Flow> }
const g = globalThis as unknown as { __citizenOidc?: Mem };
const mem = (): Mem => (g.__citizenOidc ??= { flows: new Map<string, Flow>() });
export function resetCitizenOidc(): void { g.__citizenOidc = undefined; }

/** The citizens' provider the nation configured, or why there is none. */
export function citizenProviderConfig(): { issuer: string; clientId: string; assurance?: string } | { error: string } {
  const c = getSovereign().deployment?.identity?.citizens;
  return c ? c : { error: 'Citizen sign-in through the national identity service is not set up on this installation' };
}

async function provider(deps: FetchDeps, now: number): Promise<Provider | { error: string }> {
  const cfg = citizenProviderConfig();
  if ('error' in cfg) return cfg;
  const m = mem();
  if (m.provider && m.provider.issuer === cfg.issuer && m.provider.clientId === cfg.clientId && now - m.provider.at < 3_600_000) return m.provider;
  try {
    const base = { issuer: cfg.issuer, extraHosts: [] as string[], internalNetwork: false };
    m.provider = { ...base, clientId: cfg.clientId, metadata: await discover(base, deps), at: now };
    return m.provider;
  } catch (e) { return { error: `The national identity service could not be reached: ${(e as Error).message}` }; }
}

const b64u = (b: Buffer) => b.toString('base64url');
const safeFrom = (f: string | null | undefined) => (f && f.startsWith('/wallet') && f.length < 300 ? f : '/wallet');

export async function startCitizenSignIn(from: string | null | undefined, origin: string, deps: FetchDeps = {}, now = Date.now()): Promise<{ url: string; state: string } | { error: string }> {
  const p = await provider(deps, now);
  if ('error' in p) return p;
  const m = mem();
  for (const [k, f] of m.flows) if (now - f.at > FLOW_MS) m.flows.delete(k);
  if (m.flows.size > 5000) return { error: 'Too many sign-ins in progress; try again in a few minutes' };
  const state = b64u(randomBytes(32)), nonce = b64u(randomBytes(32)), verifier = b64u(randomBytes(48));
  const redirectUri = `${new URL(origin).origin}${CITIZEN_CALLBACK_PATH}`;
  m.flows.set(state, { state, nonce, verifier, from: safeFrom(from), redirectUri, at: now });
  const u = new URL(p.metadata.authorization_endpoint);
  for (const [k, v] of Object.entries({ response_type: 'code', client_id: p.clientId, redirect_uri: redirectUri, scope: 'openid profile', state, nonce, code_challenge: b64u(createHash('sha256').update(verifier).digest()), code_challenge_method: 'S256' })) u.searchParams.set(k, v);
  const cfg = citizenProviderConfig();
  const acr = 'error' in cfg ? undefined : cfg.assurance;
  if (acr) u.searchParams.set('acr_values', acr);
  return { url: u.href, state };
}

export type CitizenFinish = { ok: true; sub: string; name: string; issuer: string; from: string; assurance?: string } | { ok: false; error: string };

export async function finishCitizenSignIn(q: { state?: string | null; code?: string | null; error?: string | null; cookieState?: string | null }, deps: FetchDeps = {}, now = Date.now()): Promise<CitizenFinish> {
  const m = mem();
  const flow = q.state ? m.flows.get(q.state) : undefined;
  if (flow) m.flows.delete(q.state!);
  if (!flow || now - flow.at > FLOW_MS || q.cookieState !== q.state) return { ok: false, error: 'This sign-in has expired or was already used; start again' };
  if (q.error) return { ok: false, error: `The identity service did not sign you in (${String(q.error).slice(0, 80)})` };
  if (!q.code) return { ok: false, error: 'The identity service sent no authorization code' };
  const p = await provider(deps, now);
  if ('error' in p) return { ok: false, error: p.error };
  const form = new URLSearchParams({ grant_type: 'authorization_code', code: q.code, redirect_uri: flow.redirectUri, code_verifier: flow.verifier });
  const headers: Record<string, string> = { 'content-type': 'application/x-www-form-urlencoded' };
  const secret = process.env.CIVICOS_CITIZEN_OIDC_SECRET;
  if (secret) headers.authorization = `Basic ${Buffer.from(`${encodeURIComponent(p.clientId)}:${encodeURIComponent(secret)}`).toString('base64')}`;
  else form.set('client_id', p.clientId);
  try {
    const t = JSON.parse((await providerFetch(p.metadata.token_endpoint, p, deps, { method: 'POST', body: form.toString(), headers })).text) as { id_token?: unknown };
    if (typeof t.id_token !== 'string') throw new Error('no ID token');
    const claims = checkIdToken(t.id_token, p, await providerKeys(p, deps, false, now), flow.nonce, now);
    const name = typeof claims.name === 'string' ? claims.name : [claims.given_name, claims.family_name].filter(x => typeof x === 'string').join(' ') || 'Citizen';
    const acr = typeof claims.acr === 'string' ? claims.acr : undefined;
    // Who signed in is not written anywhere: only that a citizen sign-in succeeded (no subject, no name).
    recordAudit('citizen', 'auth.citizen.sign-in', 'Citizen:?', 'ok', `through ${new URL(p.issuer).host}${acr ? ` · ${acr}` : ''}`);
    return { ok: true, sub: claims.sub, name: String(name).slice(0, 120), issuer: p.issuer, from: flow.from, ...(acr ? { assurance: acr } : {}) };
  } catch (e) {
    recordAudit('citizen', 'auth.citizen.sign-in', 'Citizen:?', 'denied', (e as Error).message.slice(0, 160));
    return { ok: false, error: 'The identity service\'s answer could not be verified; try again' };
  }
}
