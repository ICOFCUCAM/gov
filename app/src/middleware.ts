import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { OFFICIAL_COOKIE, verifyToken, type OfficialClaims } from '@/lib/auth/session-token';
import { apiPermission } from '@/lib/auth/roles';

// Sovereign access gate. Real and correct, but enforcement is opt-in so a
// public prototype/preview is not bricked: set CIVICOS_AUTH=enforce to
// require a session cookie for non-public routes. Without it, the gate is
// transparent (all routes pass) but the policy is in place and audited.
// Read-only facts the cover shows pre-sign-in: identity (name, motto, insignia),
// the institution register (also public in the Government Directory) and the
// audit chain's integrity check used by the start-up sequence; and how
// officials sign in (the sign-in form reads it before anyone has a session).
const PUBLIC_READ = [/^\/api\/auth\/official$/, /^\/api\/sovereign$/, /^\/api\/setup$/, /^\/api\/org\/ministries$/, /^\/api\/audit\/verify$/, /^\/api\/public-sites\/[a-z-]+\/content$/, /^\/api\/public-sites\/language$/, /^\/api\/public-sites\/[a-z-]+\/logo$/];
// Citizens ask for and manage email updates from the public sites without signing in
// (double opt-in and per-sender limits in lib/data/site-subscriptions.ts).
const PUBLIC_WRITE = [/^\/api\/public-sites\/[a-z-]+\/subscribe$/, /^\/api\/subscriptions$/];
const PUBLIC = [/^\/$/, /^\/cover/, /^\/login/, /^\/developers/, /^\/_next/, /^\/favicon/, /^\/assets/, /^\/fonts\//, /^\/api\/health/];
// The public institution websites and their shared pages: every page in the
// (public) route group is for citizens without an account (middleware.test.ts
// fails if a page there is not covered), plus the embeddable services widget
// (/embed) and a migrating ministry's forwarding (/r).
const PUBLIC_SITES = /^\/(embed|r|agriculture|assembly|communications|education|emergency|energy|environment|foreign-affairs|government|health|interior|judiciary|justice|labour|legal|noc|police|portal|presidency|public|search|senate|sign-in|sitemap|subscriptions|trade|transport|treasury)(\/|$)/;
// Machine callers with no browser session that authenticate themselves in
// the route: every scheduled job under /api/cron (CIVICOS_CRON_SECRET, called
// by pg_cron; each refuses when the secret is unset, see middleware.test.ts)
// the deployment agent's health reports (per-nation agent credential) and a
// ministry's connected case system (its own ccf_ key, lib/data/case-import.ts).
const SELF_AUTHENTICATED = [/^\/api\/cron\/[a-z0-9-]+$/, /^\/api\/releases\/health$/, /^\/api\/org\/ministries\/[^/]+\/queue\/feed$/, /^\/api\/org\/ministries\/[^/]+\/facilities\/feed$/];
// Signing in, creating the installation's first account (the route refuses once one exists)
// and setting a new password with an administrator's reset code.
const SIGN_IN = [/^\/api\/auth\/official$/, /^\/api\/auth\/officials$/, /^\/api\/auth\/password$/];
const MUTATING = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

/**
 * With enforcement on, a change through the API needs a verified official
 * (the signed civicos_official cookie, lib/auth/session-token.ts; the key is
 * CIVICOS_SESSION_SECRET, required in this mode), or the automation secret
 * that publisher and scheduled callers present (checked again by the route).
 */
async function officialGate(req: NextRequest, res: NextResponse): Promise<NextResponse> {
  if (req.headers.get('authorization')) return res;
  const ok = await verifyToken(req.cookies.get(OFFICIAL_COOKIE)?.value, process.env.CIVICOS_SESSION_SECRET);
  if (ok) return res;
  return NextResponse.json({ error: 'Sign in as an official to make changes (/sign-in)' }, { status: 401 });
}

/**
 * Who the session belongs to now, asked of the platform itself (GET
 * /api/auth/official, which reads the account as it stands): null when the
 * session no longer counts (password changed, account disabled), undefined
 * when the platform could not be asked. The edge cannot read the account
 * store, so this one internal request per change keeps every change honest.
 * CIVICOS_INTERNAL_URL overrides the address when the public one is not
 * reachable from the server (behind some proxies).
 */
async function liveOfficial(req: NextRequest): Promise<OfficialClaims | null | undefined> {
  try {
    const base = process.env.CIVICOS_INTERNAL_URL || req.nextUrl.origin;
    const r = await fetch(new URL('/api/auth/official', base), { headers: { cookie: req.headers.get('cookie') ?? '' }, cache: 'no-store' });
    if (!r.ok) return undefined;
    return ((await r.json()) as { official?: OfficialClaims | null }).official ?? null;
  } catch {
    return undefined;
  }
}

/**
 * What a signed-in official may change (lib/auth/roles.ts): an auditor
 * changes nothing, structure and accounts are for administrators, an
 * official with an institution acts only in that ministry's workspace, and
 * one the policy requires a second sign-in step of has passed it. Applied
 * to every change whenever the session can be verified here
 * (CIVICOS_SESSION_SECRET set, in any mode), using the account as it stands
 * now: a session that no longer counts is refused. Signing in and resetting
 * a password are left to their routes. Routes that need the record to
 * decide check again themselves.
 */
async function roleGate(req: NextRequest, next: () => NextResponse | Promise<NextResponse>): Promise<NextResponse> {
  const c = await verifyToken(req.cookies.get(OFFICIAL_COOKIE)?.value, process.env.CIVICOS_SESSION_SECRET);
  if (!c || SIGN_IN.some(re => re.test(req.nextUrl.pathname))) return next();
  const live = await liveOfficial(req);
  if (live === null) return NextResponse.json({ error: 'Your session has ended (your password changed or the account was disabled); sign in again (/sign-in)' }, { status: 401 });
  if (live === undefined && process.env.CIVICOS_AUTH === 'enforce') return NextResponse.json({ error: 'Your session could not be checked just now; try again' }, { status: 503 });
  const why = apiPermission(live ?? c, req.method, req.nextUrl.pathname);
  return why ? NextResponse.json({ error: why }, { status: 403 }) : next();
}

export function middleware(req: NextRequest): NextResponse | Promise<NextResponse> {
  const res = NextResponse.next();
  if (process.env.CIVICOS_SESSION_SECRET && req.cookies.get(OFFICIAL_COOKIE)?.value && !req.headers.get('authorization')
    && req.nextUrl.pathname.startsWith('/api/') && MUTATING.has(req.method)) {
    return roleGate(req, () => gate(req, res));
  }
  return gate(req, res);
}

function gate(req: NextRequest, res: NextResponse): NextResponse | Promise<NextResponse> {
  // Baseline security headers on every response.
  // Embeddable widgets set their own frame-ancestors policy (the ministry's registered website).
  if (!req.nextUrl.pathname.startsWith('/embed/')) res.headers.set('X-Frame-Options', 'SAMEORIGIN');
  res.headers.set('X-Content-Type-Options', 'nosniff');
  res.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');

  if (process.env.CIVICOS_AUTH !== 'enforce') return res;

  const { pathname } = req.nextUrl;
  if (PUBLIC.some(re => re.test(pathname))) return res;
  // Previews of unpublished proposals (?preview=) are for signed-in officials only.
  if (PUBLIC_SITES.test(pathname) && !req.nextUrl.searchParams.has('preview')) return res;
  if (SELF_AUTHENTICATED.some(re => re.test(pathname))) return res;
  // The cover reads the nation's public identity before anyone signs in.
  if (req.method === 'GET' && PUBLIC_READ.some(re => re.test(pathname))) return res;
  if (req.method === 'POST' && PUBLIC_WRITE.some(re => re.test(pathname))) return res;

  if (req.method === 'POST' && SIGN_IN.some(re => re.test(pathname))) return res;
  const session = req.cookies.get('civicos_session')?.value || req.cookies.get(OFFICIAL_COOKIE)?.value;
  if (session && pathname.startsWith('/api/') && MUTATING.has(req.method)) return officialGate(req, res);
  if (session) return res;
  if (pathname.startsWith('/api/') && MUTATING.has(req.method)) return officialGate(req, res);

  const url = req.nextUrl.clone();
  url.pathname = '/login';
  url.searchParams.set('from', pathname);
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
