// Sign in through the government's identity provider (OpenID Connect,
// lib/auth/oidc.ts). GET ?from=/path starts a sign-in: a fresh state, nonce
// and PKCE verifier are kept on the server for ten minutes, the state also in
// an httpOnly cookie for this browser, and the browser is sent to the
// provider. Open without a session (it is how officials get one).

import { NextRequest, NextResponse } from 'next/server';
import { OIDC_COOKIE, startSignIn } from '@/lib/auth/oidc';
import { sessionSecretProblem } from '@/lib/auth/officials';

export const dynamic = 'force-dynamic';

const back = (req: NextRequest, why: string) => {
  const u = new URL('/sign-in', req.nextUrl.origin);
  u.searchParams.set('oidc', why);
  return NextResponse.redirect(u, 303);
};

export async function GET(req: NextRequest) {
  const problem = sessionSecretProblem();
  if (problem) return back(req, problem);
  const r = startSignIn(req.nextUrl.searchParams.get('from'), req.nextUrl.origin);
  if ('error' in r) return back(req, r.error);
  const res = NextResponse.redirect(r.url, 303);
  // Lax: the provider sends the browser back with a top-level GET from its own site.
  res.cookies.set(OIDC_COOKIE, r.state, { httpOnly: true, sameSite: 'lax', path: '/api/auth/oidc', maxAge: 600, secure: req.nextUrl.protocol === 'https:' });
  res.headers.set('cache-control', 'no-store');
  return res;
}
