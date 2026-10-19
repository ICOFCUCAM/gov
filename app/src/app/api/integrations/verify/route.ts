// An integration checks its own key (Authorization: Bearer civ_…), and
// gateways in front of other routes ask here: the key is compared by its
// SHA-256 in constant time, the client must be approved (and hold ?scope=
// when given), and its rateLimitRpm applies (429 with Retry-After).
// Authenticated by the key itself, never a session.
import { NextRequest, NextResponse } from 'next/server';
import { verifyIntegrationKey } from '@/lib/data/store';

export const dynamic = 'force-dynamic';

export function GET(req: NextRequest) {
  const r = verifyIntegrationKey(req.headers.get('authorization'), req.nextUrl.searchParams.get('scope') ?? undefined);
  if (!r.ok) {
    const res = NextResponse.json({ error: r.error }, { status: r.status });
    if (r.retryAfterSeconds) res.headers.set('Retry-After', String(r.retryAfterSeconds));
    return res;
  }
  const { id, name, ownerOrg, scopes, rateLimitRpm } = r.client;
  const res = NextResponse.json({ integration: { id, name, ownerOrg, scopes, rateLimitRpm }, remaining: r.remaining });
  res.headers.set('RateLimit-Remaining', String(r.remaining));
  return res;
}
