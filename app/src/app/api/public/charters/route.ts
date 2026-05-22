// /api/public/charters — open-data directory of activated institutions
// (charters). Pairs with /api/public/accountability: researchers need the
// charter catalog (id, label, kind, domain) to interpret the per-charter
// SLA/appeals stats. Institutions are already anon-readable on the Public
// Observatory; this is their machine-readable form. No auth; short-cached.

import { NextResponse } from 'next/server';
import { listInstitutionsRows } from '@/lib/db/repos/institutions';

export const dynamic = 'force-dynamic';

export async function GET() {
  const rows = await listInstitutionsRows({ activated: true });
  return NextResponse.json(
    {
      document: 'civicos.public_charters',
      version: 1,
      generated_at: new Date().toISOString(),
      count: rows.length,
      charters: rows.map(i => ({
        charter_id: i.charter_id,
        label: i.label,
        kind: i.kind,
        domain: i.domain,
        archetype_or_branch: i.archetype_or_branch,
        activated_at: i.activated_at,
      })),
    },
    { headers: { 'cache-control': 'public, max-age=600' } },
  );
}
