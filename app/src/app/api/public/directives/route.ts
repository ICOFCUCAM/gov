// /api/public/directives — open-data feed of public directives
// (signed / effective / rescinded / published). Completes the open-data set
// alongside accountability, charters, and telemetry. Directives in these
// statuses are already anon-readable on the Public Observatory; this is
// their machine-readable form. No auth; short-cached.

import { NextResponse } from 'next/server';
import { listDirectivesRows } from '@/lib/db/repos/memory';

export const dynamic = 'force-dynamic';

const PUBLIC_STATUSES = new Set(['signed', 'effective', 'rescinded', 'published']);

export async function GET(req: Request) {
  const url = new URL(req.url);
  const issuer = url.searchParams.get('issuer') ?? undefined;
  const rows = (await listDirectivesRows({ issuer, limit: 200 }))
    .filter(d => PUBLIC_STATUSES.has(d.status));
  return NextResponse.json(
    {
      document: 'civicos.public_directives',
      version: 1,
      generated_at: new Date().toISOString(),
      issuer: issuer ?? null,
      count: rows.length,
      directives: rows.map(d => ({
        ref: d.ref,
        kind: d.kind,
        title: d.title,
        issued_by_charter_id: d.issued_by_charter_id,
        status: d.status,
        citation: d.citation,
        targets: d.targets,
        signed_at: d.signed_at,
        effective_at: d.effective_at,
        rescinded_at: d.rescinded_at,
      })),
    },
    { headers: { 'cache-control': 'public, max-age=300' } },
  );
}
