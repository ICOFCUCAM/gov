// The twin's entity register: the nation, its places (ISO 3166-2 codes), its
// operational regions and its institutions, with stable ids (lib/twin/register.ts).

import { NextRequest, NextResponse } from 'next/server';
import { listEntities, syncRegister, type EntityKind } from '@/lib/twin/register';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  await syncRegister();
  const kind = req.nextUrl.searchParams.get('kind') as EntityKind | null;
  return NextResponse.json({ entities: listEntities(kind ?? undefined) });
}
