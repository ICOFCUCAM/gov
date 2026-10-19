// /api/releases/telemetry — where an installation sends crash reports and
// usage metrics. Each goes through the data-sovereignty gate: if the nation
// has not enabled that category, nothing is kept on the publisher's side
// (the response says it was held back, so the sender does not retry).
import { NextRequest, NextResponse } from 'next/server';
import { chamberBody } from '@/lib/updates/access';
import { transmit } from '@/lib/data/sovereignty';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const body = await chamberBody<{ category?: string; payload?: Record<string, unknown> }>(req);
  if (body instanceof NextResponse) return body;
  const { nation: n, b } = body;
  if (b.category !== 'crash-reports' && b.category !== 'usage-metrics') return NextResponse.json({ error: 'category must be crash-reports or usage-metrics' }, { status: 422 });
  const payload = b.payload && typeof b.payload === 'object' && !Array.isArray(b.payload) ? b.payload : {};
  if (JSON.stringify(payload).length > 16_000) return NextResponse.json({ error: 'Payload too large' }, { status: 413 });
  const out = transmit(n.id, b.category, `${b.category} · ${n.installedVersion}`, payload);
  return NextResponse.json({ sent: out.sent, heldBack: !out.sent });
}
