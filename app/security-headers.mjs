// The platform's security headers in one place (architecture review S8):
// next.config.mjs serves them and vercel.json mirrors them
// (security-headers.test.ts keeps the two the same).
//
// Content-Security-Policy: everything from the platform itself — no outside
// script, style, font, image or connection (the doctrine: no third-party
// services on any page). Scripts run only with the request's nonce: the
// middleware makes a fresh one for every request and sends
// `script-src 'self' 'nonce-…' 'strict-dynamic'` (no 'unsafe-inline' for
// scripts; 'unsafe-eval' only in development, for hot reloading); Next.js
// puts the nonce on its own scripts and the root layout on the one that
// writes the nation's facts, and scripts those load are trusted through
// 'strict-dynamic'. The other directives are fixed here. The Supabase
// substrate, when configured, is the one outside origin the browser may
// call. The embeddable widgets (/embed/*) set their own policy
// (frame-ancestors = the ministry's website).
// Strict-Transport-Security: browsers keep to HTTPS for two years
// (CIVICOS_HSTS=off for a plain-HTTP air-gapped network).

const supabase = (() => { try { return process.env.NEXT_PUBLIC_SUPABASE_URL ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).origin : ''; } catch { return ''; } })();
const dev = process.env.NODE_ENV !== 'production';

/** Every directive except script-src, which carries the request's nonce. */
export const DIRECTIVES = [
  "default-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self'",
  `connect-src 'self'${supabase ? ` ${supabase} ${supabase.replace(/^http/, 'ws')}` : ''}`,
  "worker-src 'self' blob:",
  "manifest-src 'self'",
  "media-src 'self' blob:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
];

/** script-src: with a nonce, only scripts carrying it (and what they load); without one, only the platform's own files. */
export function scriptSrc(nonce, isDev = dev) {
  const evalSrc = isDev ? " 'unsafe-eval'" : '';
  return nonce ? `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${evalSrc}` : `script-src 'self'${evalSrc}`;
}

/** The whole policy for one response (the middleware passes the request's nonce). */
export function contentSecurityPolicy(nonce, isDev = dev) {
  return [DIRECTIVES[0], scriptSrc(nonce, isDev), ...DIRECTIVES.slice(1)].join('; ');
}

/** The policy without a nonce: no inline script at all (answers that are not pages). */
export const CSP = contentSecurityPolicy(null);

export const HSTS = 'max-age=63072000; includeSubDomains';

/**
 * Headers for every page and API answer except the embeddable widgets. The
 * Content-Security-Policy is not among them: it carries a nonce per request,
 * so the middleware sets it (src/middleware.ts, contentSecurityPolicy()).
 */
export function pageHeaders(env = process.env) {
  return [
    ...(env.CIVICOS_HSTS === 'off' ? [] : [{ key: 'Strict-Transport-Security', value: HSTS }]),
    { key: 'X-Frame-Options', value: 'DENY' },
    { key: 'X-Content-Type-Options', value: 'nosniff' },
    { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
    { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
    { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
  ];
}

/** Headers for the embeddable widgets (their route adds frame-ancestors). */
export function embedHeaders(env = process.env) {
  return [
    ...(env.CIVICOS_HSTS === 'off' ? [] : [{ key: 'Strict-Transport-Security', value: HSTS }]),
    { key: 'X-Content-Type-Options', value: 'nosniff' },
    { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
    { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
  ];
}
