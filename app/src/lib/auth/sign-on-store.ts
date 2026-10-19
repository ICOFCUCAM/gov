// The platform state behind signing in with the government's identity
// provider and with passkeys (lib/auth/oidc.ts, lib/auth/passkeys.ts): the
// provider's configuration (client secret sealed), sign-ins in progress
// (state, nonce and PKCE verifier, ten minutes, used once), identities
// waiting for an administrator, the ID tokens kept for signing out at the
// provider, and passkey challenges. Held in platform state like every store
// (lib/data/persist.ts); passkeys themselves are kept on the official's
// account (lib/auth/officials.ts).

import { touch } from '@/lib/data/repo/track';
import type { OfficialRole } from './roles';

export interface GroupRule { group: string; role: OfficialRole; institution?: string }

export interface ProviderConfig {
  /** Shown on the sign-in button: "Sign in with <name>". */
  name: string;
  /** Exactly as the provider publishes it (`iss` must equal it). */
  issuer: string;
  clientId: string;
  /** Sealed under the data key (lib/crypto/envelope.ts, associated data `oidc-client:<issuer>`). */
  clientSecret?: string;
  tokenAuth: 'client_secret_basic' | 'client_secret_post' | 'none';
  scopes: string;
  /** The claim that names the official stably: `sub` (default), or e.g. `employee_id`, `email` (verified only). */
  matchClaim: string;
  /** Optional, set by an administrator: roles from the provider's groups, first rule that matches wins. */
  groups?: { claim: string; rules: GroupRule[] };
  /** Whether the provider's own multi-factor sign-in (acr/amr) counts as the second sign-in step. */
  mfa: { accept: boolean; amr: string[]; acr: string[] };
  /** The provider is on the government's own network (private addresses allowed for it alone). */
  internalNetwork: boolean;
  /** Further hosts the provider's endpoints may be on, besides the issuer's (set by an administrator). */
  extraHosts: string[];
  enabled: boolean;
  metadata: {
    authorization_endpoint: string; token_endpoint: string; jwks_uri: string; end_session_endpoint?: string;
    id_token_signing_alg_values_supported?: string[]; code_challenge_methods_supported?: string[];
  };
  discoveredAt: string;
  updatedAt: string;
  updatedBy: string;
  version: number;
}

export interface Flow { state: string; nonce: string; verifier: string; from: string; createdAt: number; providerVersion: number; redirectUri: string }

export interface IdentityRequest {
  id: string;
  issuer: string;
  claim: string;
  value: string;
  name: string;
  /** Shown to administrators only, to recognise the person; never in the audit chain. */
  email?: string;
  groups: string[];
  firstAt: string;
  lastAt: string;
  attempts: number;
  status: 'pending' | 'approved' | 'refused';
  decidedBy?: string;
  decidedAt?: string;
  accountId?: string;
  reason?: string;
}

export interface Challenge { id: string; challenge: string; purpose: 'register' | 'sign-in' | 'second-step'; accountId?: string; expiresAt: number }

export interface SignOnDb {
  provider?: ProviderConfig;
  flows: Record<string, Flow>;
  requests: IdentityRequest[];
  /** Session id → the ID token (sealed) to hint the provider at sign-out. */
  logout: Record<string, { idToken: string; expiresAt: number }>;
  challenges: Record<string, Challenge>;
}

const g = globalThis as unknown as { __civicosSignOn?: SignOnDb };
export const signOnDb = (): SignOnDb => {
  const d = touch('__civicosSignOn', g.__civicosSignOn ??= { flows: {}, requests: [], logout: {}, challenges: {} });
  // Snapshots saved before a field existed.
  d.flows ??= {}; d.requests ??= []; d.logout ??= {}; d.challenges ??= {};
  return d;
};
export function resetSignOn(): void { g.__civicosSignOn = undefined; }

/** Whether the provider's policy (still) lets its multi-factor sign-in count as the second step. */
export const providerMfaAccepted = (): boolean => !!signOnDb().provider?.mfa.accept;

/** Drop entries past their time (called on every use, so nothing piles up). */
export function prune(d: SignOnDb, now = Date.now()): void {
  for (const [k, f] of Object.entries(d.flows)) if (now - f.createdAt > 10 * 60_000) delete d.flows[k];
  for (const [k, l] of Object.entries(d.logout)) if (l.expiresAt < now) delete d.logout[k];
  for (const [k, c] of Object.entries(d.challenges)) if (c.expiresAt < now) delete d.challenges[k];
}

/**
 * The platform's own origin, which passkeys are bound to (their relying
 * party id is its host) and the identity provider sends officials back to:
 * CIVICOS_PUBLIC_URL. Only while sign-in is not enforced (previews, a first
 * installation) does the request's own origin stand in.
 */
export function platformOrigin(requestOrigin?: string, env: NodeJS.ProcessEnv = process.env): { origin: string; host: string } | { error: string } {
  const raw = env.CIVICOS_PUBLIC_URL?.trim();
  if (raw) {
    try { const u = new URL(raw); return { origin: u.origin, host: u.hostname }; } catch { return { error: 'CIVICOS_PUBLIC_URL is not a valid address' }; }
  }
  if (env.CIVICOS_AUTH === 'enforce' || !requestOrigin) return { error: 'Set CIVICOS_PUBLIC_URL to the platform\'s public address first: passkeys and the identity provider are bound to it' };
  const u = new URL(requestOrigin);
  return { origin: u.origin, host: u.hostname };
}
