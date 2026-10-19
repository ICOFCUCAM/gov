// /api/public/accountability — open-data JSON for the published
// accountability aggregates (service SLAs, appeals pipeline, decision-time
// trends, institutional data-access footprint, governance output).
// Everything here is already anon-readable on the Public Observatory / charter
// profiles; this exposes it in a machine-readable form so journalists and
// researchers can consume it programmatically instead of scraping.
//
// Aggregate-only (no citizen id, ref, or row-level field). No auth — public
// by design — and short-cached.
//
// Query params: ?days=1..365 (default 90), ?charter=<charter_id> to scope,
// ?weeks=1..104 for the trends (default days/7), ?directive_days=1..1825 for
// the governance output (default 365), ?only=directives for that part alone
// (what the charter profile and the scoreboard read).
//
// Governance output (directive_stats, directive_trend) is computed from the
// platform's directives register, which owns directives (architecture review
// D8), not from the substrate's mirror of it; `directive_source` says so
// (lib/twin/signal.ts: reported, the platform's own record). The other
// aggregates are the substrate's own rows (requests, appeals, consents).

import { NextResponse } from 'next/server';
import {
  serviceSlaStats, appealsStats, serviceSlaTrend, appealsTrend,
  consentFootprintStats,
} from '@/lib/db/repos/institutions';
import { signedDirectives, settleDirectives } from '@/lib/data/directives';
import { directiveStatsOf, directiveTrendOf, directiveStatsSignal } from '@/lib/data/directive-stats';
import { adoptSubstrateDirectives, queueMirror } from '@/lib/db/mirror';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const days = Math.min(365, Math.max(1, Number(url.searchParams.get('days') ?? '90') | 0));
  const weeks = Math.min(52, Math.max(1, Math.round(days / 7)));
  const charter = url.searchParams.get('charter') ?? undefined;
  const weeksParam = Number(url.searchParams.get('weeks'));
  const trendWeeks = weeksParam ? Math.min(104, Math.max(1, Math.trunc(weeksParam))) : weeks;
  const directiveDays = Math.min(1825, Math.max(1, Math.trunc(Number(url.searchParams.get('directive_days')) || 365)));
  const only = url.searchParams.get('only');

  await adoptSubstrateDirectives();
  for (const ref of settleDirectives()) queueMirror('directive', ref);
  const signed = signedDirectives();
  const generatedAt = new Date().toISOString();
  const directives = directiveStatsOf(signed, { charterId: charter, days: directiveDays });
  const directiveTrendPts = directiveTrendOf(signed, { charterId: charter, weeks: trendWeeks });
  const directiveSource = directiveStatsSignal(generatedAt);

  if (only === 'directives') {
    return NextResponse.json(
      {
        document: 'civicos.public_accountability',
        version: 2,
        generated_at: generatedAt,
        charter: charter ?? null,
        directive_stats: directives,
        directive_trend: directiveTrendPts,
        directive_source: directiveSource,
      },
      { headers: { 'cache-control': 'public, max-age=300' } },
    );
  }

  const [serviceSla, appeals, slaTrend, appealTrend, consentFootprint] = await Promise.all([
    serviceSlaStats({ charterId: charter, days }),
    appealsStats({ charterId: charter, days }),
    serviceSlaTrend({ charterId: charter, weeks: trendWeeks }),
    appealsTrend({ charterId: charter, weeks: trendWeeks }),
    consentFootprintStats({ charterId: charter }),
  ]);

  return NextResponse.json(
    {
      document: 'civicos.public_accountability',
      version: 2,
      generated_at: generatedAt,
      window_days: days,
      charter: charter ?? null,
      service_sla: serviceSla,
      appeals,
      sla_trend: slaTrend,
      appeals_trend: appealTrend,
      consent_footprint: consentFootprint,
      directive_stats: directives,
      directive_trend: directiveTrendPts,
      directive_source: directiveSource,
    },
    { headers: { 'cache-control': 'public, max-age=300' } },
  );
}
