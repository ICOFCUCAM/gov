// Decide a proposed change to the nation's facility policy. POST { decision:
// "confirm" | "withdraw" }: confirmed by a different administrator than the
// one who proposed it, never over a newer policy; audited.
import { NextRequest, NextResponse } from 'next/server';
import { decidePolicyChange } from '@/lib/data/facilities';
import { withOfficial } from '@/lib/auth/official';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest, { params }: { params: { cid: string } }) {
  const b = (await withOfficial(await req.json().catch(() => ({})))) as { decision?: string; by?: string };
  if (b.decision !== 'confirm' && b.decision !== 'withdraw') return NextResponse.json({ error: 'Confirm or withdraw' }, { status: 422 });
  const r = decidePolicyChange(params.cid, b.decision, b.by ?? '');
  if ('error' in r) return NextResponse.json(r, { status: 422 });
  return NextResponse.json({ policy: r });
}
