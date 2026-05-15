import { NextResponse } from 'next/server';
import { getPermit } from '@/lib/data/store';

export const dynamic = 'force-dynamic';

export function GET(_req: Request, { params }: { params: { id: string } }) {
  const permit = getPermit(params.id);
  if (!permit) {
    return NextResponse.json({ error: 'Permit not found' }, { status: 404 });
  }
  return NextResponse.json({ permit });
}
