// lib/db/repos/institutions — persistent institutional registry.
//
// Mirrors the in-memory orchestration registry shape but reads/writes to
// civicos.institutions via the register_institution / activate_institution
// RPCs. When the substrate isn't configured, calls become no-ops and the
// registry stays memory-only.

import { publicClient, substrateAvailable } from '@/lib/db/client';
import type { InstitutionRow, InstitutionKind } from '@/lib/db/types';

export interface InstitutionUpsert {
  charterId: string;
  label: string;
  kind: InstitutionKind;
  domain: string;
  archetypeOrBranch: string;
  grammar?: string | null;
  safeguardsConstant?: string | null;
  expectedDomains?: number | null;
  shippedDomains?: number | null;
  meta?: Record<string, unknown>;
}

export async function registerInstitutionRow(
  i: InstitutionUpsert,
): Promise<InstitutionRow | null> {
  const sb = publicClient();
  if (!sb) return null;
  const { data, error } = await sb.rpc('civicos_register_institution', {
    p_charter_id: i.charterId,
    p_label: i.label,
    p_kind: i.kind,
    p_domain: i.domain,
    p_archetype_or_branch: i.archetypeOrBranch,
    p_grammar: i.grammar ?? null,
    p_safeguards_constant: i.safeguardsConstant ?? null,
    p_expected_domains: i.expectedDomains ?? null,
    p_shipped_domains: i.shippedDomains ?? null,
    p_meta: i.meta ?? {},
  });
  if (error) {
    // eslint-disable-next-line no-console
    console.error('[civicos] register_institution RPC failed:', error.message, error.code);
    return null;
  }
  return (data as InstitutionRow) ?? null;
}

export async function activateInstitutionRow(charterId: string): Promise<InstitutionRow | null> {
  const sb = publicClient();
  if (!sb) return null;
  const { data, error } = await sb.rpc('civicos_activate_institution', {
    p_charter_id: charterId,
  });
  if (error) {
    // eslint-disable-next-line no-console
    console.error('[civicos] activate_institution RPC failed:', error.message, error.code);
    return null;
  }
  return (data as InstitutionRow) ?? null;
}

export async function listInstitutionsRows(opts: { kind?: InstitutionKind; activated?: boolean } = {}): Promise<InstitutionRow[]> {
  const sb = publicClient();
  if (!sb) return [];
  let q = sb.from('civicos_institutions').select('*');
  if (opts.kind) q = q.eq('kind', opts.kind);
  if (opts.activated !== undefined) q = q.eq('activated', opts.activated);
  const { data, error } = await q.order('charter_id');
  if (error || !data) return [];
  return data as InstitutionRow[];
}

export { substrateAvailable };
