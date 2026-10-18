// Disable or re-enable a platform account (signed-in official; audited).
import { NextRequest, NextResponse } from 'next/server';
import { setDisabled } from '@/lib/auth/officials';
import { currentOfficial, actorLabel } from '@/lib/auth/official';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const o = await currentOfficial();
  if (!o) return NextResponse.json({ error: 'Sign in as an official' }, { status: 401 });
  const b = (await req.json().catch(() => ({}))) as { disabled?: boolean };
  if (`local:${params.id}` === o.sub && b.disabled) return NextResponse.json({ error: 'You cannot disable your own account' }, { status: 422 });
  const r = setDisabled(params.id, !!b.disabled, actorLabel(o));
  if ('error' in r) return NextResponse.json(r, { status: 422 });
  return NextResponse.json({ account: r });
}
