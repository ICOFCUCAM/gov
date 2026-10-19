// Shared request authorisation for privileged API routes.
//
// Two accepted credentials, mirroring the rest of the platform tier:
//   • CIVICOS_CRON_SECRET in Authorization: Bearer (or, discouraged and
//     logged, ?token=) — for CLI / automation that has no UI session.
//   • a Supabase access token (JWT) belonging to a platform-tier officer,
//     verified by asking the substrate (under that user's RLS) who the
//     current actor is.
//
// These checks are defense-in-depth: the SECURITY DEFINER RPCs enforce the
// platform-tier gate themselves, so a route is never the sole authority.

import { createHash, timingSafeEqual } from 'node:crypto';
import { tokenScopedClient } from '@/lib/db/client';
import { logger } from '@/lib/ops/log';

export const PLATFORM_ROLES = new Set([
  'platform-admin', 'noc-officer', 'cabinet-officer', 'auditor',
]);

/**
 * Fixed shared-secret path (CLI / automation, no UI session): the secret in
 * `Authorization: Bearer …`, compared in constant time (SHA-256 of both
 * sides, then timingSafeEqual, so neither length nor content leaks through
 * timing). `?token=` is still accepted for schedulers that cannot send
 * headers, but it ends up in access logs and proxies, so every such use is
 * logged as discouraged (without the token).
 */
export function cronAuthorized(req: Request): boolean {
  const expected = process.env.CIVICOS_CRON_SECRET;
  if (!expected) return false;
  const header = (req.headers.get('authorization') ?? '').replace(/^Bearer\s+/i, '').trim();
  let token = header;
  if (!token) {
    const url = new URL(req.url);
    token = url.searchParams.get('token') ?? '';
    if (token) logger.warn('auth.cron_secret_in_query', { route: url.pathname, advice: 'send it as Authorization: Bearer; query strings end up in logs' });
  }
  return token.length > 0 && secretEquals(token, expected);
}

/** Constant-time comparison of two secrets of any length. */
export function secretEquals(given: string, expected: string): boolean {
  const a = createHash('sha256').update(given, 'utf8').digest();
  const b = createHash('sha256').update(expected, 'utf8').digest();
  return timingSafeEqual(a, b);
}

/** Platform-tier officer session path (Supabase JWT). */
export async function sessionAuthorized(req: Request): Promise<boolean> {
  const bearer = (req.headers.get('authorization') ?? '').replace(/^Bearer\s+/i, '');
  if (!bearer || bearer.split('.').length !== 3) return false; // not a JWT
  const scoped = tokenScopedClient(bearer);
  if (!scoped) return false;
  const { data, error } = await scoped.rpc('civicos_current_actor');
  if (error || !data) return false;
  const actor = (Array.isArray(data) ? data[0] : data) as { kind?: string; role?: string } | null;
  return !!actor && actor.kind === 'officer' && PLATFORM_ROLES.has(actor.role ?? '');
}

/** Accept either the cron secret or a platform-tier officer session. */
export async function platformOrCronAuthorized(req: Request): Promise<boolean> {
  return cronAuthorized(req) || await sessionAuthorized(req);
}
