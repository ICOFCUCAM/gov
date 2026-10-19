// Shared request authorisation for privileged API routes.
//
// Machine credentials are separated by purpose (go-live review M-7), so the
// secret every scheduled job carries opens nothing but the scheduled jobs:
//   • cron         CIVICOS_CRON_SECRET          /api/cron/* (pg_cron, Vercel Cron)
//   • export       CIVICOS_EXPORT_SECRET        /api/substrate/export and /digest
//   • publisher    CIVICOS_PUBLISHER_SECRET     /api/releases/publisher/* automation (CI)
//   • provisioning CIVICOS_PROVISIONING_SECRET  bulk officer creation, webhook test pings
// Each is accepted only as `Authorization: Bearer …` (never from the query
// string, which ends up in access logs and proxies) and compared in constant
// time. A route that also accepts a person accepts a platform-tier officer's
// Supabase access token (JWT), verified by asking the substrate (under that
// user's RLS) who the current actor is.
//
// Deprecation path: an installation that still drives export, publisher or
// provisioning automation with the cron secret can set
// CIVICOS_LEGACY_SHARED_SECRET=1. While it is set, and only for a purpose
// whose own variable is not set, the cron secret is still accepted there, and
// every such use is logged as `auth.shared_secret_deprecated`. Set the
// purpose's own secret, move the automation to it, then remove the flag.
//
// These checks are defense-in-depth: the SECURITY DEFINER RPCs enforce the
// platform-tier gate themselves, so a route is never the sole authority.

import { createHash, timingSafeEqual } from 'node:crypto';
import { tokenScopedClient } from '@/lib/db/client';
import { logger } from '@/lib/ops/log';

export const PLATFORM_ROLES = new Set([
  'platform-admin', 'noc-officer', 'cabinet-officer', 'auditor',
]);

export type SecretPurpose = 'cron' | 'export' | 'publisher' | 'provisioning';
/** The environment variable that holds each purpose's secret. */
export const SECRET_ENV: Record<SecretPurpose, string> = {
  cron: 'CIVICOS_CRON_SECRET',
  export: 'CIVICOS_EXPORT_SECRET',
  publisher: 'CIVICOS_PUBLISHER_SECRET',
  provisioning: 'CIVICOS_PROVISIONING_SECRET',
};

const pathOf = (req: Request): string => { try { return new URL(req.url).pathname; } catch { return ''; } };

/** The bearer token of a request (header only), or ''. A secret sent as `?token=` is refused and logged (without it), never read. */
function bearerOf(req: Request, purpose: SecretPurpose): string {
  const token = (req.headers.get('authorization') ?? '').replace(/^Bearer\s+/i, '').trim();
  if (!token) {
    let inQuery = false;
    try { inQuery = new URL(req.url).searchParams.has('token'); } catch { /* not a URL */ }
    if (inQuery) logger.warn('auth.secret_in_query_refused', { route: pathOf(req), purpose, advice: 'send it as Authorization: Bearer; query strings are no longer accepted' });
  }
  return token;
}

/**
 * The machine secret for one purpose, from `Authorization: Bearer …` only,
 * compared in constant time. False when the purpose's secret is not set
 * (and the deprecated shared-secret fallback does not apply).
 */
export function secretAuthorized(req: Request, purpose: SecretPurpose): boolean {
  const token = bearerOf(req, purpose);
  if (!token) return false;
  const own = process.env[SECRET_ENV[purpose]];
  if (own) return secretEquals(token, own);
  const shared = process.env.CIVICOS_CRON_SECRET;
  if (purpose !== 'cron' && process.env.CIVICOS_LEGACY_SHARED_SECRET === '1' && shared && secretEquals(token, shared)) {
    logger.warn('auth.shared_secret_deprecated', { route: pathOf(req), purpose, advice: `set ${SECRET_ENV[purpose]} and stop using CIVICOS_CRON_SECRET here, then remove CIVICOS_LEGACY_SHARED_SECRET` });
    return true;
  }
  return false;
}

/** The scheduled jobs' secret (CIVICOS_CRON_SECRET), header only. Opens /api/cron/* and nothing else. */
export function cronAuthorized(req: Request): boolean {
  return secretAuthorized(req, 'cron');
}

/** Constant-time comparison of two secrets of any length. */
export function secretEquals(given: string, expected: string): boolean {
  const a = createHash('sha256').update(given, 'utf8').digest();
  const b = createHash('sha256').update(expected, 'utf8').digest();
  return timingSafeEqual(a, b);
}

/** Platform-tier officer session path (Supabase JWT). */
export async function sessionAuthorized(req: Request, roles: ReadonlySet<string> = PLATFORM_ROLES): Promise<boolean> {
  const bearer = (req.headers.get('authorization') ?? '').replace(/^Bearer\s+/i, '');
  if (!bearer || bearer.split('.').length !== 3) return false; // not a JWT
  const scoped = tokenScopedClient(bearer);
  if (!scoped) return false;
  const { data, error } = await scoped.rpc('civicos_current_actor');
  if (error || !data) return false;
  const actor = (Array.isArray(data) ? data[0] : data) as { kind?: string; role?: string } | null;
  return !!actor && actor.kind === 'officer' && roles.has(actor.role ?? '');
}

/** The substrate's administrator role: the only one that changes connections to
 *  outside systems (federation webhooks; civicos.is_platform_admin() on the SQL side). */
export const PLATFORM_ADMIN_ROLES: ReadonlySet<string> = new Set(['platform-admin']);

/** Accept the purpose's own secret or a platform-tier officer session. */
export async function platformOrSecretAuthorized(req: Request, purpose: Exclude<SecretPurpose, 'cron'>): Promise<boolean> {
  return secretAuthorized(req, purpose) || await sessionAuthorized(req);
}

/** Accept the purpose's own secret or a platform administrator's session (not auditors or other platform roles). */
export async function platformAdminOrSecretAuthorized(req: Request, purpose: Exclude<SecretPurpose, 'cron'>): Promise<boolean> {
  return secretAuthorized(req, purpose) || await sessionAuthorized(req, PLATFORM_ADMIN_ROLES);
}
