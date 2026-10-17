import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Sovereign access gate. Real and correct, but enforcement is opt-in so a
// public prototype/preview is not bricked: set CIVICOS_AUTH=enforce to
// require a session cookie for non-public routes. Without it, the gate is
// transparent (all routes pass) but the policy is in place and audited.
// Read-only facts the cover shows pre-sign-in: identity (name, motto, insignia),
// the institution register (also public in the Government Directory) and the
// audit chain's integrity check used by the start-up sequence.
const PUBLIC_READ = [/^\/api\/sovereign$/, /^\/api\/setup$/, /^\/api\/org\/ministries$/, /^\/api\/audit\/verify$/, /^\/api\/public-sites\/[a-z-]+\/content$/];
const PUBLIC = [/^\/$/, /^\/cover/, /^\/login/, /^\/developers/, /^\/_next/, /^\/favicon/, /^\/assets/, /^\/fonts\//, /^\/api\/health/];
// The public institution websites and their shared pages: every page in the
// (public) route group is for citizens without an account (middleware.test.ts
// fails if a page there is not covered), plus the embeddable services widget
// (/embed) and a migrating ministry's forwarding (/r).
const PUBLIC_SITES = /^\/(embed|r|agriculture|assembly|communications|education|emergency|energy|environment|foreign-affairs|government|health|interior|judiciary|justice|labour|legal|noc|police|portal|presidency|public|senate|sign-in|sitemap|trade|transport|treasury)(\/|$)/;
// Machine callers with no browser session that authenticate themselves in
// the route: every scheduled job under /api/cron (CIVICOS_CRON_SECRET, called
// by pg_cron; each refuses when the secret is unset, see middleware.test.ts)
// and the deployment agent's health reports (per-nation agent credential).
const SELF_AUTHENTICATED = [/^\/api\/cron\/[a-z0-9-]+$/, /^\/api\/releases\/health$/];

export function middleware(req: NextRequest) {
  const res = NextResponse.next();
  // Baseline security headers on every response.
  // Embeddable widgets set their own frame-ancestors policy (the ministry's registered website).
  if (!req.nextUrl.pathname.startsWith('/embed/')) res.headers.set('X-Frame-Options', 'SAMEORIGIN');
  res.headers.set('X-Content-Type-Options', 'nosniff');
  res.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');

  if (process.env.CIVICOS_AUTH !== 'enforce') return res;

  const { pathname } = req.nextUrl;
  if (PUBLIC.some(re => re.test(pathname))) return res;
  if (PUBLIC_SITES.test(pathname)) return res;
  if (SELF_AUTHENTICATED.some(re => re.test(pathname))) return res;
  // The cover reads the nation's public identity before anyone signs in.
  if (req.method === 'GET' && PUBLIC_READ.some(re => re.test(pathname))) return res;

  const session = req.cookies.get('civicos_session')?.value;
  if (session) return res;

  const url = req.nextUrl.clone();
  url.pathname = '/login';
  url.searchParams.set('from', pathname);
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
