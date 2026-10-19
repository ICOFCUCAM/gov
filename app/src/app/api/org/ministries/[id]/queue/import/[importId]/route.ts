// Withdraw a load: POST { action: 'withdraw' }. Its cases nobody has acted on
// leave the queue; cases already assigned, escalated or closed stay. Audited.
import { NextRequest, NextResponse } from 'next/server';
import { withdrawImport } from '@/lib/data/case-import';
import { withOfficial, refusal } from '@/lib/auth/official';
import { ministryPermission } from '@/lib/auth/roles';
export const dynamic = 'force-dynamic';

export async function POST(
  req: NextRequest,
  props: { params: Promise<{ id: string; importId: string }> }
) {
  const params = await props.params;
  const refused = await refusal(s => ministryPermission(s, params.id));
  if (refused) return refused;
  const b = (await withOfficial(await req.json().catch(() => ({})))) as { action?: string; by?: string };
  if (b.action !== 'withdraw') return NextResponse.json({ error: 'action must be withdraw' }, { status: 422 });
  const r = withdrawImport(params.id, params.importId, b.by);
  if ('error' in r) return NextResponse.json(r, { status: r.error === 'No such load' ? 404 : 422 });
  return NextResponse.json({ import: r });
}
