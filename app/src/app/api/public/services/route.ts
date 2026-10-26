// GET /api/public/services — the public service catalogue (plan step I13;
// open without sign-in, middleware PUBLIC_READ). Only published entries,
// each with its status computed now from the records (a service whose
// procedure is not approved never shows "active"), never who proposed or
// published it. ?id=<service> one service with its journey (each step ready or
// not connected) and the disruptions open on it.
import { NextRequest, NextResponse } from 'next/server';
import { publicCatalogue, getService, publicService } from '@/lib/frontdoor/catalogue';
import { serviceJourney } from '@/lib/frontdoor/journey';
import { openDisruptions } from '@/lib/frontdoor/service-management';
import { samplesAllowed } from '@/lib/ops/mode';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get('id');
  if (id) {
    const e = getService(id);
    const p = e && (!e.sample || samplesAllowed()) ? publicService(e) : null;
    if (!p) return NextResponse.json({ error: 'No published service has that id' }, { status: 404 });
    return NextResponse.json({ service: p, journey: serviceJourney(id)?.steps ?? [], disruptions: openDisruptions(id).map(d => ({ startedAt: d.startedAt, impact: d.impact, channels: d.channels, updates: d.updates.map(u => ({ at: u.at, text: u.text })), ...(d.sample ? { sample: true } : {}) })) });
  }
  return NextResponse.json({ services: publicCatalogue() });
}
