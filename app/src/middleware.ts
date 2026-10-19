import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { OFFICIAL_COOKIE, verifyToken, type OfficialClaims } from '@/lib/auth/session-token';
import { apiPermission, PUBLIC_WRITE, SELF_AUTHENTICATED, verifiesOwnCredential } from '@/lib/auth/roles';

// Sovereign access gate. Real and correct, but enforcement is opt-in so a
// public prototype/preview is not bricked: set CIVICOS_AUTH=enforce to
// require a verified official (the signed civicos_official cookie) for every
// non-public page, read and change. Without it, the gate is transparent (all
// routes pass, the cover's demo session works) but the policy is in place and
// audited. Under enforcement the demo cookie (civicos_session=demo, set by the
// cover and /login when no identity substrate is configured) opens only the
// citizen's Civic Wallet pages (CITIZEN_DEMO); it opens no console page and
// no API.
// Read-only facts the cover shows pre-sign-in: identity (name, motto, insignia),
// the institution register (also public in the Government Directory) and the
// audit chain's integrity check used by the start-up sequence; and how
// officials sign in (the sign-in form reads it before anyone has a session).
// The facility register's PMTiles archive is public by construction: it is
// built only from what a visitor who is not signed in may see
// (lib/twin/tiles-archive.ts); the viewer-aware tile route stays gated.
const PUBLIC_READ = [/^\/api\/auth\/official$/, /^\/api\/sovereign$/, /^\/api\/boundaries\/active$/, /^\/api\/exchange\/key$/, /^\/api\/map-pack\/districts$/,/^\/api\/setup$/, /^\/api\/org\/ministries$/, /^\/api\/audit\/verify$/, /^\/api\/public-sites\/[a-z-]+\/content$/, /^\/api\/public-sites\/language$/, /^\/api\/public-sites\/[a-z-]+\/logo$/, /^\/api\/twin\/tiles\/facilities\.pmtiles$/];
// Public writes (email updates) and self-authenticating machine routes are
// defined with the permission rules in lib/auth/roles.ts.
const PUBLIC = [/^\/$/, /^\/cover/, /^\/login/, /^\/developers/, /^\/_next/, /^\/favicon/, /^\/assets/, /^\/fonts\//, /^\/api\/health/];
// The public institution websites and their shared pages: every page in the
// (public) route group is for citizens without an account (middleware.test.ts
// fails if a page there is not covered), plus the embeddable services widget
// (/embed) and a migrating ministry's forwarding (/r).
const PUBLIC_SITES = /^\/(embed|r|agriculture|assembly|communications|education|emergency|energy|environment|foreign-affairs|government|health|interior|judiciary|justice|labour|legal|noc|police|portal|presidency|public|search|senate|sign-in|sitemap|subscriptions|trade|transport|treasury)(\/|$)/;
// The citizen's Civic Wallet (demo): opened by the citizen demo session the
// cover and /login set when no identity substrate is configured. Its changes
// still go through the official gate below.
const CITIZEN_DEMO = /^\/wallet(\/|$)/;
// Next.js before 14.2.25 skipped middleware for requests carrying this header
// (CVE-2025-29927). The patched version never sends it, so a request that
// arrives with it is an attempt to skip this gate. The ingress strips it too.
const SUBREQUEST_HEADER = 'x-middleware-subrequest';
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
  // Only routes that verify the bearer themselves may be reached with one instead of a session.
  if (bearerRequest(req)) return res;
  const ok = await verifyToken(req.cookies.get(OFFICIAL_COOKIE)?.value, process.env.CIVICOS_SESSION_SECRET);
  if (ok) return res;
  return NextResponse.json({ error: 'Sign in as an official to make changes (/sign-in)' }, { status: 401 });
}

/** A request with an Authorization header to a route that checks that header itself. */
const bearerRequest = (req: NextRequest): boolean =>
  !!req.headers.get('authorization') && verifiesOwnCredential(req.nextUrl.pathname);

/**
 * Under enforcement, a page or read outside the public lists needs a verified
 * official: the signed civicos_official cookie, not the page cookie. API reads
 * are answered 401; pages go to sign-in (citizen pages to /login).
 */
async function readGate(req: NextRequest, res: NextResponse): Promise<NextResponse> {
  const { pathname } = req.nextUrl;
  if (bearerRequest(req)) return res;
  if (await verifyToken(req.cookies.get(OFFICIAL_COOKIE)?.value, process.env.CIVICOS_SESSION_SECRET)) return res;
  if (pathname.startsWith('/api/')) {
    return NextResponse.json({ error: 'Sign in as an official to read this (/sign-in)' }, { status: 401 });
  }
  const url = req.nextUrl.clone();
  url.pathname = CITIZEN_DEMO.test(pathname) ? '/login' : '/sign-in';
  url.search = '';
  url.searchParams.set('from', pathname);
  return NextResponse.redirect(url);
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
async function liveOfficial(req: NextRequest): Promise<{ official: OfficialClaims | null; writable: boolean } | undefined> {
  try {
    const base = process.env.CIVICOS_INTERNAL_URL || req.nextUrl.origin;
    const r = await fetch(new URL('/api/auth/official', base), { headers: { cookie: req.headers.get('cookie') ?? '' }, cache: 'no-store' });
    if (!r.ok) return undefined;
    const j = (await r.json()) as { official?: OfficialClaims | null; state?: { writable?: boolean } };
    // An instance that does not hold the state writer's lease (lib/data/persist.ts) refuses changes.
    return { official: j.official ?? null, writable: j.state?.writable !== false };
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
  const asked = await liveOfficial(req);
  const live = asked && asked.official;
  if (asked && !asked.writable) return NextResponse.json({ error: 'This server is not the platform\'s state writer just now (another instance holds the lease); changes are refused so nothing is lost. Try again shortly.' }, { status: 503 });
  if (live === null) return NextResponse.json({ error: 'Your session has ended (your password changed or the account was disabled); sign in again (/sign-in)' }, { status: 401 });
  if (live === undefined && process.env.CIVICOS_AUTH === 'enforce') return NextResponse.json({ error: 'Your session could not be checked just now; try again' }, { status: 503 });
  const why = apiPermission(live ?? c, req.method, req.nextUrl.pathname);
  return why ? NextResponse.json({ error: why }, { status: 403 }) : next();
}

/**
 * Every request carries a request id (x-request-id): kept when the caller or
 * the ingress sent a well-formed one, made here otherwise. Route handlers
 * read it from the request (lib/ops/log.ts requestIdOf) so their log lines
 * can be joined; the answer carries it back so a citizen or official can
 * quote it when reporting a problem.
 */
const REQUEST_ID = /^[A-Za-z0-9._-]{8,80}$/;
export async function middleware(req: NextRequest): Promise<NextResponse> {
  const given = req.headers.get('x-request-id');
  const id = given && REQUEST_ID.test(given) ? given : crypto.randomUUID();
  const out = await handle(req, id);
  out.headers.set('x-request-id', id);
  return out;
}

function handle(req: NextRequest, requestId: string): NextResponse | Promise<NextResponse> {
  // Defence in depth for CVE-2025-29927: a request carrying Next.js's former
  // internal subrequest header is refused (the patched Next.js no longer sends
  // it, so only an outside caller can).
  if (req.headers.has(SUBREQUEST_HEADER)) {
    return NextResponse.json({ error: 'Refused' }, { status: 400 });
  }
  const forwarded = new Headers(req.headers);
  forwarded.set('x-request-id', requestId);
  const res = NextResponse.next({ request: { headers: forwarded } });
  // A bearer skips the role rules only where the route verifies it itself.
  if (process.env.CIVICOS_SESSION_SECRET && req.cookies.get(OFFICIAL_COOKIE)?.value && !bearerRequest(req)
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
  // The cover reads the nation's public identity before anyone signs in; public maps read the boundaries in force.
  if (req.method === 'GET' && PUBLIC_READ.some(re => re.test(pathname))) return res;
  if (req.method === 'POST' && PUBLIC_WRITE.some(re => re.test(pathname))) return res;

  if (req.method === 'POST' && SIGN_IN.some(re => re.test(pathname))) return res;
  if (pathname.startsWith('/api/') && MUTATING.has(req.method)) return officialGate(req, res);
  // The citizen demo session opens the Civic Wallet pages only (no API, no console page).
  if (CITIZEN_DEMO.test(pathname) && req.cookies.get('civicos_session')?.value) return res;
  return readGate(req, res);
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
