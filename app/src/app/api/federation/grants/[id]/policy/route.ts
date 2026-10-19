// A grant's usage policy as an ODRL 2.2 Agreement (JSON-LD): purposes,
// retention (a delete duty) and onward sharing (a distribute prohibition).
import { NextResponse } from 'next/server';
import { listGrants } from '@/lib/data/store';
import { grantAsOdrl } from '@/lib/exchange/usage-policy';

export const dynamic = 'force-dynamic';

export function GET(_req: Request, { params }: { params: { id: string } }) {
  const g = listGrants().find(x => x.id === params.id);
  if (!g) return NextResponse.json({ error: 'Grant not found' }, { status: 404 });
  return NextResponse.json(grantAsOdrl(g), { headers: { 'content-type': 'application/ld+json' } });
}
