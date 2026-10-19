// The platform's security headers in one place (architecture review S8):
// next.config.mjs serves them and vercel.json mirrors them
// (security-headers.test.ts keeps the two the same).
//
// Content-Security-Policy: everything from the platform itself — no outside
// script, style, font, image or connection (the doctrine: no third-party
// services on any page). Inline scripts stay allowed because the root
// layout writes the nation's facts before scripts load; a nonce would
// tighten this later. The Supabase substrate, when configured, is the one
// outside origin the browser may call. The embeddable widgets (/embed/*)
// set their own policy (frame-ancestors = the ministry's website).
// Strict-Transport-Security: browsers keep to HTTPS for two years
// (CIVICOS_HSTS=off for a plain-HTTP air-gapped network).

const supabase = (() => { try { return process.env.NEXT_PUBLIC_SUPABASE_URL ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).origin : ''; } catch { return ''; } })();
const dev = process.env.NODE_ENV !== 'production';

export const CSP = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${dev ? " 'unsafe-eval'" : ''}`,
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
].join('; ');

export const HSTS = 'max-age=63072000; includeSubDomains';

/** Headers for every page and API answer except the embeddable widgets. */
export function pageHeaders(env = process.env) {
  return [
    { key: 'Content-Security-Policy', value: CSP },
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
