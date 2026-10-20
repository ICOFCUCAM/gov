// GET /api/auth/citizen/start?from=/wallet/... — send the citizen to the
// nation's identity service (lib/auth/citizen-oidc.ts), with this browser's
// one-time state in a short cookie.
import { NextRequest, NextResponse } from 'next/server';
import { startCitizenSignIn, CITIZEN_FLOW_COOKIE } from '@/lib/auth/citizen-oidc';
import { platformOrigin } from '@/lib/auth/sign-on-store';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const o = platformOrigin(req.nextUrl.origin);
  if ('error' in o) return NextResponse.redirect(new URL(`/login?error=${encodeURIComponent(o.error)}`, req.url), 303);
  const r = await startCitizenSignIn(req.nextUrl.searchParams.get('from'), o.origin);
  if ('error' in r) return NextResponse.redirect(new URL(`/login?error=${encodeURIComponent(r.error)}`, req.url), 303);
  const res = NextResponse.redirect(r.url, 303);
  res.cookies.set(CITIZEN_FLOW_COOKIE, r.state, { httpOnly: true, sameSite: 'lax', secure: req.nextUrl.protocol === 'https:', path: '/api/auth/citizen', maxAge: 600 });
  return res;
}
