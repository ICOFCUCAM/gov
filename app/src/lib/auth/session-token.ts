// The signed session of a verified official (cookie `civicos_official`).
// HMAC-SHA-256 over the claims with Web Crypto, so the same code verifies in
// route handlers (Node) and in the middleware (Edge). The cookie is set only
// by the server after it has checked who the person is (lib/auth/officials.ts
// for local accounts, the substrate's sign-in for connected nations).

export const OFFICIAL_COOKIE = 'civicos_official';
export const SESSION_HOURS = 8;

export interface OfficialClaims {
  /** Stable id: `local:<id>` or `officer:<uuid>`. */
  sub: string;
  name: string;
  office?: string;
  method: 'local' | 'substrate';
  iat: number;
  exp: number;
}

const enc = new TextEncoder();
const b64url = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const fromB64url = (s: string) => Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (s.length % 4)) % 4)), c => c.charCodeAt(0));

async function key(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']);
}

export async function signClaims(claims: OfficialClaims, secret: string): Promise<string> {
  const body = b64url(enc.encode(JSON.stringify(claims)));
  const sig = new Uint8Array(await crypto.subtle.sign('HMAC', await key(secret), enc.encode(body)));
  return `${body}.${b64url(sig)}`;
}

/** The claims of a valid, unexpired token; null for anything else. */
export async function verifyToken(token: string | undefined | null, secret: string | undefined, now = Date.now()): Promise<OfficialClaims | null> {
  if (!token || !secret) return null;
  const [body, sig] = token.split('.');
  if (!body || !sig) return null;
  try {
    const ok = await crypto.subtle.verify('HMAC', await key(secret), fromB64url(sig), enc.encode(body));
    if (!ok) return null;
    const c = JSON.parse(new TextDecoder().decode(fromB64url(body))) as OfficialClaims;
    if (typeof c.sub !== 'string' || typeof c.name !== 'string' || typeof c.exp !== 'number' || c.exp * 1000 <= now) return null;
    return c;
  } catch {
    return null;
  }
}
