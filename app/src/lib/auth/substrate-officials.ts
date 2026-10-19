// Officials who sign in through the substrate (Supabase), as the platform
// sees them (go-live review H-3). The substrate says who the person is and
// whether their officer register entry is active; what they may do on the
// platform comes from the platform's own records:
//
//   • an administrator's assignment (lib/auth/officials.ts
//     setSubstrateAssignment, /api/auth/officials/substrate): role and
//     institution, as for a platform account; or, when there is none,
//   • the least the register supports: an officer of the institution the
//     register names (charter_id or institution_id matched to a ministry in
//     the registry), the register's `auditor` as auditor, its
//     `platform-admin` as administrator (so a substrate-only nation has a
//     first administrator), and anything that does not name a known
//     institution as auditor (reads, changes nothing). Signing rights and
//     whole-government scope for anyone else need an assignment.
//
// The installation's second-step policy applies as to platform accounts: a
// substrate session counts as having passed the second step only when the
// substrate's own sign-in did (assurance level aal2 in its access token).
// Every request re-reads the register entry (cached a few seconds), so
// deactivation ends the session at once; when the register cannot be read
// the session does not count (fail closed).

import { serverClient } from '@/lib/db/client';
import { getMinistry, listMinistries } from '@/lib/data/store';
import { substrateAssignment, twoStepRequiredFor } from './officials';
import type { OfficialRole } from './roles';

export interface OfficerRow { id: string; name: string; title: string | null; role: string; active: boolean; institution_id?: string | null; charter_id?: string | null }
export interface SubstrateScope { role: OfficialRole; institution?: string; twoStepRequired: boolean; assigned: boolean }

const CACHE_MS = 5_000;
const g = globalThis as unknown as { __substrateOfficerCache?: Map<string, { at: number; row: OfficerRow | null }> };
const cache = () => (g.__substrateOfficerCache ??= new Map());
export function resetSubstrateOfficerCache(): void { g.__substrateOfficerCache = undefined; }

const COLUMNS = 'id, name, title, role, active, institution_id, charter_id';

/** The register entry of the officer signed in with this substrate user id; null when there is none. */
export async function officerForUser(authUserId: string): Promise<OfficerRow | null | undefined> {
  const sb = serverClient();
  if (!sb) return undefined;
  const { data, error } = await sb.from('civicos_officers').select(COLUMNS).eq('auth_user_id', authUserId).limit(1).maybeSingle();
  if (error) return undefined;
  return (data as OfficerRow | null) ?? null;
}

/**
 * The officer's register entry as it stands now (cached CACHE_MS): null when
 * it no longer exists, undefined when the register cannot be read.
 */
export async function officerNow(officerId: string, now = Date.now()): Promise<OfficerRow | null | undefined> {
  const hit = cache().get(officerId);
  if (hit && now - hit.at < CACHE_MS) return hit.row;
  const sb = serverClient();
  if (!sb) return undefined;
  try {
    const { data, error } = await sb.from('civicos_officers').select(COLUMNS).eq('id', officerId).limit(1).maybeSingle();
    if (error) return undefined;
    const row = (data as OfficerRow | null) ?? null;
    cache().set(officerId, { at: now, row });
    if (cache().size > 5000) cache().delete(cache().keys().next().value!);
    return row;
  } catch {
    return undefined;
  }
}

/** The ministry id the register's institution corresponds to, if the registry knows it. */
export function ministryForOfficer(row: Pick<OfficerRow, 'charter_id' | 'institution_id'>): string | undefined {
  for (const key of [row.charter_id, row.institution_id]) {
    if (!key) continue;
    const direct = getMinistry(key);
    if (direct) return direct.id;
    const bySlug = listMinistries().find(m => m.slug === key);
    if (bySlug) return bySlug.id;
  }
  return undefined;
}

/** What the officer may do on the platform: the administrator's assignment, else the register's least (see above). */
export function substrateScope(row: OfficerRow): SubstrateScope {
  const a = substrateAssignment(row.id);
  if (a) return { role: a.role, institution: a.institution, twoStepRequired: twoStepRequiredFor({ role: a.role }), assigned: true };
  let role: OfficialRole;
  let institution: string | undefined;
  if (row.role === 'platform-admin') role = 'administrator';
  else if (row.role === 'auditor') role = 'auditor';
  else {
    institution = ministryForOfficer(row);
    role = institution ? 'officer' : 'auditor';
  }
  return { role, institution, twoStepRequired: twoStepRequiredFor({ role }), assigned: false };
}

/** Whether the substrate's sign-in passed a second factor: `aal: "aal2"` in its (already verified) access token. */
export function substrateAal2(accessToken: string): boolean {
  try {
    const body = accessToken.split('.')[1];
    if (!body) return false;
    const claims = JSON.parse(Buffer.from(body.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8')) as { aal?: string };
    return claims.aal === 'aal2';
  } catch {
    return false;
  }
}
