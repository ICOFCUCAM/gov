// One twin entity: its stable id, the ids other systems use for it, its
// latest observations and the sources behind them. With
// Accept: application/ld+json the same entity as NGSI-LD (lib/twin/ngsi.ts):
// places as AdministrativeArea, facilities as PointOfInterest, observations as
// properties with observedAt; ?options=temporalValues gives every value over
// time. The JSON answer is unchanged.
import { NextRequest, NextResponse } from 'next/server';
import { entityProfile, syncRegister } from '@/lib/twin/register';
import { ngsiEntity } from '@/lib/twin/ngsi';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  await syncRegister();
  const id = decodeURIComponent(params.id);
  if (/application\/ld\+json/.test(req.headers.get('accept') ?? '')) {
    const temporal = (req.nextUrl.searchParams.get('options') ?? '').split(',').includes('temporalValues');
    const doc = ngsiEntity(id, { temporal });
    if (!doc) return NextResponse.json({ error: 'No such entity' }, { status: 404 });
    return NextResponse.json(doc, { headers: { 'content-type': 'application/ld+json; charset=utf-8', vary: 'Accept' } });
  }
  const p = entityProfile(id);
  if (!p) return NextResponse.json({ error: 'No such entity' }, { status: 404 });
  return NextResponse.json(p, { headers: { vary: 'Accept' } });
}
