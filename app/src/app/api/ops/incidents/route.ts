import { NextRequest, NextResponse } from 'next/server';
import { createIncident, listIncidents } from '@/lib/data/store';
import type { IncidentSeverity } from '@/lib/api/types';

export const dynamic = 'force-dynamic';

const SEV: IncidentSeverity[] = ['sev1', 'sev2', 'sev3', 'sev4'];

export function GET() {
  return NextResponse.json({ incidents: listIncidents() });
}

export async function POST(req: NextRequest) {
  let body: { severity?: string; title?: string; scope?: string; by?: string };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }
  if (!body.title || !body.scope) {
    return NextResponse.json({ error: 'title and scope are required' }, { status: 422 });
  }
  const severity = SEV.includes(body.severity as IncidentSeverity)
    ? (body.severity as IncidentSeverity)
    : 'sev3';
  const inc = createIncident({
    severity,
    title: body.title,
    scope: body.scope,
    by: body.by ?? 'operator',
  });
  return NextResponse.json({ incident: inc }, { status: 201 });
}
