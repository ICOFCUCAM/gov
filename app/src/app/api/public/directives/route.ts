// /api/public/directives — open-data feed of public directives
// (signed / effective / rescinded / published). Completes the open-data set
// alongside accountability, charters, and telemetry. Directives in these
// statuses are already anon-readable on the Public Observatory; this is
// their machine-readable form. No auth; short-cached. Read from the register's
// owner, the platform (lib/data/directives.ts); the substrate only mirrors it.

import { NextResponse } from 'next/server';
import { listDirectives, settleDirectives } from '@/lib/data/directives';
import { adoptSubstrateDirectives, queueMirror } from '@/lib/db/mirror';

export const dynamic = 'force-dynamic';

const PUBLIC_STATUSES = new Set(['signed', 'effective', 'rescinded', 'published']);

export async function GET(req: Request) {
  const url = new URL(req.url);
  const issuer = url.searchParams.get('issuer') ?? undefined;
  await adoptSubstrateDirectives();
  for (const ref of settleDirectives()) queueMirror('directive', ref);
  const rows = listDirectives({ issuer, limit: 200 })
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
