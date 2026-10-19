// /api/public/charters — open-data directory of activated institutions
// (charters). Pairs with /api/public/accountability: researchers need the
// charter catalog (id, label, kind, domain) to interpret the per-charter
// SLA/appeals stats. Institutions are already anon-readable on the Public
// Observatory; this is their machine-readable form. No auth; short-cached.
//
// Read from the register's owner (architecture review D8): the platform's
// ministry registry and standing institutions (lib/db/mirror.ts
// institutionRows()). The substrate's civicos.institutions mirrors them; the
// one thing only it keeps, when a charter was first activated, is added from
// it where the substrate is connected.

import { NextResponse } from 'next/server';
import { listInstitutionsRows } from '@/lib/db/repos/institutions';
import { institutionRows } from '@/lib/db/mirror';

export const dynamic = 'force-dynamic';

export async function GET() {
  const activatedAt = new Map((await listInstitutionsRows({ activated: true }).catch(() => [])).map(i => [i.charter_id, i.activated_at]));
  const rows = institutionRows().filter(i => i.activated);
  return NextResponse.json(
    {
      document: 'civicos.public_charters',
      version: 1,
      generated_at: new Date().toISOString(),
      count: rows.length,
      charters: rows.map(i => ({
        charter_id: i.charterId,
        label: i.label,
        kind: i.kind,
        domain: i.domain,
        archetype_or_branch: i.archetypeOrBranch,
        activated_at: activatedAt.get(i.charterId) ?? null,
      })),
    },
    { headers: { 'cache-control': 'public, max-age=600' } },
  );
}
