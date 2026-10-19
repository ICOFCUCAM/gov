// Where the government's identity provider sends officials back (the
// redirect URI registered there). GET ?code&state: the state must be the one
// this browser started with (its cookie) and is used once; the code is
// exchanged with the PKCE verifier, the ID token checked (signature against
// the provider's keys, issuer, audience, expiry, nonce) and the identity
// matched to an official account (lib/auth/oidc.ts). Then the signed session
// is set exactly as for any other sign-in. Open without a session; nothing
// happens without a valid state. Unlinked identities wait for an
// administrator (/admin/officials).

import { NextRequest, NextResponse } from 'next/server';
import { finishSignIn, OIDC_COOKIE } from '@/lib/auth/oidc';
import { issueSession, actorLabel } from '@/lib/auth/official';
import { SESSION_HOURS, type OfficialClaims } from '@/lib/auth/session-token';
import { roleOf } from '@/lib/auth/roles';
import { recordAudit } from '@/lib/data/store';
import { deviceOf } from '@/lib/auth/activity';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams;
  const r = await finishSignIn({ state: q.get('state'), code: q.get('code'), error: q.get('error'), cookieState: req.cookies.get(OIDC_COOKIE)?.value ?? null }, req.nextUrl.origin);
  const secure = req.nextUrl.protocol === 'https:';
  const clear = (res: NextResponse) => { res.cookies.set(OIDC_COOKIE, '', { httpOnly: true, path: '/api/auth/oidc', maxAge: 0, secure }); res.headers.set('cache-control', 'no-store'); return res; };
  if (!r.ok) {
    const u = new URL('/sign-in', req.nextUrl.origin);
    u.searchParams.set('oidc', r.error);
    if (r.pending) u.searchParams.set('pending', '1');
    return clear(NextResponse.redirect(u, 303));
  }
  const a = r.account;
  const now = Math.floor(Date.now() / 1000);
  const claims: OfficialClaims = { sub: `local:${a.id}`, name: a.name, office: a.office, method: 'local', via: 'oidc', sid: r.sid, role: roleOf(a), institution: a.institution,
    twoStep: r.twoStep, twoStepRequired: a.twoStepRequired, iat: now, exp: now + SESSION_HOURS * 3600 };
  // Officials the installation requires a second step of, whose provider sign-in does not count as one, are shown why.
  const to = new URL(claims.twoStepRequired && !claims.twoStep ? '/gov/me#two-step' : r.from, req.nextUrl.origin);
  const res = await issueSession(NextResponse.redirect(to, 303), claims, secure);
  recordAudit(actorLabel(claims), 'auth.sign-in', `Official:${claims.sub}`, 'ok', `identity provider${r.twoStep ? ' (multi-factor)' : ''}${r.groupsApplied ? ` · role from group ${r.groupsApplied}` : ''} · ${deviceOf(req.headers.get('user-agent'))}`);
  return clear(res);
}
