// One twin entity: its stable id, the ids other systems use for it, its
// latest observations and the sources behind them.
import { NextRequest, NextResponse } from 'next/server';
import { entityProfile, syncRegister } from '@/lib/twin/register';

export const dynamic = 'force-dynamic';

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  await syncRegister();
  const p = entityProfile(decodeURIComponent(params.id));
  if (!p) return NextResponse.json({ error: 'No such entity' }, { status: 404 });
  return NextResponse.json(p);
}
