// The dates a metric has observations for (?metric=), oldest first: the steps
// of the twin's history view.

import { NextRequest, NextResponse } from 'next/server';
import { metricDates, syncRegister } from '@/lib/twin/register';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  await syncRegister();
  const metric = req.nextUrl.searchParams.get('metric');
  if (!metric) return NextResponse.json({ error: 'metric is required' }, { status: 400 });
  return NextResponse.json({ metric, dates: metricDates(metric) });
}
