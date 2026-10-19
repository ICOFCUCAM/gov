// /api/releases/incidents/[id] — acknowledge a fallback incident.
import { NextRequest, NextResponse } from 'next/server';
import { acknowledgeIncident } from '@/lib/data/updates';
import { chamberBody } from '@/lib/updates/access';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const r = await chamberBody<{ by?: string }>(req);
  if (r instanceof NextResponse) return r;
  const out = acknowledgeIncident(r.nation.id, params.id, typeof r.b.by === 'string' ? r.b.by : '');
  if ('error' in out) return NextResponse.json({ error: out.error }, { status: out.status });
  return NextResponse.json({ incident: out });
}
