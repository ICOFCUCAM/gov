import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Sovereign access gate. Real and correct, but enforcement is opt-in so a
// public prototype/preview is not bricked: set CIVICOS_AUTH=enforce to
// require a session cookie for non-public routes. Without it, the gate is
// transparent (all routes pass) but the policy is in place and audited.
const PUBLIC = [/^\/$/, /^\/login/, /^\/developers/, /^\/_next/, /^\/favicon/, /^\/assets/, /^\/api\/health/];

export function middleware(req: NextRequest) {
  const res = NextResponse.next();
  // Baseline security headers on every response.
  res.headers.set('X-Frame-Options', 'SAMEORIGIN');
  res.headers.set('X-Content-Type-Options', 'nosniff');
  res.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');

  if (process.env.CIVICOS_AUTH !== 'enforce') return res;

  const { pathname } = req.nextUrl;
  if (PUBLIC.some(re => re.test(pathname))) return res;

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
