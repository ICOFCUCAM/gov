// /api/public/charters — open-data directory of institutions (charters).
// Pairs with /api/public/accountability: researchers need the charter catalog
// (id, label, kind, domain) to interpret the per-charter SLA/appeals stats.
// Institutions are already public in the Government Directory; this is their
// machine-readable form. No auth; short-cached.
//
// Read from the register's owner only (architecture review D8): the platform's
// ministry registry and standing institutions
// (lib/institution/charter-register.ts), first-activation times included. The
// substrate's civicos.institutions mirrors them and is not read here. This is
// also the answer the console's charter screens read (charter list, profile
// and detail, institutions catalogue, observatory, search) through
// lib/db/repos/institutions.ts.
//
// Query: by default the activated charters (the directory as before);
// ?activated=any for every charter, ?activated=false for the idle ones;
// ?kind=<kind>, ?charter=<charter_id>, ?q=<text in id, label or domain>.

import { NextResponse } from 'next/server';
import { findCharters } from '@/lib/institution/charter-register';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const p = new URL(req.url).searchParams;
  const a = p.get('activated');
  const activated = a === 'any' || a === 'all' ? undefined : a !== 'false';
  const rows = findCharters({
    activated,
    kind: p.get('kind') ?? undefined,
    charter: p.get('charter') ?? undefined,
    q: p.get('q') ?? undefined,
  });
  return NextResponse.json(
    {
      document: 'civicos.public_charters',
      version: 1,
      generated_at: new Date().toISOString(),
      source: 'platform',
      count: rows.length,
      charters: rows.map(i => ({
        charter_id: i.charterId,
        label: i.label,
        kind: i.kind,
        domain: i.domain,
        archetype_or_branch: i.archetypeOrBranch,
        activated: i.activated,
        activated_at: i.activatedAt,
        registered_at: i.registeredAt,
      })),
    },
    { headers: { 'cache-control': 'public, max-age=600' } },
  );
}
