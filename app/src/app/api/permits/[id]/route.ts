import { NextResponse } from 'next/server';
import { getPermit } from '@/lib/data/store';

export const dynamic = 'force-dynamic';

export async function GET(_req: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const permit = getPermit(params.id);
  if (!permit) {
    return NextResponse.json({ error: 'Permit not found' }, { status: 404 });
  }
  return NextResponse.json({ permit });
}
