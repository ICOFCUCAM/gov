// lib/db/repos/identity — current-actor resolver + claim flows.
//
// • currentActor()           — resolves the signed-in user to an officer
//                              or citizen via the current_actor() RPC.
// • claimCitizen()           — first-touch provisioning for citizens.
// • linkOfficerByEmail()     — administrative bridge for officers whose
//                              email matches a pre-registered record.

import { publicClient, substrateAvailable } from '@/lib/db/client';
import type { CitizenRow, OfficerRow } from '@/lib/db/types';

export type ActorKind = 'officer' | 'citizen';

export interface CurrentActor {
  kind: ActorKind;
  id: string;
  name: string;
  role: string | null;
  charterId: string | null;
  email: string | null;
}

export async function currentActor(): Promise<CurrentActor | null> {
  const sb = publicClient();
  if (!sb) return null;
  const { data, error } = await sb.rpc('civicos_current_actor');
  if (error || !data) return null;
  const rows = data as Array<{
    kind: ActorKind; id: string; name: string;
    role: string | null; charter_id: string | null; email: string | null;
  }>;
  const row = rows[0];
  if (!row) return null;
  return {
    kind: row.kind, id: row.id, name: row.name,
    role: row.role, charterId: row.charter_id, email: row.email,
  };
}

export interface ClaimCitizenInput {
  displayName?: string | null;
  region?: string | null;
  nationalId?: string | null;
}

export async function claimCitizen(input: ClaimCitizenInput = {}): Promise<CitizenRow | null> {
  const sb = publicClient();
  if (!sb) return null;
  const { data, error } = await sb.rpc('civicos_claim_citizen', {
    p_display_name: input.displayName ?? null,
    p_region: input.region ?? null,
    p_national_id: input.nationalId ?? null,
  });
  if (error) {
    // eslint-disable-next-line no-console
    console.error('[civicos] claim_citizen failed:', error.message);
    return null;
  }
  return (data as CitizenRow) ?? null;
}

export async function linkOfficerByEmail(email: string): Promise<OfficerRow | null> {
  const sb = publicClient();
  if (!sb) return null;
  const { data, error } = await sb.rpc('civicos_link_officer_by_email', { p_email: email });
  if (error) {
    // eslint-disable-next-line no-console
    console.error('[civicos] link_officer_by_email failed:', error.message);
    return null;
  }
  return (data as OfficerRow) ?? null;
}

export { substrateAvailable };
