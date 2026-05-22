// /api/public/accountability — open-data JSON for the published
// accountability aggregates (service SLAs, appeals pipeline, decision-time
// trend). Everything here is already anon-readable on the Public
// Observatory; this exposes it in a machine-readable form so journalists
// and researchers can consume it programmatically instead of scraping.
//
// Aggregate-only (no citizen id, ref, or row-level field). No auth — public
// by design — and short-cached.
//
// Query params: ?days=1..365 (default 90), ?charter=<charter_id> to scope.

import { NextResponse } from 'next/server';
import { serviceSlaStats, appealsStats, serviceSlaTrend } from '@/lib/db/repos/institutions';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const days = Math.min(365, Math.max(1, Number(url.searchParams.get('days') ?? '90') | 0));
  const weeks = Math.min(52, Math.max(1, Math.round(days / 7)));
  const charter = url.searchParams.get('charter') ?? undefined;

  const [serviceSla, appeals, slaTrend] = await Promise.all([
    serviceSlaStats({ charterId: charter, days }),
    appealsStats({ charterId: charter, days }),
    serviceSlaTrend({ charterId: charter, weeks }),
  ]);

  return NextResponse.json(
    {
      document: 'civicos.public_accountability',
      version: 1,
      generated_at: new Date().toISOString(),
      window_days: days,
      charter: charter ?? null,
      service_sla: serviceSla,
      appeals,
      sla_trend: slaTrend,
    },
    { headers: { 'cache-control': 'public, max-age=300' } },
  );
}
