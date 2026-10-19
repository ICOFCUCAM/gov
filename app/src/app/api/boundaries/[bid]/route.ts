// One boundary version: GET with its shapes (for the preview); POST
// { action: 'publish' } by a different official, or { action: 'withdraw', reason }.
import { NextRequest, NextResponse } from 'next/server';
import { getBoundaryVersion, publishBoundaries, withdrawBoundaries } from '@/lib/data/boundaries';
import { mappingAgency } from '@/lib/data/facilities';
import { refusal, withOfficial } from '@/lib/auth/official';
import { canManageBoundaries } from '@/lib/auth/roles';
export const dynamic = 'force-dynamic';

export async function GET(_req: NextRequest, { params }: { params: { bid: string } }) {
  const v = getBoundaryVersion(params.bid);
  return v ? NextResponse.json({ version: v }) : NextResponse.json({ error: 'Boundary version not found' }, { status: 404 });
}

export async function POST(req: NextRequest, { params }: { params: { bid: string } }) {
  const refused = await refusal(s => canManageBoundaries(s, mappingAgency()?.id));
  if (refused) return refused;
  const b = (await withOfficial(await req.json().catch(() => ({})))) as { by?: string; action?: string; reason?: string };
  const r = b.action === 'publish' ? publishBoundaries(params.bid, b.by ?? '')
    : b.action === 'withdraw' ? withdrawBoundaries(params.bid, b.by ?? '', b.reason)
    : { error: 'Say what to do: publish or withdraw' };
  if ('error' in r) return NextResponse.json(r, { status: /not found/.test(r.error) ? 404 : 409 });
  return NextResponse.json({ version: r });
}
