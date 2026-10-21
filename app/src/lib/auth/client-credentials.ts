// OAuth 2.0 client credentials for integrations (RFC 6749 §4.4; architecture
// review I1). A GIS client or a statistics system that holds an integration
// key (civ_…, lib/data/store/federation.ts) can exchange it at the token
// endpoint (POST /api/oauth/token) for a short-lived access token, the way
// ArcGIS, FME and most OAuth libraries expect to authenticate:
//
//   client_id      the integration's id (IC-…), shown in Integrations
//   client_secret  its key (civ_…), sent with HTTP Basic (client_secret_basic)
//                  or in the form body (client_secret_post)
//   scope          optional, space-separated; only scopes the integration
//                  holds (default: all of them)
//
// The token is a JWT access token (RFC 9068 `at+jwt`) signed with Ed25519
// (`EdDSA`) by the key custody provider's `token` key (lib/keys/custody.ts:
// CIVICOS_TOKEN_KEY, or the Vault / KMS key `civicos-token`), so no secret of
// the platform signs it locally under a remote provider. It lives
// TOKEN_TTL_SECONDS and names the key it was issued for (`kp`, the key's
// public prefix): rotating or revoking the key, suspending the integration or
// withdrawing the scope ends its tokens at once, because every use is checked
// against the integration as it stands (verifyIntegrationToken), with the
// same rate limit as the key. Tokens are never stored.

import { randomUUID } from 'node:crypto';
import { verifyIntegrationKey, verifyIntegrationToken, type IntegrationAccess } from '@/lib/data/store';
import { signer, publicHalfById, developmentKeyRefusal } from '@/lib/keys/custody';
import { verifyBytes } from '@/lib/crypto/signing-key';

/** How long an access token lives. */
export const TOKEN_TTL_SECONDS = 600;
/** Clock difference tolerated between this server and the one that issued a token. */
const SKEW_SECONDS = 30;
const TOKEN_TYPE = 'at+jwt';

export interface TokenRequest {
  grant_type?: string;
  scope?: string;
  client_id?: string;
  client_secret?: string;
}

/** What the token endpoint answers: an RFC 6749 §5.1 body, or a §5.2 error with its status. */
export type TokenAnswer =
  | { ok: true; body: { access_token: string; token_type: 'Bearer'; expires_in: number; scope: string } }
  | { ok: false; status: 400 | 401 | 429 | 503; body: { error: 'invalid_request' | 'invalid_client' | 'unsupported_grant_type' | 'invalid_scope' | 'slow_down' | 'temporarily_unavailable'; error_description: string }; basic?: boolean; retryAfterSeconds?: number };

interface Claims { iss: string; sub: string; client_id: string; scope: string; iat: number; exp: number; jti: string; kp: string }

const b64url = (v: string | Buffer) => Buffer.from(v).toString('base64url');
const fromB64url = (v: string) => Buffer.from(v, 'base64url');

/** The client's id and secret: HTTP Basic (form-encoded parts, RFC 6749 §2.3.1) or the body; never both. */
export function clientCredentials(authorization: string | null | undefined, body: TokenRequest): { id?: string; secret?: string; basic: boolean } | { error: string } {
  const basic = /^Basic\s+(.+)$/i.exec(authorization ?? '');
  if (basic) {
    if (body.client_secret) return { error: 'Send the client credentials one way: HTTP Basic or the form body' };
    const raw = Buffer.from(basic[1]!.trim(), 'base64').toString('utf8');
    const i = raw.indexOf(':');
    if (i < 0) return { error: 'HTTP Basic credentials are client_id:client_secret' };
    const dec = (v: string) => { try { return decodeURIComponent(v.replace(/\+/g, ' ')); } catch { return v; } };
    return { id: dec(raw.slice(0, i)), secret: dec(raw.slice(i + 1)), basic: true };
  }
  return { id: body.client_id, secret: body.client_secret, basic: false };
}

/**
 * Answer a token request (RFC 6749 §4.4.2): authenticate the integration by
 * its key, check the grant and the scopes asked for, and issue a signed token.
 */
export async function issueToken(issuer: string, authorization: string | null | undefined, body: TokenRequest, now = Date.now()): Promise<TokenAnswer> {
  const creds = clientCredentials(authorization, body);
  if ('error' in creds) return { ok: false, status: 400, body: { error: 'invalid_request', error_description: creds.error } };
  if (!body.grant_type) return { ok: false, status: 400, body: { error: 'invalid_request', error_description: 'grant_type is required (client_credentials)' } };
  if (body.grant_type !== 'client_credentials') return { ok: false, status: 400, body: { error: 'unsupported_grant_type', error_description: 'Only the client_credentials grant is offered' } };
  if (!creds.secret) return { ok: false, status: 401, basic: true, body: { error: 'invalid_client', error_description: 'Authenticate with the integration id as client_id and its key as client_secret' } };
  const access = verifyIntegrationKey(`Bearer ${creds.secret}`, undefined, now);
  if (!access.ok) {
    if (access.status === 429) return { ok: false, status: 429, retryAfterSeconds: access.retryAfterSeconds, body: { error: 'slow_down', error_description: access.error } };
    return { ok: false, status: 401, basic: creds.basic, body: { error: 'invalid_client', error_description: access.error } };
  }
  const client = access.client;
  if (creds.id && creds.id !== client.id) return { ok: false, status: 401, basic: creds.basic, body: { error: 'invalid_client', error_description: 'client_id does not match the key' } };
  const asked = (body.scope ?? '').split(/\s+/).filter(Boolean);
  const outside = asked.filter(s => !client.scopes.includes(s));
  if (outside.length) return { ok: false, status: 400, body: { error: 'invalid_scope', error_description: `Not granted to this integration: ${outside.join(' ')}` } };
  const scopes = asked.length ? [...new Set(asked)] : client.scopes;
  if (!scopes.length) return { ok: false, status: 400, body: { error: 'invalid_scope', error_description: 'This integration holds no scope' } };
  const iat = Math.floor(now / 1000);
  const claims: Claims = { iss: issuer, sub: client.id, client_id: client.id, scope: scopes.join(' '), iat, exp: iat + TOKEN_TTL_SECONDS, jti: randomUUID(), kp: client.keyPrefix ?? '' };
  // A production installation never issues a token signed with a development key (step I0.1).
  const refused = developmentKeyRefusal('token');
  if (refused) return { ok: false, status: 503, body: { error: 'temporarily_unavailable', error_description: refused } };
  const s = signer('token');
  const half = await s.load();
  const head = b64url(JSON.stringify({ alg: 'EdDSA', typ: TOKEN_TYPE, kid: half.keyId }));
  const input = `${head}.${b64url(JSON.stringify(claims))}`;
  const sig = await s.sign(input);
  // A remote provider may have signed with a newer version than the one loaded: the header must name the key that signed.
  const token = sig.keyId === half.keyId ? `${input}.${b64url(Buffer.from(sig.signature, 'base64'))}` : await reissue(claims, sig.keyId);
  return { ok: true, body: { access_token: token, token_type: 'Bearer', expires_in: TOKEN_TTL_SECONDS, scope: claims.scope } };
}

async function reissue(claims: Claims, keyId: string): Promise<string> {
  const input = `${b64url(JSON.stringify({ alg: 'EdDSA', typ: TOKEN_TYPE, kid: keyId }))}.${b64url(JSON.stringify(claims))}`;
  const sig = await signer('token').sign(input);
  if (sig.keyId !== keyId) throw new Error('The token key changed while signing; ask again');
  return `${input}.${b64url(Buffer.from(sig.signature, 'base64'))}`;
}

/** True for a bearer value shaped like one of these tokens (three base64url parts), not an integration key. */
export const looksLikeToken = (bearer: string): boolean => /^eyJ[\w-]*\.[\w-]+\.[\w-]+$/.test(bearer);

/**
 * Check an access token on use: its Ed25519 signature by the token key, its
 * type and lifetime, the scope asked for, and then the integration as it
 * stands now (verifyIntegrationToken: same key, approved, scope, rate limit).
 */
export async function verifyAccessToken(authorization: string | null | undefined, scope: string | undefined, now = Date.now()): Promise<IntegrationAccess> {
  const token = (authorization ?? '').replace(/^Bearer\s+/i, '').trim();
  const refuse = (error: string): IntegrationAccess => ({ ok: false, status: 401, error });
  if (!looksLikeToken(token)) return refuse('Send an access token: Authorization: Bearer <token>');
  const [h, p, sig] = token.split('.') as [string, string, string];
  let header: { alg?: string; typ?: string; kid?: string }, claims: Partial<Claims>;
  try { header = JSON.parse(fromB64url(h).toString('utf8')); claims = JSON.parse(fromB64url(p).toString('utf8')); } catch { return refuse('The access token cannot be read'); }
  if (header.alg !== 'EdDSA' || header.typ !== TOKEN_TYPE || typeof header.kid !== 'string') return refuse('Not an access token of this platform');
  const half = await publicHalfById('token', header.kid);
  if (!half || !verifyBytes(half.publicKeyPem, `${h}.${p}`, fromB64url(sig).toString('base64'))) return refuse('The access token\'s signature does not verify');
  const t = Math.floor(now / 1000);
  if (typeof claims.exp !== 'number' || claims.exp + SKEW_SECONDS <= t) return refuse('The access token has expired: ask for a new one');
  if (typeof claims.iat !== 'number' || claims.iat - SKEW_SECONDS > t) return refuse('The access token is not valid yet');
  if (typeof claims.sub !== 'string' || typeof claims.kp !== 'string' || typeof claims.scope !== 'string') return refuse('The access token is incomplete');
  if (scope && !claims.scope.split(' ').includes(scope)) return { ok: false, status: 403, error: `The access token does not carry the scope '${scope}'` };
  return verifyIntegrationToken(claims.sub, claims.kp, scope, now);
}
