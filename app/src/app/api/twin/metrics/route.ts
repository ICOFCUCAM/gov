// The twin's metric registry (lib/twin/metrics.ts): each metric's label, UCUM
// unit, how regional values combine (sum, mean, weighted-mean or none), its
// period and SDMX concept. GET lists registered, standard and observed-only
// metrics with the suggested units. POST registers a metric or changes its
// definition (a named official; audited with what changed). A signed-in
// official's verified name replaces any name in the request (withOfficial).

import { NextRequest, NextResponse } from 'next/server';
import { listMetrics, registerMetric, COMMON_UNITS, type MetricInput } from '@/lib/twin/metrics';
import { syncRegister } from '@/lib/twin/register';
import { withOfficial } from '@/lib/auth/official';

export const dynamic = 'force-dynamic';

export async function GET() {
  await syncRegister();
  return NextResponse.json({ metrics: listMetrics(), units: COMMON_UNITS });
}

export async function POST(req: NextRequest) {
  const b = (await withOfficial(await req.json().catch(() => ({})))) as MetricInput;
  const r = registerMetric(b);
  if ('error' in r) return NextResponse.json(r, { status: 422 });
  return NextResponse.json({ metric: r });
}
