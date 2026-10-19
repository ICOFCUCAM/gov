// OAuth 2.0 token endpoint for integrations (RFC 6749 §4.4, client
// credentials; lib/auth/client-credentials.ts). The integration authenticates
// with its id as client_id and its key (civ_…) as client_secret, by HTTP Basic
// or in the form body (application/x-www-form-urlencoded; JSON is accepted
// too), with grant_type=client_credentials and optionally the scopes it wants
// (only scopes it holds). The answer is a short-lived access token signed by
// the key custody provider, sent as `Authorization: Bearer <token>` to the
// twin's OGC API – Features, SensorThings and tile services. Errors follow
// RFC 6749 §5.2 (`error`, `error_description`). The route checks the client
// itself (SELF_AUTHENTICATED in lib/auth/roles.ts); no session is involved.

import { NextRequest, NextResponse } from 'next/server';
import { issueToken, type TokenRequest } from '@/lib/auth/client-credentials';
import { logger } from '@/lib/ops/log';

export const dynamic = 'force-dynamic';

const NO_STORE = { 'cache-control': 'no-store', pragma: 'no-cache' };

async function readBody(req: NextRequest): Promise<TokenRequest> {
  const type = req.headers.get('content-type') ?? '';
  const text = await req.text().catch(() => '');
  if (/json/i.test(type)) {
    try { const j = JSON.parse(text) as Record<string, unknown>; return Object.fromEntries(Object.entries(j).filter(([, v]) => typeof v === 'string')) as TokenRequest; } catch { return {}; }
  }
  const form = new URLSearchParams(text);
  const pick = (k: keyof TokenRequest) => form.get(k) ?? undefined;
  return { grant_type: pick('grant_type'), scope: pick('scope'), client_id: pick('client_id'), client_secret: pick('client_secret') };
}

/**
 * @example request {"grant_type":"client_credentials","scope":"ogc:read","client_id":"IC-0001","client_secret":"civ_1a2b3c4d_…"}
 * @example response 200 {"access_token":"eyJhbGciOiJFZERTQSIsInR5cCI6ImF0K2p3dCJ9.…","token_type":"Bearer","expires_in":600,"scope":"ogc:read"}
 */
export async function POST(req: NextRequest) {
  const body = await readBody(req);
  const r = await issueToken(req.nextUrl.origin, req.headers.get('authorization'), body);
  if (r.ok) {
    logger.info('oauth.token.issued', { scope: r.body.scope });
    return NextResponse.json(r.body, { headers: NO_STORE });
  }
  const headers: Record<string, string> = { ...NO_STORE };
  if (r.status === 401) headers['www-authenticate'] = `Basic realm="civicos-integrations"`;
  if (r.retryAfterSeconds) headers['retry-after'] = String(r.retryAfterSeconds);
  return NextResponse.json(r.body, { status: r.status, headers });
}
