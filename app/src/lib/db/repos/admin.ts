// lib/db/repos/admin — platform-tier officer management.
//
// All RPCs in this module are gated on civicos.is_platform_officer()
// at the substrate; callers without a platform-tier role
// (platform-admin / noc-officer / cabinet-officer / auditor) receive
// 'insufficient_privilege'. The repo doesn't repeat the check — it
// trusts the substrate.

import { publicClient, substrateAvailable } from '@/lib/db/client';
import type { OfficerRow } from '@/lib/db/types';

export interface CreateOfficerInput {
  email: string;
  name: string;
  charterId: string;
  role: string;
  title?: string | null;
}

export async function adminCreateOfficerRow(o: CreateOfficerInput): Promise<{ row: OfficerRow | null; error: string | null }> {
  const sb = publicClient();
  if (!sb) return { row: null, error: 'substrate not configured' };
  const { data, error } = await sb.rpc('civicos_admin_create_officer', {
    p_email: o.email, p_name: o.name,
    p_charter_id: o.charterId, p_role: o.role,
    p_title: o.title ?? null,
  });
  if (error) return { row: null, error: error.message };
  return { row: (data as OfficerRow) ?? null, error: null };
}

export async function adminDeactivateOfficerRow(id: string): Promise<{ row: OfficerRow | null; error: string | null }> {
  const sb = publicClient();
  if (!sb) return { row: null, error: 'substrate not configured' };
  const { data, error } = await sb.rpc('civicos_admin_deactivate_officer', { p_id: id });
  if (error) return { row: null, error: error.message };
  return { row: (data as OfficerRow) ?? null, error: null };
}

export async function listOfficersRows(opts: { charter?: string; activeOnly?: boolean; limit?: number } = {}): Promise<OfficerRow[]> {
  const sb = publicClient();
  if (!sb) return [];
  let q = sb.from('civicos_officers').select('*');
  if (opts.charter) q = q.eq('charter_id', opts.charter);
  if (opts.activeOnly) q = q.eq('active', true);
  const { data, error } = await q.order('charter_id').limit(opts.limit ?? 100);
  if (error || !data) return [];
  return data as OfficerRow[];
}

export { substrateAvailable };
