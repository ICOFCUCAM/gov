import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Sovereign access gate. Real and correct, but enforcement is opt-in so a
// public prototype/preview is not bricked: set CIVICOS_AUTH=enforce to
// require a session cookie for non-public routes. Without it, the gate is
// transparent (all routes pass) but the policy is in place and audited.
// Read-only facts the cover shows pre-sign-in: identity (name, motto, insignia),
// the institution register (also public in the Government Directory) and the
// audit chain's integrity check used by the start-up sequence.
const PUBLIC_READ = [/^\/api\/sovereign$/, /^\/api\/setup$/, /^\/api\/org\/ministries$/, /^\/api\/audit\/verify$/];
const PUBLIC = [/^\/$/, /^\/cover/, /^\/login/, /^\/developers/, /^\/_next/, /^\/favicon/, /^\/assets/, /^\/api\/health/];
// Machine callers with no browser session that authenticate themselves in
// the route: the update watchdog (CIVICOS_CRON_SECRET, called by pg_cron)
// and the deployment agent's health reports (per-nation agent credential).
const SELF_AUTHENTICATED = [/^\/api\/cron\/update-watchdog$/, /^\/api\/releases\/health$/];

export function middleware(req: NextRequest) {
  const res = NextResponse.next();
  // Baseline security headers on every response.
  res.headers.set('X-Frame-Options', 'SAMEORIGIN');
  res.headers.set('X-Content-Type-Options', 'nosniff');
  res.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');

  if (process.env.CIVICOS_AUTH !== 'enforce') return res;

  const { pathname } = req.nextUrl;
  if (PUBLIC.some(re => re.test(pathname))) return res;
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
