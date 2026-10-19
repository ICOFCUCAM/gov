import { NextRequest, NextResponse } from 'next/server';
import { clearIncidentPlace, placeIncident, readPlaceInput } from '@/lib/data/incident-places';
import { withOfficial, refusal } from '@/lib/auth/official';
import { ministryPermission } from '@/lib/auth/roles';
export const dynamic = 'force-dynamic';

/** Record or move where an incident is: a region, a point on the map, or a registered site. */
export async function PUT(req: NextRequest, { params }: { params: { id: string; key: string } }) {
  const refused = await refusal(s => ministryPermission(s, params.id));
  if (refused) return refused;
  const b = (await withOfficial(await req.json().catch(() => ({})))) as Record<string, unknown> & { by?: string };
  const input = readPlaceInput(b);
  if ('error' in input) return NextResponse.json(input, { status: 400 });
  const r = await placeIncident(params.id, params.key, input, b.by ?? 'operator');
  if ('error' in r) return NextResponse.json(r, { status: /not found/i.test(r.error) ? 404 : 422 });
  return NextResponse.json(r);
}

/** Clear an incident's place (kept in its history). */
export async function DELETE(req: NextRequest, { params }: { params: { id: string; key: string } }) {
  const refused = await refusal(s => ministryPermission(s, params.id));
  if (refused) return refused;
  const b = (await withOfficial(await req.json().catch(() => ({})))) as { by?: string; reason?: string };
  const r = clearIncidentPlace(params.id, params.key, b.by ?? 'operator', b.reason);
  if ('error' in r) return NextResponse.json(r, { status: /not found/i.test(r.error) ? 404 : 409 });
  return NextResponse.json({ incident: r });
}
