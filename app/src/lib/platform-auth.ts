// Shared request authorisation for privileged API routes.
//
// Two accepted credentials, mirroring the rest of the platform tier:
//   • CIVICOS_CRON_SECRET in ?token= or Authorization: Bearer — for CLI /
//     automation that has no UI session.
//   • a Supabase access token (JWT) belonging to a platform-tier officer,
//     verified by asking the substrate (under that user's RLS) who the
//     current actor is.
//
// These checks are defense-in-depth: the SECURITY DEFINER RPCs enforce the
// platform-tier gate themselves, so a route is never the sole authority.

import { tokenScopedClient } from '@/lib/db/client';

export const PLATFORM_ROLES = new Set([
  'platform-admin', 'noc-officer', 'cabinet-officer', 'auditor',
]);

/** Fixed shared-secret path (CLI / automation, no UI session). */
export function cronAuthorized(req: Request): boolean {
  const expected = process.env.CIVICOS_CRON_SECRET;
  if (!expected) return false;
  const url = new URL(req.url);
  const token = url.searchParams.get('token')
    ?? (req.headers.get('authorization') ?? '').replace(/^Bearer\s+/i, '');
  return token.length > 0 && token === expected;
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
