// /api/public/telemetry — open-data catalog of active telemetry streams
// (metadata only: id, charter, label, unit, thresholds). This is what the
// state measures; sample VALUES are authenticated-tier and deliberately NOT
// included here. Stream metadata is already anon-readable on the Public
// Observatory; this is its machine-readable form. No auth; short-cached.

import { NextResponse } from 'next/server';
import { listTelemetryStreamsRows } from '@/lib/db/repos/telemetry';

export const dynamic = 'force-dynamic';

export async function GET() {
  const rows = await listTelemetryStreamsRows({ activeOnly: true, limit: 500 });
  return NextResponse.json(
    {
      document: 'civicos.public_telemetry_catalog',
      version: 1,
      generated_at: new Date().toISOString(),
      count: rows.length,
      streams: rows.map(s => ({
        stream_id: s.stream_id,
        charter_id: s.charter_id,
        label: s.label,
        unit: s.unit,
        aggregation: s.aggregation,
        warn_threshold: s.warn_threshold,
        alert_threshold: s.alert_threshold,
      })),
    },
    { headers: { 'cache-control': 'public, max-age=600' } },
  );
}
