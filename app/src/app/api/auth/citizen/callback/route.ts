// GET /api/auth/citizen/callback — the identity service sends the citizen
// back here (lib/auth/citizen-oidc.ts); on success the citizen's session
// (lib/auth/citizen-session.ts) is set and they continue to the wallet.
import { NextRequest, NextResponse } from 'next/server';
import { finishCitizenSignIn, CITIZEN_FLOW_COOKIE } from '@/lib/auth/citizen-oidc';
import { signCitizen, CITIZEN_COOKIE, CITIZEN_SESSION_HOURS } from '@/lib/auth/citizen-session';
import { sessionSecret } from '@/lib/auth/officials';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams;
  const r = await finishCitizenSignIn({ state: q.get('state'), code: q.get('code'), error: q.get('error'), cookieState: req.cookies.get(CITIZEN_FLOW_COOKIE)?.value });
  if (!r.ok) return NextResponse.redirect(new URL(`/login?error=${encodeURIComponent(r.error)}`, req.url), 303);
  const now = Math.floor(Date.now() / 1000);
  const token = await signCitizen({ sub: r.sub, name: r.name, issuer: r.issuer, iat: now, exp: now + CITIZEN_SESSION_HOURS * 3600, ...(r.assurance ? { assurance: r.assurance } : {}) }, sessionSecret());
  const res = NextResponse.redirect(new URL(r.from, req.url), 303);
  res.cookies.set(CITIZEN_COOKIE, token, { httpOnly: true, sameSite: 'lax', secure: req.nextUrl.protocol === 'https:', path: '/', maxAge: CITIZEN_SESSION_HOURS * 3600 });
  res.cookies.delete(CITIZEN_FLOW_COOKIE);
  return res;
}
