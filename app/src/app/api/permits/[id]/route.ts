import { NextResponse } from 'next/server';
import { getPermit, permitHolders } from '@/lib/data/store';
import { readRefusal } from '@/lib/auth/official';
import { canReadPermits } from '@/lib/auth/roles';

export const dynamic = 'force-dynamic';

export async function GET(_req: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const refused = await readRefusal(s => canReadPermits(s, permitHolders()));
  if (refused) return refused;
  const permit = getPermit(params.id);
  if (!permit) {
    return NextResponse.json({ error: 'Permit not found' }, { status: 404 });
  }
  return NextResponse.json({ permit });
}
